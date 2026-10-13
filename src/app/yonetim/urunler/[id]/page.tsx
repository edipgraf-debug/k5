import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { idParam } from '@/lib/yonetim-api';
import { tarihSaat, tl } from '@/lib/bicim';
import { kategoriYolu } from '@/lib/katalog';
import UrunFormu from '@/components/yonetim/UrunFormu';
import StokRozeti from '@/components/StokRozeti';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Ürün' };

export default async function UrunSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const id = idParam((await params).id);
  const t = await ticaretRepo();
  const u = id ? await t.urunKaydi(id) : null;
  if (!u) notFound();
  const kategoriler = await t.kategoriler();
  return (
    <Sayfa>
      <SayfaBasligi geri={{ href: '/yonetim/urunler', ad: 'Ürünler' }} baslik={u.ad} alt={[u.yazar, u.yayinevi].filter(Boolean).join(' · ')}>
        <Link href={`/katalog/urun/${u.id}`} className="btn-cerceve min-h-11">Katalogda gör</Link>
      </SayfaBasligi>
      <div className="flex flex-wrap items-start gap-6">
        <section className="kart flex min-w-0 flex-[1_1_300px] flex-col gap-2 p-6 text-[15px]">
          <span className="text-xs font-extrabold tracking-wider text-kiremit">OPAK'TAN GELEN</span>
          <span><strong>Stok kodu:</strong> {u.opakStokKodu}</span>
          <span><strong>Barkod:</strong> {u.barkod ?? '—'}</span>
          <span><strong>Opak kategorisi:</strong> {u.kategori ?? '—'}</span>
          <span><strong>Liste fiyatı:</strong> {tl(u.listeFiyati)}</span>
          <span className="flex flex-wrap items-center gap-2"><strong>Depo stoku:</strong> <StokRozeti stok={u.stok} kucuk />{u.stokTarihi && <span className="text-[13px] text-metin-3">{tarihSaat(u.stokTarihi)}</span>}</span>
          <span className="text-[13px] text-metin-3">Son senkron: {u.senkron ? tarihSaat(u.senkron) : '—'}</span>
          <span className="mt-2 text-xs font-extrabold tracking-wider text-kiremit">SİTEDE</span>
          <span><strong>Veliye yansıyan:</strong> {tl(u.fiyat)}</span>
          <span><strong>Kategoriler:</strong> {u.kategoriIdleri.length ? u.kategoriIdleri.map((k) => kategoriYolu(kategoriler, k).map((x) => x.ad).join(' › ')).join('; ') : '—'}</span>
          <span><strong>Kullanım:</strong> {u.listeSayisi} tavsiye sepeti · {u.setSayisi} set</span>
          <Link href="/yonetim/kategoriler" className="mt-1 text-sm font-bold">Kategorilere ekle / çıkar →</Link>
        </section>
        <div className="min-w-0 flex-[999_1_480px]"><UrunFormu urun={u} /></div>
      </div>
    </Sayfa>
  );
}
