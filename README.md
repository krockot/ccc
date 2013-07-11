ccc
===

Compiler and runtime environment for Ccc, a new and wonderful Scheme variant.

Specific highlights include:

* Lightweight, Unicode-friendly parser

* Asynchronous program execution

* Tail call optimization

* Mostly-hygienic syntax macros

* Simple two-way foreign function and object interfaces

* Syntax extensions to R5

    - Case-sensitive symbols.
      
    - Parentheses () and brackets [] may be used interchangeably
      
    - Vectors are implicitly quoted
      
    - String literals support common escape sequences including
      \xNN and \uNNNN.
      
    - |-Quoted symbols (e.g., |this is a symbol literal|).
      
    - Character literals also support \uNNNN and \x escape sequences,
      as in #\xa9
      
    - S-expression comments

