// CS3339 Memory Visualization Project
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
        // Initialize our visualization components
        this.memoryData = null;
        this.currentTimeIndex = 0;
        
        // Create the different views
        // We're using CSS selectors to find where to put each view
        this.heapViz = new HeapVisualization('#heap');
        this.stackViz = new StackVisualization('#stack');
        this.staticsViz = new StaticsVisualization('#statics');
        
        // Start everything up
        this.init();
    }

    async init() {
        // Load the memory data and set up event listeners
        await this.loadMemoryData();
        this.setupEventListeners();
        this.updateVisualizations();
    }

    async loadMemoryData() {
        try {
            // Get the memory data from our backend
            // We're using fetch because it's the modern way to get data
            const response = await fetch('trace.json');
            this.memoryData = await response.json();
        } catch (error) {
            // If something goes wrong, show it in the console
            // This helps us debug problems
            console.error('Error loading memory data:', error);
        }
    }

    setupEventListeners() {
        // No timeline navigation, so nothing to set up here for now.
    }

    updateVisualizations() {
        // Don't try to update if we don't have data yet
        if (!this.memoryData) return;

        // Get the current state of memory
        const currentState = this.memoryData[this.currentTimeIndex];
        
        // Update both views with the new data
        this.heapViz.update(currentState);
        this.stackViz.update(currentState);
        this.staticsViz.update(currentState);
    }
}

// Start the visualization when the page loads
// We learned about DOMContentLoaded in our web class
document.addEventListener('DOMContentLoaded', () => {
    new MemoryVisualization();
});
