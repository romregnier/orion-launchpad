import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Injecter un timestamp de build comme version — change à chaque deploy
const BUILD_VERSION = Date.now().toString(36)

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  plugins: [react()],
  build: {
    // Force un hash basé sur le contenu + timestamp pour casser le cache Surge CDN
    rollupOptions: {
      output: {
        // Hash long = moins de collision CDN
        assetFileNames: 'assets/[name]-[hash:16][extname]',
        chunkFileNames: 'assets/[name]-[hash:16].js',
        entryFileNames: 'assets/[name]-[hash:16].js',
      },
    },
    // Augmenter la limite pour supprimer le warning
    chunkSizeWarningLimit: 700,
  },
})
