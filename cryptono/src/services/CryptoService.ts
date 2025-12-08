import { buffToBase64, base64ToBuff, stringToBuff, buffToString } from "../utils/buffer";
import { CRYPTO_KEYS } from "../constants/constants";

export class CryptoService {
    private async importPassword(password: string): Promise<CryptoKey> {
        return globalThis.crypto.subtle.importKey(
            "raw",
            stringToBuff(password) as BufferSource,
            { name: CRYPTO_KEYS.ALGO_KDF },
            false,
            ["deriveKey"]
        );
    }

    private async deriveKey(passwordKey: CryptoKey, salt: Uint8Array): Promise<CryptoKey> {
        return globalThis.crypto.subtle.deriveKey(
            {
                name: CRYPTO_KEYS.ALGO_KDF,
                salt: salt as BufferSource,
                iterations: CRYPTO_KEYS.PBKDF2_ITERATIONS,
                hash: CRYPTO_KEYS.ALGO_HASH
            },
            passwordKey,
            { name: CRYPTO_KEYS.ALGO_AES, length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async encrypt(masterPassword: string, plainText: string): Promise<string> {
        const salt = globalThis.crypto.getRandomValues(new Uint8Array(CRYPTO_KEYS.SALT_LENGTH));
        const iv = globalThis.crypto.getRandomValues(new Uint8Array(CRYPTO_KEYS.IV_LENGTH));

        const passwordKey = await this.importPassword(masterPassword);
        const aesKey = await this.deriveKey(passwordKey, salt);

        const encryptedContent = await globalThis.crypto.subtle.encrypt(
            {
                name: CRYPTO_KEYS.ALGO_AES,
                iv: iv
            },
            aesKey,
            stringToBuff(plainText) as BufferSource
        );

        return `${buffToBase64(salt)}:${buffToBase64(iv)}:${buffToBase64(encryptedContent)}`;
    }

    async decrypt(masterPassword: string, packedData: string): Promise<string> {
        try {
            const parts = packedData.split(':');
            if (parts.length !== 3) throw new Error("Invalid data format");

            const salt = base64ToBuff(parts[0]);
            const iv = base64ToBuff(parts[1]);
            const ciphertext = base64ToBuff(parts[2]);

            const passwordKey = await this.importPassword(masterPassword);
            const aesKey = await this.deriveKey(passwordKey, salt);

            const decryptedContent = await globalThis.crypto.subtle.decrypt(
                {
                    name: CRYPTO_KEYS.ALGO_AES,
                    iv: iv as BufferSource,
                },
                aesKey,
                ciphertext as BufferSource,
            );

            return buffToString(decryptedContent);
        } catch (error) {
            console.error("Decryption failed:", error);
            throw new Error("Wrong password or corrupted data");
        }
    }
}


export const cryptoService = new CryptoService();
