import { passwordRegex } from "../validation/validate";
import { ToastType, showToastMessage } from "./messages";

export const generateStrongPassword = (length: number = 16): string => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    const array = new Uint32Array(length);
    
    // Loop for handling the unlikely event of wrong password format
    let attempts = 0;
    while (attempts < 50) { // Safety break, avoids overload
        globalThis.crypto.getRandomValues(array);
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset[array[i] % charset.length];
        }

        // Regex validation
        if (passwordRegex.test(password)) {
            return password;
        }
        
        attempts++;
    }

    // Fallback if in 50 attempts the random function doesn't generate any correct passwords wich is way less than unlikely
    showToastMessage('Error generating strong password. Try again', ToastType.ERROR, 2500)
    return ''; 
};