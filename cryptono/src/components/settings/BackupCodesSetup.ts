// src/components/settings/BackupCodesSetup.ts
import { BackupService } from '../../services/BackupService';

export class BackupCodesSetup {
    private triggerId: string;
    private isGenerating: boolean = false;

    constructor(triggerId: string) {
        this.triggerId = triggerId;
    }

    // Modal template to be injected into Settings view
    public getModalTemplate(): string {
        return `
            <div id="backup-codes-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3 style="margin: 0;">Generate Backup Codes</h3>
                        <button class="close-modal btn-secondary" id="close-backup-codes-modal" style="border: none; background: transparent; font-size: 1.5rem; cursor: pointer;">&times;</button>
                    </div>
                    
                    <div class="modal-body" id="backup-codes-body">
                        <p class="modal-description warning-text">
                            These codes allow you to recover your vault if you lose your Master Password. 
                            <strong>Do not lose them</strong>, and keep them in a safe place.
                        </p>
                        
                        <div class="modal-actions" style="justify-content: center;">
                            <button id="btn-generate-codes" class="btn btn-primary" style="width: 100%;">
                                Generate Codes
                            </button>
                        </div>
                        
                        <div id="codes-result-container" class="hidden">
                            <p class="modal-description success-text">Your backup codes have been generated. You will need at least 3 of these to recover your vault.</p>
                            
                            <div id="codes-grid" class="codes-grid">
                                </div>
                            
                            <div class="modal-actions" style="justify-content: center; margin-top: 16px;">
                                <button id="btn-copy-codes" class="btn btn-secondary" style="width: 100%;">Copy to Clipboard</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Attach event listeners after rendering
    public bindEvents(): void {
        const triggerBtn = document.getElementById(this.triggerId);
        const modal = document.getElementById('backup-codes-modal');
        const closeBtn = document.getElementById('close-backup-codes-modal');
        const generateBtn = document.getElementById('btn-generate-codes');
        const copyBtn = document.getElementById('btn-copy-codes');

        triggerBtn?.addEventListener('click', () => {
            this.resetModalState();
            // Added: Use 'active' class to show modal according to settings.css
            modal?.classList.add('active');
        });

        closeBtn?.addEventListener('click', () => {
            // Added: Remove 'active' class to hide modal
            modal?.classList.remove('active');
        });

        // Close on clicking outside the modal content
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        generateBtn?.addEventListener('click', async () => {
            if (this.isGenerating) return;
            this.isGenerating = true;
            
            const originalText = generateBtn.textContent;
            generateBtn.textContent = 'Generating...';
            generateBtn.setAttribute('disabled', 'true');

            try {
                // Generate 5 shares, 3 required to restore
                const codes = await BackupService.generateCodes(3, 5);
                this.displayCodes(codes);
            } catch (error) {
                console.error("Backup codes generation failed:", error);
                alert("Failed to generate codes. Ensure your vault is unlocked.");
            } finally {
                this.isGenerating = false;
                if (originalText) generateBtn.textContent = originalText;
                generateBtn.removeAttribute('disabled');
            }
        });

        copyBtn?.addEventListener('click', () => {
            this.copyCodesToClipboard();
        });
    }

    // Render generated codes into the DOM
    private displayCodes(codes: string[]): void {
        const resultContainer = document.getElementById('codes-result-container');
        const codesGrid = document.getElementById('codes-grid');
        const generateBtn = document.getElementById('btn-generate-codes');

        if (!resultContainer || !codesGrid || !generateBtn) return;

        codesGrid.innerHTML = ''; // Clear previous content

        codes.forEach((code, index) => {
            const codeItem = document.createElement('div');
            codeItem.className = 'backup-code-item';
            
            const indexSpan = document.createElement('span');
            indexSpan.className = 'code-index';
            indexSpan.textContent = `${index + 1}.`;
            
            const codeSpan = document.createElement('span');
            codeSpan.className = 'code-value';
            codeSpan.textContent = code;

            codeItem.appendChild(indexSpan);
            codeItem.appendChild(codeSpan);
            codesGrid.appendChild(codeItem);
        });

        // Hide generation button and show results
        generateBtn.classList.add('hidden');
        resultContainer.classList.remove('hidden');
    }

    // Helper to clear UI state when reopening the modal
    private resetModalState(): void {
        const resultContainer = document.getElementById('codes-result-container');
        const generateBtn = document.getElementById('btn-generate-codes');
        const codesGrid = document.getElementById('codes-grid');

        if (resultContainer) resultContainer.classList.add('hidden');
        if (generateBtn) generateBtn.classList.remove('hidden');
        if (codesGrid) codesGrid.innerHTML = '';
    }

    // Extract text from grid and copy to clipboard
    private async copyCodesToClipboard(): Promise<void> {
        const codesGrid = document.getElementById('codes-grid');
        const copyBtn = document.getElementById('btn-copy-codes');
        if (!codesGrid || !copyBtn) return;

        const codeElements = codesGrid.querySelectorAll('.code-value');
        const codesArray = Array.from(codeElements).map((el, i) => `${i + 1}. ${el.textContent}`);
        
        const textToCopy = `Cryptono Vault Recovery Codes:\n\n${codesArray.join('\n')}\n\nKeep these safe. You need 3 codes to restore access.`;

        try {
            await navigator.clipboard.writeText(textToCopy);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                if (originalText) copyBtn.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert("Failed to copy to clipboard.");
        }
    }
}