import { buffToBase64, base64ToBuff, stringToBuff, buffToString } from "../utils/buffer";

// Configuration standards for cryptographic operations
const PBKDF2_ITERATIONS = 100000; // Higher values increase security but also computation time
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // Standard length for AES-GCM

export class CryptoService {
    private async importPassword(password: string): Promise<CryptoKey> {
        return window.crypto.subtle.importKey(
            "raw",
            stringToBuff(password) as BufferSource,
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );
    }

    private async deriveKey(passwordKey: CryptoKey, salt: Uint8Array): Promise<CryptoKey> {
        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt as BufferSource,
                iterations: PBKDF2_ITERATIONS,
                hash: "SHA-256"
            },
            passwordKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async encrypt(masterPassword: string, plainText: string): Promise<string> {
        const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

        const passwordKey = await this.importPassword(masterPassword);
        const aesKey = await this.deriveKey(passwordKey, salt);

        const encryptedContent = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
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

            const decryptedContent = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
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
