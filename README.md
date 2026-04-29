# LUCT Monitoring System

Expo and Firebase mobile reporting app for the BIMP2210 assignment.

## What is included

- Login and register flow for `Student`, `Lecturer`, `Principal Lecturer`, and `Program Leader`
- Role-based module navigation with overview, courses, reports, attendance, ratings, and monitoring
- Lecturer reporting form with all required assignment fields and automatic course lookups
- Full CRUD support for courses, reports, attendance, ratings, and monitoring records
- Real-time Firestore listeners with offline AsyncStorage fallback for demos
- Search across every module list
- Excel-ready CSV export for report downloads in the hosted web build
- Firestore security rules with role-based access control

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

This project supports Firebase Authentication, Firestore, and Hosting.

1. Create a Firebase project in the Firebase Console.
2. Enable `Authentication` with `Email/Password`.
3. Create `Firestore Database`.
4. Copy your Firebase web app values into `.env`.
5. Restart Expo after changing `.env`.
6. Deploy the included Firestore rules:

```bash
firebase deploy --only firestore:rules
```

Start for mobile:

```bash
npx expo start --lan
```

Start for web:

```bash
npx expo start --web
```

Build the web app for deployment:

```bash
npm run build:web
```

Deploy to Firebase Hosting:

```bash
npm install -g firebase-tools
firebase login
npm run deploy:firebase
```

## Notes

- If `.env` is missing, the app falls back to local demo data and still supports the assignment demo flow.
- With `.env` filled in, login/register, CRUD operations, and live updates use Firebase Authentication and Firestore.
- Report downloads are available from the hosted web build so the CSV file can be opened directly in Excel.
