import { vaultRepository } from '../../repositories/VaultRepository';
import { showToastMessage, ToastType } from '../../utils/messages';
import initWasm, { compress_brotli, decompress_brotli } from '../../wasm/cryptono_zip';

export class DataManagement {
    constructor(private importBtnId: string, private exportBtnId: string) {}

    bindEvents() {
        const importBtn = document.getElementById(this.importBtnId);
        const exportBtn = document.getElementById(this.exportBtnId);

        exportBtn?.addEventListener('click', () => this.handleExport());
        importBtn?.addEventListener('click', () => this.handleImport());
    }

    private async handleExport() {
        try {
            const items = await vaultRepository.getAllItems();
            if (!items || items.length === 0) {
                showToastMessage('No items to export.', ToastType.NORMAL, 3000);
                return;
            }

            const dataStr = JSON.stringify(items, null, 2);

            // The imported WASM module is written in Rust and compiled to WebAssembly.
            // It provides Brotli compression and decompression functions.
            await initWasm('/cryptono_zip_bg.wasm');

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

        } catch (error) {
            console.error('Export failed:', error);
            showToastMessage('Failed to export data.', ToastType.ERROR, 3000);
        }
    }

    private handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.bin,.json'; 
        input.classList.add('hidden'); 

        input.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (!target.files || target.files.length === 0) return;

            const file = target.files[0];
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const resultBuffer = event.target?.result as ArrayBuffer;

                    await initWasm('/cryptono_zip_bg.wasm');

                    const uint8Array = new Uint8Array(resultBuffer);
                    
                    // Decompress the data
                    const decompressedBytes = decompress_brotli(uint8Array);
                    
                    // Convert Uint8Array back to string
                    const decoder = new TextDecoder();
                    const decompressedStr = decoder.decode(decompressedBytes);
                    
                    const importedItems = JSON.parse(decompressedStr);

                    if (!Array.isArray(importedItems)) throw new Error('Invalid format');

                    const existingItems = await vaultRepository.getAllItems();
                    const existingSignatures = new Set(existingItems.map(item => `${item.username}|${item.url}`));

                    let count = 0;
                    let skipped = 0;

                    for (const item of importedItems) {
                        if (item.site || item.url) {
                            const itemUrl = item.url || item.site;
                            const itemUser = item.username || '';
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
                    showToastMessage('Failed to import file.', ToastType.ERROR, 3000);
                }
            };
            
            reader.readAsArrayBuffer(file);
        };
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
}