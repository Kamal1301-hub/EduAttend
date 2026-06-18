const db = require('./config/db');

async function test() {
  try {
    const studentId = 1; // Assuming there is a student with id 1
    const instituteId = 1;

    console.log("Testing query...");
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
    console.log("Results query success:", results.length);

    console.log("Testing rank query...");
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
    console.log("Rank query success:", rankRows);

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit(0);
  }
}

test();
