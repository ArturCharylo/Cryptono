import type { CustomField } from './types';
import { createSuggestionDropdown, showAutoSaveToast } from './ui';
import { getFieldLabel, scoreUsernameInput } from './heuristics';

export const fillForms = (username: string, pass: string, customFields?: CustomField[]) => {
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    for (const passwordInput of passwordInputs) {
        const input = passwordInput as HTMLInputElement;
        const form = input.closest('form');
        const inputsScope = form ? form : document.body;
        const allScopeInputs = Array.from(inputsScope.querySelectorAll('input, textarea, select')) as HTMLInputElement[];

        // --- PLAN EXECUTION ---
        const targetsToFill = new Map<HTMLInputElement, string>();

        // 1. Plan Password
        targetsToFill.set(input, pass);

        // 2. Plan Custom Fields
        if (customFields && customFields.length > 0) {
            customFields.forEach(field => {
                const cleanFieldName = field.name.toLowerCase().replace(/[^a-z0-9]/g, '');

                let bestCandidate: HTMLInputElement | null = null;
                let highestScore = 0;

                allScopeInputs.forEach(candidate => {
                    if (candidate.type === 'password' || candidate.type === 'hidden' || candidate.type === 'submit' || candidate.type === 'image') return;
                    if (targetsToFill.has(candidate)) return;

                    let score = 0;
                    const cName = (candidate.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cId = (candidate.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cLabel = getFieldLabel(candidate).toLowerCase().replace(/[^a-z0-9]/g, '');

                    if (cLabel === cleanFieldName) score += 100;
                    else if (cLabel.includes(cleanFieldName)) score += 60;
                    if (cName === cleanFieldName || cId === cleanFieldName) score += 90;
                    else if (cName.includes(cleanFieldName) || cId.includes(cleanFieldName)) score += 50;
                    if (cName.length > cleanFieldName.length + 10) score -= 20;
                    if (candidate.value && candidate.value.length > 0) score -= 30;

                    if (score > highestScore && score > 0) {
                        highestScore = score;
                        bestCandidate = candidate;
                    }
                });

                if (bestCandidate) {
                    targetsToFill.set(bestCandidate, field.value);
                }
            });
        }

        // 3. Plan Username
        let usernameInput: HTMLInputElement | null = null;
        let bestScore = -1;

        const potentialUsernames = allScopeInputs.filter(i => {
            if (targetsToFill.has(i)) return false;
            const isAlreadyFilled = i.style.backgroundColor === 'rgb(232, 240, 254)' || (i.value && i.value.length > 0);
            return i !== input && i.type !== 'hidden' && i.type !== 'submit' && i.type !== 'button' && !isAlreadyFilled &&
                   (i.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING);
        });

        potentialUsernames.forEach(candidate => {
            const score = scoreUsernameInput(candidate);
            if (score > bestScore) {
                bestScore = score;
                usernameInput = candidate;
            }
        });

        if (!usernameInput) {
             const passIndex = allScopeInputs.indexOf(input);
             if (passIndex > 0) {
                 const prevInput = allScopeInputs[passIndex - 1];
                 const isReserved = targetsToFill.has(prevInput);
                 if (prevInput.type !== 'hidden' && prevInput.type !== 'submit' && !isReserved) {
                     usernameInput = prevInput;
                 }
             }
        }

        if (usernameInput) {
            const uInput = usernameInput as HTMLInputElement;
            if (!uInput.value && !targetsToFill.has(uInput)) {
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
        const attachListener = (target: HTMLInputElement) => {
            if (target.dataset.cryptonoAttached === 'true') return;
            target.dataset.cryptonoAttached = 'true';

            target.style.backgroundImage = `url('${chrome.runtime.getURL("assets/icon-16.png")}')`;
            target.style.backgroundRepeat = "no-repeat";
            target.style.backgroundPosition = "right 10px center";
            target.style.backgroundSize = "16px";
            target.style.paddingRight = "30px"; 

            target.addEventListener('focus', () => {
                if (!target.value || target.value === username) {
                    createSuggestionDropdown(target, username, executeFill);
                }
            });

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