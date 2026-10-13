'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SifreDegistirFormu({ zorunlu, geri }: { zorunlu: boolean; geri: string }) {
  const [mevcut, setMevcut] = useState('');
  const [yeni, setYeni] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata('');
    if (yeni !== tekrar) { setHata('Yeni şifreler aynı değil'); return; }
    setBekliyor(true);
    try {
      const r = await fetch('/api/auth/personel/sifre', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mevcut, yeni, yeniTekrar: tekrar }) });
      const v = await r.json().catch(() => ({}));
      if (!r.ok) { setHata(v.hata ?? 'Şifre değiştirilemedi'); return; }
      window.location.href = typeof v.yonlendir === 'string' && v.yonlendir.startsWith('/') && !v.yonlendir.startsWith('//') ? v.yonlendir : geri;
    } catch { setHata('Bağlantı hatası'); } finally { setBekliyor(false); }
  }

  return (
    <form onSubmit={gonder} className="flex flex-col gap-4" noValidate>
      {hata && <p role="alert" className="rounded-xl bg-kirmizi-zemin px-4 py-3 text-sm font-semibold text-kirmizi">{hata}</p>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="mevcut" className="etiket">{zorunlu ? 'Geçici şifre' : 'Mevcut şifre'}</label>
        <input id="mevcut" type="password" autoComplete="current-password" className="girdi" value={mevcut} onChange={(e) => setMevcut(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="yeni" className="etiket">Yeni şifre</label>
        <input id="yeni" type="password" autoComplete="new-password" className="girdi" value={yeni} onChange={(e) => setYeni(e.target.value)} aria-describedby="sifre-kural" required />
        <span id="sifre-kural" className="text-[13px] text-metin-3">En az 8 karakter; en az bir harf ve bir rakam.</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tekrar" className="etiket">Yeni şifre (tekrar)</label>
        <input id="tekrar" type="password" autoComplete="new-password" className="girdi" value={tekrar} onChange={(e) => setTekrar(e.target.value)} required />
      </div>
      <button type="submit" disabled={bekliyor} className="btn-turuncu">{bekliyor ? 'Kaydediliyor…' : 'Şifreyi kaydet'}</button>
      {!zorunlu && <Link href={geri} className="text-center text-sm font-bold">Vazgeç</Link>}
    </form>
  );
}
