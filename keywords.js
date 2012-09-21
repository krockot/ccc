(function () {
    var _map = function (a, f) {
        var o = [], i;
        for (i = 0; i < a.length; i += 1) {
            o[i] = f(a[i]);
        }
        return o;
    };
    
    var env = Ccc.NullEnvironment;
    var D = function (n, ts) { env.defineSyntax(n, ts); };
    var TS = function (lits, rules) { return new Ccc.TransformerSpec(lits, rules); };
    var L = function (a) { return Ccc.Pair.fromArray([].slice.call(arguments)); };
    var S = function (id) { return new Ccc.Symbol(id); };
    var P = function (car, cdr) { return new Ccc.Pair(car, cdr); };
    var R = function (pat, tr) { return new Ccc.SyntaxRule(new Ccc.Pattern(pat), tr); };
    var E = function (pat) { return new Ccc.Ellipsis(pat); };
    
    D("quote", TS([], [
        R(L(S("datum")), function (captures) { return new Ccc.Quote(captures["datum"]); })]));
        
    D("define-syntax", TS([], [
        R(L(S("keyword"), S("transformer-spec")),
            function (captures, environment) {
                var sym = captures["keyword"];
                env.defineSyntax(sym.id, captures["transformer-spec"].transform(environment));
                return new Ccc.Pair(new Ccc.Symbol("quote"), new Ccc.Pair(sym, Ccc.Nil));
            })]));
            
    D("let-syntax", TS([], [
        R(L(L(E(L(S("keyword"), S("transformer-spec")))), E(S("body"))),
            function (captures, environment) {
                var newEnv = environment.clone(),
                    syms = _map(captures["keyword"].datum.toArray(), function (id) { return id; }),
                    transformers = _map(captures["transformer-spec"].datum.toArray(), function (t) { return t.transform(environment); }),
                    i, j, body, replacements = {}, keywords = {}, freeRefs, outerSymbols = [], argsList, argsVals, newSyntax, replacement;
                 for (i = 0; i < syms.length; i += 1) {
                    keywords[syms[i].id] = {};
                 }
                 for (i = 0; i < syms.length; i += 1) {
                    freeRefs = transformers[i].getFreeReferences(newEnv);
                    for (j = 0; j < freeRefs.length; j += 1) {
                        if (!keywords.hasOwnProperty(freeRefs[j]) && !newEnv.tryGet(freeRefs[j]) && newEnv.tryGetSyntax(freeRefs[j])) {
                            newSyntax = new Ccc.Symbol(newEnv.gensym(), freeRefs[j]);
                            newEnv.defineSyntax(newSyntax.id, newEnv.getSyntax(freeRefs[j]));
                            replacement = {};
                            replacement[freeRefs[j]] = newSyntax;
                            transformers[i].replaceSymbols(replacement);
                        }
                        else if (!replacements.hasOwnProperty(freeRefs[j])) {
                            replacements[freeRefs[j]] = new Ccc.Symbol(newEnv.gensym(), freeRefs[j]);
                            newEnv.reserve(replacements[freeRefs[j]].id);
                        }
                    }
                    transformers[i].replaceSymbols(replacements);
                    newEnv.defineSyntax(syms[i].id, transformers[i]);
                }
                for (i in replacements) {
                    if (replacements.hasOwnProperty(i)) {
                        outerSymbols.push(i);
                    }
                }
                argsList = Ccc.Pair.fromArray(_map(outerSymbols, function (s) { return replacements[s]; }));
                argsVals = Ccc.Pair.fromArray(_map(outerSymbols, function (s) { return new Ccc.Symbol(s); }));
                body = _map(captures["body"].datum.toArray(), function (b) { return b.transform(newEnv); });
                return (new Ccc.Pair(new Ccc.Pair(new Ccc.Symbol("lambda"), new Ccc.Pair(argsList, Ccc.Pair.fromArray(body))), argsVals)).transform(newEnv);
            })]));

    D("letrec-syntax", TS([], [
        R(L(L(E(L(S("keyword"), S("transformer-spec")))), E(S("body"))),
            function (captures, environment) {
                var newEnv = environment.clone(),
                    syms = _map(captures["keyword"].datum.toArray(), function (id) { return id; }),
                    transformers = _map(captures["transformer-spec"].datum.toArray(), function (t) { return t.transform(environment); }),
                    i, j, body, keywords = {}, replacements = {}, freeRefs, outerSymbols = [], argsList, argsVals, newSyntax, replacement;
                for (i = 0; i < syms.length; i += 1) {
                    keywords[syms[i].id] = {};
                }
                for (i = 0; i < syms.length; i += 1) {
                    freeRefs = transformers[i].getFreeReferences(newEnv);
                    for (j = 0; j < freeRefs.length; j += 1) {
                        if (!keywords.hasOwnProperty(freeRefs[j]) && !newEnv.tryGet(freeRefs[j]) && newEnv.tryGetSyntax(freeRefs[j])) {
                            newSyntax = new Ccc.Symbol(newEnv.gensym(), freeRefs[j]);
                            newSyntax.name = newSyntax.id;
                            newEnv.defineSyntax(newSyntax.id, newEnv.getSyntax(freeRefs[j]));
                            replacement = {};
                            replacement[freeRefs[j]] = newSyntax;
                            transformers[i].replaceSymbols(replacement);
                        }
                        else if (!replacements.hasOwnProperty(freeRefs[j]) && !keywords.hasOwnProperty(freeRefs[j])) {
                            replacements[freeRefs[j]] = new Ccc.Symbol(newEnv.gensym(), freeRefs[j]);
                            newEnv.reserve(replacements[freeRefs[j]].id);
                        }
                    }
                    transformers[i].replaceSymbols(replacements);
                    newEnv.defineSyntax(syms[i].id, transformers[i]);
                }
                for (i in replacements) {
                    if (replacements.hasOwnProperty(i)) {
                        outerSymbols.push(i);
                    }
                }
                argsList = Ccc.Pair.fromArray(_map(outerSymbols, function (s) { return replacements[s]; }));
                argsVals = Ccc.Pair.fromArray(_map(outerSymbols, function (s) { return new Ccc.Symbol(s); }));
                body = _map(captures["body"].datum.toArray(), function (b) { return b.transform(newEnv); });
                return (new Ccc.Pair(new Ccc.Pair(new Ccc.Symbol("lambda"), new Ccc.Pair(argsList, Ccc.Pair.fromArray(body))), argsVals)).transform(environment);
            })]));
    
    D("syntax-rules", TS([S("...")], [
        R(L(L(E(S("identifiers"))), E(L(S("pattern"), S("template")))),
            function (captures, environment) {
                var ids = _map(captures["identifiers"].datum.toArray(), function (id) { return id; });
                    patterns = _map(captures["pattern"].datum.toArray(), function (p) { return Ccc.Pattern.fromObject(p.cdr); }),
                    templates = _map(captures["template"].datum.toArray(), function (t) { return Ccc.Template.fromObject(t); }),
                    rules = [], i;
                for (i = 0; i < patterns.length; i += 1) {
                    rules[i] = new Ccc.SyntaxRule(patterns[i], templates[i]);
                }
                return new Ccc.TransformerSpec(ids, rules);
            })]));
            
    D("define", TS([], [
        R(L(L(S("v"), E(S("formals"))), E(S("body"))),
            function (captures, environment) {
                var args = _map(captures["formals"].datum.toArray(), function (a) { return a; });
                var body = _map(captures["body"].datum.toArray(), function (b) { return b.transform(environment); });
                return new Ccc.Pair(S("define"), new Ccc.Pair(captures["v"], new Ccc.Pair(new Ccc.Pair(S("lambda"), new Ccc.Pair(Ccc.Pair.fromArray(args), Ccc.Pair.fromArray(body))), Ccc.Nil)));
            }),
        R(L(P(S("v"), S("formal")), E(S("body"))),
            function (captures, environment) {
                var arg = captures["formal"];
                var body = _map(captures["body"].datum.toArray(), function (b) { return b.transform(environment); });
                return new Ccc.Pair(S("define"), new Ccc.Pair(captures["v"], new Ccc.Pair(new Ccc.Pair(S("lambda"), new Ccc.Pair(arg, Ccc.Pair.fromArray(body))), Ccc.Nil)));
            }),
        R(L(S("v"), S("e")),
            function (captures, environment) {
                return new Ccc.Define(captures["v"], captures["e"].transform(environment));
            }),
            ]));

    D("internal-lambda", TS([], [
        R(L(S("formals"), E(S("body"))),
            function (captures, environment) {
                var formals = captures["formals"], o = formals, args = [], rest = Ccc.Nil;
                environment = environment.clone();
                if (o instanceof Ccc.Symbol) {
                    environment.reserve(o.id);
                    rest = o;
                }
                else if (o instanceof Ccc.Pair) {
                    do {
                        if (o.car instanceof Ccc.Symbol) {
                            args.push(o.car);
                            environment.reserve(o.car.id);
                        }
                        else {
                            throw new Error("Invalid formals spec in lambda: " + formals);
                        }
                        o = o.cdr;
                    } while (o instanceof Ccc.Pair);
                    if (o instanceof Ccc.Symbol) {
                        rest = o;
                        environment.reserve(o);
                    }
                    else if (o !== Ccc.Nil) {
                        throw new Error("Invalid formals spec in lambda: " + formals);
                    }
                }
                else if (o !== Ccc.Nil) {
                    throw new Error("Invalid formals spec in lambda: " + formals);
                }
                var body = _map(captures["body"].datum.toArray(), function (b) { return b.transform(environment); });
                return (new Ccc.Lambda(args, rest, Ccc.Pair.fromArray(body))).transform(environment);
            })]));
            
    D("if", TS([], [
        R(L(S("test"), S("consequent"), S("alternate")),
            function (captures, environment) {
                var test = captures["test"].transform(environment);
                var consequent = captures["consequent"].transform(environment);
                var alternate = captures["alternate"].transform(environment);
                return new Ccc.If(test, consequent, alternate);
            }),
        R(L(S("test"), S("consequent")),
            function (captures, environment) {
                var test = captures["test"].transform(environment);
                var consequent = captures["consequent"].transform(environment);
                return new Ccc.If(test, consequent, Ccc.Unspecified);
            })]));
            
    D("set!", TS([], [
        R(L(S("symbol"), S("expr")),
            function (captures, environment) {
                return new Ccc.Assignment(captures["symbol"], captures["expr"].transform(environment));
            })]));
            
    // Load builtin keywords.  This string is just a flattened keywords.scm
    var builtinKeywords = "(define-syntax begin (syntax-rules () ((_ expr ...) ((lambda () expr ...))))) (define-syntax lambda (syntax-rules (define) ((_ \"with-defs\" formals defs (define v e) body ...) (lambda \"with-defs\" formals (defs . (v e)) body ...)) ((_ \"with-defs\" formals defs (define (v . a) e ...) body ...) (lambda \"with-defs\" formals (defs . (v (lambda a e ...))) body ...)) ((_ \"with-defs\" formals ((v e) ...) body ...) (lambda formals (letrec ((v e) ...) body ...))) ((_ formals body ...) (internal-lambda formals body ...)))) (define-syntax do (syntax-rules () ((_ ((var init . step) ...) end-clause . commands) (let loop ((var init) ...) (cond end-clause (else (begin #f . commands) (loop (begin var . step) ...))))))) (define-syntax letrec (syntax-rules () ((_ ((var init) ...) . body) (let ((var 'undefined) ...) (let ((var (let ((temp init)) (lambda () (set! var temp)))) ... (bod (lambda () . body))) (var) ... (bod)))))) (define-syntax let (syntax-rules () ((let ((name val) ...) body1 body2 ...) ((lambda (name ...) body1 body2 ...) val ...)) ((let tag ((name val) ...) body1 body2 ...) ((letrec ((tag (lambda (name ...) body1 body2 ...))) tag) val ...)))) (define-syntax let* (syntax-rules () ((let* () body1 body2 ...) (let () body1 body2 ...)) ((let* ((name1 val1) (name2 val2) ...) body1 body2 ...) (let ((name1 val1)) (let* ((name2 val2) ...) body1 body2 ...))))) (define-syntax case (syntax-rules (else) ((_ (x . y) . clauses) (let ((key (x . y))) (case key . clauses))) ((_ key (else . exps)) (begin #f . exps)) ((_ key (atoms . exps) . clauses) (if (memv key 'atoms) (begin . exps) (case key . clauses))) ((_ key) #!unspecific))) (define-syntax cond (syntax-rules (else =>) ((_) #f) ((_ (else . exps)) (begin #f . exps)) ((_ (x) . rest) (or x (cond . rest))) ((_ (x => proc) . rest) (let ((tmp x)) (cond (tmp (proc tmp)) . rest))) ((_ (x . exps) . rest) (if x (begin . exps) (cond . rest))))) (define-syntax and (syntax-rules () ((_) #t) ((_ test) test) ((_ test . tests) (if test (and . tests) #f)))) (define-syntax or (syntax-rules () ((_) #f) ((_ test) test) ((_ test . tests) (let ((x test)) (if x x (or . tests)))))) (define-syntax quasiquote (syntax-rules (unquote unquote-splicing quasiquote) (`,x x) (`(,@x . y) (append x `y)) ((_ `x . d) (cons 'quasiquote (quasiquote (x) d))) ((_ ,x d) (cons 'unquote (quasiquote (x) . d))) ((_ ,@x d) (cons 'unquote-splicing (quasiquote (x) . d))) ((_ (x . y) . d) (cons (quasiquote x . d) (quasiquote y . d))) ((_ #(x ...) . d) (list->vector (quasiquote (x ...) . d))) ((_ x . d) 'x))) (define-syntax force (syntax-rules () ((_ promise) (promise)))) (define-syntax delay (syntax-rules () ((_ expr) ((lambda (proc) (let ((result-ready? #f) (result #f)) (lambda () (if result-ready? result (let ((x (proc))) (if result-ready? result (begin (set! result-ready? #t) (set! result x) result))))))) (lambda () expr))))) ";
    var keywords = Ccc.Parser.parse(builtinKeywords);
    keywords.transform(env);
}());
