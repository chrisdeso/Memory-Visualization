// stack-visualization.js
//
// D3.js visualization of stack frame
// Shows function call and local variables
//
// Functionality:
// 	- Renders stack frames as nested rectangles
// 	- Displays function names and variables
// 	- Animates stack growth and reduction in size (e.g. pop)

class StackVisualization {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.table = null;
        this.header = null;
        this.initTable();
    }

    initTable() {
        this.container.html('');
        this.header = this.container.append('div')
            .attr('class', 'memory-region-header stack-header')
            .text('Stack (function frames)');
        this.table = this.container.append('table')
            .attr('class', 'memory-table stack-table');
    }

    update(data) {
        if (!data) return;
        const frames = data.stack || [];
        // Clear table
        this.table.html('');
        if (frames.length === 0) {
            this.table.append('tr')
                .append('td')
                .attr('colspan', 3)
                .attr('class', 'empty-message')
                .text('No stack frames');
            return;
        }
        // Header row
        const headerRow = this.table.append('tr');
        headerRow.append('td').attr('class', 'name-col').text('Name');
        headerRow.append('td').attr('class', 'addr-col').text('Address');
        headerRow.append('td').attr('class', 'value-col').text('Value');
        // Data rows
        frames.forEach((frame, i) => {
            // Frame label row
            const frameRow = this.table.append('tr');
            frameRow.append('td')
                .attr('colspan', 3)
                .attr('style', 'font-weight:bold; background:#f8bbd0;')
                .text(`${frame.function_name} frame`);
            // Variables
            (frame.variables || []).forEach(variable => {
                const row = this.table.append('tr');
                row.append('td').attr('class', 'name-col').text(variable.name);
                row.append('td').attr('class', 'addr-col').text(variable.address || '');
                row.append('td').attr('class', 'value-col').text(variable.value !== undefined ? variable.value : '');
            });
        });
    }
}
