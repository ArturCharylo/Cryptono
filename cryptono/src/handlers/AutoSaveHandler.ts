import { storageService } from '../services/StorageService';
import { STORAGE_KEYS } from '../constants/constants';

export async function handleInputSave(
    url: string,
): Promise<object>{
     try {
    // Check if user is logged in by checking if master password is in session
    const sessionData = await chrome.storage.session.get(STORAGE_KEYS.MASTER);
    const masterPassword = sessionData[STORAGE_KEYS.MASTER] as string;

    if (!masterPassword) {
      return { success: false, error: 'LOCKED' };
    }

    // Find matching data once the URL is matched
    const item = await storageService.findCredentialsForUrl(url, masterPassword);

    if (!item){
        //This is for now empty, I think I'll implement AutoSave script here, idea might change later
    }


  } catch (error) {
    console.error('Autofill error:', error);

  }
  return {success: true}
}
