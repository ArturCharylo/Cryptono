import { loginValidation } from '../validation/validate';
import { userRepository } from '../repositories/UserRepository';
import { clearField, setErrorMessage, setInputClassError, showToastMessage, ToastType } from '../utils/messages';
import { SessionService } from '../services/SessionService';

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

                <div id="pin-section" class="hidden">
                    <form id="pin-form" class="login-form">
                        <div class="input-group">
                            <label for="pin-code">Quick Access PIN</label>
                            <input type="password" id="pin-code" class="form-input" placeholder="Enter PIN code" inputmode="numeric" />
                            <div class="input-error" id="pin-error"></div>
                        </div>
                        
                        <button type="submit" class="login-btn" id="pin-submit-btn">
                            <span class="btn-text">Unlock with PIN</span>
                            <div class="btn-loader hidden">
                                <div class="spinner"></div>
                            </div>
                        </button>
                    </form>
                    <div class="auth-switch-wrapper">
                        <a href="#" id="switch-to-pass" class="security-note-link small-text">Or log in with Master Password</a>
                    </div>
                </div>

                <div id="password-section">
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

                        <button type="submit" class="login-btn" id="pass-submit-btn">
                            <span class="btn-text">Unlock Vault</span>
                            <div class="btn-loader hidden">
                                <div class="spinner"></div>
                            </div>
                        </button>
                    </form>

                    <div id="pin-switch-container" class="auth-switch-wrapper hidden">
                        <a href="#" id="switch-to-pin" class="security-note-link small-text">Log in with PIN</a>
                    </div>
                </div>

                <div class="footer">
                    <p class="security-note">🔐 Encrypted & Secure</p>
                    <p class="security-note">
                        Don't have an account? <a href="#" id="go-to-register" class="security-note-link">Register</a>
                    </p>
                </div>
            </div>
        `;
    }

    async afterRender() {
        const sessionService = SessionService.getInstance();
        
        // Sections
        const pinSection = document.getElementById('pin-section');
        const passwordSection = document.getElementById('password-section');
        const pinSwitchContainer = document.getElementById('pin-switch-container');
        
        // Forms & Buttons
        const loginForm = document.getElementById('login-form') as HTMLFormElement;
        const pinForm = document.getElementById('pin-form') as HTMLFormElement;
        
        const passSubmitBtn = document.getElementById('pass-submit-btn') as HTMLButtonElement;
        const pinSubmitBtn = document.getElementById('pin-submit-btn') as HTMLButtonElement;
        
        const registerLink = document.getElementById('go-to-register');
        const inputList = document.querySelectorAll('.form-input') as NodeListOf<HTMLInputElement>;

        // Switch Links
        const switchToPassBtn = document.getElementById('switch-to-pass');
        const switchToPinBtn = document.getElementById('switch-to-pin');

        // --- PIN DETECTION LOGIC ---
        // Check if PIN is configured and show appropriate screen
        const hasPin = await sessionService.hasPinConfigured();

        if (hasPin && pinSection && passwordSection) {
            // Show PIN screen by default if configured (using classes)
            pinSection.classList.remove('hidden');
            passwordSection.classList.add('hidden');
            
            // Allow switching back to PIN from Password screen
            if (pinSwitchContainer) pinSwitchContainer.classList.remove('hidden');
            
            // Focus PIN input
            setTimeout(() => document.getElementById('pin-code')?.focus(), 100);
        }

        // --- NAVIGATION LISTENERS ---
        
        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate('/register');
            });
        }

        if (switchToPassBtn && pinSection && passwordSection) {
            switchToPassBtn.addEventListener('click', (e) => {
                e.preventDefault();
                pinSection.classList.add('hidden');
                passwordSection.classList.remove('hidden');
                document.getElementById('username')?.focus();
            });
        }

        if (switchToPinBtn && pinSection && passwordSection) {
            switchToPinBtn.addEventListener('click', (e) => {
                e.preventDefault();
                passwordSection.classList.add('hidden');
                pinSection.classList.remove('hidden');
                document.getElementById('pin-code')?.focus();
            });
        }

        // Clear errors on input
        for (const input of inputList) {
            input.addEventListener('input', () => {
                setInputClassError(input, false);
                const errorDiv = document.getElementById(`${input.id}-error`);
                if (errorDiv) {
                    clearField(errorDiv);
                }
            });
        }

        // --- PIN FORM SUBMISSION ---
        
        pinForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pinInput = document.getElementById('pin-code') as HTMLInputElement;
            const pinError = document.getElementById('pin-error');
            const pinValue = pinInput.value;
            const loader = pinSubmitBtn?.querySelector('.btn-loader');

            if (!pinValue) {
                if (pinError) setErrorMessage(pinError, 'Enter PIN');
                setInputClassError(pinInput, true);
                return;
            }

            if (pinSubmitBtn) {
                pinSubmitBtn.classList.add('loading');
                pinSubmitBtn.disabled = true;
                loader?.classList.remove('hidden'); // Show loader via class
            }

            try {
                // Attempt login with PIN
                const success = await sessionService.loginWithPin(pinValue);
                
                if (success) {
                    this.navigate('/passwords');
                } else {
                    if (pinError) setErrorMessage(pinError, 'Incorrect PIN');
                    setInputClassError(pinInput, true);
                    pinInput.value = ''; // Clear incorrect PIN
                    
                    // Simple shake animation effect (Web Animation API is fine in TS)
                    pinInput.animate([
                        { transform: 'translateX(0)' },
                        { transform: 'translateX(-10px)' },
                        { transform: 'translateX(10px)' },
                        { transform: 'translateX(0)' }
                    ], { duration: 300 });
                }
            } catch (error) {
                console.error(error);
                showToastMessage('Error verifying PIN', ToastType.ERROR, 2000);
            } finally {
                if (pinSubmitBtn) {
                    pinSubmitBtn.classList.remove('loading');
                    pinSubmitBtn.disabled = false;
                    loader?.classList.add('hidden'); // Hide loader via class
                }
            }
        });

        // --- MASTER PASSWORD FORM SUBMISSION ---

        loginForm?.addEventListener('submit', async (event: Event) => {
            event.preventDefault();

            let isValid = true;
            const loader = passSubmitBtn?.querySelector('.btn-loader');

            const formData = new FormData(loginForm);
            const username = formData.get('username') as string;
            const password = formData.get('password') as string;

            if (!username || !password) {
                for (const input of inputList) {
                    // Skip PIN input validation in this loop
                    if (input.id === 'pin-code') continue;

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
            if (passSubmitBtn) {
                passSubmitBtn.classList.add('loading');
                passSubmitBtn.disabled = true;
                loader?.classList.remove('hidden');
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
                if (passSubmitBtn) {
                    passSubmitBtn.classList.remove('loading');
                    passSubmitBtn.disabled = false;
                    loader?.classList.add('hidden');
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
            await userRepository.Login(username, password);
        } catch (err) {
            console.error("Login attempt failed:", err);
            throw new Error('Invalid credentials'); 
        }
    }
}