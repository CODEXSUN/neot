import { MDXProvider } from "@mdx-js/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  ChevronRightIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  XIcon
} from "lucide-react";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef
} from "react";
import { docsPages, findDocPage, type DocPage } from "./docs.registry";

export function DocsWorkspace() {
  const [selectedSlug, setSelectedSlug] = useState(currentPageSlug);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState("");
  const articleRef = useRef<HTMLElement>(null);
  const selected = findDocPage(selectedSlug);
  const groups = useMemo(() => groupPages(search), [search]);
  const Content = selected.component;
  const { nextPage, previousPage } = adjacentPages(selected.slug);

  useEffect(() => {
    const restorePage = () => setSelectedSlug(currentPageSlug());
    window.addEventListener("popstate", restorePage);
    return () => window.removeEventListener("popstate", restorePage);
  }, []);
  useEffect(() => {
    window.dispatchEvent(new Event("neot:honey-documentation-anchor-ready"));
  }, [drawerOpen]);

  const selectPage = (slug: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", slug);
    window.history.pushState({}, "", url);
    setSelectedSlug(slug);
    articleRef.current?.scrollTo({ behavior: "smooth", top: 0 });
    if (window.matchMedia("(max-width: 1023px)").matches) setDrawerOpen(false);
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  return (
    <main
      className={`relative grid min-h-full transition-[grid-template-columns] duration-200 ${drawerOpen ? "lg:grid-cols-[17rem_minmax(0,1fr)]" : "lg:grid-cols-[0_minmax(0,1fr)]"}`}
    >
      {drawerOpen ? (
        <button
          aria-label="Close documentation navigation"
          className="absolute inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          type="button"
        />
      ) : null}
      <aside
        aria-hidden={!drawerOpen}
        className={`absolute inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r bg-background px-4 py-6 transition-transform duration-200 lg:sticky lg:top-0 lg:h-[calc(100vh-4rem)] lg:w-auto ${drawerOpen ? "visible translate-x-0" : "invisible pointer-events-none -translate-x-full"}`}
      >
        <div className="flex items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <BookOpenIcon className="size-4" />
          </span>
          <div>
            <h1 className="font-semibold">Documentation</h1>
            <p className="text-xs text-muted-foreground">NEOT guides</p>
          </div>
          <button
            aria-label="Close documentation navigation"
            className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setDrawerOpen(false)}
            type="button"
          >
            <XIcon className="size-4 lg:hidden" />
            <PanelLeftCloseIcon className="hidden size-4 lg:block" />
          </button>
        </div>
        <div aria-hidden="true" className="h-28" data-honey-documentation-anchor />
        <label className="mt-5 flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
          <SearchIcon className="size-4 text-muted-foreground" />
          <span className="sr-only">Search documentation</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search docs"
            value={search}
          />
        </label>
        <nav aria-label="Documentation pages" className="pt-5">
          {groups.map(([group, pages]) => (
            <section className="pb-5" key={group}>
              <h2>
                <button
                  aria-expanded={!collapsedGroups.has(group)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  onClick={() => toggleGroup(group)}
                  type="button"
                >
                  <span>{group}</span>
                  <ChevronRightIcon
                    className={`size-4 shrink-0 transition-transform ${collapsedGroups.has(group) ? "" : "rotate-90"}`}
                  />
                </button>
              </h2>
              {!collapsedGroups.has(group) ? (
                <ul className="ml-2 mt-1 border-l pl-3">
                  {pages.map((page) => (
                    <li key={page.slug}>
                      <button
                        className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm ${selected.slug === page.slug ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
                        onClick={() => selectPage(page.slug)}
                        type="button"
                      >
                        {page.title}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </nav>
      </aside>
      <article className="min-w-0 overflow-y-auto px-6 py-9 lg:px-12 xl:px-16" ref={articleRef}>
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-center gap-3 pb-5">
            {!drawerOpen ? (
              <button
                aria-label="Open documentation navigation"
                className="grid size-9 shrink-0 place-items-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setDrawerOpen(true)}
                type="button"
              >
                <PanelLeftOpenIcon className="size-4" />
              </button>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Docs / {selected.group} / {selected.title}
            </p>
          </div>
          <MDXProvider components={mdxComponents}>
            <Suspense
              fallback={<p className="text-sm text-muted-foreground">Loading documentation…</p>}
            >
              <Content />
            </Suspense>
          </MDXProvider>
          <PageNavigation nextPage={nextPage} onSelect={selectPage} previousPage={previousPage} />
          <footer className="mt-12 border-t pt-5 text-sm text-muted-foreground">
            Edit the MDX source in <code>apps/neot/web/src/modules/docs/content</code>.
          </footer>
        </div>
      </article>
    </main>
  );
}

function PageNavigation({
  nextPage,
  onSelect,
  previousPage
}: {
  nextPage: DocPage | undefined;
  onSelect: (slug: string) => void;
  previousPage: DocPage | undefined;
}) {
  if (!previousPage && !nextPage) return null;

  return (
    <nav
      aria-label="Documentation page navigation"
      className="mt-12 grid gap-3 border-t pt-6 sm:grid-cols-2"
    >
      {previousPage ? (
        <button
          className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left hover:bg-muted/60"
          onClick={() => onSelect(previousPage.slug)}
          type="button"
        >
          <ArrowLeftIcon className="size-4 shrink-0 text-muted-foreground" />
          <span>
            <span className="block text-xs text-muted-foreground">Previous</span>
            <span className="font-medium">{previousPage.title}</span>
          </span>
        </button>
      ) : (
        <span />
      )}
      {nextPage ? (
        <button
          className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left hover:bg-muted/60"
          onClick={() => onSelect(nextPage.slug)}
          type="button"
        >
          <span>
            <span className="block text-xs text-muted-foreground">Next</span>
            <span className="font-medium">{nextPage.title}</span>
          </span>
          <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      ) : null}
    </nav>
  );
}

function currentPageSlug() {
  return new URLSearchParams(window.location.search).get("page");
}

function adjacentPages(slug: string) {
  const index = docsPages.findIndex((page) => page.slug === slug);
  return {
    nextPage: docsPages[index + 1],
    previousPage: index > 0 ? docsPages[index - 1] : undefined
  };
}

const mdxComponents = {
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1 className="text-4xl font-semibold tracking-tight" {...props} />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="border-b pb-2 pt-10 text-2xl font-semibold tracking-tight" {...props} />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="pt-8 text-xl font-semibold" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="pt-4 text-base leading-7 text-muted-foreground" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className="list-disc space-y-2 pl-6 pt-4 text-muted-foreground" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="list-decimal space-y-2 pl-6 pt-4 text-muted-foreground" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  code: (props: ComponentPropsWithoutRef<"code">) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground" {...props} />
  ),
  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="mt-4 overflow-x-auto rounded-xl border bg-muted/40 p-4 text-sm [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="mt-5 overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm" {...props} />
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th className="border-b bg-muted/40 px-4 py-3 font-semibold" {...props} />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="border-b px-4 py-3 text-muted-foreground last:border-b-0" {...props} />
  ),
  img: (props: ComponentPropsWithoutRef<"img">) => (
    <img
      className="mx-auto mt-6 max-h-[calc(100vh-11rem)] w-auto max-w-full rounded-3xl border bg-slate-50 object-contain"
      loading="eager"
      {...props}
    />
  )
};

function groupPages(search: string) {
  const query = search.trim().toLowerCase();
  const filtered = query
    ? docsPages.filter((page) =>
        `${page.title} ${page.description} ${page.group}`.toLowerCase().includes(query)
      )
    : docsPages;
  const groups = new Map<string, (typeof docsPages)[number][]>();
  for (const page of filtered) {
    const pages = groups.get(page.group) ?? [];
    pages.push(page);
    groups.set(page.group, pages);
  }
  return Array.from(groups.entries());
}
