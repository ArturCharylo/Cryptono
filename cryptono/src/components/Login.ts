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
                        <div class="input-group" style="align-items: center;">
                            <label for="pin-digit-0" style="margin-bottom: 15px;">Enter Quick Access PIN</label>
                            
                            <div class="pin-input-container">
                                <input type="text" class="pin-digit" maxlength="1" inputmode="numeric" autocomplete="off" data-index="0" id="pin-digit-0" />
                                <input type="text" class="pin-digit" maxlength="1" inputmode="numeric" autocomplete="off" data-index="1" />
                                <input type="text" class="pin-digit" maxlength="1" inputmode="numeric" autocomplete="off" data-index="2" />
                                <input type="text" class="pin-digit" maxlength="1" inputmode="numeric" autocomplete="off" data-index="3" />
                            </div>

                            <div class="input-error" id="pin-error"></div>
                        </div>
                        
                        <button type="submit" class="hidden" id="pin-submit-trigger"></button>
                    </form>
                    
                    <div class="auth-switch-wrapper">
                         <div id="pin-loading" class="hidden" style="margin-bottom: 10px;">
                            <div class="spinner" style="margin: 0 auto;"></div>
                        </div>
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
        const pinForm = document.getElementById('pin-form') as HTMLFormElement; // Added for safety check
        
        const passSubmitBtn = document.getElementById('pass-submit-btn') as HTMLButtonElement;
        
        const registerLink = document.getElementById('go-to-register');
        const inputList = document.querySelectorAll('.form-input') as NodeListOf<HTMLInputElement>;

        // PIN Specific Elements
        const pinInputs = document.querySelectorAll('.pin-digit') as NodeListOf<HTMLInputElement>;
        const pinError = document.getElementById('pin-error');
        const pinLoading = document.getElementById('pin-loading');

        // Switch Links
        const switchToPassBtn = document.getElementById('switch-to-pass');
        const switchToPinBtn = document.getElementById('switch-to-pin');

        // --- PIN DETECTION LOGIC ---
        // Check if PIN is configured and show appropriate screen
        const hasPin = await sessionService.hasPinConfigured();

        if (hasPin && pinSection && passwordSection) {
            // Show PIN screen by default if configured
            pinSection.classList.remove('hidden');
            passwordSection.classList.add('hidden');
            
            // Allow switching back to PIN from Password screen
            if (pinSwitchContainer) pinSwitchContainer.classList.remove('hidden');
            
            // Focus first PIN input
            setTimeout(() => pinInputs[0]?.focus(), 100);
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
                pinInputs[0]?.focus();
            });
        }

        // Clear errors on standard inputs
        for (const input of inputList) {
            input.addEventListener('input', () => {
                setInputClassError(input, false);
                const errorDiv = document.getElementById(`${input.id}-error`);
                if (errorDiv) {
                    clearField(errorDiv);
                }
            });
        }

        // --- PIN INPUT LOGIC (4 Digits) ---

        const handlePinSubmit = async () => {
            const pinValue = Array.from(pinInputs).map(i => i.value).join('');
            
            if (pinValue.length !== 4) return;

            // UI Loading State
            if (pinLoading) pinLoading.classList.remove('hidden');
            pinInputs.forEach(i => i.disabled = true);
            if (pinError) clearField(pinError);

            try {
                const success = await sessionService.loginWithPin(pinValue);
                
                if (success) {
                    localStorage.removeItem('pin_attempts');
                    this.navigate('/passwords');
                } else {
                    await handlePinFailure();
                }
            } catch (error) {
                console.error(error);
                showToastMessage('Error verifying PIN', ToastType.ERROR, 2000);
                resetPinInputs();
            } finally {
                if (pinLoading) pinLoading.classList.add('hidden');
                pinInputs.forEach(i => i.disabled = false);
                
                // Refocus if we are still on the same page (didn't navigate away)
                if (!window.location.hash || window.location.hash === '#/') {
                    pinInputs[0]?.focus();
                }
            }
        };

        const handlePinFailure = async () => {
            let attempts = parseInt(localStorage.getItem('pin_attempts') || '0');
            attempts++;
            localStorage.setItem('pin_attempts', attempts.toString());

            if (attempts >= 3) {
                await sessionService.disablePinUnlock();
                localStorage.removeItem('pin_attempts');
                
                // Switch to password view
                if (pinSection) pinSection.classList.add('hidden');
                if (passwordSection) passwordSection.classList.remove('hidden');
                if (pinSwitchContainer) pinSwitchContainer.classList.add('hidden');
                
                document.getElementById('username')?.focus();
                
                showToastMessage('PIN login disabled due to too many failed attempts.', ToastType.ERROR, 5000);
            } else {
                if (pinError) setErrorMessage(pinError, `Incorrect PIN. ${3 - attempts} attempts left.`);
                
                // Reset inputs visually
                pinInputs.forEach(i => {
                    i.value = '';
                    i.classList.add('form-input-error'); // Reuse existing error class or add specific style
                });

                // Shake animation
                const container = document.querySelector('.pin-input-container');
                if (container) {
                     container.animate([
                        { transform: 'translateX(0)' },
                        { transform: 'translateX(-10px)' },
                        { transform: 'translateX(10px)' },
                        { transform: 'translateX(0)' }
                    ], { duration: 300 });
                }
            }
        };

        const resetPinInputs = () => {
            pinInputs.forEach(i => {
                i.value = '';
                i.classList.remove('form-input-error');
            });
            pinInputs[0]?.focus();
        };

        pinInputs.forEach((input, index) => {
            // 1. Handle Input (Type number)
            input.addEventListener('input', () => {
                const val = input.value;
                
                // Allow only numbers
                if (!/^\d$/.test(val)) {
                    input.value = '';
                    return;
                }

                // Clear errors on typing
                if (pinError) clearField(pinError);
                pinInputs.forEach(i => i.classList.remove('form-input-error'));

                // Move to next input
                if (index < 3) {
                    pinInputs[index + 1].focus();
                } else {
                    // If it's the last input, submit
                    handlePinSubmit();
                }
            });

            // 2. Handle Keydown (Backspace, Arrows)
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    // Move back if empty and backspace pressed
                    pinInputs[index - 1].focus();
                }
                if (e.key === 'ArrowLeft' && index > 0) {
                    pinInputs[index - 1].focus();
                }
                if (e.key === 'ArrowRight' && index < 3) {
                    pinInputs[index + 1].focus();
                }
            });

            // 3. Handle Paste (Full code)
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = e.clipboardData?.getData('text') || '';
                // Extract only numbers, take first 4
                const numbers = pasteData.replace(/\D/g, '').slice(0, 4).split('');
                
                if (numbers.length > 0) {
                    numbers.forEach((num, i) => {
                        if (pinInputs[i]) pinInputs[i].value = num;
                    });
                    
                    // Focus logic after paste
                    if (numbers.length === 4) {
                        pinInputs[3].focus();
                        handlePinSubmit();
                    } else if (numbers.length < 4) {
                        pinInputs[numbers.length].focus();
                    }
                }
            });
        });

        // Prevent standard form submission for PIN form to avoid page reload,
        // although we handle logic via input events mostly.
        pinForm?.addEventListener('submit', (e) => {
            e.preventDefault();
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
                    if (input.classList.contains('pin-digit')) continue;

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