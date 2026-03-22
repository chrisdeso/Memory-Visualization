import * as d3 from 'd3';
import type { StackFrame, PointerLink } from '../types/snapshot';

export class StackPanel {
  private container: d3.Selection<HTMLElement, unknown, null, undefined>;

  constructor(container: HTMLElement) {
    this.container = d3.select(container);
  }

  render(frames: StackFrame[], prevFrames: StackFrame[] = [], pointers: PointerLink[] = []): void {
    // Full clear before re-render — prevents element accumulation (Pitfall 3 / UI-03)
    this.container.selectAll('*').remove();

    if (frames.length === 0) {
      this.container
        .append('div')
        .attr('class', 'stack-placeholder')
        .style('color', 'var(--color-text-muted)')
        .style('padding', '12px')
        .text('Step through to see stack frames');
      return;
    }

    // Build set of addresses that are pointer variables (point into heap)
    const pointerVarAddrs = new Set(pointers.map(p => p.varAddress));

    // Build set of changed addresses by comparing current vs previous locals
    const changedAddrs = new Set<number>();
    const prevLocals = prevFrames.flatMap(f => f.locals);
    for (const frame of frames) {
      for (const v of frame.locals) {
        const prev = prevLocals.find(p => p.address === v.address);
        if (prev && prev.value !== v.value) changedAddrs.add(v.address);
      }
    }

    // Render frames in reverse order (most recent at top = top of stack)
    const reversed = [...frames].reverse();

    reversed.forEach((frame) => {
      const frameDiv = this.container
        .append('div')
        .attr('class', 'stack-frame')
        .style('border-top', '1px solid #d0d0d0')
        .style('border-left', '3px solid var(--color-stack-border)')
        .style('margin', '6px')
        .style('padding', '8px')
        .style('background', 'var(--color-bg-panel)');

      // Frame name label: uppercase, bold, stack-border color per UI-SPEC
      frameDiv
        .append('div')
        .attr('class', 'stack-frame-name')
        .style('font-size', '11px')
        .style('font-weight', '700')
        .style('color', 'var(--color-stack-border)')
        .style('text-transform', 'uppercase')
        .style('letter-spacing', '0.06em')
        .style('margin-bottom', '4px')
        .text(frame.name + '()');

      // Return address row
      const returnAddrRow = frameDiv
        .append('div')
        .attr('class', 'stack-return-addr')
        .style('display', 'flex')
        .style('font-size', '11px')
        .style('margin-bottom', '4px');

      returnAddrRow
        .append('span')
        .style('color', 'var(--color-text-muted)')
        .style('font-weight', '400')
        .style('margin-right', '4px')
        .text('return addr:');

      const returnAddrValue = frame.returnAddr === 0
        ? '\u2014'
        : '0x' + frame.returnAddr.toString(16);

      returnAddrRow
        .append('span')
        .style('color', 'var(--color-address)')
        .style('font-family', 'monospace')
        .text(returnAddrValue);

      // Each local variable: type name = value   0x<address>
      frame.locals.forEach((v) => {
        const row = frameDiv
          .append('div')
          .attr('class', 'stack-local-row')
          .attr('data-address', String(v.address))
          .style('display', 'flex')
          .style('justify-content', 'space-between')
          .style('font-size', '0.875em');

        if (changedAddrs.has(v.address)) {
          row
            .attr('data-changed', 'true')
            .style('background', 'var(--color-diff-highlight)');
        }

        row
          .append('span')
          .attr('class', 'stack-local-decl')
          .style('color', 'var(--color-text-secondary)')
          .text(`${v.type} ${v.name} = ${v.value}`);

        row
          .append('span')
          .attr('class', 'stack-local-addr')
          .style('color', 'var(--color-address)')
          .text(`0x${v.address.toString(16)}`);

        if (pointerVarAddrs.has(v.address)) {
          row.attr('data-pointer', 'true');
          row
            .append('span')
            .attr('class', 'stack-pointer-badge')
            .style('background', 'var(--color-heap-border)')
            .style('color', '#fff')
            .style('font-size', '11px')
            .style('font-weight', '700')
            .style('padding', '1px 6px')
            .style('border-radius', '10px')
            .text('PTR');
        }
      });
    });
  }
}
