export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DELIVERED" | "GRADED";

export type LearningTask = {
  id: string;
  studentId: string;
  title: string;
  subject: string;
  subjectIcon: string;
  status: TaskStatus;
  dueLabel: string;
  overdue: boolean;
  classroomLinked: boolean;
  grade?: number;
  maximumGrade?: number;
  teacherFeedback?: string;
};

export type StudentInsight = {
  id: string;
  name: string;
  initials: string;
  group: string;
  stage: string;
  tutor: string;
  lastActive: string;
  progressPercent: number;
  overdueTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  deliveredTasks: number;
  gradedTasks: number;
  averageGrade: number;
};

export type AiSubjectUsage = {
  subject: string;
  questions: number;
  minutes: number;
  activeSessions: number;
  sharePercent: number;
};

export type AiGroupUsage = {
  group: string;
  period: string;
  totalQuestions: number;
  totalMinutes: number;
  activeSessions: number;
  repeatedHelpSignals: number;
  busiestTime: string;
  subjects: AiSubjectUsage[];
};

export type SubjectInsight = {
  subject: string;
  completionPercent: number;
  averageGrade: number;
  overdueTasks: number;
  activeStudents: number;
};

export const STUDENT_INSIGHTS: StudentInsight[] = [
  {
    id: "marc-costa",
    name: "Marc Costa",
    initials: "MC",
    group: "3r B",
    stage: "3r ESO",
    tutor: "Marta Puig",
    lastActive: "Fa 8 min",
    progressPercent: 58,
    overdueTasks: 1,
    pendingTasks: 3,
    inProgressTasks: 2,
    deliveredTasks: 5,
    gradedTasks: 4,
    averageGrade: 7.8,
  },
  {
    id: "laia-canals",
    name: "Laia Canals",
    initials: "LC",
    group: "3r B",
    stage: "3r ESO",
    tutor: "Marta Puig",
    lastActive: "Fa 21 min",
    progressPercent: 81,
    overdueTasks: 0,
    pendingTasks: 1,
    inProgressTasks: 1,
    deliveredTasks: 8,
    gradedTasks: 6,
    averageGrade: 8.6,
  },
  {
    id: "aina-vidal",
    name: "Aina Vidal",
    initials: "AV",
    group: "3r B",
    stage: "3r ESO",
    tutor: "Marta Puig",
    lastActive: "Ahir, 19:42",
    progressPercent: 46,
    overdueTasks: 2,
    pendingTasks: 4,
    inProgressTasks: 1,
    deliveredTasks: 4,
    gradedTasks: 3,
    averageGrade: 6.9,
  },
  {
    id: "pau-serra",
    name: "Pau Serra",
    initials: "PS",
    group: "3r B",
    stage: "3r ESO",
    tutor: "Marta Puig",
    lastActive: "Fa 1 h",
    progressPercent: 73,
    overdueTasks: 0,
    pendingTasks: 2,
    inProgressTasks: 1,
    deliveredTasks: 7,
    gradedTasks: 5,
    averageGrade: 7.4,
  },
  {
    id: "julia-mas",
    name: "Júlia Mas",
    initials: "JM",
    group: "3r B",
    stage: "3r ESO",
    tutor: "Marta Puig",
    lastActive: "Fa 3 h",
    progressPercent: 39,
    overdueTasks: 3,
    pendingTasks: 4,
    inProgressTasks: 2,
    deliveredTasks: 3,
    gradedTasks: 2,
    averageGrade: 6.2,
  },
  {
    id: "nil-cardona",
    name: "Nil Cardona",
    initials: "NC",
    group: "4t A",
    stage: "4t ESO",
    tutor: "Jordi Serra",
    lastActive: "Fa 34 min",
    progressPercent: 76,
    overdueTasks: 0,
    pendingTasks: 2,
    inProgressTasks: 1,
    deliveredTasks: 9,
    gradedTasks: 7,
    averageGrade: 8.1,
  },
  {
    id: "emma-rius",
    name: "Emma Rius",
    initials: "ER",
    group: "4t A",
    stage: "4t ESO",
    tutor: "Jordi Serra",
    lastActive: "Ahir, 21:05",
    progressPercent: 52,
    overdueTasks: 2,
    pendingTasks: 3,
    inProgressTasks: 2,
    deliveredTasks: 5,
    gradedTasks: 4,
    averageGrade: 7.0,
  },
];

export const LEARNING_TASKS: LearningTask[] = [
  {
    id: "task-functions",
    studentId: "marc-costa",
    title: "Funcions · exercicis 12, 13 i 16",
    subject: "Matemàtiques",
    subjectIcon: "∑",
    status: "IN_PROGRESS",
    dueLabel: "Demà, 10:15 h",
    overdue: false,
    classroomLinked: true,
  },
  {
    id: "task-history",
    studentId: "marc-costa",
    title: "Dossier de la Revolució Industrial",
    subject: "Història",
    subjectIcon: "⌛",
    status: "PENDING",
    dueLabel: "Divendres, 12:00 h",
    overdue: false,
    classroomLinked: true,
  },
  {
    id: "task-lab",
    studentId: "marc-costa",
    title: "Informe del laboratori de densitat",
    subject: "Ciències",
    subjectIcon: "⚗",
    status: "DELIVERED",
    dueLabel: "Lliurat avui",
    overdue: false,
    classroomLinked: true,
  },
  {
    id: "task-english",
    studentId: "marc-costa",
    title: "Audio: My neighbourhood",
    subject: "Anglès",
    subjectIcon: "A",
    status: "GRADED",
    dueLabel: "Qualificat",
    overdue: false,
    classroomLinked: false,
    grade: 8.5,
    maximumGrade: 10,
    teacherFeedback:
      "Molt bona pronunciació i vocabulari variat. Revisa el ritme de les dues últimes frases.",
  },
  {
    id: "task-aina-maths",
    studentId: "aina-vidal",
    title: "Funcions · gràfiques",
    subject: "Matemàtiques",
    subjectIcon: "∑",
    status: "PENDING",
    dueLabel: "Endarrerida 2 dies",
    overdue: true,
    classroomLinked: true,
  },
  {
    id: "task-julia-history",
    studentId: "julia-mas",
    title: "Eix cronològic del segle XIX",
    subject: "Història",
    subjectIcon: "⌛",
    status: "IN_PROGRESS",
    dueLabel: "Endarrerida 1 dia",
    overdue: true,
    classroomLinked: true,
  },
  {
    id: "task-nil-science",
    studentId: "nil-cardona",
    title: "Projecte d'energia i eficiència",
    subject: "Ciències",
    subjectIcon: "⚗",
    status: "IN_PROGRESS",
    dueLabel: "Dilluns",
    overdue: false,
    classroomLinked: true,
  },
  {
    id: "task-emma-english",
    studentId: "emma-rius",
    title: "Presentation: Sustainable cities",
    subject: "Anglès",
    subjectIcon: "A",
    status: "PENDING",
    dueLabel: "Endarrerida 1 dia",
    overdue: true,
    classroomLinked: true,
  },
];

export const GROUP_AI_USAGE: AiGroupUsage = {
  group: "3r B",
  period: "Últims 7 dies",
  totalQuestions: 54,
  totalMinutes: 126,
  activeSessions: 31,
  repeatedHelpSignals: 3,
  busiestTime: "De 18:00 a 20:00",
  subjects: [
    { subject: "Matemàtiques", questions: 22, minutes: 49, activeSessions: 12, sharePercent: 41 },
    { subject: "Història", questions: 14, minutes: 34, activeSessions: 8, sharePercent: 26 },
    { subject: "Ciències", questions: 10, minutes: 25, activeSessions: 6, sharePercent: 19 },
    { subject: "Anglès", questions: 8, minutes: 18, activeSessions: 5, sharePercent: 14 },
  ],
};

export const SUBJECT_INSIGHTS: SubjectInsight[] = [
  {
    subject: "Matemàtiques",
    completionPercent: 62,
    averageGrade: 7.1,
    overdueTasks: 4,
    activeStudents: 26,
  },
  {
    subject: "Història",
    completionPercent: 78,
    averageGrade: 7.8,
    overdueTasks: 2,
    activeStudents: 27,
  },
  {
    subject: "Ciències",
    completionPercent: 84,
    averageGrade: 8.0,
    overdueTasks: 1,
    activeStudents: 28,
  },
  {
    subject: "Anglès",
    completionPercent: 71,
    averageGrade: 7.5,
    overdueTasks: 3,
    activeStudents: 25,
  },
];

export const BOARD_THEMES = [
  { id: "whiteboard", label: "Pissarra blanca" },
  { id: "chalkboard", label: "Pissarra de guix" },
  { id: "cork", label: "Suro" },
  { id: "digital", label: "Digital fosc" },
] as const;

export type BoardTheme = (typeof BOARD_THEMES)[number]["id"];

export function studentById(studentId: string | undefined) {
  return STUDENT_INSIGHTS.find((student) => student.id === studentId) ?? STUDENT_INSIGHTS[0];
}

export function tasksForStudent(studentId: string) {
  return LEARNING_TASKS.filter((task) => task.studentId === studentId);
}
