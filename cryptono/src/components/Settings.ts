export class Settings{
    navigate: (path: string) => void;

    constructor(navigate: (path: string) => void) {
        this.navigate = navigate;
    }
    render() {
        return `
            <div class="container">
                <div class="header">
                    <div class="logo">
                        <a href="#" class="return-home"><- Back to Home</a>
                        <h1 class="extensionTitle">Cryptono Settings</h1>
                    </div>
                    <p class="extensionSub">Manage your preferences</p>
                </div>
                <div class="settings-content">
                    <p>Settings page content goes here.</p>
                </div>
            </div>
        `;
    }
    afterRender() {
        // Handle navigation back to home
        const homeLink = document.querySelector('.return-home');
        if (homeLink){
            homeLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate('/passwords');
            });
        };
    }
}