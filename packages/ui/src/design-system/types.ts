export type DesignSystemVariantId =
  | "default"
  | "compact"
  | "clear"
  | "shadcn"
  | "neutral"
  | "orange"
  | "green"
  | "blue"
  | "purple"
  | "graphite";

export type DesignSystemVariant = {
  id: DesignSystemVariantId;
  name: string;
  description: string;
  marker: string;
  radius: string;
  density: string;
  palette: string[];
};
