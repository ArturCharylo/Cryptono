console.log('Cryptono: Content script active');

const autoFill = async () => {
  // Call background.ts for user data on current host
  const hostname = globalThis.location.hostname;
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      type: 'AUTOFILL_REQUEST', 
      url: hostname 
    });

    if (response?.success && response?.data) {
      console.log('Cryptono: Credentials found, attempting autofill...');
      fillForms(response.data.username, response.data.password);
    } else {
      // Vault locked or no matching data found - ignore request
    }
  } catch (err) {
    // Communication error
    console.debug('Cryptono connection issue:', err);
  }
};

const fillForms = (username: string, pass: string) => {
  // Find all password fields
  const passwordInputs = document.querySelectorAll('input[type="password"]');

  for (const passwordInput of passwordInputs) {
    const input = passwordInput as HTMLInputElement;
    
    // Autofill passwords
    input.value = pass;
    // Call events for popular web frameworks to notice(example: React, Vue)
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
  }
};

// Run autofill on site load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(autoFill, 500));
} else {
    setTimeout(autoFill, 500);
}