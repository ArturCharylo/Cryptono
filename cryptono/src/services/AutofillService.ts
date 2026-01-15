import { vaultRepository } from '../repositories/VaultRepository';
import { cryptoService } from './CryptoService';
import { SessionService } from './SessionService';
import { normalizeUrl } from '../utils/urlHelper';
import type { VaultItem } from '../types/index';

export class AutofillService {
    
    // Scan DB for URL matching with the current URL (The one that the user is currently on)
    // Removed masterPassword argument
    async findCredentialsForUrl(currentUrl: string): Promise<VaultItem | null> {
        
        // 0. Get the Vault Key from session. If locked, this throws an error.
        let vaultKey: CryptoKey;
        try {
            vaultKey = SessionService.getInstance().getKey();
        } catch (_error) {
            console.warn("AutofillService: Vault is locked, cannot search for credentials.");
            return null;
        }

        // 1. Normalize the URL (e.g., https://login.google.com/ -> login.google.com)
        const cleanPageUrl = normalizeUrl(currentUrl);

        // 2. Generate a list of potential domains to check.
        const domainsToCheck = [cleanPageUrl];
        
        // Improved root domain extraction logic
        const rootDomain = this.extractRootDomain(cleanPageUrl);
        
        // Add root domain if it's different from the full URL
        if (rootDomain && rootDomain !== cleanPageUrl) {
            domainsToCheck.push(rootDomain);
        }

        // 3. Calculate blind index hashes for these domains (in parallel for performance)
        // Using vaultKey instead of masterPassword
        const hashesToCheck = await Promise.all(
            domainsToCheck.map(domain => cryptoService.getBlindIndex(vaultKey, domain))
        );

        // 4. Check each hash in the repository
        for (const hash of hashesToCheck) {
            // Fetch ENCRYPTED items matching the hash (very fast indexed lookup)
            const encryptedItems = await vaultRepository.getItemsByUrlHash(hash);

            if (encryptedItems && encryptedItems.length > 0) {
                
                for (const encryptedItem of encryptedItems) {
                    try {
                        // Use decryptItem with vaultKey
                        const decryptedUrl = await cryptoService.decryptItem(vaultKey, encryptedItem.url);
                        
                        // Additional check to ensure exact domain match (avoids hash collisions)
                        const normalizedDecryptedUrl = normalizeUrl(decryptedUrl);
                        // Check if it matches either the full URL or ends with the decrypted URL (subdomain match)
                        const isMatch = cleanPageUrl === normalizedDecryptedUrl || cleanPageUrl.endsWith('.' + normalizedDecryptedUrl);

                        if (isMatch) {
                            // Decrypt optional fields
                            let decryptedFields = undefined;
                            if (encryptedItem.fields) {
                                const jsonString = await cryptoService.decryptItem(vaultKey, encryptedItem.fields);
                                decryptedFields = JSON.parse(jsonString);
                            }

                            let decryptedNote = undefined;
                            if (encryptedItem.note) {
                                decryptedNote = await cryptoService.decryptItem(vaultKey, encryptedItem.note);
                            }

                            return {
                                id: encryptedItem.id,
                                url: decryptedUrl,
                                username: await cryptoService.decryptItem(vaultKey, encryptedItem.username),
                                password: await cryptoService.decryptItem(vaultKey, encryptedItem.password),
                                createdAt: encryptedItem.createdAt,
                                fields: decryptedFields,
                                note: decryptedNote
                            };
                        }
                    } catch (e) {
                        console.warn("AutofillService: Failed to decrypt potential candidate", e);
                        // Ignore decryption errors and continue searching
                    }
                }
            }
        }

        return null;
    }

    /**
     * Helper to extract root domain handling common multipart TLDs (like co.uk, gov.pl)
     */
    private extractRootDomain(hostname: string): string {
        const parts = hostname.split('.');
        
        // If simply domain.com or localhost
        if (parts.length <= 2) return hostname;

        const lastPart = parts[parts.length - 1];
        const secondLastPart = parts[parts.length - 2];

        // List of common Second Level Domains (SLDs) that act as effective TLDs
        // Extend this list as needed for your target user base
        const commonSLDs = [
            'co', 'com', 'org', 'net', 'edu', 'gov', 'mil', 'ac', // Generic
            'waw', 'lodz', 'krakow', 'wroc', 'poznan', // Polish regional (optional)
        ];

        // Logic: If the TLD is 2 chars (e.g. uk, pl, au) AND the SLD is common (e.g. co, com, gov)
        // Then we should take the last 3 parts (amazon.co.uk) instead of 2 (co.uk)
        if (lastPart.length === 2 && commonSLDs.includes(secondLastPart)) {
            return parts.slice(-3).join('.');
        }

        return parts.slice(-2).join('.');
    }

    // Optimized method for checking duplicates when adding new items
    // Removed masterPassword argument
    async findItemByUrlAndUsername(url: string, username: string): Promise<VaultItem | null> {
        let vaultKey: CryptoKey;
        try {
            vaultKey = SessionService.getInstance().getKey();
        } catch (_error) {
            return null;
        }

        const cleanUrl = normalizeUrl(url);
        const urlHash = await cryptoService.getBlindIndex(vaultKey, cleanUrl);
        
        // Fetch candidates by hash first
        const encryptedItems = await vaultRepository.getItemsByUrlHash(urlHash);

        for (const item of encryptedItems) {
            try {
                const decryptedUsername = await cryptoService.decryptItem(vaultKey, item.username);
                if (decryptedUsername === username) {
                    
                    let decryptedFields = undefined;
                    if (item.fields) {
                        const jsonString = await cryptoService.decryptItem(vaultKey, item.fields);
                        decryptedFields = JSON.parse(jsonString);
                    }

                    let decryptedNote = undefined;
                    if (item.note) {
                        decryptedNote = await cryptoService.decryptItem(vaultKey, item.note);
                    }

                    return {
                        id: item.id,
                        url: await cryptoService.decryptItem(vaultKey, item.url),
                        username: decryptedUsername,
                        password: await cryptoService.decryptItem(vaultKey, item.password),
                        createdAt: item.createdAt,
                        fields: decryptedFields,
                        note: decryptedNote
                    };
                }
            } catch (e) {
                console.warn("AutofillService: Error checking for duplicates", e);
            }
        }
        return null;
    }
}

export const autofillService = new AutofillService();