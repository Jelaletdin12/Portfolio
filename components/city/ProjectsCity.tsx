"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import ProjectsSection from "@/components/projects-section"; // your existing grid, used as the fallback
import { PROJECTS, STOPS } from "@/components/city/data";

const CityStage = dynamic(() => import("@/components/city/CityStage"), { ssr: false });

function canRunCity() {
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return !!gl && !reduce && !saveData;
}

interface Props {
  /** height in px of a fixed header, if your site has one */
  navOffset?: number;
  /** tour length in viewport heights (default 900) */
  scrollLength?: number;
}

export default function ProjectsCity({ navOffset = 0, scrollLength = 900 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"idle" | "city" | "fallback">("idle");

  // mount the 3D scene only when the section is about to enter the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setMode(canRunCity() ? "city" : "fallback");
        io.disconnect();
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div id="projects" ref={ref} style={{ overflowX: "clip" }}>
      {mode === "city" && <CityStage navOffset={navOffset} scrollLength={scrollLength} onUnsupported={() => setMode("fallback")} />}
      {/* {mode === "fallback" && <ProjectsSection />} */}
      {mode === "idle" && <div style={{ minHeight: `${scrollLength}vh` }} />}

      {/* crawlable, screen-reader friendly list of the same projects while the canvas is shown */}
      {mode !== "fallback" && (
        <div className="sr-only">
          <h2>Featured Projects</h2>
          {STOPS.filter((s) => s.ids).map((s) => (
            <section key={s.label}>
              <h3>{s.title}</h3>
              <ul>
                {s.ids!.map((id) => (
                  <li key={id}>
                    {PROJECTS[id].live ? <a href={PROJECTS[id].live}>{PROJECTS[id].name}</a> : PROJECTS[id].name}
                    {" – "}
                    {PROJECTS[id].desc} ({PROJECTS[id].tech.join(", ")})
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}