// src/types/index.ts

// This interface is created for good practice and TypeScript types verificaton
export interface VaultItem {
    id: string;          // example: UUID
    url: string;         // Site URL
    username: string;    // Login
    password: string;    // Password is now stored as plain text which is acceptable only for private testing purposes and absoluetly should not presist beyond that
    createdAt: number;   // TimeStamp
}