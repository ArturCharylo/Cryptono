import { vaultRepository } from '../repositories/VaultRepository';
import { SessionService } from '../services/SessionService';
import { showToastMessage, ToastType } from '../utils/messages';
import { AuditService } from '../services/AuditService';

export class Passwords {
    navigate: (path: string) => void;

    constructor(navigate: (path: string) => void) {
        this.navigate = navigate;
    }

    render() {
        return `
            <div class="container">
                <div class="header">
                    <div class="logo">
                        <div class="logo-icon">🔒</div>
                        <h1 class="extensionTitle">Cryptono</h1>
                        <a href="#" id="go-to-settings" class="settings-link">⚙️</a>
                    </div>
                </div>
                

                <div>
                    <div class="vault-header-group">
                        <h2 class="vault-title">Your Vault</h2>
                        <button id="add-test-btn" class="login-btn add-item-btn">+ Add Item</button>
                    </div>

                    <div class="table-wrapper">
                        <table class='password-table'>
                            <thead>
                                <tr>
                                    <th>Site</th>
                                    <th>Username</th>
                                    <th>Password</th>
                                    <th id="action-header">Action</th>
                                </tr>
                            </thead>
                            <tbody id="password-list">
                                <tr><td colspan="4" class="state-message">Loading vault...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="logout-container">
                        <button id="logout-btn" class="login-btn">Logout</button>
                    </div>
                </div>
                
                <div class="footer">
                    <p class="security-note">🔐 Encrypted & Secure</p>
                </div>
            </div>
        `;
    }

    afterRender() {
        this.loadItems();
        // Navigate to Settings on click
        const settingsLink = document.getElementById('go-to-settings');
        if (settingsLink) {
            settingsLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate('/settings');
            });
        }

        // Handle Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                // 1. Clear key from memory
                SessionService.getInstance().clear();
                // 2. Clear session storage (e.g. editingItemId)
                chrome.storage.session.clear(); 
                
                this.navigate('/login');
            });
        }

        // Handle Adding test item
        const addTestBtn = document.getElementById('add-test-btn');
        if (addTestBtn){
            addTestBtn.addEventListener('click', () => {
                this.navigate('/addItem');
            });
        }
    }

    async loadItems() {
        const listContainer = document.getElementById('password-list');
        if (!listContainer) return;

        try {
            // FIX: No longer retrieving masterPassword from storage.
            // We call getAllItems() directly. It will throw if session is expired.
            const items = await vaultRepository.getAllItems();
            
            // Clear innerHTML container
            listContainer.innerHTML = '';

            if (items.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="4" class="state-message empty">No passwords saved yet.</td>';
                listContainer.appendChild(tr);
                return;
            }

            // Using DocumentFragment for optimization
            const fragment = document.createDocumentFragment();

            for (const item of items) {
                const tr = document.createElement('tr');

                // Column 'Site' - Added Status Icon
                const tdSite = document.createElement('td');
                tdSite.className = 'site-cell';
                
                // Status icon placeholder
                const statusIcon = document.createElement('span');
                statusIcon.className = 'audit-status-icon status-loading';
                statusIcon.id = `audit-status-${item.id}`;
                statusIcon.title = 'Analyzing password security...';
                statusIcon.textContent = '⏳';

                const spanSite = document.createElement('span');
                spanSite.className = 'site-url';
                spanSite.textContent = item.url;
                
                tdSite.appendChild(statusIcon);
                tdSite.appendChild(spanSite);
                tr.appendChild(tdSite);

                // Column 'Username'
                const tdUser = document.createElement('td');
                tdUser.className = 'username-cell';
                tdUser.textContent = item.username;
                tr.appendChild(tdUser);

                // Column 'Password'
                const tdPass = document.createElement('td');
                const divWrapper = document.createElement('div');
                divWrapper.className = 'password-wrapper';
                
                const spanText = document.createElement('span');
                spanText.className = 'password-text';
                spanText.textContent = item.password;
                
                const spanMask = document.createElement('span');
                spanMask.className = 'password-mask';
                spanMask.textContent = '••••••••';

                const btnCopyIcon = document.createElement('button');
                btnCopyIcon.className = 'copy-icon-btn';
                btnCopyIcon.innerHTML = '📋';
                btnCopyIcon.title = "Copy password";

                btnCopyIcon.onclick = async (e) => {
                    e.stopPropagation();
                    try {
                        await navigator.clipboard.writeText(item.password);
                        
                        btnCopyIcon.innerHTML = '✅';
                        btnCopyIcon.classList.add('success');

                        setTimeout(() => {
                            btnCopyIcon.innerHTML = '📋';
                            btnCopyIcon.classList.remove('success');
                        }, 2000);
                        
                    } catch (err) {
                        console.error('Failed to copy:', err);
                    }
                };

                const btnToggle = document.createElement('button');
                btnToggle.className = 'eye-btn'; 
                btnToggle.innerHTML = '👁️';
                btnToggle.title = "Show/Hide password";
                
                btnToggle.onclick = (e) => {
                    e.stopPropagation(); 
                    divWrapper.classList.toggle('revealed');
                };

                divWrapper.appendChild(spanText);
                divWrapper.appendChild(spanMask);
                divWrapper.appendChild(btnCopyIcon);
                divWrapper.appendChild(btnToggle);
                
                tdPass.appendChild(divWrapper);
                tr.appendChild(tdPass);

                // Table column 'Action'
                const tdAction = document.createElement('td');
                tdAction.className = 'text-right';

                // Edit button
                const btnEdit = document.createElement('button');
                btnEdit.className = 'action-btn edit-btn';
                btnEdit.textContent = 'Edit';

                btnEdit.onclick = async () => {
                    // Store ID of item for edit in sessionData
                    await chrome.storage.session.set({ 'editingItemId': item.id });
                    this.navigate('/editItem');
                };

                // Delete button
                const btnDelete = document.createElement('button');
                btnDelete.className = 'action-btn delete-btn';
                btnDelete.textContent = 'Delete';
                btnDelete.onclick = () => {
                    // Hide Edit/Delete, show Confirm/Cancel
                    btnEdit.style.display = 'none';
                    btnDelete.style.display = 'none';
                    btnConfirm.style.display = 'inline-block';
                    btnCancel.style.display = 'inline-block';
                };

                // Confirm button (hidden by default)
                const btnConfirm = document.createElement('button');
                btnConfirm.className = 'action-btn edit-btn';
                btnConfirm.textContent = 'Confirm';
                btnConfirm.style.display = 'none';

                btnConfirm.onclick = async () => {
                    try {
                        // Wait for the item to be completely deleted from DB
                        await vaultRepository.deleteItem(item.id);
                        
                        // Delete element from DOM
                        tr.remove(); 
                        showToastMessage('Item deleted successfully.', ToastType.SUCCESS, 2000);
                        
                        // Show 'no password' if table is empty after deletion 
                        if (listContainer.children.length === 0) {
                            const emptyTr = document.createElement('tr');
                            emptyTr.innerHTML = '<td colspan="4" class="state-message empty">No passwords saved yet.</td>';
                            listContainer.appendChild(emptyTr);
                        }
                    } catch (error) {
                        console.error(error);
                        showToastMessage('Failed to delete item.', ToastType.ERROR, 2500);
                    }
                }

                // Cancel button (hidden by default)
                const btnCancel = document.createElement('button');
                btnCancel.className = 'action-btn delete-btn';
                btnCancel.textContent = 'Cancel';
                btnCancel.style.display = 'none';

                btnCancel.onclick = () => {
                    // Show Edit/Delete, hide Confirm/Cancel
                    btnEdit.style.display = 'inline-block';
                    btnDelete.style.display = 'inline-block';
                    btnConfirm.style.display = 'none';
                    btnCancel.style.display = 'none';
                }

                tdAction.appendChild(btnEdit);
                tdAction.appendChild(btnDelete);
                tdAction.appendChild(btnConfirm);
                tdAction.appendChild(btnCancel);
                tr.appendChild(tdAction);

                fragment.appendChild(tr);
            }

            listContainer.appendChild(fragment);

            // Execute audit in the background so UI rendering is not blocked
            this.runBackgroundAudit();

        } catch (error) {
            console.error(error);
            // Handle session expired error
            if ((error as Error).message.includes("Vault is locked") || (error as Error).message.includes("not logged in")) {
                 this.navigate('/login');
                 return;
            }
            listContainer.innerHTML = '<tr><td colspan="4" class="error-message">Error loading vault.</td></tr>';
        }
    }

    // New method to handle the background audit update
    private async runBackgroundAudit() {
        try {
            const auditService = new AuditService(vaultRepository);
            const auditResults = await auditService.runFullAudit();

            // Update DOM elements with actual results
            for (const result of auditResults) {
                const iconEl = document.getElementById(`audit-status-${result.id}`);
                if (!iconEl) continue;

                // Remove loading class
                iconEl.classList.remove('status-loading');

                if (result.is_leaked) {
                    iconEl.textContent = '💀';
                    iconEl.title = 'Critical: Password leaked in data breach!';
                    iconEl.classList.add('status-leaked');
                } else if (result.is_reused) {
                    iconEl.textContent = '⚠️';
                    iconEl.title = 'Warning: Password is reused across multiple sites.';
                    iconEl.classList.add('status-reused');
                } else if (result.score >= 3) {
                    iconEl.textContent = '🟢';
                    iconEl.title = 'Strong password.';
                    iconEl.classList.add('status-strong');
                } else if (result.score === 2) {
                    iconEl.textContent = '🟡';
                    iconEl.title = 'Moderate password.';
                    iconEl.classList.add('status-moderate');
                } else {
                    iconEl.textContent = '🔴';
                    iconEl.title = 'Weak password. Change is highly recommended.';
                    iconEl.classList.add('status-weak');
                }
            }
        } catch (error) {
            console.error('Failed to run background audit:', error);
        }
    }
}