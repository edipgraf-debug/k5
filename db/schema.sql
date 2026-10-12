/* =====================================================================
   KARDELEN OKUL — Veritabanı Oluşturma Betiği (v1, 10.10.2026)
   Hedef: Microsoft SQL Server 2016+  (Opak ile aynı SQL Server örneği)

   İLKELER
   - Bu veritabanı Opak veritabanından AYRIDIR. Opak tablolarına dokunulmaz.
   - Opak ile bağ KOD üzerinden kurulur (OpakCariKodu, OpakStokKodu);
     veritabanları arası fiziksel FK yoktur.
   - Opak'tan okuma: salt-okunur kullanıcı / view'lar.
     Opak'a yazma (sipariş, tahsilat, e-Arşiv): yalnız Opak API'si veya
     Opak'ın resmi aktarım tabloları (Opak ile netleşecek).
   - Veliler Opak'ta cari olmaz. Her okulun bir "Web Perakende" alt carisi
     vardır (Okul.OpakWebCariKodu); e-Arşiv alıcı bilgisi belge düzeyinde
     Siparis.Fatura* alanlarından gönderilir.
   - Kart bilgisi SAKLANMAZ (yalnız BIN ilk 6-8 hane ve son 4 hane).
     Sanal POS anahtarları veritabanında değil, sunucu yapılandırmasında tutulur.
   - Telefonlar 10 hane, başında 0 olmadan saklanır: 5xxxxxxxxx
   ===================================================================== */

IF DB_ID(N'KardelenOkul') IS NULL
    CREATE DATABASE KardelenOkul COLLATE Turkish_CI_AS;
GO

USE KardelenOkul;
GO

/* ---------------------------------------------------------------------
   1. GENEL / SEZON / AYAR
   --------------------------------------------------------------------- */

CREATE TABLE dbo.Sezon (
    Id                  INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Sezon PRIMARY KEY,
    Ad                  NVARCHAR(50)        NOT NULL,          -- '2026-2027'
    BaslangicTarihi     DATE                NOT NULL,
    BitisTarihi         DATE                NOT NULL,
    HakedisOdemeTarihi  DATE                NULL,              -- sezon sonu hakediş ödeme günü
    AktifMi             BIT                 NOT NULL CONSTRAINT DF_Sezon_AktifMi DEFAULT (0),
    CONSTRAINT UQ_Sezon_Ad UNIQUE (Ad),
    CONSTRAINT CK_Sezon_Tarih CHECK (BitisTarihi > BaslangicTarihi)
);
GO
-- Aynı anda yalnız bir aktif sezon
CREATE UNIQUE INDEX UX_Sezon_TekAktif ON dbo.Sezon (AktifMi) WHERE AktifMi = 1;
GO

CREATE TABLE dbo.Ayar (
    Anahtar     VARCHAR(100)    NOT NULL CONSTRAINT PK_Ayar PRIMARY KEY,
    Deger       NVARCHAR(1000)  NOT NULL,
    Aciklama    NVARCHAR(500)   NULL
);
GO

/* ---------------------------------------------------------------------
   2. OKUL / SINIF / ŞUBE
   --------------------------------------------------------------------- */

CREATE TABLE dbo.Okul (
    Id                  INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Okul PRIMARY KEY,
    Kod                 VARCHAR(20)         NOT NULL,          -- iç kısa kod
    Ad                  NVARCHAR(200)       NOT NULL,
    Il                  NVARCHAR(50)        NOT NULL,
    Ilce                NVARCHAR(50)        NOT NULL,
    Adres               NVARCHAR(500)       NULL,
    Telefon             VARCHAR(10)         NULL,
    Eposta              NVARCHAR(150)       NULL,
    OpakCariKodu        NVARCHAR(30)        NULL,              -- okulun ana carisi (toplu alım)
    OpakWebCariKodu     NVARCHAR(30)        NULL,              -- web perakende alt carisi (veli satışları)
    Slug                VARCHAR(80)         NULL,              -- okula özel giriş adresi: kardelenokul.com/{Slug}
    LogoDosya           NVARCHAR(200)       NULL,              -- yüklenen okul logosu (depodaki dosya adı)
    GiristeLogoGoster   BIT                 NOT NULL CONSTRAINT DF_Okul_LogoGoster DEFAULT (0),  -- isteğe bağlı: girişte logo
    AktifMi             BIT                 NOT NULL CONSTRAINT DF_Okul_AktifMi DEFAULT (1),
    OlusturmaTarihi     DATETIME2(0)        NOT NULL CONSTRAINT DF_Okul_Olusturma DEFAULT (SYSDATETIME()),
    GuncellemeTarihi    DATETIME2(0)        NULL,
    CONSTRAINT UQ_Okul_Kod UNIQUE (Kod),
    CONSTRAINT CK_Okul_Slug CHECK (Slug IS NULL OR (LEN(Slug) BETWEEN 3 AND 80 AND Slug NOT LIKE '%[^a-z0-9-]%' AND Slug NOT LIKE '-%' AND Slug NOT LIKE '%-')),
    CONSTRAINT CK_Okul_Logo CHECK (GiristeLogoGoster = 0 OR LogoDosya IS NOT NULL)
);
GO
CREATE UNIQUE INDEX UX_Okul_Slug        ON dbo.Okul (Slug)            WHERE Slug            IS NOT NULL;
CREATE UNIQUE INDEX UX_Okul_OpakCari    ON dbo.Okul (OpakCariKodu)    WHERE OpakCariKodu    IS NOT NULL;
CREATE UNIQUE INDEX UX_Okul_OpakWebCari ON dbo.Okul (OpakWebCariKodu) WHERE OpakWebCariKodu IS NOT NULL;
GO

CREATE TABLE dbo.OkulAdres (                                   -- toplu siparişte seçilecek teslim adresleri
    Id              INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_OkulAdres PRIMARY KEY,
    OkulId          INT                 NOT NULL CONSTRAINT FK_OkulAdres_Okul REFERENCES dbo.Okul(Id),
    Baslik          NVARCHAR(100)       NOT NULL,
    YetkiliAdSoyad  NVARCHAR(150)       NULL,
    Telefon         VARCHAR(10)         NULL,
    Il              NVARCHAR(50)        NOT NULL,
    Ilce            NVARCHAR(50)        NOT NULL,
    Adres           NVARCHAR(500)       NOT NULL,
    VarsayilanMi    BIT                 NOT NULL CONSTRAINT DF_OkulAdres_Varsayilan DEFAULT (0),
    AktifMi         BIT                 NOT NULL CONSTRAINT DF_OkulAdres_Aktif DEFAULT (1)
);
GO
CREATE INDEX IX_OkulAdres_Okul ON dbo.OkulAdres (OkulId);
GO

CREATE TABLE dbo.Sinif (                                       -- okul + sezon + seviye
    Id          INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Sinif PRIMARY KEY,
    OkulId      INT                 NOT NULL CONSTRAINT FK_Sinif_Okul  REFERENCES dbo.Okul(Id),
    SezonId     INT                 NOT NULL CONSTRAINT FK_Sinif_Sezon REFERENCES dbo.Sezon(Id),
    Seviye      TINYINT             NOT NULL,                  -- 0 = anasınıfı, 1..12
    Ad          NVARCHAR(50)        NOT NULL,                  -- '5. Sınıf'
    CONSTRAINT UQ_Sinif UNIQUE (OkulId, SezonId, Seviye),
    CONSTRAINT CK_Sinif_Seviye CHECK (Seviye BETWEEN 0 AND 12)
);
GO

CREATE TABLE dbo.Sube (
    Id          INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Sube PRIMARY KEY,
    SinifId     INT                 NOT NULL CONSTRAINT FK_Sube_Sinif REFERENCES dbo.Sinif(Id),
    Ad          NVARCHAR(20)        NOT NULL,                  -- 'A', 'B'
    CONSTRAINT UQ_Sube UNIQUE (SinifId, Ad)
);
GO

/* ---------------------------------------------------------------------
   3. ÖĞRENCİ / VELİ
   --------------------------------------------------------------------- */

CREATE TABLE dbo.Ogrenci (
    Id                  INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Ogrenci PRIMARY KEY,
    OkulId              INT                 NOT NULL CONSTRAINT FK_Ogrenci_Okul REFERENCES dbo.Okul(Id),
    OkulNo              NVARCHAR(20)        NOT NULL,
    Ad                  NVARCHAR(100)       NOT NULL,
    Soyad               NVARCHAR(100)       NOT NULL,
    AktifMi             BIT                 NOT NULL CONSTRAINT DF_Ogrenci_Aktif DEFAULT (1),
    OlusturmaTarihi     DATETIME2(0)        NOT NULL CONSTRAINT DF_Ogrenci_Olusturma DEFAULT (SYSDATETIME()),
    GuncellemeTarihi    DATETIME2(0)        NULL,
    CONSTRAINT UQ_Ogrenci_OkulNo UNIQUE (OkulId, OkulNo)
);
GO

CREATE TABLE dbo.OgrenciSezon (                                -- öğrencinin o sezondaki şubesi
    Id          INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_OgrenciSezon PRIMARY KEY,
    OgrenciId   INT                 NOT NULL CONSTRAINT FK_OgrenciSezon_Ogrenci REFERENCES dbo.Ogrenci(Id),
    SezonId     INT                 NOT NULL CONSTRAINT FK_OgrenciSezon_Sezon   REFERENCES dbo.Sezon(Id),
    SubeId      INT                 NOT NULL CONSTRAINT FK_OgrenciSezon_Sube    REFERENCES dbo.Sube(Id),
    CONSTRAINT UQ_OgrenciSezon UNIQUE (OgrenciId, SezonId)
);
GO
CREATE INDEX IX_OgrenciSezon_Sube ON dbo.OgrenciSezon (SubeId);
GO

CREATE TABLE dbo.Veli (
    Id                      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Veli PRIMARY KEY,
    Telefon                 VARCHAR(10)         NOT NULL,      -- giriş kimliği
    AdSoyad                 NVARCHAR(150)       NULL,
    Eposta                  NVARCHAR(150)       NULL,
    SifreHash               VARCHAR(255)        NULL,          -- SMS doğrulamasından sonra belirlenir (NULL = henüz belirlemedi)
    TelefonDogrulandiMi     BIT                 NOT NULL CONSTRAINT DF_Veli_Dogrulandi DEFAULT (0),
    BasarisizGirisSayisi    TINYINT             NOT NULL CONSTRAINT DF_Veli_Basarisiz DEFAULT (0),
    KilitBitisTarihi        DATETIME2(0)        NULL,
    SonGirisTarihi          DATETIME2(0)        NULL,
    AktifMi                 BIT                 NOT NULL CONSTRAINT DF_Veli_Aktif DEFAULT (1),
    OlusturmaTarihi         DATETIME2(0)        NOT NULL CONSTRAINT DF_Veli_Olusturma DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Veli_Telefon UNIQUE (Telefon),
    CONSTRAINT CK_Veli_Telefon CHECK (Telefon LIKE '5[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
);
GO

CREATE TABLE dbo.VeliOgrenci (                                 -- kardeşler: bir veli → çok öğrenci; bir öğrenci → çok veli
    VeliId      INT             NOT NULL CONSTRAINT FK_VeliOgrenci_Veli    REFERENCES dbo.Veli(Id),
    OgrenciId   INT             NOT NULL CONSTRAINT FK_VeliOgrenci_Ogrenci REFERENCES dbo.Ogrenci(Id),
    Yakinlik    NVARCHAR(30)    NULL,                          -- Anne, Baba, ...
    CONSTRAINT PK_VeliOgrenci PRIMARY KEY (VeliId, OgrenciId)
);
GO
CREATE INDEX IX_VeliOgrenci_Ogrenci ON dbo.VeliOgrenci (OgrenciId);
GO

CREATE TABLE dbo.VeliAdres (
    Id              INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_VeliAdres PRIMARY KEY,
    VeliId          INT                 NOT NULL CONSTRAINT FK_VeliAdres_Veli REFERENCES dbo.Veli(Id),
    Baslik          NVARCHAR(50)        NOT NULL,              -- Ev, İş
    AdSoyad         NVARCHAR(150)       NOT NULL,
    Telefon         VARCHAR(10)         NOT NULL,
    Il              NVARCHAR(50)        NOT NULL,
    Ilce            NVARCHAR(50)        NOT NULL,
    Mahalle         NVARCHAR(100)       NULL,
    Adres           NVARCHAR(500)       NOT NULL,
    AdresTarifi     NVARCHAR(300)       NULL,                  -- kurye için
    Enlem           DECIMAL(9,6)        NULL,
    Boylam          DECIMAL(9,6)        NULL,
    VarsayilanMi    BIT                 NOT NULL CONSTRAINT DF_VeliAdres_Varsayilan DEFAULT (0),
    AktifMi         BIT                 NOT NULL CONSTRAINT DF_VeliAdres_Aktif DEFAULT (1)
);
GO
CREATE INDEX IX_VeliAdres_Veli ON dbo.VeliAdres (VeliId);
GO

CREATE TABLE dbo.SmsDogrulama (
    Id                  BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SmsDogrulama PRIMARY KEY,
    Telefon             VARCHAR(10)         NOT NULL,
    KodHash             VARCHAR(255)        NOT NULL,          -- kod açık saklanmaz
    Amac                VARCHAR(20)         NOT NULL,
    SonGecerlilikTarihi DATETIME2(0)        NOT NULL,
    DenemeSayisi        TINYINT             NOT NULL CONSTRAINT DF_Sms_Deneme DEFAULT (0),
    KullanildiMi        BIT                 NOT NULL CONSTRAINT DF_Sms_Kullanildi DEFAULT (0),
    IpAdresi            VARCHAR(45)         NULL,
    OlusturmaTarihi     DATETIME2(0)        NOT NULL CONSTRAINT DF_Sms_Olusturma DEFAULT (SYSDATETIME()),
    CONSTRAINT CK_Sms_Amac CHECK (Amac IN ('IlkGiris', 'SifreSifirlama', 'TelefonDegisikligi'))
);
GO
CREATE INDEX IX_SmsDogrulama_Telefon ON dbo.SmsDogrulama (Telefon, OlusturmaTarihi DESC);
GO

/* Excel ile öğrenci yükleme: önce ara tabloya → önizleme/hata → onay → asıl tablolara */
CREATE TABLE dbo.OgrenciYuklemeParti (
    Id                  INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_OgrenciYuklemeParti PRIMARY KEY,
    OkulId              INT                 NULL CONSTRAINT FK_YuklemeParti_Okul  REFERENCES dbo.Okul(Id),  -- NULL: dosyada "Okul Kodu" kolonu (çok okullu)
    SezonId             INT                 NOT NULL CONSTRAINT FK_YuklemeParti_Sezon REFERENCES dbo.Sezon(Id),
    DosyaAdi            NVARCHAR(255)       NOT NULL,
    YukleyenKullaniciId INT                 NOT NULL,          -- FK aşağıda (Kullanici sonra oluşuyor)
    Durum               VARCHAR(20)         NOT NULL CONSTRAINT DF_YuklemeParti_Durum DEFAULT ('Onizleme'),
    ToplamSatir         INT                 NOT NULL CONSTRAINT DF_YuklemeParti_Toplam DEFAULT (0),
    HataliSatir         INT                 NOT NULL CONSTRAINT DF_YuklemeParti_Hatali DEFAULT (0),
    KaydedilenSatir     INT                 NOT NULL CONSTRAINT DF_YuklemeParti_Kaydedilen DEFAULT (0),
    SubeOtomatikAc      BIT                 NOT NULL CONSTRAINT DF_YuklemeParti_SubeAc DEFAULT (1),   -- dosyadaki eksik sınıf/şube açılsın mı
    OlusturmaTarihi     DATETIME2(0)        NOT NULL CONSTRAINT DF_YuklemeParti_Olusturma DEFAULT (SYSDATETIME()),
    OnayTarihi          DATETIME2(0)        NULL,
    CONSTRAINT CK_YuklemeParti_Durum CHECK (Durum IN ('Onizleme', 'Onaylandi', 'IptalEdildi'))
);
GO

CREATE TABLE dbo.OgrenciYuklemeSatir (                         -- dosyadaki ham değerler; onayda yeniden kontrol edilir
    Id              INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_OgrenciYuklemeSatir PRIMARY KEY,
    PartiId         INT                 NOT NULL CONSTRAINT FK_YuklemeSatir_Parti REFERENCES dbo.OgrenciYuklemeParti(Id),
    SatirNo         INT                 NOT NULL,
    OkulNo          NVARCHAR(50)        NULL,
    Ad              NVARCHAR(200)       NULL,
    Soyad           NVARCHAR(200)       NULL,
    Sinif           NVARCHAR(50)        NULL,                  -- "5", "5. Sınıf", "5-A"
    Sube            NVARCHAR(50)        NULL,
    VeliAdSoyad     NVARCHAR(300)       NULL,
    VeliTelefon     NVARCHAR(30)        NULL,                  -- ham hali; normalize edilerek Veli'ye yazılır
    VeliTelefon2    NVARCHAR(30)        NULL,
    VeliEposta      NVARCHAR(300)       NULL,                  -- sepet bildirimi için (isteğe bağlı)
    OkulKodu        NVARCHAR(50)        NULL,                  -- çok okullu dosyada satırın okulu
    OkulId          INT                 NULL CONSTRAINT FK_YuklemeSatir_Okul REFERENCES dbo.Okul(Id),  -- çözümlenen okul
    HataMesaji      NVARCHAR(500)       NULL,                  -- NULL = geçerli satır
    Uyari           NVARCHAR(500)       NULL,                  -- kaydedilir ama dikkat (ör. kayıtlı veli kardeş olarak bağlanacak)
    Islem           VARCHAR(10)         NULL,                  -- 'Yeni' / 'Guncelle'
    CONSTRAINT CK_YuklemeSatir_Islem CHECK (Islem IS NULL OR Islem IN ('Yeni', 'Guncelle'))
);
GO
CREATE INDEX IX_YuklemeSatir_Parti ON dbo.OgrenciYuklemeSatir (PartiId);
GO

/* ---------------------------------------------------------------------
   4. PERSONEL KULLANICILARI (Kardelen yönetim, okul, öğretmen)
      Hesapların tamamını Kardelen açar.
   --------------------------------------------------------------------- */

CREATE TABLE dbo.Kullanici (
    Id                      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Kullanici PRIMARY KEY,
    Tip                     VARCHAR(10)         NOT NULL,      -- Yonetim / Okul / Ogretmen
    OkulId                  INT                 NULL CONSTRAINT FK_Kullanici_Okul REFERENCES dbo.Okul(Id),
    AdSoyad                 NVARCHAR(150)       NOT NULL,
    Eposta                  NVARCHAR(150)       NOT NULL,
    Telefon                 VARCHAR(10)         NULL,
    SifreHash               VARCHAR(255)        NOT NULL,
    SifreDegistirmeliMi     BIT                 NOT NULL CONSTRAINT DF_Kullanici_SifreDegistir DEFAULT (1),
    BasarisizGirisSayisi    TINYINT             NOT NULL CONSTRAINT DF_Kullanici_Basarisiz DEFAULT (0),
    KilitBitisTarihi        DATETIME2(0)        NULL,
    SonGirisTarihi          DATETIME2(0)        NULL,
    AktifMi                 BIT                 NOT NULL CONSTRAINT DF_Kullanici_Aktif DEFAULT (1),
    OlusturmaTarihi         DATETIME2(0)        NOT NULL CONSTRAINT DF_Kullanici_Olusturma DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_Kullanici_Eposta UNIQUE (Eposta),
    CONSTRAINT CK_Kullanici_Tip CHECK (Tip IN ('Yonetim', 'Okul', 'Ogretmen')),
    CONSTRAINT CK_Kullanici_Okul CHECK (
        (Tip = 'Yonetim' AND OkulId IS NULL) OR (Tip IN ('Okul', 'Ogretmen') AND OkulId IS NOT NULL)
    )
);
GO

ALTER TABLE dbo.OgrenciYuklemeParti
    ADD CONSTRAINT FK_YuklemeParti_Kullanici FOREIGN KEY (YukleyenKullaniciId) REFERENCES dbo.Kullanici(Id);
GO

CREATE TABLE dbo.KullaniciYetki (                              -- okul kullanıcıları için ince yetki
    KullaniciId INT         NOT NULL CONSTRAINT FK_KullaniciYetki_Kullanici REFERENCES dbo.Kullanici(Id),
    Yetki       VARCHAR(30) NOT NULL,
    CONSTRAINT PK_KullaniciYetki PRIMARY KEY (KullaniciId, Yetki),
    CONSTRAINT CK_KullaniciYetki CHECK (Yetki IN (
        'TopluSiparis', 'SiparisRapor', 'TedarikRapor', 'Hakedis',
        'OgrenciYonetim', 'KitapListe', 'KullaniciYonetim'))
);
GO

CREATE TABLE dbo.OgretmenSube (                                -- öğretmenin sorumlu olduğu şubeler/branş
    KullaniciId INT             NOT NULL CONSTRAINT FK_OgretmenSube_Kullanici REFERENCES dbo.Kullanici(Id),
    SubeId      INT             NOT NULL CONSTRAINT FK_OgretmenSube_Sube      REFERENCES dbo.Sube(Id),
    Brans       NVARCHAR(50)    NOT NULL CONSTRAINT DF_OgretmenSube_Brans DEFAULT (N'Sınıf Öğretmeni'),
    CONSTRAINT PK_OgretmenSube PRIMARY KEY (KullaniciId, SubeId, Brans)
);
GO

/* Kitabevi (Kardelen) yönetim panelinde yapılan kayıt değişiklikleri: kim, ne zaman, neyi değiştirdi.
   Şifreler ve doğrulama kodları buraya YAZILMAZ. */
CREATE TABLE dbo.YonetimIslem (
    Id              BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_YonetimIslem PRIMARY KEY,
    KullaniciId     INT                 NOT NULL CONSTRAINT FK_YonetimIslem_Kullanici REFERENCES dbo.Kullanici(Id),
    HedefTip        VARCHAR(20)         NOT NULL,
    HedefId         INT                 NOT NULL,
    Islem           NVARCHAR(100)       NOT NULL,
    Ayrinti         NVARCHAR(500)       NULL,
    Tarih           DATETIME2(0)        NOT NULL CONSTRAINT DF_YonetimIslem_Tarih DEFAULT (SYSDATETIME()),
    CONSTRAINT CK_YonetimIslem_Hedef CHECK (HedefTip IN ('Okul', 'Ogrenci', 'Veli', 'Kullanici'))
);
GO
CREATE INDEX IX_YonetimIslem_Hedef ON dbo.YonetimIslem (HedefTip, HedefId, Tarih DESC);
GO

/* ---------------------------------------------------------------------
   5. ÜRÜN (Opak stok kartının yerel kopyası) / ÖNERİ ve KİTAP LİSTELERİ
   --------------------------------------------------------------------- */

CREATE TABLE dbo.Urun (
    Id                  INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Urun PRIMARY KEY,
    OpakStokKodu        NVARCHAR(30)        NOT NULL,
    Barkod              NVARCHAR(30)        NULL,
    Ad                  NVARCHAR(300)       NOT NULL,
    Yayinevi            NVARCHAR(200)       NULL,
    Yazar               NVARCHAR(200)       NULL,
    Kategori            NVARCHAR(100)       NULL,
    ListeFiyati         DECIMAL(18,2)       NOT NULL,          -- KDV dahil (Opak'tan)
    KdvOrani            DECIMAL(5,2)        NOT NULL CONSTRAINT DF_Urun_Kdv DEFAULT (0),
    GorselId            INT                 NULL,              -- Opak images_id
    AktifMi             BIT                 NOT NULL CONSTRAINT DF_Urun_Aktif DEFAULT (1),
    SonSenkronTarihi    DATETIME2(0)        NULL,
    CONSTRAINT UQ_Urun_OpakStokKodu UNIQUE (OpakStokKodu)
);
GO
CREATE INDEX IX_Urun_Barkod ON dbo.Urun (Barkod);
GO

CREATE TABLE dbo.OneriListe (                                  -- Kardelen'in hazırladığı öneri listeleri
    Id                  INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_OneriListe PRIMARY KEY,
    SezonId             INT                 NOT NULL CONSTRAINT FK_OneriListe_Sezon REFERENCES dbo.Sezon(Id),
    Ad                  NVARCHAR(200)       NOT NULL,
    Aciklama            NVARCHAR(1000)      NULL,
    Seviye              TINYINT             NULL,
    Brans               NVARCHAR(50)        NULL,
    PaylasimKodu        UNIQUEIDENTIFIER    NOT NULL CONSTRAINT DF_OneriListe_Paylasim DEFAULT (NEWID()),  -- e-posta/WhatsApp bağlantısı
    AktifMi             BIT                 NOT NULL CONSTRAINT DF_OneriListe_Aktif DEFAULT (1),
    OlusturanKullaniciId INT                NOT NULL CONSTRAINT FK_OneriListe_Kullanici REFERENCES dbo.Kullanici(Id),
    OlusturmaTarihi     DATETIME2(0)        NOT NULL CONSTRAINT DF_OneriListe_Olusturma DEFAULT (SYSDATETIME()),
    CONSTRAINT UQ_OneriListe_Paylasim UNIQUE (PaylasimKodu)
);
GO

CREATE TABLE dbo.OneriListeSatir (
    Id              INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_OneriListeSatir PRIMARY KEY,
    OneriListeId    INT                 NOT NULL CONSTRAINT FK_OneriListeSatir_Liste REFERENCES dbo.OneriListe(Id),
    UrunId          INT                 NOT NULL CONSTRAINT FK_OneriListeSatir_Urun  REFERENCES dbo.Urun(Id),
    Sira            INT                 NOT NULL CONSTRAINT DF_OneriListeSatir_Sira DEFAULT (0),
    Notu            NVARCHAR(300)       NULL,
    CONSTRAINT UQ_OneriListeSatir UNIQUE (OneriListeId, UrunId)
);
GO

CREATE TABLE dbo.OneriPaylasim (                               -- kime, hangi kanaldan gönderildi
    Id                      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_OneriPaylasim PRIMARY KEY,
    OneriListeId            INT                 NOT NULL CONSTRAINT FK_OneriPaylasim_Liste REFERENCES dbo.OneriListe(Id),
    OkulId                  INT                 NULL CONSTRAINT FK_OneriPaylasim_Okul REFERENCES dbo.Okul(Id),
    AliciKullaniciId        INT                 NULL CONSTRAINT FK_OneriPaylasim_Alici REFERENCES dbo.Kullanici(Id),
    Kanal                   VARCHAR(10)         NOT NULL,
    Alici                   NVARCHAR(150)       NOT NULL,      -- e-posta veya telefon
    GonderenKullaniciId     INT                 NOT NULL CONSTRAINT FK_OneriPaylasim_Gonderen REFERENCES dbo.Kullanici(Id),
    GonderimTarihi          DATETIME2(0)        NOT NULL CONSTRAINT DF_OneriPaylasim_Tarih DEFAULT (SYSDATETIME()),
    CONSTRAINT CK_OneriPaylasim_Kanal CHECK (Kanal IN ('Eposta', 'WhatsApp'))
);
GO

CREATE TABLE dbo.KitapListe (                                  -- okulun/öğretmenin yayındaki listesi
    Id                      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_KitapListe PRIMARY KEY,
    OkulId                  INT                 NOT NULL CONSTRAINT FK_KitapListe_Okul  REFERENCES dbo.Okul(Id),
    SezonId                 INT                 NOT NULL CONSTRAINT FK_KitapListe_Sezon REFERENCES dbo.Sezon(Id),
    Ad                      NVARCHAR(200)       NOT NULL,
    Kapsam                  VARCHAR(10)         NOT NULL,      -- Seviye / Sube / Ogrenci
    SinifId                 INT                 NULL CONSTRAINT FK_KitapListe_Sinif   REFERENCES dbo.Sinif(Id),
    SubeId                  INT                 NULL CONSTRAINT FK_KitapListe_Sube    REFERENCES dbo.Sube(Id),
    OgrenciId               INT                 NULL CONSTRAINT FK_KitapListe_Ogrenci REFERENCES dbo.Ogrenci(Id),
    KaynakOneriListeId      INT                 NULL CONSTRAINT FK_KitapListe_Oneri   REFERENCES dbo.OneriListe(Id),
    OlusturanKullaniciId    INT                 NOT NULL CONSTRAINT FK_KitapListe_Kullanici REFERENCES dbo.Kullanici(Id),
    YayindaMi               BIT                 NOT NULL CONSTRAINT DF_KitapListe_Yayinda DEFAULT (0),  -- taslak; "Yayınla" ile 1 olur (onay gerekmez)
    HedefTipi               VARCHAR(10)         NOT NULL CONSTRAINT DF_KitapListe_Hedef DEFAULT ('Toplu'), -- Toplu: kapsamdaki herkes · Secili: yalnız KitapListeHedef
    YayinTarihi             DATETIME2(0)        NULL,          -- son yayın; GuncellemeTarihi > YayinTarihi ise yayınlanmamış değişiklik var
    YayinlayanKullaniciId   INT                 NULL CONSTRAINT FK_KitapListe_Yayinlayan REFERENCES dbo.Kullanici(Id),
    OlusturmaTarihi         DATETIME2(0)        NOT NULL CONSTRAINT DF_KitapListe_Olusturma DEFAULT (SYSDATETIME()),
    GuncellemeTarihi        DATETIME2(0)        NULL,
    CONSTRAINT CK_KitapListe_Kapsam CHECK (
           (Kapsam = 'Seviye'  AND SinifId IS NOT NULL AND SubeId IS NULL     AND OgrenciId IS NULL)
        OR (Kapsam = 'Sube'    AND SubeId  IS NOT NULL AND SinifId IS NULL    AND OgrenciId IS NULL)
        OR (Kapsam = 'Ogrenci' AND OgrenciId IS NOT NULL AND SinifId IS NULL  AND SubeId IS NULL)
    ),
    CONSTRAINT CK_KitapListe_Hedef CHECK (HedefTipi IN ('Toplu', 'Secili'))
);
GO
CREATE INDEX IX_KitapListe_Okul ON dbo.KitapListe (OkulId, SezonId) INCLUDE (Kapsam, SinifId, SubeId, OgrenciId, YayindaMi);
GO

CREATE TABLE dbo.KitapListeSatir (
    Id              INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_KitapListeSatir PRIMARY KEY,
    KitapListeId    INT                 NOT NULL CONSTRAINT FK_KitapListeSatir_Liste REFERENCES dbo.KitapListe(Id),
    UrunId          INT                 NOT NULL CONSTRAINT FK_KitapListeSatir_Urun  REFERENCES dbo.Urun(Id),
    Adet            INT                 NOT NULL CONSTRAINT DF_KitapListeSatir_Adet DEFAULT (1),
    ZorunluMu       BIT                 NOT NULL CONSTRAINT DF_KitapListeSatir_Zorunlu DEFAULT (1),   -- 0 = isteğe bağlı
    SatisFiyati     DECIMAL(18,2)       NULL,                  -- NULL = Urun.ListeFiyati; dolu = okula özel KDV dahil fiyat
    Sira            INT                 NOT NULL CONSTRAINT DF_KitapListeSatir_Sira DEFAULT (0),
    CONSTRAINT UQ_KitapListeSatir UNIQUE (KitapListeId, UrunId),
    CONSTRAINT CK_KitapListeSatir_Adet CHECK (Adet > 0)
);
GO

/* Liste yayınları ve veli bildirimleri
   Öğretmen, okul yönetimi veya Kardelen "Yayınla" dediğinde bir KitapListeYayin satırı açılır;
   kapsamdaki her öğrencinin her velisi için SMS ve (e-postası varsa) e-posta satırı kuyruğa yazılır,
   gönderim servisi durumları günceller. */
CREATE TABLE dbo.KitapListeYayin (
    Id                      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_KitapListeYayin PRIMARY KEY,
    KitapListeId            INT                 NOT NULL CONSTRAINT FK_ListeYayin_Liste REFERENCES dbo.KitapListe(Id),
    YayinlayanKullaniciId   INT                 NOT NULL CONSTRAINT FK_ListeYayin_Kullanici REFERENCES dbo.Kullanici(Id),
    GuncellemeMi            BIT                 NOT NULL CONSTRAINT DF_ListeYayin_Guncelleme DEFAULT (0),
    HatirlatmaMi            BIT                 NOT NULL CONSTRAINT DF_ListeYayin_Hatirlatma DEFAULT (0),  -- sipariş vermeyenlere hatırlatma (görünürlüğü değiştirmez)
    SmsGonder               BIT                 NOT NULL CONSTRAINT DF_ListeYayin_Sms DEFAULT (1),
    EpostaGonder            BIT                 NOT NULL CONSTRAINT DF_ListeYayin_Eposta DEFAULT (1),
    OgrenciSayisi           INT                 NOT NULL CONSTRAINT DF_ListeYayin_Ogrenci DEFAULT (0),
    SmsSayisi               INT                 NOT NULL CONSTRAINT DF_ListeYayin_SmsSayi DEFAULT (0),
    EpostaSayisi            INT                 NOT NULL CONSTRAINT DF_ListeYayin_EpostaSayi DEFAULT (0),
    HedefTipi               VARCHAR(10)         NOT NULL CONSTRAINT DF_ListeYayin_Hedef DEFAULT ('Toplu'),  -- bu yayında tüm sınıf mı, seçili öğrenciler mi
    Tarih                   DATETIME2(0)        NOT NULL CONSTRAINT DF_ListeYayin_Tarih DEFAULT (SYSDATETIME())
);
GO
CREATE INDEX IX_KitapListeYayin_Liste ON dbo.KitapListeYayin (KitapListeId, Tarih DESC);
GO

/* Tavsiye sepeti tek tek (seçili öğrencilere) yayınlandığında görebilen öğrenciler.
   HedefTipi = 'Secili' iken veli yalnız buradaki öğrenciler için sepeti görür; sonraki seçili yayınlar listeye ekler.
   'Toplu' yayına geçildiğinde kapsamdaki herkes görür (bu tablo geçmiş olarak kalır). */
CREATE TABLE dbo.KitapListeHedef (
    KitapListeId        INT                 NOT NULL CONSTRAINT FK_ListeHedef_Liste   REFERENCES dbo.KitapListe(Id),
    OgrenciId           INT                 NOT NULL CONSTRAINT FK_ListeHedef_Ogrenci REFERENCES dbo.Ogrenci(Id),
    EkleyenYayinId      INT                 NULL     CONSTRAINT FK_ListeHedef_Yayin   REFERENCES dbo.KitapListeYayin(Id),
    EklenmeTarihi       DATETIME2(0)        NOT NULL CONSTRAINT DF_ListeHedef_Tarih DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_KitapListeHedef PRIMARY KEY (KitapListeId, OgrenciId)
);
GO

/* Velinin sepeti açıp açmadığı (sepet detayındaki "açtı" sütunu). */
CREATE TABLE dbo.KitapListeGoruntuleme (
    KitapListeId        INT                 NOT NULL CONSTRAINT FK_ListeGor_Liste   REFERENCES dbo.KitapListe(Id),
    OgrenciId           INT                 NOT NULL CONSTRAINT FK_ListeGor_Ogrenci REFERENCES dbo.Ogrenci(Id),
    VeliId              INT                 NOT NULL CONSTRAINT FK_ListeGor_Veli    REFERENCES dbo.Veli(Id),
    IlkTarih            DATETIME2(0)        NOT NULL CONSTRAINT DF_ListeGor_Ilk DEFAULT (SYSDATETIME()),
    SonTarih            DATETIME2(0)        NOT NULL CONSTRAINT DF_ListeGor_Son DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_KitapListeGoruntuleme PRIMARY KEY (KitapListeId, OgrenciId)
);
GO

CREATE TABLE dbo.Bildirim (
    Id                  BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Bildirim PRIMARY KEY,
    KitapListeYayinId   INT                 NULL CONSTRAINT FK_Bildirim_Yayin   REFERENCES dbo.KitapListeYayin(Id),
    VeliId              INT                 NULL CONSTRAINT FK_Bildirim_Veli    REFERENCES dbo.Veli(Id),
    OgrenciId           INT                 NULL CONSTRAINT FK_Bildirim_Ogrenci REFERENCES dbo.Ogrenci(Id),
    Kanal               VARCHAR(10)         NOT NULL,
    Alici               NVARCHAR(150)       NOT NULL,          -- telefon (5xxxxxxxxx) veya e-posta
    Konu                NVARCHAR(200)       NULL,
    Metin               NVARCHAR(MAX)       NOT NULL,
    Durum               VARCHAR(10)         NOT NULL CONSTRAINT DF_Bildirim_Durum DEFAULT ('Kuyrukta'),
    DenemeSayisi        TINYINT             NOT NULL CONSTRAINT DF_Bildirim_Deneme DEFAULT (0),
    SaglayiciMesajId    NVARCHAR(100)       NULL,
    HataMesaji          NVARCHAR(500)       NULL,
    OlusturmaTarihi     DATETIME2(0)        NOT NULL CONSTRAINT DF_Bildirim_Olusturma DEFAULT (SYSDATETIME()),
    GonderimTarihi      DATETIME2(0)        NULL,
    CONSTRAINT CK_Bildirim_Kanal CHECK (Kanal IN ('SMS', 'Eposta')),
    CONSTRAINT CK_Bildirim_Durum CHECK (Durum IN ('Kuyrukta', 'Gonderildi', 'Hata'))
);
GO
CREATE INDEX IX_Bildirim_Kuyruk ON dbo.Bildirim (OlusturmaTarihi) WHERE Durum = 'Kuyrukta';
CREATE INDEX IX_Bildirim_Yayin  ON dbo.Bildirim (KitapListeYayinId);
GO

/* ---------------------------------------------------------------------
   6. SİPARİŞ
   --------------------------------------------------------------------- */

CREATE SEQUENCE dbo.SiparisNoSeq AS BIGINT START WITH 1 INCREMENT BY 1;
GO

CREATE TABLE dbo.Siparis (
    Id                      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Siparis PRIMARY KEY,
    SiparisNo               VARCHAR(20)         NOT NULL,      -- uygulama üretir: 'KO' + yıl + SiparisNoSeq
    Tip                     VARCHAR(10)         NOT NULL,      -- Veli / OkulToplu
    SezonId                 INT                 NOT NULL CONSTRAINT FK_Siparis_Sezon   REFERENCES dbo.Sezon(Id),
    OkulId                  INT                 NOT NULL CONSTRAINT FK_Siparis_Okul    REFERENCES dbo.Okul(Id),
    VeliId                  INT                 NULL CONSTRAINT FK_Siparis_Veli        REFERENCES dbo.Veli(Id),
    OgrenciId               INT                 NULL CONSTRAINT FK_Siparis_Ogrenci     REFERENCES dbo.Ogrenci(Id),
    OlusturanKullaniciId    INT                 NULL CONSTRAINT FK_Siparis_Kullanici   REFERENCES dbo.Kullanici(Id),  -- okul toplu siparişi
    Durum                   VARCHAR(20)         NOT NULL,
    OdemeTipi               VARCHAR(10)         NOT NULL,      -- Kart / Havale / CariHesap (okul)
    -- tutarlar (KDV dahil genel toplam)
    BrutTutar               DECIMAL(18,2)       NOT NULL,
    IndirimTutar            DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Siparis_Indirim DEFAULT (0),
    KdvTutar                DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Siparis_Kdv DEFAULT (0),
    TeslimatUcreti          DECIMAL(18,2)       NOT NULL CONSTRAINT DF_Siparis_Teslimat DEFAULT (0),
    GenelToplam             DECIMAL(18,2)       NOT NULL,
    -- hakediş (sipariş anındaki oran sabitlenir)
    HakedisOrani            DECIMAL(5,2)        NOT NULL CONSTRAINT DF_Siparis_HakedisOran DEFAULT (0),
    HakedisTutari           AS CAST(ROUND((GenelToplam - TeslimatUcreti) * HakedisOrani / 100, 2) AS DECIMAL(18,2)) PERSISTED,
    -- teslimat (sipariş anı kopyası)
    TeslimatTipi            VARCHAR(10)         NOT NULL,      -- Kurye / Okula / Adres
    OkulAdresId             INT                 NULL CONSTRAINT FK_Siparis_OkulAdres REFERENCES dbo.OkulAdres(Id),
    VeliAdresId             INT                 NULL CONSTRAINT FK_Siparis_VeliAdres REFERENCES dbo.VeliAdres(Id),
    TeslimatAdSoyad         NVARCHAR(150)       NULL,
    TeslimatTelefon         VARCHAR(10)         NULL,
    TeslimatIl              NVARCHAR(50)        NULL,
    TeslimatIlce            NVARCHAR(50)        NULL,
    TeslimatAdres           NVARCHAR(500)       NULL,
    -- bireysel e-Arşiv fatura alıcısı (veli siparişi)
    FaturaAdSoyad           NVARCHAR(150)       NULL,
    FaturaTckn              CHAR(11)            NULL,          -- boşsa e-Arşiv'e 11111111111 gönderilir
    FaturaAdres             NVARCHAR(500)       NULL,
    FaturaEposta            NVARCHAR(150)       NULL,
    -- havale
    HavaleReferansKodu      VARCHAR(20)         NULL,
    HavaleSonOdemeTarihi    DATETIME2(0)        NULL,          -- oluşturma + 3 gün
    -- Opak aktarımı
    OpakCariKodu            NVARCHAR(30)        NULL,          -- aktarılan cari (ana veya web alt cari)
    OpakAktarimDurumu       VARCHAR(10)         NOT NULL CONSTRAINT DF_Siparis_OpakDurum DEFAULT ('Bekliyor'),
    OpakBelgeNo             NVARCHAR(30)        NULL,
    OpakFaturaNo            NVARCHAR(30)        NULL,
    OpakAktarimTarihi       DATETIME2(0)        NULL,
    OpakHataMesaji          NVARCHAR(1000)      NULL,
    --
    Notu                    NVARCHAR(500)       NULL,
    OlusturmaTarihi         DATETIME2(0)        NOT NULL CONSTRAINT DF_Siparis_Olusturma DEFAULT (SYSDATETIME()),
    GuncellemeTarihi        DATETIME2(0)        NULL,
    IptalTarihi             DATETIME2(0)        NULL,
    IptalNedeni             NVARCHAR(300)       NULL,
    CONSTRAINT UQ_Siparis_No UNIQUE (SiparisNo),
    CONSTRAINT CK_Siparis_Tip CHECK (Tip IN ('Veli', 'OkulToplu')),
    CONSTRAINT CK_Siparis_Taraf CHECK (
           (Tip = 'Veli'      AND VeliId IS NOT NULL AND OgrenciId IS NOT NULL)
        OR (Tip = 'OkulToplu' AND OlusturanKullaniciId IS NOT NULL AND VeliId IS NULL AND OgrenciId IS NULL)
    ),
    CONSTRAINT CK_Siparis_Durum CHECK (Durum IN (
        'OdemeBekliyor', 'Odendi', 'Hazirlaniyor', 'Kuryede', 'Sevkedildi', 'TeslimEdildi', 'Iptal', 'IadeEdildi')),
    CONSTRAINT CK_Siparis_OdemeTipi CHECK (OdemeTipi IN ('Kart', 'Havale', 'CariHesap')),
    CONSTRAINT CK_Siparis_TeslimatTipi CHECK (TeslimatTipi IN ('Kurye', 'Okula', 'Adres')),
    CONSTRAINT CK_Siparis_Havale CHECK (OdemeTipi <> 'Havale' OR (HavaleReferansKodu IS NOT NULL AND HavaleSonOdemeTarihi IS NOT NULL)),
    CONSTRAINT CK_Siparis_OpakDurum CHECK (OpakAktarimDurumu IN ('Bekliyor', 'Aktarildi', 'Hata', 'Gerekmez')),
    CONSTRAINT CK_Siparis_Tckn CHECK (FaturaTckn IS NULL OR FaturaTckn LIKE '[1-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    CONSTRAINT CK_Siparis_HakedisOran CHECK (HakedisOrani BETWEEN 0 AND 100)
);
GO
CREATE UNIQUE INDEX UX_Siparis_HavaleRef   ON dbo.Siparis (HavaleReferansKodu) WHERE HavaleReferansKodu IS NOT NULL;
CREATE INDEX IX_Siparis_Okul_Sezon         ON dbo.Siparis (OkulId, SezonId, Durum) INCLUDE (GenelToplam, HakedisTutari, Tip);
CREATE INDEX IX_Siparis_Ogrenci            ON dbo.Siparis (OgrenciId, SezonId) INCLUDE (Durum) WHERE OgrenciId IS NOT NULL;
CREATE INDEX IX_Siparis_Veli               ON dbo.Siparis (VeliId) WHERE VeliId IS NOT NULL;
CREATE INDEX IX_Siparis_HavaleBekleyen     ON dbo.Siparis (HavaleSonOdemeTarihi) WHERE OdemeTipi = 'Havale' AND Durum = 'OdemeBekliyor';
CREATE INDEX IX_Siparis_OpakAktarim        ON dbo.Siparis (OpakAktarimDurumu) WHERE OpakAktarimDurumu IN ('Bekliyor', 'Hata');
GO

CREATE TABLE dbo.SiparisSatir (
    Id                  INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_SiparisSatir PRIMARY KEY,
    SiparisId           INT                 NOT NULL CONSTRAINT FK_SiparisSatir_Siparis REFERENCES dbo.Siparis(Id),
    UrunId              INT                 NOT NULL CONSTRAINT FK_SiparisSatir_Urun    REFERENCES dbo.Urun(Id),
    KitapListeSatirId   INT                 NULL CONSTRAINT FK_SiparisSatir_ListeSatir  REFERENCES dbo.KitapListeSatir(Id),
    Adet                INT                 NOT NULL,
    BirimFiyat          DECIMAL(18,2)       NOT NULL,          -- KDV dahil liste fiyatı
    IndirimOrani        DECIMAL(5,2)        NOT NULL CONSTRAINT DF_SiparisSatir_Indirim DEFAULT (0),
    KdvOrani            DECIMAL(5,2)        NOT NULL CONSTRAINT DF_SiparisSatir_Kdv DEFAULT (0),
    SatirToplam         AS CAST(ROUND(Adet * BirimFiyat * (100 - IndirimOrani) / 100, 2) AS DECIMAL(18,2)) PERSISTED,
    CONSTRAINT CK_SiparisSatir_Adet CHECK (Adet > 0),
    CONSTRAINT CK_SiparisSatir_Indirim CHECK (IndirimOrani BETWEEN 0 AND 100)
);
GO
CREATE INDEX IX_SiparisSatir_Siparis ON dbo.SiparisSatir (SiparisId);
GO

CREATE TABLE dbo.TopluSiparisDagitim (                         -- idarenin toplu alımı hangi öğrenciye gidiyor
    Id          INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_TopluSiparisDagitim PRIMARY KEY,
    SiparisId   INT                 NOT NULL CONSTRAINT FK_TopluDagitim_Siparis REFERENCES dbo.Siparis(Id),
    OgrenciId   INT                 NOT NULL CONSTRAINT FK_TopluDagitim_Ogrenci REFERENCES dbo.Ogrenci(Id),
    UrunId      INT                 NULL CONSTRAINT FK_TopluDagitim_Urun        REFERENCES dbo.Urun(Id),  -- NULL = siparişin tamamı
    Adet        INT                 NOT NULL CONSTRAINT DF_TopluDagitim_Adet DEFAULT (1),
    CONSTRAINT CK_TopluDagitim_Adet CHECK (Adet > 0)
);
GO
CREATE UNIQUE INDEX UX_TopluDagitim ON dbo.TopluSiparisDagitim (SiparisId, OgrenciId, UrunId);
CREATE INDEX IX_TopluDagitim_Ogrenci ON dbo.TopluSiparisDagitim (OgrenciId);
GO

CREATE TABLE dbo.SiparisDurumHareket (                         -- durum geçmişi (veli takip ekranı + denetim)
    Id              BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SiparisDurumHareket PRIMARY KEY,
    SiparisId       INT                 NOT NULL CONSTRAINT FK_SiparisDurum_Siparis REFERENCES dbo.Siparis(Id),
    EskiDurum       VARCHAR(20)         NULL,
    YeniDurum       VARCHAR(20)         NOT NULL,
    Aciklama        NVARCHAR(300)       NULL,
    KullaniciId     INT                 NULL CONSTRAINT FK_SiparisDurum_Kullanici REFERENCES dbo.Kullanici(Id),  -- NULL = sistem
    Tarih           DATETIME2(0)        NOT NULL CONSTRAINT DF_SiparisDurum_Tarih DEFAULT (SYSDATETIME())
);
GO
CREATE INDEX IX_SiparisDurumHareket_Siparis ON dbo.SiparisDurumHareket (SiparisId, Tarih);
GO

/* ---------------------------------------------------------------------
   7. ÖDEME / SANAL POS / HAVALE
   --------------------------------------------------------------------- */

CREATE TABLE dbo.SanalPos (                                    -- anahtar/şifreler burada DEĞİL, sunucu yapılandırmasında
    Id              INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_SanalPos PRIMARY KEY,
    Kod             VARCHAR(20)         NOT NULL,              -- YAPIKREDI / DENIZBANK / ZIRAATPAY
    Ad              NVARCHAR(100)       NOT NULL,
    TestModu        BIT                 NOT NULL CONSTRAINT DF_SanalPos_Test DEFAULT (1),
    AktifMi         BIT                 NOT NULL CONSTRAINT DF_SanalPos_Aktif DEFAULT (1),
    CONSTRAINT UQ_SanalPos_Kod UNIQUE (Kod)
);
GO

/* Kart → POS yönlendirme kuralları. Öncelik küçükten büyüğe denenir, ilk eşleşen kazanır.
   Örnek: (10) tek çekim → Yapı Kredi; (20) World kartlar taksit → Yapı Kredi; (100) diğer hepsi → ZiraatPay */
CREATE TABLE dbo.PosYonlendirmeKurali (
    Id              INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_PosYonlendirmeKurali PRIMARY KEY,
    Oncelik         INT                 NOT NULL,
    Ad              NVARCHAR(100)       NOT NULL,
    TaksitMin       TINYINT             NULL,                  -- NULL = sınır yok
    TaksitMax       TINYINT             NULL,
    KartBankasi     NVARCHAR(50)        NULL,                  -- BIN'den çözülen banka; NULL = hepsi
    KartAilesi      NVARCHAR(30)        NULL,                  -- World, Bonus, Maximum, Axess, ...
    KartTipi        VARCHAR(10)         NULL,                  -- Kredi / Banka / NULL
    SanalPosId      INT                 NOT NULL CONSTRAINT FK_PosKural_SanalPos REFERENCES dbo.SanalPos(Id),
    AktifMi         BIT                 NOT NULL CONSTRAINT DF_PosKural_Aktif DEFAULT (1),
    CONSTRAINT UQ_PosKural_Oncelik UNIQUE (Oncelik),
    CONSTRAINT CK_PosKural_KartTipi CHECK (KartTipi IS NULL OR KartTipi IN ('Kredi', 'Banka')),
    CONSTRAINT CK_PosKural_Taksit CHECK (TaksitMin IS NULL OR TaksitMax IS NULL OR TaksitMax >= TaksitMin)
);
GO

CREATE TABLE dbo.TaksitSecenegi (                              -- POS + kart ailesine göre sunulan taksitler
    Id              INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_TaksitSecenegi PRIMARY KEY,
    SanalPosId      INT                 NOT NULL CONSTRAINT FK_Taksit_SanalPos REFERENCES dbo.SanalPos(Id),
    KartAilesi      NVARCHAR(30)        NULL,                  -- NULL = tüm kartlar
    TaksitSayisi    TINYINT             NOT NULL,
    VadeFarkiOrani  DECIMAL(5,2)        NOT NULL CONSTRAINT DF_Taksit_VadeFarki DEFAULT (0),
    AktifMi         BIT                 NOT NULL CONSTRAINT DF_Taksit_Aktif DEFAULT (1),
    CONSTRAINT CK_Taksit_Sayi CHECK (TaksitSayisi BETWEEN 1 AND 12)
);
GO
CREATE UNIQUE INDEX UX_TaksitSecenegi ON dbo.TaksitSecenegi (SanalPosId, KartAilesi, TaksitSayisi);
GO

CREATE TABLE dbo.BankaHesabi (                                 -- havale ekranında gösterilecek IBAN'lar
    Id          INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_BankaHesabi PRIMARY KEY,
    Banka       NVARCHAR(100)       NOT NULL,
    HesapAdi    NVARCHAR(200)       NOT NULL,
    Iban        VARCHAR(34)         NOT NULL,
    Sira        INT                 NOT NULL CONSTRAINT DF_BankaHesabi_Sira DEFAULT (0),
    AktifMi     BIT                 NOT NULL CONSTRAINT DF_BankaHesabi_Aktif DEFAULT (1),
    CONSTRAINT UQ_BankaHesabi_Iban UNIQUE (Iban),
    CONSTRAINT CK_BankaHesabi_Iban CHECK (Iban LIKE 'TR%')
);
GO

CREATE TABLE dbo.Odeme (
    Id                  INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Odeme PRIMARY KEY,
    SiparisId           INT                 NOT NULL CONSTRAINT FK_Odeme_Siparis REFERENCES dbo.Siparis(Id),
    Tip                 VARCHAR(10)         NOT NULL,          -- Kart / Havale
    Tutar               DECIMAL(18,2)       NOT NULL,
    Durum               VARCHAR(10)         NOT NULL,          -- Bekliyor / Basarili / Basarisiz / Iade
    -- kart
    SanalPosId          INT                 NULL CONSTRAINT FK_Odeme_SanalPos REFERENCES dbo.SanalPos(Id),
    PosKuraliId         INT                 NULL CONSTRAINT FK_Odeme_PosKural REFERENCES dbo.PosYonlendirmeKurali(Id),
    TaksitSayisi        TINYINT             NULL,
    KartBin             VARCHAR(8)          NULL,              -- yalnız BIN
    KartSonDort         CHAR(4)             NULL,              -- yalnız son 4 hane
    KartBankasi         NVARCHAR(50)        NULL,
    PosIslemNo          NVARCHAR(100)       NULL,
    PosYanitKodu        NVARCHAR(20)        NULL,
    PosYanitMesaji      NVARCHAR(500)       NULL,
    -- havale
    BankaHesabiId       INT                 NULL CONSTRAINT FK_Odeme_BankaHesabi REFERENCES dbo.BankaHesabi(Id),
    HavaleGonderen      NVARCHAR(150)       NULL,
    OnaylayanKullaniciId INT                NULL CONSTRAINT FK_Odeme_Onaylayan REFERENCES dbo.Kullanici(Id),
    OnayTarihi          DATETIME2(0)        NULL,
    -- Opak
    OpakTahsilatNo      NVARCHAR(30)        NULL,
    OlusturmaTarihi     DATETIME2(0)        NOT NULL CONSTRAINT DF_Odeme_Olusturma DEFAULT (SYSDATETIME()),
    CONSTRAINT CK_Odeme_Tip CHECK (Tip IN ('Kart', 'Havale')),
    CONSTRAINT CK_Odeme_Durum CHECK (Durum IN ('Bekliyor', 'Basarili', 'Basarisiz', 'Iade')),
    CONSTRAINT CK_Odeme_Kart CHECK (Tip <> 'Kart' OR SanalPosId IS NOT NULL),
    CONSTRAINT CK_Odeme_Tutar CHECK (Tutar > 0)
);
GO
CREATE INDEX IX_Odeme_Siparis ON dbo.Odeme (SiparisId);
GO

/* ---------------------------------------------------------------------
   8. KURYE (firmadan bağımsız)
   --------------------------------------------------------------------- */

CREATE TABLE dbo.KuryeFirma (
    Id                  INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_KuryeFirma PRIMARY KEY,
    Kod                 VARCHAR(20)         NOT NULL,          -- uygulamadaki entegrasyon sürücüsünün adı
    Ad                  NVARCHAR(100)       NOT NULL,
    EntegrasyonTipi     VARCHAR(10)         NOT NULL CONSTRAINT DF_KuryeFirma_Entegrasyon DEFAULT ('Manuel'),
    AktifMi             BIT                 NOT NULL CONSTRAINT DF_KuryeFirma_Aktif DEFAULT (1),
    CONSTRAINT UQ_KuryeFirma_Kod UNIQUE (Kod),
    CONSTRAINT CK_KuryeFirma_Entegrasyon CHECK (EntegrasyonTipi IN ('Api', 'Manuel'))
);
GO

CREATE TABLE dbo.KuryeBolge (                                  -- hizmet bölgesi + ücret
    Id              INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_KuryeBolge PRIMARY KEY,
    KuryeFirmaId    INT                 NULL CONSTRAINT FK_KuryeBolge_Firma REFERENCES dbo.KuryeFirma(Id),  -- NULL = tüm firmalar
    Il              NVARCHAR(50)        NOT NULL,
    Ilce            NVARCHAR(50)        NOT NULL,
    Mahalle         NVARCHAR(100)       NULL,                  -- NULL = ilçenin tamamı
    Ucret           DECIMAL(18,2)       NOT NULL,              -- veliye yansıyan teslimat ücreti
    UcretsizLimit   DECIMAL(18,2)       NULL,                  -- bu tutar üstü ücretsiz
    AktifMi         BIT                 NOT NULL CONSTRAINT DF_KuryeBolge_Aktif DEFAULT (1)
);
GO
CREATE INDEX IX_KuryeBolge_Konum ON dbo.KuryeBolge (Il, Ilce, Mahalle);
GO

CREATE TABLE dbo.Gonderi (
    Id                  INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_Gonderi PRIMARY KEY,
    SiparisId           INT                 NOT NULL CONSTRAINT FK_Gonderi_Siparis REFERENCES dbo.Siparis(Id),
    KuryeFirmaId        INT                 NULL CONSTRAINT FK_Gonderi_KuryeFirma REFERENCES dbo.KuryeFirma(Id),
    Durum               VARCHAR(20)         NOT NULL CONSTRAINT DF_Gonderi_Durum DEFAULT ('Olusturuldu'),
    DisTakipNo          NVARCHAR(100)       NULL,              -- kurye firmasının gönderi no
    KuryeAdi            NVARCHAR(100)       NULL,
    KuryeTelefon        VARCHAR(10)         NULL,
    Maliyet             DECIMAL(18,2)       NULL,              -- firmaya ödenen
    OlusturmaTarihi     DATETIME2(0)        NOT NULL CONSTRAINT DF_Gonderi_Olusturma DEFAULT (SYSDATETIME()),
    TeslimTarihi        DATETIME2(0)        NULL,
    TeslimAlan          NVARCHAR(150)       NULL,
    DisSistemYaniti     NVARCHAR(MAX)       NULL,              -- son API yanıtı (hata ayıklama)
    CONSTRAINT CK_Gonderi_Durum CHECK (Durum IN (
        'Olusturuldu', 'KuryeAtandi', 'Yolda', 'TeslimEdildi', 'TeslimEdilemedi', 'Iptal'))
);
GO
CREATE INDEX IX_Gonderi_Siparis ON dbo.Gonderi (SiparisId);
GO

CREATE TABLE dbo.GonderiHareket (
    Id          BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_GonderiHareket PRIMARY KEY,
    GonderiId   INT                 NOT NULL CONSTRAINT FK_GonderiHareket_Gonderi REFERENCES dbo.Gonderi(Id),
    Durum       VARCHAR(20)         NOT NULL,
    Aciklama    NVARCHAR(300)       NULL,
    Tarih       DATETIME2(0)        NOT NULL CONSTRAINT DF_GonderiHareket_Tarih DEFAULT (SYSDATETIME())
);
GO
CREATE INDEX IX_GonderiHareket_Gonderi ON dbo.GonderiHareket (GonderiId, Tarih);
GO

/* ---------------------------------------------------------------------
   9. HAKEDİŞ (okul bazlı %, KDV dahil tutar üzerinden, sezon sonu ödeme)
   --------------------------------------------------------------------- */

CREATE TABLE dbo.HakedisTanim (
    Id                      INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_HakedisTanim PRIMARY KEY,
    OkulId                  INT                 NOT NULL CONSTRAINT FK_HakedisTanim_Okul REFERENCES dbo.Okul(Id),
    Oran                    DECIMAL(5,2)        NOT NULL,
    BaslangicTarihi         DATE                NOT NULL,
    BitisTarihi             DATE                NULL,          -- NULL = açık uçlu
    VeliSatislarinaUygula   BIT                 NOT NULL CONSTRAINT DF_HakedisTanim_Veli DEFAULT (1),
    TopluAlimaUygula        BIT                 NOT NULL CONSTRAINT DF_HakedisTanim_Toplu DEFAULT (0),
    Aciklama                NVARCHAR(300)       NULL,
    OlusturanKullaniciId    INT                 NOT NULL CONSTRAINT FK_HakedisTanim_Kullanici REFERENCES dbo.Kullanici(Id),
    OlusturmaTarihi         DATETIME2(0)        NOT NULL CONSTRAINT DF_HakedisTanim_Olusturma DEFAULT (SYSDATETIME()),
    CONSTRAINT CK_HakedisTanim_Oran CHECK (Oran BETWEEN 0 AND 100),
    CONSTRAINT CK_HakedisTanim_Tarih CHECK (BitisTarihi IS NULL OR BitisTarihi >= BaslangicTarihi)
);
GO
CREATE INDEX IX_HakedisTanim_Okul ON dbo.HakedisTanim (OkulId, BaslangicTarihi);
GO

CREATE TABLE dbo.HakedisDonem (                                -- sezon sonu kesinleşen hakediş
    Id                  INT IDENTITY(1,1)   NOT NULL CONSTRAINT PK_HakedisDonem PRIMARY KEY,
    OkulId              INT                 NOT NULL CONSTRAINT FK_HakedisDonem_Okul  REFERENCES dbo.Okul(Id),
    SezonId             INT                 NOT NULL CONSTRAINT FK_HakedisDonem_Sezon REFERENCES dbo.Sezon(Id),
    SatisToplami        DECIMAL(18,2)       NOT NULL,          -- KDV dahil, iptal/iade hariç
    HakedisTutari       DECIMAL(18,2)       NOT NULL,
    OdemeTarihi         DATE                NOT NULL,
    Durum               VARCHAR(10)         NOT NULL CONSTRAINT DF_HakedisDonem_Durum DEFAULT ('Hesaplandi'),
    OdenenTutar         DECIMAL(18,2)       NOT NULL CONSTRAINT DF_HakedisDonem_Odenen DEFAULT (0),
    OdemeAciklama       NVARCHAR(300)       NULL,
    OnaylayanKullaniciId INT                NULL CONSTRAINT FK_HakedisDonem_Kullanici REFERENCES dbo.Kullanici(Id),
    CONSTRAINT UQ_HakedisDonem UNIQUE (OkulId, SezonId),
    CONSTRAINT CK_HakedisDonem_Durum CHECK (Durum IN ('Hesaplandi', 'Onaylandi', 'Odendi'))
);
GO

/* ---------------------------------------------------------------------
   10. GÖRÜNÜMLER (raporlar)
   --------------------------------------------------------------------- */

/* Öğrenci tedarik durumu: okul paneli + öğretmen ekranı + "almayanlar" Excel'i
   Öncelik: okul alımı > teslim edildi > kuryede/sevk > hazırlanıyor > ödendi > ödeme bekliyor > almadı */
CREATE VIEW dbo.vw_OgrenciTedarikDurumu
AS
SELECT
    os.SezonId,
    o.OkulId,
    sn.Id           AS SinifId,
    sn.Seviye,
    sb.Id           AS SubeId,
    sb.Ad           AS SubeAd,
    o.Id            AS OgrenciId,
    o.OkulNo,
    o.Ad,
    o.Soyad,
    CASE
        WHEN toplu.OgrenciId IS NOT NULL         THEN 'AldiOkulAlimi'
        WHEN vs.EnIyiDurum = 7                   THEN 'TeslimEdildi'
        WHEN vs.EnIyiDurum = 6                   THEN 'Kuryede'
        WHEN vs.EnIyiDurum = 5                   THEN 'Hazirlaniyor'
        WHEN vs.EnIyiDurum = 4                   THEN 'Odendi'
        WHEN vs.EnIyiDurum = 3                   THEN 'OdemeBekliyor'
        ELSE                                          'Almadi'
    END AS TedarikDurumu,
    vs.SonSiparisTarihi
FROM dbo.OgrenciSezon os
JOIN dbo.Ogrenci  o  ON o.Id  = os.OgrenciId
JOIN dbo.Sube     sb ON sb.Id = os.SubeId
JOIN dbo.Sinif    sn ON sn.Id = sb.SinifId
OUTER APPLY (
    SELECT TOP (1) d.OgrenciId
    FROM dbo.TopluSiparisDagitim d
    JOIN dbo.Siparis s ON s.Id = d.SiparisId
    WHERE d.OgrenciId = o.Id
      AND s.SezonId   = os.SezonId
      AND s.Durum NOT IN ('Iptal', 'IadeEdildi')
) toplu
OUTER APPLY (
    SELECT
        MAX(CASE s.Durum
                WHEN 'TeslimEdildi'  THEN 7
                WHEN 'Kuryede'       THEN 6
                WHEN 'Sevkedildi'    THEN 6
                WHEN 'Hazirlaniyor'  THEN 5
                WHEN 'Odendi'        THEN 4
                WHEN 'OdemeBekliyor' THEN 3
            END)              AS EnIyiDurum,
        MAX(s.OlusturmaTarihi) AS SonSiparisTarihi
    FROM dbo.Siparis s
    WHERE s.OgrenciId = o.Id
      AND s.SezonId   = os.SezonId
      AND s.Tip       = 'Veli'
      AND s.Durum NOT IN ('Iptal', 'IadeEdildi')
) vs
WHERE o.AktifMi = 1;
GO

/* Hakediş dökümü (sipariş bazlı). Ödeme beklemeyen, iptal/iade olmayan siparişler sayılır. */
CREATE VIEW dbo.vw_HakedisSiparis
AS
SELECT
    s.OkulId,
    s.SezonId,
    s.Id            AS SiparisId,
    s.SiparisNo,
    s.Tip,
    s.OgrenciId,
    s.OlusturmaTarihi,
    s.GenelToplam - s.TeslimatUcreti AS HakedisTabani,   -- KDV dahil, teslimat ücreti hariç
    s.HakedisOrani,
    s.HakedisTutari
FROM dbo.Siparis s
WHERE s.Durum NOT IN ('OdemeBekliyor', 'Iptal', 'IadeEdildi');
GO

/* Okul × sezon özet (okul paneli gösterge) */
CREATE VIEW dbo.vw_OkulSezonOzet
AS
SELECT
    s.OkulId,
    s.SezonId,
    COUNT(*)                                                   AS SiparisSayisi,
    SUM(CASE WHEN s.Tip = 'Veli'      THEN 1 ELSE 0 END)       AS VeliSiparisSayisi,
    SUM(CASE WHEN s.Tip = 'OkulToplu' THEN 1 ELSE 0 END)       AS TopluSiparisSayisi,
    SUM(s.GenelToplam)                                         AS SatisToplami,
    SUM(s.HakedisTutari)                                       AS HakedisToplami
FROM dbo.Siparis s
WHERE s.Durum NOT IN ('OdemeBekliyor', 'Iptal', 'IadeEdildi')
GROUP BY s.OkulId, s.SezonId;
GO

/* Depo ihtiyaç raporu: okul × ürün */
CREATE VIEW dbo.vw_UrunIhtiyac
AS
SELECT
    s.SezonId,
    s.OkulId,
    ss.UrunId,
    u.OpakStokKodu,
    u.Ad            AS UrunAd,
    SUM(ss.Adet)    AS ToplamAdet,
    SUM(CASE WHEN s.Durum IN ('Odendi', 'Hazirlaniyor') THEN ss.Adet ELSE 0 END) AS HazirlanacakAdet
FROM dbo.Siparis s
JOIN dbo.SiparisSatir ss ON ss.SiparisId = s.Id
JOIN dbo.Urun u          ON u.Id = ss.UrunId
WHERE s.Durum NOT IN ('OdemeBekliyor', 'Iptal', 'IadeEdildi')
GROUP BY s.SezonId, s.OkulId, ss.UrunId, u.OpakStokKodu, u.Ad;
GO

/* ---------------------------------------------------------------------
   11. PROSEDÜRLER
   --------------------------------------------------------------------- */

/* Havale süresi dolan siparişleri kapatır. SQL Agent job ile saatlik çalıştırılır. */
CREATE PROCEDURE dbo.sp_HavaleSuresiDolanlariKapat
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Kapatilan TABLE (SiparisId INT);

    UPDATE dbo.Siparis
       SET Durum            = 'Iptal',
           IptalTarihi      = SYSDATETIME(),
           IptalNedeni      = N'Havale süresi doldu',
           GuncellemeTarihi = SYSDATETIME(),
           OpakAktarimDurumu = CASE WHEN OpakAktarimDurumu = 'Bekliyor' THEN 'Gerekmez' ELSE OpakAktarimDurumu END
    OUTPUT inserted.Id INTO @Kapatilan
     WHERE OdemeTipi = 'Havale'
       AND Durum     = 'OdemeBekliyor'
       AND HavaleSonOdemeTarihi < SYSDATETIME();

    INSERT INTO dbo.SiparisDurumHareket (SiparisId, EskiDurum, YeniDurum, Aciklama)
    SELECT SiparisId, 'OdemeBekliyor', 'Iptal', N'Havale süresi doldu (otomatik)'
    FROM @Kapatilan;

    SELECT COUNT(*) AS KapatilanSiparisSayisi FROM @Kapatilan;
END
GO

/* Sipariş anında geçerli hakediş oranı */
CREATE FUNCTION dbo.fn_HakedisOrani (@OkulId INT, @Tarih DATE, @SiparisTipi VARCHAR(10))
RETURNS DECIMAL(5,2)
AS
BEGIN
    DECLARE @Oran DECIMAL(5,2);
    SELECT TOP (1) @Oran = h.Oran
    FROM dbo.HakedisTanim h
    WHERE h.OkulId = @OkulId
      AND h.BaslangicTarihi <= @Tarih
      AND (h.BitisTarihi IS NULL OR h.BitisTarihi >= @Tarih)
      AND ((@SiparisTipi = 'Veli' AND h.VeliSatislarinaUygula = 1)
        OR (@SiparisTipi = 'OkulToplu' AND h.TopluAlimaUygula = 1))
    ORDER BY h.BaslangicTarihi DESC;
    RETURN ISNULL(@Oran, 0);
END
GO

/* Sezon sonu hakediş dönemini hesaplar / yeniden hesaplar (Onaylandi/Odendi olanlara dokunmaz) */
CREATE PROCEDURE dbo.sp_HakedisDonemHesapla
    @SezonId INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OdemeTarihi DATE = (SELECT HakedisOdemeTarihi FROM dbo.Sezon WHERE Id = @SezonId);
    IF @OdemeTarihi IS NULL
    BEGIN
        RAISERROR(N'Sezon için HakedisOdemeTarihi tanımlı değil.', 16, 1);
        RETURN;
    END

    MERGE dbo.HakedisDonem AS hedef
    USING (
        SELECT OkulId, SezonId, SUM(HakedisTabani) AS SatisToplami, SUM(HakedisTutari) AS HakedisTutari
        FROM dbo.vw_HakedisSiparis
        WHERE SezonId = @SezonId
        GROUP BY OkulId, SezonId
    ) AS kaynak
    ON hedef.OkulId = kaynak.OkulId AND hedef.SezonId = kaynak.SezonId
    WHEN MATCHED AND hedef.Durum = 'Hesaplandi' THEN
        UPDATE SET SatisToplami = kaynak.SatisToplami,
                   HakedisTutari = kaynak.HakedisTutari,
                   OdemeTarihi   = @OdemeTarihi
    WHEN NOT MATCHED THEN
        INSERT (OkulId, SezonId, SatisToplami, HakedisTutari, OdemeTarihi)
        VALUES (kaynak.OkulId, kaynak.SezonId, kaynak.SatisToplami, kaynak.HakedisTutari, @OdemeTarihi);
END
GO

/* ---------------------------------------------------------------------
   12. BAŞLANGIÇ VERİLERİ
   --------------------------------------------------------------------- */

INSERT INTO dbo.Ayar (Anahtar, Deger, Aciklama) VALUES
 ('HavaleSureGun',          N'3',   N'Havale ödemesi bu kadar gün içinde gelmezse sipariş kapatılır'),
 ('SmsKodGecerlilikDakika', N'5',   N'SMS doğrulama kodunun geçerlilik süresi'),
 ('SmsKodMaxDeneme',        N'5',   N'Bir kod için en fazla deneme'),
 ('GirisMaxBasarisiz',      N'5',   N'Bu kadar hatalı girişten sonra hesap geçici kilitlenir'),
 ('GirisKilitDakika',       N'15',  N'Geçici kilit süresi'),
 ('VarsayilanTckn',         N'11111111111', N'TCKN girilmeyen bireysel e-Arşiv faturaları için');
GO

INSERT INTO dbo.SanalPos (Kod, Ad) VALUES
 ('YAPIKREDI', N'Yapı Kredi Sanal POS'),
 ('DENIZBANK', N'DenizBank Sanal POS'),
 ('ZIRAATPAY', N'ZiraatPay');
GO

/* Örnek yönlendirme: tek çekim → Yapı Kredi, diğer her şey → ZiraatPay (yönetim ekranından değiştirilir) */
INSERT INTO dbo.PosYonlendirmeKurali (Oncelik, Ad, TaksitMin, TaksitMax, SanalPosId)
SELECT 10,  N'Tek çekim → Yapı Kredi', 1, 1, Id FROM dbo.SanalPos WHERE Kod = 'YAPIKREDI';
INSERT INTO dbo.PosYonlendirmeKurali (Oncelik, Ad, SanalPosId)
SELECT 100, N'Diğer tüm kartlar → ZiraatPay', Id FROM dbo.SanalPos WHERE Kod = 'ZIRAATPAY';
GO
