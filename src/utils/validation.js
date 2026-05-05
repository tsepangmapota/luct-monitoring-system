import {
  attendanceLabels,
  courseLabels,
  monitoringLabels,
  ratingLabels,
  reportFields,
  reportLabels,
} from '../constants/appConfig';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const normalizeText = (value) => String(value || '').trim();
export const normalizeEmail = (value) => normalizeText(value).toLowerCase();

function requireFields(payload, labels) {
  const missing = Object.entries(labels).find(([key]) => !normalizeText(payload[key]));
  if (missing) {
    throw new Error(`Please enter ${missing[1]}.`);
  }
}

function requirePositiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${label} must be a valid number.`);
  }
}

export function validateLoginForm(form) {
  if (!normalizeEmail(form.email)) {
    throw new Error('Please enter your email address.');
  }
  if (!emailRegex.test(normalizeEmail(form.email))) {
    throw new Error('Enter a valid email address.');
  }
  if (!normalizeText(form.password)) {
    throw new Error('Please enter your password.');
  }
}

export function validateRegistrationForm(form) {
  if (!normalizeText(form.name)) {
    throw new Error('Please enter your full name.');
  }
  validateLoginForm(form);
  if (String(form.password || '').length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (!normalizeText(form.role)) {
    throw new Error('Please select a user role.');
  }
}

export function validateCourseRecord(payload) {
  requireFields(payload, courseLabels);
  requirePositiveNumber(payload.registeredStudents, courseLabels.registeredStudents);
}

export function validateReportRecord(payload) {
  requireFields(payload, reportLabels);
  requirePositiveNumber(payload.actualPresent, reportLabels.actualPresent);
  requirePositiveNumber(payload.totalRegistered, reportLabels.totalRegistered);
  if (!isoDateRegex.test(normalizeText(payload.dateOfLecture))) {
    throw new Error('Date of Lecture must use the format YYYY-MM-DD.');
  }
}

export function validateAttendanceRecord(payload) {
  requireFields(payload, attendanceLabels);
  if (!isoDateRegex.test(normalizeText(payload.date))) {
    throw new Error('Attendance Date must use the format YYYY-MM-DD.');
  }
}

export function validateRatingRecord(payload) {
  requireFields(payload, ratingLabels);
  const score = Number(payload.score);
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    throw new Error('Rating Score must be a number between 1 and 5.');
  }
}

export function validateMonitoringRecord(payload) {
  requireFields(payload, monitoringLabels);
}

export function sanitizeCourseRecord(payload) {
  return {
    courseName: normalizeText(payload.courseName),
    courseCode: normalizeText(payload.courseCode).toUpperCase(),
    facultyName: normalizeText(payload.facultyName),
    className: normalizeText(payload.className),
    lecturerName: normalizeText(payload.lecturerName),
    principalLecturerName: normalizeText(payload.principalLecturerName),
    registeredStudents: Number(payload.registeredStudents) || 0,
    venue: normalizeText(payload.venue),
    scheduledTime: normalizeText(payload.scheduledTime),
    stream: normalizeText(payload.stream),
  };
}

export function sanitizeReportRecord(payload) {
  const cleaned = Object.fromEntries(
    reportFields.map((key) => [key, normalizeText(payload[key])]),
  );

  return {
    ...cleaned,
    courseCode: cleaned.courseCode.toUpperCase(),
    actualPresent: String(Number(cleaned.actualPresent) || 0),
    totalRegistered: String(Number(cleaned.totalRegistered) || 0),
  };
}

export function sanitizeAttendanceRecord(payload) {
  return {
    courseCode: normalizeText(payload.courseCode).toUpperCase(),
    studentName: normalizeText(payload.studentName),
    status: normalizeText(payload.status) || 'Present',
    date: normalizeText(payload.date),
  };
}

export function sanitizeRatingRecord(payload) {
  return {
    authorId: normalizeText(payload.authorId),
    authorName: normalizeText(payload.authorName),
    target: normalizeText(payload.target),
    score: Number(payload.score) || 0,
    comment: normalizeText(payload.comment),
  };
}

export function sanitizeMonitoringRecord(payload) {
  return {
    title: normalizeText(payload.title),
    note: normalizeText(payload.note),
  };
}
