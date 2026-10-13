import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { guvenliAyarlar } from '@/lib/ayar-api';
import AyarGrubuFormu from '@/components/yonetim/AyarGrubuFormu';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Firma & WhatsApp' };

const al = (a: Record<string, string>, onek: string) => Object.fromEntries(Object.entries(a).filter(([k]) => k.startsWith(`${onek}.`)).map(([k, v]) => [k.slice(onek.length + 1), v]));

export default async function FirmaAyarlari() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const { ayarlar } = await guvenliAyarlar();
  return (
    <Sayfa>
      <SayfaBasligi baslik="Firma bilgileri ve WhatsApp destek" alt="Alt bilgide, iletişim sayfasında, faturalarda ve e-postalarda görünen bilgiler." />
      <AyarGrubuFormu grup="firma" ust="FİRMA" baslik="Firma ve iletişim bilgileri" degerler={al(ayarlar, 'firma')} alanlar={[
        { ad: 'unvan', etiket: 'Ticari unvan', tur: 'metin', genis: true },
        { ad: 'adres', etiket: 'Adres', tur: 'metin', genis: true },
        { ad: 'telefon', etiket: 'Telefon', tur: 'metin', yerTutucu: '0332 000 00 00' },
        { ad: 'eposta', etiket: 'E-posta', tur: 'eposta' },
        { ad: 'calismaSaatleri', etiket: 'Çalışma saatleri', tur: 'metin' },
        { ad: 'vergiDairesi', etiket: 'Vergi dairesi', tur: 'metin' },
        { ad: 'vergiNo', etiket: 'Vergi no', tur: 'metin' },
        { ad: 'mersisNo', etiket: 'MERSİS no', tur: 'metin' },
      ]} />
      <AyarGrubuFormu grup="whatsapp" ust="DESTEK" baslik="WhatsApp destek hattı" degerler={al(ayarlar, 'whatsapp')}
        aciklama="Açıkken tüm sayfaların sağ altında WhatsApp düğmesi ve alt bilgide destek bağlantısı görünür; /destek sayfası numarayı gösterir." alanlar={[
          { ad: 'aktif', etiket: 'WhatsApp destek açık', tur: 'anahtar' },
          { ad: 'numara', etiket: 'WhatsApp numarası', tur: 'metin', yerTutucu: '0530 000 00 00' },
          { ad: 'saatler', etiket: 'Destek saatleri', tur: 'metin', yerTutucu: 'Hafta içi 09.00–18.00' },
          { ad: 'mesaj', etiket: 'Hazır ilk mesaj', tur: 'uzun' },
        ]} />
    </Sayfa>
  );
}
