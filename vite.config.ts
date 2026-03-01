import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
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
