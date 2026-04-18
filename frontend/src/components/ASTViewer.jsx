// ARBOL DE SINTAXIS ABSTRACTA

import React, { useState } from 'react';

function ASTViewer({ astImage }) {
    const [expanded, setExpanded] = useState(true);

    if (!astImage) {
        return (
            <div className="ast-container">
                <div className="ast-header">
                    <span>AST - Arbol de Sintaxis Abstracta</span>
                </div>
                <div className="ast-content">
                    <div className="ast-empty">No hay AST generado</div>
                </div>
            </div>
        );
    }

    return (
        <div className="ast-container">
            <div className="ast-header">
                <span>AST - Arbol de Sintaxis Abstracta</span>
                <button onClick={() => setExpanded(!expanded)}>
                    {expanded ? 'Colapsar' : 'Expandir'}
                </button>
            </div>
            {expanded && (
                <div className="ast-content">
                    <img 
                        src={`data:image/png;base64,${astImage}`} 
                        alt="Árbol de Sintaxis Abstracta"
                        className="ast-imagen"
                    />
                </div>
            )}
        </div>
    );
}

export default ASTViewer;