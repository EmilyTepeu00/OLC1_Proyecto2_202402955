/* LOGICA DEL INTERPRETE */

class Evaluador {
    constructor() {
        this.salida = [];
        this.errores = [];
        this.ambitoGlobal = {};
        this.ambitoActual = this.ambitoGlobal;
        this.funciones = {};
    }

    // INTERPRETACION DESDE EL AST
    interpretar(ast) {
        if (!ast) {
            return { output: this.salida, errors: this.errores };
        }
        
        // Recorrer el AST dependiendo del tipo
        if (ast.type === 'Programa') {
            if (ast.declaraciones) {
                for (let declaracion of ast.declaraciones) {
                    this.evaluarDeclaracion(declaracion);
                }
            }
        }
        
        return {
            output: this.salida,
            errors: this.errores
        };
    }

    // EVALUAR DECLARACION SEGUN EL TIPO
    evaluarDeclaracion(declaracion) {
        if (!declaracion) return;
        
        switch (declaracion.type) {
            case 'DeclaracionFuncion':
                this.funciones[declaracion.nombre] = {
                    params: declaracion.params || [],
                    cuerpo: declaracion.cuerpo
                };
                if (declaracion.nombre === 'main') {
                    if (declaracion.cuerpo && declaracion.cuerpo.sentencias) {
                        for (let sentencia of declaracion.cuerpo.sentencias) {
                            this.evaluarDeclaracion(sentencia);
                        }
                    }
                }
                break;
            case 'DeclaracionVariable':
                this.evaluarDeclaracionVariable(declaracion);
                break;
            case 'Asignacion':
                this.evaluarAsignacion(declaracion);
                break;
            case 'LlamadaFuncion':
                this.evaluarLlamadaFuncion(declaracion);
                break;
        }
    }

    evaluarDeclaracionVariable(declaracion) {
        let nombre = declaracion.identificador;
        let valor = null;
        
        if (declaracion.valor) {
            valor = this.evaluarExpresion(declaracion.valor);
        } else {
            valor = this.obtenerValorPorDefecto(declaracion.tipo);
        }
        
        this.ambitoActual[nombre] = {
            valor: valor,
            tipo: declaracion.tipo
        };
    }

    // ASIGNACION DE VARIABLES: x = 10  o  x += 5
    evaluarAsignacion(asignacion) {
        let nombre = asignacion.identificador;

        // Buscar la variable en el ambito actual o global
        let variable = this.buscarVariable(nombre);
        
        if (!variable) {
            this.errores.push({
                type: 'Semantico',
                description: `Variable '${nombre}' no declarada`
            });
            return;
        }
        
        let valor = this.evaluarExpresion(asignacion.valor);
        
        // Si es operador compuesto (+=, -=)
        if (asignacion.operador === '+=') {
            valor = this.sumar(variable.valor, valor);
        } else if (asignacion.operador === '-=') {
            valor = this.restar(variable.valor, valor);
        }
        
        variable.valor = valor;
    }

    // Buscar variable en el ambito actual o global
    buscarVariable(nombre) {
        if (this.ambitoActual[nombre]) {
            return this.ambitoActual[nombre];
        }
        if (this.ambitoGlobal[nombre]) {
            return this.ambitoGlobal[nombre];
        }
        return null;
    }

    // Evaluar la expresion y retornar su valor
    evaluarExpresion(expr) {
        if (!expr) return null;
        
        switch (expr.type) {
            case 'ENTERO':
                return parseInt(expr.value);
            case 'FLOTANTE':
                return parseFloat(expr.value);
            case 'CADENA':
                return expr.value.replace(/^"|"$/g, '');
            case 'CARACTER':
                let char = expr.value.replace(/^'|'$/g, '');
                return char.charCodeAt(0);
            case 'TRUE':
                return true;
            case 'FALSE':
                return false;
            case 'NIL':
                return null;
            case 'IDENTIFICADOR':
                let variable = this.buscarVariable(expr.value);
                return variable ? variable.valor : null;
            case 'SUMA':
                return this.sumar(
                    this.evaluarExpresion(expr.izquierda),
                    this.evaluarExpresion(expr.derecha)
                );
            case 'RESTA':
                return this.restar(
                    this.evaluarExpresion(expr.izquierda),
                    this.evaluarExpresion(expr.derecha)
                );
            case 'MULTIPLICACION':
                return this.multiplicar(
                    this.evaluarExpresion(expr.izquierda),
                    this.evaluarExpresion(expr.derecha)
                );
            case 'DIVISION':
                return this.dividir(
                    this.evaluarExpresion(expr.izquierda),
                    this.evaluarExpresion(expr.derecha)
                );
            default:
                return null;
        }
    }

    // VALOR POR DEFECTO SEGUN EL TIPO
    obtenerValorPorDefecto(tipo) {
        switch (tipo) {
            case 'int': return 0;
            case 'float64': return 0.0;
            case 'string': return '';
            case 'bool': return false;
            case 'rune': return 0;
            default: return null;
        }
    }

    // ----- OPERACIONES -----

    // SUMA CON CONVERSION DE TIPOS
    sumar(a, b) {
        if (typeof a === 'number' && typeof b === 'number') {
            return a + b;
        }
        if (typeof a === 'string' || typeof b === 'string') {
            return String(a) + String(b);
        }
        return a + b;
    }

    // RESTA CON CONVERSION DE TIPOS
    restar(a, b) {
        if (typeof a === 'number' && typeof b === 'number') {
            return a - b;
        }
        if (typeof a === 'boolean') {
            a = a ? 1 : 0;
        }
        if (typeof b === 'boolean') {
            b = b ? 1 : 0;
        }
        return a - b;
    }

    // MULTIPLICACION CON CONVERSION DE TIPOS
    multiplicar(a, b) {
        if (typeof a === 'number' && typeof b === 'number') {
            return a * b;
        }
        if (typeof a === 'string' && typeof b === 'number') {
            return a.repeat(b);
        }
        if (typeof a === 'number' && typeof b === 'string') {
            return b.repeat(a);
        }
        return a * b;
    }

    // DIVISION
    dividir(a, b) {
        if (b === 0) {
            this.errores.push({
                type: 'Semantico',
                description: 'Division por cero'
            });
            return 0;
        }
        return a / b;
    }

    // EVALUAR LLAMADAS A FUNCIONES
    evaluarLlamadaFuncion(llamada) {
        // Funcion embebida fmt.Println
        if (llamada.nombre === 'fmt.Println') {
            return this.ejecutarPrintln(llamada.argumentos);
        }
        
        // Funcion definida por el usuario
        if (this.funciones[llamada.nombre]) {
            return this.ejecutarFuncionUsuario(llamada);
        }
        
        this.errores.push({
            type: 'Semantico',
            description: `Funcion '${llamada.nombre}' no definida`
        });
        return null;
    }

    // EJECUTAR fmt.Println
    ejecutarPrintln(argumentos) {
        if (!argumentos) {
            this.salida.push('');
            return null;
        }
        
        const valores = argumentos.map(arg => {
            let val = this.evaluarExpresion(arg);
            if (val === null) return 'nil';
            if (typeof val === 'boolean') return val ? 'true' : 'false';
            return String(val);
        });
        
        this.salida.push(valores.join(' '));
        return null;
    }

    // EJECUTAR FUNCION DE USUARIO
    ejecutarFuncionUsuario(llamada) {
        if (llamada.nombre === 'main') {
            const mainFunc = this.funciones['main'];
            if (mainFunc && mainFunc.cuerpo) {
                this.evaluarDeclaracion(mainFunc.cuerpo);
            }
        }
        return null;
    }

    // METODO PARA INTERPRETAR CODIGO DIRECTO
    interpretarCodigo(codigo) {
        this.salida = [];
        this.errores = [];
        this.ambitoGlobal = {};
        this.ambitoActual = this.ambitoGlobal;
        this.funciones = {};
        
        // Extraer el contenido dentro de main()
        let contenido = codigo;
        const inicioMain = codigo.indexOf('{');
        const finMain = codigo.lastIndexOf('}');
        
        if (inicioMain !== -1 && finMain !== -1 && inicioMain < finMain) {
            contenido = codigo.substring(inicioMain + 1, finMain);
        }
        
        // Procesar cada sentencia
        let i = 0;
        while (i < contenido.length) {
            // Saltar espacios
            while (i < contenido.length && contenido[i] === ' ') i++;
            if (i >= contenido.length) break;
            
            // Detectar inicio de estructura
            if (contenido.substring(i, i + 2) === 'if') {
                i = this.procesarIf(contenido, i);
            } else if (contenido.substring(i, i + 3) === 'for') {
                i = this.procesarFor(contenido, i);
            } else if (contenido.substring(i, i + 6) === 'switch') {
                i = this.procesarSwitch(contenido, i);
            } else {
                // Buscar hasta el siguiente punto y coma
                let j = i;
                let inString = false;
                while (j < contenido.length) {
                    if (contenido[j] === '"') inString = !inString;
                    if (contenido[j] === ';' && !inString) break;
                    j++;
                }
                let sentencia = contenido.substring(i, j).trim();
                i = j + 1;
                if (sentencia) {
                    this.procesarLineaSimple(sentencia);
                }
            }
        }
        
        return {
            output: this.salida,
            errors: this.errores
        };
    }
    
    // PROCESAR UNA SENTENCIA IF
    procesarIf(codigo, start) {
        let i = start + 2; // saltar 'if'
        
        // Leer condicion
        let condicion = '';
        while (i < codigo.length && codigo[i] !== '{') {
            condicion += codigo[i];
            i++;
        }
        condicion = condicion.trim();
        
        // Saltar '{'
        i++;
        
        // Leer bloque del if
        let bloqueIf = '';
        let nivel = 1;
        while (i < codigo.length && nivel > 0) {
            if (codigo[i] === '{') nivel++;
            if (codigo[i] === '}') nivel--;
            if (nivel > 0) bloqueIf += codigo[i];
            i++;
        }
        
        // Evaluar condicion
        const resultado = this.evaluarExpresionSimple(condicion);
        if (resultado !== 0 && resultado !== false) {
            // Ejecutar bloque del if
            this.ejecutarBloque(bloqueIf);
        } else {
            // Buscar else
            let j = i;
            while (j < codigo.length && codigo[j] === ' ') j++;
            if (codigo.substring(j, j + 4) === 'else') {
                j += 4;
                while (j < codigo.length && codigo[j] === ' ') j++;
                if (codigo[j] === '{') {
                    j++;
                    let bloqueElse = '';
                    let nivelElse = 1;
                    while (j < codigo.length && nivelElse > 0) {
                        if (codigo[j] === '{') nivelElse++;
                        if (codigo[j] === '}') nivelElse--;
                        if (nivelElse > 0) bloqueElse += codigo[j];
                        j++;
                    }
                    this.ejecutarBloque(bloqueElse);
                    i = j;
                } else if (codigo.substring(j, j + 2) === 'if') {
                    i = this.procesarIf(codigo, j);
                }
            }
        }
        
        return i;
    }
    
    // PROCESAR UN BUCLE FOR
    procesarFor(codigo, start) {
        let i = start + 3; // saltar 'for'
        
        // Leer condicion
        let condicion = '';
        while (i < codigo.length && codigo[i] !== '{') {
            condicion += codigo[i];
            i++;
        }
        condicion = condicion.trim();
        
        // Saltar '{'
        i++;
        
        // Leer bloque del for
        let bloqueFor = '';
        let nivel = 1;
        while (i < codigo.length && nivel > 0) {
            if (codigo[i] === '{') nivel++;
            if (codigo[i] === '}') nivel--;
            if (nivel > 0) bloqueFor += codigo[i];
            i++;
        }
        
        // Evaluar condicion inicial
        let resultado = this.evaluarExpresionSimple(condicion);
        let iteraciones = 0;
        let maxIteraciones = 100;
        
        while (resultado !== 0 && resultado !== false && iteraciones < maxIteraciones) {
            this.ejecutarBloque(bloqueFor);
            resultado = this.evaluarExpresionSimple(condicion);
            iteraciones++;
        }
        
        if (iteraciones >= maxIteraciones) {
            this.errores.push({
                type: 'Semantico',
                description: 'Bucle for ya tuvo el limite de iteraciones'
            });
        }
        
        return i;
    }
    
    // PROCESAR UN SWITCH
    procesarSwitch(codigo, start) {
        let i = start + 6; // saltar 'switch'
        
        // Leer expresion del switch
        let expresionSwitch = '';
        while (i < codigo.length && codigo[i] !== '{') {
            expresionSwitch += codigo[i];
            i++;
        }
        expresionSwitch = expresionSwitch.trim();
        const valorSwitch = this.evaluarExpresionSimple(expresionSwitch);
        
        // Saltar '{'
        i++;
        
        // Leer todo el contenido del switch
        let contenidoSwitch = '';
        let nivel = 1;
        while (i < codigo.length && nivel > 0) {
            if (codigo[i] === '{') nivel++;
            if (codigo[i] === '}') nivel--;
            if (nivel > 0) contenidoSwitch += codigo[i];
            i++;
        }
        
        // Procesar cases
        let caseEncontrado = false;
        let j = 0;
        while (j < contenidoSwitch.length) {
            // Saltar espacios
            while (j < contenidoSwitch.length && contenidoSwitch[j] === ' ') j++;
            if (j >= contenidoSwitch.length) break;
            
            if (contenidoSwitch.substring(j, j + 4) === 'case') {
                j += 4;
                let valorCase = '';
                while (j < contenidoSwitch.length && contenidoSwitch[j] !== ':') {
                    valorCase += contenidoSwitch[j];
                    j++;
                }
                valorCase = valorCase.trim();
                j++; // saltar ':'
                
                // Leer codigo del case hasta el siguiente case, default o }
                let codigoCase = '';
                while (j < contenidoSwitch.length) {
                    if (contenidoSwitch.substring(j, j + 4) === 'case' || 
                        contenidoSwitch.substring(j, j + 7) === 'default' ||
                        contenidoSwitch[j] === '}') {
                        break;
                    }
                    codigoCase += contenidoSwitch[j];
                    j++;
                }
                codigoCase = codigoCase.trim();
                
                if (!caseEncontrado && this.evaluarExpresionSimple(valorCase) === valorSwitch) {
                    caseEncontrado = true;
                    this.ejecutarBloque(codigoCase);
                }
            } else if (contenidoSwitch.substring(j, j + 7) === 'default') {
                j += 7;
                while (j < contenidoSwitch.length && contenidoSwitch[j] !== ':') j++;
                j++; // saltar ':'
                
                let codigoDefault = '';
                while (j < contenidoSwitch.length) {
                    if (contenidoSwitch.substring(j, j + 4) === 'case' || 
                        contenidoSwitch[j] === '}') {
                        break;
                    }
                    codigoDefault += contenidoSwitch[j];
                    j++;
                }
                codigoDefault = codigoDefault.trim();
                
                if (!caseEncontrado) {
                    this.ejecutarBloque(codigoDefault);
                }
            } else {
                j++;
            }
        }
        
        return i;
    }
    
    // EJECUTAR UN BLOQUE DE CODIGO (puede tener multiples sentencias)
    ejecutarBloque(bloque) {
        let i = 0;
        while (i < bloque.length) {
            // Saltar espacios
            while (i < bloque.length && bloque[i] === ' ') i++;
            if (i >= bloque.length) break;
            
            // Buscar hasta el siguiente punto y coma
            let j = i;
            let inString = false;
            while (j < bloque.length) {
                if (bloque[j] === '"') inString = !inString;
                if (bloque[j] === ';' && !inString) break;
                j++;
            }
            let sentencia = bloque.substring(i, j).trim();
            i = j + 1;
            if (sentencia) {
                this.procesarLineaSimple(sentencia);
            }
        }
    }
    
    // PROCESAR UNA LINEA SIMPLE (variables, asignaciones, fmt.Println)
    procesarLineaSimple(linea) {
        if (linea === '') return;
        
        // Declaracion var x int = 10
        let match = linea.match(/var\s+([a-z]+)\s+int\s*=\s*([0-9]+)/);
        if (match) {
            this.ambitoActual[match[1]] = { valor: parseInt(match[2]), tipo: 'int' };
            return;
        }
        
        // Declaracion var x int
        match = linea.match(/var\s+([a-z]+)\s+int/);
        if (match) {
            this.ambitoActual[match[1]] = { valor: 0, tipo: 'int' };
            return;
        }
        
        // Declaracion x := 42
        match = linea.match(/([a-z]+)\s*:=\s*([0-9]+)/);
        if (match) {
            this.ambitoActual[match[1]] = { valor: parseInt(match[2]), tipo: 'int' };
            return;
        }
        
        // Asignacion x = 10
        match = linea.match(/([a-z]+)\s*=\s*([0-9]+)/);
        if (match && !linea.includes(':=')) {
            if (this.ambitoActual[match[1]]) {
                this.ambitoActual[match[1]].valor = parseInt(match[2]);
            }
            return;
        }
        
        // Asignacion compuesta x += 3
        match = linea.match(/([a-z]+)\s*\+=\s*([0-9]+)/);
        if (match) {
            if (this.ambitoActual[match[1]]) {
                let viejo = this.ambitoActual[match[1]].valor;
                this.ambitoActual[match[1]].valor += parseInt(match[2]);
            }
            return;
        }
        
        // fmt.Println
        if (linea.includes('fmt.Println')) {
            const printMatch = linea.match(/fmt\.Println\((.*)\)/);
            if (printMatch) {
                let args = printMatch[1];
                let tieneMultiples = false;
                let inStr = false;
                for (let k = 0; k < args.length; k++) {
                    if (args[k] === '"') inStr = !inStr;
                    if (args[k] === ',' && !inStr) {
                        tieneMultiples = true;
                        break;
                    }
                }
                
                if (tieneMultiples) {
                    const valores = this.evaluarMultiplesArgs(args);
                    const texto = valores.map(v => {
                        if (typeof v === 'string' && v.startsWith('"') && v.endsWith('"')) {
                            return v.slice(1, -1);
                        }
                        return String(v);
                    }).join(' ');
                    this.salida.push(texto);
                } else {
                    const resultado = this.evaluarExpresionSimple(args);
                    if (typeof resultado === 'string' && resultado.startsWith('"') && resultado.endsWith('"')) {
                        this.salida.push(resultado.slice(1, -1));
                    } else {
                        this.salida.push(String(resultado));
                    }
                }
            }
            return;
        }
    }
    
    // --- METODOS AUXILIARES PARA EVALUAR EXPRESIONES ---

    // EVALUAR UNA EXPRESION SIMPLE
    evaluarExpresionSimple(expr) {
        expr = expr.trim();
        
        // String literal
        if (expr.match(/^".*"$/)) {
            return expr;
        }
        
        // Numero
        if (expr.match(/^[0-9]+$/)) {
            return parseInt(expr);
        }
        
        // Variable
        if (this.ambitoActual[expr]) {
            return this.ambitoActual[expr].valor;
        }
        
        // Comparaciones (>, <, >=, <=, ==, !=)
        // Mayor que >
        let match = expr.match(/(.+)\s*>\s*(.+)/);
        if (match) {
            const izquierda = this.evaluarExpresionSimple(match[1].trim());
            const derecha = this.evaluarExpresionSimple(match[2].trim());
            const resultado = izquierda > derecha;
            return resultado;
        }
        
        // Menor que <
        match = expr.match(/(.+)\s*<\s*(.+)/);
        if (match) {
            const izquierda = this.evaluarExpresionSimple(match[1].trim());
            const derecha = this.evaluarExpresionSimple(match[2].trim());
            const resultado = izquierda < derecha;
            return resultado;
        }
        
        // Mayor o igual >=
        match = expr.match(/(.+)\s*>=\s*(.+)/);
        if (match) {
            const izquierda = this.evaluarExpresionSimple(match[1].trim());
            const derecha = this.evaluarExpresionSimple(match[2].trim());
            const resultado = izquierda >= derecha;
            return resultado;
        }
        
        // Menor o igual <=
        match = expr.match(/(.+)\s*<=\s*(.+)/);
        if (match) {
            const izquierda = this.evaluarExpresionSimple(match[1].trim());
            const derecha = this.evaluarExpresionSimple(match[2].trim());
            const resultado = izquierda <= derecha;
            return resultado;
        }
        
        // Igualdad ==
        match = expr.match(/(.+)\s*==\s*(.+)/);
        if (match) {
            const izquierda = this.evaluarExpresionSimple(match[1].trim());
            const derecha = this.evaluarExpresionSimple(match[2].trim());
            const resultado = izquierda === derecha;
            return resultado;
        }
        
        // Diferente !=
        match = expr.match(/(.+)\s*!=\s*(.+)/);
        if (match) {
            const izquierda = this.evaluarExpresionSimple(match[1].trim());
            const derecha = this.evaluarExpresionSimple(match[2].trim());
            const resultado = izquierda !== derecha;
            return resultado;
        }
        
        // Operaciones aritmeticas (+, -, *, /)
        // Primero multiplicacion y division
        const resultadoMultDiv = this.resolverMultiplicacionDivision(expr);
        const resultadoFinal = this.resolverSumaResta(resultadoMultDiv);
        return resultadoFinal;
    }
    
    resolverMultiplicacionDivision(expresion) {
        const tokens = expresion.split(/([\+\-\*\/])/);
        const resultado = [];
        
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i].trim();
            if (token === '*' || token === '/') {
                const izquierda = this.obtenerValorToken(resultado.pop());
                const derecha = this.obtenerValorToken(tokens[i+1].trim());
                if (token === '*') {
                    resultado.push(izquierda * derecha);
                } else if (token === '/') {
                    if (derecha === 0) {
                        this.errores.push({ type: 'Semantico', description: 'Division por cero' });
                        resultado.push(0);
                    } else {
                        resultado.push(izquierda / derecha);
                    }
                }
                i++;
            } else {
                resultado.push(token);
            }
        }
        return resultado;
    }
    
    // PARA RESULVER SUMAS Y RESTAS
    resolverSumaResta(partes) {
        let resultado = this.obtenerValorToken(partes[0]);
        
        for (let i = 1; i < partes.length; i++) {
            let op = partes[i];
            let valor = this.obtenerValorToken(partes[i+1]);
            if (op === '+') {
                resultado += valor;
            } else if (op === '-') {
                resultado -= valor;
            }
            i++;
        }
        return resultado;
    }
    
    // PARA OBTENER EL VALOR DEL TOKEN
    obtenerValorToken(token) {
        if (typeof token === 'number') return token;
        token = String(token).trim();
        if (token.match(/^".*"$/)) {
            return token;
        }
        if (token.match(/^[0-9]+$/)) {
            return parseInt(token);
        }
        if (this.ambitoActual[token]) {
            return this.ambitoActual[token].valor;
        }
        return 0;
    }
    
    evaluarMultiplesArgs(args) {
        const resultado = [];
        let current = '';
        let inString = false;
        
        for (let i = 0; i < args.length; i++) {
            const char = args[i];
            if (char === '"') {
                inString = !inString;
                current += char;
            } else if (char === ',' && !inString) {
                resultado.push(this.evaluarExpresionSimple(current.trim()));
                current = '';
            } else {
                current += char;
            }
        }
        if (current) {
            resultado.push(this.evaluarExpresionSimple(current.trim()));
        }
        
        return resultado;
    }
}

module.exports = Evaluador;