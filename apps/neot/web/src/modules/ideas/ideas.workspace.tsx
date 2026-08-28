import { Button } from "@neot/ui/components/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HexagonIcon,
  LightbulbIcon,
  MessageCircleIcon,
  PlusIcon,
  ReplyIcon,
  StarIcon,
  ThumbsDownIcon,
  ThumbsUpIcon
} from "lucide-react";
import { useMemo, useState } from "react";
import { IdeaDetail } from "./idea-detail";
import { IdeaEditor } from "./idea-editor";
import { useIdeas } from "./ideas.hooks";

const ideaCategories = [
  "All",
  "General",
  "Product",
  "Engineering",
  "Design",
  "Research",
  "Operations"
];
const ideasPerPage = 100;

export function IdeasWorkspace() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const uuid = segments[3];
  const action = segments[4];
  if (uuid === "new") return <IdeaEditor />;
  if (uuid && action === "edit") return <IdeaEditor uuid={uuid} />;
  if (uuid) return <IdeaDetail uuid={uuid} />;
  return <IdeasList />;
}

function IdeasList() {
  const ideas = useIdeas();
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const visible = useMemo(
    () => (ideas.data ?? []).filter((idea) => category === "All" || idea.category === category),
    [category, ideas.data]
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / ideasPerPage));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * ideasPerPage;
  const paginatedIdeas = visible.slice(pageStart, pageStart + ideasPerPage);

  return (
    <main className="mx-auto w-full max-w-6xl py-4 sm:w-[calc(100%-2rem)] sm:py-6 lg:w-[calc(100%-3rem)] lg:py-8">
      <div className="flex flex-col gap-4 border-b px-3 pb-5 sm:flex-row sm:items-center sm:justify-between sm:px-0">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2" aria-label="Filter ideas">
          {ideaCategories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                category === item
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
              onClick={() => {
                setCategory(item);
                setPage(1);
              }}
            >
              {item}
            </button>
          ))}
          <span className="whitespace-nowrap px-1 text-sm text-muted-foreground">
            {visible.length} discussions
          </span>
        </div>
        <Button onClick={() => window.location.assign("/app/neot/ideas/new")}>
          <PlusIcon />
          New idea
        </Button>
      </div>
      {visible.length ? (
        <div className="divide-y border-b">
          {paginatedIdeas.map((idea) => (
            <button
              key={idea.uuid}
              className="relative flex w-full cursor-pointer gap-3 rounded-none px-3 py-5 text-left transition-[transform,box-shadow,background-color] duration-200 ease-out hover:z-10 hover:-translate-y-1 hover:bg-background hover:shadow-md focus-visible:z-10 focus-visible:-translate-y-1 focus-visible:bg-background focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:rounded-lg"
              onClick={() => window.location.assign(`/app/neot/ideas/${idea.uuid}`)}
            >
              <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LightbulbIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1 pr-20 sm:pr-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-muted-foreground"
                    title={`Idea reference ${idea.referenceNumber}`}
                  >
                    <span
                      aria-hidden="true"
                      className="relative inline-flex size-4 items-center justify-center"
                    >
                      <HexagonIcon className="absolute inset-0 size-4 opacity-40" />
                      <StarIcon className="size-2 fill-current opacity-40" />
                    </span>
                    <span className="sr-only">Idea reference </span>
                    {idea.referenceNumber} -
                  </span>
                  <strong className="text-base">{idea.title}</strong>
                  <span
                    className="ml-1 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: `${idea.categoryColor}1f`,
                      color: idea.categoryColor
                    }}
                  >
                    {idea.category}
                  </span>
                </span>
                <span className="mt-1 block max-h-12 overflow-hidden text-sm leading-6 text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:max-h-none sm:[display:block] sm:[-webkit-line-clamp:unset]">
                  {idea.excerpt || "No short description provided."}
                </span>
                <span className="mt-3 flex flex-wrap items-center gap-1.5">
                  {idea.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex min-h-7 items-center rounded-full border border-border bg-muted/20 px-2.5 py-1 text-xs font-medium leading-none text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </span>
              </span>
              <span className="absolute right-3 top-5 flex shrink-0 flex-col items-end gap-3 text-sm text-muted-foreground sm:static sm:ml-auto sm:w-52 sm:pt-1">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize"
                  style={{ borderColor: `${idea.statusColor}66`, color: idea.statusColor }}
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: idea.statusColor }}
                  />
                  {idea.status.replaceAll("-", " ")}
                </span>
                <span className="flex flex-wrap justify-end gap-x-3 gap-y-2">
                  {idea.likes ? (
                    <span className="flex items-center gap-1" title="Thumbs up">
                      <ThumbsUpIcon className="size-4" />
                      {idea.likes}
                    </span>
                  ) : null}
                  {idea.dislikes ? (
                    <span className="flex items-center gap-1" title="Thumbs down">
                      <ThumbsDownIcon className="size-4" />
                      {idea.dislikes}
                    </span>
                  ) : null}
                  {idea.commentCount ? (
                    <span className="flex items-center gap-1" title="Comments">
                      <MessageCircleIcon className="size-4" />
                      {idea.commentCount}
                    </span>
                  ) : null}
                  {idea.replyCount ? (
                    <span className="flex items-center gap-1" title="Replies">
                      <ReplyIcon className="size-4" />
                      {idea.replyCount}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center border-b text-center">
          <div>
            <LightbulbIcon className="mx-auto size-8 text-muted-foreground" />
            <h2 className="pt-3 font-medium">No matching ideas</h2>
            <p className="pt-1 text-sm text-muted-foreground">
              Start the first discussion or choose another filter.
            </p>
          </div>
        </div>
      )}
      {visible.length > ideasPerPage ? (
        <nav
          aria-label="Ideas pagination"
          className="flex flex-col items-center justify-between gap-3 border-b px-3 py-5 sm:flex-row sm:px-0"
        >
          <span className="text-sm text-muted-foreground">
            Showing {pageStart + 1}–{Math.min(pageStart + ideasPerPage, visible.length)} of{" "}
            {visible.length}
          </span>
          <span className="flex items-center gap-2">
            <Button
              aria-label="Previous ideas page"
              disabled={currentPage === 1}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeftIcon />
              Previous
            </Button>
            <span className="min-w-20 text-center text-sm font-medium tabular-nums">
              {currentPage} of {pageCount}
            </span>
            <Button
              aria-label="Next ideas page"
              disabled={currentPage === pageCount}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setPage(currentPage + 1)}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </span>
        </nav>
      ) : null}
    </main>
  );
}
