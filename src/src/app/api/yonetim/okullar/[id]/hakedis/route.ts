import { NextResponse } from 'next/server';
import { z } from 'zod';
import { govde, hata } from '@/lib/api';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, yonetici } from '@/lib/yonetim-api';

const Tanim = z.object({
  oran: z.number().min(0, 'Oran 0-100 arası').max(100, 'Oran 0-100 arası'),
  baslangic: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Başlangıç tarihi seçin'),
  bitis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  veli: z.boolean().default(true), toplu: z.boolean().default(false),
  aciklama: z.preprocess((v) => (typeof v === 'string' && !v.trim() ? null : v), z.string().trim().max(300).nullable().default(null)),
}).refine((v) => !v.bitis || v.bitis >= v.baslangic, { message: 'Bitiş başlangıçtan önce olamaz' });

/** Yeni hakediş koşulu (öncekinin açık ucu yeni başlangıçtan bir gün önce kapanır) */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, Tanim);
  if ('yanit' in g) return g.yanit;
  const okul = id ? await (await yonetimRepo()).okulKaydi(id) : null;
  if (!id || !okul) return hata('Okul bulunamadı', 404);
  const tid = await (await ticaretRepo()).hakedisTanimEkle(id, g.veri, o.sub);
  await (await yonetimRepo()).islemYaz(o.sub, 'Hakedis', id, 'Hakediş koşulu tanımlandı', `${okul.ad} · %${g.veri.oran} · ${g.veri.baslangic}${g.veri.bitis ? ` – ${g.veri.bitis}` : ''}`);
  return NextResponse.json({ id: tid, durum: await (await ticaretRepo()).hakedisDurumu(id) });
}

/** Okul kendi panelinde ciro / hakediş görsün mü */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const g = await govde(req, z.object({ goster: z.boolean() }));
  if ('yanit' in g) return g.yanit;
  const okul = id ? await (await yonetimRepo()).okulKaydi(id) : null;
  if (!id || !okul) return hata('Okul bulunamadı', 404);
  await (await ticaretRepo()).hakedisGosterAyarla(id, g.veri.goster);
  await (await yonetimRepo()).islemYaz(o.sub, 'Hakedis', id, g.veri.goster ? 'Hakediş okula açıldı' : 'Hakediş okuldan gizlendi', okul.ad);
  return NextResponse.json({ ok: true });
}
