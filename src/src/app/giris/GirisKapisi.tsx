'use client';

import { useState } from 'react';

type Rol = 'veli' | 'ogretmen' | 'okul';
type VeliAdim = 'telefon' | 'kod' | 'sifreBelirle' | 'sifreyleGiris';

async function postJson(url: string, govde: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde) });
  const veri = await r.json().catch(() => ({}));
  return { ok: r.ok, veri };
}

const ROLLER: { id: Rol; ad: string }[] = [
  { id: 'veli', ad: 'Veli' },
  { id: 'ogretmen', ad: 'Öğretmen' },
  { id: 'okul', ad: 'Okul Yönetimi' },
];

function RolIkonu({ rol }: { rol: Rol }) {
  const ortak = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (rol === 'veli') return <svg {...ortak}><circle cx="9" cy="7" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17" cy="10" r="2.2" /><path d="M15.5 20a4.5 4.5 0 0 1 6-4.2" /></svg>;
  if (rol === 'ogretmen') return <svg {...ortak}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M7 20h10M12 16v4M7 9l3 3 6-5" /></svg>;
  return <svg {...ortak}><path d="M3 21h18M5 21V10l7-5 7 5v11M10 21v-5h4v5" /></svg>;
}

export default function GirisKapisi({ baslik = 'Giriş yap' }: { baslik?: string }) {
  const [rol, setRol] = useState<Rol>('veli');
  const [adim, setAdim] = useState<VeliAdim>('telefon');
  const [amac, setAmac] = useState<'IlkGiris' | 'SifreSifirlama'>('IlkGiris');
  const [telefon, setTelefon] = useState('');
  const [kod, setKod] = useState('');
  const [maske, setMaske] = useState('');
  const [adSoyad, setAdSoyad] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifre2, setSifre2] = useState('');
  const [eposta, setEposta] = useState('');
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  function rolSec(r: Rol) {
    setRol(r); setAdim('telefon'); setHata(''); setBilgi(''); setSifre(''); setSifre2('');
  }

  async function calistir(f: () => Promise<void>) {
    setHata(''); setBekliyor(true);
    try { await f(); } catch { setHata('Bağlantı hatası, lütfen tekrar deneyin.'); } finally { setBekliyor(false); }
  }

  const kodIste = (a: 'IlkGiris' | 'SifreSifirlama') => calistir(async () => {
    const { ok, veri } = await postJson('/api/auth/veli/kod', { telefon, amac: a });
    if (!ok) { setHata(veri.hata ?? 'Kod gönderilemedi'); return; }
    setAmac(a); setMaske(veri.maskeliTelefon); setKod('');
    setBilgi(veri.gelistirmeKodu ? `Geliştirme modu: kod ${veri.gelistirmeKodu}` : '');
    setAdim('kod');
  });

  const kodDogrula = () => calistir(async () => {
    const { ok, veri } = await postJson('/api/auth/veli/dogrula', { telefon, kod, amac });
    if (!ok) { setHata(veri.hata ?? 'Kod doğrulanamadı'); return; }
    setBilgi(''); setAdim('sifreBelirle');
  });

  const sifreKaydet = () => calistir(async () => {
    const { ok, veri } = await postJson('/api/auth/veli/sifre', { adSoyad, sifre, sifreTekrar: sifre2 });
    if (!ok) { setHata(veri.hata ?? 'Şifre kaydedilemedi'); return; }
    window.location.href = veri.yonlendir;
  });

  const veliGiris = () => calistir(async () => {
    const { ok, veri } = await postJson('/api/auth/veli/giris', { telefon, sifre });
    if (!ok) { setHata(veri.hata ?? 'Giriş yapılamadı'); return; }
    window.location.href = veri.yonlendir;
  });

  const personelGiris = () => calistir(async () => {
    const { ok, veri } = await postJson('/api/auth/personel/giris', { eposta, sifre, rol });
    if (!ok) { setHata(veri.hata ?? 'Giriş yapılamadı'); return; }
    window.location.href = veri.yonlendir;
  });

  const yardim = {
    veli: 'Numaranız sistemde görünmüyorsa okulunuzla iletişime geçin; öğrenci ve veli bilgilerini okul yönetimi yükler.',
    ogretmen: 'Öğretmen hesapları Kardelen Okul tarafından açılır. Hesabınız yoksa okul yönetiminize başvurun.',
    okul: 'Okul yönetimi hesapları Kardelen Okul tarafından açılır. Anlaşma ve hesap talepleri için bizimle iletişime geçin.',
  }[rol];

  return (
    <div className="flex w-full max-w-[480px] flex-col gap-6 rounded-[20px] bg-white p-8 shadow-[0_12px_40px_rgba(23,35,52,0.10)]">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-baslik text-[26px] font-extrabold">{baslik}</h2>
        <span className="text-[15px] text-metin-2">Kim olarak giriş yapıyorsunuz?</span>
      </div>

      <div role="group" aria-label="Giriş türü" className="grid grid-cols-3 gap-2.5">
        {ROLLER.map((r) => {
          const on = rol === r.id;
          return (
            <button key={r.id} type="button" aria-pressed={on} onClick={() => rolSec(r.id)}
              className={`flex min-h-[92px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 px-1.5 py-2.5 text-center font-baslik text-sm font-bold ${on ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white text-lacivert'}`}>
              <span className={`inline-flex size-9 items-center justify-center rounded-[10px] ${on ? 'bg-turuncu text-lacivert' : 'bg-zemin text-lacivert'}`}><RolIkonu rol={r.id} /></span>
              {r.ad}
            </button>
          );
        })}
      </div>

      {hata && <p role="alert" className="rounded-xl bg-kirmizi-zemin px-4 py-3 text-sm font-semibold text-kirmizi">{hata}</p>}
      {bilgi && <p className="rounded-xl bg-sari-zemin px-4 py-3 text-sm font-semibold text-sari">{bilgi}</p>}

      {rol === 'veli' && adim === 'telefon' && (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); kodIste('IlkGiris'); }}>
          <div className="flex flex-col gap-2">
            <label htmlFor="tel" className="etiket">Cep telefonu</label>
            <div className="flex items-center overflow-hidden rounded-xl border-2 border-kenar focus-within:border-lacivert">
              <span className="border-r border-cizgi px-3.5 font-bold leading-[48px] text-metin-2">+90</span>
              <input id="tel" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="5XX XXX XX XX" value={telefon}
                onChange={(e) => setTelefon(e.target.value)} className="h-12 min-w-0 flex-1 px-3.5 text-[17px] outline-none" />
            </div>
            <span className="text-[13px] text-metin-3">Okulunuza bildirdiğiniz numarayı girin.</span>
          </div>
          <button type="submit" disabled={bekliyor} className="btn-koyu">İlk giriş: SMS kodu gönder</button>
          <button type="button" onClick={() => { setHata(''); setAdim('sifreyleGiris'); }} className="btn-cerceve">Şifremle giriş yapacağım</button>
        </form>
      )}

      {rol === 'veli' && adim === 'kod' && (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); kodDogrula(); }}>
          <span className="text-[15px] leading-relaxed text-metin-2">{maske} numarasına gönderilen 6 haneli kodu girin.</span>
          <label htmlFor="kod" className="sr-only">Doğrulama kodu</label>
          <input id="kod" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={kod}
            onChange={(e) => setKod(e.target.value.replace(/\D/g, ''))}
            className="girdi h-14 text-center font-baslik text-2xl font-bold tracking-[0.5em]" placeholder="000000" />
          <button type="submit" disabled={bekliyor || kod.length !== 6} className="btn-koyu">Doğrula</button>
          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" onClick={() => kodIste(amac)} disabled={bekliyor} className="min-h-11 font-bold underline">Kodu yeniden gönder</button>
            <button type="button" onClick={() => setAdim('telefon')} className="min-h-11 font-bold underline">Numarayı değiştir</button>
          </div>
        </form>
      )}

      {rol === 'veli' && adim === 'sifreBelirle' && (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); sifreKaydet(); }}>
          <span className="text-[15px] leading-relaxed text-metin-2">Numaranız doğrulandı. Sonraki girişleriniz için şifrenizi belirleyin.</span>
          {amac === 'IlkGiris' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="ad" className="etiket">Adınız soyadınız</label>
              <input id="ad" className="girdi" value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} autoComplete="name" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor="s1" className="etiket">Yeni şifre</label>
            <input id="s1" type="password" className="girdi" value={sifre} onChange={(e) => setSifre(e.target.value)} autoComplete="new-password" placeholder="En az 8 karakter, harf ve rakam" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="s2" className="etiket">Yeni şifre (tekrar)</label>
            <input id="s2" type="password" className="girdi" value={sifre2} onChange={(e) => setSifre2(e.target.value)} autoComplete="new-password" />
          </div>
          <button type="submit" disabled={bekliyor} className="btn-turuncu">Kaydet ve devam et</button>
        </form>
      )}

      {rol === 'veli' && adim === 'sifreyleGiris' && (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); veliGiris(); }}>
          <div className="flex flex-col gap-2">
            <label htmlFor="tel2" className="etiket">Cep telefonu</label>
            <input id="tel2" type="tel" className="girdi" value={telefon} onChange={(e) => setTelefon(e.target.value)} autoComplete="tel-national" placeholder="5XX XXX XX XX" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="vs" className="etiket">Şifre</label>
            <input id="vs" type="password" className="girdi" value={sifre} onChange={(e) => setSifre(e.target.value)} autoComplete="current-password" />
          </div>
          <button type="submit" disabled={bekliyor} className="btn-koyu">Giriş yap</button>
          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" onClick={() => kodIste('SifreSifirlama')} className="min-h-11 font-bold underline">Şifremi unuttum</button>
            <button type="button" onClick={() => setAdim('telefon')} className="min-h-11 font-bold underline">SMS ile giriş</button>
          </div>
        </form>
      )}

      {rol !== 'veli' && (
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); personelGiris(); }}>
          <div className="flex flex-col gap-2">
            <label htmlFor="eposta" className="etiket">E-posta</label>
            <input id="eposta" type="email" className="girdi" value={eposta} onChange={(e) => setEposta(e.target.value)} autoComplete="username" placeholder="ad.soyad@okul.k12.tr" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ps" className="etiket">Şifre</label>
            <input id="ps" type="password" className="girdi" value={sifre} onChange={(e) => setSifre(e.target.value)} autoComplete="current-password" />
          </div>
          <button type="submit" disabled={bekliyor} className="btn-koyu">{rol === 'okul' ? 'Okul paneline gir' : 'Öğretmen olarak gir'}</button>
          <span className="text-sm text-metin-3">Şifrenizi unuttuysanız Kardelen Okul ile iletişime geçin; şifre yenileme bağlantısı e-postanıza gönderilir.</span>
        </form>
      )}

      <p className="border-t border-cizgi pt-4 text-[13px] leading-relaxed text-metin-3">{yardim}</p>
    </div>
  );
}
