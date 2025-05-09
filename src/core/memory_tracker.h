// CS3339 Memory Visualization Project
// memory_tracker.h
// This file contains the MemoryBlock class which is used to track individual memory allocations
// in our program. Each MemoryBlock object represents one piece of memory that was allocated
// using new/delete operators.

#ifndef MEMORY_TRACKER_H
#define MEMORY_TRACKER_H

#include <string>
#include <unordered_map>
#include <vector>
#include <chrono>
#include <mutex>
#include "../JSObjectNotation/json_serializer.h"

// MemoryBlock class
// This class keeps track of information about a single memory allocation
// using chrono for timestamps because it's more precise than regular time functions
// and it's what we learned about in class for handling time in C++
class MemoryBlock {
public:
    // The actual memory address where the block is allocated
    void* address;
    
    // How many bytes were allocated
    size_t size;
    
    // When the memory was allocated
    // Using system_clock because it's the standard way to get current time in C++
    std::chrono::system_clock::time_point allocationTime;
    
    // Whether this memory has been freed
    bool isDeallocated;
    
    // When the memory was freed (if it was)
    std::chrono::system_clock::time_point deallocationTime;

    // Constructor
    // Takes the address and size of the allocated memory
    // Sets up the initial state of the block
    MemoryBlock(void* addr, size_t sz) 
        : address(addr), 
          size(sz), 
          allocationTime(std::chrono::system_clock::now()),
          isDeallocated(false) {
        // The constructor initializes everything except deallocationTime
        // because we don't know when it will be freed yet
    }
};

class MemoryTracker {
private:
    std::unordered_map<void*, MemoryBlock*> memoryBlocks;
    std::mutex trackerMutex;
    JsonSerializer jsonSerializer;

public:
    MemoryTracker() = default;
    ~MemoryTracker() {
        // Clean up any remaining memory blocks
        for (auto& pair : memoryBlocks) {
            delete pair.second;
        }
    }

    void trackAllocation(void* ptr, size_t size) {
        std::lock_guard<std::mutex> lock(trackerMutex);
        memoryBlocks[ptr] = new MemoryBlock(ptr, size);
    }

    void trackDeallocation(void* ptr) {
        std::lock_guard<std::mutex> lock(trackerMutex);
        auto it = memoryBlocks.find(ptr);
        if (it != memoryBlocks.end()) {
            it->second->isDeallocated = true;
            it->second->deallocationTime = std::chrono::system_clock::now();
        }
    }

    std::vector<MemoryBlock*> getActiveBlocks() const {
        std::vector<MemoryBlock*> active;
        for (const auto& pair : memoryBlocks) {
            if (!pair.second->isDeallocated) {
                active.push_back(pair.second);
            }
        }
        return active;
    }

    std::vector<MemoryBlock*> getLeakedBlocks() const {
        std::vector<MemoryBlock*> leaked;
        for (const auto& pair : memoryBlocks) {
            if (!pair.second->isDeallocated) {
                leaked.push_back(pair.second);
            }
        }
        return leaked;
    }

    std::string toJson() const {
        return jsonSerializer.serializeMemoryState(memoryBlocks);
    }
};

#endif // MEMORY_TRACKER_H
