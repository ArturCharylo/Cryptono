export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[\w@$!%*?&]{8,}$/;
export const nameRegex = /^[A-Za-z\s'-]+$/;

interface Validation {
    value: string;
    regex: RegExp;
    fieldName: string;
    message: string;
}

function loginValidation(username: string, password: string): Validation[] {
    return [
        {
            value: username,
            regex: nameRegex,
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

export default loginValidation;
