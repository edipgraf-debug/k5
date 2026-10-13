'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Satır içi plasiyer atama: seçim değişince kaydeder (okul ya da öğretmen). */
export default function PlasiyerSecici({ url, deger, secenekler, bosEtiket, etiket }:
  { url: string; deger: number | null; secenekler: { id: number; adSoyad: string; kod: string | null }[]; bosEtiket: string; etiket: string }) {
  const router = useRouter();
  const [v, setV] = useState<number | null>(deger);
  const [durum, setDurum] = useState<'' | 'kaydediliyor' | 'ok' | string>('');

  async function degistir(yeni: number | null) {
    const once = v;
    setV(yeni); setDurum('kaydediliyor');
    try {
      const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plasiyerId: yeni }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setV(once); setDurum(j.hata ?? 'Kaydedilemedi'); return; }
      setDurum('ok'); router.refresh();
    } catch { setV(once); setDurum('Bağlantı hatası'); }
  }

  return (
    <span className="flex min-w-0 flex-col gap-1">
      <select aria-label={etiket} className="girdi h-11 min-w-[200px]" value={v ?? ''} disabled={durum === 'kaydediliyor'}
        onChange={(e) => degistir(Number(e.target.value) || null)}>
        <option value="">{bosEtiket}</option>
        {secenekler.map((p) => <option key={p.id} value={p.id}>{p.adSoyad}{p.kod ? ` · ${p.kod}` : ''}</option>)}
      </select>
      {durum === 'ok' && <span role="status" className="text-[13px] font-bold text-yesil">✓ Kaydedildi</span>}
      {durum && durum !== 'ok' && durum !== 'kaydediliyor' && <span role="alert" className="text-[13px] font-semibold text-kirmizi">{durum}</span>}
    </span>
  );
}
