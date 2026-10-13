'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DurumMesaji, FormKarti, Secenekler, useIstek } from './ortak';

/** Kampanyayı okul yetkilileri ve öğretmenlere SMS / e-posta ile duyur */
export default function KampanyaDuyuru({ kampanyaId, okullar, smsOrnek, yayinlanabilir }:
  { kampanyaId: number; okullar: { id: number; ad: string; plasiyerAd: string | null }[]; smsOrnek: string; yayinlanabilir: boolean }) {
  const router = useRouter();
  const { durum, setDurum, bekliyor, gonder } = useIstek();
  const [hedefler, setHedefler] = useState<('Okul' | 'Ogretmen')[]>(['Okul', 'Ogretmen']);
  const [kanallar, setKanallar] = useState<('SMS' | 'Eposta')[]>(['Eposta']);
  const [tumu, setTumu] = useState(true);
  const [secili, setSecili] = useState<number[]>([]);
  const coklu = <T,>(l: T[], x: T) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]);

  async function gonderBas() {
    if (!tumu && !secili.length) { setDurum({ tip: 'hata', m: 'En az bir okul seçin' }); return; }
    if (!window.confirm('Kampanya duyurusu seçilen kişilere şimdi gönderilsin mi?')) return;
    const r = await gonder<{ sonuc: { kisi: number; sms: number; eposta: number; telefonsuz: number; hata: number } }>(
      `/api/yonetim/kampanyalar/${kampanyaId}/gonder`, 'POST', { hedefler, kanallar, okulIdleri: tumu ? null : secili });
    if (r) {
      const s = r.sonuc;
      setDurum({ tip: s.hata ? 'hata' : 'ok', m: `${s.kisi} kişiye: ${s.sms} SMS, ${s.eposta} e-posta gönderildi${s.telefonsuz ? ` · ${s.telefonsuz} kişinin telefonu yok` : ''}${s.hata ? ` · ${s.hata} gönderim başarısız` : ''}` });
      router.refresh();
    }
  }

  return (
    <FormKarti ust="DUYURU" baslik="Okul ve öğretmenlere gönder">
      <DurumMesaji durum={durum} />
      {!yayinlanabilir && <p className="rounded-xl bg-sari-zemin px-4 py-3 text-sm font-bold text-sari">Kampanya pasif ya da süresi bitmiş; duyuru gönderilemez.</p>}
      <div className="flex flex-col gap-1.5"><span className="etiket">Kime</span>
        <Secenekler etiket="Hedef" coklu secenekler={[{ id: 'Okul' as const, ad: 'Okul yetkilileri' }, { id: 'Ogretmen' as const, ad: 'Öğretmenler' }]} deger={hedefler} degistir={(x) => setHedefler(coklu(hedefler, x))} />
      </div>
      <div className="flex flex-col gap-1.5"><span className="etiket">Kanal</span>
        <Secenekler etiket="Kanal" coklu secenekler={[{ id: 'Eposta' as const, ad: 'E-posta', alt: 'Ürün listesiyle' }, { id: 'SMS' as const, ad: 'SMS', alt: 'Kısa duyuru + bağlantı' }]} deger={kanallar} degistir={(x) => setKanallar(coklu(kanallar, x))} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="etiket">Okullar</span>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 font-bold"><input type="checkbox" checked={tumu} onChange={(e) => setTumu(e.target.checked)} className="size-5 accent-lacivert" />Tüm anlaşmalı okullar ({okullar.length})</label>
        {!tumu && (
          <div className="grid max-h-60 grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-4 overflow-y-auto rounded-xl border border-cizgi p-3">
            {okullar.map((o) => (
              <label key={o.id} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={secili.includes(o.id)} onChange={() => setSecili(coklu(secili, o.id))} className="size-5 accent-lacivert" />
                <span>{o.ad}{o.plasiyerAd && <span className="text-metin-3"> · {o.plasiyerAd}</span>}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {kanallar.includes('SMS') && <div className="rounded-xl bg-zemin p-3 text-sm"><span className="etiket">SMS metni</span><p className="mt-1 font-mono text-[13px]">{smsOrnek}</p></div>}
      <div><button type="button" onClick={gonderBas} disabled={bekliyor || !yayinlanabilir || !hedefler.length || !kanallar.length} className="btn-turuncu">{bekliyor ? 'Gönderiliyor…' : 'Duyuruyu gönder'}</button></div>
    </FormKarti>
  );
}
