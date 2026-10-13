'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { TakipSatiri } from '@/lib/types';
import { tarihSaat } from '@/lib/bicim';
import { BildirimRozeti, Rozet, TABLO } from './Ortak';

type Filtre = 'tum' | 'acik' | 'kapali' | 'acmadi' | 'hata';
const FILTRELER: { id: Filtre; ad: string; f: (t: TakipSatiri) => boolean }[] = [
  { id: 'tum', ad: 'Tümü', f: () => true },
  { id: 'acik', ad: 'Sepet açık', f: (t) => t.gorebilir },
  { id: 'kapali', ad: 'Açık değil', f: (t) => !t.gorebilir },
  { id: 'acmadi', ad: 'Veli açmadı', f: (t) => t.gorebilir && !t.acildi },
  { id: 'hata', ad: 'Bildirim ulaşmadı', f: (t) => t.sms === 'Hata' || t.eposta === 'Hata' },
];

/**
 * Sepet detayındaki öğrenci bazında takip: seçili öğrencilere yayınla (tek tek), tüm sınıfa yayınla (toplu),
 * sepeti açık olanlara hatırlatma.
 */
export default function TakipTablosu({ listeId, satirlar, yayinda, toplu, bos, rolOnek }:
  { listeId: number; satirlar: TakipSatiri[]; yayinda: boolean; toplu: boolean; bos: boolean; rolOnek: string }) {
  const router = useRouter();
  const [filtre, setFiltre] = useState<Filtre>('tum');
  const [secim, setSecim] = useState<number[]>([]);
  const [sms, setSms] = useState(true);
  const [eposta, setEposta] = useState(true);
  const [hata, setHata] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [bekliyor, setBekliyor] = useState(false);

  const gorunen = useMemo(() => satirlar.filter(FILTRELER.find((x) => x.id === filtre)!.f), [satirlar, filtre]);
  const secili = satirlar.filter((s) => secim.includes(s.ogrenciId));
  const kapaliSecili = secili.filter((s) => !s.gorebilir);
  const acikSecili = secili.filter((s) => s.gorebilir);
  const hepsiSecili = gorunen.length > 0 && gorunen.every((s) => secim.includes(s.ogrenciId));

  function degistir(id: number) { setSecim((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id])); }
  function tumunu() {
    const ids = gorunen.map((s) => s.ogrenciId);
    setSecim((m) => (hepsiSecili ? m.filter((x) => !ids.includes(x)) : [...new Set([...m, ...ids])]));
  }

  async function gonder(govde: Record<string, unknown>, basari: (s: { ogrenciSayisi: number; smsSayisi: number; epostaSayisi: number }) => string) {
    setHata(''); setMesaj(''); setBekliyor(true);
    try {
      const r = await fetch(`/api/listeler/${listeId}/yayinla`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sms, eposta, ...govde }) });
      const v = await r.json().catch(() => ({}));
      if (!r.ok) { setHata(v.hata ?? 'İşlem yapılamadı'); return; }
      setMesaj(basari(v.sonuc)); setSecim([]); router.refresh();
    } catch { setHata('Bağlantı hatası'); } finally { setBekliyor(false); }
  }
  const bildirimMetni = (s: { smsSayisi: number; epostaSayisi: number }) =>
    [s.smsSayisi ? `${s.smsSayisi} veliye SMS` : '', s.epostaSayisi ? `${s.epostaSayisi} e-posta` : ''].filter(Boolean).join(' ve ') || 'bildirim gönderilmedi';

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0F3] px-6 py-4">
        <div role="group" aria-label="Filtre" className="flex flex-wrap gap-1.5">
          {FILTRELER.map((f) => {
            const n = satirlar.filter(f.f).length;
            return (
              <button key={f.id} type="button" aria-pressed={filtre === f.id} onClick={() => setFiltre(f.id)}
                className={`min-h-11 cursor-pointer rounded-[10px] border-2 px-3 text-sm font-bold ${filtre === f.id ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white'}`}>
                {f.ad} <span className="opacity-75">({n})</span>
              </button>
            );
          })}
        </div>
      </div>

      {hata && <p role="alert" className="mx-6 mt-4 rounded-xl bg-kirmizi-zemin px-4 py-3 text-sm font-semibold text-kirmizi">{hata}</p>}
      {mesaj && <p role="status" className="mx-6 mt-4 rounded-xl bg-yesil-zemin px-4 py-3 text-sm font-bold text-yesil">✓ {mesaj}</p>}

      <div className={TABLO.sar}>
        <table className={`${TABLO.tablo} min-w-[860px]`}>
          <thead><tr>
            <th scope="col" className={`${TABLO.th} w-12`}>
              <input type="checkbox" aria-label="Görünenlerin tümünü seç" checked={hepsiSecili} onChange={tumunu} className="size-5 accent-lacivert" />
            </th>
            <th scope="col" className={TABLO.th}>Öğrenci</th>
            <th scope="col" className={TABLO.th}>Sınıf</th>
            <th scope="col" className={TABLO.th}>Sepet</th>
            <th scope="col" className={TABLO.th}>SMS</th>
            <th scope="col" className={TABLO.th}>E-posta</th>
            <th scope="col" className={TABLO.th}>Veli açtı</th>
            <th scope="col" className={TABLO.th}>Sipariş</th>
          </tr></thead>
          <tbody>
            {gorunen.map((s) => (
              <tr key={s.ogrenciId} className={secim.includes(s.ogrenciId) ? 'bg-[#FFF7EA]' : undefined}>
                <td className={TABLO.td}>
                  <input type="checkbox" aria-label={`${s.ad} seç`} checked={secim.includes(s.ogrenciId)} onChange={() => degistir(s.ogrenciId)} className="size-5 accent-lacivert" />
                </td>
                <td className={TABLO.td}>
                  <div className="flex flex-col">
                    <Link href={`${rolOnek}/ogrenciler/${s.ogrenciId}`} className="font-bold">{s.ad}</Link>
                    <span className="text-[13px] text-metin-3">No {s.okulNo} · {s.veliSayisi ? `${s.veliSayisi} veli${s.epostaliVeli < s.veliSayisi ? `, ${s.veliSayisi - s.epostaliVeli} e-postasız` : ''}` : 'kayıtlı veli yok'}</span>
                  </div>
                </td>
                <td className={TABLO.td}>{s.sinifSube}</td>
                <td className={TABLO.td}>{s.gorebilir ? <Rozet ton="yesil">Açık</Rozet> : <Rozet>Açık değil</Rozet>}</td>
                <td className={TABLO.td}><BildirimRozeti durum={s.sms} kanal="SMS" /></td>
                <td className={TABLO.td}><BildirimRozeti durum={s.eposta} kanal="E-posta" /></td>
                <td className={TABLO.td}>{s.acildi ? tarihSaat(s.acildi) : <span className="text-metin-3">—</span>}</td>
                <td className={TABLO.td}><span className="text-metin-3" title="Sipariş takibi ödeme adımıyla birlikte açılacak">—</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!gorunen.length && <p className="px-6 py-5 text-metin-2">Bu filtrede öğrenci yok.</p>}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-cizgi bg-white px-6 py-4">
        <span className="font-bold">{secim.length ? `${secim.length} öğrenci seçili` : 'Öğrenci seçin'}</span>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="size-5 accent-lacivert" />SMS</label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={eposta} onChange={(e) => setEposta(e.target.checked)} className="size-5 accent-lacivert" />E-posta</label>
        <div className="ml-auto flex flex-wrap gap-2">
          {kapaliSecili.length > 0 && (
            <button type="button" disabled={bekliyor || bos} onClick={() => gonder({ hedef: 'secili', ogrenciIdleri: kapaliSecili.map((s) => s.ogrenciId) },
              (s) => `Sepet ${s.ogrenciSayisi} seçili öğrenciye açıldı · ${bildirimMetni(s)}`)} className="btn-turuncu min-h-11">
              Seçili {kapaliSecili.length} öğrenciye yayınla
            </button>
          )}
          {yayinda && acikSecili.length > 0 && (
            <button type="button" disabled={bekliyor || (!sms && !eposta)} onClick={() => gonder({ hedef: 'secili', hatirlatma: true, ogrenciIdleri: acikSecili.map((s) => s.ogrenciId) },
              (s) => `Hatırlatma gönderildi · ${bildirimMetni(s)}`)} className="btn-cerceve min-h-11">
              {acikSecili.length} öğrenciye hatırlat
            </button>
          )}
          {!toplu && (
            <button type="button" disabled={bekliyor || bos} onClick={() => gonder({ hedef: 'toplu' }, (s) => `Sepet tüm sınıfa (${s.ogrenciSayisi} öğrenci) açıldı · ${bildirimMetni(s)}`)}
              className="btn-koyu min-h-11">Tüm sınıfa yayınla</button>
          )}
        </div>
      </div>
    </div>
  );
}
