export function HoneyFace({ size = "message" }: { size?: "compact" | "header" | "message" }) {
  const frame = size === "header" ? "size-10" : size === "compact" ? "size-6" : "size-8";
  const sprite = size === "compact" ? "-left-[5px] -top-[4px] h-[44px] w-[41px] bg-[length:326px_486px]" : "-left-[7px] -top-[5px] h-[58px] w-[54px] bg-[length:432px_644px]";
  return <span aria-label="Honey" className={`relative inline-block shrink-0 overflow-hidden rounded-full border border-amber-200 bg-amber-50 ${frame}`} role="img">
    <span className={`absolute block bg-[url('/pets/honey/spritesheet.webp')] bg-no-repeat ${sprite}`} />
  </span>;
}
