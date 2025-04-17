// heap-visualization.js
//
// D3.js visualization of heap allocations
// Shoudl show memory blocks like in slides (rectangles)
//
// Functionality:
// 	- Renders heap blocks as rectangles
// 	- Allocation status is color coded. Stasteses:
// 		- New memory allocated
// 		- Freed/Deallocated memory
// 		- Leaked memory (not deallocated)
// 		- Reused addresses - special memory states?
