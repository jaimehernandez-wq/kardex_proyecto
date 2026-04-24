import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, Package, Database, BarChart3, Activity, Loader2, X, AlertCircle, CheckCircle2, Search, Barcode } from 'lucide-react';
import * as XLSX from 'xlsx';

import { saveToDB, loadFromDB } from './lib/indexeddb';
import { parseNumber, parseDate, COL_MAP, cn, fromISODate, toISODate, fmtNum, fmtDateTime } from './lib/utils';
import type { Movimiento, Uniques } from './types';

// Components
import { KardexTab } from './components/KardexTab';
import { SaldosTab } from './components/SaldosTab';
import { MovsTab } from './components/MovsTab';
import { DashTab } from './components/DashTab';
import { GtinTab } from './components/GtinTab';
import { PorteoTab } from './components/PorteoTab';

export default function App() {
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<string[]>([]);
  
  const [dbStatus, setDbStatus] = useState<string>('Buscando en caché...');
  
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadStatus, setLoadStatus] = useState('');

  const [activeTab, setActiveTab] = useState<'kardex' | 'saldos' | 'movs' | 'dash' | 'gtin' | 'porteo'>('kardex');

  const [showSchemaModal, setShowSchemaModal] = useState(false);

  useEffect(() => {
    async function init() {
      const dbData = await loadFromDB();
      if (dbData && dbData.movs.length > 0) {
        setMovs(dbData.movs);
        setLoadedAt(dbData.loadedAt);
        setFileName(dbData.fileName);
        if (dbData.fileMeta) setFileMeta(dbData.fileMeta);
        setDbStatus(`${fmtNum(dbData.movs.length)} movimientos cargados`);
      } else {
        setDbStatus('Sin datos');
      }
    }
    init();
  }, []);

  const uniques = useMemo<Uniques>(() => {
    const s = { almacenes: new Set<string>(), tipos: new Set<string>(), motivos: new Set<string>(), marcas: new Set<string>(), proveedores: new Set<string>() };
    const prodMap = new Map<string, any>();
    const gtinMap = new Map<string, any>();
    
    movs.forEach(r => {
      if (r.almacen && r.almacen !== '-') s.almacenes.add(r.almacen);
      if (r.tipoMov) s.tipos.add(r.tipoMov);
      if (r.motivo) s.motivos.add(r.motivo);
      if (r.marca) s.marcas.add(r.marca);
      if (r.proveedor) s.proveedores.add(r.proveedor);
      
      if (r.codRef && !prodMap.has(r.codRef)) {
        prodMap.set(r.codRef, { codRef: r.codRef, nombre: r.nombre || '', gtin: r.gtin || '', upn: r.upn || '' });
      }
      
      if (r.gtin && !gtinMap.has(r.gtin)) {
        gtinMap.set(r.gtin, { gtin: r.gtin, nombre: r.nombre || '', codRef: r.codRef || '' });
      }
    });
    
    const sort = (a: Set<string>) => Array.from(a).sort((x, y) => String(x).localeCompare(String(y), 'es'));
    return {
      almacenes: sort(s.almacenes),
      tipos: sort(s.tipos),
      motivos: sort(s.motivos),
      marcas: sort(s.marcas),
      proveedores: sort(s.proveedores),
      productos: Array.from(prodMap.values()).sort((a, b) => a.codRef.localeCompare(b.codRef, 'es')),
      gtins: Array.from(gtinMap.values()).sort((a, b) => a.gtin.localeCompare(b.gtin, 'es'))
    };
  }, [movs]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadStatus('Cargando...');
    setLoadProgress(10);

    try {
      const buf = await file.arrayBuffer();
      setLoadStatus('Decodificando hoja...');
      setLoadProgress(30);

      setTimeout(() => {
        try {
          const wb = XLSX.read(buf, { type: 'array', cellDates: true });
          const sheetName = wb.SheetNames.includes('Kardex') ? 'Kardex' : wb.SheetNames[0];
          const sheet = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });

          let headerIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const r = (rows[i] || []).map(c => String(c).trim().toLowerCase());
            if (
              r.some(c => c === 'tipo movimiento' || c === 'tipo de movimiento') && 
              r.some(c => c === 'almacen' || c === 'almacén') && 
              r.some(c => c === 'cantidad')
            ) {
              headerIdx = i; break;
            }
          }

          if (headerIdx < 0) {
            throw new Error('No se encontró la fila de encabezados (busco "Tipo Movimiento", "Almacén" y "Cantidad").');
          }

          const extractedMeta: string[] = [];
          for (let i = 0; i < Math.min(headerIdx, 4); i++) { // Extract lines before header (first 3-4 typically)
            const rw = (rows[i] || []).filter(c => c !== null && c !== undefined && c !== '').join(' — ');
            if (rw.trim()) extractedMeta.push(rw);
          }

          const headers = rows[headerIdx].map(h => String(h).trim());
          const totalRows = rows.length - headerIdx - 1;
          
          setLoadStatus(`Parseando ${fmtNum(totalRows)} filas...`);
          setLoadProgress(50);

          const newMovs: Movimiento[] = [];
          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;
            const obj: any = {};
            headers.forEach((h, j) => {
              const key = COL_MAP[h] || h.replace(/\s+/g, '_').toLowerCase();
              obj[key] = row[j];
            });

            const parsed: Movimiento = {
              tipoMov: String(obj.tipoMov || '').trim(),
              motivo: String(obj.motivo || '').trim(),
              almacen: String(obj.almacen || '').trim(),
              folioFactura: String(obj.folioFactura || '').trim(),
              folioInterno: String(obj.folioInterno || '').trim(),
              folio: String(obj.folio || '').trim(),
              fechaHora: parseDate(obj.fechaHora),
              codRef: String(obj.codRef || '').trim(),
              nombre: String(obj.nombre || '').trim(),
              cantidad: parseNumber(obj.cantidad),
              upn: String(obj.upn || '').trim(),
              gtin: String(obj.gtin || '').trim(),
              lote: String(obj.lote || '').trim(),
              serie: String(obj.serie || '').trim(),
              caducidad: parseDate(obj.caducidad),
              marca: String(obj.marca || '').trim(),
              proveedor: String(obj.proveedor || '').trim(),
              tipoOC: String(obj.tipoOC || '').trim(),
              usuario: String(obj.usuario || '').trim(),
              almacenDestino: String(obj.almacenDestino || '').trim()
            };
            newMovs.push(parsed);
          }

          setLoadStatus('Guardando en caché local...');
          setLoadProgress(90);

          saveToDB(newMovs, file.name, extractedMeta).then(() => {
            setMovs(newMovs);
            setLoadedAt(new Date());
            setFileName(file.name);
            setFileMeta(extractedMeta);
            setDbStatus(`${fmtNum(newMovs.length)} movimientos cargados`);
            setLoadProgress(100);
            setLoadStatus('Listo');
            setTimeout(() => setLoading(false), 500);
          });
        } catch (e: any) {
          console.error(e);
          alert(`Error al procesar el archivo: ${e.message}`);
          setLoading(false);
        }
      }, 50); // slight delay to allow UI to update

    } catch (e: any) {
      console.error(e);
      alert('Error en la lectura inicial del archivo.');
      setLoading(false);
    }
  };

  const totalEntradas = movs.reduce((s, r) => s + (r.cantidad > 0 ? r.cantidad : 0), 0);
  const totalSalidas = movs.reduce((s, r) => s + (r.cantidad < 0 ? Math.abs(r.cantidad) : 0), 0);
  const balance = totalEntradas - totalSalidas;

  return (
    <div className="min-h-screen pb-16">
      {/* Masthead */}
      <header className="sticky top-0 z-50 flex items-start justify-between gap-6 px-7 py-3.5 bg-white/90 backdrop-blur-md border-b border-[var(--color-line)] shadow-sm">
        <div className="flex items-center gap-3.5">
          <svg className="h-9 w-auto shrink-0" viewBox="0 0 220 52">
            <g transform="translate(4,8)">
              <path d="M18 36 C6 26, 0 20, 0 12 C0 5, 5 0, 11 0 C14.5 0, 17 1.8, 18 4 C19 1.8, 21.5 0, 25 0 C31 0, 36 5, 36 12 C36 20, 30 26, 18 36 Z" fill="#C41E3A"/>
              <path d="M5 16 L12 16 L14 10 L17 22 L20 14 L23 16 L31 16" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
            <text x="50" y="22" fontFamily="Calibri, sans-serif" fontWeight="800" fontSize="15" letterSpacing=".5" fill="#0E0E0E">CORVASC</text>
            <text x="50" y="38" fontFamily="Calibri, sans-serif" fontWeight="600" fontSize="9" letterSpacing="1.2" fill="#64646A">DEVICES · S.A. DE C.V.</text>
          </svg>
          <div className="flex flex-col leading-tight">
            <span className="font-extrabold tracking-wide text-sm text-[var(--color-ink)]">Kardex Control Pro</span>
            <span className="text-[10.5px] text-[var(--color-ink-muted)] tracking-widest uppercase mt-0.5">Trazabilidad · Inventario</span>
          </div>
        </div>
        <div className="hidden md:flex flex-col items-end gap-1.5 w-full max-w-[500px]">
          <div className="flex flex-wrap justify-end items-center gap-4 text-xs text-[var(--color-ink-muted)]">
            <span className="flex items-center">
              <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5 shadow-[0_0_0_3px_rgba(15,122,62,0.15)]", movs.length > 0 ? "bg-[var(--color-ok)]" : "bg-[var(--color-ink-muted)] shadow-[0_0_0_3px_rgba(100,100,106,0.12)]")}></span>
              {dbStatus}
            </span>
            {loadedAt && <span>Generado: {fmtDateTime(loadedAt)}</span>}
            <button 
              className="hover:text-[var(--color-red)] hover:bg-[var(--color-red-pale)] px-2 py-1 rounded transition-colors"
              onClick={() => setShowSchemaModal(true)}
            >
              Esquema esperado
            </button>
          </div>
          
          {fileName && (
            <div className="flex flex-col items-end text-right w-full mt-1 border-t border-[var(--color-line-soft)] pt-2">
              <div className="text-[11px] font-bold text-[var(--color-ink-muted)] uppercase tracking-widest mb-0.5">Origen de los datos</div>
              <div className="text-[12.5px] font-mono text-[var(--color-ink-soft)] px-2.5 py-1 bg-[var(--color-surface)] rounded-md border border-[var(--color-line)] shadow-sm max-w-full truncate">
                {fileName} 
              </div>
              {fileMeta.length > 0 && (
                <div className="text-[10px] text-[var(--color-ink-muted)] mt-1.5 max-w-[90%] leading-tight bg-gray-50/50 p-1.5 rounded text-left border border-gray-100 italic">
                  {fileMeta.map((line, idx) => (
                    <div key={idx} className="truncate">{line}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[1480px] mx-auto px-4 md:px-7 pt-6">
        
        {/* Hero */}
        <section className="mb-6 pb-5 border-b border-[var(--color-line-soft)]">
          <h1 className="font-serif text-3xl md:text-[42px] leading-[1.05] tracking-tight text-[var(--color-ink)]">
            Reporte <em className="text-[var(--color-red)] italic">profesional</em> de Kardex<br />
            con cálculo preciso de saldo por almacén
          </h1>
          <p className="mt-2 text-[var(--color-ink-muted)] text-[15px] max-w-[720px]">
            Importa tu archivo de movimientos, calcula saldos a cualquier fecha de corte, y consulta el kardex detallado por producto y almacén con exportación a Excel.
          </p>
        </section>

        {movs.length === 0 ? (
          <section className="mt-8">
            <label className={cn("flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-line)] rounded-2xl p-9 text-center bg-white cursor-pointer transition-all hover:border-[var(--color-red)] hover:bg-[var(--color-red-pale)] group")}>
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFile} disabled={loading} />
              <Upload className="w-10 h-10 text-[var(--color-red)] mb-2.5 group-hover:-translate-y-1 transition-transform" />
              <div className="font-semibold text-base mb-1">Arrastra tu archivo Excel o haz clic aquí</div>
              <div className="text-sm text-[var(--color-ink-muted)]">Se esperan los encabezados en fila 5 · hoja <span className="font-mono bg-[var(--color-surface)] px-1 py-0.5 rounded">Kardex</span></div>
              <div className="mt-3 text-xs text-[var(--color-ink-muted)] font-mono">Flutter_Real_kardex_YYYYMMDD_YYYYMMDD.xlsx</div>
            </label>
          </section>
        ) : (
          <section className="space-y-6">
            
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="bg-white border border-[var(--color-line)] rounded-[10px] p-4 shadow-sm">
                <div className="text-[11px] text-[var(--color-ink-muted)] uppercase tracking-widest font-semibold mb-1.5">Movimientos</div>
                <div className="font-serif text-[28px] leading-none mb-1">{fmtNum(movs.length)}</div>
                <div className="text-[11.5px] text-[var(--color-ink-muted)]">filas totales</div>
              </div>
              <div className="bg-white border border-[var(--color-line)] rounded-[10px] p-4 shadow-sm">
                <div className="text-[11px] text-[var(--color-ink-muted)] uppercase tracking-widest font-semibold mb-1.5">Productos únicos</div>
                <div className="font-serif text-[28px] leading-none mb-1 text-[var(--color-red)]">{fmtNum(uniques.productos.length)}</div>
                <div className="text-[11.5px] text-[var(--color-ink-muted)]">códigos referenciados</div>
              </div>
              <div className="bg-white border border-[var(--color-line)] rounded-[10px] p-4 shadow-sm">
                <div className="text-[11px] text-[var(--color-ink-muted)] uppercase tracking-widest font-semibold mb-1.5">Almacenes</div>
                <div className="font-serif text-[28px] leading-none mb-1">{fmtNum(uniques.almacenes.length)}</div>
                <div className="text-[11.5px] text-[var(--color-ink-muted)]">puntos de inventario</div>
              </div>
              <div className="bg-white border border-[var(--color-line)] rounded-[10px] p-4 shadow-sm">
                <div className="text-[11px] text-[var(--color-ink-muted)] uppercase tracking-widest font-semibold mb-1.5">Total Entradas</div>
                <div className="font-serif text-[28px] leading-none mb-1 text-[var(--color-ok)]">{fmtNum(totalEntradas)}</div>
                <div className="text-[11.5px] text-[var(--color-ink-muted)]">unidades ingresadas</div>
              </div>
              <div className="bg-white border border-[var(--color-line)] rounded-[10px] p-4 shadow-sm">
                <div className="text-[11px] text-[var(--color-ink-muted)] uppercase tracking-widest font-semibold mb-1.5">Total Salidas</div>
                <div className="font-serif text-[28px] leading-none mb-1 text-[var(--color-err)]">{fmtNum(totalSalidas)}</div>
                <div className="text-[11.5px] text-[var(--color-ink-muted)]">unidades salidas</div>
              </div>
              <div className="bg-white border border-[var(--color-line)] rounded-[10px] p-4 shadow-sm">
                <div className="text-[11px] text-[var(--color-ink-muted)] uppercase tracking-widest font-semibold mb-1.5">Balance neto</div>
                <div className="font-serif text-[28px] leading-none mb-1">{fmtNum(balance)}</div>
                <div className="text-[11.5px] text-[var(--color-ink-muted)]">existencia consolidada</div>
              </div>
            </div>

            {/* Re-upload button helper */}
            <div className="flex justify-end">
              <label className="text-sm font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-red)] cursor-pointer flex items-center gap-1.5 transition-colors">
                <Upload className="w-4 h-4" />
                Cargar archivo nuevo
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFile} disabled={loading} />
              </label>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-[var(--color-line)] gap-1 overflow-x-auto">
              {[
                { id: 'kardex', icon: FileSpreadsheet, label: 'Kardex Detallado' },
                { id: 'gtin', icon: Barcode, label: 'Trazabilidad por GTIN' },
                { id: 'saldos', icon: Package, label: 'Existencias a Fecha' },
                { id: 'movs', icon: Database, label: 'Todos los Movimientos' },
                { id: 'dash', icon: BarChart3, label: 'Visualización' },
                { id: 'porteo', icon: FileSpreadsheet, label: 'Porteo de Datos' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-[13.5px] font-semibold whitespace-nowrap border-b-2 transition-colors",
                    activeTab === t.id 
                      ? "text-[var(--color-red)] border-[var(--color-red)]" 
                      : "text-[var(--color-ink-muted)] border-transparent hover:text-[var(--color-ink-soft)]"
                  )}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="mt-4">
              {activeTab === 'kardex' && <KardexTab movs={movs} uniques={uniques} />}
              {activeTab === 'gtin' && <GtinTab movs={movs} uniques={uniques} />}
              {activeTab === 'saldos' && <SaldosTab movs={movs} uniques={uniques} />}
              {activeTab === 'movs' && <MovsTab movs={movs} uniques={uniques} />}
              {activeTab === 'dash' && <DashTab movs={movs} uniques={uniques} />}
              {activeTab === 'porteo' && <PorteoTab movs={movs} />}
            </div>

          </section>
        )}
      </main>

      {/* Full screen loader */}
      {loading && (
        <div className="fixed inset-0 bg-[var(--color-surface)]/90 backdrop-blur-sm z-[150] flex items-center justify-center">
          <div className="bg-white p-7 rounded-[14px] shadow-2xl border border-[var(--color-line)] min-w-[320px] text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[var(--color-red)]" />
            <div className="font-bold text-gray-900 mb-1">Procesando archivo</div>
            <div className="text-xs text-[var(--color-ink-muted)] mb-3">{loadStatus}</div>
            <div className="w-full bg-[var(--color-line-soft)] rounded-full h-1.5 overflow-hidden">
               <div className="bg-[var(--color-red)] h-full transition-all duration-300" style={{width: `${loadProgress}%`}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Schema Modal */}
      {showSchemaModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[14px] max-w-[640px] w-full max-h-[88vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 py-4 border-b border-[var(--color-line)]">
              <h2 className="font-serif text-[22px] tracking-tight">Esquema esperado del archivo</h2>
              <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => setShowSchemaModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-[13.5px] leading-relaxed text-[var(--color-ink-soft)] space-y-4">
              <p>El archivo debe tener una hoja llamada <span className="font-mono bg-gray-100 px-1 rounded">Kardex</span> con los encabezados en la <strong>fila 5</strong>:</p>
              <ol className="list-decimal pl-5 space-y-1 font-medium columns-2 gap-8 text-[12.5px]">
                <li>Tipo Movimiento</li><li>Motivo Movimiento</li><li>Almacen</li><li>Folio Factura</li>
                <li>Folio Interno</li><li>Folio</li><li>Fecha y hora</li><li>Codigo referencia</li>
                <li>Nombre</li><li>Cantidad</li><li>Codigo UPN</li><li>Codigo GTIN</li>
                <li>Lote</li><li>Serie</li><li>Fecha de caducidad</li><li>Marca</li>
                <li>Proveedor</li><li>Tipo Orden Compra</li><li>Usuario Interno</li><li>Almacen Destino</li>
              </ol>
              <div className="h-px bg-[var(--color-line)] my-4"></div>
              <p className="font-semibold">Reglas de cálculo:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>El saldo se afecta únicamente por la columna <span className="font-mono bg-gray-100 px-1 rounded">Almacen</span>.</li>
                <li>La columna <span className="font-mono bg-gray-100 px-1 rounded">Cantidad</span> ya trae el signo correcto: positivo suma, negativo resta.</li>
                <li>La columna <span className="font-mono bg-gray-100 px-1 rounded">Almacen Destino</span> es informativa y <em>no</em> participa en cálculos de saldo.</li>
              </ul>
            </div>
            <div className="p-4 border-t border-[var(--color-line)] flex justify-end">
              <button 
                onClick={() => setShowSchemaModal(false)}
                className="bg-[var(--color-red)] text-white px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-[var(--color-red-deep)] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
