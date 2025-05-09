// controller.js
// Loads memory trace from trace.json and updates the visualization

let steps = [];
let currentStep = 0;

function renderStep(idx) {
  if (!steps.length) {
    document.getElementById('code-block').textContent = '';
    document.getElementById('step-bar').textContent = 'No trace loaded.';
    document.getElementById('step-desc').textContent = '';
    document.getElementById('stack-section').innerHTML = '';
    document.getElementById('static-section').innerHTML = '';
    document.getElementById('heap-section').innerHTML = '';
    return;
  }
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

function loadTrace() {
  fetch('trace.json')
    .then(res => {
      if (!res.ok) throw new Error('Trace file not found');
      return res.json();
    })
    .then(data => {
      steps = data.steps || [];
      currentStep = 0;
      renderStep(currentStep);
    })
    .catch(err => {
      steps = [];
      renderStep(0);
      document.getElementById('step-bar').textContent = 'Error loading trace: ' + err.message;
    });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('prev-btn').onclick = () => {
    if (currentStep > 0) { currentStep--; renderStep(currentStep); }
  };
  document.getElementById('next-btn').onclick = () => {
    if (currentStep < steps.length - 1) { currentStep++; renderStep(currentStep); }
  };
  document.getElementById('reset-btn').onclick = () => {
    currentStep = 0; renderStep(currentStep);
  };
  loadTrace();
}); 