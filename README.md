# C Memory Visualizer
## CS3339 (Computer Architecture) at Texas State University - Spring 2025

![image](https://github.com/user-attachments/assets/22e8cc7c-b65f-438d-bd05-7a08013ec1ee)

## Table of Contents
1. [Project description](#project-description)
2. [Team members](#team-members)
3. [Why did we make this?](#why-did-we-make-this)
4. [What does this do?](#what-does-this-do)
5. [How it works](#how-it-works)
6. [Features](#features)
7. [Build instructions](#build-instructions)

## Project description

A browser-based tool that lets you write C/C++ code and watch stack frames, heap allocations, and pointer relationships update in real time, step by step.

## Team members
Our team is composed of (in alphabetical order):
- Christopher de Souza
- Isabella Liduario Buzelin Godinho
- Kendal Anderson
- Maryam Bouamama
- Yuxi Luo

## Why did we make this?

Memory allocation and management are fundamental computer science ideas that are genuinely hard to understand because you can't see them. Textbooks describe what happens when you call `malloc` or recurse into a function, but the mental model only clicks once you watch it happen. This tool gives you that view — what's on the stack, what's on the heap, where the pointers point, and what a memory leak actually looks like at the moment it occurs.

## What does this do?

You type C or C++ code in the editor on the left. Hit Run (or Ctrl+S). The panels on the right show you:

- Stack frames as they get pushed and popped during function calls, with the local variables inside each frame
- Heap blocks as they're allocated and freed via `malloc`/`free` or `new`/`delete`, with live pointer arrows connecting them to stack variables
- A registers panel showing the current line and active variables
- Inline error highlighting when something goes wrong, plus a partial trace so you can step up to the failure point

You can step forward and backward through execution one statement at a time, or use auto-play at slow/medium/fast speed.

## How it works

The whole thing runs in the browser. There's no server, no compilation, no native toolchain required.

When you hit Run, the source is sent to a Web Worker that runs a TypeScript interpreter — a lexer, parser, and tree-walking evaluator written from scratch. The evaluator simulates a C memory model: a stack that grows with each function call, a heap that tracks live and freed blocks, and pointer relationships that get re-derived at each step. It produces a trace (a list of snapshots), sends it back to the main thread, and the UI renders each snapshot as you step through.

The editor is Monaco (the same editor VS Code uses), configured with C++ syntax highlighting. Visualization panels are plain DOM with some D3 for layout.

If execution takes more than 5 seconds the worker is terminated, which catches infinite loops before they hang the tab.

## Features

- Monaco editor with C++ syntax highlighting, inline error markers, and Ctrl+S to run
- Step-by-step execution with forward/back controls and auto-play at three speeds
- Stack panel showing all active frames and their local variables
- Heap panel showing allocated blocks, freed blocks, and pointer arrows
- Registers panel showing current line, active scope, and variable values
- Memory leak detection: freed and leaked blocks are visually distinct
- Dangling pointer detection: writing through a freed pointer is caught and flagged
- Struct support, including pointer-to-struct and member access
- STL simulation: `std::vector`, `std::string`, `std::array`
- Built-in examples covering malloc/free, memory leaks, dangling pointers, recursion, linked lists, structs, and nullptr

## Build instructions

Requires Node.js 18+.

```bash
git clone https://github.com/Xitones/Memory-Visualization.git
cd Memory-Visualization
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

To build for production:

```bash
npm run build
```

Output goes to `dist/`. Any static file server can serve it.

To run tests:

```bash
npm test
```
