#include <iostream>

void leak_memory() {
    int* arr = new int[5];
    for (int i = 0; i < 5; i++) {
        arr[i] = i * 2;
    }
    std::cout << "Allocated array, but not freeing it!" << std::endl;
    // Memory leak: no delete[] arr
}

int main() {
    leak_memory();
    return 0;
} 