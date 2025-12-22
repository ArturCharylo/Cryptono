import { databaseContext } from './DatabaseContext';
import { cryptoService } from './CryptoService';
import { normalizeUrl } from '../utils/urlHelper';
import { DB_CONFIG } from '../constants/constants';
import type { VaultItem, EncryptedVaultItem } from '../types/index';

const STORE_NAME = DB_CONFIG.STORE_NAME;

export class AutofillService {
    // Code section responsible for autofill functions
    // Scan DB for URL matching with the current URL(The one that the user is currently on)
    async findCredentialsForUrl(currentUrl: string, masterPassword: string): Promise<VaultItem | null> {
        await databaseContext.ensureInit();

        const cleanPageUrl = normalizeUrl(currentUrl);

        // Prepare list of potential domains to check
        const domainsToCheck = [cleanPageUrl];
        const parts = cleanPageUrl.split('.');
        if (parts.length > 2) {
            const rootDomain = parts.slice(-2).join('.');
            if (rootDomain !== cleanPageUrl) {
                domainsToCheck.push(rootDomain);
            }
        }

        // FIX: Calculate hashes BEFORE creating the Promise (async executor fix)
        // Also faster because we hash in parallel using Promise.all
        const hashesToCheck = await Promise.all(
            domainsToCheck.map(domain => cryptoService.getBlindIndex(masterPassword, domain))
        );

        return new Promise((resolve, reject) => {
            const db = databaseContext.db;
            if (!db) return reject(new Error("DB error"));

            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const urlIndex = objectStore.index('urlHash');

            // Recursive function to check hashes sequentially within IDB transaction
            // This avoids using 'await' inside the Promise constructor
            const checkNextHash = (index: number) => {
                if (index >= hashesToCheck.length) {
                    resolve(null); // No match found after checking all hashes
                    return;
                }

                const hash = hashesToCheck[index];
                const req = urlIndex.get(hash);

                req.onsuccess = async () => {
                    const foundItem = req.result as EncryptedVaultItem;
                    if (foundItem) {
                        try {
                            // Decrypt found item
                            const decrypted: VaultItem = {
                                id: foundItem.id,
                                url: await cryptoService.decrypt(masterPassword, foundItem.url),
                                username: await cryptoService.decrypt(masterPassword, foundItem.username),
                                password: await cryptoService.decrypt(masterPassword, foundItem.password),
                                createdAt: foundItem.createdAt
                            };
                            resolve(decrypted);
                        } catch (e) {
                            console.debug("Cryptono error decrypting found item, trying next...", e);
                            checkNextHash(index + 1);
                        }
                    } else {
                        // Hash not found, try next domain candidate
                        checkNextHash(index + 1);
                    }
                };

                req.onerror = () => {
                    // In case of error, continue to next
                    checkNextHash(index + 1);
                };
            };

            // Start checking from the first hash
            checkNextHash(0);
        });
    }
}

export const autofillService = new AutofillService();
