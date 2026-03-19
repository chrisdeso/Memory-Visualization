import * as d3 from 'd3';
import type { Registers } from '../types/snapshot';

export class RegistersPanel {
  private container: d3.Selection<HTMLElement, unknown, null, undefined>;

  constructor(container: HTMLElement) {
    this.container = d3.select(container);
  }

  render(registers: Registers | null): void {
    // Full clear before re-render — prevents element accumulation (UI-03)
    this.container.selectAll('*').remove();

    if (!registers) {
      this.container
        .append('div')
        .attr('class', 'registers-placeholder')
        .style('color', 'var(--color-text-muted)')
        .style('padding', '12px')
        .text('No execution state');
      return;
    }

    const wrapper = this.container
      .append('div')
      .attr('class', 'registers-panel')
      .style('border-left', '3px solid var(--color-register-border)')
      .style('padding', '8px')
      .style('margin', '6px')
      .style('background', 'var(--color-bg-panel)');

    // PC row: program counter shown as line number
    const pcRow = wrapper
      .append('div')
      .attr('class', 'register-row register-pc')
      .style('display', 'flex')
      .style('justify-content', 'space-between')
      .style('margin-bottom', '4px');

    pcRow
      .append('span')
      .attr('class', 'register-label')
      .style('color', 'var(--color-text-secondary)')
      .style('font-weight', 'bold')
      .text('PC');

    pcRow
      .append('span')
      .attr('class', 'register-value')
      .style('color', 'var(--color-address)')
      .style('font-family', 'monospace')
      .text(`line ${registers.pc}`);

    // SP row: stack pointer shown as hex address
    const spRow = wrapper
      .append('div')
      .attr('class', 'register-row register-sp')
      .style('display', 'flex')
      .style('justify-content', 'space-between');

    spRow
      .append('span')
      .attr('class', 'register-label')
      .style('color', 'var(--color-text-secondary)')
      .style('font-weight', 'bold')
      .text('SP');

    spRow
      .append('span')
      .attr('class', 'register-value')
      .style('color', 'var(--color-address)')
      .style('font-family', 'monospace')
      .text(`0x${registers.sp.toString(16)}`);
  }
}
