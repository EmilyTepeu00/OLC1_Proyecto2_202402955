// TABLA DE SIMBOLOS

import React, { useState } from 'react';

function TablaSimbolos({ tabla }) {
    const [filtro, setFiltro] = useState('todos');
    const [busqueda, setBusqueda] = useState('');

    if (!tabla || tabla.length === 0) {
        return (
            <div className="tabla-container">
                <div className="tabla-header">
                    <span>Tabla de Simbolos</span>
                </div>
                <div className="tabla-content">
                    <div className="tabla-empty">No hay simbolos registrados</div>
                </div>
            </div>
        );
    }

    // Filtrar por tipo
    const filtroTipos = tabla.filter(s => {
        if (filtro === 'todos') return true;
        return s.tipo === filtro;
    });

    // Filtrar por busqueda
    const datosFiltrados = filtroTipos.filter(s => 
        s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        s.tipo.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Contar por tipo
    const varCount = tabla.filter(s => s.tipo === 'int' || s.tipo === 'float64' || s.tipo === 'string' || s.tipo === 'bool').length;
    const funcCount = tabla.filter(s => s.tipo === 'funcion').length;
    const structCount = tabla.filter(s => s.tipo === 'struct').length;
    const sliceCount = tabla.filter(s => s.tipo === 'slice').length;

    return (
        <div className="tabla-container">
            <div className="tabla-header">
                <span>Tabla de Simbolos</span>
                <span className="tabla-count">{tabla.length} simbolos</span>
            </div>
            
            <div className="tabla-filters">
                <button 
                    className={filtro === 'todos' ? 'filter-active' : ''}
                    onClick={() => setFiltro('todos')}
                >
                    Todos ({tabla.length})
                </button>
                <button 
                    className={filtro === 'int' || filtro === 'float64' || filtro === 'string' || filtro === 'bool' ? 'filter-active' : ''}
                    onClick={() => setFiltro('int')}
                >
                    Variables ({varCount})
                </button>
                <button 
                    className={filtro === 'funcion' ? 'filter-active' : ''}
                    onClick={() => setFiltro('funcion')}
                >
                    Funciones ({funcCount})
                </button>
                <button 
                    className={filtro === 'struct' ? 'filter-active' : ''}
                    onClick={() => setFiltro('struct')}
                >
                    Structs ({structCount})
                </button>
                <button 
                    className={filtro === 'slice' ? 'filter-active' : ''}
                    onClick={() => setFiltro('slice')}
                >
                    Slices ({sliceCount})
                </button>
            </div>

            <div className="tabla-busqueda">
                <input
                    type="text"
                    placeholder="Buscar simbolo..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="busqueda-input"
                />
            </div>

            <div className="tabla-content">
                <table className="tabla-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th>Ambito</th>
                            <th>Valor</th>
                            <th>Linea</th>
                            <th>Columna</th>
                        </tr>
                    </thead>
                    <tbody>
                        {datosFiltrados.map((simbolo, index) => (
                            <tr key={index} className={`tabla-row-${simbolo.tipo}`}>
                                <td><span className="simbolo-nombre">{simbolo.nombre}</span></td>
                                <td><span className={`simbolo-badge badge-${simbolo.tipo}`}>
                                    {simbolo.tipo}
                                </span></td>
                                <td>{simbolo.ambito}</td>
                                <td>{simbolo.valor}</td>
                                <td>{simbolo.linea}</td>
                                <td>{simbolo.columna}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default TablaSimbolos;