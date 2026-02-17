import { CRYPTO_KEYS, STORAGE_KEYS } from "../constants/constants";
import { base64ToBuff, buffToBase64 } from "../utils/buffer";
import { cryptoService } from "./CryptoService";
import type { TrustedDeviceData } from "../types";

export class SessionService {
    private static instance: SessionService;
    private vaultKey: CryptoKey | null = null;
    private readonly STORAGE_KEY = STORAGE_KEYS.SESSION_STORAGE_KEY;

    // Helper key for tracking last active user (needed for multi-user support)
    private readonly LAST_USER_KEY = 'last_active_user_id';

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

    /**
     * Helper to get the storage key specific to a user
     */
    private getPinStorageKey(userId: string): string {
        return `${STORAGE_KEYS.TRUSTED_DEVICE_KEY}_${userId}`;
    }

    /**
     * Sets the Last Active User ID so we know which PIN to check on next boot
     */
    setLastActiveUser(userId: string): void {
        localStorage.setItem(this.LAST_USER_KEY, userId);
    }
    
    getLastActiveUser(): string | null {
        return localStorage.getItem(this.LAST_USER_KEY);
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

    /**
     * Enables PIN for a SPECIFIC user.
     * We need userId here to save it under unique key.
     */
    async enablePinUnlock(pin: string, userId: string): Promise<void> {
        const vaultKey = this.getKey();
        const pinSalt = cryptoService.generateSalt();
        const pinKey = await cryptoService.derivePinKey(pin, pinSalt);

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const wrappedKeyBuffer = await globalThis.crypto.subtle.wrapKey(
            "raw", vaultKey, pinKey, { name: CRYPTO_KEYS.ALGO_AES, iv: iv }
        );

        const storageData: TrustedDeviceData = {
            salt: buffToBase64(pinSalt),
            iv: buffToBase64(iv), 
            ciphertext: buffToBase64(wrappedKeyBuffer)
        };
        
        // Zapisz pod kluczem specyficznym dla użytkownika
        await chrome.storage.local.set({
            [this.getPinStorageKey(userId)]: storageData
        });
        
        // Ustaw tego użytkownika jako ostatnio aktywnego
        this.setLastActiveUser(userId);
    }

    /**
     * Disable PIN for current/last user
     */
    async disablePinUnlock(): Promise<void> {
        const lastUser = this.getLastActiveUser();
        if (lastUser) {
            await chrome.storage.local.remove(this.getPinStorageKey(lastUser));
        }
    }

    /**
     * Try to login using PIN for the LAST ACTIVE USER
     */
    async loginWithPin(pin: string): Promise<boolean> {
        const lastUserId = this.getLastActiveUser();
        if (!lastUserId) return false;

        const storageKey = this.getPinStorageKey(lastUserId);
        const stored = await chrome.storage.local.get(storageKey);
        
        const data = stored[storageKey] as TrustedDeviceData | undefined;
        if (!data) return false;

        try {
            const salt = base64ToBuff(data.salt);
            const iv = base64ToBuff(data.iv);
            const ciphertext = base64ToBuff(data.ciphertext);
            const pinKey = await cryptoService.derivePinKey(pin, salt);

            this.vaultKey = await globalThis.crypto.subtle.unwrapKey(
                "raw", ciphertext, pinKey,
                { name: CRYPTO_KEYS.ALGO_AES, iv: iv },
                { name: CRYPTO_KEYS.ALGO_AES },
                true, ["encrypt", "decrypt"]
            );

            await this.saveSession(this.vaultKey);
            return true;
        } catch (e) {
            console.error("Wrong PIN or Corrupted Data", e);
            return false;
        }
    }
    
    /**
     * Checks if the LAST ACTIVE USER has a PIN configured
     */
    async hasPinConfigured(): Promise<boolean> {
        const lastUserId = this.getLastActiveUser();
        if (!lastUserId) return false;

        const storageKey = this.getPinStorageKey(lastUserId);
        const stored = await chrome.storage.local.get(storageKey);
        return !!stored[storageKey];
    }
    
    // Logout
    async clear(): Promise<void> {
        this.vaultKey = null;
        await chrome.storage.session.remove(this.STORAGE_KEY);
    }
}