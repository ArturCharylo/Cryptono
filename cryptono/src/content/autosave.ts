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

    chrome.runtime.onMessage.addListener((request) => {
        if (request.type === 'SHOW_TOAST') {
            showAutoSaveToast(request.message);
        }
    });
};