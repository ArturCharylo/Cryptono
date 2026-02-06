import { passwordRegex } from "../validation/validate";

// We removed the dependency on 'showToastMessage' to make this function pure
// and usable within the content script context where the popup DOM doesn't exist.

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

    // Return an empty string to signal failure, without accessing the DOM
    console.error('Error generating strong password after 50 attempts');
    return ''; 
};