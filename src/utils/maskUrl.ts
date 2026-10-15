/**
 * Helper untuk penyamaran (masking) URL Google Apps Script.
 * Persyaratan: Hanya menampilkan 5 karakter sebelum /exec
 * Contoh:
 *   Input:  https://script.google.com/macros/s/AKfycbz_9yQ-ABC1234567xyz987654321/exec
 *   Output: https://script.google.com/macros/s/••••••••••••••••••••54321/exec
 */

export function maskAppsScriptUrl(url: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'Belum terkonfigurasi di server';
  }

  const trimmed = url.trim();

  // Pola standar Google Apps Script Web App: ...[5_karakter]/exec
  const match = trimmed.match(/([a-zA-Z0-9_-]{5})\/exec(?:\?.*)?$/i);
  if (match) {
    const last5 = match[1];
    return `https://script.google.com/macros/s/••••••••••••••••••••${last5}/exec`;
  }

  // Jika URL memiliki /exec tetapi format ID sedikit berbeda
  if (trimmed.includes('/exec')) {
    const parts = trimmed.split('/exec');
    const prefix = parts[0];
    const last5 = prefix.slice(-5);
    return `https://script.google.com/macros/s/••••••••••••••••••••${last5}/exec`;
  }

  // Fallback umum penyamaran aman
  if (trimmed.length > 8) {
    return `••••••••••••••••••••${trimmed.slice(-5)}`;
  }

  return '••••••••••••••••';
}

/**
 * Mengambil 5 karakter verifikasi sebelum /exec
 */
export function getMaskVerificationSnippet(url: string): string {
  if (!url) return '';
  const match = url.trim().match(/([a-zA-Z0-9_-]{5})\/exec(?:\?.*)?$/i);
  if (match) return match[1];
  if (url.includes('/exec')) {
    return url.split('/exec')[0].slice(-5);
  }
  return url.slice(-5);
}
