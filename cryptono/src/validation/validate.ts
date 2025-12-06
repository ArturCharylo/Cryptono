import type { Validation } from "../types/index";

export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[\w@$!%*?&]{8,}$/;
export const usernameRegex = /^[a-zA-Z0-9._@+-]+$/;
export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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

export { loginValidation };
export { registerValidation };
