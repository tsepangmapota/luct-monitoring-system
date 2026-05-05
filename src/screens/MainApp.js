import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ActionButton,
  FormField,
  InlineActionRow,
  ListBlock,
  ModuleTabs,
  Section,
  SummaryCard,
} from '../components/AppUi';
import {
  attendanceFields,
  attendanceLabels,
  courseFields,
  courseLabels,
  createBlankAttendance,
  createBlankCourse,
  createBlankMonitoring,
  createBlankRating,
  createBlankReport,
  moduleMap,
  monitoringLabels,
  ratingFields,
  ratingLabels,
  ratingMultilineFields,
  reportFields,
  reportLabels,
  reportMultilineFields,
  roles,
} from '../constants/appConfig';
import { isFirebaseConfigured } from '../config/firebase';
import {
  deleteAttendanceRecord,
  deleteCourseRecord,
  deleteMonitoringRecord,
  deleteRatingRecord,
  deleteReportRecord,
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
  subscribeToAppData,
  updateAttendanceRecord,
  updateCourseRecord,
  updateMonitoringRecord,
  updateRatingRecord,
  updateReportRecord,
} from '../services/appDataService';
import { exportReportsToExcel } from '../utils/export';
import {
  validateLoginForm,
} from '../utils/validation';

const initialNotice = { tone: 'info', text: '' };

function prepareAccessibleSeed(profile) {
  const hasProfile = seed.users.some((item) => item.id === profile.id || item.email === profile.email);
  if (hasProfile) return seed;

  const now = new Date().toISOString();
  return {
    ...seed,
    users: [
      {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        createdAt: profile.createdAt || now,
        updatedAt: profile.updatedAt || now,
      },
      ...seed.users,
    ],
  };
}

export default function MainApp() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [screen, setScreen] = useState('login');
  const [data, setData] = useState(seed);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [activeModule, setActiveModule] = useState('Overview');
  const [notice, setNotice] = useState(initialNotice);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [reportForm, setReportForm] = useState(createBlankReport());
  const [courseForm, setCourseForm] = useState(createBlankCourse());
  const [attendanceForm, setAttendanceForm] = useState(createBlankAttendance());
  const [ratingForm, setRatingForm] = useState(createBlankRating());
  const [monitoringForm, setMonitoringForm] = useState(createBlankMonitoring());
  const [feedbackMap, setFeedbackMap] = useState({});
  const [courseEditingId, setCourseEditingId] = useState(null);
  const [reportEditingId, setReportEditingId] = useState(null);
  const [attendanceEditingId, setAttendanceEditingId] = useState(null);
  const [ratingEditingId, setRatingEditingId] = useState(null);
  const [monitoringEditingId, setMonitoringEditingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    async function bootstrap() {
      try {
        const [appData, profile] = await Promise.all([
          loadAppData(),
          getCurrentUserProfile(),
        ]);

        if (!mounted) return;
        setData(appData);
        if (profile) {
          setUser(profile);
        }

        if (isFirebaseConfigured) {
          unsubscribe = subscribeToAppData(
            (nextData) => {
              if (mounted) setData(nextData);
            },
            (error) => {
              if (!mounted) return;
              console.warn('Live Firestore updates are unavailable.', error);
            },
          );
        }
      } catch (error) {
        if (mounted) {
          setNotice({ tone: 'error', text: error.message || 'Unable to start the application.' });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    setActiveModule(moduleMap[user.role]?.[0] || 'Overview');
  }, [user]);

  const q = search.trim().toLowerCase();
  const matches = (value) => JSON.stringify(value).toLowerCase().includes(q);
  const availableModules = user ? moduleMap[user.role] || ['Overview'] : ['Overview'];

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
      const codes = new Set(
        data.courses
          .filter((item) => item.principalLecturerName === user.name)
          .map((item) => item.courseCode),
      );
      items = items.filter((item) => codes.has(item.courseCode));
    }
    if (user?.role === 'student') {
      const codes = new Set(
        data.attendance
          .filter((item) => item.studentName === user.name)
          .map((item) => item.courseCode),
      );
      items = items.filter((item) => codes.has(item.courseCode));
    }
    return items.filter(matches);
  }, [data.attendance, data.courses, data.reports, q, user]);

  const visibleAttendance = useMemo(() => {
    let items = data.attendance;
    if (user?.role === 'student') items = items.filter((item) => item.studentName === user.name);
    if (user?.role === 'lecturer') {
      const codes = new Set(
        data.courses
          .filter((item) => item.lecturerName === user.name)
          .map((item) => item.courseCode),
      );
      items = items.filter((item) => codes.has(item.courseCode));
    }
    return items.filter(matches);
  }, [data.attendance, data.courses, q, user]);

  const visibleRatings = useMemo(() => data.ratings.filter(matches), [data.ratings, q]);
  const visibleMonitoring = useMemo(() => data.monitoring.filter(matches), [data.monitoring, q]);

  const summary = {
    courses: visibleCourses.length,
    reports: visibleReports.length,
    attendance: visibleAttendance.length,
    users: data.users.length,
  };

  const showNotice = (tone, text) => setNotice({ tone, text });

  const resetCourseForm = () => {
    setCourseEditingId(null);
    setCourseForm(createBlankCourse());
  };

  const resetReportForm = () => {
    setReportEditingId(null);
    setReportForm(createBlankReport());
  };

  const resetAttendanceForm = () => {
    setAttendanceEditingId(null);
    setAttendanceForm(createBlankAttendance());
  };

  const resetRatingForm = () => {
    setRatingEditingId(null);
    setRatingForm(createBlankRating());
  };

  const resetMonitoringForm = () => {
    setMonitoringEditingId(null);
    setMonitoringForm(createBlankMonitoring());
  };

  const resetSessionDrafts = () => {
    resetCourseForm();
    resetReportForm();
    resetAttendanceForm();
    resetRatingForm();
    resetMonitoringForm();
    setFeedbackMap({});
  };

  const handleAsyncAction = async (actionKey, work, successMessage) => {
    setBusyAction(actionKey);
    try {
      const nextData = await work();
      if (nextData) setData(nextData);
      if (successMessage) {
        showNotice('success', successMessage);
      }
    } catch (error) {
      console.error(error);
      const message = error.message || 'Something went wrong.';
      showNotice('error', message);
      Alert.alert('Action failed', message);
    } finally {
      setBusyAction('');
    }
  };

  const handleLogin = async () => {
    await handleAsyncAction('login', async () => {
      validateLoginForm(loginForm);
      const profile = await loginUser(loginForm.email, loginForm.password);
      setUser(profile);
      setLoginForm({ email: '', password: '' });
      setSearch('');

      try {
        const freshData = await loadAppData();
        setData(freshData);
      } catch (error) {
        console.warn('Unable to refresh application data after login.', error);
        setData(prepareAccessibleSeed(profile));
      }

      return null;
    }, 'Login successful.');
  };

  const handleRegister = async () => {
    await handleAsyncAction('register', async () => {
      const createdUser = await registerUser(registerForm);
      const freshData = await loadAppData();
      setData(freshData);
      setRegisterForm({ name: '', email: '', password: '', role: 'student' });
      setScreen('login');
      if (createdUser.profileWriteFailed) {
        showNotice('error', 'Account created, but Firebase blocked the profile record. Deploy Firestore rules before using this account fully.');
        return null;
      }
      showNotice('success', 'Account created successfully. You can now log in.');
      return null;
    });
  };

  const handleLogout = async () => {
    await handleAsyncAction('logout', async () => {
      await logoutUser();
      setUser(null);
      setSearch('');
      resetSessionDrafts();
      return null;
    }, 'You have been logged out.');
  };

  const updateReportField = (key, value) => {
    const next = { ...reportForm, [key]: value };

    if (key === 'courseCode') {
      const match = data.courses.find(
        (item) => item.courseCode.toLowerCase() === value.trim().toLowerCase(),
      );

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

  const startCourseEdit = (item) => {
    setActiveModule('Courses');
    setCourseEditingId(item.id);
    setCourseForm({
      courseName: item.courseName || '',
      courseCode: item.courseCode || '',
      facultyName: item.facultyName || '',
      className: item.className || '',
      lecturerName: item.lecturerName || '',
      principalLecturerName: item.principalLecturerName || '',
      registeredStudents: String(item.registeredStudents ?? ''),
      venue: item.venue || '',
      scheduledTime: item.scheduledTime || '',
      stream: item.stream || '',
    });
    showNotice('info', 'Editing course allocation.');
  };

  const startReportEdit = (item) => {
    setActiveModule('Reports');
    setReportEditingId(item.id);
    setReportForm(Object.fromEntries(
      reportFields.map((key) => [key, String(item[key] ?? '')]),
    ));
    showNotice('info', 'Editing weekly report.');
  };

  const startAttendanceEdit = (item) => {
    setActiveModule('Student Attendance');
    setAttendanceEditingId(item.id);
    setAttendanceForm({
      courseCode: item.courseCode || '',
      studentName: item.studentName || '',
      status: item.status || 'Present',
      date: item.date || '',
    });
    showNotice('info', 'Editing attendance record.');
  };

  const startRatingEdit = (item) => {
    setActiveModule('Rating');
    setRatingEditingId(item.id);
    setRatingForm({
      target: item.target || '',
      score: String(item.score ?? '5'),
      comment: item.comment || '',
    });
    showNotice('info', 'Editing rating entry.');
  };

  const startMonitoringEdit = (item) => {
    setActiveModule('Monitoring');
    setMonitoringEditingId(item.id);
    setMonitoringForm({
      title: item.title || '',
      note: item.note || '',
    });
    showNotice('info', 'Editing monitoring note.');
  };

  const confirmDelete = (label, onConfirm) => {
    Alert.alert(
      `Delete ${label}`,
      `Are you sure you want to delete this ${label.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm },
      ],
    );
  };

  const submitCourse = async () => {
    await handleAsyncAction('save-course', async () => {
      const payload = {
        ...courseForm,
        assignedById: user.id,
      };

      if (courseEditingId) {
        const next = await updateCourseRecord(data, courseEditingId, payload);
        resetCourseForm();
        return next;
      }

      const next = await saveCourseRecord(data, payload);
      resetCourseForm();
      return next;
    }, courseEditingId ? 'Course allocation updated.' : 'Course allocation added.');
  };

  const submitReport = async () => {
    await handleAsyncAction('save-report', async () => {
      const existing = data.reports.find((item) => item.id === reportEditingId);
      const payload = {
        lecturerId: user.id,
        lecturerName: user.name,
        feedback: existing?.feedback || '',
        ...reportForm,
      };

      if (reportEditingId) {
        const next = await updateReportRecord(data, reportEditingId, payload);
        resetReportForm();
        return next;
      }

      const next = await saveReportRecord(data, payload);
      resetReportForm();
      return next;
    }, reportEditingId ? 'Weekly report updated.' : 'Weekly report submitted.');
  };

  const submitAttendance = async () => {
    await handleAsyncAction('save-attendance', async () => {
      const payload = {
        ...attendanceForm,
        capturedBy: user?.name || 'System',
        capturedById: user?.id || 'system',
      };

      if (attendanceEditingId) {
        const next = await updateAttendanceRecord(data, attendanceEditingId, payload);
        resetAttendanceForm();
        return next;
      }

      const next = await saveAttendanceRecord(data, payload);
      resetAttendanceForm();
      return next;
    }, attendanceEditingId ? 'Attendance updated.' : 'Attendance captured.');
  };

  const submitRating = async () => {
    await handleAsyncAction('save-rating', async () => {
      const payload = {
        ...ratingForm,
        authorId: user?.id || 'guest',
        authorName: user?.name || 'Guest',
      };

      if (ratingEditingId) {
        const next = await updateRatingRecord(data, ratingEditingId, payload);
        resetRatingForm();
        return next;
      }

      const next = await saveRatingRecord(data, payload);
      resetRatingForm();
      return next;
    }, ratingEditingId ? 'Rating updated.' : 'Rating submitted.');
  };

  const submitMonitoring = async () => {
    await handleAsyncAction('save-monitoring', async () => {
      const payload = {
        ...monitoringForm,
        owner: user?.name || 'System',
        ownerId: user?.id || 'system',
      };

      if (monitoringEditingId) {
        const next = await updateMonitoringRecord(data, monitoringEditingId, payload);
        resetMonitoringForm();
        return next;
      }

      const next = await saveMonitoringRecord(data, payload);
      resetMonitoringForm();
      return next;
    }, monitoringEditingId ? 'Monitoring note updated.' : 'Monitoring note saved.');
  };

  const submitFeedback = async (id) => {
    await handleAsyncAction(`feedback-${id}`, async () => {
      const next = await saveReportFeedback(data, id, feedbackMap[id]);
      setFeedbackMap((current) => ({ ...current, [id]: '' }));
      return next;
    }, 'Feedback added to report.');
  };

  const downloadReports = async () => {
    await handleAsyncAction('download-reports', async () => {
      const filename = exportReportsToExcel(visibleReports);
      showNotice('success', `${filename} downloaded successfully.`);
      return null;
    });
  };

  const canManageCourses = user?.role === 'program_leader';
  const canProvideFeedback = user?.role === 'principal_lecturer';
  const canManageReports = user?.role === 'lecturer';
  const canManageAttendance = user?.role === 'lecturer';

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
        <StatusBar barStyle="light-content" backgroundColor="#050505" />
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.authHero}>
            <Text style={styles.eyebrow}>Faculty Monitoring</Text>
            <Text style={styles.heroTitle}>LUCT Faculty Reporting App</Text>
          </View>

          {notice.text ? (
            <View style={[styles.notice, notice.tone === 'error' && styles.noticeError, notice.tone === 'success' && styles.noticeSuccess]}>
              <Text style={styles.noticeText}>{notice.text}</Text>
            </View>
          ) : null}

          <Section title={screen === 'login' ? 'Login' : 'Register'}>
            {screen === 'login' ? (
              <>
                <FormField
                  label="Email Address"
                  value={loginForm.email}
                  onChangeText={(value) => setLoginForm({ ...loginForm, email: value })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <FormField
                  label="Password"
                  value={loginForm.password}
                  onChangeText={(value) => setLoginForm({ ...loginForm, password: value })}
                  autoCapitalize="none"
                  secureTextEntry
                />
                <InlineActionRow>
                  <ActionButton
                    label={busyAction === 'login' ? 'Working...' : 'Login'}
                    onPress={handleLogin}
                    disabled={busyAction === 'login'}
                  />
                  <ActionButton
                    label="Create account"
                    tone="secondary"
                    onPress={() => setScreen('register')}
                    disabled={!!busyAction}
                  />
                </InlineActionRow>
              </>
            ) : (
              <>
                <FormField
                  label="Full Name"
                  value={registerForm.name}
                  onChangeText={(value) => setRegisterForm({ ...registerForm, name: value })}
                />
                <FormField
                  label="Email Address"
                  value={registerForm.email}
                  onChangeText={(value) => setRegisterForm({ ...registerForm, email: value })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <FormField
                  label="Password"
                  value={registerForm.password}
                  onChangeText={(value) => setRegisterForm({ ...registerForm, password: value })}
                  autoCapitalize="none"
                  secureTextEntry
                />
                <Text style={styles.inlineLabel}>Choose Role</Text>
                <ModuleTabs
                  items={Object.values(roles)}
                  activeItem={roles[registerForm.role]}
                  onSelect={(label) => {
                    const match = Object.entries(roles).find(([, value]) => value === label);
                    if (match) {
                      setRegisterForm({ ...registerForm, role: match[0] });
                    }
                  }}
                />
                <InlineActionRow>
                  <ActionButton
                    label={busyAction === 'register' ? 'Working...' : 'Register'}
                    onPress={handleRegister}
                    disabled={busyAction === 'register'}
                  />
                  <ActionButton
                    label="Back to login"
                    tone="secondary"
                    onPress={() => setScreen('login')}
                    disabled={!!busyAction}
                  />
                </InlineActionRow>
              </>
            )}
          </Section>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.dashboardHeader}>
          <View style={styles.dashboardHeaderText}>
            <Text style={styles.eyebrow}>Faculty Monitoring Dashboard</Text>
            <Text style={styles.heroTitle}>{user.name}</Text>
          </View>
          <ActionButton
            label={busyAction === 'logout' ? 'Working...' : 'Logout'}
            tone="danger"
            onPress={handleLogout}
            disabled={busyAction === 'logout'}
          />
        </View>

        {notice.text ? (
          <View style={[styles.notice, notice.tone === 'error' && styles.noticeError, notice.tone === 'success' && styles.noticeSuccess]}>
            <Text style={styles.noticeText}>{notice.text}</Text>
          </View>
        ) : null}

        <Section title="Search">
          <FormField
            label="Search"
            value={search}
            onChangeText={setSearch}
          />
          <ModuleTabs items={availableModules} activeItem={activeModule} onSelect={setActiveModule} />
        </Section>

        <Section title="Overview">
          <View style={styles.summaryGrid}>
            <SummaryCard label="Visible courses" value={summary.courses} compact={compact} />
            <SummaryCard label="Visible reports" value={summary.reports} tone="green" compact={compact} />
            <SummaryCard label="Attendance entries" value={summary.attendance} tone="gold" compact={compact} />
            <SummaryCard label="Registered users" value={summary.users} compact={compact} />
          </View>
        </Section>

        {(activeModule === 'Courses' || activeModule === 'Classes' || activeModule === 'Lecturers') && (
          <Section title="Courses and Classes">
            {canManageCourses ? (
              <>
                {courseFields.map((key) => (
                  <FormField
                    key={key}
                    label={courseLabels[key]}
                    value={courseForm[key]}
                    onChangeText={(value) => setCourseForm({ ...courseForm, [key]: value })}
                    keyboardType={key === 'registeredStudents' ? 'numeric' : 'default'}
                  />
                ))}
                <InlineActionRow>
                  <ActionButton
                    label={busyAction === 'save-course' ? 'Saving...' : courseEditingId ? 'Update course' : 'Add course allocation'}
                    onPress={submitCourse}
                    disabled={busyAction === 'save-course'}
                  />
                  {courseEditingId ? (
                    <ActionButton label="Cancel edit" tone="secondary" onPress={resetCourseForm} disabled={!!busyAction} />
                  ) : null}
                </InlineActionRow>
              </>
            ) : null}

            <ListBlock
              items={visibleCourses}
              emptyMessage="No courses match the current search."
              render={(item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{item.courseName}</Text>
                  <Text style={styles.cardLine}>{item.courseCode} | {item.className}</Text>
                  <Text style={styles.cardLine}>Faculty: {item.facultyName}</Text>
                  <Text style={styles.cardLine}>Lecturer: {item.lecturerName}</Text>
                  <Text style={styles.cardLine}>PRL: {item.principalLecturerName}</Text>
                  <Text style={styles.cardLine}>Venue: {item.venue} | Time: {item.scheduledTime}</Text>
                  <Text style={styles.cardLine}>Registered students: {item.registeredStudents}</Text>
                  {canManageCourses ? (
                    <InlineActionRow>
                      <ActionButton label="Edit" tone="secondary" onPress={() => startCourseEdit(item)} disabled={!!busyAction} />
                      <ActionButton
                        label="Delete"
                        tone="danger"
                        disabled={!!busyAction}
                        onPress={() => confirmDelete('course allocation', () => {
                          handleAsyncAction(`delete-course-${item.id}`, async () => deleteCourseRecord(data, item.id), 'Course allocation deleted.');
                        })}
                      />
                    </InlineActionRow>
                  ) : null}
                </View>
              )}
            />
          </Section>
        )}

        {activeModule === 'Reports' && (
          <Section
            title="Reports"
            rightAction={(
              <ActionButton
                label={busyAction === 'download-reports' ? 'Preparing...' : 'Download Excel'}
                tone="secondary"
                onPress={downloadReports}
                disabled={busyAction === 'download-reports' || !visibleReports.length}
              />
            )}
          >
            {canManageReports ? (
              <>
                {reportFields.map((key) => (
                  <FormField
                    key={key}
                    label={reportLabels[key]}
                    value={reportForm[key]}
                    onChangeText={(value) => updateReportField(key, value)}
                    multiline={reportMultilineFields.includes(key)}
                    keyboardType={['actualPresent', 'totalRegistered'].includes(key) ? 'numeric' : 'default'}
                  />
                ))}
                <InlineActionRow>
                  <ActionButton
                    label={busyAction === 'save-report' ? 'Saving...' : reportEditingId ? 'Update report' : 'Submit weekly report'}
                    onPress={submitReport}
                    disabled={busyAction === 'save-report'}
                  />
                  {reportEditingId ? (
                    <ActionButton label="Cancel edit" tone="secondary" onPress={resetReportForm} disabled={!!busyAction} />
                  ) : null}
                </InlineActionRow>
              </>
            ) : null}

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
                  {canProvideFeedback ? (
                    <>
                      <FormField
                        label="Principal Lecturer Feedback"
                        value={feedbackMap[item.id] || ''}
                        onChangeText={(value) => setFeedbackMap((current) => ({ ...current, [item.id]: value }))}
                        multiline
                      />
                      <InlineActionRow>
                        <ActionButton
                          label={busyAction === `feedback-${item.id}` ? 'Saving...' : 'Save feedback'}
                          tone="secondary"
                          onPress={() => submitFeedback(item.id)}
                          disabled={busyAction === `feedback-${item.id}`}
                        />
                      </InlineActionRow>
                    </>
                  ) : null}
                  {canManageReports ? (
                    <InlineActionRow>
                      <ActionButton label="Edit" tone="secondary" onPress={() => startReportEdit(item)} disabled={!!busyAction} />
                      <ActionButton
                        label="Delete"
                        tone="danger"
                        disabled={!!busyAction}
                        onPress={() => confirmDelete('weekly report', () => {
                          handleAsyncAction(`delete-report-${item.id}`, async () => deleteReportRecord(data, item.id), 'Weekly report deleted.');
                        })}
                      />
                    </InlineActionRow>
                  ) : null}
                </View>
              )}
            />
          </Section>
        )}

        {(activeModule === 'Attendance' || activeModule === 'Student Attendance') && (
          <Section title="Attendance">
            {canManageAttendance ? (
              <>
                {attendanceFields.map((key) => (
                  <FormField
                    key={key}
                    label={attendanceLabels[key]}
                    value={attendanceForm[key]}
                    onChangeText={(value) => setAttendanceForm({ ...attendanceForm, [key]: value })}
                  />
                ))}
                <InlineActionRow>
                  <ActionButton
                    label={busyAction === 'save-attendance' ? 'Saving...' : attendanceEditingId ? 'Update attendance' : 'Capture attendance'}
                    onPress={submitAttendance}
                    disabled={busyAction === 'save-attendance'}
                  />
                  {attendanceEditingId ? (
                    <ActionButton label="Cancel edit" tone="secondary" onPress={resetAttendanceForm} disabled={!!busyAction} />
                  ) : null}
                </InlineActionRow>
              </>
            ) : null}

            <ListBlock
              items={visibleAttendance}
              emptyMessage="No attendance records match the current search."
              render={(item) => (
                <View key={item.id} style={styles.compactCard}>
                  <Text style={styles.cardLine}>{item.studentName} | {item.courseCode}</Text>
                  <Text style={styles.cardLine}>{item.status} on {item.date}</Text>
                  <Text style={styles.cardLine}>Captured by: {item.capturedBy}</Text>
                  {canManageAttendance ? (
                    <InlineActionRow>
                      <ActionButton label="Edit" tone="secondary" onPress={() => startAttendanceEdit(item)} disabled={!!busyAction} />
                      <ActionButton
                        label="Delete"
                        tone="danger"
                        disabled={!!busyAction}
                        onPress={() => confirmDelete('attendance record', () => {
                          handleAsyncAction(`delete-attendance-${item.id}`, async () => deleteAttendanceRecord(data, item.id), 'Attendance record deleted.');
                        })}
                      />
                    </InlineActionRow>
                  ) : null}
                </View>
              )}
            />
          </Section>
        )}

        {activeModule === 'Rating' && (
          <Section title="Rating">
            {ratingFields.map((key) => (
              <FormField
                key={key}
                label={ratingLabels[key]}
                value={ratingForm[key]}
                onChangeText={(value) => setRatingForm({ ...ratingForm, [key]: value })}
                multiline={ratingMultilineFields.includes(key)}
                keyboardType={key === 'score' ? 'numeric' : 'default'}
              />
            ))}
            <InlineActionRow>
              <ActionButton
                label={busyAction === 'save-rating' ? 'Saving...' : ratingEditingId ? 'Update rating' : 'Submit rating'}
                onPress={submitRating}
                disabled={busyAction === 'save-rating'}
              />
              {ratingEditingId ? (
                <ActionButton label="Cancel edit" tone="secondary" onPress={resetRatingForm} disabled={!!busyAction} />
              ) : null}
            </InlineActionRow>

            <ListBlock
              items={visibleRatings}
              emptyMessage="No ratings match the current search."
              render={(item) => {
                const canEditItem = item.authorId === user.id;

                return (
                  <View key={item.id} style={styles.compactCard}>
                    <Text style={styles.cardLine}>{item.target} | {item.score}/5</Text>
                    <Text style={styles.cardLine}>{item.comment}</Text>
                    <Text style={styles.cardLine}>Submitted by: {item.authorName || 'Anonymous'}</Text>
                    {canEditItem ? (
                      <InlineActionRow>
                        <ActionButton label="Edit" tone="secondary" onPress={() => startRatingEdit(item)} disabled={!!busyAction} />
                        <ActionButton
                          label="Delete"
                          tone="danger"
                          disabled={!!busyAction}
                          onPress={() => confirmDelete('rating entry', () => {
                            handleAsyncAction(`delete-rating-${item.id}`, async () => deleteRatingRecord(data, item.id), 'Rating deleted.');
                          })}
                        />
                      </InlineActionRow>
                    ) : null}
                  </View>
                );
              }}
            />
          </Section>
        )}

        {activeModule === 'Monitoring' && (
          <Section title="Monitoring">
            <FormField
              label={monitoringLabels.title}
              value={monitoringForm.title}
              onChangeText={(value) => setMonitoringForm({ ...monitoringForm, title: value })}
            />
            <FormField
              label={monitoringLabels.note}
              value={monitoringForm.note}
              onChangeText={(value) => setMonitoringForm({ ...monitoringForm, note: value })}
              multiline
            />
            <InlineActionRow>
              <ActionButton
                label={busyAction === 'save-monitoring' ? 'Saving...' : monitoringEditingId ? 'Update monitoring' : 'Save monitoring note'}
                onPress={submitMonitoring}
                disabled={busyAction === 'save-monitoring'}
              />
              {monitoringEditingId ? (
                <ActionButton label="Cancel edit" tone="secondary" onPress={resetMonitoringForm} disabled={!!busyAction} />
              ) : null}
            </InlineActionRow>

            <ListBlock
              items={visibleMonitoring}
              emptyMessage="No monitoring records match the current search."
              render={(item) => {
                const canEditItem = item.ownerId === user.id || item.owner === user.name;

                return (
                  <View key={item.id} style={styles.compactCard}>
                    <Text style={styles.cardLine}>{item.title} | {item.owner}</Text>
                    <Text style={styles.cardLine}>{item.note}</Text>
                    {canEditItem ? (
                      <InlineActionRow>
                        <ActionButton label="Edit" tone="secondary" onPress={() => startMonitoringEdit(item)} disabled={!!busyAction} />
                        <ActionButton
                          label="Delete"
                          tone="danger"
                          disabled={!!busyAction}
                          onPress={() => confirmDelete('monitoring note', () => {
                            handleAsyncAction(`delete-monitoring-${item.id}`, async () => deleteMonitoringRecord(data, item.id), 'Monitoring note deleted.');
                          })}
                        />
                      </InlineActionRow>
                    ) : null}
                  </View>
                );
              }}
            />
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#050505',
  },
  loadingPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050505',
  },
  loadingText: {
    marginTop: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 40,
  },
  authHero: {
    backgroundColor: '#0d0f13',
    borderWidth: 1,
    borderColor: '#242831',
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
  },
  dashboardHeader: {
    backgroundColor: '#0d0f13',
    borderWidth: 1,
    borderColor: '#242831',
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  dashboardHeaderText: {
    flex: 1,
  },
  eyebrow: {
    color: '#f5c84c',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 29,
    fontWeight: '900',
  },
  heroText: {
    color: '#c3c9d2',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  notice: {
    backgroundColor: '#17191f',
    borderWidth: 1,
    borderColor: '#323842',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  noticeSuccess: {
    backgroundColor: '#10281e',
    borderColor: '#1f6b49',
  },
  noticeError: {
    backgroundColor: '#33141a',
    borderColor: '#783242',
  },
  noticeText: {
    color: '#f1f3f5',
    fontWeight: '700',
    lineHeight: 20,
  },
  helperText: {
    color: '#a8adb6',
    lineHeight: 21,
    marginTop: 12,
  },
  inlineLabel: {
    color: '#c9cdd4',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewPanel: {
    marginTop: 10,
    borderRadius: 18,
    backgroundColor: '#0a0b0e',
    borderWidth: 1,
    borderColor: '#292d35',
    padding: 14,
  },
  overviewText: {
    color: '#c8cdd5',
    lineHeight: 21,
    marginBottom: 6,
  },
  card: {
    borderWidth: 1,
    borderColor: '#292d35',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#0a0b0e',
  },
  compactCard: {
    borderWidth: 1,
    borderColor: '#292d35',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#0a0b0e',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardLine: {
    color: '#c8cdd5',
    lineHeight: 21,
    marginBottom: 3,
  },
});
