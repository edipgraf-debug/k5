'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Öğrenci detayından: sepeti yalnız bu öğrenciye aç ya da hatırlat. */
export default function OgrenciyeYayinla({ listeId, ogrenciId, tur }: { listeId: number; ogrenciId: number; tur: 'yayinla' | 'hatirlat' }) {
  const router = useRouter();
  const [durum, setDurum] = useState<{ ok: boolean; m: string } | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  async function gonder() {
    setBekliyor(true); setDurum(null);
    try {
      const r = await fetch(`/api/listeler/${listeId}/yayinla`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hedef: 'secili', ogrenciIdleri: [ogrenciId], hatirlatma: tur === 'hatirlat', sms: true, eposta: true }),
      });
      const v = await r.json().catch(() => ({}));
      if (!r.ok) { setDurum({ ok: false, m: v.hata ?? 'İşlem yapılamadı' }); return; }
      setDurum({ ok: true, m: tur === 'hatirlat' ? 'Hatırlatma gönderildi' : 'Sepet öğrenciye açıldı, veliye bildirim gitti' });
      router.refresh();
    } catch { setDurum({ ok: false, m: 'Bağlantı hatası' }); } finally { setBekliyor(false); }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={gonder} disabled={bekliyor} className={tur === 'yayinla' ? 'btn-turuncu min-h-11' : 'btn-cerceve min-h-11'}>
        {tur === 'yayinla' ? 'Bu öğrenciye yayınla' : 'Hatırlat'}
      </button>
      {durum && <span role={durum.ok ? 'status' : 'alert'} className={`text-sm font-bold ${durum.ok ? 'text-yesil' : 'text-kirmizi'}`}>{durum.m}</span>}
    </div>
  );
}
