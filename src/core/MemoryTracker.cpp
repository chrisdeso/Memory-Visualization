#include "MemoryTracker.h"
#include <iostream>
#include <cstdlib>
#include <chrono>
#include <ctime>
#include <sstream>
#include <fstream>
#include <iomanip>

// Get the singleton instance.
MemoryTracker& MemoryTracker::instance() {
    static MemoryTracker tracker;
    return tracker;
}

// Helper: returns epoch time (seconds since 1970) as a string.
std::string MemoryTracker::getTimestamp() const {
    auto now = std::chrono::system_clock::now();
    auto epoch_seconds = std::chrono::duration_cast<std::chrono::seconds>(now.time_since_epoch()).count();
    return std::to_string(epoch_seconds);
}

void MemoryTracker::logAllocation(void* ptr, size_t size, const char* type, const char* file, int line) {
    std::lock_guard<std::mutex> lock(mtx_);
    AllocationInfo info;
    info.size = size;
    info.type = type;
    info.file = file;
    info.line = line;
    info.timestamp = getTimestamp();
    info.state = LifecycleState::Active;

    allocations_[ptr] = info;
    totalAllocations_++;

    std::stringstream addrStream;
    addrStream << "0x" << std::hex << reinterpret_cast<uintptr_t>(ptr) << std::dec;

    LogEvent event;
    event.eventType = "Alloc";
    event.address = addrStream.str();
    event.size = size;
    event.type = type;
    event.file = file;
    event.line = line;
    event.timestamp = info.timestamp;
    event.value = "";  // Not applicable for dynamic memory allocations.
    eventLog_.push_back(event);

    std::cout << "[Alloc] " << addrStream.str() << " | " << size
              << " bytes | " << type 
              << " | at " << file << ":" << line
              << " | " << info.timestamp << std::endl;
}

void MemoryTracker::logDeallocation(void* ptr) {
    std::lock_guard<std::mutex> lock(mtx_);
    std::stringstream addrStream;
    addrStream << "0x" << std::hex << reinterpret_cast<uintptr_t>(ptr) << std::dec;

    auto it = allocations_.find(ptr);
    if (it != allocations_.end()) {
        std::cout << "[Dealloc] " << addrStream.str() << " | " << it->second.size
                  << " bytes | " << it->second.type 
                  << " originally allocated at " << it->second.file
                  << ":" << it->second.line << std::endl;

        LogEvent event;
        event.eventType = "Dealloc";
        event.address = addrStream.str();
        event.size = it->second.size;
        event.type = it->second.type;
        event.file = it->second.file;
        event.line = it->second.line;
        event.timestamp = getTimestamp();
        event.value = "";  // Not used for deallocation events.
        eventLog_.push_back(event);

        it->second.state = LifecycleState::Freed;
        allocations_.erase(it);
    } else {
        std::cerr << "[Error] Deallocate called with unregistered pointer: " << addrStream.str() << std::endl;
        LogEvent event;
        event.eventType = "ErrorDealloc";
        event.address = addrStream.str();
        event.size = 0;
        event.type = "";
        event.file = "";
        event.line = 0;
        event.timestamp = getTimestamp();
        event.value = "";
        eventLog_.push_back(event);
    }
}

void* MemoryTracker::allocate(size_t size, const char* type, const char* file, int line) {
    void* ptr = std::malloc(size);
    if (!ptr)
        throw std::bad_alloc();
    logAllocation(ptr, size, type, file, line);
    return ptr;
}

void MemoryTracker::deallocate(void* ptr) {
    logDeallocation(ptr);
    std::free(ptr);
}

void MemoryTracker::dumpAllocations() const {
    std::lock_guard<std::mutex> lock(mtx_);
    if (allocations_.empty()) {
        std::cout << "No outstanding allocations. All memory has been freed." << std::endl;
    } else {
        std::cout << "Outstanding allocations (potential leaks):" << std::endl;
        for (const auto& pair : allocations_) {
            const AllocationInfo &info = pair.second;
            std::cout << "Pointer: 0x" << std::hex << reinterpret_cast<uintptr_t>(pair.first) 
                      << std::dec << " | Size: " << info.size
                      << " | Type: " << info.type
                      << " | Allocated at: " << info.file << ":" << info.line
                      << " | Timestamp: " << info.timestamp
                      << " | State: " << (info.state == LifecycleState::Active ? "Active" : "Freed")
                      << std::endl;
        }
    }
}

void MemoryTracker::printAggregatedMetrics() const {
    std::lock_guard<std::mutex> lock(mtx_);
    size_t activeCount = allocations_.size();
    size_t totalActiveBytes = 0;
    for (const auto& pair : allocations_) {
        totalActiveBytes += pair.second.size;
    }
    std::cout << "\n--- Aggregated Metrics ---" << std::endl;
    std::cout << "Total allocations made: " << totalAllocations_ << std::endl;
    std::cout << "Currently active allocations: " << activeCount << std::endl;
    std::cout << "Total bytes still allocated: " << totalActiveBytes << std::endl;
    std::cout << "--------------------------" << std::endl;
}

void MemoryTracker::writeInfoToJson(const std::string &filename) const {
    std::lock_guard<std::mutex> lock(mtx_);
    std::ofstream outFile(filename);
    if (!outFile) {
        std::cerr << "Error: Cannot open output file " << filename << std::endl;
        return;
    }

    std::stringstream ss;
    ss << "{\n";

    // Aggregated metrics.
    size_t activeCount = allocations_.size();
    size_t totalActiveBytes = 0;
    for (const auto& pair : allocations_) {
        totalActiveBytes += pair.second.size;
    }
    ss << "  \"aggregatedMetrics\": {\n";
    ss << "    \"totalAllocationsMade\": " << totalAllocations_ << ",\n";
    ss << "    \"currentlyActiveAllocations\": " << activeCount << ",\n";
    ss << "    \"totalBytesStillAllocated\": " << totalActiveBytes << "\n";
    ss << "  },\n";

    // Event log.
    ss << "  \"eventLog\": [\n";
    bool firstEvent = true;
    for (const auto &event : eventLog_) {
        if (!firstEvent)
            ss << ",\n";
        else
            firstEvent = false;
        ss << "    {\n";
        ss << "      \"eventType\": \"" << event.eventType << "\",\n";
        ss << "      \"address\": \"" << event.address << "\",\n";
        ss << "      \"size\": " << event.size << ",\n";
        ss << "      \"type\": \"" << event.type << "\",\n";
        ss << "      \"file\": \"" << event.file << "\",\n";
        ss << "      \"line\": " << event.line << ",\n";
        ss << "      \"timestamp\": \"" << event.timestamp << "\",\n";
        ss << "      \"value\": \"" << event.value << "\"\n";
        ss << "    }";
    }
    ss << "\n  ]\n";
    ss << "}\n";

    outFile << ss.str();
    outFile.close();
    std::cout << "Memory tracking info written to " << filename << std::endl;
}
