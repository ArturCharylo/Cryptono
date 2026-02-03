import { vaultRepository } from '../repositories/VaultRepository';
import { userRepository } from '../repositories/UserRepository';
import { cryptoService } from '../services/CryptoService';
import { buffToBase64, base64ToBuff } from '../utils/buffer';
import { showToastMessage, ToastType } from '../utils/messages';
import { passwordRegex } from '../validation/validate';

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
                            <span class="chevron">›</span>
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

                <div id="password-modal" class="modal">
                    <div class="modal-content">
                        <h3>Change Master Password</h3>
                        <div class="form-group">
                            <label>Current Password</label>
                            <input type="password" id="old-pass" class="modal-input" placeholder="Current Password">
                        </div>
                        <div class="form-group">
                            <label>New Password</label>
                            <input type="password" id="new-pass" class="modal-input" placeholder="New Password">
                        </div>
                        <div class="form-group">
                            <label>Confirm New Password</label>
                            <input type="password" id="confirm-pass" class="modal-input" placeholder="Confirm New Password">
                        </div>
                        
                        <p id="modal-error-msg" class="modal-error-text"></p>

                        <div class="modal-actions">
                            <button id="cancel-pass" class="btn-secondary">Cancel</button>
                            <button id="save-pass" class="btn-primary">Update</button>
                        </div>
                    </div>
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
        
        // Password Modal Elements
        const changePassBtn = document.getElementById('change-master-password');
        const modal = document.getElementById('password-modal');
        const cancelBtn = document.getElementById('cancel-pass');
        const saveBtn = document.getElementById('save-pass');
        
        const oldPassInput = document.getElementById('old-pass') as HTMLInputElement;
        const newPassInput = document.getElementById('new-pass') as HTMLInputElement;
        const confirmPassInput = document.getElementById('confirm-pass') as HTMLInputElement;
        const modalErrorMsg = document.getElementById('modal-error-msg');

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

      // --- EXPORT FUNCTIONALITY ---
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                try {
                    const items = await vaultRepository.getAllItems();

                    if (!items || items.length === 0) {
                        showToastMessage('No items to export.', ToastType.NORMAL, 3000);
                        return;
                    }

                    const dataStr = JSON.stringify(items, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);

                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `cryptono_backup_${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(a);
                    a.click();

                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                } catch (error) {
                    console.error('Export failed:', error);
                    showToastMessage('Failed to export data.', ToastType.ERROR, 3000);
                }
            });
        }

        // --- IMPORT FUNCTIONALITY ---
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.style.display = 'none';

                input.onchange = async (e: Event) => {
                    const target = e.target as HTMLInputElement;
                    if (!target.files || target.files.length === 0) return;

                    const file = target.files[0];
                    const reader = new FileReader();

                    reader.onload = async (event) => {
                        try {
                            const jsonContent = event.target?.result as string;
                            const importedItems = JSON.parse(jsonContent);

                            if (!Array.isArray(importedItems)) {
                                throw new Error('Invalid backup format: root must be an array');
                            }

                            // 1. FETCH EXISTING DATA
                            // Fetch everything once to avoid querying the DB for every item (performance)
                            const existingItems = await vaultRepository.getAllItems();
                            
                            // 2. CREATE A SET OF UNIQUE KEYS
                            // Create a "signature" for each item: "username|url"
                            const existingSignatures = new Set(
                                existingItems.map(item => `${item.username}|${item.url}`)
                            );

                            let count = 0;
                            let skipped = 0;

                            for (const item of importedItems) {
                                // Basic fields validation
                                if (item.site || item.url && item.username && item.password) {
                                    
                                    const itemUrl = item.url || item.site;
                                    const itemUser = item.username;

                                    // 3. CHECK FOR DUPLICATES
                                    // Create a signature for the imported item
                                    const signature = `${itemUser}|${itemUrl}`;

                                    if (existingSignatures.has(signature)) {
                                        skipped++;
                                        console.log(`Skipping duplicate: ${itemUser} at ${itemUrl}`);
                                        continue; // Skip to the next item, do not add this one
                                    }

                                    // Important: Generate new ID to avoid conflicts.
                                    const newItem = {
                                        id: crypto.randomUUID(),
                                        url: itemUrl, // Using normalized variable
                                        username: itemUser,
                                        password: item.password,
                                        createdAt: Date.now(),
                                        note: item.note || '',
                                        fields: item.fields || []
                                    };

                                    await vaultRepository.addItem(newItem);
                                    count++;
                                }
                            }

                            // 4. SHOW RESULT MESSAGE
                            if (skipped > 0) {
                                showToastMessage(`Imported ${count} items. Skipped ${skipped} duplicates.`, ToastType.SUCCESS, 4000);
                            } else {
                                showToastMessage(`Successfully imported ${count} items!`, ToastType.SUCCESS, 3000);
                            }

                        } catch (error) {
                            console.error('Import error:', error);
                            showToastMessage('Failed to import file.', ToastType.ERROR, 3000);
                        }
                    };

                    reader.readAsText(file);
                };

                document.body.appendChild(input);
                input.click();
                document.body.removeChild(input);
            });
        }
        // --- PASSWORD CHANGE LOGIC ---
        
        // Helper to set text in modal
        const setModalError = (msg: string) => {
            if (modalErrorMsg) {
                modalErrorMsg.textContent = msg;
                modalErrorMsg.style.display = msg ? 'block' : 'none';
            }
        };

        if (changePassBtn && modal) {
            changePassBtn.addEventListener('click', () => {
                modal.classList.add('active');
                setModalError(''); // Clear previous errors
                oldPassInput.focus();
            });
        }

        const closeModal = () => {
            if (modal) modal.classList.remove('active');
            oldPassInput.value = '';
            newPassInput.value = '';
            confirmPassInput.value = '';
            setModalError(''); // Clear errors on close
        };

        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const oldPass = oldPassInput.value;
                const newPass = newPassInput.value;
                const confirmPass = confirmPassInput.value;

                // Clear previous errors
                setModalError('');

                if (!oldPass || !newPass || !confirmPass) {
                    setModalError('Please fill all fields');
                    return;
                }
                if (newPass !== confirmPass) {
                    setModalError('New passwords do not match');
                    return;
                }
                
                // Regex validation for password strength
                if (!passwordRegex.test(newPass)) {
                    setModalError('Password too weak: 8+ chars, Upper, Lower, Number & Special required');
                    return;
                }

                try {
                    saveBtn.innerText = "Verifying...";
                    (saveBtn as HTMLButtonElement).disabled = true;

                    // 1. Get user data
                    const currentUser = await userRepository.getCurrentUser();
                    
                    // 2. Verfiy old password
                    const oldSalt = base64ToBuff(currentUser.salt);
                    const oldMasterKey = await cryptoService.deriveMasterKey(oldPass, oldSalt);
                    
                    let decryptedVaultKey: CryptoKey;
                    try {
                        decryptedVaultKey = await cryptoService.decryptAndImportVaultKey(
                            currentUser.encryptedVaultKey, 
                            oldMasterKey
                        );
                    } catch (error: unknown) {
                        
                        // We use Type Guards to check if the error is a DOMException or Error object
                        // This allows TS to safely access properties like .name or .message
                        const isDomException = error instanceof DOMException;
                        const isError = error instanceof Error;

                        // Web Crypto API typically throws DOMException with name 'OperationError' for decryption failures
                        if ((isDomException || isError) && error.name === 'OperationError') {
                            
                            setModalError('Incorrect current password');
                            
                            // Reset UI state
                            saveBtn.innerText = "Update";
                            (saveBtn as HTMLButtonElement).disabled = false;
                            
                            // Clear and focus old password field
                            oldPassInput.value = '';
                            oldPassInput.focus();
                            return; 
                        }

                        // Safe error logging (avoiding 'any' cast)
                        if (isError || isDomException) {
                             console.error('Password change failed:', error.name, error.message, error);
                        } else {
                             console.error('Password change failed (unknown type):', error);
                        }

                        // Re-throw if it's not the specific decryption/auth error we expect
                        throw error;
                    }

                    saveBtn.innerText = "Updating...";
                    
                    const newSalt = cryptoService.generateSalt();
                    const newMasterKey = await cryptoService.deriveMasterKey(newPass, newSalt);

                    const newEncryptedVaultKey = await cryptoService.exportAndEncryptVaultKey(
                        decryptedVaultKey, 
                        newMasterKey
                    );

                    await userRepository.updateMasterPasswordProtection(
                        currentUser.id, 
                        buffToBase64(newSalt), 
                        newEncryptedVaultKey
                    );
                    
                    // Success!
                    closeModal();
                    showToastMessage('Master Password updated successfully!', ToastType.SUCCESS, 3000);

                } catch (error: unknown) {
                    // Safe error logging for outer catch
                    if (error instanceof Error || error instanceof DOMException) {
                        console.error('Password change failed:', error.name, error.message);
                    } else {
                        console.error('Password change failed:', error);
                    }
                    setModalError('An error occurred while updating password.');
                } finally {
                    saveBtn.innerText = "Update";
                    if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = false;
                }
            });
        }
    }
}