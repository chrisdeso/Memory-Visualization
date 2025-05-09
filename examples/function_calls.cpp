#include "../src/wrappers/memory_wrappers.h"
#include <iostream>
#include <vector>

extern bool g_tracking_enabled;

int x = 0; // global

void greet() {
    TRACK_FUNC_ENTRY("greet");
    std::cout << "Hello from greet!" << std::endl;
    TRACK_FUNC_EXIT();
}

void add(int a, int b) {
    TRACK_FUNC_ENTRY("add");
    TRACK_VAR(a);
    TRACK_VAR(b);
    int sum = a + b;
    TRACK_VAR(sum);
    std::cout << "Sum: " << sum << std::endl;
    greet();
    TRACK_FUNC_EXIT();
}

int main() {
    std::cout << "[DEBUG] main() started" << std::endl;
    g_tracking_enabled = true;
    std::cout << "[DEBUG] after g_tracking_enabled = true" << std::endl;
    TRACK_GLOBAL(x);
    globalMemoryTracker.snapshotStep({"int x = 0; // global"}, 0, "Step 0", "Tracked global x");
    std::cout << "[DEBUG] after TRACK_GLOBAL(x)" << std::endl;
    TRACK_FUNC_ENTRY("main");
    globalMemoryTracker.snapshotStep({"main() {"}, 0, "Step 1", "Entered main");
    std::cout << "[DEBUG] after TRACK_FUNC_ENTRY(main)" << std::endl;
    x = 5;
    globalMemoryTracker.snapshotStep({"x = 5;"}, 0, "Step 2", "Set x to 5");
    std::cout << "[DEBUG] after x = 5" << std::endl;
    TRACK_VAR(x);
    globalMemoryTracker.snapshotStep({"TRACK_VAR(x);"}, 0, "Step 3", "Tracked local x");
    std::cout << "[DEBUG] after TRACK_VAR(x)" << std::endl;
    add(2, 3);
    globalMemoryTracker.snapshotStep({"add(2, 3);"}, 0, "Step 4", "Called add");
    std::cout << "[DEBUG] after add(2, 3)" << std::endl;
    TRACK_FUNC_EXIT();
    globalMemoryTracker.snapshotStep({"TRACK_FUNC_EXIT();"}, 0, "Step 5", "Exited main");
    std::cout << "[DEBUG] after TRACK_FUNC_EXIT()" << std::endl;
    g_tracking_enabled = false;
    std::cout << "[DEBUG] after g_tracking_enabled = false" << std::endl;
    dump_trace_json();
    std::cout << "[DEBUG] after dump_trace_json()" << std::endl;
    return 0;
} 