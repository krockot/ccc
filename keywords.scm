#;"Clean source for the keyword implementations used by keywords.js"

(define-syntax begin
  (syntax-rules ()
    ((_ expr ...)
     ((lambda () expr ...)))))

(define-syntax lambda
  (syntax-rules (define)
    ((_ "with-defs" formals defs (define v e) body ...)
     (lambda "with-defs" formals (defs . (v e)) body ...))
    ((_ "with-defs" formals defs (define (v . a) e ...) body ...)
     (lambda "with-defs" formals (defs . (v (lambda a e ...))) body ...))
    ((_ "with-defs" formals ((v e) ...) body ...)
     (lambda formals
        (letrec ((v e) ...)
            body ...)))
    ((_ formals body ...)
     (internal-lambda formals body ...))))
     
(define-syntax do
  (syntax-rules ()
    ((_ ((var init . step) ...)
          end-clause
        . commands)
     (let loop ((var init) ...)
       (cond end-clause
             (else (begin #f . commands)
                   (loop (begin var . step) ...)))))))

(define-syntax letrec 
  (syntax-rules () 
    ((_ ((var init) ...) . body) 
     (let ((var 'undefined) ...) 
       (let ((var (let ((temp init)) (lambda () (set! var temp)))) 
             ... 
             (bod (lambda () . body))) 
         (var) ... (bod))))))

(define-syntax let
  (syntax-rules ()
    ((let ((name val) ...) body1 body2 ...)
     ((lambda (name ...) body1 body2 ...)
      val ...))
    ((let tag ((name val) ...) body1 body2 ...)
     ((letrec ((tag (lambda (name ...)
                      body1 body2 ...)))
        tag)
      val ...))))


(define-syntax let*
  (syntax-rules ()
    ((let* () body1 body2 ...)
     (let () body1 body2 ...))
    ((let* ((name1 val1) (name2 val2) ...)
       body1 body2 ...)
     (let ((name1 val1))
       (let* ((name2 val2) ...)
         body1 body2 ...)))))
         
(define-syntax case
  (syntax-rules (else)
    ((_ (x . y) . clauses)
     (let ((key (x . y)))
           (case key . clauses)))
    ((_ key (else . exps))
     (begin #f . exps))
    ((_ key (atoms . exps) . clauses)
     (if (memv key 'atoms) (begin . exps) (case key . clauses)))
    ((_ key) #!unspecific)))

(define-syntax cond
  (syntax-rules (else =>)
    ((_) #f)
    ((_ (else . exps)) (begin #f . exps))
    ((_ (x) . rest) (or x (cond . rest)))
    ((_ (x => proc) . rest)
     (let ((tmp x)) (cond (tmp (proc tmp)) . rest)))
    ((_ (x . exps) . rest)
     (if x (begin . exps) (cond . rest)))))
    
(define-syntax and
  (syntax-rules ()
    ((_) #t)
    ((_ test) test)
    ((_ test . tests) (if test (and . tests) #f))))

(define-syntax or
  (syntax-rules ()
    ((_) #f)
    ((_ test) test)
    ((_ test . tests) (let ((x test)) (if x x (or . tests))))))

(define-syntax quasiquote
  (syntax-rules (unquote unquote-splicing quasiquote)
    (`,x x)
    (`(,@x . y) (append x `y))
    ((_ `x . d) (cons 'quasiquote       (quasiquote (x)   d)))
    ((_ ,x   d) (cons 'unquote          (quasiquote (x) . d)))
    ((_ ,@x  d) (cons 'unquote-splicing (quasiquote (x) . d)))
    ((_ (x . y) . d)
     (cons (quasiquote x . d) (quasiquote y . d)))
    ((_ #(x ...) . d)
     (list->vector (quasiquote (x ...) . d)))
    ((_ x . d) 'x)))

(define-syntax force
  (syntax-rules ()
    ((_ promise)
     (promise))))
     
(define-syntax delay
  (syntax-rules ()
    ((_ expr)
     ((lambda (proc)
        (let ((result-ready? #f)
              (result #f))
          (lambda ()
            (if result-ready?
              result
              (let ((x (proc)))
                (if result-ready?
                  result
                  (begin (set! result-ready? #t)
                         (set! result x)
                         result))))))) (lambda () expr)))))
