/**
 * Utility functions for text processing and encoding
 */

/**
 * Decodes HTML entities and cleans up malformed text content
 */
export function cleanEmailContent(content: string): string {
  if (!content) return '';

  let cleaned = content;

  // Create a temporary element to decode HTML entities
  const tempElement = document.createElement('textarea');
  tempElement.innerHTML = cleaned;
  cleaned = tempElement.value;

  // Remove or replace common corrupted Unicode sequences
  cleaned = cleaned
    // Remove HTML entities that aren't properly decoded
    .replace(/&#\d+;/g, '')
    .replace(/&[a-zA-Z]+;/g, '')
    // Remove common corrupted sequences
    .replace(/;65279#&/g, '')
    .replace(/;8199#&/g, '')
    .replace(/;847#&/g, '')
    // Remove sequences like &#65279;&#8199;&#847;
    .replace(/&#\d+;&#\d+;&#\d+;/g, '')
    // Remove excessive whitespace and control characters
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    // Remove CSS and style blocks that appear in email content
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/^\s*[a-zA-Z-]+\s*{[\s\S]*?}\s*$/gm, '')
    // Clean up URLs that might be malformed
    .replace(/https?:\/\/[^\s)]*\)/g, (match) => {
      // If URL ends with ), check if it's actually part of the URL
      const urlWithoutParen = match.slice(0, -1);
      return urlWithoutParen;
    })
    // Trim excessive whitespace
    .trim();

  return cleaned;
}

/**
 * Strips HTML tags and returns plain text
 */
export function stripHtml(html: string): string {
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  return tempElement.textContent || tempElement.innerText || '';
}

/**
 * Truncates text to a specified length while preserving word boundaries
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const truncated = text.slice(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  if (lastSpaceIndex > 0) {
    return truncated.slice(0, lastSpaceIndex) + '...';
  }
  
  return truncated + '...';
}

/**
 * Sanitizes text for safe display by removing potentially harmful content
 */
export function sanitizeText(text: string): string {
  return stripHtml(cleanEmailContent(text));
}