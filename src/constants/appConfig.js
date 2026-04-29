export const roles = {
  student: 'Student',
  lecturer: 'Lecturer',
  principal_lecturer: 'Principal Lecturer',
  program_leader: 'Program Leader',
};

export const moduleMap = {
  student: ['Overview', 'Monitoring', 'Rating', 'Attendance', 'Reports'],
  lecturer: ['Overview', 'Classes', 'Reports', 'Monitoring', 'Rating', 'Student Attendance'],
  principal_lecturer: ['Overview', 'Courses', 'Reports', 'Monitoring', 'Rating', 'Classes'],
  program_leader: ['Overview', 'Courses', 'Reports', 'Monitoring', 'Classes', 'Lecturers', 'Rating'],
};

export const reportLabels = {
  facultyName: 'Faculty Name',
  className: 'Class Name',
  weekOfReporting: 'Week of Reporting',
  dateOfLecture: 'Date of Lecture',
  courseName: 'Course Name',
  courseCode: 'Course Code',
  lecturerName: "Lecturer's Name",
  actualPresent: 'Actual Number of Students Present',
  totalRegistered: 'Total Number of Registered Students',
  venue: 'Venue of the Class',
  scheduledTime: 'Scheduled Lecture Time',
  topicTaught: 'Topic Taught',
  learningOutcomes: 'Learning Outcomes of the Topic',
  recommendations: "Lecturer's Recommendations",
};

export const courseLabels = {
  courseName: 'Course Name',
  courseCode: 'Course Code',
  facultyName: 'Faculty Name',
  className: 'Class Name',
  lecturerName: "Lecturer's Name",
  principalLecturerName: 'Principal Lecturer Name',
  registeredStudents: 'Registered Students',
  venue: 'Venue',
  scheduledTime: 'Scheduled Time',
  stream: 'Stream',
};

export const attendanceLabels = {
  courseCode: 'Course Code',
  studentName: 'Student Name',
  status: 'Attendance Status',
  date: 'Attendance Date',
};

export const ratingLabels = {
  target: 'Module or Lecturer',
  score: 'Rating Score (1-5)',
  comment: 'Rating Comment',
};

export const monitoringLabels = {
  title: 'Monitoring Title',
  note: 'Monitoring Note',
};

export const reportFields = Object.keys(reportLabels);
export const courseFields = Object.keys(courseLabels);
export const attendanceFields = Object.keys(attendanceLabels);
export const ratingFields = Object.keys(ratingLabels);
export const monitoringFields = Object.keys(monitoringLabels);

export const reportMultilineFields = ['topicTaught', 'learningOutcomes', 'recommendations'];
export const ratingMultilineFields = ['comment'];
export const monitoringMultilineFields = ['note'];

export const createBlankReport = () => Object.fromEntries(reportFields.map((key) => [key, '']));

export const createBlankCourse = () => ({
  courseName: '',
  courseCode: '',
  facultyName: '',
  className: '',
  lecturerName: '',
  principalLecturerName: '',
  registeredStudents: '',
  venue: '',
  scheduledTime: '',
  stream: '',
});

export const createBlankAttendance = () => ({
  courseCode: '',
  studentName: '',
  status: 'Present',
  date: '',
});

export const createBlankRating = () => ({
  target: '',
  score: '5',
  comment: '',
});

export const createBlankMonitoring = () => ({
  title: '',
  note: '',
});
