
// Role Definitions
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMMANDANT = 'COMMANDANT',
  ADMIN_OFFICER = 'ADMIN_OFFICER',
  VP_ACADEMICS = 'VP_ACADEMICS',
  VP_ADMIN = 'VP_ADMIN',
  EXAM_OFFICER = 'EXAM_OFFICER',
  FORM_MASTER = 'FORM_MASTER',
  SUBJECT_TEACHER = 'SUBJECT_TEACHER',
}

// User Model
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  assignedClass?: string; // For Form Masters (Single Class)
  assignedClasses?: string[]; // For Subject Teachers (Multiple Classes)
  assignedSubjects?: string[]; // For Subject Teachers (Multiple Subjects)
  passwordHash: string; // Simulated
}

// Student Model
export interface Student {
  id: string;
  regNumber: string;
  fullName: string;
  currentClass: string; // e.g., "JSS1 A"
  gender: 'M' | 'F';
}

// Academic Configuration
export interface AcademicSession {
  year: string; // "2025/2026"
  currentTerm: 1 | 2 | 3;
  isTermOpen: boolean;
}

// School Branding Settings
export interface SchoolSettings {
  schoolName: string;
  address: string;
  logoUrl: string; // Base64 string of the uploaded logo
}

// Score Record
export interface ScoreRecord {
  id: string;
  studentId: string;
  subject: string;
  term: 1 | 2 | 3;
  session: string;
  ca1: number; // Max 15
  ca2: number; // Max 15
  exam: number; // Max 70
  teacherId: string;
  updatedAt: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  details: string;
}

// JUNIOR SECONDARY SUBJECTS
export const JUNIOR_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Basic Science",
  "Social Studies",
  "Civic Education",
  "Agric. Science",
  "Physical & Health Edu.",
  "Computer Studies",
  "Hausa Language",
  "I.R.K./C.R.K.",
  "Basic Technology",
  "Business Studies",
  "Cultural & Creative Art",
  "Home Economics"
];

// SENIOR SECONDARY SUBJECTS
export const SENIOR_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Chemistry",
  "Physics",
  "Biology",
  "Agric. Science",
  "Civic Education",
  "Economics",
  "Computer Studies",
  "Marketing",
  "Geography",
  "Government",
  "Entrepreneurship",
  "I.R.K./C.R.K.",
  "Hausa Language",
  "History",
  "Accounting",
  "Literature-In-Eng."
];

// Combined list for general use
export const SUBJECTS = Array.from(new Set([...JUNIOR_SUBJECTS, ...SENIOR_SUBJECTS]));

export const CLASSES = [
  "JSS1 A", "JSS1 B", "JSS1 C",
  "JSS2 A", "JSS2 B", "JSS2 C",
  "JSS3 A", "JSS3 B", "JSS3 C",
  "SSS1 A", "SSS1 B", "SSS1 C",
  "SSS2 A", "SSS2 B", "SSS2 C",
  "SSS3 A", "SSS3 B", "SSS3 C"
];
