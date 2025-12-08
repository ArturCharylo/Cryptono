import { STORAGE_KEYS } from '../constants/constants';
import { storageService } from '../services/StorageService';

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
                        <button id="add-test-btn" class="login-btn add-item-btn">+ Add Test</button>
                    </div>

                    <div class="table-wrapper">
                        <table class='password-table'>
                            <thead>
                                <tr>
                                    <th>Site</th>
                                    <th>Username</th>
                                    <th>Password</th>
                                    <th>Action</th>
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
            const masterPassword = sessionData[STORAGE_KEYS.MASTER] as string; // Poprawiłem klucz dostępu (było .masterPassword, a w AddItem używałeś stałej)

            if (!masterPassword) {
                this.navigate('/login');
                return;
            }

            const items = await storageService.getAllItems(masterPassword);
            
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

                divWrapper.appendChild(spanText);
                divWrapper.appendChild(spanMask);
                divWrapper.appendChild(btnCopyIcon)
                tdPass.appendChild(divWrapper);
                tr.appendChild(tdPass);

                // Table column 'Action'
                const tdAction = document.createElement('td');
                tdAction.className = 'text-right';

                // Show/Hide button
                const btnToggle = document.createElement('button');
                btnToggle.className = 'action-btn toggle-btn';
                btnToggle.textContent = 'Show';
                
                btnToggle.onclick = () => {
                    divWrapper.classList.toggle('revealed');
                    const isRevealed = divWrapper.classList.contains('revealed');
                    btnToggle.textContent = isRevealed ? 'Hide' : 'Show';
                    if (isRevealed) {
                        btnToggle.classList.add('active');
                    } else {
                        btnToggle.classList.remove('active');
                    }
                };

                // Delete button
                const btnDelete = document.createElement('button');
                btnDelete.className = 'action-btn delete-btn';
                btnDelete.textContent = 'Delete';
                btnDelete.onclick = async () => {
                    if (confirm("Are you sure you want to delete this record?")) {
                        try {
                            // Wait for the item to be compleatly deleted from DB
                            await storageService.deleteItem(item.id);
                            
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
                            alert("Failed to delete item.");
                        }
                    }
                };

                tdAction.appendChild(btnToggle);
                tdAction.appendChild(btnDelete);
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