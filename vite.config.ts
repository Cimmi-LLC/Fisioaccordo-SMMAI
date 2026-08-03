import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Le dipendenze cambiano molto piu di rado del codice applicativo:
        // separandole restano in cache del browser tra un deploy e l'altro
        // (prima ogni deploy invalidava un unico bundle da 650 KB) e i
        // pezzi si scaricano in parallelo.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('lucide-react')) return 'vendor-icons';
          // Tutto il resto senza gruppo esplicito: lo lasciamo a Rollup, che
          // tiene le dipendenze pesanti (recharts, node-vibrant,
          // html-to-image) nel chunk della rotta che le usa davvero. Un
          // catch-all le trascinerebbe nel caricamento iniziale.
          return undefined;
        },
      },
    },
    // Il grosso e gia diviso: la soglia serve solo a non nascondere
    // eventuali regressioni future sotto un warning generico.
    chunkSizeWarningLimit: 700,
  },
}));
