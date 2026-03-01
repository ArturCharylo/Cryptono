import type { CustomField } from './types';
import { createSuggestionDropdown, showAutoSaveToast } from './ui';
import { scoreUsernameInput, calculateFieldScore } from './heuristics';

const DEBUG = true; 

export const fillForms = (initialUsername: string, initialPass: string, initialCustomFields?: CustomField[]) => {
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    if (passwordInputs.length === 0 && DEBUG) console.log('Cryptono: No password fields found.');

    for (const passwordInput of passwordInputs) {
        const input = passwordInput as HTMLInputElement;
        const form = input.closest('form');
        const inputsScope = form ? form : document.body;
        
        const allScopeInputs = Array.from(inputsScope.querySelectorAll('input, textarea, select')) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];

        // Setup Username Input candidate logic
        let usernameInput: HTMLInputElement | null = null;
        let bestScore = -1;

        const potentialUsernames = allScopeInputs.filter(i => {
            if (!(i instanceof HTMLInputElement)) return false;
            const isAlreadyFilled = i.style.backgroundColor === 'rgb(232, 240, 254)' || (i.value && i.value.length > 0);
            return i !== input && 
                   i.type !== 'hidden' && 
                   i.type !== 'submit' && 
                   i.type !== 'button' && 
                   !isAlreadyFilled &&
                   (i.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING);
        });

        potentialUsernames.forEach(candidate => {
            const score = scoreUsernameInput(candidate as HTMLInputElement);
            if (score > bestScore) {
                bestScore = score;
                usernameInput = candidate as HTMLInputElement;
            }
        });

        // Fallback logic for username
        if (!usernameInput && bestScore <= 0) {
             const passIndex = allScopeInputs.indexOf(input);
             if (passIndex > 0) {
                 const prevInput = allScopeInputs[passIndex - 1];
                 if (prevInput instanceof HTMLInputElement && 
                     prevInput.type !== 'hidden' && 
                     prevInput.type !== 'submit') {
                     usernameInput = prevInput;
                 }
             }
        }

        // --- FRESH EXECUTION FUNCTION ---
        // Generates mapping dynamically based on the LATEST data from DB
        const executeFreshFill = (freshData: {username: string, password: string, fields?: CustomField[]}) => {
            const targetsToFill = new Map<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, string>();
            
            // 1. Password
            targetsToFill.set(input, freshData.password);

            // 2. Custom Fields
            if (freshData.fields && freshData.fields.length > 0) {
                freshData.fields.forEach((field: CustomField) => {
                    let bestCandidate: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) | null = null;
                    let highestScore = 0;

                    allScopeInputs.forEach(candidate => {
                        if (candidate instanceof HTMLInputElement) {
                            if (candidate.type === 'password' || candidate.type === 'hidden' || candidate.type === 'submit' || candidate.type === 'image') return;
                        }
                        if (targetsToFill.has(candidate)) return;

                        const score = calculateFieldScore(candidate, field.name);
                        if (score > highestScore && score > 30) {
                            highestScore = score;
                            bestCandidate = candidate;
                        }
                    });

                    if (bestCandidate) {
                        targetsToFill.set(bestCandidate, field.value);
                    }
                });
            }

            // 3. Username
            if (usernameInput && !targetsToFill.has(usernameInput)) {
                targetsToFill.set(usernameInput, freshData.username);
            }

            // Execution
            targetsToFill.forEach((value, targetEl) => {
                targetEl.value = value;
                targetEl.dispatchEvent(new Event('input', { bubbles: true }));
                targetEl.dispatchEvent(new Event('change', { bubbles: true }));
                targetEl.style.backgroundColor = '#e8f0fe';
            });
            showAutoSaveToast('Credentials filled!');
        };

        // --- ATTACH UI LISTENERS ---
        const attachListener = (target: HTMLInputElement) => {
            if (target.dataset.cryptonoAttached === 'true') return;
            target.dataset.cryptonoAttached = 'true';

            target.style.backgroundImage = `url('${chrome.runtime.getURL("assets/icon-16.png")}')`;
            target.style.backgroundRepeat = "no-repeat";
            target.style.backgroundPosition = "right 10px center";
            target.style.backgroundSize = "16px";
            target.style.paddingRight = "30px"; 

            // HERE IS THE MAGIC FIX:
            target.addEventListener('focus', async () => {
                try {
                    // ALWAYS FETCH FRESH DATA BEFORE SHOWING DROPDOWN
                    const response = await chrome.runtime.sendMessage({
                        type: 'AUTOFILL_REQUEST',
                        url: globalThis.location.hostname
                    });

                    if (response?.success && response?.data) {
                        // Data still exists, show dropdown with fresh username
                        createSuggestionDropdown(target, response.data.username, () => {
                            executeFreshFill(response.data);
                        });
                    } else {
                        // Data was deleted in the meantime! Clean up UI to prevent Ghost Data.
                        target.style.backgroundImage = 'none';
                        target.dataset.cryptonoAttached = 'false';
                    }
                } catch (_e) {
                    console.debug('Failed to check latest autofill data');
                }
            });
            
            // Auto-show if focused on load (fast-path using initial data)
            if (document.activeElement === target) {
                createSuggestionDropdown(target, initialUsername, () => executeFreshFill({
                    username: initialUsername,
                    password: initialPass,
                    fields: initialCustomFields
                }));
            }
        };

        attachListener(input);
        if (usernameInput) {
            attachListener(usernameInput as HTMLInputElement);
        }
    }
};