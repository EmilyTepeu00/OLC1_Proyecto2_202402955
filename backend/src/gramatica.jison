/* ANALIZADOR LEXICO Y SINTACTICO */

%lex
%%

// --- REGLAS LEXICAS ---
\s+                   /* ignorar espacios */
\/\/[^\n]*            /* comentario una linea */
\/\*[^*]*\*+\/([^*/][^*]*\*+\/)*  /* comentario multilinea */

// PALABRAS RESERVADAS
"func"                return 'FUNC'
"var"                 return 'VAR'
"if"                  return 'IF'
"else"                return 'ELSE'
"for"                 return 'FOR'
"return"              return 'RETURN'
"switch"              return 'SWITCH'
"case"                return 'CASE'
"default"             return 'DEFAULT'
"break"               return 'BREAK'
"continue"            return 'CONTINUE'
"struct"              return 'STRUCT'
"true"                return 'TRUE'
"false"               return 'FALSE'
"nil"                 return 'NIL'

// OPERADORES Y SIGNOS
"+"                   return 'SUMA'
"-"                   return 'RESTA'
"*"                   return 'MULT'
"/"                   return 'DIV'
"%"                   return 'MOD'
"=="                  return 'IGUAL'
"!="                  return 'DIFERENTE'
">"                   return 'MAYOR'
"<"                   return 'MENOR'
">="                  return 'MAYORIGUAL'
"<="                  return 'MENORIGUAL'
"&&"                  return 'AND'
"||"                  return 'OR'
"!"                   return 'NOT'
"="                   return 'ASIGN'
"+="                  return 'MASIGUAL'
"-="                  return 'MENOSIGUAL'
"("                   return 'PARENIZQ'
")"                   return 'PARENDER'
"{"                   return 'LLAVEIZQ'
"}"                   return 'LLAVEDER'
"["                   return 'CORCHIZQ'
"]"                   return 'CORCHDER'
","                   return 'COMA'
";"                   return 'PUNTOCOMA'
":"                   return 'DOSPUNTOS'
"."                   return 'PUNTO'

"int"                 return 'INT'
"float64"             return 'FLOAT64'
"string"              return 'STRING'
"bool"                return 'BOOL'
"rune"                return 'RUNE'

// IDENTIFICADORES Y LITERALES
[a-zA-Z_][a-zA-Z0-9_]*  return 'IDENTIFICADOR'
[0-9]+                return 'ENTERO'
[0-9]+\.[0-9]+        return 'FLOTANTE'
\"(\\.|[^"\\])*\"     return 'CADENA'
\'(\\.|[^'\\])*\'     return 'CARACTER'

.                     return 'ERROR'

/lex

%start programa

%%

// --- REGLAS SINTACTICAS ---

programa
    : lista_declaraciones
        { 
            return { type: 'Programa', declaraciones: $1 }; 
        }
    ;

lista_declaraciones
    : declaracion lista_declaraciones
        { $$ = [$1].concat($2); }
    | /* vacio */
        { $$ = []; }
    ;

declaracion
    : funcion
        { $$ = $1; }
    ;

funcion
    : FUNC IDENTIFICADOR PARENIZQ lista_parametros PARENDER tipo_op LLAVEIZQ lista_sentencias LLAVEDER
        { 
            $$ = { 
                type: 'Function', 
                name: $2,
                children: [
                    { type: 'FUNC', value: 'func' },
                    { type: 'IDENTIFICADOR', value: $2 },
                    { type: 'PARENIZQ', value: '(' },
                    { type: 'ParamList', children: $4 },
                    { type: 'PARENDER', value: ')' },
                    { type: 'tipo_op', value: $6 },
                    { type: 'LLAVEIZQ', value: '{' },
                    { type: 'StatementList', children: $8 },
                    { type: 'LLAVEDER', value: '}' }
                ]
            };
        }
    ;

lista_parametros
    : parametro COMA lista_parametros
        { $$ = [$1].concat($3); }
    | parametro
        { $$ = [$1]; }
    | /* vacio */
        { $$ = []; }
    ;

parametro
    : IDENTIFICADOR tipo
        { $$ = { type: 'Param', name: $1, tipo: $2 }; }
    ;

tipo_op
    : tipo
        { $$ = $1; }
    | /* vacio */
        { $$ = null; }
    ;

tipo
    : INT
        { $$ = 'int'; }
    | FLOAT64
        { $$ = 'float64'; }
    | STRING
        { $$ = 'string'; }
    | BOOL
        { $$ = 'bool'; }
    | RUNE
        { $$ = 'rune'; }
    | IDENTIFICADOR
        { $$ = $1; }
    | CORCHIZQ CORCHDER tipo
        { $$ = { type: 'slice', tipo: $3 }; }
    ;

lista_sentencias
    : sentencia lista_sentencias
        { $$ = [$1].concat($2); }
    | /* vacio */
        { $$ = []; }
    ;

sentencia
    : declaracion_variable
        { $$ = $1; }
    | asignacion
        { $$ = $1; }
    | llamada_funcion PUNTOCOMA?
        { $$ = $1; }
    | bloque
        { $$ = $1; }
    ;

bloque
    : LLAVEIZQ lista_sentencias LLAVEDER
        { $$ = { type: 'Bloque', children: $2 }; }
    ;

declaracion_variable
    : VAR IDENTIFICADOR tipo ASIGN expresion PUNTOCOMA?
        { 
            $$ = { 
                type: 'DeclaracionVariable', 
                children: [
                    { type: 'VAR', value: 'var' },
                    { type: 'IDENTIFICADOR', value: $2 },
                    { type: 'tipo', value: $3 },
                    { type: 'ASIGN', value: '=' },
                    { type: 'Expression', children: [$5] },
                    { type: 'PUNTOCOMA', value: ';' }
                ]
            };
        }
    | VAR IDENTIFICADOR tipo PUNTOCOMA?
        { 
            $$ = { 
                type: 'DeclaracionVariable', 
                children: [
                    { type: 'VAR', value: 'var' },
                    { type: 'IDENTIFICADOR', value: $2 },
                    { type: 'tipo', value: $3 },
                    { type: 'PUNTOCOMA', value: ';' }
                ]
            };
        }
    | IDENTIFICADOR DOSPUNTOS ASIGN expresion PUNTOCOMA?
        { 
            $$ = { 
                type: 'DeclaracionVariable', 
                children: [
                    { type: 'IDENTIFICADOR', value: $1 },
                    { type: 'DOSPUNTOS', value: ':=' },
                    { type: 'Expression', children: [$4] },
                    { type: 'PUNTOCOMA', value: ';' }
                ]
            };
        }
    ;

asignacion
    : IDENTIFICADOR operador_asign expresion PUNTOCOMA?
        { 
            $$ = { 
                type: 'Asignacion', 
                children: [
                    { type: 'IDENTIFICADOR', value: $1 },
                    { type: 'operador_asign', value: $2 },
                    { type: 'Expression', children: [$3] },
                    { type: 'PUNTOCOMA', value: ';' }
                ]
            };
        }
    ;

operador_asign
    : ASIGN
        { $$ = '='; }
    | MASIGUAL
        { $$ = '+='; }
    | MENOSIGUAL
        { $$ = '-='; }
    ;

llamada_funcion
    : IDENTIFICADOR PARENIZQ lista_argumentos PARENDER
        { 
            $$ = { 
                type: 'LlamadaFuncion', 
                name: $1,
                children: [
                    { type: 'IDENTIFICADOR', value: $1 },
                    { type: 'PARENIZQ', value: '(' },
                    { type: 'ArgumentList', children: $3 },
                    { type: 'PARENDER', value: ')' }
                ]
            };
        }
    | IDENTIFICADOR PUNTO IDENTIFICADOR PARENIZQ lista_argumentos PARENDER
        { 
            $$ = { 
                type: 'LlamadaFuncion', 
                name: $1 + '.' + $3,
                children: [
                    { type: 'IDENTIFICADOR', value: $1 },
                    { type: 'PUNTO', value: '.' },
                    { type: 'IDENTIFICADOR', value: $3 },
                    { type: 'PARENIZQ', value: '(' },
                    { type: 'ArgumentList', children: $5 },
                    { type: 'PARENDER', value: ')' }
                ]
            };
        }
    ;

lista_argumentos
    : expresion COMA lista_argumentos
        { $$ = [$1].concat($3); }
    | expresion
        { $$ = [$1]; }
    | /* vacio */
        { $$ = []; }
    ;

argumentos
    : lista_argumentos
        { $$ = $1; }
    ;

expresion
    : expresion_logica
        { $$ = $1; }
    ;

expresion_logica
    : expresion_igualdad
        { $$ = $1; }
    | expresion_logica AND expresion_igualdad
        { 
            $$ = { 
                type: 'OperacionLogica', 
                operator: '&&',
                children: [$1, $3]
            };
        }
    | expresion_logica OR expresion_igualdad
        { 
            $$ = { 
                type: 'OperacionLogica', 
                operator: '||',
                children: [$1, $3]
            };
        }
    ;

expresion_igualdad
    : expresion_relacional
        { $$ = $1; }
    | expresion_igualdad IGUAL expresion_relacional
        { 
            $$ = { 
                type: 'OperacionComparacion', 
                operator: '==',
                children: [$1, $3]
            };
        }
    | expresion_igualdad DIFERENTE expresion_relacional
        { 
            $$ = { 
                type: 'OperacionComparacion', 
                operator: '!=',
                children: [$1, $3]
            };
        }
    ;

expresion_relacional
    : expresion_aditiva
        { $$ = $1; }
    | expresion_relacional MAYOR expresion_aditiva
        { 
            $$ = { 
                type: 'OperacionComparacion', 
                operator: '>',
                children: [$1, $3]
            };
        }
    | expresion_relacional MENOR expresion_aditiva
        { 
            $$ = { 
                type: 'OperacionComparacion', 
                operator: '<',
                children: [$1, $3]
            };
        }
    | expresion_relacional MAYORIGUAL expresion_aditiva
        { 
            $$ = { 
                type: 'OperacionComparacion', 
                operator: '>=',
                children: [$1, $3]
            };
        }
    | expresion_relacional MENORIGUAL expresion_aditiva
        { 
            $$ = { 
                type: 'OperacionComparacion', 
                operator: '<=',
                children: [$1, $3]
            };
        }
    ;

expresion_aditiva
    : expresion_multiplicativa
        { $$ = $1; }
    | expresion_aditiva SUMA expresion_multiplicativa
        { 
            $$ = { 
                type: 'OperacionAritmetica', 
                operator: '+',
                children: [$1, $3]
            };
        }
    | expresion_aditiva RESTA expresion_multiplicativa
        { 
            $$ = { 
                type: 'OperacionAritmetica', 
                operator: '-',
                children: [$1, $3]
            };
        }
    ;

expresion_multiplicativa
    : expresion_unaria
        { $$ = $1; }
    | expresion_multiplicativa MULT expresion_unaria
        { 
            $$ = { 
                type: 'OperacionAritmetica', 
                operator: '*',
                children: [$1, $3]
            };
        }
    | expresion_multiplicativa DIV expresion_unaria
        { 
            $$ = { 
                type: 'OperacionAritmetica', 
                operator: '/',
                children: [$1, $3]
            };
        }
    | expresion_multiplicativa MOD expresion_unaria
        { 
            $$ = { 
                type: 'OperacionAritmetica', 
                operator: '%',
                children: [$1, $3]
            };
        }
    ;

expresion_unaria
    : expresion_primaria
        { $$ = $1; }
    | NOT expresion_primaria
        { 
            $$ = { 
                type: 'OperacionUnaria', 
                operator: '!',
                children: [$2]
            };
        }
    | RESTA expresion_primaria
        { 
            $$ = { 
                type: 'OperacionUnaria', 
                operator: '-',
                children: [$2]
            };
        }
    ;

expresion_primaria
    : ENTERO
        { $$ = { type: 'ENTERO', value: $1 }; }
    | FLOTANTE
        { $$ = { type: 'FLOTANTE', value: $1 }; }
    | CADENA
        { $$ = { type: 'CADENA', value: $1 }; }
    | CARACTER
        { $$ = { type: 'CARACTER', value: $1 }; }
    | TRUE
        { $$ = { type: 'TRUE', value: true }; }
    | FALSE
        { $$ = { type: 'FALSE', value: false }; }
    | NIL
        { $$ = { type: 'NIL', value: null }; }
    | IDENTIFICADOR
        { $$ = { type: 'IDENTIFICADOR', name: $1 }; }
    | llamada_funcion
        { $$ = $1; }
    | PARENIZQ expresion PARENDER
        { $$ = $2; }
    ;

%%