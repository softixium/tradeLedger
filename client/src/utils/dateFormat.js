const dateOptions = { day: "2-digit", month: "2-digit", year: "numeric" };

export const formatDate = (value, fallback = "—") => {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", dateOptions).format(date);
};

export const formatDateTime = (value, fallback = "—") => {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    ...dateOptions,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
};
