'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import type { Kalem } from '@/lib/types';
import StokRozeti from './StokRozeti';

const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
export const kalemAdresi = (k: Pick<Kalem, 'tur' | 'id'>) => `/katalog/${k.tur === 'set' ? 'set' : 'urun'}/${k.id}`;

/** Üst çubuktaki canlı arama: yazdıkça ürün ve setleri fiyat ve depo stoku ile listeler; Enter tüm sonuçlara götürür. */
export default function AramaCubugu({ koyu }: { koyu?: boolean }) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState('');
  const [sonuc, setSonuc] = useState<Kalem[]>([]);
  const [acik, setAcik] = useState(false);
  const [secili, setSecili] = useState(-1);
  const [bekliyor, setBekliyor] = useState(false);
  const kok = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setSonuc([]); return; }
    const c = new AbortController();
    const z = setTimeout(async () => {
      setBekliyor(true);
      try {
        const r = await fetch(`/api/arama?q=${encodeURIComponent(s)}`, { signal: c.signal });
        if (r.ok) { setSonuc((await r.json()).kalemler ?? []); setSecili(-1); setAcik(true); }
      } catch { /* iptal */ } finally { setBekliyor(false); }
    }, 220);
    return () => { clearTimeout(z); c.abort(); };
  }, [q]);

  useEffect(() => {
    const kapat = (e: MouseEvent) => { if (kok.current && !kok.current.contains(e.target as Node)) setAcik(false); };
    document.addEventListener('mousedown', kapat);
    return () => document.removeEventListener('mousedown', kapat);
  }, []);

  function tus(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAcik(true); setSecili((x) => Math.min(x + 1, sonuc.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSecili((x) => Math.max(x - 1, -1)); }
    else if (e.key === 'Escape') setAcik(false);
  }

  return (
    <form ref={kok} role="search" className="relative" onSubmit={(e) => {
      e.preventDefault();
      setAcik(false);
      if (secili >= 0 && sonuc[secili]) router.push(kalemAdresi(sonuc[secili]));
      else if (q.trim()) router.push(`/katalog?q=${encodeURIComponent(q.trim())}`);
    }}>
      <div className={`flex items-center gap-2 rounded-xl border-2 px-3 ${koyu ? 'border-lacivert-2 bg-white' : 'border-kenar bg-white'}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6575" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <label htmlFor={id} className="sr-only">Ürün, set, yazar, yayınevi veya barkod ara</label>
        <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => sonuc.length && setAcik(true)} onKeyDown={tus}
          role="combobox" aria-expanded={acik && sonuc.length > 0} aria-controls={`${id}-l`} aria-autocomplete="list"
          aria-activedescendant={secili >= 0 ? `${id}-${secili}` : undefined} autoComplete="off"
          placeholder="Kitap, set, yazar, yayınevi veya barkod ara" className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-lacivert outline-none placeholder:text-metin-3" />
        {bekliyor && <span className="text-xs text-metin-3" aria-hidden="true">…</span>}
      </div>
      {acik && q.trim().length >= 2 && (
        <div id={`${id}-l`} role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-xl border border-cizgi bg-white p-1.5 text-lacivert shadow-[0_12px_32px_rgba(23,35,52,0.18)]">
          {sonuc.map((k, i) => (
            <Link key={k.anahtar} id={`${id}-${i}`} role="option" aria-selected={secili === i} href={kalemAdresi(k)} onClick={() => setAcik(false)}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 no-underline ${secili === i ? 'bg-zemin' : 'hover:bg-zemin'}`}>
              {k.kapak
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={`/api/kapak/${k.id}`} alt="" className="h-12 w-9 flex-none rounded object-cover" />
                : <span aria-hidden="true" className={`flex h-12 w-9 flex-none items-center justify-center rounded text-[10px] font-extrabold ${k.tur === 'set' ? 'bg-lacivert text-turuncu' : 'bg-[#E9ECF1] text-metin-3'}`}>{k.tur === 'set' ? 'SET' : ''}</span>}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-bold text-lacivert">{k.ad}</span>
                <span className="truncate text-[12.5px] text-metin-2">{k.alt}{k.barkod ? ` · ${k.barkod}` : ''}</span>
                <StokRozeti stok={k.stok} kucuk />
              </span>
              <span className="flex flex-none flex-col items-end">
                {k.eskiFiyat != null && <span className="text-xs text-metin-3 line-through">{tl(k.eskiFiyat)}</span>}
                <span className="text-sm font-extrabold">{tl(k.fiyat)}</span>
              </span>
            </Link>
          ))}
          {!sonuc.length && !bekliyor && <p className="px-3 py-2.5 text-sm text-metin-2">&quot;{q.trim()}&quot; için sonuç yok.</p>}
          {sonuc.length > 0 && (
            <Link href={`/katalog?q=${encodeURIComponent(q.trim())}`} onClick={() => setAcik(false)} className="mt-1 flex min-h-10 items-center justify-center rounded-lg bg-zemin text-sm font-bold text-kiremit no-underline">
              Tüm sonuçlar →
            </Link>
          )}
        </div>
      )}
    </form>
  );
}
