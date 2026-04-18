// COMPONENTE PRINCIPAL DE GoScript

import React, { useState } from 'react';
import axios from 'axios';
import Editor from './components/Editor';
import Consola from './components/Consola';
import ErrorReporte from './components/ErrorReporte';
import ASTViewer from './components/ASTViewer';
import TablaSimbolos from './components/TablaSimbolos';
import './App.css';

const API_URL = 'http://localhost:3001/api/parse';

function App() {
    const [code, setCode] = useState('func main() {\n\tvar x int = 10;\n\tfmt.Println(x);\n}');
    const [output, setOutput] = useState([]);
    const [errors, setErrors] = useState([]);
    const [astImage, setAstImage] = useState(null);
    const [tabla, setTabla] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('consola');

    const executeCode = async () => {
        setLoading(true);
        setOutput([]);
        setErrors([]);
        setAstImage(null);
        setTabla([]);

        try {
            const response = await axios.post(API_URL, { code });
            const data = response.data;
            
            setOutput(data.consoleOutput || []);
            setErrors(data.errors || []);
            setAstImage(data.astImage || null);
            setTabla(data.tablaSimbolos || []);
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
                    <div className="report-tabs">
                        <button 
                            className={activeTab === 'consola' ? 'tab-active' : ''}
                            onClick={() => setActiveTab('consola')}
                        >
                            Consola
                        </button>
                        <button 
                            className={activeTab === 'errores' ? 'tab-active' : ''}
                            onClick={() => setActiveTab('errores')}
                        >
                            Errores
                        </button>
                        <button 
                            className={activeTab === 'tabla' ? 'tab-active' : ''}
                            onClick={() => setActiveTab('tabla')}
                        >
                            Tabla de Simbolos
                        </button>
                        <button 
                            className={activeTab === 'ast' ? 'tab-active' : ''}
                            onClick={() => setActiveTab('ast')}
                        >
                            AST
                        </button>
                    </div>
                    
                    <div className="report-content">
                        {activeTab === 'consola' && <Consola output={output} />}
                        {activeTab === 'errores' && <ErrorReporte errors={errors} />}
                        {activeTab === 'tabla' && <TablaSimbolos tabla={tabla} />}
                        {activeTab === 'ast' && <ASTViewer astImage={astImage} />}
                    </div>
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