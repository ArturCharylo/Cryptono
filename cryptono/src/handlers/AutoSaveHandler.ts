import { vaultRepository } from '../repositories/VaultRepository';
import { SessionService } from '../services/SessionService';
import type { ToastData, VaultItem } from '../types';

export async function handleInputSave(
    data: { url: string; username: string; password: string; fields?: Array<{name: string; value: string; type: string}> }
): Promise<object> {
     try {
        // Check if user is logged in by attempting to retrieve the key from SessionService
        try {
            // Attempt to restore session first in case background script restarted
            await SessionService.getInstance().restoreSession();
            // We check if the key exists. If not, getKey() throws an error.
            SessionService.getInstance().getKey();
        } catch (_error) {
            return { success: false, error: 'LOCKED' };
        }

        // Find matching data once the URL is matched
        // Updated signature: removed masterPassword argument
        const existingItem = await vaultRepository.findItemByUrlAndUsername(data.url, data.username);

        if (existingItem) {
            console.log('Cryptono: Credentials already exist for this user/site.');
            return { success: false, error: 'ALREADY_EXISTS' };
        }

        // Creating a new item with the given data
        const newItem: VaultItem = {
            id: crypto.randomUUID(),
            url: data.url,
            username: data.username,
            password: data.password,
            fields: data.fields,
            createdAt: Date.now()
        };

        // Request to add newItem to the DB
        // Updated signature: removed masterPassword argument, repository uses SessionService internally
        await vaultRepository.addItem(newItem);
        
        console.log('Cryptono: AutoSaved new credentials!');
        
        // Get active tab
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (tab?.id) {
            // Store toast in chrome.storage.local to survive page redirects
            // explicitly type the storage result so TS knows what to expect
            const storageRes = await chrome.storage.local.get('cryptono_toasts') as {
                cryptono_toasts?: ToastData[];
            };
            const cryptono_toasts: ToastData[] = storageRes.cryptono_toasts ?? [];
            cryptono_toasts.push({
                id: crypto.randomUUID(),
                message: 'Credentials saved!',
                expiresAt: Date.now() + 4000
            });
            await chrome.storage.local.set({ cryptono_toasts });
            
            // Still send message in case the page does not redirect
            chrome.tabs.sendMessage(tab.id, { type: 'SHOW_TOAST', message: 'Credentials saved!', toastId: cryptono_toasts[cryptono_toasts.length - 1].id }).catch(() => {});
        }
        
        return { success: true };

    } catch (error) {
        console.error('Autofill error:', error);
        return { success: false, error: 'UNKNOWN_ERROR' };
    }
}