import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { tl } from '@/lib/bicim';
import StokRozeti from '@/components/StokRozeti';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';

export const metadata = { title: 'Ürünler' };
const BOY = 50;
type SP = { q?: string; kategori?: string; kat?: string; durum?: string; web?: string; stokta?: string; sayfa?: string };

/** Ürün listesi: Opak'tan gelen ürünler; sitede satış durumu, web fiyatı, açıklama ve kapak düzenlenir */
export default async function Urunler({ searchParams }: { searchParams: Promise<SP> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const durum = (['aktif', 'pasif', 'tum'] as const).find((d) => d === sp.durum) ?? 'tum';
  const sayfa = Math.max(1, Number(sp.sayfa) || 1);
  const t = await ticaretRepo();
  const [opakKat, kategoriler] = await Promise.all([t.opakKategorileri(), t.kategoriler()]);
  const kat = Number(sp.kat) || null;
  const { satirlar, toplam } = await t.urunListesi({ q, kategori: sp.kategori || null, kategoriId: kat, durum, webFiyatli: sp.web === '1', stokta: sp.stokta === '1', sayfa, sayfaBoyu: BOY });
  const sayfaSayisi = Math.max(1, Math.ceil(toplam / BOY));
  const sorgu = (s: number) => { const p = new URLSearchParams(Object.entries({ ...sp, sayfa: String(s) }).filter(([, v]) => v) as [string, string][]); return `/yonetim/urunler?${p}`; };
  const katAd = new Map(kategoriler.map((k) => [k.id, k.ad]));

  return (
    <Sayfa>
      <SayfaBasligi baslik="Ürünler" alt="Ürün adı, barkod ve liste fiyatı Opak'tan gelir. Sitede satış durumu, web fiyatı, açıklama ve kapak görseli buradan düzenlenir.">
        <Link href="/yonetim/kategoriler" className="btn-cerceve">Kategori ağacı</Link>
        <Link href="/yonetim/setler/yeni" className="btn-turuncu">+ Yeni set</Link>
      </SayfaBasligi>
      <form method="get" role="search" className="kart flex flex-wrap items-end gap-3 p-5">
        <div className="flex min-w-0 flex-[2_1_260px] flex-col gap-1.5">
          <label htmlFor="u-q" className="etiket">Ara</label>
          <input id="u-q" name="q" type="search" defaultValue={q} className="girdi" placeholder="Ad, yazar, yayınevi, barkod, stok kodu" />
        </div>
        <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1.5">
          <label htmlFor="u-kat" className="etiket">Site kategorisi</label>
          <select id="u-kat" name="kat" defaultValue={kat ?? ''} className="girdi">
            <option value="">Tümü</option>
            {kategoriler.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
          </select>
        </div>
        <div className="flex min-w-0 flex-[1_1_160px] flex-col gap-1.5">
          <label htmlFor="u-ok" className="etiket">Opak kategorisi</label>
          <select id="u-ok" name="kategori" defaultValue={sp.kategori ?? ''} className="girdi">
            <option value="">Tümü</option>
            {opakKat.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-1.5">
          <label htmlFor="u-d" className="etiket">Satış durumu</label>
          <select id="u-d" name="durum" defaultValue={durum} className="girdi">
            <option value="tum">Tümü</option><option value="aktif">Satışta</option><option value="pasif">Satışta değil</option>
          </select>
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" name="web" value="1" defaultChecked={sp.web === '1'} className="size-5 accent-lacivert" />Web fiyatlı</label>
        <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" name="stokta" value="1" defaultChecked={sp.stokta === '1'} className="size-5 accent-lacivert" />Stokta</label>
        <button type="submit" className="btn-koyu">Listele</button>
      </form>
      <Bolum id="urun-liste" baslik={`${toplam} ürün`} aksiyon={sayfaSayisi > 1 ? <span className="text-sm font-bold text-metin-2">Sayfa {sayfa} / {sayfaSayisi}</span> : undefined}>
        {satirlar.length ? (
          <div className={TABLO.sar}>
            <table className={`${TABLO.tablo} min-w-[1000px]`}>
              <thead><tr>
                <th scope="col" className={TABLO.th}>Ürün</th><th scope="col" className={TABLO.th}>Barkod / stok kodu</th><th scope="col" className={TABLO.th}>Kategori</th>
                <th scope="col" className={TABLO.th}>Liste fiyatı</th><th scope="col" className={TABLO.th}>Web fiyatı</th><th scope="col" className={TABLO.th}>Depo</th>
                <th scope="col" className={TABLO.th}>Kullanım</th><th scope="col" className={TABLO.th}>Durum</th>
              </tr></thead>
              <tbody>
                {satirlar.map((u) => (
                  <tr key={u.id}>
                    <td className={TABLO.td}><Link href={`/yonetim/urunler/${u.id}`} className="font-bold">{u.ad}</Link><span className="block text-[13px] text-metin-3">{[u.yazar, u.yayinevi].filter(Boolean).join(' · ')}</span></td>
                    <td className={TABLO.td}><span className="block">{u.barkod ?? '—'}</span><span className="text-[13px] text-metin-3">{u.opakStokKodu}</span></td>
                    <td className={TABLO.td}><span className="block">{u.kategori ?? '—'}</span>
                      {u.kategoriIdleri.length > 0 && <span className="text-[13px] text-metin-3">{u.kategoriIdleri.map((k) => katAd.get(k)).filter(Boolean).join(', ')}</span>}</td>
                    <td className={TABLO.td}>{tl(u.listeFiyati)}</td>
                    <td className={TABLO.td}>{u.webFiyati != null ? <strong>{tl(u.webFiyati)}</strong> : <span className="text-metin-3">—</span>}</td>
                    <td className={TABLO.td}><StokRozeti stok={u.stok} kucuk /></td>
                    <td className={`${TABLO.td} text-[13px]`}>{u.listeSayisi} sepet · {u.setSayisi} set</td>
                    <td className={TABLO.td}>{u.aktif ? <Rozet ton="yesil">Satışta</Rozet> : <Rozet ton="kirmizi">Satışta değil</Rozet>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Bos>Aramaya uyan ürün yok.</Bos>}
        {sayfaSayisi > 1 && (
          <nav aria-label="Sayfalar" className="flex flex-wrap items-center justify-center gap-2 px-6 py-4">
            {sayfa > 1 && <Link href={sorgu(sayfa - 1)} className="btn-cerceve min-h-11">← Önceki</Link>}
            {sayfa < sayfaSayisi && <Link href={sorgu(sayfa + 1)} className="btn-cerceve min-h-11">Sonraki →</Link>}
          </nav>
        )}
      </Bolum>
    </Sayfa>
  );
}
