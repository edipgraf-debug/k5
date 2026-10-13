import 'server-only';
import type {
  Bildirim, BildirimKaydi, HedefTipi, Kapsam, KitapListesi, ListeSatiri, Ogrenci, OgrenciOzet, OgrenciVelisi, OkulBilgi,
  Personel, SinifSecenegi, SmsKodu, TakipSatiri, Urun, Veli, VeliAlici, YayinOzeti,
} from '../types';

export interface VeliGuncelleme {
  sifreHash?: string;
  adSoyad?: string;
  basarisizGiris?: number;
  kilitBitis?: Date | null;
  telefonDogrulandi?: boolean;
  sonGiris?: Date;
}

export interface PersonelGuncelleme {
  basarisizGiris?: number;
  kilitBitis?: Date | null;
  sonGiris?: Date;
}

export interface YeniListe {
  okulId: number;
  ad: string;
  kapsam: Exclude<Kapsam, 'Ogrenci'>;
  sinifId?: number;
  subeId?: number;
  olusturanId: number;
}

export interface YayinKaydi {
  listeId: number;
  kullaniciId: number;
  guncelleme: boolean;
  sms: boolean;
  eposta: boolean;
  ogrenciSayisi: number;
  smsSayisi: number;
  epostaSayisi: number;
  hedefTipi: HedefTipi;
  /** Secili yayında sepeti görecek öğrenciler (hedefe eklenir). Toplu yayında boş. */
  ogrenciIdleri: number[];
  /** Hatırlatma: görünürlüğü değiştirmez, yalnız bildirim gönderir. */
  hatirlatma: boolean;
}

export interface OkulGirisGuncelleme { slug?: string | null; logoDosya?: string | null; logoGoster?: boolean }

/** Geriye uyumluluk: önceki sürümdeki kısa okul tipi */
export type Okul = OkulBilgi;

/** Uygulamanın veriye eriştiği tek arayüz. mock (örnek veri) ve mssql (KardelenOkul DB) uygular. */
export interface Repo {
  // kimlik
  veliTelefonla(telefon: string): Promise<Veli | null>;
  veliGuncelle(id: number, g: VeliGuncelleme): Promise<void>;
  personelEpostayla(eposta: string): Promise<Personel | null>;
  personelGuncelle(id: number, g: PersonelGuncelleme): Promise<void>;
  smsKoduKaydet(k: { telefon: string; kodHash: string; amac: SmsKodu['amac']; sonGecerlilik: Date; ip?: string }): Promise<void>;
  sonSmsKodu(telefon: string, amac: SmsKodu['amac']): Promise<SmsKodu | null>;
  smsKoduGuncelle(id: number, g: { deneme?: number; kullanildi?: boolean }): Promise<void>;

  // veli
  veliOgrencileri(veliId: number): Promise<Ogrenci[]>;
  ogrenciListeleri(ogrenciId: number): Promise<KitapListesi[]>;

  // katalog
  urunler(ids: number[]): Promise<Urun[]>;
  urunAra(q: string, limit?: number): Promise<Urun[]>;

  // okul
  okullar(): Promise<OkulBilgi[]>;
  okul(id: number): Promise<OkulBilgi | null>;
  okulSlugla(slug: string): Promise<OkulBilgi | null>;
  okulGirisGuncelle(id: number, g: OkulGirisGuncelleme): Promise<void>;
  okulOgrencileri(okulId: number, sadeceSubeler?: number[] | null): Promise<OgrenciOzet[]>;
  ogrenci(id: number): Promise<Ogrenci | null>;
  ogrenciVelileri(ogrenciId: number): Promise<OgrenciVelisi[]>;
  ogrenciBildirimleri(ogrenciId: number, limit?: number): Promise<BildirimKaydi[]>;

  // tavsiye sepetleri (kitap listeleri)
  personelSubeleri(kullaniciId: number): Promise<number[]>;
  sinifSecenekleri(okulId: number, sadeceSubeler?: number[] | null): Promise<SinifSecenegi[]>;
  okulListeleri(okulId: number): Promise<KitapListesi[]>;
  liste(id: number): Promise<KitapListesi | null>;
  listeOlustur(l: YeniListe): Promise<KitapListesi>;
  listeSatirlariKaydet(id: number, satirlar: ListeSatiri[]): Promise<void>;
  /** Kapsamdaki öğrencilerin velileri; ogrenciIdleri verilirse yalnız onlar. */
  listeAlicilari(listeId: number, ogrenciIdleri?: number[] | null): Promise<VeliAlici[]>;
  /** Kapsamdaki tüm öğrenciler + bildirim / açılma durumu */
  listeTakip(listeId: number): Promise<TakipSatiri[]>;
  goruntulemeKaydet(listeId: number, ogrenciId: number, veliId: number): Promise<void>;
  sonYayinlar(okulId: number | null, limit?: number, yayinlayanId?: number): Promise<YayinOzeti[]>;
  yayinKaydet(y: YayinKaydi): Promise<{ yayinId: number; tarih: Date }>;
  bildirimleriEkle(b: Omit<Bildirim, 'id'>[]): Promise<Bildirim[]>;
  bildirimDurum(id: number, durum: 'Gonderildi' | 'Hata', d?: { saglayiciId?: string; hata?: string }): Promise<void>;
}

let ornek: Repo | null = null;

export async function repo(): Promise<Repo> {
  if (ornek) return ornek;
  const kaynak = process.env.DATA_SOURCE ?? 'mock';
  if (kaynak === 'mssql') {
    const { MssqlRepo } = await import('./mssql');
    ornek = new MssqlRepo();
  } else {
    const { MockRepo } = await import('./mock');
    ornek = new MockRepo();
  }
  return ornek;
}
