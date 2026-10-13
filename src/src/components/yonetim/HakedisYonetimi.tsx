'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import type { HakedisDurumu } from '@/lib/data/ticaret';
import { DurumMesaji, useIstek } from './ortak';

const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const tarih = (s: string | null) => (s ? s.split('-').reverse().join('.') : 'açık uçlu');

/** Okul bazında hakediş: koşul (oran + tarih aralığı), okulun görmesi, ciro ve tutar */
export default function HakedisYonetimi({ okullar }: { okullar: { id: number; ad: string; plasiyerAd: string | null; durum: HakedisDurumu }[] }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [acik, setAcik] = useState<number | null>(null);
  const [f, setF] = useState({ oran: '10', baslangic: new Date().toISOString().slice(0, 10), bitis: '', veli: true, toplu: false, aciklama: '' });

  async function goster(id: number, v: boolean) {
    if (await gonder(`/api/yonetim/okullar/${id}/hakedis`, 'PUT', { goster: v }, v ? 'Okul artık hakedişini görüyor' : 'Hakediş okuldan gizlendi')) router.refresh();
  }
  async function tanimla(id: number) {
    const r = await gonder(`/api/yonetim/okullar/${id}/hakedis`, 'POST', { oran: Number(f.oran.replace(',', '.')), baslangic: f.baslangic, bitis: f.bitis || null,
      veli: f.veli, toplu: f.toplu, aciklama: f.aciklama }, 'Hakediş koşulu kaydedildi');
    if (r) { setAcik(null); router.refresh(); }
  }

  return (
    <section className="kart overflow-hidden">
      <div className="px-6 pt-4"><DurumMesaji durum={durum} /></div>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-[15px]">
          <thead><tr>{['Okul', 'Geçerli oran', 'Sezon cirosu', 'Hakediş', 'Sipariş', 'Okul görsün', ''].map((h, i) => <th key={i} scope="col" className="border-b border-cizgi bg-zemin px-4 py-3 text-[13px] font-extrabold text-metin-2">{h || <span className="sr-only">İşlem</span>}</th>)}</tr></thead>
          <tbody>
            {okullar.map((o) => (
              <Fragment key={o.id}>
                <tr>
                  <td className="border-b border-[#EEF0F3] px-4 py-3"><strong>{o.ad}</strong><span className="block text-[13px] text-metin-3">{o.plasiyerAd ?? ''}</span></td>
                  <td className="border-b border-[#EEF0F3] px-4 py-3">{o.durum.oran != null ? `%${o.durum.oran}` : <span className="text-metin-3">tanımsız</span>}</td>
                  <td className="border-b border-[#EEF0F3] px-4 py-3">{tl(o.durum.ciro)}</td>
                  <td className="border-b border-[#EEF0F3] px-4 py-3 font-bold">{tl(o.durum.hakedis)}</td>
                  <td className="border-b border-[#EEF0F3] px-4 py-3">{o.durum.siparis}</td>
                  <td className="border-b border-[#EEF0F3] px-4 py-3">
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold">
                      <input type="checkbox" role="switch" checked={o.durum.goster} disabled={bekliyor} onChange={(e) => goster(o.id, e.target.checked)} className="size-5 accent-lacivert" />
                      {o.durum.goster ? 'Görüyor' : 'Gizli'}
                    </label>
                  </td>
                  <td className="border-b border-[#EEF0F3] px-4 py-3 text-right"><button type="button" className="btn-cerceve min-h-10" onClick={() => setAcik(acik === o.id ? null : o.id)} aria-expanded={acik === o.id}>Koşullar ({o.durum.tanimlar.length})</button></td>
                </tr>
                {acik === o.id && (
                  <tr><td colSpan={7} className="border-b border-cizgi bg-zemin px-4 py-4">
                    <div className="flex flex-col gap-3">
                      {o.durum.tanimlar.length > 0 && (
                        <ul className="flex flex-col gap-1 text-sm">
                          {o.durum.tanimlar.map((t) => <li key={t.id}>%{t.oran} · {tarih(t.baslangic)} – {tarih(t.bitis)} · {[t.veli && 'veli satışları', t.toplu && 'toplu alım'].filter(Boolean).join(' + ')}{t.aciklama ? ` · ${t.aciklama}` : ''} <span className="text-metin-3">({t.olusturan})</span></li>)}
                        </ul>
                      )}
                      <div className="flex flex-wrap items-end gap-3 [&>label]:flex-[1_1_140px]">
                        <label className="flex flex-col gap-1"><span className="etiket">Oran %</span><input className="girdi" inputMode="decimal" value={f.oran} onChange={(e) => setF({ ...f, oran: e.target.value })} /></label>
                        <label className="flex flex-col gap-1"><span className="etiket">Başlangıç</span><input type="date" className="girdi" value={f.baslangic} onChange={(e) => setF({ ...f, baslangic: e.target.value })} /></label>
                        <label className="flex flex-col gap-1"><span className="etiket">Bitiş (boş = açık)</span><input type="date" className="girdi" value={f.bitis} onChange={(e) => setF({ ...f, bitis: e.target.value })} /></label>
                        <label className="flex flex-[2_1_220px] flex-col gap-1"><span className="etiket">Açıklama</span><input className="girdi" value={f.aciklama} onChange={(e) => setF({ ...f, aciklama: e.target.value })} placeholder="Ör. 2026-2027 sezonu" /></label>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={f.veli} onChange={(e) => setF({ ...f, veli: e.target.checked })} className="size-5 accent-lacivert" />Veli satışlarına</label>
                        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={f.toplu} onChange={(e) => setF({ ...f, toplu: e.target.checked })} className="size-5 accent-lacivert" />Okulun toplu alımına</label>
                        <button type="button" className="btn-koyu min-h-11" disabled={bekliyor} onClick={() => tanimla(o.id)}>Koşulu kaydet</button>
                      </div>
                    </div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
