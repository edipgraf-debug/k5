'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DurumMesaji, FormKarti, useIstek } from './ortak';

export type AlanTanimi =
  | { ad: string; etiket: string; tur: 'metin' | 'uzun' | 'eposta'; ipucu?: string; yerTutucu?: string; genis?: boolean }
  | { ad: string; etiket: string; tur: 'sayi' | 'tutar'; ipucu?: string; yerTutucu?: string; min?: number; max?: number }
  | { ad: string; etiket: string; tur: 'anahtar'; ipucu?: string }
  | { ad: string; etiket: string; tur: 'secim'; secenekler: { id: string; ad: string }[]; ipucu?: string };

/** Ayar tablosundaki bir grubu düzenler (firma, WhatsApp, ödeme, havale, kargo, SMS, e-posta). Şifre alanı yalnız yazılır, gösterilmez. */
export default function AyarGrubuFormu({ grup, baslik, ust, alanlar, degerler, sifre, aciklama, children }:
  { grup: string; baslik: string; ust?: string; alanlar: AlanTanimi[]; degerler: Record<string, string>; aciklama?: React.ReactNode;
    sifre?: { etiket: string; kayitli: boolean; ipucu?: string }; children?: React.ReactNode }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(alanlar.map((a) => [a.ad, degerler[a.ad] ?? ''])));
  const [yeniSifre, setYeniSifre] = useState('');
  const [sifreSil, setSifreSil] = useState(false);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    const out: Record<string, unknown> = {};
    for (const a of alanlar) {
      const x = v[a.ad] ?? '';
      if (a.tur === 'anahtar') out[a.ad] = x === '1';
      else if (a.tur === 'sayi') out[a.ad] = Number(x);
      else if (a.tur === 'tutar') out[a.ad] = x.trim() === '' ? '' : Number(x.replace(/\./g, '').replace(',', '.'));
      else out[a.ad] = x;
    }
    const r = await gonder(`/api/yonetim/ayarlar`, 'PUT', { grup, degerler: out, ...(sifre ? { sifre: yeniSifre || undefined, sifreSil } : {}) }, `${baslik} kaydedildi`);
    if (r) { setYeniSifre(''); setSifreSil(false); router.refresh(); }
  }

  return (
    <form onSubmit={kaydet} noValidate>
      <FormKarti ust={ust} baslik={baslik}>
        {aciklama && <div className="text-sm leading-relaxed text-metin-2">{aciklama}</div>}
        <DurumMesaji durum={durum} />
        <div className="flex flex-wrap gap-4 [&>*]:flex-[1_1_240px]">
          {alanlar.map((a) => {
            const id = `${grup}-${a.ad}`;
            if (a.tur === 'anahtar') {
              return (
                <label key={a.ad} className="flex min-h-12 cursor-pointer items-center gap-3 self-end">
                  <input type="checkbox" role="switch" checked={v[a.ad] === '1'} onChange={(e) => setV({ ...v, [a.ad]: e.target.checked ? '1' : '0' })} className="size-5 accent-lacivert" />
                  <span className="flex flex-col"><span className="font-bold">{a.etiket}</span>{a.ipucu && <span className="text-[13px] text-metin-3">{a.ipucu}</span>}</span>
                </label>
              );
            }
            return (
              <div key={a.ad} className={`flex min-w-0 flex-col gap-1.5 ${'genis' in a && a.genis || a.tur === 'uzun' ? 'basis-full' : ''}`}>
                <label htmlFor={id} className="etiket">{a.etiket}</label>
                {a.tur === 'secim' ? (
                  <select id={id} className="girdi" value={v[a.ad]} onChange={(e) => setV({ ...v, [a.ad]: e.target.value })}>
                    {a.secenekler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
                  </select>
                ) : a.tur === 'uzun' ? (
                  <textarea id={id} className="girdi min-h-[90px] py-3" value={v[a.ad]} onChange={(e) => setV({ ...v, [a.ad]: e.target.value })} />
                ) : (
                  <input id={id} className="girdi" type={a.tur === 'eposta' ? 'email' : a.tur === 'sayi' ? 'number' : 'text'} inputMode={a.tur === 'tutar' ? 'decimal' : undefined}
                    min={'min' in a ? a.min : undefined} max={'max' in a ? a.max : undefined} placeholder={'yerTutucu' in a ? a.yerTutucu : undefined}
                    value={v[a.ad]} onChange={(e) => setV({ ...v, [a.ad]: e.target.value })} />
                )}
                {a.ipucu && <span className="text-[13px] text-metin-3">{a.ipucu}</span>}
              </div>
            );
          })}
        </div>
        {sifre && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-zemin p-4">
            <label htmlFor={`${grup}-sifre`} className="etiket">{sifre.etiket}</label>
            <input id={`${grup}-sifre`} type="password" autoComplete="new-password" className="girdi" value={yeniSifre} onChange={(e) => setYeniSifre(e.target.value)}
              placeholder={sifre.kayitli ? '•••••••• (kayıtlı — değiştirmek için yazın)' : 'Henüz girilmedi'} />
            <span className="text-[13px] text-metin-3">{sifre.ipucu ?? 'Şifrelenerek saklanır ve bu ekranda bir daha gösterilmez. Boş bırakılırsa kayıtlı değer korunur.'}</span>
            {sifre.kayitli && (
              <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={sifreSil} onChange={(e) => setSifreSil(e.target.checked)} className="size-5 accent-lacivert" />Kayıtlı şifreyi sil
              </label>
            )}
          </div>
        )}
        <div><button type="submit" disabled={bekliyor} className="btn-koyu">{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
        {children}
      </FormKarti>
    </form>
  );
}
