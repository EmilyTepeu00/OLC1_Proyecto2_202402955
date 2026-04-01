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
            this.evaluarPrograma(ast);
        } else if (ast.type === 'DeclaracionFuncion') {
            this.guardarFuncion(ast);
        } else if (ast.type === 'Bloque') {
            this.evaluarBloque(ast);
        } else if (ast.type === 'ListaSentencias') {
            this.evaluarListaSentencias(ast);
        }
        
        return {
            output: this.salida,
            errors: this.errores
        };
    }

    // EVALUAR PROGRAMA COMPLETO
    evaluarPrograma(programa) {
        if (programa.declaraciones) {
            for (let declaracion of programa.declaraciones) {
                this.evaluarDeclaracion(declaracion);
            }
        }
    }

    // EVALUAR DECLARACION SEGUN EL TIPO
    evaluarDeclaracion(declaracion) {
        if (!declaracion) return;
        
        switch (declaracion.type) {
            case 'DeclaracionFuncion':
                this.guardarFuncion(declaracion);
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
            case 'Bloque':
                this.evaluarBloque(declaracion);
                break;
        }
    }

    // EVALUAR BLOQUE DE SENTENCIAS
    evaluarBloque(bloque) {
        if (bloque.sentencias) {
            for (let sentencia of bloque.sentencias) {
                this.evaluarDeclaracion(sentencia);
            }
        }
    }

    // EVALUAR LISTA DE SENTENCIAS
    evaluarListaSentencias(lista) {
        if (lista.sentencias) {
            for (let sentencia of lista.sentencias) {
                this.evaluarDeclaracion(sentencia);
            }
        }
    }

    // GUARDAR INFO EN LA TABLA DE FUNCIONES
    guardarFuncion(funcion) {
        this.funciones[funcion.nombre] = {
            params: funcion.params || [],
            cuerpo: funcion.cuerpo
        };
        // Si es main, se ejecuta
        if (funcion.nombre === 'main') {
            if (funcion.cuerpo && funcion.cuerpo.sentencias) {
                for (let sentencia of funcion.cuerpo.sentencias) {
                    this.evaluarDeclaracion(sentencia);
                }
            }
        }
    }

    // DECLARACION DE VARIABLES: var x int = 5  o  x := 5
    evaluarDeclaracionVariable(declaracion) {
        let nombre = declaracion.identificador;
        let valor = null;
        
        // Si tiene valor inicial evaluar
        if (declaracion.valor) {
            valor = this.evaluarExpresion(declaracion.valor);
        } else {
            // Valor por defecto segun el tipo
            valor = this.obtenerValorPorDefecto(declaracion.tipo);
        }
        
        // Guardar en el ambito actual
        this.ambitoActual[nombre] = {
            valor: valor,
            tipo: declaracion.tipo
        };
    }

    // ASIGNACION DE VARIABLES: x = 10  o  x += 5
    evaluarAsignacion(asignacion) {
        let nombre = asignacion.identificador;
        let operador = asignacion.operador;
        let valorExpr = this.evaluarExpresion(asignacion.valor);
        
        // Buscar la variable en el ambito actual o global
        let variable = this.buscarVariable(nombre);
        
        if (!variable) {
            this.errores.push({
                type: 'Semantico',
                description: `Variable '${nombre}' no declarada`
            });
            return;
        }
        
        // Si es operador compuesto (+=, -=)
        if (operador === '+=') {
            valorExpr = this.sumar(variable.valor, valorExpr);
        } else if (operador === '-=') {
            valorExpr = this.restar(variable.valor, valorExpr);
        }
        
        // Actualizar el valor
        variable.valor = valorExpr;
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

    // ----- OPERACIONES ---

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
}

module.exports = Evaluador;