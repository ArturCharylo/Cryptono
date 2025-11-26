import '../../styles/popup.css'
import loginValidation from '../../validation/validate';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form') as HTMLFormElement;
    const loginBtn = document.querySelector('.login-btn') as HTMLButtonElement;
    
    loginForm?.addEventListener('submit', async (event: Event) => {
        event.preventDefault();
        
        const username = (document.getElementById('username') as HTMLInputElement)?.value;
        const password = (document.getElementById('password') as HTMLInputElement)?.value;
        
        if (!username || !password) {
            alert('Please fill in all fields');
            return;
        }

        // Set loading state
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;

        try {
            const loginSuccess = await authenticate(username, password);
            
            if (loginSuccess) {
                chrome.tabs.create({
                    url: chrome.runtime.getURL('passwords.html')
                });
                window.close();
            } else {
                alert('Invalid credentials');
            }
        } catch (error) {
            alert('Login failed: ' + error);
        } finally {
            // Reset loading state
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
        }
    });
});

// Template function to simulate authentication.
async function authenticate(username: string, password: string): Promise<boolean> {
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