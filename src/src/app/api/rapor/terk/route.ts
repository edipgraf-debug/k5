import { hata } from '@/lib/api';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { raporKapsami } from '@/lib/raporlar';
import { tabloExcel } from '@/lib/excel-rapor';
import { excelYaniti } from '@/lib/yukleme/indir';

export async function GET(req: Request) {
  const o = await oturumAl();
  const kapsam = o ? await raporKapsami(o) : false;
  if (kapsam === false) return hata('Yetkiniz yok', 403);
  const u = new URL(req.url).searchParams;
  const saat = Math.min(720, Math.max(1, Number(u.get('saat')) || 24));
  const l = await (await ticaretRepo()).terkEdilenSepetler({ saat, okulId: Number(u.get('okulId')) || null, okulIdleri: kapsam });
  const x = await tabloExcel('Terk edilen sepetler', [
    { baslik: 'Veli', genislik: 22 }, { baslik: 'Telefon', genislik: 14, metin: true }, { baslik: 'E-posta', genislik: 26 }, { baslik: 'Öğrenci', genislik: 22 },
    { baslik: 'Sınıf', genislik: 8 }, { baslik: 'Okul', genislik: 28 }, { baslik: 'Plasiyer', genislik: 20 }, { baslik: 'Kalem', genislik: 8 },
    { baslik: 'Tutar', genislik: 14, para: true }, { baslik: 'Son işlem', genislik: 18 },
  ], l.map((s) => [s.veliAd, `0${s.telefon}`, s.eposta, s.ogrenciAd, s.sinifSube, s.okulAd, s.plasiyerAd, s.kalem, s.tutar, s.guncelleme]));
  return excelYaniti(x, `terk-edilen-sepetler-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
