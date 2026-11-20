import type { ToastData } from '../../types';
import type { CustomField } from '../types';
import { generateId } from './utils';

function getToastStyles(): string {
    return `
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
        .toast-prompt {
            background-color: #1e1e1e;
            border: 1px solid #10B981;
            color: white;
            padding: 10px 14px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 13px;
            font-weight: 500;
            box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            gap: 10px;
            opacity: 0;
            transform: translateY(-20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: auto;
            max-width: 380px;
        }
        .toast-prompt.visible { opacity: 1; transform: translateY(0); }
        .toast-prompt-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .toast-prompt-title {
            font-weight: 600;
            color: #10B981;
        }
        .toast-prompt-sub {
            font-size: 11px;
            color: #aaa;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .toast-prompt-actions {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-left: auto;
        }
        .btn-save-confirm {
            background: #10B981;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 5px 12px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .btn-save-confirm:hover { background: #059669; }
        .btn-save-dismiss {
            background: transparent;
            color: #888;
            border: none;
            font-size: 16px;
            cursor: pointer;
            padding: 2px 6px;
            line-height: 1;
        }
        .btn-save-dismiss:hover { color: #fff; }
        .icon { font-size: 18px; }
    `;
}

// Listen to storage changes to catch toasts added by the background script after navigation
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.cryptono_toasts) {
            const newToasts = (changes.cryptono_toasts.newValue || []) as ToastData[];
            const oldToasts = (changes.cryptono_toasts.oldValue || []) as ToastData[];
            
            const now = Date.now();
            newToasts.forEach((t) => {
                // Skip toasts that belong to a different domain
                if (t.domain && t.domain !== globalThis.location.hostname) return;
                
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
                toasts.push({ id: toastId, message, expiresAt: Date.now() + duration, domain: globalThis.location.hostname });
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
        style.textContent = getToastStyles();
        
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

    // Construct DOM nodes securely using textContent to prevent DOM XSS
    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    iconSpan.textContent = '🔒';

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;

    toastDiv.appendChild(iconSpan);
    toastDiv.appendChild(msgSpan);

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

/**
 * Displays an interactive in-page prompt requiring user consent before saving intercepted credentials.
 */
export function showSaveConfirmationToast(
    credentials: { url: string; username: string; password: string; fields?: CustomField[] },
    onConfirm: () => void,
    onDismiss?: () => void
): void {
    if (typeof document === 'undefined') return;

    let host = document.getElementById('cryptono-toast-container');
    let wrapper: HTMLElement | null = null;

    if (!host) {
        host = document.createElement('div');
        host.id = 'cryptono-toast-container';
        
        const shadow = host.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = getToastStyles();
        
        wrapper = document.createElement('div');
        wrapper.className = 'host-wrapper';
        
        shadow.appendChild(style);
        shadow.appendChild(wrapper);
        document.documentElement.appendChild(host);
    } else {
        wrapper = host.shadowRoot!.querySelector('.host-wrapper');
    }

    if (!wrapper) return;

    const toastDiv = document.createElement('div');
    toastDiv.className = 'toast-prompt';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    iconSpan.textContent = '🔒';

    const textDiv = document.createElement('div');
    textDiv.className = 'toast-prompt-text';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'toast-prompt-title';
    titleSpan.textContent = 'Save credentials to Cryptono?';

    const subSpan = document.createElement('span');
    subSpan.className = 'toast-prompt-sub';
    const displayUser = credentials.username ? `${credentials.username} @ ` : '';
    subSpan.textContent = `${displayUser}${credentials.url}`;

    textDiv.appendChild(titleSpan);
    textDiv.appendChild(subSpan);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'toast-prompt-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save-confirm';
    saveBtn.textContent = 'Save';

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'btn-save-dismiss';
    dismissBtn.textContent = '×';
    dismissBtn.title = 'Dismiss';

    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(dismissBtn);

    toastDiv.appendChild(iconSpan);
    toastDiv.appendChild(textDiv);
    toastDiv.appendChild(actionsDiv);

    wrapper.appendChild(toastDiv);

    requestAnimationFrame(() => toastDiv.classList.add('visible'));

    const removeToast = () => {
        toastDiv.classList.remove('visible');
        setTimeout(() => {
            toastDiv.remove();
            if (wrapper && wrapper.children.length === 0 && host && host.parentNode) {
                host.parentNode.removeChild(host);
            }
        }, 300);
    };

    saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeToast();
        onConfirm();
    });

    dismissBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeToast();
        onDismiss?.();
    });

    // Auto-dismiss prompt after 15 seconds if unhandled
    setTimeout(() => {
        if (toastDiv.parentNode) {
            removeToast();
        }
    }, 15000);
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
                // Skip toasts that belong to a different domain
                if (t.domain && t.domain !== globalThis.location.hostname) return true;
                
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
