export interface ActivityFilters { query: string; person: string; from: string; to: string }

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseActivityFilters(input: { query?: unknown; person?: unknown; from?: unknown; to?: unknown }) {
  const from = text(input.from);
  const to = text(input.to);
  const invalid = Boolean((from && !validDate(from)) || (to && !validDate(to)));
  const filters: ActivityFilters = { query: text(input.query).slice(0, 160), person: text(input.person).slice(0, 160), from: from && validDate(from) ? from : "", to: to && validDate(to) ? to : "" };
  const error = invalid ? "Revisa las fechas e introduce un día válido." : from && to && from > to ? "La fecha inicial no puede ser posterior a la fecha final." : null;
  const dateRange: { $gte?: Date; $lt?: Date } = {};
  if (!error) {
    // Activity dates use Panama's UTC−05:00 calendar, including the entire final day.
    if (from) dateRange.$gte = new Date(`${from}T00:00:00.000-05:00`);
    if (to) dateRange.$lt = new Date(new Date(`${to}T00:00:00.000-05:00`).getTime() + 24 * 60 * 60 * 1000);
  }
  return { filters, dateRange, error };
}

export function literalNamePattern(value: string) {
  return { $regex: value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
}
