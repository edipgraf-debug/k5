# Kardelen Okul

Okullara özel, Opak ERP ile entegre çalışan kapalı satış sitesi.
Yığın: **Next.js 16 (App Router) + React 19 + Tailwind CSS 4**, veritabanı **SQL Server** (`db/schema.sql`), yayın **IIS + ARR** (Kalıtım B2B ile aynı yapı).

## Bu sürümde çalışanlar

| Alan | Durum |
|---|---|
| Kapalı site, rol bazlı erişim (`src/proxy.ts`) | ✅ |
| Giriş kapısı: Veli (telefon → SMS kodu → şifre belirleme / şifreyle giriş / şifremi unuttum), Öğretmen, Okul Yönetimi | ✅ |
| **Okula özel giriş adresi** `kardelenokul.com/okul-adi` (okul adı + isteğe bağlı logo); çıkışta ve oturum düşünce aynı adrese dönüş | ✅ |
| Ayrı adresten yönetim girişi (`/yonetim/giris`) | ✅ (SMS ikinci adım: sıradaki) |
| Hatalı girişte geçici kilit, SMS kodu süre/deneme/60 sn kuralı | ✅ |
| Veli: öğrenci seçimi (kardeşler), yalnız öğrenciye tanımlı yayındaki liste, listede arama, isteğe bağlı ekle/çıkar, özet | ✅ |
| **Tavsiye sepeti** oluştur / düzenle / yayınla — öğretmen (kendi şubeleri), okul (tüm okul), kitabevi (seçilen okul adına) | ✅ |
| Yayınla: **tüm sınıfa (toplu)** ya da **seçili öğrencilere (tek tek)**; ilgili velilere SMS + e-posta, bağlantı okulun giriş adresi | ✅ |
| Sepet detayı: öğrenci bazında sepet açık mı, SMS / e-posta durumu, veli açtı mı; seçilenlere yayınla, hatırlat, tüm sınıfa yayınla | ✅ |
| Ana sayfalar: öğretmen (sınıflarım, sepetlerim, öğrenci arama), okul (şube bazında durum, son yayınlar), kitabevi (okullar, giriş adresleri, logo durumu) | ✅ |
| Öğrenci detayı: veliler (maskeli), sınıfındaki sepetler, bu öğrenciye yayınla / hatırlat, bildirim geçmişi | ✅ |
| Kitabevi → okul sayfası: giriş adresi düzenleme, logo yükle / değiştir / kaldır, girişte göster anahtarı | ✅ |
| **Kitabevi yönetim paneli:** tek arama kutusu (öğrenci, okul no, veli telefonu, e-posta, okul; Türkçe karakter farkı yok sayılır) | ✅ |
| Okullar: yeni okul, bilgiler (Opak cari kodları dahil), aktif/pasif; sınıf seviyesi ve şube aç / boş şubeyi sil | ✅ |
| Öğrenci & veli: ekle / düzenle / şube değiştir / pasif yap; veli ekle (kayıtlı telefon → kardeş olarak bağlanır), düzenle, şifre sıfırla, kilit aç, ayır | ✅ |
| Kullanıcılar: öğretmen (şubeler), okul yetkilisi (yetkiler), kitabevi; geçici şifre (bir kez gösterilir, istenirse e-postayla), kilit aç, pasif yap | ✅ |
| Geçici şifreyle giren personel yeni şifre belirlemeden hiçbir sayfaya geçemez (`/sifre-degistir`); herkes adına tıklayıp şifresini değiştirebilir | ✅ |
| **Excel ile öğrenci yükleme:** şablon ya da okulun kendi listesi (e-Okul çıktısı, .xlsx / .csv); kontrol → önizleme (yeni / güncellenecek / uyarılı / hatalı) → kaydet; hatalı satırları Excel olarak indir | ✅ |
| Panelde yapılan her değişiklik kaydedilir (`YonetimIslem`: kim, ne zaman, ne değişti; şifreler yazılmaz) | ✅ |
| **Üst yapı (tüm sayfalar):** en solda ana sayfa ikonu, logo, canlı arama çubuğu; logonun altında menü bandı (kitabevinde açılır gruplar), kategori ağaçlı **Katalog** menüsü; tüm sayfalarda alt bilgi (firma bilgisi, kurumsal sayfalar, sözleşmeler) ve WhatsApp destek düğmesi | ✅ |
| **Katalog** (tüm kullanıcılar): kategori ağacı, arama, **depo stok miktarı**, kampanya fiyatı; veli katalogdan öğrencisinin sepetine ürün / set ekler | ✅ |
| **Plasiyer:** okul ve öğretmen plasiyere bağlanır (öğretmene okulunkinden farklı plasiyer atanabilir); plasiyer `/yonetim/giris`ten girer, kendi okul/öğretmen, sepet, tahsilat ve terk edilen sepetlerini görür (salt okunur) | ✅ |
| **Ürünler:** satış durumu, web fiyatı, açıklama, kapak görseli; **kategori ağacı** + hızlı aramayla toplu kategoriye ekleme | ✅ |
| **Setler:** barkod (iç EAN-13 üretimi ya da elle) + ad + ürünler/adet + set fiyatı (boş = toplam); tavsiye sepetine tek kalem eklenir | ✅ |
| **Kampanyalar:** tarih aralığı, indirim oranı / ürüne özel fiyat; kampanya sayfası; okul yetkilileri ve öğretmenlere SMS ve/veya e-posta duyurusu | ✅ |
| **Raporlar:** tahsilat listesi (havale onayı, Excel), tavsiye sepeti durumu (okul/sınıf/plasiyer, dönüşüm), terk edilen sepetler, log raporları (işlem, giriş, bildirim) | ✅ |
| **Site ayarları:** firma & WhatsApp, ödeme (yöntemler, POS aktif/test, taksit, yönlendirme kuralları), havale/EFT (IBAN doğrulamalı hesaplar), kargo & kurye (firma, bölge, ücretsiz limit), **SMS ve e-posta operatörü** (şifre şifreli saklanır, deneme gönderimi), kurumsal sayfalar | ✅ |
| **Hakediş:** okul bazında oran + tarih; "okul görsün" açıksa okul panelinde ciro, oran, hakediş tutarı | ✅ |
| Okul / öğretmen ana sayfası: sınıflar, öğrenciler, öğretmenlerin sepetleri dahil tüm sepetler, sepet içeriği, sipariş durumu | ✅ |
| Veli ödeme adımı (kart 3D + havale), siparişlerim, toplu sipariş, Opak'a sipariş aktarımı, Opak stok senkronu | ⏳ sıradaki aşamalar |

## Hızlı başlangıç (örnek veriyle)

```bash
npm install
cp .env.example .env.local     # DATA_SOURCE=mock bırakın
npm run dev                    # http://localhost:3000
```

Örnek veri modunda SMS ve e-postalar terminale yazılır; SMS kodu giriş ekranında da "Geliştirme modu" olarak görünür.

| Rol | Giriş |
|---|---|
| Veli (ilk giriş, SMS ile şifre belirler) | 532 000 00 00 |
| Veli (şifreli) | 533 111 22 33 / `Veli1234` |
| Öğretmen (yalnız 5-A) | ogretmen@demo.k12.tr / `Demo1234` |
| Okul yönetimi | okul@demo.k12.tr / `Demo1234` |
| Kardelen yönetim (`/yonetim/giris`) | yonetim@kardelenokul.com / `Demo1234` |
| Plasiyer (`/yonetim/giris`) | plasiyer@kardelenokul.com / `Demo1234` |

Okula özel giriş örnekleri: `/ornek-ortaokulu` (logo açık), `/ornek-ilkokulu` (logosuz).

## SQL Server'a bağlama

1. Opak ile aynı SQL Server'da `db/schema.sql` betiğini çalıştırın (ayrı `KardelenOkul` veritabanı oluşturur; Opak tablolarına dokunmaz).
2. Web uygulaması için yalnız `KardelenOkul` üzerinde yetkili bir SQL kullanıcısı açın.
3. `.env.local` → `DATA_SOURCE=mssql` ve `MSSQL_*` değerleri.
4. İlk kitabevi yönetim hesabını SQL ile açın (`Kullanici`, Tip = 'Yonetim', `SifreDegistirmeliMi = 1`). Şifre hash'i bcrypt'tir: `node -e "console.log(require('bcryptjs').hashSync('GeciciSifre1',12))"`. Sonraki okul, öğrenci, veli ve kullanıcı kayıtları yönetim panelinden yapılır.
5. Aktif sezon (`Sezon.AktifMi = 1`) tanımlı olmalı; sınıf ve şubeler aktif sezona açılır.
6. Aramada Türkçe karakter katlaması için SQL Server 2017 veya üstü gerekir (`TRANSLATE`).

## SMS ve e-posta

- Operatörler **Site ayarları › SMS & e-posta operatörü** ekranından seçilir (NetGSM, İleti Merkezi, genel HTTP; SMTP). Panelde ayar yoksa ortam değişkenleri kullanılır (`SMS_PROVIDER=http`, `SMTP_*`).
- Operatör şifreleri `Ayar` tablosunda **AES-256-GCM ile şifreli** tutulur; anahtar `AYAR_ANAHTARI` (yoksa `SESSION_SECRET`'tan türetilir). Anahtar değişirse şifreleri ekrandan yeniden girin.
- NetGSM / İleti Merkezi bağlantıları firmaların bilinen API biçimine göre yazıldı; canlıya almadan önce firmanın güncel dokümanıyla ve "Deneme gönder" ile doğrulayın.
- Test sitesinde (`DEMO_MODU=true`) panelde operatör seçilse bile gönderim yapılmaz, sunucu günlüğüne yazılır.
- SMS ve e-postadaki bağlantı `SITE_URL/okul-adresi` olur (okulun adresi yoksa `/giris`).
- Liste yayınında her gönderim `Bildirim` tablosuna `Kuyrukta → Gonderildi/Hata` olarak yazılır. Çok kalabalık okullarda gönderim bir arka plan işine taşınabilir (hatalı kayıtlar yeniden denenir).

## Render'da test sitesi (ücretsiz)

`render.yaml` hazırdır: Render panelinde **New → Blueprint** ile GitHub deposu seçilir; hizmet Frankfurt bölgesinde, ücretsiz planda, örnek verilerle (`DATA_SOURCE=mock`, `DEMO_MODU=true`) kurulur.
- Derleme: `npm ci && npm run build:sunucu` · Başlatma: `npm run start:sunucu` · Sağlık kontrolü: `/api/saglik`
- Demo modunda üstte "TEST SİTESİ" bandı görünür ve veli SMS kodu ekranda gösterilir. Demo modu yalnız örnek veri + konsol SMS ile açılır; gerçek veritabanı ya da gerçek SMS firması bağlıyken kendiliğinden kapanır.
- `SITE_URL` verilmezse Render'ın `RENDER_EXTERNAL_URL` adresi kullanılır.
- Ücretsiz plan 15 dakika boşta kalınca uyur (ilk açılış ~1 dk); her uyanış ve yeniden yayında örnek veriler sıfırlanır.

## Canlıya alma (IIS + ARR)

```bash
npm ci && npm run build:sunucu     # derler ve statik dosyaları .next/standalone içine kopyalar (Windows'ta da çalışır)
npm run start:sunucu               # = node .next/standalone/server.js  (PORT=3000 varsayılan)
```

Okul logoları `LOGO_DIZINI` klasörüne yazılır ve `/api/okul-logo/{okul-adresi}` üzerinden verilir; bu klasörü uygulama klasörünün dışında, yedeklenen bir yerde tutun.

IIS'te ARR ile `kardelenokul.com` → `http://localhost:3000` reverse proxy kuralı (Kalıtım B2B'deki gibi). Node sürecini Windows hizmeti olarak çalıştırmak için NSSM ya da PM2 kullanılabilir. Önde Cloudflare varsa SSL "Full (strict)" önerilir. Canlıda `SESSION_SECRET` en az 32 karakter olmalıdır.

## Klasör yapısı

```
db/schema.sql                 KardelenOkul veritabanı
src/proxy.ts                  oturum ve rol koruması (kapalı site)
src/lib/session.ts            imzalı oturum çerezi (JWT, httpOnly)
src/lib/auth.ts               telefon, SMS kodu, şifre yardımcıları
src/lib/data/repo.ts          veri arayüzü  ─┬─ mock.ts  (örnek veri)
                                             └─ mssql.ts (SQL Server)
src/lib/listeler.ts           sepet yetkileri + yayınla (toplu / seçili / hatırlatma) ve bildir
src/lib/panel.ts              ana sayfa özetleri (öğretmen, okul, kitabevi)
src/lib/slug.ts               okul giriş adresi kuralları (ayrılmış adlar)
src/lib/depo/logo.ts          okul logosu saklama (içerikten tür kontrolü, SVG yok)
src/lib/notify/               SMS ve e-posta sağlayıcıları
src/lib/opak/client.ts        Opak action tabanlı istemci (okuma uçları; sipariş aktarımı Opak ile netleşecek)
src/app/giris                 genel giriş        src/app/[okul]   okula özel giriş
src/app/veli                  veli ekranları
src/app/{ogretmen,okul,yonetim}            ana sayfa, listeler (sepet düzenleme),
                              listeler/[id] (sepet detayı), ogrenciler/[id] (öğrenci detayı)
src/app/yonetim/okullar       okullar; okul sayfası sekmeleri: özet, bilgiler, sınıflar, öğrenciler, kullanıcılar, giriş sayfası
src/app/yonetim/ogrenciler    öğrenci & veli kayıtları      src/app/yonetim/kullanicilar  personel hesapları
src/app/yonetim/ara           tek kutudan arama             src/app/sifre-degistir        personel şifre değiştirme
src/lib/data/yonetim*.ts      yönetim paneli veri katmanı (mock + mssql)
src/lib/yukleme               Excel/CSV okuma, sınıf/şube çözümleme, satır kontrolü, kaydetme, şablon
src/components/yonetim        yönetim paneli form bileşenleri
src/components/panel          ortak panel bileşenleri
src/app/api/...               API uçları
```

## Opak ile netleşecekler

1. `KardelenOkul` veritabanını aynı SQL Server'a açma izni ve Opak veritabanına salt-okunur kullanıcı
2. Siparişin Opak'a aktarılmasının resmi yolu (API action'ı mı, aktarım tablosu mu)

## Excel ile öğrenci yükleme

- Kolonlar (sıra serbest, farklı yazımlar tanınır): **Okul No, Ad, Soyad** (ya da tek kolonda Ad Soyad), **Sınıf, Şube** (ya da tek kolonda "5-A", "5. Sınıf / A Şubesi"), Veli Ad Soyad, **Veli Telefon**, Veli 2 Telefon, Veli E-posta, isteğe bağlı Okul Kodu (çok okullu dosya).
- Başlık satırı ilk 15 satırda aranır (e-Okul çıktısındaki üst başlıklar atlanır). Türkçe Excel CSV'si (`;` ayraçlı, Windows-1254) desteklenir; eski .xls desteklenmez.
- Aynı okulda kayıtlı okul numarası **güncellenir**; aynı veli telefonu tek veli hesabında toplanır (kardeşler); istenirse eksik sınıf/şubeler açılır.
- Yükleme önce önizleme olarak saklanır (`OgrenciYuklemeParti/Satir`), kaydetmede güncel veriye göre yeniden kontrol edilir. Hatalı satırlar atlanır ve "Hata" kolonuyla indirilip düzeltilerek yeniden yüklenebilir.
- Sınır: 5 MB, 5.000 satır.
