import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseNumber(v: any): number {
  if (v === null || v === undefined || v === '' || v === '-') return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function parseDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (m) {
    const [, d, mo, y, h = '0', mi = '0', se = '0'] = m;
    return new Date(+y, +mo - 1, +d, +h, +mi, +se);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return '—';
  return `${fmtDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export function fmtNum(n: number | null | undefined, dec = 0): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function toISODate(d: Date | null | undefined): string {
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromISODate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const COL_MAP: Record<string, string> = {
  'Tipo Movimiento': 'tipoMov', 'Tipo de Movimiento': 'tipoMov',
  'Motivo Movimiento': 'motivo', 'Motivo de Movimiento': 'motivo',
  'Almacen': 'almacen', 'Almacén': 'almacen',
  'Folio Factura': 'folioFactura',
  'Folio Interno': 'folioInterno',
  'Folio': 'folio',
  'Fecha y hora': 'fechaHora', 'Fecha': 'fechaHora',
  'Codigo referencia': 'codRef', 'Código referencia': 'codRef',
  'Nombre': 'nombre',
  'Cantidad': 'cantidad',
  'Codigo UPN': 'upn', 'Código UPN': 'upn',
  'Codigo GTIN': 'gtin', 'Código GTIN': 'gtin',
  'Lote': 'lote',
  'Serie': 'serie',
  'Fecha de caducidad': 'caducidad',
  'Marca': 'marca',
  'Proveedor': 'proveedor',
  'Tipo Orden Compra': 'tipoOC',
  'Usuario Interno': 'usuario',
  'Almacen Destino': 'almacenDestino', 'Almacén Destino': 'almacenDestino'
};
