import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { repo } from '@/lib/data/repo';
import UstCubuk from '@/components/UstCubuk';
import VeliListe, { type OgrenciGorunumu } from './VeliListe';

export const metadata = { title: 'Tavsiye sepeti' };

export default async function VeliAnaSayfa() {
  const o = await oturumAl();
  if (!o || o.rol !== 'veli') redirect('/giris');
  const r = await repo();
  const ogrenciler = await r.veliOgrencileri(o.sub);

  // Veli yalnız öğrencisine tanımlı (yayındaki) listelerin ürünlerini görür.
  const gorunum: OgrenciGorunumu[] = [];
  for (const og of ogrenciler) {
    const listeler = await r.ogrenciListeleri(og.id);
    const urunler = await r.urunler([...new Set(listeler.flatMap((l) => l.satirlar.map((s) => s.urunId)))]);
    const satirlar = listeler.flatMap((l) =>
      l.satirlar.map((s) => {
        const u = urunler.find((x) => x.id === s.urunId)!;
        return { listeId: l.id, listeAd: l.ad, urunId: u.id, ad: u.ad, yayinevi: u.yayinevi ?? '', barkod: u.barkod ?? '', fiyat: s.satisFiyati ?? u.fiyat, zorunlu: s.zorunlu };
      }),
    );
    gorunum.push({ id: og.id, ad: `${og.ad} ${og.soyad}`, okul: og.okulAd, sinif: og.sinifSube, no: og.okulNo, satirlar });
  }

  return (
    <>
      <UstCubuk rol="veli" ad={o.ad} aktif="/veli" />
      <VeliListe ogrenciler={gorunum} veliAd={o.ad} />
    </>
  );
}
