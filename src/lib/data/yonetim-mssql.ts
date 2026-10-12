import 'server-only';
import sql from 'mssql';
import { AKTIF_SEZON, havuz, q, type Param } from './mssql';
import { katla, sqlKatla } from '../katla';
import {
  KayitHatasi, sinifAdi,
  type AramaFiltresi, type HedefTip, type IslemKaydi, type OgrenciGirdi, type OgrenciKaydi, type OkulGirdi, type OkulKaydi,
  type PersonelGirdi, type PersonelKaydi, type PersonelTipi, type SinifKaydi, type VeliKaydi, type YonetimRepo,
} from './yonetim';
import type { PartiDurum, YuklemeParti, YuklemeSatiri } from '../yukleme/tipler';

/** SQL Server benzersizlik hatalarını kullanıcıya gösterilebilir mesaja çevirir (2601/2627). */
async function benzersiz<T>(f: () => Promise<T>, mesajlar: Record<string, string>): Promise<T> {
  try {
    return await f();
  } catch (e) {
    const m = String((e as Error).message);
    const no = (e as { number?: number }).number;
    if (no === 2601 || no === 2627) {
      for (const [kisit, mesaj] of Object.entries(mesajlar)) if (m.includes(kisit)) throw new KayitHatasi(mesaj);
      throw new KayitHatasi('Bu bilgilerle başka bir kayıt var');
    }
    throw e;
  }
}

const ids = (l: number[]) => l.join(',') || '0';

interface OkulDb { Id: number; Kod: string; Ad: string; Il: string; Ilce: string; Adres: string | null; Telefon: string | null; Eposta: string | null;
  OpakCariKodu: string | null; OpakWebCariKodu: string | null; AktifMi: boolean; Slug: string | null }
const okulMap = (o: OkulDb): OkulKaydi => ({ id: o.Id, kod: o.Kod, ad: o.Ad, il: o.Il, ilce: o.Ilce, adres: o.Adres, telefon: o.Telefon, eposta: o.Eposta,
  opakCariKodu: o.OpakCariKodu, opakWebCariKodu: o.OpakWebCariKodu, aktif: !!o.AktifMi, slug: o.Slug });
const OKUL_SEC = `SELECT Id, Kod, Ad, Il, Ilce, Adres, Telefon, Eposta, OpakCariKodu, OpakWebCariKodu, AktifMi, Slug FROM dbo.Okul`;

const okulParam = (o: OkulGirdi): Param[] => [
  ['kod', sql.VarChar(20), o.kod], ['ad', sql.NVarChar(200), o.ad], ['il', sql.NVarChar(50), o.il], ['ilce', sql.NVarChar(50), o.ilce],
  ['adres', sql.NVarChar(500), o.adres], ['tel', sql.VarChar(10), o.telefon], ['ep', sql.NVarChar(150), o.eposta],
  ['oc', sql.NVarChar(30), o.opakCariKodu], ['ow', sql.NVarChar(30), o.opakWebCariKodu], ['ak', sql.Bit, o.aktif]];
const OKUL_HATA = { UQ_Okul_Kod: 'Bu okul kodu başka bir okulda kullanılıyor', UX_Okul_OpakCari: 'Bu Opak cari kodu başka bir okulda kullanılıyor',
  UX_Okul_OpakWebCari: 'Bu web cari kodu başka bir okulda kullanılıyor' };

interface VeliDb { Id: number; Telefon: string; AdSoyad: string | null; Eposta: string | null; Yakinlik: string | null; SifreVar: boolean;
  KilitBitisTarihi: Date | null; SonGirisTarihi: Date | null; AktifMi: boolean }

interface PersonelDb { Id: number; Tip: PersonelTipi; OkulId: number | null; OkulAd: string | null; AdSoyad: string; Eposta: string; Telefon: string | null;
  AktifMi: boolean; KilitBitisTarihi: Date | null; SifreDegistirmeliMi: boolean; SonGirisTarihi: Date | null; Yetkiler: string | null }

const kilitli = (t: Date | null) => !!t && new Date(t).getTime() > Date.now();

export class MssqlYonetimRepo implements YonetimRepo {
  // ---- okul
  async okulKaydi(id: number) { const r = await q<OkulDb>(`${OKUL_SEC} WHERE Id = @id`, [['id', sql.Int, id]]); return r[0] ? okulMap(r[0]) : null; }
  async okulListesi(pasifDahil = false) { return (await q<OkulDb>(`${OKUL_SEC} WHERE @p = 1 OR AktifMi = 1 ORDER BY Kod`, [['p', sql.Bit, pasifDahil]])).map(okulMap); }
  async okulKodOner() {
    const r = await q<{ N: number | null }>(`SELECT MAX(TRY_CAST(SUBSTRING(Kod, 4, 20) AS INT)) AS N FROM dbo.Okul WHERE Kod LIKE 'OK-%'`);
    return `OK-${Math.max(1000, r[0]?.N ?? 0) + 1}`;
  }
  async okulEkle(o: OkulGirdi) {
    const r = await benzersiz(() => q<{ Id: number }>(
      `INSERT INTO dbo.Okul (Kod, Ad, Il, Ilce, Adres, Telefon, Eposta, OpakCariKodu, OpakWebCariKodu, AktifMi) OUTPUT inserted.Id
       VALUES (@kod, @ad, @il, @ilce, @adres, @tel, @ep, @oc, @ow, @ak)`, okulParam(o)), OKUL_HATA);
    return r[0].Id;
  }
  async okulGuncelle(id: number, o: OkulGirdi) {
    await benzersiz(() => q(`UPDATE dbo.Okul SET Kod = @kod, Ad = @ad, Il = @il, Ilce = @ilce, Adres = @adres, Telefon = @tel, Eposta = @ep,
      OpakCariKodu = @oc, OpakWebCariKodu = @ow, AktifMi = @ak, GuncellemeTarihi = SYSDATETIME() WHERE Id = @id`, [...okulParam(o), ['id', sql.Int, id]]), OKUL_HATA);
  }

  // ---- sınıf / şube
  async okulSiniflari(okulId: number): Promise<SinifKaydi[]> {
    const r = await q<{ SinifId: number; Seviye: number; Ad: string; SubeId: number | null; SubeAd: string | null; Ogrenci: number; Ogretmen: number }>(
      `SELECT sn.Id AS SinifId, sn.Seviye, sn.Ad, sb.Id AS SubeId, sb.Ad AS SubeAd,
              (SELECT COUNT(*) FROM dbo.OgrenciSezon os JOIN dbo.Ogrenci o ON o.Id = os.OgrenciId AND o.AktifMi = 1 WHERE os.SubeId = sb.Id AND os.SezonId = sn.SezonId) AS Ogrenci,
              (SELECT COUNT(DISTINCT KullaniciId) FROM dbo.OgretmenSube WHERE SubeId = sb.Id) AS Ogretmen
       FROM dbo.Sinif sn LEFT JOIN dbo.Sube sb ON sb.SinifId = sn.Id
       WHERE sn.OkulId = @o AND sn.SezonId = ${AKTIF_SEZON} ORDER BY sn.Seviye, sb.Ad`, [['o', sql.Int, okulId]]);
    const out: SinifKaydi[] = [];
    for (const x of r) {
      let s = out.find((k) => k.id === x.SinifId);
      if (!s) { s = { id: x.SinifId, seviye: x.Seviye, ad: x.Ad, subeler: [] }; out.push(s); }
      if (x.SubeId != null) s.subeler.push({ id: x.SubeId, ad: x.SubeAd!, ogrenci: x.Ogrenci, ogretmen: x.Ogretmen });
    }
    return out;
  }
  async sinifEkle(okulId: number, seviye: number) {
    const r = await benzersiz(() => q<{ Id: number }>(`INSERT INTO dbo.Sinif (OkulId, SezonId, Seviye, Ad) OUTPUT inserted.Id VALUES (@o, ${AKTIF_SEZON}, @s, @ad)`,
      [['o', sql.Int, okulId], ['s', sql.TinyInt, seviye], ['ad', sql.NVarChar(50), sinifAdi(seviye)]]), { UQ_Sinif: `${sinifAdi(seviye)} zaten var` });
    return r[0].Id;
  }
  async subeEkle(sinifId: number, ad: string) {
    const r = await benzersiz(() => q<{ Id: number }>(`INSERT INTO dbo.Sube (SinifId, Ad) OUTPUT inserted.Id VALUES (@s, @ad)`,
      [['s', sql.Int, sinifId], ['ad', sql.NVarChar(20), ad]]), { UQ_Sube: `${ad} şubesi zaten var` });
    return r[0].Id;
  }
  async subeSil(subeId: number) {
    const r = await q<{ Ogr: number; Liste: number }>(`SELECT (SELECT COUNT(*) FROM dbo.OgrenciSezon WHERE SubeId = @s) AS Ogr,
      (SELECT COUNT(*) FROM dbo.KitapListe WHERE SubeId = @s) AS Liste`, [['s', sql.Int, subeId]]);
    if (r[0].Ogr) throw new KayitHatasi('Şubede öğrenci var; önce öğrencileri başka şubeye taşıyın');
    if (r[0].Liste) throw new KayitHatasi('Bu şubenin tavsiye sepeti var; şube silinemez');
    await q(`DELETE FROM dbo.OgretmenSube WHERE SubeId = @s; DELETE FROM dbo.Sube WHERE Id = @s;`, [['s', sql.Int, subeId]]);
  }
  async subeOkulu(subeId: number) {
    const r = await q<{ OkulId: number }>(`SELECT sn.OkulId FROM dbo.Sube sb JOIN dbo.Sinif sn ON sn.Id = sb.SinifId WHERE sb.Id = @s`, [['s', sql.Int, subeId]]);
    return r[0]?.OkulId ?? null;
  }
  async sinifOkulu(sinifId: number) {
    const r = await q<{ OkulId: number }>(`SELECT OkulId FROM dbo.Sinif WHERE Id = @s`, [['s', sql.Int, sinifId]]);
    return r[0]?.OkulId ?? null;
  }

  // ---- öğrenci / veli
  private async velilerOf(ogrenciIdleri: number[]): Promise<Map<number, VeliKaydi[]>> {
    const m = new Map<number, VeliKaydi[]>();
    if (!ogrenciIdleri.length) return m;
    const r = await q<VeliDb & { OgrenciId: number }>(
      `SELECT vo.OgrenciId, v.Id, v.Telefon, v.AdSoyad, v.Eposta, vo.Yakinlik, CAST(CASE WHEN v.SifreHash IS NULL THEN 0 ELSE 1 END AS BIT) AS SifreVar,
              v.KilitBitisTarihi, v.SonGirisTarihi, v.AktifMi
       FROM dbo.VeliOgrenci vo JOIN dbo.Veli v ON v.Id = vo.VeliId
       WHERE vo.OgrenciId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`, [['ids', sql.NVarChar(sql.MAX), ids(ogrenciIdleri)]]);
    const kardes = await this.veliOgrencileri([...new Set(r.map((x) => x.Id))]);
    for (const x of r) {
      m.set(x.OgrenciId, [...(m.get(x.OgrenciId) ?? []), { id: x.Id, telefon: x.Telefon, adSoyad: x.AdSoyad, eposta: x.Eposta, yakinlik: x.Yakinlik,
        sifreVar: !!x.SifreVar, kilitli: kilitli(x.KilitBitisTarihi), sonGiris: x.SonGirisTarihi, aktif: !!x.AktifMi, ogrenciler: kardes.get(x.Id) ?? [] }]);
    }
    return m;
  }
  private async veliOgrencileri(veliIdleri: number[]) {
    const m = new Map<number, VeliKaydi['ogrenciler']>();
    if (!veliIdleri.length) return m;
    const r = await q<{ VeliId: number; Id: number; Ad: string; OkulAd: string; SinifSube: string | null }>(
      `SELECT vo.VeliId, o.Id, CONCAT(o.Ad, ' ', o.Soyad) AS Ad, ok.Ad AS OkulAd,
              (SELECT CONCAT(sn.Seviye, '-', sb.Ad) FROM dbo.OgrenciSezon os JOIN dbo.Sube sb ON sb.Id = os.SubeId JOIN dbo.Sinif sn ON sn.Id = sb.SinifId
               WHERE os.OgrenciId = o.Id AND os.SezonId = ${AKTIF_SEZON}) AS SinifSube
       FROM dbo.VeliOgrenci vo JOIN dbo.Ogrenci o ON o.Id = vo.OgrenciId JOIN dbo.Okul ok ON ok.Id = o.OkulId
       WHERE vo.VeliId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`, [['ids', sql.NVarChar(sql.MAX), ids(veliIdleri)]]);
    for (const x of r) m.set(x.VeliId, [...(m.get(x.VeliId) ?? []), { id: x.Id, ad: x.Ad, okulAd: x.OkulAd, sinifSube: x.SinifSube ?? '—' }]);
    return m;
  }

  private async ogrenciSorgu(where: string, params: Param[], limit: number, veliler: boolean): Promise<OgrenciKaydi[]> {
    const r = await q<{ Id: number; OkulId: number; OkulAd: string; OkulNo: string; Ad: string; Soyad: string; SubeId: number | null; Seviye: number | null; SubeAd: string | null; AktifMi: boolean }>(
      `SELECT TOP (@lim) o.Id, o.OkulId, ok.Ad AS OkulAd, o.OkulNo, o.Ad, o.Soyad, sb.Id AS SubeId, sn.Seviye, sb.Ad AS SubeAd, o.AktifMi
       FROM dbo.Ogrenci o JOIN dbo.Okul ok ON ok.Id = o.OkulId
       LEFT JOIN dbo.OgrenciSezon os ON os.OgrenciId = o.Id AND os.SezonId = ${AKTIF_SEZON}
       LEFT JOIN dbo.Sube sb ON sb.Id = os.SubeId LEFT JOIN dbo.Sinif sn ON sn.Id = sb.SinifId
       WHERE ${where} ORDER BY o.Ad, o.Soyad`, [...params, ['lim', sql.Int, limit]]);
    const vm = veliler ? await this.velilerOf(r.map((x) => x.Id)) : new Map();
    return r.map((x) => ({ id: x.Id, okulId: x.OkulId, okulAd: x.OkulAd, okulNo: x.OkulNo, ad: x.Ad, soyad: x.Soyad, subeId: x.SubeId,
      sinifSube: x.SubeId ? `${x.Seviye}-${x.SubeAd}` : null, aktif: !!x.AktifMi, veliler: vm.get(x.Id) ?? [] }));
  }
  async ogrenciAra(f: AramaFiltresi) {
    const qs = (f.q ?? '').trim();
    const rakam = qs.replace(/\D/g, '').replace(/^0/, '');
    return this.ogrenciSorgu(`(@pasif = 1 OR o.AktifMi = 1) AND (@okul IS NULL OR o.OkulId = @okul) AND (@sube IS NULL OR os.SubeId = @sube)
      AND (@q = '' OR ${sqlKatla("CONCAT(o.Ad, ' ', o.Soyad)")} LIKE @l OR o.OkulNo = @q
           OR (LEN(@tel) >= 4 AND EXISTS (SELECT 1 FROM dbo.VeliOgrenci vo JOIN dbo.Veli v ON v.Id = vo.VeliId WHERE vo.OgrenciId = o.Id AND v.Telefon LIKE @tl)))`,
      [['pasif', sql.Bit, !!f.pasifDahil], ['okul', sql.Int, f.okulId ?? null], ['sube', sql.Int, f.subeId ?? null], ['q', sql.NVarChar(100), qs],
       ['l', sql.NVarChar(110), `%${katla(qs)}%`], ['tel', sql.VarChar(10), rakam], ['tl', sql.VarChar(12), `%${rakam}%`]], f.limit ?? 100, true);
  }
  async ogrenciKaydi(id: number) { return (await this.ogrenciSorgu('o.Id = @id', [['id', sql.Int, id]], 1, true))[0] ?? null; }

  private async subeYaz(ogrenciId: number, subeId: number, tx: sql.Transaction) {
    await q(`MERGE dbo.OgrenciSezon AS t USING (SELECT @o AS OgrenciId, ${AKTIF_SEZON} AS SezonId) s ON t.OgrenciId = s.OgrenciId AND t.SezonId = s.SezonId
             WHEN MATCHED THEN UPDATE SET SubeId = @s WHEN NOT MATCHED THEN INSERT (OgrenciId, SezonId, SubeId) VALUES (@o, s.SezonId, @s);`,
      [['o', sql.Int, ogrenciId], ['s', sql.Int, subeId]], tx);
  }
  async ogrenciEkle(o: OgrenciGirdi) {
    const tx = new sql.Transaction(await havuz());
    await tx.begin();
    try {
      const r = await benzersiz(() => q<{ Id: number }>(`INSERT INTO dbo.Ogrenci (OkulId, OkulNo, Ad, Soyad, AktifMi) OUTPUT inserted.Id VALUES (@ok, @no, @ad, @soy, @ak)`, [
        ['ok', sql.Int, o.okulId], ['no', sql.NVarChar(20), o.okulNo], ['ad', sql.NVarChar(100), o.ad], ['soy', sql.NVarChar(100), o.soyad], ['ak', sql.Bit, o.aktif]], tx),
        { UQ_Ogrenci_OkulNo: `Bu okulda ${o.okulNo} numaralı başka bir öğrenci var` });
      await this.subeYaz(r[0].Id, o.subeId, tx);
      await tx.commit();
      return r[0].Id;
    } catch (e) { await tx.rollback(); throw e; }
  }
  async ogrenciGuncelle(id: number, o: Omit<OgrenciGirdi, 'okulId'>) {
    const tx = new sql.Transaction(await havuz());
    await tx.begin();
    try {
      await benzersiz(() => q(`UPDATE dbo.Ogrenci SET OkulNo = @no, Ad = @ad, Soyad = @soy, AktifMi = @ak, GuncellemeTarihi = SYSDATETIME() WHERE Id = @id`, [
        ['id', sql.Int, id], ['no', sql.NVarChar(20), o.okulNo], ['ad', sql.NVarChar(100), o.ad], ['soy', sql.NVarChar(100), o.soyad], ['ak', sql.Bit, o.aktif]], tx),
        { UQ_Ogrenci_OkulNo: `Bu okulda ${o.okulNo} numaralı başka bir öğrenci var` });
      await this.subeYaz(id, o.subeId, tx);
      await tx.commit();
    } catch (e) { await tx.rollback(); throw e; }
  }

  private async veliTek(where: string, p: Param[]) {
    const r = await q<VeliDb>(`SELECT v.Id, v.Telefon, v.AdSoyad, v.Eposta, NULL AS Yakinlik, CAST(CASE WHEN v.SifreHash IS NULL THEN 0 ELSE 1 END AS BIT) AS SifreVar,
      v.KilitBitisTarihi, v.SonGirisTarihi, v.AktifMi FROM dbo.Veli v WHERE ${where}`, p);
    const x = r[0];
    if (!x) return null;
    const k = await this.veliOgrencileri([x.Id]);
    return { id: x.Id, telefon: x.Telefon, adSoyad: x.AdSoyad, eposta: x.Eposta, yakinlik: null, sifreVar: !!x.SifreVar, kilitli: kilitli(x.KilitBitisTarihi),
      sonGiris: x.SonGirisTarihi, aktif: !!x.AktifMi, ogrenciler: k.get(x.Id) ?? [] } as VeliKaydi;
  }
  async veliKaydi(id: number) { return this.veliTek('v.Id = @id', [['id', sql.Int, id]]); }
  async veliTelefonKaydi(telefon: string) { return this.veliTek('v.Telefon = @t', [['t', sql.VarChar(10), telefon]]); }
  async veliBagla(ogrenciId: number, g: { telefon: string; adSoyad: string | null; eposta: string | null; yakinlik: string | null }) {
    const tx = new sql.Transaction(await havuz());
    await tx.begin();
    try {
      const mevcut = await q<{ Id: number }>(`SELECT Id FROM dbo.Veli WITH (UPDLOCK, HOLDLOCK) WHERE Telefon = @t`, [['t', sql.VarChar(10), g.telefon]], tx);
      let veliId = mevcut[0]?.Id;
      const yeni = !veliId;
      if (!veliId) {
        veliId = (await q<{ Id: number }>(`INSERT INTO dbo.Veli (Telefon, AdSoyad, Eposta) OUTPUT inserted.Id VALUES (@t, @ad, @ep)`, [
          ['t', sql.VarChar(10), g.telefon], ['ad', sql.NVarChar(150), g.adSoyad], ['ep', sql.NVarChar(150), g.eposta]], tx))[0].Id;
      } else {
        await q(`UPDATE dbo.Veli SET AdSoyad = COALESCE(AdSoyad, @ad), Eposta = COALESCE(Eposta, @ep) WHERE Id = @v`, [
          ['v', sql.Int, veliId], ['ad', sql.NVarChar(150), g.adSoyad], ['ep', sql.NVarChar(150), g.eposta]], tx);
      }
      await benzersiz(() => q(`INSERT INTO dbo.VeliOgrenci (VeliId, OgrenciId, Yakinlik) VALUES (@v, @o, @y)`, [
        ['v', sql.Int, veliId], ['o', sql.Int, ogrenciId], ['y', sql.NVarChar(30), g.yakinlik]], tx), { PK_VeliOgrenci: 'Bu veli zaten bu öğrenciye bağlı' });
      await tx.commit();
      return { veliId, yeni };
    } catch (e) { await tx.rollback(); throw e; }
  }
  async veliAyir(ogrenciId: number, veliId: number) {
    await q(`DELETE FROM dbo.VeliOgrenci WHERE VeliId = @v AND OgrenciId = @o`, [['v', sql.Int, veliId], ['o', sql.Int, ogrenciId]]);
  }
  async veliDuzenle(id: number, g: { telefon: string; adSoyad: string | null; eposta: string | null; aktif: boolean }) {
    await benzersiz(() => q(`UPDATE dbo.Veli SET Telefon = @t, AdSoyad = @ad, Eposta = @ep, AktifMi = @ak,
        TelefonDogrulandiMi = CASE WHEN Telefon = @t THEN TelefonDogrulandiMi ELSE 0 END WHERE Id = @id`, [
      ['id', sql.Int, id], ['t', sql.VarChar(10), g.telefon], ['ad', sql.NVarChar(150), g.adSoyad], ['ep', sql.NVarChar(150), g.eposta], ['ak', sql.Bit, g.aktif]]),
      { UQ_Veli_Telefon: 'Bu telefon başka bir veliye kayıtlı' });
  }
  async veliSifreSifirla(id: number) {
    await q(`UPDATE dbo.Veli SET SifreHash = NULL, BasarisizGirisSayisi = 0, KilitBitisTarihi = NULL WHERE Id = @id`, [['id', sql.Int, id]]);
  }
  async veliKilitAc(id: number) {
    await q(`UPDATE dbo.Veli SET BasarisizGirisSayisi = 0, KilitBitisTarihi = NULL WHERE Id = @id`, [['id', sql.Int, id]]);
  }

  // ---- kullanıcılar
  private async personelSorgu(where: string, p: Param[]): Promise<PersonelKaydi[]> {
    const r = await q<PersonelDb>(
      `SELECT k.Id, k.Tip, k.OkulId, ok.Ad AS OkulAd, k.AdSoyad, k.Eposta, k.Telefon, k.AktifMi, k.KilitBitisTarihi, k.SifreDegistirmeliMi, k.SonGirisTarihi,
              (SELECT STRING_AGG(y.Yetki, ',') FROM dbo.KullaniciYetki y WHERE y.KullaniciId = k.Id) AS Yetkiler
       FROM dbo.Kullanici k LEFT JOIN dbo.Okul ok ON ok.Id = k.OkulId WHERE ${where} ORDER BY k.AdSoyad`, p);
    const sb = r.length ? await q<{ KullaniciId: number; SubeId: number; Ad: string }>(
      `SELECT DISTINCT os.KullaniciId, os.SubeId, CONCAT(sn.Seviye, '-', s.Ad) AS Ad FROM dbo.OgretmenSube os
       JOIN dbo.Sube s ON s.Id = os.SubeId JOIN dbo.Sinif sn ON sn.Id = s.SinifId
       WHERE os.KullaniciId IN (SELECT CAST(value AS INT) FROM STRING_SPLIT(@ids, ','))`, [['ids', sql.NVarChar(sql.MAX), ids(r.map((x) => x.Id))]]) : [];
    return r.map((k) => ({ id: k.Id, tip: k.Tip, okulId: k.OkulId, okulAd: k.OkulAd, adSoyad: k.AdSoyad, eposta: k.Eposta, telefon: k.Telefon,
      aktif: !!k.AktifMi, kilitli: kilitli(k.KilitBitisTarihi), sifreDegistirmeli: !!k.SifreDegistirmeliMi, sonGiris: k.SonGirisTarihi,
      yetkiler: k.Yetkiler ? k.Yetkiler.split(',') : [], subeler: sb.filter((s) => s.KullaniciId === k.Id).map((s) => ({ id: s.SubeId, ad: s.Ad })) }));
  }
  async personelListesi(f: { q?: string; tip?: PersonelTipi | null; okulId?: number | null; pasifDahil?: boolean }) {
    const qs = (f.q ?? '').trim();
    return this.personelSorgu(`(@pasif = 1 OR k.AktifMi = 1) AND (@tip IS NULL OR k.Tip = @tip) AND (@okul IS NULL OR k.OkulId = @okul)
      AND (@q = '' OR ${sqlKatla('k.AdSoyad')} LIKE @l OR ${sqlKatla('k.Eposta')} LIKE @l OR k.Telefon LIKE @l)`, [
      ['pasif', sql.Bit, !!f.pasifDahil], ['tip', sql.VarChar(10), f.tip ?? null], ['okul', sql.Int, f.okulId ?? null],
      ['q', sql.NVarChar(150), qs], ['l', sql.NVarChar(160), `%${katla(qs)}%`]]);
  }
  async personelKaydi(id: number) { return (await this.personelSorgu('k.Id = @id', [['id', sql.Int, id]]))[0] ?? null; }

  private async yetkiVeSubeYaz(id: number, g: PersonelGirdi, tx: sql.Transaction) {
    await q(`DELETE FROM dbo.KullaniciYetki WHERE KullaniciId = @id; DELETE FROM dbo.OgretmenSube WHERE KullaniciId = @id;`, [['id', sql.Int, id]], tx);
    if (g.tip === 'Okul' && g.yetkiler.length) {
      await q(`INSERT INTO dbo.KullaniciYetki (KullaniciId, Yetki) SELECT @id, value FROM STRING_SPLIT(@y, ',')`, [['id', sql.Int, id], ['y', sql.VarChar(300), g.yetkiler.join(',')]], tx);
    }
    if (g.tip === 'Ogretmen' && g.subeIdleri.length) {
      await q(`INSERT INTO dbo.OgretmenSube (KullaniciId, SubeId) SELECT @id, CAST(value AS INT) FROM STRING_SPLIT(@s, ',')`, [['id', sql.Int, id], ['s', sql.NVarChar(sql.MAX), ids(g.subeIdleri)]], tx);
    }
  }
  private personelParam(g: PersonelGirdi): Param[] {
    return [['tip', sql.VarChar(10), g.tip], ['okul', sql.Int, g.okulId], ['ad', sql.NVarChar(150), g.adSoyad], ['ep', sql.NVarChar(150), g.eposta],
      ['tel', sql.VarChar(10), g.telefon], ['ak', sql.Bit, g.aktif]];
  }
  async personelEkle(g: PersonelGirdi, sifreHash: string) {
    const tx = new sql.Transaction(await havuz());
    await tx.begin();
    try {
      const r = await benzersiz(() => q<{ Id: number }>(`INSERT INTO dbo.Kullanici (Tip, OkulId, AdSoyad, Eposta, Telefon, SifreHash, SifreDegistirmeliMi, AktifMi)
        OUTPUT inserted.Id VALUES (@tip, @okul, @ad, @ep, @tel, @sh, 1, @ak)`, [...this.personelParam(g), ['sh', sql.VarChar(255), sifreHash]], tx),
        { UQ_Kullanici_Eposta: 'Bu e-posta başka bir kullanıcıya kayıtlı' });
      await this.yetkiVeSubeYaz(r[0].Id, g, tx);
      await tx.commit();
      return r[0].Id;
    } catch (e) { await tx.rollback(); throw e; }
  }
  async personelDuzenle(id: number, g: PersonelGirdi) {
    const tx = new sql.Transaction(await havuz());
    await tx.begin();
    try {
      await benzersiz(() => q(`UPDATE dbo.Kullanici SET Tip = @tip, OkulId = @okul, AdSoyad = @ad, Eposta = @ep, Telefon = @tel, AktifMi = @ak WHERE Id = @id`,
        [...this.personelParam(g), ['id', sql.Int, id]], tx), { UQ_Kullanici_Eposta: 'Bu e-posta başka bir kullanıcıya kayıtlı' });
      await this.yetkiVeSubeYaz(id, g, tx);
      await tx.commit();
    } catch (e) { await tx.rollback(); throw e; }
  }
  async personelSifreAta(id: number, sifreHash: string, degistirmeli: boolean) {
    await q(`UPDATE dbo.Kullanici SET SifreHash = @sh, SifreDegistirmeliMi = @d, BasarisizGirisSayisi = 0, KilitBitisTarihi = NULL WHERE Id = @id`, [
      ['id', sql.Int, id], ['sh', sql.VarChar(255), sifreHash], ['d', sql.Bit, degistirmeli]]);
  }
  async personelKilitAc(id: number) {
    await q(`UPDATE dbo.Kullanici SET BasarisizGirisSayisi = 0, KilitBitisTarihi = NULL WHERE Id = @id`, [['id', sql.Int, id]]);
  }

  // ---- Excel ile öğrenci yükleme
  async ogrencilerOkulNo(okulId: number, okulNolar: string[]) {
    if (!okulNolar.length) return [];
    return this.ogrenciSorgu(`o.OkulId = @ok AND o.OkulNo IN (SELECT value FROM STRING_SPLIT(@nolar, NCHAR(31)))`,
      [['ok', sql.Int, okulId], ['nolar', sql.NVarChar(sql.MAX), okulNolar.join('\u001f')]], okulNolar.length + 1, true);
  }
  async velilerTelefonla(telefonlar: string[]) {
    if (!telefonlar.length) return [];
    const r = await q<VeliDb>(`SELECT v.Id, v.Telefon, v.AdSoyad, v.Eposta, NULL AS Yakinlik, CAST(CASE WHEN v.SifreHash IS NULL THEN 0 ELSE 1 END AS BIT) AS SifreVar,
      v.KilitBitisTarihi, v.SonGirisTarihi, v.AktifMi FROM dbo.Veli v WHERE v.Telefon IN (SELECT value FROM STRING_SPLIT(@t, ','))`, [['t', sql.VarChar(sql.MAX), telefonlar.join(',')]]);
    const k = await this.veliOgrencileri(r.map((x) => x.Id));
    return r.map((x) => ({ id: x.Id, telefon: x.Telefon, adSoyad: x.AdSoyad, eposta: x.Eposta, yakinlik: null, sifreVar: !!x.SifreVar,
      kilitli: kilitli(x.KilitBitisTarihi), sonGiris: x.SonGirisTarihi, aktif: !!x.AktifMi, ogrenciler: k.get(x.Id) ?? [] }));
  }
  async yuklemeOlustur(p: { okulId: number | null; dosyaAdi: string; kullaniciId: number; subeOtomatikAc: boolean }, satirlar: YuklemeSatiri[]) {
    const tx = new sql.Transaction(await havuz());
    await tx.begin();
    try {
      const r = await q<{ Id: number }>(`INSERT INTO dbo.OgrenciYuklemeParti (OkulId, SezonId, DosyaAdi, YukleyenKullaniciId, ToplamSatir, HataliSatir, SubeOtomatikAc)
        OUTPUT inserted.Id VALUES (@ok, ${AKTIF_SEZON}, @ad, @k, @t, @h, @sa)`, [['ok', sql.Int, p.okulId], ['ad', sql.NVarChar(255), p.dosyaAdi.slice(0, 255)],
        ['k', sql.Int, p.kullaniciId], ['t', sql.Int, satirlar.length], ['h', sql.Int, satirlar.filter((x) => x.hata).length], ['sa', sql.Bit, p.subeOtomatikAc]], tx);
      const id = r[0].Id;
      const t = new sql.Table('dbo.OgrenciYuklemeSatir');
      t.create = false;
      t.columns.add('PartiId', sql.Int, { nullable: false });
      t.columns.add('SatirNo', sql.Int, { nullable: false });
      for (const [c, n] of [['OkulNo', 50], ['Ad', 200], ['Soyad', 200], ['Sinif', 50], ['Sube', 50], ['VeliAdSoyad', 300], ['VeliTelefon', 30], ['VeliTelefon2', 30],
        ['VeliEposta', 300], ['OkulKodu', 50]] as const) t.columns.add(c, sql.NVarChar(n), { nullable: true });
      t.columns.add('OkulId', sql.Int, { nullable: true });
      t.columns.add('HataMesaji', sql.NVarChar(500), { nullable: true });
      t.columns.add('Uyari', sql.NVarChar(500), { nullable: true });
      t.columns.add('Islem', sql.VarChar(10), { nullable: true });
      const k = (v: string | null, n: number) => (v == null ? null : v.slice(0, n));
      for (const x of satirlar) {
        t.rows.add(id, x.satirNo, k(x.okulNo, 50), k(x.ad, 200), k(x.soyad, 200), k(x.sinif, 50), k(x.sube, 50), k(x.veliAdSoyad, 300), k(x.veliTelefon, 30),
          k(x.veliTelefon2, 30), k(x.veliEposta, 300), k(x.okulKodu, 50), x.okulId, k(x.hata, 500), k(x.uyari, 500), x.islem);
      }
      await new sql.Request(tx).bulk(t);
      await tx.commit();
      return id;
    } catch (e) { await tx.rollback(); throw e; }
  }
  private async partiler(where: string, p: Param[], top: number) {
    return q<{ Id: number; OkulId: number | null; OkulAd: string | null; DosyaAdi: string; Durum: PartiDurum; ToplamSatir: number; HataliSatir: number;
      KaydedilenSatir: number; SubeOtomatikAc: boolean; OlusturmaTarihi: Date; OnayTarihi: Date | null; Yukleyen: string }>(
      `SELECT TOP (@top) y.Id, y.OkulId, ok.Ad AS OkulAd, y.DosyaAdi, y.Durum, y.ToplamSatir, y.HataliSatir, y.KaydedilenSatir, y.SubeOtomatikAc,
              y.OlusturmaTarihi, y.OnayTarihi, k.AdSoyad AS Yukleyen
       FROM dbo.OgrenciYuklemeParti y LEFT JOIN dbo.Okul ok ON ok.Id = y.OkulId JOIN dbo.Kullanici k ON k.Id = y.YukleyenKullaniciId
       WHERE ${where} ORDER BY y.Id DESC`, [...p, ['top', sql.Int, top]]);
  }
  async yuklemeParti(id: number): Promise<YuklemeParti | null> {
    const x = (await this.partiler('y.Id = @id', [['id', sql.Int, id]], 1))[0];
    if (!x) return null;
    const r = await q<{ SatirNo: number; OkulKodu: string | null; OkulNo: string | null; Ad: string | null; Soyad: string | null; Sinif: string | null; Sube: string | null;
      VeliAdSoyad: string | null; VeliTelefon: string | null; VeliTelefon2: string | null; VeliEposta: string | null; OkulId: number | null; HataMesaji: string | null;
      Uyari: string | null; Islem: 'Yeni' | 'Guncelle' | null }>(
      `SELECT SatirNo, OkulKodu, OkulNo, Ad, Soyad, Sinif, Sube, VeliAdSoyad, VeliTelefon, VeliTelefon2, VeliEposta, OkulId, HataMesaji, Uyari, Islem
       FROM dbo.OgrenciYuklemeSatir WHERE PartiId = @id ORDER BY SatirNo`, [['id', sql.Int, id]]);
    return {
      id: x.Id, okulId: x.OkulId, okulAd: x.OkulAd, dosyaAdi: x.DosyaAdi, durum: x.Durum, toplam: x.ToplamSatir, hatali: x.HataliSatir, kaydedilen: x.KaydedilenSatir,
      subeOtomatikAc: !!x.SubeOtomatikAc, olusturma: x.OlusturmaTarihi, onay: x.OnayTarihi, yukleyen: x.Yukleyen,
      satirlar: r.map((s) => ({ satirNo: s.SatirNo, okulKodu: s.OkulKodu, okulNo: s.OkulNo, ad: s.Ad, soyad: s.Soyad, sinif: s.Sinif, sube: s.Sube,
        veliAdSoyad: s.VeliAdSoyad, veliTelefon: s.VeliTelefon, veliTelefon2: s.VeliTelefon2, veliEposta: s.VeliEposta, okulId: s.OkulId,
        seviye: null, subeAd: null, hata: s.HataMesaji, uyari: s.Uyari, islem: s.Islem })),
    };
  }
  async yuklemeSatirlariYaz(id: number, satirlar: YuklemeSatiri[]) {
    const tx = new sql.Transaction(await havuz());
    await tx.begin();
    try {
      for (const x of satirlar) {
        await q(`UPDATE dbo.OgrenciYuklemeSatir SET OkulId = @ok, HataMesaji = @h, Uyari = @u, Islem = @i WHERE PartiId = @p AND SatirNo = @n`, [
          ['p', sql.Int, id], ['n', sql.Int, x.satirNo], ['ok', sql.Int, x.okulId], ['h', sql.NVarChar(500), x.hata?.slice(0, 500) ?? null],
          ['u', sql.NVarChar(500), x.uyari?.slice(0, 500) ?? null], ['i', sql.VarChar(10), x.islem]], tx);
      }
      await q(`UPDATE dbo.OgrenciYuklemeParti SET HataliSatir = @h WHERE Id = @p`, [['p', sql.Int, id], ['h', sql.Int, satirlar.filter((x) => x.hata).length]], tx);
      await tx.commit();
    } catch (e) { await tx.rollback(); throw e; }
  }
  async yuklemeBitir(id: number, durum: Exclude<PartiDurum, 'Onizleme'>, kaydedilen: number) {
    await q(`UPDATE dbo.OgrenciYuklemeParti SET Durum = @d, KaydedilenSatir = @k, OnayTarihi = SYSDATETIME() WHERE Id = @id AND Durum = 'Onizleme'`, [
      ['id', sql.Int, id], ['d', sql.VarChar(20), durum], ['k', sql.Int, kaydedilen]]);
  }
  async yuklemeGecmisi(limit = 10) {
    return (await this.partiler('1 = 1', [], limit)).map((x) => ({ id: x.Id, okulId: x.OkulId, okulAd: x.OkulAd, dosyaAdi: x.DosyaAdi, durum: x.Durum,
      toplam: x.ToplamSatir, hatali: x.HataliSatir, kaydedilen: x.KaydedilenSatir, subeOtomatikAc: !!x.SubeOtomatikAc, olusturma: x.OlusturmaTarihi,
      onay: x.OnayTarihi, yukleyen: x.Yukleyen }));
  }

  // ---- işlem kaydı
  async islemYaz(kullaniciId: number, hedef: HedefTip, hedefId: number, islem: string, ayrinti?: string | null) {
    await q(`INSERT INTO dbo.YonetimIslem (KullaniciId, HedefTip, HedefId, Islem, Ayrinti) VALUES (@k, @h, @hi, @i, @a)`, [
      ['k', sql.Int, kullaniciId], ['h', sql.VarChar(20), hedef], ['hi', sql.Int, hedefId], ['i', sql.NVarChar(100), islem], ['a', sql.NVarChar(500), ayrinti?.slice(0, 500) ?? null]]);
  }
  async islemler(hedef: HedefTip, hedefId: number, limit = 20): Promise<IslemKaydi[]> {
    const r = await q<{ Id: number; Kullanici: string; Islem: string; Ayrinti: string | null; Tarih: Date }>(
      `SELECT TOP (@lim) i.Id, k.AdSoyad AS Kullanici, i.Islem, i.Ayrinti, i.Tarih FROM dbo.YonetimIslem i JOIN dbo.Kullanici k ON k.Id = i.KullaniciId
       WHERE i.HedefTip = @h AND i.HedefId = @hi ORDER BY i.Id DESC`, [['lim', sql.Int, limit], ['h', sql.VarChar(20), hedef], ['hi', sql.Int, hedefId]]);
    return r.map((x) => ({ id: Number(x.Id), kullanici: x.Kullanici, islem: x.Islem, ayrinti: x.Ayrinti, tarih: x.Tarih }));
  }
}
