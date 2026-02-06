import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Do not empty the directory, as the main build runs first
    emptyOutDir: false,
    rollupOptions: {
      input: {
        contentScript: resolve(__dirname, 'src/contentScript.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        // IIFE format bundles everything into one file, suitable for content scripts
        format: 'iife',
        // Required for IIFE when using dynamic imports or multiple dependencies
        inlineDynamicImports: true 
      }
    },
    outDir: 'dist'
  }
});