import { databaseContext } from '../services/DatabaseContext';
import { cryptoService } from '../services/CryptoService';
import { SessionService } from '../services/SessionService'; // Import SessionService
import { userRepository } from './UserRepository'; // Import UserRepository to get current user ID
import { normalizeUrl } from '../utils/urlHelper';
import { DB_CONFIG } from '../constants/constants';
import type { VaultItem, EncryptedVaultItem } from '../types/index';

const STORE_NAME = DB_CONFIG.STORE_NAME;

// Type Guard to distinguish between User and VaultItem in raw DB results
// Updated logic: Vault items definitely have 'urlHash', Users do not.
function isEncryptedVaultItem(record: unknown): record is EncryptedVaultItem {
    return typeof record === 'object' && record !== null && 'urlHash' in record;
}

export class VaultRepository {
    // Adding a new vault item
    // Removed 'masterPassword' argument, we use Session now
    async addItem(item: VaultItem): Promise<void> {
        await databaseContext.ensureInit();
        
        // Get the decrypted Vault Key from memory
        const vaultKey = SessionService.getInstance().getKey();

        // Get current user to assign ownership
        const currentUser = await userRepository.getCurrentUser();

        // Generate Blind Index Hash for URL using the Vault Key
        const cleanUrl = normalizeUrl(item.url);
        const urlHash = await cryptoService.getBlindIndex(vaultKey, cleanUrl);

        // Use fast encryption (AES only)
        const encryptedUrl = await cryptoService.encryptItem(vaultKey, item.url);
        const encryptedUsername = await cryptoService.encryptItem(vaultKey, item.username);
        const encryptedPassword = await cryptoService.encryptItem(vaultKey, item.password);

        // Encrypt optional fields
        const encryptedFields = item.fields 
            ? await cryptoService.encryptItem(vaultKey, JSON.stringify(item.fields)) 
            : undefined;
        
        const encryptedNote = item.note 
            ? await cryptoService.encryptItem(vaultKey, item.note) 
            : undefined;

        // Here we encrypt all necessary fields of VaultItem before passing to indexedDB
        const encryptedItem: EncryptedVaultItem = {
            id: item.id,
            userId: currentUser.id, // Link item to specific user
            url: encryptedUrl,
            urlHash: urlHash, // Store the hash for indexing
            username: encryptedUsername,
            password: encryptedPassword,
            createdAt: item.createdAt,
            fields: encryptedFields, // Store encrypted JSON string
            note: encryptedNote      // Store encrypted note
        };

        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("Database not initialized"));

            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.add(encryptedItem);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error || new Error('Database error'));
        });
    }

    // Getting all vault items
    async getAllItems(): Promise<VaultItem[]> {
        await databaseContext.ensureInit();
        const vaultKey = SessionService.getInstance().getKey();

        // We need to know who is asking to filter out items belonging to others
        let currentUserId: string;
        try {
            const user = await userRepository.getCurrentUser();
            currentUserId = user.id;
        } catch (e) {
            console.error("Cannot get current user for filtering vault items", e);
            return [];
        }

        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("Database not initialized"));

            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.getAll();

            request.onsuccess = async () => {
                const allResults = request.result || [];

                // Filter out user records using the Type Guard AND filter by userId
                const encryptedItems = allResults.filter(item => 
                    isEncryptedVaultItem(item) && item.userId === currentUserId
                );

                try {
                    // Decode each field of vault items
                    const results = await Promise.allSettled(
                        encryptedItems.map(async (item: EncryptedVaultItem): Promise<VaultItem> => {
                            try {
                                // Decrypt optional fields if they exist
                                let decryptedFields: VaultItem['fields'] = undefined;
                                if (item.fields) {
                                    const jsonString = await cryptoService.decryptItem(vaultKey, item.fields);
                                    decryptedFields = JSON.parse(jsonString);
                                }

                                let decryptedNote: string | undefined = undefined;
                                if (item.note) {
                                    decryptedNote = await cryptoService.decryptItem(vaultKey, item.note);
                                }

                                return {
                                    id: item.id,
                                    url: await cryptoService.decryptItem(vaultKey, item.url),
                                    username: await cryptoService.decryptItem(vaultKey, item.username),
                                    password: await cryptoService.decryptItem(vaultKey, item.password),
                                    createdAt: item.createdAt,
                                    fields: decryptedFields,
                                    note: decryptedNote
                                };
                            } catch (error) {
                                console.warn(`Skipping corrupted item ${item.id}`, error);
                                throw error;
                            }
                        })
                    );

                    const decryptedItems: VaultItem[] = results
                        .filter((result): result is PromiseFulfilledResult<VaultItem> => result.status === 'fulfilled')
                        .map(result => result.value);

                    resolve(decryptedItems);
                } catch (error) {
                    console.error("Decryption error:", error);
                    reject(new Error("Failed to decrypt the vault"));
                }
            };
            request.onerror = () => reject(request.error || new Error('Failed Decryption'));
        });
    }

    async deleteItem(id: string): Promise<void> {
        await databaseContext.ensureInit();
        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("Database not initialized"));

            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error || new Error('Database error'));
        });
    }

    // Editing vault items section
    async updateItem(item: VaultItem): Promise<void> {
        await databaseContext.ensureInit();
        const vaultKey = SessionService.getInstance().getKey();
        const currentUser = await userRepository.getCurrentUser();

        // Calculate new Blind Index Hash
        const cleanUrl = normalizeUrl(item.url);
        const urlHash = await cryptoService.getBlindIndex(vaultKey, cleanUrl);

        // Encrypt data again
        const encryptedUrl = await cryptoService.encryptItem(vaultKey, item.url);
        const encryptedUsername = await cryptoService.encryptItem(vaultKey, item.username);
        const encryptedPassword = await cryptoService.encryptItem(vaultKey, item.password);

        // Encrypt optional fields again
        const encryptedFields = item.fields 
            ? await cryptoService.encryptItem(vaultKey, JSON.stringify(item.fields)) 
            : undefined;
        
        const encryptedNote = item.note 
            ? await cryptoService.encryptItem(vaultKey, item.note) 
            : undefined;

        const encryptedItem: EncryptedVaultItem = {
            id: item.id, // keep the same ID
            userId: currentUser.id, // Ensure ownership is maintained
            url: encryptedUrl,
            urlHash: urlHash, // Update hash
            username: encryptedUsername,
            password: encryptedPassword,
            createdAt: item.createdAt,
            fields: encryptedFields, // Update encrypted fields
            note: encryptedNote      // Update encrypted note
        };

        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("DB error"));
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);

            // .put() adds new record if no id match found, and updates the old one if found
            const request = objectStore.put(encryptedItem);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error || new Error('Error updating item'));
        });
    }

    // This function allows for getting and decrypting only one item necessary
    async getItemDecrypted(id: string): Promise<VaultItem> {
         await databaseContext.ensureInit();
         const vaultKey = SessionService.getInstance().getKey();

         return new Promise((resolve, reject) => {
             const db = databaseContext.db;
             if (!db) return reject(new Error("DB error"));
             const transaction = db.transaction([STORE_NAME], 'readonly');
             const objectStore = transaction.objectStore(STORE_NAME);
             const request = objectStore.get(id);

             request.onsuccess = async () => {
                 const encryptedItem = request.result as EncryptedVaultItem;
                 if (!encryptedItem) {
                     reject(new Error("Item not found"));
                     return;
                 }
                 try {
                     // Note: We could check userId here, but decryption will fail anyway if keys mismatch
                     
                     // Decrypt optional fields for single item
                     let decryptedFields: VaultItem['fields'] = undefined;
                     if (encryptedItem.fields) {
                         const jsonString = await cryptoService.decryptItem(vaultKey, encryptedItem.fields);
                         decryptedFields = JSON.parse(jsonString);
                     }

                     let decryptedNote: string | undefined = undefined;
                     if (encryptedItem.note) {
                         decryptedNote = await cryptoService.decryptItem(vaultKey, encryptedItem.note);
                     }

                     const item: VaultItem = {
                         id: encryptedItem.id,
                         url: await cryptoService.decryptItem(vaultKey, encryptedItem.url),
                         username: await cryptoService.decryptItem(vaultKey, encryptedItem.username),
                         password: await cryptoService.decryptItem(vaultKey, encryptedItem.password),
                         createdAt: encryptedItem.createdAt,
                         fields: decryptedFields,
                         note: decryptedNote
                     };
                     resolve(item);
                 } catch (e) {
                     reject(e);
                 }
             };
             request.onerror = () => reject(request.error || new Error('Error getting item'));
         });
    }

    // Checking for duplicates
    async findItemByUrlAndUsername(url: string, username: string): Promise<VaultItem | null> {
        await databaseContext.ensureInit();
        const vaultKey = SessionService.getInstance().getKey();
        
        let currentUserId: string;
        try {
            const user = await userRepository.getCurrentUser();
            currentUserId = user.id;
        } catch(_e) {
            return null;
        }

        const cleanCurrentUrl = normalizeUrl(url);
        const urlHash = await cryptoService.getBlindIndex(vaultKey, cleanCurrentUrl);

        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("DB error"));

            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const index = objectStore.index('urlHash');

            // Get all items matching the URL hash
            const request = index.getAll(urlHash);

            request.onsuccess = async () => {
                const allResults = request.result as EncryptedVaultItem[];

                if (!allResults || allResults.length === 0) {
                    resolve(null);
                    return;
                }

                // Filter by userId FIRST to avoid trying to decrypt other users' data
                const encryptedItems = allResults.filter(item => item.userId === currentUserId);

                // Check usernames after filtering by URL hash
                for (const item of encryptedItems) {
                    try {
                        const decryptedUsername = await cryptoService.decryptItem(vaultKey, item.username);
                        if (decryptedUsername === username) {
                            // Match found, decrypt the rest including new fields
                            let decryptedFields: VaultItem['fields'] = undefined;
                            if (item.fields) {
                                const jsonString = await cryptoService.decryptItem(vaultKey, item.fields);
                                decryptedFields = JSON.parse(jsonString);
                            }

                            let decryptedNote: string | undefined = undefined;
                            if (item.note) {
                                decryptedNote = await cryptoService.decryptItem(vaultKey, item.note);
                            }

                            resolve({
                                id: item.id,
                                url: await cryptoService.decryptItem(vaultKey, item.url),
                                username: decryptedUsername,
                                password: await cryptoService.decryptItem(vaultKey, item.password),
                                createdAt: item.createdAt,
                                fields: decryptedFields,
                                note: decryptedNote
                            });
                            return;
                        }
                    } catch (e) {
                        console.error("Error checking for duplicates: " + e);
                    }
                }

                resolve(null);
            };

            request.onerror = () => resolve(null);
        });
    }

    // Helper for finding raw encrypted items (e.g. for autofill heuristics)
    async getItemsByUrlHash(urlHash: string): Promise<EncryptedVaultItem[]> {
        await databaseContext.ensureInit();
        const db = databaseContext.db;
        
        // We need user context here too, because autofill shouldn't suggest other users' items
        let currentUserId: string;
        try {
            const user = await userRepository.getCurrentUser();
            currentUserId = user.id;
        } catch (_e) {
             return [];
        }

        return new Promise((resolve, reject) => {
            if (!db) return reject(new Error("Database not initialized"));

            const transaction = db.transaction([DB_CONFIG.STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(DB_CONFIG.STORE_NAME);
            const index = objectStore.index('urlHash');
            
            // Get all items matching the URL hash
            const request = index.getAll(urlHash);

            request.onsuccess = () => {
                const results = request.result as EncryptedVaultItem[];
                // Filter ensuring we only get items, not user record AND matching userId
                const items = results.filter(item => 
                    isEncryptedVaultItem(item) && item.userId === currentUserId
                );
                resolve(items);
            };

            request.onerror = () => resolve([]); // Return empty array on error
        });
    }
}

export const vaultRepository = new VaultRepository();