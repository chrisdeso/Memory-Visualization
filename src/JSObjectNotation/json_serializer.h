// CS3339 Memory Visualization Project
// json_serializer.h
// This file converts our memory tracking data into JSON format
// We're using JSON because it's easy to work with in JavaScript for our visualization
// and it's a standard format we learned about in class

#ifndef JSON_SERIALIZER_H
#define JSON_SERIALIZER_H

#include <string>
#include <unordered_map>
#include <vector>
#include <chrono>
#include <sstream>
#include <iomanip>
#include "../core/memory_tracker.h"

class JsonSerializer {
public:
    // Convert memory tracking data to JSON string
    // This is the main function that our visualization will use
    std::string serializeMemoryState(const std::unordered_map<void*, MemoryBlock*>& memoryBlocks) const {
        std::stringstream ss;
        ss << "{\n";
        ss << "  \"memory_blocks\": [\n";
        
        // Loop through all memory blocks and convert them to JSON
        bool first = true;
        for (const auto& pair : memoryBlocks) {
            if (!first) {
                ss << ",\n";
            }
            first = false;
            
            const MemoryBlock* block = pair.second;
            ss << "    {\n";
            ss << "      \"address\": \"" << block->address << "\",\n";
            ss << "      \"size\": " << block->size << ",\n";
            ss << "      \"allocation_time\": \"" << timeToString(block->allocationTime) << "\",\n";
            ss << "      \"is_deallocated\": " << (block->isDeallocated ? "true" : "false");
            
            // Only include deallocation time if the block was freed
            if (block->isDeallocated) {
                ss << ",\n      \"deallocation_time\": \"" << timeToString(block->deallocationTime) << "\"";
            }
            
            ss << "\n    }";
        }
        
        ss << "\n  ],\n";
        ss << "  \"timestamp\": \"" << timeToString(std::chrono::system_clock::now()) << "\"\n";
        ss << "}";
        
        return ss.str();
    }

private:
    // Helper function to convert time points to strings
    // We format the time to include milliseconds for more precise tracking
    std::string timeToString(const std::chrono::system_clock::time_point& time) const {
        auto time_t = std::chrono::system_clock::to_time_t(time);
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            time.time_since_epoch()) % 1000;
        
        std::stringstream ss;
        ss << std::put_time(std::localtime(&time_t), "%Y-%m-%d %H:%M:%S");
        ss << '.' << std::setfill('0') << std::setw(3) << ms.count();
        return ss.str();
    }
};

#endif // JSON_SERIALIZER_H
