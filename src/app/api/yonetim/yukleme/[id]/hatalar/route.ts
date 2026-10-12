import { hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam, yonetici } from '@/lib/yonetim-api';
import { hataliSatirlarExcel } from '@/lib/yukleme/excel';
import { excelYaniti } from '@/lib/yukleme/indir';

/** Hatalı satırları Excel olarak indir (düzeltip yeniden yüklemek için) */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await yonetici())) return hata('Yetkiniz yok', 403);
  const id = idParam((await ctx.params).id);
  const parti = id ? await (await yonetimRepo()).yuklemeParti(id) : null;
  if (!parti) return hata('Yükleme bulunamadı', 404);
  const ad = parti.dosyaAdi.replace(/\.[^.]+$/, '');
  return excelYaniti(await hataliSatirlarExcel(parti), `${ad}-hatali-satirlar.xlsx`);
}
