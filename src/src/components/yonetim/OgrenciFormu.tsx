'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { OgrenciKaydi, SinifKaydi } from '@/lib/data/yonetim';
import { Alan, Anahtar, DurumMesaji, FormKarti, Satir, Secenekler, useIstek } from './ortak';
import { useSubeler } from './useSubeler';

interface OkulSecenek { id: number; kod: string; ad: string }

/** Yeni öğrenci (ilk veliyle) ya da öğrenci bilgileri / şube değişikliği */
export default function OgrenciFormu({ ogrenci, okullar, okulId: baslangicOkul, siniflar }:
  { ogrenci?: OgrenciKaydi; okullar?: OkulSecenek[]; okulId?: number | null; siniflar?: SinifKaydi[] }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [okulId, setOkulId] = useState<number | null>(ogrenci?.okulId ?? baslangicOkul ?? null);
  const { subeler, yukleniyor } = useSubeler(okulId, ogrenci || baslangicOkul === okulId ? siniflar : undefined);
  const [v, setV] = useState({ okulNo: ogrenci?.okulNo ?? '', ad: ogrenci?.ad ?? '', soyad: ogrenci?.soyad ?? '', subeId: ogrenci?.subeId ?? 0, aktif: ogrenci?.aktif ?? true });
  const [veli, setVeli] = useState({ telefon: '', adSoyad: '', eposta: '', yakinlik: '' });
  const [sonraki, setSonraki] = useState(false);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (ogrenci) {
      if (await gonder(`/api/yonetim/ogrenciler/${ogrenci.id}`, 'PUT', v, 'Öğrenci bilgileri kaydedildi')) router.refresh();
      return;
    }
    const r = await gonder<{ id: number; veliMesaj: string | null }>('/api/yonetim/ogrenciler', 'POST',
      { ...v, okulId, veli: veli.telefon.trim() ? veli : undefined });
    if (!r) return;
    if (sonraki) {
      // aynı okul ve şubede bir sonraki öğrenci
      setV({ ...v, okulNo: '', ad: '', soyad: '' });
      setVeli({ telefon: '', adSoyad: '', eposta: '', yakinlik: '' });
      router.refresh();
      document.getElementById('ogr-okulNo')?.focus();
    } else router.push(`/yonetim/ogrenciler/${r.id}?yeni=1`);
  }

  const metin = (k: 'okulNo' | 'ad' | 'soyad') => ({ id: `ogr-${k}`, value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value }) });
  const veliAlan = (k: keyof typeof veli) => ({ id: `veli-${k}`, value: veli[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setVeli({ ...veli, [k]: e.target.value }) });

  return (
    <form onSubmit={kaydet} noValidate>
      <FormKarti ust="ÖĞRENCİ" baslik={ogrenci ? 'Öğrenci bilgileri' : 'Yeni öğrenci'}>
        <DurumMesaji durum={durum} />
        {!ogrenci && okullar && (
          <Alan id="ogr-okul" etiket="Okul" zorunlu>
            <select id="ogr-okul" className="girdi" value={okulId ?? ''} onChange={(e) => { setOkulId(Number(e.target.value) || null); setV({ ...v, subeId: 0 }); }}>
              <option value="">Okul seçin</option>
              {okullar.map((o) => <option key={o.id} value={o.id}>{o.kod} · {o.ad}</option>)}
            </select>
          </Alan>
        )}
        {ogrenci && <p className="text-sm text-metin-2">Okul: <strong>{ogrenci.okulAd}</strong> <span className="text-metin-3">(başka okula geçen öğrenci için yeni kayıt açın)</span></p>}
        <Satir>
          <Alan id="ogr-okulNo" etiket="Okul no" zorunlu><input className="girdi" inputMode="numeric" {...metin('okulNo')} /></Alan>
          <Alan id="ogr-ad" etiket="Ad" zorunlu><input className="girdi" {...metin('ad')} /></Alan>
          <Alan id="ogr-soyad" etiket="Soyad" zorunlu><input className="girdi" {...metin('soyad')} /></Alan>
        </Satir>
        <div className="flex flex-col gap-1.5">
          <span className="etiket">Şube <span className="text-kiremit" aria-hidden="true">*</span></span>
          {okulId ? (subeler.length
            ? <Secenekler etiket="Şube" secenekler={subeler} deger={v.subeId} degistir={(id) => setV({ ...v, subeId: id })} />
            : <span className="text-sm text-metin-2">{yukleniyor ? 'Şubeler yükleniyor…' : <>Bu okulda şube yok. <Link href={`/yonetim/okullar/${okulId}?sekme=siniflar`} className="font-bold">Sınıf ve şube açın →</Link></>}</span>)
            : <span className="text-sm text-metin-3">Önce okul seçin.</span>}
        </div>

        {!ogrenci && (
          <fieldset className="flex flex-col gap-4 rounded-xl border border-cizgi p-4">
            <legend className="px-1 font-baslik text-[15px] font-extrabold">Veli (isteğe bağlı, sonra da eklenebilir)</legend>
            <Satir>
              <Alan id="veli-telefon" etiket="Cep telefonu" ipucu="Velinin giriş numarası. Kayıtlıysa kardeş olarak bağlanır."><input className="girdi" inputMode="tel" placeholder="5XX XXX XX XX" {...veliAlan('telefon')} /></Alan>
              <Alan id="veli-adSoyad" etiket="Ad soyad"><input className="girdi" {...veliAlan('adSoyad')} /></Alan>
            </Satir>
            <Satir>
              <Alan id="veli-eposta" etiket="E-posta" ipucu="Varsa sepet bildirimleri e-postayla da gider"><input className="girdi" type="email" {...veliAlan('eposta')} /></Alan>
              <Alan id="veli-yakinlik" etiket="Yakınlık"><input className="girdi" placeholder="Anne, Baba…" {...veliAlan('yakinlik')} /></Alan>
            </Satir>
          </fieldset>
        )}

        {ogrenci && <Anahtar etiket="Öğrenci aktif" aciklama="Pasif öğrenci sepetlerde ve listelerde görünmez; velisine bildirim gitmez." deger={v.aktif} degistir={(x) => setV({ ...v, aktif: x })} />}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={bekliyor} className="btn-koyu">{bekliyor ? 'Kaydediliyor…' : ogrenci ? 'Kaydet' : 'Öğrenciyi ekle'}</button>
          {!ogrenci && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={sonraki} onChange={(e) => setSonraki(e.target.checked)} className="size-5 accent-lacivert" />
              Kaydettikten sonra aynı şubeye yeni öğrenci gir
            </label>
          )}
        </div>
      </FormKarti>
    </form>
  );
}
