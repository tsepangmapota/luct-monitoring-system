import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '../config/firebase';

const STORAGE_KEY = 'luct-monitoring-system-v2';

export const seed = {
  users: [
    { id: 'u1', name: 'Student Demo', email: 'student@luct.ac.ls', password: '123456', role: 'student' },
    { id: 'u2', name: 'Lecturer Demo', email: 'lecturer@luct.ac.ls', password: '123456', role: 'lecturer' },
    { id: 'u3', name: 'PRL Demo', email: 'prl@luct.ac.ls', password: '123456', role: 'principal_lecturer' },
    { id: 'u4', name: 'PL Demo', email: 'pl@luct.ac.ls', password: '123456', role: 'program_leader' },
  ],
  courses: [
    { id: 'c1', courseName: 'Mobile Device Programming', courseCode: 'BIMP2210', facultyName: 'Faculty of Information Communication Technology', className: 'BSc Software Engineering Semester 2', lecturerName: 'Lecturer Demo', principalLecturerName: 'PRL Demo', registeredStudents: 42, venue: 'Lab 4', scheduledTime: '08:00 - 10:00', stream: 'Software Engineering with Multimedia' },
    { id: 'c2', courseName: 'Human Computer Interaction', courseCode: 'BSEM2208', facultyName: 'Faculty of Information Communication Technology', className: 'BSc Software Engineering Semester 2', lecturerName: 'Lecturer Demo', principalLecturerName: 'PRL Demo', registeredStudents: 38, venue: 'Studio 2', scheduledTime: '11:00 - 13:00', stream: 'Software Engineering with Multimedia' },
  ],
  reports: [
    { id: 'r1', lecturerId: 'u2', facultyName: 'Faculty of Information Communication Technology', className: 'BSc Software Engineering Semester 2', weekOfReporting: 'Week 6', dateOfLecture: '2026-03-31', courseName: 'Mobile Device Programming', courseCode: 'BIMP2210', lecturerName: 'Lecturer Demo', actualPresent: '39', totalRegistered: '42', venue: 'Lab 4', scheduledTime: '08:00 - 10:00', topicTaught: 'Introduction to React Native navigation and form handling.', learningOutcomes: 'Students can identify screens, collect user input, and manage simple state.', recommendations: 'Need more practical lab time for state management exercises.', feedback: 'Good coverage. Please include screenshots in the next weekly report.' },
  ],
  ratings: [
    { id: 'ra1', authorId: 'u1', target: 'Mobile Device Programming', score: 4, comment: 'The lecture was practical and easy to follow.' },
  ],
  attendance: [
    { id: 'a1', courseCode: 'BIMP2210', studentName: 'Student Demo', status: 'Present', date: '2026-03-31', capturedBy: 'Lecturer Demo' },
    { id: 'a2', courseCode: 'BSEM2208', studentName: 'Student Demo', status: 'Present', date: '2026-03-30', capturedBy: 'Lecturer Demo' },
  ],
  monitoring: [
    { id: 'm1', title: 'Week 6 monitoring', note: 'Classes started on time and lab equipment was available.', owner: 'Program Leader' },
    { id: 'm2', title: 'Student engagement', note: 'Attendance remained above ninety percent in scheduled classes.', owner: 'Principal Lecturer' },
  ],
};

const collectionNames = ['users', 'courses', 'reports', 'ratings', 'attendance', 'monitoring'];

const saveLocalData = (value) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));

async function loadLocalData() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) return JSON.parse(raw);
  await saveLocalData(seed);
  return seed;
}

async function loadRemoteCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function seedRemoteDataIfEmpty() {
  const coursesSnapshot = await getDocs(collection(db, 'courses'));
  if (!coursesSnapshot.empty) return;

  for (const name of collectionNames) {
    for (const record of seed[name]) {
      const { id, ...payload } = record;
      if (name === 'users') {
        continue;
      }
      await addDoc(collection(db, name), payload);
    }
  }
}

async function loadRemoteData() {
  await seedRemoteDataIfEmpty();
  const [users, courses, reports, ratings, attendance, monitoring] = await Promise.all(
    collectionNames.map(loadRemoteCollection),
  );
  return { users, courses, reports, ratings, attendance, monitoring };
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
    const user = data.users.find(
      (item) => item.email === email.trim().toLowerCase() && item.password === password,
    );
    if (!user) throw new Error('Use a demo account or register a new one.');
    return user;
  }

  const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  const profile = await getRemoteProfile(result.user.uid);
  if (profile) return profile;

  const fallbackProfile = {
    name: result.user.email?.split('@')[0] || 'New User',
    email: result.user.email || email.trim().toLowerCase(),
    role: 'student',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', result.user.uid), fallbackProfile);
  return { id: result.user.uid, ...fallbackProfile };
}

export async function registerUser({ name, email, password, role }) {
  if (!isFirebaseConfigured) {
    const data = await loadLocalData();
    const normalizedEmail = email.trim().toLowerCase();
    if (data.users.some((item) => item.email === normalizedEmail)) {
      throw new Error('Use a different email address.');
    }
    const user = {
      id: `u${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
    };
    const next = { ...data, users: [...data.users, user] };
    await saveLocalData(next);
    return user;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const result = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const profile = {
    name: name.trim(),
    email: normalizedEmail,
    role,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', result.user.uid), profile);
  return { id: result.user.uid, ...profile };
}

export async function logoutUser() {
  if (isFirebaseConfigured) {
    await signOut(auth);
  }
}

async function saveRemoteRecord(name, payload) {
  await addDoc(collection(db, name), payload);
  return loadRemoteData();
}

export async function saveCourseRecord(data, payload) {
  if (!isFirebaseConfigured) {
    const next = { ...data, courses: [{ id: `c${Date.now()}`, ...payload }, ...data.courses] };
    await saveLocalData(next);
    return next;
  }
  return saveRemoteRecord('courses', payload);
}

export async function saveReportRecord(data, payload) {
  if (!isFirebaseConfigured) {
    const next = { ...data, reports: [{ id: `r${Date.now()}`, ...payload }, ...data.reports] };
    await saveLocalData(next);
    return next;
  }
  return saveRemoteRecord('reports', payload);
}

export async function saveAttendanceRecord(data, payload) {
  if (!isFirebaseConfigured) {
    const next = { ...data, attendance: [{ id: `a${Date.now()}`, ...payload }, ...data.attendance] };
    await saveLocalData(next);
    return next;
  }
  return saveRemoteRecord('attendance', payload);
}

export async function saveRatingRecord(data, payload) {
  if (!isFirebaseConfigured) {
    const next = { ...data, ratings: [{ id: `ra${Date.now()}`, ...payload }, ...data.ratings] };
    await saveLocalData(next);
    return next;
  }
  return saveRemoteRecord('ratings', payload);
}

export async function saveMonitoringRecord(data, payload) {
  if (!isFirebaseConfigured) {
    const next = { ...data, monitoring: [{ id: `m${Date.now()}`, ...payload }, ...data.monitoring] };
    await saveLocalData(next);
    return next;
  }
  return saveRemoteRecord('monitoring', payload);
}

export async function saveReportFeedback(data, reportId, feedback) {
  if (!isFirebaseConfigured) {
    const next = {
      ...data,
      reports: data.reports.map((item) => (
        item.id === reportId ? { ...item, feedback } : item
      )),
    };
    await saveLocalData(next);
    return next;
  }

  await updateDoc(doc(db, 'reports', reportId), { feedback });
  return loadRemoteData();
}
