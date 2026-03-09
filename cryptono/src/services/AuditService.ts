import init, { perform_local_audit } from '../wasm/cryptono_audit';
import { VaultRepository } from '../repositories/VaultRepository';
import type { AuditReportItem } from '../types';

export class AuditService {
    private vaultRepository: VaultRepository;

    constructor(vaultRepository: VaultRepository) {
        this.vaultRepository = vaultRepository;
    }

    // Run the complete health check
    async runFullAudit(): Promise<AuditReportItem[]> {
        // Initialize the WASM module
        await init();

        const items = await this.vaultRepository.getAllItems();
        
        // Map the items to a lightweight format for WASM processing
        // and ensure we only process items that have passwords
        const credentialsPayload = items
            .filter(item => item.password && item.password.length > 0)
            .map(item => ({
                id: item.id,
                password: item.password
            }));

        if (credentialsPayload.length === 0) {
            return [];
        }

        // Pass the serialized data to the WASM module
        // perform_local_audit returns a JS object directly thanks to serde_wasm_bindgen
        const localAuditResults: AuditReportItem[] = perform_local_audit(
            JSON.stringify(credentialsPayload)
        );

        // Check each password against the HIBP database using k-Anonymity
        // Concurrent Promise.all for faster execution
        await Promise.all(localAuditResults.map(async (result) => {
            result.is_leaked = await this.checkPwnedPasswords(
                result.sha1_prefix, 
                result.sha1_suffix
            );
        }));

        return localAuditResults;
    }

    // Fetch leaked suffixes using the first 5 characters of the SHA-1 hash
    private async checkPwnedPasswords(prefix: string, suffix: string): Promise<boolean> {
        try {
            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
            if (!response.ok) {
                console.error(`HIBP API error: ${response.status}`);
                return false;
            }

            const responseText = await response.text();
            
            // The API returns lines in the format: SUFFIX:COUNT
            const leakedSuffixes = responseText.split('\n').map(line => line.split(':')[0]);
            
            return leakedSuffixes.includes(suffix);
        } catch (error) {
            console.error('Failed to check password leaks:', error);
            return false;
        }
    }
}