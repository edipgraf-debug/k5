/** Aramada Türkçe karakter farkını yok sayar: "Yılmaz", "YILMAZ", "yilmaz" → "yilmaz" */
const HARITA: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
export function katla(s: string): string {
  return s.toLocaleLowerCase('tr').replace(/i̇|[çğıöşüâîû]/g, (c) => HARITA[c] ?? c);
}

/** SQL Server tarafı: aynı katlamayı yapan ifade (SQL Server 2017+ TRANSLATE) */
export const sqlKatla = (ifade: string) =>
  `LOWER(TRANSLATE(${ifade} COLLATE Latin1_General_CI_AS, N'ÇĞİIÖŞÜÂÎÛçğıöşüâîû', N'CGIIOSUAIUcgiosuaiu'))`;
