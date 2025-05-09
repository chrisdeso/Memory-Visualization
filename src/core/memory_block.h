// CS3339 Memory Visualization Project
// memory_block.h
// Defines the MemoryBlock class for tracking heap allocations

#ifndef MEMORY_BLOCK_H
#define MEMORY_BLOCK_H

#include <chrono>
#include <cstddef>

class MemoryBlock {
public:
    void* address;
    size_t size;
    std::chrono::system_clock::time_point allocationTime;
    bool isDeallocated;
    std::chrono::system_clock::time_point deallocationTime;

    MemoryBlock(void* addr, size_t sz)
        : address(addr),
          size(sz),
          allocationTime(std::chrono::system_clock::now()),
          isDeallocated(false) {}
};

#endif // MEMORY_BLOCK_H 