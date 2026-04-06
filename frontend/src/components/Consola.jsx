// SALIDA EN CONSOLA

import React from 'react';

function Consola({ output }) {
    return (
        <div className="consola-container">
            <div className="consola-header">
                <span>Consola</span>
            </div>
            <div className="consola-content">
                {output.length === 0 ? (
                    <div className="consola-empty">No hay salida</div>
                ) : (
                    output.map((line, index) => (
                        <div key={index} className="consola-line">
                            {line}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Consola;