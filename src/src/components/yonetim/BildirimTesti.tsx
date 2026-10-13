'use client';

import { useState } from 'react';

/** Kayıtlı operatör ayarıyla deneme SMS / e-postası */
export default function BildirimTesti({ kanal }: { kanal: 'SMS' | 'Eposta' }) {
  const [alici, setAlici] = useState('');
  const [durum, setDurum] = useState<{ ok: boolean; m: string } | null>(null);
  const [bekliyor, setBekliyor] = useState(false);
  async function gonder() {
    setBekliyor(true); setDurum(null);
    try {
      const r = await fetch('/api/yonetim/ayarlar/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kanal, alici }) });
      const v = await r.json().catch(() => ({}));
      if (!r.ok) setDurum({ ok: false, m: v.hata ?? 'Gönderilemedi' });
      else setDurum(v.ok ? { ok: true, m: v.konsol ? 'Konsol modunda: mesaj gönderilmedi, sunucu günlüğüne yazıldı.' : 'Deneme mesajı gönderildi.' } : { ok: false, m: v.hata ?? 'Operatör hata döndürdü' });
    } catch { setDurum({ ok: false, m: 'Bağlantı hatası' }); } finally { setBekliyor(false); }
  }
  return (
    <div className="flex flex-col gap-2 border-t border-[#EEF0F3] pt-4">
      <span className="etiket">Deneme gönderimi (önce kaydedin)</span>
      <div className="flex flex-wrap gap-2">
        <label htmlFor={`test-${kanal}`} className="sr-only">{kanal === 'SMS' ? 'Cep telefonu' : 'E-posta'}</label>
        <input id={`test-${kanal}`} className="girdi min-w-0 flex-[1_1_220px]" value={alici} onChange={(e) => setAlici(e.target.value)}
          placeholder={kanal === 'SMS' ? '5XX XXX XX XX' : 'ornek@kardelenokul.com'} inputMode={kanal === 'SMS' ? 'tel' : 'email'} />
        <button type="button" onClick={gonder} disabled={bekliyor || alici.trim().length < 5} className="btn-cerceve min-h-12">{bekliyor ? 'Gönderiliyor…' : 'Deneme gönder'}</button>
      </div>
      {durum && <p role={durum.ok ? 'status' : 'alert'} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${durum.ok ? 'bg-yesil-zemin text-yesil' : 'bg-kirmizi-zemin text-kirmizi'}`}>{durum.m}</p>}
    </div>
  );
}
