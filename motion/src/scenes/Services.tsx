/** 10 · WHAT WE DO — the four practice areas, over the rack the camera has just reached. */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, prog } from "../anim";
import { GlassCard } from "../ui/GlassCard";
import { CutFlash } from "../ui/Fx";
import { Eyebrow } from "../ui/Type";

const SERVICES = [
  { n: "01", title: "Custom Software & Platforms", line: "Custom software built around how your business works." },
  { n: "02", title: "Workflow Automation", line: "Automate the work nobody should still do by hand." },
  { n: "03", title: "AI Features & Reliability", line: "Make AI features reliable enough to depend on." },
  { n: "04", title: "Technical Audits & Architecture", line: "Find what should not be built, before code becomes debt." },
];

export const Services: React.FC = () => {
  const frame = useCurrentFrame();
  const veil = prog(frame, 0, 22, EASE.soft);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <CutFlash strength={0.55} streak={false} tail={2.6} />
      {/* the corridor stays alive behind, just dimmed enough to read the cards */}
      <AbsoluteFill style={{ background: "rgba(3,7,14,0.42)", opacity: veil }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 118, display: "flex", justifyContent: "center" }}>
        <Eyebrow text="What we do" start={2} dot={false} />
      </div>
      <div style={{ position: "absolute", inset: 0, perspective: 1500, perspectiveOrigin: "50% 45%" }}>
        <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", display: "flex", alignItems: "center", justifyContent: "center", gap: 30 }}>
          {SERVICES.map((sv, i) => (
            <GlassCard key={sv.n} number={sv.n} title={sv.title} line={sv.line} start={2 + i * 5} width={352} height={430} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};