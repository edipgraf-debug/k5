import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { repo } from '@/lib/data/repo';
import { kalemleriGetir, satirAnahtari, satirFiyati } from '@/lib/kalem';
import { ticaretRepo } from '@/lib/data/ticaret';
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
  const secimler: Record<number, string[]> = {};
  for (const og of ogrenciler) {
    const listeler = await r.ogrenciListeleri(og.id);
    // sunucudaki sepet: seçili isteğe bağlı kalemler ve katalogdan eklenenler
    const sepet = await (await ticaretRepo()).veliSepeti(o.sub, og.id);
    const listeAnahtarlari = new Set(listeler.flatMap((l) => l.satirlar.map(satirAnahtari)));
    const ekler = sepet.filter((s) => !listeAnahtarlari.has(satirAnahtari(s)));
    const kalemler = await kalemleriGetir([...listeler.flatMap((l) => l.satirlar), ...ekler]);
    const satirlar = listeler.flatMap((l) =>
      l.satirlar.flatMap((s) => {
        const k = kalemler[satirAnahtari(s)];
        if (!k) return [];
        return [{ listeId: l.id, listeAd: l.ad, anahtar: k.anahtar, tur: k.tur, ad: k.ad, yayinevi: k.alt, barkod: k.barkod ?? '', fiyat: satirFiyati(s, k), adet: s.adet,
          zorunlu: s.zorunlu, icerik: k.icerik?.map((x) => (x.adet > 1 ? `${x.adet}× ${x.ad}` : x.ad)).join(', ') ?? null, stok: k.stok ?? null, eskiFiyat: s.satisFiyati == null ? k.eskiFiyat ?? null : null }];
      }),
    );
    for (const e of ekler) {
      const k = kalemler[satirAnahtari(e)];
      if (k) satirlar.push({ listeId: 0, listeAd: 'Katalogdan eklediklerim', anahtar: k.anahtar, tur: k.tur, ad: k.ad, yayinevi: k.alt, barkod: k.barkod ?? '', fiyat: k.fiyat, adet: 1,
        zorunlu: false, icerik: k.icerik?.map((x) => (x.adet > 1 ? `${x.adet}× ${x.ad}` : x.ad)).join(', ') ?? null, stok: k.stok ?? null, eskiFiyat: k.eskiFiyat ?? null });
    }
    secimler[og.id] = sepet.map(satirAnahtari);
    gorunum.push({ id: og.id, ad: `${og.ad} ${og.soyad}`, okul: og.okulAd, sinif: og.sinifSube, no: og.okulNo, satirlar });
  }

  return (
    <>
      <UstCubuk rol="veli" ad={o.ad} aktif="/veli" />
      <VeliListe ogrenciler={gorunum} veliAd={o.ad} secimler={secimler} />
    </>
  );
}
