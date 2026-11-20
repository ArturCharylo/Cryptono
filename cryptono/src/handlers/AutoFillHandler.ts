import { autofillService } from '../services/AutofillService';
import { SessionService } from '../services/SessionService';
import type { AutoFillResponse } from '../types';

/**
 * Validates the sender and extracts the authorized URL for autofill.
 * Prevents URL spoofing and blocks cross-origin iframe domain mismatches.
 */
function getAuthorizedUrlFromSender(sender: chrome.runtime.MessageSender): string | null {
  const tabUrl = sender.tab?.url;
  if (!tabUrl) {
    return null;
  }

  // sender.url is the URL of the frame that dispatched the message
  const frameUrl = sender.url || sender.origin;
  if (!frameUrl) {
    return null;
  }

  try {
    const parsedTab = new URL(tabUrl);
    const parsedFrame = new URL(frameUrl);

    // If request originates from an iframe whose origin does not match the tab's origin,
    // reject the request to prevent cross-origin iframe credential harvesting.
    if (parsedFrame.origin !== parsedTab.origin) {
      console.warn(`Cryptono: Cross-origin iframe autofill blocked (frame: ${parsedFrame.origin}, tab: ${parsedTab.origin})`);
      return null;
    }

    // Return the verified hostname
    return parsedTab.hostname;
  } catch (err) {
    console.error('Cryptono: Failed to parse sender URL:', err);
    return null;
  }
}

/**
 * Handles Autofilling forms for domains saved in DB
 */
export async function handleAutofill(
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response: AutoFillResponse) => void
): Promise<void> {
  try {
    // Validate sender origin and extract verified URL
    const verifiedUrl = getAuthorizedUrlFromSender(sender);
    if (!verifiedUrl) {
      sendResponse({ success: false, error: 'INVALID_SENDER' });
      return;
    }

    // 1. Check if user is logged in by attempting to get the Vault Key from memory
    try {
        // Attempt to restore session first in case background script restarted
        await SessionService.getInstance().restoreSession();
        SessionService.getInstance().getKey();
    } catch (_error) {
        // If getKey() throws, it means vaultKey is null => Vault is locked
        sendResponse({ success: false, error: 'LOCKED' });
        return;
    }

    // 2. Find matching data using the verified URL
    const item = await autofillService.findCredentialsForUrl(verifiedUrl);

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
