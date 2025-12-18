// lib/generateSubmissionCalendar.ts
import moment from "moment-timezone";

export interface SubmissionDay {
  targetDate: string; // "2025-11-03" (YYYY-MM-DD)
  dayOfWeek: string; // "Monday"
  deadline: string; // ISO 8601 UTC: "2025-11-03T23:00:00.000Z"
  deadlineLocal: string; // ISO 8601 in user's timezone: "2025-11-03T22:00:00"
  status:
    | "pending"
    | "processing"
    | "verified"
    | "denied"
    | "missed"
    | "failed"
    | "double-checking";
  submissionId?: string;
  submittedAt?: string;
}

export function generateSubmissionCalendar(
  startDate: string,
  endDate: string,
  selectedDays: string[],
  deadlineTime: string,
  timezone: string
): SubmissionDay[] {
  const calendar: SubmissionDay[] = [];

  const dayNameToNumber: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const selectedDayNumbers = selectedDays.map((day) => {
    const dayNum = dayNameToNumber[day];
    if (dayNum === undefined) {
      throw new Error(`Invalid day name: ${day}`);
    }
    return dayNum;
  });

  const [hours, minutes] = deadlineTime.split(":").map(Number);

  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(
      `Invalid deadline time format: ${deadlineTime}. Expected format: "HH:mm"`
    );
  }

  const checkDate = moment.tz(startDate, timezone).startOf("day");
  const end = moment.tz(endDate, timezone).endOf("day");

  while (checkDate.isSameOrBefore(end)) {
    const dayOfWeek = checkDate.day();

    if (selectedDayNumbers.includes(dayOfWeek)) {
      // Create deadline in user's timezone
      const deadlineLocal = checkDate
        .clone()
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);

      // Format local time BEFORE converting to UTC
      const deadlineLocalString = deadlineLocal.format("YYYY-MM-DDTHH:mm:ss");

      // Convert to UTC for storage
      const deadlineUTC = deadlineLocal.clone().utc().toISOString();

      calendar.push({
        targetDate: checkDate.format("YYYY-MM-DD"),
        dayOfWeek: checkDate.format("dddd"),
        deadline: deadlineUTC, // UTC for storage
        deadlineLocal: deadlineLocalString, // Local time (CORRECTED)
        status: "pending",
      });
    }

    checkDate.add(1, "day");
  }

  return calendar;
}
