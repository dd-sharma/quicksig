export const DateUtils = {
  // Check if a given date is within a { from: Date, to?: Date } range
  isWithinRange(date, range) {
    if (!date || !range) return false;

    const d = typeof date === "string" ? new Date(date) : date;
    if (!(d instanceof Date) || isNaN(d.getTime())) return false;

    // From boundary (inclusive)
    if (range.from && d < range.from) return false;

    // To boundary (inclusive of the end day)
    if (range.to) {
      const endOfDay = new Date(range.to);
      endOfDay.setHours(23, 59, 59, 999);
      if (d > endOfDay) return false;
    }

    return true;
  }
};