import { calculateMyShiftsMetrics } from "./src/app/(main)/dashboard/me/shifts/_lib/my-shifts-utils";
import { Shift, Employee } from "./src/app/(main)/dashboard/shifts/_lib/types";

// Mock Data
const today = new Date("2025-11-26T12:00:00"); // Wednesday
// Week: Mon Nov 24 - Sun Nov 30

const employee: Employee = {
  id: "emp1",
  firstName: "Test",
  lastName: "User",
  contractHours: 30, // 6h * 5
  usesShiftSystem: true,
  absences: [],
};

// Mock Shifts (6h per day for 5 days = 30h)
const shifts: Shift[] = [
  {
    id: "1",
    employeeId: "emp1",
    date: "2025-11-24",
    startTime: "09:00",
    endTime: "15:00",
    role: "Turno",
    status: "published",
  }, // Mon
  {
    id: "2",
    employeeId: "emp1",
    date: "2025-11-25",
    startTime: "09:00",
    endTime: "15:00",
    role: "Turno",
    status: "published",
  }, // Tue
  {
    id: "3",
    employeeId: "emp1",
    date: "2025-11-26",
    startTime: "09:00",
    endTime: "15:00",
    role: "Turno",
    status: "published",
  }, // Wed
  {
    id: "4",
    employeeId: "emp1",
    date: "2025-11-27",
    startTime: "09:00",
    endTime: "15:00",
    role: "Turno",
    status: "published",
  }, // Thu
  {
    id: "5",
    employeeId: "emp1",
    date: "2025-11-28",
    startTime: "09:00",
    endTime: "15:00",
    role: "Turno",
    status: "published",
  }, // Fri
];

// Execute
const metrics = calculateMyShiftsMetrics(shifts, employee);

console.log("Week Hours Assigned:", metrics.weekHoursAssigned);
console.log("Week Hours Contracted:", metrics.weekHoursContracted);
console.log("Week Balance:", metrics.weekBalance);
