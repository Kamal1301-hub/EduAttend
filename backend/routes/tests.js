const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { instituteOnly, verifyToken } = require('../middleware/auth');

// Helper to safely serialize components exactly once
function serializeComponents(comp) {
  if (comp === undefined || comp === null) return null;
  if (typeof comp === 'string') return comp;
  return JSON.stringify(comp);
}

// Middleware: student OR institute can access
function anyAuth(req, res, next) {
  verifyToken(req, res, () => {
    if (!['student','institute'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Access denied' });
    next();
  });
}

// Grade calculator
function grade(scored, total) {
  const p = (scored / total) * 100;
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B+';
  if (p >= 60) return 'B';
  if (p >= 50) return 'C';
  if (p >= 35) return 'D';
  return 'F';
}

// ══════════════════════════════════════════════════════════════
//  INSTITUTE — MANAGE TESTS
// ══════════════════════════════════════════════════════════════

// GET /api/tests  — all tests for this institute
router.get('/', instituteOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, b.name AS batch_name,
              COUNT(DISTINCT tr.id) AS results_entered,
              COUNT(DISTINCT s.id)  AS total_students
       FROM   tests t
       LEFT JOIN batches      b  ON b.id  = t.batch_id
       LEFT JOIN test_results tr ON tr.test_id = t.id
       LEFT JOIN students     s  ON s.batch_id = t.batch_id AND s.institute_id = t.institute_id
       WHERE  t.institute_id = ?
       GROUP  BY t.id
       ORDER  BY t.test_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tests/:id — single test + all student results
router.get('/:id', instituteOnly, async (req, res) => {
  try {
    const [tests] = await db.query(
      `SELECT t.*, b.name AS batch_name
       FROM tests t LEFT JOIN batches b ON b.id = t.batch_id
       WHERE t.id = ? AND t.institute_id = ?`,
      [req.params.id, req.user.id]
    );
    if (!tests.length) return res.status(404).json({ success: false, message: 'Test not found' });
    const test = tests[0];

    // Get all students of the batch + their result (if entered)
    const [students] = await db.query(
      `SELECT s.id AS student_id, s.name, s.class,
              tr.marks_scored, tr.component_scores, tr.grade, tr.remarks, tr.updated_at AS result_updated
       FROM   students s
       LEFT JOIN test_results tr ON tr.test_id = ? AND tr.student_id = s.id
       WHERE  s.institute_id = ?
       ${test.batch_id ? 'AND s.batch_id = ?' : ''}
       ORDER  BY s.name ASC`,
      test.batch_id ? [req.params.id, req.user.id, test.batch_id] : [req.params.id, req.user.id]
    );

    res.json({ success: true, data: { ...test, students } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tests — create a new test
router.post('/', instituteOnly, async (req, res) => {
  try {
    const { title, subject, testDate, totalMarks, batchId, description, isCombined, components } = req.body;
    if (!title || (!isCombined && !subject) || !testDate || !totalMarks)
      return res.status(400).json({ success: false, message: 'Title, subject, date and total marks are required' });

    const [result] = await db.query(
      `INSERT INTO tests (institute_id, batch_id, title, subject, is_combined, components, test_date, total_marks, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, batchId || null, title, subject || '', isCombined ? 1 : 0, serializeComponents(components), testDate, totalMarks, description || '']
    );
    res.status(201).json({ success: true, message: 'Test created', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/tests/:id — edit test details
router.put('/:id', instituteOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tests WHERE id = ? AND institute_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Test not found' });
    const t = rows[0];
    const { title, subject, testDate, totalMarks, batchId, description, isCombined, components } = req.body;
    await db.query(
      `UPDATE tests SET title=?, subject=?, is_combined=?, components=?, test_date=?, total_marks=?, batch_id=?, description=?, updated_at=NOW()
       WHERE id=? AND institute_id=?`,
      [title||t.title, subject||t.subject, isCombined !== undefined ? (isCombined?1:0) : t.is_combined,
       components !== undefined ? serializeComponents(components) : t.components,
       testDate||t.test_date, totalMarks||t.total_marks,
       batchId !== undefined ? (batchId||null) : t.batch_id,
       description !== undefined ? description : t.description,
       req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Test updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/tests/:id
router.delete('/:id', instituteOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id FROM tests WHERE id = ? AND institute_id = ?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Test not found' });
    await db.query('DELETE FROM tests WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Test deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tests/:id/results — bulk save marks for all students
router.post('/:id/results', instituteOnly, async (req, res) => {
  try {
    const [tests] = await db.query('SELECT * FROM tests WHERE id = ? AND institute_id = ?', [req.params.id, req.user.id]);
    if (!tests.length) return res.status(404).json({ success: false, message: 'Test not found' });
    const test = tests[0];

    const { results } = req.body;
    if (!Array.isArray(results))
      return res.status(400).json({ success: false, message: 'results array is required' });

    let saved = 0;
    for (const r of results) {
      if (r.marksScored === '' || r.marksScored === null || r.marksScored === undefined) {
        // Delete existing result if it exists to allow clearing marks
        await db.query(
          'DELETE FROM test_results WHERE test_id = ? AND student_id = ?',
          [req.params.id, r.studentId]
        );
        continue;
      }
      const marks = parseFloat(r.marksScored);
      if (isNaN(marks) || marks < 0 || marks > parseFloat(test.total_marks)) continue;
      const g = grade(marks, test.total_marks);
      await db.query(
        `INSERT INTO test_results (test_id, student_id, institute_id, marks_scored, component_scores, grade, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           marks_scored     = VALUES(marks_scored),
           component_scores = VALUES(component_scores),
           grade            = VALUES(grade),
           remarks          = VALUES(remarks),
           updated_at       = NOW()`,
        [req.params.id, r.studentId, req.user.id, marks, serializeComponents(r.componentScores), g, r.remarks || '']
      );
      saved++;
    }
    res.json({ success: true, message: `${saved} result(s) saved successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  STUDENT — SET CREDENTIALS (Institute sets them)
// ══════════════════════════════════════════════════════════════

// GET /api/tests/students/credentials — list all students + login status
router.get('/students/credentials', instituteOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, class, batch_id, student_login_id AS login_id,
              IF(student_password IS NOT NULL, TRUE, FALSE) AS has_login,
              is_active
       FROM   students
       WHERE  institute_id = ?
       ORDER  BY name ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tests/students/set-credentials — institute sets login for a student
router.post('/students/set-credentials', instituteOnly, async (req, res) => {
  try {
    const { studentId, loginId, password } = req.body;
    if (!studentId || !loginId || !password)
      return res.status(400).json({ success: false, message: 'studentId, loginId and password are required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const [rows] = await db.query('SELECT id FROM students WHERE id = ? AND institute_id = ?', [studentId, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Student not found' });

    // Check loginId not taken by another student
    const [dup] = await db.query('SELECT id FROM students WHERE student_login_id = ? AND id != ?', [loginId, studentId]);
    if (dup.length) return res.status(409).json({ success: false, message: 'This Login ID is already taken. Choose another.' });

    const hashed = password;
    await db.query(
      'UPDATE students SET student_login_id = ?, student_password = ?, is_active = TRUE WHERE id = ? AND institute_id = ?',
      [loginId, hashed, studentId, req.user.id]
    );
    res.json({ success: true, message: 'Student login credentials set successfully', data: { loginId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  STUDENT PORTAL — view own data
// ══════════════════════════════════════════════════════════════

// GET /api/tests/student/portal — attendance + all results for logged-in student
router.get('/student/portal', anyAuth, async (req, res) => {
  try {
    const studentId   = req.user.role === 'student' ? req.user.id   : parseInt(req.query.studentId);
    const instituteId = req.user.role === 'student' ? req.user.instituteId : req.user.id;

    if (!studentId) return res.status(400).json({ success: false, message: 'studentId required' });

    // Student info
    const [stuRows] = await db.query(
      `SELECT s.*, b.name AS batch_name, i.name AS institute_name, i.city AS institute_city
       FROM   students s
       LEFT JOIN batches    b ON b.id  = s.batch_id
       LEFT JOIN institutes i ON i.id = s.institute_id
       WHERE  s.id = ? AND s.institute_id = ?`,
      [studentId, instituteId]
    );
    if (!stuRows.length) return res.status(404).json({ success: false, message: 'Student not found' });
    const stu = stuRows[0];

    // Attendance records (last 90 days + summary)
    const [attRows] = await db.query(
      `SELECT date, status FROM attendance
       WHERE  student_id = ? AND institute_id = ?
       ORDER  BY date DESC`,
      [studentId, instituteId]
    );
    const total   = attRows.length;
    const present = attRows.filter(a => a.status === 'P').length;
    const absent  = attRows.filter(a => a.status === 'A').length;
    const late    = attRows.filter(a => a.status === 'L').length;
    const pct     = total > 0 ? Math.round((present / total) * 100) : 0;

    // Test results — each test with date, subject, marks, total, grade, and test rank
    const [results] = await db.query(
      `SELECT
         tr.id, tr.marks_scored, tr.component_scores, tr.grade, tr.remarks, tr.updated_at,
         t.id AS test_id, t.title, t.subject, t.is_combined, t.components, t.test_date, t.total_marks,
         b.name AS batch_name,
         (
           SELECT COUNT(*) + 1
           FROM test_results tr_other
           WHERE tr_other.test_id = tr.test_id AND (tr_other.marks_scored / t.total_marks) > (tr.marks_scored / t.total_marks)
         ) AS test_rank,
         (
           SELECT COUNT(DISTINCT student_id)
           FROM test_results
           WHERE test_id = tr.test_id
         ) AS total_students_test
       FROM   test_results tr
       JOIN   tests    t ON t.id  = tr.test_id
       LEFT JOIN batches b ON b.id = t.batch_id
       WHERE  tr.student_id = ? AND tr.institute_id = ?
       ORDER  BY t.test_date DESC`,
      [studentId, instituteId]
    );

    // Calculate overall rank
    const [rankRows] = await db.query(
      `SELECT 
         (SELECT COUNT(*) + 1 
          FROM (
            SELECT student_id, AVG(marks_scored / t2.total_marks) as avg_score 
            FROM test_results tr2 
            JOIN tests t2 ON t2.id = tr2.test_id 
            WHERE tr2.institute_id = ? 
            GROUP BY student_id
          ) sa2 
          WHERE sa2.avg_score > sa1.avg_score
         ) AS overall_rank,
         (SELECT COUNT(DISTINCT student_id) FROM test_results WHERE institute_id = ?) AS total_ranked_students
       FROM (
         SELECT student_id, AVG(marks_scored / t3.total_marks) as avg_score 
         FROM test_results tr3 
         JOIN tests t3 ON t3.id = tr3.test_id 
         WHERE tr3.institute_id = ? AND tr3.student_id = ?
         GROUP BY student_id
       ) sa1`,
      [instituteId, instituteId, instituteId, studentId]
    );

    const overallRank = rankRows.length > 0 ? rankRows[0].overall_rank : null;
    const totalRankedStudents = rankRows.length > 0 ? rankRows[0].total_ranked_students : null;

    res.json({
      success: true,
      data: {
        student: {
          id: stu.id, name: stu.name, class: stu.class, board: stu.board, stream: stu.stream,
          batchName: stu.batch_name,
          instituteName: stu.institute_name, instituteCity: stu.institute_city,
          parentName: stu.parent_name, parentPhone: stu.parent_phone, parentEmail: stu.parent_email,
          studentPhone: stu.student_phone, loginId: stu.student_login_id, password: stu.student_password, mustChange: !!stu.must_change_pass
        },
        attendance: {
          records: attRows,
          summary: { total, present, absent, late, percentage: pct }
        },
        results,
        ranking: {
          overallRank,
          totalRankedStudents
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
