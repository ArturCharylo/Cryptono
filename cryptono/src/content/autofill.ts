import type { CustomField } from './types';
import { createSuggestionDropdown, showAutoSaveToast } from './ui';
import { scoreUsernameInput, calculateFieldScore } from './heuristics';

// Debug flag - set to true to see matching logic in console
const DEBUG = true; 

export const fillForms = (username: string, pass: string, customFields?: CustomField[]) => {
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    if (passwordInputs.length === 0 && DEBUG) console.log('Cryptono: No password fields found.');

    for (const passwordInput of passwordInputs) {
        const input = passwordInput as HTMLInputElement;
        const form = input.closest('form');
        const inputsScope = form ? form : document.body;
        
        // Include SELECT and TEXTAREA in candidates
        const allScopeInputs = Array.from(inputsScope.querySelectorAll('input, textarea, select')) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];

        // --- PLAN EXECUTION ---
        const targetsToFill = new Map<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, string>();

        // 1. Plan Password
        targetsToFill.set(input, pass);

        // 2. Plan Custom Fields
        if (customFields && customFields.length > 0) {
            customFields.forEach(field => {
                let bestCandidate: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) | null = null;
                let highestScore = 0;

                allScopeInputs.forEach(candidate => {
                    // Skip hidden/submit/image/password fields for custom filling
                    if (candidate instanceof HTMLInputElement) {
                        if (candidate.type === 'password' || candidate.type === 'hidden' || candidate.type === 'submit' || candidate.type === 'image') return;
                    }
                    
                    // Don't overwrite if already targeted
                    if (targetsToFill.has(candidate)) return;

                    // Calculate Score
                    const score = calculateFieldScore(candidate, field.name);

                    if (DEBUG && score > 0) {
                        console.log(`Cryptono Match: Vault[${field.name}] vs Input[${candidate.name || candidate.id}] -> Score: ${score}`);
                    }

                    if (score > highestScore && score > 30) { // Threshold 30 prevents very weak matches
                        highestScore = score;
                        bestCandidate = candidate;
                    }
                });

                if (bestCandidate) {
                    targetsToFill.set(bestCandidate, field.value);
                    if (DEBUG) console.log(`>>> WINNER: Vault[${field.name}] assigned to`, bestCandidate);
                } else if (DEBUG) {
                    console.log(`!!! NO MATCH found for Vault item: ${field.name}`);
                }
            });
        }

        // 3. Plan Username
        let usernameInput: HTMLInputElement | null = null;
        let bestScore = -1;

        const potentialUsernames = allScopeInputs.filter(i => {
            if (!(i instanceof HTMLInputElement)) return false;
            // Check if this input is already reserved by Custom Fields logic
            if (targetsToFill.has(i)) return false;

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

        // Fallback logic for username (previous input)
        if (!usernameInput && bestScore <= 0) {
             const passIndex = allScopeInputs.indexOf(input);
             if (passIndex > 0) {
                 const prevInput = allScopeInputs[passIndex - 1];
                 const isReserved = targetsToFill.has(prevInput);
                 // Check if it's a valid text input
                 if (prevInput instanceof HTMLInputElement && 
                     prevInput.type !== 'hidden' && 
                     prevInput.type !== 'submit' && 
                     !isReserved) {
                     usernameInput = prevInput;
                 }
             }
        }

        if (usernameInput) {
            // Only autofill username if it wasn't captured by custom fields
            const uInput = usernameInput as HTMLInputElement;
            if (!targetsToFill.has(uInput) && !uInput.value) {
                targetsToFill.set(uInput, username);
            }
        }

        // --- EXECUTION FUNCTION ---
        const executeFill = () => {
            targetsToFill.forEach((value, targetEl) => {
                targetEl.value = value;
                targetEl.dispatchEvent(new Event('input', { bubbles: true }));
                targetEl.dispatchEvent(new Event('change', { bubbles: true }));
                targetEl.style.backgroundColor = '#e8f0fe';
            });
            showAutoSaveToast('Credentials filled!');
        };

        // --- ATTACH UI LISTENERS ---
        // Reuse your UI attach logic...
        const attachListener = (target: HTMLInputElement) => {
            if (target.dataset.cryptonoAttached === 'true') return;
            target.dataset.cryptonoAttached = 'true';

            target.style.backgroundImage = `url('${chrome.runtime.getURL("assets/icon-16.png")}')`;
            target.style.backgroundRepeat = "no-repeat";
            target.style.backgroundPosition = "right 10px center";
            target.style.backgroundSize = "16px";
            target.style.paddingRight = "30px"; 

            target.addEventListener('focus', () => {
                // Allows re-filling or filling empty
                createSuggestionDropdown(target, username, executeFill);
            });
            
            // Auto-show if focused on load
            if (document.activeElement === target) {
                createSuggestionDropdown(target, username, executeFill);
            }
        };

        attachListener(input);
        if (usernameInput) {
            attachListener(usernameInput as HTMLInputElement);
        }
    }
};