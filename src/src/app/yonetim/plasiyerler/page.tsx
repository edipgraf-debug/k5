import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import { Bolum, Bos, Kpi, KpiSatiri, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';
import PlasiyerSecici from '@/components/yonetim/PlasiyerSecici';
import { telGoster } from '@/components/yonetim/etiketler';

export const metadata = { title: 'Plasiyerler' };

export default async function Plasiyerler({ searchParams }: { searchParams: Promise<{ atanmamis?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const sp = await searchParams;
  const y = await yonetimRepo();
  const [plasiyerler, okullar] = await Promise.all([y.plasiyerListesi(true), y.okulListesi()]);
  const secenekler = plasiyerler.filter((p) => p.aktif).map((p) => ({ id: p.id, adSoyad: p.adSoyad, kod: p.opakPlasiyerKodu }));
  const atanmamis = okullar.filter((x) => !x.plasiyerId);
  const gosterilen = sp.atanmamis === '1' ? atanmamis : okullar;

  return (
    <Sayfa>
      <SayfaBasligi baslik="Plasiyerler" alt="Okulları ve öğretmenleri plasiyerlere bağlayın. Öğretmen varsayılan olarak okulunun plasiyerine bağlıdır; gerekirse öğretmene özel plasiyer atanır.">
        <Link href="/yonetim/kullanicilar/yeni?tip=Plasiyer" className="btn-turuncu">+ Yeni plasiyer</Link>
      </SayfaBasligi>
      <KpiSatiri>
        <Kpi ad="Aktif plasiyer" deger={plasiyerler.filter((p) => p.aktif).length} />
        <Kpi ad="Plasiyeri olan okul" deger={okullar.length - atanmamis.length} alt={`${okullar.length} okuldan`} />
        <Kpi ad="Plasiyeri atanmamış okul" deger={atanmamis.length} ton={atanmamis.length ? 'uyari' : undefined} alt={atanmamis.length ? 'Aşağıdan atayın' : 'Tüm okullar atanmış'} />
        <Kpi ad="Öğretmene özel atama" deger={plasiyerler.reduce((a, p) => a + p.ozelOgretmen, 0)} alt="Okulun plasiyerinden farklı" />
      </KpiSatiri>

      <Bolum id="pl-liste" ust="PLASİYERLER" baslik={`${plasiyerler.length} plasiyer`}>
        {plasiyerler.length ? (
          <div className={TABLO.sar}>
            <table className={`${TABLO.tablo} min-w-[760px]`}>
              <thead><tr>
                <th scope="col" className={TABLO.th}>Plasiyer</th><th scope="col" className={TABLO.th}>Opak kodu</th><th scope="col" className={TABLO.th}>İletişim</th>
                <th scope="col" className={TABLO.th}>Okul</th><th scope="col" className={TABLO.th}>Öğretmen</th><th scope="col" className={TABLO.th}>Durum</th>
              </tr></thead>
              <tbody>
                {plasiyerler.map((p) => (
                  <tr key={p.id}>
                    <td className={TABLO.td}><Link href={`/yonetim/plasiyerler/${p.id}`} className="font-bold">{p.adSoyad}</Link></td>
                    <td className={TABLO.td}>{p.opakPlasiyerKodu ?? <span className="text-sari font-bold">Kod yok</span>}</td>
                    <td className={TABLO.td}><span className="block">{p.eposta}</span>{p.telefon && <span className="text-[13px] text-metin-3">{telGoster(p.telefon)}</span>}</td>
                    <td className={TABLO.td}>{p.okulSayisi}</td>
                    <td className={TABLO.td}>{p.ogretmenSayisi}{p.ozelOgretmen ? <span className="text-[13px] text-metin-3"> ({p.ozelOgretmen} özel)</span> : ''}</td>
                    <td className={TABLO.td}>{p.aktif ? <Rozet ton="yesil">Aktif</Rozet> : <Rozet ton="kirmizi">Pasif</Rozet>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Bos>Henüz plasiyer yok. &quot;+ Yeni plasiyer&quot; ile ekleyin.</Bos>}
      </Bolum>

      <Bolum id="pl-okul" ust="EŞLEŞTİRME" baslik="Okul → plasiyer"
        aksiyon={<Link href={sp.atanmamis === '1' ? '/yonetim/plasiyerler' : '/yonetim/plasiyerler?atanmamis=1'} className="text-sm font-bold">
          {sp.atanmamis === '1' ? 'Tüm okulları göster' : `Yalnız atanmamışlar (${atanmamis.length})`}</Link>}>
        {gosterilen.length ? (
          <div className={TABLO.sar}>
            <table className={`${TABLO.tablo} min-w-[640px]`}>
              <thead><tr><th scope="col" className={TABLO.th}>Okul</th><th scope="col" className={TABLO.th}>İl / ilçe</th><th scope="col" className={TABLO.th}>Plasiyer</th></tr></thead>
              <tbody>
                {gosterilen.map((x) => (
                  <tr key={x.id}>
                    <td className={TABLO.td}><Link href={`/yonetim/okullar/${x.id}`} className="font-bold">{x.ad}</Link><span className="block text-[13px] text-metin-3">{x.kod}</span></td>
                    <td className={TABLO.td}>{x.il} / {x.ilce}</td>
                    <td className={TABLO.td}><PlasiyerSecici url={`/api/yonetim/okullar/${x.id}/plasiyer`} deger={x.plasiyerId} secenekler={secenekler} bosEtiket="Atanmadı" etiket={`${x.ad} plasiyeri`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Bos>Plasiyeri atanmamış okul yok.</Bos>}
      </Bolum>
    </Sayfa>
  );
}
