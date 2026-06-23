export type MaterialType =
  | "matte_clay"
  | "glossy_ceramic"
  | "brushed_chrome"
  | "frosted_glass"
  | "dark_cyber";

export type EyeExpression =
  | "neutral"
  | "happy"
  | "thinking"
  | "wink"
  | "blink";

export type ActiveAnimation =
  | "float"
  | "breathe"
  | "wave"
  | "spin_once"
  | "spin_360"
  | "none";

export interface LightingConfig {
  intensity: number;
  direction: "top_left" | "top_right" | "frontal" | "dramatic";
}
