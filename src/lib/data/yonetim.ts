import 'server-only';
import type { PartiDurum, YuklemeParti, YuklemeSatiri } from '../yukleme/tipler';

/**
 * Kitabevi (Kardelen) yönetim paneli veri arayüzü: okul, sınıf/şube, öğrenci, veli ve kullanıcı kayıtları.
 * mock (örnek veri) ve mssql (KardelenOkul DB) uygular. Şifre düz metni bu katmana hiç gelmez; yalnız hash.
 */

export interface OkulKaydi {
  id: number;
  kod: string;
  ad: string;
  il: string;
  ilce: string;
  adres: string | null;
  telefon: string | null;
  eposta: string | null;
  opakCariKodu: string | null;
  opakWebCariKodu: string | null;
  aktif: boolean;
  slug: string | null;
}
export type OkulGirdi = Omit<OkulKaydi, 'id' | 'slug'>;

export interface SubeKaydi { id: number; ad: string; ogrenci: number; ogretmen: number }
export interface SinifKaydi { id: number; seviye: number; ad: string; subeler: SubeKaydi[] }

export interface VeliKaydi {
  id: number;
  telefon: string;
  adSoyad: string | null;
  eposta: string | null;
  yakinlik: string | null;
  sifreVar: boolean;          // false: ilk girişte SMS ile belirleyecek
  kilitli: boolean;
  sonGiris: Date | null;
  aktif: boolean;
  ogrenciler: { id: number; ad: string; okulAd: string; sinifSube: string }[];
}

export interface OgrenciKaydi {
  id: number;
  okulId: number;
  okulAd: string;
  okulNo: string;
  ad: string;
  soyad: string;
  subeId: number | null;      // aktif sezonda şubesi yoksa null
  sinifSube: string | null;
  aktif: boolean;
  veliler: VeliKaydi[];
}
export interface OgrenciGirdi { okulId: number; okulNo: string; ad: string; soyad: string; subeId: number; aktif: boolean }

export type PersonelTipi = 'Yonetim' | 'Okul' | 'Ogretmen';
export interface PersonelKaydi {
  id: number;
  tip: PersonelTipi;
  okulId: number | null;
  okulAd: string | null;
  adSoyad: string;
  eposta: string;
  telefon: string | null;
  aktif: boolean;
  kilitli: boolean;
  sifreDegistirmeli: boolean;
  sonGiris: Date | null;
  yetkiler: string[];
  subeler: { id: number; ad: string }[];
}
export interface PersonelGirdi {
  tip: PersonelTipi;
  okulId: number | null;
  adSoyad: string;
  eposta: string;
  telefon: string | null;
  aktif: boolean;
  yetkiler: string[];
  subeIdleri: number[];
}

export interface IslemKaydi { id: number; kullanici: string; islem: string; ayrinti: string | null; tarih: Date }
export type HedefTip = 'Okul' | 'Ogrenci' | 'Veli' | 'Kullanici';

export interface AramaFiltresi { q?: string; okulId?: number | null; subeId?: number | null; pasifDahil?: boolean; limit?: number }

/** Benzersizlik ihlallerinde fırlatılır; mesaj kullanıcıya gösterilebilir. */
export class KayitHatasi extends Error {}

export interface YonetimRepo {
  // okul
  okulKaydi(id: number): Promise<OkulKaydi | null>;
  okulListesi(pasifDahil?: boolean): Promise<OkulKaydi[]>;
  okulEkle(o: OkulGirdi): Promise<number>;
  okulGuncelle(id: number, o: OkulGirdi): Promise<void>;
  okulKodOner(): Promise<string>;
  // sınıf / şube (aktif sezon)
  okulSiniflari(okulId: number): Promise<SinifKaydi[]>;
  sinifEkle(okulId: number, seviye: number): Promise<number>;
  subeEkle(sinifId: number, ad: string): Promise<number>;
  subeSil(subeId: number): Promise<void>;                     // yalnız boş şube
  subeOkulu(subeId: number): Promise<number | null>;
  sinifOkulu(sinifId: number): Promise<number | null>;
  // öğrenci / veli
  ogrenciAra(f: AramaFiltresi): Promise<OgrenciKaydi[]>;
  ogrenciKaydi(id: number): Promise<OgrenciKaydi | null>;
  ogrenciEkle(o: OgrenciGirdi): Promise<number>;
  ogrenciGuncelle(id: number, o: Omit<OgrenciGirdi, 'okulId'>): Promise<void>;
  veliKaydi(id: number): Promise<VeliKaydi | null>;
  veliTelefonKaydi(telefon: string): Promise<VeliKaydi | null>;
  veliBagla(ogrenciId: number, v: { telefon: string; adSoyad: string | null; eposta: string | null; yakinlik: string | null }): Promise<{ veliId: number; yeni: boolean }>;
  veliAyir(ogrenciId: number, veliId: number): Promise<void>;
  veliDuzenle(id: number, v: { telefon: string; adSoyad: string | null; eposta: string | null; aktif: boolean }): Promise<void>;
  veliSifreSifirla(id: number): Promise<void>;
  veliKilitAc(id: number): Promise<void>;
  // kullanıcılar
  personelListesi(f: { q?: string; tip?: PersonelTipi | null; okulId?: number | null; pasifDahil?: boolean }): Promise<PersonelKaydi[]>;
  personelKaydi(id: number): Promise<PersonelKaydi | null>;
  personelEkle(p: PersonelGirdi, sifreHash: string): Promise<number>;
  personelDuzenle(id: number, p: PersonelGirdi): Promise<void>;
  personelSifreAta(id: number, sifreHash: string, degistirmeli: boolean): Promise<void>;
  personelKilitAc(id: number): Promise<void>;
  // Excel ile öğrenci yükleme
  ogrencilerOkulNo(okulId: number, okulNolar: string[]): Promise<OgrenciKaydi[]>;
  velilerTelefonla(telefonlar: string[]): Promise<VeliKaydi[]>;
  yuklemeOlustur(p: { okulId: number | null; dosyaAdi: string; kullaniciId: number; subeOtomatikAc: boolean }, satirlar: YuklemeSatiri[]): Promise<number>;
  yuklemeParti(id: number): Promise<YuklemeParti | null>;
  yuklemeSatirlariYaz(id: number, satirlar: YuklemeSatiri[]): Promise<void>;   // yeniden kontrol sonucu (hata/uyarı/işlem/okul)
  yuklemeBitir(id: number, durum: Exclude<PartiDurum, 'Onizleme'>, kaydedilen: number): Promise<void>;
  yuklemeGecmisi(limit?: number): Promise<Omit<YuklemeParti, 'satirlar'>[]>;
  // işlem kaydı
  islemYaz(kullaniciId: number, hedef: HedefTip, hedefId: number, islem: string, ayrinti?: string | null): Promise<void>;
  islemler(hedef: HedefTip, hedefId: number, limit?: number): Promise<IslemKaydi[]>;
}

let ornek: YonetimRepo | undefined;
export async function yonetimRepo(): Promise<YonetimRepo> {
  if (!ornek) {
    if ((process.env.DATA_SOURCE ?? 'mock') === 'mssql') {
      const { MssqlYonetimRepo } = await import('./yonetim-mssql');
      ornek = new MssqlYonetimRepo();
    } else {
      const { MockYonetimRepo } = await import('./yonetim-mock');
      ornek = new MockYonetimRepo();
    }
  }
  return ornek;
}

export { YETKILER_LISTESI as YETKILER } from '@/components/yonetim/yetkiler';

export const sinifAdi = (seviye: number) => (seviye === 0 ? 'Anasınıfı' : `${seviye}. Sınıf`);
