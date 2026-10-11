"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Shuffle } from "lucide-react";
import {
  PALETTE_LABELS,
  PALETTE_SWATCHES,
  type SceneState,
  type ThemeMode,
} from "../neural-network-config";
// Ağır olan three.js sahnesi yalnızca tip olarak import edilir; çalışma zamanında dinamik yüklenir.
import type { NeuralNetworkScene } from "./neural-network-scene";

/* -------------------------------------------------------------------------- */
/*  Tema algılama                                                              */
/* -------------------------------------------------------------------------- */

function backgroundLuminance(): number | null {
  try {
    const bg = getComputedStyle(document.body).backgroundColor;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1, 1);
    // Dizi destructuring yerine indeks: eski "target" ayarlarında ImageDataArray üzerinde iterasyon hata verir.
    const px = ctx.getImageData(0, 0, 1, 1).data;
    if (px[3] < 10) return null; // saydam arka plan
    return (0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2]) / 255;
  } catch {
    return null;
  }
}

/**
 * Sırayla: <html class="dark|light">, data-theme, body arka plan parlaklığı,
 * en sonda sistem tercihi.
 */
function readThemeMode(): ThemeMode {
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  const attr = root.dataset.theme;
  if (attr === "dark" || attr === "light") return attr;
  const lum = backgroundLuminance();
  if (lum !== null) return lum < 0.5 ? "dark" : "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const update = () => setMode(readThemeMode());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

  return mode;
}

/* -------------------------------------------------------------------------- */
/*  Bileşen                                                                    */
/* -------------------------------------------------------------------------- */

type Status = "loading" | "ready" | "failed";

interface Props {
  className?: string;
  /** Verilirse otomatik tema algılama devre dışı kalır. */
  mode?: ThemeMode;
}

const INITIAL_STATE: SceneState = { paletteIndex: 0, formationIndex: 0, paused: false };

// Kenarları yumuşatır; küre kutunun kenarında sert kesilmez.
const EDGE_MASK = "radial-gradient(closest-side, #000 82%, transparent 100%)";

export default function NeuralNetworkVisual({ className, mode: forcedMode }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<NeuralNetworkScene | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [ui, setUi] = useState<SceneState>(INITIAL_STATE);

  const detectedMode = useThemeMode();
  const mode = forcedMode ?? detectedMode;

  // Sahneyi kur / yık
  useEffect(() => {
    let cancelled = false;
    let scene: NeuralNetworkScene | null = null;

    (async () => {
      try {
        const { NeuralNetworkScene } = await import("./neural-network-scene");
        const mount = mountRef.current;
        if (cancelled || !mount) return;

        scene = new NeuralNetworkScene({
          container: mount,
          mode: forcedMode ?? readThemeMode(),
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
          onStateChange: setUi,
        });
        sceneRef.current = scene;
        setUi(scene.getState());
        setStatus("ready");
      } catch (err) {
        // WebGL yok ya da bağlam oluşturulamadı: fallback monogram kalır.
        if (!cancelled) setStatus("failed");
        if (process.env.NODE_ENV !== "production") console.warn("NeuralNetwork:", err);
      }
    })();

    return () => {
      cancelled = true;
      scene?.dispose();
      sceneRef.current = null;
    };
    // forcedMode yalnızca başlangıç değeri için okunur; değişimi aşağıdaki effect yönetir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tema değişince sahneye bildir
  useEffect(() => {
    sceneRef.current?.setMode(mode);
  }, [mode, status]);

  const onMorph = useCallback(() => sceneRef.current?.morph(), []);
  const onPause = useCallback(() => sceneRef.current?.togglePause(), []);
  const onReset = useCallback(() => sceneRef.current?.resetCamera(), []);
  const onPalette = useCallback((i: number) => sceneRef.current?.selectPalette(i), []);

  return (
    <div className={`flex w-full flex-col items-center gap-5 ${className ?? ""}`}>
      <div
        role="img"
        aria-label="Interactive neural network animation"
        className="relative aspect-square w-full max-w-[420px] sm:max-w-[520px] lg:max-w-[560px]"
        style={{ WebkitMaskImage: EDGE_MASK, maskImage: EDGE_MASK }}
      >
        <div ref={mountRef} className="absolute inset-0" />

        {/* Yalnızca WebGL gerçekten kurulamadıysa gösterilir; yüklenirken boş kalır. */}
        {status === "failed" && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <span className="text-gradient select-none text-6xl font-bold md:text-7xl">
              J_CH
            </span>
          </div>
        )}
      </div>

      {/* Yer ayrılı kalır; hazır olunca görünür (yerleşim kaymasın) */}
      {/* {status !== "failed" && (
        <div
          role="toolbar"
          aria-label="Animation controls"
          className={`glass-card flex items-center gap-1 rounded-full px-2 py-1.5 transition-opacity duration-500 sm:gap-2 sm:px-3 ${
            status === "ready" ? "opacity-100" : "invisible opacity-0"
          }`}
        >
          <div className="flex items-center gap-1.5 pr-1 sm:pr-2" role="group" aria-label="Color theme">
            {PALETTE_SWATCHES.map((color, i) => {
              const active = ui.paletteIndex === i;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`${PALETTE_LABELS[i]} colors`}
                  aria-pressed={active}
                  onClick={() => onPalette(i)}
                  style={{ background: color }}
                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground ${
                    active
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                      : ""
                  }`}
                />
              );
            })}
          </div>

          <span className="h-5 w-px bg-border" aria-hidden="true" />

          <ControlButton label="Morph" onClick={onMorph}>
            <Shuffle className="h-4 w-4" />
          </ControlButton>
          <ControlButton label={ui.paused ? "Play" : "Freeze"} onClick={onPause} pressed={ui.paused}>
            {ui.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </ControlButton>
          <ControlButton label="Reset" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </ControlButton>
        </div>
      )} */}
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium uppercase tracking-wide text-foreground/80 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}