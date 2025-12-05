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
                                    <th style="text-align: right;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="password-list">
                                <tr><td colspan="4" style="text-align:center; padding: 30px; opacity: 0.7;">Loading vault...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="text-align: center; margin-top: 24px;">
                        <button id="logout-btn" class="login-btn" >Logout</button>
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
                cookieService.DeleteCookie('authToken');
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
                listContainer.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 30px; opacity: 0.6;">No passwords saved yet.</td></tr>';
                return;
            }

            listContainer.innerHTML = items.map(item => `
                <tr>
                    <td><span style="font-weight: 500;">${item.url}</span></td>
                    <td style="opacity: 0.8;">${item.username}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="password-text" style="display: none; font-family: monospace;">${item.password}</span>
                            <span class="password-mask">••••••••</span>
                        </div>
                    </td>
                    <td style="text-align: right;">
                        <button class="toggle-btn" data-id="${item.id}">Show</button>
                    </td>
                </tr>
            `).join('');

            // Event listeners for toggle buttons
            document.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const button = e.target as HTMLButtonElement;
                    const row = button.closest('tr');
                    const textSpan = row?.querySelector('.password-text') as HTMLElement;
                    const maskSpan = row?.querySelector('.password-mask') as HTMLElement;

                    if (textSpan.style.display === 'none') {
                        textSpan.style.display = 'inline';
                        maskSpan.style.display = 'none';
                        button.textContent = 'Hide';
                        button.style.borderColor = 'rgba(255, 255, 255, 0.5)'; // Active state visual feedback
                    } else {
                        textSpan.style.display = 'none';
                        maskSpan.style.display = 'inline';
                        button.textContent = 'Show';
                        button.style.borderColor = ''; // Reset border
                    }
                });
            });

        } catch (error) {
            console.error(error);
            listContainer.innerHTML = '<tr><td colspan="4" style="color: #ff6b6b; text-align:center; padding: 20px;">Error loading vault.</td></tr>';
        }
    }
}