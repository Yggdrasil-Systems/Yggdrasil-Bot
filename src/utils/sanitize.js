/**
 * Strips @everyone, @here, and all <@&id> / <@id> / <@!id> mention patterns
 * from a user-supplied string. Does NOT escape markdown.
 * @param {string} input
 * @returns {string}
 */
export function sanitizeMentions(input) {
  if (input == null) {
    return '';
  }

  return String(input)
    .replace(/@everyone/gi, '')
    .replace(/@here/gi, '')
    .replace(/<@!?\d+>/g, '')
    .replace(/<@&\d+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
