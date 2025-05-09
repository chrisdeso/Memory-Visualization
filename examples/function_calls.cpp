#include <iostream>

void greet() {
    std::cout << "Hello from greet!" << std::endl;
}

void add(int a, int b) {
    int sum = a + b;
    std::cout << "Sum: " << sum << std::endl;
    greet();
}

int main() {
    add(2, 3);
    return 0;
} 