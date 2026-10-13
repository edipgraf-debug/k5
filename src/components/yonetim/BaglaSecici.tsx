'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Plasiyer sayfasında listeden okul ya da öğretmen seçip bu plasiyere bağlar. */
export default function BaglaSecici({ tur, secenekler, plasiyerId }: { tur: 'okul' | 'ogretmen'; secenekler: { id: number; ad: string }[]; plasiyerId: number }) {
  const router = useRouter();
  const [secim, setSecim] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  async function bagla() {
    if (!secim) return;
    setHata(''); setBekliyor(true);
    const url = tur === 'okul' ? `/api/yonetim/okullar/${secim}/plasiyer` : `/api/yonetim/kullanicilar/${secim}/plasiyer`;
    try {
      const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plasiyerId }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setHata(j.hata ?? 'Bağlanamadı'); return; }
      setSecim(''); router.refresh();
    } catch { setHata('Bağlantı hatası'); } finally { setBekliyor(false); }
  }

  return (
    <>
      <select aria-label={tur === 'okul' ? 'Bağlanacak okul' : 'Bağlanacak öğretmen'} className="girdi h-11 min-w-0 flex-[1_1_260px]" value={secim} onChange={(e) => setSecim(e.target.value)}>
        <option value="">{tur === 'okul' ? 'Okul seçin' : 'Öğretmen seçin'}</option>
        {secenekler.map((x) => <option key={x.id} value={x.id}>{x.ad}</option>)}
      </select>
      <button type="button" onClick={bagla} disabled={!secim || bekliyor} className="btn-koyu min-h-11">{bekliyor ? 'Bağlanıyor…' : 'Bağla'}</button>
      {hata && <span role="alert" className="text-sm font-semibold text-kirmizi">{hata}</span>}
    </>
  );
}
