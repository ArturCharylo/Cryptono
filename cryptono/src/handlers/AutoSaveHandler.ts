import { storageService } from '../services/StorageService';
import { STORAGE_KEYS } from '../constants/constants';
import type { VaultItem } from '../types';

export async function handleInputSave(
    data: { url: string; username: string; password: string }
): Promise<object> {
     try {
    // Check if user is logged in by checking if master password is in session
    const sessionData = await chrome.storage.session.get(STORAGE_KEYS.MASTER);
    const masterPassword = sessionData[STORAGE_KEYS.MASTER] as string;

    if (!masterPassword) {
      return { success: false, error: 'LOCKED' };
    }

    // Find matching data once the URL is matched
    // This function currently only checks for the first matching data for the url given
    const existingItem = await storageService.findItemByUrlAndUsername(data.url, data.username, masterPassword);

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
        createdAt: Date.now()
    };

    // Request to add newItem to the DB
    await storageService.addItem(newItem, masterPassword);
    console.log('Cryptono: AutoSaved new credentials!');
    // Get active tab
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'SHOW_TOAST', message: 'Zapisano hasło!' });
    }
    
    return { success: true };

    } catch (error) {
      console.error('Autofill error:', error);
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
}
