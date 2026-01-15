// src/utils/buffer.ts

// Utility functions for converting between ArrayBuffer, Base64, and string formats.
// Web crypto API uses ArrayBuffer for binary data.

// Helper function to safely convert any BufferSource to Uint8Array backed by a standard ArrayBuffer.
const toUint8Array = (buffer: BufferSource): Uint8Array<ArrayBuffer> => {
    if (buffer instanceof ArrayBuffer) {
        return new Uint8Array(buffer);
    }
    if (ArrayBuffer.isView(buffer)) {
        // Check if the underlying buffer is a standard ArrayBuffer
        if (buffer.buffer instanceof ArrayBuffer) {
            return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        }
    }
    // Fallback: Create a new copy which is guaranteed to be a standard ArrayBuffer
    // We use "as unknown" to handle the BufferSource union, then cast to specific Uint8Array type
    return new Uint8Array(buffer as unknown as ArrayBufferLike) as Uint8Array<ArrayBuffer>;
};

export const buffToBase64 = (buffer: BufferSource): string => {
    const u8 = toUint8Array(buffer);
    // Spread operator on Uint8Array works, but for large buffers simpler iteration is safer/faster
    // converting safely to ensure string creation works
    let binary = '';
    const len = u8.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(u8[i]);
    }
    return btoa(binary);
};

export const base64ToBuff = (base64: string): Uint8Array<ArrayBuffer> => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    // Explicitly return as generic with ArrayBuffer to satisfy TS strict checks
    return bytes as Uint8Array<ArrayBuffer>;
};

export const base64Url = (source: object): string => btoa(JSON.stringify(source));

// Encode and decode UTF-8 strings to and from Uint8Array
export const stringToBuff = (str: string): Uint8Array<ArrayBuffer> => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    // TextEncoder spec guarantees standard ArrayBuffer
    return encoded as Uint8Array<ArrayBuffer>;
};

export const buffToString = (buffer: BufferSource): string => {
    return new TextDecoder().decode(buffer);
};

// --- HELPER FUNCTIONS FOR ARGON2 ---

// Converts any BufferSource to a Hex string
export const buffToHex = (buffer: BufferSource): string => {
    const u8 = toUint8Array(buffer);
    return Array.from(u8)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

// Converts a Hex string to a Uint8Array
export const hexToBuff = (hex: string): Uint8Array<ArrayBuffer> => {
    if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
    
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    
    return array as Uint8Array<ArrayBuffer>;
};