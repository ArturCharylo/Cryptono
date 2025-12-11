import { storageService } from "../services/StorageService";
import { STORAGE_KEYS } from "../constants/constants";
import type { VaultItem } from "../types";
import { addValidation } from "../validation/validate";
import { generateStrongPassword } from "../utils/passGen";
import { clearField, setErrorMessage, setInputClassError, showToastMessage, ToastType } from '../utils/messages';

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
                        <input type="text" name="url" id="url" placeholder="example.com" class="form-input"/>
                        <div class="input-error" id="url-error"></div>
                    </div>
                    <div class="input-group">
                        <label for="username">Username</label>
                        <input type="text" name="username" id="username" placeholder="Enter your username" class="form-input"/>
                        <div class="input-error" id="username-error"></div>
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
                            />
                            <button 
                                type="button" 
                                id="toggle-pass-visibility" 
                                class="eye-btn" 
                                title="Show/Hide password"
                            >👁️</button>
                        </div>
                        <div class="input-error" id="password-error"></div>
                    </div>

                    <div class="input-group">
                        <label for="re-pass">Repeat Password</label>
                        <input type="password" name="re-pass" id="re-pass" placeholder="Repeat your password" class="form-input"/>
                        <div class="input-error" id="re-pass-error"></div>
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

        // Handle displaying errors for better UX
        const inputList = form.querySelectorAll('.form-input') as NodeListOf<HTMLInputElement>

        for (const input of inputList) {
            input.addEventListener('input', () => {
                setInputClassError(input, false);
                const errorDiv = document.getElementById(`${input.id}-error`);
                if (errorDiv) {
                    clearField(errorDiv);
                }
            });
        }

        // Form elements
        const genBtn = document.getElementById('gen-pass-btn');
        const passInput = document.getElementById('password') as HTMLInputElement;
        const rePassInput = document.getElementById('re-pass') as HTMLInputElement;
        const toggleVisBtn = document.getElementById('toggle-pass-visibility');
        const urlInput = document.getElementById('url') as HTMLInputElement;
        const usernameInput = document.getElementById('username') as HTMLInputElement;

        // Load data for editing
        (async () => {
            try {
                // Get ID and masterPass from session
                const session = await chrome.storage.session.get([STORAGE_KEYS.MASTER, 'editingItemId']);
                const id = session['editingItemId'] as string;
                const masterPass = session[STORAGE_KEYS.MASTER] as string;

                if (!id || !masterPass) {
                     this.navigate('/passwords');
                     return;
                }

                // Get decrypted element
                const item = await storageService.getItemDecrypted(id, masterPass);
                
                // Fill form with data from DB
                urlInput.value = item.url;
                usernameInput.value = item.username;
                passInput.value = item.password;
                rePassInput.value = item.password; 
                
            } catch (error) {
                showToastMessage(((error as Error).message), ToastType.ERROR, 2500);
                this.navigate('/passwords');
            }
        })();

        // Handle Password generator
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

        // Handle showing password
        if (toggleVisBtn) {
            toggleVisBtn.addEventListener('click', () => {
                const type = passInput.type === "password" ? "text" : "password";
                passInput.type = type;
            });
        }

        // Handle canceling
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                chrome.storage.session.remove('editingItemId'); // Clean ID
                this.navigate('/passwords');
            });
        }

        // Handle Save
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Error handling
            let isValid: boolean = true;

            // Form fields
            const url = urlInput.value;
            const username = usernameInput.value;
            const password = passInput.value;
            const rePass = rePassInput.value;

             if (password !== rePass) {
                const rePassInput = inputList.values().find((e) => e.id === "re-pass");
                const errorDiv = document.getElementById(`${rePassInput?.id}-error`);
                if (rePassInput && errorDiv) {
                    setInputClassError(rePassInput, true);
                    clearField(errorDiv);
                    setErrorMessage(errorDiv, 'Passwords do not match');
                }
                return;
            }

            if (!url || !username || !password || !rePass){
            for (const input of inputList) {
                    const errorDiv = document.getElementById(`${input.id}-error`);
                    if (errorDiv) {
                        clearField(errorDiv);
                        if (!input.value) {
                            setInputClassError(input, true);
                            setErrorMessage(errorDiv, 'This field is required');
                        } 
                    }
                }
                isValid = false;
            }

            if (!isValid) {
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
                    id: id, // Keep old ID
                    url: url,
                    username: username,
                    password: password,
                    createdAt: Date.now() // Updated date
                };

                await storageService.updateItem(updatedItem, masterPassword);

                // Clear edit ID and return
                await chrome.storage.session.remove('editingItemId');
                this.navigate('/passwords');

            } catch (error) {
                if ((error as Error).message.includes("Session expired")) {
                    showToastMessage(((error as Error).message), ToastType.ERROR, 2500);
                    this.navigate('/login');
                }else if (error instanceof Error) {
                    showToastMessage(error.message, ToastType.ERROR, error.message.length > 50 ? 6000 : 2500);
                } else {
                    showToastMessage('An unexpected error occurred.', ToastType.ERROR, 2500);
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