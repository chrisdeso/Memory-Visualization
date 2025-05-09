// CS3339 Memory Visualization Project
// timeline-navigation.js
// This file handles the timeline navigation controls
// We show a slider and buttons to step through memory states
// This helps students understand how memory changes over time

class TimelineNavigation {
    constructor(containerId) {
        // Set up our container
        this.container = d3.select(containerId);
        this.width = this.container.node().getBoundingClientRect().width;
        this.height = 100;
        this.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        
        // Create SVG for controls
        this.svg = this.container.append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
            
        // Initialize state
        this.currentIndex = 0;
        this.totalStates = 0;
        this.onTimeChange = null;  // Callback for time changes
        
        // Create the controls
        this.createControls();
    }

    createControls() {
        // Create a group for all controls
        this.controlsGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
            
        // Create the slider track
        this.sliderTrack = this.controlsGroup.append('rect')
            .attr('x', 0)
            .attr('y', 30)
            .attr('width', this.width - this.margin.left - this.margin.right)
            .attr('height', 4)
            .attr('fill', '#e0e0e0');
            
        // Create the slider handle
        this.sliderHandle = this.controlsGroup.append('circle')
            .attr('r', 10)
            .attr('fill', '#2196f3')
            .attr('stroke', '#1976d2')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer');
            
        // Create navigation buttons
        this.createButton('prev', 0, 60, '⏮', () => this.previous());
        this.createButton('play', 40, 60, '▶', () => this.togglePlay());
        this.createButton('next', 80, 60, '⏭', () => this.next());
        
        // Add time display
        this.timeDisplay = this.controlsGroup.append('text')
            .attr('x', this.width - this.margin.left - this.margin.right - 100)
            .attr('y', 70)
            .attr('text-anchor', 'end')
            .text('Time: 0/0');
            
        // Set up drag behavior for the slider
        this.setupDragBehavior();
    }

    createButton(id, x, y, symbol, onClick) {
        const button = this.controlsGroup.append('g')
            .attr('class', `nav-button ${id}`)
            .attr('transform', `translate(${x}, ${y})`)
            .style('cursor', 'pointer')
            .on('click', onClick);
            
        button.append('circle')
            .attr('r', 15)
            .attr('fill', '#e3f2fd')
            .attr('stroke', '#2196f3')
            .attr('stroke-width', 2);
            
        button.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.3em')
            .text(symbol);
    }

    setupDragBehavior() {
        const drag = d3.drag()
            .on('drag', (event) => {
                const x = Math.max(0, Math.min(event.x, this.width - this.margin.left - this.margin.right));
                const index = Math.round((x / (this.width - this.margin.left - this.margin.right)) * (this.totalStates - 1));
                this.setTime(index);
            });
            
        this.sliderHandle.call(drag);
    }

    update(data) {
        if (!data) return;
        
        this.totalStates = data.total_states || 1;
        this.setTime(this.currentIndex);
    }

    setTime(index) {
        // Clamp index to valid range
        this.currentIndex = Math.max(0, Math.min(index, this.totalStates - 1));
        
        // Update slider position
        const x = (this.currentIndex / (this.totalStates - 1)) * 
                 (this.width - this.margin.left - this.margin.right);
        this.sliderHandle.attr('cx', x);
        
        // Update time display
        this.timeDisplay.text(`Time: ${this.currentIndex + 1}/${this.totalStates}`);
        
        // Notify listeners
        if (this.onTimeChange) {
            this.onTimeChange(this.currentIndex);
        }
    }

    next() {
        if (this.currentIndex < this.totalStates - 1) {
            this.setTime(this.currentIndex + 1);
        }
    }

    previous() {
        if (this.currentIndex > 0) {
            this.setTime(this.currentIndex - 1);
        }
    }

    togglePlay() {
        if (this.playing) {
            this.stopPlay();
        } else {
            this.startPlay();
        }
    }

    startPlay() {
        this.playing = true;
        this.playInterval = setInterval(() => {
            if (this.currentIndex >= this.totalStates - 1) {
                this.stopPlay();
            } else {
                this.next();
            }
        }, 1000);  // Update every second
    }

    stopPlay() {
        this.playing = false;
        if (this.playInterval) {
            clearInterval(this.playInterval);
        }
    }
} 