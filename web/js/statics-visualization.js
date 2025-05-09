class StaticsVisualization {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.table = null;
        this.header = null;
        this.initTable();
    }

    initTable() {
        this.container.html('');
        this.header = this.container.append('div')
            .attr('class', 'memory-region-header static-header')
            .text('Static/Global Variables');
        this.table = this.container.append('table')
            .attr('class', 'memory-table static-table');
    }

    update(data) {
        if (!data) return;
        const statics = data.statics || [];
        // Clear table
        this.table.html('');
        if (statics.length === 0) {
            this.table.append('tr')
                .append('td')
                .attr('colspan', 3)
                .attr('class', 'empty-message')
                .text('No statics/globals');
            return;
        }
        // Header row
        const headerRow = this.table.append('tr');
        headerRow.append('td').attr('class', 'name-col').text('Name');
        headerRow.append('td').attr('class', 'addr-col').text('Address');
        headerRow.append('td').attr('class', 'value-col').text('Value');
        // Data rows
        statics.forEach(variable => {
            const row = this.table.append('tr');
            row.append('td').attr('class', 'name-col').text(variable.name);
            row.append('td').attr('class', 'addr-col').text(variable.address || '');
            row.append('td').attr('class', 'value-col').text(variable.value !== undefined ? variable.value : '');
        });
    }
} 