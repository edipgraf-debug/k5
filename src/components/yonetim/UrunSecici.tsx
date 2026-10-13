'use client';

import { useEffect, useState } from 'react';

export interface SecilenUrun { id: number; ad: string; barkod: string | null; yayinevi: string | null; fiyat: number }
const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

/** Set ve kampanya formlarında satıştaki ürünleri arayıp ekler */
export default function UrunSecici({ ekle, eklenenler, etiket = 'Ürün ekle' }: { ekle: (u: SecilenUrun) => void; eklenenler: number[]; etiket?: string }) {
  const [q, setQ] = useState('');
  const [sonuc, setSonuc] = useState<SecilenUrun[]>([]);
  useEffect(() => {
    const c = new AbortController();
    const z = setTimeout(async () => {
      try {
        const r = await fetch(`/api/yonetim/urunler?q=${encodeURIComponent(q.trim())}`, { signal: c.signal });
        if (r.ok) setSonuc((await r.json()).urunler);
      } catch { /* iptal */ }
    }, 220);
    return () => { clearTimeout(z); c.abort(); };
  }, [q]);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="us-q" className="etiket">{etiket}</label>
      <input id="us-q" type="search" className="girdi" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, yazar, yayınevi veya barkod" />
      <ul className="flex max-h-72 flex-col overflow-y-auto rounded-xl border border-cizgi">
        {sonuc.map((u) => {
          const var_ = eklenenler.includes(u.id);
          return (
            <li key={u.id} className="flex items-center gap-3 border-b border-[#EEF0F3] px-3 py-2 last:border-0">
              <span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-bold">{u.ad}</span>
                <span className="text-[12.5px] text-metin-3">{[u.yayinevi, u.barkod].filter(Boolean).join(' · ')} · {tl(u.fiyat)}</span></span>
              <button type="button" disabled={var_} onClick={() => ekle(u)} aria-label={`${u.ad} ekle`}
                className={`min-h-10 min-w-[76px] cursor-pointer rounded-[10px] border-2 text-[13px] font-bold ${var_ ? 'border-yesil-zemin bg-yesil-zemin text-yesil' : 'border-lacivert bg-lacivert text-white'}`}>{var_ ? 'Eklendi' : 'Ekle'}</button>
            </li>
          );
        })}
        {!sonuc.length && <li className="px-3 py-2 text-sm text-metin-2">Sonuç yok.</li>}
      </ul>
    </div>
  );
}
