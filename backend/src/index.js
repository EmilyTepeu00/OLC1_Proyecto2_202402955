/* SERVIDOR PRINCIPAL DE LA API REST */

const express = require('express');
const cors = require('cors');
const Evaluador = require('./evaluator');

const app = express();
const port = 3001;

// MIDDLEWARES
app.use(cors());
app.use(express.json());

// ENDPOINT PARA ANALIZAR Y EJECUTAR CODIGO
app.post('/api/parse', (req, res) => {
    const { code } = req.body;

    console.log("Codigo recibido:", code);

    if (!code) {
        return res.status(400).json({ error: 'No hay codigo para analizar' });
    }

    let resultado = {
        ast: null,
        errors: [],
        consoleOutput: []
    };

    try {
        const evaluador = new Evaluador();
        const resultadoEjecucion = evaluador.interpretarCodigo(code);
        
        console.log("Resultado ejecucion:", resultadoEjecucion);
        
        resultado.consoleOutput = resultadoEjecucion.output;
        resultado.errors = resultadoEjecucion.errors;
        
    } catch (error) {
        console.log("Error:", error);
        resultado.errors.push({
            type: 'Error',
            line: 0,
            column: 0,
            description: error.message
        });
    }

    console.log("Respuesta:", resultado);
    res.json(resultado);
});

// INICIAR SERVIDOR
app.listen(port, () => {
    console.log(`Servidor en http://localhost:${port}`);
});