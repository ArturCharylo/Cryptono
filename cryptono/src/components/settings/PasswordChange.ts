import { userRepository } from '../../repositories/UserRepository';
import { cryptoService } from '../../services/CryptoService';
import { base64ToBuff, buffToBase64 } from '../../utils/buffer';
import { showToastMessage, ToastType } from '../../utils/messages';
import { passwordRegex } from '../../validation/validate';

export class PasswordChange {
    private modal: HTMLElement | null = null;
    private errorMsg: HTMLElement | null = null;

    constructor(private triggerBtnId: string) {}

    getModalTemplate(): string {
        return `
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
                <p id="modal-error-msg" class="modal-error-text hidden"></p>
                <div class="modal-actions">
                    <button id="cancel-pass" class="btn-secondary">Cancel</button>
                    <button id="save-pass" class="btn-primary">Update</button>
                </div>
            </div>
        </div>`;
    }

    bindEvents() {
        const triggerBtn = document.getElementById(this.triggerBtnId);
        this.modal = document.getElementById('password-modal');
        this.errorMsg = document.getElementById('modal-error-msg');

        const saveBtn = document.getElementById('save-pass') as HTMLButtonElement;
        const cancelBtn = document.getElementById('cancel-pass');

        triggerBtn?.addEventListener('click', () => {
            if (this.modal) this.modal.classList.add('active');
            (document.getElementById('old-pass') as HTMLInputElement)?.focus();
        });

        cancelBtn?.addEventListener('click', () => this.closeModal());
        saveBtn?.addEventListener('click', () => this.handleChange(saveBtn));
    }

    private closeModal() {
        if (this.modal) this.modal.classList.remove('active');
        (document.getElementById('old-pass') as HTMLInputElement).value = '';
        (document.getElementById('new-pass') as HTMLInputElement).value = '';
        (document.getElementById('confirm-pass') as HTMLInputElement).value = '';
        if (this.errorMsg) this.errorMsg.classList.add('hidden');
    }

    private async handleChange(saveBtn: HTMLButtonElement) {
        const oldPass = (document.getElementById('old-pass') as HTMLInputElement).value;
        const newPass = (document.getElementById('new-pass') as HTMLInputElement).value;
        const confirmPass = (document.getElementById('confirm-pass') as HTMLInputElement).value;

        if (this.errorMsg) this.errorMsg.classList.add('hidden');

        if (!oldPass || !newPass || !confirmPass) return this.setError('Please fill all fields');
        if (newPass !== confirmPass) return this.setError('New passwords do not match');
        if (!passwordRegex.test(newPass)) return this.setError('Password too weak (8+ chars, Upper, Lower, Number & Special)');

        try {
            saveBtn.innerText = "Verifying...";
            saveBtn.disabled = true;

            const currentUser = await userRepository.getCurrentUser();
            const oldSalt = base64ToBuff(currentUser.salt);
            const oldMasterKey = await cryptoService.deriveMasterKey(oldPass, oldSalt);

            let decryptedVaultKey: CryptoKey;
            try {
                decryptedVaultKey = await cryptoService.decryptAndImportVaultKey(currentUser.encryptedVaultKey, oldMasterKey);
            } catch (_e) {
                saveBtn.innerText = "Update";
                saveBtn.disabled = false;
                return this.setError('Incorrect current password');
            }

            saveBtn.innerText = "Updating...";

            const newSalt = cryptoService.generateSalt();
            const newMasterKey = await cryptoService.deriveMasterKey(newPass, newSalt);
            const newEncryptedVaultKey = await cryptoService.exportAndEncryptVaultKey(decryptedVaultKey, newMasterKey);

            await userRepository.updateMasterPasswordProtection(
                currentUser.id,
                buffToBase64(newSalt),
                newEncryptedVaultKey
            );

            this.closeModal();
            showToastMessage('Master Password updated successfully!', ToastType.SUCCESS, 3000);

        } catch (error) {
            console.error(error);
            this.setError('An error occurred while updating password.');
        } finally {
            saveBtn.innerText = "Update";
            saveBtn.disabled = false;
        }
    }

    private setError(msg: string) {
        if (this.errorMsg) {
            this.errorMsg.textContent = msg;
            this.errorMsg.classList.remove('hidden');
        }
    }
}