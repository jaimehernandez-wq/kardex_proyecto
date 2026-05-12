import { useEffect, useState, useRef, useCallback } from 'react';
import {
  collectionGroup,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';

import { db } from '../firebase/config';
import { Movimiento } from '../types';

const PAGE_SIZE = 1000;

type Filters = {
  almacen?: string;
  tipo?: string;
};

// ========================================
// SAFE NUMBER
// ========================================
function safeNumber(value: any): number {

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {

    const clean = value
      .replace(/,/g, '')
      .replace(/\s/g, '');

    const parsed = parseFloat(clean);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

// ========================================
// MAP DOC
// ========================================
function mapDoc(
  doc: QueryDocumentSnapshot<DocumentData>
): Movimiento {
  const d = doc.data();
  const cantidad = safeNumber(d.cantidad);
  const cantidadFinal =
    Math.abs(cantidad) > 100000
    ? 0
    : cantidad;
  

  return {
    id: doc.id,

    tipoMov: d.tipoMovimiento || '',
    motivo: d.motivo || '',
    almacen: d.almacenNombre || '',

    fechaHora: d.timestamp?.toDate?.() || null,

    codRef: d.codigo_referencia || '',
    gtin: d.codigo_gtin || '',
    upn: d.codigo_upn || '',
    nombre: d.nombre_del_producto || '',

    // 🔥 BLINDADO
    cantidad: cantidadFinal,
    

    lote: d.lote || '',
    serie: d.serie || '',

    caducidad: d.fecha_caducidad?.toDate?.() || null,

    marca: d.marca || '',
    proveedor: d.proveedor || '',

    folioFactura: d.folioFactura || '',
    folioInterno: d.folioInterno || '',
    folio: d.folio || '',

    almacenDestino: d.almacen_destino || '',
    usuario: d.usuario_interno || ''
  };
}

// ========================================
// HOOK
// ========================================
export function useMovimientos(filters: Filters) {

  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [hasMore, setHasMore] = useState(true);

  const loadingRef = useRef(false);

  // ========================================
  // BUILD QUERY
  // ========================================
  function buildQuery(
    cursor?: QueryDocumentSnapshot<DocumentData>
  ) {

    let q: any = query(
      collectionGroup(db, 'detalles_movimientos'),
      orderBy('timestamp', 'desc'),
      limit(PAGE_SIZE)
    );

    // ========================================
    // FILTRO ALMACEN
    // ========================================
    if (
      filters.almacen &&
      filters.almacen !== 'Todos los almacenes'
    ) {
      q = query(
        q,
        where('almacenNombre', '==', filters.almacen)
      );
    }

    // ========================================
    // FILTRO TIPO
    // ========================================
    if (
      filters.tipo &&
      filters.tipo !== 'Todos los tipos'
    ) {
      q = query(
        q,
        where('tipoMovimiento', '==', filters.tipo)
      );
    }

    // ========================================
    // PAGINACION
    // ========================================
    if (cursor) {
      q = query(q, startAfter(cursor));
    }

    return q;
  }

  // ========================================
  // LOAD INITIAL
  // ========================================
  const loadInitial = useCallback(async () => {

    setLoading(true);
    setError(null);

    try {

      console.log('🔥 Cargando inicial...');

      const snap = await getDocs(buildQuery());

      console.log('📦 Docs iniciales:', snap.docs.length);

      const data = snap.docs.map((doc) =>
  mapDoc(doc as QueryDocumentSnapshot<DocumentData>)
);

      // ========================================
      // DEBUG CANTIDADES ABSURDAS
      // ========================================
      const cleanData = data.filter((m) => {

        if (Math.abs(m.cantidad) > 1000000) {

          console.warn(
            '🚨 Movimiento sospechoso:',
            m
          );

          return false;
        }

        return true;
      });

      setMovs(cleanData);

      setLastDoc(
        snap.docs.length > 0
          ? snap.docs[
              snap.docs.length - 1
            ] as QueryDocumentSnapshot<DocumentData>
          : null
      );

      setHasMore(snap.docs.length === PAGE_SIZE);

      console.log(
        '✅ Inicial cargado:',
        cleanData.length
      );

    } catch (e: any) {

      console.error('❌ Error inicial:', e);

      setError(e.message);

    } finally {

      setLoading(false);
    }

  }, [filters.almacen, filters.tipo]);

  // ========================================
  // LOAD MORE
  // ========================================
  const loadMore = useCallback(async () => {

    if (!hasMore) return;
    if (loadingRef.current) return;
    if (!lastDoc) return;

    loadingRef.current = true;

    try {

      console.log('📥 Cargando más...');

      const snap = await getDocs(
        buildQuery(lastDoc)
      );

      console.log(
        '📦 Docs paginación:',
        snap.docs.length
      );

     const data = snap.docs.map((doc) =>
  mapDoc(doc as QueryDocumentSnapshot<DocumentData>)
);

      // ========================================
      // DEBUG CANTIDADES ABSURDAS
      // ========================================
      const cleanData = data.filter((m) => {

        if (Math.abs(m.cantidad) > 1000000) {

          console.warn(
            '🚨 Movimiento sospechoso:',
            m
          );

          return false;
        }

        return true;
      });

      setMovs((prev) => [...prev, ...cleanData]);

      setLastDoc(
        snap.docs.length > 0
          ? snap.docs[
              snap.docs.length - 1
            ] as QueryDocumentSnapshot<DocumentData>
          : null
      );

      setHasMore(snap.docs.length === PAGE_SIZE);

      console.log(
        '✅ Total acumulado:',
        movs.length + cleanData.length
      );

    } catch (e: any) {

      console.error('❌ Error paginación:', e);

      setError(e.message);

    } finally {

      loadingRef.current = false;
    }

  }, [
    lastDoc,
    hasMore,
    filters.almacen,
    filters.tipo,
    movs.length
  ]);

  // ========================================
  // RESET FILTERS
  // ========================================
  useEffect(() => {

    setMovs([]);
    setLastDoc(null);
    setHasMore(true);

    loadInitial();

  }, [
    filters.almacen,
    filters.tipo
  ]);

  // ========================================
  // RETURN
  // ========================================
  return {
    movs,
    loading,
    error,
    loadMore,
    hasMore
  };
}