import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  LayoutGrid, NotebookPen, BarChart3, Calendar as CalendarIcon,
  Plus, X, Upload, Search, Download, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, Filter, ArrowUpRight, ArrowDownRight,
  Trash2, Edit3, Trophy, Clock, Save, Info, ChevronDown,
  Sparkles, CheckCircle2, AlertCircle, Brain, ImageOff, Calculator,
  ThumbsUp, ThumbsDown, Settings, Plus as PlusIcon, XCircle, MinusCircle,
  BookOpen, Target, Newspaper,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";

/* ============================================================================
   MOCK DATA & UTILITIES
   ============================================================================ */

const PAIRS = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "GBPJPY"];

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
  { name: "A+ Setup", category: "setup" },
  { name: "London Session", category: "session" },
  { name: "New York Session", category: "session" },
  { name: "FOMO", category: "mistake" },
  { name: "Revenge Trade", category: "mistake" },
];

function seedRandom(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
const rnd = seedRandom(42);
function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function pickMultiple(arr, min, max) {
  const n = Math.floor(rnd() * (max - min + 1)) + min;
  return [...arr].sort(() => rnd() - 0.5).slice(0, n);
}

function genTrades() {
  const trades = [];
  const setupTags = TAG_CATALOG.filter((t) => t.category === "setup").map((t) => t.name);
  const mistakeTags = TAG_CATALOG.filter((t) => t.category === "mistake").map((t) => t.name);
  const today = new Date();
  let id = 1;

  for (let daysAgo = 110; daysAgo >= 0; daysAgo--) {
    const n = rnd() > 0.6 ? (rnd() > 0.78 ? 2 : 1) : 0;
    for (let i = 0; i < n; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      const hour = Math.floor(rnd() * 22) + 1;
      date.setUTCHours(hour, Math.floor(rnd() * 60), 0, 0);

      const pair = pick(PAIRS);
      const direction = rnd() > 0.5 ? "long" : "short";
      const tags = pickMultiple(setupTags, 1, 2);
      const isAplus = tags.includes("A+ Setup");
      const isHighProb = tags.includes("Order Block") || tags.includes("Fair Value Gap") || tags.includes("Liquidity Sweep");
      const isLowProb = tags.includes("Liquidity Void") || tags.includes("Balanced Price Range");
      let winProb = 0.54;
      if (isAplus) winProb += 0.22;
      if (isHighProb) winProb += 0.08;
      if (isLowProb) winProb -= 0.15;
      const actualWin = rnd() < winProb;

      const riskUsd = Math.round((40 + rnd() * 160) * 100) / 100;
      const rMultiple = actualWin
        ? Math.round((0.8 + rnd() * 3.2) * 100) / 100
        : -Math.round((0.6 + rnd() * 0.45) * 100) / 100;
      const resultUsd = Math.round(riskUsd * rMultiple * 100) / 100;
      const pipMult = pair === "XAUUSD" ? 10 : pair.includes("JPY") ? 0.93 : 10;
      const resultPips = Math.round(rMultiple * (8 + rnd() * 12) * pipMult * 10) / 10;

      const hasMistake = rnd() > 0.8;
      const mistakes = hasMistake ? pickMultiple(mistakeTags, 1, 1) : [];
      const entryPrice = pair === "XAUUSD" ? 2300 + rnd() * 100 : pair.includes("JPY") ? 145 + rnd() * 8 : 1 + rnd() * 0.3;
      const decimals = pair.includes("JPY") || pair === "XAUUSD" ? 2 : 5;

      const primarySetup = tags.find((t) => t !== "A+ Setup") || tags[0] || "Order Block";

      // Notes de réflexion corrélées au résultat (pour des stats cohérentes côté Coach)
      const baseQuality = actualWin ? 6 + rnd() * 4 : 3 + rnd() * 5;
      const clamp10 = (v) => Math.max(1, Math.min(10, Math.round(v)));
      const tradeRating = clamp10(baseQuality + (rnd() - 0.5) * 2);
      const analysisQuality = clamp10(baseQuality + (rnd() - 0.5) * 2);
      const confidence = clamp10(baseQuality + (rnd() - 0.5) * 3);
      const discipline = clamp10(actualWin ? 6 + rnd() * 4 : 4 + rnd() * 5);
      const emotionalLevel = clamp10(hasMistake ? 6 + rnd() * 4 : 2 + rnd() * 5);

      trades.push({
        id: id++,
        entryTime: date.toISOString(),
        pair, direction,
        setup: primarySetup,
        entryPrice: Number(entryPrice.toFixed(decimals)),
        stopLoss: null, takeProfit: null, exitPrice: null,
        positionSize: Number((0.1 + rnd() * 0.9).toFixed(2)),
        riskUsd, resultUsd, resultPips,
        resultR: rMultiple, resultRManual: false,
        status: rnd() > 0.95 ? "breakeven" : "closed",
        notes: pick([
          "Setup conforme au plan, exécution propre du début à la fin.",
          "Entrée un peu précipitée, j'aurais dû attendre la confirmation H1.",
          "Bonne lecture de la liquidité, sortie au bon moment sur la zone.",
          "Stop trop serré par rapport à la volatilité du moment.",
          "Respect total du plan de trading, rien à redire.",
          "Sorti trop tôt par manque de confiance dans le mouvement.",
          "J'ai déplacé mon stop par peur, à corriger.",
          "Belle confluence multi-timeframe, setup A+.",
        ]),
        tags: [...tags, ...mistakes],
        // Journal de réflexion
        reflection: {
          tradeRating, analysisQuality, confidence, discipline, emotionalLevel,
          whyTaken: "", whatWorked: "", whatFailed: "", toImprove: "",
        },
        // Évaluation du setup
        setupEval: {
          entry: clamp10(baseQuality + (rnd() - 0.5) * 2),
          riskManagement: clamp10(baseQuality + (rnd() - 0.5) * 2),
          timing: clamp10(baseQuality + (rnd() - 0.5) * 2),
          patience: clamp10(discipline + (rnd() - 0.5) * 2),
          execution: clamp10(baseQuality + (rnd() - 0.5) * 2),
        },
      });
    }
  }
  return trades.sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime));
}

const MOCK_TRADES = genTrades();

function getSession(isoDate) {
  // Détecte la killzone depuis l'heure d'entrée en UTC+7 (Thaïlande)
  const d = new Date(isoDate);
  const thH = (d.getUTCHours() + 7) % 24;
  const thM = d.getUTCMinutes();
  const thMin = thH * 60 + thM;
  // Asia : 07:00-11:00 TH
  if (thMin >= 7*60 && thMin < 11*60) return "Asia Session";
  // London : 13:00-16:00 TH
  if (thMin >= 13*60 && thMin < 16*60) return "London Session";
  // New York Matin : 19:30-22:00 TH
  if (thMin >= 19*60+30 && thMin < 22*60) return "New York Session";
  // New York Après-midi : 00:30-03:00 TH (chevauchement minuit)
  if (thMin >= 0*60+30 && thMin < 3*60) return "New York Session";
  return "Hors session";
}

// Killzones en heure Thaïlande (UTC+7)
const KILLZONES = [
  { name: "Asia", start: "07:00", end: "11:00", color: "#E67E22", emoji: "🌏", utcStart: 0, utcEnd: 4 },
  { name: "London", start: "13:00", end: "16:00", color: "#4A7FBF", emoji: "🇬🇧", utcStart: 6, utcEnd: 9 },
  { name: "New York Matin", start: "19:30", end: "22:00", color: "#C0392B", emoji: "🗽", utcStart: 12.5, utcEnd: 15 },
  { name: "New York Après-midi", start: "00:30", end: "03:00", color: "#E74C3C", emoji: "🌆", utcStart: 17.5, utcEnd: 20 },
];

function KillzoneBanner() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const thH = (now.getUTCHours() + 7) % 24;
  const thM = now.getUTCMinutes();
  const thMin = thH * 60 + thM;

  const toMin = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
  const isInZone = (kz) => {
    const s = toMin(kz.start), e = toMin(kz.end);
    return e > s ? thMin >= s && thMin < e : thMin >= s || thMin < e;
  };
  const minsUntil = (kz) => {
    const s = toMin(kz.start);
    return s > thMin ? s - thMin : 1440 - thMin + s;
  };
  const fmt = (m) => m >= 60 ? `${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}` : `${m}min`;

  const dayOfWeek = now.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const active = !isWeekend && KILLZONES.find(isInZone);
  const next = !isWeekend && !active && [...KILLZONES].sort((a,b) => minsUntil(a) - minsUntil(b))[0];
  const minsLeft = active ? (() => { const e = toMin(active.end); return e > thMin ? e - thMin : 1440 - thMin + e; })() : null;

  // Vérif news économiques - dans useMemo pour éviter re-renders
  const newsAlert = useMemo(() => {
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);
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
          <span style={{ fontSize: 13 }}>🔴</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff" }}>
            {newsAlert.isToday ? "AUJOURD'HUI" : "DEMAIN"} — {newsAlert.news.type} : {newsAlert.news.label}
          </span>
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", marginLeft: "auto" }}>
            {newsAlert.isToday ? "⚠️ News aujourd'hui — trader avec précaution" : "⚠️ News demain — prépare-toi"}
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

        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          {KILLZONES.map(kz => {
            const isAct = !isWeekend && isInZone(kz);
            const short = kz.name === "New York Matin" ? "NY·AM" : kz.name === "New York Après-midi" ? "NY·PM" : kz.name.toUpperCase();
            return (
              <span key={kz.name} className="tnum" style={{ fontSize: 9.5, fontWeight: isAct ? 700 : 400, color: isAct ? kz.color : "rgba(255,255,255,0.2)", letterSpacing: 0.5 }}>
                {short}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
}
function KillzoneWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Heure Thaïlande = UTC+7
  const thH = (now.getUTCHours() + 7) % 24;
  const thM = now.getUTCMinutes();
  const thTime = `${String(thH).padStart(2, "0")}:${String(thM).padStart(2, "0")}`;

  const activeZone = KILLZONES.find(kz => {
    const [sh, sm] = kz.start.split(":").map(Number);
    const [eh, em] = kz.end.split(":").map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const nowMin = thH * 60 + thM;
    if (endMin > startMin) return nowMin >= startMin && nowMin < endMin;
    return nowMin >= startMin || nowMin < endMin; // chevauchement minuit
  });

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <CardLabel style={{ margin: 0 }}>🕐 Killzones ICT</CardLabel>
        <div className="tnum" style={{ fontSize: 13, fontWeight: 700, color: activeZone ? activeZone.color : C.textMuted }}>
          TH {thTime} {activeZone ? `• ${activeZone.emoji} ${activeZone.name}` : "• Hors killzone"}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {KILLZONES.map(kz => {
          const isActive = activeZone?.name === kz.name;
          return (
            <div key={kz.name} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "9px 12px", borderRadius: 8,
              background: isActive ? `${kz.color}15` : C.inputBg || C.card,
              border: `1px solid ${isActive ? kz.color : C.border}`,
              transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15 }}>{kz.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? kz.color : C.text }}>{kz.name}</span>
                {isActive && <span style={{ fontSize: 10, background: kz.color, color: "#fff", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>LIVE</span>}
              </div>
              <span className="tnum" style={{ fontSize: 12, color: isActive ? kz.color : C.textMuted, fontWeight: isActive ? 700 : 400 }}>
                {kz.start} – {kz.end}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 6 }}>Heure Thaïlande (UTC+7) · Forex/Gold</div>
    </div>
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
    <div className={hover ? "card-int" : ""} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, ...style }} {...rest}>
      {children}
    </div>
  );
}

function CardLabel({ children, info }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>
      {children}
      {info && <Info size={12} color={C.textMuted} />}
    </div>
  );
}

function PageHeader({ title, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: C.text, letterSpacing: -0.3 }}>{title}</h1>
      {action}
    </div>
  );
}

function StatTile({ label, value, valueColor, sub, delta, deltaPositive, compact, small }) {
  const pad = small ? "8px 10px" : compact ? "9px 11px" : "12px 14px";
  const labelSize = small ? 9.5 : compact ? 10 : 11.5;
  const valueSize = small ? 13.5 : compact ? 15 : 19;
  return (
    <Card hover style={{ padding: pad, minWidth: 0, overflow: "hidden" }}>
      <div style={{ fontSize: labelSize, color: C.textSecondary, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div className="tnum" style={{ fontWeight: 600, fontSize: valueSize, color: valueColor || C.text, letterSpacing: -0.2, marginTop: small ? 2 : 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </div>
      {(sub || delta) && !compact && !small && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          {delta && (
            <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10.5, fontWeight: 600, color: deltaPositive ? C.teal : C.red }}>
              {deltaPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{delta}
            </span>
          )}
          {sub && <span style={{ fontSize: 10.5, color: C.textMuted }}>{sub}</span>}
        </div>
      )}
    </Card>
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
    { value: "win", label: "✅ Win", resultR: Math.abs(resultR || 1) },
    { value: "loss", label: "❌ Loss", resultR: -(Math.abs(resultR || 1)) },
    { value: "breakeven", label: "➖ Breakeven", resultR: 0 },
    { value: "open", label: "🔓 Ouvert", resultR: resultR },
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
function CheckSVG({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#7C5CFC" strokeWidth="1.8"/>
      <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#7C5CFC" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* Select avec crochet positionné à l'intérieur à droite */
function SelectWithCheck({ value, onChange, children, style }) {
  const hasValue = value && value !== "" && !value.startsWith("—");
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...style,
          paddingRight: hasValue ? 36 : undefined,
          borderColor: focused ? (C.focusBorder) : (C.border),
          boxShadow: focused ? (C.focusShadow) : "none",
        }}>
        {children}
      </select>
      {hasValue && (
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
          <CheckSVG size={16} />
        </span>
      )}
    </div>
  );
}

function InputWithCheck({ value, style, ...props }) {
  const hasValue = value && value !== "";
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onFocus={(e) => { setFocused(true); props.onFocus && props.onFocus(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur && props.onBlur(e); }}
        style={{
          ...style,
          paddingRight: hasValue ? 36 : undefined,
          borderColor: focused ? (C.focusBorder) : (C.border),
          boxShadow: focused ? (C.focusShadow) : "none",
        }}
        {...props}
      />
      {hasValue && (
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
          <CheckSVG size={16} />
        </span>
      )}
    </div>
  );
}

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
  { id: "trades", label: "Trade Log", short: "Trades", icon: NotebookPen },
  { id: "plan", label: "Plan", short: "Plan", icon: BookOpen },
  { id: "previsions", label: "Prévisions", short: "Prévis.", icon: TrendingUp },
  { id: "stats", label: "Statistiques", short: "Stats", icon: BarChart3 },
  { id: "settings", label: "Réglages", short: "Réglages", icon: Settings },
];

function MobileNav({ view, setView, onNewTrade }) {
  return (
    <nav className="mobile-only" data-mobile="1" style={{
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      zIndex: 999,
      display: "flex", justifyContent: "space-around", alignItems: "flex-end",
      paddingTop: 10,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      background: THEMES.dark.sidebar,
      borderTop: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 -2px 20px rgba(0,0,0,0.4)",
    }}>
      {NAV_ITEMS.slice(0, 3).map((it) => {
        const active = view === it.id || (view === "tradeForm" && it.id === "trades") || (view === "tradeDetail" && it.id === "trades");
        return (
          <button key={it.id} onClick={() => setView(it.id)} style={{
            background: "none", border: "none",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 3, cursor: "pointer", padding: "0 4px", minWidth: 52,
            color: active ? "#9D8FFF" : "rgba(255,255,255,0.4)",
          }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32 }}>
              {active && <div style={{ position: "absolute", inset: -3, borderRadius: 10, background: "rgba(157,143,255,0.14)" }} />}
              {it.id === "dashboard" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ position: "relative" }}>
                  <path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
                    fill={active ? "rgba(157,143,255,0.2)" : "transparent"}
                    stroke={active ? "#9D8FFF" : "rgba(255,255,255,0.4)"}
                    strokeWidth={active ? "2" : "1.7"}
                    strokeLinejoin="round" strokeLinecap="round"/>
                </svg>
              ) : React.createElement(it.icon, { size: 22, strokeWidth: active ? 2 : 1.7, style: { position: "relative" } })}
            </div>
            <span style={{ fontSize: 10.5, fontWeight: active ? 600 : 400, letterSpacing: 0.1 }}>{it.short}</span>
          </button>
        );
      })}

      {/* Bouton + central */}
      <button onClick={onNewTrade} style={{
        background: "none", border: "none",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 3, cursor: "pointer", padding: "0 4px", minWidth: 52,
        marginTop: -10,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: "50%",
          background: `linear-gradient(135deg, ${THEMES.dark.purple}, #5B3FE0)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 12px rgba(139,124,246,0.35)",
          border: "2px solid rgba(255,255,255,0.12)",
        }}>
          <Plus size={24} strokeWidth={2.2} color="#fff" />
        </div>
        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>Ajouter</span>
      </button>

      {NAV_ITEMS.slice(3).map((it) => {
        const active = view === it.id;
        return (
          <button key={it.id} onClick={() => setView(it.id)} style={{
            background: "none", border: "none",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 3, cursor: "pointer", padding: "0 4px", minWidth: 52,
            color: active ? "#9D8FFF" : "rgba(255,255,255,0.4)",
          }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32 }}>
              {active && <div style={{ position: "absolute", inset: -3, borderRadius: 10, background: "rgba(157,143,255,0.14)" }} />}
              {React.createElement(it.icon, { size: 22, strokeWidth: active ? 2 : 1.7, style: { position: "relative" } })}
            </div>
            <span style={{ fontSize: 10.5, fontWeight: active ? 600 : 400, letterSpacing: 0.1 }}>{it.short}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Sidebar({ view, setView, onNewTrade }) {
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

        <button onClick={onNewTrade} className="new-trade-btn" style={getS().newTradeBtn} title="Add Trade">
          <Plus size={15} strokeWidth={2.4} /> <span className="new-trade-label">Add Trade</span>
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
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(139,124,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#C4BAFB" }}>JD</div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.sidebarText }}>Mon compte</div>
              <div style={{ fontSize: 10.5, color: C.sidebarTextDim }}>Compte démo</div>
            </div>
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

function TopBar({ title, isDark, onToggleTheme, onCalendar, onCoach, accounts, activeAccountId, onSwitchAccount, onHome, currentBalance }) {
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

        {/* Calendrier */}
        <button onClick={onCalendar} style={{ ...btn.icon, background: C.sidebarHover, borderColor: C.sidebarBorder }} title="Calendrier">
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
        <button onClick={onCoach} style={{ ...btn.icon, background: C.sidebarHover, borderColor: C.sidebarBorder }} title="IA Coach">
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
  const startOfDay = new Date(now); startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay); startOfWeek.setUTCDate(startOfDay.getUTCDate() - ((startOfDay.getUTCDay() + 6) % 7));
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

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

function MiniBarRow({ label, pnl, maxAbsPnl }) {
  const pct = maxAbsPnl ? (Math.abs(pnl) / maxAbsPnl) * 100 : 0;
  const positive = pnl >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
      <span style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500, width: 84, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.bg, overflow: "hidden" }}>
        <div style={{ width: `${Math.max(pct, 3)}%`, height: "100%", background: positive ? C.teal : C.red, borderRadius: 3 }} />
      </div>
      <span className="tnum" style={{ fontSize: 12, fontWeight: 700, color: positive ? C.teal : C.red, width: 64, textAlign: "right", flexShrink: 0 }}>{fmtUsdSigned(pnl)}</span>
    </div>
  );
}

function Dashboard({ trades, onOpenTrade, setView, initialBalance = 10000 }) {
  const [period, setPeriod] = useState("30j");

  const filteredTrades = useMemo(() => {
    if (period === "tout") return trades;
    const days = period === "7j" ? 7 : period === "30j" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    // Les données mock sont de 2026 — on adapte la référence
    const ref = new Date();
    const cutoff = new Date(ref);
    cutoff.setDate(ref.getDate() - days);
    return trades.filter((t) => new Date(t.entryTime) >= cutoff);
  }, [trades, period]);

  const stats = useMemo(() => computeStats(filteredTrades, initialBalance), [filteredTrades, initialBalance]);
  const byPair = useMemo(() => groupBy(stats.closed, (t) => t.pair).sort((a, b) => b.pnl - a.pnl).slice(0, 5), [stats.closed]);
  const bySetup = useMemo(() => {
    if (!stats?.closed) return [];
    const map = {};
    stats.closed.forEach(t => {
      const pdTags = (t.tags || []).filter(tag => TAG_CATALOG.find(tc => tc.name === tag && tc.category === "setup"));
      const keys = pdTags.length > 0 ? pdTags : (t.setup ? [t.setup] : []);
      keys.forEach(key => {
        if (!map[key]) map[key] = { key, pnl: 0, wins: 0, trades: [] };
        map[key].pnl += t.resultUsd || 0;
        if (t.resultR > 0) map[key].wins += 1;
        map[key].trades.push(t);
      });
    });
    return Object.values(map).sort((a, b) => b.pnl - a.pnl).slice(0, 5);
  }, [stats?.closed]);
  const bySession = useMemo(() => groupBy(stats.closed, (t) => getSession(t.entryTime)).sort((a, b) => b.pnl - a.pnl), [stats.closed]);

  const byTag = useMemo(() => {
    const setupTagNames = TAG_CATALOG.filter((t) => t.category === "setup").map((t) => t.name);
    const map = {};
    stats.closed.forEach((t) => {
      (t.tags || []).forEach((tag) => {
        if (!setupTagNames.includes(tag)) return;
        if (!map[tag]) map[tag] = { wins: 0, total: 0 };
        map[tag].total++;
        if (t.resultR > 0) map[tag].wins++;
      });
    });
    return Object.entries(map)
      .map(([key, v]) => ({ key, winRate: v.total ? (v.wins / v.total) * 100 : 0, count: v.total }))
      .filter((g) => g.count >= 2)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 8);
  }, [stats.closed]);

  const maxAbsPair = Math.max(...byPair.map((g) => Math.abs(g.pnl)), 1);
  const maxAbsSetup = Math.max(...bySetup.map((g) => Math.abs(g.pnl)), 1);
  const maxAbsSession = Math.max(...bySession.map((g) => Math.abs(g.pnl)), 1);

  const winLossData = [
    { name: "Gagnants", value: stats.wins.length, color: C.teal },
    { name: "Perdants", value: stats.losses.length, color: C.red },
  ];

  const recentTrades = filteredTrades.slice(0, 6);
  const PERIODS = ["7j", "30j", "90j", "tout"];

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
          <button onClick={() => setView("coach")} style={{ ...btn.ghost, fontSize: 12 }}><Brain size={13} /> IA Coach</button>
          <button onClick={() => exportToCsv(filteredTrades)} style={btn.ghost}><Download size={13} /> Export</button>
        </div>
      } />

      {/* KPI — 8 métriques, grille parfaitement paire, aucun trou */}
      <div className="grid-kpi-8" style={{ marginBottom: 14 }}>
        <StatTile compact label="Profit total" value={fmtUsdSigned(stats.totalPnl)} valueColor={stats.totalPnl >= 0 ? C.teal : C.red} />
        <StatTile compact label="Avg R" value={fmtR(stats.avgRR)} valueColor={stats.avgRR >= 0 ? C.teal : C.red} />
        <StatTile compact label="Avg Win" value={stats.wins.length ? fmtUsdSigned(stats.avgWin) : "—"} valueColor={C.teal} />
        <StatTile compact label="Avg Loss" value={stats.losses.length ? fmtUsdSigned(stats.avgLoss) : "—"} valueColor={stats.losses.length ? C.red : C.textMuted} />
        <StatTile compact label="Winrate" value={fmtPct(stats.winRate)} sub={`${stats.wins.length}G / ${stats.losses.length}P`} />
        <StatTile compact label="Drawdown" value={`-${stats.maxDD.toFixed(1)}%`} valueColor={C.red} />
        <StatTile compact label="Trades" value={stats.closed.length} />
        <StatTile compact label="Capital actuel" value={fmtUsd(stats.currentBalance)} />
      </div>

      {/* Ligne 2 — courbe d'équité large */}
      <Card style={{ padding: "18px 20px 8px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <CardLabel info>Courbe d'équité cumulée</CardLabel>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ ...btn.ghost, padding: "5px 10px", fontSize: 11, background: C.purpleDim, color: C.purpleBright, borderColor: "transparent" }}>Cumulé</button>
            <button style={{ ...btn.ghost, padding: "5px 10px", fontSize: 11 }}>Quotidien</button>
          </div>
        </div>
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
      </Card>

      {/* Ligne 3 — Win/Loss + Profit par paire/setup/session */}
      <div className="dashboard-grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <Card style={{ padding: 16 }}>
          <CardLabel info>Win / Loss</CardLabel>
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8 }}>
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie data={winLossData} dataKey="value" innerRadius={34} outerRadius={52} paddingAngle={3} startAngle={90} endAngle={-270}>
                  {winLossData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Texte centré adaptatif */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <span className="tnum" style={{ fontSize: stats.winRate >= 100 ? 13 : stats.winRate >= 10 ? 16 : 18, fontWeight: 800, color: C.text, lineHeight: 1 }}>
                {fmtPct(stats.winRate)}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, fontSize: 11, marginTop: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.textSecondary }}><span style={{ width: 7, height: 7, borderRadius: 2, background: C.teal }} /> {stats.wins.length}W</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.textSecondary }}><span style={{ width: 7, height: 7, borderRadius: 2, background: C.red }} /> {stats.losses.length}L</span>
          </div>
        </Card>

        <Card style={{ padding: 16 }}>
          <CardLabel info>Profit par paire</CardLabel>
          <div style={{ marginTop: 8 }}>
            {byPair.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted, padding: "10px 0" }}>Pas de données</div> :
              byPair.map((g) => <MiniBarRow key={g.key} label={g.key} pnl={g.pnl} maxAbsPnl={maxAbsPair} />)}
          </div>
        </Card>

        <Card style={{ padding: 16 }}>
          <CardLabel info>Profit par setup</CardLabel>
          <div style={{ marginTop: 8 }}>
            {bySetup.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted, padding: "10px 0" }}>Pas de données</div> :
              bySetup.map((g) => <MiniBarRow key={g.key} label={g.key} pnl={g.pnl} maxAbsPnl={maxAbsSetup} />)}
          </div>
        </Card>

        <Card style={{ padding: 16 }}>
          <CardLabel info>Profit par session</CardLabel>
          <div style={{ marginTop: 8 }}>
            {bySession.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted, padding: "10px 0" }}>Pas de données</div> :
              bySession.map((g) => <MiniBarRow key={g.key} label={g.key} pnl={g.pnl} maxAbsPnl={maxAbsSession} />)}
          </div>
        </Card>
      </div>

      {/* Win rate par PD Array */}
      {byTag.length > 0 && (
        <Card style={{ padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Win rate par setup</span>
            <span style={{ fontSize: 11, color: C.textMuted }}>min. 2 trades</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {byTag.map((g) => (
              <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 110, fontSize: 11.5, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.key}</div>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.border, overflow: "hidden" }}>
                  <div style={{ width: `${g.winRate}%`, height: "100%", borderRadius: 3, background: g.winRate >= 60 ? C.teal : g.winRate >= 40 ? "#D89A2E" : C.red }} />
                </div>
                <div className="tnum" style={{ width: 44, textAlign: "right", fontSize: 12, fontWeight: 700, color: g.winRate >= 60 ? C.teal : g.winRate >= 40 ? "#D89A2E" : C.red }}>
                  {g.winRate.toFixed(0)}%
                </div>
                <div style={{ width: 30, fontSize: 10.5, color: C.textMuted, textAlign: "right" }}>{g.count}T</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ligne 4 — Trades récents */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>Trades récents</span>
          <button onClick={() => setView("trades")} style={{ background: "none", border: "none", color: C.purpleBright, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Voir tout →</button>
        </div>

        <div className="desktop-only table-scroll">
          <div style={{ display: "grid", gridTemplateColumns: "90px 70px 60px 110px 90px 80px 1fr", padding: "8px 18px", fontSize: 10.5, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${C.border}`, minWidth: 640 }}>
            <div>Date</div><div>Paire</div><div>Dir.</div><div>Setup</div><div>Résultat</div><div>R</div><div>Tags</div>
          </div>
          {recentTrades.map((t) => (
            <div key={t.id} className="row-hover" onClick={() => onOpenTrade(t.id)} style={{ display: "grid", gridTemplateColumns: "90px 70px 60px 110px 90px 80px 1fr", padding: "11px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", cursor: "pointer", fontSize: 12.5, minWidth: 640 }}>
              <div style={{ color: C.textSecondary }}>{fmtDate(t.entryTime)}</div>
              <div style={{ fontWeight: 700 }}>{t.pair}</div>
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
            <div key={t.id} className="row-hover" onClick={() => onOpenTrade(t.id)} style={{ padding: "11px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{t.pair}</span>
                  <DirBadge direction={t.direction} />
                  <span style={{ fontSize: 11, color: C.textMuted }}>{t.setup}</span>
                </div>
                <span className="tnum" style={{ fontWeight: 700, fontSize: 12.5, color: t.resultUsd >= 0 ? C.teal : C.red }}>{fmtUsdSigned(t.resultUsd)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10.5, color: C.textMuted }}>{fmtDate(t.entryTime)}</span>
                <ResultBadge resultR={t.resultR} status={t.status} size="sm" onStatusChange={(newStatus, newR) => onStatusChange(t.id, newStatus, newR)} />
              </div>
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

function TradesList({ trades, onOpen, onNew, onStatusChange, onHome }) {
  // États appliqués (utilisés pour filtrer)
  const [search, setSearch] = useState("");
  const [filterPair, setFilterPair] = useState("all");
  const [filterSession, setFilterSession] = useState("all");
  const [filterTags, setFilterTags] = useState([]);
  const [filterResult, setFilterResult] = useState("all");
  const [filterOte, setFilterOte] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterSetup, setFilterSetup] = useState("all");

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
  };

  const setupOptions = useMemo(() => [...new Set(trades.map((t) => t.setup).filter(Boolean))], [trades]);
  const pdSetupOptions = TAG_CATALOG.filter(t => t.category === "setup");
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
      return true;
    });
  }, [trades, filterPair, filterSetup, filterSession, filterTags, filterResult, filterOte, dateFrom, dateTo, search]);

  const activeFilterCount = [filterPair !== "all", filterSetup !== "all", filterSession !== "all", filterTags.length > 0, filterResult !== "all", filterOte !== "all", dateFrom, dateTo].filter(Boolean).length;

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
      <PageHeader title="Trade Log" action={
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportToCsv(filtered)} style={btn.ghost}><Download size={14} /> Export CSV</button>
          <button onClick={onNew} style={btn.primary}><Plus size={14} /> Add Trade</button>
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
                  <option value="Asia Session">🌏 Asia</option>
                  <option value="London Session">🇬🇧 London</option>
                  <option value="New York Session">🗽 New York</option>
                  <option value="Hors session">Hors session</option>
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Résultat">
                <select value={pendingResult} onChange={(e) => setPendingResult(e.target.value)} style={inputStyle}>
                  <option value="all">Tous</option>
                  <option value="win">✅ Win</option>
                  <option value="loss">❌ Loss</option>
                  <option value="be">➖ Breakeven</option>
                  <option value="open">🔓 Ouvert</option>
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
            {(pendingPair !== "all" || pendingSession !== "all" || pendingResult !== "all" || pendingOte !== "all" || pendingTags.length > 0 || pendingDateFrom || pendingDateTo) && (
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
            const monthPnl = monthTrades.reduce((s, t) => s + (t.resultUsd || 0), 0);
            const monthR = monthTrades.reduce((s, t) => s + (t.resultR || 0), 0);
            const wins = monthTrades.filter(t => t.resultR > 0).length;
            return (
              <div key={monthKey} style={{ marginBottom: 16, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <button onClick={() => toggleMonth(monthKey)} style={{
                  width: "100%",
                  background: C.text === "#FFFFFF" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  border: "none", padding: "14px 16px",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                  borderBottom: isOpen ? `1px solid ${C.border}` : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 8, color: C.textMuted, transform: isOpen ? "rotate(0)" : "rotate(-90deg)", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, textTransform: "capitalize", letterSpacing: 0.2 }}>{monthLabel}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{monthTrades.length} trades · {wins}W/{monthTrades.length - wins}L</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="tnum" style={{ fontSize: 20, fontWeight: 800, color: monthR >= 0 ? C.teal : C.red, letterSpacing: -0.5 }}>{monthR >= 0 ? "+" : ""}{monthR.toFixed(1)}R</div>
                    <div className="tnum" style={{ fontSize: 11.5, fontWeight: 600, color: monthR >= 0 ? C.teal : C.red, marginTop: 1 }}>{fmtUsdSigned(monthPnl)}</div>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ background: "transparent", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="desktop-only table-scroll" style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "90px 90px 70px 1fr 90px 70px 80px", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, minWidth: 600 }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "90px 90px 70px 1fr 90px 70px 80px", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, minWidth: 600 }}>
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

function TradeRow({ t, onOpen }) {
  const setupTags = (t.tags || []).filter(tag => TAG_CATALOG.find(tc => tc.name === tag && tc.category === "setup"));
  const isWin = t.resultR > 0;
  const cur = t.status === "open" ? "open" : t.status === "breakeven" ? "breakeven" : isWin ? "win" : "loss";
  const statusColors = { win: C.teal, loss: C.red, breakeven: C.textSecondary, open: C.purple };
  const statusLabels = { win: "Win", loss: "Loss", breakeven: "BE", open: "Ouvert" };
  return (
    <div className="row-hover" onClick={() => onOpen(t.id)} style={{ display: "grid", gridTemplateColumns: "100px 80px 60px 1fr 90px 70px 80px", padding: "10px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", cursor: "pointer", fontSize: 13, minWidth: 560 }}>
      <div style={{ fontWeight: 700 }}>{t.pair}</div>
      <div style={{ color: C.textMuted, fontSize: 11.5 }}>{fmtDate(t.entryTime)}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.direction === "long" ? "#2D7DD2" : "#F97316" }}>{t.direction === "long" ? "Long" : "Short"}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {setupTags.slice(0, 2).map(tag => <TagBadge key={tag} name={tag} size="sm" />)}
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
  const tfAlignment = t.tfAlignment;
  const tfAlignmentSetup = t.tfAlignmentSetup;

  const sessionColor = sessionTag === "London Session" ? "#4A7FBF"
    : sessionTag === "New York Session" ? "#C0392B"
    : sessionTag === "Asia Session" ? "#E67E22" : C.textMuted;

  const sessionEmoji = sessionTag === "London Session" ? "🇬🇧"
    : sessionTag === "New York Session" ? "🗽"
    : sessionTag === "Asia Session" ? "🌏" : "";
  const sessionShort = sessionTag === "London Session" ? "London"
    : sessionTag === "New York Session" ? "New York"
    : sessionTag === "Asia Session" ? "Asia" : sessionTag;

  // Couleur des PD Arrays : gris-bleu neutre discret
  const pdColor = C.textSecondary;
  const pdBg = "rgba(200,208,228,0.07)";
  const pdBorder = "rgba(200,208,228,0.15)";

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

  return (
    <div style={{ marginBottom: isLast ? 0 : 10 }}>
      <div
        onClick={() => onOpen(t.id)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        style={{
          background: pressed ? C.cardHover : C.card,
          borderRadius: 12, border: `1px solid ${C.border}`,
          cursor: "pointer", transition: "background 0.1s", overflow: "hidden",
        }}
      >
        {/* Barre colorée en haut */}
        <div style={{ height: 3, background: accentColor }} />

        <div style={{ padding: "13px 14px 13px" }}>

          {/* Header : logo + paire + P&L */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
              <DirectionLogo />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: -0.5, lineHeight: 1.1 }}>{t.pair}</div>
                {/* Ligne contexte : date · session · direction · type */}
                <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 3, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                  <span style={{ color: C.text }}>{fmtDate(t.entryTime)}</span>
                  {sessionTag && <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{ color: sessionColor, fontWeight: 600 }}>{sessionEmoji} {sessionShort}</span>
                  </>}
                  {typeTag && <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{ color: C.text, fontWeight: 500 }}>{typeTag}</span>
                  </>}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div className="tnum" style={{ fontSize: 20, fontWeight: 800, color: pnlColor, letterSpacing: -0.5, lineHeight: 1.1 }}>{pnlDisplay}</div>
              <div className="tnum" style={{ fontSize: 12.5, fontWeight: 600, color: pnlColor, opacity: 0.8, marginTop: 2, lineHeight: 1 }}>{rDisplay}</div>
            </div>
          </div>

          {/* Tableau prix — une seule carte avec séparateurs fins */}
          <div style={{ borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: (tfTags.length > 0 || setupTags.length > 0 || tfAlignment || t.oteFib) ? 10 : 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr 1px 1fr", background: C.inputBg }}>
              {[
                { label: "Entrée", value: t.entryPrice != null ? String(t.entryPrice) : null, color: C.text },
                null, // séparateur
                { label: "SL", value: t.stopLoss != null ? String(t.stopLoss) : null, color: C.red },
                null,
                { label: "TP", value: t.takeProfit != null ? String(t.takeProfit) : null, color: C.teal },
                null,
                { label: "Risque", value: t.riskUsd != null ? `$${Math.abs(t.riskUsd).toFixed(0)}` : null, color: C.textSecondary },
              ].map((item, i) => {
                if (item === null) return <div key={i} style={{ width: 1, background: C.border, alignSelf: "stretch" }} />;
                return (
                  <div key={item.label} style={{ padding: "8px 8px" }}>
                    <div style={{ fontSize: 8.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{item.label}</div>
                    <div className="tnum" style={{ fontSize: 12, fontWeight: 700, color: item.value ? item.color : C.textMuted }}>{item.value ?? "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tags hiérarchisés */}
          {(tfTags.length > 0 || setupTags.length > 0 || tfAlignment || t.oteFib) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>

              {/* Ligne 1 : TF trade (violet) + PD Arrays (turquoise) */}
              {(tfTags.length > 0 || setupTags.length > 0) && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                  {/* TF — violet */}
                  {tfTags.map(tf => (
                    <span key={tf} style={{ fontSize: 11, fontWeight: 700, color: C.purpleBright, background: C.purpleDim, border: `1px solid rgba(149,128,255,0.25)`, padding: "2px 8px", borderRadius: 5 }}>{tf}</span>
                  ))}
                  {/* PD Arrays — turquoise */}
                  {setupTags.map(tag => {
                    const def = TAG_CATALOG.find(tc => tc.name === tag);
                    const color = def?.color || pdColor;
                    const bg = def?.color ? `${def.color}10` : pdBg;
                    const border = def?.color ? `${def.color}30` : pdBorder;
                    return <span key={tag} style={{ fontSize: 11, fontWeight: 500, color, background: bg, border: `1px solid ${border}`, padding: "2px 8px", borderRadius: 5 }}>{tag}</span>;
                  })}
                </div>
              )}

              {/* Ligne 2 : TF supérieur (violet) + setup supérieur (turquoise) */}
              {tfAlignment && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.purpleBright, background: C.purpleDim, border: `1px solid rgba(149,128,255,0.25)`, padding: "2px 8px", borderRadius: 5 }}>{tfAlignment}</span>
                  {tfAlignmentSetup && (
                    <span style={{ fontSize: 11, fontWeight: 500, color: pdColor, background: pdBg, border: `1px solid ${pdBorder}`, padding: "2px 8px", borderRadius: 5 }}>{tfAlignmentSetup}</span>
                  )}
                </div>
              )}

              {/* Ligne 3 : OTE (turquoise fort) */}
              {t.oteFib && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#818CF8", background: "rgba(129,140,248,0.10)", border: "1px solid rgba(129,140,248,0.25)", padding: "2px 8px", borderRadius: 5, alignSelf: "flex-start" }}>OTE {t.oteFib}</span>
              )}
            </div>
          )}
        </div>
      </div>
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
        <span style={{ fontSize: 15 }}>🎯</span>
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
          <div style={{ fontSize: 11, color: diff >= 0 ? C.teal : C.red }}>{diff >= 0 ? "✅ mieux" : "❌ moins"}</div>
        </div>
      </div>

      <div style={{ padding: "9px 12px", background: C.inputBg || C.card, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.textSecondary, lineHeight: 1.55 }}>
        {simR < Math.abs(realR) && realPnl > 0 && "💡 Tu avais raison de garder — ton TP réel a rapporté davantage."}
        {simR > Math.abs(realR) && realPnl > 0 && `💡 Avec un TP à ${simR}R tu aurais gagné ${Math.abs(diff).toFixed(0)}$ de plus. Élargir ton TP sur ce setup peut valoir le coup.`}
        {simR < Math.abs(realR) && realPnl < 0 && `💡 Si tu avais coupé à ${simR}R tu aurais limité la perte à ${Math.abs(simPnl).toFixed(0)}$.`}
        {simR > Math.abs(realR) && realPnl < 0 && "💡 Ce trade a été perdant. Garder plus longtemps n'aurait pas changé l'issue."}
        {Math.abs(simR - Math.abs(realR)) < 0.01 && "↑ C'est exactement ton résultat réel."}
      </div>
    </Card>
  );
}

function PdRuleRow({ tag, color }) {
  const [resp, setResp] = useState(null);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: C.inputBg || C.card, borderRadius: 10, border: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{tag}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => setResp(resp === "ok" ? null : "ok")} style={{
          padding: "5px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: resp === "ok" ? 700 : 400,
          border: `1.5px solid ${resp === "ok" ? C.teal : C.border}`,
          background: resp === "ok" ? C.tealDim : "transparent",
          color: resp === "ok" ? C.teal : C.textMuted, cursor: "pointer",
        }}>✅ Respecté</button>
        <button onClick={() => setResp(resp === "no" ? null : "no")} style={{
          padding: "5px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: resp === "no" ? 700 : 400,
          border: `1.5px solid ${resp === "no" ? C.red : C.border}`,
          background: resp === "no" ? C.redDim : "transparent",
          color: resp === "no" ? C.red : C.textMuted, cursor: "pointer",
        }}>❌ Non</button>
      </div>
    </div>
  );
}

function TradeDetail({ trade, onBack, onEdit, onDelete, onVerdictChange, onRetroSave }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState("avant");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState("");
  const [retroNote, setRetroNote] = useState(trade?.retroNote || "");
  const [retroRating, setRetroRating] = useState(trade?.retroRating || 0);

  // Sauvegarde auto retroRating quand il change
  const handleRetroRating = (val) => {
    setRetroRating(val);
    if (onRetroSave && trade?.id) onRetroSave(trade.id, { retroRating: val, retroNote });
  };
  const handleRetroNote = (val) => {
    setRetroNote(val);
    if (onRetroSave && trade?.id) onRetroSave(trade.id, { retroRating, retroNote: val });
  };
  const [imgZoom, setImgZoom] = useState(null); // { src, label }

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
    { id: "avant", label: "Avant" },
    { id: "apres", label: "Après" },
    { id: "retour", label: "Retour" },
  ];

  // Composant barre de score cliquable
  const ScoreBar = ({ value, onChange, colors }) => (
    <div style={{ display: "flex", gap: 3 }}>
      {[1,2,3,4,5,6,7,8,9,10].map(n => {
        const col = n <= 3 ? C.red : n <= 5 ? C.amber : n <= 7 ? C.teal : C.purpleBright;
        const filled = n <= value;
        return (
          <button key={n} onClick={() => onChange(n === value ? 0 : n)} style={{
            flex: 1, height: 24, borderRadius: 4, border: "none", cursor: "pointer",
            background: filled ? col : (C.inputBg || C.card),
            opacity: filled ? 1 : 0.2, transition: "all 0.1s",
          }} />
        );
      })}
    </div>
  );

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
          <div style={{ fontSize: 12, color: C.textSecondary, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Clock size={12} /> {fmtDateTime(trade.entryTime)} · {getSession(trade.entryTime)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onEdit(trade)} style={btn.ghost}><Edit3 size={13} /> Modifier</button>
          <button onClick={() => shareTradeCard(trade)} style={btn.ghost}>📤</button>
          {confirmDelete
            ? <button onClick={() => onDelete(trade.id)} style={{ ...btn.ghost, color: C.red, borderColor: `${C.red}50` }}>Confirmer</button>
            : <button onClick={() => setConfirmDelete(true)} style={btn.icon}><Trash2 size={14} /></button>
          }
        </div>
      </div>

      {/* Onglets avec swipe */}
      {(() => {
        const tabOrder = ["avant", "apres", "retour"];
        const handleSwipe = (() => {
          let startX = 0;
          return {
            onTouchStart: (e) => { startX = e.touches[0].clientX; },
            onTouchEnd: (e) => {
              const diff = startX - e.changedTouches[0].clientX;
              if (Math.abs(diff) < 50) return;
              const cur = tabOrder.indexOf(activeTab);
              if (diff > 0 && cur < tabOrder.length - 1) setActiveTab(tabOrder[cur + 1]);
              if (diff < 0 && cur > 0) setActiveTab(tabOrder[cur - 1]);
            },
          };
        })();
        return (
          <div {...handleSwipe}>
            <div style={{ display: "flex", gap: 0, marginBottom: 18, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, background: C.inputBg || C.card }}>
              {TABS.map((tab, i) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  flex: 1, padding: "11px 8px", border: "none", borderRight: i < TABS.length - 1 ? `1px solid ${C.border}` : "none",
                  background: activeTab === tab.id ? C.purple : "transparent",
                  color: activeTab === tab.id ? "#fff" : C.textMuted,
                  fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400,
                  cursor: "pointer", transition: "all 0.15s",
                }}>{tab.label}</button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ─── ONGLET 1 : AVANT ─── */}
      <div onTouchStart={(e) => { window._swipeStartX = e.touches[0].clientX; }} onTouchEnd={(e) => {
        const diff = (window._swipeStartX || 0) - e.changedTouches[0].clientX;
        const tabs = ["avant","apres","retour"];
        const cur = tabs.indexOf(activeTab);
        if (Math.abs(diff) > 50) { if (diff > 0 && cur < 2) setActiveTab(tabs[cur+1]); if (diff < 0 && cur > 0) setActiveTab(tabs[cur-1]); }
      }}>
      {activeTab === "avant" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Screenshots côte à côte : paire gauche, DXY droite */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, padding: "5px 8px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Paire — Avant</div>
              {trade.screenshotBefore
                ? <img src={trade.screenshotBefore} alt="Avant" onClick={() => setImgZoom({ src: trade.screenshotBefore, label: "Paire — Avant" })} style={{ width: "100%", display: "block", cursor: "zoom-in" }} />
                : <div style={{ padding: "24px 8px", textAlign: "center", color: C.textMuted, fontSize: 11 }}>Aucun screenshot</div>
              }
            </Card>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, padding: "5px 8px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>DXY — Avant</div>
              {trade.dxyScreenshotBefore
                ? <img src={trade.dxyScreenshotBefore} alt="DXY Avant" onClick={() => setImgZoom({ src: trade.dxyScreenshotBefore, label: "DXY — Avant" })} style={{ width: "100%", display: "block", cursor: "zoom-in" }} />
                : <div style={{ padding: "24px 8px", textAlign: "center", color: C.textMuted, fontSize: 11 }}>Aucun screenshot</div>
              }
            </Card>
          </div>

          {/* Identification setup */}
          <Card style={{ padding: 16 }}>
            <CardLabel>Identification</CardLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <DetailStat label="Paire" value={trade.pair} />
              <DetailStat label="Direction" value={trade.direction === "long" ? "Long 📈" : "Short 📉"} valueColor={trade.direction === "long" ? "#4A9EFF" : "#F97316"} />
              <DetailStat label="Session" value={getSession(trade.entryTime) || "—"} />
              <DetailStat label="Timeframe" value={(trade.tags || []).find(t => ["M1","M5","M15","M30","H1","H4","D1","W1"].includes(t)) || "—"} />
              {trade.tfAlignment && <DetailStat label="TF alignement" value={`${trade.tfAlignment}${trade.tfAlignmentSetup ? ` · ${trade.tfAlignmentSetup}` : ""}`} />}
              {trade.oteFib && <DetailStat label="Zone OTE" value={`${trade.oteFib} (${trade.oteFib === "0.618" ? "Golden" : trade.oteFib === "0.79" ? "Premium" : trade.oteFib})`} valueColor={C.teal} />}
            </div>
          </Card>

          {/* PD Arrays + setup */}
          {((trade.tags || []).filter(t => TAG_CATALOG.find(tc => tc.name === t && tc.category === "setup")).length > 0) && (
            <Card style={{ padding: 16 }}>
              <CardLabel>PD Arrays / Setup</CardLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {(trade.tags || []).filter(t => TAG_CATALOG.find(tc => tc.name === t && tc.category === "setup")).map(tag => <TagBadge key={tag} name={tag} />)}
              </div>
            </Card>
          )}

          {/* DXY */}
          {(trade.dxyBias || trade.dxyTags?.length > 0) && (
            <Card style={{ padding: 16 }}>
              <CardLabel>Analyse DXY</CardLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                {trade.dxyBias && <DetailStat label="Biais DXY" value={trade.dxyBias} />}
                {trade.dxyTags?.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {trade.dxyTags.map(tag => <TagBadge key={tag} name={tag} size="sm" />)}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Checklist */}
          {(trade.liquiditySweep !== undefined || trade.mssConfirmed !== undefined) && (
            <Card style={{ padding: 16 }}>
              <CardLabel>Checklist</CardLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {[
                  { label: "Sweep de liquidité", val: trade.liquiditySweep },
                  { label: "MSS confirmé", val: trade.mssConfirmed },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: C.bg, borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: C.text }}>{item.label}</span>
                    <span style={{ fontSize: 16 }}>{item.val ? "✅" : "❌"}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Niveau de confiance avant */}
          {trade.confidenceLevel > 0 && (
            <Card style={{ padding: 16 }}>
              <CardLabel>Niveau de confiance avant le trade</CardLabel>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: C.textSecondary }}>
                    {trade.confidenceLevel <= 3 ? "⚠️ Faible" : trade.confidenceLevel <= 5 ? "🟡 Moyen" : trade.confidenceLevel <= 7 ? "🟢 Bon" : "🔥 Excellent"}
                  </span>
                  <span className="tnum" style={{ fontSize: 24, fontWeight: 800, color: trade.confidenceLevel <= 3 ? C.red : trade.confidenceLevel <= 5 ? C.amber : trade.confidenceLevel <= 7 ? C.teal : C.purpleBright }}>
                    {trade.confidenceLevel}/10
                  </span>
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => {
                    const col = n <= 3 ? C.red : n <= 5 ? C.amber : n <= 7 ? C.teal : C.purpleBright;
                    return <div key={n} style={{ flex: 1, height: 8, borderRadius: 3, background: n <= trade.confidenceLevel ? col : (C.border) }} />;
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Notes avant */}
          {trade.notes && (
            <Card style={{ padding: 16 }}>
              <CardLabel>Notes</CardLabel>
              <p style={{ fontSize: 13, lineHeight: 1.6, margin: "10px 0 0", color: C.text, whiteSpace: "pre-wrap" }}>{trade.notes}</p>
            </Card>
          )}
        </div>
      )}

      {/* ─── ONGLET 2 : APRÈS ─── */}
      {activeTab === "apres" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Screenshots côte à côte : paire gauche, DXY droite */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, padding: "5px 8px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Paire — Après</div>
              {trade.screenshotAfter
                ? <img src={trade.screenshotAfter} alt="Après" onClick={() => setImgZoom({ src: trade.screenshotAfter, label: "Paire — Après" })} style={{ width: "100%", display: "block", cursor: "zoom-in" }} />
                : <div style={{ padding: "24px 8px", textAlign: "center", color: C.textMuted, fontSize: 11 }}>Aucun screenshot</div>
              }
            </Card>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, padding: "5px 8px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>DXY — Après</div>
              {trade.dxyScreenshotAfter
                ? <img src={trade.dxyScreenshotAfter} alt="DXY Après" onClick={() => setImgZoom({ src: trade.dxyScreenshotAfter, label: "DXY — Après" })} style={{ width: "100%", display: "block", cursor: "zoom-in" }} />
                : <div style={{ padding: "24px 8px", textAlign: "center", color: C.textMuted, fontSize: 11 }}>Aucun screenshot</div>
              }
            </Card>
          </div>

          {/* Résultat */}
          <Card style={{ padding: 16 }}>
            <CardLabel>Résultat</CardLabel>

            {/* P&L en grand */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, padding: "14px 12px", borderRadius: 10, background: (trade.status === "breakeven" ? "rgba(107,115,136,0.1)" : isWin ? C.tealDim : C.redDim), border: `1.5px solid ${trade.status === "breakeven" ? C.textMuted : isWin ? C.teal : C.red}40`, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Résultat $</div>
                <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: trade.status === "breakeven" ? C.textSecondary : isWin ? C.teal : C.red, letterSpacing: -0.5 }}>
                  {trade.status === "breakeven" ? "BE" : fmtUsdSigned(trade.resultUsd)}
                </div>
              </div>
              <div style={{ flex: 1, padding: "14px 12px", borderRadius: 10, background: (trade.status === "breakeven" ? "rgba(107,115,136,0.1)" : isWin ? C.tealDim : C.redDim), border: `1.5px solid ${trade.status === "breakeven" ? C.textMuted : isWin ? C.teal : C.red}40`, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Résultat R</div>
                <div className="tnum" style={{ fontSize: 22, fontWeight: 800, color: trade.status === "breakeven" ? C.textSecondary : isWin ? C.teal : C.red, letterSpacing: -0.5 }}>
                  {trade.status === "breakeven" ? "0R" : fmtR(trade.resultR)}
                </div>
              </div>
            </div>

            {/* Détails prix en grille */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <DetailStat label="Entrée" value={trade.entryPrice ?? "—"} />
              <DetailStat label="Sortie" value={trade.exitPrice ?? "—"} />
              <DetailStat label="Stop Loss" value={trade.stopLoss ?? "—"} valueColor={C.red} />
              <DetailStat label="Take Profit" value={trade.takeProfit ?? "—"} valueColor={C.teal} />
              <DetailStat label="Taille" value={trade.positionSize ? `${trade.positionSize} lot` : "—"} />
              <DetailStat label="Risque $" value={trade.riskUsd ? fmtUsd(trade.riskUsd) : "—"} />
            </div>
          </Card>

          {/* Statut */}
          <Card style={{ padding: 16 }}>
            <CardLabel>Statut</CardLabel>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {[
                { v: "open", label: "🔓 Ouvert", color: C.purple },
                { v: "win",  label: "✅ Gagné",  color: C.teal },
                { v: "loss", label: "❌ Perdu",  color: C.red },
                { v: "breakeven", label: "➖ BE", color: C.textSecondary },
              ].map(opt => {
                const active = trade.status === opt.v;
                return (
                  <div key={opt.v} style={{ flex: "1 1 80px", padding: "10px 8px", borderRadius: 9, textAlign: "center",
                    border: `2px solid ${active ? opt.color : C.border}`,
                    background: active ? `${opt.color}18` : "transparent",
                    color: active ? opt.color : C.textMuted, fontSize: 12, fontWeight: active ? 700 : 400 }}>
                    {opt.label}
                  </div>
                );
              })}
            </div>
          </Card>

        </div>
      )}

      {/* ─── ONGLET 3 : RETOUR ─── */}
      {activeTab === "retour" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Score confiance avant (lecture seule) */}
          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <CardLabel style={{ margin: 0 }}>Confiance avant le trade</CardLabel>
              <span className="tnum" style={{ fontSize: 20, fontWeight: 800, color: (trade.confidenceLevel || 0) <= 3 ? C.red : (trade.confidenceLevel || 0) <= 5 ? C.amber : (trade.confidenceLevel || 0) <= 7 ? C.teal : C.purpleBright }}>
                {trade.confidenceLevel ? `${trade.confidenceLevel}/10` : "—"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => {
                const col = n <= 3 ? C.red : n <= 5 ? C.amber : n <= 7 ? C.teal : C.purpleBright;
                const filled = n <= (trade.confidenceLevel || 0);
                return <div key={n} style={{ flex: 1, height: 10, borderRadius: 3, background: filled ? col : (C.inputBg || C.card), border: `1px solid ${filled ? col : C.border}` }} />;
              })}
            </div>
          </Card>

          {/* Score qualité après */}
          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <CardLabel style={{ margin: 0 }}>Qualité du trade (après)</CardLabel>
              <span className="tnum" style={{ fontSize: 20, fontWeight: 800, color: retroRating <= 0 ? C.textMuted : retroRating <= 3 ? C.red : retroRating <= 5 ? C.amber : retroRating <= 7 ? C.teal : C.purpleBright }}>
                {retroRating > 0 ? `${retroRating}/10` : "—"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => {
                const col = n <= 3 ? C.red : n <= 5 ? C.amber : n <= 7 ? C.teal : C.purpleBright;
                const filled = n <= retroRating;
                return (
                  <button key={n} onClick={() => handleRetroRating(n === retroRating ? 0 : n)} style={{
                    flex: 1, height: 30, borderRadius: 4,
                    border: `1.5px solid ${filled ? col : C.border}`,
                    cursor: "pointer", background: filled ? col : (C.inputBg || C.card),
                    transition: "all 0.1s",
                  }} />
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
              {retroRating === 0 ? "Évalue la qualité de l'exécution après coup." :
               retroRating <= 3 ? "⚠️ Trade de mauvaise qualité — à analyser" :
               retroRating <= 5 ? "🟡 Exécution correcte mais améliorable" :
               retroRating <= 7 ? "🟢 Bonne exécution dans l'ensemble" : "🔥 Exécution parfaite — A+ setup"}
            </p>
          </Card>

          {/* Delta */}
          {trade.confidenceLevel > 0 && retroRating > 0 && (
            <Card style={{ padding: 14, background: `${Math.abs(retroRating - trade.confidenceLevel) <= 1 ? C.teal : C.amber}12`, border: `1px solid ${Math.abs(retroRating - trade.confidenceLevel) <= 1 ? C.teal : C.amber}40` }}>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 3 }}>
                {Math.abs(retroRating - trade.confidenceLevel) <= 1 ? "✅ Bonne calibration" : retroRating > trade.confidenceLevel ? "⬆️ Meilleur que prévu" : "⬇️ Moins bon que prévu"}
              </div>
              <div style={{ fontSize: 12, color: C.textSecondary }}>
                Avant {trade.confidenceLevel}/10 · Après {retroRating}/10 · Écart {retroRating > trade.confidenceLevel ? "+" : ""}{retroRating - trade.confidenceLevel}
              </div>
            </Card>
          )}

          {/* PD Arrays — Respecté / Non respecté */}
          {(() => {
            const pdTags = (trade.tags || []).filter(t => TAG_CATALOG.find(tc => tc.name === t && tc.category === "setup"));
            if (pdTags.length === 0) return null;
            return (
              <Card style={{ padding: 16 }}>
                <CardLabel>Règles de setup respectées</CardLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                  {pdTags.map(tag => {
                    const def = TAG_CATALOG.find(t => t.name === tag);
                    const color = def?.color || C.purpleBright;
                    return <PdRuleRow key={tag} tag={tag} color={color} />;
                  })}
                </div>
              </Card>
            );
          })()}

          {/* Simulateur "Et si j'avais visé X R" */}
          {trade.riskUsd && trade.status !== "open" && <SimulateurTP trade={trade} />}

          {/* Rétrospective — 1 seul bloc texte */}
          <Card style={{ padding: 16 }}>
            <CardLabel>Rétrospective</CardLabel>
            <textarea rows={5} value={retroNote} onChange={e => handleRetroNote(e.target.value)} placeholder="Qu'est-ce qui s'est passé ? Qu'as-tu bien fait ? Qu'aurais-tu fait différemment ? Quelles leçons tirer ?" style={{ ...inputStyle, resize: "vertical", marginTop: 10, lineHeight: 1.6 }} />
          </Card>

          {/* Verdict */}
          <Card style={{ padding: 16 }}>
            <CardLabel>Ce trade était</CardLabel>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={() => onVerdictChange(trade.id, trade.verdict === "good" ? null : "good")} style={{
                flex: 1, padding: "14px 12px", borderRadius: 12, fontSize: 26,
                border: `2px solid ${trade.verdict === "good" ? C.teal : C.border}`,
                background: trade.verdict === "good" ? C.tealDim : (C.inputBg || C.card),
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              }}>
                👍
                <div style={{ fontSize: 12, color: trade.verdict === "good" ? C.teal : C.textMuted, fontWeight: 600 }}>Bon trade</div>
              </button>
              <button onClick={() => onVerdictChange(trade.id, trade.verdict === "bad" ? null : "bad")} style={{
                flex: 1, padding: "14px 12px", borderRadius: 12, fontSize: 26,
                border: `2px solid ${trade.verdict === "bad" ? C.red : C.border}`,
                background: trade.verdict === "bad" ? C.redDim : (C.inputBg || C.card),
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              }}>
                👎
                <div style={{ fontSize: 12, color: trade.verdict === "bad" ? C.red : C.textMuted, fontWeight: 600 }}>Mauvais trade</div>
              </button>
            </div>
          </Card>

          {/* Note personnelle */}
          <Card style={{ padding: 16 }}>
            <CardLabel>Note personnelle</CardLabel>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: "10px 0 0", color: C.text, whiteSpace: "pre-wrap" }}>{trade.notes || "Aucune note."}</p>
          </Card>

          {/* Analyse IA */}
          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Brain size={14} color={C.purpleBright} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>Analyse IA</span>
              </div>
              <button onClick={runAiAnalysis} disabled={aiLoading} style={{ ...btn.ghost, fontSize: 11.5, padding: "6px 11px", opacity: aiLoading ? 0.5 : 1 }}>
                {aiLoading ? "⟳" : <Sparkles size={12} />} {aiAnalysis ? "Réanalyser" : "Analyser"}
              </button>
            </div>
            {aiError && <div style={{ color: C.red, fontSize: 12, padding: "9px 11px", background: C.redDim, borderRadius: 7 }}>{aiError}</div>}
            {!aiAnalysis && !aiLoading && <div style={{ textAlign: "center", padding: "16px", color: C.textMuted, fontSize: 12 }}>Clique sur "Analyser" pour une lecture IA de ce trade.</div>}
            {aiLoading && <div style={{ textAlign: "center", padding: "16px", color: C.textSecondary, fontSize: 12 }}>Analyse en cours…</div>}
            {aiAnalysis && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8 }}>
                {aiAnalysis.split("\n").map(l => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", background: C.inputBg || C.card, borderRadius: 7, border: `1px solid ${C.border}` }}>
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

function ReflectionRow({ label, text }) {
  return (
    <div style={{ padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.55 }}>{text}</div>
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
            <div style={{ fontSize: 11, marginBottom: 6 }}>{smartFocused ? "✅ Case active — Colle maintenant" : "Clique · Glisse · ou colle avec"}</div>
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
              {focused ? "✅ Case active — Colle maintenant" : "Clique · Glisse · Colle"}
            </div>
            <div style={{ fontSize: 10.5, color: C.textMuted }}>
              <kbd style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 5px", fontSize: 10 }}>⌘V</kbd>{" "}/{" "}
              <kbd style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 5px", fontSize: 10 }}>Ctrl+V</kbd>
            </div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
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

function ToggleBtn({ active, onClick, color, children }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "8px 10px", borderRadius: 7, border: `1px solid ${active ? color : C.border}`,
      background: active ? color + "1F" : C.bg, color: active ? color : C.textSecondary,
      fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
    }}>
      {children}
    </button>
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

function RatingSlider({ label, value, onChange, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, color: C.textSecondary, fontWeight: 500 }}>{label}</span>
        <span className="tnum" style={{ fontSize: 13, fontWeight: 800, color: color || C.purpleBright }}>{value}/10</span>
      </div>
      <input
        type="range" min={1} max={10} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color || C.purple }}
      />
    </div>
  );
}

function TradeForm({ initial, setupOptions, appSettings, onCancel, onSave }) {
  const isEdit = !!initial;
  const [pair, setPair] = useState(initial?.pair || "EURUSD");
  const [direction, setDirection] = useState(initial?.direction || "long");
  const [entryTime, setEntryTime] = useState(initial?.entryTime ? initial.entryTime.slice(0, 16) : new Date().toISOString().slice(0, 16));
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
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [calcPct, setCalcPct] = useState("1");

  const accountBalance = appSettings?.accountBalance || 10000;
  const sessionTags = TAG_CATALOG.filter((t) => t.category === "session");
  const customSetupTags = appSettings?.customTags || [];
  const hiddenTags = appSettings?.hiddenTags || [];
  const allSetupTags = [
    ...TAG_CATALOG.filter((t) => t.category === "setup" && !hiddenTags.includes(t.name)),
    ...customSetupTags.map((n) => ({ name: n, category: "setup" })),
  ];

  // Calcul pip live
  const pipDecimal = pair.includes("JPY") ? 0.01 : pair === "XAUUSD" ? 0.01 : ["US30","NAS100","SPX500","BTCUSD","ETHUSD"].includes(pair) ? 1 : 0.0001;
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
  const [resultManualOverride, setResultManualOverride] = useState(false);
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
  const autoR = numRisk && numRisk !== 0 && numResult !== null ? numResult / numRisk : null;
  const effectiveR = resultRManual ? (resultRValue === "" ? null : Number(resultRValue)) : autoR;

  const toggleTag = (name) => setTags((prev) => prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]);
  const canSave = pair && entryPrice !== "" && positionSize !== "";

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
    let finalResultR = effectiveR;
    let finalResultUsd = numResult;
    if (status === "win") {
      finalStatus = "closed";
      if (finalResultR !== null && finalResultR < 0) finalResultR = Math.abs(finalResultR);
      if (finalResultUsd !== null && finalResultUsd < 0) finalResultUsd = Math.abs(finalResultUsd);
    } else if (status === "loss") {
      finalStatus = "closed";
      if (finalResultR !== null && finalResultR > 0) finalResultR = -Math.abs(finalResultR);
      if (finalResultUsd !== null && finalResultUsd > 0) finalResultUsd = -Math.abs(finalResultUsd);
    }
    onSave({
      id: initial?.id || uid(),
      pair, direction,
      entryTime: new Date(entryTime).toISOString(),
      entryPrice: Number(entryPrice),
      stopLoss: stopLoss === "" ? null : Number(stopLoss),
      takeProfit: takeProfit === "" ? null : Number(takeProfit),
      exitPrice: exitPrice === "" ? null : Number(exitPrice),
      positionSize: Number(positionSize),
      riskUsd: numRisk, resultUsd: finalResultUsd,
      resultPips: resultPips === "" ? null : Number(resultPips),
      resultR: finalResultR, resultRManual,
      status: finalStatus, notes, tags, screenshotBefore, screenshotAfter,
      dxyBias, dxyScreenshotBefore, dxyScreenshotAfter, dxyTags,
      liquiditySweep, mssConfirmed, tfAlignment, tfAlignmentSetup, confidenceLevel, oteFib,
    });
  };

  return (
    <div className="fade-in" style={{ maxWidth: 720 }}>
      <BackLink onClick={onCancel}>Annuler</BackLink>
      <PageHeader title={isEdit ? "Modifier le trade" : "Nouveau trade"} />

      {/* Identification — nouvelle structure demandée */}
      <Card style={{ padding: "20px 18px", marginBottom: 14, borderRadius: 20, border: "1px solid rgba(148,163,184,0.16)" }}>
        <CardLabel>Identification</CardLabel>
        <div className="form-grid-2" style={{ marginTop: 12 }}>

          <Field label="Date et heure">
            <div style={{ width: "100%", overflow: "hidden", minWidth: 0 }}>
              <input type="datetime-local" value={entryTime} onChange={(e) => {
                setEntryTime(e.target.value);
                // Auto-détection killzone depuis l'heure d'entrée
                if (e.target.value) {
                  const detected = getSession(e.target.value);
                  const sessions = ["London Session","New York Session","Asia Session","Hors session"];
                  setTags(prev => [...prev.filter(t => !sessions.includes(t)), ...(detected !== "Hors session" ? [detected] : [])]);
                }
              }} style={{ ...inputStyle }} />
            </div>
          </Field>

          <Field label="Paire">
            <select value={pair} onChange={(e) => setPair(e.target.value)} style={inputStyle}>
              {(appSettings?.pairs || PAIRS).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          <Field label="Compte">
            <div style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, cursor: "default" }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: appSettings?.activeAccountColor || C.teal, flexShrink: 0, boxShadow: `0 0 6px ${appSettings?.activeAccountColor || C.teal}60` }} />
              <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{appSettings?.activeAccountName || "Compte principal"}</span>
              <span style={{ fontSize: 10, color: C.textMuted, marginLeft: "auto", background: C.bg, padding: "2px 6px", borderRadius: 4 }}>auto</span>
            </div>
          </Field>

          <Field label="Direction" value={direction}>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setDirection("long")} style={{
                flex: 1, padding: "13px 12px", borderRadius: 14,
                border: `1.5px solid ${direction === "long" ? C.teal : C.border}`,
                background: direction === "long" ? "rgba(45,212,191,0.08)" : C.inputBg,
                color: direction === "long" ? C.teal : C.textMuted,
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.15s",
                boxShadow: direction === "long" ? "0 0 0 3px rgba(45,212,191,0.10)" : "none",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <polyline points="3,17 9,11 13,15 21,7" stroke={direction === "long" ? C.teal : C.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="16,7 21,7 21,12" stroke={direction === "long" ? C.teal : C.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Long
              </button>
              <button onClick={() => setDirection("short")} style={{
                flex: 1, padding: "13px 12px", borderRadius: 14,
                border: `1.5px solid ${direction === "short" ? "#F97316" : C.border}`,
                background: direction === "short" ? "rgba(249,115,22,0.08)" : C.inputBg,
                color: direction === "short" ? "#F97316" : C.textMuted,
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.15s",
                boxShadow: direction === "short" ? "0 0 0 3px rgba(249,115,22,0.10)" : "none",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <polyline points="3,7 9,13 13,9 21,17" stroke={direction === "short" ? "#F97316" : C.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="16,17 21,17 21,12" stroke={direction === "short" ? "#F97316" : C.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Short
              </button>
            </div>
          </Field>

          <Field label="Session">
            {(() => {
              const sessions = ["London Session","New York Session","Asia Session","Hors session"];
              const currentSession = tags.find(t => sessions.includes(t));
              const autoSession = entryTime ? getSession(entryTime) : null;
              const sessionColors = { "London Session": "#4A7FBF", "New York Session": "#C0392B", "Asia Session": "#E67E22" };
              const sessionEmojis = { "London Session": "🇬🇧", "New York Session": "🗽", "Asia Session": "🌏" };
              return (
                <div>
                  <div style={{ ...inputStyle, display: "flex", alignItems: "center", gap: 8, cursor: "default", minHeight: 44 }}>
                    {currentSession && currentSession !== "Hors session" ? (
                      <>
                        <span style={{ fontSize: 14 }}>{sessionEmojis[currentSession] || "🕐"}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: sessionColors[currentSession] || C.text }}>{currentSession}</span>
                        <span style={{ fontSize: 9.5, color: C.teal, background: C.tealDim, padding: "1px 5px", borderRadius: 4, marginLeft: "auto" }}>auto</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 13, color: C.textMuted }}>— Hors killzone / à saisir —</span>
                    )}
                  </div>
                  {/* Override manuel si besoin */}
                  <select value={currentSession || ""} onChange={(e) => {
                    setTags(prev => [...prev.filter(t => !sessions.includes(t)), ...(e.target.value ? [e.target.value] : [])]);
                  }} style={{ ...inputStyle, marginTop: 6, fontSize: 11, color: C.textMuted }}>
                    <option value="">Modifier manuellement…</option>
                    <option value="Asia Session">🌏 Asia Session</option>
                    <option value="London Session">🇬🇧 London Session</option>
                    <option value="New York Session">🗽 New York Session</option>
                    <option value="Hors session">Hors session</option>
                  </select>
                </div>
              );
            })()}
          </Field>

          <Field label="Type de trade">
            <SelectWithCheck value={tags.find(t => ["Swing","Day Trading","Scalping"].includes(t)) || ""} onChange={(e) => {
              const types = ["Swing","Day Trading","Scalping"];
              setTags(prev => [...prev.filter(t => !types.includes(t)), ...(e.target.value ? [e.target.value] : [])]);
            }} style={inputStyle}>
              <option value="">— Sélectionner —</option>
              <option value="Swing">Swing</option>
              <option value="Day Trading">Day Trading</option>
              <option value="Scalping">Scalping</option>
            </SelectWithCheck>
          </Field>

          <Field label="Timeframe">
            <SelectWithCheck value={tags.find(t => ["M1","M5","M15","M30","H1","H4","D1","W1"].includes(t)) || ""} onChange={(e) => {
              const tfs = ["M1","M5","M15","M30","H1","H4","D1","W1"];
              setTags(prev => [...prev.filter(t => !tfs.includes(t)), ...(e.target.value ? [e.target.value] : [])]);
            }} style={inputStyle}>
              <option value="">— Sélectionner —</option>
              {["M1","M5","M15","M30","H1","H4","D1","W1"].map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </SelectWithCheck>
          </Field>
        </div>

        {/* PD Arrays — menu déroulant multi-sélection */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>
            PD Arrays <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", color: C.textMuted }}>(multi-sélection)</span>
          </div>
          {/* Puces sélectionnées */}
          {tags.filter(t => allSetupTags.some(s => s.name === t)).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {tags.filter(t => allSetupTags.some(s => s.name === t)).map((tagName) => {
                const tagDef = TAG_CATALOG.find(t => t.name === tagName);
                const color = tagDef?.color || C.purpleBright;
                const bg = tagDef?.color ? `${tagDef.color}18` : C.purpleDim;
                return (
                  <div key={tagName} style={{ display: "flex", alignItems: "center", gap: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${color}50`, fontSize: 12, fontWeight: 600, color }}>
                    <span style={{ padding: "5px 10px", background: bg }}>{tagName}</span>
                    <button onClick={() => toggleTag(tagName)} style={{ padding: "5px 8px", background: `${color}18`, border: "none", borderLeft: `1px solid ${color}30`, cursor: "pointer", color, fontSize: 15, lineHeight: 1, display: "flex", alignItems: "center" }}>×</button>
                  </div>
                );
              })}
            </div>
          )}
          {/* Liste cliquable */}
          <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
            {allSetupTags.map((t, i) => {
              const selected = tags.includes(t.name);
              const color = t.color || C.purpleBright;
              return (
                <button key={t.name} onClick={() => toggleTag(t.name)} style={{
                  width: "100%", textAlign: "left", padding: "11px 14px",
                  background: selected ? (t.color ? `${t.color}12` : C.purpleDim) : (C.inputBg || C.card),
                  border: "none", borderBottom: i < allSetupTags.length - 1 ? `1px solid ${C.border}` : "none",
                  color: selected ? color : C.text, fontSize: 13, fontWeight: selected ? 600 : 400,
                  cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                  transition: "background 0.1s",
                }}>
                  <span>{t.name}</span>
                  {selected && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8"/>
                      <path d="M7 12.5l3.5 3.5 6.5-7" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeframe alignement + Setup associé */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>Timeframe alignement (optionnel)</div>
          <div className="form-grid-2">
            <SelectWithCheck value={tfAlignment} onChange={(e) => setTfAlignment(e.target.value)} style={{ ...inputStyle, color: tfAlignment ? C.text : C.textMuted }}>
              <option value="">— TF dans le même sens —</option>
              {["M1","M5","M15","M30","H1","H4","D1","W1"].map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </SelectWithCheck>
            {tfAlignment && (
              <SelectWithCheck value={tfAlignmentSetup} onChange={(e) => setTfAlignmentSetup(e.target.value)} style={{ ...inputStyle, color: tfAlignmentSetup ? C.text : C.textMuted }}>
                <option value="">— Setup {tfAlignment} —</option>
                {allSetupTags.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </SelectWithCheck>
            )}
          </div>
          {tfAlignment && tfAlignmentSetup && (
            <div style={{ marginTop: 8, padding: "7px 12px", background: C.purpleDim, borderRadius: 8, fontSize: 12, color: C.purpleBright, display: "flex", alignItems: "center", gap: 6 }}>
              ✅ <strong>{tfAlignmentSetup}</strong> confirmé en <strong>{tfAlignment}</strong>
            </div>
          )}

          {/* Zone OTE — retracement Fibonacci */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>Zone OTE (Fibonacci)</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["0.5", "0.618", "0.7", "0.79"].map(fib => (
                <button key={fib} onClick={() => setOteFib(fib === oteFib ? "" : fib)} style={{
                  flex: "1 1 60px", padding: "9px 6px", borderRadius: 8, cursor: "pointer",
                  border: `1.5px solid ${oteFib === fib ? C.teal : C.border}`,
                  background: oteFib === fib ? C.tealDim : (C.inputBg || C.card),
                  color: oteFib === fib ? C.teal : C.textMuted,
                  fontSize: 13, fontWeight: oteFib === fib ? 700 : 400,
                  transition: "all 0.12s",
                }}>
                  {fib}
                </button>
              ))}
            </div>
            {oteFib && (
              <div style={{ marginTop: 8, padding: "6px 12px", background: C.tealDim, borderRadius: 7, fontSize: 12, color: C.teal, display: "flex", alignItems: "center", gap: 5 }}>
                ✅ OTE sur le niveau <strong>{oteFib}</strong> ({oteFib === "0.5" ? "50%" : oteFib === "0.618" ? "61.8% — Golden Ratio" : oteFib === "0.7" ? "70%" : "79% — Premium"})
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Prix et taille — avec TP/SL colorés, exit = TP par défaut, risque % live */}
      <Card style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <CardLabel>Prix et taille</CardLabel>
          <button onClick={() => setShowCalcModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: C.purpleDim, border: `1px solid rgba(139,124,246,0.3)`, borderRadius: 7, padding: "6px 11px", cursor: "pointer", color: C.purpleBright, fontSize: 12, fontWeight: 600 }}>
            <Calculator size={14} /> Calculatrice
          </button>
        </div>

        {/* Modal calculatrice */}
        {showCalcModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ background: C.card, borderRadius: "16px 16px 0 0", padding: "24px 20px 32px", width: "100%", maxWidth: 480, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Calculatrice de position</div>
                <button onClick={() => setShowCalcModal(false)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}><X size={18} /></button>
              </div>

              {(() => {
                const accountBalance = appSettings?.accountBalance || 10000;
                const pairKey = (pair.includes("JPY") ? "JPY" : pair === "XAUUSD" ? "XAU" : "USD");
                const pipDecimal = pair.includes("JPY") ? 0.01 : pair === "XAUUSD" ? 0.01 : ["US30","NAS100","SPX500","BTCUSD","ETHUSD"].includes(pair) ? 1 : 0.0001;
                const pipValuePerLot = (() => {
                const ep = parseFloat(entryPrice) || 1;
                if (pair === "XAUUSD") return 10;
                if (pair === "XAGUSD") return 50;
                if (["US30","NAS100","SPX500"].includes(pair)) return 1;
                if (pair.endsWith("USD") && !pair.startsWith("USD")) return 10;
                if (pair === "USDJPY") return 1000 / ep;
                if (pair.startsWith("USD")) return 10 / ep;
                if (pair.endsWith("JPY")) return 1000 / ep;
                if (pair.endsWith("CAD")) return 10 / ep;
                if (pair.endsWith("CHF")) return 10 / ep;
                return 10;
              })();
                const riskUsdCalc = (accountBalance * Number(calcPct || 0)) / 100;
                const numEntry = entryPrice !== "" ? Number(entryPrice) : null;
                const numSL = stopLoss !== "" ? Number(stopLoss) : null;
                const numTP = takeProfit !== "" ? Number(takeProfit) : null;
                const slPips = numEntry && numSL ? Math.abs((numEntry - numSL) / pipDecimal) : null;
                const tpPips = numEntry && numTP ? Math.abs((numTP - numEntry) / pipDecimal) : null;
                const suggestedLot = slPips && slPips > 0 ? Math.round((riskUsdCalc / (slPips * pipValuePerLot)) * 100) / 100 : null;
                const rratio = slPips && tpPips ? (tpPips / slPips).toFixed(2) : null;
                const potentialGain = suggestedLot && tpPips ? (tpPips * pipValuePerLot * suggestedLot).toFixed(0) : null;

                const apply = () => {
                  if (suggestedLot !== null) setPositionSize(String(suggestedLot));
                  if (riskUsdCalc) setRiskUsd(String(riskUsdCalc.toFixed(2)));
                  setShowCalcModal(false);
                };

                return (
                  <div>
                    <div style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: C.textMuted }}>
                      Compte : <strong style={{ color: C.text }}>${accountBalance.toLocaleString()}</strong> · Paire : <strong style={{ color: C.text }}>{pair}</strong>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>Risque (%)</div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        {["0.5", "1", "1.5", "2"].map(pct => (
                          <button key={pct} onClick={() => setCalcPct(pct)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `2px solid ${calcPct === pct ? C.purple : C.border}`, background: calcPct === pct ? C.purpleDim : "transparent", color: calcPct === pct ? C.purpleBright : C.textSecondary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{pct}%</button>
                        ))}
                      </div>
                      <input type="number" step="0.1" value={calcPct} onChange={e => setCalcPct(e.target.value)} placeholder="% personnalisé" style={{ ...inputStyle }} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
                      {[
                        { label: "Risque $", value: `$${riskUsdCalc.toFixed(0)}`, color: C.red },
                        { label: "Taille lot", value: suggestedLot !== null ? `${suggestedLot}L` : "—", color: C.purpleBright, highlight: true },
                        { label: "R:R", value: rratio ? `1:${rratio}` : "—", color: rratio >= 1.5 ? C.teal : C.red },
                        { label: "SL pips", value: slPips ? slPips.toFixed(1) : "—", color: C.textSecondary },
                        { label: "TP pips", value: tpPips ? tpPips.toFixed(1) : "—", color: C.textSecondary },
                        { label: "Gain pot.", value: potentialGain ? `$${potentialGain}` : "—", color: C.teal },
                      ].map(x => (
                        <div key={x.label} style={{ padding: "10px 12px", background: x.highlight ? C.purpleDim : C.bg, borderRadius: 8, border: `1px solid ${x.highlight ? "rgba(139,124,246,0.3)" : C.border}`, textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>{x.label}</div>
                          <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: x.color }}>{x.value}</div>
                        </div>
                      ))}
                    </div>

                    {!numEntry && <div style={{ fontSize: 12, color: C.amber, marginBottom: 12, textAlign: "center" }}>⚠ Remplis Entry, SL et TP pour calculer la taille de lot</div>}

                    <button onClick={apply} style={{ width: "100%", background: C.purple, border: "none", borderRadius: 10, color: "#fff", padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                      Appliquer — {suggestedLot !== null ? `${suggestedLot} lot · $${riskUsdCalc.toFixed(0)} risque` : `$${riskUsdCalc.toFixed(0)} risque`}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <div className="form-grid-2" style={{ marginTop: 0 }}>
          <Field label="Entrée" hint="Prix d'entrée">
            <InputWithCheck type="number" step="any" placeholder="1.08450" value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              style={{ ...inputStyle, color: C.text, fontWeight: 600 }} />
          </Field>
          <Field label="Stop Loss">
            <InputWithCheck type="number" step="any" placeholder="1.08200" value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              style={{ ...inputStyle, color: C.red, fontWeight: 700 }} />
          </Field>
          <Field label="Take Profit">
            <InputWithCheck type="number" step="any" placeholder="1.09100" value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              style={{ ...inputStyle, color: "#5B8DEF", fontWeight: 700 }} />
          </Field>
          <Field label="Prix de sortie" hint="= TP par défaut">
            <InputWithCheck type="number" step="any" placeholder="auto = TP" value={exitPrice}
              onChange={(e) => { setExitPrice(e.target.value); }}
              style={{ ...inputStyle }} />
          </Field>
          <Field label="Taille de position (lots)">
            <InputWithCheck type="number" step="0.01" placeholder="0.50" value={positionSize}
              onChange={(e) => setPositionSize(e.target.value)}
              style={inputStyle} />
          </Field>
          <Field label="Risque ($)">
            <input type="number" step="any" placeholder="100" value={riskUsd}
              onChange={(e) => setRiskUsd(e.target.value)}
              style={inputStyle} />
          </Field>
        </div>

        {/* Calculatrice risque live % → $ */}
        <div style={{ marginTop: 14, padding: "12px 14px", background: C.inputBg || C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Calculatrice de risque — compte ${accountBalance.toLocaleString()}</div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 120px" }}>
              <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 4 }}>% de risque</div>
              <input type="number" step="0.1" placeholder="1.0" value={riskPct}
                onChange={(e) => setRiskPct(e.target.value)}
                style={{ ...inputStyle }} />
            </div>
            {liveCalc?.riskUsdFromPct !== null && (
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", paddingBottom: 2 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.textMuted }}>Risque en $</div>
                  <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: C.red }}>${liveCalc.riskUsdFromPct}</div>
                </div>
                {liveCalc.suggestedLot !== null && (
                  <div>
                    <div style={{ fontSize: 10, color: C.textMuted }}>Lot suggéré</div>
                    <div className="tnum" style={{ fontSize: 15, fontWeight: 800, color: C.purpleBright }}>{liveCalc.suggestedLot}</div>
                  </div>
                )}
              </div>
            )}
            {liveCalc?.riskUsdFromPct !== null && (
              <button
                onClick={() => { setRiskUsd(String(liveCalc.riskUsdFromPct)); if (liveCalc.suggestedLot !== null) setPositionSize(String(liveCalc.suggestedLot)); }}
                style={{ ...btn.ghost, fontSize: 11.5, padding: "7px 11px" }}>
                Appliquer
              </button>
            )}
          </div>
        </div>

        {/* Résumé calcul auto */}
        {liveCalc && (liveCalc.riskPips !== null || liveCalc.rewardPips !== null) && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: C.inputBg || C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {liveCalc.riskPips !== null && <LiveCalcStat label="SL pips" value={liveCalc.riskPips.toFixed(1)} color={C.red} />}
              {liveCalc.rewardPips !== null && <LiveCalcStat label="TP pips" value={liveCalc.rewardPips.toFixed(1)} color="#5B8DEF" />}
              {liveCalc.theoreticalRR && <LiveCalcStat label="R:R" value={`1:${liveCalc.theoreticalRR.toFixed(2)}`} color={C.purpleBright} />}
              {liveCalc.potentialLossUsd !== null && <LiveCalcStat label="Perte max" value={`$${liveCalc.potentialLossUsd.toFixed(0)}`} color={C.red} />}
              {liveCalc.potentialGainUsd !== null && <LiveCalcStat label="Gain max" value={`$${liveCalc.potentialGainUsd.toFixed(0)}`} color={C.teal} />}
            </div>
          </div>
        )}
      </Card>

      {/* Résultat — auto calculé depuis exit price */}
      <Card style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <CardLabel>Résultat</CardLabel>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.textSecondary, cursor: "pointer" }}>
            <input type="checkbox" checked={resultManualOverride} onChange={(e) => setResultManualOverride(e.target.checked)} />
            Saisir manuellement
          </label>
        </div>

        {!resultManualOverride && liveCalc?.autoResultUsd !== null ? (
          <div style={{ padding: "12px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, display: "flex", gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Résultat $</div>
              <div className="tnum" style={{ fontSize: 18, fontWeight: 800, color: (liveCalc.autoResultUsd || 0) >= 0 ? C.teal : C.red, marginTop: 3 }}>
                {liveCalc.autoResultUsd >= 0 ? "+" : ""}{liveCalc.autoResultUsd?.toFixed(2)}$
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Pips</div>
              <div className="tnum" style={{ fontSize: 18, fontWeight: 800, color: (liveCalc.autoResultPips || 0) >= 0 ? C.teal : C.red, marginTop: 3 }}>
                {liveCalc.autoResultPips >= 0 ? "+" : ""}{liveCalc.autoResultPips?.toFixed(1)}
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, alignSelf: "flex-end", paddingBottom: 2 }}>calculé depuis sortie vs entrée</div>
          </div>
        ) : (
          <div className="form-grid-2">
            <Field label="Résultat en $"><input type="number" step="any" value={resultUsd} onChange={(e) => setResultUsd(e.target.value)} style={inputStyle} placeholder="245.50" /></Field>
            <Field label="Résultat en pips"><input type="number" step="any" value={resultPips} onChange={(e) => setResultPips(e.target.value)} style={inputStyle} placeholder="32.5" /></Field>
          </div>
        )}

        <div style={{ marginTop: 12, padding: "10px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Résultat en R</div>
            {!resultRManual && <div className="tnum" style={{ fontSize: 16, fontWeight: 800, color: autoR != null ? (autoR >= 0 ? C.teal : C.red) : C.text }}>{autoR !== null ? fmtR(autoR) : "—"} <span style={{ fontSize: 10, color: C.textMuted }}>auto</span></div>}
            {resultRManual && <input type="number" step="0.01" placeholder="Ex: 2.5" value={resultRValue} onChange={(e) => setResultRValue(e.target.value)} style={{ ...inputStyle, maxWidth: 130, marginTop: 4 }} />}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.textSecondary, cursor: "pointer" }}>
            <input type="checkbox" checked={resultRManual} onChange={(e) => setResultRManual(e.target.checked)} />
            Modifier R
          </label>
        </div>
      </Card>

      {/* Screenshots */}
      <Card style={{ padding: 16, marginBottom: 14 }}>
        <CardLabel>Screenshots</CardLabel>
        <div className="form-grid-2" style={{ marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>Avant le trade</div>
            {screenshotBefore ? (
              <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1.5px solid ${C.border}` }}>
                <img src={screenshotBefore} alt="Avant" style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "contain", background: C.bg }} />
                <button onClick={() => { setScreenshotBefore(null); setExtractedMeta(null); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(15,17,23,0.9)", border: `1px solid ${C.border}`, borderRadius: 5, color: "#fff", padding: 5, cursor: "pointer", display: "flex" }}><X size={12} /></button>
              </div>
            ) : (
              <ImageUploadBox label="" value={null} onChange={setScreenshotBefore} />
            )}
          </div>
          <ImageUploadBox label="Après le trade" value={screenshotAfter} onChange={setScreenshotAfter} />
        </div>
      </Card>

      {/* DXY — corrélation */}
      <Card style={{ padding: 16, marginBottom: 14 }}>
        <CardLabel>DXY — Corrélation</CardLabel>
        <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2, marginBottom: 14 }}>Analyse la direction du Dollar Index pour confirmer ton biais</div>

        {/* Biais DXY */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Biais DXY</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Bullish", "Bearish", "Neutre"].map((b) => {
              const active = dxyBias === b;
              const color = b === "Bullish" ? C.teal : b === "Bearish" ? C.red : C.textSecondary;
              return (
                <button key={b} onClick={() => setDxyBias(active ? "" : b)} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: `2px solid ${active ? color : C.border}`,
                  background: active ? `${color}18` : "transparent",
                  color: active ? color : C.textSecondary,
                }}>{b}</button>
              );
            })}
          </div>
        </div>

        {/* PD Arrays DXY — menu déroulant */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>PD Arrays DXY</div>
          <select value="" onChange={(e) => { if (e.target.value && !dxyTags.includes(e.target.value)) setDxyTags(prev => [...prev, e.target.value]); }} style={{ ...inputStyle, marginBottom: dxyTags.length > 0 ? 10 : 0 }}>
            <option value="">+ Ajouter un PD Array DXY…</option>
            {TAG_CATALOG.filter(t => t.category === "setup").map(t => (
              <option key={t.name} value={t.name} disabled={dxyTags.includes(t.name)}>{dxyTags.includes(t.name) ? "✓ " : ""}{t.name}</option>
            ))}
          </select>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {dxyTags.map(tagName => {
              const tagDef = TAG_CATALOG.find(t => t.name === tagName);
              const color = tagDef?.color || "#D89A2E";
              return (
                <div key={tagName} style={{ display: "flex", alignItems: "center", gap: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${color}50`, fontSize: 12, fontWeight: 600, color }}>
                  <span style={{ padding: "6px 10px", background: `${color}18` }}>{tagName}</span>
                  <span style={{ padding: "6px 8px", background: `${color}28`, borderLeft: `1px solid ${color}40`, display: "flex", alignItems: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke={C.purple} strokeWidth="1.8"/>
                      <path d="M7 12.5l3.5 3.5 6.5-7" stroke={C.purple} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <button onClick={() => setDxyTags(prev => prev.filter(x => x !== tagName))} style={{ padding: "6px 8px", background: "transparent", border: "none", borderLeft: `1px solid ${color}30`, cursor: "pointer", color: C.textMuted, fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center" }}>×</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Screenshots DXY */}
        <div className="form-grid-2">
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>DXY avant</div>
            <ImageUploadBox label="Screenshot DXY avant" value={dxyScreenshotBefore} onChange={setDxyScreenshotBefore} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>DXY après</div>
            <ImageUploadBox label="Screenshot DXY après" value={dxyScreenshotAfter} onChange={setDxyScreenshotAfter} />
          </div>
        </div>
      </Card>

      {/* Checklist rapide */}
      <Card style={{ padding: 16, marginBottom: 14 }}>
        <CardLabel>Checklist</CardLabel>
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { key: "sweep", label: "Sweep de liquidité", val: liquiditySweep, set: setLiquiditySweep },
            { key: "mss", label: "MSS confirmé", val: mssConfirmed, set: setMssConfirmed },
          ].map((item) => (
            <button key={item.key} onClick={() => item.set(!item.val)} style={{
              flex: 1, minWidth: 140, display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 10, cursor: "pointer",
              border: `2px solid ${item.val ? C.teal : C.border}`,
              background: item.val ? C.tealDim : "transparent",
            }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.val ? C.teal : C.border}`, background: item.val ? C.teal : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.12s" }}>
                {item.val && <CheckCircle2 size={14} color={C.sidebar} strokeWidth={2.5} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: item.val ? C.teal : C.textSecondary }}>{item.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Notes uniquement */}
      <Card style={{ padding: 16, marginBottom: 18 }}>
        <CardLabel>Notes personnelles</CardLabel>
        <textarea rows={4} placeholder="Contexte du marché, ce que tu as bien fait, ce à améliorer…" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, resize: "vertical", marginTop: 10 }} />
      </Card>

      {/* Niveau de confiance avant trade */}
      <Card style={{ padding: 16, marginBottom: 14 }}>
        <CardLabel>Niveau de confiance</CardLabel>
        <div style={{ marginTop: 14 }}>
          {/* Score centré + label */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0,
              background: confidenceLevel === 0 ? C.bg :
                confidenceLevel <= 3 ? C.redDim : confidenceLevel <= 5 ? C.amberDim : confidenceLevel <= 7 ? C.tealDim : C.purpleDim,
              border: `2px solid ${confidenceLevel === 0 ? C.border :
                confidenceLevel <= 3 ? C.red : confidenceLevel <= 5 ? C.amber : confidenceLevel <= 7 ? C.teal : C.purpleBright}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span className="tnum" style={{
                fontSize: confidenceLevel === 0 ? 22 : 20, fontWeight: 800,
                color: confidenceLevel === 0 ? C.textMuted :
                  confidenceLevel <= 3 ? C.red : confidenceLevel <= 5 ? C.amber : confidenceLevel <= 7 ? C.teal : C.purpleBright,
              }}>{confidenceLevel === 0 ? "—" : confidenceLevel}</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 }}>
                {confidenceLevel === 0 ? "Non évalué" :
                 confidenceLevel <= 3 ? "Setup douteux" :
                 confidenceLevel <= 5 ? "Quelques doutes" :
                 confidenceLevel <= 7 ? "Setup valide" : "A+ Setup"}
              </div>
              <div style={{ fontSize: 12, color: C.textMuted }}>
                {confidenceLevel === 0 ? "Tape un chiffre de 1 à 10" :
                 confidenceLevel <= 3 ? "⚠️ À éviter normalement" :
                 confidenceLevel <= 5 ? "🟡 À prendre avec précaution" :
                 confidenceLevel <= 7 ? "🟢 Confiance suffisante" : "🔥 Exécution immédiate"}
              </div>
            </div>
          </div>

          {/* Segments cliquables */}
          <div style={{ display: "flex", gap: 4 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => {
              const filled = n <= confidenceLevel;
              const col = n <= 3 ? C.red : n <= 5 ? C.amber : n <= 7 ? C.teal : C.purpleBright;
              return (
                <button key={n} onClick={() => setConfidenceLevel(n === confidenceLevel ? 0 : n)} style={{
                  flex: 1, height: 32, borderRadius: 6,
                  border: `1.5px solid ${filled ? col : C.border}`,
                  cursor: "pointer",
                  background: filled ? col : C.inputBg || C.card,
                  transition: "all 0.12s",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: filled ? "rgba(255,255,255,0.9)" : C.textMuted, lineHeight: 1 }}>{n}</span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span style={{ fontSize: 10, color: C.textMuted }}>Très faible</span>
            <span style={{ fontSize: 10, color: C.textMuted }}>Parfait</span>
          </div>
        </div>
      </Card>

      {/* Résultat du trade — une seule ligne */}
      <Card style={{ padding: 16, marginBottom: 14 }}>
        <CardLabel>Résultat du trade</CardLabel>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {[
            { v: "open",      label: "Ouvert",  svgIcon: "lock",  color: C.purple,        bg: C.purpleDim },
            { v: "win",       label: "Gagné",   svgIcon: "check", color: C.teal,          bg: C.tealDim },
            { v: "loss",      label: "Perdu",   svgIcon: "x",     color: C.red,           bg: C.redDim },
            { v: "breakeven", label: "BE",      svgIcon: "minus", color: C.textSecondary, bg: "rgba(107,115,136,0.12)" },
          ].map(opt => {
            const active = status === opt.v;
            const ic = active ? opt.color : C.textMuted;
            const SvgIcon = () => {
              if (opt.svgIcon === "lock") return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ic} strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>;
              if (opt.svgIcon === "check") return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ic} strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.5 3.5 6.5-7"/></svg>;
              if (opt.svgIcon === "x") return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ic} strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 8l8 8M16 8l-8 8"/></svg>;
              return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ic} strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>;
            };
            return (
              <button key={opt.v} onClick={() => setStatus(opt.v)} style={{
                flex: 1, padding: "10px 4px", borderRadius: 10,
                border: `2px solid ${active ? opt.color : C.border}`,
                background: active ? opt.bg : (C.inputBg || C.card),
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                transition: "all 0.15s",
              }}>
                <SvgIcon />
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 400, color: active ? opt.color : C.textMuted }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleSubmit} disabled={!canSave} style={{ ...btn.primary, padding: "11px 20px", fontSize: 13, opacity: canSave ? 1 : 0.5, cursor: canSave ? "pointer" : "not-allowed" }}>
          <Save size={14} /> {isEdit ? "Enregistrer les modifications" : "Enregistrer le trade"}
        </button>
        <button onClick={onCancel} style={{ ...btn.ghost, padding: "11px 18px" }}>Annuler</button>
      </div>
      {!canSave && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>Renseigne au minimum la paire, le prix d'entrée et la taille de position.</div>}
    </div>
  );
}

function TagGroup({ label, tags, active, onToggle }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tags.map((t) => {
          const isActive = active.includes(t.name);
          const isMistake = t.category === "mistake";
          const color = isMistake ? C.red : C.purpleBright;
          return (
            <button key={t.name} onClick={() => onToggle(t.name)} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
              border: `1px solid ${isActive ? color : C.border}`,
              background: isActive ? color + "1F" : C.bg,
              color: isActive ? color : C.textSecondary,
            }}>
              {t.name}
            </button>
          );
        })}
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
  const minW = Math.max(columns.length * 90, 480);
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", minWidth: minW, borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: c.align || "left", padding: "8px 10px", fontSize: 10.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: "9px 10px", textAlign: c.align || "left", color: c.color ? c.color(row) : C.text, whiteSpace: "nowrap" }}>
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
      const key = d.toISOString().slice(0, 10);
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
      date.setUTCDate(gridStart.getUTCDate() + w * 7 + d);
      const key = date.toISOString().slice(0, 10);
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

function AdvancedStats({ trades }) {
  const closed = useMemo(() => trades.filter((t) => t.status !== "open"), [trades]);

  const byPair = useMemo(() => groupBy(closed, (t) => t.pair), [closed]);
  const bySetup = useMemo(() => groupBy(closed, (t) => t.setup), [closed]);
  const bySession = useMemo(() => groupBy(closed, (t) => getSession(t.entryTime)), [closed]);

  const byHour = useMemo(() => {
    const groups = groupBy(closed, (t) => `${String(new Date(t.entryTime).getUTCHours()).padStart(2, "0")}h`);
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
  const pdArrayStats = useMemo(() => {
    const setupTagNames = TAG_CATALOG.filter(t => t.category === "setup").map(t => t.name);
    const map = {};
    closed.forEach(t => {
      (t.tags || []).filter(tag => setupTagNames.includes(tag)).forEach(tag => {
        if (!map[tag]) map[tag] = { trades: [], pnl: 0, wins: 0, totalR: 0, totalConf: 0, confCount: 0 };
        map[tag].trades.push(t);
        map[tag].pnl += t.resultUsd || 0;
        if (t.resultR > 0) map[tag].wins += 1;
        map[tag].totalR += t.resultR || 0;
        if (t.confidenceLevel) { map[tag].totalConf += t.confidenceLevel; map[tag].confCount += 1; }
      });
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      count: v.trades.length,
      winRate: v.trades.length ? (v.wins / v.trades.length) * 100 : 0,
      pnl: v.pnl,
      avgR: v.trades.length ? v.totalR / v.trades.length : 0,
      avgConf: v.confCount ? v.totalConf / v.confCount : null,
    })).filter(g => g.count >= 1).sort((a, b) => b.avgR - a.avgR);
  }, [closed]);

  // OTE impact : trades avec OTE vs sans OTE
  const oteImpact = useMemo(() => {
    const withOte = closed.filter(t => t.oteFib);
    const withoutOte = closed.filter(t => !t.oteFib);
    const calcGroup = (arr) => ({
      count: arr.length,
      winRate: arr.length ? arr.filter(t => t.resultR > 0).length / arr.length * 100 : 0,
      avgR: arr.length ? arr.reduce((s, t) => s + (t.resultR || 0), 0) / arr.length : 0,
      pnl: arr.reduce((s, t) => s + (t.resultUsd || 0), 0),
    });
    return { withOte: calcGroup(withOte), withoutOte: calcGroup(withoutOte) };
  }, [closed]);

  // Confiance vs résultat
  const confVsResult = useMemo(() => {
    const rated = closed.filter(t => t.confidenceLevel > 0);
    const buckets = [
      { label: "1-3 (Faible)", min: 1, max: 3 },
      { label: "4-5 (Moyen)", min: 4, max: 5 },
      { label: "6-7 (Bon)", min: 6, max: 7 },
      { label: "8-10 (Excellent)", min: 8, max: 10 },
    ].map(b => {
      const group = rated.filter(t => t.confidenceLevel >= b.min && t.confidenceLevel <= b.max);
      return {
        ...b,
        count: group.length,
        winRate: group.length ? group.filter(t => t.resultR > 0).length / group.length * 100 : 0,
        avgR: group.length ? group.reduce((s, t) => s + (t.resultR || 0), 0) / group.length : 0,
      };
    });
    return buckets;
  }, [closed]);

  const setupFull = useMemo(() => {
    return [...bySetup].map((g) => ({
      key: g.key,
      count: g.count,
      winRate: g.winRate,
      pnl: g.pnl,
      avgR: g.trades.reduce((s, t) => s + (t.resultR || 0), 0) / g.trades.length,
    })).sort((a, b) => b.pnl - a.pnl);
  }, [bySetup]);

  const pairFull = useMemo(() => {
    return [...byPair].map((g) => ({
      key: g.key,
      count: g.count,
      winRate: g.winRate,
      pnl: g.pnl,
      avgR: g.trades.reduce((s, t) => s + (t.resultR || 0), 0) / g.trades.length,
    })).sort((a, b) => b.pnl - a.pnl);
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
        <PageHeader title="Statistiques" />
        <EmptyState icon={BarChart3} title="Pas encore assez de données" text="Ajoute des trades pour débloquer l'analyse détaillée." />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader title="Statistiques" />

      {/* Tableau setup complet — winrate, trades, profit, average R réunis (priorité tableau pro) */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>Performance par setup</CardLabel>
        <div style={{ marginTop: 12 }} className="table-scroll">
          <DataTable
            columns={[
              { key: "key", label: "Setup" },
              { key: "count", label: "Trades", align: "right" },
              { key: "winRate", label: "Winrate", align: "right", render: (r) => fmtPct(r.winRate) },
              { key: "avgR", label: "Average R", align: "right", render: (r) => fmtR(r.avgR), color: (r) => r.avgR >= 0 ? C.teal : C.red },
              { key: "pnl", label: "Profit", align: "right", render: (r) => fmtUsdSigned(r.pnl), color: (r) => r.pnl >= 0 ? C.teal : C.red },
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
              { key: "avgR", label: "Avg R", align: "right", render: (r) => fmtR(r.avgR), color: (r) => r.avgR >= 0 ? C.teal : C.red },
              { key: "pnl", label: "Profit", align: "right", render: (r) => fmtUsdSigned(r.pnl), color: (r) => r.pnl >= 0 ? C.teal : C.red },
            ]}
            rows={pairFull}
          />
        </div>
      </Card>

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
          <CardLabel>Profit par heure (UTC)</CardLabel>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={byHour} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}>
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
            <BarChart data={byDay} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="key" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={{ stroke: C.border }} tickLine={false} tickFormatter={(v) => v.slice(0, 3)} />
              <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} width={42} />
              <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.borderLight}`, borderRadius: 8, fontSize: 11 }} formatter={(v) => [fmtUsdSigned(v), "P&L"]} cursor={{ fill: "rgba(30,36,51,0.04)" }} />
              <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>{byDay.map((g, i) => <Cell key={i} fill={g.pnl >= 0 ? C.teal : C.red} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Distribution des gains/pertes en pleine largeur */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>Distribution des gains et pertes</CardLabel>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={distribution} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}>
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

      {/* Analyse des tags */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <CardLabel>Analyse des tags</CardLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12, maxHeight: 280, overflowY: "auto" }}>
          {[...byTagAll].sort((a, b) => b.pnl - a.pnl).map((g) => (
            <div key={g.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <TagBadge name={g.key} size="sm" />
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.textMuted }}>{g.winRate.toFixed(0)}% WR</span>
                <span className="tnum" style={{ fontWeight: 700, fontSize: 12.5, color: g.pnl >= 0 ? C.teal : C.red, minWidth: 70, textAlign: "right" }}>{fmtUsdSigned(g.pnl)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

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

const EMPTY_JOURNAL_ENTRY = { mood: 5, discipline: 5, note: "", lessons: "", mainMistake: "", tomorrowGoal: "" };

function DailyJournal({ trades, journalNotes, setJournalNotes }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const tradesForDay = useMemo(() => trades.filter((t) => new Date(t.entryTime).toDateString() === selectedDate.toDateString()), [trades, selectedDate]);
  const dayPnl = tradesForDay.reduce((s, t) => s + (t.resultUsd || 0), 0);
  const dayKey = selectedDate.toDateString();
  const rawEntry = journalNotes[dayKey];
  // Rétrocompatibilité : si une ancienne note texte simple existe, on la migre dans le nouveau format
  const entry = typeof rawEntry === "string" ? { ...EMPTY_JOURNAL_ENTRY, note: rawEntry } : (rawEntry || EMPTY_JOURNAL_ENTRY);

  const updateEntry = (patch) => {
    setJournalNotes((prev) => ({ ...prev, [dayKey]: { ...entry, ...patch } }));
  };

  const daysWithTrades = useMemo(() => {
    const set = new Set();
    trades.forEach((t) => set.add(new Date(t.entryTime).toDateString()));
    return [...set].map((s) => new Date(s)).sort((a, b) => b - a);
  }, [trades]);

  return (
    <div className="fade-in">
      <PageHeader title="Journal" />

      <div className="journal-layout" style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Card className="journal-sidebar" style={{ padding: 8, width: 200, maxWidth: "100%", flexShrink: 0, maxHeight: 480, overflowY: "auto" }}>
          <div style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, padding: "4px 8px 8px" }}>Jours avec trades</div>
          {daysWithTrades.map((d) => {
            const active = d.toDateString() === dayKey;
            const dayTrades = trades.filter((t) => new Date(t.entryTime).toDateString() === d.toDateString());
            const pnl = dayTrades.reduce((s, t) => s + (t.resultUsd || 0), 0);
            return (
              <button key={d.toISOString()} onClick={() => setSelectedDate(d)} className="row-hover" style={{
                width: "100%", textAlign: "left", background: active ? C.purpleDim : "transparent",
                border: "none", borderRadius: 6, padding: "8px 8px", cursor: "pointer", display: "flex",
                justifyContent: "space-between", alignItems: "center", marginBottom: 1,
              }}>
                <span style={{ fontSize: 12, color: active ? C.text : C.textSecondary }}>{fmtDate(d.toISOString())}</span>
                <span className="tnum" style={{ fontSize: 11, fontWeight: 700, color: pnl >= 0 ? C.teal : C.red }}>{fmtUsdSigned(pnl)}</span>
              </button>
            );
          })}
        </Card>

        <div className="journal-main" style={{ flex: "1 1 380px", minWidth: 280, maxWidth: "100%" }}>
          {/* En-tête du jour — profit, trades, humeur, discipline en un coup d'œil */}
          <Card style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15, textTransform: "capitalize" }}>{selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>
            </div>
            <div className="grid-rating-5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <LiveCalcStat label="Profit" value={fmtUsdSigned(dayPnl)} color={dayPnl >= 0 ? C.teal : C.red} />
              <LiveCalcStat label="Trades" value={tradesForDay.length} />
              <LiveCalcStat label="Humeur" value={`${entry.mood}/10`} color={C.purpleBright} />
              <LiveCalcStat label="Discipline" value={`${entry.discipline}/10`} color={C.teal} />
            </div>
          </Card>

          {tradesForDay.length > 0 && (
            <Card style={{ padding: 14, marginBottom: 12 }}>
              <CardLabel>Résumé des trades</CardLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {tradesForDay.map((t) => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontWeight: 700, fontSize: 12.5 }}>{t.pair}</span>
                      <DirBadge direction={t.direction} />
                    </div>
                    <ResultBadge resultR={t.resultR} status={t.status} size="sm" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Humeur / discipline du jour — sliders */}
          <Card style={{ padding: 16, marginBottom: 12 }}>
            <CardLabel>Humeur &amp; discipline</CardLabel>
            <div className="form-grid-2" style={{ marginTop: 12 }}>
              <RatingSlider label="Humeur" value={entry.mood} onChange={(v) => updateEntry({ mood: v })} color={C.purpleBright} />
              <RatingSlider label="Discipline" value={entry.discipline} onChange={(v) => updateEntry({ discipline: v })} color={C.teal} />
            </div>
          </Card>

          <Card style={{ padding: 16, marginBottom: 12 }}>
            <CardLabel>Note du jour</CardLabel>
            <textarea
              rows={4}
              placeholder="Ressenti général, biais de marché, contexte de la séance…"
              value={entry.note}
              onChange={(e) => updateEntry({ note: e.target.value })}
              style={{ ...inputStyle, resize: "vertical", marginTop: 10 }}
            />
          </Card>

          <Card style={{ padding: 16, marginBottom: 12 }}>
            <CardLabel>Leçons apprises</CardLabel>
            <textarea
              rows={3}
              placeholder="Ce que cette séance t'a appris…"
              value={entry.lessons}
              onChange={(e) => updateEntry({ lessons: e.target.value })}
              style={{ ...inputStyle, resize: "vertical", marginTop: 10 }}
            />
          </Card>

          <Card style={{ padding: 16, marginBottom: 12 }}>
            <CardLabel>Erreur principale</CardLabel>
            <textarea
              rows={2}
              placeholder="La chose à corriger en priorité…"
              value={entry.mainMistake}
              onChange={(e) => updateEntry({ mainMistake: e.target.value })}
              style={{ ...inputStyle, resize: "vertical", marginTop: 10 }}
            />
          </Card>

          <Card style={{ padding: 16 }}>
            <CardLabel>Objectif demain</CardLabel>
            <textarea
              rows={2}
              placeholder="Sur quoi te concentrer à la prochaine séance…"
              value={entry.tomorrowGoal}
              onChange={(e) => updateEntry({ tomorrowGoal: e.target.value })}
              style={{ ...inputStyle, resize: "vertical", marginTop: 10 }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   PERFORMANCE REVIEW — moyennes des notes, meilleurs/pires setups
   ============================================================================ */

function avg(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null; }

function PerformanceReview({ trades }) {
  const closed = useMemo(() => trades.filter((t) => t.status !== "open" && t.reflection), [trades]);

  const overallAvg = useMemo(() => ({
    tradeRating: avg(closed.map((t) => t.reflection.tradeRating)),
    analysisQuality: avg(closed.map((t) => t.reflection.analysisQuality)),
    confidence: avg(closed.map((t) => t.reflection.confidence)),
    discipline: avg(closed.map((t) => t.reflection.discipline)),
    emotionalLevel: avg(closed.map((t) => t.reflection.emotionalLevel)),
  }), [closed]);

  const overallEvalAvg = useMemo(() => {
    const withEval = closed.filter((t) => t.setupEval);
    return {
      entry: avg(withEval.map((t) => t.setupEval.entry)),
      riskManagement: avg(withEval.map((t) => t.setupEval.riskManagement)),
      timing: avg(withEval.map((t) => t.setupEval.timing)),
      patience: avg(withEval.map((t) => t.setupEval.patience)),
      execution: avg(withEval.map((t) => t.setupEval.execution)),
    };
  }, [closed]);

  const bySetupRated = useMemo(() => {
    const map = {};
    closed.forEach((t) => {
      if (!map[t.setup]) map[t.setup] = { key: t.setup, trades: [], pnl: 0 };
      map[t.setup].trades.push(t);
      map[t.setup].pnl += t.resultUsd || 0;
    });
    return Object.values(map).map((g) => ({
      key: g.key,
      count: g.trades.length,
      pnl: g.pnl,
      avgRating: avg(g.trades.map((t) => t.reflection.tradeRating)),
    })).filter((g) => g.count >= 2);
  }, [closed]);

  const bestSetups = [...bySetupRated].sort((a, b) => b.avgRating - a.avgRating).slice(0, 5);
  const worstSetups = [...bySetupRated].sort((a, b) => a.avgRating - b.avgRating).slice(0, 5);

  if (closed.length === 0) {
    return <EmptyState icon={Brain} title="Pas encore de réflexions enregistrées" text="Remplis le journal de réflexion sur tes trades pour voir tes moyennes ici." />;
  }

  return (
    <div>
      <div className="grid-2" style={{ marginBottom: 14 }}>
        <Card style={{ padding: 18 }}>
          <CardLabel>Moyennes — journal de réflexion</CardLabel>
          <div className="grid-rating-5" style={{ marginTop: 12 }}>
            <RatingDisplay label="Trade" value={overallAvg.tradeRating?.toFixed(1) ?? "—"} />
            <RatingDisplay label="Analyse" value={overallAvg.analysisQuality?.toFixed(1) ?? "—"} />
            <RatingDisplay label="Confiance" value={overallAvg.confidence?.toFixed(1) ?? "—"} />
            <RatingDisplay label="Discipline" value={overallAvg.discipline?.toFixed(1) ?? "—"} color={C.teal} />
            <RatingDisplay label="Émotionnel" value={overallAvg.emotionalLevel?.toFixed(1) ?? "—"} color={C.red} />
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <CardLabel>Moyennes — évaluation du setup</CardLabel>
          <div className="grid-rating-5" style={{ marginTop: 12 }}>
            <RatingDisplay label="Entrée" value={overallEvalAvg.entry?.toFixed(1) ?? "—"} />
            <RatingDisplay label="Risque" value={overallEvalAvg.riskManagement?.toFixed(1) ?? "—"} />
            <RatingDisplay label="Timing" value={overallEvalAvg.timing?.toFixed(1) ?? "—"} />
            <RatingDisplay label="Patience" value={overallEvalAvg.patience?.toFixed(1) ?? "—"} />
            <RatingDisplay label="Exécution" value={overallEvalAvg.execution?.toFixed(1) ?? "—"} />
          </div>
        </Card>
      </div>

      <div className="grid-2" style={{ marginBottom: 14 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
            <Trophy size={13} color={C.teal} />
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Meilleurs setups (note moyenne)</span>
          </div>
          {bestSetups.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted }}>Pas assez de trades notés par setup (min. 2).</div> : (
            <DataTable
              columns={[
                { key: "key", label: "Setup" },
                { key: "avgRating", label: "Note moy.", align: "right", render: (r) => `${r.avgRating.toFixed(1)}/10`, color: () => C.teal },
                { key: "pnl", label: "P&L", align: "right", render: (r) => fmtUsdSigned(r.pnl), color: (r) => r.pnl >= 0 ? C.teal : C.red },
              ]}
              rows={bestSetups}
            />
          )}
        </Card>
        <Card style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
            <Sparkles size={13} color={C.red} />
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Pires setups (note moyenne)</span>
          </div>
          {worstSetups.length === 0 ? <div style={{ fontSize: 12, color: C.textMuted }}>Pas assez de trades notés par setup (min. 2).</div> : (
            <DataTable
              columns={[
                { key: "key", label: "Setup" },
                { key: "avgRating", label: "Note moy.", align: "right", render: (r) => `${r.avgRating.toFixed(1)}/10`, color: () => C.red },
                { key: "pnl", label: "P&L", align: "right", render: (r) => fmtUsdSigned(r.pnl), color: (r) => r.pnl >= 0 ? C.teal : C.red },
              ]}
              rows={worstSetups}
            />
          )}
        </Card>
      </div>

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
                {s.avgConf && <span className="tnum" style={{ fontSize: 10, color: C.textMuted, width: 36, textAlign: "right" }}>⭐{s.avgConf.toFixed(1)}</span>}
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
            ↑ Si tes trades à haute confiance (8-10) ont un meilleur avg R → ta lecture du marché est fiable.
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
    setText(e.target.value);
    try { localStorage.setItem(STORAGE_KEY, e.target.value); } catch {}
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

  const saveBiases = (b) => { setBiases(b); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); } catch {} };
  const saveNews = (n) => { setNews(n); try { localStorage.setItem(NEWS_KEY, JSON.stringify(n)); } catch {} };

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

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingNews = news.filter(n => n.date >= todayStr);
  const pastNews = news.filter(n => n.date < todayStr);

  return (
    <div className="fade-in">
      <PageHeader title="Prévisions" />

      {/* Biais par paire */}
      {pairs.map(pair => {
        const pairColor = pair === "DXY" ? C.amber : pair.includes("EUR") ? "#4A9EFF" : pair.includes("GBP") ? C.teal : pair.includes("USD") && !pair.startsWith("USD") ? C.red : C.purpleBright;
        return (
          <Card key={pair} style={{ padding: 0, marginBottom: 12, overflow: "hidden" }}>
            {/* Header paire */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: pairColor, letterSpacing: -0.3 }}>{pair}</span>
              {(() => {
                const weeklyBias = biases[`${pair}_Weekly`];
                if (!weeklyBias) return null;
                const col = weeklyBias === "bullish" ? C.teal : weeklyBias === "bearish" ? C.red : C.textMuted;
                return <span style={{ fontSize: 10, fontWeight: 700, color: col, background: `${col}18`, padding: "1px 7px", borderRadius: 10, textTransform: "uppercase" }}>{weeklyBias}</span>;
              })()}
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
                      { value: "bullish", label: "↑ Bullish", color: C.teal, bg: C.tealDim },
                      { value: "neutral", label: "⇔ Conso.", color: C.textMuted, bg: "rgba(107,115,136,0.1)" },
                      { value: "bearish", label: "↓ Bearish", color: C.red, bg: C.redDim },
                    ].map(opt => {
                      const active = current === opt.value;
                      return (
                        <button key={opt.value} onClick={() => setBias(pair, tf, opt.value)} style={{
                          padding: "5px 11px", borderRadius: 6, fontSize: 11, fontWeight: active ? 700 : 400,
                          border: `1.5px solid ${active ? opt.color : C.border}`,
                          background: active ? opt.bg : "transparent",
                          color: active ? opt.color : C.textMuted,
                          cursor: "pointer", transition: "all 0.12s",
                        }}>
                          {opt.label}
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
                  {isToday ? "🔴 Aujourd'hui" : daysLeft === 1 ? "🟡 Demain" : `dans ${daysLeft} jours`}
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

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF", "JPY"];
const ALL_PAIRS = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "GBPJPY", "EURJPY", "USDCHF", "XAGUSD", "BTCUSD", "ETHUSD", "US30", "NAS100", "SPX500"];

function SettingsSection({ title, children }) {
  return (
    <Card style={{ padding: 20, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>{title}</div>
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
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(String(settings.accountBalance));
  const [newBroker, setNewBroker] = useState("");
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

  const addBroker = (broker) => {
    if (!settings.brokers.includes(broker)) update({ brokers: [...settings.brokers, broker] });
  };
  const removeBroker = (broker) => update({ brokers: settings.brokers.filter((b) => b !== broker) });

  return (
    <div className="fade-in" style={{ maxWidth: 600 }}>
      <PageHeader title="Paramètres" />

      {/* Compte */}
      <SettingsSection title="📂 Comptes de trading">
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>Chaque compte est isolé — les trades et stats ne se mélangent pas.</div>

        {(accounts || []).map((acc) => {
          const typeColors = { real: C.teal, demo: C.purple, challenge: C.amber };
          const typeLabels = { real: "Réel", demo: "Démo", challenge: "Challenge" };
          const isActive = acc.id === activeAccountId;
          return (
            <div key={acc.id} style={{ padding: "12px 14px", background: C.inputBg || C.card, borderRadius: 10, border: `1.5px solid ${isActive ? C.purple : C.border}`, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
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
                {isActive ? (
                  <span style={{ fontSize: 11, color: C.purple, fontWeight: 700, background: C.purpleDim, padding: "3px 8px", borderRadius: 5 }}>Actif</span>
                ) : (
                  <button onClick={() => onSwitchAccount(acc.id)} style={{ ...btn.ghost, fontSize: 11, padding: "5px 10px" }}>Activer</button>
                )}
                {true && (
                  <button onClick={() => onSaveAccounts(accounts.filter(a => a.id !== acc.id))} style={{ ...btn.icon, padding: "5px", color: C.red, borderColor: "transparent" }}><X size={13} /></button>
                )}
              </div>
            </div>
          );
        })}

        <AddAccountForm accounts={accounts} onSaveAccounts={onSaveAccounts} />
      </SettingsSection>

      <SettingsSection title="💲 Solde & devise">
        <SettingsRow label="Solde du compte" sub="Capital utilisé pour la calculatrice de risque">
          {editingBalance ? (
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <input type="number" value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)} autoFocus style={{ ...inputStyle, width: 110 }} />
              <button onClick={() => { update({ accountBalance: Number(balanceInput) || 0 }); setEditingBalance(false); }} style={{ ...btn.primary, padding: "7px 12px" }}>OK</button>
              <button onClick={() => setEditingBalance(false)} style={{ ...btn.ghost, padding: "7px 10px" }}><X size={13} /></button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="tnum" style={{ fontSize: 15, fontWeight: 700, color: C.teal }}>${settings.accountBalance.toLocaleString()}</span>
              <button onClick={() => { setBalanceInput(String(settings.accountBalance)); setEditingBalance(true); }} style={{ ...btn.ghost, padding: "6px 11px", fontSize: 12 }}>Modifier</button>
            </div>
          )}
        </SettingsRow>
        <SettingsRow label="Devise" sub="Devise dans laquelle ton P&L est calculé">
          <select value={settings.currency} onChange={(e) => update({ currency: e.target.value })} style={{ ...inputStyle, width: 90 }}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </SettingsRow>
      </SettingsSection>

      {/* Broker actif */}
      <SettingsSection title="🔗 Broker actif">
        <SettingsRow label="Broker sélectionné" sub="Broker sur lequel tu trades actuellement">
          <select
            value={settings.broker}
            onChange={(e) => update({ broker: e.target.value })}
            style={{ ...inputStyle, width: 160 }}
          >
            {settings.brokers.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </SettingsRow>

        <div style={{ paddingTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 4 }}>Mes brokers</div>
          <TagList items={settings.brokers} onRemove={removeBroker} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              value={newBroker}
              onChange={(e) => setNewBroker(e.target.value)}
              placeholder="Nom du broker (ex: FTMO)"
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => { if (e.key === "Enter" && newBroker.trim()) { addBroker(newBroker.trim()); setNewBroker(""); } }}
            />
            <button
              onClick={() => { if (newBroker.trim()) { addBroker(newBroker.trim()); setNewBroker(""); } }}
              style={{ ...btn.primary, padding: "8px 14px" }}
            >
              Ajouter
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Paires tradées */}
      <SettingsSection title="📈 Paires tradées">
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

      {/* Tags personnalisés */}
      <SettingsSection title="🎯 PD Arrays & Tags">
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
      <SettingsSection title="⚙️ Autres">
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
            ⚠️ Valeurs approximatives basées sur des taux standard. Vérifie toujours la valeur pip exacte de ton broker pour les paires croisées (JPY, CHF, CAD).
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

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState("real");
  const [balance, setBalance] = useState("10000");
  const [broker, setBroker] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    const acc = { id: `acc_${Date.now()}`, name: name.trim(), type, balance: Number(balance) || 10000, broker };
    onComplete(acc);
  };

  const typeOpts = [
    { v: "real", l: "Compte Réel", icon: "💵", desc: "Trading live avec vrai argent", color: C.teal },
    { v: "demo", l: "Compte Démo", icon: "🎯", desc: "Pratique sans risque réel", color: C.purple },
    { v: "challenge", l: "Challenge/Prop", icon: "🏆", desc: "FTMO, MFF, The5ers...", color: C.amber },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: FONT.base }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <EmeieksLogo size={56} />
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text, marginTop: 14, letterSpacing: -0.5 }}>Emeieks Trade</div>
          <div style={{ fontSize: 14, color: C.textMuted, marginTop: 6 }}>Journal de trading ICT professionnel</div>
        </div>

        {step === 0 && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6, textAlign: "center" }}>Bienvenue 👋</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 28, textAlign: "center", lineHeight: 1.6 }}>
              Commençons par créer ton premier compte de trading.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {typeOpts.map(opt => (
                <button key={opt.v} onClick={() => setType(opt.v)} style={{
                  padding: "14px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left",
                  border: `2px solid ${type === opt.v ? opt.color : C.border}`,
                  background: type === opt.v ? `${opt.color}12` : C.card,
                  display: "flex", alignItems: "center", gap: 14, transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: type === opt.v ? opt.color : C.text }}>{opt.l}</div>
                    <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{opt.desc}</div>
                  </div>
                  {type === opt.v && <div style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: opt.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>
                  </div>}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(1)} style={{ ...btn.primary, width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, fontWeight: 700 }}>
              Continuer →
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <button onClick={() => setStep(0)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>
              ← Retour
            </button>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 6 }}>Détails du compte</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>Ces infos peuvent être modifiées plus tard dans Réglages.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6 }}>Nom du compte *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Mon compte réel, FTMO 100K..." autoFocus style={{ ...inputStyle, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6 }}>Capital de départ ($)</label>
                <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="10000" style={{ ...inputStyle, fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, display: "block", marginBottom: 6 }}>Broker (optionnel)</label>
                <input value={broker} onChange={e => setBroker(e.target.value)} placeholder="Ex: ICMarkets, Pepperstone, FTMO..." style={{ ...inputStyle, fontSize: 14 }} />
              </div>
            </div>
            <button onClick={handleCreate} disabled={!name.trim()} style={{ ...btn.primary, width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, fontWeight: 700, marginTop: 24, opacity: name.trim() ? 1 : 0.4 }}>
              Créer mon compte 🚀
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: C.textMuted }}>
          Tes données restent privées et sont sauvegardées localement.
        </div>
      </div>
    </div>
  );
}

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
async function uploadBase64ToStorage(base64) {
  const [header, data] = base64.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const ext = mime.split("/")[1] || "jpg";
  const blob = await fetch(base64).then(r => r.blob());
  const file = new File([blob], `screenshot.${ext}`, { type: mime });
  return uploadToStorage(file);
}

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
  };
}

// Convertit un trade base de données → format React
function dbToTrade(r) {
  return {
    id: r.id,
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
  };
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
  const saveAccounts = (newAccounts) => {
    setAccounts(newAccounts);
    try { localStorage.setItem("accounts", JSON.stringify(newAccounts)); } catch {}
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
  const [journalNotes, setJournalNotes] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 2500);
  };

  // ── Chargement initial depuis Supabase ──
  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Charger les trades
        const rows = await sbFetch("/trades?order=entry_time.desc");
        setTrades((rows || []).map(dbToTrade));

        // Charger les settings
        const settingsRows = await sbFetch("/settings?id=eq.main");
        if (settingsRows && settingsRows.length > 0) {
          const s = dbToSettings(settingsRows[0]);
          if (s) setAppSettings(s);
        }
        setDbError(null);
      } catch (e) {
        console.error("Erreur chargement:", e);
        setDbError("Connexion Supabase échouée — mode hors ligne");
        setTrades(MOCK_TRADES);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Sauvegarde des settings dans Supabase ──
  const saveSettings = async (newSettings) => {
    setAppSettings(newSettings);
    try {
      await sbFetch("/settings?id=eq.main", {
        method: "PATCH",
        body: JSON.stringify({
          account_balance: newSettings.accountBalance,
          currency: newSettings.currency,
          broker: newSettings.broker,
          pairs: newSettings.pairs,
          brokers: newSettings.brokers,
          custom_tags: newSettings.customTags,
          updated_at: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error("Erreur sauvegarde settings:", e);
    }
  };

  const openEditTrade = (trade) => { setEditingTrade(trade); setView("tradeForm"); };
  const openTradeDetail = (id) => { setActiveTradeId(id); setView("tradeDetail"); };
  const setupOptions = useMemo(() => [...new Set(trades.map((t) => t.setup).filter(Boolean))], [trades]);

  // ── Sauvegarder un trade (ajout ou modification) ──
  const saveTrade = async (trade) => {
    // Ajoute automatiquement l'accountId du compte actif
    const tradeWithAccount = { ...trade, accountId: activeAccountId };
    const exists = trades.some((t) => t.id === trade.id);
    setTrades((prev) => exists ? prev.map((t) => t.id === trade.id ? tradeWithAccount : t) : [tradeWithAccount, ...prev]);
    setActiveTradeId(trade.id);
    setView("tradeDetail");
    showToast(exists ? "Trade mis à jour ✓" : "Trade enregistré ✓");
    try {
      const dbTrade = tradeToDb(tradeWithAccount);
      if (exists) {
        await sbFetch(`/trades?id=eq.${trade.id}`, { method: "PATCH", body: JSON.stringify(dbTrade) });
      } else {
        await sbFetch("/trades", { method: "POST", body: JSON.stringify(dbTrade) });
      }
    } catch (e) {
      console.error("Erreur sauvegarde trade:", e);
      showToast("⚠️ Sauvegarde échouée — vérifie ta connexion", true);
    }
  };

  // ── Supprimer un trade ──
  const deleteTrade = async (id) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
    setView("trades");
    showToast("Trade supprimé");
    try {
      await sbFetch(`/trades?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
    } catch (e) {
      console.error("Erreur suppression:", e);
    }
  };

  // ── Mettre à jour le verdict 👍/👎 ──
  const updateVerdict = async (id, verdict) => {
    setTrades((prev) => prev.map((t) => t.id === id ? { ...t, verdict } : t));
    try {
      await sbFetch(`/trades?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ verdict }) });
    } catch (e) { console.error("Erreur verdict:", e); }
  };

  // ── Mettre à jour le statut Win/Loss ──
  const updateTradeStatus = async (id, newStatus, newResultR) => {
    setTrades((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const updatedR = newResultR !== undefined ? newResultR : t.resultR;
      const updatedUsd = newResultR !== undefined && t.riskUsd ? newResultR * t.riskUsd : t.resultUsd;
      return {
        ...t,
        status: newStatus === "win" || newStatus === "loss" ? "closed" : newStatus,
        resultR: updatedR,
        resultUsd: updatedUsd,
      };
    }));
    try {
      const t = trades.find((t) => t.id === id);
      const updatedR = newResultR !== undefined ? newResultR : t?.resultR;
      const updatedUsd = newResultR !== undefined && t?.riskUsd ? newResultR * t.riskUsd : t?.resultUsd;
      await sbFetch(`/trades?id=eq.${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus === "win" || newStatus === "loss" ? "closed" : newStatus,
          result_r: updatedR,
          result_usd: updatedUsd,
        }),
      });
    } catch (e) { console.error("Erreur statut:", e); }
  };

  // Filtre trades par compte actif — les autres comptes sont isolés
  const accountTrades = trades.filter(t => (t.accountId || "main") === activeAccountId);
  const currentBalance = useMemo(() => {
    const initial = appSettings?.accountBalance || 10000;
    const closed = accountTrades.filter(t => t.status !== "open");
    return initial + closed.reduce((s, t) => s + (t.resultUsd || 0), 0);
  }, [accountTrades, appSettings?.accountBalance]);

  const titles = { dashboard: "Dashboard", trades: "Trade Log", tradeDetail: "Détail du trade", tradeForm: editingTrade ? "Modifier le trade" : "Nouveau trade", stats: "Statistiques", calculator: "Calculatrice", coach: "IA Coach", settings: "Réglages", calendar: "Calendrier" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FONT.base }}>
      <GlobalStyle />
      <Sidebar view={view} setView={setView} onNewTrade={openNewTrade} />
      <div style={{ flex: 1, minWidth: 0, maxWidth: "100%", display: "flex", flexDirection: "column" }}>
        <TopBar title={titles[view]} isDark={isDark} onToggleTheme={toggleTheme} onCalendar={() => setView("calendar")} onCoach={() => setView("coach")} accounts={accounts} activeAccountId={activeAccountId} onSwitchAccount={switchAccount} onHome={() => setView("dashboard")} currentBalance={currentBalance} />

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

        <main className="app-main" style={{ flex: 1, minWidth: 0, padding: "22px 16px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 70px)", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.purple, borderRadius: "50%", animation: "spinSlow 0.8s linear infinite" }} />
              <div style={{ fontSize: 13, color: C.textSecondary }}>Chargement de tes trades…</div>
            </div>
          ) : (
            <div style={{ maxWidth: 1600, margin: "0 auto" }}>
              {view === "dashboard" && <Dashboard trades={accountTrades} onOpenTrade={openTradeDetail} setView={setView} initialBalance={appSettings?.accountBalance || 10000} />}
              {view === "trades" && <TradesList trades={accountTrades} onOpen={openTradeDetail} onNew={openNewTrade} onStatusChange={updateTradeStatus} onHome={() => setView("dashboard")} />}
              {view === "tradeDetail" && (
                <TradeDetail trade={trades.find((t) => t.id === activeTradeId)} onBack={() => setView("trades")} onEdit={openEditTrade} onDelete={deleteTrade} onVerdictChange={updateVerdict} onRetroSave={async (id, data) => { await saveTrade({ ...trades.find(t => t.id === id), ...data }); }} />
              )}
              {view === "tradeForm" && (
                <TradeForm initial={editingTrade} setupOptions={setupOptions} appSettings={{ ...appSettings, activeAccountName: activeAccount?.name, activeAccountColor: activeAccount?.type === "real" ? C.teal : activeAccount?.type === "challenge" ? C.amber : C.purple }} onCancel={() => setView(editingTrade ? "tradeDetail" : "trades")} onSave={saveTrade} />
              )}
              {view === "stats" && <AdvancedStats trades={accountTrades} />}
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
