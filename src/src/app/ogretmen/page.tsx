import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { repo } from '@/lib/data/repo';
import { panelVerisi } from '@/lib/panel';
import UstCubuk from '@/components/UstCubuk';
import OkulPaneli from '@/components/panel/OkulPaneli';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Ana sayfa' };

export default async function OgretmenAna() {
  const o = await oturumAl();
  if (!o || o.rol !== 'ogretmen' || !o.okulId) redirect('/giris');
  const r = await repo();
  const [subeIdleri, okul] = await Promise.all([r.personelSubeleri(o.sub), r.okul(o.okulId)]);
  const veri = await panelVerisi(o, o.okulId, subeIdleri);
  const subeAdlari = [...new Set(veri.ogrenciler.map((x) => x.sinifSube))];
  return (
    <>
      <UstCubuk rol="ogretmen" ad={o.ad} aktif="/ogretmen" />
      <Sayfa>
        <SayfaBasligi baslik={`Merhaba, ${o.ad.split(' ')[0]}`}
          alt={`${okul?.ad ?? ''} · ${subeAdlari.length ? `Sınıflarınız: ${subeAdlari.join(', ')}` : 'Size atanmış şube yok; okul yönetiminizle iletişime geçin.'}`} />
        <OkulPaneli veri={veri} rolOnek="/ogretmen" ogretmen />
      </Sayfa>
    </>
  );
}
