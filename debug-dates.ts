import { startOfToday, isWithinInterval } from "date-fns";

import { getWeekStart, getWeekEnd } from "./src/app/(main)/dashboard/shifts/_lib/shift-utils";

const today = startOfToday();
const weekStart = getWeekStart(today);
const weekEnd = getWeekEnd(today);

console.log("Today:", today.toString());
console.log("Week Start:", weekStart.toString());
console.log("Week End:", weekEnd.toString());

const testDate = new Date("2025-11-24"); // UTC midnight? No, ISO string parses to UTC in modern JS or Local?
// "2025-11-24" is usually parsed as UTC.
console.log("Test Date (2025-11-24):", testDate.toString());

const inInterval = isWithinInterval(testDate, { start: weekStart, end: weekEnd });
console.log("Is Within Interval:", inInterval);
