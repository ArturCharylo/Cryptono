import './styles/popup.css';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form') as HTMLFormElement;
    
    loginForm?.addEventListener('submit', (event: Event) => {
        event.preventDefault();
        
        const username = (document.getElementById('username') as HTMLInputElement)?.value;
        const password = (document.getElementById('password') as HTMLInputElement)?.value;
        
        console.log('Login attempt:', { username, password });
        
        if (!username || !password) {
            alert('Please fill in all fields');
            return;
        }

        chrome.tabs.create({
            url: chrome.runtime.getURL('passwords.html')
        });
    });
});