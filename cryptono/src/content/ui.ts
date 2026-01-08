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