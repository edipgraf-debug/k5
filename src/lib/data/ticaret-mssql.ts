import 'server-only';
import sql from 'mssql';
import { AKTIF_SEZON, havuz, q, type Param } from './mssql';
import { KayitHatasi } from './yonetim';
import { katla, sqlKatla } from '../katla';
import type {
  BankaHesabiGirdi, BankaHesabiKaydi, BildirimFiltresi, HakedisDurumu, HakedisTanimKaydi, KampanyaGirdi, KampanyaGonderimi, KampanyaKaydi, KategoriGirdi, KategoriKaydi, BildirimLogSatiri, GirisFiltresi, GirisGirdi, GirisSatiri, KargoBolgeGirdi,
  KargoBolgeKaydi, KargoFirmaGirdi, KargoFirmaKaydi, PosKaydi, PosKurali, PosKuraliGirdi, SayfaGirdi, SayfaKaydi, SetGirdi, SetKaydi,
  TahsilatFiltresi, TahsilatSatiri, TaksitKaydi, TerkFiltresi, TerkSepet, TicaretRepo, UrunFiltresi, UrunGuncelleme, UrunKaydi, VeliSepetSatiri,
} from './ticaret';

const idler = (l: number[]) => l.join(',') || '0';
const sayi = (v: unknown) => (v == null ? null : Number(v));

async function benzersiz<T>(f: () => Promise<T>, mesajlar: Record<string, string>): Promise<T> {
  try {
    return await f();
  } catch (e) {
    const no = (e as { number?: number }).number;
    if (no === 2601 || no === 2627) {
      const m = String((e as Error).message);
      for (const [k, mesaj] of Object.entries(mesajlar)) if (m.includes(k)) throw new KayitHatasi(mesaj);
      throw new KayitHatasi('Bu bilgilerle başka bir kayıt var');
    }
    throw e;
  }
}

async function islem<T>(f: (tx: sql.Transaction) => Promise<T>): Promise<T> {
  const tx = new sql.Transaction(await havuz());
  await tx.begin();
  try {
    const r = await f(tx);
    await tx.commit();
    return r;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

interface UrunDb { Id: number; OpakStokKodu: string; Barkod: string | null; Ad: string; Yayinevi: string | null; Yazar: string | null; Kategori: string | null;
  ListeFiyati: number; WebFiyati: number | null; Aciklama: string | null; KapakDosya: string | null; AktifMi: boolean; SetSayisi: number; ListeSayisi: number;
  GuncellemeTarihi: Date | null; SonSenkronTarihi: Date | null; StokMiktari: number | null; StokTarihi: Date | null; Kategoriler: string | null }
const URUN_SEC = `SELECT u.Id, u.OpakStokKodu, u.Barkod, u.Ad, u.Yayinevi, u.Yazar, u.Kategori, u.ListeFiyati, u.WebFiyati, u.Aciklama, u.KapakDosya, u.AktifMi,
  u.GuncellemeTarihi, u.SonSenkronTarihi, u.StokMiktari, u.StokTarihi,
  (SELECT STRING_AGG(CAST(uk.KategoriId AS VARCHAR(10)), ',') FROM dbo.UrunKategori uk WHERE uk.UrunId = u.Id) AS Kategoriler,
  (SELECT COUNT(*) FROM dbo.UrunSetSatir ss WHERE ss.UrunId = u.Id) AS SetSayisi,
  (SELECT COUNT(DISTINCT ks.KitapListeId) FROM dbo.KitapListeSatir ks JOIN dbo.KitapListe kl ON kl.Id = ks.KitapListeId
    WHERE ks.UrunId = u.Id AND kl.SezonId = ${AKTIF_SEZON}) AS ListeSayisi
  FROM dbo.Urun u`;
const urunMap = (u: UrunDb): UrunKaydi => ({
  id: u.Id, opakStokKodu: u.OpakStokKodu, barkod: u.Barkod, ad: u.Ad, yayinevi: u.Yayinevi, yazar: u.Yazar, kategori: u.Kategori,
  listeFiyati: Number(u.ListeFiyati), webFiyati: sayi(u.WebFiyati), fiyat: Number(u.WebFiyati ?? u.ListeFiyati), aciklama: u.Aciklama, kapakDosya: u.KapakDosya,
  aktif: !!u.AktifMi, stok: u.StokMiktari, stokTarihi: u.StokTarihi, kategoriIdleri: u.Kategoriler ? u.Kategoriler.split(',').map(Number) : [], setSayisi: u.SetSayisi, listeSayisi: u.ListeSayisi, guncelleme: u.GuncellemeTarihi, senkron: u.SonSenkronTarihi,
});

/** @kid kategorisi ve tüm alt kategorileri (özyinelemeli) */
const KATEGORI_CTE = `WITH agac AS (SELECT Id FROM dbo.Kategori WHERE Id = @kid UNION ALL SELECT k.Id FROM dbo.Kategori k JOIN agac a ON k.UstId = a.Id)`;
const tarihMetni = (d: Date | string | null) => (d == null ? null : typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10));

interface SetDb { Id: number; Barkod: string; Ad: string; Aciklama: string | null; Fiyat: number | null; AktifMi: boolean; OlusturmaTarihi: Date;
  GuncellemeTarihi: Date | null; ListeSayisi: number }

export class MssqlTicaretRepo implements TicaretRepo {
  // ---------- kategori ----------
  async kategoriler(pasifDahil = true): Promise<KategoriKaydi[]> {
    const r = await q<{ Id: number; UstId: number | null; Ad: string; Slug: string; Sira: number; AktifMi: boolean }>(
      `SELECT Id, UstId, Ad, Slug, Sira, AktifMi FROM dbo.Kategori WHERE @p = 1 OR AktifMi = 1 ORDER BY Sira, Ad`, [['p', sql.Bit, pasifDahil]]);
    const uk = await q<{ KategoriId: number; UrunId: number }>(`SELECT KategoriId, UrunId FROM dbo.UrunKategori`);
    const alt = (id: number) => { const o = [id]; for (let i = 0; i < o.length; i++) for (const k of r) if (k.UstId === o[i]) o.push(k.Id); return o; };
    return r.map((k) => {
      const a = alt(k.Id);
      return { id: k.Id, ustId: k.UstId, ad: k.Ad, slug: k.Slug, sira: k.Sira, aktif: !!k.AktifMi, urunSayisi: new Set(uk.filter((x) => a.includes(x.KategoriId)).map((x) => x.UrunId)).size };
    });
  }
  async kategoriKaydet(id: number | null, g: KategoriGirdi) {
    const p: Param[] = [['u', sql.Int, g.ustId], ['ad', sql.NVarChar(150), g.ad], ['s', sql.VarChar(160), g.slug], ['si', sql.Int, g.sira], ['a', sql.Bit, g.aktif]];
    const hata = { UQ_Kategori_Slug: 'Bu adres (slug) başka bir kategoride kullanılıyor' };
    if (id) {
      if (g.ustId) {
        const dongu = await q<{ N: number }>(`${KATEGORI_CTE.replace('@kid', '@id')} SELECT COUNT(*) AS N FROM agac WHERE Id = @u`, [['id', sql.Int, id], ['u', sql.Int, g.ustId]]);
        if (dongu[0].N) throw new KayitHatasi('Kategori kendi alt kategorisinin altına taşınamaz');
      }
      await benzersiz(() => q(`UPDATE dbo.Kategori SET UstId = @u, Ad = @ad, Slug = @s, Sira = @si, AktifMi = @a WHERE Id = @id`, [...p, ['id', sql.Int, id]]), hata);
      return id;
    }
    return (await benzersiz(() => q<{ Id: number }>(`INSERT INTO dbo.Kategori (UstId, Ad, Slug, Sira, AktifMi) OUTPUT inserted.Id VALUES (@u, @ad, @s, @si, @a)`, p), hata))[0].Id;
  }
  async kategoriSil(id: number) {
    const alt = await q<{ N: number }>(`SELECT COUNT(*) AS N FROM dbo.Kategori WHERE UstId = @id`, [['id', sql.Int, id]]);
    if (alt[0].N) throw new KayitHatasi('Önce alt kategorileri silin ya da taşıyın');
    await q(`DELETE FROM dbo.Kategori WHERE Id = @id`, [['id', sql.Int, id]]);   // UrunKategori ON DELETE CASCADE
  }
  async kategoriyeEkle(kategoriId: number, urunIdleri: number[]) {
    const r = await q<{ N: number }>(`INSERT INTO dbo.UrunKategori (KategoriId, UrunId)
      SELECT @k, u.Id FROM dbo.Urun u WHERE u.Id IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))
        AND NOT EXISTS (SELECT 1 FROM dbo.UrunKategori x WHERE x.KategoriId = @k AND x.UrunId = u.Id);
      SELECT @@ROWCOUNT AS N;`, [['k', sql.Int, kategoriId], ['ids', sql.NVarChar(sql.MAX), idler(urunIdleri)]]);
    return r[0]?.N ?? 0;
  }
  async kategoridenCikar(kategoriId: number, urunIdleri: number[]) {
    await q(`DELETE FROM dbo.UrunKategori WHERE KategoriId = @k AND UrunId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`,
      [['k', sql.Int, kategoriId], ['ids', sql.NVarChar(sql.MAX), idler(urunIdleri)]]);
  }

  // ---------- kampanya ----------
  private async kampanyaTamamla(r: { Id: number; Ad: string; Aciklama: string | null; BaslangicTarihi: Date | string; BitisTarihi: Date | string;
    IndirimOrani: number | null; AktifMi: boolean; Yayinda: number; OlusturmaTarihi: Date; Gonderim: number; SonGonderim: Date | null }[]): Promise<KampanyaKaydi[]> {
    if (!r.length) return [];
    const u = await q<{ KampanyaId: number; UrunId: number; Ad: string; Barkod: string | null; Yayinevi: string | null; Normal: number; Ozel: number | null; StokMiktari: number | null }>(
      `SELECT ku.KampanyaId, u.Id AS UrunId, u.Ad, u.Barkod, u.Yayinevi, ISNULL(u.WebFiyati, u.ListeFiyati) AS Normal, ku.KampanyaFiyati AS Ozel, u.StokMiktari
       FROM dbo.KampanyaUrun ku JOIN dbo.Urun u ON u.Id = ku.UrunId
       WHERE ku.KampanyaId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ',')) ORDER BY ku.KampanyaId, ku.Sira`, [['ids', sql.NVarChar(sql.MAX), idler(r.map((x) => x.Id))]]);
    return r.map((k) => ({
      id: k.Id, ad: k.Ad, aciklama: k.Aciklama, baslangic: tarihMetni(k.BaslangicTarihi)!, bitis: tarihMetni(k.BitisTarihi)!, indirimOrani: sayi(k.IndirimOrani),
      aktif: !!k.AktifMi, yayinda: !!k.Yayinda, olusturma: k.OlusturmaTarihi, gonderim: k.Gonderim, sonGonderim: k.SonGonderim,
      urunler: u.filter((x) => x.KampanyaId === k.Id).map((x) => ({ urunId: x.UrunId, ad: x.Ad, barkod: x.Barkod, yayinevi: x.Yayinevi, normalFiyat: Number(x.Normal),
        ozelFiyat: sayi(x.Ozel), stok: x.StokMiktari,
        kampanyaFiyati: x.Ozel != null ? Number(x.Ozel) : Math.round(Number(x.Normal) * (1 - Number(k.IndirimOrani ?? 0) / 100) * 100) / 100 })),
    }));
  }
  private kampanyaSorgu(where: string, p: Param[]) {
    return q<Parameters<MssqlTicaretRepo['kampanyaTamamla']>[0][number]>(
      `SELECT k.Id, k.Ad, k.Aciklama, k.BaslangicTarihi, k.BitisTarihi, k.IndirimOrani, k.AktifMi, k.OlusturmaTarihi,
              CASE WHEN k.AktifMi = 1 AND CAST(SYSDATETIME() AS DATE) BETWEEN k.BaslangicTarihi AND k.BitisTarihi THEN 1 ELSE 0 END AS Yayinda,
              (SELECT COUNT(*) FROM dbo.KampanyaGonderim g WHERE g.KampanyaId = k.Id) AS Gonderim,
              (SELECT MAX(Tarih) FROM dbo.KampanyaGonderim g WHERE g.KampanyaId = k.Id) AS SonGonderim
       FROM dbo.Kampanya k WHERE ${where} ORDER BY k.BaslangicTarihi DESC`, p);
  }
  async kampanyalar(f: { yayindakiler?: boolean } = {}) {
    return this.kampanyaTamamla(await this.kampanyaSorgu(f.yayindakiler ? 'k.AktifMi = 1 AND CAST(SYSDATETIME() AS DATE) BETWEEN k.BaslangicTarihi AND k.BitisTarihi' : '1 = 1', []));
  }
  async kampanya(id: number) { return (await this.kampanyaTamamla(await this.kampanyaSorgu('k.Id = @id', [['id', sql.Int, id]])))[0] ?? null; }
  async kampanyaKaydet(id: number | null, g: KampanyaGirdi, kullaniciId: number) {
    return islem(async (tx) => {
      const p: Param[] = [['ad', sql.NVarChar(200), g.ad], ['ac', sql.NVarChar(2000), g.aciklama], ['b', sql.Date, g.baslangic], ['s', sql.Date, g.bitis],
        ['i', sql.Decimal(5, 2), g.indirimOrani], ['a', sql.Bit, g.aktif]];
      let kid = id;
      if (kid) {
        await q(`UPDATE dbo.Kampanya SET Ad = @ad, Aciklama = @ac, BaslangicTarihi = @b, BitisTarihi = @s, IndirimOrani = @i, AktifMi = @a, GuncellemeTarihi = SYSDATETIME() WHERE Id = @id`,
          [...p, ['id', sql.Int, kid]], tx);
        await q(`DELETE FROM dbo.KampanyaUrun WHERE KampanyaId = @id`, [['id', sql.Int, kid]], tx);
      } else {
        kid = (await q<{ Id: number }>(`INSERT INTO dbo.Kampanya (Ad, Aciklama, BaslangicTarihi, BitisTarihi, IndirimOrani, AktifMi, OlusturanKullaniciId) OUTPUT inserted.Id
          VALUES (@ad, @ac, @b, @s, @i, @a, @k)`, [...p, ['k', sql.Int, kullaniciId]], tx))[0].Id;
      }
      let sira = 0;
      for (const x of g.urunler) {
        await q(`INSERT INTO dbo.KampanyaUrun (KampanyaId, UrunId, KampanyaFiyati, Sira) VALUES (@id, @u, @f, @s)`,
          [['id', sql.Int, kid], ['u', sql.Int, x.urunId], ['f', sql.Decimal(18, 2), x.kampanyaFiyati], ['s', sql.Int, sira++]], tx);
      }
      return kid;
    });
  }
  async kampanyaGonderimEkle(l: Omit<KampanyaGonderimi, 'id' | 'kullaniciAd' | 'okulAd' | 'tarih' | 'durum'>[], gonderenId: number) {
    const out: number[] = [];
    for (const x of l) {
      const r = await q<{ Id: number }>(`INSERT INTO dbo.KampanyaGonderim (KampanyaId, KullaniciId, Kanal, Alici, GonderenKullaniciId) OUTPUT inserted.Id VALUES (@k, @u, @kn, @a, @g)`,
        [['k', sql.Int, x.kampanyaId], ['u', sql.Int, x.kullaniciId], ['kn', sql.VarChar(10), x.kanal], ['a', sql.NVarChar(150), x.alici], ['g', sql.Int, gonderenId]]);
      out.push(Number(r[0].Id));
    }
    return out;
  }
  async kampanyaGonderimDurum(id: number, durum: 'Gonderildi' | 'Hata', hataMesaji?: string) {
    await q(`UPDATE dbo.KampanyaGonderim SET Durum = @d, HataMesaji = @h WHERE Id = @id`, [['id', sql.BigInt, id], ['d', sql.VarChar(10), durum], ['h', sql.NVarChar(500), hataMesaji?.slice(0, 500) ?? null]]);
  }
  async kampanyaGonderimleri(kampanyaId: number, limit = 200): Promise<KampanyaGonderimi[]> {
    const r = await q<{ Id: number; KullaniciId: number; KullaniciAd: string; OkulAd: string | null; Kanal: 'SMS' | 'Eposta'; Alici: string; Durum: KampanyaGonderimi['durum']; Tarih: Date }>(
      `SELECT TOP (@lim) g.Id, g.KullaniciId, k.AdSoyad AS KullaniciAd, o.Ad AS OkulAd, g.Kanal, g.Alici, g.Durum, g.Tarih
       FROM dbo.KampanyaGonderim g JOIN dbo.Kullanici k ON k.Id = g.KullaniciId LEFT JOIN dbo.Okul o ON o.Id = k.OkulId
       WHERE g.KampanyaId = @id ORDER BY g.Id DESC`, [['lim', sql.Int, limit], ['id', sql.Int, kampanyaId]]);
    return r.map((x) => ({ id: Number(x.Id), kampanyaId, kullaniciId: x.KullaniciId, kullaniciAd: x.KullaniciAd, okulAd: x.OkulAd, kanal: x.Kanal, alici: x.Alici, durum: x.Durum, tarih: x.Tarih }));
  }

  // ---------- hakediş ----------
  async hakedisDurumu(okulId: number): Promise<HakedisDurumu> {
    const p: Param[] = [['o', sql.Int, okulId]];
    const [okul, tanim, ozet] = await Promise.all([
      q<{ HakedisGoster: boolean }>(`SELECT HakedisGoster FROM dbo.Okul WHERE Id = @o`, p),
      q<{ Id: number; Oran: number; BaslangicTarihi: Date | string; BitisTarihi: Date | string | null; VeliSatislarinaUygula: boolean; TopluAlimaUygula: boolean;
        Aciklama: string | null; Olusturan: string; OlusturmaTarihi: Date }>(
        `SELECT h.Id, h.Oran, h.BaslangicTarihi, h.BitisTarihi, h.VeliSatislarinaUygula, h.TopluAlimaUygula, h.Aciklama, k.AdSoyad AS Olusturan, h.OlusturmaTarihi
         FROM dbo.HakedisTanim h JOIN dbo.Kullanici k ON k.Id = h.OlusturanKullaniciId WHERE h.OkulId = @o ORDER BY h.BaslangicTarihi DESC`, p),
      q<{ Ciro: number | null; Hakedis: number | null; Siparis: number }>(
        `SELECT SUM(GenelToplam - TeslimatUcreti) AS Ciro, SUM(HakedisTutari) AS Hakedis, COUNT(*) AS Siparis FROM dbo.Siparis
         WHERE OkulId = @o AND SezonId = ${AKTIF_SEZON} AND Durum NOT IN ('OdemeBekliyor', 'Iptal', 'IadeEdildi')`, p),
    ]);
    const tanimlar: HakedisTanimKaydi[] = tanim.map((h) => ({ id: h.Id, oran: Number(h.Oran), baslangic: tarihMetni(h.BaslangicTarihi)!, bitis: tarihMetni(h.BitisTarihi),
      veli: !!h.VeliSatislarinaUygula, toplu: !!h.TopluAlimaUygula, aciklama: h.Aciklama, olusturan: h.Olusturan, olusturma: h.OlusturmaTarihi }));
    const bugun = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
    return { goster: !!okul[0]?.HakedisGoster, oran: tanimlar.find((h) => h.veli && h.baslangic <= bugun && (!h.bitis || h.bitis >= bugun))?.oran ?? null,
      ciro: Number(ozet[0]?.Ciro ?? 0), hakedis: Number(ozet[0]?.Hakedis ?? 0), siparis: ozet[0]?.Siparis ?? 0, tanimlar };
  }
  async hakedisTanimEkle(okulId: number, g: Omit<HakedisTanimKaydi, 'id' | 'olusturan' | 'olusturma'>, kullaniciId: number) {
    return islem(async (tx) => {
      await q(`UPDATE dbo.HakedisTanim SET BitisTarihi = DATEADD(DAY, -1, @b) WHERE OkulId = @o AND BitisTarihi IS NULL AND BaslangicTarihi < @b`,
        [['o', sql.Int, okulId], ['b', sql.Date, g.baslangic]], tx);
      return (await q<{ Id: number }>(`INSERT INTO dbo.HakedisTanim (OkulId, Oran, BaslangicTarihi, BitisTarihi, VeliSatislarinaUygula, TopluAlimaUygula, Aciklama, OlusturanKullaniciId)
        OUTPUT inserted.Id VALUES (@o, @r, @b, @s, @v, @t, @a, @k)`, [['o', sql.Int, okulId], ['r', sql.Decimal(5, 2), g.oran], ['b', sql.Date, g.baslangic],
        ['s', sql.Date, g.bitis], ['v', sql.Bit, g.veli], ['t', sql.Bit, g.toplu], ['a', sql.NVarChar(300), g.aciklama], ['k', sql.Int, kullaniciId]], tx))[0].Id;
    });
  }
  async hakedisGosterAyarla(okulId: number, goster: boolean) {
    await q(`UPDATE dbo.Okul SET HakedisGoster = @g, GuncellemeTarihi = SYSDATETIME() WHERE Id = @o`, [['o', sql.Int, okulId], ['g', sql.Bit, goster]]);
  }

  // ---------- ürün ----------
  async urunListesi(f: UrunFiltresi) {
    const qs = (f.q ?? '').trim();
    const boy = f.sayfaBoyu ?? 50, sayfa = Math.max(1, f.sayfa ?? 1);
    const kids = f.kategoriId ? (await q<{ Id: number }>(`${KATEGORI_CTE} SELECT Id FROM agac`, [['kid', sql.Int, f.kategoriId]])).map((x) => x.Id).join(',') : null;
    const where = `(@durum = 'tum' OR (@durum = 'aktif' AND u.AktifMi = 1) OR (@durum = 'pasif' AND u.AktifMi = 0))
      AND (@kat IS NULL OR u.Kategori = @kat) AND (@web = 0 OR u.WebFiyati IS NOT NULL) AND (@stokta = 0 OR u.StokMiktari > 0)
      AND (@kids IS NULL OR EXISTS (SELECT 1 FROM dbo.UrunKategori uk WHERE uk.UrunId = u.Id AND uk.KategoriId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@kids, ','))))
      AND (@q = '' OR ${sqlKatla('u.Ad')} LIKE @l OR ${sqlKatla("ISNULL(u.Yayinevi, '')")} LIKE @l OR ${sqlKatla("ISNULL(u.Yazar, '')")} LIKE @l
           OR u.Barkod = @q OR u.OpakStokKodu = @q)`;
    const p: Param[] = [['durum', sql.VarChar(5), f.durum ?? 'tum'], ['kat', sql.NVarChar(100), f.kategori ?? null], ['web', sql.Bit, !!f.webFiyatli],
      ['q', sql.NVarChar(100), qs], ['l', sql.NVarChar(110), `%${katla(qs)}%`], ['stokta', sql.Bit, !!f.stokta], ['kids', sql.NVarChar(sql.MAX), kids]];
    const [satirlar, toplam] = await Promise.all([
      q<UrunDb>(`${URUN_SEC} WHERE ${where} ORDER BY u.Ad OFFSET @atla ROWS FETCH NEXT @boy ROWS ONLY`, [...p, ['atla', sql.Int, (sayfa - 1) * boy], ['boy', sql.Int, boy]]),
      q<{ N: number }>(`SELECT COUNT(*) AS N FROM dbo.Urun u WHERE ${where}`, p),
    ]);
    return { satirlar: satirlar.map(urunMap), toplam: toplam[0]?.N ?? 0 };
  }
  async urunKaydi(id: number) { const r = await q<UrunDb>(`${URUN_SEC} WHERE u.Id = @id`, [['id', sql.Int, id]]); return r[0] ? urunMap(r[0]) : null; }
  async urunGuncelle(id: number, g: UrunGuncelleme) {
    await q(`UPDATE dbo.Urun SET AktifMi = @ak, WebFiyati = @wf, Aciklama = @ac, GuncellemeTarihi = SYSDATETIME() WHERE Id = @id`, [
      ['id', sql.Int, id], ['ak', sql.Bit, g.aktif], ['wf', sql.Decimal(18, 2), g.webFiyati], ['ac', sql.NVarChar(2000), g.aciklama]]);
  }
  async urunKapak(id: number, dosya: string | null) {
    await q(`UPDATE dbo.Urun SET KapakDosya = @d, GuncellemeTarihi = SYSDATETIME() WHERE Id = @id`, [['id', sql.Int, id], ['d', sql.NVarChar(200), dosya]]);
  }
  async opakKategorileri() {
    return (await q<{ Kategori: string }>(`SELECT DISTINCT Kategori FROM dbo.Urun WHERE Kategori IS NOT NULL ORDER BY Kategori`)).map((x) => x.Kategori);
  }

  // ---------- set ----------
  private async setTamamla(r: SetDb[]): Promise<SetKaydi[]> {
    if (!r.length) return [];
    const s = await q<{ SetId: number; UrunId: number; Ad: string; Barkod: string | null; Yayinevi: string | null; Fiyat: number; Adet: number; AktifMi: boolean; StokMiktari: number | null }>(
      `SELECT ss.SetId, u.Id AS UrunId, u.Ad, u.Barkod, u.Yayinevi, ISNULL(u.WebFiyati, u.ListeFiyati) AS Fiyat, ss.Adet, u.AktifMi, u.StokMiktari
       FROM dbo.UrunSetSatir ss JOIN dbo.Urun u ON u.Id = ss.UrunId
       WHERE ss.SetId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ',')) ORDER BY ss.SetId, ss.Sira`, [['ids', sql.NVarChar(sql.MAX), idler(r.map((x) => x.Id))]]);
    return r.map((x) => {
      const satirlar = s.filter((k) => k.SetId === x.Id).map((k) => ({ urunId: k.UrunId, ad: k.Ad, barkod: k.Barkod, yayinevi: k.Yayinevi,
        birimFiyat: Number(k.Fiyat), adet: k.Adet, aktif: !!k.AktifMi, stok: k.StokMiktari }));
      const icerikToplami = Math.round(satirlar.reduce((a, k) => a + k.birimFiyat * k.adet, 0) * 100) / 100;
      return { id: x.Id, barkod: x.Barkod, ad: x.Ad, aciklama: x.Aciklama, fiyat: sayi(x.Fiyat), icerikToplami, satisFiyati: sayi(x.Fiyat) ?? icerikToplami,
        aktif: !!x.AktifMi, satirlar, listeSayisi: x.ListeSayisi, olusturma: x.OlusturmaTarihi, guncelleme: x.GuncellemeTarihi };
    });
  }
  private setSorgu(where: string, p: Param[], top = 500) {
    return q<SetDb>(`SELECT TOP (${top}) s.Id, s.Barkod, s.Ad, s.Aciklama, s.Fiyat, s.AktifMi, s.OlusturmaTarihi, s.GuncellemeTarihi,
      (SELECT COUNT(DISTINCT KitapListeId) FROM dbo.KitapListeSatir ks WHERE ks.SetId = s.Id) AS ListeSayisi
      FROM dbo.UrunSet s WHERE ${where} ORDER BY s.Ad`, p);
  }
  async setListesi(f: { q?: string; pasifDahil?: boolean }) {
    const qs = (f.q ?? '').trim();
    return this.setTamamla(await this.setSorgu(`(@pasif = 1 OR s.AktifMi = 1) AND (@q = '' OR ${sqlKatla('s.Ad')} LIKE @l OR s.Barkod = @q)`,
      [['pasif', sql.Bit, !!f.pasifDahil], ['q', sql.NVarChar(100), qs], ['l', sql.NVarChar(110), `%${katla(qs)}%`]]));
  }
  async setKaydi(id: number) { return (await this.setTamamla(await this.setSorgu('s.Id = @id', [['id', sql.Int, id]])))[0] ?? null; }
  async setler(ids: number[]) {
    if (!ids.length) return [];
    return this.setTamamla(await this.setSorgu(`s.Id IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`, [['ids', sql.NVarChar(sql.MAX), idler(ids)]]));
  }
  async setAra(qs: string, limit = 10) {
    const s = qs.trim();
    return this.setTamamla(await this.setSorgu(`s.AktifMi = 1 AND (@q = '' OR ${sqlKatla('s.Ad')} LIKE @l OR s.Barkod = @q)`,
      [['q', sql.NVarChar(100), s], ['l', sql.NVarChar(110), `%${katla(s)}%`]], limit));
  }
  async barkodKullanimi(barkod: string, haricSetId?: number) {
    const r = await q<{ Tur: 'urun' | 'set' }>(`SELECT TOP (1) 'urun' AS Tur FROM dbo.Urun WHERE Barkod = @b
      UNION ALL SELECT TOP (1) 'set' FROM dbo.UrunSet WHERE Barkod = @b AND Id <> @h`, [['b', sql.NVarChar(30), barkod], ['h', sql.Int, haricSetId ?? 0]]);
    return r[0]?.Tur ?? null;
  }
  private async setSatirlariYaz(id: number, g: SetGirdi, tx: sql.Transaction) {
    await q(`DELETE FROM dbo.UrunSetSatir WHERE SetId = @id`, [['id', sql.Int, id]], tx);
    let sira = 0;
    for (const x of g.satirlar) {
      await q(`INSERT INTO dbo.UrunSetSatir (SetId, UrunId, Adet, Sira) VALUES (@id, @u, @a, @s)`,
        [['id', sql.Int, id], ['u', sql.Int, x.urunId], ['a', sql.Int, x.adet], ['s', sql.Int, sira++]], tx);
    }
  }
  private setParam(g: SetGirdi): Param[] {
    return [['b', sql.NVarChar(30), g.barkod], ['ad', sql.NVarChar(300), g.ad], ['ac', sql.NVarChar(1000), g.aciklama], ['f', sql.Decimal(18, 2), g.fiyat], ['ak', sql.Bit, g.aktif]];
  }
  async setEkle(g: SetGirdi, kullaniciId: number) {
    if (await this.barkodKullanimi(g.barkod)) throw new KayitHatasi('Bu barkod başka bir ürün ya da sette kullanılıyor');
    return islem(async (tx) => {
      const r = await benzersiz(() => q<{ Id: number }>(`INSERT INTO dbo.UrunSet (Barkod, Ad, Aciklama, Fiyat, AktifMi, OlusturanKullaniciId) OUTPUT inserted.Id
        VALUES (@b, @ad, @ac, @f, @ak, @k)`, [...this.setParam(g), ['k', sql.Int, kullaniciId]], tx), { UQ_UrunSet_Barkod: 'Bu barkod başka bir sette kullanılıyor' });
      await this.setSatirlariYaz(r[0].Id, g, tx);
      return r[0].Id;
    });
  }
  async setGuncelle(id: number, g: SetGirdi) {
    if (await this.barkodKullanimi(g.barkod, id)) throw new KayitHatasi('Bu barkod başka bir ürün ya da sette kullanılıyor');
    await islem(async (tx) => {
      await benzersiz(() => q(`UPDATE dbo.UrunSet SET Barkod = @b, Ad = @ad, Aciklama = @ac, Fiyat = @f, AktifMi = @ak, GuncellemeTarihi = SYSDATETIME() WHERE Id = @id`,
        [...this.setParam(g), ['id', sql.Int, id]], tx), { UQ_UrunSet_Barkod: 'Bu barkod başka bir sette kullanılıyor' });
      await this.setSatirlariYaz(id, g, tx);
    });
  }

  // ---------- tahsilat ----------
  async tahsilatlar(f: TahsilatFiltresi): Promise<TahsilatSatiri[]> {
    const qs = (f.q ?? '').trim();
    const r = await q<{ Id: number; Tarih: Date; SiparisId: number; SiparisNo: string; OkulId: number; OkulAd: string; PlasiyerAd: string | null;
      VeliAd: string | null; VeliTelefon: string | null; OgrenciAd: string | null; Tip: TahsilatSatiri['tip']; Durum: TahsilatSatiri['durum']; Tutar: number;
      TaksitSayisi: number | null; Pos: string | null; KartSonDort: string | null; Banka: string | null; HavaleGonderen: string | null;
      Referans: string | null; Onaylayan: string | null; OnayTarihi: Date | null }>(
      `SELECT TOP (1000) od.Id, od.OlusturmaTarihi AS Tarih, s.Id AS SiparisId, s.SiparisNo, s.OkulId, ok.Ad AS OkulAd, pl.AdSoyad AS PlasiyerAd,
              v.AdSoyad AS VeliAd, v.Telefon AS VeliTelefon, CONCAT(og.Ad, ' ', og.Soyad) AS OgrenciAd, od.Tip, od.Durum, od.Tutar, od.TaksitSayisi,
              sp.Ad AS Pos, od.KartSonDort, bh.Banka, od.HavaleGonderen, s.HavaleReferansKodu AS Referans, onk.AdSoyad AS Onaylayan, od.OnayTarihi
       FROM dbo.Odeme od JOIN dbo.Siparis s ON s.Id = od.SiparisId JOIN dbo.Okul ok ON ok.Id = s.OkulId
       LEFT JOIN dbo.Kullanici pl ON pl.Id = ok.PlasiyerId LEFT JOIN dbo.Veli v ON v.Id = s.VeliId LEFT JOIN dbo.Ogrenci og ON og.Id = s.OgrenciId
       LEFT JOIN dbo.SanalPos sp ON sp.Id = od.SanalPosId LEFT JOIN dbo.BankaHesabi bh ON bh.Id = od.BankaHesabiId
       LEFT JOIN dbo.Kullanici onk ON onk.Id = od.OnaylayanKullaniciId
       WHERE (@b IS NULL OR od.OlusturmaTarihi >= @b) AND (@s IS NULL OR od.OlusturmaTarihi <= @s)
         AND (@tip IS NULL OR od.Tip = @tip) AND (@durum IS NULL OR od.Durum = @durum) AND (@okul IS NULL OR s.OkulId = @okul)
         AND (@okullar IS NULL OR s.OkulId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@okullar, ',')))
         AND (@q = '' OR s.SiparisNo LIKE @l OR s.HavaleReferansKodu = @q OR v.Telefon LIKE @l
              OR ${sqlKatla("ISNULL(v.AdSoyad, '')")} LIKE @lk OR ${sqlKatla("CONCAT(og.Ad, ' ', og.Soyad)")} LIKE @lk OR ${sqlKatla("ISNULL(od.HavaleGonderen, '')")} LIKE @lk)
       ORDER BY od.OlusturmaTarihi DESC`, [
        ['b', sql.DateTime2(0), f.baslangic ?? null], ['s', sql.DateTime2(0), f.bitis ?? null], ['tip', sql.VarChar(10), f.tip ?? null],
        ['durum', sql.VarChar(10), f.durum ?? null], ['okul', sql.Int, f.okulId ?? null], ['okullar', sql.NVarChar(sql.MAX), f.okulIdleri ? idler(f.okulIdleri) : null],
        ['q', sql.NVarChar(100), qs], ['l', sql.NVarChar(110), `%${qs}%`], ['lk', sql.NVarChar(110), `%${katla(qs)}%`]]);
    return r.map((x) => ({ id: x.Id, tarih: x.Tarih, siparisId: x.SiparisId, siparisNo: x.SiparisNo, okulId: x.OkulId, okulAd: x.OkulAd, plasiyerAd: x.PlasiyerAd,
      veliAd: x.VeliAd, veliTelefon: x.VeliTelefon, ogrenciAd: x.OgrenciAd?.trim() || null, tip: x.Tip, durum: x.Durum, tutar: Number(x.Tutar), taksit: x.TaksitSayisi,
      pos: x.Pos, kartSonDort: x.KartSonDort, banka: x.Banka, havaleGonderen: x.HavaleGonderen, referans: x.Referans, onaylayan: x.Onaylayan, onayTarihi: x.OnayTarihi }));
  }
  async havaleOnayla(odemeId: number, kullaniciId: number) {
    return islem(async (tx) => {
      const r = await q<{ SiparisId: number }>(`UPDATE dbo.Odeme SET Durum = 'Basarili', OnaylayanKullaniciId = @k, OnayTarihi = SYSDATETIME()
        OUTPUT inserted.SiparisId WHERE Id = @id AND Tip = 'Havale' AND Durum = 'Bekliyor'`, [['id', sql.Int, odemeId], ['k', sql.Int, kullaniciId]], tx);
      if (!r.length) return false;
      await q(`UPDATE dbo.Siparis SET Durum = 'Odendi', GuncellemeTarihi = SYSDATETIME() WHERE Id = @s AND Durum = 'OdemeBekliyor';
        IF @@ROWCOUNT > 0 INSERT INTO dbo.SiparisDurumHareket (SiparisId, EskiDurum, YeniDurum, Aciklama, KullaniciId)
          VALUES (@s, 'OdemeBekliyor', 'Odendi', N'Havale onaylandı', @k);`, [['s', sql.Int, r[0].SiparisId], ['k', sql.Int, kullaniciId]], tx);
      return true;
    });
  }

  // ---------- veli sepeti / raporlar ----------
  async veliSepetKaydet(veliId: number, ogrenciId: number, satirlar: VeliSepetSatiri[]) {
    await islem(async (tx) => {
      const p: Param[] = [['v', sql.Int, veliId], ['o', sql.Int, ogrenciId]];
      const mevcut = await q<{ Id: number }>(`SELECT Id FROM dbo.VeliSepet WITH (UPDLOCK, HOLDLOCK) WHERE VeliId = @v AND OgrenciId = @o AND Durum = 'Acik'`, p, tx);
      let id = mevcut[0]?.Id;
      if (!id) {
        if (!satirlar.length) return;
        id = (await q<{ Id: number }>(`INSERT INTO dbo.VeliSepet (VeliId, OgrenciId) OUTPUT inserted.Id VALUES (@v, @o)`, p, tx))[0].Id;
      }
      const eski = await q<{ KitapListeId: number | null; UrunId: number | null; SetId: number | null; Adet: number; BirimFiyat: number }>(
        `SELECT KitapListeId, UrunId, SetId, Adet, BirimFiyat FROM dbo.VeliSepetSatir WHERE VeliSepetId = @id ORDER BY Id`, [['id', sql.Int, id]], tx);
      const imza = (l: VeliSepetSatiri[]) => JSON.stringify(l.map((x) => [x.listeId, x.urunId, x.setId, x.adet, Number(x.birimFiyat)]));
      if (mevcut.length && imza(eski.map((x) => ({ listeId: x.KitapListeId, urunId: x.UrunId, setId: x.SetId, adet: x.Adet, birimFiyat: x.BirimFiyat }))) === imza(satirlar)) return;
      await q(`DELETE FROM dbo.VeliSepetSatir WHERE VeliSepetId = @id`, [['id', sql.Int, id]], tx);
      for (const x of satirlar) {
        await q(`INSERT INTO dbo.VeliSepetSatir (VeliSepetId, KitapListeId, UrunId, SetId, Adet, BirimFiyat) VALUES (@id, @l, @u, @s, @a, @f)`, [
          ['id', sql.Int, id], ['l', sql.Int, x.listeId], ['u', sql.Int, x.setId ? null : x.urunId], ['s', sql.Int, x.setId], ['a', sql.Int, x.adet],
          ['f', sql.Decimal(18, 2), x.birimFiyat]], tx);
      }
      const tutar = Math.round(satirlar.reduce((a, x) => a + x.adet * x.birimFiyat, 0) * 100) / 100;
      await q(`UPDATE dbo.VeliSepet SET Tutar = @t, GuncellemeTarihi = SYSDATETIME(), Durum = CASE WHEN @bos = 1 THEN 'Bosaltildi' ELSE Durum END WHERE Id = @id`,
        [['id', sql.Int, id], ['t', sql.Decimal(18, 2), tutar], ['bos', sql.Bit, !satirlar.length]], tx);
    });
  }
  async veliSepeti(veliId: number, ogrenciId: number): Promise<VeliSepetSatiri[]> {
    const r = await q<{ KitapListeId: number | null; UrunId: number | null; SetId: number | null; Adet: number; BirimFiyat: number }>(
      `SELECT s.KitapListeId, s.UrunId, s.SetId, s.Adet, s.BirimFiyat FROM dbo.VeliSepetSatir s JOIN dbo.VeliSepet v ON v.Id = s.VeliSepetId
       WHERE v.VeliId = @v AND v.OgrenciId = @o AND v.Durum = 'Acik' ORDER BY s.Id`, [['v', sql.Int, veliId], ['o', sql.Int, ogrenciId]]);
    return r.map((x) => ({ listeId: x.KitapListeId, urunId: x.UrunId, setId: x.SetId, adet: x.Adet, birimFiyat: Number(x.BirimFiyat) }));
  }
  async terkEdilenSepetler(f: TerkFiltresi): Promise<TerkSepet[]> {
    const r = await q<{ SepetId: number; VeliId: number; VeliAd: string | null; Telefon: string; Eposta: string | null; OgrenciId: number; OgrenciAd: string;
      OkulId: number; OkulAd: string; Seviye: number | null; SubeAd: string | null; PlasiyerAd: string | null; Kalem: number; Tutar: number;
      OlusturmaTarihi: Date; GuncellemeTarihi: Date }>(
      `SELECT TOP (1000) vs.Id AS SepetId, v.Id AS VeliId, v.AdSoyad AS VeliAd, v.Telefon, v.Eposta, o.Id AS OgrenciId, CONCAT(o.Ad, ' ', o.Soyad) AS OgrenciAd,
              o.OkulId, ok.Ad AS OkulAd, sn.Seviye, sb.Ad AS SubeAd, pl.AdSoyad AS PlasiyerAd,
              (SELECT SUM(Adet) FROM dbo.VeliSepetSatir WHERE VeliSepetId = vs.Id) AS Kalem, vs.Tutar, vs.OlusturmaTarihi, vs.GuncellemeTarihi
       FROM dbo.VeliSepet vs JOIN dbo.Veli v ON v.Id = vs.VeliId JOIN dbo.Ogrenci o ON o.Id = vs.OgrenciId JOIN dbo.Okul ok ON ok.Id = o.OkulId
       LEFT JOIN dbo.Kullanici pl ON pl.Id = ok.PlasiyerId
       LEFT JOIN dbo.OgrenciSezon os ON os.OgrenciId = o.Id AND os.SezonId = ${AKTIF_SEZON}
       LEFT JOIN dbo.Sube sb ON sb.Id = os.SubeId LEFT JOIN dbo.Sinif sn ON sn.Id = sb.SinifId
       WHERE vs.Durum = 'Acik' AND vs.GuncellemeTarihi <= DATEADD(HOUR, -@saat, SYSDATETIME())
         AND EXISTS (SELECT 1 FROM dbo.VeliSepetSatir WHERE VeliSepetId = vs.Id)
         AND NOT EXISTS (SELECT 1 FROM dbo.Siparis s WHERE s.OgrenciId = o.Id AND s.SezonId = ${AKTIF_SEZON} AND s.Durum NOT IN ('Iptal', 'IadeEdildi'))
         AND (@okul IS NULL OR o.OkulId = @okul) AND (@okullar IS NULL OR o.OkulId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@okullar, ',')))
       ORDER BY vs.GuncellemeTarihi DESC`, [['saat', sql.Int, f.saat], ['okul', sql.Int, f.okulId ?? null],
        ['okullar', sql.NVarChar(sql.MAX), f.okulIdleri ? idler(f.okulIdleri) : null]]);
    return r.map((x) => ({ sepetId: x.SepetId, veliId: x.VeliId, veliAd: x.VeliAd, telefon: x.Telefon, eposta: x.Eposta, ogrenciId: x.OgrenciId, ogrenciAd: x.OgrenciAd,
      okulId: x.OkulId, okulAd: x.OkulAd, sinifSube: x.SubeAd ? `${x.Seviye}-${x.SubeAd}` : null, plasiyerAd: x.PlasiyerAd, kalem: x.Kalem ?? 0,
      tutar: Number(x.Tutar), olusturma: x.OlusturmaTarihi, guncelleme: x.GuncellemeTarihi }));
  }
  async siparisVerenOgrenciler(okulIdleri?: number[] | null) {
    const r = await q<{ OgrenciId: number }>(`SELECT DISTINCT OgrenciId FROM dbo.Siparis WHERE Tip = 'Veli' AND SezonId = ${AKTIF_SEZON}
      AND Durum NOT IN ('Iptal', 'IadeEdildi') AND (@okullar IS NULL OR OkulId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@okullar, ',')))`,
      [['okullar', sql.NVarChar(sql.MAX), okulIdleri ? idler(okulIdleri) : null]]);
    return new Set(r.map((x) => x.OgrenciId));
  }

  // ---------- kayıtlar ----------
  async girisYaz(g: GirisGirdi) {
    await q(`INSERT INTO dbo.GirisKaydi (Tip, KullaniciId, VeliId, Kimlik, Rol, BasariliMi, Sebep, Ip, TarayiciBilgisi) VALUES (@t, @k, @v, @ki, @r, @b, @s, @ip, @tr)`, [
      ['t', sql.VarChar(10), g.tip], ['k', sql.Int, g.kullaniciId ?? null], ['v', sql.Int, g.veliId ?? null], ['ki', sql.NVarChar(150), g.kimlik.slice(0, 150)],
      ['r', sql.VarChar(10), g.rol ?? null], ['b', sql.Bit, g.basarili], ['s', sql.NVarChar(100), g.sebep ?? null], ['ip', sql.VarChar(45), g.ip?.slice(0, 45) ?? null],
      ['tr', sql.NVarChar(300), g.tarayici?.slice(0, 300) ?? null]]);
  }
  async girisLog(f: GirisFiltresi): Promise<GirisSatiri[]> {
    const qs = (f.q ?? '').trim();
    const r = await q<{ Id: number; Tarih: Date; Tip: GirisSatiri['tip']; Ad: string | null; Kimlik: string; Rol: string | null; BasariliMi: boolean; Sebep: string | null; Ip: string | null }>(
      `SELECT TOP (@lim) g.Id, g.Tarih, g.Tip, COALESCE(k.AdSoyad, v.AdSoyad) AS Ad, g.Kimlik, g.Rol, g.BasariliMi, g.Sebep, g.Ip
       FROM dbo.GirisKaydi g LEFT JOIN dbo.Kullanici k ON k.Id = g.KullaniciId LEFT JOIN dbo.Veli v ON v.Id = g.VeliId
       WHERE (@tip IS NULL OR g.Tip = @tip) AND (@b IS NULL OR g.BasariliMi = @b) AND (@bas IS NULL OR g.Tarih >= @bas) AND (@bit IS NULL OR g.Tarih <= @bit)
         AND (@q = '' OR g.Kimlik LIKE @l OR g.Ip LIKE @l OR ${sqlKatla("ISNULL(COALESCE(k.AdSoyad, v.AdSoyad), '')")} LIKE @lk)
       ORDER BY g.Id DESC`, [['lim', sql.Int, f.limit ?? 300], ['tip', sql.VarChar(10), f.tip ?? null], ['b', sql.Bit, f.basarili ?? null],
        ['bas', sql.DateTime2(0), f.baslangic ?? null], ['bit', sql.DateTime2(0), f.bitis ?? null], ['q', sql.NVarChar(100), qs],
        ['l', sql.NVarChar(110), `%${qs}%`], ['lk', sql.NVarChar(110), `%${katla(qs)}%`]]);
    return r.map((x) => ({ id: Number(x.Id), tarih: x.Tarih, tip: x.Tip, ad: x.Ad, kimlik: x.Kimlik, rol: x.Rol, basarili: !!x.BasariliMi, sebep: x.Sebep, ip: x.Ip }));
  }
  async bildirimLog(f: BildirimFiltresi): Promise<BildirimLogSatiri[]> {
    const r = await q<{ Id: number; Tarih: Date; Kanal: BildirimLogSatiri['kanal']; Alici: string; Durum: BildirimLogSatiri['durum']; OkulAd: string | null; ListeAd: string | null }>(
      `SELECT TOP (@lim) b.Id, b.OlusturmaTarihi AS Tarih, b.Kanal, b.Alici, b.Durum, ok.Ad AS OkulAd, kl.Ad AS ListeAd
       FROM dbo.Bildirim b LEFT JOIN dbo.KitapListeYayin y ON y.Id = b.KitapListeYayinId LEFT JOIN dbo.KitapListe kl ON kl.Id = y.KitapListeId
       LEFT JOIN dbo.Okul ok ON ok.Id = kl.OkulId
       WHERE (@k IS NULL OR b.Kanal = @k) AND (@d IS NULL OR b.Durum = @d) ORDER BY b.Id DESC`,
      [['lim', sql.Int, f.limit ?? 300], ['k', sql.VarChar(10), f.kanal ?? null], ['d', sql.VarChar(10), f.durum ?? null]]);
    return r.map((x) => ({ id: Number(x.Id), tarih: x.Tarih, kanal: x.Kanal, alici: x.Alici, durum: x.Durum, okulAd: x.OkulAd, listeAd: x.ListeAd }));
  }

  // ---------- ayarlar ----------
  async ayarlar() {
    const r = await q<{ Anahtar: string; Deger: string }>(`SELECT Anahtar, Deger FROM dbo.Ayar`);
    return Object.fromEntries(r.map((x) => [x.Anahtar, x.Deger]));
  }
  async ayarlarKaydet(a: Record<string, string>) {
    await islem(async (tx) => {
      for (const [k, v] of Object.entries(a)) {
        await q(`UPDATE dbo.Ayar SET Deger = @v WHERE Anahtar = @k; IF @@ROWCOUNT = 0 INSERT INTO dbo.Ayar (Anahtar, Deger) VALUES (@k, @v);`,
          [['k', sql.VarChar(100), k], ['v', sql.NVarChar(1000), v]], tx);
      }
    });
  }
  async bankaHesaplari(pasifDahil = true): Promise<BankaHesabiKaydi[]> {
    const r = await q<{ Id: number; Banka: string; HesapAdi: string; Iban: string; Sube: string | null; HesapNo: string | null; ParaBirimi: BankaHesabiKaydi['paraBirimi']; Sira: number; AktifMi: boolean }>(
      `SELECT Id, Banka, HesapAdi, Iban, Sube, HesapNo, ParaBirimi, Sira, AktifMi FROM dbo.BankaHesabi WHERE @p = 1 OR AktifMi = 1 ORDER BY Sira, Id`, [['p', sql.Bit, pasifDahil]]);
    return r.map((x) => ({ id: x.Id, banka: x.Banka, hesapAdi: x.HesapAdi, iban: x.Iban, sube: x.Sube, hesapNo: x.HesapNo, paraBirimi: x.ParaBirimi, sira: x.Sira, aktif: !!x.AktifMi }));
  }
  async bankaHesabiKaydet(id: number | null, g: BankaHesabiGirdi) {
    const p: Param[] = [['b', sql.NVarChar(100), g.banka], ['h', sql.NVarChar(200), g.hesapAdi], ['i', sql.VarChar(34), g.iban], ['sb', sql.NVarChar(100), g.sube],
      ['n', sql.VarChar(30), g.hesapNo], ['pb', sql.Char(3), g.paraBirimi], ['s', sql.Int, g.sira], ['a', sql.Bit, g.aktif]];
    const hata = { UQ_BankaHesabi_Iban: 'Bu IBAN zaten kayıtlı' };
    if (id) {
      await benzersiz(() => q(`UPDATE dbo.BankaHesabi SET Banka = @b, HesapAdi = @h, Iban = @i, Sube = @sb, HesapNo = @n, ParaBirimi = @pb, Sira = @s, AktifMi = @a WHERE Id = @id`,
        [...p, ['id', sql.Int, id]]), hata);
      return id;
    }
    const r = await benzersiz(() => q<{ Id: number }>(`INSERT INTO dbo.BankaHesabi (Banka, HesapAdi, Iban, Sube, HesapNo, ParaBirimi, Sira, AktifMi) OUTPUT inserted.Id
      VALUES (@b, @h, @i, @sb, @n, @pb, @s, @a)`, p), hata);
    return r[0].Id;
  }
  async kargoFirmalari(pasifDahil = true): Promise<KargoFirmaKaydi[]> {
    const [f, b] = await Promise.all([
      q<{ Id: number; Kod: string; Ad: string; Tur: KargoFirmaKaydi['tur']; EntegrasyonTipi: KargoFirmaKaydi['entegrasyon']; SabitUcret: number; UcretsizLimit: number | null;
        TahminiTeslim: string | null; TakipUrl: string | null; Sira: number; AktifMi: boolean }>(
        `SELECT Id, Kod, Ad, Tur, EntegrasyonTipi, SabitUcret, UcretsizLimit, TahminiTeslim, TakipUrl, Sira, AktifMi FROM dbo.KuryeFirma
         WHERE @p = 1 OR AktifMi = 1 ORDER BY Sira, Id`, [['p', sql.Bit, pasifDahil]]),
      q<{ Id: number; KuryeFirmaId: number | null; Il: string; Ilce: string; Mahalle: string | null; Ucret: number; UcretsizLimit: number | null; AktifMi: boolean }>(
        `SELECT Id, KuryeFirmaId, Il, Ilce, Mahalle, Ucret, UcretsizLimit, AktifMi FROM dbo.KuryeBolge ORDER BY Il, Ilce, Mahalle`),
    ]);
    const bolge = (x: (typeof b)[number]): KargoBolgeKaydi => ({ id: x.Id, firmaId: x.KuryeFirmaId, il: x.Il, ilce: x.Ilce, mahalle: x.Mahalle, ucret: Number(x.Ucret),
      ucretsizLimit: sayi(x.UcretsizLimit), aktif: !!x.AktifMi });
    return f.map((x) => ({ id: x.Id, kod: x.Kod, ad: x.Ad, tur: x.Tur, entegrasyon: x.EntegrasyonTipi, sabitUcret: Number(x.SabitUcret), ucretsizLimit: sayi(x.UcretsizLimit),
      tahminiTeslim: x.TahminiTeslim, takipUrl: x.TakipUrl, sira: x.Sira, aktif: !!x.AktifMi, bolgeler: b.filter((k) => k.KuryeFirmaId === x.Id).map(bolge) }));
  }
  async kargoFirmaKaydet(id: number | null, g: KargoFirmaGirdi) {
    const p: Param[] = [['kod', sql.VarChar(20), g.kod], ['ad', sql.NVarChar(100), g.ad], ['tur', sql.VarChar(10), g.tur], ['ent', sql.VarChar(10), g.entegrasyon],
      ['su', sql.Decimal(18, 2), g.sabitUcret], ['ul', sql.Decimal(18, 2), g.ucretsizLimit], ['tt', sql.NVarChar(50), g.tahminiTeslim],
      ['tu', sql.NVarChar(300), g.takipUrl], ['s', sql.Int, g.sira], ['a', sql.Bit, g.aktif]];
    const hata = { UQ_KuryeFirma_Kod: 'Bu firma kodu zaten kullanılıyor' };
    if (id) {
      await benzersiz(() => q(`UPDATE dbo.KuryeFirma SET Kod = @kod, Ad = @ad, Tur = @tur, EntegrasyonTipi = @ent, SabitUcret = @su, UcretsizLimit = @ul,
        TahminiTeslim = @tt, TakipUrl = @tu, Sira = @s, AktifMi = @a WHERE Id = @id`, [...p, ['id', sql.Int, id]]), hata);
      return id;
    }
    const r = await benzersiz(() => q<{ Id: number }>(`INSERT INTO dbo.KuryeFirma (Kod, Ad, Tur, EntegrasyonTipi, SabitUcret, UcretsizLimit, TahminiTeslim, TakipUrl, Sira, AktifMi)
      OUTPUT inserted.Id VALUES (@kod, @ad, @tur, @ent, @su, @ul, @tt, @tu, @s, @a)`, p), hata);
    return r[0].Id;
  }
  async kargoBolgeKaydet(id: number | null, g: KargoBolgeGirdi) {
    const p: Param[] = [['f', sql.Int, g.firmaId], ['il', sql.NVarChar(50), g.il], ['ilce', sql.NVarChar(50), g.ilce], ['m', sql.NVarChar(100), g.mahalle],
      ['u', sql.Decimal(18, 2), g.ucret], ['ul', sql.Decimal(18, 2), g.ucretsizLimit], ['a', sql.Bit, g.aktif]];
    if (id) {
      await q(`UPDATE dbo.KuryeBolge SET KuryeFirmaId = @f, Il = @il, Ilce = @ilce, Mahalle = @m, Ucret = @u, UcretsizLimit = @ul, AktifMi = @a WHERE Id = @id`, [...p, ['id', sql.Int, id]]);
      return id;
    }
    return (await q<{ Id: number }>(`INSERT INTO dbo.KuryeBolge (KuryeFirmaId, Il, Ilce, Mahalle, Ucret, UcretsizLimit, AktifMi) OUTPUT inserted.Id
      VALUES (@f, @il, @ilce, @m, @u, @ul, @a)`, p))[0].Id;
  }
  async kargoBolgeSil(id: number) { await q(`DELETE FROM dbo.KuryeBolge WHERE Id = @id`, [['id', sql.Int, id]]); }
  async posListesi(): Promise<PosKaydi[]> {
    const [p, t] = await Promise.all([
      q<{ Id: number; Kod: string; Ad: string; TestModu: boolean; AktifMi: boolean }>(`SELECT Id, Kod, Ad, TestModu, AktifMi FROM dbo.SanalPos ORDER BY Id`),
      q<{ Id: number; SanalPosId: number; KartAilesi: string | null; TaksitSayisi: number; VadeFarkiOrani: number; AktifMi: boolean }>(
        `SELECT Id, SanalPosId, KartAilesi, TaksitSayisi, VadeFarkiOrani, AktifMi FROM dbo.TaksitSecenegi ORDER BY SanalPosId, TaksitSayisi`),
    ]);
    return p.map((x) => ({ id: x.Id, kod: x.Kod, ad: x.Ad, test: !!x.TestModu, aktif: !!x.AktifMi,
      taksitler: t.filter((k) => k.SanalPosId === x.Id).map((k): TaksitKaydi => ({ id: k.Id, kartAilesi: k.KartAilesi, taksit: k.TaksitSayisi, vadeFarki: Number(k.VadeFarkiOrani), aktif: !!k.AktifMi })) }));
  }
  async posGuncelle(id: number, g: { test: boolean; aktif: boolean }) {
    await q(`UPDATE dbo.SanalPos SET TestModu = @t, AktifMi = @a WHERE Id = @id`, [['id', sql.Int, id], ['t', sql.Bit, g.test], ['a', sql.Bit, g.aktif]]);
  }
  async taksitleriKaydet(posId: number, l: Omit<TaksitKaydi, 'id'>[]) {
    await islem(async (tx) => {
      await q(`DELETE FROM dbo.TaksitSecenegi WHERE SanalPosId = @p`, [['p', sql.Int, posId]], tx);
      for (const x of l) {
        await benzersiz(() => q(`INSERT INTO dbo.TaksitSecenegi (SanalPosId, KartAilesi, TaksitSayisi, VadeFarkiOrani, AktifMi) VALUES (@p, @k, @t, @v, @a)`, [
          ['p', sql.Int, posId], ['k', sql.NVarChar(30), x.kartAilesi], ['t', sql.TinyInt, x.taksit], ['v', sql.Decimal(5, 2), x.vadeFarki], ['a', sql.Bit, x.aktif]], tx),
          { UX_TaksitSecenegi: 'Aynı kart ailesi için aynı taksit iki kez girilmiş' });
      }
    });
  }
  async posKurallari(): Promise<PosKurali[]> {
    const r = await q<{ Id: number; Oncelik: number; Ad: string; TaksitMin: number | null; TaksitMax: number | null; KartBankasi: string | null; KartAilesi: string | null;
      KartTipi: PosKurali['kartTipi']; SanalPosId: number; PosAd: string; AktifMi: boolean }>(
      `SELECT k.Id, k.Oncelik, k.Ad, k.TaksitMin, k.TaksitMax, k.KartBankasi, k.KartAilesi, k.KartTipi, k.SanalPosId, p.Ad AS PosAd, k.AktifMi
       FROM dbo.PosYonlendirmeKurali k JOIN dbo.SanalPos p ON p.Id = k.SanalPosId ORDER BY k.Oncelik`);
    return r.map((x) => ({ id: x.Id, oncelik: x.Oncelik, ad: x.Ad, taksitMin: x.TaksitMin, taksitMax: x.TaksitMax, kartBankasi: x.KartBankasi, kartAilesi: x.KartAilesi,
      kartTipi: x.KartTipi, posId: x.SanalPosId, posAd: x.PosAd, aktif: !!x.AktifMi }));
  }
  async posKuraliKaydet(id: number | null, g: PosKuraliGirdi) {
    const p: Param[] = [['o', sql.Int, g.oncelik], ['ad', sql.NVarChar(100), g.ad], ['tmin', sql.TinyInt, g.taksitMin], ['tmax', sql.TinyInt, g.taksitMax],
      ['kb', sql.NVarChar(50), g.kartBankasi], ['ka', sql.NVarChar(30), g.kartAilesi], ['kt', sql.VarChar(10), g.kartTipi], ['pos', sql.Int, g.posId], ['a', sql.Bit, g.aktif]];
    const hata = { UQ_PosKural_Oncelik: `${g.oncelik} önceliğinde başka bir kural var` };
    if (id) {
      await benzersiz(() => q(`UPDATE dbo.PosYonlendirmeKurali SET Oncelik = @o, Ad = @ad, TaksitMin = @tmin, TaksitMax = @tmax, KartBankasi = @kb, KartAilesi = @ka,
        KartTipi = @kt, SanalPosId = @pos, AktifMi = @a WHERE Id = @id`, [...p, ['id', sql.Int, id]]), hata);
      return id;
    }
    const r = await benzersiz(() => q<{ Id: number }>(`INSERT INTO dbo.PosYonlendirmeKurali (Oncelik, Ad, TaksitMin, TaksitMax, KartBankasi, KartAilesi, KartTipi, SanalPosId, AktifMi)
      OUTPUT inserted.Id VALUES (@o, @ad, @tmin, @tmax, @kb, @ka, @kt, @pos, @a)`, p), hata);
    return r[0].Id;
  }
  async posKuraliSil(id: number) {
    // ödemede kullanılmış kural silinmez, pasife alınır
    await q(`IF EXISTS (SELECT 1 FROM dbo.Odeme WHERE PosKuraliId = @id) UPDATE dbo.PosYonlendirmeKurali SET AktifMi = 0 WHERE Id = @id
      ELSE DELETE FROM dbo.PosYonlendirmeKurali WHERE Id = @id`, [['id', sql.Int, id]]);
  }

  // ---------- kurumsal sayfalar ----------
  private sayfaSorgu(where: string, p: Param[]) {
    return q<{ Id: number; Slug: string; Baslik: string; Icerik: string; YayindaMi: boolean; AltBilgideGoster: boolean; Sira: number; GuncellemeTarihi: Date }>(
      `SELECT Id, Slug, Baslik, Icerik, YayindaMi, AltBilgideGoster, Sira, GuncellemeTarihi FROM dbo.SayfaIcerik WHERE ${where} ORDER BY Sira, Id`, p)
      .then((r) => r.map((x): SayfaKaydi => ({ id: x.Id, slug: x.Slug, baslik: x.Baslik, icerik: x.Icerik, yayinda: !!x.YayindaMi, altBilgi: !!x.AltBilgideGoster,
        sira: x.Sira, guncelleme: x.GuncellemeTarihi })));
  }
  async sayfalar() { return this.sayfaSorgu('1 = 1', []); }
  async sayfa(slug: string) { return (await this.sayfaSorgu('Slug = @s', [['s', sql.VarChar(60), slug]]))[0] ?? null; }
  async sayfaKaydet(id: number | null, g: SayfaGirdi) {
    const p: Param[] = [['s', sql.VarChar(60), g.slug], ['b', sql.NVarChar(150), g.baslik], ['i', sql.NVarChar(sql.MAX), g.icerik], ['y', sql.Bit, g.yayinda],
      ['a', sql.Bit, g.altBilgi], ['si', sql.Int, g.sira]];
    const hata = { UQ_SayfaIcerik_Slug: 'Bu adres başka bir sayfada kullanılıyor' };
    if (id) {
      await benzersiz(() => q(`UPDATE dbo.SayfaIcerik SET Slug = @s, Baslik = @b, Icerik = @i, YayindaMi = @y, AltBilgideGoster = @a, Sira = @si,
        GuncellemeTarihi = SYSDATETIME() WHERE Id = @id`, [...p, ['id', sql.Int, id]]), hata);
      return id;
    }
    const r = await benzersiz(() => q<{ Id: number }>(`INSERT INTO dbo.SayfaIcerik (Slug, Baslik, Icerik, YayindaMi, AltBilgideGoster, Sira) OUTPUT inserted.Id
      VALUES (@s, @b, @i, @y, @a, @si)`, p), hata);
    return r[0].Id;
  }
}
