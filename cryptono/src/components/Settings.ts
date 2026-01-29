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
                                <span class="item-label">Auto-lock</span>
                                <span class="item-description">Lock the vault after inactivity.</span>
                            </div>
                            <label class="switch">
                                <input type="checkbox" id="auto-lock-toggle">
                                <span class="slider"></span>
                            </label>
                        </div>

                        <div class="settings-item sub-item" id="auto-lock-controls">
                            <div class="item-info">
                                <span class="item-label">Timeout (minutes)</span>
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
                                <input type="checkbox" id="dark-mode-toggle">
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

    async afterRender() {
        // Elements
        const autoLockToggle = document.getElementById('auto-lock-toggle') as HTMLInputElement;
        const autoLockControls = document.getElementById('auto-lock-controls');
        const lockInput = document.getElementById('lock-input') as HTMLInputElement;
        const btnMinus = document.getElementById('decrease-lock');
        const btnPlus = document.getElementById('increase-lock');
        
        const backBtn = document.getElementById('back-to-passwords');
        const importBtn = document.getElementById('import-btn');
        const exportBtn = document.getElementById('export-btn');
        const darkModeToggle = document.getElementById('dark-mode-toggle') as HTMLInputElement;

        // --- Load Initial State from Storage ---
        // Retrieving: theme, autoLockEnabled (bool), lockTime (number)
        const storageData = await chrome.storage.local.get(['theme', 'autoLockEnabled', 'lockTime']);
        
        // 1. Theme Logic
        const isDark = storageData.theme !== 'light'; 
        darkModeToggle.checked = isDark;

        // 2. Auto-lock Logic
        const isAutoLockEnabled = storageData.autoLockEnabled !== false; // Default to true if undefined
        const currentLockTime = storageData.lockTime || 15; // Default to 15 if undefined

        if (autoLockToggle) {
            autoLockToggle.checked = isAutoLockEnabled;
            // Show/Hide controls based on initial state
            if (autoLockControls) {
                autoLockControls.style.display = isAutoLockEnabled ? 'flex' : 'none';
            }
        }
        if (lockInput) {
            lockInput.value = currentLockTime.toString();
        }


        // --- Event Listeners ---

        // Back navigation
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate('/passwords');
            });
        }

        // Toggle Auto-lock ON/OFF
        if (autoLockToggle && autoLockControls) {
            autoLockToggle.addEventListener('change', async () => {
                const isEnabled = autoLockToggle.checked;
                
                // Toggle visibility of the counter
                autoLockControls.style.display = isEnabled ? 'flex' : 'none';

                // Save state to storage
                await chrome.storage.local.set({ autoLockEnabled: isEnabled });
            });
        }

        // Lock counter logic (Increase/Decrease)
        const updateLockTime = async (newValue: number) => {
            if (lockInput) {
                lockInput.value = newValue.toString();
                // Save new time to storage
                await chrome.storage.local.set({ lockTime: newValue });
            }
        };

        if (lockInput && btnMinus && btnPlus) {
            btnMinus.addEventListener('click', () => {
                const val = parseInt(lockInput.value);
                if (val > parseInt(lockInput.min)) {
                    updateLockTime(val - 1);
                }
            });

            btnPlus.addEventListener('click', () => {
                const val = parseInt(lockInput.value);
                if (val < parseInt(lockInput.max)) {
                    updateLockTime(val + 1);
                }
            });
        }

        // Handle theme change
        darkModeToggle.addEventListener('change', async () => {
            const newTheme = darkModeToggle.checked ? 'dark' : 'light';
            
            if (newTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }

            await chrome.storage.local.set({ theme: newTheme });
        });

        // Placeholder actions for Import/Export
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                console.log('Import triggered');
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                console.log('Export triggered');
            });
        }
    }
}