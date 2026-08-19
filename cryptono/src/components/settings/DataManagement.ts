import { vaultRepository } from '../../repositories/VaultRepository';
import { showToastMessage, ToastType } from '../../utils/messages';
import initWasm, { compress_brotli, decompress_brotli, decompress_deflate } from '../../wasm/cryptono_zip';
import type { ImportedVaultItem } from '../../types'; 

export class DataManagement {
    private modal: HTMLElement | null = null;

    constructor(private importBtnId: string, private exportBtnId: string) {}

    getModalTemplate(): string {
        return `
        <div id="export-options-modal" class="modal">
            <div class="modal-content">
                <h3>Export Vault Data</h3>
                <p class="modal-description">Choose how you want to export your vault data.</p>
                <div class="modal-actions export-options-list">
                    <button id="export-bin-btn" class="btn-primary export-btn-full">Export Encrypted (.bin)</button>
                    <button id="export-json-btn" class="btn-primary export-btn-full">Export Unencrypted JSON (.json)</button>
                    <button id="export-cancel-btn" class="btn-secondary export-btn-full">Cancel</button>
                </div>
            </div>
        </div>`;
    }

    bindEvents() {
        const importBtn = document.getElementById(this.importBtnId);
        const exportBtn = document.getElementById(this.exportBtnId);

        this.modal = document.getElementById('export-options-modal');

        const exportBinBtn = document.getElementById('export-bin-btn');
        const exportJsonBtn = document.getElementById('export-json-btn');
        const exportCancelBtn = document.getElementById('export-cancel-btn');

        exportBtn?.addEventListener('click', () => this.openModal());
        importBtn?.addEventListener('click', () => this.handleImport());

        exportBinBtn?.addEventListener('click', () => this.handleExportEncrypted());
        exportJsonBtn?.addEventListener('click', () => this.handleExportJson());
        exportCancelBtn?.addEventListener('click', () => this.closeModal());
    }

    private openModal() {
        if (this.modal) {
            this.modal.classList.add('active');
        }
    }

    private closeModal() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
    }

    private async handleExportEncrypted() {
        try {
            const items = await vaultRepository.getAllItems();
            if (!items || items.length === 0) {
                showToastMessage('No items to export.', ToastType.NORMAL, 3000);
                return;
            }

            const dataStr = JSON.stringify(items, null, 2);

            // The imported WASM module is written in Rust and compiled to WebAssembly.
            // It provides Brotli compression and decompression functions.
            await initWasm({ module_or_path: '/cryptono_zip_bg.wasm' });

            // Convert string to Uint8Array for the Rust function
            const encoder = new TextEncoder();
            const dataBytes = encoder.encode(dataStr);

            // Compress the data using Brotli (quality: 11 is usually the max/standard for Brotli)
            const compressedData = compress_brotli(dataBytes, 11);

            // Wrap the data in a new standard Uint8Array to satisfy TypeScript strict types
            const standardBuffer = new Uint8Array(compressedData);

            const blob = new Blob([standardBuffer], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cryptono_backup_${new Date().toISOString().slice(0, 10)}.bin`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.closeModal();
        } catch (error) {
            console.error('Export failed:', error);
            showToastMessage('Failed to export data.', ToastType.ERROR, 3000);
        }
    }

    private async handleExportJson() {
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

            this.closeModal();
        } catch (error) {
            console.error('Export failed:', error);
            showToastMessage('Failed to export JSON data.', ToastType.ERROR, 3000);
        }
    }

    private handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        // Add all supported extensions here
        input.accept = '.bin,.json,.deflate,.csv'; 
        input.classList.add('hidden');

        input.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (!target.files || target.files.length === 0) return;

            const file = target.files[0];
            const reader = new FileReader();
            
            // Extract file extension and convert to lowercase
            const extension = file.name.split('.').pop()?.toLowerCase() || '';

            reader.onload = async (event) => {
                try {
                    let importedItems: ImportedVaultItem[] = [];

                    // Route the processing based on the file extension
                    switch (extension) {
                        case 'json': {
                            const jsonString = event.target?.result as string;
                            importedItems = JSON.parse(jsonString) as ImportedVaultItem[];
                            break;
                        }
                        case 'csv': {
                            const csvString = event.target?.result as string;
                            importedItems = this.parseCSV(csvString);
                            break;
                        }
                        case 'bin': {
                            // Handle Brotli compressed files
                            const resultBuffer = event.target?.result as ArrayBuffer;
                            await initWasm('/cryptono_zip_bg.wasm');
                            const uint8Array = new Uint8Array(resultBuffer);
                            const decompressedBytes = decompress_brotli(uint8Array);
                            
                            const decoder = new TextDecoder();
                            const jsonString = decoder.decode(decompressedBytes);
                            importedItems = JSON.parse(jsonString) as ImportedVaultItem[];
                            break;
                        }
                        case 'deflate': {
                            // Handle Deflate compressed files
                            const resultBuffer = event.target?.result as ArrayBuffer;
                            await initWasm('/cryptono_zip_bg.wasm');
                            const uint8Array = new Uint8Array(resultBuffer);
                            const decompressedBytes = decompress_deflate(uint8Array);
                            
                            const decoder = new TextDecoder();
                            const jsonString = decoder.decode(decompressedBytes);
                            importedItems = JSON.parse(jsonString) as ImportedVaultItem[];
                            break;
                        }
                        default:
                            throw new Error('Unsupported file format');
                    }

                    if (!Array.isArray(importedItems)) throw new Error('Invalid format: Expected an array of items.');

                    const existingItems = await vaultRepository.getAllItems();
                    const existingSignatures = new Set(existingItems.map(item => `${item.username}|${item.url}`));

                    let count = 0;
                    let skipped = 0;

                    for (const item of importedItems) {
                        // Check multiple possible keys used by different managers
                        const itemUrl = item.url || item.site || '';
                        const itemUser = item.username || item.login || '';

                        if (itemUrl || itemUser) {
                            const signature = `${itemUser}|${itemUrl}`;

                            if (existingSignatures.has(signature)) {
                                skipped++;
                                continue;
                            }

                            await vaultRepository.addItem({
                                id: crypto.randomUUID(),
                                url: itemUrl,
                                username: itemUser,
                                password: item.password || '',
                                createdAt: Date.now(),
                                note: item.note || '',
                                fields: item.fields || []
                            });
                            count++;
                        }
                    }

                    showToastMessage(`Imported ${count}, Skipped ${skipped} duplicates.`, ToastType.SUCCESS, 4000);
                } catch (error) {
                    console.error('Import error:', error);
                    showToastMessage('Failed to import file. Check format.', ToastType.ERROR, 3000);
                }
            };
            
            // Determine how to read the file depending on if it's text or binary
            const textFormats = ['json', 'csv'];
            if (textFormats.includes(extension)) {
                reader.readAsText(file);
            } else {
                reader.readAsArrayBuffer(file);
            }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    // Strictly typed CSV parser
    private parseCSV(csvString: string): ImportedVaultItem[] {
        const lines = csvString.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const result: ImportedVaultItem[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            
            // Temporary Record to store raw CSV row data
            const rawItem: Record<string, string> = {};
            
            headers.forEach((header, index) => {
                rawItem[header] = values[index] ? values[index].trim() : '';
            });
            
            // Map the raw string record to the defined interface
            const item: ImportedVaultItem = {
                url: rawItem['url'] || rawItem['site'],
                username: rawItem['username'] || rawItem['login'],
                password: rawItem['password'],
                note: rawItem['note'] || rawItem['notes']
            };
            
            result.push(item);
        }
        return result;
    }
}