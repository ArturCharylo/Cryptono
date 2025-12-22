import { databaseContext } from '../services/DatabaseContext';
import { cryptoService } from '../services/CryptoService';
import { STORAGE_KEYS, DB_CONFIG } from '../constants/constants';
import type { User } from '../types/index';

const STORE_NAME = DB_CONFIG.STORE_NAME;

export class UserRepository {
    async createUser(username: string, email: string, masterPass: string, repeatPass: string): Promise<void> {
        if (masterPass !== repeatPass) {
            throw new Error('Passwords do not match');
        }
        await databaseContext.ensureInit();

        // Encrypt data before entering DB promise
        const [encryptedValidationToken, encryptedEmail] = await Promise.all([
            cryptoService.encrypt(masterPass, "VALID_USER"),
            cryptoService.encrypt(masterPass, email)
        ]);

        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("Database not initialized"));

            const transaction = db.transaction([STORE_NAME], 'readwrite');
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
        await databaseContext.ensureInit();

        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("Database not initialized"));

            const transaction = db.transaction([STORE_NAME], 'readonly');
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
}

export const userRepository = new UserRepository();
