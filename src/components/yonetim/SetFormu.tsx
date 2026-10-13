'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SetKaydi } from '@/lib/data/ticaret';
import { Alan, Anahtar, DurumMesaji, FormKarti, Satir, useIstek } from './ortak';
import UrunSecici, { type SecilenUrun } from './UrunSecici';

const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
type Satir = SecilenUrun & { adet: number };

/** Set oluştur / düzenle: barkod (üret ya da gir), ad, ürünler ve adetleri, fiyat (boş = toplam) */
export default function SetFormu({ set }: { set?: SetKaydi }) {
  const router = useRouter();
  const { durum, setDurum, bekliyor, gonder } = useIstek();
  const [barkod, setBarkod] = useState(set?.barkod ?? '');
  const [ad, setAd] = useState(set?.ad ?? '');
  const [aciklama, setAciklama] = useState(set?.aciklama ?? '');
  const [fiyat, setFiyat] = useState(set?.fiyat != null ? String(set.fiyat).replace('.', ',') : '');
  const [aktif, setAktif] = useState(set?.aktif ?? true);
  const [satirlar, setSatirlar] = useState<Satir[]>(set?.satirlar.map((x) => ({ id: x.urunId, ad: x.ad, barkod: x.barkod, yayinevi: x.yayinevi, fiyat: x.birimFiyat, adet: x.adet })) ?? []);
  const toplam = Math.round(satirlar.reduce((a, x) => a + x.fiyat * x.adet, 0) * 100) / 100;
  const f = fiyat.trim() ? Number(fiyat.replace(/\./g, '').replace(',', '.')) : null;

  async function barkodUret() {
    const r = await gonder<{ barkod: string }>('/api/yonetim/setler/barkod', 'GET');
    if (r) setBarkod(r.barkod);
  }
  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (f != null && (!Number.isFinite(f) || f < 0)) { setDurum({ tip: 'hata', m: 'Set fiyatı geçerli bir tutar olmalı' }); return; }
    const govde = { barkod: barkod.trim(), ad, aciklama, fiyat: f, aktif, satirlar: satirlar.map((x) => ({ urunId: x.id, adet: x.adet })) };
    if (set) {
      if (await gonder(`/api/yonetim/setler/${set.id}`, 'PUT', govde, 'Set kaydedildi')) router.refresh();
    } else {
      const r = await gonder<{ id: number }>('/api/yonetim/setler', 'POST', govde);
      if (r) router.push(`/yonetim/setler/${r.id}?yeni=1`);
    }
  }

  return (
    <form onSubmit={kaydet} noValidate className="flex flex-wrap items-start gap-6">
      <div className="min-w-0 flex-[999_1_520px]">
        <FormKarti ust="SET" baslik={set ? 'Set bilgileri' : 'Yeni set'}>
          <DurumMesaji durum={durum} />
          <Satir>
            <Alan id="s-barkod" etiket="Set barkodu" zorunlu ipucu="Kendi barkodunuzu girin ya da 2 ile başlayan iç barkod üretin (ürün barkodlarıyla çakışmaz)">
              <div className="flex gap-2">
                <input id="s-barkod" className="girdi min-w-0 flex-1" value={barkod} onChange={(e) => setBarkod(e.target.value)} autoComplete="off" />
                <button type="button" onClick={barkodUret} className="btn-cerceve min-h-12 flex-none">Barkod üret</button>
              </div>
            </Alan>
            <Alan id="s-ad" etiket="Set adı" zorunlu genis><input id="s-ad" className="girdi" value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ör. 5. Sınıf Okuma Seti" /></Alan>
          </Satir>
          <Alan id="s-ac" etiket="Açıklama"><input id="s-ac" className="girdi" value={aciklama} onChange={(e) => setAciklama(e.target.value)} /></Alan>

          <div className="flex flex-col gap-2">
            <span className="etiket">Setteki ürünler ({satirlar.reduce((a, x) => a + x.adet, 0)} adet)</span>
            {satirlar.length ? (
              <ul className="flex flex-col rounded-xl border border-cizgi">
                {satirlar.map((x, i) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-3 border-b border-[#EEF0F3] px-3 py-2.5 last:border-0">
                    <span className="flex min-w-0 flex-[1_1_220px] flex-col"><span className="font-bold">{x.ad}</span><span className="text-[13px] text-metin-3">{[x.yayinevi, x.barkod].filter(Boolean).join(' · ')} · {tl(x.fiyat)}</span></span>
                    <label className="flex items-center gap-2 text-sm font-bold">Adet
                      <input type="number" min={1} max={50} value={x.adet} onChange={(e) => setSatirlar(satirlar.map((y, j) => (j === i ? { ...y, adet: Math.max(1, Math.min(50, Number(e.target.value) || 1)) } : y)))}
                        className="girdi h-11 w-20" aria-label={`${x.ad} adet`} />
                    </label>
                    <span className="w-24 text-right font-bold">{tl(x.fiyat * x.adet)}</span>
                    <button type="button" onClick={() => setSatirlar(satirlar.filter((_, j) => j !== i))} aria-label={`${x.ad} çıkar`}
                      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] border-2 border-kenar bg-white text-kirmizi">✕</button>
                  </li>
                ))}
              </ul>
            ) : <span className="text-sm text-metin-2">Henüz ürün yok. Sağdan arayıp ekleyin.</span>}
          </div>

          <Satir>
            <Alan id="s-fiyat" etiket="Set fiyatı (KDV dahil)" ipucu={`Boş bırakılırsa ürünlerin toplamı: ${tl(toplam)}`}>
              <input id="s-fiyat" className="girdi" inputMode="decimal" value={fiyat} onChange={(e) => setFiyat(e.target.value)} placeholder={String(toplam).replace('.', ',')} />
            </Alan>
          </Satir>
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-zemin px-4 py-3 text-[15px]">
            <span>İçerik toplamı: <strong>{tl(toplam)}</strong></span>
            <span>Satış fiyatı: <strong>{tl(f ?? toplam)}</strong></span>
            {f != null && toplam > 0 && <span className={f < toplam ? 'font-bold text-yesil' : 'font-bold text-sari'}>{f < toplam ? `%${Math.round((1 - f / toplam) * 100)} indirimli` : f > toplam ? 'Toplamdan yüksek' : 'Toplama eşit'}</span>}
          </div>
          <Anahtar etiket="Set satışta" aciklama="Kapalı set katalogda ve tavsiye sepeti kataloğunda görünmez." deger={aktif} degistir={setAktif} />
          <p className="text-[13px] text-metin-3">Set tavsiye sepetine tek kalem olarak eklenir; siparişte içindeki ürünler ayrı satırlar olarak Opak&apos;a aktarılır.</p>
          <div><button type="submit" disabled={bekliyor} className="btn-koyu">{bekliyor ? 'Kaydediliyor…' : set ? 'Kaydet' : 'Seti oluştur'}</button></div>
        </FormKarti>
      </div>
      <aside className="kart min-w-0 flex-[1_1_340px] p-5">
        <UrunSecici eklenenler={satirlar.map((x) => x.id)} ekle={(u) => setSatirlar([...satirlar, { ...u, adet: 1 }])} etiket="Sete ürün ekle" />
      </aside>
    </form>
  );
}
