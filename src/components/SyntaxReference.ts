export class SyntaxReference {
  private container: HTMLElement;
  private isOpen: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="syntax-ref-header" id="syntax-ref-toggle">
        <span>Supported C++ Syntax</span>
        <span class="syntax-ref-arrow">&#9660;</span>
      </div>
      <div class="syntax-ref-body" id="syntax-ref-body" style="display: none;">
        <div class="syntax-ref-section">
          <h4>Types</h4>
          <code>int, float, double, char, bool, void, const</code>
        </div>
        <div class="syntax-ref-section">
          <h4>Pointers &amp; References</h4>
          <code>int *p, &amp;ref, nullptr, malloc(), free(), new, delete</code>
        </div>
        <div class="syntax-ref-section">
          <h4>Arrays</h4>
          <code>int arr[5], arr[i], std::array&lt;int, 5&gt;</code>
        </div>
        <div class="syntax-ref-section">
          <h4>Control Flow</h4>
          <code>if/else, while, for, break, continue, return</code>
        </div>
        <div class="syntax-ref-section">
          <h4>Functions</h4>
          <code>int add(int a, int b) { return a + b; }</code>
        </div>
        <div class="syntax-ref-section">
          <h4>Classes (standalone, no inheritance)</h4>
          <code>class Name { public: int x; Name() {} ~Name() {} void method() {} };</code>
          <br><code>Name* obj = new Name(); obj-&gt;method(); delete obj;</code>
        </div>
        <div class="syntax-ref-section">
          <h4>STL Containers</h4>
          <code>std::vector&lt;T&gt;</code> — push_back, pop_back, at, size, empty, clear
          <br><code>std::string</code> — length, at, append, c_str, substr, find, +=
          <br><code>std::array&lt;T, N&gt;</code> — at, size, fill
        </div>
        <div class="syntax-ref-section">
          <h4>Operators</h4>
          <code>+ - * / % == != &lt; &gt; &lt;= &gt;= &amp;&amp; || ! ++ -- += -= *= /=</code>
        </div>
        <div class="syntax-ref-section not-supported">
          <h4>Not Supported</h4>
          <span>inheritance, virtual, templates, exceptions, multiple files, full STL</span>
        </div>
      </div>
    `;

    // Toggle behavior
    const toggle = this.container.querySelector('#syntax-ref-toggle');
    const body = this.container.querySelector('#syntax-ref-body') as HTMLElement;
    const arrow = this.container.querySelector('.syntax-ref-arrow') as HTMLElement;

    toggle?.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
      body.style.display = this.isOpen ? 'block' : 'none';
      arrow.innerHTML = this.isOpen ? '&#9650;' : '&#9660;';
    });
  }
}
