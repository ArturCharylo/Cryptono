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
                console.error("Error opening database:", openRequest.error);
                reject(openRequest.error || new Error("Failed to open database"));
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
                if (database.objectStoreNames.contains(STORE_NAME)) {
                    // If it exists, get the existing object store
                    objectStore = (openRequest.transaction as IDBTransaction).objectStore(STORE_NAME);
                } else {
                    objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
            throw new Error('Passwords do not match');
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
                if (request.error?.name === 'ConstraintError') {
                    reject(new Error('Username already exists'));
                } else {
                    reject(request.error || new Error('Username taken'));
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
            request.onerror = () => reject(request.error || new Error('Databse error'));
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
                const encryptedItems = allResults.filter((record: any) => !record.validationToken) as EncryptedVaultItem[];
                
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
                    console.error("Decryption error:", error);
                    reject(new Error("Failed to decrypt the vault"));
                }
            };
            request.onerror = () => reject(request.error || new Error('Falied Decryption'));
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
            request.onerror = () => reject(request.error || new Error('Database error'));
        });
    }

    // Editing vault items section
    // Update exisiting element
    async updateItem(item: VaultItem, masterPassword: string): Promise<void> {
        await this.ensureInit();

        // Encrypt data again
        const encryptedUrl = await cryptoService.encrypt(masterPassword, item.url);
        const encryptedUsername = await cryptoService.encrypt(masterPassword, item.username);
        const encryptedPassword = await cryptoService.encrypt(masterPassword, item.password);

        const encryptedItem: EncryptedVaultItem = {
            id: item.id, // keep the same ID
            url: encryptedUrl,
            username: encryptedUsername,
            password: encryptedPassword,
            createdAt: item.createdAt
        };

        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("DB error"));
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            
            // .put() adds new record if no id match found, and updates the old one if found
            const request = objectStore.put(encryptedItem);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error || new Error('Error updating item'));
        });
    }

    // This function allows for getting and decrypting only one item neccesary
    async getItemDecrypted(id: string, masterPassword: string): Promise<VaultItem> {
         await this.ensureInit();
         return new Promise((resolve, reject) => {
             if (!this.db) return reject(new Error("DB error"));
             const transaction = this.db.transaction([STORE_NAME], 'readonly');
             const objectStore = transaction.objectStore(STORE_NAME);
             const request = objectStore.get(id);

             request.onsuccess = async () => {
                 const encryptedItem = request.result as EncryptedVaultItem;
                 if (!encryptedItem) {
                     reject(new Error("Item not found"));
                     return;
                 }
                 try {
                     const item: VaultItem = {
                         id: encryptedItem.id,
                         url: await cryptoService.decrypt(masterPassword, encryptedItem.url),
                         username: await cryptoService.decrypt(masterPassword, encryptedItem.username),
                         password: await cryptoService.decrypt(masterPassword, encryptedItem.password),
                         createdAt: encryptedItem.createdAt
                     };
                     resolve(item);
                 } catch (e) {
                     reject(e);
                 }
             };
             request.onerror = () => reject(request.error || new Error('Error getting item'));
         });
    }


    // Code section responsible for autofill functions
    // Scan DB for URL matching with the current URL(The one that the user is currently on)
    async findCredentialsForUrl(currentUrl: string, masterPassword: string): Promise<VaultItem | null> {
    await this.ensureInit();
    
    // Pobieramy wszystkie elementy (szyfrowanie/deszyfrowanie to osobny temat, tutaj skupiamy się na logice)
    const allItems = await this.getAllItems(masterPassword);

    // Wyciągamy sam hostname z currentUrl (np. "login.example.com")
    // Zakładamy, że currentUrl przekazany do funkcji to już czysty hostname (z contentScript), 
    // ale dla pewności czyścimy go tak samo jak w itemUrl.
    const cleanPageUrl = currentUrl.toLowerCase().replace(/https?:\/\//, '').split('/')[0];

    const foundItem = allItems.find(item => {
        try {
            // Normalize DB url
            const itemUrl = item.url.toLowerCase().replace(/https?:\/\//, '').split('/')[0];
            
            // Strick match
            if (cleanPageUrl === itemUrl) {
                return true;
            }

            // Handling subdomains for example: login.google.com
            if (cleanPageUrl.endsWith('.' + itemUrl)) {
                return true;
            }

            return false;
        } catch (e) {
            console.log("Cryptono error processing URL: " + e);
            return false;
        }
    });

    return foundItem || null;
}
}

export const storageService = new StorageService();