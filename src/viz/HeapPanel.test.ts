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

  // New tests for Plan 03-02

  it('Test 9: render(blocks) adds data-address attribute to each .heap-block', () => {
    panel.render(sampleBlocks);
    // 0x20000000 decimal = 536870912
    const block = container.querySelector('[data-address="536870912"]');
    expect(block).not.toBeNull();
    // 0x20000020 decimal = 536870944
    const block2 = container.querySelector('[data-address="536870944"]');
    expect(block2).not.toBeNull();
    // 0x20000060 decimal = 536871008
    const block3 = container.querySelector('[data-address="536871008"]');
    expect(block3).not.toBeNull();
  });

  it('Test 10: render(blocks) shows .heap-leaked-badge with text "LEAK" for leaked block', () => {
    panel.render(sampleBlocks);
    const badge = container.querySelector('.heap-leaked-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('LEAK');
  });

  it('Test 11: render(blocks) leaked block has yellow background tint', () => {
    panel.render(sampleBlocks);
    // leaked block is at 0x20000060 = 536871008
    const leakedBlock = container.querySelector('[data-address="536871008"]') as HTMLElement | null;
    expect(leakedBlock).not.toBeNull();
    expect(leakedBlock?.style.background).toContain('rgba(212, 172, 13, 0.15)');
  });

  it('Test 12: render(blocks) allocated block does NOT have .heap-leaked-badge', () => {
    panel.render(sampleBlocks);
    // allocated block is at 0x20000000 = 536870912
    const allocBlock = container.querySelector('[data-address="536870912"]');
    expect(allocBlock).not.toBeNull();
    const badge = allocBlock?.querySelector('.heap-leaked-badge');
    expect(badge).toBeNull();
  });

  it('Test 13: render(blocks) freed block does NOT have .heap-leaked-badge', () => {
    panel.render(sampleBlocks);
    // freed block is at 0x20000020 = 536870944
    const freedBlock = container.querySelector('[data-address="536870944"]');
    expect(freedBlock).not.toBeNull();
    const badge = freedBlock?.querySelector('.heap-leaked-badge');
    expect(badge).toBeNull();
  });

  it('Test 14: leaked badge has pill styling (border-radius, uppercase, bold)', () => {
    panel.render(sampleBlocks);
    const badge = container.querySelector('.heap-leaked-badge') as HTMLElement | null;
    expect(badge).not.toBeNull();
    expect(badge?.style.borderRadius).toBeTruthy();
    expect(badge?.style.textTransform).toBe('uppercase');
    expect(badge?.style.fontWeight).toBe('700');
  });

  it('Test 15: render(blocks, prevBlocks) marks changed-status blocks with data-changed="true"', () => {
    // previous state: allocated block was 'allocated', now it is 'leaked'
    const prevBlocks: HeapBlock[] = [
      { address: 0x20000000, size: 16, status: 'allocated', label: 'buf' },
      { address: 0x20000020, size: 32, status: 'freed' },
      { address: 0x20000060, size: 8, status: 'allocated', label: 'data' }, // was allocated, now leaked
    ];
    panel.render(sampleBlocks, prevBlocks);
    // 0x20000060 changed from allocated -> leaked
    const changedBlock = container.querySelector('[data-address="536871008"]');
    expect(changedBlock?.getAttribute('data-changed')).toBe('true');
    // 0x20000000 did not change
    const unchangedBlock = container.querySelector('[data-address="536870912"]');
    expect(unchangedBlock?.getAttribute('data-changed')).toBeNull();
  });
});
