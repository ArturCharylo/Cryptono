import { fillForms } from './content/autofill';
import { initAutoSave } from './content/autosave';
import { createGeneratorDropdown, showAutoSaveToast } from './content/ui';
import { generateStrongPassword } from './utils/passGen';

/**
 * Safely sets the value of an input element and triggers necessary events.
 * This ensures that frameworks like React, Vue, or Angular detect the change
 * by updating their internal state and bypassing internal value trackers.
 */
const setNativeValue = (element: HTMLInputElement, value: string): void => {
    const lastValue = element.value;
    element.value = value;
    
    // Create a native 'input' event that bubbles up the DOM
    const event = new Event('input', { bubbles: true });
    
    // Define an interface for React's internal value tracker to avoid 'any'
    interface ReactValueTracker {
        setValue(value: string): void;
    }

    // Safely check for the internal tracker without casting to any
    if ('_valueTracker' in element) {
        const tracker = (element as unknown as { _valueTracker: ReactValueTracker })._valueTracker;
        if (tracker) {
            tracker.setValue(lastValue);
        }
    }
    
    // Dispatch the event so the website's framework can catch the update
    element.dispatchEvent(event);
};

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

// Global listener for focus events to detect when a user enters a password field
document.addEventListener('focusin', async (e) => {
    const target = e.target as HTMLInputElement;

    // Check if the focused element is a password input
    if (target && target.tagName === 'INPUT' && target.type === 'password') {
        
        // 1. Only show generator if the field is empty (user is likely registering)
        if (target.value.length > 0) return;

        // 2. Trigger the generator UI
        createGeneratorDropdown(target, async () => {
            // Logic executed when user clicks the "Generate" button
            const newPassword = generateStrongPassword();

            // Handle potential generation error in Content Script context
            if (!newPassword) {
                showAutoSaveToast('Generation failed!');
                return;
            }

            // Fill the current input
            setNativeValue(target, newPassword);
            
            // Attempt to find a confirmation field (usually the next password input)
            const allInputs = Array.from(document.querySelectorAll('input[type="password"]'));
            const currentIndex = allInputs.indexOf(target);
            const nextInput = allInputs[currentIndex + 1] as HTMLInputElement;
            
            // Simple heuristic: if next password field exists, fill it too
            if (nextInput) {
                setNativeValue(nextInput, newPassword);
            }

            // Copy to clipboard and notify user
            try {
                await navigator.clipboard.writeText(newPassword);
                showAutoSaveToast('Password generated & copied!');
            } catch (err) {
                console.error('Clipboard write failed', err);
                showAutoSaveToast('Password generated (copy failed)');
            }
        });
    }
});

// Start AutoSave Listener
initAutoSave();