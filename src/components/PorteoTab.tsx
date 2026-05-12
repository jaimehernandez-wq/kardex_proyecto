import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { FileOutput, Trash2, GripVertical, CheckCircle2 } from 'lucide-react';
import { cn, toISODate, fmtDateTime } from '../lib/utils';
import { Movimiento } from '../types';
import {usePersistentState} from '../hooks/usePersistentState';

export function PorteoTab({ movs }: { movs: Movimiento[] }) {
  const [importedData, setImportedData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const [outName, setOutName] = useState<string>('Exportacion_Datos');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      setTimeout(() => {
        try {
          const wb = XLSX.read(buf, { type: 'array', cellDates: true });
          const sheetName = wb.SheetNames[0]; // first sheet
          const sheet = wb.Sheets[sheetName];
          const raw = XLSX.utils.sheet_to_json<any>(sheet);
          
          if (raw.length === 0) {
            alert('El archivo no tiene datos válidos.');
            setLoading(false);
            return;
          }

          // Extract columns from the first row object keys
          const cols = new Set<string>();
          raw.forEach(row => {
            Object.keys(row).forEach(k => cols.add(k));
          });

          const colArr = Array.from(cols);
          
          setImportedData(raw);
          setColumns(colArr);
          setSelectedCols(new Set(colArr)); // select all by default
          setLoading(false);
        } catch(err: any) {
          console.error(err);
          alert('Error al parsear el archivo.');
          setLoading(false);
        }
      }, 50);
    } catch(err: any) {
      console.error(err);
      alert('Error de lectura.');
      setLoading(false);
    }
  };

  const clearData = () => {
    setImportedData([]);
    setColumns([]);
    setSelectedCols(new Set());
  };

  const toggleCol = (c: string) => {
    const next = new Set(selectedCols);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setSelectedCols(next);
  };

  const selectAll = (all: boolean) => {
    if (all) setSelectedCols(new Set(columns));
    else setSelectedCols(new Set());
  };

  const handleExport = () => {
    if (importedData.length === 0 || selectedCols.size === 0) return;

    // Filter properties based on selected columns
    const filteredPayload = importedData.map(row => {
      const outRow: any = {};
      columns.forEach(c => {
        if (selectedCols.has(c)) {
          outRow[c] = row[c] === undefined ? '' : row[c];
        }
      });
      return outRow;
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredPayload), 'DatosPortados');
    
    // safe filename
    const safeName = outName.trim() || 'Porteo';
    const timestampStr = toISODate(new Date()).replace(/-/g, '') + '_' + new Date().getHours() + new Date().getMinutes();
    
    XLSX.writeFile(wb, `${safeName}_${timestampStr}.xlsx`);
  };

  return (
    <div>
      <div className="bg-white border border-[var(--color-line)] rounded-[14px] p-6 mb-4">
        <h2 className="text-xl font-serif mb-2">Porteo y Limpieza de Datos</h2>
        <p className="text-[13.5px] text-[var(--color-ink-muted)] max-w-3xl mb-6">
          Sube un documento Excel externo, visualiza la lectura de sus columnas detectadas, elige cuáles deseas conservar e impórtalas a un nuevo archivo limpio en el sistema.
        </p>

        {importedData.length === 0 ? (
          <label className={cn("flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-line)] rounded-xl p-10 text-center bg-[var(--color-surface)] cursor-pointer transition-all hover:border-[var(--color-red)] hover:bg-[var(--color-red-pale)] group")}>
            <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={loading} />
            <FileOutput className="w-10 h-10 text-[var(--color-red)] mb-3 group-hover:-translate-y-1 transition-transform" />
            <div className="font-semibold text-base mb-1">Subir Excel para Porteo</div>
            <div className="text-sm text-[var(--color-ink-muted)]">Elige el archivo de entrada</div>
          </label>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-[var(--color-ok)]/10 border border-[var(--color-ok)]/20 rounded-lg">
              <div className="flex items-center gap-3 text-[var(--color-ok-dark)]">
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <div className="font-bold">Archivo cargado exitosamente</div>
                  <div className="text-sm">{importedData.length} filas analizadas · {columns.length} columnas detectadas</div>
                </div>
              </div>
              <button onClick={clearData} className="px-3 py-1.5 text-sm bg-white border border-[var(--color-line)] rounded-md hover:bg-gray-50 text-[var(--color-err)] font-semibold flex items-center gap-1.5 border-none shadow-sm">
                <Trash2 className="w-4 h-4"/> Descartar
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 border border-[var(--color-line)] rounded-lg bg-white overflow-hidden">
                <div className="px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-line)] flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--color-ink)]">Selección de Columnas</h3>
                  <div className="space-x-3 text-xs">
                    <button onClick={() => selectAll(true)} className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] font-semibold">Seleccionar todas</button>
                    <button onClick={() => selectAll(false)} className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] font-semibold">Ninguna</button>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-h-[400px] overflow-y-auto">
                  {columns.map(c => (
                    <label key={c} className="flex items-center gap-2.5 p-2 rounded hover:bg-[var(--color-surface)] cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-[var(--color-red)] cursor-pointer"
                        checked={selectedCols.has(c)}
                        onChange={() => toggleCol(c)}
                      />
                      <span className={cn("text-[13px] truncate flex-1", selectedCols.has(c) ? "text-[var(--color-ink)] font-medium" : "text-[var(--color-ink-muted)]")}>{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border border-[var(--color-line)] rounded-lg bg-[var(--color-surface)] p-5 space-y-5 sticky top-4">
                <div>
                  <h3 className="font-bold text-[14px] text-[var(--color-ink)] mb-1">Exportación de Datos</h3>
                  <p className="text-[12px] text-[var(--color-ink-muted)] leading-relaxed">Las columnas marcadas serán porteadas al nivel archivo de salida, respetando el volumen de filas originas.</p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[var(--color-ink-muted)] uppercase tracking-wider">Nombre del archivo salida</label>
                  <input 
                    type="text" 
                    value={outName}
                    onChange={(e) => setOutName(e.target.value)}
                    className="w-full bg-white border border-[var(--color-line)] rounded-md px-3 py-2 text-[13px] outline-none focus:border-[var(--color-red)]"
                    placeholder="Ej. DatosFiltrados"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleExport}
                    disabled={selectedCols.size === 0}
                    className="w-full flex justify-center items-center gap-2 bg-[var(--color-red)] text-white font-bold py-2.5 rounded-lg hover:bg-[var(--color-red-deep)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileOutput className="w-4 h-4" /> Exportar Selección ({selectedCols.size})
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
