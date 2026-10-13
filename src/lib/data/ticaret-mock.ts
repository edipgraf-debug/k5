import 'server-only';
import { mockDepo as d, mockSayac as yeniId, type SetKayit, type UrunTam } from './mock';
import { KayitHatasi } from './yonetim';
import { katla } from '../katla';
import type {
  BankaHesabiGirdi, BildirimFiltresi, HakedisDurumu, HakedisTanimKaydi, KampanyaGirdi, KampanyaGonderimi, KampanyaKaydi, KategoriGirdi, KategoriKaydi, BildirimLogSatiri, GirisFiltresi, GirisGirdi, GirisSatiri, KargoBolgeGirdi, KargoFirmaGirdi,
  KargoFirmaKaydi, PosKaydi, PosKurali, PosKuraliGirdi, SayfaGirdi, SayfaKaydi, SetGirdi, SetKaydi, TahsilatFiltresi, TahsilatSatiri,
  TaksitKaydi, TerkFiltresi, TerkSepet, TicaretRepo, UrunFiltresi, UrunGuncelleme, UrunKaydi, VeliSepetSatiri,
} from './ticaret';

const kopya = <T>(x: T): T => structuredClone(x);
const t = () => d().ticaret;
const yuvarla = (n: number) => Math.round(n * 100) / 100;
const kisiAd = (id: number | null | undefined) => (id ? d().personel.find((p) => p.id === id)?.adSoyad ?? null : null);

function subeAd(subeId: number) {
  const sb = d().subeler.find((s) => s.id === subeId);
  const sn = sb && d().siniflar.find((s) => s.id === sb.sinifId);
  return sb && sn ? `${sn.seviye}-${sb.ad}` : null;
}

function urunMap(u: UrunTam): UrunKaydi {
  return {
    id: u.id, opakStokKodu: u.opakStokKodu, barkod: u.barkod, ad: u.ad, yayinevi: u.yayinevi, yazar: u.yazar, kategori: u.kategori,
    listeFiyati: u.listeFiyati, webFiyati: u.webFiyati, fiyat: u.webFiyati ?? u.listeFiyati, aciklama: u.aciklama, kapakDosya: u.kapakDosya, aktif: u.aktif,
    stok: u.stok, stokTarihi: u.stokTarihi, kategoriIdleri: t().urunKategori.filter((k) => k.urunId === u.id).map((k) => k.kategoriId),
    setSayisi: t().setler.filter((s) => s.satirlar.some((x) => x.urunId === u.id)).length,
    listeSayisi: d().listeler.filter((l) => l.satirlar.some((x) => x.urunId === u.id)).length,
    guncelleme: u.guncelleme, senkron: u.senkron,
  };
}

function setMap(s: SetKayit): SetKaydi {
  const satirlar = s.satirlar.map((x) => {
    const u = d().urunler.find((k) => k.id === x.urunId)!;
    return { urunId: u.id, ad: u.ad, barkod: u.barkod, yayinevi: u.yayinevi, birimFiyat: u.webFiyati ?? u.listeFiyati, adet: x.adet, aktif: u.aktif, stok: u.stok };
  });
  const icerikToplami = yuvarla(satirlar.reduce((a, x) => a + x.birimFiyat * x.adet, 0));
  return {
    id: s.id, barkod: s.barkod, ad: s.ad, aciklama: s.aciklama, fiyat: s.fiyat, icerikToplami, satisFiyati: s.fiyat ?? icerikToplami, aktif: s.aktif,
    satirlar, listeSayisi: d().listeler.filter((l) => l.satirlar.some((x) => x.setId === s.id)).length, olusturma: s.olusturma, guncelleme: s.guncelleme,
  };
}

/** Kategori ve tüm alt kategorilerinin kimlikleri */
function kategoriAgaci(id: number): number[] {
  const out = [id];
  for (let i = 0; i < out.length; i++) for (const k of t().kategoriler) if (k.ustId === out[i] && !out.includes(k.id)) out.push(k.id);
  return out;
}
const bugun = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);   // Türkiye saatiyle

export class MockTicaretRepo implements TicaretRepo {
  // ---------- kategori ----------
  async kategoriler(pasifDahil = true): Promise<KategoriKaydi[]> {
    return t().kategoriler.filter((k) => pasifDahil || k.aktif).map((k) => ({ ...k,
      urunSayisi: new Set(t().urunKategori.filter((x) => kategoriAgaci(k.id).includes(x.kategoriId)).map((x) => x.urunId)).size }))
      .sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, 'tr'));
  }
  async kategoriKaydet(id: number | null, g: KategoriGirdi) {
    if (t().kategoriler.some((k) => k.id !== id && k.slug === g.slug)) throw new KayitHatasi('Bu adres (slug) başka bir kategoride kullanılıyor');
    if (id && g.ustId && kategoriAgaci(id).includes(g.ustId)) throw new KayitHatasi('Kategori kendi alt kategorisinin altına taşınamaz');
    if (id) { const k = t().kategoriler.find((x) => x.id === id); if (k) Object.assign(k, g); return id; }
    const yeni = yeniId();
    t().kategoriler.push({ id: yeni, ...g });
    return yeni;
  }
  async kategoriSil(id: number) {
    if (t().kategoriler.some((k) => k.ustId === id)) throw new KayitHatasi('Önce alt kategorileri silin ya da taşıyın');
    t().kategoriler = t().kategoriler.filter((k) => k.id !== id);
    t().urunKategori = t().urunKategori.filter((x) => x.kategoriId !== id);
  }
  async kategoriyeEkle(kategoriId: number, urunIdleri: number[]) {
    let n = 0;
    for (const u of new Set(urunIdleri)) {
      if (!t().urunKategori.some((x) => x.kategoriId === kategoriId && x.urunId === u)) { t().urunKategori.push({ kategoriId, urunId: u }); n++; }
    }
    return n;
  }
  async kategoridenCikar(kategoriId: number, urunIdleri: number[]) {
    t().urunKategori = t().urunKategori.filter((x) => x.kategoriId !== kategoriId || !urunIdleri.includes(x.urunId));
  }

  // ---------- kampanya ----------
  private kampanyaMap(k: ReturnType<typeof t>['kampanyalar'][number]): KampanyaKaydi {
    const g = t().gonderimler.filter((x) => x.kampanyaId === k.id);
    return {
      id: k.id, ad: k.ad, aciklama: k.aciklama, baslangic: k.baslangic, bitis: k.bitis, indirimOrani: k.indirimOrani, aktif: k.aktif,
      yayinda: k.aktif && k.baslangic <= bugun() && k.bitis >= bugun(), olusturma: k.olusturma, gonderim: g.length, sonGonderim: g.at(-1)?.tarih ?? null,
      urunler: k.urunler.flatMap((x) => {
        const u = d().urunler.find((y) => y.id === x.urunId);
        if (!u) return [];
        const normal = u.webFiyati ?? u.listeFiyati;
        return [{ urunId: u.id, ad: u.ad, barkod: u.barkod, yayinevi: u.yayinevi, normalFiyat: normal, ozelFiyat: x.kampanyaFiyati, stok: u.stok,
          kampanyaFiyati: x.kampanyaFiyati ?? yuvarla(normal * (1 - (k.indirimOrani ?? 0) / 100)) }];
      }),
    };
  }
  async kampanyalar(f: { yayindakiler?: boolean } = {}) {
    return t().kampanyalar.map((k) => this.kampanyaMap(k)).filter((k) => !f.yayindakiler || k.yayinda).sort((a, b) => b.baslangic.localeCompare(a.baslangic));
  }
  async kampanya(id: number) { const k = t().kampanyalar.find((x) => x.id === id); return k ? this.kampanyaMap(k) : null; }
  async kampanyaKaydet(id: number | null, g: KampanyaGirdi, kullaniciId: number) {
    if (id) { const k = t().kampanyalar.find((x) => x.id === id); if (k) Object.assign(k, kopya(g)); return id; }
    const yeni = yeniId();
    t().kampanyalar.push({ id: yeni, ...kopya(g), olusturanId: kullaniciId, olusturma: new Date() });
    return yeni;
  }
  async kampanyaGonderimEkle(l: Omit<KampanyaGonderimi, 'id' | 'kullaniciAd' | 'okulAd' | 'tarih' | 'durum'>[], gonderenId: number) {
    return l.map((x) => { const id = yeniId(); t().gonderimler.push({ ...x, id, durum: 'Kuyrukta', gonderenId, tarih: new Date() }); return id; });
  }
  async kampanyaGonderimDurum(id: number, durum: 'Gonderildi' | 'Hata') {
    const g = t().gonderimler.find((x) => x.id === id);
    if (g) g.durum = durum;
  }
  async kampanyaGonderimleri(kampanyaId: number, limit = 200): Promise<KampanyaGonderimi[]> {
    return t().gonderimler.filter((x) => x.kampanyaId === kampanyaId).slice(-limit).reverse().map((x) => {
      const p = d().personel.find((k) => k.id === x.kullaniciId);
      return { id: x.id, kampanyaId: x.kampanyaId, kullaniciId: x.kullaniciId, kullaniciAd: p?.adSoyad ?? '-',
        okulAd: p?.okulId ? d().okullar.find((o) => o.id === p.okulId)?.ad ?? null : null, kanal: x.kanal, alici: x.alici, durum: x.durum, tarih: x.tarih };
    });
  }

  // ---------- hakediş ----------
  async hakedisDurumu(okulId: number): Promise<HakedisDurumu> {
    const tanimlar: HakedisTanimKaydi[] = t().hakedis.filter((h) => h.okulId === okulId).sort((a, b) => b.baslangic.localeCompare(a.baslangic))
      .map((h) => ({ id: h.id, oran: h.oran, baslangic: h.baslangic, bitis: h.bitis, veli: h.veli, toplu: h.toplu, aciklama: h.aciklama, olusturan: kisiAd(h.olusturanId) ?? '-', olusturma: h.olusturma }));
    const oranTarih = (tarih: string) => tanimlar.find((h) => h.veli && h.baslangic <= tarih && (!h.bitis || h.bitis >= tarih))?.oran ?? 0;
    const sip = t().siparisler.filter((s) => s.okulId === okulId && !['Iptal', 'IadeEdildi', 'OdemeBekliyor'].includes(s.durum));
    const ciro = yuvarla(sip.reduce((a, s) => a + s.toplam, 0));
    const hakedis = yuvarla(sip.reduce((a, s) => a + s.toplam * oranTarih(s.tarih.toISOString().slice(0, 10)) / 100, 0));
    const oran = tanimlar.find((h) => h.veli && h.baslangic <= bugun() && (!h.bitis || h.bitis >= bugun()))?.oran ?? null;
    return { goster: !!d().okullar.find((o) => o.id === okulId)?.hakedisGoster, oran, ciro, hakedis, siparis: sip.length, tanimlar };
  }
  async hakedisTanimEkle(okulId: number, g: Omit<HakedisTanimKaydi, 'id' | 'olusturan' | 'olusturma'>, kullaniciId: number) {
    // açık uçlu önceki tanım yeni başlangıçtan bir gün önce kapanır
    for (const h of t().hakedis) if (h.okulId === okulId && !h.bitis && h.baslangic < g.baslangic) h.bitis = new Date(new Date(g.baslangic).getTime() - 864e5).toISOString().slice(0, 10);
    const id = yeniId();
    t().hakedis.push({ id, okulId, ...g, olusturanId: kullaniciId, olusturma: new Date() });
    return id;
  }
  async hakedisGosterAyarla(okulId: number, goster: boolean) {
    const o = d().okullar.find((x) => x.id === okulId);
    if (o) o.hakedisGoster = goster;
  }

  // ---------- ürün ----------
  async urunListesi(f: UrunFiltresi) {
    const q = katla((f.q ?? '').trim());
    const l = d().urunler.filter((u) => {
      if (f.durum === 'aktif' && !u.aktif) return false;
      if (f.durum === 'pasif' && u.aktif) return false;
      if (f.kategori && u.kategori !== f.kategori) return false;
      if (f.webFiyatli && u.webFiyati == null) return false;
      if (f.stokta && !(u.stok && u.stok > 0)) return false;
      if (f.kategoriId && !kategoriAgaci(f.kategoriId).some((k) => t().urunKategori.some((x) => x.kategoriId === k && x.urunId === u.id))) return false;
      return !q || katla(`${u.ad} ${u.yayinevi ?? ''} ${u.yazar ?? ''} ${u.barkod ?? ''} ${u.opakStokKodu}`).includes(q);
    }).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
    const boy = f.sayfaBoyu ?? 50, sayfa = Math.max(1, f.sayfa ?? 1);
    return { satirlar: l.slice((sayfa - 1) * boy, sayfa * boy).map(urunMap), toplam: l.length };
  }
  async urunKaydi(id: number) { const u = d().urunler.find((x) => x.id === id); return u ? urunMap(u) : null; }
  async urunGuncelle(id: number, g: UrunGuncelleme) {
    const u = d().urunler.find((x) => x.id === id);
    if (u) Object.assign(u, { aktif: g.aktif, webFiyati: g.webFiyati, aciklama: g.aciklama, fiyat: g.webFiyati ?? u.listeFiyati, guncelleme: new Date() });
  }
  async urunKapak(id: number, dosya: string | null) {
    const u = d().urunler.find((x) => x.id === id);
    if (u) Object.assign(u, { kapakDosya: dosya, guncelleme: new Date() });
  }
  async opakKategorileri() { return [...new Set(d().urunler.map((u) => u.kategori).filter((k): k is string => !!k))].sort((a, b) => a.localeCompare(b, 'tr')); }

  // ---------- set ----------
  async setListesi(f: { q?: string; pasifDahil?: boolean }) {
    const q = katla((f.q ?? '').trim());
    return t().setler.filter((s) => (f.pasifDahil || s.aktif) && (!q || katla(`${s.ad} ${s.barkod}`).includes(q)))
      .map(setMap).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  }
  async setKaydi(id: number) { const s = t().setler.find((x) => x.id === id); return s ? setMap(s) : null; }
  async setler(ids: number[]) { return t().setler.filter((s) => ids.includes(s.id)).map(setMap); }
  async setAra(q: string, limit = 10) { return (await this.setListesi({ q })).slice(0, limit); }
  async barkodKullanimi(barkod: string, haricSetId?: number) {
    if (d().urunler.some((u) => u.barkod === barkod)) return 'urun' as const;
    if (t().setler.some((s) => s.id !== haricSetId && s.barkod === barkod)) return 'set' as const;
    return null;
  }
  async setEkle(g: SetGirdi, kullaniciId: number) {
    if (await this.barkodKullanimi(g.barkod)) throw new KayitHatasi('Bu barkod başka bir ürün ya da sette kullanılıyor');
    const id = yeniId();
    t().setler.push({ id, barkod: g.barkod, ad: g.ad, aciklama: g.aciklama, fiyat: g.fiyat, aktif: g.aktif, satirlar: kopya(g.satirlar),
      olusturanId: kullaniciId, olusturma: new Date(), guncelleme: null });
    return id;
  }
  async setGuncelle(id: number, g: SetGirdi) {
    if (await this.barkodKullanimi(g.barkod, id)) throw new KayitHatasi('Bu barkod başka bir ürün ya da sette kullanılıyor');
    const s = t().setler.find((x) => x.id === id);
    if (s) Object.assign(s, { barkod: g.barkod, ad: g.ad, aciklama: g.aciklama, fiyat: g.fiyat, aktif: g.aktif, satirlar: kopya(g.satirlar), guncelleme: new Date() });
  }

  // ---------- tahsilat ----------
  async tahsilatlar(f: TahsilatFiltresi): Promise<TahsilatSatiri[]> {
    const q = katla((f.q ?? '').trim());
    const out: TahsilatSatiri[] = [];
    for (const o of t().odemeler) {
      const s = t().siparisler.find((x) => x.id === o.siparisId);
      if (!s) continue;
      if (f.baslangic && o.tarih < f.baslangic) continue;
      if (f.bitis && o.tarih > f.bitis) continue;
      if (f.tip && o.tip !== f.tip) continue;
      if (f.durum && o.durum !== f.durum) continue;
      if (f.okulId && s.okulId !== f.okulId) continue;
      if (f.okulIdleri && !f.okulIdleri.includes(s.okulId)) continue;
      const okul = d().okullar.find((x) => x.id === s.okulId);
      const veli = d().veliler.find((x) => x.id === s.veliId);
      const ogr = d().ogrenciler.find((x) => x.id === s.ogrenciId);
      const satir: TahsilatSatiri = {
        id: o.id, tarih: o.tarih, siparisId: s.id, siparisNo: s.no, okulId: s.okulId, okulAd: okul?.ad ?? '-', plasiyerAd: kisiAd(okul?.plasiyerId),
        veliAd: veli?.adSoyad ?? null, veliTelefon: veli?.telefon ?? null, ogrenciAd: ogr ? `${ogr.ad} ${ogr.soyad}` : null,
        tip: o.tip, durum: o.durum, tutar: o.tutar, taksit: o.taksit, pos: t().poslar.find((p) => p.id === o.posId)?.ad ?? null, kartSonDort: o.kartSonDort,
        banka: t().bankalar.find((b) => b.id === o.bankaHesabiId)?.banka ?? null, havaleGonderen: o.havaleGonderen, referans: s.havaleRef,
        onaylayan: kisiAd(o.onaylayanId), onayTarihi: o.onayTarihi,
      };
      if (q && !katla(`${satir.siparisNo} ${satir.veliAd ?? ''} ${satir.veliTelefon ?? ''} ${satir.ogrenciAd ?? ''} ${satir.referans ?? ''} ${satir.havaleGonderen ?? ''}`).includes(q)) continue;
      out.push(satir);
    }
    return out.sort((a, b) => b.tarih.getTime() - a.tarih.getTime());
  }
  async havaleOnayla(odemeId: number, kullaniciId: number) {
    const o = t().odemeler.find((x) => x.id === odemeId);
    if (!o || o.tip !== 'Havale' || o.durum !== 'Bekliyor') return false;
    Object.assign(o, { durum: 'Basarili', onaylayanId: kullaniciId, onayTarihi: new Date() });
    const s = t().siparisler.find((x) => x.id === o.siparisId);
    if (s && s.durum === 'OdemeBekliyor') s.durum = 'Odendi';
    return true;
  }

  // ---------- veli sepeti / raporlar ----------
  async veliSepetKaydet(veliId: number, ogrenciId: number, satirlar: VeliSepetSatiri[]) {
    let s = t().sepetler.find((x) => x.veliId === veliId && x.ogrenciId === ogrenciId && x.durum === 'Acik');
    const simdi = new Date();
    if (!s) {
      if (!satirlar.length) return;
      s = { id: yeniId(), veliId, ogrenciId, durum: 'Acik', siparisId: null, satirlar: [], olusturma: simdi, guncelleme: simdi };
      t().sepetler.push(s);
    }
    const ayni = JSON.stringify(s.satirlar) === JSON.stringify(satirlar);
    s.satirlar = kopya(satirlar);
    if (!ayni) s.guncelleme = simdi;
    if (!satirlar.length) s.durum = 'Bosaltildi';
  }
  async veliSepeti(veliId: number, ogrenciId: number) {
    return kopya(t().sepetler.find((x) => x.veliId === veliId && x.ogrenciId === ogrenciId && x.durum === 'Acik')?.satirlar ?? []);
  }
  async terkEdilenSepetler(f: TerkFiltresi): Promise<TerkSepet[]> {
    const sinir = Date.now() - f.saat * 3_600_000;
    const siparisli = await this.siparisVerenOgrenciler();
    return t().sepetler.filter((s) => s.durum === 'Acik' && s.satirlar.length && s.guncelleme.getTime() <= sinir && !siparisli.has(s.ogrenciId)).flatMap((s) => {
      const v = d().veliler.find((x) => x.id === s.veliId);
      const o = d().ogrenciler.find((x) => x.id === s.ogrenciId);
      if (!v || !o) return [];
      if (f.okulId && o.okulId !== f.okulId) return [];
      if (f.okulIdleri && !f.okulIdleri.includes(o.okulId)) return [];
      const okul = d().okullar.find((x) => x.id === o.okulId);
      return [{ sepetId: s.id, veliId: v.id, veliAd: v.adSoyad, telefon: v.telefon, eposta: v.eposta, ogrenciId: o.id, ogrenciAd: `${o.ad} ${o.soyad}`,
        okulId: o.okulId, okulAd: okul?.ad ?? '-', sinifSube: subeAd(o.subeId), plasiyerAd: kisiAd(okul?.plasiyerId),
        kalem: s.satirlar.reduce((a, x) => a + x.adet, 0), tutar: yuvarla(s.satirlar.reduce((a, x) => a + x.adet * x.birimFiyat, 0)),
        olusturma: s.olusturma, guncelleme: s.guncelleme }];
    }).sort((a, b) => b.guncelleme.getTime() - a.guncelleme.getTime());
  }
  async siparisVerenOgrenciler(okulIdleri?: number[] | null) {
    return new Set(t().siparisler.filter((s) => !['Iptal', 'IadeEdildi'].includes(s.durum) && (!okulIdleri || okulIdleri.includes(s.okulId))).map((s) => s.ogrenciId));
  }

  // ---------- kayıtlar ----------
  async girisYaz(g: GirisGirdi) {
    const l = t().girisler;
    l.push({ id: yeniId(), tip: g.tip, kullaniciId: g.kullaniciId ?? null, veliId: g.veliId ?? null, kimlik: g.kimlik, rol: g.rol ?? null,
      basarili: g.basarili, sebep: g.sebep ?? null, ip: g.ip ?? null, tarih: new Date() });
    if (l.length > 2000) l.splice(0, l.length - 2000);
  }
  async girisLog(f: GirisFiltresi): Promise<GirisSatiri[]> {
    const q = katla((f.q ?? '').trim());
    return t().girisler.filter((x) => (!f.tip || x.tip === f.tip) && (f.basarili == null || x.basarili === f.basarili)
      && (!f.baslangic || x.tarih >= f.baslangic) && (!f.bitis || x.tarih <= f.bitis))
      .map((x) => ({ id: x.id, tarih: x.tarih, tip: x.tip, kimlik: x.kimlik, rol: x.rol, basarili: x.basarili, sebep: x.sebep, ip: x.ip,
        ad: x.kullaniciId ? kisiAd(x.kullaniciId) : x.veliId ? d().veliler.find((v) => v.id === x.veliId)?.adSoyad ?? null : null }))
      .filter((x) => !q || katla(`${x.kimlik} ${x.ad ?? ''} ${x.ip ?? ''}`).includes(q))
      .slice(-(f.limit ?? 300)).reverse();
  }
  async bildirimLog(f: BildirimFiltresi): Promise<BildirimLogSatiri[]> {
    return d().bildirimler.filter((b) => (!f.kanal || b.kanal === f.kanal) && (!f.durum || b.durum === f.durum)).slice(-(f.limit ?? 300)).reverse().map((b) => {
      const y = d().yayinlar.find((x) => x.id === b.yayinId);
      const l = y ? d().listeler.find((x) => x.id === y.listeId) : undefined;
      return { id: b.id, tarih: b.tarih, kanal: b.kanal, alici: b.alici, durum: b.durum, listeAd: l?.ad ?? null,
        okulAd: l ? d().okullar.find((o) => o.id === l.okulId)?.ad ?? null : null };
    });
  }

  // ---------- ayarlar ----------
  async ayarlar() { return { ...t().ayarlar }; }
  async ayarlarKaydet(a: Record<string, string>) { Object.assign(t().ayarlar, a); }
  async bankaHesaplari(pasifDahil = true) { return kopya(t().bankalar.filter((b) => pasifDahil || b.aktif).sort((a, b) => a.sira - b.sira)); }
  async bankaHesabiKaydet(id: number | null, g: BankaHesabiGirdi) {
    if (t().bankalar.some((b) => b.id !== id && b.iban === g.iban)) throw new KayitHatasi('Bu IBAN zaten kayıtlı');
    if (id) { const b = t().bankalar.find((x) => x.id === id); if (b) Object.assign(b, g); return id; }
    const yeni = yeniId();
    t().bankalar.push({ id: yeni, ...g });
    return yeni;
  }
  async kargoFirmalari(pasifDahil = true): Promise<KargoFirmaKaydi[]> {
    return t().kargolar.filter((k) => pasifDahil || k.aktif).sort((a, b) => a.sira - b.sira)
      .map((k) => ({ ...kopya(k), bolgeler: kopya(t().bolgeler.filter((b) => b.firmaId === k.id)) }));
  }
  async kargoFirmaKaydet(id: number | null, g: KargoFirmaGirdi) {
    if (t().kargolar.some((k) => k.id !== id && k.kod === g.kod)) throw new KayitHatasi('Bu firma kodu zaten kullanılıyor');
    if (id) { const k = t().kargolar.find((x) => x.id === id); if (k) Object.assign(k, g); return id; }
    const yeni = yeniId();
    t().kargolar.push({ id: yeni, ...g });
    return yeni;
  }
  async kargoBolgeKaydet(id: number | null, g: KargoBolgeGirdi) {
    if (id) { const b = t().bolgeler.find((x) => x.id === id); if (b) Object.assign(b, g); return id; }
    const yeni = yeniId();
    t().bolgeler.push({ id: yeni, ...g });
    return yeni;
  }
  async kargoBolgeSil(id: number) { t().bolgeler = t().bolgeler.filter((b) => b.id !== id); }
  async posListesi(): Promise<PosKaydi[]> {
    return t().poslar.map((p) => ({ ...kopya(p), taksitler: t().taksitler.filter((x) => x.posId === p.id).sort((a, b) => a.taksit - b.taksit)
      .map(({ posId: _p, ...x }) => kopya(x)) }));
  }
  async posGuncelle(id: number, g: { test: boolean; aktif: boolean }) { const p = t().poslar.find((x) => x.id === id); if (p) Object.assign(p, g); }
  async taksitleriKaydet(posId: number, l: Omit<TaksitKaydi, 'id'>[]) {
    t().taksitler = [...t().taksitler.filter((x) => x.posId !== posId), ...l.map((x) => ({ ...x, id: yeniId(), posId }))];
  }
  async posKurallari(): Promise<PosKurali[]> {
    return t().kurallar.slice().sort((a, b) => a.oncelik - b.oncelik).map((k) => ({ ...kopya(k), posAd: t().poslar.find((p) => p.id === k.posId)?.ad ?? '-' }));
  }
  async posKuraliKaydet(id: number | null, g: PosKuraliGirdi) {
    if (t().kurallar.some((k) => k.id !== id && k.oncelik === g.oncelik)) throw new KayitHatasi(`${g.oncelik} önceliğinde başka bir kural var`);
    if (id) { const k = t().kurallar.find((x) => x.id === id); if (k) Object.assign(k, g); return id; }
    const yeni = yeniId();
    t().kurallar.push({ id: yeni, ...g });
    return yeni;
  }
  async posKuraliSil(id: number) {
    t().kurallar = t().kurallar.filter((k) => k.id !== id);
  }

  // ---------- kurumsal sayfalar ----------
  async sayfalar() { return kopya(t().sayfalar.slice().sort((a, b) => a.sira - b.sira)); }
  async sayfa(slug: string) { const s = t().sayfalar.find((x) => x.slug === slug); return s ? kopya(s) : null; }
  async sayfaKaydet(id: number | null, g: SayfaGirdi) {
    if (t().sayfalar.some((s) => s.id !== id && s.slug === g.slug)) throw new KayitHatasi('Bu adres başka bir sayfada kullanılıyor');
    if (id) { const s = t().sayfalar.find((x) => x.id === id); if (s) Object.assign(s, g, { guncelleme: new Date() }); return id; }
    const yeni = yeniId();
    t().sayfalar.push({ id: yeni, ...g, guncelleme: new Date() } satisfies SayfaKaydi);
    return yeni;
  }
}
