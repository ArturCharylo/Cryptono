# 🔐 Cryptono

**Secure, Local-First Password Manager (Chrome Extension)**

Cryptono is a modern, open-source password manager built as a Chrome Extension (Manifest V3). It prioritizes privacy by storing all credentials locally in an encrypted IndexedDB vault using industry-standard cryptography.

The application features a custom-built Single Page Application (SPA) interface with a sleek Glassmorphism design, entirely framework-free.

---

## ✨ Features

### ✅ Currently Implemented

- **Zero-Knowledge Architecture:** Data is encrypted/decrypted locally. We never see your master password.
- **State-of-the-Art Encryption:** Uses **Argon2id (via WASM)** for master key derivation to resist GPU brute-force attacks and **AES-GCM (256-bit)** for data encryption.
- **Security Audit:** Built-in health check that identifies weak passwords and checks for leaks using the **Have I Been Pwned** database with privacy-preserving **k-Anonymity**.
- **Account Recovery (SSS):** Advanced recovery system based on **Shamir's Secret Sharing**, allowing you to split your recovery key into multiple shards.
- **Secure Export:** Export your vault to encrypted binary files for safe backups.
- **Smart Autofill:** Automatically detects login fields and fills credentials matching the current domain.
- **Session Security:** Master password is held only in session memory (`chrome.storage.session`) and cleared on browser restart or logout.
- **Sleek UI:** Custom Glassmorphism interface fully written in Vanilla TypeScript and CSS variables.
- **Search and filtering of vault items**.

## 🚀 Roadmap / Planned

- [ ] Secure synchronization (optional cloud backup).
- [ ] Mobile companion app.

---

## 🏗️ Tech Stack

| Area             | Technology                                                                 |
| ---------------- | -------------------------------------------------------------------------- |
| **Core** | TypeScript (Vanilla, no framework)                               |
| **Performance** | **WebAssembly (WASM)** for heavy cryptographic tasks and auditing |
| **Cryptography** | Web Crypto API, **Argon2id**, and **Shamir's Secret Sharing** |
| **Security API** | **Have I Been Pwned (HIBP)** via k-Anonymity                     |
| **Storage** | IndexedDB (Persistent) + Chrome Storage Session (Ephemeral)      |
| **Styling** | CSS3 (Variables, Flexbox, Glassmorphism)                         |

---

## 🔒 Security Architecture

Cryptono takes security seriously. Here is how your data is handled:

1.  **Key Derivation:** Your master password is never stored. We use **Argon2id** (implemented in C++/WASM) for superior resistance against hardware-accelerated attacks.
2.  **Privacy-Preserving Audit:** When checking for leaked passwords, we use **k-Anonymity**. Only the first 5 characters of your password's SHA-1 hash are sent to the HIBP API; the actual comparison happens locally.
3.  **Account Recovery:** Using **Shamir's Secret Sharing (SSS)**, your recovery key can be distributed into shards, ensuring no single shard reveals the key.
4.  **Encryption:** All vault items are encrypted using **AES-GCM (256-bit)** with unique Initialization Vectors (IV) for every item.
5.  **Storage Isolation:** Encrypted blobs (ciphertext + IV + salt) are stored in the browser's **IndexedDB**, isolated within the extension's sandbox.

---

## 📦 Installation & Development

Since this project uses Vite, you need to build it before loading it into Chrome.
 > If You're a contributor and want to test Autofill/AutoSave use this site ([Test Form](https://fill.dev/form/login-simple)) or for more fields ([Test Autofill](https://www.roboform.com/filling-test-all-fields))

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Steps

1.  **Clone the repository**

    ```bash
    git clone https://github.com/ArturCharylo/Cryptono.git
    cd cryptono/cryptono
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Build the extension**

    ```bash
    npm run build
    ```

    _Use `npm run dev` for watch mode during development._

4.  **Load into Chrome**
    1.  Open Chrome and navigate to `chrome://extensions/`.
    2.  Enable **Developer Mode** (toggle in the top-right corner).
    3.  Click **Load unpacked**.
    4.  Select the **`dist`** folder created by the build process (NOT the root source folder).

---

## 🤝 Contributing

Contributions are welcome! If you find a bug or want to add a feature:

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ by Artur
</p>
