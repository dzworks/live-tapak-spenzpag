import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, 'app-config.json');

interface AppConfig {
  appsScriptUrl: string;
  adminPin: string;
  updatedAt: string | null;
}

function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading app-config.json:', err);
  }
  return {
    appsScriptUrl: '',
    adminPin: '1234',
    updatedAt: null,
  };
}

function saveConfig(config: AppConfig): boolean {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing app-config.json:', err);
    return false;
  }
}

/**
 * Mask URL: Hanya menampilkan 5 karakter sebelum /exec
 * Contoh: https://script.google.com/macros/s/AKfycb...X8k9Z/exec
 * Output: https://script.google.com/macros/s/•••••••••••••••••X8k9Z/exec
 */
export function maskUrl(url: string): string {
  if (!url || typeof url !== 'string') return 'Belum dikonfigurasi';
  const trimmed = url.trim();
  const match = trimmed.match(/([a-zA-Z0-9_-]{5})\/exec(?:\?.*)?$/i);
  if (match) {
    const last5 = match[1];
    return `https://script.google.com/macros/s/••••••••••••••••••••${last5}/exec`;
  }
  if (trimmed.includes('/exec')) {
    const beforeExec = trimmed.split('/exec')[0];
    const lastChars = beforeExec.slice(-5);
    return `••••••••••••••••••••${lastChars}/exec`;
  }
  return trimmed.length > 8 ? `••••••••${trimmed.slice(-5)}` : '••••••••';
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // API Route: Ambil konfigurasi URL saat aplikasi dibuka
  app.get('/api/config', (_req, res) => {
    const config = loadConfig();
    res.json({
      success: true,
      scriptUrl: config.appsScriptUrl || '',
      maskedUrl: maskUrl(config.appsScriptUrl),
      hasCustomUrl: Boolean(config.appsScriptUrl),
      updatedAt: config.updatedAt,
    });
  });

  // API Route: Verifikasi PIN Pengawas / Admin
  app.post('/api/verify-pin', (req, res) => {
    const { pin } = req.body;
    const config = loadConfig();
    const currentPin = config.adminPin || '1234';

    if (pin && String(pin).trim() === currentPin) {
      return res.json({ success: true, message: 'PIN terverifikasi' });
    }
    return res.status(401).json({ success: false, message: 'PIN tidak sesuai' });
  });

  // API Route: Verifikasi Login Admin (Username & Password)
  app.post('/api/verify-login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan Password wajib diisi' });
    }
    const config = loadConfig();
    const currentPin = config.adminPin || '1234';

    // Akun superadmin default lokal
    if (
      (username.trim() === 'admin' && (password.trim() === '123' || password.trim() === currentPin)) ||
      (username.trim() === 'superadmin' && password.trim() === 'admin123')
    ) {
      return res.json({
        success: true,
        account: {
          username: username.trim(),
          nama: 'Administrator TAPAK',
          jabatan: 'Admin Sistem',
          role: 'Superadmin'
        }
      });
    }

    return res.json({ success: false, message: 'Akun tidak terdaftar pada konfigurasi lokal server' });
  });

  // API Route: Simpan URL baru dan/atau perbarui PIN Pengawas
  app.post('/api/config', (req, res) => {
    const { scriptUrl, pin, newPin, isAuthorized } = req.body;
    const config = loadConfig();
    const currentPin = config.adminPin || '1234';

    // Izinkan penyimpanan jika PIN cocok ATAU sudah terverifikasi melalui login admin (isAuthorized)
    if (!isAuthorized && String(pin).trim() !== currentPin) {
      return res.status(401).json({
        success: false,
        message: 'Akses tidak sah. Silakan login terlebih dahulu.',
      });
    }

    if (typeof scriptUrl === 'string') {
      const cleanUrl = scriptUrl.trim();
      // Validasi sederhana URL Apps Script
      if (cleanUrl && !cleanUrl.includes('script.google.com') && !cleanUrl.includes('/exec')) {
        return res.status(400).json({
          success: false,
          message: 'Format URL harus mengarah ke deployment Google Apps Script (.../exec)',
        });
      }
      config.appsScriptUrl = cleanUrl;
    }

    if (typeof newPin === 'string' && newPin.trim().length >= 4) {
      config.adminPin = newPin.trim();
    }

    config.updatedAt = new Date().toISOString();

    const saved = saveConfig(config);
    if (!saved) {
      return res.status(500).json({
        success: false,
        message: 'Gagal menulis konfigurasi ke server.',
      });
    }

    return res.json({
      success: true,
      message: 'URL backend berhasil disimpan permanen ke server frontend.',
      scriptUrl: config.appsScriptUrl,
      maskedUrl: maskUrl(config.appsScriptUrl),
      updatedAt: config.updatedAt,
    });
  });

  // Proxy test-ping route untuk menghindari blokade CORS jika browser melakukan test langsung
  app.post('/api/test-connection', async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL tidak boleh kosong' });
    }
    try {
      const fetchRes = await fetch(url, { method: 'GET', redirect: 'follow' });
      if (!fetchRes.ok) {
        return res.status(fetchRes.status).json({
          success: false,
          message: `Server Apps Script mengembalikan status HTTP ${fetchRes.status}`,
        });
      }
      const data = await fetchRes.json();
      const bundle = data?.data || data;
      const hasSheets = bundle && (bundle.schedules || bundle.Schedules || bundle.masterGuru || bundle.MasterGuru);
      const detailInfo = data?.counts 
        ? `Terdeteksi ${data.counts.classes || 0} Kelas, ${data.counts.schedules || 0} Jadwal, ${data.counts.attendanceLogs || 0} Log Presensi`
        : (hasSheets ? 'Format 6 sheet TAPAK terdeteksi valid' : 'Respons diterima');
      return res.json({
        success: true,
        message: 'Koneksi ke Google Apps Script berhasil terverifikasi!',
        detectedSheets: detailInfo,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Gagal menghubungi URL: ${err?.message || 'Network error'}`,
      });
    }
  });

  // Integrasi Vite dev server atau static files
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
