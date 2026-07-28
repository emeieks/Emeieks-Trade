import React, { useState, useMemo, useRef } from "react";
import {
  LayoutGrid, NotebookPen, BarChart3, Calendar as CalendarIcon,
  Plus, X, Upload, Search, Download, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, Filter, ArrowUpRight, ArrowDownRight,
  Trash2, Edit3, Trophy, Clock, Save, Info, ChevronDown,
  Sparkles, CheckCircle2, AlertCircle, Brain, ImageOff, Calculator,
  ThumbsUp, ThumbsDown, Settings, Plus as PlusIcon,
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
  { name: "Order Block", category: "setup" },
  { name: "Breaker Block", category: "setup" },
  { name: "Mitigation Block", category: "setup" },
  { name: "Rejection Block", category: "setup" },
  { name: "Fair Value Gap", category: "setup" },
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
  const today = new Date("2026-06-19T12:00:00Z");
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
  const h = new Date(isoDate).getUTCHours();
  if (h >= 0 && h < 7) return "Asia";
  if (h >= 7 && h < 12) return "London";
  if (h >= 12 && h < 15) return "Overlap";
  if (h >= 15 && h < 21) return "New York";
  return "Hors session";
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
    border: "#E2E6F0", borderLight: "#D5DAE8",
    text: "#1E2433", textSecondary: "#6B7390", textMuted: "#9AA1B8",
    teal: "#16B8A0", tealDim: "rgba(22,184,160,0.10)",
    red: "#E8554E", redDim: "rgba(232,85,78,0.10)",
    purple: "#8B7CF6", purpleDim: "rgba(139,124,246,0.10)", purpleBright: "#7C6AE8",
  },
  dark: {
    bg: "#0F1117", sidebar: "#161A25",
    sidebarText: "#E8EAF4", sidebarTextDim: "#8891B0",
    sidebarBorder: "rgba(255,255,255,0.08)", sidebarHover: "rgba(255,255,255,0.06)",
    card: "#1B2130", cardHover: "#1F2636",
    border: "#2A3142", borderLight: "#343C52",
    text: "#F5F7FA", textSecondary: "#AAB2C5", textMuted: "#6B7388",
    teal: "#2DD4BF", tealDim: "rgba(45,212,191,0.12)",
    red: "#F87171", redDim: "rgba(248,113,113,0.12)",
    purple: "#7C5CFC", purpleDim: "rgba(124,92,252,0.14)", purpleBright: "#9580FF",
  },
};

// C est initialisé avec le thème clair par défaut — mis à jour dynamiquement via applyTheme()
let C = { ...THEMES.light };
function applyTheme(isDark) { Object.assign(C, isDark ? THEMES.dark : THEMES.light); }


const FONT = {
  base: "'Inter', -apple-system, sans-serif",
};

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      html, body { margin: 0; max-width: 100%; overflow-x: hidden; }
      #root, #app { max-width: 100%; overflow-x: hidden; }
      img { max-width: 100%; }
      ::-webkit-scrollbar { width: 7px; height: 7px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: ${C.borderLight}; }
      input::placeholder, textarea::placeholder { color: ${C.textMuted}; }
      input, textarea, select, button { font-family: ${FONT.base}; }
      input:focus, textarea:focus, select:focus { outline: none; border-color: ${C.purple} !important; box-shadow: 0 0 0 3px ${C.purpleDim}; }
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
      .tnum { font-variant-numeric: tabular-nums; }
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
  const isMistake = cat === "mistake";
  const isSession = cat === "session";
  const color = isMistake ? C.red : isSession ? C.textSecondary : C.purpleBright;
  const bg = isMistake ? C.redDim : isSession ? "rgba(170,178,197,0.1)" : C.purpleDim;
  const small = size === "sm";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "2px 7px" : "3px 9px", borderRadius: 5,
      background: bg, color, fontSize: small ? 10.5 : 11.5, fontWeight: 600, lineHeight: 1.6, whiteSpace: "nowrap",
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

function DirBadge({ direction, size = "sm" }) {
  const isLong = direction === "long";
  const sz = size === "lg" ? { fontSize: 13, padding: "3px 9px", borderRadius: 5 } : { fontSize: 11, padding: "2px 6px", borderRadius: 4 };
  return (
    <span style={{
      ...sz,
      fontWeight: 800, display: "inline-flex", alignItems: "center", letterSpacing: 0.5,
      background: isLong ? C.tealDim : C.redDim,
      color: isLong ? C.teal : C.red,
      border: `1px solid ${isLong ? C.teal : C.red}33`,
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

const inputStyle = { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 11px", color: C.text, fontSize: 13, width: "100%" };

const btn = {
  primary: { background: C.purple, color: "#fff", border: "none", borderRadius: 7, padding: "9px 15px", fontWeight: 600, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  ghost: { background: C.card, color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 7, padding: "8px 13px", fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 500 },
  icon: { background: C.card, color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 7, padding: 7, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" },
};

function Field({ label, children, hint }) {
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
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "trades", label: "Trade Log", icon: NotebookPen },
  { id: "calculator", label: "Calculatrice", icon: Calculator },
  { id: "stats", label: "Statistiques", icon: BarChart3 },
  { id: "coach", label: "IA Coach", icon: Brain },
];

function Sidebar({ view, setView, onNewTrade }) {
  return (
    <>
      <aside className="desktop-only sidebar-full" style={S.aside}>
        <div style={S.brand}>
          {/* Logo Emieks Trade Axe Bourse — chandelier + graphique */}
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <rect width="36" height="36" rx="9" fill="url(#brandGrad)" />
            {/* Chandelier haussier (vert) */}
            <rect x="8" y="14" width="4" height="10" rx="1" fill="#2DD4BF"/>
            <line x1="10" y1="11" x2="10" y2="14" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="10" y1="24" x2="10" y2="27" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Chandelier baissier (rouge) */}
            <rect x="16" y="10" width="4" height="8" rx="1" fill="#F87171"/>
            <line x1="18" y1="7" x2="18" y2="10" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="18" y1="18" x2="18" y2="22" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Chandelier haussier (vert) */}
            <rect x="24" y="16" width="4" height="7" rx="1" fill="#2DD4BF"/>
            <line x1="26" y1="13" x2="26" y2="16" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="26" y1="23" x2="26" y2="26" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#8B7CF6"/>
                <stop offset="100%" stopColor="#5B3FE0"/>
              </linearGradient>
            </defs>
          </svg>
          <div className="brand-text">
            <div style={{ fontSize: 13, fontWeight: 800, color: C.sidebarText, letterSpacing: -0.3, lineHeight: 1.1 }}>Emieks</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.sidebarTextDim, letterSpacing: 0.3 }}>Trade Axe Bourse</div>
          </div>
        </div>

        <button onClick={onNewTrade} className="new-trade-btn" style={S.newTradeBtn} title="Add Trade">
          <Plus size={15} strokeWidth={2.4} /> <span className="new-trade-label">Add Trade</span>
        </button>

        <nav style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 1 }}>
          {NAV_ITEMS.map((it) => {
            const active = view === it.id || (view === "tradeForm" && it.id === "trades") || (view === "tradeDetail" && it.id === "trades");
            const Icon = it.icon;
            return (
              <button key={it.id} className="nav-btn nav-item-row" onClick={() => setView(it.id)} title={it.label} style={{
                ...S.navItem,
                background: active ? "rgba(139,124,246,0.18)" : "transparent",
                color: active ? "#C4BAFB" : C.sidebarTextDim,
              }}>
                <Icon size={16} strokeWidth={1.9} />
                <span className="nav-label">{it.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={S.footer}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(139,124,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#C4BAFB" }}>JD</div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.sidebarText }}>Mon compte</div>
              <div style={{ fontSize: 10.5, color: C.sidebarTextDim }}>Compte démo</div>
            </div>
          </div>
        </div>
      </aside>

      <nav className="mobile-only" style={S.mobileNav}>
        {NAV_ITEMS.slice(0, 2).map((it) => {
          const active = view === it.id || (view === "tradeForm" && it.id === "trades") || (view === "tradeDetail" && it.id === "trades");
          const Icon = it.icon;
          return (
            <button key={it.id} onClick={() => setView(it.id)} style={{ ...S.mobileNavItem, color: active ? "#C4BAFB" : C.sidebarTextDim }}>
              <Icon size={19} strokeWidth={1.8} />
              <span style={{ fontSize: 9.5 }}>{it.label}</span>
            </button>
          );
        })}
        <button onClick={onNewTrade} style={S.mobileNavItem}>
          <div style={S.mobileFab}><Plus size={17} strokeWidth={2.6} color="#fff" /></div>
        </button>
        {NAV_ITEMS.slice(2).map((it) => {
          const active = view === it.id;
          const Icon = it.icon;
          return (
            <button key={it.id} onClick={() => setView(it.id)} style={{ ...S.mobileNavItem, color: active ? "#C4BAFB" : C.sidebarTextDim }}>
              <Icon size={19} strokeWidth={1.8} />
              <span style={{ fontSize: 9.5 }}>{it.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

const S = {
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
  mobileNav: { position: "fixed", bottom: 0, left: 0, right: 0, background: C.sidebar, borderTop: `1px solid ${C.sidebarBorder}`, display: "flex", justifyContent: "space-around", alignItems: "flex-end", padding: "10px 4px 20px", zIndex: 100 },
  mobileNavItem: { background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", padding: "3px 8px", paddingBottom: 2 },
  mobileFab: { width: 54, height: 54, borderRadius: "50%", background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", marginTop: -32, marginBottom: 4, boxShadow: `0 4px 18px rgba(139,124,246,0.55)`, border: `3px solid ${C.sidebar}` },
};

/* ============================================================================
   TOP BAR — sélecteur de période façon TradeZella
   ============================================================================ */

function TopBar({ title, onSettings, isDark, onToggleTheme }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${C.sidebarBorder}`, background: C.sidebar, gap: 8, minWidth: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.sidebarText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button className="desktop-only" style={{ ...btn.ghost, fontSize: 12, padding: "7px 10px", background: C.sidebarHover, color: C.sidebarTextDim, borderColor: C.sidebarBorder }}>
          <CalendarIcon size={13} /> 01 juin – 19 juin 2026 <ChevronDown size={13} />
        </button>
        <button className="desktop-only" style={{ ...btn.ghost, fontSize: 12, padding: "7px 10px", background: C.sidebarHover, color: C.sidebarTextDim, borderColor: C.sidebarBorder }}>Tous les comptes <ChevronDown size={13} /></button>
        <button onClick={onToggleTheme} style={{ ...btn.icon, background: C.sidebarHover, color: C.sidebarTextDim, borderColor: C.sidebarBorder }} title={isDark ? "Mode clair" : "Mode sombre"}>
          <span style={{ fontSize: 15 }}>{isDark ? "☀️" : "🌙"}</span>
        </button>
        <button onClick={onSettings} style={{ ...btn.icon, background: C.sidebarHover, color: C.sidebarTextDim, borderColor: C.sidebarBorder }} title="Paramètres">
          <Settings size={17} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   DASHBOARD — dense, 4 rangées façon TradeZella
   ============================================================================ */

function computeStats(trades) {
  const closed = trades.filter((t) => t.status !== "open");
  const wins = closed.filter((t) => t.resultR > 0);
  const losses = closed.filter((t) => t.resultR < 0);
  const totalPnl = closed.reduce((s, t) => s + (t.resultUsd || 0), 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgRR = closed.length ? closed.reduce((s, t) => s + (t.resultR || 0), 0) / closed.length : 0;

  const sorted = [...closed].sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime));
  let bal = 10000;
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

  // Profit jour / semaine / mois (référence : "aujourd'hui" = 19 juin 2026, cohérent avec les données mock)
  const now = new Date("2026-06-19T23:59:59Z");
  const startOfDay = new Date(now); startOfDay.setUTCHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay); startOfWeek.setUTCDate(startOfDay.getUTCDate() - ((startOfDay.getUTCDay() + 6) % 7));
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const sumSince = (since) => closed.filter((t) => new Date(t.entryTime) >= since).reduce((s, t) => s + (t.resultUsd || 0), 0);
  const profitToday = sumSince(startOfDay);
  const profitWeek = sumSince(startOfWeek);
  const profitMonth = sumSince(startOfMonth);

  const avgWin = wins.length ? wins.reduce((s, t) => s + (t.resultUsd || 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + (t.resultUsd || 0), 0) / losses.length : 0;

  return { closed, wins, losses, totalPnl, winRate, avgRR, avgWin, avgLoss, curve, maxDD, currentBalance: bal, profitToday, profitWeek, profitMonth };
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

function Dashboard({ trades, onOpenTrade, setView }) {
  const [period, setPeriod] = useState("30j");

  const filteredTrades = useMemo(() => {
    if (period === "tout") return trades;
    const days = period === "7j" ? 7 : period === "30j" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    // Les données mock sont de 2026 — on adapte la référence
    const ref = new Date("2026-06-19T23:59:59Z");
    const cutoff = new Date(ref);
    cutoff.setDate(ref.getDate() - days);
    return trades.filter((t) => new Date(t.entryTime) >= cutoff);
  }, [trades, period]);

  const stats = useMemo(() => computeStats(filteredTrades), [filteredTrades]);
  const byPair = useMemo(() => groupBy(stats.closed, (t) => t.pair).sort((a, b) => b.pnl - a.pnl).slice(0, 5), [stats.closed]);
  const bySetup = useMemo(() => groupBy(stats.closed, (t) => t.setup || (t.tags || [])[0] || "—").sort((a, b) => b.pnl - a.pnl).slice(0, 5), [stats.closed]);
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
        <StatTile compact label="Avg Win" value={fmtUsdSigned(stats.avgWin)} valueColor={C.teal} />
        <StatTile compact label="Avg Loss" value={fmtUsdSigned(stats.avgLoss)} valueColor={C.red} />
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
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={stats.curve} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.teal} stopOpacity={0.25} />
                <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.textMuted, fontSize: 10.5 }} axisLine={{ stroke: C.border }} tickLine={false} minTickGap={40} />
            <YAxis tick={{ fill: C.textMuted, fontSize: 10.5 }} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.borderLight}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: C.textSecondary }} formatter={(v) => [fmtUsd(v), "Capital"]} />
            <Area type="monotone" dataKey="balance" stroke={C.teal} strokeWidth={2} fill="url(#eqFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Ligne 3 — Win/Loss + Profit par paire/setup/session */}
      <div className="dashboard-grid4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
        <Card style={{ padding: 16 }}>
          <CardLabel info>Win / Loss</CardLabel>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8 }}>
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={winLossData} dataKey="value" innerRadius={30} outerRadius={46} paddingAngle={3} startAngle={90} endAngle={-270}>
                  {winLossData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: "center", marginTop: -68, marginBottom: 50, pointerEvents: "none" }}>
            <div className="tnum" style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{fmtPct(stats.winRate)}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, fontSize: 11 }}>
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

function TradesList({ trades, onOpen, onNew, onStatusChange }) {
  const [search, setSearch] = useState("");
  const [filterPair, setFilterPair] = useState("all");
  const [filterSetup, setFilterSetup] = useState("all");
  const [filterSession, setFilterSession] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const setupOptions = useMemo(() => [...new Set(trades.map((t) => t.setup).filter(Boolean))], [trades]);

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (filterPair !== "all" && t.pair !== filterPair) return false;
      if (filterSetup !== "all" && t.setup !== filterSetup) return false;
      if (filterSession !== "all" && getSession(t.entryTime) !== filterSession) return false;
      if (filterTag !== "all" && !(t.tags || []).includes(filterTag)) return false;
      if (filterResult === "win" && !(t.resultR > 0)) return false;
      if (filterResult === "loss" && !(t.resultR < 0)) return false;
      if (filterResult === "be" && t.status !== "breakeven") return false;
      if (dateFrom && new Date(t.entryTime) < new Date(dateFrom)) return false;
      if (dateTo && new Date(t.entryTime) > new Date(dateTo + "T23:59:59")) return false;
      if (search && !t.pair.toLowerCase().includes(search.toLowerCase()) && !(t.notes || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [trades, filterPair, filterSetup, filterSession, filterTag, filterResult, dateFrom, dateTo, search]);

  const activeFilterCount = [filterPair !== "all", filterSetup !== "all", filterSession !== "all", filterTag !== "all", filterResult !== "all", dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="fade-in">
      <PageHeader title="Trade Log" action={
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportToCsv(filtered)} style={btn.ghost}><Download size={14} /> Export CSV</button>
          <button onClick={onNew} style={btn.primary}><Plus size={14} /> Add Trade</button>
        </div>
      } />

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
          <Search size={14} color={C.textMuted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input placeholder="Rechercher paire ou note…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <button onClick={() => setShowFilters((v) => !v)} style={{ ...btn.ghost, color: activeFilterCount ? C.purpleBright : C.textSecondary, borderColor: activeFilterCount ? "rgba(139,124,246,0.35)" : C.border, background: activeFilterCount ? C.purpleDim : C.card }}>
          <Filter size={14} /> Filtres {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>
      </div>

      {/* Chips filtre rapide PD Array */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {["all", ...TAG_CATALOG.filter((t) => t.category === "setup").map((t) => t.name)].map((tag) => (
          <button key={tag} onClick={() => setFilterTag(tag === filterTag ? "all" : tag)} style={{
            padding: "4px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
            border: `1px solid ${filterTag === tag && tag !== "all" ? C.purple : C.border}`,
            background: filterTag === tag && tag !== "all" ? C.purpleDim : "transparent",
            color: filterTag === tag && tag !== "all" ? C.purpleBright : C.textSecondary,
          }}>
            {tag === "all" ? "Tous" : tag}
          </button>
        ))}
      </div>

      {showFilters && (
        <Card style={{ padding: 16, marginBottom: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
          <Field label="Paire">
            <select value={filterPair} onChange={(e) => setFilterPair(e.target.value)} style={inputStyle}>
              <option value="all">Toutes</option>
              {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Setup">
            <select value={filterSetup} onChange={(e) => setFilterSetup(e.target.value)} style={inputStyle}>
              <option value="all">Tous</option>
              {setupOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Session">
            <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)} style={inputStyle}>
              <option value="all">Toutes</option>
              {["Asia", "London", "Overlap", "New York", "Hors session"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Tag">
            <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} style={inputStyle}>
              <option value="all">Tous</option>
              {TAG_CATALOG.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Résultat">
            <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} style={inputStyle}>
              <option value="all">Tous</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="be">Breakeven</option>
            </select>
          </Field>
          <Field label="Du"><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} /></Field>
          <Field label="Au"><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} /></Field>
        </Card>
      )}

      {trades.length === 0 ? (
        <EmptyState icon={NotebookPen} title="Ton journal est vide" text="Chaque trade que tu prends mérite une fiche complète. Commence à documenter." action={<button onClick={onNew} style={{ ...btn.primary, marginTop: 8 }}>Ajouter mon premier trade</button>} />
      ) : filtered.length === 0 ? (
        <div style={{ color: C.textMuted, fontSize: 13, padding: "40px 0", textAlign: "center" }}>Aucun trade ne correspond à ces filtres.</div>
      ) : (
        <>
          <Card style={{ overflow: "hidden" }} className="desktop-only">
            <div className="table-scroll">
            <div style={{ display: "grid", gridTemplateColumns: "56px 90px 70px 60px 130px 90px 70px 60px 90px 1fr 56px", padding: "10px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 10.5, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, minWidth: 860 }}>
              <div>Img</div><div>Date</div><div>Paire</div><div>Dir.</div><div>Setup</div><div>Résultat $</div><div>R</div><div>W/L</div><div>Session</div><div>Tags</div><div>Note</div>
            </div>
            {filtered.map((t) => (
              <div key={t.id} className="row-hover" onClick={() => onOpen(t.id)} style={{ display: "grid", gridTemplateColumns: "56px 90px 70px 60px 130px 90px 70px 60px 90px 1fr 56px", padding: "8px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", cursor: "pointer", fontSize: 12.5, minWidth: 860 }}>
                <div style={{ width: 40, height: 28, borderRadius: 4, overflow: "hidden", background: C.bg, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {t.screenshotBefore ? (
                    <img src={t.screenshotBefore} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <ImageOff size={12} color={C.textMuted} />
                  )}
                </div>
                <div style={{ color: C.textSecondary, fontSize: 11.5 }}>{fmtDate(t.entryTime)}</div>
                <div style={{ fontWeight: 700 }}>{t.pair}</div>
                <div><DirBadge direction={t.direction} /></div>
                <div style={{ color: C.textSecondary, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.setup}</div>
                <div className="tnum" style={{ fontWeight: 700, color: t.resultUsd >= 0 ? C.teal : C.red }}>{fmtUsdSigned(t.resultUsd)}</div>
                <div className="tnum" style={{ color: C.textSecondary, fontWeight: 600 }}>{fmtR(t.resultR)}</div>
                <div><ResultBadge resultR={t.resultR} status={t.status} size="sm" /></div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{getSession(t.entryTime)}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", overflow: "hidden" }}>
                  {(t.tags || []).slice(0, 2).map((tag) => <TagBadge key={tag} name={tag} size="sm" />)}
                  {(t.tags || []).length > 2 && <span style={{ fontSize: 10.5, color: C.textMuted }}>+{t.tags.length - 2}</span>}
                </div>
                <div className="tnum" style={{ fontSize: 11.5, fontWeight: 700, color: t.reflection ? C.purpleBright : C.textMuted }}>{t.reflection ? `${t.reflection.tradeRating}/10` : "—"}</div>
              </div>
            ))}
            </div>
          </Card>

          <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((t) => (
              <Card key={t.id} style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ height: 3, background: t.status === "open" ? C.purple : t.resultR > 0 ? C.teal : t.status === "breakeven" ? C.textMuted : C.red }} />
                <div style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => onOpen(t.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{t.pair}</span>
                      <DirBadge direction={t.direction} />
                      {t.screenshotBefore && (
                        <button onClick={(e) => { e.stopPropagation(); window.open(t.screenshotBefore); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: 13 }}>📷</button>
                      )}
                    </div>
                    <span className="tnum" style={{ fontWeight: 800, fontSize: 15, color: t.status === "open" ? C.textSecondary : (t.resultUsd || 0) >= 0 ? C.teal : C.red }}>
                      {t.status === "open" ? "En cours" : fmtUsdSigned(t.resultUsd)}
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: t.tags?.length > 0 ? 8 : 0 }}>{fmtDate(t.entryTime)} · {t.setup || (t.tags || [])[0] || "—"}</div>
                  {t.tags?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {t.tags.slice(0, 3).map((tag) => <TagBadge key={tag} name={tag} size="sm" />)}
                    </div>
                  )}
                </div>
                {/* Boutons Win/Loss bien visibles en bas de chaque carte */}
                <div style={{ display: "flex", borderTop: `1px solid ${C.border}` }}>
                  {[
                    { v: "win", label: "✅ Gagné", color: C.teal, bg: C.tealDim, rSign: 1 },
                    { v: "loss", label: "❌ Perdu", color: C.red, bg: C.redDim, rSign: -1 },
                    { v: "breakeven", label: "➖ BE", color: C.textMuted, bg: "rgba(170,178,197,0.12)", rSign: 0 },
                    { v: "open", label: "🔓 Ouvert", color: C.purpleBright, bg: C.purpleDim, rSign: null },
                  ].map((opt, i, arr) => {
                    const isActive = (opt.v === "win" && t.resultR > 0 && t.status !== "open") ||
                                     (opt.v === "loss" && (t.resultR || 0) <= 0 && t.status !== "open" && t.status !== "breakeven") ||
                                     (opt.v === "breakeven" && t.status === "breakeven") ||
                                     (opt.v === "open" && t.status === "open");
                    const newR = opt.rSign === null ? t.resultR : opt.rSign === 0 ? 0 : opt.rSign * Math.abs(t.resultR || 1);
                    return (
                      <button key={opt.v} onClick={(e) => { e.stopPropagation(); onStatusChange(t.id, opt.v, newR); }} style={{
                        flex: 1, padding: "10px 2px", background: isActive ? opt.bg : "transparent",
                        border: "none", borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                        color: isActive ? opt.color : C.textMuted, fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: "pointer",
                        transition: "background 0.12s ease",
                      }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
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
  ctx.fillStyle = isWin ? "#16B8A0" : "#E8554E";
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
  ctx.fillStyle = isWin ? "#16B8A0" : "#E8554E";
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

function TradeDetail({ trade, onBack, onEdit, onDelete, onVerdictChange }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState("");

  const runAiAnalysis = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const text = await getSingleTradeAnalysis(trade);
      setAiAnalysis(text);
    } catch (e) {
      setAiError(e.message || "L'analyse a échoué.");
    } finally {
      setAiLoading(false);
    }
  };

  if (!trade) {
    return (
      <div className="fade-in">
        <BackLink onClick={onBack}>Retour au journal</BackLink>
        <EmptyState icon={NotebookPen} title="Trade introuvable" text="Ce trade a peut-être été supprimé." />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: 1280 }}>
      <BackLink onClick={onBack}>Retour au journal</BackLink>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 10, marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 26 }}>{trade.pair}</span>
            <DirBadge direction={trade.direction} size="lg" />
            <ResultBadge resultR={trade.resultR} status={trade.status} />
          </div>
          <div style={{ fontSize: 12, color: C.textSecondary, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Clock size={12} /> {fmtDateTime(trade.entryTime)} · {getSession(trade.entryTime)} · {trade.setup}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onEdit(trade)} style={btn.ghost}><Edit3 size={13} /> Modifier</button>
          <button onClick={() => shareTradeCard(trade)} style={btn.ghost}>📤 Partager</button>
          {confirmDelete ? (
            <button onClick={() => onDelete(trade.id)} style={{ ...btn.ghost, color: C.red, borderColor: "rgba(232,85,78,0.35)" }}>Confirmer</button>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={btn.icon}><Trash2 size={14} /></button>
          )}
        </div>
      </div>

      <div className="trade-detail-layout">
        {/* Colonne gauche — preuve visuelle + chiffres clés */}
        <div className="trade-detail-col-left">
          {(trade.screenshotBefore || trade.screenshotAfter) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {trade.screenshotBefore && (
                <Card style={{ padding: 6, overflow: "hidden" }}>
                  <div style={{ fontSize: 10.5, color: C.textMuted, padding: "4px 6px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Avant le trade</div>
                  <img src={trade.screenshotBefore} alt="Avant" style={{ width: "100%", borderRadius: 6, display: "block" }} />
                </Card>
              )}
              {trade.screenshotAfter && (
                <Card style={{ padding: 6, overflow: "hidden" }}>
                  <div style={{ fontSize: 10.5, color: C.textMuted, padding: "4px 6px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>Après le trade</div>
                  <img src={trade.screenshotAfter} alt="Après" style={{ width: "100%", borderRadius: 6, display: "block" }} />
                </Card>
              )}
            </div>
          ) : (
            <Card style={{ padding: 24, marginBottom: 14, textAlign: "center", color: C.textMuted, fontSize: 12 }}>
              Aucun screenshot pour ce trade.
            </Card>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 14 }}>
            <DetailStat label="Entrée" value={trade.entryPrice} />
            <DetailStat label="Stop loss" value={trade.stopLoss ?? "—"} />
            <DetailStat label="Take profit" value={trade.takeProfit ?? "—"} />
            <DetailStat label="Sortie" value={trade.exitPrice ?? "—"} />
            <DetailStat label="Taille" value={`${trade.positionSize} lot`} />
            <DetailStat label="Risque" value={fmtUsd(trade.riskUsd)} />
            <DetailStat label="Résultat $" value={fmtUsdSigned(trade.resultUsd)} valueColor={trade.resultUsd >= 0 ? C.teal : C.red} />
            <DetailStat label="Résultat R" value={fmtR(trade.resultR)} valueColor={trade.resultR >= 0 ? C.teal : C.red} />
          </div>

          {trade.tags?.length > 0 && (
            <Card style={{ padding: 16 }}>
              <CardLabel>Tags</CardLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {trade.tags.map((tag) => <TagBadge key={tag} name={tag} />)}
              </div>
            </Card>
          )}
        </div>

        {/* Colonne droite — simple et rapide */}
        <div className="trade-detail-col-right">
          <Card style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <CardLabel>Notes</CardLabel>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.textMuted }}>Ce trade était :</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onVerdictChange(trade.id, trade.verdict === "good" ? null : "good")} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, fontSize: 17, background: trade.verdict === "good" ? C.tealDim : C.bg, border: `1.5px solid ${trade.verdict === "good" ? C.teal : C.border}`, cursor: "pointer" }}>👍</button>
                  <button onClick={() => onVerdictChange(trade.id, trade.verdict === "bad" ? null : "bad")} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, fontSize: 17, background: trade.verdict === "bad" ? C.redDim : C.bg, border: `1.5px solid ${trade.verdict === "bad" ? C.red : C.border}`, cursor: "pointer" }}>👎</button>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: C.text, whiteSpace: "pre-wrap" }}>{trade.notes || "Aucune note."}</p>
          </Card>

          <Card style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Brain size={14} color={C.purpleBright} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Analyse IA</span>
              </div>
              <button onClick={runAiAnalysis} disabled={aiLoading} style={{ ...btn.ghost, fontSize: 11.5, padding: "6px 11px", opacity: aiLoading ? 0.5 : 1 }}>
                {aiLoading ? <span style={{ display: "inline-block", animation: "spinSlow 1.6s linear infinite" }}>⟳</span> : <Sparkles size={12} />}
                {aiAnalysis ? "Réanalyser" : "Analyser"}
              </button>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>Lecture croisée des données et du contexte de ce trade</div>

            {aiError && (
              <div style={{ color: C.red, fontSize: 12, padding: "9px 11px", background: C.redDim, borderRadius: 7, marginBottom: 10 }}>
                {aiError}
              </div>
            )}

            {!aiAnalysis && !aiLoading && !aiError && (
              <div style={{ textAlign: "center", padding: "16px 10px", color: C.textMuted, fontSize: 12 }}>
                Clique sur "Analyser" pour une lecture IA de ce trade.
              </div>
            )}

            {aiLoading && (
              <div style={{ textAlign: "center", padding: "16px 10px", color: C.textSecondary, fontSize: 12 }}>
                Analyse en cours…
              </div>
            )}

            {aiAnalysis && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {aiAnalysis.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean).map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", background: C.bg, borderRadius: 7, border: `1px solid ${C.border}` }}>
                    <Sparkles size={12} color={C.purpleBright} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12.5, color: C.text, lineHeight: 1.55 }}>{line}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
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
  const [status, setStatus] = useState("idle"); // idle | analyzing | done | failed
  const [result, setResult] = useState(null);

  const handleFile = async (file) => {
    setError("");
    setResult(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Le fichier doit être une image."); return; }
    if (file.size > 4.5 * 1024 * 1024) { setError("Image trop lourde (max ~4.5 Mo)."); return; }

    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);

    setStatus("analyzing");
    try {
      const extracted = await extractTradeFromScreenshot(file);
      setResult(extracted);
      setStatus("done");
      onExtracted(extracted);
    } catch (e) {
      setStatus("failed");
      setError(e.message || "L'analyse automatique a échoué. Tu peux remplir les champs manuellement.");
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

      <div onClick={() => fileRef.current?.click()} style={{
        border: `1.5px dashed ${status === "analyzing" ? C.purple : C.border}`, borderRadius: 8, cursor: "pointer", overflow: "hidden",
        position: "relative", background: C.bg, minHeight: value ? "auto" : 140,
        display: "flex", alignItems: "center", justifyContent: "center",
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
            <Sparkles size={20} strokeWidth={1.5} style={{ marginBottom: 7, color: C.purpleBright }} />
            <div style={{ fontSize: 12.5, fontWeight: 600, color: C.textSecondary }}>Uploader le screenshot TradingView</div>
            <div style={{ fontSize: 11, marginTop: 3 }}>Les champs entry / SL / TP / direction seront extraits automatiquement</div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ color: C.red, fontSize: 11.5, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {status === "done" && result && (
        <div style={{ marginTop: 10, padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
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
  high: { color: "#16B8A0", label: "Fiable" },
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

  const handleFile = (file) => {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Le fichier doit être une image."); return; }
    if (file.size > 4.5 * 1024 * 1024) { setError("Image trop lourde (max ~4.5 Mo)."); return; }
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 6 }}>{label}</div>
      <div onClick={() => fileRef.current?.click()} style={{
        border: `1.5px dashed ${C.border}`, borderRadius: 8, cursor: "pointer", overflow: "hidden",
        position: "relative", background: C.bg, minHeight: value ? "auto" : 110,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {value ? (
          <>
            <img src={value} alt={label} style={{ width: "100%", display: "block", maxHeight: 220, objectFit: "contain" }} />
            <button onClick={(e) => { e.stopPropagation(); onChange(null); }} style={{ position: "absolute", top: 6, right: 6, background: "rgba(15,17,23,0.9)", border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, padding: 5, cursor: "pointer", display: "flex" }}>
              <X size={12} />
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", color: C.textMuted, padding: 16 }}>
            <Upload size={18} strokeWidth={1.5} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 11.5 }}>Cliquer pour uploader</div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0])} />
      {error && <div style={{ color: C.red, fontSize: 11, marginTop: 4 }}>{error}</div>}
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

  const accountBalance = appSettings?.accountBalance || 10000;
  const sessionTags = TAG_CATALOG.filter((t) => t.category === "session");
  const customSetupTags = appSettings?.customTags || [];
  const allSetupTags = [...TAG_CATALOG.filter((t) => t.category === "setup"), ...customSetupTags.map((n) => ({ name: n, category: "setup" }))];

  // Calcul pip live
  const pipDecimal = pair.includes("JPY") ? 0.01 : pair === "XAUUSD" ? 0.1 : 0.0001;
  const pipValuePerLot = pair === "XAUUSD" ? 10 : pair.includes("JPY") ? 6.8 : 10;

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
    });
  };

  return (
    <div className="fade-in" style={{ maxWidth: 720 }}>
      <BackLink onClick={onCancel}>Annuler</BackLink>
      <PageHeader title={isEdit ? "Modifier le trade" : "Nouveau trade"} />

      {/* Smart Capture */}
      {!isEdit && (
        <Card style={{ padding: 16, marginBottom: 14, borderColor: "rgba(139,124,246,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
            <Sparkles size={14} color={C.purpleBright} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Smart Trade Capture</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 12 }}>Uploade ton screenshot TradingView, le formulaire se remplit automatiquement.</div>
          <SmartCaptureBox value={screenshotBefore} onChange={setScreenshotBefore} onExtracted={handleExtracted} />
        </Card>
      )}

      {/* Identification — statut OUVERT par défaut, sans setup principal, avec tags */}
      <Card style={{ padding: 16, marginBottom: 14 }}>
        <CardLabel>Identification</CardLabel>
        <div className="form-grid-2" style={{ marginTop: 12 }}>
          <Field label="Paire">
            <select value={pair} onChange={(e) => setPair(e.target.value)} style={inputStyle}>
              {(appSettings?.pairs || PAIRS).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Direction">
            <div style={{ display: "flex", gap: 6 }}>
              <ToggleBtn active={direction === "long"} onClick={() => setDirection("long")} color={C.teal}>Long</ToggleBtn>
              <ToggleBtn active={direction === "short"} onClick={() => setDirection("short")} color={C.red}>Short</ToggleBtn>
            </div>
          </Field>
          <Field label="Date et heure d'entrée">
            <input type="datetime-local" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Résultat du trade">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setStatus("open")} style={{
                flex: "1 1 80px", padding: "10px 8px", borderRadius: 8, border: `2px solid ${status === "open" ? C.purple : C.border}`,
                background: status === "open" ? C.purpleDim : "transparent", color: status === "open" ? C.purpleBright : C.textMuted,
                fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 18 }}>🔓</span>
                <span>Ouvert</span>
              </button>
              <button onClick={() => setStatus("win")} style={{
                flex: "1 1 80px", padding: "10px 8px", borderRadius: 8, border: `2px solid ${status === "win" ? C.teal : C.border}`,
                background: status === "win" ? C.tealDim : "transparent", color: status === "win" ? C.teal : C.textMuted,
                fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <span>Gagné</span>
              </button>
              <button onClick={() => setStatus("loss")} style={{
                flex: "1 1 80px", padding: "10px 8px", borderRadius: 8, border: `2px solid ${status === "loss" ? C.red : C.border}`,
                background: status === "loss" ? C.redDim : "transparent", color: status === "loss" ? C.red : C.textMuted,
                fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 18 }}>❌</span>
                <span>Perdu</span>
              </button>
              <button onClick={() => setStatus("breakeven")} style={{
                flex: "1 1 80px", padding: "10px 8px", borderRadius: 8, border: `2px solid ${status === "breakeven" ? C.textSecondary : C.border}`,
                background: status === "breakeven" ? "rgba(170,178,197,0.12)" : "transparent", color: status === "breakeven" ? C.textSecondary : C.textMuted,
                fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}>
                <span style={{ fontSize: 18 }}>➖</span>
                <span>Breakeven</span>
              </button>
            </div>
          </Field>
        </div>

        {/* Tags PD Arrays + custom — directement dans Identification */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>Tags (setup, PD Arrays)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allSetupTags.map((t) => {
              const active = tags.includes(t.name);
              return (
                <button key={t.name} onClick={() => toggleTag(t.name)} style={{
                  padding: "5px 11px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${active ? C.purple : C.border}`,
                  background: active ? C.purpleDim : "transparent",
                  color: active ? C.purpleBright : C.textSecondary,
                }}>
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Session */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 }}>Session</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sessionTags.map((t) => {
              const active = tags.includes(t.name);
              return (
                <button key={t.name} onClick={() => toggleTag(t.name)} style={{
                  padding: "5px 11px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${active ? "rgba(167,139,224,0.5)" : C.border}`,
                  background: active ? "rgba(167,139,224,0.1)" : "transparent",
                  color: active ? "#A78BE0" : C.textSecondary,
                }}>
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Prix et taille — avec TP/SL colorés, exit = TP par défaut, risque % live */}
      <Card style={{ padding: 16, marginBottom: 14 }}>
        <CardLabel>Prix et taille</CardLabel>
        <div className="form-grid-2" style={{ marginTop: 12 }}>
          <Field label="Entrée" hint="Prix d'entrée">
            <input type="number" step="any" placeholder="1.08450" value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              style={{ ...inputStyle, color: C.text, fontWeight: 600 }} />
          </Field>
          <Field label="Stop Loss" hint="">
            <input type="number" step="any" placeholder="1.08200" value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              style={{ ...inputStyle, color: C.red, fontWeight: 700 }} />
          </Field>
          <Field label="Take Profit" hint="">
            <input type="number" step="any" placeholder="1.09100" value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              style={{ ...inputStyle, color: "#5B8DEF", fontWeight: 700 }} />
          </Field>
          <Field label="Prix de sortie" hint="= TP par défaut">
            <input type="number" step="any" placeholder="auto = TP" value={exitPrice}
              onChange={(e) => { setExitPrice(e.target.value); }}
              style={{ ...inputStyle }} />
          </Field>
          <Field label="Taille de position (lots)">
            <input type="number" step="0.01" placeholder="0.50" value={positionSize}
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
        <div style={{ marginTop: 14, padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
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
          <div style={{ marginTop: 10, padding: "10px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8 }}>
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

      {/* Notes uniquement */}
      <Card style={{ padding: 16, marginBottom: 18 }}>
        <CardLabel>Notes personnelles</CardLabel>
        <textarea rows={4} placeholder="Contexte du marché, ce que tu as bien fait, ce à améliorer…" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, resize: "vertical", marginTop: 10 }} />
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
  const today = new Date("2026-06-19T00:00:00Z");
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
  const [cursor, setCursor] = useState(new Date("2026-06-19T00:00:00Z"));
  const [selectedDay, setSelectedDay] = useState(null);

  const byDay = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      const d = new Date(t.entryTime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = { pnl: 0, count: 0, trades: [] };
      map[key].pnl += t.resultUsd || 0;
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
    let sum = 0;
    Object.entries(byDay).forEach(([key, v]) => {
      const [y, m] = key.split("-").map(Number);
      if (y === year && m === month) sum += v.pnl;
    });
    return sum;
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
              <div className="tnum" style={{ fontSize: 12, fontWeight: 700, color: monthPnl >= 0 ? C.teal : C.red }}>{fmtUsdSigned(monthPnl)}</div>
            </div>
            <button onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDay(null); }} style={btn.icon}><ChevronRight size={16} /></button>
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
              const isToday = new Date("2026-06-19").toDateString() === new Date(year, month, d).toDateString();
              const isSelected = selectedDay && selectedDay.getDate() === d && selectedDay.getMonth() === month && selectedDay.getFullYear() === year;
              return (
                <button key={i} onClick={() => setSelectedDay(data ? new Date(year, month, d) : null)} style={{
                  aspectRatio: "1", borderRadius: 7,
                  border: `1.5px solid ${isSelected ? C.purple : isToday ? C.purple : C.border}`,
                  background: isSelected ? C.purpleDim : data ? (data.pnl >= 0 ? C.tealDim : C.redDim) : C.bg,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: data ? "pointer" : "default", padding: 2, gap: 1,
                }}>
                  <span style={{ fontSize: 10.5, color: data ? C.text : C.textMuted, fontWeight: isToday ? 700 : 500 }}>{d}</span>
                  {data && <span className="tnum" style={{ fontSize: 8.5, fontWeight: 700, color: data.pnl >= 0 ? C.teal : C.red }}>{data.pnl >= 0 ? "+" : ""}{Math.round(data.pnl)}</span>}
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
  const [selectedDate, setSelectedDate] = useState(new Date("2026-06-19T00:00:00Z"));

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
    </div>
  );
}

/* ============================================================================
   AI COACH — page dédiée
   ============================================================================ */

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
const ALL_PAIRS = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "GBPJPY", "EURJPY", "GBPJPY", "USDCHF", "XAGUSD", "BTCUSD", "ETHUSD", "US30", "NAS100", "SPX500"];

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

function SettingsPage({ settings, setSettings }) {
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
      <SettingsSection title="💰 Comptes de trading">
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>Gérer tes différents comptes (prop firm, compte perso, démo, etc.)</div>
          {(settings.accounts || [{ id: "main", name: "Compte principal", balance: settings.accountBalance, type: "perso" }]).map((acc, i) => (
            <div key={acc.id} style={{ padding: "10px 12px", background: C.bg, borderRadius: 8, border: `1px solid ${acc.id === (settings.activeAccount || "main") ? C.purple : C.border}`, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{acc.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{acc.type} · ${(acc.balance || 0).toLocaleString()}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {acc.id !== (settings.activeAccount || "main") && (
                  <button onClick={() => update({ activeAccount: acc.id })} style={{ ...btn.ghost, fontSize: 11, padding: "5px 10px" }}>Activer</button>
                )}
                {acc.id === (settings.activeAccount || "main") && (
                  <span style={{ fontSize: 11, color: C.teal, fontWeight: 700 }}>✓ Actif</span>
                )}
              </div>
            </div>
          ))}
          <button onClick={() => {
            const name = prompt("Nom du compte (ex: FTMO 100K, Compte perso):");
            const balance = parseFloat(prompt("Solde initial ($):") || "0");
            const type = prompt("Type (perso / prop firm / démo):") || "perso";
            if (name) {
              const newAcc = { id: `acc_${Date.now()}`, name, balance, type };
              const accounts = settings.accounts || [{ id: "main", name: "Compte principal", balance: settings.accountBalance, type: "perso" }];
              update({ accounts: [...accounts, newAcc] });
            }
          }} style={{ ...btn.ghost, fontSize: 12, marginTop: 4 }}>
            <Plus size={13} /> Ajouter un compte
          </button>
        </div>
        <SettingsRow label="Solde du compte actif" sub="Capital en compte (utilisé pour la calculatrice de risque)">
          {editingBalance ? (
            <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <input
                type="number"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                autoFocus
                style={{ ...inputStyle, width: 110 }}
              />
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

        <SettingsRow label="Devise du compte" sub="Devise dans laquelle ton P&L est calculé">
          <select
            value={settings.currency}
            onChange={(e) => update({ currency: e.target.value })}
            style={{ ...inputStyle, width: 90 }}
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </SettingsRow>
      </SettingsSection>

      {/* Broker actif */}
      <SettingsSection title="🏦 Broker actif">
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
      <SettingsSection title="🏷️ Tags personnalisés (PD Arrays)">
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>Tags qui apparaissent dans le formulaire d'ajout de trade (en plus des tags par défaut comme Order Block, FVG, etc.)</div>
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
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 8 }}>Tags par défaut (non modifiables)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TAG_CATALOG.filter((t) => t.category === "setup").map((t) => (
              <span key={t.name} style={{ padding: "3px 9px", borderRadius: 5, background: C.bg, border: `1px solid ${C.border}`, fontSize: 11.5, color: C.textMuted }}>{t.name}</span>
            ))}
          </div>
        </div>
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

function OnboardingScreen({ onDone, onUseMock }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: FONT.base }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <svg width="72" height="72" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: "0 auto 20px", display: "block" }}>
          <rect width="36" height="36" rx="9" fill="url(#obGrad)" />
          <rect x="8" y="14" width="4" height="10" rx="1" fill="#2DD4BF"/>
          <line x1="10" y1="11" x2="10" y2="14" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="10" y1="24" x2="10" y2="27" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
          <rect x="16" y="10" width="4" height="8" rx="1" fill="#F87171"/>
          <line x1="18" y1="7" x2="18" y2="10" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="18" y1="18" x2="18" y2="22" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
          <rect x="24" y="16" width="4" height="7" rx="1" fill="#2DD4BF"/>
          <line x1="26" y1="13" x2="26" y2="16" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="26" y1="23" x2="26" y2="26" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
          <defs><linearGradient id="obGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#8B7CF6"/><stop offset="100%" stopColor="#5B3FE0"/></linearGradient></defs>
        </svg>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: "0 0 10px" }}>Bienvenue sur Edge</h1>
        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: "0 0 32px" }}>Ton journal de trading Forex avec IA Coach intégré, Smart Trade Capture et analyse psychologique.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          {[
            { icon: "📸", title: "Smart Trade Capture", desc: "Upload un screenshot TradingView → l'IA remplit le formulaire automatiquement" },
            { icon: "🤖", title: "IA Coach personnalisé", desc: "Analyse tes patterns sur toute ta période et identifie tes erreurs récurrentes" },
            { icon: "📊", title: "Statistiques ICT complètes", desc: "Win rate par PD Array, profit par session, heatmap calendrier et plus" },
          ].map((f) => (
            <div key={f.title} style={{ padding: "14px 16px", background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, textAlign: "left", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onDone} style={{ ...btn.primary, width: "100%", justifyContent: "center", padding: "13px 20px", fontSize: 14, marginBottom: 10 }}>
          Commencer avec mes trades
        </button>
        <button onClick={onUseMock} style={{ ...btn.ghost, width: "100%", justifyContent: "center", padding: "11px 20px", fontSize: 13 }}>
          Explorer avec les données de démonstration
        </button>
        <p style={{ fontSize: 11, color: C.textMuted, marginTop: 16 }}>Les données restent sur ton appareil tant que Supabase n'est pas configuré.</p>
      </div>
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
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem("onboarding_done"); } catch { return true; }
  });
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("theme") === "dark"; } catch { return false; }
  });
  applyTheme(isDark);
  const toggleTheme = () => setIsDark((v) => {
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

  const openNewTrade = () => { setEditingTrade(null); setView("tradeForm"); };
  const openEditTrade = (trade) => { setEditingTrade(trade); setView("tradeForm"); };
  const openTradeDetail = (id) => { setActiveTradeId(id); setView("tradeDetail"); };
  const setupOptions = useMemo(() => [...new Set(trades.map((t) => t.setup).filter(Boolean))], [trades]);

  // ── Sauvegarder un trade (ajout ou modification) ──
  const saveTrade = async (trade) => {
    const exists = trades.some((t) => t.id === trade.id);
    // Mise à jour optimiste immédiate
    setTrades((prev) => exists ? prev.map((t) => t.id === trade.id ? trade : t) : [trade, ...prev]);
    setActiveTradeId(trade.id);
    setView("tradeDetail");
    showToast(exists ? "Trade mis à jour ✓" : "Trade enregistré ✓");

    // Sauvegarde Supabase en arrière-plan
    try {
      const dbTrade = tradeToDb(trade);
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

  const titles = { dashboard: "Dashboard", trades: "Trade Log", tradeDetail: "Détail du trade", tradeForm: editingTrade ? "Modifier le trade" : "Nouveau trade", stats: "Statistiques", calculator: "Calculatrice", coach: "IA Coach", settings: "Paramètres" };

  if (showOnboarding) {
    return (
      <>
        <GlobalStyle />
        <OnboardingScreen
          onDone={() => {
            try { localStorage.setItem("onboarding_done", "1"); } catch {}
            setShowOnboarding(false);
          }}
          onUseMock={() => {
            try { localStorage.setItem("onboarding_done", "1"); } catch {}
            setShowOnboarding(false);
            setTrades(MOCK_TRADES);
          }}
        />
      </>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FONT.base }}>
      <GlobalStyle />
      <Sidebar view={view} setView={setView} onNewTrade={openNewTrade} />
      <div style={{ flex: 1, minWidth: 0, maxWidth: "100%", display: "flex", flexDirection: "column" }}>
        <TopBar title={titles[view]} onSettings={() => setView("settings")} isDark={isDark} onToggleTheme={toggleTheme} />

        {/* Bannière erreur connexion */}
        {dbError && (
          <div style={{ background: C.redDim, borderBottom: `1px solid ${C.red}44`, padding: "8px 20px", fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 8 }}>
            ⚠️ {dbError}
          </div>
        )}

        <main className="app-main" style={{ flex: 1, minWidth: 0, padding: "22px 26px 120px" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.purple, borderRadius: "50%", animation: "spinSlow 0.8s linear infinite" }} />
              <div style={{ fontSize: 13, color: C.textSecondary }}>Chargement de tes trades…</div>
            </div>
          ) : (
            <div style={{ maxWidth: 1600, margin: "0 auto" }}>
              {view === "dashboard" && <Dashboard trades={trades} onOpenTrade={openTradeDetail} setView={setView} />}
              {view === "trades" && <TradesList trades={trades} onOpen={openTradeDetail} onNew={openNewTrade} onStatusChange={updateTradeStatus} />}
              {view === "tradeDetail" && (
                <TradeDetail trade={trades.find((t) => t.id === activeTradeId)} onBack={() => setView("trades")} onEdit={openEditTrade} onDelete={deleteTrade} onVerdictChange={updateVerdict} />
              )}
              {view === "tradeForm" && (
                <TradeForm initial={editingTrade} setupOptions={setupOptions} appSettings={appSettings} onCancel={() => setView(editingTrade ? "tradeDetail" : "trades")} onSave={saveTrade} />
              )}
              {view === "stats" && <AdvancedStats trades={trades} />}
              {view === "calculator" && <ForexCalculator />}
              {view === "coach" && <AiCoach trades={trades} />}
              {view === "settings" && <SettingsPage settings={appSettings} setSettings={saveSettings} />}
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
