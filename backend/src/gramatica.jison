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
    ;

lista_declaraciones
    : declaracion lista_declaraciones
    |
    ;

declaracion
    : funcion
    ;

funcion
    : FUNC IDENTIFICADOR PARENIZQ lista_parametros PARENDER tipo_op LLAVEIZQ lista_sentencias LLAVEDER
    ;

lista_parametros
    : parametro COMA lista_parametros
    | parametro
    |
    ;

parametro
    : IDENTIFICADOR tipo
    ;

tipo_op
    : tipo
    |
    ;

tipo
    : INT
    | FLOAT64
    | STRING
    | BOOL
    | RUNE
    | IDENTIFICADOR             // Para structs
    | CORCHIZQ CORCHDER tipo    //Para slices -> []int
    ;

lista_sentencias
    : sentencia lista_sentencias
    |
    ;

sentencia
    : declaracion_variable
    | asignacion
    | llamada_funcion PUNTOCOMA?
    | bloque
    ;

bloque
    : LLAVEIZQ lista_sentencias LLAVEDER
    ;

declaracion_variable
    : VAR IDENTIFICADOR tipo ASIGN expresion PUNTOCOMA?
    | VAR IDENTIFICADOR tipo PUNTOCOMA?
    | IDENTIFICADOR DOSPUNTOS ASIGN expresion PUNTOCOMA?
    ;

asignacion
    : IDENTIFICADOR operador_asign expresion PUNTOCOMA?
    ;

operador_asign
    : ASIGN
    | MASIGUAL
    | MENOSIGUAL
    ;

llamada_funcion
    : IDENTIFICADOR PARENIZQ lista_argumentos PARENDER
    ;

lista_argumentos
    : expresion COMA lista_argumentos
    | expresion
    |
    ;

expresion
    : expresion_logica
    ;

expresion_logica
    : expresion_igualdad
    | expresion_logica AND expresion_igualdad
    | expresion_logica OR expresion_igualdad
    ;

expresion_igualdad
    : expresion_relacional
    | expresion_igualdad IGUAL expresion_relacional
    | expresion_igualdad DIFERENTE expresion_relacional
    ;

expresion_relacional
    : expresion_aditiva
    | expresion_relacional MAYOR expresion_aditiva
    | expresion_relacional MENOR expresion_aditiva
    | expresion_relacional MAYORIGUAL expresion_aditiva
    | expresion_relacional MENORIGUAL expresion_aditiva
    ;

expresion_aditiva
    : expresion_multiplicativa
    | expresion_aditiva SUMA expresion_multiplicativa
    | expresion_aditiva RESTA expresion_multiplicativa
    ;

expresion_multiplicativa
    : expresion_unaria
    | expresion_multiplicativa MULT expresion_unaria
    | expresion_multiplicativa DIV expresion_unaria
    | expresion_multiplicativa MOD expresion_unaria
    ;

expresion_unaria
    : expresion_primaria
    | NOT expresion_primaria
    | RESTA expresion_primaria
    ;

expresion_primaria
    : ENTERO
    | FLOTANTE
    | CADENA
    | CARACTER
    | TRUE
    | FALSE
    | NIL
    | IDENTIFICADOR
    | llamada_funcion
    | PARENIZQ expresion PARENDER
    ;

%%