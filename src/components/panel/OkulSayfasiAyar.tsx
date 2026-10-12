'use client';

import { useState } from 'react';
import type { OkulBilgi } from '@/lib/types';
import { slugGecerli, slugOner } from '@/lib/slug';
import KopyalaButonu from './KopyalaButonu';

/** Kardelen: okulun giriş adresi ve girişte isteğe bağlı logo. */
export default function OkulSayfasiAyar({ baslangic, site }: { baslangic: OkulBilgi; site: string }) {
  const [okul, setOkul] = useState(baslangic);
  const [slug, setSlug] = useState(baslangic.slug ?? slugOner(baslangic.ad));
  const [hata, setHata] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [bekliyor, setBekliyor] = useState(false);
  const [surum, setSurum] = useState(0);
  const alan = site.replace(/^https?:\/\//, '');
  const slugTemiz = slug.trim().toLowerCase();
  const slugUygun = slugGecerli(slugTemiz);

  async function calistir(f: () => Promise<Response>, basari: string) {
    setHata(''); setMesaj(''); setBekliyor(true);
    try {
      const r = await f();
      const v = await r.json().catch(() => ({}));
      if (!r.ok) { setHata(v.hata ?? 'İşlem yapılamadı'); return; }
      setOkul(v.okul); setSurum((x) => x + 1); setMesaj(basari);
    } catch { setHata('Bağlantı hatası'); } finally { setBekliyor(false); }
  }
  const json = (body: unknown) => ({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  const adresKaydet = () => calistir(() => fetch(`/api/yonetim/okullar/${okul.id}`, json({ slug: slugTemiz })), 'Giriş adresi kaydedildi');
  const logoGoster = (deger: boolean) => calistir(() => fetch(`/api/yonetim/okullar/${okul.id}`, json({ logoGoster: deger })), deger ? 'Logo girişte gösteriliyor' : 'Logo girişte gizlendi');
  const logoKaldir = () => calistir(() => fetch(`/api/yonetim/okullar/${okul.id}/logo`, { method: 'DELETE' }), 'Logo kaldırıldı');
  function logoYukle(f: File | undefined) {
    if (!f) return;
    if (f.size > 1024 * 1024) { setHata('Logo en fazla 1 MB olabilir'); return; }
    const fd = new FormData();
    fd.append('logo', f);
    calistir(() => fetch(`/api/yonetim/okullar/${okul.id}/logo`, { method: 'POST', body: fd }), 'Logo yüklendi. Girişte göstermek için anahtarı açın.');
  }

  return (
    <section aria-labelledby="okul-sayfasi" className="kart flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-extrabold tracking-wider text-kiremit">OKUL SAYFASI</span>
        <h2 id="okul-sayfasi" className="font-baslik text-lg font-extrabold">Giriş adresi ve logo</h2>
      </div>
      {hata && <p role="alert" className="rounded-xl bg-kirmizi-zemin px-4 py-3 text-sm font-semibold text-kirmizi">{hata}</p>}
      {mesaj && <p role="status" className="rounded-xl bg-yesil-zemin px-4 py-3 text-sm font-bold text-yesil">✓ {mesaj}</p>}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="slug" className="etiket">Giriş adresi</label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-baslik text-[15px] font-semibold text-metin-2">{alan}/</span>
          <input id="slug" className="girdi max-w-[320px] flex-[1_1_200px]" value={slug} onChange={(e) => setSlug(e.target.value)}
            aria-describedby="slug-ipucu" aria-invalid={!slugUygun} autoComplete="off" spellCheck={false} />
          <button type="button" onClick={adresKaydet} disabled={bekliyor || !slugUygun || slugTemiz === okul.slug} className="btn-koyu min-h-12">Kaydet</button>
        </div>
        <span id="slug-ipucu" className={`text-[13px] ${slugUygun ? 'text-metin-3' : 'font-bold text-kirmizi'}`}>
          {slugUygun ? 'Küçük harf, rakam ve tire. Veliye giden SMS ve e-postalardaki bağlantı bu adres olur.' : 'Geçersiz adres: 3–80 karakter, küçük harf / rakam / tire; ayrılmış adlar (giris, veli, okul…) kullanılamaz.'}
        </span>
        {okul.slug && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-metin-2">Yayındaki adres:</span>
            <a href={`/${okul.slug}`} target="_blank" rel="noopener" className="font-bold">{alan}/{okul.slug}</a>
            <KopyalaButonu metin={`${site}/${okul.slug}`} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-5 border-t border-[#EEF0F3] pt-5">
        <div className="flex size-24 flex-none items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-kenar bg-zemin">
          {okul.logoDosya && okul.slug ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/okul-logo/${okul.slug}?onizleme=1&s=${surum}`} alt={`${okul.ad} logosu`} className="size-20 object-contain" />
          ) : <span className="px-2 text-center text-xs font-bold text-metin-3">{okul.logoDosya ? 'Önce adres kaydedin' : 'Logo yok'}</span>}
        </div>
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <label className={`btn-cerceve min-h-11 ${bekliyor ? 'pointer-events-none opacity-60' : ''}`}>
              {okul.logoDosya ? 'Logoyu değiştir' : 'Logo yükle'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { logoYukle(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {okul.logoDosya && <button type="button" onClick={logoKaldir} disabled={bekliyor} className="btn-cerceve min-h-11 border-kenar text-kirmizi">Logoyu kaldır</button>}
          </div>
          <label className={`flex min-h-11 items-center gap-3 font-bold ${okul.logoDosya ? 'cursor-pointer' : 'cursor-not-allowed text-metin-3'}`}>
            <input type="checkbox" role="switch" checked={okul.logoGoster} disabled={!okul.logoDosya || bekliyor}
              onChange={(e) => logoGoster(e.target.checked)} className="size-5 accent-lacivert" />
            Girişte okul logosunu göster (isteğe bağlı)
          </label>
          <span className="text-[13px] text-metin-3">PNG, JPG veya WEBP · en fazla 1 MB · kare ve şeffaf zeminli logo en iyi sonucu verir. Kapalıyken giriş sayfasında yalnız okul adı görünür.</span>
        </div>
      </div>
    </section>
  );
}
