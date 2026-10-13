import 'server-only';
import { mockDepo as d, mockSayac as yeniId, type OgrKayit, type VeliKayit, type PersonelKayit, type OkulTam } from './mock';
import {
  KayitHatasi, sinifAdi,
  type AramaFiltresi, type HedefTip, type IslemKaydi, type IslemLogFiltresi, type IslemLogSatiri, type PlasiyerOzeti, type OgrenciGirdi, type OgrenciKaydi, type OkulGirdi, type OkulKaydi,
  type PersonelGirdi, type PersonelKaydi, type PersonelTipi, type SinifKaydi, type VeliKaydi, type YonetimRepo,
} from './yonetim';
import type { YuklemeParti, YuklemeSatiri } from '../yukleme/tipler';
import { katla } from '../katla';

const kopya = <T>(x: T): T => structuredClone(x);
const kucuk = katla;
const kilitli = (t: Date | null | undefined) => !!t && new Date(t).getTime() > Date.now();

function subeAd(subeId: number) {
  const sb = d().subeler.find((s) => s.id === subeId);
  const sn = sb && d().siniflar.find((s) => s.id === sb.sinifId);
  return sb && sn ? `${sn.seviye}-${sb.ad}` : null;
}

const kisiAd = (id: number | null | undefined) => (id ? d().personel.find((p) => p.id === id)?.adSoyad ?? null : null);

function okulMap(o: OkulTam): OkulKaydi {
  return { id: o.id, kod: o.kod, ad: o.ad, il: o.il, ilce: o.ilce, adres: o.adres, telefon: o.telefon, eposta: o.eposta,
    opakCariKodu: o.opakCariKodu, opakWebCariKodu: o.opakWebCariKodu, aktif: o.aktif, slug: o.slug,
    plasiyerId: o.plasiyerId ?? null, plasiyerAd: kisiAd(o.plasiyerId) };
}

/** Öğretmen: kendisine atanmış plasiyer, yoksa okulun plasiyeri. Okul yetkilisi: okulun plasiyeri. */
function gecerliPlasiyer(p: PersonelKayit): number | null {
  if (p.tip === 'Ogretmen' && p.plasiyerId) return p.plasiyerId;
  if (p.tip === 'Ogretmen' || p.tip === 'Okul') return d().okullar.find((o) => o.id === p.okulId)?.plasiyerId ?? null;
  return null;
}

function veliMap(v: VeliKayit, ogrenciId?: number): VeliKaydi {
  return {
    id: v.id, telefon: v.telefon, adSoyad: v.adSoyad, eposta: v.eposta, yakinlik: ogrenciId ? v.yakinlik?.[ogrenciId] ?? null : null,
    sifreVar: !!v.sifreHash, kilitli: kilitli(v.kilitBitis), sonGiris: v.sonGiris ?? null, aktif: v.aktif,
    ogrenciler: v.ogrenciler.map((id) => d().ogrenciler.find((o) => o.id === id)!).filter(Boolean).map((o) => ({
      id: o.id, ad: `${o.ad} ${o.soyad}`, okulAd: d().okullar.find((x) => x.id === o.okulId)?.ad ?? '', sinifSube: subeAd(o.subeId) ?? '—' })),
  };
}

function ogrenciMap(o: OgrKayit, veliler = true): OgrenciKaydi {
  return {
    id: o.id, okulId: o.okulId, okulAd: d().okullar.find((x) => x.id === o.okulId)?.ad ?? '', okulNo: o.okulNo, ad: o.ad, soyad: o.soyad,
    subeId: o.subeId, sinifSube: subeAd(o.subeId), aktif: o.aktif !== false,
    veliler: veliler ? d().veliler.filter((v) => v.ogrenciler.includes(o.id)).map((v) => veliMap(v, o.id)) : [],
  };
}

function personelMap(p: PersonelKayit): PersonelKaydi {
  return {
    id: p.id, tip: p.tip, okulId: p.okulId, okulAd: p.okulId ? d().okullar.find((o) => o.id === p.okulId)?.ad ?? null : null,
    adSoyad: p.adSoyad, eposta: p.eposta, telefon: p.telefon, aktif: p.aktif, kilitli: kilitli(p.kilitBitis),
    sifreDegistirmeli: p.sifreDegistirmeli, sonGiris: p.sonGiris ?? null, yetkiler: [...p.yetkiler],
    subeler: p.subeler.map((id) => ({ id, ad: subeAd(id) ?? '?' })),
    opakPlasiyerKodu: p.opakPlasiyerKodu ?? null, plasiyerId: p.plasiyerId ?? null,
    gecerliPlasiyerId: gecerliPlasiyer(p), gecerliPlasiyerAd: kisiAd(gecerliPlasiyer(p)),
  };
}

export class MockYonetimRepo implements YonetimRepo {
  async okulKaydi(id: number) { const o = d().okullar.find((x) => x.id === id); return o ? okulMap(o) : null; }
  async okulListesi(pasifDahil = false, plasiyerId?: number | null) {
    return d().okullar.filter((o) => (pasifDahil || o.aktif) && (!plasiyerId || o.plasiyerId === plasiyerId)).map(okulMap);
  }
  async okulPlasiyerAta(okulId: number, plasiyerId: number | null) {
    const o = d().okullar.find((x) => x.id === okulId);
    if (o) o.plasiyerId = plasiyerId;
  }
  async okulKodOner() {
    const n = Math.max(1000, ...d().okullar.map((o) => Number(o.kod.replace(/\D/g, '')) || 0));
    return `OK-${n + 1}`;
  }
  private kodKontrol(kod: string, haric?: number) {
    if (d().okullar.some((o) => o.id !== haric && o.kod.toLowerCase() === kod.toLowerCase())) throw new KayitHatasi('Bu okul kodu başka bir okulda kullanılıyor');
  }
  async okulEkle(o: OkulGirdi) {
    this.kodKontrol(o.kod);
    const id = yeniId();
    d().okullar.push({ id, ...o, slug: null, logoDosya: null, logoGoster: false });
    return id;
  }
  async okulGuncelle(id: number, o: OkulGirdi) {
    this.kodKontrol(o.kod, id);
    const x = d().okullar.find((k) => k.id === id);
    if (x) Object.assign(x, o);
  }

  async okulSiniflari(okulId: number): Promise<SinifKaydi[]> {
    return d().siniflar.filter((s) => s.okulId === okulId).sort((a, b) => a.seviye - b.seviye).map((sn) => ({
      id: sn.id, seviye: sn.seviye, ad: sinifAdi(sn.seviye),
      subeler: d().subeler.filter((s) => s.sinifId === sn.id).sort((a, b) => a.ad.localeCompare(b.ad, 'tr')).map((sb) => ({
        id: sb.id, ad: sb.ad,
        ogrenci: d().ogrenciler.filter((o) => o.subeId === sb.id && o.aktif !== false).length,
        ogretmen: d().personel.filter((p) => p.subeler.includes(sb.id)).length,
      })),
    }));
  }
  async sinifEkle(okulId: number, seviye: number) {
    if (d().siniflar.some((s) => s.okulId === okulId && s.seviye === seviye)) throw new KayitHatasi(`${sinifAdi(seviye)} zaten var`);
    const id = yeniId();
    d().siniflar.push({ id, okulId, seviye });
    return id;
  }
  async subeEkle(sinifId: number, ad: string) {
    if (d().subeler.some((s) => s.sinifId === sinifId && kucuk(s.ad) === kucuk(ad))) throw new KayitHatasi(`${ad} şubesi zaten var`);
    const id = yeniId();
    d().subeler.push({ id, sinifId, ad });
    return id;
  }
  async subeSil(subeId: number) {
    if (d().ogrenciler.some((o) => o.subeId === subeId)) throw new KayitHatasi('Şubede öğrenci var; önce öğrencileri başka şubeye taşıyın');
    if (d().listeler.some((l) => l.subeId === subeId)) throw new KayitHatasi('Bu şubenin tavsiye sepeti var; şube silinemez');
    d().subeler = d().subeler.filter((s) => s.id !== subeId);
    for (const p of d().personel) p.subeler = p.subeler.filter((s) => s !== subeId);
  }
  async subeOkulu(subeId: number) {
    const sb = d().subeler.find((s) => s.id === subeId);
    return sb ? d().siniflar.find((s) => s.id === sb.sinifId)?.okulId ?? null : null;
  }
  async sinifOkulu(sinifId: number) { return d().siniflar.find((s) => s.id === sinifId)?.okulId ?? null; }

  async ogrenciAra(f: AramaFiltresi) {
    const q = kucuk((f.q ?? '').trim());
    const rakam = q.replace(/\D/g, '');
    return d().ogrenciler.filter((o) => {
      if (!f.pasifDahil && o.aktif === false) return false;
      if (f.okulId && o.okulId !== f.okulId) return false;
      if (f.okulIdleri && !f.okulIdleri.includes(o.okulId)) return false;
      if (f.subeId && o.subeId !== f.subeId) return false;
      if (f.seviye != null) {
        const sb = d().subeler.find((s) => s.id === o.subeId);
        if (d().siniflar.find((s) => s.id === sb?.sinifId)?.seviye !== f.seviye) return false;
      }
      if (!q) return true;
      if (kucuk(`${o.ad} ${o.soyad}`).includes(q) || o.okulNo === q) return true;
      return rakam.length >= 4 && d().veliler.some((v) => v.ogrenciler.includes(o.id) && v.telefon.includes(rakam.replace(/^0/, '')));
    }).sort((a, b) => (f.seviye != null || f.subeId ? a.okulId - b.okulId || (subeAd(a.subeId) ?? '').localeCompare(subeAd(b.subeId) ?? '', 'tr') : 0)
      || kucuk(`${a.ad} ${a.soyad}`).localeCompare(kucuk(`${b.ad} ${b.soyad}`), 'tr'))
      .slice(0, f.limit ?? 100).map((o) => ogrenciMap(o));
  }
  async ogrenciKaydi(id: number) { const o = d().ogrenciler.find((x) => x.id === id); return o ? ogrenciMap(o) : null; }
  private noKontrol(okulId: number, okulNo: string, haric?: number) {
    if (d().ogrenciler.some((o) => o.id !== haric && o.okulId === okulId && o.okulNo === okulNo)) throw new KayitHatasi(`Bu okulda ${okulNo} numaralı başka bir öğrenci var`);
  }
  async ogrenciEkle(o: OgrenciGirdi) {
    this.noKontrol(o.okulId, o.okulNo);
    const id = yeniId();
    d().ogrenciler.push({ id, okulId: o.okulId, okulNo: o.okulNo, ad: o.ad, soyad: o.soyad, subeId: o.subeId, aktif: o.aktif });
    return id;
  }
  async ogrenciGuncelle(id: number, o: Omit<OgrenciGirdi, 'okulId'>) {
    const x = d().ogrenciler.find((k) => k.id === id);
    if (!x) return;
    this.noKontrol(x.okulId, o.okulNo, id);
    Object.assign(x, { okulNo: o.okulNo, ad: o.ad, soyad: o.soyad, subeId: o.subeId, aktif: o.aktif });
  }

  async veliKaydi(id: number) { const v = d().veliler.find((x) => x.id === id); return v ? veliMap(v) : null; }
  async veliTelefonKaydi(telefon: string) { const v = d().veliler.find((x) => x.telefon === telefon); return v ? veliMap(v) : null; }
  async veliBagla(ogrenciId: number, g: { telefon: string; adSoyad: string | null; eposta: string | null; yakinlik: string | null }) {
    let v = d().veliler.find((x) => x.telefon === g.telefon);
    const yeni = !v;
    if (!v) {
      v = { id: yeniId(), telefon: g.telefon, adSoyad: g.adSoyad, eposta: g.eposta, sifreHash: null, basarisizGiris: 0, kilitBitis: null, aktif: true, ogrenciler: [] };
      d().veliler.push(v);
    } else {
      if (!v.adSoyad && g.adSoyad) v.adSoyad = g.adSoyad;
      if (!v.eposta && g.eposta) v.eposta = g.eposta;
    }
    if (v.ogrenciler.includes(ogrenciId)) throw new KayitHatasi('Bu veli zaten bu öğrenciye bağlı');
    v.ogrenciler.push(ogrenciId);
    if (g.yakinlik) v.yakinlik = { ...(v.yakinlik ?? {}), [ogrenciId]: g.yakinlik };
    return { veliId: v.id, yeni };
  }
  async veliAyir(ogrenciId: number, veliId: number) {
    const v = d().veliler.find((x) => x.id === veliId);
    if (v) v.ogrenciler = v.ogrenciler.filter((o) => o !== ogrenciId);
  }
  async veliDuzenle(id: number, g: { telefon: string; adSoyad: string | null; eposta: string | null; aktif: boolean }) {
    if (d().veliler.some((x) => x.id !== id && x.telefon === g.telefon)) throw new KayitHatasi('Bu telefon başka bir veliye kayıtlı');
    const v = d().veliler.find((x) => x.id === id);
    if (v) Object.assign(v, g);
  }
  async veliSifreSifirla(id: number) {
    const v = d().veliler.find((x) => x.id === id);
    if (v) Object.assign(v, { sifreHash: null, basarisizGiris: 0, kilitBitis: null });
  }
  async veliKilitAc(id: number) {
    const v = d().veliler.find((x) => x.id === id);
    if (v) Object.assign(v, { basarisizGiris: 0, kilitBitis: null });
  }

  async personelListesi(f: { q?: string; tip?: PersonelTipi | null; okulId?: number | null; pasifDahil?: boolean; plasiyerId?: number | null }) {
    const q = kucuk((f.q ?? '').trim());
    return d().personel.filter((p) => (f.pasifDahil || p.aktif) && (!f.tip || p.tip === f.tip) && (!f.okulId || p.okulId === f.okulId)
      && (!f.plasiyerId || gecerliPlasiyer(p) === f.plasiyerId)
      && (!q || kucuk(`${p.adSoyad} ${p.eposta} ${p.telefon ?? ''} ${p.opakPlasiyerKodu ?? ''}`).includes(q)))
      .map(personelMap).sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, 'tr'));
  }
  async plasiyerListesi(pasifDahil = false): Promise<PlasiyerOzeti[]> {
    return d().personel.filter((p) => p.tip === 'Plasiyer' && (pasifDahil || p.aktif)).map((p) => {
      const ogretmenler = d().personel.filter((x) => x.tip === 'Ogretmen' && x.aktif && gecerliPlasiyer(x) === p.id);
      return { id: p.id, adSoyad: p.adSoyad, eposta: p.eposta, telefon: p.telefon, opakPlasiyerKodu: p.opakPlasiyerKodu ?? null, aktif: p.aktif,
        okulSayisi: d().okullar.filter((o) => o.aktif && o.plasiyerId === p.id).length,
        ogretmenSayisi: ogretmenler.length, ozelOgretmen: ogretmenler.filter((x) => x.plasiyerId === p.id).length };
    }).sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, 'tr'));
  }
  async ogretmenPlasiyerAta(kullaniciId: number, plasiyerId: number | null) {
    const p = d().personel.find((x) => x.id === kullaniciId && x.tip === 'Ogretmen');
    if (p) p.plasiyerId = plasiyerId;
  }
  async seviyeler(okulId?: number | null) {
    return [...new Set(d().siniflar.filter((s) => !okulId || s.okulId === okulId).map((s) => s.seviye))].sort((a, b) => a - b);
  }
  async personelKaydi(id: number) { const p = d().personel.find((x) => x.id === id); return p ? personelMap(p) : null; }
  private epostaKontrol(eposta: string, haric?: number, opak?: string | null) {
    if (d().personel.some((p) => p.id !== haric && kucuk(p.eposta) === kucuk(eposta))) throw new KayitHatasi('Bu e-posta başka bir kullanıcıya kayıtlı');
    if (opak && d().personel.some((p) => p.id !== haric && p.opakPlasiyerKodu === opak)) throw new KayitHatasi('Bu Opak plasiyer kodu başka bir plasiyerde kullanılıyor');
  }
  async personelEkle(g: PersonelGirdi, sifreHash: string) {
    this.epostaKontrol(g.eposta, undefined, g.opakPlasiyerKodu);
    const id = yeniId();
    d().personel.push({ id, tip: g.tip, okulId: g.okulId, adSoyad: g.adSoyad, eposta: g.eposta, telefon: g.telefon, sifreHash, sifreDegistirmeli: true,
      yetkiler: g.tip === 'Okul' ? [...g.yetkiler] : [], basarisizGiris: 0, kilitBitis: null, aktif: g.aktif, subeler: g.tip === 'Ogretmen' ? [...g.subeIdleri] : [],
      opakPlasiyerKodu: g.tip === 'Plasiyer' ? g.opakPlasiyerKodu : null, plasiyerId: g.tip === 'Ogretmen' ? g.plasiyerId : null });
    return id;
  }
  async personelDuzenle(id: number, g: PersonelGirdi) {
    this.epostaKontrol(g.eposta, id, g.opakPlasiyerKodu);
    const p = d().personel.find((x) => x.id === id);
    if (!p) return;
    if (p.tip === 'Plasiyer' && g.tip !== 'Plasiyer' && (d().okullar.some((o) => o.plasiyerId === id) || d().personel.some((x) => x.plasiyerId === id))) {
      throw new KayitHatasi('Bu plasiyere bağlı okul / öğretmen var; önce onları başka plasiyere aktarın');
    }
    Object.assign(p, { tip: g.tip, okulId: g.okulId, adSoyad: g.adSoyad, eposta: g.eposta, telefon: g.telefon, aktif: g.aktif,
      yetkiler: g.tip === 'Okul' ? [...g.yetkiler] : [], subeler: g.tip === 'Ogretmen' ? [...g.subeIdleri] : [],
      opakPlasiyerKodu: g.tip === 'Plasiyer' ? g.opakPlasiyerKodu : null, plasiyerId: g.tip === 'Ogretmen' ? g.plasiyerId : null });
  }
  async personelSifreAta(id: number, sifreHash: string, degistirmeli: boolean) {
    const p = d().personel.find((x) => x.id === id);
    if (p) Object.assign(p, { sifreHash, sifreDegistirmeli: degistirmeli, basarisizGiris: 0, kilitBitis: null });
  }
  async personelKilitAc(id: number) {
    const p = d().personel.find((x) => x.id === id);
    if (p) Object.assign(p, { basarisizGiris: 0, kilitBitis: null });
  }

  async ogrencilerOkulNo(okulId: number, okulNolar: string[]) {
    const n = new Set(okulNolar);
    return d().ogrenciler.filter((o) => o.okulId === okulId && n.has(o.okulNo)).map((o) => ogrenciMap(o));
  }
  async velilerTelefonla(telefonlar: string[]) {
    const t = new Set(telefonlar);
    return d().veliler.filter((v) => t.has(v.telefon)).map((v) => veliMap(v));
  }
  private yuk() { return (d().yuklemeler ??= []); }
  private partiMap(x: NonNullable<ReturnType<MockYonetimRepo['yuk']>>[number], satirlar: boolean): YuklemeParti {
    return { id: x.id, okulId: x.okulId, okulAd: x.okulId ? d().okullar.find((o) => o.id === x.okulId)?.ad ?? null : null, dosyaAdi: x.dosyaAdi, durum: x.durum,
      toplam: x.satirlar.length, hatali: x.satirlar.filter((r) => r.hata).length, kaydedilen: x.kaydedilen, subeOtomatikAc: x.subeOtomatikAc,
      olusturma: x.olusturma, onay: x.onay, yukleyen: d().personel.find((p) => p.id === x.kullaniciId)?.adSoyad ?? '-', satirlar: satirlar ? kopya(x.satirlar) : [] };
  }
  async yuklemeOlustur(p: { okulId: number | null; dosyaAdi: string; kullaniciId: number; subeOtomatikAc: boolean }, satirlar: YuklemeSatiri[]) {
    const id = yeniId();
    this.yuk().push({ id, ...p, durum: 'Onizleme', kaydedilen: 0, olusturma: new Date(), onay: null, satirlar: kopya(satirlar) });
    return id;
  }
  async yuklemeParti(id: number) { const x = this.yuk().find((k) => k.id === id); return x ? this.partiMap(x, true) : null; }
  async yuklemeSatirlariYaz(id: number, satirlar: YuklemeSatiri[]) { const x = this.yuk().find((k) => k.id === id); if (x) x.satirlar = kopya(satirlar); }
  async yuklemeBitir(id: number, durum: 'Onaylandi' | 'IptalEdildi', kaydedilen: number) {
    const x = this.yuk().find((k) => k.id === id);
    if (x) Object.assign(x, { durum, kaydedilen, onay: new Date() });
  }
  async yuklemeGecmisi(limit = 10) { return this.yuk().slice(-limit).reverse().map((x) => { const { satirlar: _s, ...p } = this.partiMap(x, false); return p; }); }

  async islemYaz(kullaniciId: number, hedef: HedefTip, hedefId: number, islem: string, ayrinti?: string | null) {
    d().islemler.push({ id: yeniId(), kullaniciId, hedef, hedefId, islem, ayrinti: ayrinti ?? null, tarih: new Date() });
  }
  async islemLog(f: IslemLogFiltresi): Promise<IslemLogSatiri[]> {
    const q = kucuk((f.q ?? '').trim());
    return d().islemler.filter((i) => (!f.hedef || i.hedef === f.hedef) && (!f.baslangic || i.tarih >= f.baslangic) && (!f.bitis || i.tarih <= f.bitis))
      .map((i) => ({ id: i.id, kullanici: kisiAd(i.kullaniciId) ?? '-', hedef: i.hedef, hedefId: i.hedefId, islem: i.islem, ayrinti: i.ayrinti, tarih: i.tarih }))
      .filter((i) => !q || kucuk(`${i.kullanici} ${i.islem} ${i.ayrinti ?? ''}`).includes(q))
      .slice(-(f.limit ?? 200)).reverse();
  }
  async islemler(hedef: HedefTip, hedefId: number, limit = 20): Promise<IslemKaydi[]> {
    return kopya(d().islemler.filter((i) => i.hedef === hedef && i.hedefId === hedefId).slice(-limit).reverse()
      .map((i) => ({ id: i.id, kullanici: d().personel.find((p) => p.id === i.kullaniciId)?.adSoyad ?? '-', islem: i.islem, ayrinti: i.ayrinti, tarih: i.tarih })));
  }
}
