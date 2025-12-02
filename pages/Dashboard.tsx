
import React, { useMemo } from 'react';
import { User, UserRole } from '../types';
import { db } from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const scores = db.getScores();
  const students = db.getStudents();
  const session = db.getSession();
  
  // Statistics Logic
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const totalScores = scores.length;
    
    // Pass/Fail Rate (Assuming 50 is pass)
    let passCount = 0;
    scores.forEach(s => {
      const total = s.ca1 + s.ca2 + s.exam;
      if (total >= 50) passCount++;
    });
    
    const passRate = totalScores > 0 ? (passCount / totalScores) * 100 : 0;
    
    // Class Averages
    const classMap: Record<string, { total: number; count: number }> = {};
    scores.forEach(s => {
      const student = students.find(st => st.id === s.studentId);
      if (student) {
        if (!classMap[student.currentClass]) classMap[student.currentClass] = { total: 0, count: 0 };
        classMap[student.currentClass].total += (s.ca1 + s.ca2 + s.exam);
        classMap[student.currentClass].count++;
      }
    });

    const classData = Object.keys(classMap).map(cls => ({
      name: cls,
      average: Math.round(classMap[cls].total / classMap[cls].count)
    })).sort((a,b) => b.average - a.average);

    return { totalStudents, totalScores, passRate, classData };
  }, [scores, students]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const StatCard = ({ title, value, color }: { title: string; value: string; color: string }) => (
    <div className={`p-6 bg-white rounded-xl shadow-sm border-l-4 ${color}`}>
      <h3 className="text-gray-500 text-sm uppercase font-semibold">{title}</h3>
      <p className="text-3xl font-bold mt-2 text-gray-800">{value}</p>
    </div>
  );

  const termLabel = session.currentTerm === 1 ? '1st' : session.currentTerm === 2 ? '2nd' : '3rd';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Welcome back, {user.fullName}</h2>
        <p className="text-gray-500">Here is what's happening at CDSS Daura today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={stats.totalStudents.toString()} color="border-blue-500" />
        <StatCard title="Entries Logged" value={stats.totalScores.toString()} color="border-green-500" />
        <StatCard title="Overall Pass Rate" value={`${stats.passRate.toFixed(1)}%`} color="border-yellow-500" />
        <StatCard title="Current Term" value={termLabel} color="border-purple-500" />
      </div>

      {(user.role === UserRole.COMMANDANT || user.role === UserRole.ADMIN_OFFICER || user.role === UserRole.EXAM_OFFICER) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Class Performance (Average Score)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.classData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="#006400" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Subject Distribution</h3>
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-400">Select a specific class to view subject breakdown.</p>
              {/* Simplified for demo - usually a Pie Chart here */}
            </div>
          </div>
        </div>
      )}

      {user.role === UserRole.SUBJECT_TEACHER && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-green-900">Teacher's Notice</h3>
          <p className="text-green-800 mt-2">
            Please ensure all CA1 and CA2 scores for <b>JSS1 - SSS3</b> are uploaded before Friday.
            Use the "Score Entry" tab to input grades.
          </p>
        </div>
      )}
    </div>
  );
};
