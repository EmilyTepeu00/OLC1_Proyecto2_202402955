// ARBOL DE SINTAXIS ABSTRACTA

import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api/generate-ast';

function ASTViewer({ ast }) {
    const [astImage, setAstImage] = useState(null);
    const [generando, setGenerando] = useState(false);
    const [error, setError] = useState(null);

    const generarAST = async () => {
        if (!ast) {
            setError('Ejecuta el codigo primero');
            return;
        }

        console.log("AST REAL:", ast);

        setGenerando(true);
        setError(null);
        setAstImage(null);

        try {
            const response = await axios.post(API_URL, { ast });
            const data = response.data;
            
            if (data.image) {
                setAstImage(data.image);
            } else if (data.error) {
                setError(data.error);
            }
        } catch (err) {
            setError('Error al generar el AST');
        } finally {
            setGenerando(false);
        }
    };

    return (
        <div className="ast-container">
            <div className="ast-header">
                <span>AST - Arbol de Sintaxis Abstracta</span>
                <button className="ast-generar-btn" onClick={generarAST} disabled={generando}>
                    {generando ? 'Generando...' : 'Generar AST'}
                </button>
            </div>
            <div className="ast-content">
                {error && (
                    <div className="ast-error">{error}</div>
                )}
                {astImage && (
                    <img 
                        src={`data:image/png;base64,${astImage}`} 
                        alt="Arbol de Sintaxis Abstracta"
                        className="ast-imagen"
                    />
                )}
                {!astImage && !error && !generando && (
                    <div className="ast-placeholder"></div>
                )}
                {generando && (
                    <div className="ast-generando">Generando arbol AST...</div>
                )}
            </div>
        </div>
    );
}

export default ASTViewer;