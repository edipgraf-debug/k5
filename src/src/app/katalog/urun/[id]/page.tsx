import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { kampanyaUygula, urunKaydiKalemi } from '@/lib/kalem';
import { kategoriYolu, veliOgrencileri } from '@/lib/katalog';
import { tl, tarihSaat } from '@/lib/bicim';
import UstCubuk from '@/components/UstCubuk';
import StokRozeti from '@/components/StokRozeti';
import SepeteEkle from '@/components/katalog/SepeteEkle';
import IcerikMetni from '@/components/IcerikMetni';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Ürün' };

export default async function UrunDetay({ params }: { params: Promise<{ id: string }> }) {
  const o = await oturumAl();
  if (!o) redirect('/giris');
  const id = Number((await params).id);
  const t = await ticaretRepo();
  const u = Number.isInteger(id) && id > 0 ? await t.urunKaydi(id) : null;
  if (!u || (!u.aktif && o.rol !== 'yonetim')) notFound();
  const [[k], kategoriler, ogrenciler] = await Promise.all([kampanyaUygula([urunKaydiKalemi(u)]), t.kategoriler(false), veliOgrencileri(o)]);
  return (
    <>
      <UstCubuk rol={o.rol} ad={o.ad} kabuk />
      <Sayfa>
        <SayfaBasligi geri={{ href: '/katalog', ad: 'Katalog' }} baslik={u.ad} alt={[u.yazar, u.yayinevi].filter(Boolean).join(' · ')}>
          {o.rol === 'yonetim' && <Link href={`/yonetim/urunler/${u.id}`} className="btn-cerceve min-h-11">Ürünü düzenle</Link>}
        </SayfaBasligi>
        <div className="flex flex-wrap items-start gap-6">
          <div className="kart flex min-w-0 flex-[1_1_220px] items-center justify-center p-6 sm:max-w-[300px]">
            {u.kapakDosya
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`/api/kapak/${u.id}`} alt={`${u.ad} kapağı`} className="max-h-[360px] w-auto rounded-md" />
              : <span aria-hidden="true" className="flex h-[300px] w-[210px] items-center justify-center rounded-md bg-[#E9ECF1] font-extrabold text-metin-3">KİTAP</span>}
          </div>
          <section className="kart flex min-w-0 flex-[999_1_420px] flex-col gap-4 p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <span className="flex flex-col">
                {k.eskiFiyat != null && <span className="text-metin-3 line-through">{tl(k.eskiFiyat)}</span>}
                <span className="font-baslik text-[32px] font-extrabold">{tl(k.fiyat)}</span>
                <span className="text-[13px] text-metin-3">KDV dahil{k.kampanya ? ` · ${k.kampanya}` : ''}</span>
              </span>
              <span className="flex flex-col items-end gap-1"><StokRozeti stok={u.stok} />{u.stokTarihi && <span className="text-[12px] text-metin-3">Stok: {tarihSaat(u.stokTarihi)}</span>}</span>
            </div>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-[15px]">
              <dt className="font-bold text-metin-2">Barkod</dt><dd>{u.barkod ?? '—'}</dd>
              <dt className="font-bold text-metin-2">Stok kodu</dt><dd>{u.opakStokKodu}</dd>
              {u.kategori && <><dt className="font-bold text-metin-2">Opak kategorisi</dt><dd>{u.kategori}</dd></>}
              {u.kategoriIdleri.length > 0 && <><dt className="font-bold text-metin-2">Kategoriler</dt><dd className="flex flex-col">
                {u.kategoriIdleri.map((kid) => { const y = kategoriYolu(kategoriler, kid); const s = y.at(-1); return s ? <Link key={kid} href={`/katalog?kategori=${s.slug}`}>{y.map((x) => x.ad).join(' › ')}</Link> : null; })}
              </dd></>}
            </dl>
            {u.aciklama && <IcerikMetni metin={u.aciklama} />}
            {ogrenciler.length > 0 && <div className="max-w-[320px]"><SepeteEkle anahtar={k.anahtar} ogrenciler={ogrenciler} stokYok={u.stok === 0} /></div>}
          </section>
        </div>
      </Sayfa>
    </>
  );
}
