export type Rol = 'veli' | 'ogretmen' | 'okul' | 'yonetim' | 'plasiyer';

export interface Oturum {
  sub: number;          // Veli.Id veya Kullanici.Id
  rol: Rol;
  ad: string;
  okulId?: number;      // ogretmen / okul
  sifreDegistir?: boolean;  // geçici şifreyle girdi: yeni şifre belirleyene kadar yalnız /sifre-degistir açık
}

export interface Veli {
  id: number;
  telefon: string;      // 5xxxxxxxxx
  adSoyad: string | null;
  eposta: string | null;
  sifreHash: string | null;
  basarisizGiris: number;
  kilitBitis: Date | null;
  aktif: boolean;
}

export interface Personel {
  id: number;
  tip: 'Yonetim' | 'Plasiyer' | 'Okul' | 'Ogretmen';
  okulId: number | null;
  adSoyad: string;
  eposta: string;
  telefon: string | null;
  sifreHash: string;
  sifreDegistirmeli: boolean;   // geçici şifreyle açılan hesap: ilk girişte yeni şifre belirler
  yetkiler: string[];
  basarisizGiris: number;
  kilitBitis: Date | null;
  aktif: boolean;
}

export interface SmsKodu {
  id: number;
  telefon: string;
  kodHash: string;
  amac: 'IlkGiris' | 'SifreSifirlama';
  sonGecerlilik: Date;
  deneme: number;
  kullanildi: boolean;
  olusturma: Date;
}

export interface Ogrenci {
  id: number;
  okulId: number;
  okulAd: string;
  okulNo: string;
  ad: string;
  soyad: string;
  sinifId: number;
  seviye: number;
  subeId: number;
  subeAd: string;      // "A"
  sinifSube: string;   // "5-A"
}

export interface Urun {
  id: number;
  opakStokKodu: string;
  barkod: string | null;
  ad: string;
  yayinevi: string | null;
  yazar: string | null;
  kategori: string | null;
  fiyat: number;        // KDV dahil, veliye yansıyan
  stok?: number | null; // depo stok miktarı (null = bilinmiyor)
  kapak?: boolean;      // sitede yüklenmiş kapak görseli var
}

export type Kapsam = 'Seviye' | 'Sube' | 'Ogrenci';
/** Toplu: kapsamdaki tüm öğrenciler görür · Secili: yalnız tek tek seçilen öğrenciler görür */
export type HedefTipi = 'Toplu' | 'Secili';

/** Tavsiye sepeti satırı: tek ürün (urunId) ya da ürün seti (setId); ikisinden yalnız biri dolu. */
export interface ListeSatiri {
  urunId: number | null;
  setId?: number | null;
  adet: number;
  zorunlu: boolean;
  satisFiyati: number | null;
}

export interface KitapListesi {
  id: number;
  okulId: number;
  sezonId: number;
  ad: string;
  kapsam: Kapsam;
  sinifId: number | null;
  subeId: number | null;
  ogrenciId: number | null;
  kapsamAd: string;          // "5-A", "5. sınıf"
  olusturanId: number;
  yayinda: boolean;
  hedefTipi: HedefTipi;
  hedefOgrenciler: number[];  // HedefTipi = Secili iken sepeti görebilen öğrenciler
  yayinTarihi: Date | null;
  guncelleme: Date | null;
  satirlar: ListeSatiri[];
}

export interface SinifSecenegi {
  kapsam: 'Seviye' | 'Sube';
  id: number;               // SinifId veya SubeId
  ad: string;               // "5. sınıf (tüm şubeler)" / "5-A"
}

export interface VeliAlici {
  veliId: number;
  telefon: string;
  eposta: string | null;
  veliAd: string | null;
  ogrenciId: number;
  ogrenciAd: string;
  sinifSube: string;
}

export interface YayinSonucu {
  yayinId: number;
  hedefTipi: HedefTipi;
  ogrenciSayisi: number;
  smsSayisi: number;
  epostaSayisi: number;
  epostasiOlmayan: number;
  tarih: Date;
}

export interface Bildirim {
  id: number;
  yayinId: number | null;
  veliId: number | null;
  ogrenciId: number | null;
  kanal: 'SMS' | 'Eposta';
  alici: string;
  konu: string | null;
  metin: string;
}

export interface OkulBilgi {
  id: number;
  kod: string;
  ad: string;
  ilce: string;
  slug: string | null;        // kardelenokul.com/{slug}
  logoDosya: string | null;
  logoGoster: boolean;        // girişte okul logosu (isteğe bağlı)
}

export type BildirimDurumu = 'Kuyrukta' | 'Gonderildi' | 'Hata';

export interface OgrenciOzet {
  id: number;
  okulId: number;
  okulNo: string;
  ad: string;
  soyad: string;
  subeId: number;
  sinifSube: string;
  veliSayisi: number;
}

/** Bir tavsiye sepetinin kapsamındaki öğrenci ve o sepet için takip bilgisi */
export interface TakipSatiri {
  ogrenciId: number;
  okulNo: string;
  ad: string;
  sinifSube: string;
  veliSayisi: number;
  epostaliVeli: number;
  gorebilir: boolean;               // sepet bu öğrenciye açık mı
  sms: BildirimDurumu | null;       // son SMS durumu
  eposta: BildirimDurumu | null;    // son e-posta durumu
  sonBildirim: Date | null;
  acildi: Date | null;              // veli sepeti ilk açtığında
}

export interface OgrenciVelisi {
  veliId: number;
  adSoyad: string | null;
  telefon: string;
  eposta: string | null;
}

export interface BildirimKaydi {
  id: number;
  listeId: number | null;
  listeAd: string | null;
  kanal: 'SMS' | 'Eposta';
  alici: string;
  durum: BildirimDurumu;
  tarih: Date;
}

export interface YayinOzeti {
  yayinId: number;
  listeId: number;
  listeAd: string;
  okulId: number;
  okulAd: string;
  kapsamAd: string;
  hedefTipi: HedefTipi;
  ogrenciSayisi: number;
  smsSayisi: number;
  epostaSayisi: number;
  hatirlatma: boolean;
  tarih: Date;
  yayinlayan: string;
  yayinlayanTip: 'Yonetim' | 'Plasiyer' | 'Okul' | 'Ogretmen';
}

/** Sepette / katalogda gösterilen kalem: ürün ya da set. anahtar = "u12" / "s3" */
export interface Kalem {
  anahtar: string;
  tur: 'urun' | 'set';
  id: number;
  ad: string;
  alt: string;              // yayınevi ya da "3 ürünlük set"
  barkod: string | null;
  fiyat: number;            // KDV dahil, veliye yansıyan
  icerik?: { ad: string; adet: number }[];   // set içeriği
  stok?: number | null;     // ürün: depo stoku; set: içindeki ürünlerden yapılabilecek en az set
  kapak?: boolean;          // ürünün kapak görseli var (/api/kapak/{id})
  eskiFiyat?: number | null; // kampanyada: kampanya öncesi fiyat
  kampanya?: string | null;  // geçerli kampanya adı
}
