import type { CustomField } from './types';
import { getFieldLabel, scoreUsernameInput } from './heuristics';
import { showAutoSaveToast } from './ui';

export const initAutoSave = () => {
    document.addEventListener('submit', async (e) => {
        const target = e.target as HTMLElement;
        let form = (target.tagName === 'FORM' ? target : target.closest('form')) as HTMLElement;
        if (!form) form = target.closest('div, section, main') as HTMLElement;
        if (!form) return;

        const allInputs = Array.from(form.querySelectorAll('input, textarea, select')) as HTMLInputElement[];
        const passwordInput = allInputs.find(i => i.type === 'password');

        if (!passwordInput || !passwordInput.value) return;

        // Security check: If the password field was autofilled by the extension, skip autosave to avoid saving potentially incorrect credentials
        if (passwordInput.dataset.cryptonoAutofilled === 'true') {
            console.log('Cryptono: Skipping AutoSave, credentials were autofilled by extension.');
            return;
        }

        if (!passwordInput || !passwordInput.value) return;

        let usernameInput: HTMLInputElement | null = null;
        let bestScore = -1;

        const potentialUsernames = allInputs.filter(i => {
            return i !== passwordInput && 
                   (i.type === 'text' || i.type === 'email' || i.type === 'tel') &&
                   (i.compareDocumentPosition(passwordInput) & Node.DOCUMENT_POSITION_FOLLOWING);
        });

        potentialUsernames.forEach(input => {
            const score = scoreUsernameInput(input);
            if (score > bestScore) {
                bestScore = score;
                usernameInput = input;
            }
        });

        if (!usernameInput && potentialUsernames.length > 0) {
            usernameInput = potentialUsernames[potentialUsernames.length - 1];
        }

        if (usernameInput && usernameInput.value) {
            const url = globalThis.location.hostname;
            const collectedFields: CustomField[] = [];

            allInputs.forEach((input) => {
                const isHidden = input.type === 'hidden' || input.style.display === 'none';
                const isAction = input.type === 'submit' || input.type === 'button' || input.type === 'image';
                const isUnchecked = (input.type === 'checkbox' || input.type === 'radio') && !input.checked;
                const isMainCreds = input === passwordInput || input === usernameInput;

                if (!isHidden && !isAction && !isUnchecked && !isMainCreds) {
                    if (input.value && input.value.trim() !== '') {
                        const humanName = getFieldLabel(input);
                        const key = input.name || input.id || humanName;

                        collectedFields.push({
                            name: key, 
                            value: input.value,
                            type: input.type || 'text'
                        });
                    }
                }
            });

            try {
                await chrome.runtime.sendMessage({
                    type: 'AUTOSAVE_REQUEST',
                    data: {
                        url: url,
                        username: usernameInput.value,
                        password: passwordInput.value,
                        fields: collectedFields
                    }
                });
            } catch (err) {
                console.error('Cryptono AutoSave error:', err);
            }
        }
    }, true);

    // Listen for direct messages from the background script to handle SPA dynamic behavior
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'SHOW_TOAST' && message.message) {
            showAutoSaveToast(message.message, 4000, message.toastId);
        }
    });
};