import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo, type HedefTip } from '@/lib/data/yonetim';
import { kayitIslemi, yonetici } from '@/lib/yonetim-api';
import { ibanGecerli, ibanTemizle } from '@/lib/iban';

const bosNull = (v: unknown) => (typeof v === 'string' && !v.trim() ? null : v);
const metinN = (max: number) => z.preprocess(bosNull, z.string().trim().max(max).nullable().default(null));
const tutarN = z.preprocess((v) => (v === '' ? null : v), z.number().nonnegative().max(1_000_000).nullable().default(null));

const Banka = z.object({
  banka: z.string().trim().min(2, 'Banka adını girin').max(100), hesapAdi: z.string().trim().min(2, 'Hesap adını girin').max(200),
  iban: z.string().transform(ibanTemizle).refine(ibanGecerli, 'IBAN geçersiz (TR ile başlayan 26 karakter, kontrol hanesi tutmalı)'),
  sube: metinN(100), hesapNo: metinN(30), paraBirimi: z.enum(['TRY', 'USD', 'EUR']).default('TRY'), sira: z.number().int().min(0).default(0), aktif: z.boolean().default(true),
});
const Kargo = z.object({
  kod: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,20}$/, 'Kod 2-20 karakter: harf, rakam, _ -'), ad: z.string().trim().min(2, 'Firma adını girin').max(100),
  tur: z.enum(['Kurye', 'Kargo']), entegrasyon: z.enum(['Api', 'Manuel']).default('Manuel'), sabitUcret: z.number().nonnegative().max(100000),
  ucretsizLimit: tutarN, tahminiTeslim: metinN(50),
  takipUrl: z.preprocess(bosNull, z.string().trim().url('Takip adresi geçerli olmalı').max(300).refine((u) => u.startsWith('https://'), 'https:// ile başlamalı').nullable().default(null)),
  sira: z.number().int().min(0).default(0), aktif: z.boolean().default(true),
});
const Bolge = z.object({
  firmaId: z.number().int().positive().nullable(), il: z.string().trim().min(2, 'İl girin').max(50), ilce: z.string().trim().min(2, 'İlçe girin').max(50),
  mahalle: metinN(100), ucret: z.number().nonnegative().max(100000), ucretsizLimit: tutarN, aktif: z.boolean().default(true),
});
const Pos = z.object({ test: z.boolean(), aktif: z.boolean() });
const Taksit = z.object({ taksitler: z.array(z.object({ kartAilesi: metinN(30), taksit: z.number().int().min(1).max(12), vadeFarki: z.number().min(0).max(100), aktif: z.boolean() })).max(60) });
const Kural = z.object({
  oncelik: z.number().int().min(1).max(10000), ad: z.string().trim().min(2, 'Kural adını girin').max(100),
  taksitMin: z.number().int().min(1).max(12).nullable().default(null), taksitMax: z.number().int().min(1).max(12).nullable().default(null),
  kartBankasi: metinN(50), kartAilesi: metinN(30), kartTipi: z.enum(['Kredi', 'Banka']).nullable().default(null), posId: z.number().int().positive(), aktif: z.boolean().default(true),
}).refine((v) => v.taksitMin == null || v.taksitMax == null || v.taksitMax >= v.taksitMin, { message: 'En çok taksit en az taksitten küçük olamaz' });
const Sayfa = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/, 'Adres yalnız küçük harf, rakam ve tire'), baslik: z.string().trim().min(2, 'Başlık girin').max(150),
  icerik: z.string().max(100_000), yayinda: z.boolean(), altBilgi: z.boolean(), sira: z.number().int().min(0).max(100000),
});

const Sema = z.discriminatedUnion('tur', [
  z.object({ tur: z.literal('banka'), id: z.number().int().positive().nullable(), veri: Banka }),
  z.object({ tur: z.literal('kargo'), id: z.number().int().positive().nullable(), veri: Kargo }),
  z.object({ tur: z.literal('bolge'), id: z.number().int().positive().nullable(), veri: Bolge.optional(), sil: z.boolean().optional() }),
  z.object({ tur: z.literal('pos'), id: z.number().int().positive(), veri: Pos }),
  z.object({ tur: z.literal('taksit'), id: z.number().int().positive(), veri: Taksit }),
  z.object({ tur: z.literal('kural'), id: z.number().int().positive().nullable(), veri: Kural.optional(), sil: z.boolean().optional() }),
  z.object({ tur: z.literal('sayfa'), id: z.number().int().positive().nullable(), veri: Sayfa }),
]);

const HEDEF: Record<string, HedefTip> = { banka: 'Banka', kargo: 'Kargo', bolge: 'Kargo', pos: 'Pos', taksit: 'Pos', kural: 'Pos', sayfa: 'Sayfa' };
const AD: Record<string, string> = { banka: 'Banka hesabı', kargo: 'Kargo / kurye firması', bolge: 'Teslimat bölgesi', pos: 'Sanal POS', taksit: 'Taksit seçenekleri', kural: 'POS yönlendirme kuralı', sayfa: 'Kurumsal sayfa' };

/** Site ayarlarındaki kayıt listeleri: banka hesapları, kargo firmaları / bölgeleri, POS, taksit, yönlendirme kuralları, kurumsal sayfalar */
export async function POST(req: Request) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const g = await govde(req, Sema);
  if ('yanit' in g) return g.yanit;
  const t = await ticaretRepo();
  const b = g.veri;
  const r = await kayitIslemi(async () => {
    switch (b.tur) {
      case 'banka': return t.bankaHesabiKaydet(b.id, b.veri);
      case 'kargo': return t.kargoFirmaKaydet(b.id, b.veri);
      case 'bolge':
        if (b.sil && b.id) { await t.kargoBolgeSil(b.id); return b.id; }
        if (!b.veri) throw new Error('veri yok');
        return t.kargoBolgeKaydet(b.id, b.veri);
      case 'pos': await t.posGuncelle(b.id, b.veri); return b.id;
      case 'taksit': await t.taksitleriKaydet(b.id, b.veri.taksitler); return b.id;
      case 'kural':
        if (b.sil && b.id) { await t.posKuraliSil(b.id); return b.id; }
        if (!b.veri) throw new Error('veri yok');
        if (!(await t.posListesi()).some((p) => p.id === b.veri!.posId)) throw new Error('POS bulunamadı');
        return t.posKuraliKaydet(b.id, b.veri);
      case 'sayfa': return t.sayfaKaydet(b.id, b.veri);
    }
  });
  if (r instanceof Response) return r;
  const islem = 'sil' in b && b.sil ? 'silindi' : b.id ? 'güncellendi' : 'eklendi';
  const ayrinti = b.tur === 'banka' ? `${b.veri.banka} · ${b.veri.iban.slice(-4)}` : b.tur === 'sayfa' ? b.veri.baslik : b.tur === 'kargo' ? b.veri.ad : null;
  await (await yonetimRepo()).islemYaz(o.sub, HEDEF[b.tur], r, `${AD[b.tur]} ${islem}`, ayrinti);
  return NextResponse.json({ id: r });
}
