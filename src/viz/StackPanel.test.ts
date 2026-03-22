import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { StackPanel } from './StackPanel';
import type { StackFrame, PointerLink } from '../types/snapshot';

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
    returnAddr: 0,
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

  it('Test 1: render([]) shows placeholder text', () => {
    panel.render([]);
    expect(container.textContent).toContain('Step through to see stack frames');
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

  it('Test 5: each .stack-frame has a top border (frame boundary divider)', () => {
    panel.render(sampleFrames);
    const frameDivs = container.querySelectorAll('.stack-frame');
    expect(frameDivs.length).toBeGreaterThan(0);
    frameDivs.forEach((div) => {
      const style = (div as HTMLElement).style.borderTop;
      // jsdom normalizes hex colors to rgb(), accept either form
      expect(style).toMatch(/1px solid (#d0d0d0|rgb\(208, 208, 208\))/);
    });
  });

  it('Test 6: frame name label is uppercase and styled with stack-border color', () => {
    panel.render(sampleFrames);
    const nameLabels = container.querySelectorAll('.stack-frame-name');
    expect(nameLabels.length).toBe(2);
    nameLabels.forEach((label) => {
      const el = label as HTMLElement;
      expect(el.style.fontWeight).toBe('700');
      expect(el.style.color).toBe('var(--color-stack-border)');
      expect(el.style.textTransform).toBe('uppercase');
    });
  });

  it('Test 7: non-main frame shows hex return address', () => {
    panel.render(sampleFrames);
    const returnAddrRows = container.querySelectorAll('.stack-return-addr');
    // helper frame (returnAddr: 0x7fff0100) should show hex
    const helperReturnRow = returnAddrRows[0]!; // helper is reversed to top
    expect(helperReturnRow.textContent).toContain('0x7fff0100');
  });

  it('Test 8: main frame shows dash for return address when returnAddr is 0', () => {
    panel.render(sampleFrames);
    const returnAddrRows = container.querySelectorAll('.stack-return-addr');
    // main frame (returnAddr: 0) should show dash (em dash)
    const mainReturnRow = returnAddrRows[1]!; // main is at bottom (last in reversed)
    expect(mainReturnRow.textContent).toContain('\u2014');
  });

  it('Test 9: each local variable row has data-address attribute matching v.address', () => {
    panel.render(sampleFrames);
    // x at 0x7fff0010
    const xRow = container.querySelector('[data-address="' + String(0x7fff0010) + '"]');
    expect(xRow).not.toBeNull();
    // p at 0x7fff0008
    const pRow = container.querySelector('[data-address="' + String(0x7fff0008) + '"]');
    expect(pRow).not.toBeNull();
    // n at 0x7fff0020
    const nRow = container.querySelector('[data-address="' + String(0x7fff0020) + '"]');
    expect(nRow).not.toBeNull();
  });

  it('Test 10: render(frames, prevFrames) highlights changed values with data-changed="true"', () => {
    const prevFrames: StackFrame[] = [
      {
        name: 'main',
        returnAddr: 0,
        locals: [
          { name: 'x', type: 'int', value: '10', address: 0x7fff0010 }, // was 10, now 42
          { name: 'p', type: 'int*', value: '0x20000000', address: 0x7fff0008 }, // unchanged
        ],
      },
    ];
    panel.render(sampleFrames, prevFrames);
    // x changed from 10 to 42 — should have data-changed="true"
    const xRow = container.querySelector('[data-address="' + String(0x7fff0010) + '"]');
    expect(xRow).not.toBeNull();
    expect(xRow!.getAttribute('data-changed')).toBe('true');
    // p unchanged — should NOT have data-changed
    const pRow = container.querySelector('[data-address="' + String(0x7fff0008) + '"]');
    expect(pRow).not.toBeNull();
    expect(pRow!.getAttribute('data-changed')).toBeNull();
  });

  it('Test 11: render(frames) with no prevFrames does not set data-changed on any row', () => {
    panel.render(sampleFrames);
    const changedRows = container.querySelectorAll('[data-changed="true"]');
    expect(changedRows.length).toBe(0);
  });

  it('Test 12: render(frames, []) with empty prevFrames does not set data-changed on any row', () => {
    panel.render(sampleFrames, []);
    const changedRows = container.querySelectorAll('[data-changed="true"]');
    expect(changedRows.length).toBe(0);
  });

  it('Test 13: pointer locals get data-pointer="true" and a PTR badge', () => {
    const pointers: PointerLink[] = [
      { varAddress: 0x7fff0008, pointsToAddress: 0x20000000 }, // p is a pointer
    ];
    panel.render(sampleFrames, [], pointers);

    const pRow = container.querySelector('[data-address="' + String(0x7fff0008) + '"]');
    expect(pRow).not.toBeNull();
    expect(pRow!.getAttribute('data-pointer')).toBe('true');
    expect(pRow!.querySelector('.stack-pointer-badge')?.textContent).toBe('PTR');

    // Non-pointer row should not have the badge
    const xRow = container.querySelector('[data-address="' + String(0x7fff0010) + '"]');
    expect(xRow!.getAttribute('data-pointer')).toBeNull();
    expect(xRow!.querySelector('.stack-pointer-badge')).toBeNull();
  });

  it('Test 14: render with no pointers does not add any PTR badges', () => {
    panel.render(sampleFrames);
    const badges = container.querySelectorAll('.stack-pointer-badge');
    expect(badges.length).toBe(0);
  });
});
