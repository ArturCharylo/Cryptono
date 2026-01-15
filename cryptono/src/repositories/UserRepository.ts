import { databaseContext } from '../services/DatabaseContext';
import { cryptoService } from '../services/CryptoService';
import { SessionService } from '../services/SessionService'; // Importujemy sesję
import { DB_CONFIG } from '../constants/constants';
import { buffToBase64, base64ToBuff } from '../utils/buffer';
import type { User } from '../types/index';

const STORE_NAME = DB_CONFIG.STORE_NAME;

export class UserRepository {
    // Rejestracja nowego użytkownika
    async createUser(username: string, email: string, masterPass: string, repeatPass: string): Promise<void> {
        if (masterPass !== repeatPass) {
            throw new Error('Passwords do not match');
        }
        await databaseContext.ensureInit();

        // 1. Generujemy losową sól dla użytkownika
        const salt = cryptoService.generateSalt();

        // 2. Tworzymy Master Key (to powolna operacja - 1M iteracji)
        // Służy TYLKO do zabezpieczenia Klucza Sejfu
        const masterKey = await cryptoService.deriveMasterKey(masterPass, salt);

        // 3. Generujemy nowy, losowy Vault Key (AES)
        // To tym kluczem będziemy szyfrować wszystkie hasła
        const vaultKey = await cryptoService.generateVaultKey();

        // 4. Szyfrujemy Vault Key za pomocą Master Key, by zapisać go bezpiecznie w bazie
        const encryptedVaultKey = await cryptoService.exportAndEncryptVaultKey(vaultKey, masterKey);

        // 5. Szyfrujemy email za pomocą Vault Key (szybkie szyfrowanie)
        const encryptedEmail = await cryptoService.encryptItem(vaultKey, email);

        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("Database not initialized"));

            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);

            const newUser: User = {
                id: crypto.randomUUID(),
                username: username, // plain text (potrzebne do indeksowania)
                email: encryptedEmail, // ciphertext
                salt: buffToBase64(salt), // Zapisujemy sól jako string Base64
                encryptedVaultKey: encryptedVaultKey // Zapisujemy zaszyfrowany klucz do sejfu
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

    // Logowanie użytkownika
    async Login(username: string, masterPass: string): Promise<void> {
        await databaseContext.ensureInit();

        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("Database not initialized"));

            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);

            // Szukamy użytkownika po nazwie
            const usernameIndex = objectStore.index('username');
            const request = usernameIndex.get(username);

            request.onsuccess = async () => {
                const userRecord = request.result as User;

                if (!userRecord) {
                    reject(new Error('User not found'));
                    return;
                }

                // Dodatkowe sprawdzenie dla bezpieczeństwa
                if (userRecord.username !== username) {
                    reject(new Error('Invalid username'));
                    return;
                }

                try {
                    // 1. Odzyskujemy sól zapisaną w bazie
                    const salt = base64ToBuff(userRecord.salt);

                    // 2. Odtwarzamy Master Key z wpisanego hasła i soli
                    const masterKey = await cryptoService.deriveMasterKey(masterPass, salt);

                    // 3. Próbujemy odszyfrować Vault Key
                    // Jeśli hasło jest błędne, tutaj poleci wyjątek (błąd deszyfracji/paddingu)
                    const vaultKey = await cryptoService.decryptAndImportVaultKey(
                        userRecord.encryptedVaultKey, 
                        masterKey
                    );
                    
                    // 4. Sukces! Zapisujemy odszyfrowany klucz w sesji (pamięć RAM)
                    // Dzięki temu nie musimy pytać o hasło przy każdej operacji
                    SessionService.getInstance().setKey(vaultKey);

                    resolve();

                } catch (error) {
                    console.error("Login failed (likely wrong password):", error);
                    reject(new Error('Invalid password'));
                }
            };

            request.onerror = () => reject(new Error('Database error during login'));
        });
    }
}

export const userRepository = new UserRepository();