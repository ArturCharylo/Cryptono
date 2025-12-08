import { storageService } from "../services/StorageService";
import { STORAGE_KEYS } from "../constants/constants";
import type { VaultItem } from "../types";
import { addValidation } from "../validation/validate";
import { generateStrongPassword } from "../utils/passGen";

export class EditItem {
    navigate: (path: string) => void;

    constructor(navigate: (path: string) => void) {
        this.navigate = navigate;
    }

    render() {
        return `
            <div class="container">
                <div class="header">
                    <div class="logo">
                        <div class="logo-icon">🔒</div>
                        <h1 class="extensionTitle">Cryptono</h1>
                    </div>
                    <p class="extensionSub">Edit item</p>
                </div>

                <form class="login-form" id="edit-form">
                    <div class="input-group">
                        <label for="url">URL</label>
                        <input type="text" name="url" id="url" placeholder="example.com" class="form-input" required/>
                    </div>
                    <div class="input-group">
                        <label for="username">Username</label>
                        <input type="text" name="username" id="username" placeholder="Enter your username" class="form-input" required/>
                    </div>
                    
                    <div class="input-group">
                        <div class="label-row">
                            <label for="password">Password</label>
                            <button type="button" id="gen-pass-btn" class="gen-btn">🎲 Generate</button>
                        </div>
                        
                        <div class="password-wrapper-input">
                            <input 
                                type="password" 
                                name="password" 
                                id="password" 
                                placeholder="Str0ng_P@Ssword" 
                                class="form-input form-input-with-icon" 
                                required
                            />
                            <button 
                                type="button" 
                                id="toggle-pass-visibility" 
                                class="eye-btn" 
                                title="Show/Hide password"
                            >👁️</button>
                        </div>
                    </div>

                    <div class="input-group">
                        <label for="re-pass">Repeat Password</label>
                        <input type="password" name="re-pass" id="re-pass" placeholder="Repeat your password" class="form-input" required/>
                    </div>

                    <button type="submit" class="login-btn save-btn">
                        <span class="btn-text">Save Changes</span>
                        <div class="btn-loader" style="display: none;">
                            <div class="spinner"></div>
                        </div>
                    </button>
                    
                    <button type="button" id="cancel-btn" class="login-btn cancel-btn">
                        Cancel
                    </button>
                </form>

                <div class="footer">
                    <p class="security-note">🔐 Encrypted & Secure</p>
                </div>
            </div>
        `;
    }

    afterRender() {
        const form = document.getElementById('edit-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-btn');
        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;

        const genBtn = document.getElementById('gen-pass-btn');
        const passInput = document.getElementById('password') as HTMLInputElement;
        const rePassInput = document.getElementById('re-pass') as HTMLInputElement;
        const toggleVisBtn = document.getElementById('toggle-pass-visibility');
        const urlInput = document.getElementById('url') as HTMLInputElement;
        const usernameInput = document.getElementById('username') as HTMLInputElement;

        // 1. Ładowanie danych do edycji
        (async () => {
            try {
                // Pobieramy ID i hasło główne z sesji
                const session = await chrome.storage.session.get([STORAGE_KEYS.MASTER, 'editingItemId']);
                const id = session['editingItemId'] as string;
                const masterPass = session[STORAGE_KEYS.MASTER] as string;

                if (!id || !masterPass) {
                     this.navigate('/passwords');
                     return;
                }

                // Pobieramy odszyfrowany element
                const item = await storageService.getItemDecrypted(id, masterPass);
                
                // Wypełniamy formularz
                urlInput.value = item.url;
                usernameInput.value = item.username;
                passInput.value = item.password;
                rePassInput.value = item.password; 
                
            } catch (e) {
                console.error(e);
                alert("Error loading item data.");
                this.navigate('/passwords');
            }
        })();

        // 2. Obsługa Generatora Haseł
        if (genBtn) {
            genBtn.addEventListener('click', () => {
                const newPassword = generateStrongPassword();
                passInput.value = newPassword;
                rePassInput.value = newPassword;
                passInput.type = "text";
                rePassInput.type = "text";
                
                const originalText = genBtn.textContent;
                genBtn.textContent = "Generated!";
                setTimeout(() => genBtn.textContent = originalText, 1000);
            });
        }

        // 3. Obsługa Pokazywania Hasła
        if (toggleVisBtn) {
            toggleVisBtn.addEventListener('click', () => {
                const type = passInput.type === "password" ? "text" : "password";
                passInput.type = type;
            });
        }

        // 4. Obsługa Anulowania
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                chrome.storage.session.remove('editingItemId'); // Sprzątamy ID
                this.navigate('/passwords');
            });
        }

        // 5. Zapis (Aktualizacja)
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const url = urlInput.value;
            const username = usernameInput.value;
            const password = passInput.value;
            const rePass = rePassInput.value;

            if (password !== rePass) {
                alert("Passwords do not match!");
                return;
            }

            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            }

            try {
                await this.validateItem(url, username, password);

                const sessionData = await chrome.storage.session.get([STORAGE_KEYS.MASTER, 'editingItemId']);
                const masterPassword = sessionData[STORAGE_KEYS.MASTER] as string;
                const id = sessionData['editingItemId'] as string;

                if (!masterPassword || !id) {
                    throw new Error("Session expired. Please login again.");
                }

                const updatedItem: VaultItem = {
                    id: id, // Zachowujemy stare ID
                    url: url,
                    username: username,
                    password: password,
                    createdAt: Date.now() // Można zaktualizować datę modyfikacji
                };

                await storageService.updateItem(updatedItem, masterPassword);

                // Czyścimy ID edycji i wracamy
                await chrome.storage.session.remove('editingItemId');
                this.navigate('/passwords');

            } catch (error) {
                console.error(error);
                if ((error as Error).message.includes("Session expired")) {
                    alert((error as Error).message);
                    this.navigate('/login');
                } else {
                    alert((error as Error).message);
                }
            } finally {
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }
            }
        });
    }

    async validateItem(url: string, username: string, password: string): Promise<void> {
        const validations = addValidation(url, username, password);
        const allValid = validations.every(v => {
            const regexObj = v.regex instanceof RegExp ? v.regex : new RegExp(v.regex);
            return regexObj.test(v.value);
        });

        if (!allValid) {
            const errors = validations
                .filter(v => {
                    const regexObj = v.regex instanceof RegExp ? v.regex : new RegExp(v.regex);
                    return !regexObj.test(v.value);
                })
                .map(v => v.message);
            throw new Error(errors.join('\n'));
        }
    }
}