import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { setKalemi } from '@/lib/kalem';
import { tl } from '@/lib/bicim';
import StokRozeti from '@/components/StokRozeti';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';

export const metadata = { title: 'Setler' };

export default async function Setler({ searchParams }: { searchParams: Promise<{ q?: string; pasif?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const sp = await searchParams;
  const setler = await (await ticaretRepo()).setListesi({ q: sp.q, pasifDahil: sp.pasif !== '0' });
  return (
    <Sayfa>
      <SayfaBasligi baslik="Setler" alt="Barkod ve ad vererek belirli ürünleri tek kalemde toplayın. Setler tavsiye sepetine ve kataloğa tek ürün gibi eklenir.">
        <Link href="/yonetim/setler/yeni" className="btn-turuncu">+ Yeni set</Link>
      </SayfaBasligi>
      <form method="get" role="search" className="kart flex flex-wrap items-end gap-3 p-5">
        <div className="flex min-w-0 flex-[2_1_260px] flex-col gap-1.5">
          <label htmlFor="s-q" className="etiket">Ara</label>
          <input id="s-q" name="q" type="search" defaultValue={sp.q ?? ''} className="girdi" placeholder="Set adı veya barkod" />
        </div>
        <button type="submit" className="btn-koyu">Ara</button>
      </form>
      <Bolum id="set-liste" baslik={`${setler.length} set`}>
        {setler.length ? (
          <div className={TABLO.sar}>
            <table className={`${TABLO.tablo} min-w-[900px]`}>
              <thead><tr>
                <th scope="col" className={TABLO.th}>Set</th><th scope="col" className={TABLO.th}>Barkod</th><th scope="col" className={TABLO.th}>İçerik</th>
                <th scope="col" className={TABLO.th}>Toplam</th><th scope="col" className={TABLO.th}>Set fiyatı</th><th scope="col" className={TABLO.th}>Stok</th>
                <th scope="col" className={TABLO.th}>Sepet</th><th scope="col" className={TABLO.th}>Durum</th>
              </tr></thead>
              <tbody>
                {setler.map((s) => (
                  <tr key={s.id}>
                    <td className={TABLO.td}><Link href={`/yonetim/setler/${s.id}`} className="font-bold">{s.ad}</Link></td>
                    <td className={TABLO.td}>{s.barkod}</td>
                    <td className={`${TABLO.td} text-[13px]`}>{s.satirlar.map((x) => (x.adet > 1 ? `${x.adet}× ${x.ad}` : x.ad)).join(', ')}</td>
                    <td className={TABLO.td}>{tl(s.icerikToplami)}</td>
                    <td className={TABLO.td}><strong>{tl(s.satisFiyati)}</strong>{s.fiyat == null && <span className="block text-[12px] text-metin-3">toplam</span>}</td>
                    <td className={TABLO.td}><StokRozeti stok={setKalemi(s).stok} kucuk /></td>
                    <td className={TABLO.td}>{s.listeSayisi}</td>
                    <td className={TABLO.td}>{s.aktif ? <Rozet ton="yesil">Satışta</Rozet> : <Rozet ton="kirmizi">Kapalı</Rozet>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Bos>Henüz set yok.</Bos>}
      </Bolum>
    </Sayfa>
  );
}
