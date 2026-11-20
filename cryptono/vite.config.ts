import { defineConfig, normalizePath } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'fs';

export default defineConfig({
  root: resolve(__dirname, 'src/popup'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        background: resolve(__dirname, 'src/background/background.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(resolve(__dirname, 'node_modules/argon2-extension-mv3/dist/argon2_wasm.wasm')),
          dest: '.'
        },
        {
          // Audit WASM file
          src: normalizePath(resolve(__dirname, 'src/wasm/cryptono_audit_bg.wasm')),
          dest: '.'
        },
        {
          // Audit TS Definitions
          src: normalizePath(resolve(__dirname, 'src/wasm/cryptono_audit_bg.wasm.d.ts')),
          dest: '.'
        },
        {
          // Secret Sharing Scheme WASM file
          src: normalizePath(resolve(__dirname, 'src/wasm/cryptono_sss_bg.wasm')),
          dest: '.'
        },
        {
          // Secret Sharing Scheme WASM file
          src: normalizePath(resolve(__dirname, 'src/wasm/cryptono_sss_bg.wasm.d.ts')),
          dest: '.'
        },
        {
          // Zip / Backup compression WASM file
          src: normalizePath(resolve(__dirname, 'src/wasm/cryptono_zip_bg.wasm')),
          dest: '.'
        },
        {
          // Zip / Backup compression TS Definitions
          src: normalizePath(resolve(__dirname, 'src/wasm/cryptono_zip_bg.wasm.d.ts')),
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
            fs.writeFileSync(manifestDest, fs.readFileSync(manifestSrc));
            console.log('✓ manifest.json copied');
        }

        // Transform and copy popup.html
        const popupHtmlSrc = resolve(__dirname, 'src/popup/popup.html');
        const popupHtmlDest = resolve(__dirname, 'dist/popup.html');
        if (fs.existsSync(popupHtmlSrc)) {
            let content = fs.readFileSync(popupHtmlSrc, 'utf-8');
            content = content.replace('src="popup.ts"', 'src="popup.js"');
            
            // Adjust CSS paths for the dist structure
            const styles = ['popup', 'App', 'passwords', 'addItem', 'settings', 'backupLogin'];
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
            fs.writeFileSync(resolve(distStylesDir, file), fs.readFileSync(resolve(stylesDir, file)));
          });
          console.log('✓ Styles copied');
        }
      }
    }
  ]
});
