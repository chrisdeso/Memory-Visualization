// function_tracker.h
//
// Tracks function calls to visualize stack frame creation `new` and destruction `delete`
// Uses compiler to monitor dunction entry and exit
// 	- finstrument-functions at compile time with GCC adds calls to hook functions, which is our `function_tracker.h` (this file
//
// Functions:
// 	- __cyg_profile_func_enter: called on function entry
// 	- __cyg_profile_func_exit: called on function exit
// 		- ref: https://balau82.wordpress.com/2010/10/06/trace-and-profile-function-calls-with-gcc/
//
#ifndef FUNCTION_TRACKER_H
#define FUNCTION_TRACKER_H
