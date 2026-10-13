/** Excel / CSV'den okunan ham satır (normalize edilmemiş metinler) */
export interface HamSatir {
  satirNo: number;           // dosyadaki satır numarası (kullanıcıya gösterilir)
  okulKodu: string | null;
  okulNo: string | null;
  ad: string | null;
  soyad: string | null;
  sinif: string | null;      // "5", "5. Sınıf", "5-A"
  sube: string | null;
  veliAdSoyad: string | null;
  veliTelefon: string | null;
  veliTelefon2: string | null;
  veliEposta: string | null;
}

export type Islem = 'Yeni' | 'Guncelle';

/** Kontrol edilmiş satır: hata varsa kaydedilmez, uyarı varsa kaydedilir */
export interface YuklemeSatiri extends HamSatir {
  okulId: number | null;
  seviye: number | null;     // çözülen sınıf seviyesi
  subeAd: string | null;     // çözülen şube ("A")
  hata: string | null;
  uyari: string | null;
  islem: Islem | null;
}

export type PartiDurum = 'Onizleme' | 'Onaylandi' | 'IptalEdildi';

export interface YuklemeParti {
  id: number;
  okulId: number | null;
  okulAd: string | null;
  dosyaAdi: string;
  durum: PartiDurum;
  toplam: number;
  hatali: number;
  kaydedilen: number;
  subeOtomatikAc: boolean;
  olusturma: Date;
  onay: Date | null;
  yukleyen: string;
  satirlar: YuklemeSatiri[];
}

export const ALAN_ADLARI: Record<Exclude<keyof HamSatir, 'satirNo'>, string> = {
  okulKodu: 'Okul Kodu', okulNo: 'Okul No', ad: 'Ad', soyad: 'Soyad', sinif: 'Sınıf', sube: 'Şube',
  veliAdSoyad: 'Veli Ad Soyad', veliTelefon: 'Veli Telefon', veliTelefon2: 'Veli 2 Telefon', veliEposta: 'Veli E-posta',
};
