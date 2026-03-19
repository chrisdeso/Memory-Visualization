import * as d3 from 'd3';
import type { StackFrame } from '../types/snapshot';

export class StackPanel {
  private container: d3.Selection<HTMLElement, unknown, null, undefined>;

  constructor(container: HTMLElement) {
    this.container = d3.select(container);
  }

  render(frames: StackFrame[]): void {
    // Full clear before re-render — prevents element accumulation (Pitfall 3 / UI-03)
    this.container.selectAll('*').remove();

    if (frames.length === 0) {
      this.container
        .append('div')
        .attr('class', 'stack-placeholder')
        .style('color', 'var(--color-text-muted)')
        .style('padding', '12px')
        .text('Write code and click Run');
      return;
    }

    // Render frames in reverse order (most recent at top = top of stack)
    const reversed = [...frames].reverse();

    reversed.forEach((frame) => {
      const frameDiv = this.container
        .append('div')
        .attr('class', 'stack-frame')
        .style('border-left', '3px solid var(--color-stack-border)')
        .style('margin', '6px')
        .style('padding', '8px')
        .style('background', 'var(--color-bg-panel)');

      // Frame header: name bold
      frameDiv
        .append('div')
        .attr('class', 'stack-frame-name')
        .style('font-weight', 'bold')
        .style('color', 'var(--color-text-primary)')
        .style('margin-bottom', '4px')
        .text(frame.name + '()');

      // Each local variable: type name = value   0x<address>
      frame.locals.forEach((v) => {
        const row = frameDiv
          .append('div')
          .attr('class', 'stack-local-row')
          .style('display', 'flex')
          .style('justify-content', 'space-between')
          .style('font-size', '0.875em');

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
      });
    });
  }
}
