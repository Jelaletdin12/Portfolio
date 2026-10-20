"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createCity, type CityHandle, type CityState } from "./createCity";
import { EMAIL, PROJECTS, STOPS } from "./data";
import s from "./city.module.css";

interface Props {
  /** height in px of a fixed site header, so the sticky stage sits below it */
  navOffset?: number;
  /** length of the whole tour in viewport heights. More = slower car per scroll. Default 900 */
  scrollLength?: number;
  /** called when WebGL is unavailable, so the parent can show its fallback */
  onUnsupported?: () => void;
}

const INITIAL: CityState = { active: -1, next: 0, pct: 0, dir: 1, turning: false, visited: 0, fill: 0, started: false };
const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(" ");
const pad2 = (n: number) => (n < 10 ? "0" + n : "" + n);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

function StopPanel({ index }: { index: number }) {
  const stop = STOPS[index];
  const [open, setOpen] = useState(0);
  const [copied, setCopied] = useState(false);
  const desktop = () => window.matchMedia("(min-width: 861px)").matches;

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked: the address stays selectable below the buttons */
    }
  };

  const kicker = (
    <p className={s.kicker}>
      <i />
      Stop {index + 1} of {STOPS.length} · {stop.place}
    </p>
  );

  if (stop.cta) {
    return (
      <div className={cx(s.panelIn, s.cta)}>
        {kicker}
        <h3 className={s.ptitle}>{stop.title}</h3>
        <p className={s.lede}>{stop.lede}</p>
        <div className={s.actions}>
          <a className={cx(s.btn, s.gold)} href="#contact">Get in Touch</a>
          <button type="button" className={cx(s.btn, s.ghost)} onClick={copyEmail}>{copied ? "Copied" : "Copy email"}</button>
        </div>
        <p className={s.mailrow}>{EMAIL}</p>
      </div>
    );
  }

  const ids = stop.ids ?? [];
  return (
    <div className={s.panelIn}>
      {kicker}
      <div className={s.trow}>
        <h3 className={s.ptitle}>{stop.title}</h3>
        <span className={s.count}>{ids.length} projects</span>
      </div>
      <p className={s.lede}>{stop.lede}</p>
      <ul className={s.projects}>
        {ids.map((id, i) => {
          const p = PROJECTS[id];
          const isOpen = open === i;
          return (
            <li key={id} className={s.proj} data-open={isOpen} onMouseEnter={() => desktop() && setOpen(i)}>
              <button type="button" className={s.projHead} aria-expanded={isOpen} onClick={() => setOpen(i)}>
                <span className={s.num}>{pad2(i + 1)}</span>
                <span className={s.pt}>
                  <span>{p.name}</span>
                  {p.sub && <span className={s.sub}>{p.sub}</span>}
                </span>
                <span className={s.chev} aria-hidden="true" />
              </button>
              <div className={s.projBody}>
                <div className={s.projIn}>
                  <p className={s.desc}>{p.desc}</p>
                  <div className={s.row}>
                    <ul className={s.tags}>
                      {p.tech.slice(0, 4).map((t) => <li key={t} className={s.tag}>{t}</li>)}
                      {p.tech.length > 4 && <li className={cx(s.tag, s.more)}>+{p.tech.length - 4}</li>}
                    </ul>
                    {p.live && (
                      <a className={s.live} href={p.live} target="_blank" rel="noopener noreferrer">
                        Live demo <ArrowIcon />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TransitPanel({ next, pct }: { next: number; pct: number }) {
  const n = STOPS[next];
  return (
    <div className={s.panelIn}>
      <p className={s.kicker}>
        <i />
        <span>In transit · {pct}%</span>
      </p>
      <h3 className={s.ptitle}>Next: {n.place}</h3>
      <p className={s.lede}>{n.cta ? "Say hello" : `${n.title} · ${n.ids?.length ?? 0} projects`}</p>
    </div>
  );
}

export default function CityStage({ navOffset = 0, scrollLength = 900, onUnsupported }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const pinRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cityRef = useRef<CityHandle | null>(null);
  const [cs, setCs] = useState<CityState>(INITIAL);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    const host = hostRef.current, stage = stageRef.current, track = trackRef.current, panel = panelRef.current;
    if (!host || !stage || !track || !panel) return;
    const city = createCity({
      host, stage, track, panel,
      pins: pinRefs.current.filter((p): p is HTMLDivElement => !!p),
      stops: STOPS,
      onState: setCs,
    });
    if (!city) { onUnsupported?.(); return; }
    cityRef.current = city;
    return () => { city.destroy(); cityRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* auto tour: scroll the page forward; any user input stops it */
  useEffect(() => {
    if (!auto) return;
    let raf = 0, last = performance.now();
    const stop = () => setAuto(false);
    const step = (ts: number) => {
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      const r = trackRef.current!.getBoundingClientRect();
      const range = Math.max(1, r.height - window.innerHeight);
      if (-r.top >= range - 1) { setAuto(false); return; }
      /* 'instant' so the site's html { scroll-behavior: smooth } does not smooth every frame */
      window.scrollBy({ top: (range / 38) * dt, behavior: "instant" as ScrollBehavior });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const opts = { passive: true } as const;
    window.addEventListener("wheel", stop, opts);
    window.addEventListener("touchstart", stop, opts);
    window.addEventListener("keydown", stop, opts);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [auto]);

  const toggleAuto = () => {
    if (!auto && trackRef.current) {
      const r = trackRef.current.getBoundingClientRect();
      if (-r.top >= r.height - window.innerHeight - 2) window.scrollTo({ top: window.pageYOffset + r.top, behavior: "auto" });
    }
    setAuto((a) => !a);
  };

  const style = { "--city-nav": `${navOffset}px`, "--city-track": `${scrollLength}vh` } as CSSProperties;

  return (
    <div ref={trackRef} className={s.track} style={style}>
      <div ref={stageRef} className={s.stage}>
        <div ref={hostRef} className={s.canvas} role="img" aria-label="Interactive 3D city. Scroll to drive the car between project districts." />
        <div className={s.vignette} />
        <div className={s.pins} aria-hidden="true">
          {STOPS.map((st, i) => (
            <div key={st.place} ref={(el) => { pinRefs.current[i] = el; }} className={s.pin}>
              <b className={s.pinNum}>{i + 1}</b>
              <span>{st.place}</span>
            </div>
          ))}
        </div>

        <div className={s.ui}>
          <header className={s.bar}>
            <div className={s.brand}>
              <span className={s.mark}>J</span>
              <span>Jelaletdin</span>
              <span className={s.sep}>/</span>
              <span className={s.dim}>Projects</span>
            </div>
            <div className={s.hud}>
              <span className={s.pill}><b>{cs.pct}</b>%</span>
              <button type="button" className={cx(s.btn, auto ? s.ghost : s.gold)} onClick={toggleAuto}>
                {auto ? "Pause" : "Auto tour"}
              </button>
            </div>
          </header>

          <div className={cx(s.intro, cs.started && s.gone)}>
            <p className={s.eyebrow}>15 projects · 6 districts</p>
            <h2 className={s.title}>Featured <span className={s.grad}>Projects</span></h2>
            <p className={s.lead}>A showcase of innovative solutions that demonstrate technical excellence and creative problem-solving.</p>
            <span className={s.hint}><i />Scroll to drive</span>
          </div>

          <aside ref={panelRef} className={s.panel} aria-live="polite">
            {cs.active >= 0
              ? <StopPanel key={"s" + cs.active} index={cs.active} />
              : <TransitPanel key={"t" + cs.next} next={cs.next} pct={cs.pct} />}
          </aside>

          <nav className={s.timeline} aria-label="Project districts">
            <ol style={{ "--rp": cs.fill } as CSSProperties}>
              {STOPS.map((st, i) => (
                <li key={st.label}>
                  <button
                    type="button"
                    className={s.tlBtn}
                    data-done={i < cs.visited}
                    aria-current={cs.active === i ? "true" : undefined}
                    aria-label={`Go to ${st.place}, ${st.label}`}
                    onClick={() => { setAuto(false); cityRef.current?.goTo(i); }}
                  >
                    <span className={s.tlDot}>{i + 1}</span>
                    <span className={s.tlLab}>{st.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>
    </div>
  );
}