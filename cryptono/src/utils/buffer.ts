// Utility functions for converting between ArrayBuffer, Base64, and string formats.
// Web crypto API uses ArrayBuffer for binary data,
// while Base64 and strings are easier to use for storage and display.
export const buffToBase64 = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

export const base64ToBuff = (base64: string): ArrayBuffer => {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
};

// Encode and decode UTF-8 strings to and from Uint8Array
export const stringToBuff = (str: string): Uint8Array => {
    return new TextEncoder().encode(str);
};

export const buffToString = (buffer: ArrayBuffer): string => {
    return new TextDecoder().decode(buffer);
};