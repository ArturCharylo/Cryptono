import { fillForms } from './content/autofill';
import { initAutoSave } from './content/autosave';

const autoFill = async () => {
    const hostname = globalThis.location.hostname;
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'AUTOFILL_REQUEST',
            url: hostname
        });

        if (response?.success && response?.data) {
            fillForms(response.data.username, response.data.password, response.data.fields);
        }
    } catch (err) {
        console.debug('Cryptono connection issue:', err);
    }
};

// Start AutoFill
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(autoFill, 500));
} else {
    setTimeout(autoFill, 500);
}

// Start AutoSave Listener
initAutoSave();