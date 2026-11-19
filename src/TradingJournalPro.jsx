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
  Crosshair, Slash, Square, Ruler, MoveHorizontal, Baseline, ArrowUpToLine, ArrowDownToLine, Rewind, Undo2, Redo2, Database, CandlestickChart, Play, Pause, StepForward, StepBack, Scissors, SkipForward, Cpu, SeparatorVertical, Radio, Minimize2, Maximize2, Magnet, Copy, EyeOff,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { createChart } from "lightweight-charts";

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
  XAUUSD: [4, 2], XAGUSD: [2, 3], USOIL: [2, 2], UKOIL: [2, 2], BTCUSD: [5, 2], ETHUSD: [4, 2], NAS100: [5, 2], SPX500: [4, 2], US30: [5, 1], GER40: [5, 1], FRA40: [4, 1], UK100: [4, 1],
};
const ALL_INSTRUMENTS = Object.keys(PRICE_FMT);
const PAIR_ALIASES = { NQ: "NAS100", NASDAQ: "NAS100", ES: "SPX500", SP500: "SPX500", GOLD: "XAUUSD", OR: "XAUUSD", SILVER: "XAGUSD", ARGENT: "XAGUSD", OIL: "USOIL", CRUDE: "USOIL", WTI: "USOIL", PETROLE: "USOIL", BRENT: "UKOIL", DAX: "GER40", CAC: "FRA40", FTSE: "UK100", DOW: "US30", YM: "US30", BTC: "BTCUSD", BITCOIN: "BTCUSD", ETH: "ETHUSD", ETHEREUM: "ETHUSD" };
const PAIR_LABEL = { NAS100: "NQ", SPX500: "ES", US30: "Dow", GER40: "DAX", FRA40: "CAC", UK100: "FTSE", USOIL: "Crude oil", UKOIL: "Brent", XAUUSD: "Gold", XAGUSD: "Silver", BTCUSD: "BTC", ETHUSD: "ETH" };
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

function KillzoneBanner({ part = "all" }) {
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
      {part !== "ticker" && newsAlert && (
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

      {/* Ticker killzone : dans la barre du haut, sur la même ligne que le logo */}
      {part !== "news" && <div style={{
        flex: 1, minWidth: 0,
        padding: "0 12px",
        height: 28,
        display: "flex", alignItems: "center", gap: 0,
        overflow: "hidden", whiteSpace: "nowrap",
      }}>
        <div style={{ position: "relative", width: 18, height: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
          {active && <div style={{ position: "absolute", width: 12, height: 12, borderRadius: "50%", background: active.color, opacity: 0.2 }} />}
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? active.color : C.textMuted, flexShrink: 0 }} />
        </div>

        {active ? (
          <>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: active.color, letterSpacing: 0.2, marginRight: 6 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><SessionFlag name={active.name} size={15} />{active.name.toUpperCase()}</span></span>
            <span style={{ fontSize: 11, color: C.sidebarTextDim, marginRight: 10 }}>jusqu'à {active.end}</span>
            <span style={{ fontSize: 10, color: active.color, background: `${active.color}20`, padding: "1px 6px", borderRadius: 3, fontWeight: 700, letterSpacing: 0.5, marginRight: 12 }}>LIVE</span>
            <span className="tnum" style={{ fontSize: 10.5, color: C.sidebarTextDim }}>encore {fmt(minsLeft)}</span>
            {sb && <span style={{ fontSize: 10, color: "#E5E7EB", background: "rgba(255,255,255,0.1)", padding: "1px 6px", borderRadius: 3, fontWeight: 700, marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 3 }}><Zap size={10} /> {sb.name}</span>}
          </>
        ) : next ? (
          <>
            <span style={{ fontSize: 11, color: C.sidebarTextDim, marginRight: 6 }}>Hors killzone</span>
            <span style={{ fontSize: 11, color: C.sidebarTextDim, marginRight: 6 }}>·</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: C.sidebarText, marginRight: 5 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><SessionFlag name={next.name} size={15} />{next.name}</span></span>
            <span style={{ fontSize: 11, color: C.sidebarTextDim, marginRight: 5 }}>à {next.start}</span>
            <span className="tnum" style={{ fontSize: 10.5, color: C.sidebarTextDim, background: "rgba(255,255,255,0.06)", padding: "1px 7px", borderRadius: 3 }}>dans {fmt(minsUntil(next))}</span>
          </>
        ) : isWeekend ? (
          <span style={{ fontSize: 11, color: C.sidebarTextDim }}>Marché fermé — Weekend</span>
        ) : null}

      </div>}
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
    bg: "#07080C", sidebar: "#0B0D13",
    sidebarText: "#F4F5F8", sidebarTextDim: "#7D8293",
    sidebarBorder: "rgba(255,255,255,0.06)", sidebarHover: "rgba(255,255,255,0.05)",
    card: "#0F1118", cardHover: "#151824",
    border: "#1D2030", borderLight: "#2B2F42",
    inputBg: "#0B0D14",
    focusBorder: "#7C6CFF", focusShadow: "0 0 0 3px rgba(124,108,255,0.18)",
    text: "#F4F5F8", textSecondary: "#B6BACA", textMuted: "#7A8095",
    teal: "#34D399", tealDim: "rgba(52,211,153,0.13)",
    red: "#F87171", redDim: "rgba(248,113,113,0.13)",
    purple: "#7C6CFF", purpleDim: "rgba(124,108,255,0.15)", purpleBright: "#A59BFF",
    amber: "#FBBF24", amberDim: "rgba(251,191,36,0.12)",
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
  base: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', sans-serif",
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
      body { color: ${C.text}; background: ${C.bg}; -webkit-font-smoothing: antialiased; }
      body::before { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(90% 50% at 50% -10%, ${C.purpleDim}, transparent 70%); }
      #root > div { position: relative; z-index: 1; }
      h1 { letter-spacing: -0.6px !important; }
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
      .tnum { font-family: 'Inter', -apple-system, sans-serif; font-variant-numeric: tabular-nums; font-feature-settings: "tnum", "cv11"; letter-spacing: -0.01em; }
      @keyframes growX { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      @keyframes growY { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      .grow-x { transform-origin: left center; animation: growX .7s cubic-bezier(.2,.8,.2,1) both; }
      .grow-y { transform-origin: center bottom; animation: growY .6s cubic-bezier(.2,.8,.2,1) both; }
      @media (prefers-reduced-motion: reduce) { .grow-x, .grow-y { animation: none; } }
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
      @media (max-width: 600px) { .hide-sm { display: none !important; } }
      .never { display: none !important; }
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
        .sidebar-spacer { width: 72px !important; }
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
    <div className={hover ? "card-int" : ""} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 30px -18px rgba(0,0,0,0.6)", ...style }} {...rest}>
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
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, color: C.text, letterSpacing: -0.5 }}>{title}</h1>
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
      fontWeight: 600, display: "inline-flex", alignItems: "center", letterSpacing: 0.5,
      background: isLong ? "rgba(45,125,210,0.15)" : "rgba(249,115,22,0.15)",
      color: isLong ? "#2D7DD2" : C.red,
      border: `1px solid ${isLong ? "#2D7DD2" : C.red}33`,
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
const inputStyle = new Proxy({}, { get: (_, k) => getInputStyle()[k], has: (_, k) => k in getInputStyle(), ownKeys: () => Reflect.ownKeys(getInputStyle()), getOwnPropertyDescriptor: (_, k) => ({ enumerable: true, configurable: true, value: getInputStyle()[k] }) });

const btn = {
  get primary() { return { background: C.purple, color: "#fff", border: "none", borderRadius: 7, padding: "9px 15px", fontWeight: 600, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }; },
  get ghost() { return { background: C.card, color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 13px", fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500 }; },
  get icon() { return { background: C.card, color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 7, padding: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }; },
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
   RESSOURCES ICT — la Masterclass complète, lisible dans l'app
   ============================================================================ */

const DgERL = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', liq = 'var(--cds-chart-status-warning)', zone = 'var(--cds-chart-categorical-1)', edge = 'var(--cds-chart-axis)'; return <svg viewBox='0 0 760 300' role='img' aria-label="Le prix va de l'IRL à l'ERL, puis revient à l'IRL" fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Le prix va de l'IRL à l'ERL, puis revient à l'IRL</text><g><rect x='118' y='186' width='520' height='26' fill={zone} fillOpacity='0.14' stroke={zone} strokeWidth='1.25'/><text x='648' y='204' fontSize='11.5' fontWeight='600' fill={zone}>IRL : FVG</text></g><g><line x1='40' x2='250' y1='104' y2='104' stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><text x='40' y='96' fontSize='11.5' fontWeight='600' fill={liq}>ERL : ancien haut (BSL)</text></g><g><line x1='400' x2='700' y1='70' y2='70' stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><text x='700' y='62' textAnchor='end' fontSize='11.5' fontWeight='600' fill={liq}>ERL suivante</text></g><path d='M40 270 L80 236 L110 244 L150 168 L190 128 L230 92 L262 132 L300 198 L332 184 L360 204 L420 128 L470 106 L520 120 L600 64' fill='none' stroke={edge} strokeWidth='2'/><text x='236' y='78' textAnchor='middle' fontSize='12' fill={ink}>1. prend l'ERL</text><text x='330' y='236' textAnchor='middle' fontSize='12' fill={ink}>2. revient dans l'IRL</text><text x='560' y='112' fontSize='12' fill={ink}>3. repart vers l'ERL</text><text x='40' y='290' fontSize='11.5' fill={quiet}>départ : displacement qui laisse le FVG</text></svg>; };

const DgTime = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', grid = 'var(--cds-chart-grid)', edge = 'var(--cds-chart-axis)', c1 = 'var(--cds-chart-categorical-1)', c2 = 'var(--cds-chart-categorical-2)', c3 = 'var(--cds-chart-categorical-3)', warn = 'var(--cds-chart-status-warning)'; const X = h => 150 + ((h - 18 + 24) % 24) * 25.5; const ticks = [18, 20, 22, 0, 2, 4, 6, 8, 10, 12, 14, 16]; const bar = (a, b, y, col) => <rect key={a + '-' + y} x={X(a)} y={y - 10} width={X(b) - X(a)} height='20' rx='4' fill={col} fillOpacity='0.22' stroke={col} strokeWidth='1.25'/>; return <svg viewBox='0 0 760 312' role='img' aria-label='Les fenêtres de la journée' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Pour toi : 14 h – 17 h et 19 h – 23 h, heure de Bangkok</text><g>{ticks.map(h => <g key={h}><line x1={X(h)} x2={X(h)} y1='76' y2='262' stroke={grid}/><text x={X(h)} y='68' textAnchor='middle' fontSize='11' fill={quiet}>{h} h</text><text x={X(h)} y='280' textAnchor='middle' fontSize='11' fill={ink}>{(h + 12) % 24} h</text></g>)}</g><text x='24' y='68' fontSize='11.5' fontWeight='600' fill={quiet}>Heure NY</text><text x='24' y='280' fontSize='11.5' fontWeight='600' fill={ink}>Bangkok (hiver)</text><line x1={X(0)} x2={X(0)} y1='76' y2='262' stroke={edge} strokeWidth='1.25' strokeDasharray='3 3'/><text x={X(0) + 4} y='298' fontSize='11' fill={quiet}>open de minuit</text>{bar(20, 24, 100, c3)}<text x='24' y='104' fill={ink}>Asie</text>{bar(2, 5, 136, c1)}<text x='24' y='140' fill={ink}>London KZ</text>{bar(7, 10, 172, c1)}<text x='24' y='176' fill={ink}>NY AM KZ</text>{bar(3, 4, 208, c2)}{bar(10, 11, 208, c2)}{bar(14, 15, 208, c2)}<text x='24' y='212' fill={ink}>Silver Bullet</text><path d={`M${X(8.5)} 234l7 10l-7 10l-7 -10z`} fill={warn}/>{bar(9.833, 10.167, 244, c3)}{bar(10.833, 11.167, 244, c3)}<text x='24' y='248' fill={ink}>News, macros</text><text x={X(8.5) - 10} y='238' textAnchor='end' fontSize='11' fill={quiet}>8 h 30</text></svg>; };

const DgPO3 = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', liq = 'var(--cds-chart-status-warning)', acc = 'var(--cds-chart-categorical-1)', edge = 'var(--cds-chart-axis)', tint = 'var(--cds-chart-reference-tint)', grid = 'var(--cds-chart-grid)'; const Y = p => 56 + (100 - p) * 3.3, X = i => 40 + i * 20; const K = [[66, 69, 64, 67], [67, 70, 65, 66], [66, 68, 62, 63], [63, 67, 61, 66], [66, 70, 65, 69], [69, 70, 66, 67], [67, 69, 64, 65], [65, 67, 63, 66], [66, 67, 62, 63], [63, 64, 58, 59], [59, 60, 54, 55], [55, 57, 52, 56], [56, 62, 55, 61], [61, 66, 60, 65], [65, 72, 64, 71], [71, 73, 67, 68], [68, 76, 67, 75], [75, 82, 74, 80], [80, 81, 76, 78], [78, 86, 77, 85], [85, 90, 83, 88], [88, 89, 84, 86], [86, 94, 85, 92], [92, 95, 90, 94]]; const c = (x, o, h, l, cl, w) => { const col = cl >= o ? good : bad; return <g key={x}><line x1={x} x2={x} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth='1.5'/><rect x={x - w / 2} y={Y(Math.max(o, cl))} width={w} height={Math.max(2, Y(Math.min(o, cl)) - Y(Math.max(o, cl)))} fill={col} stroke={col}/></g>; }; return <svg viewBox='0 0 760 300' role='img' aria-label='Power of 3' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Power of 3 : la mèche du jour se fait à London, le corps en NY</text><rect x={X(0) - 8} y={Y(70)} width={X(7) - X(0) + 16} height={Y(61) - Y(70)} fill='none' stroke={edge} strokeDasharray='4 3'/><line x1={X(8)} x2='520' y1={Y(66)} y2={Y(66)} stroke={acc} strokeWidth='1.25' strokeDasharray='2 3'/><line x1={X(3)} x2={X(11) + 8} y1={Y(61)} y2={Y(61)} stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><g>{K.map(([o, h, l, cl], i) => c(X(i), o, h, l, cl, 12))}</g><rect x={X(0) - 10} y='252' width={X(8) - X(0)} height='22' rx='4' fill={tint}/><rect x={X(8) - 6} y='252' width={X(14) - X(8) - 4} height='22' rx='4' fill={tint}/><rect x={X(14) - 6} y='252' width={X(23) - X(14) + 16} height='22' rx='4' fill={tint}/><text x={X(3.5)} y='267' textAnchor='middle' fontSize='11.5' fill={ink}>Asie : accumulation</text><text x={X(10.5)} y='267' textAnchor='middle' fontSize='11.5' fill={bad}>London : Judas</text><text x={X(18.5)} y='267' textAnchor='middle' fontSize='11.5' fill={good}>New York : distribution</text><text x='520' y={Y(66) + 16} textAnchor='end' fontSize='11' fill={acc}>open de minuit</text><text x={X(11)} y={Y(52) + 18} textAnchor='middle' fontSize='11' fill={liq}>bas de l'Asie pris</text><line x1='560' x2='560' y1='50' y2='244' stroke={grid}/>{c(620, 66, 95, 52, 94, 30)}<text x='590' y='56' fontSize='12' fontWeight='600' fill={ink}>= la bougie daily</text><text x='644' y={Y(94) + 4} fontSize='11.5' fill={quiet}>close</text><text x='644' y={Y(80) + 4} fontSize='11.5' fill={good}>corps = NY</text><text x='644' y={Y(66) + 4} fontSize='11.5' fill={acc}>open</text><text x='644' y={Y(56) + 4} fontSize='11.5' fill={bad}>mèche = London</text></svg>; };

const DgSwings = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', edge = 'var(--cds-chart-axis)', ith = 'var(--cds-chart-categorical-1)', lth = 'var(--cds-chart-status-warning)'; const P = [[40, 250], [70, 220], [90, 232], [120, 190], [140, 205], [170, 160], [195, 182], [225, 150], [250, 175], [280, 192], [310, 165], [330, 180], [360, 120], [385, 145], [410, 110], [430, 128], [460, 80], [490, 118], [520, 105], [545, 140], [580, 95], [610, 135], [640, 130], [680, 200]]; const d = P.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' '); const sth = [[70, 220], [120, 190], [170, 160], [310, 165], [360, 120], [410, 110], [520, 105], [640, 130]]; return <svg viewBox='0 0 760 300' role='img' aria-label='STH, ITH, LTH' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Un LTH est un ITH entouré de deux ITH plus bas</text><path d={d} fill='none' stroke={edge} strokeWidth='1.75'/><g>{sth.map(([x, y]) => <circle key={x} cx={x} cy={y} r='3.5' fill={quiet}/>)}</g><circle cx='225' cy='150' r='6' fill={ith}/><circle cx='580' cy='95' r='6' fill={ith}/><circle cx='460' cy='80' r='8' fill={lth}/><text x='460' y='62' textAnchor='middle' fontSize='13' fontWeight='600' fill={ink}>LTH</text><text x='225' y='134' textAnchor='middle' fontSize='12' fontWeight='600' fill={ith}>ITH</text><text x='580' y='79' textAnchor='middle' fontSize='12' fontWeight='600' fill={ith}>ITH</text><text x='120' y='176' textAnchor='middle' fontSize='11' fill={quiet}>STH</text><circle cx='32' cy='278' r='3.5' fill={quiet}/><text x='42' y='282' fontSize='11.5' fill={quiet}>STH : swing en 3 bougies</text><circle cx='232' cy='278' r='6' fill={ith}/><text x='244' y='282' fontSize='11.5' fill={quiet}>ITH : STH entouré de 2 STH plus bas</text><circle cx='502' cy='278' r='8' fill={lth}/><text x='516' y='282' fontSize='11.5' fill={quiet}>LTH : ITH entouré de 2 ITH plus bas</text></svg>; };

const DgSweep = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', liq = 'var(--cds-chart-status-warning)', grid = 'var(--cds-chart-grid)'; const Y = p => 70 + (100 - p) * 3.6, XL = i => 44 + i * 24, XR = i => 420 + i * 24; const L = [[80, 82, 74, 76], [76, 78, 66, 68], [68, 72, 60, 70], [70, 76, 69, 74], [74, 75, 66, 67], [67, 69, 60, 62], [62, 66, 61, 64], [64, 65, 61, 62], [62, 66, 52, 64], [64, 74, 63, 73], [73, 82, 72, 80], [80, 90, 79, 88]]; const R = [[80, 82, 74, 76], [76, 78, 66, 68], [68, 72, 60, 70], [70, 76, 69, 74], [74, 75, 66, 67], [67, 69, 60, 62], [62, 66, 61, 64], [64, 65, 61, 62], [62, 63, 53, 54], [54, 58, 52, 57], [57, 58, 50, 51], [51, 56, 50, 55], [55, 59, 54, 57], [57, 58, 49, 50]]; const candle = (x, o, h, l, c) => { const col = c >= o ? good : bad; return <g key={x}><line x1={x} x2={x} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth='1.5'/><rect x={x - 7} y={Y(Math.max(o, c))} width='14' height={Math.max(2, Y(Math.min(o, c)) - Y(Math.max(o, c)))} fill={col} stroke={col}/></g>; }; return <svg viewBox='0 0 760 340' role='img' aria-label='Sweep ou run' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Sweep ou run : tout se joue sur la clôture</text><text x='24' y='56' fontSize='13' fontWeight='600' fill={good}>Sweep : retournement</text><text x='404' y='56' fontSize='13' fontWeight='600' fill={bad}>Run : continuation</text><line x1='388' x2='388' y1='44' y2='326' stroke={grid}/><line x1='30' x2='370' y1={Y(60)} y2={Y(60)} stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><line x1='406' x2='746' y1={Y(60)} y2={Y(60)} stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><g>{L.map(([o, h, l, c], i) => candle(XL(i), o, h, l, c))}</g><g>{R.map(([o, h, l, c], i) => candle(XR(i), o, h, l, c))}</g><text x='30' y={Y(60) - 6} fontSize='11' fill={liq}>equal lows</text><text x='24' y='310' fontSize='11.5' fill={ink}>mèche sous le niveau, clôture au-dessus</text><text x='24' y='326' fontSize='11.5' fill={quiet}>attends le MSS, puis achète</text><text x='404' y='310' fontSize='11.5' fill={ink}>clôture franche sous le niveau</text><text x='404' y='326' fontSize='11.5' fill={quiet}>le retest du niveau tient : la baisse continue</text></svg>; };

const DgFVG = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', zone = 'var(--cds-chart-categorical-1)', grid = 'var(--cds-chart-grid)'; const Y = p => 66 + (100 - p) * 3.4, XL = i => 44 + i * 26, XR = i => 424 + i * 26; const S = [[74, 76, 66, 68], [68, 70, 60, 62], [62, 63, 50, 57], [57, 60, 55, 59], [59, 78, 58, 76], [76, 84, 70, 82], [82, 86, 78, 80], [80, 81, 72, 74], [74, 76, 66, 73], [73, 84, 72, 83], [83, 92, 82, 90], [90, 98, 89, 96]]; const W = [[70, 74, 66, 72], [72, 76, 68, 69], [69, 72, 64, 71], [71, 75, 68, 70], [70, 79, 69, 78], [78, 80, 77, 79], [79, 80, 72, 73], [73, 74, 66, 67], [67, 72, 64, 70], [70, 73, 62, 63], [63, 66, 58, 60], [60, 64, 56, 62]]; const candle = (x, o, h, l, c) => { const col = c >= o ? good : bad; return <g key={x}><line x1={x} x2={x} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth='1.5'/><rect x={x - 8} y={Y(Math.max(o, c))} width='16' height={Math.max(2, Y(Math.min(o, c)) - Y(Math.max(o, c)))} fill={col} stroke={col}/></g>; }; return <svg viewBox='0 0 760 350' role='img' aria-label='FVG fort contre FVG faible' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Le même BISI, deux contextes : seul le premier se trade</text><text x='24' y='56' fontSize='13' fontWeight='600' fill={good}>Gap fort</text><text x='404' y='56' fontSize='13' fontWeight='600' fill={bad}>Gap faible</text><line x1='392' x2='392' y1='44' y2='336' stroke={grid}/><rect x={XL(3) - 10} y={Y(70)} width={372 - XL(3)} height={Y(60) - Y(70)} fill={zone} fillOpacity='0.15' stroke={zone} strokeWidth='1.25'/><line x1={XL(3) - 10} x2='372' y1={Y(65)} y2={Y(65)} stroke={zone} strokeDasharray='4 3'/><rect x={XR(3) - 10} y={Y(77)} width={XR(7) - XR(3) + 10} height={Y(75) - Y(77)} fill={bad} fillOpacity='0.14' stroke={bad} strokeWidth='1.25' strokeDasharray='4 3'/><g>{S.map(([o, h, l, c], i) => candle(XL(i), o, h, l, c))}</g><g>{W.map(([o, h, l, c], i) => candle(XR(i), o, h, l, c))}</g><text x={XL(2)} y={Y(50) + 18} textAnchor='middle' fontSize='11' fill={quiet}>sweep</text><text x='372' y={Y(65) - 4} textAnchor='end' fontSize='11' fill={zone}>CE</text><text x='24' y='318' fontSize='11.5' fill={ink}>né d'un displacement juste après un sweep</text><text x='24' y='334' fontSize='11.5' fill={quiet}>la mèche du retour respecte le CE : achat</text><text x='404' y='318' fontSize='11.5' fill={ink}>petit gap au milieu d'un range, aucun sweep</text><text x='404' y='334' fontSize='11.5' fill={quiet}>une clôture le traverse : pas de trade</text></svg>; };

const DgIFVG = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)'; const Y = p => 48 + (100 - p) * 3.6, X = i => 44 + i * 30; const K = [[60, 64, 58, 63], [63, 66, 61, 65], [65, 82, 64, 80], [80, 86, 74, 84], [84, 90, 83, 88], [88, 92, 84, 85], [85, 86, 76, 77], [77, 78, 68, 70], [70, 71, 60, 62], [62, 64, 58, 60], [60, 68, 59, 67], [67, 72, 66, 69], [69, 70, 60, 61], [61, 62, 52, 54], [54, 56, 46, 48], [48, 50, 42, 44]]; const xr = 520; return <svg viewBox='0 0 760 276' role='img' aria-label='IFVG' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>IFVG : le BISI cassé en clôture devient une résistance</text><rect x={X(1) - 10} y={Y(74)} width={X(8) - X(1) + 10} height={Y(66) - Y(74)} fill={good} fillOpacity='0.14' stroke={good} strokeWidth='1.25'/><rect x={X(8)} y={Y(74)} width={xr - X(8)} height={Y(66) - Y(74)} fill={bad} fillOpacity='0.12' stroke={bad} strokeWidth='1.25' strokeDasharray='5 3'/><g>{K.map(([o, h, l, c], i) => { const col = c >= o ? good : bad; return <g key={i}><line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth='1.5'/><rect x={X(i) - 8} y={Y(Math.max(o, c))} width='16' height={Math.max(2, Y(Math.min(o, c)) - Y(Math.max(o, c)))} fill={col} stroke={col}/></g>; })}</g><text x='30' y={Y(58) + 26} fontSize='12' fontWeight='600' fill={good}>1 · BISI</text><text x={X(8)} y={Y(60) + 22} textAnchor='middle' fontSize='12' fill={ink}>2 · clôture sous le gap</text><text x={X(11)} y={Y(72) - 10} textAnchor='middle' fontSize='12' fill={ink}>3 · retour : rejet</text><text x='536' y={Y(74) + 4} fontSize='12' fontWeight='600' fill={bad}>IFVG baissier</text><text x='536' y={Y(74) + 22} fontSize='11.5' fill={quiet}>vente au retour</text><text x='536' y={Y(74) + 38} fontSize='11.5' fill={quiet}>stop au-dessus de la zone</text></svg>; };

const DgBPR = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', bpr = 'var(--cds-chart-categorical-1)'; const Y = p => 48 + (100 - p) * 4.6, X = i => 50 + i * 36; const K = [[86, 88, 82, 84], [84, 85, 80, 81], [81, 82, 64, 66], [66, 72, 62, 64], [64, 66, 60, 65], [65, 86, 64, 84], [84, 88, 76, 86], [86, 88, 80, 82], [82, 83, 75, 78], [78, 88, 77, 87], [87, 95, 86, 93]]; const xr = 470; return <svg viewBox='0 0 760 272' role='img' aria-label='BPR' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>BPR : la partie commune d'un SIBI puis d'un BISI</text><rect x={X(1) - 10} y={Y(80)} width={xr - X(1) + 10} height={Y(72) - Y(80)} fill={bad} fillOpacity='0.08' stroke={bad} strokeOpacity='0.5'/><rect x={X(4) - 10} y={Y(76)} width={xr - X(4) + 10} height={Y(66) - Y(76)} fill={good} fillOpacity='0.08' stroke={good} strokeOpacity='0.5'/><rect x={X(4) - 10} y={Y(76)} width={xr - X(4) + 10} height={Y(72) - Y(76)} fill={bpr} fillOpacity='0.22' stroke={bpr} strokeWidth='2.5'/><g>{K.map(([o, h, l, c], i) => { const col = c >= o ? good : bad; return <g key={i}><line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth='1.5'/><rect x={X(i) - 9} y={Y(Math.max(o, c))} width='18' height={Math.max(2, Y(Math.min(o, c)) - Y(Math.max(o, c)))} fill={col} stroke={col}/></g>; })}</g><text x='484' y={Y(80) + 4} fontSize='11.5' fill={bad}>SIBI : 1,0872 – 1,0880</text><text x='484' y={Y(74) + 4} fontSize='12' fontWeight='600' fill={bpr}>BPR : 1,0872 – 1,0876 · achat</text><text x='484' y={Y(66) + 4} fontSize='11.5' fill={good}>BISI : 1,0866 – 1,0876</text><text x='484' y={Y(60) + 4} fontSize='11.5' fill={quiet}>le gap le plus récent donne le sens</text></svg>; };

const DgBlocks = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', zone = 'var(--cds-chart-categorical-1)', liq = 'var(--cds-chart-status-warning)', grid = 'var(--cds-chart-grid)'; const Y = (p, oy) => oy + 30 + (100 - p) * 3.6, X = (i, ox) => ox + 22 + i * 22; const candle = (i, ox, oy, o, h, l, c) => { const col = c >= o ? good : bad, x = X(i, ox); return <g key={i}><line x1={x} x2={x} y1={Y(h, oy)} y2={Y(l, oy)} stroke={col} strokeWidth='1.25'/><rect x={x - 6} y={Y(Math.max(o, c), oy)} width='12' height={Math.max(2, Y(Math.min(o, c), oy) - Y(Math.max(o, c), oy))} fill={col} stroke={col}/></g>; }; const box = (i0, ox, oy, lo, hi) => <rect x={X(i0, ox) - 9} y={Y(hi, oy)} width={ox + 340 - X(i0, ox) + 9} height={Y(lo, oy) - Y(hi, oy)} fill={zone} fillOpacity='0.15' stroke={zone} strokeWidth='1.25'/>; const r2 = 296; const OB = [[90, 92, 84, 86], [86, 88, 78, 80], [80, 82, 72, 74], [75, 77, 68, 70], [70, 84, 69, 83], [83, 94, 82, 92], [92, 96, 88, 90], [90, 91, 80, 82], [82, 83, 74, 78], [78, 88, 77, 87], [87, 98, 86, 96]]; const BR = [[84, 86, 74, 76], [76, 78, 64, 66], [66, 74, 65, 72], [72, 80, 71, 78], [78, 79, 70, 71], [71, 72, 62, 64], [64, 65, 57, 60], [60, 70, 59, 69], [69, 79, 68, 78], [78, 86, 77, 84], [84, 85, 76, 79], [79, 90, 78, 89], [89, 96, 88, 94]]; const MI = [[84, 86, 74, 76], [76, 78, 64, 66], [66, 74, 65, 72], [72, 80, 71, 78], [78, 79, 70, 71], [71, 72, 67, 69], [69, 70, 67, 68], [68, 75, 67, 74], [74, 83, 73, 82], [82, 84, 76, 78], [78, 88, 77, 87], [87, 94, 86, 92]]; const RJ = [[90, 92, 82, 84], [84, 86, 76, 78], [78, 80, 70, 72], [72, 74, 66, 70], [70, 72, 56, 69], [69, 71, 58, 70], [70, 80, 69, 78], [78, 88, 77, 86], [86, 88, 78, 80], [80, 81, 70, 72], [72, 74, 62, 71], [71, 82, 70, 81], [81, 92, 80, 90]]; return <svg viewBox='0 0 760 544' role='img' aria-label='Les 4 blocks' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Quatre blocks haussiers : la différence est dans ce qui précède</text><line x1='392' x2='392' y1='48' y2='530' stroke={grid}/><line x1='24' x2='736' y1='286' y2='286' stroke={grid}/><g>{box(3, 24, 48, 68, 77)}{OB.map(([o, h, l, c], i) => candle(i, 24, 48, o, h, l, c))}</g><text x='24' y='60' fontSize='13' fontWeight='600' fill={ink}>Order block</text><text x='24' y='258' fontSize='11.5' fill={ink}>dernière bougie rouge avant la poussée</text><text x='24' y='274' fontSize='11.5' fill={quiet}>retour dans la bougie : achat</text><g>{box(3, 400, 48, 71, 80)}<line x1={X(1, 400)} x2={X(6, 400)} y1={Y(64, 48)} y2={Y(64, 48)} stroke={liq} strokeWidth='1.25' strokeDasharray='5 3'/>{BR.map(([o, h, l, c], i) => candle(i, 400, 48, o, h, l, c))}</g><text x='404' y='60' fontSize='13' fontWeight='600' fill={ink}>Breaker block</text><text x='404' y='258' fontSize='11.5' fill={ink}>le creux précédent est pris, puis le sommet casse</text><text x='404' y='274' fontSize='11.5' fill={quiet}>la bougie verte du sommet devient le support</text><text x={X(1, 400) - 6} y={Y(64, 48) + 16} fontSize='11' fill={liq}>SSL prise</text><g>{box(3, 24, r2, 71, 80)}<line x1={X(1, 24)} x2={X(6, 24)} y1={Y(64, r2)} y2={Y(64, r2)} stroke={quiet} strokeWidth='1.25' strokeDasharray='2 3'/>{MI.map(([o, h, l, c], i) => candle(i, 24, r2, o, h, l, c))}</g><text x='24' y={r2 + 12} fontSize='13' fontWeight='600' fill={ink}>Mitigation block</text><text x='24' y={r2 + 210} fontSize='11.5' fill={ink}>le creux précédent n'est pas pris, le sommet casse</text><text x='24' y={r2 + 226} fontSize='11.5' fill={quiet}>même bougie, signal plus faible</text><text x={X(1, 24) - 6} y={Y(64, r2) + 16} fontSize='11' fill={quiet}>creux non pris</text><g>{box(4, 400, r2, 56, 69)}{RJ.map(([o, h, l, c], i) => candle(i, 400, r2, o, h, l, c))}</g><text x='404' y={r2 + 12} fontSize='13' fontWeight='600' fill={ink}>Rejection block</text><text x='404' y={r2 + 210} fontSize='11.5' fill={ink}>la zone va du bout des mèches au corps le plus bas</text><text x='404' y={r2 + 226} fontSize='11.5' fill={quiet}>retour dans les mèches, clôture au-dessus : achat</text></svg>; };

const DgOTE = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', ote = 'var(--cds-chart-status-warning)', edge = 'var(--cds-chart-axis)'; const Y = p => 52 + (100 - p) * 3.2, X = i => 40 + i * 25; const K = [[70, 72, 62, 64], [64, 66, 56, 58], [58, 60, 48, 50], [50, 52, 40, 44], [44, 46, 34, 38], [38, 40, 30, 36], [36, 48, 35, 47], [47, 60, 46, 58], [58, 72, 57, 70], [70, 80, 69, 78], [78, 86, 76, 84], [84, 90, 82, 88], [88, 89, 80, 82], [82, 84, 74, 76], [76, 77, 64, 66], [66, 68, 56, 58], [58, 60, 47, 55], [55, 66, 54, 65], [65, 78, 64, 76], [76, 88, 75, 86], [86, 96, 85, 94]]; const lv = q => 90 - 60 * q; const xr = 572; return <svg viewBox='0 0 760 300' role='img' aria-label='OTE' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>L'OTE : le retour entre 62 et 79 % de la jambe qui a cassé la structure</text><rect x={X(11)} y={Y(lv(0.62))} width={xr - X(11)} height={Y(lv(0.79)) - Y(lv(0.62))} fill={ote} fillOpacity='0.18'/><g stroke={edge} strokeWidth='1' strokeDasharray='3 4'><line x1={X(5)} x2={xr} y1={Y(90)} y2={Y(90)}/><line x1={X(5)} x2={xr} y1={Y(60)} y2={Y(60)}/><line x1={X(11)} x2={xr} y1={Y(lv(0.705))} y2={Y(lv(0.705))}/><line x1={X(5)} x2={xr} y1={Y(30)} y2={Y(30)}/></g><g>{K.map(([o, h, l, c], i) => { const col = c >= o ? good : bad; return <g key={i}><line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth='1.5'/><rect x={X(i) - 7} y={Y(Math.max(o, c))} width='14' height={Math.max(2, Y(Math.min(o, c)) - Y(Math.max(o, c)))} fill={col} stroke={col}/></g>; })}</g><circle cx={X(16)} cy={Y(lv(0.705))} r='5' fill={good}/><text x='584' y={Y(90) + 4} fontSize='11.5' fill={quiet}>0 % · sommet de la jambe</text><text x='584' y={Y(60) + 4} fontSize='11.5' fill={quiet}>50 % · EQ</text><text x='584' y={Y(lv(0.62)) + 4} fontSize='11.5' fill={ote}>62 %</text><text x='584' y={Y(lv(0.705)) + 4} fontSize='11.5' fontWeight='600' fill={ink}>70,5 % · entrée</text><text x='584' y={Y(lv(0.79)) + 4} fontSize='11.5' fill={ote}>79 %</text><text x='584' y={Y(30) + 4} fontSize='11.5' fill={quiet}>100 % · stop dessous</text><text x={X(8)} y={Y(72) - 10} textAnchor='middle' fontSize='11' fill={quiet}>MSS</text></svg>; };

const DgBias = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', edge = 'var(--cds-chart-axis)', grid = 'var(--cds-chart-grid)'; const cnd = (x, o, h, l, c) => { const col = c < o ? good : bad; return <g><line x1={x} x2={x} y1={h} y2={l} stroke={col} strokeWidth='1.5'/><rect x={x - 12} y={Math.min(o, c)} width='24' height={Math.abs(c - o)} fill={col} stroke={col}/></g>; }; const arrow = (x, y1, y2, col) => <g><line x1={x} x2={x} y1={y1} y2={y2} stroke={col} strokeWidth='2.5'/><path d={y2 < y1 ? `M${x - 7} ${y2 + 10}L${x} ${y2}L${x + 7} ${y2 + 10}z` : `M${x - 7} ${y2 - 10}L${x} ${y2}L${x + 7} ${y2 - 10}z`} fill={col}/></g>; const A = ox => cnd(ox + 44, 160, 110, 170, 120); const lvl = (ox, y) => <line x1={ox + 30} x2={ox + 160} y1={y} y2={y} stroke={edge} strokeDasharray='4 3'/>; return <svg viewBox='0 0 760 316' role='img' aria-label='Biais daily en 4 cas' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Le biais daily : lis la bougie d'hier par rapport à avant-hier</text><line x1='202' x2='202' y1='46' y2='280' stroke={grid}/><line x1='380' x2='380' y1='46' y2='280' stroke={grid}/><line x1='558' x2='558' y1='46' y2='280' stroke={grid}/><g>{lvl(24, 110)}{A(24)}{cnd(24 + 96, 125, 90, 130, 95)}{arrow(24 + 150, 130, 70, good)}</g><g>{lvl(202, 110)}{A(202)}{cnd(202 + 96, 125, 95, 150, 140)}<line x1={298} x2={362} y1='150' y2='150' stroke={bad} strokeDasharray='2 3'/>{arrow(202 + 150, 100, 160, bad)}</g><g>{lvl(380, 170)}{A(380)}{cnd(380 + 96, 150, 145, 190, 185)}{arrow(380 + 150, 160, 225, bad)}</g><g>{lvl(558, 170)}{A(558)}{cnd(558 + 96, 150, 120, 185, 125)}<line x1={654} x2={718} y1='120' y2='120' stroke={good} strokeDasharray='2 3'/>{arrow(558 + 150, 175, 110, good)}</g><text x='24' y='254' fontSize='11.5' fill={ink}>Clôture au-dessus du haut</text><text x='24' y='272' fontSize='12' fontWeight='600' fill={good}>Haussier · haut suivant</text><text x='212' y='254' fontSize='11.5' fill={ink}>Prend le haut, clôture dedans</text><text x='212' y='272' fontSize='12' fontWeight='600' fill={bad}>Baissier · vise le PDL</text><text x='390' y='254' fontSize='11.5' fill={ink}>Clôture sous le bas</text><text x='390' y='272' fontSize='12' fontWeight='600' fill={bad}>Baissier · bas suivant</text><text x='568' y='254' fontSize='11.5' fill={ink}>Prend le bas, clôture dedans</text><text x='568' y='272' fontSize='12' fontWeight='600' fill={good}>Haussier · vise le PDH</text><text x='24' y='300' fontSize='11' fill={quiet}>gauche : avant-hier · droite : hier · flèche : aujourd'hui</text></svg>; };

const DgSMT = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', e = 'var(--cds-chart-categorical-1)', g = 'var(--cds-chart-categorical-2)', grid = 'var(--cds-chart-grid)'; return <svg viewBox='0 0 760 330' role='img' aria-label='SMT' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>SMT haussière : EURUSD fait un nouveau bas, GBPUSD non</text><text x='24' y='64' fontSize='13' fontWeight='600' fill={e}>EURUSD</text><text x='24' y='194' fontSize='13' fontWeight='600' fill={g}>GBPUSD</text><line x1='24' x2='736' y1='174' y2='174' stroke={grid}/><path d='M110 76 L160 120 L200 96 L250 138 L300 108 L350 152 L410 96 L480 84 L560 60' fill='none' stroke={e} strokeWidth='2'/><line x1='250' x2='380' y1='138' y2='138' stroke={quiet} strokeDasharray='4 3'/><circle cx='350' cy='152' r='5' fill={bad}/><path d='M110 206 L160 252 L200 226 L250 272 L300 240 L350 260 L410 222 L480 210 L560 192' fill='none' stroke={g} strokeWidth='2'/><line x1='250' x2='380' y1='272' y2='272' stroke={quiet} strokeDasharray='4 3'/><circle cx='350' cy='260' r='5' fill={good}/><text x='392' y='156' fontSize='11.5' fill={bad}>nouveau bas (sweep)</text><text x='392' y='276' fontSize='11.5' fill={good}>pas de nouveau bas</text><text x='590' y='116' fontSize='11.5' fill={ink}>La baisse ne se confirme</text><text x='590' y='132' fontSize='11.5' fill={ink}>pas sur GBPUSD : cherche</text><text x='590' y='148' fontSize='11.5' fill={ink}>un MSS haussier sur EURUSD</text><text x='24' y='314' fontSize='11.5' fill={quiet}>Avec le DXY, la logique s'inverse : EURUSD fait un nouveau bas pendant que le DXY ne fait pas de nouveau haut.</text></svg>; };

const Dg2022 = () => { const ink = 'var(--cds-text-primary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', liq = 'var(--cds-chart-status-warning)', zone = 'var(--cds-chart-categorical-1)', mk = 'var(--cds-chart-categorical-1)'; const Y = p => 56 + (100 - p) * 4.4, X = i => 40 + i * 25; const K = [[74, 77, 71, 75], [75, 79, 73, 78], [78, 80, 74, 75], [75, 76, 69, 70], [70, 73, 66, 72], [72, 76, 71, 74], [74, 75, 70, 71], [71, 72, 67, 68], [68, 69, 63, 64], [64, 65, 58, 62], [62, 64, 59, 63], [63, 80, 62, 78], [78, 84, 72, 82], [82, 85, 79, 80], [80, 81, 73, 74], [74, 75, 68, 71], [71, 79, 70, 78], [78, 86, 77, 85], [85, 92, 84, 91], [91, 97, 90, 96]]; const dot = (x, y, n) => <g key={n}><circle cx={x} cy={y} r='10' fill={mk}/><text x={x} y={y + 4} textAnchor='middle' fontSize='11' fontWeight='700' fill='#fff'>{n}</text></g>; return <svg viewBox='0 0 760 300' role='img' aria-label='2022 model' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Le 2022 model : raid, MSS, retour dans le FVG</text><line x1={X(0)} x2='530' y1={Y(95)} y2={Y(95)} stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><line x1={X(4)} x2={X(9) + 8} y1={Y(66)} y2={Y(66)} stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><line x1={X(5)} x2={X(11) + 8} y1={Y(76)} y2={Y(76)} stroke={good} strokeWidth='1.25' strokeDasharray='4 3'/><rect x={X(10) - 9} y={Y(72)} width={X(16) - X(10) + 18} height={Y(64) - Y(72)} fill={zone} fillOpacity='0.15' stroke={zone} strokeWidth='1.25'/><line x1={X(15)} x2='530' y1={Y(68)} y2={Y(68)} stroke={ink} strokeWidth='1.25'/><line x1={X(15)} x2='530' y1={Y(57)} y2={Y(57)} stroke={bad} strokeWidth='1.25'/><g>{K.map(([o, h, l, c], i) => { const col = c >= o ? good : bad; return <g key={i}><line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth='1.5'/><rect x={X(i) - 7} y={Y(Math.max(o, c))} width='14' height={Math.max(2, Y(Math.min(o, c)) - Y(Math.max(o, c)))} fill={col} stroke={col}/></g>; })}</g><g>{dot(X(4), Y(66) + 22, 1)}{dot(X(9), Y(58) + 22, 2)}{dot(X(11), Y(80) - 18, 3)}{dot(X(15) + 14, Y(68) + 22, 4)}{dot(X(19), Y(97) - 16, 5)}</g><text x='560' y='120' fontSize='12' fill={ink}>1 · SSL sous le bas de l'Asie</text><text x='560' y='144' fontSize='12' fill={ink}>2 · Raid à London</text><text x='560' y='168' fontSize='12' fill={ink}>3 · MSS avec displacement</text><text x='560' y='192' fontSize='12' fill={ink}>4 · Achat au CE du FVG</text><text x='560' y='216' fontSize='12' fill={ink}>5 · Cible : le PDH, 2,5R</text><text x='560' y={Y(57) + 4} fontSize='11.5' fill={bad}>stop sous le raid</text><text x='560' y={Y(95) + 4} fontSize='11.5' fill={liq}>draw : PDH (BSL)</text></svg>; };

const DgSilver = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', liq = 'var(--cds-chart-status-warning)', zone = 'var(--cds-chart-categorical-1)', tint = 'var(--cds-chart-reference-tint)'; const Y = p => 52 + (100 - p) * 4.6, X = i => 36 + i * 22; const K = [[78, 82, 76, 80], [80, 84, 79, 83], [83, 86, 81, 82], [82, 83, 76, 77], [77, 78, 71, 72], [72, 74, 68, 73], [73, 77, 72, 76], [76, 78, 74, 75], [75, 76, 72, 73], [73, 75, 71, 74], [74, 76, 72, 73], [73, 74, 70, 71], [71, 72, 66, 67], [67, 68, 64, 66], [66, 71, 65, 70], [70, 79, 69, 78], [78, 82, 75, 81], [81, 82, 77, 78], [78, 79, 73, 76], [76, 80, 75, 79], [79, 83, 78, 82], [82, 85, 81, 84], [84, 87, 83, 86], [86, 87, 83, 84]]; return <svg viewBox='0 0 760 300' role='img' aria-label='Silver Bullet' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Silver Bullet : le FVG doit naître dans la fenêtre d'une heure</text><rect x={X(12) - 11} y='44' width={X(23) - X(12) + 22} height='210' fill={tint}/><line x1={X(2)} x2={X(23) + 11} y1={Y(86)} y2={Y(86)} stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><line x1={X(5)} x2={X(12) + 8} y1={Y(68)} y2={Y(68)} stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><rect x={X(14) - 9} y={Y(75)} width={X(23) - X(14) + 20} height={Y(71) - Y(75)} fill={zone} fillOpacity='0.16' stroke={zone} strokeWidth='1.25'/><g>{K.map(([o, h, l, c], i) => { const col = c >= o ? good : bad; return <g key={i}><line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth='1.5'/><rect x={X(i) - 6} y={Y(Math.max(o, c))} width='12' height={Math.max(2, Y(Math.min(o, c)) - Y(Math.max(o, c)))} fill={col} stroke={col}/></g>; })}</g><text x={X(12) - 11} y='270' textAnchor='middle' fontSize='11.5' fontWeight='600' fill={ink}>10 h</text><text x={X(23) + 11} y='270' textAnchor='middle' fontSize='11.5' fontWeight='600' fill={ink}>11 h</text><text x={X(17.5)} y='288' textAnchor='middle' fontSize='11' fill={quiet}>22 h – 23 h à Bangkok</text><text x='580' y={Y(86) + 4} fontSize='11.5' fill={liq}>cible : BSL</text><text x='580' y={Y(73) + 4} fontSize='11.5' fill={zone}>FVG dans la fenêtre</text><text x={X(5) - 10} y={Y(68) + 18} fontSize='11' fill={liq}>SSL repérée avant 10 h</text><text x='580' y='212' fontSize='11.5' fill={ink}>Pas de FVG avant 11 h</text><text x='580' y='228' fontSize='11.5' fill={ink}>= pas de trade</text></svg>; };

const DgUnicorn = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', liq = 'var(--cds-chart-status-warning)', brk = 'var(--cds-chart-categorical-4)', fvg = 'var(--cds-chart-categorical-1)'; const Y = p => 50 + (100 - p) * 4.4, X = i => 44 + i * 30; const K = [[80, 82, 72, 74], [74, 76, 64, 66], [66, 74, 65, 72], [72, 79, 71, 78], [78, 79, 70, 71], [71, 72, 62, 63], [63, 64, 56, 58], [58, 66, 57, 65], [65, 72, 64, 71], [71, 88, 70, 86], [86, 90, 80, 88], [88, 89, 82, 83], [83, 84, 76, 78], [78, 86, 77, 85], [85, 94, 84, 92], [92, 99, 91, 97]]; const xr = 540; return <svg viewBox='0 0 760 280' role='img' aria-label='Unicorn' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>L'Unicorn : on achète la zone commune du breaker et du FVG</text><rect x={X(4) - 10} y={Y(79)} width={xr - X(4) + 10} height={Y(70) - Y(79)} fill={brk} fillOpacity='0.12' stroke={brk} strokeWidth='1.25'/><rect x={X(8) - 10} y={Y(80)} width={xr - X(8) + 10} height={Y(72) - Y(80)} fill={fvg} fillOpacity='0.12' stroke={fvg} strokeWidth='1.25'/><rect x={X(8) - 10} y={Y(79)} width={xr - X(8) + 10} height={Y(72) - Y(79)} fill='none' stroke={good} strokeWidth='2.5'/><line x1={X(1)} x2={X(6) + 10} y1={Y(64)} y2={Y(64)} stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><g>{K.map(([o, h, l, c], i) => { const col = c >= o ? good : bad; return <g key={i}><line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth='1.5'/><rect x={X(i) - 8} y={Y(Math.max(o, c))} width='16' height={Math.max(2, Y(Math.min(o, c)) - Y(Math.max(o, c)))} fill={col} stroke={col}/></g>; })}</g><text x='552' y={Y(70) + 4} fontSize='11.5' fill={brk}>Breaker : 1,0870 – 1,0879</text><text x='552' y={Y(80) + 4} fontSize='11.5' fill={fvg}>FVG : 1,0872 – 1,0880</text><text x='552' y={Y(75.5) + 4} fontSize='12' fontWeight='600' fill={good}>Unicorn : 1,0872 – 1,0879</text><text x={X(1) - 8} y={Y(64) + 18} fontSize='11' fill={liq}>SSL prise</text><text x='552' y={Y(62) + 4} fontSize='11.5' fill={quiet}>stop sous le sweep</text></svg>; };

const DgTurtle = () => { const ink = 'var(--cds-text-primary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', liq = 'var(--cds-chart-status-warning)'; const Y = p => 50 + (100 - p) * 5, X = i => 44 + i * 30; const K = [[70, 74, 68, 73], [73, 80, 72, 79], [79, 88, 78, 85], [85, 86, 78, 80], [80, 82, 74, 76], [76, 80, 75, 79], [79, 84, 78, 83], [83, 87, 82, 86], [86, 93, 85, 87], [87, 88, 80, 81], [81, 82, 73, 74], [74, 79, 73, 78], [78, 80, 77, 79], [79, 80, 70, 71], [71, 72, 64, 66], [66, 67, 58, 60]]; return <svg viewBox='0 0 760 280' role='img' aria-label='Turtle Soup' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Turtle Soup : le breakout du PDH échoue, on vend</text><line x1={X(2)} x2={X(8) + 20} y1={Y(88)} y2={Y(88)} stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><line x1={X(4)} x2={X(10) + 10} y1={Y(74)} y2={Y(74)} stroke={bad} strokeWidth='1.25' strokeDasharray='4 3'/><line x1={X(12)} x2='540' y1={Y(79)} y2={Y(79)} stroke={ink} strokeWidth='1.25'/><line x1={X(12)} x2='540' y1={Y(94)} y2={Y(94)} stroke={bad} strokeWidth='1.25'/><line x1={X(12)} x2='540' y1={Y(60)} y2={Y(60)} stroke={good} strokeWidth='1.25'/><g>{K.map(([o, h, l, c], i) => { const col = c >= o ? good : bad; return <g key={i}><line x1={X(i)} x2={X(i)} y1={Y(h)} y2={Y(l)} stroke={col} strokeWidth='1.5'/><rect x={X(i) - 8} y={Y(Math.max(o, c))} width='16' height={Math.max(2, Y(Math.min(o, c)) - Y(Math.max(o, c)))} fill={col} stroke={col}/></g>; })}</g><text x={X(2) - 8} y={Y(88) - 8} fontSize='11.5' fill={liq}>PDH</text><text x={X(8)} y={Y(93) - 10} textAnchor='middle' fontSize='11.5' fill={ink}>1 · faux breakout</text><text x={X(7)} y={Y(74) + 18} textAnchor='middle' fontSize='11.5' fill={ink}>2 · MSS baissier</text><text x='556' y={Y(94) + 4} fontSize='11.5' fill={bad}>stop au-dessus de la mèche</text><text x='556' y={Y(79) + 4} fontSize='11.5' fontWeight='600' fill={ink}>3 · vente au retour</text><text x='556' y={Y(60) + 4} fontSize='11.5' fill={good}>cible : SSL suivante</text></svg>; };

const DgMMBM = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', bad = 'var(--cds-chart-status-critical)', liq = 'var(--cds-chart-status-warning)', edge = 'var(--cds-chart-axis)', zone = 'var(--cds-chart-categorical-1)'; return <svg viewBox='0 0 760 300' role='img' aria-label='MMBM' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Le MMBM : le prix revient chercher la liquidité qu'il a laissée en haut</text><line x1='40' x2='680' y1='78' y2='78' stroke={liq} strokeWidth='1.25' strokeDasharray='6 3'/><text x='200' y='70' fontSize='11.5' fill={liq}>BSL au-dessus de la consolidation : la cible</text><rect x='36' y='84' width='138' height='34' rx='4' fill='none' stroke={edge} strokeDasharray='4 3'/><rect x='366' y='244' width='80' height='20' fill={zone} fillOpacity='0.16' stroke={zone}/><g fill='none' strokeWidth='2'><path d='M40 100 L70 112 L100 90 L130 108 L160 92 L174 100' stroke={edge}/><path d='M174 100 L200 132 L220 124 L250 162 L270 152 L300 192 L320 182 L350 226 L370 216 L400 252' stroke={bad}/><path d='M400 252 L430 214 L450 224 L480 184 L500 194 L530 150 L550 160 L580 116 L600 126 L650 64' stroke={good}/></g><text x='105' y='138' textAnchor='middle' fontSize='12' fill={ink}>1. Consolidation de départ</text><text x='196' y='222' fontSize='12' fill={bad}>2. Programme de vente</text><text x='196' y='238' fontSize='11' fill={quiet}>il laisse des SIBI à chaque palier</text><text x='406' y='282' textAnchor='middle' fontSize='12' fill={ink}>3. Retournement : sweep + MSS sur un PD array HTF</text><text x='600' y='196' fontSize='12' fill={good}>4. Programme d'achat</text><text x='600' y='212' fontSize='11' fill={quiet}>les SIBI cassés servent</text><text x='600' y='226' fontSize='11' fill={quiet}>de supports (IFVG)</text></svg>; };

const DgWeekly = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', liq = 'var(--cds-chart-status-warning)', grid = 'var(--cds-chart-grid)', edge = 'var(--cds-chart-axis)'; const D = (ox, k) => ox + 24 + k * 46; const days = ox => [0, 1, 2, 3, 4].map(k => <line key={k} x1={D(ox, k)} x2={D(ox, k)} y1='60' y2='232' stroke={grid}/>); return <svg viewBox='0 0 760 280' role='img' aria-label='Weekly profiles' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>Weekly profiles haussiers : où se fait le bas de la semaine</text><g>{days(24)}<path d={`M${D(24, 0)} 150 L${D(24, 0) + 20} 172 L${D(24, 1)} 186 L${D(24, 1) + 14} 204 L${D(24, 2)} 160 L${D(24, 3)} 124 L${D(24, 4)} 92`} fill='none' stroke={good} strokeWidth='2'/><circle cx={D(24, 1) + 14} cy='204' r='5' fill={liq}/></g><g>{days(270)}<path d={`M${D(270, 0)} 150 L${D(270, 0) + 20} 138 L${D(270, 1)} 160 L${D(270, 1) + 20} 142 L${D(270, 2)} 156 L${D(270, 2) + 14} 210 L${D(270, 3)} 130 L${D(270, 4)} 86`} fill='none' stroke={good} strokeWidth='2'/><circle cx={D(270, 2) + 14} cy='210' r='5' fill={liq}/></g><g>{days(516)}<path d={`M${D(516, 0)} 150 L${D(516, 0) + 20} 132 L${D(516, 1)} 158 L${D(516, 1) + 20} 136 L${D(516, 2)} 160 L${D(516, 2) + 20} 140 L${D(516, 3)} 150 L${D(516, 3) + 12} 210 L${D(516, 4)} 110`} fill='none' stroke={good} strokeWidth='2'/><circle cx={D(516, 3) + 12} cy='210' r='5' fill={liq}/></g><line x1='258' x2='258' y1='48' y2='266' stroke={edge} strokeOpacity='0.3'/><line x1='504' x2='504' y1='48' y2='266' stroke={edge} strokeOpacity='0.3'/><text x='24' y='56' fontSize='12.5' fontWeight='600' fill={ink}>Classic Tuesday low</text><text x='270' y='56' fontSize='12.5' fontWeight='600' fill={ink}>Wednesday reversal</text><text x='516' y='56' fontSize='12.5' fontWeight='600' fill={ink}>Thursday reversal</text><text x={D(24, 0)} y='248' textAnchor='middle' fontSize='11' fill={quiet}>L</text><text x={D(24, 1)} y='248' textAnchor='middle' fontSize='11' fill={quiet}>M</text><text x={D(24, 2)} y='248' textAnchor='middle' fontSize='11' fill={quiet}>M</text><text x={D(24, 3)} y='248' textAnchor='middle' fontSize='11' fill={quiet}>J</text><text x={D(24, 4)} y='248' textAnchor='middle' fontSize='11' fill={quiet}>V</text><text x='24' y='268' fontSize='11.5' fill={quiet}>bas lundi ou mardi, tendance</text><text x='270' y='268' fontSize='11.5' fill={quiet}>range, sweep mercredi</text><text x='516' y='268' fontSize='11.5' fill={quiet}>range, sweep jeudi (news)</text></svg>; };

const DgIPDA = () => { const ink = 'var(--cds-text-primary)', quiet = 'var(--cds-text-secondary)', good = 'var(--cds-chart-status-good)', c1 = 'var(--cds-chart-categorical-1)', c2 = 'var(--cds-chart-categorical-2)', c3 = 'var(--cds-chart-categorical-3)', edge = 'var(--cds-chart-axis)'; return <svg viewBox='0 0 760 300' role='img' aria-label='IPDA' fontSize='13'><text x='24' y='28' fontSize='15' fontWeight='600' fill={ink}>IPDA : trois ranges, un seul prix à lire</text><rect x='40' y='80' width='560' height='155' fill='none' stroke={c3} strokeWidth='1.25'/><rect x='227' y='80' width='373' height='135' fill='none' stroke={c2} strokeWidth='1.25' strokeDasharray='6 3'/><rect x='413' y='150' width='187' height='65' fill={c1} fillOpacity='0.08' stroke={c1} strokeWidth='2'/><line x1='413' x2='600' y1='182' y2='182' stroke={c1} strokeDasharray='4 3'/><path d='M40 90 L100 150 L150 235 L220 170 L270 80 L330 140 L380 110 L430 190 L480 215 L530 150 L600 200' fill='none' stroke={edge} strokeWidth='2'/><circle cx='600' cy='200' r='5' fill={good}/><text x='44' y='74' fontSize='11.5' fontWeight='600' fill={c3}>60 jours : la grande liquidité</text><text x='596' y='74' textAnchor='end' fontSize='11.5' fontWeight='600' fill={c2}>40 jours : le contexte</text><text x='417' y='144' fontSize='11.5' fontWeight='600' fill={c1}>20 jours</text><text x='614' y='186' fontSize='11.5' fill={c1}>EQ 20 jours</text><text x='614' y='206' fontSize='11.5' fontWeight='600' fill={good}>prix : discount</text><text x='614' y='222' fontSize='11.5' fill={quiet}>→ cherche des achats</text><text x='40' y='262' fontSize='11.5' fill={quiet}>il y a 60 jours</text><text x='600' y='262' textAnchor='end' fontSize='11.5' fill={quiet}>aujourd'hui</text><text x='24' y='288' fontSize='11.5' fill={quiet}>Trace-les sur le daily : plus haut et plus bas des 20, 40 et 60 dernières bougies.</text></svg>; };

/* Contenu : chaque bloc = { h: titre, d: schéma, b: puces, t: tableau [en-têtes, ...lignes], c: liste à cocher, n: note } */
const ICT_SECTIONS = [
  { id: "logique", title: "1 · La logique", blocks: [
    { d: DgERL, b: ["**ERL** = stops au-delà des extrêmes (PDH, PDL, equal highs/lows).", "**IRL** = trous à l'intérieur (FVG, OB).", "**Le cycle** : IRL → ERL → IRL → ERL.", "**Règle d'or** : achète en discount, vends en premium. Jamais l'inverse."] },
    { h: "La matrice des PD arrays", t: [["Ordre", "Premium : pour vendre", "Discount : pour acheter"], ["1 · le plus loin de l'EQ", "Ancien sommet, BSL", "Ancien creux, SSL"], ["2", "Rejection block baissier", "Rejection block haussier"], ["3", "Order block baissier", "Order block haussier"], ["4", "SIBI", "BISI"], ["5", "Liquidity void", "Liquidity void"], ["6", "Breaker baissier", "Breaker haussier"], ["7 · le plus proche de l'EQ", "Mitigation baissier", "Mitigation haussier"]] },
  ] },
  { id: "temps", title: "2 · Le temps", blocks: [
    { d: DgTime, b: ["**Tes fenêtres (Bangkok)** : 14 h – 17 h (London) et 19 h – 23 h (NY). De mars à novembre : une heure plus tôt.", "**Macros** : 21 h 50 – 22 h 10 et 22 h 50 – 23 h 10.", "**Nouvelles US** : 20 h 30. Rien d'ouvert 10 min avant."] },
    { d: DgPO3, b: ["**Jour haussier** : achète **sous** l'open de minuit.", "**Jour baissier** : vends **au-dessus**.", "**Judas** : ne trade pas la cassure de l'Asie. Trade son échec."] },
    { h: "Les macros", t: [["Macro", "NY", "Bangkok (hiver)"], ["London 1", "2 h 33 – 3 h 00", "14 h 33 – 15 h 00"], ["London 2", "4 h 03 – 4 h 30", "16 h 03 – 16 h 30"], ["Pré-marché", "8 h 50 – 9 h 10", "20 h 50 – 21 h 10"], ["NY 1", "9 h 50 – 10 h 10", "21 h 50 – 22 h 10"], ["NY 2", "10 h 50 – 11 h 10", "22 h 50 – 23 h 10"]], n: "Dans une macro, le prix va souvent chercher une liquidité proche ou remplir un FVG." },
  ] },
  { id: "structure", title: "3 · La structure", blocks: [
    { d: DgSwings, b: ["**Swing** = 3 bougies. Le haut du milieu dépasse ses deux voisines.", "**BOS** = clôture au-delà d'un swing, dans la tendance. Ça continue.", "**MSS** = clôture au-delà du dernier swing, contre la tendance. Ça tourne."] },
    { h: "Un MSS ne compte que si :", c: ["Une liquidité vient d'être prise juste avant", "La cassure est une clôture, pas une mèche", "Il laisse un FVG (displacement)", "Il casse un ITH, pas un simple STH"] },
  ] },
  { id: "liquidite", title: "4 · La liquidité", blocks: [
    { d: DgSweep, b: ["**Les aimants, du plus fort au plus faible** : haut/bas de la semaine → PDH/PDL → equal highs/lows → haut/bas de l'Asie → simple swing.", "**Sweep** = mèche au-delà, clôture de retour → cherche l'autre sens.", "**Run** = clôture franche au-delà → la tendance continue.", "**Le sweep devient un trade seulement après le MSS.**", "Pas de prix précis pour ta cible = pas de biais = pas de trade."] },
  ] },
  { id: "gaps", title: "5 · Les gaps", blocks: [
    { h: "FVG (BISI / SIBI)", d: DgFVG, b: ["**BISI** : bas de la bougie 3 > haut de la bougie 1. **SIBI** : l'inverse.", "**CE** = milieu. Les corps ne doivent pas clôturer au-delà.", "**Entrée** : haut du gap (rempli souvent) ou CE (meilleur ratio).", "**Stop** : derrière la bougie 1."], n: "Un gap se trade s'il coche au moins 5 cases : né d'un displacement · après un sweep · dans le sens du biais · du bon côté de l'EQ · jamais touché · en confluence (OB, OTE) · visible en 1H ou 4H." },
    { h: "IFVG", d: DgIFVG, b: ["Gap **cassé en clôture** = il change de camp.", "Plus fort si la cassure suit un sweep du côté opposé.", "Invalide si le prix reclôture de l'autre côté."] },
    { h: "BPR", d: DgBPR, b: ["Zone très réactive : déséquilibrée dans les deux sens.", "**Stop** sous le bas du BISI, pas sous le BPR (trop serré)."] },
    { h: "Les autres gaps", t: [["Zone", "Repère", "Usage"], ["Volume imbalance", "Corps qui ne se touchent pas, mèches qui se chevauchent", "Petite zone, souvent comblée vite"], ["Liquidity void", "Grande bougie sans retour", "Le prix la retraverse souvent en entier"], ["NWOG", "Clôture vendredi → ouverture dimanche (17 h NY)", "Bords et CE = supports et cibles. Garde les 5 derniers"], ["NDOG", "Le même chaque jour au rollover de 17 h NY", "Se comble en 1 ou 2 sessions"]] },
  ] },
  { id: "blocks", title: "6 · Les blocks", blocks: [
    { d: DgBlocks, t: [["Block", "La question qui le définit", "Entrée", "Invalide si"], ["Order block", "Dernière bougie opposée avant un displacement qui casse la structure ?", "Haut de l'OB ou son milieu", "Clôture sous l'OB"], ["Breaker", "Le creux précédent a été pris, puis le sommet casse ?", "Retour dans la bougie du sommet", "Clôture sous le breaker"], ["Mitigation", "Le creux précédent n'a pas été pris, puis le sommet casse ?", "Pareil, taille réduite", "Clôture sous la zone"], ["Rejection", "Une mèche a pris un niveau et clôturé de retour ?", "Retour dans la mèche, clôture qui tient", "Clôture au-delà du bout de la mèche"], ["Propulsion", "Dernière bougie opposée du pullback après un BOS ?", "Ajout dans la tendance", "Clôture sous le block"]], b: ["Pas de FVG après l'OB = pas d'OB.", "Doute entre breaker et mitigation = ne trade aucun des deux."] },
  ] },
  { id: "ote", title: "7 · Premium, discount, OTE", blocks: [
    { d: DgOTE, b: ["**EQ** = 50 % du range. Dessus : premium (vends). Dessous : discount (achète).", "**OTE** = 62 – 79 % de la jambe du MSS. Ordre à **70,5 %**, stop sous 100 %.", "**Cibles** : projette la jambe du Judas. **−1** = partiel, **−2** = cible, **−2,5** = extension.", "Une projection qui tombe sur un PDH = cible solide."] },
    { h: "Les zones du range", t: [["Zone", "Position", "Action"], ["Premium extrême", "75 – 100 %", "Chercher des ventes"], ["Premium", "50 – 75 %", "Vendre seulement avec confirmation"], ["Discount", "25 – 50 %", "Acheter seulement avec confirmation"], ["Discount extrême", "0 – 25 %", "Chercher des achats"]] },
  ] },
  { id: "biais", title: "8 · Le biais", blocks: [
    { d: DgBias, b: ["**Inside day** (rien de pris hier) = neutre. Attends que London prenne un côté.", "**Confirmation** : le FVG daily le plus proche tient en clôture.", "**Fixe ton biais avant London.** Tu ne le changes que si le FVG daily casse."] },
    { h: "IPDA 20 / 40 / 60 jours", d: DgIPDA, b: ["**20 jours** : premium ou discount aujourd'hui.", "**40 jours** : n'achète pas dans son premium.", "**60 jours** : la liquidité visée sur plusieurs semaines."] },
    { h: "Weekly profiles", d: DgWeekly, b: ["Semaine haussière : le bas se fait **lundi – mercredi**, à London ou NY.", "Rien de clair après mercredi = réduis ta taille.", "**Seek and destroy** (stops pris des deux côtés) : semaine à éviter, souvent avant le NFP.", "Version baissière = miroir : le haut de la semaine se fait lundi – mercredi."] },
    { h: "SMT divergence", d: DgSMT, b: ["**SMT** = EURUSD fait un nouvel extrême, GBPUSD non. C'est une confirmation, pas une entrée."] },
  ] },
  { id: "modeles", title: "9 · Les modèles", blocks: [
    { n: "Un seul modèle pendant 90 jours. Commence par le 2022 model." },
    { h: "2022 model · facile · ton point de départ", d: Dg2022, b: ["**Raid → MSS → FVG.** Stop sous le raid. Cible = le draw.", "S'il manque une étape, pas de trade."] },
    { h: "Silver Bullet · facile", d: DgSilver, b: ["Fenêtres : **3 h – 4 h** et **10 h – 11 h** NY (15 h – 16 h et 22 h – 23 h à Bangkok).", "Repère la liquidité avant la fenêtre. Le FVG doit naître dans la même heure."] },
    { h: "Unicorn · le setup A+", d: DgUnicorn, b: ["**Breaker + FVG au même prix.** Ordre dans la zone commune.", "Invalide si clôture sous le breaker."] },
    { h: "Turtle Soup · sur PDH / PDL", d: DgTurtle, b: ["**Faux breakout d'un niveau évident**, retour sous le niveau, MSS, entrée."] },
    { h: "MMBM · pour lire le contexte", d: DgMMBM, b: ["Si tu es dans le programme d'achat, tu ne cherches pas de vente."] },
  ] },
  { id: "gestion", title: "10 · Gestion et erreurs", blocks: [
    { h: "La gestion", t: [["Gestion", "Règle"], ["Risque", "0,25 – 0,5 % par trade"], ["Taille", "lots = risque $ ÷ (stop pips × 10)"], ["Stop", "derrière la zone + 1 pip, jamais sur un niveau rond"], ["Partiel", "50 % à la projection −1"], ["Point d'entrée", "seulement après le partiel"], ["Limite du jour", "2 trades, arrêt à −1 %"], ["Nouvelles", "rien d'ouvert 10 min avant et après"], ["Paris perdus aujourd'hui", "pas de trading"]] },
    { h: "Les 10 erreurs qui coûtent le plus", t: [["Erreur", "La règle"], ["Trader chaque FVG", "Seulement ceux nés d'un displacement"], ["Acheter en premium", "Regarde l'EQ avant d'entrer"], ["La mèche = MSS", "Seules les clôtures comptent"], ["Entrer avant le sweep", "Attends que la liquidité soit prise"], ["Hors killzone", "Seulement les A+"], ["Changer de biais en direct", "Biais fixé avant London"], ["Empiler 10 concepts", "Un modèle, une checklist"], ["Point d'entrée trop tôt", "Après le premier partiel"], ["Le trade de revanche", "2 trades par jour, arrêt à −1 %"], ["Trader après une perte en paris", "Ce jour-là, pas de trading"]] },
    { h: "Le journal et le plan de 90 jours", b: ["**8 champs** : date et session · modèle · note A+ · entrée, stop, cible · résultat en R · selon le plan · émotion · capture avant et après.", "**Après 100 trades** : expectancy au-dessus de +0,3R = le modèle marche pour toi.", "**Plan** : 2 semaines à repérer → 100 trades en Bar Replay → 30 trades en démo → challenge à 0,25 %."] },
  ] },
  { id: "lexique", title: "Lexique", blocks: [
    { t: [["Terme", "En 5 mots"], ["AMD", "Accumulation, manipulation, distribution"], ["BISI / SIBI", "FVG haussier / baissier"], ["BOS / MSS", "Cassure dans / contre la tendance"], ["BPR", "Zone commune SIBI + BISI"], ["BSL / SSL", "Stops au-dessus / en dessous"], ["CE", "Milieu d'un gap"], ["Displacement", "Grosses bougies, un seul sens"], ["Draw", "La liquidité visée ensuite"], ["EQ", "Milieu du range"], ["ERL / IRL", "Liquidité externe / interne"], ["IFVG", "Gap cassé qui change de camp"], ["Judas", "Faux départ de London"], ["OTE", "Retour à 62 – 79 %"], ["PDH / PDL", "Haut / bas d'hier"], ["PWH / PWL", "Haut / bas de la semaine dernière"], ["SMT", "Divergence entre marchés corrélés"], ["STH / ITH / LTH", "Swings court / moyen / long terme"]] },
  ] },
];

const ICT_CHECKLIST = [
  "Le trade va vers le draw daily",
  "J'achète en discount / je vends en premium",
  "La liquidité opposée vient d'être prise",
  "MSS en clôture avec displacement",
  "Un PD array 1H / 4H du même sens est touché",
  "En killzone ou en Silver Bullet",
  "Une cible à 2R minimum",
];

function RichText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => p.startsWith("**") && p.endsWith("**") ? <b key={i} style={{ color: C.text }}>{p.slice(2, -2)}</b> : <React.Fragment key={i}>{p}</React.Fragment>)}</>;
}

function IctDiagram({ Comp }) {
  const vars = {
    "--cds-text-primary": C.text, "--cds-text-secondary": C.textSecondary,
    "--cds-chart-axis": C.textMuted, "--cds-chart-grid": C.border,
    "--cds-chart-categorical-1": "#3B82F6", "--cds-chart-categorical-2": "#F97316",
    "--cds-chart-categorical-3": C.teal, "--cds-chart-categorical-4": "#A855F7",
    "--cds-chart-status-good": C.teal, "--cds-chart-status-critical": C.red,
    "--cds-chart-status-warning": C.amber, "--cds-chart-reference-tint": "rgba(128,128,128,0.12)",
  };
  return (
    <div style={{ ...vars, background: C.inputBg || C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "8px 6px", overflowX: "auto" }}>
      <div style={{ minWidth: 520 }}>
        <Comp />
      </div>
    </div>
  );
}

function IctTable({ rows }) {
  const [head, ...body] = rows;
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>{head.map((h) => <th key={h} style={{ textAlign: "left", padding: "9px 12px", background: C.purpleDim, color: C.text, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>{r.map((cell, j) => <td key={j} style={{ padding: "9px 12px", borderTop: `1px solid ${C.border}`, color: j === 0 ? C.text : C.textSecondary, fontWeight: j === 0 ? 600 : 400, verticalAlign: "top" }}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IctChecks({ items }) {
  const [v, setV] = useState(() => items.map(() => false));
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {items.map((it, i) => (
        <label key={it} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.border}`, background: v[i] ? C.tealDim : "transparent", cursor: "pointer", fontSize: 13, color: C.text }}>
          <input type="checkbox" checked={v[i]} onChange={() => setV((a) => a.map((x, j) => (j === i ? !x : x)))} style={{ width: 16, height: 16, accentColor: C.teal }} />
          {it}
        </label>
      ))}
    </div>
  );
}

function RessourcesICT() {
  const [checks, setChecks] = useState(() => ICT_CHECKLIST.map(() => false));
  const score = checks.filter(Boolean).length;
  const verdict = score >= 6 ? { t: "A+ · taille normale", c: C.teal, bg: C.tealDim } : score === 5 ? { t: "B · demi-taille", c: C.amber, bg: C.amberDim } : { t: "Pas de trade", c: C.red, bg: C.redDim };
  const go = (id) => { const el = document.getElementById("ict-" + id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <PageHeader title="Ressources ICT" />
      <div style={{ fontSize: 14, color: C.textSecondary, marginBottom: 14, fontWeight: 600 }}>3 questions avant chaque trade : où va le prix (la liquidité), quand (l'heure), depuis où (la zone).</div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 16, position: "sticky", top: 0, zIndex: 5, background: C.bg }}>
        {[{ id: "checklist", title: "Checklist A+" }, ...ICT_SECTIONS].map((s) => (
          <button key={s.id} onClick={() => go(s.id)} style={{ flex: "none", padding: "7px 12px", borderRadius: 99, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{s.title}</button>
        ))}
      </div>

      <Card id="ict-checklist" style={{ padding: 16, marginBottom: 16, scrollMarginTop: 60 }}>
        <CardLabel>Checklist A+ · 1 point par case</CardLabel>
        <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
          {ICT_CHECKLIST.map((item, i) => (
            <label key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.border}`, background: checks[i] ? C.tealDim : "transparent", cursor: "pointer", fontSize: 13, color: C.text }}>
              <input type="checkbox" checked={checks[i]} onChange={() => setChecks((c) => c.map((x, j) => (j === i ? !x : x)))} style={{ width: 16, height: 16, accentColor: C.teal }} />
              {item}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, padding: "6px 12px", borderRadius: 99, color: verdict.c, background: verdict.bg }}>{score}/7 · {verdict.t}</span>
          <button onClick={() => setChecks(ICT_CHECKLIST.map(() => false))} style={{ background: "none", border: `1px solid ${C.border}`, color: C.textSecondary, borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}>Réinitialiser</button>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>6 – 7 = A+, taille normale · 5 = B, demi-taille · 4 ou moins = rien.</div>
      </Card>

      {ICT_SECTIONS.map((s) => (
        <Card key={s.id} id={"ict-" + s.id} style={{ padding: 18, marginBottom: 16, scrollMarginTop: 60 }}>
          <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 14px", color: C.text, letterSpacing: -0.3 }}>{s.title}</h2>
          <div style={{ display: "grid", gap: 18 }}>
            {s.blocks.map((bl, i) => (
              <div key={i} style={{ display: "grid", gap: 10 }}>
                {bl.h && <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{bl.h}</div>}
                {bl.d && <IctDiagram Comp={bl.d} />}
                {bl.t && <IctTable rows={bl.t} />}
                {bl.c && <IctChecks items={bl.c} />}
                {bl.b && (
                  <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6, fontSize: 13.5, color: C.textSecondary, lineHeight: 1.5 }}>
                    {bl.b.map((x) => <li key={x}><RichText text={x} /></li>)}
                  </ul>
                )}
                {bl.n && <div style={{ fontSize: 13, color: C.text, background: C.purpleDim, borderRadius: 10, padding: "10px 12px", lineHeight: 1.5 }}>{bl.n}</div>}
              </div>
            ))}
          </div>
        </Card>
      ))}
      <div style={{ fontSize: 11.5, color: C.textMuted, margin: "4px 0 20px", lineHeight: 1.5 }}>Sources : LuxAlgo (Silver Bullet, Model 2022, Unicorn, Macros, SMT, NWOG), The Right Trader (rejection, mitigation, propulsion), TradingFinder (weekly profiles), Backtrex (IPDA). Aucune ne publie de taux de réussite vérifié : le tien viendra de ton journal.</div>
    </div>
  );
}


/* ============================================================================
   SIDEBAR / NAVIGATION — façon TradeZella
   ============================================================================ */

/* ============================================================================
   BACKTEST — clone du mode Replay de TradingView (Lightweight Charts + Dukascopy)
   ============================================================================ */

const TV = { bg: "#ffffff", border: "#e0e3eb", text: "#131722", muted: "#787b86", hover: "#f0f3fa", blue: "#2962ff", red: "#f23645", green: "#089981", up: "#7fd1bd", down: "#131722" };
const TV_TFS = [["15m", 15], ["30m", 30], ["1h", 60], ["2h", 120], ["3h", 180], ["4h", 240], ["6h", 360], ["8h", 480], ["12h", 720], ["D", 1440], ["W", 10080], ["M", 43200]];
const TV_PAIR = "EURUSD", TV_PIP = 0.0001, TV_PIPVAL = 10, TV_DIG = 5, TV_SPREAD = 0.2;
const TV_FONT = "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";
const TV_TFLAB = { 15: "M15", 30: "M30", 60: "H1", 120: "H2", 180: "H3", 240: "H4", 360: "H6", 480: "H8", 720: "H12", 1440: "D", 10080: "W", 43200: "M" };
/* couleurs des annonces : différentes des killzones (vert, bleu, rouge, violet, orange) et des rectangles */
const TV_NEWS_COL = { NFP: "#e91e63", CPI: "#00acc1", FOMC: "#8d6e63" };
const tvRgba = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
const TV_ZONE = { OB: "#2962ff", SIBI: "#f23645", BISI: "#089981", BB: "#9c27b0", IFVG: "#f5b700" };
const TV_LIQ = { BSL: "#8b0000", SSL: "#089981" };
/* annonces US : CPI (BLS, 8h30 NY) et FOMC (Fed, communiqué 14h15 jusqu'en 2012 puis 14h00 NY) */
const TV_CPI = "2010-01-15 2010-02-19 2010-03-18 2010-04-14 2010-05-19 2010-06-17 2010-07-16 2010-08-13 2010-09-17 2010-10-15 2010-11-17 2010-12-15 2011-01-14 2011-02-17 2011-03-17 2011-04-15 2011-05-13 2011-06-15 2011-07-15 2011-08-18 2011-09-15 2011-10-19 2011-11-16 2011-12-16 2012-01-19 2012-02-17 2012-03-16 2012-04-13 2012-05-15 2012-06-14 2012-07-17 2012-08-15 2012-09-14 2012-10-16 2012-11-15 2012-12-14 2013-01-16 2013-02-21 2013-03-15 2013-04-16 2013-05-16 2013-06-18 2013-07-16 2013-08-15 2013-09-17 2013-10-30 2013-11-20 2013-12-17 2014-01-16 2014-02-20 2014-03-18 2014-04-15 2014-05-15 2014-06-17 2014-07-22 2014-08-19 2014-09-17 2014-10-22 2014-11-20 2014-12-17 2015-01-16 2015-02-26 2015-03-24 2015-04-17 2015-05-22 2015-06-18 2015-07-17 2015-08-19 2015-09-16 2015-10-15 2015-11-17 2015-12-15 2016-01-20 2016-02-19 2016-03-16 2016-04-14 2016-05-17 2016-06-16 2016-07-15 2016-08-16 2016-09-16 2016-10-18 2016-11-17 2016-12-15 2017-01-18 2017-02-15 2017-03-15 2017-04-14 2017-05-12 2017-06-14 2017-07-14 2017-08-11 2017-09-14 2017-10-13 2017-11-15 2017-12-13 2018-01-12 2018-02-14 2018-03-13 2018-04-11 2018-05-10 2018-06-12 2018-07-12 2018-08-10 2018-09-13 2018-10-11 2018-11-14 2018-12-12 2019-01-11 2019-02-13 2019-03-12 2019-04-10 2019-05-10 2019-06-12 2019-07-11 2019-08-13 2019-09-12 2019-10-10 2019-11-13 2019-12-11 2020-01-14 2020-02-13 2020-03-11 2020-04-10 2020-05-12 2020-06-10 2020-07-14 2020-08-12 2020-09-11 2020-10-13 2020-11-12 2020-12-10 2021-01-13 2021-02-10 2021-03-10 2021-04-13 2021-05-12 2021-06-10 2021-07-13 2021-08-11 2021-09-14 2021-10-13 2021-11-10 2021-12-10 2022-01-12 2022-02-10 2022-03-10 2022-04-12 2022-05-11 2022-06-10 2022-07-13 2022-08-10 2022-09-13 2022-10-13 2022-11-10 2022-12-13 2023-01-12 2023-02-14 2023-03-14 2023-04-12 2023-05-10 2023-06-13 2023-07-12 2023-08-10 2023-09-13 2023-10-12 2023-11-14 2023-12-12 2024-01-11 2024-02-13 2024-03-12 2024-04-10 2024-05-15 2024-06-12 2024-07-11 2024-08-14 2024-09-11 2024-10-10 2024-11-13 2024-12-11 2025-01-15 2025-02-12 2025-03-12 2025-04-10 2025-05-13 2025-06-11 2025-07-15 2025-08-12 2025-09-11 2025-10-24 2025-12-18 2026-01-13 2026-02-13 2026-03-11 2026-04-10 2026-05-12 2026-06-10 2026-07-14 2026-08-12 2026-09-11 2026-10-14 2026-11-10".split(" ");
const TV_FOMC = "2010-01-27 2010-03-16 2010-04-28 2010-06-23 2010-08-10 2010-09-21 2010-11-03 2010-12-14 2011-01-26 2011-03-15 2011-04-27 2011-06-22 2011-08-09 2011-09-21 2011-11-02 2011-12-13 2012-01-25 2012-03-13 2012-04-25 2012-06-20 2012-08-01 2012-09-13 2012-10-24 2012-12-12 2013-01-30 2013-03-20 2013-05-01 2013-06-19 2013-07-31 2013-09-18 2013-10-30 2013-12-18 2014-01-29 2014-03-19 2014-04-30 2014-06-18 2014-07-30 2014-09-17 2014-10-29 2014-12-17 2015-01-28 2015-03-18 2015-04-29 2015-06-17 2015-07-29 2015-09-17 2015-10-28 2015-12-16 2016-01-27 2016-03-16 2016-04-27 2016-06-15 2016-07-27 2016-09-21 2016-11-02 2016-12-14 2017-02-01 2017-03-15 2017-05-03 2017-06-14 2017-07-26 2017-09-20 2017-11-01 2017-12-13 2018-01-31 2018-03-21 2018-05-02 2018-06-13 2018-08-01 2018-09-26 2018-11-08 2018-12-19 2019-01-30 2019-03-20 2019-05-01 2019-06-19 2019-07-31 2019-09-18 2019-10-30 2019-12-11 2020-01-29 2020-03-03@10:00 2020-03-15@17:00 2020-04-29 2020-06-10 2020-07-29 2020-09-16 2020-11-05 2020-12-16 2021-01-27 2021-03-17 2021-04-28 2021-06-16 2021-07-28 2021-09-22 2021-11-03 2021-12-15 2022-01-26 2022-03-16 2022-05-04 2022-06-15 2022-07-27 2022-09-21 2022-11-02 2022-12-14 2023-02-01 2023-03-22 2023-05-03 2023-06-14 2023-07-26 2023-09-20 2023-11-01 2023-12-13 2024-01-31 2024-03-20 2024-05-01 2024-06-12 2024-07-31 2024-09-18 2024-11-07 2024-12-18 2025-01-29 2025-03-19 2025-05-07 2025-06-18 2025-07-30 2025-09-17 2025-10-29 2025-12-10 2026-01-28 2026-03-18 2026-04-29 2026-06-17 2026-07-29 2026-09-16 2026-10-28 2026-12-09".split(" ");
const TV_STRUCT = { MSS: "#ff6d00", BOS: "#131722" };
/* zones dessinées -> PD arrays du site */
const TV_PD_MAP = { OB: (side) => (side > 0 ? "OB+" : "OB-"), BISI: () => "BISI", SIBI: () => "SIBI", BB: () => "Breaker Block", IFVG: () => "Inverse FVG" };
/* killzones en heure de New York (heure d'été gérée automatiquement depuis 2010) */
const KZ_SESS = [["asia", "Asia"], ["london", "London"], ["ny", "New York"], ["lc", "London Close"], ["nypm", "NY PM"]];
const KZ_PRESETS = {
  site: { n: "Comme le site (Asia 20h-0h / London 2h-5h / NY 8h30-11h / NY PM 13h30-16h, New York) : les stats utilisent ces sessions", s: { asia: ["20:00", "00:00"], london: ["02:00", "05:00"], ny: ["08:30", "11:00"], nypm: ["13:30", "16:00"] } },
  ict: { n: "ICT (heure de New York)", s: { asia: ["20:00", "00:00"], london: ["02:00", "05:00"], ny: ["07:00", "10:00"], lc: ["10:00", "12:00"], nypm: ["13:30", "16:00"] } },
  hugo: { n: "HugoFX (Asia 2h-6h / London 7h-11h / NY 13h-17h, heure de Paris)", s: { asia: ["20:00", "00:00"], london: ["01:00", "05:00"], ny: ["07:00", "11:00"] } },
  forex: { n: "Forex/Gold/Cryptos (Asia 2h-6h / London 8h-11h / NY 13h-16h / LC 16h-18h, Paris)", s: { asia: ["20:00", "00:00"], london: ["02:00", "05:00"], ny: ["07:00", "10:00"], lc: ["10:00", "12:00"] } },
  indices: { n: "Indices (Asia 2h-6h / London 8h-11h / NY 14h30-17h + 19h30-22h, Paris)", s: { asia: ["20:00", "00:00"], london: ["02:00", "05:00"], ny: ["08:30", "11:00"], nypm: ["13:30", "16:00"] } },
};
const TV_CFG0 = {
  kz: { show: true, preset: "site", on: { asia: true, london: true, ny: true, lc: false, nypm: true }, times: { ...KZ_PRESETS.ict.s, ...KZ_PRESETS.site.s }, days: 30, transp: 88, mid: false, labels: true,
        color: { asia: "#4caf50", london: "#2962ff", ny: "#f23645", lc: "#9c27b0", nypm: "#ff9800" } },
  lv: { pd: true, pw: true, pdh: true, pdl: true, pwh: true, pwl: true, pdColor: "#131722", pwColor: "#2962ff" },
  st: { swings: false, bos: false, mss: false, eq: false, fvg: false, len: 3 },
  grid: false, hideFlat: true, up: "#7fd1bd", down: "#131722",
  cap: 50000, slP: 15, rr: 1, risk: 1, qty: 1, yearReset: true, showClosed: false, autoBE: true, autoBEpct: 50, layout: "2v", ltf: [240, 15, 1440], miss: false,
};
function tvLoadCfg() { try { const v = JSON.parse(localStorage.getItem("tjp_tv_cfg")); if (v && !v.rr11) { v.rr = 1; v.rr11 = true; } if (v && !v.risk1) { v.risk = 1; v.risk1 = true; } if (v && !v.lay2) { v.lay2 = true; v.layout = "2v"; v.ltf = [240, 15, 1440]; v.tf = 15; } if (v) return { ...TV_CFG0, ...v, kz: { ...TV_CFG0.kz, ...v.kz, color: { ...TV_CFG0.kz.color, ...(v.kz || {}).color } }, lv: { ...TV_CFG0.lv, ...v.lv }, st: { ...TV_CFG0.st, ...(v.st || {}) } }; } catch (e) {} return TV_CFG0; }
const tvHm = (s) => { const [h, m] = String(s).split(":").map(Number); return (h || 0) * 60 + (m || 0); };
/* sessions de backtest (titre, position du replay, dessins, positions) */
function tvLoadSess() { try { const v = JSON.parse(localStorage.getItem("tjp_bt_sess")); if (v && v.list && v.list.length) return v; } catch (e) {} return { cur: "s1", list: [{ id: "s1", title: "Backtest libre", ci: null, tf: 240, draws: [], trades: [] }] }; }
/* sauvegarde légère : on n'écrit que si quelque chose a changé ; Supabase au plus une fois par minute (et en quittant la page) */
let TV_LAST_LOCAL = "", TV_LAST_REMOTE = "", TV_SYNC_T = null, TV_SYNC_AT = 0;
const tvSlim = (t) => { const { drawSnap, upnl, ...rest } = t; return rest; }; /* les dessins du trade vivent dans Saisie & stats, pas dans la session */
function tvSyncNow() {
  try {
    const raw = (localStorage.getItem("tjp_bt_sess") || "") + "|" + (localStorage.getItem("tjp_tv_cfg") || "");
    if (raw === TV_LAST_REMOTE) return; TV_LAST_REMOTE = raw; TV_SYNC_AT = Date.now();
    saveSettingsPatch({ bt_sessions: JSON.parse(localStorage.getItem("tjp_bt_sess") || "null"), bt_config: JSON.parse(localStorage.getItem("tjp_tv_cfg") || "null") });
  } catch (e) {}
}
function tvSync(force) { if (force) { clearTimeout(TV_SYNC_T); tvSyncNow(); return; } if (TV_SYNC_T) return; TV_SYNC_T = setTimeout(() => { TV_SYNC_T = null; tvSyncNow(); }, Math.max(5000, 60000 - (Date.now() - TV_SYNC_AT))); }
function tvSaveSess(v, force) {
  try {
    const slim = { ...v, list: v.list.map((x) => ({ ...x, trades: (x.trades || []).map(tvSlim), archive: (x.archive || []).map(tvSlim) })) };
    const body = JSON.stringify({ ...slim, savedAt: 0 }); if (body === TV_LAST_LOCAL && !force) return; TV_LAST_LOCAL = body;
    slim.savedAt = Date.now(); localStorage.setItem("tjp_bt_sess", JSON.stringify(slim));
  } catch (e) {}
  tvSync(force);
}
/* au démarrage de l'app : récupère la version Supabase si elle est plus récente */
function tvApplyRemote(row) {
  try {
    if (row && row.bt_sessions && row.bt_sessions.list) { const loc = JSON.parse(localStorage.getItem("tjp_bt_sess") || "null"); if (!loc || (row.bt_sessions.savedAt || 0) > (loc.savedAt || 0)) localStorage.setItem("tjp_bt_sess", JSON.stringify(row.bt_sessions)); }
    if (row && row.bt_config) { const loc = JSON.parse(localStorage.getItem("tjp_tv_cfg") || "null"); if (!loc || (row.bt_config.savedAt || 0) > (loc.savedAt || 0)) localStorage.setItem("tjp_tv_cfg", JSON.stringify(row.bt_config)); }
  } catch (e) {}
}
/* fuseau d'affichage : "ny" = New York avec heure d'été, sinon décalage fixe en heures */
const tvTzOff = (t, tz) => (tz === "ny" ? tvNyOff(t) : (+tz || 0) * 3600);
const TV_MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
let TV_BLIND = false; /* mode à l'aveugle : dates cachées, seules les heures restent (killzones) */
function tvFmtTime(t, tz, type) {
  const d = new Date((t + tvTzOff(t, tz)) * 1000), p2 = (n) => String(n).padStart(2, "0");
  const hm = p2(d.getUTCHours()) + ":" + p2(d.getUTCMinutes());
  if (TV_BLIND) return type === "full" ? "•• •• ••  " + hm : typeof type === "number" && type < 3 ? "" : hm;
  if (type === "full") return `${d.getUTCDate()} ${TV_MOIS[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(2)}  ${hm}`;
  const dd = new Date((t + tvTzOff(t, tz) + (tz === "ny" ? 7 * 3600 : 0)) * 1000); /* jour de trading (17:00 New York) pour les années, mois et jours */
  if (type === 0) return String(dd.getUTCFullYear());
  if (type === 1) return TV_MOIS[dd.getUTCMonth()];
  if (type === 2) return String(dd.getUTCDate());
  return hm;
}
const TV_PD_TFS = ["M1", "M3", "M5", "M15", "M30", "M45", "H1", "H2", "H3", "H4", "D", "W", "M"]; /* intervalles de TradingView */
const tvPdList = () => { try { return TAG_CATALOG.filter((t) => t.category === "setup").map((t) => t.name); } catch (e) { return ["BISI", "SIBI", "OB+", "OB-", "Breaker Block"]; } };
const tvIsBE = (t) => Math.abs(t.pnl || 0) <= 1 || Math.abs(t.r || 0) <= 0.1; /* BE : résultat entre -0,1 R et +0,1 R (ou 1 $ ou moins) */
const tvYear = (t) => new Date((t + tvNyOff(t)) * 1000).getUTCFullYear();
function tvBsRows(rows, t) { let lo = 0, hi = rows.length - 1, r = rows.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (rows[m][0] >= t) { r = m; hi = m - 1; } else lo = m + 1; } return r; }
const tvNyIso = (t) => new Date((t + tvNyOff(t)) * 1000).toISOString().slice(0, 19) + ".000Z";

/* --- stockage local (IndexedDB) --- */
function tvDB() { return new Promise((res) => { try { const q = indexedDB.open("tjp_backtest", 1); q.onupgradeneeded = () => q.result.createObjectStore("bars"); q.onsuccess = () => res(q.result); q.onerror = () => res(null); } catch (e) { res(null); } }); }
async function tvGet(k) { const db = await tvDB(); if (!db) return null; return new Promise((r) => { const q = db.transaction("bars").objectStore("bars").get(k); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); }
async function tvPut(k, v) { const db = await tvDB(); if (!db) return; return new Promise((r) => { const tx = db.transaction("bars", "readwrite"); tx.objectStore("bars").put(v, k); tx.oncomplete = r; tx.onerror = r; }); }

/* --- données publiées avec le site : public/data/eurusd-m15.csv (GitHub). Chargées une fois, puis gardées dans le navigateur --- */
let TV_AUTO = null;
function tvAutoLoad(onMsg) {
  if (TV_AUTO) return TV_AUTO;
  TV_AUTO = (async () => {
    const d = await tvGet(TV_PAIR); if (d && d.rows && d.rows.length) return d.rows;
    let base = "/"; try { base = (import.meta && import.meta.env && import.meta.env.BASE_URL) || "/"; } catch (e) {}
    try {
      onMsg && onMsg("Téléchargement de l'historique EURUSD depuis le site…");
      const r = await fetch(base + "data/eurusd-m15.csv"); if (!r.ok) return null;
      const txt = await r.text(); const rows = tvParse(txt); if (!rows.length) return null;
      rows.sort((a, b) => a[0] - b[0]); await tvPut(TV_PAIR, { rows }); onMsg && onMsg(`${rows.length.toLocaleString("fr-CA")} bougies réelles chargées et gardées sur cet appareil.`); return rows;
    } catch (e) { return null; }
  })();
  TV_AUTO.then((r) => { if (!r) TV_AUTO = null; });
  return TV_AUTO;
}

/* --- lecture CSV (dukascopy-node, Dukascopy web, HistData, MT4) --- */
function tvParse(txt) {
  const out = [];
  for (const raw of txt.split(/\r?\n/)) {
    const s = raw.trim(); if (!s || /^[a-z"]/i.test(s)) continue;
    const a = s.split(/[;,\t]/); let t = null, i = 1, m;
    if (/^\d{12,13}$/.test(a[0])) t = Math.floor(+a[0] / 1000);
    else if (/^\d{9,10}$/.test(a[0])) t = +a[0];
    else if ((m = a[0].match(/^(\d{4})(\d{2})(\d{2}) (\d{2})(\d{2})/))) t = Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) / 1000 + 5 * 3600;
    else if ((m = a[0].match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/))) t = Date.UTC(+m[3], m[2] - 1, +m[1], +m[4], +m[5]) / 1000;
    else if ((m = a[0].match(/^(\d{4})[-.](\d{2})[-.](\d{2})[ T](\d{2}):(\d{2})/))) t = Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) / 1000;
    else if ((m = a[0].match(/^(\d{4})\.(\d{2})\.(\d{2})$/)) && /^\d{1,2}:\d{2}/.test(a[1])) { const h = a[1].split(":"); t = Date.UTC(+m[1], m[2] - 1, +m[3], +h[0], +h[1]) / 1000; i = 2; }
    if (t === null) continue;
    const o = +a[i], h = +a[i + 1], l = +a[i + 2], c = +a[i + 3];
    if (o > 0 && h > 0 && l > 0 && c > 0) out.push([t, o, h, l, c]);
  }
  return out;
}
/* bougies : jour / H4 / semaine alignés sur 17:00 New York (22:00 UTC), mois du 1er au dernier jour */
/* décalage de New York (heure d'été : 2e dimanche de mars → 1er dimanche de novembre) */
const tvDst = {};
function tvNyOff(t) {
  const y = new Date(t * 1000).getUTCFullYear(); let r = tvDst[y];
  if (!r) { const sun = (m, n) => { const d = new Date(Date.UTC(y, m, 1)); return Date.UTC(y, m, 1 + ((7 - d.getUTCDay()) % 7) + 7 * (n - 1)) / 1000; }; r = tvDst[y] = [sun(2, 2) + 7 * 3600, sun(10, 1) + 6 * 3600]; }
  return t >= r[0] && t < r[1] ? -4 * 3600 : -5 * 3600;
}
/* bougies H2 et plus alignées sur la clôture de New York (17:00 NY), comme TradingView / OANDA.
   Sans ça, la reprise du dimanche soir crée une mini-bougie plate (les « pointillés ») en daily. */
function tvBucket(t, min) {
  if (min < 120) { const s = min * 60; return Math.floor(t / s) * s; }
  const off = tvNyOff(t) + 7 * 3600, loc = t + off; /* 17:00 NY devient 00:00 */
  if (min === 43200) { const d = new Date(loc * 1000); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000 - off; }
  if (min === 10080) { const day = Math.floor(loc / 86400), dow = (day + 4) % 7; return (day - ((dow + 6) % 7)) * 86400 - off; }
  const s = min * 60; return Math.floor(loc / s) * s - off;
}
function tvBuild(rows, min, hideFlat) {
  const bars = [], start = []; let cur = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], b = tvBucket(r[0], min);
    if (!cur || cur.time !== b) { cur = { time: b, open: r[1], high: r[2], low: r[3], close: r[4] }; bars.push(cur); start.push(i); }
    else { if (r[2] > cur.high) cur.high = r[2]; if (r[3] < cur.low) cur.low = r[3]; cur.close = r[4]; }
  }
  if (!hideFlat || bars.length < 3) return { bars, start, min, hideFlat };
  /* bougies quasi plates (reprise du dimanche, jours fériés, fin d'année) : fusionnées dans la suivante, sans espace */
  const rg = bars.map((b) => b.high - b.low).sort((a, b) => a - b), lim = Math.max(rg[Math.floor(rg.length / 2)] * 0.08, 0.00003);
  const B = [], S = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (i < bars.length - 1 && b.high - b.low < lim) { const n = bars[i + 1]; n.open = b.open; n.high = Math.max(n.high, b.high); n.low = Math.min(n.low, b.low); start[i + 1] = start[i]; continue; }
    B.push(b); S.push(start[i]);
  }
  return { bars: B, start: S, min, hideFlat };
}
function tvDemo() {
  let s = 11; const R = () => (s = (s * 16807) % 2147483647) / 2147483647; const g = () => Math.sqrt(-2 * Math.log(R() + 1e-9)) * Math.cos(6.283 * R());
  const rows = []; let p = 1.085, t = Date.UTC(2024, 0, 1) / 1000;
  for (let k = 0; k < 14000; k++) { t += 900; const d = new Date(t * 1000); if (d.getUTCDay() === 6 || (d.getUTCDay() === 0 && d.getUTCHours() < 22) || (d.getUTCDay() === 5 && d.getUTCHours() >= 22)) continue; const v = 0.00045; const o = p; p += g() * v; rows.push([t, o, Math.max(o, p) + R() * v * 0.6, Math.min(o, p) - R() * v * 0.6, p]); }
  return rows;
}
const tvBs = (arr, v) => { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= v) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
const tvMoney = (v) => (v < 0 ? "-" : "") + "$" + Math.abs(v).toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/* icônes noir et blanc de la barre de replay */
const TvIco = {
  cal: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" /></svg>,
  cut: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="2.8" /><circle cx="6.5" cy="17.5" r="2.8" /><path d="M8.6 8.4L20 18M8.6 15.6L20 6" /></svg>,
  play: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.4-7.2a.8.8 0 0 0 0-1.4L8.2 4.1A.8.8 0 0 0 7 4.8z" /></svg>,
  pause: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1" /><rect x="14" y="4.5" width="4" height="15" rx="1" /></svg>,
  candle: <svg width="26" height="18" viewBox="0 0 30 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 2v4M5 15v3" /><rect x="2" y="6" width="6" height="9" rx="1" fill="currentColor" /><text x="12" y="15" fontSize="11" fontWeight="700" fill="currentColor" stroke="none" fontFamily="Arial, sans-serif">+1</text></svg>,
  day: <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "Arial, sans-serif", lineHeight: "18px" }}>+1</span>,
  nfp: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.3" /><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M14.5 14.6c.8-.4 1.6-.6 2.5-.6 2.2 0 3.8 1.5 4.3 4" /></svg>,
  cpi: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h2.2l2.3 11h10.8l2-7.5H6.4" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></svg>,
  fomc: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 4l9 5.5H3zM5 10v7M9.7 10v7M14.3 10v7M19 10v7M3 20h18" /></svg>,
};
const TV_SPEEDS = [[0.5, 1400], [1, 700], [2, 350], [3, 230], [5, 140]];

function TvBtn({ active, children, onClick, title, style }) {
  const [h, setH] = useState(false);
  return <button title={title} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ background: active ? TV.hover : h ? TV.hover : "transparent", color: active ? TV.blue : TV.text, border: "none", borderRadius: 4, padding: "6px 8px", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, ...style }}>{children}</button>;
}

/* ---------- outils de dessin (mêmes groupes que la barre de gauche de TradingView) ---------- */
const TV_TOOLS = {
  cursor: { n: "Croix", mode: 0 },
  trend: { n: "Ligne de tendance", k: "Alt+T", mode: 2 }, ray: { n: "Rayon", mode: 2 }, ext: { n: "Ligne étendue", mode: 2 },
  hline: { n: "Ligne horizontale", k: "Alt+H", mode: 1 }, hray: { n: "Rayon horizontal", mode: 1 }, bsl: { n: "BSL · Buyside liquidity", mode: 1, as: "hray", kind: "BSL" }, ssl: { n: "SSL · Sellside liquidity", mode: 1, as: "hray", kind: "SSL" }, vline: { n: "Ligne verticale", k: "Alt+V", mode: 1 },
  cross: { n: "Ligne croisée", k: "Alt+C", mode: 1 }, channel: { n: "Canal parallèle", mode: 2 },
  fib: { n: "Retracement de Fibonacci", k: "Alt+F", mode: 2 }, fibext: { n: "Extension de Fibonacci basée sur la tendance", mode: 3 },
  long: { n: "Position longue", mode: "pos" }, short: { n: "Position courte", mode: "pos" },
  pricerange: { n: "Plage de prix", mode: 2 }, daterange: { n: "Plage de dates", mode: 2 }, measure: { n: "Plage de dates et de prix", mode: 2 },
  brush: { n: "Pinceau", mode: "free" }, highlight: { n: "Surligneur", mode: "free" }, rect: { n: "Rectangle", k: "Alt+Maj+R", mode: 2 }, ob: { n: "Order Block (OB)", mode: 2, as: "rect", kind: "OB" }, bisi: { n: "BISI (FVG haussier)", mode: 2, as: "rect", kind: "BISI" }, sibi: { n: "SIBI (FVG baissier)", mode: 2, as: "rect", kind: "SIBI" }, bb: { n: "Breaker Block (BB)", mode: 2, as: "rect", kind: "BB" }, ifvg: { n: "Inverse FVG (IFVG)", mode: 2, as: "rect", kind: "IFVG" },
  circle: { n: "Cercle", mode: 2 }, triangle: { n: "Triangle", mode: 3 }, path: { n: "Chemin (double-clic pour finir)", mode: "multi" },
  text: { n: "Texte", mode: 1 }, label: { n: "Étiquette de prix", mode: 1 },
};
const TV_GROUPS = [
  { id: "cur", n: "Curseurs", items: ["cursor"] },
  { id: "lines", n: "Lignes", items: ["trend", "ray", "ext", "hline", "hray", "vline", "cross", "channel"] },
  { id: "fibs", n: "Fibonacci", items: ["fib", "fibext"] },
  { id: "proj", n: "Prévision et mesure", items: ["long", "short", "pricerange", "daterange", "measure"] },
  { id: "shapes", n: "Formes", items: ["brush", "highlight", "rect", "circle", "triangle", "path"] },
  { id: "notes", n: "Annotations", items: ["text", "label"] },
];
/* raccourcis clavier : q w e r t y u i o p = outils de la barre de favoris, dans l'ordre (modifiable dans Paramètres) */
const tvDefKeys = (fav) => { const m = {}; "qwertyuiop".split("").forEach((k, i) => { if (fav[i]) m[k] = fav[i]; }); return m; };
/* sessions (heure de New York) pour le mode « une session par jour » */
const TV_SESS_MODE = { asia: ["Asia", 19 * 60, 24 * 60], london: ["Londres", 2 * 60, 7 * 60], ny: ["New York", 7 * 60, 12 * 60] };
const tvNyMin = (t) => Math.floor((((t + tvNyOff(t)) % 86400) + 86400) % 86400 / 60);
const tvNyDow = (t) => new Date((t + tvNyOff(t)) * 1000).getUTCDay();
const TV_FAV_DEFAULT = ["cursor", "trend", "brush", "rect", "hray", "short", "fib", "long", "path", "text"];
const TV_ICON = {
  cursor: "M14 5v7M14 16v7M5 14h7M16 14h7",
  trend: "M7 21L21 7|c7,21|c21,7",
  ray: "M7 21L23 5|c7,21|c14,14",
  ext: "M4 24L24 4|c10,18|c18,10",
  hline: "M3 14h22|c14,14",
  hray: "M9 14h16|c7,14",
  bsl: "M9 17h16|c7,17|uBSL",
  ssl: "M9 17h16|c7,17|uSSL",
  ob: "M4 7h20v14H4Z|tOB",
  bisi: "M4 7h20v14H4Z|tBISI",
  sibi: "M4 7h20v14H4Z|tSIBI",
  bb: "M4 7h20v14H4Z|tBB",
  ifvg: "M4 7h20v14H4Z|tIFVG",
  vline: "M14 3v22|c14,14",
  cross: "M3 14h22M14 3v22|c14,14",
  channel: "M4 18L18 6M10 24L24 12|c4,18|c18,6",
  fib: "M8 6h16M4 12h20M4 17h20M8 22h16|c6,6|c6,22",
  fibext: "M4 22L10 8L16 16M14 6h10M14 11h10M14 17h10|c4,22|c10,8|c16,16",
  long: "M8 7h16M4 21h20M4 14h5M19 14h5M9 10h10v8H9Z|c6,21|tL",
  short: "M8 7h16M4 21h20M4 14h5M19 14h5M9 10h10v8H9Z|c6,7|tS",
  pricerange: "M6 5h16M6 23h16M14 8v12M11 11l3-3 3 3M11 17l3 3 3-3",
  daterange: "M5 6v16M23 6v16M8 14h12M11 11l-3 3 3 3M17 11l3 3-3 3",
  measure: "M4 20L20 4L24 8L8 24ZM8 16l2 2M11 13l2 2M14 10l2 2M17 7l2 2",
  brush: "M11 17L20 5l3 3-11 10ZM11 17l-1 4-5 2 2-5 4-1ZM18 7l3 3",
  highlight: "M6 22l3-3 10-10 3 3-10 10-3 3ZM6 22h6",
  rect: "M6 6h16v16H6Z|s6,6|s22,6|s6,22|s22,22",
  circle: "M14 4a10 10 0 1 0 0.01 0",
  triangle: "M14 5L24 22H4Z",
  path: "M4 20L10 12L16 17L24 8M20 8h4v4",
  text: "M7 7h14M14 7v15M11 22h6",
  label: "M4 14L9 8h15v12H9Z",
  magnet: "M7 5v9a7 7 0 0 0 14 0V5h-4v9a3 3 0 0 1-6 0V5ZM7 9h4M17 9h4",
  stay: "M6 22l3-1 11-11-2-2L7 19ZM16 6l2 2M19 18h6v6h-6ZM20 18v-2a2 2 0 0 1 4 0v2",
  lock: "M8 13h12v10H8ZM10 13V9a4 4 0 0 1 8 0v4",
  eye: "M3 14s4-7 11-7 11 7 11 7-4 7-11 7S3 14 3 14ZM14 11a3 3 0 1 0 0.01 0",
  eyeoff: "M3 14s4-7 11-7 11 7 11 7-4 7-11 7S3 14 3 14ZM5 23L23 5",
  trash: "M6 8h16M10 8V5h8v3M8 8l1 15h10l1-15M12 12v7M16 12v7",
  star: "M14 4l3 6.5 7 .8-5.2 4.8 1.4 7L14 19.6 7.8 23l1.4-7L4 11.3l7-.8Z",
  grip: "",
};
function TvIcon({ id, size = 28, color = "currentColor" }) {
  const spec = TV_ICON[id] || ""; const parts = spec.split("|");
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {parts[0] && <path d={parts[0]} />}
      {parts.slice(1).map((p, i) => p[0] === "c" ? <circle key={i} cx={p.slice(1).split(",")[0]} cy={p.slice(1).split(",")[1]} r="2.3" fill="#fff" /> : p[0] === "s" ? <rect key={i} x={+p.slice(1).split(",")[0] - 2.2} y={+p.slice(1).split(",")[1] - 2.2} width="4.4" height="4.4" fill="#fff" /> : p[0] === "t" || p[0] === "u" ? <text key={i} x="14" y={p[0] === "u" ? 11 : 17} textAnchor="middle" fontSize={p.length > 3 ? 6.5 : 8} fill={color} stroke="none" fontWeight="700" fontFamily="Arial, sans-serif">{p.slice(1)}</text> : null)}
    </svg>
  );
}
const tvDur = (s) => { const m = Math.round(s / 60); if (m < 60) return m + " min"; if (m < 1440) return Math.floor(m / 60) + " h " + (m % 60 ? (m % 60) + " min" : ""); const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); return d + " j" + (h ? " " + h + " h" : ""); };
function tvLoadFav() { try { const v = JSON.parse(localStorage.getItem("tjp_tv_fav2")); if (Array.isArray(v)) return v; } catch (e) {} return TV_FAV_DEFAULT; }
function tvSaveFav(v) { try { localStorage.setItem("tjp_tv_fav2", JSON.stringify(v)); } catch (e) {} }

function BacktestLab({ onSave, onDelete, appTrades = [], getApp }) {
  const wrapRef = useRef(null), boxRef = useRef(null), ovRef = useRef(null), fileRef = useRef(null), dateRef = useRef(null);
  const R = useRef({ rows: null, ci: 0, agg: null, k: -1, chart: null, series: null, trades: [], draws: [], hist: [], redo: [], tool: "cursor", pend: null, drag: null, mouse: null, off: 0, sel: -1, dragS: null, magnet: false, clip: null }).current;
  const barRef = useRef(null), trBarRef = useRef(null);
  const [, force] = useState(0); const rerender = () => { R.dirty = true; force((x) => x + 1); };
  const [cfg, setCfgS] = useState(tvLoadCfg);
  const setCfg = (v) => { v = { ...v, savedAt: Date.now() }; setCfgS(v); R.cfg = v; try { localStorage.setItem("tjp_tv_cfg", JSON.stringify(v)); } catch (e) {} tvSync(); };
  R.cfg = cfg; R.onSave = onSave;
  const [tf, setTfS] = useState(() => { const v = tvLoadSess(); const c = v.list.find((x) => x.id === v.cur); return (c && c.tf) || 240; });
  const [tool, setToolS] = useState("cursor");
  const [playing, setPlaying] = useState(false);
  const [spd, setSpd] = useState(1);
  const [stepTf, setStepTf] = useState(15);
  /* changer de timeframe adapte aussi le pas du replay (à côté de 1x) */
  const setTf = (m) => { R.tfCur = m; setTfS(m); setStepTf(Math.min(m, 1440)); };
  const [demo, setDemo] = useState(true);
  const qty = cfg.qty, setQty = (v) => setCfg({ ...R.cfg, qty: v });
  const risk = cfg.risk, setRisk = (v) => setCfg({ ...R.cfg, risk: v });
  const slP = cfg.slP, setSlP = (v) => setCfg({ ...R.cfg, slP: v });
  const rr = cfg.rr, setRr = (v) => setCfg({ ...R.cfg, rr: v });
  const cap = cfg.cap, setCap = (v) => setCfg({ ...R.cfg, cap: v });
  const [panel, setPanel] = useState(false);
  const [histM, setHistM] = useState("cur");
  const [barPos, setBarPos] = useState(null);
  const [tab, setTab] = useState("pos");
  const [msg, setMsg] = useState("");
  const [tz, setTzS] = useState(() => { try { return localStorage.getItem("tjp_tv_tz") || "ny"; } catch (e) { return "ny"; } });
  const setTz = (v) => { setTzS(v); R.tz = v; try { localStorage.setItem("tjp_tv_tz", v); } catch (e) {} };
  if (R.tz === undefined) R.tz = tz;
  const setLegend = (b) => { R.legBar = b; if (R.setLeg) R.setLeg(b); }; /* légende OHLC : petit composant à part, le graphique ne se re-rend plus quand la souris bouge */
  const [fs, setFsS] = useState(false); const [zen, setZen] = useState(false);
  const setFs = (v) => { setZen(false); setFsS(v); };
  const [live, setLive] = useState(false);
  const [magnet, setMagnetS] = useState(false);
  const [groupLast, setGroupLast] = useState({});
  const hideFlat = cfg.hideFlat, setHideFlat = (v) => setCfg({ ...R.cfg, hideFlat: v });
  const [fly, setFly] = useState(null);
  const [fav, setFav] = useState(tvLoadFav);
  const [drawSet, setDrawSet] = useState(-1);
  const [favOpen, setFavOpen] = useState(true);
  const [favPos, setFavPos] = useState({ x: 10, y: 110 });
  const [stay, setStay] = useState(false);
  const [sess, setSessS] = useState(tvLoadSess);
  const [showSet, setShowSet] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [ctx, setCtx] = useState(null);
  const [unseen, setUnseen] = useState(0);
  const [indOpen, setIndOpen] = useState(false);
  const [layMenu, setLayMenu] = useState(false);
  const [modeMenu, setModeMenu] = useState(false);
  const [sessM, setSessMS] = useState(null); R.sessM = sessM; /* mode session : asia | london | ny */
  const [exam, setExam] = useState(null); R.exam = exam; /* mode examen */
  const [trashM, setTrashM] = useState(null); /* menu poubelle comme TradingView */
  const [trLock, setTrLock] = useState(() => { try { return localStorage.getItem("tjp_tv_trlock") !== "0"; } catch (e) { return true; } });
  const [indFav, setIndFav] = useState(() => { try { return JSON.parse(localStorage.getItem("tjp_tv_indfav")) || []; } catch (e) { return []; } });
  const togFav = (n) => setIndFav((f) => { const v = f.includes(n) ? f.filter((x) => x !== n) : [...f, n]; try { localStorage.setItem("tjp_tv_indfav", JSON.stringify(v)); } catch (e) {} return v; });
  const [selBar, setSelBar] = useState(false);
  const [tfMenu, setTfMenu] = useState(false);
  const [botOn, setBotOn] = useState(false);
  const [rectKind, setRectKindS] = useState(() => { try { return localStorage.getItem("tjp_tv_rk") || "OB"; } catch (e) { return "OB"; } });
  const [rayKind, setRayKindS] = useState(() => { try { return localStorage.getItem("tjp_tv_yk") || "SSL"; } catch (e) { return "SSL"; } });
  const setRectKind = (k) => { setRectKindS(k); R.rectKind = k; try { localStorage.setItem("tjp_tv_rk", k); } catch (e) {} };
  const [lineKind, setLineKindS] = useState(() => { try { return localStorage.getItem("tjp_tv_lk") || "none"; } catch (e) { return "none"; } });
  const setLineKind = (k) => { setLineKindS(k); R.lineKind = k; try { localStorage.setItem("tjp_tv_lk", k); } catch (e) {} };
  if (R.lineKind === undefined) R.lineKind = lineKind;
  const setRayKind = (k) => { setRayKindS(k); R.rayKind = k; try { localStorage.setItem("tjp_tv_yk", k); } catch (e) {} };
  if (R.rectKind === undefined) { R.rectKind = rectKind; R.rayKind = rayKind; }
  const pickTool = (id) => { const g = TV_GROUPS.find((x) => x.items.includes(id)); if (g) setGroupLast((o) => ({ ...o, [g.id]: id })); R.pend = null; setTool(id); };
  const setMagnet = (v) => { R.magnet = v; setMagnetS(v); };
  const setTool = (t) => { R.tool = t; setToolS(t); }; R.setToolX = setTool; R.rerenderX = rerender;
  const tfSec = () => (R.agg ? R.agg.min * 60 : 900);

  /* ---------- graphique ---------- */
  useEffect(() => {
    const ch = createChart(boxRef.current, {
      autoSize: true,
      layout: { background: { color: TV.bg }, textColor: TV.text, fontSize: 12, fontFamily: TV_FONT },
      grid: { vertLines: { color: "#f0f3fa", visible: !!R.cfg.grid }, horzLines: { color: "#f0f3fa", visible: !!R.cfg.grid } },
      crosshair: { mode: 0, vertLine: { color: "#9598a1", style: 3, labelBackgroundColor: TV.text }, horzLine: { color: "#9598a1", style: 3, labelBackgroundColor: TV.text } },
      rightPriceScale: { borderColor: TV.border, scaleMargins: { top: 0.12, bottom: 0.1 } },
      timeScale: { borderColor: TV.border, timeVisible: true, secondsVisible: false, rightOffset: 32, barSpacing: 7, tickMarkFormatter: (t, type) => tvFmtTime(t, R.tz, type) },
      localization: { locale: "fr-FR", timeFormatter: (t) => tvFmtTime(t, R.tz, "full") },
    });
    const se = ch.addCandlestickSeries({ priceLineVisible: false, upColor: R.cfg.up, downColor: R.cfg.down, borderUpColor: R.cfg.down, borderDownColor: R.cfg.down, wickUpColor: R.cfg.down, wickDownColor: R.cfg.down, priceFormat: { type: "price", precision: TV_DIG, minMove: 0.00001 } });
    R.chart = ch; R.series = se;
    ch.subscribeCrosshairMove((p) => {
      if (!R.agg) return; let b = p && p.time !== undefined ? p.seriesData.get(se) : null;
      if (!b) b = liveBar();
      if (b && (b.time !== R.legT || b.close !== R.legC)) { R.legT = b.time; R.legC = b.close; setLegend(b); } /* légende : re-rendu seulement quand la bougie change */
    });
    /* calque redessiné seulement quand quelque chose a changé (au lieu de 60 fois par seconde) */
    ch.timeScale().subscribeVisibleLogicalRangeChange(() => { R.dirty = true; });
    const ro = new ResizeObserver(() => { R.dirty = true; }); ro.observe(boxRef.current);
    const mark = () => { R.dirty = true; }; boxRef.current.addEventListener("wheel", mark, { passive: true });
    /* échelle de prix glissée / zoomée : aucun événement côté graphique, on surveille donc l'échelle à chaque image (très léger) */
    const viewSig = () => { try { const vr = ch.timeScale().getVisibleLogicalRange(); return se.coordinateToPrice(0) + "|" + se.coordinateToPrice(400) + "|" + (vr ? vr.from + "," + vr.to : ""); } catch (e) { return ""; } };
    R.dirty = true; let raf; const loop = () => { const vs = viewSig(); if (vs !== R.vSig) { R.vSig = vs; R.dirty = true; } if (R.dirty) { R.dirty = false; R.after = 1; drawOverlay(); } else if (R.after > 0) { R.after--; drawOverlay(); } raf = requestAnimationFrame(loop); }; loop();
  return () => { cancelAnimationFrame(raf); ro.disconnect(); ch.remove(); R.chart = null; };
  }, []);

  useEffect(() => { R.dirty = true; }, [cfg]);
  useEffect(() => {
    if (!R.chart) return;
    R.chart.applyOptions({ grid: { vertLines: { visible: !!cfg.grid }, horzLines: { visible: !!cfg.grid } } });
    R.series.applyOptions({ upColor: cfg.up, downColor: cfg.down, borderUpColor: cfg.down, borderDownColor: cfg.down, wickUpColor: cfg.down, wickDownColor: cfg.down });
  }, [cfg.grid, cfg.up, cfg.down]);

  /* ---------- sessions de backtest ---------- */
  const curSess = () => sess.list.find((x) => x.id === sess.cur) || sess.list[0];
  const snapSess = (v) => ({ ...v, list: v.list.map((x) => (x.id === v.cur ? { ...x, ci: R.ci, ciT: R.rows ? R.rows[R.ci][0] : x.ciT, tf: R.tfCur || tf, draws: R.draws, trades: R.trades, years: R.years || [], seq: R.seq || 0, archive: R.archive || [], prop: R.prop || x.prop || null } : x)) });
  R.snapNow = () => { if (R.rows && !R.demo) tvSaveSess(snapSess(R.sessCur || sess)); };
  R.sessCur = sess;
  useEffect(() => {
    const id = setInterval(() => R.snapNow(), 3000); /* sauvegarde régulière : tu reprends à la même date en revenant */
    const flush = () => { R.snapNow(); tvSync(true); }; const vis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", flush); window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); flush(); window.removeEventListener("beforeunload", flush); window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", vis); };
  }, []);
  const openSess = (id, base) => {
    const v = snapSess(base || sess); const n = { ...v, cur: id }; setSessS(n); tvSaveSess(n);
    const c = n.list.find((x) => x.id === id); setPlaying(false);
    R.trades = c.trades || []; R.draws = c.draws || []; R.years = c.years || []; R.archive = c.archive || []; R.seq = c.seq ?? null; R.sel = -1; R.selTr = null; R.prop = c.prop || null; R.missPtr = null;
    R.ci = c.ciT != null ? Math.max(50, tvBsRows(R.rows, c.ciT)) : c.ci != null && c.ci < R.rows.length ? c.ci : Math.min(R.rows.length - 1, 2000 + Math.floor(Math.random() * Math.max(1, R.rows.length - 4000)));
    if (c.tf && c.tf !== tf) setTf(c.tf); else rebuild(c.tf || tf, true);
  };
  const createSess = (title, mode, date, ex = {}) => {
    const id = "s" + Date.now(); let ci = null; if (ex.blind) mode = "random";
    if (mode === "date" && date) { const t = Date.parse(date + "T00:00:00Z") / 1000; const i = R.rows.findIndex((r) => r[0] >= t); ci = i < 0 ? R.rows.length - 1 : Math.max(50, i); }
    const base = snapSess(sess); base.list = [...base.list, { id, title: title || (ex.prop ? "Challenge " + (ex.prop.size / 1000) + "k" : "Session " + (base.list.length + 1)), ci, tf, draws: [], trades: [], blind: !!ex.blind, noSave: !!ex.noSave, prop: ex.prop ? { ...ex.prop, phase: 0, status: "on", phaseT: 0, hist: [], tries: 1 } : null }];
    openSess(id, base); setShowNew(false);
  };
  const delSess = (id) => { if (sess.list.length < 2) return; const v = snapSess(sess); v.list = v.list.filter((x) => x.id !== id); if (v.cur === id) { openSess(v.list[0].id, v); } else { setSessS(v); tvSaveSess(v); } };

  /* ---------- données ---------- */
  const load = async () => {
    const real = await tvAutoLoad(setMsg); const d = real ? { rows: real } : null;
    if (d && d.rows && d.rows.length) { R.rows = d.rows; setDemo(false); } else { R.rows = tvDemo(); setDemo(true); }
    R.demo = !(d && d.rows && d.rows.length);
    const c = curSess(); R.trades = (!R.demo && c.trades) || []; R.draws = (!R.demo && c.draws) || []; R.years = (!R.demo && c.years) || []; R.archive = (!R.demo && c.archive) || []; R.seq = (!R.demo && c.seq) ?? null; R.prop = (!R.demo && c.prop) || null;
    R.ci = !R.demo && c.ciT != null ? Math.max(50, tvBsRows(R.rows, c.ciT)) : !R.demo && c.ci != null && c.ci < R.rows.length ? c.ci : Math.min(R.rows.length - 1, 600);
    rebuild(tf, true);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (R.rows) rebuild(tf, false); }, [tf, hideFlat]);
  useEffect(() => { R.tz = tz; if (R.chart) R.chart.applyOptions({}); if (R.chart) R.chart.timeScale().applyOptions({ tickMarkFormatter: (t, type) => tvFmtTime(t, R.tz, type) }); }, [tz]);

  function liveBar() {
    const A = R.agg; if (!A || R.k < 0) return null; const i0 = A.start[R.k];
    let L = R.lb; /* bougie en formation mise à jour de façon incrémentale */
    if (!L || L.A !== A || L.k !== R.k || L.i > R.ci) { L = R.lb = { A, k: R.k, i: i0 - 1, h: -1e9, l: 1e9 }; }
    for (let i = L.i + 1; i <= R.ci; i++) { const r = R.rows[i]; if (r[2] > L.h) L.h = r[2]; if (r[3] < L.l) L.l = r[3]; }
    L.i = R.ci;
    return { time: A.bars[R.k].time + R.off, open: R.rows[i0][1], high: L.h, low: L.l, close: R.rows[R.ci][4] };
  }
  /* rafraîchit l'interface au plus 8 fois par seconde pendant la lecture (le graphique, lui, suit chaque bougie) */
  function uiTick() {
    R.dirty = true; const now = performance.now();
    const go = () => { R.uiT = performance.now(); if (R.unseenAdd) { const n = R.unseenAdd; R.unseenAdd = 0; setUnseen((u) => u + n); } setLegend(liveBar()); force((x) => x + 1); };
    if (now - (R.uiT || 0) > 200) go(); else if (!R.uiPend) R.uiPend = setTimeout(() => { R.uiPend = null; go(); }, 210); /* interface 5 fois/s max, le graphique suit chaque bougie */
  }
  /* nouvelle année : remet Replay Trading à zéro, garde le résultat (les trades sont déjà enregistrés) */
  function yearCheck(t) {
    const y = tvYear(t); if (R.curYear == null) R.curYear = y;
    if (y > R.curYear) {
      if (R.cfg.yearReset) {
        const done = R.trades.filter((x) => x.status === "closed"); const pnl = done.reduce((a, x) => a + x.pnl, 0);
        if (done.length) R.years = [...(R.years || []).filter((x) => x.year !== R.curYear), { year: R.curYear, n: done.length, w: done.filter((x) => x.pnl > 0).length, R: +done.reduce((a, x) => a + x.r, 0).toFixed(2), pnl: +pnl.toFixed(2) }];
        R.archive = [...(R.archive || []), ...done]; R.trades = R.trades.filter((x) => x.status !== "closed");
        if (done.length) R.yearMsg = `Nouvelle année ${y} : Replay Trading remis à zéro. ${R.curYear} : ${done.length} trades, ${done.reduce((a, x) => a + x.r, 0).toFixed(2)} R, ${tvMoney(pnl)} (enregistrés dans Saisie & stats).`;
      }
      R.curYear = y;
    }
  }
  function rebuild(min, scroll) {
    R.off = 0;
    if (!R.aggs || R.aggs.src !== R.rows) R.aggs = { src: R.rows };
    const ak = min + "|" + hideFlat; if (!R.aggs[ak]) R.aggs[ak] = tvBuild(R.rows, min, hideFlat); /* chaque timeframe n'est calculé qu'une fois */
    R.agg = R.aggs[ak]; R.lb = null; R.curYear = tvYear(R.rows[R.ci][0]);
    R.k = tvBs(R.agg.start, R.ci);
    const data = new Array(R.k + 1);
    for (let i = 0; i < R.k; i++) { const b = R.agg.bars[i]; data[i] = { time: b.time + R.off, open: b.open, high: b.high, low: b.low, close: b.close }; }
    data[R.k] = liveBar();
    R.series.setData(data);
    if (scroll) R.chart.timeScale().scrollToRealTime();
    setLegend(liveBar()); rerender();
  }

  /* ---------- moteur de replay ---------- */
  function fill(i) {
    const [t, , h, l] = R.rows[i], sp = TV_SPREAD * TV_PIP;
    for (const tr of R.trades) {
      if (tr.status === "pending") {
        const hit = tr.type === "stp" ? (tr.side > 0 ? h + sp >= tr.entry : l <= tr.entry) : (tr.side > 0 ? l + sp <= tr.entry : h >= tr.entry);
        if (hit) { tr.status = "open"; tr.openT = t; } else continue;
      }
      if (tr.status !== "open") continue;
      const lo = tr.side > 0 ? l : l + sp, hi = tr.side > 0 ? h : h + sp;
      /* BE automatique : quand le prix a fait 50 % du chemin vers le TP, le SL passe à l'entrée */
      if (R.cfg.autoBE && !tr.beDone && tr.sl !== tr.entry) { const lvl = tr.entry + (tr.tp - tr.entry) * (R.cfg.autoBEpct || 50) / 100; if (tr.side > 0 ? hi >= lvl : lo <= lvl) { tr.sl = tr.entry; tr.beDone = true; tr.beAuto = true; continue; } }
      const slHit = tr.side > 0 ? lo <= tr.sl : hi >= tr.sl, tpHit = tr.side > 0 ? hi >= tr.tp : lo <= tr.tp;
      if (slHit || tpHit) closeTrade(tr, slHit ? tr.sl : tr.tp, slHit ? "SL" : "TP", t);
    }
  }
  function closeTrade(tr, px, why, t) {
    tr.status = "closed"; tr.exit = px; tr.closeT = t ?? R.rows[R.ci][0]; tr.reason = why;
    tr.pips = ((px - tr.entry) * tr.side) / TV_PIP; tr.pnl = tr.pips * TV_PIPVAL * tr.lots; tr.r = tr.risk ? tr.pnl / tr.risk : 0;
    R.unseenAdd = (R.unseenAdd || 0) + 1;
    if (R.onSave && !R.demo && !tr.appId && !tr.bot && !(curSess() || {}).bot && !(curSess() || {}).noSave) { tr.appId = uid(); R.saveApp(tr); }
    if (R.prop && !tr.bot) propCheck(tr.closeT);
  }
  function step(n) {
    if (!R.rows) return; const end = Math.min(R.rows.length - 1, R.ci + n);
    while (R.ci < end) {
      R.ci++; fill(R.ci); yearCheck(R.rows[R.ci][0]); if (R.botOn) botTick();
      const k = tvBs(R.agg.start, R.ci);
      if (k !== R.k) { const pb = R.agg.bars[R.k]; R.series.update({ time: pb.time + R.off, open: pb.open, high: pb.high, low: pb.low, close: pb.close }); R.k = k; }
    }
    R.series.update(liveBar());
    missTick(); sessTick(); examTick();
    if (R.ci >= R.rows.length - 1) setPlaying(false);
    if (R.yearMsg) { setMsg(R.yearMsg); R.yearMsg = null; }
    uiTick();
  }
  /* ---------- IA : setups manqués (BISI / SIBI / breakers H1 et H4 dans le sens de la tendance H4, 1er contact) ---------- */
  const missTaken = (c) => [...(R.archive || []), ...R.trades].some((t) => !t.bot && t.side === c.dir && Math.abs((t.openT || t.placedT) - c.t) <= 86400 && t.entry <= Math.max(c.top, c.bot) + 15 * TV_PIP && t.entry >= Math.min(c.top, c.bot) - 15 * TV_PIP);
  const missCalc = () => {
    if (!R.rows || R.demo || R.missAll) return;
    R.missAll = botRun(R.rows, { ...BOT_CFG0, bisi: true, sibi: true, ob: false, bb: true, tfs: [60, 240], trend: true, trendTf: 240, ote: "none", nest: false, kz: false, entry: "edge", rr: 2, be: true, buf: 1, maxSl: 40, minSl: 3, expire: 60, one: false, y0: 2010, y1: 2030 }).sort((a, b) => a.tOut - b.tOut);
    R.missPtr = null; rerender();
  };
  useEffect(() => { if (cfg.miss && !demo && !R.missAll) { setMsg("IA : analyse des setups BISI / SIBI / breakers H1-H4…"); setTimeout(() => { missCalc(); setMsg("IA prête : les setups que tu laisses passer apparaîtront en orange."); }, 30); } }, [cfg.miss, demo]);
  const missList = () => { if (!R.missAll || !R.rows) return []; const MC = R.missCache; if (MC && MC.ci === R.ci && MC.n === R.trades.length + (R.archive || []).length && MC.a === R.missAll) return MC.l; const now = R.rows[R.ci][0]; const l = []; for (const c of R.missAll) { if (c.t > now || c.t < now - 14 * 86400) continue; if (c.tOut <= now && c.r <= 0) continue; if (!missTaken(c)) l.push(c); } l.sort((a, b) => b.t - a.t); R.missCache = { ci: R.ci, n: R.trades.length + (R.archive || []).length, a: R.missAll, l }; return l; };
  function missTick() {
    if (!R.cfg.miss || !R.missAll) return; const now = R.rows[R.ci][0];
    if (R.missPtr == null) { let lo = 0, hi = R.missAll.length; while (lo < hi) { const m = (lo + hi) >> 1; if (R.missAll[m].tOut <= now) lo = m + 1; else hi = m; } R.missPtr = lo; return; }
    while (R.missPtr < R.missAll.length && R.missAll[R.missPtr].tOut <= now) { const c = R.missAll[R.missPtr++]; if (c.r > 0 && !missTaken(c)) R.yearMsg = `🤖 IA : tu as manqué un ${c.kind === "BB" ? "breaker" : c.kind} ${c.tf} ${c.dir > 0 ? "acheteur" : "vendeur"} (${tvFmtTime(c.t, R.tz, "full")}) → ${c.r > 0 ? "+" : ""}${c.r.toFixed(1)} R${c.why === "BE" ? " (BE)" : ""}.`; }
  }
  /* ---------- mode session : on ne voit que la session choisie, puis on saute au jour suivant ---------- */
  const inSess = (m, s) => { const [, a, b] = TV_SESS_MODE[s]; return m >= a && m < b; };
  const nextSessStart = (from, s) => { const a = TV_SESS_MODE[s][1]; for (let j = Math.max(1, from); j < R.rows.length; j++) { const t0 = R.rows[j][0], m = tvNyMin(t0), mp = tvNyMin(R.rows[j - 1][0]), dw = tvNyDow(t0); if (m >= a && (mp < a || t0 - R.rows[j - 1][0] > 6 * 3600) && dw !== 6 && !(dw === 0 && a < 17 * 60)) return j; } return -1; };
  const goSession = (s, fromNext) => { if (!R.rows) return; const i = nextSessStart(fromNext ? R.ci + 4 : Math.max(1, R.ci - 1), s); if (i < 0) { setMsg("Plus de session dans les données."); return; } R.sessWas = true; goToIndex(i); setMsg(`${TV_SESS_MODE[s][0]} : ${tvFmtTime(R.rows[i][0], R.tz, "full")}. L'historique avant reste visible.`); };
  const setSessM = (s) => { setSessMS(s); R.sessM = s; if (s) goSession(s, false); };
  function sessTick() { const s = R.sessM; if (!s || !R.rows) return; const m = tvNyMin(R.rows[R.ci][0]); const ins = inSess(m, s); if (R.sessWas && !ins) { R.sessWas = false; setPlaying(false); R.yearMsg = `Fin de la session ${TV_SESS_MODE[s][0]}. ⏭ pour la journée suivante.`; } else if (ins) R.sessWas = true; }
  /* ---------- mode examen : tes anciens trades au hasard, tu dois les reconnaître ---------- */
  const examStart = () => {
    const app = ((getApp ? getApp() : appTrades) || []).filter((x) => (x.pair || "").toUpperCase() === "EURUSD" && x.status !== "open" && x.resultR != null && x.entryTime);
    const T0 = R.rows[0][0] + 86400 * 3, T1 = R.rows[R.rows.length - 1][0] - 86400 * 2;
    const pool = app.filter((x) => { const s = Date.parse(x.entryTime) / 1000; return s > T0 && s < T1; });
    if (!pool.length) { setMsg("Pas encore de trades EURUSD à rejouer."); return; }
    const q = [...pool].sort(() => Math.random() - 0.5).slice(0, 10).map((x) => ({ id: x.id, t: Math.floor(Date.parse(x.entryTime) / 1000), dir: x.direction === "long" ? 1 : -1, r: Number(x.resultR) || 0, entry: Number(x.entryPrice) || null }));
    const id = (sess.list.find((x) => x.title === "Examen") || {}).id; if (!id) createSess("Examen", "random", null, { noSave: true }); else if (id !== sess.cur) openSess(id);
    setTimeout(() => { const E = { q, i: 0, score: 0, res: [], phase: "play" }; setExam(E); R.exam = E; examGo(E); }, 120);
  };
  const examGo = (E) => { const it = E.q[E.i]; if (!it) return; R.trades = R.trades.filter((x) => x.status !== "pending"); R.draws = []; goToIndex(tvBsRows(R.rows, it.t - 10 * 3600)); E.t0 = R.trades.length; setMsg(`Examen ${E.i + 1}/${E.q.length} : ${tvFmtTime(it.t, R.tz, "full").split(" ").slice(0, 3).join(" ")}. Prends le trade que tu vois (ou passe).`); };
  const examJudge = () => {
    const E = R.exam; if (!E || E.phase !== "play") return; const it = E.q[E.i]; const mine = R.trades.slice(E.t0).filter((x) => (x.openT || x.placedT) && (x.openT || x.placedT) >= it.t - 11 * 3600 && (x.openT || x.placedT) <= it.t + 6 * 3600);
    const same = mine.find((x) => x.side === it.dir), opp = mine.find((x) => x.side !== it.dir); let txt, ok;
    if (same) { ok = it.r > 0; txt = it.r > 0 ? `✅ Bravo, tu as repris le même trade (${it.r > 0 ? "+" : ""}${it.r.toFixed(1)} R).` : `❌ Même trade, même perte (${it.r.toFixed(1)} R). Qu'est-ce qui aurait dû t'arrêter ?`; }
    else if (opp) { ok = it.r < 0; txt = `↔ Tu as pris l'inverse de ton trade d'origine (${it.dir > 0 ? "long" : "short"}, ${it.r.toFixed(1)} R).`; }
    else { ok = it.r <= 0; txt = it.r > 0 ? `❌ Raté : ton trade ${it.dir > 0 ? "long" : "short"} avait fait +${it.r.toFixed(1)} R.` : it.r < 0 ? `✅ Bravo, tu as évité une perte (${it.r.toFixed(1)} R).` : "Ton trade d'origine était BE : passer était aussi bien."; }
    const N = { ...E, phase: "done", score: E.score + (ok ? 1 : 0), res: [...E.res, { ok, txt }], txt }; setExam(N); R.exam = N; setPlaying(false);
  };
  const examNext = () => { const E = R.exam; if (!E) return; const N = { ...E, i: E.i + 1, phase: E.i + 1 >= E.q.length ? "end" : "play", txt: "" }; setExam(N); R.exam = N; if (N.phase === "play") examGo(N); };
  function examTick() { const E = R.exam; if (!E || E.phase !== "play") return; const it = E.q[E.i]; const now = R.rows[R.ci][0]; const open = R.trades.slice(E.t0).some((x) => x.status === "open"); if (now >= it.t + 12 * 3600 && !open) examJudge(); }
  const stepMinutes = () => { const target = R.rows[R.ci][0] + stepTf * 60; let i = R.ci; while (i < R.rows.length - 1 && R.rows[i + 1][0] <= target) i++; step(Math.max(1, i - R.ci)); };
  useEffect(() => { if (!playing) return; const id = setInterval(stepMinutes, TV_SPEEDS.find((s) => s[0] === spd)[1]); return () => clearInterval(id); }, [playing, spd, stepTf, tf]);
  /* ---------- bot en direct : les trades du bot apparaissent quand le replay arrive à leur heure ---------- */
  const kindPd = { BISI: "BISI", SIBI: "SIBI", OB: "OB", BB: "Breaker Block" };
  function botTick() {
    const Q = R.botQ; if (!Q) return; const now = R.rows[R.ci][0];
    while (R.botPtr < Q.length && Q[R.botPtr].t <= now) {
      const q = Q[R.botPtr++]; if (R.trades.some((x) => x.bot && x.status !== "closed")) continue;
      if (R.seq == null) R.seq = Math.max(0, ...R.trades.map((x) => x.no || 0)); R.seq += 1;
      const lots = Math.max(0.01, Math.round(((balance() * R.cfg.risk) / 100 / (Math.abs(q.entry - q.sl) / TV_PIP * TV_PIPVAL)) * 100) / 100);
      const tr = { id: Date.now() + Math.random(), no: R.seq, bot: true, pd: [{ tf: q.tf, pd: kindPd[q.kind] || q.kind, auto: true }], riskPct: R.cfg.risk, type: "lmt", side: q.dir, entry: q.entry, sl: q.sl, tp: q.tp, sl0: q.sl, lots, status: "open", openT: q.t, placedT: q.t, anchorT: q.formT, tf: q.tf };
      tr.risk = (Math.abs(q.entry - q.sl) / TV_PIP) * TV_PIPVAL * lots; tr.endT = q.t + 40 * tfSec();
      R.trades.push(tr);
      R.draws.push({ type: "rect", kind: q.kind === "BB" ? "BB" : q.kind, tf: q.tf, bot: true, pts: [{ t: q.formT, p: q.top }, { t: q.t + 20 * tfSec(), p: q.bot }] });
      R.unseenAdd = R.unseenAdd || 0;
    }
  }
  const botResync = () => { if (!R.botQ) return; const now = R.rows[R.ci][0]; let lo = 0, hi = R.botQ.length; while (lo < hi) { const m = (lo + hi) >> 1; if (R.botQ[m].t <= now) lo = m + 1; else hi = m; } R.botPtr = lo; };
  const startBot = () => {
    if (!R.rows || R.demo) { setMsg("Importe tes données Dukascopy pour lancer le bot."); return; }
    const bc = botLoadCfg(); setMsg("Calcul des trades du bot…");
    setTimeout(() => {
      R.botQ = botRun(R.rows, bc).sort((a, b) => a.t - b.t);
      let ses = sess.list.find((x) => x.bot);
      const go = (id, base) => { openSess(id, base); setTimeout(() => { goToIndex(tvBsRows(R.rows, Date.UTC(bc.y0, 0, 2) / 1000)); botResync(); R.botOn = true; setBotOn(true); setStepTf(60); setSpd(5); setPlaying(true); setMsg(`Bot lancé depuis ${bc.y0} : ${R.botQ.length} trades vont se placer pendant le replay. Ils restent à part (pas dans Saisie & stats).`); }, 60); };
      if (ses) go(ses.id);
      else { const id = "s" + Date.now(); const base = snapSess(sess); base.list = [...base.list, { id, title: "🤖 Bot", bot: true, ci: null, tf, draws: [], trades: [] }]; go(id, base); }
    }, 30);
  };
  const stopBot = () => { R.botOn = false; setBotOn(false); setPlaying(false); setMsg("Bot arrêté."); };
  useEffect(() => { const h = () => startBot(); window.addEventListener("tjp-bot-live", h); return () => window.removeEventListener("tjp-bot-live", h); });

  /* aller à un index : en avançant, les positions ouvertes continuent (SL / TP vérifiés sur les bougies sautées) */
  const goToIndex = (i) => {
    i = Math.max(50, Math.min(R.rows.length - 1, i)); setPlaying(false); R.missPtr = null;
    if (i > R.ci && R.trades.some((t) => t.status !== "closed")) { for (let j = R.ci + 1; j <= i; j++) { fill(j); yearCheck(R.rows[j][0]); } }
    else if (i > R.ci) { for (let j = R.ci + 1; j <= i; j += 96) yearCheck(R.rows[j][0]); yearCheck(R.rows[i][0]); }
    R.ci = i; R.curYear = tvYear(R.rows[i][0]); if (R.botQ) botResync();
    if (R.yearMsg) { setMsg(R.yearMsg); R.yearMsg = null; }
    if (R.unseenAdd) { const n = R.unseenAdd; R.unseenAdd = 0; setUnseen((u) => u + n); }
    rebuild(tf, true);
  };
  /* reculer : retire les ordres en attente placés après ce point */
  const stepBack = () => {
    if (!R.rows) return; const target = R.rows[R.ci][0] - stepTf * 60; const i = Math.max(50, tvBsRows(R.rows, target));
    R.trades = R.trades.filter((t) => !(t.status === "pending" && t.placedT > R.rows[i][0]));
    goToIndex(i);
  };
  const jumpTo = (v) => { if (!v || !R.rows) return; let t = Date.parse(v + "T00:00:00Z") / 1000; t -= tvTzOff(t, tz); goToIndex(tvBsRows(R.rows, t)); };
  const randomDate = () => { goToIndex(2000 + Math.floor(Math.random() * Math.max(1, R.rows.length - 4000))); };
  /* avance jusqu'au début de la prochaine killzone activée */
  const nextKz = () => {
    const K = R.cfg.kz; const ses = KZ_SESS.filter(([id]) => K.on[id] && K.times[id]).map(([id]) => tvHm(K.times[id][0])); if (!ses.length) return;
    const mod = (t) => { const loc = t + tvNyOff(t); return Math.floor((((loc % 86400) + 86400) % 86400) / 60); };
    let prev = mod(R.rows[R.ci][0]);
    for (let j = R.ci + 1; j < R.rows.length; j++) { const m = mod(R.rows[j][0]); if (ses.some((a) => (prev < a && m >= a) || (prev > m && (m >= a || prev < a)))) { goToIndex(j); return; } prev = m; }
  };
  const y0 = R.rows ? tvYear(R.rows[Math.min(R.rows.length - 1, 200)][0]) : 0;
  const years = R.rows ? Array.from({ length: tvYear(R.rows[R.rows.length - 1][0]) - y0 + 1 }, (_, i) => y0 + i) : [];

  const openDate = () => { const d = dateRef.current; if (!d) return; try { d.showPicker ? d.showPicker() : d.click(); } catch (err) { d.click(); } };

  /* ---------- ordres ---------- */
  const bid = () => R.rows[R.ci][4], ask = () => R.rows[R.ci][4] + TV_SPREAD * TV_PIP;
  const balance = () => (R.prop ? propState().eq : cap + R.trades.filter((t) => t.status === "closed").reduce((a, t) => a + t.pnl, 0));
  /* ---------- challenge prop firm : Phase 1 -> Phase 2 -> compte financé ---------- */
  const propDay = (t) => Math.floor((t + tvNyOff(t) + 7 * 3600) / 86400); /* journée de trading : 17h New York */
  function propState() {
    const P = R.prop; const l = [...(R.archive || []), ...R.trades].filter((t) => t.status === "closed" && !t.bot && (t.closeT || 0) >= (P.phaseT || 0));
    const pnl = l.reduce((a, t) => a + t.pnl, 0), byDay = {}; l.forEach((t) => { const k = propDay(t.closeT); byDay[k] = (byDay[k] || 0) + t.pnl; });
    let eq = P.size, peak = P.size, low = P.size; [...l].sort((a, b) => a.closeT - b.closeT).forEach((t) => { eq += t.pnl; low = Math.min(low, eq); peak = Math.max(peak, eq); });
    const today = R.rows ? byDay[propDay(R.rows[R.ci][0])] || 0 : 0, worst = Math.min(0, ...Object.values(byDay));
    const target = P.phase < P.steps ? (P.phase === 0 ? P.t1 : P.t2) : null;
    return { eq: P.size + pnl, pnl, today, worst, low, target, n: l.length, days: Object.keys(byDay).length };
  }
  function propCheck(t) {
    const P = R.prop; if (!P || P.status !== "on") return; const S = propState();
    if (S.worst <= -P.daily / 100 * P.size) { P.status = "fail"; P.why = `perte journalière de ${P.daily} % dépassée`; R.yearMsg = `❌ Challenge échoué : ${P.why}.`; return; }
    if (S.low <= P.size * (1 - P.max / 100)) { P.status = "fail"; P.why = `perte max de ${P.max} % atteinte`; R.yearMsg = `❌ Challenge échoué : ${P.why}.`; return; }
    if (S.target != null && S.pnl >= S.target / 100 * P.size && S.days >= (P.minDays || 0)) {
      P.hist = [...(P.hist || []), { phase: P.phase, pnl: +S.pnl.toFixed(2), n: S.n, t }]; P.phase += 1; P.phaseT = (t || R.rows[R.ci][0]) + 1;
      R.yearMsg = P.phase >= P.steps ? `🎉 Objectif atteint : compte FINANCÉ de ${tvMoney(P.size)} ! Les pertes max restent actives, ta part des profits est de ${P.split} %.` : `✅ Phase ${P.phase} réussie (+${S.target} %) : passage en Phase ${P.phase + 1}, le solde repart à ${tvMoney(P.size)}.`;
    }
  }
  const propRestart = () => { const P = R.prop; if (!P) return; P.phase = 0; P.status = "on"; P.why = ""; P.phaseT = R.rows[R.ci][0] + 1; P.tries = (P.tries || 1) + 1; P.hist = []; rerender(); };
  /* PD arrays reconnus automatiquement : zone (OB, BISI…) qui contient l'entrée, MSS / BOS tracés récemment */
  const autoPd = (side, entry, t) => {
    const out = [];
    for (const d of R.draws) {
      if (d.type === "rect" && d.kind && TV_PD_MAP[d.kind]) {
        const lo = Math.min(d.pts[0].p, d.pts[1].p) - 0.5 * TV_PIP, hi = Math.max(d.pts[0].p, d.pts[1].p) + 0.5 * TV_PIP;
        if (entry >= lo && entry <= hi && Math.min(d.pts[0].t, d.pts[1].t) <= t) out.push({ tf: d.tf || TV_TFLAB[R.agg.min], pd: TV_PD_MAP[d.kind](side), auto: true });
      }
      if ((d.type === "trend" || d.type === "hline") && d.kind && TV_STRUCT[d.kind]) { const tl = Math.max(...d.pts.map((q) => q.t)); if (tl <= t && t - tl < 3 * 86400) out.push({ tf: d.tf || TV_TFLAB[R.agg.min], pd: d.kind, auto: true }); }
    }
    return out.filter((x, i) => out.findIndex((y) => y.pd === x.pd && y.tf === x.tf) === i);
  };
  /* lots = (capital × stake %) ÷ (SL en pips × valeur du pip) ; EURUSD : 10 $ par pip pour 1 lot */
  const lotsFor = (slPips) => Math.max(0.01, Math.round(((balance() * R.cfg.risk) / 100 / (Math.max(0.1, slPips) * TV_PIPVAL)) * 100) / 100);
  function order(side, opt = {}) {
    if (!R.rows) return;
    const mkt = side > 0 ? ask() : bid();
    const entry = opt.entry ?? mkt; const type = Math.abs(entry - mkt) < TV_PIP * 0.3 ? "mkt" : (side > 0) === (entry < mkt) ? "lmt" : "stp";
    let dist = slP * TV_PIP;
    if (!opt.sl && boxRef.current && R.series) { const h = boxRef.current.clientHeight - 30, top = yToP(0), bot = yToP(h); if (top != null && bot != null) dist = Math.max(dist, Math.round(((top - bot) * 0.1) / TV_PIP * 10) / 10 * TV_PIP); }
    const sl = opt.sl ?? entry - side * dist, tp = opt.tp ?? entry + side * Math.abs(entry - sl) * rr;
    const lots = lotsFor(Math.abs(entry - sl) / TV_PIP); /* calcul automatique : stake % (1 % par défaut), SL, paire, prix */
    if (R.seq == null) R.seq = Math.max(0, ...R.trades.map((x) => x.no || 0));
    R.seq += 1;
    const tr = { id: Date.now() + Math.random(), no: R.seq, pd: [], riskPct: R.cfg.risk, type, side, entry, sl, tp, sl0: sl, lots, status: type === "mkt" ? "open" : "pending", openT: R.rows[R.ci][0], placedT: R.rows[R.ci][0], anchorT: Math.min(opt.at ?? R.rows[R.ci][0], R.rows[R.ci][0]), tf: TV_TFLAB[tf] };
    tr.risk = (Math.abs(entry - sl) / TV_PIP) * TV_PIPVAL * lots;
    tr.pd = autoPd(side, entry, R.rows[R.ci][0]);
    tr.endT = tr.anchorT + 25 * tfSec(); /* largeur fixe comme TradingView */
    { const t0 = R.rows[R.ci][0], win = 20 * 86400, pr = 300 * TV_PIP; /* seulement les dessins proches du trade : 20 jours avant, ±300 pips */
      const near = R.draws.filter((d) => d.type !== "measure" && d.pts.some((q) => Math.abs(q.p - entry) <= pr) && (["hline", "hray"].includes(d.type) || d.pts.some((q) => q.t >= t0 - win && q.t <= t0 + 2 * 86400)));
      tr.drawSnap = JSON.parse(JSON.stringify(near.slice(-40))); }
    R.trades.push(tr); rerender();
  }
  const closeAll = () => { for (const t of R.trades) if (t.status === "open") closeTrade(t, t.side > 0 ? bid() : ask(), "Manuel"); R.trades = R.trades.filter((t) => t.status !== "pending"); if (R.unseenAdd) { setUnseen((u) => u + R.unseenAdd); R.unseenAdd = 0; } rerender(); };
  const closeOne = (t) => { if (t.status === "open") closeTrade(t, t.side > 0 ? bid() : ask(), "Manuel"); else R.trades = R.trades.filter((x) => x !== t); if (R.unseenAdd) { setUnseen((u) => u + R.unseenAdd); R.unseenAdd = 0; } rerender(); };
  const toBE = (t) => { t.sl = t.entry; rerender(); };
  const delTrade = (t, ask = true) => { if (ask && !window.confirm(`Supprimer le trade #${dispNo(t)} ?` + (t.appId ? " Il sera aussi retiré de Saisie & stats." : ""))) return; R.trades = R.trades.filter((x) => x !== t); R.archive = (R.archive || []).filter((x) => x !== t); if (t.appId && onDelete) onDelete(t.appId); rerender(); };

  R.api = { toBE, closeOne, order, setCtx, openSet: () => setShowSet(true) };

  /* ---------- coordonnées ---------- */
  const tToX = (t) => {
    const A = R.agg, ts = R.chart.timeScale(); if (!A) return null;
    const i = tvBsBars(A.bars, t); let lg;
    if (i < 0) lg = (t - A.bars[0].time) / tfSec();
    else if (i >= R.k) lg = R.k + (t - A.bars[R.k].time) / tfSec();
    else lg = i + (t - A.bars[i].time) / ((A.bars[i + 1].time - A.bars[i].time) || tfSec());
    const xk = ts.logicalToCoordinate(R.k), xk1 = ts.logicalToCoordinate(R.k + 1);
    const bs = xk !== null && xk1 !== null ? xk1 - xk : ts.options().barSpacing;
    return xk === null ? null : xk + (lg - R.k) * bs;
  };
  const xToT = (x) => {
    const A = R.agg, lg = R.chart.timeScale().coordinateToLogical(x); if (lg === null) return null;
    const i = Math.floor(lg);
    if (i >= R.k) return A.bars[R.k].time + (lg - R.k) * tfSec();
    if (i < 0) return A.bars[0].time + lg * tfSec();
    return A.bars[i].time + (lg - i) * tfSec();
  };
  const pToY = (p) => R.series.priceToCoordinate(p), yToP = (y) => R.series.coordinateToPrice(y);

  /* ---------- enregistrement dans Saisie & stats (Supabase) ---------- */
  R.saveApp = (tr) => {
    if (!R.onSave || R.demo || !tr.appId || tr.status !== "closed") return;
    const title = (curSess() || {}).title || "Backtest"; const pd = tr.pd || [];
    const byTf = {}; pd.forEach((x) => { (byTf[x.tf] = byTf[x.tf] || []).push(x.pd); });
    const tfSetups = Object.keys(byTf).length ? Object.entries(byTf).map(([tf, setups]) => ({ tf, setups })) : [{ tf: tr.tf, setups: [] }];
    const app = {
      id: tr.appId, accountId: BT_ACC, pair: TV_PAIR, direction: tr.side > 0 ? "long" : "short",
      /* vraie heure UTC : le site en déduit lui-même la session (Asia, London, New York) comme pour tes trades réels */
      entryTime: new Date(tr.openT * 1000).toISOString(), exitTime: new Date(tr.closeT * 1000).toISOString(), timeframe: tr.tf || "H4",
      session: (() => { try { return getSession(new Date(tr.openT * 1000).toISOString()); } catch (e) { return undefined; } })(),
      entryPrice: +tr.entry.toFixed(5), stopLoss: +(tr.sl0 ?? tr.sl).toFixed(5), takeProfit: +tr.tp.toFixed(5), exitPrice: +tr.exit.toFixed(5),
      resultR: tvIsBE(tr) ? 0 : +tr.r.toFixed(2), resultUsd: +tr.pnl.toFixed(2), status: tvIsBE(tr) ? "breakeven" : "closed",
      tags: [...new Set([...pd.map((x) => x.pd), title])].filter(Boolean), notes: null,
      rules: { backtest: true, replay: true, utc: true, savedAt: tr.savedAt || (tr.savedAt = Date.now()), session: title, tradeNo: dispNo(tr), rr: +(Math.abs(tr.tp - tr.entry) / Math.abs(tr.entry - (tr.sl0 ?? tr.sl))).toFixed(2), exitReason: tr.reason, pdArrays: pd, tfSetups, draws: tr.drawSnap || [] },
    };
    try { R.onSave(app); } catch (e) {}
  };
  const addPd = (tr, tf, pd) => { if (!tr || !pd) return; tr.pd = [...(tr.pd || []), { tf, pd }]; R.saveApp(tr); rerender(); };
  const delPd = (tr, i) => { tr.pd = (tr.pd || []).filter((_, j) => j !== i); R.saveApp(tr); rerender(); };
  const dispNo = (tr) => { const l = [...R.trades].sort((a, b) => (a.placedT - b.placedT) || (a.id - b.id)); const i = l.indexOf(tr); return i < 0 ? tr.no || "" : i + 1; };
  const pdText = (tr) => (tr.pd || []).map((x) => x.pd + " " + x.tf).join(", ");

  /* ---------- géométrie d'une position (boîte TP / SL façon TradingView) ---------- */
  function tradeBox(tr) {
    const now = R.rows[R.ci][0];
    const x1 = tToX(tr.anchorT ?? (tr.status === "pending" ? tr.placedT : tr.openT)); if (x1 === null) return null;
    let x2 = tr.endT != null ? tToX(tr.endT) : tr.status === "closed" ? tToX(tr.closeT) : Math.max(tToX(now) + 60, x1 + 160);
    if (x2 === null || x2 < x1 + 30) x2 = x1 + 30;
    return { x1, x2, ye: pToY(tr.entry), ys: pToY(tr.sl), yt: pToY(tr.tp) };
  }

  /* ---------- indicateurs : killzones (heure de New York) ---------- */
  function drawKillzones(c, cw, ch) {
    const K = R.cfg.kz; if (!K.show || !R.agg || R.agg.min > 60) return;
    const ts = R.chart.timeScale(), lr = ts.getVisibleLogicalRange(); if (!lr) return;
    const from = Math.max(0, Math.floor(lr.from)), to = Math.min(R.k, Math.ceil(lr.to)); const A = R.agg, now = R.rows[R.ci][0];
    const bs = (ts.logicalToCoordinate(1) - ts.logicalToCoordinate(0)) || 6; const alpha = Math.max(0.03, 1 - K.transp / 100);
    const ses = KZ_SESS.filter(([id]) => K.on[id] && K.times[id]).map(([id, n]) => ({ id, n, a: tvHm(K.times[id][0]), b: tvHm(K.times[id][1]) || 1440 }));
    const inS = (m, s) => (s.a < s.b ? m >= s.a && m < s.b : m >= s.a || m < s.b);
    for (const s of ses) {
      let run = null;
      const flush = () => {
        if (!run) return; const xa = ts.logicalToCoordinate(run.i0) - bs / 2, xb = ts.logicalToCoordinate(run.i1) + bs / 2, ya = pToY(run.h), yb = pToY(run.l);
        const col = K.color[s.id] || "#2962ff"; c.fillStyle = tvAlpha(col, alpha); c.fillRect(xa, ya, xb - xa, yb - ya);
        c.strokeStyle = tvAlpha(col, Math.min(1, alpha * 4)); c.lineWidth = 1; c.strokeRect(xa, ya, xb - xa, yb - ya);
        if (K.mid) { const ym = pToY((run.h + run.l) / 2); c.setLineDash([4, 3]); c.beginPath(); c.moveTo(xa, ym); c.lineTo(xb, ym); c.stroke(); c.setLineDash([]); }
        if (K.labels) { c.fillStyle = col; c.font = "11px " + TV_FONT; c.fillText(s.n, xa + 2, ya - 4); }
        run = null;
      };
      for (let i = from; i <= to; i++) {
        const t = A.bars[i].time; if (now - t > K.days * 86400) { continue; }
        const loc = t + tvNyOff(t), m = Math.floor((((loc % 86400) + 86400) % 86400) / 60);
        if (inS(m, s)) { const b = i === R.k ? liveBar() : A.bars[i]; if (run && i === run.i1 + 1 && t - run.t1 < 6 * 3600) { run.i1 = i; run.t1 = t; run.h = Math.max(run.h, b.high); run.l = Math.min(run.l, b.low); } else { flush(); run = { i0: i, i1: i, t1: t, h: b.high, l: b.low }; } }
        else flush();
      }
      flush();
    }
  }
  /* ---------- indicateurs : structure (swings, BOS / MSS, EQH / EQL, FVG), seulement sur les bougies déjà passées ---------- */
  function structure() {
    const A = R.agg, k = R.k, n = R.cfg.st.len || 3; const key = A.min + "|" + k + "|" + n + "|" + A.bars.length;
    if (R.stc && R.stc.key === key) return R.stc;
    const from = Math.max(0, k - 400), B = A.bars; const sw = [], bos = [], eq = [], fvg = [];
    for (let i = from + n; i <= k - 1 - n; i++) {
      let hi = true, lo = true;
      for (let j = 1; j <= n; j++) { if (B[i].high <= B[i - j].high || B[i].high < B[i + j].high) hi = false; if (B[i].low >= B[i - j].low || B[i].low > B[i + j].low) lo = false; }
      if (hi) sw.push({ i, p: B[i].high, hi: true, conf: i + n }); if (lo) sw.push({ i, p: B[i].low, hi: false, conf: i + n });
    }
    /* cassures : clôture au-delà du dernier swing confirmé. Même sens que la tendance = BOS, sens inverse = MSS */
    let trend = 0, lastH = null, lastL = null, si = 0; const sws = [...sw].sort((a, b) => a.conf - b.conf);
    for (let i = from; i <= k - 1; i++) {
      while (si < sws.length && sws[si].conf <= i) { const w = sws[si++]; if (w.hi) lastH = { ...w, used: false }; else lastL = { ...w, used: false }; }
      if (lastH && !lastH.used && B[i].close > lastH.p) { bos.push({ i0: lastH.i, i1: i, p: lastH.p, up: true, k: trend >= 0 ? "BOS" : "MSS" }); trend = 1; lastH.used = true; }
      if (lastL && !lastL.used && B[i].close < lastL.p) { bos.push({ i0: lastL.i, i1: i, p: lastL.p, up: false, k: trend <= 0 ? "BOS" : "MSS" }); trend = -1; lastL.used = true; }
    }
    const tol = 1.5 * TV_PIP * Math.max(1, Math.sqrt(A.min / 15));
    const H = sw.filter((w) => w.hi), L = sw.filter((w) => !w.hi);
    for (const arr of [H, L]) for (let a = 1; a < arr.length; a++) { const p = arr[a - 1], q = arr[a]; if (Math.abs(p.p - q.p) <= tol && q.i - p.i <= 60) eq.push({ i0: p.i, i1: q.i, p: (p.p + q.p) / 2, hi: q.hi }); }
    for (let i = Math.max(k - 250, 2); i <= k - 1; i++) {
      const minG = TV_PIP * Math.sqrt(A.min / 15);
      if (B[i].low - B[i - 2].high >= minG) fvg.push({ i, top: B[i].low, bot: B[i - 2].high, up: true });
      if (B[i - 2].low - B[i].high >= minG) fvg.push({ i, top: B[i - 2].low, bot: B[i].high, up: false });
    }
    /* FVG encore ouverts : pas recomblés jusqu'à la bougie actuelle */
    const lvb = liveBar(); const open = fvg.filter((f) => { for (let j = f.i + 1; j <= k; j++) { const b = j === k ? lvb : B[j]; if (f.up ? b.low <= f.bot : b.high >= f.top) { f.end = j; return j > k - 40; } } return true; }).slice(-8);
    R.stc = { key, sw: sw.filter((w) => w.i > k - 150), bos: bos.slice(-12), eq: eq.slice(-6), fvg: open };
    return R.stc;
  }
  function drawStructure(c, cw, ch) {
    const S = R.cfg.st; if (!(S.swings || S.bos || S.mss || S.eq || S.fvg) || !R.agg || R.k < 10) return;
    const st = structure(), ts = R.chart.timeScale(), X = (i) => ts.logicalToCoordinate(i), lab = TV_TFLAB[R.agg.min];
    c.font = "11px " + TV_FONT; c.lineWidth = 1;
    if (S.fvg) for (const f of st.fvg) { const xa = X(f.i - 1), xb = f.end != null ? X(f.end) : cw; const ya = pToY(f.top), yb = pToY(f.bot); c.fillStyle = f.up ? "rgba(8,153,129,0.10)" : "rgba(242,54,69,0.10)"; c.fillRect(xa, ya, xb - xa, yb - ya); c.fillStyle = f.up ? TV.green : TV.red; c.fillText(f.up ? "BISI " + lab : "SIBI " + lab, Math.min(xb, cw) - 62, (ya + yb) / 2 + 4); }
    if (S.swings) for (const w of st.sw) { const x = X(w.i), y = pToY(w.p); if (x < 0 || x > cw) continue; c.fillStyle = "#787b86"; c.beginPath(); if (w.hi) { c.moveTo(x, y - 6); c.lineTo(x - 4, y - 12); c.lineTo(x + 4, y - 12); } else { c.moveTo(x, y + 6); c.lineTo(x - 4, y + 12); c.lineTo(x + 4, y + 12); } c.fill(); }
    if (S.eq) for (const q of st.eq) { const xa = X(q.i0), xb = X(q.i1), y = pToY(q.p); c.strokeStyle = "#9c27b0"; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(xa, y); c.lineTo(xb, y); c.stroke(); c.setLineDash([]); c.fillStyle = "#9c27b0"; c.fillText(q.hi ? "EQH" : "EQL", (xa + xb) / 2 - 12, q.hi ? y - 5 : y + 13); }
    for (const b of st.bos) { if (!(b.k === "MSS" ? S.mss : S.bos)) continue; const xa = X(b.i0), xb = X(b.i1), y = pToY(b.p); if (xb < 0) continue; const col = b.k === "MSS" ? TV_STRUCT.MSS : TV_STRUCT.BOS; c.strokeStyle = col; c.setLineDash(b.k === "MSS" ? [] : [4, 3]); c.beginPath(); c.moveTo(xa, y); c.lineTo(xb, y); c.stroke(); c.setLineDash([]); c.fillStyle = col; const t = b.k + " " + lab; c.fillText(t, (xa + xb) / 2 - c.measureText(t).width / 2, b.up ? y - 4 : y + 12); }
  }

  /* ---------- annonces US : NFP calculé (1er vendredi du mois, 8h30 New York) ---------- */
  function newsList() {
    if (R.newsL) return R.newsL; const L = [];
    const at = (d, hm, n) => { const [y, m, dd] = d.split("-").map(Number); const [h, mi] = hm.split(":").map(Number); let t = Date.UTC(y, m - 1, dd, h, mi) / 1000; t -= tvNyOff(t); L.push({ t, n }); };
    for (let y = 2010; y <= 2027; y++) for (let m = 0; m < 12; m++) {
      const d12 = new Date(Date.UTC(y, m - 1, 12)); const sat = Date.UTC(y, m - 1, 12 + (6 - d12.getUTCDay()));
      let rel = new Date(sat + 20 * 86400000);
      if (rel.getUTCMonth() === 0 && rel.getUTCDate() === 1) rel = new Date(rel.getTime() + 7 * 86400000);
      if (rel.getUTCMonth() === 6 && rel.getUTCDate() === 4) rel = new Date(rel.getTime() - 86400000);
      at(rel.toISOString().slice(0, 10), "08:30", "NFP");
    }
    TV_CPI.forEach((d) => at(d, "08:30", "CPI"));
    TV_FOMC.forEach((x) => { const [d, hm] = x.split("@"); at(d, hm || (d < "2013" ? "14:15" : "14:00"), "FOMC"); });
    R.newsL = L.sort((a, b) => a.t - b.t); return R.newsL;
  }
  function drawNews(c, cw, ch) {
    const on = { NFP: !!R.cfg.news, CPI: !!R.cfg.cpi, FOMC: !!R.cfg.fomc }; if (!(on.NFP || on.CPI || on.FOMC) || !R.agg || R.agg.min > 1440) return;
    const ts = R.chart.timeScale(), lr = ts.getVisibleLogicalRange(); if (!lr) return;
    const A = R.agg, t0 = A.bars[Math.max(0, Math.floor(lr.from))].time, t1 = A.bars[Math.min(R.k, Math.ceil(lr.to))].time + A.min * 60 * 40;
    const col = TV_NEWS_COL; c.font = "600 10px " + TV_FONT;
    const now = R.rows[R.ci][0], lastX = {};
    for (const ev of newsList()) {
      if (!on[ev.n] || ev.t < t0 || ev.t - 86400 > t1 || ev.t - 86400 > now) continue;
      const x = tToX(ev.t); if (x === null || x < -cw || tToX(ev.t - 86400) > cw) continue;
      /* zone mauve façon killzone : les 24 h avant l'annonce */
      { const xa = tToX(ev.t - 86400); if (xa !== null && R.agg.min <= 240) {
        const i0 = tvBsBars(A.bars, ev.t - 86400), i1 = Math.min(R.k, tvBsBars(A.bars, Math.min(ev.t, now))); let hi = -1e9, lo = 1e9;
        for (let q = Math.max(0, i0); q <= i1; q++) { const b = q === R.k ? liveBar() : A.bars[q]; if (b.high > hi) hi = b.high; if (b.low < lo) lo = b.low; }
        if (hi > lo) { const ya = pToY(hi), yb = pToY(lo), xb = Math.min(x, tToX(now)); c.fillStyle = tvRgba(col[ev.n], 0.08); c.fillRect(xa, ya, xb - xa, yb - ya); c.strokeStyle = tvRgba(col[ev.n], 0.5); c.lineWidth = 1; c.strokeRect(xa, ya, xb - xa, yb - ya); c.fillStyle = "#9c27b0"; c.font = "11px " + TV_FONT; c.fillText(ev.n + " J-1", xa + 2, ya - 4); c.font = "600 10px " + TV_FONT; }
      } }
      c.globalAlpha = ev.t > now ? 0.55 : 1; /* à venir = plus pâle (comme un calendrier économique) */
      c.strokeStyle = col[ev.n]; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(x, 18); c.lineTo(x, ch); c.stroke(); c.setLineDash([]);
      c.fillStyle = col[ev.n]; c.fillText(ev.n, x - c.measureText(ev.n).width / 2, 14 + (lastX[ev.n] && Math.abs(lastX[ev.n] - x) < 30 ? 11 : 0)); lastX[ev.n] = x;
      c.globalAlpha = 1;
    }
  }

  /* ---------- indicateurs : PDH / PDL / PWH / PWL ---------- */
  function drawLevels(c, cw, ch) {
    const L = R.cfg.lv; if (!(L.pd || L.pw) || !R.rows) return;
    const key = R.rows.length + "|" + R.cfg.hideFlat;
    if (!R.lvc || R.lvc.key !== key) R.lvc = { key, D: tvBuild(R.rows, 1440, R.cfg.hideFlat), W: tvBuild(R.rows, 10080, R.cfg.hideFlat) };
    const one = (A, col, hiName, loName) => {
      const k = tvBs(A.start, R.ci); if (k < 1) return; const pb = A.bars[k - 1];
      const xa = Math.max(0, tToX(pb.time) ?? 0), xb = cw; if (xa >= cw) return;
      c.setLineDash([6, 4]); c.lineWidth = 1; c.strokeStyle = col; c.fillStyle = col; c.font = "12px " + TV_FONT;
      for (const [p, n, up] of [[pb.high, hiName, true], [pb.low, loName, false]]) {
        if (L[n.toLowerCase()] === false) continue;
        const y = pToY(p); if (y === null) continue; c.beginPath(); c.moveTo(xa, y); c.lineTo(xb, y); c.stroke();
        const w = c.measureText(n).width; const xm = Math.min(cw - w - 70, Math.max(xa + 4, (xa + xb) / 2 - w / 2)); c.fillText(n, xm, up ? y - 6 : y + 15);
      }
      c.setLineDash([]);
    };
    if (L.pw) one(R.lvc.W, L.pwColor, "PWH", "PWL");
    if (L.pd) one(R.lvc.D, L.pdColor, "PDH", "PDL");
  }

  /* ---------- calque de dessin (positions, outils) ---------- */
  function drawOverlay() {
    const cv = ovRef.current, box = boxRef.current; if (!cv || !box || !R.chart || !R.agg || !R.rows) return;
    const W = box.clientWidth, H = box.clientHeight, d = window.devicePixelRatio || 1; if (!W || !H) return; /* onglet caché */
    if (cv.width !== W * d || cv.height !== H * d) { cv.width = W * d; cv.height = H * d; }
    /* taille affichée = taille du graphique (sinon décalage en 2 graphiques sur écran Retina) */
    if (cv.style.width !== W + "px" || cv.style.height !== H + "px") { cv.style.width = W + "px"; cv.style.height = H + "px"; }
    const c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
    const psw = R.chart.priceScale("right").width(), tsh = R.chart.timeScale().height(); const cw = W - psw, ch = H - tsh;
    c.save(); c.beginPath(); c.rect(0, 0, cw, ch); c.clip();
    c.font = "12px " + TV_FONT;
    const now = R.rows[R.ci][0], tagList = [];
    /* couche fixe (killzones, niveaux, structure, news, setups manqués) : calculée une seule fois par vue,
       puis simplement recopiée quand seule la souris bouge -> beaucoup plus fluide avec tous les indicateurs */
    { const ts = R.chart.timeScale(), vr = ts.getVisibleLogicalRange();
      const key = [W, H, d, vr ? vr.from.toFixed(3) : "", vr ? vr.to.toFixed(3) : "", R.series.coordinateToPrice(0), R.series.coordinateToPrice(ch), R.ci, R.cfg.savedAt, R.tz, R.agg.min, R.missAll ? R.missAll.length : 0, R.trades.length, R.archive ? R.archive.length : 0, TV_BLIND].join("|");
      if (!R.stC) R.stC = document.createElement("canvas");
      if (R.stKey !== key) { const sc = R.stC; if (sc.width !== W * d || sc.height !== H * d) { sc.width = W * d; sc.height = H * d; } const c0 = c;
        { const c = sc.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H); c.save(); c.beginPath(); c.rect(0, 0, cw, ch); c.clip(); c.font = "12px " + TV_FONT;
    drawKillzones(c, cw, ch); drawLevels(c, cw, ch); drawStructure(c, cw, ch); drawNews(c, cw, ch);
        if (R.cfg.miss && R.missAll) for (const m of missList()) { /* setups manqués : rectangle orange pointillé */
          const xa = tToX(m.formT), xb = tToX(Math.min(m.tOut, now)); if (xa == null && xb == null) continue; const X1 = xa ?? 0, X2 = Math.max(X1 + 6, xb ?? cw), y1 = pToY(m.top), y2 = pToY(m.bot); if (y1 == null || y2 == null) continue;
          c.fillStyle = "rgba(255,152,0,0.10)"; c.fillRect(X1, Math.min(y1, y2), X2 - X1, Math.abs(y2 - y1)); c.setLineDash([4, 3]); c.strokeStyle = "#ff9800"; c.lineWidth = 1; c.strokeRect(X1, Math.min(y1, y2), X2 - X1, Math.abs(y2 - y1)); c.setLineDash([]);
          c.font = "11px " + TV_FONT; c.fillStyle = "#e65100"; c.fillText(`Manqué ${m.kind === "BB" ? "Breaker" : m.kind} ${m.tf} · ${m.tOut <= now ? (m.r > 0 ? "+" : "") + m.r.toFixed(1) + " R" : "en cours"}`, X1 + 3, Math.min(y1, y2) - 3);
        }
            c.restore(); }
        R.stKey = key; void c0; }
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(R.stC, 0, 0); c.restore(); }
    /* positions longues / courtes façon TradingView */
    c.font = "12px " + TV_FONT;
    for (const tr of R.trades) {
      if (tr.status === "closed" && (!R.cfg.showClosed || tr.hidden)) continue; /* TP / SL / BE : la boîte disparaît du graphique, le trade reste dans Replay Trading */
      const B = tradeBox(tr); if (!B || B.ye === null) continue; const { x1, x2, ye, ys, yt } = B;
      const closed = tr.status === "closed"; c.globalAlpha = closed ? 0.5 : 1;
      c.fillStyle = "rgba(8,153,129,0.18)"; c.fillRect(x1, Math.min(ye, yt), x2 - x1, Math.abs(yt - ye));
      c.fillStyle = "rgba(242,54,69,0.18)"; c.fillRect(x1, Math.min(ye, ys), x2 - x1, Math.abs(ys - ye));
      if (tr.status === "open") { const xn = Math.min(x2, tToX(now)), pn = tr.side > 0 ? bid() : ask(), yn = pToY(pn); c.fillStyle = (pn - tr.entry) * tr.side >= 0 ? "rgba(8,153,129,0.22)" : "rgba(242,54,69,0.22)"; c.fillRect(x1, Math.min(ye, yn), xn - x1, Math.abs(yn - ye)); c.setLineDash([4, 4]); c.strokeStyle = "#787b86"; c.lineWidth = 1; c.beginPath(); c.moveTo(x1, ye); c.lineTo(xn, yn); c.stroke(); c.setLineDash([]); }
      if (closed) { c.setLineDash([4, 4]); c.strokeStyle = "#787b86"; c.lineWidth = 1; c.beginPath(); c.moveTo(x1, ye); c.lineTo(tToX(tr.closeT), pToY(tr.exit)); c.stroke(); c.setLineDash([]); }
      c.strokeStyle = TV.text; c.lineWidth = 1; c.beginPath(); c.moveTo(x1, ye); c.lineTo(x2, ye); c.stroke();
      if (R.selTr === tr) { c.strokeStyle = TV.blue; c.lineWidth = 1; c.setLineDash([3, 3]); c.strokeRect(x1, Math.min(ys, yt), x2 - x1, Math.abs(ys - yt)); c.setLineDash([]); }
      c.globalAlpha = 1;
      const hov = R.mouse && R.mouse.x >= x1 - 6 && R.mouse.x <= x2 + 6 && R.mouse.y >= Math.min(ys, yt) - 8 && R.mouse.y <= Math.max(ys, yt) + 8;
      if (R.selTr === tr || hov || (R.drag && R.drag.tr === tr)) { /* infos visibles seulement si la position est sélectionnée ou survolée */
        const dTp = Math.abs(tr.tp - tr.entry), dSl = Math.abs(tr.sl - tr.entry), dSl0 = Math.abs((tr.sl0 ?? tr.sl) - tr.entry) || dSl;
        const fx = (v) => v.toFixed(TV_DIG).replace(".", ","), pc = (v) => ((v / tr.entry) * 100).toFixed(3).replace(".", ","), pts = (v) => Math.round(v / 0.00001);
        const usd = (d) => ((d / TV_PIP) * TV_PIPVAL * tr.lots).toFixed(2);
        const lab = (lines, yAnchor, bg, below) => {
          c.font = "13px " + TV_FONT; const w = Math.max(...lines.map((l) => c.measureText(l).width)) + 14, h = lines.length * 17 + 6;
          const xm = Math.max(4, Math.min(cw - w - 4, (x1 + x2) / 2 - w / 2)), y0 = below ? yAnchor + 8 : yAnchor - 8 - h;
          c.fillStyle = bg; c.beginPath(); if (c.roundRect) c.roundRect(xm, y0, w, h, 4); else c.rect(xm, y0, w, h); c.fill();
          c.fillStyle = "#fff"; lines.forEach((l, i) => c.fillText(l, xm + 7, y0 + 16 + i * 17));
        };
        const upTop = tr.side > 0; /* long : cible en haut ; short : cible en bas */
        lab([`Cible: ${fx(dTp)} (${pc(dTp)}%) ${pts(dTp)}, Montant: ${usd(dTp)}`], upTop ? Math.min(yt, ye) : Math.max(yt, ye), TV.green, !upTop);
        lab([dSl < 0.05 * TV_PIP ? "Stop: BE (point d'entrée)" : `Stop: ${fx(dSl)} (${pc(dSl)}%) ${pts(dSl)}, Montant: ${usd(dSl)}`], upTop ? Math.max(ys, ye) : Math.min(ys, ye), TV.red, upTop);
        const pl = closed ? tr.pnl : tr.status === "open" ? (((tr.side > 0 ? bid() : ask()) - tr.entry) * tr.side / TV_PIP) * TV_PIPVAL * tr.lots : 0;
        const dt = tvFmtTime(tr.status === "pending" ? tr.placedT : tr.openT, R.tz, "full");
        const l0 = `#${dispNo(tr)} · ${dt}${(tr.pd || []).length ? " · " + pdText(tr) : ""}`;
        const beTxt = tr.beAuto ? " · BE auto" : "";
        const l1 = tr.status === "pending" ? `En attente, Qté: ${tr.lots.toFixed(2)}` : `${closed ? "Fermé" : "Ouverture"} P&L: ${pl.toFixed(2).replace(".", ",")}, Qté: ${tr.lots.toFixed(2)}`;
        /* comme TradingView : l'info est juste sous la ligne d'entrée (côté stop pour un long, côté cible pour un short) */
        lab([l0 + beTxt, l1, `Ratio Risque/Récompense: ${(dTp / (dSl > TV_PIP * 0.05 ? dSl : dSl0)).toFixed(2).replace(".", ",")}`], ye - 2, tr.status === "pending" ? "#787b86" : pl >= 0 ? TV.green : TV.red, true);
        R.trLabBottom = R.trLabBottom || {}; R.trLabBottom[tr.id] = Math.max(ys, yt) + 36; /* la barre d'actions reste sous le stop */
      }
      if (R.drag && R.drag.tr === tr && (R.drag.kind === "sl" || R.drag.kind === "tp")) {
        const yy = R.drag.kind === "sl" ? ys : yt; c.setLineDash([5, 4]); c.strokeStyle = R.drag.kind === "sl" ? TV.red : TV.green; c.lineWidth = 1;
        c.beginPath(); c.moveTo(0, yy); c.lineTo(x1, yy); c.moveTo(x2, yy); c.lineTo(cw, yy); c.stroke(); c.setLineDash([]);
      }
      if (!closed) {
        tagList.push([tr.tp, TV.green], [tr.entry, "#787b86"], [tr.sl, TV.red]);
        /* poignées : carrés TP / SL dans le coin gauche, ronds à l'entrée (gauche = déplacer, droite = longueur) */
        const sq = (x, y) => { c.fillStyle = "#fff"; c.strokeStyle = TV.blue; c.lineWidth = 1.5; c.fillRect(x - 5, y - 5, 10, 10); c.strokeRect(x - 5, y - 5, 10, 10); };
        const ci = (x, y) => { c.fillStyle = "#fff"; c.strokeStyle = TV.blue; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); c.stroke(); };
        sq(x1, yt); sq(x1, ys); ci(x1, ye); ci(x2, ye);
      }
    }
    /* dessins */
    const all = [...R.draws, ...(R.lastMeasure ? [R.lastMeasure] : []), ...(R.pend ? [R.pend] : [])];
    all.forEach((s, i) => drawShape(c, s, cw, ch, i === R.sel && s !== R.pend));
    const tbr = trBarRef.current;
    if (tbr) {
      const tr = R.selTr && R.trades.includes(R.selTr) ? R.selTr : null; const B = tr && tradeBox(tr);
      if (B && tr.status !== "closed") { const yStopLab = tr.side > 0 ? B.ys + 8 + 23 : B.ys - 8 - 23 - 30; tbr.style.display = "flex"; tbr.style.left = Math.max(4, Math.min(cw - (tbr.offsetWidth || 200) - 4, (B.x1 + B.x2) / 2 - (tbr.offsetWidth || 200) / 2)) + "px"; tbr.style.top = Math.max(4, Math.min(ch - 34, yStopLab + 4)) + "px"; } else tbr.style.display = "none";
    }
    const tb = barRef.current;
    if (tb) {
      const s = R.draws[R.sel];
      const M = R.selOn && R.minis && R.minis.has(R.selOn) ? R.selOn : null; /* sélection faite sur le graphique de droite : la barre s'affiche là-bas */
      if (s && M && !M.drag && !R.hidden) { const bp = M.barPos(s); if (bp) { tb.style.display = "flex"; tb.style.left = bp.x + "px"; tb.style.top = bp.y + "px"; } else tb.style.display = "none"; }
      else if (s && !M && !R.dragS && !R.hidden) { const { x1, y1, x2, y2 } = shapePts(s); const top = Math.min(y1 ?? 40, y2 ?? y1 ?? 40); const left = Math.max(10, Math.min(cw - 260, ((x1 ?? cw / 2) + (x2 ?? x1 ?? cw / 2)) / 2 - 120)); tb.style.display = "flex"; tb.style.left = left + "px"; tb.style.top = Math.max(60, top - 50) + "px"; }
      else tb.style.display = "none";
    }
    /* mesure */
    c.restore();
    /* étiquettes sur l'échelle de prix */
    for (const [p, col] of tagList) { const y = pToY(p); if (y === null || y < 0 || y > ch) continue; c.fillStyle = col; c.fillRect(cw + 1, y - 10, psw - 1, 20); c.fillStyle = "#fff"; c.fillText(p.toFixed(TV_DIG), cw + 6, y + 4); }
  }
  /* ---------- dessins : modèle générique (liste de points {t, p}) ---------- */
  const PX = (pt) => ({ x: tToX(pt.t), y: pToY(pt.p) });
  function shapePts(s) {
    const P = s.pts.map(PX); const xs = P.map((q) => q.x).filter((v) => v !== null), ys = P.map((q) => q.y).filter((v) => v !== null);
    if (s.type === "text" || s.type === "label") { const w = Math.max(40, (s.text || "").length * 7.5 + 16); return { x1: P[0].x, y1: P[0].y - 22, x2: P[0].x + w, y2: P[0].y }; }
    return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  }
  const segDist = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1; const u = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L)); return Math.hypot(px - (x1 + u * dx), py - (y1 + u * dy)); };
  /* prolonge un segment jusqu'au bord du graphique (rayon, ligne étendue) */
  const extend = (a, b, cw, ch, both) => {
    const dx = b.x - a.x, dy = b.y - a.y; if (!dx && !dy) return [a, b]; const big = (cw + ch) * 4 / Math.hypot(dx, dy);
    return [both ? { x: a.x - dx * big, y: a.y - dy * big } : a, { x: b.x + dx * big, y: b.y + dy * big }];
  };
  function chanLines(s) { const a = s.pts[0], b = s.pts[1]; return [[PX(a), PX(b)], [PX({ t: a.t, p: a.p + s.off }), PX({ t: b.t, p: b.p + s.off })]]; }
  function handlesOf(s) {
    const P = s.pts.map(PX);
    if (s.type === "rect") { const [a, b] = P; return [[a.x, a.y, "0"], [b.x, b.y, "1"], [a.x, b.y, "c3"], [b.x, a.y, "c4"], [(a.x + b.x) / 2, a.y, "ey0"], [(a.x + b.x) / 2, b.y, "ey1"], [a.x, (a.y + b.y) / 2, "ex0"], [b.x, (a.y + b.y) / 2, "ex1"]]; }
    if (s.type === "channel") { const [, l2] = chanLines(s); return [[P[0].x, P[0].y, "0"], [P[1].x, P[1].y, "1"], [(l2[0].x + l2[1].x) / 2, (l2[0].y + l2[1].y) / 2, "off"]]; }
    if (s.type === "brush" || s.type === "highlight") return [[P[0].x, P[0].y, "x"], [P[P.length - 1].x, P[P.length - 1].y, "x"]];
    if (s.type === "hline") return [[(boxRef.current.clientWidth - 60) / 2, P[0].y, "0"]];
    if (s.type === "vline") return [[P[0].x, boxRef.current.clientHeight / 2, "0"]];
    return P.map((q, i) => [q.x, q.y, String(i)]);
  }
  function drawShape(c, s, cw, ch, selected) {
    if (R.hidden && s !== R.pend) return;
    const col = s.color || (s.kind && (TV_ZONE[s.kind] || TV_LIQ[s.kind] || TV_STRUCT[s.kind])) || (s.type === "highlight" ? "#f2a636" : TV.blue); const lw = s.w || (s.type === "rect" ? 1 : 1.5);
    c.lineWidth = lw; c.strokeStyle = col; c.fillStyle = col; c.setLineDash(s.dash ? [6, 4] : []);
    const P = s.pts.map(PX); if (P.some((q) => q.x === null || q.y === null) && !["hline", "vline"].includes(s.type)) return;
    const line = (a, b) => { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
    const poly = (pts, close) => { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); if (close) c.closePath(); };
    const font = (px, b) => (c.font = `${b ? "600 " : ""}${px}px ${TV_FONT}`);
    const T = s.type, [a, b] = P;
    if (T === "hline") { line({ x: 0, y: a.y }, { x: cw, y: a.y }); if (s.kind) { font(11, true); c.fillStyle = col; c.fillText(s.kind + (s.tf ? " " + s.tf : ""), cw / 2, a.y - 5); } }
    else if (T === "hray") { line(a, { x: cw, y: a.y }); if (s.kind) { font(11, true); c.fillStyle = col; c.fillText(s.kind, a.x + 2, a.y - 5); } }
    else if (T === "vline") line({ x: a.x, y: 0 }, { x: a.x, y: ch });
    else if (T === "cross") { line({ x: 0, y: a.y }, { x: cw, y: a.y }); line({ x: a.x, y: 0 }, { x: a.x, y: ch }); }
    else if (T === "trend") { line(a, b); if (s.kind) { font(11, true); c.fillStyle = col; const txt = s.kind + (s.tf ? " " + s.tf : ""); c.fillText(txt, (a.x + b.x) / 2 - c.measureText(txt).width / 2, Math.min(a.y, b.y) - 5); } }
    else if (T === "ray") { const [p, q] = extend(a, b, cw, ch, false); line(p, q); }
    else if (T === "ext") { const [p, q] = extend(a, b, cw, ch, true); line(p, q); }
    else if (T === "channel") { const [l1, l2] = chanLines(s); poly([l1[0], l1[1], l2[1], l2[0]], true); c.fillStyle = tvAlpha(col, 0.1); c.fill(); line(l1[0], l1[1]); line(l2[0], l2[1]); c.setLineDash([4, 4]); line({ x: (l1[0].x + l2[0].x) / 2, y: (l1[0].y + l2[0].y) / 2 }, { x: (l1[1].x + l2[1].x) / 2, y: (l1[1].y + l2[1].y) / 2 }); c.setLineDash([]); }
    else if (T === "rect") {
      const L = Math.min(a.x, b.x), Tp = Math.min(a.y, b.y), Wd = Math.abs(b.x - a.x), Hg = Math.abs(b.y - a.y);
      c.fillStyle = tvAlpha(col, s.op ?? 0.13); c.fillRect(L, Tp, Wd, Hg); c.lineWidth = 1; c.strokeStyle = tvAlpha(col, 0.75); c.strokeRect(Math.round(L) + 0.5, Math.round(Tp) + 0.5, Math.round(Wd), Math.round(Hg));
      if (selected) { c.setLineDash([1, 3]); c.strokeStyle = tvAlpha(col, 0.6); c.beginPath(); c.moveTo(L, Tp + Hg / 2); c.lineTo(L + Wd, Tp + Hg / 2); c.stroke(); c.setLineDash([]); }
      if (s.kind) { font(11, true); const txt = s.kind + (s.tf ? " " + s.tf : ""); const w = c.measureText(txt).width; c.fillStyle = col; c.fillText(txt, L + Wd - w - 6, Tp + Hg / 2 + 4); }
    }
    else if (T === "circle") { c.beginPath(); c.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2 || 1, Math.abs(b.y - a.y) / 2 || 1, 0, 0, 7); c.fillStyle = tvAlpha(col, 0.15); c.fill(); c.stroke(); }
    else if (T === "triangle") { poly(P, P.length > 2); c.fillStyle = tvAlpha(col, 0.15); if (P.length > 2) c.fill(); c.stroke(); }
    else if (T === "path") { poly(P, false); c.stroke(); if (P.length > 1) { const p = P[P.length - 2], q = P[P.length - 1], ang = Math.atan2(q.y - p.y, q.x - p.x); c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - 10 * Math.cos(ang - 0.4), q.y - 10 * Math.sin(ang - 0.4)); c.moveTo(q.x, q.y); c.lineTo(q.x - 10 * Math.cos(ang + 0.4), q.y - 10 * Math.sin(ang + 0.4)); c.stroke(); } }
    else if (T === "brush") { c.lineJoin = c.lineCap = "round"; poly(P, false); c.stroke(); }
    else if (T === "highlight") { c.lineJoin = c.lineCap = "round"; c.lineWidth = Math.max(10, lw * 7); c.strokeStyle = tvAlpha(col, 0.35); poly(P, false); c.stroke(); }
    else if (T === "fib" || T === "fibext") {
      const lv = s.lv ? s.lv.filter((l) => l[2]).map((l) => [+l[0], l[1]]) : T === "fib" ? [[1, "#131722"], [0.79, "#131722"], [0.705, "#131722"], [0.62, "#131722"], [0.5, "#131722"], [0, "#131722"]] : [[0, "#787b86"], [0.618, "#089981"], [1, "#787b86"], [1.272, "#2962ff"], [1.618, "#2962ff"], [2, "#9c27b0"], [2.618, "#f23645"]];
      const lvl = (v) => (T === "fib" ? s.pts[1].p + (s.pts[0].p - s.pts[1].p) * v : (s.pts[2] || s.pts[1]).p + (s.pts[1].p - s.pts[0].p) * v);
      const xl = Math.min(...P.map((q) => q.x)), xr = Math.max(...P.map((q) => q.x)) + 40;
      if (T === "fib" && !s.noZone) { const yA = pToY(lvl(0.62)), yB = pToY(lvl(0.79)); c.fillStyle = "rgba(8,153,129,0.10)"; c.fillRect(xl, Math.min(yA, yB), xr - xl, Math.abs(yB - yA)); }
      if (!s.noTrend) { c.setLineDash([4, 3]); c.strokeStyle = "#787b86"; c.lineWidth = 1; poly(P, false); c.stroke(); } c.setLineDash([]); c.lineWidth = s.w || 1; font(11);
      if (T === "fib" || P.length > 2) for (const [v, lc] of lv) { const p = lvl(v), y = pToY(p); c.strokeStyle = lc; line({ x: xl, y }, { x: xr, y }); c.fillStyle = lc; c.fillText(`${v} (${p.toFixed(TV_DIG)})`, xr + 4, y + 4); }
    }
    else if (T === "measure" || T === "pricerange" || T === "daterange") {
      const pips = (s.pts[1].p - s.pts[0].p) / TV_PIP, up = pips >= 0, bars = Math.round((s.pts[1].t - s.pts[0].t) / tfSec());
      const bg = up ? "rgba(41,98,255,0.15)" : "rgba(242,54,69,0.15)", fg = up ? TV.blue : TV.red;
      c.fillStyle = bg; c.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y)); c.strokeStyle = fg; c.lineWidth = 1;
      if (T !== "daterange") line({ x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y });
      if (T !== "pricerange") line({ x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 });
      const txt = T === "pricerange" ? `${pips.toFixed(1)} pips (${((pips * TV_PIP) / s.pts[0].p * 100).toFixed(2)}%)` : T === "daterange" ? `${Math.abs(bars)} barres · ${tvDur(Math.abs(s.pts[1].t - s.pts[0].t))}` : `${pips.toFixed(1)} pips (${((pips * TV_PIP) / s.pts[0].p * 100).toFixed(2)}%) · ${Math.abs(bars)} barres · ${tvDur(Math.abs(s.pts[1].t - s.pts[0].t))}`;
      font(12); const w = c.measureText(txt).width + 14; c.fillStyle = fg; c.fillRect((a.x + b.x) / 2 - w / 2, Math.max(a.y, b.y) + 6, w, 22); c.fillStyle = "#fff"; c.fillText(txt, (a.x + b.x) / 2 - w / 2 + 7, Math.max(a.y, b.y) + 21);
    }
    else if (T === "text") { font(s.size || 14); c.fillStyle = col; c.fillText(s.text || "Texte", a.x, a.y); }
    else if (T === "label") { font(12); const txt = s.text || s.pts[0].p.toFixed(TV_DIG); const w = c.measureText(txt).width + 14; c.fillStyle = col; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x + 8, a.y - 11); c.lineTo(a.x + 8 + w, a.y - 11); c.lineTo(a.x + 8 + w, a.y + 11); c.lineTo(a.x + 8, a.y + 11); c.closePath(); c.fill(); c.fillStyle = "#fff"; c.fillText(txt, a.x + 14, a.y + 4); }
    c.setLineDash([]);
    if (selected) { for (const [hx, hy, m] of handlesOf(s)) { c.fillStyle = "#fff"; c.strokeStyle = TV.blue; c.lineWidth = 1.5; if (/^e[xy]/.test(m)) { c.fillRect(hx - 4.5, hy - 4.5, 9, 9); c.strokeRect(hx - 4.5, hy - 4.5, 9, 9); } else { c.beginPath(); c.arc(hx, hy, 5, 0, 7); c.fill(); c.stroke(); } } }
  }
  function hitShape(p) {
    const box = boxRef.current, cw = box.clientWidth - R.chart.priceScale("right").width(), ch = box.clientHeight;
    const idx = R.draws.map((_, i) => i).reverse(); if (R.sel >= 0) idx.unshift(R.sel); const cand = [];
    for (const i of idx) {
      const s = R.draws[i]; if (!s || s.locked) continue;
      for (const [hx, hy, mode] of handlesOf(s)) if (mode !== "x" && Math.hypot(p.x - hx, p.y - hy) < 8) return { i, mode };
      const P = s.pts.map(PX), T = s.type, [a, b] = P; let hit = false;
      if (T === "hline") hit = Math.abs(p.y - a.y) < 6;
      else if (T === "hray") hit = p.x >= a.x - 4 && Math.abs(p.y - a.y) < 6;
      else if (T === "vline") hit = Math.abs(p.x - a.x) < 6;
      else if (T === "cross") hit = Math.abs(p.y - a.y) < 6 || Math.abs(p.x - a.x) < 6;
      else if (T === "trend") hit = segDist(p.x, p.y, a.x, a.y, b.x, b.y) < 6;
      else if (T === "ray" || T === "ext") { const [u, v] = extend(a, b, cw, ch, T === "ext"); hit = segDist(p.x, p.y, u.x, u.y, v.x, v.y) < 6; }
      else if (T === "path" || T === "brush" || T === "highlight" || T === "triangle" || T === "fibext") { const Q = T === "triangle" ? [...P, P[0]] : P; for (let j = 1; j < Q.length; j++) if (segDist(p.x, p.y, Q[j - 1].x, Q[j - 1].y, Q[j].x, Q[j].y) < (T === "highlight" ? 10 : 6)) hit = true; }
      else if (T === "channel") { const [l1, l2] = chanLines(s); hit = segDist(p.x, p.y, l1[0].x, l1[0].y, l1[1].x, l1[1].y) < 6 || segDist(p.x, p.y, l2[0].x, l2[0].y, l2[1].x, l2[1].y) < 6; if (!hit) { const yA = l1[0].y + ((p.x - l1[0].x) / ((l1[1].x - l1[0].x) || 1)) * (l1[1].y - l1[0].y), yB = yA + (l2[0].y - l1[0].y); hit = p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x) && p.y >= Math.min(yA, yB) && p.y <= Math.max(yA, yB); } }
      else { const bb = shapePts(s); const pad = T === "fib" ? 40 : 0; hit = p.x >= bb.x1 - 4 && p.x <= bb.x2 + pad + 4 && p.y >= bb.y1 - 4 && p.y <= bb.y2 + 4; }
      if (hit) { if (["rect", "circle", "measure", "pricerange", "daterange", "fib", "text", "label"].includes(T)) { const bb = shapePts(s); cand.push({ i, area: Math.abs((bb.x2 - bb.x1) * (bb.y2 - bb.y1)) }); } else return { i, mode: "move" }; }
    }
    if (cand.length) { cand.sort((a, b) => a.area - b.area); return { i: cand[0].i, mode: "move" }; } /* rectangle dans un rectangle : le plus petit est choisi */
    return null;
  }
  /* aimant : colle au plus proche O/H/L/C de la bougie (mode Aimant de TradingView) */
  function snapPt(x, y, force) {
    const t = xToT(x); let pr = yToP(y);
    if ((R.magnet || force) && R.agg) {
      const lg = Math.round(R.chart.timeScale().coordinateToLogical(x));
      if (lg >= 0 && lg <= R.k) { const b = lg === R.k ? liveBar() : R.agg.bars[lg]; let bd = 1e9; for (const v of [b.open, b.high, b.low, b.close]) { const d = Math.abs(pToY(v) - y); if (d < bd) { bd = d; pr = v; } } }
    }
    return { t, p: pr };
  }
  function commit(s) {
    if (s.type === "triangle" && s.pts.length < 3) return;
    if ((s.type === "path") && s.pts.length < 2) return;
    R.draws.push(s); R.sel = R.draws.length - 1; R.redo = []; R.selOn = null;
    if (!R.stay) setTool("cursor"); rerender(); if (R.minis) R.minis.forEach((m) => m.redraw());
  }

  /* ---------- souris : dessins et glisser SL/TP ---------- */
  useEffect(() => {
    const el = boxRef.current;
    const pos = (e) => { const r = el.getBoundingClientRect(); const pt = e.touches ? e.touches[0] : e; return { x: pt.clientX - r.left, y: pt.clientY - r.top }; };
    const hitTrade = ({ x, y }) => {
      for (const tr of R.trades) {
        if (tr.status === "closed") continue; const B = tradeBox(tr); if (!B) continue;
        const near = (hx, hy) => Math.abs(x - hx) < 8 && Math.abs(y - hy) < 8;
        if (near(B.x1, B.yt)) return { tr, kind: "tp" }; if (near(B.x1, B.ys)) return { tr, kind: "sl" };
        if (near(B.x1, B.ye)) return { tr, kind: "move" }; if (near(B.x2, B.ye)) return { tr, kind: "end" };
        if (x < B.x1 - 4 || x > B.x2 + 4) continue;
        if (Math.abs(B.yt - y) < 5) return { tr, kind: "tp" }; if (Math.abs(B.ys - y) < 5) return { tr, kind: "sl" };
        if (tr.status === "pending" && Math.abs(B.ye - y) < 5) return { tr, kind: "move" };
      }
      return null;
    };
    const hitBody = ({ x, y }) => R.trades.slice().reverse().find((tr) => { if (tr.status === "closed" && (!R.cfg.showClosed || tr.hidden)) return false; const B = tradeBox(tr); return B && x >= B.x1 && x <= B.x2 && y >= Math.min(B.ys, B.yt) && y <= Math.max(B.ys, B.yt); });
    const down = (e) => {
      const ae = document.activeElement; if (ae && /SELECT|INPUT/.test(ae.tagName)) ae.blur(); /* le clavier revient au graphique */
      if (!R.agg || (e.button !== undefined && e.button !== 0)) return; const p = pos(e);
      if (R.lastMeasure) R.lastMeasure = null;
      if (p.x > el.clientWidth - R.chart.priceScale("right").width()) return;
      const tool = R.tool;
      if (R.selBar) { e.stopPropagation(); e.preventDefault(); const t = xToT(p.x); R.selBar = false; setSelBar(false); if (t != null) { const i = tvBsRows(R.rows, Math.min(t, R.rows[R.ci][0])); R.trades = R.trades.filter((x) => !(x.status === "pending" && x.placedT > R.rows[i][0])); goToIndex(i); } return; }
      if (tool === "cursor") {
        const th = hitTrade(p);
        if (th) { e.stopPropagation(); e.preventDefault(); R.drag = th; R.selTr = th.tr; R.sel = -1; rerender(); return; }
        const tb = hitBody(p);
        if (tb) { e.stopPropagation(); e.preventDefault(); R.selTr = tb; R.sel = -1; if (tb.status !== "closed") R.drag = { tr: tb, kind: "body" }; rerender(); return; }
        if (R.selTr) { R.selTr = null; rerender(); }
        const sh = R.hidden ? null : hitShape(p);
        if (sh) {
          e.stopPropagation(); e.preventDefault();
          let i = sh.i; if (e.ctrlKey || e.metaKey) { const cp = JSON.parse(JSON.stringify(R.draws[i])); R.draws.push(cp); i = R.draws.length - 1; } /* Ctrl + glisser = cloner */
          R.selOn = null; R.sel = i; R.dragS = { i, mode: sh.mode, x0: p.x, y0: p.y, a0: { t: xToT(p.x), p: yToP(p.y) }, orig: JSON.parse(JSON.stringify(R.draws[i])) }; rerender(); return;
        }
        if (R.sel !== -1) { R.sel = -1; rerender(); }
        return;
      }
      e.stopPropagation(); e.preventDefault();
      const pt = snapPt(p.x, p.y, e.ctrlKey), def = TV_TOOLS[tool];
      if (def.mode === "pos") { order(tool === "long" ? 1 : -1, { entry: pt.p, byRisk: true, at: pt.t }); if (!R.stay) setTool("cursor"); return; }
      if (def.mode === 1) {
        const s = { type: def.as || tool, kind: def.kind || (tool === "hray" && R.rayKind !== "none" ? R.rayKind : undefined) || (tool === "hline" && R.lineKind !== "none" ? R.lineKind : undefined), pts: [pt] };
        if (s.kind && TV_STRUCT[s.kind]) s.tf = TV_TFLAB[R.agg.min];
        if (tool === "text") { const txt = window.prompt("Texte :", "Texte"); if (!txt) return; s.text = txt; }
        commit(s); return;
      }
      if (def.mode === "free") { R.pend = { type: tool, pts: [pt] }; return; }
      if (def.mode === 3 || def.mode === "multi") {
        if (!R.pend) R.pend = { type: tool, pts: [pt, { ...pt }] };
        else { R.pend.pts[R.pend.pts.length - 1] = pt; if (def.mode === 3 && R.pend.pts.length >= 3) { const s = R.pend; R.pend = null; commit(s); return; } R.pend.pts.push({ ...pt }); }
        return;
      }
      const kd = def.kind || (tool === "rect" && R.rectKind !== "none" ? R.rectKind : undefined) || (tool === "trend" && R.lineKind !== "none" ? R.lineKind : undefined);
      R.pend = { type: def.as || tool, kind: kd, tf: kd ? TV_TFLAB[R.agg.min] : undefined, pts: [pt, { ...pt }], drag: true };
      if (tool === "channel") R.pend.off = -20 * TV_PIP;
    };
    const move = (e) => {
      if (!R.agg) return; const p = pos(e); R.mouse = p;
      /* on ne redessine que si quelque chose change sous la souris (survol d'un trade, tracé, glisser) */
      if (R.pend || R.drag || R.dragS || R.tool !== "cursor" || R.lastMeasure || R.selBar) R.dirty = true;
      else { let hk = -1; for (let i = 0; i < R.trades.length; i++) { const tr = R.trades[i]; if (tr.status === "closed" && (!R.cfg.showClosed || tr.hidden)) continue; const B = tradeBox(tr); if (!B || B.ye == null) continue; if (p.x >= B.x1 - 6 && p.x <= B.x2 + 6 && p.y >= Math.min(B.ys, B.yt) - 8 && p.y <= Math.max(B.ys, B.yt) + 8) { hk = i; break; } } if (hk !== R.hovK) { R.hovK = hk; R.dirty = true; } }
      if ((R.dragS || R.drag) && R.minis) R.minis.forEach((m) => m.redraw());
      if (R.drag) {
        e.stopPropagation(); e.preventDefault(); const pr = yToP(p.y); const { tr, kind } = R.drag; if (pr === null) return;
        if (kind === "tp" && (pr - tr.entry) * tr.side > 0) tr.tp = pr;
        if (kind === "sl" && (tr.entry - pr) * tr.side > 0) { tr.sl = pr;
          if (tr.status === "open" && (tr.entry - pr) * tr.side > 0.5 * TV_PIP) { tr.sl0 = pr; tr.risk = (Math.abs(tr.entry - pr) / TV_PIP) * TV_PIPVAL * tr.lots; } /* nouveau stop = nouveau risque : le R reste juste */
          if (tr.status === "pending") { tr.sl0 = pr; tr.lots = Math.max(0.01, Math.round(((balance() * (tr.riskPct ?? R.cfg.risk)) / 100 / (Math.max(0.1, Math.abs(tr.entry - tr.sl) / TV_PIP) * TV_PIPVAL)) * 100) / 100); tr.risk = (Math.abs(tr.entry - tr.sl) / TV_PIP) * TV_PIPVAL * tr.lots; } }
        if (kind === "move" || kind === "body") { /* déplace la boîte où tu veux ; le prix bouge seulement si l'ordre est en attente */
          const D = R.drag; const t = xToT(p.x);
          if (D.t0 == null) { D.t0 = t; D.p0 = pr; D.a0 = tr.anchorT ?? (tr.status === "pending" ? tr.placedT : tr.openT); D.e0 = tr.endT; D.en0 = tr.entry; D.sl0 = tr.sl; D.tp0 = tr.tp; }
          if (t !== null && D.t0 !== null) { const dt = t - D.t0; tr.anchorT = D.a0 + dt; if (D.e0 != null) tr.endT = D.e0 + dt; }
          if (tr.status === "pending") { const d = pr - D.p0; tr.entry = D.en0 + d; tr.sl = D.sl0 + d; tr.tp = D.tp0 + d; tr.sl0 = tr.sl; }
        }
        if (kind === "end") { const t = xToT(p.x); if (t !== null) tr.endT = t; }
        return;
      }
      if (R.dragS) {
        e.stopPropagation(); e.preventDefault();
        const D = R.dragS, s = R.draws[D.i], o = D.orig; if (!s) return;
        const pt = snapPt(p.x, p.y, e.ctrlKey), m = D.mode;
        if (m === "move") {
          let dt = xToT(p.x) - D.a0.t, dp = yToP(p.y) - D.a0.p;
          if (e.shiftKey) { if (Math.abs(p.x - D.x0) > Math.abs(p.y - D.y0)) dp = 0; else dt = 0; } /* Maj = un seul axe */
          if (s.type === "hline") dt = 0; if (s.type === "vline") dp = 0;
          s.pts = o.pts.map((q) => ({ t: q.t + dt, p: q.p + dp }));
        } else if (m === "off") { const a = s.pts[0], b = s.pts[1]; const pl = a.p + ((pt.t - a.t) / ((b.t - a.t) || 1)) * (b.p - a.p); s.off = pt.p - pl; }
        else if (m === "c3") { s.pts[0].t = pt.t; s.pts[1].p = pt.p; }
        else if (m === "c4") { s.pts[1].t = pt.t; s.pts[0].p = pt.p; }
        else if (m === "ey0") s.pts[0].p = pt.p; else if (m === "ey1") s.pts[1].p = pt.p;
        else if (m === "ex0") s.pts[0].t = pt.t; else if (m === "ex1") s.pts[1].t = pt.t;
        else { const j = +m; if (s.type === "hline") s.pts[j].p = pt.p; else if (s.type === "vline") s.pts[j].t = pt.t; else s.pts[j] = pt; }
        return;
      }
      if (R.pend) {
        e.stopPropagation(); e.preventDefault(); const pt = snapPt(p.x, p.y, e.ctrlKey), P = R.pend.pts;
        if (TV_TOOLS[R.pend.type].mode === "free") { const last = PX(P[P.length - 1]); if (Math.hypot(last.x - p.x, last.y - p.y) > 3) P.push(pt); }
        else { P[P.length - 1] = pt; if (e.shiftKey && R.pend.type === "trend") P[1].p = P[0].p; }
        return;
      }
      if (R.tool !== "cursor" || R.selBar) { el.style.cursor = R.selBar ? "col-resize" : "crosshair"; return; }
      const sh = R.hidden ? null : hitShape(p);
      const ht = hitTrade(p); el.style.cursor = ht ? (ht.kind === "move" ? "move" : ht.kind === "end" ? "ew-resize" : "ns-resize") : sh ? (sh.mode === "move" ? "move" : "pointer") : "";
    };
    const up = () => {
      if (R.drag) { R.drag = null; rerender(); }
      if (R.dragS) { R.dragS = null; rerender(); }
      if (R.pend && (R.pend.drag || TV_TOOLS[R.pend.type].mode === "free")) {
        const s = R.pend; R.pend = null; delete s.drag;
        const a = PX(s.pts[0]), b = PX(s.pts[s.pts.length - 1]);
        if (s.pts.length > 1 && Math.hypot(a.x - b.x, a.y - b.y) > 3) { if (s.type === "measure") { R.lastMeasure = s; rerender(); if (!R.stay) setTool("cursor"); } else commit(s); }
        else if (!R.stay) setTool("cursor");
      }
    };
    const dbl = (e) => {
      if (R.pend && TV_TOOLS[R.pend.type].mode === "multi") { e.stopPropagation(); const s = R.pend; R.pend = null; s.pts.pop(); if (s.pts.length > 2 && Math.hypot(PX(s.pts[s.pts.length - 1]).x - PX(s.pts[s.pts.length - 2]).x, 0) < 3) s.pts.pop(); commit(s); return; }
      const sh = hitShape(pos(e)); if (sh && (R.draws[sh.i].type === "text" || R.draws[sh.i].type === "label")) { const s = R.draws[sh.i]; const txt = window.prompt("Texte :", s.text || ""); if (txt !== null) { s.text = txt; rerender(); } }
      else if (sh) { e.stopPropagation(); R.sel = sh.i; setDrawSet(sh.i); }
    };
    const ctxm = (e) => {
      e.preventDefault(); e.stopPropagation(); if (!R.agg) return; const p = pos(e); const pr = yToP(p.y);
      const items = [];
      const trHit = R.trades.find((tr) => { if (tr.status === "closed") return false; const B = tradeBox(tr); return B && p.x >= B.x1 && p.x <= B.x2 && p.y >= Math.min(B.ys, B.yt) - 4 && p.y <= Math.max(B.ys, B.yt) + 4; });
      const sh = !trHit && !R.hidden ? hitShape(p) : null;
      if (trHit) {
        if (trHit.status === "open") items.push(["Stop au point mort (BE)", () => R.api.toBE(trHit)], ["Fermer la position", () => R.api.closeOne(trHit)]);
        else items.push(["Annuler l'ordre", () => R.api.closeOne(trHit)]);
      } else if (sh) {
        R.sel = sh.i; const d = R.draws[sh.i];
        items.push(["Cloner", () => { const c = JSON.parse(JSON.stringify(d)); c.pts = c.pts.map((q) => ({ t: q.t, p: q.p + 5 * TV_PIP })); R.draws.push(c); R.sel = R.draws.length - 1; }], ["Copier", () => { R.clip = JSON.parse(JSON.stringify(d)); }], ["Mettre au premier plan", () => { R.draws.splice(sh.i, 1); R.draws.push(d); R.sel = R.draws.length - 1; }], null, ["Supprimer", () => { R.redo.push(R.draws.splice(sh.i, 1)[0]); R.sel = -1; }, true]);
      } else {
        items.push(["Réinitialiser la vue", () => { R.chart.timeScale().scrollToRealTime(); R.chart.priceScale("right").applyOptions({ autoScale: true }); }], null,
          [(pr < R.rows[R.ci][4] ? "Buy limite à " : "Buy stop à ") + pr.toFixed(TV_DIG), () => R.api.order(1, { entry: pr, byRisk: true, at: xToT(p.x) })], [(pr > R.rows[R.ci][4] ? "Sell limite à " : "Sell stop à ") + pr.toFixed(TV_DIG), () => R.api.order(-1, { entry: pr, byRisk: true, at: xToT(p.x) })],
          ["Ligne horizontale à " + pr.toFixed(TV_DIG), () => { R.draws.push({ type: "hline", pts: [{ t: xToT(p.x), p: pr }] }); }], null,
          ["Copier le prix " + pr.toFixed(TV_DIG), () => { try { navigator.clipboard.writeText(pr.toFixed(TV_DIG)); } catch (er) {} }],
          [R.hidden ? "Afficher les dessins" : "Masquer les dessins", () => { R.hidden = !R.hidden; }], ["Supprimer tous les dessins", () => { R.redo = [...R.draws]; R.draws = []; R.sel = -1; }, true], null,
          ["Paramètres…", () => R.api.openSet()]);
      }
      R.api.setCtx({ x: p.x, y: p.y, items });
    };
    const leave = () => { R.mouse = null; R.dirty = true; };
    el.addEventListener("mousedown", down, true); el.addEventListener("touchstart", down, { capture: true, passive: false });
    el.addEventListener("mousemove", move, true); el.addEventListener("touchmove", move, { capture: true, passive: false });
    el.addEventListener("dblclick", dbl, true); el.addEventListener("contextmenu", ctxm, true);
    window.addEventListener("mouseup", up); window.addEventListener("touchend", up); el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mousedown", down, true); el.removeEventListener("touchstart", down, true); el.removeEventListener("mousemove", move, true); el.removeEventListener("touchmove", move, true); el.removeEventListener("dblclick", dbl, true); el.removeEventListener("contextmenu", ctxm, true); window.removeEventListener("mouseup", up); window.removeEventListener("touchend", up); el.removeEventListener("mouseleave", leave); };
  }, [slP, rr, risk, qty, cap]);

  /* ---------- clavier : raccourcis de TradingView ---------- */
  useEffect(() => {
    const k = (e) => {
      if (e.target.tagName === "SELECT" && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === " ")) { e.preventDefault(); e.target.blur(); }
      else if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      const key = e.key.toLowerCase(), sel = R.draws[R.sel];
      if (R.pend && (e.key === "Enter" || e.key === "Escape") && TV_TOOLS[R.pend.type].mode === "multi") { const s = R.pend; R.pend = null; s.pts.pop(); commit(s); return; }
      if ((key === "delete" || key === "backspace") && R.selTr && !sel) { e.preventDefault(); const t = R.selTr; R.selTr = null; if (t.status === "closed") { t.hidden = true; rerender(); } else delTrade(t); return; }
      if (e.shiftKey && key === "b") { e.preventDefault(); order(1); return; }
      if (e.shiftKey && key === "s") { e.preventDefault(); order(-1); return; }
      if (e.shiftKey && key === "f") { e.preventDefault(); setFs((v) => !v); return; }
      if ((key === "delete" || key === "backspace") && sel) { e.preventDefault(); R.redo.push(R.draws.splice(R.sel, 1)[0]); R.sel = -1; rerender(); return; }
      if (e.key.startsWith("Arrow") && sel && (e.ctrlKey || e.metaKey)) { /* Ctrl + flèches = décaler le dessin sélectionné (→ seul = replay) */
        e.preventDefault(); const dt = e.key === "ArrowRight" ? tfSec() : e.key === "ArrowLeft" ? -tfSec() : 0, dp = e.key === "ArrowUp" ? TV_PIP : e.key === "ArrowDown" ? -TV_PIP : 0;
        sel.pts = sel.pts.map((q) => ({ t: q.t + dt, p: q.p + dp })); rerender(); return;
      }
      if (e.key === "ArrowRight") { e.preventDefault(); stepMinutes(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); stepBack(); return; }
      if (e.shiftKey && e.key === "ArrowDown") { e.preventDefault(); setPlaying((p) => !p); return; }
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); return; }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && /^[a-z]$/.test(e.key)) { const km = R.cfg.keys || tvDefKeys(fav); const id = km[e.key]; if (id && TV_TOOLS[id]) { e.preventDefault(); pickTool(id); return; } }
      if (e.key === "Escape" && (trashM || layMenu || tfMenu || modeMenu)) { setTrashM(null); setLayMenu(false); setTfMenu(false); setModeMenu(false); return; }
      if (e.key === "Escape") { if (R.tool !== "cursor" || R.pend) { setTool("cursor"); R.pend = null; } else if (R.sel !== -1) { R.sel = -1; rerender(); } else setFs(false); return; }
      if (e.altKey && e.shiftKey && key === "r") { e.preventDefault(); setTool("rect"); return; }
      const alt = { t: "trend", h: "hline", v: "vline", c: "cross", f: "fib" };
      if (e.altKey && alt[key]) { e.preventDefault(); setTool(alt[key]); return; }
      if (e.altKey && key === "g") { e.preventDefault(); openDate(); return; }
      if ((e.ctrlKey || e.metaKey) && e.altKey && key === "h") { e.preventDefault(); R.hidden = !R.hidden; rerender(); return; }
      if ((e.ctrlKey || e.metaKey) && key === "c" && sel) { R.clip = JSON.parse(JSON.stringify(sel)); return; }
      if ((e.ctrlKey || e.metaKey) && key === "v" && R.clip) { e.preventDefault(); const c = JSON.parse(JSON.stringify(R.clip)); c.pts = c.pts.map((q) => ({ t: q.t, p: q.p + 5 * TV_PIP })); R.draws.push(c); R.sel = R.draws.length - 1; rerender(); return; }
      if ((e.ctrlKey || e.metaKey) && key === "z") { e.preventDefault(); const d = R.draws.pop(); if (d) R.redo.push(d); R.sel = -1; rerender(); return; }
      if ((e.ctrlKey || e.metaKey) && key === "y") { e.preventDefault(); const d = R.redo.pop(); if (d) R.draws.push(d); rerender(); return; }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  /* ---------- revivre un trade cliqué dans Saisie & stats ---------- */
  useEffect(() => {
    const h = (e) => {
      const { t, session, draws, create, noSave, msg: m } = e.detail || {}; if (!R.rows || R.demo || !t) return false;
      const go = () => {
        if (Array.isArray(draws) && draws.length) { const have = new Set(R.draws.map((d) => JSON.stringify(d.pts) + d.type)); draws.forEach((d) => { if (!have.has(JSON.stringify(d.pts) + d.type)) R.draws.push(d); }); }
        if (t < R.rows[0][0] || t > R.rows[R.rows.length - 1][0]) { setMsg("Ce trade est en dehors de tes données de bougies."); return; }
        goToIndex(tvBsRows(R.rows, t - 86400)); setMsg(m || "Replay repris 24 h avant le trade, avec tes dessins : rejoue-le.");
      };
      const sid = session && sess.list.find((x) => x.title === session);
      if (sid && sid.id !== sess.cur) { openSess(sid.id); setTimeout(go, 60); }
      else if (!sid && session && create) { createSess(session, "random", null, { noSave }); setTimeout(go, 80); }
      else go();
      return true;
    };
    /* demande venue d'une autre page (ex. « Rejouer » sur un trade réel) : exécutée dès que les bougies sont prêtes */
    if (window.TJP_PENDING_GOTO && R.rows && !R.demo) { const d = window.TJP_PENDING_GOTO; window.TJP_PENDING_GOTO = null; setTimeout(() => h({ detail: d }), 30); }
    window.addEventListener("tjp-bt-goto", h); return () => window.removeEventListener("tjp-bt-goto", h);
  });
  /* ---------- effacer une année et recommencer ---------- */
  const clearYear = (y) => {
    const title = curSess().title;
    ((getApp ? getApp() : appTrades) || []).filter((t) => t.accountId === BT_ACC && (t.rules || {}).session === title && new Date(t.entryTime).getUTCFullYear() === y).forEach((t) => onDelete && onDelete(t.id));
    R.years = (R.years || []).filter((x) => x.year !== y);
    R.trades = R.trades.filter((t) => !(t.status === "closed" && tvYear(t.openT) === y));
    goToIndex(tvBsRows(R.rows, Date.UTC(y, 0, 2) / 1000)); setMsg(`Stats ${y} effacées pour « ${title} ». Le replay recommence au début de ${y}.`);
  };

  /* ---------- import ---------- */
  const onFiles = async (files) => {
    let all = [];
    for (const f of files) { setMsg("Lecture de " + f.name + "…"); all = all.concat(tvParse(await f.text())); }
    if (!all.length) { setMsg("Aucune bougie reconnue dans ce fichier."); return; }
    const old = await tvGet(TV_PAIR); const map = new Map(); for (const r of (old && old.rows) || []) map.set(r[0], r); for (const r of all) map.set(r[0], r);
    const rows = [...map.values()].sort((a, b) => a[0] - b[0]);
    await tvPut(TV_PAIR, { rows }); R.agg = null;
    setMsg(`${rows.length.toLocaleString("fr-CA")} bougies importées : ${new Date(rows[0][0] * 1000).toISOString().slice(0, 10)} → ${new Date(rows[rows.length - 1][0] * 1000).toISOString().slice(0, 10)}`);
    await load();
  };

  /* ---------- rendu ---------- */
  const closed = R.trades.filter((t) => t.status === "closed"), opened = R.trades.filter((t) => t.status !== "closed");
  const upnl = opened.filter((t) => t.status === "open").reduce((a, t) => a + (((t.side > 0 ? bid() : ask()) - t.entry) * t.side / TV_PIP) * TV_PIPVAL * t.lots, 0);
  const wins = closed.filter((t) => t.pnl > 0), gw = wins.reduce((a, t) => a + t.pnl, 0), gl = -closed.filter((t) => t.pnl <= 0).reduce((a, t) => a + t.pnl, 0);
  const curT = R.rows ? new Date((R.rows[R.ci][0] + tvTzOff(R.rows[R.ci][0], tz)) * 1000).toISOString().slice(0, 16).replace("T", " ").replace(/^.{10}/, (x) => (TV_BLIND ? "••••-••-••" : x)) : "";
  const tfName = TV_TFS.find((x) => x[1] === tf)[0];
  const sep = <span style={{ width: 1, height: 24, background: TV.border, margin: "0 4px" }} />;
  const inp = { border: `1px solid ${TV.border}`, borderRadius: 4, padding: "4px 6px", fontSize: 13, width: 70, color: TV.text, background: "#fff" };
  const priceBox = (side) => (
    <button onClick={() => order(side)} style={{ background: side > 0 ? TV.blue : TV.red, color: "#fff", border: "none", borderRadius: 4, padding: "3px 10px", cursor: "pointer", textAlign: "center", lineHeight: 1.15, minWidth: 74 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{R.rows ? (side > 0 ? ask() : bid()).toFixed(TV_DIG) : "—"}</div><div style={{ fontSize: 11 }}>{side > 0 ? "BUY" : "SELL"}</div>
    </button>
  );

  { const bl = !!(curSess() || {}).blind; if (TV_BLIND !== bl) { TV_BLIND = bl; setTimeout(() => { if (R.chart) R.chart.timeScale().applyOptions({ tickMarkFormatter: (t, type) => tvFmtTime(t, R.tz, type) }); }, 0); } }
  const H2 = "calc(50% + 2px)", A3 = "calc(66.66% + 2px)", B3 = "calc(33.33% + 2px)";
  /* dispositions comme TradingView (1 à 3 graphiques). Le graphique principal est toujours la 1re case */
  const LAY = {
    "1": [{ inset: 0 }, []],
    "2v": [{ left: 0, top: 0, bottom: 0, right: H2 }, [{ left: "50%", top: 0, bottom: 0, right: 0 }]],
    "2h": [{ left: 0, top: 0, right: 0, bottom: H2 }, [{ left: 0, right: 0, top: "50%", bottom: 0 }]],
    "3c": [{ left: 0, top: 0, bottom: 0, right: A3 }, [{ left: "33.33%", right: B3, top: 0, bottom: 0 }, { left: "66.66%", right: 0, top: 0, bottom: 0 }]],
    "3r": [{ left: 0, right: 0, top: 0, bottom: A3 }, [{ left: 0, right: 0, top: "33.33%", bottom: B3 }, { left: 0, right: 0, top: "66.66%", bottom: 0 }]],
    "3": [{ left: 0, top: 0, bottom: 0, right: H2 }, [{ left: "50%", right: 0, top: 0, bottom: H2 }, { left: "50%", right: 0, top: "50%", bottom: 0 }]],
    "3l": [{ left: 0, top: 0, right: H2, bottom: H2 }, [{ left: 0, right: H2, top: "50%", bottom: 0 }, { left: "50%", right: 0, top: 0, bottom: 0 }]],
    "3t": [{ left: 0, top: 0, right: H2, bottom: H2 }, [{ left: "50%", right: 0, top: 0, bottom: H2 }, { left: 0, right: 0, top: "50%", bottom: 0 }]],
    "3b": [{ left: 0, top: 0, right: 0, bottom: H2 }, [{ left: 0, right: H2, top: "50%", bottom: 0 }, { left: "50%", right: 0, top: "50%", bottom: 0 }]],
  };
  const lay = LAY[cfg.layout] || LAY["1"];
  useEffect(() => { R.dirty = true; }, [cfg.layout]);
  const getAgg = (m) => { if (!R.aggs || R.aggs.src !== R.rows) R.aggs = { src: R.rows }; const ak = m + "|" + hideFlat; if (!R.aggs[ak]) R.aggs[ak] = tvBuild(R.rows, m, hideFlat); return R.aggs[ak]; };
  const propS = R.prop && R.rows ? propState() : null;
  const missL = cfg.miss && R.missAll ? missList() : [];
  const indList = [["Killzones", R.cfg.kz.show, (v) => setCfg({ ...R.cfg, kz: { ...R.cfg.kz, show: v } })],
              ["Swing high / low", R.cfg.st.swings, (v) => setCfg({ ...R.cfg, st: { ...R.cfg.st, swings: v } })],
              ["BOS", R.cfg.st.bos, (v) => setCfg({ ...R.cfg, st: { ...R.cfg.st, bos: v } })],
              ["MSS", R.cfg.st.mss, (v) => setCfg({ ...R.cfg, st: { ...R.cfg.st, mss: v } })],
              ["Equal high / low (EQH / EQL)", R.cfg.st.eq, (v) => setCfg({ ...R.cfg, st: { ...R.cfg.st, eq: v } })],
              ["FVG automatiques (BISI / SIBI)", R.cfg.st.fvg, (v) => setCfg({ ...R.cfg, st: { ...R.cfg.st, fvg: v } })],
              ["PDH", R.cfg.lv.pd && R.cfg.lv.pdh !== false, (v) => setCfg({ ...R.cfg, lv: { ...R.cfg.lv, pd: true, pdh: v } })],
              ["PDL", R.cfg.lv.pd && R.cfg.lv.pdl !== false, (v) => setCfg({ ...R.cfg, lv: { ...R.cfg.lv, pd: true, pdl: v } })],
              ["PWH", R.cfg.lv.pw && R.cfg.lv.pwh !== false, (v) => setCfg({ ...R.cfg, lv: { ...R.cfg.lv, pw: true, pwh: v } })],
              ["Positions fermées sur le graphique", !!R.cfg.showClosed, (v) => setCfg({ ...R.cfg, showClosed: v })],
              ["PWL", R.cfg.lv.pw && R.cfg.lv.pwl !== false, (v) => setCfg({ ...R.cfg, lv: { ...R.cfg.lv, pw: true, pwl: v } })], ["IA · Setups manqués (BISI H4, breaker H1…)", !!R.cfg.miss, (v) => setCfg({ ...R.cfg, miss: v })]];
  return (
    <div ref={wrapRef} className={"tvw" + (zen ? " zen" : "")} style={{ position: "relative", background: TV.bg, color: TV.text, border: fs || zen ? "none" : `1px solid ${TV.border}`, borderRadius: fs || zen ? 0 : 6, overflow: "hidden", display: "flex", flexDirection: "column", ...(fs || zen ? { position: "fixed", inset: 0, zIndex: 9999, height: "100vh" } : { height: "calc(100vh - 96px)", minHeight: 560 }), fontFamily: TV_FONT, fontSize: 14 }}>
      <style>{`.tvw input:not([type=checkbox]):not([type=color]), .tvw select { background: #fff !important; color: ${TV.text} !important; -webkit-text-fill-color: ${TV.text} !important; opacity: 1 !important; border: 1px solid ${TV.border} !important; border-radius: 6px !important; box-shadow: none !important; color-scheme: light; } .tvw select[title="Pas de lecture"], .tvw select[title^="Changer"] { border: none !important; padding: 0 2px !important; } .tvw .tv-hidden-date { width: 1px !important; height: 1px !important; min-width: 0 !important; border: none !important; padding: 0 !important; opacity: 0 !important; } .tvw option { color: ${TV.text}; background: #fff; } .tvw td, .tvw th { color: inherit; padding: 4px 6px; } .tvw table { color: ${TV.text}; }`}</style>
          {indOpen && <div style={{ position: "absolute", right: 90, top: 46, zIndex: 60, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 6, boxShadow: "0 4px 18px rgba(0,0,0,0.16)", padding: "8px 14px", minWidth: 230 }}>
            <div style={{ fontSize: 11, color: TV.muted, marginBottom: 4 }}>★ = afficher dans la légende du graphique</div>
            {indList.map(([n, on, fn]) => <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}><span title={indFav.includes(n) ? "Retirer de la légende" : "Ajouter à la légende"} onClick={() => togFav(n)} style={{ cursor: "pointer", fontSize: 16, color: indFav.includes(n) ? "#f5a623" : "#c3c6ce", lineHeight: 1 }}>{indFav.includes(n) ? "★" : "☆"}</span><div style={{ flex: 1 }}>{tvChk(on, fn, n)}</div></div>)}
          </div>}
      <style>{".tvw.zen .zh{display:none!important}"}</style>
      {/* barre du haut */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "4px 8px", borderBottom: `4px solid ${TV.hover}`, flexWrap: "wrap", rowGap: 2, flexShrink: 0 }}>
        <span className="zh" style={{ display: "contents" }}><div style={{ display: "flex", alignItems: "center", gap: 8, background: TV.hover, borderRadius: 6, padding: "5px 12px", fontWeight: 700, fontSize: 15, marginRight: 4 }}>{TV_PAIR}</div>
        {sep}</span>
        {TV_TFS.filter(([n]) => ["15m", "1h", "4h", "D", "W", "M"].includes(n)).map(([n, m]) => <TvBtn key={n} active={tf === m} onClick={() => setTf(m)}>{n}</TvBtn>)}
        {cfg.favTop && !live && <><span style={{ width: 1, height: 22, background: TV.border, margin: "0 4px" }} />{fav.filter((id) => TV_TOOLS[id]).map((id) => <TvBtn key={"f" + id} title={TV_TOOLS[id].n + ((() => { const km = cfg.keys || tvDefKeys(fav); const l = Object.keys(km).find((k) => km[k] === id); return l ? " (" + l.toUpperCase() + ")" : ""; })())} active={tool === id} onClick={() => pickTool(id)} style={{ padding: 2, color: tool === id ? TV.blue : TV.text }}><span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}><TvIcon id={id} /><span style={{ fontSize: 9, fontWeight: 700, color: TV.muted, marginTop: -2 }}>{((() => { const km = cfg.keys || tvDefKeys(fav); return (Object.keys(km).find((k) => km[k] === id) || "").toUpperCase(); })())}</span></span></TvBtn>)}<TvBtn title="Remettre la barre de favoris flottante sur le graphique" onClick={() => setCfg({ ...R.cfg, favTop: false })} style={{ padding: "2px 3px", color: TV.muted }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 12h10M7 2v7M4 6l3 3 3-3" /></svg></TvBtn></>}
        <div style={{ position: "relative" }}>
          {(() => { const extra = TV_TFS.find((x) => x[1] === tf && !["15m", "1h", "4h", "D", "W", "M"].includes(x[0])); return <TvBtn active={!!extra || tfMenu} title="Autres timeframes" onClick={() => setTfMenu((v) => !v)}>{extra ? extra[0] : ""}<ChevronDown size={15} /></TvBtn>; })()}
          {tfMenu && <div style={{ position: "absolute", left: 0, top: 36, zIndex: 60, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 6, boxShadow: "0 4px 18px rgba(0,0,0,0.16)", padding: "6px 0", minWidth: 150 }}>
            <div style={{ fontSize: 11, color: TV.muted, padding: "2px 14px 6px", letterSpacing: 0.6 }}>MINUTES / HEURES</div>
            {TV_TFS.filter(([n]) => !["15m", "1h", "4h", "D", "W", "M"].includes(n)).map(([n, m]) => <div key={n} onClick={() => { setTf(m); setTfMenu(false); }} onMouseEnter={(e) => (e.currentTarget.style.background = TV.hover)} onMouseLeave={(e) => (e.currentTarget.style.background = tf === m ? TV.hover : "transparent")} style={{ padding: "7px 14px", fontSize: 14, cursor: "pointer", background: tf === m ? TV.hover : "transparent", color: tf === m ? TV.blue : TV.text }}>{({ "30m": "30 minutes", "2h": "2 heures", "3h": "3 heures", "6h": "6 heures", "8h": "8 heures", "12h": "12 heures" })[n] || n}</div>)}
          </div>}
        </div>
        <span className="zh" style={{ display: "contents" }}>{sep}
        <TvBtn title="Bougies"><CandlestickChart size={18} /></TvBtn>
        {sep}
        <TvBtn style={{ background: TV.text, color: "#fff" }} title="Mode replay"><Rewind size={16} />Replay</TvBtn>
        <TvBtn title="Annuler (Ctrl+Z)" onClick={() => { const d = R.draws.pop(); if (d) R.redo.push(d); rerender(); }}><Undo2 size={17} /></TvBtn>
        <TvBtn title="Rétablir" onClick={() => { const d = R.redo.pop(); if (d) R.draws.push(d); rerender(); }}><Redo2 size={17} /></TvBtn>
        {sep}
        {!(curSess() || {}).blind && <TvBtn title="Revenir au début de l'année (2 janvier)" onClick={() => { if (!R.rows) return; const y = tvYear(R.rows[R.ci][0]); goToIndex(tvBsRows(R.rows, Date.UTC(y, 0, 2) / 1000)); setMsg(`Retour au début de ${y}.`); }} style={{ fontSize: 13, fontWeight: 600 }}><Rewind size={15} />Début d'année</TvBtn>}
        <select value={sess.cur} onChange={(e) => { if (e.target.value === "__new") setShowNew(true); else openSess(e.target.value); }} title="Session de backtest" style={{ border: `1px solid ${TV.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 14, fontWeight: 600, color: TV.text, background: "#fff", maxWidth: 220, fontFamily: TV_FONT }}>
          {sess.list.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          <option value="__new">+ Nouvelle session…</option>
        </select>
        {(curSess() || {}).blind && <TvBtn active title="Mode à l'aveugle : dates cachées. Clique pour révéler la date." onClick={() => { const v = snapSess(sess); v.list = v.list.map((x) => (x.id === v.cur ? { ...x, blind: false } : x)); setSessS(v); tvSaveSess(v); }} style={{ fontSize: 13 }}><EyeOff size={15} />Aveugle</TvBtn>}
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative" }}>
          <TvBtn active={modeMenu || !!sessM || !!exam || !!cfg.miss} title="Modes d'entraînement" onClick={() => setModeMenu((v) => !v)} style={{ fontSize: 14 }}>🎯 Modes</TvBtn>
          {modeMenu && <><div onClick={() => setModeMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 59 }} /><div style={{ position: "absolute", right: 0, top: 36, zIndex: 60, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 8, boxShadow: "0 4px 18px rgba(0,0,0,0.16)", padding: 8, width: 300, fontSize: 14 }}>
            <div style={{ padding: "6px 8px", fontWeight: 700 }}>Session seulement</div>
            <div style={{ display: "flex", gap: 4, padding: "0 8px 8px", flexWrap: "wrap" }}>{[["", "Toutes"], ...Object.entries(TV_SESS_MODE).map(([k, [n]]) => [k, n])].map(([k, n]) => <button key={k || "all"} onClick={() => { setSessM(k || null); }} style={{ border: `1px solid ${(sessM || "") === k ? TV.blue : TV.border}`, background: (sessM || "") === k ? "rgba(41,98,255,0.08)" : "#fff", color: (sessM || "") === k ? TV.blue : TV.text, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontFamily: TV_FONT, fontSize: 13 }}>{n}</button>)}</div>
            {sessM && <div onClick={() => { goSession(sessM, true); setModeMenu(false); }} style={{ padding: "8px", cursor: "pointer", borderRadius: 6 }} onMouseEnter={(e) => (e.currentTarget.style.background = TV.hover)} onMouseLeave={(e) => (e.currentTarget.style.background = "")}>⏭ Jour suivant</div>}
            <div style={{ borderTop: `1px solid ${TV.hover}`, margin: "4px 0" }} />
            <div onClick={() => { exam ? (setExam(null), (R.exam = null)) : examStart(); setModeMenu(false); }} style={{ padding: "8px", cursor: "pointer", borderRadius: 6, display: "flex", justifyContent: "space-between" }} onMouseEnter={(e) => (e.currentTarget.style.background = TV.hover)} onMouseLeave={(e) => (e.currentTarget.style.background = "")}><span>🎓 Examen : reconnais tes trades</span><b style={{ color: exam ? TV.blue : TV.muted }}>{exam ? "ON" : "OFF"}</b></div>
            <div onClick={() => setCfg({ ...R.cfg, miss: !R.cfg.miss })} style={{ padding: "8px", cursor: "pointer", borderRadius: 6, display: "flex", justifyContent: "space-between" }} onMouseEnter={(e) => (e.currentTarget.style.background = TV.hover)} onMouseLeave={(e) => (e.currentTarget.style.background = "")}><span>🤖 Trades manqués (IA)</span><b style={{ color: cfg.miss ? TV.blue : TV.muted }}>{cfg.miss ? "ON" : "OFF"}</b></div>
          </div></>}
        </div>
        <div style={{ position: "relative" }}>
          <TvBtn active={layMenu || cfg.layout !== "1"} title="Disposition des graphiques (synchronisés sur le replay)" onClick={() => setLayMenu((v) => !v)}><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="2" width="14" height="14" rx="2.5" /></svg></TvBtn>
          {layMenu && <div style={{ position: "absolute", right: 0, top: 36, zIndex: 60, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 6, boxShadow: "0 4px 18px rgba(0,0,0,0.16)", padding: "6px 10px", minWidth: 250 }}>
            {[["1", [["1", "M2 2h14v14H2z"]]], ["2", [["2v", "M2 2h14v14H2zM9 2v14"], ["2h", "M2 2h14v14H2zM2 9h14"]]], ["3", [["3c", "M2 2h14v14H2zM6.7 2v14M11.3 2v14"], ["3r", "M2 2h14v14H2zM2 6.7h14M2 11.3h14"], ["3", "M2 2h14v14H2zM9 2v14M9 9h7"], ["3l", "M2 2h14v14H2zM9 2v14M2 9h7"], ["3t", "M2 2h14v14H2zM2 9h14M9 2v7"], ["3b", "M2 2h14v14H2zM2 9h14M9 9v7"]]]].map(([n, opts]) =>
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", borderTop: n === "1" ? "none" : `1px solid ${TV.hover}` }}>
                <span style={{ width: 16, fontSize: 13, color: TV.muted }}>{n}</span>
                {opts.map(([k, d]) => <button key={k} onClick={() => { setCfg({ ...R.cfg, layout: k }); setLayMenu(false); }} style={{ border: "none", background: cfg.layout === k ? "#131722" : "transparent", borderRadius: 5, padding: 3, cursor: "pointer", color: cfg.layout === k ? "#fff" : TV.text, display: "flex" }}><svg width="24" height="24" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2"><path d={d} /></svg></button>)}
              </div>)}
          </div>}
        </div>
        <div style={{ position: "relative" }}>
          <TvBtn active={indOpen} title="Afficher / masquer les indicateurs" onClick={() => setIndOpen((v) => !v)}><LineChart size={17} />Indicateurs</TvBtn>
        </div>
        <span className="zh" style={{ display: "contents" }}><TvBtn title="Paramètres du graphique" onClick={() => setShowSet(true)}><Settings size={17} /></TvBtn>
        <TvBtn title="Importer tes données Dukascopy" onClick={() => fileRef.current.click()}><Database size={16} />Données</TvBtn></span>
        <TvBtn active={zen} title={zen ? "Quitter le mode épuré (Échap)" : "Mode épuré plein écran : seulement le graphique, les timeframes, les indicateurs, les favoris et la barre de replay"} onClick={() => { setFsS(false); setZen((v) => !v); }}><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">{zen ? <path d="M6 2v4H2M12 2v4h4M6 16v-4H2M12 16v-4h4" /> : <path d="M2 6V2h4M12 2h4v4M2 12v4h4M16 12v4h-4" />}</svg></TvBtn>
        {zen && <div style={{ position: "relative" }}><TvBtn title="Supprimer" active={trashM === "zen"} onClick={() => setTrashM(trashM === "zen" ? null : "zen")}><TvIcon id="trash" /></TvBtn>{trashM === "zen" && (() => { const dr = R.draws.filter((d) => trLock || !d.locked); const ind = indList.filter(([, on]) => on);
            const delD = () => { if (!dr.length) return; R.redo = [...R.draws]; R.draws = R.draws.filter((d) => !trLock && d.locked); R.sel = -1; setMsg(dr.length + " dessin" + (dr.length > 1 ? "s" : "") + " supprimé" + (dr.length > 1 ? "s" : "")); rerender(); };
            const delI = () => { ind.forEach(([, , fn]) => fn(false)); if (ind.length) setMsg(ind.length + " indicateur" + (ind.length > 1 ? "s" : "") + " masqué" + (ind.length > 1 ? "s" : "")); };
            const it = (lab, fn, dis) => <div onClick={() => { if (dis) return; fn(); setTrashM(null); }} style={{ padding: "9px 16px", fontSize: 14, cursor: dis ? "default" : "pointer", color: dis ? TV.muted : TV.text, whiteSpace: "nowrap" }} onMouseEnter={(e) => (e.currentTarget.style.background = dis ? "" : TV.hover)} onMouseLeave={(e) => (e.currentTarget.style.background = "")}>{lab}</div>;
            return <><div onClick={() => setTrashM(null)} style={{ position: "fixed", inset: 0, zIndex: 69 }} /><div style={{ position: "absolute", zIndex: 70, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 8, boxShadow: "0 4px 18px rgba(0,0,0,0.16)", padding: "6px 0", minWidth: 290, right: 0, top: 36 }}>
              {it(`Supprimer ${dr.length} dessin${dr.length > 1 ? "s" : ""}`, delD, !dr.length)}
              {it(`Supprimer ${ind.length} indicateur${ind.length > 1 ? "s" : ""}`, delI, !ind.length)}
              {it(`Supprimer ${dr.length} dessin${dr.length > 1 ? "s" : ""} & ${ind.length} indicateur${ind.length > 1 ? "s" : ""}`, () => { delD(); delI(); if (dr.length || ind.length) setMsg("Dessins et indicateurs supprimés"); }, !dr.length && !ind.length)}
              <div style={{ borderTop: `1px solid ${TV.hover}`, margin: "6px 0" }} />
              <div onClick={() => { const v = !trLock; setTrLock(v); try { localStorage.setItem("tjp_tv_trlock", v ? "1" : "0"); } catch (e) {} }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "8px 16px", fontSize: 14, cursor: "pointer" }}>Toujours supprimer les dessins verrouillés<span style={{ width: 36, height: 20, borderRadius: 10, background: trLock ? "#131722" : "#c3c6ce", position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: trLock ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: "#fff" }} /></span></div>
            </div></>; })()}</div>}
        <input ref={fileRef} type="file" accept=".csv,.txt" multiple hidden onChange={(e) => onFiles([...e.target.files])} />
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* barre d'outils de gauche (groupes avec menu, comme TradingView) */}
        <div className="zh" style={{ width: 52, borderRight: `4px solid ${TV.hover}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, paddingTop: 4, flexShrink: 0, position: "relative", zIndex: 30 }}>
          {TV_GROUPS.map((g) => {
            const cur = g.items.includes(tool) ? tool : groupLast[g.id] || g.items[0];
            return (
              <div key={g.id} style={{ position: "relative", display: "flex", alignItems: "center" }} className="tv-grp">
                <TvBtn title={TV_TOOLS[cur].n + (TV_TOOLS[cur].k ? ` (${TV_TOOLS[cur].k})` : "")} active={tool === cur} onClick={() => pickTool(cur)} style={{ padding: 2 }}><TvIcon id={cur} /></TvBtn>
                {g.items.length > 1 && <button title={g.n} onClick={() => setFly(fly === g.id ? null : g.id)} style={{ position: "absolute", right: -9, width: 10, height: 24, border: "none", background: "transparent", color: TV.muted, cursor: "pointer", padding: 0, fontSize: 11 }}>›</button>}
                {fly === g.id && (
                  <div style={{ position: "absolute", left: 50, top: 0, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 6, boxShadow: "0 4px 18px rgba(0,0,0,0.16)", padding: "6px 0", minWidth: 300, zIndex: 40 }}>
                    <div style={{ fontSize: 11, color: TV.muted, padding: "2px 14px 6px", textTransform: "uppercase", letterSpacing: 0.6 }}>{g.n}</div>
                    {g.items.map((id) => (
                      <div key={id} onClick={() => { pickTool(id); setFly(null); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 14px", cursor: "pointer", background: tool === id ? TV.hover : "transparent", fontSize: 14, color: TV.text }} onMouseEnter={(e) => (e.currentTarget.style.background = TV.hover)} onMouseLeave={(e) => (e.currentTarget.style.background = tool === id ? TV.hover : "transparent")}>
                        <TvIcon id={id} /> <span style={{ flex: 1 }}>{TV_TOOLS[id].n}</span>
                        {TV_TOOLS[id].k && <span style={{ fontSize: 12, color: TV.muted }}>{TV_TOOLS[id].k}</span>}
                        <span title={fav.includes(id) ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={(e) => { e.stopPropagation(); const v = fav.includes(id) ? fav.filter((x) => x !== id) : [...fav, id]; setFav(v); tvSaveFav(v); }} style={{ color: fav.includes(id) ? "#f2a636" : TV.border, display: "flex" }}><svg width="18" height="18" viewBox="0 0 28 28" fill={fav.includes(id) ? "#f2a636" : "none"} stroke="currentColor" strokeWidth="1.4"><path d={TV_ICON.star} /></svg></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <span style={{ width: 28, height: 1, background: TV.border, margin: "4px 0" }} />
          <TvBtn title="Mode aimant : colle au plus haut, plus bas, ouverture ou clôture (Ctrl = temporaire)" active={magnet} onClick={() => setMagnet(!magnet)} style={{ padding: 2 }}><TvIcon id="magnet" /></TvBtn>
          <TvBtn title="Rester en mode dessin" active={stay} onClick={() => { R.stay = !stay; setStay(!stay); }} style={{ padding: 2 }}><TvIcon id="stay" /></TvBtn>
          <TvBtn title="Masquer tous les dessins (Ctrl+Alt+H)" active={R.hidden} onClick={() => { R.hidden = !R.hidden; R.sel = -1; rerender(); }} style={{ padding: 2 }}><TvIcon id={R.hidden ? "eyeoff" : "eye"} /></TvBtn>
          <TvBtn title={favOpen ? "Masquer la barre des favoris" : "Afficher la barre des favoris"} active={favOpen} onClick={() => setFavOpen(!favOpen)} style={{ padding: 2 }}><TvIcon id="star" /></TvBtn>
          <div style={{ flex: 1 }} />
          <TvBtn title={fs ? "Quitter le plein écran (Maj+F ou Échap)" : "Plein écran (Maj+F)"} onClick={() => setFs((v) => !v)} style={{ padding: 6 }}>{fs ? <Minimize2 size={19} /> : <Maximize2 size={19} />}</TvBtn>
          <div style={{ position: "relative" }}><TvBtn title="Supprimer" active={trashM === "left"} onClick={() => setTrashM(trashM === "left" ? null : "left")} style={{ padding: 2, marginBottom: 8 }}><TvIcon id="trash" /></TvBtn>{trashM === "left" && (() => { const dr = R.draws.filter((d) => trLock || !d.locked); const ind = indList.filter(([, on]) => on);
            const delD = () => { if (!dr.length) return; R.redo = [...R.draws]; R.draws = R.draws.filter((d) => !trLock && d.locked); R.sel = -1; setMsg(dr.length + " dessin" + (dr.length > 1 ? "s" : "") + " supprimé" + (dr.length > 1 ? "s" : "")); rerender(); };
            const delI = () => { ind.forEach(([, , fn]) => fn(false)); if (ind.length) setMsg(ind.length + " indicateur" + (ind.length > 1 ? "s" : "") + " masqué" + (ind.length > 1 ? "s" : "")); };
            const it = (lab, fn, dis) => <div onClick={() => { if (dis) return; fn(); setTrashM(null); }} style={{ padding: "9px 16px", fontSize: 14, cursor: dis ? "default" : "pointer", color: dis ? TV.muted : TV.text, whiteSpace: "nowrap" }} onMouseEnter={(e) => (e.currentTarget.style.background = dis ? "" : TV.hover)} onMouseLeave={(e) => (e.currentTarget.style.background = "")}>{lab}</div>;
            return <><div onClick={() => setTrashM(null)} style={{ position: "fixed", inset: 0, zIndex: 69 }} /><div style={{ position: "absolute", zIndex: 70, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 8, boxShadow: "0 4px 18px rgba(0,0,0,0.16)", padding: "6px 0", minWidth: 290, left: 44, bottom: 0 }}>
              {it(`Supprimer ${dr.length} dessin${dr.length > 1 ? "s" : ""}`, delD, !dr.length)}
              {it(`Supprimer ${ind.length} indicateur${ind.length > 1 ? "s" : ""}`, delI, !ind.length)}
              {it(`Supprimer ${dr.length} dessin${dr.length > 1 ? "s" : ""} & ${ind.length} indicateur${ind.length > 1 ? "s" : ""}`, () => { delD(); delI(); if (dr.length || ind.length) setMsg("Dessins et indicateurs supprimés"); }, !dr.length && !ind.length)}
              <div style={{ borderTop: `1px solid ${TV.hover}`, margin: "6px 0" }} />
              <div onClick={() => { const v = !trLock; setTrLock(v); try { localStorage.setItem("tjp_tv_trlock", v ? "1" : "0"); } catch (e) {} }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "8px 16px", fontSize: 14, cursor: "pointer" }}>Toujours supprimer les dessins verrouillés<span style={{ width: 36, height: 20, borderRadius: 10, background: trLock ? "#131722" : "#c3c6ce", position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: trLock ? 18 : 2, width: 16, height: 16, borderRadius: 8, background: "#fff" }} /></span></div>
            </div></>; })()}</div>
        </div>

        {/* graphique */}
        <div style={{ position: "relative", flex: 1, minWidth: 0 }} onMouseDown={() => { if (fly) setFly(null); if (ctx) setCtx(null); }}>
          {live && <div style={{ position: "absolute", inset: 0, zIndex: 20, background: TV.bg }}><TvLive /></div>}
          <div ref={boxRef} style={{ position: "absolute", ...lay[0] }} />
          {!demo && lay[1].map((pos, i) => <TvMini key={cfg.layout + i} pos={pos} rows={R.rows} ci={R.ci} getAgg={getAgg} min={(cfg.ltf || [])[i] || [240, 15, 1440][i]} setMin={(m) => { const l = [...(cfg.ltf || [240, 15, 1440])]; l[i] = m; setCfg({ ...R.cfg, ltf: l }); }} onActivate={(m) => { const l = [...(cfg.ltf || [240, 15, 1440])]; l[i] = tf; setCfg({ ...R.cfg, ltf: l }); setTf(m); setMsg("Graphique " + (TV_TFS.find((x) => x[1] === m) || [m])[0] + " actif : tu peux dessiner et trader dessus."); }} trades={R.trades} tz={tz} cfg={cfg} blind={TV_BLIND} R={R} />)}
          {propS && <div className="zh" style={{ position: "absolute", left: 10, bottom: 44, zIndex: 6, background: "#fff", border: `1px solid ${R.prop.status === "fail" ? TV.red : R.prop.phase >= R.prop.steps ? TV.green : TV.border}`, borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.10)", padding: "8px 12px", width: 250, fontSize: 12 }}>
            {(() => { const P = R.prop, ph = P.steps === 2 ? ["Phase 1", "Phase 2", "Compte financé"] : ["Challenge", "Compte financé"]; const bar = (v, max, col, lab) => <div style={{ marginTop: 5 }}><div style={{ display: "flex", justifyContent: "space-between", color: TV.muted }}><span>{lab}</span><b style={{ color: TV.text }}>{v.toFixed(2).replace(".", ",")} % / {max} %</b></div><div style={{ height: 5, background: TV.hover, borderRadius: 3, marginTop: 2 }}><div style={{ width: Math.max(0, Math.min(100, (v / max) * 100)) + "%", height: 5, background: col, borderRadius: 3 }} /></div></div>;
              return <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 13 }}>Prop {tvMoney(P.size).replace(",00", "")}</b><span style={{ fontWeight: 700, color: P.status === "fail" ? TV.red : P.phase >= P.steps ? TV.green : TV.blue }}>{P.status === "fail" ? "Échoué" : ph[P.phase]}</span></div>
                <div style={{ display: "flex", gap: 4, marginTop: 5 }}>{ph.map((n, j) => <span key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: j < P.phase ? TV.green : j === P.phase ? (P.status === "fail" ? TV.red : TV.blue) : TV.hover }} title={n} />)}</div>
                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}><span style={{ color: TV.muted }}>Solde</span><b style={{ color: propS.pnl >= 0 ? TV.green : TV.red }}>{tvMoney(propS.eq)} ({propS.pnl >= 0 ? "+" : ""}{((propS.pnl / P.size) * 100).toFixed(2).replace(".", ",")} %)</b></div>
                {propS.target != null && bar(Math.max(0, (propS.pnl / P.size) * 100), propS.target, TV.green, "Objectif de profit")}
                {bar(Math.max(0, (-propS.today / P.size) * 100), P.daily, "#ff9800", "Perte du jour")}
                {bar(Math.max(0, ((P.size - propS.low) / P.size) * 100), P.max, TV.red, "Perte max (plus bas)")}
                {P.phase >= P.steps && P.status !== "fail" && <div style={{ marginTop: 6, color: TV.green }}>Ta part ({P.split} %) : <b>{tvMoney(Math.max(0, propS.pnl) * P.split / 100)}</b></div>}
                {P.status === "fail" && <div style={{ marginTop: 6, color: TV.red }}>{P.why}. <button onClick={propRestart} style={{ border: `1px solid ${TV.red}`, background: "#fff", color: TV.red, borderRadius: 4, cursor: "pointer", fontSize: 12, padding: "1px 6px", marginLeft: 4 }}>Recommencer (essai {(P.tries || 1) + 1})</button></div>}
                {(P.hist || []).length > 0 && <div style={{ marginTop: 5, color: TV.muted }}>{P.hist.map((h) => `${ph[h.phase]} ✓ ${tvMoney(h.pnl)} en ${h.n} trades`).join(" · ")}</div>}
              </>; })()}
          </div>}
          {exam && <div style={{ position: "absolute", left: "50%", top: 60, transform: "translateX(-50%)", zIndex: 12, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 10, boxShadow: "0 4px 18px rgba(0,0,0,0.16)", padding: "10px 14px", fontSize: 13.5, minWidth: 300, maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><b>🎓 Examen {Math.min(exam.i + 1, exam.q.length)}/{exam.q.length}</b><span style={{ color: TV.muted }}>Score {exam.score}/{exam.res.length}</span><span onClick={() => { setExam(null); R.exam = null; }} style={{ cursor: "pointer", color: TV.muted }}>✕</span></div>
            {exam.phase === "play" && <div style={{ marginTop: 6, color: TV.muted }}>{tvFmtTime(exam.q[exam.i].t, tz, "full").split(" ").slice(0, 3).join(" ")} · prends ton trade ou laisse passer. <span onClick={examJudge} style={{ color: TV.blue, cursor: "pointer", fontWeight: 600 }}>Révéler</span></div>}
            {exam.phase === "done" && <><div style={{ marginTop: 6 }}>{exam.txt}</div><button onClick={examNext} style={{ marginTop: 8, border: "none", background: "#131722", color: "#fff", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: TV_FONT }}>Trade suivant →</button></>}
            {exam.phase === "end" && <div style={{ marginTop: 6 }}><b>{exam.score}/{exam.q.length}</b> bonnes décisions. {exam.score >= exam.q.length * 0.8 ? "Excellent, tu reconnais tes setups." : exam.score >= exam.q.length * 0.5 ? "Correct, revois les ratés." : "Tes décisions changent d'une fois à l'autre : clarifie tes règles."}</div>}
          </div>}
          {cfg.miss && missL.length > 0 && <div style={{ position: "absolute", left: propS && !zen ? 270 : 10, bottom: 44, zIndex: 6, background: "#fff", border: "1px solid #ffcc80", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.10)", padding: "8px 12px", width: 250, fontSize: 12, maxHeight: 260, overflow: "auto" }}>
            <b style={{ fontSize: 13, color: "#e65100" }}>🤖 IA · Trades gagnants manqués (14 j)</b>
            <div style={{ color: TV.muted, margin: "3px 0 5px" }}>{missL.length} setups laissés passer · {(() => { const d = missL.filter((m) => m.tOut <= R.rows[R.ci][0]).reduce((a, m) => a + m.r, 0); return (d >= 0 ? "+" : "") + d.toFixed(1).replace(".", ",") + " R"; })()} sur la table</div>
            {missL.slice(0, 12).map((m, j) => <div key={j} onClick={() => { const k = tvBs(R.agg.start, tvBsRows(R.rows, m.t)); R.chart.timeScale().setVisibleLogicalRange({ from: k - 60, to: k + 25 }); }} title="Afficher sur le graphique" style={{ display: "flex", justifyContent: "space-between", gap: 6, padding: "3px 0", borderTop: `1px solid ${TV.hover}`, cursor: "pointer" }}>
              <span><b style={{ color: m.dir > 0 ? TV.green : TV.red }}>{m.kind === "BB" ? "Breaker" : m.kind} {m.tf}</b> <span style={{ color: TV.muted }}>{tvFmtTime(m.t, tz, "full")}</span></span>
              <b style={{ color: m.tOut > R.rows[R.ci][0] ? TV.muted : m.r > 0 ? TV.green : m.r < 0 ? TV.red : TV.muted }}>{m.tOut > R.rows[R.ci][0] ? "en cours" : (m.r > 0 ? "+" : "") + m.r.toFixed(1) + " R"}</b></div>)}
          </div>}
          {/* stake sous le SL de la position sélectionnée : 0,5 / 1 / 1,5 / 2 % (lots recalculés) */}
          <div ref={trBarRef} onMouseDown={(e) => e.stopPropagation()} style={{ position: "absolute", display: "none", zIndex: 8, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 6, boxShadow: "0 2px 10px rgba(0,0,0,0.12)", padding: 2, gap: 2, alignItems: "center", fontFamily: TV_FONT }}>
            {[0.5, 1, 1.5, 2].map((v) => { const t = R.selTr; const cur = t ? Math.round((t.riskPct ?? R.cfg.risk) * 10) / 10 : R.cfg.risk; return <button key={v} title={t && t.status === "open" ? "Mise d'une position déjà ouverte : non modifiable" : "Risquer " + v + " % sur ce trade"} disabled={!t || t.status !== "pending"} onClick={() => { if (!t) return; t.riskPct = v; t.lots = Math.max(0.01, Math.round(((balance() * v) / 100 / (Math.abs(t.entry - t.sl) / TV_PIP * TV_PIPVAL)) * 100) / 100); t.risk = (Math.abs(t.entry - t.sl) / TV_PIP) * TV_PIPVAL * t.lots; rerender(); }} style={{ border: "none", borderRadius: 4, padding: "3px 7px", fontSize: 12, fontWeight: 700, cursor: t && t.status === "pending" ? "pointer" : "default", background: cur === v ? TV.text : "transparent", color: cur === v ? "#fff" : TV.text, fontFamily: TV_FONT }}>{String(v).replace(".", ",")}%</button>; })}
            <span style={{ fontSize: 11, color: TV.muted, padding: "0 4px" }}>{R.selTr ? R.selTr.lots.toFixed(2) + " lot" : ""}</span>
          </div>
          <div ref={barRef} style={{ position: "absolute", display: "none", zIndex: 8, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 6, boxShadow: "0 2px 10px rgba(0,0,0,0.15)", padding: 3, gap: 2, alignItems: "center" }}>
            {!["rect", "hray"].includes((R.draws[R.sel] || {}).type) && TV_COLORS.map((col) => <button key={col} title="Couleur" onClick={() => { const s = R.draws[R.sel]; if (s) { s.color = col; rerender(); } }} style={{ width: 20, height: 20, borderRadius: 4, border: (R.draws[R.sel] || {}).color === col ? `2px solid ${TV.text}` : `1px solid ${TV.border}`, background: col, cursor: "pointer", padding: 0 }} />)}
            <span style={{ width: 1, height: 20, background: TV.border, margin: "0 3px" }} />
            {(R.draws[R.sel] || {}).type !== "rect" && [1, 2, 3].map((w) => <TvBtn key={w} title={`Épaisseur ${w}`} active={((R.draws[R.sel] || {}).w || 1.5) === w || (w === 1 && !(R.draws[R.sel] || {}).w)} onClick={() => { const s = R.draws[R.sel]; if (s) { s.w = w; rerender(); } }} style={{ padding: "4px 6px" }}><span style={{ display: "block", width: 16, height: w + 0.5, background: TV.text }} /></TvBtn>)}
            <span style={{ width: 1, height: 20, background: TV.border, margin: "0 3px" }} />
            {(R.draws[R.sel] || {}).type !== "rect" && <TvBtn title="Ligne pointillée" active={!!(R.draws[R.sel] || {}).dash} onClick={() => { const s = R.draws[R.sel]; if (s) { s.dash = !s.dash; rerender(); } }} style={{ padding: "4px 6px" }}><span style={{ display: "block", width: 16, borderTop: `2px dashed ${TV.text}` }} /></TvBtn>}
            {(R.draws[R.sel] || {}).type === "rect" && <>{Object.keys(TV_ZONE).map((k) => <button key={k} title={k} onClick={() => { const s = R.draws[R.sel]; s.kind = k; s.color = undefined; s.tf = s.tf || TV_TFLAB[R.selOn ? R.selOn.min : R.agg.min]; rerender(); if (R.minis) R.minis.forEach((m) => m.redraw()); }} style={{ border: R.draws[R.sel].kind === k ? `2px solid ${TV.text}` : "2px solid transparent", background: TV_ZONE[k], color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 2, fontFamily: TV_FONT }}>{k}</button>)}<span style={{ width: 1, height: 20, background: TV.border, margin: "0 3px" }} /></>}
            {["trend", "hline"].includes((R.draws[R.sel] || {}).type) && <>{Object.keys(TV_STRUCT).map((k) => <button key={k} title={k} onClick={() => { const s = R.draws[R.sel]; s.kind = s.kind === k ? undefined : k; s.tf = s.tf || TV_TFLAB[R.agg.min]; s.color = undefined; rerender(); }} style={{ border: R.draws[R.sel].kind === k ? `2px solid ${TV.text}` : "2px solid transparent", background: TV_STRUCT[k], color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 2, fontFamily: TV_FONT }}>{k}</button>)}<span style={{ width: 1, height: 20, background: TV.border, margin: "0 3px" }} /></>}
            {(R.draws[R.sel] || {}).type === "hray" && <>{Object.keys(TV_LIQ).map((k) => <button key={k} title={k} onClick={() => { const s = R.draws[R.sel]; s.kind = k; s.color = undefined; rerender(); }} style={{ border: R.draws[R.sel].kind === k ? `2px solid ${TV.text}` : "2px solid transparent", background: TV_LIQ[k], color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 2, fontFamily: TV_FONT }}>{k}</button>)}<span style={{ width: 1, height: 20, background: TV.border, margin: "0 3px" }} /></>}
            <TvBtn title="Paramètres" onClick={() => { if (R.sel >= 0) setDrawSet(R.sel); }} style={{ padding: "4px 6px" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg></TvBtn><TvBtn title="Cloner (Ctrl + glisser)" onClick={() => { const s = R.draws[R.sel]; if (s) { const c = JSON.parse(JSON.stringify(s)); c.pts = c.pts.map((q) => ({ t: q.t, p: q.p + 5 * TV_PIP })); R.draws.push(c); R.sel = R.draws.length - 1; rerender(); } }} style={{ padding: "4px 6px" }}><Copy size={16} /></TvBtn>
            <TvBtn title="Supprimer (Suppr)" onClick={() => { if (R.sel >= 0) { R.redo.push(R.draws.splice(R.sel, 1)[0]); R.sel = -1; R.selOn = null; rerender(); if (R.minis) R.minis.forEach((m) => m.redraw()); } }} style={{ padding: "4px 6px" }}><Trash2 size={16} /></TvBtn>
          </div>
          {["rect", "hray", "trend", "hline"].includes(tool) && !live && (
            <div style={{ position: "absolute", left: favOpen ? favPos.x : 10, top: favOpen ? favPos.y + 44 : 110, zIndex: 9, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.12)", display: "flex", gap: 4, padding: 5 }}>
              {(tool === "trend" || tool === "hline" ? [["none", TV.blue, "Ligne"], ...Object.entries(TV_STRUCT).map(([k, c]) => [k, c, k])] : tool === "rect" ? [["none", TV.blue, "Rectangle"], ...Object.entries(TV_ZONE).map(([k, c]) => [k, c, k])] : [["none", TV.blue, "Rayon"], ...Object.entries(TV_LIQ).map(([k, c]) => [k, c, k])]).map(([k, col, n]) => {
                const on = (tool === "rect" ? rectKind : tool === "hray" ? rayKind : lineKind) === k;
                return <button key={k} onClick={() => (tool === "rect" ? setRectKind(k) : tool === "hray" ? setRayKind(k) : setLineKind(k))} title={n} style={{ border: on ? `2px solid ${TV.text}` : "2px solid transparent", background: col, color: "#fff", borderRadius: 5, padding: "4px 9px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: TV_FONT }}>{n}</button>;
              })}
            </div>
          )}
          {/* barre des favoris flottante (déplaçable) */}
          {(favOpen || zen) && !live && !cfg.favTop && (
            <div style={{ position: "absolute", left: favPos.x, top: favPos.y, zIndex: 9, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", padding: "3px 4px", gap: 1 }}>
              <div title="Déplacer la barre" onMouseDown={(e) => { e.preventDefault(); const sx = e.clientX - favPos.x, sy = e.clientY - favPos.y; const mv = (ev) => setFavPos({ x: Math.max(0, ev.clientX - sx), y: Math.max(0, ev.clientY - sy) }); const upf = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", upf); }; window.addEventListener("mousemove", mv); window.addEventListener("mouseup", upf); }}
                style={{ cursor: "grab", padding: "0 4px", color: TV.muted, fontSize: 14, letterSpacing: -2, userSelect: "none" }}>⋮⋮</div>
              <TvBtn title="Mettre la barre en haut, à côté des timeframes" onClick={() => setCfg({ ...R.cfg, favTop: true })} style={{ padding: "2px 3px", color: TV.muted }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 2h10M7 12V5M4 8l3-3 3 3" /></svg></TvBtn>
              {fav.filter((id) => TV_TOOLS[id]).map((id) => <TvBtn key={id} title={TV_TOOLS[id].n + ((() => { const km = cfg.keys || tvDefKeys(fav); const l = Object.keys(km).find((k) => km[k] === id); return l ? " (" + l.toUpperCase() + ")" : ""; })())} active={tool === id} onClick={() => pickTool(id)} style={{ padding: 2, color: tool === id ? TV.blue : TV.text }}><span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}><TvIcon id={id} /><span style={{ fontSize: 9, fontWeight: 700, color: TV.muted, marginTop: -2 }}>{((() => { const km = cfg.keys || tvDefKeys(fav); return (Object.keys(km).find((k) => km[k] === id) || "").toUpperCase(); })())}</span></span></TvBtn>)}
            </div>
          )}
          <canvas ref={ovRef} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 3 }} />
          {/* pas de bougies inventées : sans tes données Dukascopy, le graphique reste vide */}
          {demo && <div style={{ position: "absolute", inset: 0, zIndex: 30, background: TV.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Aucune donnée réelle chargée sur cet appareil</div>
            <div style={{ fontSize: 14, color: TV.muted, maxWidth: 460, lineHeight: 1.5 }}>Le replay utilise uniquement tes vraies bougies EURUSD (Dukascopy, M15 depuis 2010). Sur iPhone : mets le fichier dans ton dépôt GitHub sous <b>public/data/eurusd-m15.csv</b> et il se chargera tout seul sur tous tes appareils. Sinon, importe le fichier ici.</div>
            <button onClick={() => fileRef.current.click()} style={{ border: "none", background: TV.text, color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: TV_FONT }}>Importer mes données</button>
          </div>}
          {/* légende OHLC + SELL / BUY */}
          <div style={{ position: "absolute", left: 10, top: 6, zIndex: 4, pointerEvents: "none" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 14 }}>
              <b style={{ fontWeight: 600 }}>Euro / U.S. Dollar · {tfName} · Dukascopy</b>
              {demo && <span style={{ fontSize: 11, fontWeight: 700, color: TV.red }}>DONNÉES DÉMO</span>}
              <TvLegend R={R} />
            </div>
            {indList.filter(([n]) => indFav.includes(n)).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, pointerEvents: "auto" }}>
              {indList.filter(([n]) => indFav.includes(n)).map(([n, on, fn]) => <span key={n} onClick={() => fn(!on)} title={on ? "Masquer" : "Afficher"} style={{ cursor: "pointer", fontSize: 12, padding: "1px 7px", borderRadius: 4, border: `1px solid ${TV.border}`, background: "#fff", color: on ? TV.text : TV.muted, textDecoration: on ? "none" : "line-through", userSelect: "none" }}>{on ? "👁" : "◌"} {n}</span>)}
            </div>}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, pointerEvents: "auto" }}>
              {priceBox(-1)}
              <div title="Risque par trade (modifiable sous le stop de la position)" style={{ textAlign: "center", fontSize: 11, color: TV.muted, minWidth: 44, lineHeight: 1.25 }}>1:1<br /><b style={{ color: TV.text }}>{String(R.cfg.risk).replace(".", ",")} %</b></div>
              {priceBox(1)}
            </div>
          </div>
          {/* barre de replay compacte et déplaçable */}
          <div style={{ position: "absolute", ...(barPos ? { left: barPos.x, top: barPos.y } : { left: "50%", bottom: 42, transform: "translateX(-50%)" }), zIndex: 5, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 0, padding: "2px 4px", whiteSpace: "nowrap" }}>
            <div title="Déplacer la barre" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); const host = e.currentTarget.parentElement.parentElement.getBoundingClientRect(), me = e.currentTarget.parentElement.getBoundingClientRect(); const ox = e.clientX - me.left, oy = e.clientY - me.top; const mv = (ev) => setBarPos({ x: Math.max(0, Math.min(host.width - me.width, ev.clientX - host.left - ox)), y: Math.max(0, Math.min(host.height - me.height, ev.clientY - host.top - oy)) }); const upf = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", upf); }; window.addEventListener("mousemove", mv); window.addEventListener("mouseup", upf); }}
              style={{ cursor: "grab", padding: "0 3px", color: TV.muted, fontSize: 13, letterSpacing: -2, userSelect: "none" }}>⋮⋮</div>
            <TvBtn title="Sélectionner la date (Alt+G)" onClick={openDate} style={{ padding: "5px 6px" }}>{TvIco.cal}</TvBtn>
            <input ref={dateRef} className="tv-hidden-date" type="date" onChange={(e) => jumpTo(e.target.value)} style={{ position: "absolute", opacity: 0, width: 1, height: 1, left: 20, bottom: 0, pointerEvents: "none" }} aria-label="Date de départ" />
            <TvBtn title="Sélectionner la barre : clique sur une bougie pour reprendre le replay à partir de là" active={selBar} onClick={() => { setPlaying(false); R.selBar = !selBar; setSelBar(!selBar); }} style={{ padding: "5px 6px" }}>{TvIco.cut}</TvBtn>
            <TvBtn title="Lecture / pause (Espace) · → avancer · ← reculer" onClick={() => setPlaying((p) => !p)} style={{ padding: "5px 6px" }}>{playing ? TvIco.pause : TvIco.play}</TvBtn>
            {sessM && <TvBtn title="Jour suivant : saute à la prochaine session" onClick={() => goSession(sessM, true)} style={{ padding: "5px 6px", fontWeight: 700 }}>⏭</TvBtn>}
            <TvBtn title="Bougie suivante : affiche une seule nouvelle bougie, complète" onClick={() => { if (!R.agg) return; const A = R.agg; const endK = (k) => (k + 1 < A.start.length ? A.start[k + 1] - 1 : R.rows.length - 1); let tgt = endK(R.k); if (tgt <= R.ci) tgt = endK(R.k + 1); step(Math.max(1, tgt - R.ci)); }} style={{ padding: "5px 5px" }}>{TvIco.candle}</TvBtn>
            <TvBtn title="Avancer d'une journée" onClick={() => goToIndex(tvBsRows(R.rows, R.rows[R.ci][0] + 86400))} style={{ padding: "5px 6px" }}>{TvIco.day}</TvBtn>
            {botOn && <TvBtn title="Le bot place ses trades pendant le replay · clique pour l'arrêter" onClick={stopBot} style={{ padding: "4px 8px", fontSize: 12, fontWeight: 700, color: "#9c27b0" }}><Cpu size={15} />Bot</TvBtn>}
            <select value={spd} onChange={(e) => { setSpd(+e.target.value); e.target.blur(); }} title="Vitesse" style={{ border: "none", background: "transparent", fontSize: 13, fontWeight: 600, color: TV.text, cursor: "pointer" }}>{TV_SPEEDS.map(([v]) => <option key={v} value={v}>{String(v).replace(".", ",")}x</option>)}</select>
            <select value={stepTf} onChange={(e) => { setStepTf(+e.target.value); e.target.blur(); }} title="Pas de lecture" style={{ border: "none", background: "transparent", fontSize: 13, fontWeight: 600, color: TV.text, cursor: "pointer" }}>{TV_TFS.slice(0, 10).map(([n, m]) => <option key={n} value={m}>{n}</option>)}</select>
          </div>
          {/* boutons de l'échelle : A = ajustement auto, » = revenir aux dernières bougies */}
          <div style={{ position: "absolute", right: 4, bottom: 32, zIndex: 6, display: "flex", gap: 4 }}>
            <button title="Revenir aux dernières bougies" onClick={() => R.chart.timeScale().scrollToRealTime()} style={{ width: 26, height: 22, border: `1px solid ${TV.border}`, borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 13, color: TV.text, padding: 0 }}>»</button>
            <button title="Ajustement automatique du graphique (A)" onClick={() => { R.chart.priceScale("right").applyOptions({ autoScale: true }); R.chart.timeScale().scrollToRealTime(); }} style={{ width: 26, height: 22, border: `1px solid ${TV.border}`, borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: TV.blue, padding: 0, fontFamily: TV_FONT }}>A</button>
          </div>
          {ctx && <div onMouseDown={(e) => e.stopPropagation()} style={{ position: "absolute", left: Math.min(ctx.x, (boxRef.current ? boxRef.current.clientWidth : 800) - 270), top: Math.min(ctx.y, (boxRef.current ? boxRef.current.clientHeight : 600) - 30 * ctx.items.length), zIndex: 50, background: "#fff", border: `1px solid ${TV.border}`, borderRadius: 6, boxShadow: "0 4px 18px rgba(0,0,0,0.16)", padding: "6px 0", minWidth: 250, fontFamily: TV_FONT }}>
            {ctx.items.map((it, i) => it ? <div key={i} onClick={() => { it[1](); setCtx(null); rerender(); }} onMouseEnter={(e) => (e.currentTarget.style.background = TV.hover)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")} style={{ padding: "6px 16px", fontSize: 14, cursor: "pointer", color: it[2] ? TV.red : TV.text }}>{it[0]}</div> : <div key={i} style={{ height: 1, background: TV.border, margin: "5px 0" }} />)}
          </div>}
          {/* heure */}
          <div className="zh" style={{ position: "absolute", right: 0, bottom: 0, height: 28, zIndex: 6, fontSize: 12, color: TV.text, background: "#fff", borderLeft: `1px solid ${TV.border}`, padding: "0 6px", display: "flex", gap: 6, alignItems: "center" }}>
            {curT}
            <select value={tz} onChange={(e) => setTz(e.target.value)} style={{ border: "none", background: "transparent", fontSize: 12, color: TV.text }} aria-label="Fuseau">
              <option value="ny">New York</option><option value="0">UTC</option><option value="1">Paris (UTC+1)</option><option value="7">Bangkok (UTC+7)</option>
            </select>
          </div>
          {msg && <div onClick={() => setMsg("")} style={{ position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)", zIndex: 6, background: TV.text, color: "#fff", padding: "8px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>{msg}</div>}
        </div>
      </div>

      {drawSet >= 0 && R.draws[drawSet] && <TvDrawSettings d={R.draws[drawSet]} onClose={() => setDrawSet(-1)} onApply={(v) => { R.draws[drawSet] = v; setDrawSet(-1); R.dirty = 1; rerender(); if (R.minis) R.minis.forEach((m) => m.redraw()); }} />}
      {showSet && <TvSettings years={years} curYear={R.rows ? tvYear(R.rows[R.ci][0]) : undefined} onClearYear={(y) => { clearYear(y); setShowSet(false); }} cfg={cfg} onClose={() => setShowSet(false)} onApply={(v) => { setCfg(v); setShowSet(false); }} onCloseAll={closeAll} onReset={() => { R.trades = []; R.draws = []; rerender(); }} fav={fav} />}
      {showNew && <TvNewSession list={sess.list} onClose={() => setShowNew(false)} onCreate={createSess} onDelete={delSess} />}
      {/* panneau Replay Trading */}
      <div className="zh" style={{ borderTop: `4px solid ${TV.hover}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", overflowX: "auto" }}>
          <TvBtn onClick={() => setPanel((p) => !p)} style={{ fontWeight: 600 }}><Rewind size={15} />Replay Trading {unseen > 0 && <span style={{ background: TV.blue, color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 6px" }}>{unseen}</span>}<ChevronDown size={14} style={{ transform: panel ? "none" : "rotate(180deg)" }} /></TvBtn>
          {sep}
          {[["pos", `Positions (${opened.length})`], ["hist", `Historique (${closed.length})`], ["stats", "Statistiques"]].map(([id, n]) => <TvBtn key={id} active={panel && tab === id} onClick={() => { setTab(id); setPanel(true); if (id === "hist") setUnseen(0); }}>{n}{id === "hist" && unseen > 0 && <span style={{ background: TV.blue, color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 6px", marginLeft: 2 }}>{unseen}</span>}</TvBtn>)}
          {sep}
          {[["NFP", "news", "nfp", "Emploi américain (NFP), 8h30 NY"], ["CPI", "cpi", "cpi", "Inflation (CPI), 8h30 NY"], ["FOMC", "fomc", "fomc", "Décision de la Fed (FOMC), 14h00 NY"]].map(([n, k, ic, title]) => {
            const now = R.rows ? R.rows[R.ci][0] : 0; const nx = R.rows ? newsList().find((x) => x.n === n && x.t >= now) : null; const soon = nx && nx.t - now <= 86400;
            const h = nx ? Math.max(0, Math.round((nx.t - now) / 3600)) : 0;
            return <button key={n} title={title + (nx ? " · prochaine : " + tvFmtTime(nx.t, R.tz, "full") : "") + " · clique pour afficher / masquer"} onClick={() => setCfg({ ...R.cfg, [k]: !R.cfg[k] })}
              style={{ display: "flex", alignItems: "center", gap: 5, border: `1px solid ${soon || R.cfg[k] ? TV_NEWS_COL[n] : TV.border}`, background: soon ? tvRgba(TV_NEWS_COL[n], 0.12) : R.cfg[k] ? tvRgba(TV_NEWS_COL[n], 0.06) : "#fff", color: R.cfg[k] ? TV_NEWS_COL[n] : TV.muted, borderRadius: 14, padding: "3px 9px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: TV_FONT, whiteSpace: "nowrap" }}>
              {TvIco[ic]}{n}{soon && <span style={{ color: TV_NEWS_COL[n] }}>· {h ? "dans " + h + " h" : "maintenant"}</span>}</button>;
          })}
          <span style={{ fontSize: 12, color: TV.muted, marginLeft: 6 }}>Session : <b style={{ color: TV.text }}>{curSess().title}</b></span>
          <div style={{ flex: 1 }} />
<select value={R.rows ? tvYear(R.rows[R.ci][0]) : ""} onChange={(e) => { jumpTo(e.target.value + "-01-02"); e.target.blur(); }} title="Changer d'année (les positions restent ouvertes)" style={{ border: "none", background: "transparent", fontSize: 13, fontWeight: 700, color: TV.text, cursor: "pointer" }}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>Solde <b>{tvMoney(balance())}</b> · Équité <b>{tvMoney(balance() + upnl)}</b> · P&L ouvert <b style={{ color: upnl >= 0 ? TV.green : TV.red }}>{tvMoney(upnl)}</b></span>
        </div>
        {panel && (
          <div style={{ height: 170, overflow: "auto", padding: "4px 12px 10px", fontSize: 13 }}>
            {tab === "pos" && (opened.length ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ color: TV.muted, textAlign: "left" }}><th>#</th><th>Sens</th><th>Lots</th><th>Entrée</th><th>SL</th><th>TP</th><th>Statut</th><th>PD arrays</th><th>P&L</th><th></th><th></th></tr></thead>
                <tbody>{opened.map((t) => { const pl = t.status === "open" ? (((t.side > 0 ? bid() : ask()) - t.entry) * t.side / TV_PIP) * TV_PIPVAL * t.lots : 0; return (
                  <tr key={t.id} style={{ borderTop: `1px solid ${TV.border}` }}>
                    <td><b>#{dispNo(t)}</b></td><td style={{ color: t.side > 0 ? TV.blue : TV.red, fontWeight: 600 }}>{t.side > 0 ? "Long" : "Short"}</td><td>{t.lots.toFixed(2)}</td><td>{t.entry.toFixed(TV_DIG)}</td><td>{t.sl.toFixed(TV_DIG)}</td><td>{t.tp.toFixed(TV_DIG)}</td><td>{t.status === "open" ? "Ouvert" : "En attente"}</td><td style={{ fontSize: 12 }}><TvPdPicker tr={t} addPd={addPd} delPd={delPd} /></td>
                    <td style={{ color: pl >= 0 ? TV.green : TV.red }}>{tvMoney(pl)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{t.status === "open" && <button style={{ ...inp, width: "auto", cursor: "pointer" }} onClick={() => toBE(t)} title="Stop au point mort">BE</button>} <button style={{ ...inp, width: "auto", cursor: "pointer" }} onClick={() => closeOne(t)}>{t.status === "open" ? "Fermer" : "Annuler"}</button> <button title="Supprimer" style={{ ...inp, width: "auto", cursor: "pointer", color: TV.red }} onClick={() => delTrade(t)}><Trash2 size={13} /></button></td>
                  </tr>); })}</tbody>
              </table>) : <div style={{ color: TV.muted, padding: 8 }}>Aucune position. Clique BUY / SELL en haut à gauche du graphique, ou choisis l'outil Position longue / courte et clique sur le prix voulu. Glisse ensuite les bords vert et rouge pour régler le TP et le SL.</div>)}
            {tab === "hist" && (() => {
              const all = [...(R.archive || []), ...closed]; const mk = (t) => tvNyIso(t.openT).slice(0, 7);
              const curK = R.rows ? tvNyIso(R.rows[R.ci][0]).slice(0, 7) : ""; const months = [...new Set(all.map(mk))].sort().reverse();
              const key = histM === "cur" ? curK : histM; const list = histM === "all" ? all : all.filter((t) => mk(t) === key);
              const mName = (k) => { const [y, m] = k.split("-"); return TV_MOIS[+m - 1] + " " + y; };
              const tot = list.reduce((a, t) => a + (t.r || 0), 0), pnl = list.reduce((a, t) => a + (t.pnl || 0), 0);
              return <>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", padding: "4px 0" }}>
                  <select value={histM} onChange={(e) => { setHistM(e.target.value); e.target.blur(); }} style={{ fontSize: 13, padding: "3px 6px", fontFamily: TV_FONT }}>
                    <option value="cur">Ce mois-ci ({curK ? mName(curK) : ""})</option><option value="all">Tous les mois</option>
                    {months.map((k) => <option key={k} value={k}>{mName(k)} · {all.filter((t) => mk(t) === k).length} trade(s)</option>)}
                  </select>
                  <span style={{ fontSize: 13, color: TV.muted }}>{list.length} trade(s) · <b style={{ color: tot >= 0 ? TV.green : TV.red }}>{(tot >= 0 ? "+" : "") + tot.toFixed(2)} R</b> · <b style={{ color: pnl >= 0 ? TV.green : TV.red }}>{tvMoney(pnl)}</b></span>
                </div>
                {list.length ? <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4 }}>
                {list.slice().sort((a, b) => b.openT - a.openT).map((t) => {
                  const be = tvIsBE(t), win = !be && t.pnl > 0, col = be ? TV.muted : win ? TV.green : TV.red;
                  const chip = (txt, bg, fg) => <span style={{ background: bg, color: fg, borderRadius: 10, padding: "2px 8px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{txt}</span>;
                  return (
                    <div key={t.id} onClick={(e) => { if (e.target.closest("button,select")) return; R.selTr = t; rerender(); }} style={{ display: "grid", gridTemplateColumns: "4px 44px 170px 72px 1fr auto auto 34px", alignItems: "center", gap: 10, padding: "8px 10px", border: `1px solid ${R.selTr === t ? TV.blue : TV.border}`, borderRadius: 8, background: "#fff", cursor: "pointer" }}>
                      <span style={{ alignSelf: "stretch", borderRadius: 2, background: col }} />
                      <b style={{ fontSize: 14 }}>#{dispNo(t)}</b>
                      <span style={{ fontSize: 13 }}>{tvFmtTime(t.openT, R.tz, "full")}<br /><span style={{ color: TV.muted, fontSize: 12 }}>→ {tvFmtTime(t.closeT, R.tz, "full")}</span></span>
                      {chip(t.side > 0 ? "Long" : "Short", t.side > 0 ? "rgba(41,98,255,0.12)" : "rgba(242,54,69,0.12)", t.side > 0 ? TV.blue : TV.red)}
                      <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", minWidth: 0 }}>
                        <span style={{ fontSize: 12.5, color: TV.muted }}>{t.entry.toFixed(TV_DIG)} → {t.exit.toFixed(TV_DIG)} · {t.lots.toFixed(2)} lot · {t.pips.toFixed(1)} pips</span>
                        <TvPdPicker tr={t} addPd={addPd} delPd={delPd} />
                      </span>
                      {chip(t.reason === "TP" ? "TP" : t.reason === "SL" ? (be ? "BE" : "SL") : t.reason, be ? TV.hover : win ? "rgba(8,153,129,0.12)" : "rgba(242,54,69,0.12)", col)}
                      <span style={{ textAlign: "right", minWidth: 110 }}><b style={{ color: col, fontSize: 15 }}>{(t.r >= 0 ? "+" : "") + t.r.toFixed(2)} R</b><br /><span style={{ color: col, fontSize: 12.5 }}>{tvMoney(t.pnl)}</span></span>
                      <button title="Supprimer ce trade (aussi de Saisie & stats)" onClick={() => delTrade(t)} style={{ border: "none", background: "transparent", cursor: "pointer", color: TV.muted, padding: 4 }}><Trash2 size={15} /></button>
                    </div>
                  );
                })}
              </div> : <div style={{ color: TV.muted, padding: 8 }}>Aucun trade fermé ce mois-ci. Choisis un autre mois dans la liste.</div>}
              </>;
            })()}
            {tab === "stats" && (R.years || []).length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
                <thead><tr style={{ color: TV.muted, textAlign: "left" }}><th>Année</th><th>Trades</th><th>Win rate</th><th>Total R</th><th>P&L</th></tr></thead>
                <tbody>{[...R.years].sort((a, b) => a.year - b.year).map((y) => <tr key={y.year} style={{ borderTop: `1px solid ${TV.border}` }}><td><b>{y.year}</b></td><td>{y.n}</td><td>{y.n ? Math.round((y.w / y.n) * 100) + " %" : "—"}</td><td style={{ color: y.R >= 0 ? TV.green : TV.red }}>{y.R.toFixed(2)} R</td><td style={{ color: y.pnl >= 0 ? TV.green : TV.red }}>{tvMoney(y.pnl)}</td></tr>)}</tbody>
              </table>)}
            {tab === "stats" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, paddingTop: 6 }}>
                {[["P&L net", tvMoney(gw - gl), gw - gl >= 0 ? TV.green : TV.red], ["Rendement", (((gw - gl) / cap) * 100).toFixed(2) + " %"], ["Trades", closed.length], ["Win rate", closed.length ? ((wins.length / closed.length) * 100).toFixed(1) + " %" : "—"], ["Profit factor", gl ? (gw / gl).toFixed(2) : "—"], ["Total R", closed.reduce((a, t) => a + t.r, 0).toFixed(2) + " R"], ["Gain moyen", wins.length ? tvMoney(gw / wins.length) : "—"], ["Perte moyenne", closed.length - wins.length ? tvMoney(-gl / (closed.length - wins.length)) : "—"]].map(([k, v, col]) => (
                  <div key={k} style={{ border: `1px solid ${TV.border}`, borderRadius: 6, padding: "8px 10px" }}><div style={{ color: TV.muted, fontSize: 12 }}>{k}</div><div style={{ fontSize: 17, fontWeight: 600, color: col || TV.text }}>{v}</div></div>))}
              </div>)}

          </div>
        )}
      </div>
    </div>
  );
}
function tvAlpha(hex, a) { const h = hex.replace("#", ""); const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
const TV_COLORS = ["#2962ff", "#f23645", "#089981", "#f5b700", "#9c27b0", "#ff9800"];
function TvLive() {
  useEffect(() => { if (!document.querySelector("script[data-tv-adv]")) { const sc = document.createElement("script"); sc.type = "module"; sc.src = "https://widgets.tradingview-widget.com/w/en/tv-advanced-chart.js"; sc.dataset.tvAdv = "1"; document.head.appendChild(sc); } }, []);
  return React.createElement("tv-advanced-chart", { "allow-symbol-change": "", symbol: "OANDA:EURUSD", interval: "240", theme: "light", style: { display: "block", width: "100%", height: "100%" } });
}
function tvBsBars(bars, t) { let lo = 0, hi = bars.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (bars[m].time <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; }


/* ---------- fenêtres façon TradingView : Paramètres et Nouvelle session ---------- */
function TvModal({ title, children, onClose, onOk, okLabel = "D'accord", left }) {
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, background: "rgba(19,23,34,0.35)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TV_FONT }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", color: TV.text, borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,0.25)", width: "min(720px, calc(100vw - 32px))", maxHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${TV.border}` }}>
          <div style={{ fontSize: 20, fontWeight: 600, flex: 1 }}>{title}</div>
          <button onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "transparent", cursor: "pointer", color: TV.muted, padding: 4 }}><X size={20} /></button>
        </div>
        <div style={{ display: "flex", minHeight: 0, flex: 1 }}>{children}</div>
        <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: `1px solid ${TV.border}`, alignItems: "center" }}>
          {left}<div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ border: `1px solid ${TV.text}`, background: "#fff", color: TV.text, borderRadius: 8, padding: "8px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: TV_FONT }}>Annuler</button>
          <button onClick={onOk} style={{ border: "none", background: TV.text, color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: TV_FONT }}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}
const tvChk = (checked, onChange, label, extra) => (
  <label key={typeof label === "string" ? label : undefined} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, cursor: "pointer", padding: "5px 0" }}>
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: TV.text, cursor: "pointer" }} />
    <span style={{ flex: 1 }}>{label}</span>{extra}
  </label>
);
const tvColor = (v, onChange, title) => (
  <label title={title} style={{ width: 34, height: 34, border: `1px solid ${TV.border}`, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
    <span style={{ width: 22, height: 22, borderRadius: 3, background: v }} />
    <input type="color" value={v} onChange={(e) => onChange(e.target.value)} style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }} />
  </label>
);
const TV_FIB0 = [[0, "#787b86", 1], [0.236, "#f23645", 0], [0.382, "#f23645", 0], [0.5, "#131722", 1], [0.618, "#787b86", 0], [0.62, "#131722", 1], [0.705, "#131722", 1], [0.79, "#131722", 1], [1, "#131722", 1], [1.272, "#2962ff", 0], [1.414, "#f23645", 0], [1.618, "#2962ff", 0], [2, "#9c27b0", 0], [2.618, "#f23645", 0], [3.618, "#9c27b0", 0], [4.236, "#e91e63", 0]];
const TV_FIBX0 = [[0, "#787b86", 1], [0.618, "#089981", 1], [1, "#787b86", 1], [1.272, "#2962ff", 1], [1.618, "#2962ff", 1], [2, "#9c27b0", 1], [2.618, "#f23645", 1], [3.618, "#9c27b0", 0], [4.236, "#e91e63", 0]];
const TV_DNAME = { fib: "Retracement de Fibonacci", fibext: "Extension de Fibonacci", rect: "Rectangle", trend: "Ligne de tendance", hline: "Ligne horizontale", hray: "Rayon horizontal", vline: "Ligne verticale", ray: "Rayon", ext: "Ligne étendue", channel: "Canal", circle: "Cercle", triangle: "Triangle", path: "Flèche", brush: "Pinceau", highlight: "Surligneur", text: "Texte", cross: "Croix" };
function TvDrawSettings({ d: d0, onClose, onApply }) {
  const [d, setD] = useState(() => { const c = JSON.parse(JSON.stringify(d0)); if ((c.type === "fib" || c.type === "fibext") && !c.lv) c.lv = JSON.parse(JSON.stringify(c.type === "fib" ? TV_FIB0 : TV_FIBX0)); return c; });
  const [tab, setTab] = useState("style");
  const up = (f) => setD((o) => { const n = JSON.parse(JSON.stringify(o)); f(n); return n; });
  useEffect(() => { const k = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }; window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true); }, []);
  const isFib = d.type === "fib" || d.type === "fibext";
  const col = d.color || (d.kind && (TV_ZONE[d.kind] || TV_LIQ[d.kind] || TV_STRUCT[d.kind])) || TV.blue;
  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 0" };
  const inp = { border: `1px solid ${TV.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 13, fontFamily: TV_FONT, width: 90 };
  const sw = (v, f) => <input type="color" value={v} onChange={(e) => f(e.target.value)} style={{ width: 34, height: 30, border: `1px solid ${TV.border}`, borderRadius: 6, padding: 2, background: "#fff", cursor: "pointer" }} />;
  const tabB = (k, n) => <button key={k} onClick={() => setTab(k)} style={{ border: "none", background: "none", fontSize: 15, fontWeight: 600, fontFamily: TV_FONT, padding: "8px 0", marginRight: 22, cursor: "pointer", color: TV.text, borderBottom: tab === k ? `3px solid ${TV.text}` : "3px solid transparent" }}>{n}</button>;
  return <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TV_FONT }}>
    <div style={{ background: "#fff", borderRadius: 14, width: 520, maxWidth: "94vw", maxHeight: "86vh", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px 4px" }}><b style={{ fontSize: 20 }}>{TV_DNAME[d.type] || d.type}</b><button onClick={onClose} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: TV.text }}>×</button></div>
      <div style={{ padding: "0 22px", borderBottom: `1px solid ${TV.border}` }}>{tabB("style", "Style")}{tabB("coord", "Coordonnées")}{d.type === "rect" || d.type === "text" || d.kind !== undefined ? tabB("txt", "Texte") : null}</div>
      <div style={{ padding: "8px 22px", overflowY: "auto", flex: 1 }}>
        {tab === "style" && <>
          {!isFib && <div style={row}><span>Couleur</span>{sw(col, (v) => up((n) => { n.color = v; }))}</div>}
          {d.type !== "rect" && <div style={row}><span>{isFib ? "Ligne des niveaux" : "Ligne"}</span><span style={{ display: "flex", gap: 6 }}><select value={d.w || (isFib ? 1 : 1.5)} onChange={(e) => up((n) => { n.w = +e.target.value; })} style={inp}>{[1, 1.5, 2, 3, 4].map((w) => <option key={w} value={w}>{w}px</option>)}</select>{!isFib && <select value={d.dash ? 1 : 0} onChange={(e) => up((n) => { n.dash = !!+e.target.value; })} style={inp}><option value={0}>Pleine</option><option value={1}>Pointillée</option></select>}</span></div>}
          {d.type === "rect" && <div style={row}><span>Opacité du fond</span><span><input type="range" min={0} max={0.6} step={0.02} value={d.op ?? 0.13} onChange={(e) => up((n) => { n.op = +e.target.value; })} /> {Math.round((d.op ?? 0.13) * 100)} %</span></div>}
          {isFib && <>
            <div style={row}><label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={!d.noTrend} onChange={(e) => up((n) => { n.noTrend = !e.target.checked; })} />Ligne de tendance</label>{d.type === "fib" && <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={!d.noZone} onChange={(e) => up((n) => { n.noZone = !e.target.checked; })} />Zone OTE 0.62–0.79</label>}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 18px", paddingTop: 6 }}>{d.lv.map((l, i) => <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={!!l[2]} onChange={(e) => up((n) => { n.lv[i][2] = e.target.checked ? 1 : 0; })} /><input value={l[0]} onChange={(e) => up((n) => { n.lv[i][0] = e.target.value; })} style={{ ...inp, flex: 1, width: 0, background: l[2] ? "#fff" : "#f0f3fa" }} />{sw(l[1], (v) => up((n) => { n.lv[i][1] = v; }))}</div>)}</div>
            <button onClick={() => up((n) => { n.lv.push([1.5, "#787b86", 1]); })} style={{ marginTop: 10, border: `1px solid ${TV.border}`, background: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: TV_FONT }}>+ Niveau</button>
          </>}
        </>}
        {tab === "coord" && d.pts.map((q, i) => <div key={i} style={row}><span>Point {i + 1}</span><span style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="number" step={TV_PIP} value={q.p.toFixed(TV_DIG)} onChange={(e) => up((n) => { n.pts[i].p = +e.target.value; })} style={{ ...inp, width: 110 }} /><span style={{ fontSize: 12, color: TV.muted }}>{new Date(q.t * 1000).toISOString().slice(0, 16).replace("T", " ")}</span></span></div>)}
        {tab === "txt" && <div style={row}><span>Étiquette</span><input value={d.type === "text" ? d.text || "" : d.kind || ""} onChange={(e) => up((n) => { if (n.type === "text") n.text = e.target.value; else n.kind = e.target.value || undefined; })} style={{ ...inp, width: 200 }} /></div>}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: `1px solid ${TV.border}` }}>
        <button onClick={onClose} style={{ border: `1px solid ${TV.text}`, background: "#fff", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontFamily: TV_FONT, fontWeight: 600 }}>Annuler</button>
        <button onClick={() => onApply(d)} style={{ border: "none", background: TV.text, color: "#fff", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontFamily: TV_FONT, fontWeight: 600 }}>D'accord</button>
      </div>
    </div></div>;
}

function TvSettings({ cfg, onClose, onApply, onCloseAll, onReset, years = [], onClearYear, curYear, fav = [] }) {
  const [cy, setCy] = useState(curYear || years[years.length - 1] || 2010); const [sure, setSure] = useState(false);
  const [d, setD] = useState(() => JSON.parse(JSON.stringify(cfg)));
  const [tab, setTab] = useState("kz");
  const K = d.kz, set = (fn) => setD((o) => { const n = JSON.parse(JSON.stringify(o)); fn(n); return n; });
  const num = { width: 120, height: 38, border: `1px solid ${TV.border}`, borderRadius: 8, padding: "0 10px", fontSize: 15, color: TV.text, fontFamily: TV_FONT };
  const row = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "6px 0", fontSize: 15 };
  const tabs = [["kz", "Killzones"], ["lv", "Niveaux"], ["chart", "Graphique"], ["trade", "Trading"], ["keys", "Raccourcis"]];
  return (
    <TvModal title="Paramètres" onClose={onClose} onOk={() => onApply(d)}>
      <div style={{ width: 170, borderRight: `1px solid ${TV.border}`, padding: "10px 0", flexShrink: 0 }}>
        {tabs.map(([id, n]) => <div key={id} onClick={() => setTab(id)} style={{ padding: "10px 20px", fontSize: 15, cursor: "pointer", background: tab === id ? TV.hover : "transparent", fontWeight: tab === id ? 600 : 400 }}>{n}</div>)}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "14px 22px" }}>
        {tab === "kz" && <>
          <div style={{ fontSize: 12, color: TV.muted, letterSpacing: 0.6, marginBottom: 6 }}>KILLZONES · HEURE DE NEW YORK (HEURE D'ÉTÉ INCLUSE)</div>
          {tvChk(K.show, (v) => set((n) => { n.kz.show = v; }), "Afficher")}
          {Object.entries(KZ_PRESETS).map(([id, p]) => tvChk(K.preset === id, () => set((n) => { n.kz.preset = id; n.kz.times = { ...n.kz.times, ...p.s }; KZ_SESS.forEach(([sid]) => { n.kz.on[sid] = !!p.s[sid]; }); }), p.n))}
          {tvChk(K.mid, (v) => set((n) => { n.kz.mid = v; }), "Session Mid (ligne du milieu)")}
          {tvChk(K.labels, (v) => set((n) => { n.kz.labels = v; }), "Afficher le nom des sessions")}
          <div style={{ height: 8 }} />
          {KZ_SESS.map(([id, nm]) => (
            <div key={id} style={{ ...row, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 150, cursor: "pointer" }}><input type="checkbox" checked={!!K.on[id]} onChange={(e) => set((n) => { n.kz.on[id] = e.target.checked; })} style={{ width: 18, height: 18, accentColor: TV.text }} />{nm}</label>
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="time" value={(K.times[id] || ["00:00", "00:00"])[0]} onChange={(e) => set((n) => { n.kz.times[id] = [e.target.value, (n.kz.times[id] || [])[1] || "00:00"]; })} style={{ ...num, width: 110 }} />
                <span style={{ color: TV.muted }}>→</span>
                <input type="time" value={(K.times[id] || ["00:00", "00:00"])[1]} onChange={(e) => set((n) => { n.kz.times[id] = [(n.kz.times[id] || [])[0] || "00:00", e.target.value]; })} style={{ ...num, width: 110 }} />
                {tvColor(K.color[id], (v) => set((n) => { n.kz.color[id] = v; }), "Couleur " + nm)}
              </span>
            </div>))}
          <div style={row}><span>Killzone Display Days</span><input type="number" value={K.days} onChange={(e) => set((n) => { n.kz.days = +e.target.value || 1; })} style={num} /></div>
          <div style={row}><span>Transparency</span><input type="number" min="0" max="100" value={K.transp} onChange={(e) => set((n) => { n.kz.transp = Math.max(0, Math.min(100, +e.target.value)); })} style={num} /></div>
          <div style={{ fontSize: 12, color: TV.muted, marginTop: 8, lineHeight: 1.5 }}>Les horaires sont en heure de New York : le passage à l'heure d'été (2e dimanche de mars → 1er dimanche de novembre) est appliqué à chaque date depuis 2010. Visible jusqu'au H1.</div>
        </>}
        {tab === "lv" && <>
          <div style={{ fontSize: 12, color: TV.muted, letterSpacing: 0.6, marginBottom: 6 }}>PLUS HAUTS / PLUS BAS PRÉCÉDENTS</div>
          {tvChk(d.lv.pd, (v) => set((n) => { n.lv.pd = v; }), "Previous Day High / Low (PDH / PDL)", tvColor(d.lv.pdColor, (v) => set((n) => { n.lv.pdColor = v; }), "Couleur PDH/PDL"))}
          {tvChk(d.lv.pw, (v) => set((n) => { n.lv.pw = v; }), "Previous Week High / Low (PWH / PWL)", tvColor(d.lv.pwColor, (v) => set((n) => { n.lv.pwColor = v; }), "Couleur PWH/PWL"))}
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", paddingLeft: 28 }}>
            {["pdh", "pdl", "pwh", "pwl"].map((k) => <span key={k}>{tvChk(d.lv[k] !== false, (v) => set((n) => { n.lv[k] = v; }), k.toUpperCase())}</span>)}
          </div>
          <div style={{ fontSize: 12, color: TV.muted, marginTop: 8 }}>Jour et semaine coupés à 17:00 New York, comme TradingView.</div>
        </>}
        {tab === "chart" && <>
          <div style={{ fontSize: 12, color: TV.muted, letterSpacing: 0.6, marginBottom: 6 }}>BOUGIES</div>
          <div style={row}><span>Corps haussier</span>{tvColor(d.up, (v) => set((n) => { n.up = v; }))}</div>
          <div style={row}><span>Corps baissier, mèches et bordures</span>{tvColor(d.down, (v) => set((n) => { n.down = v; }))}</div>
          {tvChk(d.hideFlat, (v) => set((n) => { n.hideFlat = v; }), "Masquer les bougies plates (pointillés), la bougie suivante se colle")}
          {tvChk(d.grid, (v) => set((n) => { n.grid = v; }), "Quadrillage en arrière-plan")}
        </>}
        {tab === "keys" && (() => { const km = d.keys || tvDefKeys(fav); const ids = [...new Set([...fav, ...Object.values(km)])].filter((id) => TV_TOOLS[id]); const letterOf = (id) => Object.keys(km).find((k) => km[k] === id) || "";
          return <>
            <div style={{ fontSize: 13, color: TV.muted, marginBottom: 8 }}>Appuie sur la lettre pour choisir l'outil (sans Ctrl).</div>
            {ids.map((id) => <div key={id} style={row}><span style={{ display: "flex", alignItems: "center", gap: 8 }}><TvIcon id={id} />{TV_TOOLS[id].n}</span>
              <input value={letterOf(id).toUpperCase()} maxLength={1} onChange={(e) => { const L = e.target.value.toLowerCase().replace(/[^a-z]/g, ""); set((o) => { const m = { ...(o.keys || tvDefKeys(fav)) }; Object.keys(m).forEach((k) => { if (m[k] === id || (L && k === L)) delete m[k]; }); if (L) m[L] = id; o.keys = m; }); }} style={{ ...num, width: 52, textAlign: "center", textTransform: "uppercase" }} /></div>)}
            <button onClick={() => set((o) => { o.keys = tvDefKeys(fav); })} style={{ marginTop: 10, border: `1px solid ${TV.border}`, background: "#fff", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: TV_FONT }}>Remettre Q → P</button>
          </>; })()}
        {tab === "trade" && <>
          <div style={{ fontSize: 12, color: TV.muted, letterSpacing: 0.6, marginBottom: 6 }}>COMPTE ET ORDRES</div>
          {tvChk(d.autoBE, (v) => set((n) => { n.autoBE = v; }), `BE automatique : le SL passe à l'entrée quand le prix atteint ${d.autoBEpct || 50} % de la distance au TP`)}
          {d.autoBE && <div style={{ ...row, paddingLeft: 28 }}><span>Seuil du BE automatique (% du TP)</span><input type="number" min="10" max="95" step="5" value={d.autoBEpct || 50} onChange={(e) => set((n) => { n.autoBEpct = Math.max(10, Math.min(95, +e.target.value || 50)); })} style={num} /></div>}
          {tvChk(d.yearReset, (v) => set((n) => { n.yearReset = v; }), "Remettre Replay Trading à zéro à chaque nouvelle année (le résultat de l'année est gardé)")}
          {[["Capital ($)", "cap", 1000], ["SL par défaut (pips)", "slP", 0.5], ["TP (R)", "rr", 0.5], ["Stake % (risque par trade, lots calculés automatiquement)", "risk", 0.5]].map(([l, k, st]) => (
            <div key={k} style={row}><span>{l}</span><input type="number" step={st} value={d[k]} onChange={(e) => set((n) => { n[k] = +e.target.value; })} style={num} /></div>))}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={onCloseAll} style={{ ...num, width: "auto", cursor: "pointer", background: "#fff" }}>Tout fermer</button>
            <button onClick={onReset} style={{ ...num, width: "auto", cursor: "pointer", background: "#fff", color: TV.red }}>Vider la session (positions et dessins)</button>
          </div>
          <div style={{ fontSize: 12, color: TV.muted, letterSpacing: 0.6, margin: "18px 0 6px" }}>RECOMMENCER UNE ANNÉE</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select value={cy} onChange={(e) => { setCy(+e.target.value); setSure(false); }} style={{ ...num, width: 110 }}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            {!sure ? <button onClick={() => setSure(true)} style={{ ...num, width: "auto", cursor: "pointer", background: "#fff", color: TV.red }}>Effacer les stats de {cy} et recommencer</button>
              : <button onClick={() => onClearYear(cy)} style={{ ...num, width: "auto", cursor: "pointer", background: TV.red, color: "#fff", border: "none" }}>Confirmer : effacer {cy}</button>}
          </div>
          <div style={{ fontSize: 12, color: TV.muted, marginTop: 6 }}>Supprime les trades de cette année pour la session active (aussi dans Saisie & stats) et remet le replay au 2 janvier.</div>
        </>}
      </div>
    </TvModal>
  );
}
function TvNewSession({ list, onClose, onCreate, onDelete }) {
  const [title, setTitle] = useState(""); const [mode, setMode] = useState("random"); const [date, setDate] = useState("2015-01-05");
  const [blind, setBlind] = useState(false); const [isProp, setIsProp] = useState(false);
  const [pp, setPp] = useState({ size: 100000, steps: 2, t1: 8, t2: 5, daily: 5, max: 10, split: 80, minDays: 0 });
  const ex = () => ({ blind, prop: isProp ? { ...pp } : null });
  const nf = (k, lab, suf = "%") => <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 3 }}>{lab}<span><input type="number" value={pp[k]} onChange={(e) => setPp({ ...pp, [k]: +e.target.value })} style={{ width: 64, height: 30, border: `1px solid ${TV.border}`, borderRadius: 6, padding: "0 6px", fontFamily: TV_FONT }} /> {suf}</span></label>;
  const num = { height: 38, border: `1px solid ${TV.border}`, borderRadius: 8, padding: "0 10px", fontSize: 15, color: TV.text, fontFamily: TV_FONT };
  return (
    <TvModal title="Nouvelle session de backtest" onClose={onClose} onOk={() => onCreate(title.trim(), mode, date, ex())} okLabel="Créer">
      <div style={{ flex: 1, padding: "16px 22px", display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
        <label style={{ fontSize: 15 }}>Titre<br /><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. FVG H4" style={{ ...num, width: "100%", marginTop: 6 }} onKeyDown={(e) => e.key === "Enter" && onCreate(title.trim(), mode, date, ex())} /></label>
        {tvChk(mode === "random", () => setMode("random"), "Commencer à une date aléatoire")}
        {tvChk(mode === "date", () => setMode("date"), "Commencer à une date précise", mode === "date" && <input type="date" min="2010-01-01" value={date} onChange={(e) => setDate(e.target.value)} style={num} />)}
        {tvChk(blind, setBlind, "Mode à l'aveugle (dates cachées, départ aléatoire)")}
        {tvChk(isProp, setIsProp, "Challenge prop firm (Phase 1 → Phase 2 → compte financé)")}
        {isProp && <div style={{ border: `1px solid ${TV.border}`, borderRadius: 8, padding: 12, display: "flex", flexWrap: "wrap", gap: 12 }}>
          <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 3 }}>Taille du compte<select value={pp.size} onChange={(e) => setPp({ ...pp, size: +e.target.value })} style={{ height: 30, border: `1px solid ${TV.border}`, borderRadius: 6, fontFamily: TV_FONT }}>{[10000, 25000, 50000, 100000, 200000].map((v) => <option key={v} value={v}>{v / 1000} k$</option>)}</select></label>
          <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 3 }}>Étapes<select value={pp.steps} onChange={(e) => setPp({ ...pp, steps: +e.target.value })} style={{ height: 30, border: `1px solid ${TV.border}`, borderRadius: 6, fontFamily: TV_FONT }}><option value={2}>2 phases (classique)</option><option value={1}>1 phase</option></select></label>
          {nf("t1", "Objectif phase 1")}{pp.steps === 2 && nf("t2", "Objectif phase 2")}{nf("daily", "Perte max / jour")}{nf("max", "Perte max totale")}{nf("split", "Part des profits")}{nf("minDays", "Jours de trading min.", "j")}
          <div style={{ fontSize: 12, color: TV.muted, width: "100%" }}>Pertes calculées sur les trades fermés (journée = 17h New York). Si tu réussis une phase, tu passes à la suivante avec un solde remis à zéro ; si une règle est cassée, le challenge échoue et tu peux recommencer.</div>
        </div>}
        <div style={{ fontSize: 12, color: TV.muted, letterSpacing: 0.6, marginTop: 8 }}>SESSIONS EXISTANTES</div>
        {list.map((x) => (
          <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, padding: "4px 0", borderTop: `1px solid ${TV.border}` }}>
            <span style={{ flex: 1 }}>{x.title}</span><span style={{ color: TV.muted, fontSize: 13 }}>{(x.trades || []).filter((t) => t.status === "closed").length} trades</span>
            {list.length > 1 && <button title="Supprimer la session (les trades restent dans Saisie & stats)" onClick={() => onDelete(x.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: TV.muted }}><Trash2 size={15} /></button>}
          </div>))}
      </div>
    </TvModal>
  );
}

function TvLegend({ R }) {
  const [lb, set] = useState(R.legBar || null);
  useEffect(() => { R.setLeg = set; return () => { if (R.setLeg === set) R.setLeg = null; }; }, []);
  if (!lb) return null; const prevC = R.agg && R.k > 0 ? R.agg.bars[R.k - 1].close : null; const chg = prevC ? lb.close - prevC : 0; const lcol = chg >= 0 ? TV.green : TV.red;
  return <span style={{ fontSize: 13, color: lcol }}>O<span>{lb.open.toFixed(TV_DIG)}</span> H{lb.high.toFixed(TV_DIG)} B{lb.low.toFixed(TV_DIG)} C{lb.close.toFixed(TV_DIG)} {chg >= 0 ? "+" : ""}{(chg / TV_PIP).toFixed(1)} ({prevC ? ((chg / prevC) * 100).toFixed(2) : "0.00"}%)</span>;
}

/* graphique secondaire synchronisé sur le replay (autre timeframe), comme les dispositions de TradingView */
function TvMini({ pos, rows, ci, getAgg, min, setMin, trades, tz, cfg, blind, R, onActivate }) {
  const box = useRef(null), cv = useRef(null), S = useRef({}).current; S.tz = tz; S.rows = rows; S.R = R; S.min = min;
  /* graphique commun : mêmes rectangles, lignes et positions que le graphique principal */
  const xOf = (tt) => { const A = S.A; if (!A || !S.rows || S.k == null) return null; const ts = S.ch.timeScale();
    const last = A.bars[S.k].time; let k;
    if (tt > last) k = S.k + (tt - last) / (S.min * 60); /* au-delà de la dernière bougie : on continue avec l'écart entre bougies */
    else { k = tvBs(A.start, tvBsRows(S.rows, tt)); if (k < 0) return null; }
    const x0 = ts.logicalToCoordinate(S.k); if (x0 == null) return null; return x0 + (k - S.k) * (ts.options().barSpacing || 6); };
  const redraw = () => {
    const c = cv.current, el = box.current; if (!c || !el || !S.se || !S.A) return; const w = el.clientWidth, h = el.clientHeight, dpr = window.devicePixelRatio || 1;
    if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; c.style.width = w + "px"; c.style.height = h + "px"; }
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); const cw = w - 60; const y = (p) => S.se.priceToCoordinate(p);
    const RR = S.R || {}; const now = S.rows ? S.rows[ci][0] : 0;
    g.save(); g.beginPath(); g.rect(0, 0, cw, h - 26); g.clip();
    const list = S.pend ? [...(RR.draws || []), S.pend] : RR.draws || [];
    list.forEach((d, di) => {
      if (!d.pts || !d.pts.length || d.type === "measure") return; const selD = di === RR.sel || d === S.pend; const col = d.color || (d.kind && ((typeof TV_ZONE !== "undefined" && TV_ZONE[d.kind]) || (typeof TV_LIQ !== "undefined" && TV_LIQ[d.kind]) || (typeof TV_STRUCT !== "undefined" && TV_STRUCT[d.kind]))) || TV.blue;
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1; const a = d.pts[0], b = d.pts[1];
      if (d.type === "rect" && b) { const x1 = xOf(Math.min(a.t, b.t)), x2 = xOf(Math.max(a.t, b.t)), y1 = y(a.p), y2 = y(b.p); if (y1 == null || y2 == null) return; const X1 = x1 ?? 0, X2 = x2 ?? cw; g.globalAlpha = 0.15; g.fillRect(X1, Math.min(y1, y2), Math.max(2, X2 - X1), Math.abs(y2 - y1)); g.globalAlpha = 1; g.strokeRect(X1, Math.min(y1, y2), Math.max(2, X2 - X1), Math.abs(y2 - y1)); if (d.kind) { g.font = "10px " + TV_FONT; g.fillText(d.kind + (d.tf ? " " + d.tf : ""), X1 + 3, Math.min(y1, y2) + 11); } }
      else if (d.type === "hline" || d.type === "hray" || d.type === "bsl" || d.type === "ssl") { const yy = y(a.p); if (yy == null) return; const x0 = d.type === "hline" ? 0 : xOf(a.t) ?? 0; g.beginPath(); g.moveTo(x0, yy); g.lineTo(cw, yy); g.stroke(); if (d.kind) { g.font = "10px " + TV_FONT; g.fillText(d.kind, x0 + 2, yy - 3); } }
      else if (d.type === "fib" && b) { const x1 = xOf(Math.min(a.t, b.t)) ?? 0, x2 = xOf(Math.max(a.t, b.t)) ?? cw; g.font = "10px " + TV_FONT; for (const lv of [0, 0.5, 0.618, 0.705, 0.79, 1]) { const pr = b.p + (a.p - b.p) * lv, yy = y(pr); if (yy == null) continue; g.strokeStyle = lv === 0.705 ? "#ff9800" : "#787b86"; g.beginPath(); g.moveTo(x1, yy); g.lineTo(x2, yy); g.stroke(); g.fillStyle = g.strokeStyle; g.fillText(lv, x1 + 2, yy - 2); } }
      else if (d.type === "text" && d.text) { const xx = xOf(a.t), yy = y(a.p); if (xx == null || yy == null) return; g.font = "13px " + TV_FONT; g.fillStyle = d.color || TV.text; g.fillText(d.text, xx, yy); }
      else if ((d.type === "trend" || d.type === "ray" || d.type === "ext") && b) { const x1 = xOf(a.t), x2 = xOf(b.t), y1 = y(a.p), y2 = y(b.p); if (x1 == null || x2 == null || y1 == null || y2 == null) return; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
      if (selD) { const hp = d.type === "rect" && d.pts[1] ? [[d.pts[0].t, d.pts[0].p], [d.pts[1].t, d.pts[0].p], [d.pts[0].t, d.pts[1].p], [d.pts[1].t, d.pts[1].p]] : d.pts.map((q) => [q.t, q.p]);
        for (const [qt, qp] of hp) { const qx = xOf(qt), qy = y(qp); if (qx == null || qy == null) continue; g.fillStyle = "#fff"; g.strokeStyle = TV.blue; g.lineWidth = 1.2; g.beginPath(); g.arc(qx, qy, 4.5, 0, 7); g.fill(); g.stroke(); }
        if (d.type === "rect" && d.pts[1]) { const xa = xOf(Math.min(d.pts[0].t, d.pts[1].t)), xb = xOf(Math.max(d.pts[0].t, d.pts[1].t)), ya2 = y(Math.max(d.pts[0].p, d.pts[1].p)), yb2 = y(Math.min(d.pts[0].p, d.pts[1].p));
          if (xa != null && xb != null && ya2 != null && yb2 != null) { const xm = (xa + xb) / 2, ym = (ya2 + yb2) / 2; g.setLineDash([2, 3]); g.strokeStyle = TV.blue; g.beginPath(); g.moveTo(xa, ym); g.lineTo(xb, ym); g.stroke(); g.setLineDash([]);
            for (const [sx, sy] of [[xm, ya2], [xm, yb2], [xa, ym], [xb, ym]]) { g.fillStyle = "#fff"; g.strokeStyle = TV.blue; g.fillRect(sx - 4, sy - 4, 8, 8); g.strokeRect(sx - 4, sy - 4, 8, 8); } } } }
    });
    for (const tr of RR.trades || []) { /* positions : entrée -> TP (vert) et entrée -> SL (rouge) */
      if (tr.status === "pending" || !tr.openT) continue; const end = tr.status === "closed" ? tr.closeT : now; if (end < now - 30 * 86400) continue;
      const x1 = xOf(tr.openT), x2 = xOf(end); if (x2 == null && x1 == null) continue; const X1 = x1 ?? 0, X2 = Math.max(X1 + 4, x2 ?? cw); const ye = y(tr.entry), yt = y(tr.tp), ys = y(tr.sl); if (ye == null) continue;
      if (yt != null) { g.fillStyle = "rgba(8,153,129,0.22)"; g.fillRect(X1, Math.min(ye, yt), X2 - X1, Math.abs(yt - ye)); }
      if (ys != null) { g.fillStyle = "rgba(242,54,69,0.22)"; g.fillRect(X1, Math.min(ye, ys), X2 - X1, Math.abs(ys - ye)); }
      g.strokeStyle = "#787b86"; g.beginPath(); g.moveTo(X1, ye); g.lineTo(X2, ye); g.stroke();
    }
    g.restore();
  };
  /* un seul dessin par image, et seulement si quelque chose a changé */
  /* position (dans le cadre des graphiques) de la barre OB / SIBI / BISI… pour un dessin de ce graphique */
  S.barPos = (d) => { const el = box.current; if (!el || !S.se || !d.pts) return null; const host = el.parentElement && el.parentElement.parentElement; if (!host) return null; const ro = el.getBoundingClientRect(), rh = host.getBoundingClientRect();
    const xs = d.pts.map((q) => xOf(q.t)).filter((v) => v != null), ys = d.pts.map((q) => S.se.priceToCoordinate(q.p)).filter((v) => v != null); if (!ys.length) return null;
    const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : el.clientWidth / 2; const top = Math.min(...ys);
    return { x: Math.max(4, Math.min(ro.width - 300, cx - 140)) + ro.left - rh.left, y: Math.max(40, top - 48) + ro.top - rh.top }; };
  S.redraw = () => { if (S.raf) return; S.raf = requestAnimationFrame(() => { S.raf = 0; redraw(); }); };
  useEffect(() => {
    const ch = createChart(box.current, { autoSize: true, layout: { background: { color: TV.bg }, textColor: TV.text, fontSize: 11, fontFamily: TV_FONT }, grid: { vertLines: { visible: false }, horzLines: { visible: false } }, crosshair: { mode: 0 }, rightPriceScale: { borderColor: TV.border, scaleMargins: { top: 0.12, bottom: 0.08 } }, timeScale: { borderColor: TV.border, timeVisible: true, rightOffset: 10, barSpacing: 6, tickMarkFormatter: (t, ty) => tvFmtTime(t, S.tz, ty) }, localization: { locale: "fr-FR", timeFormatter: (t) => tvFmtTime(t, S.tz, "full") } });
    S.ch = ch; S.se = ch.addCandlestickSeries({ priceLineVisible: false, upColor: cfg.up, downColor: cfg.down, borderUpColor: cfg.down, borderDownColor: cfg.down, wickUpColor: cfg.down, wickDownColor: cfg.down, priceFormat: { type: "price", precision: TV_DIG, minMove: 0.00001 } });
    ch.timeScale().subscribeVisibleLogicalRangeChange(() => { S.redraw && S.redraw(); if (S.R && S.R.selOn === S) S.R.dirty = true; });
    const sigOf = () => { const RR = S.R || {}; const d = RR.draws || []; let s = d.length + "|" + (RR.trades || []).length + "|" + ci; for (const x of d) s += (x.pts || []).map((q) => q.t + "," + q.p).join(";") + (x.kind || ""); for (const x of RR.trades || []) s += x.status + x.sl + x.tp; return s; };
    const iv = setInterval(() => { const sg = sigOf(); if (sg !== S.lastSig) { S.lastSig = sg; S.redraw(); } }, 400);
    let vraf = 0; const vloop = () => { try { const v = S.se ? S.se.coordinateToPrice(0) + "|" + S.se.coordinateToPrice(400) : ""; if (v !== S.vSig) { S.vSig = v; redraw(); if (S.R && S.R.selOn === S) S.R.dirty = true; } } catch (e) {} vraf = requestAnimationFrame(vloop); }; vloop();
    /* le graphique principal prévient ce graphique à chaque modification : affichage instantané des deux côtés */
    if (S.R) { S.R.minis = S.R.minis || new Set(); S.R.minis.add(S); }
    /* curseur synchronisé dans les deux sens */
    const toMini = (p) => { const RR = S.R; if (!S.A || !RR || !RR.series || RR.xLock === "mini") return; if (!p || p.time === undefined || !p.point) { try { ch.clearCrosshairPosition(); } catch (e) {} return; } const pr = RR.series.coordinateToPrice(p.point.y); const k = tvBs(S.A.start, tvBsRows(S.rows, p.time)); if (k < 0 || pr == null) return; RR.xLock = "main"; try { ch.setCrosshairPosition(pr, S.A.bars[k].time, S.se); } catch (e) {} RR.xLock = null; };
    const fromMini = (p) => { const RR = S.R; if (!RR || !RR.chart || !RR.agg || RR.xLock === "main") return; if (!p || p.time === undefined || !p.point) { try { RR.chart.clearCrosshairPosition(); } catch (e) {} return; } const pr = S.se.coordinateToPrice(p.point.y); const k = tvBs(RR.agg.start, tvBsRows(S.rows, p.time)); if (k < 0 || pr == null) return; RR.xLock = "mini"; try { RR.chart.setCrosshairPosition(pr, RR.agg.bars[k].time, RR.series); } catch (e) {} RR.xLock = null; };
    const thr = (fn) => { let q = null, f = 0; return (p) => { q = p; if (f) return; f = requestAnimationFrame(() => { f = 0; fn(q); }); }; };
    const fromMiniT = thr(fromMini), toMiniT = thr(toMini);
    ch.subscribeCrosshairMove(fromMiniT); const mainCh = S.R && S.R.chart; if (mainCh) mainCh.subscribeCrosshairMove(toMiniT);
    /* même timeframe des deux côtés : défilement et zoom synchronisés */
    const sameTf = () => S.R && S.R.agg && S.A && S.R.agg.min === S.min;
    const fromMain = (r) => { if (!r || !sameTf() || S.lockR) return; S.lockR = true; try { ch.timeScale().setVisibleLogicalRange(r); } catch (e) {} S.lockR = false; };
    const toMain = (r) => { if (!r || !sameTf() || S.lockR || !mainCh) return; S.lockR = true; try { mainCh.timeScale().setVisibleLogicalRange(r); } catch (e) {} S.lockR = false; };
    if (mainCh) mainCh.timeScale().subscribeVisibleLogicalRangeChange(fromMain); ch.timeScale().subscribeVisibleLogicalRangeChange(toMain);
    /* ---- dessiner et modifier directement sur ce graphique (dessins communs aux deux) ---- */
    const el = box.current;
    const xToT = (x) => { const A = S.A; if (!A) return null; const lg = Math.round(ch.timeScale().coordinateToLogical(x)); if (lg <= S.k) return A.bars[Math.max(0, lg)].time; return A.bars[S.k].time + (lg - S.k) * S.min * 60; };
    const P = (e) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const pt = (p) => ({ t: xToT(p.x), p: S.se.coordinateToPrice(p.y) });
    const hit = (p) => { const RR = S.R; let best = null; (RR.draws || []).forEach((d, i) => { if (!d.pts || RR.hidden) return; const a = d.pts[0], b = d.pts[1]; const ya = S.se.priceToCoordinate(a.p);
        if (d.type === "rect" && b) { const x1 = xOf(Math.min(a.t, b.t)) ?? 0, x2 = xOf(Math.max(a.t, b.t)) ?? el.clientWidth, y1 = Math.min(ya, S.se.priceToCoordinate(b.p)), y2 = Math.max(ya, S.se.priceToCoordinate(b.p));
          const corner = [[0, 0], [1, 0], [0, 1], [1, 1]].find(([cx, cy]) => Math.abs(p.x - (cx ? x2 : x1)) < 8 && Math.abs(p.y - (cy ? y2 : y1)) < 8);
          const xm = (x1 + x2) / 2, ym = (y1 + y2) / 2; const side = !corner && [["et", xm, y1], ["eb", xm, y2], ["el", x1, ym], ["er", x2, ym]].find(([, sx, sy]) => Math.abs(p.x - sx) < 7 && Math.abs(p.y - sy) < 7);
          if (side) { best = { i, area: -2, mode: side[0] }; return; }
          if (corner || (p.x >= x1 - 3 && p.x <= x2 + 3 && p.y >= y1 - 3 && p.y <= y2 + 3)) { const area = (x2 - x1) * (y2 - y1); if (!best || corner || area < best.area) best = { i, area: corner ? -1 : area, mode: corner ? "c" + corner.join("") : "move" }; } }
        else if ((d.type === "hline" || d.type === "hray" || d.type === "bsl" || d.type === "ssl") && ya != null && Math.abs(p.y - ya) < 6) { if (!best) best = { i, area: 0, mode: "move" }; }
        else if (d.type === "text" && ya != null) { const xx = xOf(a.t); if (xx != null && p.x >= xx - 4 && p.x <= xx + 120 && p.y >= ya - 16 && p.y <= ya + 4 && !best) best = { i, area: 0, mode: "move" }; }
        else if (d.type === "fib" && b) { const x1 = xOf(Math.min(a.t, b.t)) ?? 0, x2 = xOf(Math.max(a.t, b.t)) ?? el.clientWidth, yb = S.se.priceToCoordinate(b.p); if (p.x >= x1 - 4 && p.x <= x2 + 4 && p.y >= Math.min(ya, yb) - 4 && p.y <= Math.max(ya, yb) + 4 && !best) best = { i, area: 0, mode: Math.hypot(p.x - xOf(a.t), p.y - ya) < 8 ? "p0" : Math.hypot(p.x - xOf(b.t), p.y - yb) < 8 ? "p1" : "move" }; }
        else if ((d.type === "trend" || d.type === "ray" || d.type === "ext") && b) { const x1 = xOf(a.t), x2 = xOf(b.t), y2 = S.se.priceToCoordinate(b.p); if (x1 == null || x2 == null) return; const L = Math.hypot(x2 - x1, y2 - ya) || 1, dd = Math.abs((y2 - ya) * p.x - (x2 - x1) * p.y + x2 * ya - y2 * x1) / L; if (dd < 6 && p.x >= Math.min(x1, x2) - 6 && p.x <= Math.max(x1, x2) + 6 && !best) best = { i, area: 0, mode: Math.hypot(p.x - x1, p.y - ya) < 8 ? "p0" : Math.hypot(p.x - x2, p.y - y2) < 8 ? "p1" : "move" }; } });
      return best; };
    const down = (e) => {
      const RR = S.R; if (!RR || !S.A || e.button !== 0) return; const p = P(e); if (p.x > el.clientWidth - 60 || p.y > el.clientHeight - 26) return;
      const tool = RR.tool || "cursor", def = TV_TOOLS[tool] || {}; const q = pt(p); if (q.t == null || q.p == null) return;
      if (tool === "cursor") {
        const h = hit(p); if (!h) { if (RR.sel !== -1) { RR.sel = -1; RR.rerenderX && RR.rerenderX(); } return; }
        e.stopPropagation(); e.preventDefault(); RR.sel = h.i; RR.selOn = S; S.drag = { ...h, q0: q, orig: JSON.parse(JSON.stringify(RR.draws[h.i])) }; RR.rerenderX && RR.rerenderX(); S.redraw(); return;
      }
      e.stopPropagation(); e.preventDefault(); const as = def.as || tool;
      if (def.mode === "pos" && RR.api) { RR.api.order(tool === "long" ? 1 : -1, { entry: q.p, byRisk: true, at: Math.min(q.t, S.rows[ci][0]) }); if (!RR.stay) RR.setToolX("cursor"); RR.dirty = true; S.redraw(); return; }
      if (tool === "text") { const txt = window.prompt("Texte :", "Texte"); if (!txt) return; RR.draws.push({ type: "text", text: txt, pts: [q] }); RR.sel = RR.draws.length - 1; RR.selOn = S; RR.redo = []; if (!RR.stay) RR.setToolX("cursor"); RR.dirty = true; RR.rerenderX(); S.redraw(); return; }
      if (def.mode === 1 && ["hline", "hray"].includes(as)) { const kd = def.kind || (tool === "hray" && RR.rayKind !== "none" ? RR.rayKind : undefined) || (tool === "hline" && RR.lineKind !== "none" ? RR.lineKind : undefined); RR.draws.push({ type: as, kind: kd, pts: [q] }); RR.sel = RR.draws.length - 1; RR.selOn = S; RR.redo = []; if (!RR.stay) RR.setToolX("cursor"); RR.dirty = true; RR.rerenderX(); S.redraw(); return; }
      if (def.mode === 2 && ["rect", "trend", "ray", "ext", "fib"].includes(as)) { const kd = def.kind || (as === "rect" && RR.rectKind !== "none" ? RR.rectKind : undefined); S.pend = { type: as, kind: kd, tf: kd ? TV_TFLAB[S.min] : undefined, pts: [q, { ...q }] }; S.redraw(); return; }
    };
    const move = (e) => {
      const RR = S.R; if (!RR) return; const p = P(e);
      if (S.pend) { const q = pt(p); if (q.t != null && q.p != null) S.pend.pts[1] = q; S.redraw(); e.stopPropagation(); return; }
      if (S.drag) { e.stopPropagation(); e.preventDefault(); const q = pt(p); if (q.t == null || q.p == null) return; const D = S.drag, d = RR.draws[D.i], o = D.orig; if (!d) return; const dt = q.t - D.q0.t, dp = q.p - D.q0.p;
        if (D.mode === "move") d.pts = o.pts.map((z) => ({ t: z.t + (d.type === "hline" ? 0 : dt), p: z.p + dp }));
        else if (D.mode === "p0" || D.mode === "p1") d.pts[D.mode === "p0" ? 0 : 1] = q;
        else if (D.mode[0] === "e") { const a = o.pts[0], b = o.pts[1]; let t1 = Math.min(a.t, b.t), t2 = Math.max(a.t, b.t), hi = Math.max(a.p, b.p), lo = Math.min(a.p, b.p); if (D.mode === "et") hi = q.p; if (D.mode === "eb") lo = q.p; if (D.mode === "el") t1 = q.t; if (D.mode === "er") t2 = q.t; d.pts = [{ t: t1, p: hi }, { t: t2, p: lo }]; }
        else { const cx = +D.mode[1], cy = +D.mode[2]; const a = o.pts[0], b = o.pts[1]; const xs = [Math.min(a.t, b.t), Math.max(a.t, b.t)], hiP = Math.max(a.p, b.p), loP = Math.min(a.p, b.p); xs[cx] = q.t; const ps = [hiP, loP]; ps[cy] = q.p; d.pts = [{ t: xs[0], p: ps[0] }, { t: xs[1], p: ps[1] }]; }
        RR.dirty = true; S.redraw(); return; }
      if (!el.contains(e.target)) return;
      const h = (RR.tool || "cursor") === "cursor" ? hit(p) : null; el.style.cursor = (RR.tool || "cursor") !== "cursor" ? "crosshair" : h ? (h.mode === "move" ? "move" : h.mode === "et" || h.mode === "eb" ? "ns-resize" : h.mode === "el" || h.mode === "er" ? "ew-resize" : "nwse-resize") : "";
    };
    const up = (e) => {
      const RR = S.R; if (!RR) return;
      if (S.pend) { const s = S.pend; S.pend = null; const a = s.pts[0], b = s.pts[1]; if (a.t !== b.t || Math.abs(a.p - b.p) > 1e-6) { RR.draws.push(s); RR.sel = RR.draws.length - 1; RR.selOn = S; RR.redo = []; } if (!RR.stay) RR.setToolX("cursor"); RR.dirty = true; RR.rerenderX(); S.redraw(); return; }
      if (S.drag) { S.drag = null; RR.dirty = true; RR.rerenderX(); S.redraw(); }
      RR.dirty = true;
    };
    el.addEventListener("mousedown", down, true); window.addEventListener("mousemove", move, true); window.addEventListener("mouseup", up, true);
    S.unbind = () => { el.removeEventListener("mousedown", down, true); window.removeEventListener("mousemove", move, true); window.removeEventListener("mouseup", up, true); };
    return () => { cancelAnimationFrame(vraf); if (mainCh) try { mainCh.timeScale().unsubscribeVisibleLogicalRangeChange(fromMain); } catch (e) {} if (S.R && S.R.minis) S.R.minis.delete(S); S.unbind && S.unbind(); clearInterval(iv); if (mainCh) try { mainCh.unsubscribeCrosshairMove(toMiniT); } catch (e) {} ch.remove(); S.se = null; S.A = null; };
  }, []);
  useEffect(() => { if (S.ch) S.ch.timeScale().applyOptions({ tickMarkFormatter: (t, ty) => tvFmtTime(t, S.tz, ty) }); }, [blind, tz]);
  useEffect(() => {
    if (!rows || !S.se) return; const A = getAgg(min), k = tvBs(A.start, ci); if (k < 0) return;
    const live = () => { let h = -1e9, l = 1e9; for (let i = A.start[k]; i <= ci; i++) { const r = rows[i]; if (r[2] > h) h = r[2]; if (r[3] < l) l = r[3]; } return { time: A.bars[k].time, open: rows[A.start[k]][1], high: h, low: l, close: rows[ci][4] }; };
    const bar = (b) => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close });
    if (S.A !== A || S.k == null || k < S.k || ci < S.ci) { const data = new Array(k + 1); for (let j = 0; j < k; j++) data[j] = bar(A.bars[j]); data[k] = live(); S.se.setData(data); if (S.A !== A) S.ch.timeScale().scrollToRealTime(); }
    else { for (let j = S.k; j < k; j++) S.se.update(bar(A.bars[j])); S.se.update(live()); }
    S.A = A; S.k = k; S.ci = ci;
    const sig = trades.filter((t) => t.status !== "closed").map((t) => [t.entry, t.sl, t.tp].join()).join("|");
    if (sig !== S.sig) { S.sig = sig; (S.lines || []).forEach((l) => S.se.removePriceLine(l)); S.lines = [];
      for (const t of trades) if (t.status !== "closed") [[t.entry, "#787b86"], [t.sl, TV.red], [t.tp, TV.green]].forEach(([p, c]) => S.lines.push(S.se.createPriceLine({ price: p, color: c, lineWidth: 1, lineStyle: 2, axisLabelVisible: true }))); }
  }, [ci, min, rows, trades.length, trades.map((x) => x.status + x.sl + x.tp).join()]);
  return (
    <div style={{ position: "absolute", ...pos, background: TV.bg, borderLeft: pos.left && pos.left !== 0 ? `4px solid ${TV.hover}` : "none", borderTop: pos.top && pos.top !== 0 ? `4px solid ${TV.hover}` : "none", zIndex: 2 }}>
      <div ref={box} style={{ position: "absolute", inset: 0 }} />
      <canvas ref={cv} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 2 }} />
      <div style={{ position: "absolute", left: 8, top: 5, zIndex: 3, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
        <b style={{ fontWeight: 600 }}>EURUSD ·</b>
        <select value={min} onChange={(e) => setMin(+e.target.value)} style={{ border: `1px solid ${TV.border}`, borderRadius: 4, fontSize: 12, padding: "1px 4px", fontFamily: TV_FONT, background: "#fff" }}>{TV_TFS.map(([n, m]) => <option key={m} value={m}>{n}</option>)}</select>
      </div>
    </div>
  );
}

/* logo dans le menu : suit la couleur du site (currentColor) */
function TvLogoIcon({ size = 16, color = "currentColor", style }) {
  return (
    <svg width={size} height={size} viewBox="150 258 480 272" fill={color} style={style} aria-hidden="true">
      <path d="M175 283H352V505H262V372H175Z" /><circle cx="418" cy="326" r="44" /><path d="M520 283H610L518 505H415Z" />
    </svg>
  );
}

/* choix des PD arrays d'un trade : timeframe + PD array (les 15 du site) */
function TvPdPicker({ tr, addPd, delPd }) {
  const [tf, setTf] = useState(tr.tf || "H4");
  const sel = { fontSize: 12, padding: "1px 3px", fontFamily: TV_FONT, maxWidth: 140 };
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      {(tr.pd || []).map((x, i) => <span key={i} onClick={(e) => { e.stopPropagation(); delPd(tr, i); }} title="Retirer" style={{ background: x.auto ? "rgba(41,98,255,0.10)" : TV.hover, color: TV.text, borderRadius: 10, padding: "2px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{x.pd} {x.tf} ×</span>)}
      <select value={tf} onChange={(e) => { setTf(e.target.value); e.target.blur(); }} title="Timeframe" style={sel}>{TV_PD_TFS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
      <select value="" onChange={(e) => { addPd(tr, tf, e.target.value); e.target.blur(); }} title="Ajouter un PD array" style={sel}><option value="">+ PD array</option>{tvPdList().map((x) => <option key={x} value={x}>{x}</option>)}<option value="MSS">MSS</option><option value="BOS">BOS</option></select>
    </span>
  );
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", short: "Home", icon: LayoutGrid, g: "" },
  { id: "trades", label: "Trades", short: "Trades", icon: NotebookPen, g: "" },
  { id: "stats", label: "Stats", short: "Stats", icon: BarChart3, g: "", also: ["erreurs", "calendar"] },
  { id: "backtest", label: "Backtest", short: "Backtest", icon: TvLogoIcon, g: "" },
  { id: "plan", label: "Préparation", short: "Prépa", icon: BookOpen, g: "", also: ["previsions", "playbooks", "ressources"] },
  { id: "settings", label: "Réglages", short: "Réglages", icon: Settings, g: " " },
];
/* sections regroupées en onglets */
const NAV_TABS = { stats: [["stats", "Stats"], ["erreurs", "Erreurs"], ["calendar", "Calendrier"]], plan: [["plan", "Plan"], ["previsions", "Prévisions"], ["playbooks", "Playbooks"], ["ressources", "ICT"]] };
function GroupTabs({ view, setView }) {
  const g = Object.values(NAV_TABS).find((l) => l.some(([k]) => k === view)); if (!g) return null;
  return <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, marginBottom: 14, overflowX: "auto" }}>{g.map(([k, l]) => <button key={k} onClick={() => setView(k)} style={{ flex: 1, border: "none", borderRadius: 9, padding: "8px 12px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", background: view === k ? C.purpleDim : "transparent", color: view === k ? C.purpleBright : C.textSecondary, fontFamily: "inherit" }}>{l}</button>)}</div>;
}

/* ============================================================================
   PROGRESSION — transforme ton backtest et tes trades réels en plan pour monter de niveau
   1. un edge prouvé par les chiffres  2. exécuté comme en backtest  3. avec le bon risque
   ============================================================================ */
const PG_TARGETS = [1, 1.5, 2, 2.5, 3, 4, 5];
const pgSess = (t) => { try { return getSession(t.entryTime); } catch (e) { return "Hors session"; } };
const pgSetups = (t) => { const ts = t.rules?.tfSetups; if (Array.isArray(ts) && ts.length) { const l = ts.flatMap((r) => (r.setups || []).map((x) => x + (r.tf ? " " + r.tf : ""))); if (l.length) return l; } const tf = (t.tags || []).find((g) => ["M1", "M3", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "D", "W", "MN"].includes(g)); const l = (t.tags || []).filter((g) => TAG_CATALOG.find((c) => c.name === g && c.category === "setup")).map((x) => x + (tf ? " " + tf : "")); return l.length ? l : ["Sans setup"]; };
const PG_MODES = [["setup", "Setup"], ["setupSess", "Setup + session"], ["sess", "Session"], ["day", "Jour"], ["combo", "Combinaison"]];
const PG_DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const pgDay = (t) => { try { const d = new Date(t.entryTime); return PG_DAYS[new Date(d.getTime() - tvNyOff(d.getTime() / 1000) * -1000).getUTCDay()]; } catch (e) { return "?"; } };
const pgKeys = (t, mode) => mode === "day" ? [pgDay(t)] : mode === "sess" ? [pgSess(t)] : mode === "setupSess" ? pgSetups(t).map((k) => k + " · " + pgSess(t).replace(" Session", "")) : mode === "combo" ? [[...new Set(pgSetups(t))].sort().join(" + ")] : [...new Set(pgSetups(t))];
const pgClosed = (l) => l.filter((t) => t.status !== "open" && t.resultR != null && !Number.isNaN(Number(t.resultR)));

/* statistiques d'un groupe de trades, avec l'intervalle de confiance de l'espérance */
function pgStats(list) {
  const seq = [...list].sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime)); const rs = seq.map((t) => Number(t.resultR) || 0); const n = rs.length;
  if (!n) return { n: 0, w: 0, l: 0, wr: 0, avg: 0, sd: 0, lb: 0, pf: null, dd: 0, ls: 0, sum: 0, need: null, rs };
  const sum = rs.reduce((a, b) => a + b, 0), avg = sum / n, w = rs.filter((r) => r > 0).length, l = rs.filter((r) => r < 0).length;
  const sd = n > 1 ? Math.sqrt(rs.reduce((a, r) => a + (r - avg) ** 2, 0) / (n - 1)) : 0;
  const gw = rs.filter((r) => r > 0).reduce((a, b) => a + b, 0), gl = -rs.filter((r) => r < 0).reduce((a, b) => a + b, 0);
  let c = 0, pk = 0, dd = 0, s = 0, ls = 0; rs.forEach((r) => { c += r; pk = Math.max(pk, c); dd = Math.max(dd, pk - c); s = r < 0 ? s + 1 : r > 0 ? 0 : s; ls = Math.max(ls, s); });
  const lb = n > 1 ? avg - 1.96 * (sd / Math.sqrt(n)) : -Infinity;
  const need = avg > 0 && sd > 0 ? Math.max(0, Math.ceil((1.96 * sd / avg) ** 2) - n) : null;
  return { n, w, l, wr: w + l ? (w / (w + l)) * 100 : 0, avg, sd, lb, pf: gl ? gw / gl : gw ? Infinity : null, dd, ls, sum, need, rs };
}
function pgVerdict(S) {
  if (S.n < 30) return { k: "small", lab: "Échantillon trop petit", col: C.textSecondary, txt: `Encore ${30 - S.n} trade${30 - S.n > 1 ? "s" : ""} pour une première lecture fiable (30 minimum).` };
  if (S.lb > 0) return { k: "proven", lab: "Edge prouvé", col: C.teal, txt: `${fmtR(S.avg)} par trade, et encore positif dans le pire cas statistique (${fmtR(S.lb)}).` };
  if (S.avg > 0) return { k: "promising", lab: S.avg < 0.08 ? "Avantage trop faible" : "Prometteur", col: C.amber, txt: S.need != null && S.need <= 600 ? `Positif mais pas encore prouvé : environ ${S.need} trades de plus pour le confirmer.` : `Positif (${fmtR(S.avg)}) mais trop proche de zéro pour être prouvé : ajoute un filtre (session, tendance, killzone) pour le renforcer.` };
  return { k: "none", lab: "Pas d'edge", col: C.red, txt: `${fmtR(S.avg)} par trade sur ${S.n} trades : arrête-le ou change une règle (session, timeframe, tendance).` };
}
function pgGroups(list, mode) { const m = {}; list.forEach((t) => pgKeys(t, mode).forEach((k) => { (m[k] = m[k] || []).push(t); })); return m; }

/* Monte Carlo : 2 000 séries de trades tirées de ta vraie distribution de R */
function pgRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function pgMonte(rs, risk, N = 100, P = 2000) {
  if (!rs.length) return null; const rnd = pgRng(7); const dds = [], ends = []; let bust = 0, pass = 0;
  for (let p = 0; p < P; p++) {
    let eq = 1, pk = 1, dd = 0, done = false;
    for (let i = 0; i < 300; i++) {
      eq *= 1 + (rs[(rnd() * rs.length) | 0] * risk) / 100; if (eq > pk) pk = eq; const d = 1 - eq / pk; if (d > dd && i < N) dd = d;
      if (!done) { if (eq >= 1.08) { pass++; done = true; } else if (eq <= 0.9) { bust++; done = true; } } /* challenge : +8 % avant −10 % */
      if (i === N - 1) { dds.push(dd); ends.push(eq - 1); }
      if (i >= N - 1 && done) break;
    }
  }
  dds.sort((a, b) => a - b); ends.sort((a, b) => a - b);
  return { ddMed: dds[P >> 1], dd95: dds[Math.floor(P * 0.95)], p10: dds.filter((x) => x >= 0.1).length / P, retMed: ends[P >> 1], ret5: ends[Math.floor(P * 0.05)], pPos: ends.filter((x) => x > 0).length / P, pPass: pass / P, pBust: bust / P };
}

/* optimiseur de sortie : avec les vraies bougies, jusqu'où le prix est allé avant de toucher le SL */
function pgExit(rows, trades) {
  const out = []; if (!rows || !rows.length) return out; const t0r = rows[0][0], t1r = rows[rows.length - 1][0];
  for (const t of trades) {
    if ((t.pair || "").toUpperCase() !== "EURUSD") continue;
    const e = Number(t.entryPrice), sl = Number(t.stopLoss); if (!e || !sl) continue; const dir = t.direction === "long" ? 1 : -1; const risk = (e - sl) * dir; if (!(risk > 0)) continue;
    const ts = Date.parse(t.entryTime) / 1000; if (!ts || ts < t0r || ts > t1r) continue;
    const i0 = tvBsRows(rows, ts); let mfe = 0, mae = 0, hit = false, maeW = null; const r = Number(t.resultR) || 0;
    for (let j = i0; j < Math.min(rows.length, i0 + 3000); j++) {
      const h = rows[j][2], l = rows[j][3];
      if (dir > 0 ? l <= sl : h >= sl) { hit = true; break; } /* SL d'abord si les deux sont dans la même bougie (prudent) */
      const fav = dir > 0 ? (h - e) / risk : (e - l) / risk, adv = dir > 0 ? (e - l) / risk : (h - e) / risk;
      if (adv > mae) mae = adv; if (fav > mfe) mfe = fav;
      if (r > 0 && maeW == null && fav >= r) maeW = mae; /* recul maximal avant d'atteindre le résultat gagnant */
    }
    out.push({ t, mfe, mae, maeW, hit, r });
  }
  return out;
}
const pgExitExp = (ex, X) => ex.length ? ex.reduce((a, x) => a + (x.mfe >= X ? X : x.hit ? -1 : 0), 0) / ex.length : 0;

/* parcours : 5 étapes, chacune avec une action concrète */
function pgLadder(all, live) {
  const bt = pgClosed(all.filter((t) => t.accountId === BT_ACC)), lv = pgClosed(live);
  const G = Object.entries(pgGroups(bt, "setup")).filter(([k]) => k !== "Sans setup").map(([k, l]) => ({ k, S: pgStats(l) }));
  const best = [...G].sort((a, b) => (b.S.n >= 30) - (a.S.n >= 30) || b.S.lb - a.S.lb || b.S.avg - a.S.avg)[0];
  const proven = G.filter((g) => g.S.n >= 100 && g.S.lb > 0).sort((a, b) => b.S.avg - a.S.avg)[0];
  const tgt = proven || best; const liveT = tgt ? lv.filter((t) => pgSetups(t).includes(tgt.k)) : []; const LS = pgStats(liveT);
  const last = [...lv].sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime)).slice(0, 30); const revd = last.filter(isReviewed); const clean = revd.filter((t) => !(t.mistakes || []).length).length;
  const mc = tgt && tgt.S.n >= 30 ? pgMonte(tgt.S.rs, 1) : null;
  const steps = [
    { t: "Trouver un setup gagnant", done: G.some((g) => g.S.n >= 30 && g.S.avg > 0), p: best ? Math.min(1, best.S.n / 30) : 0,
      ok: best ? `« ${best.k} » est positif sur ${best.S.n} trades (${fmtR(best.S.avg)}).` : "",
      todo: !best ? "Fais tes 30 premiers trades de backtest sur UN seul setup (ex. BISI H4 en London), toujours avec les mêmes règles." : best.S.n < 30 ? `Continue « ${best.k} » : ${best.S.n}/30 trades de backtest.` : `« ${best.k} » n'est pas positif (${fmtR(best.S.avg)}). Teste une autre session ou un autre timeframe.` },
    { t: "Prouver l'edge sur 100 trades", done: !!proven, p: best ? Math.min(1, best.S.n / 100) : 0, ok: proven ? `« ${proven.k} » : ${fmtR(proven.S.avg)} par trade sur ${proven.S.n} trades, edge prouvé.` : "",
      todo: best ? `« ${best.k} » : ${best.S.n}/100 trades${best.S.n >= 30 ? ", espérance " + fmtR(best.S.avg) + (best.S.need && best.S.need <= 600 ? ` (≈ ${best.S.need} trades de plus pour la prouver)` : "") : ""}.` : "Commence par l'étape 1." },
    { t: "Le reproduire en réel", done: !!tgt && LS.n >= 20 && LS.avg >= 0.5 * tgt.S.avg && LS.avg > 0, p: Math.min(1, LS.n / 20), ok: tgt ? `${fmtR(LS.avg)} en réel sur ${LS.n} trades, cohérent avec le backtest.` : "",
      todo: !tgt ? "D'abord un setup validé en backtest." : LS.n < 20 ? `Prends « ${tgt.k} » en réel ou en démo : ${LS.n}/20 trades. Seulement ce setup.` : `En réel tu fais ${fmtR(LS.avg)} contre ${fmtR(tgt.S.avg)} en backtest : regarde tes erreurs sur ce setup.` },
    { t: "Exécuter sans erreur", ok: `${clean}/${revd.length} derniers trades revus sans erreur.`, done: last.length >= 20 && revd.length >= 0.8 * last.length && clean / revd.length >= 0.8, p: last.length ? Math.min(1, (revd.length ? clean / revd.length : 0) / 0.8) * Math.min(1, last.length / 20) : 0,
      todo: last.length < 20 ? `${last.length}/20 trades réels pour mesurer ta discipline.` : revd.length < 0.8 * last.length ? `Revois tes trades : ${revd.length}/${last.length} revus. La revue express prend 15 secondes par trade.` : `${clean}/${revd.length} trades revus sans erreur (objectif 80 %).` },
    { t: "Monter le risque / passer un challenge", ok: mc ? `${Math.round(mc.pPass * 100)} % de réussite simulée à 1 % de risque.` : "", done: !!mc && mc.pPass >= 0.6 && mc.p10 <= 0.05, p: mc ? Math.min(1, mc.pPass / 0.6) : 0,
      todo: !mc ? "Il faut un setup avec au moins 30 trades de backtest." : `À 1 % de risque : ${Math.round(mc.pPass * 100)} % de chances de faire +8 % avant −10 %, ${Math.round(mc.p10 * 100)} % de risque d'un drawdown de 10 %.` },
  ];
  const cur = steps.findIndex((s) => !s.done);
  return { steps, cur: cur < 0 ? steps.length : cur, best, proven, tgt, LS };
}


function Progression({ all, live, balance = 10000 }) {
  const [mode, setMode] = useState("setup");
  const [src, setSrc] = useState("bt");
  const [sel, setSel] = useState(null);
  const [risk, setRisk] = useState(1);
  const [ex, setEx] = useState(null); const [exMsg, setExMsg] = useState("");
  const bt = useMemo(() => pgClosed(all.filter((t) => t.accountId === BT_ACC)), [all]);
  const lv = useMemo(() => pgClosed(live), [live]);
  const L = useMemo(() => pgLadder(all, live), [all, live]);
  /* régularité d'entraînement : jours réels où tu as fait du backtest */
  const train = useMemo(() => {
    const day = (ms) => { const d = new Date(ms); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
    const days = new Set(), w0 = startOfWeek(Date.now()).getTime(); let week = 0;
    bt.forEach((t) => { const ms = Number(t.rules?.savedAt || t.updatedAt) || 0; if (!ms) return; days.add(day(ms)); if (ms >= w0) week++; });
    let streak = 0; const d = new Date(); if (!days.has(day(d.getTime()))) d.setDate(d.getDate() - 1);
    while (days.has(day(d.getTime()))) { streak++; d.setDate(d.getDate() - 1); }
    return { week, streak, days: days.size };
  }, [bt]);
  const rows = useMemo(() => {
    const gb = pgGroups(bt, mode), gl = pgGroups(lv, mode); const keys = [...new Set([...Object.keys(gb), ...Object.keys(gl)])];
    return keys.map((k) => { const B = pgStats(gb[k] || []), Lv = pgStats(gl[k] || []); return { k, B, L: Lv, v: pgVerdict(src === "bt" ? B : Lv), bl: gb[k] || [], ll: gl[k] || [] }; })
      .sort((a, b) => ({ proven: 0, promising: 1, small: 2, none: 3 }[a.v.k] - { proven: 0, promising: 1, small: 2, none: 3 }[b.v.k]) || (src === "bt" ? b.B.avg - a.B.avg : b.L.avg - a.L.avg));
  }, [bt, lv, mode, src]);
  const scope = sel && rows.find((r) => r.k === sel); const scopeList = scope ? (src === "bt" ? scope.bl : scope.ll) : src === "bt" ? bt : lv;
  const SS = useMemo(() => pgStats(scopeList), [scopeList]);
  const mcs = useMemo(() => (SS.n >= 10 ? [0.25, 0.5, 1, 1.5, 2].map((r) => ({ r, m: pgMonte(SS.rs, r) })) : []), [SS]);
  const mc = (mcs.find((x) => x.r === risk) || {}).m || null;
  const safe = mcs.filter((x) => x.m.p10 <= 0.05).map((x) => x.r).pop();
  /* plan d'action généré à partir de tes chiffres */
  const actions = useMemo(() => {
    const A = []; const gb = Object.entries(pgGroups(bt, "setup")).map(([k, l]) => ({ k, S: pgStats(l) })), gl = Object.entries(pgGroups(lv, "setup")).map(([k, l]) => ({ k, S: pgStats(l) }));
    const top = gb.filter((g) => g.S.n >= 30 && g.S.lb > 0).sort((a, b) => b.S.avg - a.S.avg)[0];
    if (top) A.push({ c: C.teal, t: `Concentre-toi sur « ${top.k} »`, d: `${fmtR(top.S.avg)} par trade sur ${top.S.n} trades de backtest, ${top.S.wr.toFixed(0)} % de réussite. C'est ton edge : ne prends que lui tant que le réel ne le confirme pas.` });
    const bad = [...gb, ...gl].filter((g) => g.S.n >= 20 && g.S.avg < 0 && g.k !== "Sans setup").sort((a, b) => a.S.sum - b.S.sum)[0];
    if (bad) A.push({ c: C.red, t: `Arrête « ${bad.k} »`, d: `${fmtR(bad.S.avg)} par trade sur ${bad.S.n} trades (${fmtR(bad.S.sum)} au total).` });
    const cut = Date.now() - 60 * 864e5; const mm = {}; lv.filter((t) => new Date(t.entryTime).getTime() >= cut).forEach((t) => (t.mistakes || []).forEach((m) => { (mm[m] = mm[m] || []).push(Number(t.resultR) || 0); }));
    const worstM = Object.entries(mm).map(([m, l]) => ({ m, n: l.length, s: l.reduce((a, b) => a + b, 0) })).filter((x) => x.s < 0).sort((a, b) => a.s - b.s)[0];
    if (worstM) A.push({ c: C.amber, t: `Ton erreur la plus chère : « ${worstM.m} »`, d: `${fmtR(worstM.s)} sur ${worstM.n} trades ces 60 derniers jours. Écris une règle simple pour l'éviter : c'est le gain le plus rapide.` });
    const gap = gb.map((g) => ({ ...g, Lv: (gl.find((x) => x.k === g.k) || {}).S })).filter((g) => g.Lv && g.Lv.n >= 10 && g.S.n >= 30 && g.Lv.avg < g.S.avg - 0.3).sort((a, b) => (a.Lv.avg - a.S.avg) - (b.Lv.avg - b.S.avg))[0];
    if (gap) A.push({ c: C.purpleBright, t: `« ${gap.k} » : le problème c'est l'exécution`, d: `${fmtR(gap.Lv.avg)} en réel contre ${fmtR(gap.S.avg)} en backtest. La stratégie marche : compare tes entrées, tes SL et tes sorties avec le replay.` });
    if (!bt.length) A.push({ c: C.purpleBright, t: "Lance ton premier backtest", d: "Va dans Backtest, choisis UN setup et fais 30 trades avec les mêmes règles. Chaque trade arrive ici tout seul." });
    return A.slice(0, 4);
  }, [bt, lv]);
  const runExit = async () => {
    setExMsg("Chargement des bougies EURUSD…"); const r = await tvAutoLoad(setExMsg);
    if (!r || !r.length) { setExMsg("Pas de bougies sur cet appareil : ouvre une fois le Backtest pour les charger."); return; }
    setTimeout(() => { const res = pgExit(r, [...bt, ...lv]); setEx(res); setExMsg(res.length ? "" : "Aucun trade EURUSD avec entrée et SL dans la période des données."); }, 20);
  };
  const exIds = new Set(scopeList.map((t) => String(t.id))); const exScope = ex ? ex.filter((x) => exIds.has(String(x.t.id))) : null;
  const exRows = exScope && exScope.length ? PG_TARGETS.map((X) => ({ X, e: pgExitExp(exScope, X) })) : [];
  const exBest = exRows.reduce((m, x) => (!m || x.e > m.e ? x : m), null);
  const maeW = exScope ? exScope.filter((x) => x.maeW != null).map((x) => x.maeW).sort((a, b) => a - b) : [];
  const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, marginBottom: 14, overflow: "hidden" };
  const H = ({ children, sub, right }) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "15px 16px 10px", flexWrap: "wrap" }}><div style={{ flex: "1 1 260px", minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{children}</div>{sub && <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}</div>{right && <div style={{ flexShrink: 0 }}>{right}</div>}</div>;
  const Seg = ({ v, set, opts }) => <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 9, background: C.inputBg || C.bg, border: `1px solid ${C.border}`, flexWrap: "wrap" }}>{opts.map(([k, l]) => <button key={k} onClick={() => set(k)} style={{ border: "none", borderRadius: 7, padding: "6px 10px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", background: v === k ? C.purpleDim : "transparent", color: v === k ? C.purpleBright : C.textSecondary }}>{l}</button>)}</div>;
  const pct = (v) => (v == null ? "—" : Math.round(v * 100) + " %");
  const Kpi = ({ l, v, c, sub }) => <div style={{ padding: "10px 12px", borderRadius: 12, background: C.inputBg || C.bg, minWidth: 0 }}><div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{l}</div><div className="tnum" style={{ fontSize: 17, fontWeight: 700, marginTop: 3, color: c || C.text }}>{v}</div>{sub && <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 2 }}>{sub}</div>}</div>;

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      <PageHeader title="Progression" />
      {bt.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginBottom: 14 }}>
        {[["Cette semaine", train.week + " trade" + (train.week > 1 ? "s" : ""), "de backtest"], ["Série", train.streak + " jour" + (train.streak > 1 ? "s" : ""), "d'entraînement d'affilée"], ["Au total", bt.length + " trades", train.days + " jour" + (train.days > 1 ? "s" : "") + " d'entraînement"]].map(([l, v, sub]) =>
          <div key={l} style={{ padding: "10px 12px", borderRadius: 14, background: C.card, border: `1px solid ${C.border}`, minWidth: 0 }}><div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{l}</div><div className="tnum" style={{ fontSize: 17, fontWeight: 700, marginTop: 2, color: l === "Série" && train.streak >= 3 ? C.teal : C.text }}>{v}</div><div style={{ fontSize: 10.5, color: C.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div></div>)}
      </div>}
      {/* parcours */}
      <div style={{ ...card, background: `radial-gradient(120% 90% at 0% 0%, ${C.purpleDim}, transparent 60%), ${C.card}` }}>
        <H sub="Le chemin des traders qui durent : prouver un edge, l'exécuter comme en backtest, puis seulement augmenter le risque.">Ton parcours</H>
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {L.steps.map((s, i) => { const st = s.done ? "done" : i === L.cur ? "cur" : "next"; return (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 12, background: st === "cur" ? C.purpleDim : "transparent", border: `1px solid ${st === "cur" ? C.purple : C.border}`, opacity: st === "next" ? 0.6 : 1 }}>
              <div style={{ width: 26, height: 26, borderRadius: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: s.done ? C.teal : st === "cur" ? C.purple : C.border, color: "#fff" }}>{s.done ? <Check size={15} /> : i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{s.t}</div>
                <div style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 2, lineHeight: 1.45 }}>{s.done ? s.ok || "Validé." : s.todo}</div>
                {!s.done && <div style={{ height: 4, borderRadius: 2, background: C.border, marginTop: 7, overflow: "hidden" }}><div style={{ width: Math.round(s.p * 100) + "%", height: 4, background: st === "cur" ? C.purple : C.textMuted }} /></div>}
              </div>
            </div>); })}
        </div>
      </div>
      {/* plan d'action */}
      {actions.length > 0 && <div style={card}>
        <H sub="Calculé à partir de tes trades. Il change tout seul quand tu avances.">Plan d'action</H>
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {actions.map((a, i) => <div key={i} style={{ borderLeft: `3px solid ${a.c}`, padding: "6px 12px", background: C.inputBg || C.bg, borderRadius: "0 10px 10px 0" }}><div style={{ fontSize: 14, fontWeight: 700 }}>{a.t}</div><div style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 2, lineHeight: 1.45 }}>{a.d}</div></div>)}
        </div>
      </div>}
      {/* edge par setup */}
      <div style={card}>
        <H sub="« Edge prouvé » = espérance positive même avec la marge d'erreur statistique (95 %). Clique une ligne pour l'analyser en dessous." right={<Seg v={src} set={(v) => { setSrc(v); setSel(null); }} opts={[["bt", `Backtest (${bt.length})`], ["live", `Réel (${lv.length})`]]} />}>Tes edges</H>
        <div style={{ padding: "0 16px 10px" }}><Seg v={mode} set={(v) => { setMode(v); setSel(null); }} opts={PG_MODES} /></div>
        {rows.length === 0 && <div style={{ padding: "8px 16px 18px", fontSize: 13, color: C.textMuted }}>Pas encore de trades. Les trades fermés du Backtest arrivent ici automatiquement.</div>}
        {rows.map((r) => { const S = src === "bt" ? r.B : r.L, O = src === "bt" ? r.L : r.B, on = sel === r.k; if (!S.n) return null; return (
          <div key={r.k} onClick={() => setSel(on ? null : r.k)} style={{ padding: "11px 16px", borderTop: `1px solid ${C.border}`, cursor: "pointer", background: on ? C.purpleDim : "transparent" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.k}</div><div style={{ fontSize: 12, fontWeight: 700, color: r.v.col, marginTop: 1 }}>{r.v.lab}</div></div>
              <div className="tnum" style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 16, fontWeight: 700, color: S.avg > 0 ? C.teal : S.avg < 0 ? C.red : C.textSecondary }}>{fmtR(S.avg)}<span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}> /trade</span></div><div style={{ fontSize: 11.5, color: C.textMuted }}>{S.n} trades · {S.wr.toFixed(0)} % · PF {S.pf == null ? "—" : S.pf === Infinity ? "∞" : S.pf.toFixed(2)}</div></div>
            </div>
            <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 5, lineHeight: 1.4 }}>{r.v.txt}{O.n > 0 && <> · <b>{src === "bt" ? "En réel" : "En backtest"} : {fmtR(O.avg)}</b> sur {O.n} trades{src === "bt" && O.n >= 5 && S.n >= 20 ? (O.avg < S.avg - 0.3 ? " → écart d'exécution" : O.avg >= S.avg - 0.1 ? " → fidèle au backtest ✓" : "") : ""}</>}</div>
          </div>); })}
      </div>
      {/* analyse du groupe choisi */}
      <div style={card}>
        <H sub={scope ? `Analyse de « ${scope.k} » (${src === "bt" ? "backtest" : "réel"}).` : `Analyse de tous tes trades ${src === "bt" ? "de backtest" : "réels"}. Choisis une ligne au-dessus pour un seul setup.`}>Risque et drawdown</H>
        {SS.n < 10 ? <div style={{ padding: "0 16px 16px", fontSize: 13, color: C.textMuted }}>Il faut au moins 10 trades pour simuler.</div> : <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, padding: "0 16px 10px" }}>
            <Kpi l="Espérance" v={fmtR(SS.avg)} c={SS.avg > 0 ? C.teal : C.red} sub={`marge 95 % : ${fmtR(SS.lb)}`} />
            <Kpi l="Drawdown max réel" v={"−" + SS.dd.toFixed(1) + " R"} sub={`série de pertes : ${SS.ls}`} />
            <Kpi l="Risque conseillé" v={safe ? String(safe).replace(".", ",") + " %" : "< 0,25 %"} c={C.purpleBright} sub="drawdown 10 % < 5 % de chances" />
          </div>
          <div style={{ padding: "0 16px 8px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><span style={{ fontSize: 12.5, color: C.textMuted }}>Simuler avec un risque de</span><Seg v={risk} set={setRisk} opts={[0.25, 0.5, 1, 1.5, 2].map((r) => [r, String(r).replace(".", ",") + " %"])} /></div>
          {mc && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, padding: "0 16px 10px" }}>
            <Kpi l="Sur 100 trades (médiane)" v={(mc.retMed >= 0 ? "+" : "") + (mc.retMed * 100).toFixed(1) + " %"} c={mc.retMed >= 0 ? C.teal : C.red} sub={`5 % des cas : ${(mc.ret5 * 100).toFixed(1)} %`} />
            <Kpi l="Drawdown typique" v={"−" + (mc.ddMed * 100).toFixed(1) + " %"} sub={`pire 5 % : −${(mc.dd95 * 100).toFixed(1)} %`} />
            <Kpi l="Challenge +8 % avant −10 %" v={pct(mc.pPass)} c={mc.pPass >= 0.6 ? C.teal : mc.pPass >= 0.4 ? C.amber : C.red} sub={`échec : ${pct(mc.pBust)}`} />
            <Kpi l="Positif après 100 trades" v={pct(mc.pPos)} sub="probabilité" />
          </div>}
          <div style={{ padding: "0 16px 14px", fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}>2 000 simulations qui tirent au hasard dans tes vrais résultats. Plus l'échantillon est grand, plus c'est fiable.</div>
        </>}
      </div>
      {/* optimiseur de sortie */}
      <div style={card}>
        <H sub="Avec tes vraies bougies EURUSD : jusqu'où le prix est allé avant de toucher ton SL. On en déduit le TP qui aurait le plus rapporté." right={!ex && <button onClick={runExit} style={{ border: "none", borderRadius: 9, padding: "8px 12px", background: C.purple, color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" }}>Analyser</button>}>Meilleur take profit</H>
        {exMsg && <div style={{ padding: "0 16px 14px", fontSize: 13, color: C.textSecondary }}>{exMsg}</div>}
        {ex && (!exScope || !exScope.length) && <div style={{ padding: "0 16px 14px", fontSize: 13, color: C.textMuted }}>Aucun trade EURUSD analysable dans cette sélection.</div>}
        {exRows.length > 0 && <>
          <div style={{ padding: "0 16px 6px", display: "flex", flexDirection: "column", gap: 6 }}>
            {exRows.map((x) => { const mx = Math.max(0.01, ...exRows.map((y) => Math.abs(y.e))); return (
              <div key={x.X} style={{ display: "grid", gridTemplateColumns: "56px 1fr 70px", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                <span style={{ fontWeight: 700, color: x === exBest ? C.teal : C.text }}>TP {String(x.X).replace(".", ",")}R</span>
                <div style={{ height: 8, borderRadius: 4, background: C.inputBg || C.bg, overflow: "hidden" }}><div style={{ width: (Math.abs(x.e) / mx) * 100 + "%", height: 8, background: x.e >= 0 ? (x === exBest ? C.teal : C.purple) : C.red }} /></div>
                <span className="tnum" style={{ textAlign: "right", fontWeight: 700, color: x.e >= 0 ? C.teal : C.red }}>{fmtR(x.e)}</span>
              </div>); })}
          </div>
          <div style={{ padding: "8px 16px 14px", fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
            Actuellement : <b>{fmtR(exScope.reduce((a, x) => a + x.r, 0) / exScope.length)}</b> par trade. Avec un TP fixe à <b>{String(exBest.X).replace(".", ",")}R</b> : <b style={{ color: C.teal }}>{fmtR(exBest.e)}</b>{exBest.e > exScope.reduce((a, x) => a + x.r, 0) / exScope.length ? <>, soit <b>{fmtR((exBest.e - exScope.reduce((a, x) => a + x.r, 0) / exScope.length) * 100)}</b> de plus sur 100 trades.</> : " : ta gestion actuelle fait mieux, garde-la."}
            {maeW.length >= 5 && <div style={{ marginTop: 6 }}>Tes trades gagnants reculent en moyenne de <b>{(maeW.reduce((a, b) => a + b, 0) / maeW.length).toFixed(2)} R</b> avant de partir ; 80 % ne dépassent jamais <b>{q(maeW, 0.8).toFixed(2)} R</b> contre toi.{q(maeW, 0.8) < 0.6 ? " Ton SL est peut-être plus large que nécessaire." : ""}</div>}
            <div style={{ marginTop: 6, fontSize: 12, color: C.textMuted }}>{exScope.length} trades analysés. Prudent : si le SL et le TP sont dans la même bougie, on compte le SL.</div>
          </div>
        </>}
      </div>
    </div>
  );
}


/* ============================================================================
   ERREURS — revue express, coût de chaque erreur, comportements repérés tout seuls
   ============================================================================ */
function EscCatch({ onEsc }) { useEscClose(onEsc); return null; }
/* Échap ferme la fenêtre */
function useEscClose(fn) { const r = useRef(fn); r.current = fn; useEffect(() => { const h = (e) => { if (e.key === "Escape") r.current && r.current(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []); }
const isReviewed = (t) => !!((t.mistakes || []).length || (t.positives || []).length || t.rules?.clean || t.rules?.reviewed || t.verdict);
/* « à revoir » = trade fermé sans photo « après » */
const needsAfter = (t) => t.status !== "open" && !t.screenshotAfter;
const isCleanT = (t) => isReviewed(t) && !(t.mistakes || []).length;
const errNames = (s) => { const h = s?.hiddenErrors || []; return [...DEFAULT_ERRORS.filter((e) => !h.includes(e)), ...(s?.customErrors || [])]; };
const posNames = (s) => [...DEFAULT_POSITIVES, ...(s?.customPositives || [])];
/* les plus utilisés d'abord : en un clic sur tes erreurs habituelles */
const byFreq = (names, trades, field) => { const c = {}; (trades || []).forEach((t) => (t[field] || []).forEach((m) => { c[m] = (c[m] || 0) + 1; })); return [...new Set([...names, ...Object.keys(c)])].sort((a, b) => (c[b] || 0) - (c[a] || 0)); };
const errAgg = (l) => { const n = l.length, s = l.reduce((a, t) => a + rOf(t), 0), u = l.reduce((a, t) => a + usdOf(t), 0), w = l.filter((t) => rOf(t) > 0).length, lo = l.filter((t) => rOf(t) < 0).length; return { n, s, u, avg: n ? s / n : 0, wr: w + lo ? (w / (w + lo)) * 100 : 0 }; };
const ERR_CHECK = { "Entrer trop tôt": "J'attends la clôture de confirmation avant d'entrer", "Entrer trop tard": "Si le prix est parti, je laisse passer", "TP trop tôt": "Je laisse courir jusqu'à mon TP prévu", "SL trop serré": "Mon SL est derrière la zone, pas dedans", "SL trop large": "SL juste derrière la zone : pas plus", "Pas de confirmation MSS": "J'attends le MSS avant d'entrer", "Revenge trading": "Après une perte, je fais une pause", "Hors killzone": "Je ne trade qu'en killzone", "Pas de sweep de liquidité": "J'attends un sweep de liquidité", "FOMO": "Pas de setup = pas de trade (pas de FOMO)", "Sur-trader": "Maximum 2 trades par jour", "Ignorer le DXY": "J'ai regardé le DXY", "Contre le biais HTF": "Je trade dans le sens du biais HTF", "Long en premium / short en discount": "Achat en discount, vente en premium", "Pas de displacement": "Je veux un displacement clair", "Pas de draw on liquidity clair": "Je connais ma cible de liquidité", "Entrée avant la killzone": "J'attends l'ouverture de la killzone" };
const addCheckItem = (txt) => { const r = loadRules(); const cur = r.checklist && r.checklist.length ? r.checklist : CHECK_DEFAULT; if (cur.includes(txt)) return false; saveRules({ ...r, checklist: [...cur, txt], checklistOn: true }); return true; };

function TagPick({ items, value = [], onToggle, col, max = 8 }) {
  const [all, setAll] = useState(false); const head = items.slice(0, max);
  const list = all ? items : [...head, ...value.filter((v) => !head.includes(v))];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {list.map((x) => { const on = value.includes(x); return <button key={x} type="button" onClick={() => onToggle(x)} style={{ padding: "7px 11px", borderRadius: 999, border: `1.5px solid ${on ? col : C.border}`, background: on ? col + "1A" : "transparent", color: on ? col : C.textSecondary, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{on ? "✓ " : ""}{x}</button>; })}
      {items.length > max && <button type="button" onClick={() => setAll(!all)} style={{ padding: "7px 11px", borderRadius: 999, border: `1px dashed ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{all ? "Moins" : `+ ${items.length - max} autres`}</button>}
    </div>
  );
}

/* revue express : un trade à la fois, 3 clics, et tes stats d'erreurs deviennent fiables */
function ReviewQueue({ trades, appSettings, onPatch, onClose }) {
  useEscClose(onClose);
  const [queue] = useState(() => byTime(closedOf(trades)).reverse().filter(needsAfter).map((t) => t.id));
  const [i, setI] = useState(0); const [n, setN] = useState(0); const [img, setImg] = useState(null);
  const t = trades.find((x) => x.id === queue[i]);
  const [m, setM] = useState([]); const [p, setP] = useState([]); const [v, setV] = useState(null);
  useEffect(() => { setM(t?.mistakes || []); setP(t?.positives || []); setV(t?.verdict || null); }, [t?.id]);
  const errs = useMemo(() => byFreq(errNames(appSettings), trades, "mistakes"), []), poss = useMemo(() => byFreq(posNames(appSettings), trades, "positives"), []);
  const next = () => setI((x) => x + 1);
  const save = (clean) => { if (!t) return; onPatch(t.id, { mistakes: clean ? [] : m, positives: p, verdict: v, rules: { ...(t.rules || {}), reviewed: true, clean: clean || (!m.length && (t.rules || {}).clean) || false } }); setN((x) => x + 1); next(); };
  const tog = (arr, set) => (x) => set(arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);
  const r = t ? rOf(t) : 0; const st = t ? pgSetups(t).filter((x) => x !== "Sans setup") : [];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 17, fontWeight: 700 }}>Revue express</div><div style={{ fontSize: 12.5, color: C.textMuted }}>{t ? `Trade ${i + 1} sur ${queue.length} · ce qui a été fait, pas le résultat` : "Terminé"}</div></div>
          <button onClick={onClose} aria-label="Fermer" style={{ ...btn.ghost, padding: 8 }}><X size={16} /></button>
        </div>
        {queue.length > 0 && <div style={{ height: 4, borderRadius: 2, background: C.border, marginBottom: 14, overflow: "hidden" }}><div style={{ width: (Math.min(i, queue.length) / queue.length) * 100 + "%", height: 4, background: C.purple }} /></div>}
        {!t ? (
          <div style={{ textAlign: "center", padding: "24px 8px" }}>
            <div style={{ fontSize: 40 }}>🎯</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>{queue.length ? "Tous tes trades sont revus" : "Rien à revoir"}</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>{n ? `${n} trade${n > 1 ? "s" : ""} revu${n > 1 ? "s" : ""}. ` : ""}Tes statistiques d'erreurs sont à jour dans « Mes erreurs ».</div>
            <button onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("tjp-goto", { detail: "erreurs" })); }} style={{ ...btn.primary, marginTop: 16, justifyContent: "center" }}>Voir mes erreurs</button>
          </div>
        ) : (<>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, background: C.inputBg || C.bg }}>
            <PairLogo pair={t.pair} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t.pair} <span style={{ color: t.direction === "long" ? C.teal : C.red, fontSize: 12.5 }}>{t.direction === "long" ? "↗ Long" : "↘ Short"}</span></div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{fmtDateTime(t.entryTime)} · {pgSess(t).replace(" Session", "")}{st.length ? " · " + st.join(", ") : ""}</div>
            </div>
            <div className="tnum" style={{ fontSize: 19, fontWeight: 700, color: r > 0 ? C.teal : r < 0 ? C.red : C.textSecondary }}>{t.status === "breakeven" ? "BE" : fmtR(r)}</div>
          </div>
          {(t.screenshotBefore || t.screenshotAfter) && <div style={{ display: "flex", gap: 8, marginTop: 10 }}>{[t.screenshotBefore, t.screenshotAfter].filter(Boolean).map((s, k) => <img key={k} src={s} alt="" onClick={() => setImg(s)} style={{ flex: 1, minWidth: 0, height: 110, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.border}`, cursor: "zoom-in" }} />)}</div>}
          {!t.screenshotAfter && <div style={{ marginTop: 10 }}><ImageUploadBox label="Photo après le trade (colle ou choisis)" value={null} onChange={(u) => u && onPatch(t.id, { screenshotAfter: u })} /></div>}
          {t.notes && <div style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 8, fontStyle: "italic" }}>« {t.notes} »</div>}
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "14px 0 6px" }}>Selon ton plan, c'était…</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["good", "👍 Bon trade", C.teal], ["bad", "👎 Mauvais trade", C.red]].map(([k, l, c]) => <button key={k} onClick={() => setV(v === k ? null : k)} style={{ flex: 1, padding: "11px 6px", borderRadius: 12, border: `1.5px solid ${v === k ? c : C.border}`, background: v === k ? c + "1A" : "transparent", color: v === k ? c : C.textSecondary, fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "14px 0 6px" }}>Erreurs</div>
          <TagPick items={errs} value={m} onToggle={tog(m, setM)} col={C.red} max={8} />
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "14px 0 6px" }}>Bien fait</div>
          <TagPick items={poss} value={p} onToggle={tog(p, setP)} col={C.teal} max={6} />
          <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
            <button onClick={() => save(true)} disabled={m.length > 0} title="Aucune erreur sur ce trade" style={{ ...btn.ghost, flex: "1 1 140px", justifyContent: "center", color: C.teal, borderColor: C.teal + "66", opacity: m.length ? 0.4 : 1 }}>✓ Aucune erreur</button>
            <button onClick={() => (m.length || p.length || v ? save(false) : next())} style={{ ...btn.primary, flex: "1 1 140px", justifyContent: "center" }}>{m.length || p.length || v ? "Enregistrer · suivant" : "Passer"}</button>
          </div>
        </>)}
      </div>
      {img && <LightBox src={img} label="" onClose={() => setImg(null)} />}
    </div>
  );
}

function ReviewCard({ trades, onOpen }) {
  const L = closedOf(trades); const todo = L.filter(needsAfter).length; if (!L.length) return null;
  const pct = Math.round(((L.length - todo) / L.length) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.card, border: `1px solid ${todo ? C.amber + "66" : C.border}`, borderRadius: 18, padding: "12px 16px", marginBottom: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: todo ? C.amberDim : C.tealDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{todo ? "📝" : "✓"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{todo ? `${todo} trade${todo > 1 ? "s" : ""} à revoir` : "Rien à revoir"}</div>
        
      </div>
      {todo > 0 && <button onClick={onOpen} style={{ ...btn.primary, padding: "9px 14px", fontSize: 13, whiteSpace: "nowrap" }}>Revoir</button>}
    </div>
  );
}

/* comportements repérés automatiquement (aucune case à cocher) */
function errPatterns(closed, rules, balance) {
  const L = byTime(closed); const risks = L.map((t) => Number(t.riskUsd)).filter((x) => x > 0).sort((a, b) => a - b); const med = risks.length ? risks[risks.length >> 1] : 0;
  const viol = new Set(planCheck(L, rules, balance).filter((x) => x.v.length).map((x) => x.t.id));
  const flags = L.map((t, i) => {
    const d = dayKey(t.entryTime), te = new Date(t.entryTime).getTime(); const same = L.slice(0, i).filter((x) => dayKey(x.entryTime) === d); const prev = same[same.length - 1];
    const p1 = L[i - 1], p2 = L[i - 2]; const ch = t.rules?.checks;
    return {
      afterLoss: !!prev && rOf(prev) < 0 && te - new Date(prev.entryTime).getTime() < 2 * 36e5,
      after2: !!p1 && !!p2 && rOf(p1) < 0 && rOf(p2) < 0,
      third: same.length >= 2,
      bigWin: !!prev && rOf(prev) >= 2,
      horsKz: (() => { try { return killzoneLabel(t.entryTime) === "Hors killzone"; } catch (e) { return false; } })(),
      bigRisk: med > 0 && Number(t.riskUsd) > med * 1.3,
      noSetup: pgSetups(t)[0] === "Sans setup",
      checklist: Array.isArray(ch) && !t.rules?.checkAll,
      plan: viol.has(t.id),
    };
  });
  const DEF = [
    ["afterLoss", "Juste après une perte (moins de 2 h)", "Après une perte, j'attends 2 h avant de reprendre", null],
    ["after2", "Après 2 pertes d'affilée", "Après 2 pertes d'affilée, j'arrête pour la journée", { maxConsecLoss: 2 }],
    ["third", "3e trade de la journée et plus", "Maximum 2 trades par jour", { maxTradesDay: 2 }],
    ["bigWin", "Juste après un gros gain (≥ 2R)", "Après un gros gain, je m'arrête pour la session", null],
    ["horsKz", "Hors killzone", "Je ne trade qu'en killzone", null],
    ["bigRisk", "Risque plus gros que d'habitude", "Toujours le même risque par trade", null],
    ["noSetup", "Sans setup noté", "Pas de setup clair = pas de trade", null],
    ["checklist", "Check-list incomplète", "Je coche toute ma check-list avant d'entrer", null],
    ["plan", "Règle du plan non respectée", "Je relis mes règles avant chaque trade", null],
  ];
  return DEF.map(([k, lab, fix, rule]) => {
    const inn = L.filter((_, i) => flags[i][k]), out = L.filter((_, i) => !flags[i][k]); const A = errAgg(inn), B = errAgg(out);
    return { k, lab, fix, rule, A, B, d: A.avg - B.avg, cost: A.s - A.n * B.avg };
  }).filter((x) => x.A.n >= 3);
}

function ErrorsPage({ trades, appSettings, balance = 10000, onOpenTrade }) {
  const [period, setPeriod] = useState("90");
  const [added, setAdded] = useState({});
  const rules = loadRules();
  const all = useMemo(() => byTime(closedOf(trades)), [trades]);
  const closed = useMemo(() => { const days = period === "all" ? null : Number(period); const cut = days ? Date.now() - days * 864e5 : 0; return all.filter((t) => !days || new Date(t.entryTime).getTime() >= cut); }, [all, period]);
  const rev = closed.filter(isReviewed), withE = rev.filter((t) => (t.mistakes || []).length), clean = rev.filter((t) => !(t.mistakes || []).length);
  const A = errAgg(withE), K = errAgg(clean), T = errAgg(closed);
  const curve = useMemo(() => { let a = 0, b = 0; const out = [{ i: 0, a: 0, b: 0 }]; closed.forEach((t, i) => { a += rOf(t); if (!(t.mistakes || []).length) b += rOf(t); out.push({ i: i + 1, a: Math.round(a * 100) / 100, b: Math.round(b * 100) / 100 }); }); return out; }, [closed]);
  const errRows = useMemo(() => {
    const now = Date.now(), d30 = now - 30 * 864e5, d60 = now - 60 * 864e5; const m = {};
    closed.forEach((t) => (t.mistakes || []).forEach((e) => { (m[e] = m[e] || []).push(t); }));
    return Object.entries(m).map(([e, l]) => {
      const S = errAgg(l); const r30 = all.filter((t) => (t.mistakes || []).includes(e) && new Date(t.entryTime).getTime() >= d30).length, p30 = all.filter((t) => (t.mistakes || []).includes(e) && new Date(t.entryTime).getTime() >= d60 && new Date(t.entryTime).getTime() < d30).length;
      const last = Math.max(...l.map((t) => new Date(t.entryTime).getTime())); const cnt = (fn) => { const c = {}; l.forEach((t) => { const k = fn(t); c[k] = (c[k] || 0) + 1; }); const b = Object.entries(c).sort((x, y) => y[1] - x[1])[0]; return b && b[1] / l.length >= 0.5 && l.length >= 3 ? b : null; };
      const ss = cnt((t) => pgSess(t).replace(" Session", "")), dd = cnt((t) => pgDay(t));
      return { e, S, r30, p30, ago: Math.round((now - last) / 864e5), ctx: [ss && `${Math.round((ss[1] / l.length) * 100)} % ${ss[0] === "Hors session" ? "hors session" : "en " + ss[0]}`, dd && `souvent le ${dd[0].toLowerCase()}`].filter(Boolean).join(" · "), share: rev.length ? (l.length / rev.length) * 100 : 0 };
    }).sort((a, b) => a.S.s - b.S.s);
  }, [closed, all]);
  const pats = useMemo(() => errPatterns(closed, rules, balance).sort((a, b) => a.cost - b.cost), [closed, balance]);
  const top = [...errRows.filter((x) => x.S.s < 0).map((x) => ({ t: `Évite « ${x.e} »`, d: `${fmtR(x.S.s)} sur ${x.S.n} trades (${fmtR(x.S.avg)} par trade).`, fix: ERR_CHECK[x.e] || `J'évite : ${x.e}`, cost: x.S.s })), ...pats.filter((x) => x.cost < 0 && x.d <= -0.25 && x.A.n >= 5).map((x) => ({ t: x.lab, d: `${fmtR(x.A.avg)} par trade contre ${fmtR(x.B.avg)} le reste du temps (${x.A.n} trades).`, fix: x.fix, rule: x.rule, cost: x.cost }))].sort((a, b) => a.cost - b.cost)[0];
  const matrix = useMemo(() => { const j = closed.filter((t) => t.verdict === "good" || t.verdict === "bad"); const c = (v, w) => j.filter((t) => t.verdict === v && (w ? rOf(t) > 0 : rOf(t) <= 0)); return j.length >= 4 ? { gw: c("good", true), gl: c("good", false), bw: c("bad", true), bl: c("bad", false), n: j.length } : null; }, [closed]);
  const addFix = (fix, rule) => { if (rule) { saveRules({ ...loadRules(), ...rule }); } else addCheckItem(fix); setAdded((o) => ({ ...o, [fix]: true })); };

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, marginBottom: 14, overflow: "hidden" };
  const H = ({ children, sub, right }) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "15px 16px 10px", flexWrap: "wrap" }}><div style={{ flex: "1 1 240px", minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{children}</div>{sub && <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3, lineHeight: 1.45 }}>{sub}</div>}</div>{right && <div style={{ flexShrink: 0 }}>{right}</div>}</div>;
  const FixBtn = ({ fix, rule }) => added[fix] ? <span style={{ fontSize: 12, color: C.teal, fontWeight: 700 }}>✓ Ajouté à ton plan</span> : <button onClick={() => addFix(fix, rule)} style={{ border: `1px solid ${C.purple}`, background: "transparent", color: C.purpleBright, borderRadius: 8, padding: "5px 9px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{rule ? "Appliquer la règle" : "+ Check-list"}</button>;
  const Big = ({ l, v, c, sub }) => <div style={{ padding: "11px 12px", borderRadius: 12, background: C.inputBg || C.bg, minWidth: 0 }}><div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{l}</div><div className="tnum" style={{ fontSize: 18, fontWeight: 700, marginTop: 3, color: c || C.text }}>{v}</div>{sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sub}</div>}</div>;
  const todo = closed.length - rev.length;

  return (
    <div className="fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      <PageHeader title="Mes erreurs" action={<div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 9, background: C.card, border: `1px solid ${C.border}` }}>{[["30", "30 j"], ["90", "90 j"], ["all", "Tout"]].map(([k, l]) => <button key={k} onClick={() => setPeriod(k)} style={{ border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: period === k ? C.purpleDim : "transparent", color: period === k ? C.purpleBright : C.textSecondary }}>{l}</button>)}</div>} />
      {todo > 0 && <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderColor: C.amber + "66" }}>
        <div style={{ flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 1.45 }}><b style={{ color: C.text }}>{todo} trade{todo > 1 ? "s" : ""} à revoir</b></div>
        <button onClick={() => window.dispatchEvent(new Event("tjp-review"))} style={{ ...btn.primary, padding: "9px 14px", fontSize: 13, whiteSpace: "nowrap" }}>Revue express</button>
      </div>}
      {closed.length === 0 && <div style={{ ...card, padding: "26px 18px", textAlign: "center", color: C.textMuted, fontSize: 13.5 }}>Aucun trade.</div>}
      {closed.length > 0 && <div style={{ ...card, background: `radial-gradient(120% 90% at 0% 0%, ${A.s < 0 ? C.redDim : C.tealDim}, transparent 60%), ${C.card}` }}>
        <div style={{ padding: "18px 18px 6px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.textMuted }}>Coût des erreurs</div>
          <div className="tnum" style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1, color: A.s < 0 ? C.red : C.teal, marginTop: 4 }}>{fmtR(A.s)}{A.u ? <span style={{ fontSize: 16, color: C.textSecondary, fontWeight: 600 }}> · {fmtUsdSigned(A.u)}</span> : null}</div>
          <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>Sans erreurs : <b style={{ color: C.teal }}>{fmtR(K.s)} · réel </b><b>{fmtR(T.s)}</b>.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, padding: "10px 16px" }}>
          <Big l="Trades propres" v={fmtR(K.avg) + " /trade"} c={K.avg >= 0 ? C.teal : C.red} sub={`${K.n} trades · ${K.wr.toFixed(0)} % gagnants`} />
          <Big l="Trades avec erreur" v={fmtR(A.avg) + " /trade"} c={A.avg >= 0 ? C.teal : C.red} sub={`${A.n} trades · ${A.wr.toFixed(0)} % gagnants`} />
          <Big l="Discipline" v={rev.length ? Math.round((clean.length / rev.length) * 100) + " %" : "—"} c={C.purpleBright} />
        </div>
        {curve.length > 2 && <div style={{ height: 170, padding: "6px 6px 10px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="i" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }} formatter={(v, n) => [fmtR(v), n === "b" ? "Sans erreurs" : "Réel"]} labelFormatter={(l) => "Trade " + l} />
              <Area type="monotone" dataKey="b" stroke={C.teal} strokeWidth={2} fill={C.teal} fillOpacity={0.08} isAnimationActive={false} />
              <Area type="monotone" dataKey="a" stroke={C.textSecondary} strokeWidth={1.6} strokeDasharray="4 3" fill="transparent" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>}
        <div style={{ display: "flex", gap: 14, padding: "0 16px 14px", fontSize: 12, color: C.textMuted }}><span><b style={{ color: C.teal }}>━</b> sans les trades avec erreur</span><span><b>┅</b> ta courbe réelle (R)</span></div>
      </div>}
      {top && <div style={{ ...card, borderColor: C.purple, background: `linear-gradient(135deg, ${C.purpleDim}, transparent 70%), ${C.card}` }}>
        <div style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.purpleBright }}>Règle n°1</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 5 }}>{top.t}</div>
          <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 3, lineHeight: 1.45 }}>{top.d}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}><span style={{ fontSize: 13.5, fontWeight: 600 }}>« {top.fix} »</span><FixBtn fix={top.fix} rule={top.rule} /></div>
        </div>
      </div>}
      {errRows.length > 0 && <div style={card}>
        <H>Erreurs</H>
        {errRows.map((x) => (
          <div key={x.e} style={{ padding: "11px 16px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{x.e}</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>{x.S.n} fois · {x.share.toFixed(0)} % des trades revus · il y a {x.ago} j{x.ctx ? " · " + x.ctx : ""}</div></div>
              <div className="tnum" style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 16, fontWeight: 700, color: x.S.s < 0 ? C.red : C.teal }}>{fmtR(x.S.s)}</div><div style={{ fontSize: 11.5, color: x.r30 < x.p30 ? C.teal : x.r30 > x.p30 ? C.red : C.textMuted, fontWeight: 600 }}>{x.r30 < x.p30 ? "↓ en baisse" : x.r30 > x.p30 ? "↑ en hausse" : "= stable"} ({x.p30} → {x.r30})</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}><span style={{ fontSize: 12, color: C.textSecondary }}>Règle : « {ERR_CHECK[x.e] || "J'évite : " + x.e} »</span><FixBtn fix={ERR_CHECK[x.e] || "J'évite : " + x.e} /></div>
          </div>))}
      </div>}
      {pats.length > 0 && <div style={card}>
        <H>Comportements</H>
        {pats.map((x) => { const bad = x.d <= -0.25 && x.A.n >= 5; return (
          <div key={x.k} style={{ padding: "11px 16px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{bad ? "⚠ " : ""}{x.lab}</div><div style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>{x.A.n} trades · {x.A.wr.toFixed(0)} % gagnants · le reste du temps {fmtR(x.B.avg)} /trade</div></div>
              <div className="tnum" style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 16, fontWeight: 700, color: x.A.avg < 0 ? C.red : C.teal }}>{fmtR(x.A.avg)}<span style={{ fontSize: 11, color: C.textMuted }}> /trade</span></div><div style={{ fontSize: 11.5, color: x.d < 0 ? C.red : C.teal, fontWeight: 600 }}>{x.d >= 0 ? "+" : ""}{x.d.toFixed(2)} R vs normal</div></div>
            </div>
            {bad && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}><span style={{ fontSize: 12, color: C.textSecondary }}>Règle : « {x.fix} »</span><FixBtn fix={x.fix} rule={x.rule} /></div>}
          </div>); })}
      </div>}
      {matrix && <div style={card}>
        <H>Process / chance</H>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 16px 16px" }}>
          {[["Bons trades gagnants", matrix.gw, C.teal, "Le process qui paie"], ["Bons trades perdants", matrix.gl, C.textSecondary, "Normal : ça fait partie de l'edge"], ["Mauvais trades gagnants", matrix.bw, C.amber, "De la chance : à ne pas répéter"], ["Mauvais trades perdants", matrix.bl, C.red, "Évitable"]].map(([l, arr, c, s]) =>
            <div key={l} style={{ padding: "11px 12px", borderRadius: 12, background: C.inputBg || C.bg, borderLeft: `3px solid ${c}` }}><div style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{l}</div><div className="tnum" style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{arr.length} <span style={{ fontSize: 12.5, color: c }}>{fmtR(arr.reduce((a, t) => a + rOf(t), 0))}</span></div><div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s}</div></div>)}
        </div>
      </div>}
    </div>
  );
}

/* « Tu peux trader ? » : tes limites du plan pour aujourd'hui, la semaine et le mois */

function MobileNav({ view, setView, onNewTrade }) {
  const [more, setMore] = useState(false);
  const MAIN = [NAV_ITEMS[0], NAV_ITEMS[1], null, NAV_ITEMS.find(i => i.id === "stats")];
  const EXTRA = [
    { id: "backtest", label: "Backtest", icon: TvLogoIcon },
    { id: "plan", label: "Préparation", icon: BookOpen },
    { id: "calculator", label: "Calculatrice", icon: Calculator },
    { id: "coach", label: "IA Coach", icon: Brain },
    { id: "settings", label: "Réglages", icon: Settings },
  ];
  const extraActive = EXTRA.some(x => x.id === view) || ["previsions", "playbooks", "ressources"].includes(view);
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
      <nav className="mobile-only" data-mobile="1" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 999, display: "flex", alignItems: "flex-end", padding: "8px 6px", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))", background: "rgba(11,13,19,0.82)", backdropFilter: "saturate(160%) blur(18px)", WebkitBackdropFilter: "saturate(160%) blur(18px)", borderTop: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 -10px 30px rgba(0,0,0,0.35)" }}>
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
            <div style={{ fontSize: 13, fontWeight: 600, color: C.sidebarText, letterSpacing: -0.3, lineHeight: 1.1 }}>Emeieks</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.sidebarTextDim, letterSpacing: 0.3 }}>Trade</div>
          </div>
        </div>

        <button onClick={onNewTrade} className="new-trade-btn" style={getS().newTradeBtn} title="Nouveau trade">
          <Plus size={15} strokeWidth={2.4} /> <span className="new-trade-label">Nouveau trade</span>
        </button>

        <nav style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 1 }}>
          {NAV_ITEMS.map((it, i) => {
            const head = it.g !== (NAV_ITEMS[i - 1] || {}).g ? <div key={"g" + it.g} className="nav-label" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.9, textTransform: "uppercase", color: C.sidebarTextDim, opacity: 0.7, padding: i ? "14px 12px 5px" : "2px 12px 5px", borderTop: i && !it.g ? `1px solid rgba(255,255,255,0.06)` : "none", marginTop: i && !it.g ? 10 : 0 }}>{it.g}</div> : null;
            const active = view === it.id || (it.also || []).includes(view) || (view === "tradeForm" && it.id === "trades") || (view === "tradeDetail" && it.id === "trades");
            const Icon = it.icon;
            return (<React.Fragment key={it.id}>{head}
              <button className="nav-btn nav-item-row" onClick={() => setView(it.id)} title={it.label} style={{
                ...getS().navItem,
                background: active ? "rgba(139,124,246,0.18)" : "transparent",
                color: active ? "#C4BAFB" : C.sidebarTextDim,
              }}>
                <Icon size={16} strokeWidth={1.9} />
                <span className="nav-label">{it.label}</span>
              </button></React.Fragment>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={getS().footer}>
          <div>
            <div style={{ fontSize: 10.5, color: C.sidebarTextDim, letterSpacing: 0.6, fontWeight: 700, textTransform: "uppercase" }}>Profit total</div>
            <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: totalPnl >= 0 ? C.teal : C.red, letterSpacing: -0.5, marginTop: 2 }}>{fmtUsdSigned(totalPnl)}</div>
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
    display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, bottom: 0, height: "100vh", overflowY: "auto", zIndex: 40, boxSizing: "border-box",
    background: C.sidebar,
  },
  brand: { display: "flex", alignItems: "center", gap: 9, paddingLeft: 4, marginBottom: 18 },
  brandMark: { width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${C.purple}, #5B3FE0)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14, color: "#fff", flexShrink: 0 },
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
          <div style={{ fontSize: 13, fontWeight: 600, color: C.sidebarText, letterSpacing: -0.2 }}>Emeieks</div>
          <div style={{ fontSize: 9, fontWeight: 500, color: C.sidebarTextDim, letterSpacing: 0.4, textTransform: "uppercase" }}>Trade</div>
        </div>
      </button>
      <KillzoneBanner part="ticker" />
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

        {/* Switcher de compte */}
        {accounts && accounts.length > 0 && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowAccounts(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: C.sidebarHover, border: `1px solid ${C.sidebarBorder}`, cursor: "pointer" }}>
              {activeAccount?.logo ? <AccountLogo acc={activeAccount} size={18} /> : <div style={{ width: 8, height: 8, borderRadius: "50%", background: typeColors[activeAccount?.type] || C.teal, flexShrink: 0 }} />}
              <span style={{ fontSize: 12, fontWeight: 600, color: C.sidebarText, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeAccount?.name}</span>
              <ChevronDown size={11} color={C.sidebarTextDim} />
            </button>
            {showAccounts && (
              <>
                <div onClick={() => setShowAccounts(false)} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 99, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 200, overflow: "hidden" }}>
                  {accounts.map((acc) => (
                    <button key={acc.id} onClick={() => { onSwitchAccount(acc.id); setShowAccounts(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: acc.id === activeAccountId ? C.purpleDim : "none", border: "none", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>
                      <AccountLogo acc={acc} size={26} />
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{acc.name}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>
                          {acc.type === "challenge" && acc.challenge?.phase ? (acc.challenge.phase === "Financé" ? "Financé" : "Challenge · " + acc.challenge.phase) : typeLabels[acc.type] || acc.type}
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



function Dashboard({ trades, onOpenTrade, setView, onStatusChange, initialBalance = 10000, extra = null }) {
  const [period, setPeriod] = useState("tout");
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
  const recentTrades = [...filteredTrades].sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime)).slice(0, 5);
  const PERIODS = ["tout", "7j", "30j", "90j"];
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
          <div style={{ display: "flex", gap: 2, background: C.card, borderRadius: 11, padding: 3, border: `1px solid ${C.border}` }}>
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                background: period === p ? C.purpleDim : "transparent",
                color: period === p ? C.purpleBright : C.textMuted,
                border: "none",
              }}>{p === "tout" ? "Tout" : p}</button>
            ))}
          </div>
          <button onClick={() => setView("coach")} title="IA Coach" aria-label="IA Coach" style={{ ...btn.ghost, padding: "7px 9px" }}><Brain size={15} /></button>
          <button onClick={() => exportToCsv(filteredTrades)} title="Exporter CSV" aria-label="Exporter CSV" style={{ ...btn.ghost, padding: "7px 9px" }}><Download size={15} /></button>
        </div>
      } />

      {/* Résumé — un seul bloc clair */}
      <Card style={{ padding: "18px 18px 14px", marginBottom: 14, background: `radial-gradient(120% 90% at 0% 0%, ${totalR >= 0 ? C.tealDim : C.redDim}, transparent 60%), ${C.card}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.textMuted }}>Résultat · {period === "tout" ? "tout" : period}</div>
        <div className="tnum" style={{ fontSize: 38, fontWeight: 600, letterSpacing: -0.5, color: totalR >= 0 ? C.teal : C.red, lineHeight: 1.05, marginTop: 4 }}>{fmtR(totalR)}</div>
        <div className="tnum" style={{ fontSize: 14, color: C.textSecondary, fontWeight: 600, marginTop: 2 }}><b style={{ color: stats.totalPnl >= 0 ? C.teal : C.red }}>{fmtUsdSigned(stats.totalPnl)}</b> · Capital {fmtUsd(stats.currentBalance)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
          {[["Winrate", fmtPct(stats.winRate), `${stats.wins.length}G · ${stats.losses.length}P`, C.text],
            ["R moyen", fmtR(stats.avgRR), "par trade", stats.avgRR >= 0 ? C.teal : C.red],
            ["Trades", String(stats.closed.length), `DD -${stats.maxDD.toFixed(1)}%`, C.text]].map(([l, v, sub, col]) => (
            <div key={l} style={{ padding: "10px 11px 9px", borderRadius: 13, background: "rgba(255,255,255,0.025)", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 600 }}>{l}</div>
              <div className="tnum" style={{ fontSize: 18, fontWeight: 600, color: col, marginTop: 2 }}>{v}</div>
              <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 1 }}>{sub}</div>
            </div>
          ))}
        </div>
      </Card>

      {extra}
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


      {/* Ligne 4 — Trades récents */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>Trades récents</span>
          <button onClick={() => setView("trades")} style={{ background: "none", border: "none", color: C.purpleBright, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Voir tout →</button>
        </div>

        <div className="desktop-only table-scroll">
          <div style={{ display: "grid", gridTemplateColumns: "84px 128px 72px minmax(90px,140px) 110px 90px 1fr", padding: "8px 18px", fontSize: 10.5, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${C.border}`, minWidth: 640 }}>
            <div>Date</div><div>Paire</div><div>Dir.</div><div>Setup</div><div>Résultat</div><div>Statut</div><div>Tags</div>
          </div>
          {recentTrades.map((t) => (
            <div key={t.id} className="row-hover" onClick={() => onOpenTrade(t.id)} style={{ display: "grid", gridTemplateColumns: "84px 128px 72px minmax(90px,140px) 110px 90px 1fr", padding: "11px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", cursor: "pointer", fontSize: 12.5, minWidth: 640 }}>
              <div style={{ color: C.textSecondary }}>{fmtDate(t.entryTime)}</div>
              <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}><PairLogo pair={t.pair} size={20} />{t.pair}</div>
              <div><DirBadge direction={t.direction} /></div>
              <div style={{ color: C.textSecondary, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(() => { const ts = t.rules?.tfSetups; const l = Array.isArray(ts) && ts.length ? ts.flatMap((r) => (r.setups || []).map((x) => x + (r.tf ? " " + r.tf : ""))) : [t.setup].filter(Boolean); return l.join(" · ") || "—"; })()}</div>
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
              <span className="tnum" style={{ fontWeight: 600, fontSize: 14, color: t.status !== "closed" ? C.textMuted : (t.resultR || 0) >= 0 ? C.teal : C.red }}>{t.status !== "closed" ? "En cours" : fmtR(t.resultR)}</span>
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

function TradesList({ trades, onOpen: onOpenFull, onNew, onStatusChange, onHome, onPatch, appSettings }) {
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
      {quickTrade && <QuickTradeModal key={quickTrade.id} trade={quickTrade} onClose={() => setQuickId(null)} onPatch={onPatch} onOpenFull={onOpenFull} appSettings={appSettings} />}
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
          {(() => { const q = pendingSearch.trim().toUpperCase(); if (q.length < 2) return null; const cnt = {}; trades.forEach((t) => { if (t.pair && t.pair.toUpperCase().includes(q)) cnt[t.pair] = (cnt[t.pair] || 0) + 1; }); const L = Object.entries(cnt).sort((a, b) => b[1] - a[1]); if (!L.length) return null;
            return <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", zIndex: 30, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 18px 40px -16px rgba(0,0,0,.45)", overflow: "hidden" }}>
              {L.map(([p, n]) => <button key={p} onClick={() => { setPendingPair(p); setFilterPair(p); setPendingSearch(""); setSearch(""); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, color: C.text, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, textAlign: "left" }}>
                <PairLogo pair={p} size={20} /><span style={{ flex: 1 }}>{p}</span><span className="tnum" style={{ fontSize: 12.5, color: C.textMuted, fontWeight: 600 }}>{n} trade{n > 1 ? "s" : ""}</span></button>)}
            </div>; })()}
        </div>
        {(() => { const n = trades.filter(needsAfter).length; return n > 0 && <button onClick={() => window.dispatchEvent(new Event("tjp-review"))} title="Revue express des trades pas encore revus" style={{ ...btn.ghost, flexShrink: 0, color: C.amber, borderColor: C.amber + "66" }}>📝 <span className="hide-sm">À revoir</span> {n}</button>; })()}
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
              <div key={monthKey} style={{ marginBottom: 16 }}>
                <button onClick={() => toggleMonth(monthKey)} style={{
                  width: "100%",
                  background: `linear-gradient(90deg, ${monthR > 0 ? C.tealDim : monthR < 0 ? C.redDim : C.purpleDim}, transparent 70%), ${C.card}`,
                  border: `1px solid ${C.border}`, borderLeft: `4px solid ${monthR > 0 ? C.teal : monthR < 0 ? C.red : C.purple}`, borderRadius: 16, padding: "14px 18px", marginBottom: isOpen ? 10 : 0,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 26px -18px rgba(0,0,0,0.55)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit",
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 8, color: C.textMuted, transform: isOpen ? "rotate(0)" : "rotate(-90deg)", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, textTransform: "capitalize", letterSpacing: -0.2 }}>{monthLabel}</div>
                      <div style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 3 }}>{monthTrades.length} trade{monthTrades.length > 1 ? "s" : ""} · {wins}W/{monthTrades.filter((x) => x.resultR < 0).length}L</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="tnum" style={{ fontSize: 24, fontWeight: 700, color: monthR > 0 ? C.teal : monthR < 0 ? C.red : C.textSecondary, letterSpacing: -0.5 }}>{monthR >= 0 ? "+" : ""}{monthR.toFixed(1)}R</div>
                    <div className="tnum" style={{ fontSize: 11.5, fontWeight: 600, color: monthR > 0 ? C.teal : monthR < 0 ? C.red : C.textSecondary, marginTop: 1 }}>{fmtUsdSigned(monthPnl)}</div>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ background: "transparent", padding: "4px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="never" style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "100px 80px 60px 1fr 90px 70px 80px", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, minWidth: 600 }}>
                        <div>Devise</div><div>Date</div><div>Dir.</div><div>Setup</div><div>R</div><div>$</div><div>Statut</div>
                      </div>
                      {monthTrades.map((t) => <TradeRow key={t.id} t={t} onOpen={onOpen} />)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
          <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, background: C.card }} className="never">
            <div className="table-scroll">
            <div style={{ display: "grid", gridTemplateColumns: "100px 80px 60px 1fr 90px 70px 80px", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, minWidth: 600 }}>
              <div>Devise</div><div>Date</div><div>Dir.</div><div>Setup</div><div>R</div><div>$</div><div>Statut</div>
            </div>
            {filtered.map((t) => <TradeRow key={t.id} t={t} onOpen={onOpen} />)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((t, i) => <MobileTradeCard key={t.id} t={t} onOpen={onOpen} isLast={i === filtered.length - 1} />)}
          </div>
          </>
          )}
        </>
      )}
    </div>
  );
}

function QuickTradeModal({ trade, onClose, onPatch, onOpenFull, appSettings }) {
  useEscClose(onClose);
  const SESS = ["London Session", "New York Session", "Asia Session", "Hors session"];
  const [when, setWhen] = useState(toLocalInput(trade.entryTime));
  const [sess, setSess] = useState((trade.tags || []).find((g) => SESS.includes(g)) || getSession(trade.entryTime));
  const tfList = appSettings?.timeframes && appSettings.timeframes.length ? [...new Set(appSettings.timeframes.map(tfFix))] : DEFAULT_TFS;
  const hiddenT = appSettings?.hiddenTags || [];
  const setupNames = [...new Set([...TAG_CATALOG.filter((t) => t.category === "setup").map((t) => t.name), ...(appSettings?.customTags || [])])];
  const ALLTF = ["M1","M3","M5","M15","M30","H1","H4","D1","W1","D","W","MN", ...tfList];
  const [rows, setRows] = useState(() => { const ts = trade.rules?.tfSetups; if (Array.isArray(ts) && ts.length) return ts.map((r) => ({ tf: r.tf, setups: [...(r.setups || [])] }));
    const tf = (trade.tags || []).find((g) => ALLTF.includes(g)); const st = (trade.tags || []).filter((g) => setupNames.includes(g) || TAG_CATALOG.find((c) => c.name === g && c.category === "setup"));
    return [{ tf: tf || tfList[0], setups: st }]; });
  const [rq, setRq] = useState({});
  const [entry, setEntry] = useState(trade.entryPrice ?? "");
  const [sl, setSl] = useState(trade.stopLoss ?? "");
  const [tp, setTp] = useState(trade.takeProfit ?? "");
  const [dir, setDir] = useState(trade.direction || "long");
  const [before, setBefore] = useState(trade.screenshotBefore || null);
  const [after, setAfter] = useState(trade.screenshotAfter || null);
  const [st, setSt] = useState(trade.status === "open" ? "open" : trade.status === "breakeven" ? "breakeven" : Number(trade.resultR) < 0 ? "loss" : "win");
  const [note, setNote] = useState(trade.retroRating ?? null);
  const [rIn, setRIn] = useState(trade.resultR != null && trade.status !== "open" ? String(Math.abs(trade.resultR)) : "");
  const [exitP, setExitP] = useState(trade.exitPrice ?? "");
  const pf = (v) => String(v ?? "").replace(".", ",");
  const enN = entry === "" ? null : Number(entry), slN = sl === "" ? null : Number(sl), tpN = tp === "" ? null : Number(tp);
  const rrN = enN != null && slN != null && tpN != null && enN !== slN ? Math.abs(tpN - enN) / Math.abs(enN - slN) : null;
  const riskN = Number(trade.riskUsd) || null;
  const exN = exitP === "" ? null : Number(String(exitP).replace(",", "."));
  const exR = enN != null && slN != null && exN != null && enN !== slN ? ((dir === "long" ? exN - enN : enN - exN) / Math.abs(enN - slN)) : null;
  const liveR = exR != null && (st === "win" || st === "loss") ? exR : st === "win" ? (rIn !== "" ? Math.abs(Number(rIn)) : rrN) : st === "loss" ? -(rIn !== "" ? Math.abs(Number(rIn)) : 1) : null;
  const pickExit = (k) => { if (k === "tp" && tp !== "") { setExitP(tp); setSt("win"); } if (k === "sl" && sl !== "") { setExitP(sl); setSt("loss"); } if (k === "be" && entry !== "") { setExitP(entry); setSt("breakeven"); } };
  const liveUsd = liveR != null && riskN ? liveR * riskN : null;
  const save = () => {
    const en = entry === "" ? null : Number(entry), s = sl === "" ? null : Number(sl), t = tp === "" ? null : Number(tp);
    let resultR = st === "open" ? null : st === "breakeven" ? 0 : liveR != null ? Math.round(liveR * 100) / 100 : null;
    const risk = Number(trade.riskUsd) || null;
    const keep = (trade.tags || []).filter((g) => !SESS.includes(g) && !ALLTF.includes(g) && !setupNames.includes(g) && !TAG_CATALOG.find((c) => c.name === g && c.category === "setup"));
    const tags = [...new Set([...keep, ...rows.map((r) => r.tf).filter(Boolean), ...rows.flatMap((r) => r.setups), ...(sess ? [sess] : [])])];
    const iso = when && !isNaN(new Date(when).getTime()) ? new Date(when).toISOString() : trade.entryTime;
    onPatch(trade.id, { entryTime: iso, tags, rules: { ...(trade.rules || {}), tfSetups: rows.filter((r) => r.tf || r.setups.length) }, entryPrice: en, stopLoss: s, takeProfit: t, direction: dir, screenshotBefore: before, screenshotAfter: after,
      exitPrice: exN, status: st === "win" || st === "loss" ? "closed" : st, resultR, resultUsd: resultR == null ? null : risk ? Math.round(resultR * risk * 100) / 100 : trade.resultUsd ?? null, retroRating: note });
    onClose();
  };
  const big = (on, col) => ({ flex: 1, padding: "11px 6px", borderRadius: 12, border: `1.5px solid ${on ? col : C.border}`, background: on ? `${col}1A` : "transparent", color: on ? col : C.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer" });
  const inp = { ...inputStyle, padding: "10px 11px", fontSize: 15 };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, fontSize: 30, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1, display: "flex", alignItems: "center", gap: 10 }}><PairLogo pair={trade.pair} size={38} />{trade.pair}</div>
            <button onClick={onClose} aria-label="Fermer" style={{ ...btn.ghost, padding: 8 }}><X size={16} /></button>
          </div>
            <input type="datetime-local" value={when} onChange={(e) => { setWhen(e.target.value); const d = new Date(e.target.value); if (!isNaN(d.getTime())) setSess(getSession(d.toISOString())); }} aria-label="Date" style={{ ...inputStyle, width: "auto", padding: "5px 9px", fontSize: 12.5, marginTop: 8 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
          {[["Entrée", entry, setEntry], ["Stop loss", sl, setSl], ["Take profit", tp, setTp]].map(([l, v, set]) => (
            <div key={l}><div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSecondary, marginBottom: 5 }}>{l}</div>
              <input type="text" inputMode="decimal" value={pf(v)} onChange={(e) => set(autoPrice(e.target.value, trade.pair))} style={inp} aria-label={l} /></div>))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDir("long")} style={big(dir === "long", C.teal)}>↗ Long</button>
          <button onClick={() => setDir("short")} style={big(dir === "short", C.red)}>↘ Short</button>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSecondary, marginBottom: 6 }}>Session</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SESS.map((x) => <button key={x} onClick={() => setSess(x)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: `1px solid ${sess === x ? C.purple : C.border}`, background: sess === x ? C.purpleDim : "transparent", color: sess === x ? C.purpleBright : C.textSecondary }}><SessionFlag name={x} size={15} />{x.replace(" Session", "")}</button>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSecondary, marginBottom: 6 }}>Setup</div>
          {rows.map((row, i) => { const qq = (rq[i] || "").trim().toLowerCase(); const hits = qq ? setupNames.filter((n) => n.toLowerCase().includes(qq) && !row.setups.includes(n)).slice(0, 6) : [];
            const upd = (fn) => setRows((rs) => rs.map((r, j) => j === i ? fn(r) : r));
            return (<div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <select value={row.tf} onChange={(e) => upd((r) => ({ ...r, tf: e.target.value }))} aria-label="Timeframe" style={{ ...inp, width: 76, flexShrink: 0, fontWeight: 600 }}>{[...new Set([...tfList, row.tf].filter(Boolean))].map((t) => <option key={t} value={t}>{t}</option>)}</select>
                <input value={rq[i] || ""} onChange={(e) => setRq((m) => ({ ...m, [i]: e.target.value }))} placeholder="Ajouter un PD array…" style={{ ...inp, flex: 1, minWidth: 0 }}
                  onKeyDown={(e) => { if (e.key === "Enter" && hits[0]) { upd((r) => ({ ...r, setups: [...r.setups, hits[0]] })); setRq((m) => ({ ...m, [i]: "" })); } }} />
                {rows.length > 1 && <button onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Retirer" style={{ ...btn.ghost, padding: "6px 9px" }}><X size={13} /></button>}
              </div>
              {hits.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>{hits.map((h) => <Chip key={h} onClick={() => { upd((r) => ({ ...r, setups: [...r.setups, h] })); setRq((m) => ({ ...m, [i]: "" })); }}>+ {h}</Chip>)}</div>}
              {row.setups.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>{row.setups.map((st) => <span key={st} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, background: C.purpleDim, color: C.purpleBright, fontSize: 12, fontWeight: 700 }}><b style={{ color: C.text }}>{row.tf}</b> {st}
                <button onClick={() => upd((r) => ({ ...r, setups: r.setups.filter((x) => x !== st) }))} aria-label={"Retirer " + st} style={{ background: "none", border: "none", color: C.purpleBright, cursor: "pointer", padding: 0, display: "flex" }}><X size={12} /></button></span>)}</div>}
            </div>); })}
          <button onClick={() => setRows((rs) => [...rs, { tf: tfList.find((t) => !rs.some((r) => r.tf === t)) || tfList[0], setups: [] }])} style={{ background: "none", border: "none", color: C.purpleBright, fontWeight: 700, fontSize: 12.5, cursor: "pointer", padding: 0 }}>+ Ajouter des PD arrays</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ImageUploadBox label="Avant" value={before} onChange={setBefore} />
          <ImageUploadBox label="Après" value={after} onChange={setAfter} />
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, background: C.cardHover, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {[["open", "En cours", C.purpleBright], ["win", "Gagné", C.teal], ["loss", "Perdu", C.red], ["breakeven", "BE", C.textSecondary]].map(([v, l, col]) => <button key={v} onClick={() => setSt(v)} style={{ ...big(st === v, col), flex: v === "breakeven" ? 0.6 : 1 }}>{l}</button>)}
          </div>
          {st !== "open" && <>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSecondary, marginBottom: 6 }}>Prix de sortie</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="text" inputMode="decimal" value={pf(exitP)} onChange={(e) => setExitP(autoPrice(e.target.value, trade.pair))} placeholder="—" aria-label="Prix de sortie" style={{ ...inp, flex: 1, minWidth: 0 }} />
                {[["tp", "TP", C.teal, tp], ["sl", "SL", C.red, sl], ["be", "BE", C.textSecondary, entry]].map(([k, l, col, v]) => { const on = exitP !== "" && v !== "" && Number(String(exitP).replace(",", ".")) === Number(v); return <button key={k} disabled={v === ""} onClick={() => pickExit(k)} style={{ width: 54, borderRadius: 11, border: `1.5px solid ${on ? col : C.border}`, background: on ? col + "1F" : "transparent", color: on ? col : C.textSecondary, fontWeight: 800, fontSize: 13, cursor: v === "" ? "default" : "pointer", opacity: v === "" ? 0.4 : 1 }}>{l}</button>; })}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px", borderRadius: 13, background: C.card, border: `1px solid ${(liveR ?? 0) > 0 ? C.teal + "55" : (liveR ?? 0) < 0 ? C.red + "55" : C.border}` }}>
              <div>
                <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700, letterSpacing: 0.4 }}>RÉSULTAT</div>
                {exR == null ? <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}><input type="number" inputMode="decimal" step="0.1" value={rIn} onChange={(e) => setRIn(e.target.value)} placeholder={st === "win" ? (rrN ? rrN.toFixed(2) : "R") : "1"} aria-label="R" style={{ ...inp, width: 80, padding: "7px 9px" }} /><span style={{ color: C.textMuted, fontWeight: 600 }}>R</span></div>
                  : <div className="tnum" style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}>Sortie {pf(exitP)}</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="tnum" style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, color: (liveR ?? 0) > 0 ? C.teal : (liveR ?? 0) < 0 ? C.red : C.textSecondary }}>{st === "breakeven" ? "0.00R" : liveR != null ? fmtR(liveR) : "—"}</div>
                {liveUsd != null && st !== "breakeven" && <div className="tnum" style={{ fontSize: 12, color: C.textMuted }}>{fmtUsdSigned(liveUsd)} · risque {fmtUsd(riskN)}</div>}
              </div>
            </div>
          </>}
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSecondary, marginBottom: 6 }}>Note du trade {note ? <b style={{ color: C.text }}>· {note}/10</b> : ""}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4 }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <button key={n} onClick={() => setNote(note === n ? null : n)} style={{ height: 36, borderRadius: 9, border: `1px solid ${note === n ? C.purple : C.border}`, background: note != null && n <= note ? C.purpleDim : "transparent", color: note != null && n <= note ? C.purpleBright : C.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0 }}>{n}</button>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(trade.pair || "").toUpperCase() === "EURUSD" && <button onClick={() => { onClose(); replayRealTrade(trade); }} title="Rejouer ce trade dans le replay (24 h avant l'entrée)" style={{ ...btn.ghost, justifyContent: "center" }}><Rewind size={13} /> Rejouer</button>}
          {onOpenFull && <button onClick={() => { onClose(); onOpenFull(trade.id); }} style={{ ...btn.ghost, flex: 1, justifyContent: "center" }}>Détail complet</button>}
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
      <div style={{ fontSize: 12, fontWeight: 600, color: t.direction === "long" ? "#2D7DD2" : C.red }}>{t.direction === "long" ? "Achat" : "Vente"}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
        {(() => { const ts = t.rules?.tfSetups; const items = Array.isArray(ts) && ts.length ? ts.flatMap((r) => (r.setups || []).map((x) => [x, r.tf])) : setupTags.map((x) => [x, (t.tags || []).find((g) => ["M1","M3","M5","M15","M30","H1","H4","D1","W1","D","W","MN"].includes(g)) || ""]);
          return items.slice(0, 3).map(([n, tf]) => <span key={n + tf} style={{ fontSize: 11, fontWeight: 700, color: C.text, background: C.inputBg || C.bg, border: `1px solid ${C.border}`, padding: "2px 8px", borderRadius: 6 }}>{n}{tf ? <span style={{ color: C.purpleBright, marginLeft: 5 }}>{tf}</span> : null}</span>); })()}
        {dxyTags.length > 0 && <>
          <span style={{ color: C.border, fontSize: 14, fontWeight: 300 }}>╱</span>
          {dxyTags.slice(0, 1).map(tag => <span key={tag} style={{ fontSize: 10.5, fontWeight: 600, color: C.amber, background: `${C.amber}15`, border: `1px solid ${C.amber}40`, padding: "2px 7px", borderRadius: 5 }}>DXY·{tag}</span>)}
        </>}
      </div>
      <div className="tnum" style={{ fontWeight: 600, fontSize: 14, color: t.status === "open" ? C.textSecondary : (t.resultR || 0) > 0 ? C.teal : (t.resultR || 0) < 0 ? C.red : C.textSecondary }}>{t.status === "open" ? "—" : fmtR(t.resultR)}</div>
      <div className="tnum" style={{ color: C.textMuted, fontWeight: 600, fontSize: 12 }}>{t.status === "open" || t.resultUsd == null ? "—" : fmtUsdSigned(t.resultUsd)}</div>
      <div>
        <span style={{ padding: "3px 9px", borderRadius: 20, background: `${statusColors[cur]}18`, border: `1px solid ${statusColors[cur]}40`, color: statusColors[cur], fontSize: 11, fontWeight: 600 }}>
          {statusLabels[cur]}
        </span>
      </div>
    </div>
  );
}

function BrokerTradeCard({ t, onOpen, isLast }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(null);
  const isOpenSt = t.status === "open", isBE = t.status === "breakeven";
  const r = Number(t.resultR) || 0;
  const col = isOpenSt ? C.textSecondary : isBE ? C.textSecondary : r > 0 ? C.teal : r < 0 ? C.red : C.textSecondary;
  const fp = (v) => v == null || v === "" ? "—" : String(v).replace(".", ",");
  const exit = t.exitPrice ?? (t.status === "closed" ? (r > 0 ? t.takeProfit : r < 0 ? t.stopLoss : t.entryPrice) : null);
  const statusTxt = isOpenSt ? "En cours" : isBE ? "Breakeven" : r > 0 ? "Gagné" : r < 0 ? "Perdu" : "Fermé";
  const ts = t.rules?.tfSetups;
  const setups = Array.isArray(ts) && ts.length ? ts.flatMap((x) => (x.setups || []).map((n) => n + (x.tf ? " " + x.tf : ""))) : (t.tags || []).filter((g) => TAG_CATALOG.find((c) => c.name === g && c.category === "setup"));
  const lab = { fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: 0.5, textTransform: "uppercase" };
  const val = { fontSize: 15, fontWeight: 600, color: C.text, marginTop: 2 };
  const dt = (iso) => { if (!iso) return ""; const d = new Date(iso); const p2 = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}/${p2(d.getMonth() + 1)}/${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  return (
    <div style={{ marginBottom: isLast ? 0 : 8, background: `linear-gradient(90deg, ${col}12, transparent 35%), ${C.card}`, borderRadius: 16, border: `1px solid ${C.border}`, borderLeft: `3px solid ${col}`, overflow: "hidden" }}>
      {zoom && <LightBox src={zoom.src} label={zoom.label} onClose={() => setZoom(null)} />}
      <div onClick={() => setOpen((v) => !v)} style={{ padding: "13px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ligne 1 : EURUSD ▲ LONG · date   ligne 2 : lots · drapeau + session   ligne 3 : setups */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", overflow: "hidden" }}>
            <PairLogo pair={t.pair} size={22} /><span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.2 }}>{t.pair}</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: t.direction === "long" ? C.teal : C.red }}>{t.direction === "long" ? "▲ LONG" : "▼ SHORT"}</span>
            <span className="tnum" style={{ fontSize: 12.5, color: C.textMuted }}>· {new Date(t.entryTime).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} {new Date(t.entryTime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="tnum" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden" }}>
            {t.positionSize != null && <span><b>{fp(t.positionSize)}</b> <span style={{ color: C.textMuted }}>lot{Number(t.positionSize) > 1 ? "s" : ""}</span></span>}
            {(() => { const k = killzoneLabel(t.entryTime); const se = getSession(t.entryTime); const n = k !== "Hors killzone" ? k : se; return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: C.textSecondary }}><SessionFlag name={n} size={15} />{String(n).replace(" Session", "")}</span>; })()}
          </div>
          {setups.length > 0 && <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>{setups.slice(0, 4).map((x) => <span key={x} style={{ fontSize: 11, fontWeight: 600, color: C.purpleBright, background: C.purpleDim, padding: "2px 7px", borderRadius: 6 }}>{x}</span>)}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span className="tnum" style={{ display: "inline-block", padding: "3px 9px", borderRadius: 7, fontSize: 15, fontWeight: 600, color: col, background: isOpenSt || isBE ? "rgba(255,255,255,0.06)" : `${col}22` }}>{isOpenSt ? "En cours" : fmtR(r)}</span>
          <div className="tnum" style={{ fontSize: 13, color: C.textSecondary, marginTop: 5 }}>{!isOpenSt && t.resultUsd != null ? fmtUsdSigned(t.resultUsd) : statusTxt}</div>
        </div>
        <ChevronDown size={18} color={C.textMuted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }} />
      </div>
      {open && <div style={{ borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ flex: 1 }}><div style={lab}>Prix d'entrée</div><div className="tnum" style={val}>{fp(t.entryPrice)}</div><div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{dt(t.entryTime)}</div></div>
          <ArrowRightIcon />
          <div style={{ flex: 1, textAlign: "right" }}><div style={lab}>Prix de sortie</div><div className="tnum" style={val}>{fp(exit)}</div><div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{statusTxt}</div></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div><div style={lab}>Stop loss</div><div className="tnum" style={val}>{fp(t.stopLoss)}</div></div>
          <div><div style={lab}>Take profit</div><div className="tnum" style={val}>{fp(t.takeProfit)}</div></div>
          <div><div style={lab}>Résultat</div><div className="tnum" style={{ ...val, color: col, fontWeight: 600 }}>{isOpenSt ? "—" : fmtR(r)}</div></div>
          <div><div style={lab}>Profit net</div><div className="tnum" style={{ ...val, color: col }}>{!isOpenSt && t.resultUsd != null ? fmtUsdSigned(t.resultUsd) : "—"}</div></div>
          <div><div style={lab}>Risque</div><div className="tnum" style={val}>{t.riskUsd ? fmtUsd(t.riskUsd) : "—"}</div></div>
          <div><div style={lab}>Session</div><div style={{ ...val, display: "flex", alignItems: "center", gap: 6 }}><SessionFlag name={getSession(t.entryTime)} size={15} />{getSession(t.entryTime).replace(" Session", "")}</div></div>
        </div>
        {setups.length > 0 && <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={lab}>Setup</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>{setups.map((x) => <span key={x} style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: C.purpleDim, color: C.purpleBright }}>{x}</span>)}</div>
        </div>}
        {(t.screenshotBefore || t.screenshotAfter) && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
          {[["Avant", t.screenshotBefore], ["Après", t.screenshotAfter]].map(([l, src]) => (
            <div key={l}><div style={{ ...lab, marginBottom: 6 }}>{l}</div>
              {src ? <img src={src} alt={l} onClick={() => setZoom({ src, label: l })} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8, cursor: "zoom-in", border: `1px solid ${C.border}` }} />
                : <div style={{ height: 90, borderRadius: 8, border: `1px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, color: C.textMuted }}>Pas de photo</div>}
            </div>))}
        </div>}
        {t.notes && <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.textSecondary, whiteSpace: "pre-wrap" }}>{t.notes}</div>}
        <div style={{ display: "flex" }}>{(t.pair || "").toUpperCase() === "EURUSD" && <button onClick={() => replayRealTrade(t)} title="Rejouer ce trade dans le replay (24 h avant l'entrée)" style={{ flex: 1, padding: "13px", background: "transparent", border: "none", borderRight: `1px solid ${C.border}`, color: C.textSecondary, fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Rewind size={14} /> Rejouer</button>}        <button onClick={() => onOpen(t.id)} style={{ flex: 1, padding: "13px", background: "transparent", border: "none", color: C.purpleBright, fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Edit3 size={14} /> Modifier</button></div>
      </div>}
    </div>
  );
}
function ArrowRightIcon() { return <span style={{ color: C.textMuted, padding: "0 10px", fontSize: 18 }}>→</span>; }
function MobileTradeCard(props) { return <BrokerTradeCard {...props} />; }
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
          <div className="tnum" style={{ fontSize: 16, fontWeight: 600, color: realPnl >= 0 ? C.teal : C.red }}>{realPnl >= 0 ? "+" : ""}{realPnl.toFixed(0)}$</div>
          <div className="tnum" style={{ fontSize: 11, color: realPnl >= 0 ? C.teal : C.red, opacity: 0.8 }}>{realR >= 0 ? "+" : ""}{realR.toFixed(2)}R</div>
        </div>
        <div style={{ padding: "12px 10px", borderRadius: 9, background: C.tealDim, border: `1.5px solid ${C.teal}`, textAlign: "center" }}>
          <div style={{ fontSize: 9.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Simulé</div>
          <div className="tnum" style={{ fontSize: 16, fontWeight: 600, color: C.teal }}>+{simPnl.toFixed(0)}$</div>
          <div className="tnum" style={{ fontSize: 11, color: C.teal, opacity: 0.8 }}>+{simR}R</div>
        </div>
        <div style={{ padding: "12px 10px", borderRadius: 9, background: diff >= 0 ? "rgba(45,212,191,0.06)" : C.redDim, border: `1px solid ${diff >= 0 ? C.teal : C.red}40`, textAlign: "center" }}>
          <div style={{ fontSize: 9.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Écart</div>
          <div className="tnum" style={{ fontSize: 16, fontWeight: 600, color: diff >= 0 ? C.teal : C.red }}>{diff >= 0 ? "+" : ""}{diff.toFixed(0)}$</div>
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
  const R0 = trade.rules || {};
  const toggleNeg = (err) => { const nx = negChecked.includes(err) ? negChecked.filter(e => e !== err) : [...negChecked, err]; onPatch({ mistakes: nx, rules: { ...R0, reviewed: true, clean: false } }); };
  const togglePos = (p) => onPatch({ positives: posChecked.includes(p) ? posChecked.filter(e => e !== p) : [...posChecked, p], rules: { ...R0, reviewed: true } });
  const setClean = () => onPatch({ mistakes: [], rules: { ...R0, reviewed: true, clean: !R0.clean || negChecked.length > 0 } });

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <CardLabel>À améliorer</CardLabel>
          <button onClick={setClean} style={{ padding: "6px 11px", borderRadius: 999, border: `1.5px solid ${R0.clean && !negChecked.length ? C.teal : C.border}`, background: R0.clean && !negChecked.length ? C.tealDim : "transparent", color: R0.clean && !negChecked.length ? C.teal : C.textSecondary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Aucune erreur</button>
        </div>
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

/* rejouer un trade réel EURUSD dans le replay : contexte 24 h avant, entrée / SL / TP dessinés, session à part (pas comptée dans tes stats) */
function replayRealTrade(t) {
  const t0 = Math.floor(new Date(t.entryTime).getTime() / 1000); const e = Number(t.entryPrice), sl = Number(t.stopLoss), tp = Number(t.takeProfit);
  const draws = [];
  if (e && tp) draws.push({ type: "rect", color: "#089981", pts: [{ t: t0, p: Math.max(e, tp) }, { t: t0 + 6 * 3600, p: Math.min(e, tp) }] });
  if (e && sl) draws.push({ type: "rect", color: "#f23645", pts: [{ t: t0, p: Math.max(e, sl) }, { t: t0 + 6 * 3600, p: Math.min(e, sl) }] });
  if (e) draws.push({ type: "hray", color: "#131722", pts: [{ t: t0, p: e }] });
  window.TJP_PENDING_GOTO = { t: t0, draws, session: "Rejouer mes trades réels", create: true, noSave: true, msg: `Ton trade réel du ${fmtDateTime(t.entryTime)} : replay repris 24 h avant. Qu'aurais-tu dû voir ?` };
  window.dispatchEvent(new CustomEvent("tjp-goto", { detail: "backtest" }));
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
            <span style={{ fontWeight: 600, fontSize: 26 }}>{trade.pair}</span>
            <DirBadge direction={trade.direction} size="lg" />
            <ResultBadge resultR={trade.resultR} status={trade.status} />
          </div>
          <div style={{ fontSize: 12, color: C.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={12} /> {fmtDateTime(trade.entryTime)} · {getSession(trade.entryTime)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(trade.pair || "").toUpperCase() === "EURUSD" && trade.accountId !== BT_ACC && <button onClick={() => replayRealTrade(trade)} title="Rejoue ce trade dans le replay, 24 h avant l'entrée, avec ton entrée, ton SL et ton TP dessinés" style={btn.ghost}><Rewind size={13} /> Rejouer</button>}
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
              <DetailStat label="Direction" value={trade.direction === "long" ? "Achat" : "Vente"} valueColor={trade.direction === "long" ? "#4A9EFF" : C.red} />
              <DetailStat label="Session" value={getSession(trade.entryTime) || "—"} />
              <DetailStat label="Timeframe" value={(trade.tags || []).find(t => ["M1","M5","M15","M30","H1","H4","D1","W1","D","W"].includes(t)) || "—"} />
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
                  <div className="tnum" style={{ fontSize: 20, fontWeight: 600, color: isBE ? C.textSecondary : isWin ? C.teal : C.red }}>{isBE ? "BE" : fmtUsdSigned(trade.resultUsd)}</div>
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
                <div className="tnum" style={{ fontSize: 22, fontWeight: 600, color: isBE ? C.textSecondary : isWin ? C.teal : C.red }}>{isBE ? "BE" : fmtUsdSigned(trade.resultUsd)}</div>
              </div>
              <div style={{ flex: 1, padding: "14px 12px", borderRadius: 10, background: isBE ? "rgba(107,115,136,0.1)" : isWin ? C.tealDim : C.redDim, border: `1.5px solid ${isBE ? C.textMuted : isWin ? C.teal : C.red}40`, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Résultat R</div>
                <div className="tnum" style={{ fontSize: 22, fontWeight: 600, color: isBE ? C.textSecondary : isWin ? C.teal : C.red }}>{isBE ? "0R" : fmtR(trade.resultR)}</div>
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
              <span className="tnum" style={{ fontSize: 20, fontWeight: 600, color: (trade.confidenceLevel||0) <= 3 ? C.red : (trade.confidenceLevel||0) <= 5 ? C.amber : (trade.confidenceLevel||0) <= 7 ? C.teal : C.purpleBright }}>
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
              <span className="tnum" style={{ fontSize: 20, fontWeight: 600, color: retroRating <= 0 ? C.textMuted : retroRating <= 3 ? C.red : retroRating <= 5 ? C.amber : retroRating <= 7 ? C.teal : C.purpleBright }}>
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
      <div className="tnum" style={{ fontSize: 17, fontWeight: 600, color: color || C.purpleBright }}>{value}</div>
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


const CONFIDENCE_META = {
  high: { color: "#2DD4BF", label: "Fiable" },
  medium: { color: "#D89A2E", label: "À vérifier" },
  low: { color: "#E8554E", label: "Incertain" },
  none: { color: "#9AA1B8", label: "Non détecté" },
};



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
          height: 150,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "border-color 0.15s, background 0.15s",
          outline: "none",
          boxShadow: focused ? (C.focusShadow || "0 0 0 3px rgba(124,92,252,0.14)") : "none",
        }}
      >
        {value ? (
          <>
            <img src={value} alt={label} style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }} />
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
function Section({ title, icon, sub, open, onToggle, children }) {
  const collapsible = typeof onToggle === "function";
  const shown = !collapsible || open;
  return (
    <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: collapsible && !open ? "14px 16px" : 16, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
      <div onClick={collapsible ? onToggle : undefined} style={{ display: "flex", alignItems: "center", gap: 10, cursor: collapsible ? "pointer" : "default", userSelect: "none" }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: C.purpleDim, color: C.purpleBright, fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: -0.2 }}>{title}</div>
          {collapsible && sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
        </div>
        {collapsible && <ChevronDown size={18} color={C.textMuted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />}
      </div>
      {shown && children}
    </section>
  );
}

// ── Nouveau formulaire d'ajout (v2) ──
const DEFAULT_TFS = ["M15", "M30", "H1", "H4", "D", "W"];
// D1 → D, W1 → W, MN1 → MN : une seule écriture partout
const TF_FIX = { D1: "D", W1: "W", MN1: "MN", "1D": "D", "1W": "W" };
const tfFix = (x) => TF_FIX[x] || x;
// Tag « Tendance » : le trade va dans le sens du biais Daily ou Weekly noté dans Prévisions
function withTrend(t) {
  if (!t || !t.pair || !t.direction || t.rules?.backtest) return t;
  let b = {}; try { b = JSON.parse(localStorage.getItem("previsions_data") || "{}"); } catch {}
  const want = t.direction === "long" ? "bullish" : "bearish";
  const ok = ["Daily", "Weekly"].some((tf) => b[`${t.pair}_${tf}`] === want);
  if (!ok || (t.tags || []).includes("Tendance")) return t;
  return { ...t, tags: [...(t.tags || []), "Tendance"] };
}
function fixTF(t) {
  if (!t) return t; const tg = t.tags || []; const ts = t.rules?.tfSetups;
  const needT = tg.some((g) => TF_FIX[g]); const needS = Array.isArray(ts) && ts.some((r) => TF_FIX[r.tf]);
  if (!needT && !needS) return t;
  return { ...t, tags: needT ? [...new Set(tg.map(tfFix))] : tg, rules: needS ? { ...t.rules, tfSetups: ts.map((r) => ({ ...r, tf: tfFix(r.tf) })) } : t.rules };
}
const GRADES = [["A+", "A", "A-"], ["B+", "B", "B-"], ["C+", "C", "C-"], ["D+", "D", "D-"], ["E"]];
const gradeToLevel = (g) => !g ? 0 : g[0] === "A" ? 5 : g[0] === "B" ? 4 : g[0] === "C" ? 3 : g[0] === "D" ? 2 : 1;
function pipInfo(pair, entry) {
  const ep = Number(entry) || 1;
  const dec = pair.includes("JPY") ? 0.01 : pair === "XAUUSD" ? 0.1 : pair === "XAGUSD" ? 0.01 : ["US30", "NAS100", "SPX500", "GER40", "FRA40", "UK100", "BTCUSD", "ETHUSD"].includes(pair) ? 1 : 0.0001;
  let val = 10;
  if (pair === "USOIL" || pair === "UKOIL") return { dec: 0.01, val: 10 };
  if (pair === "BTCUSD" || pair === "ETHUSD") return { dec: 1, val: 1 };
  if (pair === "XAUUSD") val = 10; else if (pair === "XAGUSD") val = 50; else if (["US30", "NAS100", "SPX500", "GER40", "FRA40", "UK100"].includes(pair)) val = 1;
  else if (pair.endsWith("USD") && !pair.startsWith("USD")) val = 10; else if (pair.endsWith("JPY")) val = 1000 / ep;
  else if (pair.startsWith("USD") || pair.endsWith("CAD") || pair.endsWith("CHF")) val = 10 / ep;
  return { dec, val };
}
function ShotAutoFill({ onResult, onImage }) {
  const [state, setState] = useState("idle"); const [res, setRes] = useState(null); const [msg, setMsg] = useState(""); const [url, setUrl] = useState(null);
  const ref = useRef(null);
  const go = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setState("reading"); setMsg(""); setRes(null);
    const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
    const up = uploadToStorage(file).catch(() => null);
    try {
      const u0 = up.then((x) => x || data); u0.then((x) => onImage && onImage(x));
      const r = await analyzeChartScreenshot(data, ALL_INSTRUMENTS); const u = await u0; setUrl(u); setRes(r);
      if (r.trades.length) { onResult(r.trades[0], r, u); setState("done"); setMsg((r.trades[0].direction === "long" ? "Long" : "Short") + " détecté · entrée " + r.trades[0].entryPrice + " · SL " + r.trades[0].stopLoss + " · TP " + r.trades[0].takeProfit); }
      else { setState("fail"); setMsg("Pas d'outil Long/Short trouvé sur l'image."); }
    } catch (e) { setState("fail"); setMsg("Photo ajoutée en « avant ». Lecture auto impossible : " + (e.message || e)); }
  };
  /* Ctrl+V n'importe où dans le formulaire : la capture remplit le trade et devient la photo « avant » */
  const goRef = useRef(go); goRef.current = go;
  useEffect(() => { const h = (e) => { if (e.defaultPrevented) return; const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/")); if (it) { e.preventDefault(); goRef.current(it.getAsFile()); } }; window.addEventListener("paste", h); return () => window.removeEventListener("paste", h); }, []);
  const col = state === "done" ? C.teal : state === "fail" ? C.red : C.border;
  return (
    <div onPaste={(e) => { const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/")); if (it) { e.preventDefault(); go(it.getAsFile()); } }}
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); go(e.dataTransfer.files?.[0]); }} tabIndex={0}
      style={{ background: C.card, border: `1.5px dashed ${col}`, borderRadius: 16, padding: "14px 16px", marginBottom: 12, outline: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Sparkles size={18} color={C.purpleBright} className={state === "reading" ? "spin-slow" : ""} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{state === "reading" ? "Lecture du graphique…" : "Remplir avec une photo (Ctrl+V pour coller)"}</div>
          <div style={{ fontSize: 12.5, color: state === "fail" ? C.red : C.textMuted, marginTop: 2 }}>{msg || "Outil Long/Short de TradingView : sens, entrée, SL, TP et date se remplissent seuls"}</div>
        </div>
        <button onClick={() => ref.current?.click()} style={{ ...btn.ghost, padding: "8px 12px", fontSize: 13 }}><Upload size={14} /> Choisir</button>
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { go(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {res && res.trades.length > 1 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        {res.trades.map((t, i) => <button key={i} onClick={() => onResult(t, res, url)} style={{ padding: "7px 11px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: t.direction === "long" ? C.teal : C.red, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>{t.direction === "long" ? "Long" : "Short"} {t.entryPrice}{t.date ? " · " + t.date : ""}</button>)}
      </div>}
    </div>);
}

function TradeFormV2({ initial, appSettings, onCancel, onSave, trades }) {
  const isEdit = !!initial && !initial._draft;
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
  const tfList = (appSettings?.timeframes && appSettings.timeframes.length ? [...new Set(appSettings.timeframes.map(tfFix))] : DEFAULT_TFS);
  const initTf = (() => {
    const r = initial?.rules?.tfSetups; if (Array.isArray(r) && r.length) return r;
    const tags = initial?.tags || []; const tf = tags.find((t) => tfList.includes(t) || ["M1","M5","M15","M30","H1","H4","D1","W1","D","W"].includes(t));
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
  /* revue directement dans le formulaire : check-list, erreurs, points positifs */
  const [mist, setMist] = useState(initial?.mistakes || []);
  const [pos, setPos] = useState(initial?.positives || []);
  const [clean, setClean] = useState(!!initial?.rules?.clean);
  const [verd, setVerd] = useState(initial?.verdict || null);
  const [checks, setChecks] = useState(initial?.rules?.checks || []);
  const rulesNow = loadRules(); const checkItems = []; /* check-list retirée du formulaire */
  const errChoices = useMemo(() => byFreq(errNames(appSettings), trades, "mistakes"), []);
  const posChoices = useMemo(() => byFreq(posNames(appSettings), trades, "positives"), []);
  const setupFreq = useMemo(() => { const c = {}; (trades || []).forEach((t) => { const ts = t.rules?.tfSetups; (Array.isArray(ts) ? ts.flatMap((r) => r.setups || []) : (t.tags || [])).forEach((x) => { c[x] = (c[x] || 0) + 1; }); }); return c; }, []);
  const lastT = !initial ? (trades || [])[0] : null;
  const copyLast = () => { if (!lastT) return; setPair(lastT.pair || ""); setQ(""); setDirection(lastT.direction || "long"); const ts = lastT.rules?.tfSetups; if (Array.isArray(ts) && ts.length) setTfRows(ts.map((r) => ({ tf: r.tf, setups: [...(r.setups || [])] }))); if (Number(lastT.riskUsd) > 0) { setRiskMode("usd"); setRiskVal(String(lastT.riskUsd)); } };

  const hidden = appSettings?.hiddenTags || [];
  const setupNames = [...new Set([...TAG_CATALOG.filter((t) => t.category === "setup").map((t) => t.name), ...(appSettings?.customTags || [])])]; /* les 15 PD arrays du site, toujours tous proposés */
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
  const needR = status === "win" && rFinal == null; /* un gain sans R fausserait tes stats */
  const canSave = timeOk && !!pair && !needR;
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
    const { _draft, ...init0 } = initial || {};
    onSave({
      ...init0,
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
      mistakes: mist, positives: pos, verdict: verd,
      rules: { ...(initial?.rules || {}), tfSetups: tfRows.filter((r) => r.tf || r.setups.length), grade,
        ...(checkItems.length ? { checks, checkAll: checkItems.every((x) => checks.includes(x)) } : {}),
        clean: clean && !mist.length, reviewed: !!(mist.length || pos.length || (clean && !mist.length) || verd) || !!initial?.rules?.reviewed },
    });
  };

  /* Ctrl + Entrée (ou ⌘ + Entrée) : enregistrer depuis n'importe où dans le formulaire */
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => { const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); saveRef.current(); } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14 };
  const lab = { fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 6 };
  const inp = { ...inputStyle, padding: "11px 12px", fontSize: 15 };
  const big = (on, col) => ({ flex: 1, padding: "13px 6px", borderRadius: 13, border: `1.5px solid ${on ? col : C.border}`, background: on ? `${col}1A` : "transparent", color: on ? col : C.textMuted, fontSize: 15, fontWeight: 600, cursor: "pointer" });
  const kz = entryTime ? killzoneLabel(entryTime) : "";

  return (
    <div className="fade-in" style={{ paddingBottom: 190 }}>
      <style>{`@media (max-width: 600px) { .tf2-bar { bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important; } } @media (min-width: 601px) { .tf2-bar { left: 220px !important; } } @media (min-width: 601px) and (max-width: 1024px) { .tf2-bar { left: 72px !important; } }`}</style>
      <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <BackLink onClick={onCancel}>Annuler</BackLink>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 0", letterSpacing: -0.4, flex: 1 }}>{isEdit ? "Modifier le trade" : "Nouveau trade"}</h1>
            {lastT && <button type="button" onClick={copyLast} title="Reprend la paire, le sens, les setups et le risque de ton dernier trade" style={{ ...btn.ghost, padding: "7px 11px", fontSize: 12.5 }}><Copy size={14} /> Comme le dernier ({lastT.pair})</button>}
          </div>
        </div>

        {/* 0. Remplir depuis un screenshot TradingView */}
        {!isEdit && <ShotAutoFill onImage={(u) => setShotBefore(u)} onResult={(t, res, url) => {
          if (res.pair) setPair(res.pair);
          setDirection(t.direction);
          if (t.entryPrice != null) setEntryPrice(String(t.entryPrice));
          if (t.stopLoss != null) setStopLoss(String(t.stopLoss));
          if (t.takeProfit != null) setTakeProfit(String(t.takeProfit));
          if (t.date) setEntryTime((cur) => t.date + "T" + (String(cur || "").split("T")[1] || "09:30"));
          if (url) setShotBefore(url);
        }} />}

        {/* 1. Date */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...lab }}><span>Date et heure</span>{kz && <span style={{ color: kz === "Hors killzone" ? C.amber : C.teal, display: "inline-flex", alignItems: "center", gap: 6 }}><SessionFlag name={kz} size={15} />{kz}</span>}</div>
          <input type="datetime-local" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} style={inp} aria-label="Date et heure" />
        </div>

        {/* 2. Paire */}
        <div style={card}>
          <div style={lab}>Paire</div>
          {pair && !q ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <PairLogo pair={pair} size={34} /><span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{PAIR_LABEL[pair] ? PAIR_LABEL[pair] + " · " + pair : pair}</span>
              <button onClick={() => { setPair(""); setQ(""); }} style={{ ...btn.ghost, padding: "6px 10px", fontSize: 12 }}>Changer</button>
            </div>
          ) : (<>
            <div style={{ position: "relative" }}>
              <Search size={15} color={C.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input autoFocus={!isEdit} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tape EUR, GBP, XAU…" style={{ ...inp, paddingLeft: 36 }} aria-label="Rechercher une paire"
                onKeyDown={(e) => { if (e.key === "Enter" && pairHits[0]) { setPair(pairHits[0]); setQ(""); } }} />
            </div>
            {!qn && Object.keys(used).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {Object.entries(used).filter(([p]) => p && p !== "undefined").sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p]) => <Chip key={p} onClick={() => { setPair(p); setQ(""); }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><PairLogo pair={p} size={16} />{p}</span></Chip>)}
            </div>}
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
            <button onClick={() => setDirection("short")} style={big(direction === "short", C.red)}>↘ Short</button>
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
              {[["usd", "$"], ["lots", "Lots"]].map(([k, l]) => <button key={k} onClick={() => setRiskMode(k)} style={{ minWidth: 48, borderRadius: 8, border: "none", background: riskMode === k ? C.purpleDim : "transparent", color: riskMode === k ? C.purpleBright : C.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{l}</button>)}
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
                  <select value={row.tf} onChange={(e) => upd((r) => ({ ...r, tf: e.target.value }))} aria-label="Timeframe" style={{ ...inp, width: 86, flexShrink: 0, fontWeight: 600 }}>
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
                {!rq && (() => { const fav = setupNames.filter((n) => !row.setups.includes(n)).sort((a, b) => (setupFreq[b] || 0) - (setupFreq[a] || 0)); return fav.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{fav.map((h) => <Chip key={h} onClick={() => upd((r) => ({ ...r, setups: [...r.setups, h] }))}>+ {h}</Chip>)}</div>; })()}
                {row.setups.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {row.setups.map((st) => <span key={st} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: C.purpleDim, color: C.purpleBright, fontSize: 12.5, fontWeight: 700 }}>
                    <b style={{ color: C.text }}>{row.tf}</b> {st}
                    <button onClick={() => upd((r) => ({ ...r, setups: r.setups.filter((x) => x !== st) }))} aria-label={"Retirer " + st} style={{ background: "none", border: "none", color: C.purpleBright, cursor: "pointer", padding: 0, fontSize: 13 }}>✕</button></span>)}
                </div>}
              </div>);
          })}
          <button onClick={() => setTfRows((rs) => [...rs, { tf: tfList.find((t) => !rs.some((r) => r.tf === t)) || tfList[0], setups: [] }])} style={{ background: "none", border: "none", color: C.purpleBright, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: "10px 0 0" }}>+ Ajouter des PD arrays</button>
        </div>

        {/* 4 bis. Check-list avant d'entrer (tes règles, modifiables dans Plan) */}
        {checkItems.length > 0 && <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...lab }}><span>Check-list</span><span className="tnum" style={{ color: checkItems.every((x) => checks.includes(x)) ? C.teal : C.textMuted }}>{checkItems.filter((x) => checks.includes(x)).length}/{checkItems.length}</span></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {checkItems.map((x) => { const on = checks.includes(x); return <button key={x} type="button" onClick={() => setChecks((c) => (on ? c.filter((y) => y !== x) : [...c, x]))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 11, border: `1px solid ${on ? C.teal + "66" : C.border}`, background: on ? C.tealDim : "transparent", color: C.text, fontSize: 13.5, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
              <span style={{ width: 19, height: 19, borderRadius: 6, border: `2px solid ${on ? C.teal : C.borderLight || C.border}`, background: on ? C.teal : "transparent", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{on ? "✓" : ""}</span>{x}</button>; })}
          </div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 8 }}>Les stats comparent tes trades avec et sans check-list complète.</div>
        </div>}

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
          <select value={grade} onChange={(e) => setGrade(e.target.value)} style={{ ...inp, fontWeight: 600 }} aria-label="Niveau de confiance">
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
            {rFinal != null && <span className="tnum" style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: rFinal >= 0 ? C.teal : C.red }}>{fmtR(rFinal)}{riskUsd ? " · " + fmtUsdSigned(rFinal * riskUsd) : ""}</span>}
          </div>}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optionnel)" rows={2} style={{ ...inp, marginTop: 12, resize: "vertical", fontFamily: "inherit" }} />
        </div>

        {/* 7. Revue : tout de suite, pendant que c'est frais */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...lab }}><span>Revue {status === "open" ? "(tu peux la faire plus tard)" : ""}</span>{(mist.length > 0 || clean) && <span style={{ color: mist.length ? C.red : C.teal }}>{mist.length ? mist.length + " erreur" + (mist.length > 1 ? "s" : "") : "✓ propre"}</span>}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[["good", "👍 Bon trade", C.teal], ["bad", "👎 Mauvais trade", C.red]].map(([k, l, c]) => <button key={k} type="button" onClick={() => setVerd(verd === k ? null : k)} style={{ ...big(verd === k, c), fontSize: 13.5, padding: "10px 6px" }}>{l}</button>)}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}><span style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary }}>Erreurs</span>
            <button type="button" onClick={() => { setClean(!clean); if (!clean) setMist([]); }} style={{ padding: "6px 11px", borderRadius: 999, border: `1.5px solid ${clean && !mist.length ? C.teal : C.border}`, background: clean && !mist.length ? C.tealDim : "transparent", color: clean && !mist.length ? C.teal : C.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✓ Aucune erreur</button></div>
          <TagPick items={errChoices} value={mist} onToggle={(x) => { setClean(false); setMist((l) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x])); }} col={C.red} max={6} />
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "12px 0 6px" }}>Bien fait</div>
          <TagPick items={posChoices} value={pos} onToggle={(x) => setPos((l) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]))} col={C.teal} max={5} />
        </div>
      </div>

      <div className="tf2-bar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: "10px 16px calc(12px + env(safe-area-inset-bottom, 0px))", background: C.bg, borderTop: `1px solid ${C.border}`, zIndex: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {pair && <div style={{ width: "100%", maxWidth: 620, display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 12, background: C.card, border: `1px solid ${sideErr ? C.red : C.border}` }}>
          <div style={{ minWidth: 92 }}>
            <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700 }}>GAIN POTENTIEL</div>
            <div className="tnum" style={{ fontSize: 18, fontWeight: 700, color: potGain != null ? C.teal : C.textMuted }}>{potGain != null ? fmtUsdSigned(potGain) : "—"}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}><PairLogo pair={pair} size={20} />{pair} <span style={{ color: direction === "long" ? C.teal : C.red, fontSize: 12 }}>{direction === "long" ? "Achat" : "Vente"}</span>{rr != null && <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 700 }}> · 1:{rr.toFixed(2)}</span>}</div>
            <div className="tnum" style={{ fontSize: 12, color: C.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>E {fmtP(en)} · <span style={{ color: C.red }}>SL {fmtP(sl)}</span> · <span style={{ color: C.teal }}>TP {fmtP(tp)}</span></div>
          </div>
        </div>}
        <button onClick={save} disabled={!canSave} style={{ ...btn.primary, width: "100%", maxWidth: 620, justifyContent: "center", padding: "14px", fontSize: 15, opacity: canSave ? 1 : 0.5 }}>{!pair ? "Choisis une paire" : needR ? "Indique le R du gain (ou le TP)" : isEdit ? "Enregistrer les modifications" : "Enregistrer le trade"}</button>
      </div>
    </div>
  );
}




/* ============================================================================
   STATISTIQUES — section extrêmement détaillée
   ============================================================================ */






/* ============================================================================
   ANALYSE — erreurs, ce qui marche, psychologie, exécution, revue de la semaine
   ============================================================================ */

const SESSION_TAGS = ["London Session", "New York Session", "Asia Session", "Hors session"];
const TF_TAGS = ["M1", "M5", "M15", "M30", "H1", "H4", "D", "W"];
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

const rOf = (t) => (t.status === "breakeven" ? 0 : Number(t.resultR) || 0);


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


function BigStat({ label, value, color, sub }) {
  return (
    <div style={{ padding: "12px 12px", borderRadius: 10, background: C.inputBg, border: `1px solid ${C.border}`, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 600 }}>{label}</div>
      <div className="tnum" style={{ fontSize: 18, fontWeight: 600, color: color || C.text, marginTop: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ---------- Mes erreurs ---------- */

/* ---------- Ce qui marche ---------- */

/* ---------- Psychologie ---------- */

/* ---------- Exécution ---------- */

/* ---------- Revue de la semaine ---------- */
function weekStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function weekKeyOf(d) { const s = weekStart(d); return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`; }


/* ---------- Avant d'entrer : ton historique sur le même contexte ---------- */

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
  const [unit, setUnit] = useState("usd");
  const [calM, setCalM] = useState(0);
  const closed = useMemo(() => {
    const days = period === "7j" ? 7 : period === "30j" ? 30 : period === "90j" ? 90 : null;
    const cut = days ? Date.now() - days * 864e5 : 0;
    return trades.filter((t) => t.status !== "open" && t.resultR != null && (!days || new Date(t.entryTime).getTime() >= cut)).sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime));
  }, [trades, period]);
  const agg = (l) => { const n = l.length, w = l.filter((t) => t.resultR > 0).length, r = l.reduce((a, t) => a + (Number(t.resultR) || 0), 0), usd = l.reduce((a, t) => a + (Number(t.resultUsd) || 0), 0);
    const gw = l.filter((t) => t.resultR > 0).reduce((a, t) => a + t.resultR, 0), gl = -l.filter((t) => t.resultR < 0).reduce((a, t) => a + t.resultR, 0);
    return { n, w, l: l.filter((t) => t.resultR < 0).length, wr: n ? w / n * 100 : 0, r, usd, avg: n ? r / n : 0, pf: gl ? gw / gl : null }; };
  const group = (fn) => { const m = {}; closed.forEach((t) => { (fn(t) || []).forEach((k) => { if (k) (m[k] = m[k] || []).push(t); }); }); return Object.entries(m).map(([k, l]) => ({ k, ...agg(l) })).sort((a, b) => b.r - a.r); };
  const T = agg(closed);
  const setupsOfT = (t) => { const ts = t.rules?.tfSetups; if (Array.isArray(ts) && ts.length) return ts.flatMap((r) => (r.setups || []).map((x) => x + (r.tf ? " " + r.tf : ""))); const tf = (t.tags || []).find((g) => ["M1","M3","M5","M15","M30","H1","H4","D1","W1","D","W","MN"].includes(g)); return (t.tags || []).filter((g) => TAG_CATALOG.find((c) => c.name === g && c.category === "setup")).map((x) => x + (tf ? " " + tf : "")); };
  const pairs = group((t) => [t.pair]);
  const setups = group(setupsOfT);
  const sessions = group((t) => [getSession(t.entryTime)]).sort((a, b) => (a.k === "Hors session") - (b.k === "Hors session") || b.r - a.r);
  const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const days = group((t) => [DAYS[new Date(t.entryTime).getDay()]]).sort((a, b) => ((DAYS.indexOf(a.k) + 6) % 7) - ((DAYS.indexOf(b.k) + 6) % 7));
  const hours = (() => { const g = group((t) => [String(new Date(t.entryTime).getHours())]); return Array.from({ length: 24 }, (_, h) => { const x = g.find((y) => y.k === String(h)); return { h: h + "h", r: x ? Math.round(x.r * 100) / 100 : 0, n: x ? x.n : 0, wr: x ? x.wr : 0 }; }); })();
  const sides = group((t) => [t.direction === "long" ? "Long" : "Short"]);
  const mistakes = group((t) => t.mistakes || []).sort((a, b) => a.r - b.r);
  const cats = ASSET_CATS.map(([c]) => c).filter((c) => pairs.some((p) => assetCat(p.k) === c));
  const curCat = cats.includes(cat) ? cat : cats[0];
  const best = (a) => a.filter((x) => x.n >= 2 && x.r > 0)[0], worst = (a) => [...a].filter((x) => x.n >= 2 && x.r < 0).sort((p, q) => p.r - q.r)[0];
  const retenir = [["Meilleure paire", best(pairs)], ["Meilleur setup", best(setups)], ["Meilleure session", best(sessions)], ["Pire paire", worst(pairs)], ["Pire setup", worst(setups)]].filter((x) => x[1]);
  const col = (v) => v > 0 ? C.teal : v < 0 ? C.red : C.textSecondary;
  const useUsd = unit === "usd" && closed.some((t) => t.resultUsd != null);

  // Courbe, drawdown, séries, moyennes
  const X = useMemo(() => {
    let cr = 0, cu = 0, pk = 0, dd = 0, ddU = 0, pkU = 0, s = 0, bw = 0, bl = 0;
    const curve = [{ i: 0, v: 0, d: "" }];
    closed.forEach((t, i) => { cr += Number(t.resultR) || 0; cu += Number(t.resultUsd) || 0; pk = Math.max(pk, cr); pkU = Math.max(pkU, cu); dd = Math.max(dd, pk - cr); ddU = Math.max(ddU, pkU - cu);
      const r = Number(t.resultR) || 0; s = r > 0 ? (s > 0 ? s + 1 : 1) : r < 0 ? (s < 0 ? s - 1 : -1) : s; bw = Math.max(bw, s); bl = Math.min(bl, s);
      curve.push({ i: i + 1, v: Math.round((useUsd ? cu : cr) * 100) / 100, d: new Date(t.entryTime).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) }); });
    const W = closed.filter((t) => t.resultR > 0), L = closed.filter((t) => t.resultR < 0);
    const avgW = W.length ? W.reduce((a, t) => a + t.resultR, 0) / W.length : 0, avgL = L.length ? L.reduce((a, t) => a + t.resultR, 0) / L.length : 0;
    const avgWu = W.length ? W.reduce((a, t) => a + (Number(t.resultUsd) || 0), 0) / W.length : 0, avgLu = L.length ? L.reduce((a, t) => a + (Number(t.resultUsd) || 0), 0) / L.length : 0;
    const bestT = closed.reduce((m, t) => (!m || t.resultR > m.resultR ? t : m), null), worstT = closed.reduce((m, t) => (!m || t.resultR < m.resultR ? t : m), null);
    const B = [["≤ −1R", (r) => r <= -1], ["−1 à 0", (r) => r > -1 && r < 0], ["0", (r) => r === 0], ["0 à 1R", (r) => r > 0 && r < 1], ["1 à 2R", (r) => r >= 1 && r < 2], ["2 à 3R", (r) => r >= 2 && r < 3], ["≥ 3R", (r) => r >= 3]];
    const dist = B.map(([k, f]) => ({ k, n: closed.filter((t) => f(Number(t.resultR) || 0)).length, neg: k.startsWith("≤") || k.startsWith("−") }));
    const peak = Math.max(0, ...curve.map((c) => c.v));
    return { peak, curve, dd, ddU, bw, bl: -bl, avgW, avgL, avgWu, avgLu, bestT, worstT, dist };
  }, [closed, useUsd]);

  // Calendrier du mois
  const cal = useMemo(() => {
    const now = new Date(); const m = new Date(now.getFullYear(), now.getMonth() + calM, 1); const per = {};
    trades.filter((t) => t.status !== "open" && t.resultR != null).forEach((t) => { const d = new Date(t.entryTime); if (d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth()) { const k = d.getDate(); const o = (per[k] = per[k] || { r: 0, u: 0, n: 0 }); o.r += Number(t.resultR) || 0; o.u += Number(t.resultUsd) || 0; o.n++; } });
    const first = (m.getDay() + 6) % 7, nd = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    const cells = [...Array(first).fill(null), ...Array.from({ length: nd }, (_, i) => i + 1)];
    const tot = Object.values(per).reduce((a, o) => ({ r: a.r + o.r, u: a.u + o.u, n: a.n + o.n, g: a.g + (o.r > 0 ? 1 : 0), d: a.d + 1 }), { r: 0, u: 0, n: 0, g: 0, d: 0 });
    return { m, per, cells, tot, mx: Math.max(0.01, ...Object.values(per).map((o) => Math.abs(useUsd ? o.u : o.r))) };
  }, [trades, calM, useUsd]);

  const fmtV = (v) => (useUsd ? fmtUsdSigned(v) : fmtR(v));
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, marginBottom: 14, overflow: "hidden" };
  const H = ({ children, right, sub }) => <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "15px 16px 10px" }}><div><div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: -0.2 }}>{children}</div>{sub && <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{sub}</div>}</div>{right}</div>;
  const Seg = ({ v, set, opts }) => <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 9, background: C.inputBg || C.bg, border: `1px solid ${C.border}` }}>{opts.map(([k, l]) => <button key={k} onClick={() => set(k)} style={{ height: 26, padding: "0 10px", borderRadius: 7, border: "none", background: v === k ? C.purpleDim : "transparent", color: v === k ? C.purpleBright : C.textMuted, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>)}</div>;
  const Table = ({ rows, logo, empty }) => { const mx = Math.max(0.01, ...rows.map((r) => Math.abs(r.r))); return rows.length === 0 ? <div style={{ padding: "6px 16px 16px", fontSize: 12.5, color: C.textMuted }}>{empty || "Pas encore de trades."}</div> : (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 40px 50px 74px", gap: 8, padding: "6px 16px", fontSize: 10.5, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.4, borderTop: `1px solid ${C.border}` }}><span /><span style={{ textAlign: "right" }}>Trades</span><span style={{ textAlign: "right" }}>Win</span><span style={{ textAlign: "right" }}>Total</span></div>
      {rows.map((r) => (
        <div key={r.k} style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr) 40px 50px 74px", gap: 8, alignItems: "center", padding: "11px 16px", borderTop: `1px solid ${C.border}` }}>
          <div className="grow-x" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(Math.abs(r.r) / mx) * 100}%`, background: `linear-gradient(90deg, ${col(r.r)}14, transparent)`, pointerEvents: "none" }} />
          <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, position: "relative" }}>{logo && <PairLogo pair={r.k} size={22} />}<span style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.k}</span></span>
          <span className="tnum" style={{ position: "relative", textAlign: "right", fontSize: 13, color: C.textSecondary }}>{r.n}</span>
          <span className="tnum" style={{ position: "relative", textAlign: "right", fontSize: 13, color: r.wr >= 50 ? C.teal : C.textSecondary }}>{r.wr.toFixed(0)}%</span>
          <span className="tnum" style={{ position: "relative", textAlign: "right", fontSize: 14, fontWeight: 700, color: col(r.r) }}>{fmtR(r.r)}</span>
        </div>))}
    </div>); };
  const Bars = ({ rows, flag }) => { const mx = Math.max(0.01, ...rows.map((r) => Math.abs(r.r))); return (
    <div style={{ padding: "2px 16px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
      {rows.map((r) => <div key={r.k}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, marginBottom: 5 }}><span style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 7 }}>{flag && r.k !== "Hors session" && <SessionFlag name={r.k} size={16} />}<span style={{ color: r.k === "Hors session" ? C.textMuted : undefined }}>{r.k}</span>{r.k === "Hors session" && <span style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 500, border: `1px solid ${C.border}`, borderRadius: 5, padding: "1px 5px" }}>hors killzones</span>} <span style={{ color: C.textMuted, fontWeight: 500 }}>· {r.n} trade{r.n > 1 ? "s" : ""} · {r.wr.toFixed(0)}%</span></span><span className="tnum" style={{ fontWeight: 700, color: col(r.r) }}>{fmtR(r.r)}</span></div>
        <div style={{ height: 7, borderRadius: 4, background: C.inputBg || C.bg, overflow: "hidden" }}><div className="grow-x" style={{ width: Math.abs(r.r) / mx * 100 + "%", height: "100%", background: r.k === "Hors session" ? C.textMuted : `linear-gradient(90deg, ${col(r.r)}AA, ${col(r.r)})`, borderRadius: 4 }} /></div>
      </div>)}
      {rows.length === 0 && <div style={{ fontSize: 12.5, color: C.textMuted }}>Pas encore de trades.</div>}
    </div>); };
  const Kpi = ({ l, v, sub, c }) => (
    <div style={{ padding: "10px 11px", borderRadius: 13, background: C.card, border: `1px solid ${C.border}`, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l}</div>
      <div className="tnum" style={{ fontSize: 15.5, fontWeight: 700, marginTop: 4, color: c || C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
      {sub && <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
    </div>);
  const lineCol = (X.curve[X.curve.length - 1]?.v || 0) >= 0 ? C.teal : C.red;
  const ring = (p, c) => { const R = 26, P = 2 * Math.PI * R; return <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r={R} fill="none" stroke={C.redDim} strokeWidth="7" /><circle cx="32" cy="32" r={R} fill="none" stroke={c} strokeWidth="7" strokeLinecap="round" strokeDasharray={P} strokeDashoffset={P * (1 - p / 100)} transform="rotate(-90 32 32)" /></svg>; };
  const long = sides.find((s) => s.k === "Long"), short = sides.find((s) => s.k === "Short");

  return (
    <div className="fade-in" style={{ maxWidth: 860, margin: "0 auto" }}>
      <PageHeader title="Statistiques" action={<Seg v={unit} set={setUnit} opts={[["usd", "$"], ["r", "R"]]} />} />

      <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, marginBottom: 14 }}>
        {["tout", "7j", "30j", "90j"].map((p) => <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, height: 34, borderRadius: 9, border: "none", background: period === p ? C.purpleDim : "transparent", color: period === p ? C.purpleBright : C.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{p === "tout" ? "Tout" : p}</button>)}
      </div>

      {T.n === 0 && <div style={{ ...card, padding: "28px 20px", textAlign: "center", background: `radial-gradient(100% 100% at 50% 0%, ${C.purpleDim}, transparent 70%), ${C.card}` }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: C.purpleDim, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><BarChart3 size={24} color={C.purpleBright} /></div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{period === "tout" ? "Tes stats arrivent ici" : "Aucun trade sur cette période"}</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>{period === "tout" ? "Clôture ton premier trade : courbe, winrate, calendrier et analyses se remplissent tout seuls." : "Choisis « Tout » ou une période plus longue."}</div>
      </div>}
      {/* Héros : résultat + courbe */}
      <div style={{ ...card, background: `radial-gradient(120% 90% at 0% 0%, ${C.purpleDim}, transparent 60%), ${C.card}` }}>
        <div style={{ padding: "18px 18px 4px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.textMuted }}>Résultat net</div>
            <div className="tnum" style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1, color: col(useUsd ? T.usd : T.r), lineHeight: 1.05, marginTop: 4 }}>{useUsd ? fmtUsdSigned(T.usd) : fmtR(T.r)}</div>
            <div className="tnum" style={{ fontSize: 13.5, color: C.textSecondary, fontWeight: 600, marginTop: 2 }}>{useUsd ? fmtR(T.r) : fmtUsdSigned(T.usd)} · {T.n} trade{T.n > 1 ? "s" : ""}</div>
          </div>
          <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
            {ring(T.wr, C.teal)}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><span className="tnum" style={{ fontSize: 14, fontWeight: 700 }}>{T.n ? T.wr.toFixed(0) : "—"}%</span><span style={{ fontSize: 9, color: C.textMuted }}>winrate</span></div>
          </div>
        </div>
        <div style={{ height: 150, marginTop: 4 }}>
          {X.curve.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={X.curve} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <defs><linearGradient id="eqG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lineCol} stopOpacity={0.35} /><stop offset="100%" stopColor={lineCol} stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="i" hide /><YAxis hide domain={["dataMin", "dataMax"]} />
                <Tooltip cursor={{ stroke: C.border }} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }} labelFormatter={(i) => X.curve[i]?.d || ""} formatter={(v) => [fmtV(v), "Cumul"]} />
                <ReferenceLine y={0} stroke={C.textMuted} strokeDasharray="3 4" strokeOpacity={0.6} />
                {X.peak > 0 && <ReferenceLine y={X.peak} stroke={C.teal} strokeDasharray="2 5" strokeOpacity={0.5} label={{ value: "Plus haut " + fmtV(X.peak), position: "insideTopLeft", fill: C.textMuted, fontSize: 10 }} />}
                <Area type="monotone" dataKey="v" stroke={lineCol} strokeWidth={2.2} fill="url(#eqG)" dot={false} animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, color: C.textMuted }}>La courbe apparaît après ton premier trade clôturé.</div>}
        </div>
        {X.curve.length > 1 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 16px 12px", fontSize: 10.5, color: C.textMuted }}><span>{X.curve[1].d}</span><span>{X.curve[X.curve.length - 1].d}</span></div>}
      </div>

      {/* KPI */}
      {T.n > 0 && <><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        {[["Profit factor", T.pf != null ? T.pf.toFixed(2) : "—", T.pf == null ? "pas encore de perte" : T.pf >= 1.5 ? "solide" : T.pf >= 1 ? "positif mais fragile" : "négatif", T.pf == null ? C.teal : T.pf >= 1.5 ? C.teal : T.pf >= 1 ? C.amber : C.red],
          ["Espérance / trade", fmtR(T.avg), fmtUsdSigned(T.usd / T.n), col(T.avg)]].map(([l, v, sub, c]) => (
          <div key={l} style={{ padding: "14px 15px", borderRadius: 16, background: `linear-gradient(160deg, ${c}1F, transparent 70%), ${C.card}`, border: `1px solid ${c}40` }}>
            <div style={{ fontSize: 11.5, color: C.textMuted, fontWeight: 600 }}>{l}</div>
            <div className="tnum" style={{ fontSize: 28, fontWeight: 700, color: c, marginTop: 4, letterSpacing: -0.6 }}>{v}</div>
            <div style={{ fontSize: 11.5, color: C.textSecondary, marginTop: 1 }}>{sub}</div>
          </div>))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginBottom: 14 }}>
        <Kpi l="Gain moyen" v={X.avgW ? fmtR(X.avgW) : "—"} sub={X.avgWu ? fmtUsdSigned(X.avgWu) : `${T.w} gagnants`} c={C.teal} />
        <Kpi l="Perte moyenne" v={X.avgL ? fmtR(X.avgL) : "—"} sub={X.avgLu ? fmtUsdSigned(X.avgLu) : `${T.l} perdants`} c={C.red} />
        <Kpi l="Drawdown max" v={useUsd ? (X.ddU ? "−" + fmtUsd(X.ddU) : "—") : (X.dd ? "−" + X.dd.toFixed(2) + "R" : "—")} sub="du plus haut au plus bas" c={X.dd ? C.red : null} />
        <Kpi l="Séries" v={<><span style={{ color: C.teal }}>{X.bw}W</span> <span style={{ color: C.textMuted }}>/</span> <span style={{ color: C.red }}>{X.bl}L</span></>} sub="plus longues d'affilée" />
        <Kpi l="Meilleur trade" v={X.bestT ? fmtR(X.bestT.resultR) : "—"} sub={X.bestT ? `${X.bestT.pair} · ${new Date(X.bestT.entryTime).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}` : ""} c={C.teal} />
        <Kpi l="Pire trade" v={X.worstT ? fmtR(X.worstT.resultR) : "—"} sub={X.worstT ? `${X.worstT.pair} · ${new Date(X.worstT.entryTime).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}` : ""} c={C.red} />
      </div></>}

      {/* Long / Short */}
      {(long || short) && <div style={{ ...card, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
          <span><span style={{ color: C.teal }}>▲ Long</span><br /><span className="tnum" style={{ fontWeight: 500, color: C.textSecondary }}>{long?.n || 0} · {long ? long.wr.toFixed(0) : 0}% · <b style={{ color: col(long?.r || 0) }}>{fmtR(long?.r || 0)}</b></span></span>
          <span style={{ textAlign: "right" }}><span style={{ color: C.red }}>Short ▼</span><br /><span className="tnum" style={{ fontWeight: 500, color: C.textSecondary }}><b style={{ color: col(short?.r || 0) }}>{fmtR(short?.r || 0)}</b> · {short ? short.wr.toFixed(0) : 0}% · {short?.n || 0}</span></span>
        </div>
        <div style={{ display: "flex", height: 9, borderRadius: 5, overflow: "hidden", background: C.inputBg }}>
          <div style={{ width: `${((long?.n || 0) / Math.max(1, T.n)) * 100}%`, background: C.teal }} /><div style={{ flex: 1, background: C.red, opacity: 0.85 }} />
        </div>
      </div>}

      {/* Calendrier */}
      <div style={card}>
        <H sub={cal.tot.d ? `${cal.tot.n} trades · ${cal.tot.g}/${cal.tot.d} jours verts · ${fmtV(useUsd ? cal.tot.u : cal.tot.r)}` : "Aucun trade ce mois-ci"} right={<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => setCalM((v) => v - 1)} style={{ ...btn.icon, padding: 5 }} aria-label="Mois précédent"><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 92, textAlign: "center", textTransform: "capitalize" }}>{cal.m.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
          <button onClick={() => setCalM((v) => Math.min(0, v + 1))} disabled={calM >= 0} style={{ ...btn.icon, padding: 5, opacity: calM >= 0 ? 0.4 : 1 }} aria-label="Mois suivant"><ChevronRight size={14} /></button>
        </div>}>Calendrier</H>
        <div style={{ padding: "0 12px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>{["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: C.textMuted }}>{d}</div>)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {cal.cells.map((d, i) => { const o = d && cal.per[d]; const v = o ? (useUsd ? o.u : o.r) : 0; const a = o ? 0.18 + 0.6 * Math.min(1, Math.abs(v) / cal.mx) : 0; const cc = v >= 0 ? C.teal : C.red;
              return <div key={i} style={{ height: o ? 42 : 30, alignSelf: "center", borderRadius: 9, background: o ? `color-mix(in srgb, ${cc} ${Math.round(a * 100)}%, transparent)` : d ? (C.inputBg || C.bg) : "transparent", border: d ? `1px solid ${o ? cc + "55" : C.border}` : "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
                {d && <span style={{ fontSize: o ? 10 : 10.5, fontWeight: 600, color: o ? C.text : C.textMuted, opacity: o ? 0.8 : 0.6 }}>{d}</span>}
                {o && <span className="tnum" style={{ fontSize: 9.5, fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>{useUsd ? (v >= 0 ? "+" : "−") + Math.abs(Math.round(v)) : (v > 0 ? "+" : "") + v.toFixed(1)}</span>}
              </div>; })}
          </div>
        </div>
      </div>

      {/* Distribution des R */}
      {T.n > 0 && <div style={card}>
        <H>Répartition des résultats</H>
        <div style={{ height: 130, padding: "0 8px 10px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={X.dist} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="k" tick={{ fontSize: 10, fill: C.textMuted }} axisLine={false} tickLine={false} interval={0} />
              <Tooltip cursor={{ fill: C.inputBg }} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }} formatter={(v) => [v + " trades", ""]} />
              <Bar dataKey="n" radius={[6, 6, 0, 0]}>{X.dist.map((d) => <Cell key={d.k} fill={d.k === "0" ? C.textMuted : d.neg ? C.red : C.teal} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}

      {retenir.length > 0 && <div style={card}>
        <H>À retenir</H>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, padding: "0 14px 14px" }}>
          {retenir.map(([l, x]) => <div key={l} style={{ padding: "11px 12px", borderRadius: 12, background: x.r > 0 ? C.tealDim : C.redDim, border: `1px solid ${col(x.r)}33` }}>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{l}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}><span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.k}</span><span className="tnum" style={{ fontSize: 14, fontWeight: 700, color: col(x.r) }}>{fmtR(x.r)}</span></div>
          </div>)}
        </div>
      </div>}

      <div style={card}>
        <H>Par actif</H>
        {cats.length > 1 && <div style={{ display: "flex", gap: 6, padding: "0 16px 10px", flexWrap: "wrap" }}>
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${curCat === c ? C.purple : C.border}`, background: curCat === c ? C.purpleDim : "transparent", color: curCat === c ? C.purpleBright : C.textMuted, fontFamily: "inherit" }}>{c}</button>)}
        </div>}
        <Table rows={pairs.filter((p) => assetCat(p.k) === curCat)} logo />
      </div>

      <div style={card}><H>Par setup</H><Table rows={setups} empty="Ajoute tes setups dans le formulaire pour les voir ici." /></div>
      {T.n > 0 && <div className="grid-2" style={{ gap: 14 }}>
        <div style={card}><H>Par session</H><Bars rows={sessions} flag /></div>
        <div style={card}><H>Par jour</H>{(() => { const W = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((k) => days.find((d) => d.k === k) || { k, r: 0, n: 0, wr: 0 }); const mx = Math.max(0.01, ...W.map((d) => Math.abs(d.r))); return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, padding: "4px 14px 14px", alignItems: "end" }}>
            {W.map((d) => <div key={d.k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
              <span className="tnum" style={{ fontSize: 10, fontWeight: 700, color: d.n ? col(d.r) : C.textMuted, whiteSpace: "nowrap" }}>{d.n ? (d.r > 0 ? "+" : "") + d.r.toFixed(1) : "—"}</span>
              <div style={{ width: "100%", height: 90, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: C.border }} />
                <div style={{ height: 45, display: "flex", alignItems: "flex-end" }}>{d.r > 0 && <div className="grow-y" style={{ width: "100%", height: `${(d.r / mx) * 100}%`, borderRadius: "6px 6px 2px 2px", background: `linear-gradient(180deg, ${C.teal}, ${C.teal}88)` }} />}</div>
                <div style={{ height: 45, display: "flex", alignItems: "flex-start" }}>{d.r < 0 && <div className="grow-y" style={{ width: "100%", height: `${(-d.r / mx) * 100}%`, borderRadius: "2px 2px 6px 6px", background: `linear-gradient(0deg, ${C.red}, ${C.red}88)`, transformOrigin: "center top" }} />}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary }}>{d.k.slice(0, 3)}</span>
              <span style={{ fontSize: 9.5, color: C.textMuted }}>{d.n ? d.wr.toFixed(0) + "%" : ""}</span>
            </div>)}
          </div>); })()}</div>
      </div>}
      {hours.some((h) => h.n) && <div style={card}><H>Par heure</H>
        <div style={{ height: 140, padding: "0 8px 10px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hours} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="h" tick={{ fontSize: 9.5, fill: C.textMuted }} axisLine={false} tickLine={false} interval={2} />
              <ReferenceLine y={0} stroke={C.border} />
              <Tooltip cursor={{ fill: C.inputBg }} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }} formatter={(v, _, p) => [`${fmtR(v)} · ${p.payload.n} trades · ${p.payload.wr.toFixed(0)}%`, p.payload.h]} labelFormatter={() => ""} />
              <Bar dataKey="r" radius={[4, 4, 4, 4]}>{hours.map((d) => <Cell key={d.h} fill={d.r > 0 ? C.teal : d.r < 0 ? C.red : C.border} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>}
      <HourHeatmap trades={closed} useUsd={useUsd} />
      {mistakes.length > 0 && <div style={card}><H>Erreurs fréquentes</H><Table rows={mistakes} /></div>}
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
                  background: isSelected ? C.purpleDim : data ? (val >= 0 ? C.tealDim : C.redDim) : C.cardHover,
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
                <div className="tnum" style={{ fontSize: 17, fontWeight: 600, color: selectedData.pnl >= 0 ? C.teal : C.red }}>{fmtUsdSigned(selectedData.pnl)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted }}>Trades</div>
                <div className="tnum" style={{ fontSize: 17, fontWeight: 600 }}>{selectedData.count}</div>
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
                <div className="tnum" style={{ fontSize: 14, fontWeight: 600, color: data.avgR >= 0 ? C.teal : C.red }}>{data.avgR >= 0 ? "+" : ""}{data.avgR.toFixed(2)}R avg</div>
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

function PlanDeTrading({ trades = [], balance }) {
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
    <div className="fade-in" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: C.text, margin: 0 }}>Plan de trading</h1>
      </div>
      <PlanRules trades={trades} balance={balance} />
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, margin: "4px 0 8px" }}>Mes notes de plan</div>
      <textarea
        value={text}
        onChange={handleChange}
        placeholder={"Écris ton plan de trading ici...\n\nExemple :\n— Ne trader que London et NY\n— Max 2 trades par jour\n— Stop loss obligatoire\n— Attendre la confirmation MSS\n..."}
        style={{
          minHeight: 260, width: "100%",
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
        const pairColor = pair === "DXY" ? C.teal : pair.includes("EUR") ? "#4A9EFF" : pair.includes("GBP") ? C.teal : pair.includes("JPY") ? "#F59E0B" : pair.includes("AUD") ? "#10B981" : pair.includes("CAD") ? "#EF4444" : pair.includes("CHF") ? "#8B5CF6" : pair.includes("NZD") ? "#06B6D4" : pair.startsWith("XAU") ? "#F59E0B" : C.purpleBright;
        const pairEmoji = pair === "DXY" ? <BarChart3 size={17} color={pairColor} /> : pair.startsWith("XAU") ? <Coins size={17} color={pairColor} /> : <span style={{ fontSize: 11.5, fontWeight: 600, color: pairColor, letterSpacing: 0.3 }}>{pair.slice(0, 2)}</span>;
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
                <div style={{ fontSize: 16, fontWeight: 600, color: pairColor, letterSpacing: -0.5 }}>{pair}</div>
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
                <div className="tnum" style={{ fontSize: 16, fontWeight: 600, color: isToday ? C.red : isSoon ? C.amber : C.text, lineHeight: 1 }}>
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

// Drapeau rond par session : London = Europe, New York = USA, Asia = Japon
function SessionFlag({ name, size = 16 }) {
  const n = String(name || "").toLowerCase();
  const cur = n.includes("london") || n.includes("londres") ? "EUR" : n.includes("new york") || n.includes("ny") ? "USD" : n.includes("asia") || n.includes("tokyo") ? "JPY" : null;
  const id = (React.useId ? React.useId() : String(Math.random())).replace(/[:.]/g, "");
  if (!cur) return null;
  return (<svg width={size} height={size} viewBox="0 0 30 30" style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}>
    <defs><clipPath id={"sf" + id}><circle cx="15" cy="15" r="15" /></clipPath></defs>
    <g clipPath={`url(#sf${id})`}><FlagFill cur={cur} /></g>
    <circle cx="15" cy="15" r="14.5" fill="none" stroke="rgba(255,255,255,0.15)" />
  </svg>);
}
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
  XAUUSD: ["#D4A017", "bars"], XAGUSD: ["#A9AEB8", "bars"], USOIL: ["#16181d", "drop"], UKOIL: ["#16181d", "drop"],
  BTCUSD: ["#F7931A", "btc"], ETHUSD: ["#454A75", "eth"],
  NAS100: ["#1497D4", "100"], SPX500: ["#B3132B", "500"], US30: ["#27A5E0", "30"], FRA40: ["#2E7D6B", "40"], GER40: ["#3367D6", "40"], UK100: ["#1F3A93", "100"],
  DXY: ["#16A34A", "$"],
};
function AssetBadgeSvg({ bd, size }) {
  const [bg, k] = bd;
  let inner;
  if (k === "bars") inner = <g fill="#fff"><path d="M6.5 22h7.6l1.6-4.6H8.1z" /><path d="M15.9 22h7.6l-1.6-4.6h-7.6z" /><path d="M10.8 16.4h8.4l-1.6-4.6h-5.2z" /></g>;
  else if (k === "drop") inner = <path d="M15 7.5c-2.9 4-5 6.9-5 9.6a5 5 0 0 0 10 0c0-2.7-2.1-5.6-5-9.6z" fill="#fff" />;
  else if (k === "btc") inner = <text x="15" y="20.5" textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">₿</text>;
  else if (k === "eth") inner = <g fill="#fff"><path d="M15 6l-5.2 9L15 18l5.2-3z" opacity=".95" /><path d="M15 19.2l-5.2-3.1L15 24l5.2-7.9z" opacity=".75" /></g>;
  else inner = <text x="15" y={k.length > 2 ? 18.6 : 19.6} textAnchor="middle" fontSize={k.length > 2 ? 9.5 : k.length > 1 ? 12 : 15} fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">{k}</text>;
  return <svg width={size} height={size} viewBox="0 0 30 30" style={{ flexShrink: 0, display: "block" }}><circle cx="15" cy="15" r="15" fill={bg} />{inner}</svg>;
}
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
  if (bd) return <AssetBadgeSvg bd={bd} size={size} />;
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
  ["Forex", (p) => /^[A-Z]{6}$/.test(p) && !["XAUUSD", "XAGUSD", "BTCUSD", "ETHUSD", "UKOIL"].includes(p)],
  ["Indices", (p) => ["NAS100", "SPX500", "US30", "GER40", "FRA40", "UK100", "DXY"].includes(p)],
  ["Matières premières", (p) => ["XAUUSD", "XAGUSD", "USOIL", "UKOIL"].includes(p)],
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
    : (ASSET_BADGE[p] || (p.length === 6 && FLAG_CURS.includes(p.slice(0, 3)) && FLAG_CURS.includes(p.slice(3)))) ? <AutoPairLogo pair={p} size={size} /> : <span style={{ width: size, height: size, borderRadius: size * 0.26, background: C.inputBg || C.bg, border: `1px solid ${C.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.3, fontWeight: 600, color: C.textMuted, flexShrink: 0 }}>{p.slice(0, 3)}</span>;
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
        <div style={{ fontSize: 22, fontWeight: 700 }}>{open}</div>
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



// ── Réglages : listes avec recherche (paires, PD arrays, timeframes) ──
async function readClipboardImage() {
  const items = await navigator.clipboard.read();
  for (const it of items) { const t = it.types.find((x) => x.startsWith("image/")); if (t) { const b = await it.getType(t); return new File([b], "image.png", { type: t }); } }
  return null;
}
function ToggleRow({ on, onClick, left, right, onDelete }) {
  return (<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderTop: `1px solid ${C.border}` }}>
    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>{left}</div>
    {right}
    {onDelete && <button onClick={onDelete} title="Supprimer" style={{ ...btn.ghost, padding: "5px 7px", color: C.red }}><Trash2 size={13} /></button>}
    <button onClick={onClick} aria-label={on ? "Désactiver" : "Activer"} style={{ width: 38, height: 22, borderRadius: 11, border: "none", background: on ? C.purple : C.border, position: "relative", cursor: "pointer", flexShrink: 0, padding: 0 }}>
      <span style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: 8, background: "#fff", transition: "left .15s" }} /></button>
  </div>);
}
function SearchBox({ value, onChange, placeholder }) {
  return (<div style={{ position: "relative" }}><Search size={14} color={C.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, paddingLeft: 34 }} /></div>);
}
function PairsSettings({ settings, addPair, removePair }) {
  const [q, setQ] = useState(""); const [cat, setCat] = useState("");
  const all = [...new Set([...ALL_PAIRS, ...(settings.pairs || [])])];
  const qn = q.trim().toUpperCase();
  const list = (qn || cat) ? all.filter((p) => (!cat || assetCat(p) === cat) && (!qn || p.includes(qn) || (PAIR_LABEL[p] || "").toUpperCase().includes(qn) || Object.entries(PAIR_ALIASES).some(([k, v]) => v === p && k.startsWith(qn)))) : [];
  const active = settings.pairs || [];
  return (<div>
    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Actives ({active.length}) — elles apparaissent en premier dans le formulaire.</div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      {active.map((p) => <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 6px 4px 5px", borderRadius: 999, border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700 }}><PairLogo pair={p} size={18} />{p}<button onClick={() => removePair(p)} aria-label={"Retirer " + p} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 0, display: "flex" }}><X size={12} /></button></span>)}
    </div>
    <SearchBox value={q} onChange={setQ} placeholder="Rechercher un actif (EUR, gold, NQ, BTC…)" />
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
      {ASSET_CATS.map(([c]) => <button key={c} onClick={() => setCat(cat === c ? "" : c)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${cat === c ? C.purple : C.border}`, background: cat === c ? C.purpleDim : "transparent", color: cat === c ? C.purpleBright : C.textSecondary }}>{c}</button>)}
    </div>
    {list.length > 0 && <div style={{ marginTop: 10, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", borderTop: "none" }}>
      {list.map((p) => { const on = active.includes(p); return <ToggleRow key={p} on={on} onClick={() => on ? removePair(p) : addPair(p)} left={<><PairLogo pair={p} size={24} /><span style={{ fontSize: 13.5, fontWeight: 700 }}>{PAIR_LABEL[p] ? PAIR_LABEL[p] + " · " + p : p}</span></>} right={<span style={{ fontSize: 11, color: C.textMuted }}>{assetCat(p)}</span>} />; })}
    </div>}
    {qn && !all.includes(qn) && list.length === 0 && /^[A-Z0-9]{3,10}$/.test(qn) && <button onClick={() => { addPair(qn); setQ(""); }} style={{ ...btn.ghost, marginTop: 10 }}><Plus size={13} /> Ajouter « {qn} »</button>}
  </div>);
}
function TimeframesSettings({ settings, update }) {
  const cur = settings.timeframes && settings.timeframes.length ? [...new Set(settings.timeframes.map(tfFix))] : DEFAULT_TFS;
  const [v, setV] = useState("");
  const add = () => { const t = tfFix(v.trim().toUpperCase()); if (!t || cur.includes(t)) return; update({ timeframes: [...cur, t] }); setV(""); };
  return (<div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
      {cur.map((tf) => <span key={tf} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 12px", borderRadius: 9, border: `1px solid ${C.purple}`, background: C.purpleDim, color: C.purpleBright, fontSize: 13, fontWeight: 600 }}>{tf}
        <button onClick={() => update({ timeframes: cur.filter((x) => x !== tf) })} aria-label={"Supprimer " + tf} style={{ background: "none", border: "none", color: C.purpleBright, cursor: "pointer", padding: 0, display: "flex" }}><X size={12} /></button></span>)}
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Ex : M5, H2, MN…" style={{ ...inputStyle, flex: 1 }} />
      <button onClick={add} style={btn.primary}><Plus size={14} /> Ajouter</button>
    </div>
    {settings.timeframes && settings.timeframes.length > 0 && <button onClick={() => update({ timeframes: DEFAULT_TFS })} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", marginTop: 8, padding: 0 }}>Remettre par défaut (M15, H1, H4, D, W)</button>}
  </div>);
}
function PdArraysSettings({ settings, update }) {
  const [q, setQ] = useState(""); const [showAll, setShowAll] = useState(false);
  const hidden = settings.hiddenTags || [], custom = settings.customTags || [];
  const all = [...TAG_CATALOG.filter((t) => t.category === "setup").map((t) => ({ name: t.name, custom: false })), ...custom.map((n) => ({ name: n, custom: true }))];
  const qn = q.trim().toLowerCase();
  const list = qn ? all.filter((t) => t.name.toLowerCase().includes(qn)) : showAll ? all : [];
  const activeN = all.filter((t) => !hidden.includes(t.name)).length;
  const exists = all.some((t) => t.name.toLowerCase() === qn);
  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: C.textMuted }}>{activeN} actif(s) sur {all.length}</span>
      <button onClick={() => setShowAll((v) => !v)} style={{ background: "none", border: "none", color: C.purpleBright, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{showAll ? "Masquer la liste" : "Tout voir"}</button>
    </div>
    <SearchBox value={q} onChange={setQ} placeholder="Rechercher ou ajouter un PD array (SIBI, OB+…)" />
    {list.length > 0 && <div style={{ marginTop: 10, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", borderTop: "none" }}>
      {list.map((t) => { const on = !hidden.includes(t.name); return <ToggleRow key={t.name} on={on}
        onClick={() => update({ hiddenTags: on ? [...hidden, t.name] : hidden.filter((x) => x !== t.name) })}
        onDelete={t.custom ? () => update({ customTags: custom.filter((x) => x !== t.name), hiddenTags: hidden.filter((x) => x !== t.name) }) : null}
        left={<><span style={{ fontSize: 13.5, fontWeight: 700, opacity: on ? 1 : 0.5 }}>{t.name}</span>{t.custom && <span style={{ fontSize: 10.5, color: C.textMuted }}>perso</span>}</>} />; })}
    </div>}
    {qn && !exists && list.length === 0 && <button onClick={() => { update({ customTags: [...custom, q.trim()] }); setQ(""); }} style={{ ...btn.ghost, marginTop: 10 }}><Plus size={13} /> Ajouter « {q.trim()} »</button>}
  </div>);
}
function AccountLogo({ acc, size = 30 }) {
  const typeColors = { real: C.teal, demo: C.purple, challenge: C.amber };
  if (acc?.logo) return <img src={acc.logo} alt="" style={{ width: size, height: size, borderRadius: size * 0.28, objectFit: "contain", flexShrink: 0, background: "rgba(255,255,255,0.04)" }} />;
  return <span style={{ width: size, height: size, borderRadius: size * 0.28, background: `${typeColors[acc?.type] || C.teal}22`, color: typeColors[acc?.type] || C.teal, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>{(acc?.name || "?").slice(0, 1).toUpperCase()}</span>;
}

/* ============================================================================
   DISCIPLINE : plan vérifié · coach (motifs) · santé du compte · challenge · import MT4/MT5
   ============================================================================ */
const RULES_KEY = "trading_rules";
const SESSIONS_ALL = ["Asia Session", "London Session", "New York Session", "Hors session"];
const SESSION_SHORT = { "Asia Session": "Asie", "London Session": "Londres", "New York Session": "New York", "Hors session": "Hors session" };
const DEFAULT_RULES = { maxRiskPct: 1, maxTradesDay: 2, maxLossDayPct: 2, maxLossWeekPct: 4, maxLossMonthPct: 8, maxConsecLoss: 2, sessions: ["London Session", "New York Session"], slRequired: true };
function loadRules() { try { return { ...DEFAULT_RULES, ...(JSON.parse(localStorage.getItem(RULES_KEY) || "null") || {}) }; } catch { return { ...DEFAULT_RULES }; } }
function saveRules(r) { try { localStorage.setItem(RULES_KEY, JSON.stringify(r)); } catch {} saveSettingsPatch({ trading_rules: r }).catch(() => {}); }
const dayKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const byTime = (arr) => [...arr].sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime));
const usdOf = (t) => Number(t.resultUsd) || 0;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

/* Chaque trade clôturé → liste des règles du plan cassées */
function planCheck(trades, rules, balance) {
  const B = Number(balance) || 10000; const out = []; const day = {}; let streak = 0;
  byTime(closedOf(trades)).forEach((t) => {
    const k = dayKey(t.entryTime); const d = (day[k] = day[k] || { n: 0, pnl: 0, streak: 0 });
    const v = [];
    if (rules.maxRiskPct && Number(t.riskUsd) > (B * rules.maxRiskPct) / 100 * 1.05) v.push("Risque > " + rules.maxRiskPct + " %");
    if (rules.maxTradesDay && d.n >= rules.maxTradesDay) v.push("Plus de " + rules.maxTradesDay + " trades / jour");
    if (rules.maxLossDayPct && d.pnl <= -(B * rules.maxLossDayPct) / 100) v.push("Perte max du jour déjà atteinte");
    if (rules.maxConsecLoss && d.streak >= rules.maxConsecLoss) v.push("Après " + rules.maxConsecLoss + " pertes d'affilée");
    if ((rules.sessions || []).length && !rules.sessions.includes(getSession(t.entryTime))) v.push("Hors de tes sessions");
    if (rules.slRequired && !Number(t.stopLoss)) v.push("Sans stop loss");
    out.push({ t, v });
    d.n += 1; d.pnl += usdOf(t); d.streak = rOf(t) < 0 ? d.streak + 1 : rOf(t) > 0 ? 0 : d.streak; streak = d.streak;
  });
  return out;
}

const chipBtn = (on, col = C.purple) => ({ padding: "7px 11px", borderRadius: 8, border: `1.5px solid ${on ? col : C.border}`, background: on ? `${col}18` : "transparent", color: on ? col : C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });
const moneyCol = (v) => (v > 0.005 ? C.teal : v < -0.005 ? C.red : C.textSecondary);

function NumRule({ label, value, onChange, suffix, step = 1 }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: C.textSecondary, fontWeight: 600 }}>
      {label}
      <div style={{ position: "relative" }}>
        <input type="number" step={step} min={0} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} style={{ ...inputStyle, width: "100%", paddingRight: 34, boxSizing: "border-box" }} />
        {suffix && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.textMuted }}>{suffix}</span>}
      </div>
    </label>
  );
}

function PlanRules({ trades = [], balance }) {
  const [rules, setRules] = useState(loadRules);
  const [edit, setEdit] = useState(false);
  const set = (p) => { const r = { ...rules, ...p }; setRules(r); saveRules(r); };
  const rep = useMemo(() => {
    const L = planCheck(trades, rules, balance); const ok = L.filter((x) => !x.v.length), ko = L.filter((x) => x.v.length);
    const by = {}; ko.forEach((x) => x.v.forEach((r) => { (by[r] = by[r] || []).push(x.t); }));
    const rows = Object.entries(by).map(([r, arr]) => ({ r, ...aggR(arr) })).sort((a, b) => a.pnl - b.pnl);
    const today = dayKey(new Date().toISOString()); const T = closedOf(trades).filter((t) => dayKey(t.entryTime) === today);
    return { n: L.length, ok: aggR(ok.map((x) => x.t)), ko: aggR(ko.map((x) => x.t)), rows, pct: L.length ? (ok.length / L.length) * 100 : 0, today: { n: T.length, pnl: T.reduce((s, t) => s + usdOf(t), 0) } };
  }, [trades, rules, balance]);
  const B = Number(balance) || 10000; const maxLoss = rules.maxLossDayPct ? (B * rules.maxLossDayPct) / 100 : null;
  const stopNow = (rules.maxTradesDay && rep.today.n >= rules.maxTradesDay) || (maxLoss && rep.today.pnl <= -maxLoss);
  const items = rules.checklist && rules.checklist.length ? rules.checklist : CHECK_DEFAULT;
  const [newItem, setNewItem] = useState("");
  const addItem = () => { const v = newItem.trim(); if (!v || items.includes(v)) return; set({ checklist: [...items, v], checklistOn: true }); setNewItem(""); };
  const cardS = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
      {/* tes règles : utilisées par « Tu peux trader ? », le respect du plan et « Mes erreurs » */}
      <div style={cardS}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <div><div style={{ fontSize: 15, fontWeight: 700 }}>Mes règles</div><div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>Le Dashboard te dit si tu peux encore trader aujourd'hui avec ces limites.</div></div>
          {stopNow ? <span style={{ fontSize: 12.5, fontWeight: 700, color: C.red, background: C.redDim, padding: "5px 10px", borderRadius: 999 }}>Stop pour aujourd'hui</span> : <span style={{ fontSize: 12.5, fontWeight: 700, color: C.teal, background: C.tealDim, padding: "5px 10px", borderRadius: 999 }}>{rep.today.n} trade{rep.today.n > 1 ? "s" : ""} aujourd'hui</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <NumRule label="Risque max / trade" suffix="%" step={0.25} value={rules.maxRiskPct} onChange={(x) => set({ maxRiskPct: x })} />
          <NumRule label="Trades max / jour" value={rules.maxTradesDay} onChange={(x) => set({ maxTradesDay: x })} />
          <NumRule label="Pertes d'affilée = stop" value={rules.maxConsecLoss} onChange={(x) => set({ maxConsecLoss: x })} />
          <NumRule label="Perte max / jour" suffix="%" step={0.5} value={rules.maxLossDayPct} onChange={(x) => set({ maxLossDayPct: x })} />
          <NumRule label="Perte max / semaine" suffix="%" step={0.5} value={rules.maxLossWeekPct} onChange={(x) => set({ maxLossWeekPct: x })} />
          <NumRule label="Perte max / mois" suffix="%" step={0.5} value={rules.maxLossMonthPct} onChange={(x) => set({ maxLossMonthPct: x })} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, margin: "14px 0 6px" }}>Sessions autorisées</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SESSIONS_ALL.filter((x) => x !== "Hors session").map((x) => { const on = (rules.sessions || []).includes(x); return <button key={x} onClick={() => set({ sessions: on ? rules.sessions.filter((y) => y !== x) : [...(rules.sessions || []), x] })} style={chipBtn(on, C.teal)}>{on ? "✓ " : ""}{x.replace(" Session", "")}</button>; })}
          <button onClick={() => set({ slRequired: !rules.slRequired })} style={chipBtn(!!rules.slRequired, C.purple)}>{rules.slRequired ? "✓ " : ""}Stop loss obligatoire</button>
        </div>
      </div>
      {/* check-list : cochée dans chaque nouveau trade */}
      <div style={cardS}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div><div style={{ fontSize: 15, fontWeight: 700 }}>Ma check-list avant d'entrer</div><div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>Elle apparaît dans chaque nouveau trade. « Mes erreurs » peut y ajouter une règle en un clic.</div></div>
          <button onClick={() => set({ checklistOn: rules.checklistOn === false })} style={chipBtn(rules.checklistOn !== false, C.teal)}>{rules.checklistOn === false ? "Désactivée" : "Activée"}</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, opacity: rules.checklistOn === false ? 0.5 : 1 }}>
          {items.map((x, i) => <div key={x} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: C.inputBg, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.textMuted, width: 16 }}>{i + 1}</span><span style={{ flex: 1, fontSize: 13.5 }}>{x}</span>
            <button onClick={() => set({ checklist: items.filter((y) => y !== x) })} aria-label={"Retirer " + x} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 2 }}><X size={14} /></button>
          </div>)}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} placeholder="Ex. J'ai attendu le MSS" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addItem} style={{ ...btn.primary, padding: "8px 14px" }}><Plus size={14} /> Ajouter</button>
        </div>
      </div>


      {rep.n > 0 && (
        <ASection title="Respect du plan">
          <div className="grid-kpi-4">
            <BigStat label="Plan respecté" value={`${rep.pct.toFixed(0)} %`} color={rep.pct >= 80 ? C.teal : rep.pct >= 60 ? C.amber : C.red} sub={`${rep.ok.n} trades sur ${rep.n}`} />
            <BigStat label="Quand tu le respectes" value={fmtUsdSigned(rep.ok.pnl)} color={moneyCol(rep.ok.pnl)} sub={`${fmtRs(rep.ok.avgR)} / trade · ${rep.ok.wr.toFixed(0)} % WR`} />
            <BigStat label="Quand tu le casses" value={fmtUsdSigned(rep.ko.pnl)} color={moneyCol(rep.ko.pnl)} sub={`${fmtRs(rep.ko.avgR)} / trade · ${rep.ko.wr.toFixed(0)} % WR`} />
            <BigStat label="Sans les écarts" value={fmtUsdSigned(rep.ok.pnl)} color={moneyCol(rep.ok.pnl)} sub={`au lieu de ${fmtUsdSigned(rep.ok.pnl + rep.ko.pnl)}`} />
          </div>
          {rep.rows.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {rep.rows.map((x) => (
                <div key={x.r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: C.inputBg, border: `1px solid ${C.border}` }}>
                  <AlertTriangle size={14} color={x.pnl < 0 ? C.red : C.amber} />
                  <span style={{ flex: 1, fontSize: 13, color: C.text }}>{x.r}</span>
                  <span className="tnum" style={{ fontSize: 12, color: C.textMuted }}>{x.n}×</span>
                  <span className="tnum" style={{ width: 92, textAlign: "right", fontSize: 13, fontWeight: 700, color: moneyCol(x.pnl) }}>{fmtUsdSigned(x.pnl)}</span>
                  <span className="tnum" style={{ width: 60, textAlign: "right", fontSize: 12, color: rCol(x.sumR) }}>{fmtRs(x.sumR)}</span>
                </div>
              ))}
            </div>
          )}
        </ASection>
      )}
    </div>
  );
}

/* ── Note de santé du compte /10 ── */


/* ── Coach : motifs qui te coûtent (sans IA, calculés sur tes trades) ── */


/* ── Challenge prop firm : conditions + suivi ── */
const CH_DEFAULT = { steps: 2, target: 8, target2: 5, maxDaily: 5, maxDD: 10, ddType: "static", minDays: 4, deadline: "", phase: "Phase 1", phaseStart: "" };
/* objectif de la phase en cours : Phase 1, Phase 2, puis Financé (pas d'objectif, seulement les pertes max) */
const chTarget = (c) => (c.phase === "Financé" ? 0 : c.phase === "Phase 2" ? c.target2 ?? 5 : c.target);
function ChallengeFields({ v, set }) {
  const c = { ...CH_DEFAULT, ...(v || {}) }; const up = (p) => set({ ...c, ...p });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px", borderRadius: 10, border: `1px solid ${C.amber}40`, background: C.amberDim }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>Conditions du challenge</div>
      <div style={{ display: "flex", gap: 6 }}>{[[2, "2 étapes"], [1, "1 étape"]].map(([k, l]) => <button key={k} type="button" onClick={() => up({ steps: k, phase: k === 1 && c.phase === "Phase 2" ? "Phase 1" : c.phase })} style={{ ...chipBtn((c.steps || 2) === k, C.amber), flex: 1 }}>{l}</button>)}</div>
      <div style={{ fontSize: 11.5, color: C.textMuted }}>Phase actuelle (le site passe tout seul à la suivante quand l'objectif est atteint)</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{((c.steps || 2) === 2 ? ["Phase 1", "Phase 2", "Financé"] : ["Phase 1", "Financé"]).map((p) => <button key={p} type="button" onClick={() => up({ phase: p, phaseStart: new Date().toISOString() })} style={chipBtn(c.phase === p, C.amber)}>{p}</button>)}</div>
      <div className="form-grid-2" style={{ gap: 10 }}>
        <NumRule label="Objectif phase 1" suffix="%" step={0.5} value={c.target} onChange={(x) => up({ target: x })} />
        {(c.steps || 2) === 2 && <NumRule label="Objectif phase 2" suffix="%" step={0.5} value={c.target2} onChange={(x) => up({ target2: x })} />}
        <NumRule label="Perte max par jour" suffix="%" step={0.5} value={c.maxDaily} onChange={(x) => up({ maxDaily: x })} />
        <NumRule label="Drawdown max" suffix="%" step={0.5} value={c.maxDD} onChange={(x) => up({ maxDD: x })} />
        <NumRule label="Jours de trading min" value={c.minDays} onChange={(x) => up({ minDays: x })} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>{[["static", "Drawdown fixe"], ["trailing", "Drawdown suiveur"]].map(([k, l]) => <button key={k} type="button" onClick={() => up({ ddType: k })} style={{ ...chipBtn(c.ddType === k, C.amber), flex: 1 }}>{l}</button>)}</div>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: C.textSecondary, fontWeight: 600 }}>Date limite (optionnel)
        <input type="date" value={c.deadline || ""} onChange={(e) => up({ deadline: e.target.value })} style={{ ...inputStyle, boxSizing: "border-box" }} />
      </label>
    </div>
  );
}

function challengeStatus(acc, trades) {
  const c = { ...CH_DEFAULT, ...(acc.challenge || {}) }; const B = Number(acc.balance) || 10000;
  /* chaque phase repart du capital de départ : seuls les trades depuis le début de la phase comptent */
  const L = byTime(closedOf(trades)).filter((t) => !c.phaseStart || new Date(t.entryTime) >= new Date(c.phaseStart)); let eq = B, peak = B, ddMax = 0; const days = {};
  L.forEach((t) => { eq += usdOf(t); peak = Math.max(peak, eq); const k = dayKey(t.entryTime); days[k] = (days[k] || 0) + usdOf(t); ddMax = Math.max(ddMax, c.ddType === "trailing" ? peak - eq : B - eq); });
  const profit = eq - B; const worstDay = Math.min(0, ...Object.values(days)); const today = days[dayKey(new Date().toISOString())] || 0;
  const lim = { target: (B * (chTarget(c) || 0)) / 100, daily: (B * (c.maxDaily || 0)) / 100, dd: (B * (c.maxDD || 0)) / 100 };
  const failed = (c.maxDaily && -worstDay >= lim.daily) ? "Perte max du jour dépassée" : (c.maxDD && ddMax >= lim.dd) ? "Drawdown max dépassé" : null;
  const nDays = Object.keys(days).length; const left = c.deadline ? Math.ceil((new Date(c.deadline + "T23:59:59") - Date.now()) / 864e5) : null;
  const passed = !failed && c.phase !== "Financé" && chTarget(c) && profit >= lim.target && nDays >= (c.minDays || 0);
  return { c, B, profit, today, ddMax, ddNow: c.ddType === "trailing" ? peak - eq : Math.max(0, B - eq), lim, failed, passed, nDays, left, expired: left != null && left < 0 && !passed };
}

function ChallengeCard({ acc, trades, onDelete }) {
  const s = useMemo(() => challengeStatus(acc, trades), [acc, trades]);
  const st = s.failed ? { t: "Échoué · " + s.failed, c: C.red } : s.c.phase === "Financé" ? { t: "Financé ✓", c: C.teal } : s.passed ? { t: "Réussi 🎉", c: C.teal } : s.expired ? { t: "Délai dépassé", c: C.red } : { t: "En cours", c: C.amber };
  const Bar = ({ label, cur, max, good, sub }) => { const p = max ? clamp01(cur / max) : 0; const col = good ? C.teal : p >= 0.8 ? C.red : p >= 0.5 ? C.amber : C.teal; return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textSecondary, marginBottom: 5 }}><span>{label}</span><span className="tnum" style={{ color: C.text }}>{sub}</span></div>
      <div style={{ height: 7, borderRadius: 4, background: C.border, overflow: "hidden" }}><div style={{ width: `${p * 100}%`, height: "100%", background: col, transition: "width .4s" }} /></div>
    </div>); };
  return (
    <div style={{ background: C.card, border: `1px solid ${st.c}55`, borderRadius: 16, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <Trophy size={18} color={C.amber} />
        <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{acc.name} · {s.c.phase}</div><div style={{ fontSize: 12, color: C.textMuted }}>{s.nDays} / {s.c.minDays || 0} jours tradés{s.left != null ? ` · ${s.left >= 0 ? s.left + " j restants" : "délai passé"}` : ""}</div></div>
        <span style={{ fontSize: 12, fontWeight: 700, color: st.c, background: st.c + "1A", padding: "4px 10px", borderRadius: 7 }}>{st.t}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {s.c.phase !== "Financé" ? <Bar label={`Objectif ${s.c.phase} (${chTarget(s.c)} %)`} cur={Math.max(0, s.profit)} max={s.lim.target} good sub={`${fmtUsdSigned(s.profit)} / ${fmtUsd(s.lim.target)}`} /> : <div style={{ fontSize: 13, color: C.textSecondary }}>Compte financé de <b>{fmtUsd(s.B)}</b> · résultat depuis le financement : <b style={{ color: s.profit >= 0 ? C.teal : C.red }}>{fmtUsdSigned(s.profit)}</b></div>}
        {s.c.maxDaily ? <Bar label="Perte du jour" cur={Math.max(0, -s.today)} max={s.lim.daily} sub={`${fmtUsdSigned(s.today)} · limite −${fmtUsd(s.lim.daily)}`} /> : null}
        {s.c.maxDD ? <Bar label={s.c.ddType === "trailing" ? "Drawdown suiveur" : "Drawdown"} cur={s.ddNow} max={s.lim.dd} sub={`${fmtUsd(s.ddNow)} · reste ${fmtUsd(Math.max(0, s.lim.dd - s.ddNow))}`} /> : null}
      </div>
      {s.failed && onDelete && <button onClick={() => { if (window.confirm(`Supprimer le challenge « ${acc.name} » ? Ses trades restent dans ton historique.`)) onDelete(acc.id); }} style={{ ...btn.ghost, marginTop: 14, width: "100%", justifyContent: "center", color: C.red, borderColor: C.red + "55" }}><Trash2 size={14} /> Supprimer ce challenge échoué</button>}
    </div>
  );
}

/* ── Import de l'historique MT4 / MT5 (rapport HTML ou CSV) ── */
function parseMtReport(text, accountId) {
  let rows = [];
  if (/<table|<tr/i.test(text)) {
    const doc = new DOMParser().parseFromString(text, "text/html");
    rows = [...doc.querySelectorAll("tr")].map((tr) => { const r = []; [...tr.children].forEach((td) => { const n = Number(td.getAttribute("colspan")) || 1; r.push(td.textContent.replace(/\s+/g, " ").trim()); for (let i = 1; i < n; i++) r.push(""); }); return r; });
  } else {
    const lines = text.split(/\r?\n/).filter((l) => l.trim()); const d = [";", "\t", ","].find((x) => (lines[0] || "").includes(x)) || ",";
    rows = lines.map((l) => l.split(d).map((c) => c.replace(/^"|"$/g, "").trim()));
  }
  const H = rows.findIndex((r) => r.some((c) => /^profit$/i.test(c)) && r.some((c) => /^(symbol|item|symbole)$/i.test(c)) && r.some((c) => /^type$/i.test(c)));
  if (H < 0) throw new Error("Tableau des positions introuvable. Exporte « Historique » en rapport HTML (MT4/MT5).");
  const h = rows[H].map((c) => c.toLowerCase());
  const all = (re) => h.map((c, i) => (re.test(c) ? i : -1)).filter((i) => i >= 0);
  const T = all(/^(time|open time|close time|heure)$/), PR = all(/^(price|prix)$/);
  const ix = { sym: all(/^(symbol|item|symbole)$/)[0], type: all(/^type$/)[0], vol: all(/^(volume|size|lots?)$/)[0], sl: all(/^s ?\/ ?l$/)[0], tp: all(/^t ?\/ ?p$/)[0], ticket: all(/^(position|ticket|order)$/)[0], profit: all(/^profit$/).pop(), com: all(/^commission$/)[0], swap: all(/^swap$/)[0] };
  const num = (v) => { const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", ".")); return isNaN(n) ? null : n; };
  const date = (v) => { const m = String(v || "").match(/(\d{4})[.\-/](\d{2})[.\-/](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).toISOString() : null; };
  const out = [];
  for (let i = H + 1; i < rows.length; i++) {
    const r = rows[i]; const type = String(r[ix.type] || "").toLowerCase();
    if (r.length < 6 || (/^(orders|ordres|deals|transactions|working orders)$/i.test(r[0]) && out.length)) { if (out.length && r.length < 6) break; continue; }
    if (!/^(buy|sell)\b/.test(type)) continue;
    const entryTime = date(r[T[0]]), exitTime = date(r[T[1]]); const en = num(r[PR[0]]), ex = num(r[PR[1]]); if (!entryTime || en == null || ex == null) continue;
    const sl = num(r[ix.sl]) || null, tp = num(r[ix.tp]) || null; const gross = num(r[ix.profit]) || 0; const net = Math.round((gross + (num(r[ix.com]) || 0) + (num(r[ix.swap]) || 0)) * 100) / 100;
    const move = Math.abs(ex - en); const risk = sl && move > 0 ? Math.round((Math.abs(gross) * Math.abs(en - sl)) / move * 100) / 100 : null;
    const pair = String(r[ix.sym] || "").toUpperCase().replace(/[.\-_#].*$/, "").replace(/[^A-Z0-9]/g, "");
    out.push({ id: `mt_${r[ix.ticket] || pair + entryTime}`, pair, direction: type.startsWith("buy") ? "long" : "short", entryTime, exitTime, entryPrice: en, exitPrice: ex, stopLoss: sl, takeProfit: tp, positionSize: num(r[ix.vol]), riskUsd: risk, resultUsd: net, resultR: risk ? Math.round((net / risk) * 100) / 100 : null, status: Math.abs(net) < 0.01 ? "breakeven" : "closed", tags: ["Import MT"], notes: "", accountId });
  }
  if (!out.length) throw new Error("Aucune position clôturée trouvée dans ce fichier.");
  return out;
}

function MtImport({ trades = [], onImport, accountId }) {
  const ref = useRef(null); const [msg, setMsg] = useState(null); const [prev, setPrev] = useState(null);
  const read = (f) => { const r = new FileReader(); r.onload = (e) => { try { const L = parseMtReport(String(e.target.result || ""), accountId); const have = new Set(trades.map((t) => t.id)); const fresh = L.filter((t) => !have.has(t.id)); setPrev({ all: L.length, fresh }); setMsg(null); } catch (err) { setPrev(null); setMsg({ c: C.red, t: err.message }); } }; r.readAsText(f); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>Dans MT4/MT5 : onglet <b>Historique</b> › clic droit › <b>Rapport</b> › HTML. Importe le fichier ici : les trades déjà importés sont ignorés. Ils vont dans le compte actif.</div>
      <button onClick={() => ref.current?.click()} style={{ ...btn.ghost, justifyContent: "center" }}><Upload size={14} /> Choisir le rapport MT4 / MT5 (.html, .csv)</button>
      <input ref={ref} type="file" accept=".htm,.html,.csv,.txt" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ""; }} />
      {prev && (
        <div style={{ padding: "10px 12px", borderRadius: 9, background: C.inputBg, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, fontSize: 12.5, color: C.text }}>{prev.all} positions lues · <b>{prev.fresh.length} nouvelles</b></span>
          {prev.fresh.length > 0 && <button onClick={() => { onImport(prev.fresh); setMsg({ c: C.teal, t: `${prev.fresh.length} trades importés ✓` }); setPrev(null); }} style={{ ...btn.primary, fontSize: 12 }}>Importer</button>}
        </div>
      )}
      {msg && <div style={{ fontSize: 12, color: msg.c }}>{msg.t}</div>}
    </div>
  );
}

/* ============================================================================
   PRO : score /100 (radar) · « Tu peux trader » · check-list pré-session
         · récap semaine · heatmap jour×heure · Playbooks · calendrier éco
   ============================================================================ */
const fmtUsd0 = (v) => (v < 0 ? "−" : "") + "$" + Math.abs(Math.round(v)).toLocaleString("en-US");
const startOfWeek = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const closedSorted = (trades) => byTime(closedOf(trades));

/* ── Score /100 façon Zella : 5 axes ── */


/* ── « Tu peux trader » : marge restante jour / semaine / mois ── */

/* ── Check-list pré-session (bloque « Nouveau trade » tant qu'elle n'est pas cochée) ── */
const CHECK_DEFAULT = ["J'ai regardé le calendrier économique", "Je connais mon biais (HTF)", "Je suis reposé et concentré", "Je respecte mon risque max"];
const checkKey = () => "check_" + dayKey(new Date().toISOString());
function loadChecks() { try { return JSON.parse(localStorage.getItem(checkKey()) || "[]"); } catch { return []; } }
function checklistDone() { const r = loadRules(); const items = r.checklist && r.checklist.length ? r.checklist : CHECK_DEFAULT; if (r.checklistOn === false) return true; const c = loadChecks(); return items.every((_, i) => c.includes(i)); }

/* ── Récap de la semaine ── */

/* ── Heatmap jour × heure (régularité) ── */
function HourHeatmap({ trades, useUsd }) {
  const L = closedSorted(trades); if (L.length < 5) return null;
  const D = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]; const g = {}; let mx = 0.01; const hrs = new Set();
  L.forEach((t) => { const d = new Date(t.entryTime); const k = ((d.getDay() + 6) % 7) + "|" + d.getHours(); const o = (g[k] = g[k] || { v: 0, n: 0 }); o.v += useUsd ? usdOf(t) : rOf(t); o.n++; hrs.add(d.getHours()); });
  Object.values(g).forEach((o) => { mx = Math.max(mx, Math.abs(o.v)); });
  const H = Array.from({ length: 24 }, (_, h) => h).filter((h) => h >= Math.min(...hrs) && h <= Math.max(...hrs));
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, marginBottom: 14, padding: "15px 14px 14px" }}>
      <div style={{ fontSize: 14.5, fontWeight: 700 }}>Carte jour × heure</div>
      <div style={{ height: 10 }} />
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `34px repeat(${H.length}, minmax(22px, 1fr))`, gap: 3, minWidth: 34 + H.length * 25 }}>
          <span />{H.map((h) => <span key={h} style={{ fontSize: 9.5, color: C.textMuted, textAlign: "center" }}>{h}h</span>)}
          {D.map((dn, di) => <React.Fragment key={dn}><span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 600, alignSelf: "center" }}>{dn}</span>
            {H.map((h) => { const o = g[di + "|" + h]; const a = o ? 0.2 + 0.75 * Math.min(1, Math.abs(o.v) / mx) : 0; const c = o && o.v < 0 ? C.red : C.teal;
              return <div key={h} title={o ? `${dn} ${h}h · ${o.n} trade(s) · ${useUsd ? fmtUsdSigned(o.v) : fmtRs(o.v)}` : ""} style={{ height: 24, borderRadius: 5, background: o ? `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)` : C.cardHover }} />; })}
          </React.Fragment>)}
        </div>
      </div>
    </div>
  );
}

/* ── Playbooks : une fiche par setup, avec règles et stats ── */
const PB_KEY = "playbooks_v1";
function loadPB() { try { return JSON.parse(localStorage.getItem(PB_KEY) || "{}"); } catch { return {}; } }
function savePB(p) { try { localStorage.setItem(PB_KEY, JSON.stringify(p)); } catch {} saveSettingsPatch({ playbooks: p }).catch(() => {}); }
function PlaybookDetail({ k, trades, onHide }) {
  const [f, setF] = useState({ ses: [], tf: [], conf: [], dir: [], grade: [] });
  const tfOf = (t) => { const ts = t.rules?.tfSetups; if (Array.isArray(ts)) { const r = ts.find((x) => (x.setups || []).includes(k)); if (r && r.tf) return r.tf; } const tg = (t.tags || []).find((g) => ["M1","M3","M5","M15","M30","H1","H4","D1","W1","D","W","MN"].includes(g)); return tg || null; };
  const confOf = (t) => { const ts = t.rules?.tfSetups; const all = Array.isArray(ts) && ts.length ? ts.flatMap((r) => (r.setups || []).map((x) => x + (r.tf ? " " + r.tf : ""))) : (t.tags || []).filter((g) => TAG_CATALOG.find((c) => c.name === g && c.category === "setup")); return [...new Set(all.filter((x) => x.split(" ")[0] !== k && x !== k))]; };
  const sesOf = (t) => SESSION_SHORT[getSession(t.entryTime)];
  const dirOf = (t) => (t.direction === "long" ? "Long" : "Short");
  const grOf = (t) => t.rules?.grade || null;
  const DIMS = [["ses", "Session", sesOf], ["tf", "Timeframe", tfOf], ["conf", "Confluence", confOf], ["dir", "Sens", dirOf], ["grade", "Note", grOf]];
  const opts = Object.fromEntries(DIMS.map(([d, , fn]) => [d, [...new Set(trades.flatMap((t) => { const v = fn(t); return Array.isArray(v) ? v : v ? [v] : []; }))].sort()]));
  const pass = (t) => DIMS.every(([d, , fn]) => { if (!f[d].length) return true; const v = fn(t); return d === "conf" ? f[d].every((x) => (v || []).includes(x)) : f[d].includes(v); });
  const T = trades.filter(pass);
  const a = aggR(T); const W = T.filter((t) => rOf(t) > 0), L = T.filter((t) => rOf(t) < 0);
  const gw = W.reduce((s, t) => s + rOf(t), 0), gl = -L.reduce((s, t) => s + rOf(t), 0);
  let st = 0, bw = 0, bl = 0; T.forEach((t) => { const r = rOf(t); st = r > 0 ? (st > 0 ? st + 1 : 1) : r < 0 ? (st < 0 ? st - 1 : -1) : st; bw = Math.max(bw, st); bl = Math.min(bl, st); });
  let cum = 0; const curve = [{ i: 0, v: 0 }, ...T.map((t, i) => ({ i: i + 1, v: Math.round((cum += rOf(t)) * 100) / 100 }))];
  const tog = (d, v) => setF((o) => ({ ...o, [d]: o[d].includes(v) ? o[d].filter((x) => x !== v) : [...o[d], v] }));
  const nF = Object.values(f).reduce((s, x) => s + x.length, 0);
  const K = ({ l, v, c }) => <div style={{ padding: "10px 12px", borderRadius: 12, background: C.cardHover, border: `1px solid ${C.border}`, minWidth: 0 }}><div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{l}</div><div className="tnum" style={{ fontSize: 17, fontWeight: 700, color: c || C.text, marginTop: 3, whiteSpace: "nowrap" }}>{v}</div></div>;
  const SES_FULL = Object.fromEntries(Object.entries(SESSION_SHORT).map(([k, v]) => [v, k]));
  const lead = (lb) => SES_FULL[lb] && SES_FULL[lb] !== "Hors session" ? <SessionFlag name={SES_FULL[lb]} size={15} /> : /^[A-Z0-9]{6}$|^XAU|^NAS|^US\d/.test(lb) ? <PairLogo pair={lb} size={16} /> : null;
  const Break = ({ title, fn }) => { const g = groupAgg(T, fn).sort((x, y) => y.sumR - x.sumR); if (!g.length) return null; const mx = Math.max(0.01, ...g.map((x) => Math.abs(x.sumR)));
    return <div style={{ background: C.cardHover, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 12px 6px", minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{title}</div>
      {g.map((x) => <div key={x.label} style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr) 34px 42px 62px", gap: 6, alignItems: "center", padding: "7px 4px", borderTop: `1px solid ${C.border}`, fontSize: 12.5 }}>
        <div className="grow-x" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: (Math.abs(x.sumR) / mx) * 100 + "%", background: `linear-gradient(90deg, ${rCol(x.sumR)}1A, transparent)`, borderRadius: 4 }} />
        <b style={{ position: "relative", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>{lead(x.label)}{x.label}</b>
        <span className="tnum" style={{ position: "relative", textAlign: "right", color: C.textSecondary }}>{x.n}</span>
        <span className="tnum" style={{ position: "relative", textAlign: "right", color: x.wr >= 50 ? C.teal : C.textSecondary }}>{x.wr.toFixed(0)}%</span>
        <b className="tnum" style={{ position: "relative", textAlign: "right", color: rCol(x.sumR) }}>{fmtRs(x.sumR)}</b>
      </div>)}
    </div>; };
  return (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px", borderRadius: 14, background: C.cardHover, border: `1px solid ${C.border}`, marginBottom: 12 }}>
        {DIMS.map(([d, l]) => opts[d].length > 0 && <div key={d} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ width: 82, fontSize: 10.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{l}</span>
          {opts[d].map((v) => { const on = f[d].includes(v); return <button key={v} onClick={() => tog(d, v)} aria-pressed={on} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, border: `1px solid ${on ? C.purple : C.border}`, background: on ? C.purpleDim : "transparent", color: on ? C.purpleBright : C.textSecondary, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{d === "ses" ? lead(v) : null}{on ? "✓ " : ""}{v}</button>; })}
        </div>)}
        {nF > 0 && <button onClick={() => setF({ ses: [], tf: [], conf: [], dir: [], grade: [] })} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Effacer les filtres ({nF})</button>}
      </div>
      {T.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Aucun trade avec ces filtres.</div> : <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 8, marginBottom: 12 }}>
          <K l="Trades" v={a.n} /><K l="Winrate" v={a.wr.toFixed(0) + " %"} c={a.wr >= 50 ? C.teal : C.amber} /><K l="Profit factor" v={gl ? (gw / gl).toFixed(2) : "—"} c={gl && gw / gl >= 1.5 ? C.teal : null} />
          <K l="R moyen" v={fmtRs(a.avgR)} c={rCol(a.avgR)} /><K l="Total" v={fmtRs(a.sumR)} c={rCol(a.sumR)} /><K l="Total $" v={fmtUsdSigned(a.pnl)} c={rCol(a.pnl)} />
          <K l="Gain moyen" v={W.length ? fmtRs(gw / W.length) : "—"} c={C.teal} /><K l="Perte moyenne" v={L.length ? fmtRs(-gl / L.length) : "—"} c={C.red} />
          <K l="Meilleur" v={fmtRs(Math.max(...T.map(rOf)))} c={C.teal} /><K l="Pire" v={fmtRs(Math.min(...T.map(rOf)))} c={C.red} /><K l="Séries" v={bw + "W / " + -bl + "L"} />
        </div>
        {T.length > 1 && <div style={{ height: 130, background: C.cardHover, border: `1px solid ${C.border}`, borderRadius: 14, padding: "8px 0 0", marginBottom: 12 }}>
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={curve} margin={{ top: 6, right: 8, left: 8, bottom: 6 }}>
            <defs><linearGradient id={"pbG" + k.replace(/\W/g, "")} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={rCol(a.sumR)} stopOpacity={0.35} /><stop offset="100%" stopColor={rCol(a.sumR)} stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="i" hide /><YAxis hide domain={["dataMin", "dataMax"]} /><ReferenceLine y={0} stroke={C.textMuted} strokeDasharray="3 4" strokeOpacity={0.5} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }} formatter={(v) => [fmtRs(v), "Cumul"]} labelFormatter={() => ""} />
            <Area type="monotone" dataKey="v" stroke={rCol(a.sumR)} strokeWidth={2} fill={"url(#pbG" + k.replace(/\W/g, "") + ")"} dot={false} />
          </AreaChart></ResponsiveContainer>
        </div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 12 }}>
          <Break title="Par session" fn={sesOf} /><Break title="Par timeframe" fn={tfOf} /><Break title="Par confluence" fn={confOf} /><Break title="Par paire" fn={(t) => t.pair} /><Break title="Long / Short" fn={dirOf} /><Break title="Par note" fn={grOf} />
        </div>
        <div style={{ background: C.cardHover, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 12px 6px" }}>
          <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Derniers trades</div>
          {T.slice(-8).reverse().map((t) => <div key={t.id} className="tnum" style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, padding: "7px 4px", borderTop: `1px solid ${C.border}` }}><span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, color: C.textSecondary }}><PairLogo pair={t.pair} size={18} /><b style={{ color: C.text }}>{t.pair}</b><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{new Date(t.entryTime).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · {sesOf(t)}{tfOf(t) ? " · " + tfOf(t) : ""}</span></span><b style={{ color: rCol(rOf(t)) }}>{fmtRs(rOf(t))}</b></div>)}
        </div>
      </>}
      <button onClick={onHide} style={{ ...btn.ghost, marginTop: 12, color: C.textMuted, fontSize: 12 }}>Masquer ce playbook</button>
    </div>
  );
}

function Playbooks({ trades: allT }) {
  const [pb, setPb] = useState(loadPB); const [open, setOpen] = useState(null); const [nw, setNw] = useState("");
  const [gf, setGf] = useState(() => { try { return JSON.parse(localStorage.getItem("pb_filter") || "null") || { per: "all", hideSes: [], dir: "all", pairs: [] }; } catch { return { per: "all", hideSes: [], dir: "all", pairs: [] }; } });
  const [fo, setFo] = useState(false);
  const setG = (p) => { const n = { ...gf, ...p }; setGf(n); try { localStorage.setItem("pb_filter", JSON.stringify(n)); } catch {} };
  const days = { "7": 7, "30": 30, "90": 90 }[gf.per];
  const trades = allT.filter((t) => (!days || new Date(t.entryTime) >= Date.now() - days * 864e5) && !gf.hideSes.includes(getSession(t.entryTime)) && (gf.dir === "all" || t.direction === gf.dir) && (!gf.pairs.length || gf.pairs.includes(t.pair)));
  const nGF = (gf.per !== "all") + gf.hideSes.length + (gf.dir !== "all") + gf.pairs.length;
  const allPairs = [...new Set(allT.map((t) => t.pair).filter(Boolean))].sort();
  const chipG = (on) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 999, border: `1px solid ${on ? C.purple : C.border}`, background: on ? C.purpleDim : "transparent", color: on ? C.purpleBright : C.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
  const up = (k, patch) => { const n = { ...pb, [k]: { ...(pb[k] || {}), ...patch } }; setPb(n); savePB(n); };
  const L = closedSorted(trades);
  const setupsOf = (t) => { const ts = t.rules?.tfSetups; if (Array.isArray(ts) && ts.length) return [...new Set(ts.flatMap((r) => r.setups || []))]; return (t.tags || []).filter((g) => TAG_CATALOG.find((c) => c.name === g && c.category === "setup")); };
  const names = [...new Set([...Object.keys(pb), ...L.flatMap(setupsOf)])].filter((k) => !(pb[k] && pb[k].hidden));
  const stat = (k) => { const T = L.filter((t) => setupsOf(t).includes(k)); const a = aggR(T); const gw = T.filter((t) => rOf(t) > 0).reduce((s, t) => s + rOf(t), 0), gl = -T.filter((t) => rOf(t) < 0).reduce((s, t) => s + rOf(t), 0);
    const by = (fn) => groupAgg(T, fn).filter((x) => x.n >= 2).sort((x, y) => y.sumR - x.sumR)[0];
    return { ...a, T, pf: gl ? gw / gl : null, pair: by((t) => t.pair), ses: by((t) => { const x = getSession(t.entryTime); return x === "Hors session" ? null : SESSION_SHORT[x]; }), grades: groupAgg(T, (t) => t.rules?.grade || null) }; };
  const rows = names.map((k) => ({ k, ...stat(k) })).sort((a, b) => b.sumR - a.sumR);
  return (
    <div className="fade-in" style={{ maxWidth: 860, margin: "0 auto" }}>
      <PageHeader title="Playbooks" action={<button onClick={() => setFo((v) => !v)} style={{ ...btn.ghost, borderColor: nGF ? C.purple : C.border, color: nGF ? C.purpleBright : C.textSecondary }}><SlidersHorizontal size={14} /> Filtrer{nGF ? " · " + nGF : ""}</button>} />
      {fo && <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {[["Période", [["all", "Tout"], ["7", "7 j"], ["30", "30 j"], ["90", "90 j"]].map(([k, l]) => <button key={k} onClick={() => setG({ per: k })} style={chipG(gf.per === k)}>{l}</button>)],
          ["Sessions", SESSIONS_ALL.map((x) => { const on = !gf.hideSes.includes(x); return <button key={x} onClick={() => setG({ hideSes: on ? [...gf.hideSes, x] : gf.hideSes.filter((y) => y !== x) })} style={chipG(on)}>{x !== "Hors session" ? <SessionFlag name={x} size={15} /> : null}{SESSION_SHORT[x]}</button>; })],
          ["Sens", [["all", "Les deux"], ["long", "Long"], ["short", "Short"]].map(([k, l]) => <button key={k} onClick={() => setG({ dir: k })} style={chipG(gf.dir === k)}>{l}</button>)],
          ["Paires", allPairs.map((x) => { const on = gf.pairs.includes(x); return <button key={x} onClick={() => setG({ pairs: on ? gf.pairs.filter((y) => y !== x) : [...gf.pairs, x] })} style={chipG(on)}><PairLogo pair={x} size={15} />{x}</button>; })]].map(([l, ch]) => <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}><span style={{ width: 70, fontSize: 10.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{l}</span>{ch}</div>)}
        {nGF > 0 && <button onClick={() => setG({ per: "all", hideSes: [], dir: "all", pairs: [] })} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Tout réinitialiser</button>}
      </div>}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input value={nw} onChange={(e) => setNw(e.target.value)} placeholder="Nom du playbook" style={{ ...inputStyle, flex: 1 }} />
        <button disabled={!nw.trim()} onClick={() => { up(nw.trim(), { rules: [], desc: "" }); setOpen(nw.trim()); setNw(""); }} style={{ ...btn.primary, opacity: nw.trim() ? 1 : 0.5 }}><Plus size={14} /> Créer</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {rows.map((r) => { const P = pb[r.k] || {}; const op = open === r.k; const c = r.sumR > 0 ? C.teal : r.sumR < 0 ? C.red : C.textMuted;
          return <div key={r.k} style={{ gridColumn: op ? "1 / -1" : undefined, background: `linear-gradient(160deg, ${c}14, transparent 50%), ${C.card}`, border: `1px solid ${op ? C.purple + "77" : C.border}`, borderRadius: 18, overflow: "hidden" }}>
            <button onClick={() => setOpen(op ? null : r.k)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", color: C.text, cursor: "pointer", padding: "14px 16px", fontFamily: "inherit" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16, fontWeight: 700 }}>{r.k}</span><span className="tnum" style={{ fontSize: 17, fontWeight: 700, color: c }}>{fmtRs(r.sumR)}</span></div>
              <div className="tnum" style={{ display: "flex", gap: 12, fontSize: 12, color: C.textSecondary, marginTop: 6, flexWrap: "wrap" }}><span>{r.n} trades</span><span>{r.n ? r.wr.toFixed(0) : 0} % WR</span><span>PF {r.pf != null ? r.pf.toFixed(2) : "—"}</span><span>{fmtRs(r.avgR)} / trade</span></div>
            </button>
            {op && <PlaybookDetail k={r.k} trades={r.T} onHide={() => { up(r.k, { hidden: true }); setOpen(null); }} />}
          </div>; })}
      </div>
    </div>
  );
}

/* ── Calendrier économique (widget TradingView) ── */
function EcoCalendar() {
  const ref = useRef(null);
  const dark = C.bg === THEMES.dark.bg;
  useEffect(() => {
    const el = ref.current; if (!el) return; el.innerHTML = "";
    const w = document.createElement("div"); w.className = "tradingview-widget-container__widget"; el.appendChild(w);
    const s = document.createElement("script"); s.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js"; s.async = true;
    s.innerHTML = JSON.stringify({ colorTheme: dark ? "dark" : "light", isTransparent: true, width: "100%", height: "520", locale: "fr", importanceFilter: "0,1", countryFilter: "us,eu,gb,jp,ch,au,ca,nz,cn,de,fr" });
    el.appendChild(s);
  }, [dark]);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "14px 14px 6px", marginTop: 16 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700 }}>Calendrier économique</div>
      <div style={{ height: 8 }} />
      <div className="tradingview-widget-container" ref={ref} style={{ minHeight: 520 }} />
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
  const [editCh, setEditCh] = useState(acc.challenge || { ...CH_DEFAULT });
  const [confirmDel, setConfirmDel] = useState(false);
  const [editLogo, setEditLogo] = useState(acc.logo || null);
  const [logoMsg, setLogoMsg] = useState("");
  const logoRef = useRef(null);
  const setLogoFile = async (file) => {
    const r = new FileReader(); r.onload = (e) => setEditLogo(e.target.result); r.readAsDataURL(file);
    try { const url = await uploadToStorage(file); if (url) setEditLogo(url); } catch (e) {}
  };

  const saveEdit = () => {
    onSaveAccounts(accounts.map(a => a.id === acc.id ? { ...a, name: editName, balance: Number(editBalance) || 0, broker: editBroker, type: editType, logo: editLogo || null, challenge: editType === "challenge" ? editCh : a.challenge } : a));
    setEditing(false);
  };

  return (
    <div style={{ background: C.inputBg || C.card, borderRadius: 10, border: `1.5px solid ${isActive ? C.purple : C.border}`, marginBottom: 8, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <AccountLogo acc={acc} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{acc.name}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
            <span style={{ color: acc.challenge?.phase === "Financé" ? C.teal : typeColors[acc.type] || C.teal, fontWeight: 600 }}>{acc.type === "challenge" && acc.challenge?.phase ? (acc.challenge.phase === "Financé" ? "Financé" : "Challenge · " + acc.challenge.phase) : typeLabels[acc.type] || acc.type}</span>
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AccountLogo acc={{ ...acc, logo: editLogo, name: editName }} size={44} />
            <button onClick={async () => { setLogoMsg(""); try { const f = await readClipboardImage(); if (!f) return setLogoMsg("Aucune image copiée."); await setLogoFile(f); } catch (e) { setLogoMsg("Presse-papier refusé : utilise Fichier."); } }} style={{ ...btn.ghost, fontSize: 12 }}><Clipboard size={13} /> Coller</button>
            <button onClick={() => logoRef.current?.click()} style={{ ...btn.ghost, fontSize: 12 }}><Upload size={13} /> Fichier</button>
            {editLogo && <button onClick={() => setEditLogo(null)} style={{ ...btn.ghost, fontSize: 12, color: C.red }}><X size={13} /></button>}
            <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogoFile(f); e.target.value = ""; }} />
          </div>
          {logoMsg && <div style={{ fontSize: 11.5, color: C.red }}>{logoMsg}</div>}
          <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nom du compte" style={{ ...inputStyle, fontSize: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)} placeholder="Solde ($)" style={{ ...inputStyle, fontSize: 12, flex: 1 }} />
            <input value={editBroker} onChange={e => setEditBroker(e.target.value)} placeholder="Broker" style={{ ...inputStyle, fontSize: 12, flex: 1 }} />
          </div>
          {editType === "challenge" && <ChallengeFields v={editCh} set={setEditCh} />}
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
  const [newCh, setNewCh] = useState({ ...CH_DEFAULT });

  const handleAdd = () => {
    if (!newName) return;
    const acc = { id: `acc_${Date.now()}`, name: newName, type: newType, balance: Number(newBalance) || 0, broker: newBroker, ...(newType === "challenge" ? { challenge: newCh } : {}) };
    onSaveAccounts([...(accounts || []), acc]);
    setShowForm(false); setNewName(""); setNewBalance(""); setNewBroker(""); setNewType("demo");
  };

  if (!showForm) return (
    <button onClick={() => setShowForm(true)} style={{ ...btn.primary, marginTop: 6, width: "100%", justifyContent: "center", padding: "12px 15px", fontSize: 14, borderRadius: 10 }}>
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
        {newType === "challenge" && <ChallengeFields v={newCh} set={setNewCh} />}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={handleAdd} style={{ ...btn.primary, flex: 1 }}>Ajouter</button>
        <button onClick={() => setShowForm(false)} style={btn.ghost}>Annuler</button>
      </div>
    </div>
  );
}

function SettingsPage({ settings, setSettings, accounts, activeAccountId, onSaveAccounts, onSwitchAccount, trades = [], onImport, onOpenBacktest }) {
  
  
  
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

      {onOpenBacktest && <SettingsSection title="Backtesting" icon={LineChart}>
        <button onClick={onOpenBacktest} style={{ ...btn.primary, width: "100%", justifyContent: "center", padding: "12px 15px", fontSize: 14, borderRadius: 10 }}><LineChart size={15} /> Ouvrir le backtesting</button>
      </SettingsSection>}

      {onImport && <SettingsSection title="Importer depuis MT4 / MT5" icon={Download}>
        <MtImport trades={trades} onImport={onImport} accountId={activeAccountId || accounts?.[0]?.id || null} />
      </SettingsSection>}

      {/* Paires tradées */}
      <SettingsSection title="Paires tradées" icon={LineChart}>
        <PairsSettings settings={settings} addPair={addPair} removePair={removePair} />
      </SettingsSection>

      <SettingsSection title="Logos des actifs" icon={Coins}>
        <PairLogosSettings />
      </SettingsSection>

      <SettingsSection title="Timeframes" icon={Timer}>
        <TimeframesSettings settings={settings} update={update} />
      </SettingsSection>

      <SettingsSection title="PD Arrays" icon={Target}>
        <PdArraysSettings settings={settings} update={update} />
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


// ── Calculatrice de position : tous les actifs, taux en direct, saisie par prix ou en pips ──
const CCYS = ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF", "JPY"];
const CALC_FX = (() => { const o = []; for (let i = 0; i < CCYS.length; i++) for (let j = i + 1; j < CCYS.length; j++) o.push(CCYS[i] + CCYS[j]); return o; })();
// contrat : unités par lot · pip : taille du pip · q : devise de cotation
const CALC_SPECIAL = {
  XAUUSD: { c: 100, pip: 0.1, q: "USD", lab: "Or" }, XAGUSD: { c: 5000, pip: 0.01, q: "USD", lab: "Argent" },
  US30: { c: 1, pip: 1, q: "USD", lab: "Dow Jones" }, NAS100: { c: 1, pip: 1, q: "USD", lab: "Nasdaq" }, SPX500: { c: 1, pip: 1, q: "USD", lab: "S&P 500" },
  GER40: { c: 1, pip: 1, q: "EUR", lab: "DAX" }, UK100: { c: 1, pip: 1, q: "GBP", lab: "FTSE" },
  BTCUSD: { c: 1, pip: 1, q: "USD", lab: "Bitcoin" }, ETHUSD: { c: 1, pip: 1, q: "USD", lab: "Ethereum" },
  USOIL: { c: 1000, pip: 0.01, q: "USD", lab: "Pétrole WTI" },
};
const CALC_ALL = [...CALC_FX, ...Object.keys(CALC_SPECIAL)];
const specOf = (p) => CALC_SPECIAL[p] || { c: 100000, pip: p.includes("JPY") ? 0.01 : 0.0001, q: p.slice(3, 6) };
const FX_FALLBACK = { USD: 1, EUR: 0.92, GBP: 0.79, AUD: 1.52, NZD: 1.66, CAD: 1.37, CHF: 0.88, JPY: 152 };
const CALC_KEY = "calc_v2";

function useFxRates() {
  const [st, setSt] = useState(() => { try { const c = JSON.parse(localStorage.getItem("fx_rates") || "null"); if (c && c.rates) return c; } catch {} return { rates: FX_FALLBACK, at: null, live: false }; });
  useEffect(() => {
    if (st.at && Date.now() - st.at < 6 * 3600e3) return;
    fetch("https://open.er-api.com/v6/latest/USD").then((r) => r.json()).then((j) => { if (j && j.rates && j.rates.EUR) { const o = { rates: j.rates, at: Date.now(), live: true }; setSt(o); try { localStorage.setItem("fx_rates", JSON.stringify(o)); } catch {} } }).catch(() => {});
  }, []);
  return st;
}

function ForexCalculator({ balance, pairs: myPairs = [], onCreateTrade }) {
  const fx = useFxRates();
  const saved = (() => { try { return JSON.parse(localStorage.getItem(CALC_KEY) || "{}"); } catch { return {}; } })();
  const [pair, setPair] = useState(saved.pair || "EURUSD");
  const [acc, setAcc] = useState(saved.acc || String(Math.round(Number(balance) || 10000)));
  const [riskMode, setRiskMode] = useState(saved.riskMode || "pct");
  const [risk, setRisk] = useState(saved.risk || "1");
  const [mode, setMode] = useState(saved.mode || "pips");
  const [sl, setSl] = useState(saved.sl || "");
  const [tp, setTp] = useState(saved.tp || "");
  const [entry, setEntry] = useState(""); const [slP, setSlP] = useState(""); const [tpP, setTpP] = useState("");
  const [com, setCom] = useState(saved.com || "");
  const [step, setStep] = useState(saved.step || "0.01");
  const [pvOver, setPvOver] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => { try { localStorage.setItem(CALC_KEY, JSON.stringify({ pair, acc, riskMode, risk, mode, sl, tp, com, step })); } catch {} }, [pair, acc, riskMode, risk, mode, sl, tp, com, step]);
  useEffect(() => { setPvOver(""); }, [pair]);

  const sp = specOf(pair);
  const usdPer = (ccy) => (ccy === "USD" ? 1 : 1 / (Number(fx.rates[ccy]) || FX_FALLBACK[ccy] || 1));
  const pvAuto = sp.c * sp.pip * usdPer(sp.q);          // valeur d'1 pip pour 1 lot, en $
  const pv = Number(pvOver) > 0 ? Number(pvOver) : pvAuto;
  const n = (v) => { const x = parseFloat(String(v).replace(",", ".")); return isNaN(x) ? null : x; };
  const A = n(acc) || 0;
  const plan = (() => { try { return loadRules(); } catch { return {}; } })();

  const r = useMemo(() => {
    let slPips = n(sl), tpPips = n(tp), dir = null;
    if (mode === "prix") { const e = n(entry), s = n(slP), t = n(tpP); if (e != null && s != null) { slPips = Math.abs(e - s) / sp.pip; dir = s < e ? "long" : "short"; } else slPips = null; tpPips = e != null && t != null ? Math.abs(t - e) / sp.pip : null; }
    const riskUsd = riskMode === "pct" ? (A * (n(risk) || 0)) / 100 : n(risk) || 0;
    if (!slPips || !riskUsd || !pv) return null;
    const c = n(com) || 0; const st = n(step) || 0.01;
    const raw = riskUsd / (slPips * pv + c);
    const lots = Math.floor(raw / st + 1e-9) * st;
    const realRisk = lots * (slPips * pv + c);
    const gain = tpPips ? lots * (tpPips * pv - c) : null;
    return { slPips, tpPips, dir, riskUsd, raw, lots, realRisk, gain, rr: tpPips ? tpPips / slPips : null, pipLot: lots * pv, units: lots * sp.c, pct: A ? (realRisk / A) * 100 : null, bePips: lots && c ? c / pv : 0 };
  }, [sl, tp, mode, entry, slP, tpP, riskMode, risk, A, pv, com, step, sp]);

  const dec = Math.max(0, Math.round(-Math.log10(sp.pip)) + 1);
  const lvl = (k) => { const e = n(entry); if (e == null || !r || !r.dir) return null; const d = r.slPips * sp.pip * k; return (r.dir === "long" ? e + d : e - d).toFixed(dec); };
  const quick = [...new Set([...(myPairs || []).filter((p) => CALC_ALL.includes(p)), "EURUSD", "GBPUSD", "XAUUSD", "NAS100"])].slice(0, 8);
  const list = CALC_ALL.filter((p) => !q || p.includes(q.toUpperCase()) || (CALC_SPECIAL[p]?.lab || "").toLowerCase().includes(q.toLowerCase()));
  const lotsTxt = r ? r.lots.toFixed(String(step).split(".")[1]?.length || 2) : "—";
  const overPlan = r && plan.maxRiskPct && r.pct > plan.maxRiskPct + 1e-9;
  const [copied, setCopied] = useState(false);
  const copy = () => { if (!r) return; const t = lotsTxt; const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1400); };
    try { navigator.clipboard.writeText(t).then(done, () => { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove(); done(); }); } catch { done(); } };
  const create = () => { if (!r || !onCreateTrade) return; const e = n(entry); const tpPrice = mode === "prix" ? n(tpP) : null;
    onCreateTrade({ pair, direction: r.dir || "long", entryPrice: mode === "prix" ? e : "", stopLoss: mode === "prix" ? n(slP) : "", takeProfit: tpPrice ?? "", riskUsd: Math.round(r.realRisk * 100) / 100, positionSize: r.lots }); };

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16, marginBottom: 12 };
  const lab = { fontSize: 12, fontWeight: 700, color: C.textSecondary, marginBottom: 6, display: "block" };
  const inp = { ...inputStyle, width: "100%", boxSizing: "border-box", padding: "11px 12px", fontSize: 15 };
  const seg = (v, set, opts) => <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 9, background: C.inputBg || C.bg, border: `1px solid ${C.border}` }}>{opts.map(([k, l]) => <button key={k} onClick={() => set(k)} style={{ height: 28, padding: "0 11px", borderRadius: 7, border: "none", background: v === k ? C.purpleDim : "transparent", color: v === k ? C.purpleBright : C.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>)}</div>;
  const chip = (on) => ({ padding: "7px 11px", borderRadius: 9, border: `1.5px solid ${on ? C.purple : C.border}`, background: on ? C.purpleDim : "transparent", color: on ? C.purpleBright : C.textSecondary, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 });
  const Out = ({ l, v, c, sub }) => <div style={{ padding: "11px 12px", borderRadius: 12, background: C.inputBg || C.bg, border: `1px solid ${C.border}`, minWidth: 0 }}><div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{l}</div><div className="tnum" style={{ fontSize: 17, fontWeight: 700, color: c || C.text, marginTop: 3 }}>{v}</div>{sub && <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 1 }}>{sub}</div>}</div>;

  return (
    <div className="fade-in" style={{ maxWidth: 620, margin: "0 auto", paddingBottom: 170 }}>
      <style>{`.calc-bar{position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:40}@media (min-width:601px){.calc-bar{left:calc(50% + 110px);right:auto;width:min(596px,calc(100% - 260px));transform:translateX(-50%);bottom:20px}}`}</style>
      <PageHeader title="Calculatrice de position" />

      {/* Résultat en direct */}
      <div style={{ ...card, background: `radial-gradient(120% 100% at 100% 0%, ${C.purpleDim}, transparent 60%), ${C.card}`, border: `1px solid ${overPlan ? C.amber + "88" : C.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.textMuted }}>Taille de position</div>
            <div className="tnum" style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1, lineHeight: 1.05, color: r ? C.text : C.textMuted }}>{lotsTxt}<span style={{ fontSize: 16, color: C.textMuted, fontWeight: 600 }}> lots</span></div>
            <div className="tnum" style={{ fontSize: 12.5, color: C.textMuted }}>{r ? `${Math.round(r.units).toLocaleString("fr-FR")} unités · ${(r.lots * 10).toFixed(1)} mini · ${(r.lots * 100).toFixed(0)} micro` : "Entre ton stop pour calculer"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><PairLogo pair={pair} size={30} /><span style={{ fontSize: 15, fontWeight: 700 }}>{pair}</span></div>
        </div>
        {r && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8, marginTop: 14 }}>
          <Out l="Risque réel" v={"−" + fmtUsd(r.realRisk)} c={C.red} sub={r.pct != null ? r.pct.toFixed(2) + " % du compte" : ""} />
          <Out l="Gain au TP" v={r.gain != null ? "+" + fmtUsd(r.gain) : "—"} c={C.teal} sub={r.rr ? "R:R 1:" + r.rr.toFixed(2) : "ajoute un TP"} />
          <Out l="Valeur du pip" v={"$" + r.pipLot.toFixed(2)} sub={`$${pv.toFixed(2)} / lot`} />
          <Out l="Stop" v={r.slPips.toFixed(1) + " pips"} sub={r.tpPips ? "TP " + r.tpPips.toFixed(1) + " pips" : r.dir ? (r.dir === "long" ? "Achat" : "Vente") : ""} />
        </div>}
        {r && r.lots === 0 && <div style={{ marginTop: 10, fontSize: 12, color: C.amber }}>Risque trop petit pour 1 pas de lot ({step}). Il faudrait {r.raw.toFixed(3)} lot.</div>}
        {r && r.realRisk < r.riskUsd - 1 && r.lots > 0 && <div style={{ marginTop: 10, fontSize: 11.5, color: C.textMuted }}>Arrondi au pas de {step} : tu risques {fmtUsd(r.realRisk)} au lieu de {fmtUsd(r.riskUsd)}.</div>}
        {overPlan && <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 9, background: C.amberDim, fontSize: 12, color: C.amber, display: "flex", gap: 6, alignItems: "center" }}><AlertTriangle size={13} /> Au-dessus de ton plan : risque max {plan.maxRiskPct} % par trade.</div>}
        {r && r.rr != null && r.rr < 1.5 && <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 9, background: C.redDim, fontSize: 12, color: C.red, display: "flex", gap: 6, alignItems: "center" }}><AlertCircle size={13} /> R:R faible (1:{r.rr.toFixed(2)}). Vérifie ton TP.</div>}
        {r && r.bePips > 0 && <div style={{ marginTop: 8, fontSize: 11.5, color: C.textMuted }}>Avec la commission, il faut {r.bePips.toFixed(1)} pips pour être à zéro.</div>}
      </div>

      {/* Échelle de prix */}
      {r && r.dir && n(entry) != null && (() => { const e = n(entry); const tpk = r.tpPips ? r.tpPips / r.slPips : null; const top = Math.max(3, tpk || 0); const lv = [["Stop", -1, C.red], ["Entrée", 0, C.purpleBright], ["1R", 1, C.teal], ["2R", 2, C.teal], ["3R", 3, C.teal], ...(tpk && ![1, 2, 3].includes(Math.round(tpk * 100) / 100) ? [["TP", tpk, C.amber]] : [])].sort((x, y) => y[1] - x[1]);
        const pos = (k) => ((top - k) / (top + 1)) * 100; const price = (k) => (r.dir === "long" ? e + r.slPips * sp.pip * k : e - r.slPips * sp.pip * k).toFixed(dec);
        return <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><span style={{ fontSize: 13.5, fontWeight: 700 }}>Niveaux · {r.dir === "long" ? "Achat ▲" : "Vente ▼"}</span>{tpk && <span className="tnum" style={{ fontSize: 12, color: C.amber, fontWeight: 700 }}>TP = {tpk.toFixed(2)}R</span>}</div>
          <div style={{ position: "relative", height: 230, marginLeft: 4 }}>
            <div style={{ position: "absolute", left: 8, width: 6, top: `${pos(top)}%`, height: `${pos(0) - pos(top)}%`, borderRadius: 3, background: `linear-gradient(180deg, ${C.teal}, ${C.teal}33)` }} />
            <div style={{ position: "absolute", left: 8, width: 6, top: `${pos(0)}%`, height: `${pos(-1) - pos(0)}%`, borderRadius: 3, background: `linear-gradient(180deg, ${C.red}33, ${C.red})` }} />
            {lv.map(([l, k, c]) => <div key={l} style={{ position: "absolute", left: 0, right: 0, top: `${pos(k)}%`, transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, background: C.card, border: `3px solid ${c}`, boxSizing: "border-box", flexShrink: 0 }} />
              <span style={{ width: 52, fontSize: 12.5, fontWeight: 700, color: c }}>{l}</span>
              <span className="tnum" style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{k === 0 ? e.toFixed(dec) : price(k)}</span>
              <span className="tnum" style={{ fontSize: 12.5, fontWeight: 600, color: k < 0 ? C.red : k > 0 ? C.teal : C.textMuted }}>{k === 0 ? "" : (k > 0 ? "+" : "−") + fmtUsd(Math.abs(k) * r.realRisk)}</span>
            </div>)}
          </div>
        </div>; })()}

      {/* Actif */}
      <div style={card}>
        <span style={lab}>Actif</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>{quick.map((p) => <button key={p} onClick={() => setPair(p)} style={chip(pair === p)}><PairLogo pair={p} size={16} />{p}</button>)}</div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un actif (GBPJPY, or, nasdaq…)" style={inp} />
        {q && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>{list.slice(0, 16).map((p) => <button key={p} onClick={() => { setPair(p); setQ(""); }} style={chip(pair === p)}>{p}{CALC_SPECIAL[p] ? <span style={{ fontWeight: 500, color: C.textMuted }}> · {CALC_SPECIAL[p].lab}</span> : null}</button>)}{!list.length && <span style={{ fontSize: 12, color: C.textMuted }}>Aucun actif.</span>}</div>}
      </div>

      {/* Compte et risque */}
      <div style={card}>
        <div className="form-grid-2" style={{ gap: 10 }}>
          <label><span style={lab}>Solde du compte ($)</span><input type="number" inputMode="decimal" value={acc} onChange={(e) => setAcc(e.target.value)} style={inp} /></label>
          <label><span style={{ ...lab, display: "flex", justifyContent: "space-between", alignItems: "center" }}>Risque {seg(riskMode, setRiskMode, [["pct", "%"], ["usd", "$"]])}</span><input type="number" inputMode="decimal" step="0.1" value={risk} onChange={(e) => setRisk(e.target.value)} style={inp} /></label>
        </div>
        {riskMode === "pct" && <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>{["0.25", "0.5", "1", "1.5", "2"].map((v) => <button key={v} onClick={() => setRisk(v)} style={chip(risk === v)}>{v.replace(".", ",")} %</button>)}{Number(balance) > 0 && Math.round(Number(balance)) !== Number(acc) && <button onClick={() => setAcc(String(Math.round(Number(balance))))} style={{ ...chip(false), marginLeft: "auto" }}>Solde actuel {fmtUsd(balance)}</button>}</div>}
      </div>

      {/* Stop / TP */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ ...lab, marginBottom: 0 }}>Stop et objectif</span>{seg(mode, setMode, [["pips", "En pips"], ["prix", "Par prix"]])}</div>
        {mode === "pips" ? (
          <div className="form-grid-2" style={{ gap: 10 }}>
            <label><span style={lab}>Stop loss (pips)</span><input type="number" inputMode="decimal" value={sl} onChange={(e) => setSl(e.target.value)} placeholder="20" style={inp} /></label>
            <label><span style={lab}>Take profit (pips)</span><input type="number" inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value)} placeholder="optionnel" style={inp} /></label>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
            <label><span style={lab}>Entrée</span><input type="number" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} style={inp} /></label>
            <label><span style={{ ...lab, color: C.red }}>Stop</span><input type="number" inputMode="decimal" value={slP} onChange={(e) => setSlP(e.target.value)} style={inp} /></label>
            <label><span style={{ ...lab, color: C.teal }}>TP</span><input type="number" inputMode="decimal" value={tpP} onChange={(e) => setTpP(e.target.value)} placeholder="opt." style={inp} /></label>
          </div>
        )}
        {mode === "pips" && n(sl) > 0 && <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}><span style={{ fontSize: 12, color: C.textMuted, alignSelf: "center" }}>TP à</span>{[1.5, 2, 3, 4].map((k) => <button key={k} onClick={() => setTp(String(Math.round(n(sl) * k * 10) / 10))} style={chip(n(tp) === Math.round(n(sl) * k * 10) / 10)}>{String(k).replace(".", ",")}R</button>)}</div>}
      </div>

      {/* Réglages broker */}
      <details style={{ ...card, padding: "12px 16px" }}>
        <summary style={{ fontSize: 13, fontWeight: 700, color: C.textSecondary, cursor: "pointer" }}>Réglages broker (commission, pas de lot, valeur du pip)</summary>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
          <label><span style={lab}>Commission $/lot</span><input type="number" inputMode="decimal" value={com} onChange={(e) => setCom(e.target.value)} placeholder="ex. 7" style={inp} /></label>
          <label><span style={lab}>Pas de lot</span><select value={step} onChange={(e) => setStep(e.target.value)} style={inp}>{["0.01", "0.1", "1"].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label><span style={lab}>Pip / lot ($)</span><input type="number" inputMode="decimal" value={pvOver} onChange={(e) => setPvOver(e.target.value)} placeholder={pvAuto.toFixed(2)} style={inp} /></label>
        </div>
        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>
          1 lot {pair} = {sp.c.toLocaleString("fr-FR")} unités · 1 pip = {sp.pip}. {fx.live ? `Taux de change en direct (${new Date(fx.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}).` : "Taux de change approximatifs (hors ligne)."} {CALC_SPECIAL[pair] && !/USD$/.test(pair) ? "" : ""}{CALC_SPECIAL[pair] && ["US30", "NAS100", "SPX500", "GER40", "UK100", "BTCUSD", "ETHUSD", "USOIL"].includes(pair) ? " Pour les indices, la crypto et le pétrole, la taille du contrat change selon le broker : vérifie la valeur du pip et corrige-la ici." : ""}
        </div>
      </details>

      <div className="calc-bar" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px 10px 14px", borderRadius: 16, background: C.card, border: `1px solid ${overPlan ? C.amber + "99" : C.purple + "55"}`, boxShadow: "0 10px 30px rgba(0,0,0,.35)", backdropFilter: "blur(12px)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tnum" style={{ fontSize: 18, fontWeight: 700, color: r ? C.text : C.textMuted, whiteSpace: "nowrap" }}>{lotsTxt} <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>lot{r && r.lots >= 2 ? "s" : ""} · {pair}</span></div>
          <div className="tnum" style={{ fontSize: 12, color: C.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r ? <><span style={{ color: C.red }}>−{fmtUsd(r.realRisk)}</span>{r.rr ? <> · 1:{r.rr.toFixed(2)} · <span style={{ color: C.teal }}>+{fmtUsd(r.gain)}</span></> : ""}</> : "Entre ton stop"}</div>
        </div>
        <button onClick={copy} disabled={!r} style={{ ...btn.ghost, height: 40, padding: "0 12px", opacity: r ? 1 : 0.5, color: copied ? C.teal : C.textSecondary }}>{copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? "Copié" : "Copier"}</button>
        {onCreateTrade && <button onClick={create} disabled={!r} style={{ ...btn.primary, height: 40, padding: "0 13px", opacity: r ? 1 : 0.5 }}><Plus size={15} />Trade</button>}
      </div>
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
        <div style={{ fontSize: 20, fontWeight: 600, color: C.sidebarText, marginBottom: 4, letterSpacing: 1 }}>EMEIEKS TRADE</div>
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
// Réduit une capture avant envoi (WebP, 1600 px max) : ~100–250 Ko au lieu de 0,5–2 Mo
// ── Agrandir n'importe quelle photo du site en plein écran (clic sur une image ou un lien vers une capture) ──
function PhotoZoom() {
  const [src, setSrc] = useState(null); const [z, setZ] = useState(1);
  useEffect(() => {
    const isShot = (u) => /trade-screenshots|^data:image|^blob:|\.(png|jpe?g|webp)(\?|$)/i.test(u || "");
    const h = (e) => {
      if (e.target.closest && e.target.closest("[data-nozoom]")) return;
      const a = e.target.closest && e.target.closest("a[href]");
      if (a && isShot(a.getAttribute("href"))) { e.preventDefault(); e.stopPropagation(); setZ(1); setSrc(a.getAttribute("href")); return; }
      const im = e.target.tagName === "IMG" ? e.target : null; if (!im) return;
      const r = im.getBoundingClientRect(); if (r.width < 90 || r.height < 60) return;   // logos, drapeaux, icônes : ignorés
      if (im.closest("button") && !im.closest("[data-zoom]")) { /* image dans un bouton : on agrandit quand même si c'est une capture */ if (!isShot(im.currentSrc || im.src)) return; }
      e.preventDefault(); e.stopPropagation(); setZ(1); setSrc(im.currentSrc || im.src);
    };
    document.addEventListener("click", h, true); return () => document.removeEventListener("click", h, true);
  }, []);
  useEffect(() => { if (!src) return; const k = (e) => { if (e.key === "Escape") setSrc(null); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [src]);
  if (!src) return null;
  return (
    <div data-nozoom onClick={() => setSrc(null)} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.92)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", cursor: "zoom-out" }}>
      <img src={src} alt="Photo agrandie" onClick={(e) => { e.stopPropagation(); setZ((v) => (v === 1 ? 2 : 1)); }}
        style={{ maxWidth: z === 1 ? "100vw" : "none", maxHeight: z === 1 ? "100vh" : "none", width: z === 1 ? "auto" : "200vw", objectFit: "contain", cursor: z === 1 ? "zoom-in" : "zoom-out", display: "block", margin: "auto" }} />
      <button onClick={(e) => { e.stopPropagation(); setSrc(null); }} aria-label="Fermer" style={{ position: "fixed", top: 14, right: 14, width: 40, height: 40, borderRadius: 20, border: "none", background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 18, cursor: "pointer" }}>✕</button>
      <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,.6)", fontSize: 12 }}>Clic sur l'image = zoom ×2 · Échap ou ✕ = fermer</div>
    </div>);
}

async function shrinkImage(file, maxW = 1400, q = 0.75) {
  try {
    const url = URL.createObjectURL(file); const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; });
    const k = Math.min(1, maxW / img.naturalWidth); const cv = document.createElement("canvas"); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
    const b = await new Promise((r) => cv.toBlob(r, "image/webp", q)); if (!b || b.size >= file.size) return file;
    return new File([b], "shot.webp", { type: "image/webp" });
  } catch { return file; }
}
async function uploadToStorage(file0) {
  const file = (file0 && file0.type && file0.type.startsWith("image/") && file0.type !== "image/gif") ? await shrinkImage(file0) : file0;   // toutes les photos (trades + backtest) sont compressées
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
      await sbWrite("settings", "/settings?on_conflict=id", "POST", { id: "main", ...m, updated_at: new Date().toISOString() }, "resolution=merge-duplicates,return=minimal");
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

/* ============================================================================
   LECTURE AUTOMATIQUE D'UN SCREENSHOT TRADINGVIEW (outil Long / Short Position)
   Sans IA : on lit les couleurs des zones (vert = TP long, rouge = SL, bleu = TP short)
   et on lit les étiquettes de prix de l'axe de droite avec un OCR (Tesseract.js).
   ============================================================================ */
// « 15 » → M15, « 60 » → H1, « 240 » → H4, « 1D » → D, « 1W » → W
function tvTf(raw) {
  let t = String(raw || "").trim().replace(/\s/g, "").replace(/min$/i, "m"); if (!t) return null;
  if (/^\d+$/.test(t)) { const n = +t; return n >= 60 && n % 60 === 0 ? (n / 60 === 24 ? "D" : "H" + n / 60) : "M" + n; }
  const m = t.match(/^(\d*)([mhHDdWwMS])$/); if (!m) return null; const n = m[1] || "1", u = m[2];
  if (u === "m") return "M" + n; if (/h/i.test(u)) return "H" + n; if (/d/i.test(u)) return n === "1" ? "D" : n + "D"; if (/w/i.test(u)) return n === "1" ? "W" : n + "W"; if (u === "M") return "MN"; return null;
}
let __tessP = null;
function loadTesseract() {
  if (typeof window !== "undefined" && window.Tesseract) return Promise.resolve(window.Tesseract);
  if (__tessP) return __tessP;
  __tessP = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    s.onload = () => res(window.Tesseract); s.onerror = () => { __tessP = null; rej(new Error("OCR indisponible (pas de connexion ?)")); };
    document.head.appendChild(s);
  });
  return __tessP;
}
let __ocrWorker = null;
async function getOcrWorker() {
  if (__ocrWorker) return __ocrWorker;
  const T = await loadTesseract();
  const opts = (typeof window !== "undefined" && window.__TESS_OPTS) || {};
  __ocrWorker = await T.createWorker("eng", 1, opts);
  return __ocrWorker;
}
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = () => rej(new Error("Image illisible")); i.src = src; });
}
const MONTHS_FR = { jan: 0, janv: 0, janvier: 0, feb: 1, fev: 1, fevr: 1, févr: 1, février: 1, mar: 2, mars: 2, apr: 3, avr: 3, avril: 3, may: 4, mai: 4, jun: 5, juin: 5, jul: 6, juil: 6, juill: 6, juillet: 6, aug: 7, aou: 7, août: 7, aout: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11, déc: 11 };
const MONTH_EN = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

function ymd(d) { const z = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()); }
async function analyzeChartScreenshot(src, instruments = [], baseDate = null) {
  const img = await loadImg(src);
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const D = ctx.getImageData(0, 0, W, H).data;
  const px = (x, y) => { const i = (y * W + x) * 4; return [D[i], D[i + 1], D[i + 2]]; };
  const near = (c, r, g, b, t) => Math.abs(c[0] - r) < t && Math.abs(c[1] - g) < t && Math.abs(c[2] - b) < t;
  // Étiquettes de l'axe (couleurs pleines)
  const labelClass = (c) => {
    if (near(c, 34, 171, 148, 40) || near(c, 8, 153, 129, 40)) return "teal";
    if (near(c, 242, 54, 69, 45) || near(c, 247, 82, 95, 40)) return "red";
    if (near(c, 41, 98, 255, 45) || near(c, 33, 150, 243, 40)) return "blue";
    if (c[0] < 45 && c[1] < 45 && c[2] < 50) return "black";
    return null;
  };
  // Zones pâles de l'outil position
  const zoneClass = (c) => {
    const [r, g, b] = c;
    if (g > 215 && b > 205 && r < 225 && g - r > 14 && g >= b - 4) return "zg"; // vert d'eau (TP long)
    if (r > 235 && g > 140 && g < 232 && b > 145 && b < 236 && r - g > 18 && Math.abs(g - b) < 22) return "zr"; // rose (SL)
    if (b > 235 && r < 228 && b - r > 22 && b - g > 12 && g > 160) return "zb"; // bleu pâle (TP short)
    return null;
  };

  // 1) Étiquettes à droite
  const x0 = Math.floor(W * 0.8);
  const rows = [];
  for (let y = 0; y < H; y++) {
    let best = null, cur = null, start = 0, last = 0, cnt = 0;
    const close = () => { if (cur && last - start >= 36 && cnt > (last - start) * 0.3 && (!best || last - start > best.len)) best = { k: cur, a: start, b: last, len: last - start }; };
    for (let x = x0; x <= W; x++) {
      const k = x < W ? labelClass(px(x, y)) : null;
      if (k && k === cur) { last = x; cnt++; continue; }
      if (k && k !== cur) { close(); cur = k; start = x; last = x; cnt = 1; continue; }
      if (cur && x - last > 14) { close(); cur = null; }
    }
    close();
    rows.push(best);
  }
  const boxes = [];
  for (let y = 0; y < H; y++) {
    const r = rows[y]; if (!r) continue;
    const last = boxes[boxes.length - 1];
    const gapOk = (lb) => { for (let yy = lb.y1 + 1; yy < y; yy++) { let c = 0; for (let x = lb.a; x <= lb.b; x++) if (labelClass(px(x, yy)) === lb.k) c++; if (c < (lb.b - lb.a) * 0.12) return false; } return true; };
    if (last && last.k === r.k && y - last.y1 <= 7 && Math.abs(last.a - r.a) < 12 && gapOk(last)) { last.y1 = y; last.a = Math.min(last.a, r.a); last.b = Math.max(last.b, r.b); }
    else boxes.push({ k: r.k, y0: y, y1: y, a: r.a, b: r.b });
  }
  let labels = boxes.filter((b) => b.y1 - b.y0 >= 9 && b.y1 - b.y0 < 90 && b.b - b.a < W * 0.2);
  const hts = labels.map((b) => b.y1 - b.y0 + 1).sort((a, b) => a - b);
  const lh = hts.length ? hts[Math.floor(hts.length / 2)] : 18;
  // étiquettes collées : on coupe ; étiquettes hautes (prix + compte à rebours) : 1re ligne seulement
  const split = [];
  labels.forEach((b) => {
    const h = b.y1 - b.y0 + 1;
    if (h > lh * 1.6 && b.k !== "black") { const n = Math.round(h / lh); for (let i = 0; i < n; i++) split.push({ ...b, y0: b.y0 + Math.round(i * h / n), y1: b.y0 + Math.round((i + 1) * h / n) - 1 }); }
    else if (h > lh * 1.6) split.push({ ...b, y1: b.y0 + lh - 1, multi: true });
    else split.push(b);
  });
  labels = split;

  // 2) OCR des étiquettes
  const worker = await getOcrWorker();
  await worker.setParameters({ tessedit_char_whitelist: "0123456789.,", tessedit_pageseg_mode: "7" });
  const S = 4, PAD = 20;
  for (const L of labels) {
    const w = L.b - L.a + 1, h = L.y1 - L.y0 + 1; if (w < 10 || h < 6) continue;
    const c2 = document.createElement("canvas"); c2.width = w * S + PAD * 2; c2.height = h * S + PAD * 2;
    const g2 = c2.getContext("2d"); g2.fillStyle = "#fff"; g2.fillRect(0, 0, c2.width, c2.height);
    g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = "high"; g2.drawImage(cv, L.a, L.y0, w, h, PAD, PAD, w * S, h * S);
    const id = g2.getImageData(0, 0, c2.width, c2.height); const d = id.data;
    // texte blanc sur fond coloré → texte foncé sur fond clair (sans seuil : Tesseract binarise mieux)
    for (let i = 0; i < d.length; i += 4) { const v = 255 - (d[i] + d[i + 1] + d[i + 2]) / 3; d[i] = d[i + 1] = d[i + 2] = v; }
    for (let y = 0; y < c2.height; y++) for (let x = 0; x < c2.width; x++) if (x < PAD || y < PAD || x >= c2.width - PAD || y >= c2.height - PAD) { const i = (y * c2.width + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; }
    g2.putImageData(id, 0, 0);
    const { data } = await worker.recognize(c2);
    const t = String(data.text || "").replace(/\s/g, "").replace(/,/g, ".");
    const m = t.match(/\d+(\.\d+)?/); L.v = m ? parseFloat(m[0]) : null; L.txt = t;
    L.yc = (L.y0 + L.y1) / 2;
  }
  // décimales : si l'OCR a raté la virgule, on la remet d'après les autres étiquettes
  const withDot = labels.filter((l) => /\d\.\d/.test(l.txt || ""));
  const intD = withDot.length ? withDot.map((l) => l.txt.match(/(\d+)\./)[1].length).sort((a, b) => a - b)[Math.floor(withDot.length / 2)] : null;
  labels.forEach((l) => { const dg = String(l.txt || "").replace(/[^0-9]/g, ""); if (intD != null && l.v != null && !/\d\.\d/.test(l.txt) && dg.length > intD) { l.v = parseFloat(dg.slice(0, intD) + "." + dg.slice(intD)); l.fixed = true; } });
  // cohérence : une étiquette doit tomber sur la droite prix ↔ hauteur, sinon on l'ignore
  let cand = labels.filter((l) => l.v != null && isFinite(l.v));
  if (cand.length >= 3) {
    let bestIn = null;
    for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
      const A = cand[i], B = cand[j]; if (A.yc === B.yc) continue; const sl = (B.v - A.v) / (B.yc - A.yc); if (sl >= 0) continue;
      const tol = Math.abs(sl) * lh * 1.6; const inl = cand.filter((l) => Math.abs(l.v - (A.v + sl * (l.yc - A.yc))) <= tol);
      if (!bestIn || inl.length > bestIn.length) bestIn = inl;
    }
    if (bestIn && bestIn.length >= 2) cand = bestIn;
  }
  const valued = cand;
  // échelle prix ↔ y (moindres carrés)
  let fit = null;
  if (valued.length >= 2) {
    const n = valued.length, sx = valued.reduce((s, l) => s + l.yc, 0), sy = valued.reduce((s, l) => s + l.v, 0);
    const sxx = valued.reduce((s, l) => s + l.yc * l.yc, 0), sxy = valued.reduce((s, l) => s + l.yc * l.v, 0);
    const a = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1); const b = (sy - a * sx) / n; fit = (y) => a * y + b;
  }
  const priceAt = (y, kinds) => {
    const exp = fit ? fit(y) : null;
    const cands = valued.filter((l) => kinds.includes(l.k) && Math.abs(l.yc - y) < lh * 2.2);
    if (cands.length) {
      const pick = exp != null ? cands.sort((p, q) => Math.abs(p.v - exp) - Math.abs(q.v - exp))[0] : cands.sort((p, q) => Math.abs(p.yc - y) - Math.abs(q.yc - y))[0];
      return { v: pick.v, sure: true };
    }
    return exp != null ? { v: exp, sure: false } : null;
  };

  // 3) Zones de l'outil position (grille grossière + composantes connexes)
  const st = 3, gw = Math.ceil(W / st), gh = Math.ceil(H / st), grid = new Array(gw * gh).fill(null);
  const xmax = labels.length ? Math.min(...labels.map((l) => l.a)) - 4 : W;
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) { const x = gx * st, y = gy * st; if (x >= xmax || y >= H) continue; grid[gy * gw + gx] = zoneClass(px(x, y)); }
  const seen = new Uint8Array(gw * gh), comps = [];
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i] || seen[i]) continue;
    const k = grid[i]; const q = [i]; seen[i] = 1; let n = 0, ax = 1e9, bx = -1, ay = 1e9, by = -1;
    while (q.length) { const j = q.pop(); n++; const gx = j % gw, gy = (j / gw) | 0; ax = Math.min(ax, gx); bx = Math.max(bx, gx); ay = Math.min(ay, gy); by = Math.max(by, gy);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = gx + dx, ny = gy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const nj = ny * gw + nx; if (!seen[nj] && grid[nj] === k) { seen[nj] = 1; q.push(nj); } } }
    if (n > 60) comps.push({ k, n, x0: ax * st, x1: bx * st, y0: ay * st, y1: by * st });
  }
  // fusion des morceaux d'une même zone coupés par les bougies
  let merged = true;
  while (merged) { merged = false;
    for (let i = 0; i < comps.length && !merged; i++) for (let j = i + 1; j < comps.length && !merged; j++) {
      const A = comps[i], B = comps[j]; if (A.k !== B.k) continue;
      if (A.x0 <= B.x1 + 8 && B.x0 <= A.x1 + 8 && A.y0 <= B.y1 + 8 && B.y0 <= A.y1 + 8) { comps[i] = { k: A.k, n: A.n + B.n, x0: Math.min(A.x0, B.x0), x1: Math.max(A.x1, B.x1), y0: Math.min(A.y0, B.y0), y1: Math.max(A.y1, B.y1) }; comps.splice(j, 1); merged = true; }
    } }
  const big = comps.filter((c) => (c.x1 - c.x0) > 25 && (c.y1 - c.y0) > 8);
  const ovx = (A, B) => Math.max(0, Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0)) / Math.max(1, Math.min(A.x1 - A.x0, B.x1 - B.x0));
  const trades = [];
  const reds = big.filter((c) => c.k === "zr");
  big.filter((c) => c.k === "zg").forEach((T) => {
    const R = reds.filter((r) => ovx(T, r) > 0.5 && Math.abs(r.y0 - T.y1) < 12).sort((a, b) => Math.abs(a.y0 - T.y1) - Math.abs(b.y0 - T.y1))[0];
    if (!R) return; trades.push({ direction: "long", x0: Math.min(T.x0, R.x0), x1: Math.max(T.x1, R.x1), yTP: T.y0, yE: (T.y1 + R.y0) / 2, ySL: R.y1 + st });
  });
  big.filter((c) => c.k === "zb").forEach((B) => {
    const R = reds.filter((r) => ovx(B, r) > 0.5 && Math.abs(r.y1 - B.y0) < 12).sort((a, b) => Math.abs(a.y1 - B.y0) - Math.abs(b.y1 - B.y0))[0];
    if (!R) return; trades.push({ direction: "short", x0: Math.min(B.x0, R.x0), x1: Math.max(B.x1, R.x1), ySL: R.y0, yE: (R.y1 + B.y0) / 2, yTP: B.y1 + st });
  });

  // 4) En-tête : paire, unité de temps, date de la capture
  let pair = null, timeframe = null, shotDate = null;
  try {
    await worker.setParameters({ tessedit_char_whitelist: "", tessedit_pageseg_mode: "6" });
    const hc = document.createElement("canvas"); const hh = Math.min(90, Math.floor(H * 0.12)), hw = Math.floor(W * 0.6);
    hc.width = hw * 2; hc.height = hh * 2; const hg = hc.getContext("2d"); hg.drawImage(cv, 0, 0, hw, hh, 0, 0, hw * 2, hh * 2);
    const { data } = await worker.recognize(hc); const txt = String(data.text || "");
    const up = txt.toUpperCase().replace(/[^A-Z0-9·.\s:,]/g, " ");
    const inst = [...instruments].sort((a, b) => b.length - a.length);
    pair = inst.find((p) => up.includes(p)) || null;
    if (!pair) { const tok = (up.match(/\b[A-Z]{4,6}\b/g) || []); for (const t of tok) { const hit = inst.find((p) => p.endsWith(t) && t.length >= 4); if (hit) { pair = hit; break; } } }
    const tf = txt.match(/(?:^|[\s·•.\-])(\d{1,3}\s?(?:min|[mhHDWMS]))\s*[·•.\-]/); if (tf) timeframe = tvTf(tf[1]);
    // format TradingView « EURUSD · 15 · OANDA » : un nombre seul = minutes
    if (!timeframe) { const t2 = txt.match(/[A-Z]{3,}[\/]?[A-Z]*\s*[·•.\-–»,:|]{1,3}\s*(\d{1,3}[mhHDWM]?|[DWM])\s*[·•.\-–»,:|]{1,3}\s*[A-Z]/); if (t2) timeframe = tvTf(t2[1]); }
    const dm = txt.match(/([A-Za-zéû]{3,5})\.?\s+(\d{1,2}),?\s+(20\d\d)/);
    if (dm) { const mo = MONTH_EN[dm[1].toLowerCase().slice(0, 3)] ?? MONTHS_FR[dm[1].toLowerCase()]; if (mo != null) shotDate = new Date(+dm[3], mo, +dm[2]); }
  } catch (e) {}

  // 5) Axe du temps : date de l'entrée (bord gauche de l'outil)
  let dateAt = null, intraday = false;
  try {
    await worker.setParameters({ tessedit_char_whitelist: "", tessedit_pageseg_mode: "11" });
    // ligne du bas avec les mois : on cherche la bande de texte gris sous le graphique
    const by0 = Math.floor(H * 0.84), bh = Math.floor(H * 0.12);
    const bc = document.createElement("canvas"); bc.width = W * 2; bc.height = bh * 2; const bg = bc.getContext("2d"); bg.drawImage(cv, 0, by0, W, bh, 0, 0, W * 2, bh * 2);
    const { data } = await worker.recognize(bc);
    const words = (data.words || []).map((w) => ({ t: String(w.text || "").toLowerCase().replace(/[^a-zéûô0-9]/g, ""), x: (w.bbox.x0 + w.bbox.x1) / 4 })).filter((w) => w.t);
    const marks = [];
    words.forEach((w) => { if (/^(19|20)\d\d$/.test(w.t)) marks.push({ x: w.x, m: 0, y: +w.t }); else { const k = Object.keys(MONTHS_FR).find((k) => w.t === k || (w.t.length >= 3 && w.t.startsWith(k))); if (k != null) marks.push({ x: w.x, m: MONTHS_FR[k], y: null }); } });
    marks.sort((a, b) => a.x - b.x);
    // graphique intraday : heures (21:00) + numéros de jour (31) + mois (Juin = le 1er)
    const raw = (data.words || []).map((w) => ({ t: String(w.text || "").trim(), x: (w.bbox.x0 + w.bbox.x1) / 4 }));
    const hrs = raw.filter((w) => /^\d{1,2}[:.]\d{2}$/.test(w.t)).map((w) => ({ x: w.x, h: +w.t.split(/[:.]/)[0], mi: +w.t.split(/[:.]/)[1] })).filter((w) => w.h < 24 && w.mi < 60);
    if (hrs.length >= 2) {
      const yr0 = (marks.find((m) => m.y != null) || {}).y || (baseDate ? +String(baseDate).slice(0, 4) : (shotDate ? shotDate.getFullYear() : new Date().getFullYear()));
      const days = [];
      raw.forEach((w) => { const t = w.t.toLowerCase().replace(/[^a-zéûô0-9]/g, "");
        if (/^\d{1,2}$/.test(w.t) && +w.t >= 1 && +w.t <= 31) days.push({ x: w.x, d: +w.t, m: null });
        else { const k = Object.keys(MONTHS_FR).find((k) => t === k || (t.length >= 3 && t.startsWith(k))); if (k != null) days.push({ x: w.x, d: 1, m: MONTHS_FR[k] }); } });
      days.sort((a, b) => a.x - b.x);
      if (days.length) {
        let mi = days.findIndex((d) => d.m != null); const yr = yr0;
        if (mi < 0) { const bd = baseDate ? new Date(baseDate + "T12:00:00") : (shotDate || new Date()); days[0].m = bd.getMonth(); mi = 0; }
        days[mi].y = yr;
        for (let i = mi + 1; i < days.length; i++) { const p = days[i - 1]; if (days[i].m == null) days[i].m = days[i].d < p.d ? (p.m + 1) % 12 : p.m; days[i].y = p.y + (days[i].m < p.m ? 1 : 0); }
        for (let i = mi - 1; i >= 0; i--) { const n = days[i + 1]; if (days[i].m == null) days[i].m = days[i].d > n.d || n.d === 1 ? (n.m + 11) % 12 : n.m; days[i].y = n.y - (days[i].m > n.m ? 1 : 0); }
        const pts = days.map((d) => ({ x: d.x, t: new Date(d.y, d.m, d.d, 0, 0).getTime() }));
        hrs.forEach((h) => { const L = [...days].reverse().find((d) => d.x < h.x); const base = L ? new Date(L.y, L.m, L.d) : new Date(days[0].y, days[0].m, days[0].d - 1); pts.push({ x: h.x, t: new Date(base.getFullYear(), base.getMonth(), base.getDate(), h.h, h.mi).getTime() }); });
        pts.sort((a, b) => a.x - b.x);
        if (pts.length >= 2) { intraday = true; dateAt = (x) => { let a = pts[0], b = pts[1]; for (let i = 0; i < pts.length - 1; i++) if (x >= pts[i].x) { a = pts[i]; b = pts[i + 1]; } return new Date(a.t + (x - a.x) * (b.t - a.t) / (b.x - a.x || 1)); }; }
      }
    }
    if (!dateAt && marks.length >= 2) {
      // années : on part d'une année lue sur l'axe, sinon de la date de la capture
      let ai = marks.findIndex((m) => m.y != null);
      if (ai < 0 && shotDate) { const sm = shotDate.getMonth(); ai = marks.map((m, i) => [i, m]).filter(([i, m]) => m.m <= sm).map(([i]) => i).pop() ?? 0; marks[ai].y = shotDate.getFullYear(); }
      if (ai >= 0) {
        for (let i = ai + 1; i < marks.length; i++) if (marks[i].y == null) marks[i].y = marks[i - 1].y + (marks[i].m <= marks[i - 1].m ? 1 : 0);
        for (let i = ai - 1; i >= 0; i--) if (marks[i].y == null) marks[i].y = marks[i + 1].y - (marks[i].m >= marks[i + 1].m ? 1 : 0);
        const pts = marks.map((m) => ({ x: m.x, t: new Date(m.y, m.m, 1).getTime() }));
        dateAt = (x) => { let a = pts[0], b = pts[1]; for (let i = 0; i < pts.length - 1; i++) { if (x >= pts[i].x) { a = pts[i]; b = pts[i + 1]; } } const t = a.t + (x - a.x) * (b.t - a.t) / (b.x - a.x || 1); return new Date(t); };
      }
    }
  } catch (e) {}

  const dec = (v) => { const s = valued.map((l) => (String(l.txt).split(".")[1] || "").length); return s.length ? Math.max(...s) : 5; };
  const nd = dec();
  const round = (v) => v == null ? null : +v.toFixed(nd);
  // Lecture par les étiquettes de l'axe (entrée = noire, TP = verte/bleue, SL = rouge) : sûre même si des zones (FVG, OB…) recouvrent l'outil
  const one = (k) => { const l = valued.filter((x) => x.k === k); return l.length === 1 ? l[0] : null; };
  const lRed = one("red"), lTp = one("teal") || one("blue");
  let lab = null;
  if (lRed && lTp) {
    const lo = Math.min(lRed.yc, lTp.yc), hi = Math.max(lRed.yc, lTp.yc);
    const lE = valued.filter((x) => x.k === "black" && x.yc > lo && x.yc < hi).sort((a, b) => Math.abs(a.yc - (lo + hi) / 2) - Math.abs(b.yc - (lo + hi) / 2))[0];
    if (lE) {
      const dirL = lTp.v > lE.v ? "long" : "short";
      if ((dirL === "long" && lRed.v < lE.v) || (dirL === "short" && lRed.v > lE.v)) {
        const zx = comps.filter((c) => c.y0 <= Math.max(lE.yc, lTp.yc) + lh && c.y1 >= Math.min(lE.yc, lTp.yc) - lh && (c.k === (dirL === "long" ? "zg" : "zb")) && (c.x1 - c.x0) > 25).sort((a, b) => b.n - a.n)[0];
        lab = { direction: dirL, e: lE.v, s: lRed.v, p: lTp.v, x0: zx ? zx.x0 : null };
      }
    }
  }
  if (!trades.length && lab) trades.push({ direction: lab.direction, x0: lab.x0, yE: 0, ySL: 0, yTP: 0, lab: true });
  const out = trades.map((t) => {
    let E = priceAt(t.yE, ["black"]), SL = priceAt(t.ySL, ["red"]), TP = priceAt(t.yTP, t.direction === "long" ? ["teal"] : ["blue"]);
    // une seule position avec ses 3 étiquettes visibles → les étiquettes priment
    if (lab && lab.direction === t.direction && (t.lab || trades.length === 1)) { E = { v: lab.e, sure: true }; SL = { v: lab.s, sure: true }; TP = { v: lab.p, sure: true }; }
    const e = E && round(E.v), s = SL && round(SL.v), p = TP && round(TP.v);
    const rr = e != null && s != null && p != null && Math.abs(e - s) > 0 ? Math.abs(p - e) / Math.abs(e - s) : null;
    const d = dateAt && t.x0 != null ? dateAt(t.x0) : null; const z2 = (n) => String(n).padStart(2, "0");
    return { direction: t.direction, entryPrice: e, stopLoss: s, takeProfit: p, riskReward: rr != null ? +rr.toFixed(2) : null,
      sure: { entry: !!(E && E.sure), sl: !!(SL && SL.sure), tp: !!(TP && TP.sure) }, date: d && !isNaN(d) ? ymd(d) : null, time: intraday && d && !isNaN(d) ? z2(d.getHours()) + ":" + z2(Math.round(d.getMinutes() / 5) * 5 % 60) : null, x0: t.x0 || 0 };
  }).filter((t) => t.entryPrice != null).sort((a, b) => b.x0 - a.x0);
  return { pair, timeframe, shotDate: shotDate ? ymd(shotDate) : null, trades: out, labels: labels.map((l) => ({ k: l.k, v: l.v, t: l.txt, a: l.a, b: l.b, y0: l.y0, y1: l.y1 })) };
}

/* ============================================================================
   BACKTESTING 2010 → 2025 — saisie express + lecture auto des screenshots
   ============================================================================ */
const BT_ACC = "__backtest__";
const BT_YEARS = Array.from({ length: new Date().getFullYear() - 2009 }, (_, i) => 2010 + i);
function btAddDays(d, n) { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return ymd(x); }
function btClampDate(d) { if (!d) return d; if (d < "2010-01-01") return "2010-01-01"; if (d > "2025-12-31") return "2025-12-31"; return d; }
function btAgg(list) {
  const n = list.length, w = list.filter((t) => (t.resultR || 0) > 0).length, l = list.filter((t) => (t.resultR || 0) < 0).length;
  const R = list.reduce((s, t) => s + (t.resultR || 0), 0);
  const gw = list.filter((t) => t.resultR > 0).reduce((s, t) => s + t.resultR, 0), gl = Math.abs(list.filter((t) => t.resultR < 0).reduce((s, t) => s + t.resultR, 0));
  let peak = 0, cur = 0, dd = 0; [...list].sort((a, b) => String(a.entryTime).localeCompare(String(b.entryTime))).forEach((t) => { cur += t.resultR || 0; peak = Math.max(peak, cur); dd = Math.min(dd, cur - peak); });
  return { n, w, l, wr: w + l ? w / (w + l) * 100 : 0, R, avg: n ? R / n : 0, pf: gl ? gw / gl : (gw ? Infinity : 0), dd };
}

/* ============================================================================
   BOT DE BACKTEST — prend automatiquement les zones ICT selon tes filtres
   (résultats à part : rien n'est envoyé dans Saisie & stats ni dans Supabase)
   ============================================================================ */
const BOT_TFS = [["M15", 15], ["H1", 60], ["H4", 240], ["D", 1440]];
const BOT_CFG0 = {
  bisi: true, sibi: true, ob: false, bb: false, /* setups (toujours au 1er contact) */
  tfs: [60],                                    /* timeframes des zones */
  trend: true, trendTf: 240,                    /* dans le sens de la tendance */
  fresh: true,                                  /* zone jamais touchée avant l'entrée */
  ote: "none",                                  /* none | discount | ote */
  nest: false, nestTf: 240,                     /* zone dans un FVG du timeframe supérieur */
  kz: false,                                    /* entrée seulement en killzone (London / New York) */
  entry: "edge",                                /* edge = bord de la zone, ce = milieu (CE) */
  rr: 2, be: true, buf: 1, maxSl: 40, minSl: 3, expire: 60, one: true,
  y0: 2010, y1: 2026,
};
function botLoadCfg() { try { const v = { ...BOT_CFG0, ...JSON.parse(localStorage.getItem("tjp_bot_cfg") || "{}") }; v.fresh = true; if (v.fvg !== undefined && v.bisi === undefined) { v.bisi = v.sibi = !!v.fvg; } return v; } catch (e) { return BOT_CFG0; } }

/* swings confirmés (3 bougies de chaque côté) et tendance de structure, sans regarder le futur */
function botStructure(B) {
  const n = 3, N = B.length, lastSH = new Array(N).fill(null), lastSL = new Array(N).fill(null), trend = new Array(N).fill(0);
  let sh = null, sl = null, tr = 0, usedH = false, usedL = false;
  for (let i = 0; i < N; i++) {
    const c = i - n; /* le swing en c est confirmé à la clôture de i */
    if (c >= n) {
      let hi = true, lo = true;
      for (let j = 1; j <= n; j++) { if (B[c].high <= B[c - j].high || B[c].high < B[c + j].high) hi = false; if (B[c].low >= B[c - j].low || B[c].low > B[c + j].low) lo = false; }
      if (hi) { sh = B[c].high; usedH = false; } if (lo) { sl = B[c].low; usedL = false; }
    }
    if (sh !== null && !usedH && B[i].close > sh) { tr = 1; usedH = true; }
    if (sl !== null && !usedL && B[i].close < sl) { tr = -1; usedL = true; }
    lastSH[i] = sh; lastSL[i] = sl; trend[i] = tr;
  }
  return { lastSH, lastSL, trend };
}
/* zones d'un timeframe : FVG (BISI / SIBI), order blocks clairs (avec displacement + FVG), breakers */
function botZones(Z, cfg) {
  const B = Z.bars, out = [], minGap = 0.5 * TV_PIP * Math.sqrt(Z.min / 15), obsBear = [], obsBull = [];
  const body = (b) => Math.abs(b.close - b.open);
  /* gap fort : la bougie du milieu est un vrai displacement (corps ≥ 1,5 × le corps moyen des 10 bougies d'avant) */
  const strong = (i) => { let s = 0, n = 0; for (let j = Math.max(0, i - 11); j < i - 1; j++) { s += body(B[j]); n++; } return n && body(B[i - 1]) >= 1.5 * (s / n); };
  const lastOpp = (i, bull) => { for (let j = i - 1; j >= Math.max(0, i - 5); j--) if (bull ? B[j].close < B[j].open : B[j].close > B[j].open) return j; return -1; };
  for (let i = 2; i < B.length - 1; i++) {
    const bullF = B[i].low - B[i - 2].high >= minGap && strong(i), bearF = B[i - 2].low - B[i].high >= minGap && strong(i);
    if (bullF && (cfg.bisi || cfg.fvg)) out.push({ dir: 1, kind: "BISI", top: B[i].low, bot: B[i - 2].high, form: i });
    if (bearF && (cfg.sibi || cfg.fvg)) out.push({ dir: -1, kind: "SIBI", top: B[i - 2].low, bot: B[i].high, form: i });
    if (bullF) { const o = lastOpp(i - 1, true); if (o >= 0 && B[i].close > B[o].high) { if (cfg.ob) out.push({ dir: 1, kind: "OB", top: B[o].high, bot: B[o].low, form: i }); obsBull.push({ i: o, top: B[o].high, bot: B[o].low, at: i }); } }
    if (bearF) { const o = lastOpp(i - 1, false); if (o >= 0 && B[i].close < B[o].low) { if (cfg.ob) out.push({ dir: -1, kind: "OB", top: B[o].high, bot: B[o].low, form: i }); obsBear.push({ i: o, top: B[o].high, bot: B[o].low, at: i }); } }
    if (cfg.bb) { /* breaker : un OB cassé à la clôture change de camp */
      for (let k = obsBear.length - 1; k >= 0; k--) { const ob = obsBear[k]; if (i - ob.at > 100) { obsBear.splice(k, 1); continue; } if (i > ob.at && B[i].close > ob.top) { out.push({ dir: 1, kind: "BB", top: ob.top, bot: ob.bot, form: i }); obsBear.splice(k, 1); } }
      for (let k = obsBull.length - 1; k >= 0; k--) { const ob = obsBull[k]; if (i - ob.at > 100) { obsBull.splice(k, 1); continue; } if (i > ob.at && B[i].close < ob.bot) { out.push({ dir: -1, kind: "BB", top: ob.top, bot: ob.bot, form: i }); obsBull.splice(k, 1); } }
    }
  }
  return out;
}
const botKz = (t) => { const loc = t + tvNyOff(t), m = Math.floor((((loc % 86400) + 86400) % 86400) / 60); return (m >= 120 && m < 300) || (m >= 420 && m < 600); }; /* comme le guide : London 2h-5h, NY AM 7h-10h (heure de New York) */

function botRun(rows, cfg) {
  const aggs = {}, get = (m) => (aggs[m] = aggs[m] || tvBuild(rows, m, true));
  const T = get(cfg.trendTf), TS = botStructure(T.bars);
  const trendAt = (t) => { const k = tvBsBars(T.bars, t) - 1; return k >= 0 ? TS.trend[k] : 0; };
  const rowEnd = (Z, i) => (i + 1 < Z.start.length ? Z.start[i + 1] : rows.length);
  /* FVG du timeframe supérieur, valides jusqu'à une clôture au-delà */
  let htf = [];
  if (cfg.nest) {
    const H = get(cfg.nestTf), hz = botZones(H, { fvg: true });
    htf = hz.map((z) => { const act = rowEnd(H, z.form); let inv = rows.length; for (let j = act; j < rows.length && j < act + 20000; j++) { const c = rows[j][4]; if (z.dir > 0 ? c < z.bot : c > z.top) { inv = j; break; } } return { ...z, act, inv }; });
  }
  const t0 = Date.UTC(cfg.y0, 0, 1) / 1000, t1 = Date.UTC(cfg.y1 + 1, 0, 1) / 1000;
  const cands = [];
  for (const tfm of cfg.tfs) {
    const Z = get(tfm), ZS = botStructure(Z.bars), zones = botZones(Z, cfg), expRows = Math.round(cfg.expire * tfm / 15);
    for (const z of zones) {
      const act = rowEnd(Z, z.form); if (act >= rows.length) continue; const tAct = rows[act][0]; if (tAct < t0 || tAct >= t1) continue;
      if (cfg.trend && trendAt(tAct) !== z.dir) continue;
      const entry = cfg.entry === "ce" ? (z.top + z.bot) / 2 : z.dir > 0 ? z.top : z.bot;
      if (cfg.ote !== "none") {
        const hi = ZS.lastSH[z.form], lo = ZS.lastSL[z.form]; if (hi == null || lo == null || hi <= lo) continue;
        const pos = (entry - lo) / (hi - lo); /* 0 = bas du range, 1 = haut */
        if (cfg.ote === "discount" && (z.dir > 0 ? pos > 0.5 : pos < 0.5)) continue;
        if (cfg.ote === "ote" && (z.dir > 0 ? pos < 0.21 || pos > 0.38 : pos < 0.62 || pos > 0.79)) continue; /* retracement 62 % – 79 % */
      }
      if (cfg.nest && !htf.some((h) => h.dir === z.dir && h.act <= act && h.inv > act && z.bot <= h.top && z.top >= h.bot)) continue;
      const sl = z.dir > 0 ? z.bot - cfg.buf * TV_PIP : z.top + cfg.buf * TV_PIP, risk = Math.abs(entry - sl);
      if (risk < cfg.minSl * TV_PIP || risk > cfg.maxSl * TV_PIP) continue;
      const tp = entry + z.dir * risk * cfg.rr;
      /* 1er contact avec la zone : c'est la seule chance (zone jamais touchée) */
      let fill = -1;
      for (let j = act; j < Math.min(rows.length, act + expRows); j++) {
        const [, , h, l, c] = rows[j];
        const touched = z.dir > 0 ? l <= z.top : h >= z.bot;
        if (touched) { const reach = z.dir > 0 ? l <= entry : h >= entry; if (reach && (!cfg.kz || botKz(rows[j][0]))) fill = j; break; } /* toujours le 1er contact : après, la zone est consommée */
        if (z.dir > 0 ? c < sl : c > sl) break;
      }
      if (fill < 0) continue;
      /* gestion : SL prioritaire si SL et TP dans la même bougie ; BE automatique à 50 % du TP */
      let s = sl, out = -1, exit = 0, why = "", be = false;
      for (let j = fill; j < Math.min(rows.length, fill + 6000); j++) {
        const [, , h, l] = rows[j];
        if (z.dir > 0 ? l <= s : h >= s) { out = j; exit = s; why = be ? "BE" : "SL"; break; }
        if (j > fill && (z.dir > 0 ? h >= tp : l <= tp)) { out = j; exit = tp; why = "TP"; break; }
        if (cfg.be && !be && j > fill && (z.dir > 0 ? h >= entry + (tp - entry) * 0.5 : l <= entry - (entry - tp) * 0.5)) { s = entry; be = true; }
      }
      if (out < 0) continue;
      const r = ((exit - entry) * z.dir) / risk;
      cands.push({ kind: z.kind, tf: TV_TFLAB[tfm], dir: z.dir, top: z.top, bot: z.bot, formT: Z.bars[z.form].time, fill, out, t: rows[fill][0], tOut: rows[out][0], entry, sl, tp, r: Math.abs(r) <= 0.1 ? 0 : r, why, pips: ((exit - entry) * z.dir) / TV_PIP });
    }
  }
  cands.sort((a, b) => a.fill - b.fill);
  const trades = []; let busy = -1;
  for (const c of cands) { if (cfg.one && c.fill <= busy) continue; trades.push(c); busy = Math.max(busy, c.out); }
  return trades;
}
function botAgg(l) {
  const n = l.length, w = l.filter((t) => t.r > 0).length, lo = l.filter((t) => t.r < 0).length, R = l.reduce((a, t) => a + t.r, 0);
  const gw = l.filter((t) => t.r > 0).reduce((a, t) => a + t.r, 0), gl = -l.filter((t) => t.r < 0).reduce((a, t) => a + t.r, 0);
  let pk = 0, cur = 0, dd = 0, ls = 0, mls = 0; l.forEach((t) => { cur += t.r; pk = Math.max(pk, cur); dd = Math.min(dd, cur - pk); ls = t.r < 0 ? ls + 1 : 0; mls = Math.max(mls, ls); });
  return { n, w, lo, be: n - w - lo, wr: w + lo ? (w / (w + lo)) * 100 : 0, R, avg: n ? R / n : 0, pf: gl ? gw / gl : gw ? Infinity : 0, dd, mls };
}

function BacktestBot() {
  const [cfg, setCfgS] = useState(botLoadCfg);
  const setCfg = (p) => setCfgS((o) => { const v = { ...o, ...p }; try { localStorage.setItem("tjp_bot_cfg", JSON.stringify(v)); } catch (e) {} return v; });
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(() => { try { return JSON.parse(localStorage.getItem("tjp_bot_res") || "null"); } catch (e) { return null; } });
  useEffect(() => { /* si le navigateur n'a rien (autre appareil), on reprend le dernier calcul enregistré dans Supabase */
    if (res) return; try { const c = JSON.parse(localStorage.getItem("tjp_bot_remote") || "null"); if (c && c.t) setRes({ at: c.at, cfg: c.cfg, ms: 0, trades: c.t.map((a) => ({ t: a[0], tOut: a[1], dir: a[2], kind: a[3], tf: a[4], entry: a[5], sl: a[6], tp: a[7], r: a[8], why: a[9], formT: a[10], top: a[11], bot: a[12] })) }); } catch (e) {}
  }, []);
  const [show, setShow] = useState(60);
  useEffect(() => { tvAutoLoad().then((r) => setRows(r && r.length ? r : null)); }, []);
  const run = () => {
    if (!rows) return; setBusy(true);
    setTimeout(() => {
      const t0 = performance.now(); const trades = botRun(rows, cfg);
      const r = { at: Date.now(), ms: Math.round(performance.now() - t0), cfg, trades: trades.map((t) => ({ ...t, fill: undefined, out: undefined })) };
      setRes(r); setShow(60); try { localStorage.setItem("tjp_bot_res", JSON.stringify(r)); } catch (e) {} setBusy(false);
      try { /* Supabase : dernier calcul en version compacte (1 seule écriture) */
        const cmp = { at: r.at, cfg: r.cfg, t: r.trades.map((x) => [x.t, x.tOut, x.dir, x.kind, x.tf, +x.entry.toFixed(5), +x.sl.toFixed(5), +x.tp.toFixed(5), +x.r.toFixed(2), x.why, x.formT, +x.top.toFixed(5), +x.bot.toFixed(5)]) };
        saveSettingsPatch({ bot_runs: cmp });
      } catch (e) {}
    }, 30);
  };
  const T = (res && res.trades) || [], A = botAgg(T);
  const group = (fn) => { const m = {}; T.forEach((t) => { const k = fn(t); (m[k] = m[k] || []).push(t); }); return Object.entries(m).map(([k, l]) => ({ k, ...botAgg(l) })).sort((a, b) => b.R - a.R); };
  const curve = useMemo(() => { let c = 0; return T.map((t, i) => ({ i: i + 1, r: +(c += t.r).toFixed(2) })); }, [res]);
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 12 };
  const chip = (on) => ({ padding: "7px 12px", borderRadius: 10, border: `1px solid ${on ? C.purple : C.border}`, background: on ? C.purple + "26" : "transparent", color: on ? C.purpleBright : C.textSecondary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
  const lab = { fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.6, margin: "12px 0 6px" };
  const ck = (k, label) => <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.text, cursor: "pointer", padding: "3px 0" }}><input type="checkbox" checked={!!cfg[k]} onChange={(e) => setCfg({ [k]: e.target.checked })} style={{ width: 16, height: 16, accentColor: C.purple }} />{label}</label>;
  const tfChips = (k, multi) => BOT_TFS.map(([n, m]) => { const on = multi ? cfg[k].includes(m) : cfg[k] === m; return <button key={n} onClick={() => setCfg({ [k]: multi ? (on ? cfg[k].filter((x) => x !== m) : [...cfg[k], m]).filter(Boolean) : m })} style={chip(on)}>{n}</button>; });
  const yrs = Array.from({ length: new Date().getFullYear() - 2009 }, (_, i) => 2010 + i);
  const Tbl = ({ title, rows: rs }) => rs.length < 1 ? null : (
    <div style={{ ...card, marginBottom: 0 }}><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 46px 52px 70px", gap: 6, fontSize: 11.5, color: C.textMuted, fontWeight: 600 }}><span /><span style={{ textAlign: "center" }}>N</span><span style={{ textAlign: "center" }}>WR</span><span style={{ textAlign: "right" }}>Total</span></div>
      {rs.map((r) => <div key={r.k} style={{ display: "grid", gridTemplateColumns: "1fr 46px 52px 70px", gap: 6, padding: "7px 0", borderTop: `1px solid ${C.border}`, fontSize: 13.5, opacity: r.n < 10 ? 0.5 : 1 }}>
        <b>{r.k}</b><span style={{ textAlign: "center", color: C.textMuted }}>{r.n}</span><span style={{ textAlign: "center", color: r.wr >= 50 ? C.teal : C.red, fontWeight: 700 }}>{Math.round(r.wr)}%</span><span style={{ textAlign: "right", fontWeight: 800, color: r.R >= 0 ? C.teal : C.red }}>{fmtR(r.R)}</span></div>)}
    </div>);
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "8px 0 120px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Bot de backtest</h1>
        <span style={{ fontSize: 13, color: C.textMuted }}>Données à part · rien n'est ajouté à Saisie & stats</span>
      </div>
      <div style={card}>
        {/* schéma : comment le bot prend un trade */}
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
          <svg width="275" height="150" viewBox="0 0 275 150" style={{ flexShrink: 0 }} aria-label="Schéma d'un trade du bot">
            <rect x="20" y="70" width="170" height="30" fill={C.teal} fillOpacity="0.18" stroke={C.teal} />
            <text x="185" y="89" textAnchor="end" fontSize="11" fontWeight="700" fill={C.teal}>BISI H1</text>
            <line x1="20" x2="230" y1="70" y2="70" stroke={C.text} strokeDasharray="4 3" /><text x="232" y="74" fontSize="10.5" fill={C.text}>Entrée</text>
            <line x1="20" x2="230" y1="108" y2="108" stroke={C.red} /><text x="232" y="112" fontSize="10.5" fill={C.red}>SL</text>
            <line x1="20" x2="230" y1="20" y2="20" stroke={C.teal} /><text x="232" y="24" fontSize="10.5" fill={C.teal}>TP</text>
            <text x="22" y="122" fontSize="10" fill={C.textMuted}>SL derrière la zone + marge</text>
            <text x="22" y="16" fontSize="10" fill={C.textMuted}>TP = risque × R choisi</text>
          </svg>
          <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.55, flex: 1, minWidth: 240 }}>
            Le bot repère chaque zone choisie, attend que le prix y revienne <b>pour la première fois</b>, entre au bord (ou au milieu), place son <b>SL derrière la zone</b> et son TP au ratio choisi. Il achète dans les zones haussières (BISI, OB et breaker haussiers) et vend dans les zones baissières (SIBI, OB et breaker baissiers).
          </div>
        </div>

        <div style={lab}>1 · Quelles zones ?</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["bisi", "BISI"], ["sibi", "SIBI"], ["ob", "Order block"], ["bb", "Breaker"]].map(([k, n]) => <button key={k} onClick={() => setCfg({ [k]: !cfg[k] })} style={chip(cfg[k])}>{n}</button>)}
        </div>

        <div style={lab}>2 · Sur quel timeframe ?</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{tfChips("tfs", true)}</div>

        <div style={lab}>3 · Filtres (facultatifs)</div>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            {ck("trend", "Suivre la tendance")}
            <div style={{ fontSize: 12.5, color: C.textMuted, margin: "0 0 4px 24px" }}>Achète seulement si la tendance est haussière (dernière cassure vers le haut), vend seulement si elle est baissière. Tendance lue sur :</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: 24, opacity: cfg.trend ? 1 : 0.4 }}>{tfChips("trendTf", false)}</div>
          </div>
          <div>
            <div style={{ fontSize: 14, color: C.text, marginBottom: 4 }}>Où doit se trouver la zone dans le range ?</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[["none", "Peu importe"], ["discount", "Discount / premium"], ["ote", "Zone OTE"]].map(([k, n]) => <button key={k} onClick={() => setCfg({ ote: k })} style={chip(cfg.ote === k)}>{n}</button>)}
            </div>
            <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>{cfg.ote === "none" ? "Toutes les zones sont prises." : cfg.ote === "discount" ? "Achat seulement sous le milieu du dernier swing (discount), vente seulement au-dessus (premium)." : "Achat seulement entre 62 % et 79 % de retracement du dernier swing (vente : l'inverse), comme dans le guide."}</div>
          </div>
          <div>
            {ck("nest", "La zone doit être dans un FVG plus grand")}
            <div style={{ fontSize: 12.5, color: C.textMuted, margin: "0 0 4px 24px" }}>Ex. un BISI H1 pris seulement s'il est à l'intérieur d'un BISI encore valide du timeframe :</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: 24, opacity: cfg.nest ? 1 : 0.4 }}>{tfChips("nestTf", false)}</div>
          </div>
          <div>{ck("kz", "Entrer seulement pendant les killzones")}<div style={{ fontSize: 12.5, color: C.textMuted, marginLeft: 24 }}>London 2h-5h et New York 7h-10h (heure de New York).</div></div>
        </div>

        <div style={lab}>4 · Entrée et sortie</div>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 14, minWidth: 70 }}>Entrée</span>{[["edge", "Au bord de la zone"], ["ce", "Au milieu (CE)"]].map(([k, n]) => <button key={k} onClick={() => setCfg({ entry: k })} style={chip(cfg.entry === k)}>{n}</button>)}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 14 }}><span style={{ minWidth: 70 }}>Stop</span>derrière la zone + <input type="number" step="0.5" value={cfg.buf} onChange={(e) => setCfg({ buf: Math.max(0, +e.target.value || 0) })} style={{ width: 56, height: 32, padding: "0 6px", fontSize: 13 }} /> pip de marge</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}><span style={{ fontSize: 14, minWidth: 70 }}>Objectif</span>{[1, 1.5, 2, 3, 4].map((v) => <button key={v} onClick={() => setCfg({ rr: v })} style={chip(cfg.rr === v)}>{String(v).replace(".", ",")}R</button>)}</div>
          {ck("be", "Passer le SL à l'entrée (BE) quand le prix a fait la moitié du chemin vers le TP")}
          {ck("one", "Une seule position à la fois")}
          <div style={{ fontSize: 14, color: C.text }}>Ignorer les zones trop grandes : SL de plus de <input type="number" value={cfg.maxSl} onChange={(e) => setCfg({ maxSl: +e.target.value || 40 })} style={{ width: 58, height: 32, padding: "0 6px", fontSize: 13 }} /> pips</div>
        </div>

        <div style={lab}>5 · Période</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select value={cfg.y0} onChange={(e) => setCfg({ y0: +e.target.value })} style={{ height: 34, fontSize: 13 }}>{yrs.map((y) => <option key={y}>{y}</option>)}</select> →
          <select value={cfg.y1} onChange={(e) => setCfg({ y1: +e.target.value })} style={{ height: 34, fontSize: 13 }}>{yrs.map((y) => <option key={y}>{y}</option>)}</select>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
          <button disabled={!rows || busy || !cfg.tfs.length || !(cfg.bisi || cfg.sibi || cfg.ob || cfg.bb)} onClick={run} style={{ padding: "11px 22px", borderRadius: 12, border: "none", background: C.purple, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: !rows || busy ? 0.5 : 1, fontFamily: "inherit" }}>{busy ? "Calcul en cours…" : "Lancer le bot"}</button>
          <button disabled={!rows} onClick={() => window.dispatchEvent(new CustomEvent("tjp-bot-live"))} style={{ padding: "11px 18px", borderRadius: 12, border: `1px solid ${C.purple}`, background: "transparent", color: C.purpleBright, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>▶ Regarder le bot en replay</button>
          <span style={{ fontSize: 12.5, color: C.textMuted }}>{rows ? rows.length.toLocaleString("fr-CA") + " bougies réelles EURUSD M15" : "Aucune donnée réelle : ouvre l'onglet Graphique pour les charger"}{res ? ` · dernier calcul : ${res.trades.length} trades` : ""}</span>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>Pour que les résultats soient honnêtes : seuls les gaps forts comptent (bougie du milieu = displacement), une zone n'existe qu'une fois sa bougie fermée, et si le SL et le TP sont touchés dans la même bougie de 15 min, le bot compte le SL. Spread non compté.</div>
      </div>

      {res && <>
        <div style={card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {[["Trades", A.n], ["Réussite", A.n ? Math.round(A.wr) + " %" : "—"], ["Total", fmtR(A.R)], ["Moyenne", A.n ? fmtR(A.avg) : "—"], ["Profit factor", A.pf === Infinity ? "∞" : A.pf ? A.pf.toFixed(2) : "—"], ["Drawdown max", fmtR(A.dd)], ["Pertes d'affilée", A.mls], ["Gagnés / perdus / BE", `${A.w} / ${A.lo} / ${A.be}`]].map(([k, v]) => (
              <div key={k}><div style={{ fontSize: 11.5, color: C.textMuted, fontWeight: 600 }}>{k}</div><div style={{ fontSize: 19, fontWeight: 800, marginTop: 2, color: k === "Total" ? (A.R >= 0 ? C.teal : C.red) : C.text }}>{v}</div></div>))}
          </div>
          {curve.length > 1 && <div style={{ height: 180, marginTop: 14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve} margin={{ top: 5, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="i" hide /><YAxis tick={{ fill: C.textMuted, fontSize: 11 }} tickFormatter={(v) => v + "R"} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10 }} formatter={(v) => [v + "R", "Cumul"]} />
                <Area type="monotone" dataKey="r" stroke={A.R >= 0 ? C.teal : C.red} strokeWidth={2} fill={(A.R >= 0 ? C.teal : C.red) + "22"} />
              </AreaChart>
            </ResponsiveContainer>
          </div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginBottom: 12 }}>
          <Tbl title="Par setup" rows={group((t) => t.kind + " " + t.tf)} />
          <Tbl title="Par session d'entrée" rows={group((t) => getSession(new Date(t.t * 1000).toISOString()).replace(" Session", ""))} />
          <Tbl title="Par année" rows={group((t) => String(new Date(t.t * 1000).getUTCFullYear())).sort((a, b) => a.k.localeCompare(b.k))} />
          <Tbl title="Par sens" rows={group((t) => (t.dir > 0 ? "Long" : "Short"))} />
          <Tbl title="Par jour" rows={group((t) => ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][new Date((t.t + tvNyOff(t.t)) * 1000).getUTCDay()])} />
        </div>
        <div style={card}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Trades du bot <span style={{ fontWeight: 500, color: C.textMuted, fontSize: 13 }}>· ▶ Voir ouvre le graphique juste avant, avec la zone dessinée</span></div>
          {T.slice().reverse().slice(0, show).map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${C.border}`, fontSize: 13.5 }}>
              <span style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: t.r > 0 ? C.teal : t.r < 0 ? C.red : C.textMuted }} />
              <span style={{ width: 120, color: C.textSecondary }}>{tvFmtTime(t.t, "ny", "full")}</span>
              <b style={{ color: t.dir > 0 ? C.teal : C.red, width: 44 }}>{t.dir > 0 ? "Long" : "Short"}</b>
              <span style={{ flex: 1 }}>{t.kind} {t.tf} · {t.entry.toFixed(5)} · {t.why}</span>
              <b style={{ color: t.r > 0 ? C.teal : t.r < 0 ? C.red : C.textMuted }}>{fmtR(t.r)}</b>
              <button onClick={() => window.dispatchEvent(new CustomEvent("tjp-bt-goto", { detail: { t: t.t, draws: [{ type: "rect", kind: t.kind === "OB" || t.kind === "BB" ? t.kind : t.kind, tf: t.tf, pts: [{ t: t.formT, p: t.top }, { t: t.t + 86400, p: t.bot }] }] } }))} style={{ fontSize: 12, fontWeight: 700, color: C.purpleBright, background: C.purpleDim, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit" }}>▶ Voir</button>
            </div>))}
          {T.length > show && <button onClick={() => setShow((s) => s + 200)} style={{ marginTop: 8, padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.text, cursor: "pointer", fontFamily: "inherit" }}>Voir plus ({T.length - show} restants)</button>}
        </div>
      </>}
    </div>
  );
}

/* ============================================================================
   COACH — rejoue chacun de tes trades sur les vraies bougies et compare avec d'autres façons de le prendre
   (entrée en OTE, BE à 1R, TP fixe, killzone) : ce qui t'aurait fait gagner plus, et tes bons coups
   ============================================================================ */
function coachSim(rows, i0, dir, e, sl, tp, maxBars = 2000) { /* résultat R d'un trade déjà rempli à l'index i0 (SL d'abord si même bougie) */
  const risk = (e - sl) * dir; if (!(risk > 0)) return null; let mfe = 0;
  for (let j = i0; j < Math.min(rows.length, i0 + maxBars); j++) {
    const h = rows[j][2], l = rows[j][3];
    if (dir > 0 ? l <= sl : h >= sl) return { r: -1, mfe, j };
    if (tp && (dir > 0 ? h >= tp : l <= tp)) return { r: ((tp - e) * dir) / risk, mfe: Math.max(mfe, ((tp - e) * dir) / risk), j };
    const fav = dir > 0 ? (h - e) / risk : (e - l) / risk; if (fav > mfe) mfe = fav;
  }
  return { r: 0, mfe, j: -1 };
}
function coachAnalyze(rows, trades) {
  const out = []; if (!rows || !rows.length) return out; const T0 = rows[0][0], T1 = rows[rows.length - 1][0];
  for (const t of trades) {
    const e = Number(t.entryPrice), sl = Number(t.stopLoss), tp = Number(t.takeProfit); if (!e || !sl) continue; const dir = t.direction === "long" ? 1 : -1; const risk = (e - sl) * dir; if (!(risk > 0)) continue;
    const ts = Date.parse(t.entryTime) / 1000; if (!ts || ts < T0 || ts > T1) continue; const i = tvBsRows(rows, ts); if (i < 60) continue;
    const r = rOf(t); const base = coachSim(rows, i, dir, e, sl, null) || { mfe: 0, r: 0 }; /* sans TP : jusqu'où le prix est allé avant le SL */
    /* OTE : jambe d'impulsion des 48 dernières bougies M15, entrée limite à 70,5 % de retracement, même SL et même TP */
    let lo = 1e9, hi = -1e9, iLo = i, iHi = i; for (let j = i - 48; j < i; j++) { if (rows[j][3] < lo) { lo = rows[j][3]; iLo = j; } if (rows[j][2] > hi) { hi = rows[j][2]; iHi = j; } }
    let ote = null;
    if (hi > lo) {
      const lvl = dir > 0 ? hi - 0.705 * (hi - lo) : lo + 0.705 * (hi - lo); const okLeg = dir > 0 ? iLo < iHi : iHi < iLo;
      if (okLeg && (dir > 0 ? e <= lvl : e >= lvl)) ote = { already: true, lvl };
      else if (okLeg && (dir > 0 ? lvl > sl : lvl < sl) && (!tp || (dir > 0 ? lvl < tp : lvl > tp))) {
        let fill = -1; for (let j = i; j < Math.min(rows.length, i + 48); j++) { if (dir > 0 ? rows[j][3] <= lvl : rows[j][2] >= lvl) { fill = j; break; } if (tp && (dir > 0 ? rows[j][2] >= tp : rows[j][3] <= tp)) break; }
        if (fill < 0) ote = { lvl, missed: true, r: 0 };
        else { const s = coachSim(rows, fill + 1, dir, lvl, sl, tp || null); ote = { lvl, r: s ? s.r : 0 }; }
      }
    }
    const be1 = base.mfe >= 1 && r < 0 ? 0 : r; /* stop au point mort dès +1R */
    const kz = (() => { try { return killzoneLabel(t.entryTime); } catch (e2) { return ""; } })();
    out.push({ t, r, mfe: base.mfe, hit: base.r === -1, ote, be1, kz });
  }
  return out;
}
/* « Et si je visais plus loin ? » : même SL, objectif différent, rejoué sur les vraies bougies */
function TargetLab({ res }) {
  const [X, setX] = useState(2); const [grp, setGrp] = useState("all");
  const T = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 3.5, 4, 5];
  const sim = (l, x) => { const n = l.length; let s = 0, w = 0, lo = 0; l.forEach((z) => { const r = z.mfe >= x ? x : z.hit ? -1 : 0; s += r; if (r > 0) w++; else if (r < 0) lo++; }); return { n, s, avg: n ? s / n : 0, wr: w + lo ? (w / (w + lo)) * 100 : 0 }; };
  const groups = useMemo(() => { const m = { all: res }; if (grp === "setup") res.forEach((z) => pgSetups(z.t).forEach((k) => { (m[k] = m[k] || []).push(z); })); if (grp === "sess") res.forEach((z) => { const k = pgSess(z.t).replace(" Session", ""); (m[k] = m[k] || []).push(z); }); if (grp !== "all") delete m.all; return m; }, [res, grp]);
  const all = T.map((x) => ({ x, ...sim(res, x) })); const best = all.reduce((a, b) => (b.avg > a.avg ? b : a)); const cur = sim(res, X); const real = res.reduce((a, z) => a + z.r, 0);
  const mx = Math.max(...all.map((a) => Math.abs(a.avg)), 0.01);
  const btnS = (on) => ({ border: "none", borderRadius: 7, padding: "6px 10px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: on ? C.purpleDim : "transparent", color: on ? C.purpleBright : C.textSecondary });
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>🎯 Et si je visais plus loin ?</div>
      <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 3 }}>Même entrée, même SL. Seul l'objectif change. Rejoué sur les vraies bougies ({res.length} trades).</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Objectif</span>
        <input type="range" min={1} max={5} step={0.25} value={X} onChange={(e) => setX(+e.target.value)} style={{ flex: "1 1 200px", accentColor: C.purple }} />
        <b className="tnum" style={{ fontSize: 18, minWidth: 54 }}>{String(X).replace(".", ",")} R</b>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginTop: 12 }}>
        {[["Total", fmtR(cur.s), cur.s >= real ? C.teal : C.red, "réel " + fmtR(real)], ["Par trade", fmtR(cur.avg), cur.avg >= 0 ? C.teal : C.red, ""], ["Gagnants", cur.wr.toFixed(0) + " %", C.text, ""]].map(([l, v, c, sub]) => <div key={l} style={{ background: C.inputBg, borderRadius: 12, padding: "10px 12px" }}><div style={{ fontSize: 11, color: C.textMuted }}>{l}</div><div className="tnum" style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div>{sub && <div style={{ fontSize: 11, color: C.textMuted }}>{sub}</div>}</div>)}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 90, marginTop: 14 }}>
        {all.map((a) => <div key={a.x} onClick={() => setX(a.x)} title={`${a.x} R : ${fmtR(a.avg)} / trade`} style={{ flex: 1, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ width: "100%", height: Math.max(3, (Math.abs(a.avg) / mx) * 70), background: a.avg < 0 ? C.red : a === best ? C.teal : a.x === X ? C.purple : C.purpleDim, borderRadius: 4 }} />
          <span style={{ fontSize: 10, color: a.x === X ? C.text : C.textMuted }}>{String(a.x).replace(".", ",")}</span></div>)}
      </div>
      <div style={{ marginTop: 10, fontSize: 13.5, padding: "9px 12px", borderRadius: 10, background: C.tealDim }}>Meilleur objectif : <b>{String(best.x).replace(".", ",")} R</b> → {fmtR(best.avg)} par trade, {best.wr.toFixed(0)} % gagnants ({fmtR(best.s)} au total). {best.x > 2 ? "Tu peux viser plus loin que 2R." : best.x < 2 ? "Viser 2R est trop loin pour tes trades : sécurise plus tôt." : "2R est bien ton bon objectif."}</div>
      <div style={{ display: "flex", gap: 2, padding: 2, borderRadius: 9, border: `1px solid ${C.border}`, marginTop: 14, width: "fit-content" }}>{[["all", "Tous"], ["setup", "Par setup"], ["sess", "Par session"]].map(([k, l]) => <button key={k} onClick={() => setGrp(k)} style={btnS(grp === k)}>{l}</button>)}</div>
      {grp !== "all" && <div style={{ marginTop: 8 }}>{Object.entries(groups).filter(([, l]) => l.length >= 3).map(([k, l]) => { const b = T.map((x) => ({ x, ...sim(l, x) })).reduce((a, c) => (c.avg > a.avg ? c : a)); const c2 = sim(l, 2); return <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: `1px solid ${C.border}`, fontSize: 13 }}><span><b>{k}</b> <span style={{ color: C.textMuted }}>{l.length} trades</span></span><span className="tnum">à 2R : {fmtR(c2.avg)} · <b style={{ color: C.teal }}>meilleur {String(b.x).replace(".", ",")}R : {fmtR(b.avg)}</b></span></div>; })}</div>}
    </div>
  );
}
function TradeCoach({ trades }) {
  const [res, setRes] = useState(null); const [msg, setMsg] = useState("");
  const bt = useMemo(() => closedOf(trades.filter((x) => x.accountId === BT_ACC)), [trades]);
  const run = async () => { setMsg("Chargement des bougies EURUSD…"); const rows = await tvAutoLoad(setMsg); if (!rows || !rows.length) { setMsg("Pas de bougies sur cet appareil : ouvre une fois le Graphique pour les charger."); return; } setMsg("Je rejoue tes trades…"); setTimeout(() => { setRes(coachAnalyze(rows, bt)); setMsg(""); }, 20); };
  const S = useMemo(() => {
    if (!res || !res.length) return null; const sum = (f) => res.reduce((a, x) => a + f(x), 0); const real = sum((x) => x.r);
    const oteL = res.filter((x) => x.ote && !x.ote.already), oteReal = oteL.reduce((a, x) => a + x.r, 0), oteAlt = oteL.reduce((a, x) => a + x.ote.r, 0), already = res.filter((x) => x.ote && x.ote.already);
    const be = sum((x) => x.be1); const tps = [1.5, 2, 2.5, 3, 4].map((X) => ({ X, s: sum((x) => (x.mfe >= X ? X : x.hit ? -1 : 0)) })); const bestTp = tps.reduce((m, x) => (x.s > m.s ? x : m), tps[0]);
    const inKz = res.filter((x) => x.kz && x.kz !== "Hors killzone"), outKz = res.filter((x) => x.kz === "Hors killzone");
    const advice = [];
    if (oteL.length >= 3 && oteAlt > oteReal) advice.push({ c: C.purpleBright, t: "Attends l'OTE (62-79 %)", d: `Sur ${oteL.length} trades pris hors OTE : ${fmtR(oteReal)} au total. En attendant 70,5 % de retracement : ${fmtR(oteAlt)}, soit ${fmtR(oteAlt - oteReal)} de plus.` });
    if (already.length >= 3) { const a = already.reduce((s, x) => s + x.r, 0) / already.length; advice.push({ c: C.teal, t: "Tes entrées en OTE", d: `${already.length} trades déjà en OTE : ${fmtR(a)} par trade en moyenne.` }); }
    if (be > real + 0.5) advice.push({ c: C.amber, t: "Mets ton stop au BE à +1R", d: `${res.filter((x) => x.mfe >= 1 && x.r < 0).length} trades perdants étaient passés par +1R. Avec le BE à 1R : ${fmtR(be)} au lieu de ${fmtR(real)}.` });
    if (bestTp.s > real + 0.5) advice.push({ c: C.teal, t: `TP fixe à ${String(bestTp.X).replace(".", ",")}R`, d: `Avec ce TP sur tous tes trades : ${fmtR(bestTp.s)} au lieu de ${fmtR(real)}.` });
    if (outKz.length >= 3 && inKz.length >= 3) { const a = inKz.reduce((s, x) => s + x.r, 0) / inKz.length, b = outKz.reduce((s, x) => s + x.r, 0) / outKz.length; if (b < a - 0.2) advice.push({ c: C.red, t: "Reste en killzone", d: `En killzone : ${fmtR(a)} par trade. Hors killzone : ${fmtR(b)} par trade (${outKz.length} trades).` }); }
    const worst = [...oteL].filter((x) => x.ote.r > x.r).sort((a, b) => (b.ote.r - b.r) - (a.ote.r - a.r)).slice(0, 8);
    const good = res.filter((x) => x.r > 0 && (!x.ote || x.ote.already || x.ote.r <= x.r)).sort((a, b) => b.r - a.r).slice(0, 6);
    return { n: res.length, real, advice, worst, good, tps, bestTp, be };
  }, [res]);
  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16, marginBottom: 14 };
  const row = (x, txt, col) => <div key={x.t.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderTop: `1px solid ${C.border}`, fontSize: 13 }}><span style={{ minWidth: 0 }}><b>#{x.t.rules?.tradeNo || "?"} {x.t.direction === "long" ? "▲" : "▼"}</b> <span style={{ color: C.textMuted }}>{fmtDateTime(x.t.entryTime)}</span><br /><span style={{ color: C.textSecondary }}>{txt}</span></span><b className="tnum" style={{ color: col, whiteSpace: "nowrap" }}>{fmtR(x.r)}</b></div>;
  return (
    <div style={{ maxWidth: 860 }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}><div style={{ fontSize: 16, fontWeight: 700 }}>🤖 Coach de tes trades</div><div style={{ fontSize: 13, color: C.textMuted, marginTop: 3, lineHeight: 1.45 }}>Rejoue tes {bt.length} trades de backtest sur les vraies bougies et compare : entrée en OTE, BE à +1R, TP fixe, killzone. Il te dit ce qui t'aurait fait gagner plus, et tes bons coups.</div></div>
          <button onClick={run} disabled={!bt.length} style={{ ...btn.primary, opacity: bt.length ? 1 : 0.5 }}>{res ? "Relancer" : "Analyser mes trades"}</button>
        </div>
        {msg && <div style={{ marginTop: 10, fontSize: 13, color: C.textSecondary }}>{msg}</div>}
        {res && !res.length && <div style={{ marginTop: 10, fontSize: 13, color: C.textMuted }}>Aucun trade analysable (il faut entrée, SL et date dans la période des bougies).</div>}
      </div>
      {S && <>
        <TargetLab res={res} />
        <div style={card}>
          <div style={{ fontSize: 13, color: C.textMuted }}>{S.n} trades rejoués · résultat réel <b style={{ color: S.real >= 0 ? C.teal : C.red }}>{fmtR(S.real)}</b></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {S.advice.length ? S.advice.map((a, i) => <div key={i} style={{ borderLeft: `3px solid ${a.c}`, padding: "7px 12px", background: C.inputBg, borderRadius: "0 10px 10px 0" }}><div style={{ fontSize: 14, fontWeight: 700 }}>{a.t}</div><div style={{ fontSize: 13, color: C.textSecondary, marginTop: 2, lineHeight: 1.45 }}>{a.d}</div></div>) : <div style={{ fontSize: 13, color: C.textSecondary }}>Ta façon de prendre tes trades fait déjà mieux que les variantes testées. Continue.</div>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>{S.tps.map((x) => <span key={x.X} style={{ fontSize: 12, padding: "4px 9px", borderRadius: 8, background: C.inputBg, color: x === S.bestTp ? C.teal : C.textSecondary, fontWeight: 600 }}>TP {String(x.X).replace(".", ",")}R : {fmtR(x.s)}</span>)}<span style={{ fontSize: 12, padding: "4px 9px", borderRadius: 8, background: C.inputBg, color: C.textSecondary, fontWeight: 600 }}>BE à 1R : {fmtR(S.be)}</span></div>
        </div>
        {S.worst.length > 0 && <div style={card}><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Les trades où attendre l'OTE aurait payé</div>
          {S.worst.map((x) => row(x, x.ote.missed ? `Le prix n'est jamais revenu en OTE (${x.ote.lvl.toFixed(5)}) : trade évité.` : `En attendant l'OTE à ${x.ote.lvl.toFixed(5)} : ${fmtR(x.ote.r)} au lieu de ${fmtR(x.r)}.`, x.r >= 0 ? C.teal : C.red))}</div>}
        {S.good.length > 0 && <div style={card}><div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Tes bons coups</div>
          {S.good.map((x) => row(x, x.ote && x.ote.already ? "Entrée déjà en OTE, TP atteint : à refaire." : `Le prix est allé jusqu'à ${x.mfe.toFixed(1).replace(".", ",")}R : bonne entrée.`, C.teal))}</div>}
      </>}
    </div>
  );
}

/* le graphique ne se redessine plus à chaque trade enregistré dans le site : replay fluide même avec des milliers de trades */
const BacktestLabMemo = React.memo(BacktestLab);
function BacktestPage(props) {
  const [tab, setTab] = useState("chart");
  const PR = useRef(props); PR.current = props;
  const stable = useMemo(() => ({ onSave: (t) => PR.current.onSave(t), onDelete: (id) => PR.current.onDelete(id), getApp: () => PR.current.trades }), []);
  useEffect(() => { const h = () => setTab("chart"); window.addEventListener("tjp-bt-goto", h); window.addEventListener("tjp-bot-live", h); return () => { window.removeEventListener("tjp-bt-goto", h); window.removeEventListener("tjp-bot-live", h); }; }, []);
  /* anciens trades de replay entre -0,1 R et +0,1 R : enregistrés comme BE (0 R), pas comme perdants */
  useEffect(() => {
    props.trades.filter((t) => t.accountId === BT_ACC && (t.rules || {}).replay && t.status !== "breakeven" && t.resultR != null && Math.abs(t.resultR) <= 0.1)
      .forEach((t) => props.onSave({ ...t, resultR: 0, status: "breakeven" }));
  }, [props.trades.length]);
  useEffect(() => {
    props.trades.filter((t) => t.accountId === BT_ACC && (t.rules || {}).replay && !t.session && !(t.rules || {}).utc).forEach((t) => {
      const fix = (iso) => { if (!iso) return iso; const loc = Date.parse(iso) / 1000; let u = loc + 5 * 3600; u = loc - tvNyOff(u); return new Date(u * 1000).toISOString(); };
      const entryTime = fix(t.entryTime);
      props.onSave({ ...t, entryTime, exitTime: fix(t.exitTime), session: getSession(entryTime), rules: { ...(t.rules || {}), utc: true } });
    });
  }, [props.trades.length]);
  const n = props.trades.filter((t) => t.accountId === BT_ACC).length;
  const tb = (on) => ({ padding: "8px 16px", borderRadius: 10, border: `1px solid ${on ? C.purple : C.border}`, background: on ? C.purple + "26" : "transparent", color: on ? C.purpleBright : C.textSecondary, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 });
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <button onClick={() => setTab("chart")} style={tb(tab === "chart")}><TvLogoIcon size={16} />Graphique</button>
        <button onClick={() => setTab("stats")} style={tb(tab === "stats")}><BarChart3 size={16} />Saisie & stats <span style={{ fontSize: 12, opacity: 0.8 }}>{n}</span></button>
        <button onClick={() => setTab("bot")} style={tb(tab === "bot")}><Cpu size={16} />Bot</button>
        <button onClick={() => setTab("coach")} style={tb(tab === "coach")}>🤖 Coach</button>

      </div>
      <div style={{ display: tab === "chart" ? "block" : "none" }}><BacktestLabMemo {...stable} /></div>
      {tab === "stats" && <BacktestView {...props} />}
      {tab === "bot" && <BacktestBot />}
      {tab === "coach" && <TradeCoach trades={props.trades} />}
    </div>
  );
}

function BacktestView({ trades, onSave, onDelete, showToast, pairs, appSettings }) {
  const LSK = "bt_quick_v1";
  const saved = (() => { try { return JSON.parse(localStorage.getItem(LSK) || "{}"); } catch { return {}; } })();
  const [pair, setPair] = useState(saved.pair || (pairs && pairs[0]) || "EURUSD");
  const [date, setDate] = useState(saved.date || "2015-01-05");
  const [dir, setDir] = useState(saved.dir || "long");
  const [rr, setRr] = useState(saved.rr || "2");
  const [setup, setSetup] = useState(saved.setup || "");
  const [tf, setTf] = useState(saved.tf || "M15");
  const [tm, setTm] = useState("");
  const [editId, setEditId] = useState(null);
  const [btTab, setBtTab] = useState("saisie");
  const [autoEdit, setAutoEdit] = useState(saved.autoEdit !== false);
  const [afterId, setAfterId] = useState(null); const [afterBusy, setAfterBusy] = useState(false); const afterRef = useRef(null);
  const yearOf = String(date).slice(0, 4);
  const setYear = (y) => setDate((d) => { const md = String(d).slice(4); const nd = y + (md === "-02-29" && (y % 4) ? "-02-28" : md); return btClampDate(nd); });
  const [px, setPx] = useState({ e: "", sl: "", tp: "" });
  const [shot, setShot] = useState(null);
  const [shotFile, setShotFile] = useState(null);
  const [reading, setReading] = useState(false);
  const [found, setFound] = useState(null);
  const [yearF, setYearF] = useState("all");
  const [pairF, setPairF] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => { try { localStorage.setItem(LSK, JSON.stringify({ pair, date, dir, rr, setup, tf, autoEdit })); } catch {} }, [pair, date, dir, rr, setup, tf, autoEdit]);

  const bt = useMemo(() => trades.filter((t) => t.accountId === BT_ACC).sort((a, b) => String(b.entryTime).localeCompare(String(a.entryTime))), [trades]);
  const setups = useMemo(() => { const m = {}; bt.forEach((t) => (t.tags || []).forEach((g) => { m[g] = (m[g] || 0) + 1; })); return Object.entries(m).sort((a, b) => b[1] - a[1]).map((x) => x[0]).slice(0, 8); }, [bt]);
  const btPairs = useMemo(() => [...new Set([pair, ...(pairs || []), ...bt.map((t) => t.pair)])].filter(Boolean).slice(0, 10), [bt, pairs, pair]);
  const [sessF, setSessF] = useState("all");
  const btSess = useMemo(() => [...new Set(bt.map((t) => (t.rules || {}).session).filter(Boolean))], [bt]);
  const filtered = bt.filter((t) => (yearF === "all" || String(t.entryTime).slice(0, 4) === String(yearF)) && (pairF === "all" || t.pair === pairF) && (sessF === "all" || (t.rules || {}).session === sessF));
  const A = btAgg(filtered);
  const rrN = parseFloat(String(rr).replace(",", ".")) || 0;
  const pxRR = (() => { const e = parseFloat(px.e), s = parseFloat(px.sl), p = parseFloat(px.tp); return e && s && p && Math.abs(e - s) > 0 ? Math.abs(p - e) / Math.abs(e - s) : null; })();

  const applyFound = (t, res) => {
    if (!t) return;
    setDir(t.direction);
    setPx({ e: t.entryPrice != null ? String(t.entryPrice) : "", sl: t.stopLoss != null ? String(t.stopLoss) : "", tp: t.takeProfit != null ? String(t.takeProfit) : "" });
    if (t.riskReward) setRr(String(t.riskReward));
    if (t.date) setDate(btClampDate(String(date).slice(0, 4) + String(t.date).slice(4)));   // l'année choisie prime
    if (res && res.pair) setPair(res.pair);
    if (res && res.timeframe) setTf(tfFix(res.timeframe));
    setTm(t.time || "");
  };
  const readShot = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); });
    setShot(url); setShotFile(file); setReading(true); setFound(null);
    try {
      const res = await analyzeChartScreenshot(url, ALL_INSTRUMENTS, date);
      setFound(res);
      if (res.trades.length) { applyFound(res.trades[0], res); const t0 = res.trades[0]; const miss = [!res.pair && "paire", !res.timeframe && "timeframe", !t0.date && "date", t0.stopLoss == null && "SL", t0.takeProfit == null && "TP"].filter(Boolean);
        showToast((res.trades.length > 1 ? res.trades.length + " positions trouvées — la plus récente est appliquée" : "Screenshot lu ✓") + (miss.length ? " · à vérifier : " + miss.join(", ") : ""), miss.length > 0); }
      else showToast("Aucun outil Long/Short trouvé sur l'image", true);
    } catch (e) { showToast("Lecture impossible : " + (e.message || e), true); }
    setReading(false);
  };

  const add = async (kind) => {
    const r = kind === "tp" ? (pxRR != null && px.tp ? +pxRR.toFixed(2) : rrN) : kind === "sl" ? -1 : 0;
    if (kind === "tp" && !(r > 0)) { showToast("Indique le R:R", true); return; }
    let shotUrl = null;
    if (shotFile) { try { shotUrl = await uploadToStorage(shotFile); } catch {} }
    const t = {
      id: uid(), accountId: BT_ACC, pair, direction: dir, entryTime: date + "T" + (tm || "12:00") + ":00.000Z", timeframe: tf,
      entryPrice: px.e ? parseFloat(px.e) : null, stopLoss: px.sl ? parseFloat(px.sl) : null, takeProfit: px.tp ? parseFloat(px.tp) : null,
      resultR: r, resultUsd: null, status: kind === "be" ? "breakeven" : "closed", tags: [setup, tf].filter(Boolean), rules: { backtest: true, rr: pxRR || rrN, tfSetups: [{ tf, setups: setup ? [setup] : [] }] },
      screenshotBefore: shotUrl, notes: null,
    };
    onSave(t); if (autoEdit) setEditId(t.id);
    setPx({ e: "", sl: "", tp: "" }); setShot(null); setShotFile(null); setFound(null); setTm("");
    showToast((kind === "tp" ? "TP " + fmtR(r) : kind === "sl" ? "SL −1R" : "BE") + " · " + pair + " · " + date);
  };

  // Coller n'importe où sur la page (Ctrl+V) ou avec le bouton « Coller »
  const attachAfter = async (file) => {
    const t = bt.find((x) => x.id === afterId); if (!t || !file || !file.type.startsWith("image/")) return;
    setAfterBusy(true);
    try { const u = await uploadToStorage(await shrinkImage(file)); onSave({ ...t, screenshotAfter: u }); showToast("Photo après trade ajoutée ✓"); setAfterId(null); }
    catch (e) { showToast("Envoi impossible : " + (e.message || e), true); }
    setAfterBusy(false);
  };
  const pasteBtn = async (e) => { e.stopPropagation();
    try { const items = await navigator.clipboard.read(); for (const it of items) { const ty = it.types.find((x) => x.startsWith("image/")); if (ty) { const b = await it.getType(ty); const f = new File([b], "capture.png", { type: ty }); if (afterId) attachAfter(f); else readShot(f); return; } } showToast("Pas d'image dans le presse-papiers", true); }
    catch { showToast("Autorise l'accès au presse-papiers, ou fais Ctrl+V sur la page", true); } };

  const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 12 };
  const lab = { fontSize: 12.5, fontWeight: 600, color: C.textSecondary, marginBottom: 8 };
  const inp = { width: "100%", boxSizing: "border-box", height: 44, padding: "0 12px", borderRadius: 11, border: `1px solid ${C.border}`, background: C.inputBg || C.bg, color: C.text, fontSize: 15, fontWeight: 600, outline: "none", fontFamily: "inherit" };
  const chip = (on, col) => ({ padding: "8px 12px", borderRadius: 10, border: `1px solid ${on ? (col || C.purple) : C.border}`, background: on ? (col || C.purple) + "26" : "transparent", color: on ? (col || C.purpleBright) : C.textSecondary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });
  const big = (col) => ({ flex: 1, height: 58, borderRadius: 14, border: "none", background: col, color: "#fff", fontSize: 16.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1.15 });

  // courbe en R
  const curve = useMemo(() => { let c = 0; return [...filtered].sort((a, b) => String(a.entryTime).localeCompare(String(b.entryTime))).map((t, i) => ({ i: i + 1, r: +(c += t.resultR || 0).toFixed(2), d: String(t.entryTime).slice(0, 10) })); }, [filtered]);
  const byYear = BT_YEARS.map((y) => ({ y, ...btAgg(bt.filter((t) => String(t.entryTime).slice(0, 4) === String(y) && (pairF === "all" || t.pair === pairF))) }));
  const groupRows = (fn) => { const m = {}; filtered.forEach((t) => { const k = fn(t); if (!k) return; (m[k] = m[k] || []).push(t); }); return Object.entries(m).map(([k, l]) => ({ k, ...btAgg(l) })).sort((a, b) => b.R - a.R); };
  const WD = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const Row = ({ k, r, onClick }) => (
    <div onClick={onClick} style={{ display: "grid", gridTemplateColumns: "1fr 44px 52px 70px", gap: 8, alignItems: "center", padding: "10px 0", borderTop: `1px solid ${C.border}`, cursor: onClick ? "pointer" : "default", opacity: r.n < 5 ? 0.45 : 1 }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{k}</span>
      <span className="tnum" style={{ fontSize: 13, color: C.textMuted, textAlign: "center" }}>{r.n}</span>
      <span className="tnum" style={{ fontSize: 13, fontWeight: 700, textAlign: "center", color: r.wr >= 50 ? C.teal : C.red }}>{r.n ? Math.round(r.wr) + "%" : "—"}</span>
      <span className="tnum" style={{ fontSize: 14, fontWeight: 800, textAlign: "right", color: r.R >= 0 ? C.teal : C.red }}>{r.n ? fmtR(r.R) : "—"}</span>
    </div>);
  const Head = () => <div style={{ display: "grid", gridTemplateColumns: "1fr 44px 52px 70px", gap: 8, fontSize: 11.5, color: C.textMuted, fontWeight: 600 }}><span /><span style={{ textAlign: "center" }}>N</span><span style={{ textAlign: "center" }}>WR</span><span style={{ textAlign: "right" }}>Total</span></div>;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 0 120px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>Backtesting</h1>
        <span style={{ fontSize: 13, color: C.textMuted }}>Trades enregistrés depuis le replay · {bt.length}</span>
      </div>

      {editId && (() => { const t = bt.find((x) => x.id === editId); return t ? <QuickTradeModal key={t.id} trade={t} appSettings={appSettings} onClose={() => setEditId(null)} onPatch={(id, data) => onSave({ ...t, ...data, accountId: BT_ACC, rules: { ...(data.rules || t.rules || {}), backtest: true } })} /> : null; })()}
      {btTab === "saisie" && <>
      {/* ── Filtres ── */}
      {btSess.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <button onClick={() => setSessF("all")} style={chip(sessF === "all")}>Toutes les sessions</button>
        {btSess.map((x) => <button key={x} onClick={() => setSessF(x)} style={chip(sessF === x)}>{x}</button>)}
      </div>}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 6 }}>
        <button onClick={() => setYearF("all")} style={chip(yearF === "all")}>Tout</button>
        {BT_YEARS.map((y) => <button key={y} onClick={() => setYearF(y)} style={{ ...chip(yearF === y), flexShrink: 0 }}>{y}</button>)}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={() => setPairF("all")} style={chip(pairF === "all")}>Toutes paires</button>
        {[...new Set(bt.map((t) => t.pair))].map((p) => <button key={p} onClick={() => setPairF(p)} style={chip(pairF === p)}>{PAIR_LABEL[p] || p}</button>)}
      </div>

      {/* ── Résumé ── */}
      <div style={card}>
        <div style={{ fontSize: 13, color: C.textMuted, fontWeight: 600 }}>Résultat {yearF === "all" ? "2010 → " + new Date().getFullYear() : yearF}{pairF !== "all" ? " · " + pairF : ""}</div>
        <div className="tnum" style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.2, color: A.R >= 0 ? C.teal : C.red }}>{fmtR(A.R)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
          {[["Trades", A.n], ["Réussite", A.n ? Math.round(A.wr) + "%" : "—"], ["Moyenne", A.n ? fmtR(A.avg) : "—"], ["Profit factor", A.pf === Infinity ? "∞" : A.pf ? A.pf.toFixed(2) : "—"], ["Drawdown max", A.n ? fmtR(A.dd) : "—"], ["Gagnés / perdus", A.w + " / " + A.l]].map(([l, v]) => (
            <div key={l}><div style={{ fontSize: 11.5, color: C.textMuted, fontWeight: 600 }}>{l}</div><div className="tnum" style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{v}</div></div>))}
        </div>
        {curve.length > 1 && <div style={{ height: 160, marginTop: 14 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve} margin={{ top: 5, right: 4, left: -18, bottom: 0 }}>
              <defs><linearGradient id="btg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={A.R >= 0 ? C.teal : C.red} stopOpacity={0.35} /><stop offset="100%" stopColor={A.R >= 0 ? C.teal : C.red} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="i" hide /><YAxis tick={{ fill: C.textMuted, fontSize: 11 }} tickFormatter={(v) => v + "R"} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10 }} formatter={(v) => [v + "R", "Cumul"]} labelFormatter={(i) => curve[i - 1] ? curve[i - 1].d : ""} />
              <Area type="monotone" dataKey="r" stroke={A.R >= 0 ? C.teal : C.red} strokeWidth={2} fill="url(#btg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>}
      </div>

      {/* ── Statistiques complètes (même page que Statistiques, pour l'année choisie) ── */}
      <div style={{ ...card, padding: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Statistiques complètes · {yearF === "all" ? "toutes les années" : yearF}{sessF !== "all" ? " · " + sessF : ""}</div>
        <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 8 }}>Choisis une année en haut pour voir ses statistiques.</div>
        {filtered.length ? <SimpleStats trades={filtered} /> : <div style={{ color: C.textMuted, fontSize: 13.5 }}>Pas encore de trades pour ce filtre.</div>}
      </div>

      {/* ── Par année ── */}
      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Par année</div>
        <Head />
        {byYear.map((r) => <Row key={r.y} k={String(r.y)} r={r} onClick={() => setYearF(yearF === r.y ? "all" : r.y)} />)}
      </div>

      {filtered.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
        {[["Par combinaison de setup", (t) => { const pd = ((t.rules || {}).pdArrays || []).map((x) => x.pd + " " + x.tf).sort(); return pd.length ? pd.join(" + ") + " · " + getSession(t.entryTime).replace(" Session", "") : null; }], ["Par paire", (t) => t.pair], ["Par sens", (t) => t.direction === "long" ? "Long" : "Short"], ["Par setup", (t) => (t.tags || [])[0] || "Sans setup"], ["Par jour", (t) => WD[new Date(t.entryTime).getUTCDay()]], ["Par mois", (t) => ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"][+String(t.entryTime).slice(5, 7) - 1]]].map(([title, fn]) => {
          const rows = groupRows(fn); if (rows.length < (title === "Par combinaison de setup" ? 1 : 2)) return null;
          return <div key={title} style={{ ...card, marginBottom: 0 }}><div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{title}</div><Head />{rows.map((r) => <Row key={r.k} k={r.k} r={r} />)}</div>;
        })}
      </div>}

      {/* ── Liste ── */}
      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Trades</div>

        {filtered.length === 0 && <div style={{ color: C.textMuted, fontSize: 13.5, padding: "12px 0" }}>Aucun trade pour l'instant. Prends des trades dans l'onglet Graphique : chaque trade fermé arrive ici avec sa vraie date.</div>}
        {(showAll ? filtered : filtered.slice(0, 30)).map((t) => (
          <div key={t.id} onClick={(e) => { if (e.target.closest("a,button")) return; setEditId(t.id); }} title="Modifier (session, PD arrays, note…)" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${C.border}`, cursor: "pointer" }}>
            <span style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: t.resultR > 0 ? C.teal : t.resultR < 0 ? C.red : C.textMuted }} />
            <PairLogo pair={t.pair} size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{PAIR_LABEL[t.pair] || t.pair} <span style={{ color: t.direction === "long" ? C.teal : C.red, fontWeight: 600 }}>{t.direction === "long" ? "Long" : "Short"}</span>{(t.tags || [])[0] ? <span style={{ color: C.textMuted, fontWeight: 500 }}> · {t.tags[0]}</span> : null}</div>
              <div className="tnum" style={{ fontSize: 12, color: C.textMuted }}>{String(t.entryTime).slice(0, 10)}{t.entryPrice ? " · E " + t.entryPrice : ""}</div>
            </div>
            {t.screenshotBefore && <a href={t.screenshotBefore} target="_blank" rel="noreferrer" title="Photo du trade" style={{ fontSize: 11, fontWeight: 700, color: C.textSecondary, textDecoration: "none", padding: "3px 6px", borderRadius: 6, border: `1px solid ${C.border}` }}>Photo</a>}
            {(t.rules || {}).replay && <button onClick={() => window.dispatchEvent(new CustomEvent("tjp-bt-goto", { detail: { t: Math.floor(new Date(t.entryTime).getTime() / 1000), session: (t.rules || {}).session, draws: (t.rules || {}).draws || [] } }))} title="Revivre ce trade dans le replay" style={{ fontSize: 11.5, fontWeight: 700, color: C.purpleBright, background: C.purpleDim, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit" }}>▶ Revivre</button>}
            {(t.rules || {}).tradeNo ? <span className="tnum" style={{ fontSize: 12, color: C.textMuted }}>#{t.rules.tradeNo}</span> : null}
            <span className="tnum" style={{ fontSize: 15, fontWeight: 800, color: t.resultR > 0 ? C.teal : t.resultR < 0 ? C.red : C.textMuted }}>{fmtR(t.resultR || 0)}</span>
            <button onClick={() => { if (window.confirm("Supprimer ce trade de backtest ?")) onDelete(t.id); }} aria-label="Supprimer" style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4 }}><Trash2 size={15} /></button>
          </div>))}
        {filtered.length > 30 && <button onClick={() => setShowAll((v) => !v)} style={{ ...btn.ghost, width: "100%", justifyContent: "center", marginTop: 8 }}>{showAll ? "Réduire" : "Voir les " + filtered.length + " trades"}</button>}
      </div>
      </>}
    </div>
  );
}

export default function TradingJournalApp() {
  const [view, setView] = useState("dashboard");
  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem("pin_unlocked") === "1"; } catch { return false; }
  });

  // PIN demandé uniquement quand on essaie d'ouvrir le formulaire d'ajout
  const openDraftTrade = (d) => { setEditingTrade({ ...d, _draft: true }); setView("tradeForm"); };
  const [checkGate, setCheckGate] = useState(false); const [checkTick, setCheckTick] = useState(0);
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
  /* challenge : objectif atteint -> phase suivante automatiquement (Phase 1 -> Phase 2 -> Financé), le solde repart du capital */
  React.useEffect(() => {
    if (!accounts || !accounts.length) return; let changed = false, msg = "";
    const next = accounts.map((a) => {
      if (a.type !== "challenge" || !a.challenge) return a;
      const s = challengeStatus(a, trades.filter((t) => (t.accountId || accounts[0]?.id) === a.id));
      if (!s.passed) return a;
      const c = s.c; const ph = c.phase === "Phase 1" && (c.steps || 2) === 2 ? "Phase 2" : "Financé"; changed = true;
      msg = ph === "Financé" ? `🎉 ${a.name} : compte financé ! Le solde repart à ${fmtUsd(Number(a.balance) || 0)}.` : `✅ ${a.name} : Phase 1 réussie, passage en Phase 2.`;
      return { ...a, challenge: { ...c, phase: ph, phaseStart: new Date().toISOString() } };
    });
    if (changed) { saveAccounts(next); try { showToast && showToast(msg); } catch (e) {} }
  }, [trades, accounts]);
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
  const lastFullRef = React.useRef(0), lastSetRef = React.useRef({ at: 0, u: null });
  const loadDataInner = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      /* Rafraîchissement léger : on ne télécharge que la liste (id, updated_at) puis seulement les trades modifiés.
         Avant : toute la table toutes les 10 s. Supabase reste léger et le site fluide. */
      if (silent && tradesRef.current.length && Date.now() - lastFullRef.current < 15 * 60000) {
        const lite = await sbFetch("/trades?select=id,updated_at");
        const tomb = tombGet(), pend = pendGet();
        const loc = new Map(tradesRef.current.map((t) => [String(t.id), String(t.updatedAt || 0)]));
        const ids = new Set((lite || []).map((r) => String(r.id)));
        const changed = (lite || []).filter((r) => !tomb[String(r.id)] && !pend[r.id] && loc.get(String(r.id)) !== String(r.updated_at || 0)).map((r) => String(r.id));
        const gone = tradesRef.current.filter((t) => !ids.has(String(t.id)) && !pend[t.id]).map((t) => String(t.id));
        if (changed.length <= 150) {
          if (changed.length || gone.length) {
            let fresh = [];
            for (let i = 0; i < changed.length; i += 50) { const part = changed.slice(i, i + 50).map((x) => '"' + x.replace(/"/g, '\\"') + '"').join(","); fresh = fresh.concat(((await sbFetch("/trades?id=in.(" + encodeURIComponent(part) + ")")) || []).map(dbToTrade)); }
            const fm = new Map(fresh.map((t) => [String(t.id), t])), goneS = new Set(gone);
            let next = tradesRef.current.filter((t) => !goneS.has(String(t.id))).map((t) => fm.get(String(t.id)) || t);
            const have = new Set(next.map((t) => String(t.id))); fresh.forEach((t) => { if (!have.has(String(t.id))) next.push(t); });
            next.sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));
            tradesRef.current = next; setTrades(next); writeLocalSoon(next);
          }
          try { await syncSettings(false); } catch (e) {}
          setDbError(null);
          return;
        }
      }
      // Charge directement depuis Supabase — source de vérité
      const rows = await sbFetch("/trades?order=entry_time.desc");
      lastFullRef.current = Date.now();
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
      await syncSettings(true);
      setDbError(null);
    } catch (e) {
      console.error("Erreur Supabase:", e);
      // Fallback localStorage si Supabase down
      try {
        const local = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
        if (local.length > 0 && !tradesRef.current.length) { setTrades(local); }
        if (local.length > 0) setDbError("Mode hors ligne — données locales");
      } catch {}
    } finally {
      if (!silent) setLoading(false);
    }
  };
  /* réglages (sessions de backtest, plan, comptes…) : téléchargés seulement s'ils ont changé */
  const syncSettings = async (force) => {
    const L0 = lastSetRef.current;
    if (!force) {
      if (Date.now() - L0.at < 60000) return; L0.at = Date.now();
      const lite = await sbFetch("/settings?id=eq.main&select=updated_at"); const u = lite && lite[0] ? String(lite[0].updated_at || "") : "";
      if (u && u === L0.u) return;
    }
    {
      const settingsRows = await sbFetch("/settings?id=eq.main");
      L0.at = Date.now(); L0.u = settingsRows && settingsRows[0] ? String(settingsRows[0].updated_at || "") : null;
      const setPend = setPendGet();
      if ((settingsRows && settingsRows.length > 0) || Object.keys(setPend).length) {
        // Les changements pas encore envoyés gagnent sur la version serveur
        const r = { ...((settingsRows && settingsRows[0]) || {}), ...setPend };
        if (Object.keys(setPend).length) flushSettings();
        if (r.weekly_goals) { try { localStorage.setItem("weekly_goals", JSON.stringify(r.weekly_goals)); } catch {} }
        tvApplyRemote(r);
        try { if (r.bot_runs) localStorage.setItem("tjp_bot_remote", JSON.stringify(r.bot_runs)); } catch (e) {}
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
        if (r.playbooks && typeof r.playbooks === "object") { try { localStorage.setItem("playbooks_v1", JSON.stringify(r.playbooks)); } catch {} }
        if (r.trading_rules && typeof r.trading_rules === "object") {
          try { localStorage.setItem(RULES_KEY, JSON.stringify(r.trading_rules)); } catch {}
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
    }
  };

  React.useEffect(() => {
    // Pull initial
    loadData();

    // WebSocket Realtime Supabase — sync instantané
    let ws = null;
    let wsReconnectTimer = null;
    let heartbeatTimer = null, wsDeb = null, lastPoll = 0;

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
            if (msg.event === "postgres_changes" || msg.payload?.data?.type) { clearTimeout(wsDeb); wsDeb = setTimeout(() => loadData(true), 1500); }
          } catch {}
        };
        ws.onclose = () => { clearInterval(heartbeatTimer); wsReconnectTimer = setTimeout(connectRealtime, 3000); };
        ws.onerror = () => ws?.close();
      } catch {}
    };

    connectRealtime();

    // Polling fallback 10s
    const interval = setInterval(() => { if (document.visibilityState === "visible") loadData(true); }, 30000);

    // Refresh au retour sur l'app
    const onVisible = () => { if (document.visibilityState === "visible" && Date.now() - lastPoll > 8000) { lastPoll = Date.now(); loadData(true); } };
    document.addEventListener("visibilitychange", onVisible);
    const onFocus = () => { if (Date.now() - lastPoll > 8000) { lastPoll = Date.now(); loadData(true); } };
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

  /* « Modifier » : le formulaire s'ouvre par-dessus la page, on reste où on est */
  const [editOver, setEditOver] = useState(false);
  const openEditTrade = (trade) => { setEditingTrade(trade); setEditOver(true); };
  React.useEffect(() => { const h = (e) => e.detail && setView(e.detail); window.addEventListener("tjp-goto", h); return () => window.removeEventListener("tjp-goto", h); }, []);
  const [reviewOpen, setReviewOpen] = useState(false);
  React.useEffect(() => { const h = () => setReviewOpen(true); window.addEventListener("tjp-review", h); return () => window.removeEventListener("tjp-review", h); }, []);
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
  const editOverRef = React.useRef(false); editOverRef.current = editOver;
  /* sauvegarde locale différée : un gros JSON n'est plus réécrit à chaque trade (fluidité du replay) */
  const wlRef = React.useRef(null);
  const writeLocalSoon = (list) => { clearTimeout(wlRef.current); wlRef.current = setTimeout(() => { const go = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(tradesRef.current)); } catch {} }; if (window.requestIdleCallback) window.requestIdleCallback(go, { timeout: 3000 }); else go(); }, 1200); };
  const writeLocal = writeLocalSoon;
  React.useEffect(() => { const f = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(tradesRef.current)); } catch {} }; window.addEventListener("pagehide", f); return () => window.removeEventListener("pagehide", f); }, []);

  // ── Sauvegarder un trade (ajout ou modification) ──
  const saveTrade = async (trade) => {
    const now = Date.now();
    const existing = tradesRef.current.find((t) => t.id === trade.id);
    // On garde les champs que le formulaire ne connaît pas (verdict, rétrospective, compte…)
    const merged = withTrend({ ...(existing || {}), ...trade, accountId: existing?.accountId ?? effectiveAccountId, updatedAt: now });
    const newTrades = existing ? tradesRef.current.map((t) => t.id === trade.id ? merged : t) : [merged, ...tradesRef.current];
    setTrades(newTrades);
    writeLocal(newTrades);
    setActiveTradeId(trade.id);
    if (editOverRef.current && existing) setEditOver(false); else setView("tradeDetail");
    showToast(existing ? "Trade mis à jour ✓" : "Trade enregistré ✓");
    persist(merged);
  };

  // ── Import MT4/MT5 : ajoute les positions, sans doublon ──
  const importTrades = (list) => {
    const have = new Set(tradesRef.current.map((t) => t.id)); const now = Date.now();
    const fresh = list.filter((t) => !have.has(t.id)).map((t) => ({ ...t, accountId: t.accountId || effectiveAccountId, updatedAt: now }));
    if (!fresh.length) return;
    const next = [...fresh, ...tradesRef.current].sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));
    tradesRef.current = next; setTrades(next); writeLocal(next);
    fresh.forEach((t) => persist(t, true));
    showToast(`${fresh.length} trades importés ✓`);
  };

  // ── Backtesting : ajout / suppression sans changer d'écran ──
  const saveBt = (t) => {
    const merged = { ...t, accountId: BT_ACC, updatedAt: Date.now() };
    const list = [merged, ...tradesRef.current.filter((x) => x.id !== t.id)];
    tradesRef.current = list; setTrades(list); writeLocal(list); persist(merged, true);
  };
  const deleteBt = async (id) => {
    const list = tradesRef.current.filter((t) => t.id !== id);
    tradesRef.current = list; setTrades(list); writeLocal(list); tombAdd(id);
    const m = pendGet(); m[id] = { id, _deleted: true, updatedAt: Date.now() }; pendSet(m);
    try { await sbFetch(`/trades?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" }); const cur = pendGet(); delete cur[id]; pendSet(cur); } catch (e) {}
  };

  // ── Modifier quelques champs d'un trade (statut, verdict, rétro) ──
  const retroTimers = React.useRef({});
  const patchTrade = (id, patch, debounce = 0) => {
    const t = tradesRef.current.find((x) => x.id === id);
    if (!t) return;
    const nt = ("direction" in patch || "tags" in patch || "pair" in patch) ? withTrend({ ...t, ...patch, updatedAt: Date.now() }) : { ...t, ...patch, updatedAt: Date.now() };
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
  const accountTrades = useMemo(() => { const live = trades.filter((t) => t.accountId !== BT_ACC).map(fixTF); return cumulMode || !effectiveAccountId
    ? live
    : live.filter(t => !t.accountId || t.accountId === effectiveAccountId); }, [trades, cumulMode, effectiveAccountId]);
  const initialBalance = cumulMode
    ? (accounts.reduce((s2, a) => s2 + (Number(a.balance) || 0), 0) || appSettings?.accountBalance || 10000)
    : (Number(activeAccount?.balance) || appSettings?.accountBalance || 10000);
  const currentBalance = useMemo(() => {
    const initial = initialBalance;
    const closed = accountTrades.filter(t => t.status !== "open");
    return initial + closed.reduce((s, t) => s + (t.resultUsd || 0), 0);
  }, [accountTrades, initialBalance]);

  const titles = { erreurs: "Mes erreurs", progression: "Progression", backtest: "Backtesting", dashboard: "Dashboard", trades: "Mes trades", tradeDetail: "Détail du trade", tradeForm: editingTrade && !editingTrade._draft ? "Modifier le trade" : "Nouveau trade", stats: "Statistiques", calculator: "Calculatrice", coach: "IA Coach", settings: "Réglages", calendar: "Calendrier", playbooks: "Playbooks" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FONT.base }}>
      <GlobalStyle />
      <Sidebar view={view} setView={setView} onNewTrade={openNewTrade} totalPnl={accountTrades.filter((t) => t.status !== "open").reduce((a, t) => a + (Number(t.resultUsd) || 0), 0)} totalR={accountTrades.filter((t) => t.status !== "open").reduce((a, t) => a + (Number(t.resultR) || 0), 0)} />
      <div className="desktop-only sidebar-spacer" style={{ width: 220, flexShrink: 0 }} />
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
        <KillzoneBanner part="news" />
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
              {view === "dashboard" && <Dashboard extra={<><ReviewCard trades={accountTrades} onOpen={() => setReviewOpen(true)} />{!cumulMode && activeAccount?.type === "challenge" && <ChallengeCard acc={activeAccount} trades={accountTrades} onDelete={(id) => { const rest = accounts.filter((a) => a.id !== id); saveAccounts(rest); if (rest[0]) switchAccount ? switchAccount(rest[0].id) : null; }} />}</>} trades={accountTrades} onOpenTrade={openTradeDetail} setView={setView} onStatusChange={updateTradeStatus} initialBalance={initialBalance} />}
              {view === "backtest" && <BacktestPage trades={trades} appSettings={appSettings} pairs={appSettings.pairs} showToast={showToast} onSave={saveBt} onDelete={deleteBt} />}
              {view === "trades" && <TradesList trades={accountTrades} appSettings={appSettings} onPatch={patchTrade} onOpen={openTradeDetail} onNew={openNewTrade} onStatusChange={updateTradeStatus} onHome={() => setView("dashboard")} />}
              {view === "tradeDetail" && (
                <TradeDetail trade={trades.find((t) => t.id === activeTradeId)} onBack={() => setView("trades")} onEdit={openEditTrade} onDelete={deleteTrade} onVerdictChange={updateVerdict} appSettings={appSettings} onRetroSave={(id, data) => patchTrade(id, data, 800)} onPatch={(id, data) => patchTrade(id, data)} />
              )}
              {view === "tradeForm" && (
                <TradeFormV2 initial={editingTrade} setupOptions={setupOptions} appSettings={{ ...appSettings, accountBalance: currentBalance, activeAccountName: activeAccount?.name, activeAccountColor: activeAccount?.type === "real" ? C.teal : activeAccount?.type === "challenge" ? C.amber : C.purple }} onCancel={() => setView(editingTrade ? "tradeDetail" : "trades")} onSave={saveTrade} trades={accountTrades} />
              )}
              <GroupTabs view={view} setView={setView} />
              {view === "stats" && <SimpleStats trades={accountTrades} />}
              {view === "erreurs" && <ErrorsPage trades={accountTrades} appSettings={appSettings} balance={initialBalance} onOpenTrade={openTradeDetail} />}
              {view === "playbooks" && <Playbooks trades={accountTrades} />}
              {view === "calculator" && <ForexCalculator balance={currentBalance} pairs={appSettings?.pairs || []} onCreateTrade={openDraftTrade} />}
              {view === "plan" && <PlanDeTrading trades={accountTrades} balance={initialBalance} />}
              {view === "previsions" && <Previsions pairs={["DXY", ...(appSettings?.pairs || PAIRS)]} />}
              {view === "coach" && <AiCoach trades={accountTrades} />}
              {view === "ressources" && <RessourcesICT />}
              {view === "settings" && <SettingsPage trades={trades} onImport={importTrades} onOpenBacktest={() => setView("backtest")} settings={appSettings} setSettings={saveSettings} accounts={accounts} activeAccountId={activeAccountId} onSaveAccounts={saveAccounts} onSwitchAccount={switchAccount} />}
              {view === "calendar" && <><TradingCalendar trades={accountTrades} onSelectDay={() => {}} /><EcoCalendar /></>}
            </div>
          )}
        </main>
      </div>
      <PhotoZoom />
      {editOver && editingTrade && <EscCatch onEsc={() => setEditOver(false)} />}
      {editOver && editingTrade && <div style={{ position: "fixed", inset: 0, zIndex: 380, background: "rgba(0,0,0,.6)", overflowY: "auto", padding: "20px 12px" }} onClick={() => setEditOver(false)}>
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760, margin: "0 auto", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "8px 14px" }}>
          <TradeFormV2 key={editingTrade.id} initial={editingTrade} setupOptions={setupOptions} appSettings={{ ...appSettings, accountBalance: currentBalance, activeAccountName: activeAccount?.name }} onCancel={() => setEditOver(false)} onSave={saveTrade} trades={accountTrades} />
        </div>
      </div>}
      {reviewOpen && <ReviewQueue trades={accountTrades} appSettings={appSettings} onPatch={(id, p) => patchTrade(id, p, 600)} onClose={() => setReviewOpen(false)} />}
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
