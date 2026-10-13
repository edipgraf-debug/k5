'use client';

import { useState } from 'react';

/** Veli: katalogdaki ürünü / seti seçilen öğrencinin sepetine ekler (sunucudaki sepet) */
export default function SepeteEkle({ anahtar, ogrenciler, stokYok }: { anahtar: string; ogrenciler: { id: number; ad: string; sinif: string }[]; stokYok?: boolean }) {
  const [ogrenci, setOgrenci] = useState(ogrenciler[0]?.id ?? 0);
  const [durum, setDurum] = useState<'' | 'bekle' | 'ok' | string>('');
  if (!ogrenciler.length) return null;

  async function ekle() {
    setDurum('bekle');
    try {
      const g = await fetch(`/api/veli/sepet?ogrenciId=${ogrenci}`);
      const mevcut: string[] = g.ok ? (await g.json()).secimler ?? [] : [];
      if (mevcut.includes(anahtar)) { setDurum('ok'); return; }
      const r = await fetch('/api/veli/sepet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ogrenciId: ogrenci, secimler: [...mevcut, anahtar] }) });
      setDurum(r.ok ? 'ok' : (await r.json().catch(() => ({}))).hata ?? 'Eklenemedi');
    } catch { setDurum('Bağlantı hatası'); }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {ogrenciler.length > 1 && (
        <select aria-label="Hangi öğrenci için" className="girdi h-10 text-sm" value={ogrenci} onChange={(e) => { setOgrenci(Number(e.target.value)); setDurum(''); }}>
          {ogrenciler.map((x) => <option key={x.id} value={x.id}>{x.ad} · {x.sinif}</option>)}
        </select>
      )}
      <button type="button" onClick={ekle} disabled={durum === 'bekle' || durum === 'ok' || stokYok}
        className={`min-h-11 cursor-pointer rounded-[10px] border-2 font-baslik text-sm font-bold disabled:cursor-default ${durum === 'ok' ? 'border-yesil-zemin bg-yesil-zemin text-yesil' : 'border-lacivert bg-lacivert text-white disabled:opacity-60'}`}>
        {stokYok ? 'Stokta yok' : durum === 'ok' ? '✓ Sepette' : durum === 'bekle' ? 'Ekleniyor…' : 'Sepete ekle'}
      </button>
      {durum === 'ok' && <a href="/veli" className="text-[13px] font-bold">Sepete git →</a>}
      {durum && !['ok', 'bekle'].includes(durum) && <span role="alert" className="text-[13px] font-semibold text-kirmizi">{durum}</span>}
    </div>
  );
}
