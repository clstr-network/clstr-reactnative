export type EventStatus = {
  isUpcoming: boolean;
  isPast: boolean;
  isOngoing: boolean;
  startsAt: Date;
  endsAt: Date;
};

const normalizeTime = (value: string | null | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;

  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(trimmed);
  if (!match) return fallback;

  if (match[3]) return trimmed;
  return `${match[1]}:${match[2]}:00`;
};

const toDateTime = (eventDate: string, time: string): Date => new Date(`${eventDate}T${time}`);

/**
 * Event status helper.
 * Rule: Events are considered "upcoming" until their end time.
 * If no end time is provided, the event is considered upcoming until 23:59:59 local time.
 */
export const getEventStatus = (params: {
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  now?: Date;
}): EventStatus => {
  const startsAt = toDateTime(params.eventDate, normalizeTime(params.startTime, "00:00:00"));
  const endsAt = toDateTime(params.eventDate, normalizeTime(params.endTime, "23:59:59"));
  const now = params.now ?? new Date();

  const isPast = now > endsAt;
  const isUpcoming = now < startsAt;
  const isOngoing = !isPast && !isUpcoming;

  return { isUpcoming, isPast, isOngoing, startsAt, endsAt };
};
