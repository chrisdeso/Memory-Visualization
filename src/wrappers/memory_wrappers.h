// Memory Visualization CS3339 SP25 
// memory_wrappers.h
//
// Overrides default C++ memory operators (new, delete) to track heap allocation and deallocation
//
// General functionality:
// 	- operator new: Tracks memory allocation
// 	- operator delete: Tracaks memory deallocation
// 	- initMemoryTrack(): Starts tracking system
// 	- trackerToJson: Generates JSON output for visualization
//

#ifndef MEMORY_WRAPPERS_H
#define MEMORY_TRACKER_H


