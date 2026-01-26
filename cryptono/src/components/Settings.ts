export class Settings {
    navigate: (path: string) => void;

    constructor(navigate: (path: string) => void) {
        this.navigate = navigate;
    }

    render() {
        return `
            <div class="container">
                <div class="header">
                    <div class="logo">
                        <button class="back-btn" id="back-to-passwords" title="Back">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </button>
                        <h1 class="extensionTitle">Settings</h1>
                    </div>
                    <p class="extensionSub">Configure your vault preferences</p>
                </div>

                <div class="settings-list">
                    <div class="settings-group">
                        <h2 class="group-title">General</h2>
                        <div class="settings-item">
                            <div class="item-info">
                                <span class="item-label">Auto-lock (minutes)</span>
                                <span class="item-description">Lock the vault after inactivity.</span>
                            </div>
                            <div class="counter-wrapper">
                                <button class="counter-btn" id="decrease-lock">-</button>
                                <input type="number" id="lock-input" class="setting-input" value="15" min="1" max="60" readonly>
                                <button class="counter-btn" id="increase-lock">+</button>
                            </div>
                        </div>

                        <div class="settings-item">
                            <div class="item-info">
                                <span class="item-label">Dark Mode</span>
                                <span class="item-description">Force dark theme appearance.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" checked disabled>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-group">
                        <h2 class="group-title">Security</h2>
                        <div class="settings-item">
                            <div class="item-info">
                                <span class="item-label">Clear Clipboard</span>
                                <span class="item-description">Automatically clear copied passwords.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="clear-clipboard-toggle" checked>
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="settings-item action-item" id="change-master-password">
                            <div class="item-info">
                                <span class="item-label">Change Master Password</span>
                                <span class="item-description">Update your main vault protection.</span>
                            </div>
                            <span class="chevron">˃</span>
                        </div>
                    </div>

                    <div class="settings-group">
                        <h2 class="group-title">Data Management</h2>
                        <div class="data-actions">
                            <button id="import-btn" class="settings-btn secondary-btn">
                                <span class="btn-icon">📥</span> Import
                            </button>
                            <button id="export-btn" class="settings-btn secondary-btn">
                                <span class="btn-icon">📤</span> Export
                            </button>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <p class="security-note">Version 1.0.0 • Cryptono Secure</p>
                </div>
            </div>
        `;
    }

    afterRender() {
        const lockInput = document.getElementById('lock-input') as HTMLInputElement;
        const btnMinus = document.getElementById('decrease-lock');
        const btnPlus = document.getElementById('increase-lock');
        const backBtn = document.getElementById('back-to-passwords');
        const importBtn = document.getElementById('import-btn');
        const exportBtn = document.getElementById('export-btn');

        // Back navigation
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate('/passwords');
            });
        }

        // Lock counter logic
        if (lockInput && btnMinus && btnPlus) {
            btnMinus.addEventListener('click', () => {
                const val = parseInt(lockInput.value);
                if (val > parseInt(lockInput.min)) {
                    lockInput.value = (val - 1).toString();
                }
            });

            btnPlus.addEventListener('click', () => {
                const val = parseInt(lockInput.value);
                if (val < parseInt(lockInput.max)) {
                    lockInput.value = (val + 1).toString();
                }
            });
        }

        // Placeholder actions for Import/Export
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                console.log('Import triggered');
                // Future: show file picker
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                console.log('Export triggered');
                // Future: generate and download JSON
            });
        }
    }
}