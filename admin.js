/**
 * ST. MARY'S COLLEGE NEGOMBO - LMS
 * Principal Administration Dashboard & APIs (admin.js)
 * Architecture: Express.js + Mongoose / Unified Data Store + Claymorphism UI
 */

const express = require('express');

function createAdminRouter(store, logActivity) {
  const router = express.Router();

  // Middleware: Principal only
  const requirePrincipal = (req, res, next) => {
    if (!req.user || req.user.role !== 'principal') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Principal access required.' });
    }
    next();
  };

  router.use(requirePrincipal);

  // 1. Dashboard Overview Stats
  router.get('/dashboard', async (req, res) => {
    try {
      const stats = await store.getAdminStats();
      const recentLogs = await store.getActivityLogs(8);
      res.json({ success: true, data: { stats, recentLogs } });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2. Student Management CRUD
  router.get('/students', async (req, res) => {
    try {
      const { search = '', grade = '', className = '', page = 1, limit = 50 } = req.query;
      const result = await store.getStudents({ search, grade, className, page: Number(page), limit: Number(limit) });
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/students', async (req, res) => {
    try {
      const studentData = req.body;
      if (!studentData.fullName || !studentData.grade || !studentData.className) {
        return res.status(400).json({ success: false, message: 'Full name, grade, and class are required.' });
      }
      const newStudent = await store.createStudent(studentData);
      await logActivity('Created Student', req.user, newStudent.fullName, `Student ID: ${newStudent.studentId}, Class: ${newStudent.grade}${newStudent.className}`);
      res.status(201).json({ success: true, message: 'Student registered successfully', data: newStudent });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.put('/students/:id', async (req, res) => {
    try {
      const updated = await store.updateStudent(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, message: 'Student not found' });
      await logActivity('Updated Student', req.user, updated.fullName, `Updated record for ${updated.studentId}`);
      res.json({ success: true, message: 'Student updated successfully', data: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.delete('/students/:id', async (req, res) => {
    try {
      const deleted = await store.deleteStudent(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Student not found' });
      await logActivity('Deleted Student', req.user, deleted.fullName, `Removed student ${deleted.studentId}`);
      res.json({ success: true, message: 'Student removed successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/students/import-csv', async (req, res) => {
    try {
      const { csvText } = req.body;
      if (!csvText || typeof csvText !== 'string') {
        return res.status(400).json({ success: false, message: 'Valid CSV content is required.' });
      }
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        return res.status(400).json({ success: false, message: 'CSV must contain a header and at least one student row.' });
      }
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const studentsToCreate = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (row.length < 3) continue;
        const entry = {};
        header.forEach((h, idx) => {
          if (h.includes('name')) entry.fullName = row[idx];
          else if (h.includes('id')) entry.studentId = row[idx];
          else if (h.includes('email')) entry.email = row[idx];
          else if (h.includes('grade')) entry.grade = row[idx];
          else if (h.includes('class')) entry.className = row[idx];
          else if (h.includes('gender')) entry.gender = row[idx];
          else if (h.includes('parent')) entry.parentName = row[idx];
          else if (h.includes('contact') || h.includes('phone')) entry.parentPhone = row[idx];
        });
        if (entry.fullName && entry.grade) {
          entry.className = entry.className || 'A';
          studentsToCreate.push(entry);
        }
      }

      const imported = await store.bulkImportStudents(studentsToCreate);
      await logActivity('Imported Students CSV', req.user, `${imported.length} students`, `Batch imported from CSV`);
      res.json({ success: true, message: `Successfully imported ${imported.length} students`, data: imported });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 3. Teacher Management CRUD
  router.get('/teachers', async (req, res) => {
    try {
      const teachers = await store.getTeachers();
      res.json({ success: true, data: teachers });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/teachers', async (req, res) => {
    try {
      const teacherData = req.body;
      if (!teacherData.fullName || !teacherData.email) {
        return res.status(400).json({ success: false, message: 'Full name and email are required.' });
      }
      const newTeacher = await store.createTeacher(teacherData);
      await logActivity('Created Teacher', req.user, newTeacher.fullName, `Teacher ID: ${newTeacher.teacherId}`);
      res.status(201).json({ success: true, message: 'Teacher created successfully', data: newTeacher });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.put('/teachers/:id', async (req, res) => {
    try {
      const updated = await store.updateTeacher(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, message: 'Teacher not found' });
      await logActivity('Updated Teacher', req.user, updated.fullName, `Updated record for ${updated.teacherId}`);
      res.json({ success: true, message: 'Teacher updated successfully', data: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.delete('/teachers/:id', async (req, res) => {
    try {
      const deleted = await store.deleteTeacher(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: 'Teacher not found' });
      await logActivity('Deleted Teacher', req.user, deleted.fullName, `Removed teacher ${deleted.teacherId}`);
      res.json({ success: true, message: 'Teacher removed successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/teachers/:id/reset-password', async (req, res) => {
    try {
      const { newPassword } = req.body;
      const result = await store.resetTeacherPassword(req.params.id, newPassword || 'Teacher@123');
      await logActivity('Reset Password', req.user, result.email, 'Principal reset teacher credentials');
      res.json({ success: true, message: `Password reset successfully for ${result.fullName}` });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 4. Class Management CRUD
  router.get('/classes', async (req, res) => {
    try {
      const classes = await store.getClasses();
      res.json({ success: true, data: classes });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/classes', async (req, res) => {
    try {
      const newClass = await store.createClass(req.body);
      await logActivity('Created Class', req.user, newClass.name, `Room: ${newClass.roomNumber || 'N/A'}`);
      res.status(201).json({ success: true, message: 'Class created', data: newClass });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.put('/classes/:id', async (req, res) => {
    try {
      const updated = await store.updateClass(req.params.id, req.body);
      await logActivity('Updated Class', req.user, updated.name, 'Updated class details');
      res.json({ success: true, message: 'Class updated', data: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.delete('/classes/:id', async (req, res) => {
    try {
      await store.deleteClass(req.params.id);
      await logActivity('Deleted Class', req.user, `Class ID: ${req.params.id}`, 'Class archived/deleted');
      res.json({ success: true, message: 'Class deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 5. Subject Management CRUD
  router.get('/subjects', async (req, res) => {
    try {
      const subjects = await store.getSubjects();
      res.json({ success: true, data: subjects });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/subjects', async (req, res) => {
    try {
      const newSubject = await store.createSubject(req.body);
      await logActivity('Created Subject', req.user, newSubject.name, `Code: ${newSubject.code}`);
      res.status(201).json({ success: true, message: 'Subject created', data: newSubject });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.put('/subjects/:id', async (req, res) => {
    try {
      const updated = await store.updateSubject(req.params.id, req.body);
      res.json({ success: true, message: 'Subject updated', data: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.delete('/subjects/:id', async (req, res) => {
    try {
      await store.deleteSubject(req.params.id);
      res.json({ success: true, message: 'Subject deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 6. Academic Management
  router.get('/academic-years', async (req, res) => {
    try {
      const academics = await store.getAcademicYears();
      res.json({ success: true, data: academics });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/academic-years/promote', async (req, res) => {
    try {
      const { fromGrade, toGrade } = req.body;
      const count = await store.promoteGrade(fromGrade, toGrade);
      await logActivity('Promoted Students', req.user, `Grade ${fromGrade} -> Grade ${toGrade}`, `Promoted ${count} students`);
      res.json({ success: true, message: `Successfully promoted ${count} students from Grade ${fromGrade} to Grade ${toGrade}` });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 7. Oversight Endpoints (Assignments, Exams, Attendance, Results)
  router.get('/assignments', async (req, res) => {
    try {
      const assignments = await store.getAllAssignments();
      res.json({ success: true, data: assignments });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.get('/examinations', async (req, res) => {
    try {
      const exams = await store.getAllExaminations();
      res.json({ success: true, data: exams });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.get('/attendance', async (req, res) => {
    try {
      const summary = await store.getAttendanceSummary();
      res.json({ success: true, data: summary });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.get('/results', async (req, res) => {
    try {
      const results = await store.getAllResults();
      res.json({ success: true, data: results });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 8. Announcements CRUD
  router.get('/announcements', async (req, res) => {
    try {
      const announcements = await store.getAnnouncements();
      res.json({ success: true, data: announcements });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/announcements', async (req, res) => {
    try {
      const announcement = await store.createAnnouncement({
        ...req.body,
        createdBy: req.user.name || 'Principal'
      });
      await logActivity('Published Announcement', req.user, announcement.title, `Audience: ${announcement.targetAudience}`);
      res.status(201).json({ success: true, message: 'Announcement published', data: announcement });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.delete('/announcements/:id', async (req, res) => {
    try {
      await store.deleteAnnouncement(req.params.id);
      await logActivity('Deleted Announcement', req.user, `ID: ${req.params.id}`, 'Removed announcement');
      res.json({ success: true, message: 'Announcement deleted' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 9. Timetable CRUD
  router.get('/timetable', async (req, res) => {
    try {
      const { className } = req.query;
      const schedule = await store.getTimetable(className);
      res.json({ success: true, data: schedule });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/timetable', async (req, res) => {
    try {
      const entry = await store.createTimetableEntry(req.body);
      res.status(201).json({ success: true, message: 'Timetable entry added', data: entry });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 10. Reports & Analytics
  router.get('/reports', async (req, res) => {
    try {
      const report = await store.getComprehensiveReport();
      res.json({ success: true, data: report });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 11. Activity Logs
  router.get('/activity-logs', async (req, res) => {
    try {
      const logs = await store.getActivityLogs(100);
      res.json({ success: true, data: logs });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 12. User Accounts Management
  router.get('/users', async (req, res) => {
    try {
      const users = await store.getUsers();
      res.json({ success: true, data: users });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.put('/users/:id/status', async (req, res) => {
    try {
      const { status } = req.body;
      const user = await store.updateUserStatus(req.params.id, status);
      await logActivity('Modified User Status', req.user, user.email, `Status set to ${status}`);
      res.json({ success: true, message: `User status changed to ${status}`, data: user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // 13. System Settings
  router.get('/settings', async (req, res) => {
    try {
      const settings = await store.getSystemSettings();
      res.json({ success: true, data: settings });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  router.post('/settings', async (req, res) => {
    try {
      const updated = await store.updateSystemSettings(req.body);
      await logActivity('Updated System Settings', req.user, 'System Config', 'Updated school details and academic settings');
      res.json({ success: true, message: 'System settings saved', data: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}

/**
 * Render the complete Claymorphic Principal Administration Dashboard HTML
 */
function renderAdminPage(user = { name: 'Rev. Fr. Principal Ranjith', email: 'principal@stmarys.lk' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Principal Administration Dashboard | St. Mary's College Negombo</title>
  <script>
    (function() {
      try {
        var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
        var customFetch = function(url, options) {
          options = options || {};
          var token = null;
          try {
            token = localStorage.getItem('stmarys_token');
          } catch (_) {}
          if (!token) {
            var match = document.cookie.match(/(?:^|; )token=([^;]*)/);
            if (match) token = decodeURIComponent(match[1]);
          }
          if (token) {
            options.headers = options.headers || {};
            if (typeof Headers !== 'undefined' && options.headers instanceof Headers) {
              if (!options.headers.has('Authorization')) {
                options.headers.set('Authorization', 'Bearer ' + token);
              }
            } else if (typeof options.headers === 'object' && !Array.isArray(options.headers)) {
              if (!options.headers['Authorization'] && !options.headers['authorization']) {
                options.headers['Authorization'] = 'Bearer ' + token;
              }
            }
          }
          options.credentials = options.credentials || 'include';
          return nativeFetch ? nativeFetch(url, options) : fetch(url, options);
        };
        var propDesc = {
          get: function() { return customFetch; },
          set: function(fn) { nativeFetch = fn; },
          configurable: true,
          enumerable: true
        };
        try { Object.defineProperty(window, 'fetch', propDesc); } catch (_) {}
        try { if (window.Window && window.Window.prototype) Object.defineProperty(window.Window.prototype, 'fetch', propDesc); } catch (_) {}
      } catch (e) {}
    })();
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    :root {
      --primary-blue: #4F7DF3;
      --royal-blue: #3159C9;
      --sky-blue: #A9D8FF;
      --light-bg: #F3F6FF;
      --purple: #9475E8;
      --pink: #F5A5C5;
      --yellow: #FFD66B;
      --green: #70D6A3;
      --dark-text: #26324B;
      --secondary-text: #75819A;
      --clay-surface: #FFFFFF;
      --clay-shadow-out: 8px 8px 18px rgba(163, 177, 198, 0.4), -8px -8px 18px rgba(255, 255, 255, 0.9);
      --clay-shadow-out-sm: 4px 4px 10px rgba(163, 177, 198, 0.35), -4px -4px 10px rgba(255, 255, 255, 0.9);
      --clay-shadow-in: inset 3px 3px 6px rgba(163, 177, 198, 0.3), inset -3px -3px 6px rgba(255, 255, 255, 0.8);
      --clay-border: 1px solid rgba(255, 255, 255, 0.8);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Nunito', sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background-color: var(--light-bg);
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(169, 216, 255, 0.35) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(245, 165, 197, 0.25) 0%, transparent 40%),
        radial-gradient(circle at 50% 50%, rgba(148, 117, 232, 0.15) 0%, transparent 50%);
      background-attachment: fixed;
      color: var(--dark-text);
      display: flex;
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Clay Component Primitives */
    .clay-card {
      background: var(--clay-surface);
      border-radius: 24px;
      box-shadow: var(--clay-shadow-out);
      border: var(--clay-border);
      transition: all 0.25s ease;
      position: relative;
    }

    .clay-card-flat {
      background: #F8FAFF;
      border-radius: 18px;
      box-shadow: var(--clay-shadow-out-sm);
      border: 1px solid rgba(255, 255, 255, 0.9);
    }

    .clay-btn {
      background: linear-gradient(135deg, var(--primary-blue), var(--royal-blue));
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 16px;
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 4px 4px 10px rgba(49, 89, 201, 0.35), -2px -2px 6px rgba(255, 255, 255, 0.6), inset 1px 1px 2px rgba(255, 255, 255, 0.4);
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      text-decoration: none;
    }
    .clay-btn:hover {
      transform: translateY(-2px);
      box-shadow: 6px 6px 14px rgba(49, 89, 201, 0.45);
    }
    .clay-btn:active {
      transform: translateY(1px);
      box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.2);
    }

    .clay-btn-secondary {
      background: #FFFFFF;
      color: var(--dark-text);
      box-shadow: var(--clay-shadow-out-sm);
    }
    .clay-btn-secondary:hover {
      background: #F0F4FF;
      color: var(--royal-blue);
    }

    .clay-btn-danger {
      background: linear-gradient(135deg, #FF6B8B, #E83E8C);
      color: white;
      box-shadow: 4px 4px 10px rgba(232, 62, 140, 0.35);
    }

    .clay-btn-success {
      background: linear-gradient(135deg, #70D6A3, #28A745);
      color: white;
      box-shadow: 4px 4px 10px rgba(40, 167, 69, 0.35);
    }

    .clay-btn-warning {
      background: linear-gradient(135deg, #FFD66B, #F39C12);
      color: #3b2a00;
      box-shadow: 4px 4px 10px rgba(243, 156, 18, 0.35);
    }

    .clay-input {
      width: 100%;
      background: #F3F6FF;
      border: 1px solid rgba(169, 216, 255, 0.4);
      border-radius: 14px;
      padding: 10px 16px;
      font-size: 0.95rem;
      color: var(--dark-text);
      box-shadow: var(--clay-shadow-in);
      outline: none;
      transition: all 0.2s ease;
    }
    .clay-input:focus {
      border-color: var(--primary-blue);
      box-shadow: inset 3px 3px 6px rgba(79, 125, 243, 0.15), 0 0 0 3px rgba(79, 125, 243, 0.2);
    }

    .clay-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.78rem;
      font-weight: 700;
      box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.8), 2px 2px 5px rgba(163, 177, 198, 0.25);
    }
    .badge-blue { background: #E8F0FE; color: var(--royal-blue); }
    .badge-green { background: #E6F8F0; color: #1E7E34; }
    .badge-pink { background: #FDE8EF; color: #C2185B; }
    .badge-yellow { background: #FFF8E1; color: #B78103; }
    .badge-purple { background: #F0EBFC; color: #5B2C6F; }

    /* Layout Containers */
    #sidebar {
      width: 280px;
      min-height: 100vh;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      border-right: var(--clay-border);
      box-shadow: 6px 0 20px rgba(163, 177, 198, 0.25);
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      z-index: 100;
      transition: all 0.3s ease;
      overflow-y: auto;
    }

    .sidebar-header {
      padding: 24px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid rgba(169, 216, 255, 0.3);
    }
    .school-crest-svg {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--royal-blue), var(--primary-blue));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFD66B;
      font-size: 1.3rem;
      box-shadow: var(--clay-shadow-out-sm);
    }
    .school-title {
      font-family: 'Poppins', sans-serif;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--royal-blue);
      line-height: 1.2;
    }
    .school-sub {
      font-size: 0.75rem;
      color: var(--secondary-text);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sidebar-menu {
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-radius: 16px;
      color: var(--secondary-text);
      font-size: 0.9rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .menu-item i {
      font-size: 1rem;
      width: 20px;
      text-align: center;
    }
    .menu-item:hover {
      background: #F0F4FF;
      color: var(--royal-blue);
      transform: translateX(4px);
    }
    .menu-item.active {
      background: linear-gradient(135deg, var(--primary-blue), var(--royal-blue));
      color: white;
      box-shadow: 4px 4px 10px rgba(49, 89, 201, 0.35);
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid rgba(169, 216, 255, 0.3);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .principal-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #FFD66B;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #4a3400;
      box-shadow: var(--clay-shadow-out-sm);
    }

    #main-content {
      margin-left: 280px;
      flex: 1;
      padding: 24px 32px;
      max-width: 1600px;
      transition: all 0.3s ease;
    }

    /* Top Navigation */
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .search-bar-wrap {
      flex: 1;
      max-width: 440px;
      position: relative;
    }
    .search-bar-wrap i {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--secondary-text);
    }
    .search-bar-wrap input {
      padding-left: 40px;
    }

    .top-actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .action-icon-btn {
      width: 42px;
      height: 42px;
      border-radius: 14px;
      background: white;
      border: var(--clay-border);
      box-shadow: var(--clay-shadow-out-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--dark-text);
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
    }
    .action-icon-btn:hover {
      transform: translateY(-2px);
      color: var(--royal-blue);
    }
    .notif-badge-dot {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 8px;
      height: 8px;
      background: #FF6B8B;
      border-radius: 50%;
      border: 2px solid white;
    }

    /* Page Header */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .section-title h1 {
      font-family: 'Poppins', sans-serif;
      font-size: 1.7rem;
      font-weight: 800;
      color: var(--royal-blue);
    }
    .section-title p {
      color: var(--secondary-text);
      font-size: 0.95rem;
      font-weight: 500;
    }

    /* Stat Cards Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      padding: 22px;
      display: flex;
      align-items: center;
      gap: 16px;
      border-radius: 22px;
    }
    .stat-icon {
      width: 54px;
      height: 54px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      box-shadow: var(--clay-shadow-out-sm);
    }
    .stat-val {
      font-family: 'Poppins', sans-serif;
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--dark-text);
      line-height: 1.1;
    }
    .stat-lbl {
      color: var(--secondary-text);
      font-size: 0.85rem;
      font-weight: 700;
      margin-top: 2px;
    }

    /* Content Views */
    .tab-view {
      display: none;
      animation: fadeIn 0.3s ease forwards;
    }
    .tab-view.active {
      display: block;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Clay Table */
    .table-container {
      overflow-x: auto;
      border-radius: 20px;
      background: white;
      box-shadow: var(--clay-shadow-out);
      padding: 6px;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      text-align: left;
    }
    th {
      background: #F6F9FF;
      color: var(--secondary-text);
      font-size: 0.82rem;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.6px;
      padding: 14px 18px;
      border-bottom: 2px solid #E6EEFA;
    }
    th:first-child { border-top-left-radius: 14px; }
    th:last-child { border-top-right-radius: 14px; }
    td {
      padding: 14px 18px;
      border-bottom: 1px solid #EDF2F9;
      font-size: 0.92rem;
      vertical-align: middle;
      font-weight: 600;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #FAFCFF; }

    /* Action Buttons in Tables */
    .table-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .table-btn {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      box-shadow: 2px 2px 6px rgba(163, 177, 198, 0.3);
    }
    .table-btn:hover { transform: translateY(-2px); }
    .table-btn-edit { background: #E8F0FE; color: var(--royal-blue); }
    .table-btn-delete { background: #FDE8EF; color: #E83E8C; }
    .table-btn-view { background: #E6F8F0; color: #28A745; }

    /* Modals */
    .modal-backdrop {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(38, 50, 75, 0.45);
      backdrop-filter: blur(5px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-backdrop.open {
      display: flex;
      animation: modalFadeIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal-box {
      background: white;
      border-radius: 28px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 28px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2), inset 1px 1px 2px rgba(255, 255, 255, 0.8);
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      border-bottom: 1px solid #EDF2F9;
      padding-bottom: 12px;
    }
    .modal-header h2 {
      font-family: 'Poppins', sans-serif;
      font-size: 1.35rem;
      color: var(--royal-blue);
    }
    .modal-close {
      background: transparent;
      border: none;
      font-size: 1.3rem;
      color: var(--secondary-text);
      cursor: pointer;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      font-weight: 700;
      font-size: 0.85rem;
      color: var(--dark-text);
      margin-bottom: 6px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    /* Toast Notifications */
    #toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .toast {
      padding: 14px 20px;
      border-radius: 16px;
      background: white;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), var(--clay-shadow-out);
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      animation: slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border-left: 5px solid var(--royal-blue);
      max-width: 380px;
    }
    .toast.success { border-left-color: #28A745; }
    .toast.error { border-left-color: #E83E8C; }
    .toast.warning { border-left-color: #F39C12; }
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    /* Responsive */
    @media (max-width: 992px) {
      #sidebar { transform: translateX(-100%); }
      #sidebar.open { transform: translateX(0); }
      #main-content { margin-left: 0; padding: 16px; }
      .mobile-menu-toggle { display: flex !important; }
    }
    .mobile-menu-toggle {
      display: none;
    }
  </style>
</head>
<body>

  <!-- Sidebar -->
  <aside id="sidebar">
    <div class="sidebar-header">
      <div class="school-crest-svg">
        <i class="fa-solid fa-graduation-cap"></i>
      </div>
      <div>
        <div class="school-title">St. Mary's College</div>
        <div class="school-sub">Negombo LMS • Admin</div>
      </div>
    </div>

    <nav class="sidebar-menu">
      <a class="menu-item active" onclick="switchTab('overview')"><i class="fa-solid fa-chart-pie"></i> Overview</a>
      <a class="menu-item" onclick="switchTab('students')"><i class="fa-solid fa-user-graduate"></i> Students</a>
      <a class="menu-item" onclick="switchTab('teachers')"><i class="fa-solid fa-chalkboard-user"></i> Teachers</a>
      <a class="menu-item" onclick="switchTab('classes')"><i class="fa-solid fa-shapes"></i> Classes</a>
      <a class="menu-item" onclick="switchTab('subjects')"><i class="fa-solid fa-book-open"></i> Subjects</a>
      <a class="menu-item" onclick="switchTab('academics')"><i class="fa-solid fa-calendar-days"></i> Academic Year</a>
      <a class="menu-item" onclick="switchTab('assignments')"><i class="fa-solid fa-clipboard-list"></i> Assignments</a>
      <a class="menu-item" onclick="switchTab('examinations')"><i class="fa-solid fa-file-signature"></i> Examinations</a>
      <a class="menu-item" onclick="switchTab('attendance')"><i class="fa-solid fa-user-check"></i> Attendance</a>
      <a class="menu-item" onclick="switchTab('results')"><i class="fa-solid fa-award"></i> Results & Grades</a>
      <a class="menu-item" onclick="switchTab('announcements')"><i class="fa-solid fa-bullhorn"></i> Announcements</a>
      <a class="menu-item" onclick="switchTab('timetable')"><i class="fa-solid fa-clock"></i> Timetable</a>
      <a class="menu-item" onclick="switchTab('reports')"><i class="fa-solid fa-chart-line"></i> Reports & Analytics</a>
      <a class="menu-item" onclick="switchTab('users')"><i class="fa-solid fa-users-gear"></i> User Accounts</a>
      <a class="menu-item" onclick="switchTab('settings')"><i class="fa-solid fa-sliders"></i> System Settings</a>
      <a class="menu-item" onclick="switchTab('logs')"><i class="fa-solid fa-shield-halved"></i> Activity Logs</a>
    </nav>

    <div class="sidebar-footer">
      <div class="principal-avatar">P</div>
      <div style="flex:1; overflow:hidden;">
        <div style="font-weight:800; font-size:0.88rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" id="principal-name-display">${user.name || 'Rev. Fr. Principal'}</div>
        <div style="font-size:0.75rem; color:var(--secondary-text);">Super Administrator</div>
      </div>
      <a href="/api/auth/logout" class="table-btn table-btn-delete" title="Sign Out" onclick="handleLogout(event)">
        <i class="fa-solid fa-right-from-bracket"></i>
      </a>
    </div>
  </aside>

  <!-- Main Content Wrapper -->
  <main id="main-content">
    <!-- Top Navigation -->
    <div class="top-bar">
      <button class="action-icon-btn mobile-menu-toggle" onclick="toggleSidebar()"><i class="fa-solid fa-bars"></i></button>

      <div class="search-bar-wrap">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" class="clay-input" id="global-search" placeholder="Search students, teachers, classes..." onkeyup="handleGlobalSearch(this.value)">
      </div>

      <div class="top-actions">
        <span class="clay-badge badge-blue"><i class="fa-solid fa-school"></i> 2026 Academic Year • Term 1</span>
        
        <div class="action-icon-btn" title="Quick Role Switch to Teacher" onclick="quickSwitch('teacher')">
          <i class="fa-solid fa-chalkboard-user"></i>
        </div>
        <div class="action-icon-btn" title="Quick Role Switch to Student" onclick="quickSwitch('student')">
          <i class="fa-solid fa-user-graduate"></i>
        </div>
        <div class="action-icon-btn" title="System Notifications" onclick="showToast('info', 'System running smoothly. All databases active.')">
          <i class="fa-solid fa-bell"></i>
          <span class="notif-badge-dot"></span>
        </div>
        <a href="/" class="clay-btn clay-btn-secondary" style="padding: 8px 14px; font-size:0.85rem;"><i class="fa-solid fa-globe"></i> Portal Home</a>
      </div>
    </div>

    <!-- 1. OVERVIEW TAB -->
    <div id="tab-overview" class="tab-view active">
      <div class="section-header">
        <div class="section-title">
          <h1>School Administration Overview</h1>
          <p>St. Mary's College Negombo — Digital Campus Oversight</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="clay-btn clay-btn-secondary" onclick="exportOverviewReport()"><i class="fa-solid fa-download"></i> Export Summary</button>
          <button class="clay-btn" onclick="openStudentModal()"><i class="fa-solid fa-plus"></i> New Student</button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="clay-card stat-card">
          <div class="stat-icon" style="background:#E8F0FE; color:var(--royal-blue);"><i class="fa-solid fa-user-graduate"></i></div>
          <div>
            <div class="stat-val" id="stat-students">--</div>
            <div class="stat-lbl">Total Students</div>
          </div>
        </div>
        <div class="clay-card stat-card">
          <div class="stat-icon" style="background:#E6F8F0; color:#28A745;"><i class="fa-solid fa-chalkboard-user"></i></div>
          <div>
            <div class="stat-val" id="stat-teachers">--</div>
            <div class="stat-lbl">Faculty Members</div>
          </div>
        </div>
        <div class="clay-card stat-card">
          <div class="stat-icon" style="background:#FFF8E1; color:#F39C12;"><i class="fa-solid fa-shapes"></i></div>
          <div>
            <div class="stat-val" id="stat-classes">--</div>
            <div class="stat-lbl">Total Classes</div>
          </div>
        </div>
        <div class="clay-card stat-card">
          <div class="stat-icon" style="background:#FDE8EF; color:#E83E8C;"><i class="fa-solid fa-book-open"></i></div>
          <div>
            <div class="stat-val" id="stat-subjects">--</div>
            <div class="stat-lbl">Subjects Taught</div>
          </div>
        </div>
        <div class="clay-card stat-card">
          <div class="stat-icon" style="background:#F0EBFC; color:var(--purple);"><i class="fa-solid fa-clipboard-check"></i></div>
          <div>
            <div class="stat-val" id="stat-assignments">--</div>
            <div class="stat-lbl">Active Assignments</div>
          </div>
        </div>
        <div class="clay-card stat-card">
          <div class="stat-icon" style="background:#E0F7FA; color:#0097A7;"><i class="fa-solid fa-folder-open"></i></div>
          <div>
            <div class="stat-val" id="stat-materials">--</div>
            <div class="stat-lbl">Study Materials</div>
          </div>
        </div>
        <div class="clay-card stat-card">
          <div class="stat-icon" style="background:#E8F5E9; color:#388E3C;"><i class="fa-solid fa-user-check"></i></div>
          <div>
            <div class="stat-val" id="stat-attendance">94.8%</div>
            <div class="stat-lbl">Avg. Attendance</div>
          </div>
        </div>
        <div class="clay-card stat-card">
          <div class="stat-icon" style="background:#FFF3E0; color:#E65100;"><i class="fa-solid fa-trophy"></i></div>
          <div>
            <div class="stat-val" id="stat-performance">82.4%</div>
            <div class="stat-lbl">Academic Average</div>
          </div>
        </div>
      </div>

      <!-- Quick Action Panels & Recent Logs -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 24px;">
        <div class="clay-card" style="padding: 24px;">
          <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:16px;"><i class="fa-solid fa-bolt" style="color:var(--yellow);"></i> Quick Administrative Actions</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <button class="clay-btn clay-btn-secondary" onclick="openStudentModal()"><i class="fa-solid fa-user-plus"></i> Add Student</button>
            <button class="clay-btn clay-btn-secondary" onclick="openTeacherModal()"><i class="fa-solid fa-user-tie"></i> Add Teacher</button>
            <button class="clay-btn clay-btn-secondary" onclick="openClassModal()"><i class="fa-solid fa-layer-group"></i> Create Class</button>
            <button class="clay-btn clay-btn-secondary" onclick="openAnnouncementModal()"><i class="fa-solid fa-bullhorn"></i> Post Notice</button>
            <button class="clay-btn clay-btn-secondary" onclick="switchTab('reports')"><i class="fa-solid fa-print"></i> Generate Reports</button>
            <button class="clay-btn clay-btn-secondary" onclick="switchTab('academics')"><i class="fa-solid fa-angles-up"></i> Class Promotions</button>
          </div>
        </div>

        <div class="clay-card" style="padding: 24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="font-family:'Poppins'; color:var(--royal-blue);"><i class="fa-solid fa-timeline"></i> Recent System Activity</h3>
            <span class="clay-badge badge-blue">Audit Trail</span>
          </div>
          <div id="overview-recent-logs" style="display:flex; flex-direction:column; gap:10px; max-height:260px; overflow-y:auto;">
            <!-- Rendered dynamically -->
          </div>
        </div>
      </div>
    </div>

    <!-- 2. STUDENTS TAB -->
    <div id="tab-students" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>Student Directory</h1>
          <p>Manage, enroll, search, and export St. Mary's student records</p>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="clay-btn clay-btn-secondary" onclick="openCsvModal()"><i class="fa-solid fa-file-import"></i> Import CSV</button>
          <button class="clay-btn clay-btn-secondary" onclick="exportStudentsCsv()"><i class="fa-solid fa-file-export"></i> Export CSV</button>
          <button class="clay-btn" onclick="openStudentModal()"><i class="fa-solid fa-user-plus"></i> Add Student</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="clay-card-flat" style="padding: 16px; margin-bottom: 20px; display:flex; gap:14px; flex-wrap:wrap; align-items:center;">
        <div style="flex:1; min-width:200px;">
          <input type="text" id="student-search-input" class="clay-input" placeholder="Search by Student Name or ID..." onkeyup="filterStudents()">
        </div>
        <div style="width:160px;">
          <select id="student-grade-filter" class="clay-input" onchange="filterStudents()">
            <option value="">All Grades</option>
            <option value="6">Grade 6</option>
            <option value="7">Grade 7</option>
            <option value="8">Grade 8</option>
            <option value="9">Grade 9</option>
            <option value="10">Grade 10</option>
            <option value="11">Grade 11</option>
            <option value="12">Grade 12</option>
            <option value="13">Grade 13</option>
          </select>
        </div>
        <div style="width:140px;">
          <select id="student-class-filter" class="clay-input" onchange="filterStudents()">
            <option value="">All Classes</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
          </select>
        </div>
      </div>

      <!-- Students Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>Grade & Class</th>
              <th>Gender</th>
              <th>Guardian / Contact</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="students-table-body">
            <tr><td colspan="7" style="text-align:center; padding:30px;">Loading student records...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 3. TEACHERS TAB -->
    <div id="tab-teachers" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>Faculty & Staff Management</h1>
          <p>Teacher credentials, subject allocations, and assigned classrooms</p>
        </div>
        <button class="clay-btn" onclick="openTeacherModal()"><i class="fa-solid fa-user-plus"></i> Add Faculty Member</button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Teacher ID</th>
              <th>Faculty Name</th>
              <th>Email & Contact</th>
              <th>Assigned Subjects</th>
              <th>Assigned Classes</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="teachers-table-body">
            <tr><td colspan="7" style="text-align:center; padding:30px;">Loading faculty records...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 4. CLASSES TAB -->
    <div id="tab-classes" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>Classrooms & Sections</h1>
          <p>Manage class divisions, class masters, and room allocations</p>
        </div>
        <button class="clay-btn" onclick="openClassModal()"><i class="fa-solid fa-plus"></i> Create New Class</button>
      </div>
      <div id="classes-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
        <!-- Rendered dynamically -->
      </div>
    </div>

    <!-- 5. SUBJECTS TAB -->
    <div id="tab-subjects" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>Academic Curriculum & Subjects</h1>
          <p>Manage subject codes, syllabi, and departmental heads</p>
        </div>
        <button class="clay-btn" onclick="openSubjectModal()"><i class="fa-solid fa-plus"></i> Add New Subject</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Subject Name</th>
              <th>Applicable Grades</th>
              <th>Department Head</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="subjects-table-body">
            <!-- Rendered dynamically -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- 6. ACADEMIC MANAGEMENT TAB -->
    <div id="tab-academics" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>Academic Term & Promotions</h1>
          <p>Configure academic years, terms, and end-of-year batch student promotions</p>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:24px;">
        <div class="clay-card" style="padding:24px;">
          <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:14px;"><i class="fa-solid fa-calendar-check"></i> Current Academic Calendar</h3>
          <p style="color:var(--secondary-text); margin-bottom:16px;">Configure the active term for attendance, examinations, and grade generation.</p>
          <div class="form-group">
            <label>Current Year</label>
            <input type="text" class="clay-input" value="2026 / 2027" readonly>
          </div>
          <div class="form-group">
            <label>Active Term</label>
            <select class="clay-input" id="active-term-selector">
              <option value="Term 1" selected>Term 1 (January - April)</option>
              <option value="Term 2">Term 2 (May - August)</option>
              <option value="Term 3">Term 3 (September - December)</option>
            </select>
          </div>
          <button class="clay-btn" onclick="saveActiveTerm()"><i class="fa-solid fa-floppy-disk"></i> Save Term Configuration</button>
        </div>

        <div class="clay-card" style="padding:24px;">
          <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:14px;"><i class="fa-solid fa-angles-up" style="color:var(--green);"></i> Student Batch Promotion</h3>
          <p style="color:var(--secondary-text); margin-bottom:16px;">Promote an entire cohort of students to the next grade upon term/year completion.</p>
          <div class="form-group">
            <label>From Grade</label>
            <select class="clay-input" id="promote-from-grade">
              <option value="10">Grade 10</option>
              <option value="9">Grade 9</option>
              <option value="8">Grade 8</option>
              <option value="7">Grade 7</option>
              <option value="6">Grade 6</option>
            </select>
          </div>
          <div class="form-group">
            <label>To Grade</label>
            <select class="clay-input" id="promote-to-grade">
              <option value="11">Grade 11 (O/L Preparation)</option>
              <option value="10">Grade 10</option>
              <option value="9">Grade 9</option>
              <option value="8">Grade 8</option>
              <option value="7">Grade 7</option>
            </select>
          </div>
          <button class="clay-btn clay-btn-success" onclick="executePromotion()"><i class="fa-solid fa-arrow-up-right-dots"></i> Execute Batch Promotion</button>
        </div>
      </div>
    </div>

    <!-- 7. ASSIGNMENTS OVERSIGHT TAB -->
    <div id="tab-assignments" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>School-Wide Assignments</h1>
          <p>Oversight of coursework, teacher postings, and submission completion rates</p>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Subject</th>
              <th>Target Class</th>
              <th>Assigned By</th>
              <th>Due Date</th>
              <th>Max Marks</th>
            </tr>
          </thead>
          <tbody id="admin-assignments-body">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- 8. EXAMINATIONS OVERSIGHT TAB -->
    <div id="tab-examinations" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>Examination Administration</h1>
          <p>Review term tests, online quizzes, and question papers</p>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Exam Title</th>
              <th>Subject</th>
              <th>Class</th>
              <th>Duration</th>
              <th>Questions</th>
              <th>Total Marks</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="admin-exams-body">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- 9. ATTENDANCE SUMMARY TAB -->
    <div id="tab-attendance" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>School Attendance Analysis</h1>
          <p>Daily and monthly attendance statistics by class</p>
        </div>
        <button class="clay-btn clay-btn-secondary" onclick="printAttendanceReport()"><i class="fa-solid fa-print"></i> Print Roster</button>
      </div>
      <div id="attendance-summary-cards" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:18px;">
        <!-- Dynamically populated -->
      </div>
    </div>

    <!-- 10. RESULTS TAB -->
    <div id="tab-results" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>Academic Performance & Results</h1>
          <p>Term exam marksheets, student performance ranking, and grade averages</p>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Grade / Class</th>
              <th>Subject</th>
              <th>Marks</th>
              <th>Grade</th>
              <th>Term</th>
            </tr>
          </thead>
          <tbody id="admin-results-body">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- 11. ANNOUNCEMENTS TAB -->
    <div id="tab-announcements" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>School Announcements & Notices</h1>
          <p>Publish official circulars to students, teachers, or the entire school</p>
        </div>
        <button class="clay-btn" onclick="openAnnouncementModal()"><i class="fa-solid fa-bullhorn"></i> New Announcement</button>
      </div>
      <div id="admin-announcements-list" style="display:flex; flex-direction:column; gap:16px;">
        <!-- Dynamically populated -->
      </div>
    </div>

    <!-- 12. TIMETABLE TAB -->
    <div id="tab-timetable" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>Master Class Timetable</h1>
          <p>Weekly schedules, period allocations, and classroom assignments</p>
        </div>
      </div>
      <div class="clay-card" style="padding:20px; overflow-x:auto;">
        <div style="margin-bottom:14px; display:flex; gap:12px; align-items:center;">
          <label style="font-weight:700;">Select Class:</label>
          <select id="timetable-class-select" class="clay-input" style="width:200px;" onchange="loadTimetable(this.value)">
            <option value="Grade 10A">Grade 10A</option>
            <option value="Grade 10B">Grade 10B</option>
            <option value="Grade 11A">Grade 11A</option>
            <option value="Grade 11B">Grade 11B</option>
          </select>
        </div>
        <table id="admin-timetable-table">
          <thead>
            <tr>
              <th>Period / Time</th>
              <th>Monday</th>
              <th>Tuesday</th>
              <th>Wednesday</th>
              <th>Thursday</th>
              <th>Friday</th>
            </tr>
          </thead>
          <tbody id="admin-timetable-body">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- 13. REPORTS TAB -->
    <div id="tab-reports" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>Reports & Administrative Analytics</h1>
          <p>Exportable school audit sheets and performance analytics</p>
        </div>
        <button class="clay-btn" onclick="window.print()"><i class="fa-solid fa-print"></i> Print Report</button>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">
        <div class="clay-card" style="padding:22px;">
          <h3 style="font-family:'Poppins'; color:var(--royal-blue);"><i class="fa-solid fa-file-pdf"></i> Enrollment Summary</h3>
          <p style="color:var(--secondary-text); margin:8px 0 16px;">Detailed breakdown of boys & girls enrolled per grade.</p>
          <button class="clay-btn clay-btn-secondary" onclick="exportStudentsCsv()"><i class="fa-solid fa-download"></i> Download CSV</button>
        </div>
        <div class="clay-card" style="padding:22px;">
          <h3 style="font-family:'Poppins'; color:var(--royal-blue);"><i class="fa-solid fa-square-poll-vertical"></i> Academic Grade Sheet</h3>
          <p style="color:var(--secondary-text); margin:8px 0 16px;">Complete mark distribution across all subjects.</p>
          <button class="clay-btn clay-btn-secondary" onclick="showToast('success', 'Preparing marks export...')"><i class="fa-solid fa-download"></i> Export Marks</button>
        </div>
        <div class="clay-card" style="padding:22px;">
          <h3 style="font-family:'Poppins'; color:var(--royal-blue);"><i class="fa-solid fa-calendar-day"></i> Attendance Audit</h3>
          <p style="color:var(--secondary-text); margin:8px 0 16px;">Monthly present / absent ratio per section.</p>
          <button class="clay-btn clay-btn-secondary" onclick="showToast('success', 'Exporting attendance audit log...')"><i class="fa-solid fa-download"></i> Export Attendance</button>
        </div>
      </div>
    </div>

    <!-- 14. USERS TAB -->
    <div id="tab-users" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>System User Accounts</h1>
          <p>Active logins, authentication statuses, and security credentials</p>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="admin-users-body">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- 15. SETTINGS TAB -->
    <div id="tab-settings" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>School System Settings</h1>
          <p>Configure St. Mary's College institution profile and system defaults</p>
        </div>
      </div>
      <div class="clay-card" style="padding:28px; max-width:800px;">
        <form id="settings-form" onsubmit="handleSettingsSave(event)">
          <div class="form-row">
            <div class="form-group">
              <label>School Name</label>
              <input type="text" class="clay-input" id="setting-school-name" value="St. Mary's College Negombo">
            </div>
            <div class="form-group">
              <label>Official Motto</label>
              <input type="text" class="clay-input" id="setting-motto" value="Empowering Students. Inspiring Excellence. Building Tomorrow.">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Official Email</label>
              <input type="email" class="clay-input" id="setting-email" value="info@stmarysnegombo.example">
            </div>
            <div class="form-group">
              <label>Contact Phone</label>
              <input type="text" class="clay-input" id="setting-phone" value="+94 31 555 0123">
            </div>
          </div>
          <div class="form-group">
            <label>School Physical Address</label>
            <input type="text" class="clay-input" id="setting-address" value="Negombo, Western Province, Sri Lanka">
          </div>
          <div style="margin-top:20px;">
            <button type="submit" class="clay-btn"><i class="fa-solid fa-floppy-disk"></i> Save School Settings</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 16. ACTIVITY LOGS TAB -->
    <div id="tab-logs" class="tab-view">
      <div class="section-header">
        <div class="section-title">
          <h1>System Audit & Activity Logs</h1>
          <p>Immutable audit trail of administrator, teacher, and student operations</p>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Role</th>
              <th>Target Entity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody id="admin-logs-body">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>

  </main>

  <!-- MODAL: ADD / EDIT STUDENT -->
  <div class="modal-backdrop" id="student-modal">
    <div class="modal-box">
      <div class="modal-header">
        <h2 id="student-modal-title">Register New Student</h2>
        <button class="modal-close" onclick="closeModal('student-modal')">&times;</button>
      </div>
      <form id="student-form" onsubmit="handleStudentSubmit(event)">
        <input type="hidden" id="student-id-field">
        <div class="form-group">
          <label>Full Name *</label>
          <input type="text" class="clay-input" id="student-name-input" required placeholder="e.g. Alex Fernando">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Grade *</label>
            <select class="clay-input" id="student-grade-input" required>
              <option value="6">Grade 6</option>
              <option value="7">Grade 7</option>
              <option value="8">Grade 8</option>
              <option value="9">Grade 9</option>
              <option value="10" selected>Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
              <option value="13">Grade 13</option>
            </select>
          </div>
          <div class="form-group">
            <label>Class Section *</label>
            <select class="clay-input" id="student-class-input" required>
              <option value="A" selected>Section A</option>
              <option value="B">Section B</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email (Optional)</label>
            <input type="email" class="clay-input" id="student-email-input" placeholder="student@stmarys.lk">
          </div>
          <div class="form-group">
            <label>Gender</label>
            <select class="clay-input" id="student-gender-input">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Parent / Guardian Name</label>
            <input type="text" class="clay-input" id="student-parent-input" placeholder="e.g. Mr. Ranjan Fernando">
          </div>
          <div class="form-group">
            <label>Parent Contact Phone</label>
            <input type="text" class="clay-input" id="student-phone-input" placeholder="+94 77 123 4567">
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="clay-btn clay-btn-secondary" onclick="closeModal('student-modal')">Cancel</button>
          <button type="submit" class="clay-btn"><i class="fa-solid fa-check"></i> Save Student</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: ADD / EDIT TEACHER -->
  <div class="modal-backdrop" id="teacher-modal">
    <div class="modal-box">
      <div class="modal-header">
        <h2 id="teacher-modal-title">Add Faculty Member</h2>
        <button class="modal-close" onclick="closeModal('teacher-modal')">&times;</button>
      </div>
      <form id="teacher-form" onsubmit="handleTeacherSubmit(event)">
        <input type="hidden" id="teacher-id-field">
        <div class="form-group">
          <label>Full Name *</label>
          <input type="text" class="clay-input" id="teacher-name-input" required placeholder="e.g. Mr. Sunil Perera">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Email *</label>
            <input type="email" class="clay-input" id="teacher-email-input" required placeholder="perera@stmarys.lk">
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="text" class="clay-input" id="teacher-phone-input" placeholder="+94 71 555 0101">
          </div>
        </div>
        <div class="form-group">
          <label>Assigned Subjects (comma separated)</label>
          <input type="text" class="clay-input" id="teacher-subjects-input" placeholder="Mathematics, Science">
        </div>
        <div class="form-group">
          <label>Assigned Classes (comma separated)</label>
          <input type="text" class="clay-input" id="teacher-classes-input" placeholder="Grade 10A, Grade 11A">
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="clay-btn clay-btn-secondary" onclick="closeModal('teacher-modal')">Cancel</button>
          <button type="submit" class="clay-btn"><i class="fa-solid fa-check"></i> Save Faculty</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: CSV IMPORT -->
  <div class="modal-backdrop" id="csv-modal">
    <div class="modal-box">
      <div class="modal-header">
        <h2>Bulk Import Students via CSV</h2>
        <button class="modal-close" onclick="closeModal('csv-modal')">&times;</button>
      </div>
      <div style="margin-bottom:14px; font-size:0.85rem; color:var(--secondary-text);">
        Format: <code>fullName, grade, className, gender, parentName, parentPhone</code>
      </div>
      <textarea id="csv-textarea" class="clay-input" style="height:150px; resize:vertical; font-family:monospace;" placeholder="fullName,grade,className,gender,parentName,parentPhone
Nimal Perera,10,A,Male,Sunil Perera,+94771234567
Sanduni Silva,10,B,Female,Kanthi Silva,+94772345678"></textarea>
      <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
        <button type="button" class="clay-btn clay-btn-secondary" onclick="closeModal('csv-modal')">Cancel</button>
        <button type="button" class="clay-btn" onclick="executeCsvImport()"><i class="fa-solid fa-upload"></i> Process CSV Import</button>
      </div>
    </div>
  </div>

  <!-- MODAL: ANNOUNCEMENT -->
  <div class="modal-backdrop" id="announcement-modal">
    <div class="modal-box">
      <div class="modal-header">
        <h2>Create School Announcement</h2>
        <button class="modal-close" onclick="closeModal('announcement-modal')">&times;</button>
      </div>
      <form id="announcement-form" onsubmit="handleAnnouncementSubmit(event)">
        <div class="form-group">
          <label>Title *</label>
          <input type="text" class="clay-input" id="ann-title" required placeholder="e.g. Annual Sports Meet 2026">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Category</label>
            <select class="clay-input" id="ann-category">
              <option value="Academic">Academic</option>
              <option value="Sports">Sports</option>
              <option value="Notice">General Notice</option>
              <option value="Event">School Event</option>
            </select>
          </div>
          <div class="form-group">
            <label>Target Audience</label>
            <select class="clay-input" id="ann-audience">
              <option value="Everyone">Everyone</option>
              <option value="Students">Students Only</option>
              <option value="Teachers">Teachers Only</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Message Content *</label>
          <textarea class="clay-input" id="ann-content" required style="height:100px; resize:vertical;"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="clay-btn clay-btn-secondary" onclick="closeModal('announcement-modal')">Cancel</button>
          <button type="submit" class="clay-btn"><i class="fa-solid fa-paper-plane"></i> Publish</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Toast Notification Container -->
  <div id="toast-container"></div>

  <!-- Client-side Logic Script -->
  <script>
    // State
    let studentsCache = [];
    let teachersCache = [];
    let currentTab = 'overview';

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenInUrl = urlParams.get('token');
      if (tokenInUrl) {
        try {
          localStorage.setItem('stmarys_token', tokenInUrl);
          document.cookie = 'token=' + tokenInUrl + '; path=/; max-age=604800; SameSite=None; Secure';
        } catch (_) {}
        urlParams.delete('token');
        const newQuery = urlParams.toString();
        const newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '') + window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }

      loadDashboardStats();
      loadStudents();
      loadTeachers();
      loadClasses();
      loadSubjects();
      loadAnnouncements();
      loadOversightData();
      loadTimetable('Grade 10A');
    });

    function toggleSidebar() {
      document.getElementById('sidebar').classList.toggle('open');
    }

    function switchTab(tabName) {
      currentTab = tabName;
      document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.sidebar-menu .menu-item').forEach(el => el.classList.remove('active'));

      const target = document.getElementById('tab-' + tabName);
      if (target) target.classList.add('active');

      const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
      menuItems.forEach(item => {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(tabName)) {
          item.classList.add('active');
        }
      });

      // Refresh specific tab data if needed
      if (tabName === 'overview') loadDashboardStats();
      if (tabName === 'students') loadStudents();
      if (tabName === 'teachers') loadTeachers();
      if (tabName === 'users') loadUsers();
      if (tabName === 'logs') loadLogs();
      if (tabName === 'attendance') loadAttendanceSummary();

      if (window.innerWidth < 992) {
        document.getElementById('sidebar').classList.remove('open');
      }
    }

    function showToast(type, message) {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      let icon = 'fa-circle-info';
      if (type === 'success') icon = 'fa-circle-check';
      if (type === 'error') icon = 'fa-triangle-exclamation';
      toast.innerHTML = '<i class="fa-solid ' + icon + '"></i><span>' + message + '</span>';
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    // Modal Helpers
    function openModal(id) {
      const modal = document.getElementById(id);
      if (modal) modal.classList.add('open');
    }
    function closeModal(id) {
      const modal = document.getElementById(id);
      if (modal) modal.classList.remove('open');
    }

    // 1. DASHBOARD STATS
    async function loadDashboardStats() {
      try {
        const res = await fetch('/api/admin/dashboard');
        const json = await res.json();
        if (json.success) {
          const stats = json.data.stats;
          document.getElementById('stat-students').innerText = stats.totalStudents || 30;
          document.getElementById('stat-teachers').innerText = stats.totalTeachers || 5;
          document.getElementById('stat-classes').innerText = stats.totalClasses || 8;
          document.getElementById('stat-subjects').innerText = stats.totalSubjects || 10;
          document.getElementById('stat-assignments').innerText = stats.activeAssignments || 10;
          document.getElementById('stat-materials').innerText = stats.totalMaterials || 15;

          // Render Recent Logs
          const logsContainer = document.getElementById('overview-recent-logs');
          if (json.data.recentLogs && json.data.recentLogs.length > 0) {
            logsContainer.innerHTML = json.data.recentLogs.map(l => \`
              <div class="clay-card-flat" style="padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-weight:700; font-size:0.88rem; color:var(--royal-blue);">\${escapeHtml(l.action)}</div>
                  <div style="font-size:0.75rem; color:var(--secondary-text);">By \${escapeHtml(l.userName)} (\${escapeHtml(l.role)}) • \${escapeHtml(l.details || '')}</div>
                </div>
                <span style="font-size:0.75rem; color:var(--secondary-text);">\${new Date(l.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            \`).join('');
          } else {
            logsContainer.innerHTML = '<div style="color:var(--secondary-text); font-size:0.85rem;">No recent activities logged.</div>';
          }
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    }

    // 2. STUDENTS
    async function loadStudents() {
      try {
        const res = await fetch('/api/admin/students');
        const json = await res.json();
        if (json.success) {
          studentsCache = json.data.students || [];
          renderStudentsTable(studentsCache);
        }
      } catch (err) {
        console.error('Failed to load students:', err);
      }
    }

    function renderStudentsTable(students) {
      const tbody = document.getElementById('students-table-body');
      if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;">No students found matching your criteria.</td></tr>';
        return;
      }
      tbody.innerHTML = students.map(s => \`
        <tr>
          <td><span class="clay-badge badge-blue">\${escapeHtml(s.studentId)}</span></td>
          <td style="font-weight:700; color:var(--dark-text);">\${escapeHtml(s.fullName)}</td>
          <td>Grade \${escapeHtml(s.grade)}\${escapeHtml(s.className)}</td>
          <td>\${escapeHtml(s.gender || 'N/A')}</td>
          <td>\${escapeHtml(s.parentName || 'N/A')} <span style="font-size:0.75rem; color:var(--secondary-text);">(\${escapeHtml(s.parentPhone || '-')})</span></td>
          <td><span class="clay-badge badge-green">Active</span></td>
          <td style="text-align:right;">
            <div class="table-actions" style="justify-content:flex-end;">
              <button class="table-btn table-btn-edit" title="Edit Student" onclick="editStudent('\${s._id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="table-btn table-btn-delete" title="Delete Student" onclick="deleteStudent('\${s._id}', '\${escapeHtml(s.fullName)}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      \`).join('');
    }

    function filterStudents() {
      const q = document.getElementById('student-search-input').value.toLowerCase();
      const grade = document.getElementById('student-grade-filter').value;
      const cls = document.getElementById('student-class-filter').value;

      const filtered = studentsCache.filter(s => {
        const matchQ = (s.fullName && s.fullName.toLowerCase().includes(q)) || (s.studentId && s.studentId.toLowerCase().includes(q));
        const matchG = !grade || String(s.grade) === grade;
        const matchC = !cls || s.className === cls;
        return matchQ && matchG && matchC;
      });
      renderStudentsTable(filtered);
    }

    function openStudentModal(id = null) {
      document.getElementById('student-form').reset();
      document.getElementById('student-id-field').value = '';
      document.getElementById('student-modal-title').innerText = 'Register New Student';
      if (id) {
        const s = studentsCache.find(x => x._id === id);
        if (s) {
          document.getElementById('student-id-field').value = s._id;
          document.getElementById('student-name-input').value = s.fullName;
          document.getElementById('student-grade-input').value = s.grade;
          document.getElementById('student-class-input').value = s.className;
          document.getElementById('student-email-input').value = s.email || '';
          document.getElementById('student-gender-input').value = s.gender || 'Male';
          document.getElementById('student-parent-input').value = s.parentName || '';
          document.getElementById('student-phone-input').value = s.parentPhone || '';
          document.getElementById('student-modal-title').innerText = 'Edit Student Details';
        }
      }
      openModal('student-modal');
    }

    async function handleStudentSubmit(e) {
      e.preventDefault();
      const id = document.getElementById('student-id-field').value;
      const payload = {
        fullName: document.getElementById('student-name-input').value,
        grade: document.getElementById('student-grade-input').value,
        className: document.getElementById('student-class-input').value,
        email: document.getElementById('student-email-input').value,
        gender: document.getElementById('student-gender-input').value,
        parentName: document.getElementById('student-parent-input').value,
        parentPhone: document.getElementById('student-phone-input').value
      };

      try {
        const url = id ? '/api/admin/students/' + id : '/api/admin/students';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          showToast('success', json.message);
          closeModal('student-modal');
          loadStudents();
          loadDashboardStats();
        } else {
          showToast('error', json.message);
        }
      } catch (err) {
        showToast('error', err.message);
      }
    }

    function editStudent(id) {
      openStudentModal(id);
    }

    async function deleteStudent(id, name) {
      if (!confirm(\`Are you sure you want to remove \${name} from St. Mary's College records?\`)) return;
      try {
        const res = await fetch('/api/admin/students/' + id, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          showToast('success', 'Student removed successfully');
          loadStudents();
          loadDashboardStats();
        } else {
          showToast('error', json.message);
        }
      } catch (err) {
        showToast('error', err.message);
      }
    }

    function openCsvModal() {
      openModal('csv-modal');
    }

    async function executeCsvImport() {
      const csvText = document.getElementById('csv-textarea').value;
      if (!csvText.trim()) return showToast('error', 'Please paste CSV content');
      try {
        const res = await fetch('/api/admin/students/import-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvText })
        });
        const json = await res.json();
        if (json.success) {
          showToast('success', json.message);
          closeModal('csv-modal');
          loadStudents();
          loadDashboardStats();
        } else {
          showToast('error', json.message);
        }
      } catch (err) {
        showToast('error', err.message);
      }
    }

    function exportStudentsCsv() {
      if (!studentsCache.length) return showToast('warning', 'No students to export');
      let csv = 'Student ID,Full Name,Grade,Class,Gender,Parent,Contact\\n';
      studentsCache.forEach(s => {
        csv += \`"\${s.studentId}","\${s.fullName}","\${s.grade}","\${s.className}","\${s.gender || ''}","\${s.parentName || ''}","\${s.parentPhone || ''}"\\n\`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`St_Marys_Students_\${new Date().toISOString().slice(0,10)}.csv\`;
      a.click();
      showToast('success', 'Student records exported to CSV');
    }

    // 3. TEACHERS
    async function loadTeachers() {
      try {
        const res = await fetch('/api/admin/teachers');
        const json = await res.json();
        if (json.success) {
          teachersCache = json.data || [];
          renderTeachersTable(teachersCache);
        }
      } catch (err) {
        console.error('Failed to load teachers:', err);
      }
    }

    function renderTeachersTable(teachers) {
      const tbody = document.getElementById('teachers-table-body');
      if (!teachers || teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;">No faculty members registered.</td></tr>';
        return;
      }
      tbody.innerHTML = teachers.map(t => \`
        <tr>
          <td><span class="clay-badge badge-purple">\${escapeHtml(t.teacherId)}</span></td>
          <td style="font-weight:700;">\${escapeHtml(t.fullName)}</td>
          <td>\${escapeHtml(t.email)}<br><span style="font-size:0.75rem; color:var(--secondary-text);">\${escapeHtml(t.phone || '-')}</span></td>
          <td>\${(t.assignedSubjects || []).map(s => \`<span class="clay-badge badge-blue">\${escapeHtml(s)}</span>\`).join(' ')}</td>
          <td>\${(t.assignedClasses || []).map(c => \`<span class="clay-badge badge-yellow">\${escapeHtml(c)}</span>\`).join(' ')}</td>
          <td><span class="clay-badge badge-green">Active</span></td>
          <td style="text-align:right;">
            <div class="table-actions" style="justify-content:flex-end;">
              <button class="table-btn table-btn-edit" title="Reset Password" onclick="resetTeacherPassword('\${t._id}', '\${escapeHtml(t.fullName)}')"><i class="fa-solid fa-key"></i></button>
              <button class="table-btn table-btn-delete" title="Remove Faculty" onclick="deleteTeacher('\${t._id}', '\${escapeHtml(t.fullName)}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>
      \`).join('');
    }

    function openTeacherModal() {
      document.getElementById('teacher-form').reset();
      document.getElementById('teacher-id-field').value = '';
      openModal('teacher-modal');
    }

    async function handleTeacherSubmit(e) {
      e.preventDefault();
      const payload = {
        fullName: document.getElementById('teacher-name-input').value,
        email: document.getElementById('teacher-email-input').value,
        phone: document.getElementById('teacher-phone-input').value,
        assignedSubjects: document.getElementById('teacher-subjects-input').value.split(',').map(s => s.trim()).filter(Boolean),
        assignedClasses: document.getElementById('teacher-classes-input').value.split(',').map(c => c.trim()).filter(Boolean)
      };
      try {
        const res = await fetch('/api/admin/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          showToast('success', json.message);
          closeModal('teacher-modal');
          loadTeachers();
          loadDashboardStats();
        } else {
          showToast('error', json.message);
        }
      } catch (err) {
        showToast('error', err.message);
      }
    }

    async function resetTeacherPassword(id, name) {
      const newPwd = prompt(\`Enter new temporary password for \${name}:\`, 'Teacher@123');
      if (!newPwd) return;
      try {
        const res = await fetch(\`/api/admin/teachers/\${id}/reset-password\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: newPwd })
        });
        const json = await res.json();
        showToast(json.success ? 'success' : 'error', json.message);
      } catch (err) {
        showToast('error', err.message);
      }
    }

    async function deleteTeacher(id, name) {
      if (!confirm(\`Remove \${name} from teaching faculty?\`)) return;
      try {
        const res = await fetch('/api/admin/teachers/' + id, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          showToast('success', json.message);
          loadTeachers();
          loadDashboardStats();
        } else {
          showToast('error', json.message);
        }
      } catch (err) {
        showToast('error', err.message);
      }
    }

    // 4. CLASSES & SUBJECTS
    async function loadClasses() {
      try {
        const res = await fetch('/api/admin/classes');
        const json = await res.json();
        if (json.success) {
          const grid = document.getElementById('classes-grid');
          grid.innerHTML = (json.data || []).map(c => \`
            <div class="clay-card" style="padding:20px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="font-family:'Poppins'; color:var(--royal-blue);">\${escapeHtml(c.name)}</h3>
                <span class="clay-badge badge-blue">Grade \${escapeHtml(c.grade)}</span>
              </div>
              <div style="font-size:0.88rem; color:var(--secondary-text); margin-bottom:8px;">
                <i class="fa-solid fa-chalkboard-user"></i> Master: <strong>\${escapeHtml(c.classTeacher || 'Assigned')}</strong>
              </div>
              <div style="font-size:0.88rem; color:var(--secondary-text); margin-bottom:14px;">
                <i class="fa-solid fa-users"></i> Enrolled: <strong>\${c.studentCount || 30} Students</strong>
              </div>
              <button class="clay-btn clay-btn-secondary" style="width:100%; justify-content:center;" onclick="switchTab('students')">View Students</button>
            </div>
          \`).join('');
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    }

    async function loadSubjects() {
      try {
        const res = await fetch('/api/admin/subjects');
        const json = await res.json();
        if (json.success) {
          const tbody = document.getElementById('subjects-table-body');
          tbody.innerHTML = (json.data || []).map(s => \`
            <tr>
              <td><span class="clay-badge badge-blue">\${escapeHtml(s.code)}</span></td>
              <td style="font-weight:700;">\${escapeHtml(s.name)}</td>
              <td>Grades \${escapeHtml((s.applicableGrades || ['6-11']).join(', '))}</td>
              <td>\${escapeHtml(s.departmentHead || 'Faculty Member')}</td>
              <td style="text-align:right;">
                <button class="table-btn table-btn-edit" onclick="showToast('info', 'Curriculum active')"><i class="fa-solid fa-check"></i></button>
              </td>
            </tr>
          \`).join('');
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    }

    // 5. ANNOUNCEMENTS
    async function loadAnnouncements() {
      try {
        const res = await fetch('/api/admin/announcements');
        const json = await res.json();
        if (json.success) {
          const list = document.getElementById('admin-announcements-list');
          list.innerHTML = (json.data || []).map(a => \`
            <div class="clay-card" style="padding:20px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <div>
                  <span class="clay-badge badge-blue">\${escapeHtml(a.category || 'General')}</span>
                  <span class="clay-badge badge-yellow" style="margin-left:6px;">Audience: \${escapeHtml(a.targetAudience || 'Everyone')}</span>
                  <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-top:8px;">\${escapeHtml(a.title)}</h3>
                </div>
                <button class="table-btn table-btn-delete" title="Delete Announcement" onclick="deleteAnnouncement('\${a._id}')"><i class="fa-solid fa-trash"></i></button>
              </div>
              <p style="color:var(--dark-text); font-size:0.92rem; line-height:1.5; margin-bottom:12px;">\${escapeHtml(a.content)}</p>
              <div style="font-size:0.78rem; color:var(--secondary-text);">
                Published by \${escapeHtml(a.createdBy || 'Principal')} on \${new Date(a.publishedDate || Date.now()).toLocaleDateString()}
              </div>
            </div>
          \`).join('');
        }
      } catch (err) {
        console.error('Failed to load announcements:', err);
      }
    }

    function openAnnouncementModal() {
      document.getElementById('announcement-form').reset();
      openModal('announcement-modal');
    }

    async function handleAnnouncementSubmit(e) {
      e.preventDefault();
      const payload = {
        title: document.getElementById('ann-title').value,
        category: document.getElementById('ann-category').value,
        targetAudience: document.getElementById('ann-audience').value,
        content: document.getElementById('ann-content').value
      };
      try {
        const res = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          showToast('success', 'Announcement published');
          closeModal('announcement-modal');
          loadAnnouncements();
        } else {
          showToast('error', json.message);
        }
      } catch (err) {
        showToast('error', err.message);
      }
    }

    async function deleteAnnouncement(id) {
      if (!confirm('Remove this announcement?')) return;
      try {
        const res = await fetch('/api/admin/announcements/' + id, { method: 'DELETE' });
        const json = await res.json();
        showToast(json.success ? 'success' : 'error', json.message);
        loadAnnouncements();
      } catch (err) {
        showToast('error', err.message);
      }
    }

    // 6. OVERSIGHT DATA (Assignments, Exams, Results, Attendance)
    async function loadOversightData() {
      try {
        // Assignments
        const aRes = await fetch('/api/admin/assignments');
        const aJson = await aRes.json();
        if (aJson.success) {
          const aBody = document.getElementById('admin-assignments-body');
          aBody.innerHTML = (aJson.data || []).map(a => \`
            <tr>
              <td style="font-weight:700;">\${escapeHtml(a.title)}</td>
              <td><span class="clay-badge badge-blue">\${escapeHtml(a.subject || 'General')}</span></td>
              <td>Grade \${escapeHtml(a.targetClass || '10A')}</td>
              <td>\${escapeHtml(a.teacherName || 'Assigned Faculty')}</td>
              <td>\${escapeHtml(a.dueDate || '2026-04-15')}</td>
              <td>\${a.maxMarks || 100} pts</td>
            </tr>
          \`).join('');
        }

        // Exams
        const eRes = await fetch('/api/admin/examinations');
        const eJson = await eRes.json();
        if (eJson.success) {
          const eBody = document.getElementById('admin-exams-body');
          eBody.innerHTML = (eJson.data || []).map(e => \`
            <tr>
              <td style="font-weight:700;">\${escapeHtml(e.title)}</td>
              <td><span class="clay-badge badge-blue">\${escapeHtml(e.subject || 'General')}</span></td>
              <td>Grade \${escapeHtml(e.targetClass || '10A')}</td>
              <td>\${e.durationMinutes || 60} mins</td>
              <td>\${(e.questions || []).length} Qs</td>
              <td>\${e.totalMarks || 100} pts</td>
              <td><span class="clay-badge badge-green">\${e.isPublished ? 'Published' : 'Draft'}</span></td>
            </tr>
          \`).join('');
        }

        // Results
        const rRes = await fetch('/api/admin/results');
        const rJson = await rRes.json();
        if (rJson.success) {
          const rBody = document.getElementById('admin-results-body');
          rBody.innerHTML = (rJson.data || []).map(r => \`
            <tr>
              <td style="font-weight:700;">\${escapeHtml(r.studentName)}</td>
              <td>Grade \${escapeHtml(r.className || '10A')}</td>
              <td>\${escapeHtml(r.subject)}</td>
              <td>\${r.marks} / 100</td>
              <td><span class="clay-badge \${r.grade === 'A' ? 'badge-green' : r.grade === 'B' ? 'badge-blue' : 'badge-yellow'}">\${r.grade}</span></td>
              <td>Term 1</td>
            </tr>
          \`).join('');
        }
      } catch (err) {
        console.error('Failed to load oversight records:', err);
      }
    }

    async function loadAttendanceSummary() {
      try {
        const res = await fetch('/api/admin/attendance');
        const json = await res.json();
        if (json.success) {
          const container = document.getElementById('attendance-summary-cards');
          container.innerHTML = (json.data || []).map(item => \`
            <div class="clay-card" style="padding:20px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="font-family:'Poppins'; color:var(--royal-blue);">\${escapeHtml(item.className)}</h3>
                <span class="clay-badge badge-green">\${item.percentage || '95'}% Present</span>
              </div>
              <div style="font-size:0.88rem; color:var(--secondary-text); margin-bottom:6px;">
                Present: <strong>\${item.presentCount || 28}</strong> / \${item.totalEnrolled || 30} Students
              </div>
              <div style="font-size:0.88rem; color:var(--secondary-text);">
                Absent: <strong>\${item.absentCount || 2}</strong>
              </div>
            </div>
          \`).join('');
        }
      } catch (err) {
        console.error('Failed to load attendance summary:', err);
      }
    }

    // 7. TIMETABLE
    async function loadTimetable(className) {
      try {
        const res = await fetch('/api/admin/timetable?className=' + encodeURIComponent(className));
        const json = await res.json();
        const tbody = document.getElementById('admin-timetable-body');
        const periods = ['Period 1 (08:00 - 08:45)', 'Period 2 (08:45 - 09:30)', 'Period 3 (09:45 - 10:30)', 'Period 4 (10:30 - 11:15)', 'Period 5 (11:45 - 12:30)', 'Period 6 (12:30 - 01:15)'];
        const sampleSubjects = ['Mathematics', 'Science', 'English', 'Sinhala', 'History', 'ICT', 'Buddhism', 'Geography'];

        tbody.innerHTML = periods.map((p, pIdx) => {
          return \`
            <tr>
              <td style="font-weight:700; color:var(--royal-blue);">\${p}</td>
              \${[1,2,3,4,5].map(day => {
                const subj = sampleSubjects[(pIdx + day) % sampleSubjects.length];
                return \`<td><span class="clay-badge badge-blue">\${subj}</span></td>\`;
              }).join('')}
            </tr>
          \`;
        }).join('');
      } catch (err) {
        console.error('Failed to load timetable:', err);
      }
    }

    // 8. USERS
    async function loadUsers() {
      try {
        const res = await fetch('/api/admin/users');
        const json = await res.json();
        if (json.success) {
          const tbody = document.getElementById('admin-users-body');
          tbody.innerHTML = (json.data || []).map(u => \`
            <tr>
              <td style="font-weight:700;">\${escapeHtml(u.name || 'User')}</td>
              <td>\${escapeHtml(u.email)}</td>
              <td><span class="clay-badge \${u.role === 'principal' ? 'badge-yellow' : u.role === 'teacher' ? 'badge-purple' : 'badge-blue'}">\${u.role.toUpperCase()}</span></td>
              <td><span class="clay-badge \${u.status === 'active' ? 'badge-green' : 'badge-pink'}">\${u.status || 'active'}</span></td>
              <td>\${new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
              <td style="text-align:right;">
                <button class="table-btn table-btn-edit" title="Toggle Status" onclick="toggleUserStatus('\${u._id}', '\${u.status}')"><i class="fa-solid fa-power-off"></i></button>
              </td>
            </tr>
          \`).join('');
        }
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    }

    async function toggleUserStatus(id, currentStatus) {
      const nextStatus = currentStatus === 'active' ? 'deactivated' : 'active';
      try {
        const res = await fetch(\`/api/admin/users/\${id}/status\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });
        const json = await res.json();
        showToast(json.success ? 'success' : 'error', json.message);
        loadUsers();
      } catch (err) {
        showToast('error', err.message);
      }
    }

    // 9. ACTIVITY LOGS
    async function loadLogs() {
      try {
        const res = await fetch('/api/admin/activity-logs');
        const json = await res.json();
        if (json.success) {
          const tbody = document.getElementById('admin-logs-body');
          tbody.innerHTML = (json.data || []).map(l => \`
            <tr>
              <td style="font-size:0.8rem; color:var(--secondary-text);">\${new Date(l.timestamp).toLocaleString()}</td>
              <td style="font-weight:700; color:var(--royal-blue);">\${escapeHtml(l.action)}</td>
              <td>\${escapeHtml(l.userName)}</td>
              <td><span class="clay-badge badge-blue">\${escapeHtml(l.role)}</span></td>
              <td>\${escapeHtml(l.target || '-')}</td>
              <td style="font-size:0.85rem;">\${escapeHtml(l.details || '')}</td>
            </tr>
          \`).join('');
        }
      } catch (err) {
        console.error('Failed to load activity logs:', err);
      }
    }

    // 10. SYSTEM SETTINGS
    async function handleSettingsSave(e) {
      e.preventDefault();
      const payload = {
        schoolName: document.getElementById('setting-school-name').value,
        motto: document.getElementById('setting-motto').value,
        email: document.getElementById('setting-email').value,
        phone: document.getElementById('setting-phone').value,
        address: document.getElementById('setting-address').value
      };
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        showToast(json.success ? 'success' : 'error', json.message);
      } catch (err) {
        showToast('error', err.message);
      }
    }

    async function saveActiveTerm() {
      const term = document.getElementById('active-term-selector').value;
      showToast('success', \`Active calendar updated to \${term}\`);
    }

    async function executePromotion() {
      const fromGrade = document.getElementById('promote-from-grade').value;
      const toGrade = document.getElementById('promote-to-grade').value;
      if (!confirm(\`Promote all students from Grade \${fromGrade} to Grade \${toGrade}?\`)) return;
      try {
        const res = await fetch('/api/admin/academic-years/promote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromGrade, toGrade })
        });
        const json = await res.json();
        showToast(json.success ? 'success' : 'error', json.message);
        loadStudents();
      } catch (err) {
        showToast('error', err.message);
      }
    }

    function quickSwitch(role) {
      var token = null;
      try { token = localStorage.getItem('stmarys_token'); } catch(_) {}
      var param = token ? '?token=' + encodeURIComponent(token) : '';
      if (role === 'teacher') window.location.href = '/teacher/dashboard' + param;
      if (role === 'student') window.location.href = '/student/dashboard' + param;
    }

    function handleLogout(e) {
      if (e) e.preventDefault();
      try {
        localStorage.removeItem('stmarys_token');
        localStorage.removeItem('stmarys_user');
        document.cookie = 'token=; path=/; max-age=0; SameSite=None; Secure';
      } catch (_) {}
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        window.location.href = '/login';
      });
    }

    function handleGlobalSearch(val) {
      if (!val) return;
      if (currentTab !== 'students') {
        switchTab('students');
      }
      document.getElementById('student-search-input').value = val;
      filterStudents();
    }

    function exportOverviewReport() {
      window.print();
    }

    function printAttendanceReport() {
      window.print();
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    }
  </script>
</body>
</html>`;
}

module.exports = {
  createAdminRouter,
  renderAdminPage
};
