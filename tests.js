var CccTests = (function () {
    var compiler = new Ccc.Compiler();

    var run = function (vm, code) {
        var program, output;
        program = compiler.compile(code);
        output = vm.execute(program);
        return output;
    };
    
    var T = function (code, result) {
        code = code.replace(/\s*?\n\s*/mg, " ");
        return {
            toString: function () { return "{" + code + "} === {" + result + "}" },
            code: code,
            test: function (vm) {
                var output;
                try {
                    output = run(vm, code);
                    if (output.toString() !== result) {
                        throw new Error("{" + code + "} output {" + output + "} instead of {" + result + "}");
                    }
                }
                catch (e) {
                    throw new Error("{" + code + "} failed with error: " + e.message);
                }
                return true;
            }
        };
    };
    
    var E = function (code) {
        code = code.replace(/\s*?\n\s*/mg, " ");
        return {
            toString: function () { return "#ERROR{" + code + "}" },
            code: code,
            test: function (vm) {
                try {
                    run(vm, code);
                }
                catch (e) {
                    return true;
                }
                throw new Error("{" + code + "} failed to throw an error");
            }
        };
    };
    
    var G = function (name, tests) {
        return {
            name: name,
            tests: tests,
        };
    };
    
    var tests = [
        G("primitive-expressions", [
            T("(define x 28) x", "28"),
            T("(quote a)", "a"),
            T("(quote #(a b c))", "#(a b c)"),
            T("(quote (+ 1 2))", "(+ 1 2)"),
            T("'a", "a"),
            T("#(a b c)", "#(a b c)"),
            T("'()", "()"),
            T("'(quote a)", "(quote a)"),
            T("''a", "(quote a)"),
            T("'\"abc\"", "\"abc\""),
            T("\"abc\"", "\"abc\""),
            T("'145932", "145932"),
            T("145932", "145932"),
            T("'#t", "#t"),
            T("#t", "#t"),
            T("(+ 3 4)", "7"),
            T("((if #f + *) 3 4)", "12"),
            T("((lambda (x) (+ x x)) 4)", "8"),
            T("(define reverse-subtract \n\
                (lambda (x y) (- y x))) \n\
                (reverse-subtract 7 10)", "3"),
            T("(define add4 (let ((x 4)) (lambda (y) (+ x y)))) (add4 6)", "10"),
            T("((lambda x x) 3 4 5 6)", "(3 4 5 6)"),
            T("((lambda (x y . z) z) 3 4 5 6)", "(5 6)"),
            T("(if (> 3 2) 'yes 'no)", "yes"),
            T("(if (> 2 3) 'yes 'no)", "no"),
            T("(if (> 3 2) (- 3 2) (+ 3 2))", "1"),
            T("(define x 2) (+ x 1)", "3"),
            T("(define x 2) (set! x 4) (+ x 1)", "5"),
        ]),
        G("derived-expressions", [
            T("(cond ((> 3 2) 'greater) ((< 3 2) 'less))", "greater"),
            T("(cond ((> 3 3) 'greater) ((< 3 3) 'less) (else 'equal))", "equal"),
            T("(cond ((assv 'b '((a 1) (b 2))) => cadr) (else #f))", "2"),
            T("(case (* 2 3) ((2 3 5 7) 'prime) ((1 4 6 8 9) 'composite))", "composite"),
            T("(case (car '(c d)) ((a) 'a) ((b) 'b))", "#!unspecific"),
            T("(case (car '(c d)) ((a e i o u) 'vowel) ((w y) 'semivowel) (else 'consonant))", "consonant"),
            T("(and (= 2 2) (> 2 1))", "#t"),
            T("(and (= 2 2) (< 2 1))", "#f"),
            T("(and 1 2 'c '(f g))", "(f g)"),
            T("(and)", "#t"),
            T("(or (= 2 2) (> 2 1))", "#t"),
            T("(or (= 2 2) (< 2 1))", "#t"),
            T("(or #f #f #f)", "#f"),
            T("(or)", "#f"),
            T("(or (memq 'b '(a b c)) (/ 3 0))", "(b c)"),
        ]),
        G("binding-constructs", [
            T("(let ((x 2) (y 3)) (* x y))", "6"),
            T("(let ((x 2) (y 3)) (let ((x 7) (z (+ x y))) (* z x)))", "35"),
            T("(let ((x 2) (y 3)) (let* ((x 7) (z (+ x y))) (* z x)))", "70"),
            T("(letrec\
                ((even? (lambda (n) (if (zero? n) #t (odd? (- n 1))))) \n\
                (odd? (lambda (n) (if (zero? n) #f (even? (- n 1)))))) \n\
                (even? 88))", "#t"),
            T("(define x 0) (begin (set! x 5) (+ x 1))", "6"),
            T("(do ((vec (make-vector 5)) (i 0 (+ i 1))) ((= i 5) vec) (vector-set! vec i i))", "#(0 1 2 3 4)"),
            T("(let ((x '(1 3 5 7 9))) (do ((x x (cdr x)) (sum 0 (+ sum (car x)))) ((null? x) sum)))", "25"),
            T("(let loop ((numbers '(3 -2 1 6 -5)) (nonneg '()) (neg '())) \n\
                (cond ((null? numbers) (list nonneg neg)) \n\
                      ((>= (car numbers) 0) (loop (cdr numbers) (cons (car numbers) nonneg) neg)) \n\
                      ((< (car numbers) 0) (loop (cdr numbers) nonneg (cons (car numbers) neg)))))",
              "((6 1 3) (-5 -2))"),
        ]),
        G("quasiquotation", [
            T("`(list ,(+ 1 2) 4)", "(list 3 4)"),
            T("(let ((name 'a)) `(list ,name ',name))", "(list a (quote a))"),
            T("`(a ,(+ 1 2) ,@(map abs '(4 -5 6)) b)", "(a 3 4 5 6 b)"),
            T("`((foo ,(- 10 3)) ,@(cdr '(c)) . ,(car '(cons)))", "((foo 7) . cons)"),
            T("`#(10 5 ,(sqrt 4) ,@(map sqrt '(16 9)) 8)", "#(10 5 2.0 4.0 3.0 8)"),
            T("`(a `(b ,(+ 1 2) ,(foo ,(+ 1 3) d) e) f)", "(a (quasiquote (b (unquote (+ 1 2)) (unquote (foo 4 d)) e)) f)"),
            T("(let ((name1 'x) (name2 'y)) `(a `(b ,,name1 ,',name2 d) e))", "(a (quasiquote (b (unquote x) (unquote (quote y)) d)) e)"),
            T("(quasiquote (list (unquote (+ 1 2)) 4))", "(list 3 4)"),
            T("'(quasiquote (list (unquote (+ 1 2)) 4))", "(quasiquote (list (unquote (+ 1 2)) 4))"),
        ]),
        G("equivalence-predicates", [
            T("(eqv? 'a 'a)", "#t"),
            T("(eqv? 'a 'b)", "#f"),
            T("(eqv? 2 2)", "#t"),
            T("(eqv? () ())", "#t"),
            T("(eqv? 100000000 100000000)", "#t"),
            T("(eqv? (cons 1 2) (cons 1 2))", "#f"),
            T("(eqv? (lambda () 1) (lambda () 2))", "#f"),
            T("(eqv? #f 'nil)", "#f"),
            T("(let ((p (lambda (x) x))) (eqv? p p))", "#t"),
            T("(eqv? \"\" \"\")", "#t"),
            T("(eqv? #() #())", "#f"),
            T("(eqv? (lambda (x) x) (lambda (x) x))", "#f"),
            T("(define gen-counter (lambda () (let ((n 0)) (lambda () (set! n (+ n 1)) n)))) \n\
               (let ((g (gen-counter))) (eqv? g g))", "#t"),
            T("(define gen-counter (lambda () (let ((n 0)) (lambda () (set! n (+ n 1)) n)))) \n\
               (eqv? (gen-counter) (gen-counter))", "#f"),
            T("(eqv? '(a) '(a))", "#f"),
            T('(eqv? "a" "a")', "#t"),
            T("(eqv? '(b) (cdr '(a b)))", "#f"),
            T("(let ((x '(a))) (eqv? x x))", "#t"),
            T("(eq? 'a 'a)", "#t"),
            T("(eq? (list 'a) (list 'a))", "#f"),
            T("(eq? () ())", "#t"),
            T("(eq? car car)", "#t"),
            T("(let ((x '(a))) (eq? x x))", "#t"),
            T("(let ((x '#())) (eq? x x))", "#t"),
            T("(let ((p (lambda (x) x))) (eq? p p))", "#t"),
            T("(equal? 'a 'a)", "#t"),
            T("(equal? '(a) '(a))", "#t"),
            T("(equal? '(a (b) c) '(a (b) c))", "#t"),
            T('(equal? "abc" "abc")', "#t"),
            T("(equal? 2 2)", "#t"),
            T("(equal? (make-vector 5 'a) (make-vector 5 'a))", "#t"),
        ]),
        G("numbers", [
            T("(complex? 3+4i)", "#t"),
            T("(complex? 3)", "#t"),
            T("(real? 3)", "#t"),
            T("(real? -2.5+0.0i)", "#t"),
            T("(real? #e1e10)", "#t"),
            T("(rational? 6/10)", "#t"),
            T("(rational? 6/3)", "#t"),
            T("(integer? 3+0i)", "#t"),
            T("(integer? 3.0)", "#t"),
            T("(integer? 8/4)", "#t"),
            T("(max 3 4)", "4"),
            T("(max 3.9 4)", "4.0"),
            T("(+ 3 4)", "7"),
            T("(+ 3)", "3"),
            T("(+)", "0"),
            T("(* 4)", "4"),
            T("(*)", "1"),
            T("(- 3 4)", "-1"),
            T("(- 3 4 5)", "-6"),
            T("(- 3)", "-3"),
            T("(/ 3 4 5)", "3/20"),
            T("(/ 3)", "1/3"),
            T("(abs -7)", "7"),
            T("(modulo 13 4)", "1"),
            T("(remainder 13 4)", "1"),
            T("(modulo -13 4)", "3"),
            T("(remainder -13 4)", "-1"),
            T("(modulo 13 -4)", "-3"),
            T("(remainder 13 -4)", "1"),
            T("(modulo -13 -4)", "-1"),
            T("(remainder -13 -4)", "-1"),
            T("(remainder -13 -4.0)", "-1.0"),
            T("(gcd 32 -36)", "4"),
            T("(gcd)", "0"),
            T("(lcm 32 -36)", "288"),
            T("(lcm 32.0 -36)", "288.0"),
            T("(lcm)", "1"),
            T("(numerator (/ 6 4))", "3"),
            T("(denominator (/ 6 4))", "2"),
            T("(denominator (exact->inexact (/ 6 4)))", "2.0"),
            T("(floor -4.3)", "-5.0"),
            T("(ceiling -4.3)", "-4.0"),
            T("(truncate -4.3)", "-4.0"),
            T("(round -4.3)", "-4.0"),
            T("(floor 3.5)", "3.0"),
            T("(ceiling 3.5)", "4.0"),
            T("(truncate 3.5)", "3.0"),
            T("(round 3.5)", "4.0"),
            T("(round 7/2)", "4"),
            T("(round 7)", "7"),
            T('(string->number "100")', "100"),
            T('(string->number "100" 16)', "256"),
            T('(string->number "1e2")', "100.0"),
            T('(string->number "15##")', "1500.0"),
        ]),
        G("booleans", [
            T("(not #t)", "#f"),
            T("(not 3)", "#f"),
            T("(not (list 3))", "#f"),
            T("(not #f)", "#t"),
            T("(not ())", "#f"),
            T("(not (list))", "#f"),
            T("(not 'nil)", "#f"),
            T("(boolean? #f)", "#t"),
            T("(boolean? 0)", "#f"),
            T("(boolean? ())", "#f"),
        ]),
        G("pairs-and-lists", [
            T("(define x (list 'a 'b 'c)) (define y x) y", "(a b c)"),
            T("(define x (list 'a 'b 'c)) (define y x) (list? y)", "#t"),
            T("(define x (list 'a 'b 'c)) (define y x) (set-cdr! x 4) x", "(a . 4)"),
            T("(define x (list 'a 'b 'c)) (define y x) (set-cdr! x 4) (eqv? x y)", "#t"),
            T("(define x (list 'a 'b 'c)) (define y x) (set-cdr! x 4) y", "(a . 4)"),
            T("(define x (list 'a 'b 'c)) (define y x) (set-cdr! x 4) (list? y)", "#f"),
            T("(define x (list 'a 'b 'c)) (define y x) (set-cdr! x 4) (set-cdr! x x) (list? x)", "#f"),
            T("(pair? '(a . b))", "#t"),
            T("(pair? '(a b c))", "#t"),
            T("(pair? '())", "#f"),
            T("(pair? '#(a b))", "#f"),
            T("(cons 'a '())", "(a)"),
            T("(cons '(a) '(b c d))", "((a) b c d)"),
            T("(cons \"a\" '(b c))", '("a" b c)'),
            T("(cons 'a 3)", "(a . 3)"),
            T("(cons '(a b) 'c)", "((a b) . c)"),
            T("(car '(a b c))", "a"),
            T("(car '((a) b c d))", "(a)"),
            T("(car '(1 . 2))", "1"),
            E("(car '())"),
            T("(cdr '((a) b c d))", "(b c d)"),
            T("(cdr '(1 . 2))", "2"),
            E("(cdr ())"),
            T("(define (f) '(a b)) (set-car! (f) 'c) (f)", "(c b)"),
            T("(caddr '(1 2 3))", "3"),
            T("(null? ())", "#t"),
            T("(list? '(a b c))", "#t"),
            T("(list? ())", "#t"),
            T("(list? '(a . b))", "#f"),
            T("(let ((x (list 'a))) (set-cdr! x x) (list? x))", "#f"),
            T("(list 'a (+ 3 4) 'c)", "(a 7 c)"),
            T("(list)", "()"),
            T("(length '(a b c))", "3"),
            T("(length '(a (b) (c d e)))", "3"),
            T("(length '())", "0"),
            T("(append '(x) '(y))", "(x y)"),
            T("(append '(a) '(b c d))", "(a b c d)"),
            T("(append '(a (b)) '((c)))", "(a (b) (c))"),
            T("(append '(a b) '(c . d))", "(a b c . d)"),
            T("(append () 'a)", "a"),
            T("(reverse '(a b c))", "(c b a)"),
            T("(reverse '(a (b c) d (e (f))))", "((e (f)) d (b c) a)"),
            T("(list-tail '(a b c d) 2)", "(c d)"),
            T("(list-ref '(a b c d) 2)", "c"),
            T("(list-ref '(a b c d) (inexact->exact (round 1.8)))", "c"),
            T("(memq 'a '(a b c))", "(a b c)"),
            T("(memq 'b '(a b c))", "(b c)"),
            T("(memq 'a '(b c d))", "#f"),
            T("(memq (list 'a) '(b (a) c))", "#f"),
            T("(member (list 'a) '(b (a) c))", "((a) c)"),
            T("(memv 101 '(100 101 102))", "(101 102)"),
            T("(define e '((a 1) (b 2) (c 3))) (assq 'a e)", "(a 1)"),
            T("(define e '((a 1) (b 2) (c 3))) (assq 'b e)", "(b 2)"),
            T("(define e '((a 1) (b 2) (c 3))) (assq 'd e)", "#f"),
            T("(assq (list 'a) '(((a)) ((b)) ((c))))", "#f"),
            T("(assoc (list 'a) '(((a)) ((b)) ((c))))", "((a))"),
            T("(assv 5 '((2 3) (5 7) (11 13)))", "(5 7)"),
        ]),
        G("symbols", [
            T("(symbol? 'foo)", "#t"),
            T("(symbol? (car '(a b)))", "#t"),
            T("(symbol? \"bar\")", "#f"),
            T("(symbol? 'nil)", "#t"),
            T("(symbol? ())", "#f"),
            T("(symbol? #f)", "#f"),
            T("(symbol->string 'flying-fish)", '"flying-fish"'),
            T("(symbol->string 'Martin)", '"Martin"'),
            T("(symbol->string (string->symbol \"Malvina\"))", '"Malvina"'),
            T("(eq? 'mISSISSIppi 'mississippi)", "#f"),
            T("(string->symbol \"mISSISSIppi\")", "mISSISSIppi"),
            T("(eq? 'bitBlt (string->symbol \"bitBlt\"))", "#t"),
            T("(eq? 'JollyWog (string->symbol (symbol->string 'JollyWog)))", "#t"),
            T('(string=? "K. Harper, M.D." (symbol->string (string->symbol "K. Harper, M.D.")))', "#t"),
        ]),
        G("strings", [
            T("(define (f) \"***\") (string-set! (f) 1 #\\?) (f)", "\"*?*\""),
            T("(string-append \"foo\" \"bar\")", "\"foobar\""),
            T("(substring \"foobar\" 1 5)", "\"ooba\""),
            T("(string->list \"foobar\")", "(#\\f #\\o #\\o #\\b #\\a #\\r)"),
            T("(list->string '(#\\f #\\o #\\o))", "\"foo\""),
        ]),
        G("vectors", [
            T("(vector? #())", "#t"),
            T("(let ((v (make-vector 3 5))) (equal? v #(5 5 5)))", "#t"),
            T("(vector 'a 'b 'c)", "#(a b c)"),
            T("(vector-ref #(1 1 2 3 5 8 13 21) 5)", "8"),
            T("(vector-ref #(1 1 2 3 5 8 13 21) (let ((i (round (* 2 (acos -1))))) (if (inexact? i) (inexact->exact i) i)))", "13"),
            T("(let ((vec (vector 0 '(2 2 2 2) \"Anna\"))) (vector-set! vec 1 '(\"Sue\" \"Sue\")) vec)", '#(0 ("Sue" "Sue") "Anna")'),
            T("(vector->list '#(dah dah didah))", "(dah dah didah)"),
            T("(list->vector '(dididit dah))", "#(dididit dah)"),
            T("(let ((v (make-vector 4))) (vector-fill! v 1) v)", "#(1 1 1 1)"),
        ]),
        G("control-features", [
            T("(procedure? car)", "#t"),
            T("(procedure? 'car)", "#f"),
            T("(procedure? (lambda (x) (* x x)))", "#t"),
            T("(procedure? '(lambda (x) (* x x)))", "#f"),
            T("(call/cc procedure?)", "#t"),
            T("(apply + (list 3 4))", "7"),
            T("(define compose (lambda (f g) (lambda args (f (apply g args))))) \n\
               ((compose sqrt *) 12 75)", "30.0"),
            T("(map cadr '((a b) (d e) (g h)))", "(b e h)"),
            T("(map (lambda (n) (expt n n)) '(1 2 3 4 5))", "(1 4 27 256 3125)"),
            T("(map + '(1 2 3) '(4 5 6))", "(5 7 9)"),
            T("(let ((count 0)) (map (lambda (ig) (set! count (+ count 1)) count) '(a b)))", "(1 2)"),
            T("(let ((v (make-vector 5))) (for-each (lambda (i) (vector-set! v i (* i i))) '(0 1 2 3 4)) v)", "#(0 1 4 9 16)"),
            T("(force (delay (+ 1 2)))", "3"),
            T("(let ((p (delay (+ 1 2)))) (list (force p) (force p)))", "(3 3)"),
            T("(define a-stream \n\
                 (letrec ((next (lambda (n) (cons n (delay (next (+ n 1))))))) \n\
                   (next 0))) \n\
               (define head car) \n\
               (define tail \n\
                 (lambda (stream) (force (cdr stream)))) \n\
               (head (tail (tail a-stream)))", "2"),
            T("(define count 0)\n\
               (define p\n\
                (delay (begin (set! count (+ count 1)) \n\
                    (if (> count x) count (force p))))) \n\
               (define x 5) \n\
               (force p) \n\
               (set! x 10) \n\
               (force p)", "6"),
            T("(call/cc (lambda (exit) (for-each (lambda (x) (if (negative? x) (exit x))) '(54 0 37 -3 245 19)) #t))", "-3"),
            T("(define list-length \n\
                 (lambda (obj) \n\
                   (call/cc \n\
                     (lambda (return)\n\
                       (letrec ((r \n\
                         (lambda (obj) \n\
                           (cond ((null? obj) 0) \n\
                                 ((pair? obj) \n\
                                  (+ (r (cdr obj)) 1)) \n\
                                  (else (return #f)))))) \n\
                         (r obj)))))) \n\
                 (list (list-length '(1 2 3 4)) (list-length '(a b . c)))", "(4 #f)"),
            T("(call-with-values (lambda () (values 4 5)) (lambda (a b) b))", "5"),
            T("(call-with-values * -)", "-1"),
            T("(let ((path ()) (c #f)) \n\
                 (let ((add (lambda (s) (set! path (cons s path))))) \n\
                   (dynamic-wind \n\
                     (lambda () (add 'connect)) \n\
                     (lambda () \n\
                       (add (call/cc (lambda (c0) (set! c c0) 'talk1)))) \n\
                     (lambda () (add 'disconnect))) \n\
                 (if (< (length path) 4) (c 'talk2) (reverse path))))",
              "(connect talk1 disconnect connect talk2 disconnect)"),
        ]),
        G("eval", [
            T("(eval '(* 7 3) (scheme-report-environment 5))", "21"),
            T("(let ((f (eval '(lambda (f x) (f x x)) (null-environment 5)))) (f + 10))", "20"),
        ]),
        G("definitions", [
            T("(define add3 (lambda (x) (+ x 3))) (add3 3)", "6"),
            T("(define (add3 x) (+ x 3)) (add3 3)", "6"),
            T("(define (add3 . x) (apply + (cons 3 x))) (add3 1 2)", "6"),
            T("(let ((x 5)) (define foo (lambda (y) (bar x y))) (define bar (lambda (a b) (+ (* a b) a))) (foo (+ x 3)))", "45"),
        ]),
        G("macros", [
            T("(let-syntax ((when (syntax-rules () \
                     ((when test stmt1 stmt2 ...) \
                      (if test \
                          (begin stmt1 \
                                 stmt2 ...)))))) \
                (let ((if #t)) \
                    (when if (set! if 'now)) \
                        if))", "now"),
            T("(let ((x 'outer)) (let-syntax ((m (syntax-rules () ((m) x)))) (let ((x 'inner)) (m))))", "outer"),
            T("(let ((x 'outer)) (let-syntax ((m (syntax-rules () ((m a) (list x a))))) (let ((x 'inner)) (m x))))", "(outer inner)"),
            T("(let ((=> #f)) (cond (#t => 'ok)))", "ok"),
            T("(letrec-syntax \
                  ((my-or (syntax-rules () \
                            ((my-or) #f) \
                            ((my-or e) e) \
                            ((my-or e1 e2 ...) \
                             (let ((temp e1)) \
                               (if temp \
                                   temp \
                                   (my-or e2 ...))))))) \
                  (let ((x #f) \
                        (y 7) \
                        (temp 8 ) \
                        (let odd?) \
                        (if even?)) \
                    (my-or x (let temp) (if y) y)))", "7"),
        ]),
    ];
    
    var CccTests = {};
    
    CccTests.runAll = function () {
        var i, group, j, test, vm;
        try {
            for (i = 0; i < tests.length; i += 1) {
                group = tests[i];
                console.log("======================================");
                console.log("Running test group " + group.name);
                for (j = 0; j < group.tests.length; j += 1) {
                    vm = new Ccc.Vm();
                    test = group.tests[j];
                    test.test(vm);
                    console.log("Test " + test + " PASSED");
                }
            }
        }
        catch (e) {
            try {
                console.log("Compiled output of failed test:");
                vm = new Ccc.Vm({debug: true});
                test.test(vm);
            }
            catch (e) {
                throw new Error("Test FAILED: " + e.message);
            }
        }
        console.log("All tests PASSED!");
        return true;
    };
    
    return CccTests;
}());