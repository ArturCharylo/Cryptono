import { vaultRepository } from '../repositories/VaultRepository';
import { cryptoService } from './CryptoService';
import { normalizeUrl } from '../utils/urlHelper';
import type { VaultItem } from '../types/index';

export class AutofillService {
    
    // Scan DB for URL matching with the current URL (The one that the user is currently on)
    async findCredentialsForUrl(currentUrl: string, masterPassword: string): Promise<VaultItem | null> {
        // 1. Normalize the URL (e.g., https://login.google.com/ -> login.google.com)
        const cleanPageUrl = normalizeUrl(currentUrl);

        // 2. Generate a list of potential domains to check.
        // E.g., for "login.google.com" we check: "login.google.com" AND "google.com"
        const domainsToCheck = [cleanPageUrl];
        const parts = cleanPageUrl.split('.');
        if (parts.length > 2) {
            const rootDomain = parts.slice(-2).join('.');
            if (rootDomain !== cleanPageUrl) {
                domainsToCheck.push(rootDomain);
            }
        }

        // 3. Calculate blind index hashes for these domains (in parallel for performance)
        const hashesToCheck = await Promise.all(
            domainsToCheck.map(domain => cryptoService.getBlindIndex(masterPassword, domain))
        );

        // 4. Check each hash in the repository
        for (const hash of hashesToCheck) {
            // Fetch ENCRYPTED items matching the hash (very fast indexed lookup)
            // This requires 'getItemsByUrlHash' method in VaultRepository
            const encryptedItems = await vaultRepository.getItemsByUrlHash(hash);

            if (encryptedItems && encryptedItems.length > 0) {
                // Potential matches found. Now try to decrypt them.
                // Usually this will be just 1 or 2 items, not the whole database.
                
                for (const encryptedItem of encryptedItems) {
                    try {
                        const decryptedUrl = await cryptoService.decrypt(masterPassword, encryptedItem.url);
                        
                        // Additional check to ensure exact domain match (avoids hash collisions)
                        const normalizedDecryptedUrl = normalizeUrl(decryptedUrl);
                        const isMatch = cleanPageUrl === normalizedDecryptedUrl || cleanPageUrl.endsWith('.' + normalizedDecryptedUrl);

                        if (isMatch) {
                            // Decrypt optional fields
                            let decryptedFields = undefined;
                            if (encryptedItem.fields) {
                                const jsonString = await cryptoService.decrypt(masterPassword, encryptedItem.fields);
                                decryptedFields = JSON.parse(jsonString);
                            }

                            let decryptedNote = undefined;
                            if (encryptedItem.note) {
                                decryptedNote = await cryptoService.decrypt(masterPassword, encryptedItem.note);
                            }

                            return {
                                id: encryptedItem.id,
                                url: decryptedUrl,
                                username: await cryptoService.decrypt(masterPassword, encryptedItem.username),
                                password: await cryptoService.decrypt(masterPassword, encryptedItem.password),
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

    // Optimized method for checking duplicates when adding new items
    async findItemByUrlAndUsername(url: string, username: string, masterPassword: string): Promise<VaultItem | null> {
        const cleanUrl = normalizeUrl(url);
        const urlHash = await cryptoService.getBlindIndex(masterPassword, cleanUrl);
        
        // Fetch candidates by hash first
        const encryptedItems = await vaultRepository.getItemsByUrlHash(urlHash);

        for (const item of encryptedItems) {
            try {
                const decryptedUsername = await cryptoService.decrypt(masterPassword, item.username);
                if (decryptedUsername === username) {
                    // We found a match for both URL (via hash) and Username. Decrypt the rest.
                    
                    let decryptedFields = undefined;
                    if (item.fields) {
                        const jsonString = await cryptoService.decrypt(masterPassword, item.fields);
                        decryptedFields = JSON.parse(jsonString);
                    }

                    let decryptedNote = undefined;
                    if (item.note) {
                        decryptedNote = await cryptoService.decrypt(masterPassword, item.note);
                    }

                    return {
                        id: item.id,
                        url: await cryptoService.decrypt(masterPassword, item.url),
                        username: decryptedUsername,
                        password: await cryptoService.decrypt(masterPassword, item.password),
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