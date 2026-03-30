// src/components/settings/BackupCodes.ts
import { BackupService } from '../../services/BackupService';
import { SessionService } from '../../services/SessionService';

export class BackupCodes {
    private container: HTMLElement;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'backup-codes-container'; 
    }

    public render(): HTMLElement {
        this.container.innerHTML = `
            <div class="settings-section">
                <h2>Backup Codes</h2>
                <p>Generate backup codes to recover your vault if you lose your master password. Keep them in a safe place.</p>
                <button id="generate-codes-btn" class="btn btn-primary">Generate Codes</button>
                <div id="codes-display" class="codes-grid hidden"></div>
            </div>
        `;

        this.attachEventListeners();
        return this.container;
    }

    private attachEventListeners(): void {
        const generateBtn = this.container.querySelector('#generate-codes-btn');
        generateBtn?.addEventListener('click', () => this.handleGenerate());
    }

    private async handleGenerate(): Promise<void> {
        try {
            // Verify if the vault is unlocked before proceeding
            // SessionService.getKey() will throw if the vaultKey is null
            SessionService.getInstance().getKey(); 
            
            // Generate 5 codes, require 3 to recover
            const codes = await BackupService.generateCodes(3, 5);
            this.displayCodes(codes);
        } catch (error) {
            console.error(error);
            alert("Vault is locked or session expired. Please unlock your vault first.");
        }
    }

    private displayCodes(codes: string[]): void {
        const displayDiv = this.container.querySelector('#codes-display');
        if (displayDiv) {
            displayDiv.innerHTML = ''; 
            displayDiv.classList.remove('hidden');

            codes.forEach((code, index) => {
                const codeElement = document.createElement('div');
                codeElement.className = 'backup-code-item'; 
                codeElement.textContent = `${index + 1}. ${code}`;
                displayDiv.appendChild(codeElement);
            });
        }
    }
}