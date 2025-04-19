// stack_frame.h
//
// Function call stack frames for the visualization
// Tracks a functions entry + exit and local variable allocation
//
// Classes:
// 	- StackFrame: tracks function execution conext info (name, variables, entry/exit timestamps)
// 	-LocalVar: Stores information about variables in stack frame.

#ifndef STACK_FRAME_H
#define STACK_FRAME_H
// test comment
#include <string>
#include <vector>
#include <iostream>
#include <chrono>
#include <sstream>
#include "memory_tracker.h"
#include <bits/algorithmfwd.h>

// Represents a local variable in a stack frame
class LocalVar {
public:
    std::string name;   // Variable name
    std::string type;   // Variable type
    size_t size;        // Size of the variable
    std::string value;  // Value of the variable (optional)

    LocalVar(const std::string& name, const std::string& type, size_t size, const std::string& value = "")
        : name(name), type(type), size(size), value(value) {}

    std::string toJSON() const {
        std::ostringstream oss;
        oss << "{"
            << "\"name\": \"" << name << "\", "
            << "\"type\": \"" << type << "\", "
            << "\"size\": " << size << ", "
            << "\"value\": \"" << value << "\""
            << "}";
        return oss.str();
    }
};

// Represents a function's execution context
class StackFrame {
public:
    std::string functionName;  // Name of the function
    std::string entryTimestamp; // Entry timestamp
    std::string exitTimestamp;  // Exit timestamp
    std::vector<LocalVar> localVars; // List of local variables

    StackFrame(const std::string& functionName)
        : functionName(functionName), entryTimestamp(getCurrentTimestamp()) {}

    void addLocalVar(const std::string& name, const std::string& type, size_t size, const std::string& value = "") {
        localVars.emplace_back(name, type, size, value);
        MemoryTracker::instance().logLocalVariable(name.c_str(), value, __FILE__, __LINE__);
    }

    void removeLocalVar(const std::string& name) {
        auto it = std::find_if(localVars.begin(), localVars.end(),
                               [&name](const LocalVar& var) { return var.name == name; });
        if (it != localVars.end()) {
            localVars.erase(it);
        }
    }

    void exit() {
        exitTimestamp = getCurrentTimestamp();
    }

    std::string toJSON() const {
        std::ostringstream oss;
        oss << "{"
            << "\"functionName\": \"" << functionName << "\", "
            << "\"entryTimestamp\": \"" << entryTimestamp << "\", "
            << "\"exitTimestamp\": \"" << exitTimestamp << "\", "
            << "\"localVars\": [";
        for (size_t i = 0; i < localVars.size(); ++i) {
            oss << localVars[i].toJSON();
            if (i < localVars.size() - 1) oss << ", ";
        }
        oss << "]"
            << "}";
        return oss.str();
    }

private:
    static std::string getCurrentTimestamp() {
        auto now = std::chrono::system_clock::now();
        auto epoch_seconds = std::chrono::duration_cast<std::chrono::seconds>(now.time_since_epoch()).count();
        return std::to_string(epoch_seconds);
    }
};

#endif // STACK_FRAME_H
