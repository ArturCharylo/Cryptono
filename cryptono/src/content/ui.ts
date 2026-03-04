import type { ToastData } from '../types';

// Safe ID generator fallback for non-secure HTTP contexts
const generateId = () => {
    return (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Inject global styles to avoid inline styling
const injectGlobalStyles = () => {
    if (typeof document === 'undefined' || document.getElementById('cryptono-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'cryptono-global-styles';
    style.textContent = `
        .cryptono-dropdown-host-wrapper {
            position: absolute;
            z-index: 2147483647;
            top: 0;
            left: 0;
            width: 100%;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
};

// Listen to storage changes to catch toasts added by the background script after navigation
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.cryptono_toasts) {
            const newToasts = (changes.cryptono_toasts.newValue || []) as ToastData[];
            const oldToasts = (changes.cryptono_toasts.oldValue || []) as ToastData[];
            
            const now = Date.now();
            newToasts.forEach((t) => {
                // Check if the toast is newly added
                const isNew = !oldToasts.some((ot) => ot.id === t.id);
                if (isNew) {
                    const remaining = t.expiresAt - now;
                    if (remaining > 0) {
                        renderToastToDOM(t.message, remaining, t.id);
                    }
                }
            });
        }
    });
}

export function showAutoSaveToast(message: string = 'Data saved!', duration: number = 3000, providedId?: string) {
    if (typeof document === 'undefined') return;

    // Use robust UUID generation with HTTP fallback
    const toastId = providedId || generateId();

    // Save state to chrome.storage.local to survive cross-origin redirects
    if (!providedId && typeof chrome !== 'undefined' && chrome.storage) {
        try {
            chrome.storage.local.get(['cryptono_toasts'], (result) => {
                if (chrome.runtime.lastError) return;
                
                const toasts: ToastData[] = (result.cryptono_toasts || []) as ToastData[];
                toasts.push({ id: toastId, message, expiresAt: Date.now() + duration });
                chrome.storage.local.set({ cryptono_toasts: toasts });
            });
        } catch (error) {
            console.debug('Cryptono: Storage context invalid', error);
        }
    }

    renderToastToDOM(message, duration, toastId);
}

function renderToastToDOM(message: string, duration: number, toastId: string) {
    let host = document.getElementById('cryptono-toast-container');
    let wrapper: HTMLElement | null = null;

    if (!host) {
        // Create main container if it does not exist
        host = document.createElement('div');
        host.id = 'cryptono-toast-container';
        
        const shadow = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        
        style.textContent = `
            .host-wrapper {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 2147483647;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: flex-end;
            }
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
        
        wrapper = document.createElement('div');
        wrapper.className = 'host-wrapper';
        
        shadow.appendChild(style);
        shadow.appendChild(wrapper);
        // Append to documentElement (<html>) to avoid Body margin issues
        document.documentElement.appendChild(host);
    } else {
        wrapper = host.shadowRoot!.querySelector('.host-wrapper');
    }

    if (!wrapper) return;

    // Prevent duplicate toasts with the same ID in DOM
    if (wrapper.querySelector(`[data-toast-id="${toastId}"]`)) return;

    const toastDiv = document.createElement('div');
    toastDiv.className = 'toast';
    toastDiv.dataset.toastId = toastId;
    toastDiv.innerHTML = `<span class="icon">🔒</span><span>${message}</span>`;

    wrapper.appendChild(toastDiv);

    // Allow DOM to update before adding the visible class for transition to work
    requestAnimationFrame(() => toastDiv.classList.add('visible'));

    setTimeout(() => {
        toastDiv.classList.remove('visible');
        setTimeout(() => {
            toastDiv.remove();
            
            // Clean up the host if there are no more toasts left
            if (wrapper && wrapper.children.length === 0 && host && host.parentNode) {
                host.parentNode.removeChild(host);
            }
            
            // Clear storage safely when toast expires naturally
            if (typeof chrome !== 'undefined' && chrome.storage) {
                try {
                    // Always get fresh state right before setting to avoid race conditions
                    chrome.storage.local.get(['cryptono_toasts'], (result) => {
                        if (chrome.runtime.lastError) return;
                        
                        let toasts: ToastData[] = (result.cryptono_toasts || []) as ToastData[];
                        toasts = toasts.filter((t) => t.id !== toastId);
                        chrome.storage.local.set({ cryptono_toasts: toasts });
                    });
                } catch (error) {
                    console.debug('Cryptono: Storage context invalid during cleanup', error);
                }
            }
        }, 300);
    }, duration);
}

export function restorePendingToasts() {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    
    try {
        chrome.storage.local.get(['cryptono_toasts'], (result) => {
            if (chrome.runtime.lastError) return;

            let toasts: ToastData[] = (result.cryptono_toasts as ToastData[]) || [];
            const now = Date.now();
            let hasChanges = false;

            toasts = toasts.filter((t) => {
                const remainingTime = t.expiresAt - now;
                if (remainingTime > 0) {
                    // Show toast for the remaining time
                    renderToastToDOM(t.message, remainingTime, t.id);
                    return true;
                }
                hasChanges = true;
                return false;
            });

            // Remove expired toast data
            if (hasChanges) {
                chrome.storage.local.set({ cryptono_toasts: toasts });
            }
        });
    } catch (error) {
        console.debug('Cryptono: Failed to restore pending toasts', error);
    }
}

export const createSuggestionDropdown = (input: HTMLInputElement, username: string, onFill: () => void) => {
    injectGlobalStyles();

    // Instead of returning, remove the existing one. 
    // This prevents "zombie" elements from blocking the new one.
    const existing = document.getElementById('cryptono-dropdown-host');
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = 'cryptono-dropdown-host';
    host.className = 'cryptono-dropdown-host-wrapper';

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    
    style.textContent = `
        :host { display: block; }
        .dropdown {
            position: absolute;
            background: #1e1e1e;
            border: 1px solid #333;
            border-radius: 6px;
            padding: 8px 12px;
            padding-right: 32px;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            min-width: 200px;
            animation: fadeIn 0.15s ease-out;
            pointer-events: auto; /* Re-enable clicks on the dropdown itself */
        }
        .dropdown:hover { background: #2a2a2a; border-color: #555; }
        .row { display: flex; align-items: center; gap: 10px; }
        .logo { font-size: 18px; }
        .text { display: flex; flex-direction: column; }
        .user { font-weight: 600; }
        .hint { font-size: 11px; color: #aaa; margin-top: 2px; }

        .close-btn {
            position: absolute;
            top: 6px;
            right: 6px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-size: 16px;
            line-height: 1;
            transition: all 0.2s;
            z-index: 10;
        }
        .close-btn:hover {
            color: #fff;
            background: rgba(255,255,255,0.1);
        }

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
        <div class="close-btn" title="Close">&times;</div>
    `;

    const close = () => {
        host.remove();
        document.removeEventListener('mousedown', outsideClickHandler);
    };

    const outsideClickHandler = (e: MouseEvent) => {
        if (e.target === input) return;
        if (host.contains(e.target as Node)) return;
        close();
    };

    dropdown.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onFill();
        close();
    });

    const closeBtn = dropdown.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation(); 
            e.preventDefault();
            close();
        });
    }

    shadow.appendChild(style);
    shadow.appendChild(dropdown);
    
    // Append to documentElement (<html>) instead of body
    // This avoids positioning errors if <body> has margin-top or position: relative
    document.documentElement.appendChild(host);

    setTimeout(() => document.addEventListener('mousedown', outsideClickHandler), 50);
};

export const createGeneratorDropdown = (input: HTMLInputElement, onGenerate: () => void) => {
    injectGlobalStyles();

    // Remove existing instead of returning
    const existing = document.getElementById('cryptono-gen-dropdown-host');
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = 'cryptono-gen-dropdown-host';
    host.className = 'cryptono-dropdown-host-wrapper';

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    
    style.textContent = `
        :host {
            display: block;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .dropdown {
            background: #1e1e1e;
            border: 1px solid #10B981;
            border-radius: 6px;
            padding: 8px 12px;
            padding-right: 32px;
            color: #fff;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            cursor: pointer;
            min-width: 200px;
            max-width: 300px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: fadeIn 0.15s ease-out;
            transition: background 0.2s;
            position: absolute;
            pointer-events: auto; /* Re-enable clicks */
        }
        .dropdown:hover {
            background: #2a2a2a;
        }
        .icon { font-size: 18px; }
        .text-container {
            display: flex;
            flex-direction: column;
        }
        .title {
            font-weight: 600;
            color: #10B981;
        }
        .hint {
            font-size: 11px;
            color: #aaa;
            margin-top: 2px;
        }
        .close-btn {
            position: absolute;
            top: 6px;
            right: 6px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-size: 16px;
            line-height: 1;
            transition: all 0.2s;
            z-index: 20;
        }
        .close-btn:hover {
            color: #fff;
            background: rgba(255,255,255,0.1);
        }
        @keyframes fadeIn { 
            from { opacity: 0; transform: translateY(-5px); } 
            to { opacity: 1; transform: translateY(0); } 
        }
    `;

    const rect = input.getBoundingClientRect();
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    
    dropdown.innerHTML = `
        <span class="icon">🎲</span>
        <div class="text-container">
            <span class="title">Generate Strong Password</span>
            <span class="hint">Click to fill & copy</span>
        </div>
        <div class="close-btn" title="Close">&times;</div>
    `;

    const close = () => {
        host.remove();
        document.removeEventListener('mousedown', outsideClickHandler);
    };

    const outsideClickHandler = (e: MouseEvent) => {
        if (e.target === input) return;
        if (host.contains(e.target as Node)) return;
        close();
    };

    dropdown.addEventListener('mousedown', (e) => {
        e.preventDefault(); 
        onGenerate();
        close();
    });

    const closeBtn = dropdown.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation(); 
            e.preventDefault();
            close();
        });
    }

    shadow.appendChild(style);
    shadow.appendChild(dropdown);
    
    document.documentElement.appendChild(host);

    setTimeout(() => document.addEventListener('mousedown', outsideClickHandler), 50);
};