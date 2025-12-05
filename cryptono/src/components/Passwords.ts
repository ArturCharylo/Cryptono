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
                await storageService.addItem(newItem);
                this.loadItems(); 
            });
        }
    }

    async loadItems() {
        const listContainer = document.getElementById('password-list');
        if (!listContainer) return;

        try {
            const items = await storageService.getAllItems();
            
            if (items.length === 0) {
                listContainer.innerHTML = '<tr><td colspan="4" class="state-message empty">No passwords saved yet.</td></tr>';
                return;
            }

            listContainer.innerHTML = items.map(item => `
                <tr>
                    <td><span class="site-url">${item.url}</span></td>
                    <td class="username-cell">${item.username}</td>
                    <td>
                        <div class="password-wrapper" id="pwd-wrapper-${item.id}">
                            <span class="password-text">${item.password}</span>
                            <span class="password-mask">••••••••</span>
                        </div>
                    </td>
                    <td class="text-right">
                        <button class="action-btn toggle-btn" data-id="${item.id}">Show</button>
                        <button class="action-btn delete-btn" data-id="${item.id}">Delete</button>
                    </td>
                </tr>
            `).join('');

            // Event listeners for toggle buttons
            document.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const button = e.target as HTMLButtonElement;
                    const id = button.getAttribute('data-id');
                    const wrapper = document.getElementById(`pwd-wrapper-${id}`);

                    if (wrapper) {
                        // Toggle logic using CSS classes instead of inline styles
                        wrapper.classList.toggle('revealed');
                        const isRevealed = wrapper.classList.contains('revealed');
                        
                        button.textContent = isRevealed ? 'Hide' : 'Show';
                        
                        if (isRevealed) {
                            button.classList.add('active');
                        } else {
                            button.classList.remove('active');
                        }
                    }
                });
            });

            // Event listeners for delete buttons
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const button = e.target as HTMLButtonElement;
                    const id = button.getAttribute('data-id');
                    if (confirm("Are you sure you want to delete this record?")){
                        storageService.deleteItem(id!).then(() => {
                            this.loadItems();
                        })
                    }
                });
            });

        } catch (error) {
            console.error(error);
            listContainer.innerHTML = '<tr><td colspan="4" class="error-message">Error loading vault.</td></tr>';
        }
    }
}