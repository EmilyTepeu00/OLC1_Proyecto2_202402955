// ARBOL DE SINTAXIS ABSTRACTA

import React, { useState } from 'react';

function ASTViewer({ ast }) {
    const [expanded, setExpanded] = useState(true);

    if (!ast) {
        return (
            <div className="ast-container">
                <div className="ast-header">AST</div>
                <div className="ast-content">
                    <div className="ast-empty">No hay AST generado</div>
                </div>
            </div>
        );
    }

    return (
        <div className="ast-container">
            <div className="ast-header">
                <span>AST</span>
                <button onClick={() => setExpanded(!expanded)}>
                    {expanded ? 'Colapsar' : 'Expandir'}
                </button>
            </div>
            {expanded && (
                <div className="ast-content">
                    <pre className="ast-json">
                        {JSON.stringify(ast, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

export default ASTViewer;