import { Task } from '../types';
import { pktToUtcIso } from './dateUtils';

export function getDeveloperSeedTasks(): Task[] {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Task 1: CS504 Assignment # 1 - Due in 2 days (48 hours)
  const date48h = new Date(now.getTime() + 2 * dayMs);
  const pktDate48h = `${date48h.getUTCFullYear()}-${String(date48h.getUTCMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date48h.getUTCDate()).padStart(2, '0')}`;
  const deadline1 = pktToUtcIso(pktDate48h, '23:59');

  // Task 2: MTH302 Quiz # 1 - Due in 18 hours (Urgent banner will trigger)
  const deadline2 = new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString();

  // Task 3: CS201 Practical Assignment - Due in 4 hours (Critical < 6h)
  const deadline3 = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();

  // Task 4: ENG101 Graded Discussion Board - Due in 4 days
  const date4d = new Date(now.getTime() + 4 * dayMs);
  const pktDate4d = `${date4d.getUTCFullYear()}-${String(date4d.getUTCMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date4d.getUTCDate()).padStart(2, '0')}`;
  const deadline4 = pktToUtcIso(pktDate4d, '23:59');

  // Task 5: CS101 Submitted Assignment (Completed)
  const deadlinePast = new Date(now.getTime() - 3 * dayMs).toISOString();

  return [
    {
      id: 'vu-seed-cs504-1',
      schemaVersion: 1,
      courseCode: 'CS504',
      courseName: 'Software Engineering - I',
      type: 'Assignment',
      title: 'Assignment No. 1 (Use Case & Class Diagrams)',
      instructions:
        'Upload your solution in .doc or .docx format only. Draw Use Case Diagram and Class Diagram for the Hospital Management System scenario. Do not copy from other students (zero marks policy).',
      openingDate: new Date(now.getTime() - 2 * dayMs).toISOString(),
      deadline: deadline1,
      deadlineHasTime: true,
      status: 'Pending',
      archived: false,
      notes: 'Need to review lecture 12 use case relationships before finalizing diagrams.',
      totalMarks: '20',
      gracePeriod: '24 Hours Grace Period will be given after due date',
      source: {
        fileName: 'CS504_Assignment_1_Announcement.png',
        pageRef: 'Page 1',
        importedAt: now.toISOString(),
      },
      fieldConfidence: {
        courseCode: 'High',
        title: 'High',
        deadline: 'High',
        overall: 'High',
        rationale: 'Extracted clearly from official LMS announcement table.',
      },
      needsConfirmation: [],
      reminderState: { mode: 'active' },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'vu-seed-mth302-quiz',
      schemaVersion: 1,
      courseCode: 'MTH302',
      courseName: 'Business Mathematics & Statistics',
      type: 'Quiz',
      title: 'Quiz No. 1 (Lectures 1 to 10)',
      instructions:
        'The quiz will consist of 10 Multiple Choice Questions (MCQs). Ensure a stable internet connection. Each question has a 90-second countdown.',
      openingDate: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      deadline: deadline2,
      deadlineHasTime: true,
      status: 'InProgress',
      archived: false,
      notes: 'Revise permutation, combination, and simple interest formulas.',
      totalMarks: '10',
      gracePeriod: '',
      source: {
        fileName: 'MTH302_Quiz_Schedule.pdf',
        pageRef: 'Notice Board',
        importedAt: now.toISOString(),
      },
      fieldConfidence: {
        courseCode: 'High',
        title: 'High',
        deadline: 'High',
        overall: 'High',
        rationale: 'Quiz window verified from course schedule notice.',
      },
      needsConfirmation: [],
      reminderState: { mode: 'active' },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'vu-seed-cs201-asg',
      schemaVersion: 1,
      courseCode: 'CS201',
      courseName: 'Introduction to Programming',
      type: 'Assignment',
      title: 'Assignment 2 (Pointers and Dynamic Memory in C++)',
      instructions:
        'Submit only the .cpp source code file. Do not submit .exe or compressed zip/rar files. Code must compile without errors on Dev-C++.',
      openingDate: new Date(now.getTime() - 5 * dayMs).toISOString(),
      deadline: deadline3,
      deadlineHasTime: true,
      status: 'Pending',
      archived: false,
      notes: 'Implement destructor to prevent memory leaks with dynamic array allocation.',
      totalMarks: '20',
      gracePeriod: '24 Hours Grace Period available',
      source: {
        fileName: 'CS201_Assignment2_Question.pdf',
        pageRef: 'Page 2',
        importedAt: now.toISOString(),
      },
      fieldConfidence: {
        courseCode: 'High',
        title: 'High',
        deadline: 'High',
        overall: 'High',
        rationale: 'High confidence extraction from assignment handout.',
      },
      needsConfirmation: [],
      reminderState: { mode: 'active' },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'vu-seed-eng101-gdb',
      schemaVersion: 1,
      courseCode: 'ENG101',
      courseName: 'English Comprehension',
      type: 'GDB',
      title: 'Graded Discussion Board (GDB 1)',
      instructions:
        'Topic: Discuss whether modern generative AI tools assist or hinder original critical thinking in academic writing. Post your comments within 150 to 200 words on the GDB board directly (not through regular MDB).',
      openingDate: new Date(now.getTime() - 1 * dayMs).toISOString(),
      deadline: deadline4,
      deadlineHasTime: true,
      status: 'Pending',
      archived: false,
      notes: 'Draft response in text editor first to check word count (150-200 words).',
      totalMarks: '5',
      gracePeriod: '',
      source: {
        fileName: 'ENG101_GDB_Notice.png',
        pageRef: 'Page 1',
        importedAt: now.toISOString(),
      },
      fieldConfidence: {
        courseCode: 'High',
        title: 'High',
        deadline: 'High',
        overall: 'High',
        rationale: 'Extracted from GDB announcement.',
      },
      needsConfirmation: [],
      reminderState: { mode: 'active' },
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    },
    {
      id: 'vu-seed-cs101-submitted',
      schemaVersion: 1,
      courseCode: 'CS101',
      courseName: 'Introduction to Computing',
      type: 'Assignment',
      title: 'Assignment 1 (HTML Web Page Creation)',
      instructions: 'Submit HTML and CSS code demonstrating basic semantic structure.',
      openingDate: new Date(now.getTime() - 10 * dayMs).toISOString(),
      deadline: deadlinePast,
      deadlineHasTime: true,
      status: 'Submitted',
      archived: false,
      notes: 'Submitted on time via LMS portal with all validation checks passing.',
      totalMarks: '20',
      gracePeriod: '',
      source: {
        fileName: 'CS101_Announcement.pdf',
        pageRef: 'Page 1',
        importedAt: new Date(now.getTime() - 10 * dayMs).toISOString(),
      },
      fieldConfidence: {
        courseCode: 'High',
        title: 'High',
        deadline: 'High',
        overall: 'High',
        rationale: 'User entered',
      },
      needsConfirmation: [],
      reminderState: { mode: 'acknowledged' },
      createdAt: new Date(now.getTime() - 10 * dayMs).toISOString(),
      updatedAt: new Date(now.getTime() - 3 * dayMs).toISOString(),
    },
  ];
}
