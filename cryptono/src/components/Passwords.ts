import { STORAGE_KEYS } from '../constants/constants';
import { vaultRepository } from '../repositories/VaultRepository';
import { showToastMessage, ToastType } from '../utils/messages';

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
        
        // Handle Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                chrome.storage.session.remove(STORAGE_KEYS.MASTER)
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
            const sessionData = await chrome.storage.session.get(STORAGE_KEYS.MASTER);
            const masterPassword = sessionData[STORAGE_KEYS.MASTER] as string; 

            if (!masterPassword) {
                this.navigate('/login');
                return;
            }

            const items = await vaultRepository.getAllItems(masterPassword);
            
            // Clear innerHTML container
            listContainer.innerHTML = '';

            if (items.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="4" class="state-message empty">No passwords saved yet.</td>';
                listContainer.appendChild(tr);
                return;
            }

            // Using DocumentFragment for optimalization
            const fragment = document.createDocumentFragment();

            // For of loop which is newer and better for handling async functions
            for (const item of items) {
                const tr = document.createElement('tr');

                // Column 'Site'
                const tdSite = document.createElement('td');
                const spanSite = document.createElement('span');
                spanSite.className = 'site-url';
                spanSite.textContent = item.url;
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
                    // Store ID of item for edit in sessionData so that editItem can get it
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
                        // Wait for the item to be compleatly deleted from DB
                        await vaultRepository.deleteItem(item.id);
                        
                        // Delete element from DOM
                        tr.remove(); 
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

                // Add to fragment for better memory handling
                fragment.appendChild(tr);
            }

            // Append to HTML (keeps the runtime simple with a single DOM operation)
            listContainer.appendChild(fragment);

        } catch (error) {
            console.error(error);
            listContainer.innerHTML = '<tr><td colspan="4" class="error-message">Error loading vault.</td></tr>';
        }
    }
}