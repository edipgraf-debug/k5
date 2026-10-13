import 'server-only';
import { ticaretRepo, type SayfaKaydi } from './data/ticaret';

export interface SiteBilgisi {
  firma: { unvan: string; adres: string; telefon: string; eposta: string; vergiDairesi: string; vergiNo: string; mersisNo: string; calismaSaatleri: string };
  whatsapp: { aktif: boolean; numara: string; mesaj: string; saatler: string };
  sayfalar: Pick<SayfaKaydi, 'slug' | 'baslik' | 'altBilgi'>[];
}

/** Kurumsal sayfa slug'ları: alt bilgide "Kurumsal" sütununda; diğerleri "Sözleşmeler ve politikalar" */
export const KURUMSAL = ['hakkimizda', 'iletisim', 'sss', 'teslimat'];

/** Alt bilgi, iletişim ve WhatsApp için site bilgileri (veritabanına ulaşılamazsa boş döner, sayfa açılmaya devam eder) */
export async function siteBilgisi(): Promise<SiteBilgisi> {
  let a: Record<string, string> = {};
  let sayfalar: SiteBilgisi['sayfalar'] = [];
  try {
    const t = await ticaretRepo();
    [a, sayfalar] = await Promise.all([t.ayarlar(), t.sayfalar().then((l) => l.filter((s) => s.yayinda).map(({ slug, baslik, altBilgi }) => ({ slug, baslik, altBilgi })))]);
  } catch { /* yok say */ }
  const g = (k: string) => a[k] ?? '';
  return {
    firma: { unvan: g('firma.unvan') || 'Kardelen Kitabevi', adres: g('firma.adres'), telefon: g('firma.telefon'), eposta: g('firma.eposta'),
      vergiDairesi: g('firma.vergiDairesi'), vergiNo: g('firma.vergiNo'), mersisNo: g('firma.mersisNo'), calismaSaatleri: g('firma.calismaSaatleri') },
    whatsapp: { aktif: g('whatsapp.aktif') === '1' && /^\d{10,15}$/.test(g('whatsapp.numara')), numara: g('whatsapp.numara'), mesaj: g('whatsapp.mesaj'), saatler: g('whatsapp.saatler') },
    sayfalar,
  };
}

export const whatsappAdresi = (numara: string, mesaj: string) => `https://wa.me/${numara}${mesaj ? `?text=${encodeURIComponent(mesaj)}` : ''}`;
export const sabitTel = (t: string) => (t.length === 10 ? `0${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6, 8)} ${t.slice(8)}` : t);
