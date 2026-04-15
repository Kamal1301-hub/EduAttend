# EduAttend — Full Stack Attendance Management System

A complete multi-institute attendance management platform built with **React + Node.js + MySQL**.

---

## Project Structure

```
eduattend-fullstack/
├── backend/                  # Node.js + Express API
│   ├── config/
│   │   └── db.js             # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js           # JWT authentication
│   ├── routes/
│   │   ├── auth.js           # Login (admin + institute)
│   │   ├── institutes.js     # Institute CRUD (super admin)
│   │   ├── batches.js        # Batch CRUD (institute)
│   │   ├── students.js       # Student CRUD (institute)
│   │   ├── attendance.js     # Attendance mark/submit/resubmit
│   │   └── messages.js       # Parent message logs
│   ├── database.sql          # MySQL schema + seed data
│   ├── server.js             # Main Express server
│   ├── .env                  # Environment variables
│   └── package.json
│
└── frontend/                 # React app
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── api/
    │   │   └── index.js      # All Axios API calls
    │   ├── context/
    │   │   └── AuthContext.js # Login state management
    │   ├── components/
    │   │   ├── UI.js          # Shared UI components
    │   │   ├── AdminLayout.js # Super admin sidebar layout
    │   │   └── InstLayout.js  # Institute sidebar layout
    │   ├── pages/
    │   │   ├── admin/
    │   │   │   ├── AdminLogin.js
    │   │   │   ├── AdminDashboard.js
    │   │   │   ├── AdminInstitutes.js
    │   │   │   ├── AdminCredentials.js
    │   │   │   ├── AdminActivity.js
    │   │   │   └── AdminSettings.js
    │   │   └── institute/
    │   │       ├── InstituteLogin.js
    │   │       ├── InstDashboard.js
    │   │       ├── InstBatches.js
    │   │       ├── InstStudents.js
    │   │       ├── InstAttendance.js
    │   │       ├── InstMessages.js
    │   │       └── InstSearch.js
    │   ├── App.js             # Routes
    │   ├── index.js           # Entry point
    │   └── index.css          # Global styles
    └── package.json
```

---

## Setup Instructions

### Step 1 — Install MySQL
Download and install MySQL from https://dev.mysql.com/downloads/mysql/

### Step 2 — Setup Database
```bash
mysql -u root -p
# Enter your MySQL password, then run:
source /path/to/backend/database.sql
exit
```

### Step 3 — Configure Backend
Edit `backend/.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=eduattend
JWT_SECRET=change_this_to_a_random_long_string
```

### Step 4 — Install & Run Backend
```bash
cd backend
npm install
npm run dev
# ✅ API running on http://localhost:5000
```

### Step 5 — Install & Run Frontend
```bash
cd frontend
npm install
npm start
# ✅ App running on http://localhost:3000
```

---

## Login Credentials

### Super Admin Panel
- URL: `http://localhost:3000/admin/login`
- Login ID: `superadmin`
- Password: `Admin@2024`

### Institute Portal
- URL: `http://localhost:3000/login`
- Login ID: `BFA2024001`
- Password: `Bfa@7842`

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/admin/login` | Super admin login | Public |
| POST | `/api/auth/institute/login` | Institute login | Public |
| GET | `/api/institutes` | Get all institutes | Super Admin |
| POST | `/api/institutes` | Register institute | Super Admin |
| PUT | `/api/institutes/:id` | Update institute | Super Admin |
| PATCH | `/api/institutes/:id/status` | Toggle active/suspended | Super Admin |
| PATCH | `/api/institutes/:id/reset-password` | Reset password | Super Admin |
| DELETE | `/api/institutes/:id` | Delete institute | Super Admin |
| GET | `/api/batches` | Get all batches | Institute |
| POST | `/api/batches` | Create batch | Institute |
| PUT | `/api/batches/:id` | Update batch | Institute |
| DELETE | `/api/batches/:id` | Delete batch | Institute |
| GET | `/api/students` | Get students (with search) | Institute |
| POST | `/api/students` | Add student | Institute |
| PUT | `/api/students/:id` | Update student | Institute |
| DELETE | `/api/students/:id` | Delete student | Institute |
| GET | `/api/attendance` | Get attendance for batch+date | Institute |
| POST | `/api/attendance/submit` | Submit/resubmit attendance | Institute |
| GET | `/api/attendance/dashboard` | Today's summary per batch | Institute |
| POST | `/api/messages/send` | Send parent notification | Institute |
| GET | `/api/messages` | Get message history | Institute |

---

## Features

### Super Admin Panel (`/admin/*`)
- Register institutes — auto-generates Login ID & Password
- Edit, suspend, activate, delete institutes
- View & reset credentials anytime
- Activity log of all platform actions
- Dashboard with platform-wide stats

### Institute Portal (`/`, `/dashboard`, etc.)
- Secure login with institute-specific credentials
- Manage batches (class 8–12, CBSE/State, stream only for 11 & 12)
- Add/edit/delete students with parent contact details
- Mark attendance with radio buttons (P/A/L) and submit
- Resubmit attendance for late arrivals
- Send messages to parents (Test/PTM/Holiday/Custom)
- Search students by name, Aadhar, or parent details
- Dashboard with today's attendance summary

---

## Production Deployment

### Backend (Render / Railway)
1. Push backend folder to GitHub
2. Deploy on [Render](https://render.com) or [Railway](https://railway.app)
3. Add environment variables in dashboard
4. Use managed MySQL (PlanetScale / Railway MySQL)

### Frontend (Vercel)
1. Push frontend folder to GitHub
2. Deploy on [Vercel](https://vercel.com)
3. Set `REACT_APP_API_URL` environment variable to your backend URL
4. Update `proxy` in package.json OR use axios baseURL env var

### SMS Integration (MSG91)
In `backend/routes/messages.js`, replace the comment with:
```javascript
const msg91 = require('msg91-api');
recipients.forEach(r => {
  msg91.sendSMS(r.parent_phone, message);
});
```

---

## Tech Stack
- **Frontend**: React 18, React Router 6, Axios, react-hot-toast
- **Backend**: Node.js, Express, MySQL2, JWT, bcryptjs
- **Database**: MySQL 8
- **Auth**: JWT tokens stored in localStorage
