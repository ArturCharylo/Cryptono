import { handleAutofill } from '../handlers/AutoFillHandler';

// Wait for call from ContentScript
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  
  // AutoFill logic
  if (message.type === 'AUTOFILL_REQUEST') {
    handleAutofill(message.url, sendResponse);
    return true; // Important: Marks that the autofill response will be async
  }

  // Placeholder for future Auto Save logic
  if (message.type === 'AUTOSAVE_REQUEST') {
    // example: handleAutosave(message.data, sendResponse);
    return true;
  }

});