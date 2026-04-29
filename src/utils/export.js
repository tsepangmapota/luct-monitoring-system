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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function exportReportsToExcel(reports) {
  if (!reports.length) {
    throw new Error('There are no reports to export.');
  }

  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    throw new Error('Excel export is available from the hosted web build so the file downloads directly.');
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

  const tableRows = [headers, ...rows]
    .map((row, index) => (
      `<tr>${row.map((value) => {
        const tag = index === 0 ? 'th' : 'td';
        return `<${tag}>${escapeHtml(value)}</${tag}>`;
      }).join('')}</tr>`
    ))
    .join('');

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Reports</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines /></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <table>${tableRows}</table>
      </body>
    </html>
  `.trim();

  const filename = `luct-reports-${new Date().toISOString().slice(0, 10)}.xls`;
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
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
