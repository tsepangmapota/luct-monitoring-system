import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
import {
  normalizeEmail,
  normalizeText,
  sanitizeAttendanceRecord,
  sanitizeCourseRecord,
  sanitizeMonitoringRecord,
  sanitizeRatingRecord,
  sanitizeReportRecord,
  validateAttendanceRecord,
  validateCourseRecord,
  validateMonitoringRecord,
  validateRatingRecord,
  validateRegistrationForm,
  validateReportRecord,
} from '../utils/validation';

const STORAGE_KEY = 'luct-monitoring-system-v3';
const collectionNames = ['users', 'courses', 'reports', 'ratings', 'attendance', 'monitoring'];
const idPrefixes = {
  users: 'u',
  courses: 'c',
  reports: 'r',
  ratings: 'ra',
  attendance: 'a',
  monitoring: 'm',
};

export const seed = {
  users: [
    { id: 'u1', name: 'Student Demo', email: 'student@luct.ac.ls', password: '123456', role: 'student', createdAt: '2026-03-14T08:00:00.000Z', updatedAt: '2026-03-14T08:00:00.000Z' },
    { id: 'u2', name: 'Lecturer Demo', email: 'lecturer@luct.ac.ls', password: '123456', role: 'lecturer', createdAt: '2026-03-14T08:00:00.000Z', updatedAt: '2026-03-14T08:00:00.000Z' },
    { id: 'u3', name: 'PRL Demo', email: 'prl@luct.ac.ls', password: '123456', role: 'principal_lecturer', createdAt: '2026-03-14T08:00:00.000Z', updatedAt: '2026-03-14T08:00:00.000Z' },
    { id: 'u4', name: 'PL Demo', email: 'pl@luct.ac.ls', password: '123456', role: 'program_leader', createdAt: '2026-03-14T08:00:00.000Z', updatedAt: '2026-03-14T08:00:00.000Z' },
  ],
  courses: [
    { id: 'c1', courseName: 'Mobile Device Programming', courseCode: 'BIMP2210', facultyName: 'Faculty of Information Communication Technology', className: 'BSc Software Engineering Semester 2', lecturerName: 'Lecturer Demo', principalLecturerName: 'PRL Demo', registeredStudents: 42, venue: 'Lab 4', scheduledTime: '08:00 - 10:00', stream: 'Software Engineering with Multimedia', assignedById: 'u4', createdAt: '2026-03-14T08:00:00.000Z', updatedAt: '2026-03-14T08:00:00.000Z' },
    { id: 'c2', courseName: 'Human Computer Interaction', courseCode: 'BSEM2208', facultyName: 'Faculty of Information Communication Technology', className: 'BSc Software Engineering Semester 2', lecturerName: 'Lecturer Demo', principalLecturerName: 'PRL Demo', registeredStudents: 38, venue: 'Studio 2', scheduledTime: '11:00 - 13:00', stream: 'Software Engineering with Multimedia', assignedById: 'u4', createdAt: '2026-03-14T08:00:00.000Z', updatedAt: '2026-03-14T08:00:00.000Z' },
  ],
  reports: [
    { id: 'r1', lecturerId: 'u2', facultyName: 'Faculty of Information Communication Technology', className: 'BSc Software Engineering Semester 2', weekOfReporting: 'Week 6', dateOfLecture: '2026-03-31', courseName: 'Mobile Device Programming', courseCode: 'BIMP2210', lecturerName: 'Lecturer Demo', actualPresent: '39', totalRegistered: '42', venue: 'Lab 4', scheduledTime: '08:00 - 10:00', topicTaught: 'Introduction to React Native navigation and form handling.', learningOutcomes: 'Students can identify screens, collect user input, and manage simple state.', recommendations: 'Need more practical lab time for state management exercises.', feedback: 'Good coverage. Please include screenshots in the next weekly report.', createdAt: '2026-03-31T08:00:00.000Z', updatedAt: '2026-03-31T08:00:00.000Z' },
  ],
  ratings: [
    { id: 'ra1', authorId: 'u1', authorName: 'Student Demo', target: 'Mobile Device Programming', score: 4, comment: 'The lecture was practical and easy to follow.', createdAt: '2026-03-31T08:00:00.000Z', updatedAt: '2026-03-31T08:00:00.000Z' },
  ],
  attendance: [
    { id: 'a1', courseCode: 'BIMP2210', studentName: 'Student Demo', status: 'Present', date: '2026-03-31', capturedBy: 'Lecturer Demo', capturedById: 'u2', createdAt: '2026-03-31T08:00:00.000Z', updatedAt: '2026-03-31T08:00:00.000Z' },
    { id: 'a2', courseCode: 'BSEM2208', studentName: 'Student Demo', status: 'Present', date: '2026-03-30', capturedBy: 'Lecturer Demo', capturedById: 'u2', createdAt: '2026-03-30T08:00:00.000Z', updatedAt: '2026-03-30T08:00:00.000Z' },
  ],
  monitoring: [
    { id: 'm1', title: 'Week 6 monitoring', note: 'Classes started on time and lab equipment was available.', owner: 'Program Leader', ownerId: 'u4', createdAt: '2026-03-31T08:00:00.000Z', updatedAt: '2026-03-31T08:00:00.000Z' },
    { id: 'm2', title: 'Student engagement', note: 'Attendance remained above ninety percent in scheduled classes.', owner: 'Principal Lecturer', ownerId: 'u3', createdAt: '2026-03-31T08:00:00.000Z', updatedAt: '2026-03-31T08:00:00.000Z' },
  ],
};

function createEmptyData() {
  return collectionNames.reduce((accumulator, name) => ({ ...accumulator, [name]: [] }), {});
}

function sortByRecent(a, b) {
  const left = new Date(a.updatedAt || a.createdAt || 0).getTime();
  const right = new Date(b.updatedAt || b.createdAt || 0).getTime();
  if (right !== left) return right - left;
  return String(b.id || '').localeCompare(String(a.id || ''));
}

function prepareDataSnapshot(snapshot) {
  return collectionNames.reduce(
    (accumulator, name) => ({
      ...accumulator,
      [name]: [...(snapshot[name] || [])].sort(sortByRecent),
    }),
    createEmptyData(),
  );
}

function withTimestamps(payload, existing = {}) {
  const now = new Date().toISOString();
  return {
    ...payload,
    createdAt: existing.createdAt || payload.createdAt || now,
    updatedAt: now,
  };
}

const saveLocalData = (value) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));

async function loadLocalData() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) return prepareDataSnapshot(JSON.parse(raw));
  const seeded = prepareDataSnapshot(seed);
  await saveLocalData(seeded);
  return seeded;
}

async function loadRemoteCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort(sortByRecent);
}

async function seedRemoteDataIfEmpty() {
  const coursesSnapshot = await getDocs(collection(db, 'courses'));
  if (!coursesSnapshot.empty) return;

  for (const name of collectionNames) {
    for (const record of seed[name]) {
      if (name === 'users') continue;
      const { id, ...payload } = record;
      await addDoc(collection(db, name), withTimestamps(payload, payload));
    }
  }
}

async function loadRemoteData() {
  await seedRemoteDataIfEmpty();
  const [users, courses, reports, ratings, attendance, monitoring] = await Promise.all(
    collectionNames.map(loadRemoteCollection),
  );
  return prepareDataSnapshot({ users, courses, reports, ratings, attendance, monitoring });
}

export function subscribeToAppData(onData, onError) {
  if (!isFirebaseConfigured) return () => {};

  const current = createEmptyData();
  const unsubscribers = collectionNames.map((name) => onSnapshot(
    collection(db, name),
    (snapshot) => {
      current[name] = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort(sortByRecent);
      onData(prepareDataSnapshot(current));
    },
    onError,
  ));

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

async function getRemoteProfile(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export async function loadAppData() {
  return isFirebaseConfigured ? loadRemoteData() : loadLocalData();
}

export async function getCurrentUserProfile() {
  if (!isFirebaseConfigured || !auth?.currentUser) return null;
  return getRemoteProfile(auth.currentUser.uid);
}

export async function loginUser(email, password) {
  if (!isFirebaseConfigured) {
    const data = await loadLocalData();
    const normalizedEmail = normalizeEmail(email);
    const user = data.users.find(
      (item) => item.email === normalizedEmail && item.password === password,
    );
    if (!user) throw new Error('Use a demo account or register a new one.');
    return user;
  }

  const result = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  const profile = await getRemoteProfile(result.user.uid);
  if (profile) return profile;

  const fallbackProfile = withTimestamps({
    name: result.user.email?.split('@')[0] || 'New User',
    email: result.user.email || normalizeEmail(email),
    role: 'student',
  });

  await setDoc(doc(db, 'users', result.user.uid), fallbackProfile);
  return { id: result.user.uid, ...fallbackProfile };
}

export async function registerUser(form) {
  validateRegistrationForm(form);
  const normalizedEmail = normalizeEmail(form.email);

  if (!isFirebaseConfigured) {
    const data = await loadLocalData();
    if (data.users.some((item) => item.email === normalizedEmail)) {
      throw new Error('Use a different email address.');
    }

    const user = withTimestamps({
      id: `u${Date.now()}`,
      name: normalizeText(form.name),
      email: normalizedEmail,
      password: form.password,
      role: form.role,
    });
    const next = prepareDataSnapshot({ ...data, users: [user, ...data.users] });
    await saveLocalData(next);
    return user;
  }

  const result = await createUserWithEmailAndPassword(auth, normalizedEmail, form.password);
  const profile = withTimestamps({
    name: normalizeText(form.name),
    email: normalizedEmail,
    role: form.role,
  });
  await setDoc(doc(db, 'users', result.user.uid), profile);
  await signOut(auth);
  return { id: result.user.uid, ...profile };
}

export async function logoutUser() {
  if (isFirebaseConfigured) {
    await signOut(auth);
  }
}

async function createLocalRecord(data, name, payload) {
  const record = withTimestamps({
    id: `${idPrefixes[name]}${Date.now()}`,
    ...payload,
  });
  const next = prepareDataSnapshot({
    ...data,
    [name]: [record, ...(data[name] || [])],
  });
  await saveLocalData(next);
  return next;
}

async function updateLocalRecord(data, name, id, payload) {
  const next = prepareDataSnapshot({
    ...data,
    [name]: (data[name] || []).map((item) => (
      item.id === id ? { ...item, ...withTimestamps(payload, item) } : item
    )),
  });
  await saveLocalData(next);
  return next;
}

async function deleteLocalRecord(data, name, id) {
  const next = prepareDataSnapshot({
    ...data,
    [name]: (data[name] || []).filter((item) => item.id !== id),
  });
  await saveLocalData(next);
  return next;
}

async function createRemoteRecord(name, payload) {
  await addDoc(collection(db, name), withTimestamps(payload));
  return null;
}

async function updateRemoteRecord(name, id, payload) {
  const reference = doc(db, name, id);
  const snapshot = await getDoc(reference);
  const existing = snapshot.exists() ? snapshot.data() : {};
  await updateDoc(reference, withTimestamps(payload, existing));
  return null;
}

async function deleteRemoteRecord(name, id) {
  await deleteDoc(doc(db, name, id));
  return null;
}

async function createRecord(data, name, payload) {
  if (!isFirebaseConfigured) {
    return createLocalRecord(data, name, payload);
  }
  return createRemoteRecord(name, payload);
}

async function updateRecord(data, name, id, payload) {
  if (!isFirebaseConfigured) {
    return updateLocalRecord(data, name, id, payload);
  }
  return updateRemoteRecord(name, id, payload);
}

async function deleteRecord(data, name, id) {
  if (!isFirebaseConfigured) {
    return deleteLocalRecord(data, name, id);
  }
  return deleteRemoteRecord(name, id);
}

export async function saveCourseRecord(data, payload) {
  validateCourseRecord(payload);
  return createRecord(data, 'courses', sanitizeCourseRecord(payload));
}

export async function updateCourseRecord(data, id, payload) {
  validateCourseRecord(payload);
  return updateRecord(data, 'courses', id, sanitizeCourseRecord(payload));
}

export async function deleteCourseRecord(data, id) {
  return deleteRecord(data, 'courses', id);
}

export async function saveReportRecord(data, payload) {
  validateReportRecord(payload);
  return createRecord(data, 'reports', sanitizeReportRecord(payload));
}

export async function updateReportRecord(data, id, payload) {
  validateReportRecord(payload);
  return updateRecord(data, 'reports', id, sanitizeReportRecord(payload));
}

export async function deleteReportRecord(data, id) {
  return deleteRecord(data, 'reports', id);
}

export async function saveAttendanceRecord(data, payload) {
  validateAttendanceRecord(payload);
  return createRecord(data, 'attendance', sanitizeAttendanceRecord(payload));
}

export async function updateAttendanceRecord(data, id, payload) {
  validateAttendanceRecord(payload);
  return updateRecord(data, 'attendance', id, sanitizeAttendanceRecord(payload));
}

export async function deleteAttendanceRecord(data, id) {
  return deleteRecord(data, 'attendance', id);
}

export async function saveRatingRecord(data, payload) {
  validateRatingRecord(payload);
  return createRecord(data, 'ratings', sanitizeRatingRecord(payload));
}

export async function updateRatingRecord(data, id, payload) {
  validateRatingRecord(payload);
  return updateRecord(data, 'ratings', id, sanitizeRatingRecord(payload));
}

export async function deleteRatingRecord(data, id) {
  return deleteRecord(data, 'ratings', id);
}

export async function saveMonitoringRecord(data, payload) {
  validateMonitoringRecord(payload);
  return createRecord(data, 'monitoring', sanitizeMonitoringRecord(payload));
}

export async function updateMonitoringRecord(data, id, payload) {
  validateMonitoringRecord(payload);
  return updateRecord(data, 'monitoring', id, sanitizeMonitoringRecord(payload));
}

export async function deleteMonitoringRecord(data, id) {
  return deleteRecord(data, 'monitoring', id);
}

export async function saveReportFeedback(data, reportId, feedback) {
  const trimmedFeedback = normalizeText(feedback);
  if (!trimmedFeedback) {
    throw new Error('Write feedback before saving.');
  }

  if (!isFirebaseConfigured) {
    const next = prepareDataSnapshot({
      ...data,
      reports: data.reports.map((item) => (
        item.id === reportId ? { ...item, feedback: trimmedFeedback, updatedAt: new Date().toISOString() } : item
      )),
    });
    await saveLocalData(next);
    return next;
  }

  await updateDoc(doc(db, 'reports', reportId), {
    feedback: trimmedFeedback,
    updatedAt: new Date().toISOString(),
  });
  return null;
}
