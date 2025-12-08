import { storageService } from "../services/StorageService";
import { STORAGE_KEYS } from "../constants/constants";
import type { VaultItem } from "../types";
import { addValidation } from "../validation/validate";
import { generateStrongPassword } from "../utils/passGen";

export class AddItem {
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
                    <p class="extensionSub">Add new item</p>
                </div>

                <form class="login-form" id="item-form">
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
                        <span class="btn-text">Save Item</span>
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
        const form = document.getElementById('item-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-btn');
        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;

        // Password generator elements
        const genBtn = document.getElementById('gen-pass-btn');
        const passInput = document.getElementById('password') as HTMLInputElement;
        const rePassInput = document.getElementById('re-pass') as HTMLInputElement;
        const toggleVisBtn = document.getElementById('toggle-pass-visibility');

        // -- Password Generator Button -- //
        if (genBtn) {
            genBtn.addEventListener('click', () => {
                const newPassword = generateStrongPassword();
                
                passInput.value = newPassword;
                rePassInput.value = newPassword;

                // Show generated password to the user
                passInput.type = "text";
                rePassInput.type = "text";
                
                // Animate button for feedback to the user
                const originalText = genBtn.textContent;
                genBtn.textContent = "Generated!";
                setTimeout(() => genBtn.textContent = originalText, 1000);
            });
        }

        // --- Show password logic in manual input ---
        if (toggleVisBtn) {
            toggleVisBtn.addEventListener('click', () => {
                const type = passInput.type === "password" ? "text" : "password";
                passInput.type = type;
                rePassInput.type = type; // keep both password and repeat password fileds synchronised
            });
        }

        // Handle return to vault page(passwords)
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.navigate('/passwords');
            });
        }

        // Handle saving new item
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const url = (document.getElementById('url') as HTMLInputElement).value;
            const username = (document.getElementById('username') as HTMLInputElement).value;
            const password = (document.getElementById('password') as HTMLInputElement).value;
            const rePass = (document.getElementById('re-pass') as HTMLInputElement).value;

            if (password !== rePass) {
                alert("Passwords do not match!");
                return;
            }

            // UI Loading state
            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            }

            try {
                await this.validateItem(url, username, password);

                // Get master key from session data
                const sessionData = await chrome.storage.session.get(STORAGE_KEYS.MASTER);
                const masterPassword = sessionData[STORAGE_KEYS.MASTER] as string;

                if (!masterPassword) {
                    throw new Error("Session expired. Please login again.");
                }

                const newItem: VaultItem = {
                    id: crypto.randomUUID(),
                    url: url,
                    username: username,
                    password: password,
                    createdAt: Date.now()
                };

                // Encrypt and store new item after successful validation
                await storageService.addItem(newItem, masterPassword);

                this.navigate('/passwords');

            } catch (error) {
                console.error(error);
                
                // handle expired sessions
                if ((error as Error).message.includes("Session expired")) {
                    alert((error as Error).message);
                    this.navigate('/login');
                } else {
                    // Show valiadtion or saving errors
                    alert((error as Error).message);
                }
            } finally {
                // Reset loading state
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // Validation function - Runs through regex rules and throws errors if any found
    async validateItem(url: string, username: string, password: string): Promise<void> {
        const validations = addValidation(url, username, password);

        // Using .test for regex validation as it is faster and safer
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
            
            // This error will be caught in afterRender function
            throw new Error(errors.join('\n'));
        }
    }
}