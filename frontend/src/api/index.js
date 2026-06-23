import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ea_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally - auto logout
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ea_token');
      localStorage.removeItem('ea_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── AUTH ──────────────────────────────────────────────────────
export const authAPI = {
  adminLogin: (data) => API.post('/auth/admin/login', data),
  instituteLogin: (data) => API.post('/auth/institute/login', data),
  studentLogin: (data) => API.post('/auth/student/login', data),
  verify: () => API.get('/auth/verify'),
};

// ─── INSTITUTES (Super Admin) ──────────────────────────────────
export const institutesAPI = {
  getAll: () => API.get('/institutes'),
  getOne: (id) => API.get(`/institutes/${id}`),
  create: (data) => API.post('/institutes', data),
  update: (id, data) => API.put(`/institutes/${id}`, data),
  toggleStatus: (id) => API.patch(`/institutes/${id}/status`),
  resetPassword: (id) => API.patch(`/institutes/${id}/reset-password`),
  delete: (id) => API.delete(`/institutes/${id}`),
  getLogs: () => API.get('/institutes/logs/all'),
  getStats: () => API.get('/institutes/stats/overview'),
};

// ─── BATCHES (Institute) ───────────────────────────────────────
export const batchesAPI = {
  getAll: () => API.get('/batches'),
  create: (data) => API.post('/batches', data),
  update: (id, data) => API.put(`/batches/${id}`, data),
  delete: (id) => API.delete(`/batches/${id}`),
};

// ─── STUDENTS (Institute) ──────────────────────────────────────
export const studentsAPI = {
  getAll: (params) => API.get('/students', { params }),
  getOne: (id) => API.get(`/students/${id}`),
  create: (data) => API.post('/students', data),
  update: (id, data) => API.put(`/students/${id}`, data),
  delete: (id) => API.delete(`/students/${id}`),
  resetPassword: (id) => API.patch(`/students/${id}/reset-password`),
  promote: (data) => API.post(`/students/promote`, data),
  resendCredentials: (id) => API.post(`/students/${id}/resend-credentials`),
  changePassword: (data) => API.post('/students/change-password', data),
  requestMeeting: (data) => API.post('/students/meeting-request', data),
  getFeeHistory: (id) => API.get(`/students/${id}/fees`),
  addFeePayment: (id, data) => API.post(`/students/${id}/fees`, data),
  getProfile: () => API.get('/students/profile'),
};

// ─── ATTENDANCE (Institute) ────────────────────────────────────
export const attendanceAPI = {
  get: (batchId, date) => API.get('/attendance', { params: { batchId, date } }),
  submit: (data) => API.post('/attendance/submit', data),
  getSummary: (batchId) => API.get('/attendance/summary', { params: { batchId } }),
  getDashboard: () => API.get('/attendance/dashboard'),
};

// ─── MESSAGES (Institute) ──────────────────────────────────────
export const messagesAPI = {
  getAll: () => API.get('/messages'),
  send: (data) => API.post('/messages/send', data),
  sendCredentials: (studentId) => API.post(`/messages/send-credentials/${studentId}`),
  sendIndividual: (studentId, data) => API.post(`/messages/send-individual/${studentId}`, data),
};

export default API;

// ─── TESTS (Institute) ────────────────────────────────────────
export const testsAPI = {
  getAll:          ()           => API.get('/tests'),
  getOne:          (id)         => API.get(`/tests/${id}`),
  create:          (data)       => API.post('/tests', data),
  update:          (id, data)   => API.put(`/tests/${id}`, data),
  delete:          (id)         => API.delete(`/tests/${id}`),
  saveResults:     (id, data)   => API.post(`/tests/${id}/results`, data),
  getCredentials:  ()           => API.get('/tests/students/credentials'),
  setCredentials:  (data)       => API.post('/tests/students/set-credentials', data),
  studentPortal:   (studentId)  => API.get('/tests/student/portal', { params: studentId ? { studentId } : {} }),
  studentTestAnalysis: (testId, studentId) => API.get(`/tests/student/analysis/${testId}`, { params: studentId ? { studentId } : {} }),
  studentMonthlyReport: (month, studentId) => API.get('/tests/student/monthly-report', { params: { month, studentId } }),
};
