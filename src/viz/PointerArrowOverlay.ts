import type { PointerLink } from '../types/snapshot';

export class PointerArrowOverlay {
  private svg: SVGSVGElement;
  private container: HTMLElement;
  private scrollListeners: Array<{ el: HTMLElement; handler: () => void }> = [];

  constructor(vizPane: HTMLElement) {
    this.container = vizPane;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    this.svg.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;';
    vizPane.style.position = 'relative';
    vizPane.appendChild(this.svg);
    this.addArrowheadDef();
  }

  private addArrowheadDef(): void {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="arrowhead" markerWidth="8" markerHeight="6"
              refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#2563eb" />
      </marker>`;
    this.svg.appendChild(defs);
  }

  render(pointers: PointerLink[]): void {
    // Clear previous arrows (preserve defs)
    const paths = this.svg.querySelectorAll('path');
    paths.forEach(p => p.remove());

    const paneRect = this.container.getBoundingClientRect();

    for (const link of pointers) {
      const srcEl = this.container.querySelector(`[data-address="${link.varAddress}"]`);
      const dstEl = this.container.querySelector(`[data-address="${link.pointsToAddress}"]`);
      if (!srcEl || !dstEl) continue;

      const srcRect = srcEl.getBoundingClientRect();
      const dstRect = dstEl.getBoundingClientRect();

      const x1 = srcRect.right - paneRect.left;
      const y1 = srcRect.top + srcRect.height / 2 - paneRect.top;
      const x2 = dstRect.left - paneRect.left;
      const y2 = dstRect.top + dstRect.height / 2 - paneRect.top;

      const path = this.makeBezier(x1, y1, x2, y2);
      this.svg.appendChild(path);
    }
  }

  private makeBezier(x1: number, y1: number, x2: number, y2: number): SVGPathElement {
    const cx = (x1 + x2) / 2 + 20;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path') as SVGPathElement;
    path.setAttribute('d', `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`);
    path.setAttribute('stroke', '#2563eb');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    return path;
  }

  addScrollListener(scrollableEl: HTMLElement, currentPointers: () => PointerLink[]): void {
    const handler = () => this.render(currentPointers());
    scrollableEl.addEventListener('scroll', handler);
    this.scrollListeners.push({ el: scrollableEl, handler });
  }

  destroy(): void {
    for (const { el, handler } of this.scrollListeners) {
      el.removeEventListener('scroll', handler);
    }
    this.scrollListeners = [];
    this.svg.remove();
  }
}
