import * as d3 from 'd3';
import type { HeapBlock } from '../types/snapshot';

const STATUS_COLORS: Record<HeapBlock['status'], string> = {
  allocated: 'var(--color-heap-allocated)',
  freed: 'var(--color-heap-freed)',
  leaked: 'var(--color-heap-leaked)',
};

export class HeapPanel {
  private container: d3.Selection<HTMLElement, unknown, null, undefined>;

  constructor(container: HTMLElement) {
    this.container = d3.select(container);
  }

  render(blocks: HeapBlock[]): void {
    // Full clear before re-render — prevents element accumulation (Pitfall 3 / UI-03)
    this.container.selectAll('*').remove();

    if (blocks.length === 0) {
      this.container
        .append('div')
        .attr('class', 'heap-placeholder')
        .style('color', 'var(--color-text-muted)')
        .style('padding', '12px')
        .text('Write code and click Run');
      return;
    }

    blocks.forEach((block) => {
      const blockDiv = this.container
        .append('div')
        .attr('class', 'heap-block')
        .style('border-left', '3px solid var(--color-heap-border)')
        .style('margin', '6px')
        .style('padding', '8px')
        .style('background', 'var(--color-bg-panel)');

      // Address line: hex address + optional label
      const headerRow = blockDiv
        .append('div')
        .attr('class', 'heap-block-header')
        .style('display', 'flex')
        .style('gap', '8px')
        .style('align-items', 'baseline');

      headerRow
        .append('span')
        .attr('class', 'heap-block-addr')
        .style('color', 'var(--color-address)')
        .style('font-weight', 'bold')
        .text(`0x${block.address.toString(16)}`);

      if (block.label) {
        headerRow
          .append('span')
          .attr('class', 'heap-block-label')
          .style('color', 'var(--color-text-secondary)')
          .text(block.label);
      }

      // Size + status row
      const detailRow = blockDiv
        .append('div')
        .attr('class', 'heap-block-detail')
        .style('display', 'flex')
        .style('gap', '8px')
        .style('font-size', '0.875em')
        .style('margin-top', '4px');

      detailRow
        .append('span')
        .attr('class', 'heap-block-size')
        .style('color', 'var(--color-text-muted)')
        .text(`${block.size} bytes`);

      detailRow
        .append('span')
        .attr('class', 'heap-block-status')
        .style('color', STATUS_COLORS[block.status])
        .text(block.status);
    });
  }
}
