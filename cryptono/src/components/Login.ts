import { loginValidation } from '../validation/validate';

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
                    </div>

                    <div class="input-group">
                        <label for="password">Password</label>
                        <input type="password" placeholder="Enter your password" id="password" name="password" class="form-input"/>
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
                    <p style="margin-top: 10px; font-size: 0.8rem; color: rgba(255, 255, 255, 0.8);">
                        Don't have an account? <a href="#" id="go-to-register" style="color: white; text-decoration: underline;">Register</a>
                    </p>
                </div>
            </div>
        `;
    }

    afterRender() {
        const loginForm = document.getElementById('login-form') as HTMLFormElement;
        const loginBtn = document.querySelector('.login-btn') as HTMLButtonElement;
        const registerLink = document.getElementById('go-to-register');

        if (registerLink) {
            registerLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate('/register');
            });
        }

        loginForm?.addEventListener('submit', async (event: Event) => {
            event.preventDefault();

            const username = (document.getElementById('username') as HTMLInputElement)?.value;
            const password = (document.getElementById('password') as HTMLInputElement)?.value;

            if (!username || !password) {
                alert('Please fill in all fields');
                return;
            }

            // Set loading state
            if (loginBtn) {
                loginBtn.classList.add('loading');
                loginBtn.disabled = true;
            }

            try {
                const loginSuccess = await this.authenticate(username, password);

                if (loginSuccess) {
                    this.navigate('/passwords');
                } else {
                    alert('Invalid credentials');
                }
            } catch (error) {
                alert('Login failed: ' + error);
            } finally {
                // Reset loading state
                if (loginBtn) {
                    loginBtn.classList.remove('loading');
                    loginBtn.disabled = false;
                }
            }
        });
    }

    async authenticate(username: string, password: string): Promise<boolean> {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (loginValidation(username, password).every(v => v.value.match(v.regex))){
                    resolve(true);
                }
                else{
                    loginValidation(username, password).forEach(v => {
                        if (!v.value.match(v.regex)){
                            alert(v.message);
                        }
                    });
                    resolve(false);
                }
            }, 1000);
        });
    }
}
