const autoFill = async () => {
  // Call background.ts for user data on current host
  const hostname = globalThis.location.hostname;
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      type: 'AUTOFILL_REQUEST', 
      url: hostname 
    });

    if (response?.success && response?.data) {
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
    
    // send data to be processed
    try {
      await chrome.runtime.sendMessage({
        type: 'AUTOSAVE_REQUEST',
        data: {
          url: url,
          username: usernameInput.value,
          password: passwordInput.value
        }
      });
    } catch (err) {
      console.error('Cryptono AutoSave error:', err);
    }
  }
}, true); // Use capture phase to catch event before other handlers potentially stop it