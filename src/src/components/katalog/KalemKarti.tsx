import Link from 'next/link';
import type { Kalem } from '@/lib/types';
import { tl } from '@/lib/bicim';
import StokRozeti from '@/components/StokRozeti';
import SepeteEkle from './SepeteEkle';

/** Katalog ve kampanya sayfalarındaki ürün / set kartı */
export default function KalemKarti({ k, ogrenciler }: { k: Kalem; ogrenciler: { id: number; ad: string; sinif: string }[] }) {
  const href = `/katalog/${k.tur === 'set' ? 'set' : 'urun'}/${k.id}`;
  return (
    <article className="kart flex min-w-0 flex-col gap-3 p-4">
      <Link href={href} className="flex gap-3 no-underline">
        {k.kapak
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={`/api/kapak/${k.id}`} alt="" className="h-28 w-20 flex-none rounded-md object-cover" />
          : <span aria-hidden="true" className={`flex h-28 w-20 flex-none items-center justify-center rounded-md text-xs font-extrabold ${k.tur === 'set' ? 'bg-lacivert text-turuncu' : 'bg-[#E9ECF1] text-metin-3'}`}>{k.tur === 'set' ? 'SET' : 'KİTAP'}</span>}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-baslik text-[15px] font-extrabold text-lacivert">{k.ad}</span>
          <span className="text-[13px] text-metin-2">{k.alt}</span>
          {k.barkod && <span className="text-[12px] text-metin-3">Barkod {k.barkod}</span>}
          {k.kampanya && <span className="self-start rounded-md bg-[#FBEBDD] px-2 py-0.5 text-[12px] font-extrabold text-[#8A4413]">{k.kampanya}</span>}
        </span>
      </Link>
      {k.icerik && <span className="text-[13px] text-metin-3">İçerik: {k.icerik.map((x) => (x.adet > 1 ? `${x.adet}× ${x.ad}` : x.ad)).join(', ')}</span>}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-2">
        <StokRozeti stok={k.stok} />
        <span className="flex flex-col items-end">
          {k.eskiFiyat != null && <span className="text-[13px] text-metin-3 line-through">{tl(k.eskiFiyat)}</span>}
          <span className="font-baslik text-lg font-extrabold">{tl(k.fiyat)}</span>
        </span>
      </div>
      {ogrenciler.length > 0 && <SepeteEkle anahtar={k.anahtar} ogrenciler={ogrenciler} stokYok={k.stok === 0} />}
    </article>
  );
}
