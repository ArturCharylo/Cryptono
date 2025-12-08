import '../styles/popup.css';
import '../styles/App.css';
import '../styles/passwords.css';
import '../styles/addItem.css'
import { Router } from '../utils/router';
import { Login } from '../components/Login';
import { Register } from '../components/Register';
import { Passwords } from '../components/Passwords';
import { AddItem } from '../components/AddItem';
import { EditItem } from '../components/EditItem';
import { STORAGE_KEYS } from '../constants/constants';

document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('app') as HTMLElement;
    const router = new Router(root);

    const navigate = (path: string) => {
        router.navigate(path);
    };

    router.addRoute('/', () => new Login(navigate).render(), () => new Login(navigate).afterRender());
    router.addRoute('/login', () => new Login(navigate).render(), () => new Login(navigate).afterRender());
    router.addRoute('/register', () => new Register(navigate).render(), () => new Register(navigate).afterRender());
    router.addRoute('/passwords', () => new Passwords(navigate).render(), () => new Passwords(navigate).afterRender());
    router.addRoute('/addItem', () => new AddItem(navigate).render(), () => new AddItem(navigate).afterRender());
    router.addRoute('/editItem', () => new EditItem(navigate).render(), () => new EditItem(navigate).afterRender())

    // Token -> Passwords
    const sessionData = await chrome.storage.session.get(STORAGE_KEYS.MASTER);
    if (sessionData.masterPassword) {
        router.navigate('/passwords');
    }
    // NO Token -> Login
    else {
        router.navigate('/login');
    }
});