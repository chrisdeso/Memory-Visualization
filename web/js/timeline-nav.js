// timeline-nav.js
//
// Component for navigating through memory states
// Provides controls for stepping through program execution
//
// Functionality:
// 	- Renders timeline of memory events somehow
// 	- Color codes allocation status
// 		- newly allocated blocks
// 		- Freed memory
// 		- Memory leaks
// 		- Memory is re-allocated
// 	- highlitgts memory leaks

class TimelineNavigation {
    constructor(containerId) {
        this.container = d3.select(containerId);
        this.width = this.container.node().getBoundingClientRect().width;
        this.height = 100;
        this.margin = { top: 20, right: 20, bottom: 30, left: 40 };
        
        this.svg = this.container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
            
        this.setupScales();
        this.setupControls();
    }

    setupScales() {
        this.x = d3.scaleLinear()
            .domain([0, 1])
            .range([this.margin.left, this.width - this.margin.right]);
            
        this.y = d3.scaleLinear()
            .domain([0, 1])
            .range([this.height - this.margin.bottom, this.margin.top]);
    }

    setupControls() {
        const controls = this.container.append('div')
            .attr('class', 'timeline-controls')
            .style('margin-top', '10px');
            
        controls.append('button')
            .text('Previous')
            .on('click', () => this.navigate(-1));
            
        controls.append('button')
            .text('Next')
            .on('click', () => this.navigate(1));
            
        controls.append('button')
            .text('Play')
            .on('click', () => this.togglePlay());
            
        this.playInterval = null;
    }

    setData(data) {
        this.data = data;
        this.currentIndex = 0;
        this.updateTimeline();
    }

    updateTimeline() {
        if (!this.data) return;

        const events = this.data.memory_blocks;
        
        // Update scales based on data
        this.x.domain([0, events.length - 1]);
        
        // Join data with timeline points
        const points = this.svg.selectAll('.timeline-point')
            .data(events, (d, i) => i);
            
        // Enter new points
        points.enter()
            .append('circle')
            .attr('class', 'timeline-point')
            .attr('cx', (d, i) => this.x(i))
            .attr('cy', this.y(0.5))
            .attr('r', 5)
            .attr('fill', d => this.getEventColor(d))
            .attr('stroke', '#000')
            .attr('stroke-width', 1);
            
        // Update existing points
        points.transition()
            .duration(500)
            .attr('fill', d => this.getEventColor(d));
            
        // Remove old points
        points.exit().remove();
        
        // Add current position indicator
        const indicator = this.svg.selectAll('.current-indicator')
            .data([this.currentIndex]);
            
        indicator.enter()
            .append('line')
            .attr('class', 'current-indicator')
            .attr('x1', d => this.x(d))
            .attr('x2', d => this.x(d))
            .attr('y1', this.y(0.2))
            .attr('y2', this.y(0.8))
            .attr('stroke', '#f44336')
            .attr('stroke-width', 2);
            
        indicator.transition()
            .duration(500)
            .attr('x1', d => this.x(d))
            .attr('x2', d => this.x(d));
            
        indicator.exit().remove();
    }

    getEventColor(event) {
        if (event.is_deallocated) {
            return '#ffcdd2'; // Light red for deallocated
        } else if (this.isLeaked(event)) {
            return '#f44336'; // Red for leaked
        } else {
            return '#c8e6c9'; // Light green for active
        }
    }

    isLeaked(event) {
        // Implement leak detection logic
        return false; // Placeholder
    }

    navigate(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.data.memory_blocks.length) {
            this.currentIndex = newIndex;
            this.updateTimeline();
            if (this.onTimeChange) {
                this.onTimeChange(this.currentIndex);
            }
        }
    }

    togglePlay() {
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        } else {
            this.playInterval = setInterval(() => {
                if (this.currentIndex < this.data.memory_blocks.length - 1) {
                    this.navigate(1);
                } else {
                    clearInterval(this.playInterval);
                    this.playInterval = null;
                }
            }, 1000);
        }
    }
}
