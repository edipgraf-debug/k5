'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { OkulKaydi } from '@/lib/data/yonetim';
import { Alan, Anahtar, DurumMesaji, FormKarti, Satir, useIstek } from './ortak';

type Girdi = Omit<OkulKaydi, 'id' | 'slug' | 'plasiyerAd'>;
const BOS: Girdi = { kod: '', ad: '', il: 'Konya', ilce: '', adres: '', telefon: '', eposta: '', opakCariKodu: '', opakWebCariKodu: '', aktif: true, plasiyerId: null };
export interface PlasiyerSecenek { id: number; adSoyad: string; kod: string | null }

/** Yeni okul ya da okul bilgileri */
export default function OkulFormu({ okul, oneriKod, plasiyerler = [] }: { okul?: OkulKaydi; oneriKod?: string; plasiyerler?: PlasiyerSecenek[] }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [v, setV] = useState<Girdi>(() => {
    if (!okul) return { ...BOS, kod: oneriKod ?? '' };
    const { id: _i, slug: _s, plasiyerAd: _p, ...g } = okul;
    return g;
  });
  const alan = (k: keyof Girdi) => ({ id: `okul-${k}`, value: (v[k] as string | null) ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value }) });

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (okul) {
      if (await gonder(`/api/yonetim/okullar/${okul.id}/bilgi`, 'PUT', v, 'Okul bilgileri kaydedildi')) router.refresh();
    } else {
      const r = await gonder<{ id: number }>('/api/yonetim/okullar', 'POST', v);
      if (r) router.push(`/yonetim/okullar/${r.id}?sekme=siniflar&yeni=1`);
    }
  }

  return (
    <form onSubmit={kaydet} noValidate>
      <FormKarti ust="OKUL" baslik={okul ? 'Okul bilgileri' : 'Yeni okul'}>
        <DurumMesaji durum={durum} />
        <Satir>
          <Alan id="okul-kod" etiket="Okul kodu" zorunlu ipucu="Kitabevi içi kısa kod, ör. OK-1003"><input className="girdi" {...alan('kod')} autoComplete="off" /></Alan>
          <Alan id="okul-ad" etiket="Okul adı" zorunlu genis><input className="girdi" {...alan('ad')} /></Alan>
        </Satir>
        <Satir>
          <Alan id="okul-il" etiket="İl" zorunlu><input className="girdi" {...alan('il')} /></Alan>
          <Alan id="okul-ilce" etiket="İlçe" zorunlu><input className="girdi" {...alan('ilce')} /></Alan>
          <Alan id="okul-telefon" etiket="Telefon" ipucu="Alan koduyla, ör. 0332 000 00 00"><input className="girdi" inputMode="tel" {...alan('telefon')} /></Alan>
        </Satir>
        <Satir>
          <Alan id="okul-adres" etiket="Adres" genis><input className="girdi" {...alan('adres')} /></Alan>
          <Alan id="okul-eposta" etiket="E-posta"><input className="girdi" type="email" {...alan('eposta')} /></Alan>
        </Satir>
        <Satir>
          <Alan id="okul-opakCariKodu" etiket="Opak cari kodu" ipucu="Okulun ana carisi (toplu alımlar)"><input className="girdi" {...alan('opakCariKodu')} placeholder="120 42 ...." /></Alan>
          <Alan id="okul-opakWebCariKodu" etiket="Web perakende alt cari" ipucu="Veli satışlarının işleneceği alt cari"><input className="girdi" {...alan('opakWebCariKodu')} /></Alan>
          <Alan id="okul-plasiyer" etiket="Plasiyer" ipucu="Okulun ve öğretmenlerinin varsayılan plasiyeri">
            <select id="okul-plasiyer" className="girdi" value={v.plasiyerId ?? ''} onChange={(e) => setV({ ...v, plasiyerId: Number(e.target.value) || null })}>
              <option value="">Atanmadı</option>
              {plasiyerler.map((p) => <option key={p.id} value={p.id}>{p.adSoyad}{p.kod ? ` · ${p.kod}` : ''}</option>)}
            </select>
          </Alan>
        </Satir>
        {okul && <Anahtar etiket="Okul aktif" aciklama="Pasif okulun giriş adresi kapanır ve listelerde görünmez." deger={v.aktif} degistir={(x) => setV({ ...v, aktif: x })} />}
        <div className="flex flex-wrap gap-2.5">
          <button type="submit" disabled={bekliyor} className="btn-koyu">{bekliyor ? 'Kaydediliyor…' : okul ? 'Kaydet' : 'Okulu oluştur'}</button>
          {!okul && <span className="self-center text-sm text-metin-3">Sonraki adımda sınıf ve şubeleri açacaksınız.</span>}
        </div>
      </FormKarti>
    </form>
  );
}
