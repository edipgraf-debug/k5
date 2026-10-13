import { hata } from '@/lib/api';
import { yonetici } from '@/lib/yonetim-api';
import { sablonExcel } from '@/lib/yukleme/excel';
import { excelYaniti } from '@/lib/yukleme/indir';

export async function GET() {
  if (!(await yonetici())) return hata('Yetkiniz yok', 403);
  return excelYaniti(await sablonExcel(), 'kardelen-okul-ogrenci-sablonu.xlsx');
}
