// src/types/index.ts

// This interface is used for creating new users in DB
export interface User{
    id: string;
    username: string; // Stored as encrypted string in DB, decrypted in app memory
    email: string; // This is encrypted as anything that doesn't have to be plain text won't be
    validationToken: string;
}

// This interface is created for good practice and TypeScript types verificaton
export interface VaultItem {
    id: string;          // example: UUID
    url: string;         // Site URL
    username: string;    // Login  
    password: string;    // Password is allowed as plain text here, because this type should never be passed to the database, and only be used for encryption
    createdAt: number;   // TimeStamp
}

// This interface is not neccessary but rather a helpful util, to avoid mismatch in later code
// This is roughly how the content is stored ("base64Salt:base64IV:base64Content")
export interface EncryptedVaultItem {
    id: string;
    url: string;      // Ciphertext
    username: string; // Ciphertext
    password: string; // Ciphertext
    createdAt: number;
}

export interface Validation {
    value: string;
    regex: RegExp;
    fieldName: string;
    message: string;
}

export interface AutoFillResponse {
    success: boolean;
    // (?) symbol marks the field as optional
    error?: string; 
    data?: {
        username: string;
        password: string;
    };
}