export interface Example {
  name: string;
  code: string;
}

export const EXAMPLES: Example[] = [
  {
    name: 'malloc / free',
    code: `#include <stdlib.h>

int main() {
    int *p = (int*)malloc(sizeof(int));
    *p = 42;
    int *q = (int*)malloc(sizeof(int));
    *q = 99;
    free(p);
    p = NULL;
    free(q);
    return 0;
}`,
  },
  {
    name: 'Memory leak',
    code: `#include <stdlib.h>

int main() {
    int *a = (int*)malloc(sizeof(int));
    *a = 10;
    int *b = (int*)malloc(sizeof(int));
    *b = 20;
    // Only free one — b leaks
    free(a);
    return 0;
}`,
  },
  {
    name: 'Dangling pointer',
    code: `#include <stdlib.h>

int main() {
    int *p = (int*)malloc(sizeof(int));
    *p = 7;
    free(p);
    // p is now dangling — writing through it is undefined behavior
    *p = 99;
    return 0;
}`,
  },
  {
    name: 'Recursion (factorial)',
    code: `int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int result = factorial(4);
    return 0;
}`,
  },
  {
    name: 'Linked list',
    code: `#include <stdlib.h>

struct Node {
    int value;
    struct Node *next;
};

int main() {
    struct Node *head = (struct Node*)malloc(sizeof(struct Node));
    head->value = 1;
    head->next = (struct Node*)malloc(sizeof(struct Node));
    head->next->value = 2;
    head->next->next = NULL;

    int a = head->value;
    int b = head->next->value;

    free(head->next);
    free(head);
    return 0;
}`,
  },
];
