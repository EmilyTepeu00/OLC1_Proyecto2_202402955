/* ANALIZADOR LEXICO Y SINTACTICO */
%lex

%%

// --- REGLAS LEXICAS ---
\s+                   /* ignorar espacios en blanco */
\/\/[^\n]*            /* ignorar comentarios de una linea */
\/\*[^*]*\*+\/([^*/][^*]*\*+\/)*  /* ignorar comentarios multilinea */

// PALABRAS RESERVADAS
"func"                return 'FUNC';
"var"                 return 'VAR';
"if"                  return 'IF';
"else"                return 'ELSE';
"for"                 return 'FOR';
"return"              return 'RETURN';
"switch"              return 'SWITCH';
"case"                return 'CASE';
"default"             return 'DEFAULT';
"break"               return 'BREAK';
"continue"            return 'CONTINUE';
"struct"              return 'STRUCT';
"true"                return 'TRUE';
"false"               return 'FALSE';
"nil"                 return 'NIL';

// OPERADORES Y SIGNOS
"+"                   return 'SUMA';
"-"                   return 'RESTA';
"*"                   return 'MULTIPLICACION';
"/"                   return 'DIVISION';
"%"                   return 'MODULO';
"=="                  return 'IGUAL_IGUAL';
"!="                  return 'DIFERENTE';
">"                   return 'MAYOR';
"<"                   return 'MENOR';
">="                  return 'MAYOR_IGUAL';
"<="                  return 'MENOR_IGUAL';
"&&"                  return 'AND';
"||"                  return 'OR';
"!"                   return 'NOT';
"="                   return 'ASIGNACION';
"+="                  return 'MAS_IGUAL';
"-="                  return 'MENOS_IGUAL';
"("                   return 'PAREN_IZQ';
")"                   return 'PAREN_DER';
"{"                   return 'LLAVE_IZQ';
"}"                   return 'LLAVE_DER';
"["                   return 'CORCH_IZQ';
"]"                   return 'CORCH_DER';
","                   return 'COMA';
";"                   return 'PUNTOCOMA';
":"                   return 'DOS_PUNTOS';
"."                   return 'PUNTO';

// IDENTIFICADORES Y LITERALES
[a-zA-Z_][a-zA-Z0-9_]*  return 'IDENTIFICADOR';
[0-9]+                return 'ENTERO';
[0-9]+\.[0-9]+        return 'FLOTANTE';
\"(\\.|[^"\\])*\"     return 'CADENA';
\'(\\.|[^'\\])*\'     return 'CARACTER';

// MANEJO DE ERRORES LEXICOS
.                     return 'LEXICO_ERROR';

/lex

%start Programa

%%


// --- REGLAS SINTACTICAS ---

Programa
    : ListaDeclaraciones
    ;

ListaDeclaraciones
    : Declaracion ListaDeclaraciones
    | /* vacio */
    ;

Declaracion
    : DeclaracionStruct
    | DeclaracionFuncion
    | Sentencia
    ;

DeclaracionStruct
    : STRUCT IDENTIFICADOR LLAVE_IZQ ListaAtributosStruct LLAVE_DER
    ;

ListaAtributosStruct
    : Tipo IDENTIFICADOR PUNTOCOMA ListaAtributosStruct
    | /* vacio */
    ;

DeclaracionFuncion
    : FUNC IDENTIFICADOR PAREN_IZQ ListaParametros PAREN_DER TipoOpt LLAVE_IZQ ListaSentencias LLAVE_DER
    ;

TipoOpt
    : Tipo
    | /* vacio */
    ;

Tipo
    : "int"
    | "float64"
    | "string"
    | "bool"
    | "rune"
    | CORCH_IZQ CORCH_DER Tipo  // Para slices -> []int
    | IDENTIFICADOR              // Para structs
    ;

ListaParametros
    : Parametro COMA ListaParametros
    | Parametro
    | /* vacio */
    ;

Parametro
    : IDENTIFICADOR Tipo
    ;

ListaSentencias
    : Sentencia ListaSentencias
    | /* vacio */
    ;

Sentencia
    : DeclaracionVariable
    | Asignacion
    | IfSentencia
    | ForSentencia
    | SwitchSentencia
    | BreakSentencia
    | ContinueSentencia
    | ReturnSentencia
    | LlamadaFuncion
    | Bloque
    ;

DeclaracionVariable
    : VAR IDENTIFICADOR Tipo ASIGNACION Expresion PUNTOCOMA?
    | VAR IDENTIFICADOR Tipo PUNTOCOMA?
    | IDENTIFICADOR DOS_PUNTOS ASIGNACION Expresion PUNTOCOMA?
    ;

Asignacion
    : IDENTIFICADOR OperadorAsignacion Expresion PUNTOCOMA?
    ;

OperadorAsignacion
    : ASIGNACION
    | MAS_IGUAL
    | MENOS_IGUAL
    ;

IfSentencia
    : IF Expresion Bloque ElseOpt
    ;

ElseOpt
    : ELSE Bloque
    | ELSE IfSentencia
    | /* vacio */
    ;

ForSentencia
    : FOR Expresion Bloque
    | FOR Asignacion PUNTOCOMA? Expresion PUNTOCOMA? Asignacion Bloque
    ;

SwitchSentencia
    : SWITCH Expresion LLAVE_IZQ ListaCases LLAVE_DER
    ;

ListaCases
    : Case ListaCases
    | /* vacio */
    ;

Case
    : CASE Expresion DOS_PUNTOS ListaSentencias
    | DEFAULT DOS_PUNTOS ListaSentencias
    ;

BreakSentencia
    : BREAK PUNTOCOMA?
    ;

ContinueSentencia
    : CONTINUE PUNTOCOMA?
    ;

ReturnSentencia
    : RETURN ExpresionOpt PUNTOCOMA?
    ;

ExpresionOpt
    : Expresion
    | /* vacio */
    ;

Bloque
    : LLAVE_IZQ ListaSentencias LLAVE_DER
    ;

LlamadaFuncion
    : IDENTIFICADOR PAREN_IZQ ListaArgumentos PAREN_DER PUNTOCOMA?
    ;

ListaArgumentos
    : Expresion COMA ListaArgumentos
    | Expresion
    | /* vacio */
    ;

Expresion
    : ExpresionLogica
    ;

ExpresionLogica
    : ExpresionIgualdad
    | ExpresionIgualdad AND ExpresionIgualdad
    | ExpresionIgualdad OR ExpresionIgualdad
    ;

ExpresionIgualdad
    : ExpresionRelacional
    | ExpresionRelacional IGUAL_IGUAL ExpresionRelacional
    | ExpresionRelacional DIFERENTE ExpresionRelacional
    ;

ExpresionRelacional
    : ExpresionAditiva
    | ExpresionAditiva MAYOR ExpresionAditiva
    | ExpresionAditiva MENOR ExpresionAditiva
    | ExpresionAditiva MAYOR_IGUAL ExpresionAditiva
    | ExpresionAditiva MENOR_IGUAL ExpresionAditiva
    ;

ExpresionAditiva
    : ExpresionMultiplicativa
    | ExpresionAditiva SUMA ExpresionMultiplicativa
    | ExpresionAditiva RESTA ExpresionMultiplicativa
    ;

ExpresionMultiplicativa
    : ExpresionUnaria
    | ExpresionMultiplicativa MULTIPLICACION ExpresionUnaria
    | ExpresionMultiplicativa DIVISION ExpresionUnaria
    | ExpresionMultiplicativa MODULO ExpresionUnaria
    ;

ExpresionUnaria
    : ExpresionPrimaria
    | NOT ExpresionPrimaria
    | RESTA ExpresionPrimaria
    ;

ExpresionPrimaria
    : ENTERO
    | FLOTANTE
    | CADENA
    | CARACTER
    | TRUE
    | FALSE
    | NIL
    | IDENTIFICADOR
    | LlamadaFuncion
    | PAREN_IZQ Expresion PAREN_DER
    | CORCH_IZQ ListaElementos CORCH_DER   // Para slices literales, -> []int{1,2,3}
    | CORCH_IZQ CORCH_DER Tipo LLAVE_IZQ ListaElementos LLAVE_DER  // Otro slice literal
    | IDENTIFICADOR PUNTO IDENTIFICADOR    // Acceso a atributo de struct
    ;

ListaElementos
    : Expresion COMA ListaElementos
    | Expresion
    | /* vacio */
    ;

%%