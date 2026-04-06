// REPORTE DE ERRORES

import React from 'react';

function ErrorReporte({ errors }) {
    if (errors.length === 0) {
        return (
            <div className="error-container">
                <div className="error-header">Errores</div>
                <div className="error-content">
                    <div className="no-errors">No hay errores</div>
                </div>
            </div>
        );
    }

    return (
        <div className="error-container">
            <div className="error-header">Errores ({errors.length})</div>
            <div className="error-content">
                <table className="error-table">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Linea</th>
                            <th>Columna</th>
                            <th>Descripcion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {errors.map((error, index) => (
                            <tr key={index}>
                                <td>{error.type}</td>
                                <td>{error.line}</td>
                                <td>{error.column}</td>
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