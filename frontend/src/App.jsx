// COMPONENTE PRINCIPAL DE GoScript

import React, { useState } from 'react';
import axios from 'axios';
import Editor from './components/Editor';
import Consola from './components/Consola';
import ErrorReporte from './components/ErrorReporte';
import ASTViewer from './components/ASTViewer';
import './App.css';

const API_URL = 'http://localhost:3001/api/parse';

function App() {
    const [code, setCode] = useState('func main() {\n\tfmt.Println("Hola GoScript!");\n}');
    const [output, setOutput] = useState([]);
    const [errors, setErrors] = useState([]);
    const [ast, setAst] = useState(null);
    const [loading, setLoading] = useState(false);

    const executeCode = async () => {
        setLoading(true);
        setOutput([]);
        setErrors([]);
        setAst(null);

        try {
            const response = await axios.post(API_URL, { code });
            const data = response.data;
            
            setOutput(data.consoleOutput || []);
            setErrors(data.errors || []);
            setAst(data.ast);
        } catch (error) {
            setErrors([{
                type: 'Conexion',
                line: 0,
                column: 0,
                description: 'No se pudo conectar con el servidor'
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app">
            <header className="app-header">
                <h1>GoScript Interpreter</h1>
                <p>Lenguaje inspirado en Go</p>
            </header>
            
            <div className="app-content">
                <Editor
                    code={code}
                    setCode={setCode}
                    onExecute={executeCode}
                />
                
                <div className="results-container">
                    <Consola output={output} />
                    <ErrorReporte errors={errors} />
                    <ASTViewer ast={ast} />
                </div>
            </div>
            
            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Ejecutando...</p>
                </div>
            )}
        </div>
    );
}

export default App;