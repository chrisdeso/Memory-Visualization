#include "../core/memory_block.h"
// CS3339 Memory Visualization Project
// json_serializer.h
//
// Converts memory tracking data created by memory_tracker.h to JSON for use in the visualization (D3.js)
// Uses timestamps to create timeline of events and memory state snapshots.
//
// Classes:
// 	- JsonSerializer: Transforms memory tracking data into JSON output
// 	- Different functions to format different data types into JSON

#ifndef JSON_SERIALIZER_H
#define JSON_SERIALIZER_H

#include <string>
#include <unordered_map>
#include <vector>
#include <chrono>
#include <sstream>
#include <iomanip>

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

    // New: Serialize a vector of StepSnapshot as an array of steps for the frontend
    template<typename StepSnapshotT>
    std::string serializeSteps(const std::vector<StepSnapshotT>& steps) const {
        std::stringstream ss;
        ss << "[\n";
        for (size_t i = 0; i < steps.size(); ++i) {
            const auto& step = steps[i];
            ss << "  {\n";
            ss << "    \"step\": \"" << step.step << "\",\n";
            ss << "    \"desc\": \"" << step.desc << "\",\n";
            // Stack
            ss << "    \"stack\": [";
            for (size_t j = 0; j < step.stackFrames.size(); ++j) {
                const auto& frame = step.stackFrames[j];
                ss << "{\"id\": " << j+1 << ", \"function_name\": \"" << frame.functionName << "\", \"variables\": [";
                for (size_t k = 0; k < frame.locals.size(); ++k) {
                    const auto& var = frame.locals[k];
                    ss << "{\"name\": \"" << var.name << "\", \"value\": " << var.value << "}";
                    if (k + 1 < frame.locals.size()) ss << ", ";
                }
                ss << "]}";
                if (j + 1 < step.stackFrames.size()) ss << ", ";
            }
            ss << "],\n";
            // Heap
            ss << "    \"heap\": ";
            ss << step.heapJson << ",\n";
            // Statics
            ss << "    \"statics\": [";
            for (size_t j = 0; j < step.statics.size(); ++j) {
                const auto& s = step.statics[j];
                ss << "{\"name\": \"" << s.name << "\", \"value\": " << s.value << "}";
                if (j + 1 < step.statics.size()) ss << ", ";
            }
            ss << "]\n  }";
            if (i + 1 < steps.size()) ss << ",\n";
        }
        ss << "\n]";
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
