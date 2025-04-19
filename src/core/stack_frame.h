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
    std::string value;  // Value of the variable

    LocalVar(std::string varName, std::string varType, size_t varSize, std::string varValue) {
        name = varName;
        type = varType;
        size = varSize;
        value = varValue;
    }

//consulted AI for the JSON part; subject to change depending on JSObjectNotation code
    std::string toJSON() const {
        std::string json = "{\"name\": \"" + name + "\", ";
        json += "\"type\": \"" + type + "\", ";
        json += "\"size\": " + std::to_string(size) + ", ";
        json += "\"value\": \"" + value + "\"}";
        return json;
    }
};


class StackFrame {
public:
    std::string functionName;  // Name of the function
    std::string entryTime;     // Timestampt for when the function starts
    std::string exitTime;      // Timestamp for when the function ends
    std::vector<LocalVar> localVars; // List of local variables

    StackFrame(std::string funcName) {
        functionName = funcName;
        entryTime = getCurrentTime();
    }

    void addLocalVar(std::string varName, std::string varType, size_t varSize, std::string varValue) {
        LocalVar newVar(varName, varType, varSize, varValue);
        localVars.push_back(newVar);
    }

    void removeLocalVar(std::string varName) {
        for (size_t i = 0; i < localVars.size(); i++) {
            if (localVars[i].name == varName) {
                localVars.erase(localVars.begin() + i);
                break;
            }
        }
    }

    void endFunction() {
        exitTime = getCurrentTime();
    }

private:
    std::string getCurrentTime() {
        return "current_time_placeholder"; 
    }
};

#endif // STACK_FRAME_H 
