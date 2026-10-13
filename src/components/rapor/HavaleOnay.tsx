'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Bekleyen havaleyi onayla (hesaba geçtiği görüldükten sonra) */
export default function HavaleOnay({ id, tutar, siparisNo }: { id: number; tutar: string; siparisNo: string }) {
  const router = useRouter();
  const [durum, setDurum] = useState('');
  async function onayla() {
    if (!window.confirm(`${siparisNo} siparişinin ${tutar} havalesi hesaba geçti mi? Onaylanınca sipariş "Ödendi" olur.`)) return;
    setDurum('…');
    const r = await fetch(`/api/yonetim/tahsilatlar/${id}/onayla`, { method: 'POST' });
    const v = await r.json().catch(() => ({}));
    if (!r.ok) { setDurum(v.hata ?? 'Onaylanamadı'); return; }
    setDurum(''); router.refresh();
  }
  return (
    <span className="flex flex-col gap-1">
      <button type="button" onClick={onayla} className="btn-koyu min-h-10 px-3 text-sm">Havaleyi onayla</button>
      {durum && durum !== '…' && <span role="alert" className="text-[12px] font-bold text-kirmizi">{durum}</span>}
    </span>
  );
}
