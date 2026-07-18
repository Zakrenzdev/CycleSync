import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Plus,
  Home,
  BarChart2,
  Calendar as CalendarIcon,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Moon,
  Footprints,
  Scale,
  X,
  Pencil,
  LogOut,
  User,
  ShieldCheck,
  CreditCard,
  HelpCircle,
  Flame,
  Lock,
  FileText,
  Download,
  AlarmClock,
  Sparkles,
  Zap,
  Smile,
  PenLine,
  Save,
  RotateCcw,
  Share2,
  Trash2,
  Egg,
  Repeat,
  Clock,
  Shield,
  Baby,
  Dumbbell,
  Frown,
  Meh,
  CircleAlert,
  Check,
  Loader2,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Info,
  Phone,
  MessageCircle,
  BadgeCheck,
  Heart,
  AlertTriangle,
} from "lucide-react";

/* ---------------------------------------------------------------
   DATE / CYCLE UTILITIES — semua berbasis tanggal & jam ASLI
--------------------------------------------------------------- */

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}
function toISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function fromISO(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function diffDays(a, b) {
  return Math.round((stripTime(a) - stripTime(b)) / 86400000);
}
function formatLong(date) {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}
function formatShort(date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}
function formatDayMonth(date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}
function greetingFor(hour) {
  if (hour >= 4 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 19) return "Selamat sore";
  return "Selamat malam";
}

// Sapaan/pengingat ringan yang muncul sesuai jam saat app dibuka
const HOURLY_CHECKINS = [
  { key: "dinihari", start: 0, end: 4, title: "Masih Bangun?", message: "Udah larut nih. Jangan lupa istirahat ya 🌙" },
  { key: "pagi1", start: 4, end: 7, title: "Pagi!", message: "Udah bangun dan mandi belum? 🌅" },
  { key: "pagi2", start: 7, end: 10, title: "Selamat Pagi", message: "Udah sarapan belum nih?" },
  { key: "siang1", start: 10, end: 13, title: "Halo!", message: "Udah minum air putih hari ini?" },
  { key: "siang2", start: 13, end: 15, title: "Waktunya Makan Siang", message: "Udah makan siang belum?" },
  { key: "sore", start: 15, end: 18, title: "Sore!", message: "Udah istirahat sebentar? Gimana rasanya hari ini?" },
  { key: "malam1", start: 18, end: 21, title: "Malam!", message: "Udah makan malam belum?" },
  { key: "malam2", start: 21, end: 24, title: "Menjelang Tidur", message: "Udah siap-siap tidur? Gimana harimu tadi?" },
];
function getHourlyCheckin(hour) {
  return HOURLY_CHECKINS.find((b) => hour >= b.start && hour < b.end) || HOURLY_CHECKINS[0];
}

// Info siklus untuk TANGGAL tertentu — dipakai berulang untuk kalender, today, insight, dsb.
function getCycleInfo(lastPeriodStartISO, cycleLength, periodLength, refDate) {
  const lastStart = stripTime(fromISO(lastPeriodStartISO));
  const ref = stripTime(refDate);
  let daysSince = diffDays(ref, lastStart);
  const cyclesElapsed = Math.floor(daysSince / cycleLength);
  const currentCycleStart = addDays(lastStart, cyclesElapsed * cycleLength);
  const cycleDay = diffDays(ref, currentCycleStart) + 1;
  const nextPeriodStart = addDays(currentCycleStart, cycleLength);
  const ovulationDayNum = Math.max(1, cycleLength - 14);
  const ovulationDate = addDays(currentCycleStart, ovulationDayNum - 1);
  const lutealStartDate = addDays(currentCycleStart, ovulationDayNum + 1);

  let phase = "Folikular";
  if (cycleDay <= periodLength) phase = "Menstruasi";
  else if (cycleDay >= ovulationDayNum - 1 && cycleDay <= ovulationDayNum + 1) phase = "Ovulasi";
  else if (cycleDay > ovulationDayNum + 1) phase = "Luteal";

  return {
    cycleDay,
    phase,
    currentCycleStart,
    nextPeriodStart,
    ovulationDate,
    lutealStartDate,
    ovulationDayNum,
    daysUntilNextPeriod: diffDays(nextPeriodStart, ref),
  };
}

// tanggal berikutnya (ke depan) untuk sebuah event siklik, dilihat dari "ref"
function nextOccurrence(eventDate, ref, cycleLength) {
  let d = new Date(eventDate);
  while (diffDays(d, ref) < 0) d = addDays(d, cycleLength);
  return d;
}

const PHASE_LABEL = {
  Menstruasi: "Fase Menstruasi",
  Folikular: "Fase Folikular",
  Ovulasi: "Fase Ovulasi",
  Luteal: "Fase Luteal",
};
const PHASE_DESC = {
  Menstruasi: "Tubuhmu sedang meluruhkan lapisan rahim. Prioritaskan istirahat dan asupan zat besi.",
  Folikular: "Energi mulai naik seiring estrogen meningkat. Waktu yang bagus untuk kerja produktif.",
  Ovulasi: "Masa subur — peluang kehamilan tertinggi berada di sekitar hari ini.",
  Luteal: "Progesteron meningkat, kamu mungkin merasa lebih tenang namun lebih mudah lelah.",
};

// Rekomendasi aktivitas & makanan yang bisa langsung dipraktikkan, sesuai fase siklus
const PHASE_RECS = {
  Menstruasi: {
    icon: Droplet,
    activity: "Prioritaskan istirahat, peregangan ringan, atau jalan santai. Kompres hangat di perut bantu redakan kram.",
    food: "Perbanyak makanan tinggi zat besi — bayam, hati ayam, daging merah, atau kacang-kacangan — untuk mengganti darah yang hilang.",
  },
  Folikular: {
    icon: Zap,
    activity: "Energi lagi naik — waktu yang pas untuk olahraga intensitas tinggi (HIIT, lari) atau mulai proyek/kerjaan baru.",
    food: "Makanan tinggi protein dan sayuran fermentasi bantu mendukung produksi estrogen yang meningkat.",
  },
  Ovulasi: {
    icon: Sparkles,
    activity: "Masa paling produktif dan percaya diri — cocok untuk presentasi, negosiasi, atau ketemuan penting.",
    food: "Perbanyak minum air putih dan makanan kaya antioksidan seperti buah beri untuk mendukung masa subur.",
  },
  Luteal: {
    icon: Moon,
    activity: "Waktu yang tepat untuk pilates ringan, yoga, atau olahraga low-impact. Kurangi intensitas latihan berat.",
    food: "Kurangi kafein, garam, dan gula untuk membantu cegah kembung dan perubahan mood (PMS).",
  },
};

/* ---------------------------------------------------------------
   FIREBASE REALTIME DATABASE — penyimpanan permanen lintas sesi
   Dipakai langsung lewat REST API (fetch), jadi tetap berfungsi
   setelah di-build jadi APK / WebView, tanpa perlu Firebase SDK.
--------------------------------------------------------------- */

const FIREBASE_BASE = "https://webhaidku-default-rtdb.firebaseio.com";
const LAST_EMAIL_KEY = "cyclesync_last_email";

function sanitizeEmailKey(email) {
  return (email || "")
    .trim()
    .toLowerCase()
    .replace(/[.#$\[\]]/g, "_");
}

async function fbGetUser(key) {
  const res = await fetch(`${FIREBASE_BASE}/users/${key}.json`);
  if (!res.ok) throw new Error("Gagal memuat data dari server");
  return res.json();
}

async function fbPutUser(key, fullValue) {
  const res = await fetch(`${FIREBASE_BASE}/users/${key}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fullValue),
  });
  if (!res.ok) throw new Error("Gagal menyimpan data ke server");
  return res.json();
}

async function fbPatchUser(key, partialValue) {
  try {
    await fetch(`${FIREBASE_BASE}/users/${key}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partialValue),
    });
  } catch (e) {
    // Sinkronisasi gagal (mis. sedang offline) — perubahan tetap ada di layar,
    // dan akan tersinkron lagi di percobaan berikutnya.
    console.error("Firebase sync error:", e);
  }
}

function getRememberedEmail() {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY);
  } catch (e) {
    return null;
  }
}
function rememberEmail(email) {
  try {
    if (email) localStorage.setItem(LAST_EMAIL_KEY, email);
    else localStorage.removeItem(LAST_EMAIL_KEY);
  } catch (e) {
    // localStorage tidak tersedia — sesi cukup berjalan tanpa "ingat saya"
  }
}

/* ---------------------------------------------------------------
   Global animation styles
--------------------------------------------------------------- */

function GlobalStyles() {
  return (
    <style>{`
      html, body, #root { height: 100%; }
      @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
      @keyframes scaleIn { from { opacity:0; transform: scale(0.92) } to { opacity:1; transform: scale(1) } }
      @keyframes screenFade { from { opacity:0; transform: translateY(8px) } to { opacity:1; transform: translateY(0) } }
      @keyframes toastIn { from { opacity:0; transform: translate(-50%, 16px) scale(0.95) } to { opacity:1; transform: translate(-50%, 0) scale(1) } }
      @keyframes toastOut { from { opacity:1; transform: translate(-50%, 0) scale(1) } to { opacity:0; transform: translate(-50%, 10px) scale(0.96) } }
      @keyframes popScale { 0% { transform: scale(1) } 50% { transform: scale(1.08) } 100% { transform: scale(1) } }
      @keyframes confettiFall { 0% { transform: translateY(-10px) rotate(0deg); opacity:.9 } 100% { transform: translateY(460px) rotate(340deg); opacity:0 } }
      @keyframes pulseDot { 0%,100% { opacity:1 } 50% { opacity:.4 } }
      @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      @keyframes barGrow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
      @keyframes toastBar { from { transform: scaleX(1) } to { transform: scaleX(0) } }
      .animate-fadeIn { animation: fadeIn 200ms ease both; }
      .animate-scaleIn { animation: scaleIn 260ms cubic-bezier(.34,1.56,.64,1) both; }
      .animate-screenFade { animation: screenFade 280ms ease both; }
      .animate-toastIn { left: 50%; animation: toastIn 260ms cubic-bezier(.34,1.56,.64,1) both; }
      .animate-toastOut { left: 50%; animation: toastOut 200ms ease both; }
      .animate-pop { animation: popScale 220ms ease; }
      .animate-check { stroke-dasharray: 166; stroke-dashoffset: 166; animation: dashDraw 500ms ease-out 150ms forwards; }
      @keyframes dashDraw { from { stroke-dashoffset: 166 } to { stroke-dashoffset: 0 } }
      .animate-pulseDot { animation: pulseDot 1.6s ease-in-out infinite; }
      .animate-spin-slow { animation: spin 1s linear infinite; }
      .bar-grow { transform-origin: bottom; animation: barGrow 500ms cubic-bezier(.34,1.56,.64,1) both; }
      .toast-bar { animation: toastBar linear forwards; transform-origin: left; }
      @media (prefers-reduced-motion: reduce) {
        .animate-fadeIn, .animate-scaleIn, .animate-screenFade, .animate-toastIn, .animate-toastOut, .animate-pop, .animate-check, .animate-pulseDot, .bar-grow, .toast-bar {
          animation: none !important;
        }
      }
    `}</style>
  );
}

/* ---------------------------------------------------------------
   Shared primitives
--------------------------------------------------------------- */

function Toggle({ checked, onChange, disabled }) {
  const [pop, setPop] = useState(false);
  const handleClick = () => {
    if (disabled) return;
    onChange(!checked);
    setPop(true);
    setTimeout(() => setPop(false), 220);
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`w-11 h-6 rounded-full relative transition-colors duration-300 shrink-0 ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${checked ? "bg-black" : "bg-gray-200"} ${pop ? "animate-pop" : ""}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function Pill({ label, active, onClick }) {
  const [pop, setPop] = useState(false);
  const handleClick = () => {
    onClick();
    setPop(true);
    setTimeout(() => setPop(false), 220);
  };
  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-full text-sm border transition-all duration-200 active:scale-90 ${
        active
          ? "bg-black text-white border-black"
          : "bg-gray-100 text-gray-900 border-transparent hover:bg-gray-200"
      } ${pop ? "animate-pop" : ""}`}
    >
      {label}
    </button>
  );
}

function Card({ children, className = "", onClick, style, accent }) {
  const AccentIcon = accent?.icon;
  return (
    <div
      onClick={onClick}
      style={style}
      className={`relative border rounded-2xl p-5 transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
        accent ? `bg-gradient-to-br ${accent.grad} border-gray-100 overflow-hidden` : "bg-white border-gray-200"
      } ${onClick ? "cursor-pointer active:scale-[0.99]" : ""} ${className}`}
    >
      {AccentIcon && (
        <AccentIcon size={88} strokeWidth={1.5} className={`absolute -right-4 -top-4 -z-10 opacity-25 ${accent.iconColor}`} />
      )}
      {children}
    </div>
  );
}

// Palet aksen buat variasi visual antar card — gradient pastel + warna icon dekoratif
const CARD_ACCENTS = {
  rose: { grad: "from-rose-50 to-white", iconColor: "text-rose-300" },
  amber: { grad: "from-amber-50 to-white", iconColor: "text-amber-300" },
  sky: { grad: "from-sky-50 to-white", iconColor: "text-sky-300" },
  violet: { grad: "from-violet-50 to-white", iconColor: "text-violet-300" },
  emerald: { grad: "from-emerald-50 to-white", iconColor: "text-emerald-300" },
  fuchsia: { grad: "from-fuchsia-50 to-white", iconColor: "text-fuchsia-300" },
};

// Aksen kartu rekomendasi mengikuti fase siklus yang sedang aktif
const PHASE_ACCENT_KEY = { Menstruasi: "rose", Folikular: "amber", Ovulasi: "sky", Luteal: "violet" };

function TopBar({ title, onBack, onBell, showLogo, unread, rightNode }) {
  return (
    <header className="shrink-0 h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <button onClick={onBack} className="p-1 -ml-1 shrink-0 active:scale-90 transition-transform" aria-label="Kembali">
            <ArrowLeft size={22} />
          </button>
        )}
        {showLogo && (
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white text-xs font-semibold shrink-0">
            C
          </div>
        )}
        <h1 className="text-lg font-bold truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {rightNode}
        {onBell && (
          <button onClick={onBell} aria-label="Notifikasi" className="relative active:scale-90 transition-transform">
            <Bell size={22} />
            {unread && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-gray-50 animate-pulseDot" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}

function BottomNav({ active, onNavigate }) {
  const items = [
    { key: "today", label: "Hari Ini", icon: Home },
    { key: "insights", label: "Wawasan", icon: BarChart2 },
    { key: "calendar", label: "Kalender", icon: CalendarIcon },
    { key: "settings", label: "Pengaturan", icon: SettingsIcon },
  ];
  return (
    <nav
      className="shrink-0 relative z-40 flex justify-around items-center px-2 pt-2 bg-white border-t border-gray-200"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
    >
      {items.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-full transition-all duration-300 active:scale-90 ${
              isActive ? "bg-black text-white" : "text-gray-500 hover:text-black"
            }`}
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Toast({ toasts, onDismiss }) {
  return (
    <div
      className="fixed z-[9999] flex flex-col items-center gap-2 pointer-events-none"
      style={{ left: "50%", transform: "translateX(-50%)", bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`relative overflow-hidden pointer-events-auto ${t.leaving ? "animate-toastOut" : "animate-toastIn"}`}
          style={{ position: "relative", left: "auto", transform: "none" }}
        >
          <button
            onClick={() => onDismiss(t.id)}
            className={`flex items-center gap-2.5 text-white text-sm pl-3 pr-4 py-3 rounded-2xl shadow-xl whitespace-nowrap max-w-[80vw] ${
              t.variant === "error" ? "bg-red-500" : "bg-gray-900"
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              {t.variant === "error" ? <AlertTriangle size={13} /> : <Check size={13} />}
            </span>
            <span className="truncate">{t.message}</span>
          </button>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/25 mx-3" style={{ width: "calc(100% - 24px)" }}>
            <div className="toast-bar h-full bg-white/70" style={{ animationDuration: `${t.duration}ms` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ open, icon: Icon, title, message, confirmLabel = "Simpan", cancelLabel = "Batal", onConfirm, onCancel, danger }) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn" onClick={onCancel}>
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center">
          {Icon && (
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Icon size={24} />
            </div>
          )}
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={`w-full py-3 rounded-full font-bold active:scale-95 transition-all duration-300 hover:scale-[1.02] ${
              danger ? "bg-red-500 text-white hover:bg-red-600" : "bg-black text-white hover:opacity-90"
            }`}
          >
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="w-full py-3 border border-gray-200 rounded-full font-medium hover:bg-gray-50 transition-colors active:scale-95">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckinDialog({ open, checkin, onSave, onSkip }) {
  const [reply, setReply] = useState("");
  useEffect(() => {
    if (open) setReply("");
  }, [open, checkin?.key]);
  if (!open || !checkin) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scaleIn">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-black flex items-center justify-center text-white shrink-0">
            <Bell size={18} />
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-tight">{checkin.title}</h3>
            <p className="text-sm text-gray-500">{checkin.message}</p>
          </div>
        </div>
        <textarea
          autoFocus
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Tulis balasan singkat (opsional)..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-black transition-colors resize-none mt-1"
        />
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => onSave(reply.trim())}
            className="w-full py-3 bg-black text-white rounded-full font-bold active:scale-95 hover:scale-[1.02] transition-all duration-300"
          >
            Simpan
          </button>
          <button onClick={onSkip} className="w-full py-3 border border-gray-200 rounded-full font-medium hover:bg-gray-50 transition-colors">
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen({ label }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
      <Loader2 size={28} className="animate-spin-slow" />
      <p className="text-sm">{label || "Memuat data kesehatanmu..."}</p>
    </div>
  );
}

/* ---------------------------------------------------------------
   AUTENTIKASI — akun disimpan permanen di Firebase Realtime Database
   (webhaidku-default-rtdb), sehingga login tetap berfungsi setelah
   aplikasi di-build ulang menjadi APK / dibuka di perangkat lain.
   Perangkat ini hanya mengingat EMAIL terakhir (lewat localStorage)
   supaya tidak perlu login ulang tiap buka app; kata sandi & seluruh
   data kesehatan selalu diverifikasi/diambil langsung dari Firebase.
--------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthShellHeader({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center text-center pt-10 pb-6 px-6">
      <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center text-white mb-4">
        <Heart size={24} />
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-gray-500 mt-1 max-w-xs">{subtitle}</p>
    </div>
  );
}

function FieldInput({ icon: Icon, type = "text", value, onChange, placeholder, error, showToggle, onToggle, revealed }) {
  return (
    <div>
      <div className={`flex items-center gap-2 border rounded-xl px-3.5 py-3 transition-colors ${error ? "border-red-300 bg-red-50" : "border-gray-200 focus-within:border-black"}`}>
        <Icon size={18} className="text-gray-400 shrink-0" />
        <input
          type={showToggle ? (revealed ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm focus:outline-none min-w-0"
        />
        {showToggle && (
          <button type="button" onClick={onToggle} className="text-gray-400 shrink-0" aria-label="Tampilkan sandi">
            {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1 px-1">{error}</p>}
    </div>
  );
}

function RegisterScreen({ onRegister, goLogin, prefillEmail }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefillEmail || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const errs = {};
    if (!name.trim()) errs.name = "Nama tidak boleh kosong";
    if (!EMAIL_RE.test(email.trim())) errs.email = "Masukkan email yang valid";
    if (password.length < 6) errs.password = "Sandi minimal 6 karakter";
    if (confirm !== password) errs.confirm = "Konfirmasi sandi tidak cocok";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    try {
      await onRegister({ name: name.trim(), email: email.trim().toLowerCase(), password });
    } catch (e) {
      setErrors({ email: e.message || "Gagal mendaftar, coba lagi" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto py-8">
      <div className="w-full max-w-sm mx-auto">
        <AuthShellHeader title="Buat Akun CycleSync" subtitle="Simpan data siklus dan kesehatanmu dengan aman, tersinkron ke akunmu." />
        <div className="px-6 space-y-3 pb-2">
          <FieldInput icon={User} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" error={errors.name} />
          <FieldInput icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Alamat email" error={errors.email} />
          <FieldInput
            icon={KeyRound} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata sandi"
            error={errors.password} showToggle revealed={reveal} onToggle={() => setReveal((v) => !v)}
          />
          <FieldInput
            icon={KeyRound} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Konfirmasi kata sandi"
            error={errors.confirm} showToggle revealed={reveal} onToggle={() => setReveal((v) => !v)}
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full bg-black text-white py-3.5 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 hover:scale-[1.02] transition-all duration-300 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={18} className="animate-spin-slow" /> : <UserPlus size={18} />}
            {submitting ? "Membuat akun..." : "Daftar"}
          </button>
          <p className="text-center text-xs text-gray-400 px-4">
            Dengan mendaftar kamu menyetujui data siklusmu disimpan secara aman di akunmu.
          </p>
          <button onClick={goLogin} className="w-full text-center text-sm text-gray-500 hover:text-black transition-colors pt-2">
            Sudah punya akun? <span className="font-semibold text-black">Masuk</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, goRegister, prefillEmail }) {
  const [email, setEmail] = useState(prefillEmail || "");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim()) || !password) {
      setError("Isi email dan kata sandi dengan benar");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onLogin({ email: email.trim().toLowerCase(), password });
    } catch (e) {
      setError(e.message || "Email atau kata sandi salah");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto py-8">
      <div className="w-full max-w-sm mx-auto">
        <AuthShellHeader title="Selamat Datang Kembali" subtitle="Masuk untuk melanjutkan pelacakan siklusmu." />
        <div className="px-6 space-y-3 pb-2">
          <FieldInput icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Alamat email" />
          <FieldInput
            icon={KeyRound} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata sandi"
            showToggle revealed={reveal} onToggle={() => setReveal((v) => !v)}
          />
          {error && <p className="text-xs text-red-500 px-1">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full bg-black text-white py-3.5 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 hover:scale-[1.02] transition-all duration-300 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={18} className="animate-spin-slow" /> : <LogIn size={18} />}
            {submitting ? "Memeriksa..." : "Masuk"}
          </button>
          <button onClick={goRegister} className="w-full text-center text-sm text-gray-500 hover:text-black transition-colors pt-2">
            Belum punya akun? <span className="font-semibold text-black">Daftar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function OnboardingScreen({ name, onFinish, now }) {
  const [lastPeriodStart, setLastPeriodStart] = useState(toISO(now));
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [isOngoing, setIsOngoing] = useState(true);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await onFinish({ lastPeriodStart, cycleLength, periodLength });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <AuthShellHeader title={`Halo, ${name.split(" ")[0]}!`} subtitle="Yuk siapkan siklusmu supaya prediksi haid & ovulasi akurat sejak hari pertama." />
      <div className="px-6 space-y-4 pb-8">
        <Card>
          <p className="text-sm font-semibold mb-1">Kapan hari pertama haid terakhirmu?</p>
          <p className="text-xs text-gray-500 mb-3">Kalau haidmu sedang berlangsung hari ini, pilih tanggal hari ini.</p>
          <input
            type="date"
            value={lastPeriodStart}
            max={toISO(now)}
            onChange={(e) => setLastPeriodStart(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
          />
          <button
            onClick={() => {
              setIsOngoing(true);
              setLastPeriodStart(toISO(now));
            }}
            className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-full text-sm border transition-colors ${
              isOngoing && lastPeriodStart === toISO(now) ? "bg-black text-white border-black" : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Droplet size={15} /> Haid saya mulai hari ini
          </button>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs text-gray-500 mb-1">Panjang Siklus</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{cycleLength}</span>
              <span className="text-xs text-gray-500">hari</span>
            </div>
            <input type="range" min="21" max="45" value={cycleLength} onChange={(e) => setCycleLength(Number(e.target.value))} className="w-full mt-2 accent-black" />
          </Card>
          <Card>
            <p className="text-xs text-gray-500 mb-1">Lama Haid</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{periodLength}</span>
              <span className="text-xs text-gray-500">hari</span>
            </div>
            <input type="range" min="2" max="10" value={periodLength} onChange={(e) => setPeriodLength(Number(e.target.value))} className="w-full mt-2 accent-black" />
          </Card>
        </div>

        <button
          onClick={finish}
          disabled={saving}
          className="w-full bg-black text-white py-3.5 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 hover:scale-[1.02] transition-all duration-300 disabled:opacity-60"
        >
          {saving ? <Loader2 size={18} className="animate-spin-slow" /> : <Check size={18} />}
          {saving ? "Menyimpan..." : "Mulai Lacak Siklusku"}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Helpers untuk mengambil / mengubah log harian
--------------------------------------------------------------- */

function emptyLog() {
  return { mood: [], physical: [], flow: [], cravings: [], quick: [], note: "", sleep: null, water: null, bbt: null, pillTaken: false, checkins: {} };
}
function getLog(logs, iso) {
  return logs[iso] ? { ...emptyLog(), ...logs[iso] } : emptyLog();
}
function logTagCount(log) {
  return log.mood.length + log.physical.length + log.flow.length + log.cravings.length + log.quick.length;
}
function allTags(log) {
  return [...log.quick, ...log.mood, ...log.physical, ...log.flow, ...log.cravings];
}

/* ---------------------------------------------------------------
   TODAY
--------------------------------------------------------------- */

const QUICK_TAGS = ["Bahagia", "Lelah", "Kram", "Flow Ringan", "Sakit Kepala"];

function TodayScreen({ push, onBell, unread, toast, now, profile, cycleSettings, logs, updateLogs, contraception }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTag, setNewTag] = useState("");
  const todayISO = toISO(now);
  const todayLog = getLog(logs, todayISO);
  const customQuick = todayLog.quick.filter((t) => !QUICK_TAGS.includes(t));

  const info = getCycleInfo(cycleSettings.lastPeriodStart, cycleSettings.cycleLength, cycleSettings.periodLength, now);

  const toggleQuickTag = (t) => {
    updateLogs((prev) => {
      const cur = getLog(prev, todayISO);
      const has = cur.quick.includes(t);
      const nextQuick = has ? cur.quick.filter((x) => x !== t) : [...cur.quick, t];
      return { ...prev, [todayISO]: { ...cur, quick: nextQuick } };
    });
  };

  const togglePillTaken = () => {
    updateLogs((prev) => {
      const cur = getLog(prev, todayISO);
      return { ...prev, [todayISO]: { ...cur, pillTaken: !cur.pillTaken } };
    });
    if (!todayLog.pillTaken) toast("Pil hari ini dicatat sudah diminum");
  };

  const addCustomTag = () => {
    const val = newTag.trim();
    if (val) {
      updateLogs((prev) => {
        const cur = getLog(prev, todayISO);
        return { ...prev, [todayISO]: { ...cur, quick: [...cur.quick, val] } };
      });
      toast(`"${val}" ditambahkan`);
    }
    setNewTag("");
    setShowAdd(false);
  };

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - info.cycleDay / cycleSettings.cycleLength);

  const nextOvulation = nextOccurrence(info.ovulationDate, now, cycleSettings.cycleLength);
  const nextLuteal = nextOccurrence(info.lutealStartDate, now, cycleSettings.cycleLength);
  const nextPeriod = info.nextPeriodStart;

  const upcoming = [
    { name: "Ovulasi", date: nextOvulation, active: info.phase === "Ovulasi" },
    { name: "Fase Luteal", date: nextLuteal, active: info.phase === "Luteal" },
    { name: "Menstruasi", date: nextPeriod, active: info.phase === "Menstruasi" },
  ].sort((a, b) => diffDays(a.date, now) - diffDays(b.date, now));

  const weekBars = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(now, -i);
    const iso = toISO(d);
    const count = logTagCount(getLog(logs, iso));
    weekBars.push({ day: DAY_SHORT[d.getDay()], h: count, isToday: i === 0 });
  }
  const maxH = Math.max(1, ...weekBars.map((b) => b.h));

  return (
    <>
      <TopBar title="CycleSync" showLogo onBell={onBell} unread={unread} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <div className="animate-screenFade">
          <h2 className="text-2xl font-bold tracking-tight">
            {greetingFor(now.getHours())}, {profile.name.split(" ")[0]}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{formatLong(now)} — berikut ringkasan siklusmu hari ini.</p>
        </div>

        <Card className="flex flex-col items-center text-center animate-screenFade" style={{ animationDelay: "40ms" }}>
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90">
              <circle cx="88" cy="88" r={radius} fill="transparent" stroke="#f3f4f6" strokeWidth="6" />
              <circle
                cx="88"
                cy="88"
                r={radius}
                fill="transparent"
                stroke="#000"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 700ms ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">Hari {info.cycleDay}</span>
              <span className="text-sm text-gray-500">dari {cycleSettings.cycleLength} hari</span>
            </div>
          </div>
          <div className="mt-5 space-y-1">
            <h3 className="text-xl font-semibold">{PHASE_LABEL[info.phase]}</h3>
            <p className="text-sm text-gray-500 px-2">{PHASE_DESC[info.phase]}</p>
          </div>
        </Card>

        <Card className="animate-screenFade" style={{ animationDelay: "60ms" }} accent={{ ...CARD_ACCENTS[PHASE_ACCENT_KEY[info.phase]], icon: PHASE_RECS[info.phase].icon }}>
          <div className="flex items-center gap-2 mb-3">
            {(() => {
              const RecIcon = PHASE_RECS[info.phase].icon;
              return (
                <div className="w-9 h-9 rounded-full bg-white/70 flex items-center justify-center shrink-0">
                  <RecIcon size={16} />
                </div>
              );
            })()}
            <h3 className="text-sm font-semibold uppercase tracking-wider">Rekomendasi Untukmu</h3>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2.5">
              <Dumbbell size={16} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">{PHASE_RECS[info.phase].activity}</p>
            </div>
            <div className="flex gap-2.5">
              <Egg size={16} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">{PHASE_RECS[info.phase].food}</p>
            </div>
          </div>
        </Card>

        {contraception?.type === "pil" && contraception?.pillReminderOn && (
          <Card
            onClick={togglePillTaken}
            className={`flex items-center justify-between !p-4 animate-screenFade ${todayLog.pillTaken ? "bg-black text-white" : ""}`}
            style={{ animationDelay: "80ms" }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${todayLog.pillTaken ? "bg-white/15" : "bg-gray-100"}`}>
                {todayLog.pillTaken ? <Check size={18} /> : <AlarmClock size={18} />}
              </div>
              <div>
                <p className="text-sm font-medium">{todayLog.pillTaken ? "Pil sudah diminum" : "Pengingat: minum pil KB"}</p>
                <p className={`text-xs ${todayLog.pillTaken ? "text-white/70" : "text-gray-500"}`}>Jadwal {contraception.pillReminderTime}</p>
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${todayLog.pillTaken ? "border-white bg-white" : "border-gray-300"}`}>
              {todayLog.pillTaken && <Check size={14} className="text-black" />}
            </div>
          </Card>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider">Log Gejala Cepat</h3>
          <div className="flex flex-wrap gap-2 items-center">
            {[...QUICK_TAGS, ...customQuick].map((t) => (
              <Pill key={t} label={t} active={todayLog.quick.includes(t)} onClick={() => toggleQuickTag(t)} />
            ))}
            <button
              onClick={() => setShowAdd((s) => !s)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:scale-90 transition-transform hover:bg-gray-200"
              aria-label="Tambah gejala"
            >
              <Plus size={18} className={`transition-transform duration-300 ${showAdd ? "rotate-45" : ""}`} />
            </button>
          </div>
          {showAdd && (
            <div className="flex items-center gap-2 pt-1 animate-scaleIn">
              <input
                autoFocus
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
                placeholder="Gejala baru..."
                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-black transition-colors"
              />
              <button onClick={addCustomTag} className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium active:scale-95 transition-transform">
                Tambah
              </button>
            </div>
          )}
        </div>

        <Card accent={{ ...CARD_ACCENTS.fuchsia, icon: CalendarIcon }}>
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Fase Mendatang</h3>
          {upcoming.map((p, i) => {
            const d = diffDays(p.date, now);
            const when = d === 0 ? "Hari ini" : d === 1 ? "Besok" : `${d} hari lagi`;
            return (
              <button
                key={p.name}
                onClick={() => toast(`${p.name} diperkirakan mulai ${formatDayMonth(p.date)}`)}
                className={`w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors ${
                  i !== upcoming.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${p.active ? "bg-black" : "bg-gray-300"}`} />
                  <span>{p.name}</span>
                </div>
                <span className="text-sm text-gray-500">{when}</span>
              </button>
            );
          })}
        </Card>

        <Card accent={{ ...CARD_ACCENTS.emerald, icon: Zap }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Tren Minggu Ini</h3>
            <span className="text-sm text-gray-500">Jumlah gejala</span>
          </div>
          <div className="flex items-end justify-between h-28 gap-1">
            {weekBars.map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1 w-full h-full justify-end">
                <div
                  className={`w-4 rounded-full transition-all duration-300 bar-grow ${
                    b.isToday ? "bg-black" : "bg-gray-200 hover:bg-gray-400"
                  }`}
                  style={{ height: `${Math.max(6, (b.h / maxH) * 100)}%`, animationDelay: `${i * 40}ms` }}
                />
                <span className={`text-[10px] ${b.isToday ? "font-bold" : "text-gray-500"}`}>{b.day}</span>
              </div>
            ))}
          </div>
        </Card>

        <div
          onClick={() => push("dailyDetail", { dateISO: todayISO })}
          className="bg-black text-white rounded-2xl p-5 flex justify-between items-center cursor-pointer active:scale-[0.98] hover:scale-[1.01] transition-all duration-300"
        >
          <div>
            <h4 className="text-lg font-semibold">Ringkasan Hari Ini</h4>
            <p className="text-sm opacity-80">
              {logTagCount(todayLog) > 0 ? `${logTagCount(todayLog)} gejala tercatat hari ini` : "Belum ada gejala tercatat"}
            </p>
          </div>
          <ArrowRight size={26} />
        </div>
      </main>
    </>
  );
}

/* ---------------------------------------------------------------
   INSIGHTS
--------------------------------------------------------------- */

function InsightsScreen({ onBell, unread, now, cycleSettings, logs }) {
  const [activeBar, setActiveBar] = useState(null);
  const info = getCycleInfo(cycleSettings.lastPeriodStart, cycleSettings.cycleLength, cycleSettings.periodLength, now);

  // 8 titik data mewakili ~30 hari terakhir (rata-rata tiap ~4 hari)
  const bars = [];
  for (let i = 7; i >= 0; i--) {
    let sum = 0;
    for (let j = 0; j < 4; j++) {
      const d = addDays(now, -(i * 4 + j));
      sum += logTagCount(getLog(logs, toISO(d)));
    }
    bars.push(sum);
  }
  const maxBar = Math.max(1, ...bars);

  // agregasi tag terbanyak
  const tagFreq = {};
  let sleepSum = 0,
    sleepCount = 0;
  Object.values(logs).forEach((l) => {
    const log = { ...emptyLog(), ...l };
    allTags(log).forEach((t) => (tagFreq[t] = (tagFreq[t] || 0) + 1));
    if (typeof log.sleep === "number") {
      sleepSum += log.sleep;
      sleepCount += 1;
    }
  });
  const topSymptom = Object.entries(tagFreq).sort((a, b) => b[1] - a[1])[0];
  const avgSleep = sleepCount ? sleepSum / sleepCount : null;
  const avgSleepStr = avgSleep ? `${Math.floor(avgSleep)}j ${Math.round((avgSleep % 1) * 60)}m` : "Belum ada data";

  // riwayat 3 siklus sebelumnya (perkiraan berbasis pengaturan siklus)
  const history = [0, 1, 2].map((i) => {
    const start = addDays(info.currentCycleStart, -(i + 1) * cycleSettings.cycleLength);
    return { m: `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`, days: `${cycleSettings.cycleLength} hari` };
  });

  const predictions = [1, 2, 3].map((i) => addDays(info.nextPeriodStart, (i - 1) * cycleSettings.cycleLength));

  const circleCirc = 2 * Math.PI * 24;
  const circleOffset = circleCirc * (1 - info.cycleDay / cycleSettings.cycleLength);

  return (
    <>
      <TopBar title="CycleSync" showLogo onBell={onBell} unread={unread} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Wawasan</h2>
          <p className="text-sm text-gray-500">Analisis kesehatan siklusmu, {formatShort(now)}</p>
        </div>

        <Card>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Siklus Saat Ini</p>
              <h3 className="text-3xl font-bold">Hari ke-{info.cycleDay}</h3>
            </div>
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-full h-full -rotate-90">
                <circle cx="28" cy="28" r="24" fill="transparent" stroke="#f3f4f6" strokeWidth="4" />
                <circle
                  cx="28" cy="28" r="24" fill="transparent" stroke="#000" strokeWidth="4"
                  strokeDasharray={circleCirc} strokeDashoffset={circleOffset}
                  style={{ transition: "stroke-dashoffset 700ms ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Droplet size={16} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl">
            <CalendarIcon size={20} />
            <p className="text-sm">
              {info.daysUntilNextPeriod === 0
                ? "Menstruasi diperkirakan mulai hari ini"
                : `${info.daysUntilNextPeriod} hari lagi menuju menstruasi`}
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-semibold">Tren Kesehatan</h4>
            <span className="text-xs text-gray-500">30 Hari Terakhir</span>
          </div>
          <div className="h-28 flex items-end justify-between gap-1.5 mb-2 relative">
            {bars.map((h, i) => {
              const pct = Math.max(4, (h / maxBar) * 100);
              return (
                <div key={i} className="flex-1 relative flex flex-col items-center justify-end h-full">
                  {activeBar === i && (
                    <div className="absolute -top-6 bg-black text-white text-[10px] px-2 py-0.5 rounded-full animate-scaleIn">
                      {h}x
                    </div>
                  )}
                  <div
                    onClick={() => setActiveBar(i)}
                    className={`w-full rounded-t-sm cursor-pointer transition-all duration-300 bar-grow ${
                      activeBar === i ? "bg-black" : "bg-gray-200 hover:bg-gray-300"
                    }`}
                    style={{ height: `${pct}%`, animationDelay: `${i * 40}ms` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 uppercase">
            <span>Awal Bulan</span>
            <span>Hari Ini</span>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="flex flex-col justify-between">
            <div className="w-8 h-8 flex items-center justify-center mb-2">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Gejala Terbanyak</p>
              <h4 className="text-lg font-semibold mt-1">{topSymptom ? topSymptom[0] : "Belum ada data"}</h4>
            </div>
          </Card>
          <Card className="flex flex-col justify-between">
            <div className="w-8 h-8 flex items-center justify-center mb-2">
              <Moon size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Rata-rata Tidur</p>
              <h4 className="text-lg font-semibold mt-1">{avgSleepStr}</h4>
            </div>
          </Card>
        </div>

        <Card>
          <h4 className="text-lg font-semibold mb-3">Riwayat Siklus</h4>
          {history.map((h, i) => (
            <div key={h.m} className={`flex justify-between items-center py-2 ${i !== history.length - 1 ? "border-b border-gray-100" : ""}`}>
              <span>{h.m}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">Normal</span>
                <span className="font-medium">{h.days}</span>
              </div>
            </div>
          ))}
        </Card>

        <div className="bg-black text-white rounded-2xl p-5">
          <h4 className="text-lg font-semibold mb-4">Prediksi Mendatang</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            {predictions.map((d, i) => (
              <div key={i} className={i === 1 ? "border-x border-white/20" : ""}>
                <p className="text-xs opacity-60 mb-1">{MONTH_NAMES[d.getMonth()].slice(0, 3)}</p>
                <p className="text-xl font-semibold">{pad2(d.getDate())}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

/* ---------------------------------------------------------------
   CALENDAR
--------------------------------------------------------------- */

function buildCalendarGrid(year, month, cycleSettings, logs, now) {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = firstOfMonth.getDay();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - leading + 1;
    const date = new Date(year, month, dayNum);
    const dim = dayNum < 1 || dayNum > daysInMonth;
    const iso = toISO(date);
    const info = getCycleInfo(cycleSettings.lastPeriodStart, cycleSettings.cycleLength, cycleSettings.periodLength, date);
    cells.push({
      date,
      iso,
      d: date.getDate(),
      dim,
      today: !dim && diffDays(date, now) === 0,
      period: info.cycleDay <= cycleSettings.periodLength,
      ovulation: info.cycleDay === info.ovulationDayNum,
      hasLog: !dim && logTagCount(getLog(logs, iso)) > 0,
    });
  }
  return cells;
}

function CalendarScreen({ push, onBell, unread, toast, now, cycleSettings, logs }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = useMemo(() => buildCalendarGrid(year, month, cycleSettings, logs, now), [year, month, cycleSettings, logs, now]);

  const info = getCycleInfo(cycleSettings.lastPeriodStart, cycleSettings.cycleLength, cycleSettings.periodLength, now);
  const nextOvulation = nextOccurrence(info.ovulationDate, now, cycleSettings.cycleLength);

  const handleDayClick = (c) => {
    if (c.dim) return;
    push("dailyDetail", { dateISO: c.iso });
  };

  return (
    <>
      <TopBar title="CycleSync" showLogo onBell={onBell} unread={unread} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-24 relative">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {MONTH_NAMES[month]} {year}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                className="p-1 border border-gray-200 rounded-lg active:scale-90 transition-transform hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              {monthOffset !== 0 && (
                <button
                  onClick={() => setMonthOffset(0)}
                  className="px-2 text-xs border border-gray-200 rounded-lg active:scale-90 transition-transform hover:bg-gray-50"
                >
                  Hari Ini
                </button>
              )}
              <button
                onClick={() => setMonthOffset((m) => m + 1)}
                className="p-1 border border-gray-200 rounded-lg active:scale-90 transition-transform hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-y-2 text-center">
            {DAY_SHORT.map((d, i) => (
              <div key={i} className="text-xs text-gray-500">
                {d[0]}
              </div>
            ))}
            {days.map((c, i) => (
              <button
                key={i}
                onClick={() => handleDayClick(c)}
                disabled={c.dim}
                className={`py-1 flex items-center justify-center relative transition-transform active:scale-90 ${
                  c.dim ? "cursor-default" : "cursor-pointer"
                }`}
              >
                {c.today ? (
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-black text-white text-sm font-bold">{c.d}</span>
                ) : (
                  <span
                    className={`text-sm w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                      c.dim ? "text-gray-300" : c.period ? "bg-gray-100" : "hover:bg-gray-100"
                    }`}
                  >
                    {c.d}
                  </span>
                )}
                {c.period && !c.today && <div className="absolute bottom-0 w-1 h-1 bg-black rounded-full" />}
                {c.ovulation && <div className="absolute bottom-0 w-1.5 h-1.5 bg-yellow-400 rounded-full" />}
                {c.hasLog && !c.period && !c.ovulation && !c.today && (
                  <div className="absolute top-0 w-1 h-1 bg-emerald-400 rounded-full" />
                )}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-4 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-black" />
              <span className="text-xs text-gray-500">Haid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-xs text-gray-500">Ovulasi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-500">Ada catatan</span>
            </div>
          </div>
        </Card>

        <Card accent={{ ...CARD_ACCENTS.sky, icon: Egg }}>
          <h2 className="text-lg font-semibold mb-3">Jadwal Mendatang</h2>
          <div className="space-y-2">
            <button
              onClick={() => toast(`Ovulasi diperkirakan ${formatDayMonth(nextOvulation)}`)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
                  <Egg size={18} className="text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Ovulasi</p>
                  <p className="text-sm text-gray-500">Diharapkan dalam {diffDays(nextOvulation, now)} hari</p>
                </div>
              </div>
              <p className="text-sm font-bold">{formatDayMonth(nextOvulation)}</p>
            </button>
            <button
              onClick={() => toast(`Haid diperkirakan ${formatDayMonth(info.nextPeriodStart)}`)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Droplet size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium">Haid Berikutnya</p>
                  <p className="text-sm text-gray-500">Diharapkan dalam {info.daysUntilNextPeriod} hari</p>
                </div>
              </div>
              <p className="text-sm font-bold">{formatDayMonth(info.nextPeriodStart)}</p>
            </button>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="aspect-square flex flex-col justify-between" accent={{ ...CARD_ACCENTS.rose, icon: Droplet }}>
            <Droplet size={20} />
            <div>
              <p className="text-xs text-gray-500">Fase</p>
              <p className="text-lg font-semibold leading-tight">{info.phase}</p>
            </div>
          </Card>
          <Card className="aspect-square flex flex-col justify-between" accent={{ ...CARD_ACCENTS.violet, icon: CalendarIcon }}>
            <CalendarIcon size={20} />
            <div>
              <p className="text-xs text-gray-500">Hari Ke-</p>
              <p className="text-lg font-semibold leading-tight">{info.cycleDay}</p>
            </div>
          </Card>
        </div>

        <button
          onClick={() => push("editSymptoms", { dateISO: toISO(now) })}
          className="w-full bg-black text-white py-4 rounded-full font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 hover:scale-[1.02] transition-all duration-300"
        >
          <Plus size={20} /> Tambah Catatan Harian
        </button>
      </main>
    </>
  );
}

/* ---------------------------------------------------------------
   DAILY DETAIL
--------------------------------------------------------------- */

const TAG_ICONS = {
  Bahagia: Smile, Lelah: Frown, Kram: Droplet, "Flow Ringan": Droplet, "Sakit Kepala": CircleAlert,
  Tenang: Meh, "Mudah Marah": Frown, Sedih: Frown, Cemas: CircleAlert,
  "Energi Tinggi": Zap, Kembung: Droplet,
};

function DailyDetailScreen({ pop, push, params, now, cycleSettings, logs, goals }) {
  const dateISO = params?.dateISO ?? toISO(now);
  const date = fromISO(dateISO);
  const log = getLog(logs, dateISO);
  const info = getCycleInfo(cycleSettings.lastPeriodStart, cycleSettings.cycleLength, cycleSettings.periodLength, date);
  const tags = allTags(log);
  const isFuture = diffDays(date, now) > 0;

  const sleepVal = log.sleep ?? null;
  const waterVal = log.water ?? null;
  const sleepPct = sleepVal != null ? Math.min(100, Math.round((sleepVal / goals.sleep) * 100)) : 0;
  const waterPct = waterVal != null ? Math.min(100, Math.round((waterVal / goals.water) * 100)) : 0;

  return (
    <>
      <TopBar title={formatShort(date)} onBack={pop} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <Card className="relative overflow-hidden animate-screenFade">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black text-white rounded-full mb-3 text-xs">
            <Repeat size={14} /> Hari {info.cycleDay}
          </div>
          <h2 className="text-2xl font-bold mb-2">{PHASE_LABEL[info.phase]}</h2>
          <p className="text-sm text-gray-500">{PHASE_DESC[info.phase]}</p>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Gejala Tercatat</h3>
            <Smile size={20} className="text-gray-400" />
          </div>
          {tags.length === 0 ? (
            <p className="text-sm text-gray-400">
              {isFuture ? "Tanggal ini belum terjadi." : "Belum ada gejala tercatat untuk hari ini."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((label) => {
                const Icon = TAG_ICONS[label] || Sparkles;
                return (
                  <div key={label} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-2 rounded-full text-sm">
                    <Icon size={16} /> {label}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs text-gray-500">Tidur</p>
                <p className="text-lg font-semibold mt-1">{sleepVal != null ? `${sleepVal}j` : "—"}</p>
              </div>
              <Moon size={18} />
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-black h-full transition-all duration-700" style={{ width: `${sleepPct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">{sleepVal != null ? `${sleepPct}% dari target` : `Target: ${goals.sleep}j`}</p>
          </Card>
          <Card>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs text-gray-500">Air Minum</p>
                <p className="text-lg font-semibold mt-1">{waterVal != null ? `${(waterVal / 1000).toFixed(1)}L` : "—"}</p>
              </div>
              <Droplet size={18} />
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-black h-full transition-all duration-700" style={{ width: `${waterPct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {waterVal != null ? `${waterPct}% dari target` : `Target: ${(goals.water / 1000).toFixed(1)}L`}
            </p>
          </Card>
        </div>

        {log.bbt != null && (
          <Card className="flex items-center gap-3">
            <div className="bg-gray-50 p-2 rounded-xl">
              <Flame size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Suhu Basal Tubuh</p>
              <p className="text-lg font-semibold">{log.bbt.toFixed(2)}°C</p>
            </div>
          </Card>
        )}

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <PenLine size={18} className="text-gray-400" />
            <h3 className="text-lg font-semibold">Catatan Pribadi</h3>
          </div>
          {log.note ? (
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 italic text-sm text-gray-700">"{log.note}"</div>
          ) : (
            <p className="text-sm text-gray-400">Belum ada catatan untuk hari ini.</p>
          )}
        </Card>
      </main>
      <div className="shrink-0 p-4">
        <button
          onClick={() => push("editSymptoms", { dateISO })}
          className="w-full bg-black text-white py-4 rounded-full flex items-center justify-center gap-2 font-medium active:scale-95 hover:scale-[1.02] transition-all duration-300"
        >
          <Pencil size={18} /> Edit Log
        </button>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------
   EDIT SYMPTOMS
--------------------------------------------------------------- */

function Stepper({ label, value, unit, onChange, step, min, max, format }) {
  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, (value ?? min) - step))}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-full active:scale-90 transition-transform hover:bg-gray-50"
        >
          −
        </button>
        <span className="text-sm font-semibold w-16 text-center">{value != null ? (format ? format(value) : `${value}${unit}`) : "—"}</span>
        <button
          onClick={() => onChange(Math.min(max, (value ?? 0) + step))}
          className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-full active:scale-90 transition-transform hover:bg-gray-50"
        >
          +
        </button>
      </div>
    </div>
  );
}

function EditSymptomsScreen({ pop, push, params, toast, logs, updateLogs, now }) {
  const dateISO = params?.dateISO ?? toISO(now);
  const existing = getLog(logs, dateISO);
  const [mood, setMood] = useState(existing.mood);
  const [physical, setPhysical] = useState(existing.physical);
  const [flow, setFlow] = useState(existing.flow);
  const [cravings, setCravings] = useState(existing.cravings);
  const [sleep, setSleep] = useState(existing.sleep);
  const [water, setWater] = useState(existing.water);
  const [bbt, setBbt] = useState(existing.bbt);
  const [note, setNote] = useState(existing.note);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const toggle = (arr, setArr, val) => setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const resetAll = () => {
    setMood([]);
    setPhysical([]);
    setFlow([]);
    setCravings([]);
    setNote("");
    setSleep(null);
    setWater(null);
    setBbt(null);
    setShowResetConfirm(false);
    toast("Semua gejala direset");
  };

  const openNoteModal = () => {
    setNoteDraft(note);
    setShowNoteModal(true);
  };

  const saveAll = () => {
    updateLogs((prev) => {
      const cur = getLog(prev, dateISO);
      return { ...prev, [dateISO]: { ...cur, mood, physical, flow, cravings, note, sleep, water, bbt } };
    });
    setShowConfirm(false);
    push("success", { dateISO });
  };

  const dateObj = fromISO(dateISO);

  return (
    <>
      <header className="shrink-0 h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-white">
        <button onClick={pop} aria-label="Batal" className="active:scale-90 transition-transform">
          <X size={22} />
        </button>
        <h1 className="text-lg font-bold">Edit Gejala</h1>
        <button
          onClick={() => setShowConfirm(true)}
          className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-medium active:scale-95 hover:scale-[1.02] transition-all duration-300"
        >
          Simpan
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-6 relative">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Hari ini, {formatShort(dateObj)}</p>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Smile size={18} className="text-gray-400" />
            <h2 className="text-lg font-semibold">Suasana Hati</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Bahagia", "Tenang", "Mudah Marah", "Sedih", "Cemas"].map((m) => (
              <Pill key={m} label={m} active={mood.includes(m)} onClick={() => toggle(mood, setMood, m)} />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell size={18} className="text-gray-400" />
            <h2 className="text-lg font-semibold">Fisik</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Energi Tinggi", "Lelah", "Kram", "Kembung", "Sakit Kepala"].map((m) => (
              <Pill key={m} label={m} active={physical.includes(m)} onClick={() => toggle(physical, setPhysical, m)} />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Droplet size={18} className="text-gray-400" />
            <h2 className="text-lg font-semibold">Keluaran (Flow)</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Tidak Ada", "Ringan", "Sedang", "Berat"].map((m) => (
              <Pill key={m} label={m} active={flow.includes(m)} onClick={() => toggle(flow, setFlow, m)} />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-gray-400" />
            <h2 className="text-lg font-semibold">Keinginan Makan</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Manis", "Asin", "Pedas"].map((m) => (
              <Pill key={m} label={m} active={cravings.includes(m)} onClick={() => toggle(cravings, setCravings, m)} />
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Moon size={18} className="text-gray-400" />
            <h2 className="text-lg font-semibold">Tidur &amp; Hidrasi</h2>
          </div>
          <Stepper label="Jam Tidur" value={sleep} onChange={setSleep} step={0.5} min={0} max={14} format={(v) => `${v}j`} />
          <Stepper label="Air Minum" value={water} onChange={setWater} step={100} min={0} max={5000} format={(v) => `${(v / 1000).toFixed(1)}L`} />
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={18} className="text-gray-400" />
            <h2 className="text-lg font-semibold">Suhu Basal Tubuh (BBT)</h2>
          </div>
          <p className="text-xs text-gray-500 -mt-1">Ukur segera setelah bangun tidur, sebelum beraktivitas, untuk hasil paling akurat.</p>
          <Stepper label="Suhu Basal" value={bbt} onChange={setBbt} step={0.05} min={35} max={40} format={(v) => `${v.toFixed(2)}°C`} />
        </section>

        <div className="w-full h-px bg-gray-100" />

        <div className="space-y-3">
          <button
            onClick={openNoteModal}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <PenLine size={18} className="shrink-0" />
              <div className="min-w-0">
                <span className="block">{note ? "Catatan Khusus" : "Tambah Catatan Khusus"}</span>
                {note && <span className="block text-xs text-gray-500 truncate">{note}</span>}
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300 shrink-0" />
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-gray-200 text-red-400 hover:bg-red-50 transition-colors active:scale-[0.98]"
          >
            <RotateCcw size={18} /> Reset Semua
          </button>
        </div>
      </main>

      <ConfirmDialog
        open={showConfirm}
        icon={Save}
        title="Simpan Perubahan?"
        message={`Log kesehatanmu untuk ${formatShort(dateObj)} akan diperbarui.`}
        confirmLabel="Simpan"
        onConfirm={saveAll}
        onCancel={() => setShowConfirm(false)}
      />

      <ConfirmDialog
        open={showResetConfirm}
        icon={RotateCcw}
        title="Reset Semua Catatan?"
        message="Ini akan menghapus semua gejala, suasana hati, dan catatan yang tercatat hari ini."
        confirmLabel="Reset"
        danger
        onConfirm={resetAll}
        onCancel={() => setShowResetConfirm(false)}
      />

      {showNoteModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn" onClick={() => setShowNoteModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">Tambah Catatan Khusus</h3>
            <textarea
              autoFocus
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Bagaimana perasaanmu hari ini?"
              rows={4}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-black transition-colors resize-none"
            />
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  setNote(noteDraft.trim());
                  setShowNoteModal(false);
                  toast("Catatan disimpan");
                }}
                className="w-full py-3 bg-black text-white rounded-full font-bold active:scale-95 hover:scale-[1.02] transition-all duration-300"
              >
                Simpan Catatan
              </button>
              <button onClick={() => setShowNoteModal(false)} className="w-full py-3 border border-gray-200 rounded-full font-medium hover:bg-gray-50 transition-colors">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------
   SUCCESS
--------------------------------------------------------------- */

function Confetti() {
  const pieces = Array.from({ length: 24 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 1.6 + Math.random() * 1.2;
        const size = 4 + Math.random() * 5;
        const colors = ["#000000", "#6B7280", "#D1D5DB", "#1f2937"];
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            style={{
              position: "absolute", left: `${left}%`, top: "-10px", width: size, height: size,
              backgroundColor: color, borderRadius: i % 2 === 0 ? "50%" : "2px",
              animation: `confettiFall ${duration}s linear ${delay}s forwards`,
            }}
          />
        );
      })}
    </div>
  );
}

const STREAK_BADGES = [
  { days: 7, label: "7 Hari", icon: Flame, desc: "Seminggu penuh mencatat" },
  { days: 30, label: "30 Hari", icon: Sparkles, desc: "Sebulan konsisten" },
  { days: 100, label: "100 Hari", icon: BadgeCheck, desc: "Master pencatatan" },
];

function SuccessScreen({ goHome, goDetail, params }) {
  const dateISO = params?.dateISO;
  const date = dateISO ? fromISO(dateISO) : new Date();
  return (
    <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-10 text-center relative">
      <Confetti />
      <div className="w-20 h-20 rounded-full border-2 border-black flex items-center justify-center mb-6 animate-scaleIn relative z-10">
        <svg viewBox="0 0 52 52" className="w-10 h-10">
          <path className="animate-check" d="M14.1 27.2l7.1 7.2 16.7-16.8" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold mb-2 animate-screenFade relative z-10">Log Berhasil Disimpan</h1>
      <p className="text-sm text-gray-500 max-w-xs animate-screenFade relative z-10" style={{ animationDelay: "80ms" }}>
        Data kesehatanmu untuk <span className="font-semibold text-black">{formatDayMonth(date)}</span> telah diperbarui.
      </p>

      <div className="w-full mt-8 space-y-3 relative z-10">
        <Card className="flex items-center gap-3 !p-4 text-left">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <BarChart2 size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Wawasan Baru</p>
            <p className="text-sm font-medium">Tren siklusmu tetap stabil</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 !p-4 text-left">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Sinkronisasi</p>
            <p className="text-sm font-medium">Data tersimpan ke akunmu</p>
          </div>
        </Card>
      </div>

      <div className="mt-8 w-full space-y-2 relative z-10">
        <button
          onClick={goHome}
          className="w-full bg-black text-white py-3.5 rounded-full flex items-center justify-center gap-2 font-medium active:scale-95 hover:scale-[1.02] transition-all duration-300"
        >
          Kembali ke Dashboard <ArrowRight size={18} />
        </button>
        <button onClick={() => goDetail(dateISO)} className="w-full py-2 text-sm text-gray-500 hover:text-black transition-colors">
          Lihat Detail Log
        </button>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------
   SETTINGS
--------------------------------------------------------------- */

function SettingsScreen({ push, onBell, unread, toast, profile, notif, updateNotif, cycleSettings, goals, logs, now, onLogout }) {
  const [showSignOut, setShowSignOut] = useState(false);

  const exportData = () => {
    const payload = { exported_at: now.toISOString(), profile, cycleSettings, goals, logs };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cyclesync-data-${toISO(now)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Data berhasil diekspor");
  };

  return (
    <>
      <TopBar title="Pengaturan" onBell={onBell} unread={unread} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        <Card className="flex items-center gap-3" onClick={() => push("profile")}>
          <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center text-lg font-semibold">
            {profile.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg">{profile.name}</span>
            <span className="text-xs text-gray-500">{profile.email}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              push("profile");
            }}
            className="ml-auto w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 active:scale-90 transition-transform"
          >
            <Pencil size={16} />
          </button>
        </Card>

        <section className="space-y-2">
          <h3 className="text-xs text-gray-500 px-1">Preferensi Kesehatan</h3>
          <Card className="!p-0 divide-y divide-gray-100">
            {[
              { label: "Pelacakan Siklus", icon: CalendarIcon, key: "cycleTracking" },
              { label: "Kontrasepsi & Obat", icon: Shield, key: "contraception" },
              { label: "Pencatatan Gejala", icon: Sparkles, key: "symptomSettings" },
              { label: "Penetapan Target", icon: Flame, key: "goalSetting" },
            ].map(({ label, icon: Icon, key }) => (
              <button key={label} onClick={() => push(key)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:scale-[0.99]">
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{label}</span>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            ))}
          </Card>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs text-gray-500 px-1">Notifikasi</h3>
          <Card className="!p-0 divide-y divide-gray-100">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <AlarmClock size={18} />
                <span>Pengingat Menstruasi</span>
              </div>
              <Toggle checked={notif.periodReminders} onChange={(v) => updateNotif((p) => ({ ...p, periodReminders: v }))} />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <PenLine size={18} />
                <span>Pengingat Log Harian</span>
              </div>
              <Toggle checked={notif.dailyReminders} onChange={(v) => updateNotif((p) => ({ ...p, dailyReminders: v }))} />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Sparkles size={18} />
                <span>Wawasan Kesehatan</span>
              </div>
              <Toggle checked={notif.healthInsights} onChange={(v) => updateNotif((p) => ({ ...p, healthInsights: v }))} />
            </div>
          </Card>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs text-gray-500 px-1">Keamanan &amp; Privasi</h3>
          <Card className="!p-0 divide-y divide-gray-100">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Lock size={18} />
                <span>Kunci Kode Sandi</span>
              </div>
              <Toggle
                checked={notif.passcodeLock}
                onChange={(v) => {
                  updateNotif((p) => ({ ...p, passcodeLock: v }));
                  toast(v ? "Kode sandi diaktifkan" : "Kode sandi dimatikan");
                }}
              />
            </div>
            <button onClick={() => push("infoPage", { key: "encryption" })} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} />
                <span>Info Enkripsi Data</span>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
            <button onClick={exportData} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Download size={18} />
                <span>Ekspor Data</span>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          </Card>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs text-gray-500 px-1">Bantuan</h3>
          <Card className="!p-0 divide-y divide-gray-100">
            {[
              ["Pusat Bantuan", HelpCircle, "helpCenter"],
              ["Ketentuan Layanan", FileText, "terms"],
              ["Kebijakan Privasi", ShieldCheck, "privacy"],
            ].map(([label, Icon, key]) => (
              <button key={label} onClick={() => push("infoPage", { key })} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{label}</span>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            ))}
          </Card>
        </section>

        <div className="flex flex-col items-center gap-3 pt-4 pb-2">
          <span className="text-xs text-gray-500">Versi Aplikasi v1.3.0</span>
          <button
            onClick={() => setShowSignOut(true)}
            className="w-full max-w-xs py-3 rounded-full bg-gray-100 font-medium hover:bg-red-50 hover:text-red-500 transition-colors active:scale-95"
          >
            Keluar
          </button>
        </div>
      </main>

      <ConfirmDialog
        open={showSignOut}
        icon={LogOut}
        title="Keluar dari Akun?"
        message="Kamu perlu masuk kembali untuk mengakses data kesehatanmu."
        confirmLabel="Keluar"
        danger
        onConfirm={() => {
          setShowSignOut(false);
          onLogout();
        }}
        onCancel={() => setShowSignOut(false)}
      />
    </>
  );
}

/* ---------------------------------------------------------------
   PROFILE
--------------------------------------------------------------- */

function ProfileScreen({ pop, push, toast, profile, updateProfile, logs, now, cycleSettings, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.name);
  const [showSignOut, setShowSignOut] = useState(false);
  const [showBadgeConfetti, setShowBadgeConfetti] = useState(false);
  const info = getCycleInfo(cycleSettings.lastPeriodStart, cycleSettings.cycleLength, cycleSettings.periodLength, now);

  // hitung streak pencatatan berturut-turut hingga hari ini
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = addDays(now, -i);
    const has = logTagCount(getLog(logs, toISO(d))) > 0;
    if (has) streak++;
    else if (i > 0 || logTagCount(getLog(logs, toISO(now))) > 0) break;
    else break;
  }

  // Rayakan setiap kali streak persis menyentuh salah satu milestone badge
  useEffect(() => {
    const hit = STREAK_BADGES.find((b) => b.days === streak);
    if (hit) {
      setShowBadgeConfetti(true);
      toast(`Selamat! Lencana "${hit.label}" terbuka 🎉`);
      const t = setTimeout(() => setShowBadgeConfetti(false), 2200);
      return () => clearTimeout(t);
    }
  }, [streak]);

  const saveName = () => {
    const val = nameDraft.trim();
    if (val) {
      updateProfile((p) => ({ ...p, name: val }));
      toast("Nama profil diperbarui");
    }
    setEditing(false);
  };

  return (
    <>
      <TopBar title="Profil" onBack={pop} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4 relative">
        {showBadgeConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            <Confetti />
          </div>
        )}
        <Card className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-100 flex items-center justify-center text-3xl font-semibold mb-4">
            {profile.name.charAt(0)}
          </div>
          {editing ? (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-center text-lg font-bold focus:outline-none focus:border-black"
              />
              <button onClick={saveName} className="bg-black text-white p-2.5 rounded-full active:scale-90 transition-transform">
                <Check size={18} />
              </button>
            </div>
          ) : (
            <h2 className="text-2xl font-bold">{profile.name}</h2>
          )}
          <p className="text-sm text-gray-500">Anggota sejak {profile.memberSince}</p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="mt-3 bg-black text-white rounded-full px-5 py-2 text-sm font-medium hover:scale-105 active:scale-95 transition-transform"
            >
              Edit Profil
            </button>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="flex items-center gap-3" accent={{ ...CARD_ACCENTS.amber, icon: Flame }}>
            <div className="bg-white/70 p-2 rounded-xl">
              <Flame size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Rentetan Pencatatan</p>
              <p className="text-lg font-semibold">{streak} Hari</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3" accent={{ ...CARD_ACCENTS.violet, icon: CalendarIcon }}>
            <div className="bg-white/70 p-2 rounded-xl">
              <CalendarIcon size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Hari Siklus</p>
              <p className="text-lg font-semibold">Hari {info.cycleDay}</p>
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-semibold mb-1">Lencana Pencatatan</h3>
          <p className="text-sm text-gray-500 mb-4">Rentetan mencatatmu saat ini: {streak} hari</p>
          <div className="grid grid-cols-3 gap-3">
            {STREAK_BADGES.map((b) => {
              const unlocked = streak >= b.days;
              const Icon = b.icon;
              return (
                <div
                  key={b.days}
                  className={`flex flex-col items-center text-center gap-2 p-3 rounded-2xl border transition-all duration-300 ${
                    unlocked ? "bg-black border-black text-white" : "bg-gray-50 border-gray-100 text-gray-300"
                  }`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center ${unlocked ? "bg-white/15" : "bg-white"}`}>
                    <Icon size={20} />
                  </div>
                  <span className={`text-xs font-semibold ${unlocked ? "text-white" : "text-gray-400"}`}>{b.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-3">Pengaturan Akun</h3>
          <div className="space-y-1">
            {[
              ["Informasi Pribadi", User, "personalInfo"],
              ["Privasi & Keamanan", ShieldCheck, "privacy"],
              ["Paket Langganan", CreditCard, "subscription"],
            ].map(([label, Icon, key]) => (
              <button key={label} onClick={() => push("infoPage", { key })} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-gray-500" />
                  <span>{label}</span>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-3">Bantuan</h3>
          <div className="space-y-1">
            <button onClick={() => push("infoPage", { key: "helpCenter" })} className="w-full flex flex-col items-start p-3 hover:bg-gray-50 rounded-xl transition-colors text-left">
              <span className="font-medium">Pusat Bantuan</span>
              <span className="text-xs text-gray-500">FAQ & Panduan</span>
            </button>
            <button onClick={() => push("infoPage", { key: "contact" })} className="w-full flex flex-col items-start p-3 hover:bg-gray-50 rounded-xl transition-colors text-left">
              <span className="font-medium">Hubungi Kami</span>
              <span className="text-xs text-gray-500">Chat dengan Dukungan</span>
            </button>
          </div>
        </Card>

        <button
          onClick={() => setShowSignOut(true)}
          className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-center gap-2 text-red-400 hover:bg-red-50 transition-colors font-bold active:scale-[0.98]"
        >
          <LogOut size={18} /> Keluar
        </button>
        <p className="text-center text-xs text-gray-400 pb-2">CycleSync Versi 2.5.0</p>
      </main>

      <ConfirmDialog
        open={showSignOut}
        icon={LogOut}
        title="Keluar dari Akun?"
        message="Kamu perlu masuk kembali untuk mengakses data kesehatanmu."
        confirmLabel="Keluar"
        danger
        onConfirm={() => {
          setShowSignOut(false);
          onLogout();
        }}
        onCancel={() => setShowSignOut(false)}
      />
    </>
  );
}

/* ---------------------------------------------------------------
   CYCLE TRACKING SETTINGS
--------------------------------------------------------------- */

function CycleTrackingScreen({ pop, toast, cycleSettings, updateCycleSettings, now }) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <>
      <TopBar title="Pelacakan Siklus" onBack={pop} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <Card>
          <p className="text-xs text-gray-500 mb-1">Tanggal Mulai Haid Terakhir</p>
          <input
            type="date"
            value={cycleSettings.lastPeriodStart}
            max={toISO(now)}
            onChange={(e) => {
              updateCycleSettings((p) => ({ ...p, lastPeriodStart: e.target.value }));
              toast("Tanggal mulai haid diperbarui");
            }}
            className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
          />
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs text-gray-500 mb-1">Rata-rata Panjang Siklus</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{cycleSettings.cycleLength}</span>
              <span className="text-xs text-gray-500">hari</span>
            </div>
            <input
              type="range" min="21" max="45" value={cycleSettings.cycleLength}
              onChange={(e) => updateCycleSettings((p) => ({ ...p, cycleLength: Number(e.target.value) }))}
              className="w-full mt-3 accent-black"
            />
          </Card>
          <Card>
            <p className="text-xs text-gray-500 mb-1">Rata-rata Lama Haid</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{cycleSettings.periodLength}</span>
              <span className="text-xs text-gray-500">hari</span>
            </div>
            <input
              type="range" min="2" max="10" value={cycleSettings.periodLength}
              onChange={(e) => updateCycleSettings((p) => ({ ...p, periodLength: Number(e.target.value) }))}
              className="w-full mt-3 accent-black"
            />
          </Card>
        </div>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Mode Pelacakan</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateCycleSettings((p) => ({ ...p, mode: "period" }))}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 ${
                cycleSettings.mode === "period" ? "border-black bg-gray-50" : "border-gray-200"
              }`}
            >
              <CalendarIcon size={20} className="mb-1" />
              <span className="text-sm">Lacak Menstruasi</span>
            </button>
            <button
              onClick={() => updateCycleSettings((p) => ({ ...p, mode: "pregnancy" }))}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 ${
                cycleSettings.mode === "pregnancy" ? "border-black bg-gray-50" : "border-gray-200 text-gray-500"
              }`}
            >
              <Baby size={20} className="mb-1" />
              <span className="text-sm">Lacak Kehamilan</span>
            </button>
          </div>
        </Card>

        <Card className="!p-0 divide-y divide-gray-100">
          <div className="p-4">
            <h2 className="text-lg font-semibold">Pengaturan Prediksi</h2>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p>Tampilkan Prediksi Ovulasi</p>
              <p className="text-xs text-gray-500">Tampilkan perkiraan hari subur</p>
            </div>
            <Toggle checked={cycleSettings.showOvulation} onChange={(v) => updateCycleSettings((p) => ({ ...p, showOvulation: v }))} />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p>Tampilkan Peluang Kehamilan</p>
              <p className="text-xs text-gray-500">Indikator Rendah, Sedang, atau Tinggi</p>
            </div>
            <Toggle checked={cycleSettings.showPregnancy} onChange={(v) => updateCycleSettings((p) => ({ ...p, showPregnancy: v }))} />
          </div>
        </Card>

        <Card className="!p-0 divide-y divide-gray-100">
          <div className="p-4">
            <h2 className="text-lg font-semibold">Pengingat</h2>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p>Pengingat Haid</p>
              <p className="text-xs text-gray-500">Berapa hari sebelum perkiraan mulai</p>
            </div>
            <select
              value={cycleSettings.periodReminderDays}
              onChange={(e) => {
                updateCycleSettings((p) => ({ ...p, periodReminderDays: e.target.value }));
                toast(`Diatur ${e.target.value} hari sebelumnya`);
              }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-black bg-white"
            >
              <option value="1">1 hari</option>
              <option value="2">2 hari</option>
              <option value="3">3 hari</option>
              <option value="5">5 hari</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p>Pengingat Masa Subur</p>
              <p className="text-xs text-gray-500">Kapan ingin diberi tahu</p>
            </div>
            <select
              value={cycleSettings.fertileReminder}
              onChange={(e) => {
                updateCycleSettings((p) => ({ ...p, fertileReminder: e.target.value }));
                toast("Pengingat masa subur diperbarui");
              }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-black bg-white"
            >
              <option value="morning">Pagi hari saat mulai</option>
              <option value="evening">Malam sebelumnya</option>
              <option value="ovulation">Hari ovulasi</option>
            </select>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Manajemen Data</h2>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-full border border-red-200 bg-red-50 text-red-400 hover:bg-red-100 transition-colors active:scale-[0.98]"
          >
            <Trash2 size={18} /> Reset Data Siklus
          </button>
          <p className="text-xs text-gray-500 text-center mt-3">Tindakan ini akan menghapus permanen semua riwayat pelacakan.</p>
        </Card>
      </main>

      <ConfirmDialog
        open={showResetConfirm}
        icon={Trash2}
        title="Reset Data Siklus?"
        message="Semua riwayat siklus yang dilacak akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Reset Data"
        danger
        onConfirm={() => {
          updateCycleSettings((p) => ({ ...p, cycleLength: 28, periodLength: 5, lastPeriodStart: toISO(now) }));
          setShowResetConfirm(false);
          toast("Data siklus telah direset");
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
}

/* ---------------------------------------------------------------
   KONTRASEPSI & OBAT
--------------------------------------------------------------- */

function ContraceptionScreen({ pop, toast, contraception, updateContraception, now }) {
  const type = contraception.type || "none";
  const typeInfo = CONTRACEPTION_TYPES.find((t) => t.key === type) || CONTRACEPTION_TYPES[0];
  const startDate = contraception.startDate ? fromISO(contraception.startDate) : null;
  const nextChangeDate = startDate && typeInfo.durationMonths ? (() => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + typeInfo.durationMonths);
    return d;
  })() : null;
  const daysUntilChange = nextChangeDate ? diffDays(nextChangeDate, now) : null;

  const setType = (key) => {
    updateContraception((p) => ({ ...p, type: key }));
    toast(`Metode diperbarui: ${CONTRACEPTION_TYPES.find((t) => t.key === key)?.label}`);
  };

  return (
    <>
      <TopBar title="Kontrasepsi & Obat" onBack={pop} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <p className="text-sm text-gray-500">
          Mencatat metode kontrasepsimu membantu CycleSync memahami kenapa siklusmu mungkin berubah, karena kontrasepsi hormonal bisa memengaruhi keteraturan haid.
        </p>

        <Card>
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Metode yang Digunakan</h3>
          <div className="flex flex-wrap gap-2">
            {CONTRACEPTION_TYPES.map((t) => (
              <Pill key={t.key} label={t.label} active={type === t.key} onClick={() => setType(t.key)} />
            ))}
          </div>
        </Card>

        {type !== "none" && type !== "kondom" && (
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Tanggal Mulai Pakai</h3>
            <input
              type="date"
              value={contraception.startDate || ""}
              onChange={(e) => updateContraception((p) => ({ ...p, startDate: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:border-black transition-colors"
            />
            {typeInfo.durationMonths && nextChangeDate && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <Clock size={18} className="text-gray-400 shrink-0" />
                <p className="text-sm text-gray-700">
                  Perkiraan waktu {type === "suntik" ? "suntik ulang" : "ganti/lepas"}: <span className="font-semibold">{formatDayMonth(nextChangeDate)}</span>
                  {daysUntilChange != null && daysUntilChange >= 0 && ` (${daysUntilChange} hari lagi)`}
                </p>
              </div>
            )}
          </Card>
        )}

        {type === "pil" && (
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlarmClock size={18} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Pengingat Minum Pil Harian</p>
                  <p className="text-xs text-gray-500">Notifikasi setiap hari di jam yang sama</p>
                </div>
              </div>
              <Toggle
                checked={contraception.pillReminderOn}
                onChange={(v) => {
                  updateContraception((p) => ({ ...p, pillReminderOn: v }));
                  toast(v ? "Pengingat pil diaktifkan" : "Pengingat pil dimatikan");
                }}
              />
            </div>
            {contraception.pillReminderOn && (
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-sm">Jam Pengingat</span>
                <input
                  type="time"
                  value={contraception.pillReminderTime}
                  onChange={(e) => updateContraception((p) => ({ ...p, pillReminderTime: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black transition-colors"
                />
              </div>
            )}
          </Card>
        )}

        <Card className="flex gap-3 !p-4">
          <Info size={18} className="text-gray-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 leading-relaxed">
            Data ini bukan pengganti saran medis. Selalu konsultasikan pilihan dan jadwal kontrasepsimu dengan dokter atau bidan.
          </p>
        </Card>
      </main>
    </>
  );
}

/* ---------------------------------------------------------------
   SYMPTOM LOGGING SETTINGS
--------------------------------------------------------------- */

function SymptomSettingsScreen({ pop, toast, notif, updateNotif, updateLogs }) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <>
      <TopBar title="Pencatatan Gejala" onBack={pop} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Konfigurasi</p>
          <h2 className="text-lg font-semibold">Sesuaikan pengalaman pelacakanmu.</h2>
        </div>

        <Card>
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-semibold">Kategori yang Dilacak</h3>
              <p className="text-xs text-gray-500">Aktifkan/nonaktifkan kategori yang ditampilkan</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              ["Fisik", Dumbbell, "trackPhysical"],
              ["Emosional", Smile, "trackEmotional"],
              ["Energi", Zap, "trackEnergy"],
            ].map(([label, Icon, key]) => (
              <div key={label} className="flex items-center justify-between p-2.5 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Icon size={18} />
                  <span>{label}</span>
                </div>
                <Toggle checked={notif[key]} onChange={(v) => updateNotif((p) => ({ ...p, [key]: v }))} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-1">Frekuensi Pencatatan</h3>
          <p className="text-xs text-gray-500 mb-3">Pengingat & jadwal</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateNotif((p) => ({ ...p, logFrequency: "daily" }))}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 ${
                notif.logFrequency === "daily" ? "bg-black text-white border-black" : "border-gray-200"
              }`}
            >
              <CalendarIcon size={18} className="mb-1" />
              <span className="text-sm">Harian</span>
            </button>
            <button
              onClick={() => updateNotif((p) => ({ ...p, logFrequency: "twice" }))}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 ${
                notif.logFrequency === "twice" ? "bg-black text-white border-black" : "border-gray-200"
              }`}
            >
              <Clock size={18} className="mb-1" />
              <span className="text-sm">Dua Kali Sehari</span>
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span>Waktu Pengingat</span>
            <div className="bg-gray-50 px-3 py-1.5 rounded-lg font-bold text-sm">09:00</div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="flex flex-col justify-between">
            <div>
              <Zap size={18} className="mb-2" />
              <h3 className="text-base font-semibold">Log Cepat</h3>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-gray-500">Widget Beranda</span>
              <Toggle checked={notif.quickLogWidget} onChange={(v) => updateNotif((p) => ({ ...p, quickLogWidget: v }))} />
            </div>
          </Card>
          <Card className="flex flex-col justify-between">
            <div>
              <Bell size={18} className="mb-2" />
              <h3 className="text-base font-semibold">Panel Notifikasi</h3>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-gray-500">Aktif</span>
              <Toggle checked={notif.alertShade} onChange={(v) => updateNotif((p) => ({ ...p, alertShade: v }))} />
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-semibold mb-1">Manajemen Riwayat</h3>
          <p className="text-xs text-gray-500 mb-3">Kelola data yang tercatat</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => toast("Data diekspor sebagai .csv")}
              className="w-full py-3 bg-black text-white rounded-full flex items-center justify-center gap-2 font-medium active:scale-95 hover:scale-[1.02] transition-all duration-300"
            >
              <Share2 size={18} /> Ekspor Data (.CSV)
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full py-3 bg-gray-50 border border-gray-200 text-red-400 rounded-full flex items-center justify-center gap-2 font-medium hover:bg-red-50 transition-colors active:scale-[0.98]"
            >
              <Trash2 size={18} /> Hapus Riwayat Gejala
            </button>
          </div>
        </Card>

        <p className="text-center text-xs text-gray-400 pb-2">Data disimpan dengan aman ke akunmu.</p>
      </main>

      <ConfirmDialog
        open={showClearConfirm}
        icon={Trash2}
        title="Hapus Riwayat Gejala?"
        message="Semua gejala yang tercatat akan dihapus permanen dari riwayatmu."
        confirmLabel="Hapus Riwayat"
        danger
        onConfirm={() => {
          updateLogs(() => ({}));
          setShowClearConfirm(false);
          toast("Riwayat gejala telah dihapus");
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </>
  );
}

/* ---------------------------------------------------------------
   GOAL SETTING
--------------------------------------------------------------- */

function GoalSettingScreen({ pop, toast, goals, updateGoals }) {
  const toggleTag = (t) =>
    updateGoals((p) => ({ ...p, tags: p.tags.includes(t) ? p.tags.filter((x) => x !== t) : [...p.tags, t] }));

  return (
    <>
      <TopBar title="Penetapan Target" onBack={pop} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">Konsumsi Air</h2>
              <p className="text-xs text-gray-500">Jaga tubuh tetap terhidrasi</p>
            </div>
            <Droplet size={20} />
          </div>
          <div className="flex justify-between items-end mt-3">
            <span className="text-3xl font-bold transition-all">{goals.water}</span>
            <span className="text-xs text-gray-500 mb-1">ml / hari</span>
          </div>
          <input
            type="range" min="1000" max="4000" step="50" value={goals.water}
            onChange={(e) => updateGoals((p) => ({ ...p, water: Number(e.target.value) }))}
            className="w-full mt-2 accent-black"
          />
          <div className="flex justify-between text-[10px] text-gray-400 uppercase mt-1">
            <span>1000ml</span>
            <span>4000ml</span>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="flex flex-col justify-between">
            <div>
              <Moon size={18} className="mb-1" />
              <p className="text-xs text-gray-500">Target Tidur</p>
            </div>
            <div className="flex items-baseline gap-1 my-2">
              <span className="text-2xl font-bold">{goals.sleep}</span>
              <span className="text-xs text-gray-500">jam</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => updateGoals((p) => ({ ...p, sleep: Math.max(4, p.sleep - 0.5) }))} className="flex-1 border border-gray-200 rounded-lg py-1.5 active:scale-90 transition-transform hover:bg-gray-50">
                −
              </button>
              <button onClick={() => updateGoals((p) => ({ ...p, sleep: Math.min(12, p.sleep + 0.5) }))} className="flex-1 border border-gray-200 rounded-lg py-1.5 active:scale-90 transition-transform hover:bg-gray-50">
                +
              </button>
            </div>
          </Card>
          <Card className="flex flex-col justify-between">
            <div>
              <Footprints size={18} className="mb-1" />
              <p className="text-xs text-gray-500">Langkah Harian</p>
            </div>
            <div className="text-2xl font-bold my-2">{goals.steps >= 1000 ? `${goals.steps / 1000}rb` : goals.steps}</div>
            <div className="flex gap-2">
              <button onClick={() => updateGoals((p) => ({ ...p, steps: Math.max(1000, p.steps - 1000) }))} className="flex-1 border border-gray-200 rounded-lg py-1.5 active:scale-90 transition-transform hover:bg-gray-50">
                −
              </button>
              <button onClick={() => updateGoals((p) => ({ ...p, steps: Math.min(30000, p.steps + 1000) }))} className="flex-1 border border-gray-200 rounded-lg py-1.5 active:scale-90 transition-transform hover:bg-gray-50">
                +
              </button>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex justify-between items-center">
            <div>
              <Scale size={18} className="mb-1" />
              <p className="text-xs text-gray-500">Target Berat Badan</p>
            </div>
            <p className="text-xs text-gray-500">Awal: {goals.weightStart.toFixed(1)}kg</p>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div>
              <span className="text-2xl font-bold">{goals.weight.toFixed(1)}</span>
              <p className="text-xs text-gray-500">Target (kg)</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => updateGoals((p) => ({ ...p, weight: Math.max(40, p.weight - 0.1) }))} className="w-11 h-11 flex items-center justify-center border border-gray-200 rounded-full active:scale-90 transition-transform hover:bg-gray-50">
                −
              </button>
              <button onClick={() => updateGoals((p) => ({ ...p, weight: Math.min(200, p.weight + 0.1) }))} className="w-11 h-11 flex items-center justify-center border border-gray-200 rounded-full active:scale-90 transition-transform hover:bg-gray-50">
                +
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Fokus Nutrisi</h2>
          <p className="text-xs text-gray-500 mb-3">Pilih tujuan diet utamamu</p>
          <div className="flex flex-wrap gap-2">
            {["Tinggi Protein", "Rendah Gula", "Anti-Inflamasi", "Kaya Serat", "Ramah Keto"].map((t) => (
              <Pill key={t} label={t} active={goals.tags.includes(t)} onClick={() => toggleTag(t)} />
            ))}
          </div>
        </Card>

        <div className="h-32 rounded-2xl border border-gray-200 bg-gradient-to-tr from-gray-100 to-white flex items-center justify-center">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-gray-300">Sinkronisasi Progresif</p>
        </div>

        <button
          onClick={() => toast("Target berhasil disimpan!")}
          className="w-full bg-black text-white py-4 rounded-full font-bold shadow-lg active:scale-95 hover:scale-[1.02] transition-all duration-300"
        >
          Simpan Target
        </button>
      </main>
    </>
  );
}

/* ---------------------------------------------------------------
   NOTIFICATION SETTINGS
--------------------------------------------------------------- */

function NotificationSettingsScreen({ pop, toast, notif, updateNotif }) {
  const [editingTime, setEditingTime] = useState(false);

  const formatTime = (t) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
  };

  return (
    <>
      <TopBar title="Notifikasi" onBack={pop} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Kelola Pemberitahuan</h2>
          <p className="text-sm text-gray-500 mt-1">Sesuaikan cara dan waktu kamu menerima info perjalanan kesehatanmu.</p>
        </div>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <Repeat size={18} />
            </div>
            <h3 className="text-lg font-semibold">Pemberitahuan Siklus</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p>Prediksi Menstruasi</p>
                <p className="text-xs text-gray-500">Beri tahu 3 hari sebelum perkiraan mulai</p>
              </div>
              <Toggle checked={notif.periodPred} onChange={(v) => updateNotif((p) => ({ ...p, periodPred: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p>Mulai Menstruasi</p>
                <p className="text-xs text-gray-500">Peringatan pada tanggal perkiraan mulai</p>
              </div>
              <Toggle checked={notif.periodStart} onChange={(v) => updateNotif((p) => ({ ...p, periodStart: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p>Jendela Ovulasi</p>
                <p className="text-xs text-gray-500">Lacak hari-hari kesuburan tinggi</p>
              </div>
              <Toggle checked={notif.ovulationAlert} onChange={(v) => updateNotif((p) => ({ ...p, ovulationAlert: v }))} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <h3 className="text-lg font-semibold">Pengingat Harian</h3>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p>Pencatatan Gejala</p>
              <p className="text-xs text-gray-500">Jaga data tetap akurat</p>
            </div>
            <Toggle checked={notif.symptomLog} onChange={(v) => updateNotif((p) => ({ ...p, symptomLog: v }))} />
          </div>
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Waktu Pengingat</p>
            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <AlarmClock size={18} className="text-gray-500" />
              {editingTime ? (
                <input
                  type="time"
                  autoFocus
                  value={notif.reminderTime}
                  onChange={(e) => updateNotif((p) => ({ ...p, reminderTime: e.target.value }))}
                  onBlur={() => {
                    setEditingTime(false);
                    toast("Waktu pengingat diperbarui");
                  }}
                  className="bg-transparent font-medium focus:outline-none"
                />
              ) : (
                <span className="font-medium">{formatTime(notif.reminderTime)}</span>
              )}
              <button onClick={() => setEditingTime((v) => !v)} className="ml-auto text-sm font-medium hover:underline">
                {editingTime ? "Selesai" : "Ubah"}
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <BarChart2 size={18} />
            </div>
            <h3 className="text-lg font-semibold">Wawasan Kesehatan</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p>Tren Mingguan</p>
                <p className="text-xs text-gray-500">Ringkasan pola siklusmu</p>
              </div>
              <Toggle checked={notif.weeklyTrends} onChange={(v) => updateNotif((p) => ({ ...p, weeklyTrends: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p>Tips Kesehatan Baru</p>
                <p className="text-xs text-gray-500">Saran kesehatan yang dipersonalisasi</p>
              </div>
              <Toggle checked={notif.healthTips} onChange={(v) => updateNotif((p) => ({ ...p, healthTips: v }))} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <Shield size={18} />
            </div>
            <h3 className="text-lg font-semibold">Notifikasi Sistem</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p>Pembaruan Aplikasi</p>
                <p className="text-xs text-gray-500">Fitur dan perbaikan baru</p>
              </div>
              <Toggle checked={notif.appUpdates} onChange={(v) => updateNotif((p) => ({ ...p, appUpdates: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p>Peringatan Keamanan</p>
                <p className="text-xs text-gray-500">Notifikasi keamanan akun penting</p>
              </div>
              <Toggle checked={true} onChange={() => {}} disabled />
            </div>
          </div>
        </Card>

        <div className="relative overflow-hidden rounded-2xl border border-gray-200 h-44 flex flex-col items-center justify-center text-center p-5 bg-white/60">
          <h4 className="text-lg font-semibold">Butuh lebih fokus?</h4>
          <p className="text-sm text-gray-500 max-w-xs mt-1">Aktifkan "Mode Tenang" untuk membisukan semua notifikasi non-penting saat jam tidurmu.</p>
          <button
            onClick={() => {
              updateNotif((p) => ({ ...p, zenMode: !p.zenMode }));
              toast(notif.zenMode ? "Mode Tenang dimatikan" : "Mode Tenang diaktifkan");
            }}
            className={`mt-4 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
              notif.zenMode ? "bg-gray-200 text-black" : "bg-black text-white"
            }`}
          >
            {notif.zenMode ? "Mode Tenang: Aktif" : "Aktifkan"}
          </button>
        </div>
      </main>
    </>
  );
}

/* ---------------------------------------------------------------
   INFO PAGES — Pusat Bantuan, Ketentuan, Privasi, dsb.
--------------------------------------------------------------- */

const INFO_CONTENT = {
  helpCenter: {
    title: "Pusat Bantuan",
    icon: HelpCircle,
    intro: "Pertanyaan yang sering ditanyakan seputar CycleSync.",
    faqs: [
      { q: "Bagaimana cara mencatat haid?", a: "Buka tab Kalender lalu ketuk \"Tambah Catatan Harian\", atau ketuk kartu Ringkasan di Hari Ini untuk mengedit gejala hari itu." },
      { q: "Kenapa prediksi haid berubah-ubah?", a: "Prediksi dihitung otomatis dari tanggal mulai haid terakhir serta rata-rata panjang siklusmu. Semakin rutin kamu mencatat, semakin akurat prediksinya." },
      { q: "Apakah data saya aman?", a: "Ya. Data kesehatanmu tersimpan di akunmu sendiri dan tidak dibagikan ke siapa pun." },
      { q: "Bagaimana cara mengubah panjang siklus?", a: "Masuk ke Pengaturan → Pelacakan Siklus, lalu geser slider panjang siklus dan lama haid sesuai kondisimu." },
      { q: "Bisakah saya mengekspor data saya?", a: "Bisa. Buka Pengaturan → Ekspor Data untuk mengunduh seluruh riwayat siklus dan catatanmu dalam format file." },
    ],
  },
  terms: {
    title: "Ketentuan Layanan",
    icon: FileText,
    intro: "Berlaku sejak kamu mulai menggunakan CycleSync.",
    faqs: [
      { q: "1. Penggunaan Aplikasi", a: "CycleSync membantumu memantau siklus menstruasi dan kesehatan harian secara mandiri. Aplikasi ini bukan pengganti nasihat medis profesional." },
      { q: "2. Akun Pengguna", a: "Kamu bertanggung jawab menjaga kerahasiaan kata sandi akunmu dan seluruh aktivitas yang terjadi di akun tersebut." },
      { q: "3. Akurasi Prediksi", a: "Prediksi siklus bersifat estimasi berdasarkan data yang kamu masukkan dan tidak menjamin keakuratan 100%." },
      { q: "4. Perubahan Layanan", a: "Fitur dapat diperbarui dari waktu ke waktu untuk meningkatkan pengalaman penggunaan." },
    ],
  },
  privacy: {
    title: "Kebijakan Privasi",
    icon: ShieldCheck,
    intro: "Privasimu adalah prioritas kami.",
    faqs: [
      { q: "Data apa yang disimpan?", a: "Nama, email, serta catatan siklus dan gejala yang kamu masukkan sendiri ke dalam aplikasi." },
      { q: "Di mana data disimpan?", a: "Seluruh data disimpan di akunmu di server dan tidak dikirim ke pihak ketiga mana pun tanpa izinmu." },
      { q: "Apakah data dibagikan ke pihak lain?", a: "Tidak. CycleSync tidak menjual atau membagikan data kesehatanmu kepada pengiklan atau pihak ketiga." },
      { q: "Bagaimana cara menghapus data saya?", a: "Kamu bisa menghapus riwayat kapan saja lewat Pengaturan → Pencatatan Gejala → Hapus Riwayat Gejala, atau Reset Data Siklus." },
    ],
  },
  encryption: {
    title: "Info Enkripsi Data",
    icon: ShieldCheck,
    intro: "Bagaimana CycleSync menjaga data kesehatanmu.",
    faqs: [
      { q: "Apakah data saya terenkripsi?", a: "Data tersimpan secara privat di akunmu dan tidak dapat diakses oleh pengguna CycleSync lain." },
      { q: "Siapa yang bisa melihat catatan saya?", a: "Hanya kamu. Tidak ada tim atau pihak ketiga yang memiliki akses ke catatan gejala maupun siklus pribadimu." },
      { q: "Apa yang terjadi jika saya keluar dari akun?", a: "Data tetap tersimpan aman di akunmu dan akan langsung tersedia kembali begitu kamu masuk ulang, di perangkat mana pun." },
    ],
  },
  contact: {
    title: "Hubungi Kami",
    icon: MessageCircle,
    intro: "Butuh bantuan lebih lanjut? Tim kami siap membantu.",
    faqs: [
      { q: "Email Dukungan", a: "support@cyclesync.app — biasanya kami membalas dalam 1x24 jam pada hari kerja." },
      { q: "Jam Layanan", a: "Senin–Jumat, 09.00–18.00 WIB." },
      { q: "Sosial Media", a: "Ikuti @cyclesync.app untuk tips kesehatan siklus dan pembaruan fitur terbaru." },
    ],
  },
  subscription: {
    title: "Paket Langganan",
    icon: CreditCard,
    intro: "Kamu saat ini menggunakan paket Gratis dengan seluruh fitur inti aktif: pelacakan siklus, log gejala, wawasan, dan pengingat.",
    faqs: [
      { q: "Paket Gratis", a: "Pelacakan siklus tanpa batas, log gejala harian, wawasan dasar, dan pengingat — semuanya tanpa biaya." },
      { q: "Paket Plus (segera hadir)", a: "Akan menghadirkan wawasan kesehatan lanjutan, tema tampilan tambahan, dan cadangan data otomatis." },
    ],
  },
};

function InfoScreen({ pop, params, account, updateAccountInfo, toast }) {
  const key = params?.key ?? "helpCenter";

  if (key === "personalInfo") {
    return <PersonalInfoScreen pop={pop} account={account} updateAccountInfo={updateAccountInfo} toast={toast} />;
  }

  const data = INFO_CONTENT[key] ?? INFO_CONTENT.helpCenter;
  const Icon = data.icon;

  return (
    <>
      <TopBar title={data.title} onBack={pop} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <Card className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <Icon size={20} />
          </div>
          <p className="text-sm text-gray-600">{data.intro}</p>
        </Card>
        <Card className="!p-0 divide-y divide-gray-100">
          {data.faqs.map((f) => (
            <div key={f.q} className="p-4">
              <p className="font-semibold text-sm mb-1">{f.q}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </Card>
      </main>
    </>
  );
}

function PersonalInfoScreen({ pop, account, updateAccountInfo, toast }) {
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return setError("Nama tidak boleh kosong");
    if (!EMAIL_RE.test(email.trim())) return setError("Masukkan email yang valid");
    setError("");
    setSaving(true);
    try {
      await updateAccountInfo({ name: name.trim(), email: email.trim().toLowerCase() });
      toast("Informasi pribadi diperbarui");
    } catch (e) {
      setError(e.message || "Gagal menyimpan, coba lagi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar title="Informasi Pribadi" onBack={pop} />
      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <Card className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Nama Lengkap</p>
            <FieldInput icon={User} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Alamat Email</p>
            <FieldInput icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Alamat email" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </Card>
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-black text-white py-3.5 rounded-full font-bold flex items-center justify-center gap-2 active:scale-95 hover:scale-[1.02] transition-all duration-300 disabled:opacity-60"
        >
          {saving ? <Loader2 size={18} className="animate-spin-slow" /> : <Save size={18} />}
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </main>
    </>
  );
}

/* ---------------------------------------------------------------
   ROOT APP — stack based navigator
--------------------------------------------------------------- */

const FOCUSED_SCREENS = ["dailyDetail", "editSymptoms", "success"];

const DEFAULT_GOALS = { water: 2250, sleep: 8, steps: 10000, weight: 68.0, weightStart: 72.4, tags: ["Tinggi Protein"] };
const DEFAULT_NOTIF = {
  periodReminders: true, dailyReminders: true, healthInsights: false, passcodeLock: false,
  periodPred: true, periodStart: true, ovulationAlert: false, symptomLog: true, reminderTime: "20:00",
  weeklyTrends: true, healthTips: true, appUpdates: false, zenMode: false,
  trackPhysical: true, trackEmotional: true, trackEnergy: false, logFrequency: "daily", quickLogWidget: true, alertShade: false,
};

const CONTRACEPTION_TYPES = [
  { key: "none", label: "Tidak Ada", durationMonths: null },
  { key: "pil", label: "Pil KB", durationMonths: null },
  { key: "iud", label: "IUD", durationMonths: 60 },
  { key: "implan", label: "Implan", durationMonths: 36 },
  { key: "suntik", label: "Suntik KB", durationMonths: 3 },
  { key: "kondom", label: "Kondom", durationMonths: null },
];

const DEFAULT_CONTRACEPTION = {
  type: "none",
  startDate: null,
  pillReminderOn: false,
  pillReminderTime: "20:00",
};

function defaultCycleSettings(today) {
  return {
    lastPeriodStart: toISO(addDays(today, -13)),
    cycleLength: 28,
    periodLength: 5,
    mode: "period",
    showOvulation: true,
    showPregnancy: false,
    periodReminderDays: "2",
    fertileReminder: "morning",
    onboarded: false,
  };
}

function defaultUserRecord(name, email, password, now) {
  return {
    account: { name, email, password },
    profile: { name, email, memberSince: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}` },
    cycleSettings: defaultCycleSettings(now),
    goals: DEFAULT_GOALS,
    notif: DEFAULT_NOTIF,
    contraception: DEFAULT_CONTRACEPTION,
    logs: {},
  };
}

export default function CycleSyncApp() {
  const [tab, setTab] = useState("today");
  const [stack, setStack] = useState([]);
  const [unread, setUnread] = useState(true);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const [now, setNow] = useState(new Date());

  // jam berdetak setiap menit — supaya "hari ini" & fase siklus otomatis berpindah lewat tengah malam
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // ---------- Auth / user data (disimpan permanen di Firebase Realtime Database) ----------
  const [authStatus, setAuthStatus] = useState("checking"); // checking | login | register | ready
  const [authError, setAuthError] = useState("");
  const [prefillEmail, setPrefillEmail] = useState("");

  const [account, setAccount] = useState(null); // { name, email, password }
  const [profile, setProfile] = useState({ name: "Pengguna", email: "", memberSince: "" });
  const [cycleSettings, setCycleSettings] = useState(defaultCycleSettings(new Date()));
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [notif, setNotif] = useState(DEFAULT_NOTIF);
  const [contraception, setContraception] = useState(DEFAULT_CONTRACEPTION);
  const [logs, setLogs] = useState({});
  const [activeCheckin, setActiveCheckin] = useState(null);
  const checkinShownRef = useRef(null);

  const userKeyRef = useRef(null);

  const toast = useCallback((msg, variant) => {
    const id = ++toastIdRef.current;
    const duration = 2600;
    setToasts((prev) => [...prev, { id, message: msg, variant: variant || "default", duration, leaving: false }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 220);
    }, duration);
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 200);
  }, []);

  const loadUserRecord = (key, data) => {
    userKeyRef.current = key;
    setAccount(data.account);
    setProfile(data.profile || { name: data.account.name, email: data.account.email, memberSince: "" });
    setCycleSettings(data.cycleSettings || defaultCycleSettings(new Date()));
    setGoals(data.goals || DEFAULT_GOALS);
    setNotif(data.notif || DEFAULT_NOTIF);
    setContraception(data.contraception || DEFAULT_CONTRACEPTION);
    setLogs(data.logs || {});
  };

  // Percobaan login otomatis berdasarkan email terakhir yang diingat perangkat ini.
  useEffect(() => {
    (async () => {
      const remembered = getRememberedEmail();
      if (!remembered) {
        setAuthStatus("login");
        return;
      }
      try {
        const key = sanitizeEmailKey(remembered);
        const data = await fbGetUser(key);
        if (data && data.account) {
          loadUserRecord(key, data);
          setAuthStatus("ready");
        } else {
          rememberEmail(null);
          setPrefillEmail(remembered);
          setAuthStatus("login");
        }
      } catch (e) {
        // Gagal ambil data (mis. offline) — tetap minta login manual, prefill email terakhir
        setPrefillEmail(remembered);
        setAuthStatus("login");
      }
    })();
  }, []);

  const handleRegister = async ({ name, email, password }) => {
    const key = sanitizeEmailKey(email);
    const existing = await fbGetUser(key).catch(() => null);
    if (existing && existing.account) {
      throw new Error("Email sudah terdaftar. Silakan masuk.");
    }
    const record = defaultUserRecord(name, email, password, now);
    await fbPutUser(key, record);
    rememberEmail(email);
    loadUserRecord(key, record);
    setAuthStatus("ready");
    toast(`Selamat datang, ${name.split(" ")[0]}!`);
  };

  const handleLogin = async ({ email, password }) => {
    const key = sanitizeEmailKey(email);
    const data = await fbGetUser(key);
    if (!data || !data.account) {
      throw new Error("Akun tidak ditemukan. Silakan daftar dulu.");
    }
    if (data.account.password !== password) {
      throw new Error("Email atau kata sandi salah");
    }
    rememberEmail(email);
    loadUserRecord(key, data);
    setAuthStatus("ready");
    toast(`Selamat datang kembali, ${data.account.name.split(" ")[0]}!`);
  };

  const logout = () => {
    rememberEmail(null);
    userKeyRef.current = null;
    setAccount(null);
    setTab("today");
    setStack([]);
    setAuthStatus("login");
    toast("Kamu telah keluar");
  };

  // ---------- Updater generik: update state lokal + sinkron ke Firebase ----------
  function makeFieldUpdater(setState, fieldName) {
    return (updater) => {
      setState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (userKeyRef.current) fbPatchUser(userKeyRef.current, { [fieldName]: next });
        return next;
      });
    };
  }
  const updateProfile = useCallback(makeFieldUpdater(setProfile, "profile"), []);
  const updateCycleSettings = useCallback(makeFieldUpdater(setCycleSettings, "cycleSettings"), []);
  const updateGoals = useCallback(makeFieldUpdater(setGoals, "goals"), []);
  const updateNotif = useCallback(makeFieldUpdater(setNotif, "notif"), []);
  const updateContraception = useCallback(makeFieldUpdater(setContraception, "contraception"), []);
  const updateLogs = useCallback(makeFieldUpdater(setLogs, "logs"), []);

  // Munculkan dialog sapaan/pengingat sesuai jam saat ini, sekali per sesi per blok waktu,
  // dan hanya jika belum dijawab untuk hari ini (dicek dari log Firebase).
  useEffect(() => {
    if (authStatus !== "ready" || !cycleSettings.onboarded) return;
    const block = getHourlyCheckin(now.getHours());
    const todayISO = toISO(now);
    const alreadyAnswered = logs[todayISO]?.checkins?.[block.key];
    if (!alreadyAnswered && checkinShownRef.current !== block.key) {
      checkinShownRef.current = block.key;
      setActiveCheckin(block);
    }
  }, [authStatus, cycleSettings.onboarded, now, logs]);

  const saveCheckin = (replyText) => {
    if (!activeCheckin) return;
    const todayISO = toISO(now);
    updateLogs((prev) => {
      const cur = getLog(prev, todayISO);
      return {
        ...prev,
        [todayISO]: {
          ...cur,
          checkins: { ...cur.checkins, [activeCheckin.key]: { message: activeCheckin.message, reply: replyText, answeredAt: now.toISOString() } },
        },
      };
    });
    setActiveCheckin(null);
    toast(replyText ? "Makasih udah cerita! 💬" : "Dicatat, makasih!");
  };
  const skipCheckin = () => setActiveCheckin(null);

  const updateAccountInfo = async ({ name, email }) => {
    // Mengubah nama/email akun: pindahkan data ke kunci baru bila email berubah.
    const oldKey = userKeyRef.current;
    const newKey = sanitizeEmailKey(email);
    const nextAccount = { ...account, name, email };
    const nextProfile = { ...profile, name, email };
    if (newKey !== oldKey) {
      const clash = await fbGetUser(newKey).catch(() => null);
      if (clash && clash.account) throw new Error("Email sudah dipakai akun lain");
      const fullRecord = { account: nextAccount, profile: nextProfile, cycleSettings, goals, notif, logs };
      await fbPutUser(newKey, fullRecord);
      userKeyRef.current = newKey;
      rememberEmail(email);
    } else {
      await fbPatchUser(oldKey, { account: nextAccount, profile: nextProfile });
    }
    setAccount(nextAccount);
    setProfile(nextProfile);
  };

  const handleOnboardingFinish = async ({ lastPeriodStart, cycleLength, periodLength }) => {
    updateCycleSettings((p) => ({ ...p, lastPeriodStart, cycleLength, periodLength, onboarded: true }));
    toast("Siklusmu berhasil disiapkan");
  };

  const push = (screen, params = {}) => setStack((s) => [...s, { screen, params }]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const goHome = () => {
    setTab("today");
    setStack([]);
  };
  const goDetail = (dateISO) => setStack([{ screen: "dailyDetail", params: { dateISO } }]);
  const navigate = (t) => {
    setTab(t);
    setStack([]);
  };
  const onBell = () => {
    setUnread(false);
    push("notificationSettings");
  };

  const current = stack.length ? stack[stack.length - 1] : { screen: tab, params: {} };
  const showNav = authStatus === "ready" && cycleSettings.onboarded && !FOCUSED_SCREENS.includes(current.screen);

  let content = null;
  if (authStatus === "ready") {
    switch (current.screen) {
      case "today":
        content = <TodayScreen push={push} onBell={onBell} unread={unread} toast={toast} now={now} profile={profile} cycleSettings={cycleSettings} logs={logs} updateLogs={updateLogs} contraception={contraception} />;
        break;
      case "insights":
        content = <InsightsScreen onBell={onBell} unread={unread} now={now} cycleSettings={cycleSettings} logs={logs} />;
        break;
      case "calendar":
        content = <CalendarScreen push={push} onBell={onBell} unread={unread} toast={toast} now={now} cycleSettings={cycleSettings} logs={logs} />;
        break;
      case "settings":
        content = (
          <SettingsScreen
            push={push} onBell={onBell} unread={unread} toast={toast} profile={profile} notif={notif}
            updateNotif={updateNotif} cycleSettings={cycleSettings} goals={goals} logs={logs} now={now}
            onLogout={logout}
          />
        );
        break;
      case "contraception":
        content = <ContraceptionScreen pop={pop} toast={toast} contraception={contraception} updateContraception={updateContraception} now={now} />;
        break;
      case "dailyDetail":
        content = <DailyDetailScreen pop={pop} push={push} params={current.params} now={now} cycleSettings={cycleSettings} logs={logs} goals={goals} />;
        break;
      case "editSymptoms":
        content = <EditSymptomsScreen pop={pop} push={push} params={current.params} toast={toast} logs={logs} updateLogs={updateLogs} now={now} />;
        break;
      case "success":
        content = <SuccessScreen goHome={goHome} goDetail={goDetail} params={current.params} />;
        break;
      case "profile":
        content = <ProfileScreen pop={pop} push={push} toast={toast} profile={profile} updateProfile={updateProfile} logs={logs} now={now} cycleSettings={cycleSettings} onLogout={logout} />;
        break;
      case "infoPage":
        content = <InfoScreen pop={pop} params={current.params} account={account} updateAccountInfo={updateAccountInfo} toast={toast} />;
        break;
      case "cycleTracking":
        content = <CycleTrackingScreen pop={pop} toast={toast} cycleSettings={cycleSettings} updateCycleSettings={updateCycleSettings} now={now} />;
        break;
      case "symptomSettings":
        content = <SymptomSettingsScreen pop={pop} toast={toast} notif={notif} updateNotif={updateNotif} updateLogs={updateLogs} />;
        break;
      case "goalSetting":
        content = <GoalSettingScreen pop={pop} toast={toast} goals={goals} updateGoals={updateGoals} />;
        break;
      case "notificationSettings":
        content = <NotificationSettingsScreen pop={pop} toast={toast} notif={notif} updateNotif={updateNotif} />;
        break;
      default:
        content = <TodayScreen push={push} onBell={onBell} unread={unread} toast={toast} now={now} profile={profile} cycleSettings={cycleSettings} logs={logs} updateLogs={updateLogs} contraception={contraception} />;
    }
  }

  let authGateContent = null;
  if (authStatus === "register") {
    authGateContent = <RegisterScreen onRegister={handleRegister} goLogin={() => setAuthStatus("login")} prefillEmail={prefillEmail} />;
  } else if (authStatus === "login") {
    authGateContent = <LoginScreen onLogin={handleLogin} goRegister={() => setAuthStatus("register")} prefillEmail={prefillEmail} />;
  } else if (authStatus === "ready" && !cycleSettings.onboarded) {
    authGateContent = <OnboardingScreen name={profile.name} now={now} onFinish={handleOnboardingFinish} />;
  }

  return (
    <div
      className="w-full bg-gray-50 flex flex-col overflow-hidden"
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      <GlobalStyles />
      {authStatus === "checking" ? (
        <LoadingScreen label="Memeriksa sesi akunmu..." />
      ) : authGateContent ? (
        <div key={authStatus === "ready" ? "onboarding" : authStatus} className="flex-1 flex flex-col overflow-hidden animate-screenFade">
          {authGateContent}
        </div>
      ) : (
        <>
          <div key={`${current.screen}-${JSON.stringify(current.params)}`} className="flex-1 flex flex-col overflow-hidden animate-screenFade">
            {content}
          </div>
          {showNav && <BottomNav active={tab} onNavigate={navigate} />}
        </>
      )}
      <Toast toasts={toasts} onDismiss={dismissToast} />
      <CheckinDialog open={!!activeCheckin} checkin={activeCheckin} onSave={saveCheckin} onSkip={skipCheckin} />
    </div>
  );
}
