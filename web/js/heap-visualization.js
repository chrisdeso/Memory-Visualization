// heap-visualization.js
//
// D3.js visualization of heap allocations
// Should show memory blocks like in slides (rectangles)
//
// Functionality:
// 	- Renders heap blocks as rectangles
// 	- Allocation status is color coded. States:
// 		- New memory allocated
// 		- Freed/Deallocated memory
// 		- Leaked memory (not deallocated)
// 		- Reused addresses - special memory states?

class HeapVisualization {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.table = null;
        this.header = null;
        this.initTable();
    }

    initTable() {
        this.container.html('');
        this.header = this.container.append('div')
            .attr('class', 'memory-region-header heap-header')
            .text('Heap memory');
        this.table = this.container.append('table')
            .attr('class', 'memory-table heap-table');
    }

    update(data) {
        if (!data) return;
        let heap = data.heap;
        if (typeof heap === "string") {
            heap = JSON.parse(heap);
        }
        const blocks = heap && heap.memory_blocks ? heap.memory_blocks : [];
        // Clear table
        this.table.html('');
        if (blocks.length === 0) {
            this.table.append('tr')
                .append('td')
                .attr('colspan', 4)
                .attr('class', 'empty-message')
                .text('No allocations yet');
            return;
        }
        // Header row
        const headerRow = this.table.append('tr');
        headerRow.append('td').attr('class', 'name-col').text('Name');
        headerRow.append('td').attr('class', 'addr-col').text('Address');
        headerRow.append('td').attr('class', 'value-col').text('Value');
        headerRow.append('td').text('Status');
        // Data rows
        blocks.forEach((block, i) => {
            const row = this.table.append('tr');
            row.append('td').attr('class', 'name-col').text(block.name || `block[${i}]`);
            row.append('td').attr('class', 'addr-col').text(block.address);
            row.append('td').attr('class', 'value-col').text(block.value !== undefined ? block.value : '');
            row.append('td').text(block.is_deallocated ? 'deallocated' : 'allocated');
        });
    }

    getBlockColor(block) {
        // Color coding for different memory states
        // We learned about color theory in our UI design class
        if (block.is_deallocated) {
            return '#ffcdd2'; // Light red for deallocated
        } else if (this.isLeaked(block)) {
            return '#f44336'; // Red for leaked
        } else {
            return '#c8e6c9'; // Light green for active
        }
    }

    isLeaked(block) {
        // TODO: Implement leak detection
        // This will be part of our next assignment
        return false;
    }
}
