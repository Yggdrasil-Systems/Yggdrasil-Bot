export function formatDiscordTimestamp(date, style = 'F') {
  if (!(date instanceof Date)) {
    return 'Unknown';
  }

  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

export function formatBoolean(value) {
  return value ? 'Yes' : 'No';
}

export function formatHexColor(color) {
  return `#${Number(color ?? 0).toString(16).padStart(6, '0')}`;
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return 'Unknown';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${Math.max(minutes, 1)}m`;
}
