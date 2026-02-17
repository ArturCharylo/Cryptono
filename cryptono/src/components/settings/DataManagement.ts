import { vaultRepository } from '../../repositories/VaultRepository';
import { showToastMessage, ToastType } from '../../utils/messages';

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
    }

    private handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.classList.add('hidden'); // class instead of style display:none

        input.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (!target.files || target.files.length === 0) return;

            const file = target.files[0];
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const jsonContent = event.target?.result as string;
                    const importedItems = JSON.parse(jsonContent);

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
            reader.readAsText(file);
        };
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
}