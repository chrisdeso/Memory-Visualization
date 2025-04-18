cmake_minimum_required(VERSION 3.10)

# Define the project name and language.
project(Demo1 CXX)

# Set the C++ standard.
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Optionally add some compile options.
if(MSVC)
    add_compile_options(/Zi /EHsc /nologo)
else()
    add_compile_options(-g -Wall -Wextra)
endif()

# Specify the include directory (so the compiler can find MemoryTracker.h).
include_directories(${PROJECT_SOURCE_DIR}/src/core)

# List the source files.
set(SOURCES
    src/core/demo1.cpp
    src/core/MemoryTracker.cpp
)

# Add the executable target using the demo1 source file.
add_executable(demo1 ${SOURCES})
