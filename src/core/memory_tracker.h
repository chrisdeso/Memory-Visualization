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
#include <stack>
#include <algorithm>
#include "memory_block.h"

extern bool g_tracking_enabled;

struct VariableInfo {
    std::string name;
    void* address;
    std::string value; // store as string for easy serialization
    bool isGlobal = false;
    bool isStatic = false;
};

struct StackFrame {
    std::string functionName;
    std::vector<VariableInfo> locals;
};

struct StepSnapshot {
    std::vector<std::string> code;
    int highlight;
    std::string step;
    std::string desc;
    std::vector<VariableInfo> globals;
    std::vector<StackFrame> stackFrames;
    std::vector<VariableInfo> statics;
    std::string heapJson; // for now, use existing heap serialization
    // New: flat arrays for frontend
    std::vector<VariableInfo> stackVars;
    std::vector<VariableInfo> staticVars;
};

// MemoryTracker class
// This class keeps track of all memory blocks in our program
// It's like a manager that knows about all the memory we've allocated
class MemoryTracker {
private:
    // Map of memory addresses to their corresponding MemoryBlock objects
    // Using unordered_map because we need fast lookups by address
    std::unordered_map<void*, MemoryBlock*> memoryBlocks;
    
    // Mutex to make our tracker thread-safe
    // We learned about mutexes in class for handling concurrent access
    std::mutex trackerMutex;
    JsonSerializer jsonSerializer;
    std::vector<VariableInfo> globals;
    std::vector<VariableInfo> statics;
    std::stack<StackFrame> callStack;
    std::vector<StepSnapshot> steps;

public:
    // Default constructor
    MemoryTracker() = default;
    
    // Destructor to clean up any remaining memory blocks
    // This helps prevent memory leaks in our tracker itself
    ~MemoryTracker() {
        // Clean up any remaining memory blocks
        for (auto& pair : memoryBlocks) {
            delete pair.second;
        }
    }

    // Called when new memory is allocated
    // Creates a new MemoryBlock to track this allocation
    void trackAllocation(void* ptr, size_t size) {
        std::lock_guard<std::mutex> lock(trackerMutex);
        memoryBlocks[ptr] = new MemoryBlock(ptr, size);
    }

    // Called when memory is freed
    // Updates the MemoryBlock to show it's been deallocated
    void trackDeallocation(void* ptr) {
        std::lock_guard<std::mutex> lock(trackerMutex);
        auto it = memoryBlocks.find(ptr);
        if (it != memoryBlocks.end()) {
            it->second->isDeallocated = true;
            it->second->deallocationTime = std::chrono::system_clock::now();
        }
    }

    // Get all memory blocks that are still allocated
    // This is useful for showing active memory in our visualization
    std::vector<MemoryBlock*> getActiveBlocks() const {
        std::vector<MemoryBlock*> active;
        for (const auto& pair : memoryBlocks) {
            if (!pair.second->isDeallocated) {
                active.push_back(pair.second);
            }
        }
        return active;
    }

    // Get all memory blocks that haven't been freed
    // This helps us detect memory leaks
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

    void pushFrame(const std::string& func) {
        callStack.push(StackFrame{func, {}});
    }
    void popFrame() {
        if (!callStack.empty()) callStack.pop();
    }
    void trackVar(const std::string& name, void* addr, const std::string& value) {
        if (!callStack.empty())
            callStack.top().locals.push_back(VariableInfo{name, addr, value, false, false});
    }
    void trackGlobal(const std::string& name, void* addr, const std::string& value) {
        globals.push_back(VariableInfo{name, addr, value, true, false});
    }
    void trackStatic(const std::string& name, void* addr, const std::string& value) {
        statics.push_back(VariableInfo{name, addr, value, false, true});
    }
    void snapshotStep(const std::vector<std::string>& code, int highlight, const std::string& step, const std::string& desc) {
        bool was_tracking = g_tracking_enabled;
        g_tracking_enabled = false;
        StepSnapshot snap{code, highlight, step, desc, globals, {}, statics, toJson()};
        // Copy stack frames
        std::stack<StackFrame> tmp = callStack;
        std::vector<StackFrame> frames;
        while (!tmp.empty()) { frames.push_back(tmp.top()); tmp.pop(); }
        std::reverse(frames.begin(), frames.end());
        snap.stackFrames = frames;
        // Flatten stack: all locals from all frames + all globals
        for (const auto& frame : snap.stackFrames) {
            for (const auto& var : frame.locals) {
                snap.stackVars.push_back(var);
            }
        }
        for (const auto& g : globals) {
            snap.stackVars.push_back(g);
        }
        // Flatten static
        for (const auto& s : statics) {
            snap.staticVars.push_back(s);
        }
        steps.push_back(snap);
        g_tracking_enabled = was_tracking;
    }
    const std::vector<StepSnapshot>& getSteps() const { return steps; }

    // New: Serialize all steps as a JSON array for the frontend
    std::string stepsToJson() const {
        return jsonSerializer.serializeSteps(steps);
    }
};

#endif // MEMORY_TRACKER_H
