/* SERVIDOR PRINCIPAL DE LA API REST */

const express = require('express');
const cors = require('cors');
const parser = require('./parser');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

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
        const ast = parser.parse(code);
        resultado.ast = ast;
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

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});