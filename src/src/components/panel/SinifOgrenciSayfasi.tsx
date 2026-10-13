import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { repo } from '@/lib/data/repo';
import { ticaretRepo } from '@/lib/data/ticaret';
import { panelVerisi } from '@/lib/panel';
import UstCubuk from '@/components/UstCubuk';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi, TABLO } from './Ortak';

/** Okul / öğretmen: sınıf ve şube listesi, şubeye göre öğrenciler, sepet ve sipariş durumu */
export default async function SinifOgrenciSayfasi({ rol, sp }: { rol: 'okul' | 'ogretmen'; sp: { sube?: string } }) {
  const o = await oturumAl();
  if (!o || o.rol !== rol || !o.okulId) redirect('/giris');
  const r = await repo();
  const subeler = rol === 'ogretmen' ? await r.personelSubeleri(o.sub) : null;
  const [veri, siparisli] = await Promise.all([panelVerisi(o, o.okulId, subeler), (await ticaretRepo()).siparisVerenOgrenciler([o.okulId])]);
  const sube = sp.sube && veri.subeler.some((s) => s.sinifSube === sp.sube) ? sp.sube : null;
  const ogrenciler = veri.ogrenciler.filter((x) => !sube || x.sinifSube === sube);
  const temel = `/${rol}/ogrenciler`;
  return (
    <>
      <UstCubuk rol={rol} ad={o.ad} />
      <Sayfa>
        <SayfaBasligi baslik={rol === 'okul' ? 'Sınıflar ve öğrenciler' : 'Öğrencilerim'} alt="Şubeyi seçin; öğrencinin sayfasından velilerini, sepetlerini ve bildirimleri görün." />
        <Bolum id="siniflar" ust="SINIFLAR" baslik={`${veri.subeler.length} şube`}>
          {veri.subeler.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 p-5">
              <Link href={temel} aria-current={!sube ? 'page' : undefined} className={`flex flex-col gap-1 rounded-2xl border-2 p-4 no-underline ${!sube ? 'border-turuncu bg-[#FFF7EA]' : 'border-cizgi bg-white'}`}>
                <span className="font-baslik text-lg font-extrabold text-lacivert">Tümü</span><span className="text-sm text-metin-2">{veri.ogrenciler.length} öğrenci</span>
              </Link>
              {veri.subeler.map((s) => (
                <Link key={s.sinifSube} href={`${temel}?sube=${encodeURIComponent(s.sinifSube)}`} aria-current={sube === s.sinifSube ? 'page' : undefined}
                  className={`flex flex-col gap-1 rounded-2xl border-2 p-4 no-underline ${sube === s.sinifSube ? 'border-turuncu bg-[#FFF7EA]' : 'border-cizgi bg-white'}`}>
                  <span className="font-baslik text-lg font-extrabold text-lacivert">{s.sinifSube}</span>
                  <span className="text-sm text-metin-2">{s.ogrenci} öğrenci · {s.sepetAcik} sepeti açık</span>
                  <span className="text-[13px] text-metin-3">{s.acan} veli açtı{s.velisiz ? ` · ${s.velisiz} velisiz` : ''}</span>
                </Link>
              ))}
            </div>
          ) : <Bos>Bu sezon için kayıtlı şube yok.</Bos>}
        </Bolum>
        <Bolum id="ogrenciler" ust="ÖĞRENCİLER" baslik={`${sube ?? 'Tüm şubeler'} · ${ogrenciler.length} öğrenci`}>
          {ogrenciler.length ? (
            <div className={TABLO.sar}>
              <table className={TABLO.tablo}>
                <thead><tr>{['Öğrenci', 'No', 'Şube', 'Veli', 'Sepet', 'Sipariş'].map((h) => <th key={h} scope="col" className={TABLO.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {ogrenciler.map((x) => (
                    <tr key={x.id}>
                      <td className={TABLO.td}><Link href={`/${rol}/ogrenciler/${x.id}`} className="font-bold">{x.ad} {x.soyad}</Link></td>
                      <td className={TABLO.td}>{x.okulNo}</td><td className={TABLO.td}>{x.sinifSube}</td>
                      <td className={TABLO.td}>{x.veliSayisi ? `${x.veliSayisi} veli` : <span className="font-bold text-kirmizi">Velisi yok</span>}</td>
                      <td className={TABLO.td}>{x.acikSepet ? <Rozet ton={x.acilan ? 'yesil' : 'sari'}>{x.acilan ? 'Veli açtı' : 'Açılmadı'}</Rozet> : <Rozet>Açık sepet yok</Rozet>}</td>
                      <td className={TABLO.td}>{siparisli.has(x.id) ? <Rozet ton="yesil">Verdi</Rozet> : <span className="text-metin-3">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Bos>Öğrenci yok.</Bos>}
        </Bolum>
      </Sayfa>
    </>
  );
}
