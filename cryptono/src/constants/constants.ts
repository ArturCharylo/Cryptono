export const DB_CONFIG = {
    DB_NAME: 'CryptonoDB',
    STORE_NAME: 'vault',
    DB_VERSION: 2,
} as const

export const STORAGE_KEYS = {
    MASTER: "masterPassword"
} as const

export const CRYPTO_KEYS = {
    ALGO_AES:"AES-GCM",
    ALGO_KDF:"PBKDF2",
    ALGO_HASH:"SHA-256",
    // Configuration standards for cryptographic operations
    PBKDF2_ITERATIONS: 100000, // Higher values increase security but also computation time
    SALT_LENGTH: 16,
    IV_LENGTH: 12, // Standard length for AES-GCM
} as const