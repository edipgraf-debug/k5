import { katla } from '../katla';

export type SinifSonuc = { seviye: number; sube: string } | { hata: string };

const ANA = /^(ana(sinifi)?|anaokulu|okuloncesi|hazirlik)/;

function seviyeCoz(ham: string): number | null {
  const k = katla(ham).replace(/\s+/g, '');
  if (!k) return null;
  if (ANA.test(k)) return 0;
  const m = k.match(/^(\d{1,2})/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 0 && n <= 12 ? n : null;
}

/** Şube adı: "A", "a şubesi", "A Şubesi" → "A"; "Fen" gibi adlar da kabul (en fazla 20 karakter) */
function subeCoz(ham: string): string | null {
  let s = ham.trim().replace(/\s*şubesi\s*$/i, '').replace(/\s*subesi\s*$/i, '').replace(/^şube\s*/i, '').trim();
  if (!s) return null;
  s = s.toLocaleUpperCase('tr');
  return s.length <= 20 ? s : null;
}

/**
 * Sınıf/şube metnini çözer. Desteklenen örnekler:
 *  ayrı kolonlar: ("5", "A"), ("5. Sınıf", "A Şubesi"), ("Anasınıfı", "B")
 *  tek kolon:     "5-A", "5/A", "5 A", "5A", "5.A", "5. Sınıf / A Şubesi", "5. SINIF A ŞUBESİ", "Anasınıfı-A"
 */
export function sinifCoz(sinifHam: string | null | undefined, subeHam: string | null | undefined): SinifSonuc {
  const sinif = (sinifHam ?? '').toString().trim();
  const sube = (subeHam ?? '').toString().trim();
  if (!sinif && !sube) return { hata: 'Sınıf ve şube boş' };

  if (sube) {
    const seviye = seviyeCoz(sinif);
    if (seviye == null) {
      if (/^\s*\d+/.test(sinif)) return { hata: `Sınıf 0–12 arasında olmalı: "${sinif}"` };
      return { hata: `Sınıf anlaşılamadı: "${sinif || '—'}"` };
    }
    const sb = subeCoz(sube);
    if (!sb) return { hata: `Şube anlaşılamadı: "${sube}"` };
    return { seviye, sube: sb };
  }

  // tek kolonda sınıf + şube
  const tr = sinif.toLocaleUpperCase('tr').replace(/ŞUBESİ|SUBESI/g, ' ').replace(/SINIFI|SINIF/g, ' ');
  const anaMi = ANA.test(katla(sinif).replace(/\s+/g, ''));
  if (anaMi) {
    const m = tr.replace(/ANA\s*(S\s*)?(OKULU)?/, ' ').replace(/HAZIRLIK|OKUL\s*ÖNCESİ/, ' ').match(/[A-ZÇĞİÖŞÜ]{1,3}\s*$/);
    if (!m) return { hata: `Şube anlaşılamadı: "${sinif}"` };
    return { seviye: 0, sube: m[0].trim() };
  }
  const m = tr.match(/^\s*(\d{1,2})\s*[.\-/\\_\s]*\s*([A-ZÇĞİÖŞÜ0-9]{1,5})\s*$/);
  if (!m) {
    if (/^\s*\d{1,2}\s*\.?\s*$/.test(tr)) return { hata: `Şube yok: "${sinif}" (ör. 5-A yazın ya da Şube kolonu ekleyin)` };
    return { hata: `Sınıf/şube anlaşılamadı: "${sinif}" (ör. 5-A)` };
  }
  const seviye = Number(m[1]);
  if (seviye > 12) return { hata: `Sınıf 0–12 arasında olmalı: "${sinif}"` };
  return { seviye, sube: m[2] };
}
