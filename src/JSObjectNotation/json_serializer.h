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
            ss << "    \"description\": \"" << step.desc << "\",\n";
            ss << "    \"line_number\": " << step.highlight << ",\n";
            // Use flat stackVars
            ss << "    \"stack\": [";
            for (size_t j = 0; j < step.stackVars.size(); ++j) {
                const auto& var = step.stackVars[j];
                if (j > 0) ss << ", ";
                ss << "{\"name\": \"" << var.name << "\", \"address\": \"" << var.address << "\", \"value\": \"" << var.value << "\", \"highlight\": false}";
            }
            ss << "],\n";
            // Use flat staticVars
            ss << "    \"static\": [";
            for (size_t j = 0; j < step.staticVars.size(); ++j) {
                const auto& s = step.staticVars[j];
                if (j > 0) ss << ", ";
                ss << "{\"name\": \"" << s.name << "\", \"address\": \"" << s.address << "\", \"value\": \"" << s.value << "\", \"highlight\": false}";
            }
            ss << "],\n";
            // Heap: show address/size/value for each block
            ss << "    \"heap\": [";
            std::string heapJson = step.heapJson;
            size_t pos = heapJson.find("["), end = heapJson.find("]");
            if (pos != std::string::npos && end != std::string::npos && end > pos) {
                std::string blocks = heapJson.substr(pos + 1, end - pos - 1);
                // Parse each block and output as {address, value, highlight}
                std::stringstream blockss(blocks);
                std::string block;
                bool first = true;
                while (std::getline(blockss, block, '}')) {
                    size_t addr_pos = block.find("\"address\": ");
                    size_t size_pos = block.find("\"size\": ");
                    if (addr_pos != std::string::npos && size_pos != std::string::npos) {
                        std::string addr = block.substr(addr_pos + 12, block.find('"', addr_pos + 12) - (addr_pos + 12));
                        std::string size = block.substr(size_pos + 8, block.find(',', size_pos + 8) - (size_pos + 8));
                        if (!first) ss << ", ";
                        first = false;
                        ss << "{\"name\": \"block\", \"address\": \"" << addr << "\", \"value\": \"size=" << size << "\", \"highlight\": false}";
                    }
                }
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
