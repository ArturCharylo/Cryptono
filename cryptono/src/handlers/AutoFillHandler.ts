import { autofillService } from '../services/AutofillService';
import { STORAGE_KEYS } from '../constants/constants';
import type { AutoFillResponse } from '../types';

/**
 * Handles Autofilling forms for domains saved in DB
 */
export async function handleAutofill(
  url: string, 
  sendResponse: (response: AutoFillResponse) => void
): Promise<void> {
  try {
    // Check if user is logged in by checking if master password is in session
    const sessionData = await chrome.storage.session.get(STORAGE_KEYS.MASTER);
    const masterPassword = sessionData[STORAGE_KEYS.MASTER] as string;

    if (!masterPassword) {
      sendResponse({ success: false, error: 'LOCKED' }); // Unathorized
      return;
    }

    // Find matching data once the URL is matched
    const item = await autofillService.findCredentialsForUrl(url, masterPassword);

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