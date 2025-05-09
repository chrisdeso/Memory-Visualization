// CS3339 Memory Visualization Project
// memory_wrappers.h
// This file overrides the C++ new and delete operators to track memory operations
// We learned in class that we can override these operators to customize memory management

#ifndef MEMORY_WRAPPERS_H
#define MEMORY_WRAPPERS_H

#include <cstddef>
#include <new>
#include "../core/memory_tracker.h"

// Global pointer to our memory tracker
// We need this to be accessible from the operator overrides
extern MemoryTracker* g_memoryTracker;

// Function to start tracking memory operations
// This should be called at the start of the program
inline void initMemoryTrack() {
    if (!g_memoryTracker) {
        g_memoryTracker = new MemoryTracker();
    }
}

// Override the global new operator
// This gets called whenever someone uses 'new' in the program
// We use malloc here because it's the basic memory allocation function
// that new is built on top of
void* operator new(std::size_t size) {
    void* ptr = std::malloc(size);
    if (g_memoryTracker) {
        g_memoryTracker->trackAllocation(ptr, size);
    }
    return ptr;
}

// Override the global delete operator
// This gets called whenever someone uses 'delete' in the program
// We use free here because it's the basic memory deallocation function
// that delete is built on top of
void operator delete(void* ptr) noexcept {
    if (g_memoryTracker) {
        g_memoryTracker->trackDeallocation(ptr);
    }
    std::free(ptr);
}

// Function to get the current memory state as JSON
// This will be used by our visualization to show memory usage
inline std::string trackerToJson() {
    if (g_memoryTracker) {
        return g_memoryTracker->toJson();
    }
    return "{}";
}

#endif // MEMORY_WRAPPERS_H


