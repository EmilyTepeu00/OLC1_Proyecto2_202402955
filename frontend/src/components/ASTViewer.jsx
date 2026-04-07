// ARBOL DE SINTAXIS ABSTRACTA

import React, { useState } from 'react';

function ASTViewer({ ast }) {
    const [expanded, setExpanded] = useState(true);
    const [vista, setVista] = useState('arbol'); // 'arbol' o 'json'

    if (!ast) {
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

    // CONVERTIR AST A DORMATO DE ARBOL VISUAL
    const convertirAArbol = (obj, nombre = 'Programa') => {
        if (!obj) return { nombre: 'null', hijos: [] };
        
        if (typeof obj !== 'object') {
            return { nombre: `${nombre}: ${obj}`, hijos: [] };
        }
        
        const hijos = [];
        
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'type') continue;
            
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    const arrayNode = { nombre: `${key} []`, hijos: [] };
                    value.forEach((item, idx) => {
                        arrayNode.hijos.push(convertirAArbol(item, `[${idx}]`));
                    });
                    hijos.push(arrayNode);
                } else {
                    hijos.push({ nombre: `${key}: []`, hijos: [] });
                }
            } else if (typeof value === 'object' && value !== null) {
                hijos.push(convertirAArbol(value, key));
            } else if (value !== undefined) {
                hijos.push({ nombre: `${key}: ${value}`, hijos: [] });
            }
        }
        
        return { nombre: nombre, hijos: hijos };
    };

    const arbol = convertirAArbol(ast);

    // COMPONENTE RECURSIVO PARA RENDERIZAR EL ARBOL
    const NodoArbol = ({ nodo, nivel = 0 }) => {
        const [estaExpandido, setEstaExpandido] = useState(nivel < 2);
        
        const tieneHijos = nodo.hijos && nodo.hijos.length > 0;
        
        return (
            <div className="arbol-nodo" style={{ marginLeft: nivel * 20 }}>
                <div 
                    className="arbol-nodo-contenido"
                    onClick={() => tieneHijos && setEstaExpandido(!estaExpandido)}
                >
                    {tieneHijos && (
                        <span className="arbol-expandir">
                            {estaExpandido ? '▼' : '▶'}
                        </span>
                    )}
                    {!tieneHijos && <span className="arbol-hoja">●</span>}
                    <span className="arbol-nombre">{nodo.nombre}</span>
                </div>
                {estaExpandido && tieneHijos && (
                    <div className="arbol-hijos">
                        {nodo.hijos.map((hijo, idx) => (
                            <NodoArbol key={idx} nodo={hijo} nivel={nivel + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // CONTAR NODOS DEL AST
    const contarNodos = (obj) => {
        if (!obj || typeof obj !== 'object') return 1;
        let count = 1;
        for (const value of Object.values(obj)) {
            if (Array.isArray(value)) {
                value.forEach(item => { count += contarNodos(item); });
            } else if (typeof value === 'object' && value !== null) {
                count += contarNodos(value);
            }
        }
        return count;
    };

    const totalNodos = contarNodos(ast);

    return (
        <div className="ast-container">
            <div className="ast-header">
                <span>AST - Arbol de Sintaxis Abstracta</span>
                <div className="ast-header-buttons">
                    <span className="ast-nodos-count">{totalNodos} nodos</span>
                    <div className="ast-vista-toggle">
                        <button 
                            className={vista === 'arbol' ? 'vista-active' : ''}
                            onClick={() => setVista('arbol')}
                        >
                            Arbol
                        </button>
                        <button 
                            className={vista === 'json' ? 'vista-active' : ''}
                            onClick={() => setVista('json')}
                        >
                            JSON
                        </button>
                    </div>
                    <button 
                        className="ast-expandir-todo"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? 'Colapsar' : 'Expandir'}
                    </button>
                </div>
            </div>
            
            {expanded && (
                <div className="ast-content">
                    {vista === 'arbol' ? (
                        <div className="arbol-visual">
                            <NodoArbol nodo={arbol} />
                        </div>
                    ) : (
                        <pre className="ast-json">
                            {JSON.stringify(ast, null, 2)}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}

export default ASTViewer;