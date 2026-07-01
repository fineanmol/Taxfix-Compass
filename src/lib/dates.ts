import dayjs from "dayjs";

export type RangeKey = "week" | "month" | "quarter" | "year";

/** Start/end epoch ms for the given range, anchored on a custom month-start day. */
export function rangeBounds(
  range: RangeKey,
  ref: number,
  monthStartDay = 1
): { start: number; end: number } {
  const d = dayjs(ref);
  switch (range) {
    case "week":
      return { start: d.startOf("week").valueOf(), end: d.endOf("week").valueOf() };
    case "quarter":
      return {
        start: d.startOf("month").subtract((d.month() % 3), "month").valueOf(),
        end: d.endOf("month").add(2 - (d.month() % 3), "month").valueOf(),
      };
    case "year":
      return { start: d.startOf("year").valueOf(), end: d.endOf("year").valueOf() };
    case "month":
    default: {
      // custom month start: a "month" runs day N → day N-1 of next month
      let start = d.date(monthStartDay).startOf("day");
      if (d.date() < monthStartDay) start = start.subtract(1, "month");
      const end = start.add(1, "month").subtract(1, "millisecond");
      return { start: start.valueOf(), end: end.valueOf() };
    }
  }
}

/** Bounds of the period immediately before the given range (same length). */
export function prevRangeBounds(
  range: RangeKey,
  ref: number,
  monthStartDay = 1
): { start: number; end: number } {
  const cur = rangeBounds(range, ref, monthStartDay);
  const unit = range === "quarter" ? 3 : 1;
  const step = range === "quarter" ? "month" : range;
  const prevRef = dayjs(cur.start).subtract(unit, step).valueOf();
  return rangeBounds(range, prevRef, monthStartDay);
}

/** Short label for "vs last <period>" — e.g. the previous month's name. */
export function prevPeriodLabel(range: RangeKey, ref: number, monthStartDay = 1): string {
  const prev = prevRangeBounds(range, ref, monthStartDay);
  const d = dayjs(prev.start);
  switch (range) {
    case "week":
      return "last week";
    case "quarter":
      return "last quarter";
    case "year":
      return d.format("YYYY");
    case "month":
    default:
      return d.format("MMM");
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
