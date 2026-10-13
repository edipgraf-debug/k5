import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo, type PersonelTipi } from '@/lib/data/yonetim';
import UstCubuk from '@/components/UstCubuk';
import KullaniciFormu from '@/components/yonetim/KullaniciFormu';
import { plasiyerSecenekleri } from '@/lib/yonetim';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Yeni kullanıcı' };

export default async function YeniKullanici({ searchParams }: { searchParams: Promise<{ tip?: string; okulId?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const sp = await searchParams;
  const y = await yonetimRepo();
  const [okullar, plasiyerler] = await Promise.all([y.okulListesi(), plasiyerSecenekleri()]);
  const tip: PersonelTipi = (['Ogretmen', 'Okul', 'Yonetim', 'Plasiyer'] as const).find((t) => t === sp.tip) ?? 'Ogretmen';
  const istenen = Number(sp.okulId);
  const okulId = okullar.some((x) => x.id === istenen) ? istenen : okullar.length === 1 ? okullar[0].id : null;
  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/kullanicilar" />
      <Sayfa>
        <SayfaBasligi baslik="Yeni kullanıcı" geri={{ href: '/yonetim/kullanicilar', ad: 'Kullanıcılar' }} />
        <KullaniciFormu plasiyerler={plasiyerler} okullar={okullar.map((x) => ({ id: x.id, kod: x.kod, ad: x.ad, plasiyerId: x.plasiyerId }))} varsayilan={{ tip, okulId }}
          siniflar={okulId ? await y.okulSiniflari(okulId) : undefined} />
      </Sayfa>
    </>
  );
}
