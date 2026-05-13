import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2 } from 'lucide-react';

import { fmtNum } from './lib/utils';
import type { Movimiento, Uniques } from './types';

import { logout, onAuthChange } from "./firebase/auth";
import type { User } from "firebase/auth";
import Login from "./components/Login";

import { useMovimientos } from './hooks/UseMovimientos';

import logo from './assets/logo.jpeg';

// COMPONENTS
import { KardexTab } from './components/KardexTab';
import { SaldosTab } from './components/SaldosTab';
import { MovsTab } from './components/MovsTab';
import { DashTab } from './components/DashTab';
import { GtinTab } from './components/GtinTab';
import { PorteoTab } from './components/PorteoTab';

export default function App() {

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [almacen, setAlmacen] = useState<string>('Todos los almacenes');
  const [tipo, setTipo] = useState<string>('Todos los tipos');

  const [activeTab, setActiveTab] = useState<'kardex' | 'saldos' | 'movs' | 'dash' | 'gtin' | 'porteo'>('kardex');
  const [filteredMovs, setFilteredMovs] = useState<Movimiento[]>([]);
  //  HOOK CON PAGINACIÓN
  const { movs, loading, error, loadMore, hasMore } = useMovimientos({ almacen, tipo });

  //REF PARA SCROLL
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  //  OBSERVER (SIN TOCAR DISEÑO)
  useEffect(() => {

    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(el);

    return () => observer.disconnect();

  }, [hasMore, loading, loadMore]);

  // =========================
  // UNIQUES (INTACTO)
  // =========================
  const uniques: Uniques = useMemo(() => {

    const almacenes = new Set<string>();
    const tipos = new Set<string>();
    const motivos = new Set<string>();
    const marcas = new Set<string>();
    const proveedores = new Set<string>();

    const productosMap = new Map();
    const gtinMap = new Map();

    for (const r of movs) {
      if (r.almacen) almacenes.add(r.almacen);
      if (r.tipoMov) tipos.add(r.tipoMov);
      if (r.motivo) motivos.add(r.motivo);
      if (r.marca) marcas.add(r.marca);
      if (r.proveedor) proveedores.add(r.proveedor);

      if (r.codRef && !productosMap.has(r.codRef)) {
        productosMap.set(r.codRef, {
          codRef: r.codRef,
          nombre: r.nombre,
          gtin: r.gtin,
          upn: r.upn
        });
      }

      if (r.gtin && !gtinMap.has(r.gtin)) {
        gtinMap.set(r.gtin, {
          gtin: r.gtin,
          nombre: r.nombre,
          codRef: r.codRef
        });
      }
    }

    const sort = (set: Set<string>) =>
      Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));

    return {
      almacenes: sort(almacenes),
      tipos: sort(tipos),
      motivos: sort(motivos),
      marcas: sort(marcas),
      proveedores: sort(proveedores),
      productos: Array.from(productosMap.values()),
      gtins: Array.from(gtinMap.values())
    };

  }, [movs]);

  // AUTH
  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u ?? null);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // KPIs
 const sourceMovs =
  filteredMovs.length > 0
    ? filteredMovs
    : movs;

const totalEntradas = sourceMovs.reduce((acc, r) => {

  const tipo = r.tipoMov?.toLowerCase() || '';

  if (
    tipo.includes('entrada') ||
    tipo.includes('compra')
  ) {
    return acc + Math.abs(r.cantidad);
  }

  return acc;

}, 0);

const totalSalidas = sourceMovs.reduce((acc, r) => {

  const tipo = r.tipoMov?.toLowerCase() || '';

  if (
    tipo.includes('salida')
  ) {
    return acc + Math.abs(r.cantidad);
  }

  return acc;

}, 0);

const totalTraslados = sourceMovs.reduce((acc, r) => {

  const tipo = r.tipoMov?.toLowerCase() || '';

  if (
    tipo.includes('traslado')
  ) {
    return acc + Math.abs(r.cantidad);
  }

  return acc;

}, 0);

const balance = totalEntradas - totalSalidas;

  if (authLoading) return <div className="p-10">Cargando...</div>;
  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-gray-50">

{/* HEADER */}
<header className="border-b bg-white px-4 py-3">

  <div className="
    flex
    flex-wrap
    items-center
    justify-between
    gap-4
  ">

    {/* IZQUIERDA */}
    <div className="flex items-center gap-3 min-w-0">

      <img
        src={logo}
        className="
          h-10
          w-auto
          object-contain
          shrink-0
        "
      />

      <div className="min-w-0">
        <div className="font-bold text-lg leading-tight">
          Kardex Control Pro
        </div>

        <div className="text-xs text-gray-400">
          TRAZABILIDAD · INVENTARIO
        </div>
      </div>

    </div>

    {/* DERECHA */}
    <div className="
      flex
      items-center
      gap-3
      flex-wrap
      justify-end
    ">

      <div className="
        text-xs
        text-gray-500
        max-w-[180px]
        truncate
      ">
        {user?.displayName || user?.email}
      </div>

      <button
        onClick={logout}
        className="
          px-4
          py-2
          rounded-lg
          bg-red-500
          hover:bg-red-600
          text-white
          text-sm
          transition
          whitespace-nowrap
        "
      >
        Cerrar sesión
      </button>

    </div>

  </div>

</header>

      <main className="p-6">

        {/* HERO */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">
            Reporte <span className="text-red-500 italic">profesional</span> de Kardex
          </h1>
          <p className="text-black-500 mt-2">
            Cálculo preciso de saldo por almacén con trazabilidad completa.
          </p>
        </div>

        {/* KPIs */}
          <div className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-6
            gap-4
            mb-6
        ">
          <div className="p-4 bg-white rounded shadow">
            <div className="text-xs text-gray-400">MOVIMIENTOS</div>
            <div className="text-xl font-semibold">{fmtNum(movs.length)}</div>
          </div>

          <div className="p-4 bg-white rounded shadow">
            <div className="text-xs text-gray-400">PRODUCTOS UNICOS</div>
            <div className="text-xl text-red-500 font-semibold">{fmtNum(uniques.productos.length)}</div>
          </div>

          <div className="p-4 bg-white rounded shadow">
            <div className="text-xs text-gray-400">ALMACENES</div>
            <div className="text-xl font-semibold">{fmtNum(uniques.almacenes.length)}</div>
          </div>

          <div className="p-4 bg-white rounded shadow">
            <div className="text-xs text-gray-400">TOTAL PZS ENTRADAS</div>
            <div className="text-xl text-green-600 font-semibold">{fmtNum(totalEntradas)}</div>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <div className="text-xs text-gray-400">TOTAL PZS TRASLADOS</div>
            <div className="text-xl text-blue-600 font-semibold">
              {fmtNum(totalTraslados)}
            </div>
        </div>
          <div className="p-4 bg-white rounded shadow">
            <div className="text-xs text-gray-400">TOTAL PSZ SALIDAS</div>
            <div className="text-xl text-red-600 font-semibold">{fmtNum(totalSalidas)}</div>
          </div>

          <div className="p-4 bg-white rounded shadow">
            <div className="text-xs text-gray-400">BALANCE NETO</div>
            <div className="text-xl font-semibold">{fmtNum(balance)}</div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex gap-4 mb-6">
          <select value={almacen} onChange={(e) => setAlmacen(e.target.value)}>
            <option>Todos los almacenes</option>
            {uniques.almacenes.map(a => <option key={a}>{a}</option>)}
          </select>

          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option>Todos los tipos</option>
            {uniques.tipos.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* TABS */}
        <div className="
            flex
            gap-6
            border-b
            mb-6
            text-sm
            overflow-x-auto
            whitespace-nowrap
            scrollbar-thin
            pb-2
          ">
          {[
            ['kardex', 'Kardex Detallado'],
            ['gtin', 'Trazabilidad por GTIN'],
            ['saldos', 'Existencias a Fecha'],
            ['movs', 'Todos los Movimientos'],
            ['dash', 'Visualización'],
            ['porteo', 'Porteo de Datos']
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={
                `pb-2 
                shrink-0
                transition
                ${
                activeTab === key
                  ? 'border-b-2 border-red-500 text-red-500'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        {/* CONTENIDO TABSSS*/}
        {activeTab === 'kardex' && <KardexTab
          movs={movs}
           uniques={uniques}
          setFilteredMovs={setFilteredMovs}
        />}
        {activeTab === 'saldos' && <SaldosTab
  movs={movs}
  uniques={uniques}
  setFilteredMovs={setFilteredMovs}
/>}
        {activeTab === 'movs' && <MovsTab
  movs={movs}
  uniques={uniques}
  setFilteredMovs={setFilteredMovs}
/>}
        {activeTab === 'dash' && <DashTab
  movs={movs}
  uniques={uniques}
  setFilteredMovs={setFilteredMovs}
/>}
        {activeTab === 'gtin' && <GtinTab
  movs={movs}
  uniques={uniques}
  setFilteredMovs={setFilteredMovs}
/>}
        {activeTab === 'porteo' && <PorteoTab movs={movs} />}

        {/* 🔥 SCROLL INVISIBLE */}
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
          {loading && (
            <Loader2 className="animate-spin text-gray-400" />
          )}
        </div>

      </main>
    </div>
  );
}