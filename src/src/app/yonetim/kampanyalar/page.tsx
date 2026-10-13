import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { tarihMetni, tarihSaat } from '@/lib/bicim';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';

export const metadata = { title: 'Kampanyalar' };

export default async function KampanyaListesi() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const l = await (await ticaretRepo()).kampanyalar();
  return (
    <Sayfa>
      <SayfaBasligi baslik="Kampanya yönetimi" alt="Kampanyalı ürünleri tanımlayın; kampanya sayfasında tüm kullanıcılara görünür, okul yetkilileri ve öğretmenlere SMS / e-posta ile duyurulur.">
        <Link href="/kampanyalar" className="btn-cerceve">Kampanya sayfası</Link>
        <Link href="/yonetim/kampanyalar/yeni" className="btn-turuncu">+ Yeni kampanya</Link>
      </SayfaBasligi>
      <Bolum id="kmp" baslik={`${l.length} kampanya`}>
        {l.length ? (
          <div className={TABLO.sar}>
            <table className={`${TABLO.tablo} min-w-[820px]`}>
              <thead><tr>{['Kampanya', 'Tarih', 'İndirim', 'Ürün', 'Duyuru', 'Durum'].map((h) => <th key={h} scope="col" className={TABLO.th}>{h}</th>)}</tr></thead>
              <tbody>
                {l.map((k) => (
                  <tr key={k.id}>
                    <td className={TABLO.td}><Link href={`/yonetim/kampanyalar/${k.id}`} className="font-bold">{k.ad}</Link></td>
                    <td className={`${TABLO.td} whitespace-nowrap`}>{tarihMetni(k.baslangic)} – {tarihMetni(k.bitis)}</td>
                    <td className={TABLO.td}>{k.indirimOrani != null ? `%${k.indirimOrani}` : 'Ürüne özel'}</td>
                    <td className={TABLO.td}>{k.urunler.length}</td>
                    <td className={`${TABLO.td} text-[13px]`}>{k.gonderim ? `${k.gonderim} gönderim · ${tarihSaat(k.sonGonderim)}` : 'Gönderilmedi'}</td>
                    <td className={TABLO.td}>{k.yayinda ? <Rozet ton="yesil">Yayında</Rozet> : !k.aktif ? <Rozet ton="kirmizi">Pasif</Rozet> : <Rozet>Tarih dışında</Rozet>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Bos>Henüz kampanya yok.</Bos>}
      </Bolum>
    </Sayfa>
  );
}
