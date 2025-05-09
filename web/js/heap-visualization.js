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
        this.width = this.container.node().getBoundingClientRect().width;
        this.height = 400;
        this.margin = { top: 20, right: 20, bottom: 30, left: 40 };
        
        this.svg = this.container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
            
        this.setupScales();
    }

    setupScales() {
        this.x = d3.scaleLinear()
            .domain([0, 1])
            .range([this.margin.left, this.width - this.margin.right]);
            
        this.y = d3.scaleLinear()
            .domain([0, 1])
            .range([this.height - this.margin.bottom, this.margin.top]);
    }

    update(data) {
        if (!data) return;

        const blocks = data.memory_blocks;
        
        // Update scales based on data
        this.x.domain([0, d3.max(blocks, d => d.size)]);
        
        // Join data with rectangles
        const rects = this.svg.selectAll('rect')
            .data(blocks, d => d.address);
            
        // Enter new blocks
        rects.enter()
            .append('rect')
            .attr('x', d => this.x(0))
            .attr('y', (d, i) => this.y(i * 1.2))
            .attr('width', d => this.x(d.size) - this.x(0))
            .attr('height', 30)
            .attr('fill', d => this.getBlockColor(d))
            .attr('stroke', '#000')
            .attr('stroke-width', 1);
            
        // Update existing blocks
        rects.transition()
            .duration(500)
            .attr('width', d => this.x(d.size) - this.x(0))
            .attr('fill', d => this.getBlockColor(d));
            
        // Remove old blocks
        rects.exit()
            .transition()
            .duration(500)
            .attr('width', 0)
            .remove();
            
        // Add labels
        const labels = this.svg.selectAll('text')
            .data(blocks, d => d.address);
            
        labels.enter()
            .append('text')
            .attr('x', d => this.x(d.size / 2))
            .attr('y', (d, i) => this.y(i * 1.2) + 20)
            .attr('text-anchor', 'middle')
            .text(d => `Size: ${d.size} bytes`);
            
        labels.transition()
            .duration(500)
            .attr('x', d => this.x(d.size / 2));
            
        labels.exit().remove();
    }

    getBlockColor(block) {
        if (block.is_deallocated) {
            return '#ffcdd2'; // Light red for deallocated
        } else if (this.isLeaked(block)) {
            return '#f44336'; // Red for leaked
        } else {
            return '#c8e6c9'; // Light green for active
        }
    }

    isLeaked(block) {
        // Implement leak detection logic
        return false; // Placeholder
    }
}
