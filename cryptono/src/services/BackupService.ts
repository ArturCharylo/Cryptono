import init, { generate_backup_codes, BackupShares, recover_from_shares } from '../wasm/cryptono_sss';
import { SessionService } from './SessionService';
import { uint8ToBase64, toStrictBufferView, base64ToBuff } from '../utils/buffer';
import { CRYPTO_KEYS } from '../constants/constants';

export class BackupService {
    /**
     * Generates backup codes from the currently active vault key.
     * @param threshold Minimum number of shares required to reconstruct the key.
     * @param totalShares Total number of backup codes to generate.
     * @returns Array of backup codes encoded as Base64 strings.
     */
    static async generateCodes(threshold: number, totalShares: number): Promise<string[]> {
        await init(); 

        // Retrieve the active vault key from the session
        const vaultKey = SessionService.getInstance().getKey();

        // Export the vault key to raw bytes so it can be split
        const rawKeyBuffer = await globalThis.crypto.subtle.exportKey("raw", vaultKey);
        
        // We need to create a copy of the key because the Rust code uses `secret.zeroize()` 
        // which will mutate and wipe the array passed to it.
        const secretCopy = new Uint8Array(rawKeyBuffer);

        let sharesObj: BackupShares | null = null;
        const backupCodes: string[] = [];

        try {
            sharesObj = generate_backup_codes(secretCopy, threshold, totalShares);

            // Extract shares and encode them to Base64 for the user
            for (let i = 0; i < sharesObj.len(); i++) {
                const shareUint8 = sharesObj.get_share(i);
                if (shareUint8) {
                    backupCodes.push(uint8ToBase64(shareUint8));
                }
            }
        } catch (error) {
            console.error("Failed to generate backup codes:", error);
            throw new Error("Backup code generation failed.");
        } finally {
            // Standard wasm-bindgen memory cleanup to avoid memory leaks
            if (sharesObj) {
                sharesObj.free();
            }
        }

        return backupCodes;
    }

    static async recoverVaultWithoutSaving(base64Codes: string[]): Promise<CryptoKey> {
        await init();

        try {
            const sharesArray = base64Codes.map(code => base64ToBuff(code));
            const rawKeyBytes = recover_from_shares(sharesArray);
            const strictKeyView = toStrictBufferView(rawKeyBytes);

            const vaultKey = await globalThis.crypto.subtle.importKey(
                "raw",
                strictKeyView, 
                { name: CRYPTO_KEYS.ALGO_AES },
                true, 
                ["encrypt", "decrypt"]
            );

            strictKeyView.fill(0);
            return vaultKey;
        } catch (error) {
            console.error("Vault recovery failed:", error);
            throw new Error("Invalid or insufficient backup codes.");
        }
    }
}