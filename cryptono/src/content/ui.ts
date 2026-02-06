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

export const createSuggestionDropdown = (input: HTMLInputElement, username: string, onFill: () => void) => {
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

// The generator dropdown is similar to the suggestion dropdown but with different styling and content.
// This function creates a popup to generate a strong password, and calls the provided 
// callback when clicked. It also includes error handling for generation failures.
export const createGeneratorDropdown = (input: HTMLInputElement, onGenerate: () => void) => {
    // Check if the dropdown host already exists
    if (document.getElementById('cryptono-gen-dropdown-host')) return;

    const host = document.createElement('div');
    host.id = 'cryptono-gen-dropdown-host';
    
    // Dynamic positioning requires inline styles (minimal set)
    const rect = input.getBoundingClientRect();
    host.style.position = 'absolute';
    host.style.zIndex = '2147483647';
    host.style.top = `${rect.bottom + window.scrollY + 4}px`;
    host.style.left = `${rect.left + window.scrollX}px`;
    host.style.width = '100%'; // Prevent collapsing

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    
    // Encapsulated styling
    style.textContent = `
        :host {
            display: block;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .dropdown {
            background: #1e1e1e;
            border: 1px solid #10B981; /* Green accent for generator */
            border-radius: 6px;
            padding: 8px 12px;
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
        }
        .dropdown:hover {
            background: #2a2a2a;
        }
        .icon {
            font-size: 18px;
        }
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
        @keyframes fadeIn { 
            from { opacity: 0; transform: translateY(-5px); } 
            to { opacity: 1; transform: translateY(0); } 
        }
    `;

    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    
    dropdown.innerHTML = `
        <span class="icon">🎲</span>
        <div class="text-container">
            <span class="title">Generate Strong Password</span>
            <span class="hint">Click to fill & copy</span>
        </div>
    `;

    // Logic to close the dropdown
    const close = () => {
        host.remove();
        document.removeEventListener('mousedown', outsideClickHandler);
    };

    const outsideClickHandler = (e: MouseEvent) => {
        // If clicked outside input and outside dropdown -> close
        if (e.target !== input && e.target !== host) close();
    };

    // Handle click on the generator
    dropdown.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent focus loss on the input
        onGenerate();
        close();
    });

    shadow.appendChild(style);
    shadow.appendChild(dropdown);
    document.body.appendChild(host);

    // Add listener with a slight delay to avoid immediate closing upon creation
    setTimeout(() => document.addEventListener('mousedown', outsideClickHandler), 50);
};