import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { veliOgrencileri } from '@/lib/katalog';
import { kampanyaUygula } from '@/lib/kalem';
import { tarihMetni } from '@/lib/bicim';
import type { Kalem } from '@/lib/types';
import UstCubuk from '@/components/UstCubuk';
import KalemKarti from '@/components/katalog/KalemKarti';
import { Bos, Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Kampanyalar' };

/** Yayındaki kampanyalar ve kampanyalı ürünler (tüm kullanıcılar) */
export default async function Kampanyalar() {
  const o = await oturumAl();
  if (!o) redirect('/giris');
  const [kampanyalar, ogrenciler] = await Promise.all([(await ticaretRepo()).kampanyalar({ yayindakiler: true }), veliOgrencileri(o)]);
  const t = await ticaretRepo();
  const bolumler: { k: (typeof kampanyalar)[number]; kalemler: Kalem[] }[] = [];
  for (const k of kampanyalar) {
    const urunler = (await Promise.all(k.urunler.map((u) => t.urunKaydi(u.urunId)))).filter((u) => u?.aktif);
    const kalemler = await kampanyaUygula(urunler.map((u) => ({ anahtar: `u${u!.id}`, tur: 'urun' as const, id: u!.id, ad: u!.ad,
      alt: [u!.yayinevi, u!.yazar].filter(Boolean).join(' · '), barkod: u!.barkod, fiyat: u!.fiyat, stok: u!.stok, kapak: !!u!.kapakDosya })));
    bolumler.push({ k, kalemler });
  }
  return (
    <>
      <UstCubuk rol={o.rol} ad={o.ad} kabuk />
      <Sayfa>
        <SayfaBasligi baslik="Kampanyalar" alt="Geçerli kampanyalar ve kampanyalı ürünler. Fiyatlar KDV dahildir; stok depo miktarıdır." />
        {bolumler.length ? bolumler.map(({ k, kalemler }) => (
          <section key={k.id} aria-labelledby={`kmp-${k.id}`} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 rounded-[18px] bg-lacivert p-6 text-white">
              <span className="text-xs font-extrabold tracking-wider text-turuncu">KAMPANYA · {tarihMetni(k.baslangic)} – {tarihMetni(k.bitis)}</span>
              <h2 id={`kmp-${k.id}`} className="font-baslik text-2xl font-extrabold">{k.ad}</h2>
              {k.aciklama && <p className="text-[#C9D1DC]">{k.aciklama}</p>}
            </div>
            {kalemler.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {kalemler.map((x) => <KalemKarti key={x.anahtar} k={x} ogrenciler={ogrenciler} />)}
              </div>
            ) : <p className="text-metin-2">Bu kampanyada satışta ürün yok.</p>}
          </section>
        )) : <div className="kart"><Bos>Şu an geçerli bir kampanya yok.</Bos></div>}
      </Sayfa>
    </>
  );
}
