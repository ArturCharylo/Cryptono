import { showToastMessage, ToastType } from '../utils/messages';
import { BackupService } from '../services/BackupService';

export class BackupCodeLogin {
    private navigate: (path: string) => void;
    private triggerId: string;
    private isRecovering: boolean = false;

    constructor(triggerId: string, navigate: (path: string) => void) {
        this.triggerId = triggerId;
        this.navigate = navigate;
    }

    public getModalTemplate(): string {
        return `
            <div id="backup-login-modal" class="modal">
                <div class="modal-content backup-modal-content">
                    <div class="modal-header backup-modal-header">
                        <h3>Vault Recovery</h3>
                        <button class="close-modal btn-secondary close-backup-btn" id="close-backup-login">&times;</button>
                    </div>
                    
                    <div class="modal-body">
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
                                <span class="btn-text">Recover Vault</span>
                                <div class="btn-loader hidden" id="backup-loader">
                                    <div class="spinner"></div>
                                </div>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    public bindEvents(): void {
        const triggerBtn = document.getElementById(this.triggerId);
        const modal = document.getElementById('backup-login-modal');
        const closeBtn = document.getElementById('close-backup-login');
        const form = document.getElementById('backup-recovery-form') as HTMLFormElement;

        // Open Modal
        triggerBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.resetForm();
            modal?.classList.add('active');
            document.getElementById('backup-code-1')?.focus();
        });

        // Close Modal
        closeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            modal?.classList.remove('active');
        });

        // Close on outside click
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        // Handle Submission
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.isRecovering) return;

            const code1 = (document.getElementById('backup-code-1') as HTMLInputElement).value.trim();
            const code2 = (document.getElementById('backup-code-2') as HTMLInputElement).value.trim();
            const code3 = (document.getElementById('backup-code-3') as HTMLInputElement).value.trim();

            if (!code1 || !code2 || !code3) {
                showToastMessage('Please enter all 3 required codes.', ToastType.ERROR, 3000);
                return;
            }

            this.setLoadingState(true);

            try {
                // TODO: Implement BackupService.recoverVault([code1, code2, code3])
                // await BackupService.recoverVault([code1, code2, code3]);
                
                // For now, simulate a network/crypto delay
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                showToastMessage('Vault recovered successfully!', ToastType.SUCCESS, 2000);
                modal?.classList.remove('active');
                this.navigate('/passwords');

            } catch (error) {
                console.error('Recovery failed:', error);
                showToastMessage('Invalid backup codes. Please try again.', ToastType.ERROR, 3000);
                this.clearInputs();
            } finally {
                this.setLoadingState(false);
            }
        });
    }

    private setLoadingState(isLoading: boolean): void {
        this.isRecovering = isLoading;
        const submitBtn = document.getElementById('submit-backup-codes') as HTMLButtonElement;
        const loader = document.getElementById('backup-loader');
        const inputs = document.querySelectorAll('.backup-code-input') as NodeListOf<HTMLInputElement>;

        if (isLoading) {
            submitBtn?.classList.add('loading');
            submitBtn.disabled = true;
            loader?.classList.remove('hidden');
            inputs.forEach(input => input.disabled = true);
        } else {
            submitBtn?.classList.remove('loading');
            submitBtn.disabled = false;
            loader?.classList.add('hidden');
            inputs.forEach(input => input.disabled = false);
        }
    }

    private clearInputs(): void {
        const inputs = document.querySelectorAll('.backup-code-input') as NodeListOf<HTMLInputElement>;
        inputs.forEach(input => input.value = '');
        document.getElementById('backup-code-1')?.focus();
    }

    private resetForm(): void {
        this.clearInputs();
        this.setLoadingState(false);
    }
}