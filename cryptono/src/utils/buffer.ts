// Utility functions for converting between ArrayBuffer, Base64, and string formats.
// Web crypto API uses ArrayBuffer for binary data,
// while Base64 and strings are easier to use for storage and display.

export const buffToBase64 = (buffer: BufferSource): string => {
    // Make sure to handle both ArrayBuffer and TypedArray inputs
    return btoa(String.fromCodePoint(...new Uint8Array(buffer as any)));
};

export const base64ToBuff = (base64: string): Uint8Array<ArrayBuffer> => {
    // Explicitly cast to Uint8Array<ArrayBuffer> to assure TS it's not a SharedArrayBuffer
    return Uint8Array.from(atob(base64), c => c.codePointAt(0)!) as Uint8Array<ArrayBuffer>;
};

export const base64Url = (source: object) => btoa(JSON.stringify(source));

// Encode and decode UTF-8 strings to and from Uint8Array
export const stringToBuff = (str: string): Uint8Array<ArrayBuffer> => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    // Make sure typeScript infers Uint8Array backed by standard ArrayBuffer
    return encoded as Uint8Array<ArrayBuffer>;
};

export const buffToString = (buffer: BufferSource): string => {
    return new TextDecoder().decode(buffer);
};

// --- NEW HELPER FUNCTIONS FOR ARGON2 ---

// Converts any BufferSource (ArrayBuffer or View) to a Hex string
// We use "buffer as any", similar to buffToBase64, to handle all BufferSource variants
export const buffToHex = (buffer: BufferSource): string => {
    return Array.from(new Uint8Array(buffer as any))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

// Converts a Hex string to a safe Uint8Array<ArrayBuffer>
// We cast the result to assure TypeScript it is not a SharedArrayBuffer
export const hexToBuff = (hex: string): Uint8Array<ArrayBuffer> => {
    if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
    
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    
    return array as Uint8Array<ArrayBuffer>;
};