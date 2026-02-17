import { SessionService } from '../../services/SessionService';
import { userRepository } from '../../repositories/UserRepository';
import { showToastMessage, ToastType } from '../../utils/messages';

export class PinSetup {
    private modal: HTMLElement | null = null;
    private pinInputs1: NodeListOf<HTMLInputElement> | null = null;
    private pinInputs2: NodeListOf<HTMLInputElement> | null = null;
    private errorMsg: HTMLElement | null = null;
    private saveBtn: HTMLButtonElement | null = null;
    private toggleSwitch: HTMLInputElement | null = null;

    constructor(toggleSwitchId: string) {
        this.toggleSwitch = document.getElementById(toggleSwitchId) as HTMLInputElement;
    }

    getModalTemplate(): string {
        return `
        <div id="pin-modal" class="modal">
            <div class="modal-content">
                <h3>Set up PIN Code</h3>
                <p class="modal-description">Enter a 4-digit PIN to quickly unlock your vault.</p>

                <div class="form-group">
                    <label>New PIN</label>
                    <div class="pin-input-container" id="pin-set-container-1">
                        <input type="text" class="pin-digit pin-1" maxlength="1" inputmode="numeric" data-index="0">
                        <input type="text" class="pin-digit pin-1" maxlength="1" inputmode="numeric" data-index="1">
                        <input type="text" class="pin-digit pin-1" maxlength="1" inputmode="numeric" data-index="2">
                        <input type="text" class="pin-digit pin-1" maxlength="1" inputmode="numeric" data-index="3">
                    </div>
                </div>

                <div class="form-group">
                    <label>Confirm PIN</label>
                    <div class="pin-input-container" id="pin-set-container-2">
                        <input type="text" class="pin-digit pin-2" maxlength="1" inputmode="numeric" data-index="0">
                        <input type="text" class="pin-digit pin-2" maxlength="1" inputmode="numeric" data-index="1">
                        <input type="text" class="pin-digit pin-2" maxlength="1" inputmode="numeric" data-index="2">
                        <input type="text" class="pin-digit pin-2" maxlength="1" inputmode="numeric" data-index="3">
                    </div>
                </div>

                <p id="pin-modal-error-msg" class="modal-error-text hidden"></p>

                <div class="modal-actions">
                    <button id="cancel-pin" class="btn-secondary">Cancel</button>
                    <button id="save-pin" class="btn-primary">Enable PIN</button>
                </div>
            </div>
        </div>`;
    }

    bindEvents() {
        this.modal = document.getElementById('pin-modal');
        this.errorMsg = document.getElementById('pin-modal-error-msg');
        this.saveBtn = document.getElementById('save-pin') as HTMLButtonElement;

        const cancelBtn = document.getElementById('cancel-pin');

        this.pinInputs1 = document.querySelectorAll('.pin-digit.pin-1');
        this.pinInputs2 = document.querySelectorAll('.pin-digit.pin-2');

        this.setupPinLogic(this.pinInputs1);
        this.setupPinLogic(this.pinInputs2);

        if (this.toggleSwitch) {
            SessionService.getInstance().hasPinConfigured().then(hasPin => {
                if (this.toggleSwitch) this.toggleSwitch.checked = hasPin;
            });

            this.toggleSwitch.addEventListener('change', async () => {
                if (this.toggleSwitch?.checked) {
                    this.openModal();
                } else {
                    this.disablePin();
                }
            });
        }

        cancelBtn?.addEventListener('click', () => this.closeModal());
        this.saveBtn?.addEventListener('click', () => this.handleSave());
    }

    private setupPinLogic(inputs: NodeListOf<HTMLInputElement>) {
        inputs.forEach((input, index) => {
            input.addEventListener('input', () => {
                if (!/^\d$/.test(input.value)) { input.value = ''; return; }
                if (this.errorMsg) {
                    this.errorMsg.textContent = '';
                    this.errorMsg.classList.add('hidden');
                }
                if (index < 3) inputs[index + 1].focus();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });

            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = e.clipboardData?.getData('text') || '';
                const nums = text.replace(/\D/g, '').slice(0, 4).split('');
                nums.forEach((n, i) => { if (inputs[i]) inputs[i].value = n; });
            });
        });
    }

    private openModal() {
        if (this.modal) this.modal.classList.add('active');
        this.resetInputs();
        this.pinInputs1?.[0]?.focus();
    }

    private closeModal() {
        if (this.modal) this.modal.classList.remove('active');
        SessionService.getInstance().hasPinConfigured().then(hasPin => {
            if (this.toggleSwitch) this.toggleSwitch.checked = hasPin;
        });
    }

    private resetInputs() {
        this.pinInputs1?.forEach(i => i.value = '');
        this.pinInputs2?.forEach(i => i.value = '');
        if (this.errorMsg) this.errorMsg.classList.add('hidden');
    }

    private getPinValue(inputs: NodeListOf<HTMLInputElement>): string {
        return Array.from(inputs).map(i => i.value).join('');
    }

    private async handleSave() {
        const pin1 = this.getPinValue(this.pinInputs1!);
        const pin2 = this.getPinValue(this.pinInputs2!);

        if (pin1.length !== 4 || pin2.length !== 4) {
            this.showError('Please fill all fields (4 digits)');
            return;
        }

        if (pin1 !== pin2) {
            this.showError('PINs do not match');
            this.pinInputs2?.forEach(i => i.value = '');
            this.pinInputs2?.[0].focus();
            return;
        }

        try {
            if (this.saveBtn) {
                this.saveBtn.textContent = 'Enabling...';
                this.saveBtn.disabled = true;
            }

            const currentUser = await userRepository.getCurrentUser();
            // Critical: passing userID to save PIN per user
            await SessionService.getInstance().enablePinUnlock(pin1, currentUser.id);

            if (this.modal) this.modal.classList.remove('active');
            showToastMessage('PIN login enabled!', ToastType.SUCCESS, 3000);

        } catch (err) {
            console.error(err);
            this.showError('Failed to save PIN.');
        } finally {
            if (this.saveBtn) {
                this.saveBtn.textContent = 'Enable PIN';
                this.saveBtn.disabled = false;
            }
        }
    }

    private async disablePin() {
        try {
            await SessionService.getInstance().disablePinUnlock();
            showToastMessage('PIN login disabled', ToastType.NORMAL, 2000);
        } catch (_e) {
            showToastMessage('Error disabling PIN', ToastType.ERROR, 2000);
            if (this.toggleSwitch) this.toggleSwitch.checked = true;
        }
    }

    private showError(msg: string) {
        if (this.errorMsg) {
            this.errorMsg.textContent = msg;
            this.errorMsg.classList.remove('hidden');
        }
    }
}