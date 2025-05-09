# Stack and Heap Memory Visualization Tool
## CS3339 (Computer Architecture) at Texas State University - Spring 2025

![image](https://github.com/user-attachments/assets/3ec08fdb-f72d-495c-9cc5-55309c6fe3f2)

## Table of Contents
1. [Project description](#project-description)
2. [Team members](#team-members)
3. [Why did we make this?](#why-did-we-make-this-?)
4. [What does this do?](#what-does-this-do-?)
5. [Implementation overview](#implementation-overview)
6. [Features](#features)
7. [Build instructions](#build-instructions)

## Project description

This project develops a simple visualization tool that graphically represents stack and heap memory allocations for small C++ programs.

## Team members
Our team is composed of (in alphabetical order):
- Christopher de Souza
- Isabella Liduario Buzelin Godinho
- Kendal Anderson
- Maryam Bouamama
- Yuxi Luo

## Why did we make this?

Memory allocation and management are fundamental computer system ideas, but they can often be abstract and difficult to understand for the majority of students. The main motivation for this project is to help students (and developers) visualize how components of programs (global variables, local variables, arrays, etc) are organized in memory by providing a tangible representation of these abstract operations.

## What does this do?

Memory management is one of those computer science concepts that are extremely important but really hard to understand because it is hard to *see* it. This tool aims to fill this gap by showing you:

- How stack frames get created and destroyed during function calls
- Where local variables live on the stack
- What happens when you use `new` and `delete` for dynamic memory
- How memory leaks happen (and how to spot them!)

## Implementation overview
// TODO

## Features

- Visual representation of stack and heap memory
- Step-by-step visualization of memory operations
- Color-coded memory blocks to identify different types and states
- Simple examples to demonstrate key memory concepts

## Build instructions

### Quick Start with function_calls Example

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Memory-Visualization.git
   cd Memory-Visualization
   ```

2. Make the run script executable:
   ```bash
   chmod +x run_and_visualize.sh
   ```

3. Run the function_calls example:
   ```bash
   ./run_and_visualize.sh examples/function_calls.cpp
   ```

4. Open your web browser and navigate to:
   ```
   http://localhost:8000
   ```

The visualization will show you how memory is distributed, with color-coded memory blocks representing different variables and their states.
