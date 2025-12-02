
import { User, UserRole, Student, ScoreRecord, AcademicSession, AuditLog, SchoolSettings, CLASSES, SUBJECTS } from '../types';

// Keys for LocalStorage
const KEYS = {
  USERS: 'cdss_users',
  STUDENTS: 'cdss_students',
  SCORES: 'cdss_scores',
  SESSION: 'cdss_session',
  SETTINGS: 'cdss_settings',
  LOGS: 'cdss_logs',
  CURRENT_USER: 'cdss_current_user' // Simulating session cookie
};

// Seed Data
const SEED_USERS: User[] = [
  {
    id: 'u1',
    email: 'commandant@cdssdaura.edu.ng',
    fullName: 'Lt. Col. Commandant',
    role: UserRole.COMMANDANT,
    isActive: true,
    passwordHash: '123456'
  },
  {
    id: 'u2',
    email: 'admin@cdssdaura.edu.ng',
    fullName: 'Capt. Admin Officer',
    role: UserRole.ADMIN_OFFICER,
    isActive: true,
    passwordHash: '123456'
  },
  {
    id: 'u3',
    email: 'exam@cdssdaura.edu.ng',
    fullName: 'Mr. Exam Officer',
    role: UserRole.EXAM_OFFICER,
    isActive: true,
    passwordHash: '123456'
  },
  {
    id: 'u4',
    email: 'teacher@cdssdaura.edu.ng',
    fullName: 'Mallam Teacher',
    role: UserRole.SUBJECT_TEACHER,
    isActive: true,
    assignedSubjects: ['Mathematics'],
    assignedClasses: ['JSS1 A', 'SSS1 A'],
    passwordHash: '123456'
  },
   {
    id: 'u5',
    email: 'form@cdssdaura.edu.ng',
    fullName: 'Mrs. Form Master',
    role: UserRole.FORM_MASTER,
    isActive: true,
    assignedClass: 'JSS1 A',
    passwordHash: '123456'
  },
  {
    id: 'u6',
    email: 'vpacademics@cdssdaura.edu.ng',
    fullName: 'Mr. VP Academics',
    role: UserRole.VP_ACADEMICS,
    isActive: true,
    passwordHash: '123456'
  },
  {
    id: 'u7',
    email: 'vpadmin@cdssdaura.edu.ng',
    fullName: 'Mrs. VP Admin',
    role: UserRole.VP_ADMIN,
    isActive: true,
    passwordHash: '123456'
  }
];

const SEED_STUDENTS: Student[] = Array.from({ length: 30 }).map((_, i) => ({
  id: `s${i + 1}`,
  regNumber: `CDSS/25/${1000 + i}`,
  fullName: `Student Name ${i + 1}`,
  currentClass: 'JSS1 A',
  gender: i % 2 === 0 ? 'M' : 'F'
}));

const INITIAL_SESSION: AcademicSession = {
  year: '2025/2026',
  currentTerm: 1,
  isTermOpen: true
};

const INITIAL_SETTINGS: SchoolSettings = {
  schoolName: 'COMMAND DAY SECONDARY SCHOOL DAURA',
  address: 'KATSINA STATE, NIGERIA',
  logoUrl: '' // Empty by default
};

// Helper to simulate delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const db = {
  init: () => {
    if (!localStorage.getItem(KEYS.USERS)) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(SEED_USERS));
    }
    if (!localStorage.getItem(KEYS.STUDENTS)) {
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(SEED_STUDENTS));
    }
    if (!localStorage.getItem(KEYS.SESSION)) {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(INITIAL_SESSION));
    }
    if (!localStorage.getItem(KEYS.SCORES)) {
      localStorage.setItem(KEYS.SCORES, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.LOGS)) {
      localStorage.setItem(KEYS.LOGS, JSON.stringify([]));
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
  },

  // Auth
  login: async (email: string, password: string): Promise<User> => {
    await delay(500);
    const users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password);
    if (!user) throw new Error('Invalid credentials');
    if (!user.isActive) throw new Error('Account pending approval.');
    return user;
  },

  register: async (email: string, fullName: string, role: UserRole, password: string): Promise<void> => {
    await delay(500);
    const users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    if (users.find(u => u.email === email)) throw new Error('Email already exists');
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      fullName,
      role,
      isActive: false, // Default inactive
      passwordHash: password
    };
    
    users.push(newUser);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },

  resetPasswordRequest: async (email: string) => {
    await delay(800);
    const users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const user = users.find(u => u.email === email);
    if (user) {
      console.log(`[SIMULATION] Password reset link sent to ${email}: https://cdssdaura.app/reset?token=xyz`);
    }
    // Always return success for security
  },

  // Data Access
  getUsers: (): User[] => JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
  
  updateUserStatus: (adminId: string, userId: string, isActive: boolean) => {
    const users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].isActive = isActive;
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      db.log(adminId, 'UPDATE_USER', `Changed status of ${users[idx].email} to ${isActive}`);
    }
  },

  updateUserAssignments: (adminId: string, userId: string, assignments: Partial<User>) => {
    const users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      const updatedUser = { ...users[idx], ...assignments };
      users[idx] = updatedUser;
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      db.log(adminId, 'UPDATE_ASSIGNMENTS', `Updated assignments for ${users[idx].email}`);
    }
  },

  deleteUser: (adminId: string, userId: string) => {
    let users: User[] = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const target = users.find(u => u.id === userId);
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    if (target) db.log(adminId, 'DELETE_USER', `Permanently deleted user ${target.email}`);
  },

  getSession: (): AcademicSession => JSON.parse(localStorage.getItem(KEYS.SESSION) || '{}'),
  
  updateSession: (adminId: string, session: AcademicSession) => {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
    db.log(adminId, 'UPDATE_SESSION', `Session updated: ${session.year}, Term ${session.currentTerm}, Open: ${session.isTermOpen}`);
  },

  // Settings
  getSettings: (): SchoolSettings => JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}'),
  
  updateSettings: (adminId: string, settings: SchoolSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    db.log(adminId, 'UPDATE_SETTINGS', 'Updated school settings/logo');
  },

  getStudents: (classFilter?: string): Student[] => {
    const students: Student[] = JSON.parse(localStorage.getItem(KEYS.STUDENTS) || '[]');
    if (classFilter) return students.filter(s => s.currentClass === classFilter);
    return students;
  },
  
  addStudent: (adminId: string, student: Student) => {
    const students: Student[] = JSON.parse(localStorage.getItem(KEYS.STUDENTS) || '[]');
    // Check if Reg No exists
    if (students.find(s => s.regNumber === student.regNumber)) {
        throw new Error(`Registration Number ${student.regNumber} already exists.`);
    }
    students.push(student);
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
    db.log(adminId, 'ADD_STUDENT', `Added student ${student.fullName} (${student.regNumber}) to ${student.currentClass}`);
  },

  deleteStudent: (adminId: string, studentId: string) => {
    let students: Student[] = JSON.parse(localStorage.getItem(KEYS.STUDENTS) || '[]');
    const target = students.find(s => s.id === studentId);
    students = students.filter(s => s.id !== studentId);
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
    if (target) db.log(adminId, 'DELETE_STUDENT', `Deleted student ${target.fullName} (${target.regNumber})`);
  },

  getScores: (): ScoreRecord[] => JSON.parse(localStorage.getItem(KEYS.SCORES) || '[]'),

  saveScore: (teacherId: string, record: ScoreRecord) => {
    const session = db.getSession();
    if (!session.isTermOpen) throw new Error("Term is currently closed.");

    const scores: ScoreRecord[] = JSON.parse(localStorage.getItem(KEYS.SCORES) || '[]');
    const existingIdx = scores.findIndex(s => 
      s.studentId === record.studentId && 
      s.subject === record.subject && 
      s.term === record.term && 
      s.session === record.session
    );

    let oldVal = 'None';
    if (existingIdx !== -1) {
      oldVal = `CA1:${scores[existingIdx].ca1}, CA2:${scores[existingIdx].ca2}, Ex:${scores[existingIdx].exam}`;
      scores[existingIdx] = { ...record, updatedAt: new Date().toISOString(), teacherId };
    } else {
      scores.push({ ...record, updatedAt: new Date().toISOString(), teacherId });
    }

    localStorage.setItem(KEYS.SCORES, JSON.stringify(scores));
    
    // Log it
    const student = db.getStudents().find(s => s.id === record.studentId);
    db.log(teacherId, 'SCORE_UPDATE', 
      `Updated ${record.subject} for ${student?.fullName}. Old: [${oldVal}] -> New: [CA1:${record.ca1}, CA2:${record.ca2}, Ex:${record.exam}]`
    );
  },

  // Audit Logs
  log: (actorId: string, action: string, details: string) => {
    const logs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]');
    const users = db.getUsers();
    const actor = users.find(u => u.id === actorId);
    
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      actorId,
      actorName: actor?.fullName || 'Unknown',
      action,
      details
    };
    
    logs.unshift(newLog); // Newest first
    localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  },

  getLogs: (): AuditLog[] => JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]'),
};

// Initialize DB immediately
db.init();
