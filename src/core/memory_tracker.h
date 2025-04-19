#ifndef MEMORY_TRACKER_H
#define MEMORY_TRACKER_H

#include <cstddef>
#include <mutex>
#include <map>
#include <string>
#include <vector>

// Define lifecycle states for an allocation.
enum class LifecycleState {
    Active,   // Allocation created and not yet freed.
    Freed,    // Allocation freed.
    Error     // Something went wrong.
};

// Structure to hold detailed allocation information (for active allocations).
struct AllocationInfo {
    size_t size;            // Block size in bytes.
    std::string type;       // A label describing the data type.
    std::string file;       // Source file where the allocation was made.
    int line;               // Line number in the source file.
    std::string timestamp;  // When the allocation occurred, as epoch time.
    LifecycleState state;   // Current lifecycle state.
};

// Structure to store every logging event.
struct LogEvent {
    std::string eventType;   // "Alloc", "Dealloc", "Local" (or "ErrorDealloc")
    std::string address;     // Hex string version of the pointer.
    size_t size;             // Block size.
    std::string type;        // Data type label.
    std::string file;        // File where the event occurred.
    int line;                // Line number.
    std::string timestamp;   // Epoch timestamp.
    std::string value;       // For local variables: the variable’s value as a string.
};

class MemoryTracker {
public:
    // Retrieve the singleton instance.
    static MemoryTracker& instance();

    // Log a dynamic allocation event.
    void logAllocation(void* ptr, size_t size, const char* type, const char* file, int line);

    // Log a dynamic deallocation event.
    void logDeallocation(void* ptr);

    // Wrapper to explicitly allocate memory and log it.
    void* allocate(size_t size, const char* type, const char* file, int line);

    // Wrapper to free memory and log it.
    void deallocate(void* ptr);

    // Dump all outstanding (active) allocations.
    void dumpAllocations() const;

    // Print aggregated metrics.
    void printAggregatedMetrics() const;

    // Write complete tracking information (including all events) to a JSON file.
    void writeInfoToJson(const std::string &filename) const;

    // Function template to log a local (stack) variable.
    template<typename T>
    void logLocalVariable(const char* varName, const T& var, const char* file, int line);

private:
    MemoryTracker() = default;
    ~MemoryTracker() = default;
    MemoryTracker(const MemoryTracker&) = delete;
    MemoryTracker& operator=(const MemoryTracker&) = delete;

    // Helper to get the current epoch timestamp as a string.
    std::string getTimestamp() const;

    mutable std::mutex mtx_;
    std::map<void*, AllocationInfo> allocations_;  // Active (heap) allocations.
    std::vector<LogEvent> eventLog_;                 // Complete event log.
    size_t totalAllocations_ = 0;  // Total dynamic (heap) allocations made.
};

//
// Template definition must be in the header file.
//

#include <sstream>
#include <typeinfo>

template<typename T>
void MemoryTracker::logLocalVariable(const char* varName, const T& var, const char* file, int line) {
    std::lock_guard<std::mutex> lock(mtx_);
    LogEvent event;
    event.eventType = "Local";

    // Record the stack address of the local variable.
    std::stringstream addrStream;
    addrStream << "0x" << std::hex << reinterpret_cast<uintptr_t>(&var) << std::dec;
    event.address = addrStream.str();

    event.size = sizeof(var);
    event.type = typeid(var).name();
    event.file = file;
    event.line = line;
    event.timestamp = getTimestamp();

    // Try to convert the variable's value to a string.
    std::stringstream ss;
    ss << var;
    event.value = ss.str();

    eventLog_.push_back(event);

    std::cout << "[Local] " << varName << " at " << event.address
              << " | size: " << event.size
              << " | type: " << event.type
              << " | value: " << event.value
              << " | at " << file << ":" << line
              << " | timestamp: " << event.timestamp << std::endl;
}

#endif // MEMORY_TRACKER_H