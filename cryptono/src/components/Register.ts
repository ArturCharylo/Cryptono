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
                        <input type="text" placeholder="Enter your username" id="username" name="username" class="form-input" required/>
                    </div>

                    <div class="input-group">
                        <label for="email">Email</label>
                        <input type="email" placeholder="Enter your email" id="email" name="email" class="form-input" required/>
                    </div>

                    <div class="input-group">
                        <label for="password">Password</label>
                        <input type="password" placeholder="Enter your password" id="password" name="password" class="form-input" required/>
                    </div>

                    <div class="input-group">
                        <label for="confirm_password">Confirm Password</label>
                        <input type="password" placeholder="Confirm your password" id="confirm_password" name="confirm_password" class="form-input" required/>
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

        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate('/login');
            });
        }

        registerForm?.addEventListener('submit', async (event: Event) => {
            event.preventDefault();
            const username = (document.getElementById('username') as HTMLInputElement)?.value;
            const password = (document.getElementById('password') as HTMLInputElement)?.value;
            const email = (document.getElementById('email') as HTMLInputElement)?.value;
            const confirmPassword = (document.getElementById('confirm_password') as HTMLInputElement)?.value;
            
            let error = '';
            if (!username || !password || !confirmPassword){
                error = "Please fill in all the fields"
            }
            if (password !== confirmPassword){
                error = "Passwords do not match";
            }
            if (error !== '') {
                alert(error);
                return;
            }

            if (registerBtn) {
                registerBtn.classList.add('loading');
                registerBtn.disabled = true;
            }

            try {
                const registrationSuccess = await this.authorize(email, username, password, confirmPassword);

                if (registrationSuccess) {
                    alert('Registration successful! You can now login.');
                    this.navigate('/login');
                }
            }
            catch (error) {
                alert('Registration failed: ' + (error as Error).message);
            } finally {
                if (registerBtn) {
                    registerBtn.classList.remove('loading');
                    registerBtn.disabled = false;
                }
            }
        });
    }

    async authorize(email: string, username: string, password: string, repeatPass: string): Promise<boolean> {
        // Regex
        const validations = registerValidation(email, username, password);
        const isValid = validations.every(v => v.value.match(v.regex));

        if (!isValid) {
            let errorMsg = '';
            validations.forEach(v => {
                if (!v.value.match(v.regex)) errorMsg += v.message + '\n';
            });
            throw new Error(errorMsg);
        }

        // Create user in indexedDB
        await storageService.createUser(username, password, repeatPass);
        
        return true;
    }
}