import { DB_CONFIG } from '../constants/constants';

const DB_NAME = DB_CONFIG.DB_NAME;
const STORE_NAME = DB_CONFIG.STORE_NAME;
const DB_VERSION = DB_CONFIG.DB_VERSION;

export class DatabaseContext {
    private _db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    get db(): IDBDatabase | null {
        return this._db;
    }

    async ensureInit(): Promise<void> {
        if (this._db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this.init();
        try {
            await this.initPromise;
        } finally {
            this.initPromise = null;
        }
    }

    private async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

            openRequest.onerror = () => {
                console.error("Error opening database:", openRequest.error);
                reject(openRequest.error || new Error("Failed to open database"));
            };

            openRequest.onsuccess = () => {
                this._db = openRequest.result;
                resolve();
            };

            // This code runs if DB version is new or DB doesn't exist
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

                // Create index on 'urlHash' for fast lookup without decryption (Blind Index)
                if (!objectStore.indexNames.contains('urlHash')) {
                    objectStore.createIndex('urlHash', 'urlHash', { unique: false });
                }
            };
        });
    }
}

export const databaseContext = new DatabaseContext();
