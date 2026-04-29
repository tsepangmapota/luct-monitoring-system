import { Platform } from 'react-native';

const headers = [
  'Faculty Name',
  'Class Name',
  'Week of Reporting',
  'Date of Lecture',
  'Course Name',
  'Course Code',
  "Lecturer's Name",
  'Actual Students Present',
  'Registered Students',
  'Venue',
  'Scheduled Lecture Time',
  'Topic Taught',
  'Learning Outcomes',
  'Recommendations',
  'PRL Feedback',
];

function escapeCsv(value) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportReportsToCsv(reports) {
  if (!reports.length) {
    throw new Error('There are no reports to export.');
  }

  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    throw new Error('CSV export is available from the hosted web build so the file downloads directly.');
  }

  const rows = reports.map((item) => [
    item.facultyName,
    item.className,
    item.weekOfReporting,
    item.dateOfLecture,
    item.courseName,
    item.courseCode,
    item.lecturerName,
    item.actualPresent,
    item.totalRegistered,
    item.venue,
    item.scheduledTime,
    item.topicTaught,
    item.learningOutcomes,
    item.recommendations,
    item.feedback,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');

  const filename = `luct-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return filename;
}
