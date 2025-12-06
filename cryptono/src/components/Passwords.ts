import { COOKIES } from '../constants/constants';
import { cookieService } from '../services/CookieService';
import { storageService } from '../services/StorageService';
import type { VaultItem } from '../types';

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
                console.log("Kliknięto wyloguj. Przed usunięciem:", document.cookie);
                cookieService.DeleteCookie(COOKIES.AUTH);
                console.log("Po usunięciu:", document.cookie);
                this.navigate('/login');
            });
        }

        // Handle Adding test item
        const addTestBtn = document.getElementById('add-test-btn');
        if (addTestBtn) {
            addTestBtn.addEventListener('click', async () => {
                const newItem: VaultItem = {
                    id: crypto.randomUUID(),
                    url: 'google.com',
                    username: 'user@example.com',
                    password: 'SuperSecretPassword123!',
                    createdAt: Date.now()
                };
                
                const sessionData = await chrome.storage.session.get(COOKIES.MASTER);
                const masterPassword = sessionData.masterPassword as string;

                if (masterPassword) {
                    await storageService.addItem(newItem, masterPassword);
                    this.loadItems(); 
                } else {
                    this.navigate('/login');
                }
            });
        }
    }

    async loadItems() {
        const listContainer = document.getElementById('password-list');
        if (!listContainer) return;

        try {
            const sessionData = await chrome.storage.session.get(COOKIES.MASTER);
            const masterPassword = sessionData.masterPassword as string;

            if (!masterPassword) {
                // Redirect to login if no master password found
                // Technically this check is preformed in another compoment, but better be safe than sorry
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

            // Building table with DOM API
            // This method ensures that XSS attacks are handled
            items.forEach(item => {
                const tr = document.createElement('tr');

                // Column 'Site'
                const tdSite = document.createElement('td');
                const spanSite = document.createElement('span');
                spanSite.className = 'site-url';
                spanSite.textContent = item.url; // 🛡️ XSS STOP
                tdSite.appendChild(spanSite);
                tr.appendChild(tdSite);

                // Column 'Username'
                const tdUser = document.createElement('td');
                tdUser.className = 'username-cell';
                tdUser.textContent = item.username; // 🛡️ XSS STOP
                tr.appendChild(tdUser);

                // Coulmn 'Password'
                const tdPass = document.createElement('td');
                const divWrapper = document.createElement('div');
                divWrapper.className = 'password-wrapper';
                
                const spanText = document.createElement('span');
                spanText.className = 'password-text';
                spanText.textContent = item.password; // 🛡️ XSS STOP
                
                const spanMask = document.createElement('span');
                spanMask.className = 'password-mask';
                spanMask.textContent = '••••••••';

                divWrapper.appendChild(spanText);
                divWrapper.appendChild(spanMask);
                tdPass.appendChild(divWrapper);
                tr.appendChild(tdPass);

                // Table column 'Action'
                const tdAction = document.createElement('td');
                tdAction.className = 'text-right';

                // SHow/Hide button
                const btnToggle = document.createElement('button');
                btnToggle.className = 'action-btn toggle-btn';
                btnToggle.textContent = 'Show';
                // Add event listener directly to element
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
                btnDelete.onclick = () => {
                    if (confirm("Are you sure you want to delete this record?")) {
                        storageService.deleteItem(item.id).then(() => {
                            this.loadItems();
                        });
                    }
                };

                tdAction.appendChild(btnToggle);
                tdAction.appendChild(btnDelete);
                tr.appendChild(tdAction);

                // Add table row
                listContainer.appendChild(tr);
            });

        } catch (error) {
            console.error(error);
            listContainer.innerHTML = '<tr><td colspan="4" class="error-message">Error loading vault.</td></tr>';
        }
    }
}