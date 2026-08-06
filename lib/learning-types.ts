export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DELIVERED" | "GRADED";

export type LearningTaskItem = {
  id: string;
  studentMembershipId: string;
  title: string;
  subject: string;
  subjectIcon: string;
  status: TaskStatus;
  dueLabel: string;
  dueAt: string | null;
  overdue: boolean;
  classroomLinked: boolean;
  resourceUrl?: string;
  grade?: number;
  maximumGrade?: number;
  teacherFeedback?: string;
};

export type StudentInsight = {
  id: string;
  name: string;
  initials: string;
  group: string;
  groupId: string;
  stage: string;
  tutor: string;
  subjects: string[];
  lastActive: string;
  progressPercent: number;
  overdueTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  deliveredTasks: number;
  gradedTasks: number;
  averageGrade: number | null;
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
  averageGrade: number | null;
  overdueTasks: number;
  activeStudents: number;
};

export type LearningDashboard = {
  students: StudentInsight[];
  subjects: SubjectInsight[];
  aiUsage: AiGroupUsage;
};

export const BOARD_THEMES = [
  { id: "whiteboard", label: "Pissarra blanca" },
  { id: "chalkboard", label: "Pissarra de guix" },
  { id: "cork", label: "Suro" },
  { id: "digital", label: "Digital fosc" },
] as const;

export type BoardTheme = (typeof BOARD_THEMES)[number]["id"];
