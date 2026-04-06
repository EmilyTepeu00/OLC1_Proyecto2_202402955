// REPORTE DE ERRORES

import React, { useState } from 'react';

function ErrorReporte({ errors }) {
    const [filtro, setFiltro] = useState('todos');

    if (errors.length === 0) {
        return (
            <div className="error-container">
                <div className="error-header">
                    <span>Reporte de Errores</span>
                    <span className="error-count">0 errores</span>
                </div>
                <div className="error-content">
                    <div className="no-errors">No se encontraron errores</div>
                </div>
            </div>
        );
    }

    // FILTRAR ERRORES POR TIPO
    const erroresFiltrados = filtro === 'todos' 
        ? errors 
        : errors.filter(e => e.type === filtro);

    // CONTAR ERRORES POR TIPO
    const lexicoCount = errors.filter(e => e.type === 'Lexico').length;
    const sintacticoCount = errors.filter(e => e.type === 'Sintactico').length;
    const semanticoCount = errors.filter(e => e.type === 'Semantico').length;

    return (
        <div className="error-container">
            <div className="error-header">
                <span>Reporte de Errores</span>
                <span className="error-count">{errors.length} errores</span>
            </div>
            
            <div className="error-filters">
                <button 
                    className={filtro === 'todos' ? 'filter-active' : ''}
                    onClick={() => setFiltro('todos')}
                >
                    Todos ({errors.length})
                </button>
                <button 
                    className={filtro === 'Lexico' ? 'filter-active' : ''}
                    onClick={() => setFiltro('Lexico')}
                >
                    Léxico ({lexicoCount})
                </button>
                <button 
                    className={filtro === 'Sintactico' ? 'filter-active' : ''}
                    onClick={() => setFiltro('Sintactico')}
                >
                    Sintáctico ({sintacticoCount})
                </button>
                <button 
                    className={filtro === 'Semantico' ? 'filter-active' : ''}
                    onClick={() => setFiltro('Semantico')}
                >
                    Semántico ({semanticoCount})
                </button>
            </div>

            <div className="error-content">
                <table className="error-table">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Línea</th>
                            <th>Columna</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {erroresFiltrados.map((error, index) => (
                            <tr key={index} className={`error-row error-${error.type}`}>
                                <td>
                                    <span className={`error-badge error-badge-${error.type}`}>
                                        {error.type}
                                    </span>
                                </td>
                                <td>{error.line || '-'}</td>
                                <td>{error.column || '-'}</td>
                                <td>{error.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ErrorReporte;