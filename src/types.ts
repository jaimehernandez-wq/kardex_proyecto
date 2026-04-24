export interface Movimiento {
  tipoMov: string;
  motivo: string;
  almacen: string;
  folioFactura: string;
  folioInterno: string;
  folio: string;
  fechaHora: Date | null;
  codRef: string;
  nombre: string;
  cantidad: number;
  upn: string;
  gtin: string;
  lote: string;
  serie: string;
  caducidad: Date | null;
  marca: string;
  proveedor: string;
  tipoOC: string;
  usuario: string;
  almacenDestino: string;
}

export interface Uniques {
  almacenes: string[];
  tipos: string[];
  motivos: string[];
  marcas: string[];
  proveedores: string[];
  productos: { codRef: string; nombre: string; gtin: string; upn: string }[];
  gtins: { gtin: string; nombre: string; codRef: string }[];
}
