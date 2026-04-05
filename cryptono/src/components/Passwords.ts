import { vaultRepository } from '../repositories/VaultRepository';
import { SessionService } from '../services/SessionService';
import { showToastMessage, ToastType } from '../utils/messages';
import { AuditService } from '../services/AuditService';
import type { VaultItem } from '../types/index';

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
                        <div class="vault-header-actions">
                            <input type="text" id="vault-search" class="search-input" placeholder="Search site, email or password...">
                            <button id="add-test-btn" class="login-btn add-item-btn">+ Add Item</button>
                        </div>
                    </div>

                    <div class="table-wrapper">
                        <table class='password-table'>
                            <thead>
                                <tr>
                                    <th>Site</th>
                                </tr>
                            </thead>
                            <tbody id="password-list">
                                <tr><td class="state-message">Loading vault...</td></tr>
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

                <div id="item-modal" class="modal">
                    <div class="modal-content">
                        <span id="close-modal" class="close-btn">&times;</span>
                        <h3 id="modal-site-title" class="modal-title"></h3>
                        
                        <div class="modal-field">
                            <label class="modal-label">Username</label>
                            <div id="modal-username-val" class="modal-value"></div>
                        </div>
                        
                        <div class="modal-field">
                            <label class="modal-label">Password</label>
                            <div class="password-wrapper modal-password" id="modal-pass-wrapper">
                                <span id="modal-password-val" class="password-text"></span>
                                <span class="password-mask">••••••••</span>
                                <button class="copy-icon-btn" id="modal-copy-btn" title="Copy password">📋</button>
                                <button class="eye-btn" id="modal-toggle-btn" title="Show/Hide password">👁️</button>
                            </div>
                        </div>
                        
                        <div class="modal-actions" id="modal-actions">
                            <button id="modal-edit-btn" class="action-btn edit-btn">Edit</button>
                            <button id="modal-delete-btn" class="action-btn delete-btn modal-delete-margin">Delete</button>
                            <button id="modal-confirm-btn" class="action-btn edit-btn hidden modal-delete-margin">Confirm</button>
                            <button id="modal-cancel-btn" class="action-btn delete-btn hidden modal-delete-margin">Cancel</button>
                        </div>
                    </div>
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

        // Modal Close logic using the 'active' class pattern
        const modal = document.getElementById('item-modal');
        const closeBtn = document.getElementById('close-modal');
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }
        
        // Close modal when clicking outside the content area
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }

        // Handle Search filtering
        const searchInput = document.getElementById('vault-search') as HTMLInputElement;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
                const listContainer = document.getElementById('password-list');
                
                if (!listContainer) return;

                // Prevent search logic if the vault is completely empty
                const emptyMessage = listContainer.querySelector('.state-message.empty');
                if (emptyMessage && !emptyMessage.classList.contains('no-results-message')) {
                    return; 
                }

                // Remove previously added "No results" message if it exists
                const existingNoResults = listContainer.querySelector('.no-results-message');
                if (existingNoResults) {
                    existingNoResults.remove();
                }

                // Select all rows except the empty/loading state messages
                const rows = listContainer.querySelectorAll('tr:not(.state-message)');

                let hasVisibleRows = false;
                
                rows.forEach((row) => {
                    // Extract text content from data attributes to preserve search functionality
                    const url = (row as HTMLElement).dataset.url?.toLowerCase() || '';
                    const username = (row as HTMLElement).dataset.username?.toLowerCase() || '';
                    const password = (row as HTMLElement).dataset.password?.toLowerCase() || '';

                    // Check if search term exists in any of the targeted fields
                    if (url.includes(searchTerm) || username.includes(searchTerm) || password.includes(searchTerm)) {
                        row.classList.remove('hidden'); // Show matching row
                        hasVisibleRows = true;
                    } else {
                        row.classList.add('hidden'); // Hide non-matching row
                    }
                });

                // If no rows are visible, show a "No results" message similar to the empty vault state
                if (!hasVisibleRows && rows.length > 0) {
                    const noResultsTr = document.createElement('tr');
                    noResultsTr.className = 'state-message empty no-results-message';
                    noResultsTr.innerHTML = '<td class="state-message empty">No results found.</td>';
                    listContainer.appendChild(noResultsTr);
                }
            });
        }
    }

    async loadItems() {
        const listContainer = document.getElementById('password-list');
        if (!listContainer) return;

        try {
            // We call getAllItems() directly. It will throw if session is expired.
            const items = await vaultRepository.getAllItems();
            
            // Clear innerHTML container
            listContainer.innerHTML = '';

            if (items.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td class="state-message empty">No passwords saved yet.</td>';
                listContainer.appendChild(tr);
                return;
            }

            // Using DocumentFragment for optimization
            const fragment = document.createDocumentFragment();

            for (const item of items) {
                const tr = document.createElement('tr');
                
                // Add data attributes to row for search functionality
                tr.dataset.url = item.url;
                tr.dataset.username = item.username;
                tr.dataset.password = item.password;
                tr.classList.add('clickable-row');

                // Attach click listener correctly
                tr.addEventListener('click', () => this.openModal(item, tr));

                // Column 'Site' - Added Status Icon
                const tdSite = document.createElement('td');
                tdSite.className = 'site-cell';
                
                // Create a flex wrapper to prevent breaking the table cell height
                const divSiteWrapper = document.createElement('div');
                divSiteWrapper.className = 'site-info-wrapper';
                
                // Status icon placeholder
                const statusIcon = document.createElement('span');
                statusIcon.className = 'audit-status-icon status-loading';
                statusIcon.id = `audit-status-${item.id}`;
                statusIcon.title = 'Analyzing password security...';
                statusIcon.textContent = '⏳';

                const spanSite = document.createElement('span');
                spanSite.className = 'site-url';
                spanSite.textContent = item.url;
                
                // Append icon and url to the wrapper, then wrapper to the cell
                divSiteWrapper.appendChild(statusIcon);
                divSiteWrapper.appendChild(spanSite);
                tdSite.appendChild(divSiteWrapper);
                tr.appendChild(tdSite);

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
            listContainer.innerHTML = '<tr><td class="error-message">Error loading vault.</td></tr>';
        }
    }

    private openModal(item: VaultItem, tr: HTMLElement) {
        const modal = document.getElementById('item-modal');
        if (!modal) {
            console.error("Modal container not found!");
            return;
        }

        // Get modal elements
        const siteTitle = document.getElementById('modal-site-title');
        const usernameVal = document.getElementById('modal-username-val');
        const passwordVal = document.getElementById('modal-password-val');
        
        // Securely populate data using textContent to prevent HTML injection issues
        if (siteTitle) siteTitle.textContent = item.url;
        if (usernameVal) usernameVal.textContent = item.username;
        if (passwordVal) passwordVal.textContent = item.password;

        // Reset password visibility
        const passWrapper = document.getElementById('modal-pass-wrapper');
        if (passWrapper) passWrapper.classList.remove('revealed');

        // Bind copy event securely overriding any previous triggers
        const btnCopy = document.getElementById('modal-copy-btn');
        if (btnCopy) {
            btnCopy.onclick = async (e) => {
                e.stopPropagation();
                try {
                    await navigator.clipboard.writeText(item.password);
                    btnCopy.innerHTML = '✅';
                    btnCopy.classList.add('success');
                    setTimeout(() => {
                        btnCopy.innerHTML = '📋';
                        btnCopy.classList.remove('success');
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            };
        }

        // Bind toggle event
        const btnToggle = document.getElementById('modal-toggle-btn');
        if (btnToggle && passWrapper) {
            btnToggle.onclick = (e) => {
                e.stopPropagation(); 
                passWrapper.classList.toggle('revealed');
            };
        }

        // Set up action buttons
        const btnEdit = document.getElementById('modal-edit-btn');
        const btnDelete = document.getElementById('modal-delete-btn');
        const btnConfirm = document.getElementById('modal-confirm-btn');
        const btnCancel = document.getElementById('modal-cancel-btn');

        if (btnEdit && btnDelete && btnConfirm && btnCancel) {
            // Reset visibility states using the 'hidden' utility class for inner elements
            btnEdit.classList.remove('hidden');
            btnDelete.classList.remove('hidden');
            btnConfirm.classList.add('hidden');
            btnCancel.classList.add('hidden');

            btnEdit.onclick = async () => {
                // Store ID of item for edit in sessionData
                await chrome.storage.session.set({ 'editingItemId': item.id });
                this.navigate('/editItem');
            };

            btnDelete.onclick = () => {
                // Hide Edit/Delete, show Confirm/Cancel
                btnEdit.classList.add('hidden');
                btnDelete.classList.add('hidden');
                btnConfirm.classList.remove('hidden');
                btnCancel.classList.remove('hidden');
            };

            btnCancel.onclick = () => {
                // Show Edit/Delete, hide Confirm/Cancel
                btnEdit.classList.remove('hidden');
                btnDelete.classList.remove('hidden');
                btnConfirm.classList.add('hidden');
                btnCancel.classList.add('hidden');
            };

            btnConfirm.onclick = async () => {
                try {
                    // Wait for the item to be completely deleted from DB
                    await vaultRepository.deleteItem(item.id);
                    
                    // Delete element from DOM and close modal using 'active' class
                    tr.remove(); 
                    modal.classList.remove('active');
                    showToastMessage('Item deleted successfully.', ToastType.SUCCESS, 2000);
                    
                    // Show 'no password' if table is empty after deletion 
                    const listContainer = document.getElementById('password-list');
                    if (listContainer && listContainer.children.length === 0) {
                        const emptyTr = document.createElement('tr');
                        emptyTr.innerHTML = '<td class="state-message empty">No passwords saved yet.</td>';
                        listContainer.appendChild(emptyTr);
                    }
                } catch (error) {
                    console.error(error);
                    showToastMessage('Failed to delete item.', ToastType.ERROR, 2500);
                }
            };
        }
        
        modal.classList.add('active');
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

                const trEl = iconEl.closest('tr');

                // Remove loading class
                iconEl.classList.remove('status-loading');

                if (result.is_leaked) {
                    iconEl.textContent = '💀';
                    iconEl.title = 'Critical: Password leaked in data breach!';
                    if (trEl) trEl.classList.add('row-status-leaked');
                } else if (result.is_reused) {
                    iconEl.textContent = '⚠️';
                    iconEl.title = 'Warning: Password is reused across multiple sites.';
                    if (trEl) trEl.classList.add('row-status-reused');
                } else if (result.score >= 3) {
                    iconEl.textContent = '🟢';
                    iconEl.title = 'Strong password.';
                    if (trEl) trEl.classList.add('row-status-strong');
                } else if (result.score === 2) {
                    iconEl.textContent = '🟡';
                    iconEl.title = 'Moderate password.';
                    if (trEl) trEl.classList.add('row-status-moderate');
                } else {
                    iconEl.textContent = '🔴';
                    iconEl.title = 'Weak password. Change is highly recommended.';
                    if (trEl) trEl.classList.add('row-status-weak');
                }
            }
        } catch (error) {
            console.error('Failed to run background audit:', error);
        }
    }
}