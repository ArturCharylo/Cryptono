import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        contentScript: resolve(__dirname, 'src/contentScript.ts'),
        popup: resolve(__dirname, 'src/popup.ts'), // ← DODAJ TUTAJ
        popupHTML: resolve(__dirname, 'src/popup.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist'
  },
  plugins: [
    {
      name: 'copy-extension-files',
      closeBundle() {
        const filesToCopy = ['manifest.json', 'popup.html']
        
        filesToCopy.forEach(file => {
          const src = resolve(__dirname, 'src', file)
          const dest = resolve(__dirname, 'dist', file)
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest)
            console.log(`✓ ${file} copied to dist/`)
          }
        })
      }
    }
  ]
})