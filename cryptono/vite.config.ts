import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Build background and popup using standard ES modules
        background: resolve(__dirname, 'src/background/background.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        format: 'es' 
      }
    },
    outDir: 'dist',
    emptyOutDir: true 
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/argon2-extension-mv3/dist/argon2_wasm.wasm',
          dest: '.' 
        }
      ]
    }),
    {
      name: 'copy-extension-files',
      closeBundle() {
        // Copy manifest.json to dist
        const manifestSrc = resolve(__dirname, 'src/manifest.json');
        const manifestDest = resolve(__dirname, 'dist/manifest.json');
        if (fs.existsSync(manifestSrc)) {
            fs.copyFileSync(manifestSrc, manifestDest);
            console.log('✓ manifest.json copied');
        }

        // Transform and copy popup.html
        const popupHtmlSrc = resolve(__dirname, 'src/popup/popup.html');
        const popupHtmlDest = resolve(__dirname, 'dist/popup.html');
        if (fs.existsSync(popupHtmlSrc)) {
            let content = fs.readFileSync(popupHtmlSrc, 'utf-8');
            content = content.replace('src="popup.ts"', 'src="popup.js"');
            
            // Adjust CSS paths for the dist structure
            const styles = ['popup', 'App', 'passwords', 'addItem', 'settings'];
            styles.forEach(style => {
                content = content.replace(`href="../styles/${style}.css"`, `href="styles/${style}.css"`);
            });
            
            fs.writeFileSync(popupHtmlDest, content);
            console.log('✓ popup.html transformed and copied');
        }

        // Copy all CSS files
        const stylesDir = resolve(__dirname, 'src/styles');
        const distStylesDir = resolve(__dirname, 'dist/styles');
        if (fs.existsSync(stylesDir)) {
          if (!fs.existsSync(distStylesDir)) {
            fs.mkdirSync(distStylesDir, { recursive: true });
          }
          fs.readdirSync(stylesDir).forEach(file => {
            fs.copyFileSync(resolve(stylesDir, file), resolve(distStylesDir, file));
          });
          console.log('✓ Styles copied');
        }
      }
    }
  ]
});