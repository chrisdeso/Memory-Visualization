// visualization.js
//
// Main js controller for memory visualizaion in D3
// Loads JSON data & coordinates visual components (heap, stack, etc)
//
// Functionality:
// 	- Loads memory trace data
// 	- controls timelinen nav
// 	- updates stack and head visualization as timeline moves
// 	- handles general user interaction

class MemoryVisualization {
    constructor() {
        this.memoryData = null;
        this.currentTimeIndex = 0;
        this.heapViz = new HeapVisualization('#heap-container');
        this.stackViz = new StackVisualization('#stack-container');
        this.timelineNav = new TimelineNavigation('#timeline-container');
        
        this.init();
    }

    async init() {
        await this.loadMemoryData();
        this.setupEventListeners();
        this.updateVisualizations();
    }

    async loadMemoryData() {
        try {
            const response = await fetch('/api/memory-trace');
            this.memoryData = await response.json();
            this.timelineNav.setData(this.memoryData);
        } catch (error) {
            console.error('Error loading memory data:', error);
        }
    }

    setupEventListeners() {
        this.timelineNav.onTimeChange = (index) => {
            this.currentTimeIndex = index;
            this.updateVisualizations();
        };
    }

    updateVisualizations() {
        if (!this.memoryData) return;

        const currentState = this.memoryData.memory_blocks[this.currentTimeIndex];
        this.heapViz.update(currentState);
        this.stackViz.update(currentState);
    }
}

// Initialize visualization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MemoryVisualization();
});
