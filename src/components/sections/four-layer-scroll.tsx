"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/components/language-provider";

function buildCopy(isEn: boolean) {
  return {
    kicker: isEn ? "How we engage" : "Come ingaggiamo",
    heading: isEn
      ? "Four ways AI shows up in your business"
      : "Quattro modi in cui l'AI entra nella vostra azienda",
    srSummary: isEn
      ? "This section walks through the four ways we typically engage on AI work. As you scroll, the diagram on the right shifts to show how AI moves from helping the team you already have, all the way through to becoming part of the product itself."
      : "Questa sezione descrive i quattro modi in cui ingaggiamo. Lo schema a destra mostra come l'AI passi dall'aiutare il team esistente fino a diventare parte del prodotto.",
    layers: [
      {
        key: "augmentation",
        title: isEn ? "Augmentation" : "Augmentation",
        desc: isEn
          ? "Your team, just faster. Copilot rollouts, licence choices, usage policies, training, and a way to tell whether people are actually using the thing. Helps the team you already have do their job better, without changing what the job is."
          : "Il vostro team, solo piÃ¹ veloce. Rollout di copilot, scelta delle licenze, policy d'uso, training e visibilitÃ  reale sull'adozione.",
        aria: isEn
          ? "A person with a chat assistant beside them, representing copilot-style augmentation of an existing team."
          : "Una persona con un assistente chat accanto.",
      },
      {
        key: "workflow",
        title: isEn ? "Workflow Automation" : "Workflow Automation",
        desc: isEn
          ? "A process, taken off your team's plate. AI and tooling stitched together to run multi-step work from start to finish, without someone having to babysit every handoff."
          : "Un processo tolto dal piatto del team. AI e tooling cuciti insieme per gestire lavori multi-step end-to-end.",
        aria: isEn
          ? "A directed graph of five nodes connected by arrows, with a sequential pulse of activity flowing through them."
          : "Un grafo diretto di cinque nodi con un impulso sequenziale.",
      },
      {
        key: "agentic",
        title: isEn ? "Agentic Systems" : "Sistemi Agentic",
        desc: isEn
          ? "Autonomy, kept on a leash. Agents that can plan, act, and correct themselves inside a defined boundary. Every action is logged, so when something goes sideways you can actually see why."
          : "Autonomia, ma con un guinzaglio. Agenti che pianificano, agiscono e si autocorreggono dentro confini definiti.",
        aria: isEn
          ? "The same node graph, enclosed in a dashed guardrail boundary, with one arrow looping back as a self-correction edge."
          : "Lo stesso grafo, racchiuso in un confine tratteggiato di guardrail con un arco di self-correction.",
      },
      {
        key: "product",
        title: isEn ? "Reimagined Products" : "Prodotti Reinventati",
        desc: isEn
          ? "AI as part of the product itself, not a chat box bolted on the side. Built into your stack, running under the same controls as everything else you ship."
          : "L'AI come parte del prodotto, non un chatbot incollato di lato. Integrata nello stack, sotto gli stessi controlli del resto.",
        aria: isEn
          ? "A clean stylised product window with a primary action button labelled Generate."
          : "Una finestra di prodotto stilizzata con un bottone Generate.",
      },
    ],
  };
}

/* Shared diagram styling */
const accentStroke = "hsl(var(--accent))";
const ruleStroke = "hsl(var(--rule))";
const inkStroke = "hsl(var(--ink))";
const inkMute = "hsl(var(--ink-mute))";

/** Layer 01. Augmentation. */
function Diagram1({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-full" aria-hidden="true">
      <g stroke={inkStroke} strokeWidth="1.25" fill="none">
        <circle cx="30" cy="42" r="9" />
        <path d="M21 58 Q30 51 39 58 L39 78 Q30 84 21 78 Z" />
      </g>
      <path
        d="M48 60 L72 60"
        stroke={inkMute}
        strokeWidth="1"
        strokeDasharray="2,3"
      />
      <g>
        <rect
          x="78"
          y="28"
          width="108"
          height="64"
          rx="6"
          fill="none"
          stroke={ruleStroke}
          strokeWidth="1"
        />
        <line x1="88" y1="44" x2="142" y2="44" stroke={inkMute} strokeWidth="1" />
        <line
          x1="88"
          y1="54"
          x2="158"
          y2="54"
          stroke={inkMute}
          strokeWidth="1"
          opacity="0.7"
        />
        <line
          x1="88"
          y1="64"
          x2="130"
          y2="64"
          stroke={inkMute}
          strokeWidth="1"
          opacity="0.7"
        />
        <line
          x1="88"
          y1="74"
          x2="150"
          y2="74"
          stroke={inkMute}
          strokeWidth="1"
          opacity="0.5"
        />
        {animated && (
          <motion.line
            x1="88"
            y1="44"
            x2="142"
            y2="44"
            stroke={accentStroke}
            strokeWidth="1.4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 1, 0] }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.4, 0.7, 1],
            }}
          />
        )}
        <g transform="translate(168, 38)">
          <path
            d="M0 -4 L1.4 -1.4 L4 0 L1.4 1.4 L0 4 L-1.4 1.4 L-4 0 L-1.4 -1.4 Z"
            fill={accentStroke}
          />
        </g>
      </g>
    </svg>
  );
}

/** Layer 02. Workflow. */
function Diagram2({ animated }: { animated: boolean }) {
  const nodes = [
    { x: 24, y: 60 },
    { x: 64, y: 36 },
    { x: 104, y: 60 },
    { x: 144, y: 36 },
    { x: 184, y: 60 },
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
  ];
  return (
    <svg viewBox="0 0 200 120" className="w-full h-full" aria-hidden="true">
      <g stroke={ruleStroke} strokeWidth="1" fill="none">
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
          />
        ))}
      </g>
      {animated &&
        edges.map(([a, b], i) => (
          <motion.circle
            key={`p${i}`}
            r="2"
            fill={accentStroke}
            initial={{ cx: nodes[a].x, cy: nodes[a].y, opacity: 0 }}
            animate={{
              cx: [nodes[a].x, nodes[b].x],
              cy: [nodes[a].y, nodes[b].y],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 0.8,
              delay: i * 0.7,
              repeat: Infinity,
              repeatDelay: 2.4,
              ease: "easeInOut",
            }}
          />
        ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.x}
            cy={n.y}
            r="6"
            fill="hsl(var(--bg))"
            stroke={inkStroke}
            strokeWidth="1.25"
          />
        </g>
      ))}
    </svg>
  );
}

/** Layer 03. Agentic. */
function Diagram3({ animated }: { animated: boolean }) {
  const nodes = [
    { x: 40, y: 60 },
    { x: 80, y: 38 },
    { x: 120, y: 60 },
    { x: 160, y: 38 },
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
  ];
  const loopPath = `M ${nodes[3].x} ${nodes[3].y + 6} C ${nodes[3].x + 14} ${nodes[3].y + 26}, ${nodes[0].x - 14} ${nodes[0].y + 26}, ${nodes[0].x} ${nodes[0].y + 6}`;
  return (
    <svg viewBox="0 0 200 120" className="w-full h-full" aria-hidden="true">
      <rect
        x="14"
        y="14"
        width="172"
        height="92"
        rx="8"
        fill="none"
        stroke={ruleStroke}
        strokeWidth="1"
        strokeDasharray="3,3"
      />
      <text
        x="22"
        y="26"
        fill={inkMute}
        fontSize="7"
        fontFamily="var(--font-jbm), ui-monospace, monospace"
        letterSpacing="0.06em"
      >
        GUARDRAILS
      </text>
      <g stroke={ruleStroke} strokeWidth="1" fill="none">
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
          />
        ))}
      </g>
      <path
        d={loopPath}
        stroke={accentStroke}
        strokeWidth="1.2"
        fill="none"
        markerEnd="url(#arrow-accent)"
      />
      <defs>
        <marker
          id="arrow-accent"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 z" fill={accentStroke} />
        </marker>
      </defs>
      {animated && (
        <motion.circle
          r="2.5"
          fill={accentStroke}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <animateMotion dur="2.2s" repeatCount="indefinite" path={loopPath} />
        </motion.circle>
      )}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r="6"
          fill="hsl(var(--bg))"
          stroke={inkStroke}
          strokeWidth="1.25"
        />
      ))}
    </svg>
  );
}

/** Layer 04. Product. */
function Diagram4({ animated }: { animated: boolean }) {
  return (
    <svg viewBox="0 0 200 120" className="w-full h-full" aria-hidden="true">
      <rect
        x="14"
        y="18"
        width="172"
        height="86"
        rx="6"
        fill="hsl(var(--surface))"
        stroke={ruleStroke}
        strokeWidth="1"
      />
      <line x1="14" y1="30" x2="186" y2="30" stroke={ruleStroke} strokeWidth="1" />
      <circle cx="22" cy="24" r="1.5" fill={inkMute} opacity="0.55" />
      <circle cx="28" cy="24" r="1.5" fill={inkMute} opacity="0.55" />
      <circle cx="34" cy="24" r="1.5" fill={inkMute} opacity="0.55" />
      <line
        x1="22"
        y1="42"
        x2="120"
        y2="42"
        stroke={inkMute}
        strokeWidth="1"
        opacity="0.5"
      />
      <line
        x1="22"
        y1="52"
        x2="172"
        y2="52"
        stroke={inkMute}
        strokeWidth="1"
        opacity="0.35"
      />
      <line
        x1="22"
        y1="62"
        x2="100"
        y2="62"
        stroke={inkMute}
        strokeWidth="1"
        opacity="0.35"
      />
      <rect x="22" y="76" width="78" height="20" rx="4" fill={accentStroke} />
      <path
        d="M30 86 L35 86 M32.5 83.5 L32.5 88.5"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <text
        x="42"
        y="89.5"
        fontSize="7"
        fontFamily="var(--font-switzer), sans-serif"
        fill="hsl(var(--primary-foreground))"
      >
        Generate
      </text>
      {animated && (
        <motion.rect
          x="22"
          y="76"
          width="78"
          height="20"
          rx="4"
          fill="none"
          stroke={accentStroke}
          strokeWidth="1.2"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0], scale: [1, 1.06, 1.1] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeOut",
            repeatDelay: 1.4,
          }}
          style={{ originX: 0.305, originY: 0.717 }}
        />
      )}
    </svg>
  );
}

const DIAGRAMS = [Diagram1, Diagram2, Diagram3, Diagram4];

/**
 * FourLayerScroll â€” four-card grid that maps the four layers of AI
 * engagement (augmentation â†’ workflow â†’ agentic â†’ embedded product) with a
 * brass ignition scan-line on enter.
 */
export default function FourLayerScroll() {
  const reduce = useReducedMotion() ?? false;
  const { language } = useLanguage();
  const COPY = buildCopy(language === "en");

  return (
    <section
      className="section-lg px-4 sm:px-6 lg:px-8"
      aria-label={COPY.heading}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 mb-12 sm:mb-16 max-w-2xl">
          <span
            aria-hidden="true"
            className="block h-px w-16 origin-left"
            style={{ background: "hsl(var(--accent))" }}
          />
          <p className="eyebrow inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "hsl(var(--accent))" }}
            />
            {COPY.kicker}
          </p>
          <h2 className="heading-2 text-ink">{COPY.heading}</h2>
        </div>

        <p className="sr-only">{COPY.srSummary}</p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={{ hidden: {}, visible: {} }}
          className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-rule/60 border border-rule rounded-lg overflow-hidden"
        >
          <motion.span
            aria-hidden="true"
            className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent))] to-transparent origin-left z-10 pointer-events-none"
            variants={{
              hidden: { scaleX: 0, opacity: 0 },
              visible: reduce
                ? { scaleX: 1, opacity: 0.6 }
                : {
                    scaleX: [0, 1, 1],
                    opacity: [0, 0.9, 0],
                    transition: {
                      duration: 1.6,
                      times: [0, 0.7, 1],
                      ease: [0.16, 1, 0.3, 1],
                    },
                  },
            }}
          />

          {COPY.layers.map((layer, i) => {
            const Diagram = DIAGRAMS[i];
            const cellDelay = reduce ? 0 : 0.18 + i * 0.22;
            return (
              <motion.article
                key={layer.key}
                role="group"
                aria-label={layer.aria}
                variants={{
                  hidden: { opacity: 0, clipPath: "inset(0 100% 0 0)" },
                  visible: {
                    opacity: 1,
                    clipPath: "inset(0 0% 0 0)",
                    transition: {
                      duration: 0.65,
                      delay: cellDelay,
                      ease: [0.16, 1, 0.3, 1],
                    },
                  },
                }}
                className="group relative bg-bg p-5 sm:p-6 flex flex-col gap-4 hover:bg-surface transition-colors duration-300"
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className="font-mono text-[11px] tracking-[0.14em] uppercase"
                    style={{ color: "hsl(var(--accent))" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-px flex-1"
                    style={{
                      background:
                        "linear-gradient(90deg, hsl(var(--rule)) 0%, hsl(var(--rule)) 60%, transparent 100%)",
                    }}
                  />
                </div>

                <div className="aspect-[5/3] w-full">
                  <Diagram animated={!reduce} />
                </div>

                <h3 className="font-display text-2xl leading-tight text-ink">
                  {layer.title}
                </h3>

                <p className="text-sm text-ink-mute leading-relaxed">
                  {layer.desc}
                </p>

                <span
                  aria-hidden="true"
                  className="absolute left-5 right-5 sm:left-6 sm:right-6 bottom-0 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ background: "hsl(var(--accent))" }}
                />
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
