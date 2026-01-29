import { databaseContext } from '../services/DatabaseContext';
import { cryptoService } from '../services/CryptoService';
import { SessionService } from '../services/SessionService';
import { DB_CONFIG } from '../constants/constants';
import { buffToBase64, base64ToBuff } from '../utils/buffer';
import type { User } from '../types/index';

const STORE_NAME = DB_CONFIG.STORE_NAME;

export class UserRepository {
    // Register new user
    async createUser(username: string, email: string, masterPass: string, repeatPass: string): Promise<void> {
        if (masterPass !== repeatPass) {
            throw new Error('Passwords do not match');
        }
        await databaseContext.ensureInit();

        // 1. Generate random salt
        const salt = cryptoService.generateSalt();

        // 2. Create Master Key
        // Use 'as any' if you still have TS issues with BufferSource types here, or rely on updated buffer utils
        const masterKey = await cryptoService.deriveMasterKey(
            masterPass, 
            salt
        );

        // 3. Generate Vault Key
        const vaultKey = await cryptoService.generateVaultKey();

        // 4. Encrypt Vault Key
        const encryptedVaultKey = await cryptoService.exportAndEncryptVaultKey(vaultKey, masterKey);

        // 5. Encrypt email
        const encryptedEmail = await cryptoService.encryptItem(vaultKey, email);

        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("Database not initialized"));

            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);

            const newUser: User = {
                id: crypto.randomUUID(),
                username: username,
                email: encryptedEmail,
                salt: buffToBase64(salt),
                encryptedVaultKey: encryptedVaultKey
            };

            const request = objectStore.add(newUser);

            request.onsuccess = async () => {
                // AUTO-LOGIN after registration:
                // Save key to persistent session storage
                try {
                    await SessionService.getInstance().saveSession(vaultKey);
                    resolve();
                } catch (_e) {
                    reject(new Error("Failed to start session"));
                }
            };

            request.onerror = () => {
                if (request.error?.name === 'ConstraintError') {
                    reject(new Error('Username already exists'));
                } else {
                    reject(request.error || new Error('Username taken'));
                }
            };
        });
    }

    // Login user
    async Login(username: string, masterPass: string): Promise<void> {
        await databaseContext.ensureInit();

        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("Database not initialized"));

            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);

            const usernameIndex = objectStore.index('username');
            const request = usernameIndex.get(username);

            request.onsuccess = async () => {
                const userRecord = request.result as User;

                if (!userRecord) {
                    reject(new Error('User not found'));
                    return;
                }

                if (userRecord.username !== username) {
                    reject(new Error('Invalid username'));
                    return;
                }

                try {
                    // 1. Recover salt
                    const salt = base64ToBuff(userRecord.salt);

                    // 2. Derive Master Key
                    const masterKey = await cryptoService.deriveMasterKey(
                        masterPass, 
                        salt
                    );

                    // 3. Decrypt Vault Key
                    const vaultKey = await cryptoService.decryptAndImportVaultKey(
                        userRecord.encryptedVaultKey, 
                        masterKey
                    );
                    
                    await SessionService.getInstance().saveSession(vaultKey);

                    resolve();

                } catch (error) {
                    console.error("Login failed:", error);
                    reject(new Error('Invalid password'));
                }
            };

            request.onerror = () => reject(new Error('Database error during login'));
        });
    }
    async getCurrentUser(): Promise<User> {
        await databaseContext.ensureInit();
        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("DB error"));
            
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const cursorRequest = transaction.objectStore(STORE_NAME).openCursor();
            
            cursorRequest.onsuccess = (e) => {
                const cursor = (e.target as IDBRequest).result;
                if (cursor) {
                    resolve(cursor.value as User);
                } else {
                    reject(new Error("No user found"));
                }
            };
            cursorRequest.onerror = () => reject(new Error("Failed to fetch user"));
        });
    }

    async updateMasterPasswordProtection(userId: string, newSaltBase64: string, newEncryptedVaultKey: string): Promise<void> {
        await databaseContext.ensureInit();
        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("DB error"));

            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const getReq = store.get(userId);
            
            getReq.onsuccess = () => {
                const user = getReq.result as User;
                if (!user) {
                    reject(new Error("User not found for update"));
                    return;
                }

                // Update only changed fields
                user.salt = newSaltBase64;
                user.encryptedVaultKey = newEncryptedVaultKey;

                const putReq = store.put(user);
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    }
}

export const userRepository = new UserRepository();