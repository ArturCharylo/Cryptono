import loginValidation from '../../validation/validate';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form') as HTMLFormElement;
    const registerBtn = document.querySelector('.register-btn') as HTMLButtonElement;
    let error = '';

    registerForm?.addEventListener('submit', async (event: Event) => {
        event.preventDefault();
        const username = (document.getElementById('username') as HTMLInputElement)?.value;
        const password = (document.getElementById('password') as HTMLInputElement)?.value;
        const confrimPassword = (document.getElementById('confirm_password') as HTMLInputElement)?.value;

        if (!username || !password || !confrimPassword){
            error = "Please fill in all the fields"
        }
        if (password !== confrimPassword){
            error = "Passwords do not match";
        }
        if (error !== '') {
            return error;
        }

        // Set loading State
        registerBtn.classList.add('loading');
        registerBtn.disabled = true;

        try {
            const registrationSuccess = await authorize(username, password);
            
            if (registrationSuccess) {
                chrome.tabs.create({
                    url: chrome.runtime.getURL('passwords.html')
                });
                window.close();
            } else {
                alert('Registration failed');
            }
        }
        catch (error) {
            alert('Registration failed: ' + error);
        } finally {
            // Reset loading state
            registerBtn.classList.remove('loading');
            registerBtn.disabled = false;
        }      
    });
    async function authorize (username: string, password: string): Promise<boolean> {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (loginValidation(username, password).every(v => v.value.match(v.regex))){
                resolve(true);
            }
            else{
                loginValidation(username, password).forEach(v => {
                    if (!v.value.match(v.regex)){
                        error += v.message + '\n';
                        
                    }});
                resolve(false);
            }
        }, 1000);
    });
    };
});