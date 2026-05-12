export type Movimiento = {
  id: string;

  tipoMov: string;
  motivo: string;
  almacen: string;

  fechaHora: Date | null;

  codRef: string;
  gtin: string;
  upn: string;
  nombre: string;

  cantidad: number;

  lote: string;
  serie: string;
  caducidad: Date | null;

  marca: string;
  proveedor: string;

  folioFactura: string;
  folioInterno: string;
  folio: string;

  almacenDestino: string;
  usuario: string;
};

export type ProductoUnique = {
  codRef: string;
  nombre: string;
  gtin: string;
  upn: string;
};

export type GtinUnique = {
  gtin: string;
  nombre: string;
  codRef: string;
};

export type Uniques = {
  almacenes: string[];
  tipos: string[];
  motivos: string[];
  marcas: string[];
  proveedores: string[];
  productos: ProductoUnique[];
  gtins: GtinUnique[];
};