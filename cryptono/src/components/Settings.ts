import { PinSetup } from './settings/PinSetup';
import { PasswordChange } from './settings/PasswordChange';
import { DataManagement } from './settings/DataManagement';
import { BackupCodesSetup } from './settings/BackupCodesSetup';

export class Settings {
    navigate: (path: string) => void;

    // Modules
    private pinSetup: PinSetup;
    private passwordChange: PasswordChange;
    private dataManagement: DataManagement;
    private backupCodesSetup: BackupCodesSetup;

    constructor(navigate: (path: string) => void) {
        this.navigate = navigate;

        // Initialize modules with IDs of elements they control
        this.pinSetup = new PinSetup('pin-unlock-toggle');
        this.passwordChange = new PasswordChange('change-master-password');
        this.dataManagement = new DataManagement('import-btn', 'export-btn');
        this.backupCodesSetup = new BackupCodesSetup('generate-backup-codes');
    }

    render() {
        return `
            <div class="container">
                <div class="header">
                    <div class="logo">
                        <button class="back-btn" id="back-to-passwords" title="Back">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
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
                                <span class="item-label">Auto-lock</span>
                                <span class="item-description">Lock the vault after inactivity.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="auto-lock-toggle">
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="settings-item sub-item hidden" id="auto-lock-controls">
                            <div class="item-info"><span class="item-label">Timeout (minutes)</span></div>
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
                                <input type="checkbox" id="dark-mode-toggle">
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="settings-group">
                        <h2 class="group-title">Security</h2>

                        <div class="settings-item">
                            <div class="item-info">
                                <span class="item-label">Quick Access (PIN)</span>
                                <span class="item-description">Unlock vault with a short code.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="pin-unlock-toggle">
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="settings-item action-item" id="change-master-password">
                            <div class="item-info">
                                <span class="item-label">Change Master Password</span>
                                <span class="item-description">Update your main vault protection.</span>
                            </div>
                            <span class="chevron">›</span>
                        </div>

                        <div class="settings-item action-item" id="generate-backup-codes">
                            <div class="item-info">
                                <span class="item-label">Backup Codes</span>
                                <span class="item-description">Generate recovery codes for your vault.</span>
                            </div>
                            <span class="chevron">›</span>
                        </div>
                    </div>

                    <div class="settings-group">
                        <h2 class="group-title">Data Management</h2>
                        <div class="data-actions">
                            <button id="import-btn" class="settings-btn secondary-btn"><span class="btn-icon">📥</span> Import</button>
                            <button id="export-btn" class="settings-btn secondary-btn"><span class="btn-icon">📤</span> Export</button>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <p class="security-note">Version 1.0.0 • Cryptono Secure</p>
                </div>

                ${this.passwordChange.getModalTemplate()}
                ${this.pinSetup.getModalTemplate()}
                ${this.backupCodesSetup.getModalTemplate()} </div>
        `;
    }

    async afterRender() {
        document.getElementById('back-to-passwords')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigate('/passwords');
        });

        // Initialize Sub-modules
        this.pinSetup.bindEvents();
        this.passwordChange.bindEvents();
        this.dataManagement.bindEvents();
        this.backupCodesSetup.bindEvents();

        // Simple Logic (Theme & Auto-lock) handled locally
        await this.handleGlobalSettings();
    }

    private async handleGlobalSettings() {
        const autoLockToggle = document.getElementById('auto-lock-toggle') as HTMLInputElement;
        const autoLockControls = document.getElementById('auto-lock-controls');
        const lockInput = document.getElementById('lock-input') as HTMLInputElement;
        const btnMinus = document.getElementById('decrease-lock');
        const btnPlus = document.getElementById('increase-lock');
        const darkModeToggle = document.getElementById('dark-mode-toggle') as HTMLInputElement;

        const storageData = await chrome.storage.local.get(['theme', 'autoLockEnabled', 'lockTime']);

        // Theme
        const isDark = storageData.theme !== 'light';
        if (darkModeToggle) {
            darkModeToggle.checked = isDark;
            darkModeToggle.addEventListener('change', async () => {
                const newTheme = darkModeToggle.checked ? 'dark' : 'light';
                if (newTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
                else document.documentElement.removeAttribute('data-theme');
                await chrome.storage.local.set({ theme: newTheme });
            });
        }

        // Auto-Lock
        const isAutoLockEnabled = storageData.autoLockEnabled !== false;
        if (autoLockToggle && autoLockControls) {
            autoLockToggle.checked = isAutoLockEnabled;
            if (isAutoLockEnabled) autoLockControls.classList.remove('hidden');

            autoLockToggle.addEventListener('change', async () => {
                const isEnabled = autoLockToggle.checked;
                if (isEnabled) {
                    autoLockControls.classList.remove('hidden');
                } else {
                    autoLockControls.classList.add('hidden');
                }
                await chrome.storage.local.set({ autoLockEnabled: isEnabled });
            });
        }

        // Counter
        if (lockInput && btnMinus && btnPlus) {
            lockInput.value = (storageData.lockTime || 15).toString();
            const updateLock = async (val: number) => {
                lockInput.value = val.toString();
                await chrome.storage.local.set({ lockTime: val });
            };
            btnMinus.addEventListener('click', () => {
                const val = parseInt(lockInput.value);
                if (val > 1) updateLock(val - 1);
            });
            btnPlus.addEventListener('click', () => {
                const val = parseInt(lockInput.value);
                if (val < 60) updateLock(val + 1);
            });
        }
    }
}