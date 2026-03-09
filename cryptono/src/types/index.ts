// src/types/index.ts

// This interface is used for creating new users in DB
export interface User {
    id: string;
    username: string; // Stored as encrypted string in DB, decrypted in app memory
    email: string; // This is encrypted as anything that doesn't have to be plain text won't be
    salt: string;
    encryptedVaultKey: string;
}

// This interface is created for good practice and TypeScript types verificaton
export interface VaultItem {
    id: string;          // example: UUID
    url: string;         // Site URL
    username: string;    // Login  
    password: string;    // Password is allowed as plain text here, because this type should never be passed to the database
    createdAt: number;   // TimeStamp
    
    // Decoded
    // Here we store additional fields and notes in decrypted form so the UI can display them properly
    fields?: Array<{ name: string; value: string; type: string }>; 
    note?: string;
}

// This interface is not neccessary but rather a helpful util, to avoid mismatch in later code
// This is roughly how the content is stored ("base64Salt:base64IV:base64Content")
export interface EncryptedVaultItem {
    userId?: string;
    id: string;
    url: string;      // Ciphertext
    urlHash: string;  // Hashed URL for faster searching
    username: string; // Ciphertext
    password: string; // Ciphertext
    createdAt: number;

    // In DB we store fields and note as encrypted strings
    // Before saving to DB we convert them to string (JSON.stringify) then encrypt
    fields?: string; 
    note?: string;   
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
        // This allows ContentScript to autofill additional dynamicaly generated fields
        fields?: Array<{ name: string; value: string; type: string }>;
    };
}
export interface TrustedDeviceData {
    salt: string;
    iv: string;
    ciphertext: string;
}
// Interface for items imported from external sources (JSON, CSV, etc.)
export interface ImportedVaultItem {
    url?: string;
    site?: string;    // Some password managers export 'site' instead of 'url'
    username?: string;
    login?: string;   // Some password managers export 'login' instead of 'username'
    password?: string;
    note?: string;
    fields?: Array<{ name: string; value: string; type: string }>;
}

export interface ToastData {
    id: string;
    message: string;
    expiresAt: number;
    domain?: string;
}

// This interface is used for the audit report items returned by the WASM module and processed in AuditService
export interface AuditReportItem {
    id: string;
    score: number;
    warning: string | null;
    is_reused: boolean;
    sha1_prefix: string;
    sha1_suffix: string;
    is_leaked?: boolean;
}