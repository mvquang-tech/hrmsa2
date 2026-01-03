/**
 * Helper functions for leave calculations and session management
 */

export type SessionType = 'morning' | 'afternoon';
export type LeaveSessions = Record<string, SessionType[]>; // { "YYYY-MM-DD": ["morning", "afternoon"] }

/**
 * Generate array of dates from start to end date (inclusive)
 * Returns dates in YYYY-MM-DD format
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate) return [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
  if (end < start) return [];
  
  const dates: string[] = [];
  const current = new Date(start);
  
  // Set time to noon to avoid timezone issues
  current.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Calculate total days from sessions
 * Each session (morning/afternoon) = 0.5 days
 */
export function calculateDaysFromSessions(sessions: LeaveSessions): number {
  let totalSessions = 0;
  
  Object.values(sessions).forEach(sessionArray => {
    if (Array.isArray(sessionArray)) {
      totalSessions += sessionArray.length;
    }
  });
  
  return totalSessions * 0.5;
}

/**
 * Normalize date string to YYYY-MM-DD format
 */
export function normalizeDate(date: string | Date): string {
  if (typeof date === 'string') {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Try to parse and normalize
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } else if (date instanceof Date) {
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  throw new Error(`Invalid date: ${date}`);
}

/**
 * Normalize sessions object - ensure all date keys are in YYYY-MM-DD format
 */
export function normalizeSessions(sessions: any): LeaveSessions {
  if (!sessions) return {};
  
  // If it's already a normalized object, return as is
  if (typeof sessions === 'object' && !Array.isArray(sessions)) {
    const normalized: LeaveSessions = {};
    
    Object.keys(sessions).forEach(key => {
      try {
        const normalizedKey = normalizeDate(key);
        const sessionArray = sessions[key];
        
        if (Array.isArray(sessionArray)) {
          // Filter only valid session types
          const validSessions = sessionArray.filter(
            (s: any) => s === 'morning' || s === 'afternoon'
          ) as SessionType[];
          
          if (validSessions.length > 0) {
            normalized[normalizedKey] = validSessions;
          }
        }
      } catch (e) {
        console.warn(`Skipping invalid date key: ${key}`, e);
      }
    });
    
    return normalized;
  }
  
  // If it's an array (old format), return empty (should be converted separately)
  if (Array.isArray(sessions)) {
    console.warn('Received array format sessions, should be converted to object format');
    return {};
  }
  
  return {};
}

/**
 * Convert old array format to new object format
 * Old: ["morning", "afternoon", "morning"]
 * New: { "2026-01-01": ["morning", "afternoon"], "2026-01-02": ["morning"] }
 */
export function convertArrayToSessions(
  sessionsArray: SessionType[],
  startDate: string,
  endDate: string
): LeaveSessions {
  const dates = generateDateRange(startDate, endDate);
  const sessions: LeaveSessions = {};
  
  dates.forEach((date, index) => {
    const daySessions: SessionType[] = [];
    
    // Each day can have max 2 sessions (morning, afternoon)
    if (sessionsArray[index * 2] === 'morning') {
      daySessions.push('morning');
    }
    if (sessionsArray[index * 2 + 1] === 'afternoon') {
      daySessions.push('afternoon');
    }
    
    if (daySessions.length > 0) {
      sessions[date] = daySessions;
    }
  });
  
  return sessions;
}

/**
 * Initialize empty sessions for date range
 */
export function initializeSessionsForDateRange(
  startDate: string,
  endDate: string
): LeaveSessions {
  const dates = generateDateRange(startDate, endDate);
  const sessions: LeaveSessions = {};
  
  dates.forEach(date => {
    sessions[date] = [];
  });
  
  return sessions;
}

/**
 * Toggle a session for a specific date
 */
export function toggleSession(
  sessions: LeaveSessions,
  date: string,
  sessionType: SessionType
): LeaveSessions {
  const normalizedDate = normalizeDate(date);
  const newSessions = { ...sessions };
  
  if (!newSessions[normalizedDate]) {
    newSessions[normalizedDate] = [];
  }
  
  const index = newSessions[normalizedDate].indexOf(sessionType);
  
  if (index > -1) {
    // Remove session
    newSessions[normalizedDate] = newSessions[normalizedDate].filter(
      s => s !== sessionType
    );
    
    // Remove date key if no sessions
    if (newSessions[normalizedDate].length === 0) {
      delete newSessions[normalizedDate];
    }
  } else {
    // Add session (avoid duplicates)
    if (!newSessions[normalizedDate].includes(sessionType)) {
      newSessions[normalizedDate] = [...newSessions[normalizedDate], sessionType];
    }
  }
  
  return newSessions;
}

/**
 * Get sessions for a specific date
 */
export function getSessionsForDate(
  sessions: LeaveSessions,
  date: string
): SessionType[] {
  try {
    const normalizedDate = normalizeDate(date);
    return sessions[normalizedDate] || [];
  } catch (e) {
    return [];
  }
}

/**
 * Check if a session is selected for a date
 */
export function hasSession(
  sessions: LeaveSessions,
  date: string,
  sessionType: SessionType
): boolean {
  return getSessionsForDate(sessions, date).includes(sessionType);
}


