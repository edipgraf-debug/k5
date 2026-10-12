import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { repo } from '@/lib/data/repo';
import { panelVerisi } from '@/lib/panel';
import UstCubuk from '@/components/UstCubuk';
import OkulPaneli from '@/components/panel/OkulPaneli';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Okul ana sayfası' };

export default async function OkulAna() {
  const o = await oturumAl();
  if (!o || o.rol !== 'okul' || !o.okulId) redirect('/giris');
  const okul = await (await repo()).okul(o.okulId);
  const veri = await panelVerisi(o, o.okulId, null);
  return (
    <>
      <UstCubuk rol="okul" ad={o.ad} aktif="/okul" />
      <Sayfa>
        <SayfaBasligi baslik={okul?.ad ?? 'Okul'} alt={`${okul?.ilce ?? ''} · Tavsiye sepetleri, öğrenciler ve bildirim durumu. Toplu sipariş, tedarik ve hakediş ekranları sipariş aşamasıyla açılacak.`} />
        <OkulPaneli veri={veri} rolOnek="/okul" />
      </Sayfa>
    </>
  );
}
