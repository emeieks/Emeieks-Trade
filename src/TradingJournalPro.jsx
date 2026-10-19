import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  LayoutGrid, NotebookPen, BarChart3,
  Plus, X, Upload, Search, Download, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, Filter, ArrowUpRight, ArrowDownRight,
  Trash2, Edit3, Trophy, Clock, Save, Info, ChevronDown,
  Sparkles, CheckCircle2, AlertCircle, Brain, Calculator,
  Settings,
  BookOpen, Newspaper, RefreshCw, MoreHorizontal, CalendarDays,
  Target, Zap, ThumbsUp, ThumbsDown, Share2, Star, AlertTriangle, Check, Clipboard, FolderOpen, LineChart, Timer, SlidersHorizontal, ArrowLeftRight, Lightbulb, Coins, CircleDot,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell,
} from "recharts";

/* ============================================================================
   MOCK DATA & UTILITIES
   ============================================================================ */

const PAIRS = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "GBPJPY"];
// Format de prix par actif (chiffres avant la virgule, décimales) — prix relevés mi-octobre 2026
const PRICE_FMT = {
  EURUSD: [1, 4], GBPUSD: [1, 4], AUDUSD: [0, 4], NZDUSD: [0, 4], USDCAD: [1, 4], USDCHF: [0, 4],
  EURGBP: [0, 4], EURCHF: [0, 4], EURAUD: [1, 4], EURCAD: [1, 4], EURNZD: [1, 4],
  GBPCHF: [1, 4], GBPAUD: [1, 4], GBPCAD: [1, 4], GBPNZD: [1, 4],
  AUDCAD: [0, 4], AUDCHF: [0, 4], AUDNZD: [1, 4], NZDCAD: [0, 4], NZDCHF: [0, 4], CADCHF: [0, 4],
  USDJPY: [3, 2], EURJPY: [3, 2], GBPJPY: [3, 2], AUDJPY: [3, 2], NZDJPY: [2, 2], CADJPY: [3, 2], CHFJPY: [3, 2],
  XAUUSD: [4, 2], XAGUSD: [2, 3], USOIL: [2, 2], BTCUSD: [5, 2], ETHUSD: [4, 2], NAS100: [5, 2], SPX500: [4, 2],
};
const ALL_INSTRUMENTS = Object.keys(PRICE_FMT);
const PAIR_ALIASES = { NQ: "NAS100", NASDAQ: "NAS100", ES: "SPX500", SP500: "SPX500", GOLD: "XAUUSD", OR: "XAUUSD", SILVER: "XAGUSD", ARGENT: "XAGUSD", OIL: "USOIL", CRUDE: "USOIL", WTI: "USOIL", PETROLE: "USOIL", BTC: "BTCUSD", BITCOIN: "BTCUSD", ETH: "ETHUSD", ETHEREUM: "ETHUSD" };
const PAIR_LABEL = { NAS100: "NQ", SPX500: "ES", USOIL: "Crude oil", XAUUSD: "Gold", XAGUSD: "Silver", BTCUSD: "BTC", ETHUSD: "ETH" };
// Tape seulement les chiffres : la virgule se place toute seule (EURUSD 11229 → 1,1229)
function autoPrice(raw, pair) {
  const t = String(raw).replace(",", ".").replace(/[^0-9.]/g, "");
  if (t.includes(".")) return t;
  const f = PRICE_FMT[pair]; if (!f || !t) return t;
  const [n] = f;
  if (n === 0) return "0." + t.replace(/^0+/, "");
  return t.length > n ? t.slice(0, n) + "." + t.slice(n) : t;
}

const DEFAULT_POSITIVES = [
  "SL bien placé",
  "Bon TP",
  "Entrée précise",
  "Respect du plan",
  "Bonne lecture du DXY",
  "Setup propre",
  "Patience avant entrée",
  "Bonne gestion du risque",
  "MSS confirmé",
  "Sweep de liquidité identifié",
  "Biais HTF respecté",
  "Entrée du bon côté (premium/discount)",
  "Displacement confirmé",
  "SMT avec le DXY",
  "Draw on liquidity clair",
];
const DEFAULT_ERRORS = [
  "Entrer trop tôt","Entrer trop tard","TP trop tôt","SL trop serré","SL trop large",
  "Pas de confirmation MSS","Revenge trading","Hors killzone","Pas de sweep de liquidité",
  "FOMO","Sur-trader","Ignorer le DXY",
  "Contre le biais HTF","Long en premium / short en discount","Pas de displacement",
  "Pas de draw on liquidity clair","Entrée avant la killzone",
];
const ICT_MODELS = ["Silver Bullet", "2022 Model", "Turtle Soup", "Judas Swing", "Power of 3 (AMD)", "Unicorn", "OTE", "Breaker", "Autre"];
const LIQ_POINTS = ["BSL", "SSL", "PDH", "PDL", "Asia High", "Asia Low", "London High", "London Low", "EQH", "EQL", "PWH", "PWL"];

const TAG_CATALOG = [
  { name: "OB+", category: "setup" },
  { name: "OB-", category: "setup" },
  { name: "Breaker Block", category: "setup" },
  { name: "Mitigation Block", category: "setup" },
  { name: "Rejection Block", category: "setup" },
  { name: "BISI", category: "setup" },   // FVG haussier
  { name: "SIBI", category: "setup" },   // FVG baissier
  { name: "Inverse FVG", category: "setup" },
  { name: "Liquidity Void", category: "setup" },
  { name: "Balanced Price Range", category: "setup" },
  { name: "Old High/Low", category: "setup" },
  { name: "Liquidity Sweep", category: "setup" },
  { name: "Volume Imbalance", category: "setup" },
  { name: "Propulsion Block", category: "setup" },
  { name: "A+ Setup", category: "setup" },
  { name: "London Session", category: "session" },
  { name: "New York Session", category: "session" },
  { name: "FOMO", category: "mistake" },
  { name: "Revenge Trade", category: "mistake" },
];







// ── Heure de New York (gère l'heure d'été / d'hiver automatiquement) ──
const NY_FMT = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour12: false, weekday: "short", hour: "2-digit", minute: "2-digit" });
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const localYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function nyNow(date) {
  const parts = NY_FMT.formatToParts(date);
  const g = (t) => parts.find((x) => x.type === t)?.value;
  const h = Number(g("hour")) % 24;
  return { dow: WD.indexOf(g("weekday")), min: h * 60 + Number(g("minute")) };
}
// Décalage NY → Thaïlande (en minutes) pour une date donnée
function nyToThOffset(date) {
  const ny = nyNow(date).min;
  const utc = date.getUTCHours() * 60 + date.getUTCMinutes();
  let off = ny - utc; if (off > 720) off -= 1440; if (off < -720) off += 1440;
  return 420 - off;
}
const fmtHM = (m) => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };

// Killzones ICT, définies en heure de New York
const KILLZONES = [
  { name: "Asia", short: "ASIA", s: 20 * 60, e: 24 * 60, color: "#E67E22", emoji: "" },
  { name: "London", short: "LONDON", s: 2 * 60, e: 5 * 60, color: "#4A7FBF", emoji: "" },
  { name: "New York Matin", short: "NY·AM", s: 8 * 60 + 30, e: 11 * 60, color: "#C0392B", emoji: "" },
  { name: "New York Après-midi", short: "NY·PM", s: 13 * 60 + 30, e: 16 * 60, color: "#E74C3C", emoji: "" },
];
// Silver Bullet ICT (heure de New York)
const SILVER_BULLETS = [
  { name: "SB London", s: 3 * 60, e: 4 * 60 },
  { name: "SB AM", s: 10 * 60, e: 11 * 60 },
  { name: "SB PM", s: 14 * 60, e: 15 * 60 },
];
const inNyRange = (min, z) => min >= z.s && min < z.e;

function killzoneAt(isoDate) {
  const { min } = nyNow(new Date(isoDate));
  return KILLZONES.find((z) => inNyRange(min, z)) || null;
}
function silverBulletAt(isoDate) {
  const { min } = nyNow(new Date(isoDate));
  return SILVER_BULLETS.find((z) => inNyRange(min, z)) || null;
}
// Session « large » utilisée par les tags existants
function getSession(isoDate) {
  const kz = killzoneAt(isoDate);
  if (!kz) return "Hors session";
  if (kz.name === "Asia") return "Asia Session";
  if (kz.name === "London") return "London Session";
  return "New York Session";
}
// Killzone détaillée (NY AM / NY PM séparés)
function killzoneLabel(isoDate) {
  const kz = killzoneAt(isoDate);
  return kz ? (kz.name === "New York Matin" ? "NY AM" : kz.name === "New York Après-midi" ? "NY PM" : kz.name) : "Hors killzone";
}

function KillzoneBanner() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const ny = nyNow(now);
  const off = nyToThOffset(now);
  const th = (m) => fmtHM(m + off);
  const minsUntil = (kz) => (kz.s - ny.min + 1440) % 1440;
  const fmt = (m) => m >= 60 ? `${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}` : `${m}min`;
  // Forex : fermé du vendredi 17h au dimanche 17h (heure de New York)
  const isWeekend = ny.dow === 6 || (ny.dow === 5 && ny.min >= 17 * 60) || (ny.dow === 0 && ny.min < 17 * 60);
  const active = !isWeekend && KILLZONES.find((z) => inNyRange(ny.min, z));
  const next = !isWeekend && !active && [...KILLZONES].sort((a,b) => minsUntil(a) - minsUntil(b))[0];
  const minsLeft = active ? active.e - ny.min : null;
  const sb = !isWeekend && SILVER_BULLETS.find((z) => inNyRange(ny.min, z));
  const isInZone = (kz) => inNyRange(ny.min, kz);
  if (active) active.end = th(active.e);
  if (next) next.start = th(next.s);

  // Vérif news économiques - dans useMemo pour éviter re-renders
  const newsAlert = useMemo(() => {
    const tomorrowStr = localYMD(new Date(now.getTime() + 86400000));
    const todayStr = localYMD(now);
    try {
      const saved = JSON.parse(localStorage.getItem("previsions_news") || "[]");
      const today = saved.find(n => n.date === todayStr);
      const tomorrow = saved.find(n => n.date === tomorrowStr);
      if (today) return { news: today, isToday: true };
      if (tomorrow) return { news: tomorrow, isToday: false };
    } catch {}
    return null;
  }, [now]);

  return (
    <>
      {/* Banderole news économique */}
      {newsAlert && (
        <div style={{
          background: newsAlert.isToday ? C.red : "rgba(220,38,38,0.85)",
          padding: "5px 18px",
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: `1px solid ${C.red}`,
        }}>
          <AlertTriangle size={14} color="#fff" />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff" }}>
            {newsAlert.isToday ? "AUJOURD'HUI" : "DEMAIN"} — {newsAlert.news.type} : {newsAlert.news.label}
          </span>
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", marginLeft: "auto" }}>
            {newsAlert.isToday ? "News aujourd'hui — trader avec précaution" : "News demain — prépare-toi"}
          </span>
        </div>
      )}

      {/* Ticker killzone */}
      <div style={{
        background: C.sidebar,
        borderBottom: `1px solid ${C.sidebarBorder}`,
        padding: "0 18px",
        height: 32,
        display: "flex", alignItems: "center", gap: 0,
        overflow: "hidden",
      }}>
        <div style={{ position: "relative", width: 18, height: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
          {active && <div style={{ position: "absolute", width: 12, height: 12, borderRadius: "50%", background: active.color, opacity: 0.2 }} />}
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? active.color : C.textMuted, flexShrink: 0 }} />
        </div>

        {active ? (
          <>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: active.color, letterSpacing: 0.2, marginRight: 6 }}>{active.emoji} {active.name.toUpperCase()}</span>
            <span style={{ fontSize: 11, color: C.sidebarTextDim, marginRight: 10 }}>jusqu'à {active.end}</span>
            <span style={{ fontSize: 10, color: active.color, background: `${active.color}20`, padding: "1px 6px", borderRadius: 3, fontWeight: 700, letterSpacing: 0.5, marginRight: 12 }}>LIVE</span>
            <span className="tnum" style={{ fontSize: 10.5, color: C.sidebarTextDim }}>encore {fmt(minsLeft)}</span>
            {sb && <span style={{ fontSize: 10, color: "#E5E7EB", background: "rgba(255,255,255,0.1)", padding: "1px 6px", borderRadius: 3, fontWeight: 700, marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 3 }}><Zap size={10} /> {sb.name}</span>}
          </>
        ) : next ? (
          <>
            <span style={{ fontSize: 11, color: C.sidebarTextDim, marginRight: 6 }}>Hors killzone</span>
            <span style={{ fontSize: 11, color: C.sidebarTextDim, marginRight: 6 }}>·</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.sidebarText, marginRight: 5 }}>{next.emoji} {next.name}</span>
            <span style={{ fontSize: 11, color: C.sidebarTextDim, marginRight: 5 }}>à {next.start}</span>
            <span className="tnum" style={{ fontSize: 10.5, color: C.sidebarTextDim, background: "rgba(255,255,255,0.06)", padding: "1px 7px", borderRadius: 3 }}>dans {fmt(minsUntil(next))}</span>
          </>
        ) : isWeekend ? (
          <span style={{ fontSize: 11, color: C.sidebarTextDim }}>Marché fermé — Weekend</span>
        ) : null}

      </div>
    </>
  );
}


function fmtUsdSigned(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-$${abs}` : `+$${abs}`;
}
function fmtUsd(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtR(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}R`;
}
function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}
function fmtDate(iso, opts = {}) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: opts.year ? "numeric" : undefined });
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) + " · " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

/* ============================================================================
   SMART TRADE CAPTURE — extraction vision d'un screenshot TradingView
   ============================================================================ */

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1];
      resolve({ base64, mediaType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const EXTRACTION_PROMPT = `Tu analyses un screenshot de plateforme de trading (probablement TradingView). Extrais les informations visibles sur le graphique pour pré-remplir un journal de trading.

Cherche en particulier :
- Le symbole/paire tradé (ex: EURUSD, XAUUSD, BTCUSD) — souvent en haut à gauche du graphique
- Le prix d'entrée (niveau d'entrée marqué sur le graphique, ou ligne d'ordre)
- Le stop loss (ligne rouge ou niveau SL marqué)
- Le take profit (ligne verte ou niveau TP marqué)
- La direction du trade : "long" si c'est un achat (flèche/zone verte vers le haut, SL en dessous de l'entrée), "short" si c'est une vente (SL au-dessus de l'entrée)
- Le ratio risk/reward si affiché (TradingView l'affiche souvent automatiquement avec l'outil Long/Short Position, ex "1:2.5")
- Le timeframe si visible (ex: "15m", "1H", "4H", "1D")
- La date et l'heure si visibles sur l'axe du graphique ou en watermark

Pour CHAQUE champ (pair, direction, entryPrice, stopLoss, takeProfit), évalue ta propre confiance individuellement selon ce que tu vois réellement sur l'image — un champ peut être très clair (high) pendant qu'un autre est ambigu ou absent (low). Ne mets jamais "high" sur un champ que tu n'as pas pu lire distinctement.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte avant ou après, au format exact suivant :
{
  "pair": "EURUSD ou null si non détecté",
  "pairConfidence": "high, medium, low, ou none",
  "direction": "long ou short ou null",
  "directionConfidence": "high, medium, low, ou none",
  "entryPrice": nombre ou null,
  "entryConfidence": "high, medium, low, ou none",
  "stopLoss": nombre ou null,
  "stopLossConfidence": "high, medium, low, ou none",
  "takeProfit": nombre ou null,
  "takeProfitConfidence": "high, medium, low, ou none",
  "riskReward": "ex: 1:2.5 ou null",
  "timeframe": "ex: 1H ou null",
  "dateTimeVisible": "texte tel que visible sur l'image ou null",
  "confidence": "high, medium, ou low selon ta certitude globale sur l'ensemble"
}

Si une information n'est pas visible ou pas claire sur l'image, mets null pour la valeur et "none" pour sa confiance, plutôt que de deviner. Ne fournis aucune explication, uniquement le JSON.`;

async function extractTradeFromScreenshot(file) {
  const { base64, mediaType } = await fileToBase64(file);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Extraction échouée (${response.status})`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Aucune réponse de l'analyse.");

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Réponse d'extraction non interprétable.");
  }
  return parsed;
}

/* ============================================================================
   AI COACH — analyse à la demande des trades et réflexions
   ============================================================================ */

function buildCoachPrompt(trades) {
  const closed = trades.filter((t) => t.status !== "open");
  const summary = closed.map((t) => ({
    pair: t.pair,
    setup: t.setup,
    session: getSession(t.entryTime),
    direction: t.direction,
    resultUsd: t.resultUsd,
    resultR: t.resultR,
    win: t.resultR > 0,
    tags: t.tags,
    confidenceBefore: t.confidenceLevel || null,
    qualityAfter: t.retroRating || null,
    verdict: t.verdict || null,
    ote: t.oteFib || null,
    killzone: killzoneLabel(t.entryTime),
    ictModel: t.ictModel || null,
    htfBias: t.htfBias || null,
    pdZone: t.pdZone || null,
    sweptLiquidity: t.sweptLiquidity || null,
    drawOnLiquidity: t.drawOnLiquidity || null,
    displacement: !!t.displacement,
    mistakes: t.mistakes || [],
    rating: t.reflection?.tradeRating ?? null,
    analysisQuality: t.reflection?.analysisQuality ?? null,
    confidence: t.reflection?.confidence ?? null,
    discipline: t.reflection?.discipline ?? null,
    emotionalLevel: t.reflection?.emotionalLevel ?? null,
    setupEval: t.setupEval ?? null,
  }));

  return `Tu es un coach de trading qui analyse l'historique de trades d'un trader forex pratiquant la méthodologie ICT (PD Arrays : Order Block, FVG, Liquidity Sweep, etc.).

Voici ${summary.length} trades clôturés au format JSON, avec pour chacun : la paire, le setup, la session, le résultat en $ et en R, si gagnant, les tags, et des auto-évaluations sur 10 (note du trade, qualité d'analyse, confiance, discipline, niveau émotionnel) ainsi que l'évaluation du setup (entrée, gestion du risque, timing, patience, exécution, tous sur 10) :

${JSON.stringify(summary)}

Analyse ces données et produis entre 4 et 7 observations concrètes et chiffrées, dans le style suivant (ce sont des EXEMPLES de format, pas des résultats à recopier) :
- "Tes trades notés 8/10 ou plus génèrent X% de ton profit total."
- "Tes trades pris avec un niveau émotionnel supérieur à 7/10 sont à Y% négatifs."
- "Tu performes mieux sur les trades [session] avec un winrate de Z%."
- "Tes setups [nom] ont un winrate de W%."

Règles strictes :
- Base-toi UNIQUEMENT sur les données fournies, calcule les vrais chiffres à partir du JSON, n'invente rien.
- Si un pattern n'est pas assez significatif (moins de 5 trades dans une catégorie), ne le mentionne pas ou précise la faible taille d'échantillon.
- Reste concret et actionnable, pas de généralités.
- Réponds en français, dans un style direct de coach, pas de jargon inutile.
- Format : une liste à puces, une observation par ligne, pas de préambule ni de conclusion.`;
}

async function getCoachInsights(trades) {
  const prompt = buildCoachPrompt(trades);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Analyse échouée (${response.status})`);
  const data = await response.json();
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Aucune réponse du coach.");
  return textBlock.text;
}

async function getSingleTradeAnalysis(trade) {
  const payload = {
    pair: trade.pair, direction: trade.direction, setup: trade.setup,
    session: getSession(trade.entryTime), entryPrice: trade.entryPrice,
    stopLoss: trade.stopLoss, takeProfit: trade.takeProfit, exitPrice: trade.exitPrice,
    resultUsd: trade.resultUsd, resultR: trade.resultR, status: trade.status,
    tags: trade.tags, notes: trade.notes, reflection: trade.reflection, setupEval: trade.setupEval,
  };

  const prompt = `Tu es un coach de trading. Voici un trade unique d'un trader forex ICT (PD Arrays), avec ses données, ses tags, ses notes et ses auto-évaluations psychologiques :

${JSON.stringify(payload)}

Analyse ce trade spécifiquement et donne 3 à 4 observations courtes et concrètes : ce qui a été bien fait, ce qui pourrait être amélioré, et une lecture de la cohérence entre l'auto-évaluation psychologique et le résultat réel (ex: confiance élevée mais résultat négatif, ou discipline faible corrélée à une erreur taguée).

Règles :
- Base-toi uniquement sur les données fournies, n'invente rien.
- Reste concret, pas de généralités creuses.
- Réponds en français, ton direct de coach.
- Format : liste à puces courte, pas de préambule ni de conclusion.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Analyse échouée (${response.status})`);
  const data = await response.json();
  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock) throw new Error("Aucune réponse de l'analyse.");
  return textBlock.text;
}


/* ============================================================================
   DESIGN TOKENS — SaaS premium, inspiré TradeZella
   ============================================================================ */

const THEMES = {
  light: {
    bg: "#F4F6FA", sidebar: "#1A2138",
    sidebarText: "#E8EAF4", sidebarTextDim: "#8891B0",
    sidebarBorder: "rgba(255,255,255,0.08)", sidebarHover: "rgba(255,255,255,0.06)",
    card: "#FFFFFF", cardHover: "#F8F9FC",
    border: "#DDE1EA", borderLight: "#C8CEDC",
    inputBg: "#FFFFFF",
    focusBorder: "#6B5CE7", focusShadow: "0 0 0 3px rgba(107,92,231,0.12)",
    text: "#111318", textSecondary: "#4A5068", textMuted: "#8A91A8",
    teal: "#0EA882", tealDim: "rgba(14,168,130,0.10)",
    red: "#D94040", redDim: "rgba(217,64,64,0.10)",
    purple: "#6B5CE7", purpleDim: "rgba(107,92,231,0.10)", purpleBright: "#5B4CD8",
    amber: "#D97706", amberDim: "rgba(217,119,6,0.10)",
  },
  dark: {
    bg: "#0F1117", sidebar: "#161A25",
    sidebarText: "#FFFFFF", sidebarTextDim: "#8891B0",
    sidebarBorder: "rgba(255,255,255,0.08)", sidebarHover: "rgba(255,255,255,0.06)",
    card: "#1B2130", cardHover: "#1F2636",
    border: "#313A50", borderLight: "#46516B",
    inputBg: "#1B2233",
    focusBorder: "#6D5DFB", focusShadow: "0 0 0 3px rgba(109,93,251,0.14)",
    text: "#FFFFFF", textSecondary: "#C8D0E4", textMuted: "#6B7388",
    teal: "#2DD4BF", tealDim: "rgba(45,212,191,0.12)",
    red: "#FF5370", redDim: "rgba(255,83,112,0.12)",
    purple: "#7C5CFC", purpleDim: "rgba(124,92,252,0.14)", purpleBright: "#9580FF",
    amber: "#F59E0B", amberDim: "rgba(245,158,11,0.12)",
  },
};

// C est initialisé avec le thème clair par défaut — mis à jour dynamiquement via applyTheme()
let C = { ...THEMES.dark };
// Garantir que inputBg, focusBorder, focusShadow existent toujours
if (!C.inputBg) C.inputBg = C.card;
if (!C.focusBorder) C.focusBorder = C.purple;
if (!C.focusShadow) C.focusShadow = "0 0 0 3px rgba(124,92,252,0.14)";
function applyTheme(isDark) {
  Object.assign(C, isDark ? THEMES.dark : THEMES.light);
  if (!C.inputBg) C.inputBg = C.card;
  if (!C.focusBorder) C.focusBorder = C.purple;
  if (!C.focusShadow) C.focusShadow = "0 0 0 3px rgba(124,92,252,0.14)";
}


const FONT = {
  base: "'Inter', -apple-system, sans-serif",
};

function GlobalStyle() {
  // Nécessaire pour que env(safe-area-inset-*) fonctionne sur Safari iOS
  React.useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta && !meta.content.includes("viewport-fit")) {
      meta.content = meta.content + ", viewport-fit=cover";
    }
  }, []);
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; max-width: 100%; overflow-x: hidden; }
      #root { min-height: 100vh; }
      body { color: ${C.text}; background: ${C.bg}; }
      /* Nav mobile : position fixed collée en bas */
      nav.mobile-nav-fixed {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 9999 !important;
      }
      @supports (padding: env(safe-area-inset-top)) {
        .topbar-safe { padding-top: env(safe-area-inset-top) !important; }
      }
      :root { --sat: env(safe-area-inset-top, 0px); --sab: env(safe-area-inset-bottom, 0px); }
      img { max-width: 100%; }
      ::-webkit-scrollbar { width: 7px; height: 7px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: ${C.borderLight}; }
      input::placeholder, textarea::placeholder { color: ${C.textMuted}; }
      input[type="datetime-local"],
      input[type="date"],
      input[type="time"] {
        max-width: 100% !important;
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        display: block !important;
        position: static !important;
        transform: none !important;
      }
      input[type="datetime-local"]::-webkit-date-and-time-value {
        text-align: left;
        min-width: 0;
      }
      input, textarea, select { max-width: 100%; box-sizing: border-box; }
      input, textarea, select {
        color: ${C.text} !important;
        background: ${C.inputBg || C.card} !important;
        -webkit-text-fill-color: ${C.text} !important;
        border: 1px solid ${C.border} !important;
        border-radius: 14px !important;
        outline: none !important;
        transition: border-color 0.15s, box-shadow 0.15s !important;
      }
      input:focus, textarea:focus, select:focus {
        border-color: ${C.focusBorder || C.purple} !important;
        box-shadow: ${C.focusShadow || "0 0 0 3px rgba(124,92,252,0.14)"} !important;
      }
      input:hover:not(:focus), textarea:hover:not(:focus), select:hover:not(:focus) {
        border-color: ${C.borderLight} !important;
      }
      * { box-sizing: border-box; }
      option { color: ${C.text}; background: ${C.inputBg}; }
      input::-webkit-input-placeholder { color: ${C.textMuted} !important; -webkit-text-fill-color: ${C.textMuted} !important; }
      input, textarea, select, button { font-family: ${FONT.base}; }
      button:focus-visible { outline: 2px solid ${C.purple}; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) {
        * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
      }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .spin-slow { animation: spinSlow 1.6s linear infinite; }
      .fade-in { animation: fadeIn .18s ease-out; }
      .row-hover { transition: background .12s ease; }
      .row-hover:hover { background: ${C.cardHover}; }
      .card-int { transition: border-color .15s ease, box-shadow .15s ease; }
      .card-int:hover { border-color: ${C.borderLight}; }
      .nav-btn { transition: background .12s ease, color .12s ease; }
      .icon-btn { transition: background .12s ease, color .12s ease, border-color .12s ease; cursor: pointer; }
      .tnum { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
      /* Applique tabular-nums à toutes les valeurs $ et R */
      [data-num] { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
      ::selection { background: ${C.purpleDim}; color: ${C.purpleBright}; }

      /* ============================================================
         BREAKPOINTS — 3 paliers réels, pas juste mobile/desktop
         Mobile  : <= 600px   (iPhone SE 375, iPhone 15/15+/ProMax 393-430)
         Tablette: 601-1024px (iPad portrait 768, iPad paysage ~1024)
         Desktop : > 1024px   (1440p, 1920p)
         ============================================================ */
      @media (max-width: 600px) { .desktop-only { display: none !important; } }
      @media (min-width: 601px) { .mobile-only { display: none !important; } }
      @media (min-width: 601px) and (max-width: 1024px) { .tablet-hide { display: none !important; } }

      /* ---- Responsive grid utilities : remplacent les grids inline fixes ---- */
      .grid-kpi-8 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .grid-kpi-7 { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
      .grid-kpi-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
      .grid-4 { display: grid; grid-template-columns: 0.8fr 1fr 1fr 1fr; gap: 10px; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .grid-rating-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
      @media (max-width: 1280px) {
        .grid-kpi-8 { grid-template-columns: repeat(4, 1fr); }
        .grid-kpi-7 { grid-template-columns: repeat(4, 1fr); }
        .grid-kpi-4 { grid-template-columns: repeat(4, 1fr); }
      }
      @media (max-width: 1024px) {
        .grid-kpi-8 { grid-template-columns: repeat(4, 1fr); }
        .grid-kpi-7 { grid-template-columns: repeat(3, 1fr); }
        .grid-kpi-4 { grid-template-columns: repeat(2, 1fr); }
        .grid-4 { grid-template-columns: 1fr 1fr; }
      }
      @media (max-width: 600px) {
        .grid-kpi-8 { grid-template-columns: repeat(2, 1fr); }
        .grid-kpi-7 { grid-template-columns: repeat(2, 1fr); }
        .grid-kpi-4 { grid-template-columns: repeat(2, 1fr); }
        .grid-5 { grid-template-columns: repeat(2, 1fr); }
        .grid-4 { grid-template-columns: 1fr 1fr; }
        .grid-2 { grid-template-columns: 1fr; }
        .grid-rating-5 { grid-template-columns: repeat(3, 1fr); gap: 6px; }
      }
      @media (min-width: 601px) and (max-width: 760px) {
        .grid-5 { grid-template-columns: repeat(3, 1fr); }
        .grid-2 { grid-template-columns: 1fr; }
      }

      /* ---- Forms : 2 colonnes -> 1 colonne sous 600px ---- */
      .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      @media (max-width: 560px) {
        .form-grid-2 { grid-template-columns: 1fr; }
      }

      /* ---- Table wrapper : scroll horizontal contenu, jamais le body ---- */
      .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; }
      .table-scroll table { width: 100%; min-width: 640px; }

      /* ---- Sidebar : pleine sur desktop, compacte (icônes seules) sur tablette ---- */
      @media (min-width: 601px) and (max-width: 1024px) {
        .sidebar-full { width: 72px !important; padding-left: 10px !important; padding-right: 10px !important; }
        .sidebar-full .nav-label, .sidebar-full .brand-text, .sidebar-full .new-trade-label, .sidebar-full .sidebar-footer { display: none !important; }
        .sidebar-full .nav-item-row { justify-content: center !important; padding-left: 0 !important; padding-right: 0 !important; }
        .sidebar-full .new-trade-btn { padding: 10px !important; }
      }

      /* ---- Grilles inline dashboard (4 colonnes égales) ---- */
      @media (max-width: 760px) {
        .dashboard-grid4 { grid-template-columns: 1fr 1fr !important; }
      }
      @media (max-width: 600px) {
        .dashboard-grid4 { grid-template-columns: 1fr !important; }
      }

      /* ---- Trade detail : vraie disposition "étude de cas" deux colonnes sur grand écran ---- */
      .trade-detail-layout { display: flex; flex-direction: column; gap: 14px; }
      .trade-detail-col-left, .trade-detail-col-right { min-width: 0; }
      @media (min-width: 1025px) {
        .trade-detail-layout { display: grid; grid-template-columns: 380px 1fr; align-items: start; gap: 20px; }
        .trade-detail-col-left { position: sticky; top: 16px; }
      }

      /* ---- Main content : ne jamais dépasser le viewport ---- */
      .app-main { max-width: 100vw; overflow-x: hidden; }
      @media (max-width: 1024px) {
        .app-main { padding-left: 16px !important; padding-right: 16px !important; }
      }
      @media (max-width: 600px) {
        .app-main { padding-left: 14px !important; padding-right: 14px !important; }
        .journal-layout { flex-direction: column !important; }
        .journal-layout .journal-sidebar { width: 100% !important; max-width: 100% !important; max-height: 200px !important; }
        .journal-layout .journal-main { width: 100% !important; min-width: 0 !important; }
      }

    `}</style>
  );
}

/* ============================================================================
   SHARED COMPONENTS
   ============================================================================ */

function Card({ children, style, hover, ...rest }) {
  return (
    <div className={hover ? "card-int" : ""} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, ...style }} {...rest}>
      {children}
    </div>
  );
}

function CardLabel({ children, info }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.text, fontWeight: 700, letterSpacing: -0.1 }}>
      {children}
      {info && <Info size={12} color={C.textMuted} />}
    </div>
  );
}

function PageHeader({ title, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: C.text, letterSpacing: -0.5 }}>{title}</h1>
      {action}
    </div>
  );
}


function TagBadge({ name, size = "md", onRemove }) {
  const cat = TAG_CATALOG.find((t) => t.name === name)?.category || "other";
  const tagDef = TAG_CATALOG.find((t) => t.name === name);
  const isMistake = cat === "mistake";
  const isSession = cat === "session";
  const isSetup = cat === "setup";
  // Setup = blanc sur fond sombre discret
  const color = isMistake ? C.red : isSession ? C.textSecondary : isSetup ? C.text : C.purpleBright;
  const bg = isMistake ? C.redDim : isSession ? (C.inputBg || C.card) : isSetup ? (C.inputBg || C.card) : C.purpleDim;
  const borderColor = isMistake ? `${C.red}40` : isSession ? C.border : isSetup ? C.border : `${C.purpleBright}40`;
  const small = size === "sm";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "2px 7px" : "3px 9px", borderRadius: 5,
      background: bg, color, border: `1px solid ${borderColor}`,
      fontSize: small ? 10.5 : 11.5, fontWeight: 600, lineHeight: 1.6, whiteSpace: "nowrap",
    }}>
      {name}
      {onRemove && (
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, display: "flex", opacity: 0.7 }}>
          <X size={10} />
        </button>
      )}
    </span>
  );
}

/* Logo Emeieks Trade — SVG fidèle au logo original */
function EmeieksLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="logoGradE" x1="20" y1="15" x2="55" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8E8F0"/>
          <stop offset="100%" stopColor="#A0A0C0"/>
        </linearGradient>
        <linearGradient id="logoGradArrow" x1="35" y1="70" x2="80" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A3BB5"/>
          <stop offset="100%" stopColor="#7B6CF6"/>
        </linearGradient>
      </defs>
      {/* Lettre E */}
      <path d="M18 15 L18 75 L50 75 L50 65 L30 65 L30 50 L46 50 L46 41 L30 41 L30 25 L50 25 L50 15 Z" fill="url(#logoGradE)"/>
      {/* Flèche diagonale montante */}
      <line x1="38" y1="72" x2="78" y2="22" stroke="url(#logoGradArrow)" strokeWidth="5.5" strokeLinecap="round"/>
      <polygon points="78,22 68,24 76,32" fill="#7B6CF6"/>
      {/* Chandeliers */}
      <rect x="58" y="48" width="5" height="18" rx="1" fill="#5B4DD4" opacity="0.85"/>
      <line x1="60.5" y1="44" x2="60.5" y2="48" stroke="#5B4DD4" strokeWidth="1.5"/>
      <line x1="60.5" y1="66" x2="60.5" y2="70" stroke="#5B4DD4" strokeWidth="1.5"/>
      <rect x="67" y="42" width="5" height="22" rx="1" fill="#6B5AE8" opacity="0.9"/>
      <line x1="69.5" y1="38" x2="69.5" y2="42" stroke="#6B5AE8" strokeWidth="1.5"/>
      <line x1="69.5" y1="64" x2="69.5" y2="68" stroke="#6B5AE8" strokeWidth="1.5"/>
      <rect x="76" y="36" width="5" height="26" rx="1" fill="#7B6CF6"/>
      <line x1="78.5" y1="32" x2="78.5" y2="36" stroke="#7B6CF6" strokeWidth="1.5"/>
      <line x1="78.5" y1="62" x2="78.5" y2="66" stroke="#7B6CF6" strokeWidth="1.5"/>
    </svg>
  );
}

function DirBadge({ direction, size = "sm" }) {
  const isLong = direction === "long";
  const sz = size === "lg" ? { fontSize: 13, padding: "3px 9px", borderRadius: 5 } : { fontSize: 11, padding: "2px 6px", borderRadius: 4 };
  return (
    <span style={{
      ...sz,
      fontWeight: 800, display: "inline-flex", alignItems: "center", letterSpacing: 0.5,
      background: isLong ? "rgba(45,125,210,0.15)" : "rgba(249,115,22,0.15)",
      color: isLong ? "#2D7DD2" : "#F97316",
      border: `1px solid ${isLong ? "#2D7DD2" : "#F97316"}33`,
    }}>
      {isLong ? "L" : "S"}
    </span>
  );
}

function ResultBadge({ resultR, status, size = "md", onStatusChange }) {
  const [open, setOpen] = useState(false);
  const small = size === "sm";

  let label, bg, color, icon;
  if (status === "open") {
    label = "Ouvert"; bg = C.purpleDim; color = C.purpleBright; icon = null;
  } else if (status === "breakeven") {
    label = "BE"; bg = "rgba(170,178,197,0.1)"; color = C.textSecondary; icon = <Minus size={small ? 9 : 11} strokeWidth={2.5} />;
  } else {
    const win = resultR > 0;
    label = win ? "Win" : "Loss";
    bg = win ? C.tealDim : C.redDim;
    color = win ? C.teal : C.red;
    icon = win ? <TrendingUp size={small ? 9 : 11} strokeWidth={2.5} /> : <TrendingDown size={small ? 9 : 11} strokeWidth={2.5} />;
  }

  const OPTIONS = [
    { value: "win", label: "Win", resultR: Math.abs(resultR || 1) },
    { value: "loss", label: "Loss", resultR: -(Math.abs(resultR || 1)) },
    { value: "breakeven", label: "Breakeven", resultR: 0 },
    { value: "open", label: "Ouvert", resultR: resultR },
  ];

  if (!onStatusChange) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "2px 8px" : "3px 10px", borderRadius: 5, background: bg, color, fontSize: small ? 10.5 : 11.5, fontWeight: 700 }}>
        {icon} {label}
      </span>
    );
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: small ? "2px 8px" : "3px 10px", borderRadius: 5, background: bg, color, fontSize: small ? 10.5 : 11.5, fontWeight: 700, border: "none", cursor: "pointer" }}
      >
        {icon} {label} <ChevronDown size={9} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", minWidth: 140, overflow: "hidden" }}>
            {OPTIONS.map((opt) => (
              <button key={opt.value} onClick={(e) => { e.stopPropagation(); onStatusChange(opt.value, opt.resultR); setOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", background: "none", border: "none", fontSize: 12.5, color: C.text, cursor: "pointer", fontWeight: 500 }}
                onMouseEnter={(e) => e.target.style.background = C.bg}
                onMouseLeave={(e) => e.target.style.background = "none"}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <Card style={{ padding: "52px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
        <Icon size={19} color={C.purpleBright} strokeWidth={1.7} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{title}</div>
      <div style={{ fontSize: 12.5, color: C.textSecondary, maxWidth: 340, lineHeight: 1.6 }}>{text}</div>
      {action}
    </Card>
  );
}

const getInputStyle = () => ({
  background: C.inputBg || C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: "10px 14px",
  color: C.text,
  fontSize: 13,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  display: "block",
  WebkitTextFillColor: C.text,
  WebkitAppearance: "none",
  appearance: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  outline: "none",
});
let inputStyle = getInputStyle();

const btn = {
  primary: { background: C.purple, color: "#fff", border: "none", borderRadius: 7, padding: "9px 15px", fontWeight: 600, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  ghost: { background: C.card, color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 13px", fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500 },
  icon: { background: C.card, color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 7, padding: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" },
};

/* Crochet SVG réutilisable */


/* Select avec crochet positionné à l'intérieur à droite */




function Field({ label, children, hint, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: C.textMuted }}>{hint}</span>}
    </div>
  );
}

function BackLink({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", color: C.textSecondary, fontSize: 12.5, cursor: "pointer", padding: "4px 0", fontWeight: 500 }}>
      <ChevronLeft size={15} /> {children}
    </button>
  );
}

/* ============================================================================
   SIDEBAR / NAVIGATION — façon TradeZella
   ============================================================================ */

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", short: "Home", icon: LayoutGrid },
  { id: "trades", label: "Mes trades", short: "Trades", icon: NotebookPen },
  { id: "plan", label: "Plan", short: "Plan", icon: BookOpen },
  { id: "previsions", label: "Prévisions", short: "Prévis.", icon: TrendingUp },
  { id: "stats", label: "Statistiques", short: "Stats", icon: BarChart3 },
  { id: "settings", label: "Réglages", short: "Réglages", icon: Settings },
];

function MobileNav({ view, setView, onNewTrade }) {
  const [more, setMore] = useState(false);
  const MAIN = [NAV_ITEMS[0], NAV_ITEMS[1], null, NAV_ITEMS.find(i => i.id === "stats")];
  const EXTRA = [
    { id: "plan", label: "Plan de trading", icon: BookOpen },
    { id: "previsions", label: "Prévisions", icon: TrendingUp },
    { id: "calendar", label: "Calendrier", icon: CalendarDays },
    { id: "calculator", label: "Calculatrice", icon: Calculator },
    { id: "coach", label: "IA Coach", icon: Brain },
    { id: "settings", label: "Réglages", icon: Settings },
  ];
  const extraActive = EXTRA.some(x => x.id === view);
  const go = (id) => { setMore(false); setView(id); };
  const Item = ({ active, label, icon, onClick }) => (
    <button onClick={onClick} style={{ background: "none", border: "none", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", padding: "0 2px", color: active ? "#9D8FFF" : "rgba(255,255,255,0.45)" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 30, borderRadius: 10, background: active ? "rgba(157,143,255,0.14)" : "transparent" }}>
        {React.createElement(icon, { size: 21, strokeWidth: active ? 2.1 : 1.7 })}
      </div>
      <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{label}</span>
    </button>
  );
  return (
    <>
      {more && (
        <div className="mobile-only" onClick={() => setMore(false)} style={{ position: "fixed", inset: 0, zIndex: 998, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 10, right: 10, bottom: "calc(74px + env(safe-area-inset-bottom, 0px))", background: THEMES.dark.sidebar, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.5)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {EXTRA.map(x => (
              <button key={x.id} onClick={() => go(x.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 6px", borderRadius: 12, border: "none", cursor: "pointer", background: view === x.id ? "rgba(157,143,255,0.16)" : "rgba(255,255,255,0.04)", color: view === x.id ? "#C4BBFF" : "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>
                {React.createElement(x.icon, { size: 22, strokeWidth: 1.8 })}{x.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <nav className="mobile-only" data-mobile="1" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 999, display: "flex", alignItems: "flex-end", padding: "8px 6px", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))", background: THEMES.dark.sidebar, borderTop: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 -2px 20px rgba(0,0,0,0.4)" }}>
        {MAIN.map((it, i) => it ? (
          <Item key={it.id} label={it.short} icon={it.icon} onClick={() => go(it.id)}
            active={!more && (view === it.id || ((view === "tradeForm" || view === "tradeDetail") && it.id === "trades"))} />
        ) : (
          <button key="add" onClick={() => { setMore(false); onNewTrade(); }} aria-label="Ajouter un trade" style={{ background: "none", border: "none", flex: 1, display: "flex", justifyContent: "center", cursor: "pointer", marginTop: -14 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg, ${THEMES.dark.purple}, #5B3FE0)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(139,124,246,0.4)", border: "2px solid rgba(255,255,255,0.12)" }}>
              <Plus size={26} strokeWidth={2.3} color="#fff" />
            </div>
          </button>
        ))}
        <Item label="Plus" icon={MoreHorizontal} active={more || extraActive} onClick={() => setMore(v => !v)} />
      </nav>
    </>
  );
}

function Sidebar({ view, setView, onNewTrade, totalPnl = 0, totalR = 0 }) {
  return (
    <>
      <aside className="desktop-only sidebar-full" style={getS().aside}>
        <div style={getS().brand}>
          <EmeieksLogo size={38} />
          <div className="brand-text">
            <div style={{ fontSize: 13, fontWeight: 800, color: C.sidebarText, letterSpacing: -0.3, lineHeight: 1.1 }}>Emeieks</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.sidebarTextDim, letterSpacing: 0.3 }}>Trade</div>
          </div>
        </div>

        <button onClick={onNewTrade} className="new-trade-btn" style={getS().newTradeBtn} title="Nouveau trade">
          <Plus size={15} strokeWidth={2.4} /> <span className="new-trade-label">Nouveau trade</span>
        </button>

        <nav style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 1 }}>
          {NAV_ITEMS.map((it) => {
            const active = view === it.id || (view === "tradeForm" && it.id === "trades") || (view === "tradeDetail" && it.id === "trades");
            const Icon = it.icon;
            return (
              <button key={it.id} className="nav-btn nav-item-row" onClick={() => setView(it.id)} title={it.label} style={{
                ...getS().navItem,
                background: active ? "rgba(139,124,246,0.18)" : "transparent",
                color: active ? "#C4BAFB" : C.sidebarTextDim,
              }}>
                <Icon size={16} strokeWidth={1.9} />
                <span className="nav-label">{it.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={getS().footer}>
          <div>
            <div style={{ fontSize: 10.5, color: C.sidebarTextDim, letterSpacing: 0.6, fontWeight: 700, textTransform: "uppercase" }}>Profit total</div>
            <div className="tnum" style={{ fontSize: 20, fontWeight: 900, color: totalPnl >= 0 ? C.teal : C.red, letterSpacing: -0.5, marginTop: 2 }}>{fmtUsdSigned(totalPnl)}</div>
            <div className="tnum" style={{ fontSize: 11.5, color: C.sidebarTextDim, fontWeight: 600 }}>{fmtR(totalR)}</div>
          </div>
        </div>
        </aside>
      <MobileNav view={view} setView={setView} onNewTrade={onNewTrade} />
    </>
  );
}

function getS() { return {
  aside: {
    width: 220, flexShrink: 0, borderRight: `1px solid ${C.sidebarBorder}`, padding: "20px 14px",
    display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh",
    background: C.sidebar,
  },
  brand: { display: "flex", alignItems: "center", gap: 9, paddingLeft: 4, marginBottom: 18 },
  brandMark: { width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${C.purple}, #5B3FE0)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff", flexShrink: 0 },
  brandTitle: { fontWeight: 700, fontSize: 16, color: C.sidebarText, letterSpacing: -0.3 },
  newTradeBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: C.purple, color: "#fff", border: "none", borderRadius: 8, padding: "10px 12px", fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: `0 2px 8px rgba(139,124,246,0.3)` },
  navItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left" },
  footer: { marginTop: "auto", paddingTop: 14, borderTop: `1px solid ${C.sidebarBorder}` },
  mobileNav: {
    bottom: 0, left: 0, right: 0, zIndex: 100,
    display: "flex", justifyContent: "space-around", alignItems: "flex-end",
    paddingTop: 10,
    paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
    background: C.sidebar,
    borderTop: `1px solid ${C.sidebarBorder}`,
    boxShadow: "0 -4px 24px rgba(0,0,0,0.25)",
  },
  mobileNavItem: {
    background: "none", border: "none",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 4, cursor: "pointer", padding: "0 2px", minWidth: 48,
  },
  mobileFab: {
    width: 46, height: 46, borderRadius: "50%",
    background: `linear-gradient(135deg, ${C.purple}, #5B3FE0)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    marginTop: -18,
    boxShadow: "0 2px 12px rgba(139,124,246,0.35)",
    border: "2px solid rgba(255,255,255,0.12)",
  },
}; }

/* ============================================================================
   TOP BAR — sélecteur de période façon TradeZella
   ============================================================================ */

function TopBar({ title, isDark, onToggleTheme, onCalendar, onCoach, accounts, activeAccountId, onSwitchAccount, onHome, currentBalance, onRefresh, cumulMode, setCumulMode }) {
  const [showAccounts, setShowAccounts] = useState(false);
  const activeAccount = accounts?.find(a => a.id === activeAccountId) || accounts?.[0];

  const typeColors = { real: C.teal, demo: C.purple, challenge: C.amber };
  const typeLabels = { real: "Réel", demo: "Démo", challenge: "Challenge" };

  return (
    <div className="topbar-safe" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${C.sidebarBorder}`, background: C.sidebar, gap: 8, minWidth: 0, position: "relative" }}>

      {/* Logo + Emeieks Trade → cliquable accueil */}
      <button onClick={onHome} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
        <EmeieksLogo size={26} />
        <div style={{ textAlign: "left", lineHeight: 1.1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.sidebarText, letterSpacing: -0.2 }}>Emeieks</div>
          <div style={{ fontSize: 9, fontWeight: 500, color: C.sidebarTextDim, letterSpacing: 0.4, textTransform: "uppercase" }}>Trade</div>
        </div>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

        {/* Switcher de compte */}
        {accounts && accounts.length > 0 && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAccounts(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: C.sidebarHover, border: `1px solid ${C.sidebarBorder}`, cursor: "pointer" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: typeColors[activeAccount?.type] || C.teal, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.sidebarText, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeAccount?.name}</span>
              <ChevronDown size={11} color={C.sidebarTextDim} />
            </button>
            {showAccounts && (
              <>
                <div onClick={() => setShowAccounts(false)} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 99, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 200, overflow: "hidden" }}>
                  {accounts.map((acc) => (
                    <button key={acc.id} onClick={() => { onSwitchAccount(acc.id); setShowAccounts(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: acc.id === activeAccountId ? C.purpleDim : "none", border: "none", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: typeColors[acc.type] || C.teal, flexShrink: 0 }} />
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{acc.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>
                          {typeLabels[acc.type] || acc.type}
                          {acc.id === activeAccountId && currentBalance != null
                            ? <span className="tnum" style={{ color: C.teal, fontWeight: 700 }}> · ${Math.round(currentBalance).toLocaleString()}</span>
                            : acc.balance ? ` · $${Number(acc.balance).toLocaleString()}` : ""}
                        </div>
                      </div>
                      {acc.id === activeAccountId && <CheckCircle2 size={13} color={C.purple} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Cumuler tous les comptes */}
        {setCumulMode && accounts.length > 1 && (
          <button onClick={() => setCumulMode(v => !v)} style={{
            ...btn.icon,
            background: cumulMode ? C.purpleDim : C.sidebarHover,
            borderColor: cumulMode ? C.purple : C.sidebarBorder,
            fontSize: 10, fontWeight: 700, padding: "6px 8px", letterSpacing: 0.3,
            color: cumulMode ? C.purpleBright : C.sidebarTextDim,
            minWidth: 44,
          }} title="Cumuler tous les comptes">
            ∑
          </button>
        )}

        {/* Sync manuel */}
        {onRefresh && (
          <button onClick={onRefresh} style={{ ...btn.icon, background: C.sidebarHover, borderColor: C.sidebarBorder }} title="Synchroniser">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.sidebarTextDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        )}

        {/* Calendrier */}
        <button className="desktop-only" onClick={onCalendar} style={{ ...btn.icon, background: C.sidebarHover, borderColor: C.sidebarBorder }} title="Calendrier">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.sidebarTextDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </button>

        {/* Thème */}
        <button onClick={onToggleTheme} style={{ ...btn.icon, background: C.sidebarHover, borderColor: C.sidebarBorder }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.sidebarTextDim} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>

        {/* IA Coach */}
        <button className="desktop-only" onClick={onCoach} style={{ ...btn.icon, background: C.sidebarHover, borderColor: C.sidebarBorder }} title="IA Coach">
          <Brain size={15} strokeWidth={1.8} color={C.sidebarTextDim} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   DASHBOARD — dense, 4 rangées façon TradeZella
   ============================================================================ */

function computeStats(trades, initialBalance = 10000) {
  const closed = trades.filter((t) => t.status !== "open");
  const wins = closed.filter((t) => t.resultR > 0);
  const losses = closed.filter((t) => t.resultR < 0);
  const totalPnl = closed.reduce((s, t) => s + (t.resultUsd || 0), 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgRR = closed.length ? closed.reduce((s, t) => s + (t.resultR || 0), 0) / closed.length : 0;

  const sorted = [...closed].sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime));
  let bal = initialBalance;
  let peak = bal;
  let maxDD = 0;
  const curve = [{ label: "Départ", balance: bal }];
  sorted.forEach((t) => {
    bal += t.resultUsd || 0;
    peak = Math.max(peak, bal);
    const dd = peak > 0 ? ((peak - bal) / peak) * 100 : 0;
    maxDD = Math.max(maxDD, dd);
    curve.push({ label: fmtDate(t.entryTime), balance: Math.round(bal) });
  });

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const sumSince = (since) => closed.filter((t) => new Date(t.entryTime) >= since).reduce((s, t) => s + (t.resultUsd || 0), 0);
  const profitToday = sumSince(startOfDay);
  const profitWeek = sumSince(startOfWeek);
  const profitMonth = sumSince(startOfMonth);

  const avgWin = wins.length ? wins.reduce((s, t) => s + (t.resultUsd || 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.resultUsd || 0), 0) / losses.length : 0;

  return { closed, wins, losses, totalPnl, winRate, avgRR, avgWin, avgLoss, curve, maxDD, currentBalance: bal, initialBalance, profitToday, profitWeek, profitMonth };
}

function groupBy(trades, keyFn) {
  const map = {};
  trades.forEach((t) => {
    const key = keyFn(t);
    if (key === null || key === undefined) return;
    if (!map[key]) map[key] = { key, trades: [], pnl: 0, wins: 0, losses: 0 };
    map[key].trades.push(t);
    map[key].pnl += t.resultUsd || 0;
    if (t.resultR > 0) map[key].wins += 1;
    if (t.resultR < 0) map[key].losses += 1;
  });
  return Object.values(map).map((g) => ({ ...g, count: g.trades.length, winRate: g.trades.length ? (g.wins / g.trades.length) * 100 : 0 }));
}


function Dashboard({ trades, onOpenTrade, setView, onStatusChange, initialBalance = 10000 }) {
  const [period, setPeriod] = useState("30j");
  const [eqMode, setEqMode] = useState("cum");

  const filteredTrades = useMemo(() => {
    if (period === "tout") return trades;
    const days = period === "7j" ? 7 : period === "30j" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return trades.filter((t) => new Date(t.entryTime) >= cutoff);
  }, [trades, period]);

  const stats = useMemo(() => computeStats(filteredTrades, initialBalance), [filteredTrades, initialBalance]);
  const dailyData = useMemo(() => {
    const m = {};
    stats.closed.forEach((t) => {
      const d = new Date(t.entryTime);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      m[k] = (m[k] || 0) + (t.resultUsd || 0);
    });
    return Object.keys(m).sort().map((k) => ({ label: fmtDate(k + "T12:00:00"), pnl: Math.round(m[k] * 100) / 100 }));
  }, [stats.closed]);
  const recentTrades = filteredTrades.slice(0, 5);
  const PERIODS = ["7j", "30j", "90j", "tout"];
  const totalR = stats.closed.reduce((s, t) => s + (Number(t.resultR) || 0), 0);
  const [goal, setGoal] = useState(() => { try { return JSON.parse(localStorage.getItem("emeieks_goals") || "null") || { monthR: 10, maxTrades: 2, stopR: 2 }; } catch (e) { return { monthR: 10, maxTrades: 2, stopR: 2 }; } });
  const saveGoal = (g) => { setGoal(g); try { localStorage.setItem("emeieks_goals", JSON.stringify(g)); } catch (e) {} };
  const now0 = new Date();
  const monthR = trades.filter((t) => t.status === "closed" && t.entryTime && new Date(t.entryTime).getMonth() === now0.getMonth() && new Date(t.entryTime).getFullYear() === now0.getFullYear()).reduce((s, t) => s + (Number(t.resultR) || 0), 0);
  const todayT = trades.filter((t) => t.entryTime && new Date(t.entryTime).toDateString() === now0.toDateString());
  const todayR = todayT.filter((t) => t.status === "closed").reduce((s, t) => s + (Number(t.resultR) || 0), 0);
  const tooMany = todayT.length >= goal.maxTrades, stopHit = todayR <= -goal.stopR;
  const editGoal = () => { const m = window.prompt("Objectif du mois (en R) :", goal.monthR); if (m === null) return; const mx = window.prompt("Maximum de trades par jour :", goal.maxTrades); if (mx === null) return; const st = window.prompt("Stop journalier (en R, ex. 2 pour −2R) :", goal.stopR); if (st === null) return;
    saveGoal({ monthR: Math.max(1, parseFloat(m) || 10), maxTrades: Math.max(1, parseInt(mx) || 2), stopR: Math.max(0.5, parseFloat(st) || 2) }); };

  return (
    <div className="fade-in">
      <PageHeader title="Dashboard" action={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 3, background: C.bg, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: "5px 11px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: period === p ? C.card : "transparent",
                color: period === p ? C.text : C.textMuted,
                border: period === p ? `1px solid ${C.border}` : "1px solid transparent",
                boxShadow: period === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>{p}</button>
            ))}
          </div>
          <button onClick={() => setView("coach")} title="IA Coach" aria-label="IA Coach" style={{ ...btn.ghost, padding: "7px 9px" }}><Brain size={15} /></button>
          <button onClick={() => exportToCsv(filteredTrades)} title="Exporter CSV" aria-label="Exporter CSV" style={{ ...btn.ghost, padding: "7px 9px" }}><Download size={15} /></button>
        </div>
      } />

      {/* Résumé — un seul bloc clair */}
      <Card style={{ padding: "18px 18px 14px", marginBottom: 14, background: `linear-gradient(135deg, ${C.card}, ${stats.totalPnl >= 0 ? "rgba(45,212,191,0.07)" : "rgba(244,63,94,0.07)"})` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.textMuted }}>Résultat · {period === "tout" ? "tout" : period}</div>
        <div className="tnum" style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1.5, color: totalR >= 0 ? C.teal : C.red, lineHeight: 1.05, marginTop: 4 }}>{fmtR(totalR)}</div>
        <div className="tnum" style={{ fontSize: 14, color: C.textSecondary, fontWeight: 600, marginTop: 2 }}><b style={{ color: stats.totalPnl >= 0 ? C.teal : C.red }}>{fmtUsdSigned(stats.totalPnl)}</b> · Capital {fmtUsd(stats.currentBalance)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
          {[["Winrate", fmtPct(stats.winRate), `${stats.wins.length}G · ${stats.losses.length}P`, C.text],
            ["R moyen", fmtR(stats.avgRR), "par trade", stats.avgRR >= 0 ? C.teal : C.red],
            ["Trades", String(stats.closed.length), `DD -${stats.maxDD.toFixed(1)}%`, C.text]].map(([l, v, sub, col]) => (
            <div key={l} style={{ padding: "10px 10px 9px", borderRadius: 12, background: "transparent", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 600 }}>{l}</div>
              <div className="tnum" style={{ fontSize: 18, fontWeight: 800, color: col, marginTop: 2 }}>{v}</div>
              <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 1 }}>{sub}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Ligne 2 — courbe d'équité large */}
      <Card style={{ padding: "18px 20px 8px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <CardLabel info>Courbe d'équité cumulée</CardLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {[["cum", "Cumulé"], ["day", "Quotidien"]].map(([k, l]) => (
              <button key={k} onClick={() => setEqMode(k)} style={{ ...btn.ghost, padding: "5px 10px", fontSize: 11, ...(eqMode === k ? { background: C.purpleDim, color: C.purpleBright, borderColor: "transparent" } : {}) }}>{l}</button>
            ))}
          </div>
        </div>
        {eqMode === "day" ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyData} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.textMuted, fontSize: 10.5 }} axisLine={{ stroke: C.border }} tickLine={false} minTickGap={30} />
            <YAxis tick={{ fill: C.textMuted, fontSize: 10.5 }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => `$${Math.round(v)}`} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.borderLight}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: C.textSecondary }} formatter={(v) => [fmtUsdSigned(v), "P&L du jour"]} cursor={{ fill: "rgba(128,128,160,0.08)" }} />
            <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>{dailyData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? C.teal : C.red} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
        ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={stats.curve} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.teal} stopOpacity={0.25} />
                <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.textMuted, fontSize: 10.5 }} axisLine={{ stroke: C.border }} tickLine={false} minTickGap={40} />
            <YAxis
              tick={{ fill: C.textMuted, fontSize: 10.5 }} axisLine={false} tickLine={false} width={54}
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              domain={[
                (dataMin) => Math.floor(Math.min(dataMin, initialBalance) * 0.95 / 1000) * 1000,
                (dataMax) => Math.ceil(dataMax * 1.05 / 1000) * 1000,
              ]}
            />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.borderLight}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: C.textSecondary }} formatter={(v) => [fmtUsd(v), "Capital"]} />
            <Area type="monotone" dataKey="balance" stroke={C.teal} strokeWidth={2} fill="url(#eqFill)" />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </Card>

      <button onClick={() => setView("stats")} style={{ width: "100%", marginBottom: 14, padding: "12px 16px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, color: C.purpleBright, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Voir toutes les statistiques</span><span>→</span>
      </button>

      {/* Ligne 4 — Trades récents */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>Trades récents</span>
          <button onClick={() => setView("trades")} style={{ background: "none", border: "none", color: C.purpleBright, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Voir tout →</button>
        </div>

        <div className="desktop-only table-scroll">
          <div style={{ display: "grid", gridTemplateColumns: "90px 70px 60px 110px 90px 80px 1fr", padding: "8px 18px", fontSize: 10.5, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${C.border}`, minWidth: 640 }}>
            <div>Date</div><div>Paire</div><div>Dir.</div><div>Setup</div><div>Résultat</div><div>Statut</div><div>Tags</div>
          </div>
          {recentTrades.map((t) => (
            <div key={t.id} className="row-hover" onClick={() => onOpenTrade(t.id)} style={{ display: "grid", gridTemplateColumns: "90px 70px 60px 110px 90px 80px 1fr", padding: "11px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", cursor: "pointer", fontSize: 12.5, minWidth: 640 }}>
              <div style={{ color: C.textSecondary }}>{fmtDate(t.entryTime)}</div>
              <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}><PairLogo pair={t.pair} size={20} />{t.pair}</div>
              <div><DirBadge direction={t.direction} /></div>
              <div style={{ color: C.textSecondary, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.setup}</div>
              <div className="tnum" style={{ fontWeight: 700, color: t.resultUsd >= 0 ? C.teal : C.red }}>{fmtUsdSigned(t.resultUsd)}</div>
              <div><ResultBadge resultR={t.resultR} status={t.status} size="sm" onStatusChange={(newStatus, newR) => onStatusChange(t.id, newStatus, newR)} /></div>
              <div style={{ display: "flex", gap: 4, overflow: "hidden" }}>
                {(t.tags || []).slice(0, 2).map((tag) => <TagBadge key={tag} name={tag} size="sm" />)}
              </div>
            </div>
          ))}
        </div>

        <div className="mobile-only">
          {recentTrades.map((t) => (
            <div key={t.id} className="row-hover" onClick={() => onOpenTrade(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
              <span style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: t.status !== "closed" ? C.textMuted : (t.resultR || 0) >= 0 ? C.teal : C.red }} />
              <PairLogo pair={t.pair} size={20} /><span style={{ fontWeight: 700, fontSize: 13.5 }}>{t.pair}</span>
              <DirBadge direction={t.direction} />
              <span style={{ fontSize: 11.5, color: C.textMuted, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmtDate(t.entryTime)}{t.ictModel ? " · " + t.ictModel : ""}</span>
              <span className="tnum" style={{ fontWeight: 800, fontSize: 14, color: t.status !== "closed" ? C.textMuted : (t.resultR || 0) >= 0 ? C.teal : C.red }}>{t.status !== "closed" ? "En cours" : fmtR(t.resultR)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================================
   TRADE LOG — table professionnelle façon TradeZella
   ============================================================================ */

function exportToCsv(trades) {
  const headers = ["Date", "Paire", "Direction", "Setup", "Entrée", "SL", "TP", "Sortie", "Taille", "Risque $", "Résultat $", "Résultat pips", "Résultat R", "Session", "Tags", "Notes"];
  const rows = trades.map((t) => [
    new Date(t.entryTime).toISOString(),
    t.pair, t.direction, t.setup || "", t.entryPrice, t.stopLoss ?? "", t.takeProfit ?? "", t.exitPrice ?? "",
    t.positionSize, t.riskUsd ?? "", t.resultUsd ?? "", t.resultPips ?? "", t.resultR ?? "",
    getSession(t.entryTime), (t.tags || []).join("; "),
    (t.notes || "").replace(/"/g, '""'),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c ?? ""}"`).join(",")).join("\n");

  // Safari iOS ne supporte pas createObjectURL sur les blobs → on utilise data URI
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  if (isSafari) {
    const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = `trades_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  } else {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trades_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function TradesList({ trades, onOpen: onOpenFull, onNew, onStatusChange, onHome, onPatch }) {
  const [quickId, setQuickId] = useState(null);
  const onOpen = onPatch ? (id) => setQuickId(id) : onOpenFull;
  const quickTrade = quickId ? trades.find((t) => t.id === quickId) : null;
  // États appliqués (utilisés pour filtrer)
  const [search, setSearch] = useState("");
  const [filterPair, setFilterPair] = useState("all");
  const [filterSession, setFilterSession] = useState("all");
  const [filterTags, setFilterTags] = useState([]);
  const [filterResult, setFilterResult] = useState("all");
  const [filterOte, setFilterOte] = useState("all");
  const [filterExcludeTags, setFilterExcludeTags] = useState([]); // Mode Hide
  const [filterPositive, setFilterPositive] = useState(""); // filtre point positif
  const [filterNegative, setFilterNegative] = useState(""); // filtre erreur
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterSetup, setFilterSetup] = useState("all");
  const [qIct, setQIct] = useState("");

  // États pending (synchrones avec les appliqués — filtre en temps réel)
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingPair, setPendingPair] = useState("all");
  const [pendingSession, setPendingSession] = useState("all");
  const [pendingTags, setPendingTags] = useState([]);
  const [pendingResult, setPendingResult] = useState("all");
  const [pendingOte, setPendingOte] = useState("all");
  const [pendingDateFrom, setPendingDateFrom] = useState("");
  const [pendingDateTo, setPendingDateTo] = useState("");
  const [pdOpen, setPdOpen] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [openMonths, setOpenMonths] = useState(() => {
    const now = new Date();
    return new Set([`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`]);
  });

  // Filtre en temps réel — applique immédiatement
  const applyFilters = () => {
    setSearch(pendingSearch);
    setFilterPair(pendingPair);
    setFilterSession(pendingSession);
    setFilterTags([...pendingTags]);
    setFilterResult(pendingResult);
    setFilterOte(pendingOte);
    setDateFrom(pendingDateFrom);
    setDateTo(pendingDateTo);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setPendingSearch(""); setSearch("");
    setPendingPair("all"); setFilterPair("all");
    setPendingSession("all"); setFilterSession("all");
    setPendingTags([]); setFilterTags([]);
    setPendingResult("all"); setFilterResult("all");
    setPendingOte("all"); setFilterOte("all");
    setPendingDateFrom(""); setDateFrom("");
    setPendingDateTo(""); setDateTo("");
    setFilterPositive(""); setFilterNegative("");
  };

  
  const pdSetupOptions = TAG_CATALOG.filter(t => t.category === "setup");
  const errOptions = useMemo(() => [...new Set(trades.flatMap((t) => t.mistakes || []))].sort(), [trades]);
  const posOptions = useMemo(() => [...new Set(trades.flatMap((t) => t.positives || []))].sort(), [trades]);
  const togglePendingTag = (name) => setPendingTags(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);

  // Grouper les trades par mois
  const byMonth = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      const d = new Date(t.entryTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [trades]);

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (filterPair !== "all" && t.pair !== filterPair) return false;
      if (filterSetup !== "all" && t.setup !== filterSetup) return false;
      if (filterSession !== "all" && getSession(t.entryTime) !== filterSession) return false;
      if (filterTags.length > 0 && !filterTags.every(ft => (t.tags || []).includes(ft))) return false;
      if (filterResult === "win" && !(t.resultR > 0)) return false;
      if (filterResult === "loss" && !(t.resultR < 0)) return false;
      if (filterResult === "be" && t.status !== "breakeven") return false;
      if (filterResult === "open" && t.status !== "open") return false;
      if (filterOte !== "all" && (filterOte === "none" ? t.oteFib : t.oteFib !== filterOte)) return false;
      if (dateFrom && new Date(t.entryTime) < new Date(dateFrom)) return false;
      if (dateTo && new Date(t.entryTime) > new Date(dateTo + "T23:59:59")) return false;
      if (search && !t.pair.toLowerCase().includes(search.toLowerCase()) && !(t.notes || "").toLowerCase().includes(search.toLowerCase())) return false;
      // Mode Hide — exclut les trades qui ont ces tags
      if (filterExcludeTags.length > 0 && filterExcludeTags.some(et => (t.tags || []).includes(et) || (t.dxyTags || []).includes(et))) return false;
      // Filtre point positif
      if (filterPositive) {
        if (!(t.positives || []).includes(filterPositive)) return false;
      }
      // Filtre erreur
      if (filterNegative) {
        if (!(t.mistakes || []).includes(filterNegative)) return false;
      }
      if (qIct && t.ictModel !== qIct) return false;
      return true;
    });
  }, [trades, filterPair, filterSetup, filterSession, filterTags, filterResult, filterOte, dateFrom, dateTo, search, filterExcludeTags, filterPositive, filterNegative, qIct]);

  const activeFilterCount = [filterPair !== "all", filterSetup !== "all", filterSession !== "all", filterTags.length > 0, filterResult !== "all", filterOte !== "all", dateFrom, dateTo, filterPositive, filterNegative].filter(Boolean).length;

  const toggleMonth = (key) => {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const hasActiveFilters = activeFilterCount > 0 || search;

  return (
    <div className="fade-in">
      {quickTrade && <QuickTradeModal key={quickTrade.id} trade={quickTrade} onClose={() => setQuickId(null)} onPatch={onPatch} onOpenFull={onOpenFull} />}
      <PageHeader title="Mes trades" action={
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportToCsv(filtered)} style={btn.ghost} title="Exporter CSV" aria-label="Exporter CSV"><Download size={14} /></button>
        </div>
      } />

      {/* Barre de recherche + bouton Filtres */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <Search size={14} color={C.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            placeholder="Rechercher paire ou note…"
            value={pendingSearch}
            onChange={(e) => setPendingSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          style={{ ...btn.ghost, flexShrink: 0, color: activeFilterCount ? C.purpleBright : C.textSecondary, borderColor: activeFilterCount ? "rgba(139,124,246,0.35)" : C.border, background: activeFilterCount ? C.purpleDim : (C.inputBg || C.card) }}>
          <Filter size={14} /> Filtres {activeFilterCount > 0 && <span style={{ background: C.purple, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700, marginLeft: 2 }}>{activeFilterCount}</span>}
        </button>
      </div>

      {/* Panneau filtres refait */}

      {showFilters && (
        <Card style={{ padding: 18, marginBottom: 14, borderRadius: 14 }}>

          {/* Section 1 : Selects */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Paire">
                <select value={pendingPair} onChange={(e) => setPendingPair(e.target.value)} style={inputStyle}>
                  <option value="all">Toutes les paires</option>
                  {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Session">
                <select value={pendingSession} onChange={(e) => setPendingSession(e.target.value)} style={inputStyle}>
                  <option value="all">Toutes</option>
                  <option value="Asia Session">Asia</option>
                  <option value="London Session">London</option>
                  <option value="New York Session">New York</option>
                  <option value="Hors session">Hors session</option>
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Résultat">
                <select value={pendingResult} onChange={(e) => setPendingResult(e.target.value)} style={inputStyle}>
                  <option value="all">Tous</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="be">Breakeven</option>
                  <option value="open">Ouvert</option>
                </select>
              </Field>
              <Field label="Zone OTE">
                <select value={pendingOte} onChange={(e) => setPendingOte(e.target.value)} style={inputStyle}>
                  <option value="all">Toutes</option>
                  <option value="0.5">0.5 (50%)</option>
                  <option value="0.618">0.618 (Golden)</option>
                  <option value="0.7">0.7 (70%)</option>
                  <option value="0.79">0.79 (Premium)</option>
                  <option value="none">Sans OTE</option>
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Du">
                <input type="date" value={pendingDateFrom} onChange={(e) => setPendingDateFrom(e.target.value)} style={{ ...inputStyle, minHeight: 44, paddingTop: 11, paddingBottom: 11 }} />
              </Field>
              <Field label="Au">
                <input type="date" value={pendingDateTo} onChange={(e) => setPendingDateTo(e.target.value)} style={{ ...inputStyle, minHeight: 44, paddingTop: 11, paddingBottom: 11 }} />
              </Field>
            </div>
          </div>

          {(errOptions.length > 0 || posOptions.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              <Field label="Erreur commise">
                <select value={filterNegative} onChange={(e) => setFilterNegative(e.target.value)} style={inputStyle}>
                  <option value="">Toutes</option>
                  {errOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="Point positif">
                <select value={filterPositive} onChange={(e) => setFilterPositive(e.target.value)} style={inputStyle}>
                  <option value="">Tous</option>
                  {posOptions.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </Field>
            </div>
          )}

          {/* PD Arrays multi-sélection */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              PD Arrays {pendingTags.length > 0 && <span style={{ background: C.purple, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700, marginLeft: 4 }}>{pendingTags.length}</span>}
            </div>
            {pendingTags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                {pendingTags.map(tag => (
                  <div key={tag} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, background: C.purpleDim, border: `1px solid ${C.purpleBright}40`, fontSize: 12, fontWeight: 600, color: C.purpleBright }}>
                    {tag}
                    <button onClick={() => togglePendingTag(tag)} style={{ background: "none", border: "none", color: C.purpleBright, cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ position: "relative" }}>
              <button onClick={() => setPdOpen(v => !v)} style={{
                width: "100%", padding: "11px 14px", borderRadius: 10,
                border: `1px solid ${pdOpen ? (C.focusBorder || C.purple) : C.border}`,
                background: C.inputBg || C.card, color: C.text, fontSize: 13,
                cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "all 0.15s",
              }}>
                <span style={{ color: pendingTags.length === 0 ? C.textMuted : C.text }}>
                  {pendingTags.length === 0 ? "Sélectionner des PD Arrays…" : `${pendingTags.length} sélectionné${pendingTags.length > 1 ? "s" : ""}`}
                </span>
                <ChevronDown size={15} color={C.textMuted} style={{ transform: pdOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
              </button>
              {pdOpen && (
                <>
                  <div onClick={() => setPdOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 99,
                    background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
                    overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", maxHeight: 260, overflowY: "auto",
                  }}>
                    {pdSetupOptions.map((opt, i) => {
                      const sel = pendingTags.includes(opt.name);
                      return (
                        <button key={opt.name} onClick={() => togglePendingTag(opt.name)} style={{
                          width: "100%", padding: "11px 14px", textAlign: "left",
                          background: sel ? C.purpleDim : (C.inputBg || C.card),
                          border: "none", borderBottom: i < pdSetupOptions.length - 1 ? `1px solid ${C.border}` : "none",
                          color: sel ? C.purpleBright : C.text, fontSize: 13, fontWeight: sel ? 600 : 400,
                          cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <span>{opt.name}</span>
                          {sel && <CheckCircle2 size={15} color={C.purpleBright} />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Récap des filtres actifs */}
          {(pendingPair !== "all" || pendingSession !== "all" || pendingResult !== "all" || pendingOte !== "all" || pendingTags.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12, padding: "10px 12px", background: C.purpleDim, borderRadius: 8, border: `1px solid ${C.purpleBright}30` }}>
              <span style={{ fontSize: 11, color: C.purpleBright, fontWeight: 700, marginRight: 4 }}>Filtres actifs :</span>
              {pendingPair !== "all" && <span style={{ fontSize: 11, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "1px 8px", color: C.text }}>{pendingPair}</span>}
              {pendingSession !== "all" && <span style={{ fontSize: 11, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "1px 8px", color: C.text }}>{pendingSession}</span>}
              {pendingResult !== "all" && <span style={{ fontSize: 11, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "1px 8px", color: C.text }}>{pendingResult}</span>}
              {pendingOte !== "all" && <span style={{ fontSize: 11, background: C.tealDim, border: `1px solid ${C.teal}40`, borderRadius: 10, padding: "1px 8px", color: C.teal }}>OTE {pendingOte}</span>}
              {pendingTags.map(t => <span key={t} style={{ fontSize: 11, background: C.purpleDim, border: `1px solid ${C.purpleBright}40`, borderRadius: 10, padding: "1px 8px", color: C.purpleBright }}>{t}</span>)}
            </div>
          )}

          {/* Boutons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={applyFilters} style={{ ...btn.primary, flex: 1, justifyContent: "center", padding: "12px", fontSize: 14, fontWeight: 700 }}>
              <Search size={15} /> Appliquer
            </button>
            {(pendingPair !== "all" || pendingSession !== "all" || pendingResult !== "all" || pendingOte !== "all" || pendingTags.length > 0 || pendingDateFrom || pendingDateTo || filterPositive || filterNegative) && (
              <button onClick={resetFilters} style={{ ...btn.ghost, padding: "12px 16px" }}>
                Tout effacer
              </button>
            )}
          </div>
        </Card>
      )}

      {trades.length === 0 ? (
        <EmptyState icon={NotebookPen} title="Ton journal est vide" text="Chaque trade que tu prends mérite une fiche complète. Commence à documenter." action={<button onClick={onNew} style={{ ...btn.primary, marginTop: 8 }}>Ajouter mon premier trade</button>} />
      ) : filtered.length === 0 ? (
        <div style={{ color: C.textMuted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>Aucun trade ne correspond à ces filtres.</div>
      ) : (
        <>
          {/* Blocs mois accordéon */}
          {!hasActiveFilters && byMonth.map(([monthKey, monthTrades]) => {
            const isOpen = openMonths.has(monthKey);
            const [year, month] = monthKey.split("-");
            const monthLabel = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
            const monthPnl = monthTrades.filter((t) => t.status !== "open").reduce((s, t) => s + (t.resultUsd || 0), 0);
            const monthR = monthTrades.filter((t) => t.status !== "open").reduce((s, t) => s + (t.resultR || 0), 0);
            const wins = monthTrades.filter(t => t.resultR > 0).length;
            return (
              <div key={monthKey} style={{ marginBottom: 16, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <button onClick={() => toggleMonth(monthKey)} style={{
                  width: "100%",
                  background: C.card,
                  border: "none", padding: "14px 16px",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderBottom: isOpen ? `1px solid ${C.border}` : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 8, color: C.textMuted, transform: isOpen ? "rotate(0)" : "rotate(-90deg)", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, textTransform: "capitalize", letterSpacing: 0.2 }}>{monthLabel}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{monthTrades.length} trades · {wins}W/{monthTrades.filter((x) => x.resultR < 0).length}L</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="tnum" style={{ fontSize: 20, fontWeight: 800, color: monthR > 0 ? C.teal : monthR < 0 ? C.red : C.textSecondary, letterSpacing: -0.5 }}>{monthR >= 0 ? "+" : ""}{monthR.toFixed(1)}R</div>
                    <div className="tnum" style={{ fontSize: 11.5, fontWeight: 600, color: monthR > 0 ? C.teal : monthR < 0 ? C.red : C.textSecondary, marginTop: 1 }}>{fmtUsdSigned(monthPnl)}</div>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ background: "transparent", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="desktop-only table-scroll" style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 80px 60px 1fr 90px 70px 80px", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, minWidth: 600 }}>
                        <div>Devise</div><div>Date</div><div>Dir.</div><div>Setup</div><div>P&L</div><div>R</div><div>Statut</div>
                      </div>
                      {monthTrades.map((t) => <TradeRow key={t.id} t={t} onOpen={onOpen} />)}
                    </div>
                    <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {monthTrades.map((t, i) => <MobileTradeCard key={t.id} t={t} onOpen={onOpen} isLast={i === monthTrades.length - 1} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Vue plate filtres actifs */}
          {hasActiveFilters && (
          <>
          <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, background: C.card }} className="desktop-only">
            <div className="table-scroll">
            <div style={{ display: "grid", gridTemplateColumns: "100px 80px 60px 1fr 90px 70px 80px", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, minWidth: 600 }}>
              <div>Devise</div><div>Date</div><div>Dir.</div><div>Setup</div><div>P&L</div><div>R</div><div>Statut</div>
            </div>
            {filtered.map((t) => <TradeRow key={t.id} t={t} onOpen={onOpen} />)}
            </div>
          </div>
          <div className="mobile-only" style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((t, i) => <MobileTradeCard key={t.id} t={t} onOpen={onOpen} isLast={i === filtered.length - 1} />)}
          </div>
          </>
          )}
        </>
      )}
    </div>
  );
}

function QuickTradeModal({ trade, onClose, onPatch, onOpenFull }) {
  const [entry, setEntry] = useState(trade.entryPrice ?? "");
  const [sl, setSl] = useState(trade.stopLoss ?? "");
  const [tp, setTp] = useState(trade.takeProfit ?? "");
  const [dir, setDir] = useState(trade.direction || "long");
  const [before, setBefore] = useState(trade.screenshotBefore || null);
  const [after, setAfter] = useState(trade.screenshotAfter || null);
  const [st, setSt] = useState(trade.status === "open" ? "open" : trade.status === "breakeven" ? "breakeven" : Number(trade.resultR) < 0 ? "loss" : "win");
  const [note, setNote] = useState(trade.retroRating ?? null);
  const [rIn, setRIn] = useState(trade.resultR != null && trade.status !== "open" ? String(Math.abs(trade.resultR)) : "");
  const pf = (v) => String(v ?? "").replace(".", ",");
  const enN = entry === "" ? null : Number(entry), slN = sl === "" ? null : Number(sl), tpN = tp === "" ? null : Number(tp);
  const rrN = enN != null && slN != null && tpN != null && enN !== slN ? Math.abs(tpN - enN) / Math.abs(enN - slN) : null;
  const riskN = Number(trade.riskUsd) || null;
  const liveR = st === "win" ? (rIn !== "" ? Math.abs(Number(rIn)) : rrN) : st === "loss" ? -(rIn !== "" ? Math.abs(Number(rIn)) : 1) : null;
  const liveUsd = liveR != null && riskN ? liveR * riskN : null;
  const save = () => {
    const en = entry === "" ? null : Number(entry), s = sl === "" ? null : Number(sl), t = tp === "" ? null : Number(tp);
    let resultR = st === "open" ? null : st === "breakeven" ? 0 : liveR != null ? Math.round(liveR * 100) / 100 : null;
    const risk = Number(trade.riskUsd) || null;
    onPatch(trade.id, { entryPrice: en, stopLoss: s, takeProfit: t, direction: dir, screenshotBefore: before, screenshotAfter: after,
      status: st === "win" || st === "loss" ? "closed" : st, resultR, resultUsd: resultR == null ? null : risk ? Math.round(resultR * risk * 100) / 100 : trade.resultUsd ?? null, retroRating: note });
    onClose();
  };
  const big = (on, col) => ({ flex: 1, padding: "11px 6px", borderRadius: 12, border: `1.5px solid ${on ? col : C.border}`, background: on ? `${col}1A` : "transparent", color: on ? col : C.textMuted, fontSize: 14, fontWeight: 800, cursor: "pointer" });
  const inp = { ...inputStyle, padding: "10px 11px", fontSize: 15 };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, lineHeight: 1, display: "flex", alignItems: "center", gap: 10 }}><PairLogo pair={trade.pair} size={38} />{trade.pair}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{fmtDateTime(trade.entryTime)}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ ...btn.ghost, padding: 8 }}><X size={16} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
          {[["Entrée", entry, setEntry], ["Stop loss", sl, setSl], ["Take profit", tp, setTp]].map(([l, v, set]) => (
            <div key={l}><div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSecondary, marginBottom: 5 }}>{l}</div>
              <input type="text" inputMode="decimal" value={pf(v)} onChange={(e) => set(autoPrice(e.target.value, trade.pair))} style={inp} aria-label={l} /></div>))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDir("long")} style={big(dir === "long", C.teal)}>↗ Long</button>
          <button onClick={() => setDir("short")} style={big(dir === "short", "#F97316")}>↘ Short</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ImageUploadBox label="Avant" value={before} onChange={setBefore} />
          <ImageUploadBox label="Après" value={after} onChange={setAfter} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["open", "En cours", C.purpleBright], ["win", "Gagné", C.teal], ["loss", "Perdu", C.red]].map(([v, l, col]) => <button key={v} onClick={() => setSt(v)} style={big(st === v, col)}>{l}</button>)}
        </div>
        {(st === "win" || st === "loss") && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, border: `1px solid ${st === "win" ? C.teal : C.red}55`, background: `${st === "win" ? C.teal : C.red}12`, marginTop: -4 }}>
          <input type="number" inputMode="decimal" step="0.1" value={rIn} onChange={(e) => setRIn(e.target.value)} placeholder={st === "win" ? (rrN ? rrN.toFixed(2) : "R") : "1"} aria-label="R" style={{ ...inp, width: 90 }} />
          <span style={{ color: C.textMuted, fontWeight: 800 }}>R</span>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700 }}>{st === "win" ? "TU GAGNES" : "TU PERDS"}</div>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 900, color: st === "win" ? C.teal : C.red }}>{liveUsd != null ? fmtUsdSigned(liveUsd) : liveR != null ? fmtR(liveR) : "—"}</div>
            {liveUsd != null && <div className="tnum" style={{ fontSize: 11.5, color: C.textMuted }}>{fmtR(liveR)} · risque {fmtUsd(riskN)}</div>}
          </div>
        </div>}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSecondary, marginBottom: 6 }}>Note du trade {note ? <b style={{ color: C.text }}>· {note}/10</b> : ""}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => setNote(note === n ? null : n)} style={{ height: 36, borderRadius: 9, border: `1px solid ${note === n ? C.purple : C.border}`, background: note != null && n <= note ? C.purpleDim : "transparent", color: note != null && n <= note ? C.purpleBright : C.textMuted, fontWeight: 800, fontSize: 13, cursor: "pointer", padding: 0 }}>{n}</button>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { onClose(); onOpenFull(trade.id); }} style={{ ...btn.ghost, flex: 1, justifyContent: "center" }}>Détail complet</button>
          <button onClick={save} style={{ ...btn.primary, flex: 2, justifyContent: "center", padding: "12px" }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function TradeRow({ t, onOpen }) {
  const setupTags = (t.tags || []).filter(tag => TAG_CATALOG.find(tc => tc.name === tag && tc.category === "setup"));
  const dxyTags = t.dxyTags || [];
  const isWin = t.resultR > 0;
  const cur = t.status === "open" ? "open" : t.status === "breakeven" ? "breakeven" : isWin ? "win" : "loss";
  const statusColors = { win: C.teal, loss: C.red, breakeven: C.textSecondary, open: C.purple };
  const statusLabels = { win: "Win", loss: "Loss", breakeven: "BE", open: "Ouvert" };
  return (
    <div className="row-hover" onClick={() => onOpen(t.id)} style={{ display: "grid", gridTemplateColumns: "100px 80px 60px 1fr 90px 70px 80px", padding: "10px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", cursor: "pointer", fontSize: 13, minWidth: 560 }}>
      <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 4, height: 24, borderRadius: 2, background: cur === "win" ? C.teal : cur === "loss" ? C.red : C.textMuted, flexShrink: 0, opacity: cur === "open" ? 0.4 : 1 }} /><PairLogo pair={t.pair} size={20} />{t.pair}</div>
      <div style={{ color: C.textMuted, fontSize: 11.5 }}>{fmtDate(t.entryTime)}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.direction === "long" ? "#2D7DD2" : "#F97316" }}>{t.direction === "long" ? "Long" : "Short"}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        {(() => { const ts = t.rules?.tfSetups; const items = Array.isArray(ts) && ts.length ? ts.flatMap((r) => (r.setups || []).map((x) => [x, r.tf])) : setupTags.map((x) => [x, (t.tags || []).find((g) => ["M1","M3","M5","M15","M30","H1","H4","D1","W1","MN"].includes(g)) || ""]);
          return items.slice(0, 3).map(([n, tf]) => <span key={n + tf} style={{ fontSize: 11, fontWeight: 700, color: C.text, background: C.inputBg || C.bg, border: `1px solid ${C.border}`, padding: "2px 8px", borderRadius: 6 }}>{n}{tf ? <span style={{ color: C.purpleBright, marginLeft: 5 }}>{tf}</span> : null}</span>); })()}
        {dxyTags.length > 0 && <>
          <span style={{ color: C.border, fontSize: 14, fontWeight: 300 }}>╱</span>
          {dxyTags.slice(0, 1).map(tag => <span key={tag} style={{ fontSize: 10.5, fontWeight: 600, color: C.amber, background: `${C.amber}15`, border: `1px solid ${C.amber}40`, padding: "2px 7px", borderRadius: 5 }}>DXY·{tag}</span>)}
        </>}
      </div>
      <div className="tnum" style={{ fontWeight: 700, color: t.status === "open" || t.status === "breakeven" ? C.textSecondary : isWin ? C.teal : C.red }}>{t.status === "open" || t.status === "breakeven" ? "—" : fmtUsdSigned(t.resultUsd)}</div>
      <div className="tnum" style={{ color: C.textMuted, fontWeight: 600 }}>{fmtR(t.resultR)}</div>
      <div>
        <span style={{ padding: "3px 9px", borderRadius: 20, background: `${statusColors[cur]}18`, border: `1px solid ${statusColors[cur]}40`, color: statusColors[cur], fontSize: 11, fontWeight: 600 }}>
          {statusLabels[cur]}
        </span>
      </div>
    </div>
  );
}

function MobileTradeCard({ t, onOpen, isLast }) {
  const setupTags = (t.tags || []).filter(tag => TAG_CATALOG.find(tc => tc.name === tag && tc.category === "setup"));
  const tfTags = (t.tags || []).filter(tag => ["M1","M5","M15","M30","H1","H4","D1","W1"].includes(tag));
  const isWin = t.resultR > 0;
  const isBE = t.status === "breakeven";
  const isOpen = t.status === "open";
  const [pressed, setPressed] = useState(false);

  const accentColor = isOpen ? "#5B9BD5" : isBE ? C.textMuted : isWin ? C.teal : C.red;
  const pnlColor = isOpen ? "#5B9BD5" : isBE ? C.textSecondary : isWin ? C.teal : C.red;
  const sessionTag = (t.tags || []).find(tag => ["London Session","New York Session","Asia Session","Hors session"].includes(tag));
  const typeTag = (t.tags || []).find(tag => ["Swing","Day Trading","Scalping"].includes(tag));
  const pnlDisplay = isOpen ? "En cours" : isBE ? "BE" : fmtUsdSigned(t.resultUsd);
  const rDisplay = isOpen ? "" : isBE ? "0.00R" : fmtR(t.resultR);

  const sessionColor = sessionTag === "London Session" ? "#4A7FBF"
    : sessionTag === "New York Session" ? "#C0392B"
    : sessionTag === "Asia Session" ? "#E67E22" : C.textMuted;

  const sessionEmoji = sessionTag === "London Session" ? ""
    : sessionTag === "New York Session" ? ""
    : sessionTag === "Asia Session" ? "" : "";
  const sessionShort = sessionTag === "London Session" ? "London"
    : sessionTag === "New York Session" ? "New York"
    : sessionTag === "Asia Session" ? "Asia" : sessionTag;

  // Couleur des PD Arrays : gris-bleu neutre discret
  const pdColor = C.textSecondary;
  const pdBg = "rgba(200,208,228,0.07)";

  const DirectionLogo = () => (
    <div style={{
      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
      background: t.direction === "long" ? "rgba(45,212,191,0.08)" : "rgba(249,115,22,0.08)",
      border: `1.5px solid ${t.direction === "long" ? "rgba(45,212,191,0.5)" : "rgba(249,115,22,0.5)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {t.direction === "long" ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <polyline points="3,17 9,11 13,15 21,7" stroke={C.teal} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="16,7 21,7 21,12" stroke={C.teal} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <polyline points="3,7 9,13 13,9 21,17" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="16,17 21,17 21,12" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );

  const chips = [
    ...tfTags.map(x => ({ x, c: C.purpleBright, b: C.purpleDim })),
    ...(t.ictModel ? [{ x: t.ictModel, c: "#F5B544", b: "rgba(245,181,68,0.10)" }] : []),
    ...setupTags.map(x => { const def = TAG_CATALOG.find(tc => tc.name === x); return { x, c: def?.color || pdColor, b: def?.color ? `${def.color}14` : pdBg }; }),
    ...(t.oteFib ? [{ x: "OTE " + t.oteFib, c: "#818CF8", b: "rgba(129,140,248,0.10)" }] : []),
  ];
  return (
    <div onClick={() => onOpen(t.id)} onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
      style={{ marginBottom: isLast ? 0 : 6, background: pressed ? C.cardHover : C.card, borderRadius: 12, border: `1px solid ${C.border}`, borderLeft: `3px solid ${accentColor}`, cursor: "pointer", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
      <PairLogo pair={t.pair} size={22} />
      <span style={{ fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: -0.3 }}>{t.pair}</span>
      <DirBadge direction={t.direction} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {fmtDate(t.entryTime)}{t.ictModel ? <span style={{ color: "#F5B544", fontWeight: 700 }}> · {t.ictModel}</span> : null}
      </span>
      <span className="tnum" style={{ fontSize: 15, fontWeight: 800, color: pnlColor, whiteSpace: "nowrap" }}>{isOpen ? "En cours" : isBE ? "BE" : rDisplay}</span>
    </div>
  );
}
/* ============================================================================
   TRADE DETAIL
   ============================================================================ */

function shareTradeCard(trade) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");

  // Fond
  ctx.fillStyle = "#1A2138";
  ctx.fillRect(0, 0, 600, 320);

  // Bande latérale colorée
  const isWin = (trade.resultUsd || 0) >= 0;
  ctx.fillStyle = isWin ? "#2DD4BF" : "#E8554E";
  ctx.fillRect(0, 0, 5, 320);

  // En-tête
  ctx.fillStyle = "#8B7CF6";
  ctx.font = "bold 13px -apple-system, sans-serif";
  ctx.fillText("Edge Journal", 24, 36);

  // Paire + direction
  ctx.fillStyle = "#F5F7FA";
  ctx.font = "bold 32px -apple-system, sans-serif";
  ctx.fillText(`${trade.pair}  ${trade.direction === "long" ? "▲ Long" : "▼ Short"}`, 24, 88);

  // Résultat
  ctx.fillStyle = isWin ? "#2DD4BF" : "#E8554E";
  ctx.font = "bold 28px -apple-system, sans-serif";
  const resultText = trade.resultUsd != null ? `${trade.resultUsd >= 0 ? "+" : ""}$${trade.resultUsd?.toFixed(2)}` : "—";
  ctx.fillText(resultText, 24, 136);

  // Ligne séparatrice
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath(); ctx.moveTo(24, 158); ctx.lineTo(576, 158); ctx.stroke();

  // Stats en grille
  const stats = [
    ["Entrée", trade.entryPrice ?? "—"],
    ["SL", trade.stopLoss ?? "—"],
    ["TP", trade.takeProfit ?? "—"],
    ["R obtenu", trade.resultR != null ? `${trade.resultR >= 0 ? "+" : ""}${trade.resultR?.toFixed(2)}R` : "—"],
    ["Session", getSession(trade.entryTime)],
    ["Date", new Date(trade.entryTime).toLocaleDateString("fr-FR")],
  ];
  stats.forEach(([label, value], i) => {
    const x = 24 + (i % 3) * 192;
    const y = 190 + Math.floor(i / 3) * 60;
    ctx.fillStyle = "#8891B0";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillText(label.toUpperCase(), x, y);
    ctx.fillStyle = "#F5F7FA";
    ctx.font = "bold 15px -apple-system, sans-serif";
    ctx.fillText(String(value), x, y + 20);
  });

  // Tags
  if (trade.tags?.length > 0) {
    ctx.fillStyle = "#8891B0";
    ctx.font = "11px -apple-system, sans-serif";
    ctx.fillText(trade.tags.slice(0, 4).join(" · "), 24, 305);
  }

  // Export
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${trade.pair}_${trade.direction}_${new Date(trade.entryTime).toISOString().slice(0,10)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

function LightBox({ src, label, onClose }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{label} · Tap pour fermer</div>
      <img src={src} alt={label} onClick={e => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 10, objectFit: "contain", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
    </div>
  );
}

function SimulateurTP({ trade }) {
  const [simR, setSimR] = useState(1);
  const targets = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
  const realR = trade.resultR || 0;
  const realPnl = trade.resultUsd || 0;
  const simPnl = (trade.riskUsd || 0) * simR;
  const diff = simPnl - realPnl;

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <Target size={15} color={C.purpleBright} />
        <CardLabel style={{ margin: 0 }}>Simulateur de TP</CardLabel>
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
        Si j'avais visé <strong style={{ color: C.text }}>{simR}R</strong> au lieu de {realR >= 0 ? "+" : ""}{realR.toFixed(2)}R réel :
      </div>

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
        {targets.map(r => {
          const active = simR === r;
          return (
            <button key={r} onClick={() => setSimR(r)} style={{
              padding: "7px 11px", borderRadius: 7, fontSize: 12, fontWeight: active ? 700 : 500,
              border: `1.5px solid ${active ? C.teal : C.border}`,
              background: active ? C.tealDim : (C.inputBg || C.card),
              color: active ? C.teal : C.textMuted, cursor: "pointer", transition: "all 0.12s",
            }}>{r}R</button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div style={{ padding: "12px 10px", borderRadius: 9, background: C.inputBg || C.card, border: `1px solid ${C.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 9.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Réel</div>
          <div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: realPnl >= 0 ? C.teal : C.red }}>{realPnl >= 0 ? "+" : ""}{realPnl.toFixed(0)}$</div>
          <div className="tnum" style={{ fontSize: 11, color: realPnl >= 0 ? C.teal : C.red, opacity: 0.8 }}>{realR >= 0 ? "+" : ""}{realR.toFixed(2)}R</div>
        </div>
        <div style={{ padding: "12px 10px", borderRadius: 9, background: C.tealDim, border: `1.5px solid ${C.teal}`, textAlign: "center" }}>
          <div style={{ fontSize: 9.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Simulé</div>
          <div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: C.teal }}>+{simPnl.toFixed(0)}$</div>
          <div className="tnum" style={{ fontSize: 11, color: C.teal, opacity: 0.8 }}>+{simR}R</div>
        </div>
        <div style={{ padding: "12px 10px", borderRadius: 9, background: diff >= 0 ? "rgba(45,212,191,0.06)" : C.redDim, border: `1px solid ${diff >= 0 ? C.teal : C.red}40`, textAlign: "center" }}>
          <div style={{ fontSize: 9.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Écart</div>
          <div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: diff >= 0 ? C.teal : C.red }}>{diff >= 0 ? "+" : ""}{diff.toFixed(0)}$</div>
          <div style={{ fontSize: 11, color: diff >= 0 ? C.teal : C.red }}>{diff >= 0 ? "Mieux" : "Moins bien"}</div>
        </div>
      </div>

      <div style={{ padding: "9px 12px", background: C.inputBg || C.card, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.textSecondary, lineHeight: 1.55 }}>
        {simR < Math.abs(realR) && realPnl > 0 && "Tu avais raison de garder — ton TP réel a rapporté davantage."}
        {simR > Math.abs(realR) && realPnl > 0 && `Avec un TP à ${simR}R tu aurais gagné ${Math.abs(diff).toFixed(0)}$ de plus. Élargir ton TP sur ce setup peut valoir le coup.`}
        {simR < Math.abs(realR) && realPnl < 0 && `Si tu avais coupé à ${simR}R tu aurais limité la perte à ${Math.abs(simPnl).toFixed(0)}$.`}
        {simR > Math.abs(realR) && realPnl < 0 && "Ce trade a été perdant. Garder plus longtemps n'aurait pas changé l'issue."}
        {Math.abs(simR - Math.abs(realR)) < 0.01 && "C'est exactement ton résultat réel."}
      </div>
    </Card>
  );
}

function PdRuleRow({ tag, color, value, onChange }) {
  const resp = value || null;
  const setResp = (v) => onChange(v);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: C.inputBg || C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{tag}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => setResp(resp === "ok" ? null : "ok")} style={{
          padding: "5px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: resp === "ok" ? 700 : 400,
          border: `1.5px solid ${resp === "ok" ? C.teal : C.border}`,
          background: resp === "ok" ? C.tealDim : "transparent",
          color: resp === "ok" ? C.teal : C.textMuted, cursor: "pointer",
        }}><Check size={14} style={{ verticalAlign: -2 }} /> Respecté</button>
        <button onClick={() => setResp(resp === "no" ? null : "no")} style={{
          padding: "5px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: resp === "no" ? 700 : 400,
          border: `1.5px solid ${resp === "no" ? C.red : C.border}`,
          background: resp === "no" ? C.redDim : "transparent",
          color: resp === "no" ? C.red : C.textMuted, cursor: "pointer",
        }}><X size={14} style={{ verticalAlign: -2 }} /> Non</button>
      </div>
    </div>
  );
}

function SimulateurTPMasquable({ trade }) {
  const [show, setShow] = useState(false);
  return (
    <Card style={{ padding: 16 }}>
      <button onClick={() => setShow(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Target size={14} color={C.purpleBright} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Simulateur de TP</span>
        </div>
        <ChevronDown size={14} color={C.textMuted} style={{ transform: show ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
      </button>
      {show && <div style={{ marginTop: 14 }}><SimulateurTP trade={trade} /></div>}
    </Card>
  );
}

function AmeliorerSection({ appSettings, trade, onPatch }) {
  const negChecked = trade.mistakes || [];
  const posChecked = trade.positives || [];
  const toggleNeg = (err) => onPatch({ mistakes: negChecked.includes(err) ? negChecked.filter(e => e !== err) : [...negChecked, err] });
  const togglePos = (p) => onPatch({ positives: posChecked.includes(p) ? posChecked.filter(e => e !== p) : [...posChecked, p] });

  const hiddenErrors = appSettings?.hiddenErrors || [];
  const customErrors = appSettings?.customErrors || [];
  const errors = [...DEFAULT_ERRORS.filter(e => !hiddenErrors.includes(e)), ...customErrors];
  const positives = [...DEFAULT_POSITIVES, ...(appSettings?.customPositives || [])];

  const CheckItem = ({ label, checked, onToggle, color }) => (
    <button onClick={() => onToggle(label)} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
      borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%",
      background: checked ? `${color}10` : (C.inputBg || C.card),
      border: `1px solid ${checked ? color + "50" : C.border}`, transition: "all 0.12s",
    }}>
      <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${checked ? color : C.border}`, background: checked ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {checked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>}
      </div>
      <span style={{ fontSize: 12.5, color: checked ? color : C.text, fontWeight: checked ? 600 : 400 }}>{label}</span>
    </button>
  );

  return (
    <>
      {/* Points positifs */}
      <Card style={{ padding: 16 }}>
        <CardLabel>Points positifs</CardLabel>
        <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 10, marginTop: 4 }}>Ce que tu as bien fait sur ce trade</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {positives.map(p => <CheckItem key={p} label={p} checked={posChecked.includes(p)} onToggle={togglePos} color={C.teal} />)}
        </div>
        {posChecked.length > 0 && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: C.tealDim, borderRadius: 7, border: `1px solid ${C.teal}30` }}>
            <span style={{ fontSize: 11, color: C.teal }}>{posChecked.join(" · ")}</span>
          </div>
        )}
      </Card>

      {/* Points à améliorer */}
      <Card style={{ padding: 16 }}>
        <CardLabel>À améliorer</CardLabel>
        <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 10, marginTop: 4 }}>Erreurs commises sur ce trade</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {errors.map(err => <CheckItem key={err} label={err} checked={negChecked.includes(err)} onToggle={toggleNeg} color={C.red} />)}
        </div>
        {negChecked.length > 0 && (
          <div style={{ marginTop: 10, padding: "8px 12px", background: C.redDim, borderRadius: 7, border: `1px solid ${C.red}30` }}>
            <span style={{ fontSize: 11, color: C.red }}>{negChecked.length} erreur{negChecked.length > 1 ? "s" : ""} · {negChecked.join(" · ")}</span>
          </div>
        )}
      </Card>
    </>
  );
}

function TradeDetail({ trade, onBack, onEdit, onDelete, onVerdictChange, onRetroSave, onPatch, appSettings }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState("avant");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState("");
  const [retroNote, setRetroNote] = useState(trade?.retroNote || "");
  const [retroRating, setRetroRating] = useState(trade?.retroRating || 0);
  const [imgZoom, setImgZoom] = useState(null);

  const handleRetroRating = (val) => {
    setRetroRating(val);
    if (onRetroSave && trade?.id) onRetroSave(trade.id, { retroRating: val, retroNote });
  };
  const handleRetroNote = (val) => {
    setRetroNote(val);
    if (onRetroSave && trade?.id) onRetroSave(trade.id, { retroRating, retroNote: val });
  };

  const runAiAnalysis = async () => {
    setAiLoading(true); setAiError("");
    try { setAiAnalysis(await getSingleTradeAnalysis(trade)); }
    catch (e) { setAiError(e.message || "L'analyse a échoué."); }
    finally { setAiLoading(false); }
  };

  if (!trade) return (
    <div className="fade-in">
      <BackLink onClick={onBack}>Retour au journal</BackLink>
      <EmptyState icon={NotebookPen} title="Trade introuvable" text="Ce trade a peut-être été supprimé." />
    </div>
  );

  const isWin = trade.resultR > 0;
  const isBE = trade.status === "breakeven";

  const TABS = [
    { id: "avant", label: trade.pair || "Paire" },
    { id: "apres", label: "DXY" },
    { id: "retour", label: "Retour" },
  ];

  return (
    <div className="fade-in" style={{ maxWidth: 680 }}>
      {imgZoom && <LightBox src={imgZoom.src} label={imgZoom.label} onClose={() => setImgZoom(null)} />}
      <BackLink onClick={onBack}>Retour au journal</BackLink>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 10, marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 26 }}>{trade.pair}</span>
            <DirBadge direction={trade.direction} size="lg" />
            <ResultBadge resultR={trade.resultR} status={trade.status} />
          </div>
          <div style={{ fontSize: 12, color: C.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={12} /> {fmtDateTime(trade.entryTime)} · {getSession(trade.entryTime)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onEdit(trade)} style={btn.ghost}><Edit3 size={13} /> Modifier</button>
          <button onClick={() => shareTradeCard(trade)} style={btn.ghost} aria-label="Partager"><Share2 size={15} /></button>
          {confirmDelete
            ? <button onClick={() => onDelete(trade.id)} style={{ ...btn.ghost, color: C.red, borderColor: `${C.red}50` }}>Confirmer</button>
            : <button onClick={() => setConfirmDelete(true)} style={btn.icon}><Trash2 size={14} /></button>
          }
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, marginBottom: 18, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, background: C.inputBg || C.card }}>
        {TABS.map((tab, i) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "11px 8px", border: "none",
            borderRight: i < TABS.length - 1 ? `1px solid ${C.border}` : "none",
            background: activeTab === tab.id ? C.purple : "transparent",
            color: activeTab === tab.id ? "#fff" : C.textMuted,
            fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400,
            cursor: "pointer", transition: "all 0.15s",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Swipe */}
      <div onTouchStart={e => { window._swipeX = e.touches[0].clientX; }} onTouchEnd={e => {
        const diff = (window._swipeX||0) - e.changedTouches[0].clientX;
        const tabs = ["avant","apres","retour"];
        const cur = tabs.indexOf(activeTab);
        if (Math.abs(diff) > 50) { if (diff > 0 && cur < 2) setActiveTab(tabs[cur+1]); if (diff < 0 && cur > 0) setActiveTab(tabs[cur-1]); }
      }}>

      {/* ─── ONGLET 1 : PAIRE ─── */}
      {activeTab === "avant" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, padding: "5px 8px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Avant</div>
              {trade.screenshotBefore
                ? <img src={trade.screenshotBefore} onClick={() => setImgZoom({ src: trade.screenshotBefore, label: trade.pair + " — Avant" })} style={{ width: "100%", display: "block", cursor: "zoom-in" }} />
                : <div style={{ padding: "32px 8px", textAlign: "center", color: C.textMuted, fontSize: 11 }}>Aucune photo</div>}
            </Card>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, padding: "5px 8px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Après</div>
              {trade.screenshotAfter
                ? <img src={trade.screenshotAfter} onClick={() => setImgZoom({ src: trade.screenshotAfter, label: trade.pair + " — Après" })} style={{ width: "100%", display: "block", cursor: "zoom-in" }} />
                : <div style={{ padding: "32px 8px", textAlign: "center", color: C.textMuted, fontSize: 11 }}>Aucune photo</div>}
            </Card>
          </div>

          <Card style={{ padding: 16 }}>
            <CardLabel>Identification</CardLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <DetailStat label="Paire" value={trade.pair} />
              <DetailStat label="Direction" value={trade.direction === "long" ? "Long" : "Short"} valueColor={trade.direction === "long" ? "#4A9EFF" : "#F97316"} />
              <DetailStat label="Session" value={getSession(trade.entryTime) || "—"} />
              <DetailStat label="Timeframe" value={(trade.tags || []).find(t => ["M1","M5","M15","M30","H1","H4","D1","W1"].includes(t)) || "—"} />
              {trade.tfAlignment && <DetailStat label="TF sup." value={trade.tfAlignment + (trade.tfAlignmentSetup ? " · " + trade.tfAlignmentSetup : "")} />}
              {trade.oteFib && <DetailStat label="Zone OTE" value={trade.oteFib} valueColor={C.teal} />}
              <DetailStat label="Killzone" value={killzoneLabel(trade.entryTime) + (silverBulletAt(trade.entryTime) ? " · Silver Bullet" : "")} />
              {trade.ictModel && <DetailStat label="Modèle ICT" value={trade.ictModel} valueColor={C.purpleBright} />}
              {trade.htfBias && <DetailStat label="Biais HTF" value={trade.htfBias} valueColor={htfAligned(trade) ? C.teal : C.red} />}
              {trade.pdZone && <DetailStat label="Zone" value={trade.pdZone} valueColor={pdAligned(trade) === false ? C.red : C.teal} />}
              {trade.sweptLiquidity && <DetailStat label="Liquidité prise" value={trade.sweptLiquidity} />}
              {trade.drawOnLiquidity && <DetailStat label="Draw on liquidity" value={trade.drawOnLiquidity} />}
              {trade.confidenceLevel > 0 && <DetailStat label="Confiance" value={trade.confidenceLevel + "/10"} valueColor={trade.confidenceLevel >= 7 ? C.teal : trade.confidenceLevel >= 4 ? C.amber : C.red} />}
            </div>
          </Card>

          {((trade.tags || []).filter(t => TAG_CATALOG.find(tc => tc.name === t && tc.category === "setup")).length > 0) && (
            <Card style={{ padding: 16 }}>
              <CardLabel>PD Arrays / Setup</CardLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {(trade.tags || []).filter(t => TAG_CATALOG.find(tc => tc.name === t && tc.category === "setup")).map(tag => <TagBadge key={tag} name={tag} />)}
              </div>
            </Card>
          )}

          {trade.notes && (
            <Card style={{ padding: 16 }}>
              <CardLabel>Notes</CardLabel>
              <p style={{ fontSize: 13, lineHeight: 1.6, margin: "10px 0 0", color: C.text, whiteSpace: "pre-wrap" }}>{trade.notes}</p>
            </Card>
          )}

          {/* Résultat condensé dans onglet Paire */}
          {trade.status !== "open" && (
            <Card style={{ padding: 16 }}>
              <CardLabel>Résultat</CardLabel>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1, padding: "12px", borderRadius: 9, background: isBE ? "rgba(107,115,136,0.1)" : isWin ? C.tealDim : C.redDim, border: `1.5px solid ${isBE ? C.textMuted : isWin ? C.teal : C.red}40`, textAlign: "center" }}>
                  <div className="tnum" style={{ fontSize: 20, fontWeight: 800, color: isBE ? C.textSecondary : isWin ? C.teal : C.red }}>{isBE ? "BE" : fmtUsdSigned(trade.resultUsd)}</div>
                  <div className="tnum" style={{ fontSize: 12, color: isBE ? C.textMuted : isWin ? C.teal : C.red, marginTop: 2 }}>{isBE ? "0R" : fmtR(trade.resultR)}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, flex: 2 }}>
                  <DetailStat label="Entrée" value={trade.entryPrice ?? "—"} />
                  <DetailStat label="Sortie" value={trade.exitPrice ?? "—"} />
                  <DetailStat label="SL" value={trade.stopLoss ?? "—"} valueColor={C.red} />
                  <DetailStat label="TP" value={trade.takeProfit ?? "—"} valueColor={C.teal} />
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ─── ONGLET 2 : DXY ─── */}
      {activeTab === "apres" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 9.5, color: C.amber, padding: "5px 8px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>DXY — Avant</div>
              {trade.dxyScreenshotBefore
                ? <img src={trade.dxyScreenshotBefore} onClick={() => setImgZoom({ src: trade.dxyScreenshotBefore, label: "DXY — Avant" })} style={{ width: "100%", display: "block", cursor: "zoom-in" }} />
                : <div style={{ padding: "32px 8px", textAlign: "center", color: C.textMuted, fontSize: 11 }}>Aucune photo</div>}
            </Card>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 9.5, color: C.amber, padding: "5px 8px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>DXY — Après</div>
              {trade.dxyScreenshotAfter
                ? <img src={trade.dxyScreenshotAfter} onClick={() => setImgZoom({ src: trade.dxyScreenshotAfter, label: "DXY — Après" })} style={{ width: "100%", display: "block", cursor: "zoom-in" }} />
                : <div style={{ padding: "32px 8px", textAlign: "center", color: C.textMuted, fontSize: 11 }}>Aucune photo</div>}
            </Card>
          </div>

          {(trade.dxyBias || (trade.dxyTags || []).length > 0) && (
            <Card style={{ padding: 16 }}>
              <CardLabel>Analyse DXY</CardLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {trade.dxyBias && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: C.textMuted }}>Biais :</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: trade.dxyBias === "Bullish" ? C.teal : trade.dxyBias === "Bearish" ? C.red : C.textMuted }}>{trade.dxyBias}</span>
                  </div>
                )}
                {(trade.dxyTags || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>PD Arrays DXY :</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {(trade.dxyTags || []).map(tag => (
                        <span key={tag} style={{ fontSize: 11.5, fontWeight: 600, color: C.amber, background: `${C.amber}12`, border: `1px solid ${C.amber}35`, padding: "3px 10px", borderRadius: 6 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card style={{ padding: 16 }}>
            <CardLabel>Résultat</CardLabel>
            <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, padding: "14px 12px", borderRadius: 10, background: isBE ? "rgba(107,115,136,0.1)" : isWin ? C.tealDim : C.redDim, border: `1.5px solid ${isBE ? C.textMuted : isWin ? C.teal : C.red}40`, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Résultat $</div>
                <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: isBE ? C.textSecondary : isWin ? C.teal : C.red }}>{isBE ? "BE" : fmtUsdSigned(trade.resultUsd)}</div>
              </div>
              <div style={{ flex: 1, padding: "14px 12px", borderRadius: 10, background: isBE ? "rgba(107,115,136,0.1)" : isWin ? C.tealDim : C.redDim, border: `1.5px solid ${isBE ? C.textMuted : isWin ? C.teal : C.red}40`, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Résultat R</div>
                <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: isBE ? C.textSecondary : isWin ? C.teal : C.red }}>{isBE ? "0R" : fmtR(trade.resultR)}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <DetailStat label="Entrée" value={trade.entryPrice ?? "—"} />
              <DetailStat label="Sortie" value={trade.exitPrice ?? "—"} />
              <DetailStat label="Stop Loss" value={trade.stopLoss ?? "—"} valueColor={C.red} />
              <DetailStat label="Take Profit" value={trade.takeProfit ?? "—"} valueColor={C.teal} />
              <DetailStat label="Taille" value={trade.positionSize ? trade.positionSize + " lot" : "—"} />
              <DetailStat label="Risque $" value={trade.riskUsd ? fmtUsd(trade.riskUsd) : "—"} />
            </div>
          </Card>
        </div>
      )}

      {/* ─── ONGLET 3 : RETOUR ─── */}
      {activeTab === "retour" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <CardLabel style={{ margin: 0 }}>Confiance avant</CardLabel>
              <span className="tnum" style={{ fontSize: 20, fontWeight: 800, color: (trade.confidenceLevel||0) <= 3 ? C.red : (trade.confidenceLevel||0) <= 5 ? C.amber : (trade.confidenceLevel||0) <= 7 ? C.teal : C.purpleBright }}>
                {trade.confidenceLevel ? trade.confidenceLevel + "/10" : "—"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => {
                const col = n <= 3 ? C.red : n <= 5 ? C.amber : n <= 7 ? C.teal : C.purpleBright;
                return <div key={n} style={{ flex: 1, height: 10, borderRadius: 3, background: n <= (trade.confidenceLevel||0) ? col : (C.inputBg||C.card), border: `1px solid ${n <= (trade.confidenceLevel||0) ? col : C.border}` }} />;
              })}
            </div>
          </Card>

          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <CardLabel style={{ margin: 0 }}>Qualité (après)</CardLabel>
              <span className="tnum" style={{ fontSize: 20, fontWeight: 800, color: retroRating <= 0 ? C.textMuted : retroRating <= 3 ? C.red : retroRating <= 5 ? C.amber : retroRating <= 7 ? C.teal : C.purpleBright }}>
                {retroRating > 0 ? retroRating + "/10" : "—"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => {
                const col = n <= 3 ? C.red : n <= 5 ? C.amber : n <= 7 ? C.teal : C.purpleBright;
                return <button key={n} onClick={() => handleRetroRating(n === retroRating ? 0 : n)} style={{ flex: 1, height: 28, borderRadius: 4, border: `1.5px solid ${n <= retroRating ? col : C.border}`, cursor: "pointer", background: n <= retroRating ? col : (C.inputBg||C.card), transition: "all 0.1s" }} />;
              })}
            </div>
          </Card>

          {trade.confidenceLevel > 0 && retroRating > 0 && (
            <Card style={{ padding: 14, background: `${Math.abs(retroRating - trade.confidenceLevel) <= 1 ? C.teal : C.amber}12`, border: `1px solid ${Math.abs(retroRating - trade.confidenceLevel) <= 1 ? C.teal : C.amber}40` }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 3 }}>
                {Math.abs(retroRating - trade.confidenceLevel) <= 1 ? "Bonne calibration" : retroRating > trade.confidenceLevel ? "Meilleur que prévu" : "Moins bon que prévu"}
              </div>
              <div style={{ fontSize: 12, color: C.textSecondary }}>Avant {trade.confidenceLevel}/10 · Après {retroRating}/10</div>
            </Card>
          )}

          {((trade.tags || []).filter(t => TAG_CATALOG.find(tc => tc.name === t && tc.category === "setup")).length > 0 || (trade.dxyTags || []).length > 0) && (
            <Card style={{ padding: 16 }}>
              <CardLabel>Règles respectées</CardLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {(trade.tags || []).filter(t => TAG_CATALOG.find(tc => tc.name === t && tc.category === "setup")).map(tag => {
                  const def = TAG_CATALOG.find(t => t.name === tag);
                  return <PdRuleRow key={tag} tag={tag} value={(trade.rules || {})[tag]} onChange={(v) => { const nr = { ...(trade.rules || {}) }; if (v) nr[tag] = v; else delete nr[tag]; onPatch && onPatch(trade.id, { rules: nr }); }} color={def?.color || C.purpleBright} />;
                })}
                {(trade.dxyTags || []).length > 0 && <>
                  <div style={{ fontSize: 10, color: C.amber, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>DXY</div>
                  {(trade.dxyTags || []).map(tag => <PdRuleRow key={"dxy_" + tag} tag={"DXY " + tag} value={(trade.rules || {})["DXY " + tag]} onChange={(v) => { const k = "DXY " + tag; const nr = { ...(trade.rules || {}) }; if (v) nr[k] = v; else delete nr[k]; onPatch && onPatch(trade.id, { rules: nr }); }} color={C.amber} />)}
                </>}
              </div>
            </Card>
          )}

          {/* À améliorer — bullets cochables */}
          <AmeliorerSection appSettings={appSettings} trade={trade} onPatch={(p) => onPatch && onPatch(trade.id, p)} />

          {/* Simulateur TP masquable */}
          {trade.riskUsd && trade.status !== "open" && <SimulateurTPMasquable trade={trade} />}

          <Card style={{ padding: 16 }}>
            <CardLabel>Rétrospective</CardLabel>
            <textarea rows={5} value={retroNote} onChange={e => handleRetroNote(e.target.value)} placeholder="Qu'est-ce qui s'est passé ? Leçons ?" style={{ ...inputStyle, resize: "vertical", marginTop: 10, lineHeight: 1.6 }} />
          </Card>

          <Card style={{ padding: 16 }}>
            <CardLabel>Ce trade était</CardLabel>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={() => onVerdictChange(trade.id, trade.verdict === "good" ? null : "good")} style={{ flex: 1, padding: "14px 12px", borderRadius: 12, fontSize: 26, border: `2px solid ${trade.verdict === "good" ? C.teal : C.border}`, background: trade.verdict === "good" ? C.tealDim : (C.inputBg||C.card), cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <ThumbsUp size={22} color={trade.verdict === "good" ? C.teal : C.textMuted} /><div style={{ fontSize: 12, color: trade.verdict === "good" ? C.teal : C.textMuted, fontWeight: 600 }}>Bon trade</div>
              </button>
              <button onClick={() => onVerdictChange(trade.id, trade.verdict === "bad" ? null : "bad")} style={{ flex: 1, padding: "14px 12px", borderRadius: 12, fontSize: 26, border: `2px solid ${trade.verdict === "bad" ? C.red : C.border}`, background: trade.verdict === "bad" ? C.redDim : (C.inputBg||C.card), cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <ThumbsDown size={22} color={trade.verdict === "bad" ? C.red : C.textMuted} /><div style={{ fontSize: 12, color: trade.verdict === "bad" ? C.red : C.textMuted, fontWeight: 600 }}>Mauvais trade</div>
              </button>
            </div>
          </Card>

          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Brain size={14} color={C.purpleBright} /><span style={{ fontSize: 13, fontWeight: 700 }}>Analyse IA</span></div>
              <button onClick={runAiAnalysis} disabled={aiLoading} style={{ ...btn.ghost, fontSize: 11.5, padding: "6px 11px", opacity: aiLoading ? 0.5 : 1 }}>
                {aiLoading ? "⟳" : <Sparkles size={12} />} {aiAnalysis ? "Réanalyser" : "Analyser"}
              </button>
            </div>
            {aiError && <div style={{ color: C.red, fontSize: 12, padding: "9px 11px", background: C.redDim, borderRadius: 7 }}>{aiError}</div>}
            {!aiAnalysis && !aiLoading && <div style={{ textAlign: "center", padding: "16px", color: C.textMuted, fontSize: 12 }}>Clique sur "Analyser" pour une lecture IA.</div>}
            {aiLoading && <div style={{ textAlign: "center", padding: "16px", color: C.textSecondary, fontSize: 12 }}>Analyse en cours…</div>}
            {aiAnalysis && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>
                {aiAnalysis.split("\n").map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", background: C.inputBg||C.card, borderRadius: 7, border: `1px solid ${C.border}` }}>
                    <Sparkles size={12} color={C.purpleBright} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12.5, color: C.text, lineHeight: 1.55 }}>{line}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}

function RatingDisplay({ label, value, color }) {
  return (
    <div style={{ textAlign: "center", padding: "10px 4px", background: C.bg, borderRadius: 7, border: `1px solid ${C.border}` }}>
      <div className="tnum" style={{ fontSize: 17, fontWeight: 800, color: color || C.purpleBright }}>{value}</div>
      <div style={{ fontSize: 9.5, color: C.textMuted, marginTop: 2 }}>{label}</div>
    </div>
  );
}



function DetailStat({ label, value, valueColor }) {
  return (
    <Card style={{ padding: "11px 13px" }}>
      <div style={{ fontSize: 10.5, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700, marginBottom: 5 }}>{label}</div>
      <div className="tnum" style={{ fontWeight: 700, fontSize: 14.5, color: valueColor || C.text }}>{value}</div>
    </Card>
  );
}

/* ============================================================================
   TRADE FORM
   ============================================================================ */

/* ============================================================================
   SMART CAPTURE BOX — upload du screenshot "avant" avec extraction auto
   ============================================================================ */

function SmartCaptureBox({ value, onChange, onExtracted }) {
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [smartFocused, setSmartFocused] = useState(false);



  const handleFile = async (file) => {
    setError("");
    setResult(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Le fichier doit être une image."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image trop lourde (max 10 Mo)."); return; }

    // Aperçu local immédiat (base64 temporaire)
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);

    setStatus("analyzing");
    try {
      // Upload vers Supabase Storage en parallèle avec l'analyse IA
      const [extracted, storageUrl] = await Promise.all([
        extractTradeFromScreenshot(file).catch(() => null),
        uploadToStorage(file).catch(() => null),
      ]);

      // Remplace le base64 par l'URL permanente si upload réussi
      if (storageUrl) onChange(storageUrl);

      if (extracted) {
        setResult(extracted);
        setStatus("done");
        onExtracted(extracted);
      } else {
        setStatus("failed");
        setError("Analyse auto échouée — champs à remplir manuellement.");
      }
    } catch (e) {
      setStatus("failed");
      setError(e.message || "Erreur lors de l'upload.");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary }}>Screenshot avant le trade (TradingView)</div>
        {status === "analyzing" && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.purpleBright, fontWeight: 600 }}>
            <Sparkles size={12} className="spin-slow" /> Analyse en cours…
          </span>
        )}
        {status === "done" && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.teal, fontWeight: 600 }}>
            <CheckCircle2 size={12} /> Champs détectés
          </span>
        )}
      </div>

      <div
        onClick={() => { if (!value) fileRef.current?.click(); }}
        onFocus={() => setSmartFocused(true)}
        onBlur={() => setSmartFocused(false)}
        onPaste={(e) => {
          const items = e.clipboardData?.items;
          if (!items) return;
          for (const item of items) {
            if (item.type.startsWith("image/")) { e.preventDefault(); e.stopPropagation(); handleFile(item.getAsFile()); return; }
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) handleFile(file); }}
        tabIndex={0}
        style={{
          border: `1.5px dashed ${status === "analyzing" ? C.purple : smartFocused ? C.focusBorder || C.purple : C.border}`,
          borderRadius: 10, cursor: value ? "default" : "pointer", overflow: "hidden",
          position: "relative", background: C.inputBg || C.card,
          minHeight: value ? "auto" : 140,
          display: "flex", alignItems: "center", justifyContent: "center",
          outline: "none",
          boxShadow: smartFocused ? (C.focusShadow || "0 0 0 3px rgba(124,92,252,0.14)") : "none",
        }}>
        {value ? (
          <>
            <img src={value} alt="Screenshot avant le trade" style={{ width: "100%", display: "block", maxHeight: 320, objectFit: "contain" }} />
            {status === "analyzing" && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(15,17,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, padding: "8px 14px", borderRadius: 20, border: `1px solid ${C.borderLight}` }}>
                  <Sparkles size={14} color={C.purpleBright} className="spin-slow" />
                  <span style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>Lecture du graphique…</span>
                </span>
              </div>
            )}
            <button onClick={(e) => { e.stopPropagation(); onChange(null); setStatus("idle"); setResult(null); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(15,17,23,0.9)", border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, padding: 5, cursor: "pointer", display: "flex" }}>
              <X size={12} />
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", color: C.textMuted, padding: 20 }}>
            <Sparkles size={20} strokeWidth={1.5} style={{ marginBottom: 7, color: C.purpleBright, display: "block", margin: "0 auto 8px" }} />
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>Screenshot TradingView</div>
            <div style={{ fontSize: 11, marginBottom: 6 }}>{smartFocused ? "Case active — colle maintenant" : "Clique · Glisse · ou colle avec"}</div>
            <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
              <kbd style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 6px", fontSize: 10, color: C.textSecondary }}>⌘V</kbd>
              <kbd style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 6px", fontSize: 10, color: C.textSecondary }}>Ctrl+V</kbd>
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>Extraction auto entry / SL / TP / direction</div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: C.red, fontSize: 11.5, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {status === "done" && result && (
        <div style={{ marginTop: 10, padding: "12px 14px", background: C.inputBg || C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
          {/* Score global */}
          {(() => {
            const fields = ["pairConfidence","directionConfidence","entryConfidence","stopLossConfidence","takeProfitConfidence"];
            const scores = { high: 3, medium: 2, low: 1, none: 0 };
            const total = fields.reduce((s, f) => s + (scores[result[f]] || 0), 0);
            const max = fields.length * 3;
            const pct = Math.round((total / max) * 100);
            const color = pct >= 70 ? C.teal : pct >= 40 ? "#D89A2E" : C.red;
            const label = pct >= 70 ? "Extraction fiable" : pct >= 40 ? "Vérification recommandée" : "Extraction incomplète";
            return (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkles size={13} color={color} />
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
                  </div>
                  <span className="tnum" style={{ fontSize: 13, fontWeight: 800, color }}>{pct}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: C.border, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: color, transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })()}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <ConfidenceRow label="Paire" value={result.pair} confidence={result.pairConfidence} />
            <ConfidenceRow label="Direction" value={result.direction === "long" ? "Long" : result.direction === "short" ? "Short" : null} confidence={result.directionConfidence} />
            <ConfidenceRow label="Entrée" value={result.entryPrice} confidence={result.entryConfidence} />
            <ConfidenceRow label="Stop loss" value={result.stopLoss} confidence={result.stopLossConfidence} />
            <ConfidenceRow label="Take profit" value={result.takeProfit} confidence={result.takeProfitConfidence} />
          </div>
          {(result.riskReward || result.timeframe) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              {result.riskReward && <ExtractedChip label="R:R affiché" value={result.riskReward} />}
              {result.timeframe && <ExtractedChip label="Timeframe" value={result.timeframe} />}
            </div>
          )}
          <div style={{ fontSize: 10.5, color: C.textSecondary, marginTop: 10 }}>Corrige les champs ci-dessous si une confiance est faible.</div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}

const CONFIDENCE_META = {
  high: { color: "#2DD4BF", label: "Fiable" },
  medium: { color: "#D89A2E", label: "À vérifier" },
  low: { color: "#E8554E", label: "Incertain" },
  none: { color: "#9AA1B8", label: "Non détecté" },
};

function ConfidenceRow({ label, value, confidence }) {
  const meta = CONFIDENCE_META[confidence] || CONFIDENCE_META.none;
  const hasValue = value !== null && value !== undefined && value !== "";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
      <span style={{ fontSize: 11.5, color: C.textSecondary }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span className="tnum" style={{ fontSize: 12, fontWeight: 700, color: hasValue ? C.text : C.textMuted }}>{hasValue ? value : "—"}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, fontWeight: 700, color: meta.color, padding: "2px 6px", borderRadius: 10, background: `${meta.color}1A` }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color }} />
          {meta.label}
        </span>
      </div>
    </div>
  );
}

function ExtractedChip({ label, value }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: C.card, padding: "3px 8px", borderRadius: 5, border: `1px solid ${C.border}` }}>
      <span style={{ color: C.textMuted }}>{label}</span>
      <span style={{ color: C.text, fontWeight: 700 }}>{value}</span>
    </span>
  );
}

function ImageUploadBox({ label, value, onChange }) {
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [focused, setFocused] = useState(false);
  const boxRef = useRef(null);

  const handleFile = async (file) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Le fichier doit être une image."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image trop lourde (max 10 Mo)."); return; }

    // Aperçu local immédiat
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);

    // Upload Storage
    setUploading(true);
    try {
      const url = await uploadToStorage(file);
      onChange(url);
    } catch (e) {
      setError("Upload échoué — photo conservée localement.");
    } finally {
      setUploading(false);
    }
  };

  // Presse-papier : Cmd+V / Ctrl+V
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        handleFile(item.getAsFile());
        return;
      }
    }
  };

  // Drag & drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };



  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>{label}</div>
      <div
        ref={boxRef}
        onClick={() => { if (!value) fileRef.current?.click(); boxRef.current?.focus(); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPaste={handlePaste}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        tabIndex={0}
        style={{
          border: `1.5px dashed ${focused ? C.focusBorder || C.purple : dragOver ? C.purple : C.border}`,
          borderRadius: 10, cursor: value ? "default" : "pointer", overflow: "hidden",
          position: "relative", background: dragOver ? C.purpleDim : C.inputBg || C.card,
          minHeight: value ? "auto" : 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "border-color 0.15s, background 0.15s",
          outline: "none",
          boxShadow: focused ? (C.focusShadow || "0 0 0 3px rgba(124,92,252,0.14)") : "none",
        }}
      >
        {value ? (
          <>
            <img src={value} alt={label} style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "contain" }} />
            <button onClick={(e) => { e.stopPropagation(); onChange(null); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(15,17,23,0.85)", border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: 5, cursor: "pointer", display: "flex" }}>
              <X size={12} />
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", color: C.textMuted, padding: 20 }}>
            <Upload size={20} strokeWidth={1.5} style={{ marginBottom: 8, display: "block", margin: "0 auto 8px" }} />
            <div style={{ fontSize: 12, fontWeight: 500, color: focused ? C.purpleBright : C.textSecondary, marginBottom: 4 }}>
              {focused ? "Case active — colle maintenant" : "Clique · Glisse · Colle"}
            </div>
            <div style={{ fontSize: 10.5, color: C.textMuted }}>
              <kbd style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 5px", fontSize: 10 }}>⌘V</kbd>{" "}/{" "}
              <kbd style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 5px", fontSize: 10 }}>Ctrl+V</kbd>
            </div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button type="button" onClick={() => fileRef.current?.click()} style={{ ...btn.ghost, flex: 1, justifyContent: "center", padding: "7px", fontSize: 12 }}><Upload size={13} /> Fichier</button>
        <button type="button" onClick={async () => {
          setError("");
          try {
            if (navigator.clipboard?.read) { const items = await navigator.clipboard.read(); for (const it of items) { const t = it.types.find((x) => x.startsWith("image/")); if (t) { const blob = await it.getType(t); handleFile(new File([blob], "capture.png", { type: t })); return; } } }
            setError("Aucune image dans le presse-papier.");
          } catch (e) { setError("Accès au presse-papier refusé : touche la case puis Ctrl+V."); boxRef.current?.focus(); }
        }} style={{ ...btn.ghost, flex: 1, justifyContent: "center", padding: "7px", fontSize: 12 }}><Clipboard size={13} /> Coller</button>
      </div>
      {error && <div style={{ color: C.red, fontSize: 11, marginTop: 4 }}>{error}</div>}
      {uploading && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.purpleBright, fontSize: 11, marginTop: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.purpleBright, animation: "pulse 1s infinite" }} />
          Upload vers Supabase…
        </div>
      )}
    </div>
  );
}



function LiveCalcStat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="tnum" style={{ fontSize: 13.5, fontWeight: 800, color: color || C.text }}>{value}</div>
      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 3 }}>{label}</div>
    </div>
  );
}



// ── Briques du formulaire (au niveau du module pour que les champs ne perdent jamais le focus) ──
function Chip({ on, onClick, children, color, title }) {
  const col = color || C.purpleBright;
  return (
    <button type="button" title={title} onClick={onClick} className="chip" style={{
      padding: "8px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap",
      border: `1px solid ${on ? col : C.border}`, background: on ? `${col}1F` : "transparent", color: on ? col : C.textSecondary,
    }}>{children}</button>
  );
}
function Chips({ children }) { return <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{children}</div>; }
function Group({ label, hint, children, right }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, letterSpacing: 0.2 }}>{label}</span>
        {right}
      </div>
      {children}
      {hint && <span style={{ fontSize: 11.5, color: C.red, fontWeight: 600 }}>{hint}</span>}
    </div>
  );
}
function Section({ title, icon, sub, open, onToggle, children }) {
  const collapsible = typeof onToggle === "function";
  const shown = !collapsible || open;
  return (
    <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: collapsible && !open ? "14px 16px" : 16, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
      <div onClick={collapsible ? onToggle : undefined} style={{ display: "flex", alignItems: "center", gap: 10, cursor: collapsible ? "pointer" : "default", userSelect: "none" }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: C.purpleDim, color: C.purpleBright, fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: -0.2 }}>{title}</div>
          {collapsible && sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
        </div>
        {collapsible && <ChevronDown size={18} color={C.textMuted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />}
      </div>
      {shown && children}
    </section>
  );
}

// ── Nouveau formulaire d'ajout (v2) ──
const DEFAULT_TFS = ["M1", "M5", "M15", "H1", "H4", "D1"];
const GRADES = [["A+", "A", "A-"], ["B+", "B", "B-"], ["C+", "C", "C-"], ["D+", "D", "D-"], ["E"]];
const gradeToLevel = (g) => !g ? 0 : g[0] === "A" ? 5 : g[0] === "B" ? 4 : g[0] === "C" ? 3 : g[0] === "D" ? 2 : 1;
function pipInfo(pair, entry) {
  const ep = Number(entry) || 1;
  const dec = pair.includes("JPY") ? 0.01 : pair === "XAUUSD" ? 0.1 : pair === "XAGUSD" ? 0.01 : ["US30", "NAS100", "SPX500", "BTCUSD", "ETHUSD"].includes(pair) ? 1 : 0.0001;
  let val = 10;
  if (pair === "USOIL") return { dec: 0.01, val: 10 };
  if (pair === "BTCUSD" || pair === "ETHUSD") return { dec: 1, val: 1 };
  if (pair === "XAUUSD") val = 10; else if (pair === "XAGUSD") val = 50; else if (["US30", "NAS100", "SPX500"].includes(pair)) val = 1;
  else if (pair.endsWith("USD") && !pair.startsWith("USD")) val = 10; else if (pair.endsWith("JPY")) val = 1000 / ep;
  else if (pair.startsWith("USD") || pair.endsWith("CAD") || pair.endsWith("CHF")) val = 10 / ep;
  return { dec, val };
}
function TradeFormV2({ initial, appSettings, onCancel, onSave, trades }) {
  const isEdit = !!initial;
  const [entryTime, setEntryTime] = useState(toLocalInput(initial?.entryTime));
  const [pair, setPair] = useState(initial?.pair || "");
  const [q, setQ] = useState("");
  const [direction, setDirection] = useState(initial?.direction || "long");
  const [entryPrice, setEntryPrice] = useState(initial?.entryPrice ?? "");
  const [stopLoss, setStopLoss] = useState(initial?.stopLoss ?? "");
  const [takeProfit, setTakeProfit] = useState(initial?.takeProfit ?? "");
  const lastRisk = (trades || []).find((t) => Number(t.riskUsd) > 0)?.riskUsd;
  const [riskMode, setRiskMode] = useState(initial?.positionSize != null && initial?.riskUsd == null ? "lots" : "usd");
  const [riskVal, setRiskVal] = useState(String(initial ? (initial.riskUsd ?? initial.positionSize ?? "") : (lastRisk ?? 100)));
  const tfList = (appSettings?.timeframes && appSettings.timeframes.length ? appSettings.timeframes : DEFAULT_TFS);
  const initTf = (() => {
    const r = initial?.rules?.tfSetups; if (Array.isArray(r) && r.length) return r;
    const tags = initial?.tags || []; const tf = tags.find((t) => tfList.includes(t) || ["M1","M5","M15","M30","H1","H4","D1","W1"].includes(t));
    const st = tags.filter((t) => TAG_CATALOG.find((c) => c.name === t && c.category === "setup") || (appSettings?.customTags || []).includes(t));
    return [{ tf: tf || tfList[Math.min(2, tfList.length - 1)], setups: st }];
  })();
  const [tfRows, setTfRows] = useState(initTf);
  const [rowQ, setRowQ] = useState({});
  const [shotBefore, setShotBefore] = useState(initial?.screenshotBefore || null);
  const [shotAfter, setShotAfter] = useState(initial?.screenshotAfter || null);
  const [grade, setGrade] = useState(initial?.rules?.grade || "");
  const [status, setStatus] = useState(initial ? (initial.status === "closed" ? (Number(initial.resultR) >= 0 ? "win" : "loss") : initial.status) : "open");
  const [rIn, setRIn] = useState(initial?.resultR != null ? String(Math.abs(initial.resultR)) : "");
  const [notes, setNotes] = useState(initial?.notes || "");

  const hidden = appSettings?.hiddenTags || [];
  const setupNames = [...TAG_CATALOG.filter((t) => t.category === "setup" && !hidden.includes(t.name)).map((t) => t.name), ...(appSettings?.customTags || [])];
  const allPairs = [...new Set([...(appSettings?.pairs || []), ...PAIRS, ...ALL_INSTRUMENTS])];
  const used = {}; (trades || []).forEach((t) => { used[t.pair] = (used[t.pair] || 0) + 1; });
  const qn = q.trim().toUpperCase();
  const pairHits = qn ? [...new Set([...Object.keys(PAIR_ALIASES).filter((k) => k.startsWith(qn)).map((k) => PAIR_ALIASES[k]), ...allPairs.filter((p) => p.includes(qn) || (PAIR_LABEL[p] || "").toUpperCase().includes(qn))])].sort((a, b) => (used[b] || 0) - (used[a] || 0)).slice(0, 10) : [];

  const { dec, val } = pipInfo(pair || "EURUSD", entryPrice);
  const en = entryPrice === "" ? null : Number(entryPrice), sl = stopLoss === "" ? null : Number(stopLoss), tp = takeProfit === "" ? null : Number(takeProfit);
  const slPips = en != null && sl != null ? Math.abs(en - sl) / dec : null;
  const rv = riskVal === "" ? null : Number(riskVal);
  const riskUsd = riskMode === "usd" ? rv : (rv != null && slPips ? Math.round(slPips * val * rv * 100) / 100 : null);
  const lots = riskMode === "lots" ? rv : (rv != null && slPips ? Math.round(rv / (slPips * val) * 100) / 100 : null);
  const rr = en != null && sl != null && tp != null && en !== sl ? Math.abs(tp - en) / Math.abs(en - sl) : null;
  const rFinal = status === "breakeven" ? 0 : status === "win" ? (rIn !== "" ? Math.abs(Number(rIn)) : rr) : status === "loss" ? -(rIn !== "" ? Math.abs(Number(rIn)) : 1) : null;
  const timeOk = !!entryTime && !isNaN(new Date(entryTime).getTime());
  const canSave = timeOk && !!pair;
  const sideErr = en == null ? null
    : sl != null && (direction === "long" ? sl >= en : sl <= en) ? "Stop loss du mauvais côté : en " + (direction === "long" ? "Long il doit être sous" : "Short il doit être au-dessus de") + " l'entrée."
    : tp != null && (direction === "long" ? tp <= en : tp >= en) ? "Take profit du mauvais côté : en " + (direction === "long" ? "Long il doit être au-dessus de" : "Short il doit être sous") + " l'entrée."
    : null;
  const tpPips = en != null && tp != null ? Math.abs(tp - en) / dec : null;
  const potGain = tpPips != null && lots ? Math.round(tpPips * val * lots * 100) / 100 : (rr != null && riskUsd ? Math.round(rr * riskUsd * 100) / 100 : null);
  const fmtP = (v) => v == null ? "—" : String(v).replace(".", ",");

  const save = () => {
    if (!canSave) return;
    const tfTags = tfRows.map((r) => r.tf).filter(Boolean);
    const stTags = tfRows.flatMap((r) => r.setups);
    const sess = getSession(new Date(entryTime).toISOString());
    const keep = (initial?.tags || []).filter((t) => !["M1","M5","M15","M30","H1","H4","D1","W1",...tfList].includes(t) && !setupNames.includes(t) && !["London Session", "New York Session", "Asia Session", "Hors session"].includes(t));
    const tags = [...new Set([...keep, ...tfTags, ...stTags, ...(sess === "Hors session" ? [] : [sess])])];
    const finalR = rFinal == null ? null : Math.round(rFinal * 100) / 100;
    const finalStatus = status === "win" || status === "loss" ? "closed" : status;
    onSave({
      ...(initial || {}),
      id: initial?.id || uid(), pair, direction,
      entryTime: new Date(entryTime).toISOString(),
      entryPrice: en, stopLoss: sl, takeProfit: tp,
      exitPrice: initial?.exitPrice ?? (status === "win" ? tp : status === "loss" ? sl : status === "breakeven" ? en : null),
      positionSize: lots, riskUsd,
      resultR: finalR, resultRManual: true,
      resultUsd: finalR == null ? null : (riskUsd ? Math.round(finalR * riskUsd * 100) / 100 : initial?.resultUsd ?? null),
      status: finalStatus, notes, tags,
      screenshotBefore: shotBefore, screenshotAfter: shotAfter,
      confidenceLevel: gradeToLevel(grade) || initial?.confidenceLevel || 0,
      rules: { ...(initial?.rules || {}), tfSetups: tfRows.filter((r) => r.tf || r.setups.length), grade },
    });
  };

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14 };
  const lab = { fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 6 };
  const inp = { ...inputStyle, padding: "11px 12px", fontSize: 15 };
  const big = (on, col) => ({ flex: 1, padding: "13px 6px", borderRadius: 13, border: `1.5px solid ${on ? col : C.border}`, background: on ? `${col}1A` : "transparent", color: on ? col : C.textMuted, fontSize: 15, fontWeight: 800, cursor: "pointer" });
  const kz = entryTime ? killzoneLabel(entryTime) : "";

  return (
    <div className="fade-in" style={{ paddingBottom: 190 }}>
      <style>{`@media (max-width: 600px) { .tf2-bar { bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important; } } @media (min-width: 601px) { .tf2-bar { left: 220px !important; } } @media (min-width: 601px) and (max-width: 1024px) { .tf2-bar { left: 72px !important; } }`}</style>
      <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <BackLink onClick={onCancel}>Annuler</BackLink>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 0", letterSpacing: -0.4 }}>{isEdit ? "Modifier le trade" : "Nouveau trade"}</h1>
        </div>

        {/* 1. Date */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...lab }}><span>Date et heure</span>{kz && <span style={{ color: kz === "Hors killzone" ? C.amber : C.teal }}>{kz}</span>}</div>
          <input type="datetime-local" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} style={inp} aria-label="Date et heure" />
        </div>

        {/* 2. Paire */}
        <div style={card}>
          <div style={lab}>Paire</div>
          {pair && !q ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <PairLogo pair={pair} size={34} /><span style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>{PAIR_LABEL[pair] ? PAIR_LABEL[pair] + " · " + pair : pair}</span>
              <button onClick={() => { setPair(""); setQ(""); }} style={{ ...btn.ghost, padding: "6px 10px", fontSize: 12 }}>Changer</button>
            </div>
          ) : (<>
            <div style={{ position: "relative" }}>
              <Search size={15} color={C.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input autoFocus={!isEdit} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tape EUR, GBP, XAU…" style={{ ...inp, paddingLeft: 36 }} aria-label="Rechercher une paire"
                onKeyDown={(e) => { if (e.key === "Enter" && pairHits[0]) { setPair(pairHits[0]); setQ(""); } }} />
            </div>
            {pairHits.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {pairHits.map((p) => <Chip key={p} on={pair === p} onClick={() => { setPair(p); setQ(""); }}>{PAIR_LABEL[p] ? PAIR_LABEL[p] + " · " + p : p}</Chip>)}
            </div>}
            {qn && pairHits.length === 0 && <div style={{ marginTop: 8 }}><button onClick={() => { setPair(qn); setQ(""); }} style={{ ...btn.ghost, fontSize: 12.5 }}>Utiliser « {qn} »</button></div>}
          </>)}
        </div>

        {/* 3. Direction + prix + risque */}
        <div style={card}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setDirection("long")} style={big(direction === "long", C.teal)}>↗ Long</button>
            <button onClick={() => setDirection("short")} style={big(direction === "short", "#F97316")}>↘ Short</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginTop: 12 }}>
            {[["Entrée", entryPrice, setEntryPrice], ["Stop loss", stopLoss, setStopLoss], ["Take profit", takeProfit, setTakeProfit]].map(([l, v, set]) => (
              <div key={l}><div style={lab}>{l}</div><input type="text" inputMode="decimal" value={String(v ?? "").replace(".", ",")} onChange={(e) => set(autoPrice(e.target.value, pair))} placeholder={PRICE_FMT[pair] ? (PRICE_FMT[pair][0] ? "0".repeat(PRICE_FMT[pair][0]) : "0") + "," + "0".repeat(PRICE_FMT[pair][1]) : ""} style={inp} aria-label={l} /></div>))}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={lab}>Risque</div>
              <input type="number" inputMode="decimal" step="any" value={riskVal} onChange={(e) => setRiskVal(e.target.value)} style={inp} aria-label="Risque" />
            </div>
            <div style={{ display: "flex", gap: 3, padding: 3, borderRadius: 11, border: `1px solid ${C.border}`, height: 44, boxSizing: "border-box" }}>
              {[["usd", "$"], ["lots", "Lots"]].map(([k, l]) => <button key={k} onClick={() => setRiskMode(k)} style={{ minWidth: 48, borderRadius: 8, border: "none", background: riskMode === k ? C.purpleDim : "transparent", color: riskMode === k ? C.purpleBright : C.textMuted, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{l}</button>)}
            </div>
          </div>
          <div className="tnum" style={{ fontSize: 12, color: C.textMuted, marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
            {slPips != null && <span>SL {slPips.toFixed(1)} pips</span>}
            {riskMode === "usd" && lots != null && <span>≈ {lots} lots</span>}
            {riskMode === "lots" && riskUsd != null && <span>≈ {fmtUsd(riskUsd)} de risque</span>}
            {rr != null && <span style={{ color: C.text, fontWeight: 700 }}>R:R 1:{rr.toFixed(2)}</span>}
          </div>
          {sideErr && <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, color: C.red, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} /> {sideErr}</div>}
        </div>

        {/* 4. Setups par timeframe */}
        <div style={card}>
          <div style={lab}>Setup</div>
          {tfRows.map((row, i) => {
            const rq = (rowQ[i] || "").trim().toLowerCase();
            const hits = rq ? setupNames.filter((n) => n.toLowerCase().includes(rq) && !row.setups.includes(n)).slice(0, 8) : [];
            const upd = (fn) => setTfRows((rs) => rs.map((r, j) => j === i ? fn(r) : r));
            return (
              <div key={i} style={{ padding: i ? "12px 0 0" : 0, marginTop: i ? 12 : 0, borderTop: i ? `1px solid ${C.border}` : "none" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select value={row.tf} onChange={(e) => upd((r) => ({ ...r, tf: e.target.value }))} aria-label="Timeframe" style={{ ...inp, width: 86, flexShrink: 0, fontWeight: 800 }}>
                    {[...new Set([...tfList, row.tf].filter(Boolean))].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                    <Search size={14} color={C.textMuted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                    <input value={rowQ[i] || ""} onChange={(e) => setRowQ((m) => ({ ...m, [i]: e.target.value }))} placeholder="SIBI, OB+, FVG…" aria-label="Rechercher un setup" style={{ ...inp, paddingLeft: 32 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) { upd((r) => ({ ...r, setups: [...r.setups, hits[0]] })); setRowQ((m) => ({ ...m, [i]: "" })); } }} />
                  </div>
                  {tfRows.length > 1 && <button onClick={() => setTfRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Retirer cette timeframe" style={{ ...btn.ghost, padding: "8px 10px" }}>✕</button>}
                </div>
                {hits.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {hits.map((h) => <Chip key={h} onClick={() => { upd((r) => ({ ...r, setups: [...r.setups, h] })); setRowQ((m) => ({ ...m, [i]: "" })); }}>+ {h}</Chip>)}
                </div>}
                {row.setups.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {row.setups.map((st) => <span key={st} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: C.purpleDim, color: C.purpleBright, fontSize: 12.5, fontWeight: 700 }}>
                    <b style={{ color: C.text }}>{row.tf}</b> {st}
                    <button onClick={() => upd((r) => ({ ...r, setups: r.setups.filter((x) => x !== st) }))} aria-label={"Retirer " + st} style={{ background: "none", border: "none", color: C.purpleBright, cursor: "pointer", padding: 0, fontSize: 13 }}>✕</button></span>)}
                </div>}
              </div>);
          })}
          <button onClick={() => setTfRows((rs) => [...rs, { tf: tfList.find((t) => !rs.some((r) => r.tf === t)) || tfList[0], setups: [] }])} style={{ background: "none", border: "none", color: C.purpleBright, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "10px 0 0" }}>+ Ajouter une timeframe</button>
        </div>

        {/* 5. Photos */}
        <div style={card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <ImageUploadBox label="Avant le trade" value={shotBefore} onChange={setShotBefore} />
            <ImageUploadBox label="Après le trade" value={shotAfter} onChange={setShotAfter} />
          </div>
        </div>

        {/* 6. Confiance + résultat */}
        <div style={card}>
          <div style={lab}>Niveau de confiance</div>
          <select value={grade} onChange={(e) => setGrade(e.target.value)} style={{ ...inp, fontWeight: 800 }} aria-label="Niveau de confiance">
            <option value="">—</option>
            {GRADES.map((g, i) => <optgroup key={i} label={g[0][0]}>{g.map((x) => <option key={x} value={x}>{x}</option>)}</optgroup>)}
          </select>
          <div style={{ ...lab, marginTop: 14 }}>Résultat</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["open", "En cours", C.purpleBright], ["win", "Gagné", C.teal], ["loss", "Perdu", C.red], ["breakeven", "BE", C.textSecondary]].map(([v, l, col]) =>
              <button key={v} onClick={() => setStatus(v)} style={{ ...big(status === v, col), fontSize: 13, padding: "11px 4px" }}>{l}</button>)}
          </div>
          {(status === "win" || status === "loss") && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <input type="number" inputMode="decimal" step="0.1" value={rIn} onChange={(e) => setRIn(e.target.value)} placeholder={status === "win" ? (rr ? rr.toFixed(2) : "R") : "1"} aria-label="R" style={{ ...inp, width: 100 }} />
            <span style={{ color: C.textMuted, fontWeight: 700 }}>R</span>
            {rFinal != null && <span className="tnum" style={{ marginLeft: "auto", fontSize: 18, fontWeight: 900, color: rFinal >= 0 ? C.teal : C.red }}>{fmtR(rFinal)}{riskUsd ? " · " + fmtUsdSigned(rFinal * riskUsd) : ""}</span>}
          </div>}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optionnel)" rows={2} style={{ ...inp, marginTop: 12, resize: "vertical", fontFamily: "inherit" }} />
        </div>
      </div>

      <div className="tf2-bar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: "10px 16px calc(12px + env(safe-area-inset-bottom, 0px))", background: C.bg, borderTop: `1px solid ${C.border}`, zIndex: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {pair && <div style={{ width: "100%", maxWidth: 620, display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 12, background: C.card, border: `1px solid ${sideErr ? C.red : C.border}` }}>
          <div style={{ minWidth: 92 }}>
            <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700 }}>GAIN POTENTIEL</div>
            <div className="tnum" style={{ fontSize: 18, fontWeight: 900, color: potGain != null ? C.teal : C.textMuted }}>{potGain != null ? fmtUsdSigned(potGain) : "—"}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}><PairLogo pair={pair} size={20} />{pair} <span style={{ color: direction === "long" ? C.teal : "#F97316", fontSize: 12 }}>{direction === "long" ? "Long" : "Short"}</span>{rr != null && <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 700 }}> · 1:{rr.toFixed(2)}</span>}</div>
            <div className="tnum" style={{ fontSize: 12, color: C.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>E {fmtP(en)} · <span style={{ color: C.red }}>SL {fmtP(sl)}</span> · <span style={{ color: C.teal }}>TP {fmtP(tp)}</span></div>
          </div>
        </div>}
        <button onClick={save} disabled={!canSave} style={{ ...btn.primary, width: "100%", maxWidth: 620, justifyContent: "center", padding: "14px", fontSize: 15, opacity: canSave ? 1 : 0.5 }}>{!pair ? "Choisis une paire" : isEdit ? "Enregistrer les modifications" : "Enregistrer le trade"}</button>
      </div>
    </div>
  );
}

function TradeForm({ initial, setupOptions, appSettings, onCancel, onSave, trades }) {
  const isEdit = !!initial;
  const [pair, setPair] = useState(initial?.pair || "EURUSD");
  const [direction, setDirection] = useState(initial?.direction || "long");
  const [entryTime, setEntryTime] = useState(toLocalInput(initial?.entryTime));
  const [entryPrice, setEntryPrice] = useState(initial?.entryPrice ?? "");
  const [stopLoss, setStopLoss] = useState(initial?.stopLoss ?? "");
  const [takeProfit, setTakeProfit] = useState(initial?.takeProfit ?? "");
  const [exitPrice, setExitPrice] = useState(initial?.exitPrice ?? "");
  const [positionSize, setPositionSize] = useState(initial?.positionSize ?? "");
  const [riskUsd, setRiskUsd] = useState(initial?.riskUsd ?? "");
  const [riskPct, setRiskPct] = useState(initial ? "" : "1"); // % de risque live
  const [resultUsd, setResultUsd] = useState(initial?.resultUsd ?? "");
  const [resultPips, setResultPips] = useState(initial?.resultPips ?? "");
  const [resultRManual, setResultRManual] = useState(initial?.resultRManual ?? false);
  const [resultRValue, setResultRValue] = useState(initial?.resultR ?? "");
  const [status, setStatus] = useState(initial?.status || "open"); // ouvert par défaut
  const [notes, setNotes] = useState(initial?.notes || "");
  const [tags, setTags] = useState(initial?.tags || []);
  const [screenshotBefore, setScreenshotBefore] = useState(initial?.screenshotBefore || null);
  const [screenshotAfter, setScreenshotAfter] = useState(initial?.screenshotAfter || null);
  const [extractedMeta, setExtractedMeta] = useState(null);
  const [dxyBias, setDxyBias] = useState(initial?.dxyBias || "");
  const [dxyScreenshotBefore, setDxyScreenshotBefore] = useState(initial?.dxyScreenshotBefore || null);
  const [dxyScreenshotAfter, setDxyScreenshotAfter] = useState(initial?.dxyScreenshotAfter || null);
  const [dxyTags, setDxyTags] = useState(initial?.dxyTags || []);
  const [liquiditySweep, setLiquiditySweep] = useState(initial?.liquiditySweep || false);
  const [mssConfirmed, setMssConfirmed] = useState(initial?.mssConfirmed || false);
  const [confidenceLevel, setConfidenceLevel] = useState(initial?.confidenceLevel || 0);
  const [tfAlignment, setTfAlignment] = useState(initial?.tfAlignment || "");
  const [tfAlignmentSetup, setTfAlignmentSetup] = useState(initial?.tfAlignmentSetup || "");
  const [oteFib, setOteFib] = useState(initial?.oteFib || "");
  const [maxR, setMaxR] = useState(initial?.maxR ?? "");
  const [ictModel, setIctModel] = useState(initial?.ictModel || "");
  const [htfBias, setHtfBias] = useState(initial?.htfBias || "");
  const [pdZone, setPdZone] = useState(initial?.pdZone || "");
  const [sweptLiquidity, setSweptLiquidity] = useState(initial?.sweptLiquidity || "");
  const [drawOnLiquidity, setDrawOnLiquidity] = useState(initial?.drawOnLiquidity || "");
  const [displacement, setDisplacement] = useState(initial?.displacement || false);
  const [smt, setSmt] = useState(initial?.smt || false);
  
  

  const accountBalance = appSettings?.accountBalance || 10000;
  const sessionTags = TAG_CATALOG.filter((t) => t.category === "session");
  const customSetupTags = appSettings?.customTags || [];
  const hiddenTags = appSettings?.hiddenTags || [];
  const allSetupTags = [
    ...TAG_CATALOG.filter((t) => t.category === "setup" && !hiddenTags.includes(t.name)),
    ...customSetupTags.map((n) => ({ name: n, category: "setup" })),
  ];

  // Calcul pip live
  const pipDecimal = pair.includes("JPY") ? 0.01 : pair === "XAUUSD" ? 0.1 : pair === "XAGUSD" ? 0.01 : ["US30","NAS100","SPX500","BTCUSD","ETHUSD"].includes(pair) ? 1 : 0.0001;
  const pipValuePerLot = (() => {
      const ep = parseFloat(entryPrice) || 1;
      if (pair === "XAUUSD") return 10;
      if (pair === "XAGUSD") return 50;
      if (["US30","NAS100","SPX500"].includes(pair)) return 1;
      // USD quote fixe : EURUSD, GBPUSD, AUDUSD, NZDUSD, USDOLLAR...
      if (pair.endsWith("USD") && !pair.startsWith("USD")) return 10;
      // USDJPY spécial: pip = 0.01, valeur = 1000/entry
      if (pair === "USDJPY") return 1000 / ep;
      // USD base : USDCAD, USDCHF
      if (pair.startsWith("USD")) return 10 / ep;
      // JPY quote : GBPJPY, EURJPY, AUDJPY, CADJPY, CHFJPY, USDJPY
      if (pair.endsWith("JPY")) return 1000 / ep;
      // CAD quote : GBPCAD, EURCAD, AUDCAD, NZDCAD
      if (pair.endsWith("CAD")) return 10 / ep;
      // CHF quote : GBPCHF, EURCHF, AUDCHF, NZDCHF
      if (pair.endsWith("CHF")) return 10 / ep;
      // AUD base : AUDCAD, AUDCHF, AUDJPY, AUDNZD
      if (pair.startsWith("AUD") && !pair.endsWith("USD")) return 10 * ep / (ep || 1);
      return 10; // défaut USD quote
    })();

  // Exit price = TP par défaut (modifiable)
  const prevTP = React.useRef(takeProfit);
  React.useEffect(() => {
    if (takeProfit !== prevTP.current) {
      if (exitPrice === "" || exitPrice === prevTP.current) {
        setExitPrice(takeProfit);
      }
      prevTP.current = takeProfit;
    }
  }, [takeProfit]);

  // Risque $ live depuis % + taille de lot
  const liveCalc = useMemo(() => {
    const numEntry = entryPrice === "" ? null : Number(entryPrice);
    const numSL = stopLoss === "" ? null : Number(stopLoss);
    const numTP = takeProfit === "" ? null : Number(takeProfit);
    const numLots = positionSize === "" ? null : Number(positionSize);
    const numExit = exitPrice === "" ? null : Number(exitPrice);

    const riskPips = numEntry !== null && numSL !== null ? Math.abs((numEntry - numSL) / pipDecimal) : null;
    const rewardPips = numEntry !== null && numTP !== null ? Math.abs((numTP - numEntry) / pipDecimal) : null;
    const theoreticalRR = riskPips && rewardPips ? rewardPips / riskPips : null;
    const potentialLossUsd = riskPips !== null && numLots ? riskPips * pipValuePerLot * numLots : null;
    const potentialGainUsd = rewardPips !== null && numLots ? rewardPips * pipValuePerLot * numLots : null;

    // Risque % → $ (basé sur les pips SL et la taille de lot)
    const riskFromPct = riskPct !== "" && potentialLossUsd !== null ? null : null; // info only

    // Résultat auto depuis exit price
    let autoResultPips = null;
    let autoResultUsd = null;
    if (numEntry !== null && numExit !== null && numLots) {
      const sign = direction === "long" ? 1 : -1;
      autoResultPips = Math.round(sign * (numExit - numEntry) / pipDecimal * 10) / 10;
      autoResultUsd = Math.round(autoResultPips * pipValuePerLot * numLots * 100) / 100;
    }

    // Risque $ live depuis % compte
    let riskUsdFromPct = null;
    if (riskPct !== "" && !Number.isNaN(Number(riskPct))) {
      riskUsdFromPct = Math.round((accountBalance * Number(riskPct)) / 100 * 100) / 100;
    }

    // Taille de lot suggérée depuis % risque et SL pips
    let suggestedLot = null;
    if (riskUsdFromPct !== null && riskPips !== null && riskPips > 0) {
      suggestedLot = Math.round((riskUsdFromPct / (riskPips * pipValuePerLot)) * 100) / 100;
    }

    return { riskPips, rewardPips, theoreticalRR, potentialLossUsd, potentialGainUsd, autoResultPips, autoResultUsd, riskUsdFromPct, suggestedLot };
  }, [entryPrice, stopLoss, takeProfit, exitPrice, positionSize, pair, direction, riskPct, accountBalance, pipDecimal, pipValuePerLot]);

  // Auto-fill résultat depuis calcul live (si non rempli manuellement)
  // En modification : on garde le résultat enregistré (commission, sortie partielle…) au lieu de le recalculer
  const [resultManualOverride, setResultManualOverride] = useState(!!initial && initial.resultUsd != null);
  React.useEffect(() => {
    if (!resultManualOverride && liveCalc?.autoResultUsd !== null && liveCalc?.autoResultUsd !== undefined) {
      setResultUsd(String(liveCalc.autoResultUsd));
    }
  }, [liveCalc?.autoResultUsd]);
  React.useEffect(() => {
    if (!resultManualOverride && liveCalc?.autoResultPips !== null && liveCalc?.autoResultPips !== undefined) {
      setResultPips(String(liveCalc.autoResultPips));
    }
  }, [liveCalc?.autoResultPips]);

  const numRisk = riskUsd === "" ? null : Number(riskUsd);
  const numResult = resultUsd === "" ? null : Number(resultUsd);
  // R depuis les prix si le risque $ n'est pas saisi
  const priceR = (() => {
    const en = Number(entryPrice), sl = Number(stopLoss);
    if (entryPrice === "" || stopLoss === "" || !isFinite(en) || !isFinite(sl) || en === sl) return null;
    const ex = exitPrice !== "" ? Number(exitPrice) : status === "loss" ? sl : status === "breakeven" ? en : takeProfit !== "" ? Number(takeProfit) : null;
    if (ex == null || !isFinite(ex) || !["win", "loss", "breakeven", "closed"].includes(status)) return null;
    const d = direction === "long" ? 1 : -1;
    return Math.round(((ex - en) * d) / ((en - sl) * d) * 100) / 100;
  })();
  const autoR = numRisk && numRisk !== 0 && numResult !== null ? numResult / numRisk : priceR;
  const effectiveR = resultRManual ? (resultRValue === "" ? null : Number(resultRValue)) : autoR;

  const toggleTag = (name) => setTags((prev) => prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]);
  // ── Mode express (nouveau trade) ──
  const [quick, setQuick] = useState(!isEdit || (initial?.entryPrice == null && initial?.positionSize == null));
  const lastRisk = (trades || []).find((t) => Number(t.riskUsd) > 0)?.riskUsd;
  const [qRisk, setQRisk] = useState(String(initial?.riskUsd ?? lastRisk ?? 100));
  const [qR, setQR] = useState("");
  const qRval = status === "breakeven" ? 0 : qR === "" ? null : (status === "loss" ? -1 : 1) * Math.abs(Number(qR));
  const timeOk = !!entryTime && !isNaN(new Date(entryTime).getTime());
  const canSave = timeOk && (quick ? !!pair && (status === "open" || qRval != null) : (pair && entryPrice !== "" && positionSize !== ""));

  const handleExtracted = (result) => {
    setExtractedMeta(result);
    if (result.pair) { const m = PAIRS.find((p) => p.toUpperCase() === String(result.pair).toUpperCase().replace(/[^A-Z]/g, "")); if (m) setPair(m); }
    if (result.direction === "long" || result.direction === "short") setDirection(result.direction);
    if (result.entryPrice != null && entryPrice === "") setEntryPrice(String(result.entryPrice));
    if (result.stopLoss != null && stopLoss === "") setStopLoss(String(result.stopLoss));
    if (result.takeProfit != null && takeProfit === "") setTakeProfit(String(result.takeProfit));
  };

  const handleSubmit = () => {
    if (!canSave) return;
    // Normalise win/loss → closed avec le bon signe sur resultR
    let finalStatus = status;
    let finalResultR = quick ? (status === "open" ? null : qRval) : effectiveR;
    let finalResultUsd = quick ? (finalResultR == null ? null : Math.round(finalResultR * Number(qRisk || 0) * 100) / 100) : numResult;
    if (status === "win") {
      finalStatus = "closed";
      if (finalResultR !== null && finalResultR < 0) finalResultR = Math.abs(finalResultR);
      if (finalResultUsd !== null && finalResultUsd < 0) finalResultUsd = Math.abs(finalResultUsd);
    } else if (status === "loss") {
      finalStatus = "closed";
      if (finalResultR !== null && finalResultR > 0) finalResultR = -Math.abs(finalResultR);
      if (finalResultUsd !== null && finalResultUsd > 0) finalResultUsd = -Math.abs(finalResultUsd);
    }
    const sessTags = ["London Session", "New York Session", "Asia Session", "Hors session"];
    const autoSess = getSession(new Date(entryTime).toISOString());
    const finalTags = tags.some((t) => sessTags.includes(t)) || autoSess === "Hors session" ? tags : [...tags, autoSess];
    onSave({
      id: initial?.id || uid(),
      pair, direction,
      entryTime: new Date(entryTime).toISOString(),
      entryPrice: entryPrice === "" ? null : Number(entryPrice),
      stopLoss: stopLoss === "" ? null : Number(stopLoss),
      takeProfit: takeProfit === "" ? null : Number(takeProfit),
      exitPrice: exitPrice === "" ? null : Number(exitPrice),
      positionSize: positionSize === "" ? null : Number(positionSize),
      riskUsd: quick ? (qRisk === "" ? null : Number(qRisk)) : numRisk, resultUsd: finalResultUsd,
      resultPips: resultPips === "" ? null : Number(resultPips),
      resultR: finalResultR, resultRManual: quick ? true : resultRManual,
      status: finalStatus, notes, tags: finalTags, screenshotBefore, screenshotAfter,
      dxyBias, dxyScreenshotBefore, dxyScreenshotAfter, dxyTags,
      mssConfirmed, tfAlignment, tfAlignmentSetup, confidenceLevel, oteFib,
      maxR: maxR === "" ? null : Number(maxR),
      ictModel, htfBias, pdZone, sweptLiquidity, drawOnLiquidity, displacement, smt,
      liquiditySweep: liquiditySweep || (!!sweptLiquidity && sweptLiquidity !== "Aucune"),
    });
  };

  // ── Nouveau formulaire : 3 étapes, puces, une seule calculatrice ──
  const ictFilled = [htfBias, pdZone, ictModel, sweptLiquidity, drawOnLiquidity, oteFib, confidenceLevel, mssConfirmed, displacement, smt, liquiditySweep].filter(Boolean).length + (tags || []).filter((t) => (allSetupTags || []).some((x) => x.name === t)).length;
  const ictSummary = ictFilled ? [ictModel, ictFilled + " élément" + (ictFilled > 1 ? "s" : "")].filter(Boolean).join(" · ") : "";
  const [openIct, setOpenIct] = useState(!!isEdit && ictFilled > 0);
  const [openMedia, setOpenMedia] = useState(!!(initial?.notes || initial?.screenshotBefore || initial?.screenshotAfter));
  const [showDxy, setShowDxy] = useState(!!(initial?.dxyBias || (initial?.dxyTags || []).length));
  const [showMore, setShowMore] = useState(false);
  const SESSIONS = ["London Session", "New York Session", "Asia Session", "Hors session"];
  const currentSession = tags.find((t) => SESSIONS.includes(t));
  const tfs = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
  const types = ["Scalping", "Day Trading", "Swing"];
  const setOneTag = (group, v) => setTags((prev) => [...prev.filter((t) => !group.includes(t)), ...(v ? [v] : [])]);
  const curTf = tags.find((t) => tfs.includes(t)) || "";
  const curType = tags.find((t) => types.includes(t)) || "";
  const kzName = entryTime ? killzoneLabel(entryTime) : "";
  const sbName = entryTime ? silverBulletAt(entryTime)?.name : null;
  const wantZone = direction === "long" ? "Discount" : "Premium";
  const htfOk = htfBias ? (htfBias === "Bullish") === (direction === "long") : null;
  const isClosed = status === "win" || status === "loss" || status === "breakeven" || status === "closed";
  const pctRisk = riskPct === "" ? null : Number(riskPct);

  const inp = { ...inputStyle, padding: "11px 13px", fontSize: 14 };

  return (
    <div className="fade-in" style={{ paddingBottom: 110 }}>
      <style>{`
        .tf-grid { display: grid; grid-template-columns: 1fr; gap: 12px; max-width: 760px; margin: 0 auto; }
        .tf-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 10px; }
        .chip { transition: background .12s, border-color .12s, color .12s; }
        @media (max-width: 600px) { .tf-bar { bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important; padding-bottom: 10px !important; } }
        @media (min-width: 601px) { .tf-bar { left: 220px !important; } }
        @media (min-width: 601px) and (max-width: 1024px) { .tf-bar { left: 72px !important; } }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
        <div>
          <BackLink onClick={onCancel}>Annuler</BackLink>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 0", letterSpacing: -0.4 }}>{isEdit ? "Modifier le trade" : "Nouveau trade"}</h1>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 999, border: `1px solid ${C.border}`, fontSize: 12.5, fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: appSettings?.activeAccountColor || C.teal }} />{appSettings?.activeAccountName || "Compte"}
        </span>
      </div>

      {quick ? (() => {
        const used = {}; (trades || []).forEach((t) => { used[t.pair] = (used[t.pair] || 0) + 1; });
        const allPairs = appSettings?.pairs || PAIRS;
        const topPairs = [...allPairs].sort((a, b) => (used[b] || 0) - (used[a] || 0)).slice(0, 6);
        if (!topPairs.includes(pair)) topPairs[topPairs.length - 1] = pair;
        const big = (on, col) => ({ flex: 1, padding: "14px 6px", borderRadius: 14, border: `1.5px solid ${on ? col : C.border}`, background: on ? `${col}1A` : "transparent", color: on ? col : C.textMuted, fontSize: 15, fontWeight: 800, cursor: "pointer" });
        const rOpts = status === "loss" ? ["0.5", "1"] : ["1", "1.5", "2", "3", "4"];
        const qUsd = qRval == null ? null : qRval * Number(qRisk || 0);
        const row = { display: "flex", gap: 8 };
        return (
          <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
              {topPairs.map((p) => <Chip key={p} on={pair === p} onClick={() => setPair(p)}>{p}</Chip>)}
              <select value={pair} onChange={(e) => setPair(e.target.value)} aria-label="Autre paire" style={{ ...inputStyle, width: 48, padding: "6px", fontSize: 12, borderRadius: 999, flexShrink: 0 }}>
                {allPairs.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={row}>
              <button onClick={() => setDirection("long")} style={big(direction === "long", C.teal)}>↗ Long</button>
              <button onClick={() => setDirection("short")} style={big(direction === "short", "#F97316")}>↘ Short</button>
            </div>
            <div style={row}>
              {[["win", "Gagné", C.teal], ["loss", "Perdu", C.red], ["breakeven", "BE", C.textSecondary], ["open", "En cours", C.purpleBright]].map(([v, l, col]) =>
                <button key={v} onClick={() => { setStatus(v); if (v === "loss" && !qR) setQR("1"); if (v === "win" && qR === "1" && status === "loss") setQR(""); }} style={{ ...big(status === v || (v === "win" && status === "closed"), col), fontSize: 13.5, padding: "12px 4px" }}>{l}</button>)}
            </div>
            {(status === "win" || status === "loss") && (
              <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                {rOpts.map((v) => <Chip key={v} on={qR === v} color={status === "loss" ? C.red : C.teal} onClick={() => setQR(v)}>{status === "loss" ? "-" : "+"}{v}R</Chip>)}
                <input type="number" step="0.1" inputMode="decimal" placeholder="R" value={rOpts.includes(qR) ? "" : qR} onChange={(e) => setQR(e.target.value)} aria-label="R" style={{ ...inputStyle, width: 64, padding: "8px 10px", fontSize: 13.5, borderRadius: 999 }} />
                {qUsd != null && <span className="tnum" style={{ marginLeft: "auto", fontSize: 18, fontWeight: 900, color: qUsd >= 0 ? C.teal : C.red }}>{fmtUsdSigned(qUsd)}</span>}
              </div>
            )}
            <Chips>{ICT_MODELS.map((m) => <Chip key={m} on={ictModel === m} onClick={() => setIctModel(ictModel === m ? "" : m)}>{m}</Chip>)}</Chips>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12.5, color: C.textMuted }}>
              <input type="datetime-local" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} aria-label="Date" style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: 12.5 }} />
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>1R =
                <input type="number" inputMode="decimal" value={qRisk} onChange={(e) => setQRisk(e.target.value)} aria-label="Risque en dollars" style={{ ...inputStyle, width: 72, padding: "7px 9px", fontSize: 12.5 }} />$</span>
              {kzName && <span style={{ fontWeight: 700, color: kzName === "Hors killzone" ? C.amber : C.teal }}>{kzName}</span>}
            </div>
            <button onClick={() => setQuick(false)} style={{ background: "none", border: "none", color: C.purpleBright, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "4px 0", alignSelf: "flex-start" }}>+ Détails (prix, PD Arrays, captures, notes)</button>
          </div>
        );
      })() : (
      <div className="tf-grid">
        {!isEdit && <button onClick={() => setQuick(true)} style={{ background: "none", border: "none", color: C.purpleBright, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, justifySelf: "start" }}>← Mode express</button>}
        <Section title="Trade" icon="1">
          <div className="form-grid-2">
            <Group label="Date et heure">
              <input type="datetime-local" value={entryTime} onChange={(e) => {
                setEntryTime(e.target.value);
                if (e.target.value) { const d = getSession(e.target.value); setOneTag(SESSIONS, d !== "Hors session" ? d : ""); }
              }} style={inp} />
            </Group>
            <Group label="Paire">
              <select value={pair} onChange={(e) => setPair(e.target.value)} style={{ ...inp, fontWeight: 700 }}>
                {(appSettings?.pairs || PAIRS).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Group>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, padding: "6px 11px", borderRadius: 999, background: kzName === "Hors killzone" ? C.amberDim : C.tealDim, color: kzName === "Hors killzone" ? C.amber : C.teal }}>
              {kzName || "—"}{sbName ? ` · ${sbName}` : ""}
            </span>
            <select value={currentSession || ""} onChange={(e) => setOneTag(SESSIONS, e.target.value)} aria-label="Changer la session" style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: 12, borderRadius: 999 }}>
              <option value="">Session auto</option>
              {SESSIONS.map((s) => <option key={s} value={s}>{s.replace(" Session", "")}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["long", "Long", C.teal, "3,17 9,11 13,15 21,7", "16,7 21,7 21,12"], ["short", "Short", "#F97316", "3,7 9,13 13,9 21,17", "16,17 21,17 21,12"]].map(([v, l, col, p1, p2]) => {
              const on = direction === v;
              return (
                <button key={v} onClick={() => setDirection(v)} style={{ padding: "13px", borderRadius: 14, border: `1.5px solid ${on ? col : C.border}`, background: on ? `${col}14` : "transparent", color: on ? col : C.textMuted, fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polyline points={p1} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><polyline points={p2} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>{l}
                </button>
              );
            })}
          </div>

          <div className="tf-2">
            <Group label="Entrée"><input type="number" step="any" inputMode="decimal" placeholder="1.08450" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} style={{ ...inp, fontWeight: 700 }} /></Group>
            <Group label="Stop loss"><input type="number" step="any" inputMode="decimal" placeholder="1.08200" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} style={{ ...inp, color: C.red, fontWeight: 700 }} /></Group>
            <Group label="Take profit"><input type="number" step="any" inputMode="decimal" placeholder="1.09100" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} style={{ ...inp, color: C.teal, fontWeight: 700 }} /></Group>
            <Group label="Taille (lots)"><input type="number" step="0.01" inputMode="decimal" placeholder="0.50" value={positionSize} onChange={(e) => setPositionSize(e.target.value)} style={inp} /></Group>
          </div>

          {/* Une seule calculatrice : % de risque → $ → lot */}
          <div style={{ padding: 14, borderRadius: 14, background: C.inputBg, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, color: C.textSecondary, fontWeight: 600 }}>Risque</span>
              {["0.5", "1", "2"].map((v) => <Chip key={v} on={riskPct === v} onClick={() => setRiskPct(v)}>{v}%</Chip>)}
              <input type="number" step="0.1" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} aria-label="Risque en %" style={{ ...inputStyle, width: 72, padding: "7px 9px", fontSize: 13 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div className="tnum" style={{ fontSize: 14, color: C.text }}>
                {pctRisk != null && liveCalc.riskUsdFromPct != null ? <><b style={{ color: C.red }}>${liveCalc.riskUsdFromPct}</b>{liveCalc.suggestedLot != null ? <> → <b style={{ color: C.purpleBright }}>{liveCalc.suggestedLot} lot</b></> : <span style={{ color: C.textMuted }}> · ajoute entrée et SL</span>}</> : <span style={{ color: C.textMuted }}>Choisis un % de risque</span>}
              </div>
              {liveCalc.riskUsdFromPct != null && (
                <button onClick={() => { setRiskUsd(String(liveCalc.riskUsdFromPct)); if (liveCalc.suggestedLot != null) setPositionSize(String(liveCalc.suggestedLot)); }} style={{ ...btn.primary, padding: "8px 14px" }}>Appliquer</button>
              )}
            </div>
            {(liveCalc.riskPips != null || liveCalc.theoreticalRR) && (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                {liveCalc.riskPips != null && <LiveCalcStat label="SL pips" value={liveCalc.riskPips.toFixed(1)} color={C.red} />}
                {liveCalc.rewardPips != null && <LiveCalcStat label="TP pips" value={liveCalc.rewardPips.toFixed(1)} color={C.teal} />}
                {liveCalc.theoreticalRR && <LiveCalcStat label="R:R" value={`1:${liveCalc.theoreticalRR.toFixed(2)}`} color={C.purpleBright} />}
                {liveCalc.potentialLossUsd != null && <LiveCalcStat label="Perte max" value={`$${liveCalc.potentialLossUsd.toFixed(0)}`} color={C.red} />}
                {liveCalc.potentialGainUsd != null && <LiveCalcStat label="Gain max" value={`$${liveCalc.potentialGainUsd.toFixed(0)}`} color={C.teal} />}
              </div>
            )}
          </div>

          <Group label="Risque ($)"><input type="number" step="any" placeholder="100" value={riskUsd} onChange={(e) => setRiskUsd(e.target.value)} style={inp} /></Group>

                  </Section>

        <Section title="Résultat" icon="2">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {[["open", "Ouvert", C.purpleBright], ["win", "Gagné", C.teal], ["loss", "Perdu", C.red], ["breakeven", "BE", C.textSecondary]].map(([v, l, col]) => {
              const on = status === v || (v === "win" && status === "closed" && (effectiveR || 0) > 0) || (v === "loss" && status === "closed" && (effectiveR || 0) < 0);
              return <button key={v} onClick={() => setStatus(v)} style={{ padding: "12px 4px", borderRadius: 12, border: `1.5px solid ${on ? col : C.border}`, background: on ? `${col}1A` : "transparent", color: on ? col : C.textMuted, fontSize: 13, fontWeight: on ? 800 : 500, cursor: "pointer" }}>{l}</button>;
            })}
          </div>

          {isClosed && (
            <>
              <Group label="Prix de sortie" right={<span style={{ fontSize: 11, color: C.textMuted }}>= TP par défaut</span>}>
                <input type="number" step="any" inputMode="decimal" placeholder="auto = TP" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} style={inp} />
              </Group>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ padding: "14px", borderRadius: 14, background: C.inputBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Résultat</div>
                  <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: numResult == null ? C.textMuted : numResult >= 0 ? C.teal : C.red, marginTop: 2 }}>{numResult == null ? "—" : fmtUsdSigned(numResult)}</div>
                </div>
                <div style={{ padding: "14px", borderRadius: 14, background: C.inputBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>En R</div>
                  <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: effectiveR == null ? C.textMuted : effectiveR >= 0 ? C.teal : C.red, marginTop: 2 }}>{effectiveR == null ? "—" : fmtR(effectiveR)}</div>
                </div>
              </div>
              <button onClick={() => setShowMore((v) => !v)} style={{ background: "none", border: "none", color: C.purpleBright, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0, alignSelf: "flex-start" }}>{showMore ? "− Masquer les détails" : "+ Détails (saisie manuelle, R max)"}</button>
              {showMore && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.textSecondary, cursor: "pointer" }}>
                    <input type="checkbox" checked={resultManualOverride} onChange={(e) => setResultManualOverride(e.target.checked)} /> Saisir le résultat à la main
                  </label>
                  {resultManualOverride && (
                    <div className="form-grid-2">
                      <Group label="Résultat ($)"><input type="number" step="any" value={resultUsd} onChange={(e) => setResultUsd(e.target.value)} style={inp} /></Group>
                      <Group label="Résultat (pips)"><input type="number" step="any" value={resultPips} onChange={(e) => setResultPips(e.target.value)} style={inp} /></Group>
                    </div>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.textSecondary, cursor: "pointer" }}>
                    <input type="checkbox" checked={resultRManual} onChange={(e) => setResultRManual(e.target.checked)} /> Corriger le R
                  </label>
                  {resultRManual && <input type="number" step="0.01" placeholder="Ex : 2.5" value={resultRValue} onChange={(e) => setResultRValue(e.target.value)} style={{ ...inp, maxWidth: 160 }} />}
                  <Group label="R max atteint" right={<span style={{ fontSize: 11, color: C.textMuted }}>pour le simulateur de TP</span>}>
                    <input type="number" step="0.1" placeholder="Ex : 2.8" value={maxR} onChange={(e) => setMaxR(e.target.value)} style={{ ...inp, maxWidth: 160 }} />
                  </Group>
                </div>
              )}
            </>
          )}

                  </Section>

        <Section title="Contexte ICT" icon="3" sub={ictSummary || "Facultatif — modèle, PD Arrays, liquidité…"} open={openIct} onToggle={() => setOpenIct((v) => !v)}>
          <Group label="Modèle ICT">
            <Chips>{ICT_MODELS.map((m) => <Chip key={m} on={ictModel === m} onClick={() => setIctModel(ictModel === m ? "" : m)}>{m}</Chip>)}</Chips>
          </Group>

          <Group label="Biais HTF" hint={htfOk === false ? "Contre ton biais HTF" : null}>
            <Chips>
              <Chip on={htfBias === "Bullish"} color={C.teal} onClick={() => setHtfBias(htfBias === "Bullish" ? "" : "Bullish")}><TrendingUp size={13} style={{ verticalAlign: -2 }} /> Bullish</Chip>
              <Chip on={htfBias === "Bearish"} color={C.red} onClick={() => setHtfBias(htfBias === "Bearish" ? "" : "Bearish")}><TrendingDown size={13} style={{ verticalAlign: -2 }} /> Bearish</Chip>
            </Chips>
          </Group>

          <Group label="Zone d'entrée" hint={pdZone && pdZone !== "Equilibrium" && pdZone !== wantZone ? `${direction === "long" ? "Long en premium" : "Short en discount"}` : null}>
            <Chips>
              {[["Discount", C.teal], ["Equilibrium", C.textSecondary], ["Premium", C.red]].map(([z, col]) => (
                <Chip key={z} on={pdZone === z} color={col} onClick={() => setPdZone(pdZone === z ? "" : z)}>{z === "Equilibrium" ? "Équilibre" : z}</Chip>
              ))}
            </Chips>
          </Group>

          <Group label="PD Arrays">
            <Chips>{allSetupTags.map((t) => <Chip key={t.name} on={tags.includes(t.name)} onClick={() => toggleTag(t.name)}>{t.name}</Chip>)}</Chips>
          </Group>

          <Group label="Liquidité prise">
            <Chips>{[...LIQ_POINTS, "Aucune"].map((m) => <Chip key={m} on={sweptLiquidity === m} color={C.amber} onClick={() => setSweptLiquidity(sweptLiquidity === m ? "" : m)}>{m}</Chip>)}</Chips>
          </Group>

          <Group label="Draw on liquidity">
            <Chips>{[...LIQ_POINTS, "FVG HTF", "OB HTF"].map((m) => <Chip key={m} on={drawOnLiquidity === m} color={C.teal} onClick={() => setDrawOnLiquidity(drawOnLiquidity === m ? "" : m)}>{m}</Chip>)}</Chips>
          </Group>

          <Group label="Confirmations">
            <Chips>
              <Chip on={mssConfirmed} color={C.teal} onClick={() => setMssConfirmed(!mssConfirmed)}>MSS</Chip>
              <Chip on={displacement} color={C.teal} onClick={() => setDisplacement(!displacement)}>Displacement</Chip>
              <Chip on={smt} color={C.teal} onClick={() => setSmt(!smt)}>SMT</Chip>
              <Chip on={liquiditySweep} color={C.teal} onClick={() => setLiquiditySweep(!liquiditySweep)}>Sweep</Chip>
            </Chips>
          </Group>

          <Group label="OTE">
            <Chips>{["0.5", "0.618", "0.7", "0.79"].map((f) => <Chip key={f} on={oteFib === f} color={C.teal} onClick={() => setOteFib(oteFib === f ? "" : f)}>{f}</Chip>)}</Chips>
          </Group>

          <div className="form-grid-2">
            <Group label="Timeframe d'entrée">
              <Chips>{tfs.slice(0, 6).map((tf) => <Chip key={tf} on={curTf === tf} onClick={() => setOneTag(tfs, curTf === tf ? "" : tf)}>{tf}</Chip>)}</Chips>
            </Group>
            <Group label="Type">
              <Chips>{types.map((ty) => <Chip key={ty} on={curType === ty} onClick={() => setOneTag(types, curType === ty ? "" : ty)}>{ty}</Chip>)}</Chips>
            </Group>
          </div>

          <Group label="Confiance avant le trade" right={<span className="tnum" style={{ fontSize: 13, fontWeight: 800, color: confidenceLevel ? C.purpleBright : C.textMuted }}>{confidenceLevel ? `${confidenceLevel}/10` : "—"}</span>}>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                const col = n <= 3 ? C.red : n <= 5 ? C.amber : n <= 7 ? C.teal : C.purpleBright;
                const filled = n <= confidenceLevel;
                return <button key={n} onClick={() => setConfidenceLevel(n === confidenceLevel ? 0 : n)} aria-label={`Confiance ${n}`} style={{ flex: 1, height: 26, borderRadius: 6, border: `1px solid ${filled ? col : C.border}`, background: filled ? col : "transparent", cursor: "pointer", fontSize: 10, fontWeight: 700, color: filled ? "#fff" : C.textMuted }}>{n}</button>;
              })}
            </div>
          </Group>

          <PreTradeContext trades={(trades || []).filter((t) => t.id !== initial?.id)} pair={pair} direction={direction} tags={tags} ictModel={ictModel} entryTime={entryTime} />
        </Section>

        <Section title="Captures & notes" icon="4" sub={[screenshotBefore && "avant", screenshotAfter && "après", notes && "notes"].filter(Boolean).join(" · ") || "Facultatif"} open={openMedia} onToggle={() => setOpenMedia((v) => !v)}>
          <Group label="">
            {screenshotBefore ? (
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <img src={screenshotBefore} alt="Avant" style={{ width: "100%", display: "block", maxHeight: 240, objectFit: "contain", background: C.bg }} />
                <button onClick={() => { setScreenshotBefore(null); setExtractedMeta(null); }} aria-label="Retirer" style={{ position: "absolute", top: 8, right: 8, background: "rgba(15,17,23,0.85)", border: "none", borderRadius: 8, color: "#fff", padding: 6, cursor: "pointer", display: "flex" }}><X size={13} /></button>
              </div>
            ) : <SmartCaptureBox value={screenshotBefore} onChange={setScreenshotBefore} onExtracted={handleExtracted} />}
          </Group>

          <ImageUploadBox label="Screenshot après" value={screenshotAfter} onChange={setScreenshotAfter} />

          <Group label="Notes">
            <textarea rows={4} placeholder="Contexte, ce que tu as vu, ce que tu as ressenti…" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inp, resize: "vertical", lineHeight: 1.55 }} />
          </Group>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <button onClick={() => setShowDxy((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 8, color: C.text, fontSize: 13.5, fontWeight: 700, width: "100%" }}>
              <span style={{ color: C.amber }}>DXY</span>
              {dxyBias && <span style={{ fontSize: 11.5, color: C.textMuted, fontWeight: 500 }}>{dxyBias}{dxyTags.length ? ` · ${dxyTags.length} PD Array` : ""}</span>}
              <ChevronDown size={15} style={{ marginLeft: "auto", transform: showDxy ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {showDxy && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
                <Chips>{[["Bullish", C.teal], ["Bearish", C.red], ["Neutre", C.textSecondary]].map(([b, col]) => <Chip key={b} on={dxyBias === b} color={col} onClick={() => setDxyBias(dxyBias === b ? "" : b)}>{b}</Chip>)}</Chips>
                <Chips>{TAG_CATALOG.filter((t) => t.category === "setup").map((t) => <Chip key={t.name} on={dxyTags.includes(t.name)} color={C.amber} onClick={() => setDxyTags((prev) => prev.includes(t.name) ? prev.filter((x) => x !== t.name) : [...prev, t.name])}>{t.name}</Chip>)}</Chips>
                <div className="form-grid-2">
                  <ImageUploadBox label="DXY avant" value={dxyScreenshotBefore} onChange={setDxyScreenshotBefore} />
                  <ImageUploadBox label="DXY après" value={dxyScreenshotAfter} onChange={setDxyScreenshotAfter} />
                </div>
              </div>
            )}
          </div>
                </Section>
      </div>
      )}

      {/* Barre fixe en bas : navigation + enregistrer */}
      <div className="tf-bar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 900, padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px)", background: `${C.bg}F2`, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ flex: 1, fontSize: 12, color: C.textMuted, minWidth: 0 }}>{!canSave ? (quick ? "Choisis le R" : "Entrée et taille requises") : ""}</span>
          <button onClick={handleSubmit} disabled={!canSave} style={{ ...btn.primary, padding: "12px 20px", fontSize: 14, fontWeight: 800, borderRadius: 12, opacity: canSave ? 1 : 0.45, cursor: canSave ? "pointer" : "not-allowed" }}>
            <Save size={15} /> {isEdit ? "Enregistrer" : "Enregistrer le trade"}
          </button>
        </div>
      </div>
    </div>
  );
}



/* ============================================================================
   STATISTIQUES — section extrêmement détaillée
   ============================================================================ */

function RankBar({ label, pnl, winRate, count, maxAbsPnl }) {
  const pct = maxAbsPnl ? (Math.abs(pnl) / maxAbsPnl) * 100 : 0;
  const positive = pnl >= 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="tnum" style={{ fontWeight: 700, color: positive ? C.teal : C.red }}>{fmtUsdSigned(pnl)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: C.bg, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(pct, 2)}%`, height: "100%", background: positive ? C.teal : C.red, borderRadius: 3 }} />
      </div>
      <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 3 }}>{count} trade{count > 1 ? "s" : ""} · {winRate.toFixed(0)}% WR</div>
    </div>
  );
}

function RankList({ groups, limit, emptyText }) {
  const sorted = [...groups].sort((a, b) => b.pnl - a.pnl).slice(0, limit);
  const maxAbsPnl = Math.max(...groups.map((g) => Math.abs(g.pnl)), 1);
  if (sorted.length === 0) return <div style={{ fontSize: 12, color: C.textMuted }}>{emptyText}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {sorted.map((g) => <RankBar key={g.key} label={g.key} pnl={g.pnl} winRate={g.winRate} count={g.count} maxAbsPnl={maxAbsPnl} />)}
    </div>
  );
}

function DataTable({ columns, rows }) {
  const minW = columns.length * 58;
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", minWidth: minW, borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: c.align || "left", padding: "8px 6px", fontSize: 10.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: "9px 6px", textAlign: c.align || "left", color: c.color ? c.color(row) : C.text, whiteSpace: "nowrap" }}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatsHeatmap({ trades }) {
  const byDay = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      const d = new Date(t.entryTime);
      const key = localYMD(d);
      if (!map[key]) map[key] = 0;
      map[key] += t.resultUsd || 0;
    });
    return map;
  }, [trades]);

  // Construit une grille de 16 semaines x 7 jours se terminant à "aujourd'hui" (cohérent avec les données mock)
  const today = new Date();
  const weeks = 16;
  const endOffset = (today.getUTCDay() + 6) % 7; // lundi = 0
  const gridStart = new Date(today);
  gridStart.setUTCDate(today.getUTCDate() - endOffset - (weeks - 1) * 7);

  const allPnls = Object.values(byDay).map((v) => Math.abs(v));
  const maxAbs = Math.max(...allPnls, 1);

  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      const key = localYMD(date);
      const pnl = byDay[key];
      col.push({ date, key, pnl });
    }
    cols.push(col);
  }

  const cellColor = (pnl) => {
    if (pnl === undefined) return C.bg;
    if (pnl === 0) return C.border;
    const intensity = Math.min(Math.abs(pnl) / maxAbs, 1);
    if (pnl > 0) {
      const alpha = 0.18 + intensity * 0.7;
      return `rgba(22, 184, 160, ${alpha.toFixed(2)})`;
    }
    const alpha = 0.18 + intensity * 0.7;
    return `rgba(232, 85, 78, ${alpha.toFixed(2)})`;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 3, minWidth: 560 }}>
        {cols.map((col, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {col.map((cell) => (
              <div
                key={cell.key}
                title={`${cell.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} : ${cell.pnl !== undefined ? fmtUsdSigned(cell.pnl) : "pas de trade"}`}
                style={{ width: 13, height: 13, borderRadius: 3, background: cellColor(cell.pnl), border: `1px solid ${C.border}` }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 10.5, color: C.textMuted }}>
        <span>Perte</span>
        <div style={{ display: "flex", gap: 2 }}>
          {[0.2, 0.4, 0.6, 0.88].reverse().map((a, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: `rgba(232, 85, 78, ${a})` }} />)}
        </div>
        <div style={{ width: 11, height: 11, borderRadius: 2, background: C.border, marginLeft: 2 }} />
        <div style={{ display: "flex", gap: 2 }}>
          {[0.2, 0.4, 0.6, 0.88].map((a, i) => <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: `rgba(22, 184, 160, ${a})` }} />)}
        </div>
        <span>Profit</span>
      </div>
    </div>
  );
}

function OverviewStats({ trades }) {
  const [sub, setSub] = useState("apercu");
  const closed = useMemo(() => trades.filter((t) => t.status !== "open"), [trades]);
  const sumR = (arr) => arr.reduce((s, t) => s + (Number(t.resultR) || 0), 0);
  const retenir = useMemo(() => {
    const grp = (fn) => { const m = {}; closed.forEach((t) => { const k = fn(t); if (!k) return; (m[k] = m[k] || []).push(t); }); return Object.entries(m).map(([k, l]) => ({ k, n: l.length, r: sumR(l) })).filter((x) => x.n >= 2); };
    const best = (a) => { const x = [...a].sort((p, q) => q.r - p.r)[0]; return x && x.r > 0 ? x : null; };
    const worst = (a) => { const x = [...a].sort((p, q) => p.r - q.r)[0]; return x && x.r < 0 ? x : null; };
    const mist = {}; closed.forEach((t) => [...new Set([...(t.mistakes || []), ...(t.tags || []).filter((g) => TAG_CATALOG.find((c) => c.name === g && c.category === "mistake"))])].forEach((m) => { (mist[m] = mist[m] || []).push(t); }));
    const wm = Object.entries(mist).map(([k, l]) => ({ k, n: l.length, r: sumR(l) })).sort((a, b) => a.r - b.r)[0];
    return [["Meilleure session", best(grp((t) => getSession(t.entryTime)))], ["Meilleure paire", best(grp((t) => t.pair))], ["Meilleur modèle ICT", best(grp((t) => t.ictModel))], ["Pire paire", worst(grp((t) => t.pair))], ["Pire erreur", wm && wm.r < 0 ? wm : null]].filter((x) => x[1]);
  }, [closed]);

  const byPair = useMemo(() => groupBy(closed, (t) => t.pair), [closed]);
  const bySetup = useMemo(() => {
    const map = {};
    closed.forEach(t => {
      const pdTags = (t.tags || []).filter(tag => TAG_CATALOG.find(tc => tc.name === tag && tc.category === "setup"));
      const keys = pdTags.length > 0 ? pdTags : (t.setup ? [t.setup] : []);
      keys.forEach(key => {
        if (!map[key]) map[key] = { key, trades: [], pnl: 0, wins: 0, count: 0, winRate: 0 };
        map[key].trades.push(t);
        map[key].pnl += t.resultUsd || 0;
        map[key].count += 1;
        if (t.resultR > 0) map[key].wins += 1;
      });
    });
    return Object.values(map).map(g => ({ ...g, winRate: g.count ? g.wins / g.count * 100 : 0 }));
  }, [closed]);
  const bySession = useMemo(() => groupBy(closed, (t) => getSession(t.entryTime)), [closed]);

  const byHour = useMemo(() => {
    const groups = groupBy(closed, (t) => `${String((new Date(t.entryTime).getUTCHours() + 7) % 24).padStart(2, "0")}h`);
    return groups.sort((a, b) => a.key.localeCompare(b.key));
  }, [closed]);

  const byDay = useMemo(() => {
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const order = [1, 2, 3, 4, 5, 6, 0];
    const groups = groupBy(closed, (t) => dayNames[new Date(t.entryTime).getDay()]);
    return order.map((idx) => groups.find((g) => g.key === dayNames[idx])).filter(Boolean);
  }, [closed]);

  const byTagAll = useMemo(() => {
    const expanded = [];
    closed.forEach((t) => (t.tags || []).forEach((tag) => expanded.push({ ...t, _key: tag })));
    return groupBy(expanded, (t) => t._key);
  }, [closed]);

  // Analyse PD Arrays : winrate + avgR + confiance moyenne + OTE impact
  

  // OTE impact : trades avec OTE vs sans OTE
  

  // Confiance vs résultat
  

  const setupFull = useMemo(() => {
    return [...bySetup].map((g) => ({
      key: g.key,
      count: g.count,
      winRate: g.winRate,
      pnl: g.pnl,
      avgR: g.trades.reduce((s, t) => s + (t.resultR || 0), 0) / g.trades.length,
      totR: g.trades.reduce((s, t) => s + (t.resultR || 0), 0),
    })).sort((a, b) => b.totR - a.totR);
  }, [bySetup]);
  const ictFull = useMemo(() => groupBy(closed.filter((t) => t.ictModel), (t) => t.ictModel).map((g) => ({ key: g.key, count: g.count, winRate: g.winRate, avgR: g.trades.reduce((s, t) => s + (t.resultR || 0), 0) / g.trades.length, totR: g.trades.reduce((s, t) => s + (t.resultR || 0), 0) })).sort((a, b) => b.totR - a.totR), [closed]);

  const pairFull = useMemo(() => {
    return [...byPair].map((g) => ({
      key: g.key,
      count: g.count,
      winRate: g.winRate,
      pnl: g.pnl,
      avgR: g.trades.reduce((s, t) => s + (t.resultR || 0), 0) / g.trades.length,
      totR: g.trades.reduce((s, t) => s + (t.resultR || 0), 0),
    })).sort((a, b) => b.totR - a.totR);
  }, [byPair]);

  const mistakeFreq = useMemo(() => {
    const mistakeTags = TAG_CATALOG.filter((t) => t.category === "mistake").map((t) => t.name);
    const counts = {};
    closed.forEach((t) => (t.tags || []).filter((tag) => mistakeTags.includes(tag)).forEach((tag) => {
      counts[tag] = counts[tag] || { count: 0, pnlImpact: 0, trades: [] };
      counts[tag].count += 1;
      counts[tag].pnlImpact += t.resultUsd || 0;
      counts[tag].trades.push(t);
    }));
    return Object.entries(counts).map(([name, v]) => ({ name, ...v, avgImpact: v.pnlImpact / v.count })).sort((a, b) => b.count - a.count);
  }, [closed]);

  const distribution = useMemo(() => {
    const buckets = [
      { label: "< -2R", min: -Infinity, max: -2, count: 0 },
      { label: "-2R à -1R", min: -2, max: -1, count: 0 },
      { label: "-1R à 0R", min: -1, max: 0, count: 0 },
      { label: "0R à 1R", min: 0, max: 1, count: 0 },
      { label: "1R à 2R", min: 1, max: 2, count: 0 },
      { label: "2R à 3R", min: 2, max: 3, count: 0 },
      { label: "> 3R", min: 3, max: Infinity, count: 0 },
    ];
    closed.forEach((t) => {
      const r = t.resultR || 0;
      const b = buckets.find((b) => r >= b.min && r < b.max) || buckets[buckets.length - 1];
      b.count += 1;
    });
    return buckets;
  }, [closed]);

  if (closed.length === 0) {
    return (
      <div className="fade-in">
        <EmptyState icon={BarChart3} title="Pas encore assez de données" text="Ajoute des trades pour débloquer l'analyse détaillée." />
      </div>
    );
  }

  const TABS = [["apercu", "Aperçu"], ["setups", "Setups"], ["horaires", "Horaires"]];
  return (
    <div className="fade-in">
      <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, marginBottom: 14 }}>
        {TABS.map(([k, l]) => <button key={k} onClick={() => setSub(k)} style={{ flex: 1, height: 34, borderRadius: 9, border: "none", background: sub === k ? C.purpleDim : "transparent", color: sub === k ? C.purpleBright : C.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>{l}</button>)}
      </div>

      {sub === "apercu" && <>
      <Card style={{ padding: 0, marginBottom: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px 6px" }}><CardLabel>À retenir</CardLabel></div>
        {retenir.length === 0 && <div style={{ padding: "6px 18px 16px", fontSize: 12.5, color: C.textMuted }}>Pas encore assez de trades.</div>}
        {retenir.map(([l, x], i) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderTop: `1px solid ${C.border}` }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: x.r >= 0 ? C.teal : C.red, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: C.textMuted, width: 128, flexShrink: 0 }}>{l}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.k}</span>
            <span className="tnum" style={{ fontSize: 14, fontWeight: 800, color: x.r >= 0 ? C.teal : C.red }}>{fmtR(x.r)}</span>
          </div>))}
      </Card>
      </>}

      {sub === "setups" && <>
      {ictFull.length > 0 && <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>Performance par modèle ICT</CardLabel>
        <div style={{ marginTop: 12 }} className="table-scroll">
          <DataTable columns={[
              { key: "key", label: "Modèle" },
              { key: "count", label: "Trades", align: "right" },
              { key: "winRate", label: "Winrate", align: "right", render: (r) => fmtPct(r.winRate) },
              { key: "avgR", label: "R moy.", align: "right", render: (r) => fmtR(r.avgR), color: (r) => r.avgR >= 0 ? C.teal : C.red },
              { key: "totR", label: "Total", align: "right", render: (r) => fmtR(r.totR), color: (r) => r.totR >= 0 ? C.teal : C.red },
            ]} rows={ictFull} />
        </div>
      </Card>}

      {/* Tableau setup complet — winrate, trades, profit, average R réunis (priorité tableau pro) */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>Performance par setup</CardLabel>
        <div style={{ marginTop: 12 }} className="table-scroll">
          <DataTable
            columns={[
              { key: "key", label: "Setup" },
              { key: "count", label: "Trades", align: "right" },
              { key: "winRate", label: "Winrate", align: "right", render: (r) => fmtPct(r.winRate) },
              { key: "avgR", label: "R moy.", align: "right", render: (r) => fmtR(r.avgR), color: (r) => r.avgR >= 0 ? C.teal : C.red },
              { key: "totR", label: "Total", align: "right", render: (r) => fmtR(r.totR), color: (r) => r.totR >= 0 ? C.teal : C.red },
            ]}
            rows={setupFull}
          />
        </div>
      </Card>

      {/* Winrate & Profit par paire */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>Performance par paire</CardLabel>
        <div style={{ marginTop: 12 }} className="table-scroll">
          <DataTable
            columns={[
              { key: "key", label: "Paire" },
              { key: "count", label: "Trades", align: "right" },
              { key: "winRate", label: "Winrate", align: "right", render: (r) => fmtPct(r.winRate) },
              { key: "avgR", label: "R moy.", align: "right", render: (r) => fmtR(r.avgR), color: (r) => r.avgR >= 0 ? C.teal : C.red },
              { key: "totR", label: "Total", align: "right", render: (r) => fmtR(r.totR), color: (r) => r.totR >= 0 ? C.teal : C.red },
            ]}
            rows={pairFull}
          />
        </div>
      </Card>

      </>}

      {sub === "horaires" && <>
      {/* Profit par session — directement sous Profit par paire */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>Profit par session</CardLabel>
        <div style={{ marginTop: 12 }}>
          <RankList groups={bySession} limit={5} emptyText="Pas de données." />
        </div>
      </Card>

      {/* Profit par heure / jour */}
      <div className="grid-2" style={{ marginBottom: 14 }}>
        <Card style={{ padding: 18 }}>
          <CardLabel>Profit par heure (Thaïlande)</CardLabel>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={byHour} margin={{ top: 10, right: 4, left: -6, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="key" tick={{ fill: C.textMuted, fontSize: 8.5 }} axisLine={{ stroke: C.border }} tickLine={false} interval={2} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={42} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.borderLight}`, borderRadius: 8, fontSize: 11 }} formatter={(v) => [fmtUsdSigned(v), "P&L"]} cursor={{ fill: "rgba(30,36,51,0.04)" }} />
              <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>{byHour.map((g, i) => <Cell key={i} fill={g.pnl >= 0 ? C.teal : C.red} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding: 18 }}>
          <CardLabel>Profit par jour de la semaine</CardLabel>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={byDay} margin={{ top: 10, right: 4, left: -6, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="key" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={{ stroke: C.border }} tickLine={false} tickFormatter={(v) => v.slice(0, 3)} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={42} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.borderLight}`, borderRadius: 8, fontSize: 11 }} formatter={(v) => [fmtUsdSigned(v), "P&L"]} cursor={{ fill: "rgba(30,36,51,0.04)" }} />
              <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>{byDay.map((g, i) => <Cell key={i} fill={g.pnl >= 0 ? C.teal : C.red} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      </>}

      {sub === "apercu" && <>
      {/* Distribution des gains/pertes en pleine largeur */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>Distribution des gains et pertes</CardLabel>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={distribution} margin={{ top: 10, right: 4, left: -6, bottom: 0 }}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.textMuted, fontSize: 8.5 }} axisLine={{ stroke: C.border }} tickLine={false} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.borderLight}`, borderRadius: 8, fontSize: 11 }} formatter={(v) => [v, "Trades"]} cursor={{ fill: "rgba(30,36,51,0.04)" }} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>{distribution.map((d, i) => <Cell key={i} fill={d.min >= 0 ? C.teal : C.red} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

      {/* Heatmap calendrier — vue compacte de la performance quotidienne */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>Heatmap calendrier</CardLabel>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, marginBottom: 14 }}>Intensité du P&L par jour, 16 dernières semaines</div>
        <StatsHeatmap trades={closed} />
      </Card>

      </>}

      {sub === "setups" && <>
      {/* Analyse des tags — PD Arrays séparés des TF */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>PD Arrays — Performance</CardLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12, maxHeight: 300, overflowY: "auto" }}>
          {[...byTagAll].filter(g => TAG_CATALOG.find(tc => tc.name === g.key && tc.category === "setup")).sort((a, b) => b.pnl - a.pnl).map(g => (
            <div key={g.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 7, background: C.inputBg || C.card, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <TagBadge name={g.key} size="sm" />
                <span style={{ fontSize: 11, color: C.textMuted }}>{g.count}T</span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className="tnum" style={{ fontSize: 11, color: g.winRate >= 50 ? C.teal : C.red }}>{g.winRate.toFixed(0)}% WR</span>
                <span className="tnum" style={{ fontWeight: 700, fontSize: 12, color: g.pnl >= 0 ? C.teal : C.red, minWidth: 65, textAlign: "right" }}>{fmtUsdSigned(g.pnl)}</span>
              </div>
            </div>
          ))}
          {byTagAll.filter(g => TAG_CATALOG.find(tc => tc.name === g.key && tc.category === "setup")).length === 0 && (
            <div style={{ fontSize: 12, color: C.textMuted, padding: "12px 0" }}>Aucun PD Array taggé sur tes trades.</div>
          )}
        </div>
      </Card>

      <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>Timeframes — Performance</CardLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {[...byTagAll].filter(g => ["M1","M5","M15","M30","H1","H4","D1","W1"].includes(g.key)).sort((a, b) => b.count - a.count).map(g => (
            <div key={g.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", borderRadius: 7, background: C.inputBg || C.card, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.purpleBright, background: C.purpleDim, padding: "2px 8px", borderRadius: 5 }}>{g.key}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{g.count}T</span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className="tnum" style={{ fontSize: 11, color: g.winRate >= 50 ? C.teal : C.red }}>{g.winRate.toFixed(0)}% WR</span>
                <span className="tnum" style={{ fontWeight: 700, fontSize: 12, color: g.pnl >= 0 ? C.teal : C.red, minWidth: 65, textAlign: "right" }}>{fmtUsdSigned(g.pnl)}</span>
              </div>
            </div>
          ))}
          {byTagAll.filter(g => ["M1","M5","M15","M30","H1","H4","D1","W1"].includes(g.key)).length === 0 && (
            <div style={{ fontSize: 12, color: C.textMuted, padding: "12px 0" }}>Aucun timeframe taggé.</div>
          )}
        </div>
      </Card>

      </>}

      {sub === "apercu" && <>
      {/* Tableau des erreurs fréquentes */}
      <Card style={{ padding: 18 }}>
        <CardLabel>Erreurs les plus fréquentes</CardLabel>
        {mistakeFreq.length === 0 ? (
          <div style={{ fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <Trophy size={14} color={C.teal} /> Aucune erreur taguée — excellent travail de discipline.
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <DataTable
              columns={[
                { key: "name", label: "Erreur", render: (r) => <TagBadge name={r.name} size="sm" /> },
                { key: "count", label: "Occurrences", align: "right" },
                { key: "avgImpact", label: "Impact moyen", align: "right", render: (r) => fmtUsdSigned(r.avgImpact), color: () => C.red },
                { key: "pnlImpact", label: "Impact total", align: "right", render: (r) => fmtUsdSigned(r.pnlImpact), color: () => C.red },
              ]}
              rows={mistakeFreq}
            />
          </div>
        )}
      </Card>
      </>}
    </div>
  );
}

/* ============================================================================
   ANALYSE — erreurs, ce qui marche, psychologie, exécution, revue de la semaine
   ============================================================================ */

const SESSION_TAGS = ["London Session", "New York Session", "Asia Session", "Hors session"];
const TF_TAGS = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1"];
const TYPE_TAGS = ["Swing", "Day Trading", "Scalping"];
const MISTAKE_TAGS = TAG_CATALOG.filter((t) => t.category === "mistake").map((t) => t.name);
const isSetupTag = (tag) => !SESSION_TAGS.includes(tag) && !TF_TAGS.includes(tag) && !TYPE_TAGS.includes(tag) && !MISTAKE_TAGS.includes(tag);
const setupsOf = (t) => (t.tags || []).filter(isSetupTag);
const sessionOf = (t) => (t.tags || []).find((g) => SESSION_TAGS.includes(g)) || getSession(t.entryTime);
const mistakesOf = (t) => [...new Set([...(t.mistakes || []), ...(t.tags || []).filter((g) => MISTAKE_TAGS.includes(g))])];
const closedOf = (trades) => trades.filter((t) => t.status !== "open");
const kzOf = (t) => killzoneLabel(t.entryTime);
const htfAligned = (t) => (t.htfBias ? (t.htfBias === "Bullish") === (t.direction === "long") : null);
const pdAligned = (t) => (!t.pdZone || t.pdZone === "Equilibrium" ? null : (t.direction === "long" ? t.pdZone === "Discount" : t.pdZone === "Premium"));
const sweptOf = (t) => (t.sweptLiquidity && t.sweptLiquidity !== "Aucune") || t.liquiditySweep ? true : (t.sweptLiquidity === "Aucune" ? false : null);
// Règles ICT vérifiées automatiquement à partir de ce que tu remplis
const ICT_RULES = [
  { label: "Dans le sens du biais HTF", test: (t) => htfAligned(t) },
  { label: "Bon côté premium / discount", test: (t) => pdAligned(t) },
  { label: "Pendant une killzone", test: (t) => kzOf(t) !== "Hors killzone" },
  { label: "Liquidité prise avant l'entrée", test: (t) => sweptOf(t) },
  { label: "MSS confirmé", test: (t) => !!t.mssConfirmed },
  { label: "Displacement", test: (t) => !!t.displacement },
  { label: "DXY aligné", test: (t) => dxyAligned(t) },
  { label: "SMT divergence", test: (t) => !!t.smt },
];

function IctRulesTable({ closed }) {
  const rows = ICT_RULES.map((rule) => {
    const yes = closed.filter((t) => rule.test(t) === true), no = closed.filter((t) => rule.test(t) === false);
    return { label: rule.label, yes: aggR(yes), no: aggR(no) };
  }).filter((r) => r.yes.n + r.no.n > 0);
  if (!rows.length) return <div style={{ fontSize: 12, color: C.textMuted }}>Remplis la carte « Contexte ICT » de tes trades pour voir cette analyse.</div>;
  const G = "minmax(0,1.3fr) 1fr 1fr 58px";
  const cell = (a) => a.n ? <span className="tnum" style={{ color: rCol(a.avgR), fontWeight: 700 }}>{fmtRs(a.avgR)} <span style={{ color: C.textMuted, fontWeight: 500, fontSize: 10.5 }}>· {a.n}T · {a.wr.toFixed(0)}%</span></span> : <span style={{ color: C.textMuted }}>—</span>;
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: G, gap: 6, padding: "7px 12px", background: C.inputBg, fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>
        <div>Règle</div><div>Respectée</div><div>Pas respectée</div><div style={{ textAlign: "right" }}>Écart</div>
      </div>
      {rows.map((r) => { const gap = r.yes.n && r.no.n ? r.yes.avgR - r.no.avgR : null; return (
        <div key={r.label} style={{ display: "grid", gridTemplateColumns: G, gap: 6, padding: "9px 12px", borderTop: `1px solid ${C.border}`, alignItems: "center", fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{r.label}</div>
          <div>{cell(r.yes)}</div><div>{cell(r.no)}</div>
          <div className="tnum" style={{ textAlign: "right", fontWeight: 800, color: gap == null ? C.textMuted : rCol(gap) }}>{gap == null ? "—" : fmtRs(gap)}</div>
        </div>); })}
      <div style={{ padding: "6px 12px", fontSize: 10, color: C.textMuted, borderTop: `1px solid ${C.border}` }}>Moyenne par trade. Écart = ce que la règle te rapporte quand tu la respectes.</div>
    </div>
  );
}
const rOf = (t) => (t.status === "breakeven" ? 0 : Number(t.resultR) || 0);

function pipSize(pair) {
  if (pair.includes("JPY") || pair === "XAUUSD" || pair === "XAGUSD") return 0.01;
  if (["US30", "NAS100", "SPX500", "BTCUSD", "ETHUSD"].includes(pair)) return 1;
  return 0.0001;
}

// Biais DXY attendu selon la paire et le sens : EURUSD long → DXY baissier, USDJPY long → DXY haussier
function dxyAligned(t) {
  if (!t.dxyBias || t.dxyBias === "Neutre" || !t.pair) return null;
  const base = t.pair.slice(0, 3), quote = t.pair.slice(3);
  let expected = null;
  if (quote === "USD") expected = t.direction === "long" ? "Bearish" : "Bullish";
  else if (base === "USD") expected = t.direction === "long" ? "Bullish" : "Bearish";
  if (!expected) return null;
  return expected === t.dxyBias;
}

function aggR(arr) {
  const n = arr.length;
  const wins = arr.filter((t) => rOf(t) > 0).length;
  const sumR = arr.reduce((s, t) => s + rOf(t), 0);
  const pnl = arr.reduce((s, t) => s + (t.resultUsd || 0), 0);
  return { n, wins, wr: n ? (wins / n) * 100 : 0, sumR, avgR: n ? sumR / n : 0, pnl };
}

function groupAgg(trades, keysFn) {
  const m = {};
  trades.forEach((t) => {
    const ks = keysFn(t);
    (Array.isArray(ks) ? ks : [ks]).forEach((k) => { if (k == null || k === "") return; (m[k] = m[k] || []).push(t); });
  });
  return Object.entries(m).map(([label, arr]) => ({ label, ...aggR(arr), trades: arr }));
}

const rCol = (v) => (v > 0.0001 ? C.teal : v < -0.0001 ? C.red : C.textSecondary);
const fmtRs = (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}R`;

function ASection({ title, sub, children, right }) {
  return (
    <Card style={{ padding: 18, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{title}</div>
          {sub && <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
        </div>
        {right}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </Card>
  );
}

function AggTable({ rows, labelHead = "", empty = "Pas encore de données.", minN = 5, limit }) {
  const list = limit ? rows.slice(0, limit) : rows;
  if (!list.length) return <div style={{ fontSize: 12, color: C.textMuted }}>{empty}</div>;
  const G = "minmax(0,1fr) 38px 48px 62px 66px";
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: G, gap: 6, padding: "7px 12px", background: C.inputBg, fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>
        <div>{labelHead}</div><div style={{ textAlign: "right" }}>N</div><div style={{ textAlign: "right" }}>WR</div><div style={{ textAlign: "right" }}>Moy.</div><div style={{ textAlign: "right" }}>Total</div>
      </div>
      {list.map((r, i) => (
        <div key={r.label + i} style={{ display: "grid", gridTemplateColumns: G, gap: 6, padding: "9px 12px", borderTop: `1px solid ${C.border}`, alignItems: "center", opacity: r.n < minN ? 0.5 : 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, minWidth: 0, lineHeight: 1.35, overflowWrap: "anywhere" }}>{r.label}</div>
          <div className="tnum" style={{ textAlign: "right", fontSize: 12, color: C.textSecondary }}>{r.n}</div>
          <div className="tnum" style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: r.wr >= 50 ? C.teal : C.red }}>{r.wr.toFixed(0)}%</div>
          <div className="tnum" style={{ textAlign: "right", fontSize: 12, fontWeight: 700, color: rCol(r.avgR) }}>{fmtRs(r.avgR)}</div>
          <div className="tnum" style={{ textAlign: "right", fontSize: 12.5, fontWeight: 800, color: rCol(r.sumR) }}>{fmtRs(r.sumR)}</div>
        </div>
      ))}
      <div style={{ padding: "6px 12px", fontSize: 10, color: C.textMuted, borderTop: `1px solid ${C.border}` }}>Grisé = moins de {minN} trades, pas encore fiable</div>
    </div>
  );
}

function BigStat({ label, value, color, sub }) {
  return (
    <div style={{ padding: "12px 12px", borderRadius: 10, background: C.inputBg, border: `1px solid ${C.border}`, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 600 }}>{label}</div>
      <div className="tnum" style={{ fontSize: 18, fontWeight: 800, color: color || C.text, marginTop: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ---------- Mes erreurs ---------- */
function ErrorsTab({ trades }) {
  const closed = useMemo(() => closedOf(trades), [trades]);
  const d = useMemo(() => {
    const withErr = closed.filter((t) => mistakesOf(t).length > 0);
    const clean = closed.filter((t) => mistakesOf(t).length === 0);
    const byErr = groupAgg(closed, mistakesOf).sort((a, b) => a.sumR - b.sumR);
    const total = aggR(closed);
    const ruled = closed.filter((t) => Object.keys(t.rules || {}).length > 0);
    const allOk = ruled.filter((t) => Object.values(t.rules).every((v) => v === "ok"));
    const broken = ruled.filter((t) => Object.values(t.rules).some((v) => v === "no"));
    const byRuleBroken = groupAgg(broken, (t) => Object.entries(t.rules).filter(([, v]) => v === "no").map(([k]) => k)).sort((a, b) => b.n - a.n);
    // Évolution par mois (6 derniers)
    const months = {};
    closed.forEach((t) => { const dd = new Date(t.entryTime); const k = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`; (months[k] = months[k] || []).push(t); });
    const monthRows = Object.keys(months).sort().slice(-6).map((k) => {
      const arr = months[k]; const e = arr.filter((t) => mistakesOf(t).length > 0);
      return { k, n: arr.length, withErr: e.length, pct: arr.length ? (e.length / arr.length) * 100 : 0, errR: aggR(e).sumR };
    });
    return { withErr: aggR(withErr), clean: aggR(clean), total, byErr, ruled: ruled.length, allOk: aggR(allOk), broken: aggR(broken), byRuleBroken, monthRows, tagged: withErr.length };
  }, [closed]);

  if (!closed.length) return <EmptyState icon={AlertCircle} title="Pas encore de trades clôturés" text="Coche tes erreurs dans l'onglet Retour de chaque trade pour voir ce qu'elles te coûtent." />;

  return (
    <div>
      <ASection title="Ce que tes erreurs te coûtent" sub="Basé sur les erreurs cochées dans l'onglet Retour de chaque trade (et les tags d'erreur).">
        <div className="grid-kpi-4">
          <BigStat label="Ton total actuel" value={fmtRs(d.total.sumR)} color={rCol(d.total.sumR)} sub={`${d.total.n} trades`} />
          <BigStat label="Trades avec erreur" value={fmtRs(d.withErr.sumR)} color={rCol(d.withErr.sumR)} sub={`${d.withErr.n} trades · ${d.withErr.wr.toFixed(0)}% WR`} />
          <BigStat label="Trades propres" value={fmtRs(d.clean.sumR)} color={rCol(d.clean.sumR)} sub={`${d.clean.n} trades · ${d.clean.wr.toFixed(0)}% WR`} />
          <BigStat label="Moyenne par trade" value={`${fmtRs(d.clean.avgR)} / ${fmtRs(d.withErr.avgR)}`} sub="propre / avec erreur" />
        </div>
        {d.withErr.n > 0 && (
          <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, background: d.withErr.sumR < 0 ? C.redDim : C.inputBg, border: `1px solid ${d.withErr.sumR < 0 ? C.red + "40" : C.border}`, fontSize: 12.5, color: C.text, lineHeight: 1.55 }}>
            {d.withErr.sumR < 0
              ? <>Sans les trades où tu as fait une erreur, tu serais à <b style={{ color: rCol(d.clean.sumR) }}>{fmtRs(d.clean.sumR)}</b> au lieu de <b>{fmtRs(d.total.sumR)}</b>.</>
              : <>Tes trades avec erreur restent positifs ({fmtRs(d.withErr.sumR)}), mais rapportent {fmtRs(d.withErr.avgR)} par trade contre {fmtRs(d.clean.avgR)} pour les trades propres.</>}
          </div>
        )}
        {d.tagged === 0 && <div style={{ marginTop: 10, fontSize: 12, color: C.amber }}>Aucune erreur cochée pour l'instant. Ouvre un trade › Retour › « À améliorer ».</div>}
      </ASection>

      <ASection title="Tes règles ICT, vérifiées automatiquement" sub="Calculé à partir de la carte « Contexte ICT », de la checklist et de l'heure d'entrée. Rien à cocher en plus.">
        <IctRulesTable closed={closed} />
      </ASection>

      <ASection title="Erreur par erreur" sub="Triées de la plus coûteuse à la moins coûteuse.">
        <AggTable rows={d.byErr} labelHead="Erreur" empty="Aucune erreur cochée." minN={3} />
      </ASection>

      <ASection title="Règles respectées ou non" sub={`D'après l'onglet Retour › Règles respectées (${d.ruled} trades remplis).`}>
        <div className="grid-2" style={{ marginBottom: 12 }}>
          <BigStat label="Toutes les règles respectées" value={fmtRs(d.allOk.avgR) + " / trade"} color={rCol(d.allOk.avgR)} sub={`${d.allOk.n} trades · ${d.allOk.wr.toFixed(0)}% WR`} />
          <BigStat label="Au moins une règle cassée" value={fmtRs(d.broken.avgR) + " / trade"} color={rCol(d.broken.avgR)} sub={`${d.broken.n} trades · ${d.broken.wr.toFixed(0)}% WR`} />
        </div>
        <AggTable rows={d.byRuleBroken} labelHead="Règle cassée" empty="Aucune règle marquée « Non »." minN={3} />
      </ASection>

      <ASection title="Est-ce que tu progresses ?" sub="Part de tes trades avec au moins une erreur, mois par mois.">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {d.monthRows.map((m) => (
            <div key={m.k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 70, fontSize: 12, color: C.textSecondary, textTransform: "capitalize" }}>{new Date(m.k + "-15").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.border, overflow: "hidden" }}>
                <div style={{ width: `${m.pct}%`, height: "100%", background: m.pct > 40 ? C.red : m.pct > 20 ? C.amber : C.teal }} />
              </div>
              <span className="tnum" style={{ width: 92, textAlign: "right", fontSize: 11.5, color: C.textSecondary }}>{m.withErr}/{m.n} · {m.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </ASection>
    </div>
  );
}

/* ---------- Ce qui marche ---------- */
function EdgeTab({ trades }) {
  const closed = useMemo(() => closedOf(trades), [trades]);
  const d = useMemo(() => {
    const dxyLabel = (t) => { const a = dxyAligned(t); return a === true ? "DXY aligné" : a === false ? "DXY contre" : "DXY non noté"; };
    const htfLabel = (t) => { const a = htfAligned(t); return a === true ? "avec HTF" : a === false ? "contre HTF" : "HTF ?"; };
    const combos = groupAgg(closed, (t) => {
      const ss = setupsOf(t);
      const model = t.ictModel || (t.oteFib ? `OTE ${t.oteFib}` : "sans modèle");
      return (ss.length ? ss : ["Sans PD Array"]).map((s) => `${s} · ${kzOf(t)} · ${model} · ${htfLabel(t)}`);
    }).filter((g) => g.n >= 2);
    const best = [...combos].sort((a, b) => b.avgR - a.avgR || b.n - a.n).filter((g) => g.avgR > 0).slice(0, 8);
    const worst = [...combos].sort((a, b) => a.avgR - b.avgR).filter((g) => g.avgR < 0).slice(0, 5);
    const sortR = (arr) => arr.sort((a, b) => b.avgR - a.avgR);
    return {
      best, worst,
      setup: sortR(groupAgg(closed, (t) => setupsOf(t).length ? setupsOf(t) : ["Sans PD Array"])),
      session: sortR(groupAgg(closed, kzOf)),
      sb: sortR(groupAgg(closed, (t) => { const sb = silverBulletAt(t.entryTime); return sb ? sb.name : "Hors Silver Bullet"; })),
      model: sortR(groupAgg(closed, (t) => t.ictModel || "Modèle non noté")),
      htf: sortR(groupAgg(closed, (t) => { const a = htfAligned(t); return a === true ? "Avec le biais HTF" : a === false ? "Contre le biais HTF" : "Biais non noté"; })),
      pd: sortR(groupAgg(closed, (t) => { const a = pdAligned(t); return a === true ? "Bon côté" : a === false ? "Mauvais côté" : t.pdZone === "Equilibrium" ? "Équilibre" : "Zone non notée"; })),
      swept: sortR(groupAgg(closed, (t) => t.sweptLiquidity || "Non noté")),
      dol: sortR(groupAgg(closed, (t) => t.drawOnLiquidity || "Non noté")),
      disp: sortR([{ label: "Avec displacement", ...aggR(closed.filter((t) => t.displacement)) }, { label: "Sans displacement", ...aggR(closed.filter((t) => !t.displacement)) }].filter((x) => x.n)),
      ote: sortR(groupAgg(closed, (t) => t.oteFib ? `OTE ${t.oteFib}` : "Sans OTE")),
      dxy: sortR(groupAgg(closed, dxyLabel)),
      tf: sortR(groupAgg(closed, (t) => (t.tags || []).find((g) => TF_TAGS.includes(g)) || "TF non noté")),
      dir: sortR(groupAgg(closed, (t) => t.direction === "long" ? "Long" : "Short")),
      pair: sortR(groupAgg(closed, (t) => t.pair)),
      check: sortR([
        { label: "Sweep + MSS", ...aggR(closed.filter((t) => t.liquiditySweep && t.mssConfirmed)) },
        { label: "Sweep seul", ...aggR(closed.filter((t) => t.liquiditySweep && !t.mssConfirmed)) },
        { label: "MSS seul", ...aggR(closed.filter((t) => !t.liquiditySweep && t.mssConfirmed)) },
        { label: "Ni sweep ni MSS", ...aggR(closed.filter((t) => !t.liquiditySweep && !t.mssConfirmed)) },
      ].filter((r) => r.n > 0)),
      pos: sortR(groupAgg(closed, (t) => t.positives || [])),
    };
  }, [closed]);

  if (!closed.length) return <EmptyState icon={Trophy} title="Pas encore de trades clôturés" text="Ton edge apparaîtra ici dès tes premiers trades clôturés." />;

  return (
    <div>
      <ASection title="Tes meilleures combinaisons" sub="PD Array × killzone × modèle ICT × biais HTF, au moins 2 trades. C'est là que se trouve ton vrai edge.">
        <AggTable rows={d.best} labelHead="Combinaison" empty="Pas encore de combinaison positive avec 2 trades ou plus." />
      </ASection>
      {d.worst.length > 0 && (
        <ASection title="Combinaisons à éviter" sub="Les mêmes critères, mais qui te font perdre.">
          <AggTable rows={d.worst} labelHead="Combinaison" />
        </ASection>
      )}
      <div className="grid-2">
        <ASection title="Modèle ICT"><AggTable rows={d.model} labelHead="Modèle" /></ASection>
        <ASection title="Par PD Array"><AggTable rows={d.setup} labelHead="PD Array" /></ASection>
        <ASection title="Killzone" sub="Calculée depuis l'heure d'entrée, en heure de New York."><AggTable rows={d.session} labelHead="Killzone" /></ASection>
        <ASection title="Silver Bullet" sub="03-04h, 10-11h et 14-15h heure de New York."><AggTable rows={d.sb} labelHead="Fenêtre" /></ASection>
        <ASection title="Biais HTF"><AggTable rows={d.htf} labelHead="Biais" /></ASection>
        <ASection title="Premium / Discount" sub="Bon côté = long en discount, short en premium."><AggTable rows={d.pd} labelHead="Zone" /></ASection>
        <ASection title="Liquidité prise"><AggTable rows={d.swept} labelHead="Liquidité" /></ASection>
        <ASection title="Draw on liquidity"><AggTable rows={d.dol} labelHead="Cible" /></ASection>
        <ASection title="Displacement"><AggTable rows={d.disp} labelHead="Displacement" /></ASection>
        <ASection title="Zone OTE"><AggTable rows={d.ote} labelHead="OTE" /></ASection>
        <ASection title="Biais DXY" sub="Aligné = le DXY va dans le sens qui confirme ton trade."><AggTable rows={d.dxy} labelHead="DXY" /></ASection>
        <ASection title="Checklist sweep / MSS"><AggTable rows={d.check} labelHead="Checklist" /></ASection>
        <ASection title="Timeframe"><AggTable rows={d.tf} labelHead="TF" /></ASection>
        <ASection title="Sens"><AggTable rows={d.dir} labelHead="Sens" /></ASection>
        <ASection title="Paire"><AggTable rows={d.pair} labelHead="Paire" /></ASection>
      </div>
      <ASection title="Tes points positifs" sub="Quand tu coches ce point positif, combien ça rapporte.">
        <AggTable rows={d.pos} labelHead="Point positif" empty="Coche tes points positifs dans l'onglet Retour de chaque trade." minN={3} />
      </ASection>
    </div>
  );
}

/* ---------- Psychologie ---------- */
function PsychoTab({ trades }) {
  const closed = useMemo(() => closedOf(trades), [trades]);
  const d = useMemo(() => {
    const both = closed.filter((t) => t.confidenceLevel > 0 && t.retroRating > 0);
    const gap = both.length ? both.reduce((s, t) => s + (t.retroRating - t.confidenceLevel), 0) / both.length : null;
    const overconf = closed.filter((t) => t.confidenceLevel >= 8);
    const chron = [...closed].sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime));
    const afterLoss = [], afterWin = [];
    for (let i = 1; i < chron.length; i++) { const prev = rOf(chron[i - 1]); if (prev < 0) afterLoss.push(chron[i]); else if (prev > 0) afterWin.push(chron[i]); }
    const dayIdx = {}; const byNum = { "1er trade du jour": [], "2e trade du jour": [], "3e trade et +": [] };
    chron.forEach((t) => { const k = new Date(t.entryTime).toDateString(); dayIdx[k] = (dayIdx[k] || 0) + 1; const n = dayIdx[k]; byNum[n === 1 ? "1er trade du jour" : n === 2 ? "2e trade du jour" : "3e trade et +"].push(t); });
    const sameDayAfterLoss = [];
    for (let i = 1; i < chron.length; i++) if (rOf(chron[i - 1]) < 0 && new Date(chron[i - 1].entryTime).toDateString() === new Date(chron[i].entryTime).toDateString()) sameDayAfterLoss.push(chron[i]);
    return { gap, nBoth: both.length, overconf: aggR(overconf),
      seq: [{ label: "Après une perte", ...aggR(afterLoss) }, { label: "Après une perte, le même jour", ...aggR(sameDayAfterLoss) }, { label: "Après un gain", ...aggR(afterWin) }],
      num: Object.entries(byNum).map(([label, arr]) => ({ label, ...aggR(arr) })).filter((r) => r.n) };
  }, [closed]);

  return (
    <div>
      <ASection title="Ta confiance est-elle fiable ?" sub="Confiance notée avant le trade comparée à la qualité notée après.">
        <div className="grid-kpi-4">
          <BigStat label="Écart moyen après − avant" value={d.gap == null ? "—" : `${d.gap > 0 ? "+" : ""}${d.gap.toFixed(1)}`} color={d.gap == null ? C.text : Math.abs(d.gap) <= 1 ? C.teal : C.amber} sub={d.gap == null ? "note les deux sur tes trades" : d.gap < -1 ? "tu te sur-estimes" : d.gap > 1 ? "tu te sous-estimes" : "bien calibré"} />
          <BigStat label="Trades à confiance 8+" value={fmtRs(d.overconf.avgR) + " / trade"} color={rCol(d.overconf.avgR)} sub={`${d.overconf.n} trades · ${d.overconf.wr.toFixed(0)}% WR`} />
          <BigStat label="Trades notés avant + après" value={d.nBoth} />
        </div>
      </ASection>
      <ASection title="Le trade d'après" sub="Ce que tu fais juste après une perte. C'est là que se voit le revenge trading.">
        <AggTable rows={d.seq} labelHead="Situation" minN={3} />
      </ASection>
      <ASection title="Combien de trades par jour ?" sub="Si ton 3e trade perd en moyenne, une règle « max 2 trades par jour » te ferait gagner de l'argent.">
        <AggTable rows={d.num} labelHead="Numéro du trade" minN={3} />
      </ASection>
      <PerformanceReview trades={trades} />
    </div>
  );
}

/* ---------- Exécution ---------- */
function ExecTab({ trades }) {
  const closed = useMemo(() => closedOf(trades), [trades]);
  const d = useMemo(() => {
    const withMax = closed.filter((t) => t.maxR != null && !Number.isNaN(Number(t.maxR)));
    const real = withMax.reduce((s, t) => s + rOf(t), 0);
    const sims = [1, 1.5, 2, 2.5, 3, 4].map((X) => {
      const hit = withMax.filter((t) => Number(t.maxR) >= X).length;
      const total = withMax.reduce((s, t) => s + (Number(t.maxR) >= X ? X : (rOf(t) < 0 ? rOf(t) : -1)), 0);
      return { X, hit, total, wr: withMax.length ? (hit / withMax.length) * 100 : 0 };
    });
    const bestSim = sims.reduce((a, b) => (b.total > a.total ? b : a), sims[0]);
    const early = withMax.filter((t) => rOf(t) > 0 && Number(t.maxR) - rOf(t) >= 1);
    const leftR = early.reduce((s, t) => s + (Number(t.maxR) - rOf(t)), 0);
    const slBucket = (t) => {
      if (t.entryPrice == null || t.stopLoss == null) return null;
      const p = Math.abs(t.entryPrice - t.stopLoss) / pipSize(t.pair);
      return p < 10 ? "SL < 10 pips" : p < 20 ? "SL 10-20 pips" : p < 35 ? "SL 20-35 pips" : "SL 35+ pips";
    };
    const order = ["SL < 10 pips", "SL 10-20 pips", "SL 20-35 pips", "SL 35+ pips"];
    const sl = groupAgg(closed, slBucket).sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
    const planned = closed.filter((t) => t.entryPrice != null && t.stopLoss != null && t.takeProfit != null && t.entryPrice !== t.stopLoss)
      .map((t) => ({ t, rr: Math.abs(t.takeProfit - t.entryPrice) / Math.abs(t.entryPrice - t.stopLoss) }));
    const wins = planned.filter((x) => rOf(x.t) > 0);
    return { n: withMax.length, real, sims, bestSim, early: early.length, leftR, sl,
      plannedRR: planned.length ? planned.reduce((s, x) => s + x.rr, 0) / planned.length : null,
      winR: wins.length ? wins.reduce((s, x) => s + rOf(x.t), 0) / wins.length : null,
      winPlanned: wins.length ? wins.reduce((s, x) => s + x.rr, 0) / wins.length : null };
  }, [closed]);

  return (
    <div>
      <ASection title="R visé ou R obtenu" sub="Est-ce que tu laisses courir tes gains jusqu'à ton TP ?">
        <div className="grid-kpi-4">
          <BigStat label="R:R prévu (moyen)" value={d.plannedRR == null ? "—" : `1:${d.plannedRR.toFixed(2)}`} />
          <BigStat label="Gains : R prévu" value={d.winPlanned == null ? "—" : fmtRs(d.winPlanned)} />
          <BigStat label="Gains : R obtenu" value={d.winR == null ? "—" : fmtRs(d.winR)} color={d.winR != null && d.winPlanned != null && d.winR < d.winPlanned - 0.3 ? C.amber : C.teal} sub={d.winR != null && d.winPlanned != null && d.winR < d.winPlanned - 0.3 ? "tu sors avant ton TP" : ""} />
        </div>
      </ASection>

      <ASection title="Simulateur de TP sur tous tes trades" sub={`Utilise le « R max atteint » noté dans le trade (${d.n} trades). Hypothèse prudente : si la cible n'est pas atteinte, le trade finit au stop (−1R).`}>
        {d.n === 0 ? (
          <div style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.6 }}>Renseigne « R max atteint » quand tu enregistres ou modifies un trade (carte Résultat). Après une dizaine de trades, tu sauras quel TP fixe te rapporte le plus.</div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {d.sims.map((x) => (
                <div key={x.X} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: `1px solid ${x === d.bestSim ? C.teal : C.border}`, background: x === d.bestSim ? C.tealDim : C.inputBg }}>
                  <span style={{ width: 70, fontSize: 13, fontWeight: 700 }}>TP {x.X}R</span>
                  <span className="tnum" style={{ flex: 1, fontSize: 11.5, color: C.textMuted }}>atteint {x.hit}/{d.n} ({x.wr.toFixed(0)}%)</span>
                  <span className="tnum" style={{ fontSize: 13.5, fontWeight: 800, color: rCol(x.total) }}>{fmtRs(x.total)}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 12.5, color: C.text }}>
              Ton résultat réel sur ces trades : <b style={{ color: rCol(d.real) }}>{fmtRs(d.real)}</b>. Meilleur TP fixe : <b style={{ color: C.teal }}>{d.bestSim.X}R ({fmtRs(d.bestSim.total)})</b>.
            </div>
            {d.early > 0 && <div style={{ marginTop: 6, fontSize: 12, color: C.amber }}>{d.early} trade(s) gagnant(s) clôturé(s) au moins 1R avant le plus haut : {fmtRs(d.leftR)} laissés sur la table.</div>}
          </>
        )}
      </ASection>

      <ASection title="Taille du stop" sub="Est-ce qu'un SL trop serré te fait sortir pour rien ?">
        <AggTable rows={d.sl} labelHead="Distance du SL" empty="Renseigne entrée et SL pour voir cette analyse." />
      </ASection>
    </div>
  );
}

/* ---------- Revue de la semaine ---------- */
function weekStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function weekKeyOf(d) { const s = weekStart(d); return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`; }

function WeekTab({ trades, onOpenTrade, onVerdict }) {
  const [offset, setOffset] = useState(0);
  const start = useMemo(() => { const s = weekStart(new Date()); s.setDate(s.getDate() - 7 * offset); return s; }, [offset]);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const key = weekKeyOf(start);
  const [goals, setGoals] = useState(() => { try { return JSON.parse(localStorage.getItem("weekly_goals") || "{}"); } catch { return {}; } });
  const goalTimer = useRef(null);
  const setGoal = (txt) => {
    const next = { ...goals, [key]: txt };
    setGoals(next);
    try { localStorage.setItem("weekly_goals", JSON.stringify(next)); } catch {}
    clearTimeout(goalTimer.current);
    goalTimer.current = setTimeout(() => saveSettingsPatch({ weekly_goals: next }), 800);
  };
  const wk = useMemo(() => trades.filter((t) => { const d = new Date(t.entryTime); return d >= start && d < end; }), [trades, start]);
  const closed = closedOf(wk);
  const a = aggR(closed);
  const sorted = [...closed].sort((x, y) => rOf(y) - rOf(x));
  const best = sorted.filter((t) => rOf(t) > 0).slice(0, 3);
  const worst = [...sorted].reverse().filter((t) => rOf(t) < 0).slice(0, 3);
  const topErr = groupAgg(closed, mistakesOf).sort((x, y) => y.n - x.n)[0];
  const bestSetup = groupAgg(closed, (t) => setupsOf(t)).filter((g) => g.sumR > 0).sort((x, y) => y.sumR - x.sumR)[0];
  const unjudged = closed.filter((t) => !t.verdict);
  const label = `${start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} – ${new Date(end - 864e5).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;

  const Mini = ({ t }) => (
    <button onClick={() => onOpenTrade(t.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: 8, borderRadius: 9, border: `1px solid ${C.border}`, background: C.inputBg, cursor: "pointer", textAlign: "left" }}>
      {t.screenshotBefore ? <img src={t.screenshotBefore} alt="" style={{ width: 56, height: 38, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} /> : <div style={{ width: 56, height: 38, borderRadius: 5, background: C.border, flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text }}>{t.pair} <span style={{ fontWeight: 500, color: C.textMuted }}>{t.direction === "long" ? "Long" : "Short"} · {fmtDate(t.entryTime)}</span></div>
        <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{setupsOf(t).join(" · ") || "—"}</div>
      </div>
      <span className="tnum" style={{ fontSize: 13, fontWeight: 800, color: rCol(rOf(t)) }}>{fmtRs(rOf(t))}</span>
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={() => setOffset((o) => o + 1)} style={btn.icon} aria-label="Semaine précédente"><ChevronLeft size={16} /></button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{offset === 0 ? "Cette semaine" : offset === 1 ? "Semaine dernière" : "Semaine"}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>{label}</div>
        </div>
        <button onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0} style={{ ...btn.icon, opacity: offset === 0 ? 0.4 : 1 }} aria-label="Semaine suivante"><ChevronRight size={16} /></button>
      </div>

      <div className="grid-kpi-4" style={{ marginBottom: 14 }}>
        <BigStat label="Résultat" value={fmtUsdSigned(a.pnl)} color={rCol(a.pnl)} sub={fmtRs(a.sumR)} />
        <BigStat label="Trades" value={a.n} sub={`${wk.length - closed.length} encore ouvert(s)`} />
        <BigStat label="Winrate" value={`${a.wr.toFixed(0)}%`} />
        <BigStat label="Moyenne" value={fmtRs(a.avgR)} color={rCol(a.avgR)} />
      </div>

      <div className="grid-2">
        <ASection title="Meilleurs trades">{best.length ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{best.map((t) => <Mini key={t.id} t={t} />)}</div> : <div style={{ fontSize: 12, color: C.textMuted }}>Aucun trade gagnant.</div>}</ASection>
        <ASection title="Pires trades">{worst.length ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{worst.map((t) => <Mini key={t.id} t={t} />)}</div> : <div style={{ fontSize: 12, color: C.textMuted }}>Aucun trade perdant.</div>}</ASection>
      </div>

      <div className="grid-2">
        <BigStat label="Erreur la plus fréquente" value={topErr ? topErr.label : "Aucune cochée"} color={topErr ? C.red : C.teal} sub={topErr ? `${topErr.n} fois · ${fmtRs(topErr.sumR)}` : ""} />
        <BigStat label="Meilleur setup" value={bestSetup ? bestSetup.label : "—"} color={C.teal} sub={bestSetup ? `${bestSetup.n} trades · ${fmtRs(bestSetup.sumR)}` : ""} />
      </div>

      {unjudged.length > 0 && (
        <ASection title={`À juger (${unjudged.length})`} sub="Bon trade ou mauvais trade, peu importe le résultat. Ça garde tes stats complètes.">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {unjudged.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}><Mini t={t} /></div>
                <button onClick={() => onVerdict(t.id, "good")} style={{ ...btn.icon, fontSize: 18, padding: "6px 9px" }} aria-label="Bon trade"><ThumbsUp size={16} /></button>
                <button onClick={() => onVerdict(t.id, "bad")} style={{ ...btn.icon, fontSize: 18, padding: "6px 9px" }} aria-label="Mauvais trade"><ThumbsDown size={16} /></button>
              </div>
            ))}
          </div>
        </ASection>
      )}

      <ASection title="Objectif de la semaine" sub="Une seule chose à corriger ou à répéter. Enregistré dans Supabase.">
        <textarea id={"goal-" + key} rows={3} value={goals[key] || ""} onChange={(e) => setGoal(e.target.value)} placeholder={topErr ? `Ex : zéro « ${topErr.label} » cette semaine` : "Ex : max 2 trades par jour, uniquement en London"} style={{ ...inputStyle, resize: "vertical" }} />
      </ASection>
    </div>
  );
}

/* ---------- Avant d'entrer : ton historique sur le même contexte ---------- */
function PreTradeContext({ trades, pair, direction, tags, ictModel, entryTime }) {
  const closed = useMemo(() => closedOf(trades || []), [trades]);
  const sess = (tags || []).find((g) => SESSION_TAGS.includes(g));
  const setups = (tags || []).filter(isSetupTag);
  const base = closed.filter((t) => t.pair === pair && t.direction === direction);
  const rows = [{ label: `${pair} ${direction === "long" ? "Long" : "Short"}`, ...aggR(base) }];
  if (sess) rows.push({ label: `+ ${sess.replace(" Session", "")}`, ...aggR(base.filter((t) => sessionOf(t) === sess)) });
  if (setups.length) rows.push({ label: `+ ${setups.join(" / ")}`, ...aggR(base.filter((t) => (!sess || sessionOf(t) === sess) && setupsOf(t).some((s) => setups.includes(s)))) });
  if (ictModel) rows.push({ label: `Modèle ${ictModel} (toutes paires)`, ...aggR(closed.filter((t) => t.ictModel === ictModel)) });
  if (entryTime) { const kz = killzoneLabel(entryTime); rows.push({ label: `${kz} (toutes paires)`, ...aggR(closed.filter((t) => kzOf(t) === kz)) }); }
  const last = rows[Math.min(rows.length - 1, setups.length ? (sess ? 2 : 1) : (sess ? 1 : 0))];
  const warn = last.n >= 3 && last.avgR < 0;
  const good = last.n >= 3 && last.avgR > 0.3;
  if (!base.length) return null;
  return (
    <Card style={{ padding: 16, marginBottom: 14, border: `1px solid ${warn ? C.red + "60" : good ? C.teal + "60" : C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <BarChart3 size={14} color={warn ? C.red : good ? C.teal : C.purpleBright} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>Ton historique sur ce contexte</span>
      </div>
      <AggTable rows={rows} labelHead="Contexte" minN={3} />
      {warn && <div style={{ marginTop: 8, fontSize: 12.5, color: C.red, fontWeight: 600 }}>Attention : ce contexte te fait perdre en moyenne ({fmtRs(last.avgR)} sur {last.n} trades).</div>}
      {good && <div style={{ marginTop: 8, fontSize: 12.5, color: C.teal, fontWeight: 600 }}>Bon contexte pour toi : {fmtRs(last.avgR)} en moyenne sur {last.n} trades.</div>}
    </Card>
  );
}

const STATS_TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "errors", label: "Mes erreurs" },
  { id: "edge", label: "Ce qui marche" },
  { id: "psycho", label: "Psychologie" },
  { id: "exec", label: "Exécution" },
  { id: "week", label: "Semaine" },
];

// ── Statistiques (version simple) ──
function SimpleStats({ trades }) {
  const [period, setPeriod] = useState("tout");
  const [cat, setCat] = useState("Forex");
  const closed = useMemo(() => {
    const days = period === "7j" ? 7 : period === "30j" ? 30 : period === "90j" ? 90 : null;
    const cut = days ? Date.now() - days * 864e5 : 0;
    return trades.filter((t) => t.status !== "open" && t.resultR != null && (!days || new Date(t.entryTime).getTime() >= cut));
  }, [trades, period]);
  const agg = (l) => { const n = l.length, w = l.filter((t) => t.resultR > 0).length, r = l.reduce((a, t) => a + (Number(t.resultR) || 0), 0), usd = l.reduce((a, t) => a + (Number(t.resultUsd) || 0), 0);
    const gw = l.filter((t) => t.resultR > 0).reduce((a, t) => a + t.resultR, 0), gl = -l.filter((t) => t.resultR < 0).reduce((a, t) => a + t.resultR, 0);
    return { n, w, l: l.filter((t) => t.resultR < 0).length, wr: n ? w / n * 100 : 0, r, usd, avg: n ? r / n : 0, pf: gl ? gw / gl : null }; };
  const group = (fn) => { const m = {}; closed.forEach((t) => { (fn(t) || []).forEach((k) => { if (k) (m[k] = m[k] || []).push(t); }); }); return Object.entries(m).map(([k, l]) => ({ k, ...agg(l) })).sort((a, b) => b.r - a.r); };
  const T = agg(closed);
  const setupsOfT = (t) => { const ts = t.rules?.tfSetups; if (Array.isArray(ts) && ts.length) return ts.flatMap((r) => (r.setups || []).map((x) => x + (r.tf ? " " + r.tf : ""))); return (t.tags || []).filter((g) => TAG_CATALOG.find((c) => c.name === g && c.category === "setup")); };
  const pairs = group((t) => [t.pair]);
  const setups = group(setupsOfT);
  const sessions = group((t) => [getSession(t.entryTime)]);
  const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const days = group((t) => [DAYS[new Date(t.entryTime).getDay()]]).sort((a, b) => ((DAYS.indexOf(a.k) + 6) % 7) - ((DAYS.indexOf(b.k) + 6) % 7));
  const mistakes = group((t) => t.mistakes || []).sort((a, b) => a.r - b.r);
  const cats = ASSET_CATS.map(([c]) => c).filter((c) => pairs.some((p) => assetCat(p.k) === c));
  const curCat = cats.includes(cat) ? cat : cats[0];
  const best = (a) => a.filter((x) => x.n >= 2 && x.r > 0)[0], worst = (a) => [...a].filter((x) => x.n >= 2 && x.r < 0).sort((p, q) => p.r - q.r)[0];
  const retenir = [["Meilleure paire", best(pairs)], ["Meilleur setup", best(setups)], ["Meilleure session", best(sessions)], ["Pire paire", worst(pairs)], ["Pire setup", worst(setups)]].filter((x) => x[1]);
  const col = (v) => v > 0 ? C.teal : v < 0 ? C.red : C.textSecondary;
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 14, overflow: "hidden" };
  const H = ({ children, right }) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 10px" }}><span style={{ fontSize: 14, fontWeight: 800 }}>{children}</span>{right}</div>;
  const Table = ({ rows, logo, empty }) => rows.length === 0 ? <div style={{ padding: "6px 16px 16px", fontSize: 12.5, color: C.textMuted }}>{empty || "Pas encore de trades."}</div> : (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 46px 56px 70px", gap: 8, padding: "6px 16px", fontSize: 10.5, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, borderTop: `1px solid ${C.border}` }}><span /><span style={{ textAlign: "right" }}>Trades</span><span style={{ textAlign: "right" }}>Win</span><span style={{ textAlign: "right" }}>Total</span></div>
      {rows.map((r) => (
        <div key={r.k} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 46px 56px 70px", gap: 8, alignItems: "center", padding: "10px 16px", borderTop: `1px solid ${C.border}` }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}><span style={{ width: 3, height: 22, borderRadius: 2, background: col(r.r), flexShrink: 0 }} />{logo && <PairLogo pair={r.k} size={20} />}<span style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.k}</span></span>
          <span className="tnum" style={{ textAlign: "right", fontSize: 13, color: C.textSecondary }}>{r.n}</span>
          <span className="tnum" style={{ textAlign: "right", fontSize: 13, color: C.textSecondary }}>{r.wr.toFixed(0)}%</span>
          <span className="tnum" style={{ textAlign: "right", fontSize: 14, fontWeight: 800, color: col(r.r) }}>{fmtR(r.r)}</span>
        </div>))}
    </div>);
  const Bars = ({ rows }) => { const mx = Math.max(0.01, ...rows.map((r) => Math.abs(r.r))); return (
    <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => <div key={r.k}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}><span style={{ fontWeight: 700 }}>{r.k} <span style={{ color: C.textMuted, fontWeight: 500 }}>· {r.n} trades · {r.wr.toFixed(0)}%</span></span><span className="tnum" style={{ fontWeight: 800, color: col(r.r) }}>{fmtR(r.r)}</span></div>
        <div style={{ height: 6, borderRadius: 3, background: C.inputBg || C.bg, overflow: "hidden" }}><div style={{ width: Math.abs(r.r) / mx * 100 + "%", height: "100%", background: col(r.r), borderRadius: 3 }} /></div>
      </div>)}
      {rows.length === 0 && <div style={{ fontSize: 12.5, color: C.textMuted }}>Pas encore de trades.</div>}
    </div>); };
  return (
    <div className="fade-in" style={{ maxWidth: 820, margin: "0 auto" }}>
      <PageHeader title="Statistiques" />
      <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, marginBottom: 14 }}>
        {["7j", "30j", "90j", "tout"].map((p) => <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, height: 34, borderRadius: 9, border: "none", background: period === p ? C.purpleDim : "transparent", color: period === p ? C.purpleBright : C.textSecondary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{p === "tout" ? "Tout" : p}</button>)}
      </div>

      <div style={{ ...card, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.textMuted }}>Résultat</div>
        <div className="tnum" style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1.4, color: col(T.r), lineHeight: 1.05, marginTop: 4 }}>{fmtR(T.r)}</div>
        <div className="tnum" style={{ fontSize: 14, color: col(T.usd), fontWeight: 700 }}>{fmtUsdSigned(T.usd)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8, marginTop: 14 }}>
          {[["Trades", String(T.n), `${T.w}W · ${T.l}L`], ["Winrate", T.n ? T.wr.toFixed(0) + "%" : "—", ""], ["R moyen", T.n ? fmtR(T.avg) : "—", "par trade"], ["Profit factor", T.pf != null ? T.pf.toFixed(2) : "—", "gains ÷ pertes"]].map(([l, v, sub]) => (
            <div key={l} style={{ padding: "10px", borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 600 }}>{l}</div>
              <div className="tnum" style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>{v}</div>
              {sub && <div style={{ fontSize: 10.5, color: C.textMuted }}>{sub}</div>}
            </div>))}
        </div>
      </div>

      {retenir.length > 0 && <div style={card}>
        <H>À retenir</H>
        {retenir.map(([l, x]) => <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: `1px solid ${C.border}` }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: col(x.r), flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: C.textMuted, width: 130, flexShrink: 0 }}>{l}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.k}</span>
          <span className="tnum" style={{ fontSize: 14, fontWeight: 800, color: col(x.r) }}>{fmtR(x.r)}</span>
        </div>)}
      </div>}

      <div style={card}>
        <H>Par actif</H>
        {cats.length > 1 && <div style={{ display: "flex", gap: 6, padding: "0 16px 10px", flexWrap: "wrap" }}>
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${curCat === c ? C.purple : C.border}`, background: curCat === c ? C.purpleDim : "transparent", color: curCat === c ? C.purpleBright : C.textSecondary }}>{c}</button>)}
        </div>}
        <Table rows={pairs.filter((p) => assetCat(p.k) === curCat)} logo />
      </div>

      <div style={card}><H>Par setup</H><Table rows={setups} empty="Ajoute tes setups dans le formulaire pour les voir ici." /></div>
      <div style={card}><H>Par session</H><Bars rows={sessions} /></div>
      <div style={card}><H>Par jour</H><Bars rows={days} /></div>
      {mistakes.length > 0 && <div style={card}><H>Erreurs fréquentes</H><Table rows={mistakes} /></div>}
    </div>
  );
}

function AdvancedStats({ trades, onOpenTrade, onVerdict }) {
  const [tab, setTab] = useState(() => { try { return localStorage.getItem("stats_tab") || "overview"; } catch { return "overview"; } });
  const pick = (id) => { setTab(id); try { localStorage.setItem("stats_tab", id); } catch {} };
  return (
    <div className="fade-in">
      <PageHeader title="Statistiques" />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
        {STATS_TABS.map((t) => (
          <button key={t.id} onClick={() => pick(t.id)} style={{ flexShrink: 0, padding: "8px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", border: `1px solid ${tab === t.id ? C.purple : C.border}`, background: tab === t.id ? C.purpleDim : "transparent", color: tab === t.id ? C.purpleBright : C.textSecondary }}>{t.label}</button>
        ))}
      </div>
      {tab === "overview" && <OverviewStats trades={trades} />}
      {tab === "errors" && <ErrorsTab trades={trades} />}
      {tab === "edge" && <EdgeTab trades={trades} />}
      {tab === "psycho" && <PsychoTab trades={trades} />}
      {tab === "exec" && <ExecTab trades={trades} />}
      {tab === "week" && <WeekTab trades={trades} onOpenTrade={onOpenTrade} onVerdict={onVerdict} />}
    </div>
  );
}

/* ============================================================================
   CALENDAR
   ============================================================================ */

function TradingCalendar({ trades, onSelectDay }) {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showR, setShowR] = useState(false);

  const byDay = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      const d = new Date(t.entryTime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = { pnl: 0, r: 0, count: 0, trades: [] };
      map[key].pnl += t.resultUsd || 0;
      map[key].r += t.resultR || 0;
      map[key].count += 1;
      map[key].trades.push(t);
    });
    return map;
  }, [trades]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthPnl = useMemo(() => {
    let sum = 0; let sumR = 0;
    Object.entries(byDay).forEach(([key, v]) => {
      const [y, m] = key.split("-").map(Number);
      if (y === year && m === month) { sum += v.pnl; sumR += v.r; }
    });
    return { pnl: sum, r: sumR };
  }, [byDay, year, month]);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedKey = selectedDay ? `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}` : null;
  const selectedData = selectedKey ? byDay[selectedKey] : null;

  return (
    <div className="fade-in">
      <PageHeader title="Calendrier de trading" />

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Card style={{ padding: 18, flex: "1 1 300px", minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelectedDay(null); }} style={btn.icon}><ChevronLeft size={16} /></button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15, textTransform: "capitalize" }}>{cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</div>
              <div className="tnum" style={{ fontSize: 12, fontWeight: 700, color: (showR ? monthPnl.r : monthPnl.pnl) >= 0 ? C.teal : C.red }}>
                {showR ? `${monthPnl.r >= 0 ? "+" : ""}${monthPnl.r.toFixed(1)}R` : fmtUsdSigned(monthPnl.pnl)}
              </div>
            </div>
            <button onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDay(null); }} style={btn.icon}><ChevronRight size={16} /></button>
          </div>

          {/* Toggle $ / R */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, justifyContent: "center" }}>
            {[{ v: false, l: "$ P&L" }, { v: true, l: "R:R" }].map(opt => (
              <button key={String(opt.v)} onClick={() => setShowR(opt.v)} style={{ padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${showR === opt.v ? C.purple : C.border}`, background: showR === opt.v ? C.purpleDim : "transparent", color: showR === opt.v ? C.purpleBright : C.textSecondary, cursor: "pointer" }}>{opt.l}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, color: C.textMuted, fontWeight: 700, padding: "2px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const key = `${year}-${month}-${d}`;
              const data = byDay[key];
              const val = data ? (showR ? data.r : data.pnl) : null;
              const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
              const isSelected = selectedDay && selectedDay.getDate() === d && selectedDay.getMonth() === month && selectedDay.getFullYear() === year;
              return (
                <button key={i} onClick={() => setSelectedDay(data ? new Date(year, month, d) : null)} style={{
                  aspectRatio: "1", borderRadius: 7,
                  border: `1.5px solid ${isSelected ? C.purple : isToday ? C.purple : C.border}`,
                  background: isSelected ? C.purpleDim : data ? (val >= 0 ? C.tealDim : C.redDim) : C.bg,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: data ? "pointer" : "default", padding: 2, gap: 1,
                }}>
                  <span style={{ fontSize: 10.5, color: data ? C.text : C.textMuted, fontWeight: isToday ? 700 : 500 }}>{d}</span>
                  {data && <span className="tnum" style={{ fontSize: 8, fontWeight: 700, color: val >= 0 ? C.teal : C.red }}>
                    {showR ? `${val >= 0 ? "+" : ""}${val.toFixed(1)}R` : `${val >= 0 ? "+" : ""}${Math.round(val)}`}
                  </span>}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11, color: C.textSecondary, alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: C.tealDim, border: `1px solid ${C.teal}` }} /> Gagnant</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: C.redDim, border: `1px solid ${C.red}` }} /> Perdant</span>
          </div>
        </Card>

        {/* Panneau détail du jour sélectionné */}
        {selectedDay && selectedData ? (
          <Card style={{ padding: 18, flex: "1 1 260px", minWidth: 240 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, textTransform: "capitalize" }}>
              {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted }}>P&L</div>
                <div className="tnum" style={{ fontSize: 17, fontWeight: 800, color: selectedData.pnl >= 0 ? C.teal : C.red }}>{fmtUsdSigned(selectedData.pnl)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted }}>Trades</div>
                <div className="tnum" style={{ fontSize: 17, fontWeight: 800 }}>{selectedData.count}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedData.trades.map((t) => (
                <div key={t.id} style={{ padding: "9px 12px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{t.pair}</span>
                      <DirBadge direction={t.direction} />
                    </div>
                    <span className="tnum" style={{ fontWeight: 700, fontSize: 12.5, color: (t.resultUsd || 0) >= 0 ? C.teal : C.red }}>{fmtUsdSigned(t.resultUsd)}</span>
                  </div>
                  {t.tags?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                      {t.tags.slice(0, 3).map((tag) => <TagBadge key={tag} name={tag} size="sm" />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div style={{ flex: "1 1 260px", minWidth: 240, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 12 }}>
            Clique sur un jour pour voir le détail
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   DAILY JOURNAL
   ============================================================================ */




/* ============================================================================
   PERFORMANCE REVIEW — moyennes des notes, meilleurs/pires setups
   ============================================================================ */

function avg(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null; }

function PerformanceReview({ trades }) {
  const closed = useMemo(() => trades.filter((t) => t.status !== "open"), [trades]);

  const pdArrayStats = useMemo(() => {
    const setupTagNames = TAG_CATALOG.filter(t => t.category === "setup").map(t => t.name);
    const map = {};
    closed.forEach(t => {
      (t.tags || []).filter(tag => setupTagNames.includes(tag)).forEach(tag => {
        if (!map[tag]) map[tag] = { n: 0, wins: 0, totalR: 0, totalConf: 0, confCount: 0 };
        const m = map[tag]; m.n++; if (t.resultR > 0) m.wins++; m.totalR += t.resultR || 0;
        if (t.confidenceLevel) { m.totalConf += t.confidenceLevel; m.confCount++; }
      });
    });
    return Object.entries(map).map(([name, v]) => ({ name, count: v.n, winRate: v.wins / v.n * 100, avgR: v.totalR / v.n, avgConf: v.confCount ? v.totalConf / v.confCount : null }))
      .sort((a, b) => b.avgR - a.avgR);
  }, [closed]);

  const oteImpact = useMemo(() => {
    const g = (arr) => ({ count: arr.length, winRate: arr.length ? arr.filter(t => t.resultR > 0).length / arr.length * 100 : 0, avgR: arr.length ? arr.reduce((s, t) => s + (t.resultR || 0), 0) / arr.length : 0 });
    return { withOte: g(closed.filter(t => t.oteFib)), withoutOte: g(closed.filter(t => !t.oteFib)) };
  }, [closed]);

  const confVsResult = useMemo(() => [
    { label: "1-3 (Faible)", min: 1, max: 3 }, { label: "4-5 (Moyen)", min: 4, max: 5 },
    { label: "6-7 (Bon)", min: 6, max: 7 }, { label: "8-10 (Excellent)", min: 8, max: 10 },
  ].map(b => {
    const grp = closed.filter(t => t.confidenceLevel >= b.min && t.confidenceLevel <= b.max);
    return { ...b, count: grp.length, winRate: grp.length ? grp.filter(t => t.resultR > 0).length / grp.length * 100 : 0, avgR: grp.length ? grp.reduce((s, t) => s + (t.resultR || 0), 0) / grp.length : 0 };
  }), [closed]);

  const avgs = useMemo(() => {
    const conf = closed.filter(t => t.confidenceLevel > 0).map(t => t.confidenceLevel);
    const qual = closed.filter(t => t.retroRating > 0).map(t => t.retroRating);
    const judged = closed.filter(t => t.verdict === "good" || t.verdict === "bad");
    const good = judged.filter(t => t.verdict === "good");
    return { conf: avg(conf), qual: avg(qual), judged: judged.length, goodPct: judged.length ? good.length / judged.length * 100 : null,
      goodWr: good.length ? good.filter(t => t.resultR > 0).length / good.length * 100 : null };
  }, [closed]);

  if (closed.length === 0) {
    return <EmptyState icon={Brain} title="Pas encore de trades clôturés" text="Clôture des trades et note-les (confiance, qualité, bon/mauvais) pour voir tes moyennes ici." />;
  }

  return (
    <div>
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>Moyennes de tes auto-évaluations</CardLabel>
        <div className="grid-kpi-4" style={{ marginTop: 12 }}>
          <RatingDisplay label="Confiance avant" value={avgs.conf != null ? avgs.conf.toFixed(1) + "/10" : "—"} />
          <RatingDisplay label="Qualité après" value={avgs.qual != null ? avgs.qual.toFixed(1) + "/10" : "—"} color={C.teal} />
          <RatingDisplay label="Jugés « bon trade »" value={avgs.goodPct != null ? avgs.goodPct.toFixed(0) + "%" : "—"} color={C.teal} />
          <RatingDisplay label="Winrate des bons trades" value={avgs.goodWr != null ? avgs.goodWr.toFixed(0) + "%" : "—"} />
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>{avgs.judged} trade(s) jugé(s) bon ou mauvais sur {closed.length} clôturé(s)</div>
      </Card>

      {/* PD Arrays performance */}
      {pdArrayStats.length > 0 && (
        <Card style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
            <Trophy size={13} color={C.teal} />
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Performance par PD Array</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pdArrayStats.map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: C.inputBg || C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{s.name}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{s.count}T</span>
                <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: s.winRate >= 50 ? C.teal : C.red, width: 40, textAlign: "right" }}>{s.winRate.toFixed(0)}%</span>
                <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: s.avgR >= 0 ? C.teal : C.red, width: 48, textAlign: "right" }}>{s.avgR >= 0 ? "+" : ""}{s.avgR.toFixed(2)}R</span>
                {s.avgConf && <span className="tnum" style={{ fontSize: 10, color: C.textMuted, width: 36, textAlign: "right", display: "inline-flex", alignItems: "center", gap: 2, justifyContent: "flex-end" }}><Star size={10} />{s.avgConf.toFixed(1)}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Confiance vs Résultat */}
      {closed.some(t => t.confidenceLevel > 0) && (
        <Card style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
            <Sparkles size={13} color={C.purpleBright} />
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Confiance pré-trade vs Résultat</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {confVsResult.filter(b => b.count > 0).map(b => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: C.inputBg || C.card, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{b.label}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{b.count}T</span>
                <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: b.winRate >= 50 ? C.teal : C.red, width: 40, textAlign: "right" }}>{b.winRate.toFixed(0)}%</span>
                <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: b.avgR >= 0 ? C.teal : C.red, width: 48, textAlign: "right" }}>{b.avgR >= 0 ? "+" : ""}{b.avgR.toFixed(2)}R</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10 }}>
            Si tes trades à haute confiance (8-10) ont un meilleur avg R → ta lecture du marché est fiable.
          </div>
        </Card>
      )}

      {/* OTE Impact */}
      {(oteImpact.withOte.count > 0 || oteImpact.withoutOte.count > 0) && (
        <Card style={{ padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
            <TrendingUp size={13} color="#F59E0B" />
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Impact Zone OTE (Fibonacci)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Avec OTE", data: oteImpact.withOte, color: "#F59E0B" },
              { label: "Sans OTE", data: oteImpact.withoutOte, color: C.textMuted },
            ].map(({ label, data, color }) => (
              <div key={label} style={{ padding: "12px 14px", background: C.inputBg || C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 8 }}>{label}</div>
                <div className="tnum" style={{ fontSize: 11, color: C.textMuted }}>{data.count} trades</div>
                <div className="tnum" style={{ fontSize: 14, fontWeight: 800, color: data.avgR >= 0 ? C.teal : C.red }}>{data.avgR >= 0 ? "+" : ""}{data.avgR.toFixed(2)}R avg</div>
                <div className="tnum" style={{ fontSize: 11, color: data.winRate >= 50 ? C.teal : C.red }}>{data.winRate.toFixed(0)}% winrate</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Distribution des R */}
      {closed.length > 0 && (() => {
        const buckets = [
          { label: "≤-2R", min: -99, max: -2 },
          { label: "-1.5R", min: -2, max: -1 },
          { label: "-1R", min: -1, max: -0.5 },
          { label: "-0.5R", min: -0.5, max: 0 },
          { label: "BE", min: 0, max: 0.01 },
          { label: "+0.5R", min: 0.01, max: 0.5 },
          { label: "+1R", min: 0.5, max: 1 },
          { label: "+1.5R", min: 1, max: 1.5 },
          { label: "+2R", min: 1.5, max: 2 },
          { label: "+2R+", min: 2, max: 99 },
        ].map(b => ({
          ...b,
          count: closed.filter(t => (t.resultR || 0) >= b.min && (t.resultR || 0) < b.max).length,
        }));
        const maxCount = Math.max(...buckets.map(b => b.count), 1);
        return (
          <Card style={{ padding: 18, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
              <BarChart3 size={13} color={C.purpleBright} />
              <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Distribution des R</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 90 }}>
              {buckets.map(b => {
                const pct = (b.count / maxCount) * 100;
                const isPos = b.min >= 0.01;
                const isNeg = b.max <= 0;
                const color = isPos ? C.teal : isNeg ? C.red : C.textMuted;
                return (
                  <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    {b.count > 0 && <span style={{ fontSize: 9, color: C.textMuted, fontWeight: 600 }}>{b.count}</span>}
                    <div style={{ width: "100%", borderRadius: "3px 3px 0 0", background: b.count > 0 ? color : C.border, opacity: b.count > 0 ? 0.85 : 0.15, height: `${Math.max(pct, b.count > 0 ? 8 : 0)}%`, minHeight: b.count > 0 ? 4 : 0 }} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 3, marginTop: 5 }}>
              {buckets.map(b => (
                <div key={b.label} style={{ flex: 1, textAlign: "center" }}>
                  <span style={{ fontSize: 7.5, color: C.textMuted }}>{b.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10, justifyContent: "center" }}>
              {[
                { label: "Pertes", color: C.red, count: closed.filter(t => (t.resultR||0) < 0).length },
                { label: "BE", color: C.textMuted, count: closed.filter(t => t.status === "breakeven").length },
                { label: "Gains", color: C.teal, count: closed.filter(t => (t.resultR||0) > 0).length },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                  <span style={{ fontSize: 11, color: C.textMuted }}>{s.label} <strong style={{ color: s.color }}>{s.count}</strong></span>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}
    </div>
  );
}

/* ============================================================================
   AI COACH — page dédiée
   ============================================================================ */

/* ============================================================================
   PLAN DE TRADING
   ============================================================================ */

function PlanDeTrading() {
  const STORAGE_KEY = "trading_plan_text";
  const [text, setText] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
  });

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    try { localStorage.setItem(STORAGE_KEY, val); } catch {}
    // Sync Supabase avec délai 2s
    clearTimeout(window._planSyncTimer);
    window._planSyncTimer = setTimeout(async () => {
      try {
        await saveSettingsPatch({ trading_plan: val });
      } catch {}
    }, 2000);
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 160px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>Plan de trading</h1>
      </div>
      <textarea
        value={text}
        onChange={handleChange}
        placeholder={"Écris ton plan de trading ici...\n\nExemple :\n— Ne trader que London et NY\n— Max 2 trades par jour\n— Stop loss obligatoire\n— Attendre la confirmation MSS\n..."}
        style={{
          flex: 1, width: "100%",
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 20,
          color: C.text,
          fontSize: 14,
          lineHeight: 1.7,
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
          WebkitTextFillColor: C.text,
        }}
      />
    </div>
  );
}

const TIMEFRAMES_PREV = ["Weekly", "Daily", "4H", "1H"];
const NEWS_TYPES = ["FOMC", "NFP", "CPI", "PPI", "GDP", "PMI", "Jobless Claims", "Autre"];

function Previsions({ pairs = ["DXY", "EURUSD", "GBPUSD"] }) {
  const STORAGE_KEY = "previsions_data";
  const NEWS_KEY = "previsions_news";

  const [biases, setBiases] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  const [news, setNews] = useState(() => {
    try { return JSON.parse(localStorage.getItem(NEWS_KEY) || "[]"); } catch { return []; }
  });
  const [newNewsDate, setNewNewsDate] = useState("");
  const [newNewsType, setNewNewsType] = useState("FOMC");
  const [newNewsLabel, setNewNewsLabel] = useState("");
  const [showAddNews, setShowAddNews] = useState(false);

  const saveBiases = (b) => {
    setBiases(b);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); } catch {}
    try { saveSettingsPatch({ previsions_biases: b }); } catch {}
  };
  const saveNews = (n) => {
    setNews(n);
    try { localStorage.setItem(NEWS_KEY, JSON.stringify(n)); } catch {}
    try { saveSettingsPatch({ previsions_news: n }); } catch {}
  };

  const setBias = (pair, tf, val) => {
    const key = `${pair}_${tf}`;
    const next = { ...biases };
    if (next[key] === val) delete next[key]; else next[key] = val;
    saveBiases(next);
  };

  const addNews = () => {
    if (!newNewsDate) return;
    const label = newNewsLabel.trim() || newNewsType;
    saveNews([...news, { id: Date.now(), date: newNewsDate, type: newNewsType, label }].sort((a,b) => a.date.localeCompare(b.date)));
    setNewNewsDate(""); setNewNewsLabel(""); setShowAddNews(false);
  };

  const removeNews = (id) => saveNews(news.filter(n => n.id !== id));

  const todayStr = localYMD(new Date());
  const upcomingNews = news.filter(n => n.date >= todayStr);
  const pastNews = news.filter(n => n.date < todayStr);

  return (
    <div className="fade-in">
      <PageHeader title="Prévisions" />

      {/* Biais par paire */}
      {pairs.map(pair => {
        const pairColor = pair === "DXY" ? C.amber : pair.includes("EUR") ? "#4A9EFF" : pair.includes("GBP") ? C.teal : pair.includes("JPY") ? "#F59E0B" : pair.includes("AUD") ? "#10B981" : pair.includes("CAD") ? "#EF4444" : pair.includes("CHF") ? "#8B5CF6" : pair.includes("NZD") ? "#06B6D4" : pair.startsWith("XAU") ? "#F59E0B" : C.purpleBright;
        const pairEmoji = pair === "DXY" ? <BarChart3 size={17} color={pairColor} /> : pair.startsWith("XAU") ? <Coins size={17} color={pairColor} /> : <span style={{ fontSize: 11.5, fontWeight: 800, color: pairColor, letterSpacing: 0.3 }}>{pair.slice(0, 2)}</span>;
        // Calcule le biais dominant
        const allBiases = TIMEFRAMES_PREV.map(tf => biases[`${pair}_${tf}`]).filter(Boolean);
        const bullCount = allBiases.filter(b => b === "bullish").length;
        const bearCount = allBiases.filter(b => b === "bearish").length;
        const dominantBias = bullCount > bearCount ? "bullish" : bearCount > bullCount ? "bearish" : allBiases.length > 0 ? "neutral" : null;
        return (
          <Card key={pair} style={{ padding: 0, marginBottom: 12, overflow: "hidden", border: `1px solid ${dominantBias === "bullish" ? C.teal + "40" : dominantBias === "bearish" ? C.red + "40" : C.border}` }}>
            {/* Header paire */}
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, background: `${pairColor}08` }}>
              <PrevPairIcon pair={pair} fallback={pairEmoji} color={pairColor} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: pairColor, letterSpacing: -0.5 }}>{pair}</div>
                {pair !== "DXY" && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{pair.slice(0,3)} / {pair.slice(3)}</div>}
              </div>
              {dominantBias && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>Biais dominant</div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                    color: dominantBias === "bullish" ? C.teal : dominantBias === "bearish" ? C.red : C.textMuted,
                    background: dominantBias === "bullish" ? C.tealDim : dominantBias === "bearish" ? C.redDim : "rgba(107,115,136,0.1)",
                    border: `1px solid ${dominantBias === "bullish" ? C.teal + "40" : dominantBias === "bearish" ? C.red + "40" : C.border}`,
                    textTransform: "uppercase", letterSpacing: 0.5,
                  }}>
                    {dominantBias === "bullish" ? "Bullish" : dominantBias === "bearish" ? "Bearish" : "Conso."}
                  </span>
                </div>
              )}
            </div>

            {/* Timeframes */}
            {TIMEFRAMES_PREV.map((tf, idx) => {
              const key = `${pair}_${tf}`;
              const current = biases[key];
              return (
                <div key={tf} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 16px",
                  borderBottom: idx < TIMEFRAMES_PREV.length - 1 ? `1px solid ${C.border}` : "none",
                  background: current ? (current === "bullish" ? "rgba(45,212,191,0.03)" : current === "bearish" ? "rgba(255,83,112,0.03)" : "transparent") : "transparent",
                }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.textSecondary, width: 52 }}>{tf}</span>

                  {/* 3 boutons Bullish / Neutre / Bearish */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { value: "bullish", label: "Bullish", icon: TrendingUp, color: C.teal, bg: C.tealDim },
                      { value: "neutral", label: "Conso.", icon: ArrowLeftRight, color: C.textMuted, bg: "rgba(107,115,136,0.1)" },
                      { value: "bearish", label: "Bearish", icon: TrendingDown, color: C.red, bg: C.redDim },
                    ].map(opt => {
                      const active = current === opt.value;
                      return (
                        <button key={opt.value} onClick={() => setBias(pair, tf, opt.value)} style={{
                          padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: active ? 700 : 500,
                          border: `2px solid ${active ? opt.color : C.border}`,
                          background: active ? opt.bg : "transparent",
                          color: active ? opt.color : C.textMuted,
                          cursor: "pointer", transition: "all 0.12s",
                          boxShadow: active ? `0 0 8px ${opt.color}25` : "none",
                        }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><opt.icon size={13} />{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Card>
        );
      })}

      {/* News économiques */}
      <Card style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Newspaper size={14} color={C.purpleBright} />
            <CardLabel style={{ margin: 0 }}>News économiques</CardLabel>
          </div>
          <button onClick={() => setShowAddNews(v => !v)} style={{ ...btn.ghost, fontSize: 11.5, padding: "5px 11px" }}>
            <Plus size={12} /> Ajouter
          </button>
        </div>

        {/* Formulaire ajout */}
        {showAddNews && (
          <div style={{ padding: 12, background: C.bg, borderRadius: 9, border: `1px solid ${C.border}`, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Date">
                <input type="date" value={newNewsDate} onChange={e => setNewNewsDate(e.target.value)} style={{ ...inputStyle, minHeight: 40 }} />
              </Field>
              <Field label="Type">
                <select value={newNewsType} onChange={e => setNewNewsType(e.target.value)} style={inputStyle}>
                  {NEWS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Description (optionnel)">
              <input value={newNewsLabel} onChange={e => setNewNewsLabel(e.target.value)} placeholder="Ex: FOMC Minutes, taux directeur…" style={inputStyle} onKeyDown={e => e.key === "Enter" && addNews()} />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addNews} disabled={!newNewsDate} style={{ ...btn.primary, flex: 1, justifyContent: "center", opacity: newNewsDate ? 1 : 0.4 }}>Ajouter</button>
              <button onClick={() => setShowAddNews(false)} style={btn.ghost}>Annuler</button>
            </div>
          </div>
        )}

        {/* News à venir */}
        {upcomingNews.length === 0 && !showAddNews && (
          <div style={{ textAlign: "center", padding: "20px 0", color: C.textMuted, fontSize: 12 }}>
            Aucune news planifiée. Ajoute les événements importants (FOMC, NFP…).
          </div>
        )}
        {upcomingNews.map(n => {
          const d = new Date(n.date + "T00:00:00");
          const daysLeft = Math.ceil((d - new Date().setHours(0,0,0,0)) / 86400000);
          const isToday = daysLeft === 0;
          const isSoon = daysLeft <= 3;
          return (
            <div key={n.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ textAlign: "center", minWidth: 40, flexShrink: 0 }}>
                <div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: isToday ? C.red : isSoon ? C.amber : C.text, lineHeight: 1 }}>
                  {d.toLocaleDateString("fr-FR", { day: "2-digit" })}
                </div>
                <div style={{ fontSize: 9.5, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.3 }}>
                  {d.toLocaleDateString("fr-FR", { month: "short" })}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: isToday ? C.red : C.text }}>{n.label}</div>
                <div style={{ fontSize: 10.5, color: C.textMuted }}>
                  {isToday ? "Aujourd'hui" : daysLeft === 1 ? "Demain" : `dans ${daysLeft} jours`}
                </div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: C.purpleBright, background: C.purpleDim, padding: "2px 8px", borderRadius: 10 }}>{n.type}</span>
              <button onClick={() => removeNews(n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: 3 }}><X size={13} /></button>
            </div>
          );
        })}

        {/* News passées */}
        {pastNews.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10.5, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Passées</div>
            {pastNews.slice(-3).reverse().map(n => (
              <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", opacity: 0.5 }}>
                <span className="tnum" style={{ fontSize: 11, color: C.textMuted, width: 40 }}>{new Date(n.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                <span style={{ fontSize: 11, color: C.textMuted, flex: 1 }}>{n.label}</span>
                <button onClick={() => removeNews(n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: 2 }}><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AiCoach({ trades }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");
  const closedCount = trades.filter((t) => t.status !== "open").length;

  const runAnalysis = async () => {
    setLoading(true);
    setError("");
    try {
      const text = await getCoachInsights(trades);
      setInsights(text);
    } catch (e) {
      setError(e.message || "L'analyse a échoué. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  const insightLines = useMemo(() => {
    if (!insights) return [];
    return insights.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  }, [insights]);

  return (
    <div className="fade-in">
      <PageHeader title="IA Coach" action={
        <button onClick={runAnalysis} disabled={loading || closedCount < 5} style={{ ...btn.primary, opacity: loading || closedCount < 5 ? 0.5 : 1, cursor: loading || closedCount < 5 ? "not-allowed" : "pointer" }}>
          {loading ? <RefreshCw size={14} className="spin-slow" /> : <Brain size={14} />}
          {loading ? "Analyse en cours…" : "Analyser mes trades"}
        </button>
      } />

      {closedCount < 5 && (
        <Card style={{ padding: 16, marginBottom: 16, borderColor: "rgba(139,124,246,0.25)" }}>
          <div style={{ fontSize: 12.5, color: C.textSecondary }}>Il te faut au moins 5 trades clôturés pour une analyse pertinente. Tu en as actuellement <strong style={{ color: C.text }}>{closedCount}</strong>.</div>
        </Card>
      )}

      <PerformanceReview trades={trades} />

      <Card style={{ padding: 20, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Brain size={16} color={C.purpleBright} />
          <span style={{ fontSize: 14.5, fontWeight: 700 }}>Observations du coach</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 16 }}>Analyse générée à partir de tes trades, tags et auto-évaluations</div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.red, fontSize: 12.5, padding: "10px 12px", background: C.redDim, borderRadius: 7, marginBottom: 12 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {!insights && !loading && !error && (
          <div style={{ textAlign: "center", padding: "30px 10px", color: C.textMuted, fontSize: 12.5 }}>
            Clique sur "Analyser mes trades" pour obtenir des observations chiffrées sur tes patterns de performance.
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "30px 10px", color: C.textSecondary, fontSize: 12.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <Brain size={22} color={C.purpleBright} className="spin-slow" />
            Lecture de tes {closedCount} trades et de tes auto-évaluations…
          </div>
        )}

        {insightLines.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insightLines.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "12px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <Sparkles size={15} color={C.purpleBright} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 13, color: C.text, lineHeight: 1.55 }}>{line}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================================
   ROOT APP
   ============================================================================ */

/* ============================================================================
   SETTINGS PAGE
   ============================================================================ */

const ALL_PAIRS = [...new Set([...ALL_INSTRUMENTS, "US30"])];

// ── Logos automatiques (drapeaux superposés façon TradingView) ──
function FlagFill({ cur, id }) {
  const W = 30;
  const uj = (sc) => <g transform={`scale(${sc})`}><rect width="30" height="30" fill="#1f3a93" /><path d="M0 0L30 30M30 0L0 30" stroke="#fff" strokeWidth="6" /><path d="M0 0L30 30M30 0L0 30" stroke="#d6293b" strokeWidth="2" /><path d="M15 0V30M0 15H30" stroke="#fff" strokeWidth="9" /><path d="M15 0V30M0 15H30" stroke="#d6293b" strokeWidth="5" /></g>;
  switch (cur) {
    case "USD": return <g><rect width={W} height={W} fill="#fff" />{[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} y={i * (W / 6.5)} width={W} height={W / 13} fill="#e8414d" />)}<rect width="15" height="15" fill="#1f4e9c" />{[[3, 3], [7.5, 3], [12, 3], [5, 6.5], [10, 6.5], [3, 10], [7.5, 10], [12, 10]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1" fill="#fff" />)}</g>;
    case "EUR": return <g><rect width={W} height={W} fill="#1d5bbf" />{Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return <circle key={i} cx={15 + Math.cos(a) * 8} cy={15 + Math.sin(a) * 8} r="1.5" fill="#ffd43b" />; })}</g>;
    case "GBP": return uj(1);
    case "JPY": return <g><rect width={W} height={W} fill="#fff" /><circle cx="15" cy="15" r="7" fill="#d6293b" /></g>;
    case "CHF": return <g><rect width={W} height={W} fill="#e03131" /><path d="M15 7V23M7 15H23" stroke="#fff" strokeWidth="5" /></g>;
    case "CAD": return <g><rect width={W} height={W} fill="#fff" /><rect width="7.5" height={W} fill="#e03131" /><rect x="22.5" width="7.5" height={W} fill="#e03131" /><path d="M15 6.5l1.4 2.7 1.6-.8-.6 3.7 2.5-2.5.6 1.4 2.5-.5-.8 2.8 1.1.5-3.9 3.2.5 1.5-3.7-.6.1 4.1h-1.6l.1-4.1-3.7.6.5-1.5-3.9-3.2 1.1-.5-.8-2.8 2.5.5.6-1.4 2.5 2.5-.6-3.7 1.6.8z" fill="#e03131" /></g>;
    case "AUD": return <g><rect width={W} height={W} fill="#1f3a93" />{uj(0.5)}{[[22, 8], [26, 14], [22, 22], [18, 15], [8, 23]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 4 ? 2 : 1.3} fill="#fff" />)}</g>;
    case "NZD": return <g><rect width={W} height={W} fill="#1f3a93" />{uj(0.5)}{[[22, 8], [26, 14], [22, 23], [18, 15]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill="#e03131" stroke="#fff" strokeWidth=".5" />)}</g>;
    default: return null;
  }
}
const FLAG_CURS = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"];
const ASSET_BADGE = {
  XAUUSD: ["#E8B931", "Au", "#5c4400"], XAGUSD: ["#C9CED6", "Ag", "#3a3f47"], USOIL: ["#1f2329", "OIL", "#f5a524"],
  BTCUSD: ["#F7931A", "₿", "#fff"], ETHUSD: ["#627EEA", "Ξ", "#fff"], NAS100: ["#2D7FF9", "NQ", "#fff"], SPX500: ["#E5484D", "ES", "#fff"],
  US30: ["#0E9F6E", "YM", "#fff"], DXY: ["#16A34A", "$", "#fff"],
};
function AutoPairLogo({ pair, size = 22 }) {
  const uid0 = React.useId ? React.useId().replace(/:/g, "") : String(Math.random()).slice(2);
  const b = pair.slice(0, 3), q = pair.slice(3, 6);
  if (pair.length === 6 && FLAG_CURS.includes(b) && FLAG_CURS.includes(q)) {
    return (<svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0, display: "block" }}>
      <defs><clipPath id={"cq" + uid0}><circle cx="15" cy="15" r="15" /></clipPath><clipPath id={"cb" + uid0}><circle cx="15" cy="15" r="15" /></clipPath></defs>
      <g transform="translate(13.5 1) scale(0.85)"><g clipPath={`url(#cq${uid0})`}><FlagFill cur={q} /></g></g>
      <g transform="translate(1 13.5) scale(0.85)"><circle cx="15" cy="15" r="16.5" fill={C.card} /><g clipPath={`url(#cb${uid0})`}><FlagFill cur={b} /></g></g>
    </svg>);
  }
  const bd = ASSET_BADGE[pair];
  if (bd) return <span style={{ width: size, height: size, borderRadius: "50%", background: bd[0], color: bd[2], display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * (bd[1].length > 2 ? 0.3 : bd[1].length > 1 ? 0.38 : 0.55), fontWeight: 900, flexShrink: 0 }}>{bd[1]}</span>;
  return null;
}
// Retire le fond blanc (remplissage depuis les bords, garde le blanc intérieur des drapeaux)
async function removeWhiteBg(src) {
  const img = await new Promise((ok, ko) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = ko; i.src = src; });
  const w = img.naturalWidth, h = img.naturalHeight; const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0); const d = cx.getImageData(0, 0, w, h); const a = d.data;
  const isW = (k) => a[k + 3] > 0 && a[k] > 225 && a[k + 1] > 225 && a[k + 2] > 225;
  const seen = new Uint8Array(w * h); const st = [];
  for (let x = 0; x < w; x++) { st.push(x, (h - 1) * w + x); } for (let y = 0; y < h; y++) { st.push(y * w, y * w + w - 1); }
  while (st.length) { const i = st.pop(); if (seen[i]) continue; seen[i] = 1; const k = i * 4; if (!isW(k)) continue; a[k + 3] = 0; const x = i % w, y = (i / w) | 0;
    if (x > 0) st.push(i - 1); if (x < w - 1) st.push(i + 1); if (y > 0) st.push(i - w); if (y < h - 1) st.push(i + w); }
  cx.putImageData(d, 0, 0); return cv.toDataURL("image/png");
}

// ── Logos des actifs (collés dans Réglages) ──
const PAIR_LOGO_KEY = "emeieks_pair_logos";
function pairLogosGet() { try { return JSON.parse(localStorage.getItem(PAIR_LOGO_KEY) || "{}"); } catch { return {}; } }
function pairLogoSet(pair, url) { const m = pairLogosGet(); if (url) m[pair] = url; else delete m[pair]; try { localStorage.setItem(PAIR_LOGO_KEY, JSON.stringify(m)); } catch {} try { window.dispatchEvent(new Event("pairlogos")); } catch {}
  if (!url || !String(url).startsWith("data:")) { clearTimeout(pairLogoSet._t); pairLogoSet._t = setTimeout(() => { saveSettingsPatch({ pair_logos: pairLogosGet() }).catch(() => {}); }, 800); } }
function usePairLogos() { const [m, setM] = useState(pairLogosGet); useEffect(() => { const h = () => setM(pairLogosGet()); window.addEventListener("pairlogos", h); return () => window.removeEventListener("pairlogos", h); }, []); return m; }
function PairLogo({ pair, size = 22, radius }) {
  const m = usePairLogos(); const src = m[pair];
  if (!src) return <AutoPairLogo pair={pair} size={size} />;
  return <img src={src} alt="" style={{ width: size, height: size, borderRadius: radius ?? size * 0.28, objectFit: "contain", flexShrink: 0, display: "block" }} />;
}
const ASSET_CATS = [
  ["Forex", (p) => /^[A-Z]{6}$/.test(p) && !["XAUUSD", "XAGUSD", "BTCUSD", "ETHUSD"].includes(p)],
  ["Indices", (p) => ["NAS100", "SPX500", "US30", "DXY"].includes(p)],
  ["Matières premières", (p) => ["XAUUSD", "XAGUSD", "USOIL"].includes(p)],
  ["Crypto", (p) => ["BTCUSD", "ETHUSD"].includes(p)],
];
const assetCat = (p) => (ASSET_CATS.find(([, f]) => f(p)) || ["Autres"])[0];
function PairLogosSettings() {
  const m = usePairLogos();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);
  const all = ["DXY", ...ALL_INSTRUMENTS, "US30"].filter((v, i, a) => a.indexOf(v) === i);
  const qn = q.trim().toUpperCase();
  const list = (qn || cat) ? all.filter((p) => (!cat || assetCat(p) === cat) && (!qn || p.includes(qn) || (PAIR_LABEL[p] || "").toUpperCase().includes(qn) || Object.entries(PAIR_ALIASES).some(([k, v]) => v === p && k.startsWith(qn)))) : [];
  const put = async (pair, file) => {
    setBusy(true); setMsg("");
    const r = new FileReader(); r.onload = (e) => pairLogoSet(pair, e.target.result); r.readAsDataURL(file);
    try { const url = await uploadToStorage(file); if (url) pairLogoSet(pair, url); } catch (e) {}
    setBusy(false);
  };
  const paste = async (pair) => {
    try { const items = await navigator.clipboard.read(); for (const it of items) { const t = it.types.find((x) => x.startsWith("image/")); if (t) { const b = await it.getType(t); return put(pair, new File([b], pair + ".png", { type: t })); } } setMsg("Aucune image dans le presse-papier."); }
    catch (e) { setMsg("Presse-papier refusé : utilise « Fichier »."); }
  };
  const Logo = ({ p, size }) => m[p] ? <img src={m[p]} alt="" style={{ width: size, height: size, borderRadius: size * 0.26, objectFit: "contain", flexShrink: 0 }} />
    : (ASSET_BADGE[p] || (p.length === 6 && FLAG_CURS.includes(p.slice(0, 3)) && FLAG_CURS.includes(p.slice(3)))) ? <AutoPairLogo pair={p} size={size} /> : <span style={{ width: size, height: size, borderRadius: size * 0.26, background: C.inputBg || C.bg, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.3, fontWeight: 800, color: C.textMuted, flexShrink: 0 }}>{p.slice(0, 3)}</span>;
  return (<div>
    <div style={{ position: "relative" }}>
      <Search size={14} color={C.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un actif (EUR, gold, NQ, BTC…)" style={{ ...inputStyle, paddingLeft: 34 }} />
    </div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
      {ASSET_CATS.map(([c]) => <button key={c} onClick={() => setCat(cat === c ? "" : c)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${cat === c ? C.purple : C.border}`, background: cat === c ? C.purpleDim : "transparent", color: cat === c ? C.purpleBright : C.textSecondary }}>{c} <span style={{ opacity: 0.6 }}>{all.filter((p) => assetCat(p) === c).length}</span></button>)}
    </div>
    {list.length > 0 && <div style={{ marginTop: 10, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      {list.map((p, i) => <button key={p} onClick={() => { setOpen(p); setMsg(""); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "none", borderTop: i ? `1px solid ${C.border}` : "none", background: "transparent", color: C.text, cursor: "pointer", textAlign: "left" }}>
        <Logo p={p} size={28} /><span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{PAIR_LABEL[p] ? PAIR_LABEL[p] + " · " + p : p}</span><span style={{ fontSize: 11, color: C.textMuted }}>{assetCat(p)}</span><ChevronRight size={15} color={C.textMuted} />
      </button>)}
    </div>}
    {(qn || cat) && list.length === 0 && <div style={{ marginTop: 10, fontSize: 12.5, color: C.textMuted }}>Aucun actif trouvé.</div>}
    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f && open) put(open, f); e.target.value = ""; }} />
    {open && <div onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ alignSelf: "stretch", display: "flex", justifyContent: "flex-end" }}><button onClick={() => setOpen(null)} aria-label="Fermer" style={{ ...btn.ghost, padding: 7 }}><X size={15} /></button></div>
        <Logo p={open} size={88} />
        <div style={{ fontSize: 22, fontWeight: 900 }}>{open}</div>
        <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: -8 }}>{[PAIR_LABEL[open], assetCat(open)].filter(Boolean).join(" · ")}</div>
        {busy && <div style={{ fontSize: 12, color: C.purpleBright }}>Envoi…</div>}
        {msg && <div style={{ fontSize: 12, color: C.red }}>{msg}</div>}
        <div style={{ display: "flex", gap: 8, alignSelf: "stretch" }}>
          <button onClick={() => paste(open)} style={{ ...btn.primary, flex: 1, justifyContent: "center" }}><Clipboard size={14} /> Coller</button>
          <button onClick={() => fileRef.current?.click()} style={{ ...btn.ghost, flex: 1, justifyContent: "center" }}><Upload size={14} /> Fichier</button>
        </div>
        {m[open] && <button onClick={async () => { setBusy(true); setMsg(""); try { const out = await removeWhiteBg(m[open]); pairLogoSet(open, out); try { const blob = await (await fetch(out)).blob(); const url = await uploadToStorage(new File([blob], open + ".png", { type: "image/png" })); if (url) pairLogoSet(open, url); } catch (e) {} } catch (e) { setMsg("Impossible de traiter cette image."); } setBusy(false); }} style={{ ...btn.ghost, alignSelf: "stretch", justifyContent: "center" }}>Retirer le fond blanc</button>}
        {m[open] && <button onClick={() => pairLogoSet(open, null)} style={{ background: "none", border: "none", color: C.red, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Retirer le logo (revenir au logo auto)</button>}
      </div>
    </div>}
  </div>);
}
function PrevPairIcon({ pair, fallback, color }) {
  const m = usePairLogos();
  if (m[pair]) return <img src={m[pair]} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "contain", flexShrink: 0 }} />;
  if (ASSET_BADGE[pair] || (pair.length === 6 && FLAG_CURS.includes(pair.slice(0, 3)) && FLAG_CURS.includes(pair.slice(3)))) return <AutoPairLogo pair={pair} size={38} />;
  return <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, border: `1.5px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{fallback}</div>;
}
function SettingsSection({ title, children, icon: Icon }) {
  return (
    <Card style={{ padding: 20, marginBottom: 14 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        {Icon && <span style={{ width: 28, height: 28, borderRadius: 8, background: C.purpleDim, color: C.purpleBright, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={15} strokeWidth={2.2} /></span>}{title}</div>
      {children}
    </Card>
  );
}

function SettingsRow({ label, sub, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 16 }}>{children}</div>
    </div>
  );
}

function TagList({ items, onRemove, color }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
      {items.map((item) => (
        <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: color || C.purpleDim, border: `1px solid ${C.border}`, fontSize: 12.5, fontWeight: 500, color: C.text }}>
          {item}
          <button onClick={() => onRemove(item)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 0, display: "flex", lineHeight: 1 }}>
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

function AddItemInput({ placeholder, onAdd }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, flex: 1 }}
        onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onAdd(val.trim().toUpperCase()); setVal(""); } }}
      />
      <button
        onClick={() => { if (val.trim()) { onAdd(val.trim().toUpperCase()); setVal(""); } }}
        style={{ ...btn.primary, padding: "8px 14px" }}
      >
        Ajouter
      </button>
    </div>
  );
}

function AccountCard({ acc, accounts, activeAccountId, onSwitchAccount, onSaveAccounts }) {
  const typeColors = { real: C.teal, demo: C.purple, challenge: C.amber };
  const typeLabels = { real: "Réel", demo: "Démo", challenge: "Challenge" };
  const isActive = acc.id === activeAccountId;
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(acc.name);
  const [editBalance, setEditBalance] = useState(String(acc.balance || ""));
  const [editBroker, setEditBroker] = useState(acc.broker || "");
  const [editType, setEditType] = useState(acc.type || "real");
  const [confirmDel, setConfirmDel] = useState(false);

  const saveEdit = () => {
    onSaveAccounts(accounts.map(a => a.id === acc.id ? { ...a, name: editName, balance: Number(editBalance) || 0, broker: editBroker, type: editType } : a));
    setEditing(false);
  };

  return (
    <div style={{ background: C.inputBg || C.card, borderRadius: 10, border: `1.5px solid ${isActive ? C.purple : C.border}`, marginBottom: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: typeColors[acc.type] || C.teal, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{acc.name}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
            <span style={{ color: typeColors[acc.type] || C.teal, fontWeight: 600 }}>{typeLabels[acc.type] || acc.type}</span>
            {acc.broker && ` · ${acc.broker}`}
            {acc.balance && ` · $${Number(acc.balance).toLocaleString()}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {isActive
            ? <span style={{ fontSize: 11, color: C.purple, fontWeight: 700, background: C.purpleDim, padding: "3px 8px", borderRadius: 5 }}>Actif</span>
            : <button onClick={() => onSwitchAccount(acc.id)} style={{ ...btn.ghost, fontSize: 11, padding: "5px 10px" }}>Activer</button>}
          <button onClick={() => setEditing(v => !v)} style={{ ...btn.ghost, fontSize: 11, padding: "5px 10px", color: editing ? C.purple : C.textMuted }}><Edit3 size={12} /></button>
          {confirmDel
            ? <button onClick={() => onSaveAccounts(accounts.filter(a => a.id !== acc.id))} onBlur={() => setConfirmDel(false)} style={{ ...btn.ghost, fontSize: 11, padding: "5px 10px", color: C.red, borderColor: `${C.red}60` }}>Supprimer ?</button>
            : <button onClick={() => setConfirmDel(true)} style={{ ...btn.icon, padding: "5px", color: C.red, borderColor: "transparent" }}><X size={13} /></button>}
        </div>
      </div>
      {editing && (
        <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}`, background: C.bg, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            {[{ v: "real", l: "Réel", c: C.teal }, { v: "demo", l: "Démo", c: C.purple }, { v: "challenge", l: "Challenge", c: C.amber }].map(t => (
              <button key={t.v} onClick={() => setEditType(t.v)} style={{ flex: 1, padding: "6px", borderRadius: 7, border: `1.5px solid ${editType === t.v ? t.c : C.border}`, background: editType === t.v ? `${t.c}15` : "transparent", color: editType === t.v ? t.c : C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t.l}</button>
            ))}
          </div>
          <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nom du compte" style={{ ...inputStyle, fontSize: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)} placeholder="Solde ($)" style={{ ...inputStyle, fontSize: 12, flex: 1 }} />
            <input value={editBroker} onChange={e => setEditBroker(e.target.value)} placeholder="Broker" style={{ ...inputStyle, fontSize: 12, flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveEdit} style={{ ...btn.primary, flex: 1, fontSize: 12 }}>Sauvegarder</button>
            <button onClick={() => setEditing(false)} style={{ ...btn.ghost, fontSize: 12 }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
function AddAccountForm({ accounts, onSaveAccounts }) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("demo");
  const [newBalance, setNewBalance] = useState("");
  const [newBroker, setNewBroker] = useState("");

  const handleAdd = () => {
    if (!newName) return;
    const acc = { id: `acc_${Date.now()}`, name: newName, type: newType, balance: Number(newBalance) || 0, broker: newBroker };
    onSaveAccounts([...(accounts || []), acc]);
    setShowForm(false); setNewName(""); setNewBalance(""); setNewBroker(""); setNewType("demo");
  };

  if (!showForm) return (
    <button onClick={() => setShowForm(true)} style={{ ...btn.ghost, marginTop: 6, width: "100%", justifyContent: "center" }}>
      <Plus size={13} /> Ajouter un compte démo / challenge
    </button>
  );

  return (
    <div style={{ background: C.inputBg || C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 12 }}>Nouveau compte</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {[{ v: "demo", l: "Démo", c: C.purple }, { v: "challenge", l: "Challenge", c: C.amber }, { v: "real", l: "Réel", c: C.teal }].map(t => (
          <button key={t.v} onClick={() => setNewType(t.v)} style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: `2px solid ${newType === t.v ? t.c : C.border}`, background: newType === t.v ? `${t.c}18` : "transparent", color: newType === t.v ? t.c : C.textSecondary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t.l}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom (ex: FTMO 100K, Compte démo)" style={inputStyle} />
        <div className="form-grid-2">
          <input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} placeholder="Solde ($)" style={inputStyle} />
          <input value={newBroker} onChange={e => setNewBroker(e.target.value)} placeholder="Broker (optionnel)" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={handleAdd} style={{ ...btn.primary, flex: 1 }}>Ajouter</button>
        <button onClick={() => setShowForm(false)} style={btn.ghost}>Annuler</button>
      </div>
    </div>
  );
}

function SettingsPage({ settings, setSettings, accounts, activeAccountId, onSaveAccounts, onSwitchAccount }) {
  
  
  
  const [toast, setToast] = useState("");

  const update = (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setToast("Sauvegardé");
    setTimeout(() => setToast(""), 1800);
  };

  const addPair = (pair) => {
    if (!settings.pairs.includes(pair)) update({ pairs: [...settings.pairs, pair] });
  };
  const removePair = (pair) => update({ pairs: settings.pairs.filter((p) => p !== pair) });

  
  

  return (
    <div className="fade-in" style={{ maxWidth: 600 }}>
      <PageHeader title="Paramètres" />

      {/* Compte */}
      <SettingsSection title="Comptes de trading" icon={FolderOpen}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>Chaque compte est isolé — les trades et stats ne se mélangent pas.</div>

        {(accounts || []).map((acc) => (
          <AccountCard key={acc.id} acc={acc} accounts={accounts} activeAccountId={activeAccountId} onSwitchAccount={onSwitchAccount} onSaveAccounts={onSaveAccounts} />
        ))}

        <AddAccountForm accounts={accounts} onSaveAccounts={onSaveAccounts} />
      </SettingsSection>

      {/* Paires tradées */}
      <SettingsSection title="Paires tradées" icon={LineChart}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Sélectionne les paires qui apparaissent dans le formulaire d'ajout de trade</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {ALL_PAIRS.map((pair) => {
            const active = settings.pairs.includes(pair);
            return (
              <button
                key={pair}
                onClick={() => active ? removePair(pair) : addPair(pair)}
                style={{
                  padding: "5px 11px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${active ? C.purple : C.border}`,
                  background: active ? C.purpleDim : "transparent",
                  color: active ? C.purpleBright : C.textSecondary,
                }}
              >
                {pair}
              </button>
            );
          })}
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>Ajouter une paire personnalisée</div>
        <AddItemInput placeholder="Ex: USDZAR, US30..." onAdd={addPair} />
      </SettingsSection>

      <SettingsSection title="Logos des actifs" icon={Coins}>
        <PairLogosSettings />
      </SettingsSection>

      <SettingsSection title="Timeframes par défaut" icon={Timer}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Les timeframes proposées dans le formulaire (setup).</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {["M1", "M3", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN"].map((tf) => {
            const cur = settings.timeframes && settings.timeframes.length ? settings.timeframes : DEFAULT_TFS;
            const on = cur.includes(tf);
            return <button key={tf} onClick={() => { const next = on ? cur.filter((x) => x !== tf) : [...cur, tf]; const order = ["M1", "M3", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN"]; update({ timeframes: next.sort((a, b) => order.indexOf(a) - order.indexOf(b)) }); }}
              style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: `1px solid ${on ? C.purple : C.border}`, background: on ? C.purpleDim : "transparent", color: on ? C.purpleBright : C.textMuted }}>{tf}</button>;
          })}
        </div>
      </SettingsSection>

      {/* Tags personnalisés */}
      <SettingsSection title="PD Arrays & Tags" icon={Target}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>Gère les PD Arrays disponibles dans le formulaire. Tu peux masquer ceux que tu n'utilises pas.</div>

        {/* Tags par défaut — masquables */}
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>Tags par défaut</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {TAG_CATALOG.filter((t) => t.category === "setup").map((t) => {
            const hidden = (settings.hiddenTags || []).includes(t.name);
            return (
              <button key={t.name} onClick={() => {
                const current = settings.hiddenTags || [];
                update({ hiddenTags: hidden ? current.filter(x => x !== t.name) : [...current, t.name] });
              }} style={{
                padding: "4px 10px", borderRadius: 5, fontSize: 11.5, cursor: "pointer",
                border: `1px solid ${hidden ? C.border : C.purple}`,
                background: hidden ? "transparent" : C.purpleDim,
                color: hidden ? C.textMuted : C.purpleBright,
                textDecoration: hidden ? "line-through" : "none",
                opacity: hidden ? 0.5 : 1,
              }}>
                {t.name}
              </button>
            );
          })}
        </div>
        {(settings.hiddenTags || []).length > 0 && (
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
            {(settings.hiddenTags || []).length} tag(s) masqué(s) — clique dessus pour les réactiver
          </div>
        )}

        {/* Tags personnalisés */}
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>Tags personnalisés</div>
        <TagList
          items={settings.customTags || []}
          onRemove={(tag) => update({ customTags: (settings.customTags || []).filter((t) => t !== tag) })}
        />
        <AddItemInput
          placeholder="Ex: Propulsion, ICT Killzone, IPDA..."
          onAdd={(tag) => {
            if (!(settings.customTags || []).includes(tag)) update({ customTags: [...(settings.customTags || []), tag] });
          }}
        />
      </SettingsSection>

      {/* Réinitialisation */}
      <SettingsSection title="Autres" icon={SlidersHorizontal}>
        <SettingsRow label="Réinitialiser tous les paramètres" sub="Remet les valeurs par défaut">
          <button
            onClick={() => {
              setSettings({ accountBalance: 10000, currency: "USD", broker: "ICMarkets", pairs: ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "GBPJPY"], brokers: ["ICMarkets", "Pepperstone", "FTMO", "MyForexFunds"], customTags: [] });
              setToast("Paramètres réinitialisés");
              setTimeout(() => setToast(""), 1800);
            }}
            style={{ ...btn.ghost, color: C.red, borderColor: "rgba(232,85,78,0.35)", fontSize: 12 }}
          >
            Réinitialiser
          </button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Erreurs à améliorer" icon={AlertTriangle}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>Apparaissent dans l'onglet Retour. Clique pour masquer celles que tu n'utilises pas.</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>Par défaut</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {DEFAULT_ERRORS.map(err => {
            const hidden = (settings.hiddenErrors || []).includes(err);
            return (
              <button key={err} onClick={() => {
                const cur = settings.hiddenErrors || [];
                update({ hiddenErrors: hidden ? cur.filter(x => x !== err) : [...cur, err] });
              }} style={{ padding: "4px 10px", borderRadius: 5, fontSize: 11.5, cursor: "pointer", border: `1px solid ${hidden ? C.border : C.red}`, background: hidden ? "transparent" : "rgba(255,83,112,0.08)", color: hidden ? C.textMuted : C.red, textDecoration: hidden ? "line-through" : "none", opacity: hidden ? 0.5 : 1 }}>{err}</button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>Personnalisées</div>
        <TagList items={settings.customErrors || []} onRemove={err => update({ customErrors: (settings.customErrors || []).filter(e => e !== err) })} />
        <AddItemInput placeholder="Ex: Trop de confluences, mauvais TF..." onAdd={err => { if (err && !(settings.customErrors || []).includes(err)) update({ customErrors: [...(settings.customErrors || []), err] }); }} />
      </SettingsSection>

      {toast && (
        <div style={{ position: "fixed", bottom: 130, left: "50%", transform: "translateX(-50%)", background: C.card, border: `1px solid ${C.border}`, padding: "9px 16px", borderRadius: 8, fontSize: 12.5, color: C.text, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 1000 }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   FOREX CALCULATOR — inspiré myfxbook.com
   ============================================================================ */

const FOREX_PAIRS = {
  "EURUSD": { pipVal: 10, base: "EUR", quote: "USD" },
  "GBPUSD": { pipVal: 10, base: "GBP", quote: "USD" },
  "AUDUSD": { pipVal: 10, base: "AUD", quote: "USD" },
  "NZDUSD": { pipVal: 10, base: "NZD", quote: "USD" },
  "USDCAD": { pipVal: null, base: "USD", quote: "CAD", pipUSD: (usdcad) => 10 / usdcad },
  "USDCHF": { pipVal: null, base: "USD", quote: "CHF", pipUSD: (usdchf) => 10 / usdchf },
  "USDJPY": { pipVal: null, base: "USD", quote: "JPY", pipUSD: (usdjpy) => 1000 / usdjpy, pipDecimal: 0.01 },
  "EURJPY": { pipVal: null, base: "EUR", quote: "JPY", pipUSD: (eurjpy) => 1000 / eurjpy * 1, pipDecimal: 0.01 },
  "GBPJPY": { pipVal: null, base: "GBP", quote: "JPY", pipUSD: (gbpjpy) => 1000 / gbpjpy * 1, pipDecimal: 0.01 },
  "XAUUSD": { pipVal: 10, base: "XAU", quote: "USD", pipDecimal: 0.1 },
  "XAGUSD": { pipVal: 50, base: "XAG", quote: "USD", pipDecimal: 0.01 },
};

const APPROX_RATES = {
  USDCAD: 1.37, USDCHF: 0.90, USDJPY: 149.5, EURJPY: 161, GBPJPY: 189,
};

function calcPipValueUSD(pair) {
  const info = FOREX_PAIRS[pair];
  if (!info) return 10;
  if (info.pipVal !== null) return info.pipVal;
  const rate = APPROX_RATES[pair] || 1;
  return info.pipUSD ? info.pipUSD(rate) : 10;
}

function ForexCalculator() {
  const [pair, setPair] = useState("EURUSD");
  const [accountSize, setAccountSize] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [slPips, setSlPips] = useState("");
  const [tpPips, setTpPips] = useState("");
  const [result, setResult] = useState(null);

  const calculate = () => {
    const acc = parseFloat(accountSize);
    const risk = parseFloat(riskPct);
    const sl = parseFloat(slPips);
    const tp = parseFloat(tpPips);
    if (!acc || !risk || !sl) return;

    const riskUsd = (acc * risk) / 100;
    const pipValuePerLot = calcPipValueUSD(pair);
    const lotSize = riskUsd / (sl * pipValuePerLot);
    const riskMoney = sl * pipValuePerLot * lotSize;
    const rewardMoney = tp ? tp * pipValuePerLot * lotSize : null;
    const rratio = tp ? tp / sl : null;
    const pipVal = pipValuePerLot * lotSize;

    setResult({
      lotSize: lotSize.toFixed(2),
      riskUsd: riskMoney.toFixed(2),
      rewardUsd: rewardMoney?.toFixed(2),
      rratio: rratio?.toFixed(2),
      pipValue: pipVal.toFixed(2),
      pipValuePerLot: pipValuePerLot.toFixed(2),
    });
  };

  const reset = () => { setSlPips(""); setTpPips(""); setResult(null); };

  const pairs = Object.keys(FOREX_PAIRS);

  return (
    <div className="fade-in" style={{ maxWidth: 520 }}>
      <PageHeader title="Calculatrice de position" />

      <Card style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Paire de devises">
            <select value={pair} onChange={(e) => { setPair(e.target.value); setResult(null); }} style={inputStyle}>
              {pairs.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          <div className="form-grid-2">
            <Field label="Taille du compte ($)">
              <input type="number" placeholder="10000" value={accountSize} onChange={(e) => { setAccountSize(e.target.value); setResult(null); }} style={inputStyle} />
            </Field>
            <Field label="Risque (%)">
              <input type="number" step="0.1" placeholder="1" value={riskPct} onChange={(e) => { setRiskPct(e.target.value); setResult(null); }} style={inputStyle} />
            </Field>
            <Field label="Stop-Loss (pips)">
              <input type="number" placeholder="20" value={slPips} onChange={(e) => { setSlPips(e.target.value); setResult(null); }} style={inputStyle} />
            </Field>
            <Field label="Take-Profit (pips) — optionnel">
              <input type="number" placeholder="40" value={tpPips} onChange={(e) => { setTpPips(e.target.value); setResult(null); }} style={inputStyle} />
            </Field>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={calculate} style={{ ...btn.primary, flex: 1, justifyContent: "center" }}>Calculer</button>
          <button onClick={reset} style={{ ...btn.ghost, padding: "9px 16px" }}>Réinitialiser</button>
        </div>
      </Card>

      {result && (
        <Card style={{ padding: 20 }}>
          <CardLabel>Résultats</CardLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <CalcResult label="Taille de lot" value={result.lotSize} highlight />
            <CalcResult label="Risque en $" value={`$${result.riskUsd}`} color={C.red} />
            {result.rewardUsd && <CalcResult label="Gain potentiel" value={`$${result.rewardUsd}`} color={C.teal} />}
            {result.rratio && <CalcResult label="Ratio R:R" value={`1:${result.rratio}`} color={parseFloat(result.rratio) >= 2 ? C.teal : C.textSecondary} />}
            <CalcResult label="Valeur pip (lot)" value={`$${result.pipValue}`} />
            <CalcResult label="Pip/lot standard" value={`$${result.pipValuePerLot}`} />
          </div>

          {parseFloat(result.rratio) < 1.5 && result.rratio && (
            <div style={{ marginTop: 14, padding: "10px 12px", background: C.redDim, borderRadius: 8, fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 7 }}>
              <AlertCircle size={14} /> Ratio risque/récompense faible — vérifie ton TP avant d'entrer.
            </div>
          )}

          <div style={{ marginTop: 14, padding: "10px 12px", background: C.bg, borderRadius: 8, fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
            Valeurs approximatives basées sur des taux standard. Vérifie toujours la valeur pip exacte de ton broker pour les paires croisées (JPY, CHF, CAD).
          </div>
        </Card>
      )}
    </div>
  );
}

function CalcResult({ label, value, color, highlight }) {
  return (
    <div style={{ padding: "12px 14px", background: highlight ? C.purpleDim : C.bg, borderRadius: 8, border: `1px solid ${highlight ? C.purple : C.border}` }}>
      <div style={{ fontSize: 10.5, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600, marginBottom: 5 }}>{label}</div>
      <div className="tnum" style={{ fontSize: 18, fontWeight: 700, color: color || (highlight ? C.purpleBright : C.text) }}>{value}</div>
    </div>
  );
}

const CORRECT_PIN = "1234"; // PIN par défaut — changeable dans les settings



function PinScreen({ onUnlock, inline = false }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      const saved = (() => { try { return localStorage.getItem("app_pin") || CORRECT_PIN; } catch { return CORRECT_PIN; } })();
      if (next === saved) {
        try { localStorage.setItem("pin_unlocked", "1"); } catch {}
        onUnlock();
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => { setPin(""); setShake(false); }, 600);
      }
    }
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));

  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  if (inline) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 20, animation: shake ? "pinShake 0.4s ease" : "none" }}>
          {[0,1,2,3].map((i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${error ? C.red : C.purple}`, background: pin.length > i ? (error ? C.red : C.purple) : "transparent", transition: "all 0.15s ease" }} />
          ))}
        </div>
        {error && <div style={{ fontSize: 12, color: C.red, marginBottom: 12 }}>Code incorrect</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {digits.map((d, i) => (
            <button key={i} onClick={() => d === "⌫" ? handleDelete() : d !== "" ? handleDigit(d) : null}
              style={{ height: 50, borderRadius: 10, border: `1px solid ${C.sidebarBorder}`, background: d === "" ? "transparent" : "rgba(255,255,255,0.06)", color: d === "⌫" ? C.sidebarTextDim : C.sidebarText, fontSize: d === "⌫" ? 18 : 20, fontWeight: 600, cursor: d === "" ? "default" : "pointer" }}
            >{d}</button>
          ))}
        </div>
        <style>{`@keyframes pinShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.sidebar, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.base }}>
      <div style={{ textAlign: "center", width: 280 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <EmeieksLogo size={72} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.sidebarText, marginBottom: 4, letterSpacing: 1 }}>EMEIEKS TRADE</div>
        <div style={{ fontSize: 13, color: C.sidebarTextDim, marginBottom: 32 }}>Entrez votre code PIN</div>

        {/* Points PIN */}
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 32, animation: shake ? "pinShake 0.4s ease" : "none" }}>
          {[0,1,2,3].map((i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${error ? C.red : C.purple}`, background: pin.length > i ? (error ? C.red : C.purple) : "transparent", transition: "all 0.15s ease" }} />
          ))}
        </div>
        {error && <div style={{ fontSize: 12, color: C.red, marginBottom: 16, marginTop: -20 }}>Code incorrect</div>}

        {/* Clavier */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {digits.map((d, i) => (
            <button key={i} onClick={() => d === "⌫" ? handleDelete() : d !== "" ? handleDigit(d) : null}
              style={{ height: 60, borderRadius: 12, border: `1px solid ${C.sidebarBorder}`, background: d === "" ? "transparent" : "rgba(255,255,255,0.06)", color: d === "⌫" ? C.sidebarTextDim : C.sidebarText, fontSize: d === "⌫" ? 20 : 22, fontWeight: 600, cursor: d === "" ? "default" : "pointer", transition: "background 0.1s" }}
              onMouseDown={(e) => e.currentTarget.style.background = d !== "" ? "rgba(255,255,255,0.12)" : "transparent"}
              onMouseUp={(e) => e.currentTarget.style.background = d !== "" ? "rgba(255,255,255,0.06)" : "transparent"}
            >{d}</button>
          ))}
        </div>
        <div style={{ marginTop: 24, fontSize: 11, color: C.sidebarTextDim }}>PIN par défaut : 1234</div>
      </div>
      <style>{`@keyframes pinShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} }`}</style>
    </div>
  );
}

/* ============================================================================
   SUPABASE CLIENT
   ============================================================================ */
const LS_KEY = "emeieks_trades_v1";
const SUPABASE_URL = "https://ljmmvkwvuzwweitreybh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbW12a3d2dXp3d2VpdHJleWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMDI4OTMsImV4cCI6MjEwMDc3ODg5M30.BfcbAZi2Gqo-BgLg5rQYDjz3xh_We8MReC308hQ5qIE";

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Upload une image vers Supabase Storage et retourne l'URL publique permanente
async function uploadToStorage(file) {
  const ext = file.name ? file.name.split(".").pop() : "jpg";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/trade-screenshots/${filename}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: file,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("Upload Storage échoué : " + err);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/trade-screenshots/${filename}`;
}

// Upload base64 → Storage (pour les captures existantes)


// Convertit un trade React → format base de données
function tradeToDb(t) {
  return {
    id: t.id,
    pair: t.pair,
    direction: t.direction,
    entry_time: t.entryTime,
    entry_price: t.entryPrice ?? null,
    stop_loss: t.stopLoss ?? null,
    take_profit: t.takeProfit ?? null,
    exit_price: t.exitPrice ?? null,
    position_size: t.positionSize ?? null,
    risk_usd: t.riskUsd ?? null,
    result_usd: t.resultUsd ?? null,
    result_pips: t.resultPips ?? null,
    result_r: t.resultR ?? null,
    result_r_manual: t.resultRManual ?? false,
    status: t.status ?? "open",
    notes: t.notes ?? null,
    tags: t.tags ?? [],
    verdict: t.verdict ?? null,
    screenshot_before: t.screenshotBefore ?? null,
    screenshot_after: t.screenshotAfter ?? null,
    dxy_bias: t.dxyBias ?? null,
    dxy_tags: t.dxyTags ?? [],
    dxy_screenshot_before: t.dxyScreenshotBefore ?? null,
    dxy_screenshot_after: t.dxyScreenshotAfter ?? null,
    tf_alignment: t.tfAlignment ?? null,
    tf_alignment_setup: t.tfAlignmentSetup ?? null,
    confidence_level: t.confidenceLevel ?? null,
    ote_fib: t.oteFib ?? null,
    liquidity_sweep: t.liquiditySweep ?? false,
    mss_confirmed: t.mssConfirmed ?? false,
    retro_rating: t.retroRating ?? null,
    retro_note: t.retroNote ?? null,
    account_id: t.accountId ?? null,
    mistakes: t.mistakes ?? [],
    positives: t.positives ?? [],
    rules: t.rules ?? {},
    max_r: t.maxR ?? null,
    ict_model: t.ictModel ?? null,
    htf_bias: t.htfBias ?? null,
    pd_zone: t.pdZone ?? null,
    swept_liquidity: t.sweptLiquidity ?? null,
    draw_on_liquidity: t.drawOnLiquidity ?? null,
    displacement: t.displacement ?? false,
    smt: t.smt ?? false,
  };
}

// Convertit un trade base de données → format React
function dbToTrade(r) {
  return {
    id: r.id,
    accountId: r.account_id || null,
    pair: r.pair,
    direction: r.direction,
    entryTime: r.entry_time,
    entryPrice: r.entry_price,
    stopLoss: r.stop_loss,
    takeProfit: r.take_profit,
    exitPrice: r.exit_price,
    positionSize: r.position_size,
    riskUsd: r.risk_usd,
    resultUsd: r.result_usd,
    resultPips: r.result_pips,
    resultR: r.result_r,
    resultRManual: r.result_r_manual,
    status: r.status,
    notes: r.notes,
    tags: r.tags ?? [],
    verdict: r.verdict,
    screenshotBefore: r.screenshot_before,
    screenshotAfter: r.screenshot_after,
    dxyBias: r.dxy_bias,
    dxyTags: r.dxy_tags ?? [],
    dxyScreenshotBefore: r.dxy_screenshot_before,
    dxyScreenshotAfter: r.dxy_screenshot_after,
    tfAlignment: r.tf_alignment,
    tfAlignmentSetup: r.tf_alignment_setup,
    confidenceLevel: r.confidence_level,
    oteFib: r.ote_fib,
    liquiditySweep: r.liquidity_sweep,
    mssConfirmed: r.mss_confirmed,
    retroRating: r.retro_rating ?? 0,
    retroNote: r.retro_note ?? "",
    mistakes: r.mistakes ?? [],
    positives: r.positives ?? [],
    rules: r.rules ?? {},
    maxR: r.max_r ?? null,
    ictModel: r.ict_model ?? "",
    htfBias: r.htf_bias ?? "",
    pdZone: r.pd_zone ?? "",
    sweptLiquidity: r.swept_liquidity ?? "",
    drawOnLiquidity: r.draw_on_liquidity ?? "",
    displacement: !!r.displacement,
    smt: !!r.smt,
    updatedAt: r.updated_at || 0,
  };
}
function dbToSettings(r) {
  if (!r) return null;
  return {
    accountBalance: r.account_balance ?? 10000,
    currency: r.currency ?? "USD",
    broker: r.broker ?? "ICMarkets",
    pairs: r.pairs ?? ["EURUSD","GBPUSD","XAUUSD","USDJPY","AUDUSD","USDCAD","NZDUSD","GBPJPY"],
    brokers: r.brokers ?? ["ICMarkets","Pepperstone","FTMO","MyForexFunds"],
    customTags: r.custom_tags ?? [],
    hiddenTags: r.hidden_tags ?? [],
    customErrors: r.custom_errors ?? [],
    hiddenErrors: r.hidden_errors ?? [],
    customPositives: r.custom_positives ?? [],
    timeframes: r.timeframes ?? (() => { try { return JSON.parse(localStorage.getItem("emeieks_tfs") || "null"); } catch { return null; } })() ?? DEFAULT_TFS,
  };
}

// ── Écriture Supabase tolérante : si une colonne manque dans la base, on la retire et on réessaie ──
const MISSING_COLS = { trades: new Set(), settings: new Set() };
// Trades supprimés : mémorisés 60 jours pour qu'ils ne réapparaissent jamais (autre appareil, envoi en retard)
const TOMB_KEY = "emeieks_deleted_v1";
function tombGet() { try { const m = JSON.parse(localStorage.getItem(TOMB_KEY) || "{}"); const lim = Date.now() - 60 * 864e5; Object.keys(m).forEach((k) => { if (m[k] < lim) delete m[k]; }); return m; } catch { return {}; } }
function tombAdd(id) { try { const m = tombGet(); m[String(id)] = Date.now(); localStorage.setItem(TOMB_KEY, JSON.stringify(m)); } catch {} }
async function sbWrite(table, path, method, row, prefer) {
  for (let i = 0; i < 8; i++) {
    const body = { ...row };
    MISSING_COLS[table].forEach((c) => delete body[c]);
    try { return await sbFetch(path, { method, prefer, body: JSON.stringify(body) }); }
    catch (e) {
      const m = String(e.message).match(/'([a-z0-9_]+)' column/i);
      if (m && m[1] in body) { MISSING_COLS[table].add(m[1]); console.warn("Colonne absente dans Supabase :", table + "." + m[1]); continue; }
      // Colonne obligatoire laissée vide (ex. trade express sans prix) : on met 0
      const nn = String(e.message).match(/null value in column "([a-z0-9_]+)"/i);
      if (nn && nn[1] in row && row[nn[1]] == null) { row = { ...row, [nn[1]]: 0 }; continue; }
      // Type différent dans la base (ex. updated_at en date) : on retire les colonnes « techniques » une par une
      if (/invalid input syntax|out of range/i.test(String(e.message))) {
        const c = ["updated_at", "account_id", "max_r"].find((k) => k in body);
        if (c) { MISSING_COLS[table].add(c); console.warn("Type incompatible, colonne ignorée :", table + "." + c); continue; }
      }
      throw e;
    }
  }
}
// Réglages : file d'attente locale fusionnée, renvoyée tant que Supabase n'a pas confirmé
const SET_PENDING_KEY = "emeieks_settings_pending_v1";
function setPendGet() { try { return JSON.parse(localStorage.getItem(SET_PENDING_KEY) || "{}"); } catch { return {}; } }
async function saveSettingsPatch(patch) {
  const m = { ...setPendGet(), ...patch };
  try { localStorage.setItem(SET_PENDING_KEY, JSON.stringify(m)); } catch {}
  return flushSettings();
}
let SETTINGS_FLUSHING = null;
async function flushSettings() {
  if (SETTINGS_FLUSHING) return SETTINGS_FLUSHING;
  SETTINGS_FLUSHING = (async () => {
    const m = setPendGet();
    if (!Object.keys(m).length) return true;
    try {
      await sbWrite("settings", "/settings?on_conflict=id", "POST", { id: "main", ...m }, "resolution=merge-duplicates,return=minimal");
      const cur = setPendGet(); Object.keys(m).forEach((k) => { if (JSON.stringify(cur[k]) === JSON.stringify(m[k])) delete cur[k]; });
      try { localStorage.setItem(SET_PENDING_KEY, JSON.stringify(cur)); } catch {}
      return true;
    } catch (e) { console.error("Sync réglages:", e); return false; }
  })();
  try { return await SETTINGS_FLUSHING; } finally { SETTINGS_FLUSHING = null; }
}

// ── File d'attente locale : un trade modifié/supprimé reste ici tant que Supabase n'a pas confirmé ──
const PENDING_KEY = "emeieks_pending_v1";
function pendGet() { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || "{}"); } catch { return {}; } }
function pendSet(m) { try { localStorage.setItem(PENDING_KEY, JSON.stringify(m)); } catch {} }
async function pushTrade(t) {
  const row = { ...tradeToDb(t), updated_at: t.updatedAt || Date.now() };
  await sbWrite("trades", "/trades?on_conflict=id", "POST", row, "resolution=merge-duplicates,return=minimal");
}
async function flushPending() {
  const m = pendGet(); let left = 0;
  for (const id of Object.keys(m)) {
    const x = m[id];
    try {
      if (x._deleted) await sbFetch(`/trades?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
      else await pushTrade(x);
      const cur = pendGet(); if (cur[id] && (cur[id].updatedAt || 0) === (x.updatedAt || 0)) { delete cur[id]; pendSet(cur); }
    } catch { left++; }
  }
  return left;
}

export default function TradingJournalApp() {
  const [view, setView] = useState("dashboard");
  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem("pin_unlocked") === "1"; } catch { return false; }
  });

  // PIN demandé uniquement quand on essaie d'ouvrir le formulaire d'ajout
  const openNewTrade = () => {
    if (!unlocked) {
      setPinTarget("newTrade");
      return;
    }
    setEditingTrade(null);
    setView("tradeForm");
  };
  const [pinTarget, setPinTarget] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);

  // Système multi-comptes
  const [accounts, setAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem("accounts");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeAccountId, setActiveAccountId] = useState(() => {
    try { return localStorage.getItem("activeAccountId") || null; } catch { return null; }
  });
  const switchAccount = (id) => {
    setActiveAccountId(id);
    try { localStorage.setItem("activeAccountId", id); } catch {}
  };
  const saveAccounts = async (newAccounts) => {
    setAccounts(newAccounts);
    try { localStorage.setItem("accounts", JSON.stringify(newAccounts)); } catch {}
    // Sync Supabase
    try {
      await saveSettingsPatch({ accounts: newAccounts });
    } catch (e) { console.error("Erreur sync comptes:", e); }
  };
  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];

  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("theme") !== "light"; } catch { return true; }
  });
  applyTheme(isDark);
  const toggleTheme = () => setIsDark(v => {
    const next = !v;
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
    return next;
  });
  const [appSettings, setAppSettings] = useState({
    accountBalance: 10000,
    currency: "USD",
    broker: "ICMarkets",
    pairs: ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "GBPJPY"],
    brokers: ["ICMarkets", "Pepperstone", "FTMO", "MyForexFunds"],
    customTags: [],
  });
  const [activeTradeId, setActiveTradeId] = useState(null);
  const [editingTrade, setEditingTrade] = useState(null);
  
  const [toast, setToast] = useState(null);

  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Pull initial depuis Supabase + merge par updatedAt ──
  const loadingRef = React.useRef(null);
  const lastSigRef = React.useRef("");
  const loadData = React.useCallback((silent = false) => {
    if (loadingRef.current) return loadingRef.current; // un seul rafraîchissement à la fois
    loadingRef.current = loadDataInner(silent).finally(() => { loadingRef.current = null; });
    return loadingRef.current;
  }, []); // eslint-disable-line
  const loadDataInner = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Charge directement depuis Supabase — source de vérité
      const rows = await sbFetch("/trades?order=entry_time.desc");
      let remote = (rows || []).map(dbToTrade);
      // Un trade supprimé ici qui revient du serveur : on le cache et on relance sa suppression
      const tomb = tombGet();
      const back = remote.filter((t) => tomb[String(t.id)]);
      if (back.length) {
        remote = remote.filter((t) => !tomb[String(t.id)]);
        back.forEach((t) => sbFetch(`/trades?id=eq.${encodeURIComponent(t.id)}`, { method: "DELETE", prefer: "return=minimal" }).catch(() => {}));
      }
      // SÉCURITÉ : base vide mais trades présents sur ce téléphone → on ne les efface jamais,
      // on les renvoie vers Supabase (cas d'un projet en pause, recréé ou d'envois ratés)
      try {
        const local = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
        const backup = JSON.parse(localStorage.getItem(LS_KEY + "_backup") || "[]");
        const mine = local.length ? local : backup;
        if (mine.length && local.length) localStorage.setItem(LS_KEY + "_backup", JSON.stringify(local));
        const remoteIds = new Set(remote.map((t) => String(t.id)));
        const missing = mine.filter((t) => t && t.id != null && !remoteIds.has(String(t.id)) && !tomb[String(t.id)]);
        if (remote.length === 0 && missing.length) {
          const pm = pendGet(); missing.forEach((t) => { if (!pm[t.id]) pm[t.id] = { ...t, updatedAt: t.updatedAt || Date.now() }; }); pendSet(pm);
          console.warn(missing.length + " trade(s) du téléphone renvoyé(s) vers Supabase");
        }
      } catch (e) { console.error("Sauvegarde locale:", e); }
      // Applique les changements locaux pas encore confirmés par Supabase (jamais écrasés par le pull)
      const pend = pendGet();
      Object.keys(pend).forEach((id) => {
        const x = pend[id];
        remote = remote.filter((t) => String(t.id) !== String(id));
        if (!x._deleted) remote.push(x);
      });
      remote.sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));
      // Migration unique : cases « À améliorer / Points positifs / Règles » qui n'existaient que sur ce téléphone
      if (!localStorage.getItem("emeieks_migrated_v1")) try {
        const migrated = [];
        remote = remote.map((t) => {
          const lsNeg = JSON.parse(localStorage.getItem(`ameliorer_${t.id}`) || "null");
          const lsPos = JSON.parse(localStorage.getItem(`positifs_${t.id}`) || "null");
          const rules = {};
          for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(`rules_${t.id}_`)) rules[k.slice(`rules_${t.id}_`.length)] = localStorage.getItem(k); }
          if (!lsNeg && !lsPos && !Object.keys(rules).length) return t;
          const nt = { ...t,
            mistakes: [...new Set([...(t.mistakes || []), ...(lsNeg || [])])],
            positives: [...new Set([...(t.positives || []), ...(lsPos || [])])],
            rules: { ...rules, ...(t.rules || {}) }, updatedAt: Date.now() };
          migrated.push(nt); return nt;
        });
        if (migrated.length) {
          const pm = pendGet(); migrated.forEach((t) => { pm[t.id] = t; }); pendSet(pm);
          const ok = (await flushPending()) === 0;
          if (ok) remote.forEach((t) => { localStorage.removeItem(`ameliorer_${t.id}`); localStorage.removeItem(`positifs_${t.id}`); Object.keys(t.rules || {}).forEach((g) => localStorage.removeItem(`rules_${t.id}_${g}`)); });
        }
        if (!migrated.length || (Object.keys(pendGet()).length === 0)) localStorage.setItem("emeieks_migrated_v1", "1");
      } catch (e) { console.error("Migration locale:", e); }
      // Rien n'a changé depuis le dernier rafraîchissement : on évite un rendu et une grosse écriture locale
      const sig = remote.map((t) => t.id + ":" + (t.updatedAt || "") + ":" + t.status + ":" + t.resultR).join("|");
      const same = sig === lastSigRef.current;
      lastSigRef.current = sig;
      if (!same) setTrades(remote);
      if (Object.keys(pendGet()).length) flushPending();
      // Sauvegarde locale pour fallback offline
      if (!same) try { localStorage.setItem(LS_KEY, JSON.stringify(remote)); } catch {}
      // Settings
      const settingsRows = await sbFetch("/settings?id=eq.main");
      const setPend = setPendGet();
      if ((settingsRows && settingsRows.length > 0) || Object.keys(setPend).length) {
        // Les changements pas encore envoyés gagnent sur la version serveur
        const r = { ...((settingsRows && settingsRows[0]) || {}), ...setPend };
        if (Object.keys(setPend).length) flushSettings();
        if (r.weekly_goals) { try { localStorage.setItem("weekly_goals", JSON.stringify(r.weekly_goals)); } catch {} }
        const s = dbToSettings(r);
        if (s) setAppSettings(s);

        // Comptes
        if (r.accounts && Array.isArray(r.accounts) && r.accounts.length > 0) {
          setAccounts(r.accounts);
          try { localStorage.setItem("accounts", JSON.stringify(r.accounts)); } catch {}
        }

        // Plan de trading
        if (r.trading_plan) {
          try { localStorage.setItem("trading_plan_text", r.trading_plan); } catch {}
        }

        // Logos des actifs
        if (r.pair_logos && typeof r.pair_logos === "object") {
          try { localStorage.setItem(PAIR_LOGO_KEY, JSON.stringify({ ...pairLogosGet(), ...r.pair_logos })); window.dispatchEvent(new Event("pairlogos")); } catch {}
        }
        // Prévisions biais
        if (r.previsions_biases) {
          try { localStorage.setItem("previsions_data", JSON.stringify(r.previsions_biases)); } catch {}
        }

        // News économiques
        if (r.previsions_news) {
          try { localStorage.setItem("previsions_news", JSON.stringify(r.previsions_news)); } catch {}
        }
      }
      setDbError(null);
    } catch (e) {
      console.error("Erreur Supabase:", e);
      // Fallback localStorage si Supabase down
      try {
        const local = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
        if (local.length > 0) { setTrades(local); setDbError("Mode hors ligne — données locales"); }
      } catch {}
    } finally {
      if (!silent) setLoading(false);
    }
  };

  React.useEffect(() => {
    // Pull initial
    loadData();

    // WebSocket Realtime Supabase — sync instantané
    let ws = null;
    let wsReconnectTimer = null;
    let heartbeatTimer = null;

    const connectRealtime = () => {
      try {
        const wsUrl = SUPABASE_URL.replace("https://", "wss://") + "/realtime/v1/websocket?apikey=" + SUPABASE_KEY + "&vsn=1.0.0";
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          ws.send(JSON.stringify({ topic: "realtime:public:trades", event: "phx_join", payload: { config: { postgres_changes: [{ event: "*", schema: "public", table: "trades" }] } }, ref: "1" }));
          heartbeatTimer = setInterval(() => { if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: "hb" })); }, 25000);
        };
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.event === "postgres_changes" || msg.payload?.data?.type) loadData(true);
          } catch {}
        };
        ws.onclose = () => { clearInterval(heartbeatTimer); wsReconnectTimer = setTimeout(connectRealtime, 3000); };
        ws.onerror = () => ws?.close();
      } catch {}
    };

    connectRealtime();

    // Polling fallback 10s
    const interval = setInterval(() => loadData(true), 10000);

    // Refresh au retour sur l'app
    const onVisible = () => { if (document.visibilityState === "visible") loadData(true); };
    document.addEventListener("visibilitychange", onVisible);
    const onFocus = () => loadData(true);
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeatTimer);
      clearTimeout(wsReconnectTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      if (ws) { ws.onclose = null; ws.close(); }
    };
  }, [loadData]);

  // ── Sauvegarde des settings dans Supabase ──
  // Sauvegarde globale vers Supabase (settings + plan + prévisions + comptes)
  

  const saveSettings = async (newSettings) => {
    setAppSettings(newSettings);
    try { if (newSettings.timeframes) localStorage.setItem("emeieks_tfs", JSON.stringify(newSettings.timeframes)); } catch (e) {}
    try {
      await saveSettingsPatch({
          account_balance: newSettings.accountBalance,
          currency: newSettings.currency,
          broker: newSettings.broker,
          pairs: newSettings.pairs,
          brokers: newSettings.brokers,
          custom_tags: newSettings.customTags,
          hidden_tags: newSettings.hiddenTags,
          custom_errors: newSettings.customErrors,
          hidden_errors: newSettings.hiddenErrors,
          custom_positives: newSettings.customPositives,
          timeframes: newSettings.timeframes,
          updated_at: new Date().toISOString(),
      });
    } catch (e) { console.error("Erreur settings:", e); }
  };

  const openEditTrade = (trade) => { setEditingTrade(trade); setView("tradeForm"); };
  const openTradeDetail = (id) => { setActiveTradeId(id); setView("tradeDetail"); };
  const setupOptions = useMemo(() => [...new Set(trades.map((t) => t.setup).filter(Boolean))], [trades]);

  // ── Persistance : local d'abord (file d'attente), puis Supabase ──
  const persist = async (t, quiet = false) => {
    const m = pendGet(); m[t.id] = t; pendSet(m);
    try {
      await pushTrade(t);
      const cur = pendGet(); if (cur[t.id] && cur[t.id].updatedAt === t.updatedAt) { delete cur[t.id]; pendSet(cur); }
    } catch (e) {
      console.error("Erreur sauvegarde trade:", e);
      if (!quiet) showToast("Gardé sur le téléphone — envoi à Supabase au prochain essai", true);
    }
  };
  const tradesRef = React.useRef(trades);
  tradesRef.current = trades;
  const writeLocal = (list) => { try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch {} };

  // ── Sauvegarder un trade (ajout ou modification) ──
  const saveTrade = async (trade) => {
    const now = Date.now();
    const existing = tradesRef.current.find((t) => t.id === trade.id);
    // On garde les champs que le formulaire ne connaît pas (verdict, rétrospective, compte…)
    const merged = { ...(existing || {}), ...trade, accountId: existing?.accountId ?? effectiveAccountId, updatedAt: now };
    const newTrades = existing ? tradesRef.current.map((t) => t.id === trade.id ? merged : t) : [merged, ...tradesRef.current];
    setTrades(newTrades);
    writeLocal(newTrades);
    setActiveTradeId(trade.id);
    setView("tradeDetail");
    showToast(existing ? "Trade mis à jour ✓" : "Trade enregistré ✓");
    persist(merged);
  };

  // ── Modifier quelques champs d'un trade (statut, verdict, rétro) ──
  const retroTimers = React.useRef({});
  const patchTrade = (id, patch, debounce = 0) => {
    const t = tradesRef.current.find((x) => x.id === id);
    if (!t) return;
    const nt = { ...t, ...patch, updatedAt: Date.now() };
    const list = tradesRef.current.map((x) => x.id === id ? nt : x);
    tradesRef.current = list;
    setTrades(list);
    writeLocal(list);
    clearTimeout(retroTimers.current[id]);
    { const m = pendGet(); m[id] = nt; pendSet(m); } // en file tout de suite : un rafraîchissement ne l'efface plus
    if (debounce) retroTimers.current[id] = setTimeout(() => persist(nt, true), debounce);
    else persist(nt);
  };

  // ── Supprimer un trade ──
  const deleteTrade = async (id) => {
    clearTimeout(retroTimers.current[id]);
    const newTrades = tradesRef.current.filter(t => t.id !== id);
    setTrades(newTrades);
    writeLocal(newTrades);
    setView("trades");
    showToast("Trade supprimé");
    tombAdd(id);
    const m = pendGet(); m[id] = { id, _deleted: true, updatedAt: Date.now() }; pendSet(m);
    try {
      await sbFetch(`/trades?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
      const cur = pendGet(); delete cur[id]; pendSet(cur);
    } catch (e) { console.error("Erreur suppression:", e); }
  };

  const updateVerdict = (id, verdict) => patchTrade(id, { verdict });

  // ── Mettre à jour le statut Win/Loss ──
  const updateTradeStatus = (id, newStatus, newResultR) => {
    const t = tradesRef.current.find((x) => x.id === id);
    if (!t) return;
    const updatedR = newResultR !== undefined ? newResultR : t.resultR;
    const updatedUsd = newResultR !== undefined && t.riskUsd ? Math.round(newResultR * t.riskUsd * 100) / 100 : t.resultUsd;
    patchTrade(id, { status: newStatus === "win" || newStatus === "loss" ? "closed" : newStatus, resultR: updatedR, resultUsd: updatedUsd });
  };

  // Filtre trades par compte actif — les autres comptes sont isolés
  const [cumulMode, setCumulMode] = useState(false);
  const effectiveAccountId = activeAccountId || accounts[0]?.id || null;
  const accountTrades = useMemo(() => cumulMode || !effectiveAccountId
    ? trades
    : trades.filter(t => !t.accountId || t.accountId === effectiveAccountId), [trades, cumulMode, effectiveAccountId]);
  const initialBalance = cumulMode
    ? (accounts.reduce((s2, a) => s2 + (Number(a.balance) || 0), 0) || appSettings?.accountBalance || 10000)
    : (Number(activeAccount?.balance) || appSettings?.accountBalance || 10000);
  const currentBalance = useMemo(() => {
    const initial = initialBalance;
    const closed = accountTrades.filter(t => t.status !== "open");
    return initial + closed.reduce((s, t) => s + (t.resultUsd || 0), 0);
  }, [accountTrades, initialBalance]);

  const titles = { dashboard: "Dashboard", trades: "Mes trades", tradeDetail: "Détail du trade", tradeForm: editingTrade ? "Modifier le trade" : "Nouveau trade", stats: "Statistiques", calculator: "Calculatrice", coach: "IA Coach", settings: "Réglages", calendar: "Calendrier" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FONT.base }}>
      <GlobalStyle />
      <Sidebar view={view} setView={setView} onNewTrade={openNewTrade} totalPnl={accountTrades.filter((t) => t.status !== "open").reduce((a, t) => a + (Number(t.resultUsd) || 0), 0)} totalR={accountTrades.filter((t) => t.status !== "open").reduce((a, t) => a + (Number(t.resultR) || 0), 0)} />
      <div style={{ flex: 1, minWidth: 0, maxWidth: "100%", display: "flex", flexDirection: "column" }}>
        <TopBar title={titles[view]} isDark={isDark} onToggleTheme={toggleTheme} onCalendar={() => setView("calendar")} onCoach={() => setView("coach")} accounts={accounts} activeAccountId={activeAccountId} onSwitchAccount={switchAccount} onHome={() => setView("dashboard")} currentBalance={currentBalance} onRefresh={() => loadData(false)} cumulMode={cumulMode} setCumulMode={setCumulMode} />

        {/* Modal PIN — s'affiche uniquement quand on essaie d'ajouter un trade sans être authentifié */}
        {pinTarget && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: C.sidebar, borderRadius: 16, padding: 32, width: 300, textAlign: "center", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <EmeieksLogo size={56} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.sidebarText, marginBottom: 4 }}>Code PIN requis</div>
              <div style={{ fontSize: 12, color: C.sidebarTextDim, marginBottom: 24 }}>Pour ajouter un trade</div>
              <PinScreen onUnlock={() => {
                setUnlocked(true);
                try { localStorage.setItem("pin_unlocked", "1"); } catch {}
                setPinTarget(null);
                if (pinTarget === "newTrade") { setEditingTrade(null); setView("tradeForm"); }
              }} inline />
              <button onClick={() => setPinTarget(null)} style={{ marginTop: 16, background: "none", border: "none", color: C.sidebarTextDim, fontSize: 12, cursor: "pointer" }}>Annuler</button>
            </div>
          </div>
        )}

        {/* Banner Killzone style bourse */}
        <KillzoneBanner />
        {dbError && (
          <div style={{ background: "rgba(220,38,38,0.12)", borderBottom: "1px solid rgba(220,38,38,0.3)", padding: "7px 18px", fontSize: 11.5, color: "#FF6B6B", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <AlertTriangle size={14} /> <span>{dbError}</span>
          </div>
        )}

        <main className="app-main" style={{ flex: 1, minWidth: 0, padding: "22px 16px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 70px)", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.purple, borderRadius: "50%", animation: "spinSlow 0.8s linear infinite" }} />
              <div style={{ fontSize: 13, color: C.textSecondary }}>Chargement de tes trades…</div>
            </div>
          ) : (
            <div style={{ maxWidth: 1600, margin: "0 auto" }}>
              {view === "dashboard" && <Dashboard trades={accountTrades} onOpenTrade={openTradeDetail} setView={setView} onStatusChange={updateTradeStatus} initialBalance={initialBalance} />}
              {view === "trades" && <TradesList trades={accountTrades} onPatch={patchTrade} onOpen={openTradeDetail} onNew={openNewTrade} onStatusChange={updateTradeStatus} onHome={() => setView("dashboard")} />}
              {view === "tradeDetail" && (
                <TradeDetail trade={trades.find((t) => t.id === activeTradeId)} onBack={() => setView("trades")} onEdit={openEditTrade} onDelete={deleteTrade} onVerdictChange={updateVerdict} appSettings={appSettings} onRetroSave={(id, data) => patchTrade(id, data, 800)} onPatch={(id, data) => patchTrade(id, data)} />
              )}
              {view === "tradeForm" && (
                <TradeFormV2 initial={editingTrade} setupOptions={setupOptions} appSettings={{ ...appSettings, accountBalance: currentBalance, activeAccountName: activeAccount?.name, activeAccountColor: activeAccount?.type === "real" ? C.teal : activeAccount?.type === "challenge" ? C.amber : C.purple }} onCancel={() => setView(editingTrade ? "tradeDetail" : "trades")} onSave={saveTrade} trades={accountTrades} />
              )}
              {view === "stats" && <SimpleStats trades={accountTrades} />}
              {view === "calculator" && <ForexCalculator />}
              {view === "plan" && <PlanDeTrading />}
              {view === "previsions" && <Previsions pairs={["DXY", ...(appSettings?.pairs || PAIRS)]} />}
              {view === "coach" && <AiCoach trades={accountTrades} />}
              {view === "settings" && <SettingsPage settings={appSettings} setSettings={saveSettings} accounts={accounts} activeAccountId={activeAccountId} onSaveAccounts={saveAccounts} onSwitchAccount={switchAccount} />}
              {view === "calendar" && <TradingCalendar trades={accountTrades} onSelectDay={() => {}} />}
            </div>
          )}
        </main>
      </div>
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: toast.error ? C.redDim : C.card,
          border: `1px solid ${toast.error ? C.red : C.borderLight}`,
          color: toast.error ? C.red : C.text,
          padding: "10px 18px", borderRadius: 8, fontSize: 12.5,
          boxShadow: "0 12px 32px rgba(0,0,0,0.15)", zIndex: 1000,
          whiteSpace: "nowrap",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
