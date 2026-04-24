import React, { useState, useMemo } from 'react';
import { Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Movimiento, Uniques } from '../types';
import { fromISODate, toISODate, fmtDateTime, fmtDate, fmtNum, cn } from '../lib/utils';
import { Badge, MultiSelect } from './ui';

export function MovsTab({ movs, uniques }: { movs: Movimiento[], uniques: Uniques }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [tipos, setTipos] = useState<string[]>([]);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [almacenes, setAlmacenes] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);

  const [sortCol, setSortCol] = useState<keyof Movimiento>('fechaHora');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const filtered = useMemo(() => {
    const df = fromISODate(dateFrom);
    const dtRaw = fromISODate(dateTo);
    const dt = dtRaw ? new Date(dtRaw.setHours(23, 59, 59, 999)) : null;
    const sq = search.trim().toLowerCase();

    let res = movs.filter(r => {
      if (df && r.fechaHora && r.fechaHora < df) return false;
      if (dt && r.fechaHora && r.fechaHora > dt) return false;
      if (tipos.length && !tipos.includes(r.tipoMov)) return false;
      if (motivos.length && !motivos.includes(r.motivo)) return false;
      if (almacenes.length && !almacenes.includes(r.almacen)) return false;
      if (marcas.length && !marcas.includes(r.marca)) return false;
      if (proveedores.length && !proveedores.includes(r.proveedor)) return false;
      if (sq) {
        const hay = `${r.nombre} ${r.codRef} ${r.upn} ${r.gtin} ${r.lote} ${r.serie} ${r.folio} ${r.folioFactura} ${r.folioInterno}`.toLowerCase();
        if (!hay.includes(sq)) return false;
      }
      return true;
    });

    res.sort((a, b) => {
      let va = a[sortCol];
      let vb = b[sortCol];
      if (va instanceof Date) va = va.getTime() as any;
      if (vb instanceof Date) vb = vb.getTime() as any;
      if (va === null || va === undefined) va = '' as any;
      if (vb === null || vb === undefined) vb = '' as any;
      
      if (typeof va === 'number' && typeof vb === 'number') {
         return sortDir === 'asc' ? va - vb : vb - va;
      }
      
      return sortDir === 'asc' ? String(va).localeCompare(String(vb), 'es') : String(vb).localeCompare(String(va), 'es');
    });

    return res;
  }, [movs, dateFrom, dateTo, tipos, motivos, almacenes, marcas, proveedores, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setSearch('');
    setTipos([]); setMotivos([]); setAlmacenes([]); setMarcas([]); setProveedores([]);
    setPage(1);
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    const data = filtered.map(r => ({
      'Tipo Movimiento': r.tipoMov, 'Motivo': r.motivo, 'Almacén': r.almacen,
      'Fecha y hora': r.fechaHora ? fmtDateTime(r.fechaHora) : '',
      'Cód. Referencia': r.codRef, 'GTIN': r.gtin, 'UPN': r.upn, 'Nombre': r.nombre,
      'Cantidad': r.cantidad, 'Lote': r.lote, 'Serie': r.serie,
      'Caducidad': r.caducidad ? fmtDate(r.caducidad) : '',
      'Marca': r.marca, 'Proveedor': r.proveedor,
      'Folio Factura': r.folioFactura, 'Folio Interno': r.folioInterno, 'Folio': r.folio,
      'Alm. Destino': r.almacenDestino, 'Usuario': r.usuario
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Movimientos');
    XLSX.writeFile(wb, `Movimientos_${toISODate(new Date())}.xlsx`);
  };

  const cols: { key: keyof Movimiento | 'blank', label: string, sortable?: boolean }[] = [
    { key: 'fechaHora', label: 'Fecha y hora', sortable: true },
    { key: 'tipoMov', label: 'Tipo', sortable: true },
    { key: 'motivo', label: 'Motivo', sortable: true },
    { key: 'almacen', label: 'Almacén', sortable: true },
    { key: 'codRef', label: 'Cód. Ref.', sortable: true },
    { key: 'gtin', label: 'GTIN', sortable: true },
    { key: 'upn', label: 'UPN', sortable: true },
    { key: 'nombre', label: 'Producto', sortable: true },
    { key: 'cantidad', label: 'Cantidad', sortable: true },
    { key: 'lote', label: 'Lote' },
    { key: 'serie', label: 'Serie' },
    { key: 'caducidad', label: 'Caducidad', sortable: true },
    { key: 'marca', label: 'Marca', sortable: true },
    { key: 'proveedor', label: 'Proveedor' },
    { key: 'folioFactura', label: 'Folio Factura', sortable: true },
    { key: 'folio', label: 'Folio' },
    { key: 'almacenDestino', label: 'Alm. Destino' },
    { key: 'usuario', label: 'Usuario' }
  ];

  return (
    <div>
      <div className="bg-white border border-[var(--color-line)] rounded-[14px] p-4 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)] font-bold">
            Filtros · <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--color-line-soft)] text-[11px] ml-1">{fmtNum(filtered.length)} registros</span>
          </span>
          <div className="flex items-center gap-2">
            <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border border-transparent hover:bg-[var(--color-red-pale)] text-[var(--color-ink-muted)] hover:text-[var(--color-red)] transition-colors">
              <X className="w-4 h-4" /> Limpiar filtros
            </button>
            <button onClick={handleExport} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <Download className="w-4 h-4" /> Exportar a Excel
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Fecha desde</label>
            <input type="date" className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--color-red)]" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Fecha hasta</label>
            <input type="date" className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--color-red)]" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
          </div>
          <div className="flex flex-col gap-1 z-50">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Tipo movimiento</label>
            <MultiSelect options={uniques.tipos} selected={tipos} onChange={v => { setTipos(v); setPage(1); }} placeholder="Todos los tipos" />
          </div>
          <div className="flex flex-col gap-1 z-40">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Motivo</label>
            <MultiSelect options={uniques.motivos} selected={motivos} onChange={v => { setMotivos(v); setPage(1); }} placeholder="Todos los motivos" />
          </div>
          <div className="flex flex-col gap-1 z-30">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Almacén</label>
            <MultiSelect options={uniques.almacenes} selected={almacenes} onChange={v => { setAlmacenes(v); setPage(1); }} placeholder="Todos los almacenes" />
          </div>
          <div className="flex flex-col gap-1 z-20">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Marca</label>
            <MultiSelect options={uniques.marcas} selected={marcas} onChange={v => { setMarcas(v); setPage(1); }} placeholder="Todas las marcas" />
          </div>
          <div className="flex flex-col gap-1 z-10">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Proveedor</label>
            <MultiSelect options={uniques.proveedores} selected={proveedores} onChange={v => { setProveedores(v); setPage(1); }} placeholder="Todos" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Búsqueda libre</label>
            <input type="text" placeholder="Nombre, UPN, Lote..." className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--color-red)]" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      <div className="bg-white border border-[var(--color-line)] rounded-[14px] overflow-hidden">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {cols.map(c => (
                  <th 
                    key={c.key} 
                    className={cn(
                      "bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap",
                      c.sortable && "cursor-pointer hover:text-[var(--color-ink)] select-none",
                      c.key === 'cantidad' && "text-right"
                    )}
                    onClick={() => {
                      if (!c.sortable) return;
                      if (sortCol === c.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                      else { setSortCol(c.key as keyof Movimiento); setSortDir('desc'); }
                    }}
                  >
                    {c.label}
                    {c.sortable && <span className={cn("ml-1 opacity-40 text-[10px]", sortCol === c.key && "opacity-100 text-[var(--color-red)]")}>{sortCol === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr><td colSpan={cols.length} className="text-center py-12 text-[var(--color-ink-muted)]">No hay movimientos que coincidan con los filtros</td></tr>
              ) : (
                slice.map((r, i) => (
                   <tr key={i} className="hover:bg-[var(--color-red-pale)] border-b border-[var(--color-line-soft)] last:border-0">
                     <td className="px-3 py-2 align-middle">{fmtDateTime(r.fechaHora)}</td>
                     <td className="px-3 py-2 align-middle"><Badge type={r.tipoMov}>{r.tipoMov}</Badge></td>
                     <td className="px-3 py-2 align-middle">{r.motivo || '—'}</td>
                     <td className="px-3 py-2 align-middle font-bold">{r.almacen || '—'}</td>
                     <td className="px-3 py-2 align-middle font-mono text-[12px]">{r.codRef}</td>
                     <td className="px-3 py-2 align-middle font-mono text-[12px]">{r.gtin || '—'}</td>
                     <td className="px-3 py-2 align-middle font-mono text-[12px]">{r.upn || '—'}</td>
                     <td className="px-3 py-2 align-middle">{r.nombre}</td>
                     <td className={cn("px-3 py-2 align-middle text-right tabular-nums", r.cantidad > 0 ? "text-[var(--color-ok)] font-semibold" : r.cantidad < 0 ? "text-[var(--color-err)] font-semibold" : "text-[var(--color-ink-muted)]")}>
                       {r.cantidad > 0 ? '+' : ''}{fmtNum(r.cantidad)}
                     </td>
                     <td className="px-3 py-2 align-middle">{r.lote || '—'}</td>
                     <td className="px-3 py-2 align-middle">{r.serie || '—'}</td>
                     <td className="px-3 py-2 align-middle">{r.caducidad ? fmtDate(r.caducidad) : '—'}</td>
                     <td className="px-3 py-2 align-middle">{r.marca || '—'}</td>
                     <td className="px-3 py-2 align-middle">{r.proveedor || '—'}</td>
                     <td className="px-3 py-2 align-middle font-mono text-[12px]">{r.folioFactura || '—'}</td>
                     <td className="px-3 py-2 align-middle font-mono">{r.folio || '—'}</td>
                     <td className="px-3 py-2 align-middle">{r.almacenDestino && r.almacenDestino !== '-' ? r.almacenDestino : '—'}</td>
                     <td className="px-3 py-2 align-middle">{r.usuario || '—'}</td>
                   </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-line)] text-[12.5px]">
          <span className="text-[var(--color-ink-muted)]">Mostrando {fmtNum(slice.length)} de {fmtNum(filtered.length)} · Página {safePage} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <select className="bg-white border border-[var(--color-line)] rounded-md px-2 py-1 text-[12px] outline-none" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
            </select>
            <button className="min-w-[32px] px-2 py-1 bg-white border border-[var(--color-line)] rounded-md disabled:opacity-40 hover:not:disabled:border-[var(--color-red)] hover:not:disabled:text-[var(--color-red)]" disabled={safePage === 1} onClick={() => setPage(1)}>«</button>
            <button className="min-w-[32px] px-2 py-1 bg-white border border-[var(--color-line)] rounded-md disabled:opacity-40 hover:not:disabled:border-[var(--color-red)] hover:not:disabled:text-[var(--color-red)]" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            <span className="min-w-[32px] px-2 py-1 bg-[var(--color-red)] text-white border border-[var(--color-red)] rounded-md text-center">{safePage}</span>
            <button className="min-w-[32px] px-2 py-1 bg-white border border-[var(--color-line)] rounded-md disabled:opacity-40 hover:not:disabled:border-[var(--color-red)] hover:not:disabled:text-[var(--color-red)]" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            <button className="min-w-[32px] px-2 py-1 bg-white border border-[var(--color-line)] rounded-md disabled:opacity-40 hover:not:disabled:border-[var(--color-red)] hover:not:disabled:text-[var(--color-red)]" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        </div>
      </div>
    </div>
  );
}
