import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { setKalemi } from '@/lib/kalem';
import { veliOgrencileri } from '@/lib/katalog';
import { tl } from '@/lib/bicim';
import UstCubuk from '@/components/UstCubuk';
import StokRozeti from '@/components/StokRozeti';
import SepeteEkle from '@/components/katalog/SepeteEkle';
import { Bolum, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';

export const metadata = { title: 'Set' };

export default async function SetDetay({ params }: { params: Promise<{ id: string }> }) {
  const o = await oturumAl();
  if (!o) redirect('/giris');
  const id = Number((await params).id);
  const s = Number.isInteger(id) && id > 0 ? await (await ticaretRepo()).setKaydi(id) : null;
  if (!s || (!s.aktif && o.rol !== 'yonetim')) notFound();
  const k = setKalemi(s);
  const ogrenciler = await veliOgrencileri(o);
  return (
    <>
      <UstCubuk rol={o.rol} ad={o.ad} kabuk />
      <Sayfa>
        <SayfaBasligi geri={{ href: '/katalog', ad: 'Katalog' }} baslik={s.ad} alt={<>Set barkodu {s.barkod}{s.aciklama ? ` · ${s.aciklama}` : ''}</>}>
          {o.rol === 'yonetim' && <Link href={`/yonetim/setler/${s.id}`} className="btn-cerceve min-h-11">Seti düzenle</Link>}
        </SayfaBasligi>
        <section className="kart flex flex-wrap items-end justify-between gap-4 p-6">
          <span className="flex flex-col">
            {s.fiyat != null && s.fiyat < s.icerikToplami && <span className="text-metin-3 line-through">{tl(s.icerikToplami)}</span>}
            <span className="font-baslik text-[32px] font-extrabold">{tl(s.satisFiyati)}</span>
            <span className="text-[13px] text-metin-3">KDV dahil · siparişte içindeki ürünler ayrı satırlar olarak işlenir</span>
          </span>
          <StokRozeti stok={k.stok} />
          {ogrenciler.length > 0 && <div className="w-full max-w-[320px]"><SepeteEkle anahtar={k.anahtar} ogrenciler={ogrenciler} stokYok={k.stok === 0} /></div>}
        </section>
        <Bolum id="icerik" ust="SET İÇERİĞİ" baslik={`${s.satirlar.length} ürün`}>
          <div className={TABLO.sar}>
            <table className={TABLO.tablo}>
              <thead><tr><th scope="col" className={TABLO.th}>Ürün</th><th scope="col" className={TABLO.th}>Adet</th><th scope="col" className={TABLO.th}>Birim fiyat</th><th scope="col" className={TABLO.th}>Stok</th></tr></thead>
              <tbody>
                {s.satirlar.map((x) => (
                  <tr key={x.urunId}>
                    <td className={TABLO.td}><Link href={`/katalog/urun/${x.urunId}`} className="font-bold">{x.ad}</Link><span className="block text-[13px] text-metin-3">{[x.yayinevi, x.barkod].filter(Boolean).join(' · ')}</span></td>
                    <td className={TABLO.td}>{x.adet}</td><td className={TABLO.td}>{tl(x.birimFiyat)}</td><td className={TABLO.td}><StokRozeti stok={x.stok} kucuk /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bolum>
      </Sayfa>
    </>
  );
}
