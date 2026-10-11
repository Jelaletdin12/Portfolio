// Küçük, three.js içermeyen paylaşılan tipler ve sabitler.
// UI bileşeni bunu statik import eder; ağır olan sahne dosyası ise dinamik yüklenir.

export type ThemeMode = "dark" | "light";

export interface SceneState {
  paletteIndex: number;
  formationIndex: number;
  paused: boolean;
}

// Palet düğmelerinde gösterilen temsilci renkler (sıra, sahnedeki PALETTE_HEX ile aynı olmalı).
export const PALETTE_SWATCHES = ["#d4af37", "#7c5cff", "#ff5a5f", "#27c2d6"] as const;
export const PALETTE_LABELS = ["Gold", "Nebula", "Fire", "Ocean"] as const;

// Süreler (saniye). İlk tasarımın yarısı: 12 sn -> 6 sn, 20 sn -> 10 sn.
export const AUTO_INTERVAL = 6;
export const MANUAL_HOLD = 10;