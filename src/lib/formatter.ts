/**
 * date formatter utility to format date strings to dd-mm-yyyy format
 */

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  
  const trimmed = dateStr.trim();
  
  // Check if it's already in dd-mm-yyyy format
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Match YYYY-MM-DD
  const yyyymmdd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmdd) {
    return `${yyyymmdd[3]}-${yyyymmdd[2]}-${yyyymmdd[1]}`;
  }
  
  // Match YYYY/MM/DD
  const yyyymmddSlash = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (yyyymmddSlash) {
    return `${yyyymmddSlash[3]}-${yyyymmddSlash[2]}-${yyyymmddSlash[1]}`;
  }

  // Fallback if ISO string or other format by using standard JS Date API
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch (e) {
    // ignore
  }
  
  return trimmed;
}
