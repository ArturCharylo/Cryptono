import { registerValidation } from '../validation/validate';
import { storageService } from '../services/StorageService';

export class Register {
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
                    <p class="extensionSub">Create your vault</p>
                </div>

                <form class="login-form" id="register-form" name="register-form">
                    <div class="input-group">
                        <label for="username">Username</label>
                        <input type="text" placeholder="Enter your username" id="username" name="username" class="form-input"/>
                        <div class="input-error" id="username-error"></div>
                    </div>

                    <div class="input-group">
                        <label for="email">Email</label>
                        <input type="text" placeholder="Enter your email" id="email" name="email" class="form-input"/>
                        <div class="input-error" id="email-error"></div>
                    </div>

                    <div class="input-group">
                        <label for="password">Password</label>
                        <input type="password" placeholder="Enter your password" id="password" name="password" class="form-input"/>
                        <div class="input-error" id="password-error"></div>
                    </div>

                    <div class="input-group">
                        <label for="confirm_password">Confirm Password</label>
                        <input type="password" placeholder="Confirm your password" id="confirm_password" name="confirm_password" class="form-input"/>
                        <div class="input-error" id="confirm_password-error"></div>
                    </div>

                    <button type="submit" class="login-btn register-btn">
                        <span class="btn-text">Create Local Vault</span>
                        <div class="btn-loader" style="display: none;">
                            <div class="spinner"></div>
                        </div>
                    </button>
                </form>

                <div class="footer">
                    <p class="security-note">🔐 Encrypted & Secure</p>
                    <p class="security-note">
                        Already have an account? <a href="#" id="go-to-login" class="security-note-link">Login</a>
                    </p>
                </div>
            </div>
        `;
    }

    afterRender() {
        const registerForm = document.getElementById('register-form') as HTMLFormElement;
        const registerBtn = document.querySelector('.register-btn') as HTMLButtonElement;
        const loginLink = document.getElementById('go-to-login');
        const inputList = document.querySelectorAll('.form-input') as NodeListOf<HTMLInputElement>;

        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate('/login');
            });
        }

        for (const input of inputList) {
            input.addEventListener('input', () => {
                const errorDiv = document.getElementById(`${input.id}-error`);
                if (errorDiv) {
                    this.clearField(errorDiv);
                }
            });
        }

        registerForm?.addEventListener('submit', async (event: Event) => {
            event.preventDefault();
            
            let isValid = true;

            const username = inputList.values().find((e) => e.id === "username")?.value;
            const password = inputList.values().find((e) => e.id === "password")?.value;
            const email = inputList.values().find((e) => e.id === "email")?.value;
            const confirmPassword = inputList.values().find((e) => e.id === "confirm_password")?.value;
            
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

            // check if fields aren't empty
            if (!username || !password || !confirmPassword || !email) {
                for (const input of inputList) {
                    const errorDiv = document.getElementById(`${input.id}-error`);
                    if (errorDiv) {
                        this.clearField(errorDiv);
                        if (!input.value) {
                            errorDiv.appendChild(document.createElement('p'));
                            errorDiv.lastChild!.textContent = 'This field is required';
                        } 
                    }
                }
                isValid = false;
            }

            // check if email is valid
            if (email && !emailRegex.test(email)) {
                const emailInput = inputList.values().find((e) => e.id === "email");
                const errorDiv = document.getElementById(`${emailInput?.id}-error`);
                if (errorDiv) {
                    this.clearField(errorDiv);
                    errorDiv.appendChild(document.createElement('p'));
                    errorDiv.lastChild!.textContent = 'Invalid email format';
                }
                isValid = false;
            }
            // check if passwords match
            if (confirmPassword && password !== confirmPassword) {
                const confirmPasswordInput = inputList.values().find((e) => e.id === "confirm_password");
                const errorDiv = document.getElementById(`${confirmPasswordInput?.id}-error`);
                if (errorDiv) {
                    this.clearField(errorDiv);
                    errorDiv.appendChild(document.createElement('p'));
                    errorDiv.lastChild!.textContent = 'Passwords do not match';
                }
                isValid = false;
            }

            if (!isValid) {
                return;
            }

            // Set loading state on the button for better UX
            if (registerBtn) {
                registerBtn.classList.add('loading');
                registerBtn.disabled = true;
            }

            try {
                await this.authorize(email!, username!, password!, confirmPassword!);

                // Sucess
                alert('Registration successful! You can now login.');
                this.navigate('/login');

            } catch (error) {
                // Handle errors
                console.error(error);
                if (error instanceof Error) {
                    alert('Registration failed:\n' + error.message);
                } else {
                    alert('Registration failed due to an unknown error.');
                }
            } finally {
                // Reset loading state
                if (registerBtn) {
                    registerBtn.classList.remove('loading');
                    registerBtn.disabled = false;
                }
            }
        });
    }

    // Clear all error messages in the field
    clearField(field: HTMLElement) {
        if (field.childElementCount > 0) {
            while (field.firstChild) {
                field.removeChild(field.firstChild);
            }
        }
    }


    // This function only handles the logic for validation and throwing errors if any are found
    async authorize(email: string, username: string, password: string, repeatPass: string): Promise<void> {
        const validations = registerValidation(email, username, password);
        
        // Validate with regex using .test for most optimal solution
        const allValid = validations.every(v => {
            const regexObj = v.regex instanceof RegExp ? v.regex : new RegExp(v.regex);
            return regexObj.test(v.value);
        });

        // Thorw an error if there are any found
        if (!allValid) {
            const errors = validations
                .filter(v => {
                    const regexObj = v.regex instanceof RegExp ? v.regex : new RegExp(v.regex);
                    return !regexObj.test(v.value);
                })
                .map(v => v.message);
            
            throw new Error(errors.join('\n'));
        }

        // Create user in DB after all validation is complete
        await storageService.createUser(username, email, password, repeatPass);
    }
}