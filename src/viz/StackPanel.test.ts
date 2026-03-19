import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { StackPanel } from './StackPanel';
import type { StackFrame } from '../types/snapshot';

// Use jsdom for DOM operations
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;

function makeContainer(): HTMLElement {
  const div = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(div);
  return div;
}

const sampleFrames: StackFrame[] = [
  {
    name: 'main',
    returnAddr: 0x7fff0000,
    locals: [
      { name: 'x', type: 'int', value: '42', address: 0x7fff0010 },
      { name: 'p', type: 'int*', value: '0x20000000', address: 0x7fff0008 },
    ],
  },
  {
    name: 'helper',
    returnAddr: 0x7fff0100,
    locals: [
      { name: 'n', type: 'int', value: '7', address: 0x7fff0020 },
    ],
  },
];

describe('StackPanel', () => {
  let container: HTMLElement;
  let panel: StackPanel;

  beforeEach(() => {
    container = makeContainer();
    panel = new StackPanel(container);
  });

  it('Test 1: render([]) shows placeholder text "Write code and click Run"', () => {
    panel.render([]);
    expect(container.textContent).toContain('Write code and click Run');
  });

  it('Test 2: render(frames) creates one div per frame with frame name', () => {
    panel.render(sampleFrames);
    const frameDivs = container.querySelectorAll('.stack-frame');
    expect(frameDivs.length).toBe(2);
    const text = container.textContent ?? '';
    expect(text).toContain('main');
    expect(text).toContain('helper');
  });

  it('Test 3: render(frames) shows local variable names and values', () => {
    panel.render(sampleFrames);
    const text = container.textContent ?? '';
    expect(text).toContain('x');
    expect(text).toContain('42');
    expect(text).toContain('p');
    expect(text).toContain('int*');
    expect(text).toContain('0x7fff0010');
  });

  it('Test 4: render() called twice does not double elements (clears first)', () => {
    panel.render(sampleFrames);
    panel.render(sampleFrames);
    const frameDivs = container.querySelectorAll('.stack-frame');
    expect(frameDivs.length).toBe(2);
  });
});
