import { buffToBase64, base64ToBuff, stringToBuff, buffToString } from "../utils/buffer";
import { CRYPTO_KEYS } from "../constants/constants";

export class CryptoService {
    // 1. GENERATE MASTER KEY (This is slow - 1M iterations - done only during Login/Register)
    // Returns a CryptoKey used ONLY to decrypt the VaultKey
    async deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const passwordBuffer = stringToBuff(password);
        
        // Import password as raw key
        const importedPassword = await globalThis.crypto.subtle.importKey(
            "raw",
            passwordBuffer as BufferSource,
            { name: CRYPTO_KEYS.ALGO_KDF },
            false,
            ["deriveKey"]
        );

        // PBKDF2 Derivation (This takes time!)
        return globalThis.crypto.subtle.deriveKey(
            {
                name: CRYPTO_KEYS.ALGO_KDF,
                salt: salt as BufferSource,
                iterations: CRYPTO_KEYS.PBKDF2_ITERATIONS,
                hash: CRYPTO_KEYS.ALGO_HASH
            },
            importedPassword,
            { name: CRYPTO_KEYS.ALGO_AES, length: 256 },
            false,
            ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
        );
    }

    // 2. CREATE NEW VAULT KEY (Only during Registration)
    // This is the key that actually encrypts the passwords
    async generateVaultKey(): Promise<CryptoKey> {
        return globalThis.crypto.subtle.generateKey(
            {
                name: CRYPTO_KEYS.ALGO_AES,
                length: 256
            },
            true, // extractable - we need to be able to save it (encrypted) in the database
            ["encrypt", "decrypt"]
        );
    }

    // 3. ENCRYPT VAULT KEY (During Registration)
    // Wrap the VaultKey for the database using the MasterKey
    async exportAndEncryptVaultKey(vaultKey: CryptoKey, masterKey: CryptoKey): Promise<string> {
        // Export key to RAW format (bytes)
        const rawKey = await globalThis.crypto.subtle.exportKey("raw", vaultKey);
        
        const iv = globalThis.crypto.getRandomValues(new Uint8Array(CRYPTO_KEYS.IV_LENGTH));

        // Encrypt VaultKey bytes using the MasterKey
        const encryptedKeyBuffer = await globalThis.crypto.subtle.encrypt(
            { name: CRYPTO_KEYS.ALGO_AES, iv: iv },
            masterKey,
            rawKey
        );

        // Return format: IV:EncryptedKey (Salt is stored separately in user profile!)
        return `${buffToBase64(iv)}:${buffToBase64(encryptedKeyBuffer)}`;
    }

    // 4. DECRYPT VAULT KEY (During Login)
    // Restore VaultKey from database to keep it in RAM
    async decryptAndImportVaultKey(encryptedVaultKeyString: string, masterKey: CryptoKey): Promise<CryptoKey> {
        const parts = encryptedVaultKeyString.split(':');
        if (parts.length !== 2) throw new Error("Invalid Vault Key format");

        const iv = base64ToBuff(parts[0]);
        const ciphertext = base64ToBuff(parts[1]);

        // Decrypt key bytes
        const rawKeyBuffer = await globalThis.crypto.subtle.decrypt(
            { name: CRYPTO_KEYS.ALGO_AES, iv: iv as BufferSource },
            masterKey,
            ciphertext as BufferSource
        );

        // Import back as CryptoKey
        return globalThis.crypto.subtle.importKey(
            "raw",
            rawKeyBuffer,
            { name: CRYPTO_KEYS.ALGO_AES },
            true,
            ["encrypt", "decrypt"]
        );
    }

    // 5. FAST DATA ENCRYPTION (Items)
    // Use the ready vaultKey object (Instant!)
    async encryptItem(vaultKey: CryptoKey, plainText: string): Promise<string> {
        const iv = globalThis.crypto.getRandomValues(new Uint8Array(CRYPTO_KEYS.IV_LENGTH));

        const encryptedContent = await globalThis.crypto.subtle.encrypt(
            {
                name: CRYPTO_KEYS.ALGO_AES,
                iv: iv
            },
            vaultKey, // Use existing key, zero derivation
            stringToBuff(plainText) as BufferSource
        );

        // Return IV:Ciphertext (No salt needed here, as the key is static!)
        return `${buffToBase64(iv)}:${buffToBase64(encryptedContent)}`;
    }

    // 6. FAST DATA DECRYPTION (Items)
    async decryptItem(vaultKey: CryptoKey, packedData: string): Promise<string> {
        try {
            const parts = packedData.split(':');
            // Handle old data (with salt) vs new data (without salt)
            // If format is Salt:IV:Data (old), we must handle it differently or migrate
            // In the new model we expect IV:Data.
            
            // For simplicity, assume new format: IV:Data
            let iv, ciphertext;
            
            if (parts.length === 3) {
                 // Detected old format (Salt:IV:Data). 
                 // In VaultKey architecture we don't need per-item salt.
                 // Here you would need to add migration logic or skip the first element.
                 iv = base64ToBuff(parts[1]);
                 ciphertext = base64ToBuff(parts[2]);
            } else {
                 iv = base64ToBuff(parts[0]);
                 ciphertext = base64ToBuff(parts[1]);
            }

            const decryptedContent = await globalThis.crypto.subtle.decrypt(
                {
                    name: CRYPTO_KEYS.ALGO_AES,
                    iv: iv as BufferSource,
                },
                vaultKey,
                ciphertext as BufferSource,
            );

            return buffToString(decryptedContent);
        } catch (error) {
            console.error("Decryption failed:", error);
            throw new Error("Corrupted data or wrong key context");
        }
    }

    // Helper: Generate new salt for user (only during registration)
    generateSalt(): Uint8Array {
        return globalThis.crypto.getRandomValues(new Uint8Array(CRYPTO_KEYS.SALT_LENGTH));
    }
    
    // Blind index left as is or adapted to use masterKey instead of string
    async getBlindIndex(masterKey: CryptoKey, data: string): Promise<string> {
         // Here we would need to export the key to bytes to mix it with data
         // Or use HMAC (safer). 
         // For simplicity leaving "conceptual" version:
         const keyBytes = await globalThis.crypto.subtle.exportKey("raw", masterKey);
         const keyString = buffToBase64(keyBytes); // temporary convert for mixing
         
         const encoder = new TextEncoder();
         const dataBuffer = encoder.encode(keyString + data);
         const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', dataBuffer);
         
         return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}

export const cryptoService = new CryptoService();