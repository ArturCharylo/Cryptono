import { CRYPTO_KEYS, STORAGE_KEYS } from "../constants/constants";
import { base64ToBuff, buffToBase64 } from "../utils/buffer";
import { cryptoService } from "./CryptoService";
import type { TrustedDeviceData } from "../types";

export class SessionService {
    private static instance: SessionService;
    private vaultKey: CryptoKey | null = null;
    private readonly STORAGE_KEY = STORAGE_KEYS.SESSION_STORAGE_KEY;

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

    async enablePinUnlock(pin: string): Promise<void> {
        const vaultKey = this.getKey();
        const pinSalt = cryptoService.generateSalt();
        
        const pinKey = await cryptoService.derivePinKey(pin, pinSalt);

        // Generate IV specifically for the wrapping operation
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const wrappedKeyBuffer = await globalThis.crypto.subtle.wrapKey(
            "raw",
            vaultKey,
            pinKey,
            { name: CRYPTO_KEYS.ALGO_AES, iv: iv }
        );

        // Prepare the data object strictly typed
        const storageData: TrustedDeviceData = {
            salt: buffToBase64(pinSalt),
            iv: buffToBase64(iv), 
            ciphertext: buffToBase64(wrappedKeyBuffer)
        };
        
        await chrome.storage.local.set({
            [STORAGE_KEYS.TRUSTED_DEVICE_KEY]: storageData
        });
    }

    // Nowa metoda: Zaloguj PINem
    async loginWithPin(pin: string): Promise<boolean> {
        // 1. Pobierz blob z storage.local
        const stored = await chrome.storage.local.get(STORAGE_KEYS.TRUSTED_DEVICE_KEY);
        
        // Cast the result to the interface to satisfy TypeScript
        const data = stored[STORAGE_KEYS.TRUSTED_DEVICE_KEY] as TrustedDeviceData | undefined;
        
        if (!data) return false;

        try {
            const salt = base64ToBuff(data.salt);
            const iv = base64ToBuff(data.iv);
            const ciphertext = base64ToBuff(data.ciphertext);

            // 2. Odtwórz klucz PINu
            const pinKey = await cryptoService.derivePinKey(pin, salt);

            // 3. Odwiń (Unwrap) VaultKey
            this.vaultKey = await globalThis.crypto.subtle.unwrapKey(
                "raw",
                ciphertext,
                pinKey,
                { name: CRYPTO_KEYS.ALGO_AES, iv: iv },
                { name: CRYPTO_KEYS.ALGO_AES },
                true,
                ["encrypt", "decrypt"]
            );

            // 4. Sukces! Zapisz odzyskany klucz do sesji tymczasowej (żeby działał jak normalne logowanie)
            await this.saveSession(this.vaultKey);
            
            return true;
        } catch (e) {
            console.error("Błędny PIN", e);
            return false;
        }
    }
    
    // Metoda sprawdzająca czy urządzenie jest "Zaufane" (czy ma ustawiony PIN)
    async hasPinConfigured(): Promise<boolean> {
        const stored = await chrome.storage.local.get(STORAGE_KEYS.TRUSTED_DEVICE_KEY);
        return !!stored[STORAGE_KEYS.TRUSTED_DEVICE_KEY];
    }
    
    // Logout
    async clear(): Promise<void> {
        this.vaultKey = null;
        await chrome.storage.session.remove(this.STORAGE_KEY);
        await chrome.storage.local.remove(STORAGE_KEYS.TRUSTED_DEVICE_KEY);
    }
}