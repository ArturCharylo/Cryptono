import { registerValidation} from '../validation/validate';

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
                        <span class="btn-text">Register</span>
                        <div class="btn-loader" style="display: none;">
                            <div class="spinner"></div>
                        </div>
                    </button>
                </form>

                <div class="footer">
                    <p class="security-note">🔐 Encrypted & Secure</p>
                    <p style="margin-top: 10px; font-size: 0.8rem; color: rgba(255, 255, 255, 0.8);">
                        Already have an account? <a href="#" id="go-to-login" style="color: white; text-decoration: underline;">Login</a>
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

            // Set loading State
            if (registerBtn) {
                registerBtn.classList.add('loading');
                registerBtn.disabled = true;
            }

            try {
                const registrationSuccess = await this.authorize(email, username, password);

                if (registrationSuccess) {
                    this.navigate('/passwords');
                } else {
                    alert('Registration failed');
                }
            }
            catch (error) {
                alert('Registration failed: ' + error);
            } finally {
                // Reset loading state
                if (registerBtn) {
                    registerBtn.classList.remove('loading');
                    registerBtn.disabled = false;
                }
            }
        });
    }

    async authorize(email: string, username: string, password: string): Promise<boolean> {
        return new Promise((resolve) => {
            setTimeout(() => {
                let error = '';
                if (registerValidation(email, username, password).every(v => v.value.match(v.regex))){
                    resolve(true);
                }
                else{
                    registerValidation(email, username, password).forEach(v => {
                        if (!v.value.match(v.regex)){
                            error += v.message + '\n';
                        }
                    });
                    if (error) alert(error);
                    resolve(false);
                }
            }, 1000);
        });
    }
}
