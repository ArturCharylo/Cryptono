import { handleAutofill } from '../handlers/AutoFillHandler';
import { handleInputSave } from '../handlers/AutoSaveHandler';
import { STORAGE_KEYS } from '../constants/constants';

// Constant must match the one in SessionService.ts
const SESSION_STORAGE_KEY = STORAGE_KEYS.SESSION_STORAGE_KEY;

// Function to configure idle detection interval
const updateIdleSettings = async () => {
  try {
    const data = await chrome.storage.local.get(['autoLockEnabled', 'lockTime']);
    
    // Default values: enabled by default, 15 minutes default
    const isEnabled = data.autoLockEnabled !== false; 
    
    // We use Number() to ensure it's treated as a number, defaulting to 15 if invalid
    const minutes = Number(data.lockTime) || 15;

    if (isEnabled) {
      // chrome.idle expects seconds
      const seconds = minutes * 60;
      
      // Set interval (minimum 15 seconds in Chrome)
      chrome.idle.setDetectionInterval(seconds);
    } else {
      // If disabled, set a very long time to prevent frequent triggers
      // Chrome doesn't have "disable detection", so we set 40 hours
      chrome.idle.setDetectionInterval(144000); 
    }
  } catch (err) {
    console.error('Failed to update idle settings:', err);
  }
};

// --- INITIALIZATION ---

// 1. Set on browser/extension startup
chrome.runtime.onStartup.addListener(updateIdleSettings);
chrome.runtime.onInstalled.addListener(updateIdleSettings);

// 2. Listen for state changes (Active -> Idle)
chrome.idle.onStateChanged.addListener(async (newState) => {
  // States: 'active', 'idle', 'locked'
  if (newState === 'idle' || newState === 'locked') {
    
    // Check again if feature is definitely enabled (double check)
    const data = await chrome.storage.local.get(['autoLockEnabled']);
    if (data.autoLockEnabled !== false) {
      
      console.log(`[Background] System is ${newState}. Locking vault...`);
      
      // LOCKING LOGIC: Remove session key
      await chrome.storage.session.remove(SESSION_STORAGE_KEY);
    }
  }
});

// 3. Listen for settings changes (live reaction)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.autoLockEnabled || changes.lockTime) {
      updateIdleSettings();
    }
  }
});

// --- MESSAGE HANDLING ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // A wrapper for handling async tasks safely in chrome background scripts
  const runAsyncMessage = async () => {
    try {
      if (message.type === 'AUTOFILL_REQUEST') {
        // We await the result instead of passing the direct callback
        return await new Promise(resolve => handleAutofill(message.url, resolve));
      }
      
      if (message.type === 'AUTOSAVE_REQUEST') {
        return await handleInputSave(message.data, _sender.tab?.id);
      }
    } catch (e) {
       console.error("Cryptono Background handling error:", e);
       return { success: false, error: 'BACKGROUND_ERROR' };
    }
  };

  runAsyncMessage().then(sendResponse);

  // Return true signifies that the response will be sent asynchronously.
  return true; 
});