import { vaultRepository } from '../repositories/VaultRepository';
import { SessionService } from '../services/SessionService';
import type { VaultItem } from '../types';

export async function handleInputSave(
    data: { url: string; username: string; password: string; fields?: Array<{name: string; value: string; type: string}> }
): Promise<object> {
     try {
        // Check if user is logged in by attempting to retrieve the key from SessionService
        try {
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
            // Changed message to English for consistency
            chrome.tabs.sendMessage(tab.id, { type: 'SHOW_TOAST', message: 'Credentials saved!' });
        }
        
        return { success: true };

    } catch (error) {
        console.error('Autofill error:', error);
        return { success: false, error: 'UNKNOWN_ERROR' };
    }
}