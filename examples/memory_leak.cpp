#include "../src/wrappers/memory_wrappers.h"
#include <iostream>
#include <vector>

int leak_count = 0; // global

void leak_memory() {
    TRACK_FUNC_ENTRY("leak_memory");
    globalMemoryTracker.snapshotStep({}, -1, "leak_memory entry", "Entering leak_memory function");
    int* arr = new int[5];
    for (int i = 0; i < 5; i++) {
        arr[i] = i * 2;
        TRACK_VAR(arr[i]);
    }
    globalMemoryTracker.snapshotStep({}, -1, "after allocation", "Array allocated and initialized, but not freed");
    std::cout << "Allocated array, but not freeing it!" << std::endl;
    // Memory leak: no delete[] arr
    TRACK_FUNC_EXIT();
}

int main() {
    TRACK_GLOBAL(leak_count);
    TRACK_FUNC_ENTRY("main");
    globalMemoryTracker.snapshotStep({}, -1, "main entry", "Entering main function");
    leak_memory();
    globalMemoryTracker.snapshotStep({}, -1, "main exit", "Exiting main function");
    TRACK_FUNC_EXIT();
    dump_trace_json();
    return 0;
} 