#!/bin/bash
# Usage: ./run_and_visualize.sh examples/function_calls.cpp

set -e

if [ $# -ne 1 ]; then
  echo "Usage: $0 <cpp_source_file>"
  exit 1
fi

SRC_FILE="$1"
BASENAME=$(basename "$SRC_FILE" .cpp)
EXE_FILE="${BASENAME}"

# 1. Compile the C++ program

echo "Compiling $SRC_FILE..."
g++ "$SRC_FILE" src/wrappers/memory_wrappers.cpp -o "$EXE_FILE"

echo "Running memory tracker (edit this command as needed)..."
# 2. Run with your memory tracker (edit this line for your setup)
# Example: ./memory_tracker ./$EXE_FILE > trace.json
./$EXE_FILE "$SRC_FILE" # <-- Pass source file name for set_source_code

# 3. Move the generated trace.json to the web directory
if [ -f trace.json ]; then
  mv trace.json web/trace.json
  echo "trace.json moved to web/"
else
  echo "Warning: trace.json not found. Make sure your memory tracker outputs it."
fi

# 4. Start the web server
cd web
echo "Starting Python HTTP server at http://localhost:8000/"
echo "Open your browser and go to http://localhost:8000/"
python3 -m http.server 8000 