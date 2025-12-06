// src/types/index.ts

// This interface is created for good practice and TypeScript types verificaton
export interface VaultItem {
    id: string;          // example: UUID
    url: string;         // Site URL
    username: string;    // Login
    password: string;    // Password is now stored as plain text which is acceptable only for private testing purposes and absoluetly should not presist beyond that
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