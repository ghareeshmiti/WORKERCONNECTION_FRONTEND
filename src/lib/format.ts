/**
 * Format Worker ID to standard format: WKR-AP-YYYY-XXXXX
 * @param rawId - The raw worker ID from database
 * @returns Formatted worker ID string
 */
export const formatWorkerId = (rawId: string | null | undefined): string => {
    if (!rawId) return 'N/A';
    const year = new Date().getFullYear();

    // If already formatted (contains dashes), return as-is
    if (rawId.includes('-')) return rawId;

    // If numeric only (e.g. "00145"), format as WKR-AP-YYYY-XXXXX
    if (/^\d+$/.test(rawId)) {
        return `WKR-AP-${year}-${rawId.padStart(5, '0')}`;
    }

    // If ID starts with WKR but no dashes (e.g. WKR7107...), format it
    if (rawId.startsWith('WKR') && !rawId.includes('-')) {
        const suffix = rawId.replace('WKR', '');
        return `WKR-AP-${year}-${suffix}`;
    }

    // Default: return as-is
    return rawId;
};
