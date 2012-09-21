(function () {
    var DB = function () { Ccc.NullEnvironment.defineBuiltin.apply(Ccc.NullEnvironment, arguments); };

    var assertType = function (o, type) {
        if (!(o instanceof Ccc[type])) {
            throw new TypeError("Object " + o + " is not a " + type.toLowerCase());
        }
    };
    
    var assertInteger = function (o) {
        assertType(o, 'Numeric');
        if (!o.isInteger()) {
            throw new TypeError("Object " + o + " is not an integer");
        }
    };
    
    var assertReal = function (o) {
        assertType(o, 'Numeric');
        if (o.imagNumer !== 0) {
            throw new TypeError("Object " + o + " is not a real number");
        }
    };
    
    var assertList = function (o) {
        if (!o.isNil()) {
            assertType(o, 'Pair');
            if (!o.isList()) {
                throw new TypeError("Object " + o + " is not a proper list");
            }
        }
    };
    
    var assertApplicable = function (o) {
        if (!o.isApplicable()) {
            throw new TypeError("Object " + o + " is not applicable");
        }
    };
    
    var makeBoolean = function (value) {
        return value ? Ccc.True : Ccc.False;
    };
    
    var typedComparator = function (type) {
        return function (fn) {
            return function () {
                var i, a, b;
                for (i = 1; i < arguments.length - 1; i += 1) {
                    a = arguments[i];
                    b = arguments[i + 1];
                    assertType(a, type);
                    assertType(b, type);
                    if (!fn(a, b)) {
                        return makeBoolean(false);
                    }
                }
                return makeBoolean(true);
            };
        };
    };
    
    ///
    /// Numeric operators
    /// 
    
    var numericComparator = typedComparator('Numeric');
    
    var numericFold = function (initial, fn) {
        if (typeof initial === 'function') {
            fn = initial;
            return function () {
                var i, a = arguments[1], b;
                assertType(a, 'Numeric');
                for (i = 2; i < arguments.length; i += 1) {
                    b = arguments[i];
                    assertType(b, 'Numeric');
                    a = fn(a, b);
                }
                return a;
            };
        }
        else {
            return function () {
                var i = 1, a = initial, b;
                if (arguments.length > 2) {
                    i = 2;
                    a = arguments[1];
                }
                for (; i < arguments.length; i += 1) {
                    b = arguments[i];
                    assertType(b, 'Numeric');
                    a = fn(a, b);
                }
                return a;
            };
        }
    };

    DB('eq?', 2, function (cont, a, b) {
        return makeBoolean(a.isEq(b));
    });
    
    DB('eqv?', 2, function (cont, a, b) {
        return makeBoolean(a.isEqv(b));
    });
    
    DB('equal?', 2, function (cont, a, b) {
        return makeBoolean(a.isEqual(b));
    });
    
    DB('+', numericFold(new Ccc.Numeric(0), function (a, b) { return a.add(b); }));
    DB('-', numericFold(new Ccc.Numeric(0), function (a, b) { return a.add(b.negative()); }));
    DB('*', numericFold(new Ccc.Numeric(1), function (a, b) { return a.mul(b); }));
    DB('/', numericFold(new Ccc.Numeric(1), function (a, b) { return a.mul(b.inverse()); }));
    
    DB('number?', 1, function (cont, a) {
        return makeBoolean(a instanceof Ccc.Numeric);
    });
    
    DB('complex?', 1, function (cont, a) {
        return makeBoolean(a instanceof Ccc.Numeric);
    });
    
    DB('real?', 1, function (cont, a) {
        return makeBoolean(a instanceof Ccc.Numeric && a.imagNumer === 0);
    });
    
    DB('rational?', 1, function (cont, a) {
        return makeBoolean(a instanceof Ccc.Numeric && a.realExact && a.imagNumer === 0);
    });
    
    DB('integer?', 1, function (cont, a) {
        return makeBoolean(a instanceof Ccc.Numeric && a.isInteger());
    });
    
    DB('exact?', 1, function () {
        var n = arguments[1];
        assertType(n, 'Numeric');
        return makeBoolean(n.exact);
    });

    DB('inexact?', 1, function () {
        var n = arguments[1];
        assertType(n, 'Numeric');
        return makeBoolean(!n.exact);
    });
    
    DB('=', -2, numericComparator(function (a, b) { return a.isEqv(b); }));
    DB('<', -2, numericComparator(function (a, b) { return a.cmp(b) < 0; }));
    DB('>', -2, numericComparator(function (a, b) { return a.cmp(b) > 0; }));
    DB('<=', -2, numericComparator(function (a, b) { return a.cmp(b) <= 0; }));
    DB('>=', -2, numericComparator(function (a, b) { return a.cmp(b) >= 0; }));
    
    DB('zero?', 1, function (cont, a) {
        assertType(a, 'Numeric');
        return makeBoolean(a.realNumer === 0 && a.imagNumer === 0);
    });
    
    DB('positive?', 1, function (cont, a) {
        assertType(a, 'Numeric');
        if (a.imagNumer !== 0) {
            throw new TypeError("Invalid number type in positive?");
        }
        return makeBoolean(a.realNumer > 0);
    });
    
    DB('negative?', 1, function (cont, a) {
        assertType(a, 'Numeric');
        if (a.imagNumer !== 0) {
            throw new TypeError("Invalid number type in negative?");
        }
        return makeBoolean(a.realNumer < 0);
    });
    
    DB('odd?', 1, function (cont, a) {
        assertInteger(a);
        return makeBoolean(a.realNumer % 2 === 1);
    });
    
    DB('even?', 1, function (cont, a) {
        assertInteger(a);
        return makeBoolean(a.realNumer % 2 === 0);
    });
    
    DB('max', -1, numericFold(function (a, b) {
        if(!a.exact || !b.exact) {
            a = a.toInexact();
            b = b.toInexact();
        }
        return a.cmp(b) > 0 ? a : b;
    }));

    DB('min', -1, numericFold(function (a, b) {
        if(!a.exact || !b.exact) {
            a = a.toInexact();
            b = b.toInexact();
        }
        return a.cmp(b) < 0 ? a : b;
    }));
    
    DB('abs', 1, function (cont, a) {
        assertReal(a);
        return new Ccc.Numeric(Math.abs(a.realNumer), a.realDenom, a.realExact);
    });
    
    DB('quotient', 2, function (cont, a, b) {
        var q;
        assertInteger(a);
        assertInteger(b);
        q = a.realNumer / b.realNumer;
        if (q < 0)
            return new Ccc.Numeric(Math.ceil(q));
        return new Ccc.Numeric(Math.floor(q), 1, a.realExact && b.realExact);
    });
    
    DB('remainder', 2, function (cont, a, b) {
        assertInteger(a);
        assertInteger(b);
        return new Ccc.Numeric(a.realNumer % b.realNumer, 1, a.realExact && b.realExact);
    });

    DB('modulo', 2, function (cont, a, b) {
        var r;
        assertInteger(a);
        assertInteger(b);
        r = a.realNumer % b.realNumer;
        if (r * b.realNumer < 0) {
            r += b.realNumer;
        }
        return new Ccc.Numeric(r, 1, a.realExact && b.realExact);
    });
    
    DB('gcd', numericFold(new Ccc.Numeric(0), function (a, b) {
        assertInteger(a);
        assertInteger(b);
        return a.gcd(b);
    }));

    DB('lcm', numericFold(new Ccc.Numeric(1), function (a, b) {
        assertInteger(a);
        assertInteger(b);
        return a.lcm(b);
    }));
    
    DB('numerator', 1, function (cont, a) {
        assertReal(a);
        return new Ccc.Numeric(a.realNumer, 1, a.realExact);
    });

    DB('denominator', 1, function (cont, a) {
        assertReal(a);
        return new Ccc.Numeric(a.realDenom, 1, a.realExact);
    });
    
    DB('floor', 1, function (cont, a) {
        assertReal(a);
        return new Ccc.Numeric(Math.floor(a.realNumer / a.realDenom), 1, a.realExact);
    });
    
    DB('ceiling', 1, function (cont, a) {
        assertReal(a);
        return new Ccc.Numeric(Math.ceil(a.realNumer / a.realDenom), 1, a.realExact);
    });
    
    DB('truncate', 1, function (cont, a) {
        var q;
        assertReal(a);
        q = a.realNumer / a.realDenom;
        if (q < 0) {
            q = Math.ceil(q);
        }
        else {
            q = Math.floor(q);
        }
        return new Ccc.Numeric(q, 1, a.realExact);
    });
    
    DB('round', 1, function (cont, a) {
        var q, r;
        assertReal(a);
        q = a.realNumer / a.realDenom;
        r = Math.round(q);
        if (Math.abs(q - r) === 0.5 && r % 2 === 1) {
            r = 2 * q - r;
        }
        return new Ccc.Numeric(r, 1, a.realExact);
    });
    
    var realFunc = function (fn) {
        return function (cont, a) {
            assertReal(a);
            return new Ccc.Numeric(fn(a.realNumer / a.realDenom), 1, false);
        };
    };
    
    DB('exp', 1, realFunc(Math.exp));
    DB('log', 1, realFunc(Math.log));
    DB('sin', 1, realFunc(Math.sin));
    DB('cos', 1, realFunc(Math.cos));
    DB('tan', 1, realFunc(Math.tan));
    DB('asin', 1, realFunc(Math.asin));
    DB('acos', 1, realFunc(Math.acos));
    DB('sqrt', 1, realFunc(Math.sqrt));
        
    DB('atan', -1, function (cont, a, b) {
        if (arguments.length > 3) {
            throw new Error("atan received more than 2 arguments, but expects exactly 1 or 2");
        }
        assertReal(a);
        if (typeof b === 'undefined') {
            return new Ccc.Numeric(Math.atan(a.realNumer / a.realDenom), 1, false);
        }
        assertReal(b);
        return new Ccc.Numeric(Math.atan2(a.realNumer / a.realDenom, b.realNumer / b.realDenom), 1, false);
    });
    
    DB('expt', 2, function (cont, a, b) {
        assertReal(a);
        assertReal(b);
        return new Ccc.Numeric(Math.pow(a.realNumer, b.realNumer));
    });
    
    DB('make-rectangular', 2, function (cont, a, b) {
        assertReal(a);
        assertReal(b);
        return new Ccc.Numeric(a.realNumer, a.realDenom, a.realExact, b.realNumer, b.realDenom, b.realExact);
    });
    
    DB('make-polar', 2, function (cont, a, b) {
        assertReal(a);
        assertReal(b);
        return Ccc.Numeric.fromPolar(a.realNumer, b.realNumer);
    });
    
    DB('real-part', 1, function (cont, a) {
        assertType(a, 'Numeric');
        return new Ccc.Numeric(a.realNumer, a.realDenom, a.realExact);
    });
    
    DB('imag-part', 1, function (cont, a) {
        assertType(a, 'Numeric');
        return new Ccc.Numeric(a.imagNumer, a.imagDenom, a.imagExact);
    });
    
    DB('magnitude', 1, function (cont, a) {
        var m;
        assertType(a, 'Numeric');
        m = Math.sqrt(a.realNumer * a.realNumer / a.realDenom / a.realDenom + a.imagNumer * a.imagNumer / a.imagDenom / a.imagDenom);
        return new Ccc.Numeric(Math.acos(a.realNumer / a.realDenom / m), 1, false);
    });
    
    DB('angle', 1, function (cont, a) {
        var m;
        assertType(a, 'Numeric');
        return new Ccc.Numeric(Math.atan2(a.imagNumer / a.imagDenom, a.realNumer / a.realDenom) , 1, false);
    });
    
    DB('exact->inexact', 1, function (cont, a) {
        assertType(a, 'Numeric');
        return a.toInexact();
    });
    
    DB('inexact->exact', 1, function (cont, a) {
        assertType(a, 'Numeric');
        return a.toExact();
    });
    
    DB('number->string', -1, function (cont, n, base) {
        if (typeof base === 'undefined') {
            base = 10;
        }
        else {
            assertInteger(base);
            base = base.realNumer;
        }
        if (arguments.length > 3) {
            throw new Error("number->string called with more than 2 arguments; expected exactly 1 or 2");
        }
        assertType(n, 'Numeric');
        return new Ccc.String(n.toString(base));
    });
    
    DB('string->number', -1, function (cont, s, base) {
        if (typeof base === 'undefined') {
            base = 10;
        }
        else {
            assertInteger(base);
            base = base.realNumer;
        }
        if (arguments.length > 3) {
            throw new Error("string->number called with more than 2 arguments; expected exactly 1 or 2");
        }
        assertType(s, 'String');
        s = s.value;
        if (!(/#[bodx]/i).test(s)) {
            switch (base) {
            case  2: s = "#b" + s; break;
            case  8: s = "#o" + s; break;
            case 10: s = "#d" + s; break;
            case 16: s = "#x" + s; break;
            default:
                throw new RangeError("Invalid radix given to string->number");
            }
        }
        
        try {
            return new Ccc.Parser.parse(s, 'number');
        }
        catch (e) {
            return makeBoolean(false);
        }
    });
        
    
    ///
    /// Boolean operators
    ///
    
    DB('not', 1, function (cont, a) {
        return makeBoolean(!a.toBoolean().value);
    });
    
    DB('boolean?', 1, function (cont, a) {
        return makeBoolean(a instanceof Ccc.Boolean);
    });
    
    ///
    /// Pair & List operators
    ///
    
    var makePairSelector = function (which) {
        var i, props = [];
        for (i = which.length - 1; i >= 0; i -= 1) {
            if (which.charAt(i) === 'a') {
                props.push('car');
            }
            else if (which.charAt(i) === 'd') {
                props.push('cdr');
            }
        }
        DB('c' + which + 'r', 1, function (cont, a) {
            var i;
            for (i = 0; i < props.length; i += 1) {
                assertType(a, 'Pair');
                a = a[props[i]];
            }
            return a;
        });
    }
    
    DB('cons', 2, function (cont, a, b) {
        return new Ccc.Pair(a, b);
    });
    
    DB('pair?', 1, function (cont, a) {
        return makeBoolean(a instanceof Ccc.Pair);
    });
    
    DB('list?', 1, function (cont, a) {
        if (a instanceof Ccc.Pair) {
            return makeBoolean(a.isList());
        }
        if (a.isNil()) {
            return makeBoolean(true);
        }
        return makeBoolean(false);
    });
    
    DB('null?', 1, function (cont, a) {
        return makeBoolean(a.isNil());
    });
    
    // c[ad]{1,4}r
    (function () {
        var depth, i, j, s;
        for (depth = 1; depth <= 4; depth += 1) {
            for (i = 0; i < (1 << depth); i += 1) {
                s = '';
                for (j = 0; j < depth; j += 1) {
                    if ((i & (1 << j)) === 0) {
                        s = 'd' + s;
                    }
                    else {
                        s = 'a' + s;
                    }
                }
                makePairSelector(s);
            }
        }
    }());
    
    DB('list', function ()  {
        var args = [].slice.call(arguments, 1), i;
        return Ccc.Pair.fromArray(args);
    });
    
    DB('length', 1, function (cont, a) {
        var n = 0;
        if (a.isNil()) {
            return new Ccc.Numeric(0);
        }
        assertList(a);
        while (!a.isNil()) {
            a = a.cdr;
            n += 1;
        }
        return new Ccc.Numeric(n);
    });
    
    DB('append', -1, function () {
        var tail = arguments[arguments.length - 1], i, arg, head, end;
        for (i = arguments.length - 2; i >= 1; i -= 1) {
            arg = arguments[i];
            if (!arg.isNil()) {
                assertList(arg);
                tail = arg.splice(tail);
            }
        }
        return tail;
    });
    
    DB('reverse', 1, function (cont, a) {
        var head = Ccc.Nil, i;
        if (a.isNil()) {
            return head;
        }
        assertList(a);
        i = a;
        while (i instanceof Ccc.Pair) {
            head = new Ccc.Pair(i.car, head);
            i = i.cdr;
        }
        return head;
    });

    DB('set-car!', 2, function (cont, a, b) {
        assertType(a, 'Pair');
        a.car = b;
        return Ccc.Unspecified;
    });
    
    DB('set-cdr!', 2, function (cont, a, b) {
        assertType(a, 'Pair');
        a.cdr = b;
        return Ccc.Unspecified;
    });
    
    DB('list-tail', 2, function (cont, list, k) {
        assertInteger(k);
        k = k.realNumer;
        while (k > 0 && list instanceof Ccc.Pair) {
            list = list.cdr;
            k -= 1;
        }
        if (k !== 0) {
            throw new RangeError("Index out of bounds in list-tail");
        }
        return list;
    });

    DB('list-ref', 2, function (cont, list, k) {
        assertInteger(k);
        k = k.realNumer;
        while (k > 0 && list instanceof Ccc.Pair) {
            list = list.cdr;
            k -= 1;
        }
        if (k !== 0 || !(list instanceof Ccc.Pair)) {
            throw new RangeError("Index out of bounds in list-ref");
        }
        return list.car;
    });
    
    (function () {
        var memberFunc = function (fn) {
            return function (cont, obj, list) {
                assertList(list);
                while (!list.isNil()) {
                    if (fn(obj, list.car)) {
                        return list;
                    }
                    list = list.cdr;
                }
                return makeBoolean(false);
            };
        };
        DB('memq', 2, memberFunc(function (a, b) { return a.isEq(b); }));
        DB('memv', 2, memberFunc(function (a, b) { return a.isEqv(b); }));
        DB('member', 2, memberFunc(function (a, b) { return a.isEqual(b); }));
    }());

    (function () {
        var alistFunc = function (fn) {
            return function (cont, obj, alist) {
                while (!alist.isNil()) {
                    assertType(alist, 'Pair');
                    assertType(alist.car, 'Pair');
                    if (fn(obj, alist.car.car)) {
                        return  alist.car;
                    }
                    alist = alist.cdr;
                }
                return makeBoolean(false);
            };
        };
        DB('assq', 2, alistFunc(function (a, b) { return a.isEq(b); }));
        DB('assv', 2, alistFunc(function (a, b) { return a.isEqv(b); }));
        DB('assoc', 2, alistFunc(function (a, b) { return a.isEqual(b); }));
    }());
    
    ///
    /// Symbol operators
    ///
    
    DB('symbol?', 1, function (cont, a) {
        return makeBoolean(a instanceof Ccc.Symbol);
    });
    
    DB('string->symbol', 1, function () {
        var o = arguments[1];
        assertType(o, 'String');
        return new Ccc.Symbol(o.value);
    });
    
    DB('symbol->string', 1, function () {
        var o = arguments[1];
        assertType(o, 'Symbol');
        return new Ccc.String(o.id);
    });
    
    ///
    /// Character operators
    ///
    
    var charComparator = typedComparator('Character');
    
    DB('char?', 1, function (cont, a) {
        return makeBoolean(a instanceof Ccc.Character);
    });
    
    DB('char=?', -2, charComparator(function (a, b) { return a.value.localeCompare(b.value) === 0; }));
    DB('char<?', -2, charComparator(function (a, b) { return a.value.localeCompare(b.value) < 0; }));
    DB('char>?', -2, charComparator(function (a, b) { return a.value.localeCompare(b.value) > 0; }));
    DB('char<=?', -2, charComparator(function (a, b) { return a.value.localeCompare(b.value) <= 0; }));
    DB('char>=?', -2, charComparator(function (a, b) { return a.value.localeCompare(b.value) >= 0; }));

    DB('char-ci=?', -2, charComparator(function (a, b) { return a.value.toLocaleLowerCase().localeCompare(b.value.toLocaleLowerCase()) === 0; }));
    DB('char-ci<?', -2, charComparator(function (a, b) { return a.value.toLocaleLowerCase().localeCompare(b.value.toLocaleLowerCase()) < 0; }));
    DB('char-ci>?', -2, charComparator(function (a, b) { return a.value.toLocaleLowerCase().localeCompare(b.value.toLocaleLowerCase()) > 0; }));
    DB('char-ci<=?', -2, charComparator(function (a, b) { return a.value.toLocaleLowerCase().localeCompare(b.value.toLocaleLowerCase()) <= 0; }));
    DB('char-ci>=?', -2, charComparator(function (a, b) { return a.value.toLocaleLowerCase().localeCompare(b.value.toLocaleLowerCase()) >= 0; }));
    
    DB('char-alphabetic?', 1, function (cont, c) {
        assertType(c, 'Character');
        return makeBoolean(/^[a-z]$/i.test(c.value));
    });
    
    DB('char-numeric?', 1, function (cont, c) {
        assertType(c, 'Character');
        return makeBoolean(/^[0-9]$/.test(c.value));
    });
    
    DB('char-whitespace?', 1, function (cont, c) {
        assertType(c, 'Character');
        return makeBoolean(/^[ \t\n\r\f]$/.test(c.value));
    });
    
    DB('char-upper-case?', 1, function (cont, c) {
        assertType(c, 'Character');
        return makeBoolean(/^[A-Z]$/.test(c.value));
    });

    DB('char-lower-case?', 1, function (cont, c) {
        assertType(c, 'Character');
        return makeBoolean(/^[a-z]$/.test(c.value));
    });

    DB('char->integer', 1, function (cont, a) {
        assertType(a, 'Character');
        return new Ccc.Numeric(a.value.charCodeAt(0));
    });
    
    DB('integer->char', 1, function (cont, a) {
        assertInteger(a);
        return new Ccc.Character(String.fromCharCode(a.realNumer));
    });
    
    DB('char-upcase', 1, function (cont, a) {
        assertType(a, 'Character');
        return new Ccc.Character(a.value.toLocaleUpperCase());
    });

    DB('char-downcase', 1, function (cont, a) {
        assertType(a, 'Character');
        return new Ccc.Character(a.value.toLocaleLowerCase());
    });
    
    ///
    /// String operators
    ///
    
    var stringComparator = typedComparator('String');

    DB('string?', 1, function (cont, a) {
        return a instanceof Ccc.String;
    });
    
    DB('make-string', -1, function (cont, k, ch, err) {
        if (typeof err !== 'undefined') {
            throw new Error("make-string called with more than 2 arguments");
        }
        if (typeof ch === 'undefined') {
            ch = ' ';
        }
        else {
            assertType(ch, 'Character');
            ch = ch.value;
        }
        assertInteger(k);
        return new Ccc.String(Array(k.realNumer + 1).join(ch));
    });
    
    DB('string', function () {
        var n = arguments.length, i, c, s = '';
        for (i = 1; i < n; i += 1) {
            var c = arguments[i];
            if (c instanceof Ccc.Character || c instanceof Ccc.String) {
                s += c.value;
            }
            else if (c instanceof Ccc.Numeric) {
                s += c.toString();
            }
        }
        return new Ccc.String(s);
    });
    
    DB('string-length', 1, function (cont, a) {
        assertType(a, 'String');
        return a.value.length;
    });
    
    DB('string-ref', 2, function (cont, s, k) {
        assertType(s, 'String');
        assertInteger(k);
        if (k.realNumer >= s.value.length) {
            throw new RangeError("String index out of bounds");
        }
        return new Ccc.Character(s.value[k.realNumer]);
    });

    DB('string-set!', 3, function (cont, s, k, c) {
        var chars;
        assertType(s, 'String');
        assertType(c, 'Character');
        if (k >= s.length || k < 0) {
            throw new RangeError("string-set! index out of range");
        }
        chars = [].slice.call(s.value);
        chars.splice(k, 1, c.value);
        s.value = chars.join('');
        return Ccc.Unspecified;
    });
    
    DB('string-fill!', 2, function (cont, s, c) {
        var f = '', i;
        assertType(s, 'String');
        assertType(c, 'Character');
        for (i = s.value.length; i > 0; i -= 1) {
            f += c.value;
        }
        s.value = f;
        return Ccc.Unspecified;
    });

    DB('string=?', -2, stringComparator(function (a, b) { return a.value.localeCompare(b.value) === 0; }));
    DB('string<?', -2, stringComparator(function (a, b) { return a.value.localeCompare(b.value) < 0; }));
    DB('string>?', -2, stringComparator(function (a, b) { return a.value.localeCompare(b.value) > 0; }));
    DB('string<=?', -2, stringComparator(function (a, b) { return a.value.localeCompare(b.value) <= 0; }));
    DB('string>=?', -2, stringComparator(function (a, b) { return a.value.localeCompare(b.value) >= 0; }));

    DB('string-ci=?', -2, stringComparator(function (a, b) { return a.value.toLocaleLowerCase().localeCompare(b.value.toLocaleLowerCase()) === 0; }));
    DB('string-ci<?', -2, stringComparator(function (a, b) { return a.value.toLocaleLowerCase().localeCompare(b.value.toLocaleLowerCase()) < 0; }));
    DB('string-ci>?', -2, stringComparator(function (a, b) { return a.value.toLocaleLowerCase().localeCompare(b.value.toLocaleLowerCase()) > 0; }));
    DB('string-ci<=?', -2, stringComparator(function (a, b) { return a.value.toLocaleLowerCase().localeCompare(b.value.toLocaleLowerCase()) <= 0; }));
    DB('string-ci>=?', -2, stringComparator(function (a, b) { return a.value.toLocaleLowerCase().localeCompare(b.value.toLocaleLowerCase()) >= 0; }));
    
    DB('substring', 3, function (cont, s, a, b) {
        assertType(s, 'String');
        assertInteger(a);
        assertInteger(b);
        if (a.realNumer < 0 || a.realNumer >= s.value.length || b.realNumeric < 0 || b.realNumeric > s.value.length) {
            throw new RangeError("String index out of bounds");
        }
        return new Ccc.String(s.value.substring(a.realNumer, b.realNumer));
    });
    
    DB('string-append', function () {
        var i, n = arguments.length, s = '';
        for (i = 1; i < n; i += 1) {
            assertType(arguments[i], 'String');
            s += arguments[i].value;
        }
        return new Ccc.String(s);
    });
    
    DB('string->list', 1, function (cont, s) {
        var chars, i;
        assertType(s, 'String');
        chars = s.value.split('');
        for (i = 0; i < chars.length; i += 1) {
            chars[i] = new Ccc.Character(chars[i]);
        }
        return Ccc.Pair.fromArray(chars);
    });
    
    DB('list->string', 1, function (cont, a) {
        var s = '';
        assertList(a);
        while (!a.isNil()) {
            assertType(a.car, 'Character');
            s += a.car.value;
            a = a.cdr;
        }
        return new Ccc.String(s);
    });
    
    DB('string-copy', 1, function (cont, s) {
        assertType(s, 'String');
        return new Ccc.String(s.value);
    });
    
    ///
    /// Vector operators
    ///
    
    DB('vector?', 1, function (cont, o) {
        return makeBoolean(o instanceof Ccc.Vector);
    });
    
    DB('make-vector', -1, function (cont, k, fill) {
        var a = [], i;
        assertInteger(k);
        if (typeof fill === 'undefined') {
            fill = makeBoolean(false);
        }
        for (i = 0; i < k; i += 1) {
            a[i] = fill;
        }
        return new Ccc.Vector(a);
    });
    
    DB('vector', function () {
        var args = [].slice.call(arguments, 1), i;
        return new Ccc.Vector(args);
    });
    
    DB('vector-length', 1, function (cont, v) {
        assertType(v, 'Vector');
        return new Ccc.Numeric(v.elements.length);
    });
    
    DB('vector-ref', 2, function (cont, v, k) {
        assertType(v, 'Vector');
        assertInteger(k);
        k = k.realNumer;
        if (k < 0 || k >= v.elements.length) {
            throw new RangeError("Index out of bounds in vector-ref");
        }
        return v.elements[k];
    });
    
    DB('vector-set!', 3, function (cont, v, k, o) {
        assertType(v, 'Vector');
        assertInteger(k);
        k = k.realNumer;
        if (k < 0 || k >= v.elements.length) {
            throw new RangeError("Index out of bounds in vector-ref");
        }
        v.elements[k] = o;
        return Ccc.Unspecified;
    });
    
    DB('vector-fill!', 2, function (cont, v, fill) {
        var i;
        assertType(v, 'Vector');
        for (i = 0; i < v.elements.length; i += 1) {
            v.elements[i] = fill;
        }
        return Ccc.Unspecified;
    });
    
    DB('vector->list', 1, function (cont, v) {
        assertType(v, 'Vector');
        return Ccc.Pair.fromArray(v.elements);
    });
    
    DB('list->vector', 1, function (cont, p) {
        var a = [];
        assertList(p);
        while (!p.isNil()) {
            a.push(p.car);
            p = p.cdr;
        }
        return new Ccc.Vector(a);
    });
    
    ///
    /// Control features
    ///
    
    DB('procedure?', 1, function (cont, o) {
        return makeBoolean(o.isApplicable());
    });
    
    var makeCompiledBuiltin = function (id, arity, object) {
        
    };
    
    DB('apply', -2, function (cont, o) {
        var args = [].slice.call(arguments, 2, arguments.length - 1), tail = arguments[arguments.length - 1];
        assertApplicable(o);
        assertList(tail);
        while (!tail.isNil()) {
            args.push(tail.car);
            tail = tail.cdr;
        }
        
        return o.doApply(cont, args);
    }, true);

    DB('map', -2, function (cont, fn) {
        var lists = [].slice.call(arguments, 2), i, ops = [], callOps, done = false, resultLength = 0;

        assertApplicable(fn);
        for (i = 0; i < lists.length; i += 1) {
            assertList(lists[i]);
            lists[i] = lists[i].reverse();
        }

        cont = new Ccc.Continuation(cont.env, ops, 0, cont.stack, cont);
        while (true) {
            callOps = [];
            for (i = 0; i < lists.length; i += 1) {
                if (lists[i].isNil()) {
                    done = true;
                    break;
                }
                callOps = [Ccc.OpCodes.PUSH(lists[i].car)].concat(callOps);
                lists[i] = lists[i].cdr;
            }
            if (done) {
                break;
            }
            callOps.push(Ccc.OpCodes.PUSH(fn));
            callOps.push(Ccc.OpCodes.APPLY(lists.length));
            callOps.push(Ccc.OpCodes.RET());
            cont = new Ccc.Continuation(cont.env, callOps, 0, cont.stack, cont);
            resultLength += 1;
        }
        
        ops.push(Ccc.OpCodes.LOAD(new Ccc.Symbol("list")));
        ops.push(Ccc.OpCodes.APPLY(resultLength));
        ops.push(Ccc.OpCodes.RET());
        
        return cont;
    }, true);

    DB('for-each', -2, function (cont, fn) {
        var lists = [].slice.call(arguments, 2), i, ops = [], callOps, done = false, resultLength = 0;

        assertApplicable(fn);
        for (i = 0; i < lists.length; i += 1) {
            assertList(lists[i]);
        }

        cont = new Ccc.Continuation(cont.env, ops, 0, cont.stack, cont);
        while (true) {
            callOps = [];
            for (i = 0; i < lists.length; i += 1) {
                if (lists[i].isNil()) {
                    done = true;
                    break;
                }
                callOps = [Ccc.OpCodes.PUSH(lists[i].car)].concat(callOps);
                lists[i] = lists[i].cdr;
            }
            if (done) {
                break;
            }
            callOps.push(Ccc.OpCodes.PUSH(fn));
            callOps.push(Ccc.OpCodes.APPLY(lists.length));
            callOps.push(Ccc.OpCodes.POP());
            callOps.push(Ccc.OpCodes.RET());
            cont = new Ccc.Continuation(cont.env, callOps, 0, cont.stack, cont);
            resultLength += 1;
        }
        
        ops.push(Ccc.OpCodes.PUSH(Ccc.Unspecified));
        ops.push(Ccc.OpCodes.RET());
        
        return cont;
    }, true);

    DB('eval', 2, function (cont, expression, environment) {
        var ops = [];
        ops.push(Ccc.OpCodes.PUSH(expression));
        ops.push(Ccc.OpCodes.EVAL(environment));
        ops.push(Ccc.OpCodes.RET());
        return new Ccc.Continuation(environment, ops, 0, cont.stack, cont);
    }, true);
    
    DB(['scheme-report-environment', 'null-environment'], 1, function (cont, version) {
        if (!version.isEq(new Ccc.Numeric(5))) {
            throw new Error("scheme-report-environment and null-environment require version to be exactly 5");
        }
        return Ccc.NullEnvironment.clone();
    });
    
    DB(['this-environment', 'interaction-environment'], 0, function (cont) {
        return cont.env;
    });
    
    DB('environment?', 1, function (cont, o) {
        return makeBoolean(o instanceof Ccc.Environment);
    });
    
    DB('environment-has-parent?', 1, function (cont, o) {
        assertType(o, 'Environment');
        return makeBoolean(o.getParent() !== null);
    });
    
    DB('environment-parent', 1, function (cont, o) {
        assertType(o, 'Environment');
        if (o.getParent() === null) {
            throw new Error("Environment " + o + " has no parent");
        }
        return o.getParent();
    });

    DB(['call-with-current-continuation', 'call/cc'], 1, function (cont, f) {
        assertApplicable(f);
        return f.doApply(cont, [cont]);
    }, true);
    
    DB('continuation?', 1, function (cont, c) {
        return makeBoolean(c instanceof Ccc.Continuation);
    });
    
    DB('values', null, function (cont) {
        var args = [].slice.call(arguments, 1), i;
        return new Ccc.CompiledClosure(args);
    });
    
    DB('call-with-values', 2, function (cont, producer, consumer) {
        var contOps = [];
        contOps.push(Ccc.OpCodes.PUSH(consumer));
        contOps.push(Ccc.OpCodes.APPLYV())
        contOps.push(Ccc.OpCodes.RET());
        var contConsumer = new Ccc.Continuation(cont.env, contOps, 0, cont.stack, cont);
        return producer.doApply(contConsumer, []);
    }, true);
    
    DB('dynamic-wind', 3, function (cont, before, thunk, after) {
        var cont = thunk.doApply(cont, []);
        cont.addGuard(new Ccc.Guard(before, after));
        return cont;
    }, true);
    
    ///
    /// I/O
    ///
    
    DB('display', 1, function (env, o) {
        console.log(o.toDisplayString());
        return Ccc.Unspecified;
    });
}());
