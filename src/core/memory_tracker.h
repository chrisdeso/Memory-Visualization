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
#include <string>
#include <sstream>

class MemoryBlock {
public:
    void* address;       // Memory address of the allocation
    size_t size;         // Size of the allocated memory
    std::string timestamp; // Timestamp of the allocation

    // Constructor
    MemoryBlock(void* addr, size_t sz, const std::string& ts)
        : address(addr), size(sz), timestamp(ts) {}

    // Serialize to JSON format
    std::string toJSON() const {
        std::ostringstream oss;
        oss << "{"
            << "\"address\": \"" << address << "\", "
            << "\"size\": " << size << ", "
            << "\"timestamp\": \"" << timestamp << "\""
            << "}";
        return oss.str();
    }
};

#endif // MEMORY_TRACKER_H
