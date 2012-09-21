ccc
===

A Scheme compiler and VM for the browser.

The current implementation aims for R5RS compliance while providing minor
syntax extensions for convenience as well as a simple API to bind
JavaScript functions to callable symbols at runtime.

While the compiler and virtual machine will operate just fine in any
JavaScript environment, a major focus of supporting library code will be to
facilitate the development of modern web applications which take advantage
of HTML5 technology.

Specific highlights include:

* Simplicity

    - The parser is lightweight and is only used to transform well-formed
      code into primitive symbol, value, list, and vector data.

    - Only the fundamental forms lambda, quote, if, define, set!,
      define-syntax, let-syntax, letrec-synrax, and syntax-rules are
      implemented internally.
      
    - Library forms let, let**, letrec, cond, case, and, or, begin, delay,
      do, quasiquote, unquote, and unquote-spliciing are implemented using
      hygienic language macros.

* Near-complete support for hygienic macros

    - All binding constructs reduce to lambdas, and lambda bindings may
      shadow syntactic literals throughout the extent of their scope.
      
    - An identifier reference emitted by a macro transformer retains its
      binding from the site of the transformer's specification.
      
    - Support is currently incomplete because template expansion can mask
      references to outer bindings at the site of macro use.  This is
      demonstrated by the lone broken test in the current test suite.

* Proper tail recursion
    
    - Tail calls compile to instruction sequences which execute in constant
      space.

* Near-complete standard library implementation, excluding file I/O routines
  and some marginally useful functions such as the numeric 'rationalize.

* Complete (albeit inefficient) support for all R5RS numeric syntax and
  the numeric type hierarchy.  All numeric values and operations are
  implemented internally over complex numbers, for better or worse; this
  will be optimized in the future.  Behavior regarding numerical exactness
  mimics MIT Scheme to a large extent.

* Several syntax extensions

    - Symbols are case-sensitive.  Standard library functions and syntactic
      keywords are bound to lowercase symbols by default.
      
    - Parentheses () and brackets [] can be used interchangeably, as long
      as they are properly balanced.  (foo) and [foo] are equivalent,
      as are ([foo]) and [(foo)].  (foo] is an invalid form.
      
    - Vectors are treated as self-evaluating data and need not be quoted.
      
    - String literals support common escape sequences \n, \r, \t, \v, and \f.
      Additionally, sequences \xNN and \uNNNN are supported where NN and
      NNNN represent 2- and 4-hexdigit Unicode character codes respectively.
      
    - Symbols may be quoted with surrounding vertical bars (|).  The following
      expressions each evaluate to #t:
      
        (eq? '|abc| 'abc)
        
        (eq? '|foo bar| [string->symbol "foo bar"])
        
        (equal? "foo\nbar" [symbol->string '|foo\nbar|])
        
      All escape sequences supported by the string literal syntax are
      supported within |-quotation.  Additionally, vertical bars appearing
      in quoted symbol names must be escaped using the \| sequence.
      
    - The reader delimits tokens at parentheses, brackets, comments, or
      characters classified as whitespace by Unicode 3.0.  Valid symbol
      characters include all those specified by R5RS, as well as all
      non-whitepsace characters in the range 0080-FFFF.
      
    - S-expression comments are supported.  When the reader encounters
      the token #; it discards the next complete datum.  e.g.:
      
        '(1 2 #;3) evaluates to '(1 2)
        
        '(1 2 #;[3 4 5] 6) evaluates to '(1 2 6)
        
        '(a b #; #; c d e) evaluates to '(a b e)
        
      In the latter example, the reader encounters the first #;, then
      the second #;.  At this point the second #; consumes the c datum,
      leaving d to be consumed by the first #;.
    
    - The special token #!unspecific is transformed to an internal
      object that represents any unspecified value, such that:
      
        (eq? #!unspecific [if #f #f])
        
      evaluates to #t.
