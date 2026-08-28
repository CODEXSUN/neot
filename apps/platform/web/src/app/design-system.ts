import { DESIGN_SYSTEM_NAME, DESIGN_SYSTEM_VARIANT_MARKER } from "@neot/ui/design-system";

export function applyDesignSystemPreference() {
  document.documentElement.setAttribute("data-design-system", DESIGN_SYSTEM_NAME);
  document.documentElement.setAttribute(DESIGN_SYSTEM_VARIANT_MARKER, "default");
}
