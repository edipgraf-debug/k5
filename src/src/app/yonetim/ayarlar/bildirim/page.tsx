import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { guvenliAyarlar } from '@/lib/ayar-api';
import { demoModu } from '@/lib/ortam';
import AyarGrubuFormu from '@/components/yonetim/AyarGrubuFormu';
import BildirimTesti from '@/components/yonetim/BildirimTesti';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'SMS & e-posta operatörü' };

const al = (a: Record<string, string>, onek: string) => Object.fromEntries(Object.entries(a).filter(([k]) => k.startsWith(`${onek}.`)).map(([k, v]) => [k.slice(onek.length + 1), v]));

export default async function BildirimAyarlari() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const { ayarlar, sifreKayitli } = await guvenliAyarlar();
  const sms = { saglayici: 'console', ...al(ayarlar, 'sms') };
  const eposta = { saglayici: 'console', smtpPort: '587', guvenli: '0', ...al(ayarlar, 'eposta') };
  return (
    <Sayfa>
      <SayfaBasligi baslik="SMS ve e-posta operatörü" alt="Doğrulama kodları, tavsiye sepeti ve kampanya bildirimleri bu operatörlerle gönderilir. Panelde ayar yoksa sunucu ortam değişkenleri kullanılır." />
      {demoModu() && <p role="note" className="rounded-xl bg-sari-zemin px-4 py-3 text-sm font-bold text-sari">Test sitesi: ayarlar kaydedilir ama güvenlik için tüm SMS ve e-postalar sunucu günlüğüne yazılır, gerçek gönderim yapılmaz.</p>}
      <AyarGrubuFormu grup="sms" ust="SMS" baslik="SMS operatörü" degerler={sms} sifre={{ etiket: 'Operatör şifresi / API hash', kayitli: sifreKayitli['sms.sifre'] }}
        aciklama="NetGSM ve İleti Merkezi için hazır bağlantı vardır; başka bir firma için “Genel HTTP” seçilip firma dokümanına göre uyarlanır. Başlık (originator) operatörde onaylı olmalıdır." alanlar={[
          { ad: 'saglayici', etiket: 'Sağlayıcı', tur: 'secim', secenekler: [
            { id: 'console', ad: 'Gönderme (sunucu günlüğüne yaz)' }, { id: 'netgsm', ad: 'NetGSM' }, { id: 'iletimerkezi', ad: 'İleti Merkezi' }, { id: 'http', ad: 'Genel HTTP (JSON)' }] },
          { ad: 'baslik', etiket: 'SMS başlığı (originator)', tur: 'metin', yerTutucu: 'KARDELEN' },
          { ad: 'kullanici', etiket: 'Kullanıcı adı / API anahtarı', tur: 'metin' },
          { ad: 'apiUrl', etiket: 'API adresi (yalnız Genel HTTP)', tur: 'metin', yerTutucu: 'https://...' },
        ]}>
        <BildirimTesti kanal="SMS" />
      </AyarGrubuFormu>
      <AyarGrubuFormu grup="eposta" ust="E-POSTA" baslik="E-posta (SMTP) operatörü" degerler={eposta} sifre={{ etiket: 'SMTP şifresi', kayitli: sifreKayitli['eposta.sifre'] }}
        aciklama="Kurumsal e-posta, Google Workspace, Yandex ya da bir e-posta servisinin SMTP bilgileri. 465 portu için “SSL” açılır, 587 için kapalı kalır (STARTTLS)." alanlar={[
          { ad: 'saglayici', etiket: 'Sağlayıcı', tur: 'secim', secenekler: [{ id: 'console', ad: 'Gönderme (sunucu günlüğüne yaz)' }, { id: 'smtp', ad: 'SMTP' }] },
          { ad: 'smtpSunucu', etiket: 'SMTP sunucusu', tur: 'metin', yerTutucu: 'smtp.ornek.com' },
          { ad: 'smtpPort', etiket: 'Port', tur: 'sayi', min: 1, max: 65535 },
          { ad: 'guvenli', etiket: 'SSL (465)', tur: 'anahtar' },
          { ad: 'kullanici', etiket: 'Kullanıcı adı', tur: 'metin' },
          { ad: 'gonderen', etiket: 'Gönderen', tur: 'metin', yerTutucu: 'Kardelen Okul <bilgi@kardelenokul.com>' },
        ]}>
        <BildirimTesti kanal="Eposta" />
      </AyarGrubuFormu>
    </Sayfa>
  );
}
