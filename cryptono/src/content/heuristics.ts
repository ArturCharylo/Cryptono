// Słownik znanych skrótów używanych w starym HTML (np. RoboForm)
const ALIAS_MAP: Record<string, string[]> = {
    'firstname': ['fname', 'frstname', 'first', 'givenname'],
    'lastname': ['lname', 'lstname', 'last', 'surname', 'familyname'],
    'middleinitial': ['middle', 'middlei', 'mid'],
    'addressline1': ['address1', 'addr1', 'adrs1', 'address', 'street'],
    'addressline2': ['address2', 'addr2', 'adrs2', 'apt', 'suite'],
    'zip': ['postal', 'zipcode', 'postalcode'],
    'phone': ['tel', 'mobile', 'cell'],
    'email': ['mail', 'e-mail']
};

/**
 * Czyści tekst:
 * 1. Zamienia na małe litery.
 * 2. Usuwa CYFRY z początku ciągu (np. "02frstname" -> "frstname").
 * 3. Usuwa znaki specjalne.
 */
const normalizeString = (str: string): string => {
    let clean = str.toLowerCase();
    // Usuń prefiksy cyfrowe często używane w tabelach (np. 01name, 02address)
    clean = clean.replace(/^\d+/, ''); 
    // Usuń wszystko co nie jest literą lub cyfrą
    return clean.replace(/[^a-z0-9]/g, '');
};

/**
 * Oblicza odległość Levenshteina (ile zmian znaków trzeba, by zamienić a w b).
 * Używane do wykrywania literówek i skrótów (np. "frstname" vs "firstname").
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

export function getFieldLabel(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
    // 1. Explicit <label for="id">
    if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label && label.textContent) return label.textContent.trim();
    }

    // 2. Parent <label> wrapper
    const parentLabel = input.closest('label');
    if (parentLabel && parentLabel.firstChild) {
        const clone = parentLabel.cloneNode(true) as HTMLElement;
        const children = clone.querySelectorAll('input, select, textarea, button');
        children.forEach(c => c.remove());
        return (clone.textContent || '').trim();
    }

    // 3. Aria attributes
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // 4. Placeholder
    if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        if (input.placeholder) return input.placeholder;
    }

    return ''; // Nie zwracamy name/id tutaj, to robimy w score
}

export function calculateFieldScore(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, vaultFieldName: string): number {
    
    // Normalizacja nazw z sejfu i ze strony
    const vName = normalizeString(vaultFieldName); // "First Name" -> "firstname"
    const iName = normalizeString(input.name || ''); // "02frstname" -> "frstname"
    const iId = normalizeString(input.id || '');
    const iLabel = normalizeString(getFieldLabel(input));

    // Zbieramy kandydatów ze strony (name, id, label)
    const pageCandidates = [iName, iId, iLabel].filter(s => s.length > 0);

    // --- 1. EXACT MATCH (100 pkt) ---
    if (pageCandidates.includes(vName)) return 100;

    // --- 2. ALIAS MATCH (90 pkt) ---
    // Sprawdzamy czy vName ma znane aliasy (np. firstname -> fname)
    if (ALIAS_MAP[vName]) {
        for (const candidate of pageCandidates) {
            if (ALIAS_MAP[vName].includes(candidate)) return 90;
        }
    }

    // --- 3. CONTAINMENT MATCH (60 pkt) ---
    // Czy "firstname" zawiera się w "customer_firstname"
    for (const candidate of pageCandidates) {
        if (candidate.includes(vName) || vName.includes(candidate)) {
            // Unikaj fałszywych dopasowań krótkich słów (np. "id" w "mid")
            if (Math.min(candidate.length, vName.length) > 3) return 60;
        }
    }

    // --- 4. FUZZY MATCH (Levenshtein) (40-80 pkt) ---
    // To jest kluczowe dla "frstname" vs "firstname"
    let bestDist = 100;
    for (const candidate of pageCandidates) {
        const dist = levenshteinDistance(vName, candidate);
        if (dist < bestDist) bestDist = dist;
    }

    // Pozwalamy na błąd w wysokości 20% długości słowa lub max 2 znaki
    const allowedErrors = Math.floor(vName.length * 0.3) || 1; 

    if (bestDist <= allowedErrors) {
        // Im mniejszy dystans, tym wyższy wynik
        return 80 - (bestDist * 10);
    }

    return 0;
}

export function scoreUsernameInput(input: HTMLInputElement): number {
    let score = 0;
    const name = normalizeString(input.name || '');
    const id = normalizeString(input.id || '');
    const type = (input.type || '').toLowerCase();
    const autocomplete = (input.autocomplete || '').toLowerCase();

    if (autocomplete === 'username' || autocomplete === 'email') score += 100;
    
    if (['username', 'login', 'email', 'userid', 'user'].includes(name)) score += 50;
    if (['username', 'login', 'email', 'userid', 'user'].includes(id)) score += 50;
    
    if (type === 'email') score += 40;

    if (name.includes('user') || name.includes('login')) score += 20;
    
    if (input.type === 'hidden' || input.style.display === 'none' || input.style.visibility === 'hidden') return -1;
    
    return score;
}