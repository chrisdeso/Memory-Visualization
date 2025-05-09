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
        // Get the container element and set up our drawing area
        this.container = d3.select(containerId);
        this.width = this.container.node().getBoundingClientRect().width;
        this.height = 400;
        this.margin = { top: 20, right: 20, bottom: 30, left: 40 };
        
        // Create an SVG element to draw in
        this.svg = this.container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
            
        // Set up our scales for positioning elements
        this.setupScales();
    }

    setupScales() {
        // Create scales to map data values to screen positions
        // We learned about D3 scales in our visualization class
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
        
        // Update our scales based on the data we have
        this.x.domain([0, d3.max(blocks, d => d.size)]);
        
        // Join our data with the rectangles
        // This is a D3 pattern we learned about
        const rects = this.svg.selectAll('rect')
            .data(blocks, d => d.address);
            
        // Add new rectangles for new memory blocks
        rects.enter()
            .append('rect')
            .attr('x', d => this.x(0))
            .attr('y', (d, i) => this.y(i * 1.2))
            .attr('width', d => this.x(d.size) - this.x(0))
            .attr('height', 30)
            .attr('fill', d => this.getBlockColor(d))
            .attr('stroke', '#000')
            .attr('stroke-width', 1);
            
        // Update existing rectangles
        rects.transition()
            .duration(500)
            .attr('width', d => this.x(d.size) - this.x(0))
            .attr('fill', d => this.getBlockColor(d));
            
        // Remove rectangles for freed memory
        rects.exit()
            .transition()
            .duration(500)
            .attr('width', 0)
            .remove();
            
        // Add labels to show block sizes
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
