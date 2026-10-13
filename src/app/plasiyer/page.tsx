import Link from 'next/link';
import { plasiyerOturumu } from '@/lib/plasiyer-sayfa';
import { plasiyerOzeti } from '@/lib/plasiyer';
import { tl } from '@/lib/bicim';
import UstCubuk from '@/components/UstCubuk';
import { Bolum, Bos, Kpi, KpiSatiri, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';

export const metadata = { title: 'Plasiyer ana sayfası' };

/** Plasiyer: kendisine bağlı okullar, öğretmenler, sepet ve tahsilat özeti (salt okunur) */
export default async function PlasiyerAna() {
  const o = await plasiyerOturumu();
  const z = await plasiyerOzeti(o.sub);
  return (
    <>
      <UstCubuk rol="plasiyer" ad={o.ad} />
      <Sayfa>
        <SayfaBasligi baslik={`Merhaba, ${o.ad.split(' ')[0]}`} alt="Size bağlı okul ve öğretmenler, tavsiye sepetleri ve satış durumu. Kayıt değişiklikleri için kitabevi yönetimiyle görüşün." />
        <KpiSatiri>
          <Kpi ad="Okullarım" deger={z.okullar.length} />
          <Kpi ad="Öğretmenler" deger={z.ogretmenler.length} alt={`${z.ogretmenler.filter((x) => x.plasiyerId === o.sub).length} öğretmen size özel bağlı`} />
          <Kpi ad="Öğrenci" deger={z.ogrenci} />
          <Kpi ad="Tahsilat" deger={tl(z.tahsilat)} alt={`${z.bekleyenHavale} havale onay bekliyor`} />
          <Kpi ad="Terk edilen sepet" deger={z.terk} ton={z.terk ? 'uyari' : undefined} alt="24 saattir siparişe dönmeyen" />
        </KpiSatiri>
        <Bolum id="okullar" ust="OKULLARIM" baslik={`${z.okullar.length} okul`} aksiyon={<Link href="/plasiyer/raporlar" className="font-bold">Sepet raporu →</Link>}>
          {z.okullar.length ? (
            <div className={TABLO.sar}>
              <table className={TABLO.tablo}>
                <thead><tr>{['Okul', 'Öğrenci', 'Yayındaki sepet', 'Sipariş veren', 'Dönüşüm'].map((h) => <th key={h} scope="col" className={TABLO.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {z.okullar.map((x) => (
                    <tr key={x.id}>
                      <td className={TABLO.td}><Link href={`/plasiyer/okullar/${x.id}`} className="font-bold">{x.ad}</Link><span className="block text-[13px] text-metin-3">{x.il} / {x.ilce}</span></td>
                      <td className={TABLO.td}>{x.ogrenci}</td><td className={TABLO.td}>{x.yayinda}</td><td className={TABLO.td}>{x.siparisVeren}</td>
                      <td className={TABLO.td}>{x.ogrenci ? <Rozet ton={x.siparisVeren / x.ogrenci >= 0.5 ? 'yesil' : 'gri'}>%{Math.round((x.siparisVeren / x.ogrenci) * 100)}</Rozet> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Bos>Size bağlı okul yok.</Bos>}
        </Bolum>
      </Sayfa>
    </>
  );
}
