import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/background.ts'),
        contentScript: resolve(__dirname, 'src/contentScript.ts'),
        popup: resolve(__dirname, 'src/pages/popup/popup.ts'),
        main: resolve(__dirname, 'src/main.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').at(1) ?? ''
          
          if (extType === 'css') {
            return 'styles/[name].[ext]'
          }
          if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(extType)) {
            return 'assets/[name].[ext]'
          }
          if (extType === 'html') {
            return '[name].[ext]'
          }
          
          return '[name].[ext]'
        }
      }
    },
    outDir: 'dist'
  },
  plugins: [
    {
      name: 'copy-extension-files',
      closeBundle() {
        const filesToCopy = ['manifest.json', 'pages/popup/popup.html', 'pages/passwords/passwords.html']
        
        filesToCopy.forEach(file => {
          const src = resolve(__dirname, 'src', file)
          const dest = resolve(__dirname, 'dist', file.split('/').pop()!)
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest)
            console.log(`✓ ${file} copied to dist/`)
          }
        })

        const stylesDir = resolve(__dirname, 'src/styles')
        const distStylesDir = resolve(__dirname, 'dist/styles')
        if (fs.existsSync(stylesDir)) {
          if (!fs.existsSync(distStylesDir)) {
            fs.mkdirSync(distStylesDir, { recursive: true })
          }
          const styleFiles = fs.readdirSync(stylesDir)
          styleFiles.forEach(file => {
            const src = resolve(stylesDir, file)
            const dest = resolve(distStylesDir, file)
            fs.copyFileSync(src, dest)
            console.log(`✓ styles/${file} copied to dist/styles/`)
          })
        }
      }
    }
  ]
})