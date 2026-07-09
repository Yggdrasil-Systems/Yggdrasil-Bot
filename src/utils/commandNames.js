export function normalizeCommandName(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}
