var Ccc = (function () {
    var Ccc = {};
    
    var _map = function (a, f) {
        var o = [], i;
        for (i = 0; i < a.length; i += 1) {
            o[i] = f(a[i]);
        }
        return o;
    };
    
    var _toString = function (o) {
        return o.toString();
    };
    
    var _mapToString = function (o, separator) {
        if (typeof separator === 'undefined') {
            separator = ' ';
        }

        return _map(o, _toString).join(separator);
    };

    // Static methods used internally by pegjs parser rules
    Ccc.ParseUtil = (function () {
        var ParseUtil = {};

        ParseUtil.realFromTokens = function (digits, hashes, base) {
            var value = parseInt(digits.join(""), base);
            var exact = true;
            if (hashes.length > 0) {
                exact = false;
                value *= Math.pow(base, hashes.length);
            }
            return new Ccc.Real(value, exact);
        };

        ParseUtil.numberFromPolar = function (r, theta) {
            var real = r * Math.cos(theta);
            var imag = r * Math.sin(theta);
            return new Ccc.Numeric(real, 1, false, imag, 1, false);
        };

        ParseUtil.numberFromDecimal = function (n, ha, hb, suffix, forceInexact) {
            var p = 1;
            var exp = 0;
            var hasExp = false;
            if (typeof suffix === 'object') {
                p = suffix.precision; 
                exp = suffix.value;
                hasExp = true;
            }
            var num = n instanceof Ccc.Numeric ? n : new Ccc.Numeric(n);
            return new Ccc.Real(num.realNumer * Math.pow(10, exp + ha.length), num.exact && !hasExp && !forceInexact);
        };
        
        ParseUtil.makeRational = function (numer, denom) {
            if (!numer.realExact || !denom.realExact) {
                return new Ccc.Real(numer.realNumer / denom.realNumer);
            }
            return new Ccc.Rational(numer.realNumer, denom.realNumer);
        };

        ParseUtil.arrayFromArrays = function (items, itemsIndex) {
            var b = [], i, j;
            for (i = 0; i < items.length; i += 1) {
                b.push(items[i][itemsIndex]);
            }
            return b;
        };
        
        return ParseUtil;
    }());

    // Base type of all Ccc runtime objects
    Ccc.Object = (function () {
        var Object = function () {
        };
        
        Object.prototype.toString = function () {
            return '#<generic-object>';
        };

        // eq? predicate logic.
        // By default, Object references are eq? iff they reference the same object in memory.
        Object.prototype.isEq = function (o) {
            return this === o;
        };
        
        // eqv? predicate logic.
        // By default, Object references are eqv? iff they are eq? according to their specific types
        Object.prototype.isEqv = function (o) {
            return this.isEq(o) || false;
        };
        
        // equal? predicate logic.
        // By default, Object references are equal? iff they are eqv? according to their specific types
        Object.prototype.isEqual = function (o) {
            return this.isEqv(o) || false;
        };
        
        // Used by the standard library to evaluate an object in a boolean context.
        // This is overridden only by the Ccc.Boolean type.
        Object.prototype.toBoolean = function () {
            return Ccc.True;
        };
        
        // Only the Ccc.Nil object is nil.
        Object.prototype.isNil = function () {
            return this === Ccc.Nil;
        };

        // An Object's compile method emits an array of VM instructions whose
        // primary side-effect when executed such that the top of the stack contains
        // the result of evaluating that object.
        //
        // Default compilation is self-evaluation
        Object.prototype.compile = function () {
            return [OP.PUSH(this)];
        };
        
        // Is this object applicable? (i.e. is it a valid operator for the APPLY and APPLYT
        // instructions?).  Default is no.
        Object.prototype.isApplicable = function () {
            return false;
        };
        
        // Perform application of this object on the current continuation.
        // Called by the VM on the operator of an APPLY or APPLYT instruction.
        Object.prototype.doApply = function () {
            throw new TypeError("Object " + this + " is not applicable.");
        };

        // String form output by the standard library's display.
        // Often but not always equivalent to internal toString().
        Object.prototype.toDisplayString = function () {
            return this.toString();
        };

        // Used during macro transformation to capture free references to
        // the outer environment before expansion.
        Object.prototype.getFreeReferences = function () {
            return [];
        }
        
        // Transform this object within the given syntactic environment.
        // Used during the macro expansion phase prior to compilation.
        // The end result of a program datum transform is a datum comprised only
        // of the fundamental object types:
        //
        // Program, Pair, Vector, Lambda, If, Define, Assignment, Numeric,
        // Character, String, Symbol, and constants Nil, True, False, and Unspecified.
        Object.prototype.transform = function (environment) {
            return this;
        };
        
        Object.prototype.replaceSymbols = function () {
            return this;
        };
        
        return Object;
    }());

    Ccc.Symbol = (function () {
        var interns = {};
        
        // Constructs a new symbol with a given symbol id and interns it if possible.
        // Only one instance of Symbol is retained for any interned symbol id.
        //
        // The name parameter is used during transformation when generating temporary
        // symbols to capture references from the outer environment.  Temporary symbols
        // are never interned.
        var Symbol = function (id, name) {
            if (interns.hasOwnProperty(id)) {
                return interns[id];
            }
            if (typeof name === 'undefined') {
                name = id;
                interns[id] = this;
            }
            this.id = id;
            this.name = name;
            this.quoted = /[ \t\f\r\n\v\xa0\u2000-\u200b\u2028\u2029\u202f\u3000]/.test(name);
        };
        
        Symbol.prototype = new Ccc.Object();
        
        Symbol.prototype.toString = function () {
            return this.quoted ? "|" + this.name.replace(/\|/, "\\|") + "|" : this.name;
        };

        // This symbol is a free reference iff it is bound in the current transformation environment.
        Symbol.prototype.getFreeReferences = function (environment) {
            return environment.tryGetLocation(this.id) ? [this.id] : (environment.tryGetSyntax(this.id) ? [this.id] : []);
        };
        
        Symbol.prototype.transform = function (environment) {
            return this;
        };
        
        Symbol.prototype.compile = function () {
            return [OP.LOAD(this)];
        };
        
        Symbol.prototype.replaceSymbols = function (map) {
            if (map.hasOwnProperty(this.id)) {
                return map[this.id];
            }
            return this;
        };

        return Symbol;
    }());

    // Boolean object.  Only two of these ever exist: the constants True and False.
    // Neither the compiler nor the VM will ever construct additional instances.
    Ccc.Boolean = (function () {
        var Boolean = function (value, internal) {
            if (internal === true) {
                this.value = value;
            }
            else {
                return value === false ? Ccc.False : Ccc.True;
            }
        };
        
        Boolean.prototype = new Ccc.Object();
        
        Boolean.prototype.toString = function () {
            return this.value === false ? '#f' : '#t';
        };
        
        Boolean.prototype.toBoolean = function () {
            return this;
        };
        
        return Boolean;
    }());

    Ccc.True = new Ccc.Boolean(true, true);
    Ccc.False = new Ccc.Boolean(false, true);

    // Character object.
    Ccc.Character = (function () {
        var Character = function (value) {
            this.value = value;
        };
        
        Character.prototype = new Ccc.Object();
        
        Character.prototype.toString = function () {
            return '#\\' + this.value.replace(/\n/, 'newline').replace(/ /, 'space');
        };
        
        // eq? is #t iff both characters hold exactly the same character value.
        Character.prototype.isEq = function (o) {
            return o instanceof Ccc.Character && this.value === o.value;
        };
        
        Character.prototype.toDisplayString = function () {
            return this.value;
        };
        
        return Character;
    }());

    // String object.
    Ccc.String = (function () {
        var String = function (value) {
            this.value = value;
        };
        
        String.prototype = new Ccc.Object();
        
        String.prototype.toString = function () {
            return '"' + this.value.replace('"', '\\"') + '"';
        };

        // eqv? is true iff both strings hold exactly the same string value.
        String.prototype.isEqv = function (o) {
            return o instanceof Ccc.String && this.value === o.value;
        };
        
        String.prototype.toDisplayString = function () {
            return this.value;
        };
        
        return String;
    }());

    // The Nil constant.  All proper lists terminate with Nil.
    Ccc.Nil = new Ccc.Object();
    Ccc.Nil.toString = function () {
        return "()";
    };
    Ccc.Nil.toArray = function () {
        return [];
    };
    
    // The Unspecified constant.
    Ccc.Unspecified = new Ccc.Object();
    Ccc.Unspecified.toString = function () {
        return "#!unspecific";
    };

    // Pair object.  Both proper and improper lists are rooted in a Pair.
    Ccc.Pair = (function () {
        var Pair = function (car, cdr) {
            this.car = car;
            this.cdr = cdr;
        };
        
        Pair.prototype = new Ccc.Object();
        
        Pair.prototype.toString = function (inner) {
            var s = '';
            if (inner !== true) {
                s = '(';
            }
            s += this.car.toString();
            if (this.cdr === Ccc.Nil) {
                s += ')';
            }
            else if (this.cdr instanceof Ccc.Pair) {
                s += ' ' + this.cdr.toString(true);
            }
            else {
                s += ' . ' + this.cdr.toString() + ')';
            }
            return s;
        };
        
        // Is this a proper list?  True iff the list is not cyclical and its
        // tail is Nil.
        Pair.prototype.isList = function () {
            var a = this, b = this;
            while (a instanceof Ccc.Pair) {
                a = a.cdr;
                if (!(a instanceof Ccc.Pair)) {
                    break;
                }
                a = a.cdr;
                b = b.cdr;
                if (a === b) {
                    return false;
                }
            }
            return a.isNil();
        };
        
        // Returns a new list which is a copy of this list, with the second list
        // spliced onto the tail.
        Pair.prototype.splice = function (o) {
            if (this.cdr.isNil()) {
                return new Ccc.Pair(this.car, o);
            }
            return new Ccc.Pair(this.car, this.cdr.splice(o));
        };
        
        // Returns the reverse of this proper list.  If this list is improper,
        // the tail will be chopped off.
        Pair.prototype.reverse = function () {
            var p = this, tail = Ccc.Nil;
            while (p instanceof Ccc.Pair) {
                tail = new Ccc.Pair(p.car, tail);
                p = p.cdr;
            }
            return tail;
        };
        
        // Recursive equal? predicate
        Pair.prototype.isEqual = function (o) {
            return o instanceof Ccc.Pair && this.car.isEqual(o.car) && this.cdr.isEqual(o.cdr);
        };
        
        // Returns the tail of this list.  Proper lists return Nil.
        Pair.prototype.getTail = function () {
            var a = this;
            while (a instanceof Ccc.Pair) {
                a = a.cdr;
            }
            return a;
        };
        
        // Creates a new list from an array of elements and an optional tail.
        // If tail is omitted or Nil, the result is a proper list.
        Pair.fromArray = function (items, tail) {
            var i;
            if (typeof tail === 'undefined') {
                tail = Ccc.Nil;
            }
            for(i = items.length - 1; i >= 0; i -= 1) {
                tail = new Ccc.Pair(items[i], tail);
            }
            return tail;
        }
        
        // Returns an array of elements in this list.  If the list is not
        // a proper list, its tail is omitted from the result.
        Pair.prototype.toArray = function () {
            var a = [], i = this;
            while (i instanceof Ccc.Pair) {
                a.push(i.car);
                i = i.cdr;
            }
            return a;
        };
        
        // Returns an array of recursively-identified free references within the list.
        Pair.prototype.getFreeReferences = function (environment) {
            var o = this, refs = [];
            while (o instanceof Ccc.Pair) {
                refs = refs.concat(o.car.getFreeReferences(environment));
                o = o.cdr;
            }
            if (o !== Ccc.Nil) {
                refs = refs.concat(o.getFreeReferences(environment));
            }
            return refs;
        };

        // Recursively transforms this list in the given syntactic environment.  If the head
        // of the list is a syntactic keyword in the environment, the keyword's bound
        // transformer is used to expand the list recursively.
        Pair.prototype.transform = function (environment) {
            var spec, expansion, o, result = [], innerEnv;
            if (this.car instanceof Ccc.Symbol) {
                spec = environment.tryGetSyntax(this.car.id);
                if ((spec instanceof Ccc.TransformerSpec) && !environment.tryGet(this.car.id)) {
                    expansion = spec.expand(this, environment);
                    return expansion.transform(environment);
                }
            }
            o = this;
            while (o instanceof Ccc.Pair) {
                result.push(o.car.transform(environment));
                o = o.cdr;
            }
            if (o !== Ccc.Nil) {
                o = o.transform(environment);
            }
            return Pair.fromArray(result, o);
        };
        
        // Compiles a transformed pair object.  A transformed literal pair
        // is a function call.  If the pair is in a tail position, it omits
        // a LEAVE and APPLYT (tail apply) instead of APPLY, following
        // argument evaluation instructions.
        Pair.prototype.compile = function (asTail) {
            var numArgs = 0, ops = [], operator, o;
            operator = this.car;
            o = this.cdr;
            while (o instanceof Ccc.Pair) {
                ops = ops.concat(o.car.compile());
                numArgs += 1;
                o = o.cdr;
            }
            if (o !== Ccc.Nil) {
                throw new Error("Function application arguments must be a proper list");
            }
            ops = ops.concat(operator.compile());
            if (asTail === true) {
                ops.push(OP.LEAVE());
                ops.push(OP.APPLYT(numArgs));
            }
            else {
                ops.push(OP.APPLY(numArgs));
            }
            return ops;
        };

        var replaceSymbols = function (datum, map) {
            var o, i;
            if (datum instanceof Ccc.Symbol && map.hasOwnProperty(datum.id)) {
                return map[datum.id];
            }
            if (datum instanceof Ccc.Pair) {
                o = datum;
                while (o instanceof Ccc.Pair) {
                    o.car = replaceSymbols(o.car, map);
                    if (o.cdr !== Ccc.Pair && o.cdr !== Ccc.Nil) {
                        o.cdr = replaceSymbols(o.cdr, map);
                    }
                    o = o.cdr;
                }
            }
            if (datum instanceof Ccc.Vector) {
                for (i = 0; i < datum.elements.length; i += 1) {
                    datum.elements[i] = replaceSymbols(datum.elements[i], map);
                }
            }
            if (datum instanceof Ccc.Ellipsis) {
                datum.datum = replaceSymbols(datum.datum, map);
            }
            return datum;
        };
        
        Pair.prototype.replaceSymbols = function (map) {
            return replaceSymbols(this, map);
        };
        
        return Pair;
    }());

    // Vector object.
    Ccc.Vector = (function () {
        var Vector = function (elements) {
            this.elements = elements;
        };
        
        Vector.prototype = new Ccc.Object();
        
        Vector.prototype.toString = function () {
            return '#(' + _mapToString(this.elements) + ')';
        };
        
        // Element-wise equal? predicate.
        Vector.prototype.isEqual = function (o) {
            var i, equal = o instanceof Ccc.Vector && this.elements.length === o.elements.length;
            for (i = 0; equal && i < this.elements.length && i < o.elements.length; i += 1) {
                equal &= this.elements[i].isEqual(o.elements[i]);
            }
            return equal;
        };
        
        Vector.prototype.getFreeReferences = function (environment) {
            var i, refs = [];
            for (i = 0; i < this.elements.length; i += 1) {
                refs = refs.concat(this.elements[i].getFreeReferences(environment));
            }
            return refs;
        };
        
        return Vector;
    }());

    // Program object.  A Program consists of any number of independently executed
    // data.  The Parser and Transformer both emit Program objects.
    Ccc.Program = (function () {
        var Program = function (data) {
            this.data = data;
        };
        
        Program.prototype = new Ccc.Object();
        
        Program.prototype.toString = function () {
            return _map(this.data, _toString).join('\n');
        };
        
        Program.prototype.transform = function (environment) {
            var i, data = [];
            for (i = 0; i < this.data.length; i += 1) {
                data[i] = this.data[i].transform(environment);
            }
            return new Ccc.Program(data);
        };
        
        // Program compile emits a list of instruction lists, rather than a single
        // instruction list.  Each list of instructions is executed by the VM
        // starting with a fresh continuation state.
        Program.prototype.compile = function () {
            var i, program = [];
            for (i = 0; i < this.data.length; i += 1) {
                program.push(this.data[i].compile());
            }
            return program;
        };
        
        return Program;
    }());

    // Numeric object.  Represents any complex numeric value at runtime.
    Ccc.Numeric = (function () {
        var isInteger = function (val) {
            return parseFloat(val) === parseInt(val, 10) && !isNaN(val);
        };
        
        var computeGcd = function (numer, denom) {
            var a, b, r;
            numer = Math.abs(numer);
            denom = Math.abs(denom);
            if (numer < denom) {
                a = denom;
                b = numer;
            }
            else {
                a = numer;
                b = denom;
            }
            if (b === 0) {
                return a;
            }
            do {
                r = b;
                b = a % b;
                a = r;
            } while (b !== 0);
            return r;
        };
        
        // Computes the smallest power of 10 necessary to scale a floating-point value to an integer.
        // Obviously this is not reliable in all cases, but it's "good enough" for now.
        var computeScale = function (n) {
            var exp, scale = 1;
            for (exp = 1; !isInteger(n * scale); exp += 1) {
                scale = Math.pow(10, exp);
            }
            return scale;
        };
        
        var Numeric = function (realNumer, realDenom, realExact, imagNumer, imagDenom, imagExact) {
            var gcd, scale;
            
            if (typeof realNumer === 'undefined') { realNumer = 0; }
            if (typeof realDenom === 'undefined') { realDenom = 1; }
            if (typeof realExact === 'undefined') {
                realExact = isInteger(realNumer);
            }
            if (typeof imagNumer === 'undefined') { imagNumer = 0; }
            if (typeof imagDenom === 'undefined') { imagDenom = 1; }
            if (typeof imagExact === 'undefined') {
                imagExact = isInteger(imagNumer);
            }

            if (realExact && !isInteger(realNumer)) {
                scale = computeScale(realNumer);
                realNumer *= scale;
                realDenom *= scale;
            }

            if (imagExact && !isInteger(imagNumer)) {
                scale = computeScale(imagNumer);
                imagNumer *= scale;
                imagDenom *= scale;
            }
            
            if (realNumer > 0 && realDenom > 1) {
                gcd = computeGcd(realNumer, realDenom);
                realNumer /= gcd;
                realDenom /= gcd;
            }
            
            if (imagNumer > 0 && imagDenom > 1) {
                gcd = computeGcd(imagNumer, imagDenom);
                imagNumer /= gcd;
                imagDenom /= gcd;
            }
            
            Object.defineProperties(this, {
                exact: { get: function() { return realExact && imagExact; } },
                realNumer: { get: function () { return realNumer; } },
                realDenom: { get: function () { return realDenom; } },
                realExact: { get: function () { return realExact; } },
                imagNumer: { get: function () { return imagNumer; } },
                imagDenom: { get: function () { return imagDenom; } },
                imagExact: { get: function () { return imagExact; } }
            });
            
            if (realDenom === 0 || imagDenom === 0) {
                throw new Error("Division by 0");
            }

            this._repr = this.toString();
        };
        
        Numeric.prototype = new Ccc.Object();
        
        var showFloat = function (numer, denom, exact, base) {
            var q;
            if (exact) {
                if (denom === 1) {
                    return numer.toString(base);
                }
                return numer.toString(base) + '/' + denom.toString(base);
            }
            q = numer / denom;
            if (isInteger(q)) {
                return q + '.0';
            }
            return q.toString(base);
        };
        
        Numeric.prototype.toString = function (base) {
            if (base === 'undefined') {
                base = 10;
            }
            var s = showFloat(this.realNumer, this.realDenom, this.realExact, base);
            if (this.imagNumer > 0) {
                s += '+';
            }
            if (this.imagNumer !== 0) {
                s += showFloat(this.imagNumer, this.imagDenom, this.imagExact, base) + 'i';
            }
            return s;
        };
        
        Numeric.prototype.toExact = function () {
            return new Numeric(this.realNumer, this.realDenom, true, this.imagNumer, this.imagDenom, true);
        };
        
        Numeric.prototype.toInexact = function () {
            return new Numeric(this.realNumer, this.realDenom, false, this.imagNumer, this.imagDenom, false);
        };
        
        Numeric.prototype.isExact = function () {
            return this.realExact && this.imagExact;
        };
        
        // Complex negation
        Numeric.prototype.negative = function () {
            return new Numeric(-this.realNumer, this.realDenom, this.realExact, -this.imagNumer, this.imagDenom, this.imagExact);
        };
        
        // Complex sum of fractional parts
        Numeric.prototype.add = function (other) {
            var realScale = this.realDenom * other.realDenom;
            var imagScale = this.imagDenom * other.imagDenom;
            return new Numeric((this.realNumer / this.realDenom + other.realNumer / other.realDenom) * realScale, realScale, this.realExact && other.realExact,
                (this.imagNumer / this.imagDenom + other.imagNumer / other.imagDenom) * imagScale, imagScale, this.imagExact && other.imagExact);
        };

        // Complex product of fractional parts.
        Numeric.prototype.mul = function (o) {
            var a = this.realNumer, b = this.realDenom, c = this.imagNumer, d = this.imagDenom;
            var e = o.realNumer, f = o.realDenom, g = o.imagNumer, h = o.imagDenom;
            var realNumer = a * e * d * h - c * g * b * f;
            var realDenom = b * f * d * h;
            var imagNumer = c * e * b * h + a * g * d * f;
            var imagDenom = d * f * b * h;
            var exact = this.exact && o.exact;
            return new Numeric(realNumer, realDenom, exact, imagNumer, imagDenom, exact);
        };
        
        Numeric.prototype.conjugate = function (other) {
            return new Numeric(this.realNumer, this.realDenom, this.realExact, -this.imagNumer, this.imagDenom, this.imagExact);
        };
        
        // Multiplicative inverse
        Numeric.prototype.inverse = function (other) {
            if (this.imagNumer === 0) {
                return new Numeric(this.realDenom, this.realNumer, this.realExact);
            }
            var conj = this.conjugate();
            var div = this.mul(conj);
            return new Numeric(conj.realNumer * div.realDenom, conj.realDenom * div.realNumer, this.realExact,
                conj.imagNumer * div.realDenom, conj.imagDenom * div.realNumer, this.imagExact);
        };
        
        // Numerics are eq? iff they hold exactly the same real and imaginary numerator, denomator, and
        // exactness values.
        Numeric.prototype.isEq = function (o) {
            return this.realNumer === o.realNumer && this.realDenom === o.realDenom && this.realExact === o.realExact &&
                this.imagNumer === o.imagNumer && this.imagDenom === o.imagDenom && this.imagExact === o.imagExact;
        };
        
        Numeric.prototype.cmp = function (o) {
            var ord;
            if (this.imagNumer !== 0 || o.imagNumer !== 0) {
                throw new TypeError("Connot compare non-real numbers");
            }
            
            ord = this.realNumer * o.realDenom - this.realDenom * o.realNumer;
            return ord < 0 ? -1 : (ord === 0 ? 0 : 1);
        };
        
        Numeric.prototype.gcd = function (o) {
            return new Numeric(computeGcd(this.realNumer, o.realNumer), 1, this.realExact && o.realExact);
        };
        
        Numeric.prototype.lcm = function (o) {
            return new Numeric(Math.abs(this.realNumer * o.realNumer / computeGcd(this.realNumer, o.realNumer)), 1, this.realExact && o.realExact);
        };
        
        Numeric.prototype.isInteger = function (o) {
            return this.imagNumer === 0 && this.realDenom === 1 && parseFloat(this.realNumer) === parseInt(this.realNumer, 10);
        };
        
        return Numeric;
    }());

    // Convenience contructor for real numbers.  Returns a Numeric instance.
    Ccc.Real = (function () {
        var Real = function (val, exact) {
            if (typeof val === 'undefined') {
                return new Ccc.Numeric(0);
            }
            if (typeof exact === 'undefined') {
                return new Ccc.Numeric(val);
            }
            return new Ccc.Numeric(val, 1, exact);
        };

        return Real;
    }());

    // Convenience constructor for rational numbers.  Returns a Numeric instance.
    Ccc.Rational = (function () {
        var Rational = function (numer, denom) {
            if (typeof numer === 'undefined') {
                return new Ccc.Numeric(0);
            }
            if (typeof denom === 'undefined') {
                return new Ccc.Numeric(numer, 1, true);
            }
            if (denom === 0) {
                throw new Error("Divide by zero");
            }
            
            return new Ccc.Numeric(numer, denom, true);
        };

        return Rational;
    }());

    // Convenience constructor for Complex numbers.  Returns a Numeric instance.
    Ccc.Complex = (function () {
        var Complex = function (real, imag) {
            if (typeof real === 'undefined') {
                return new Ccc.Numeric(0);
            }
            if (typeof real === 'number') {
                real = new Ccc.Numeric(real);
            }
            if (typeof imag === 'undefined') {
                return real;
            }
            if (typeof imag === 'number') {
                imag = new Ccc.Numeric(real.realNumer, real.realDenom, real.realExact, imag);
            }
            return new Ccc.Numeric(real.realNumer, real.realDenom, real.realExact, imag.realNumer, imag.realDenom, imag.realExact);
        };

        return Complex;
    }());
    
    // Primitive Define runtime object.  Emitted by the internal "define" keyword transformer.
    Ccc.Define = (function () {
        var Define = function (symbol, expression) {
            this.symbol = symbol;
            this.expression = expression;
            if (!(symbol instanceof Ccc.Symbol)) {
                throw new Error("Cannot define datum " + symbol);
            }
        };
        
        Define.prototype = new Ccc.Object();
        
        Define.prototype.toString = function () {
            return "#<define " + this.symbol + " = " + this.expression + ">";
        };
        
        // Compiled instructions evaluate the expression, reserve the named symbol, set the symbol's
        // value to the result of the expression evaluation, and then push the symbol object onto the stack.
        // The result is that a Define evaluates to its symbol object at runtime, with the side-effect of
        // storing the its expression's value at that symbol's location.
        Define.prototype.compile = function () {
            return this.expression.compile().concat([OP.RES(this.symbol), OP.SET(this.symbol), OP.PUSH(this.symbol)]);
        };
        
        return Define;
    }());
    
    // Primitive Lambda runtime object.
    Ccc.Lambda = (function () {
        var Lambda = function (args, rest, body) {
            this.args = args;
            this.rest = rest;
            this.body = body;
            this.formals = Ccc.Pair.fromArray(args, rest);
            this.compiled = null;
        };
        
        Lambda.prototype = new Ccc.Object();
        
        Lambda.prototype.toString = function () {
            return "(lambda " + this.formals + " " + this.body + ")";
        };
        
        // Compiles and caches the lambda body internally, and
        // returns instructions that push a copy of the compiled
        // procedure onto the stack, bound to the current environment.
        Lambda.prototype.compile = function () {
            var ops = [], o, i;
            ops.push(OP.ENTER());
            if (this.compiled === null) {
                for (i = 0; i < this.args.length; i += 1) {
                    ops.push(OP.RES(this.args[i]));
                    ops.push(OP.SET(this.args[i]));
                }
                if (this.rest !== Ccc.Nil) {
                    ops.push(OP.RES(this.rest));
                    ops.push(OP.SET(this.rest));
                }
                o = this.body;
                while (o.cdr instanceof Ccc.Pair) {
                    ops = ops.concat(o.car.compile());
                    ops.push(OP.POP());
                    o = o.cdr;
                }
                ops = ops.concat(o.car.compile(true));
                ops.push(OP.LEAVE());
                ops.push(OP.RET());
                this.compiled = new Ccc.CompiledProcedure(ops, this.args.length, this.rest);
            }
            return [OP.PUSH(this.compiled), OP.CAP()];
        };

        return Lambda;
    }());
    
    // Compiled procedure object.  Generated by Lambda compilation.
    Ccc.CompiledProcedure = (function () {
        var CompiledProcedure = function (ops, numArgs, rest) {
            this.ops = ops;
            this.numArgs = numArgs;
            this.rest = rest;
            this.environment = null;
        };
        
        CompiledProcedure.prototype = new Ccc.Object();
        
        CompiledProcedure.prototype.toString = function () {
            return '<#proc:<' + this.ops.toString() + '>';
        };
        
        // Returns a new continuation which begins execution at the first
        // instruction of the compiled procedure and whose return continuation
        // is that of the call site.
        CompiledProcedure.prototype.doApply = function (cont, args) {
            var i, newStack = cont.stack.slice();
            if (args.length < this.numArgs) {
                throw new Error("Object " + this + " requires " + (this.rest !== Ccc.Nil ? "at least " : "exactly ") + this.numArgs + " arguments, but was called with " + args.length);
            }
            if (args.length > this.numArgs && this.rest === Ccc.Nil) {
                throw new Error("Object " + this + " requires exactly " + this.numArgs + " arguments, but was called with " + args.length);
            }
            if (this.rest !== Ccc.Nil) {
                newStack.push(Ccc.Pair.fromArray(args.slice(this.numArgs)));
                args = args.slice(0, this.numArgs);
            }
            for (i = args.length - 1; i >= 0; i -= 1) {
                newStack.push(args[i]);
            }
            return new Ccc.Continuation(this.environment, this.ops, 0, newStack, cont);
        };
        
        CompiledProcedure.prototype.isApplicable = function () {
            return true;
        };
        
        
        CompiledProcedure.prototype.bind = function (env) {
            var newBinding = new CompiledProcedure(this.ops, this.numArgs, this.rest);
            newBinding.environment = env;
            return newBinding;
        };
        
        CompiledProcedure.prototype.isEqv = function (o) {
            return o instanceof Ccc.CompiledProcedure && o.ops === this.ops && o.environment === this.environment;
        };
        
       return CompiledProcedure;
    }());

    // Primitive If runtime object.  Performs conditional branching.
    Ccc.If = (function () {
        var If = function (test, consequent, alternate) {
            this.test = test;
            this.consequent = consequent;
            this.alternate = alternate;
        };
        
        If.prototype = new Ccc.Object();
        
        If.prototype.toString = function () {
            return "#<if " + this.test + " then " + this.consequent + " else " + this.alternate + ">";
        };
        
        If.prototype.compile = function (asTail) {
            var ops = [];
            var test = this.test.compile();
            var consequent = this.consequent.compile(asTail);
            var alternate = this.alternate.compile(asTail);
            ops = ops.concat(test);
            ops.push(OP.JMPF(consequent.length + 1));
            ops = ops.concat(consequent);
            ops.push(OP.JMP(alternate.length));
            ops = ops.concat(alternate);
            return ops;
        };

        return If;
    }());
    
    // Primitive Assignment runtime object.  This is set!.
    Ccc.Assignment = (function () {
        var Assignment = function (symbol, expression) {
            this.symbol = symbol;
            this.expression = expression;
        };
        
        Assignment.prototype = new Ccc.Object();
        
        Assignment.prototype.toString = function () {
            return "#<assign: " + this.symbol + " = " + this.expression + ">";
        };
        
        Assignment.prototype.compile = function () {
            var ops = [OP.LOAD(this.symbol)];
            ops = ops.concat(this.expression.compile());
            ops.push(OP.SET(this.symbol));
            return ops;
        };
        
        return Assignment;
    }());
    
    // Primitive Quote runtime object.
    Ccc.Quote = (function () {
        var Quote = function (datum) {
            this.datum = datum;
        };
        
        Quote.prototype = new Ccc.Object();
        
        Quote.prototype.toString = function () {
            return "#<quote " + this.datum + ">";
        };
        
        // Quote simply pushes its datum onto the stack
        Quote.prototype.compile = function () {
            return [OP.PUSH(this.datum)];
        };
        
        return Quote;
    }());
    
    // Environment runtime object.  Environment holds a series of bindings
    // and optionally may have a parent environment which is used to
    // recursively resolve bindings.  Variable and syntax bindings are
    // stored and retrieved separately.
    Ccc.Environment = (function () {
        var builtins = {};
        
        var Environment = function (outer) {
            var k, syntax = {}, bindings = {}, gensymId = 0, self = this;
            
            this.syntax = syntax;
            this.bindings = bindings;
            
            if (typeof outer === 'undefined') {
                outer = null;
            }
            this.parent = outer;
            
            this.define = function (id, value) {
                bindings[id] = {value: value};
            };
            
            this.defineSyntax = function (id, value) {
                syntax[id] = value;
            };
            
            this.reserve = function (id) {
                bindings[id] = {value: Ccc.Unspecified};
            };
            
            this.set = function (id, value) {
                var v = this.tryGetLocation(id), last;
                if (typeof v === 'undefined') {
                    throw new Error("Unbound variable: " + id);
                }
                last = v.value;
                v.value = value;
                return last;
            };
            
            this.get = function (id) {
                var v = this.tryGet(id);
                if (v === null) {
                    throw new Error("Unbound variable: " + id);
                }
                return v;
            };
            
            this.tryGetLocation = function (id) {
                var local = bindings[id];
                return local || (outer && outer.tryGetLocation(id)) || builtins[id];
            };
            
            this.tryGet = function (id) {
                var local = bindings[id];
                return (local && local.value) || (outer && outer.tryGet(id)) || (builtins[id] && builtins[id].value) || null;
            };
            
            this.getSyntax = function (id) {
                var v = this.tryGetSyntax(id);
                if (v === null) {
                    throw new Error("Undefined keyword: " + id);
                }
                return v;
            };
            
            this.tryGetSyntax = function (id) {
                var local = syntax[id];
                return local || (outer && outer.tryGetSyntax(id)) || null;
            }
            
            this.clone = function () {
                return new Ccc.Environment(this);
            };
            
            this.getParent = function () {
                return outer;
            };
            
            this.gensym = function () {
                while (self.tryGetLocation("\x7f#" + gensymId) || self.tryGetSyntax("\x7f#" + gensymId)) {
                    gensymId += 1;
                }
                return "\x7f#" + gensymId;
            };

            this.builtins = builtins;
        };
        
        Environment.prototype = new Ccc.Object();
        
        Environment.prototype.toString = function () {
            return '#<environment>';
        };
        
        Environment.prototype.defineBuiltin = function (id, arity, fn, returnContinuation) {
            var i, ids = [], builtin;
            
            if (typeof arity === 'function') {
                returnContinuation = fn;
                fn = arity;
                arity = null;
            }
            
            if (typeof returnContinuation === 'undefined') {
                returnContinuation = false;
            }
            
            if (id instanceof Array) {
                ids = id.slice(1);
                id = id[0];
            }

            builtin = new Ccc.BuiltinProcedure(id, fn, arity, returnContinuation);
            this.define(id, builtin);
            for (i = 0; i < ids.length; i += 1) {
                this.define(ids[i], builtin);
            }
        };
        
        Environment.prototype.defineLibrary = function (library) {
            var name, o, arity, fn, aliases = {};
            for (name in library) {
                if (library.hasOwnProperty(name)) {
                    o = library[name];
                    if (o instanceof Function) {
                        fn = o;
                        arity = fn.length - 1;
                    }
                    else if (o instanceof Object) {
                        fn = o.fn;
                        if (o.hasOwnProperty('arity')) {
                            arity = o.arity;
                        }
                        else if (o.hasOwnProperty('minArity')) {
                            if (o.minArity === 0) {
                                arity = null;
                            }
                            else {
                                arity = -o.minArity;
                            }
                        }
                        else {
                            arity = fn.length - 1;
                        }
                    }
                    else if (o instanceof String) {
                        aliases[o] = name;
                    }
                    else {
                        throw new TypeError("Unexpected library entry: " + o);
                    }
                    if (!(o instanceof String)) {
                        if (!(fn instanceof Function)) {
                            throw new Error("Library entry must be an alias or provide an implementation function");
                        }
                        this.defineBuiltin(name, arity, fn);
                    }
                }
            }
            for (name in aliases) {
                if (aliases.hasOwnProperty(name)) {
                    if (!this.tryGet(aliases[name])) {
                        throw new Error("Unable to alias non-existent builtin '" + aliases[name] + "'");
                    }
                    this.define(name, this.get(aliases[name]));
                }
            }
        };

        return Environment;
    }());
    
    // Builtin procedure runtime object.  These applicables have an exact, minimum,
    // or unspecified arity, and they invoke a given JavaScript function when
    // called at runtime.  They may simply return an object to be pushed onto the stack
    // as a return value, or they may (if returnContinuation is true on construction)
    // return a new Continuation object.
    Ccc.BuiltinProcedure = (function () {
        var BuiltinProcedure = function (id, fn, arity, returnContinuation) {
            this.id = id;
            this.arity = arity;
            this.fn = fn;
            this.returnContinuation = returnContinuation;
        };
        
        BuiltinProcedure.prototype = new Ccc.Object();
        
        BuiltinProcedure.prototype.toString = function () {
            return '#<builtin-procedure:' + this.id + '>';
        };
        
        BuiltinProcedure.prototype.doApply = function (cont, args) {
            var result;
            if (this.arity != null && this.arity >= 0 && args.length !== this.arity) {
                throw new Error("Builtin procedure " + this.id + " requires exactly " + this.arity + " arguments, but was called with " + args.length + ".");
            }
            else if (this.arity < 0 && args.length < -this.arity) {
                throw new Error("Builtin procedure " + this.id + " requires at least " + (-this.arity) + " arguments, but was called with " + args.length + ".");
            }
            result = this.fn.apply(null, [cont].concat(args));
            if (this.returnContinuation) {
                return result;
            }
            
            if (typeof result === 'undefined') {
                result = Ccc.Unspecified;
            }
            cont.stack.push(result);
            return cont;
        };
        
        BuiltinProcedure.prototype.isApplicable = function () {
            return true;
        };
        
        return BuiltinProcedure;
    }());
    
    Ccc.TransformerSpec = (function () {
        var TransformerSpec = function (literals, rules) {
            this.literals = {};
            this.rules = rules;
            for (i = 0; i < literals.length; i += 1) {
                if (this.literals.hasOwnProperty(literals[i].id)) {
                    throw new Error("Duplicate literal in transformer spec");
                }
                this.literals[literals[i].id] = {};
            }
        }
        
        TransformerSpec.prototype = new Ccc.Object();
        
        TransformerSpec.prototype.expand = function (datum, environment) {
            var i, k, result;
            for (i = 0; i < this.rules.length; i += 1) {
                result = this.rules[i].tryExpand(this.literals, datum, environment);
                if (result !== null) {
                    return result;
                }
            }
            throw new Error("Ill-formed special form: " + datum);
        };
        
        TransformerSpec.prototype.getFreeReferences = function (environment) {
            var i, refs = [];
            for (i = 0; i < this.rules.length; i += 1) {
                refs = refs.concat(this.rules[i].getFreeReferences(this.literals, environment));
            }
            return refs;
        };
        
        TransformerSpec.prototype.replaceSymbols = function (map) {
            var i;
            for (i = 0; i < this.rules.length; i += 1) {
                this.rules[i].replaceSymbols(map);
            }
        };
        
        return TransformerSpec;
    }());
    
    Ccc.SyntaxRule = (function () {
        var SyntaxRule = function (pattern, template) {
            this.pattern = pattern;
            this.template = template;
        };
        
        SyntaxRule.prototype = new Ccc.Object();
        
        SyntaxRule.prototype.tryExpand = function (literals, datum, environment) {
            var captures, expansion;
            captures = this.pattern.match(literals, datum.cdr, environment);
            if (captures !== false) {
                if (this.template instanceof Function) {
                    expansion = this.template(captures, environment);
                }
                else {
                    expansion = this.template.expand(captures, environment);
                }
                if (expansion === null) {
                    throw new Error("Template expansion failed");
                }
                return expansion;
            }
            return null;
        };
        
        SyntaxRule.prototype.toString = function () {
            return "#<syntax-rule: " + this.pattern + " => " + this.template + ">";
        };
        
        SyntaxRule.prototype.getFreeReferences = function (literals, environment) {
            return this.template.getFreeReferences(this.pattern.getCaptureSymbols(literals), environment);
        };
        
        SyntaxRule.prototype.replaceSymbols = function (map) {
            this.template.replaceSymbols(map);
        };
        
        return SyntaxRule;
    }());
    
    Ccc.ListCapture = (function () {
        var ListCapture = function (datum) {
            this.datum = datum;
        };
        
        ListCapture.prototype.toString = function () {
            return "<list-capture:" + this.datum + ">";
        };
        
        ListCapture.prototype.generateExpansion = function () {
            var result;
            if (this.datum instanceof Ccc.Pair) {
                result = this.datum.car;
                this.datum = this.datum.cdr;
                if (this.datum === Ccc.Nil) {
                    this.datum = false;
                }
                return result;
            }
            if (this.datum === Ccc.Nil) {
                return false;
            }
            return this.datum;
        };
        
        ListCapture.prototype.getFreeReferences = function (environment) {
            return this.datum.getFreeReferences(environment);
        };
        
        ListCapture.prototype.replaceSymbols = function (map) {
            this.datum = this.datum.replaceSymbols(map);
            return this;
        };
        
        return ListCapture;
    }());
    
    Ccc.Pattern = (function () {
        var Pattern = function (datum) {
            this.datum = datum;
        };
        
        Pattern.prototype = new Ccc.Object();
        
        var mergeObject = function (src, dest) {
            var k;
            for (k in src) {
                if (src.hasOwnProperty(k)) {
                    dest[k] = src[k];
                }
            }
        };

        var captureNilSymbols = function (literals, o) {
            var symbols = {};
            while (o instanceof Ccc.Pair) {
                mergeObject(captureNilSymbols(literals, o.car), symbols);
                o = o.cdr;
            }
            if (o instanceof Ccc.Ellipsis) {
                mergeObject(captureNilSymbols(literals, o.datum), symbols);
            }
            if (o instanceof Ccc.Symbol && !literals.hasOwnProperty(o.id)) {
                symbols[o.id] = new Ccc.ListCapture(Ccc.Nil);
            }
            return symbols;
        };
        
        Pattern.prototype.getCaptureSymbols = function (literals) {
            return captureNilSymbols(literals, this.datum);
        }

        var matchDatum = function (p, literals, datum, environment) {
           var captures = {}, newListCaptures, capture, maxDepth, i;
           if (p instanceof Ccc.Pair) {
                do {
                    if (p.car instanceof Ccc.Ellipsis) {
                        if (p.cdr !== Ccc.Nil) {
                            throw new Error("Improper ... placement in syntax pattern");
                        }
                        if ((newListCaptures = matchDatum(p.car, literals, datum, environment)) === false) {
                            return false;
                        }
                        
                        mergeObject(newListCaptures, captures);
                        return captures;
                    }
                    if (!(datum instanceof Ccc.Pair)) {
                        return false;
                    }
                    if ((newListCaptures = matchDatum(p.car, literals, datum.car, environment)) === false) {
                        return false;
                    }
                    mergeObject(newListCaptures, captures);
                    p = p.cdr;
                    datum = datum.cdr;
                } while (p instanceof Ccc.Pair);
                if (p !== Ccc.Nil) {
                    if ((newListCaptures = matchDatum(p, literals, datum, environment)) === false) {
                        return false;
                    }
                    mergeObject(newListCaptures, captures);
                }
                else if (datum !== Ccc.Nil) {
                    return false;
                }
                return captures;
            }
            if (p instanceof Ccc.Vector) {
                if (!(datum instanceof Ccc.Vector)) {
                    return false;
                }
                for (i = 0; i < p.elements.length; i += 1) {
                    if (p.elements[i] instanceof Ccc.Ellipsis) {
                        if (i < p.elements.length - 1) {
                            throw new Error("Improper ... placement in syntax pattern");
                        }
                        if ((newListCaptures = matchDatum(Ccc.Pair.fromArray(p.elements.slice(i)), literals, Ccc.Pair.fromArray(datum.elements.slice(i)), environment)) === false) {
                            return false;
                        }
                        mergeObject(newListCaptures, captures);
                        return captures;
                    }
                    if (i >= datum.elements.length) {
                        return false;
                    }
                    if ((newListCaptures = matchDatum(p.elements[i], literals, datum.elements[i], environment)) === false) {
                        return false;
                    }
                }
                if (i < datum.elements.length) {
                    return false;
                }
                mergeObject(newListCaptures, captures);
                return captures;
            }
            if (p instanceof Ccc.Ellipsis) {
                if (datum === Ccc.Nil) {
                    return captureNilSymbols(literals, p.datum);
                }
                maxDepth = 0;
                while (datum instanceof Ccc.Pair) {
                    if ((newListCaptures = matchDatum(p.datum, literals, datum.car, environment)) === false) {
                        return false;
                    }
                    for (capture in newListCaptures) {
                        if (newListCaptures.hasOwnProperty(capture)) {
                            if (!captures.hasOwnProperty(capture)) {
                                captures[capture] = new Ccc.Pair(newListCaptures[capture], Ccc.Nil);
                            }
                            else {
                                captures[capture] = new Ccc.Pair(newListCaptures[capture], captures[capture]);
                            }
                        }
                    }
                    datum = datum.cdr;
                }
                if (datum !== Ccc.Nil) {
                    return false;
                }
                for (capture in captures) {
                    if (captures.hasOwnProperty(capture)) {
                        captures[capture] = new Ccc.ListCapture(captures[capture].reverse(), true);
                    }
                }
                return captures;
            }
            if (p instanceof Ccc.Symbol) {
                if (literals.hasOwnProperty(p.id)) {
                    return (datum instanceof Ccc.Symbol) && p.id === datum.id && !environment.tryGetLocation(p.id) && captures;
                }
                captures[p.id] = datum;
                return captures;
            }
            return p.isEqual(datum) && captures;
        };
        
        Pattern.prototype.match = function (literals, datum, environment) {
            return matchDatum(this.datum, literals, datum, environment);
        };
        
        Pattern.prototype.toString = function () {
            return "<" + this.datum + ">";
        };
        
        var transformListEllipses = function (o) {
            var result = [], prev = null;
            while (o instanceof Ccc.Pair) {
                if (o.car instanceof Ccc.Symbol && o.car.id === "...") {
                    if (prev === null || o.cdr !== Ccc.Nil) {
                        throw new Error("Improper placement of ... in syntax pattern");
                    }
                    result.pop();
                    prev = new Ccc.Ellipsis(prev);
                }
                else {
                    prev = transformEllipses(o.car);
                }
                result.push(prev);
                o = o.cdr;
            }
            return Ccc.Pair.fromArray(result, o);
        };
        
        var transformVectorEllipses = function (o) {
            var i, result = [], elt;
            for (i = 0; i < o.elements.length; i += 1) {
                elt = o.elements[i];
                if (elt instanceof Ccc.Symbol && elt.id === "...") {
                    if (prev === null || i < o.elements.length - 1) {
                        throw new Error("Improper placement of ... in syntax pattern");
                    }
                    result.pop();
                    prev = new Ccc.Ellipsis(prev);
                }
                else {
                    prev = transformEllipses(elt);
                }
                result.push(prev);
            }
            return new Ccc.Vector(result);
        };
        
        var transformEllipses = function (o) {
            if (o instanceof Ccc.Pair) {
                return transformListEllipses(o);
            }
            if (o instanceof Ccc.Vector) {
                return transformVectorEllipses(o);
            }
            return o;
        };
        
        Pattern.fromObject = function (o) {
            return new Ccc.Pattern(transformEllipses(o));
        };
        
        return Pattern;
    }());
    
    Ccc.Template = (function () {
        var Template = function (datum) {
            this.datum = datum;
        };
        
        Template.prototype = new Ccc.Object();
        
        var substituteListCaptures = function (o, captures) {
            var result = [], i;
            if (o instanceof Ccc.Pair) {
                do {
                    result.push(substituteListCaptures(o.car, captures));
                    o = o.cdr;
                } while (o instanceof Ccc.Pair);
                o = substituteListCaptures(o, captures);
                return Ccc.Pair.fromArray(result, o);
            }
            if (o instanceof Ccc.Vector) {
                for (i = 0; i < o.elements.length; i += 1) {
                    result.push(substituteListCaptures(o.elements[i], captures));
                }
                return new Ccc.Vector(result);
            }
            if (o instanceof Ccc.Symbol && captures.hasOwnProperty(o.id)) {
                if (captures[o.id] instanceof Ccc.ListCapture) {
                    return new Ccc.ListCapture(captures[o.id].datum);
                }
                return captures[o.id];
            }
            if (o instanceof Ccc.Ellipsis) {
                return new Ccc.Ellipsis(substituteListCaptures(o.datum, captures));
            }
            return o;
        }

        var generateClone = function (o, expansions) {
            var result = [], p, i;
            if (o instanceof Ccc.Pair) {
                while (o instanceof Ccc.Pair) {
                    p = generateClone(o.car, expansions);
                    if (p === false) {
                        return false;
                    }
                    if (p !== null) {
                        result.push(p);
                    }
                    o = o.cdr;
                }
                if (o !== Ccc.Nil) {
                    o = generateClone(o, expansions);
                    if (o === false) {
                        return false;
                    }
                }
                return Ccc.Pair.fromArray(result, o);
            }
            if (o instanceof Ccc.Vector) {
                for (i = 0; i < o.elements.length; i += 1) {
                    p = generateClone(o.elements[i], expansions);
                    if (p === false) {
                        return false;
                    }
                    if (p !== null) {
                        result.push(p);
                    }
                }
                return new Ccc.Vector(result);
            }
            if (o instanceof Ccc.ListCapture) {
                expansions.push(o);
                return o.generateExpansion();
            }
            if (o instanceof Ccc.Ellipsis) {
                return new Ccc.Ellipsis(generateClone(o.datum, expansions));
            }
            return o;
        };
        
        var expandList = function (datum) {
            var p, expansions = [], result = [];
            p = generateClone(datum, expansions);
            if (p === false) {
                return null;
            }
            while (p !== false && expansions.length > 0) {
                if (p !== null) {
                    result.push(p);
                }
                p = generateClone(datum, expansions);
            }
            if (expansions.length === 0 && p !== false) {
                throw new Error("Too many ellipses in syntax template");
            }
            return Ccc.Pair.fromArray(result);
       };
        
        var expandDatum = function (datum, captures) {
            var expansion, p, result = [], tail = Ccc.Nil, expansions = [], i;
            if (datum instanceof Ccc.Pair) {
                while (datum instanceof Ccc.Pair) {
                    expansion = expandDatum(datum.car, captures);
                    if (datum.car instanceof Ccc.Ellipsis) {
                        p = expansion;
                        while (p instanceof Ccc.Pair) {
                            result.push(p.car);
                            p = p.cdr;
                        }
                    }
                    else if (expansion !== null) {
                        result.push(expansion);
                    }
                    datum = datum.cdr;
                }
                if (datum !== Ccc.Nil) {
                    tail = expandDatum(datum, captures);
                }
                expansion = Ccc.Pair.fromArray(result, tail);
            }
            else if (datum instanceof Ccc.Vector) {
                for (i = 0; i < datum.elements.length; i += 1) {
                    p = datum.elements[i];
                    expansion = expandDatum(p, captures);
                    if (p instanceof Ccc.Ellipsis) {
                        p = expansion;
                        while (p instanceof Ccc.Pair) {
                            result.push(p.car);
                            p = p.cdr;
                        }
                    }
                    else if (expansion !== null) {
                        result.push(expansion);
                    }
                }
                expansion = new Ccc.Vector(result);
            }
            else if (datum instanceof Ccc.Ellipsis) {
                datum = expandList(datum.datum);
                if (datum === null) {
                    return null;
                }
                while (datum instanceof Ccc.Pair) {
                    result.push(expandDatum(datum.car, captures));
                    datum = datum.cdr;
                }
                expansion = Ccc.Pair.fromArray(result);
            }
            else if (datum instanceof Ccc.ListCapture) {
               expansion = datum.datum;
            }
            else {
                expansion = datum;
            }
            return expansion;
        }
        
        Template.prototype.expand = function (captures) {
            var datum, expansion;
            datum = substituteListCaptures(this.datum, captures);
            expansion = expandDatum(datum, captures);
            return expansion;
        };
        
        Template.prototype.toString = function () {
            return "!<" + this.datum + ">";
        };
 
        var transformListEllipses = function (o) {
            var result = [], prev = null;
            while (o instanceof Ccc.Pair) {
                if (o.car instanceof Ccc.Symbol && o.car.id === "...") {
                    if (prev === null) {
                        throw new Error("Improper placement of ... in syntax template");
                    }
                    result.pop();
                    prev = new Ccc.Ellipsis(prev);
                }
                else {
                    prev = transformEllipses(o.car);
                }
                result.push(prev);
                o = o.cdr;
            }
            return Ccc.Pair.fromArray(result, o);
        };
        
        var transformVectorEllipses = function (o) {
            var i, result = [], elt;
            for (i = 0; i < o.elements.length; i += 1) {
                elt = o.elements[i];
                if (elt instanceof Ccc.Symbol && elt.id === "...") {
                    if (prev === null) {
                        throw new Error("Improper placement of ... in syntax template");
                    }
                    result.pop();
                    prev = new Ccc.Ellipsis(prev);
                }
                else {
                    prev = transformEllipses(elt);
                }
                result.push(prev);
            }
            return new Ccc.Vector(result);
        };
        
        var transformEllipses = function (o) {
            if (o instanceof Ccc.Pair) {
                return transformListEllipses(o);
            }
            if (o instanceof Ccc.Vector) {
                return transformVectorEllipses(o);
            }
            return o;
        };
        
        Template.prototype.getFreeReferences = function (captures, environment) {
            var refs = this.datum.getFreeReferences(environment), result = [], i;
            for (i = 0; i < refs.length; i += 1) {
                if (!captures.hasOwnProperty(refs[i])) {
                    result.push(refs[i]);
                }
            }
            return result;
        };
        
        var replaceSymbols = function (datum, map) {
            var o, i;
            if (datum instanceof Ccc.Symbol && map.hasOwnProperty(datum.id)) {
                return map[datum.id];
            }
            if (datum instanceof Ccc.Pair) {
                o = datum;
                while (o instanceof Ccc.Pair) {
                    o.car = replaceSymbols(o.car, map);
                    if (o.cdr !== Ccc.Pair && o.cdr !== Ccc.Nil) {
                        o.cdr = replaceSymbols(o.cdr, map);
                    }
                    o = o.cdr;
                }
            }
            if (datum instanceof Ccc.Vector) {
                for (i = 0; i < datum.elements.length; i += 1) {
                    datum.elements[i] = replaceSymbols(datum.elements[i], map);
                }
            }
            if (datum instanceof Ccc.Ellipsis) {
                datum.datum = replaceSymbols(datum.datum, map);
            }
            return datum;
        };
        
        Template.prototype.replaceSymbols = function (map) {
            this.datum = replaceSymbols(this.datum, map);
        };
      
        Template.fromObject = function (o) {
            return new Ccc.Template(transformEllipses(o));
        };
        
        return Template;
    }());

    Ccc.Ellipsis = (function () {
        var Ellipsis = function (datum) {
            this.datum = datum;
        };
        
        Ellipsis.prototype = new Ccc.Object();
        
        Ellipsis.prototype.toString = function () {
            return this.datum + "...";
        };
        
        return Ellipsis;
    }());
    
    Ccc.Continuation = (function () {
        var Continuation = function (env, block, index, stack, outer, guards) {
            this.env = env;
            this.block = block;
            this.index = index;
            this.stack = stack;
            this.outer = outer;
            this.guards = guards || (outer && outer.guards.slice()) || [];
        };
        
        Continuation.prototype = new Ccc.Object();
        
        Continuation.prototype.toString = function () {
            return "#<continuation>";
        };
        
        Continuation.prototype.doApply = function (cont, args) {
            var i, newStack;
            if (args.length !== 1) {
                throw new Error(this + " requires exactly " + this.numArgs + " arguments, but was called with " + args.length);
            }
            newStack = this.stack.concat(args[0]);
            return new Ccc.Continuation(this.env, this.block, this.index, newStack, this.outer, this.guards.slice());
        };
        
        Continuation.prototype.isApplicable = function () {
            return true;
        };
        
        Continuation.prototype.addGuard = function (guard) {
            this.guards.push(guard);
        };
        
        return Continuation;
    }());
    
    Ccc.Guard = (function () {
        var Guard = function (before, after) {
            this.before = before;
            this.after = after;
        };
        
        Guard.prototype = new Ccc.Object();
        
        return Guard;
    }());
    
    Ccc.CompiledClosure = (function () {
        var CompiledClosure = function (values) {
            this.values = values;
        };
        
        CompiledClosure.prototype = new Ccc.Object();
        
        CompiledClosure.prototype.toString = function () {
            return "#<compiled-closure:" + this.values + ">";
        };
        
        CompiledClosure.prototype.doApply = function (cont) {
            return cont.doApply(cont, this.values);
        };
        
        CompiledClosure.prototype.isApplicable = function () {
            return true;
        };
        
        return CompiledClosure;
    }());
    
    Ccc.Compiler = (function () {
        var Compiler = function (options) {
            this.options = options || {};
        };
        
        Compiler.prototype.compile = function (code) {
            var program, start, compiled, transformed, env = Ccc.NullEnvironment.clone();
            start = new Date();
            program = Ccc.Parser.parse(code);
            transformed = program.transform(env);
            compiled = transformed.compile();
            if (this.options.timer) {
                console.log("Compilation completed in " + (new Date() - start) + " ms");
            }
            
            return compiled;
        };
        
        return Compiler;
    }());
    
    Ccc.OpCodes = {};
    var OP = Ccc.OpCodes;

    var mkOp = function (op) {
        Ccc.OpCodes[op] = function(arg) {
            return {
                op: op,
                arg: arg,
                toString: function () {
                    return '<' + op + ((typeof arg === 'undefined') ? '' : ':' + arg) + '>';
                }
            };
        };
    };

    mkOp('PUSH');
    mkOp('POP');
    mkOp('DUP');
    mkOp('JMP');
    mkOp('JMPF');
    mkOp('RET');
    mkOp('CAP');
    mkOp('RES');
    mkOp('SET');
    mkOp('LOAD');
    mkOp('APPLY');
    mkOp('APPLYT');
    mkOp('APPLYV');
    mkOp('ENTER');
    mkOp('LEAVE');
    mkOp('EVAL');

    Ccc.Vm = (function () {
        var Vm = function (options) {
            var ops, env = Ccc.NullEnvironment.clone(), step, executeBlock;
            
            options = options || {};
            
            ops = {
                PUSH: function (cont, object) {
                    cont.stack.push(object);
                    cont.index += 1;
                    return cont;
                },
                POP: function (cont) {
                    cont.stack.pop();
                    cont.index += 1;
                    return cont;
                },
                DUP: function (cont) {
                    var top = cont.stack[cont.stack.length - 1];
                    cont.stack.push(top);
                    cont.index += 1;
                    return cont;
                },
                JMP: function (cont, n) {
                    cont.index += n + 1;
                    return cont;
                },
                JMPF: function (cont, n) {
                    var top = cont.stack.pop();
                    if (top === Ccc.False) {
                        cont.index += n;
                    }
                    cont.index += 1;
                    return cont;
                },
                RET: function (cont) {
                    var outer;
                    if (!(cont.outer instanceof Ccc.Continuation)) {
                        throw new Error("Invalid RET operation");
                    }
                    outer = cont.outer;
                    return new Ccc.Continuation(outer.env, outer.block, outer.index, cont.stack.slice(), outer.outer, outer.guards);
                },
                CAP: function (cont) {
                    var top = cont.stack.pop();
                    top = top.bind(cont.env);
                    cont.stack.push(top);
                    cont.index += 1;
                    return cont;
                },
                RES: function (cont, symbol) {
                    cont.env.reserve(symbol.id);
                    cont.index += 1;
                    return cont;
                },
                SET: function (cont, symbol) {
                    var top = cont.stack.pop();
                    cont.env.set(symbol.id, top);
                    cont.index += 1;
                    return cont;
                },
                LOAD: function (cont, symbol) {
                    cont.stack.push(cont.env.get(symbol.id));
                    cont.index += 1;
                    return cont;
                },
                APPLY: function (cont, n) {
                    var args = [], i, fn, result;
                    fn = cont.stack.pop();
                    if (!fn.isApplicable()) {
                        throw new Error("Object " + fn + " is not applicable");
                    }
                    for (i = 0; i < n; i += 1) {
                        args.unshift(cont.stack.pop());
                    }
                    cont.index += 1;
                    return fn.doApply.call(fn, cont, args);
                },
                APPLYT: function (cont, n) {
                    var args = [], i, fn, result, outer, newCont;
                    fn = cont.stack.pop();
                    if (!fn.isApplicable()) {
                        throw new Error("Object " + fn + " is not applicable");
                    }
                    for (i = 0; i < n; i += 1) {
                        args.unshift(cont.stack.pop());
                    }
                    newCont = fn.doApply.call(fn, cont.outer, args);
                    newCont.guards = newCont.guards.concat(cont.guards);
                    return newCont;
                },
                APPLYV: function (cont) {
                    var fn = cont.stack.pop(),
                        value = cont.stack.pop();
                    if (!fn.isApplicable()) {
                        throw new Error("Object " + fn + " is not applicable");
                    }
                    cont.index += 1;
                    return fn.doApply.call(fn, cont, (value instanceof Ccc.CompiledClosure) ? value.values : value);
                },
                ENTER: function (cont) {
                    cont.env = cont.env.clone();
                    cont.index += 1;
                    return cont;
                },
                LEAVE: function (cont) {
                    var parent = cont.env.getParent();
                    if (parent === null) {
                        throw new Error("Invalid LEAVE operation");
                    }
                    cont.env = parent;
                    cont.index += 1;
                    return cont;
                },
                EVAL: function (cont, environment) {
                    var datum = cont.stack.pop(), ops;
                    ops = datum.transform(environment).compile();
                    ops.push(OP.RET());
                    cont.index += 1;
                    return new Ccc.Continuation(environment, ops, 0, cont.stack, cont);
                },
            };

            var guardContinuation = function (newCont, oldCont) {
                var ops = [], inGuards = [], outGuards = [], i;
                for (i = oldCont.guards.length - 1; i >= 0; i -= 1) {
                    if (newCont.guards.indexOf(oldCont.guards[i]) < 0) {
                        outGuards.push(oldCont.guards[i]);
                    }
                }
                for (i = 0; i < newCont.guards.length; i += 1) {
                    if (oldCont.guards.indexOf(newCont.guards[i]) < 0) {
                        inGuards.push(newCont.guards[i]);
                    }
                }
                for (i = 0; i < outGuards.length; i += 1) {
                    ops = ops.concat(OP.PUSH(outGuards[i].after), OP.APPLY(0), OP.POP());
                }
                for (i = 0; i < inGuards.length; i += 1) {
                    ops = ops.concat(OP.PUSH(inGuards[i].before), OP.APPLY(0), OP.POP());
                }
                if (ops.length === 0) {
                    return newCont;
                }
                ops.push(OP.RET());
                return new Ccc.Continuation(newCont.env, ops, 0, newCont.stack, newCont);
            };
            
            var executeBlock = function (block) {
                var op, cont, oldCont, newCont, windOps, newThunks, oldThunks, i;
                cont = new Ccc.Continuation(env, block, 0, [], null);
                while (cont.index < cont.block.length) {
                    instruction = cont.block[cont.index];
                    if (!ops.hasOwnProperty(instruction.op)) {
                        throw new Error("Invalid instruction: " + instruction);
                    }
                    cont = guardContinuation(ops[instruction.op](cont, instruction.arg), cont);
                }
                return cont.stack;
            };

            this.execute = function (program) {
                var i, result, start;
                if (options.debug) {
                    console.log(';-------------------------------------------');
                    for (i = 0; i < program.length; i += 1) {
                        console.log(program[i].toString());
                    }
                }
                if (options.logging) {
                    console.log(';===========================================');
                }
                
                start = new Date();
                for (i = 0; i < program.length; i += 1) {
                    result = executeBlock(program[i]);
                    if (options.logging) {
                        if (result.length === 0) {
                            console.log(Ccc.Unspecified);
                        }
                        else {
                            console.log(result[result.length - 1].toString());
                        }
                    }
                }
                
                if (options.timer) {
                    console.log("Execution completed in " + (new Date() - start) + " ms.");
                }
                
                return result;
            };
        };

        return Vm;
    }());
    
    // The null environment - will contain only builtin keywords
    Ccc.NullEnvironment = new Ccc.Environment();
    
    return Ccc;
}());
Ccc.Parser = (function(){
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */
  
  function quote(s) {
    /*
     * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
     * string literal except for the closing quote character, backslash,
     * carriage return, line separator, paragraph separator, and line feed.
     * Any character may appear in the form of an escape sequence.
     *
     * For portability, we also escape escape all control and non-ASCII
     * characters. Note that "\0" and "\v" escape sequences are not used
     * because JSHint does not like the first and IE the second.
     */
     return '"' + s
      .replace(/\\/g, '\\\\')  // backslash
      .replace(/"/g, '\\"')    // closing quote character
      .replace(/\x08/g, '\\b') // backspace
      .replace(/\t/g, '\\t')   // horizontal tab
      .replace(/\n/g, '\\n')   // line feed
      .replace(/\f/g, '\\f')   // form feed
      .replace(/\r/g, '\\r')   // carriage return
      .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, escape)
      + '"';
  }
  
  var result = {
    /*
     * Parses the input with a generated parser. If the parsing is successfull,
     * returns a value explicitly or implicitly specified by the grammar from
     * which the parser was generated (see |PEG.buildParser|). If the parsing is
     * unsuccessful, throws |PEG.parser.SyntaxError| describing the error.
     */
    parse: function(input, startRule) {
      var parseFunctions = {
        "start": parse_start,
        "space": parse_space,
        "nothing": parse_nothing,
        "WS": parse_WS,
        "DL": parse_DL,
        "comment": parse_comment,
        "symbol": parse_symbol,
        "initial": parse_initial,
        "letter": parse_letter,
        "special_initial": parse_special_initial,
        "subsequent": parse_subsequent,
        "digit": parse_digit,
        "special_subsequent": parse_special_subsequent,
        "peculiar_identifier": parse_peculiar_identifier,
        "boolean": parse_boolean,
        "character": parse_character,
        "string": parse_string,
        "escape_sequence": parse_escape_sequence,
        "string_element": parse_string_element,
        "quoted_symbol": parse_quoted_symbol,
        "symbol_element": parse_symbol_element,
        "null_value": parse_null_value,
        "unspecific": parse_unspecific,
        "number": parse_number,
        "suffix": parse_suffix,
        "exponent_marker": parse_exponent_marker,
        "sign": parse_sign,
        "exactness": parse_exactness,
        "num_2": parse_num_2,
        "complex_2": parse_complex_2,
        "real_2": parse_real_2,
        "ureal_2": parse_ureal_2,
        "uinteger_2": parse_uinteger_2,
        "prefix_2": parse_prefix_2,
        "radix_2": parse_radix_2,
        "digit_2": parse_digit_2,
        "num_8": parse_num_8,
        "complex_8": parse_complex_8,
        "real_8": parse_real_8,
        "ureal_8": parse_ureal_8,
        "uinteger_8": parse_uinteger_8,
        "prefix_8": parse_prefix_8,
        "radix_8": parse_radix_8,
        "digit_8": parse_digit_8,
        "num_10": parse_num_10,
        "complex_10": parse_complex_10,
        "real_10": parse_real_10,
        "ureal_10": parse_ureal_10,
        "decimal_10": parse_decimal_10,
        "uinteger_10": parse_uinteger_10,
        "prefix_10": parse_prefix_10,
        "radix_10": parse_radix_10,
        "num_16": parse_num_16,
        "complex_16": parse_complex_16,
        "real_16": parse_real_16,
        "ureal_16": parse_ureal_16,
        "uinteger_16": parse_uinteger_16,
        "prefix_16": parse_prefix_16,
        "radix_16": parse_radix_16,
        "digit_16": parse_digit_16,
        "datum": parse_datum,
        "simple_datum": parse_simple_datum,
        "compound_datum": parse_compound_datum,
        "list": parse_list,
        "abbreviation": parse_abbreviation,
        "vector": parse_vector,
        "program": parse_program
      };
      
      if (startRule !== undefined) {
        if (parseFunctions[startRule] === undefined) {
          throw new Error("Invalid rule name: " + quote(startRule) + ".");
        }
      } else {
        startRule = "start";
      }
      
      var pos = { offset: 0, line: 1, column: 1, seenCR: false };
      var reportFailures = 0;
      var rightmostFailuresPos = { offset: 0, line: 1, column: 1, seenCR: false };
      var rightmostFailuresExpected = [];
      
      function padLeft(input, padding, length) {
        var result = input;
        
        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }
        
        return result;
      }
      
      function escape(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;
        
        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }
        
        return '\\' + escapeChar + padLeft(charCode.toString(16).toUpperCase(), '0', length);
      }
      
      function clone(object) {
        var result = {};
        for (var key in object) {
          result[key] = object[key];
        }
        return result;
      }
      
      function advance(pos, n) {
        var endOffset = pos.offset + n;
        
        for (var offset = pos.offset; offset < endOffset; offset++) {
          var ch = input.charAt(offset);
          if (ch === "\n") {
            if (!pos.seenCR) { pos.line++; }
            pos.column = 1;
            pos.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            pos.line++;
            pos.column = 1;
            pos.seenCR = true;
          } else {
            pos.column++;
            pos.seenCR = false;
          }
        }
        
        pos.offset += n;
      }
      
      function matchFailed(failure) {
        if (pos.offset < rightmostFailuresPos.offset) {
          return;
        }
        
        if (pos.offset > rightmostFailuresPos.offset) {
          rightmostFailuresPos = clone(pos);
          rightmostFailuresExpected = [];
        }
        
        rightmostFailuresExpected.push(failure);
      }
      
      function parse_start() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_WS();
        if (result0 !== null) {
          result1 = parse_program();
          if (result1 !== null) {
            result2 = parse_WS();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, p) { return p; })(pos0.offset, pos0.line, pos0.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_space() {
        var result0;
        
        if (/^[ \t\f\r\n\x0B\xA0\u2000-\u200B\u2028\u2029\u202F\u3000]/.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[ \\t\\f\\r\\n\\x0B\\xA0\\u2000-\\u200B\\u2028\\u2029\\u202F\\u3000]");
          }
        }
        return result0;
      }
      
      function parse_nothing() {
        var result0;
        
        result0 = parse_space();
        if (result0 === null) {
          result0 = parse_comment();
        }
        return result0;
      }
      
      function parse_WS() {
        var result0, result1;
        var pos0;
        
        pos0 = clone(pos);
        result0 = [];
        result1 = parse_nothing();
        while (result1 !== null) {
          result0.push(result1);
          result1 = parse_nothing();
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column) { return ''; })(pos0.offset, pos0.line, pos0.column);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_DL() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        reportFailures++;
        if (/^[ \t\f\r\n();[\]"]/.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[ \\t\\f\\r\\n();[\\]\"]");
          }
        }
        reportFailures--;
        if (result0 !== null) {
          result0 = "";
          pos = clone(pos1);
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = parse_WS();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos0);
          }
        } else {
          result0 = null;
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          reportFailures++;
          if (input.length > pos.offset) {
            result0 = input.charAt(pos.offset);
            advance(pos, 1);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("any character");
            }
          }
          reportFailures--;
          if (result0 === null) {
            result0 = "";
          } else {
            result0 = null;
            pos = clone(pos0);
          }
        }
        return result0;
      }
      
      function parse_comment() {
        var result0, result1, result2;
        var pos0;
        
        pos0 = clone(pos);
        if (input.charCodeAt(pos.offset) === 59) {
          result0 = ";";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\";\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          if (/^[^\n\r]/.test(input.charAt(pos.offset))) {
            result2 = input.charAt(pos.offset);
            advance(pos, 1);
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("[^\\n\\r]");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (/^[^\n\r]/.test(input.charAt(pos.offset))) {
              result2 = input.charAt(pos.offset);
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[^\\n\\r]");
              }
            }
          }
          if (result1 !== null) {
            if (/^[\n\r]/.test(input.charAt(pos.offset))) {
              result2 = input.charAt(pos.offset);
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("[\\n\\r]");
              }
            }
            result2 = result2 !== null ? result2 : "";
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos0);
            }
          } else {
            result0 = null;
            pos = clone(pos0);
          }
        } else {
          result0 = null;
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          if (input.substr(pos.offset, 2) === "#;") {
            result0 = "#;";
            advance(pos, 2);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"#;\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_WS();
            if (result1 !== null) {
              result2 = parse_datum();
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = clone(pos0);
              }
            } else {
              result0 = null;
              pos = clone(pos0);
            }
          } else {
            result0 = null;
            pos = clone(pos0);
          }
        }
        return result0;
      }
      
      function parse_symbol() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        if (input.charCodeAt(pos.offset) === 955) {
          result0 = "\u03BB";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\u03BB\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column) {
                return new Ccc.Symbol("lambda");
            })(pos0.offset, pos0.line, pos0.column);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result0 = parse_initial();
          if (result0 !== null) {
            result1 = [];
            result2 = parse_subsequent();
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_subsequent();
            }
            if (result1 !== null) {
              result2 = parse_DL();
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, i, j) {
                  return new Ccc.Symbol(i + j.join(""));
              })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            pos1 = clone(pos);
            result0 = parse_peculiar_identifier();
            if (result0 !== null) {
              result1 = parse_DL();
              if (result1 !== null) {
                result0 = [result0, result1];
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column, i) {
                    return new Ccc.Symbol(i);
                })(pos0.offset, pos0.line, pos0.column, result0[0]);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
            if (result0 === null) {
              result0 = parse_quoted_symbol();
            }
          }
        }
        return result0;
      }
      
      function parse_initial() {
        var result0;
        
        result0 = parse_letter();
        if (result0 === null) {
          result0 = parse_special_initial();
        }
        return result0;
      }
      
      function parse_letter() {
        var result0;
        
        if (/^[a-z]/i.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[a-z]i");
          }
        }
        return result0;
      }
      
      function parse_special_initial() {
        var result0, result1;
        var pos0, pos1, pos2;
        
        if (/^[!$%&*\/:<=>?^_~]/.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[!$%&*\\/:<=>?^_~]");
          }
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          pos2 = clone(pos);
          reportFailures++;
          result0 = parse_space();
          reportFailures--;
          if (result0 === null) {
            result0 = "";
          } else {
            result0 = null;
            pos = clone(pos2);
          }
          if (result0 !== null) {
            if (/^[\x80-\uFFFF]/.test(input.charAt(pos.offset))) {
              result1 = input.charAt(pos.offset);
              advance(pos, 1);
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("[\\x80-\\uFFFF]");
              }
            }
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, c) { return c; })(pos0.offset, pos0.line, pos0.column, result0[1]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        return result0;
      }
      
      function parse_subsequent() {
        var result0;
        
        result0 = parse_initial();
        if (result0 === null) {
          result0 = parse_digit();
          if (result0 === null) {
            result0 = parse_special_subsequent();
          }
        }
        return result0;
      }
      
      function parse_digit() {
        var result0;
        
        if (/^[0-9]/.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[0-9]");
          }
        }
        return result0;
      }
      
      function parse_special_subsequent() {
        var result0;
        
        if (input.charCodeAt(pos.offset) === 43) {
          result0 = "+";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"+\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos.offset) === 45) {
            result0 = "-";
            advance(pos, 1);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result0 === null) {
            if (input.charCodeAt(pos.offset) === 46) {
              result0 = ".";
              advance(pos, 1);
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result0 === null) {
              if (input.charCodeAt(pos.offset) === 64) {
                result0 = "@";
                advance(pos, 1);
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"@\"");
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_peculiar_identifier() {
        var result0;
        
        if (input.charCodeAt(pos.offset) === 43) {
          result0 = "+";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"+\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos.offset) === 45) {
            result0 = "-";
            advance(pos, 1);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
          if (result0 === null) {
            if (input.substr(pos.offset, 3) === "...") {
              result0 = "...";
              advance(pos, 3);
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"...\"");
              }
            }
          }
        }
        return result0;
      }
      
      function parse_boolean() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.substr(pos.offset, 2).toLowerCase() === "#t") {
          result0 = input.substr(pos.offset, 2);
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#t\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_DL();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column) { return Ccc.True; })(pos0.offset, pos0.line, pos0.column);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          if (input.substr(pos.offset, 2).toLowerCase() === "#f") {
            result0 = input.substr(pos.offset, 2);
            advance(pos, 2);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"#f\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_DL();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column) { return Ccc.False; })(pos0.offset, pos0.line, pos0.column);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        return result0;
      }
      
      function parse_character() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.substr(pos.offset, 7).toLowerCase() === "#\\space") {
          result0 = input.substr(pos.offset, 7);
          advance(pos, 7);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#\\\\space\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_DL();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column) { return new Ccc.Character(" "); })(pos0.offset, pos0.line, pos0.column);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          if (input.substr(pos.offset, 9).toLowerCase() === "#\\newline") {
            result0 = input.substr(pos.offset, 9);
            advance(pos, 9);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"#\\\\newline\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_DL();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column) { return new Ccc.Character("\n"); })(pos0.offset, pos0.line, pos0.column);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            pos1 = clone(pos);
            if (input.substr(pos.offset, 2) === "#\\") {
              result0 = "#\\";
              advance(pos, 2);
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"#\\\\\"");
              }
            }
            if (result0 !== null) {
              if (input.length > pos.offset) {
                result1 = input.charAt(pos.offset);
                advance(pos, 1);
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("any character");
                }
              }
              if (result1 !== null) {
                result2 = parse_DL();
                if (result2 !== null) {
                  result0 = [result0, result1, result2];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column, c) { return new Ccc.Character(c); })(pos0.offset, pos0.line, pos0.column, result0[1]);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
          }
        }
        return result0;
      }
      
      function parse_string() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.charCodeAt(pos.offset) === 34) {
          result0 = "\"";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\\"\"");
          }
        }
        if (result0 !== null) {
          result1 = [];
          result2 = parse_string_element();
          while (result2 !== null) {
            result1.push(result2);
            result2 = parse_string_element();
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos.offset) === 34) {
              result2 = "\"";
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"\\\"\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, chars) {
                return new Ccc.String(chars.join(""));
            })(pos0.offset, pos0.line, pos0.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_escape_sequence() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = clone(pos);
        if (input.substr(pos.offset, 2) === "\\\\") {
          result0 = "\\\\";
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"\\\\\\\\\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column) { return "\\"; })(pos0.offset, pos0.line, pos0.column);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          if (input.substr(pos.offset, 2) === "\\n") {
            result0 = "\\n";
            advance(pos, 2);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\\\n\"");
            }
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column) { return "\n"; })(pos0.offset, pos0.line, pos0.column);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            if (input.substr(pos.offset, 2) === "\\t") {
              result0 = "\\t";
              advance(pos, 2);
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"\\\\t\"");
              }
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column) { return "\t"; })(pos0.offset, pos0.line, pos0.column);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
            if (result0 === null) {
              pos0 = clone(pos);
              if (input.substr(pos.offset, 2) === "\\f") {
                result0 = "\\f";
                advance(pos, 2);
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"\\\\f\"");
                }
              }
              if (result0 !== null) {
                result0 = (function(offset, line, column) { return "\f"; })(pos0.offset, pos0.line, pos0.column);
              }
              if (result0 === null) {
                pos = clone(pos0);
              }
              if (result0 === null) {
                pos0 = clone(pos);
                if (input.substr(pos.offset, 2) === "\\r") {
                  result0 = "\\r";
                  advance(pos, 2);
                } else {
                  result0 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"\\\\r\"");
                  }
                }
                if (result0 !== null) {
                  result0 = (function(offset, line, column) { return "\r"; })(pos0.offset, pos0.line, pos0.column);
                }
                if (result0 === null) {
                  pos = clone(pos0);
                }
                if (result0 === null) {
                  pos0 = clone(pos);
                  if (input.substr(pos.offset, 2) === "\\'") {
                    result0 = "\\'";
                    advance(pos, 2);
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"\\\\'\"");
                    }
                  }
                  if (result0 !== null) {
                    result0 = (function(offset, line, column) { return "'"; })(pos0.offset, pos0.line, pos0.column);
                  }
                  if (result0 === null) {
                    pos = clone(pos0);
                  }
                  if (result0 === null) {
                    pos0 = clone(pos);
                    if (input.substr(pos.offset, 2) === "\\\"") {
                      result0 = "\\\"";
                      advance(pos, 2);
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"\\\\\\\"\"");
                      }
                    }
                    if (result0 !== null) {
                      result0 = (function(offset, line, column) { return "\""; })(pos0.offset, pos0.line, pos0.column);
                    }
                    if (result0 === null) {
                      pos = clone(pos0);
                    }
                    if (result0 === null) {
                      pos0 = clone(pos);
                      pos1 = clone(pos);
                      if (input.substr(pos.offset, 2) === "\\x") {
                        result0 = "\\x";
                        advance(pos, 2);
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"\\\\x\"");
                        }
                      }
                      if (result0 !== null) {
                        result1 = parse_digit_16();
                        if (result1 !== null) {
                          result2 = parse_digit_16();
                          if (result2 !== null) {
                            result0 = [result0, result1, result2];
                          } else {
                            result0 = null;
                            pos = clone(pos1);
                          }
                        } else {
                          result0 = null;
                          pos = clone(pos1);
                        }
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                      if (result0 !== null) {
                        result0 = (function(offset, line, column, a, b) {
                              return String.fromCharCode(parseInt(a + b, 16));
                          })(pos0.offset, pos0.line, pos0.column, result0[1], result0[2]);
                      }
                      if (result0 === null) {
                        pos = clone(pos0);
                      }
                      if (result0 === null) {
                        pos0 = clone(pos);
                        pos1 = clone(pos);
                        if (input.substr(pos.offset, 2) === "\\u") {
                          result0 = "\\u";
                          advance(pos, 2);
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"\\\\u\"");
                          }
                        }
                        if (result0 !== null) {
                          result1 = parse_digit_16();
                          if (result1 !== null) {
                            result2 = parse_digit_16();
                            if (result2 !== null) {
                              result3 = parse_digit_16();
                              if (result3 !== null) {
                                result4 = parse_digit_16();
                                if (result4 !== null) {
                                  result0 = [result0, result1, result2, result3, result4];
                                } else {
                                  result0 = null;
                                  pos = clone(pos1);
                                }
                              } else {
                                result0 = null;
                                pos = clone(pos1);
                              }
                            } else {
                              result0 = null;
                              pos = clone(pos1);
                            }
                          } else {
                            result0 = null;
                            pos = clone(pos1);
                          }
                        } else {
                          result0 = null;
                          pos = clone(pos1);
                        }
                        if (result0 !== null) {
                          result0 = (function(offset, line, column, a, b, c, d) {
                                return String.fromCharCode(parseInt(a + b + c + d, 16));
                            })(pos0.offset, pos0.line, pos0.column, result0[1], result0[2], result0[3], result0[4]);
                        }
                        if (result0 === null) {
                          pos = clone(pos0);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_string_element() {
        var result0;
        
        if (/^[^"\\]/.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[^\"\\\\]");
          }
        }
        if (result0 === null) {
          result0 = parse_escape_sequence();
        }
        return result0;
      }
      
      function parse_quoted_symbol() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.charCodeAt(pos.offset) === 124) {
          result0 = "|";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"|\"");
          }
        }
        if (result0 !== null) {
          result2 = parse_symbol_element();
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              result2 = parse_symbol_element();
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos.offset) === 124) {
              result2 = "|";
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"|\"");
              }
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, chars) {
                return new Ccc.Symbol(chars.join(""));
            })(pos0.offset, pos0.line, pos0.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_symbol_element() {
        var result0;
        var pos0;
        
        if (/^[^|\\]/.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[^|\\\\]");
          }
        }
        if (result0 === null) {
          pos0 = clone(pos);
          if (input.substr(pos.offset, 2) === "\\|") {
            result0 = "\\|";
            advance(pos, 2);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"\\\\|\"");
            }
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column) { return "|"; })(pos0.offset, pos0.line, pos0.column);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            result0 = parse_escape_sequence();
          }
        }
        return result0;
      }
      
      function parse_null_value() {
        var result0;
        var pos0;
        
        pos0 = clone(pos);
        if (input.substr(pos.offset, 2) === "()") {
          result0 = "()";
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"()\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column) { return Ccc.Nil; })(pos0.offset, pos0.line, pos0.column);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          if (input.substr(pos.offset, 2) === "[]") {
            result0 = "[]";
            advance(pos, 2);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"[]\"");
            }
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column) { return Ccc.Nil; })(pos0.offset, pos0.line, pos0.column);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        return result0;
      }
      
      function parse_unspecific() {
        var result0;
        var pos0;
        
        pos0 = clone(pos);
        if (input.substr(pos.offset, 12) === "#!unspecific") {
          result0 = "#!unspecific";
          advance(pos, 12);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#!unspecific\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column) { return Ccc.Unspecified; })(pos0.offset, pos0.line, pos0.column);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_number() {
        var result0;
        
        result0 = parse_num_2();
        if (result0 === null) {
          result0 = parse_num_8();
          if (result0 === null) {
            result0 = parse_num_10();
            if (result0 === null) {
              result0 = parse_num_16();
            }
          }
        }
        return result0;
      }
      
      function parse_suffix() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_exponent_marker();
        if (result0 !== null) {
          result1 = parse_sign();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result3 = parse_digit();
            if (result3 !== null) {
              result2 = [];
              while (result3 !== null) {
                result2.push(result3);
                result3 = parse_digit();
              }
            } else {
              result2 = null;
            }
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, e, s, d) {
                var val = parseInt(d.join(""), 10);
                if (s === "-") {
                    val = -val;
                }
                e = {s: 0, e: 1, f: 1, d: 2, l: 3}[e];
                return { precision: e, value: val };
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1], result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_exponent_marker() {
        var result0;
        
        if (/^[esfdl]/i.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[esfdl]i");
          }
        }
        return result0;
      }
      
      function parse_sign() {
        var result0;
        
        if (input.charCodeAt(pos.offset) === 43) {
          result0 = "+";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"+\"");
          }
        }
        if (result0 === null) {
          if (input.charCodeAt(pos.offset) === 45) {
            result0 = "-";
            advance(pos, 1);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"-\"");
            }
          }
        }
        return result0;
      }
      
      function parse_exactness() {
        var result0;
        var pos0;
        
        pos0 = clone(pos);
        if (input.substr(pos.offset, 2).toLowerCase() === "#i") {
          result0 = input.substr(pos.offset, 2);
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#i\"");
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column) { return false; })(pos0.offset, pos0.line, pos0.column);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          if (input.substr(pos.offset, 2).toLowerCase() === "#e") {
            result0 = input.substr(pos.offset, 2);
            advance(pos, 2);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"#e\"");
            }
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column) { return true; })(pos0.offset, pos0.line, pos0.column);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        return result0;
      }
      
      function parse_num_2() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_prefix_2();
        if (result0 !== null) {
          result1 = parse_complex_2();
          if (result1 !== null) {
            result2 = parse_DL();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, e, n) {
                if (e === true) {
                    return n.toExact();
                }
                else if (e === false) {
                    return n.toInexact();
                }
                else {
                    return n;
                }
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_complex_2() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_real_2();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 64) {
            result1 = "@";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"@\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_real_2();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, r, a) { return Ccc.Numeric.fromPolar(r.toInexact().realNumer, a.toInexact().realNumer); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result0 = parse_real_2();
          if (result0 !== null) {
            if (input.charCodeAt(pos.offset) === 43) {
              result1 = "+";
              advance(pos, 1);
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"+\"");
              }
            }
            if (result1 !== null) {
              result2 = parse_ureal_2();
              if (result2 !== null) {
                if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                  result3 = input.substr(pos.offset, 1);
                  advance(pos, 1);
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"i\"");
                  }
                }
                if (result3 !== null) {
                  result0 = [result0, result1, result2, result3];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, r, i) { return new Ccc.Complex(r, i); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            pos1 = clone(pos);
            result0 = parse_real_2();
            if (result0 !== null) {
              if (input.charCodeAt(pos.offset) === 45) {
                result1 = "-";
                advance(pos, 1);
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result1 !== null) {
                result2 = parse_ureal_2();
                if (result2 !== null) {
                  if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                    result3 = input.substr(pos.offset, 1);
                    advance(pos, 1);
                  } else {
                    result3 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"i\"");
                    }
                  }
                  if (result3 !== null) {
                    result0 = [result0, result1, result2, result3];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column, r, i) { return new Ccc.Complex(r, i.negative()); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
            if (result0 === null) {
              pos0 = clone(pos);
              pos1 = clone(pos);
              result0 = parse_real_2();
              if (result0 !== null) {
                if (input.substr(pos.offset, 2).toLowerCase() === "+i") {
                  result1 = input.substr(pos.offset, 2);
                  advance(pos, 2);
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"+i\"");
                  }
                }
                if (result1 !== null) {
                  result0 = [result0, result1];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
              if (result0 !== null) {
                result0 = (function(offset, line, column, r) { return new Ccc.Complex(r, 1); })(pos0.offset, pos0.line, pos0.column, result0[0]);
              }
              if (result0 === null) {
                pos = clone(pos0);
              }
              if (result0 === null) {
                pos0 = clone(pos);
                pos1 = clone(pos);
                result0 = parse_real_2();
                if (result0 !== null) {
                  if (input.substr(pos.offset, 2).toLowerCase() === "-i") {
                    result1 = input.substr(pos.offset, 2);
                    advance(pos, 2);
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"-i\"");
                    }
                  }
                  if (result1 !== null) {
                    result0 = [result0, result1];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
                if (result0 !== null) {
                  result0 = (function(offset, line, column, r) { return new Ccc.Complex(r, -1); })(pos0.offset, pos0.line, pos0.column, result0[0]);
                }
                if (result0 === null) {
                  pos = clone(pos0);
                }
                if (result0 === null) {
                  pos0 = clone(pos);
                  pos1 = clone(pos);
                  if (input.charCodeAt(pos.offset) === 43) {
                    result0 = "+";
                    advance(pos, 1);
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"+\"");
                    }
                  }
                  if (result0 !== null) {
                    result1 = parse_ureal_2();
                    if (result1 !== null) {
                      if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                        result2 = input.substr(pos.offset, 1);
                        advance(pos, 1);
                      } else {
                        result2 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"i\"");
                        }
                      }
                      if (result2 !== null) {
                        result0 = [result0, result1, result2];
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                  if (result0 !== null) {
                    result0 = (function(offset, line, column, i) { return new Ccc.Complex(0, i); })(pos0.offset, pos0.line, pos0.column, result0[1]);
                  }
                  if (result0 === null) {
                    pos = clone(pos0);
                  }
                  if (result0 === null) {
                    pos0 = clone(pos);
                    pos1 = clone(pos);
                    if (input.charCodeAt(pos.offset) === 45) {
                      result0 = "-";
                      advance(pos, 1);
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"-\"");
                      }
                    }
                    if (result0 !== null) {
                      result1 = parse_ureal_2();
                      if (result1 !== null) {
                        if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                          result2 = input.substr(pos.offset, 1);
                          advance(pos, 1);
                        } else {
                          result2 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"i\"");
                          }
                        }
                        if (result2 !== null) {
                          result0 = [result0, result1, result2];
                        } else {
                          result0 = null;
                          pos = clone(pos1);
                        }
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                    if (result0 !== null) {
                      result0 = (function(offset, line, column, i) { return new Ccc.Complex(0, i.negative()); })(pos0.offset, pos0.line, pos0.column, result0[1]);
                    }
                    if (result0 === null) {
                      pos = clone(pos0);
                    }
                    if (result0 === null) {
                      result0 = parse_real_2();
                      if (result0 === null) {
                        pos0 = clone(pos);
                        if (input.substr(pos.offset, 2).toLowerCase() === "+i") {
                          result0 = input.substr(pos.offset, 2);
                          advance(pos, 2);
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"+i\"");
                          }
                        }
                        if (result0 !== null) {
                          result0 = (function(offset, line, column) { return new Ccc.Complex(0, 1); })(pos0.offset, pos0.line, pos0.column);
                        }
                        if (result0 === null) {
                          pos = clone(pos0);
                        }
                        if (result0 === null) {
                          pos0 = clone(pos);
                          if (input.substr(pos.offset, 2).toLowerCase() === "-i") {
                            result0 = input.substr(pos.offset, 2);
                            advance(pos, 2);
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"-i\"");
                            }
                          }
                          if (result0 !== null) {
                            result0 = (function(offset, line, column) { return new Ccc.Complex(0, -1); })(pos0.offset, pos0.line, pos0.column);
                          }
                          if (result0 === null) {
                            pos = clone(pos0);
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_real_2() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_sign();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_ureal_2();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, s, n) {
                return (s === "-") ? n.negative() : n;
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_ureal_2() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_uinteger_2();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 47) {
            result1 = "/";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_uinteger_2();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, n, d) {
                return Ccc.ParseUtil.makeRational(n, d);
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          result0 = parse_uinteger_2();
        }
        return result0;
      }
      
      function parse_uinteger_2() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result1 = parse_digit_2();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_digit_2();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = [];
          if (input.charCodeAt(pos.offset) === 35) {
            result2 = "#";
            advance(pos, 1);
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\"#\"");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (input.charCodeAt(pos.offset) === 35) {
              result2 = "#";
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"#\"");
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, d, h) { return Ccc.ParseUtil.realFromTokens(d, h, 2); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_prefix_2() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_radix_2();
        if (result0 !== null) {
          result1 = parse_exactness();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, e) { return e; })(pos0.offset, pos0.line, pos0.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result0 = parse_exactness();
          result0 = result0 !== null ? result0 : "";
          if (result0 !== null) {
            result1 = parse_radix_2();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, e) { return e; })(pos0.offset, pos0.line, pos0.column, result0[0]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        return result0;
      }
      
      function parse_radix_2() {
        var result0;
        
        if (input.substr(pos.offset, 2).toLowerCase() === "#b") {
          result0 = input.substr(pos.offset, 2);
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#b\"");
          }
        }
        return result0;
      }
      
      function parse_digit_2() {
        var result0;
        
        if (/^[01]/.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[01]");
          }
        }
        return result0;
      }
      
      function parse_num_8() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_prefix_8();
        if (result0 !== null) {
          result1 = parse_complex_8();
          if (result1 !== null) {
            result2 = parse_DL();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, e, n) {
                if (e === true) {
                    return n.toExact();
                }
                else if (e === false) {
                    return n.toInexact();
                }
                else {
                    return n;
                }
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_complex_8() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_real_8();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 64) {
            result1 = "@";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"@\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_real_8();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, r, a) { return Ccc.Numeric.fromPolar(r.toInexact().realNumer, a.toInexact().realNumer); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result0 = parse_real_8();
          if (result0 !== null) {
            if (input.charCodeAt(pos.offset) === 43) {
              result1 = "+";
              advance(pos, 1);
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"+\"");
              }
            }
            if (result1 !== null) {
              result2 = parse_ureal_8();
              if (result2 !== null) {
                if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                  result3 = input.substr(pos.offset, 1);
                  advance(pos, 1);
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"i\"");
                  }
                }
                if (result3 !== null) {
                  result0 = [result0, result1, result2, result3];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, r, i) { return new Ccc.Complex(r, i); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            pos1 = clone(pos);
            result0 = parse_real_8();
            if (result0 !== null) {
              if (input.charCodeAt(pos.offset) === 45) {
                result1 = "-";
                advance(pos, 1);
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result1 !== null) {
                result2 = parse_ureal_8();
                if (result2 !== null) {
                  if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                    result3 = input.substr(pos.offset, 1);
                    advance(pos, 1);
                  } else {
                    result3 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"i\"");
                    }
                  }
                  if (result3 !== null) {
                    result0 = [result0, result1, result2, result3];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column, r, i) { return new Ccc.Complex(r, i.negative()); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
            if (result0 === null) {
              pos0 = clone(pos);
              pos1 = clone(pos);
              result0 = parse_real_8();
              if (result0 !== null) {
                if (input.substr(pos.offset, 2).toLowerCase() === "+i") {
                  result1 = input.substr(pos.offset, 2);
                  advance(pos, 2);
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"+i\"");
                  }
                }
                if (result1 !== null) {
                  result0 = [result0, result1];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
              if (result0 !== null) {
                result0 = (function(offset, line, column, r) { return new Ccc.Complex(r, 1); })(pos0.offset, pos0.line, pos0.column, result0[0]);
              }
              if (result0 === null) {
                pos = clone(pos0);
              }
              if (result0 === null) {
                pos0 = clone(pos);
                pos1 = clone(pos);
                result0 = parse_real_8();
                if (result0 !== null) {
                  if (input.substr(pos.offset, 2).toLowerCase() === "-i") {
                    result1 = input.substr(pos.offset, 2);
                    advance(pos, 2);
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"-i\"");
                    }
                  }
                  if (result1 !== null) {
                    result0 = [result0, result1];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
                if (result0 !== null) {
                  result0 = (function(offset, line, column, r) { return new Ccc.Complex(r, -1); })(pos0.offset, pos0.line, pos0.column, result0[0]);
                }
                if (result0 === null) {
                  pos = clone(pos0);
                }
                if (result0 === null) {
                  pos0 = clone(pos);
                  pos1 = clone(pos);
                  if (input.charCodeAt(pos.offset) === 43) {
                    result0 = "+";
                    advance(pos, 1);
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"+\"");
                    }
                  }
                  if (result0 !== null) {
                    result1 = parse_ureal_8();
                    if (result1 !== null) {
                      if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                        result2 = input.substr(pos.offset, 1);
                        advance(pos, 1);
                      } else {
                        result2 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"i\"");
                        }
                      }
                      if (result2 !== null) {
                        result0 = [result0, result1, result2];
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                  if (result0 !== null) {
                    result0 = (function(offset, line, column, i) { return new Ccc.Complex(0, i); })(pos0.offset, pos0.line, pos0.column, result0[1]);
                  }
                  if (result0 === null) {
                    pos = clone(pos0);
                  }
                  if (result0 === null) {
                    pos0 = clone(pos);
                    pos1 = clone(pos);
                    if (input.charCodeAt(pos.offset) === 45) {
                      result0 = "-";
                      advance(pos, 1);
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"-\"");
                      }
                    }
                    if (result0 !== null) {
                      result1 = parse_ureal_8();
                      if (result1 !== null) {
                        if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                          result2 = input.substr(pos.offset, 1);
                          advance(pos, 1);
                        } else {
                          result2 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"i\"");
                          }
                        }
                        if (result2 !== null) {
                          result0 = [result0, result1, result2];
                        } else {
                          result0 = null;
                          pos = clone(pos1);
                        }
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                    if (result0 !== null) {
                      result0 = (function(offset, line, column, i) { return new Ccc.Complex(0, i.negative()); })(pos0.offset, pos0.line, pos0.column, result0[1]);
                    }
                    if (result0 === null) {
                      pos = clone(pos0);
                    }
                    if (result0 === null) {
                      result0 = parse_real_8();
                      if (result0 === null) {
                        pos0 = clone(pos);
                        if (input.substr(pos.offset, 2).toLowerCase() === "+i") {
                          result0 = input.substr(pos.offset, 2);
                          advance(pos, 2);
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"+i\"");
                          }
                        }
                        if (result0 !== null) {
                          result0 = (function(offset, line, column) { return new Ccc.Complex(0, 1); })(pos0.offset, pos0.line, pos0.column);
                        }
                        if (result0 === null) {
                          pos = clone(pos0);
                        }
                        if (result0 === null) {
                          pos0 = clone(pos);
                          if (input.substr(pos.offset, 2).toLowerCase() === "-i") {
                            result0 = input.substr(pos.offset, 2);
                            advance(pos, 2);
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"-i\"");
                            }
                          }
                          if (result0 !== null) {
                            result0 = (function(offset, line, column) { return new Ccc.Complex(0, -1); })(pos0.offset, pos0.line, pos0.column);
                          }
                          if (result0 === null) {
                            pos = clone(pos0);
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_real_8() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_sign();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_ureal_8();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, s, n) {
                return (s === "-") ? n.negative() : n;
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_ureal_8() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_uinteger_8();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 47) {
            result1 = "/";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_uinteger_8();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, n, d) {
                return Ccc.ParseUtil.makeRational(n, d);
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          result0 = parse_uinteger_8();
        }
        return result0;
      }
      
      function parse_uinteger_8() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result1 = parse_digit_8();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_digit_8();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = [];
          if (input.charCodeAt(pos.offset) === 35) {
            result2 = "#";
            advance(pos, 1);
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\"#\"");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (input.charCodeAt(pos.offset) === 35) {
              result2 = "#";
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"#\"");
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, d, h) { return Ccc.ParseUtil.realFromTokens(d, h, 8); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_prefix_8() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_radix_8();
        if (result0 !== null) {
          result1 = parse_exactness();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, e) { return e; })(pos0.offset, pos0.line, pos0.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result0 = parse_exactness();
          result0 = result0 !== null ? result0 : "";
          if (result0 !== null) {
            result1 = parse_radix_8();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, e) { return e; })(pos0.offset, pos0.line, pos0.column, result0[0]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        return result0;
      }
      
      function parse_radix_8() {
        var result0;
        
        if (input.substr(pos.offset, 2).toLowerCase() === "#o") {
          result0 = input.substr(pos.offset, 2);
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#o\"");
          }
        }
        return result0;
      }
      
      function parse_digit_8() {
        var result0;
        
        if (/^[0-7]/.test(input.charAt(pos.offset))) {
          result0 = input.charAt(pos.offset);
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("[0-7]");
          }
        }
        return result0;
      }
      
      function parse_num_10() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_prefix_10();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_complex_10();
          if (result1 !== null) {
            result2 = parse_DL();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, e, n) {
                if (e === true) {
                    return n.toExact();
                }
                else if (e === false) {
                    return n.toInexact();
                }
                else {
                    return n;
                }
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_complex_10() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_real_10();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 64) {
            result1 = "@";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"@\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_real_10();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, r, a) { return Ccc.Numeric.fromPolar(r.toInexact().realNumer, a.toInexact().realNumer); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result0 = parse_real_10();
          if (result0 !== null) {
            if (input.charCodeAt(pos.offset) === 43) {
              result1 = "+";
              advance(pos, 1);
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"+\"");
              }
            }
            if (result1 !== null) {
              result2 = parse_ureal_10();
              if (result2 !== null) {
                if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                  result3 = input.substr(pos.offset, 1);
                  advance(pos, 1);
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"i\"");
                  }
                }
                if (result3 !== null) {
                  result0 = [result0, result1, result2, result3];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, r, i) { return new Ccc.Complex(r, i); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            pos1 = clone(pos);
            result0 = parse_real_10();
            if (result0 !== null) {
              if (input.charCodeAt(pos.offset) === 45) {
                result1 = "-";
                advance(pos, 1);
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result1 !== null) {
                result2 = parse_ureal_10();
                if (result2 !== null) {
                  if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                    result3 = input.substr(pos.offset, 1);
                    advance(pos, 1);
                  } else {
                    result3 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"i\"");
                    }
                  }
                  if (result3 !== null) {
                    result0 = [result0, result1, result2, result3];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column, r, i) { return new Ccc.Complex(r, i.negative()); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
            if (result0 === null) {
              pos0 = clone(pos);
              pos1 = clone(pos);
              result0 = parse_real_10();
              if (result0 !== null) {
                if (input.substr(pos.offset, 2).toLowerCase() === "+i") {
                  result1 = input.substr(pos.offset, 2);
                  advance(pos, 2);
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"+i\"");
                  }
                }
                if (result1 !== null) {
                  result0 = [result0, result1];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
              if (result0 !== null) {
                result0 = (function(offset, line, column, r) { return new Ccc.Complex(r, 1); })(pos0.offset, pos0.line, pos0.column, result0[0]);
              }
              if (result0 === null) {
                pos = clone(pos0);
              }
              if (result0 === null) {
                pos0 = clone(pos);
                pos1 = clone(pos);
                result0 = parse_real_10();
                if (result0 !== null) {
                  if (input.substr(pos.offset, 2).toLowerCase() === "-i") {
                    result1 = input.substr(pos.offset, 2);
                    advance(pos, 2);
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"-i\"");
                    }
                  }
                  if (result1 !== null) {
                    result0 = [result0, result1];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
                if (result0 !== null) {
                  result0 = (function(offset, line, column, r) { return new Ccc.Complex(r, -1); })(pos0.offset, pos0.line, pos0.column, result0[0]);
                }
                if (result0 === null) {
                  pos = clone(pos0);
                }
                if (result0 === null) {
                  pos0 = clone(pos);
                  pos1 = clone(pos);
                  if (input.charCodeAt(pos.offset) === 43) {
                    result0 = "+";
                    advance(pos, 1);
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"+\"");
                    }
                  }
                  if (result0 !== null) {
                    result1 = parse_ureal_10();
                    if (result1 !== null) {
                      if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                        result2 = input.substr(pos.offset, 1);
                        advance(pos, 1);
                      } else {
                        result2 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"i\"");
                        }
                      }
                      if (result2 !== null) {
                        result0 = [result0, result1, result2];
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                  if (result0 !== null) {
                    result0 = (function(offset, line, column, i) { return new Ccc.Complex(0, i); })(pos0.offset, pos0.line, pos0.column, result0[1]);
                  }
                  if (result0 === null) {
                    pos = clone(pos0);
                  }
                  if (result0 === null) {
                    pos0 = clone(pos);
                    pos1 = clone(pos);
                    if (input.charCodeAt(pos.offset) === 45) {
                      result0 = "-";
                      advance(pos, 1);
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"-\"");
                      }
                    }
                    if (result0 !== null) {
                      result1 = parse_ureal_10();
                      if (result1 !== null) {
                        if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                          result2 = input.substr(pos.offset, 1);
                          advance(pos, 1);
                        } else {
                          result2 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"i\"");
                          }
                        }
                        if (result2 !== null) {
                          result0 = [result0, result1, result2];
                        } else {
                          result0 = null;
                          pos = clone(pos1);
                        }
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                    if (result0 !== null) {
                      result0 = (function(offset, line, column, i) { return new Ccc.Complex(0, i.negative()); })(pos0.offset, pos0.line, pos0.column, result0[1]);
                    }
                    if (result0 === null) {
                      pos = clone(pos0);
                    }
                    if (result0 === null) {
                      result0 = parse_real_10();
                      if (result0 === null) {
                        pos0 = clone(pos);
                        if (input.substr(pos.offset, 2).toLowerCase() === "+i") {
                          result0 = input.substr(pos.offset, 2);
                          advance(pos, 2);
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"+i\"");
                          }
                        }
                        if (result0 !== null) {
                          result0 = (function(offset, line, column) { return new Ccc.Complex(0, 1); })(pos0.offset, pos0.line, pos0.column);
                        }
                        if (result0 === null) {
                          pos = clone(pos0);
                        }
                        if (result0 === null) {
                          pos0 = clone(pos);
                          if (input.substr(pos.offset, 2).toLowerCase() === "-i") {
                            result0 = input.substr(pos.offset, 2);
                            advance(pos, 2);
                          } else {
                            result0 = null;
                            if (reportFailures === 0) {
                              matchFailed("\"-i\"");
                            }
                          }
                          if (result0 !== null) {
                            result0 = (function(offset, line, column) { return new Ccc.Complex(0, -1); })(pos0.offset, pos0.line, pos0.column);
                          }
                          if (result0 === null) {
                            pos = clone(pos0);
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_real_10() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_sign();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_ureal_10();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, s, n) {
                return (s === "-") ? n.negative() : n;
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_ureal_10() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_uinteger_10();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 47) {
            result1 = "/";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_uinteger_10();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, n, d) {
                return Ccc.ParseUtil.makeRational(n, d);
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          result0 = parse_decimal_10();
          if (result0 === null) {
            result0 = parse_uinteger_10();
          }
        }
        return result0;
      }
      
      function parse_decimal_10() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result1 = parse_digit();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_digit();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 35) {
            result2 = "#";
            advance(pos, 1);
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\"#\"");
            }
          }
          if (result2 !== null) {
            result1 = [];
            while (result2 !== null) {
              result1.push(result2);
              if (input.charCodeAt(pos.offset) === 35) {
                result2 = "#";
                advance(pos, 1);
              } else {
                result2 = null;
                if (reportFailures === 0) {
                  matchFailed("\"#\"");
                }
              }
            }
          } else {
            result1 = null;
          }
          if (result1 !== null) {
            if (input.charCodeAt(pos.offset) === 46) {
              result2 = ".";
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result2 !== null) {
              result3 = [];
              if (input.charCodeAt(pos.offset) === 35) {
                result4 = "#";
                advance(pos, 1);
              } else {
                result4 = null;
                if (reportFailures === 0) {
                  matchFailed("\"#\"");
                }
              }
              while (result4 !== null) {
                result3.push(result4);
                if (input.charCodeAt(pos.offset) === 35) {
                  result4 = "#";
                  advance(pos, 1);
                } else {
                  result4 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"#\"");
                  }
                }
              }
              if (result3 !== null) {
                result4 = parse_suffix();
                result4 = result4 !== null ? result4 : "";
                if (result4 !== null) {
                  result0 = [result0, result1, result2, result3, result4];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, a, ha, hb, s) {
                return Ccc.ParseUtil.numberFromDecimal(parseFloat(a.join("") + "."), ha, hb, s, true);
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1], result0[3], result0[4]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result1 = parse_digit();
          if (result1 !== null) {
            result0 = [];
            while (result1 !== null) {
              result0.push(result1);
              result1 = parse_digit();
            }
          } else {
            result0 = null;
          }
          if (result0 !== null) {
            if (input.charCodeAt(pos.offset) === 46) {
              result1 = ".";
              advance(pos, 1);
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result1 !== null) {
              result2 = [];
              result3 = parse_digit();
              while (result3 !== null) {
                result2.push(result3);
                result3 = parse_digit();
              }
              if (result2 !== null) {
                result3 = [];
                if (input.charCodeAt(pos.offset) === 35) {
                  result4 = "#";
                  advance(pos, 1);
                } else {
                  result4 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"#\"");
                  }
                }
                while (result4 !== null) {
                  result3.push(result4);
                  if (input.charCodeAt(pos.offset) === 35) {
                    result4 = "#";
                    advance(pos, 1);
                  } else {
                    result4 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"#\"");
                    }
                  }
                }
                if (result3 !== null) {
                  result4 = parse_suffix();
                  result4 = result4 !== null ? result4 : "";
                  if (result4 !== null) {
                    result0 = [result0, result1, result2, result3, result4];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, a, b, hb, s) {
                  return Ccc.ParseUtil.numberFromDecimal(parseFloat(a.join("") + "." + b.join("")), '', hb, s, true);
              })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2], result0[3], result0[4]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            pos1 = clone(pos);
            if (input.charCodeAt(pos.offset) === 46) {
              result0 = ".";
              advance(pos, 1);
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\".\"");
              }
            }
            if (result0 !== null) {
              result2 = parse_digit();
              if (result2 !== null) {
                result1 = [];
                while (result2 !== null) {
                  result1.push(result2);
                  result2 = parse_digit();
                }
              } else {
                result1 = null;
              }
              if (result1 !== null) {
                result2 = [];
                if (input.charCodeAt(pos.offset) === 35) {
                  result3 = "#";
                  advance(pos, 1);
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"#\"");
                  }
                }
                while (result3 !== null) {
                  result2.push(result3);
                  if (input.charCodeAt(pos.offset) === 35) {
                    result3 = "#";
                    advance(pos, 1);
                  } else {
                    result3 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"#\"");
                    }
                  }
                }
                if (result2 !== null) {
                  result3 = parse_suffix();
                  result3 = result3 !== null ? result3 : "";
                  if (result3 !== null) {
                    result0 = [result0, result1, result2, result3];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column, b, hb, s) {
                    return Ccc.ParseUtil.numberFromDecimal(parseFloat("." + b.join("")), '', hb, s, true);
                })(pos0.offset, pos0.line, pos0.column, result0[1], result0[2], result0[3]);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
            if (result0 === null) {
              pos0 = clone(pos);
              pos1 = clone(pos);
              result0 = parse_uinteger_10();
              if (result0 !== null) {
                result1 = parse_suffix();
                result1 = result1 !== null ? result1 : "";
                if (result1 !== null) {
                  result0 = [result0, result1];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
              if (result0 !== null) {
                result0 = (function(offset, line, column, n, s) {
                      return Ccc.ParseUtil.numberFromDecimal(n, '', '', s, false);
                  })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
              }
              if (result0 === null) {
                pos = clone(pos0);
              }
            }
          }
        }
        return result0;
      }
      
      function parse_uinteger_10() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result1 = parse_digit();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_digit();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = [];
          if (input.charCodeAt(pos.offset) === 35) {
            result2 = "#";
            advance(pos, 1);
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\"#\"");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (input.charCodeAt(pos.offset) === 35) {
              result2 = "#";
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"#\"");
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, d, h) { return Ccc.ParseUtil.realFromTokens(d, h, 10); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_prefix_10() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_radix_10();
        if (result0 !== null) {
          result1 = parse_exactness();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, e) { return e; })(pos0.offset, pos0.line, pos0.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result0 = parse_exactness();
          if (result0 !== null) {
            result1 = parse_radix_10();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, e) { return e; })(pos0.offset, pos0.line, pos0.column, result0[0]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            result0 = parse_exactness();
            if (result0 !== null) {
              result0 = (function(offset, line, column, e) { return e; })(pos0.offset, pos0.line, pos0.column, result0);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
            if (result0 === null) {
              pos0 = clone(pos);
              result0 = parse_radix_10();
              if (result0 !== null) {
                result0 = (function(offset, line, column) { return ''; })(pos0.offset, pos0.line, pos0.column);
              }
              if (result0 === null) {
                pos = clone(pos0);
              }
            }
          }
        }
        return result0;
      }
      
      function parse_radix_10() {
        var result0;
        
        if (input.substr(pos.offset, 2).toLowerCase() === "#d") {
          result0 = input.substr(pos.offset, 2);
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#d\"");
          }
        }
        return result0;
      }
      
      function parse_num_16() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_prefix_16();
        if (result0 !== null) {
          result1 = parse_complex_16();
          if (result1 !== null) {
            result2 = parse_DL();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, e, n) {
                if (e === true) {
                    return n.toExact();
                }
                else if (e === false) {
                    return n.toInexact();
                }
                else {
                    return n;
                }
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_complex_16() {
        var result0, result1, result2, result3;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_real_16();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 64) {
            result1 = "@";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"@\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_real_16();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, r, a) { return Ccc.Numeric.fromPolar(r.toInexact().realNumer, a.toInexact().realNumer); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result0 = parse_real_16();
          if (result0 !== null) {
            if (input.charCodeAt(pos.offset) === 43) {
              result1 = "+";
              advance(pos, 1);
            } else {
              result1 = null;
              if (reportFailures === 0) {
                matchFailed("\"+\"");
              }
            }
            if (result1 !== null) {
              result2 = parse_ureal_16();
              if (result2 !== null) {
                if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                  result3 = input.substr(pos.offset, 1);
                  advance(pos, 1);
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"i\"");
                  }
                }
                if (result3 !== null) {
                  result0 = [result0, result1, result2, result3];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, r, i) { return new Ccc.Complex(r, i); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            pos1 = clone(pos);
            result0 = parse_real_16();
            if (result0 !== null) {
              if (input.charCodeAt(pos.offset) === 45) {
                result1 = "-";
                advance(pos, 1);
              } else {
                result1 = null;
                if (reportFailures === 0) {
                  matchFailed("\"-\"");
                }
              }
              if (result1 !== null) {
                result2 = parse_ureal_16();
                if (result2 !== null) {
                  if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                    result3 = input.substr(pos.offset, 1);
                    advance(pos, 1);
                  } else {
                    result3 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"i\"");
                    }
                  }
                  if (result3 !== null) {
                    result0 = [result0, result1, result2, result3];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column, r, i) { return new Ccc.Complex(r, i.negative()); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
            if (result0 === null) {
              pos0 = clone(pos);
              pos1 = clone(pos);
              result0 = parse_real_16();
              if (result0 !== null) {
                if (input.substr(pos.offset, 2).toLowerCase() === "+i") {
                  result1 = input.substr(pos.offset, 2);
                  advance(pos, 2);
                } else {
                  result1 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"+i\"");
                  }
                }
                if (result1 !== null) {
                  result0 = [result0, result1];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
              if (result0 !== null) {
                result0 = (function(offset, line, column, r) { return new Ccc.Complex(r, 1); })(pos0.offset, pos0.line, pos0.column, result0[0]);
              }
              if (result0 === null) {
                pos = clone(pos0);
              }
              if (result0 === null) {
                pos0 = clone(pos);
                pos1 = clone(pos);
                result0 = parse_real_16();
                if (result0 !== null) {
                  if (input.substr(pos.offset, 2).toLowerCase() === "-i") {
                    result1 = input.substr(pos.offset, 2);
                    advance(pos, 2);
                  } else {
                    result1 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"-i\"");
                    }
                  }
                  if (result1 !== null) {
                    result0 = [result0, result1];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
                if (result0 !== null) {
                  result0 = (function(offset, line, column, r) { return new Ccc.Complex(r, -1); })(pos0.offset, pos0.line, pos0.column, result0[0]);
                }
                if (result0 === null) {
                  pos = clone(pos0);
                }
                if (result0 === null) {
                  pos0 = clone(pos);
                  pos1 = clone(pos);
                  if (input.charCodeAt(pos.offset) === 43) {
                    result0 = "+";
                    advance(pos, 1);
                  } else {
                    result0 = null;
                    if (reportFailures === 0) {
                      matchFailed("\"+\"");
                    }
                  }
                  if (result0 !== null) {
                    result1 = parse_ureal_16();
                    if (result1 !== null) {
                      if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                        result2 = input.substr(pos.offset, 1);
                        advance(pos, 1);
                      } else {
                        result2 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"i\"");
                        }
                      }
                      if (result2 !== null) {
                        result0 = [result0, result1, result2];
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                  if (result0 !== null) {
                    result0 = (function(offset, line, column, i) { return new Ccc.Complex(0, i); })(pos0.offset, pos0.line, pos0.column, result0[1]);
                  }
                  if (result0 === null) {
                    pos = clone(pos0);
                  }
                  if (result0 === null) {
                    pos0 = clone(pos);
                    pos1 = clone(pos);
                    if (input.charCodeAt(pos.offset) === 45) {
                      result0 = "-";
                      advance(pos, 1);
                    } else {
                      result0 = null;
                      if (reportFailures === 0) {
                        matchFailed("\"-\"");
                      }
                    }
                    if (result0 !== null) {
                      result1 = parse_ureal_16();
                      if (result1 !== null) {
                        if (input.substr(pos.offset, 1).toLowerCase() === "i") {
                          result2 = input.substr(pos.offset, 1);
                          advance(pos, 1);
                        } else {
                          result2 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"i\"");
                          }
                        }
                        if (result2 !== null) {
                          result0 = [result0, result1, result2];
                        } else {
                          result0 = null;
                          pos = clone(pos1);
                        }
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                    if (result0 !== null) {
                      result0 = (function(offset, line, column, i) { return new Ccc.Complex(0, i.negative()); })(pos0.offset, pos0.line, pos0.column, result0[1]);
                    }
                    if (result0 === null) {
                      pos = clone(pos0);
                    }
                    if (result0 === null) {
                      pos0 = clone(pos);
                      if (input.substr(pos.offset, 2).toLowerCase() === "+i") {
                        result0 = input.substr(pos.offset, 2);
                        advance(pos, 2);
                      } else {
                        result0 = null;
                        if (reportFailures === 0) {
                          matchFailed("\"+i\"");
                        }
                      }
                      if (result0 !== null) {
                        result0 = (function(offset, line, column) { return new Ccc.Complex(0, 1); })(pos0.offset, pos0.line, pos0.column);
                      }
                      if (result0 === null) {
                        pos = clone(pos0);
                      }
                      if (result0 === null) {
                        pos0 = clone(pos);
                        if (input.substr(pos.offset, 2).toLowerCase() === "-i") {
                          result0 = input.substr(pos.offset, 2);
                          advance(pos, 2);
                        } else {
                          result0 = null;
                          if (reportFailures === 0) {
                            matchFailed("\"-i\"");
                          }
                        }
                        if (result0 !== null) {
                          result0 = (function(offset, line, column) { return new Ccc.Complex(0, -1); })(pos0.offset, pos0.line, pos0.column);
                        }
                        if (result0 === null) {
                          pos = clone(pos0);
                        }
                        if (result0 === null) {
                          result0 = parse_real_16();
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_real_16() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_sign();
        result0 = result0 !== null ? result0 : "";
        if (result0 !== null) {
          result1 = parse_ureal_16();
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, s, n) {
                return (s === "-") ? n.negative() : n;
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_ureal_16() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_uinteger_16();
        if (result0 !== null) {
          if (input.charCodeAt(pos.offset) === 47) {
            result1 = "/";
            advance(pos, 1);
          } else {
            result1 = null;
            if (reportFailures === 0) {
              matchFailed("\"/\"");
            }
          }
          if (result1 !== null) {
            result2 = parse_uinteger_16();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, n, d) {
                return Ccc.ParseUtil.makeRational(n, d);
            })(pos0.offset, pos0.line, pos0.column, result0[0], result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          result0 = parse_uinteger_16();
        }
        return result0;
      }
      
      function parse_uinteger_16() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result1 = parse_digit_16();
        if (result1 !== null) {
          result0 = [];
          while (result1 !== null) {
            result0.push(result1);
            result1 = parse_digit_16();
          }
        } else {
          result0 = null;
        }
        if (result0 !== null) {
          result1 = [];
          if (input.charCodeAt(pos.offset) === 35) {
            result2 = "#";
            advance(pos, 1);
          } else {
            result2 = null;
            if (reportFailures === 0) {
              matchFailed("\"#\"");
            }
          }
          while (result2 !== null) {
            result1.push(result2);
            if (input.charCodeAt(pos.offset) === 35) {
              result2 = "#";
              advance(pos, 1);
            } else {
              result2 = null;
              if (reportFailures === 0) {
                matchFailed("\"#\"");
              }
            }
          }
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, d, h) { return Ccc.ParseUtil.realFromTokens(d, h, 16); })(pos0.offset, pos0.line, pos0.column, result0[0], result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      function parse_prefix_16() {
        var result0, result1;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        result0 = parse_radix_16();
        if (result0 !== null) {
          result1 = parse_exactness();
          result1 = result1 !== null ? result1 : "";
          if (result1 !== null) {
            result0 = [result0, result1];
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, e) { return e; })(pos0.offset, pos0.line, pos0.column, result0[1]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          result0 = parse_exactness();
          result0 = result0 !== null ? result0 : "";
          if (result0 !== null) {
            result1 = parse_radix_16();
            if (result1 !== null) {
              result0 = [result0, result1];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, e) { return e; })(pos0.offset, pos0.line, pos0.column, result0[0]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        return result0;
      }
      
      function parse_radix_16() {
        var result0;
        
        if (input.substr(pos.offset, 2).toLowerCase() === "#x") {
          result0 = input.substr(pos.offset, 2);
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#x\"");
          }
        }
        return result0;
      }
      
      function parse_digit_16() {
        var result0;
        
        result0 = parse_digit();
        if (result0 === null) {
          if (/^[abcdef]/i.test(input.charAt(pos.offset))) {
            result0 = input.charAt(pos.offset);
            advance(pos, 1);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("[abcdef]i");
            }
          }
        }
        return result0;
      }
      
      function parse_datum() {
        var result0;
        
        result0 = parse_simple_datum();
        if (result0 === null) {
          result0 = parse_compound_datum();
        }
        return result0;
      }
      
      function parse_simple_datum() {
        var result0;
        
        result0 = parse_boolean();
        if (result0 === null) {
          result0 = parse_number();
          if (result0 === null) {
            result0 = parse_character();
            if (result0 === null) {
              result0 = parse_string();
              if (result0 === null) {
                result0 = parse_symbol();
                if (result0 === null) {
                  result0 = parse_null_value();
                  if (result0 === null) {
                    result0 = parse_unspecific();
                  }
                }
              }
            }
          }
        }
        return result0;
      }
      
      function parse_compound_datum() {
        var result0;
        
        result0 = parse_list();
        if (result0 === null) {
          result0 = parse_vector();
        }
        return result0;
      }
      
      function parse_list() {
        var result0, result1, result2, result3, result4, result5, result6, result7;
        var pos0, pos1, pos2;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.charCodeAt(pos.offset) === 40) {
          result0 = "(";
          advance(pos, 1);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"(\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_WS();
          if (result1 !== null) {
            result2 = [];
            pos2 = clone(pos);
            result3 = parse_datum();
            if (result3 !== null) {
              result4 = parse_WS();
              if (result4 !== null) {
                result3 = [result3, result4];
              } else {
                result3 = null;
                pos = clone(pos2);
              }
            } else {
              result3 = null;
              pos = clone(pos2);
            }
            while (result3 !== null) {
              result2.push(result3);
              pos2 = clone(pos);
              result3 = parse_datum();
              if (result3 !== null) {
                result4 = parse_WS();
                if (result4 !== null) {
                  result3 = [result3, result4];
                } else {
                  result3 = null;
                  pos = clone(pos2);
                }
              } else {
                result3 = null;
                pos = clone(pos2);
              }
            }
            if (result2 !== null) {
              if (input.charCodeAt(pos.offset) === 41) {
                result3 = ")";
                advance(pos, 1);
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\")\"");
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, items) {
        		var list = Ccc.ParseUtil.arrayFromArrays(items, 0);
        		return Ccc.Pair.fromArray(list);
        	})(pos0.offset, pos0.line, pos0.column, result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          if (input.charCodeAt(pos.offset) === 91) {
            result0 = "[";
            advance(pos, 1);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"[\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_WS();
            if (result1 !== null) {
              result2 = [];
              pos2 = clone(pos);
              result3 = parse_datum();
              if (result3 !== null) {
                result4 = parse_WS();
                if (result4 !== null) {
                  result3 = [result3, result4];
                } else {
                  result3 = null;
                  pos = clone(pos2);
                }
              } else {
                result3 = null;
                pos = clone(pos2);
              }
              while (result3 !== null) {
                result2.push(result3);
                pos2 = clone(pos);
                result3 = parse_datum();
                if (result3 !== null) {
                  result4 = parse_WS();
                  if (result4 !== null) {
                    result3 = [result3, result4];
                  } else {
                    result3 = null;
                    pos = clone(pos2);
                  }
                } else {
                  result3 = null;
                  pos = clone(pos2);
                }
              }
              if (result2 !== null) {
                if (input.charCodeAt(pos.offset) === 93) {
                  result3 = "]";
                  advance(pos, 1);
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"]\"");
                  }
                }
                if (result3 !== null) {
                  result0 = [result0, result1, result2, result3];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, items) {
          		var list = Ccc.ParseUtil.arrayFromArrays(items, 0);
          		return Ccc.Pair.fromArray(list);
          	})(pos0.offset, pos0.line, pos0.column, result0[2]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            pos1 = clone(pos);
            if (input.charCodeAt(pos.offset) === 40) {
              result0 = "(";
              advance(pos, 1);
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"(\"");
              }
            }
            if (result0 !== null) {
              result1 = parse_WS();
              if (result1 !== null) {
                pos2 = clone(pos);
                result3 = parse_datum();
                if (result3 !== null) {
                  result4 = parse_WS();
                  if (result4 !== null) {
                    result3 = [result3, result4];
                  } else {
                    result3 = null;
                    pos = clone(pos2);
                  }
                } else {
                  result3 = null;
                  pos = clone(pos2);
                }
                if (result3 !== null) {
                  result2 = [];
                  while (result3 !== null) {
                    result2.push(result3);
                    pos2 = clone(pos);
                    result3 = parse_datum();
                    if (result3 !== null) {
                      result4 = parse_WS();
                      if (result4 !== null) {
                        result3 = [result3, result4];
                      } else {
                        result3 = null;
                        pos = clone(pos2);
                      }
                    } else {
                      result3 = null;
                      pos = clone(pos2);
                    }
                  }
                } else {
                  result2 = null;
                }
                if (result2 !== null) {
                  if (input.charCodeAt(pos.offset) === 46) {
                    result3 = ".";
                    advance(pos, 1);
                  } else {
                    result3 = null;
                    if (reportFailures === 0) {
                      matchFailed("\".\"");
                    }
                  }
                  if (result3 !== null) {
                    result4 = parse_DL();
                    if (result4 !== null) {
                      result5 = parse_datum();
                      if (result5 !== null) {
                        result6 = parse_WS();
                        if (result6 !== null) {
                          if (input.charCodeAt(pos.offset) === 41) {
                            result7 = ")";
                            advance(pos, 1);
                          } else {
                            result7 = null;
                            if (reportFailures === 0) {
                              matchFailed("\")\"");
                            }
                          }
                          if (result7 !== null) {
                            result0 = [result0, result1, result2, result3, result4, result5, result6, result7];
                          } else {
                            result0 = null;
                            pos = clone(pos1);
                          }
                        } else {
                          result0 = null;
                          pos = clone(pos1);
                        }
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column, items, tail) {
            		var list = Ccc.ParseUtil.arrayFromArrays(items, 0);
            		return Ccc.Pair.fromArray(list, tail);
            	})(pos0.offset, pos0.line, pos0.column, result0[2], result0[5]);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
            if (result0 === null) {
              pos0 = clone(pos);
              pos1 = clone(pos);
              if (input.charCodeAt(pos.offset) === 91) {
                result0 = "[";
                advance(pos, 1);
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\"[\"");
                }
              }
              if (result0 !== null) {
                result1 = parse_WS();
                if (result1 !== null) {
                  pos2 = clone(pos);
                  result3 = parse_datum();
                  if (result3 !== null) {
                    result4 = parse_WS();
                    if (result4 !== null) {
                      result3 = [result3, result4];
                    } else {
                      result3 = null;
                      pos = clone(pos2);
                    }
                  } else {
                    result3 = null;
                    pos = clone(pos2);
                  }
                  if (result3 !== null) {
                    result2 = [];
                    while (result3 !== null) {
                      result2.push(result3);
                      pos2 = clone(pos);
                      result3 = parse_datum();
                      if (result3 !== null) {
                        result4 = parse_WS();
                        if (result4 !== null) {
                          result3 = [result3, result4];
                        } else {
                          result3 = null;
                          pos = clone(pos2);
                        }
                      } else {
                        result3 = null;
                        pos = clone(pos2);
                      }
                    }
                  } else {
                    result2 = null;
                  }
                  if (result2 !== null) {
                    if (input.charCodeAt(pos.offset) === 46) {
                      result3 = ".";
                      advance(pos, 1);
                    } else {
                      result3 = null;
                      if (reportFailures === 0) {
                        matchFailed("\".\"");
                      }
                    }
                    if (result3 !== null) {
                      result4 = parse_DL();
                      if (result4 !== null) {
                        result5 = parse_datum();
                        if (result5 !== null) {
                          result6 = parse_WS();
                          if (result6 !== null) {
                            if (input.charCodeAt(pos.offset) === 93) {
                              result7 = "]";
                              advance(pos, 1);
                            } else {
                              result7 = null;
                              if (reportFailures === 0) {
                                matchFailed("\"]\"");
                              }
                            }
                            if (result7 !== null) {
                              result0 = [result0, result1, result2, result3, result4, result5, result6, result7];
                            } else {
                              result0 = null;
                              pos = clone(pos1);
                            }
                          } else {
                            result0 = null;
                            pos = clone(pos1);
                          }
                        } else {
                          result0 = null;
                          pos = clone(pos1);
                        }
                      } else {
                        result0 = null;
                        pos = clone(pos1);
                      }
                    } else {
                      result0 = null;
                      pos = clone(pos1);
                    }
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
              if (result0 !== null) {
                result0 = (function(offset, line, column, items, tail) {
              		var list = Ccc.ParseUtil.arrayFromArrays(items, 0);
              		return Ccc.Pair.fromArray(list, tail);
              	})(pos0.offset, pos0.line, pos0.column, result0[2], result0[5]);
              }
              if (result0 === null) {
                pos = clone(pos0);
              }
              if (result0 === null) {
                result0 = parse_abbreviation();
              }
            }
          }
        }
        return result0;
      }
      
      function parse_abbreviation() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.substr(pos.offset, 2) === ",@") {
          result0 = ",@";
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\",@\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_WS();
          if (result1 !== null) {
            result2 = parse_datum();
            if (result2 !== null) {
              result0 = [result0, result1, result2];
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, datum) {
                return new Ccc.Pair(new Ccc.Symbol('unquote-splicing'), new Ccc.Pair(datum, Ccc.Nil));
            })(pos0.offset, pos0.line, pos0.column, result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          if (input.charCodeAt(pos.offset) === 39) {
            result0 = "'";
            advance(pos, 1);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"'\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_WS();
            if (result1 !== null) {
              result2 = parse_datum();
              if (result2 !== null) {
                result0 = [result0, result1, result2];
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, datum) {
                  return new Ccc.Pair(new Ccc.Symbol('quote'), new Ccc.Pair(datum, Ccc.Nil));
              })(pos0.offset, pos0.line, pos0.column, result0[2]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
          if (result0 === null) {
            pos0 = clone(pos);
            pos1 = clone(pos);
            if (input.charCodeAt(pos.offset) === 96) {
              result0 = "`";
              advance(pos, 1);
            } else {
              result0 = null;
              if (reportFailures === 0) {
                matchFailed("\"`\"");
              }
            }
            if (result0 !== null) {
              result1 = parse_WS();
              if (result1 !== null) {
                result2 = parse_datum();
                if (result2 !== null) {
                  result0 = [result0, result1, result2];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
            if (result0 !== null) {
              result0 = (function(offset, line, column, datum) {
                    return new Ccc.Pair(new Ccc.Symbol('quasiquote'), new Ccc.Pair(datum, Ccc.Nil));
                })(pos0.offset, pos0.line, pos0.column, result0[2]);
            }
            if (result0 === null) {
              pos = clone(pos0);
            }
            if (result0 === null) {
              pos0 = clone(pos);
              pos1 = clone(pos);
              if (input.charCodeAt(pos.offset) === 44) {
                result0 = ",";
                advance(pos, 1);
              } else {
                result0 = null;
                if (reportFailures === 0) {
                  matchFailed("\",\"");
                }
              }
              if (result0 !== null) {
                result1 = parse_WS();
                if (result1 !== null) {
                  result2 = parse_datum();
                  if (result2 !== null) {
                    result0 = [result0, result1, result2];
                  } else {
                    result0 = null;
                    pos = clone(pos1);
                  }
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
              if (result0 !== null) {
                result0 = (function(offset, line, column, datum) {
                      return new Ccc.Pair(new Ccc.Symbol('unquote'), new Ccc.Pair(datum, Ccc.Nil));
                  })(pos0.offset, pos0.line, pos0.column, result0[2]);
              }
              if (result0 === null) {
                pos = clone(pos0);
              }
            }
          }
        }
        return result0;
      }
      
      function parse_vector() {
        var result0, result1, result2, result3, result4;
        var pos0, pos1, pos2;
        
        pos0 = clone(pos);
        pos1 = clone(pos);
        if (input.substr(pos.offset, 2) === "#(") {
          result0 = "#(";
          advance(pos, 2);
        } else {
          result0 = null;
          if (reportFailures === 0) {
            matchFailed("\"#(\"");
          }
        }
        if (result0 !== null) {
          result1 = parse_WS();
          if (result1 !== null) {
            result2 = [];
            pos2 = clone(pos);
            result3 = parse_datum();
            if (result3 !== null) {
              result4 = parse_WS();
              if (result4 !== null) {
                result3 = [result3, result4];
              } else {
                result3 = null;
                pos = clone(pos2);
              }
            } else {
              result3 = null;
              pos = clone(pos2);
            }
            while (result3 !== null) {
              result2.push(result3);
              pos2 = clone(pos);
              result3 = parse_datum();
              if (result3 !== null) {
                result4 = parse_WS();
                if (result4 !== null) {
                  result3 = [result3, result4];
                } else {
                  result3 = null;
                  pos = clone(pos2);
                }
              } else {
                result3 = null;
                pos = clone(pos2);
              }
            }
            if (result2 !== null) {
              if (input.charCodeAt(pos.offset) === 41) {
                result3 = ")";
                advance(pos, 1);
              } else {
                result3 = null;
                if (reportFailures === 0) {
                  matchFailed("\")\"");
                }
              }
              if (result3 !== null) {
                result0 = [result0, result1, result2, result3];
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
        } else {
          result0 = null;
          pos = clone(pos1);
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, items) {
                var data = Ccc.ParseUtil.arrayFromArrays(items, 0);
                return new Ccc.Vector(data);
            })(pos0.offset, pos0.line, pos0.column, result0[2]);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        if (result0 === null) {
          pos0 = clone(pos);
          pos1 = clone(pos);
          if (input.substr(pos.offset, 2) === "#[") {
            result0 = "#[";
            advance(pos, 2);
          } else {
            result0 = null;
            if (reportFailures === 0) {
              matchFailed("\"#[\"");
            }
          }
          if (result0 !== null) {
            result1 = parse_WS();
            if (result1 !== null) {
              result2 = [];
              pos2 = clone(pos);
              result3 = parse_datum();
              if (result3 !== null) {
                result4 = parse_WS();
                if (result4 !== null) {
                  result3 = [result3, result4];
                } else {
                  result3 = null;
                  pos = clone(pos2);
                }
              } else {
                result3 = null;
                pos = clone(pos2);
              }
              while (result3 !== null) {
                result2.push(result3);
                pos2 = clone(pos);
                result3 = parse_datum();
                if (result3 !== null) {
                  result4 = parse_WS();
                  if (result4 !== null) {
                    result3 = [result3, result4];
                  } else {
                    result3 = null;
                    pos = clone(pos2);
                  }
                } else {
                  result3 = null;
                  pos = clone(pos2);
                }
              }
              if (result2 !== null) {
                if (input.charCodeAt(pos.offset) === 93) {
                  result3 = "]";
                  advance(pos, 1);
                } else {
                  result3 = null;
                  if (reportFailures === 0) {
                    matchFailed("\"]\"");
                  }
                }
                if (result3 !== null) {
                  result0 = [result0, result1, result2, result3];
                } else {
                  result0 = null;
                  pos = clone(pos1);
                }
              } else {
                result0 = null;
                pos = clone(pos1);
              }
            } else {
              result0 = null;
              pos = clone(pos1);
            }
          } else {
            result0 = null;
            pos = clone(pos1);
          }
          if (result0 !== null) {
            result0 = (function(offset, line, column, items) {
                  var data = Ccc.ParseUtil.arrayFromArrays(items, 0);
                  return new Ccc.Vector(data);
              })(pos0.offset, pos0.line, pos0.column, result0[2]);
          }
          if (result0 === null) {
            pos = clone(pos0);
          }
        }
        return result0;
      }
      
      function parse_program() {
        var result0, result1, result2;
        var pos0, pos1;
        
        pos0 = clone(pos);
        result0 = [];
        pos1 = clone(pos);
        result1 = parse_datum();
        if (result1 !== null) {
          result2 = parse_WS();
          if (result2 !== null) {
            result1 = [result1, result2];
          } else {
            result1 = null;
            pos = clone(pos1);
          }
        } else {
          result1 = null;
          pos = clone(pos1);
        }
        while (result1 !== null) {
          result0.push(result1);
          pos1 = clone(pos);
          result1 = parse_datum();
          if (result1 !== null) {
            result2 = parse_WS();
            if (result2 !== null) {
              result1 = [result1, result2];
            } else {
              result1 = null;
              pos = clone(pos1);
            }
          } else {
            result1 = null;
            pos = clone(pos1);
          }
        }
        if (result0 !== null) {
          result0 = (function(offset, line, column, data) {
                return new Ccc.Program(Ccc.ParseUtil.arrayFromArrays(data, 0));
            })(pos0.offset, pos0.line, pos0.column, result0);
        }
        if (result0 === null) {
          pos = clone(pos0);
        }
        return result0;
      }
      
      
      function cleanupExpected(expected) {
        expected.sort();
        
        var lastExpected = null;
        var cleanExpected = [];
        for (var i = 0; i < expected.length; i++) {
          if (expected[i] !== lastExpected) {
            cleanExpected.push(expected[i]);
            lastExpected = expected[i];
          }
        }
        return cleanExpected;
      }
      
      
      
      var result = parseFunctions[startRule]();
      
      /*
       * The parser is now in one of the following three states:
       *
       * 1. The parser successfully parsed the whole input.
       *
       *    - |result !== null|
       *    - |pos.offset === input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 2. The parser successfully parsed only a part of the input.
       *
       *    - |result !== null|
       *    - |pos.offset < input.length|
       *    - |rightmostFailuresExpected| may or may not contain something
       *
       * 3. The parser did not successfully parse any part of the input.
       *
       *   - |result === null|
       *   - |pos.offset === 0|
       *   - |rightmostFailuresExpected| contains at least one failure
       *
       * All code following this comment (including called functions) must
       * handle these states.
       */
      if (result === null || pos.offset !== input.length) {
        var offset = Math.max(pos.offset, rightmostFailuresPos.offset);
        var found = offset < input.length ? input.charAt(offset) : null;
        var errorPosition = pos.offset > rightmostFailuresPos.offset ? pos : rightmostFailuresPos;
        
        throw new this.SyntaxError(
          cleanupExpected(rightmostFailuresExpected),
          found,
          offset,
          errorPosition.line,
          errorPosition.column
        );
      }
      
      return result;
    },
    
    /* Returns the parser source code. */
    toSource: function() { return this._source; }
  };
  
  /* Thrown when a parser encounters a syntax error. */
  
  result.SyntaxError = function(expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      var expectedHumanized, foundHumanized;
      
      switch (expected.length) {
        case 0:
          expectedHumanized = "end of input";
          break;
        case 1:
          expectedHumanized = expected[0];
          break;
        default:
          expectedHumanized = expected.slice(0, expected.length - 1).join(", ")
            + " or "
            + expected[expected.length - 1];
      }
      
      foundHumanized = found ? quote(found) : "end of input";
      
      return "Expected " + expectedHumanized + " but " + foundHumanized + " found.";
    }
    
    this.name = "SyntaxError";
    this.expected = expected;
    this.found = found;
    this.message = buildMessage(expected, found);
    this.offset = offset;
    this.line = line;
    this.column = column;
  };
  
  result.SyntaxError.prototype = Error.prototype;
  
  return result;
})();
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
