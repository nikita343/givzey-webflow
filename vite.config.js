import { defineConfig } from 'vite';
export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: 'src/main.js',
      output: {
        entryFileNames: 'givzey.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: a => a.name && a.name.endsWith('.css') ? 'givzey.css' : 'assets/[name]-[hash][extname]'
      }
    }
  }
});
