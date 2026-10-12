import { NextResponse } from 'next/server';
import { hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, yonetici } from '@/lib/yonetim-api';
import { YuklemeHatasi, yuklemeyiUygula } from '@/lib/yukleme/uygula';

// aynı yüklemenin iki kez onaylanmasını (çift tıklama) engeller
const isleniyor = new Set<number>();

/** Önizlemedeki geçerli satırları kaydet (hatalı satırlar atlanır) */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const y = await yonetimRepo();
  const parti = id ? await y.yuklemeParti(id) : null;
  if (!parti) return hata('Yükleme bulunamadı', 404);
  if (isleniyor.has(parti.id)) return hata('Bu yükleme şu an kaydediliyor', 409);
  isleniyor.add(parti.id);
  try {
    return NextResponse.json({ sonuc: await yuklemeyiUygula(parti, o.sub) });
  } catch (e) {
    if (e instanceof YuklemeHatasi) return hata(e.message, 409);
    throw e;
  } finally {
    isleniyor.delete(parti.id);
  }
}
