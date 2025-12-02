import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/background.ts'),
        contentScript: resolve(__dirname, 'src/contentScript.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
        validation: resolve(__dirname, 'src/validation/validate.ts')
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
        const filesToCopy = ['manifest.json']
        
        filesToCopy.forEach(file => {
          const src = resolve(__dirname, 'src', file)
          const dest = resolve(__dirname, 'dist', file.split('/').pop()!)
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest)
            console.log(`✓ ${file} copied to dist/`)
          }
        })

        // Handle popup.html separately to replace .ts with .js
        const popupHtmlSrc = resolve(__dirname, 'src/popup/popup.html')
        const popupHtmlDest = resolve(__dirname, 'dist/popup.html')
        if (fs.existsSync(popupHtmlSrc)) {
            let content = fs.readFileSync(popupHtmlSrc, 'utf-8')
            content = content.replace('src="popup.ts"', 'src="popup.js"')
            
            // Transform CSS paths
            content = content.replace('href="../styles/popup.css"', 'href="styles/popup.css"')
            content = content.replace('href="../styles/App.css"', 'href="styles/App.css"')
            content = content.replace('href="../styles/passwords.css"', 'href="styles/passwords.css"')
            
            fs.writeFileSync(popupHtmlDest, content)
            console.log(`✓ popup.html copied and transformed to dist/`)
        }

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