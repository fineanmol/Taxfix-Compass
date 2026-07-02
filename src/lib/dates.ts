import dayjs from "dayjs";

export type RangeKey = "week" | "month" | "quarter" | "year";

const RANGE_DAYS: Record<RangeKey, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

/**
 * Rolling-window bounds ending at `ref` (inclusive of today). E.g. "week" =
 * the last 7 days, "month" = last 30 days. Rolling windows always include
 * recent activity — unlike calendar periods, which look empty at the start of
 * a month/year. `monthStartDay` is kept for signature compatibility (unused).
 */
export function rangeBounds(
  range: RangeKey,
  ref: number,
  _monthStartDay = 1
): { start: number; end: number } {
  void _monthStartDay;
  const end = dayjs(ref).endOf("day");
  const start = end.subtract(RANGE_DAYS[range] - 1, "day").startOf("day");
  return { start: start.valueOf(), end: end.valueOf() };
}

/** Bounds of the window immediately before the given range (same length). */
export function prevRangeBounds(
  range: RangeKey,
  ref: number,
  monthStartDay = 1
): { start: number; end: number } {
  const cur = rangeBounds(range, ref, monthStartDay);
  // previous window of the same length ends the day before the current starts
  const prevEnd = dayjs(cur.start).subtract(1, "day").valueOf();
  return rangeBounds(range, prevEnd, monthStartDay);
}

/** Short label for "vs previous <period>". */
export function prevPeriodLabel(range: RangeKey, _ref?: number, _msd?: number): string {
  void _ref;
  void _msd;
  switch (range) {
    case "week":
      return "prev 7 days";
    case "quarter":
      return "prev 90 days";
    case "year":
      return "prev year";
    case "month":
    default:
      return "prev 30 days";
  }
}

export function fmtDate(ms: number, template = "MMM D, YYYY"): string {
  return dayjs(ms).format(template);
}

export function fmtDayHeader(ms: number): string {
  const d = dayjs(ms);
  if (d.isSame(dayjs(), "day")) return "Today";
  if (d.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
  return d.format("ddd, MMM D");
}
