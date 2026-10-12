import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import UstCubuk from '@/components/UstCubuk';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';
import { telGoster } from '@/components/yonetim/etiketler';

export const metadata = { title: 'Öğrenci & veli' };

type SP = { q?: string; okulId?: string; subeId?: string; pasif?: string };

export default async function Ogrenciler({ searchParams }: { searchParams: Promise<SP> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const okulId = Number(sp.okulId) || null;
  const subeId = Number(sp.subeId) || null;
  const pasif = sp.pasif === '1';
  const y = await yonetimRepo();
  const [okullar, siniflar, ogrenciler] = await Promise.all([
    y.okulListesi(), okulId ? y.okulSiniflari(okulId) : Promise.resolve([]), y.ogrenciAra({ q, okulId, subeId, pasifDahil: pasif, limit: 200 })]);
  const subeler = siniflar.flatMap((s) => s.subeler.map((b) => ({ id: b.id, ad: `${s.seviye}-${b.ad}` })));
  const filtreVar = !!(q || okulId || pasif);

  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/ogrenciler" />
      <Sayfa>
        <SayfaBasligi baslik="Öğrenci & veli" alt="Öğrenciyi adı, okul numarası ya da veli telefonuyla bulun; öğrenci sayfasından bilgileri, şubeyi ve velileri düzenleyin.">
          <Link href={`/yonetim/ogrenciler/yukle${okulId ? `?okulId=${okulId}` : ''}`} className="btn-cerceve">Excel ile yükle</Link>
          <Link href={`/yonetim/ogrenciler/yeni${okulId ? `?okulId=${okulId}` : ''}`} className="btn-turuncu">+ Yeni öğrenci</Link>
        </SayfaBasligi>

        <form method="get" role="search" className="kart flex flex-wrap items-end gap-3 p-5">
          <div className="flex min-w-0 flex-[2_1_280px] flex-col gap-1.5">
            <label htmlFor="f-q" className="etiket">Ara</label>
            <input id="f-q" name="q" type="search" defaultValue={q} className="girdi" placeholder="Ad soyad, okul no veya veli telefonu" />
          </div>
          <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
            <label htmlFor="f-okul" className="etiket">Okul</label>
            <select id="f-okul" name="okulId" defaultValue={okulId ?? ''} className="girdi">
              <option value="">Tüm okullar</option>
              {okullar.map((x) => <option key={x.id} value={x.id}>{x.kod} · {x.ad}</option>)}
            </select>
          </div>
          {okulId && subeler.length > 0 && (
            <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-1.5">
              <label htmlFor="f-sube" className="etiket">Şube</label>
              <select id="f-sube" name="subeId" defaultValue={subeId ?? ''} className="girdi">
                <option value="">Tümü</option>
                {subeler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
              </select>
            </div>
          )}
          <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="pasif" value="1" defaultChecked={pasif} className="size-5 accent-lacivert" />Pasifleri de göster
          </label>
          <button type="submit" className="btn-koyu">Listele</button>
          {filtreVar && <Link href="/yonetim/ogrenciler" className="self-center text-sm font-bold">Temizle</Link>}
        </form>

        <Bolum id="ogr-liste" baslik={`${ogrenciler.length}${ogrenciler.length === 200 ? '+' : ''} öğrenci`}>
          {ogrenciler.length ? (
            <div className={TABLO.sar}>
              <table className={`${TABLO.tablo} min-w-[820px]`}>
                <thead><tr>
                  <th scope="col" className={TABLO.th}>Öğrenci</th><th scope="col" className={TABLO.th}>No</th><th scope="col" className={TABLO.th}>Okul</th>
                  <th scope="col" className={TABLO.th}>Şube</th><th scope="col" className={TABLO.th}>Veli</th><th scope="col" className={TABLO.th}>Durum</th>
                </tr></thead>
                <tbody>
                  {ogrenciler.map((x) => (
                    <tr key={x.id}>
                      <td className={TABLO.td}><Link href={`/yonetim/ogrenciler/${x.id}`} className="font-bold">{x.ad} {x.soyad}</Link></td>
                      <td className={TABLO.td}>{x.okulNo}</td>
                      <td className={TABLO.td}>{x.okulAd}</td>
                      <td className={TABLO.td}>{x.sinifSube ?? <span className="font-bold text-sari">Şube yok</span>}</td>
                      <td className={TABLO.td}>
                        {x.veliler.length ? (
                          <div className="flex flex-col text-sm">
                            {x.veliler.map((v) => <span key={v.id}>{telGoster(v.telefon)}{v.adSoyad ? <span className="text-metin-3"> · {v.adSoyad}</span> : ''}</span>)}
                          </div>
                        ) : <span className="font-bold text-kirmizi">Veli yok</span>}
                      </td>
                      <td className={TABLO.td}>
                        <div className="flex flex-wrap gap-1">
                          {!x.aktif && <Rozet ton="kirmizi">Pasif</Rozet>}
                          {x.aktif && x.veliler.some((v) => v.kilitli) && <Rozet ton="kirmizi">Veli kilitli</Rozet>}
                          {x.aktif && x.veliler.length > 0 && !x.veliler.some((v) => v.sifreVar) && <Rozet ton="sari">Veli girmedi</Rozet>}
                          {x.aktif && x.veliler.some((v) => v.sifreVar) && <Rozet ton="yesil">Veli aktif</Rozet>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Bos>{filtreVar ? 'Aramaya uyan öğrenci yok.' : 'Henüz öğrenci yok.'}</Bos>}
        </Bolum>
      </Sayfa>
    </>
  );
}
