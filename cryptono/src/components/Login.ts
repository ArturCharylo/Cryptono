import { loginValidation } from '../validation/validate';
import { storageService } from '../services/StorageService';
import { clearField, setErrorMessage, setInputClassError, showToastMessage, ToastType } from '../utils/messages';

export class Login {
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
                    <p class="extensionSub">Your vault, secured</p>
                </div>

                <form class="login-form" id="login-form" name="login-form">
                    <div class="input-group">
                        <label for="username">Username</label>
                        <input type="text" placeholder="Enter your username" id="username" name="username" class="form-input"/>
                        <div class="input-error" id="username-error"></div>
                    </div>

                    <div class="input-group">
                        <label for="password">Password</label>
                        <input type="password" placeholder="Enter your password" id="password" name="password" class="form-input"/>
                        <div class="input-error" id="password-error"></div>
                    </div>

                    <button type="submit" class="login-btn">
                        <span class="btn-text">Unlock Vault</span>
                        <div class="btn-loader" style="display: none;">
                            <div class="spinner"></div>
                        </div>
                    </button>
                </form>

                <div class="footer">
                    <p class="security-note">🔐 Encrypted & Secure</p>
                    <p class="security-note">
                        Don't have an account? <a href="#" id="go-to-register" class="security-note-link">Register</a>
                    </p>
                </div>
            </div>
        `;
    }

    afterRender() {
        const loginForm = document.getElementById('login-form') as HTMLFormElement;
        const loginBtn = document.querySelector('.login-btn') as HTMLButtonElement;
        const registerLink = document.getElementById('go-to-register');
        const inputList = document.querySelectorAll('.form-input') as NodeListOf<HTMLInputElement>;

        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate('/register');
            });
        }

        for (const input of inputList) {
            input.addEventListener('input', () => {
                setInputClassError(input, false);
                const errorDiv = document.getElementById(`${input.id}-error`);
                if (errorDiv) {
                    clearField(errorDiv);
                }
            });
        }

        loginForm?.addEventListener('submit', async (event: Event) => {
            event.preventDefault();

            let isValid = true;

            const formData = new FormData(loginForm);
            const username = formData.get('username') as string;
            const password = formData.get('password') as string;

            if (!username || !password) {
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
            
            // Set loading state
            if (loginBtn) {
                loginBtn.classList.add('loading');
                loginBtn.disabled = true;
            }

            try {
                await this.authenticate(username, password);

                this.navigate('/passwords');
            } catch (error) {
                // Catch error and display to user
                if (error instanceof Error) {
                    showToastMessage(error.message, ToastType.ERROR, error.message.length > 50 ? 6000 : 2500);
                } else {
                    showToastMessage('An unexpected error occurred.', ToastType.ERROR, 2500);
                }
            } finally {
                // Reset loading state
                if (loginBtn) {
                    loginBtn.classList.remove('loading');
                    loginBtn.disabled = false;
                }
            }
        });
    }

    // This function only handles validation -> Pass or error
   async authenticate(username: string, password: string): Promise<void> {
        const validations = loginValidation(username, password);

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

        // Login
        try {
            await storageService.Login(username, password);
        } catch (err) {
            // Log error to console, which allows usto avoid warnings for only throw new Error in catch
            console.error("Login attempt failed:", err);
            
            // Change error message to be more generic
            throw new Error('Invalid credentials'); 
        }
    }
}