// src/services/SessionService.ts
export class SessionService {
    private static instance: SessionService;
    private vaultKey: CryptoKey | null = null;

    private constructor() {}

    static getInstance(): SessionService {
        if (!SessionService.instance) {
            SessionService.instance = new SessionService();
        }
        return SessionService.instance;
    }

    setKey(key: CryptoKey) {
        this.vaultKey = key;
    }

    getKey(): CryptoKey {
        if (!this.vaultKey) throw new Error("Vault is locked or user not logged in");
        return this.vaultKey;
    }
    
    clear() {
        this.vaultKey = null; // Logging out cleats ram key
    }
}