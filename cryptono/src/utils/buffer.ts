// Utility functions for converting between ArrayBuffer, Base64, and string formats.
// Web crypto API uses ArrayBuffer for binary data,
// while Base64 and strings are easier to use for storage and display.
export const buffToBase64 = (buffer: BufferSource): string => {
    // Make sure to handle both ArrayBuffer and TypedArray inputs
    return btoa(String.fromCodePoint(...new Uint8Array(buffer as any)));
};

export const base64ToBuff = (base64: string): Uint8Array => {
    return Uint8Array.from(atob(base64), c => c.codePointAt(0)!);
};

export const base64Url = (source: object) => btoa(JSON.stringify(source));

// Encode and decode UTF-8 strings to and from Uint8Array
export const stringToBuff = (str: string): Uint8Array => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    // Make sure typeScript infers Uint8Array
    return encoded;
};

export const buffToString = (buffer: BufferSource): string => {
    return new TextDecoder().decode(buffer);
};