#include "memory_wrappers.h"
#include <cstdlib>
#include <new>
#include <fstream>
#include <iostream>
#include <thread>
#include <sstream>
#include <vector>
#include <string>

MemoryTracker globalMemoryTracker;
bool g_tracking_enabled = false;
thread_local bool g_in_tracker = false;

std::string g_source_code;

void set_source_code(const std::string& filename) {
    std::ifstream in(filename);
    if (!in) return;
    std::ostringstream ss;
    std::string line;
    while (std::getline(in, line)) {
        ss << line << "\n";
    }
    g_source_code = ss.str();
}

void* operator new(std::size_t size) {
    if (g_in_tracker) return std::malloc(size);
    g_in_tracker = true;
    std::cout << "[DEBUG] operator new called, size=" << size << std::endl;
    void* ptr = std::malloc(size);
    if (!ptr) throw std::bad_alloc();
    if (g_tracking_enabled) globalMemoryTracker.trackAllocation(ptr, size);
    g_in_tracker = false;
    return ptr;
}
void operator delete(void* ptr) noexcept {
    if (g_in_tracker) { std::free(ptr); return; }
    g_in_tracker = true;
    std::cout << "[DEBUG] operator delete called, ptr=" << ptr << std::endl;
    if (g_tracking_enabled) globalMemoryTracker.trackDeallocation(ptr);
    g_in_tracker = false;
    std::free(ptr);
}
void* operator new[](std::size_t size) {
    if (g_in_tracker) return std::malloc(size);
    g_in_tracker = true;
    std::cout << "[DEBUG] operator new[] called, size=" << size << std::endl;
    void* ptr = std::malloc(size);
    if (!ptr) throw std::bad_alloc();
    if (g_tracking_enabled) globalMemoryTracker.trackAllocation(ptr, size);
    g_in_tracker = false;
    return ptr;
}
void operator delete[](void* ptr) noexcept {
    if (g_in_tracker) { std::free(ptr); return; }
    g_in_tracker = true;
    std::cout << "[DEBUG] operator delete[] called, ptr=" << ptr << std::endl;
    if (g_tracking_enabled) globalMemoryTracker.trackDeallocation(ptr);
    g_in_tracker = false;
    std::free(ptr);
}

void dump_trace_json() {
    std::cout << "[DEBUG] dump_trace_json called" << std::endl;
    std::ofstream out("trace.json");
    out << "{\n  \"source_code\": \"";
    // Escape quotes and backslashes in source code
    std::string src = g_source_code;
    for (size_t i = 0; i < src.size(); ++i) {
        if (src[i] == '\\' || src[i] == '"') out << '\\';
        if (src[i] == '\n') out << "\\n";
        else out << src[i];
    }
    out << "\",\n  \"steps\": ";
    out << globalMemoryTracker.stepsToJson();
    out << "\n}\n";
    out.close();
} 