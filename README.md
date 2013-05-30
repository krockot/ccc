ccc
===

A Scheme compiler and runtime environment for the browser.

Specific highlights include:

* Lightweight, Unicode-friendly parser

* Asynchronous program execution

* Tail call optimization

* Simple foreign function interface

* Syntax extensions

    - Case-sensitive symbols.
      
    - Parentheses () and brackets [] may be used interchangeably
      
    - Vectors are implicitly quoted
      
    - String literals support common escape sequences including
      \xNN and \uNNNN.
      
    - |-Quoted symbols (e.g., |this is a symbol literal|).
      
    - Character literals also support \uNNNN and \x escape sequences,
      as in #\xa9
      
    - S-expression comments
    
