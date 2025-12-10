/// Utility functions for handling all kinds of messages

// Clear all error messages in the field
export const clearField = (field: HTMLElement) => {
        if (field.childElementCount > 0) {
            while (field.firstChild) {
                field.removeChild(field.firstChild);
            }
        }
}

// Set or remove error class on input element
export const setInputClassError = (input: HTMLElement, add: boolean) => {
    if (add) {
        input.classList.add('form-input-error');
    }
    else {
        input.classList.remove('form-input-error');
    }
}

// Set error message in the error div
export const setErrorMessage = (errorDiv: HTMLElement, message: string) => {
    clearField(errorDiv);
    errorDiv.appendChild(document.createElement('p'));
    errorDiv.lastChild!.textContent = message;
}

export enum ToastType {
    NORMAL = 0,
    SUCCESS = 1,
    ERROR = 2
}

let toastTimeout: number | null = null;

// Set message in the toast div
export const showToastMessage = (message: string, type: number, duration: number) => {
    const toastDiv = document.getElementById('toast');
    if (!toastDiv) return;

    // Clear any existing timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    switch (type) {
        case ToastType.NORMAL: // normal
            toastDiv.style.backgroundColor = "#333333";
            break;
        case ToastType.SUCCESS:
            toastDiv.style.backgroundColor = "#4BB543";
            break;
        case ToastType.ERROR: // error
            toastDiv.style.backgroundColor = "#FF3333";
            break;
    }

    toastDiv.textContent = message;
    toastDiv.classList.add("show");

    toastTimeout = setTimeout(() => {
        toastDiv.classList.remove("show");
        toastTimeout = null;
    }, duration);
}