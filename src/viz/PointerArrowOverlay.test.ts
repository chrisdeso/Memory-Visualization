import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { PointerArrowOverlay } from './PointerArrowOverlay';
import type { PointerLink } from '../types/snapshot';

// Use jsdom for DOM and SVG operations
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  pretendToBeVisual: true,
});
global.document = dom.window.document as unknown as Document;

// Patch createElementNS to support SVG elements in jsdom
const origCreateElementNS = dom.window.document.createElementNS.bind(dom.window.document);
(global.document as unknown as { createElementNS: typeof origCreateElementNS }).createElementNS = origCreateElementNS;

function makeContainer(): HTMLElement {
  const div = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(div);
  return div;
}

function addAddressDiv(container: HTMLElement, address: number): HTMLElement {
  const div = dom.window.document.createElement('div');
  div.setAttribute('data-address', String(address));
  container.appendChild(div);
  return div;
}

describe('PointerArrowOverlay', () => {
  let container: HTMLElement;
  let overlay: PointerArrowOverlay;

  beforeEach(() => {
    container = makeContainer();
    overlay = new PointerArrowOverlay(container);
  });

  it('Test 1: constructor appends an SVG element to the container', () => {
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('Test 2: constructor adds arrowhead marker definition inside SVG defs', () => {
    const marker = container.querySelector('svg defs marker#arrowhead');
    expect(marker).not.toBeNull();
  });

  it('Test 3: SVG element has pointer-events: none style', () => {
    const svg = container.querySelector('svg') as SVGSVGElement | null;
    expect(svg).not.toBeNull();
    // pointer-events:none is set via cssText so may appear as a single property
    const pe = svg!.style.pointerEvents;
    expect(pe).toBe('none');
  });

  it('Test 4: render([]) produces no path elements', () => {
    overlay.render([]);
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(0);
  });

  it('Test 5: render(links) where source/target elements exist produces one path per link', () => {
    addAddressDiv(container, 100);
    addAddressDiv(container, 200);

    const links: PointerLink[] = [{ varAddress: 100, pointsToAddress: 200 }];
    overlay.render(links);

    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(1);
  });

  it('Test 6: render(links) where source element is missing skips that link (no error thrown)', () => {
    // Only add the target, not the source
    addAddressDiv(container, 888);

    const links: PointerLink[] = [{ varAddress: 999, pointsToAddress: 888 }];
    expect(() => overlay.render(links)).not.toThrow();

    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(0);
  });

  it('Test 7: render() called twice clears previous paths before drawing new ones', () => {
    addAddressDiv(container, 100);
    addAddressDiv(container, 200);

    const links: PointerLink[] = [{ varAddress: 100, pointsToAddress: 200 }];
    overlay.render(links);
    // Second render with empty links should clear
    overlay.render([]);

    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(0);
  });

  it('Test 8: destroy() removes scroll event listeners (defensive cleanup)', () => {
    const scrollable = dom.window.document.createElement('div');
    dom.window.document.body.appendChild(scrollable);

    let callCount = 0;
    overlay.addScrollListener(scrollable as unknown as HTMLElement, () => {
      callCount++;
      return [];
    });

    overlay.destroy();

    // Dispatch a scroll event — handler should NOT be called after destroy()
    scrollable.dispatchEvent(new dom.window.Event('scroll'));
    expect(callCount).toBe(0);
  });

  it('Test 9: path has correct SVG attributes for Bezier arrow', () => {
    addAddressDiv(container, 300);
    addAddressDiv(container, 400);

    const links: PointerLink[] = [{ varAddress: 300, pointsToAddress: 400 }];
    overlay.render(links);

    const path = container.querySelector('svg path');
    expect(path).not.toBeNull();
    expect(path!.getAttribute('stroke')).toBe('#2563eb');
    expect(path!.getAttribute('marker-end')).toBe('url(#arrowhead)');
    expect(path!.getAttribute('fill')).toBe('none');
  });
});
