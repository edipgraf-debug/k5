import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import { satirlariKontrolEt } from '@/lib/yukleme/analiz';
import { tarihSaat } from '@/lib/bicim';
import UstCubuk from '@/components/UstCubuk';
import YuklemeOnizleme from '@/components/yonetim/YuklemeOnizleme';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Yükleme önizlemesi' };

export default async function YuklemeDetay({ params }: { params: Promise<{ id: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const y = await yonetimRepo();
  const parti = await y.yuklemeParti(id);
  if (!parti) notFound();
  // önizleme bekleyen yüklemeyi güncel veriye göre yeniden kontrol et (araya başka kayıt girmiş olabilir)
  if (parti.durum === 'Onizleme') parti.satirlar = await satirlariKontrolEt(parti.satirlar, { varsayilanOkulId: parti.okulId, subeOtomatikAc: parti.subeOtomatikAc });
  else {
    // tamamlanmış yüklemede sınıf/şube gösterimi için çözümle
    const { sinifCoz } = await import('@/lib/yukleme/sinif');
    for (const s of parti.satirlar) { const c = sinifCoz(s.sinif, s.sube); if (!('hata' in c)) { s.seviye = c.seviye; s.subeAd = c.sube; } }
  }
  const okulAdlari = Object.fromEntries((await y.okulListesi(true)).map((x) => [x.id, x.ad]));
  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/ogrenciler" />
      <Sayfa>
        <SayfaBasligi baslik={parti.durum === 'Onizleme' ? 'Kontrol sonucu' : 'Yükleme'} geri={{ href: '/yonetim/ogrenciler/yukle', ad: 'Excel ile öğrenci yükleme' }}
          alt={`${parti.dosyaAdi} · ${parti.okulAd ?? 'birden çok okul'} · ${tarihSaat(parti.olusturma)} · ${parti.yukleyen}${parti.subeOtomatikAc ? ' · eksik şubeler açılacak' : ''}`} />
        <YuklemeOnizleme parti={parti} okulAdlari={okulAdlari} />
      </Sayfa>
    </>
  );
}
