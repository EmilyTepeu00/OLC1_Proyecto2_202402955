/* SERVIDOR PRINCIPAL DE LA API REST */

const express = require('express');
const cors = require('cors');
const Evaluador = require('./evaluator');
const parser = require('./parser');
const graphviz = require('graphviz');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// NODOS DE RUIDO
const NODOS_RUIDO = new Set([
    'FUNC', 'VAR', 'IF', 'ELSE', 'FOR', 'RETURN', 'SWITCH',
    'CASE', 'DEFAULT', 'BREAK', 'CONTINUE', 'STRUCT',
    'PARENIZQ', 'PARENDER',
    'LLAVEIZQ', 'LLAVEDER',
    'CORCHIZQ', 'CORCHDER',
    'PUNTOCOMA', 'DOSPUNTOS', 'COMA', 'PUNTO',
    'ASIGN', 'MASIGUAL', 'MENOSIGUAL',
    'SUMA', 'RESTA', 'MULT', 'DIV', 'MOD',
    'IGUAL', 'DIFERENTE', 'MAYOR', 'MENOR', 'MAYORIGUAL', 'MENORIGUAL',
    'AND', 'OR', 'NOT',
    'INT', 'FLOAT64', 'STRING', 'BOOL', 'RUNE',
    'TRUE', 'FALSE', 'NIL',
    'tipo_op'
]);

// PALABRAS RESERVADAS PARA LA TABLA DE SIMBOLOS
const PALABRAS_RESERVADAS = [
    'func', 'var', 'if', 'else', 'for', 'return', 'switch', 'case', 'default',
    'break', 'continue', 'struct', 'true', 'false', 'nil', 'int', 'float64',
    'string', 'bool', 'rune'
];

// OBTENER LA ETIQUETA DEL NODO
function getLabel(nodo, clave) {
    if (nodo === null || nodo === undefined) return 'null';
    if (typeof nodo !== 'object') return String(nodo).substring(0, 25);

    const tipo  = nodo.type  !== undefined ? String(nodo.type)  : null;
    const valor = nodo.value !== undefined ? String(nodo.value) : null;
    const nombre= nodo.name  !== undefined ? String(nodo.name)  : null;

    // Nodo compuesto = tiene hijos de algun tipo
    const esNodoCompuesto = nodo.children   || nodo.sentencias  || nodo.declaraciones ||
                            nodo.cuerpo     || nodo.body         || nodo.params        ||
                            nodo.argumentos || nodo.izquierda    || nodo.condicion;

    if (valor !== null && !esNodoCompuesto) {
        // Literales y tokens simples -> mostrar valor real
        if (tipo === 'ENTERO'       ) return valor;
        if (tipo === 'FLOTANTE'     ) return valor;
        if (tipo === 'CADENA'       ) return `"${valor}"`;
        if (tipo === 'CARACTER'     ) return `'${valor}'`;
        if (tipo === 'TRUE'         ) return 'true';
        if (tipo === 'FALSE'        ) return 'false';
        if (tipo === 'NIL'          ) return 'nil';
        if (tipo === 'IDENTIFICADOR') return valor;
        if (tipo === 'PARENIZQ'     ) return '(';
        if (tipo === 'PARENDER'     ) return ')';
        if (tipo === 'LLAVEIZQ'     ) return '{';
        if (tipo === 'LLAVEDER'     ) return '}';
        if (tipo === 'PUNTOCOMA'    ) return ';';
        if (tipo === 'COMA'         ) return ',';
        if (tipo === 'ASIGN'        ) return '=';
        if (tipo === 'MASIGUAL'     ) return '+=';
        if (tipo === 'MENOSIGUAL'   ) return '-=';
        if (tipo === 'SUMA'         ) return '+';
        if (tipo === 'RESTA'        ) return '-';
        if (tipo === 'MULT'         ) return '*';
        if (tipo === 'DIV'          ) return '/';
        if (tipo === 'MOD'          ) return '%';
        if (tipo === 'IGUAL'        ) return '==';
        if (tipo === 'DIFERENTE'    ) return '!=';
        if (tipo === 'MAYOR'        ) return '>';
        if (tipo === 'MENOR'        ) return '<';
        if (tipo === 'MAYORIGUAL'   ) return '>=';
        if (tipo === 'MENORIGUAL'   ) return '<=';
        if (tipo === 'AND'          ) return '&&';
        if (tipo === 'OR'           ) return '||';
        if (tipo === 'NOT'          ) return '!';
        return valor.substring(0, 25);
    }

    if (tipo  ) return tipo.substring(0, 25);
    if (nombre) return nombre.substring(0, 25);
    return clave || '?';
}


// PARA DECIDIR SI UN NODO ES RUIDO
function esRuido(nodo) {
    if (!nodo || typeof nodo !== 'object') return false;
    const tipo = nodo.type ? String(nodo.type) : null;
    if (!tipo) return false;

    if (NODOS_RUIDO.has(tipo)) return true;

    const tieneHijos = nodo.children   || nodo.sentencias || nodo.declaraciones ||
                       nodo.cuerpo     || nodo.body        || nodo.izquierda     ||
                       nodo.argumentos || nodo.params;
    if (!tieneHijos && (nodo.value === null || nodo.value === undefined || nodo.value === '')) {
        return true;
    }

    return false;
}

// RECORRER EL AST Y CONSTRUIR EL GRAFO
function construirGrafo(g, padreId, nodo, clave, contador) {
    if (nodo === null || nodo === undefined) return;
    if (esRuido(nodo)) return;

    const nodeId = `n${contador.val++}`;
    const label  = getLabel(nodo, clave);
    const tipo   = nodo && nodo.type ? String(nodo.type) : (clave || '');

    const labelVisible = label.length > 22 ? label.substring(0, 19) + '...' : label;

    // Literales en elipse, nodos compuestos en rectangulo
    const esHoja = ['ENTERO','FLOTANTE','CADENA','CARACTER',
                    'IDENTIFICADOR','TRUE','FALSE','NIL'].includes(tipo);

    g.addNode(nodeId, {
        label:     labelVisible,
        shape:     esHoja ? 'ellipse' : 'box',
        style:     'filled,rounded',
        fillcolor: 'white',
        fontcolor: 'black',
        color:     '#888888',
        fontname:  'Helvetica',
        fontsize:  '12'
    });

    if (padreId !== null) {
        g.addEdge(padreId, nodeId, {
            color:     '#555555',
            arrowsize: '0.7'
        });
    }

    if (typeof nodo !== 'object') return;

    // Campos semanticamente importantes en orden
    const camposPrioritarios = [
        'declaraciones', 'sentencias', 'children',
        'cuerpo', 'body', 'bloque',
        'izquierda', 'derecha', 'left', 'right',
        'condicion', 'condition',
        'inicializacion', 'incremento',
        'valor', 'expresion', 'expression',
        'params', 'parametros',
        'argumentos', 'arguments', 'args',
        'casos', 'cases', 'alternativo', 'consecuente',
        'identificador'
    ];

    const yaVisitados = new Set();

    for (const campo of camposPrioritarios) {
        if (nodo[campo] === undefined || nodo[campo] === null) continue;
        yaVisitados.add(campo);
        const hijo = nodo[campo];

        if (Array.isArray(hijo)) {
            for (let i = 0; i < hijo.length && i < 30; i++) {
                if (hijo[i] !== null && hijo[i] !== undefined) {
                    if (typeof hijo[i] === 'object') {
                        construirGrafo(g, nodeId, hijo[i], campo, contador);
                    } else {
                        agregarHoja(g, nodeId, String(hijo[i]).substring(0, 20), contador);
                    }
                }
            }
        } else if (typeof hijo === 'object') {
            construirGrafo(g, nodeId, hijo, campo, contador);
        } else {
            agregarHoja(g, nodeId, `${campo}: ${String(hijo).substring(0, 15)}`, contador);
        }
    }

    // Recorrer campos adicionales no visitados
    for (const campo of Object.keys(nodo)) {
        if (yaVisitados.has(campo))                             continue;
        if (['type','name','value','operator'].includes(campo)) continue;
        if (nodo[campo] === null || nodo[campo] === undefined)  continue;

        const hijo = nodo[campo];
        if (Array.isArray(hijo) && hijo.length > 0) {
            for (let i = 0; i < hijo.length && i < 20; i++) {
                if (hijo[i] && typeof hijo[i] === 'object') {
                    construirGrafo(g, nodeId, hijo[i], campo, contador);
                }
            }
        } else if (typeof hijo === 'object') {
            construirGrafo(g, nodeId, hijo, campo, contador);
        }
    }
}


// AGREGAR NODO HOJA CON VALOR LITERAL
function agregarHoja(g, padreId, texto, contador) {
    const leafId = `n${contador.val++}`;
    const label  = texto.length > 22 ? texto.substring(0, 19) + '...' : texto;

    g.addNode(leafId, {
        label:     label,
        shape:     'ellipse',
        style:     'filled',
        fillcolor: 'white',
        fontcolor: 'black',
        color:     '#888888',
        fontname:  'Helvetica',
        fontsize:  '11'
    });
    g.addEdge(padreId, leafId, {
        color:     '#888888',
        arrowsize: '0.6',
        style:     'dashed'
    });
}

// GENERAR LA IMAGEN DEL AST
function generarImagenAST(astData, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            const g = graphviz.digraph('AST');

            // Fond
            g.set('rankdir',  'TB');
            g.set('bgcolor',  'white');
            g.set('fontname', 'Helvetica');
            g.set('nodesep',  '0.6');
            g.set('ranksep',  '0.8');
            g.set('splines',  'ortho');

            const contador = { val: 0 };
            construirGrafo(g, null, astData, 'root', contador);

            console.log(`Nodos generados en el AST: ${contador.val}`);

            g.output('png', outputPath, (err) => {
                if (err) {
                    console.error('Error de graphviz al generar PNG:', err);
                    reject(err);
                } else {
                    resolve(outputPath);
                }
            });

        } catch (e) {
            reject(e);
        }
    });
}

// ANALIZAR TODOS LOS TOKENS Y GENERAR TABLA DE SIMBOLOS
function analizarTokens(codigo) {
    const tokens = [];
    let lineNum = 1;
    let columnNum = 1;
    
    const lines = codigo.split('\n');
    
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        lineNum = lineIdx + 1;
        columnNum = 1;
        
        let j = 0;
        while (j < line.length) {
            const char = line[j];
            
            // Espacios en blanco (se ignoran)
            if (char === ' ' || char === '\t') {
                columnNum++;
                j++;
                continue;
            }
            
            // Palabras reservadas e identificadores
            if (/[a-zA-Z_]/.test(char)) {
                let palabra = '';
                while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) {
                    palabra += line[j];
                    j++;
                }
                
                let tipo = 'Identificador';
                if (PALABRAS_RESERVADAS.includes(palabra)) {
                    tipo = 'Palabra Reservada';
                }
                
                tokens.push({
                    token: palabra,
                    tipo: tipo,
                    linea: lineNum,
                    columna: columnNum,
                    valor: palabra
                });
                
                columnNum += palabra.length;
                continue;
            }
            
            // Numeros enteros y decimales
            if (/[0-9]/.test(char)) {
                let numero = '';
                let esDecimal = false;
                while (j < line.length && /[0-9.]/.test(line[j])) {
                    if (line[j] === '.') esDecimal = true;
                    numero += line[j];
                    j++;
                }
                
                tokens.push({
                    token: numero,
                    tipo: esDecimal ? 'Literal Float' : 'Literal Entero',
                    linea: lineNum,
                    columna: columnNum,
                    valor: numero
                });
                
                columnNum += numero.length;
                continue;
            }
            
            // Literales string (entre comillas dobles)
            if (char === '"') {
                let cadena = '"';
                j++;
                columnNum++;
                while (j < line.length && line[j] !== '"') {
                    cadena += line[j];
                    j++;
                    columnNum++;
                }
                if (j < line.length && line[j] === '"') {
                    cadena += '"';
                    j++;
                    columnNum++;
                }
                
                tokens.push({
                    token: cadena,
                    tipo: 'Literal String',
                    linea: lineNum,
                    columna: columnNum - cadena.length,
                    valor: cadena.slice(1, -1)
                });
                continue;
            }
            
            // Literales rune (entre comillas simples)
            if (char === "'") {
                let caracter = "'";
                j++;
                columnNum++;
                while (j < line.length && line[j] !== "'") {
                    caracter += line[j];
                    j++;
                    columnNum++;
                }
                if (j < line.length && line[j] === "'") {
                    caracter += "'";
                    j++;
                    columnNum++;
                }
                
                tokens.push({
                    token: caracter,
                    tipo: 'Literal Rune',
                    linea: lineNum,
                    columna: columnNum - caracter.length,
                    valor: caracter.slice(1, -1)
                });
                continue;
            }
            
            // Operadores de dos caracteres
            const dosCaracteres = line.substring(j, j + 2);
            if (dosCaracteres === '==' || dosCaracteres === '!=' || dosCaracteres === '>=' ||
                dosCaracteres === '<=' || dosCaracteres === '&&' || dosCaracteres === '||' ||
                dosCaracteres === '+=' || dosCaracteres === '-=' || dosCaracteres === ':=') {
                
                tokens.push({
                    token: dosCaracteres,
                    tipo: 'Operador',
                    linea: lineNum,
                    columna: columnNum,
                    valor: dosCaracteres
                });
                j += 2;
                columnNum += 2;
                continue;
            }
            
            // Operadores de un caracter y signos
            const operadores = ['+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '(', ')', '{', '}', '[', ']', ',', ';', ':', '.'];
            if (operadores.includes(char)) {
                let tipo = 'Operador';
                if (char === '(' || char === ')' || char === '{' || char === '}' || char === '[' || char === ']') {
                    tipo = 'Signo Agrupacion';
                } else if (char === ',' || char === ';') {
                    tipo = 'Separador';
                } else if (char === ':') {
                    tipo = 'Dospuntos';
                }
                
                tokens.push({
                    token: char,
                    tipo: tipo,
                    linea: lineNum,
                    columna: columnNum,
                    valor: char
                });
                j++;
                columnNum++;
                continue;
            }
            
            // Comentarios de una linea (//)
            if (char === '/' && line[j + 1] === '/') {
                tokens.push({
                    token: line.substring(j),
                    tipo: 'Comentario',
                    linea: lineNum,
                    columna: columnNum,
                    valor: line.substring(j)
                });
                break;
            }
            
            // Comentarios multilinea (/* */)
            if (char === '/' && line[j + 1] === '*') {
                let comentario = '';
                while (j < line.length && !(line[j] === '*' && line[j + 1] === '/')) {
                    comentario += line[j];
                    j++;
                    columnNum++;
                }
                if (j + 1 < line.length) {
                    comentario += '*/';
                    j += 2;
                    columnNum += 2;
                }
                tokens.push({
                    token: comentario,
                    tipo: 'Comentario',
                    linea: lineNum,
                    columna: columnNum - comentario.length,
                    valor: comentario
                });
                continue;
            }
            
            // Caracter no reconocido (error lexico)
            tokens.push({
                token: char,
                tipo: 'Error Lexico',
                linea: lineNum,
                columna: columnNum,
                valor: char,
                error: true
            });
            j++;
            columnNum++;
        }
    }
    
    return tokens;
}

// ENDPOINT: POST /api/parse
app.post('/api/parse', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'No se proporciono codigo.' });
    }

    const resultado = {
        ast:           null,
        errors:        [],
        consoleOutput: [],
        tablaSimbolos: []
    };

    try {
        const ast = parser.parse(code);
        console.log('AST generado correctamente');
        resultado.ast = ast;

        const evaluador = new Evaluador();
        const resultadoEjecucion = evaluador.interpretarCodigo(code);

        resultado.consoleOutput = resultadoEjecucion.output;
        resultado.errors        = resultadoEjecucion.errors;
        
        // Generar tabla de simbolos completa a partir de los tokens
        const tokens = analizarTokens(code);
        const tablaSimbolos = tokens.map(token => ({
            nombre: token.token,
            tipo: token.tipo,
            ambito: 'global',
            valor: token.valor || token.token,
            linea: token.linea,
            columna: token.columna
        }));
        resultado.tablaSimbolos = tablaSimbolos;

    } catch (error) {
        resultado.errors.push({
            type:        'Sintactico',
            line:        error.hash?.loc?.first_line   || 0,
            column:      error.hash?.loc?.first_column || 0,
            description: error.message
        });
    }

    res.json(resultado);
});

// ENDPOINT: POST /api/generate-ast
app.post('/api/generate-ast', (req, res) => {
    const { ast } = req.body;

    if (!ast) {
        return res.status(400).json({ error: 'No hay AST para generar.' });
    }

    const timestamp     = Date.now();
    const nombreArchivo = `AST_${timestamp}.png`;
    const outputPath = path.join(__dirname, '..', '..', nombreArchivo);

    console.log(`Generando AST en: ${outputPath}`);

    generarImagenAST(ast, outputPath)
        .then((filePath) => {
            console.log(`AST guardado en: ${filePath}`);

            // Abrir la imagen automaticamente
            const platform = process.platform;
            if (platform === 'win32') {
                exec(`start "" "${filePath}"`);
            } else if (platform === 'darwin') {
                exec(`open "${filePath}"`);
            } else {
                exec(`xdg-open "${filePath}"`);
            }

            const imageBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
            res.json({
                image:   imageBase64,
                savedAt: filePath
            });
        })
        .catch((err) => {
            console.error('Error generando imagen AST:', err);
            res.status(500).json({
                error: `Error al generar el AST: ${err.message}. Graphviz esta instalado en el sistema?`
            });
        });
});

// INICIAR SERVIDOR
app.listen(port, () => {
    console.log(`\nServidor GoScript corriendo en http://localhost:${port}\n`);
});