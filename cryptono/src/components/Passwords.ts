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

                <div style="color: white;">
                    <h2 style="text-align:center;">Your Vault</h2>
                    
                    <div style="text-align: right; margin-bottom: 10px;">
                        <button id="add-test-btn" class="login-btn add-item">+ Add Test</button>
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
                                <tr><td colspan="4" style="text-align:center;">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button id="logout-btn" class="login-btn" >Logout</button>
                    </div>
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
                this.navigate('/login');
            });
        }

        // Handle Adding test item to indexedDB
        // This function and button are puerly experimental and used for testing the database
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
                this.loadItems(); // refresh table
            });
        }
    }

    async loadItems() {
        const listContainer = document.getElementById('password-list');
        if (!listContainer) return;

        try {
            const items = await storageService.getAllItems();
            
            if (items.length === 0) {
                listContainer.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No passwords saved yet.</td></tr>';
                return;
            }

            listContainer.innerHTML = items.map(item => `
                <tr>
                    <td>${item.url}</td>
                    <td>${item.username}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="password-text" style="display: none;">${item.password}</span>
                            <span class="password-mask">••••••••</span>
                        </div>
                    </td>
                    <td>
                        <button class="toggle-btn" data-id="${item.id}">Show</button>
                    </td>
                </tr>
            `).join('');

            // Event listeners to update the passoword field to be either hidden or display the password as plain text
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
                    } else {
                        textSpan.style.display = 'none';
                        maskSpan.style.display = 'inline';
                        button.textContent = 'Show';
                    }
                });
            });

        } catch (error) {
            console.error(error);
            listContainer.innerHTML = '<tr><td colspan="4" style="color: red; text-align:center;">Error loading vault.</td></tr>';
        }
    }
}