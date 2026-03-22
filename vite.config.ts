import { defineConfig } from 'vite';
import monacoEditorPluginModule from 'vite-plugin-monaco-editor';

const monacoEditorPlugin = (monacoEditorPluginModule as any).default || monacoEditorPluginModule;

export default defineConfig({
  base: '/Memory-Visualization/',
  plugins: [
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'css', 'html'],
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
