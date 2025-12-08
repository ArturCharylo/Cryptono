import { storageService } from '../services/StorageService';
import { STORAGE_KEYS } from '../constants/constants';

// Wait for call from ContentScript
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'AUTOFILL_REQUEST') {
    handleAutofill(message.url, sendResponse);
    return true; // This line is important, marks that the respons will be asynchronous
  }
});

async function handleAutofill(url: string, sendResponse: (response: any) => void) {
  try {
    // Check if user is logged in
    const sessionData = await chrome.storage.session.get(STORAGE_KEYS.MASTER);
    const masterPassword = sessionData[STORAGE_KEYS.MASTER] as string;

    if (!masterPassword) {
      sendResponse({ success: false, error: 'LOCKED' }); // Vault locked for users that aren't logged in
      return;
    }

    // Find matching data
    const item = await storageService.findCredentialsForUrl(url, masterPassword);

    if (item) {
      sendResponse({ 
        success: true, 
        data: { 
          username: item.username, 
          password: item.password 
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