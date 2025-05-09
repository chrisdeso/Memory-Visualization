// Memory Visualization CS3339 SP25 
// memory_wrappers.h
//
// Overrides default C++ memory operators (new, delete) to track heap allocation and deallocation
//
// General functionality:
// 	- operator new: Tracks memory allocation
// 	- operator delete: Tracks memory deallocation
// 	- initMemoryTrack(): Starts tracking system
// 	- trackerToJson: Generates JSON output for visualization
//

#ifndef MEMORY_WRAPPERS_H
#define MEMORY_WRAPPERS_H

#include <cstddef>
#include <new>
#include "../core/memory_tracker.h"

// Global memory tracker instance
extern MemoryTracker* g_memoryTracker;

// Initialize memory tracking system
inline void initMemoryTrack() {
    if (!g_memoryTracker) {
        g_memoryTracker = new MemoryTracker();
    }
}

// Override global new operator
void* operator new(std::size_t size) {
    void* ptr = std::malloc(size);
    if (g_memoryTracker) {
        g_memoryTracker->trackAllocation(ptr, size);
    }
    return ptr;
}

// Override global delete operator
void operator delete(void* ptr) noexcept {
    if (g_memoryTracker) {
        g_memoryTracker->trackDeallocation(ptr);
    }
    std::free(ptr);
}

// Generate JSON output for visualization
inline std::string trackerToJson() {
    if (g_memoryTracker) {
        return g_memoryTracker->toJson();
    }
    return "{}";
}

#endif // MEMORY_WRAPPERS_H


