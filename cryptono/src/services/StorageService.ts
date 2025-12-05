// src/services/StorageService.ts
import type { VaultItem } from '../types/index';
import { cryptoService } from './CryptoService';
import { cookieService } from './CookieService';
import { DB_CONFIG } from '../constants/constants';

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

    async createUser(username: string, masterPass: string, repeatPass: string): Promise<void> {
        if (masterPass !== repeatPass) {
            return Promise.reject(new Error('Passwords do not match'));
        }
        await this.ensureInit();

        // encryption of validation token
        const validationToken = await cryptoService.encrypt(masterPass, "VALID_USER");

        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized"));

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            
            // Save user
            const newUser = { 
                id: crypto.randomUUID(), 
                username: username, 
                validationToken: validationToken 
            }; 
            
            const request = objectStore.add(newUser);

            request.onsuccess = () => resolve();
            
            request.onerror = () => {
                // Handle unique constraint error for username index
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
                        const token = cookieService.setCookie(username);
                        console.log("Zalogowano pomyślnie. Token:", token);
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
    async addItem(item: VaultItem): Promise<void> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized"));

            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.add(item);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Getting all vault items
    // This function runs on every load of /passwords route and displays all saved passwords
    async getAllItems(): Promise<VaultItem[]> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error("Database not initialized"));

            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.getAll();

            request.onsuccess = () => {
                // Filter out user records (those with validationToken)
                const allResults = request.result || [];
                const vaultItems = allResults.filter((record: any) => !record.validationToken);
                resolve(vaultItems);
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