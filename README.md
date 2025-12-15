# 🔐 Cryptono

**Secure, Local-First Password Manager (Chrome Extension)**

Cryptono is a modern, open-source password manager built as a Chrome Extension (Manifest V3). It prioritizes privacy by storing all credentials locally in an encrypted IndexedDB vault using industry-standard cryptography.

The application features a custom-built Single Page Application (SPA) interface with a sleek Glassmorphism design, entirely framework-free.

---

## ✨ Features

### ✅ Currently Implemented

- **Zero-Knowledge Architecture:** Data is encrypted/decrypted locally. We never see your master password.
- **Modern Encryption:** Uses **AES-GCM (256-bit)** for data and **PBKDF2** for key derivation.
- **Smart Autofill:** Automatically detects login fields and fills credentials matching the current domain.
- **Password Generator:** Built-in tool to generate strong, random passwords (configurable length and complexity).
- **Vault Management:** Add, edit, delete, and copy credentials to clipboard.
- **Sleek UI:** Custom Glassmorphism interface fully written in TypeScript and CSS variables.
- **Session Security:** Master password is held only in session memory (`chrome.storage.session`) and cleared on browser restart or logout.

### 🚀 Roadmap / Planned

- [ ] Search and filtering of vault items.
- [ ] Import/Export functionality (encrypted JSON).
- [ ] Password strength analysis for existing items.
- [ ] Secure synchronization (optional cloud backup).

---

## 🏗️ Tech Stack

| Area             | Technology                                                  |
| ---------------- | ----------------------------------------------------------- |
| **Core**         | TypeScript (Vanilla, no framework)                          |
| **Build Tool**   | Vite + @crxjs/vite-plugin                                   |
| **Styling**      | CSS3 (Variables, Flexbox, Glassmorphism)                    |
| **Storage**      | IndexedDB (Persistent) + Chrome Storage Session (Ephemeral) |
| **Cryptography** | Web Crypto API (SubtleCrypto)                               |

---

## 🔒 Security Architecture

Cryptono takes security seriously. Here is how your data is handled:

1.  **Key Derivation:** Your master password is never stored. It is used to derive a cryptographic key using **PBKDF2** (SHA-256, 1 milion iterations, random salt).
2.  **Encryption:** Vault items (URL, Username, Password) are encrypted using **AES-GCM**.
3.  **Storage:** The encrypted blobs (ciphertext + IV + salt) are stored in the browser's **IndexedDB**.
4.  **Isolation:** The extension runs in a sandboxed environment consistent with Chrome's MV3 security standards.

---

## 📦 Installation & Development

Since this project uses Vite, you need to build it before loading it into Chrome.
 > If You're a contributor and want to test Autofill/AutoSave use this site ([Test Form](https://fill.dev/form/login-simple))

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
