// Import new functions from buffer.ts
import { 
    buffToBase64, 
    base64ToBuff, 
    stringToBuff, 
    buffToString, 
    buffToHex, 
    hexToBuff 
} from "../utils/buffer";
import { CRYPTO_KEYS } from "../constants/constants";
import createArgon2Module from 'argon2-extension-mv3'; 

// 1. EXTRACT TYPE AUTOMATICALLY
// We infer the return type of the factory function and unwrap the Promise using Awaited.
// This gives us the exact interface of the WASM module without manual typing.
type Argon2ModuleInstance = Awaited<ReturnType<typeof createArgon2Module>>;

// 2. APPLY TYPE
// Singleton is now strongly typed as the module instance or null.
let argon2ModuleInstance: Argon2ModuleInstance | null = null;

export class CryptoService {
    
    // Helper method to load WASM
    private async getArgon2Module() {
        if (argon2ModuleInstance) return argon2ModuleInstance;

        // Load module and specify path to .wasm file in public/dist folder
        argon2ModuleInstance = await createArgon2Module({
            locateFile: (path: string) => {
                // In extension context, we must use getURL to point to dist/ root
                if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
                    return chrome.runtime.getURL(path);
                }
                return path; 
            }
        });
        return argon2ModuleInstance;
    }

    // 1. GENERATE MASTER KEY (Argon2id implementation)
    // Signature remains the same to avoid breaking other code
    async deriveMasterKey(password: string, salt: BufferSource): Promise<CryptoKey> {
        try {
            const module = await this.getArgon2Module();

            // STEP A: Use helper from buffer.ts - no casting needed here
            // C++ requires salt as a Hex string
            const saltHex = buffToHex(salt);

            // STEP B: Call C++ function (Argon2id)
            // Returns hash as Hex String (64 chars for 32 bytes)
            const derivedKeyHex = module.generateArgon2idHash(password, saltHex);

            if (derivedKeyHex.startsWith("Error")) {
                throw new Error(`Argon2 error: ${derivedKeyHex}`);
            }

            // STEP C: Convert result back to buffer
            // hexToBuff returns 'Uint8Array<ArrayBuffer>', which is accepted by Web Crypto
            const keyMaterial = hexToBuff(derivedKeyHex);

            return globalThis.crypto.subtle.importKey(
                "raw",
                keyMaterial, // TS no longer complains because the type matches BufferSource
                { name: CRYPTO_KEYS.ALGO_AES }, // Treat Argon2 result directly as AES key
                false,
                ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
            );

        } catch (error) {
            console.error("Key derivation failed:", error);
            throw error;
        }
    }

    // 2. CREATE NEW VAULT KEY (No changes)
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

    // 3. ENCRYPT VAULT KEY (No changes)
    async exportAndEncryptVaultKey(vaultKey: CryptoKey, masterKey: CryptoKey): Promise<string> {
        const rawKey = await globalThis.crypto.subtle.exportKey("raw", vaultKey);
        const iv = globalThis.crypto.getRandomValues(new Uint8Array(CRYPTO_KEYS.IV_LENGTH));

        const encryptedKeyBuffer = await globalThis.crypto.subtle.encrypt(
            { name: CRYPTO_KEYS.ALGO_AES, iv: iv },
            masterKey,
            // Safe to remove extra casting if rawKey matches expected BufferSource
            rawKey 
        );

        return `${buffToBase64(iv)}:${buffToBase64(encryptedKeyBuffer)}`;
    }

    // 4. DECRYPT VAULT KEY (No changes)
    async decryptAndImportVaultKey(encryptedVaultKeyString: string, masterKey: CryptoKey): Promise<CryptoKey> {
        const parts = encryptedVaultKeyString.split(':');
        if (parts.length !== 2) throw new Error("Invalid Vault Key format");

        const iv = base64ToBuff(parts[0]);
        const ciphertext = base64ToBuff(parts[1]);

        const rawKeyBuffer = await globalThis.crypto.subtle.decrypt(
            { name: CRYPTO_KEYS.ALGO_AES, iv: iv },
            masterKey,
            ciphertext
        );

        return globalThis.crypto.subtle.importKey(
            "raw",
            rawKeyBuffer,
            { name: CRYPTO_KEYS.ALGO_AES },
            true,
            ["encrypt", "decrypt"]
        );
    }

    // 5. FAST DATA ENCRYPTION (No changes)
    async encryptItem(vaultKey: CryptoKey, plainText: string): Promise<string> {
        const iv = globalThis.crypto.getRandomValues(new Uint8Array(CRYPTO_KEYS.IV_LENGTH));

        const encryptedContent = await globalThis.crypto.subtle.encrypt(
            {
                name: CRYPTO_KEYS.ALGO_AES,
                iv: iv
            },
            vaultKey,
            stringToBuff(plainText) // stringToBuff now returns correct type, so explicit cast is not needed
        );

        return `${buffToBase64(iv)}:${buffToBase64(encryptedContent)}`;
    }

    // 6. FAST DATA DECRYPTION (No changes)
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
                    iv: iv,
                },
                vaultKey,
                ciphertext,
            );

            return buffToString(decryptedContent);
        } catch (error) {
            console.error("Decryption failed:", error);
            throw new Error("Corrupted data or wrong key context");
        }
    }

    // Return explicit Uint8Array<ArrayBuffer> to match BufferSource requirements
    generateSalt(): Uint8Array<ArrayBuffer> {
        const salt = new Uint8Array(CRYPTO_KEYS.SALT_LENGTH);
        globalThis.crypto.getRandomValues(salt);
        return salt as Uint8Array<ArrayBuffer>;
    }
    
    async getBlindIndex(masterKey: CryptoKey, data: string): Promise<string> {
         const keyBytes = await globalThis.crypto.subtle.exportKey("raw", masterKey);
         // keyBytes is already ArrayBuffer, so it's safe
         const keyString = buffToBase64(keyBytes); 
         
         const encoder = new TextEncoder();
         const dataBuffer = encoder.encode(keyString + data);
         const hashBuffer = await globalThis.crypto.subtle.digest(CRYPTO_KEYS.ALGO_HASH, dataBuffer);
         
         return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async derivePinKey(pin: string, salt: BufferSource): Promise<CryptoKey> {
        const enc = new TextEncoder();
        const keyMaterial = await globalThis.crypto.subtle.importKey(
            "raw",
            enc.encode(pin),
            { name: CRYPTO_KEYS.ALGO_KDF },
            false,
            ["deriveKey"]
        );

        return globalThis.crypto.subtle.deriveKey(
            {
                name: CRYPTO_KEYS.ALGO_KDF,
                salt: salt,
                iterations: CRYPTO_KEYS.PIN_ITERATIONS,
                hash: CRYPTO_KEYS.ALGO_HASH
            },
            keyMaterial,
            { name: CRYPTO_KEYS.ALGO_AES, length: 256 },
            false,
            ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
        );
    }
}

export const cryptoService = new CryptoService();