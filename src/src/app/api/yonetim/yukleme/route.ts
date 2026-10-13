import { NextResponse } from 'next/server';
import { hata } from '@/lib/api';
import { yonetimRepo } from '@/lib/data/yonetim';
import { yonetici } from '@/lib/yonetim-api';
import { DosyaHatasi, dosyaOku, MAX_BAYT } from '@/lib/yukleme/ayristir';
import { satirlariKontrolEt } from '@/lib/yukleme/analiz';

/**
 * Excel / CSV yükle → satırları kontrol et → önizleme olarak kaydet. Hiçbir öğrenci bu adımda kaydedilmez.
 * multipart alanları: dosya, okulId (isteğe bağlı; dosyada Okul Kodu varsa), subeOtomatikAc ("1" / "0")
 */
export async function POST(req: Request) {
  const o = await yonetici();
  if (!o) return hata('Yetkiniz yok', 403);
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BAYT + 256 * 1024) return hata('Dosya en fazla 5 MB olabilir', 413);
  let form: FormData;
  try { form = await req.formData(); } catch { return hata('Geçersiz istek'); }
  const dosya = form.get('dosya');
  if (!(dosya instanceof File) || !dosya.size) return hata('Dosya seçin');
  const y = await yonetimRepo();
  const okulId = Number(form.get('okulId')) || null;
  if (okulId && !(await y.okulKaydi(okulId))) return hata('Okul bulunamadı', 404);
  const subeOtomatikAc = form.get('subeOtomatikAc') !== '0';

  try {
    const { satirlar: ham, taninmayan } = await dosyaOku(Buffer.from(await dosya.arrayBuffer()), dosya.name);
    const satirlar = await satirlariKontrolEt(ham, { varsayilanOkulId: okulId, subeOtomatikAc });
    const id = await y.yuklemeOlustur({ okulId, dosyaAdi: dosya.name.slice(0, 255), kullaniciId: o.sub, subeOtomatikAc }, satirlar);
    return NextResponse.json({ id, toplam: satirlar.length, taninmayan });
  } catch (e) {
    if (e instanceof DosyaHatasi) return hata(e.message);
    throw e;
  }
}
