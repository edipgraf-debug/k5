import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import { ticaretRepo } from '@/lib/data/ticaret';
import HakedisYonetimi from '@/components/yonetim/HakedisYonetimi';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Hakediş' };

export default async function Hakedis() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const t = await ticaretRepo();
  const okullar = await (await yonetimRepo()).okulListesi();
  const l = await Promise.all(okullar.map(async (x) => ({ id: x.id, ad: x.ad, plasiyerAd: x.plasiyerAd, durum: await t.hakedisDurumu(x.id) })));
  return (
    <Sayfa>
      <SayfaBasligi baslik="Okul hakedişleri" alt="Okul bazında hakediş oranı ve geçerlilik tarihleri. “Okul görsün” açıksa okul kendi panelinde ciro, oran ve hakediş tutarını görür. Ciro: bu sezon ödenmiş, iptal / iade olmayan siparişler (KDV dahil, teslimat hariç)." />
      <HakedisYonetimi okullar={l} />
    </Sayfa>
  );
}
