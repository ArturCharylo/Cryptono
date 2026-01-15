import { CRYPTO_KEYS } from "../constants/constants";

export class SessionService {
    private static instance: SessionService;
    private vaultKey: CryptoKey | null = null;
    private readonly STORAGE_KEY = 'vaultKey_JWK';

    private constructor() {}

    static getInstance(): SessionService {
        if (!SessionService.instance) {
            SessionService.instance = new SessionService();
        }
        return SessionService.instance;
    }

    // Get key synchronously (must be loaded/restored first)
    getKey(): CryptoKey {
        if (!this.vaultKey) {
            throw new Error("Vault is locked or session expired");
        }
        return this.vaultKey;
    }

    // Save session: Export CryptoKey -> JWK -> chrome.storage.session
    async saveSession(key: CryptoKey): Promise<void> {
        try {
            // 1. Export key to JSON format (JWK)
            const jwk = await globalThis.crypto.subtle.exportKey("jwk", key);
            
            // 2. Save to browser session storage (survives popup close)
            await chrome.storage.session.set({ [this.STORAGE_KEY]: jwk });
            
            // 3. Set in local memory
            this.vaultKey = key;
        } catch (error) {
            console.error("Failed to save session:", error);
            throw new Error("Could not save session");
        }
    }

    // Restore session: chrome.storage.session -> JWK -> Import CryptoKey
    async restoreSession(): Promise<boolean> {
        // If we already have the key in RAM, no need to do anything
        if (this.vaultKey) return true;

        try {
            // 1. Get JWK from storage
            const data = await chrome.storage.session.get(this.STORAGE_KEY);
            const jwk = data[this.STORAGE_KEY];

            if (!jwk) return false; // No session found

            // 2. Import back to CryptoKey object
            this.vaultKey = await globalThis.crypto.subtle.importKey(
                "jwk",
                jwk,
                { name: CRYPTO_KEYS.ALGO_AES },
                true, // extractable
                ["encrypt", "decrypt"]
            );

            return true;
        } catch (error) {
            console.warn("Failed to restore session (likely expired or corrupted):", error);
            return false;
        }
    }
    
    // Logout
    async clear(): Promise<void> {
        this.vaultKey = null;
        await chrome.storage.session.remove(this.STORAGE_KEY);
    }
}