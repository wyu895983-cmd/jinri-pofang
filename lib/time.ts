export type TimeFormatMode = "relative" | "detail" | "profile";

type FormatTimeOptions = {
  mode?: TimeFormatMode;
  editedAt?: string | Date | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDate(input: string | Date) {
  return input instanceof Date ? input : new Date(input);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function timePart(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function monthDay(date: Date, separator = "-") {
  return `${pad(date.getMonth() + 1)}${separator}${pad(date.getDate())}`;
}

function fullDate(date: Date, separator = "-") {
  return `${date.getFullYear()}${separator}${pad(date.getMonth() + 1)}${separator}${pad(date.getDate())}`;
}

export function formatTime(input: string | Date, options: FormatTimeOptions = {}) {
  const { mode = "relative", editedAt } = options;
  const date = toDate(input);
  const now = new Date();

  if (Number.isNaN(date.getTime())) return "";

  if (mode === "profile") {
    return fullDate(date, ".");
  }

  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const dayDiff = Math.floor((startOfDay(now) - startOfDay(date)) / DAY_MS);

  let text: string;

  if (seconds < 60) {
    text = "刚刚";
  } else if (minutes < 60) {
    text = `${minutes}分钟前`;
  } else if (hours < 24 && dayDiff === 0) {
    text = `${hours}小时前`;
  } else if (dayDiff === 1) {
    text = `昨天 ${timePart(date)}`;
  } else if (dayDiff === 2) {
    text = `前天 ${timePart(date)}`;
  } else if (dayDiff >= 3 && dayDiff <= 7) {
    text = `${dayDiff}天前`;
  } else if (date.getFullYear() === now.getFullYear()) {
    text = monthDay(date);
  } else {
    text = fullDate(date);
  }

  if (editedAt) {
    const editedDate = toDate(editedAt);
    if (!Number.isNaN(editedDate.getTime()) && editedDate.getTime() > date.getTime() + 60_000) {
      text += " · 已编辑";
    }
  }

  return text;
}
