import { base64Url } from '../utils/buffer';
class CookieService {

    // Ustawienie cookie
    setCookie(username: string) {
        // 1. Create JWT Token
        // IN future use libraries like jsrsasign or jose for proper JWT creation and signing
        const header = { alg: "HS256", typ: "JWT" };
        const payload = { 
            sub: username, 
            iat: Date.now(), 
            exp: Date.now() + (60 * 60 * 1000) // 1 hour
        };
        
        // Simulated signature
        const secret = "TWOJ_SEKRETNY_KLUCZ_APLIKACJI"; 
        const signature = btoa(secret); 
        
        const token = `${base64Url(header)}.${base64Url(payload)}.${signature}`;

        // 2. COOKIE SETTINGS
        // max-age=3600 (sekundy) -> 1 hour
        // path=/ -> available on entire site
        // SameSite=Strict -> CSRF protectios
        // Secure -> Require Https
        document.cookie = `authToken=${token}; path=/; max-age=3600; SameSite=Strict; Secure`;

        return token;
    }


    getCookie(name: string): string | null {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            // Clear leading spaces
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            // Verify cookie
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    async checkAuthStatus() {
        const token = this.getCookie("authToken");

        if (token) {
            console.log("Użytkownik zalogowany. Token:", token);
            
            // Check expiration date
            try {
                const payloadBase64 = token.split('.')[1];
                const payload = JSON.parse(atob(payloadBase64));
                
                if (payload.exp < Date.now()) {
                    console.warn("Token wygasł!");
                } else {
                    console.log("Witaj ponownie:", payload.sub);
                }
            } catch (e) {
                console.error("Nieprawidłowy token");
            }

        } else {
            console.log("Brak tokena - przekieruj do logowania");
        }
    }
}

export const cookieService = new CookieService();