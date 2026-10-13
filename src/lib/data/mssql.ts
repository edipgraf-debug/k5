import 'server-only';
import sql from 'mssql';
import type { Repo, VeliGuncelleme, PersonelGuncelleme, YeniListe, YayinKaydi, OkulGirisGuncelleme } from './repo';
import type {
  Bildirim, BildirimDurumu, BildirimKaydi, KitapListesi, ListeSatiri, Ogrenci, OgrenciOzet, OgrenciVelisi, OkulBilgi,
  Personel, SinifSecenegi, SmsKodu, TakipSatiri, Urun, Veli, VeliAlici, YayinOzeti,
} from '../types';

/**
 * KardelenOkul veritabanı (db/schema.sql). Opak veritabanına bu sınıftan YAZILMAZ;
 * Opak'a sipariş/tahsilat aktarımı src/lib/opak üzerinden yapılır.
 */

export type Param = [string, sql.ISqlType | (() => sql.ISqlType), unknown];

const g = globalThis as unknown as { __koPool?: Promise<sql.ConnectionPool> };
export function havuz(): Promise<sql.ConnectionPool> {
  if (!g.__koPool) {
    g.__koPool = new sql.ConnectionPool({
      server: process.env.MSSQL_SERVER ?? 'localhost',
      port: Number(process.env.MSSQL_PORT ?? 1433),
      database: process.env.MSSQL_DATABASE ?? 'KardelenOkul',
      user: process.env.MSSQL_USER,
      password: process.env.MSSQL_PASSWORD,
      options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT !== 'false',
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
    }).connect();
  }
  return g.__koPool;
}

export async function q<T = Record<string, unknown>>(text: string, params: Param[] = [], tx?: sql.Transaction): Promise<T[]> {
  const req = tx ? new sql.Request(tx) : (await havuz()).request();
  for (const [ad, tip, deger] of params) req.input(ad, tip as sql.ISqlType, deger);
  const r = await req.query<T>(text);
  return r.recordset ?? [];
}

export const AKTIF_SEZON = '(SELECT TOP (1) Id FROM dbo.Sezon WHERE AktifMi = 1)';

interface ListeSatirDb { Id: number; OkulId: number; SezonId: number; Ad: string; Kapsam: KitapListesi['kapsam'];
  SinifId: number | null; SubeId: number | null; OgrenciId: number | null; KapsamAd: string; OlusturanKullaniciId: number;
  YayindaMi: boolean; HedefTipi: KitapListesi['hedefTipi']; YayinTarihi: Date | null; GuncellemeTarihi: Date | null }

const LISTE_SEC = `
  SELECT kl.Id, kl.OkulId, kl.SezonId, kl.Ad, kl.Kapsam, kl.SinifId, kl.SubeId, kl.OgrenciId, kl.OlusturanKullaniciId,
         kl.YayindaMi, kl.HedefTipi, kl.YayinTarihi, COALESCE(kl.GuncellemeTarihi, kl.OlusturmaTarihi) AS GuncellemeTarihi,
         CASE kl.Kapsam
           WHEN 'Sube'   THEN CONCAT(sn1.Seviye, '-', sb.Ad)
           WHEN 'Seviye' THEN CONCAT(sn2.Seviye, '. sınıf')
           ELSE CONCAT(o.Ad, ' ', o.Soyad) END AS KapsamAd
  FROM dbo.KitapListe kl
  LEFT JOIN dbo.Sube sb   ON sb.Id = kl.SubeId
  LEFT JOIN dbo.Sinif sn1 ON sn1.Id = sb.SinifId
  LEFT JOIN dbo.Sinif sn2 ON sn2.Id = kl.SinifId
  LEFT JOIN dbo.Ogrenci o ON o.Id = kl.OgrenciId`;

interface OkulDb { Id: number; Kod: string; Ad: string; Ilce: string; Slug: string | null; LogoDosya: string | null; GiristeLogoGoster: boolean }
const OKUL_SEC = `SELECT Id, Kod, Ad, Ilce, Slug, LogoDosya, GiristeLogoGoster FROM dbo.Okul`;
const okulMap = (o: OkulDb): OkulBilgi => ({ id: o.Id, kod: o.Kod, ad: o.Ad, ilce: o.Ilce, slug: o.Slug, logoDosya: o.LogoDosya, logoGoster: !!o.GiristeLogoGoster && !!o.LogoDosya });

export class MssqlRepo implements Repo {
  private async listeleriTamamla(rows: ListeSatirDb[]): Promise<KitapListesi[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.Id);
    const satirlar = await q<{ KitapListeId: number; UrunId: number | null; SetId: number | null; Adet: number; ZorunluMu: boolean; SatisFiyati: number | null }>(
      `SELECT KitapListeId, UrunId, SetId, Adet, ZorunluMu, SatisFiyati FROM dbo.KitapListeSatir
       WHERE KitapListeId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ',')) ORDER BY KitapListeId, Sira, Id`,
      [['ids', sql.NVarChar(sql.MAX), ids.join(',')]]);
    const hedefler = await q<{ KitapListeId: number; OgrenciId: number }>(
      `SELECT KitapListeId, OgrenciId FROM dbo.KitapListeHedef
       WHERE KitapListeId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`, [['ids', sql.NVarChar(sql.MAX), ids.join(',')]]);
    return rows.map((r) => ({
      id: r.Id, okulId: r.OkulId, sezonId: r.SezonId, ad: r.Ad, kapsam: r.Kapsam, sinifId: r.SinifId, subeId: r.SubeId,
      ogrenciId: r.OgrenciId, kapsamAd: r.KapsamAd, olusturanId: r.OlusturanKullaniciId, yayinda: !!r.YayindaMi,
      hedefTipi: r.HedefTipi, hedefOgrenciler: hedefler.filter((h) => h.KitapListeId === r.Id).map((h) => h.OgrenciId),
      yayinTarihi: r.YayinTarihi, guncelleme: r.GuncellemeTarihi,
      satirlar: satirlar.filter((s) => s.KitapListeId === r.Id).map((s) => ({
        urunId: s.UrunId, setId: s.SetId, adet: s.Adet, zorunlu: !!s.ZorunluMu, satisFiyati: s.SatisFiyati == null ? null : Number(s.SatisFiyati),
      })),
    }));
  }

  async veliTelefonla(telefon: string): Promise<Veli | null> {
    const r = await q<{ Id: number; Telefon: string; AdSoyad: string | null; Eposta: string | null; SifreHash: string | null;
      BasarisizGirisSayisi: number; KilitBitisTarihi: Date | null; AktifMi: boolean }>(
      `SELECT Id, Telefon, AdSoyad, Eposta, SifreHash, BasarisizGirisSayisi, KilitBitisTarihi, AktifMi
       FROM dbo.Veli WHERE Telefon = @t AND AktifMi = 1`, [['t', sql.VarChar(10), telefon]]);
    const v = r[0];
    return v ? { id: v.Id, telefon: v.Telefon, adSoyad: v.AdSoyad, eposta: v.Eposta, sifreHash: v.SifreHash,
      basarisizGiris: v.BasarisizGirisSayisi, kilitBitis: v.KilitBitisTarihi, aktif: !!v.AktifMi } : null;
  }

  async veliGuncelle(id: number, gu: VeliGuncelleme) {
    const set: string[] = [];
    const p: Param[] = [['id', sql.Int, id]];
    if (gu.sifreHash !== undefined) { set.push('SifreHash = @sh'); p.push(['sh', sql.VarChar(255), gu.sifreHash]); }
    if (gu.adSoyad) { set.push('AdSoyad = @ad'); p.push(['ad', sql.NVarChar(150), gu.adSoyad]); }
    if (gu.basarisizGiris !== undefined) { set.push('BasarisizGirisSayisi = @bg'); p.push(['bg', sql.TinyInt, gu.basarisizGiris]); }
    if (gu.kilitBitis !== undefined) { set.push('KilitBitisTarihi = @kb'); p.push(['kb', sql.DateTime2(0), gu.kilitBitis]); }
    if (gu.telefonDogrulandi) set.push('TelefonDogrulandiMi = 1');
    if (gu.sonGiris) { set.push('SonGirisTarihi = @sg'); p.push(['sg', sql.DateTime2(0), gu.sonGiris]); }
    if (set.length) await q(`UPDATE dbo.Veli SET ${set.join(', ')} WHERE Id = @id`, p);
  }

  async personelEpostayla(eposta: string): Promise<Personel | null> {
    const r = await q<{ Id: number; Tip: Personel['tip']; OkulId: number | null; AdSoyad: string; Eposta: string; Telefon: string | null;
      SifreHash: string; SifreDegistirmeliMi: boolean; BasarisizGirisSayisi: number; KilitBitisTarihi: Date | null; AktifMi: boolean; Yetkiler: string | null }>(
      `SELECT k.Id, k.Tip, k.OkulId, k.AdSoyad, k.Eposta, k.Telefon, k.SifreHash, k.SifreDegistirmeliMi, k.BasarisizGirisSayisi, k.KilitBitisTarihi, k.AktifMi,
              (SELECT STRING_AGG(y.Yetki, ',') FROM dbo.KullaniciYetki y WHERE y.KullaniciId = k.Id) AS Yetkiler
       FROM dbo.Kullanici k WHERE k.Eposta = @e AND k.AktifMi = 1`, [['e', sql.NVarChar(150), eposta]]);
    const k = r[0];
    return k ? { id: k.Id, tip: k.Tip, okulId: k.OkulId, adSoyad: k.AdSoyad, eposta: k.Eposta, telefon: k.Telefon, sifreHash: k.SifreHash,
      sifreDegistirmeli: !!k.SifreDegistirmeliMi, yetkiler: k.Yetkiler ? k.Yetkiler.split(',') : [], basarisizGiris: k.BasarisizGirisSayisi, kilitBitis: k.KilitBitisTarihi, aktif: !!k.AktifMi } : null;
  }

  async personelGuncelle(id: number, gu: PersonelGuncelleme) {
    const set: string[] = [];
    const p: Param[] = [['id', sql.Int, id]];
    if (gu.basarisizGiris !== undefined) { set.push('BasarisizGirisSayisi = @bg'); p.push(['bg', sql.TinyInt, gu.basarisizGiris]); }
    if (gu.kilitBitis !== undefined) { set.push('KilitBitisTarihi = @kb'); p.push(['kb', sql.DateTime2(0), gu.kilitBitis]); }
    if (gu.sonGiris) { set.push('SonGirisTarihi = @sg'); p.push(['sg', sql.DateTime2(0), gu.sonGiris]); }
    if (set.length) await q(`UPDATE dbo.Kullanici SET ${set.join(', ')} WHERE Id = @id`, p);
  }

  async smsKoduKaydet(k: { telefon: string; kodHash: string; amac: SmsKodu['amac']; sonGecerlilik: Date; ip?: string }) {
    await q(`INSERT INTO dbo.SmsDogrulama (Telefon, KodHash, Amac, SonGecerlilikTarihi, IpAdresi) VALUES (@t, @h, @a, @s, @ip)`, [
      ['t', sql.VarChar(10), k.telefon], ['h', sql.VarChar(255), k.kodHash], ['a', sql.VarChar(20), k.amac],
      ['s', sql.DateTime2(0), k.sonGecerlilik], ['ip', sql.VarChar(45), k.ip ?? null]]);
  }

  async sonSmsKodu(telefon: string, amac: SmsKodu['amac']): Promise<SmsKodu | null> {
    const r = await q<{ Id: number; Telefon: string; KodHash: string; Amac: SmsKodu['amac']; SonGecerlilikTarihi: Date; DenemeSayisi: number;
      KullanildiMi: boolean; OlusturmaTarihi: Date }>(
      `SELECT TOP (1) Id, Telefon, KodHash, Amac, SonGecerlilikTarihi, DenemeSayisi, KullanildiMi, OlusturmaTarihi
       FROM dbo.SmsDogrulama WHERE Telefon = @t AND Amac = @a ORDER BY OlusturmaTarihi DESC, Id DESC`,
      [['t', sql.VarChar(10), telefon], ['a', sql.VarChar(20), amac]]);
    const k = r[0];
    return k ? { id: k.Id, telefon: k.Telefon, kodHash: k.KodHash, amac: k.Amac, sonGecerlilik: k.SonGecerlilikTarihi,
      deneme: k.DenemeSayisi, kullanildi: !!k.KullanildiMi, olusturma: k.OlusturmaTarihi } : null;
  }

  async smsKoduGuncelle(id: number, gu: { deneme?: number; kullanildi?: boolean }) {
    const set: string[] = [];
    const p: Param[] = [['id', sql.BigInt, id]];
    if (gu.deneme !== undefined) { set.push('DenemeSayisi = @d'); p.push(['d', sql.TinyInt, gu.deneme]); }
    if (gu.kullanildi !== undefined) { set.push('KullanildiMi = @k'); p.push(['k', sql.Bit, gu.kullanildi]); }
    if (set.length) await q(`UPDATE dbo.SmsDogrulama SET ${set.join(', ')} WHERE Id = @id`, p);
  }

  async veliOgrencileri(veliId: number): Promise<Ogrenci[]> {
    const r = await q<{ Id: number; OkulId: number; OkulAd: string; OkulNo: string; Ad: string; Soyad: string; SinifId: number; Seviye: number; SubeId: number; SubeAd: string }>(
      `SELECT o.Id, o.OkulId, ok.Ad AS OkulAd, o.OkulNo, o.Ad, o.Soyad, sn.Id AS SinifId, sn.Seviye, sb.Id AS SubeId, sb.Ad AS SubeAd
       FROM dbo.VeliOgrenci vo
       JOIN dbo.Ogrenci o       ON o.Id = vo.OgrenciId AND o.AktifMi = 1
       JOIN dbo.Okul ok         ON ok.Id = o.OkulId
       JOIN dbo.OgrenciSezon os ON os.OgrenciId = o.Id AND os.SezonId = ${AKTIF_SEZON}
       JOIN dbo.Sube sb         ON sb.Id = os.SubeId
       JOIN dbo.Sinif sn        ON sn.Id = sb.SinifId
       WHERE vo.VeliId = @v ORDER BY sn.Seviye DESC, o.Ad`, [['v', sql.Int, veliId]]);
    return r.map((o) => ({ id: o.Id, okulId: o.OkulId, okulAd: o.OkulAd, okulNo: o.OkulNo, ad: o.Ad, soyad: o.Soyad,
      sinifId: o.SinifId, seviye: o.Seviye, subeId: o.SubeId, subeAd: o.SubeAd, sinifSube: `${o.Seviye}-${o.SubeAd}` }));
  }

  async ogrenciListeleri(ogrenciId: number) {
    const rows = await q<ListeSatirDb>(`${LISTE_SEC}
      CROSS APPLY (SELECT os.SubeId, s2.SinifId, og.OkulId FROM dbo.OgrenciSezon os
                   JOIN dbo.Sube s2 ON s2.Id = os.SubeId JOIN dbo.Ogrenci og ON og.Id = os.OgrenciId
                   WHERE os.OgrenciId = @o AND os.SezonId = ${AKTIF_SEZON}) x
      WHERE kl.YayindaMi = 1 AND kl.SezonId = ${AKTIF_SEZON} AND kl.OkulId = x.OkulId
        AND ((kl.Kapsam = 'Sube' AND kl.SubeId = x.SubeId) OR (kl.Kapsam = 'Seviye' AND kl.SinifId = x.SinifId)
             OR (kl.Kapsam = 'Ogrenci' AND kl.OgrenciId = @o))
        AND (kl.HedefTipi = 'Toplu' OR EXISTS (SELECT 1 FROM dbo.KitapListeHedef h WHERE h.KitapListeId = kl.Id AND h.OgrenciId = @o))`, [['o', sql.Int, ogrenciId]]);
    return this.listeleriTamamla(rows);
  }

  private urunMap(r: { Id: number; OpakStokKodu: string; Barkod: string | null; Ad: string; Yayinevi: string | null; Yazar: string | null; Kategori: string | null; Fiyat: number; StokMiktari?: number | null; KapakDosya?: string | null }): Urun {
    return { id: r.Id, opakStokKodu: r.OpakStokKodu, barkod: r.Barkod, ad: r.Ad, yayinevi: r.Yayinevi, yazar: r.Yazar, kategori: r.Kategori, fiyat: Number(r.Fiyat), stok: r.StokMiktari ?? null, kapak: !!r.KapakDosya };
  }

  async urunler(ids: number[]) {
    if (!ids.length) return [];
    const r = await q<Parameters<MssqlRepo['urunMap']>[0]>(
      `SELECT Id, OpakStokKodu, Barkod, Ad, Yayinevi, Yazar, Kategori, ISNULL(WebFiyati, ListeFiyati) AS Fiyat, StokMiktari, KapakDosya FROM dbo.Urun
       WHERE Id IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`, [['ids', sql.NVarChar(sql.MAX), ids.join(',')]]);
    return r.map((x) => this.urunMap(x));
  }

  async urunAra(qs: string, limit = 30) {
    const r = await q<Parameters<MssqlRepo['urunMap']>[0]>(
      `SELECT TOP (@lim) Id, OpakStokKodu, Barkod, Ad, Yayinevi, Yazar, Kategori, ISNULL(WebFiyati, ListeFiyati) AS Fiyat, StokMiktari, KapakDosya FROM dbo.Urun
       WHERE AktifMi = 1 AND (@s = '' OR Ad LIKE @l OR Yayinevi LIKE @l OR Yazar LIKE @l OR Barkod = @s OR OpakStokKodu = @s)
       ORDER BY Ad`, [['lim', sql.Int, limit], ['s', sql.NVarChar(100), qs.trim()], ['l', sql.NVarChar(110), `%${qs.trim()}%`]]);
    return r.map((x) => this.urunMap(x));
  }

  async okullar(): Promise<OkulBilgi[]> {
    const r = await q<OkulDb>(`${OKUL_SEC} WHERE AktifMi = 1 ORDER BY Kod`);
    return r.map(okulMap);
  }

  async okul(id: number) {
    const r = await q<OkulDb>(`${OKUL_SEC} WHERE Id = @id`, [['id', sql.Int, id]]);
    return r[0] ? okulMap(r[0]) : null;
  }

  async okulSlugla(slug: string) {
    const r = await q<OkulDb>(`${OKUL_SEC} WHERE Slug = @s AND AktifMi = 1`, [['s', sql.VarChar(80), slug]]);
    return r[0] ? okulMap(r[0]) : null;
  }

  async okulGirisGuncelle(id: number, gu: OkulGirisGuncelleme) {
    const set: string[] = ['GuncellemeTarihi = SYSDATETIME()'];
    const p: Param[] = [['id', sql.Int, id]];
    if (gu.slug !== undefined) { set.push('Slug = @slug'); p.push(['slug', sql.VarChar(80), gu.slug]); }
    if (gu.logoDosya !== undefined) { set.push('LogoDosya = @logo'); p.push(['logo', sql.NVarChar(200), gu.logoDosya]); }
    if (gu.logoGoster !== undefined) { set.push('GiristeLogoGoster = @lg'); p.push(['lg', sql.Bit, gu.logoGoster]); }
    try {
      // logo kaldırılınca gösterim de kapanır (CK_Okul_Logo)
      await q(`UPDATE dbo.Okul SET ${set.join(', ')} WHERE Id = @id;
               UPDATE dbo.Okul SET GiristeLogoGoster = 0 WHERE Id = @id AND LogoDosya IS NULL AND GiristeLogoGoster = 1;`, p);
    } catch (e) {
      if (String((e as Error).message).includes('UX_Okul_Slug')) throw new Error('SLUG_KULLANIMDA');
      throw e;
    }
  }

  async okulOgrencileri(okulId: number, sadeceSubeler?: number[] | null): Promise<OgrenciOzet[]> {
    const r = await q<{ Id: number; OkulId: number; OkulNo: string; Ad: string; Soyad: string; SubeId: number; Seviye: number; SubeAd: string; VeliSayisi: number }>(
      `SELECT o.Id, o.OkulId, o.OkulNo, o.Ad, o.Soyad, sb.Id AS SubeId, sn.Seviye, sb.Ad AS SubeAd,
              (SELECT COUNT(*) FROM dbo.VeliOgrenci vo JOIN dbo.Veli v ON v.Id = vo.VeliId AND v.AktifMi = 1 WHERE vo.OgrenciId = o.Id) AS VeliSayisi
       FROM dbo.Ogrenci o
       JOIN dbo.OgrenciSezon os ON os.OgrenciId = o.Id AND os.SezonId = ${AKTIF_SEZON}
       JOIN dbo.Sube sb ON sb.Id = os.SubeId JOIN dbo.Sinif sn ON sn.Id = sb.SinifId
       WHERE o.OkulId = @o AND o.AktifMi = 1
         AND (@sb IS NULL OR sb.Id IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@sb, ',')))
       ORDER BY sn.Seviye, sb.Ad, o.Ad, o.Soyad`,
      [['o', sql.Int, okulId], ['sb', sql.NVarChar(sql.MAX), sadeceSubeler ? (sadeceSubeler.join(',') || '0') : null]]);
    return r.map((x) => ({ id: x.Id, okulId: x.OkulId, okulNo: x.OkulNo, ad: x.Ad, soyad: x.Soyad, subeId: x.SubeId,
      sinifSube: `${x.Seviye}-${x.SubeAd}`, veliSayisi: x.VeliSayisi }));
  }

  async ogrenci(id: number): Promise<Ogrenci | null> {
    const r = await q<{ Id: number; OkulId: number; OkulAd: string; OkulNo: string; Ad: string; Soyad: string; SinifId: number; Seviye: number; SubeId: number; SubeAd: string }>(
      `SELECT o.Id, o.OkulId, ok.Ad AS OkulAd, o.OkulNo, o.Ad, o.Soyad, sn.Id AS SinifId, sn.Seviye, sb.Id AS SubeId, sb.Ad AS SubeAd
       FROM dbo.Ogrenci o JOIN dbo.Okul ok ON ok.Id = o.OkulId
       JOIN dbo.OgrenciSezon os ON os.OgrenciId = o.Id AND os.SezonId = ${AKTIF_SEZON}
       JOIN dbo.Sube sb ON sb.Id = os.SubeId JOIN dbo.Sinif sn ON sn.Id = sb.SinifId
       WHERE o.Id = @id`, [['id', sql.Int, id]]);
    const o = r[0];
    return o ? { id: o.Id, okulId: o.OkulId, okulAd: o.OkulAd, okulNo: o.OkulNo, ad: o.Ad, soyad: o.Soyad,
      sinifId: o.SinifId, seviye: o.Seviye, subeId: o.SubeId, subeAd: o.SubeAd, sinifSube: `${o.Seviye}-${o.SubeAd}` } : null;
  }

  async ogrenciVelileri(ogrenciId: number): Promise<OgrenciVelisi[]> {
    const r = await q<{ Id: number; AdSoyad: string | null; Telefon: string; Eposta: string | null }>(
      `SELECT v.Id, v.AdSoyad, v.Telefon, v.Eposta FROM dbo.VeliOgrenci vo JOIN dbo.Veli v ON v.Id = vo.VeliId AND v.AktifMi = 1
       WHERE vo.OgrenciId = @o`, [['o', sql.Int, ogrenciId]]);
    return r.map((v) => ({ veliId: v.Id, adSoyad: v.AdSoyad, telefon: v.Telefon, eposta: v.Eposta }));
  }

  async ogrenciBildirimleri(ogrenciId: number, limit = 30): Promise<BildirimKaydi[]> {
    const r = await q<{ Id: number; ListeId: number | null; ListeAd: string | null; Kanal: 'SMS' | 'Eposta'; Alici: string; Durum: BildirimDurumu; Tarih: Date }>(
      `SELECT TOP (@lim) b.Id, kl.Id AS ListeId, kl.Ad AS ListeAd, b.Kanal, b.Alici, b.Durum, COALESCE(b.GonderimTarihi, b.OlusturmaTarihi) AS Tarih
       FROM dbo.Bildirim b
       LEFT JOIN dbo.KitapListeYayin y ON y.Id = b.KitapListeYayinId
       LEFT JOIN dbo.KitapListe kl ON kl.Id = y.KitapListeId
       WHERE b.OgrenciId = @o
          -- kardeşler tek mesajla bilgilendirildiğinde kayıt ilk kardeşe yazılır; sepetin kapsamındaysa bu öğrenciye de say
          OR (b.VeliId IN (SELECT VeliId FROM dbo.VeliOgrenci WHERE OgrenciId = @o) AND kl.Id IS NOT NULL AND EXISTS (
                SELECT 1 FROM dbo.OgrenciSezon os JOIN dbo.Sube sb ON sb.Id = os.SubeId
                WHERE os.OgrenciId = @o AND os.SezonId = kl.SezonId
                  AND ((kl.Kapsam = 'Sube' AND os.SubeId = kl.SubeId) OR (kl.Kapsam = 'Seviye' AND sb.SinifId = kl.SinifId) OR (kl.Kapsam = 'Ogrenci' AND kl.OgrenciId = @o))))
       ORDER BY b.Id DESC`, [['o', sql.Int, ogrenciId], ['lim', sql.Int, limit]]);
    return r.map((b) => ({ id: b.Id, listeId: b.ListeId, listeAd: b.ListeAd, kanal: b.Kanal, alici: b.Alici, durum: b.Durum, tarih: b.Tarih }));
  }

  async personelSubeleri(kullaniciId: number) {
    const r = await q<{ SubeId: number }>(`SELECT DISTINCT SubeId FROM dbo.OgretmenSube WHERE KullaniciId = @k`, [['k', sql.Int, kullaniciId]]);
    return r.map((x) => x.SubeId);
  }

  async sinifSecenekleri(okulId: number, sadeceSubeler?: number[] | null): Promise<SinifSecenegi[]> {
    const r = await q<{ SinifId: number; Seviye: number; SubeId: number | null; SubeAd: string | null }>(
      `SELECT sn.Id AS SinifId, sn.Seviye, sb.Id AS SubeId, sb.Ad AS SubeAd
       FROM dbo.Sinif sn LEFT JOIN dbo.Sube sb ON sb.SinifId = sn.Id
       WHERE sn.OkulId = @o AND sn.SezonId = ${AKTIF_SEZON} ORDER BY sn.Seviye, sb.Ad`, [['o', sql.Int, okulId]]);
    const out: SinifSecenegi[] = [];
    const goruldu = new Set<number>();
    for (const x of r) {
      if (!sadeceSubeler && !goruldu.has(x.SinifId)) { goruldu.add(x.SinifId); out.push({ kapsam: 'Seviye', id: x.SinifId, ad: `${x.Seviye}. sınıf (tüm şubeler)` }); }
      if (x.SubeId != null && (!sadeceSubeler || sadeceSubeler.includes(x.SubeId))) out.push({ kapsam: 'Sube', id: x.SubeId, ad: `${x.Seviye}-${x.SubeAd}` });
    }
    return out;
  }

  async okulListeleri(okulId: number) {
    const rows = await q<ListeSatirDb>(`${LISTE_SEC} WHERE kl.OkulId = @o AND kl.SezonId = ${AKTIF_SEZON} ORDER BY kl.OlusturmaTarihi`, [['o', sql.Int, okulId]]);
    return this.listeleriTamamla(rows);
  }

  async liste(id: number) {
    const rows = await q<ListeSatirDb>(`${LISTE_SEC} WHERE kl.Id = @id`, [['id', sql.Int, id]]);
    return (await this.listeleriTamamla(rows))[0] ?? null;
  }

  async listeOlustur(y: YeniListe) {
    const r = await q<{ Id: number }>(
      `INSERT INTO dbo.KitapListe (OkulId, SezonId, Ad, Kapsam, SinifId, SubeId, OlusturanKullaniciId, YayindaMi)
       OUTPUT inserted.Id VALUES (@o, ${AKTIF_SEZON}, @ad, @k, @sn, @sb, @u, 0)`, [
        ['o', sql.Int, y.okulId], ['ad', sql.NVarChar(200), y.ad], ['k', sql.VarChar(10), y.kapsam],
        ['sn', sql.Int, y.kapsam === 'Seviye' ? y.sinifId : null], ['sb', sql.Int, y.kapsam === 'Sube' ? y.subeId : null], ['u', sql.Int, y.olusturanId]]);
    return (await this.liste(r[0].Id))!;
  }

  async listeSatirlariKaydet(id: number, satirlar: ListeSatiri[]) {
    const tx = new sql.Transaction(await havuz());
    await tx.begin();
    try {
      await q(`DELETE FROM dbo.KitapListeSatir WHERE KitapListeId = @id`, [['id', sql.Int, id]], tx);
      let sira = 0;
      for (const s of satirlar) {
        await q(`INSERT INTO dbo.KitapListeSatir (KitapListeId, UrunId, SetId, Adet, ZorunluMu, SatisFiyati, Sira) VALUES (@id, @u, @st, @a, @z, @f, @s)`, [
          ['id', sql.Int, id], ['u', sql.Int, s.setId ? null : s.urunId], ['st', sql.Int, s.setId ?? null], ['a', sql.Int, s.adet], ['z', sql.Bit, s.zorunlu],
          ['f', sql.Decimal(18, 2), s.satisFiyati], ['s', sql.Int, sira++]], tx);
      }
      await q(`UPDATE dbo.KitapListe SET GuncellemeTarihi = SYSDATETIME() WHERE Id = @id`, [['id', sql.Int, id]], tx);
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async listeAlicilari(listeId: number, ogrenciIdleri?: number[] | null): Promise<VeliAlici[]> {
    const r = await q<{ VeliId: number; Telefon: string; Eposta: string | null; AdSoyad: string | null; OgrenciId: number; OgrenciAd: string; Seviye: number; SubeAd: string }>(
      `SELECT v.Id AS VeliId, v.Telefon, v.Eposta, v.AdSoyad, o.Id AS OgrenciId, CONCAT(o.Ad, ' ', o.Soyad) AS OgrenciAd, sn.Seviye, sb.Ad AS SubeAd
       FROM dbo.KitapListe kl
       JOIN dbo.OgrenciSezon os ON os.SezonId = kl.SezonId
       JOIN dbo.Ogrenci o       ON o.Id = os.OgrenciId AND o.AktifMi = 1 AND o.OkulId = kl.OkulId
       JOIN dbo.Sube sb         ON sb.Id = os.SubeId
       JOIN dbo.Sinif sn        ON sn.Id = sb.SinifId
       JOIN dbo.VeliOgrenci vo  ON vo.OgrenciId = o.Id
       JOIN dbo.Veli v          ON v.Id = vo.VeliId AND v.AktifMi = 1
       WHERE kl.Id = @id AND ((kl.Kapsam = 'Sube' AND os.SubeId = kl.SubeId) OR (kl.Kapsam = 'Seviye' AND sb.SinifId = kl.SinifId)
                              OR (kl.Kapsam = 'Ogrenci' AND o.Id = kl.OgrenciId))
         AND (@ids IS NULL OR o.Id IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ',')))`,
      [['id', sql.Int, listeId], ['ids', sql.NVarChar(sql.MAX), ogrenciIdleri ? (ogrenciIdleri.join(',') || '0') : null]]);
    return r.map((x) => ({ veliId: x.VeliId, telefon: x.Telefon, eposta: x.Eposta, veliAd: x.AdSoyad, ogrenciId: x.OgrenciId,
      ogrenciAd: x.OgrenciAd, sinifSube: `${x.Seviye}-${x.SubeAd}` }));
  }

  async yayinKaydet(y: YayinKaydi) {
    const tx = new sql.Transaction(await havuz());
    await tx.begin();
    try {
      const r = await q<{ Id: number; Tarih: Date }>(
        `INSERT INTO dbo.KitapListeYayin (KitapListeId, YayinlayanKullaniciId, GuncellemeMi, HatirlatmaMi, SmsGonder, EpostaGonder, OgrenciSayisi, SmsSayisi, EpostaSayisi, HedefTipi)
         OUTPUT inserted.Id, inserted.Tarih
         VALUES (@l, @u, @g, @h, @sms, @ep, @os, @ss, @es, @ht);`, [
          ['l', sql.Int, y.listeId], ['u', sql.Int, y.kullaniciId], ['g', sql.Bit, y.guncelleme], ['h', sql.Bit, y.hatirlatma], ['sms', sql.Bit, y.sms], ['ep', sql.Bit, y.eposta],
          ['os', sql.Int, y.ogrenciSayisi], ['ss', sql.Int, y.smsSayisi], ['es', sql.Int, y.epostaSayisi], ['ht', sql.VarChar(10), y.hedefTipi]], tx);
      const yayinId = r[0].Id;
      if (!y.hatirlatma) {
        if (y.hedefTipi === 'Toplu') {
          await q(`UPDATE dbo.KitapListe SET YayindaMi = 1, HedefTipi = 'Toplu', YayinTarihi = SYSDATETIME(), YayinlayanKullaniciId = @u,
                   GuncellemeTarihi = SYSDATETIME() WHERE Id = @l`, [['l', sql.Int, y.listeId], ['u', sql.Int, y.kullaniciId]], tx);
        } else {
          // tüm sınıfa açık bir sepet seçili yayınla daralmaz; değilse seçilenler hedefe eklenir
          await q(`UPDATE dbo.KitapListe SET HedefTipi = CASE WHEN YayindaMi = 1 AND HedefTipi = 'Toplu' THEN 'Toplu' ELSE 'Secili' END,
                     YayindaMi = 1, YayinTarihi = SYSDATETIME(), YayinlayanKullaniciId = @u, GuncellemeTarihi = SYSDATETIME() WHERE Id = @l;
                   INSERT INTO dbo.KitapListeHedef (KitapListeId, OgrenciId, EkleyenYayinId)
                   SELECT @l, CAST(s.value AS INT), @y FROM STRING_SPLIT(@ids, ',') s
                   WHERE NOT EXISTS (SELECT 1 FROM dbo.KitapListeHedef h WHERE h.KitapListeId = @l AND h.OgrenciId = CAST(s.value AS INT));`, [
            ['l', sql.Int, y.listeId], ['u', sql.Int, y.kullaniciId], ['y', sql.Int, yayinId], ['ids', sql.NVarChar(sql.MAX), y.ogrenciIdleri.join(',')]], tx);
        }
      }
      await tx.commit();
      return { yayinId, tarih: r[0].Tarih };
    } catch (e) {
      await tx.rollback();
      throw e;
    }
  }

  async listeTakip(listeId: number): Promise<TakipSatiri[]> {
    const r = await q<{ OgrenciId: number; OkulNo: string; Ad: string; Seviye: number; SubeAd: string; VeliSayisi: number; EpostaliVeli: number;
      Gorebilir: boolean; Sms: BildirimDurumu | null; Eposta: BildirimDurumu | null; SonBildirim: Date | null; Acildi: Date | null }>(
      `SELECT o.Id AS OgrenciId, o.OkulNo, CONCAT(o.Ad, ' ', o.Soyad) AS Ad, sn.Seviye, sb.Ad AS SubeAd,
              ISNULL(v.VeliSayisi, 0) AS VeliSayisi, ISNULL(v.EpostaliVeli, 0) AS EpostaliVeli,
              CAST(CASE WHEN kl.YayindaMi = 1 AND (kl.HedefTipi = 'Toplu' OR h.OgrenciId IS NOT NULL) THEN 1 ELSE 0 END AS BIT) AS Gorebilir,
              sms.Durum AS Sms, ep.Durum AS Eposta, son.Tarih AS SonBildirim, g.IlkTarih AS Acildi
       FROM dbo.KitapListe kl
       JOIN dbo.OgrenciSezon os ON os.SezonId = kl.SezonId
       JOIN dbo.Ogrenci o ON o.Id = os.OgrenciId AND o.AktifMi = 1 AND o.OkulId = kl.OkulId
       JOIN dbo.Sube sb ON sb.Id = os.SubeId JOIN dbo.Sinif sn ON sn.Id = sb.SinifId
       LEFT JOIN dbo.KitapListeHedef h ON h.KitapListeId = kl.Id AND h.OgrenciId = o.Id
       LEFT JOIN dbo.KitapListeGoruntuleme g ON g.KitapListeId = kl.Id AND g.OgrenciId = o.Id
       OUTER APPLY (SELECT COUNT(*) AS VeliSayisi, SUM(CASE WHEN ve.Eposta IS NOT NULL THEN 1 ELSE 0 END) AS EpostaliVeli
                    FROM dbo.VeliOgrenci vo JOIN dbo.Veli ve ON ve.Id = vo.VeliId AND ve.AktifMi = 1 WHERE vo.OgrenciId = o.Id) v
       OUTER APPLY (SELECT TOP (1) x.Durum FROM (SELECT b.Id, b.Durum FROM dbo.Bildirim b JOIN dbo.KitapListeYayin y ON y.Id = b.KitapListeYayinId AND y.KitapListeId = kl.Id
                    WHERE b.Kanal = 'SMS' AND (b.OgrenciId = o.Id OR b.VeliId IN (SELECT VeliId FROM dbo.VeliOgrenci WHERE OgrenciId = o.Id))) x ORDER BY x.Id DESC) sms
       OUTER APPLY (SELECT TOP (1) x.Durum FROM (SELECT b.Id, b.Durum FROM dbo.Bildirim b JOIN dbo.KitapListeYayin y ON y.Id = b.KitapListeYayinId AND y.KitapListeId = kl.Id
                    WHERE b.Kanal = 'Eposta' AND (b.OgrenciId = o.Id OR b.VeliId IN (SELECT VeliId FROM dbo.VeliOgrenci WHERE OgrenciId = o.Id))) x ORDER BY x.Id DESC) ep
       OUTER APPLY (SELECT MAX(COALESCE(b.GonderimTarihi, b.OlusturmaTarihi)) AS Tarih FROM dbo.Bildirim b
                    JOIN dbo.KitapListeYayin y ON y.Id = b.KitapListeYayinId AND y.KitapListeId = kl.Id
                    WHERE b.OgrenciId = o.Id OR b.VeliId IN (SELECT VeliId FROM dbo.VeliOgrenci WHERE OgrenciId = o.Id)) son
       WHERE kl.Id = @id AND ((kl.Kapsam = 'Sube' AND os.SubeId = kl.SubeId) OR (kl.Kapsam = 'Seviye' AND sb.SinifId = kl.SinifId)
                              OR (kl.Kapsam = 'Ogrenci' AND o.Id = kl.OgrenciId))
       ORDER BY sn.Seviye, sb.Ad, o.Ad, o.Soyad`, [['id', sql.Int, listeId]]);
    return r.map((x) => ({ ogrenciId: x.OgrenciId, okulNo: x.OkulNo, ad: x.Ad, sinifSube: `${x.Seviye}-${x.SubeAd}`, veliSayisi: x.VeliSayisi,
      epostaliVeli: x.EpostaliVeli, gorebilir: !!x.Gorebilir, sms: x.Sms, eposta: x.Eposta, sonBildirim: x.SonBildirim, acildi: x.Acildi }));
  }

  async goruntulemeKaydet(listeId: number, ogrenciId: number, veliId: number) {
    await q(`MERGE dbo.KitapListeGoruntuleme WITH (HOLDLOCK) AS t
             USING (SELECT @l AS KitapListeId, @o AS OgrenciId) s ON t.KitapListeId = s.KitapListeId AND t.OgrenciId = s.OgrenciId
             WHEN MATCHED THEN UPDATE SET SonTarih = SYSDATETIME()
             WHEN NOT MATCHED THEN INSERT (KitapListeId, OgrenciId, VeliId) VALUES (@l, @o, @v);`, [
      ['l', sql.Int, listeId], ['o', sql.Int, ogrenciId], ['v', sql.Int, veliId]]);
  }

  async sonYayinlar(okulId: number | null, limit = 10, yayinlayanId?: number): Promise<YayinOzeti[]> {
    const r = await q<{ YayinId: number; ListeId: number; ListeAd: string; OkulId: number; OkulAd: string; KapsamAd: string; HedefTipi: KitapListesi['hedefTipi'];
      OgrenciSayisi: number; SmsSayisi: number; EpostaSayisi: number; Hatirlatma: boolean; Tarih: Date; Yayinlayan: string; Tip: YayinOzeti['yayinlayanTip'] }>(
      `SELECT TOP (@lim) y.Id AS YayinId, l.Id AS ListeId, l.Ad AS ListeAd, l.OkulId, ok.Ad AS OkulAd, l.KapsamAd, y.HedefTipi,
              y.OgrenciSayisi, y.SmsSayisi, y.EpostaSayisi, y.HatirlatmaMi AS Hatirlatma,
              y.Tarih, k.AdSoyad AS Yayinlayan, k.Tip
       FROM dbo.KitapListeYayin y
       JOIN (${LISTE_SEC}) l ON l.Id = y.KitapListeId
       JOIN dbo.Okul ok ON ok.Id = l.OkulId
       JOIN dbo.Kullanici k ON k.Id = y.YayinlayanKullaniciId
       WHERE (@o IS NULL OR l.OkulId = @o) AND (@u IS NULL OR y.YayinlayanKullaniciId = @u)
       ORDER BY y.Tarih DESC, y.Id DESC`, [['lim', sql.Int, limit], ['o', sql.Int, okulId], ['u', sql.Int, yayinlayanId ?? null]]);
    return r.map((x) => ({ yayinId: x.YayinId, listeId: x.ListeId, listeAd: x.ListeAd, okulId: x.OkulId, okulAd: x.OkulAd, kapsamAd: x.KapsamAd,
      hedefTipi: x.HedefTipi, ogrenciSayisi: x.OgrenciSayisi, smsSayisi: x.SmsSayisi, epostaSayisi: x.EpostaSayisi, hatirlatma: !!x.Hatirlatma,
      tarih: x.Tarih, yayinlayan: x.Yayinlayan, yayinlayanTip: x.Tip }));
  }

  async bildirimleriEkle(b: Omit<Bildirim, 'id'>[]): Promise<Bildirim[]> {
    const out: Bildirim[] = [];
    for (const x of b) {
      const r = await q<{ Id: number }>(
        `INSERT INTO dbo.Bildirim (KitapListeYayinId, VeliId, OgrenciId, Kanal, Alici, Konu, Metin) OUTPUT inserted.Id
         VALUES (@y, @v, @o, @k, @a, @ko, @m)`, [
          ['y', sql.Int, x.yayinId], ['v', sql.Int, x.veliId], ['o', sql.Int, x.ogrenciId], ['k', sql.VarChar(10), x.kanal],
          ['a', sql.NVarChar(150), x.alici], ['ko', sql.NVarChar(200), x.konu], ['m', sql.NVarChar(sql.MAX), x.metin]]);
      out.push({ ...x, id: Number(r[0].Id) });
    }
    return out;
  }

  async bildirimDurum(id: number, durum: 'Gonderildi' | 'Hata', d?: { saglayiciId?: string; hata?: string }) {
    await q(`UPDATE dbo.Bildirim SET Durum = @d, DenemeSayisi = DenemeSayisi + 1, SaglayiciMesajId = @s, HataMesaji = @h,
             GonderimTarihi = CASE WHEN @d = 'Gonderildi' THEN SYSDATETIME() ELSE GonderimTarihi END WHERE Id = @id`, [
      ['id', sql.BigInt, id], ['d', sql.VarChar(10), durum], ['s', sql.NVarChar(100), d?.saglayiciId ?? null], ['h', sql.NVarChar(500), d?.hata?.slice(0, 500) ?? null]]);
  }
}
