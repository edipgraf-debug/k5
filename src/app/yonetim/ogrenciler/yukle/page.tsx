import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import { tarihSaat } from '@/lib/bicim';
import UstCubuk from '@/components/UstCubuk';
import YuklemeFormu from '@/components/yonetim/YuklemeFormu';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';

export const metadata = { title: 'Excel ile öğrenci yükleme' };

const DURUM = { Onizleme: ['Kaydedilmedi', 'sari'], Onaylandi: ['Kaydedildi', 'yesil'], IptalEdildi: ['İptal', 'gri'] } as const;

export default async function Yukle({ searchParams }: { searchParams: Promise<{ okulId?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const y = await yonetimRepo();
  const [okullar, gecmis] = await Promise.all([y.okulListesi(), y.yuklemeGecmisi(10)]);
  const istenen = Number((await searchParams).okulId);
  const okulId = okullar.some((x) => x.id === istenen) ? istenen : okullar.length === 1 ? okullar[0].id : null;
  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/ogrenciler" />
      <Sayfa>
        <SayfaBasligi baslik="Excel ile öğrenci yükleme" geri={{ href: '/yonetim/ogrenciler', ad: 'Öğrenci & veli' }}
          alt="Bir sınıfı ya da okulun tamamını tek seferde ekleyin. Kayıtlı öğrenciler okul numarasından tanınır ve güncellenir; kardeşler aynı veli hesabında toplanır." />
        <YuklemeFormu okullar={okullar.map((x) => ({ id: x.id, kod: x.kod, ad: x.ad }))} okulId={okulId} />
        <Bolum id="gecmis" ust="GEÇMİŞ" baslik="Son yüklemeler">
          {gecmis.length ? (
            <div className={TABLO.sar}>
              <table className={TABLO.tablo}>
                <thead><tr>
                  <th scope="col" className={TABLO.th}>Tarih</th><th scope="col" className={TABLO.th}>Dosya</th><th scope="col" className={TABLO.th}>Okul</th>
                  <th scope="col" className={TABLO.th}>Satır</th><th scope="col" className={TABLO.th}>Durum</th>
                </tr></thead>
                <tbody>
                  {gecmis.map((g) => (
                    <tr key={g.id}>
                      <td className={TABLO.td}>{tarihSaat(g.olusturma)}<span className="block text-[13px] text-metin-3">{g.yukleyen}</span></td>
                      <td className={TABLO.td}><Link href={`/yonetim/ogrenciler/yukle/${g.id}`} className="font-bold">{g.dosyaAdi}</Link></td>
                      <td className={TABLO.td}>{g.okulAd ?? 'Birden çok okul'}</td>
                      <td className={TABLO.td}>{g.toplam}{g.hatali ? <span className="text-sm text-kirmizi"> · {g.hatali} hatalı</span> : ''}</td>
                      <td className={TABLO.td}><Rozet ton={DURUM[g.durum][1]}>{DURUM[g.durum][0]}</Rozet></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Bos>Henüz yükleme yapılmadı.</Bos>}
        </Bolum>
      </Sayfa>
    </>
  );
}
