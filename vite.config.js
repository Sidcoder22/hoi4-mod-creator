import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Alles wird zu einer einzigen HTML-Datei gebaut, die per Doppelklick laeuft.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  build: {
    outDir: 'dist',
    rollupOptions: { input: 'hoi4-mod-creator.html' },
  },
  test: { include: ['tests/**/*.test.js'], environment: 'node' },
})
