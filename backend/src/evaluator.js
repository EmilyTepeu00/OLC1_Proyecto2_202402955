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
        this.salida = [];
        this.errores = [];
        this.ambitoGlobal = {};
        this.ambitoActual = this.ambitoGlobal;
        this.funciones = {};
    
        if (!ast) {
            return { output: this.salida, errors: this.errores };
        }

        // Recorrer el AST
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
        
        // strconv.Atoi: convertir string a int
        if (llamada.nombre === 'strconv.Atoi') {
            const resultado = this.ejecutarAtoi(llamada.argumentos);
            return resultado;
        }
        
        // strconv.ParseFloat: convertir string a un float64
        if (llamada.nombre === 'strconv.ParseFloat') {
            const resultado = this.ejecutarParseFloat(llamada.argumentos);
            return resultado;
        }
        
        // reflect.TypeOf: devuelve el tipo de un valor
        if (llamada.nombre === 'reflect.TypeOf') {
            const resultado = this.ejecutarTypeOf(llamada.argumentos);
            return resultado;
        }

        // slices.Index: retorna el indice de la primer coincidencia
        if (llamada.nombre === 'slices.Index') {
            const resultado = this.ejecutarSlicesIndex(llamada.argumentos);
            return resultado;
        }
        
        // strings.Join: une todos los elementos de un slice de cadenas en una sola
        if (llamada.nombre === 'strings.Join') {
            const resultado = this.ejecutarStringsJoin(llamada.argumentos);
            return resultado;
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

    // ----- FUNCIONES EMBEBIDAS -----

    // CONVERTIR STRING A ENTERO (strconv.Atoi)
    ejecutarAtoi(args) {
        if (!args || args.length === 0) {
            this.errores.push({
                type: 'Semantico',
                description: 'strconv.Atoi requiere un argumento'
            });
            return null;
        }

        let valorStr = '';

        // Evaluar el argumento
        if (typeof args[0] === 'string') {
            valorStr = args[0];
        } else if (args[0] && typeof args[0] === 'object') {
            if (args[0].type === 'CADENA') {
                valorStr = args[0].value;
            } else if (args[0].value !== undefined) {
                valorStr = String(args[0].value);
            } else {
                valorStr = this.evaluarExpresion(args[0]);
                valorStr = String(valorStr);
            }
        } else {
            valorStr = String(args[0]);
        }

        // Limpiar comillas dobles o simples
        if (valorStr.startsWith('"') && valorStr.endsWith('"')) {
            valorStr = valorStr.slice(1, -1);
        }
        if (valorStr.startsWith("'") && valorStr.endsWith("'")) {
            valorStr = valorStr.slice(1, -1);
        }

        const numero = parseInt(valorStr, 10);
        
        if (isNaN(numero)) {
            this.errores.push({
                type: 'Semantico',
                description: `strconv.Atoi: no se pudo convertir '${valorStr}' a entero`
            });
            return null;
        }

        return numero;
    }

    // CONVERTIR STRING A FLOAT64 (strconv.ParseFloat)
    ejecutarParseFloat(args) {
        if (!args || args.length === 0) {
            this.errores.push({
                type: 'Semantico',
                description: 'strconv.ParseFloat requiere un argumento'
            });
            return null;
        }

        const arg = args[0];
        let valorStr = '';

        if (typeof arg === 'object' && arg.type) {
            valorStr = this.evaluarExpresion(arg);
        } else if (typeof arg === 'string') {
            valorStr = arg;
        } else {
            valorStr = String(arg);
        }

        if (valorStr.startsWith('"') && valorStr.endsWith('"')) {
            valorStr = valorStr.slice(1, -1);
        }

        const numero = parseFloat(valorStr);
        
        if (isNaN(numero)) {
            this.errores.push({
                type: 'Semantico',
                description: `strconv.ParseFloat: no se pudo convertir '${valorStr}' a float`
            });
            return null;
        }

        return numero;
    }

    // OBTENER EL TIPO DE UNA VARIABLE (reflect.TypeOf().string)
    ejecutarTypeOf(args) {
        if (!args || args.length === 0) {
            this.errores.push({
                type: 'Semantico',
                description: 'reflect.TypeOf requiere un argumento'
            });
            return null;
        }

        const arg = args[0];
        let valor = null;

        if (typeof arg === 'object' && arg.type) {
            valor = this.evaluarExpresion(arg);
        } else {
            valor = arg;
        }

        // Determinar el tipo del valor
        if (valor === null) return 'nil';
        if (typeof valor === 'boolean') return 'bool';
        if (typeof valor === 'number') {
            if (Number.isInteger(valor)) return 'int';
            return 'float64';
        }
        if (typeof valor === 'string') return 'string';
        if (typeof valor === 'object') {
            if (valor.tipo === 'slice') return '[]' + valor.tipoElemento;
            if (valor.tipo === 'struct') return valor.nombreStruct;
            return 'object';
        }

        return typeof valor;
    }

    // RETORNAR EL INDICE DE LA PRIMERA COINCIDENCIA (slices.Index)
    ejecutarSlicesIndex(args) {
        if (!args || args.length < 2) {
            this.errores.push({
                type: 'Semantico',
                description: 'slices.Index requiere un slice y un valor'
            });
            return -1;
        }

        const sliceArg = args[0];
        const valorArg = args[1];
        
        let slice = null;
        let valorBuscado = null;

        // Obtener el slice
        if (typeof sliceArg === 'object' && sliceArg.tipo === 'slice') {
            slice = sliceArg;
        } else if (typeof sliceArg === 'string' && this.ambitoActual[sliceArg]) {
            slice = this.ambitoActual[sliceArg].valor;
        } else {
            slice = sliceArg;
        }

        // Obtener el valor a buscar
        if (typeof valorArg === 'object') {
            valorBuscado = this.evaluarExpresion(valorArg);
        } else if (this.ambitoActual[valorArg]) {
            valorBuscado = this.ambitoActual[valorArg].valor;
        } else {
            valorBuscado = valorArg;
        }

        if (!slice || slice.tipo !== 'slice') {
            this.errores.push({
                type: 'Semantico',
                description: 'slices.Index: el primer argumento debe ser un slice'
            });
            return -1;
        }

        for (let i = 0; i < slice.elementos.length; i++) {
            if (slice.elementos[i] === valorBuscado) {
                return i;
            }
        }

        return -1;
    }

    // UNE SLICE DE STRINGS CON UN SEPARADOR (strings.Join)
    ejecutarStringsJoin(args) {
        if (!args || args.length < 2) {
            this.errores.push({
                type: 'Semantico',
                description: 'strings.Join requiere un slice de strings y un separador'
            });
            return '';
        }

        const sliceArg = args[0];
        const separadorArg = args[1];
        
        let slice = null;
        let separador = '';

        // Obtener el slice
        if (typeof sliceArg === 'object' && sliceArg.tipo === 'slice') {
            slice = sliceArg;
        } else if (typeof sliceArg === 'string' && this.ambitoActual[sliceArg]) {
            slice = this.ambitoActual[sliceArg].valor;
        }

        // Obtener el separador
        if (typeof separadorArg === 'object') {
            separador = String(this.evaluarExpresion(separadorArg));
        } else if (this.ambitoActual[separadorArg]) {
            separador = String(this.ambitoActual[separadorArg].valor);
        } else {
            separador = String(separadorArg);
        }

        // Limpiar comillas
        if (separador.startsWith('"') && separador.endsWith('"')) {
            separador = separador.slice(1, -1);
        }

        if (!slice || slice.tipo !== 'slice') {
            this.errores.push({
                type: 'Semantico',
                description: 'strings.Join: el primer argumento debe ser un slice de strings'
            });
            return '';
        }

        const elementosStr = slice.elementos.map(e => String(e));
        return elementosStr.join(separador);
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

    // ----- SLICES (ARRAYS DINAMICOS) -----

    // CREAR SLICE
    crearSlice(tipo, elementos) {
        return {
            tipo: 'slice',
            tipoElemento: tipo,
            elementos: elementos || []
        };
    }
    
    // CONVERTIR SLICE A STRING PARA IMPRIMIR
    sliceToString(slice) {
        if (!slice || slice.tipo !== 'slice') {
            return 'nil';
        }
        if (!slice.elementos || slice.elementos.length === 0) {
            return '[]';
        }
        const elementosStr = slice.elementos.map(e => String(e)).join(', ');
        return `[${elementosStr}]`;
    }

    // FUNCION APPEND PARA SLICES
    funcionAppend(slice, nuevosElementos) {
        if (!slice || slice.tipo !== 'slice') {
            this.errores.push({
                type: 'Semantico',
                description: 'append requiere un slice como primer argumento'
            });
            return slice;
        }
        
        // Evaluar los nuevos elementos
        const elementosAAgregar = nuevosElementos.map(el => {
            const val = el.trim();
            if (val.match(/^[0-9]+$/)) {
                return parseInt(val);
            }
            // Si es una variable, se obtiene su valor
            if (this.ambitoActual[val]) {
                return this.ambitoActual[val].valor;
            }
            return this.evaluarExpresionSimpleConVariables(val);
        });
        
        // Crear nuevo slice con los elementos agregados
        return {
            tipo: 'slice',
            tipoElemento: slice.tipoElemento,
            elementos: [...slice.elementos, ...elementosAAgregar]
        };
    }

    // FUNCION LEN PARA OBTENER EL TAMAÑO DEL SLICE
    funcionLen(slice) {
        if (!slice || slice.tipo !== 'slice') {
            this.errores.push({
                type: 'Semantico',
                description: 'len requiere un slice como argumento'
            });
            return 0;
        }
        return slice.elementos.length;
    }

    // ----- STRUCTS -----
    
    // GUARDAR DEFINICION DE UN STRUCT EN EL AMBITO GLOBAL
    guardarStruct(nombre, atributos) {
        this.structs = this.structs || {};
        this.structs[nombre] = atributos;
        console.log("Struct guardado:", nombre, atributos);
    }
    
    // CREAR INSTANCIA DE UN STRUCT
    crearStruct(nombre, valores) {
        const definicion = this.structs[nombre];
        if (!definicion) {
            this.errores.push({
                type: 'Semantico',
                description: `Struct '${nombre}' no definido`
            });
            return null;
        }
        
        const instancia = {
            tipo: 'struct',
            nombreStruct: nombre,
            atributos: {}
        };
        
        // Asignar valores a los atributos
        for (let i = 0; i < definicion.length; i++) {
            const attr = definicion[i];
            let valorInicial;
            
            if (valores && valores[attr.nombre] !== undefined) {
                const valorStr = String(valores[attr.nombre]);
                // Si es numero decimal
                if (valorStr.match(/^[0-9]+\.[0-9]+$/)) {
                    valorInicial = parseFloat(valorStr);
                }
                // Si es numero entero
                else if (valorStr.match(/^[0-9]+$/)) {
                    valorInicial = parseInt(valorStr);
                }
                // Si es string
                else if (valorStr.match(/^".*"$/)) {
                    valorInicial = valorStr.slice(1, -1);
                }
                else {
                    valorInicial = this.evaluarExpresionSimpleConVariables(valorStr);
                }
            } else {
                valorInicial = this.obtenerValorPorDefecto(attr.tipo);
            }
            instancia.atributos[attr.nombre] = valorInicial;
        }
        
        return instancia;
    }
    
    // CONVERTIR STRUCT A STRING PARA IMPRIMIR
    structToString(struct) {
        if (!struct || struct.tipo !== 'struct') {
            return 'nil';
        }
        const attrs = [];
        for (const [key, value] of Object.entries(struct.atributos)) {
            // Si el valor es string -> mostrarlo sin comillas
            if (typeof value === 'string') {
                attrs.push(`${key}: ${value}`);
            } else {
                attrs.push(`${key}: ${value}`);
            }
        }
        return `${struct.nombreStruct}{${attrs.join(', ')}}`;
    }

    // ACCEDER A UN ELEMENTO SLICE POR INDICE
    accederElementoSlice(slice, indice) {
        if (!slice || slice.tipo !== 'slice') {
            this.errores.push({
                type: 'Semantico',
                description: 'No es un slice valido'
            });
            return null;
        }
        
        const idx = this.evaluarExpresionSimpleConVariables(String(indice));
        
        if (idx < 0 || idx >= slice.elementos.length) {
            this.errores.push({
                type: 'Semantico',
                description: `Indice ${idx} fuera de rango. Tamaño: ${slice.elementos.length}`
            });
            return null;
        }
        
        return slice.elementos[idx];
    }
    
    // MODIFICAR UN ELEMENTO DEL SLICE POR INDICE
    modificarElementoSlice(slice, indice, valor) {
        if (!slice || slice.tipo !== 'slice') {
            this.errores.push({
                type: 'Semantico',
                description: 'No es un slice valido'
            });
            return;
        }
        
        const idx = this.evaluarExpresionSimpleConVariables(String(indice));
        
        if (idx < 0 || idx >= slice.elementos.length) {
            this.errores.push({
                type: 'Semantico',
                description: `Indice ${idx} fuera de rango. Tamaño: ${slice.elementos.length}`
            });
            return;
        }
        
        const valorEvaluado = this.evaluarExpresionSimpleConVariables(String(valor));
        slice.elementos[idx] = valorEvaluado;
    }

    // METODO PARA INTERPRETAR CODIGO DIRECTO
    interpretarCodigo(codigo) {
        // Reiniciar estado
        this.salida = [];
        this.errores = [];
        this.ambitoGlobal = {};
        this.ambitoActual = this.ambitoGlobal;
        this.funciones = {};
        
        // Para limpiar el codigo: eliminar saltos de linea y espacios extras
        let codigoLimpio = codigo.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Buscar definiciones de struct: struct Persona { string Nombre; int Edad; }
        const structRegex = /struct\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{([^}]*)\}/g;
        let structMatch;
        
        while ((structMatch = structRegex.exec(codigoLimpio)) !== null) {
            const nombreStruct = structMatch[1];
            const atributosStr = structMatch[2];
            
            // Parsear atributos: string Nombre; int Edad;
            const atributos = [];
            const attrRegex = /(\w+)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/g;
            let attrMatch;
            
            while ((attrMatch = attrRegex.exec(atributosStr)) !== null) {
                atributos.push({
                    tipo: attrMatch[1],
                    nombre: attrMatch[2]
                });
            }
            
            this.guardarStruct(nombreStruct, atributos);
        }

        // Buscar todas las funciones (incluyendo las que tienen retorno)
        const funcionRegex = /func\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*([a-zA-Z0-9_]*)?\s*\{/g;
        let match;
        let funcionesEncontradas = [];
        
        // Primero encontrar todas las posiciones de funciones
        while ((match = funcionRegex.exec(codigoLimpio)) !== null) {
            const nombre = match[1];
            const paramsStr = match[2];
            const tipoRetorno = match[3] || null;
            const inicioFuncion = match.index;
            const inicioCuerpo = match.index + match[0].length;
            
            // Encontrar el cuerpo de la funcion contando llaves
            let contadorLlaves = 1;
            let i = inicioCuerpo;
            while (i < codigoLimpio.length && contadorLlaves > 0) {
                if (codigoLimpio[i] === '{') contadorLlaves++;
                if (codigoLimpio[i] === '}') contadorLlaves--;
                i++;
            }
            const cuerpo = codigoLimpio.substring(inicioCuerpo, i - 1);
            
            funcionesEncontradas.push({
                nombre: nombre,
                paramsStr: paramsStr,
                tipoRetorno: tipoRetorno,
                cuerpo: cuerpo
            });
        }
        
        // Guardar las funciones en el objeto funciones
        for (let func of funcionesEncontradas) {
            this.funciones[func.nombre] = {
                nombre: func.nombre,
                params: this.extraerParametros(func.paramsStr),
                tipoRetorno: func.tipoRetorno,
                cuerpo: { type: 'Bloque', sentencias: this.parsearSentencias(func.cuerpo) }
            };
        }
        
        // Buscar y ejecutar main contando llaves correctamente
        let mainMatch = null;
        let inicioMain = codigoLimpio.indexOf('func main() {');
        
        if (inicioMain !== -1) {
            let contadorLlaves = 0;
            let i = inicioMain;
            let inicioCuerpo = -1;
            let finCuerpo = -1;
            
            while (i < codigoLimpio.length) {
                if (codigoLimpio[i] === '{') {
                    contadorLlaves++;
                    if (inicioCuerpo === -1) {
                        inicioCuerpo = i + 1;
                    }
                } else if (codigoLimpio[i] === '}') {
                    contadorLlaves--;
                    if (contadorLlaves === 0) {
                        finCuerpo = i;
                        break;
                    }
                }
                i++;
            }
            
            if (inicioCuerpo !== -1 && finCuerpo !== -1) {
                const contenido = codigoLimpio.substring(inicioCuerpo, finCuerpo);
                mainMatch = { contenido: contenido };
            }
        }
        
        // Ejecutar el cuerpo de main
        if (mainMatch) {
            this.ejecutarBloqueCompleto(mainMatch.contenido);
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

    // EJECUTAR BLOQUE DE CODIGO COMPLETO
    ejecutarBloqueCompleto(bloque) {
        let i = 0;
        let inString = false;
        let inSlice = false;
        let current = '';
        
        while (i < bloque.length) {
            const char = bloque[i];
            
            // Detectar si esta dentro de un string
            if (char === '"') {
                inString = !inString;
                current += char;
            }
            // Detectar si esta dentro de un slice
            else if (char === '[' && !inString) {
                inSlice = true;
                current += char;
            }
            else if (char === ']' && !inString) {
                inSlice = false;
                current += char;
            }
            // Separar por punto y coma si no esta en un string o slice
            else if (char === ';' && !inString && !inSlice) {
                if (current.trim()) {
                    this.procesarLineaSimple(current.trim());
                }
                current = '';
            }
            else {
                current += char;
            }
            i++;
        }
        
        if (current.trim()) {
            this.procesarLineaSimple(current.trim());
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
        
        // SLICE CON ASIGNACION: numeros := []int{1, 2, 3}
        const sliceAsignacionMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:=\s*\[\](\w+)\{([^}]*)\}/);
        if (sliceAsignacionMatch) {
            const varNombre = sliceAsignacionMatch[1];
            const tipo = sliceAsignacionMatch[2];
            const elementosStr = sliceAsignacionMatch[3].trim();
            const elementos = elementosStr ? elementosStr.split(',').map(e => {
                const val = e.trim();
                if (val.match(/^[0-9]+$/)) {
                    return parseInt(val);
                }
                return val;
            }) : [];
            const slice = this.crearSlice(tipo, elementos);
            this.ambitoActual[varNombre] = { valor: slice, tipo: 'slice' };
            return;
        }
        
        // SLICE LITERAL SOLO: []int{1, 2, 3}
        const sliceMatch = linea.match(/\[\](\w+)\{([^}]*)\}/);
        if (sliceMatch) {
            const tipo = sliceMatch[1];
            const elementosStr = sliceMatch[2].trim();
            const elementos = elementosStr ? elementosStr.split(',').map(e => {
                const val = e.trim();
                if (val.match(/^[0-9]+$/)) {
                    return parseInt(val);
                }
                return val;
            }) : [];
            const slice = this.crearSlice(tipo, elementos);
            return slice;
        }

        // CREACION DE STRUCT: persona := Persona{Nombre: "Alice", Edad: 25}
        const structAsignacionMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:=\s*([A-Z][a-zA-Z0-9_]*)\s*\{([^}]*)\}/);
        if (structAsignacionMatch) {
            const varNombre = structAsignacionMatch[1];
            const nombreStruct = structAsignacionMatch[2];
            const valoresStr = structAsignacionMatch[3].trim();
            
            // Parsear valores: Nombre: "Alice", Edad: 25
            const valores = {};
            if (valoresStr) {
                const pares = valoresStr.split(',');
                for (let par of pares) {
                    const [key, val] = par.split(':');
                    if (key && val) {
                        valores[key.trim()] = val.trim();
                    }
                }
            }
            
            const instancia = this.crearStruct(nombreStruct, valores);
            if (instancia) {
                this.ambitoActual[varNombre] = { valor: instancia, tipo: 'struct' };
            }
            return;
        }
        
        // STRUCT LITERAL SOLO (sin asignacion)
        const structMatch = linea.match(/^([A-Z][a-zA-Z0-9_]*)\s*\{([^}]*)\}/);
        if (structMatch && !linea.includes(':=')) {
            const nombreStruct = structMatch[1];
            const valoresStr = structMatch[2].trim();
            
            const valores = {};
            if (valoresStr) {
                const pares = valoresStr.split(',');
                for (let par of pares) {
                    const [key, val] = par.split(':');
                    if (key && val) {
                        valores[key.trim()] = val.trim();
                    }
                }
            }
            
            const instancia = this.crearStruct(nombreStruct, valores);
            return instancia;
        }

        // ASIGNACION A ATRIBUTO DE STRUCT: persona.Nombre = "Alice"
        const structAsignacionAttrMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
        if (structAsignacionAttrMatch) {
            const varStruct = structAsignacionAttrMatch[1];
            const atributo = structAsignacionAttrMatch[2];
            const valor = structAsignacionAttrMatch[3];
            
            const variable = this.ambitoActual[varStruct];
            const instancia = variable ? variable.valor : null;
            
            if (instancia && instancia.tipo === 'struct') {
                const valorEvaluado = this.evaluarExpresionSimpleConVariables(valor);
                if (instancia.atributos[atributo] !== undefined) {
                    instancia.atributos[atributo] = valorEvaluado;
                } else {
                    this.errores.push({
                        type: 'Semantico',
                        description: `El struct '${instancia.nombreStruct}' no tiene el atributo '${atributo}'`
                    });
                }
            } else {
                this.errores.push({
                    type: 'Semantico',
                    description: `La variable '${varStruct}' no es un struct valido`
                });
            }
            return;
        }

        // ASIGNACION A ELEMENTO DE SLICE: numeros[2] = 100
        const sliceAsignacionElementoMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[([0-9]+)\]\s*=\s*(.+)$/);
        if (sliceAsignacionElementoMatch) {
            const nombreSlice = sliceAsignacionElementoMatch[1];
            const indice = parseInt(sliceAsignacionElementoMatch[2]);
            const valor = sliceAsignacionElementoMatch[3];
            
            const variable = this.ambitoActual[nombreSlice];
            const slice = variable ? variable.valor : null;
            
            if (slice && slice.tipo === 'slice') {
                const valorEvaluado = this.evaluarExpresionSimpleConVariables(valor);
                if (indice >= 0 && indice < slice.elementos.length) {
                    slice.elementos[indice] = valorEvaluado;
                } else {
                    this.errores.push({
                        type: 'Semantico',
                        description: `Indice ${indice} fuera de rango. Tamaño: ${slice.elementos.length}`
                    });
                }
            }
            return;
        }

        // FUNCION APPEND: numeros = append(numeros, 4)
        const appendMatch = linea.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*append\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(.+)\s*\)/);
        if (appendMatch) {
            const varDestino = appendMatch[1];
            const varOrigen = appendMatch[2];
            const nuevosElementos = appendMatch[3].split(',').map(e => e.trim());
            
            const variable = this.ambitoActual[varOrigen];
            const slice = variable ? variable.valor : null;
            
            if (slice && slice.tipo === 'slice') {
                const nuevoSlice = this.funcionAppend(slice, nuevosElementos);
                this.ambitoActual[varDestino] = { valor: nuevoSlice, tipo: 'slice' };
            } else {
                this.errores.push({
                    type: 'Semantico',
                    description: `La variable '${varOrigen}' no es un slice valido`
                });
            }
            return;
        }
        
        // APPEND SIN ASIGNACION (en expresion)
        const appendSoloMatch = linea.match(/append\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(.+)\s*\)/);
        if (appendSoloMatch && !linea.includes('=')) {
            const varOrigen = appendSoloMatch[1];
            const nuevosElementos = appendSoloMatch[2].split(',').map(e => e.trim());
            
            const variable = this.ambitoActual[varOrigen];
            const slice = variable ? variable.valor : null;
            
            if (slice && slice.tipo === 'slice') {
                const nuevoSlice = this.funcionAppend(slice, nuevosElementos);
                return nuevoSlice;
            }
            return null;
        }

        // FUNCION LEN: tamaño := len(numeros)
        const lenAsignacionMatch = linea.match(/^([^:]+)\s*:=\s*len\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
        if (lenAsignacionMatch) {
            const varDestino = lenAsignacionMatch[1].trim();
            const varOrigen = lenAsignacionMatch[2];
            const variable = this.ambitoActual[varOrigen];
            const slice = variable ? variable.valor : null;
            const tamaño = this.funcionLen(slice);
            this.ambitoActual[varDestino] = { valor: tamaño, tipo: 'int' };
            return;
        }

        // FUNCION strconv.Atoi: num := strconv.Atoi("123")
        const atoiAsignacionMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:=\s*strconv\.Atoi\s*\(\s*["']?([^"')]+)["']?\s*\)/);
        if (atoiAsignacionMatch) {
            const varNombre = atoiAsignacionMatch[1];
            let argsStr = atoiAsignacionMatch[2];
            // Limpiar comillas
            argsStr = argsStr.replace(/^["']|["']$/g, '');
            const args = [argsStr];
            const resultado = this.ejecutarAtoi(args);
            this.ambitoActual[varNombre] = { valor: resultado, tipo: 'int' };
            return;
        }

        // FUNCION strconv.ParseFloat: decimal := strconv.ParseFloat("123.45")
        const parseFloatAsignacionMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:=\s*strconv\.ParseFloat\s*\(\s*([^)]+)\s*\)/);
        if (parseFloatAsignacionMatch) {
            const varNombre = parseFloatAsignacionMatch[1];
            const argsStr = parseFloatAsignacionMatch[2];
            const args = [argsStr.trim()];
            const resultado = this.ejecutarParseFloat(args);
            this.ambitoActual[varNombre] = { valor: resultado, tipo: 'float64' };
            return;
        }

        // FUNCION reflect.TypeOf: tipo := reflect.TypeOf(x)
        const typeOfAsignacionMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:=\s*reflect\.TypeOf\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
        if (typeOfAsignacionMatch) {
            const varNombre = typeOfAsignacionMatch[1];
            const argsStr = typeOfAsignacionMatch[2];
            const args = [argsStr.trim()];
            const resultado = this.ejecutarTypeOf(args);
            this.ambitoActual[varNombre] = { valor: resultado, tipo: 'string' };
            return;
        }

        // FUNCION slices.Index: indice := slices.Index(numeros, 3)
        const slicesIndexMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:=\s*slices\.Index\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(.+)\s*\)/);
        if (slicesIndexMatch) {
            const varNombre = slicesIndexMatch[1];
            const sliceName = slicesIndexMatch[2];
            const valor = slicesIndexMatch[3].trim();
            const sliceVar = this.ambitoActual[sliceName];
            const slice = sliceVar ? sliceVar.valor : null;
            const args = [slice, valor];
            const resultado = this.ejecutarSlicesIndex(args);
            this.ambitoActual[varNombre] = { valor: resultado, tipo: 'int' };
            return;
        }

        // FUNCION strings.Join: resultado := strings.Join(palabras, " ")
        const stringsJoinMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:=\s*strings\.Join\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*(.+)\s*\)/);
        if (stringsJoinMatch) {
            const varNombre = stringsJoinMatch[1];
            const sliceName = stringsJoinMatch[2];
            const separador = stringsJoinMatch[3].trim();
            const sliceVar = this.ambitoActual[sliceName];
            const slice = sliceVar ? sliceVar.valor : null;
            const args = [slice, separador];
            const resultado = this.ejecutarStringsJoin(args);
            this.ambitoActual[varNombre] = { valor: resultado, tipo: 'string' };
            return;
        }

        // ----- DECLARACIONES -----

        // DECLARACION CON INFERENCIA: x := 42
        const inferMatch = linea.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:=\s*([0-9]+)/);
        if (inferMatch) {
            const nombre = inferMatch[1];
            const valor = parseInt(inferMatch[2]);
            this.ambitoActual[nombre] = { valor: valor, tipo: 'int' };
            return;
        }
        
        // LLAMADA A FUNCION: sumar(5, 3)
        const llamadaMatch = linea.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)$/);
        if (llamadaMatch) {
            const nombreFunc = llamadaMatch[1];
            const argsStr = llamadaMatch[2].trim();
            const args = argsStr ? argsStr.split(',').map(a => a.trim()) : [];
            this.ejecutarFuncionConParams(nombreFunc, args);
            return;
        }

        // DECLARACION VAR CON VALOR: var x int = 10
        let match = linea.match(/var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+int\s*=\s*([0-9]+)/);
        if (match) {
            const nombre = match[1];
            const valor = parseInt(match[2]);
            this.ambitoActual[nombre] = { valor: valor, tipo: 'int' };
            return;
        }
        
        // DECLARACION VAR SIN VALOR: var x int
        match = linea.match(/var\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+int/);
        if (match) {
            const nombre = match[1];
            this.ambitoActual[nombre] = { valor: 0, tipo: 'int' };
            return;
        }
        
        // ASIGNACION SIMPLE: x = 10
        match = linea.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([0-9]+)/);
        if (match && !linea.includes(':=')) {
            const nombre = match[1];
            const valor = parseInt(match[2]);
            if (this.ambitoActual[nombre]) {
                this.ambitoActual[nombre].valor = valor;
            }
            return;
        }
        
        // ASIGNACION COMPUESTA: x += 3
        match = linea.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\+=\s*([0-9]+)/);
        if (match) {
            const nombre = match[1];
            const valor = parseInt(match[2]);
            if (this.ambitoActual[nombre]) {
                this.ambitoActual[nombre].valor += valor;
            }
            return;
        }
        
        // FMT.PRINTLN
        if (linea.includes('fmt.Println')) {
            const printMatch = linea.match(/fmt\.Println\((.*)\)/);
            if (printMatch) {
                let args = printMatch[1];
                
                // VERIFICAR LEN PRIMERO
                const lenMatch = args.match(/^len\s*\(\s*([a-zA-ZñÑ_][a-zA-Z0-9ñÑ_]*)\s*\)$/);
                if (lenMatch) {
                    const varOrigen = lenMatch[1];
                    const variable = this.ambitoActual[varOrigen];
                    const slice = variable ? variable.valor : null;
                    const resultado = this.funcionLen(slice);
                    this.salida.push(String(resultado));
                    return;
                }
                
                // Verificar si es acceso a slice: numeros[0]
                const sliceAccesoMatch = args.match(/([a-zA-Z_][a-zA-Z0-9_]*)\[([0-9]+)\]/);
                if (sliceAccesoMatch) {
                    const nombreSlice = sliceAccesoMatch[1];
                    const indice = parseInt(sliceAccesoMatch[2]);
                    const variable = this.ambitoActual[nombreSlice];
                    const slice = variable ? variable.valor : null;
                    if (slice && slice.tipo === 'slice') {
                        if (indice >= 0 && indice < slice.elementos.length) {
                            this.salida.push(String(slice.elementos[indice]));
                        } else {
                            this.salida.push('error');
                        }
                    } else {
                        this.salida.push('nil');
                    }
                    return;
                }

                // Verificar si es acceso a atributo de struct: persona.Nombre
                const structAttrMatch = args.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)$/);
                if (structAttrMatch) {
                    const varStruct = structAttrMatch[1];
                    const atributo = structAttrMatch[2];
                    
                    const variable = this.ambitoActual[varStruct];
                    const instancia = variable ? variable.valor : null;
                    
                    if (instancia && instancia.tipo === 'struct') {
                        if (instancia.atributos[atributo] !== undefined) {
                            const valor = instancia.atributos[atributo];
                            this.salida.push(String(valor));
                        } else {
                            this.salida.push('error');
                        }
                    } else {
                        this.salida.push('nil');
                    }
                    return;
                }
                
                // Verificar si tiene multiples argumentos (comas)
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
                        // Si es un slice, convertirlo a string
                        if (v && v.tipo === 'slice') {
                            return this.sliceToString(v);
                        }
                        return String(v);
                    }).join(' ');
                    this.salida.push(texto);
                } else {
                    const resultado = this.evaluarExpresionSimpleConVariables(args);
                    // Si es un slice, convertirlo a string
                    if (resultado && resultado.tipo === 'slice') {
                        this.salida.push(this.sliceToString(resultado));
                    } else if (resultado && resultado.tipo === 'struct') {
                        this.salida.push(this.structToString(resultado));
                    } else if (typeof resultado === 'string' && resultado.startsWith('"') && resultado.endsWith('"')) {
                        this.salida.push(resultado.slice(1, -1));
                    } else if (resultado !== undefined && resultado !== null) {
                        this.salida.push(String(resultado));
                    } else {
                        this.salida.push('');
                    }
                }
            }
            return;
        }
    }

    // EVALUAR EXPRESION SIMPLE CON VARIABLES DEL AMBITO ACTUAL
    evaluarExpresionSimpleConVariables(expr) {
        expr = expr.trim();
        
        // Si es un slice literal
        const sliceMatch = expr.match(/\[\](\w+)\{([^}]*)\}/);
        if (sliceMatch) {
            const tipo = sliceMatch[1];
            const elementosStr = sliceMatch[2].trim();
            const elementos = elementosStr ? elementosStr.split(',').map(e => {
                const val = e.trim();
                if (val.match(/^[0-9]+$/)) {
                    return parseInt(val);
                }
                return val;
            }) : [];
            return this.crearSlice(tipo, elementos);
        }

        // Funcion len dentro de expresion
        const lenMatch = expr.match(/len\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
        if (lenMatch) {
            const varOrigen = lenMatch[1];
            const variable = this.ambitoActual[varOrigen];
            const slice = variable ? variable.valor : null;
            const resultado = this.funcionLen(slice);
            return resultado;
        }

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

    // ----- REPORTE TABLA DE SIMBOLOS -----
    
    obtenerTablaSimbolos() {
        const tabla = [];
        
        // Recorrer ambito global
        for (const [nombre, info] of Object.entries(this.ambitoGlobal)) {
            tabla.push({
                nombre: nombre,
                tipo: info.tipo || typeof info.valor,
                ambito: 'global',
                valor: this.valorToString(info.valor),
                linea: info.linea || '-',
                columna: info.columna || '-'
            });
        }
        
        // Recorrer ambito actual (si es diferente al global)
        if (this.ambitoActual !== this.ambitoGlobal) {
            for (const [nombre, info] of Object.entries(this.ambitoActual)) {
                // Evitar duplicados
                if (!this.ambitoGlobal[nombre]) {
                    tabla.push({
                        nombre: nombre,
                        tipo: info.tipo || typeof info.valor,
                        ambito: 'local',
                        valor: this.valorToString(info.valor),
                        linea: info.linea || '-',
                        columna: info.columna || '-'
                    });
                }
            }
        }
        
        // Agregar funciones
        for (const [nombre, func] of Object.entries(this.funciones)) {
            tabla.push({
                nombre: nombre,
                tipo: 'funcion',
                ambito: 'global',
                valor: `func(${func.params.map(p => `${p.nombre} ${p.tipo}`).join(', ')})`,
                linea: '-',
                columna: '-'
            });
        }
        
        // Agregar structs
        if (this.structs) {
            for (const [nombre, atributos] of Object.entries(this.structs)) {
                const attrsStr = atributos.map(a => `${a.tipo} ${a.nombre}`).join(', ');
                tabla.push({
                    nombre: nombre,
                    tipo: 'struct',
                    ambito: 'global',
                    valor: `{ ${attrsStr} }`,
                    linea: '-',
                    columna: '-'
                });
            }
        }
        
        return tabla;
    }
    
    valorToString(valor) {
        if (valor === null) return 'nil';
        if (valor === undefined) return 'undefined';
        if (typeof valor === 'object') {
            if (valor.tipo === 'slice') {
                return `[${valor.elementos.join(', ')}]`;
            }
            if (valor.tipo === 'struct') {
                const attrs = Object.entries(valor.atributos).map(([k, v]) => `${k}: ${v}`).join(', ');
                return `${valor.nombreStruct}{${attrs}}`;
            }
            return JSON.stringify(valor);
        }
        return String(valor);
    }
}

module.exports = Evaluador;