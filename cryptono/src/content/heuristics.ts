export function getFieldLabel(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
    if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label && label.textContent) return label.textContent.trim();
    }
    const parentLabel = input.closest('label');
    if (parentLabel && parentLabel.firstChild) {
        const clone = parentLabel.cloneNode(true) as HTMLElement;
        const children = clone.querySelectorAll('input, select, textarea');
        children.forEach(c => c.remove());
        return (clone.textContent || '').trim();
    }
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    if (input instanceof HTMLInputElement && input.placeholder) return input.placeholder;
    return input.name || input.id || '';
}

export function scoreUsernameInput(input: HTMLInputElement): number {
    let score = 0;
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const type = (input.type || '').toLowerCase();
    const autocomplete = (input.autocomplete || '').toLowerCase();

    if (autocomplete === 'username' || autocomplete === 'email') score += 100;
    if (name === 'username' || name === 'login' || name === 'email') score += 50;
    if (id === 'username' || id === 'login' || id === 'email') score += 50;
    if (type === 'email') score += 40;
    if (name === 'userid' || id === 'userid') score += 45;

    if (name.includes('user') || name.includes('login') || name.includes('mail')) score += 20;
    
    if (input.type === 'hidden' || input.style.display === 'none' || input.style.visibility === 'hidden') return -1;
    return score;
}