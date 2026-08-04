export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DELIVERED" | "GRADED";

export type LearningTask = {
  id: string;
  studentId: string;
  title: string;
  subject: string;
  status: TaskStatus;
  dueLabel: string;
  overdue: boolean;
  classroomLinked: boolean;
  grade?: number;
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
  aiInteractions: number;
  blocked: boolean;
};

export type AiTutorExchange = {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  task: string;
  prompt: string;
  response: string;
  createdAt: string;
  attemptsOnTask: number;
  blocked: boolean;
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
    aiInteractions: 7,
    blocked: true,
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
    aiInteractions: 3,
    blocked: false,
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
    aiInteractions: 4,
    blocked: false,
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
    aiInteractions: 2,
    blocked: false,
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
    aiInteractions: 9,
    blocked: true,
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
    aiInteractions: 3,
    blocked: false,
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
    aiInteractions: 5,
    blocked: false,
  },
];

export const LEARNING_TASKS: LearningTask[] = [
  {
    id: "task-functions",
    studentId: "marc-costa",
    title: "Funcions · exercicis 12, 13 i 16",
    subject: "Matemàtiques",
    status: "IN_PROGRESS",
    dueLabel: "Demà, 10:15",
    overdue: false,
    classroomLinked: true,
  },
  {
    id: "task-history",
    studentId: "marc-costa",
    title: "Dossier de la Revolució Industrial",
    subject: "Història",
    status: "PENDING",
    dueLabel: "Divendres",
    overdue: false,
    classroomLinked: true,
  },
  {
    id: "task-lab",
    studentId: "marc-costa",
    title: "Informe del laboratori de densitat",
    subject: "Ciències",
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
    status: "GRADED",
    dueLabel: "Qualificat",
    overdue: false,
    classroomLinked: false,
    grade: 8.5,
  },
  {
    id: "task-aina-maths",
    studentId: "aina-vidal",
    title: "Funcions · gràfiques",
    subject: "Matemàtiques",
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
    status: "PENDING",
    dueLabel: "Endarrerida 1 dia",
    overdue: true,
    classroomLinked: true,
  },
];

export const AI_TUTOR_HISTORY: AiTutorExchange[] = [
  {
    id: "ai-1",
    studentId: "marc-costa",
    studentName: "Marc Costa",
    subject: "Matemàtiques",
    task: "Funcions · exercici 12",
    prompt: "No entenc com saber quina és la variable independent.",
    response:
      "Mira quina magnitud pots triar lliurement i quina canvia com a conseqüència. Què representa l'eix horitzontal al teu exercici?",
    createdAt: "Avui, 10:06",
    attemptsOnTask: 5,
    blocked: true,
  },
  {
    id: "ai-2",
    studentId: "marc-costa",
    studentName: "Marc Costa",
    subject: "Matemàtiques",
    task: "Funcions · exercici 12",
    prompt: "He posat el temps però no sé què va a l'altre eix.",
    response:
      "Si el temps és la dada que avança, pensa quina quantitat estàs observant mentre passa. Escriu les dues magnituds abans de dibuixar.",
    createdAt: "Avui, 10:11",
    attemptsOnTask: 5,
    blocked: true,
  },
  {
    id: "ai-3",
    studentId: "laia-canals",
    studentName: "Laia Canals",
    subject: "Història",
    task: "Dossier de la Revolució Industrial",
    prompt: "Com puc ordenar les causes sense copiar el llibre?",
    response:
      "Agrupa-les en canvis tecnològics, socials i econòmics. Després explica amb una frase com es relacionen entre elles.",
    createdAt: "Ahir, 18:32",
    attemptsOnTask: 2,
    blocked: false,
  },
  {
    id: "ai-4",
    studentId: "julia-mas",
    studentName: "Júlia Mas",
    subject: "Història",
    task: "Eix cronològic del segle XIX",
    prompt: "No sé per on començar i ja ho he intentat moltes vegades.",
    response:
      "Comença només per tres dates clau. Quan les tinguis, podem decidir quins fets intermedis ajuden a entendre el canvi.",
    createdAt: "Ahir, 16:20",
    attemptsOnTask: 6,
    blocked: true,
  },
];

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

export function aiHistoryForStudent(studentId: string) {
  return AI_TUTOR_HISTORY.filter((exchange) => exchange.studentId === studentId);
}
