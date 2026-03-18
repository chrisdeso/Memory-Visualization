import '@fontsource/jetbrains-mono';
import './styles/main.css';

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `
    <div class="toolbar">
      <span style="color: var(--color-text-muted)">Memory Visualizer</span>
    </div>
    <div class="main-layout">
      <div class="editor-pane" id="editor-container"></div>
      <div class="viz-pane">
        <div class="stack-panel" id="stack-panel">
          <div class="panel-header">Stack</div>
        </div>
        <div class="heap-panel" id="heap-panel">
          <div class="panel-header">Heap</div>
        </div>
        <div class="registers-panel" id="registers-panel">
          <div class="panel-header">Registers</div>
        </div>
      </div>
    </div>
  `;
}
