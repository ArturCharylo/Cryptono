import { vaultRepository } from "../repositories/VaultRepository";
import type { VaultItem } from "../types";
import { addValidation } from "../validation/validate";
import { generateStrongPassword } from "../utils/passGen";
import { clearField, setErrorMessage, setInputClassError, showToastMessage, ToastType } from '../utils/messages';

export class EditItem {
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
                    <p class="extensionSub">Edit item</p>
                </div>

                <form class="login-form" id="edit-form">
                    <div class="input-group">
                        <label for="url">URL</label>
                        <input type="text" name="url" id="url" placeholder="example.com" class="form-input"/>
                        <div class="input-error" id="url-error"></div>
                    </div>
                    <div class="input-group">
                        <label for="username">Username</label>
                        <input type="text" name="username" id="username" placeholder="Enter your username" class="form-input"/>
                        <div class="input-error" id="username-error"></div>
                    </div>
                    
                    <div class="input-group">
                        <div class="label-row">
                            <label for="password">Password</label>
                            <button type="button" id="gen-pass-btn" class="gen-btn">🎲 Generate</button>
                        </div>
                        
                        <div class="password-wrapper-input">
                            <input 
                                type="password" 
                                name="password" 
                                id="password" 
                                placeholder="Str0ng_P@Ssword" 
                                class="form-input form-input-with-icon" 
                            />
                            <button 
                                type="button" 
                                id="toggle-pass-visibility" 
                                class="eye-btn" 
                                title="Show/Hide password"
                            >👁️</button>
                        </div>
                        <div class="input-error" id="password-error"></div>
                    </div>

                    <div class="input-group">
                        <label for="re-pass">Repeat Password</label>
                        <input type="password" name="re-pass" id="re-pass" placeholder="Repeat your password" class="form-input"/>
                        <div class="input-error" id="re-pass-error"></div>
                    </div>

                     <div class="input-group">
                        <label for="note">Note</label>
                        <textarea name="note" id="note" placeholder="Optional notes..." class="form-input"></textarea>
                    </div>

                    <div class="custom-fields-section">
                        <div class="fields-header">
                            <label>Custom Fields</label>
                            <button type="button" id="add-field-btn" class="add-field-btn">+ Add Field</button>
                        </div>
                        <div id="fields-container">
                            </div>
                    </div>

                    <div style="margin-top: 15px;"></div>

                    <button type="submit" class="login-btn save-btn">
                        <span class="btn-text">Save Changes</span>
                        <div class="btn-loader" style="display: none;">
                            <div class="spinner"></div>
                        </div>
                    </button>
                    
                    <button type="button" id="cancel-btn" class="login-btn cancel-btn">
                        Cancel
                    </button>
                </form>

                <div class="footer">
                    <p class="security-note">🔐 Encrypted & Secure</p>
                </div>
            </div>
        `;
    }

    afterRender() {
        const form = document.getElementById('edit-form') as HTMLFormElement;
        const cancelBtn = document.getElementById('cancel-btn');
        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;

        // --- Dynamic Fields Logic ---
        const addFieldBtn = document.getElementById('add-field-btn');
        const fieldsContainer = document.getElementById('fields-container');

        const addFieldRow = (nameValue = '', valueValue = '') => {
            if (!fieldsContainer) return;

            // Create row container
            const row = document.createElement('div');
            row.className = 'field-row';

            // Create Name input
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.placeholder = 'Name';
            nameInput.className = 'form-input field-name-input';
            nameInput.value = nameValue; // Safe assignment via property

            // Create Value input
            const valueInput = document.createElement('input');
            valueInput.type = 'text';
            valueInput.placeholder = 'Value';
            valueInput.className = 'form-input field-value-input';
            valueInput.value = valueValue; // Safe assignment via property

            // Create Remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-field-btn';
            removeBtn.title = 'Remove field';
            removeBtn.textContent = '✕';

            // Attach event listener to remove button
            removeBtn.addEventListener('click', () => {
                row.remove();
            });

            // Append elements to row
            row.appendChild(nameInput);
            row.appendChild(valueInput);
            row.appendChild(removeBtn);

            // Append row to container
            fieldsContainer.appendChild(row);
        };

        if (addFieldBtn) {
            addFieldBtn.addEventListener('click', () => addFieldRow());
        }
        // ------------------------------------------------

        const inputList = form.querySelectorAll('input.form-input') as NodeListOf<HTMLInputElement>;
        for (const input of inputList) {
            if (input.classList.contains('field-name-input') || input.classList.contains('field-value-input')) continue;
            input.addEventListener('input', () => {
                setInputClassError(input, false);
                const errorDiv = document.getElementById(`${input.id}-error`);
                if (errorDiv) clearField(errorDiv);
            });
        }

        const genBtn = document.getElementById('gen-pass-btn');
        const passInput = document.getElementById('password') as HTMLInputElement;
        const rePassInput = document.getElementById('re-pass') as HTMLInputElement;
        const toggleVisBtn = document.getElementById('toggle-pass-visibility');
        const urlInput = document.getElementById('url') as HTMLInputElement;
        const usernameInput = document.getElementById('username') as HTMLInputElement;
        const noteInput = document.getElementById('note') as HTMLTextAreaElement;

        // Load data for editing
        (async () => {
            try {
                // Fetch editingItemId only. Master Password is removed from storage.
                const session = await chrome.storage.session.get(['editingItemId']);
                const id = session['editingItemId'] as string;

                if (!id) {
                     this.navigate('/passwords');
                     return;
                }

                // Get decrypted element. No masterPassword needed.
                // If session is expired, vaultRepository will throw an error caught below.
                const item = await vaultRepository.getItemDecrypted(id);
                
                // Fill form with data
                urlInput.value = item.url;
                usernameInput.value = item.username;
                passInput.value = item.password;
                rePassInput.value = item.password; 
                if (item.note) noteInput.value = item.note; // Fill note

                // Fill custom fields
                if (item.fields && item.fields.length > 0) {
                    item.fields.forEach(field => {
                        addFieldRow(field.name, field.value);
                    });
                }
                
            } catch (error) {
                // Handle session expiration or other errors
                if ((error as Error).message.includes("Vault is locked") || (error as Error).message.includes("not logged in")) {
                     showToastMessage("Session expired. Please login again.", ToastType.ERROR, 2500);
                     this.navigate('/login');
                } else {
                     showToastMessage(((error as Error).message), ToastType.ERROR, 2500);
                     this.navigate('/passwords');
                }
            }
        })();

        if (genBtn) {
            genBtn.addEventListener('click', () => {
                const newPassword = generateStrongPassword();
                
                // ERROR HANDLING RESTORED:
                // If the generator returns an empty string, show the Toast here.
                if (!newPassword) {
                    showToastMessage('Error generating strong password. Try again', ToastType.ERROR, 2500);
                    return;
                }
                
                passInput.value = newPassword;
                rePassInput.value = newPassword;
                passInput.type = "text";
                rePassInput.type = "text";
                const originalText = genBtn.textContent;
                genBtn.textContent = "Generated!";
                setTimeout(() => genBtn.textContent = originalText, 1000);
            });
        }

        if (toggleVisBtn) {
            toggleVisBtn.addEventListener('click', () => {
                const type = passInput.type === "password" ? "text" : "password";
                passInput.type = type;
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                chrome.storage.session.remove('editingItemId');
                this.navigate('/passwords');
            });
        }

        // Handle Save
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();

            let isValid: boolean = true;
            const url = urlInput.value;
            const username = usernameInput.value;
            const password = passInput.value;
            const rePass = rePassInput.value;
            const note = noteInput.value;

            // Gather custom fields
            const customFields: Array<{ name: string; value: string; type: string }> = [];
            if (fieldsContainer) {
                const rows = fieldsContainer.querySelectorAll('.field-row');
                rows.forEach(row => {
                    const nameInput = row.querySelector('.field-name-input') as HTMLInputElement;
                    const valueInput = row.querySelector('.field-value-input') as HTMLInputElement;
                    
                    if (nameInput.value.trim() !== '' || valueInput.value.trim() !== '') {
                        customFields.push({
                            name: nameInput.value.trim(),
                            value: valueInput.value.trim(),
                            type: 'text'
                        });
                    }
                });
            }

             if (password !== rePass) {
                const rePassInput = document.getElementById("re-pass") as HTMLInputElement;
                const errorDiv = document.getElementById(`re-pass-error`);
                if (rePassInput && errorDiv) {
                    setInputClassError(rePassInput, true);
                    clearField(errorDiv);
                    setErrorMessage(errorDiv, 'Passwords do not match');
                }
                return;
            }

            if (!url || !username || !password || !rePass) {
                const mainInputs = ['url', 'username', 'password', 're-pass'];
                mainInputs.forEach(id => {
                    const input = document.getElementById(id) as HTMLInputElement;
                    const errorDiv = document.getElementById(`${id}-error`);
                    if (input && !input.value && errorDiv) {
                          setInputClassError(input, true);
                          setErrorMessage(errorDiv, 'This field is required');
                    }
                });
                isValid = false;
            }

            if (!isValid) return;

            if (submitBtn) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            }

            try {
                await this.validateItem(url, username, password);

                // Fetch the ID of the item being edited
                const sessionData = await chrome.storage.session.get(['editingItemId']);
                const id = sessionData['editingItemId'] as string;

                if (!id) {
                    throw new Error("Session invalid. Return to password list.");
                }

                const updatedItem: VaultItem = {
                    id: id,
                    url: url,
                    username: username,
                    password: password,
                    createdAt: Date.now(),
                    note: note,          // Save note
                    fields: customFields // Save custom fields
                };

                // No masterPassword needed for updateItem
                await vaultRepository.updateItem(updatedItem);

                await chrome.storage.session.remove('editingItemId');
                this.navigate('/passwords');

            } catch (error) {
                if ((error as Error).message.includes("Vault is locked") || (error as Error).message.includes("not logged in")) {
                    showToastMessage("Session expired. Please login again.", ToastType.ERROR, 2500);
                    this.navigate('/login');
                } else if (error instanceof Error) {
                    showToastMessage(error.message, ToastType.ERROR, error.message.length > 50 ? 6000 : 2500);
                } else {
                    showToastMessage('An unexpected error occurred.', ToastType.ERROR, 2500);
                }    
            } finally {
                if (submitBtn) {
                    submitBtn.classList.remove('loading');
                    submitBtn.disabled = false;
                }
            }
        });
    }

    async validateItem(url: string, username: string, password: string): Promise<void> {
        const validations = addValidation(url, username, password);
        const allValid = validations.every(v => {
            const regexObj = v.regex instanceof RegExp ? v.regex : new RegExp(v.regex);
            return regexObj.test(v.value);
        });

        if (!allValid) {
            const errors = validations
                .filter(v => {
                    const regexObj = v.regex instanceof RegExp ? v.regex : new RegExp(v.regex);
                    return !regexObj.test(v.value);
                })
                .map(v => v.message);
            throw new Error(errors.join('\n'));
        }
    }
}