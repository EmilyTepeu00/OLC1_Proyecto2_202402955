// EDITOR DE CODIGO
import React, { useState } from 'react';

function Editor({ code, setCode, onExecute }) {
    const [fileName, setFileName] = useState('sin titulo.gst');

    const handleOpenFile = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.gst';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                setFileName(file.name);
                const reader = new FileReader();
                reader.onload = (event) => {
                    setCode(event.target.result);
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const handleSaveFile = () => {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="editor-container">
            <div className="editor-header">
                <span className="file-name">{fileName}</span>
                <div className="editor-buttons">
                    <button onClick={handleOpenFile}>Abrir archivo</button>
                    <button onClick={handleSaveFile}>Guardar archivo</button>
                    <button onClick={onExecute}>Ejecutar</button>
                </div>
            </div>
            <textarea
                className="editor-textarea"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Escribe tu codigo GoScript aqui..."
                rows={20}
            />
        </div>
    );
}

export default Editor;