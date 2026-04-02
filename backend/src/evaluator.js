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


    // ----- FUNCIONES DEFINIDAS POR EL USUARIO -----
    
    // GUARDAR FUNCION EN EL AMBITO GLOBAL
    guardarFuncion(funcion) {
        this.funciones[funcion.nombre] = {
            nombre: funcion.nombre,
            params: funcion.params || [],
            cuerpo: funcion.cuerpo
        };
        console.log("Funcion guardada:", funcion.nombre);
    }
    
    // EJECUTAR FUNCION SIN RETORNO
    ejecutarFuncion(nombre) {
        const funcion = this.funciones[nombre];
        if (!funcion) {
            this.errores.push({
                type: 'Semantico',
                description: `Funcion '${nombre}' no definida`
            });
            return null;
        }
        
        console.log("Ejecutando funcion:", nombre);
        
        // Guardar ambito anterior
        const ambitoAnterior = this.ambitoActual;
        
        // Crear nuevo ambito para la funcion
        this.ambitoActual = {};
        
        // Ejecutar cuerpo de la funcion
        if (funcion.cuerpo && funcion.cuerpo.sentencias) {
            for (let sentencia of funcion.cuerpo.sentencias) {
                this.evaluarDeclaracion(sentencia);
            }
        }
        
        // Restaurar ambito anterior
        this.ambitoActual = ambitoAnterior;
        
        return null;
    }

    
    // ----- METODOS CONS PARAMETROS -----
    
    // EXTRAER PARAMETROS DE UNA DECLARACION DE FUNCION
    extraerParametros(paramsStr) {
        const params = [];
        if (!paramsStr || paramsStr.trim() === '') return params;
        
        const paramList = paramsStr.split(',');
        for (let param of paramList) {
            const partes = param.trim().split(/\s+/);
            if (partes.length === 2) {
                params.push({
                    nombre: partes[0],
                    tipo: partes[1]
                });
            }
        }
        return params;
    }
    
    // EJECUTAR FUNCION CON PARAMETROS
    ejecutarFuncionConParams(nombre, args) {
        const funcion = this.funciones[nombre];
        
        if (!funcion) {
            this.errores.push({
                type: 'Semantico',
                description: `Funcion '${nombre}' no definida`
            });
            return null;
        }
        
        // Guardar ambito anterior
        const ambitoAnterior = this.ambitoActual;
        
        // Crear nuevo ambito con los parametros
        const nuevoAmbito = {};
        for (let i = 0; i < funcion.params.length; i++) {
            const param = funcion.params[i];
            let valorArg = args[i].trim();
            
            if (valorArg.match(/^[0-9]+$/)) {
                valorArg = parseInt(valorArg);
            } else if (ambitoAnterior[valorArg]) {
                valorArg = ambitoAnterior[valorArg].valor;
            } else {
                valorArg = this.evaluarExpresionSimpleConVariables(valorArg);
            }
            nuevoAmbito[param.nombre] = { valor: valorArg, tipo: param.tipo };
        }
        
        this.ambitoActual = nuevoAmbito;
        
        // Ejecutar cuerpo de la funcion
        if (funcion.cuerpo && funcion.cuerpo.sentencias) {
            for (let sentencia of funcion.cuerpo.sentencias) {
                if (sentencia.type === 'LineaSimple') {
                    this.procesarLineaSimple(sentencia.valor);
                } else {
                    this.evaluarDeclaracion(sentencia);
                }
            }
        }
        
        // Restaurar ambito anterior
        this.ambitoActual = ambitoAnterior;
        
        return null;
    }

    // EJECUTAR FUNCION CON PARAMETROS Y RETORNO
    ejecutarFuncionConRetorno(nombre, args) {
        const funcion = this.funciones[nombre];
        if (!funcion) {
            this.errores.push({
                type: 'Semantico',
                description: `Funcion '${nombre}' no definida`
            });
            return null;
        }
        
        // Validar cantidad de parametros
        if (funcion.params.length !== args.length) {
            this.errores.push({
                type: 'Semantico',
                description: `Funcion '${nombre}' espera ${funcion.params.length} parametros, recibio ${args.length}`
            });
            return null;
        }
        
        // Guardar ambito anterior
        const ambitoAnterior = this.ambitoActual;
        
        // Crear nuevo ambito con los parametros
        const nuevoAmbito = {};
        for (let i = 0; i < funcion.params.length; i++) {
            const param = funcion.params[i];
            let valorArg = args[i].trim();
            
            if (valorArg.match(/^[0-9]+$/)) {
                valorArg = parseInt(valorArg);
            } else if (ambitoAnterior[valorArg]) {
                valorArg = ambitoAnterior[valorArg].valor;
            } else {
                valorArg = this.evaluarExpresionSimpleConVariables(valorArg);
            }
            nuevoAmbito[param.nombre] = { valor: valorArg, tipo: param.tipo };
        }
        
        this.ambitoActual = nuevoAmbito;
        
        // Ejecutar cuerpo de la funcion y capturar return
        let resultadoRetorno = null;
        if (funcion.cuerpo && funcion.cuerpo.sentencias) {
            for (let sentencia of funcion.cuerpo.sentencias) {
                if (sentencia.type === 'LineaSimple') {
                    const lineaValor = sentencia.valor;
                    // Verificar si es un return
                    if (lineaValor.startsWith('return')) {
                        const returnMatch = lineaValor.match(/return\s*(.*)/);
                        if (returnMatch) {
                            const valorReturn = returnMatch[1] ? returnMatch[1].trim() : null;
                            if (valorReturn) {
                                resultadoRetorno = this.evaluarExpresionSimpleConVariables(valorReturn);
                            } else {
                                resultadoRetorno = null;
                            }
                            break;
                        }
                    } else {
                        this.procesarLineaSimple(lineaValor);
                    }
                } else {
                    this.evaluarDeclaracion(sentencia);
                }
            }
        }
        
        // Restaurar ambito anterior
        this.ambitoActual = ambitoAnterior;
        
        return resultadoRetorno;
    }

    // METODO PARA INTERPRETAR CODIGO DIRECTO
    interpretarCodigo(codigo) {
        this.salida = [];
        this.errores = [];
        this.ambitoGlobal = {};
        this.ambitoActual = this.ambitoGlobal;
        this.funciones = {};
        
        // Para limpiar el codigo: eliminar saltos de linea y espacios extras
        let codigoLimpio = codigo.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Buscar funciones: func nombre(parametros)
        const funcionRegex = /func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*([a-zA-Z0-9_]*)?\s*\{([^}]*)\}/g;
        let match;
        
        while ((match = funcionRegex.exec(codigoLimpio)) !== null) {
            const nombre = match[1];
            const paramsStr = match[2];
            const tipoRetorno = match[3] || null;
            const cuerpo = match[4];
            
            this.funciones[nombre] = {
                nombre: nombre,
                params: this.extraerParametros(paramsStr),
                tipoRetorno: tipoRetorno,
                cuerpo: { type: 'Bloque', sentencias: this.parsearSentencias(cuerpo) }
            };
        }
        
        // Buscar y ejecutar main
        const mainMatch = codigoLimpio.match(/func\s+main\s*\(\s*\)\s*\{([^}]*)\}/);
        if (mainMatch) {
            const contenido = mainMatch[1];
            this.ejecutarBloqueSimple(contenido);
        } else {
            console.log("No se encontro funcion main");
        }
        
        return {
            output: this.salida,
            errors: this.errores
        };
    }
    
    // CONVERTIR UN STRING DE CODIGO EN UN ARRAY DE SENTENCIAS
    parsearSentencias(codigo) {
        const sentencias = [];
        let current = '';
        let i = 0;
        let inString = false;
        
        while (i < codigo.length) {
            const char = codigo[i];
            if (char === '"') {
                inString = !inString;
                current += char;
            } else if (char === ';' && !inString) {
                if (current.trim()) {
                    sentencias.push({ type: 'LineaSimple', valor: current.trim() });
                }
                current = '';
            } else {
                current += char;
            }
            i++;
        }
        
        if (current.trim()) {
            sentencias.push({ type: 'LineaSimple', valor: current.trim() });
        }
        
        return sentencias;
    }
    
    // EJECUTAR BLOQUE SIMPLE DE CODIGO (SIN AST)
    ejecutarBloqueSimple(bloque) {
        const sentencias = bloque.split(';');
        
        for (let sentencia of sentencias) {
            let linea = sentencia.trim();
            if (linea === '') continue;
            
            // Detectar llamada a funcion con asignacion (ej: resultado := sumar(5, 3))
            const asignacionFuncMatch = linea.match(/([a-z]+)\s*:=\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)/);
            if (asignacionFuncMatch) {
                const varNombre = asignacionFuncMatch[1];
                const nombreFunc = asignacionFuncMatch[2];
                const argsStr = asignacionFuncMatch[3].trim();
                const args = argsStr ? argsStr.split(',').map(a => a.trim()) : [];
                const resultado = this.ejecutarFuncionConRetorno(nombreFunc, args);
                this.ambitoActual[varNombre] = { valor: resultado, tipo: 'int' };
                continue;
            }
            
            // Detectar llamada a funcion normal (con o sin parametros)
            const llamadaMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)$/);
            if (llamadaMatch) {
                const nombreFunc = llamadaMatch[1];
                const argsStr = llamadaMatch[2].trim();
                const args = argsStr ? argsStr.split(',').map(a => a.trim()) : [];
                this.ejecutarFuncionConRetorno(nombreFunc, args);
                continue;
            }
            
            // Procesar linea normal
            this.procesarLineaSimple(linea);
        }
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

        // Ignorar lineas que son return
        if (linea.startsWith('return')) {
            return;
        }
        
        // Llamada a funcion con parametros
        const llamadaMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)$/);
        if (llamadaMatch) {
            const nombreFunc = llamadaMatch[1];
            const argsStr = llamadaMatch[2].trim();
            const args = argsStr ? argsStr.split(',').map(a => a.trim()) : [];
            this.ejecutarFuncionConParams(nombreFunc, args);
            return;
        }

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
                this.ambitoActual[match[1]].valor += parseInt(match[2]);
            }
            return;
        }
        
        // fmt.Println
        if (linea.includes('fmt.Println')) {
            const printMatch = linea.match(/fmt\.Println\((.*)\)/);
            if (printMatch) {
                let args = printMatch[1];
                
                // Verificar si tiene comas (multiples argumentos)
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
                    // Evaluar la expresion completa (puede ser a + b)
                    const resultado = this.evaluarExpresionSimpleConVariables(args);
                    this.salida.push(String(resultado));
                }
            }
            return;
        }
    }

    // EVALUAR EXPRESION SIMPLE CON VARIABLES DEL AMBITO ACTUAL
    evaluarExpresionSimpleConVariables(expr) {
        expr = expr.trim();
        
        if (expr.match(/^".*"$/)) {
            return expr;
        }
        
        if (expr.match(/^[0-9]+$/)) {
            return parseInt(expr);
        }
        
        if (this.ambitoActual[expr]) {
            return this.ambitoActual[expr].valor;
        }
        
        if (this.ambitoGlobal[expr]) {
            return this.ambitoGlobal[expr].valor;
        }
        
        const resultadoMultDiv = this.resolverMultiplicacionDivisionConVariables(expr);
        const resultadoFinal = this.resolverSumaRestaConVariables(resultadoMultDiv);
        return resultadoFinal;
    }
    
    // Resolver multiplicacion y division con variables
    resolverMultiplicacionDivisionConVariables(expresion) {
        const tokens = expresion.split(/([\+\-\*\/])/);
        const resultado = [];
        
        for (let i = 0; i < tokens.length; i++) {
            let token = tokens[i].trim();
            if (token === '*' || token === '/') {
                const izquierda = this.obtenerValorTokenConVariables(resultado.pop());
                const derecha = this.obtenerValorTokenConVariables(tokens[i+1].trim());
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
    
    // Resolver suma y resta con variables
    resolverSumaRestaConVariables(partes) {
        let resultado = this.obtenerValorTokenConVariables(partes[0]);
        
        for (let i = 1; i < partes.length; i++) {
            let op = partes[i];
            let valor = this.obtenerValorTokenConVariables(partes[i+1]);
            if (op === '+') {
                resultado += valor;
            } else if (op === '-') {
                resultado -= valor;
            }
            i++;
        }
        return resultado;
    }
    
    // Obtener valor de token con variables del ambito actual
    obtenerValorTokenConVariables(token) {
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
        if (this.ambitoGlobal[token]) {
            return this.ambitoGlobal[token].valor;
        }
        return 0;
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