import React, { useState } from 'react';
import { User, CLASSES, UserRole, JUNIOR_SUBJECTS, SENIOR_SUBJECTS, Student, ScoreRecord, AcademicSession, SchoolSettings } from '../types';
import { db } from '../services/storage';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface Props {
  user: User;
}

export const ReportGenerator: React.FC<Props> = ({ user }) => {
  // Ensure Form Masters can only see their assigned class
  const initialClass = (user.role === UserRole.FORM_MASTER && user.assignedClass) 
    ? user.assignedClass 
    : CLASSES[0];
    
  const [selectedClass, setSelectedClass] = useState(initialClass);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper to calculate Grade
  const calculateGrade = (total: number) => {
    if (total >= 70) return { grade: 'A', remark: 'EXCELLENT' };
    if (total >= 60) return { grade: 'B', remark: 'VERY GOOD' };
    if (total >= 50) return { grade: 'C', remark: 'GOOD' };
    if (total >= 40) return { grade: 'D', remark: 'PASS' };
    return { grade: 'F', remark: 'FAIL' };
  };

  // Unified Generation Function (Single or Batch)
  const generateReport = async (targetStudents: Student[], filename: string) => {
    if (targetStudents.length === 0) return;
    setIsGenerating(true);
    
    try {
      const pdfDoc = await PDFDocument.create();
      const settings = db.getSettings();
      const session = db.getSession();
      const allScores = db.getScores();

      // Embed resources once
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let logoImage;
      if (settings.logoUrl) {
        try {
          const logoBytes = await fetch(settings.logoUrl).then(res => res.arrayBuffer());
          try { logoImage = await pdfDoc.embedPng(logoBytes); } 
          catch { logoImage = await pdfDoc.embedJpg(logoBytes); }
        } catch (e) { console.warn("Logo error", e); }
      }

      // Get context data for the class of the first student (Assuming batch is per class)
      const currentClassName = targetStudents[0].currentClass;
      const classStudents = db.getStudents(currentClassName);
      
      // Filter scores for this class/session/term once
      const classScores = allScores.filter(s => 
        s.session === session.year && 
        s.term === session.currentTerm &&
        classStudents.some(cs => cs.id === s.studentId)
      );

      // --- Page Generator Helper ---
      const addStudentPage = (student: Student) => {
        const page = pdfDoc.addPage([595.28, 841.89]); // A4
        const { width, height } = page.getSize();

        // 1. Determine Subjects for this Student
        const isJunior = student.currentClass.toUpperCase().startsWith('JSS');
        const BASE_SUBJECTS = isJunior ? JUNIOR_SUBJECTS : SENIOR_SUBJECTS;
        
        // Student specific scores
        const studentScores = classScores.filter(s => s.studentId === student.id);
        
        // Identify custom subjects
        const scoreSubjects = studentScores.map(s => s.subject);
        const uniqueExtras = [...new Set(scoreSubjects.filter(s => !BASE_SUBJECTS.includes(s)))];
        const REPORT_SUBJECTS = [...BASE_SUBJECTS, ...uniqueExtras];

        // 2. Calculate Statistics
        // Subject Stats (High/Low for Class)
        const subjectStats: Record<string, { high: number, low: number }> = {};
        REPORT_SUBJECTS.forEach(sub => {
            const scoresForSub = classScores.filter(s => s.subject === sub).map(s => s.ca1 + s.ca2 + s.exam);
            if (scoresForSub.length > 0) {
            subjectStats[sub] = {
                high: Math.max(...scoresForSub),
                low: Math.min(...scoresForSub)
            };
            } else {
            subjectStats[sub] = { high: 0, low: 0 };
            }
        });

        // Student Position
        // Calculate totals for all students based on THIS student's subject list to be fair? 
        // Or generally sum all. Existing logic used REPORT_SUBJECTS.
        const studentTotals = classStudents.map(st => {
            const total = classScores
            .filter(s => s.studentId === st.id && REPORT_SUBJECTS.includes(s.subject))
            .reduce((sum, s) => sum + s.ca1 + s.ca2 + s.exam, 0);
            return { id: st.id, total };
        }).sort((a, b) => b.total - a.total);

        const position = studentTotals.findIndex(t => t.id === student.id) + 1;
        const totalStudents = classStudents.length;
        const studentTotalScore = studentTotals.find(t => t.id === student.id)?.total || 0;
        
        const subjectsTaken = studentScores.filter(s => REPORT_SUBJECTS.includes(s.subject)).length;
        const averageScore = subjectsTaken > 0 ? (studentTotalScore / subjectsTaken).toFixed(1) : "0.0";

        // 3. Draw Content
        if (logoImage) {
            const wmWidth = 350;
            const wmHeight = (logoImage.height / logoImage.width) * wmWidth;
            page.drawImage(logoImage, {
            x: (width - wmWidth) / 2,
            y: (height - wmHeight) / 2,
            width: wmWidth, height: wmHeight, opacity: 0.08
            });
            page.drawImage(logoImage, { x: 40, y: height - 100, width: 60, height: 60 });
        }

        page.drawText('COMMAND DAY SECONDARY SCHOOL, DAURA', {
            x: 110, y: height - 50, size: 20, font: fontBold, color: rgb(0, 0.4, 0)
        });
        page.drawText('Daura L.G.A Katsina State       cdssdaura@gmail.com', {
            x: 110, y: height - 68, size: 10, font: fontRegular
        });
        page.drawText('+234 707 622 4069      +234 907 795 9897', {
            x: 110, y: height - 80, size: 10, font: fontRegular
        });

        const sectionTitle = isJunior ? 'JUNIOR SECONDARY SCHOOL' : 'SENIOR SECONDARY SCHOOL';
        page.drawText(sectionTitle, {
            x: 160, y: height - 100, size: 16, font: fontBold, color: rgb(0.8, 0, 0)
        });

        // Bio Data
        let y = height - 130;
        const drawLine = (yPos: number) => page.drawLine({ start: { x: 40, y: yPos }, end: { x: 550, y: yPos }, thickness: 1, color: rgb(0,0,0) });
        
        page.drawText(`Name (Surname First): ${student.fullName.toUpperCase()}`, { x: 40, y, size: 10, font: fontBold });
        y -= 5; drawLine(y); y -= 20;

        page.drawText(`Admission No: ${student.regNumber}`, { x: 40, y, size: 10, font: fontRegular });
        page.drawText(`Class: ${student.currentClass}`, { x: 250, y, size: 10, font: fontRegular });
        page.drawText(`Year: ${session.year}`, { x: 400, y, size: 10, font: fontRegular });
        y -= 5; drawLine(y); y -= 20;

        page.drawText(`No. in Class: ${totalStudents}`, { x: 40, y, size: 10, font: fontRegular });
        page.drawText(`Grade: ${position}`, { x: 180, y, size: 10, font: fontRegular });
        page.drawText(`Sex: ${student.gender}`, { x: 320, y, size: 10, font: fontRegular });
        page.drawText(`Age: ____`, { x: 450, y, size: 10, font: fontRegular });
        y -= 5; drawLine(y); y -= 20;

        page.drawText(`Class Average: ${averageScore}`, { x: 40, y, size: 10, font: fontRegular });
        const termSuffix = session.currentTerm === 1 ? '1st' : session.currentTerm === 2 ? '2nd' : '3rd';
        page.drawText(`Term: ${termSuffix}`, { x: 250, y, size: 10, font: fontRegular });
        page.drawText(`Session: ${session.year}`, { x: 400, y, size: 10, font: fontRegular });
        y -= 5; drawLine(y); y -= 15;

        // Table
        const cols = {
            sub: 40, ca1: 180, ca2: 225, exam: 270, tot: 315, high: 360, low: 405, grd: 450, rem: 485, sign: 530, end: 555
        };

        page.drawRectangle({ x: cols.sub, y: y - 25, width: cols.end - cols.sub, height: 25, color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0,0,0), borderWidth: 1 });
        
        const drawHeader = (text: string, xPos: number) => {
            const lines = text.split('\n');
            lines.forEach((l, i) => page.drawText(l, { x: xPos + 2, y: y - 10 - (i * 8), size: 6, font: fontBold }));
        };

        drawHeader("SUBJECTS", cols.sub);
        drawHeader("1ST CA\nSUMMARY\n(15%)", cols.ca1);
        drawHeader("2ND CA\nSUMMARY\n(15%)", cols.ca2);
        drawHeader("EXAM\nSCORE\n(70%)", cols.exam);
        drawHeader("TOTAL\nSCORE\n(100%)", cols.tot);
        drawHeader("HIGHEST\nSCORE", cols.high);
        drawHeader("LOWEST\nSCORE", cols.low);
        drawHeader("GRADE", cols.grd);
        drawHeader("REMARKS", cols.rem);
        drawHeader("SIGN", cols.sign);

        y -= 25;
        const rowHeight = 15;

        for (const subject of REPORT_SUBJECTS) {
            const score = studentScores.find(s => s.subject === subject);
            const hasScore = !!score;
            const total = hasScore ? (score!.ca1 + score!.ca2 + score!.exam) : 0;
            const result = calculateGrade(total);
            const stats = subjectStats[subject] || { high: '-', low: '-' };

            page.drawRectangle({ x: cols.sub, y: y - rowHeight, width: cols.end - cols.sub, height: rowHeight, borderColor: rgb(0,0,0), borderWidth: 1 });
            page.drawText(subject.toUpperCase(), { x: cols.sub + 2, y: y - 10, size: 8, font: fontBold });

            if (hasScore) {
                const centerText = (txt: string, x1: number, x2: number) => {
                    const w = fontRegular.widthOfTextAtSize(txt, 8);
                    page.drawText(txt, { x: x1 + (x2 - x1 - w) / 2, y: y - 10, size: 8, font: fontRegular });
                };
                centerText(score!.ca1.toString(), cols.ca1, cols.ca2);
                centerText(score!.ca2.toString(), cols.ca2, cols.exam);
                centerText(score!.exam.toString(), cols.exam, cols.tot);
                centerText(total.toString(), cols.tot, cols.high);
                centerText(stats.high.toString(), cols.high, cols.low);
                centerText(stats.low.toString(), cols.low, cols.grd);
                
                const gradeColor = result.grade === 'F' ? rgb(0.8, 0, 0) : rgb(0, 0, 0);
                page.drawText(result.grade, { x: cols.grd + 10, y: y - 10, size: 8, font: fontBold, color: gradeColor });
                page.drawText(result.remark, { x: cols.rem + 2, y: y - 10, size: 6, font: fontRegular });
            }

            const drawVert = (xPos: number) => page.drawLine({ start: { x: xPos, y }, end: { x: xPos, y: y - rowHeight }, thickness: 1, color: rgb(0,0,0) });
            [cols.ca1, cols.ca2, cols.exam, cols.tot, cols.high, cols.low, cols.grd, cols.rem, cols.sign].forEach(drawVert);
            y -= rowHeight;
        }

        // Totals Row
        page.drawRectangle({ x: cols.sub, y: y - 15, width: cols.end - cols.sub, height: 15, color: rgb(0.9, 0.9, 0.9), borderColor: rgb(0,0,0), borderWidth: 1 });
        page.drawText("OVERALL TOTAL: " + studentTotalScore, { x: 200, y: y - 10, size: 9, font: fontBold, color: rgb(0.8, 0, 0) });
        page.drawText("PERCENTAGE: " + averageScore + "%", { x: 400, y: y - 10, size: 9, font: fontBold, color: rgb(0, 0.5, 0) });
        y -= 30;

        // Footer Area
        const leftX = 40;
        const rightX = 300;
        
        const drawBox = (lbl: string) => {
            page.drawRectangle({ x: leftX, y: y - 15, width: 250, height: 15, borderColor: rgb(0,0,0), borderWidth: 1 });
            page.drawText(lbl, { x: leftX + 2, y: y - 10, size: 7, font: fontBold });
        };
        drawBox("NEXT TERM BEGINS  ______________"); y -= 15;
        drawBox("NEXT TERM ENDS    ______________"); y -= 20;

        page.drawText(`Times School Opened: ____  Times Present: ____  Absent: ____`, { x: leftX, y, size: 8, font: fontRegular }); y -= 15;
        
        // Skills
        let skillY = y + 50;
        const skills = ["Handwriting", "Fluency", "Games/Sports", "Handling Tools", "Labour", "Drawing", "Crafts", "Punctuality", "Neatness", "Politeness", "Honesty", "Self Control", "Initiative"];
        page.drawText("SKILLS AND BEHAVIOUR RATINGS (1-5)", { x: rightX, y: skillY + 5, size: 8, font: fontBold, color: rgb(0, 0.4, 0) });
        skills.forEach((skill) => {
            page.drawRectangle({ x: rightX, y: skillY - 12, width: 150, height: 12, borderColor: rgb(0,0,0), borderWidth: 0.5 });
            page.drawText(skill, { x: rightX + 2, y: skillY - 9, size: 7 });
            for(let i=0; i<5; i++) {
                page.drawRectangle({ x: rightX + 150 + (i*15), y: skillY - 12, width: 15, height: 12, borderColor: rgb(0,0,0), borderWidth: 0.5 });
            }
            skillY -= 12;
        });

        y -= 10;
        page.drawText("Class Teacher's Remarks & Signature _________________________________________", { x: leftX, y, size: 9, font: fontBold });
        y -= 25;
        page.drawText("_________________________________________", { x: leftX, y, size: 9, font: fontRegular });
        page.drawText("Date: ____________", { x: 350, y, size: 9 });
        y -= 30;
        page.drawText("Ag. Commandant's Remarks & Signature _________________________________________", { x: leftX, y, size: 9, font: fontBold });
        y -= 25;
        page.drawText("_________________________________________", { x: leftX, y, size: 9, font: fontRegular });
        page.drawText("Date: ____________", { x: 350, y, size: 9 });

        const footerY = 30;
        page.drawLine({ start: { x: 40, y: footerY + 10 }, end: { x: width - 40, y: footerY + 10 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
        page.drawText('Command Day Secondary School, Daura - Katsina State', { x: 40, y: footerY, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
        page.drawText('Page 1 of 1', { x: width - 90, y: footerY, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
      };

      // Generate Pages
      for (const student of targetStudents) {
        addStudentPage(student);
      }

      // Save and Download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

    } catch (e: any) {
      console.error(e);
      alert("Error generating PDF: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const students = db.getStudents(selectedClass);

  const handleSinglePrint = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
        generateReport([student], `CDSS_Report_${student.regNumber.replace(/\//g, '-')}.pdf`);
    }
  };

  const handleBatchPrint = () => {
    if (students.length === 0) {
        alert("No students found in this class to print.");
        return;
    }
    const safeClassName = selectedClass.replace(/\s/g, '_');
    const filename = `Report_Cards_${safeClassName}.pdf`;
    generateReport(students, filename);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold">Report Card Management</h2>
            <button
                onClick={handleBatchPrint}
                disabled={isGenerating || students.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-800 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
                {isGenerating ? 'Generating PDF...' : `Print All ${students.length > 0 ? '(' + students.length + ')' : ''}`}
            </button>
        </div>
        
        {/* Class Selector - Restricted for Form Masters */}
        {(user.role === UserRole.COMMANDANT || user.role === UserRole.ADMIN_OFFICER || user.role === UserRole.EXAM_OFFICER) ? (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
            >
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-md">
            <strong>Active Class:</strong> {selectedClass}
          </div>
        )}

        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Reg No</th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{student.fullName}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{student.regNumber}</td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      onClick={() => handleSinglePrint(student.id)}
                      disabled={isGenerating}
                      className="text-green-600 hover:text-green-900 font-bold disabled:opacity-50"
                    >
                      Print Report Card
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                  <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500">
                          No students found in this class.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};