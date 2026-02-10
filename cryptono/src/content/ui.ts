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
    // Append to documentElement (<html>) to avoid Body margin issues
    document.documentElement.appendChild(host);

    requestAnimationFrame(() => toastDiv.classList.add('visible'));

    setTimeout(() => {
        toastDiv.classList.remove('visible');
        setTimeout(() => host.remove(), 300);
    }, 3000);
}

export const createSuggestionDropdown = (input: HTMLInputElement, username: string, onFill: () => void) => {
    // Instead of returning, remove the existing one. 
    // This prevents "zombie" elements from blocking the new one.
    const existing = document.getElementById('cryptono-dropdown-host');
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = 'cryptono-dropdown-host';

    // Add pointer-events: none to host so the empty overlay doesn't block clicks on the page
    Object.assign(host.style, {
        position: 'absolute',
        zIndex: '2147483647',
        top: '0px', 
        left: '0px', 
        width: '100%',
        pointerEvents: 'none'
    });

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
    // remove existing instead of returning
    const existing = document.getElementById('cryptono-gen-dropdown-host');
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = 'cryptono-gen-dropdown-host';
    
    Object.assign(host.style, {
        position: 'absolute',
        zIndex: '2147483647',
        top: '0px', 
        left: '0px', 
        width: '100%',
        pointerEvents: 'none' // Ensure clicks pass through
    });

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