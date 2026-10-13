import 'server-only';
import bcrypt from 'bcryptjs';
import type { Repo, VeliGuncelleme, PersonelGuncelleme, YeniListe, YayinKaydi, OkulGirisGuncelleme } from './repo';
import type {
  Bildirim, BildirimDurumu, BildirimKaydi, KitapListesi, ListeSatiri, Ogrenci, OgrenciOzet, OgrenciVelisi, OkulBilgi,
  Personel, SinifSecenegi, SmsKodu, TakipSatiri, Urun, Veli, VeliAlici, YayinOzeti,
} from '../types';

/**
 * Örnek veri deposu (DATA_SOURCE=mock). SQL Server olmadan uygulamayı uçtan uca denemek için.
 * Demo girişleri:
 *   Veli (ilk giriş, SMS ile şifre belirler): 532 000 00 00
 *   Veli (şifreli):                          533 111 22 33 / Veli1234
 *   Öğretmen:  ogretmen@demo.k12.tr / Demo1234   (yalnız 5-A)
 *   Okul:      okul@demo.k12.tr / Demo1234
 *   Yönetim:   yonetim@kardelenokul.com / Demo1234
 */

export interface Sinif { id: number; okulId: number; seviye: number }
export interface Sube { id: number; sinifId: number; ad: string }
export interface OgrKayit { id: number; okulId: number; okulNo: string; ad: string; soyad: string; subeId: number; aktif?: boolean }
export interface VeliKayit extends Veli { ogrenciler: number[]; yakinlik?: Record<number, string>; sonGiris?: Date | null }
export interface PersonelKayit extends Personel { subeler: number[]; sonGiris?: Date | null; opakPlasiyerKodu?: string | null; plasiyerId?: number | null }
export interface OkulTam extends OkulBilgi { il: string; adres: string | null; telefon: string | null; eposta: string | null;
  opakCariKodu: string | null; opakWebCariKodu: string | null; aktif: boolean; plasiyerId?: number | null; hakedisGoster?: boolean }
/** Ürün kaydının tamamı: fiyat = webFiyati ?? listeFiyati (veliye yansıyan) */
export interface UrunTam extends Urun { listeFiyati: number; webFiyati: number | null; kdvOrani: number; aciklama: string | null; kapakDosya: string | null;
  aktif: boolean; guncelleme: Date | null; senkron: Date | null; stok: number | null; stokTarihi: Date | null }
export interface SetKayit { id: number; barkod: string; ad: string; aciklama: string | null; fiyat: number | null; aktif: boolean;
  satirlar: { urunId: number; adet: number }[]; olusturanId: number; olusturma: Date; guncelleme: Date | null }
export interface SiparisKayit { id: number; no: string; okulId: number; veliId: number; ogrenciId: number; durum: string; odemeTipi: 'Kart' | 'Havale';
  toplam: number; havaleRef: string | null; tarih: Date }
export interface OdemeKayit { id: number; siparisId: number; tip: 'Kart' | 'Havale'; tutar: number; durum: 'Bekliyor' | 'Basarili' | 'Basarisiz' | 'Iade';
  posId: number | null; taksit: number | null; kartSonDort: string | null; bankaHesabiId: number | null; havaleGonderen: string | null;
  onaylayanId: number | null; onayTarihi: Date | null; tarih: Date }
export interface VeliSepetKayit { id: number; veliId: number; ogrenciId: number; durum: 'Acik' | 'Siparis' | 'Bosaltildi'; siparisId: number | null;
  satirlar: { listeId: number | null; urunId: number | null; setId: number | null; adet: number; birimFiyat: number }[]; olusturma: Date; guncelleme: Date }
export interface GirisKayit { id: number; tip: 'Veli' | 'Personel'; kullaniciId: number | null; veliId: number | null; kimlik: string; rol: string | null;
  basarili: boolean; sebep: string | null; ip: string | null; tarih: Date }
export interface Ticaret {
  setler: SetKayit[];
  siparisler: SiparisKayit[];
  odemeler: OdemeKayit[];
  sepetler: VeliSepetKayit[];
  girisler: GirisKayit[];
  ayarlar: Record<string, string>;
  bankalar: import('./ticaret').BankaHesabiKaydi[];
  kargolar: Omit<import('./ticaret').KargoFirmaKaydi, 'bolgeler'>[];
  bolgeler: import('./ticaret').KargoBolgeKaydi[];
  poslar: Omit<import('./ticaret').PosKaydi, 'taksitler'>[];
  taksitler: (import('./ticaret').TaksitKaydi & { posId: number })[];
  kurallar: Omit<import('./ticaret').PosKurali, 'posAd'>[];
  sayfalar: import('./ticaret').SayfaKaydi[];
  kategoriler: Omit<import('./ticaret').KategoriKaydi, 'urunSayisi'>[];
  urunKategori: { kategoriId: number; urunId: number }[];
  kampanyalar: { id: number; ad: string; aciklama: string | null; baslangic: string; bitis: string; indirimOrani: number | null; aktif: boolean;
    urunler: { urunId: number; kampanyaFiyati: number | null }[]; olusturanId: number; olusturma: Date }[];
  gonderimler: { id: number; kampanyaId: number; kullaniciId: number; kanal: 'SMS' | 'Eposta'; alici: string; durum: 'Kuyrukta' | 'Gonderildi' | 'Hata'; gonderenId: number; tarih: Date }[];
  hakedis: { id: number; okulId: number; oran: number; baslangic: string; bitis: string | null; veli: boolean; toplu: boolean; aciklama: string | null; olusturanId: number; olusturma: Date }[];
}
export interface IslemKayit { id: number; kullaniciId: number; hedef: string; hedefId: number; islem: string; ayrinti: string | null; tarih: Date }
const aktifOgr = (o: OgrKayit) => o.aktif !== false;

interface YayinKayit { id: number; listeId: number; kullaniciId: number; hedefTipi: KitapListesi['hedefTipi']; hatirlatma: boolean;
  ogrenciSayisi: number; smsSayisi: number; epostaSayisi: number; tarih: Date }
type BildirimKayit = Bildirim & { durum: BildirimDurumu; tarih: Date };

export interface Depo {
  okullar: OkulTam[];
  siniflar: Sinif[];
  subeler: Sube[];
  ogrenciler: OgrKayit[];
  veliler: VeliKayit[];
  personel: PersonelKayit[];
  urunler: UrunTam[];
  listeler: KitapListesi[];
  kodlar: SmsKodu[];
  yayinlar: YayinKayit[];
  bildirimler: BildirimKayit[];
  goruntulemeler: { listeId: number; ogrenciId: number; veliId: number; ilk: Date }[];
  islemler: IslemKayit[];
  yuklemeler?: { id: number; okulId: number | null; dosyaAdi: string; kullaniciId: number; subeOtomatikAc: boolean; durum: 'Onizleme' | 'Onaylandi' | 'IptalEdildi';
    kaydedilen: number; olusturma: Date; onay: Date | null; satirlar: import('../yukleme/tipler').YuklemeSatiri[] }[];
  ticaret: Ticaret;
  sayac: number;
}

function tohum(): Depo {
  const h = (s: string) => bcrypt.hashSync(s, 10);
  const demo = h('Demo1234');
  const simdi = new Date();
  const once = (saat: number) => new Date(simdi.getTime() - saat * 3_600_000);
  return {
    okullar: [
      { id: 1, kod: 'OK-1001', ad: 'Örnek Ortaokulu', il: 'Konya', ilce: 'Meram', slug: 'ornek-ortaokulu', logoDosya: 'ok-1001-ornek.png', logoGoster: true,
        adres: 'Örnek Mah. Okul Cad. No: 1', telefon: '3320000000', eposta: 'ornekortaokulu@meb.k12.tr', opakCariKodu: '120 42 1001', opakWebCariKodu: '120 42 1001 W', aktif: true, plasiyerId: 4, hakedisGoster: true },
      { id: 2, kod: 'OK-1002', ad: 'Örnek İlkokulu', il: 'Konya', ilce: 'Selçuklu', slug: 'ornek-ilkokulu', logoDosya: null, logoGoster: false,
        adres: null, telefon: null, eposta: null, opakCariKodu: null, opakWebCariKodu: null, aktif: true, plasiyerId: 5 },
    ],
    siniflar: [
      { id: 1, okulId: 1, seviye: 5 },
      { id: 2, okulId: 1, seviye: 2 },
    ],
    subeler: [
      { id: 1, sinifId: 1, ad: 'A' },
      { id: 2, sinifId: 1, ad: 'B' },
      { id: 3, sinifId: 2, ad: 'B' },
    ],
    ogrenciler: [
      { id: 1, okulId: 1, okulNo: '412', ad: 'Elif', soyad: 'Yılmaz', subeId: 1 },
      { id: 2, okulId: 1, okulNo: '187', ad: 'Can', soyad: 'Yılmaz', subeId: 3 },
      { id: 3, okulId: 1, okulNo: '415', ad: 'Mert', soyad: 'Kaya', subeId: 1 },
      { id: 4, okulId: 1, okulNo: '418', ad: 'Zeynep', soyad: 'Arslan', subeId: 1 },
      { id: 5, okulId: 1, okulNo: '423', ad: 'Ayşe', soyad: 'Çelik', subeId: 1 },
      { id: 6, okulId: 1, okulNo: '190', ad: 'Defne', soyad: 'Şahin', subeId: 3 },
      { id: 7, okulId: 1, okulNo: '501', ad: 'Ali', soyad: 'Demir', subeId: 2 },
    ],
    veliler: [
      { id: 1, telefon: '5320000000', adSoyad: 'Ayşe Yılmaz', eposta: 'ayse.yilmaz@ornek.com', sifreHash: null, basarisizGiris: 0, kilitBitis: null, aktif: true, ogrenciler: [1, 2] },
      { id: 2, telefon: '5331112233', adSoyad: 'Hakan Kaya', eposta: 'hakan.kaya@ornek.com', sifreHash: h('Veli1234'), basarisizGiris: 0, kilitBitis: null, aktif: true, ogrenciler: [3] },
      { id: 3, telefon: '5443334455', adSoyad: 'Selin Çelik', eposta: null, sifreHash: null, basarisizGiris: 0, kilitBitis: null, aktif: true, ogrenciler: [5] },
      { id: 4, telefon: '5554445566', adSoyad: 'Murat Şahin', eposta: 'murat.sahin@ornek.com', sifreHash: null, basarisizGiris: 0, kilitBitis: null, aktif: true, ogrenciler: [6] },
      { id: 5, telefon: '5425556677', adSoyad: 'Emre Arslan', eposta: null, sifreHash: null, basarisizGiris: 0, kilitBitis: null, aktif: true, ogrenciler: [4] },
    ],
    personel: [
      { id: 1, tip: 'Ogretmen', okulId: 1, adSoyad: 'Demo Öğretmen', eposta: 'ogretmen@demo.k12.tr', telefon: null, sifreHash: demo, sifreDegistirmeli: false, yetkiler: [], basarisizGiris: 0, kilitBitis: null, aktif: true, subeler: [1] },
      { id: 2, tip: 'Okul', okulId: 1, adSoyad: 'Demo Müdür Yrd.', eposta: 'okul@demo.k12.tr', telefon: null, sifreHash: demo, sifreDegistirmeli: false, yetkiler: ['TopluSiparis', 'TedarikRapor', 'KitapListe', 'OgrenciYonetim'], basarisizGiris: 0, kilitBitis: null, aktif: true, subeler: [] },
      { id: 3, tip: 'Yonetim', okulId: null, adSoyad: 'Kardelen Yönetim', eposta: 'yonetim@kardelenokul.com', telefon: '5300000000', sifreHash: demo, sifreDegistirmeli: false, yetkiler: [], basarisizGiris: 0, kilitBitis: null, aktif: true, subeler: [] },
      { id: 4, tip: 'Plasiyer', okulId: null, adSoyad: 'Demo Plasiyer', eposta: 'plasiyer@kardelenokul.com', telefon: '5301112233', sifreHash: demo, sifreDegistirmeli: false, yetkiler: [], basarisizGiris: 0, kilitBitis: null, aktif: true, subeler: [], opakPlasiyerKodu: 'PL-01' },
      { id: 5, tip: 'Plasiyer', okulId: null, adSoyad: 'Ahmet Saha', eposta: 'ahmet.saha@kardelenokul.com', telefon: null, sifreHash: demo, sifreDegistirmeli: false, yetkiler: [], basarisizGiris: 0, kilitBitis: null, aktif: true, subeler: [], opakPlasiyerKodu: 'PL-02' },
      { id: 6, tip: 'Ogretmen', okulId: 1, adSoyad: 'Deniz Öğretmen', eposta: 'deniz@demo.k12.tr', telefon: null, sifreHash: demo, sifreDegistirmeli: false, yetkiler: [], basarisizGiris: 0, kilitBitis: null, aktif: true, subeler: [3], plasiyerId: 5 },
    ],
    urunler: [
      { id: 1, opakStokKodu: '1091888', barkod: '9786054629862', ad: 'Algernon’a Çiçekler', yayinevi: 'Koridor Yayıncılık', yazar: 'Daniel Keyes', kategori: 'Edebiyat', fiyat: 223.2, listeFiyati: 223.2, webFiyati: null, kdvOrani: 0, aciklama: null, kapakDosya: null, aktif: true, guncelleme: null, senkron: once(48), stok: 42, stokTarihi: once(1) },
      { id: 2, opakStokKodu: '609127', barkod: '9786056587887', ad: 'Yaşamak', yayinevi: 'Jaguar Kitap', yazar: 'Yu Hua', kategori: 'Edebiyat', fiyat: 167.4, listeFiyati: 167.4, webFiyati: null, kdvOrani: 0, aciklama: null, kapakDosya: null, aktif: true, guncelleme: null, senkron: once(48), stok: 0, stokTarihi: once(1) },
      { id: 3, opakStokKodu: '1089141', barkod: '9786259167008', ad: 'Dünya Yaramazlık Tarihi', yayinevi: 'Kronik İlk Genç', yazar: 'Şermin Yaşar', kategori: 'Çocuk Kitapları', fiyat: 237, listeFiyati: 237, webFiyati: null, kdvOrani: 0, aciklama: null, kapakDosya: null, aktif: true, guncelleme: null, senkron: once(48), stok: 15, stokTarihi: once(1) },
      { id: 4, opakStokKodu: '1073276', barkod: '9786052657829', ad: 'Gizli Tarih', yayinevi: 'İthaki Yayınları', yazar: 'Donna Tartt', kategori: 'Edebiyat', fiyat: 365.8, listeFiyati: 365.8, webFiyati: null, kdvOrani: 0, aciklama: null, kapakDosya: null, aktif: true, guncelleme: null, senkron: once(48), stok: 7, stokTarihi: once(1) },
      { id: 5, opakStokKodu: '1075337', barkod: '9786259176246', ad: '2. Sınıf Tüm Dersler Fasikül Soru Bankası', yayinevi: 'Eğitim Deposu Yayınları', yazar: null, kategori: 'Eğitim', fiyat: 200, listeFiyati: 200, webFiyati: null, kdvOrani: 0, aciklama: null, kapakDosya: null, aktif: true, guncelleme: null, senkron: once(48), stok: 120, stokTarihi: once(1) },
      { id: 6, opakStokKodu: '1060456', barkod: '9786259316550', ad: 'Büyüdüm Ben!', yayinevi: 'Kronik Çocuk', yazar: 'Şermin Yaşar', kategori: 'Çocuk Kitapları', fiyat: 207, listeFiyati: 207, webFiyati: null, kdvOrani: 0, aciklama: null, kapakDosya: null, aktif: true, guncelleme: null, senkron: once(48), stok: 3, stokTarihi: once(1) },
      { id: 7, opakStokKodu: '1088114', barkod: '9786258387711', ad: 'Taş Kağıt Makas', yayinevi: 'Yabancı Yayınları', yazar: 'Alice Feeney', kategori: 'Edebiyat', fiyat: 223.2, listeFiyati: 223.2, webFiyati: null, kdvOrani: 0, aciklama: null, kapakDosya: null, aktif: true, guncelleme: null, senkron: once(48), stok: 28, stokTarihi: once(1) },
    ],
    listeler: [
      { id: 1, okulId: 1, sezonId: 1, ad: '5-A Okuma Kitapları', kapsam: 'Sube', sinifId: null, subeId: 1, ogrenciId: null, kapsamAd: '5-A', olusturanId: 1,
        yayinda: true, hedefTipi: 'Toplu', hedefOgrenciler: [], yayinTarihi: once(30), guncelleme: once(30),
        satirlar: [ { urunId: 1, adet: 1, zorunlu: true, satisFiyati: null }, { urunId: 2, adet: 1, zorunlu: true, satisFiyati: null },
          { urunId: 3, adet: 1, zorunlu: true, satisFiyati: null }, { urunId: 4, adet: 1, zorunlu: false, satisFiyati: null } ] },
      { id: 2, okulId: 1, sezonId: 1, ad: '2-B Kitap Listesi', kapsam: 'Sube', sinifId: null, subeId: 3, ogrenciId: null, kapsamAd: '2-B', olusturanId: 2,
        yayinda: true, hedefTipi: 'Toplu', hedefOgrenciler: [], yayinTarihi: once(5), guncelleme: once(5),
        satirlar: [ { urunId: 5, adet: 1, zorunlu: true, satisFiyati: null }, { urunId: 6, adet: 1, zorunlu: true, satisFiyati: null } ] },
      { id: 3, okulId: 1, sezonId: 1, ad: '5-A Türkçe', kapsam: 'Sube', sinifId: null, subeId: 1, ogrenciId: null, kapsamAd: '5-A', olusturanId: 1,
        yayinda: false, hedefTipi: 'Toplu', hedefOgrenciler: [], yayinTarihi: null, guncelleme: simdi, satirlar: [ { urunId: 7, adet: 1, zorunlu: true, satisFiyati: null } ] },
    ],
    kodlar: [],
    yayinlar: [
      { id: 50, listeId: 1, kullaniciId: 1, hedefTipi: 'Toplu', hatirlatma: false, ogrenciSayisi: 4, smsSayisi: 4, epostaSayisi: 2, tarih: once(30) },
      { id: 51, listeId: 2, kullaniciId: 2, hedefTipi: 'Toplu', hatirlatma: false, ogrenciSayisi: 2, smsSayisi: 2, epostaSayisi: 2, tarih: once(5) },
    ],
    bildirimler: [
      { id: 60, yayinId: 50, veliId: 1, ogrenciId: 1, kanal: 'SMS', alici: '5320000000', konu: null, metin: '', durum: 'Gonderildi', tarih: once(30) },
      { id: 61, yayinId: 50, veliId: 1, ogrenciId: 1, kanal: 'Eposta', alici: 'ayse.yilmaz@ornek.com', konu: '', metin: '', durum: 'Gonderildi', tarih: once(30) },
      { id: 62, yayinId: 50, veliId: 2, ogrenciId: 3, kanal: 'SMS', alici: '5331112233', konu: null, metin: '', durum: 'Gonderildi', tarih: once(30) },
      { id: 63, yayinId: 50, veliId: 2, ogrenciId: 3, kanal: 'Eposta', alici: 'hakan.kaya@ornek.com', konu: '', metin: '', durum: 'Gonderildi', tarih: once(30) },
      { id: 64, yayinId: 50, veliId: 5, ogrenciId: 4, kanal: 'SMS', alici: '5425556677', konu: null, metin: '', durum: 'Gonderildi', tarih: once(30) },
      { id: 65, yayinId: 50, veliId: 3, ogrenciId: 5, kanal: 'SMS', alici: '5443334455', konu: null, metin: '', durum: 'Hata', tarih: once(30) },
      { id: 66, yayinId: 51, veliId: 1, ogrenciId: 2, kanal: 'SMS', alici: '5320000000', konu: null, metin: '', durum: 'Gonderildi', tarih: once(5) },
      { id: 67, yayinId: 51, veliId: 4, ogrenciId: 6, kanal: 'SMS', alici: '5554445566', konu: null, metin: '', durum: 'Gonderildi', tarih: once(5) },
    ],
    goruntulemeler: [
      { listeId: 1, ogrenciId: 3, veliId: 2, ilk: once(26) },
    ],
    islemler: [],
    ticaret: ticaretTohum(once),
    sayac: 100,
  };
}

function ticaretTohum(once: (saat: number) => Date): Ticaret {
  return {
    setler: [
      { id: 1, barkod: '2000000000015', ad: '5. Sınıf Okuma Seti', aciklama: 'Yaz dönemi okuma kitapları', fiyat: 750, aktif: true,
        satirlar: [ { urunId: 1, adet: 1 }, { urunId: 2, adet: 1 }, { urunId: 3, adet: 1 }, { urunId: 4, adet: 1 } ], olusturanId: 3, olusturma: once(200), guncelleme: null },
      { id: 2, barkod: '2000000000022', ad: '2. Sınıf Başlangıç Seti', aciklama: null, fiyat: null, aktif: true,
        satirlar: [ { urunId: 5, adet: 1 }, { urunId: 6, adet: 1 } ], olusturanId: 3, olusturma: once(150), guncelleme: null },
    ],
    siparisler: [
      { id: 1, no: 'KO2026000001', okulId: 1, veliId: 2, ogrenciId: 3, durum: 'Odendi', odemeTipi: 'Kart', toplam: 826.4, havaleRef: null, tarih: once(20) },
      { id: 2, no: 'KO2026000002', okulId: 1, veliId: 1, ogrenciId: 2, durum: 'OdemeBekliyor', odemeTipi: 'Havale', toplam: 407, havaleRef: 'KO7H3K', tarih: once(4) },
      { id: 3, no: 'KO2026000003', okulId: 1, veliId: 5, ogrenciId: 4, durum: 'TeslimEdildi', odemeTipi: 'Kart', toplam: 993.2, havaleRef: null, tarih: once(70) },
    ],
    odemeler: [
      { id: 1, siparisId: 1, tip: 'Kart', tutar: 826.4, durum: 'Basarili', posId: 1, taksit: 1, kartSonDort: '4821', bankaHesabiId: null, havaleGonderen: null, onaylayanId: null, onayTarihi: null, tarih: once(20) },
      { id: 2, siparisId: 2, tip: 'Havale', tutar: 407, durum: 'Bekliyor', posId: null, taksit: null, kartSonDort: null, bankaHesabiId: 1, havaleGonderen: 'Ayşe Yılmaz', onaylayanId: null, onayTarihi: null, tarih: once(4) },
      { id: 3, siparisId: 3, tip: 'Kart', tutar: 993.2, durum: 'Basarili', posId: 3, taksit: 3, kartSonDort: '1190', bankaHesabiId: null, havaleGonderen: null, onaylayanId: null, onayTarihi: null, tarih: once(70) },
      { id: 4, siparisId: 3, tip: 'Kart', tutar: 993.2, durum: 'Basarisiz', posId: 1, taksit: 1, kartSonDort: '1190', bankaHesabiId: null, havaleGonderen: null, onaylayanId: null, onayTarihi: null, tarih: once(70.2) },
    ],
    sepetler: [
      { id: 1, veliId: 4, ogrenciId: 6, durum: 'Acik', siparisId: null, olusturma: once(54), guncelleme: once(30),
        satirlar: [ { listeId: 2, urunId: 5, setId: null, adet: 1, birimFiyat: 200 }, { listeId: 2, urunId: 6, setId: null, adet: 1, birimFiyat: 207 } ] },
      { id: 2, veliId: 3, ogrenciId: 5, durum: 'Acik', siparisId: null, olusturma: once(100), guncelleme: once(96),
        satirlar: [ { listeId: 1, urunId: 1, setId: null, adet: 1, birimFiyat: 223.2 }, { listeId: 1, urunId: 2, setId: null, adet: 1, birimFiyat: 167.4 } ] },
      { id: 3, veliId: 2, ogrenciId: 3, durum: 'Siparis', siparisId: 1, olusturma: once(22), guncelleme: once(20),
        satirlar: [ { listeId: 1, urunId: 1, setId: null, adet: 1, birimFiyat: 223.2 } ] },
    ],
    girisler: [
      { id: 1, tip: 'Personel', kullaniciId: 1, veliId: null, kimlik: 'ogretmen@demo.k12.tr', rol: 'ogretmen', basarili: true, sebep: null, ip: '127.0.0.1', tarih: once(28) },
      { id: 2, tip: 'Veli', kullaniciId: null, veliId: 2, kimlik: '+90 533 *** ** 33', rol: 'veli', basarili: false, sebep: 'Hatalı şifre', ip: '127.0.0.1', tarih: once(26.1) },
      { id: 3, tip: 'Veli', kullaniciId: null, veliId: 2, kimlik: '+90 533 *** ** 33', rol: 'veli', basarili: true, sebep: null, ip: '127.0.0.1', tarih: once(26) },
    ],
    ayarlar: {
      'firma.unvan': 'Kardelen Kitabevi', 'firma.adres': 'Örnek Mah. Kitap Sok. No: 5 Meram / Konya', 'firma.telefon': '3320000001',
      'firma.eposta': 'destek@kardelenokul.com', 'firma.vergiDairesi': 'Meram', 'firma.vergiNo': '', 'firma.mersisNo': '',
      'firma.calismaSaatleri': 'Hafta içi 09.00–18.00',
      'whatsapp.aktif': '1', 'whatsapp.numara': '905300000000', 'whatsapp.mesaj': 'Merhaba, Kardelen Okul hakkında bilgi almak istiyorum.',
      'whatsapp.saatler': 'Hafta içi 09.00–18.00',
      'odeme.kartAktif': '1', 'odeme.havaleAktif': '1', 'odeme.maxTaksit': '6', 'odeme.taksitAltLimit': '500',
      'havale.aciklama': 'Açıklamaya sipariş referans kodunuzu yazın.', HavaleSureGun: '3',
      'kargo.varsayilanUcret': '0', 'kargo.ucretsizLimit': '', 'kargo.okulaTeslimAktif': '1',
    },
    bankalar: [
      { id: 1, banka: 'Örnek Bankası', hesapAdi: 'Kardelen Kitabevi', iban: 'TR330006100519786457841326', sube: 'Konya Merkez', hesapNo: '1234567', paraBirimi: 'TRY', sira: 10, aktif: true },
    ],
    kargolar: [
      { id: 1, kod: 'MOTO', ad: 'Moto kurye (şehir içi)', tur: 'Kurye', entegrasyon: 'Manuel', sabitUcret: 0, ucretsizLimit: null, tahminiTeslim: 'Aynı gün / ertesi gün', takipUrl: null, sira: 10, aktif: true },
      { id: 2, kod: 'KARGO', ad: 'Anlaşmalı kargo', tur: 'Kargo', entegrasyon: 'Manuel', sabitUcret: 89.9, ucretsizLimit: 1500, tahminiTeslim: '1-3 iş günü', takipUrl: 'https://kargo.example/takip?no={takipNo}', sira: 20, aktif: true },
    ],
    bolgeler: [
      { id: 1, firmaId: 1, il: 'Konya', ilce: 'Meram', mahalle: null, ucret: 0, ucretsizLimit: null, aktif: true },
      { id: 2, firmaId: 1, il: 'Konya', ilce: 'Selçuklu', mahalle: null, ucret: 49.9, ucretsizLimit: 750, aktif: true },
    ],
    poslar: [
      { id: 1, kod: 'YAPIKREDI', ad: 'Yapı Kredi Sanal POS', test: true, aktif: true },
      { id: 2, kod: 'DENIZBANK', ad: 'DenizBank Sanal POS', test: true, aktif: false },
      { id: 3, kod: 'ZIRAATPAY', ad: 'ZiraatPay', test: true, aktif: true },
    ],
    taksitler: [
      { id: 1, posId: 1, kartAilesi: 'World', taksit: 2, vadeFarki: 0, aktif: true },
      { id: 2, posId: 1, kartAilesi: 'World', taksit: 3, vadeFarki: 0, aktif: true },
      { id: 3, posId: 3, kartAilesi: null, taksit: 3, vadeFarki: 2.5, aktif: true },
      { id: 4, posId: 3, kartAilesi: null, taksit: 6, vadeFarki: 5, aktif: true },
    ],
    kurallar: [
      { id: 1, oncelik: 10, ad: 'Tek çekim → Yapı Kredi', taksitMin: 1, taksitMax: 1, kartBankasi: null, kartAilesi: null, kartTipi: null, posId: 1, aktif: true },
      { id: 2, oncelik: 20, ad: 'World kartlar taksit → Yapı Kredi', taksitMin: 2, taksitMax: null, kartBankasi: null, kartAilesi: 'World', kartTipi: 'Kredi', posId: 1, aktif: true },
      { id: 3, oncelik: 100, ad: 'Diğer tüm kartlar → ZiraatPay', taksitMin: null, taksitMax: null, kartBankasi: null, kartAilesi: null, kartTipi: null, posId: 3, aktif: true },
    ],
    sayfalar: [
      { id: 1, slug: 'hakkimizda', baslik: 'Hakkımızda', icerik: 'Kardelen Kitabevi, anlaşmalı okullara kitap ve eğitim materyali tedarik eder.\n\n## Okullara özel\nVeliler yalnız öğrencilerine önerilen kitapları görür ve sipariş verir.', yayinda: true, altBilgi: true, sira: 10, guncelleme: once(300) },
      { id: 2, slug: 'iletisim', baslik: 'İletişim', icerik: 'Sorularınız için çalışma saatlerinde bize ulaşabilirsiniz.', yayinda: true, altBilgi: true, sira: 20, guncelleme: once(300) },
      { id: 3, slug: 'kvkk', baslik: 'KVKK Aydınlatma Metni', icerik: '[Metin hukuk biriminden gelecek.]', yayinda: true, altBilgi: true, sira: 30, guncelleme: once(300) },
      { id: 4, slug: 'mesafeli-satis', baslik: 'Mesafeli Satış Sözleşmesi', icerik: '[Metin hukuk biriminden gelecek.]', yayinda: true, altBilgi: true, sira: 40, guncelleme: once(300) },
      { id: 5, slug: 'iptal-iade', baslik: 'İptal ve İade Koşulları', icerik: '[Metin hukuk biriminden gelecek.]', yayinda: true, altBilgi: true, sira: 50, guncelleme: once(300) },
      { id: 6, slug: 'teslimat', baslik: 'Teslimat Bilgileri', icerik: '[Kurye ve kargo ile teslimat koşulları.]', yayinda: true, altBilgi: true, sira: 60, guncelleme: once(300) },
      ...([['gizlilik', 'Gizlilik Politikası'], ['cerez', 'Çerez Politikası'], ['on-bilgilendirme', 'Ön Bilgilendirme Formu'], ['uyelik-sozlesmesi', 'Üyelik Sözleşmesi'],
        ['acik-riza', 'Açık Rıza Metni'], ['odeme-guvenligi', 'Ödeme Güvenliği'], ['sss', 'Sıkça Sorulan Sorular']] as const).map(([slug, baslik], i) => ({
        id: 7 + i, slug, baslik, icerik: '[Metin hukuk biriminden gelecek.]', yayinda: true, altBilgi: true, sira: 70 + i * 10, guncelleme: once(300) })),
    ],
    kategoriler: [
      { id: 1, ustId: null, ad: 'Okuma Kitapları', slug: 'okuma-kitaplari', sira: 10, aktif: true },
      { id: 2, ustId: 1, ad: 'Ortaokul Okuma', slug: 'ortaokul-okuma', sira: 10, aktif: true },
      { id: 3, ustId: 1, ad: 'Çocuk Kitapları', slug: 'cocuk-kitaplari', sira: 20, aktif: true },
      { id: 4, ustId: null, ad: 'Yardımcı Kaynaklar', slug: 'yardimci-kaynaklar', sira: 20, aktif: true },
      { id: 5, ustId: 4, ad: '2. Sınıf Yardımcı Kaynak Kitapları', slug: '2-sinif-yardimci-kaynak', sira: 10, aktif: true },
    ],
    urunKategori: [
      { kategoriId: 2, urunId: 1 }, { kategoriId: 2, urunId: 2 }, { kategoriId: 2, urunId: 4 }, { kategoriId: 2, urunId: 7 },
      { kategoriId: 3, urunId: 3 }, { kategoriId: 3, urunId: 6 }, { kategoriId: 5, urunId: 5 },
    ],
    kampanyalar: [
      { id: 1, ad: 'Yaz Okuma Kampanyası', aciklama: 'Seçili okuma kitaplarında %15 indirim.', baslangic: new Date(Date.now() - 5 * 864e5).toISOString().slice(0, 10),
        bitis: new Date(Date.now() + 25 * 864e5).toISOString().slice(0, 10), indirimOrani: 15, aktif: true,
        urunler: [ { urunId: 1, kampanyaFiyati: null }, { urunId: 4, kampanyaFiyati: 299 }, { urunId: 7, kampanyaFiyati: null } ], olusturanId: 3, olusturma: once(120) },
    ],
    gonderimler: [],
    hakedis: [
      { id: 1, okulId: 1, oran: 10, baslangic: '2026-09-01', bitis: null, veli: true, toplu: false, aciklama: '2026-2027 sezonu', olusturanId: 3, olusturma: once(500) },
    ],
  };
}

const g = globalThis as unknown as { __koDepo?: Depo };
export function mockDepo(): Depo { return d(); }
export function mockSayac(): number { return ++d().sayac; }
function d(): Depo {
  if (!g.__koDepo) g.__koDepo = tohum();
  return g.__koDepo;
}
const kopya = <T>(x: T): T => structuredClone(x);
/** Veliye yansıyan fiyatla sade ürün */
export function urunSade(u: UrunTam): Urun {
  return { id: u.id, opakStokKodu: u.opakStokKodu, barkod: u.barkod, ad: u.ad, yayinevi: u.yayinevi, yazar: u.yazar, kategori: u.kategori, fiyat: u.webFiyati ?? u.listeFiyati, stok: u.stok, kapak: !!u.kapakDosya };
}

export class MockRepo implements Repo {
  private sinifSube(subeId: number) {
    const sb = d().subeler.find((s) => s.id === subeId)!;
    const sn = d().siniflar.find((s) => s.id === sb.sinifId)!;
    return { sb, sn, ad: `${sn.seviye}-${sb.ad}` };
  }

  async veliTelefonla(telefon: string) {
    const v = d().veliler.find((x) => x.telefon === telefon && x.aktif);
    if (!v) return null;
    const { ogrenciler: _o, ...veli } = v;
    return kopya(veli);
  }
  async veliGuncelle(id: number, gu: VeliGuncelleme) {
    const v = d().veliler.find((x) => x.id === id);
    if (!v) return;
    if (gu.sifreHash !== undefined) v.sifreHash = gu.sifreHash;
    if (gu.adSoyad) v.adSoyad = gu.adSoyad;
    if (gu.basarisizGiris !== undefined) v.basarisizGiris = gu.basarisizGiris;
    if (gu.kilitBitis !== undefined) v.kilitBitis = gu.kilitBitis;
    if (gu.sonGiris) v.sonGiris = gu.sonGiris;
  }
  async personelEpostayla(eposta: string) {
    const p = d().personel.find((x) => x.eposta.toLowerCase() === eposta.toLowerCase() && x.aktif);
    if (!p) return null;
    const { subeler: _s, ...pers } = p;
    return kopya(pers);
  }
  async personelGuncelle(id: number, gu: PersonelGuncelleme) {
    const p = d().personel.find((x) => x.id === id);
    if (!p) return;
    if (gu.basarisizGiris !== undefined) p.basarisizGiris = gu.basarisizGiris;
    if (gu.kilitBitis !== undefined) p.kilitBitis = gu.kilitBitis;
    if (gu.sonGiris) p.sonGiris = gu.sonGiris;
  }
  async smsKoduKaydet(k: { telefon: string; kodHash: string; amac: SmsKodu['amac']; sonGecerlilik: Date }) {
    d().kodlar.push({ id: ++d().sayac, telefon: k.telefon, kodHash: k.kodHash, amac: k.amac, sonGecerlilik: k.sonGecerlilik, deneme: 0, kullanildi: false, olusturma: new Date() });
  }
  async sonSmsKodu(telefon: string, amac: SmsKodu['amac']) {
    const l = d().kodlar.filter((k) => k.telefon === telefon && k.amac === amac);
    return l.length ? kopya(l[l.length - 1]) : null;
  }
  async smsKoduGuncelle(id: number, gu: { deneme?: number; kullanildi?: boolean }) {
    const k = d().kodlar.find((x) => x.id === id);
    if (!k) return;
    if (gu.deneme !== undefined) k.deneme = gu.deneme;
    if (gu.kullanildi !== undefined) k.kullanildi = gu.kullanildi;
  }

  async veliOgrencileri(veliId: number): Promise<Ogrenci[]> {
    const v = d().veliler.find((x) => x.id === veliId);
    if (!v) return [];
    return v.ogrenciler.filter((oid) => d().ogrenciler.some((x) => x.id === oid && aktifOgr(x))).map((oid) => {
      const o = d().ogrenciler.find((x) => x.id === oid)!;
      const { sb, sn, ad } = this.sinifSube(o.subeId);
      const okul = d().okullar.find((x) => x.id === o.okulId)!;
      return { id: o.id, okulId: o.okulId, okulAd: okul.ad, okulNo: o.okulNo, ad: o.ad, soyad: o.soyad,
        sinifId: sn.id, seviye: sn.seviye, subeId: sb.id, subeAd: sb.ad, sinifSube: ad };
    });
  }
  async ogrenciListeleri(ogrenciId: number) {
    const o = d().ogrenciler.find((x) => x.id === ogrenciId);
    if (!o) return [];
    const { sn } = this.sinifSube(o.subeId);
    return kopya(d().listeler.filter((l) => l.yayinda && l.okulId === o.okulId && (
      (l.kapsam === 'Sube' && l.subeId === o.subeId) ||
      (l.kapsam === 'Seviye' && l.sinifId === sn.id) ||
      (l.kapsam === 'Ogrenci' && l.ogrenciId === o.id)) &&
      (l.hedefTipi === 'Toplu' || l.hedefOgrenciler.includes(o.id))));
  }

  async urunler(ids: number[]) {
    return d().urunler.filter((u) => ids.includes(u.id)).map(urunSade);
  }
  async urunAra(q: string, limit = 30) {
    const s = q.trim().toLocaleLowerCase('tr');
    return d().urunler.filter((u) => u.aktif && (!s ||
      [u.ad, u.yayinevi, u.yazar, u.barkod, u.opakStokKodu].some((f) => f && f.toLocaleLowerCase('tr').includes(s)))).slice(0, limit).map(urunSade);
  }

  async okullar() { return kopya(d().okullar.filter((o) => o.aktif)); }
  async okul(id: number) { const o = d().okullar.find((x) => x.id === id); return o ? kopya(o) : null; }
  async okulSlugla(slug: string) { const o = d().okullar.find((x) => x.slug === slug && x.aktif); return o ? kopya(o) : null; }
  async okulGirisGuncelle(id: number, gu: OkulGirisGuncelleme) {
    const o = d().okullar.find((x) => x.id === id);
    if (!o) return;
    if (gu.slug !== undefined) {
      if (gu.slug && d().okullar.some((x) => x.id !== id && x.slug === gu.slug)) throw new Error('SLUG_KULLANIMDA');
      o.slug = gu.slug;
    }
    if (gu.logoDosya !== undefined) o.logoDosya = gu.logoDosya;
    if (gu.logoGoster !== undefined) o.logoGoster = gu.logoGoster;
    if (!o.logoDosya) o.logoGoster = false;
  }
  private ozet(o: OgrKayit): OgrenciOzet {
    return { id: o.id, okulId: o.okulId, okulNo: o.okulNo, ad: o.ad, soyad: o.soyad, subeId: o.subeId,
      sinifSube: this.sinifSube(o.subeId).ad, veliSayisi: d().veliler.filter((v) => v.aktif && v.ogrenciler.includes(o.id)).length };
  }
  async okulOgrencileri(okulId: number, sadeceSubeler?: number[] | null) {
    return d().ogrenciler.filter((o) => aktifOgr(o) && o.okulId === okulId && (!sadeceSubeler || sadeceSubeler.includes(o.subeId)))
      .map((o) => this.ozet(o)).sort((a, b) => a.sinifSube.localeCompare(b.sinifSube, 'tr') || a.ad.localeCompare(b.ad, 'tr'));
  }
  async ogrenci(id: number): Promise<Ogrenci | null> {
    const o = d().ogrenciler.find((x) => x.id === id);
    if (!o) return null;
    const { sb, sn, ad } = this.sinifSube(o.subeId);
    return { id: o.id, okulId: o.okulId, okulAd: d().okullar.find((x) => x.id === o.okulId)!.ad, okulNo: o.okulNo, ad: o.ad, soyad: o.soyad,
      sinifId: sn.id, seviye: sn.seviye, subeId: sb.id, subeAd: sb.ad, sinifSube: ad };
  }
  async ogrenciVelileri(ogrenciId: number): Promise<OgrenciVelisi[]> {
    return d().veliler.filter((v) => v.aktif && v.ogrenciler.includes(ogrenciId))
      .map((v) => ({ veliId: v.id, adSoyad: v.adSoyad, telefon: v.telefon, eposta: v.eposta }));
  }
  async ogrenciBildirimleri(ogrenciId: number, limit = 30): Promise<BildirimKaydi[]> {
    const veliIdleri = d().veliler.filter((v) => v.ogrenciler.includes(ogrenciId)).map((v) => v.id);
    const ogr = d().ogrenciler.find((x) => x.id === ogrenciId);
    const kapsamda = (yayinId: number | null) => {
      const l = d().listeler.find((x) => x.id === d().yayinlar.find((y) => y.id === yayinId)?.listeId);
      return !!l && !!ogr && this.kapsamOgrencileri(l).some((o) => o.id === ogrenciId);
    };
    // kardeşler tek mesajla bilgilendirildiğinde kayıt ilk kardeşe yazılır; sepetin kapsamındaysa bu öğrenciye de say
    return d().bildirimler.filter((b) => b.ogrenciId === ogrenciId || (b.veliId != null && veliIdleri.includes(b.veliId) && kapsamda(b.yayinId)))
      .slice(-limit).reverse().map((b) => {
      const y = d().yayinlar.find((x) => x.id === b.yayinId);
      const l = y ? d().listeler.find((x) => x.id === y.listeId) : undefined;
      return { id: b.id, listeId: l?.id ?? null, listeAd: l?.ad ?? null, kanal: b.kanal, alici: b.alici, durum: b.durum, tarih: b.tarih };
    });
  }
  async personelSubeleri(kullaniciId: number) {
    return [...(d().personel.find((p) => p.id === kullaniciId)?.subeler ?? [])];
  }
  async sinifSecenekleri(okulId: number, sadeceSubeler?: number[] | null): Promise<SinifSecenegi[]> {
    const out: SinifSecenegi[] = [];
    for (const sn of d().siniflar.filter((s) => s.okulId === okulId).sort((a, b) => a.seviye - b.seviye)) {
      if (!sadeceSubeler) out.push({ kapsam: 'Seviye', id: sn.id, ad: `${sn.seviye}. sınıf (tüm şubeler)` });
      for (const sb of d().subeler.filter((s) => s.sinifId === sn.id)) {
        if (!sadeceSubeler || sadeceSubeler.includes(sb.id)) out.push({ kapsam: 'Sube', id: sb.id, ad: `${sn.seviye}-${sb.ad}` });
      }
    }
    return out;
  }
  async okulListeleri(okulId: number) {
    return kopya(d().listeler.filter((l) => l.okulId === okulId));
  }
  async liste(id: number) {
    const l = d().listeler.find((x) => x.id === id);
    return l ? kopya(l) : null;
  }
  async listeOlustur(y: YeniListe) {
    const kapsamAd = y.kapsam === 'Sube'
      ? this.sinifSube(y.subeId!).ad
      : `${d().siniflar.find((s) => s.id === y.sinifId)!.seviye}. sınıf`;
    const l: KitapListesi = { id: ++d().sayac, okulId: y.okulId, sezonId: 1, ad: y.ad, kapsam: y.kapsam,
      sinifId: y.kapsam === 'Seviye' ? y.sinifId! : null, subeId: y.kapsam === 'Sube' ? y.subeId! : null, ogrenciId: null,
      kapsamAd, olusturanId: y.olusturanId, yayinda: false, hedefTipi: 'Toplu', hedefOgrenciler: [], yayinTarihi: null, guncelleme: new Date(), satirlar: [] };
    d().listeler.push(l);
    return kopya(l);
  }
  async listeSatirlariKaydet(id: number, satirlar: ListeSatiri[]) {
    const l = d().listeler.find((x) => x.id === id);
    if (!l) return;
    l.satirlar = kopya(satirlar);
    l.guncelleme = new Date();
  }
  private kapsamOgrencileri(l: KitapListesi) {
    return d().ogrenciler.filter((o) => {
      if (!aktifOgr(o) || o.okulId !== l.okulId) return false;
      if (l.kapsam === 'Sube') return o.subeId === l.subeId;
      if (l.kapsam === 'Seviye') return this.sinifSube(o.subeId).sn.id === l.sinifId;
      return o.id === l.ogrenciId;
    });
  }
  async listeAlicilari(listeId: number, ogrenciIdleri?: number[] | null): Promise<VeliAlici[]> {
    const l = d().listeler.find((x) => x.id === listeId);
    if (!l) return [];
    const ogr = this.kapsamOgrencileri(l).filter((o) => !ogrenciIdleri || ogrenciIdleri.includes(o.id));
    const out: VeliAlici[] = [];
    for (const o of ogr) {
      for (const v of d().veliler.filter((x) => x.aktif && x.ogrenciler.includes(o.id))) {
        out.push({ veliId: v.id, telefon: v.telefon, eposta: v.eposta, veliAd: v.adSoyad, ogrenciId: o.id,
          ogrenciAd: `${o.ad} ${o.soyad}`, sinifSube: this.sinifSube(o.subeId).ad });
      }
    }
    return out;
  }
  async yayinKaydet(y: YayinKaydi) {
    const l = d().listeler.find((x) => x.id === y.listeId)!;
    const tarih = new Date();
    if (!y.hatirlatma) {
      if (y.hedefTipi === 'Toplu') {
        l.hedefTipi = 'Toplu';
      } else if (!(l.yayinda && l.hedefTipi === 'Toplu')) {
        // ilk kez ya da yine seçili: hedefe ekle (zaten tüm sınıfa açık sepet seçili yayınla daralmaz)
        l.hedefTipi = 'Secili';
        l.hedefOgrenciler = [...new Set([...l.hedefOgrenciler, ...y.ogrenciIdleri])];
      }
      l.yayinda = true;
      l.yayinTarihi = tarih;
      l.guncelleme = tarih;
    }
    const id = ++d().sayac;
    d().yayinlar.push({ id, listeId: y.listeId, kullaniciId: y.kullaniciId, hedefTipi: y.hedefTipi, hatirlatma: y.hatirlatma,
      ogrenciSayisi: y.ogrenciSayisi, smsSayisi: y.smsSayisi, epostaSayisi: y.epostaSayisi, tarih });
    return { yayinId: id, tarih };
  }
  async listeTakip(listeId: number): Promise<TakipSatiri[]> {
    const l = d().listeler.find((x) => x.id === listeId);
    if (!l) return [];
    const yayinIdleri = new Set(d().yayinlar.filter((y) => y.listeId === listeId).map((y) => y.id));
    const bild = d().bildirimler.filter((b) => b.yayinId != null && yayinIdleri.has(b.yayinId));
    return this.kapsamOgrencileri(l).map((o) => {
      const veliler = d().veliler.filter((v) => v.aktif && v.ogrenciler.includes(o.id));
      const ob = bild.filter((b) => b.ogrenciId === o.id || (b.veliId != null && veliler.some((v) => v.id === b.veliId)));
      const son = (k: 'SMS' | 'Eposta') => ob.filter((b) => b.kanal === k).at(-1)?.durum ?? null;
      const gor = d().goruntulemeler.find((g) => g.listeId === listeId && g.ogrenciId === o.id);
      return { ogrenciId: o.id, okulNo: o.okulNo, ad: `${o.ad} ${o.soyad}`, sinifSube: this.sinifSube(o.subeId).ad,
        veliSayisi: veliler.length, epostaliVeli: veliler.filter((v) => v.eposta).length,
        gorebilir: l.yayinda && (l.hedefTipi === 'Toplu' || l.hedefOgrenciler.includes(o.id)),
        sms: son('SMS'), eposta: son('Eposta'), sonBildirim: ob.at(-1)?.tarih ?? null, acildi: gor?.ilk ?? null };
    }).sort((a, b) => a.sinifSube.localeCompare(b.sinifSube, 'tr') || a.ad.localeCompare(b.ad, 'tr'));
  }
  async goruntulemeKaydet(listeId: number, ogrenciId: number, veliId: number) {
    if (!d().goruntulemeler.some((g) => g.listeId === listeId && g.ogrenciId === ogrenciId)) {
      d().goruntulemeler.push({ listeId, ogrenciId, veliId, ilk: new Date() });
    }
  }
  async sonYayinlar(okulId: number | null, limit = 10, yayinlayanId?: number): Promise<YayinOzeti[]> {
    return d().yayinlar.slice().reverse().flatMap((y) => {
      const l = d().listeler.find((x) => x.id === y.listeId);
      if (!l || (okulId != null && l.okulId !== okulId) || (yayinlayanId != null && y.kullaniciId !== yayinlayanId)) return [];
      const p = d().personel.find((x) => x.id === y.kullaniciId);
      return [{ yayinId: y.id, listeId: l.id, listeAd: l.ad, okulId: l.okulId, okulAd: d().okullar.find((o) => o.id === l.okulId)!.ad,
        kapsamAd: l.kapsamAd, hedefTipi: y.hedefTipi, ogrenciSayisi: y.ogrenciSayisi, smsSayisi: y.smsSayisi, epostaSayisi: y.epostaSayisi,
        hatirlatma: y.hatirlatma, tarih: y.tarih, yayinlayan: p?.adSoyad ?? '-', yayinlayanTip: p?.tip ?? 'Yonetim' }];
    }).slice(0, limit);
  }
  async bildirimleriEkle(b: Omit<Bildirim, 'id'>[]) {
    return b.map((x) => {
      const row: BildirimKayit = { ...x, id: ++d().sayac, durum: 'Kuyrukta', tarih: new Date() };
      d().bildirimler.push(row);
      const { durum: _d, tarih: _t, ...bildirim } = row;
      return bildirim;
    });
  }
  async bildirimDurum(id: number, durum: 'Gonderildi' | 'Hata') {
    const b = d().bildirimler.find((x) => x.id === id);
    if (b) b.durum = durum;
  }
}

/** Geliştirme ortamında gönderilen bildirimleri görmek için. */
export function mockGidenKutusu() {
  return d().bildirimler.slice(-50);
}
