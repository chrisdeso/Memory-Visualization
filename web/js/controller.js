// controller.js
// Simple controller for interactive memory visualization
// Handles code highlighting, step navigation, and memory section updates

// Sample steps data (replace with real data as needed)
const steps = [
  {
    code: [
      "double x[3];",
      "int *y;",
      "void foo(int a) {",
      "    y = malloc(3 * sizeof(int));",
      "    int j;",
      "    for (j = 1; j < 3; j++) {",
      "        y[j] = 3 + a * x[j - 1];",
      "    }",
      "    bar(a);",
      "}"
    ],
    highlight: 8, // line to highlight (0-based)
    step: "Step 7: Function call to bar()",
    desc: "The function bar() is called with the same parameter. A new stack frame is created.",
    stack: `<div class='mem-header stack-header'>Stack (globals)</div><table class='mem-table'><tr><th>x[0]</th><td>0x7fff5fbff810</td><td>0.0</td></tr><tr><th>x[1]</th><td>0x7fff5fbff818</td><td>0.0</td></tr><tr><th>x[2]</th><td>0x7fff5fbff820</td><td>0.0</td></tr><tr><th>y</th><td>0x7fff5fbff828</td><td>0x55555576b2a0</td></tr></table>`,
    static: `<div class='mem-header static-header'>Static data (function frames)</div><table class='mem-table'><tr><th colspan='3'>foo() frame</th></tr><tr><th>a</th><td>0x7fff5fbff7e0</td><td>5</td></tr><tr><th>j</th><td>0x7fff5fbff7dc</td><td>3</td></tr><tr><th colspan='3'>bar() frame</th></tr><tr><th>a</th><td>0x7fff5fbff7b0</td><td>5</td></tr></table>`,
    heap: `<div class='mem-header heap-header'>Heap memory</div><table class='mem-table'><tr><th>y[0]</th><td>0x55555576b2a0</td><td>0</td></tr><tr><th>y[1]</th><td>0x55555576b2a4</td><td>3</td></tr><tr><th>y[2]</th><td>0x55555576b2a8</td><td>3</td></tr></table>`
  }
  // Add more steps as needed
];

let currentStep = 0;

function renderStep(idx) {
  const s = steps[idx];
  // Render code with highlight
  document.getElementById('code-block').innerHTML = s.code.map((line, i) =>
    i === s.highlight
      ? `<span class=\"highlight-line\">${line}</span>`
      : line
  ).join('\n');
  // Step bar and desc
  document.getElementById('step-bar').textContent = s.step;
  document.getElementById('step-desc').textContent = s.desc;
  // Memory sections
  document.getElementById('stack-section').innerHTML = s.stack;
  document.getElementById('static-section').innerHTML = s.static;
  document.getElementById('heap-section').innerHTML = s.heap;
}

document.addEventListener('DOMContentLoaded', () => {
  // Navigation
  document.getElementById('prev-btn').onclick = () => {
    if (currentStep > 0) { currentStep--; renderStep(currentStep); }
  };
  document.getElementById('next-btn').onclick = () => {
    if (currentStep < steps.length - 1) { currentStep++; renderStep(currentStep); }
  };
  document.getElementById('reset-btn').onclick = () => {
    currentStep = 0; renderStep(currentStep);
  };
  // Initial render
  renderStep(currentStep);
}); 