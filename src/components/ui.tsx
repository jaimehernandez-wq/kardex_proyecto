import React from 'react';
import { cn } from '../lib/utils';

export function Badge({ type, children }: { type?: string, children: React.ReactNode }) {
  const t = (type || '').toLowerCase();
  if (t === 'entrada') return <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide uppercase bg-[#E8F5EE] text-[var(--color-ok)]">{children}</span>;
  if (t === 'salida') return <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide uppercase bg-[#FDE8E8] text-[var(--color-err)]">{children}</span>;
  if (t === 'traslado') return <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide uppercase bg-[#E8EEF9] text-[#1D4ED8]">{children}</span>;
  if (t === 'orden de compra') return <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide uppercase bg-[#FFF4E6] text-[var(--color-warn)]">{children}</span>;
  
  return <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide uppercase bg-[var(--color-line-soft)] text-[var(--color-ink-muted)]">{children || '—'}</span>;
}

export function MultiSelect({ options, selected, onChange, placeholder }: { options: string[], selected: string[], onChange: (s: string[]) => void, placeholder: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredOptions = options.filter(o => !search || o.toLowerCase().includes(search.toLowerCase()));

  const toggle = (v: string) => {
    if (selected.includes(v)) onChange(selected.filter(x => x !== v));
    else onChange([...selected, v]);
  };

  return (
    <div className="relative text-[13px]" ref={ref}>
      <div 
        className={cn("min-h-[36px] p-1.5 flex flex-wrap gap-1 items-center bg-[var(--color-surface)] border border-[var(--color-line)] rounded-lg cursor-pointer transition-colors focus-within:border-[var(--color-red)]", isOpen && "border-[var(--color-red)]")}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.remove-btn')) return;
          setIsOpen(!isOpen);
        }}
      >
        {selected.length === 0 ? (
          <span className="text-[var(--color-ink-muted)] px-1">{placeholder}</span>
        ) : (
          selected.map(v => (
            <span key={v} className="bg-[var(--color-red-pale)] text-[var(--color-red-deep)] px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold flex items-center gap-1">
              {v.length > 18 ? v.slice(0, 16) + '…' : v}
              <button 
                className="remove-btn opacity-60 hover:opacity-100 text-[14px] leading-none"
                onClick={(e) => { e.stopPropagation(); toggle(v); }}
              >×</button>
            </span>
          ))
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--color-line)] rounded-lg shadow-[var(--shadow-lg)] max-h-[260px] overflow-hidden flex flex-col z-20">
          <div className="p-1.5 border-b border-[var(--color-line-soft)] sticky top-0 bg-white">
            <input 
              type="text" 
              placeholder="Buscar..." 
              autoFocus
              className="w-full px-2 py-1.5 border border-[var(--color-line)] rounded-md text-[12.5px] outline-none focus:border-[var(--color-red)]"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto p-1 max-h-[200px]">
             {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-[var(--color-ink-muted)]">Sin resultados</div>
             ) : (
                filteredOptions.map(o => (
                  <label key={o} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-[var(--color-red-pale)] cursor-pointer rounded text-[13px] border-b border-[var(--color-line-soft)] last:border-0">
                    <input 
                      type="checkbox" 
                      className="accent-[var(--color-red)]"
                      checked={selected.includes(o)}
                      onChange={() => toggle(o)}
                    />
                    <span>{o}</span>
                  </label>
                ))
             )}
          </div>
        </div>
      )}
    </div>
  );
}
