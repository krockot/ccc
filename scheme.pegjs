// PEG.js Scheme R5RS grammar for Ccc

start
    = WS p:program WS { return p; }

/////////////// LEXICAL STRUCTURE

space
    = [ \t\f\r\n\v\xa0\u2000-\u200b\u2028\u2029\u202f\u3000]

nothing
	= space
	/ comment

WS
    = nothing* { return ''; }

DL
    = &[ \t\f\r\n();[\]"] WS
    / !.

comment
    = ";" [^\n\r]* [\n\r]?
    / "#;" WS datum

symbol
    = "\u03bb" {
        return new Ccc.Symbol("lambda");
    }
    / i:initial j:subsequent* DL {
        return new Ccc.Symbol(i + j.join(""));
    }
    / i:peculiar_identifier DL {
        return new Ccc.Symbol(i);
    }
    / quoted_symbol

initial
    = letter
    / special_initial

letter
    = [a-z]i

special_initial
    = [!$%&*/:<=>?^_~]
    / !space c:[\x80-\uffff] { return c; }

subsequent
    = initial
    / digit
    / special_subsequent

digit
    = [0-9]

special_subsequent
    = "+" / "-" / "." / "@"

peculiar_identifier
    = "+" / "-" / "..."

boolean
    = "#t"i DL { return Ccc.True; }
    / "#f"i DL { return Ccc.False; }

character
    = "#\\space"i DL { return new Ccc.Character(" "); }
    / "#\\newline"i DL { return new Ccc.Character("\n"); }
    / "#\\" c:. DL { return new Ccc.Character(c); }

string
    = "\"" chars:string_element* "\"" {
        return new Ccc.String(chars.join(""));
    }

escape_sequence
    = "\\\\" { return "\\"; }
    / "\\n" { return "\n"; }
    / "\\t" { return "\t"; }
    / "\\f" { return "\f"; }
    / "\\r" { return "\r"; }
    / "\\'" { return "'"; }
    / "\\\"" { return "\""; }
    / "\\x" a:digit_16 b:digit_16 {
        return String.fromCharCode(parseInt(a + b, 16));
    }
    / "\\u" a:digit_16 b:digit_16 c:digit_16 d:digit_16 {
        return String.fromCharCode(parseInt(a + b + c + d, 16));
    }

string_element
    = [^"\\]
    / escape_sequence
    
quoted_symbol
    = "|" chars:symbol_element+ "|" {
        return new Ccc.Symbol(chars.join(""));
    }

symbol_element
    = [^|\\]
    / "\\|" { return "|"; }
    / escape_sequence

null_value
	= "()" { return Ccc.Nil; }
    / "[]" { return Ccc.Nil; }

unspecific
    = "#!unspecific" { return Ccc.Unspecified; }

//////////////////// NUMBER

number
    = num_2 / num_8 / n:num_10 / num_16

suffix
    = e:exponent_marker s:sign? d:digit_10+ {
        var val = parseInt(d.join(""), 10);
        if (s === "-") {
            val = -val;
        }
        e = {s: 0, e: 1, f: 1, d: 2, l: 3}[e];
        return { precision: e, value: val };
    }

exponent_marker
    = [esfdl]i

sign
    = "+"
    / "-"

exactness
    = "#i"i { return false; }
    / "#e"i { return true; }

////////////// BINARY NUMBER

num_2
    = e:prefix_2 n:complex_2 DL {
        if (e === true) {
            return n.toExact();
        }
        else if (e === false) {
            return n.toInexact();
        }
        else {
            return n;
        }
    }

complex_2
    = r:real_2 "@" a:real_2 { return Ccc.Numeric.fromPolar(r.toInexact().realNumer, a.toInexact().realNumer); }
    / r:real_2 "+" i:ureal_2 "i"i { return new Ccc.Complex(r, i); }
    / r:real_2 "-" i:ureal_2 "i"i { return new Ccc.Complex(r, i.negative()); }
    / r:real_2 "+i"i { return new Ccc.Complex(r, 1); }
    / r:real_2 "-i"i { return new Ccc.Complex(r, -1); }
    / "+" i:ureal_2 "i"i { return new Ccc.Complex(0, i); }
    / "-" i:ureal_2 "i"i { return new Ccc.Complex(0, i.negative()); }
    / real_2
    / "+i"i { return new Ccc.Complex(0, 1); }
    / "-i"i { return new Ccc.Complex(0, -1); }

real_2
    = s:sign? n:ureal_2 {
        return (s === "-") ? n.negative() : n;
    }

ureal_2
    = n:uinteger_2 "/" d:uinteger_2 {
        return Ccc.ParseUtil.makeRational(n, d);
    }
    / uinteger_2

uinteger_2
    = d:digit_2+ h:"#"* { return Ccc.ParseUtil.realFromTokens(d, h, 2); }
 
prefix_2
    = radix_2 e:exactness? { return e; }
    / e:exactness? radix_2 { return e; }

radix_2
    = "#b"i

digit_2
    = [01]

/////////////// OCTAL NUMBER

num_8
    = e:prefix_8 n:complex_8 DL {
        if (e === true) {
            return n.toExact();
        }
        else if (e === false) {
            return n.toInexact();
        }
        else {
            return n;
        }
    }

complex_8
    = r:real_8 "@" a:real_8 { return Ccc.Numeric.fromPolar(r.toInexact().realNumer, a.toInexact().realNumer); }
    / r:real_8 "+" i:ureal_8 "i"i { return new Ccc.Complex(r, i); }
    / r:real_8 "-" i:ureal_8 "i"i { return new Ccc.Complex(r, i.negative()); }
    / r:real_8 "+i"i { return new Ccc.Complex(r, 1); }
    / r:real_8 "-i"i { return new Ccc.Complex(r, -1); }
    / "+" i:ureal_8 "i"i { return new Ccc.Complex(0, i); }
    / "-" i:ureal_8 "i"i { return new Ccc.Complex(0, i.negative()); }
    / real_8
    / "+i"i { return new Ccc.Complex(0, 1); }
    / "-i"i { return new Ccc.Complex(0, -1); }

real_8
    = s:sign? n:ureal_8 {
        return (s === "-") ? n.negative() : n;
    }

ureal_8
    = n:uinteger_8 "/" d:uinteger_8 {
        return Ccc.ParseUtil.makeRational(n, d);
    }
    / uinteger_8

uinteger_8
    = d:digit_8+ h:"#"* { return Ccc.ParseUtil.realFromTokens(d, h, 8); }

prefix_8
    = radix_8 e:exactness? { return e; }
    / e:exactness? radix_8 { return e; }

radix_8
    = "#o"i

digit_8
    = [0-7]

///////////////// DECIMAL NUMBER

num_10
    = e:prefix_10? n:complex_10 DL {
        if (e === true) {
            return n.toExact();
        }
        else if (e === false) {
            return n.toInexact();
        }
        else {
            return n;
        }
    }

complex_10
    = r:real_10 "@" a:real_10 { return Ccc.Numeric.fromPolar(r.toInexact().realNumer, a.toInexact().realNumer); }
    / r:real_10 "+" i:ureal_10 "i"i { return new Ccc.Complex(r, i); }
    / r:real_10 "-" i:ureal_10 "i"i { return new Ccc.Complex(r, i.negative()); }
    / r:real_10 "+i"i { return new Ccc.Complex(r, 1); }
    / r:real_10 "-i"i { return new Ccc.Complex(r, -1); }
    / "+" i:ureal_10 "i"i { return new Ccc.Complex(0, i); }
    / "-" i:ureal_10 "i"i { return new Ccc.Complex(0, i.negative()); }
    / real_10
    / "+i"i { return new Ccc.Complex(0, 1); }
    / "-i"i { return new Ccc.Complex(0, -1); }

real_10
    = s:sign? n:ureal_10 {
        return (s === "-") ? n.negative() : n;
    }

ureal_10
    = n:uinteger_10 "/" d:uinteger_10 {
        return Ccc.ParseUtil.makeRational(n, d);
    }
    / decimal_10
    / uinteger_10

decimal_10
    = a:digit_10+ ha:"#"+ "." hb:"#"* s:suffix? {
        return Ccc.ParseUtil.numberFromDecimal(parseFloat(a.join("") + "."), ha, hb, s, true);
    }
    / a:digit_10+ "." b:digit_10* hb:"#"* s:suffix? {
        return Ccc.ParseUtil.numberFromDecimal(parseFloat(a.join("") + "." + b.join("")), '', hb, s, true);
    }
    / "." b:digit_10+ hb:"#"* s:suffix? {
        return Ccc.ParseUtil.numberFromDecimal(parseFloat("." + b.join("")), '', hb, s, true);
    }
    / n:uinteger_10 s:suffix? {
        return Ccc.ParseUtil.numberFromDecimal(n, '', '', s, false);
    }

uinteger_10
    = d:digit_10+ h:"#"* { return Ccc.ParseUtil.realFromTokens(d, h, 10); }

prefix_10
    = radix_10 e:exactness { return e; }
    / e:exactness radix_10 { return e; }
    / e:exactness { return e; }
    / radix_10 { return ''; }

radix_10
    = "#d"i

digit_10
    = digit

//////////////// HEXIDECIMAL NUMBER

num_16
    = e:prefix_16 n:complex_16 DL {
        if (e === true) {
            return n.toExact();
        }
        else if (e === false) {
            return n.toInexact();
        }
        else {
            return n;
        }
    }

complex_16
    = r:real_16 "@" a:real_16 { return Ccc.Numeric.fromPolar(r.toInexact().realNumer, a.toInexact().realNumer); }
    / r:real_16 "+" i:ureal_16 "i"i { return new Ccc.Complex(r, i); }
    / r:real_16 "-" i:ureal_16 "i"i { return new Ccc.Complex(r, i.negative()); }
    / r:real_16 "+i"i { return new Ccc.Complex(r, 1); }
    / r:real_16 "-i"i { return new Ccc.Complex(r, -1); }
    / "+" i:ureal_16 "i"i { return new Ccc.Complex(0, i); }
    / "-" i:ureal_16 "i"i { return new Ccc.Complex(0, i.negative()); }
    / "+i"i { return new Ccc.Complex(0, 1); }
    / "-i"i { return new Ccc.Complex(0, -1); }
    / real_16

real_16
    = s:sign? n:ureal_16 {
        return (s === "-") ? n.negative() : n;
    }

ureal_16
    = n:uinteger_16 "/" d:uinteger_16 {
        return Ccc.ParseUtil.makeRational(n, d);
    }
    / uinteger_16

uinteger_16
    = d:digit_16+ h:"#"* { return Ccc.ParseUtil.realFromTokens(d, h, 16); }

prefix_16
    = radix_16 e:exactness? { return e; }
    / e:exactness? radix_16 { return e; }

radix_16
    = "#x"i

digit_16
    = digit_10
    / [abcdef]i


/////////// EXTERNAL REPRESENTATIONS

datum
    = simple_datum
    / compound_datum

simple_datum
    = boolean
    / number
    / character
    / string
    / symbol
	/ null_value
    / unspecific

compound_datum
    = list
    / vector

list
    = "(" WS items:(datum WS)* ")" {
		var list = Ccc.ParseUtil.arrayFromArrays(items, 0);
		return Ccc.Pair.fromArray(list);
	}
    / "[" WS items:(datum WS)* "]" {
		var list = Ccc.ParseUtil.arrayFromArrays(items, 0);
		return Ccc.Pair.fromArray(list);
	}
    / "(" WS items:(datum WS)+ "." DL tail:datum WS ")" {
		var list = Ccc.ParseUtil.arrayFromArrays(items, 0);
		return Ccc.Pair.fromArray(list, tail);
	}
    / "[" WS items:(datum WS)+ "." DL tail:datum WS "]" {
		var list = Ccc.ParseUtil.arrayFromArrays(items, 0);
		return Ccc.Pair.fromArray(list, tail);
	}
    / abbreviation

abbreviation
    = ",@" WS datum:datum {
        return new Ccc.Pair(new Ccc.Symbol('unquote-splicing'), new Ccc.Pair(datum, Ccc.Nil));
    }
    / "'" WS datum:datum {
        return new Ccc.Pair(new Ccc.Symbol('quote'), new Ccc.Pair(datum, Ccc.Nil));
    }
    / "`" WS datum:datum {
        return new Ccc.Pair(new Ccc.Symbol('quasiquote'), new Ccc.Pair(datum, Ccc.Nil));
    }
    / "," WS datum:datum {
        return new Ccc.Pair(new Ccc.Symbol('unquote'), new Ccc.Pair(datum, Ccc.Nil));
    }

vector
    = "#(" WS items:(datum WS)* ")" {
        var data = Ccc.ParseUtil.arrayFromArrays(items, 0);
        return new Ccc.Vector(data);
    }
    / "#[" WS items:(datum WS)* "]" {
        var data = Ccc.ParseUtil.arrayFromArrays(items, 0);
        return new Ccc.Vector(data);
    }

program
    = data:(datum WS)* {
        return new Ccc.Program(Ccc.ParseUtil.arrayFromArrays(data, 0));
    }
