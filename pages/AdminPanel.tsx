import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, AuditLog, SchoolSettings, CLASSES, JUNIOR_SUBJECTS, SENIOR_SUBJECTS, AcademicSession, Student } from '../types';
import { db } from '../services/storage';

interface Props {
  user: User;
  initialTab?: 'users' | 'students' | 'session' | 'branding' | 'logs';
}

export const AdminPanel: React.FC<Props> = ({ user, initialTab = 'users' }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'students' | 'session' | 'branding' | 'logs'>(initialTab);
  const [users, setUsers] = useState(db.getUsers());
  const [students, setStudents] = useState<Student[]>([]);
  const [session, setSession] = useState(db.getSession());
  const [settings, setSettings] = useState<SchoolSettings>(db.getSettings());
  const [logs] = useState<AuditLog[]>(db.getLogs());

  // --- STUDENT MANAGEMENT STATE ---
  const [selectedStudentClass, setSelectedStudentClass] = useState(CLASSES[0]);
  const [studentFormMode, setStudentFormMode] = useState<'single' | 'bulk'>('single');
  // Single Student
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'M' | 'F'>('M');
  const [newStudentReg, setNewStudentReg] = useState('');
  // Bulk Student
  const [bulkNames, setBulkNames] = useState('');
  const [bulkStartReg, setBulkStartReg] = useState('');

  // --- USER ASSIGNMENT MODAL STATE ---
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [tempAssignedClass, setTempAssignedClass] = useState<string>('');
  const [tempAssignedClasses, setTempAssignedClasses] = useState<string[]>([]);
  const [tempAssignedSubjects, setTempAssignedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState('');

  // --- SESSION MANAGEMENT STATE ---
  const [selectedYear, setSelectedYear] = useState<string>(session.year);
  const [selectedTerm, setSelectedTerm] = useState<number>(session.currentTerm);

  // Update active tab if prop changes (navigation)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Sync state if external session changes happen
  useEffect(() => {
    setSelectedYear(session.year);
    setSelectedTerm(session.currentTerm);
  }, [session.year, session.currentTerm]);

  // Load students when class filter changes
  useEffect(() => {
    setStudents(db.getStudents(selectedStudentClass));
  }, [selectedStudentClass, activeTab]);

  // Suggest Reg No when switching tabs or classes (simple heuristic)
  useEffect(() => {
    if (activeTab === 'students') {
       const allStudents = db.getStudents();
       const count = allStudents.length;
       const yearSuffix = session.year.substring(2, 4); // "25" from "2025/2026"
       const nextId = 1000 + count + 1;
       const suggestion = `CDSS/${yearSuffix}/${nextId}`;
       setNewStudentReg(suggestion);
       setBulkStartReg(suggestion);
    }
  }, [activeTab, session.year]);


  // Generate Sessions from 2025/2026 to 2099/2100
  const sessionYears = useMemo(() => {
    const years = [];
    for (let i = 2025; i < 2100; i++) {
      years.push(`${i}/${i + 1}`);
    }
    return years;
  }, []);

  // --- CONSTANTS ---
  const TEACHING_ROLES = [
    UserRole.SUBJECT_TEACHER, 
    UserRole.VP_ACADEMICS, 
    UserRole.VP_ADMIN, 
    UserRole.EXAM_OFFICER, 
    UserRole.FORM_MASTER,
    UserRole.COMMANDANT,
    UserRole.ADMIN_OFFICER
  ];

  // Combine standard subjects with any custom ones currently assigned to the user
  const availableSubjects = useMemo(() => {
    const standard = [...JUNIOR_SUBJECTS, ...SENIOR_SUBJECTS];
    const combined = new Set([...standard, ...tempAssignedSubjects]);
    return Array.from(combined).sort();
  }, [tempAssignedSubjects]);

  // --- PERMISSIONS CHECKS ---
  const canManageUsers = [UserRole.COMMANDANT, UserRole.ADMIN_OFFICER, UserRole.EXAM_OFFICER, UserRole.VP_ACADEMICS].includes(user.role);
  const canManageStudents = [UserRole.COMMANDANT, UserRole.ADMIN_OFFICER, UserRole.EXAM_OFFICER, UserRole.VP_ADMIN].includes(user.role);
  const canManageSession = [UserRole.COMMANDANT, UserRole.ADMIN_OFFICER].includes(user.role);
  const canManageBranding = [UserRole.COMMANDANT, UserRole.ADMIN_OFFICER].includes(user.role);
  const canViewLogs = [UserRole.COMMANDANT, UserRole.ADMIN_OFFICER, UserRole.EXAM_OFFICER, UserRole.VP_ADMIN, UserRole.VP_ACADEMICS].includes(user.role);
  
  // Specific permission for destructive actions (Delete/Deactivate/Reject)
  const canDeleteUsers = [UserRole.COMMANDANT, UserRole.ADMIN_OFFICER, UserRole.EXAM_OFFICER].includes(user.role);

  // Specific permission for assigning subjects
  const canAssignSubjects = [UserRole.COMMANDANT, UserRole.ADMIN_OFFICER, UserRole.VP_ACADEMICS].includes(user.role);

  // --- STUDENT FUNCTIONS ---
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentReg) return;
    try {
        const newStudent: Student = {
            id: Math.random().toString(36).substr(2, 9),
            fullName: newStudentName.toUpperCase(),
            currentClass: selectedStudentClass,
            gender: newStudentGender,
            regNumber: newStudentReg
        };
        db.addStudent(user.id, newStudent);
        alert("Student added successfully!");
        setNewStudentName('');
        // increment reg suggestion
        const parts = newStudentReg.split('/');
        const num = parseInt(parts[2]);
        if(!isNaN(num)) setNewStudentReg(`${parts[0]}/${parts[1]}/${num + 1}`);
        setStudents(db.getStudents(selectedStudentClass));
    } catch (err: any) {
        alert(err.message);
    }
  };

  const handleBulkAdd = () => {
    const names = bulkNames.split('\n').filter(n => n.trim() !== '');
    if (names.length === 0) return;
    
    let currentRegNum = parseInt(bulkStartReg.split('/').pop() || '1000');
    const prefix = bulkStartReg.split('/').slice(0, 2).join('/'); // CDSS/25

    if (isNaN(currentRegNum)) {
        alert("Invalid Starting Reg No format. Use CDSS/YY/XXXX");
        return;
    }

    try {
        let addedCount = 0;
        names.forEach(name => {
            const reg = `${prefix}/${currentRegNum}`;
            const student: Student = {
                 id: Math.random().toString(36).substr(2, 9) + addedCount,
                 fullName: name.trim().toUpperCase(),
                 currentClass: selectedStudentClass,
                 gender: 'M', // Defaulting to M for bulk, user might need to edit later or we add CSV parsing
                 regNumber: reg
            };
            db.addStudent(user.id, student);
            currentRegNum++;
            addedCount++;
        });
        alert(`${addedCount} students added successfully!`);
        setBulkNames('');
        setStudents(db.getStudents(selectedStudentClass));
    } catch (err: any) {
        alert("Error during bulk upload (some might be added): " + err.message);
    }
  };

  const handleDeleteStudent = (id: string) => {
    if(window.confirm("Delete this student record?")) {
        db.deleteStudent(user.id, id);
        setStudents(db.getStudents(selectedStudentClass));
    }
  };

  // --- USER FUNCTIONS ---
  const openAssignmentModal = (u: User) => {
    setEditingUser(u);
    setTempAssignedClass(u.assignedClass || '');
    setTempAssignedClasses(u.assignedClasses || []);
    setTempAssignedSubjects(u.assignedSubjects || []);
    setCustomSubject('');
  };

  const saveAssignments = () => {
    if (!editingUser) return;
    
    const updates: Partial<User> = {};
    if (editingUser.role === UserRole.FORM_MASTER) {
      updates.assignedClass = tempAssignedClass;
    }
    // Update logic for ALL teaching roles (Teachers, VPs, Exam Officer)
    if (TEACHING_ROLES.includes(editingUser.role)) {
      updates.assignedClasses = tempAssignedClasses;
      updates.assignedSubjects = tempAssignedSubjects;
    }

    // Save Assignments
    db.updateUserAssignments(user.id, editingUser.id, updates);
    
    // If user was inactive, activate them now
    if (!editingUser.isActive) {
      db.updateUserStatus(user.id, editingUser.id, true);
    }
    
    setUsers(db.getUsers());
    setEditingUser(null);
  };

  const handleApproveClick = (targetUser: User) => {
    // Permission check for VP Academics
    if (user.role === UserRole.VP_ACADEMICS) {
        // Allow approval if target is Teacher, Form Master, or other Teaching Admin roles (VP Admin/Exam Officer)
        const canApprove = targetUser.role === UserRole.SUBJECT_TEACHER || 
                           targetUser.role === UserRole.FORM_MASTER ||
                           TEACHING_ROLES.includes(targetUser.role);

        if (!canApprove) {
            alert("VP Academics can only manage Teachers, Form Masters, and Teaching Staff.");
            return;
        }
    }

    // If user requires assignments (Teachers OR VPs/Exam Officers who teach), open modal
    // BUT only if the current user has permission to assign subjects
    const needsAssignment = targetUser.role === UserRole.FORM_MASTER || TEACHING_ROLES.includes(targetUser.role);

    if (needsAssignment && canAssignSubjects) {
      if (window.confirm(`This user (${targetUser.role.replace('_', ' ')}) may require Class/Subject assignments. Configure them now?`)) {
        openAssignmentModal(targetUser);
        return; 
      }
    } 
    
    // Direct approval
    if (window.confirm("Are you sure you want to APPROVE this user account?")) {
      db.updateUserStatus(user.id, targetUser.id, true);
      setUsers(db.getUsers());
    }
  };

  const deactivateUser = (targetId: string) => {
    if (window.confirm("Are you sure you want to DEACTIVATE this user? They will lose access.")) {
      db.updateUserStatus(user.id, targetId, false);
      setUsers(db.getUsers());
    }
  };

  const deleteUser = (targetId: string, isReject: boolean = false) => {
    const action = isReject ? "REJECT" : "DELETE";
    if (window.confirm(`Are you sure you want to ${action} this user? This action is irreversible.`)) {
      db.deleteUser(user.id, targetId);
      setUsers(db.getUsers());
    }
  };

  // Toggle Helpers
  const toggleItem = (list: string[], item: string, setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) setList(list.filter(i => i !== item));
    else setList([...list, item]);
  };

  // Session Management Logic
  const handleUpdateSessionStatus = (isOpen: boolean) => {
    if (user.role !== UserRole.COMMANDANT && user.role !== UserRole.ADMIN_OFFICER) {
      alert("Only the Commandant or Admin Officer can manage sessions.");
      return;
    }

    const action = isOpen ? "OPEN" : "CLOSE";
    const termLabel = selectedTerm === 1 ? 'First Term' : selectedTerm === 2 ? 'Second Term' : 'Third Term';
    
    const message = `You are about to ${action} the following period:\n\nSession: ${selectedYear}\nTerm: ${termLabel}\n\n${
        isOpen 
        ? "This will update the active session and ENABLE score entry." 
        : "This will update the active session and LOCK score entry."
    }`;

    if (window.confirm(message)) {
      const newSession: AcademicSession = {
        year: selectedYear,
        currentTerm: selectedTerm as 1 | 2 | 3,
        isTermOpen: isOpen
      };
      db.updateSession(user.id, newSession);
      setSession(newSession);
      alert(`Successfully ${isOpen ? 'Opened' : 'Closed'} ${termLabel} ${selectedYear}`);
    }
  };

  // Branding Management
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Please upload an image under 2MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const newSettings = { ...settings, logoUrl: base64String };
        db.updateSettings(user.id, newSettings);
        setSettings(newSettings);
        alert("Logo updated successfully! It will now appear on reports and the dashboard.");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Assignment Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                Configure Assignments: {editingUser.fullName}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded text-sm text-gray-700">
                <span className="font-bold">Role:</span> {editingUser.role.replace('_', ' ')} <br/>
                <span className="font-bold">Email:</span> {editingUser.email}
              </div>

              {editingUser.role === UserRole.FORM_MASTER && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Assigned Class</label>
                  <select 
                    value={tempAssignedClass} 
                    onChange={e => setTempAssignedClass(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 p-2"
                  >
                    <option value="">Select Class...</option>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* Show for ALL Teaching Roles */}
              {TEACHING_ROLES.includes(editingUser.role) && (
                <div className="space-y-6">
                  <div className="bg-yellow-50 p-2 border border-yellow-200 text-xs text-yellow-800 rounded">
                    This user has a teaching role ({editingUser.role.replace('_',' ')}). Assign classes and subjects below.
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Assigned Classes (Select Multiple)</label>
                    <div className="grid grid-cols-3 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                      {CLASSES.map(c => (
                        <label key={c} className="flex items-center space-x-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input 
                            type="checkbox" 
                            checked={tempAssignedClasses.includes(c)}
                            onChange={() => toggleItem(tempAssignedClasses, c, setTempAssignedClasses)}
                            className="rounded text-green-600"
                          />
                          <span>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Assigned Subjects (Select Multiple)</label>
                    <div className="grid grid-cols-2 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
                      {availableSubjects.map(s => (
                        <label key={s} className="flex items-center space-x-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input 
                            type="checkbox" 
                            checked={tempAssignedSubjects.includes(s)}
                            onChange={() => toggleItem(tempAssignedSubjects, s, setTempAssignedSubjects)}
                            className="rounded text-green-600"
                          />
                          <span>{s}</span>
                        </label>
                      ))}
                    </div>
                    {/* Manual Entry */}
                    <div className="mt-2 flex space-x-2">
                        <input 
                            type="text" 
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            placeholder="Type new subject..."
                            className="flex-1 border-gray-300 rounded-md text-sm p-1.5 border"
                        />
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                if(customSubject.trim() && !tempAssignedSubjects.includes(customSubject.trim())) {
                                    setTempAssignedSubjects([...tempAssignedSubjects, customSubject.trim()]);
                                    setCustomSubject('');
                                }
                            }}
                            className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded hover:bg-green-200 border border-green-200"
                        >
                            Add
                        </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveAssignments}
                  className="px-4 py-2 bg-green-800 text-white rounded-md hover:bg-green-700"
                >
                  Save & Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {canManageUsers && (
            <button
              onClick={() => setActiveTab('users')}
              className={`${activeTab === 'users' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              User Management
            </button>
          )}
          {canManageStudents && (
             <button
              onClick={() => setActiveTab('students')}
              className={`${activeTab === 'students' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Students
            </button>
          )}
          {canManageSession && (
            <button
              onClick={() => setActiveTab('session')}
              className={`${activeTab === 'session' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Academic Session
            </button>
          )}
          {canManageBranding && (
            <button
              onClick={() => setActiveTab('branding')}
              className={`${activeTab === 'branding' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              School Branding
            </button>
          )}
          {canViewLogs && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`${activeTab === 'logs' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Audit Logs
            </button>
          )}
        </nav>
      </div>

      {/* 1. USERS TAB */}
      {activeTab === 'users' && canManageUsers && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
             <h3 className="text-lg leading-6 font-medium text-gray-900">System Users</h3>
             <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage staff access, approve registrations, and assign subjects.</p>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {users.map(u => (
                <li key={u.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                   <div>
                     <div className="flex items-center">
                        <p className="text-sm font-medium text-green-600 truncate">{u.fullName}</p>
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {u.isActive ? 'Active' : 'Pending'}
                        </span>
                     </div>
                     <p className="mt-1 text-sm text-gray-500">{u.email} — <span className="text-gray-700 font-semibold">{u.role.replace('_', ' ')}</span></p>
                     
                     {/* Show Assignments Summary */}
                     {u.role === UserRole.FORM_MASTER && u.assignedClass && (
                       <p className="text-xs text-gray-400 mt-1">Class: {u.assignedClass}</p>
                     )}
                     {TEACHING_ROLES.includes(u.role) && (
                       <p className="text-xs text-gray-400 mt-1">
                         Classes: {u.assignedClasses?.length || 0}, Subjects: {u.assignedSubjects?.length || 0}
                       </p>
                     )}
                   </div>
                   <div className="flex space-x-2">
                     {!u.isActive && (
                        <>
                          {/* Approve for VP Academics only available for teachers/form masters/other VPs */}
                          {(!user.role.includes('VP_ACADEMICS') || (TEACHING_ROLES.includes(u.role) || u.role === UserRole.FORM_MASTER)) && (
                             <button onClick={() => handleApproveClick(u)} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Approve</button>
                          )}
                          
                          {canDeleteUsers && (
                            <button onClick={() => deleteUser(u.id, true)} className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">Reject</button>
                          )}
                        </>
                     )}
                     {u.isActive && (
                        <>
                           {canAssignSubjects && (TEACHING_ROLES.includes(u.role) || u.role === UserRole.FORM_MASTER) && (
                             <button onClick={() => openAssignmentModal(u)} className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50">Assign</button>
                           )}
                           
                           {canDeleteUsers && (
                               <>
                                <button onClick={() => deactivateUser(u.id)} className="px-3 py-1 border border-red-300 text-red-700 text-xs rounded hover:bg-red-50">Deactivate</button>
                                <button onClick={() => deleteUser(u.id)} className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">Delete</button>
                               </>
                           )}
                        </>
                     )}
                   </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 2. STUDENTS TAB */}
      {activeTab === 'students' && canManageStudents && (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Student Management</h3>
                    <select 
                        value={selectedStudentClass} 
                        onChange={e => setSelectedStudentClass(e.target.value)}
                        className="border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    >
                        {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Add Student Form */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                    <div className="flex space-x-4 mb-4 text-sm font-medium">
                        <button 
                            onClick={() => setStudentFormMode('single')}
                            className={`${studentFormMode === 'single' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-500'}`}
                        >
                            Single Entry
                        </button>
                        <button 
                             onClick={() => setStudentFormMode('bulk')}
                             className={`${studentFormMode === 'bulk' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-500'}`}
                        >
                            Bulk Upload
                        </button>
                    </div>

                    {studentFormMode === 'single' ? (
                         <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Full Name</label>
                                <input 
                                    type="text" required
                                    className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                                    placeholder="Surname Firstname"
                                    value={newStudentName} onChange={e => setNewStudentName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Reg Number</label>
                                <input 
                                    type="text" required
                                    className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                                    value={newStudentReg} onChange={e => setNewStudentReg(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Gender</label>
                                <select 
                                    className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                                    value={newStudentGender} onChange={e => setNewStudentGender(e.target.value as 'M'|'F')}
                                >
                                    <option value="M">Male</option>
                                    <option value="F">Female</option>
                                </select>
                            </div>
                            <div className="md:col-span-4 mt-2">
                                <button type="submit" className="w-full md:w-auto px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-green-600">
                                    Register Student
                                </button>
                            </div>
                         </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Starting Reg No (Auto-increments)</label>
                                    <input 
                                        type="text" 
                                        className="w-full border-gray-300 rounded-md shadow-sm text-sm"
                                        value={bulkStartReg} onChange={e => setBulkStartReg(e.target.value)}
                                        placeholder="CDSS/25/1050"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">First student gets this ID, next gets +1, etc.</p>
                                </div>
                                <div className="flex items-end">
                                     <button onClick={handleBulkAdd} className="w-full px-4 py-2 bg-green-700 text-white rounded text-sm hover:bg-green-600">
                                        Import Names
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Student Names (One per line)</label>
                                <textarea 
                                    className="w-full border-gray-300 rounded-md shadow-sm text-sm h-32"
                                    placeholder="Paste list of names here..."
                                    value={bulkNames} onChange={e => setBulkNames(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reg No</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {students.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{s.regNumber}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{s.fullName}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{s.gender}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleDeleteStudent(s.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* 3. SESSION TAB */}
      {activeTab === 'session' && canManageSession && (
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Manage Academic Period</h3>
          
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <h4 className="text-green-800 font-bold uppercase text-xs tracking-wide">Currently Active In System</h4>
            <div className="mt-2 flex items-center space-x-6">
                <div>
                    <span className="text-gray-500 text-xs">Session Year</span>
                    <p className="text-2xl font-bold text-gray-800">{session.year}</p>
                </div>
                <div>
                    <span className="text-gray-500 text-xs">Current Term</span>
                    <p className="text-2xl font-bold text-gray-800">
                        {session.currentTerm === 1 ? '1st Term' : session.currentTerm === 2 ? '2nd Term' : '3rd Term'}
                    </p>
                </div>
                <div>
                     <span className="text-gray-500 text-xs">Status</span>
                     <p className={`text-lg font-bold ${session.isTermOpen ? 'text-green-600' : 'text-red-600'}`}>
                        {session.isTermOpen ? 'OPEN (Data Entry Active)' : 'CLOSED (Locked)'}
                     </p>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Academic Year</label>
                <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                >
                    {sessionYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Term</label>
                <select 
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(Number(e.target.value))}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                >
                    <option value={1}>1st Term</option>
                    <option value={2}>2nd Term</option>
                    <option value={3}>3rd Term</option>
                </select>
             </div>
          </div>

          <div className="mt-8 flex items-center space-x-4">
              <button
                type="button"
                onClick={() => handleUpdateSessionStatus(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm"
              >
                OPEN TERM
              </button>
              
              <button
                type="button"
                onClick={() => handleUpdateSessionStatus(false)}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-sm"
              >
                CLOSE TERM
              </button>
          </div>
          
          <p className="mt-4 text-xs text-gray-500">
            <strong>Note:</strong> Clicking "OPEN TERM" will actively switch the system to the selected Year/Term and enable data entry for teachers. Clicking "CLOSE TERM" will switch the system to the selected Year/Term but lock data entry.
          </p>
        </div>
      )}

      {/* 4. BRANDING TAB */}
      {activeTab === 'branding' && canManageBranding && (
        <div className="bg-white shadow sm:rounded-lg p-6">
           <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">School Identity</h3>
           <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Logo</label>
                <div className="mt-2 flex items-center space-x-4">
                   {settings.logoUrl ? (
                     <img src={settings.logoUrl} alt="Logo" className="h-24 w-24 object-contain border rounded bg-gray-50" />
                   ) : (
                     <div className="h-24 w-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400">No Logo</div>
                   )}
                   <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                      />
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* 5. LOGS TAB */}
      {activeTab === 'logs' && canViewLogs && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
           <div className="px-4 py-5 sm:px-6">
             <h3 className="text-lg leading-6 font-medium text-gray-900">System Audit Logs</h3>
             <p className="mt-1 max-w-2xl text-sm text-gray-500">Track all sensitive actions performed by users.</p>
          </div>
          <div className="border-t border-gray-200">
             <div className="overflow-x-auto max-h-screen">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {log.actorName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};