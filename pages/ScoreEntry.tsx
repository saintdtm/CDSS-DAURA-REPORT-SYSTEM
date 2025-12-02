import React, { useState, useEffect, useMemo } from 'react';
import { User, ScoreRecord, JUNIOR_SUBJECTS, SENIOR_SUBJECTS, CLASSES, UserRole } from '../types';
import { db } from '../services/storage';

interface Props {
  user: User;
}

export const ScoreEntry: React.FC<Props> = ({ user }) => {
  // Roles that have full view access to ALL classes/subjects (Supervisors)
  // They can only EDIT if they are specifically assigned the selected class/subject.
  const SUPERVISOR_ROLES = [
    UserRole.VP_ACADEMICS, 
    UserRole.VP_ADMIN, 
    UserRole.EXAM_OFFICER, 
    UserRole.COMMANDANT, 
    UserRole.ADMIN_OFFICER
  ];

  const isSupervisor = SUPERVISOR_ROLES.includes(user.role);

  // Check if this user actually has assignments to teach
  const hasAssignments = (user.assignedClasses && user.assignedClasses.length > 0) || 
                         (user.assignedSubjects && user.assignedSubjects.length > 0);
  
  // --- 1. Filter Classes based on Role ---
  const allowedClasses = useMemo(() => {
    // Supervisors see ALL classes for monitoring
    if (isSupervisor) {
      return CLASSES;
    }

    // Subject Teachers restricted to assigned classes
    if (user.assignedClasses && user.assignedClasses.length > 0) {
      return CLASSES.filter(c => user.assignedClasses!.includes(c));
    }

    // Form Master restricted to their class
    if (user.role === UserRole.FORM_MASTER && user.assignedClass) {
        return [user.assignedClass];
    }
    
    // Fallback (e.g. Teacher with no assignments)
    return [];
  }, [user, isSupervisor]);

  const [selectedClass, setSelectedClass] = useState(allowedClasses[0] || CLASSES[0]);
  
  // --- 2. Filter Subjects based on Class & Role ---
  const allowedSubjects = useMemo(() => {
    const predefined = selectedClass && selectedClass.startsWith('JSS') ? JUNIOR_SUBJECTS : SENIOR_SUBJECTS;
    
    // Supervisors see ALL subjects for monitoring
    if (isSupervisor) {
      // Include any custom subjects assigned to them to ensure they appear in the list if selected
      const customAssigned = user.assignedSubjects ? user.assignedSubjects.filter(s => !predefined.includes(s)) : [];
      return Array.from(new Set([...predefined, ...customAssigned]));
    }

    // Teachers restricted to assigned subjects
    if (user.assignedSubjects && user.assignedSubjects.length > 0) {
      const relevantAssigned = user.assignedSubjects.filter(s => predefined.includes(s));
      const customAssigned = user.assignedSubjects.filter(s => !predefined.includes(s));
      return Array.from(new Set([...relevantAssigned, ...customAssigned]));
    }

    // Fallback
    return predefined;
  }, [selectedClass, user, isSupervisor]);

  const [selectedSubject, setSelectedSubject] = useState(allowedSubjects[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: 'regNumber' | 'fullName'; direction: 'asc' | 'desc' }>({ key: 'regNumber', direction: 'asc' });

  // --- 3. Determine Edit Permission for Selected Context ---
  // A user can edit IF:
  // 1. They are assigned the selected Class AND
  // 2. They are assigned the selected Subject
  const isAssignedToSelected = useMemo(() => {
    // Form Master logic: Can they edit their own class? 
    // Prompt implied strict subject assignment. So we check assignedSubjects.
    // If Form Master has NO subject assignments, they are Read Only.
    
    const classMatch = user.assignedClasses?.includes(selectedClass) || user.assignedClass === selectedClass;
    const subjectMatch = user.assignedSubjects?.includes(selectedSubject);

    return !!(classMatch && subjectMatch);
  }, [user, selectedClass, selectedSubject]);

  const canEdit = isAssignedToSelected;
  const isReadOnly = !canEdit;

  // Auto-select first available
  useEffect(() => {
    if (allowedSubjects.length > 0 && !allowedSubjects.includes(selectedSubject)) {
      setSelectedSubject(allowedSubjects[0]);
    }
  }, [allowedSubjects, selectedSubject]);

  // Initial Load & Reload on selection change
  useEffect(() => {
    if(allowedSubjects.length > 0 && allowedClasses.length > 0) {
        loadData();
    }
  }, [selectedClass, selectedSubject]);

  const loadData = () => {
    setLoading(true);
    // Simulate network
    setTimeout(() => {
      const clsStudents = db.getStudents(selectedClass);
      const allScores = db.getScores();
      const currentSession = db.getSession();

      // Filter scores for current context
      const relevantScores = allScores.filter(s => 
        s.subject === selectedSubject && 
        s.session === currentSession.year && 
        s.term === currentSession.currentTerm
      );

      setStudents(clsStudents);
      setScores(relevantScores);
      setLoading(false);
    }, 300);
  };

  // Sorting Logic
  const sortedStudents = useMemo(() => {
    let sortableItems = [...students];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [students, sortConfig]);

  const requestSort = (key: 'regNumber' | 'fullName') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name: string) => {
    if (sortConfig.key !== name) return <span className="text-gray-300 ml-1">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="text-green-600 ml-1">↑</span> : <span className="text-green-600 ml-1">↓</span>;
  };

  const handleScoreChange = (studentId: string, field: 'ca1' | 'ca2' | 'exam', value: string) => {
    if (isReadOnly) return; 

    let numVal = parseInt(value) || 0;
    
    // Limits based on new 15/15/70 format
    if (field === 'ca1' || field === 'ca2') numVal = Math.min(numVal, 15);
    if (field === 'exam') numVal = Math.min(numVal, 70);

    const currentSession = db.getSession();
    const newRecord: ScoreRecord = {
      id: `${studentId}-${selectedSubject}-${currentSession.year}`,
      studentId,
      subject: selectedSubject,
      term: currentSession.currentTerm,
      session: currentSession.year,
      ca1: 0, ca2: 0, exam: 0,
      teacherId: user.id,
      updatedAt: new Date().toISOString(),
    };

    // Find existing to merge
    const existing = scores.find(s => s.studentId === studentId);
    if (existing) {
      Object.assign(newRecord, existing);
    }
    
    newRecord[field] = numVal;

    // Save to DB immediately (Auto-save)
    try {
      db.saveScore(user.id, newRecord);
      // Update local state
      setScores(prev => {
        const idx = prev.findIndex(s => s.studentId === studentId);
        if (idx > -1) {
          const copy = [...prev];
          copy[idx] = newRecord;
          return copy;
        }
        return [...prev, newRecord];
      });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const getScore = (studentId: string) => scores.find(s => s.studentId === studentId) || { ca1: 0, ca2: 0, exam: 0 };

  // Calculate Total & Grade
  const calculateResult = (s: {ca1: number, ca2: number, exam: number}) => {
    const total = s.ca1 + s.ca2 + s.exam;
    let grade = 'F';
    if (total >= 70) grade = 'A';
    else if (total >= 60) grade = 'B';
    else if (total >= 50) grade = 'C';
    else if (total >= 40) grade = 'D';
    return { total, grade };
  };

  const currentSession = db.getSession();

  if (!currentSession.isTermOpen) {
    return (
      <div className="p-8 text-center bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-800">Term Closed</h2>
        <p className="text-red-600">Grading is currently locked by the Commandant.</p>
      </div>
    );
  }

  // Access Denied State if no subjects assigned AND not a supervisor
  if (allowedClasses.length === 0) {
      return (
        <div className="p-8 text-center bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="text-xl font-bold text-yellow-800">No Assignments Found</h2>
            <p className="text-yellow-600">You do not have any subjects or classes assigned. Please contact the Admin.</p>
        </div>
      );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
      {/* Controls */}
      <div className="p-4 border-b border-gray-100 flex flex-col space-y-4 bg-gray-50 rounded-t-xl">
        <div className="flex flex-wrap gap-4 items-end">
            <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Class ({allowedClasses.length})</label>
            <select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 w-40"
            >
                {allowedClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            </div>
            <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Subject ({allowedSubjects.length})</label>
            <select 
                value={selectedSubject} 
                onChange={e => setSelectedSubject(e.target.value)}
                className="border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 w-60"
            >
                {allowedSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            </div>
            
            <div className="ml-auto text-sm text-gray-500 self-end pb-2">
            Showing {sortedStudents.length} Students
            </div>
        </div>

        {/* Informative Banner for Read Only State */}
        {isReadOnly && (
            <div className="flex items-center p-3 bg-blue-50 border border-blue-100 rounded-md">
                <span className="text-xl mr-3">ℹ️</span>
                <div>
                    <p className="text-sm font-bold text-blue-800">Viewing in Read-Only Mode</p>
                    <p className="text-xs text-blue-600 mt-1">
                        {isSupervisor 
                            ? "As a Supervisor, you can view all scores. To edit, you must assign this Class & Subject to yourself in the Admin Panel."
                            : "You are not assigned to teach this subject in this class."}
                    </p>
                </div>
            </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none group"
                onClick={() => requestSort('regNumber')}
              >
                <div className="flex items-center">
                  Reg No {getSortIcon('regNumber')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none group"
                onClick={() => requestSort('fullName')}
              >
                <div className="flex items-center">
                  Name {getSortIcon('fullName')}
                </div>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">CA 1 (15)</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">CA 2 (15)</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Exam (70)</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Total</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Grade</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStudents.map(student => {
              const record = getScore(student.id);
              const result = calculateResult(record);
              return (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.regNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.fullName}</td>
                  <td className="px-2 py-2 text-center">
                    <input 
                      type="number" max="15" min="0"
                      disabled={isReadOnly}
                      className="w-full text-center border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                      value={record.ca1 || ''}
                      onChange={(e) => handleScoreChange(student.id, 'ca1', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input 
                      type="number" max="15" min="0"
                      disabled={isReadOnly}
                      className="w-full text-center border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                      value={record.ca2 || ''}
                      onChange={(e) => handleScoreChange(student.id, 'ca2', e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input 
                      type="number" max="70" min="0"
                      disabled={isReadOnly}
                      className="w-full text-center border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
                      value={record.exam || ''}
                      onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-700">
                    {result.total}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-center text-sm font-bold ${
                    result.grade === 'F' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {result.grade}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};