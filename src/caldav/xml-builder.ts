/**
 * XML builder for CalDAV requests
 * Constructs PROPFIND, REPORT, and other WebDAV/CalDAV XML bodies
 */

const DAV_NS = 'DAV:';
const CALDAV_NS = 'urn:ietf:params:xml:ns:caldav';

/**
 * Build a PROPFIND request body to discover calendars
 */
export function buildCalendarDiscovery(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="${DAV_NS}" xmlns:c="${CALDAV_NS}">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <c:calendar-home-set/>
  </d:prop>
</d:propfind>`;
}

/**
 * Build a PROPFIND request body to list calendars
 */
export function buildCalendarList(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="${DAV_NS}" xmlns:c="${CALDAV_NS}" xmlns:x="http://apple.com/ns/ical/">
  <d:prop>
    <d:displayname/>
    <d:resourcetype/>
    <x:calendar-color/>
  </d:prop>
</d:propfind>`;
}

/**
 * Build a REPORT request body to query events by time range
 */
export function buildTimeRangeQuery(startDate: string, endDate: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="${DAV_NS}" xmlns:c="${CALDAV_NS}">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${formatCalDAVDate(startDate)}" end="${formatCalDAVDate(endDate)}"/>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
}

/**
 * Format an ISO 8601 date string to CalDAV format (YYYYMMDDTHHmmssZ)
 */
function formatCalDAVDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
