/* SERVIDOR PRINCIPAL DE LA API REST */

const express = require('express');
const cors = require('cors');
const parser = require('./parser');
const Evaluador = require('./evaluator');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/parse', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'No se proporciono codigo.' });
    }

    let resultado = {
        ast: null,
        errors: [],
        consoleOutput: [],
        tablaSimbolos: []
    };

    try {
        // Generar AST usando el parser de Jison
        const ast = parser.parse(code);
        resultado.ast = ast;
        
        // Ejecutar el codigo con el evaluador
        const evaluador = new Evaluador();
        const resultadoEjecucion = evaluador.interpretar(ast);
        
        resultado.consoleOutput = resultadoEjecucion.output;
        resultado.errors = resultadoEjecucion.errors;
        resultado.tablaSimbolos = evaluador.obtenerTablaSimbolos();
        
    } catch (error) {
        resultado.errors.push({
            type: 'Sintactico',
            line: error.location?.first_line || 0,
            column: error.location?.first_column || 0,
            description: error.message
        });
    }

    res.json(resultado);
});

// INICIAR SERVIDOR
app.listen(port, () => {
    console.log(`Servidor en http://localhost:${port}`);
});