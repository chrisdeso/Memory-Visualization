// memory_tracker.h
//
// Core memory tracking system that records allocations, deallocations, and memory state.
// Maintains a record of all memory blocks and provides JSON output for visualization.
//
// Classes:
// - MemoryBlock: Stores information about a single memory allocation
// - MemoryTracker: tracks and records all memory operations
// 		- Tracks heap allocations `new` and deallocations `delete`
// 		- Records memory addresses, sizes, and timestamps for operations
// 		- Keeps mappings between addresses and memory blocks (addresses)
// 		- Generates memory state snapshots for visualization (all active frames at a given moment)
// 		- Leak detection - checks if there is unfreed memory allocation
// 		- Provides the JSON serializatin for use in visualization export (JSON)

#ifndef MEMORY_TRACKER_H
#define MEMORY_TRACKER_H
// test comment
