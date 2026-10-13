import 'server-only';
import { telefonNormalize } from '../auth';
import { katla } from '../katla';
import { yonetimRepo, type OgrenciKaydi, type OkulKaydi, type VeliKaydi } from '../data/yonetim';
import { sinifCoz } from './sinif';
import type { HamSatir, YuklemeSatiri } from './tipler';

export const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const DEGISIKLIK_YOK = 'Kayıtlı öğrenci, değişiklik yok';
const tel = (t: string) => `0${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6, 8)} ${t.slice(8)}`;
const temiz = (v: string | null) => (v ?? '').replace(/\s+/g, ' ').trim();
/** "ÖZTÜRK" / "öztürk" gibi yazımları "Öztürk" yapar (yalnız tamamen büyük ya da küçük yazılmışsa) */
export function adDuzelt(v: string): string {
  const t = temiz(v);
  if (t !== t.toLocaleUpperCase('tr') && t !== t.toLocaleLowerCase('tr')) return t;
  return t.toLocaleLowerCase('tr').split(' ').map((p) => p.charAt(0).toLocaleUpperCase('tr') + p.slice(1)).join(' ');
}
/** Okul numarası: "00412" ve "412" aynı kabul edilmez; yalnız boşluk ve ".0" (Excel sayı) temizlenir */
const noDuzelt = (v: string | null) => temiz(v).replace(/\.0+$/, '');

export interface AnalizSecenek { varsayilanOkulId: number | null; subeOtomatikAc: boolean }

/**
 * Satırları kontrol eder: hata (kaydedilmez), uyarı (kaydedilir, dikkat), işlem (Yeni / Güncelle).
 * Yükleme anında önizleme için ve onay anında güncel veriye göre yeniden çalışır.
 */
export async function satirlariKontrolEt(ham: HamSatir[], s: AnalizSecenek): Promise<YuklemeSatiri[]> {
  const y = await yonetimRepo();
  const okullar = await y.okulListesi(true);
  const okulKod = new Map(okullar.map((o) => [katla(o.kod).replace(/\s/g, ''), o]));
  const okulAd = new Map(okullar.map((o) => [katla(o.ad).replace(/\s+/g, ' '), o]));
  const varsayilan = s.varsayilanOkulId ? okullar.find((o) => o.id === s.varsayilanOkulId) ?? null : null;

  // satırın okulu
  const okulOf = (h: HamSatir): { okul: OkulKaydi | null; hata: string | null } => {
    const k = temiz(h.okulKodu);
    if (k) {
      const o = okulKod.get(katla(k).replace(/\s/g, '')) ?? okulAd.get(katla(k).replace(/\s+/g, ' '));
      if (!o) return { okul: null, hata: `Okul bulunamadı: "${k}"` };
      return { okul: o, hata: o.aktif ? null : `Okul pasif: ${o.ad}` };
    }
    if (!varsayilan) return { okul: null, hata: 'Okul seçilmedi (yükleme ekranında okul seçin ya da dosyaya "Okul Kodu" kolonu ekleyin)' };
    return { okul: varsayilan, hata: null };
  };
  const okulCoz = ham.map(okulOf);

  // toplu sorgular: okulların şubeleri, mevcut öğrenciler, kayıtlı veliler
  const okulIdleri = [...new Set(okulCoz.map((x) => x.okul?.id).filter((x): x is number => !!x))];
  const subeler = new Map<number, Map<string, number>>();       // okulId → "5-A" → subeId
  const mevcut = new Map<number, Map<string, OgrenciKaydi>>();  // okulId → okulNo → öğrenci
  for (const id of okulIdleri) {
    const m = new Map<string, number>();
    for (const sn of await y.okulSiniflari(id)) for (const b of sn.subeler) m.set(`${sn.seviye}-${b.ad.toLocaleUpperCase('tr')}`, b.id);
    subeler.set(id, m);
    const nolar = ham.filter((_, i) => okulCoz[i].okul?.id === id).map((h) => noDuzelt(h.okulNo)).filter(Boolean);
    mevcut.set(id, new Map((await y.ogrencilerOkulNo(id, [...new Set(nolar)])).map((o) => [o.okulNo, o])));
  }
  const telefonlar = new Set<string>();
  for (const h of ham) for (const t of [h.veliTelefon, h.veliTelefon2]) { const n = t ? telefonNormalize(t) : null; if (n) telefonlar.add(n); }
  const veliler = new Map<string, VeliKaydi>((await y.velilerTelefonla([...telefonlar])).map((v) => [v.telefon, v]));

  const gorulen = new Map<string, number>();   // okulId|okulNo → satır
  const acilacak = new Set<string>();          // bu dosyayla açılacak şubeler (uyarıyı bir kez anlamlı vermek için)

  return ham.map((h, i): YuklemeSatiri => {
    const hatalar: string[] = [];
    const uyarilar: string[] = [];
    const { okul, hata: okulHata } = okulCoz[i];
    if (okulHata) hatalar.push(okulHata);

    const okulNo = noDuzelt(h.okulNo);
    const ad = adDuzelt(h.ad ?? '');
    const soyad = adDuzelt(h.soyad ?? '');
    if (!okulNo) hatalar.push('Okul no boş');
    else if (okulNo.length > 20) hatalar.push('Okul no en fazla 20 karakter');
    if (!ad) hatalar.push('Ad boş');
    if (!soyad) hatalar.push('Soyad boş');
    if (ad.length > 100 || soyad.length > 100) hatalar.push('Ad / soyad çok uzun');

    let seviye: number | null = null, subeAd: string | null = null;
    const sc = sinifCoz(h.sinif, h.sube);
    if ('hata' in sc) hatalar.push(sc.hata);
    else {
      seviye = sc.seviye; subeAd = sc.sube;
      const anahtar = `${seviye}-${subeAd}`;
      if (okul && !subeler.get(okul.id)?.has(anahtar)) {
        if (s.subeOtomatikAc) { uyarilar.push(`${anahtar} şubesi açılacak`); acilacak.add(`${okul.id}|${anahtar}`); }
        else hatalar.push(`${anahtar} şubesi bu okulda yok`);
      }
    }

    // dosya içinde tekrar
    if (okul && okulNo) {
      const k = `${okul.id}|${okulNo}`;
      if (gorulen.has(k)) hatalar.push(`Okul no ${okulNo} dosyada tekrar ediyor (satır ${gorulen.get(k)})`);
      else gorulen.set(k, h.satirNo);
    }

    // veli telefonları
    const t1 = h.veliTelefon ? telefonNormalize(h.veliTelefon) : null;
    let t2 = h.veliTelefon2 ? telefonNormalize(h.veliTelefon2) : null;
    if (h.veliTelefon && !t1) hatalar.push(`Veli telefonu geçersiz: "${h.veliTelefon}" (5XX XXX XX XX olmalı)`);
    if (!h.veliTelefon) uyarilar.push('Veli telefonu yok: veli giriş yapamaz, bildirim gitmez');
    if (h.veliTelefon2 && !t2) uyarilar.push(`2. veli telefonu geçersiz, atlanacak: "${h.veliTelefon2}"`);
    if (t2 && t2 === t1) t2 = null;
    // geçersiz e-posta ham haliyle saklanır (uyarı her kontrolde görünsün); kayıtta atlanır
    const eposta: string | null = temiz(h.veliEposta).toLowerCase() || null;
    if (eposta && !EPOSTA.test(eposta)) uyarilar.push(`E-posta geçersiz, atlanacak: "${eposta}"`);

    // mevcut öğrenci → güncelle
    const ogr = okul && okulNo ? mevcut.get(okul.id)?.get(okulNo) : undefined;
    let islem: YuklemeSatiri['islem'] = null;
    if (!hatalar.length) {
      islem = ogr ? 'Guncelle' : 'Yeni';
      if (ogr) {
        const degisen: string[] = [];
        if (ogr.ad !== ad || ogr.soyad !== soyad) degisen.push(`ad: ${ogr.ad} ${ogr.soyad} → ${ad} ${soyad}`);
        const yeniSube = seviye != null ? `${seviye}-${subeAd}` : null;
        if (yeniSube && ogr.sinifSube !== yeniSube) degisen.push(`şube: ${ogr.sinifSube ?? 'yok'} → ${yeniSube}`);
        if (!ogr.aktif) degisen.push('pasif öğrenci yeniden aktif olacak');
        if (degisen.length) uyarilar.push(`Kayıtlı öğrenci güncellenecek (${degisen.join('; ')})`);
        else uyarilar.push(DEGISIKLIK_YOK);
      }
      for (const t of [t1, t2]) {
        if (!t) continue;
        const v = veliler.get(t);
        if (!v) continue;
        if (ogr && v.ogrenciler.some((o) => o.id === ogr.id)) continue;                 // zaten bağlı
        const diger = v.ogrenciler.map((o) => o.ad).slice(0, 3).join(', ');
        uyarilar.push(`${tel(t)} kayıtlı veli${v.adSoyad ? ` (${v.adSoyad})` : ''}${diger ? `, diğer çocukları: ${diger}` : ''}; kardeş olarak bağlanacak`);
        if (!v.aktif) uyarilar.push(`${tel(t)} velisinin hesabı pasif`);
      }
    }

    return {
      ...h, okulNo: okulNo || h.okulNo, ad: ad || h.ad, soyad: soyad || h.soyad,
      // geçerli telefonlar 5XXXXXXXXX olarak saklanır; geçersiz 2. telefon ham kalır (uygulamada atlanır)
      veliTelefon: t1 ?? h.veliTelefon, veliTelefon2: t2 ?? (h.veliTelefon2 && !telefonNormalize(h.veliTelefon2) ? h.veliTelefon2 : null),
      veliEposta: eposta,
      okulId: okul?.id ?? null, seviye, subeAd,
      hata: hatalar.length ? hatalar.join(' · ') : null,
      uyari: uyarilar.length ? uyarilar.join(' · ') : null,
      islem,
    };
  });
}
