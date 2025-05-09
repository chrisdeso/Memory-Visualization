// CS3339 Memory Visualization Project
// memory_wrappers.h
// This file overrides the C++ new and delete operators to track memory operations
// We learned in class that we can override these operators to customize memory management


// ensure header is used only once
#pragma once
#include <cstdlib>
#include <new>
#include <fstream>
#include "../core/memory_tracker.h"

// Global memory tracker instance (extern, defined in memory_wrappers.cpp)
extern MemoryTracker globalMemoryTracker;

// Helper to dump trace at end of main
void dump_trace_json();

// Macros for instrumentation
#define TRACK_FUNC_ENTRY(name) globalMemoryTracker.pushFrame(name)
#define TRACK_FUNC_EXIT() globalMemoryTracker.popFrame()
#define TRACK_VAR(var) globalMemoryTracker.trackVar(#var, (void*)&var, std::to_string(var))
#define TRACK_GLOBAL(var) globalMemoryTracker.trackGlobal(#var, (void*)&var, std::to_string(var))
#define TRACK_STATIC(var) globalMemoryTracker.trackStatic(#var, (void*)&var, std::to_string(var))

extern std::string g_source_code;
void set_source_code(const std::string& filename);


