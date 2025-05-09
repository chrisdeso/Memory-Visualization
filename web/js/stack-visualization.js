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

        const frames = data.stack_frames || [];
        
        // Update scales based on data
        this.y.domain([0, frames.length]);
        
        // Join data with frame groups
        const frameGroups = this.svg.selectAll('.frame-group')
            .data(frames, d => d.id);
            
        // Enter new frames
        const newFrames = frameGroups.enter()
            .append('g')
            .attr('class', 'frame-group');
            
        newFrames.append('rect')
            .attr('x', this.margin.left)
            .attr('y', (d, i) => this.y(i))
            .attr('width', this.width - this.margin.left - this.margin.right)
            .attr('height', 60)
            .attr('fill', '#e3f2fd')
            .attr('stroke', '#2196f3')
            .attr('stroke-width', 2);
            
        newFrames.append('text')
            .attr('x', this.margin.left + 10)
            .attr('y', (d, i) => this.y(i) + 25)
            .attr('font-size', '14px')
            .text(d => d.function_name);
            
        // Update existing frames
        frameGroups.select('rect')
            .transition()
            .duration(500)
            .attr('y', (d, i) => this.y(i));
            
        frameGroups.select('text')
            .transition()
            .duration(500)
            .attr('y', (d, i) => this.y(i) + 25);
            
        // Remove old frames
        frameGroups.exit()
            .transition()
            .duration(500)
            .attr('opacity', 0)
            .remove();
            
        // Add variables to frames
        frames.forEach((frame, i) => {
            const variables = frame.variables || [];
            const varGroup = this.svg.selectAll(`.var-group-${frame.id}`)
                .data(variables, d => d.name);
                
            const newVars = varGroup.enter()
                .append('g')
                .attr('class', `var-group-${frame.id}`);
                
            newVars.append('rect')
                .attr('x', this.margin.left + 20)
                .attr('y', (d, j) => this.y(i) + 40 + j * 25)
                .attr('width', 100)
                .attr('height', 20)
                .attr('fill', '#bbdefb')
                .attr('stroke', '#1976d2')
                .attr('stroke-width', 1);
                
            newVars.append('text')
                .attr('x', this.margin.left + 25)
                .attr('y', (d, j) => this.y(i) + 55 + j * 25)
                .attr('font-size', '12px')
                .text(d => `${d.name}: ${d.value}`);
                
            varGroup.exit().remove();
        });
    }
}
