'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { KampanyaKaydi } from '@/lib/data/ticaret';
import { Alan, Anahtar, DurumMesaji, FormKarti, Satir, useIstek } from './ortak';
import UrunSecici from './UrunSecici';

const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const bugun = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
type Satir = { urunId: number; ad: string; yayinevi: string | null; normal: number; ozel: string };

/** Kampanya: tarih aralığı, indirim oranı ya da ürüne özel kampanya fiyatı */
export default function KampanyaFormu({ kampanya }: { kampanya?: KampanyaKaydi }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [ad, setAd] = useState(kampanya?.ad ?? '');
  const [aciklama, setAciklama] = useState(kampanya?.aciklama ?? '');
  const [baslangic, setBaslangic] = useState(kampanya?.baslangic ?? bugun());
  const [bitis, setBitis] = useState(kampanya?.bitis ?? new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
  const [oran, setOran] = useState(kampanya?.indirimOrani != null ? String(kampanya.indirimOrani) : '10');
  const [aktif, setAktif] = useState(kampanya?.aktif ?? true);
  const [satirlar, setSatirlar] = useState<Satir[]>(kampanya?.urunler.map((u) => ({ urunId: u.urunId, ad: u.ad, yayinevi: u.yayinevi, normal: u.normalFiyat,
    ozel: u.ozelFiyat != null ? String(u.ozelFiyat).replace('.', ',') : '' })) ?? []);
  const oranN = oran.trim() === '' ? null : Number(oran.replace(',', '.'));
  const fiyat = (s: Satir) => (s.ozel.trim() ? Number(s.ozel.replace(/\./g, '').replace(',', '.')) : Math.round(s.normal * (1 - (oranN ?? 0) / 100) * 100) / 100);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    const govde = { ad, aciklama, baslangic, bitis, indirimOrani: oranN, aktif,
      urunler: satirlar.map((s) => ({ urunId: s.urunId, kampanyaFiyati: s.ozel.trim() ? Number(s.ozel.replace(/\./g, '').replace(',', '.')) : null })) };
    if (kampanya) {
      if (await gonder(`/api/yonetim/kampanyalar/${kampanya.id}`, 'PUT', govde, 'Kampanya kaydedildi')) router.refresh();
    } else {
      const r = await gonder<{ id: number }>('/api/yonetim/kampanyalar', 'POST', govde);
      if (r) router.push(`/yonetim/kampanyalar/${r.id}?yeni=1`);
    }
  }

  return (
    <form onSubmit={kaydet} noValidate className="flex flex-wrap items-start gap-6">
      <div className="min-w-0 flex-[999_1_540px]">
        <FormKarti ust="KAMPANYA" baslik={kampanya ? 'Kampanya bilgileri' : 'Yeni kampanya'}>
          <DurumMesaji durum={durum} />
          <Alan id="k-ad" etiket="Kampanya adı" zorunlu><input id="k-ad" className="girdi" value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ör. Yaz Okuma Kampanyası" /></Alan>
          <Alan id="k-ac" etiket="Açıklama" ipucu="Kampanya sayfasında ve e-postada görünür"><textarea id="k-ac" className="girdi min-h-[80px] py-3" value={aciklama} onChange={(e) => setAciklama(e.target.value)} /></Alan>
          <Satir>
            <Alan id="k-bas" etiket="Başlangıç" zorunlu><input id="k-bas" type="date" className="girdi" value={baslangic} onChange={(e) => setBaslangic(e.target.value)} /></Alan>
            <Alan id="k-bit" etiket="Bitiş" zorunlu><input id="k-bit" type="date" className="girdi" value={bitis} onChange={(e) => setBitis(e.target.value)} /></Alan>
            <Alan id="k-oran" etiket="İndirim oranı %" ipucu="Ürüne özel fiyat girilmeyenlere uygulanır"><input id="k-oran" className="girdi" inputMode="decimal" value={oran} onChange={(e) => setOran(e.target.value)} /></Alan>
          </Satir>
          <div className="flex flex-col gap-2">
            <span className="etiket">Kampanyalı ürünler ({satirlar.length})</span>
            {satirlar.length ? (
              <ul className="flex flex-col rounded-xl border border-cizgi">
                {satirlar.map((s, i) => (
                  <li key={s.urunId} className="flex flex-wrap items-center gap-3 border-b border-[#EEF0F3] px-3 py-2.5 last:border-0">
                    <span className="flex min-w-0 flex-[1_1_220px] flex-col"><span className="font-bold">{s.ad}</span><span className="text-[13px] text-metin-3">{s.yayinevi ?? ''} · normal {tl(s.normal)}</span></span>
                    <label className="flex items-center gap-2 text-sm font-bold">Özel fiyat
                      <input className="girdi h-11 w-28" inputMode="decimal" value={s.ozel} onChange={(e) => setSatirlar(satirlar.map((x, j) => (j === i ? { ...x, ozel: e.target.value } : x)))} placeholder="oranla" aria-label={`${s.ad} kampanya fiyatı`} />
                    </label>
                    <span className="w-28 text-right"><strong>{tl(fiyat(s))}</strong>{fiyat(s) < s.normal && <span className="block text-[12px] text-yesil">%{Math.round((1 - fiyat(s) / s.normal) * 100)} indirim</span>}</span>
                    <button type="button" aria-label={`${s.ad} çıkar`} onClick={() => setSatirlar(satirlar.filter((_, j) => j !== i))} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] border-2 border-kenar bg-white text-kirmizi">✕</button>
                  </li>
                ))}
              </ul>
            ) : <span className="text-sm text-metin-2">Sağdan arayıp ürün ekleyin.</span>}
          </div>
          <Anahtar etiket="Kampanya aktif" aciklama="Aktif ve tarih aralığındaysa kampanya fiyatı katalogda, aramada ve veli sepetinde uygulanır." deger={aktif} degistir={setAktif} />
          <div><button type="submit" disabled={bekliyor} className="btn-koyu">{bekliyor ? 'Kaydediliyor…' : kampanya ? 'Kaydet' : 'Kampanyayı oluştur'}</button></div>
        </FormKarti>
      </div>
      <aside className="kart min-w-0 flex-[1_1_340px] p-5">
        <UrunSecici eklenenler={satirlar.map((s) => s.urunId)} etiket="Kampanyaya ürün ekle"
          ekle={(u) => setSatirlar([...satirlar, { urunId: u.id, ad: u.ad, yayinevi: u.yayinevi, normal: u.fiyat, ozel: '' }])} />
      </aside>
    </form>
  );
}
