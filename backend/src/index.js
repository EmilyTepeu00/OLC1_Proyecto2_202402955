/* SERVIDOR PRINCIPAL DE LA API REST */

const express = require('express');
const cors = require('cors');
const Evaluador = require('./evaluator');

const app = express();
const port = 3001;

// MIDDLEWARES
app.use(cors());
app.use(express.json());

// Funcion para detectar errores basicos
function detectarErrores(code) {
    const errors = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        
        // Error lexico: caracteres no permitidos
        const invalidChars = line.match(/[&@#$%^~`|\\]/);
        if (invalidChars) {
            errors.push({
                type: 'Lexico',
                line: lineNum,
                column: line.indexOf(invalidChars[0]) + 1,
                description: `Caracter '${invalidChars[0]}' no es aceptado en el lenguaje`
            });
        }
        
        // Error sintactico: var sin valor
        if (line.match(/var\s+[a-z]+\s+int\s*=\s*$/) || line.match(/var\s+[a-z]+\s+int\s*=\s*;/)) {
            errors.push({
                type: 'Sintactico',
                line: lineNum,
                column: line.length,
                description: 'Declaracion de variable incompleta. Se espera una expresion'
            });
        }
        
        // Error semantico: asignar string a int
        if (line.match(/var\s+[a-z]+\s+int\s*=\s*"[^"]+"/)) {
            errors.push({
                type: 'Semantico',
                line: lineNum,
                column: line.indexOf('=') + 2,
                description: 'No se puede asignar un valor string a una variable de tipo int'
            });
        }
    }
    
    return errors;
}

// ENDPOINT PARA ANALIZAR Y EJECUTAR CODIGO
app.post('/api/parse', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'No se proporciono codigo.' });
    }

    let resultado = {
        ast: null,
        errors: [],
        consoleOutput: []
    };

    try {
        // Detectar errores basicos
        const erroresDetectados = detectarErrores(code);
        
        if (erroresDetectados.length > 0) {
            resultado.errors = erroresDetectados;
        } else {
            // Si no hay errores -> ejecutar el codigo
            const evaluador = new Evaluador();
            const resultadoEjecucion = evaluador.interpretarCodigo(code);
            resultado.consoleOutput = resultadoEjecucion.output;
            resultado.errors = resultadoEjecucion.errors;
            // Guardar evaluador para la tabla de simbolos
            resultado.tablaSimbolos = evaluador.obtenerTablaSimbolos();
        }
        
    } catch (error) {
        resultado.errors.push({
            type: 'Error',
            line: 0,
            column: 0,
            description: error.message
        });
    }

    res.json(resultado);
});

// INICIAR SERVIDOR
app.listen(port, () => {
    console.log(`Servidor en http://localhost:${port}`);
});