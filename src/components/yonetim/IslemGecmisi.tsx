import type { IslemKaydi } from '@/lib/data/yonetim';
import { tarihSaat } from '@/lib/bicim';

/** Kayıttaki son değişiklikler: kim, ne zaman, ne yaptı */
export default function IslemGecmisi({ islemler }: { islemler: IslemKaydi[] }) {
  return (
    <section className="kart overflow-hidden">
      <div className="border-b border-[#EEF0F3] px-6 py-4">
        <span className="text-xs font-extrabold tracking-wider text-kiremit">KAYIT GEÇMİŞİ</span>
        <h2 className="font-baslik text-lg font-extrabold">Son değişiklikler</h2>
      </div>
      {islemler.length ? (
        <ul className="flex flex-col">
          {islemler.map((i) => (
            <li key={i.id} className="flex flex-col gap-0.5 border-b border-[#EEF0F3] px-6 py-3 last:border-0">
              <span className="font-bold">{i.islem}</span>
              {i.ayrinti && <span className="text-sm text-metin-2">{i.ayrinti}</span>}
              <span className="text-[13px] text-metin-3">{tarihSaat(i.tarih)} · {i.kullanici}</span>
            </li>
          ))}
        </ul>
      ) : <p className="px-6 py-5 text-sm text-metin-2">Panelden yapılmış bir değişiklik yok.</p>}
    </section>
  );
}
