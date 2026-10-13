import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { kampanyaUygula, setKalemi, urunKaydiKalemi } from '@/lib/kalem';
import { kategoriYolu, veliOgrencileri } from '@/lib/katalog';
import UstCubuk from '@/components/UstCubuk';
import KalemKarti from '@/components/katalog/KalemKarti';
import { Bos, Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Katalog' };
const BOY = 24;

type SP = { q?: string; kategori?: string; stokta?: string; sayfa?: string };

/** Tüm kullanıcıların katalog sayfası: kategori ağacı, arama, depo stoku, kampanya fiyatı */
export default async function Katalog({ searchParams }: { searchParams: Promise<SP> }) {
  const o = await oturumAl();
  if (!o) redirect('/giris');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const stokta = sp.stokta === '1';
  const sayfa = Math.max(1, Number(sp.sayfa) || 1);
  const t = await ticaretRepo();
  const kategoriler = await t.kategoriler(false);
  const kategori = kategoriler.find((k) => k.slug === sp.kategori) ?? null;
  const [{ satirlar, toplam }, setler, ogrenciler] = await Promise.all([
    t.urunListesi({ q, durum: 'aktif', kategoriId: kategori?.id ?? null, stokta, sayfa, sayfaBoyu: BOY }),
    !kategori && sayfa === 1 ? t.setAra(q, 6) : Promise.resolve([]),
    veliOgrencileri(o),
  ]);
  const kalemler = await kampanyaUygula([...setler.map(setKalemi), ...satirlar.map(urunKaydiKalemi)]);
  const sayfaSayisi = Math.max(1, Math.ceil(toplam / BOY));
  const adres = (ek: Partial<Record<keyof SP, string | null>>) => {
    const p = new URLSearchParams();
    const v = { q: q || null, kategori: kategori?.slug ?? null, stokta: stokta ? '1' : null, sayfa: null, ...ek };
    for (const [k, x] of Object.entries(v)) if (x) p.set(k, x);
    return `/katalog${p.size ? `?${p}` : ''}`;
  };
  const yol = kategoriYolu(kategoriler, kategori?.id ?? null);
  const altlar = kategoriler.filter((k) => k.ustId === (kategori?.id ?? null));

  return (
    <>
      <UstCubuk rol={o.rol} ad={o.ad} kabuk />
      <Sayfa>
        <SayfaBasligi baslik={kategori?.ad ?? (q ? `"${q}" araması` : 'Katalog')}
          alt={<>
            {yol.length > 0 && <><Link href="/katalog">Katalog</Link>{yol.map((k) => <span key={k.id}> › <Link href={adres({ kategori: k.slug, q: null })}>{k.ad}</Link></span>)} · </>}
            {toplam} ürün{setler.length ? ` · ${setler.length} set` : ''} · fiyatlar KDV dahil, stok depo miktarıdır
          </>} />
        <div className="flex flex-wrap items-start gap-6">
          <aside aria-label="Kategoriler" className="kart flex min-w-0 flex-[1_1_220px] flex-col gap-1 p-4 lg:max-w-[260px]">
            <span className="px-2 pb-1 text-xs font-extrabold tracking-wider text-kiremit">KATEGORİLER</span>
            <Link href={adres({ kategori: null })} className={`rounded-lg px-2 py-1.5 text-sm font-bold no-underline ${!kategori ? 'bg-lacivert text-white' : 'text-lacivert hover:bg-zemin'}`}>Tüm ürünler</Link>
            <KategoriAgaci kategoriler={kategoriler} ustId={null} seciliId={kategori?.id ?? null} adres={(slug) => adres({ kategori: slug })} />
          </aside>
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <form method="get" className="kart flex flex-wrap items-end gap-3 p-4">
              {kategori && <input type="hidden" name="kategori" value={kategori.slug} />}
              <div className="flex min-w-0 flex-[2_1_240px] flex-col gap-1.5">
                <label htmlFor="kt-q" className="etiket">Bu bölümde ara</label>
                <input id="kt-q" name="q" type="search" defaultValue={q} className="girdi" placeholder="Kitap, yazar, yayınevi, barkod" />
              </div>
              <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-bold">
                <input type="checkbox" name="stokta" value="1" defaultChecked={stokta} className="size-5 accent-lacivert" />Yalnız stokta olanlar
              </label>
              <button type="submit" className="btn-koyu">Ara</button>
            </form>
            {altlar.length > 0 && (
              <nav aria-label="Alt kategoriler" className="flex flex-wrap gap-2">
                {altlar.map((k) => (
                  <Link key={k.id} href={adres({ kategori: k.slug })} className="inline-flex min-h-10 items-center rounded-[10px] border-2 border-kenar bg-white px-3.5 text-sm font-bold text-lacivert no-underline hover:border-lacivert">
                    {k.ad} <span className="ml-1.5 text-metin-3">({k.urunSayisi})</span>
                  </Link>
                ))}
              </nav>
            )}
            {o.rol === 'veli' && !ogrenciler.length && <p className="text-sm text-metin-2">Sepete eklemek için hesabınıza bağlı öğrenci olmalı.</p>}
            {kalemler.length ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                {kalemler.map((k) => <KalemKarti key={k.anahtar} k={k} ogrenciler={ogrenciler} />)}
              </div>
            ) : <div className="kart"><Bos>Bu aramaya uyan ürün yok.</Bos></div>}
            {sayfaSayisi > 1 && (
              <nav aria-label="Sayfalar" className="flex flex-wrap items-center justify-center gap-2">
                {sayfa > 1 && <Link href={adres({ sayfa: String(sayfa - 1) })} className="btn-cerceve min-h-11">← Önceki</Link>}
                <span className="text-sm font-bold text-metin-2">Sayfa {sayfa} / {sayfaSayisi}</span>
                {sayfa < sayfaSayisi && <Link href={adres({ sayfa: String(sayfa + 1) })} className="btn-cerceve min-h-11">Sonraki →</Link>}
              </nav>
            )}
          </div>
        </div>
      </Sayfa>
    </>
  );
}

function KategoriAgaci({ kategoriler, ustId, seciliId, adres, derinlik = 0 }:
  { kategoriler: { id: number; ustId: number | null; ad: string; slug: string; urunSayisi: number }[]; ustId: number | null; seciliId: number | null; adres: (slug: string) => string; derinlik?: number }) {
  const l = kategoriler.filter((k) => k.ustId === ustId);
  if (!l.length || derinlik > 5) return null;
  return (
    <ul className="flex flex-col" style={{ paddingLeft: derinlik ? 12 : 0 }}>
      {l.map((k) => (
        <li key={k.id}>
          <Link href={adres(k.slug)} aria-current={seciliId === k.id ? 'page' : undefined}
            className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm no-underline ${seciliId === k.id ? 'bg-lacivert font-bold text-white' : 'font-semibold text-lacivert hover:bg-zemin'}`}>
            <span>{k.ad}</span><span className={seciliId === k.id ? 'text-[#C9D1DC]' : 'text-metin-3'}>{k.urunSayisi}</span>
          </Link>
          <KategoriAgaci kategoriler={kategoriler} ustId={k.id} seciliId={seciliId} adres={adres} derinlik={derinlik + 1} />
        </li>
      ))}
    </ul>
  );
}
