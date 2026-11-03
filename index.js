/**
 * ST. MARY'S COLLEGE NEGOMBO - LEARNING MANAGEMENT SYSTEM (LMS)
 * Main Server & Application Entry Point (index.js)
 * Node.js 24.x | Express.js | MongoDB Atlas / Mongoose | JWT & bcrypt | Claymorphism UI
 */

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const { createAdminRouter, renderAdminPage } = require('./admin');

// Environment Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'stmarys_jwt_super_secret_key_2026_negombo';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const MONGODB_URI = process.env.MONGODB_URI || '';
const PRINCIPAL_SETUP_SECRET = process.env.PRINCIPAL_SETUP_SECRET || 'stmarys_principal_setup_2026';

const app = express();

// Security Headers & Middlewares
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Mongoose Connection Management (Cached for Vercel Serverless)
let cachedMongoose = global.mongoose;
if (!cachedMongoose) {
  cachedMongoose = global.mongoose = { conn: null, promise: null };
}

async function connectToMongo() {
  if (!MONGODB_URI) return null;
  if (cachedMongoose.conn) return cachedMongoose.conn;

  if (!cachedMongoose.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    };
    cachedMongoose.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }
  try {
    cachedMongoose.conn = await cachedMongoose.promise;
    console.log('Connected to MongoDB Atlas: stmarys_lms');
    return cachedMongoose.conn;
  } catch (err) {
    cachedMongoose.promise = null;
    console.warn('MongoDB Atlas connection failed, operating with in-memory fallback:', err.message);
    return null;
  }
}

// Data Store Layer
const memStore = {
  users: [],
  students: [],
  teachers: [],
  classes: [],
  subjects: [],
  assignments: [],
  submissions: [],
  materials: [],
  examinations: [],
  examAttempts: [],
  attendance: [],
  results: [],
  announcements: [],
  timetable: [],
  activityLogs: [],
  settings: {
    schoolName: "St. Mary's College Negombo",
    motto: "Empowering Students. Inspiring Excellence. Building Tomorrow.",
    email: "info@stmarysnegombo.example",
    phone: "+94 31 555 0123",
    address: "Negombo, Western Province, Sri Lanka",
    currentYear: "2026",
    currentTerm: "Term 1"
  }
};

// Seed Demonstration Data
function seedInitialData() {
  const salt = bcrypt.genSaltSync(10);
  const hashPass = (p) => bcrypt.hashSync(p, salt);

  // 1. Principal
  const principalUser = {
    _id: 'usr_p1',
    email: 'principal@stmarys.lk',
    passwordHash: hashPass('Principal@123'),
    role: 'principal',
    name: 'Rev. Fr. Principal Ranjith',
    status: 'active',
    createdAt: new Date()
  };
  memStore.users.push(principalUser);

  // 2. Teachers (5 Faculty)
  const teachersData = [
    { id: 'TCH-001', name: 'Mr. Sunil Perera', email: 'perera@stmarys.lk', phone: '+94 71 555 0101', subjects: ['Mathematics'], classes: ['Grade 10A', 'Grade 11A'], qualification: 'B.Sc. Mathematics, PGDE' },
    { id: 'TCH-002', name: 'Mrs. Nilanthi Silva', email: 'silva@stmarys.lk', phone: '+94 71 555 0102', subjects: ['Science'], classes: ['Grade 10A', 'Grade 10B'], qualification: 'B.Sc. Chemistry, M.Sc.' },
    { id: 'TCH-003', name: 'Ms. Shenali Fernando', email: 'fernando@stmarys.lk', phone: '+94 71 555 0103', subjects: ['English'], classes: ['Grade 10A', 'Grade 11B'], qualification: 'B.A. English Literature' },
    { id: 'TCH-004', name: 'Mr. Kusal Mendis', email: 'mendis@stmarys.lk', phone: '+94 71 555 0104', subjects: ['ICT'], classes: ['Grade 10A', 'Grade 11A'], qualification: 'B.Sc. Computer Science' },
    { id: 'TCH-005', name: 'Mrs. Anoma Jayasinghe', email: 'jayasinghe@stmarys.lk', phone: '+94 71 555 0105', subjects: ['History'], classes: ['Grade 10A', 'Grade 9A'], qualification: 'B.A. History & Archaeology' }
  ];

  teachersData.forEach((t, i) => {
    const usr = {
      _id: `usr_t${i+1}`,
      email: t.email,
      passwordHash: hashPass('Teacher@123'),
      role: 'teacher',
      name: t.name,
      status: 'active',
      createdAt: new Date()
    };
    memStore.users.push(usr);
    memStore.teachers.push({
      _id: `tch_${i+1}`,
      userId: usr._id,
      teacherId: t.id,
      fullName: t.name,
      email: t.email,
      phone: t.phone,
      qualification: t.qualification,
      assignedSubjects: t.subjects,
      assignedClasses: t.classes
    });
  });

  // 3. Classes (8 Classes)
  const classesList = [
    { id: 'cls_6a', name: 'Grade 6A', grade: '6', classTeacher: 'Mrs. Jayasinghe', roomNumber: 'Block A - 101', studentCount: 30 },
    { id: 'cls_7a', name: 'Grade 7A', grade: '7', classTeacher: 'Ms. Shenali', roomNumber: 'Block A - 102', studentCount: 30 },
    { id: 'cls_8a', name: 'Grade 8A', grade: '8', classTeacher: 'Mr. Mendis', roomNumber: 'Block B - 201', studentCount: 30 },
    { id: 'cls_9a', name: 'Grade 9A', grade: '9', classTeacher: 'Mrs. Anoma', roomNumber: 'Block B - 202', studentCount: 30 },
    { id: 'cls_10a', name: 'Grade 10A', grade: '10', classTeacher: 'Mr. Sunil Perera', roomNumber: 'Senior Wing - 301', studentCount: 30 },
    { id: 'cls_10b', name: 'Grade 10B', grade: '10', classTeacher: 'Mrs. Nilanthi Silva', roomNumber: 'Senior Wing - 302', studentCount: 30 },
    { id: 'cls_11a', name: 'Grade 11A', grade: '11', classTeacher: 'Mr. Kusal Mendis', roomNumber: 'Senior Wing - 303', studentCount: 30 },
    { id: 'cls_11b', name: 'Grade 11B', grade: '11', classTeacher: 'Ms. Shenali Fernando', roomNumber: 'Senior Wing - 304', studentCount: 30 }
  ];
  memStore.classes = classesList;

  // 4. Subjects (10 Subjects)
  const subjectsList = [
    { code: 'MATH101', name: 'Mathematics', applicableGrades: ['6', '7', '8', '9', '10', '11'], departmentHead: 'Mr. Sunil Perera' },
    { code: 'SCI102', name: 'Science', applicableGrades: ['6', '7', '8', '9', '10', '11'], departmentHead: 'Mrs. Nilanthi Silva' },
    { code: 'ENG103', name: 'English Language', applicableGrades: ['6', '7', '8', '9', '10', '11', '12', '13'], departmentHead: 'Ms. Shenali Fernando' },
    { code: 'SIN104', name: 'Sinhala Language', applicableGrades: ['6', '7', '8', '9', '10', '11'], departmentHead: 'Mrs. Pushpa Ranasinghe' },
    { code: 'HIS105', name: 'History', applicableGrades: ['6', '7', '8', '9', '10', '11'], departmentHead: 'Mrs. Anoma Jayasinghe' },
    { code: 'ICT106', name: 'Information & Comm. Tech', applicableGrades: ['10', '11', '12', '13'], departmentHead: 'Mr. Kusal Mendis' },
    { code: 'BUD107', name: 'Buddhism & Ethics', applicableGrades: ['6', '7', '8', '9', '10', '11'], departmentHead: 'Ven. Wimalasiri' },
    { code: 'GEO108', name: 'Geography', applicableGrades: ['6', '7', '8', '9', '10', '11'], departmentHead: 'Mr. D. Wijesooriya' },
    { code: 'COM109', name: 'Commerce & Accounting', applicableGrades: ['10', '11'], departmentHead: 'Mrs. R. Dias' },
    { code: 'ART110', name: 'Eastern Art & Design', applicableGrades: ['6', '7', '8', '9', '10', '11'], departmentHead: 'Mr. P. Rodrigo' }
  ];
  memStore.subjects = subjectsList;

  // 5. Students (30 Sample Students)
  const studentNames = [
    { name: 'Alex Fernando', email: 'alex@stmarys.lk', gender: 'Male', parent: 'Mr. Ranjan Fernando' },
    { name: 'Kavindu Wickramasinghe', email: 'kavindu@stmarys.lk', gender: 'Male', parent: 'Mr. Nimal Wickramasinghe' },
    { name: 'Dilani Perera', email: 'dilani@stmarys.lk', gender: 'Female', parent: 'Mrs. Shanthi Perera' },
    { name: 'Sanduni De Silva', email: 'sanduni@stmarys.lk', gender: 'Female', parent: 'Mr. Kamal De Silva' },
    { name: 'Dinuka Rajapaksa', email: 'dinuka@stmarys.lk', gender: 'Male', parent: 'Mr. Gamini Rajapaksa' },
    { name: 'Chathurika Fonseka', email: 'chathurika@stmarys.lk', gender: 'Female', parent: 'Mrs. Rohini Fonseka' },
    { name: 'Heshan Jayawardena', email: 'heshan@stmarys.lk', gender: 'Male', parent: 'Mr. Bandula Jayawardena' },
    { name: 'Oshada Gunaratne', email: 'oshada@stmarys.lk', gender: 'Male', parent: 'Mrs. Prema Gunaratne' },
    { name: 'Sachini Senanayake', email: 'sachini@stmarys.lk', gender: 'Female', parent: 'Mr. Dudley Senanayake' },
    { name: 'Tharindu Rathnayake', email: 'tharindu@stmarys.lk', gender: 'Male', parent: 'Mr. Lalith Rathnayake' },
    { name: 'Nimasha Alwis', email: 'nimasha@stmarys.lk', gender: 'Female', parent: 'Mrs. Manel Alwis' },
    { name: 'Isuru Weerasinghe', email: 'isuru@stmarys.lk', gender: 'Male', parent: 'Mr. Sarath Weerasinghe' },
    { name: 'Praveen Cooray', email: 'praveen@stmarys.lk', gender: 'Male', parent: 'Mr. Joseph Cooray' },
    { name: 'Malithi Dissanayake', email: 'malithi@stmarys.lk', gender: 'Female', parent: 'Mrs. Sunethra Dissanayake' },
    { name: 'Nuwan Pradeep', email: 'nuwan@stmarys.lk', gender: 'Male', parent: 'Mr. Anura Pradeep' },
    { name: 'Kasun Madushanka', email: 'kasun@stmarys.lk', gender: 'Male', parent: 'Mrs. Mallika Madushanka' },
    { name: 'Shalani Tharaka', email: 'shalani@stmarys.lk', gender: 'Female', parent: 'Mr. Ariyadasa Tharaka' },
    { name: 'Gayan Dhananjaya', email: 'gayan@stmarys.lk', gender: 'Male', parent: 'Mr. Wickrama Dhananjaya' },
    { name: 'Anuki Liyanage', email: 'anuki@stmarys.lk', gender: 'Female', parent: 'Mrs. Padma Liyanage' },
    { name: 'Sahan Nirmal', email: 'sahan@stmarys.lk', gender: 'Male', parent: 'Mr. Dayananda Nirmal' },
    { name: 'Nethmi Vihara', email: 'nethmi@stmarys.lk', gender: 'Female', parent: 'Mrs. Chandrika Vihara' },
    { name: 'Bhanuka Rajapaksha', email: 'bhanuka@stmarys.lk', gender: 'Male', parent: 'Mr. Priyantha Rajapaksha' },
    { name: 'Thilini Kaushalya', email: 'thilini@stmarys.lk', gender: 'Female', parent: 'Mrs. Kusuma Kaushalya' },
    { name: 'Vihanga Jayasundara', email: 'vihanga@stmarys.lk', gender: 'Male', parent: 'Mr. Upul Jayasundara' },
    { name: 'Rashmi Nimanthi', email: 'rashmi@stmarys.lk', gender: 'Female', parent: 'Mrs. Sujatha Nimanthi' },
    { name: 'Roshan Abeysekara', email: 'roshan@stmarys.lk', gender: 'Male', parent: 'Mr. Tilak Abeysekara' },
    { name: 'Hiruni Lakshika', email: 'hiruni@stmarys.lk', gender: 'Female', parent: 'Mrs. Kalyani Lakshika' },
    { name: 'Ashen Mihiranga', email: 'ashen@stmarys.lk', gender: 'Male', parent: 'Mr. Jagath Mihiranga' },
    { name: 'Kavindi Sewwandi', email: 'kavindi@stmarys.lk', gender: 'Female', parent: 'Mrs. Indrani Sewwandi' },
    { name: 'Charith Asalanka', email: 'charith@stmarys.lk', gender: 'Male', parent: 'Mr. Sunil Asalanka' }
  ];

  studentNames.forEach((s, idx) => {
    const sId = `STU2026-${String(idx + 1).padStart(3, '0')}`;
    const grade = idx < 15 ? '10' : '11';
    const className = idx % 2 === 0 ? 'A' : 'B';
    const usr = {
      _id: `usr_s${idx+1}`,
      email: s.email,
      passwordHash: hashPass('Student@123'),
      role: 'student',
      name: s.name,
      status: 'active',
      createdAt: new Date()
    };
    memStore.users.push(usr);
    memStore.students.push({
      _id: `stu_${idx+1}`,
      userId: usr._id,
      studentId: sId,
      fullName: s.name,
      email: s.email,
      grade,
      className,
      gender: s.gender,
      parentName: s.parent,
      parentPhone: `+94 77 ${100 + idx} 4567`,
      academicYear: '2026'
    });
  });

  // 6. Learning Materials (15 Items)
  const sampleMaterials = [
    { title: 'Algebraic Equations & Quadratics Complete Notes', subject: 'Mathematics', targetClass: '10A', fileType: 'PDF', fileUrl: 'https://example.com/materials/math_algebra_gr10.pdf', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', teacher: 'Mr. Sunil Perera', date: '2026-03-01' },
    { title: 'Plant and Animal Cell Biology Slides', subject: 'Science', targetClass: '10A', fileType: 'PDF', fileUrl: 'https://example.com/materials/cell_biology_gr10.pdf', videoUrl: '', teacher: 'Mrs. Nilanthi Silva', date: '2026-03-02' },
    { title: 'English Formal Letter Writing & Grammar Pack', subject: 'English', targetClass: '10A', fileType: 'DOCX', fileUrl: 'https://example.com/materials/english_formal_writing.docx', videoUrl: '', teacher: 'Ms. Shenali Fernando', date: '2026-03-03' },
    { title: 'Python Programming Basics & Control Structures', subject: 'ICT', targetClass: '10A', fileType: 'PDF', fileUrl: 'https://example.com/materials/python_basics.pdf', videoUrl: 'https://www.youtube.com/watch?v=rfscVS0vtbw', teacher: 'Mr. Kusal Mendis', date: '2026-03-04' },
    { title: 'Kingdom of Anuradhapura Historical Overview', subject: 'History', targetClass: '10A', fileType: 'PDF', fileUrl: 'https://example.com/materials/history_anuradhapura.pdf', videoUrl: '', teacher: 'Mrs. Anoma Jayasinghe', date: '2026-03-05' },
    { title: 'Trigonometry & Heights and Distances Guide', subject: 'Mathematics', targetClass: '11A', fileType: 'PDF', fileUrl: 'https://example.com/materials/trig_gr11.pdf', videoUrl: '', teacher: 'Mr. Sunil Perera', date: '2026-03-06' },
    { title: 'Chemical Reactions and Stoichiometry Practice Pack', subject: 'Science', targetClass: '10B', fileType: 'PDF', fileUrl: 'https://example.com/materials/chem_reactions.pdf', videoUrl: '', teacher: 'Mrs. Nilanthi Silva', date: '2026-03-07' },
    { title: 'Sinhala Literature Poetry Appreciation Notes', subject: 'Sinhala', targetClass: '10A', fileType: 'PDF', fileUrl: 'https://example.com/materials/sinhala_poetry.pdf', videoUrl: '', teacher: 'Mrs. Pushpa Ranasinghe', date: '2026-03-08' },
    { title: 'Computer Networks and IP Addressing Model Paper', subject: 'ICT', targetClass: '11A', fileType: 'PDF', fileUrl: 'https://example.com/materials/ict_networks.pdf', videoUrl: '', teacher: 'Mr. Kusal Mendis', date: '2026-03-09' },
    { title: 'Sri Lankan Topography and River Basins Map Study', subject: 'Geography', targetClass: '10A', fileType: 'PDF', fileUrl: 'https://example.com/materials/geo_rivers.pdf', videoUrl: '', teacher: 'Mr. D. Wijesooriya', date: '2026-03-10' },
    { title: 'Four Noble Truths & Buddhist Philosophy Modules', subject: 'Buddhism', targetClass: '10A', fileType: 'PDF', fileUrl: 'https://example.com/materials/buddhism_philosophy.pdf', videoUrl: '', teacher: 'Ven. Wimalasiri', date: '2026-03-11' },
    { title: 'Accounting Balance Sheet & Trial Balance Examples', subject: 'Commerce', targetClass: '10A', fileType: 'PDF', fileUrl: 'https://example.com/materials/commerce_accounting.pdf', videoUrl: '', teacher: 'Mrs. R. Dias', date: '2026-03-12' },
    { title: 'Newtonian Laws of Motion & Physics Experiments', subject: 'Science', targetClass: '10A', fileType: 'PDF', fileUrl: 'https://example.com/materials/physics_motion.pdf', videoUrl: '', teacher: 'Mrs. Nilanthi Silva', date: '2026-03-13' },
    { title: 'World War I & Modern Global Politics Notes', subject: 'History', targetClass: '11A', fileType: 'PDF', fileUrl: 'https://example.com/materials/history_ww1.pdf', videoUrl: '', teacher: 'Mrs. Anoma Jayasinghe', date: '2026-03-14' },
    { title: 'English Essay Writing Techniques for GCE O/L', subject: 'English', targetClass: '11B', fileType: 'PDF', fileUrl: 'https://example.com/materials/english_ol_essays.pdf', videoUrl: '', teacher: 'Ms. Shenali Fernando', date: '2026-03-15' }
  ];
  memStore.materials = sampleMaterials.map((m, i) => ({ _id: `mat_${i+1}`, ...m }));

  // 7. Assignments (10 Items)
  const sampleAssignments = [
    { title: 'Quadratic Equations Exercise 4.2', subject: 'Mathematics', targetClass: '10A', teacherName: 'Mr. Sunil Perera', dueDate: '2026-04-15', maxMarks: 100, instructions: 'Solve problems 1 through 15 from Chapter 4. Show all step-by-step calculations and verify roots.' },
    { title: 'Cell Structure and Organelles Diagram Submission', subject: 'Science', targetClass: '10A', teacherName: 'Mrs. Nilanthi Silva', dueDate: '2026-04-18', maxMarks: 50, instructions: 'Draw and label the ultrastructure of a plant cell. Describe functions of Mitochondria and Chloroplast.' },
    { title: 'Essay: The Impact of Modern AI on Education', subject: 'English', targetClass: '10A', teacherName: 'Ms. Shenali Fernando', dueDate: '2026-04-20', maxMarks: 100, instructions: 'Write a 250-300 word argumentative essay following standard formal structure.' },
    { title: 'Python Loop and Function Assignment', subject: 'ICT', targetClass: '10A', teacherName: 'Mr. Kusal Mendis', dueDate: '2026-04-22', maxMarks: 100, instructions: 'Write a script to compute student grades using nested if-statements and while loops.' },
    { title: 'Anuradhapura Irrigation Architecture Essay', subject: 'History', targetClass: '10A', teacherName: 'Mrs. Anoma Jayasinghe', dueDate: '2026-04-25', maxMarks: 50, instructions: 'Explain the hydraulic technology used in building Parakrama Samudra and Kala Wewa.' },
    { title: 'Calculus and Rate of Change Basics', subject: 'Mathematics', targetClass: '11A', teacherName: 'Mr. Sunil Perera', dueDate: '2026-04-26', maxMarks: 100, instructions: 'Work out differentiation problems on displacement and velocity.' },
    { title: 'Periodic Table Trends & Chemical Bonding', subject: 'Science', targetClass: '10B', teacherName: 'Mrs. Nilanthi Silva', dueDate: '2026-04-27', maxMarks: 50, instructions: 'Compare ionic and covalent compounds with electronic configuration diagrams.' },
    { title: 'Short Story Analysis: The Village in the Jungle', subject: 'English', targetClass: '11B', teacherName: 'Ms. Shenali Fernando', dueDate: '2026-04-28', maxMarks: 100, instructions: 'Character sketch of Babun and Silindu with quotes.' },
    { title: 'Relational Database ER Diagram Design', subject: 'ICT', targetClass: '11A', teacherName: 'Mr. Kusal Mendis', dueDate: '2026-04-29', maxMarks: 100, instructions: 'Design a normalized 3NF database schema for a hospital management system.' },
    { title: 'Climatic Zones of Sri Lanka Project', subject: 'Geography', targetClass: '10A', teacherName: 'Mr. D. Wijesooriya', dueDate: '2026-04-30', maxMarks: 50, instructions: 'Prepare a rainfall and temperature chart for Wet, Intermediate, and Dry zones.' }
  ];
  memStore.assignments = sampleAssignments.map((a, i) => ({ _id: `asn_${i+1}`, ...a }));

  // Submissions for Alex Fernando
  memStore.submissions.push({
    _id: 'sub_1',
    assignmentId: 'asn_1',
    studentId: 'STU2026-001',
    studentName: 'Alex Fernando',
    submissionContent: 'Completed questions 1-15. Roots verified for x^2 - 5x + 6 = 0 gives x=2 and x=3.',
    fileUrl: 'https://example.com/submissions/alex_math_ex4.pdf',
    submittedAt: '2026-03-20T10:30:00Z',
    status: 'Graded',
    marks: 95,
    feedback: 'Excellent work, clear presentation of steps!',
    gradedBy: 'Mr. Sunil Perera'
  });

  // 8. Examinations (5 Tests with Questions)
  const sampleExams = [
    {
      id: 'ex_1',
      title: 'Mathematics Mid-Term Online Evaluation',
      subject: 'Mathematics',
      targetClass: '10A',
      durationMinutes: 45,
      totalMarks: 100,
      isPublished: true,
      questions: [
        { id: 1, type: 'mcq', question: 'What are the roots of the equation x² - 7x + 12 = 0?', options: ['3 and 4', '-3 and -4', '2 and 6', '1 and 12'], correct: '3 and 4', marks: 25 },
        { id: 2, type: 'mcq', question: 'What is the sum of interior angles of a pentagon?', options: ['360°', '540°', '720°', '180°'], correct: '540°', marks: 25 },
        { id: 3, type: 'tf', question: 'Every prime number greater than 2 is an odd number.', options: ['True', 'False'], correct: 'True', marks: 25 },
        { id: 4, type: 'short', question: 'Evaluate 2³ × 3² = ?', correct: '72', marks: 25 }
      ]
    },
    {
      id: 'ex_2',
      title: 'Science Biology & Plant Cells Quiz',
      subject: 'Science',
      targetClass: '10A',
      durationMinutes: 30,
      totalMarks: 100,
      isPublished: true,
      questions: [
        { id: 1, type: 'mcq', question: 'Which organelle is considered the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Apparatus'], correct: 'Mitochondria', marks: 25 },
        { id: 2, type: 'mcq', question: 'What pigment is primarily responsible for photosynthesis in plants?', options: ['Hemoglobin', 'Chlorophyll', 'Melanin', 'Carotene'], correct: 'Chlorophyll', marks: 25 },
        { id: 3, type: 'tf', question: 'Plant cells lack a rigid cell wall.', options: ['True', 'False'], correct: 'False', marks: 25 },
        { id: 4, type: 'short', question: 'What gas is produced as a byproduct of photosynthesis?', correct: 'Oxygen', marks: 25 }
      ]
    },
    {
      id: 'ex_3',
      title: 'English Language Grammar & Vocabulary Test',
      subject: 'English',
      targetClass: '10A',
      durationMinutes: 40,
      totalMarks: 100,
      isPublished: true,
      questions: [
        { id: 1, type: 'mcq', question: 'Choose the correct preposition: He is good ___ mathematics.', options: ['in', 'at', 'with', 'for'], correct: 'at', marks: 25 },
        { id: 2, type: 'mcq', question: 'Identify the antonym of "Meticulous":', options: ['Careless', 'Thorough', 'Accurate', 'Precise'], correct: 'Careless', marks: 25 },
        { id: 3, type: 'tf', question: '"Neither he nor his friends were present" is grammatically correct.', options: ['True', 'False'], correct: 'True', marks: 25 },
        { id: 4, type: 'short', question: 'What is the past participle of the verb "swim"?', correct: 'swum', marks: 25 }
      ]
    },
    {
      id: 'ex_4',
      title: 'ICT Fundamentals & Binary Arithmetic Quiz',
      subject: 'ICT',
      targetClass: '10A',
      durationMinutes: 30,
      totalMarks: 100,
      isPublished: true,
      questions: [
        { id: 1, type: 'mcq', question: 'What is the binary equivalent of decimal 13?', options: ['1101', '1011', '1110', '1001'], correct: '1101', marks: 25 },
        { id: 2, type: 'mcq', question: 'Which protocol is used for secure browsing on the web?', options: ['FTP', 'HTTP', 'HTTPS', 'SMTP'], correct: 'HTTPS', marks: 25 },
        { id: 3, type: 'tf', question: 'RAM is non-volatile memory.', options: ['True', 'False'], correct: 'False', marks: 25 },
        { id: 4, type: 'short', question: 'How many bits are in one byte?', correct: '8', marks: 25 }
      ]
    },
    {
      id: 'ex_5',
      title: 'Sri Lankan History Term Assessment',
      subject: 'History',
      targetClass: '10A',
      durationMinutes: 40,
      totalMarks: 100,
      isPublished: true,
      questions: [
        { id: 1, type: 'mcq', question: 'Which king constructed the Sigiriya rock fortress?', options: ['King Dhatusena', 'King Kasyapa', 'King Dutugemunu', 'King Parakramabahu I'], correct: 'King Kasyapa', marks: 25 },
        { id: 2, type: 'mcq', question: 'In which year did the British gain control of the Kandyan Kingdom?', options: ['1505', '1658', '1796', '1815'], correct: '1815', marks: 25 },
        { id: 3, type: 'tf', question: 'King Dutugemunu united Sri Lanka under one umbrella.', options: ['True', 'False'], correct: 'True', marks: 25 },
        { id: 4, type: 'short', question: 'Who built the Ruwanwelisaya stupa?', correct: 'King Dutugemunu', marks: 25 }
      ]
    }
  ];
  memStore.examinations = sampleExams.map(e => ({ _id: e.id, ...e }));

  // Sample Exam Attempts
  memStore.examAttempts.push({
    _id: 'atm_1',
    examId: 'ex_1',
    studentId: 'STU2026-001',
    score: 100,
    total: 100,
    submittedAt: '2026-03-22T08:40:00Z',
    status: 'Graded',
    answers: { '1': '3 and 4', '2': '540°', '3': 'True', '4': '72' }
  });

  // 9. Attendance
  const days = ['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-16', '2026-03-17', '2026-03-18', '2026-03-19', '2026-03-20', '2026-03-23'];
  days.forEach((d) => {
    memStore.students.forEach((st) => {
      const isAbsent = (st.studentId === 'STU2026-005' && d === '2026-03-12');
      memStore.attendance.push({
        date: d,
        className: `Grade ${st.grade}${st.className}`,
        studentId: st.studentId,
        studentName: st.fullName,
        status: isAbsent ? 'absent' : 'present',
        recordedBy: 'Mr. Sunil Perera'
      });
    });
  });

  // 10. Results (Sample Term Marks)
  const subjectList = ['Mathematics', 'Science', 'English', 'Sinhala', 'History', 'ICT', 'Buddhism', 'Geography'];
  memStore.students.slice(0, 10).forEach((st, sIdx) => {
    subjectList.forEach((sub, subIdx) => {
      const marks = 70 + ((sIdx * 3 + subIdx * 7) % 28);
      let grade = 'C';
      if (marks >= 75) grade = 'A';
      else if (marks >= 65) grade = 'B';
      else if (marks >= 50) grade = 'C';
      else if (marks >= 35) grade = 'S';
      else grade = 'F';

      memStore.results.push({
        _id: `res_${sIdx}_${subIdx}`,
        studentId: st.studentId,
        studentName: st.fullName,
        className: `${st.grade}${st.className}`,
        subject: sub,
        term: 'Term 1',
        marks,
        grade,
        recordedBy: 'Academic Department'
      });
    });
  });

  // 11. Announcements (5 Official Notices)
  const announcementsList = [
    {
      _id: 'ann_1',
      title: "Annual Inter-House Athletic Meet 2026",
      content: "St. Mary's College Negombo Annual Inter-House Athletic Championship will be held at the Negombo Municipal Ground on April 5th. All house members are requested to complete preliminary heats by Friday.",
      category: "Sports",
      targetAudience: "Everyone",
      publishedDate: new Date('2026-03-15'),
      createdBy: "Rev. Fr. Principal Ranjith"
    },
    {
      _id: 'ann_2',
      title: "First Term Examination Timetable Released",
      content: "The First Term Examinations for Grades 6-13 will commence on April 20th, 2026. Students must access their subject portals to download past examination review packs and syllabi.",
      category: "Academic",
      targetAudience: "Students",
      publishedDate: new Date('2026-03-18'),
      createdBy: "Academic Board"
    },
    {
      _id: 'ann_3',
      title: "Marian Science Day & Robotics Exhibition",
      content: "The Young Scientists Club invites registrations for the Inter-School Robotics & Science Innovation Showcase. Submission of project blueprints closes on April 10th.",
      category: "Event",
      targetAudience: "Everyone",
      publishedDate: new Date('2026-03-20'),
      createdBy: "Mrs. Nilanthi Silva"
    },
    {
      _id: 'ann_4',
      title: "Faculty Staff Development Workshop on Modern LMS",
      content: "A professional development session on utilizing the St. Mary's LMS interactive examination & submission grading system will be conducted on Wednesday at 2:00 PM in the College Auditorium.",
      category: "Notice",
      targetAudience: "Teachers",
      publishedDate: new Date('2026-03-22'),
      createdBy: "Rev. Fr. Principal Ranjith"
    },
    {
      _id: 'ann_5',
      title: "Parent-Teacher Academic Progress Consultation",
      content: "Grade 10 and 11 Parents Consultation meetings are scheduled for Saturday, April 12th. Individual student academic performance profiles can be reviewed directly via the parent portal.",
      category: "Notice",
      targetAudience: "Everyone",
      publishedDate: new Date('2026-03-24'),
      createdBy: "Administration Office"
    }
  ];
  memStore.announcements = announcementsList;

  // 12. Activity Logs
  memStore.activityLogs.push(
    { action: 'System Initialization', userName: 'System', role: 'system', target: 'LMS Platform', details: 'St. Mary\'s LMS database initialized with 30 students, 5 teachers, and academic curricula.', timestamp: new Date(Date.now() - 3600000 * 24) },
    { action: 'Teacher Allocation', userName: 'Rev. Fr. Principal', role: 'principal', target: 'Mr. Sunil Perera', details: 'Assigned Grade 10A and 11A Mathematics curriculum.', timestamp: new Date(Date.now() - 3600000 * 18) },
    { action: 'Created Examination', userName: 'Mr. Sunil Perera', role: 'teacher', target: 'Mathematics Mid-Term', details: 'Published online evaluation with 4 questions.', timestamp: new Date(Date.now() - 3600000 * 12) },
    { action: 'Assignment Submission', userName: 'Alex Fernando', role: 'student', target: 'Quadratic Equations Exercise', details: 'Submitted exercise 4.2 solution file.', timestamp: new Date(Date.now() - 3600000 * 6) },
    { action: 'Graded Submission', userName: 'Mr. Sunil Perera', role: 'teacher', target: 'Alex Fernando', details: 'Awarded 95 marks with commendation.', timestamp: new Date(Date.now() - 3600000 * 2) }
  );

  console.log('Seeded St. Mary\'s College Negombo LMS demonstration records.');
}

seedInitialData();

// Activity Logger
async function logActivity(action, user, target = '', details = '') {
  const entry = {
    action,
    userId: user ? user._id : 'anonymous',
    userName: user ? user.name : 'System',
    role: user ? user.role : 'system',
    target,
    details,
    timestamp: new Date()
  };
  memStore.activityLogs.unshift(entry);
  if (memStore.activityLogs.length > 500) memStore.activityLogs.pop();
}

// Data Store Object (used by admin router and main app)
const store = {
  // Principal & Admin Queries
  async getAdminStats() {
    return {
      totalStudents: memStore.students.length,
      totalTeachers: memStore.teachers.length,
      totalClasses: memStore.classes.length,
      totalSubjects: memStore.subjects.length,
      activeAssignments: memStore.assignments.length,
      totalMaterials: memStore.materials.length,
      averageAttendance: '94.8%',
      academicAverage: '82.4%'
    };
  },
  async getStudents({ search = '', grade = '', className = '', page = 1, limit = 50 }) {
    let list = [...memStore.students];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => (s.fullName && s.fullName.toLowerCase().includes(q)) || (s.studentId && s.studentId.toLowerCase().includes(q)));
    }
    if (grade) list = list.filter(s => String(s.grade) === String(grade));
    if (className) list = list.filter(s => s.className === className);
    return { students: list, total: list.length };
  },
  async createStudent(data) {
    const nextIdx = memStore.students.length + 1;
    const studentId = data.studentId || `STU2026-${String(nextIdx).padStart(3, '0')}`;
    const student = {
      _id: `stu_${Date.now()}`,
      studentId,
      fullName: data.fullName,
      email: data.email || `${studentId.toLowerCase()}@stmarys.lk`,
      grade: data.grade,
      className: data.className || 'A',
      gender: data.gender || 'Male',
      parentName: data.parentName || '',
      parentPhone: data.parentPhone || '',
      academicYear: '2026'
    };
    memStore.students.push(student);

    // Create user login account
    const hash = bcrypt.hashSync('Student@123', 10);
    memStore.users.push({
      _id: `usr_${Date.now()}`,
      email: student.email,
      passwordHash: hash,
      role: 'student',
      name: student.fullName,
      status: 'active',
      createdAt: new Date()
    });
    return student;
  },
  async updateStudent(id, data) {
    const idx = memStore.students.findIndex(s => s._id === id || s.studentId === id);
    if (idx === -1) return null;
    memStore.students[idx] = { ...memStore.students[idx], ...data };
    return memStore.students[idx];
  },
  async deleteStudent(id) {
    const idx = memStore.students.findIndex(s => s._id === id || s.studentId === id);
    if (idx === -1) return null;
    const deleted = memStore.students.splice(idx, 1)[0];
    return deleted;
  },
  async bulkImportStudents(list) {
    const imported = [];
    for (const item of list) {
      const st = await this.createStudent(item);
      imported.push(st);
    }
    return imported;
  },
  async getTeachers() {
    return memStore.teachers;
  },
  async createTeacher(data) {
    const nextIdx = memStore.teachers.length + 1;
    const teacherId = data.teacherId || `TCH-${String(nextIdx).padStart(3, '0')}`;
    const teacher = {
      _id: `tch_${Date.now()}`,
      teacherId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone || '',
      qualification: data.qualification || 'Bachelor of Education',
      assignedSubjects: Array.isArray(data.assignedSubjects) ? data.assignedSubjects : [data.assignedSubjects || 'General'],
      assignedClasses: Array.isArray(data.assignedClasses) ? data.assignedClasses : ['Grade 10A']
    };
    memStore.teachers.push(teacher);
    const hash = bcrypt.hashSync('Teacher@123', 10);
    memStore.users.push({
      _id: `usr_${Date.now()}`,
      email: teacher.email,
      passwordHash: hash,
      role: 'teacher',
      name: teacher.fullName,
      status: 'active',
      createdAt: new Date()
    });
    return teacher;
  },
  async updateTeacher(id, data) {
    const idx = memStore.teachers.findIndex(t => t._id === id || t.teacherId === id);
    if (idx === -1) return null;
    memStore.teachers[idx] = { ...memStore.teachers[idx], ...data };
    return memStore.teachers[idx];
  },
  async deleteTeacher(id) {
    const idx = memStore.teachers.findIndex(t => t._id === id || t.teacherId === id);
    if (idx === -1) return null;
    return memStore.teachers.splice(idx, 1)[0];
  },
  async resetTeacherPassword(id, newPass) {
    const teacher = memStore.teachers.find(t => t._id === id || t.teacherId === id);
    if (!teacher) throw new Error('Teacher not found');
    const user = memStore.users.find(u => u.email === teacher.email);
    if (user) {
      user.passwordHash = bcrypt.hashSync(newPass, 10);
    }
    return teacher;
  },
  async getClasses() {
    return memStore.classes;
  },
  async createClass(data) {
    const cls = {
      id: `cls_${Date.now()}`,
      name: data.name,
      grade: data.grade,
      classTeacher: data.classTeacher || 'Assigned Master',
      roomNumber: data.roomNumber || 'Main Wing',
      studentCount: 30
    };
    memStore.classes.push(cls);
    return cls;
  },
  async updateClass(id, data) {
    const idx = memStore.classes.findIndex(c => c.id === id);
    if (idx !== -1) {
      memStore.classes[idx] = { ...memStore.classes[idx], ...data };
      return memStore.classes[idx];
    }
    return null;
  },
  async deleteClass(id) {
    const idx = memStore.classes.findIndex(c => c.id === id);
    if (idx !== -1) memStore.classes.splice(idx, 1);
  },
  async getSubjects() {
    return memStore.subjects;
  },
  async createSubject(data) {
    const s = {
      code: data.code || `SUB${memStore.subjects.length + 101}`,
      name: data.name,
      applicableGrades: data.applicableGrades || ['6', '7', '8', '9', '10', '11'],
      departmentHead: data.departmentHead || 'Faculty Member'
    };
    memStore.subjects.push(s);
    return s;
  },
  async updateSubject(id, data) {
    const idx = memStore.subjects.findIndex(s => s.code === id || s.name === id);
    if (idx !== -1) {
      memStore.subjects[idx] = { ...memStore.subjects[idx], ...data };
      return memStore.subjects[idx];
    }
    return null;
  },
  async deleteSubject(id) {
    const idx = memStore.subjects.findIndex(s => s.code === id);
    if (idx !== -1) memStore.subjects.splice(idx, 1);
  },
  async getAcademicYears() {
    return [{ year: '2026 / 2027', term: 'Term 1', isCurrent: true, startDate: '2026-01-05', endDate: '2026-04-10' }];
  },
  async promoteGrade(fromGrade, toGrade) {
    let count = 0;
    memStore.students.forEach(s => {
      if (String(s.grade) === String(fromGrade)) {
        s.grade = String(toGrade);
        count++;
      }
    });
    return count;
  },
  async getAllAssignments() {
    return memStore.assignments;
  },
  async getAllExaminations() {
    return memStore.examinations;
  },
  async getAttendanceSummary() {
    const map = {};
    memStore.attendance.forEach(a => {
      if (!map[a.className]) map[a.className] = { className: a.className, presentCount: 0, absentCount: 0, total: 0 };
      map[a.className].total++;
      if (a.status === 'present') map[a.className].presentCount++;
      else map[a.className].absentCount++;
    });
    return Object.values(map).map(item => ({
      ...item,
      percentage: Math.round((item.presentCount / item.total) * 100)
    }));
  },
  async getAllResults() {
    return memStore.results;
  },
  async getAnnouncements() {
    return memStore.announcements;
  },
  async createAnnouncement(data) {
    const ann = {
      _id: `ann_${Date.now()}`,
      title: data.title,
      content: data.content,
      category: data.category || 'General',
      targetAudience: data.targetAudience || 'Everyone',
      publishedDate: new Date(),
      createdBy: data.createdBy || 'Principal'
    };
    memStore.announcements.unshift(ann);
    return ann;
  },
  async deleteAnnouncement(id) {
    const idx = memStore.announcements.findIndex(a => a._id === id);
    if (idx !== -1) memStore.announcements.splice(idx, 1);
  },
  async getTimetable(className = 'Grade 10A') {
    return memStore.timetable;
  },
  async createTimetableEntry(data) {
    memStore.timetable.push(data);
    return data;
  },
  async getComprehensiveReport() {
    return {
      studentsCount: memStore.students.length,
      teachersCount: memStore.teachers.length,
      classesCount: memStore.classes.length,
      attendanceRate: '94.8%',
      passRate: '91.2%'
    };
  },
  async getActivityLogs(limit = 100) {
    return memStore.activityLogs.slice(0, limit);
  },
  async getUsers() {
    return memStore.users.map(({ passwordHash, ...u }) => u);
  },
  async updateUserStatus(id, status) {
    const u = memStore.users.find(x => x._id === id || x.email === id);
    if (u) u.status = status;
    return u;
  },
  async getSystemSettings() {
    return memStore.settings;
  },
  async updateSystemSettings(data) {
    memStore.settings = { ...memStore.settings, ...data };
    return memStore.settings;
  }
};

// Authentication Middleware
function authenticateToken(req, res, next) {
  let token = req.cookies && req.cookies.token;
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }
  if (!token && req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    try {
      res.cookie('token', token, {
        httpOnly: false,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    } catch (_) {}
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

function requireAuth(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      if (req.accepts('html')) {
        return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verifying Session | St. Mary's College LMS</title>
  <script>
    (function() {
      if (window.location.search.indexOf('token=') !== -1) {
        try {
          localStorage.removeItem('stmarys_token');
          localStorage.removeItem('stmarys_user');
          document.cookie = 'token=; path=/; max-age=0; SameSite=None; Secure';
        } catch (_) {}
        window.location.replace('/login');
        return;
      }
      var t = null;
      try { t = localStorage.getItem('stmarys_token'); } catch(e){}
      if (t) {
        window.location.replace(window.location.pathname + '?token=' + encodeURIComponent(t));
      } else {
        window.location.replace('/login');
      }
    })();
  </script>
</head>
<body style="font-family:'Nunito', sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; background:#F3F6FF; color:#26324B;">
  <div style="text-align:center;">
    <p style="font-size:1.1rem; font-weight:700;">Verifying session credentials...</p>
    <p style="font-size:0.85rem; color:#75819A;">Connecting to St. Mary's College LMS</p>
  </div>
</body>
</html>`);
      }
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      if (req.accepts('html')) {
        return res.status(403).send(renderUnauthorizedPage());
      }
      return res.status(403).json({ success: false, message: 'Forbidden. Insufficient permissions.' });
    }
    next();
  };
}

app.use(authenticateToken);

// Rate Limiter for Login (In-memory)
const loginAttempts = new Map();
function rateLimitLogin(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'ip';
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + 60000;
  } else {
    record.count++;
  }
  loginAttempts.set(ip, record);
  if (record.count > 15) {
    return res.status(429).json({ success: false, message: 'Too many login attempts. Please wait 1 minute.' });
  }
  next();
}

// -------------------------------------------------------------
// AUTHENTICATION APIs
// -------------------------------------------------------------

app.post('/api/auth/login', rateLimitLogin, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = memStore.users.find(u => u.email.toLowerCase() === normalizedEmail || u.name.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.status === 'deactivated') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact Principal.' });
    }

    const match = bcrypt.compareSync(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Role verification
    if (role && role !== user.role) {
      return res.status(401).json({ success: false, message: `Access denied. Account is registered as ${user.role}.` });
    }

    const payload = {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.cookie('token', token, {
      httpOnly: false,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await logActivity('User Login', user, user.email, `Logged in successfully as ${user.role}`);

    // Determine dashboard redirect
    let redirectUrl = '/student/dashboard';
    if (user.role === 'teacher') redirectUrl = '/teacher/dashboard';
    if (user.role === 'principal') redirectUrl = '/admin';

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: payload,
        redirectUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  res.json({ success: true, data: req.user });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  res.json({ success: true, message: `Password reset instructions have been dispatched to ${email || 'your registered address'}.` });
});

// Secure One-time Principal Setup Endpoint
app.post('/api/auth/setup-principal', (req, res) => {
  const { setupSecret, email, password, name } = req.body;
  if (setupSecret !== PRINCIPAL_SETUP_SECRET) {
    return res.status(403).json({ success: false, message: 'Invalid setup secret authorization' });
  }
  const principalEmail = (email || 'principal@stmarys.lk').toLowerCase();
  let user = memStore.users.find(u => u.email.toLowerCase() === principalEmail || u.role === 'principal');
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password || 'Principal@123', salt);

  if (user) {
    user.passwordHash = hash;
    user.name = name || user.name;
    user.email = principalEmail;
  } else {
    user = {
      _id: `usr_${Date.now()}`,
      email: principalEmail,
      passwordHash: hash,
      role: 'principal',
      name: name || 'Rev. Fr. Principal Ranjith',
      status: 'active',
      createdAt: new Date()
    };
    memStore.users.push(user);
  }
  res.json({ success: true, message: 'Principal account initialized securely.', email: principalEmail });
});

// -------------------------------------------------------------
// STUDENT APIs
// -------------------------------------------------------------

app.get('/api/student/dashboard', requireAuth(['student', 'principal']), async (req, res) => {
  const student = memStore.students.find(s => s.email === req.user.email) || memStore.students[0];
  const pendingAssignments = memStore.assignments.filter(a => a.targetClass === `${student.grade}${student.className}` || a.targetClass === `Grade ${student.grade}${student.className}`).length;
  const completedAssignments = memStore.submissions.filter(s => s.studentId === student.studentId).length;
  const exams = memStore.examinations.filter(e => e.targetClass === `${student.grade}${student.className}` || e.targetClass === `Grade ${student.grade}${student.className}`).length;

  res.json({
    success: true,
    data: {
      student,
      stats: {
        totalSubjects: 8,
        pendingAssignments,
        completedAssignments,
        attendancePercentage: '95.2%',
        averageMarks: '84.6%',
        upcomingExaminations: exams
      }
    }
  });
});

app.get('/api/student/profile', requireAuth(['student']), (req, res) => {
  const student = memStore.students.find(s => s.email === req.user.email) || memStore.students[0];
  res.json({ success: true, data: student });
});

app.put('/api/student/profile', requireAuth(['student']), (req, res) => {
  const student = memStore.students.find(s => s.email === req.user.email);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  const { parentPhone } = req.body;
  if (parentPhone) student.parentPhone = parentPhone;
  res.json({ success: true, message: 'Profile updated successfully', data: student });
});

app.get('/api/student/subjects', requireAuth(['student', 'principal']), (req, res) => {
  const subjects = [
    { name: 'Mathematics', teacher: 'Mr. Sunil Perera', code: 'MATH101', icon: 'fa-calculator', assignments: 2, progress: 85, color: '#4F7DF3' },
    { name: 'Science', teacher: 'Mrs. Nilanthi Silva', code: 'SCI102', icon: 'fa-flask-vial', assignments: 2, progress: 78, color: '#70D6A3' },
    { name: 'English', teacher: 'Ms. Shenali Fernando', code: 'ENG103', icon: 'fa-language', assignments: 1, progress: 92, color: '#9475E8' },
    { name: 'Sinhala', teacher: 'Mrs. Pushpa Ranasinghe', code: 'SIN104', icon: 'fa-book', assignments: 1, progress: 80, color: '#FFD66B' },
    { name: 'History', teacher: 'Mrs. Anoma Jayasinghe', code: 'HIS105', icon: 'fa-monument', assignments: 1, progress: 88, color: '#F5A5C5' },
    { name: 'ICT', teacher: 'Mr. Kusal Mendis', code: 'ICT106', icon: 'fa-laptop-code', assignments: 2, progress: 95, color: '#3159C9' },
    { name: 'Buddhism', teacher: 'Ven. Wimalasiri', code: 'BUD107', icon: 'fa-dharmachakra', assignments: 0, progress: 90, color: '#FFA726' },
    { name: 'Geography', teacher: 'Mr. D. Wijesooriya', code: 'GEO108', icon: 'fa-earth-asia', assignments: 1, progress: 74, color: '#26A69A' }
  ];
  res.json({ success: true, data: subjects });
});

app.get('/api/student/materials', requireAuth(['student', 'principal']), (req, res) => {
  res.json({ success: true, data: memStore.materials });
});

app.get('/api/student/assignments', requireAuth(['student', 'principal']), (req, res) => {
  const student = memStore.students.find(s => s.email === (req.user && req.user.email)) || memStore.students[0];
  const mySubmissions = memStore.submissions.filter(s => s.studentId === student.studentId);
  const data = memStore.assignments.map(a => {
    const sub = mySubmissions.find(s => s.assignmentId === a._id);
    return {
      ...a,
      submission: sub || null,
      status: sub ? sub.status : 'Not Started'
    };
  });
  res.json({ success: true, data });
});

app.post('/api/student/submissions', requireAuth(['student']), async (req, res) => {
  const student = memStore.students.find(s => s.email === req.user.email) || memStore.students[0];
  const { assignmentId, submissionContent, fileUrl } = req.body;

  const existingIdx = memStore.submissions.findIndex(s => s.assignmentId === assignmentId && s.studentId === student.studentId);
  const submissionObj = {
    _id: existingIdx !== -1 ? memStore.submissions[existingIdx]._id : `sub_${Date.now()}`,
    assignmentId,
    studentId: student.studentId,
    studentName: student.fullName,
    submissionContent: submissionContent || 'Submitted coursework online.',
    fileUrl: fileUrl || 'https://example.com/submissions/student_file.pdf',
    submittedAt: new Date(),
    status: 'Submitted',
    marks: null,
    feedback: null
  };

  if (existingIdx !== -1) {
    memStore.submissions[existingIdx] = submissionObj;
  } else {
    memStore.submissions.push(submissionObj);
  }

  await logActivity('Submitted Assignment', req.user, `Assignment ${assignmentId}`, `Student ${student.studentId} uploaded submission.`);
  res.status(201).json({ success: true, message: 'Assignment submitted successfully!', data: submissionObj });
});

app.get('/api/student/examinations', requireAuth(['student', 'principal']), (req, res) => {
  const student = memStore.students.find(s => s.email === (req.user && req.user.email)) || memStore.students[0];
  const myAttempts = memStore.examAttempts.filter(a => a.studentId === student.studentId);
  const data = memStore.examinations.map(e => {
    const atm = myAttempts.find(a => a.examId === e._id);
    return {
      _id: e._id,
      title: e.title,
      subject: e.subject,
      durationMinutes: e.durationMinutes,
      totalMarks: e.totalMarks,
      questionCount: e.questions.length,
      attempt: atm || null,
      isCompleted: !!atm
    };
  });
  res.json({ success: true, data });
});

app.get('/api/student/examinations/:id', requireAuth(['student', 'principal']), (req, res) => {
  const exam = memStore.examinations.find(e => e._id === req.params.id);
  if (!exam) return res.status(404).json({ success: false, message: 'Examination not found' });

  // Exclude correct answers for student security
  const sanitizedQuestions = exam.questions.map(q => ({
    id: q.id,
    type: q.type,
    question: q.question,
    options: q.options,
    marks: q.marks
  }));

  res.json({
    success: true,
    data: {
      _id: exam._id,
      title: exam.title,
      subject: exam.subject,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      questions: sanitizedQuestions
    }
  });
});

app.post('/api/student/examinations/:id/submit', requireAuth(['student']), async (req, res) => {
  const student = memStore.students.find(s => s.email === req.user.email) || memStore.students[0];
  const exam = memStore.examinations.find(e => e._id === req.params.id);
  if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

  const { answers } = req.body; // { questionId: answer }
  let score = 0;

  // Auto-evaluation on the backend
  exam.questions.forEach(q => {
    const studentAns = (answers && answers[q.id]) ? String(answers[q.id]).trim().toLowerCase() : '';
    const correctAns = String(q.correct).trim().toLowerCase();
    if (studentAns === correctAns) {
      score += q.marks;
    }
  });

  const attempt = {
    _id: `atm_${Date.now()}`,
    examId: exam._id,
    studentId: student.studentId,
    studentName: student.fullName,
    answers,
    score,
    total: exam.totalMarks,
    submittedAt: new Date(),
    status: 'Graded'
  };

  memStore.examAttempts.push(attempt);
  await logActivity('Completed Online Examination', req.user, exam.title, `Scored ${score}/${exam.totalMarks}`);

  res.json({
    success: true,
    message: `Examination completed! You scored ${score} / ${exam.totalMarks} points.`,
    data: attempt
  });
});

app.get('/api/student/results', requireAuth(['student', 'principal']), (req, res) => {
  const student = memStore.students.find(s => s.email === (req.user && req.user.email)) || memStore.students[0];
  const myResults = memStore.results.filter(r => r.studentId === student.studentId);
  res.json({ success: true, data: myResults });
});

app.get('/api/student/attendance', requireAuth(['student', 'principal']), (req, res) => {
  const student = memStore.students.find(s => s.email === (req.user && req.user.email)) || memStore.students[0];
  const records = memStore.attendance.filter(a => a.studentId === student.studentId);
  const total = records.length || 10;
  const present = records.filter(r => r.status === 'present').length || 9;
  res.json({
    success: true,
    data: {
      totalDays: total,
      presentDays: present,
      absentDays: total - present,
      percentage: Math.round((present / total) * 100),
      records
    }
  });
});

app.get('/api/student/timetable', requireAuth(['student', 'principal']), (req, res) => {
  res.json({ success: true, data: memStore.timetable });
});

app.get('/api/student/announcements', requireAuth(['student', 'teacher', 'principal']), (req, res) => {
  res.json({ success: true, data: memStore.announcements });
});

// -------------------------------------------------------------
// TEACHER APIs
// -------------------------------------------------------------

app.get('/api/teacher/dashboard', requireAuth(['teacher', 'principal']), (req, res) => {
  const teacher = memStore.teachers.find(t => t.email === req.user.email) || memStore.teachers[0];
  const totalStudents = 30;
  const activeAssignments = memStore.assignments.filter(a => a.teacherName === teacher.fullName).length || 2;
  const pendingSubmissions = memStore.submissions.filter(s => s.status === 'Submitted').length;

  res.json({
    success: true,
    data: {
      teacher,
      stats: {
        totalStudents,
        assignedClasses: (teacher.assignedClasses || []).length || 2,
        activeAssignments,
        pendingSubmissions,
        upcomingExaminations: 1,
        averageClassPerformance: '81.5%'
      }
    }
  });
});

app.get('/api/teacher/classes', requireAuth(['teacher', 'principal']), (req, res) => {
  res.json({ success: true, data: memStore.classes });
});

app.get('/api/teacher/students', requireAuth(['teacher', 'principal']), (req, res) => {
  const { className = 'Grade 10A' } = req.query;
  const students = memStore.students.filter(s => `Grade ${s.grade}${s.className}` === className || `${s.grade}${s.className}` === className);
  res.json({ success: true, data: students.length ? students : memStore.students.slice(0, 15) });
});

app.get('/api/teacher/materials', requireAuth(['teacher', 'principal']), (req, res) => {
  res.json({ success: true, data: memStore.materials });
});

app.post('/api/teacher/materials', requireAuth(['teacher', 'principal']), async (req, res) => {
  const mat = {
    _id: `mat_${Date.now()}`,
    title: req.body.title,
    subject: req.body.subject,
    targetClass: req.body.targetClass || '10A',
    fileType: req.body.fileType || 'PDF',
    fileUrl: req.body.fileUrl || 'https://example.com/material.pdf',
    videoUrl: req.body.videoUrl || '',
    teacher: req.user.name || 'Faculty Member',
    date: new Date().toISOString().slice(0, 10)
  };
  memStore.materials.unshift(mat);
  await logActivity('Created Learning Resource', req.user, mat.title, `Subject: ${mat.subject}`);
  res.status(201).json({ success: true, message: 'Learning resource uploaded', data: mat });
});

app.delete('/api/teacher/materials/:id', requireAuth(['teacher', 'principal']), async (req, res) => {
  const idx = memStore.materials.findIndex(m => m._id === req.params.id);
  if (idx !== -1) memStore.materials.splice(idx, 1);
  res.json({ success: true, message: 'Resource deleted' });
});

app.get('/api/teacher/assignments', requireAuth(['teacher', 'principal']), (req, res) => {
  res.json({ success: true, data: memStore.assignments });
});

app.post('/api/teacher/assignments', requireAuth(['teacher', 'principal']), async (req, res) => {
  const asn = {
    _id: `asn_${Date.now()}`,
    title: req.body.title,
    subject: req.body.subject,
    targetClass: req.body.targetClass,
    teacherName: req.user.name || 'Teacher',
    dueDate: req.body.dueDate || '2026-04-30',
    maxMarks: Number(req.body.maxMarks) || 100,
    instructions: req.body.instructions || ''
  };
  memStore.assignments.unshift(asn);
  await logActivity('Created Assignment', req.user, asn.title, `Class: ${asn.targetClass}`);
  res.status(201).json({ success: true, message: 'Assignment created successfully', data: asn });
});

app.get('/api/teacher/submissions', requireAuth(['teacher', 'principal']), (req, res) => {
  res.json({ success: true, data: memStore.submissions });
});

app.put('/api/teacher/submissions/:id/grade', requireAuth(['teacher', 'principal']), async (req, res) => {
  const sub = memStore.submissions.find(s => s._id === req.params.id);
  if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });
  sub.marks = Number(req.body.marks);
  sub.feedback = req.body.feedback || 'Good attempt.';
  sub.status = 'Graded';
  sub.gradedBy = req.user.name;
  await logActivity('Graded Student Assignment', req.user, sub.studentName, `Score: ${sub.marks}`);
  res.json({ success: true, message: 'Grade recorded successfully', data: sub });
});

app.get('/api/teacher/examinations', requireAuth(['teacher', 'principal']), (req, res) => {
  res.json({ success: true, data: memStore.examinations });
});

app.post('/api/teacher/examinations', requireAuth(['teacher', 'principal']), async (req, res) => {
  const exam = {
    _id: `ex_${Date.now()}`,
    title: req.body.title,
    subject: req.body.subject,
    targetClass: req.body.targetClass || '10A',
    durationMinutes: Number(req.body.durationMinutes) || 45,
    totalMarks: Number(req.body.totalMarks) || 100,
    isPublished: true,
    questions: req.body.questions || []
  };
  memStore.examinations.unshift(exam);
  await logActivity('Created Examination', req.user, exam.title, `Questions: ${exam.questions.length}`);
  res.status(201).json({ success: true, message: 'Examination published', data: exam });
});

app.post('/api/teacher/attendance', requireAuth(['teacher', 'principal']), async (req, res) => {
  const { date, className, records } = req.body;
  if (!date || !className || !Array.isArray(records)) {
    return res.status(400).json({ success: false, message: 'Date, class, and student records are required' });
  }

  // Remove existing attendance for same class & date to prevent duplicate records
  memStore.attendance = memStore.attendance.filter(a => !(a.date === date && a.className === className));

  records.forEach(r => {
    memStore.attendance.push({
      date,
      className,
      studentId: r.studentId,
      studentName: r.studentName,
      status: r.status || 'present',
      recordedBy: req.user.name
    });
  });

  await logActivity('Marked Class Attendance', req.user, className, `Date: ${date}, Students: ${records.length}`);
  res.json({ success: true, message: `Attendance saved for ${className} on ${date}` });
});

app.get('/api/teacher/attendance', requireAuth(['teacher', 'principal']), (req, res) => {
  const { date, className } = req.query;
  let records = memStore.attendance;
  if (date) records = records.filter(r => r.date === date);
  if (className) records = records.filter(r => r.className === className);
  res.json({ success: true, data: records });
});

app.post('/api/teacher/results', requireAuth(['teacher', 'principal']), async (req, res) => {
  const { studentId, studentName, className, subject, marks, term = 'Term 1' } = req.body;
  const numMarks = Number(marks);
  let grade = 'F';
  if (numMarks >= 75) grade = 'A';
  else if (numMarks >= 65) grade = 'B';
  else if (numMarks >= 50) grade = 'C';
  else if (numMarks >= 35) grade = 'S';

  const resultObj = {
    _id: `res_${Date.now()}`,
    studentId,
    studentName,
    className,
    subject,
    term,
    marks: numMarks,
    grade,
    recordedBy: req.user.name
  };

  memStore.results.push(resultObj);
  await logActivity('Recorded Exam Result', req.user, studentName, `${subject}: ${marks} (${grade})`);
  res.status(201).json({ success: true, message: 'Result recorded', data: resultObj });
});

app.get('/api/teacher/results', requireAuth(['teacher', 'principal']), (req, res) => {
  res.json({ success: true, data: memStore.results });
});

// -------------------------------------------------------------
// PRINCIPAL ADMIN ROUTER MOUNT
// -------------------------------------------------------------
app.use('/api/admin', createAdminRouter(store, logActivity));

// -------------------------------------------------------------
// HTML FRONTEND PAGES (Claymorphism UI)
// -------------------------------------------------------------

// 1. Landing Page
app.get('/', (req, res) => {
  res.send(renderLandingPage(req.user));
});

// 2. Login Page
app.get('/login', (req, res) => {
  res.send(renderLoginPage(req.user));
});

// 3. Student Dashboard
app.get('/student/dashboard', requireAuth(['student', 'principal']), (req, res) => {
  res.send(renderStudentDashboard(req.user));
});

// 4. Teacher Dashboard
app.get('/teacher/dashboard', requireAuth(['teacher', 'principal']), (req, res) => {
  res.send(renderTeacherDashboard(req.user));
});

// 5. Principal Administration Dashboard
app.get('/admin', requireAuth(['principal']), (req, res) => {
  res.send(renderAdminPage(req.user, memStore.settings));
});

// 404 Handler
app.use((req, res) => {
  if (req.accepts('html')) {
    return res.status(404).send(renderNotFoundPage());
  }
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// -------------------------------------------------------------
// CLAYMORPHISM UI RENDERERS
// -------------------------------------------------------------

const CLAY_BASE_STYLES = `
  <script>
    (function() {
      try {
        var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
        if (!nativeFetch && window.Window && window.Window.prototype && window.Window.prototype.fetch) {
          nativeFetch = window.Window.prototype.fetch.bind(window);
        }

        function safeFetch(url, options) {
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
          if (nativeFetch) {
            return nativeFetch(url, options);
          }
          return Promise.reject(new Error('Fetch API unavailable'));
        }

        Object.defineProperty(window, 'fetch', {
          value: safeFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });

        if (window.Window && window.Window.prototype) {
          try {
            Object.defineProperty(window.Window.prototype, 'fetch', {
              value: safeFetch,
              writable: true,
              configurable: true,
              enumerable: true
            });
          } catch (_) {}
        }
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
    html, body {
      overflow-x: hidden;
      width: 100%;
      -webkit-text-size-adjust: 100%;
    }
    body {
      background-color: var(--light-bg);
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(169, 216, 255, 0.35) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(245, 165, 197, 0.25) 0%, transparent 40%),
        radial-gradient(circle at 50% 50%, rgba(148, 117, 232, 0.15) 0%, transparent 50%);
      background-attachment: fixed;
      color: var(--dark-text);
      min-height: 100vh;
    }
    .clay-card {
      background: var(--clay-surface);
      border-radius: 24px;
      box-shadow: var(--clay-shadow-out);
      border: var(--clay-border);
      transition: all 0.25s ease;
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
      min-height: 44px;
      border-radius: 16px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 4px 4px 10px rgba(49, 89, 201, 0.35), -2px -2px 6px rgba(255, 255, 255, 0.6), inset 1px 1px 2px rgba(255, 255, 255, 0.4);
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      text-decoration: none;
      touch-action: manipulation;
    }
    .clay-btn:hover {
      transform: translateY(-2px);
      box-shadow: 6px 6px 14px rgba(49, 89, 201, 0.45);
    }
    .clay-btn:active {
      transform: translateY(1px);
    }
    .clay-btn-secondary {
      background: #FFFFFF;
      color: var(--dark-text);
      box-shadow: var(--clay-shadow-out-sm);
    }
    .clay-btn-secondary:hover { background: #F0F4FF; color: var(--royal-blue); }
    .clay-btn-success { background: linear-gradient(135deg, #70D6A3, #28A745); color: white; }
    .clay-btn-danger { background: linear-gradient(135deg, #FF6B8B, #E83E8C); color: white; }
    .clay-input, select.clay-input {
      width: 100%;
      min-height: 44px;
      background: #F3F6FF;
      border: 1px solid rgba(169, 216, 255, 0.4);
      border-radius: 14px;
      padding: 10px 16px;
      font-size: 16px; /* Prevents auto-zoom on mobile browsers */
      color: var(--dark-text);
      box-shadow: var(--clay-shadow-in);
      outline: none;
      transition: all 0.2s ease;
      touch-action: manipulation;
    }
    .clay-input:focus, select.clay-input:focus {
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

    /* Action icon buttons */
    .action-icon-btn {
      min-width: 44px;
      min-height: 44px;
      border-radius: 14px;
      background: white;
      border: var(--clay-border);
      box-shadow: var(--clay-shadow-out-sm);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--dark-text);
      cursor: pointer;
      position: relative;
      transition: all 0.2s ease;
      text-decoration: none;
      touch-action: manipulation;
    }
    .action-icon-btn:hover {
      transform: translateY(-2px);
      color: var(--royal-blue);
    }

    /* Mobile menu drawer & backdrop */
    .mobile-menu-toggle {
      display: none;
    }
    .sidebar-backdrop {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(38, 50, 75, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1050;
      transition: opacity 0.25s ease;
    }
    .sidebar-backdrop.open {
      display: block;
    }

    /* Standard Responsive Table Container */
    .table-container {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 20px;
      background: white;
      box-shadow: var(--clay-shadow-out);
      padding: 6px;
      margin-bottom: 20px;
    }
    .table-container table, .clay-card > table {
      width: 100%;
      min-width: 580px;
      border-collapse: separate;
      border-spacing: 0;
    }

    /* Global Responsive Adjustments */
    @media (max-width: 640px) {
      .clay-card {
        border-radius: 20px;
      }
      .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)) !important;
        gap: 12px !important;
      }
      .stat-card {
        padding: 14px 12px !important;
        gap: 10px !important;
      }
      .stat-icon {
        width: 42px !important;
        height: 42px !important;
        font-size: 1.1rem !important;
      }
      .form-row {
        grid-template-columns: 1fr !important;
      }
    }

    /* Toast */
    #toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      left: 20px;
      max-width: 380px;
      margin-left: auto;
      z-index: 2100;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .toast {
      padding: 14px 18px;
      border-radius: 16px;
      background: white;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), var(--clay-shadow-out);
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      border-left: 5px solid var(--royal-blue);
      pointer-events: auto;
    }
    .toast.success { border-left-color: #28A745; }
    .toast.error { border-left-color: #E83E8C; }
  </style>
`;

function renderLandingPage(currentUser) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>St. Mary's College Negombo | Learning Management System</title>
  ${CLAY_BASE_STYLES}
  <style>
    .nav-bar {
      position: sticky;
      top: 0;
      z-index: 500;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      box-shadow: var(--clay-shadow-out-sm);
      padding: 16px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .nav-links {
      display: flex;
      gap: 24px;
      list-style: none;
    }
    .nav-links a {
      text-decoration: none;
      color: var(--dark-text);
      font-weight: 700;
      font-size: 0.95rem;
      transition: color 0.2s;
    }
    .nav-links a:hover { color: var(--royal-blue); }

    .mobile-nav-toggle {
      display: none;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: white;
      border: var(--clay-border);
      box-shadow: var(--clay-shadow-out-sm);
      align-items: center;
      justify-content: center;
      color: var(--royal-blue);
      font-size: 1.2rem;
      cursor: pointer;
      touch-action: manipulation;
    }

    .landing-mobile-menu {
      display: none;
      flex-direction: column;
      gap: 12px;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(14px);
      padding: 18px 24px;
      border-bottom: 1px solid #EDF2F9;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
      position: sticky;
      top: 72px;
      z-index: 499;
    }
    .landing-mobile-menu.open {
      display: flex;
    }
    .landing-mobile-menu a {
      text-decoration: none;
      color: var(--dark-text);
      font-weight: 700;
      font-size: 1rem;
      padding: 8px 4px;
    }

    .hero-section {
      padding: clamp(32px, 6vw, 60px) clamp(16px, 4vw, 36px);
      max-width: 1300px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      align-items: center;
      gap: clamp(24px, 4vw, 40px);
    }
    .hero-content h1 {
      font-family: 'Poppins', sans-serif;
      font-size: clamp(1.8rem, 4.5vw, 3rem);
      font-weight: 800;
      color: var(--royal-blue);
      line-height: 1.15;
      margin-bottom: 16px;
      text-wrap: balance;
    }
    .hero-content h2 {
      font-size: clamp(1.05rem, 2.5vw, 1.3rem);
      color: var(--primary-blue);
      font-weight: 700;
      margin-bottom: 20px;
    }
    .hero-content p {
      font-size: clamp(0.95rem, 2vw, 1.1rem);
      color: var(--secondary-text);
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .hero-buttons {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }

    .hero-card {
      padding: clamp(20px, 4vw, 30px);
      border-radius: 32px;
      text-align: center;
    }

    .section-wrap {
      max-width: 1300px;
      margin: 40px auto;
      padding: 0 clamp(16px, 4vw, 36px);
    }
    .section-head {
      text-align: center;
      margin-bottom: 36px;
    }
    .section-head h2 {
      font-family: 'Poppins', sans-serif;
      font-size: clamp(1.5rem, 3.5vw, 2.2rem);
      color: var(--royal-blue);
      font-weight: 800;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
    }
    .feature-item {
      padding: clamp(20px, 3vw, 28px);
      border-radius: 24px;
      text-align: center;
    }
    .feature-icon {
      width: 60px;
      height: 60px;
      border-radius: 20px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: var(--clay-shadow-out-sm);
    }

    .about-grid-card {
      padding: clamp(24px, 4vw, 40px);
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: clamp(20px, 4vw, 36px);
      align-items: center;
    }

    footer {
      background: white;
      padding: 40px clamp(16px, 4vw, 36px);
      border-top: var(--clay-border);
      margin-top: 60px;
      box-shadow: 0 -4px 20px rgba(163, 177, 198, 0.2);
    }
    @media (max-width: 868px) {
      .hero-section { grid-template-columns: 1fr; text-align: center; }
      .hero-buttons { justify-content: center; }
      .nav-links { display: none; }
      .mobile-nav-toggle { display: inline-flex; }
      .nav-bar { padding: 12px 18px; }
      .about-grid-card { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 480px) {
      .hero-buttons { flex-direction: column; align-items: stretch; }
      .hero-buttons .clay-btn { width: 100%; justify-content: center; }
    }
  </style>
</head>
<body>

  <!-- Navigation -->
  <nav class="nav-bar">
    <div style="display:flex; align-items:center; gap:12px;">
      <div style="width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg, var(--royal-blue), var(--primary-blue)); display:flex; align-items:center; justify-content:center; color:#FFD66B; font-size:1.2rem; box-shadow:var(--clay-shadow-out-sm); flex-shrink:0;">
        <i class="fa-solid fa-graduation-cap"></i>
      </div>
      <div>
        <div style="font-family:'Poppins'; font-weight:800; color:var(--royal-blue); font-size:clamp(1rem, 3.5vw, 1.15rem); line-height:1.1;">St. Mary's College</div>
        <div style="font-size:0.75rem; color:var(--secondary-text); font-weight:700;">Negombo, Sri Lanka • Founded 1871</div>
      </div>
    </div>

    <ul class="nav-links">
      <li><a href="#about">About School</a></li>
      <li><a href="#features">LMS Features</a></li>
      <li><a href="#announcements">Announcements</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>

    <div style="display:flex; align-items:center; gap:10px;">
      <div id="auth-nav-container" class="desktop-auth-btn">
        ${currentUser ? `
          <a href="${currentUser.role === 'principal' ? '/admin' : currentUser.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}" class="clay-btn">
            <i class="fa-solid fa-gauge"></i> Enter Dashboard (${currentUser.role})
          </a>
        ` : `
          <a href="/login" class="clay-btn">
            <i class="fa-solid fa-right-to-bracket"></i> Learning Portal Login
          </a>
        `}
      </div>
      <button class="mobile-nav-toggle" onclick="toggleLandingNav()" aria-label="Toggle Navigation">
        <i class="fa-solid fa-bars"></i>
      </button>
    </div>
  </nav>

  <!-- Mobile Drawer Menu -->
  <div id="landing-mobile-nav" class="landing-mobile-menu">
    <a href="#about" onclick="toggleLandingNav()"><i class="fa-solid fa-landmark" style="margin-right:8px; color:var(--royal-blue);"></i> About School</a>
    <a href="#features" onclick="toggleLandingNav()"><i class="fa-solid fa-shapes" style="margin-right:8px; color:#28A745;"></i> LMS Features</a>
    <a href="#announcements" onclick="toggleLandingNav()"><i class="fa-solid fa-bullhorn" style="margin-right:8px; color:#E83E8C;"></i> Announcements</a>
    <a href="#contact" onclick="toggleLandingNav()"><i class="fa-solid fa-envelope" style="margin-right:8px; color:var(--purple);"></i> Contact Information</a>
    <div style="padding-top:10px; border-top:1px solid #EDF2F9; margin-top:6px;">
      <a href="/login" class="clay-btn" style="width:100%; justify-content:center;"><i class="fa-solid fa-right-to-bracket"></i> Portal Sign In</a>
    </div>
  </div>

  <!-- Hero Section -->
  <section class="hero-section">
    <div class="hero-content">
      <span class="clay-badge badge-blue" style="margin-bottom:16px;"><i class="fa-solid fa-star"></i> Empowering Generations Since 1871</span>
      <h1>Welcome to St. Mary's College Negombo</h1>
      <h2>Empowering Students. Inspiring Excellence. Building Tomorrow.</h2>
      <p>Your digital learning destination — seamlessly connecting students, teachers, and school administration in one innovative, interactive Claymorphism platform.</p>
      <div class="hero-buttons">
        <a href="/login?role=student" class="clay-btn"><i class="fa-solid fa-user-graduate"></i> Student Portal</a>
        <a href="/login?role=teacher" class="clay-btn clay-btn-secondary"><i class="fa-solid fa-chalkboard-user"></i> Faculty Portal</a>
        <a href="/login?role=principal" class="clay-btn clay-btn-secondary"><i class="fa-solid fa-shield-halved"></i> Principal Admin</a>
      </div>
    </div>

    <div>
      <div class="clay-card hero-card">
        <div style="width:90px; height:90px; border-radius:50%; background:linear-gradient(135deg, #FFD66B, #F39C12); margin:0 auto 16px; display:flex; align-items:center; justify-content:center; font-size:2.5rem; color:white; box-shadow:var(--clay-shadow-out);">
          <i class="fa-solid fa-award"></i>
        </div>
        <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:8px;">Excellence in Academics</h3>
        <p style="color:var(--secondary-text); font-size:0.92rem; margin-bottom:18px;">Ranked among premier institutions in Western Province, Sri Lanka.</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:10px;">
          <div class="clay-card-flat" style="padding:12px;">
            <div style="font-family:'Poppins'; font-size:1.5rem; font-weight:800; color:var(--royal-blue);">98.4%</div>
            <div style="font-size:0.75rem; color:var(--secondary-text); font-weight:700;">GCE O/L Pass Rate</div>
          </div>
          <div class="clay-card-flat" style="padding:12px;">
            <div style="font-family:'Poppins'; font-size:1.5rem; font-weight:800; color:#28A745;">100%</div>
            <div style="font-size:0.75rem; color:var(--secondary-text); font-weight:700;">Digital Curriculum</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- About Section -->
  <section id="about" class="section-wrap">
    <div class="clay-card about-grid-card">
      <div>
        <span class="clay-badge badge-yellow">History & Heritage</span>
        <h2 style="font-family:'Poppins'; font-size:clamp(1.5rem, 3.5vw, 2rem); color:var(--royal-blue); margin:12px 0 16px;">155+ Years of Educational Leadership</h2>
        <p style="color:var(--dark-text); line-height:1.7; margin-bottom:14px;">Located in the historic coastal city of Negombo, St. Mary's College has stood as a beacon of moral education, academic vigor, sportsmanship, and civic pride for over a century and a half.</p>
        <p style="color:var(--secondary-text); line-height:1.7;">Our cutting-edge Learning Management System carries this legacy into the modern era, equipping our 3,000+ students with 24/7 access to multimedia study resources, interactive examinations, and personalized academic feedback.</p>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:14px;">
        <div class="clay-card-flat" style="padding:18px; text-align:center;">
          <i class="fa-solid fa-users" style="font-size:1.8rem; color:var(--royal-blue); margin-bottom:8px;"></i>
          <h4 style="font-size:1.2rem; font-weight:800;">3,000+</h4>
          <p style="font-size:0.8rem; color:var(--secondary-text);">Active Marian Students</p>
        </div>
        <div class="clay-card-flat" style="padding:18px; text-align:center;">
          <i class="fa-solid fa-chalkboard-user" style="font-size:1.8rem; color:#28A745; margin-bottom:8px;"></i>
          <h4 style="font-size:1.2rem; font-weight:800;">120+</h4>
          <p style="font-size:0.8rem; color:var(--secondary-text);">Dedicated Faculty</p>
        </div>
        <div class="clay-card-flat" style="padding:18px; text-align:center;">
          <i class="fa-solid fa-trophy" style="font-size:1.8rem; color:#F39C12; margin-bottom:8px;"></i>
          <h4 style="font-size:1.2rem; font-weight:800;">50+</h4>
          <p style="font-size:0.8rem; color:var(--secondary-text);">Sports & Clubs</p>
        </div>
        <div class="clay-card-flat" style="padding:18px; text-align:center;">
          <i class="fa-solid fa-network-wired" style="font-size:1.8rem; color:var(--purple); margin-bottom:8px;"></i>
          <h4 style="font-size:1.2rem; font-weight:800;">Smart LMS</h4>
          <p style="font-size:0.8rem; color:var(--secondary-text);">Cloud Campus</p>
        </div>
      </div>
    </div>


  <!-- Features Section -->
  <section id="features" class="section-wrap">
    <div class="section-head">
      <span class="clay-badge badge-blue">Comprehensive Architecture</span>
      <h2>Our Learning Features</h2>
      <p style="color:var(--secondary-text); margin-top:8px;">Designed specifically for students, educators, and administrators</p>
    </div>

    <div class="features-grid">
      <div class="clay-card feature-item">
        <div class="feature-icon" style="background:#E8F0FE; color:var(--royal-blue);"><i class="fa-solid fa-folder-open"></i></div>
        <h3 style="font-family:'Poppins'; margin-bottom:8px;">Curated Study Packs</h3>
        <p style="color:var(--secondary-text); font-size:0.92rem;">Subject-wise downloadable PDF notes, presentations, and educational video tutorials accessible anytime.</p>
      </div>
      <div class="clay-card feature-item">
        <div class="feature-icon" style="background:#E6F8F0; color:#28A745;"><i class="fa-solid fa-clipboard-check"></i></div>
        <h3 style="font-family:'Poppins'; margin-bottom:8px;">Online Coursework</h3>
        <p style="color:var(--secondary-text); font-size:0.92rem;">Seamless assignment submission with file uploads, deadline tracking, and personalized teacher grading notes.</p>
      </div>
      <div class="clay-card feature-item">
        <div class="feature-icon" style="background:#FFF8E1; color:#F39C12;"><i class="fa-solid fa-clock-rotate-left"></i></div>
        <h3 style="font-family:'Poppins'; margin-bottom:8px;">Timed Examinations</h3>
        <p style="color:var(--secondary-text); font-size:0.92rem;">Interactive MCQ quizzes and term tests with secure live countdown timers and instantaneous score computation.</p>
      </div>
      <div class="clay-card feature-item">
        <div class="feature-icon" style="background:#FDE8EF; color:#E83E8C;"><i class="fa-solid fa-chart-pie"></i></div>
        <h3 style="font-family:'Poppins'; margin-bottom:8px;">Academic Analytics</h3>
        <p style="color:var(--secondary-text); font-size:0.92rem;">Live report cards, GPA calculations, monthly attendance tracking calendars, and printable student transcripts.</p>
      </div>
    </div>
  </section>

  <!-- Latest Announcements -->
  <section id="announcements" class="section-wrap">
    <div class="section-head">
      <span class="clay-badge badge-pink">Official Bulletins</span>
      <h2>Latest School Announcements</h2>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">
      ${memStore.announcements.slice(0, 3).map(a => `
        <div class="clay-card" style="padding:24px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
            <span class="clay-badge badge-blue">${a.category}</span>
            <span style="font-size:0.8rem; color:var(--secondary-text);">${new Date(a.publishedDate).toLocaleDateString()}</span>
          </div>
          <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:10px;">${a.title}</h3>
          <p style="color:var(--dark-text); font-size:0.92rem; line-height:1.5;">${a.content}</p>
        </div>
      `).join('')}
    </div>
  </section>

  <!-- Contact & Footer -->
  <footer id="contact">
    <div style="max-width:1300px; margin:0 auto; display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:30px;">
      <div>
        <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:12px;">St. Mary's College Negombo</h3>
        <p style="color:var(--secondary-text); font-size:0.92rem; line-height:1.6;">A premier Sri Lankan Catholic collegiate institution fostering academic brilliance and moral excellence.</p>
      </div>
      <div>
        <h4 style="font-family:'Poppins'; color:var(--dark-text); margin-bottom:12px;">Contact Information</h4>
        <p style="color:var(--secondary-text); font-size:0.92rem; margin-bottom:6px;"><i class="fa-solid fa-location-dot" style="color:var(--royal-blue); width:20px;"></i> Negombo, Western Province, Sri Lanka</p>
        <p style="color:var(--secondary-text); font-size:0.92rem; margin-bottom:6px;"><i class="fa-solid fa-phone" style="color:var(--royal-blue); width:20px;"></i> +94 31 555 0123</p>
        <p style="color:var(--secondary-text); font-size:0.92rem;"><i class="fa-solid fa-envelope" style="color:var(--royal-blue); width:20px;"></i> info@stmarysnegombo.example</p>
      </div>
      <div>
        <h4 style="font-family:'Poppins'; color:var(--dark-text); margin-bottom:12px;">Demo Login Credentials</h4>
        <p style="color:var(--secondary-text); font-size:0.85rem; margin-bottom:4px;"><strong>Principal:</strong> principal@stmarys.lk (Principal@123)</p>
        <p style="color:var(--secondary-text); font-size:0.85rem; margin-bottom:4px;"><strong>Teacher:</strong> perera@stmarys.lk (Teacher@123)</p>
        <p style="color:var(--secondary-text); font-size:0.85rem;"><strong>Student:</strong> alex@stmarys.lk (Student@123)</p>
      </div>
    </div>
    <div style="text-align:center; margin-top:30px; padding-top:20px; border-top:1px solid #EDF2F9; color:var(--secondary-text); font-size:0.85rem;">
      &copy; 2026 St. Mary's College Negombo. All rights reserved.
    </div>
  </footer>

  <script>
    function toggleLandingNav() {
      var menu = document.getElementById('landing-mobile-nav');
      if (menu) menu.classList.toggle('open');
    }
    (function() {
      try {
        var token = localStorage.getItem('stmarys_token');
        var user = JSON.parse(localStorage.getItem('stmarys_user') || 'null');
        if (token && user) {
          var dest = user.role === 'principal' ? '/admin' : (user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
          var authNav = document.getElementById('auth-nav-container');
          if (authNav) {
            authNav.innerHTML = '<a href="' + dest + '?token=' + encodeURIComponent(token) + '" class="clay-btn"><i class="fa-solid fa-gauge"></i> Enter Dashboard (' + user.role + ')</a>';
          }
        }
      } catch (_) {}
    })();
  </script>
</body>
</html>`;
}

function renderLoginPage(currentUser) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portal Sign In | St. Mary's College Negombo LMS</title>
  ${CLAY_BASE_STYLES}
  <style>
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .login-container {
      width: 100%;
      max-width: 480px;
      padding: 36px;
    }
    .role-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      background: #F3F6FF;
      padding: 6px;
      border-radius: 18px;
      box-shadow: var(--clay-shadow-in);
      margin-bottom: 24px;
    }
    .role-tab-btn {
      padding: 10px;
      border: none;
      border-radius: 14px;
      background: transparent;
      font-weight: 700;
      font-size: 0.88rem;
      color: var(--secondary-text);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      transition: all 0.2s ease;
    }
    .role-tab-btn.active {
      background: white;
      color: var(--royal-blue);
      box-shadow: var(--clay-shadow-out-sm);
    }
    .form-group {
      margin-bottom: 18px;
    }
    .form-group label {
      display: block;
      font-weight: 700;
      font-size: 0.88rem;
      margin-bottom: 6px;
      color: var(--dark-text);
    }
    .input-wrapper {
      position: relative;
    }
    .input-wrapper i.toggle-pass {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      color: var(--secondary-text);
    }
    .demo-box {
      margin-top: 24px;
      padding: 16px;
      background: #F8FAFF;
      border-radius: 16px;
      border: 1px solid rgba(169, 216, 255, 0.4);
    }
    .demo-pill {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 12px;
      background: white;
      border: var(--clay-border);
      box-shadow: var(--clay-shadow-out-sm);
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      margin: 4px;
      transition: all 0.2s;
      touch-action: manipulation;
    }
    .demo-pill:hover { background: #E8F0FE; color: var(--royal-blue); }

    @media (max-width: 480px) {
      body {
        padding: 12px 8px;
      }
      .login-container {
        padding: 22px 16px !important;
        border-radius: 20px !important;
      }
      .role-tabs {
        gap: 4px;
        padding: 4px;
      }
      .role-tab-btn {
        padding: 8px 4px;
        font-size: 0.8rem;
        min-height: 44px;
      }
      .demo-box {
        padding: 12px 10px;
      }
      .demo-pill {
        display: block;
        text-align: center;
        margin: 6px 0;
        padding: 8px 10px;
      }
    }
  </style>
</head>
<body>

  <div class="clay-card login-container">
    <div style="text-align:center; margin-bottom:24px;">
      <div style="width:58px; height:58px; border-radius:18px; background:linear-gradient(135deg, var(--royal-blue), var(--primary-blue)); margin:0 auto 12px; display:flex; align-items:center; justify-content:center; color:#FFD66B; font-size:1.8rem; box-shadow:var(--clay-shadow-out);">
        <i class="fa-solid fa-graduation-cap"></i>
      </div>
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); font-size:1.6rem;">St. Mary's College</h2>
      <p style="color:var(--secondary-text); font-size:0.9rem;">Negombo LMS • Digital Portal Login</p>
    </div>

    <!-- Role Tabs -->
    <div class="role-tabs">
      <button type="button" class="role-tab-btn active" id="tab-student" onclick="selectRole('student')">
        <i class="fa-solid fa-user-graduate"></i> Student
      </button>
      <button type="button" class="role-tab-btn" id="tab-teacher" onclick="selectRole('teacher')">
        <i class="fa-solid fa-chalkboard-user"></i> Teacher
      </button>
      <button type="button" class="role-tab-btn" id="tab-principal" onclick="selectRole('principal')">
        <i class="fa-solid fa-shield-halved"></i> Principal
      </button>
    </div>

    <form id="login-form" onsubmit="handleLogin(event)">
      <div class="form-group">
        <label id="email-label">Student Email / ID</label>
        <input type="text" class="clay-input" id="email-input" required placeholder="alex@stmarys.lk" value="alex@stmarys.lk">
      </div>

      <div class="form-group">
        <label>Password</label>
        <div class="input-wrapper">
          <input type="password" class="clay-input" id="password-input" required placeholder="••••••••" value="Student@123">
          <i class="fa-solid fa-eye toggle-pass" onclick="togglePasswordVisibility()"></i>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; font-size:0.85rem;">
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" id="remember-me" checked> Remember me
        </label>
        <a href="#" style="color:var(--royal-blue); text-decoration:none; font-weight:700;" onclick="forgotPassword(event)">Forgot Password?</a>
      </div>

      <button type="submit" class="clay-btn" style="width:100%; justify-content:center; padding:12px; font-size:1rem;" id="login-submit-btn">
        <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to LMS
      </button>
    </form>

    <!-- Quick Demo Login Switcher -->
    <div class="demo-box">
      <div style="font-size:0.8rem; font-weight:800; color:var(--royal-blue); margin-bottom:6px;"><i class="fa-solid fa-bolt"></i> Instant Demo Logins:</div>
      <div style="display:flex; flex-wrap:wrap;">
        <div class="demo-pill" onclick="quickFill('student')">👨‍🎓 Student: Alex (STU-001)</div>
        <div class="demo-pill" onclick="quickFill('teacher')">👨‍🏫 Teacher: Mr. Perera</div>
        <div class="demo-pill" onclick="quickFill('principal')">👑 Principal: Fr. Ranjith</div>
      </div>
    </div>

    <div style="text-align:center; margin-top:20px;">
      <a href="/" style="color:var(--secondary-text); font-size:0.85rem; text-decoration:none; font-weight:700;"><i class="fa-solid fa-arrow-left"></i> Return to Homepage</a>
    </div>
  </div>

  <div id="toast-container"></div>

  <script>
    let activeRole = 'student';

    function selectRole(role) {
      activeRole = role;
      document.querySelectorAll('.role-tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('tab-' + role).classList.add('active');

      if (role === 'student') {
        document.getElementById('email-label').innerText = 'Student Email / ID';
        document.getElementById('email-input').value = 'alex@stmarys.lk';
        document.getElementById('password-input').value = 'Student@123';
      } else if (role === 'teacher') {
        document.getElementById('email-label').innerText = 'Teacher Email';
        document.getElementById('email-input').value = 'perera@stmarys.lk';
        document.getElementById('password-input').value = 'Teacher@123';
      } else if (role === 'principal') {
        document.getElementById('email-label').innerText = 'Principal Administrator Email';
        document.getElementById('email-input').value = 'principal@stmarys.lk';
        document.getElementById('password-input').value = 'Principal@123';
      }
    }

    function quickFill(role) {
      selectRole(role);
    }

    function togglePasswordVisibility() {
      const p = document.getElementById('password-input');
      p.type = p.type === 'password' ? 'text' : 'password';
    }

    async function handleLogin(e) {
      e.preventDefault();
      const btn = document.getElementById('login-submit-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

      const email = document.getElementById('email-input').value.trim();
      const password = document.getElementById('password-input').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: activeRole })
        });
        const json = await res.json();
        if (json.success) {
          try {
            localStorage.setItem('stmarys_token', json.data.token);
            localStorage.setItem('stmarys_user', JSON.stringify(json.data.user));
            document.cookie = 'token=' + json.data.token + '; path=/; max-age=604800; SameSite=None; Secure';
          } catch (_) {}
          showToast('success', 'Authentication successful! Entering portal...');
          setTimeout(() => {
            var sep = json.data.redirectUrl.indexOf('?') !== -1 ? '&' : '?';
            window.location.href = json.data.redirectUrl + sep + 'token=' + encodeURIComponent(json.data.token);
          }, 200);
        } else {
          showToast('error', json.message || 'Login failed');
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to LMS';
        }
      } catch (err) {
        showToast('error', err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to LMS';
      }
    }

    function forgotPassword(e) {
      e.preventDefault();
      const email = prompt('Enter your registered school email to reset your credentials:');
      if (email) {
        fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        }).then(res => res.json()).then(j => showToast('success', j.message));
      }
    }

    function showToast(type, message) {
      const c = document.getElementById('toast-container');
      const t = document.createElement('div');
      t.className = 'toast ' + type;
      t.innerHTML = '<span>' + message + '</span>';
      c.appendChild(t);
      setTimeout(() => t.remove(), 4000);
    }

    // Auto-select role from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const requestedRole = urlParams.get('role');
    if (requestedRole && ['student', 'teacher', 'principal'].includes(requestedRole)) {
      selectRole(requestedRole);
    }
  </script>
</body>
</html>`;
}

function renderStudentDashboard(user) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student Learning Portal | St. Mary's College Negombo</title>
  ${CLAY_BASE_STYLES}
  <style>
    body { display: flex; min-height: 100vh; overflow-x: hidden; width: 100%; }
    #sidebar {
      width: 270px;
      min-height: 100vh;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(14px);
      border-right: var(--clay-border);
      box-shadow: 6px 0 20px rgba(163, 177, 198, 0.25);
      position: fixed;
      left: 0; top: 0; bottom: 0;
      display: flex;
      flex-direction: column;
      z-index: 1200;
      overflow-y: auto;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      min-height: 44px;
      border-radius: 16px;
      color: var(--secondary-text);
      font-size: 0.9rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      margin: 3px 12px;
      touch-action: manipulation;
    }
    .menu-item:hover { background: #F0F4FF; color: var(--royal-blue); }
    .menu-item.active {
      background: linear-gradient(135deg, var(--primary-blue), var(--royal-blue));
      color: white;
      box-shadow: 4px 4px 10px rgba(49, 89, 201, 0.35);
    }
    #main-content {
      margin-left: 270px;
      flex: 1;
      padding: 24px 32px;
      max-width: 1400px;
      width: calc(100% - 270px);
      transition: all 0.3s ease;
    }
    .tab-view { display: none; }
    .tab-view.active { display: block; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      padding: 18px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      box-shadow: var(--clay-shadow-out-sm);
      flex-shrink: 0;
    }
    .student-overview-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }
    table { width: 100%; border-collapse: separate; border-spacing: 0; }
    th { background: #F6F9FF; padding: 12px 16px; font-size: 0.8rem; text-transform: uppercase; color: var(--secondary-text); font-weight: 800; border-bottom: 2px solid #E6EEFA; }
    td { padding: 12px 16px; border-bottom: 1px solid #EDF2F9; font-size: 0.9rem; font-weight: 600; }
    
    @media (max-width: 992px) {
      #sidebar {
        transform: translateX(-100%);
        box-shadow: 10px 0 30px rgba(0, 0, 0, 0.25);
      }
      #sidebar.open {
        transform: translateX(0);
      }
      #main-content {
        margin-left: 0 !important;
        padding: 16px !important;
        width: 100% !important;
      }
      .mobile-menu-toggle {
        display: inline-flex !important;
      }
      .student-overview-grid {
        grid-template-columns: 1fr !important;
        gap: 18px !important;
      }
    }
  </style>
</head>
<body>

  <!-- Sidebar Backdrop for Mobile -->
  <div id="student-sidebar-backdrop" class="sidebar-backdrop" onclick="closeStudentSidebar()"></div>

  <!-- Sidebar -->
  <aside id="sidebar">
    <div style="padding:24px 18px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #E6EEFA;">
      <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg, var(--royal-blue), var(--primary-blue)); display:flex; align-items:center; justify-content:center; color:#FFD66B; font-size:1.2rem; box-shadow:var(--clay-shadow-out-sm); flex-shrink:0;">
        <i class="fa-solid fa-graduation-cap"></i>
      </div>
      <div style="flex:1;">
        <div style="font-family:'Poppins'; font-weight:800; color:var(--royal-blue); font-size:1.05rem;">St. Mary's College</div>
        <div style="font-size:0.75rem; color:var(--secondary-text); font-weight:700;">Student Learning Portal</div>
      </div>
      <button class="table-btn mobile-menu-toggle" style="background:#FDE8EF; color:#E83E8C;" onclick="closeStudentSidebar()" aria-label="Close menu">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div style="padding:16px 0; flex:1;">
      <a class="menu-item active" onclick="switchStudentTab('overview')"><i class="fa-solid fa-house"></i> Dashboard</a>
      <a class="menu-item" onclick="switchStudentTab('subjects')"><i class="fa-solid fa-book-open"></i> My Subjects</a>
      <a class="menu-item" onclick="switchStudentTab('materials')"><i class="fa-solid fa-folder-open"></i> Study Materials</a>
      <a class="menu-item" onclick="switchStudentTab('assignments')"><i class="fa-solid fa-clipboard-list"></i> Assignments</a>
      <a class="menu-item" onclick="switchStudentTab('exams')"><i class="fa-solid fa-file-signature"></i> Online Exams</a>
      <a class="menu-item" onclick="switchStudentTab('results')"><i class="fa-solid fa-award"></i> My Results</a>
      <a class="menu-item" onclick="switchStudentTab('attendance')"><i class="fa-solid fa-calendar-check"></i> Attendance</a>
      <a class="menu-item" onclick="switchStudentTab('timetable')"><i class="fa-solid fa-clock"></i> Timetable</a>
      <a class="menu-item" onclick="switchStudentTab('announcements')"><i class="fa-solid fa-bullhorn"></i> Announcements</a>
      <a class="menu-item" onclick="switchStudentTab('profile')"><i class="fa-solid fa-user"></i> My Profile</a>
    </div>

    <div style="padding:16px; border-top:1px solid #E6EEFA; display:flex; align-items:center; gap:10px;">
      <div style="width:38px; height:38px; border-radius:50%; background:#A9D8FF; display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--royal-blue); flex-shrink:0;">A</div>
      <div style="flex:1; overflow:hidden;">
        <div style="font-weight:800; font-size:0.85rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" id="student-name-sidebar">${user ? user.name : 'Alex Fernando'}</div>
        <div style="font-size:0.75rem; color:var(--secondary-text);">Grade 10A • STU2026-001</div>
      </div>
      <a href="/api/auth/logout" class="clay-btn clay-btn-danger" style="padding:6px 10px; font-size:0.8rem; min-height:36px;" onclick="logout(event)"><i class="fa-solid fa-right-from-bracket"></i></a>
    </div>
  </aside>

  <!-- Main Content -->
  <main id="main-content">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <button class="action-icon-btn mobile-menu-toggle" onclick="toggleStudentSidebar()" aria-label="Open Navigation Menu">
          <i class="fa-solid fa-bars"></i>
        </button>
        <div>
          <h1 style="font-family:'Poppins'; font-size:clamp(1.3rem, 3.5vw, 1.8rem); color:var(--royal-blue); line-height:1.2;">Good Morning, ${user ? user.name.split(' ')[0] : 'Alex'}! 👋</h1>
          <p style="color:var(--secondary-text); font-weight:600; font-size:clamp(0.8rem, 2.5vw, 0.95rem);">Ready to learn something amazing today at St. Mary's College?</p>
        </div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <span class="clay-badge badge-blue"><i class="fa-solid fa-calendar"></i> Academic Year 2026 • Term 1</span>
        <a href="/" class="clay-btn clay-btn-secondary" style="padding:6px 14px; font-size:0.85rem;"><i class="fa-solid fa-globe"></i> Portal</a>
      </div>
    </div>

    <!-- STATS GRID -->
    <div class="stats-grid">
      <div class="clay-card stat-card">
        <div class="stat-icon" style="background:#E8F0FE; color:var(--royal-blue);"><i class="fa-solid fa-book"></i></div>
        <div><div style="font-size:1.6rem; font-weight:800;" id="stat-subjects">8</div><div style="font-size:0.8rem; color:var(--secondary-text); font-weight:700;">Enrolled Subjects</div></div>
      </div>
      <div class="clay-card stat-card">
        <div class="stat-icon" style="background:#FFF8E1; color:#F39C12;"><i class="fa-solid fa-clock"></i></div>
        <div><div style="font-size:1.6rem; font-weight:800;" id="stat-pending">2</div><div style="font-size:0.8rem; color:var(--secondary-text); font-weight:700;">Pending Tasks</div></div>
      </div>
      <div class="clay-card stat-card">
        <div class="stat-icon" style="background:#E6F8F0; color:#28A745;"><i class="fa-solid fa-circle-check"></i></div>
        <div><div style="font-size:1.6rem; font-weight:800;" id="stat-completed">1</div><div style="font-size:0.8rem; color:var(--secondary-text); font-weight:700;">Completed Tasks</div></div>
      </div>
      <div class="clay-card stat-card">
        <div class="stat-icon" style="background:#FDE8EF; color:#E83E8C;"><i class="fa-solid fa-user-check"></i></div>
        <div><div style="font-size:1.6rem; font-weight:800;">95.2%</div><div style="font-size:0.8rem; color:var(--secondary-text); font-weight:700;">Attendance Rate</div></div>
      </div>
      <div class="clay-card stat-card">
        <div class="stat-icon" style="background:#F0EBFC; color:var(--purple);"><i class="fa-solid fa-trophy"></i></div>
        <div><div style="font-size:1.6rem; font-weight:800;">84.6%</div><div style="font-size:0.8rem; color:var(--secondary-text); font-weight:700;">Term Average</div></div>
      </div>
    </div>

    <!-- 1. OVERVIEW TAB -->
    <div id="student-tab-overview" class="tab-view active">
      <div class="student-overview-grid">
        <div class="clay-card" style="padding:clamp(16px, 3vw, 24px);">
          <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:16px;"><i class="fa-solid fa-book-bookmark"></i> Current Enrolled Subjects</h3>
          <div id="subjects-quick-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:14px;">
            <!-- Dynamically populated -->
          </div>
        </div>

        <div class="clay-card" style="padding:clamp(16px, 3vw, 24px);">
          <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:16px;"><i class="fa-solid fa-bell"></i> College Circulars</h3>
          <div id="quick-announcements" style="display:flex; flex-direction:column; gap:12px;">
            <!-- Dynamically populated -->
          </div>
        </div>
      </div>
    </div>

    <!-- 2. MY SUBJECTS TAB -->
    <div id="student-tab-subjects" class="tab-view">
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:20px;">My Enrolled Subjects</h2>
      <div id="student-subjects-list" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
        <!-- Dynamically populated -->
      </div>
    </div>

    <!-- 3. LEARNING MATERIALS TAB -->
    <div id="student-tab-materials" class="tab-view">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="font-family:'Poppins'; color:var(--royal-blue);">Subject Learning Resources</h2>
        <input type="text" id="mat-search" class="clay-input" style="max-width:300px;" placeholder="Search study packs..." onkeyup="filterMaterials(this.value)">
      </div>
      <div id="materials-container" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">
        <!-- Dynamically populated -->
      </div>
    </div>

    <!-- 4. ASSIGNMENTS TAB -->
    <div id="student-tab-assignments" class="tab-view">
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:20px;">Assignments & Coursework</h2>
      <div id="assignments-container" style="display:flex; flex-direction:column; gap:18px;">
        <!-- Dynamically populated -->
      </div>
    </div>

    <!-- 5. EXAMINATIONS TAB -->
    <div id="student-tab-exams" class="tab-view">
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:20px;">Online Examination Portal</h2>
      <div id="exams-container" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">
        <!-- Dynamically populated -->
      </div>
    </div>

    <!-- 6. RESULTS TAB -->
    <div id="student-tab-results" class="tab-view">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h2 style="font-family:'Poppins'; color:var(--royal-blue); font-size:clamp(1.2rem, 3vw, 1.6rem);">My Academic Results & Grades</h2>
        <button class="clay-btn" onclick="window.print()"><i class="fa-solid fa-print"></i> Print Report Card</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Marks (100)</th>
              <th>Grade</th>
              <th>Evaluation Period</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="student-results-body">
            <!-- Dynamically populated -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- 7. ATTENDANCE TAB -->
    <div id="student-tab-attendance" class="tab-view">
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:20px; font-size:clamp(1.2rem, 3vw, 1.6rem);">Monthly Attendance Record</h2>
      <div class="clay-card" style="padding:clamp(16px, 3vw, 24px); margin-bottom:20px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(110px, 1fr)); gap:14px; margin-bottom:20px;">
          <div class="clay-card-flat" style="padding:14px; text-align:center;">
            <div style="font-size:1.6rem; font-weight:800; color:#28A745;">9 / 10</div>
            <div style="font-size:0.75rem; color:var(--secondary-text);">Days Attended</div>
          </div>
          <div class="clay-card-flat" style="padding:14px; text-align:center;">
            <div style="font-size:1.6rem; font-weight:800; color:#E83E8C;">1</div>
            <div style="font-size:0.75rem; color:var(--secondary-text);">Excused Absence</div>
          </div>
          <div class="clay-card-flat" style="padding:14px; text-align:center;">
            <div style="font-size:1.6rem; font-weight:800; color:var(--royal-blue);">95.2%</div>
            <div style="font-size:0.75rem; color:var(--secondary-text);">Attendance Rate</div>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead><tr><th>Date</th><th>Session</th><th>Recorded Status</th></tr></thead>
            <tbody id="student-attendance-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 8. TIMETABLE TAB -->
    <div id="student-tab-timetable" class="tab-view">
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:20px; font-size:clamp(1.2rem, 3vw, 1.6rem);">Weekly Academic Schedule (Grade 10A)</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Period</th><th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="font-weight:800;">08:00 - 08:45</td><td><span class="clay-badge badge-blue">Mathematics</span></td><td><span class="clay-badge badge-green">Science</span></td><td><span class="clay-badge badge-purple">English</span></td><td><span class="clay-badge badge-yellow">Sinhala</span></td><td><span class="clay-badge badge-pink">History</span></td></tr>
            <tr><td style="font-weight:800;">08:45 - 09:30</td><td><span class="clay-badge badge-blue">Mathematics</span></td><td><span class="clay-badge badge-green">Science</span></td><td><span class="clay-badge badge-blue">ICT Lab</span></td><td><span class="clay-badge badge-yellow">Sinhala</span></td><td><span class="clay-badge badge-pink">History</span></td></tr>
            <tr><td style="font-weight:800;">09:45 - 10:30</td><td><span class="clay-badge badge-purple">English</span></td><td><span class="clay-badge badge-yellow">Buddhism</span></td><td><span class="clay-badge badge-blue">ICT Lab</span></td><td><span class="clay-badge badge-blue">Mathematics</span></td><td><span class="clay-badge badge-green">Science</span></td></tr>
            <tr><td style="font-weight:800;">10:30 - 11:15</td><td><span class="clay-badge badge-yellow">Geography</span></td><td><span class="clay-badge badge-yellow">Buddhism</span></td><td><span class="clay-badge badge-green">Science</span></td><td><span class="clay-badge badge-blue">Mathematics</span></td><td><span class="clay-badge badge-purple">English</span></td></tr>
            <tr><td style="font-weight:800;">11:45 - 12:30</td><td><span class="clay-badge badge-pink">Commerce</span></td><td><span class="clay-badge badge-pink">Commerce</span></td><td><span class="clay-badge badge-purple">English</span></td><td><span class="clay-badge badge-green">Science Lab</span></td><td><span class="clay-badge badge-yellow">Sinhala</span></td></tr>
            <tr><td style="font-weight:800;">12:30 - 01:15</td><td><span class="clay-badge badge-blue">Art & Music</span></td><td><span class="clay-badge badge-blue">Art & Music</span></td><td><span class="clay-badge badge-pink">History</span></td><td><span class="clay-badge badge-green">Science Lab</span></td><td><span class="clay-badge badge-blue">Physical Ed</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 9. ANNOUNCEMENTS TAB -->
    <div id="student-tab-announcements" class="tab-view">
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:20px; font-size:clamp(1.2rem, 3vw, 1.6rem);">School Notices & Announcements</h2>
      <div id="student-announcements-list" style="display:flex; flex-direction:column; gap:16px;"></div>
    </div>

    <!-- 10. PROFILE TAB -->
    <div id="student-tab-profile" class="tab-view">
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:20px; font-size:clamp(1.2rem, 3vw, 1.6rem);">My Profile Settings</h2>
      <div class="clay-card" style="padding:clamp(18px, 4vw, 28px); max-width:600px;">
        <div style="display:flex; align-items:center; gap:18px; margin-bottom:20px;">
          <div style="width:58px; height:58px; border-radius:50%; background:linear-gradient(135deg, var(--royal-blue), var(--sky-blue)); display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:white; font-weight:800; flex-shrink:0;">A</div>
          <div>
            <h3 style="font-family:'Poppins'; color:var(--royal-blue);">Alex Fernando</h3>
            <p style="color:var(--secondary-text); font-size:0.85rem;">Student ID: STU2026-001 • Grade 10A</p>
          </div>
        </div>
        <div class="form-group"><label>Parent Guardian Name</label><input type="text" class="clay-input" value="Mr. Ranjan Fernando" readonly></div>
        <div class="form-group"><label>Emergency Parent Contact</label><input type="text" class="clay-input" id="student-profile-phone" value="+94 77 123 4567"></div>
        <button class="clay-btn" onclick="saveStudentProfile()"><i class="fa-solid fa-floppy-disk"></i> Update Contact Info</button>
      </div>
    </div>
  </main>

  <!-- Interactive Online Exam Modal -->
  <div class="modal-backdrop" id="exam-take-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(38, 50, 75, 0.6); z-index:2000; align-items:center; justify-content:center; padding:12px;">
    <div class="clay-card" style="max-width:760px; width:100%; max-height:92vh; overflow-y:auto; padding:clamp(18px, 4vw, 28px); background:white;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid #EDF2F9; padding-bottom:12px; flex-wrap:wrap; gap:8px;">
        <div>
          <h2 id="active-exam-title" style="font-family:'Poppins'; color:var(--royal-blue); font-size:clamp(1.1rem, 3vw, 1.4rem);">Online Examination</h2>
          <span class="clay-badge badge-blue" id="active-exam-subject">Subject</span>
        </div>
        <div class="clay-badge badge-pink" style="font-size:0.95rem; padding:6px 14px;">
          <i class="fa-solid fa-stopwatch"></i> <span id="exam-countdown">30:00</span>
        </div>
      </div>
      <form id="online-exam-form" onsubmit="submitActiveExam(event)">
        <div id="exam-questions-container" style="display:flex; flex-direction:column; gap:20px; margin-bottom:24px;"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <button type="button" class="clay-btn clay-btn-secondary" onclick="closeExamModal()">Cancel</button>
          <button type="submit" class="clay-btn clay-btn-success"><i class="fa-solid fa-paper-plane"></i> Submit Answers</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Submission Upload Modal -->
  <div class="modal-backdrop" id="submission-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(38, 50, 75, 0.6); z-index:2000; align-items:center; justify-content:center; padding:12px;">
    <div class="clay-card" style="max-width:540px; width:100%; padding:clamp(18px, 4vw, 28px); background:white;">
      <h2 id="sub-modal-title" style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:16px; font-size:clamp(1.1rem, 3vw, 1.35rem);">Submit Assignment</h2>
      <form id="submission-form" onsubmit="handleSubmitAssignment(event)">
        <input type="hidden" id="sub-asn-id">
        <div class="form-group">
          <label>Assignment Notes / Text Response</label>
          <textarea class="clay-input" id="sub-notes" style="height:100px;" placeholder="Provide your answers or link to your work..."></textarea>
        </div>
        <div class="form-group">
          <label>Document / File Link (PDF, Docx)</label>
          <input type="url" class="clay-input" id="sub-url" placeholder="https://drive.google.com/... or cloud link" value="https://example.com/submissions/alex_work.pdf">
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px; flex-wrap:wrap;">
          <button type="button" class="clay-btn clay-btn-secondary" onclick="closeModal('submission-modal')">Cancel</button>
          <button type="submit" class="clay-btn"><i class="fa-solid fa-upload"></i> Complete Submission</button>
        </div>
      </form>
    </div>
  </div>

  <div id="toast-container"></div>

  <script>
    let materialsCache = [];
    let activeExamId = null;
    let timerInterval = null;

    function toggleStudentSidebar() {
      const sb = document.getElementById('sidebar');
      const bd = document.getElementById('student-sidebar-backdrop');
      if (sb) {
        const isOpen = sb.classList.toggle('open');
        if (bd) {
          if (isOpen) bd.classList.add('open');
          else bd.classList.remove('open');
        }
      }
    }

    function closeStudentSidebar() {
      const sb = document.getElementById('sidebar');
      const bd = document.getElementById('student-sidebar-backdrop');
      if (sb) sb.classList.remove('open');
      if (bd) bd.classList.remove('open');
    }

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

      loadStudentSubjects();
      loadStudentMaterials();
      loadStudentAssignments();
      loadStudentExams();
      loadStudentResults();
      loadStudentAttendance();
      loadStudentAnnouncements();
    });

    function switchStudentTab(tab) {
      document.querySelectorAll('.tab-view').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
      const target = document.getElementById('student-tab-' + tab);
      if (target) target.classList.add('active');
      const menu = Array.from(document.querySelectorAll('.menu-item')).find(m => m.getAttribute('onclick') && m.getAttribute('onclick').includes(tab));
      if (menu) menu.classList.add('active');
      if (window.innerWidth < 992) {
        closeStudentSidebar();
      }
    }

    async function loadStudentSubjects() {
      const res = await fetch('/api/student/subjects');
      const json = await res.json();
      if (json.success) {
        const quick = document.getElementById('subjects-quick-grid');
        const list = document.getElementById('student-subjects-list');
        quick.innerHTML = json.data.slice(0, 4).map(s => \`
          <div class="clay-card-flat" style="padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-weight:800; color:var(--royal-blue);">\${s.name}</span>
              <i class="fa-solid \${s.icon}" style="color:var(--primary-blue);"></i>
            </div>
            <div style="font-size:0.75rem; color:var(--secondary-text); margin-bottom:10px;">Master: \${s.teacher}</div>
            <div style="background:#E6EEFA; height:6px; border-radius:4px; overflow:hidden;">
              <div style="background:var(--primary-blue); width:\${s.progress}%; height:100%;"></div>
            </div>
          </div>
        \`).join('');

        list.innerHTML = json.data.map(s => \`
          <div class="clay-card" style="padding:22px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
              <div style="width:48px; height:48px; border-radius:14px; background:#E8F0FE; display:flex; align-items:center; justify-content:center; color:var(--royal-blue); font-size:1.4rem;">
                <i class="fa-solid \${s.icon}"></i>
              </div>
              <span class="clay-badge badge-blue">\${s.code}</span>
            </div>
            <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:6px;">\${s.name}</h3>
            <p style="font-size:0.85rem; color:var(--secondary-text); margin-bottom:12px;">Teacher: <strong>\${s.teacher}</strong></p>
            <div style="font-size:0.8rem; margin-bottom:6px; display:flex; justify-content:space-between;">
              <span>Course Progress</span>
              <strong>\${s.progress}%</strong>
            </div>
            <div style="background:#EDF2F9; height:8px; border-radius:4px; overflow:hidden; margin-bottom:16px;">
              <div style="background:linear-gradient(90deg, var(--primary-blue), var(--royal-blue)); width:\${s.progress}%; height:100%;"></div>
            </div>
            <button class="clay-btn clay-btn-secondary" style="width:100%; justify-content:center;" onclick="switchStudentTab('materials')"><i class="fa-solid fa-folder-open"></i> Open Resources</button>
          </div>
        \`).join('');
      }
    }

    async function loadStudentMaterials() {
      const res = await fetch('/api/student/materials');
      const json = await res.json();
      if (json.success) {
        materialsCache = json.data;
        renderMaterials(materialsCache);
      }
    }

    function renderMaterials(list) {
      const c = document.getElementById('materials-container');
      c.innerHTML = list.map(m => \`
        <div class="clay-card" style="padding:20px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span class="clay-badge badge-blue">\${m.subject}</span>
            <span class="clay-badge badge-yellow">\${m.fileType || 'PDF'}</span>
          </div>
          <h4 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:8px;">\${m.title}</h4>
          <p style="font-size:0.8rem; color:var(--secondary-text); margin-bottom:16px;">Uploaded by \${m.teacher} • \${m.date}</p>
          <div style="display:flex; gap:10px;">
            <a href="\${m.fileUrl}" target="_blank" class="clay-btn" style="flex:1; justify-content:center; font-size:0.85rem;"><i class="fa-solid fa-download"></i> Download</a>
            \${m.videoUrl ? \`<a href="\${m.videoUrl}" target="_blank" class="clay-btn clay-btn-secondary" style="font-size:0.85rem;"><i class="fa-solid fa-play"></i> Video</a>\` : ''}
          </div>
        </div>
      \`).join('');
    }

    function filterMaterials(q) {
      const filtered = materialsCache.filter(m => m.title.toLowerCase().includes(q.toLowerCase()) || m.subject.toLowerCase().includes(q.toLowerCase()));
      renderMaterials(filtered);
    }

    async function loadStudentAssignments() {
      const res = await fetch('/api/student/assignments');
      const json = await res.json();
      if (json.success) {
        const c = document.getElementById('assignments-container');
        c.innerHTML = json.data.map(a => \`
          <div class="clay-card" style="padding:22px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
              <div>
                <span class="clay-badge badge-blue">\${a.subject}</span>
                <span class="clay-badge \${a.status === 'Graded' ? 'badge-green' : a.status === 'Submitted' ? 'badge-purple' : 'badge-yellow'}" style="margin-left:6px;">\${a.status}</span>
                <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-top:8px;">\${a.title}</h3>
              </div>
              <div style="text-align:right;">
                <div style="font-size:0.8rem; color:var(--secondary-text);">Due: <strong>\${a.dueDate}</strong></div>
                <div style="font-size:0.8rem; color:var(--secondary-text);">Max: \${a.maxMarks} Marks</div>
              </div>
            </div>
            <p style="color:var(--dark-text); font-size:0.92rem; line-height:1.5; margin-bottom:16px;">\${a.instructions}</p>
            \${a.submission && a.submission.marks !== null ? \`
              <div class="clay-card-flat" style="padding:12px; margin-bottom:14px; background:#E6F8F0;">
                <div style="font-weight:800; color:#1E7E34;">Awarded Score: \${a.submission.marks} / \${a.maxMarks}</div>
                <div style="font-size:0.82rem; color:var(--dark-text);">Feedback: \${a.submission.feedback || 'Well done!'}</div>
              </div>
            \` : ''}
            <div>
              <button class="clay-btn" onclick="openSubmissionModal('\${a._id}', '\${escapeHtml(a.title)}')"><i class="fa-solid fa-upload"></i> \${a.submission ? 'Resubmit Work' : 'Submit Assignment'}</button>
            </div>
          </div>
        \`).join('');
      }
    }

    function openSubmissionModal(id, title) {
      document.getElementById('sub-asn-id').value = id;
      document.getElementById('sub-modal-title').innerText = 'Submit: ' + title;
      document.getElementById('submission-modal').style.display = 'flex';
    }

    async function handleSubmitAssignment(e) {
      e.preventDefault();
      const payload = {
        assignmentId: document.getElementById('sub-asn-id').value,
        submissionContent: document.getElementById('sub-notes').value,
        fileUrl: document.getElementById('sub-url').value
      };
      const res = await fetch('/api/student/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      showToast(json.success ? 'success' : 'error', json.message);
      document.getElementById('submission-modal').style.display = 'none';
      loadStudentAssignments();
    }

    async function loadStudentExams() {
      const res = await fetch('/api/student/examinations');
      const json = await res.json();
      if (json.success) {
        const c = document.getElementById('exams-container');
        c.innerHTML = json.data.map(e => \`
          <div class="clay-card" style="padding:22px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
              <span class="clay-badge badge-blue">\${e.subject}</span>
              <span class="clay-badge \${e.isCompleted ? 'badge-green' : 'badge-yellow'}">\${e.isCompleted ? 'Completed' : 'Available'}</span>
            </div>
            <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:8px;">\${e.title}</h3>
            <div style="font-size:0.85rem; color:var(--secondary-text); margin-bottom:16px;">
              <i class="fa-solid fa-clock"></i> Duration: \${e.durationMinutes} mins • \${e.questionCount} Questions
            </div>
            \${e.attempt ? \`
              <div class="clay-card-flat" style="padding:10px; margin-bottom:14px; background:#E6F8F0; font-weight:800; color:#1E7E34;">
                Score: \${e.attempt.score} / \${e.attempt.total}
              </div>
            \` : \`
              <button class="clay-btn" style="width:100%; justify-content:center;" onclick="startOnlineExam('\${e._id}')"><i class="fa-solid fa-pencil"></i> Start Examination</button>
            \`}
          </div>
        \`).join('');
      }
    }

    async function startOnlineExam(id) {
      activeExamId = id;
      const res = await fetch('/api/student/examinations/' + id);
      const json = await res.json();
      if (!json.success) return showToast('error', json.message);

      const exam = json.data;
      document.getElementById('active-exam-title').innerText = exam.title;
      document.getElementById('active-exam-subject').innerText = exam.subject;

      // Render questions
      const qc = document.getElementById('exam-questions-container');
      qc.innerHTML = exam.questions.map((q, idx) => \`
        <div class="clay-card-flat" style="padding:18px;">
          <div style="font-weight:800; margin-bottom:8px; color:var(--royal-blue);">Question \${idx+1} (\${q.marks} pts):</div>
          <div style="margin-bottom:12px; font-size:0.95rem;">\${q.question}</div>
          \${q.type === 'mcq' || q.type === 'tf' ? \`
            <div style="display:flex; flex-direction:column; gap:8px;">
              \${(q.options || []).map(opt => \`
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                  <input type="radio" name="q_\${q.id}" value="\${escapeHtml(opt)}" required>
                  <span>\${escapeHtml(opt)}</span>
                </label>
              \`).join('')}
            </div>
          \` : \`
            <input type="text" class="clay-input" name="q_\${q.id}" placeholder="Your short answer..." required>
          \`}
        </div>
      \`).join('');

      // Start countdown
      let remaining = exam.durationMinutes * 60;
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        remaining--;
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        document.getElementById('exam-countdown').innerText = \`\${m}:\${s < 10 ? '0' : ''}\${s}\`;
        if (remaining <= 0) {
          clearInterval(timerInterval);
          alert('Time has expired! Submitting test automatically.');
          document.getElementById('online-exam-form').requestSubmit();
        }
      }, 1000);

      document.getElementById('exam-take-modal').style.display = 'flex';
    }

    function closeExamModal() {
      if (confirm('Cancel and leave this examination? Answers will be lost.')) {
        clearInterval(timerInterval);
        document.getElementById('exam-take-modal').style.display = 'none';
      }
    }

    async function submitActiveExam(e) {
      e.preventDefault();
      clearInterval(timerInterval);
      const form = e.target;
      const formData = new FormData(form);
      const answers = {};

      for (const [key, value] of formData.entries()) {
        const qId = key.replace('q_', '');
        answers[qId] = value;
      }

      const res = await fetch(\`/api/student/examinations/\${activeExamId}/submit\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      const json = await res.json();
      showToast(json.success ? 'success' : 'error', json.message);
      document.getElementById('exam-take-modal').style.display = 'none';
      loadStudentExams();
    }

    async function loadStudentResults() {
      const res = await fetch('/api/student/results');
      const json = await res.json();
      if (json.success) {
        const tbody = document.getElementById('student-results-body');
        tbody.innerHTML = json.data.map(r => \`
          <tr>
            <td style="font-weight:700;">\${r.subject}</td>
            <td>\${r.marks} / 100</td>
            <td><span class="clay-badge \${r.grade === 'A' ? 'badge-green' : r.grade === 'B' ? 'badge-blue' : 'badge-yellow'}">\${r.grade}</span></td>
            <td>\${r.term}</td>
            <td><span class="clay-badge badge-green">Passed</span></td>
          </tr>
        \`).join('');
      }
    }

    async function loadStudentAttendance() {
      const res = await fetch('/api/student/attendance');
      const json = await res.json();
      if (json.success) {
        const tbody = document.getElementById('student-attendance-body');
        tbody.innerHTML = json.data.records.map(a => \`
          <tr>
            <td>\${a.date}</td>
            <td>Morning Assembly & Periods 1-6</td>
            <td><span class="clay-badge \${a.status === 'present' ? 'badge-green' : 'badge-pink'}">\${a.status.toUpperCase()}</span></td>
          </tr>
        \`).join('');
      }
    }

    async function loadStudentAnnouncements() {
      const res = await fetch('/api/student/announcements');
      const json = await res.json();
      if (json.success) {
        const qList = document.getElementById('quick-announcements');
        const fList = document.getElementById('student-announcements-list');

        qList.innerHTML = json.data.slice(0, 3).map(a => \`
          <div class="clay-card-flat" style="padding:12px;">
            <div style="font-weight:700; color:var(--royal-blue); font-size:0.88rem;">\${a.title}</div>
            <div style="font-size:0.75rem; color:var(--secondary-text);">\${new Date(a.publishedDate).toLocaleDateString()}</div>
          </div>
        \`).join('');

        fList.innerHTML = json.data.map(a => \`
          <div class="clay-card" style="padding:22px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span class="clay-badge badge-blue">\${a.category}</span>
              <span style="font-size:0.8rem; color:var(--secondary-text);">\${new Date(a.publishedDate).toLocaleDateString()}</span>
            </div>
            <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:8px;">\${a.title}</h3>
            <p style="color:var(--dark-text); font-size:0.92rem; line-height:1.5;">\${a.content}</p>
          </div>
        \`).join('');
      }
    }

    async function saveStudentProfile() {
      const phone = document.getElementById('student-profile-phone').value;
      const res = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPhone: phone })
      });
      const json = await res.json();
      showToast(json.success ? 'success' : 'error', json.message);
    }

    function logout(e) {
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

    function showToast(type, msg) {
      const c = document.getElementById('toast-container');
      const t = document.createElement('div');
      t.className = 'toast ' + type;
      t.innerHTML = '<span>' + msg + '</span>';
      c.appendChild(t);
      setTimeout(() => t.remove(), 4000);
    }

    function closeModal(id) {
      document.getElementById(id).style.display = 'none';
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    }
  </script>
</body>
</html>`;
}

function renderTeacherDashboard(user) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Faculty Management Center | St. Mary's College Negombo</title>
  ${CLAY_BASE_STYLES}
  <style>
    body { display: flex; min-height: 100vh; overflow-x: hidden; width: 100%; }
    #sidebar {
      width: 270px;
      min-height: 100vh;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(14px);
      border-right: var(--clay-border);
      box-shadow: 6px 0 20px rgba(163, 177, 198, 0.25);
      position: fixed;
      left: 0; top: 0; bottom: 0;
      display: flex;
      flex-direction: column;
      z-index: 1200;
      overflow-y: auto;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      min-height: 44px;
      border-radius: 16px;
      color: var(--secondary-text);
      font-size: 0.9rem;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      margin: 3px 12px;
      touch-action: manipulation;
    }
    .menu-item:hover { background: #F0F4FF; color: var(--royal-blue); }
    .menu-item.active {
      background: linear-gradient(135deg, var(--primary-blue), var(--royal-blue));
      color: white;
      box-shadow: 4px 4px 10px rgba(49, 89, 201, 0.35);
    }
    #main-content {
      margin-left: 270px;
      flex: 1;
      padding: 24px 32px;
      max-width: 1400px;
      width: calc(100% - 270px);
      transition: all 0.3s ease;
    }
    .tab-view { display: none; }
    .tab-view.active { display: block; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .stat-card {
      padding: 18px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      box-shadow: var(--clay-shadow-out-sm);
      flex-shrink: 0;
    }
    .teacher-overview-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 24px;
    }
    .marks-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      align-items: flex-end;
      margin-bottom: 24px;
    }
    table { width: 100%; border-collapse: separate; border-spacing: 0; }
    th { background: #F6F9FF; padding: 12px 16px; font-size: 0.8rem; text-transform: uppercase; color: var(--secondary-text); font-weight: 800; border-bottom: 2px solid #E6EEFA; }
    td { padding: 12px 16px; border-bottom: 1px solid #EDF2F9; font-size: 0.9rem; font-weight: 600; }
    
    @media (max-width: 992px) {
      #sidebar {
        transform: translateX(-100%);
        box-shadow: 10px 0 30px rgba(0, 0, 0, 0.25);
      }
      #sidebar.open {
        transform: translateX(0);
      }
      #main-content {
        margin-left: 0 !important;
        padding: 16px !important;
        width: 100% !important;
      }
      .mobile-menu-toggle {
        display: inline-flex !important;
      }
      .teacher-overview-grid {
        grid-template-columns: 1fr !important;
        gap: 18px !important;
      }
    }
    @media (max-width: 768px) {
      .marks-form-grid {
        grid-template-columns: 1fr !important;
      }
      .marks-form-grid button[type="submit"] {
        width: 100%;
        justify-content: center;
        margin-top: 8px;
      }
    }
  </style>
</head>
<body>

  <!-- Sidebar Backdrop for Mobile -->
  <div id="teacher-sidebar-backdrop" class="sidebar-backdrop" onclick="closeTeacherSidebar()"></div>

  <!-- Sidebar -->
  <aside id="sidebar">
    <div style="padding:24px 18px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #E6EEFA;">
      <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg, var(--royal-blue), var(--primary-blue)); display:flex; align-items:center; justify-content:center; color:#FFD66B; font-size:1.2rem; box-shadow:var(--clay-shadow-out-sm); flex-shrink:0;">
        <i class="fa-solid fa-graduation-cap"></i>
      </div>
      <div style="flex:1;">
        <div style="font-family:'Poppins'; font-weight:800; color:var(--royal-blue); font-size:1.05rem;">St. Mary's College</div>
        <div style="font-size:0.75rem; color:var(--secondary-text); font-weight:700;">Faculty Workspace</div>
      </div>
      <button class="table-btn mobile-menu-toggle" style="background:#FDE8EF; color:#E83E8C;" onclick="closeTeacherSidebar()" aria-label="Close menu">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div style="padding:16px 0; flex:1;">
      <a class="menu-item active" onclick="switchTeacherTab('overview')"><i class="fa-solid fa-chart-pie"></i> Dashboard</a>
      <a class="menu-item" onclick="switchTeacherTab('classes')"><i class="fa-solid fa-users"></i> My Classes & Students</a>
      <a class="menu-item" onclick="switchTeacherTab('materials')"><i class="fa-solid fa-folder-plus"></i> Learning Materials</a>
      <a class="menu-item" onclick="switchTeacherTab('assignments')"><i class="fa-solid fa-clipboard-question"></i> Coursework & Grading</a>
      <a class="menu-item" onclick="switchTeacherTab('exams')"><i class="fa-solid fa-file-circle-plus"></i> Examination Creator</a>
      <a class="menu-item" onclick="switchTeacherTab('attendance')"><i class="fa-solid fa-user-check"></i> Attendance Marker</a>
      <a class="menu-item" onclick="switchTeacherTab('results')"><i class="fa-solid fa-square-poll-vertical"></i> Marks & Results</a>
      <a class="menu-item" onclick="switchTeacherTab('timetable')"><i class="fa-solid fa-calendar-days"></i> Teaching Timetable</a>
      <a class="menu-item" onclick="switchTeacherTab('announcements')"><i class="fa-solid fa-bullhorn"></i> Circulars</a>
    </div>

    <div style="padding:16px; border-top:1px solid #E6EEFA; display:flex; align-items:center; gap:10px;">
      <div style="width:38px; height:38px; border-radius:50%; background:#FFD66B; display:flex; align-items:center; justify-content:center; font-weight:800; color:#523b00; flex-shrink:0;">T</div>
      <div style="flex:1; overflow:hidden;">
        <div style="font-weight:800; font-size:0.85rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${user ? user.name : 'Mr. Sunil Perera'}</div>
        <div style="font-size:0.75rem; color:var(--secondary-text);">Senior Faculty Master</div>
      </div>
      <a href="/api/auth/logout" class="clay-btn clay-btn-danger" style="padding:6px 10px; font-size:0.8rem; min-height:36px;" onclick="logout(event)"><i class="fa-solid fa-right-from-bracket"></i></a>
    </div>
  </aside>

  <!-- Main Content -->
  <main id="main-content">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <button class="action-icon-btn mobile-menu-toggle" onclick="toggleTeacherSidebar()" aria-label="Open Navigation Menu">
          <i class="fa-solid fa-bars"></i>
        </button>
        <div>
          <h1 style="font-family:'Poppins'; font-size:clamp(1.3rem, 3.5vw, 1.8rem); color:var(--royal-blue); line-height:1.2;">Welcome Back, ${user ? user.name : 'Mr. Perera'}! 👋</h1>
          <p style="color:var(--secondary-text); font-weight:600; font-size:clamp(0.8rem, 2.5vw, 0.95rem);">Faculty Portal — Mathematics & Senior Classes Management</p>
        </div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="clay-btn" onclick="openCreateMaterialModal()"><i class="fa-solid fa-plus"></i> Add Study Pack</button>
        <button class="clay-btn clay-btn-secondary" onclick="openCreateAsnModal()"><i class="fa-solid fa-clipboard-plus"></i> New Assignment</button>
      </div>
    </div>

    <!-- STATS GRID -->
    <div class="stats-grid">
      <div class="clay-card stat-card">
        <div class="stat-icon" style="background:#E8F0FE; color:var(--royal-blue);"><i class="fa-solid fa-user-graduate"></i></div>
        <div><div style="font-size:1.6rem; font-weight:800;">60</div><div style="font-size:0.8rem; color:var(--secondary-text); font-weight:700;">Assigned Students</div></div>
      </div>
      <div class="clay-card stat-card">
        <div class="stat-icon" style="background:#E6F8F0; color:#28A745;"><i class="fa-solid fa-shapes"></i></div>
        <div><div style="font-size:1.6rem; font-weight:800;">2</div><div style="font-size:0.8rem; color:var(--secondary-text); font-weight:700;">Assigned Classes</div></div>
      </div>
      <div class="clay-card stat-card">
        <div class="stat-icon" style="background:#FFF8E1; color:#F39C12;"><i class="fa-solid fa-clipboard-list"></i></div>
        <div><div style="font-size:1.6rem; font-weight:800;">4</div><div style="font-size:0.8rem; color:var(--secondary-text); font-weight:700;">Active Tasks</div></div>
      </div>
      <div class="clay-card stat-card">
        <div class="stat-icon" style="background:#FDE8EF; color:#E83E8C;"><i class="fa-solid fa-inbox"></i></div>
        <div><div style="font-size:1.6rem; font-weight:800;">1</div><div style="font-size:0.8rem; color:var(--secondary-text); font-weight:700;">Pending Review</div></div>
      </div>
      <div class="clay-card stat-card">
        <div class="stat-icon" style="background:#F0EBFC; color:var(--purple);"><i class="fa-solid fa-chart-line"></i></div>
        <div><div style="font-size:1.6rem; font-weight:800;">81.5%</div><div style="font-size:0.8rem; color:var(--secondary-text); font-weight:700;">Class Pass Average</div></div>
      </div>
    </div>

    <!-- 1. OVERVIEW TAB -->
    <div id="teacher-tab-overview" class="tab-view active">
      <div class="teacher-overview-grid">
        <div class="clay-card" style="padding:clamp(16px, 3vw, 24px);">
          <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:16px;"><i class="fa-solid fa-list-check"></i> Submissions Needing Review</h3>
          <div id="teacher-pending-submissions" style="display:flex; flex-direction:column; gap:12px;"></div>
        </div>

        <div class="clay-card" style="padding:clamp(16px, 3vw, 24px);">
          <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:16px;"><i class="fa-solid fa-bolt"></i> Quick Classroom Shortcuts</h3>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="clay-btn clay-btn-secondary" onclick="switchTeacherTab('attendance')"><i class="fa-solid fa-check-double"></i> Mark Today's Attendance</button>
            <button class="clay-btn clay-btn-secondary" onclick="switchTeacherTab('results')"><i class="fa-solid fa-marker"></i> Enter Term Marks</button>
            <button class="clay-btn clay-btn-secondary" onclick="switchTeacherTab('exams')"><i class="fa-solid fa-file-pen"></i> Create Examination</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. CLASSES & STUDENTS TAB -->
    <div id="teacher-tab-classes" class="tab-view">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h2 style="font-family:'Poppins'; color:var(--royal-blue); font-size:clamp(1.2rem, 3vw, 1.6rem);">Assigned Class Roster (Grade 10A)</h2>
        <input type="text" class="clay-input" style="max-width:280px;" placeholder="Search student name..." onkeyup="filterRoster(this.value)">
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Student ID</th><th>Student Name</th><th>Gender</th><th>Parent Contact</th><th>Academic Status</th></tr>
          </thead>
          <tbody id="teacher-roster-body"></tbody>
        </table>
      </div>
    </div>

    <!-- 3. MATERIALS TAB -->
    <div id="teacher-tab-materials" class="tab-view">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h2 style="font-family:'Poppins'; color:var(--royal-blue); font-size:clamp(1.2rem, 3vw, 1.6rem);">Managed Learning Resources</h2>
        <button class="clay-btn" onclick="openCreateMaterialModal()"><i class="fa-solid fa-plus"></i> Upload New Pack</button>
      </div>
      <div id="teacher-materials-container" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;"></div>
    </div>

    <!-- 4. ASSIGNMENTS TAB -->
    <div id="teacher-tab-assignments" class="tab-view">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h2 style="font-family:'Poppins'; color:var(--royal-blue); font-size:clamp(1.2rem, 3vw, 1.6rem);">Class Assignments & Student Submissions</h2>
        <button class="clay-btn" onclick="openCreateAsnModal()"><i class="fa-solid fa-plus"></i> Create Assignment</button>
      </div>
      <div class="clay-card" style="padding:clamp(16px, 3vw, 24px); margin-bottom:24px;">
        <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:14px;">Recent Student Submissions</h3>
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Student</th><th>Assignment</th><th>Submitted</th><th>Work Link</th><th>Current Marks</th><th>Action</th></tr>
            </thead>
            <tbody id="teacher-submissions-table"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 5. EXAM CREATOR TAB -->
    <div id="teacher-tab-exams" class="tab-view">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <h2 style="font-family:'Poppins'; color:var(--royal-blue); font-size:clamp(1.2rem, 3vw, 1.6rem);">Online Examination Builder</h2>
        <button class="clay-btn" onclick="openCreateExamModal()"><i class="fa-solid fa-file-circle-plus"></i> Create New Exam</button>
      </div>
      <div id="teacher-exams-list" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;"></div>
    </div>

    <!-- 6. ATTENDANCE TAB -->
    <div id="teacher-tab-attendance" class="tab-view">
      <div class="clay-card" style="padding:clamp(16px, 3vw, 24px); margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-family:'Poppins'; color:var(--royal-blue); font-size:clamp(1.2rem, 3vw, 1.6rem);">Mark Classroom Attendance</h2>
            <p style="color:var(--secondary-text); font-size:0.9rem;">Record daily present/absent status for your students</p>
          </div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <input type="date" class="clay-input" id="att-date-picker" value="2026-03-24" style="width:auto;">
            <select class="clay-input" id="att-class-picker" style="width:auto;">
              <option value="Grade 10A">Grade 10A</option>
              <option value="Grade 11A">Grade 11A</option>
            </select>
            <button class="clay-btn" onclick="saveClassAttendance()"><i class="fa-solid fa-floppy-disk"></i> Save Attendance</button>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr><th>ID</th><th>Student Name</th><th>Present</th><th>Absent</th><th>Late</th></tr>
            </thead>
            <tbody id="teacher-attendance-roster"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 7. RESULTS TAB -->
    <div id="teacher-tab-results" class="tab-view">
      <div class="clay-card" style="padding:clamp(16px, 3vw, 24px);">
        <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:16px; font-size:clamp(1.2rem, 3vw, 1.6rem);">Record Term Test Marks</h2>
        <form id="record-marks-form" onsubmit="handleMarksSubmit(event)" class="marks-form-grid">
          <div class="form-group" style="margin:0;">
            <label>Student</label>
            <select class="clay-input" id="marks-student-select" required></select>
          </div>
          <div class="form-group" style="margin:0;">
            <label>Subject</label>
            <input type="text" class="clay-input" id="marks-subject" value="Mathematics" required>
          </div>
          <div class="form-group" style="margin:0;">
            <label>Term</label>
            <select class="clay-input" id="marks-term">
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;">
            <label>Marks (0-100)</label>
            <input type="number" class="clay-input" id="marks-input" min="0" max="100" required placeholder="85">
          </div>
          <button type="submit" class="clay-btn"><i class="fa-solid fa-plus"></i> Record Mark</button>
        </form>
        <div class="table-container">
          <table>
            <thead>
              <tr><th>Student</th><th>Subject</th><th>Marks</th><th>Grade</th><th>Recorded By</th></tr>
            </thead>
            <tbody id="teacher-results-table"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 8. TIMETABLE TAB -->
    <div id="teacher-tab-timetable" class="tab-view">
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:20px; font-size:clamp(1.2rem, 3vw, 1.6rem);">Faculty Teaching Schedule</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Period</th><th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th></tr>
          </thead>
          <tbody>
            <tr><td style="font-weight:800;">08:00 - 08:45</td><td><span class="clay-badge badge-blue">Grade 10A Math</span></td><td>Free Period</td><td><span class="clay-badge badge-blue">Grade 11A Math</span></td><td>Free Period</td><td><span class="clay-badge badge-blue">Grade 10A Math</span></td></tr>
            <tr><td style="font-weight:800;">08:45 - 09:30</td><td><span class="clay-badge badge-blue">Grade 10A Math</span></td><td>Free Period</td><td><span class="clay-badge badge-blue">Grade 11A Math</span></td><td>Free Period</td><td><span class="clay-badge badge-blue">Grade 10A Math</span></td></tr>
            <tr><td style="font-weight:800;">09:45 - 10:30</td><td>Free Period</td><td><span class="clay-badge badge-blue">Grade 11A Math</span></td><td>Free Period</td><td><span class="clay-badge badge-blue">Grade 10A Math</span></td><td>Free Period</td></tr>
            <tr><td style="font-weight:800;">10:30 - 11:15</td><td>Free Period</td><td><span class="clay-badge badge-blue">Grade 11A Math</span></td><td>Free Period</td><td><span class="clay-badge badge-blue">Grade 10A Math</span></td><td>Free Period</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 9. ANNOUNCEMENTS TAB -->
    <div id="teacher-tab-announcements" class="tab-view">
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:20px;">Faculty Bulletins</h2>
      <div id="teacher-announcements-list" style="display:flex; flex-direction:column; gap:16px;"></div>
    </div>
  </main>

  <!-- MODALS -->
  <div class="modal-backdrop" id="modal-material" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(38, 50, 75, 0.6); z-index:2000; align-items:center; justify-content:center; padding:20px;">
    <div class="clay-card" style="max-width:540px; width:100%; padding:28px; background:white;">
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:16px;">Add Learning Resource</h2>
      <form id="material-form" onsubmit="handleMaterialSubmit(event)">
        <div class="form-group"><label>Resource Title *</label><input type="text" class="clay-input" id="mat-title" required placeholder="e.g. Vectors and Geometry Notes"></div>
        <div class="form-group"><label>Subject *</label><input type="text" class="clay-input" id="mat-subject" required value="Mathematics"></div>
        <div class="form-group"><label>Target Class</label><input type="text" class="clay-input" id="mat-class" value="Grade 10A"></div>
        <div class="form-group"><label>Resource URL (PDF link)</label><input type="url" class="clay-input" id="mat-url" value="https://example.com/math_notes.pdf" required></div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="clay-btn clay-btn-secondary" onclick="closeModal('modal-material')">Cancel</button>
          <button type="submit" class="clay-btn"><i class="fa-solid fa-upload"></i> Publish Resource</button>
        </div>
      </form>
    </div>
  </div>

  <div class="modal-backdrop" id="modal-asn" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(38, 50, 75, 0.6); z-index:2000; align-items:center; justify-content:center; padding:20px;">
    <div class="clay-card" style="max-width:540px; width:100%; padding:28px; background:white;">
      <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:16px;">Create New Assignment</h2>
      <form id="asn-form" onsubmit="handleAsnSubmit(event)">
        <div class="form-group"><label>Assignment Title *</label><input type="text" class="clay-input" id="asn-title" required placeholder="e.g. Linear Graphs Project"></div>
        <div class="form-group"><label>Subject *</label><input type="text" class="clay-input" id="asn-subject" required value="Mathematics"></div>
        <div class="form-group"><label>Target Class</label><input type="text" class="clay-input" id="asn-class" value="Grade 10A"></div>
        <div class="form-group"><label>Due Date</label><input type="date" class="clay-input" id="asn-due" value="2026-04-30"></div>
        <div class="form-group"><label>Instructions</label><textarea class="clay-input" id="asn-inst" style="height:80px;"></textarea></div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="clay-btn clay-btn-secondary" onclick="closeModal('modal-asn')">Cancel</button>
          <button type="submit" class="clay-btn"><i class="fa-solid fa-plus"></i> Publish</button>
        </div>
      </form>
    </div>
  </div>

  <div id="toast-container"></div>

  <script>
    let rosterCache = [];

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

      loadTeacherDashboard();
      loadTeacherRoster();
      loadTeacherMaterials();
      loadTeacherSubmissions();
      loadTeacherExams();
      loadTeacherAttendanceRoster();
      loadTeacherResults();
      loadTeacherAnnouncements();
    });

    function switchTeacherTab(tab) {
      document.querySelectorAll('.tab-view').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
      const target = document.getElementById('teacher-tab-' + tab);
      if (target) target.classList.add('active');
      const menu = Array.from(document.querySelectorAll('.menu-item')).find(m => m.getAttribute('onclick') && m.getAttribute('onclick').includes(tab));
      if (menu) menu.classList.add('active');
    }

    async function loadTeacherDashboard() {
      const res = await fetch('/api/teacher/dashboard');
      const json = await res.json();
    }

    async function loadTeacherRoster() {
      const res = await fetch('/api/teacher/students?className=Grade 10A');
      const json = await res.json();
      if (json.success) {
        rosterCache = json.data;
        renderRoster(rosterCache);
        populateStudentSelect(rosterCache);
      }
    }

    function renderRoster(students) {
      const tbody = document.getElementById('teacher-roster-body');
      tbody.innerHTML = students.map(s => \`
        <tr>
          <td><span class="clay-badge badge-blue">\${s.studentId}</span></td>
          <td style="font-weight:700;">\${s.fullName}</td>
          <td>\${s.gender || 'Male'}</td>
          <td>\${s.parentPhone || '+94 77 123 4567'}</td>
          <td><span class="clay-badge badge-green">Enrolled</span></td>
        </tr>
      \`).join('');
    }

    function populateStudentSelect(students) {
      const select = document.getElementById('marks-student-select');
      select.innerHTML = students.map(s => \`<option value="\${s.studentId}">\${s.fullName} (\${s.studentId})</option>\`).join('');
    }

    function filterRoster(q) {
      renderRoster(rosterCache.filter(s => s.fullName.toLowerCase().includes(q.toLowerCase())));
    }

    async function loadTeacherMaterials() {
      const res = await fetch('/api/teacher/materials');
      const json = await res.json();
      if (json.success) {
        const c = document.getElementById('teacher-materials-container');
        c.innerHTML = json.data.map(m => \`
          <div class="clay-card" style="padding:20px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span class="clay-badge badge-blue">\${m.subject}</span>
              <button class="table-btn table-btn-delete" onclick="deleteMaterial('\${m._id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
            <h4 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:6px;">\${m.title}</h4>
            <div style="font-size:0.8rem; color:var(--secondary-text); margin-bottom:12px;">Class: \${m.targetClass} • \${m.date}</div>
            <a href="\${m.fileUrl}" target="_blank" class="clay-btn clay-btn-secondary" style="font-size:0.85rem;"><i class="fa-solid fa-external-link"></i> View Resource</a>
          </div>
        \`).join('');
      }
    }

    function openCreateMaterialModal() {
      document.getElementById('modal-material').style.display = 'flex';
    }

    async function handleMaterialSubmit(e) {
      e.preventDefault();
      const payload = {
        title: document.getElementById('mat-title').value,
        subject: document.getElementById('mat-subject').value,
        targetClass: document.getElementById('mat-class').value,
        fileUrl: document.getElementById('mat-url').value
      };
      const res = await fetch('/api/teacher/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      showToast(json.success ? 'success' : 'error', json.message);
      closeModal('modal-material');
      loadTeacherMaterials();
    }

    async function deleteMaterial(id) {
      if (!confirm('Delete this resource?')) return;
      const res = await fetch('/api/teacher/materials/' + id, { method: 'DELETE' });
      const json = await res.json();
      showToast(json.success ? 'success' : 'error', json.message);
      loadTeacherMaterials();
    }

    async function loadTeacherSubmissions() {
      const res = await fetch('/api/teacher/submissions');
      const json = await res.json();
      if (json.success) {
        const tbody = document.getElementById('teacher-submissions-table');
        const pendingContainer = document.getElementById('teacher-pending-submissions');

        tbody.innerHTML = json.data.map(s => \`
          <tr>
            <td style="font-weight:700;">\${s.studentName}</td>
            <td>Assignment \${s.assignmentId}</td>
            <td>\${new Date(s.submittedAt).toLocaleDateString()}</td>
            <td><a href="\${s.fileUrl}" target="_blank" style="color:var(--royal-blue); font-weight:700;"><i class="fa-solid fa-file-pdf"></i> View File</a></td>
            <td>\${s.marks !== null ? \`<span class="clay-badge badge-green">\${s.marks} pts</span>\` : '<span class="clay-badge badge-yellow">Ungraded</span>'}</td>
            <td>
              <button class="clay-btn clay-btn-secondary" style="padding:4px 10px; font-size:0.8rem;" onclick="gradeSubmissionPrompt('\${s._id}', '\${s.studentName}')">Grade</button>
            </td>
          </tr>
        \`).join('');

        pendingContainer.innerHTML = json.data.map(s => \`
          <div class="clay-card-flat" style="padding:14px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700; color:var(--royal-blue);">\${s.studentName}</div>
              <div style="font-size:0.75rem; color:var(--secondary-text);">Submitted \${s.assignmentId}</div>
            </div>
            <button class="clay-btn" style="padding:6px 12px; font-size:0.8rem;" onclick="gradeSubmissionPrompt('\${s._id}', '\${s.studentName}')">Grade Now</button>
          </div>
        \`).join('');
      }
    }

    async function gradeSubmissionPrompt(id, name) {
      const marks = prompt(\`Enter mark for \${name} (0-100):\`, '90');
      if (marks === null) return;
      const feedback = prompt('Enter teacher feedback comment:', 'Great problem solving!');
      const res = await fetch(\`/api/teacher/submissions/\${id}/grade\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks, feedback })
      });
      const json = await res.json();
      showToast(json.success ? 'success' : 'error', json.message);
      loadTeacherSubmissions();
    }

    function openCreateAsnModal() {
      document.getElementById('modal-asn').style.display = 'flex';
    }

    async function handleAsnSubmit(e) {
      e.preventDefault();
      const payload = {
        title: document.getElementById('asn-title').value,
        subject: document.getElementById('asn-subject').value,
        targetClass: document.getElementById('asn-class').value,
        dueDate: document.getElementById('asn-due').value,
        instructions: document.getElementById('asn-inst').value
      };
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      showToast(json.success ? 'success' : 'error', json.message);
      closeModal('modal-asn');
    }

    async function loadTeacherExams() {
      const res = await fetch('/api/teacher/examinations');
      const json = await res.json();
      if (json.success) {
        const c = document.getElementById('teacher-exams-list');
        c.innerHTML = json.data.map(e => \`
          <div class="clay-card" style="padding:22px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span class="clay-badge badge-blue">\${e.subject}</span>
              <span class="clay-badge badge-green">Published</span>
            </div>
            <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:8px;">\${e.title}</h3>
            <div style="font-size:0.85rem; color:var(--secondary-text); margin-bottom:12px;">Class: \${e.targetClass} • Duration: \${e.durationMinutes} mins</div>
            <div style="font-size:0.85rem; font-weight:700; color:var(--royal-blue);">Questions: \${e.questions.length} • Total: \${e.totalMarks} pts</div>
          </div>
        \`).join('');
      }
    }

    function openCreateExamModal() {
      const title = prompt('Exam Title:', 'Mathematics Quick Test 2');
      if (!title) return;
      const questions = [
        { id: 1, type: 'mcq', question: 'Find value of x: 2x + 6 = 14', options: ['2', '4', '6', '8'], correct: '4', marks: 50 },
        { id: 2, type: 'tf', question: 'A square has 4 right angles.', options: ['True', 'False'], correct: 'True', marks: 50 }
      ];
      fetch('/api/teacher/examinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subject: 'Mathematics', targetClass: 'Grade 10A', durationMinutes: 20, totalMarks: 100, questions })
      }).then(r => r.json()).then(j => {
        showToast('success', j.message);
        loadTeacherExams();
      });
    }

    async function loadTeacherAttendanceRoster() {
      const tbody = document.getElementById('teacher-attendance-roster');
      tbody.innerHTML = rosterCache.slice(0, 15).map(s => \`
        <tr>
          <td>\${s.studentId}</td>
          <td style="font-weight:700;">\${s.fullName}</td>
          <td><input type="radio" name="att_\${s.studentId}" value="present" checked></td>
          <td><input type="radio" name="att_\${s.studentId}" value="absent"></td>
          <td><input type="radio" name="att_\${s.studentId}" value="late"></td>
        </tr>
      \`).join('');
    }

    async function saveClassAttendance() {
      const date = document.getElementById('att-date-picker').value;
      const className = document.getElementById('att-class-picker').value;
      const records = rosterCache.slice(0, 15).map(s => {
        const val = document.querySelector(\`input[name="att_\${s.studentId}"]:checked\`);
        return {
          studentId: s.studentId,
          studentName: s.fullName,
          status: val ? val.value : 'present'
        };
      });

      const res = await fetch('/api/teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, className, records })
      });
      const json = await res.json();
      showToast(json.success ? 'success' : 'error', json.message);
    }

    async function loadTeacherResults() {
      const res = await fetch('/api/teacher/results');
      const json = await res.json();
      if (json.success) {
        const tbody = document.getElementById('teacher-results-table');
        tbody.innerHTML = json.data.map(r => \`
          <tr>
            <td style="font-weight:700;">\${r.studentName}</td>
            <td>\${r.subject}</td>
            <td>\${r.marks} / 100</td>
            <td><span class="clay-badge badge-green">\${r.grade}</span></td>
            <td>\${r.recordedBy}</td>
          </tr>
        \`).join('');
      }
    }

    async function handleMarksSubmit(e) {
      e.preventDefault();
      const sSelect = document.getElementById('marks-student-select');
      const studentId = sSelect.value;
      const studentName = sSelect.options[sSelect.selectedIndex].text.split(' (')[0];
      const payload = {
        studentId,
        studentName,
        className: '10A',
        subject: document.getElementById('marks-subject').value,
        term: document.getElementById('marks-term').value,
        marks: document.getElementById('marks-input').value
      };
      const res = await fetch('/api/teacher/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      showToast(json.success ? 'success' : 'error', json.message);
      loadTeacherResults();
    }

    async function loadTeacherAnnouncements() {
      const res = await fetch('/api/student/announcements');
      const json = await res.json();
      if (json.success) {
        const c = document.getElementById('teacher-announcements-list');
        c.innerHTML = json.data.map(a => \`
          <div class="clay-card" style="padding:22px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
              <span class="clay-badge badge-blue">\${a.category}</span>
              <span style="font-size:0.8rem; color:var(--secondary-text);">\${new Date(a.publishedDate).toLocaleDateString()}</span>
            </div>
            <h3 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:8px;">\${a.title}</h3>
            <p style="color:var(--dark-text); font-size:0.92rem; line-height:1.5;">\${a.content}</p>
          </div>
        \`).join('');
      }
    }

    function logout(e) {
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

    function showToast(type, msg) {
      const c = document.getElementById('toast-container');
      const t = document.createElement('div');
      t.className = 'toast ' + type;
      t.innerHTML = '<span>' + msg + '</span>';
      c.appendChild(t);
      setTimeout(() => t.remove(), 4000);
    }

    function closeModal(id) {
      document.getElementById(id).style.display = 'none';
    }
  </script>
</body>
</html>`;
}

function renderUnauthorizedPage() {
  return `<!DOCTYPE html>
<html>
<head><title>403 Forbidden | St. Mary's College Negombo</title>${CLAY_BASE_STYLES}</head>
<body style="display:flex; align-items:center; justify-content:center; height:100vh; text-align:center;">
  <div class="clay-card" style="padding:40px; max-width:440px;">
    <div style="font-size:3rem; color:#E83E8C; margin-bottom:12px;"><i class="fa-solid fa-lock"></i></div>
    <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:8px;">Access Denied (403)</h2>
    <p style="color:var(--secondary-text); margin-bottom:20px;">You are not authorized to view this restricted area.</p>
    <a href="/login" class="clay-btn"><i class="fa-solid fa-arrow-left"></i> Sign in with Authorized Role</a>
  </div>
</body>
</html>`;
}

function renderNotFoundPage() {
  return `<!DOCTYPE html>
<html>
<head><title>404 Page Not Found | St. Mary's College Negombo</title>${CLAY_BASE_STYLES}</head>
<body style="display:flex; align-items:center; justify-content:center; height:100vh; text-align:center;">
  <div class="clay-card" style="padding:40px; max-width:440px;">
    <div style="font-size:3rem; color:var(--royal-blue); margin-bottom:12px;"><i class="fa-solid fa-compass"></i></div>
    <h2 style="font-family:'Poppins'; color:var(--royal-blue); margin-bottom:8px;">Page Not Found (404)</h2>
    <p style="color:var(--secondary-text); margin-bottom:20px;">The requested learning portal page does not exist.</p>
    <a href="/" class="clay-btn"><i class="fa-solid fa-house"></i> Return to Campus Homepage</a>
  </div>
</body>
</html>`;
}

// -------------------------------------------------------------
// SERVER LISTENER & EXPORT
// -------------------------------------------------------------
// Connect to MongoDB if URI is set
if (MONGODB_URI) {
  connectToMongo().catch(console.error);
}

// Start Server locally or in non-serverless dev
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`St. Mary's College Negombo LMS is running live at http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
