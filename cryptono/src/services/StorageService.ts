// src/services/StorageService.ts
import type { VaultItem } from '../types/index';
import { cryptoService } from './CryptoService'
import { cookieService } from './CookieService';

// Those variables will be stored as .env later on as the project grows, now it's just for testing purposes 
const DB_NAME = 'CryptonoDB';
const STORE_NAME = 'vault';
const DB_VERSION = 1;

export class StorageService {
    private db: IDBDatabase | null = null;

    // Open database connection
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            // This code runs only the first time
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // Create store with main key
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }

    async createUser(username: string, masterPass: string, repeatPass: string): Promise<void> {
        if (masterPass !== repeatPass) {
            return Promise.reject(new Error('Passwords do not match'));
        }
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const user = { id: 'user', username, masterPass };
            const request = store.add(user);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        })
    }

    async Login(username:string, masterPass: string): Promise<void>{
        const master = cryptoService.encrypt(masterPass, masterPass);
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get('user');

            const user = request.result;
            if (user && user.username === username && user.masterPass === master) {
                
                const token = cookieService.setCookie(username);

                console.log("Zalogowano i ustawiono cookie:", token);
                resolve();

            } else {
                reject(new Error('Invalid username or password'));
            }
            
        })
    }

    // Adding new item
    async addItem(item: VaultItem): Promise<void> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(item);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Get all items
    async getAllItems(): Promise<VaultItem[]> {
        await this.ensureInit();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Helper function to ensure that the database is active and open
    private async ensureInit() {
        if (!this.db) {
            await this.init();
        }
    }
}

export const storageService = new StorageService();