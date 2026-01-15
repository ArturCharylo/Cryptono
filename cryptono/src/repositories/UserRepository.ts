import { buffToBase64, base64ToBuff, stringToBuff, buffToString } from "../utils/buffer";
import { CRYPTO_KEYS } from "../constants/constants";

export class CryptoService {
    // 1. GENERATE MASTER KEY
    async deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
        const passwordBuffer = stringToBuff(password);
        
        const importedPassword = await globalThis.crypto.subtle.importKey(
            "raw",
            // FIX: Double cast to bypass SharedArrayBuffer check
            passwordBuffer as unknown as BufferSource,
            { name: CRYPTO_KEYS.ALGO_KDF },
            false,
            ["deriveKey"]
        );

        return globalThis.crypto.subtle.deriveKey(
            {
                name: CRYPTO_KEYS.ALGO_KDF,
                // FIX: Double cast here as well
                salt: salt as unknown as BufferSource,
                iterations: CRYPTO_KEYS.PBKDF2_ITERATIONS,
                hash: CRYPTO_KEYS.ALGO_HASH
            },
            importedPassword,
            { name: CRYPTO_KEYS.ALGO_AES, length: 256 },
            false,
            ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
        );
    }

    // 2. CREATE NEW VAULT KEY
    async generateVaultKey(): Promise<CryptoKey> {
        return globalThis.crypto.subtle.generateKey(
            {
                name: CRYPTO_KEYS.ALGO_AES,
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
    }

    // 3. ENCRYPT VAULT KEY
    async exportAndEncryptVaultKey(vaultKey: CryptoKey, masterKey: CryptoKey): Promise<string> {
        const rawKey = await globalThis.crypto.subtle.exportKey("raw", vaultKey);
        const iv = globalThis.crypto.getRandomValues(new Uint8Array(CRYPTO_KEYS.IV_LENGTH));

        const encryptedKeyBuffer = await globalThis.crypto.subtle.encrypt(
            { name: CRYPTO_KEYS.ALGO_AES, iv: iv },
            masterKey,
            // FIX: Ensure rawKey is treated as BufferSource
            rawKey as unknown as BufferSource
        );

        return `${buffToBase64(iv)}:${buffToBase64(encryptedKeyBuffer)}`;
    }

    // 4. DECRYPT VAULT KEY
    async decryptAndImportVaultKey(encryptedVaultKeyString: string, masterKey: CryptoKey): Promise<CryptoKey> {
        const parts = encryptedVaultKeyString.split(':');
        if (parts.length !== 2) throw new Error("Invalid Vault Key format");

        const iv = base64ToBuff(parts[0]);
        const ciphertext = base64ToBuff(parts[1]);

        const rawKeyBuffer = await globalThis.crypto.subtle.decrypt(
            // FIX: Cast iv to BufferSource
            { name: CRYPTO_KEYS.ALGO_AES, iv: iv as unknown as BufferSource },
            masterKey,
            // FIX: Cast ciphertext to BufferSource
            ciphertext as unknown as BufferSource
        );

        return globalThis.crypto.subtle.importKey(
            "raw",
            rawKeyBuffer,
            { name: CRYPTO_KEYS.ALGO_AES },
            true,
            ["encrypt", "decrypt"]
        );
    }

    // 5. FAST DATA ENCRYPTION
    async encryptItem(vaultKey: CryptoKey, plainText: string): Promise<string> {
        const iv = globalThis.crypto.getRandomValues(new Uint8Array(CRYPTO_KEYS.IV_LENGTH));

        const encryptedContent = await globalThis.crypto.subtle.encrypt(
            {
                name: CRYPTO_KEYS.ALGO_AES,
                iv: iv
            },
            vaultKey,
            // FIX: Double cast
            stringToBuff(plainText) as unknown as BufferSource
        );

        return `${buffToBase64(iv)}:${buffToBase64(encryptedContent)}`;
    }

    // 6. FAST DATA DECRYPTION
    async decryptItem(vaultKey: CryptoKey, packedData: string): Promise<string> {
        try {
            const parts = packedData.split(':');
            let iv, ciphertext;
            
            if (parts.length === 3) {
                 iv = base64ToBuff(parts[1]);
                 ciphertext = base64ToBuff(parts[2]);
            } else {
                 iv = base64ToBuff(parts[0]);
                 ciphertext = base64ToBuff(parts[1]);
            }

            const decryptedContent = await globalThis.crypto.subtle.decrypt(
                {
                    name: CRYPTO_KEYS.ALGO_AES,
                    // FIX: Double cast
                    iv: iv as unknown as BufferSource,
                },
                vaultKey,
                // FIX: Double cast
                ciphertext as unknown as BufferSource,
            );

            return buffToString(decryptedContent);
        } catch (error) {
            console.error("Decryption failed:", error);
            throw new Error("Corrupted data or wrong key context");
        }
    }

    generateSalt(): Uint8Array {
        return globalThis.crypto.getRandomValues(new Uint8Array(CRYPTO_KEYS.SALT_LENGTH));
    }
    
    async getBlindIndex(masterKey: CryptoKey, data: string): Promise<string> {
         const keyBytes = await globalThis.crypto.subtle.exportKey("raw", masterKey);
         const keyString = buffToBase64(keyBytes); 
         
         const encoder = new TextEncoder();
         const dataBuffer = encoder.encode(keyString + data);
         const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', dataBuffer);
         
         return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
}

export const cryptoService = new CryptoService();