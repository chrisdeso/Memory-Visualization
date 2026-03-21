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

  render(blocks: HeapBlock[], prevBlocks: HeapBlock[] = []): void {
    // Full clear before re-render — prevents element accumulation (Pitfall 3 / UI-03)
    this.container.selectAll('*').remove();

    if (blocks.length === 0) {
      this.container
        .append('div')
        .attr('class', 'heap-placeholder')
        .style('color', 'var(--color-text-muted)')
        .style('padding', '12px')
        .text('Step through to see heap allocations');
      return;
    }

    // Build set of addresses whose status changed between steps
    const changedAddrs = new Set<number>();
    for (const block of blocks) {
      const prev = prevBlocks.find(p => p.address === block.address);
      if (prev && prev.status !== block.status) changedAddrs.add(block.address);
    }

    blocks.forEach((block) => {
      const isLeaked = block.status === 'leaked';
      const isChanged = changedAddrs.has(block.address);

      const blockDiv = this.container
        .append('div')
        .attr('class', 'heap-block')
        .attr('data-address', String(block.address))
        .style('border-left', '3px solid var(--color-heap-border)')
        .style('margin', '6px')
        .style('padding', '8px')
        .style('background', isLeaked ? 'rgba(212, 172, 13, 0.15)' : 'var(--color-bg-panel)');

      if (isChanged) {
        blockDiv.attr('data-changed', 'true');
      }

      // Address line: hex address + optional label + LEAK badge
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

      if (isLeaked) {
        headerRow
          .append('span')
          .attr('class', 'heap-leaked-badge')
          .style('background', '#d4ac0d')
          .style('color', '#fff')
          .style('font-size', '11px')
          .style('font-weight', '700')
          .style('padding', '1px 6px')
          .style('border-radius', '10px')
          .style('text-transform', 'uppercase')
          .text('LEAK');
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
