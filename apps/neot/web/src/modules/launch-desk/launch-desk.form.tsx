import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import { Textarea } from "@neot/ui/components/textarea";
import { CalendarIcon, PlayIcon } from "lucide-react";
import type { LaunchDeskInput } from "./launch-desk.types";

type Props = {
  input: LaunchDeskInput;
  onChange: (input: LaunchDeskInput) => void;
  onRun: () => void;
  running: boolean;
};

export function LaunchDeskForm({ input, onChange, onRun, running }: Props) {
  const update = <K extends keyof LaunchDeskInput>(key: K, value: LaunchDeskInput[K]) =>
    onChange({ ...input, [key]: value });
  return (
    <section className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 py-5">
      <Field label="Product brief">
        <Textarea
          className="min-h-36 resize-y"
          onChange={(event) => update("productBrief", event.target.value)}
          value={input.productBrief}
        />
      </Field>
      <Field label="Audience">
        <Textarea
          className="min-h-20 resize-y"
          onChange={(event) => update("audience", event.target.value)}
          value={input.audience}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Launch date">
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => update("launchDate", event.target.value)}
              type="date"
              value={input.launchDate}
            />
          </div>
        </Field>
        <Field label="Available assets" hint="One per line">
          <Textarea
            className="min-h-20 resize-y"
            onChange={(event) =>
              update(
                "availableAssets",
                event.target.value
                  .split("\n")
                  .map((value) => value.trim())
                  .filter(Boolean)
              )
            }
            value={input.availableAssets.join("\n")}
          />
        </Field>
      </div>
      <Field label="Constraints">
        <Textarea
          className="min-h-24 resize-y"
          onChange={(event) => update("constraints", event.target.value)}
          value={input.constraints}
        />
      </Field>
      <Button
        className="w-full"
        disabled={running || input.productBrief.trim().length < 20 || !input.launchDate}
        onClick={onRun}
      >
        <PlayIcon /> {running ? "Building launch plan…" : "Build launch plan"}
      </Button>
    </section>
  );
}

function Field({
  children,
  hint,
  label
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex justify-between text-sm font-medium">
        {label}
        {hint ? <span className="font-normal text-muted-foreground">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
