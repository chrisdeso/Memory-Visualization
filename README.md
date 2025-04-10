# Stack and Heap Memory Visualization Tool

A simple visualization tool that helps you see what's happening in memory for small C++ programs. Created by CS3339 students for the Spring 2025 term project.

## What does this do?

Memory management is one of those computer science concepts that's super important but really hard to understand because you can't *see* it. This tool fixes that problem by showing you:

- How stack frames get created and destroyed during function calls
- Where local variables live on the stack
- What happens when you use `new` and `delete` for dynamic memory
- How memory leaks happen (and how to spot them!)

## Why did we make this?

Because we've all been there - staring at code, wondering why our pointers are causing segfaults or why our memory is leaking. This tool makes these abstract concepts visible so you can actually understand what's going on.

## Features

- Visual representation of stack and heap memory
- Step-by-step visualization of memory operations
- Color-coded memory blocks to identify different types and states
- Simple examples to demonstrate key memory concepts
