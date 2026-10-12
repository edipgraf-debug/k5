import 'server-only';
import { repo } from './data/repo';
import { siteAdresi } from './ortam';
import { sms } from './notify/sms';
import { epostaGonder } from './notify/email';
import type { HedefTipi, KitapListesi, Ogrenci, Oturum, SinifSecenegi, VeliAlici, YayinSonucu } from './types';

/**
 * Sınıf listesi yetkileri
 *  - Öğretmen: yalnız kendine atanmış şubelerin listeleri
 *  - Okul yönetimi: kendi okulunun tüm sınıf/şube listeleri (KitapListe yetkisi)
 *  - Kardelen yönetim: seçilen okulun tüm listeleri
 */
export async function izinliSecenekler(o: Oturum, okulId: number): Promise<SinifSecenegi[]> {
  const r = await repo();
  if (o.rol === 'ogretmen') return r.sinifSecenekleri(okulId, await r.personelSubeleri(o.sub));
  return r.sinifSecenekleri(okulId, null);
}

export function okulBelirle(o: Oturum, istenen?: number | null): number | null {
  if (o.rol === 'yonetim') return istenen ?? null;
  return o.okulId ?? null;
}

export async function listeErisimi(o: Oturum, liste: KitapListesi): Promise<boolean> {
  if (o.rol === 'yonetim') return true;
  if (o.okulId !== liste.okulId) return false;
  if (o.rol === 'okul') return true;
  if (o.rol === 'ogretmen') {
    if (liste.kapsam !== 'Sube' || liste.subeId == null) return false;
    return (await (await repo()).personelSubeleri(o.sub)).includes(liste.subeId);
  }
  return false;
}

/** Öğrenci detayına erişim: öğretmen yalnız kendi şubeleri, okul kendi okulu, Kardelen hepsi. */
export async function ogrenciErisimi(o: Oturum, ogr: Pick<Ogrenci, 'okulId' | 'subeId'>): Promise<boolean> {
  if (o.rol === 'yonetim') return true;
  if (o.okulId !== ogr.okulId) return false;
  if (o.rol === 'okul') return true;
  if (o.rol === 'ogretmen') return (await (await repo()).personelSubeleri(o.sub)).includes(ogr.subeId);
  return false;
}

/** Rol önekli adres: /ogretmen/listeler/5 gibi */
export function rolYolu(o: Oturum, yol: string) {
  return `/${o.rol}${yol}`;
}

export function alicilariOzetle(alicilar: VeliAlici[]) {
  const veliler = new Map<number, VeliAlici>();
  for (const a of alicilar) if (!veliler.has(a.veliId)) veliler.set(a.veliId, a);
  const ogrenciler = new Set(alicilar.map((a) => a.ogrenciId));
  const epostali = [...veliler.values()].filter((v) => !!v.eposta).length;
  return { ogrenciSayisi: ogrenciler.size, veliSayisi: veliler.size, epostaSayisi: epostali, epostasiOlmayan: veliler.size - epostali };
}

export function siteUrl() {
  return siteAdresi();
}

/** Bildirimlerdeki bağlantı: okulun özel giriş adresi varsa o, yoksa genel giriş. */
export function girisAdresi(okulSlug: string | null | undefined) {
  return `${siteUrl()}/${okulSlug || 'giris'}`;
}

export type MesajTuru = 'yeni' | 'guncelleme' | 'hatirlatma';

export function smsMetni(a: VeliAlici, tur: MesajTuru, okulSlug?: string | null): string {
  const ad = a.ogrenciAd.split(' ')[0];
  const ne = tur === 'hatirlatma' ? 'tavsiye sepeti sizi bekliyor' : tur === 'guncelleme' ? 'tavsiye sepeti guncellendi' : 'tavsiye sepeti hazir';
  return `Kardelen Okul: ${ad} icin ${a.sinifSube} ${ne}. Gormek ve siparis icin: ${girisAdresi(okulSlug)}`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const FIIL: Record<MesajTuru, string> = { yeni: 'hazırlandı', guncelleme: 'güncellendi', hatirlatma: 'sizi bekliyor' };
const BASLIK: Record<MesajTuru, string> = { yeni: 'Tavsiye sepeti hazır', guncelleme: 'Tavsiye sepeti güncellendi', hatirlatma: 'Hatırlatma: tavsiye sepeti' };

function epostaIcerik(liste: KitapListesi, ogrenciler: VeliAlici[], tur: MesajTuru, okulSlug?: string | null) {
  const adlarDuz = ogrenciler.map((x) => `${x.ogrenciAd} (${x.sinifSube})`).join(', ');
  const adlar = esc(adlarDuz);
  const listeAd = esc(liste.ad);
  const adres = girisAdresi(okulSlug);
  const konu = `${BASLIK[tur]}: ${liste.ad} — Kardelen Okul`;
  const metin = `Sayın veli,\n\n${adlarDuz} için "${liste.ad}" tavsiye sepeti ${FIIL[tur]}.\n` +
    `Sepeti görmek ve sipariş vermek için kayıtlı cep telefonunuzla giriş yapın: ${adres}\n\nKardelen Okul — Bilmeye cesaret et!`;
  const html = `<div style="font-family:Arial,sans-serif;color:#172334;max-width:560px">
    <h2 style="margin:0 0 12px">${BASLIK[tur]}</h2>
    <p>Sayın veli,</p>
    <p><strong>${adlar}</strong> için <strong>"${listeAd}"</strong> tavsiye sepeti ${FIIL[tur]}.</p>
    <p><a href="${esc(adres)}" style="display:inline-block;padding:12px 20px;background:#F89C0E;color:#172334;font-weight:bold;border-radius:10px;text-decoration:none">Sepeti görüntüle</a></p>
    <p style="font-size:13px;color:#5A6575">Giriş için okulunuza bildirdiğiniz cep telefonu numaranızı kullanın.</p>
  </div>`;
  return { konu, metin, html };
}

export interface YayinSecimi {
  sms: boolean;
  eposta: boolean;
  /** toplu: kapsamdaki tüm öğrenciler · secili: yalnız ogrenciIdleri */
  hedef: 'toplu' | 'secili';
  ogrenciIdleri?: number[];
  /** Hatırlatma: sepet zaten açık olan öğrencilerin velilerine yeniden bildirim (görünürlük değişmez). */
  hatirlatma?: boolean;
}

export class YayinHatasi extends Error {}

/**
 * Tavsiye sepetini yayınlar (tüm sınıfa ya da seçili öğrencilere) ve ilgili velilere SMS + (kayıtlıysa) e-posta gönderir.
 * Her gönderim Bildirim tablosuna yazılır ve sonucu işlenir.
 */
export async function listeYayinla(o: Oturum, liste: KitapListesi, secim: YayinSecimi): Promise<YayinSonucu> {
  const r = await repo();
  const takip = await r.listeTakip(liste.id);
  const kapsam = new Set(takip.map((t) => t.ogrenciId));

  let ogrenciIdleri: number[] | null = null;
  if (secim.hedef === 'secili' || secim.hatirlatma) {
    ogrenciIdleri = [...new Set(secim.ogrenciIdleri ?? [])];
    if (!ogrenciIdleri.length) throw new YayinHatasi('En az bir öğrenci seçin');
    if (ogrenciIdleri.some((id) => !kapsam.has(id))) throw new YayinHatasi('Seçilen öğrencilerden bazıları bu sepetin sınıfında değil');
  }
  if (secim.hatirlatma) {
    if (!liste.yayinda) throw new YayinHatasi('Yayınlanmamış sepet için hatırlatma gönderilemez');
    const acik = new Set(takip.filter((t) => t.gorebilir).map((t) => t.ogrenciId));
    if (ogrenciIdleri!.some((id) => !acik.has(id))) throw new YayinHatasi('Hatırlatma yalnız sepetin açık olduğu öğrencilere gönderilir');
  }

  const hedefTipi: HedefTipi = secim.hedef === 'toplu' ? 'Toplu' : 'Secili';
  const alicilar = await r.listeAlicilari(liste.id, ogrenciIdleri);
  const ozet = alicilariOzetle(alicilar);
  const guncelleme = !!liste.yayinTarihi;
  const tur: MesajTuru = secim.hatirlatma ? 'hatirlatma' : guncelleme && secim.hedef === 'toplu' ? 'guncelleme' : 'yeni';
  const okul = await r.okul(liste.okulId);

  // veli başına tek mesaj (kardeşler aynı mesajda)
  const veliGrup = new Map<number, VeliAlici[]>();
  for (const a of alicilar) veliGrup.set(a.veliId, [...(veliGrup.get(a.veliId) ?? []), a]);

  const smsSayisi = secim.sms ? veliGrup.size : 0;
  const epostaSayisi = secim.eposta ? ozet.epostaSayisi : 0;
  const { yayinId, tarih } = await r.yayinKaydet({
    listeId: liste.id, kullaniciId: o.sub, guncelleme, sms: secim.sms, eposta: secim.eposta,
    ogrenciSayisi: secim.hedef === 'toplu' && !secim.hatirlatma ? kapsam.size : ogrenciIdleri!.length, smsSayisi, epostaSayisi,
    hedefTipi, ogrenciIdleri: ogrenciIdleri ?? [], hatirlatma: !!secim.hatirlatma,
  });

  const kayitlar = [];
  for (const [veliId, grup] of veliGrup) {
    const ilk = grup[0];
    if (secim.sms) kayitlar.push({ yayinId, veliId, ogrenciId: ilk.ogrenciId, kanal: 'SMS' as const, alici: ilk.telefon, konu: null, metin: smsMetni(ilk, tur, okul?.slug) });
    if (secim.eposta && ilk.eposta) {
      const e = epostaIcerik(liste, grup, tur, okul?.slug);
      kayitlar.push({ yayinId, veliId, ogrenciId: ilk.ogrenciId, kanal: 'Eposta' as const, alici: ilk.eposta, konu: e.konu, metin: e.metin });
    }
  }
  const bildirimler = await r.bildirimleriEkle(kayitlar);

  // Gönderim: küçük gruplar halinde paralel. Büyük okullarda bu adım bir arka plan işine taşınabilir
  // (Bildirim tablosundaki 'Kuyrukta' kayıtlar tekrar denenebilir).
  const PARCA = 10;
  for (let i = 0; i < bildirimler.length; i += PARCA) {
    await Promise.all(bildirimler.slice(i, i + PARCA).map(async (b) => {
      const sonuc = b.kanal === 'SMS'
        ? await sms().gonder(b.alici, b.metin)
        : await (async () => {
            const grup = veliGrup.get(b.veliId!)!;
            const e = epostaIcerik(liste, grup, tur, okul?.slug);
            return epostaGonder(b.alici, e.konu, e.html, e.metin);
          })();
      await r.bildirimDurum(b.id, sonuc.ok ? 'Gonderildi' : 'Hata', { saglayiciId: sonuc.mesajId, hata: sonuc.hata });
    }));
  }

  return { yayinId, hedefTipi, ogrenciSayisi: secim.hedef === 'toplu' && !secim.hatirlatma ? kapsam.size : ogrenciIdleri!.length, smsSayisi, epostaSayisi, epostasiOlmayan: ozet.epostasiOlmayan, tarih };
}
