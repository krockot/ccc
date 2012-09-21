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
