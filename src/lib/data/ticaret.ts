import 'server-only';

/**
 * E-ticaret yönetimi veri arayüzü: ürün ve set yönetimi, tahsilatlar, veli sepetleri ve raporlar,
 * giriş / bildirim kayıtları, site ayarları (firma, WhatsApp, ödeme, havale, kargo) ve kurumsal sayfalar.
 * mock (örnek veri) ve mssql (KardelenOkul DB) uygular.
 */

// ---------- ürün ----------
export interface UrunKaydi {
  id: number;
  opakStokKodu: string;
  barkod: string | null;
  ad: string;
  yayinevi: string | null;
  yazar: string | null;
  kategori: string | null;
  listeFiyati: number;          // Opak'tan gelen KDV dahil fiyat
  webFiyati: number | null;     // sitede verilen fiyat (boş = liste fiyatı)
  fiyat: number;                // veliye yansıyan: webFiyati ?? listeFiyati
  aciklama: string | null;
  kapakDosya: string | null;
  aktif: boolean;
  stok: number | null;          // depo stoku
  stokTarihi: Date | null;
  kategoriIdleri: number[];
  setSayisi: number;
  listeSayisi: number;          // bu sezon kaç tavsiye sepetinde
  guncelleme: Date | null;
  senkron: Date | null;
}
export interface UrunFiltresi {
  q?: string;
  kategori?: string | null;
  durum?: 'aktif' | 'pasif' | 'tum';
  webFiyatli?: boolean;
  kategoriId?: number | null;   // alt kategoriler dahil
  stokta?: boolean;
  sayfa?: number;               // 1'den başlar
  sayfaBoyu?: number;
}
export interface UrunGuncelleme { aktif: boolean; webFiyati: number | null; aciklama: string | null }

// ---------- set ----------
export interface SetSatiri { urunId: number; ad: string; barkod: string | null; yayinevi: string | null; birimFiyat: number; adet: number; aktif: boolean; stok: number | null }
export interface SetKaydi {
  id: number;
  barkod: string;
  ad: string;
  aciklama: string | null;
  fiyat: number | null;         // boş = içerik toplamı
  icerikToplami: number;
  satisFiyati: number;          // fiyat ?? icerikToplami
  aktif: boolean;
  satirlar: SetSatiri[];
  listeSayisi: number;
  olusturma: Date;
  guncelleme: Date | null;
}
export interface SetGirdi {
  barkod: string;
  ad: string;
  aciklama: string | null;
  fiyat: number | null;
  aktif: boolean;
  satirlar: { urunId: number; adet: number }[];
}

// ---------- kategori ----------
export interface KategoriKaydi { id: number; ustId: number | null; ad: string; slug: string; sira: number; aktif: boolean; urunSayisi: number }
export type KategoriGirdi = Omit<KategoriKaydi, 'id' | 'urunSayisi'>;

// ---------- kampanya ----------
export interface KampanyaUrunu { urunId: number; ad: string; barkod: string | null; yayinevi: string | null; normalFiyat: number; kampanyaFiyati: number;
  ozelFiyat: number | null; stok: number | null }
export interface KampanyaKaydi {
  id: number;
  ad: string;
  aciklama: string | null;
  baslangic: string;            // YYYY-MM-DD
  bitis: string;
  indirimOrani: number | null;
  aktif: boolean;
  yayinda: boolean;             // aktif ve bugün tarih aralığında
  urunler: KampanyaUrunu[];
  gonderim: number;
  sonGonderim: Date | null;
  olusturma: Date;
}
export interface KampanyaGirdi { ad: string; aciklama: string | null; baslangic: string; bitis: string; indirimOrani: number | null; aktif: boolean;
  urunler: { urunId: number; kampanyaFiyati: number | null }[] }
export interface KampanyaGonderimi { id: number; kampanyaId: number; kullaniciId: number; kullaniciAd: string; okulAd: string | null; kanal: 'SMS' | 'Eposta';
  alici: string; durum: 'Kuyrukta' | 'Gonderildi' | 'Hata'; tarih: Date }

// ---------- hakediş ----------
export interface HakedisTanimKaydi { id: number; oran: number; baslangic: string; bitis: string | null; veli: boolean; toplu: boolean; aciklama: string | null; olusturan: string; olusturma: Date }
export interface HakedisDurumu {
  goster: boolean;              // okul kendi panelinde görür
  oran: number | null;          // bugün geçerli oran
  ciro: number;                 // bu sezon, KDV dahil, teslimat hariç; ödenmiş ve iptal/iade olmayan
  hakedis: number;
  siparis: number;
  tanimlar: HakedisTanimKaydi[];
}

// ---------- tahsilat ----------
export type OdemeTipi = 'Kart' | 'Havale';
export type OdemeDurumu = 'Bekliyor' | 'Basarili' | 'Basarisiz' | 'Iade';
export interface TahsilatSatiri {
  id: number;
  tarih: Date;
  siparisId: number;
  siparisNo: string;
  okulId: number;
  okulAd: string;
  plasiyerAd: string | null;
  veliAd: string | null;
  veliTelefon: string | null;
  ogrenciAd: string | null;
  tip: OdemeTipi;
  durum: OdemeDurumu;
  tutar: number;
  taksit: number | null;
  pos: string | null;
  kartSonDort: string | null;
  banka: string | null;
  havaleGonderen: string | null;
  referans: string | null;
  onaylayan: string | null;
  onayTarihi: Date | null;
}
export interface TahsilatFiltresi {
  baslangic?: Date | null;
  bitis?: Date | null;          // dahil (gün sonu)
  tip?: OdemeTipi | null;
  durum?: OdemeDurumu | null;
  okulId?: number | null;
  okulIdleri?: number[] | null; // plasiyer: yalnız kendi okulları
  q?: string;
}

// ---------- veli sepeti / raporlar ----------
export interface VeliSepetSatiri { listeId: number | null; urunId: number | null; setId: number | null; adet: number; birimFiyat: number }
export interface TerkSepet {
  sepetId: number;
  veliId: number;
  veliAd: string | null;
  telefon: string;
  eposta: string | null;
  ogrenciId: number;
  ogrenciAd: string;
  okulId: number;
  okulAd: string;
  sinifSube: string | null;
  plasiyerAd: string | null;
  kalem: number;
  tutar: number;
  olusturma: Date;
  guncelleme: Date;
}
export interface TerkFiltresi { saat: number; okulId?: number | null; okulIdleri?: number[] | null }

// ---------- kayıtlar ----------
export interface GirisGirdi {
  tip: 'Veli' | 'Personel';
  kullaniciId?: number | null;
  veliId?: number | null;
  kimlik: string;
  rol?: string | null;
  basarili: boolean;
  sebep?: string | null;
  ip?: string | null;
  tarayici?: string | null;
}
export interface GirisSatiri { id: number; tarih: Date; tip: 'Veli' | 'Personel'; ad: string | null; kimlik: string; rol: string | null; basarili: boolean; sebep: string | null; ip: string | null }
export interface GirisFiltresi { tip?: 'Veli' | 'Personel' | null; basarili?: boolean | null; q?: string; baslangic?: Date | null; bitis?: Date | null; limit?: number }
export interface BildirimLogSatiri { id: number; tarih: Date; kanal: 'SMS' | 'Eposta'; alici: string; durum: 'Kuyrukta' | 'Gonderildi' | 'Hata'; okulAd: string | null; listeAd: string | null }
export interface BildirimFiltresi { kanal?: 'SMS' | 'Eposta' | null; durum?: 'Kuyrukta' | 'Gonderildi' | 'Hata' | null; limit?: number }

// ---------- ayarlar ----------
export interface BankaHesabiKaydi { id: number; banka: string; hesapAdi: string; iban: string; sube: string | null; hesapNo: string | null; paraBirimi: 'TRY' | 'USD' | 'EUR'; sira: number; aktif: boolean }
export type BankaHesabiGirdi = Omit<BankaHesabiKaydi, 'id'>;

export interface KargoBolgeKaydi { id: number; firmaId: number | null; il: string; ilce: string; mahalle: string | null; ucret: number; ucretsizLimit: number | null; aktif: boolean }
export type KargoBolgeGirdi = Omit<KargoBolgeKaydi, 'id'>;
export interface KargoFirmaKaydi {
  id: number;
  kod: string;
  ad: string;
  tur: 'Kurye' | 'Kargo';
  entegrasyon: 'Api' | 'Manuel';
  sabitUcret: number;
  ucretsizLimit: number | null;
  tahminiTeslim: string | null;
  takipUrl: string | null;
  sira: number;
  aktif: boolean;
  bolgeler: KargoBolgeKaydi[];
}
export type KargoFirmaGirdi = Omit<KargoFirmaKaydi, 'id' | 'bolgeler'>;

export interface TaksitKaydi { id: number; kartAilesi: string | null; taksit: number; vadeFarki: number; aktif: boolean }
export interface PosKaydi { id: number; kod: string; ad: string; test: boolean; aktif: boolean; taksitler: TaksitKaydi[] }
export interface PosKurali {
  id: number;
  oncelik: number;
  ad: string;
  taksitMin: number | null;
  taksitMax: number | null;
  kartBankasi: string | null;
  kartAilesi: string | null;
  kartTipi: 'Kredi' | 'Banka' | null;
  posId: number;
  posAd: string;
  aktif: boolean;
}
export type PosKuraliGirdi = Omit<PosKurali, 'id' | 'posAd'>;

export interface SayfaKaydi { id: number; slug: string; baslik: string; icerik: string; yayinda: boolean; altBilgi: boolean; sira: number; guncelleme: Date }
export type SayfaGirdi = Omit<SayfaKaydi, 'id' | 'guncelleme'>;

export interface TicaretRepo {
  // ürün
  urunListesi(f: UrunFiltresi): Promise<{ satirlar: UrunKaydi[]; toplam: number }>;
  urunKaydi(id: number): Promise<UrunKaydi | null>;
  urunGuncelle(id: number, g: UrunGuncelleme): Promise<void>;
  urunKapak(id: number, dosya: string | null): Promise<void>;
  opakKategorileri(): Promise<string[]>;   // Opak'tan gelen kategori metinleri
  // kategori
  kategoriler(pasifDahil?: boolean): Promise<KategoriKaydi[]>;
  kategoriKaydet(id: number | null, g: KategoriGirdi): Promise<number>;
  kategoriSil(id: number): Promise<void>;                    // alt kategorisi varsa KayitHatasi
  kategoriyeEkle(kategoriId: number, urunIdleri: number[]): Promise<number>;    // eklenen sayısı
  kategoridenCikar(kategoriId: number, urunIdleri: number[]): Promise<void>;
  // kampanya
  kampanyalar(f?: { yayindakiler?: boolean }): Promise<KampanyaKaydi[]>;
  kampanya(id: number): Promise<KampanyaKaydi | null>;
  kampanyaKaydet(id: number | null, g: KampanyaGirdi, kullaniciId: number): Promise<number>;
  kampanyaGonderimEkle(l: Omit<KampanyaGonderimi, 'id' | 'kullaniciAd' | 'okulAd' | 'tarih' | 'durum'>[], gonderenId: number): Promise<number[]>;
  kampanyaGonderimDurum(id: number, durum: 'Gonderildi' | 'Hata', hata?: string): Promise<void>;
  kampanyaGonderimleri(kampanyaId: number, limit?: number): Promise<KampanyaGonderimi[]>;
  // hakediş
  hakedisDurumu(okulId: number): Promise<HakedisDurumu>;
  hakedisTanimEkle(okulId: number, g: Omit<HakedisTanimKaydi, 'id' | 'olusturan' | 'olusturma'>, kullaniciId: number): Promise<number>;
  hakedisGosterAyarla(okulId: number, goster: boolean): Promise<void>;
  // set
  setListesi(f: { q?: string; pasifDahil?: boolean }): Promise<SetKaydi[]>;
  setKaydi(id: number): Promise<SetKaydi | null>;
  setler(ids: number[]): Promise<SetKaydi[]>;
  setAra(q: string, limit?: number): Promise<SetKaydi[]>;          // yalnız aktif
  setEkle(g: SetGirdi, kullaniciId: number): Promise<number>;
  setGuncelle(id: number, g: SetGirdi): Promise<void>;
  /** Barkod başka bir ürün ya da sette kullanılıyor mu */
  barkodKullanimi(barkod: string, haricSetId?: number): Promise<'urun' | 'set' | null>;
  // tahsilat
  tahsilatlar(f: TahsilatFiltresi): Promise<TahsilatSatiri[]>;
  /** Bekleyen havaleyi onaylar; sipariş "Odendi" olur. Bekleyen değilse false. */
  havaleOnayla(odemeId: number, kullaniciId: number): Promise<boolean>;
  // veli sepeti ve raporlar
  veliSepetKaydet(veliId: number, ogrenciId: number, satirlar: VeliSepetSatiri[]): Promise<void>;
  /** Öğrencinin açık sepeti (yoksa boş) */
  veliSepeti(veliId: number, ogrenciId: number): Promise<VeliSepetSatiri[]>;
  terkEdilenSepetler(f: TerkFiltresi): Promise<TerkSepet[]>;
  /** Bu sezon sipariş vermiş (iptal / iade hariç) öğrenciler */
  siparisVerenOgrenciler(okulIdleri?: number[] | null): Promise<Set<number>>;
  // kayıtlar
  girisYaz(g: GirisGirdi): Promise<void>;
  girisLog(f: GirisFiltresi): Promise<GirisSatiri[]>;
  bildirimLog(f: BildirimFiltresi): Promise<BildirimLogSatiri[]>;
  // ayarlar
  ayarlar(): Promise<Record<string, string>>;
  ayarlarKaydet(d: Record<string, string>): Promise<void>;
  bankaHesaplari(pasifDahil?: boolean): Promise<BankaHesabiKaydi[]>;
  bankaHesabiKaydet(id: number | null, g: BankaHesabiGirdi): Promise<number>;
  kargoFirmalari(pasifDahil?: boolean): Promise<KargoFirmaKaydi[]>;
  kargoFirmaKaydet(id: number | null, g: KargoFirmaGirdi): Promise<number>;
  kargoBolgeKaydet(id: number | null, g: KargoBolgeGirdi): Promise<number>;
  kargoBolgeSil(id: number): Promise<void>;
  posListesi(): Promise<PosKaydi[]>;
  posGuncelle(id: number, g: { test: boolean; aktif: boolean }): Promise<void>;
  taksitleriKaydet(posId: number, t: Omit<TaksitKaydi, 'id'>[]): Promise<void>;
  posKurallari(): Promise<PosKurali[]>;
  posKuraliKaydet(id: number | null, g: PosKuraliGirdi): Promise<number>;
  posKuraliSil(id: number): Promise<void>;
  // kurumsal sayfalar
  sayfalar(): Promise<SayfaKaydi[]>;
  sayfa(slug: string): Promise<SayfaKaydi | null>;
  sayfaKaydet(id: number | null, g: SayfaGirdi): Promise<number>;
}

let ornek: TicaretRepo | undefined;
export async function ticaretRepo(): Promise<TicaretRepo> {
  if (!ornek) {
    if ((process.env.DATA_SOURCE ?? 'mock') === 'mssql') {
      const { MssqlTicaretRepo } = await import('./ticaret-mssql');
      ornek = new MssqlTicaretRepo();
    } else {
      const { MockTicaretRepo } = await import('./ticaret-mock');
      ornek = new MockTicaretRepo();
    }
  }
  return ornek;
}
