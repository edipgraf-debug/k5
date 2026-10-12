import Link from 'next/link';
import type { OkulBilgi } from '@/lib/types';
import { Rozet, TABLO } from './Ortak';
import KopyalaButonu from './KopyalaButonu';

export interface OkulTabloSatiri extends OkulBilgi { ogrenci: number; yayinda: number }

/** Kardelen: okullar, giriş adresleri ve logo durumu */
export default function OkulTablosu({ okullar, site }: { okullar: OkulTabloSatiri[]; site: string }) {
  const alan = site.replace(/^https?:\/\//, '');
  return (
    <div className={TABLO.sar}>
      <table className={`${TABLO.tablo} min-w-[860px]`}>
        <thead><tr>
          <th scope="col" className={TABLO.th}>Okul</th>
          <th scope="col" className={TABLO.th}>Giriş adresi</th>
          <th scope="col" className={TABLO.th}>Girişte logo</th>
          <th scope="col" className={TABLO.th}>Öğrenci</th>
          <th scope="col" className={TABLO.th}>Yayındaki sepet</th>
          <th scope="col" className={TABLO.th}><span className="sr-only">İşlem</span></th>
        </tr></thead>
        <tbody>
          {okullar.map((o) => (
            <tr key={o.id}>
              <td className={TABLO.td}>
                <div className="flex flex-col"><span className="font-bold">{o.ad}</span><span className="text-[13px] text-metin-3">{o.kod} · {o.ilce}</span></div>
              </td>
              <td className={TABLO.td}>
                {o.slug ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={`/${o.slug}`} target="_blank" rel="noopener" className="font-bold">{alan}/{o.slug}</a>
                    <KopyalaButonu metin={`${site}/${o.slug}`} />
                  </div>
                ) : <Rozet ton="sari">Adres tanımlı değil</Rozet>}
              </td>
              <td className={TABLO.td}>
                {o.logoGoster ? <Rozet ton="yesil">Gösteriliyor</Rozet> : o.logoDosya ? <Rozet>Yüklü · kapalı</Rozet> : <Rozet>Logo yok</Rozet>}
              </td>
              <td className={TABLO.td}>{o.ogrenci}</td>
              <td className={TABLO.td}>{o.yayinda}</td>
              <td className={`${TABLO.td} text-right`}><Link href={`/yonetim/okullar/${o.id}`} className="font-bold">Yönet →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
