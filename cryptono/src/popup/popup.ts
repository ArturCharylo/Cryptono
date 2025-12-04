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

    // Default route
    if (cookieService.getCookie('authToken') === null) {
        router.navigate('/login');
    }
    else {
        router.navigate('/passwords');
    }
});
