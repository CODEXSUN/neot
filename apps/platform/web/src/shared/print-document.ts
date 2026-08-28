const style = `@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10px;color:#111827}table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #4b5563;padding:5px 6px}th{background:#f3f4f6;text-align:left}td.number,th.number{text-align:right}.summary{margin-top:8px;margin-left:auto;width:auto}`;
export function openPrintDocument(body: string) {
  const target = window.open("", "_blank", "width=1200,height=800");
  if (!target) return false;
  target.opener = null;
  target.document.write(`<!doctype html><html><head><meta charset="utf-8"><style>${style}</style></head><body>${body}</body></html>`);
  target.document.close();
  target.addEventListener("load", () => { target.focus(); target.print(); }, { once: true });
  target.addEventListener("afterprint", () => target.close(), { once: true });
  return true;
}
export function escapePrintText(value: number | string) {
  return String(value).replace(/[&<>"']/gu, (character) => ({ '"': "&quot;", "&": "&amp;", "'": "&#039;", "<": "&lt;", ">": "&gt;" })[character] ?? character);
}
export function formatPrintMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
}
