import '../styles/popup.css';
import '../styles/App.css';
import '../styles/passwords.css';
import { Router } from '../utils/router';
import { Login } from '../components/Login';
import { Register } from '../components/Register';
import { Passwords } from '../components/Passwords';
import { cookieService } from '../services/CookieService';

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app') as HTMLElement;
    const router = new Router(root);

    const navigate = (path: string) => {
        router.navigate(path);
    };

    router.addRoute('/', () => new Login(navigate).render(), () => new Login(navigate).afterRender());
    router.addRoute('/login', () => new Login(navigate).render(), () => new Login(navigate).afterRender());
    router.addRoute('/register', () => new Register(navigate).render(), () => new Register(navigate).afterRender());
    router.addRoute('/passwords', () => new Passwords(navigate).render(), () => new Passwords(navigate).afterRender());

    // Token -> Passwords
    if (cookieService.getCookie('authToken')) {
        router.navigate('/passwords');
    }
    // NO Token -> Login
    else {
        router.navigate('/login');
    }
});