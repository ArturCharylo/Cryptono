import { storageService } from "../services/StorageService";
import { STORAGE_KEYS } from "../constants/constants";
import type { VaultItem } from "../types";
import { addValidation } from "../validation/validate";

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
                        <label for="password">Password</label>
                        <input type="password" name="password" id="password" placeholder="Str0ng_P@Ssword" class="form-input" required/>
                    </div>
                    <div class="input-group">
                        <label for="re-pass">Repeat Password</label>
                        <input type="password" name="re-pass" id="re-pass" placeholder="Repeat your password" class="form-input" required/>
                    </div>

                    <button type="submit" class="login-btn register-btn">
                        <span class="btn-text">Save Item</span>
                        <div class="btn-loader" style="display: none;">
                            <div class="spinner"></div>
                        </div>
                    </button>
                    
                    <button type="button" id="cancel-btn" class="login-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); margin-top: 10px;">
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

        // Handle return to valut page(passwords)
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
            const isValid: boolean = await this.authenticate(url, username, password);

            if (isValid) {
                this.navigate('/passwords');
            } else {
                alert('Invalid credentials');
            }

            // UI Loading state
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;

            try {
                // Get master from session which is required for encryption
                const sessionData = await chrome.storage.session.get(STORAGE_KEYS.MASTER);
                const masterPassword = sessionData[STORAGE_KEYS.MASTER] as string;

                if (!masterPassword) {
                    alert("Session expired. Please login again.");
                    this.navigate('/login');
                    return;
                }

                // Create Object which will be passed to StorageService and encrypted
                const newItem: VaultItem = {
                    id: crypto.randomUUID(),
                    url: url,
                    username: username,
                    password: password,
                    createdAt: Date.now()
                };

                // Send to StorageService which will encrypt and store in DB
                await storageService.addItem(newItem, masterPassword);

                // Navigate back to vault on success
                this.navigate('/passwords');

            } catch (error) {
                console.error(error);
                alert("Failed to save item: " + (error as Error).message);
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        });
    }

        async authenticate(url: string, username: string, password: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (addValidation(url,username, password).every(v => v.value.match(v.regex))){
                resolve(true)
            }
            else{
                addValidation(url, username, password).forEach(v => {
                    if (!v.value.match(v.regex)){
                        alert(v.message);
                    }
                });
                resolve(false);
            }
        });
    }
}