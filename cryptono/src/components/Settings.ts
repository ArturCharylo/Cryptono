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
                        <div class="logo-icon">⚙️</div>
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
}