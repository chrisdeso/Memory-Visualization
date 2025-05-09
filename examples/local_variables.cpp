#include "../src/wrappers/memory_wrappers.h"
#include <iostream>

int g = 42; // global

void print_values() {
    TRACK_FUNC_ENTRY("print_values");
    int x = 10;
    double y = 3.14;
    char c = 'A';
    TRACK_VAR(x);
    TRACK_VAR(y);
    TRACK_VAR(c);
    std::cout << "x = " << x << ", y = " << y << ", c = " << c << std::endl;
    TRACK_FUNC_EXIT();
}

int main() {
    TRACK_GLOBAL(g);
    TRACK_FUNC_ENTRY("main");
    print_values();
    TRACK_FUNC_EXIT();
    dump_trace_json();
    return 0;
} 