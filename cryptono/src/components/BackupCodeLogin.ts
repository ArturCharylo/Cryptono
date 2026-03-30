import { showToastMessage, ToastType } from '../utils/messages';
import { BackupService } from '../services/BackupService';
import { passwordRegex } from '../validation/validate';
import { userRepository } from '../repositories/UserRepository';
import { cryptoService } from '../services/CryptoService';
import { buffToBase64 } from '../utils/buffer';
import { SessionService } from '../services/SessionService';

export class BackupCodeLogin {
    private navigate: (path: string) => void;
    private triggerId: string;
    private isProcessing: boolean = false;
    private tempRecoveredVaultKey: CryptoKey | null = null;

    constructor(triggerId: string, navigate: (path: string) => void) {
        this.triggerId = triggerId;
        this.navigate = navigate;
    }

    public getModalTemplate(): string {
        return `
            <div id="backup-login-modal" class="modal">
                <div class="modal-content backup-modal-content" style="max-width: 350px;">
                    <div class="modal-header backup-modal-header">
                        <h3 id="backup-modal-title">Vault Recovery</h3>
                        <button class="close-modal btn-secondary close-backup-btn" id="close-backup-login">&times;</button>
                    </div>
                    
                    <div class="modal-body">
                        <div id="step-1-codes">
                            <p class="modal-description">
                                Enter 3 of your backup codes to recover your vault.
                            </p>
                            
                            <form id="backup-recovery-form" class="backup-recovery-form">
                                <div class="backup-inputs-container">
                                    <div class="input-group">
                                        <label for="backup-code-1">Code 1</label>
                                        <input type="text" id="backup-code-1" class="form-input backup-code-input" placeholder="e.g. aB3dE..." autocomplete="off" required />
                                    </div>
                                    <div class="input-group">
                                        <label for="backup-code-2">Code 2</label>
                                        <input type="text" id="backup-code-2" class="form-input backup-code-input" placeholder="e.g. xY9zQ..." autocomplete="off" required />
                                    </div>
                                    <div class="input-group">
                                        <label for="backup-code-3">Code 3</label>
                                        <input type="text" id="backup-code-3" class="form-input backup-code-input" placeholder="e.g. pL2mN..." autocomplete="off" required />
                                    </div>
                                </div>
                                
                                <button type="submit" class="login-btn backup-submit-btn" id="submit-backup-codes">
                                    <span class="btn-text">Verify Codes</span>
                                    <div class="btn-loader hidden" id="backup-loader">
                                        <div class="spinner"></div>
                                    </div>
                                </button>
                            </form>
                        </div>

                        <div id="step-2-reset" class="hidden">
                            <p class="modal-description" style="color: var(--color-success);">
                                ✅ Vault unlocked! Please set a new Master Password immediately.
                            </p>
                            
                            <form id="password-reset-form" class="backup-recovery-form">
                                <div class="backup-inputs-container">
                                    <div class="input-group">
                                        <label for="reset-new-pass">New Password</label>
                                        <input type="password" id="reset-new-pass" class="form-input" placeholder="New Master Password" required />
                                    </div>
                                    <div class="input-group">
                                        <label for="reset-confirm-pass">Confirm Password</label>
                                        <input type="password" id="reset-confirm-pass" class="form-input" placeholder="Confirm New Password" required />
                                    </div>
                                </div>
                                
                                <p id="reset-error-msg" class="modal-error-text hidden"></p>

                                <button type="submit" class="login-btn backup-submit-btn" id="submit-reset-password">
                                    <span class="btn-text">Set New Password & Login</span>
                                    <div class="btn-loader hidden" id="reset-loader">
                                        <div class="spinner"></div>
                                    </div>
                                </button>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        `;
    }

    public bindEvents(): void {
        const triggerBtn = document.getElementById(this.triggerId);
        const modal = document.getElementById('backup-login-modal');
        const closeBtn = document.getElementById('close-backup-login');
        
        const recoveryForm = document.getElementById('backup-recovery-form') as HTMLFormElement;
        const resetForm = document.getElementById('password-reset-form') as HTMLFormElement;

        // Open Modal
        triggerBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.resetToStep1();
            modal?.classList.add('active');
            document.getElementById('backup-code-1')?.focus();
        });

        // Close Modal
        closeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleClose(modal);
        });

        // Close on outside click
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.handleClose(modal);
            }
        });

        // --- STEP 1: Process Backup Codes ---
        recoveryForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.isProcessing) return;

            const code1 = (document.getElementById('backup-code-1') as HTMLInputElement).value.trim();
            const code2 = (document.getElementById('backup-code-2') as HTMLInputElement).value.trim();
            const code3 = (document.getElementById('backup-code-3') as HTMLInputElement).value.trim();

            if (!code1 || !code2 || !code3) {
                showToastMessage('Please enter all 3 required codes.', ToastType.ERROR, 3000);
                return;
            }

            this.setLoadingState(true, 'submit-backup-codes', 'backup-loader');

            try {
                this.tempRecoveredVaultKey = await BackupService.recoverVaultWithoutSaving([code1, code2, code3]);
                
                // Show Step 2
                this.showStep2();
            } catch (error) {
                console.error('Recovery failed:', error);
                showToastMessage('Invalid backup codes. Please try again.', ToastType.ERROR, 3000);
                this.clearCodeInputs();
            } finally {
                this.setLoadingState(false, 'submit-backup-codes', 'backup-loader');
            }
        });

        // --- STEP 2: Handle Password Reset ---
        resetForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.isProcessing) return;
            if (!this.tempRecoveredVaultKey) {
                 showToastMessage('Critical error: Vault key lost. Please restart recovery.', ToastType.ERROR, 3000);
                 this.resetToStep1();
                 return;
            }

            const newPass = (document.getElementById('reset-new-pass') as HTMLInputElement).value;
            const confirmPass = (document.getElementById('reset-confirm-pass') as HTMLInputElement).value;
            const errorMsgEl = document.getElementById('reset-error-msg');

            const setError = (msg: string) => {
                if (errorMsgEl) {
                    errorMsgEl.textContent = msg;
                    errorMsgEl.classList.remove('hidden');
                }
            };

            if (errorMsgEl) errorMsgEl.classList.add('hidden');

            if (!newPass || !confirmPass) return setError('Please fill all fields');
            if (newPass !== confirmPass) return setError('Passwords do not match');
            if (!passwordRegex.test(newPass)) return setError('Password too weak (8+ chars, Upper, Lower, Number & Special)');

            this.setLoadingState(true, 'submit-reset-password', 'reset-loader');

            try {
                // 1. Get current user ID to update their DB record
                // (Assuming the user exists if they are at the login screen recovering)
                const candidateId = await SessionService.getInstance().getLastActiveUser();
                
                if (!candidateId) {
                    throw new Error("No active user found to reset password for.");
                }

                // 2. Generate new cryptographic materials based on the new password
                const newSalt = cryptoService.generateSalt();
                const newMasterKey = await cryptoService.deriveMasterKey(newPass, newSalt);
                
                // 3. Re-encrypt the recovered VaultKey with the new MasterKey
                const newEncryptedVaultKey = await cryptoService.exportAndEncryptVaultKey(this.tempRecoveredVaultKey, newMasterKey);

                // 4. Save the new configuration to the DB
                await userRepository.updateMasterPasswordProtection(
                    candidateId,
                    buffToBase64(newSalt),
                    newEncryptedVaultKey
                );

                // 5. Save the recovered vault key to the active session so they are logged in
                await SessionService.getInstance().saveSession(this.tempRecoveredVaultKey);

                // Cleanup
                this.tempRecoveredVaultKey = null;
                modal?.classList.remove('active');
                showToastMessage('Password reset successfully! Logging in...', ToastType.SUCCESS, 3000);
                
                // 6. Navigate into the app
                this.navigate('/passwords');

            } catch (error) {
                console.error(error);
                setError('An error occurred while resetting password.');
            } finally {
                this.setLoadingState(false, 'submit-reset-password', 'reset-loader');
            }
        });
    }

    private handleClose(modal: HTMLElement | null) {
        // If they close during step 2, we should wipe the temporary key for safety
        if (this.tempRecoveredVaultKey) {
            this.tempRecoveredVaultKey = null;
        }
        modal?.classList.remove('active');
    }

    private showStep2(): void {
        document.getElementById('step-1-codes')?.classList.add('hidden');
        document.getElementById('step-2-reset')?.classList.remove('hidden');
        document.getElementById('backup-modal-title')!.textContent = 'Set New Password';
        document.getElementById('reset-new-pass')?.focus();
    }

    private resetToStep1(): void {
        this.clearCodeInputs();
        (document.getElementById('reset-new-pass') as HTMLInputElement).value = '';
        (document.getElementById('reset-confirm-pass') as HTMLInputElement).value = '';
        document.getElementById('reset-error-msg')?.classList.add('hidden');
        
        document.getElementById('step-2-reset')?.classList.add('hidden');
        document.getElementById('step-1-codes')?.classList.remove('hidden');
        document.getElementById('backup-modal-title')!.textContent = 'Vault Recovery';
        
        this.tempRecoveredVaultKey = null;
        this.setLoadingState(false, 'submit-backup-codes', 'backup-loader');
        this.setLoadingState(false, 'submit-reset-password', 'reset-loader');
    }

    private setLoadingState(isLoading: boolean, btnId: string, loaderId: string): void {
        this.isProcessing = isLoading;
        const submitBtn = document.getElementById(btnId) as HTMLButtonElement;
        const loader = document.getElementById(loaderId);

        if (isLoading) {
            submitBtn?.classList.add('loading');
            if (submitBtn) submitBtn.disabled = true;
            loader?.classList.remove('hidden');
        } else {
            submitBtn?.classList.remove('loading');
            if (submitBtn) submitBtn.disabled = false;
            loader?.classList.add('hidden');
        }
    }

    private clearCodeInputs(): void {
        const inputs = document.querySelectorAll('.backup-code-input') as NodeListOf<HTMLInputElement>;
        inputs.forEach(input => input.value = '');
        document.getElementById('backup-code-1')?.focus();
    }
}