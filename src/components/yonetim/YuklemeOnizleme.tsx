'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { YuklemeParti, YuklemeSatiri } from '@/lib/yukleme/tipler';
import { Rozet, TABLO } from '@/components/panel/Ortak';
import { DurumMesaji, useIstek } from './ortak';

type Filtre = 'tum' | 'yeni' | 'guncelle' | 'uyari' | 'hata';
const DEGISIKLIK_YOK = 'Kayıtlı öğrenci, değişiklik yok';
const degismez = (s: YuklemeSatiri) => s.islem === 'Guncelle' && (s.uyari ?? '').includes(DEGISIKLIK_YOK);
const tel = (t: string | null) => (t && /^5\d{9}$/.test(t) ? `0${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6, 8)} ${t.slice(8)}` : t ?? '');

interface Sonuc { yeni: number; guncellenen: number; atlanan: number; acilanSube: string[]; veliBaglanan: number; hatali: number }

/** Yükleme önizlemesi: satır satır sonuç, filtre, kaydet / iptal / hatalıları indir */
export default function YuklemeOnizleme({ parti, okulAdlari }: { parti: YuklemeParti; okulAdlari: Record<number, string> }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [filtre, setFiltre] = useState<Filtre>(parti.satirlar.some((s) => s.hata) ? 'hata' : 'tum');
  const [goster, setGoster] = useState(100);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const satirlar = parti.satirlar;
  const coklu = new Set(satirlar.map((s) => s.okulId)).size > 1 || !parti.okulId;

  const sayi = useMemo(() => ({
    tum: satirlar.length,
    yeni: satirlar.filter((s) => s.islem === 'Yeni').length,
    guncelle: satirlar.filter((s) => s.islem === 'Guncelle' && !degismez(s)).length,
    ayni: satirlar.filter(degismez).length,
    uyari: satirlar.filter((s) => !s.hata && s.uyari && !degismez(s)).length,
    hata: satirlar.filter((s) => s.hata).length,
  }), [satirlar]);
  const suz: Record<Filtre, (s: YuklemeSatiri) => boolean> = {
    tum: () => true, yeni: (s) => s.islem === 'Yeni', guncelle: (s) => s.islem === 'Guncelle' && !degismez(s),
    uyari: (s) => !s.hata && !!s.uyari && !degismez(s), hata: (s) => !!s.hata,
  };
  const gorunen = satirlar.filter(suz[filtre]);
  const kaydedilecek = sayi.yeni + sayi.guncelle + sayi.ayni;
  const onizleme = parti.durum === 'Onizleme';

  async function kaydet() {
    const r = await gonder<{ sonuc: Sonuc }>(`/api/yonetim/yukleme/${parti.id}/onayla`, 'POST');
    if (r) { setSonuc(r.sonuc); router.refresh(); }
  }
  async function iptal() {
    if (!window.confirm('Bu yükleme iptal edilsin mi? Hiçbir kayıt yapılmaz.')) return;
    if (await gonder(`/api/yonetim/yukleme/${parti.id}/iptal`, 'POST')) router.push('/yonetim/ogrenciler/yukle');
  }

  const FILTRELER: { id: Filtre; ad: string }[] = [
    { id: 'tum', ad: 'Tümü' }, { id: 'yeni', ad: 'Yeni' }, { id: 'guncelle', ad: 'Güncellenecek' }, { id: 'uyari', ad: 'Uyarılı' }, { id: 'hata', ad: 'Hatalı' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {sonuc && (
        <div role="status" className="flex flex-col gap-2 rounded-2xl bg-yesil-zemin p-5 text-yesil">
          <strong className="font-baslik text-lg">✓ Kaydedildi</strong>
          <span className="text-[15px]">
            {sonuc.yeni} yeni öğrenci, {sonuc.guncellenen} öğrenci güncellendi{sonuc.atlanan ? `, ${sonuc.atlanan} kayıtlı öğrencide değişiklik yoktu` : ''} · {sonuc.veliBaglanan} veli bağlandı
            {sonuc.acilanSube.length ? ` · açılan şubeler: ${sonuc.acilanSube.join(', ')}` : ''}{sonuc.hatali ? ` · ${sonuc.hatali} hatalı satır atlandı` : ''}.
          </span>
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {([['Toplam satır', sayi.tum, ''], ['Yeni öğrenci', sayi.yeni, ''], ['Güncellenecek', sayi.guncelle, ''], ['Uyarılı', sayi.uyari, 'sari'], ['Hatalı', sayi.hata, sayi.hata ? 'kirmizi' : '']] as const).map(([ad, n, ton]) => (
          <div key={ad} className={`kart flex flex-col gap-0.5 p-4 ${ton === 'kirmizi' ? 'border-kirmizi' : ton === 'sari' && n ? 'border-turuncu' : ''}`}>
            <span className="text-sm font-bold text-metin-2">{ad}</span>
            <strong className={`font-baslik text-[26px] ${ton === 'kirmizi' ? 'text-kirmizi' : ''}`}>{n}</strong>
          </div>
        ))}
      </div>

      <DurumMesaji durum={durum} />
      {onizleme && !sonuc && (
        <div className="kart flex flex-wrap items-center gap-3 p-5">
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-0.5">
            <strong className="font-baslik">{kaydedilecek ? `${kaydedilecek} öğrenci kaydedilmeye hazır` : 'Kaydedilecek geçerli satır yok'}</strong>
            {sayi.ayni > 0 && <span className="text-sm text-metin-2">{sayi.ayni} kayıtlı öğrencide değişiklik yok; yalnız yeni veli varsa bağlanır.</span>}
            <span className="text-sm text-metin-2">
              {sayi.hata ? `${sayi.hata} hatalı satır kaydedilmez; indirip düzeltin ve yeniden yükleyin. ` : ''}Uyarılı satırlar kaydedilir.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sayi.hata > 0 && <a href={`/api/yonetim/yukleme/${parti.id}/hatalar`} className="btn-cerceve min-h-11" download>Hatalı satırları indir</a>}
            <button type="button" onClick={iptal} disabled={bekliyor} className="btn-cerceve min-h-11 border-kenar">İptal et</button>
            <button type="button" onClick={kaydet} disabled={bekliyor || !kaydedilecek} className="btn-turuncu min-h-11">
              {bekliyor ? 'Kaydediliyor…' : `${kaydedilecek} öğrenciyi kaydet`}
            </button>
          </div>
        </div>
      )}
      {!onizleme && !sonuc && (
        <div className="kart flex flex-wrap items-center gap-3 p-5">
          <Rozet ton={parti.durum === 'Onaylandi' ? 'yesil' : 'gri'}>{parti.durum === 'Onaylandi' ? 'Kaydedildi' : 'İptal edildi'}</Rozet>
          {parti.durum === 'Onaylandi' && <span className="text-sm text-metin-2">{parti.kaydedilen} satır işlendi{parti.hatali ? `, ${parti.hatali} hatalı satır atlandı` : ''}.</span>}
          {parti.hatali > 0 && <a href={`/api/yonetim/yukleme/${parti.id}/hatalar`} className="btn-cerceve min-h-11" download>Hatalı satırları indir</a>}
        </div>
      )}
      {(sonuc || parti.durum === 'Onaylandi') && (
        <div className="flex flex-wrap gap-2">
          {parti.okulId && <Link href={`/yonetim/ogrenciler?okulId=${parti.okulId}`} className="btn-koyu">Öğrencileri gör</Link>}
          <Link href="/yonetim/ogrenciler/yukle" className="btn-cerceve">Yeni dosya yükle</Link>
        </div>
      )}

      <section className="kart overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0F3] px-6 py-4">
          <div role="group" aria-label="Filtre" className="flex flex-wrap gap-1.5">
            {FILTRELER.map((f) => (
              <button key={f.id} type="button" aria-pressed={filtre === f.id} onClick={() => { setFiltre(f.id); setGoster(100); }}
                className={`min-h-11 cursor-pointer rounded-[10px] border-2 px-3 text-sm font-bold ${filtre === f.id ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white'}`}>
                {f.ad} <span className="opacity-75">({sayi[f.id]})</span>
              </button>
            ))}
          </div>
        </div>
        <div className={TABLO.sar}>
          <table className={`${TABLO.tablo} min-w-[980px]`}>
            <thead><tr>
              <th scope="col" className={`${TABLO.th} w-16`}>Satır</th>
              {coklu && <th scope="col" className={TABLO.th}>Okul</th>}
              <th scope="col" className={TABLO.th}>No</th><th scope="col" className={TABLO.th}>Öğrenci</th><th scope="col" className={TABLO.th}>Şube</th>
              <th scope="col" className={TABLO.th}>Veli</th><th scope="col" className={`${TABLO.th} w-[38%]`}>Sonuç</th>
            </tr></thead>
            <tbody>
              {gorunen.slice(0, goster).map((s) => (
                <tr key={s.satirNo} className={s.hata ? 'bg-[#FFF5F0]' : undefined}>
                  <td className={`${TABLO.td} text-metin-3`}>{s.satirNo}</td>
                  {coklu && <td className={TABLO.td}>{s.okulId ? okulAdlari[s.okulId] ?? '—' : s.okulKodu ?? '—'}</td>}
                  <td className={TABLO.td}>{s.okulNo}</td>
                  <td className={`${TABLO.td} font-bold`}>{[s.ad, s.soyad].filter(Boolean).join(' ') || '—'}</td>
                  <td className={TABLO.td}>{s.seviye != null && s.subeAd ? `${s.seviye}-${s.subeAd}` : [s.sinif, s.sube].filter(Boolean).join(' / ') || '—'}</td>
                  <td className={TABLO.td}>
                    <div className="flex flex-col text-sm">
                      <span>{tel(s.veliTelefon) || <span className="text-metin-3">—</span>}</span>
                      {s.veliAdSoyad && <span className="text-metin-3">{s.veliAdSoyad}</span>}
                    </div>
                  </td>
                  <td className={TABLO.td}>
                    <div className="flex flex-col gap-1">
                      {s.hata ? <Rozet ton="kirmizi">Hatalı</Rozet> : s.islem === 'Yeni' ? <Rozet ton="yesil">Yeni</Rozet> : degismez(s) ? <Rozet>Değişiklik yok</Rozet> : s.islem === 'Guncelle' ? <Rozet ton="lacivert">Güncelle</Rozet> : null}
                      {s.hata && <span className="text-sm font-semibold text-kirmizi">{s.hata}</span>}
                      {s.uyari && !degismez(s) && <span className="text-sm text-sari">{s.uyari}</span>}
                      {degismez(s) && s.uyari !== DEGISIKLIK_YOK && <span className="text-sm text-sari">{(s.uyari ?? "").replace(`${DEGISIKLIK_YOK} · `, '').replace(` · ${DEGISIKLIK_YOK}`, '')}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!gorunen.length && <p className="px-6 py-5 text-metin-2">Bu filtrede satır yok.</p>}
        {gorunen.length > goster && (
          <div className="border-t border-[#EEF0F3] px-6 py-4">
            <button type="button" onClick={() => setGoster((g) => g + 200)} className="btn-cerceve min-h-11">Daha fazla göster ({gorunen.length - goster} satır kaldı)</button>
          </div>
        )}
      </section>
    </div>
  );
}
