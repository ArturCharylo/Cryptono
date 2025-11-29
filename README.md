# 🔐 Cryptono  
**Open-source Password Manager (Chrome Extension)**

Cryptono is a lightweight and secure open-source password manager built as a Chrome extension.  
The goal of this project is to provide a simple, privacy-friendly tool for storing and managing passwords locally or with optional encrypted sync.

---

## 📌 Features (planned & current)

### 🛠️ Planned
- Chrome browser extension
- Password storage in encrypted form
- Simple and clean UI
- Master password protection
- Auto-generate secure passwords
- Password search and categories
- Optional synchronized backup (encrypted)
- Import/export encrypted vault
- Dark mode 🌙

---

## 🏗️ Tech Stack
| Area | Technology |
|------|------------|
| Extension Backend | TypeScript |
| UI | HTML, CSS, TS |
| Encryption | WebCrypto API |
| Storage | IndexedDB |

---

## 📦 Installation (from source)

```bash
git clone https://github.com/ArturCharylo/cryptono.git
cd cryptono
```

1. Open Chrome and go to:
2. chrome://extensions/
3. Enable Developer Mode (top-right).
4. Click Load unpacked and select the project folder.

---

## 🔑 Security
All sensitive data is encrypted using the WebCrypto API directly in the browser.

The app does not send passwords to any external servers (unless encrypted backup is enabled in future versions).

Open-source = transparent and community-audited.

---

## ⚠️ Cryptono is currently in early development and may not be suitable for high-security use yet.

## 🤝 Contributing
Contributions are welcome!

How to contribute:

Fork the repo

Create a feature branch

Commit your changes

Submit a pull request 🚀

---

## 📜 License
This project is licensed under the MIT License.

---

## ⭐ Support
If you like the project, give it a star on GitHub to support development! 🌟
