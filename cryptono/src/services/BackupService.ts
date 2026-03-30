// src/services/BackupService.ts
import init, { generate_backup_codes, BackupShares } from '../wasm/cryptono_sss';
import { SessionService } from './SessionService';
import { uint8ToBase64 } from '../utils/buffer';

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
}