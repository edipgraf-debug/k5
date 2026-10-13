import 'server-only';
import { yonetimRepo, type PersonelGirdi } from './data/yonetim';
import { plasiyerKontrol } from './yonetim-api';

/** Okul var mı, öğretmen şubeleri o okula mı ait? Hata mesajı ya da null. */
export async function personelGirdiKontrol(g: PersonelGirdi): Promise<string | null> {
  const y = await yonetimRepo();
  if (g.okulId) {
    const okul = await y.okulKaydi(g.okulId);
    if (!okul) return 'Okul bulunamadı';
  }
  if (g.tip === 'Ogretmen') {
    for (const s of g.subeIdleri) if ((await y.subeOkulu(s)) !== g.okulId) return 'Seçilen şubelerden biri bu okula ait değil';
    const pk = await plasiyerKontrol(g.plasiyerId);
    if (pk) return pk;
  }
  return null;
}

export const PERSONEL_ADLAR = { tip: 'rol', okulId: 'okul', adSoyad: 'ad soyad', eposta: 'e-posta', telefon: 'telefon', aktif: 'durum', yetkiler: 'yetkiler', subeIdleri: 'şubeler',
  opakPlasiyerKodu: 'Opak plasiyer kodu', plasiyerId: 'plasiyer' };
