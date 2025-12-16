import { handleAutofill } from '../handlers/AutoFillHandler';
import { handleInputSave } from '../handlers/AutoSaveHandler';
import { showToastMessage, ToastType } from '../utils/messages';

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
    showToastMessage("Login data saved", ToastType.SUCCESS, 2500) // Notify user that the data was saved correctly
    return true;
  }

});