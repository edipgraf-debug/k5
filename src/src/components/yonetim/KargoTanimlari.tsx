'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { KargoBolgeKaydi, KargoFirmaKaydi } from '@/lib/data/ticaret';
import { DurumMesaji, FormKarti, useIstek } from './ortak';

const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const sayi = (s: string) => (s.trim() === '' ? null : Number(s.replace(/\./g, '').replace(',', '.')));
type FirmaForm = { id: number | null; kod: string; ad: string; tur: 'Kurye' | 'Kargo'; entegrasyon: 'Api' | 'Manuel'; sabitUcret: string; ucretsizLimit: string; tahminiTeslim: string; takipUrl: string; sira: number; aktif: boolean };
type BolgeForm = { id: number | null; firmaId: number; il: string; ilce: string; mahalle: string; ucret: string; ucretsizLimit: string; aktif: boolean };

/** Kargo ve kurye firmaları, ücretleri ve bölgeye göre teslimat ücretleri */
export default function KargoTanimlari({ firmalar }: { firmalar: KargoFirmaKaydi[] }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [firma, setFirma] = useState<FirmaForm | null>(null);
  const [bolge, setBolge] = useState<BolgeForm | null>(null);

  async function firmaKaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!firma) return;
    const { id, ...f } = firma;
    const veri = { ...f, sabitUcret: sayi(f.sabitUcret) ?? 0, ucretsizLimit: sayi(f.ucretsizLimit) };
    if (await gonder('/api/yonetim/ayarlar/kayit', 'POST', { tur: 'kargo', id, veri }, 'Firma kaydedildi')) { setFirma(null); router.refresh(); }
  }
  async function bolgeKaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!bolge) return;
    const { id, ...b } = bolge;
    const veri = { ...b, ucret: sayi(b.ucret) ?? 0, ucretsizLimit: sayi(b.ucretsizLimit) };
    if (await gonder('/api/yonetim/ayarlar/kayit', 'POST', { tur: 'bolge', id, veri }, 'Bölge kaydedildi')) { setBolge(null); router.refresh(); }
  }
  async function bolgeSil(b: KargoBolgeKaydi) {
    if (await gonder('/api/yonetim/ayarlar/kayit', 'POST', { tur: 'bolge', id: b.id, sil: true }, 'Bölge silindi')) router.refresh();
  }
  const yeniFirma = (): FirmaForm => ({ id: null, kod: '', ad: '', tur: 'Kargo', entegrasyon: 'Manuel', sabitUcret: '0', ucretsizLimit: '', tahminiTeslim: '', takipUrl: '', sira: (firmalar.length + 1) * 10, aktif: true });

  return (
    <FormKarti ust="KARGO & KURYE" baslik="Firmalar ve teslimat ücretleri" aksiyon={<button type="button" className="btn-turuncu min-h-11" onClick={() => setFirma(yeniFirma())}>+ Firma ekle</button>}>
      <DurumMesaji durum={durum} />
      {firma && (
        <form onSubmit={firmaKaydet} className="flex flex-col gap-4 rounded-xl border-2 border-lacivert p-4">
          <div className="flex flex-wrap gap-4 [&>*]:flex-[1_1_180px]">
            <label className="flex flex-col gap-1.5"><span className="etiket">Kod</span><input className="girdi" value={firma.kod} onChange={(e) => setFirma({ ...firma, kod: e.target.value })} placeholder="ARAS" /></label>
            <label className="flex flex-[2_1_260px] flex-col gap-1.5"><span className="etiket">Ad</span><input className="girdi" value={firma.ad} onChange={(e) => setFirma({ ...firma, ad: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Tür</span>
              <select className="girdi" value={firma.tur} onChange={(e) => setFirma({ ...firma, tur: e.target.value as 'Kargo' })}><option value="Kargo">Kargo</option><option value="Kurye">Kurye (şehir içi)</option></select></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Entegrasyon</span>
              <select className="girdi" value={firma.entegrasyon} onChange={(e) => setFirma({ ...firma, entegrasyon: e.target.value as 'Manuel' })}><option value="Manuel">Manuel (takip no elle)</option><option value="Api">API</option></select></label>
          </div>
          <div className="flex flex-wrap gap-4 [&>*]:flex-[1_1_180px]">
            <label className="flex flex-col gap-1.5"><span className="etiket">Teslimat ücreti (KDV dahil)</span><input className="girdi" inputMode="decimal" value={firma.sabitUcret} onChange={(e) => setFirma({ ...firma, sabitUcret: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Ücretsiz teslimat limiti</span><input className="girdi" inputMode="decimal" value={firma.ucretsizLimit} onChange={(e) => setFirma({ ...firma, ucretsizLimit: e.target.value })} placeholder="Boş = yok" /></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Tahmini teslim</span><input className="girdi" value={firma.tahminiTeslim} onChange={(e) => setFirma({ ...firma, tahminiTeslim: e.target.value })} placeholder="1-3 iş günü" /></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Sıra</span><input type="number" className="girdi" value={firma.sira} onChange={(e) => setFirma({ ...firma, sira: Number(e.target.value) || 0 })} /></label>
          </div>
          <label className="flex flex-col gap-1.5"><span className="etiket">Gönderi takip adresi ({'{takipNo}'} yerine takip numarası gelir)</span>
            <input className="girdi" value={firma.takipUrl} onChange={(e) => setFirma({ ...firma, takipUrl: e.target.value })} placeholder="https://kargo.example/takip?no={takipNo}" /></label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 font-bold"><input type="checkbox" checked={firma.aktif} onChange={(e) => setFirma({ ...firma, aktif: e.target.checked })} className="size-5 accent-lacivert" />Ödeme adımında seçilebilir</label>
          <div className="flex gap-2.5"><button type="submit" disabled={bekliyor} className="btn-koyu">Kaydet</button><button type="button" className="btn-cerceve" onClick={() => setFirma(null)}>Vazgeç</button></div>
        </form>
      )}
      {firmalar.map((f) => (
        <section key={f.id} className="flex flex-col gap-3 rounded-xl border border-cizgi p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="font-baslik text-base font-extrabold">{f.ad} <span className="text-sm font-semibold text-metin-3">· {f.kod} · {f.tur}</span>{!f.aktif && <span className="ml-1 text-sm text-kirmizi">(kapalı)</span>}</span>
              <span className="text-sm text-metin-2">Ücret {tl(f.sabitUcret)}{f.ucretsizLimit != null ? ` · ${tl(f.ucretsizLimit)} ve üstü ücretsiz` : ''}{f.tahminiTeslim ? ` · ${f.tahminiTeslim}` : ''}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-cerceve min-h-10" onClick={() => setBolge({ id: null, firmaId: f.id, il: 'Konya', ilce: '', mahalle: '', ucret: String(f.sabitUcret), ucretsizLimit: '', aktif: true })}>+ Bölge</button>
              <button type="button" className="btn-cerceve min-h-10" onClick={() => setFirma({ ...f, sabitUcret: String(f.sabitUcret), ucretsizLimit: f.ucretsizLimit == null ? '' : String(f.ucretsizLimit), tahminiTeslim: f.tahminiTeslim ?? '', takipUrl: f.takipUrl ?? '' })}>Düzenle</button>
            </div>
          </div>
          {f.bolgeler.length > 0 && (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead><tr><th scope="col" className="border-b border-cizgi py-2 pr-3">Bölge</th><th scope="col" className="border-b border-cizgi py-2 pr-3">Ücret</th><th scope="col" className="border-b border-cizgi py-2 pr-3">Ücretsiz limit</th><th scope="col" className="border-b border-cizgi py-2"><span className="sr-only">İşlem</span></th></tr></thead>
                <tbody>
                  {f.bolgeler.map((b) => (
                    <tr key={b.id}>
                      <td className="border-b border-[#EEF0F3] py-2 pr-3">{b.il} / {b.ilce}{b.mahalle ? ` / ${b.mahalle}` : ''}{!b.aktif && <span className="text-kirmizi"> (kapalı)</span>}</td>
                      <td className="border-b border-[#EEF0F3] py-2 pr-3">{tl(b.ucret)}</td>
                      <td className="border-b border-[#EEF0F3] py-2 pr-3">{b.ucretsizLimit != null ? tl(b.ucretsizLimit) : '—'}</td>
                      <td className="border-b border-[#EEF0F3] py-2 text-right">
                        <button type="button" className="mr-3 font-bold text-lacivert" onClick={() => setBolge({ ...b, firmaId: f.id, mahalle: b.mahalle ?? '', ucret: String(b.ucret), ucretsizLimit: b.ucretsizLimit == null ? '' : String(b.ucretsizLimit) })}>Düzenle</button>
                        <button type="button" className="font-bold text-kirmizi" onClick={() => bolgeSil(b)}>Sil</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {bolge && bolge.firmaId === f.id && (
            <form onSubmit={bolgeKaydet} className="flex flex-wrap items-end gap-3 rounded-xl bg-zemin p-3 [&>label]:flex-[1_1_140px]">
              <label className="flex flex-col gap-1"><span className="etiket">İl</span><input className="girdi" value={bolge.il} onChange={(e) => setBolge({ ...bolge, il: e.target.value })} /></label>
              <label className="flex flex-col gap-1"><span className="etiket">İlçe</span><input className="girdi" value={bolge.ilce} onChange={(e) => setBolge({ ...bolge, ilce: e.target.value })} /></label>
              <label className="flex flex-col gap-1"><span className="etiket">Mahalle (boş = tümü)</span><input className="girdi" value={bolge.mahalle} onChange={(e) => setBolge({ ...bolge, mahalle: e.target.value })} /></label>
              <label className="flex flex-col gap-1"><span className="etiket">Ücret</span><input className="girdi" inputMode="decimal" value={bolge.ucret} onChange={(e) => setBolge({ ...bolge, ucret: e.target.value })} /></label>
              <label className="flex flex-col gap-1"><span className="etiket">Ücretsiz limit</span><input className="girdi" inputMode="decimal" value={bolge.ucretsizLimit} onChange={(e) => setBolge({ ...bolge, ucretsizLimit: e.target.value })} /></label>
              <button type="submit" disabled={bekliyor} className="btn-koyu min-h-12">Kaydet</button>
              <button type="button" className="btn-cerceve min-h-12" onClick={() => setBolge(null)}>Vazgeç</button>
            </form>
          )}
        </section>
      ))}
    </FormKarti>
  );
}
