import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam } from '@/lib/yonetim-api';
import { kampanyaSms } from '@/lib/kampanya';
import { tarihSaat } from '@/lib/bicim';
import KampanyaFormu from '@/components/yonetim/KampanyaFormu';
import KampanyaDuyuru from '@/components/yonetim/KampanyaDuyuru';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';

export const metadata = { title: 'Kampanya' };

export default async function KampanyaSayfasi({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ yeni?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const id = idParam((await params).id);
  const t = await ticaretRepo();
  const k = id ? await t.kampanya(id) : null;
  if (!k) notFound();
  const [okullar, gonderimler] = await Promise.all([(await yonetimRepo()).okulListesi(), t.kampanyaGonderimleri(k.id, 200)]);
  const bugun = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
  return (
    <Sayfa>
      <SayfaBasligi geri={{ href: '/yonetim/kampanyalar', ad: 'Kampanyalar' }} baslik={k.ad}>
        {k.yayinda ? <Rozet ton="yesil">Yayında</Rozet> : <Rozet>{k.aktif ? 'Tarih dışında' : 'Pasif'}</Rozet>}
      </SayfaBasligi>
      {(await searchParams).yeni && <p role="status" className="rounded-xl bg-yesil-zemin px-4 py-3 font-bold text-yesil">✓ Kampanya oluşturuldu. Aşağıdan okul ve öğretmenlere duyurabilirsiniz.</p>}
      <KampanyaFormu kampanya={k} />
      <KampanyaDuyuru kampanyaId={k.id} okullar={okullar.map((x) => ({ id: x.id, ad: x.ad, plasiyerAd: x.plasiyerAd }))} smsOrnek={kampanyaSms(k)} yayinlanabilir={k.aktif && k.bitis >= bugun} />
      <Bolum id="gonderim" ust="GEÇMİŞ" baslik={`${gonderimler.length} gönderim`}>
        {gonderimler.length ? (
          <div className={TABLO.sar}>
            <table className={`${TABLO.tablo} min-w-[720px]`}>
              <thead><tr>{['Tarih', 'Kişi', 'Okul', 'Kanal', 'Alıcı', 'Durum'].map((h) => <th key={h} scope="col" className={TABLO.th}>{h}</th>)}</tr></thead>
              <tbody>
                {gonderimler.map((g) => (
                  <tr key={g.id}>
                    <td className={`${TABLO.td} whitespace-nowrap`}>{tarihSaat(g.tarih)}</td><td className={TABLO.td}>{g.kullaniciAd}</td><td className={TABLO.td}>{g.okulAd ?? '—'}</td>
                    <td className={TABLO.td}>{g.kanal === 'SMS' ? 'SMS' : 'E-posta'}</td><td className={TABLO.td}>{g.alici}</td>
                    <td className={TABLO.td}>{g.durum === 'Gonderildi' ? <Rozet ton="yesil">Gönderildi</Rozet> : g.durum === 'Hata' ? <Rozet ton="kirmizi">Hata</Rozet> : <Rozet ton="sari">Kuyrukta</Rozet>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Bos>Henüz duyuru gönderilmedi.</Bos>}
      </Bolum>
    </Sayfa>
  );
}
