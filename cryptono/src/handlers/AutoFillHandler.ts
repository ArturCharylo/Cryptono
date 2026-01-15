import { autofillService } from '../services/AutofillService';
import { SessionService } from '../services/SessionService';
import type { AutoFillResponse } from '../types';

/**
 * Handles Autofilling forms for domains saved in DB
 */
export async function handleAutofill(
  url: string, 
  sendResponse: (response: AutoFillResponse) => void
): Promise<void> {
  try {
    // 1. Check if user is logged in by attempting to get the Vault Key from memory
    try {
        SessionService.getInstance().getKey();
    } catch (_error) {
        // If getKey() throws, it means vaultKey is null => Vault is locked
        sendResponse({ success: false, error: 'LOCKED' });
        return;
    }

    // 2. Find matching data once the URL is matched
    // No need to pass masterPassword anymore
    const item = await autofillService.findCredentialsForUrl(url);

    if (item) {
      sendResponse({ 
        success: true, 
        data: { 
          username: item.username, 
          password: item.password,
          fields: item.fields,
        } 
      });
    } else {
      sendResponse({ success: false, error: 'NO_MATCH' });
    }

  } catch (error) {
    console.error('Autofill error:', error);
    sendResponse({ success: false, error: 'ERROR' });
  }
}