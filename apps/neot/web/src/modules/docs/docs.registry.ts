import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type DocPage = {
  component: LazyExoticComponent<ComponentType>;
  description: string;
  group: string;
  slug: string;
  title: string;
};

const page = (
  slug: string,
  title: string,
  description: string,
  group: string,
  load: () => Promise<{ default: ComponentType }>
): DocPage => ({ component: lazy(load), description, group, slug, title });

export const docsPages = [
  page(
    "architecture",
    "Architecture",
    "Understand the NEOT engineering platform structure.",
    "Foundation",
    () => import("./content/architecture.mdx")
  ),
  page(
    "product-structure",
    "Product structure",
    "Understand product ownership and shared platform boundaries.",
    "Foundation",
    () => import("./content/product-structure.mdx")
  )
] as const;

export function findDocPage(slug: string | null) {
  return docsPages.find((entry) => entry.slug === slug) ?? docsPages[0];
}
