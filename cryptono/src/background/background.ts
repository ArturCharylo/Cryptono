import { handleAutofill } from '../handlers/AutoFillHandler';
import { handleInputSave } from '../handlers/AutoSaveHandler';

// Wait for call from ContentScript
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  
  // AutoFill logic
  if (message.type === 'AUTOFILL_REQUEST') {
    handleAutofill(message.url, sendResponse);
    return true; // Important: Marks that the autofill response will be async
  }

  // Placeholder for future Auto Save logic
  if (message.type === 'AUTOSAVE_REQUEST') {
    handleInputSave(message.data).then(sendResponse);
    return true;
  }

});