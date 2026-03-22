import { EditorPanel } from './editor/EditorPanel';
import { ExecutionState } from './state/ExecutionState';
import { StackPanel } from './viz/StackPanel';
import { HeapPanel } from './viz/HeapPanel';
import { RegistersPanel } from './viz/RegistersPanel';
import { SyntaxReference } from './components/SyntaxReference';
import { AutoPlayController } from './interpreter/AutoPlayController';
import { EXAMPLES } from './examples/index';
import type { WorkerResult } from './interpreter/types';

const WORKER_TIMEOUT_MS = 5000;

export class App {
  private editor: EditorPanel;
  private state: ExecutionState;
  private stackPanel: StackPanel;
  private heapPanel: HeapPanel;
  private registersPanel: RegistersPanel;
  private syntaxRef: SyntaxReference;
  private autoPlay: AutoPlayController;

  constructor(root: HTMLElement) {
    // Build DOM structure
    const exampleOptions = EXAMPLES.map(
      (ex, i) => `<option value="${i}">${ex.name}</option>`
    ).join('');

    root.innerHTML = `
      <div class="toolbar">
        <span class="toolbar-title">Memory Visualizer</span>
        <div class="toolbar-divider"></div>
        <div class="step-controls">
          <select id="example-select" title="Load example">
            <option value="">Examples…</option>
            ${exampleOptions}
          </select>
          <button id="btn-run" title="Run (Ctrl+S)">Run &#9654;</button>
          <button id="btn-play" title="Auto-play">&#9654;&#9654; Play</button>
          <select id="speed-select" title="Playback speed">
            <option value="slow">Slow</option>
            <option value="medium" selected>Medium</option>
            <option value="fast">Fast</option>
          </select>
          <button id="btn-back" title="Step Back">&larr;</button>
          <button id="btn-forward" title="Step Forward">&rarr;</button>
          <button id="btn-reset" title="Reset">Reset</button>
          <span id="step-display" class="step-display">Step 0 / 0</span>
        </div>
      </div>
      <div class="main-layout">
        <div class="editor-pane" id="editor-container"></div>
        <div class="viz-pane">
          <div id="error-banner" class="error-banner" style="display: none;"></div>
          <div class="stack-panel" id="stack-panel">
            <div class="panel-header" style="border-left: 3px solid var(--color-stack-border)">Stack</div>
            <div id="stack-content"></div>
          </div>
          <div class="heap-panel" id="heap-panel">
            <div class="panel-header" style="border-left: 3px solid var(--color-heap-border)">Heap</div>
            <div id="heap-content"></div>
          </div>
          <div class="registers-panel" id="registers-panel">
            <div class="panel-header" style="border-left: 3px solid var(--color-register-border)">Registers</div>
            <div id="registers-content"></div>
            <div id="syntax-ref" class="syntax-ref-container"></div>
          </div>
        </div>
      </div>
    `;

    // Create components with their DOM containers
    const editorContainer = root.querySelector('#editor-container') as HTMLElement;
    const stackContent = root.querySelector('#stack-content') as HTMLElement;
    const heapContent = root.querySelector('#heap-content') as HTMLElement;
    const registersContent = root.querySelector('#registers-content') as HTMLElement;
    const syntaxRefContainer = root.querySelector('#syntax-ref') as HTMLElement;

    this.editor = new EditorPanel(editorContainer, EXAMPLES[0]?.code ?? '');
    this.state = new ExecutionState();
    this.stackPanel = new StackPanel(stackContent);
    this.heapPanel = new HeapPanel(heapContent);
    this.registersPanel = new RegistersPanel(registersContent);
    this.syntaxRef = new SyntaxReference(syntaxRefContainer);
    this.autoPlay = new AutoPlayController(this.state, () => this.updatePlayButton());

    // Wire state changes to panels and editor
    this.state.onChange((snapshot) => {
      const prev = this.state.previousSnapshot;
      if (snapshot) {
        this.stackPanel.render(snapshot.stack, prev?.stack ?? [], snapshot.pointers);
        this.heapPanel.render(snapshot.heap, prev?.heap ?? []);
        this.registersPanel.render(snapshot.registers);
        this.editor.highlightLine(snapshot.lineNumber);
        this.updateStepDisplay();
      } else {
        this.stackPanel.render([]);
        this.heapPanel.render([]);
        this.registersPanel.render(null);
        this.editor.clearHighlight();
        this.updateStepDisplay();
      }
    });

    // Ctrl+S / Cmd+S triggers run
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.runProgram();
      }
    });

    // Wire step control buttons
    root.querySelector('#btn-run')?.addEventListener('click', () => this.runProgram());
    root.querySelector('#btn-play')?.addEventListener('click', () => this.autoPlay.togglePlay());
    root.querySelector('#btn-forward')?.addEventListener('click', () => {
      this.autoPlay.stopPlay();
      this.state.stepForward();
    });
    root.querySelector('#btn-back')?.addEventListener('click', () => {
      this.autoPlay.stopPlay();
      this.state.stepBackward();
    });
    root.querySelector('#btn-reset')?.addEventListener('click', () => {
      this.autoPlay.stopPlay();
      this.state.reset();
    });

    const speedSelect = root.querySelector('#speed-select') as HTMLSelectElement | null;
    speedSelect?.addEventListener('change', () => {
      this.autoPlay.currentSpeed = speedSelect.value as 'slow' | 'medium' | 'fast';
    });

    const exampleSelect = root.querySelector('#example-select') as HTMLSelectElement | null;
    exampleSelect?.addEventListener('change', () => {
      const idx = parseInt(exampleSelect.value, 10);
      if (!isNaN(idx) && EXAMPLES[idx]) {
        this.autoPlay.stopPlay();
        this.state.reset();
        this.editor.clearErrors();
        this.hideErrorBanner();
        this.editor.setValue(EXAMPLES[idx].code);
        exampleSelect.value = '';
      }
    });
  }

  private updatePlayButton(): void {
    const btn = document.getElementById('btn-play');
    if (btn) {
      btn.innerHTML = this.autoPlay.isPlaying ? '&#9646;&#9646; Pause' : '&#9654;&#9654; Play';
    }
  }

  private runProgram(): void {
    // Stop auto-play before running
    this.autoPlay.stopPlay();

    // Clear previous errors and error banner
    this.editor.clearErrors();
    this.hideErrorBanner();

    // Get source code from editor
    const source = this.editor.getValue();

    // Create worker using new URL pattern (reliable cross-browser)
    let terminated = false;
    const worker = new Worker(
      new URL('./interpreter/worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Timeout guard — kills frozen workers (infinite loops)
    const timer = setTimeout(() => {
      terminated = true;
      worker.terminate();
      this.showErrorBanner('Execution timed out: possible infinite loop');
    }, WORKER_TIMEOUT_MS);

    // Handle result from worker
    worker.onmessage = (e: MessageEvent<WorkerResult>) => {
      if (terminated) return;
      clearTimeout(timer);
      worker.terminate();

      if (e.data.type === 'trace') {
        this.state.load(e.data.trace);
      } else {
        // Error with partial trace — show banner, load partial trace for stepping
        this.showErrorBanner(e.data.message);
        if (e.data.partialTrace.length > 0) {
          this.state.load(e.data.partialTrace);
        }
        // Highlight error line in editor if message contains line number
        const lineMatch = e.data.message.match(/line (\d+)/i);
        if (lineMatch && lineMatch[1] !== undefined) {
          const line = parseInt(lineMatch[1], 10);
          this.editor.setErrors([{ line, message: e.data.message }]);
        }
      }
    };

    // Handle worker crash (uncaught error inside worker)
    worker.onerror = (err) => {
      if (terminated) return;
      clearTimeout(timer);
      worker.terminate();
      this.showErrorBanner(err.message || 'Worker error');
    };

    // Send source to worker
    worker.postMessage({ source });
  }

  private showErrorBanner(message: string): void {
    const banner = document.getElementById('error-banner');
    if (banner) {
      banner.textContent = message;
      banner.style.display = 'block';
    }
  }

  private hideErrorBanner(): void {
    const banner = document.getElementById('error-banner');
    if (banner) {
      banner.style.display = 'none';
    }
  }

  private updateStepDisplay(): void {
    const display = document.getElementById('step-display');
    if (display) {
      if (this.state.stepCount === 0) {
        display.textContent = 'Step 0 / 0';
      } else {
        display.textContent = `Step ${this.state.currentIndex + 1} / ${this.state.stepCount}`;
      }
    }
  }
}
