const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/db');
const { instituteOnly, verifyToken } = require('../middleware/auth');
const { notifyRecipients } = require('../services/notifications');

const SALT_ROUNDS     = 10;
const DEFAULT_PASSWORD = '123456';

// ── Student self access ───────────────────────────────────────
function studentSelf(req, res, next) {
  verifyToken(req, res, () => {
    if (!['student','institute'].includes(req.user.role))
      return res.status(403).json({ success:false, message:'Access denied' });
    next();
  });
}

// ── Helpers ───────────────────────────────────────────────────
async function refreshCount(instituteId) {
  const [[{ cnt }]] = await db.query(
    'SELECT COUNT(*) AS cnt FROM students WHERE institute_id = ?', [instituteId]
  );
  await db.query('UPDATE institutes SET students_count = ? WHERE id = ?', [cnt, instituteId]);
}

function makeLoginId(studentId, instCode) {
  const code = (instCode || 'INS').slice(0,3).toUpperCase();
  return `STU${String(studentId).padStart(4,'0')}${code}`;
}

function buildCredentialMessage(parentName, studentName, loginId) {
  const websiteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `Dear ${parentName},\n\nYour ward ${studentName} has been registered on EduAttend.\n\nStudent Login ID: ${loginId}\nDefault Password: ${DEFAULT_PASSWORD}\n\nLogin here: ${websiteUrl}\n\nPlease login and change the password immediately.\n\nRegards,\nEduAttend`;
}

// ── GET ALL STUDENTS ──────────────────────────────────────────
router.get('/', instituteOnly, async (req, res) => {
  try {
    const { batchId, search } = req.query;
    let sql = `SELECT s.*, b.name AS batch_name
               FROM students s LEFT JOIN batches b ON b.id = s.batch_id
               WHERE s.institute_id = ?`;
    const p = [req.user.id];
    if (batchId) { sql += ' AND s.batch_id = ?'; p.push(batchId); }
    if (search) {
      sql += ' AND (s.name LIKE ? OR s.parent_name LIKE ? OR s.parent_phone LIKE ? OR s.student_login_id LIKE ?)';
      const q = `%${search}%`; p.push(q,q,q,q);
    }
    sql += ' ORDER BY s.name ASC';
    const [rows] = await db.query(sql, p);
    res.json({ success:true, data: rows });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── GET STUDENT PROFILE ─────────────────────────────────────────
router.get('/profile', studentSelf, async (req, res) => {
  try {
    // 1. Fetch student + institute
    const [rows] = await db.query(
      `SELECT s.*, 
              i.name AS inst_name, i.description AS inst_desc, i.website AS inst_website, 
              i.principal_name AS inst_principal, i.establishment_year AS inst_est, 
              i.achievements AS inst_achievements, i.awards AS inst_awards, 
              i.phone AS inst_phone, i.email AS inst_email
       FROM students s
       JOIN institutes i ON i.id = s.institute_id
       WHERE s.id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found' });
    const student = rows[0];

    // 2. Fetch fee info
    const [[feesPaidResult]] = await db.query(
      'SELECT SUM(amount) as paid FROM fee_payments WHERE student_id = ?',
      [req.user.id]
    );
    const feesPaid = feesPaidResult.paid || 0;

    // 3. Fetch fee history
    const [feeHistory] = await db.query(
      'SELECT * FROM fee_payments WHERE student_id = ? ORDER BY payment_date DESC',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        student,
        feesPaid,
        feeHistory
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET SINGLE STUDENT (with attendance summary) ──────────────
router.get('/:id', instituteOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, b.name AS batch_name
       FROM students s LEFT JOIN batches b ON b.id = s.batch_id
       WHERE s.id = ? AND s.institute_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, message:'Student not found' });

    const [[att]] = await db.query(
      `SELECT COUNT(*) AS total_days,
              COALESCE(SUM(status='P'),0) AS present,
              COALESCE(SUM(status='A'),0) AS absent,
              COALESCE(SUM(status='L'),0) AS late
       FROM attendance WHERE student_id=? AND institute_id=?`,
      [req.params.id, req.user.id]
    );

    const student = { ...rows[0], attendance: att };
    res.json({ success:true, data: student });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── CREATE STUDENT ────────────────────────────────────────────
// Auto-generates student_login_id, sets default password = "123456"
// Sends credentials notification via Twilio (SMS text message)
router.post('/', instituteOnly, async (req, res) => {
  try {
    const { name, classLevel, board, stream, batchId, studentPhone, parentName, parentPhone, parentEmail, totalFees } = req.body;
    if (!name || !parentName || !parentPhone || !classLevel)
      return res.status(400).json({ success:false, message:'Name, class, parent name and phone are required' });

    const finalStream = (classLevel==='11'||classLevel==='12') ? (stream||'Board') : '';

    // 1. Insert base record
    const [result] = await db.query(
      `INSERT INTO students
         (institute_id,batch_id,name,class,board,stream,student_phone,parent_name,parent_phone,parent_email,total_fees)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [req.user.id, batchId||null, name.trim(), classLevel,
       board||'CBSE', finalStream, studentPhone?studentPhone.trim():'', parentName.trim(), parentPhone.trim(), parentEmail||'', totalFees||0]
    );
    const studentId = result.insertId;

    // 2. Get institute code to form login ID
    const [[inst]] = await db.query('SELECT code FROM institutes WHERE id=?', [req.user.id]);
    const loginId  = makeLoginId(studentId, inst.code);

    // 3. Set default password in plain text
    const hashedPass = DEFAULT_PASSWORD;

    // 4. Update student with login credentials
    await db.query(
      'UPDATE students SET student_login_id=?, student_password=?, must_change_pass=TRUE WHERE id=?',
      [loginId, hashedPass, studentId]
    );

    // 5. Auto-send credentials to parent (SMS text message)
    const subject = `Login Credentials for ${name.trim()}`;
    const message = buildCredentialMessage(parentName.trim(), name.trim(), loginId);
    const notifyResult = await notifyRecipients({
      instituteId: req.user.id,
      type: 'credentials',
      subject,
      message,
      batchId: batchId || null,
      recipients: [{
        student_id: studentId,
        parent_phone: parentPhone.trim(),
      }],
    });

    await refreshCount(req.user.id);

    res.status(201).json({
      success: true,
      message: 'Student registered. Credentials generated and notification attempted.',
      data: {
        id:              studentId,
        studentLoginId:  loginId,
        defaultPassword: DEFAULT_PASSWORD,
        messageSent:     notifyResult.sentCount > 0,
        messageSubject:  subject,
        parentPhone:     parentPhone.trim(),
        notification: {
          sent: notifyResult.sentCount,
          failed: notifyResult.failedCount,
          logId: notifyResult.messageLogId,
        },
        note:            'Student must change password on first login'
      }
    });
  } catch(err) {
    console.error('Create student:', err);
    res.status(500).json({ success:false, message:err.message });
  }
});

// ── UPDATE STUDENT ────────────────────────────────────────────
router.put('/:id', instituteOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM students WHERE id=? AND institute_id=?', [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, message:'Student not found' });
    const s = rows[0];
    const { name, classLevel, board, stream, batchId, studentPhone, parentName, parentPhone, parentEmail } = req.body;
    const cls = classLevel || s.class;
    const finalStream = (cls==='11'||cls==='12') ? (stream!==undefined?stream:s.stream) : '';
    await db.query(
      `UPDATE students SET name=?,class=?,board=?,stream=?,batch_id=?,
       student_phone=?,parent_name=?,parent_phone=?,parent_email=?,updated_at=NOW()
       WHERE id=? AND institute_id=?`,
      [name!==undefined?name.trim():s.name,
       cls, board!==undefined?board:s.board, finalStream,
       batchId!==undefined?(batchId||null):s.batch_id,
       studentPhone!==undefined?studentPhone.trim():s.student_phone,
       parentName!==undefined?parentName.trim():s.parent_name,
       parentPhone!==undefined?parentPhone.trim():s.parent_phone,
       parentEmail!==undefined?parentEmail:s.parent_email,
       req.params.id, req.user.id]
    );
    res.json({ success:true, message:'Student updated' });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── DELETE STUDENT ────────────────────────────────────────────
router.delete('/:id', instituteOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id FROM students WHERE id=? AND institute_id=?', [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, message:'Student not found' });
    await db.query('DELETE FROM students WHERE id=? AND institute_id=?', [req.params.id, req.user.id]);
    await refreshCount(req.user.id);
    res.json({ success:true, message:'Student deleted' });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── RESEND CREDENTIALS TO PARENT ──────────────────────────────
// POST /api/students/:id/resend-credentials
router.post('/:id/resend-credentials', instituteOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, student_login_id, parent_name, parent_phone, batch_id FROM students WHERE id=? AND institute_id=?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, message:'Student not found' });
    const s = rows[0];
    if (!s.student_login_id) return res.status(400).json({ success:false, message:'No login credentials generated yet' });
    const subject = `Login Credentials for ${s.name}`;
    const message = buildCredentialMessage(s.parent_name, s.name, s.student_login_id);
    const notifyResult = await notifyRecipients({
      instituteId: req.user.id,
      type: 'credentials',
      subject,
      message,
      batchId: s.batch_id || null,
      recipients: [{
        student_id: s.id,
        parent_phone: s.parent_phone,
      }],
    });
    res.json({
      success: true,
      message: `Credentials notification attempted for ${s.parent_phone}`,
      data: {
        sent: notifyResult.sentCount,
        failed: notifyResult.failedCount,
        logId: notifyResult.messageLogId,
      },
    });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── RESET STUDENT PASSWORD (back to default) ──────────────────
router.patch('/:id/reset-password', instituteOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id,name,student_login_id,parent_name,parent_phone FROM students WHERE id=? AND institute_id=?',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success:false, message:'Student not found' });
    const hashed = DEFAULT_PASSWORD;
    await db.query(
      'UPDATE students SET student_password=?, must_change_pass=TRUE WHERE id=?',
      [hashed, req.params.id]
    );
    // Also notify parent about reset
    const s = rows[0];
    const subject = `Password Reset — ${s.name}`;
    const websiteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const message = `Dear ${s.parent_name},\n\nPassword for ${s.name} has been reset to the default.\n\nStudent Login ID: ${s.student_login_id}\nNew Password: ${DEFAULT_PASSWORD}\n\nLogin here: ${websiteUrl}\n\nPlease login and change the password.\n\nRegards,\nEduAttend`;
    const notifyResult = await notifyRecipients({
      instituteId: req.user.id,
      type: 'custom',
      subject,
      message,
      recipients: [{
        student_id: s.id,
        parent_phone: s.parent_phone,
      }],
    });
    res.json({
      success: true,
      message: 'Password reset to default. Notification attempted.',
      defaultPassword: DEFAULT_PASSWORD,
      data: {
        sent: notifyResult.sentCount,
        failed: notifyResult.failedCount,
        logId: notifyResult.messageLogId,
      },
    });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── STUDENT CHANGES OWN PASSWORD ──────────────────────────────
router.post('/change-password', studentSelf, async (req, res) => {
  try {
    if (req.user.role !== 'student')
      return res.status(403).json({ success:false, message:'Only students can use this endpoint' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success:false, message:'currentPassword and newPassword are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ success:false, message:'New password must be at least 6 characters' });
    if (newPassword === DEFAULT_PASSWORD)
      return res.status(400).json({ success:false, message:'New password cannot be the default password' });
    const [rows] = await db.query('SELECT student_password FROM students WHERE id=?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ success:false, message:'Student not found' });
    const match = currentPassword.trim() === rows[0].student_password.trim();
    if (!match) return res.status(401).json({ success:false, message:'Current password is incorrect' });
    const hashed = newPassword;
    await db.query(
      'UPDATE students SET student_password=?, must_change_pass=FALSE WHERE id=?',
      [hashed, req.user.id]
    );
    res.json({ success:true, message:'Password changed successfully' });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── BULK PROMOTE STUDENTS ──────────────────────────────────────
router.post('/promote', instituteOnly, async (req, res) => {
  try {
    const { studentIds, targetClass, targetBatchId } = req.body;
    if (!studentIds?.length || !targetClass)
      return res.status(400).json({ success:false, message:'studentIds and targetClass are required' });

    await db.query(
      `UPDATE students SET class = ?, batch_id = ?, updated_at = NOW()
       WHERE id IN (?) AND institute_id = ?`,
      [targetClass, targetBatchId || null, studentIds, req.user.id]
    );

    res.json({ success:true, message:`Successfully promoted ${studentIds.length} students to Class ${targetClass}` });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── PARENT/STUDENT REQUEST MEETING ──────────────────────────────
router.post('/meeting-request', studentSelf, async (req, res) => {
  try {
    const studentId = req.user.role === 'student' ? req.user.id : req.body.studentId;
    const instituteId = req.user.role === 'student' ? req.user.instituteId : req.user.id;
    const { facultyName, message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Get the student's name to prepend to the message or just to verify
    const [students] = await db.query('SELECT name FROM students WHERE id = ? AND institute_id = ?', [studentId, instituteId]);
    if (!students.length) return res.status(404).json({ success: false, message: 'Student not found' });
    
    const studentName = students[0].name;
    const fullMessage = `[From Parent of: ${studentName}] ${message}`;

    await db.query(
      `INSERT INTO meeting_requests (institute_id, student_id, faculty_name, message)
       VALUES (?, ?, ?, ?)`,
      [instituteId, studentId, facultyName || null, fullMessage]
    );

    res.status(201).json({ success: true, message: 'Meeting request sent successfully' });
  } catch (err) {
    console.error('Meeting Request Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET FEE HISTORY ─────────────────────────────────────────────
router.get('/:id/fees', studentSelf, async (req, res) => {
  try {
    const studentId = req.params.id;
    if (req.user.role === 'student' && parseInt(req.user.id) !== parseInt(studentId)) {
      return res.status(403).json({ success: false, message: 'Access denied: Cannot view other student\'s fees' });
    }
    // Get student's total_fees
    const [students] = await db.query('SELECT total_fees FROM students WHERE id = ?', [studentId]);
    if (!students.length) return res.status(404).json({ success: false, message: 'Student not found' });
    
    const totalFees = parseFloat(students[0].total_fees) || 0;

    // Get payment history
    const [payments] = await db.query(
      'SELECT id, amount, payment_date, remarks, created_at FROM fee_payments WHERE student_id = ? ORDER BY payment_date DESC, created_at DESC',
      [studentId]
    );

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const balance = totalFees - totalPaid;

    res.json({
      success: true,
      data: {
        totalFees,
        totalPaid,
        balance,
        history: payments
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── RECORD FEE PAYMENT ─────────────────────────────────────────
router.post('/:id/fees', instituteOnly, async (req, res) => {
  try {
    const studentId = req.params.id;
    const instituteId = req.user.id;
    const { amount, paymentDate, remarks } = req.body;

    if (!amount || !paymentDate) {
      return res.status(400).json({ success: false, message: 'Amount and payment date are required' });
    }

    await db.query(
      `INSERT INTO fee_payments (institute_id, student_id, amount, payment_date, remarks)
       VALUES (?, ?, ?, ?, ?)`,
      [instituteId, studentId, amount, paymentDate, remarks || null]
    );

    res.status(201).json({ success: true, message: 'Payment recorded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
