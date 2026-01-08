// Helper interface for custom fields
interface CustomField {
    name: string;
    value: string;
    type: string;
}

// --- UI COMPONENTS ---

export function showAutoSaveToast(message: string = 'Data saved!') {
    if (typeof document === 'undefined') return;

    const existing = document.getElementById('cryptono-toast-host');
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = 'cryptono-toast-host';
    Object.assign(host.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '2147483647',
        pointerEvents: 'none'
    });

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            background-color: #10B981;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 0;
            transform: translateY(-20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: auto;
        }
        .toast.visible { opacity: 1; transform: translateY(0); }
        .icon { font-size: 18px; }
    `;

    const toastDiv = document.createElement('div');
    toastDiv.className = 'toast';
    toastDiv.innerHTML = `<span class="icon">🔒</span><span>${message}</span>`;

    shadow.appendChild(style);
    shadow.appendChild(toastDiv);
    document.body.appendChild(host);

    requestAnimationFrame(() => toastDiv.classList.add('visible'));

    setTimeout(() => {
        toastDiv.classList.remove('visible');
        setTimeout(() => host.remove(), 300);
    }, 3000);
}

// Dropdown UI (Inline Suggestion)
const createSuggestionDropdown = (input: HTMLInputElement, username: string, onFill: () => void) => {
    if (document.getElementById('cryptono-dropdown-host')) return;

    const host = document.createElement('div');
    host.id = 'cryptono-dropdown-host';
    Object.assign(host.style, {
        position: 'absolute',
        zIndex: '2147483647',
        top: '0px', left: '0px', width: '100%'
    });

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
        .dropdown {
            position: absolute;
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 6px;
            padding: 8px 12px;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            min-width: 200px;
            animation: fadeIn 0.15s ease-out;
        }
        .dropdown:hover { background: #2a2a2a; border-color: #555; }
        .row { display: flex; align-items: center; gap: 10px; }
        .logo { font-size: 18px; }
        .text { display: flex; flex-direction: column; }
        .user { font-weight: 600; }
        .hint { font-size: 11px; color: #aaa; margin-top: 2px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
    `;

    const rect = input.getBoundingClientRect();
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;

    dropdown.innerHTML = `
        <div class="row">
            <span class="logo">🔒</span>
            <div class="text">
                <span class="user">${username || 'Unknown User'}</span>
                <span class="hint">Click to autofill</span>
            </div>
        </div>
    `;

    const close = () => {
        host.remove();
        document.removeEventListener('mousedown', outsideClickHandler);
    };

    const outsideClickHandler = (e: MouseEvent) => {
        if (e.target !== input && e.target !== host) close();
    };

    dropdown.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onFill();
        close();
    });

    shadow.appendChild(style);
    shadow.appendChild(dropdown);
    document.body.appendChild(host);

    setTimeout(() => document.addEventListener('mousedown', outsideClickHandler), 50);
};

// --- MAIN LOGIC ---

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

const fillForms = (username: string, pass: string, customFields?: CustomField[]) => {
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

        // 2. Plan Custom Fields (UPDATED ALGORITHM: BEST MATCH SCORING)
        if (customFields && customFields.length > 0) {
            customFields.forEach(field => {
                const cleanFieldName = field.name.toLowerCase().replace(/[^a-z0-9]/g, ''); // "First Name" -> "firstname"

                let bestCandidate: HTMLInputElement | null = null;
                let highestScore = 0;

                allScopeInputs.forEach(candidate => {
                    // Skip invalid candidates
                    if (candidate.type === 'password' || candidate.type === 'hidden' || candidate.type === 'submit' || candidate.type === 'image') return;
                    // Don't overwrite if we already decided this field belongs to another Custom Field
                    if (targetsToFill.has(candidate)) return;

                    let score = 0;
                    
                    // Normalize candidate attributes
                    const cName = (candidate.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cId = (candidate.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cLabel = getFieldLabel(candidate).toLowerCase().replace(/[^a-z0-9]/g, '');

                    // A. Exact Label Match (Highest Priority)
                    // If user named field "First Name" and label is "First Name" -> Perfection.
                    if (cLabel === cleanFieldName) score += 100;
                    else if (cLabel.includes(cleanFieldName)) score += 60;

                    // B. Exact Name/ID Match
                    if (cName === cleanFieldName || cId === cleanFieldName) score += 90;
                    
                    // C. Partial Name/ID Match (Fuzzy)
                    // "1firstName" includes "firstname"
                    else if (cName.includes(cleanFieldName) || cId.includes(cleanFieldName)) score += 50;

                    // D. Penalty for very long names (avoids matching "First Name" with "First Name Verification Code")
                    if (cName.length > cleanFieldName.length + 10) score -= 20;

                    // E. Sanity check: Field must be empty to be a good candidate (unless we want to overwrite)
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

        // 3. Plan Username (Heuristic)
        let usernameInput: HTMLInputElement | null = null;
        let bestScore = -1;

        const potentialUsernames = allScopeInputs.filter(i => {
            // CRITICAL: Ignore fields already claimed by Custom Fields logic
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
            const score = scoreUsernameInput(candidate);
            if (score > bestScore) {
                bestScore = score;
                usernameInput = candidate;
            }
        });

        // Fallback for Username
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

        // Add Username to Plan
        if (usernameInput) {
            const uInput = usernameInput as HTMLInputElement;
            if (!uInput.value && !targetsToFill.has(uInput)) {
                targetsToFill.set(uInput, username);
            }
        }

        // --- EXECUTION FUNCTION ---
        const executeFill = () => {
            targetsToFill.forEach((value, targetEl) => {
                // Ensure field is cleared before filling to prevent concatenation issues
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
            // Padding to prevent text overlapping icon
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

// Run autofill on site load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(autoFill, 500));
} else {
    setTimeout(autoFill, 500);
}


// --- HEURISTICS HELPERS ---

function getFieldLabel(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
    // 1. Check explicit <label for="id">
    if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label && label.textContent) return label.textContent.trim();
    }

    // 2. Check parent <label> wrapper
    const parentLabel = input.closest('label');
    if (parentLabel && parentLabel.firstChild) {
        // Clone to safely extract text without input value
        const clone = parentLabel.cloneNode(true) as HTMLElement;
        const children = clone.querySelectorAll('input, select, textarea');
        children.forEach(c => c.remove());
        return (clone.textContent || '').trim();
    }

    // 3. Check aria-label
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // 4. Placeholder
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        if (input.placeholder) return input.placeholder;
    }

    return input.name || input.id || '';
}

function scoreUsernameInput(input: HTMLInputElement): number {
    let score = 0;
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const type = (input.type || '').toLowerCase();
    const autocomplete = (input.autocomplete || '').toLowerCase();

    // High priority signals
    if (autocomplete === 'username' || autocomplete === 'email') score += 100;
    if (name === 'username' || name === 'login' || name === 'email') score += 50;
    if (id === 'username' || id === 'login' || id === 'email') score += 50;
    if (type === 'email') score += 40;
    if (name === 'userid' || id === 'userid') score += 45; // Common for bank/app IDs

    // Medium priority signals
    if (name.includes('user') || name.includes('login') || name.includes('mail')) score += 20;
    
    // It must be visible
    if (input.type === 'hidden' || input.style.display === 'none' || input.style.visibility === 'hidden') return -1;

    return score;
}

// AutoSave Listener (Unchanged logic)
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