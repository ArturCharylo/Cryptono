# 🗺️ Cryptono Project File Structure

This document provides a comprehensive structural map of the **Cryptono** project, along with a description of every meaningful file and directory in the codebase.

---

## 🌳 High-Level Directory Map

```text
Cryptono/
├── LICENSE                                # Project license (ISC / MIT)
├── README.md                              # Main project documentation and overview
├── FileStructure.md                       # Project structural map and file descriptions (this file)
└── cryptono/                              # Chrome Extension (Manifest V3) root
    ├── .env                               # Environment configuration
    ├── .gitignore                         # Git ignored files & directories
    ├── eslint.config.mts                  # ESLint configuration
    ├── index.html                         # Vite root HTML template
    ├── package.json                       # Dependencies, scripts, and package metadata
    ├── package-lock.json                  # Lockfile for reproducible builds
    ├── tsconfig.json                      # TypeScript compiler configuration
    ├── vite.config.ts                     # Vite build configuration (Popup & Background)
    ├── vite.content.config.ts             # Vite build configuration (Content Script)
    └── src/                               # Application source code
        ├── manifest.json                  # Manifest V3 extension configuration
        ├── contentScript.ts               # In-page content script entry point
        ├── styles.d.ts                    # CSS module TypeScript type declarations
        │
        ├── background/                    # Background Service Worker
        │   └── background.ts              # Service worker: idle detection, session auto-lock, message broker
        │
        ├── popup/                         # Extension Popup (SPA)
        │   ├── popup.html                 # Main popup DOM container (#app)
        │   └── popup.ts                   # Popup entry point: router initialization, session check, theme
        │
        ├── components/                    # SPA Views & UI Controllers
        │   ├── Login.ts                   # Master password login view
        │   ├── Register.ts                # Initial account registration & vault creation view
        │   ├── Passwords.ts               # Vault credential list, search, filter, and quick copy view
        │   ├── AddItem.ts                 # Form view for creating and encrypting new credentials
        │   ├── EditItem.ts                # Form view for modifying or deleting existing credentials
        │   ├── BackupCodeLogin.ts         # Shamir's Secret Sharing (SSS) shard recovery login view
        │   ├── Settings.ts                # Main settings dashboard view
        │   └── settings/                  # Settings sub-views
        │       ├── BackupCodesSetup.ts    # Generates & displays SSS emergency recovery shards
        │       ├── DataManagement.ts      # Encrypted vault backup export and import
        │       ├── PasswordChange.ts      # Master password change and vault re-encryption
        │       └── PinSetup.ts            # Quick PIN unlock setup and configuration
        │
        ├── content/                       # In-Page DOM Interaction & Injected UI
        │   ├── autofill.ts                # Scans DOM, identifies fields, and injects stored credentials
        │   ├── autosave.ts                # Intercepts form submissions to detect new credentials
        │   ├── heuristics.ts              # Heuristic algorithms (Levenshtein, aliases) for field detection
        │   ├── types.ts                   # Type definitions for form fields and content logic
        │   ├── ui.ts                      # Controller for injected in-page UI elements (dropdowns, toasts)
        │   └── ui/                        # Injected UI component templates
        │       ├── dropdowns.ts           # Floating credential suggestion & generator dropdown
        │       ├── toast.ts               # In-page toast prompt (e.g. save credential prompt)
        │       └── utils.ts               # DOM positioning and coordinate calculation helpers
        │
        ├── handlers/                      # Message Handlers
        │   ├── AutoFillHandler.ts         # Background handler for AUTOFILL_REQUEST messages
        │   └── AutoSaveHandler.ts         # Background handler for capturing & storing new logins
        │
        ├── repositories/                  # IndexedDB Data Access Layer
        │   ├── UserRepository.ts          # Storage & retrieval of user identity, salt, and encrypted vault key
        │   └── VaultRepository.ts         # CRUD operations, AES encryption/decryption, and blind indexing for items
        │
        ├── services/                      # Core Business Logic & Infrastructure
        │   ├── CryptoService.ts           # Argon2id derivation, AES-256-GCM, salt, and blind index hashes
        │   ├── AuditService.ts            # Local password audit & Have I Been Pwned (HIBP) k-Anonymity checks
        │   ├── BackupService.ts           # Shamir's Secret Sharing (SSS) key splitting and reconstruction
        │   ├── AutofillService.ts         # Domain matching logic between tabs and vault records
        │   ├── DatabaseContext.ts         # IndexedDB connection lifecycle, upgrade, and store management
        │   └── SessionService.ts          # In-memory and chrome.storage.session key caching & auto-lock
        │
        ├── utils/                         # Helper Utilities
        │   ├── buffer.ts                  # Conversions between ArrayBuffer, Uint8Array, Hex, and Base64
        │   ├── messages.ts                # Typed messaging helpers across Chrome runtime contexts
        │   ├── passGen.ts                 # Cryptographically secure random password generator
        │   ├── router.ts                  # Minimal client-side SPA router for extension popup
        │   └── urlHelper.ts               # URL cleaning, hostname normalization, and domain parsing
        │
        ├── validation/                    # Input Validation
        │   └── validate.ts                # Form validation rules (passwords, URLs, required fields)
        │
        ├── types/                         # Shared TypeScript Interfaces
        │   └── index.ts                   # Core data models (User, VaultItem, EncryptedVaultItem, etc.)
        │
        ├── constants/                     # Global Constants
        │   └── constants.ts               # Database names, store names, crypto parameters, storage keys
        │
        ├── styles/                        # Glassmorphism CSS Design System
        │   ├── App.css                    # Global CSS variables, theme tokens, reset, typography
        │   ├── popup.css                  # Popup shell dimensions, header, navigation, animations
        │   ├── passwords.css              # Vault item list, search bar, badges, and card styling
        │   ├── addItem.css                # Form styling for adding/editing vault entries
        │   ├── settings.css               # Settings panel controls, toggle switches, sub-views
        │   └── backupLogin.css            # Shard recovery login interface styling
        │
        └── wasm/                          # WebAssembly Modules (Compiled Rust)
            ├── cryptono_audit*            # WASM module for local high-speed password health check
            ├── cryptono_sss*              # WASM module for Shamir's Secret Sharing recovery keys
            └── cryptono_zip*              # WASM module for compressed backup archive creation
```

---

## 📄 Detailed File Descriptions

### 1. Root & Build Configuration

| File | Path | Description |
| :--- | :--- | :--- |
| **README.md** | `README.md` | Primary project documentation explaining architecture, zero-knowledge security principles, feature list, and developer installation steps. |
| **LICENSE** | `LICENSE` | Open-source license terms governing code usage, modification, and distribution. |
| **FileStructure.md** | `FileStructure.md` | Detailed architectural directory map and file-by-file description of the project. |
| **package.json** | `cryptono/package.json` | Project manifest defining npm dependencies (Vite, CRXJS, Argon2-extension-mv3, ESLint) and build scripts (`npm run build`, `npm run dev`). |
| **package-lock.json** | `cryptono/package-lock.json` | Pinned dependency tree lockfile ensuring deterministic dependency installation. |
| **tsconfig.json** | `cryptono/tsconfig.json` | TypeScript compiler configuration, target ES standard, strict type checking, and path mappings. |
| **vite.config.ts** | `cryptono/vite.config.ts` | Vite configuration for compiling the popup Single Page Application, background service worker, and copying WASM/manifest assets to `dist/`. |
| **vite.content.config.ts** | `cryptono/vite.content.config.ts` | Separate Vite configuration dedicated to building `contentScript.ts` as an isolated bundle without code splitting. |
| **eslint.config.mts** | `cryptono/eslint.config.mts` | Flat ESLint configuration defining linting rules and TypeScript syntax checks. |
| **index.html** | `cryptono/index.html` | Vite default HTML file. |
| **.env** | `cryptono/.env` | Environment configuration variables used during development. |

---

### 2. Extension Core & Background Worker

| File | Path | Description |
| :--- | :--- | :--- |
| **manifest.json** | `cryptono/src/manifest.json` | Manifest V3 file defining permissions (`storage`, `scripting`, `activeTab`, `clipboardWrite`, `idle`), CSP (`wasm-unsafe-eval`), service worker, action popup, and content script matches. |
| **background.ts** | `cryptono/src/background/background.ts` | Extension Service Worker running in the background. Listens to `chrome.idle` events to lock vault when inactive, manages session cache clearing, and handles runtime message routing. |
| **contentScript.ts** | `cryptono/src/contentScript.ts` | Injected into visited web pages. Triggers autofill queries, listens for form submissions to trigger autosave prompts, and attaches suggestion dropdowns. |
| **styles.d.ts** | `cryptono/src/styles.d.ts` | Ambient TypeScript declaration file allowing imports of `.css` stylesheets inside TypeScript modules. |

---

### 3. Popup SPA Entry & Views (`cryptono/src/popup/` & `cryptono/src/components/`)

| File | Path | Description |
| :--- | :--- | :--- |
| **popup.html** | `cryptono/src/popup/popup.html` | Base HTML skeleton containing the `<div id="app"></div>` container where all popup views are mounted. |
| **popup.ts** | `cryptono/src/popup/popup.ts` | Main entry script for extension popup. Boots the client-side `Router`, registers routes (`/login`, `/register`, `/passwords`, etc.), restores session state, and applies light/dark themes. |
| **Login.ts** | `cryptono/src/components/Login.ts` | Master password authentication view; derives keys, verifies credentials, and unlocks vault session. |
| **Register.ts** | `cryptono/src/components/Register.ts` | Initial onboarding view for creating a master password, generating a cryptographically secure random salt, and initializing the encrypted vault key. |
| **Passwords.ts** | `cryptono/src/components/Passwords.ts` | Core vault dashboard. Displays stored credential cards, real-time search filtering, copy-to-clipboard actions, and quick navigation to add/edit views. |
| **AddItem.ts** | `cryptono/src/components/AddItem.ts` | Form view for saving new credentials. Supports username, password, URL, customizable key-value fields, and secure notes. |
| **EditItem.ts** | `cryptono/src/components/EditItem.ts` | View for viewing decrypted details, updating field values, regenerating passwords, or deleting items from the vault. |
| **BackupCodeLogin.ts** | `cryptono/src/components/BackupCodeLogin.ts` | Disaster recovery authentication view. Reconstructs the master vault key from Shamir's Secret Sharing (SSS) shares if master password is lost. |
| **Settings.ts** | `cryptono/src/components/Settings.ts` | Settings panel. Controls auto-lock idle timeout, theme switching (dark/light), PIN management, security audit triggers, and backup menus. |

---

### 4. Settings Subcomponents (`cryptono/src/components/settings/`)

| File | Path | Description |
| :--- | :--- | :--- |
| **BackupCodesSetup.ts** | `cryptono/src/components/settings/BackupCodesSetup.ts` | Generates Shamir's Secret Sharing recovery shards from current vault key, allowing users to save/print threshold recovery codes. |
| **DataManagement.ts** | `cryptono/src/components/settings/DataManagement.ts` | Handles encrypted vault data export into standalone backup files, as well as importing and restoring backups. |
| **PasswordChange.ts** | `cryptono/src/components/settings/PasswordChange.ts` | Facilitates changing master password by decrypting the existing vault key and re-encrypting it under a newly derived master key. |
| **PinSetup.ts** | `cryptono/src/components/settings/PinSetup.ts` | Configures, updates, or deletes a short numerical PIN used for rapid unlocking during an active browser session. |

---

### 5. In-Page Content Script Logic & UI (`cryptono/src/content/`)

| File | Path | Description |
| :--- | :--- | :--- |
| **autofill.ts** | `cryptono/src/content/autofill.ts` | Scans active page DOM for username and password inputs, determines best matching elements, and populates saved credentials safely without breaking framework state (React, Vue, Angular). |
| **autosave.ts** | `cryptono/src/content/autosave.ts` | Listens for form submit events, extracts inputted credentials and custom fields, and triggers the in-page prompt to save credentials to Cryptono. |
| **heuristics.ts** | `cryptono/src/content/heuristics.ts` | Smart DOM inspection algorithms using alias dictionaries and Levenshtein distance to detect input types even with obfuscated or unconventional HTML names. |
| **types.ts** | `cryptono/src/content/types.ts` | TypeScript interfaces and type definitions for autofill candidates, custom fields, and form descriptors. |
| **ui.ts** | `cryptono/src/content/ui.ts` | Coordinator for in-page UI elements; manages the mounting, repositioning, and removal of credential dropdowns and toast banners. |
| **dropdowns.ts** | `cryptono/src/content/ui/dropdowns.ts` | Creates and positions floating dropdowns attached to login inputs, allowing users to select credentials or generate strong passwords. |
| **toast.ts** | `cryptono/src/content/ui/toast.ts` | Renders floating in-page toast notifications (e.g., "Save password to Cryptono?") with Save/Ignore action buttons. |
| **utils.ts** | `cryptono/src/content/ui/utils.ts` | DOM utility functions for viewport bounding box calculation, styling, and element attachment. |

---

### 6. Message Handlers (`cryptono/src/handlers/`)

| File | Path | Description |
| :--- | :--- | :--- |
| **AutoFillHandler.ts** | `cryptono/src/handlers/AutoFillHandler.ts` | Processes `AUTOFILL_REQUEST` messages from content scripts, queries the vault repository for matching credentials by URL blind index, and returns them to the page. |
| **AutoSaveHandler.ts** | `cryptono/src/handlers/AutoSaveHandler.ts` | Processes `SAVE_CREDENTIALS` requests from content scripts, prepares vault items, and persists them into IndexedDB. |

---

### 7. Repositories & Data Storage (`cryptono/src/repositories/`)

| File | Path | Description |
| :--- | :--- | :--- |
| **UserRepository.ts** | `cryptono/src/repositories/UserRepository.ts` | IndexedDB repository managing user account data: master password salt, encrypted vault key, encrypted email, and PIN authentication state. |
| **VaultRepository.ts** | `cryptono/src/repositories/VaultRepository.ts` | IndexedDB repository handling all CRUD operations for vault credentials. Applies AES-GCM encryption before saving, generates blind index URL hashes, and decrypts entries on retrieval. |

---

### 8. Services & Cryptography (`cryptono/src/services/`)

| File | Path | Description |
| :--- | :--- | :--- |
| **CryptoService.ts** | `cryptono/src/services/CryptoService.ts` | Core cryptography engine. Derives master keys via Argon2id WASM, generates AES-256-GCM vault keys, encrypts/decrypts payloads, and computes HMAC blind index hashes. |
| **AuditService.ts** | `cryptono/src/services/AuditService.ts` | Vault security auditor. Uses local WASM (`cryptono_audit`) for fast password health checks and Have I Been Pwned API via k-Anonymity (sending only 5-character SHA-1 prefixes). |
| **BackupService.ts** | `cryptono/src/services/BackupService.ts` | Wrapper around Shamir's Secret Sharing WASM module (`cryptono_sss`) to split vault keys into $(k, n)$ threshold recovery shares and restore them. |
| **AutofillService.ts** | `cryptono/src/services/AutofillService.ts` | Domain matching service that compares the current active browser tab URL against stored vault records. |
| **DatabaseContext.ts** | `cryptono/src/services/DatabaseContext.ts` | IndexedDB wrapper handling database opening, versioning, object store creation, and transaction management. |
| **SessionService.ts** | `cryptono/src/services/SessionService.ts` | Singleton managing volatile session state. Keeps the decrypted vault key in memory and `chrome.storage.session`, and wipes it on lock/logout. |

---

### 9. Utilities & Validation (`cryptono/src/utils/` & `cryptono/src/validation/`)

| File | Path | Description |
| :--- | :--- | :--- |
| **buffer.ts** | `cryptono/src/utils/buffer.ts` | Low-level buffer conversion utilities between `ArrayBuffer`, `Uint8Array`, Base64, and Hexadecimal string formats. |
| **messages.ts** | `cryptono/src/utils/messages.ts` | Helper utilities for typed extension message communication between background, popup, and content script contexts. |
| **passGen.ts** | `cryptono/src/utils/passGen.ts` | Secure pseudo-random password generator with options for uppercase, lowercase, numbers, and symbols using `crypto.getRandomValues`. |
| **router.ts** | `cryptono/src/utils/router.ts` | Minimal, zero-dependency client-side SPA routing system managing navigation and lifecycle hooks (`render` / `afterRender`) inside the popup. |
| **urlHelper.ts** | `cryptono/src/utils/urlHelper.ts` | URL sanitization and hostname extraction helper for consistent domain matching in the vault. |
| **validate.ts** | `cryptono/src/validation/validate.ts` | Input validation rules checking password strength, email formatting, and required form fields. |

---

### 10. Types & Constants (`cryptono/src/types/` & `cryptono/src/constants/`)

| File | Path | Description |
| :--- | :--- | :--- |
| **index.ts** | `cryptono/src/types/index.ts` | TypeScript declarations and interfaces for `User`, `VaultItem`, `EncryptedVaultItem`, `AuditReportItem`, and `CustomField`. |
| **constants.ts** | `cryptono/src/constants/constants.ts` | Global constants for IndexedDB names, object store names, storage keys, and crypto parameters. |

---

### 11. Stylesheets (`cryptono/src/styles/`)

| File | Path | Description |
| :--- | :--- | :--- |
| **App.css** | `cryptono/src/styles/App.css` | Global styling foundation: CSS variables (colors, fonts, glassmorphism blur effects, borders), light/dark themes, and scrollbars. |
| **popup.css** | `cryptono/src/styles/popup.css` | Popup container styling, fixed window dimensions, header, navigation controls, and animations. |
| **passwords.css** | `cryptono/src/styles/passwords.css` | Styling for vault dashboard, search bar, item cards, action icons, and copy feedback indicators. |
| **addItem.css** | `cryptono/src/styles/addItem.css` | Styling for credential creation and editing forms, input fields, custom field rows, and action buttons. |
| **settings.css** | `cryptono/src/styles/settings.css` | Layout and controls for the settings view, toggle switches, section lists, and subpage cards. |
| **backupLogin.css** | `cryptono/src/styles/backupLogin.css` | Styling for Shamir shard recovery input view and validation feedback. |

---

### 12. WebAssembly (WASM) Modules (`cryptono/src/wasm/`)

| Module Group | Files | Description |
| :--- | :--- | :--- |
| **Password Audit** | `cryptono_audit.js`<br>`cryptono_audit.d.ts`<br>`cryptono_audit_bg.wasm`<br>`cryptono_audit_bg.wasm.d.ts` | Rust-compiled WebAssembly module for local, fast password analysis, complexity calculation, and SHA-1 hashing for k-Anonymity leak audits. |
| **Shamir's Secret Sharing (SSS)** | `cryptono_sss.js`<br>`cryptono_sss.d.ts`<br>`cryptono_sss_bg.wasm`<br>`cryptono_sss_bg.wasm.d.ts` | Rust-compiled WebAssembly module implementing Shamir's Secret Sharing algorithm to split master keys into $M$-of-$N$ threshold shards and reconstruct keys. |
| **Backup Compression** | `cryptono_zip.js`<br>`cryptono_zip.d.ts`<br>`cryptono_zip_bg.wasm`<br>`cryptono_zip_bg.wasm.d.ts` | Rust-compiled WebAssembly module providing compression and packaging for secure vault backup export files. |
