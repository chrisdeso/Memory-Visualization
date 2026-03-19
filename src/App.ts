import { EditorPanel } from './editor/EditorPanel';
import { ExecutionState } from './state/ExecutionState';
import { StackPanel } from './viz/StackPanel';
import { HeapPanel } from './viz/HeapPanel';
import { RegistersPanel } from './viz/RegistersPanel';
import { demoTrace } from './fixtures/demoTrace';

export class App {
  private editor: EditorPanel;
  private state: ExecutionState;
  private stackPanel: StackPanel;
  private heapPanel: HeapPanel;
  private registersPanel: RegistersPanel;

  constructor(root: HTMLElement) {
    // Build DOM structure
    root.innerHTML = `
      <div class="toolbar">
        <span class="toolbar-title">Memory Visualizer</span>
        <div class="step-controls">
          <button id="btn-reset" title="Reset">Reset</button>
          <button id="btn-back" title="Step Back">&larr; Back</button>
          <button id="btn-forward" title="Step Forward">Forward &rarr;</button>
          <span id="step-display" class="step-display">Step 0/0</span>
        </div>
      </div>
      <div class="main-layout">
        <div class="editor-pane" id="editor-container"></div>
        <div class="viz-pane">
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
          </div>
        </div>
      </div>
    `;

    // Create components with their DOM containers
    const editorContainer = root.querySelector('#editor-container') as HTMLElement;
    const stackContent = root.querySelector('#stack-content') as HTMLElement;
    const heapContent = root.querySelector('#heap-content') as HTMLElement;
    const registersContent = root.querySelector('#registers-content') as HTMLElement;

    // Sample C code that matches the fixture trace
    const sampleCode = `#include <stdio.h>
#include <stdlib.h>

int main() {
    int x = 42;
    int *p = (int*)malloc(16);
    *p = 100;
    free(p);
    return 0;
}`;

    this.editor = new EditorPanel(editorContainer, sampleCode);
    this.state = new ExecutionState();
    this.stackPanel = new StackPanel(stackContent);
    this.heapPanel = new HeapPanel(heapContent);
    this.registersPanel = new RegistersPanel(registersContent);

    // Wire state changes to panels and editor
    this.state.onChange((snapshot) => {
      if (snapshot) {
        this.stackPanel.render(snapshot.stack);
        this.heapPanel.render(snapshot.heap);
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

    // Wire step control buttons
    root.querySelector('#btn-forward')?.addEventListener('click', () => this.state.stepForward());
    root.querySelector('#btn-back')?.addEventListener('click', () => this.state.stepBackward());
    root.querySelector('#btn-reset')?.addEventListener('click', () => this.state.reset());

    // Load fixture trace
    this.state.load(demoTrace);
  }

  private updateStepDisplay(): void {
    const display = document.getElementById('step-display');
    if (display) {
      display.textContent = `Step ${this.state.currentIndex + 1}/${this.state.stepCount}`;
    }
  }
}
