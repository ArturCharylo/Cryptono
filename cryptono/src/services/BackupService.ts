import init, { generate_backup_codes, BackupShares } from '../wasm/cryptono_sss';
import { uint8ToBase64 } from '../utils/buffer';

export class BackupService {
    /**
     * Generates backup codes from the provided master secret.
     * @param masterKey The master secret key to be split.
     * @param threshold Minimum number of shares required to reconstruct the key.
     * @param totalShares Total number of backup codes to generate.
     * @returns Array of backup codes encoded as Base64 strings.
     */
    static async generateCodes(masterKey: Uint8Array, threshold: number, totalShares: number): Promise<string[]> {
        await init(); 

        const secretCopy = new Uint8Array(masterKey);

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