import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { repo } from '@/lib/data/repo';
import { panelVerisi } from '@/lib/panel';
import { ticaretRepo } from '@/lib/data/ticaret';
import { tl } from '@/lib/bicim';
import UstCubuk from '@/components/UstCubuk';
import OkulPaneli from '@/components/panel/OkulPaneli';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Okul ana sayfası' };

export default async function OkulAna() {
  const o = await oturumAl();
  if (!o || o.rol !== 'okul' || !o.okulId) redirect('/giris');
  const okul = await (await repo()).okul(o.okulId);
  const [veri, h] = await Promise.all([panelVerisi(o, o.okulId, null), (await ticaretRepo()).hakedisDurumu(o.okulId)]);
  const hakedis = h.goster ? { tutar: tl(h.hakedis), ciro: tl(h.ciro), oran: h.oran } : null;
  return (
    <>
      <UstCubuk rol="okul" ad={o.ad} aktif="/okul" />
      <Sayfa>
        <SayfaBasligi baslik={okul?.ad ?? 'Okul'} alt={`${okul?.ilce ?? ''} · Sınıflar, öğrenciler, öğretmenlerinizin ve okul yönetiminin yayınladığı tavsiye sepetleri ve sipariş durumu.`} />
        <OkulPaneli veri={veri} rolOnek="/okul" hakedis={hakedis} />
      </Sayfa>
    </>
  );
}
