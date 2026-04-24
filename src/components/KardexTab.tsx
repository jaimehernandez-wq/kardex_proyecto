import React, { useState, useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import Select from 'react-select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Movimiento, Uniques } from '../types';
import { fmtDate, fmtDateTime, fmtNum, toISODate, fromISODate } from '../lib/utils';
import { Badge } from './ui';

export function KardexTab({ movs, uniques }: { movs: Movimiento[], uniques: Uniques }) {
  const [codRef, setCodRef] = useState<string>('');
  const [almacen, setAlmacen] = useState<string>('__ALL__');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loteFilter, setLoteFilter] = useState('');

  const { visibles, prodInfo, saldoInicial, saldoFinal, totalEnt, totalSal } = useMemo(() => {
    if (!codRef) return { visibles: [], prodInfo: null, saldoInicial: 0, saldoFinal: 0, totalEnt: 0, totalSal: 0 };
    
    const df = fromISODate(dateFrom);
    const dtRaw = fromISODate(dateTo);
    const dt = dtRaw ? new Date(dtRaw.setHours(23, 59, 59, 999)) : null;
    const loteQ = loteFilter.trim().toLowerCase();

    const allProd = movs.filter(r => r.codRef === codRef).sort((a, b) => (a.fechaHora?.getTime() || 0) - (b.fechaHora?.getTime() || 0));
    
    if (!allProd.length) return { visibles: [], prodInfo: null, saldoInicial: 0, saldoFinal: 0, totalEnt: 0, totalSal: 0 };

    const saldoPorAlmacen: Record<string, number> = {};
    let saldoConsol = 0;
    
    const assentamientos = allProd.map(r => {
      const qty = r.cantidad || 0;
      const almValido = !!r.almacen && r.almacen !== '-';
      if (almValido) {
        saldoPorAlmacen[r.almacen] = (saldoPorAlmacen[r.almacen] || 0) + qty;
        saldoConsol += qty;
      }
      return {
        ...r,
        almValido,
        entrada: almValido && qty > 0 ? qty : 0,
        salida: almValido && qty < 0 ? Math.abs(qty) : 0,
        saldoAlm: almValido ? saldoPorAlmacen[r.almacen] : null,
        saldoConsol: almValido ? saldoConsol : null
      };
    });

    const vis = assentamientos.filter(a => {
      if (almacen !== '__ALL__' && a.almacen !== almacen) return false;
      if (df && a.fechaHora && a.fechaHora < df) return false;
      if (dt && a.fechaHora && a.fechaHora > dt) return false;
      if (loteQ && !`${a.lote} ${a.serie}`.toLowerCase().includes(loteQ)) return false;
      return true;
    });

    let sInit = 0, sFin = 0;
    if (almacen === '__ALL__') {
      if (df) {
        const prev = assentamientos.filter(a => !a.fechaHora || a.fechaHora < df);
        sInit = prev.length ? prev[prev.length - 1].saldoConsol || 0 : 0;
      }
      if (dt) {
        const upTo = assentamientos.filter(a => !a.fechaHora || a.fechaHora <= dt);
        sFin = upTo.length ? upTo[upTo.length - 1].saldoConsol || 0 : 0;
      } else {
        sFin = saldoConsol;
      }
    } else {
      const mine = assentamientos.filter(a => a.almacen === almacen);
      if (df) {
        const prev = mine.filter(a => !a.fechaHora || a.fechaHora < df);
        sInit = prev.length ? prev[prev.length - 1].saldoAlm || 0 : 0;
      }
      if (dt) {
        const upTo = mine.filter(a => !a.fechaHora || a.fechaHora <= dt);
        sFin = upTo.length ? upTo[upTo.length - 1].saldoAlm || 0 : 0;
      } else {
        sFin = saldoPorAlmacen[almacen] !== undefined ? saldoPorAlmacen[almacen] : 0;
      }
    }

    const tEnt = vis.reduce((s, a) => s + a.entrada, 0);
    const tSal = vis.reduce((s, a) => s + a.salida, 0);

    return { visibles: vis, prodInfo: allProd[0], saldoInicial: sInit, saldoFinal: sFin, totalEnt: tEnt, totalSal: tSal };

  }, [movs, codRef, almacen, dateFrom, dateTo, loteFilter]);

  const handleExportExcel = () => {
    if (!codRef || visibles.length === 0) return;
    const data = visibles.map(v => ({
      'Fecha y hora': fmtDateTime(v.fechaHora),
      'Tipo': v.tipoMov, 'Motivo': v.motivo, 'Almacén': v.almacen,
      'Lote': v.lote, 'Serie': v.serie,
      'Caducidad': fmtDate(v.caducidad),
      'Entrada': v.almValido && v.cantidad > 0 ? v.cantidad : '',
      'Salida': v.almValido && v.cantidad < 0 ? Math.abs(v.cantidad) : '',
      'Saldo': v.almValido ? (almacen === '__ALL__' ? v.saldoConsol : v.saldoAlm) : '',
      'Folio': v.folio,
      'Código GTIN': v.gtin,
      'Código UPN': v.upn,
      'Proveedor': v.proveedor,
      'Usuario': v.usuario,
      'Alm. Destino': v.almacenDestino,
      'Impacta saldo': v.almValido ? 'Sí' : 'No'
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Kardex');
    XLSX.writeFile(wb, `Kardex_${codRef}_${toISODate(new Date())}.xlsx`);
  };

    const handleExportPDF = () => {
    if (!codRef || visibles.length === 0) return;
    
    const doc = new jsPDF('landscape');
    
    // Header Data
    doc.setFontSize(16);
    doc.setTextColor(196, 30, 58);
    doc.text('Kardex Control Pro', 14, 18);
    
    doc.setFontSize(10);
    doc.setTextColor(14, 14, 14);
    doc.text('CORVASC DEVICES · S.A. DE C.V.', 14, 24);
    doc.text('Tarjeta de Kardex Detallado', 14, 30);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 106);
    doc.text(`Producto: ${prodInfo?.nombre || ''}`, 14, 38);
    doc.text(`Código Ref: ${codRef}  |  GTIN: ${prodInfo?.gtin || ''}  |  UPN: ${prodInfo?.upn || ''}`, 14, 43);
    doc.text(`Almacén: ${almacen === '__ALL__' ? 'Consolidado' : almacen}`, 14, 48);
    if (dateFrom || dateTo) {
      doc.text(`Periodo: ${dateFrom ? fmtDate(fromISODate(dateFrom)) : 'Inicio'} - ${dateTo ? fmtDate(fromISODate(dateTo)) : 'Actual'}`, 14, 53);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(14, 14, 14);
    doc.text(`Saldo Inicial: ${fmtNum(saldoInicial)}`, 220, 38);
    doc.text(`Entradas Totales: +${fmtNum(totalEnt)}`, 220, 43);
    doc.text(`Salidas Totales: -${fmtNum(totalSal)}`, 220, 48);
    doc.setFont('helvetica', 'bold');
    doc.text(`Saldo Final: ${fmtNum(saldoFinal)}`, 220, 53);
    doc.setFont('helvetica', 'normal');

    // Table
    const tableData = visibles.map(v => [
      fmtDateTime(v.fechaHora),
      v.tipoMov,
      v.almacen,
      v.gtin || '-',
      v.marca || '-',
      v.tipoOC || '-',
      v.folioFactura || '-',
      `${v.lote || '-'}\n${v.serie || '-'}`,
      v.caducidad ? fmtDate(v.caducidad) : '-',
      v.usuario || '-',
      v.almValido && v.cantidad > 0 ? `+${fmtNum(v.cantidad)}` : '',
      v.almValido && v.cantidad < 0 ? `-${fmtNum(Math.abs(v.cantidad))}` : '',
      v.almValido ? fmtNum(almacen === '__ALL__' ? v.saldoConsol : v.saldoAlm) : '-'
    ]);

    autoTable(doc, {
      startY: 58,
      head: [['F/H', 'Tipo', 'Almacén', 'GTIN', 'Marca', 'OC', 'Factura', 'Lote/Serie', 'Caduc.', 'Usuario', 'Ent.', 'Sal.', 'Saldo']],
      body: tableData as any,
      theme: 'grid',
      styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [196, 30, 58], textColor: 255, fontSize: 7, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 20 },
        10: { halign: 'right', textColor: [15, 122, 62] }, // Entrada
        11: { halign: 'right', textColor: [196, 30, 58] }, // Salida
        12: { halign: 'right', fontStyle: 'bold' } // Saldo
      },
      didDrawPage: function (data) {
        // Footer: Timestamp and Page Num
        const str = `Página ${data.pageNumber}`;
        const timeStamp = `Generado el: ${fmtDateTime(new Date())}`;
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(timeStamp, data.settings.margin.left, pageHeight - 8);
        doc.text(str, pageSize.width - data.settings.margin.right - 10, pageHeight - 8);
      }
    });

    doc.save(`Kardex_${codRef}_${toISODate(new Date())}.pdf`);
  };

  const productOptions = uniques.productos.map(p => ({
    value: p.codRef,
    label: `${p.codRef} · ${p.nombre} ${p.gtin ? `(GTIN: ${p.gtin})` : ''}`
  }));

  return (
    <div>
      <div className="bg-white border border-[var(--color-line)] rounded-[14px] p-4 mb-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)] font-bold">Selección de Kardex</span>
          <div className="flex gap-2">
            <button 
              onClick={handleExportPDF}
              disabled={!codRef || visibles.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border border-transparent bg-[var(--color-red-pale)] text-[var(--color-red)] hover:bg-[#FCE3E7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-4 h-4" /> Generar PDF
            </button>
            <button 
              onClick={handleExportExcel}
              disabled={!codRef || visibles.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold border border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" /> Exportar a Excel
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Producto *</label>
            <Select 
              options={productOptions}
              value={productOptions.find(o => o.value === codRef) || null}
              onChange={(val) => setCodRef(val?.value || '')}
              placeholder="Buscar producto..."
              isClearable
              styles={{
                control: (base) => ({ ...base, fontSize: '13px', borderColor: 'var(--color-line)', borderRadius: '8px', minHeight: '38px', backgroundColor: 'var(--color-surface)' }),
                menu: (base) => ({ ...base, fontSize: '13px' })
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Almacén</label>
            <select className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2.5 h-[38px] text-[13px] outline-none focus:border-[var(--color-red)]" value={almacen} onChange={e => setAlmacen(e.target.value)}>
              <option value="__ALL__">Todos los almacenes</option>
              {uniques.almacenes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex gap-2 lg:col-span-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Desde</label>
              <input type="date" className="w-full bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2 h-[38px] text-[13px] outline-none focus:border-[var(--color-red)]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Hasta</label>
              <input type="date" className="w-full bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2 h-[38px] text-[13px] outline-none focus:border-[var(--color-red)]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] text-[var(--color-ink-muted)] font-semibold uppercase tracking-wider">Lote/Serie</label>
              <input type="text" placeholder="Filtrar..." className="w-full bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg px-2 h-[38px] text-[13px] outline-none focus:border-[var(--color-red)]" value={loteFilter} onChange={e => setLoteFilter(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {!codRef ? (
        <div className="text-center py-12 px-5 text-[var(--color-ink-muted)]">
          <div className="text-5xl opacity-30 mb-2">🎯</div>
          Selecciona un producto para ver su kardex detallado
        </div>
      ) : (
        <React.Fragment>
          {/* Header Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4 p-4 bg-[var(--color-red-pale)] rounded-[14px] border border-[#F5D4D9]">
            <div className="flex flex-col gap-0.5 col-span-2 md:col-span-4 lg:col-span-2">
              <span className="text-[10.5px] text-[var(--color-red-deep)] uppercase tracking-wider font-bold">Producto</span>
              <span className="text-sm font-semibold text-[var(--color-ink)] truncate" title={prodInfo?.nombre}>{prodInfo?.nombre || '—'}</span>
              <span className="font-mono text-[11px] text-[var(--color-ink-muted)] mt-0.5">Ref: {codRef} {prodInfo?.gtin && ` | GTIN: ${prodInfo.gtin}`}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] text-[var(--color-red-deep)] uppercase tracking-wider font-bold">Almacén</span>
              <span className="text-sm font-semibold text-[var(--color-ink)] truncate" title={almacen === '__ALL__' ? 'Consolidado' : almacen}>{almacen === '__ALL__' ? 'Consolidado' : almacen}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] text-[var(--color-red-deep)] uppercase tracking-wider font-bold">Saldo inicial</span>
              <span className="font-serif text-2xl font-normal leading-none">{fmtNum(saldoInicial)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] text-[var(--color-red-deep)] uppercase tracking-wider font-bold">Variación</span>
              <span className="text-xs mt-1">
                <span className="text-[var(--color-ok)] font-bold">+{fmtNum(totalEnt)}</span> / <span className="text-[var(--color-err)] font-bold">-{fmtNum(totalSal)}</span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] text-[var(--color-red-deep)] uppercase tracking-wider font-bold">Saldo final</span>
              <span className="font-serif text-2xl font-normal leading-none text-[var(--color-red-deep)]">{fmtNum(saldoFinal)}</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[var(--color-line)] rounded-[14px] overflow-hidden">
            <div className="max-h-[640px] overflow-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Fecha y hora</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Tipo</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Motivo</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Almacén</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">GTIN</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Marca</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Tipo OC</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Factura</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Lote / Serie</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Caducidad</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-left px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Usuario</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-right px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Entrada</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-right px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Salida</th>
                    <th className="bg-[var(--color-surface)] sticky top-0 z-10 text-right px-3 py-2.5 font-bold text-[11.5px] uppercase tracking-wider text-[var(--color-ink-muted)] border-b border-[var(--color-line)] whitespace-nowrap">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.length === 0 ? (
                    <tr><td colSpan={14} className="text-center py-12 text-[var(--color-ink-muted)]">Sin movimientos en el rango seleccionado</td></tr>
                  ) : (
                    visibles.map((v, i) => {
                      const saldo = almacen === '__ALL__' ? v.saldoConsol : v.saldoAlm;
                      return (
                        <tr key={i} className="hover:bg-[var(--color-red-pale)] border-b border-[var(--color-line-soft)] last:border-0">
                          <td className="px-3 py-2 align-middle whitespace-nowrap text-[12px]">{fmtDateTime(v.fechaHora)}</td>
                          <td className="px-3 py-2 align-middle"><Badge type={v.tipoMov}>{v.tipoMov}</Badge></td>
                          <td className="px-3 py-2 align-middle text-[12px]">{v.motivo || '—'}</td>
                          <td className="px-3 py-2 align-middle text-[12px]">
                            {v.almValido ? <strong>{v.almacen}</strong> : <span className="text-[var(--color-ink-muted)]">{v.almacen || '—'} <em className="text-[10px]">(sin impacto)</em></span>}
                          </td>
                          <td className="px-3 py-2 align-middle font-mono text-[11px]">{v.gtin || '—'}</td>
                          <td className="px-3 py-2 align-middle text-[12px] whitespace-nowrap max-w-[100px] truncate" title={v.marca}>{v.marca || '—'}</td>
                          <td className="px-3 py-2 align-middle text-[12px] whitespace-nowrap">{v.tipoOC || '—'}</td>
                          <td className="px-3 py-2 align-middle font-mono text-[11px]">{v.folioFactura || '—'}</td>
                          <td className="px-3 py-2 align-middle font-mono text-[11px] whitespace-nowrap">
                            {v.lote || '—'}<br/>
                            <span className="text-[var(--color-ink-muted)]">{v.serie || '—'}</span>
                          </td>
                          <td className="px-3 py-2 align-middle text-[12px] whitespace-nowrap">{v.caducidad ? fmtDate(v.caducidad) : '—'}</td>
                          <td className="px-3 py-2 align-middle text-[12px] max-w-[120px] truncate" title={v.usuario}>{v.usuario || '—'}</td>
                          <td className="px-3 py-2 align-middle text-right tabular-nums text-[var(--color-ok)] font-semibold text-[12px]">{v.entrada ? `+${fmtNum(v.entrada)}` : ''}</td>
                          <td className="px-3 py-2 align-middle text-right tabular-nums text-[var(--color-err)] font-semibold text-[12px]">{v.salida ? `−${fmtNum(v.salida)}` : ''}</td>
                          <td className="px-3 py-2 align-middle text-right tabular-nums text-[12px]">{saldo === null ? <span className="text-[var(--color-ink-muted)]">—</span> : <strong className={saldo < 0 ? 'text-[var(--color-err)]' : ''}>{fmtNum(saldo)}</strong>}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {visibles.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-line)] text-[12.5px] text-[var(--color-ink-muted)]">
                <span>{fmtNum(visibles.length)} movimientos en el rango</span>
              </div>
            )}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
