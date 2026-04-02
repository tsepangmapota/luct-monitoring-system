import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { isFirebaseConfigured } from './src/config/firebase';
import {
  getCurrentUserProfile,
  loadAppData,
  loginUser,
  logoutUser,
  registerUser,
  saveAttendanceRecord,
  saveCourseRecord,
  saveMonitoringRecord,
  saveRatingRecord,
  saveReportFeedback,
  saveReportRecord,
  seed,
} from './src/services/appDataService';

const roles = {
  student: 'Student',
  lecturer: 'Lecturer',
  principal_lecturer: 'Principal Lecturer',
  program_leader: 'Program Leader',
};

const moduleMap = {
  student: ['Monitoring', 'Rating', 'Attendance'],
  lecturer: ['Classes', 'Reports', 'Monitoring', 'Rating', 'Student Attendance'],
  principal_lecturer: ['Courses', 'Reports', 'Monitoring', 'Rating', 'Classes'],
  program_leader: ['Courses', 'Reports', 'Monitoring', 'Classes', 'Lecturers', 'Rating'],
};

const reportLabels = {
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

const reportFields = Object.keys(reportLabels);
const blankReport = Object.fromEntries(reportFields.map((key) => [key, '']));
const blankCourse = { courseName: '', courseCode: '', facultyName: '', className: '', lecturerName: '', principalLecturerName: '', registeredStudents: '', venue: '', scheduledTime: '', stream: '' };
const blankAttendance = { courseCode: '', studentName: '', status: 'Present', date: '' };
const blankRating = { target: '', score: '5', comment: '' };
const blankMonitoring = { title: '', note: '' };

const Section = ({ title, subtitle, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    {children}
  </View>
);

const SummaryCard = ({ label, value, tone }) => (
  <View style={[styles.summaryCard, tone === 'green' && styles.summaryGreen, tone === 'gold' && styles.summaryGold]}>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const ListBlock = ({ items, emptyMessage, render }) => (
  items.length ? items.map(render) : <Text style={styles.emptyText}>{emptyMessage}</Text>
);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [screen, setScreen] = useState('login');
  const [data, setData] = useState(seed);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [reportForm, setReportForm] = useState(blankReport);
  const [courseForm, setCourseForm] = useState(blankCourse);
  const [attendanceForm, setAttendanceForm] = useState(blankAttendance);
  const [ratingForm, setRatingForm] = useState(blankRating);
  const [monitoringForm, setMonitoringForm] = useState(blankMonitoring);
  const [feedbackMap, setFeedbackMap] = useState({});

  useEffect(() => {
    async function bootstrap() {
      try {
        const [appData, profile] = await Promise.all([
          loadAppData(),
          getCurrentUserProfile(),
        ]);
        setData(appData);
        if (profile) setUser(profile);
      } catch (error) {
        Alert.alert('Startup error', error.message);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  const q = search.trim().toLowerCase();
  const matches = (value) => JSON.stringify(value).toLowerCase().includes(q);

  const visibleCourses = useMemo(() => {
    let items = data.courses;
    if (user?.role === 'lecturer') items = items.filter((item) => item.lecturerName === user.name);
    if (user?.role === 'principal_lecturer') items = items.filter((item) => item.principalLecturerName === user.name);
    return items.filter(matches);
  }, [data.courses, q, user]);

  const visibleReports = useMemo(() => {
    let items = data.reports;
    if (user?.role === 'lecturer') items = items.filter((item) => item.lecturerId === user.id);
    if (user?.role === 'principal_lecturer') {
      const codes = new Set(data.courses.filter((item) => item.principalLecturerName === user.name).map((item) => item.courseCode));
      items = items.filter((item) => codes.has(item.courseCode));
    }
    if (user?.role === 'student') {
      const codes = new Set(data.attendance.filter((item) => item.studentName === user.name).map((item) => item.courseCode));
      items = items.filter((item) => codes.has(item.courseCode));
    }
    return items.filter(matches);
  }, [data.attendance, data.courses, data.reports, q, user]);

  const visibleAttendance = useMemo(() => {
    let items = data.attendance;
    if (user?.role === 'student') items = items.filter((item) => item.studentName === user.name);
    if (user?.role === 'lecturer') {
      const codes = new Set(data.courses.filter((item) => item.lecturerName === user.name).map((item) => item.courseCode));
      items = items.filter((item) => codes.has(item.courseCode));
    }
    return items.filter(matches);
  }, [data.attendance, data.courses, q, user]);

  const visibleRatings = useMemo(() => data.ratings.filter(matches), [data.ratings, q]);
  const visibleMonitoring = useMemo(() => data.monitoring.filter(matches), [data.monitoring, q]);

  const summary = {
    courses: visibleCourses.length || data.courses.length,
    reports: visibleReports.length,
    attendance: visibleAttendance.length,
    users: data.users.length,
  };

  const updateReportField = (key, value) => {
    const next = { ...reportForm, [key]: value };
    if (key === 'courseCode') {
      const match = data.courses.find((item) => item.courseCode.toLowerCase() === value.trim().toLowerCase());
      if (match) {
        next.facultyName = match.facultyName;
        next.className = match.className;
        next.courseName = match.courseName;
        next.lecturerName = user?.name || match.lecturerName;
        next.totalRegistered = String(match.registeredStudents);
        next.venue = match.venue;
        next.scheduledTime = match.scheduledTime;
      }
    }
    setReportForm(next);
  };

  const handleLogin = async () => {
    setAuthBusy(true);
    setAuthMessage('');
    try {
      const profile = await loginUser(loginForm.email, loginForm.password);
      const freshData = await loadAppData();
      setUser(profile);
      setData(freshData);
      setLoginForm({ email: '', password: '' });
      setSearch('');
      setAuthMessage('Login successful.');
    } catch (error) {
      setAuthMessage(error.message);
      Alert.alert('Login failed', error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.password.trim()) {
      return Alert.alert('Incomplete form', 'Please complete all registration fields.');
    }
    setAuthBusy(true);
    setAuthMessage('');
    try {
      await registerUser(registerForm);
      const freshData = await loadAppData();
      setData(freshData);
      setRegisterForm({ name: '', email: '', password: '', role: 'student' });
      setScreen('login');
      setAuthMessage('Account created. You can log in now.');
      Alert.alert('Account created', 'Registration completed successfully.');
    } catch (error) {
      setAuthMessage(error.message);
      Alert.alert('Registration failed', error.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setSearch('');
  };

  const saveReport = async () => {
    const missing = reportFields.find((key) => !String(reportForm[key] || '').trim());
    if (missing) return Alert.alert('Incomplete report', `Please enter ${reportLabels[missing]}.`);
    const next = await saveReportRecord(data, {
      lecturerId: user.id,
      ...reportForm,
      feedback: '',
    });
    setData(next);
    setReportForm(blankReport);
    Alert.alert('Saved', 'Weekly report submitted.');
  };

  const saveCourse = async () => {
    if (!courseForm.courseName.trim() || !courseForm.courseCode.trim() || !courseForm.lecturerName.trim()) {
      return Alert.alert('Missing data', 'Course name, code, and lecturer are required.');
    }
    const next = await saveCourseRecord(data, {
      ...courseForm,
      registeredStudents: Number(courseForm.registeredStudents) || 0,
    });
    setData(next);
    setCourseForm(blankCourse);
    Alert.alert('Saved', 'Course assignment added.');
  };

  const saveAttendance = async () => {
    if (!attendanceForm.courseCode.trim() || !attendanceForm.studentName.trim() || !attendanceForm.date.trim()) {
      return Alert.alert('Missing data', 'Course code, student name, and date are required.');
    }
    const next = await saveAttendanceRecord(data, {
      ...attendanceForm,
      capturedBy: user?.name || 'System',
    });
    setData(next);
    setAttendanceForm(blankAttendance);
    Alert.alert('Saved', 'Attendance captured.');
  };

  const saveRating = async () => {
    if (!ratingForm.target.trim() || !ratingForm.comment.trim()) {
      return Alert.alert('Missing data', 'Target and comment are required.');
    }
    const next = await saveRatingRecord(data, {
      authorId: user?.id || 'guest',
      target: ratingForm.target.trim(),
      score: Number(ratingForm.score) || 0,
      comment: ratingForm.comment.trim(),
    });
    setData(next);
    setRatingForm(blankRating);
    Alert.alert('Saved', 'Rating submitted.');
  };

  const saveMonitoring = async () => {
    if (!monitoringForm.title.trim() || !monitoringForm.note.trim()) {
      return Alert.alert('Missing data', 'Add a monitoring title and note.');
    }
    const next = await saveMonitoringRecord(data, {
      title: monitoringForm.title.trim(),
      note: monitoringForm.note.trim(),
      owner: user?.name || 'System',
    });
    setData(next);
    setMonitoringForm(blankMonitoring);
    Alert.alert('Saved', 'Monitoring note added.');
  };

  const saveFeedback = async (id) => {
    const value = feedbackMap[id];
    if (!value?.trim()) return Alert.alert('No feedback', 'Write feedback before saving.');
    const next = await saveReportFeedback(data, id, value.trim());
    setData(next);
    setFeedbackMap((current) => ({ ...current, [id]: '' }));
    Alert.alert('Saved', 'Feedback added to report.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingPage}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading LUCT Monitoring System...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.page}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>BIMP2210 Assignment 2</Text>
            <Text style={styles.heroTitle}>LUCT Monitoring System</Text>
            <Text style={styles.heroText}>Multi-role mobile application for students, lecturers, principal lecturers, and program leaders.</Text>
            <Text style={styles.modeText}>
              Backend: {isFirebaseConfigured ? 'Firebase Authentication + Firestore' : 'Local demo mode'}
            </Text>
          </View>
          <Section title={screen === 'login' ? 'Login' : 'Register'} subtitle={isFirebaseConfigured ? 'Your accounts are now stored in Firebase.' : 'Demo password for all sample accounts: 123456'}>
            {authMessage ? <Text style={styles.statusText}>{authMessage}</Text> : null}
            {screen === 'login' ? (
              <>
                <TextInput style={styles.input} placeholder="Email" value={loginForm.email} onChangeText={(value) => setLoginForm({ ...loginForm, email: value })} autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Password" value={loginForm.password} onChangeText={(value) => setLoginForm({ ...loginForm, password: value })} secureTextEntry />
                <Pressable style={[styles.primaryButton, authBusy && styles.buttonDisabled]} onPress={handleLogin} disabled={authBusy}><Text style={styles.primaryButtonText}>{authBusy ? 'Working...' : 'Login'}</Text></Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => setScreen('register')} disabled={authBusy}><Text style={styles.secondaryButtonText}>Create account</Text></Pressable>
                {!isFirebaseConfigured ? <Text style={styles.helperText}>Demo accounts: student@luct.ac.ls, lecturer@luct.ac.ls, prl@luct.ac.ls, pl@luct.ac.ls</Text> : null}
              </>
            ) : (
              <>
                <TextInput style={styles.input} placeholder="Full name" value={registerForm.name} onChangeText={(value) => setRegisterForm({ ...registerForm, name: value })} />
                <TextInput style={styles.input} placeholder="Email" value={registerForm.email} onChangeText={(value) => setRegisterForm({ ...registerForm, email: value })} autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Password" value={registerForm.password} onChangeText={(value) => setRegisterForm({ ...registerForm, password: value })} secureTextEntry />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleRow}>
                  {Object.entries(roles).map(([value, label]) => (
                    <Pressable key={value} style={[styles.roleChip, registerForm.role === value && styles.roleChipActive]} onPress={() => setRegisterForm({ ...registerForm, role: value })}>
                      <Text style={[styles.roleChipText, registerForm.role === value && styles.roleChipTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable style={[styles.primaryButton, authBusy && styles.buttonDisabled]} onPress={handleRegister} disabled={authBusy}><Text style={styles.primaryButtonText}>{authBusy ? 'Working...' : 'Register'}</Text></Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => setScreen('login')} disabled={authBusy}><Text style={styles.secondaryButtonText}>Back to login</Text></Pressable>
              </>
            )}
          </Section>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.eyebrow}>Faculty Monitoring Dashboard</Text>
            <Text style={styles.heroTitle}>{user.name}</Text>
            <Text style={styles.heroText}>{roles[user.role]} access</Text>
            <Text style={styles.modeText}>Connected to {isFirebaseConfigured ? 'Firebase' : 'local demo data'}</Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>

        <TextInput style={styles.input} placeholder="Search courses, reports, attendance, ratings, or monitoring notes" value={search} onChangeText={setSearch} />

        <View style={styles.summaryGrid}>
          <SummaryCard label="Visible courses" value={summary.courses} />
          <SummaryCard label="Visible reports" value={summary.reports} tone="green" />
          <SummaryCard label="Attendance entries" value={summary.attendance} tone="gold" />
          <SummaryCard label="Users" value={summary.users} />
        </View>

        <Section title="Available modules" subtitle="Search works across every module list.">
          <View style={styles.chipWrap}>
            {moduleMap[user.role].map((name) => (
              <View key={name} style={styles.moduleChip}><Text style={styles.moduleChipText}>{name}</Text></View>
            ))}
          </View>
        </Section>

        {(user.role === 'lecturer' || user.role === 'principal_lecturer' || user.role === 'program_leader') && (
          <Section title="Courses" subtitle="Program Leader can add and assign modules to lecturers.">
            {user.role === 'program_leader' && (
              <>
                {Object.keys(blankCourse).map((key) => (
                  <TextInput key={key} style={styles.input} placeholder={key} value={String(courseForm[key])} onChangeText={(value) => setCourseForm({ ...courseForm, [key]: value })} />
                ))}
                <Pressable style={styles.primaryButton} onPress={saveCourse}><Text style={styles.primaryButtonText}>Add course assignment</Text></Pressable>
              </>
            )}
            <ListBlock
              items={visibleCourses}
              emptyMessage="No courses match the current search."
              render={(item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{item.courseName}</Text>
                  <Text style={styles.cardLine}>{item.courseCode} | {item.className}</Text>
                  <Text style={styles.cardLine}>Lecturer: {item.lecturerName}</Text>
                  <Text style={styles.cardLine}>PRL: {item.principalLecturerName}</Text>
                  <Text style={styles.cardLine}>Venue: {item.venue} | Time: {item.scheduledTime}</Text>
                  <Text style={styles.cardLine}>Registered students: {item.registeredStudents}</Text>
                </View>
              )}
            />
          </Section>
        )}

        {user.role === 'lecturer' && (
          <Section title="Lecturer Reporting Form" subtitle="Course code automatically fills registered students and class details.">
            {reportFields.map((key) => (
              <TextInput
                key={key}
                style={[styles.input, ['topicTaught', 'learningOutcomes', 'recommendations'].includes(key) && styles.multiLineInput]}
                placeholder={reportLabels[key]}
                value={reportForm[key]}
                onChangeText={(value) => updateReportField(key, value)}
                multiline={['topicTaught', 'learningOutcomes', 'recommendations'].includes(key)}
              />
            ))}
            <Pressable style={styles.primaryButton} onPress={saveReport}><Text style={styles.primaryButtonText}>Submit weekly report</Text></Pressable>
          </Section>
        )}

        <Section title="Reports" subtitle={user.role === 'principal_lecturer' ? 'Principal Lecturer can review reports and attach feedback.' : 'Reports are filtered by the logged-in role.'}>
          <ListBlock
            items={visibleReports}
            emptyMessage="No reports match the current search."
            render={(item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>{item.courseName} ({item.courseCode})</Text>
                <Text style={styles.cardLine}>Week: {item.weekOfReporting}</Text>
                <Text style={styles.cardLine}>Lecture date: {item.dateOfLecture}</Text>
                <Text style={styles.cardLine}>Attendance: {item.actualPresent}/{item.totalRegistered}</Text>
                <Text style={styles.cardLine}>Topic: {item.topicTaught}</Text>
                <Text style={styles.cardLine}>Outcomes: {item.learningOutcomes}</Text>
                <Text style={styles.cardLine}>Recommendation: {item.recommendations}</Text>
                <Text style={styles.cardLine}>Feedback: {item.feedback || 'No feedback yet'}</Text>
                {user.role === 'principal_lecturer' && (
                  <>
                    <TextInput style={[styles.input, styles.multiLineInput]} placeholder="Add feedback for this report" value={feedbackMap[item.id] || ''} onChangeText={(value) => setFeedbackMap((current) => ({ ...current, [item.id]: value }))} multiline />
                    <Pressable style={styles.secondaryButton} onPress={() => saveFeedback(item.id)}><Text style={styles.secondaryButtonText}>Save PRL feedback</Text></Pressable>
                  </>
                )}
              </View>
            )}
          />
        </Section>

        {(user.role === 'student' || user.role === 'lecturer') && (
          <Section title="Attendance" subtitle="Students can view attendance while lecturers can capture class attendance.">
            {user.role === 'lecturer' && (
              <>
                {Object.keys(blankAttendance).map((key) => (
                  <TextInput key={key} style={styles.input} placeholder={key} value={attendanceForm[key]} onChangeText={(value) => setAttendanceForm({ ...attendanceForm, [key]: value })} />
                ))}
                <Pressable style={styles.primaryButton} onPress={saveAttendance}><Text style={styles.primaryButtonText}>Capture attendance</Text></Pressable>
              </>
            )}
            <ListBlock
              items={visibleAttendance}
              emptyMessage="No attendance records match the current search."
              render={(item) => (
                <View key={item.id} style={styles.compactCard}>
                  <Text style={styles.cardLine}>{item.studentName} | {item.courseCode}</Text>
                  <Text style={styles.cardLine}>{item.status} on {item.date}</Text>
                </View>
              )}
            />
          </Section>
        )}

        <Section title="Rating" subtitle="All roles can submit and review ratings.">
          {Object.keys(blankRating).map((key) => (
            <TextInput key={key} style={[styles.input, key === 'comment' && styles.multiLineInput]} placeholder={key} value={ratingForm[key]} onChangeText={(value) => setRatingForm({ ...ratingForm, [key]: value })} multiline={key === 'comment'} />
          ))}
          <Pressable style={styles.primaryButton} onPress={saveRating}><Text style={styles.primaryButtonText}>Submit rating</Text></Pressable>
          <ListBlock
            items={visibleRatings}
            emptyMessage="No ratings match the current search."
            render={(item) => (
              <View key={item.id} style={styles.compactCard}>
                <Text style={styles.cardLine}>{item.target} | {item.score}/5</Text>
                <Text style={styles.cardLine}>{item.comment}</Text>
              </View>
            )}
          />
        </Section>

        <Section title="Monitoring" subtitle="Monitoring notes can be captured by any logged-in role.">
          <TextInput style={styles.input} placeholder="Monitoring title" value={monitoringForm.title} onChangeText={(value) => setMonitoringForm({ ...monitoringForm, title: value })} />
          <TextInput style={[styles.input, styles.multiLineInput]} placeholder="Monitoring note" value={monitoringForm.note} onChangeText={(value) => setMonitoringForm({ ...monitoringForm, note: value })} multiline />
          <Pressable style={styles.primaryButton} onPress={saveMonitoring}><Text style={styles.primaryButtonText}>Save monitoring note</Text></Pressable>
          <ListBlock
            items={visibleMonitoring}
            emptyMessage="No monitoring records match the current search."
            render={(item) => (
              <View key={item.id} style={styles.compactCard}>
                <Text style={styles.cardLine}>{item.title} | {item.owner}</Text>
                <Text style={styles.cardLine}>{item.note}</Text>
              </View>
            )}
          />
        </Section>

        <Section title="Submission note" subtitle="This Expo build is ready for a class demo.">
          <Text style={styles.helperText}>Run `npx expo start --lan` for mobile or `npx expo start --web` for browser. With Firebase configured, new accounts and records now save online.</Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3efe6' },
  loadingPage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16324f' },
  loadingText: { marginTop: 14, color: '#fff', fontSize: 16, fontWeight: '700' },
  container: { padding: 16, paddingBottom: 40 },
  hero: { backgroundColor: '#16324f', borderRadius: 28, padding: 22, marginBottom: 16 },
  dashboardHeader: { backgroundColor: '#16324f', borderRadius: 28, padding: 22, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  eyebrow: { color: '#f4c95d', fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 29, fontWeight: '900' },
  heroText: { color: '#dbe6ef', fontSize: 15, lineHeight: 22, marginTop: 8 },
  modeText: { color: '#f4c95d', fontSize: 13, marginTop: 8, fontWeight: '700' },
  section: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5ddd0' },
  sectionTitle: { fontSize: 21, fontWeight: '900', color: '#16324f' },
  sectionSubtitle: { marginTop: 6, marginBottom: 12, color: '#66768a', lineHeight: 20 },
  input: { backgroundColor: '#fbf8f2', borderColor: '#d8ccb8', borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: '#16324f', marginBottom: 10 },
  multiLineInput: { minHeight: 84, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: '#1c7c54', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryButton: { backgroundColor: '#efe5d0', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  secondaryButtonText: { color: '#7a5323', fontWeight: '800', fontSize: 15 },
  helperText: { color: '#56677a', lineHeight: 21 },
  statusText: { color: '#7a5323', fontWeight: '700', marginBottom: 10 },
  buttonDisabled: { opacity: 0.7 },
  logoutButton: { backgroundColor: '#d1495b', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  logoutButtonText: { color: '#fff', fontWeight: '800' },
  roleRow: { marginBottom: 8 },
  roleChip: { backgroundColor: '#efe7da', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, marginRight: 8 },
  roleChipActive: { backgroundColor: '#16324f' },
  roleChipText: { color: '#3f536c', fontWeight: '700' },
  roleChipTextActive: { color: '#fff' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  summaryCard: { width: '48%', backgroundColor: '#dbe6ef', borderRadius: 20, padding: 14, marginBottom: 10 },
  summaryGreen: { backgroundColor: '#ddefe4' },
  summaryGold: { backgroundColor: '#f6e7bf' },
  summaryValue: { fontSize: 26, fontWeight: '900', color: '#16324f' },
  summaryLabel: { color: '#43596f', marginTop: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  moduleChip: { backgroundColor: '#16324f', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  moduleChipText: { color: '#fff', fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#e4dacb', borderRadius: 18, padding: 14, marginBottom: 10, backgroundColor: '#fcfaf6' },
  compactCard: { borderWidth: 1, borderColor: '#e8dfd1', borderRadius: 16, padding: 12, marginBottom: 10, backgroundColor: '#fcfaf6' },
  cardTitle: { color: '#16324f', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  cardLine: { color: '#42556c', lineHeight: 21, marginBottom: 3 },
  emptyText: { color: '#7c8b9a', fontStyle: 'italic' },
});
