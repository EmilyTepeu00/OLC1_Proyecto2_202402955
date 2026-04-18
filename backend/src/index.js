/* SERVIDOR PRINCIPAL DE LA API REST */

const express = require('express');
const cors = require('cors');
const parser = require('./parser');
const Evaluador = require('./evaluator');
const graphviz = require('graphviz');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Funcion para generar diagrama AST con graphviz
function generarImagenAST(ast, outputPath) {
    return new Promise((resolve, reject) => {
        const g = graphviz.digraph("AST");
        g.set("rankdir", "TB");
        
        let nodeCount = 0;
        
        function agregarNodo(padre, nodo, nombrePadre) {
            const nodeId = `nodo_${nodeCount++}`;
            let label = "";
            
            if (typeof nodo === 'object' && nodo !== null) {
                if (nodo.type) {
                    label = nodo.type;
                    if (nodo.value !== undefined) label += `\\n${nodo.value}`;
                    if (nodo.name) label += `\\n${nodo.name}`;
                    if (nodo.operator) label += `\\n${nodo.operator}`;
                } else {
                    label = JSON.stringify(nodo).substring(0, 50);
                }
            } else {
                label = String(nodo);
            }
            
            g.addNode(nodeId, { label: label, shape: "box", style: "filled", fillcolor: "lightblue" });
            
            if (padre) {
                g.addEdge(padre, nodeId);
            }
            
            if (typeof nodo === 'object' && nodo !== null) {
                if (nodo.children && Array.isArray(nodo.children)) {
                    for (let i = 0; i < nodo.children.length; i++) {
                        agregarNodo(nodeId, nodo.children[i], `${nombrePadre}_${i}`);
                    }
                } else {
                    for (const [key, value] of Object.entries(nodo)) {
                        if (key !== 'type' && key !== 'value' && key !== 'name' && key !== 'operator') {
                            if (typeof value === 'object' && value !== null) {
                                agregarNodo(nodeId, value, `${nombrePadre}_${key}`);
                            } else if (typeof value !== 'function') {
                                const tempNode = { type: key, value: String(value) };
                                agregarNodo(nodeId, tempNode, `${nombrePadre}_${key}`);
                            }
                        }
                    }
                }
            }
        }
        
        agregarNodo(null, ast, "root");
        
        g.output("png", outputPath, (err) => {
            if (err) reject(err);
            else resolve(outputPath);
        });
    });
}

app.post('/api/parse', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'No se proporciono codigo.' });
    }

    let resultado = {
        ast: null,
        errors: [],
        consoleOutput: [],
        tablaSimbolos: [],
        astImage: null
    };

    try {
        // Generar AST usando el parser de Jison
        const ast = parser.parse(code);
        resultado.ast = ast;
        
        // Generar imagen del AST
        const outputPath = `./ast_${Date.now()}.png`;
        generarImagenAST(ast, outputPath).then((path) => {
            const fs = require('fs');
            const imageBase64 = fs.readFileSync(path, { encoding: 'base64' });
            fs.unlinkSync(path); // Eliminar archivo temporal
            resultado.astImage = imageBase64;
            
            // Ejecutar el codigo con el evaluador
            const evaluador = new Evaluador();
            const resultadoEjecucion = evaluador.interpretar(ast);
            
            resultado.consoleOutput = resultadoEjecucion.output;
            resultado.errors = resultadoEjecucion.errors;
            resultado.tablaSimbolos = evaluador.obtenerTablaSimbolos();
            
            res.json(resultado);
        }).catch((err) => {
            console.error("Error generando AST:", err);
            res.json(resultado);
        });
        
    } catch (error) {
        resultado.errors.push({
            type: 'Sintactico',
            line: error.location?.first_line || 0,
            column: error.location?.first_column || 0,
            description: error.message
        });
        res.json(resultado);
    }
});

// INICIAR SERVIDOR
app.listen(port, () => {
    console.log(`Servidor en http://localhost:${port}`);
});