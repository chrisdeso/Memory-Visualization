import * as monaco from 'monaco-editor';

export class EditorPanel {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private decorationIds: string[] = [];

  constructor(container: HTMLElement, initialCode = '') {
    this.editor = monaco.editor.create(container, {
      value: initialCode,
      language: 'cpp',
      theme: 'vs-dark',
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      readOnly: false,
    });
  }

  getValue(): string {
    return this.editor.getValue();
  }

  setValue(code: string): void {
    this.editor.setValue(code);
  }

  // EDIT-02: Highlight currently executing line
  // CRITICAL: Always pass this.decorationIds as first arg to deltaDecorations
  // to remove previous highlight. See Pitfall 2 in RESEARCH.md.
  highlightLine(lineNumber: number): void {
    this.decorationIds = this.editor.deltaDecorations(this.decorationIds, [
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: true,
          className: 'active-line-decoration',
          linesDecorationsClassName: 'active-line-gutter',
        },
      },
    ]);
  }

  clearHighlight(): void {
    this.decorationIds = this.editor.deltaDecorations(this.decorationIds, []);
  }

  // EDIT-03: Show error squiggles
  setErrors(errors: Array<{ line: number; col?: number; message: string }>): void {
    const model = this.editor.getModel();
    if (!model) return;
    monaco.editor.setModelMarkers(model, 'interpreter', errors.map(e => ({
      startLineNumber: e.line,
      startColumn: e.col ?? 1,
      endLineNumber: e.line,
      endColumn: model.getLineMaxColumn(e.line),
      message: e.message,
      severity: monaco.MarkerSeverity.Error,
    })));
  }

  clearErrors(): void {
    const model = this.editor.getModel();
    if (model) monaco.editor.setModelMarkers(model, 'interpreter', []);
  }

  dispose(): void {
    this.editor.dispose();
  }
}
