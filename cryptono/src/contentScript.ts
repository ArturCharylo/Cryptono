// Helper interface for custom fields
interface CustomField {
    name: string;
    value: string;
    type: string;
}

// This function is located here, because contentScripts doesn't allow imports here
export function showAutoSaveToast(message: string = 'Data saved!') {
    // 1. Check access
    if (typeof document === 'undefined') {
        console.error('Cannot show toast from Background Script directly. Use messaging.');
        return;
    }

    // 2. Main container
    const host = document.createElement('div');
    host.id = 'cryptono-toast-host';
    Object.assign(host.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '2147483647', // Max Z-index to ensure nothing covers our toast
        pointerEvents: 'none' // Avoid blocking actions underneath
    });

    // 3. Shadow DOM
    const shadow = host.attachShadow({ mode: 'open' });

    // 4. HTML & CSS
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            background-color: #10B981; /* Success Green */
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 0;
            transform: translateY(-20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: auto;
        }
        .toast.visible {
            opacity: 1;
            transform: translateY(0);
        }
        .icon {
            font-size: 18px;
        }
    `;

    const toastDiv = document.createElement('div');
    toastDiv.className = 'toast';
    toastDiv.innerHTML = `
        <span class="icon">🔒</span>
        <span>${message}</span>
    `;

    // 5. Complete Toast
    shadow.appendChild(style);
    shadow.appendChild(toastDiv);
    document.body.appendChild(host);

    // 6. Animation after entering DOM
    requestAnimationFrame(() => {
        toastDiv.classList.add('visible');
    });

    // 7. Auto hide after 3s
    setTimeout(() => {
        toastDiv.classList.remove('visible');
        setTimeout(() => {
            host.remove();
        }, 300);
    }, 3000);
}

const autoFill = async () => {
  // Call background.ts for user data on current host
  const hostname = globalThis.location.hostname;
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      type: 'AUTOFILL_REQUEST', 
      url: hostname 
    });

    if (response?.success && response?.data) {
      // Pass retrieved fields to the filling function
      fillForms(response.data.username, response.data.password, response.data.fields);
    } else {
      // Vault locked or no matching data found - ignore request
    }
  } catch (err) {
    // Communication error
    console.debug('Cryptono connection issue:', err);
  }
};

const fillForms = (username: string, pass: string, customFields?: CustomField[]) => {
  // Find all password fields
  const passwordInputs = document.querySelectorAll('input[type="password"]');

  for (const passwordInput of passwordInputs) {
    const input = passwordInput as HTMLInputElement;
    
    // Autofill passwords
    input.value = pass;
    // Call events for popular web frameworks to notice (example: React, Vue)
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Find login field closely to password
    const form = input.closest('form');
    let usernameInput: HTMLInputElement | null = null;

    if (form) {
      // If form found search for inputs inside
      const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])'));
      const passIndex = inputs.indexOf(input);
      // Take input that appears before password
      if (passIndex > 0) {
        usernameInput = inputs[passIndex - 1] as HTMLInputElement;
      }
    } else {
      // Fallback: Look for previous input in document
    }

    // If input field found and is empty
    if (usernameInput && !usernameInput.value) {
      usernameInput.value = username;
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Mark that Cryptono autofilled the input with updated background color
      usernameInput.style.backgroundColor = '#e8f0fe';
      input.style.backgroundColor = '#e8f0fe';
    }

    // --- NEW: Fill Custom Fields ---
    if (form && customFields && customFields.length > 0) {
        customFields.forEach(field => {
            // Search for input that matches the custom field name/id (case insensitive)
            const selector = `
                input[name="${field.name}" i], 
                input[id="${field.name}" i],
                textarea[name="${field.name}" i],
                textarea[id="${field.name}" i]
            `;
            
            const targetInput = form.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;

            // Only fill if found and currently empty to avoid overwriting user input
            if (targetInput && !targetInput.value) {
                targetInput.value = field.value;
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                targetInput.dispatchEvent(new Event('change', { bubbles: true }));
                targetInput.style.backgroundColor = '#e8f0fe'; // Mark as autofilled
            }
        });
    }
  }
};

// Run autofill on site load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(autoFill, 500));
} else {
    setTimeout(autoFill, 500);
}

/**
  Below This comment functions related to AutoSave start
**/

// form submit Listener - Allows to catch final data from the form before it's processed by the site and 'lost'
document.addEventListener('submit', async (e) => {
  const target = e.target as HTMLFormElement;
  
  // Search for password field
  const passwordInput = target.querySelector('input[type="password"]') as HTMLInputElement;

  // Ignore in case none found or empty
  if (!passwordInput || !passwordInput.value) return;

  // Simple logic for finding login input
  // This probably should be more complex in future versions, although it will mostly work the way it is now
  const inputs = Array.from(target.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])'));
  const passIndex = inputs.indexOf(passwordInput);
  let usernameInput: HTMLInputElement | null = null;

  if (passIndex > 0) {
    usernameInput = inputs[passIndex - 1] as HTMLInputElement;
  }

  // If both login and password are found
  if (usernameInput && usernameInput.value) {
    const url = globalThis.location.hostname;
    
    // --- NEW: Collect Additional Fields for AutoSave ---
    const collectedFields: CustomField[] = [];
    
    // Get all relevant inputs/textareas from the form
    const allInputs = target.querySelectorAll('input, textarea, select');

    allInputs.forEach((el) => {
        const input = el as HTMLInputElement; // casting for simplicity
        
        // Skip:
        // 1. Hidden inputs
        // 2. Action buttons (submit, button, image)
        // 3. Main credentials (we already have them)
        // 4. Empty fields or fields without a name attribute
        const isHidden = input.type === 'hidden' || input.style.display === 'none';
        const isAction = input.type === 'submit' || input.type === 'button' || input.type === 'image';
        const isMainCreds = input === passwordInput || input === usernameInput;
        const hasData = input.name && input.value;

        if (!isHidden && !isAction && !isMainCreds && hasData) {
            collectedFields.push({
                name: input.name, // We use the 'name' attribute as the key
                value: input.value,
                type: input.type || 'text'
            });
        }
    });

    // send data to be processed
    try {
      await chrome.runtime.sendMessage({
        type: 'AUTOSAVE_REQUEST',
        data: {
          url: url,
          username: usernameInput.value,
          password: passwordInput.value,
          fields: collectedFields // Include collected custom fields
        }
      });
    } catch (err) {
      console.error('Cryptono AutoSave error:', err);
    }
  }
}, true); // Use capture phase to catch event before other handlers potentially stop it

chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'SHOW_TOAST') {
        showAutoSaveToast(request.message);
    }
});