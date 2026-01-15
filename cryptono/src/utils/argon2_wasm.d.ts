declare module '*/argon2_wasm.js' {
    export interface Argon2Module {
        generateArgon2idHash(password: string, salt: string): string;
    }

    export default function createArgon2Module(options?: any): Promise<Argon2Module>;
}