import { plasiyerOturumu } from '@/lib/plasiyer-sayfa';
import { yonetimRepo } from '@/lib/data/yonetim';
import { telGoster } from '@/components/yonetim/etiketler';
import UstCubuk from '@/components/UstCubuk';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';
import { tarihSaat } from '@/lib/bicim';

export const metadata = { title: 'Öğretmenler' };

export default async function PlasiyerOgretmenler() {
  const o = await plasiyerOturumu();
  const l = await (await yonetimRepo()).personelListesi({ tip: 'Ogretmen', plasiyerId: o.sub });
  return (
    <>
      <UstCubuk rol="plasiyer" ad={o.ad} />
      <Sayfa>
        <SayfaBasligi baslik="Öğretmenlerim" alt="Okulları size bağlı öğretmenler ve okulundan bağımsız olarak size atanmış öğretmenler." />
        <Bolum id="ogr" baslik={`${l.length} öğretmen`}>
          {l.length ? (
            <div className={TABLO.sar}>
              <table className={`${TABLO.tablo} min-w-[760px]`}>
                <thead><tr>{['Öğretmen', 'Okul', 'Şubeler', 'İletişim', 'Bağlantı', 'Son giriş'].map((h) => <th key={h} scope="col" className={TABLO.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {l.map((k) => (
                    <tr key={k.id}>
                      <td className={`${TABLO.td} font-bold`}>{k.adSoyad}</td>
                      <td className={TABLO.td}>{k.okulAd}</td>
                      <td className={TABLO.td}>{k.subeler.map((s) => s.ad).join(', ') || '—'}</td>
                      <td className={TABLO.td}><span className="block">{k.eposta}</span>{k.telefon && <span className="text-[13px] text-metin-3">{telGoster(k.telefon)}</span>}</td>
                      <td className={TABLO.td}>{k.plasiyerId === o.sub ? <Rozet ton="lacivert">Size özel</Rozet> : <Rozet>Okul üzerinden</Rozet>}</td>
                      <td className={TABLO.td}>{k.sonGiris ? tarihSaat(k.sonGiris) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Bos>Size bağlı öğretmen yok.</Bos>}
        </Bolum>
      </Sayfa>
    </>
  );
}
