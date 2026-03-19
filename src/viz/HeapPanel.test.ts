import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { HeapPanel } from './HeapPanel';
import type { HeapBlock } from '../types/snapshot';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;

function makeContainer(): HTMLElement {
  const div = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(div);
  return div;
}

const sampleBlocks: HeapBlock[] = [
  { address: 0x20000000, size: 16, status: 'allocated', label: 'buf' },
  { address: 0x20000020, size: 32, status: 'freed' },
  { address: 0x20000060, size: 8, status: 'leaked', label: 'data' },
];

describe('HeapPanel', () => {
  let container: HTMLElement;
  let panel: HeapPanel;

  beforeEach(() => {
    container = makeContainer();
    panel = new HeapPanel(container);
  });

  it('Test 5: render([]) shows placeholder text', () => {
    panel.render([]);
    expect(container.textContent).toContain('Step through to see heap allocations');
  });

  it('Test 6: render(blocks) creates one div per heap block with hex address', () => {
    panel.render(sampleBlocks);
    const blockDivs = container.querySelectorAll('.heap-block');
    expect(blockDivs.length).toBe(3);
    const text = container.textContent ?? '';
    expect(text).toContain('0x20000000');
    expect(text).toContain('0x20000020');
  });

  it('Test 7: render(blocks) shows block status (allocated/freed)', () => {
    panel.render(sampleBlocks);
    const text = container.textContent ?? '';
    expect(text).toContain('allocated');
    expect(text).toContain('freed');
    expect(text).toContain('leaked');
  });

  it('Test 8: render() called twice does not double elements', () => {
    panel.render(sampleBlocks);
    panel.render(sampleBlocks);
    const blockDivs = container.querySelectorAll('.heap-block');
    expect(blockDivs.length).toBe(3);
  });
});
