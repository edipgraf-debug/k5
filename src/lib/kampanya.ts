import 'server-only';
import { z } from 'zod';
import { yonetimRepo, type PersonelKaydi } from './data/yonetim';
import { ticaretRepo, type KampanyaKaydi } from './data/ticaret';
import { sms } from './notify/sms';
import { epostaGonder } from './notify/email';
import { siteAdresi } from './ortam';
import { tarihMetni, tl } from './bicim';

const tarih = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih seçin');
export const KampanyaSema = z.object({
  ad: z.string().trim().min(3, 'Kampanya adını girin').max(200),
  aciklama: z.preprocess((v) => (typeof v === 'string' && !v.trim() ? null : v), z.string().trim().max(2000).nullable().default(null)),
  baslangic: tarih, bitis: tarih,
  indirimOrani: z.number().min(0).max(100).nullable().default(null),
  aktif: z.boolean().default(true),
  urunler: z.array(z.object({ urunId: z.number().int().positive(), kampanyaFiyati: z.number().nonnegative().max(1_000_000).nullable().default(null) })).min(1, 'Kampanyaya en az bir ürün ekleyin').max(500),
}).refine((v) => v.bitis >= v.baslangic, { message: 'Bitiş tarihi başlangıçtan önce olamaz', path: ['bitis'] })
  .refine((v) => v.indirimOrani != null || v.urunler.every((u) => u.kampanyaFiyati != null), { message: 'İndirim oranı girin ya da her ürüne kampanya fiyatı yazın', path: ['indirimOrani'] })
  .refine((v) => new Set(v.urunler.map((u) => u.urunId)).size === v.urunler.length, { message: 'Aynı ürün iki kez eklenmiş' });

export const GonderSema = z.object({
  hedefler: z.array(z.enum(['Okul', 'Ogretmen'])).min(1, 'Okul yetkilisi ya da öğretmen seçin'),
  kanallar: z.array(z.enum(['SMS', 'Eposta'])).min(1, 'SMS ya da e-posta seçin'),
  okulIdleri: z.array(z.number().int().positive()).max(1000).nullable().default(null),   // null = tüm okullar
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const ascii = (s: string) => s.replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => ({ ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' })[c]!);

export function kampanyaSms(k: KampanyaKaydi) {
  return ascii(`Kardelen Okul: ${k.ad}${k.indirimOrani ? ` (%${k.indirimOrani} indirim)` : ''} ${tarihMetni(k.bitis)} tarihine kadar. Kampanyali urunler: ${siteAdresi()}/kampanyalar`).slice(0, 300);
}

export function kampanyaEposta(k: KampanyaKaydi, ad: string) {
  const konu = `Kampanya: ${k.ad}`;
  const satirlar = k.urunler.slice(0, 30).map((u) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #EEF0F3">${esc(u.ad)}<br><span style="color:#5A6575;font-size:13px">${esc(u.yayinevi ?? '')}</span></td>
    <td style="padding:6px 8px;border-bottom:1px solid #EEF0F3;text-align:right;white-space:nowrap">${u.kampanyaFiyati < u.normalFiyat ? `<s style="color:#9AA3B0">${tl(u.normalFiyat)}</s><br>` : ''}<b>${tl(u.kampanyaFiyati)}</b></td></tr>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;color:#172334;max-width:620px">
    <h2 style="margin:0 0 6px">${esc(k.ad)}</h2>
    <p style="margin:0 0 12px;color:#5A6575">Sayın ${esc(ad)}, ${tarihMetni(k.baslangic)} – ${tarihMetni(k.bitis)} tarihleri arasında geçerli kampanyamızı bilginize sunarız.</p>
    ${k.aciklama ? `<p>${esc(k.aciklama)}</p>` : ''}
    <table style="border-collapse:collapse;width:100%;font-size:15px">${satirlar}</table>
    ${k.urunler.length > 30 ? `<p>… ve ${k.urunler.length - 30} ürün daha.</p>` : ''}
    <p style="margin-top:18px"><a href="${siteAdresi()}/kampanyalar" style="background:#F89C0E;color:#172334;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">Kampanyayı incele</a></p>
    <p style="color:#9AA3B0;font-size:12px">Bu e-posta Kardelen Okul'a kayıtlı okul yetkilisi / öğretmen olduğunuz için gönderildi.</p></div>`;
  const metin = `${k.ad}\n${tarihMetni(k.baslangic)} – ${tarihMetni(k.bitis)}\n${k.aciklama ?? ''}\n\n${k.urunler.slice(0, 30).map((u) => `${u.ad}: ${tl(u.kampanyaFiyati)}`).join('\n')}\n\n${siteAdresi()}/kampanyalar`;
  return { konu, html, metin };
}

export interface GonderimSonucu { kisi: number; sms: number; eposta: number; telefonsuz: number; hata: number }

/** Kampanyayı seçilen okul yetkilileri ve öğretmenlere SMS ve/veya e-posta ile duyurur; her gönderim kayda geçer. */
export async function kampanyaDuyur(k: KampanyaKaydi, g: z.infer<typeof GonderSema>, gonderenId: number): Promise<GonderimSonucu> {
  const y = await yonetimRepo();
  const t = await ticaretRepo();
  const kisiler: PersonelKaydi[] = [];
  for (const tip of g.hedefler) kisiler.push(...(await y.personelListesi({ tip })).filter((p) => p.aktif && p.okulId && (!g.okulIdleri || g.okulIdleri.includes(p.okulId))));
  const sonuc: GonderimSonucu = { kisi: kisiler.length, sms: 0, eposta: 0, telefonsuz: 0, hata: 0 };
  const smsMetni = kampanyaSms(k);
  const isler: (() => Promise<void>)[] = [];
  for (const p of kisiler) {
    if (g.kanallar.includes('SMS')) {
      if (!p.telefon) sonuc.telefonsuz++;
      else isler.push(async () => {
        const [id] = await t.kampanyaGonderimEkle([{ kampanyaId: k.id, kullaniciId: p.id, kanal: 'SMS', alici: p.telefon! }], gonderenId);
        const r = await sms().gonder(p.telefon!, smsMetni);
        await t.kampanyaGonderimDurum(id, r.ok ? 'Gonderildi' : 'Hata', r.hata);
        if (r.ok) sonuc.sms++; else sonuc.hata++;
      });
    }
    if (g.kanallar.includes('Eposta')) {
      isler.push(async () => {
        const [id] = await t.kampanyaGonderimEkle([{ kampanyaId: k.id, kullaniciId: p.id, kanal: 'Eposta', alici: p.eposta }], gonderenId);
        const e = kampanyaEposta(k, p.adSoyad);
        const r = await epostaGonder(p.eposta, e.konu, e.html, e.metin);
        await t.kampanyaGonderimDurum(id, r.ok ? 'Gonderildi' : 'Hata', r.hata);
        if (r.ok) sonuc.eposta++; else sonuc.hata++;
      });
    }
  }
  // en fazla 5 eşzamanlı gönderim
  for (let i = 0; i < isler.length; i += 5) await Promise.all(isler.slice(i, i + 5).map((f) => f()));
  return sonuc;
}
