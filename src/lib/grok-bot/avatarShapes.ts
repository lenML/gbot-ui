export const PRODUCT_AVATAR_SHAPES = [
  "blob",
  "pebble",
  "squircle",
  "tablet",
  "wedge",
  "hex",
  "cloud",
  "teardrop",
] as const;

export type ProductAvatarShape = (typeof PRODUCT_AVATAR_SHAPES)[number];
export type LegacyAvatarShape =
  | "grok"
  | "circle"
  | "square"
  | "triangle"
  | "hexagon";
export type AvatarShape = ProductAvatarShape | LegacyAvatarShape;

export const AVATAR_SHAPE_ALIASES: Record<LegacyAvatarShape, ProductAvatarShape> = {
  grok: "blob",
  circle: "blob",
  square: "squircle",
  triangle: "wedge",
  hexagon: "hex",
};
