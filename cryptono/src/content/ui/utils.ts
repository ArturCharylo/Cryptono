// Safe ID generator fallback for non-secure HTTP contexts
export const generateId = () => {
    return (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Inject global styles to avoid inline styling
export const injectGlobalStyles = () => {
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