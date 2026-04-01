/* SERVIDOR PRINCIPAL DE LA API REST */

const express = require('express');
const cors = require('cors');
const parser = require('./parser');
const Evaluador = require('./evaluator');

const app = express();
const port = 3001;

// MIDDLEWARES
app.use(cors());
app.use(express.json());

// ENDPOINT PARA ANALIZAR Y EJECUTAR CODIGO
app.post('/api/parse', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'No hay codigo para analizar' });
    }

    let resultado = {
        ast: null,
        errors: [],
        consoleOutput: []
    };

    try {
        // ANALISIS SINTACTICO CON JISON
        const ast = parser.parse(code);
        resultado.ast = ast;
        
        // INTERPRETACION DEL AST
        const evaluador = new Evaluador();
        const resultadoEjecucion = evaluador.interpretar(ast);
        
        resultado.consoleOutput = resultadoEjecucion.output;
        resultado.errors.push(...resultadoEjecucion.errors);
        
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

// INICAR SERVIDOR
app.listen(port, () => {
    console.log(`Servidor en http://localhost:${port}`);
});