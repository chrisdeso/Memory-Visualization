#include "memory_wrappers.h"
#include <cstdlib>
#include <new>
#include <fstream>
#include <iostream>
#include <thread>

MemoryTracker globalMemoryTracker;
bool g_tracking_enabled = false;
thread_local bool g_in_tracker = false;

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
    out << globalMemoryTracker.stepsToJson();
    out.close();
} 