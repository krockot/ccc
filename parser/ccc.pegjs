// PEG.js grammar for the ccc language

start
  = __ p:program __ { return p; }

space
  = [ \t\f\r\n\v\xa0\u2000-\u200b\u2028\u2029\u202f\u3000]

nothing
  = space
  / comment

delimiter
  = [ "\t\f\r\n();[\]\|]

__
  = nothing* { return ''; }

DL
  = &delimiter __
  / !.

comment
  = ";" [^\n\r]* [\n\r]?
  / "#;" __ datum

symbol
  = i:symbol_initial c:symbol_character* DL {
    return new ccc.Symbol(i + c.join(""));
  }
  / quoted_symbol

symbol_initial
  = ![#',`.] c:symbol_character { return c; }
  / i:"." j:symbol_character { return i + j; }

symbol_character
  = !delimiter c:. { return c; }

digit
  = [0-9]

hexdigit
  = [0-9a-f]i

boolean
  = "#t"i DL { return ccc.t; }
  / "#f"i DL { return ccc.f; }

character
  = "#\\space"i DL { return new ccc.Char(32); }
  / "#\\newline"i DL { return new ccc.Char(10); }
  / "#\\x"i a:hexdigit b:hexdigit DL {
    return new ccc.Char(parseInt(a + b, 16));
  }
  / "#\\u"i a:hexdigit b:hexdigit c:hexdigit d:hexdigit DL {
    return new ccc.Char(parseInt(a + b + c + d, 16));
  }
  / "#\\" c:. DL { return new ccc.Char(c.charCodeAt(0)); }

string
  = "\"" chars:string_element* "\"" {
    return new ccc.String(chars.join(""));
  }

escape_sequence
  = "\\\\" { return "\\"; }
  / "\\n" { return "\n"; }
  / "\\t" { return "\t"; }
  / "\\f" { return "\f"; }
  / "\\r" { return "\r"; }
  / "\\'" { return "'"; }
  / "\\\"" { return "\""; }
  / "\\x" a:hexdigit b:hexdigit {
    return String.fromCharCode(parseInt(a + b, 16));
  }
  / "\\u" a:hexdigit b:hexdigit c:hexdigit d:hexdigit {
    return String.fromCharCode(parseInt(a + b + c + d, 16));
  }

string_element
  = [^"\\]
  / escape_sequence

quoted_symbol
  = "|" chars:symbol_element+ "|" {
    return new ccc.Symbol(chars.join(""));
  }

symbol_element
  = [^|\\]
  / "\\|" { return "|"; }
  / escape_sequence

null_value
  = "(" __ ")" { return ccc.nil; }
  / "[" __ "]" { return ccc.nil; }

unspecific
  = "#?" { return ccc.unspecified; }

number
  = num_2 / num_8 / num_16 / num_10

num_2
  = "#b"i sign:[-+]? digits:[01]+ DL {
    return new ccc.Number(parseInt(sign + digits.join(""), 2));
  }

num_8
  = "#o"i sign:[-+]? digits:[0-7]+ DL {
    return new ccc.Number(parseInt(sign + digits.join(""), 8));
  }

num_16
  = "#x"i sign:[-+]? digits:hexdigit+ DL {
    return new ccc.Number(parseInt(sign + digits.join(""), 16));
  }

suffix
  = e:[eE] s:[-+]? d:digit+ { return e + s + d.join(""); }

num_10
  = "#d"i? sign:[-+]? intPart:digit* "." fracPart:digit+ suffix:suffix? DL {
    return new ccc.Number(parseFloat(sign + intPart.join("") + "." + fracPart.join("") + suffix));
  }
  / "#d"i? sign:[-+]? intPart:digit+ "." fracPart:digit* suffix:suffix? DL {
    return new ccc.Number(parseFloat(sign + intPart.join("") + "." + fracPart.join("") + suffix));
  }
  / "#d"i? sign:[-+]? digits:digit+ suffix:suffix? DL {
    return new ccc.Number(parseFloat(sign + digits.join("") + suffix));
  }

datum
  = simple_datum
  / compound_datum

simple_datum
  = boolean
  / number
  / character
  / string
  / null_value
  / unspecific
  / symbol

compound_datum
    = list
    / vector

list
  = "(" __ data:(datum __)+ "." __ tail:datum __ ")" {
    return ccc.Pair.makeImproperList(data.map(function (e) { return e[0]; }), tail);
  }
  / "(" __ data:(datum __)+ ")" {
    return ccc.Pair.makeList.apply(null, data.map(function (e) { return e[0]; }));
  }
  / "[" __ data:(datum __)+ "." __ tail:datum __ "]" {
    return ccc.Pair.makeImproperList(data.map(function (e) { return e[0]; }), tail);
  }
  / "[" __ data:(datum __)+ "]" {
    return ccc.Pair.makeList.apply(null, data.map(function (e) { return e[0]; }));
  }
  / abbreviation

abbreviation
  = ",@" __ datum:datum {
    return ccc.Pair.makeList(new ccc.Symbol('unquote-splicing'), datum);
  }
  / "'" __ datum:datum {
    return ccc.Pair.makeList(new ccc.Symbol('quote'), datum);
  }
  / "`" __ datum:datum {
    return ccc.Pair.makeList(new ccc.Symbol('quasiquote'), datum);
  }
  / "," __ datum:datum {
    return ccc.Pair.makeList(new ccc.Symbol('unquote'), datum);
  }

vector
  = "#(" __ elements:(datum __)* ")" {
    return new ccc.Vector(elements.map(function(e) { return e[0]; }));
  }
  / "#[" __ elements:(datum __)* "]" {
    return new ccc.Vector(elements.map(function(e) { return e[0]; }));
  }

program
  = data:(datum __)* {
    return data.map(function(e) { return e[0] });
  }
