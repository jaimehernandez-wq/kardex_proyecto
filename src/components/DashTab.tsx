import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Movimiento, Uniques } from '../types';
import { X } from 'lucide-react';
import Select from 'react-select';
import { fmtNum } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

function MultiSelect({ options, selected, onChange, placeholder }: any) {
  return (
    <Select
      isMulti
      closeMenuOnSelect={false}
      options={options.map((o: string) => ({ value: o, label: o }))}
      value={selected.map((s: string) => ({ value: s, label: s }))}
      onChange={(v) => onChange(v.map((x: any) => x.value))}
      placeholder={placeholder}
      styles={{
        control: (b) => ({ ...b, minHeight: '38px', borderRadius: '8px', fontSize: '13px', borderColor: 'var(--color-line)', backgroundColor: 'var(--color-surface)' }),
        menu: (b) => ({ ...b, fontSize: '13px', zIndex: 999 }),
        multiValue: (b) => ({ ...b, backgroundColor: 'var(--color-line-soft)', borderRadius: '4px' })
      }}
    />
  );
}

export function DashTab({ movs, uniques }: { movs: Movimiento[], uniques: Uniques }) {
  // Filters State
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tipos, setTipos] = useState<string[]>([]);
  const [motivos, setMotivos] = useState<string[]>([]);
  const [almacenes, setAlmacenes] = useState<string[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setTipos([]); setMotivos([]);
    setAlmacenes([]); setMarcas([]); setProveedores([]); setSearch('');
  };

  const filteredMovs = useMemo(() => {
    let res = movs;
    if (dateFrom) {
      const d = new Date(dateFrom + 'T00:00:00');
      res = res.filter(r => r.fechaHora && r.fechaHora >= d);
    }
    if (dateTo) {
      const d = new Date(dateTo + 'T23:59:59');
      res = res.filter(r => r.fechaHora && r.fechaHora <= d);
    }
    if (tipos.length) res = res.filter(r => tipos.includes(r.tipoMov));
    if (motivos.length) res = res.filter(r => motivos.includes(r.motivo));
    if (almacenes.length) res = res.filter(r => almacenes.includes(r.almacen));
    if (marcas.length) res = res.filter(r => marcas.includes(r.marca));
    if (proveedores.length) res = res.filter(r => proveedores.includes(r.proveedor));
    
    const sq = search.trim().toLowerCase();
    if (sq) {
      res = res.filter(r => `${r.nombre} ${r.lote} ${r.codRef} ${r.folioFactura} ${r.upn} ${r.gtin}`.toLowerCase().includes(sq));
    }
    return res;
  }, [movs, dateFrom, dateTo, tipos, motivos, almacenes, marcas, proveedores, search]);

  const { monthlyData, tiposData, topProdData } = useMemo(() => {
    // 1. Monthly
    const monthMap = new Map<string, { ent: number, sal: number }>();
    // 2. Tipos
    const tipoMap = new Map<string, number>();
    // 3. Top Prod
    const prodMap = new Map<string, { nombre: string, total: number }>();

    filteredMovs.forEach(r => {
      // Monthly
      if (r.fechaHora) {
        const k = `${r.fechaHora.getFullYear()}-${String(r.fechaHora.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap.has(k)) monthMap.set(k, { ent: 0, sal: 0 });
        const m = monthMap.get(k)!;
        if (r.cantidad > 0) m.ent += r.cantidad;
        if (r.cantidad < 0) m.sal += Math.abs(r.cantidad);
      }
      
      // Tipos
      const tk = r.tipoMov || 'Otro';
      tipoMap.set(tk, (tipoMap.get(tk) || 0) + 1);

      // Top
      if (r.codRef) {
        const qty = Math.abs(r.cantidad || 0);
        const p = prodMap.get(r.codRef);
        if (!p) prodMap.set(r.codRef, { nombre: r.nombre, total: qty });
        else p.total += qty;
      }
    });

    const months = Array.from(monthMap.keys()).sort();
    const entData = months.map(k => monthMap.get(k)!.ent);
    const salData = months.map(k => monthMap.get(k)!.sal);

    const tiposLabels = Array.from(tipoMap.keys());
    const tiposVals = Array.from(tipoMap.values());

    const top = Array.from(prodMap.entries()).sort((a, b) => b[1].total - a[1].total).slice(0, 15);

    return {
      monthlyData: {
        labels: months,
        datasets: [
          { label: 'Entradas', data: entData, backgroundColor: '#0F7A3E' },
          { label: 'Salidas', data: salData, backgroundColor: '#C41E3A' }
        ]
      },
      tiposData: {
        labels: tiposLabels,
        datasets: [{ data: tiposVals, backgroundColor: ['#C41E3A', '#0F7A3E', '#1D4ED8', '#B45309', '#64646A', '#8B0E26'] }]
      },
      topProdData: {
        labels: top.map(([k, v]) => `${k.slice(0, 14)}${k.length > 14 ? '…' : ''} — ${(v.nombre || '').slice(0, 20)}`),
        datasets: [{ label: 'Unidades movidas', data: top.map(x => x[1].total), backgroundColor: '#C41E3A' }]
      }
    };
  }, [filteredMovs]);

  const defaultDatalabels = {
    color: '#fff',
    font: { weight: 'bold', size: 10 },
    formatter: (val: number) => val > 0 ? fmtNum(val) : '',
  };

  return (
    <div>
      {/* Filters (Mirrored from MovsTab) */}
      <div className="bg-white border border-[var(--color-line)] rounded-[14px] p-4 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)] font-bold">
            Filtros del Tablero · <span className="inline-block px-2 py-0.5 rounded-full bg-[var(--color-line-soft)] text-[11px] ml-1">{fmtNum(filteredMovs.length)} registros</span>
          </span>
          <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border border-transparent hover:bg-[var(--color-red-pale)] text-[var(--color-ink-muted)] hover:text-[var(--color-red)] transition-colors">
            <X className="w-4 h-4" /> Limpiar filtros
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Fecha desde</label>
            <input type="date" className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--color-red)]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Fecha hasta</label>
            <input type="date" className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--color-red)]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1 z-50">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Tipo movimiento</label>
            <MultiSelect options={uniques.tipos} selected={tipos} onChange={setTipos} placeholder="Todos los tipos" />
          </div>
          <div className="flex flex-col gap-1 z-40">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Motivo</label>
            <MultiSelect options={uniques.motivos} selected={motivos} onChange={setMotivos} placeholder="Todos los motivos" />
          </div>
          <div className="flex flex-col gap-1 z-30">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Almacén</label>
            <MultiSelect options={uniques.almacenes} selected={almacenes} onChange={setAlmacenes} placeholder="Todos los almacenes" />
          </div>
          <div className="flex flex-col gap-1 z-20">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Marca</label>
            <MultiSelect options={uniques.marcas} selected={marcas} onChange={setMarcas} placeholder="Todas las marcas" />
          </div>
          <div className="flex flex-col gap-1 z-10">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Proveedor</label>
            <MultiSelect options={uniques.proveedores} selected={proveedores} onChange={setProveedores} placeholder="Todos" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Búsqueda libre</label>
            <input type="text" placeholder="Nombre, UPN, Folio..." className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--color-red)]" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[var(--color-line)] rounded-[14px] p-5">
          <h3 className="font-serif text-[18px] mb-3">Movimientos por mes</h3>
          <div className="relative h-[280px]">
            <Bar 
              data={monthlyData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { position: 'bottom' },
                  datalabels: { ...defaultDatalabels as any, anchor: 'center', align: 'center' }
                },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>
        <div className="bg-white border border-[var(--color-line)] rounded-[14px] p-5">
          <h3 className="font-serif text-[18px] mb-3">Distribución por tipo</h3>
          <div className="relative h-[280px]">
            <Doughnut 
              data={tiposData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { position: 'bottom' },
                  datalabels: { ...defaultDatalabels as any, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4 }
                }
              }}
            />
          </div>
        </div>
        <div className="bg-white border border-[var(--color-line)] rounded-[14px] p-5 lg:col-span-2">
          <h3 className="font-serif text-[18px] mb-3">Top 15 productos con mayor movimiento</h3>
          <div className="relative h-[420px]">
            <Bar 
              data={topProdData} 
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { display: false },
                  datalabels: { ...defaultDatalabels as any, anchor: 'end', align: 'start', color: '#fff', padding: 4 }
                },
                scales: { x: { beginAtZero: true } }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
