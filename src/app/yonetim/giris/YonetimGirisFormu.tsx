'use client';

import { useState } from 'react';

export default function YonetimGirisFormu() {
  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(''); setBekliyor(true);
    try {
      const r = await fetch('/api/auth/personel/giris', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eposta, sifre, rol: 'yonetim' }) });
      const v = await r.json();
      if (!r.ok) { setHata(v.hata ?? 'Giriş yapılamadı'); return; }
      window.location.href = v.yonlendir;
    } finally { setBekliyor(false); }
  }

  return (
    <form onSubmit={gonder} className="flex flex-col gap-4">
      {hata && <p role="alert" className="rounded-xl bg-kirmizi-zemin px-4 py-3 text-sm font-semibold text-kirmizi">{hata}</p>}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ye" className="etiket">E-posta</label>
        <input id="ye" type="email" className="girdi" value={eposta} onChange={(e) => setEposta(e.target.value)} autoComplete="username" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ys" className="etiket">Şifre</label>
        <input id="ys" type="password" className="girdi" value={sifre} onChange={(e) => setSifre(e.target.value)} autoComplete="current-password" />
      </div>
      <button type="submit" disabled={bekliyor} className="btn-turuncu">Giriş yap</button>
    </form>
  );
}
