#include <iostream>
#include <cstring>  // for strcpy
#include "MemoryTracker.h"

// Convenience macros for dynamic allocations.
#define TRACK_ALLOC(size, type) MemoryTracker::instance().allocate(size, type, __FILE__, __LINE__)
#define TRACK_DEALLOC(ptr) MemoryTracker::instance().deallocate(ptr)
// Convenience macro for local variables.
#define TRACK_LOCAL(var) MemoryTracker::instance().logLocalVariable(#var, var, __FILE__, __LINE__)

struct Test {
    int a;
    double b;
};

int main() {
    // Dynamic allocations.
    Test* t1 = static_cast<Test*>(TRACK_ALLOC(sizeof(Test), "Test"));
    t1->a = 123;
    t1->b = 456.789;

    Test* tests = static_cast<Test*>(TRACK_ALLOC(5 * sizeof(Test), "Test[5]"));
    for (int i = 0; i < 5; ++i) {
        tests[i].a = i;
        tests[i].b = i * 10.0;
    }

    int* intArray = static_cast<int*>(TRACK_ALLOC(10 * sizeof(int), "int[10]"));
    for (int i = 0; i < 10; ++i) {
        intArray[i] = i * i;
    }

    double* doubleArray = static_cast<double*>(TRACK_ALLOC(8 * sizeof(double), "double[8]"));
    for (int i = 0; i < 8; ++i) {
        doubleArray[i] = i * 1.1;
    }
    // Intentionally not deallocating doubleArray to simulate a leak.

    char* name = static_cast<char*>(TRACK_ALLOC(20 * sizeof(char), "char[20]"));
    strcpy(name, "MemoryTrackerTest");

    float* floatArray = static_cast<float*>(TRACK_ALLOC(7 * sizeof(float), "float[7]"));
    for (int i = 0; i < 7; ++i) {
        floatArray[i] = i * 2.5f;
    }

    // Track local variables.
    int localInt = 42;
    TRACK_LOCAL(localInt);

    double localDouble = 3.14159;
    TRACK_LOCAL(localDouble);

    std::string localString = "Hello, MemoryTracker!";
    TRACK_LOCAL(localString);

    // Deallocate some dynamic memory.
    TRACK_DEALLOC(t1);
    TRACK_DEALLOC(tests);
    TRACK_DEALLOC(intArray);
    TRACK_DEALLOC(name);
    TRACK_DEALLOC(floatArray);
    // doubleArray remains allocated to simulate a leak.

    // Dump active dynamic allocations.
    MemoryTracker::instance().dumpAllocations();
    MemoryTracker::instance().printAggregatedMetrics();

    // Write complete tracking info (all events, including local variable logs) to a JSON file.
    MemoryTracker::instance().writeInfoToJson("memory_tracking.json");

    return 0;
}
