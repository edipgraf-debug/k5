import 'server-only';
import { telefonNormalize } from '../auth';
import { KayitHatasi, sinifAdi, yonetimRepo } from '../data/yonetim';
import { adDuzelt, EPOSTA, satirlariKontrolEt } from './analiz';
import type { YuklemeParti } from './tipler';

export class YuklemeHatasi extends Error {}

export interface UygulamaSonucu { yeni: number; guncellenen: number; atlanan: number; acilanSube: string[]; veliBaglanan: number; hatali: number }

/**
 * Önizlemesi yapılmış yüklemeyi kaydeder. Satırlar güncel veriye göre yeniden kontrol edilir;
 * hatalı satırlar atlanır, eksik sınıf/şubeler (seçildiyse) açılır, veliler bağlanır.
 */
export async function yuklemeyiUygula(parti: YuklemeParti, kullaniciId: number): Promise<UygulamaSonucu> {
  if (parti.durum !== 'Onizleme') throw new YuklemeHatasi('Bu yükleme zaten tamamlanmış ya da iptal edilmiş');
  const y = await yonetimRepo();
  const satirlar = await satirlariKontrolEt(parti.satirlar, { varsayilanOkulId: parti.okulId, subeOtomatikAc: parti.subeOtomatikAc });

  const sonuc: UygulamaSonucu = { yeni: 0, guncellenen: 0, atlanan: 0, acilanSube: [], veliBaglanan: 0, hatali: 0 };
  const subeCache = new Map<string, number>();     // okulId|5-A → subeId
  const okulSayac = new Map<number, { yeni: number; guncellenen: number }>();

  async function subeBul(okulId: number, seviye: number, ad: string): Promise<number> {
    const k = `${okulId}|${seviye}-${ad}`;
    if (subeCache.has(k)) return subeCache.get(k)!;
    const siniflar = await y.okulSiniflari(okulId);
    let sinif = siniflar.find((s) => s.seviye === seviye);
    let sube = sinif?.subeler.find((b) => b.ad.toLocaleUpperCase('tr') === ad);
    if (!sube) {
      if (!parti.subeOtomatikAc) throw new KayitHatasi(`${seviye}-${ad} şubesi yok`);
      const sinifId = sinif?.id ?? await y.sinifEkle(okulId, seviye);
      const subeId = await y.subeEkle(sinifId, ad);
      sonuc.acilanSube.push(`${seviye}-${ad}`);
      await y.islemYaz(kullaniciId, 'Okul', okulId, 'Şube açıldı (Excel yükleme)', `${sinif ? '' : `${sinifAdi(seviye)} · `}${seviye}-${ad}`);
      subeCache.set(k, subeId);
      return subeId;
    }
    subeCache.set(k, sube.id);
    return sube.id;
  }

  for (const s of satirlar) {
    if (s.hata || !s.okulId || s.seviye == null || !s.subeAd) { sonuc.hatali++; continue; }
    try {
      const subeId = await subeBul(s.okulId, s.seviye, s.subeAd);
      const okulNo = s.okulNo!.trim();
      const girdi = { okulNo, ad: adDuzelt(s.ad!), soyad: adDuzelt(s.soyad!), subeId, aktif: true };
      const mevcut = (await y.ogrencilerOkulNo(s.okulId, [okulNo]))[0];
      let ogrenciId: number;
      const sayac = okulSayac.get(s.okulId) ?? { yeni: 0, guncellenen: 0 };
      if (mevcut) {
        const degisti = mevcut.ad !== girdi.ad || mevcut.soyad !== girdi.soyad || mevcut.subeId !== subeId || !mevcut.aktif;
        if (degisti) { await y.ogrenciGuncelle(mevcut.id, girdi); sonuc.guncellenen++; sayac.guncellenen++; }
        else sonuc.atlanan++;
        ogrenciId = mevcut.id;
      } else {
        ogrenciId = await y.ogrenciEkle({ ...girdi, okulId: s.okulId });
        sonuc.yeni++; sayac.yeni++;
      }
      okulSayac.set(s.okulId, sayac);
      const bagli = new Set((mevcut?.veliler ?? []).map((v) => v.telefon));
      const telefonlar = [s.veliTelefon, s.veliTelefon2].map((t) => (t ? telefonNormalize(t) : null));
      for (const [i, t] of telefonlar.entries()) {
        if (!t || bagli.has(t)) continue;
        try {
          await y.veliBagla(ogrenciId, { telefon: t, adSoyad: i === 0 && s.veliAdSoyad ? adDuzelt(s.veliAdSoyad) : null, eposta: i === 0 && s.veliEposta && EPOSTA.test(s.veliEposta) ? s.veliEposta : null, yakinlik: null });
          sonuc.veliBaglanan++;
        } catch (e) { if (!(e instanceof KayitHatasi)) throw e; }
      }
    } catch (e) {
      if (!(e instanceof KayitHatasi)) throw e;
      s.hata = e.message; s.islem = null; sonuc.hatali++;
    }
  }

  await y.yuklemeSatirlariYaz(parti.id, satirlar);
  await y.yuklemeBitir(parti.id, 'Onaylandi', sonuc.yeni + sonuc.guncellenen + sonuc.atlanan);
  for (const [okulId, n] of okulSayac) {
    await y.islemYaz(kullaniciId, 'Okul', okulId, 'Excel ile öğrenci yüklendi', `${parti.dosyaAdi} · ${n.yeni} yeni, ${n.guncellenen} güncellendi`);
  }
  return sonuc;
}
