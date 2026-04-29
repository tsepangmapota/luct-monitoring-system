import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { auth, db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function LecturerDashboard({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUserData(); }, []);
  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) setUserData(userDoc.data());
      }
    } catch (error) { console.error(error);
    } finally { setLoading(false); }
  };
  const handleLogout = async () => { await auth.signOut(); navigation.replace('Login'); };
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;
  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.welcome}>{userData?.name || 'Principal Lecturer'}</Text>
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity></View>
      <View style={[styles.card, { backgroundColor: '#4CAF50' }]}><Text style={styles.cardTitle}>Principal Lecturer Dashboard</Text></View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff' },
  welcome: { fontSize: 20, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#dc3545', padding: 8, borderRadius: 5 },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  card: { margin: 15, padding: 20, borderRadius: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  cardText: { fontSize: 16, color: '#fff', marginTop: 5 }
});
