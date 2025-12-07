// src/services/StorageService.ts
import type { VaultItem, EncryptedVaultItem, User } from '../types/index';
import { cryptoService } from './CryptoService';
import { DB_CONFIG, STORAGE_KEYS } from '../constants/constants';

const DB_NAME = DB_CONFIG.DB_NAME;
const STORE_NAME = DB_CONFIG.STORE_NAME;
const DB_VERSION = DB_CONFIG.DB_VERSION; 

export class StorageService {
    private db: IDBDatabase | null = null;

    // Open DB connection if not already opened
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

            openRequest.onerror = () => {
                console.error("Błąd otwarcia bazy:", openRequest.error);
                reject(openRequest.error);
            };

            openRequest.onsuccess = () => {
                this.db = openRequest.result;
                resolve();
            };

            //This code runs if DB version is new or DB doesn't exist
            openRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const database = (event.target as IDBOpenDBRequest).result;
                let objectStore: IDBObjectStore;

                // Creating Object Store if it doesn't exist
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                } else {
                    // If it exists, get the existing object store
                    objectStore = (openRequest.transaction as IDBTransaction).objectStore(STORE_NAME);
                }

                // Create index on 'username' for user lookup
                if (!objectStore.indexNames.contains('username')) {
                    objectStore.createIndex('username', 'username', { unique: true });
                }
            };
        });
    }

    // Helper function to ensure DB is initialized
    private async ensureInit(): Promise<void> {
        if (!this.db) {
            await this.init();
        }
    }

    async createUser(username: string, email: string, masterPass: string, repeatPass: string): Promise<void> {
        if (masterPass !== repeatPass) {
            return Promise.reject(new Error('Passwords do not match'));
        }
        await this.ensureInit();

        // Encrypt data before entering DB promise
        const [encryptedValidationToken, encryptedEmail] = await Promise.all([
            cryptoService.encrypt(masterPass, "VALID_USER"),
            cryptoService.encrypt(masterPass, email)
        ]);

        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized"));

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            
            const newUser: User = { 
                id: crypto.randomUUID(), 
                username: username, // plain text, which is neccessary for index in DB to work
                email: encryptedEmail, // ciphertext
                validationToken: encryptedValidationToken 
            }; 
            
            const request = objectStore.add(newUser);

            request.onsuccess = () => resolve();
            
            request.onerror = () => {
                if (request.error && request.error.name === 'ConstraintError') {
                    reject(new Error('Username already exists'));
                } else {
                    reject(request.error);
                }
            };
        });
    }

    async Login(username: string, masterPass: string): Promise<void> {
        await this.ensureInit();
        
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized"));

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            
            // Search user by username index
            const usernameIndex = objectStore.index('username');
            const request = usernameIndex.get(username);

            request.onsuccess = async () => {
                const userRecord = request.result;

                if (!userRecord) {
                    reject(new Error('User not found'));
                    return;
                }

                // Additional check to ensure username matches
                if (userRecord.username !== username) {
                    reject(new Error('Invalid username'));
                    return;
                }

                try {
                    // Password verification via decryption of validation token
                    const decryptedCheck = await cryptoService.decrypt(masterPass, userRecord.validationToken);
                    
                    if (decryptedCheck === "VALID_USER") {
                        chrome.storage.session.set({ [STORAGE_KEYS.MASTER]: masterPass });
                        resolve();
                    } else {
                        reject(new Error('Invalid password'));
                    }
                } catch (error) {
                    console.error("Decryption error:", error);
                    reject(new Error('Invalid password'));
                }
            };
            
            request.onerror = () => reject(new Error('Database error during login'));
        });
    }

    // Adding a new vault item
    async addItem(item: VaultItem, masterPassword: string): Promise<void> {
        await this.ensureInit();

        const encryptedUrl = await cryptoService.encrypt(masterPassword, item.url);
        const encryptedUsername = await cryptoService.encrypt(masterPassword, item.username);
        const encryptedPassword = await cryptoService.encrypt(masterPassword, item.password);

        // Here we encrypt all neccessary fields of VaultItem before passing to indexedDB
        const encryptedItem: EncryptedVaultItem = {
            id: item.id,
            url: encryptedUrl,
            username: encryptedUsername,
            password: encryptedPassword,
            createdAt: item.createdAt
        };

        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized"));

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.add(encryptedItem);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Getting all vault items
    // This function runs on every load of /passwords route and displays all saved passwords
    async getAllItems(masterPassword: string): Promise<VaultItem[]> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized"));

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.getAll();

            request.onsuccess = async () => {
                const allResults = request.result || [];
                // Fliter out user records (which contain validationToken)
                const encryptedItems = allResults.filter((record: any) => !record.validationToken);
                
                try {
                    // Decode each field of vault items
                    // Promise.allSettled is a helper function to catch all rejected(bad) items in DB
                    const results = await Promise.allSettled(
                        encryptedItems.map(async (item: EncryptedVaultItem) => {
                            try {
                                return {
                                    id: item.id,
                                    url: await cryptoService.decrypt(masterPassword, item.url),
                                    username: await cryptoService.decrypt(masterPassword, item.username),
                                    password: await cryptoService.decrypt(masterPassword, item.password),
                                    createdAt: item.createdAt
                                };
                            } catch (error) {
                                console.warn(`Skipping corrupted item ${item.id}`, error);
                                throw error; // This line ensures that incorrect items cause rejected status
                            }
                        })
                    );

                    // Filter out only accepted items, this ensures that one bad entry won't affect the function 
                    // Implementing this fix allows to skip rejected elements and display all accepted ones without error
                    const decryptedItems: VaultItem[] = results
                        .filter((result): result is PromiseFulfilledResult<VaultItem> => result.status === 'fulfilled')
                        .map(result => result.value);

                    resolve(decryptedItems);
                } catch (error) {
                    console.error("Błąd deszyfracji:", error);
                    reject(new Error("Nie udało się odszyfrować skarbca."));
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteItem(id: string): Promise<void> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized"));

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

export const storageService = new StorageService();