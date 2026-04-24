import React, { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Movimiento, Uniques } from '../types';
import { fromISODate, toISODate, fmtDate, fmtNum, cn } from '../lib/utils';
import { MultiSelect } from './ui';

export function SaldosTab({ movs, uniques }: { movs: Movimiento[], uniques: Uniques }) {
  const [fecha, setFecha] = useState(toISODate(new Date()));
  const [almacenes, setAlmacenes] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState('nonzero');

  const rows = useMemo(() => {
    const d = fromISODate(fecha);
    if (!d) return [];
    d.setHours(23, 59, 59, 999);

    const map = new Map<string, any>();
    
    movs.forEach(r => {
      if (!r.almacen || r.almacen === '-') return;
      if (r.fechaHora && r.fechaHora > d) return;
      
      const key = `${r.codRef}||${r.almacen}`;
      if (!map.has(key)) {
        map.set(key, {
          codRef: r.codRef,
          nombre: r.nombre,
          almacen: r.almacen,
          marca: r.marca,
          upn: r.upn,
          gtin: r.gtin,
          saldo: 0,
          entradas: 0,
          salidas: 0,
          ultMov: null
        });
      }
      
      const e = map.get(key);
      e.saldo += r.cantidad || 0;
      if (r.cantidad > 0) e.entradas += r.cantidad;
      if (r.cantidad < 0) e.salidas += Math.abs(r.cantidad);
      if (!e.ultMov || (r.fechaHora && r.fechaHora > e.ultMov)) e.ultMov = r.fechaHora;
    });

    let res = Array.from(map.values());
    
    if (almacenes.length) res = res.filter(r => almacenes.includes(r.almacen));
    if (marcas.length) res = res.filter(r => marcas.includes(r.marca));
    
    const sq = search.trim().toLowerCase();
    if (sq) {
      res = res.filter(r => `${r.nombre} ${r.codRef} ${r.upn} ${r.gtin}`.toLowerCase().includes(sq));
    }
    
    if (show === 'nonzero') res = res.filter(r => r.saldo !== 0);
    else if (show === 'negative') res = res.filter(r => r.saldo < 0);

    res.sort((a, b) => a.codRef.localeCompare(b.codRef, 'es') || a.almacen.localeCompare(b.almacen, 'es'));
    return res;
  }, [movs, fecha, almacenes, marcas, search, show]);

  const totalUnidades = rows.reduce((s, r) => s + r.saldo, 0);
  const skuCount = new Set(rows.map(r => r.codRef)).size;

  const handleExport = () => {
    if (rows.length === 0) return;
    const data = rows.map(r => ({
      'Cód. Ref.': r.codRef, 'Nombre': r.nombre, 'Almacén': r.almacen,
      'Marca': r.marca, 'UPN': r.upn, 'GTIN': r.gtin,
      'Total Entradas': r.entradas, 'Total Salidas': r.salidas, 'Saldo': r.saldo,
      'Último mov.': r.ultMov ? fmtDate(r.ultMov) : ''
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Existencias');
    XLSX.writeFile(wb, `Existencias_${fecha}.xlsx`);
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-white border border-[var(--color-line)] rounded-[14px] p-4 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)] font-bold">Existencias a Fecha de Corte</span>
          <button 
            onClick={handleExport}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar Saldos a Excel
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Fecha de corte *</label>
            <input type="date" className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2.5 py-2 pl-2 text-[13px] outline-none focus:border-[var(--color-red)]" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1 z-20">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Almacén</label>
            <MultiSelect options={uniques.almacenes} selected={almacenes} onChange={setAlmacenes} placeholder="Todos los almacenes" />
          </div>
          <div className="flex flex-col gap-1 z-10">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Marca</label>
            <MultiSelect options={uniques.marcas} selected={marcas} onChange={setMarcas} placeholder="Todas las marcas" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Buscar producto</label>
            <input type="text" placeholder="Nombre, UPN, GTIN, Ref..." className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--color-red)]" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Mostrar</label>
            <select className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-red)]" value={show} onChange={e => setShow(e.target.value)}>
               <option value="nonzero">Solo con existencia</option>
               <option value="all">Todos</option>
               <option value="negative">Solo negativos</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-3.5 mb-3">
        <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--color-line-soft)] text-[11px] text-[var(--color-ink-muted)] font-semibold">{fmtNum(rows.length)} líneas</span>
        <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--color-line-soft)] text-[11px] text-[var(--color-ink-muted)] font-semibold">{fmtNum(skuCount)} SKUs</span>
        <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--color-line-soft)] text-[11px] text-[var(--color-ink-muted)] font-semibold">Balance total: <strong>{fmtNum(totalUnidades)}</strong> unidades</span>
      </div>

      <div className="bg-white border border-[var(--color-line)] rounded-[14px] overflow-hidden">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Código UPN</th>
                <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Código GTIN</th>
                <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Cód. Ref.</th>
                <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Producto</th>
                <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Almacén</th>
                <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Marca</th>
                <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-right px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Entradas</th>
                <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-right px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Salidas</th>
                <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-right px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Saldo</th>
                <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Último mov.</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                 <tr><td colSpan={10} className="text-center py-12 text-[var(--color-ink-muted)]">No hay existencias que mostrar</td></tr>
              ) : (
                 rows.map((r, i) => (
                   <tr key={i} className="hover:bg-[var(--color-red-pale)] border-b border-[var(--color-line-soft)] last:border-0">
                     <td className="px-3 py-2 align-middle font-mono text-[12px]">{r.upn || '—'}</td>
                     <td className="px-3 py-2 align-middle font-mono text-[12px]">{r.gtin || '—'}</td>
                     <td className="px-3 py-2 align-middle font-mono text-[12px]">{r.codRef}</td>
                     <td className="px-3 py-2 align-middle">{r.nombre || '—'}</td>
                     <td className="px-3 py-2 align-middle font-bold">{r.almacen}</td>
                     <td className="px-3 py-2 align-middle">{r.marca || '—'}</td>
                     <td className="px-3 py-2 align-middle text-right tabular-nums text-[var(--color-ok)] font-semibold">+{fmtNum(r.entradas)}</td>
                     <td className="px-3 py-2 align-middle text-right tabular-nums text-[var(--color-err)] font-semibold">−{fmtNum(r.salidas)}</td>
                     <td className={cn("px-3 py-2 align-middle text-right tabular-nums font-bold", r.saldo > 0 ? "text-[var(--color-ok)]" : r.saldo < 0 ? "text-[var(--color-err)]" : "text-[var(--color-ink-muted)]")}>{fmtNum(r.saldo)}</td>
                     <td className="px-3 py-2 align-middle whitespace-nowrap">{r.ultMov ? fmtDate(r.ultMov) : '—'}</td>
                   </tr>
                 ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
