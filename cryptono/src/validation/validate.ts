import type { Validation } from "../types/index";

export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
export const usernameRegex = /^[a-zA-Z0-9._@+-]+$/;
export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const urlRegex = /^(https?:\/\/)?((([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})|localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/[^\s]*)?$/;

function loginValidation(username: string, password: string): Validation[] {
    return [
        {
            value: username,
            regex: usernameRegex,
            fieldName: "First name",
            message: "Wrong first name format. Only letters, spaces, apostrophes, and hyphens are allowed.",
        },
        {
            value: password,
            regex: passwordRegex,
            fieldName: "Password",
            message: "Wrong password format. Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
        }
    ];
}

function registerValidation(email: string, username: string, password:string): Validation[] {
    return [
        {
            value: username,
            regex: usernameRegex,
            fieldName: "First name",
            message: "Wrong first name format. Only letters, spaces, apostrophes, and hyphens are allowed.",
        },
        {
            value: password,
            regex: passwordRegex,
            fieldName: "Password",
            message: "Wrong password format. Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
        },
        {
            value: email,
            regex: emailRegex,
            fieldName: "Email",
            message: "Wrong email format. Please make sure your email is valid.",
        },
    ]
}
function addValidation(url: string, username: string, password: string): Validation[]{
    return [
        {
            value: url,
            regex: urlRegex,
            fieldName: "URL",
            message: "Wrong URL format, this is likely not a URL to any website, nor localhost",
        },
        {
            value: username,
            regex: usernameRegex,
            fieldName: "Username",
            message: "Wrong username format. Only letters, spaces, apostrophes, and hyphens are allowed.",
        },
        {
            value: password,
            regex: passwordRegex,
            fieldName: "Password",
            message: "Wrong password format. Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
        },
    ]
}

function passValidation(password: string){
    return [
        {
        value: password,
        regex: passwordRegex,
        fieldName: "Password",
        message: "Wrong password format. Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
        }
    ]
}

export { loginValidation };
export { registerValidation };
export { addValidation };
export { passValidation };
