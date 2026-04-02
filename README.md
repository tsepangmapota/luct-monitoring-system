# LUCT Monitoring System

Expo Go starter for the BIMP2210 assignment.

## What is included

- Login and register screens
- Role-based dashboards for Student, Lecturer, Principal Lecturer, and Program Leader
- Lecturer reporting form with all required assignment fields
- Course, report, attendance, rating, and monitoring sections
- Local persistence with AsyncStorage so the app works immediately without Firebase setup
- Search across course/report content for extra-credit direction

## Demo accounts

- `student@luct.ac.ls`
- `lecturer@luct.ac.ls`
- `prl@luct.ac.ls`
- `pl@luct.ac.ls`

Password for all demo accounts: `123456`

## Run in VS Code with Expo Go

```bash
npm install
npx expo start
```

Then scan the QR code with the Expo Go app on your phone.

## Firebase setup

This project now supports Firebase Authentication and Firestore.

1. Create a Firebase project in the Firebase Console.
2. Enable `Authentication` with `Email/Password`.
3. Create `Firestore Database` in test mode.
4. Copy your Firebase web app values into `.env`.
5. Restart Expo after changing `.env`.

Start for mobile:

```bash
npx expo start --lan
```

Start for web:

```bash
npx expo start --web
```

## Notes

- If `.env` is missing, the app falls back to local demo data.
- With `.env` filled in, login/register and records use Firebase Authentication and Firestore.
