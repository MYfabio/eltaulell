"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  LEARNING_TASKS,
  STUDENT_INSIGHTS,
  SUBJECT_INSIGHTS,
} from "@/lib/demo-insights";

const ALL = "ALL";

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "ca"));
}

export default function CoordinationOverview() {
  const [stage, setStage] = useState(ALL);
  const [group, setGroup] = useState(ALL);
  const [subject, setSubject] = useState(ALL);
  const [tutor, setTutor] = useState(ALL);
  const [studentQuery, setStudentQuery] = useState("");

  const stages = useMemo(() => unique(STUDENT_INSIGHTS.map((student) => student.stage)), []);
  const groups = useMemo(() => unique(STUDENT_INSIGHTS.map((student) => student.group)), []);
  const tutors = useMemo(() => unique(STUDENT_INSIGHTS.map((student) => student.tutor)), []);

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLocaleLowerCase("ca");
    return STUDENT_INSIGHTS.filter((student) => {
      if (stage !== ALL && student.stage !== stage) return false;
      if (group !== ALL && student.group !== group) return false;
      if (tutor !== ALL && student.tutor !== tutor) return false;
      if (query && !student.name.toLocaleLowerCase("ca").includes(query)) return false;
      if (
        subject !== ALL &&
        !LEARNING_TASKS.some(
          (task) => task.studentId === student.id && task.subject === subject,
        )
      ) {
        return false;
      }
      return true;
    });
  }, [group, stage, studentQuery, subject, tutor]);

  const averageProgress = filteredStudents.length
    ? Math.round(
        filteredStudents.reduce((total, student) => total + student.progressPercent, 0) /
          filteredStudents.length,
      )
    : 0;
  const overdueTasks = filteredStudents.reduce(
    (total, student) => total + student.overdueTasks,
    0,
  );

  return (
    <article className="portal-panel full coordination-overview">
      <header className="section-heading-row">
        <div>
          <p className="panel-label">SUPERVISIÓ GLOBAL · MODE LECTURA</p>
          <h2>Taulers actius del centre</h2>
          <p>
            Filtra els espais personals i entra com a observador. En aquest mode no
            es pot editar, qualificar ni respondre en nom de l'alumne.
          </p>
        </div>
        <span className="observer-badge">Només lectura</span>
      </header>

      <div className="coordination-filters" aria-label="Filtres dels taulers">
        <label>
          Etapa / curs
          <select value={stage} onChange={(event) => setStage(event.target.value)}>
            <option value={ALL}>Totes les etapes</option>
            {stages.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          Grup
          <select value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value={ALL}>Tots els grups</option>
            {groups.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          Assignatura
          <select value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option value={ALL}>Totes les matèries</option>
            {SUBJECT_INSIGHTS.map((item) => (
              <option key={item.subject}>{item.subject}</option>
            ))}
          </select>
        </label>
        <label>
          Tutor/a
          <select value={tutor} onChange={(event) => setTutor(event.target.value)}>
            <option value={ALL}>Totes les tutories</option>
            {tutors.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          Alumne/a
          <input
            onChange={(event) => setStudentQuery(event.target.value)}
            placeholder="Cerca per nom"
            type="search"
            value={studentQuery}
          />
        </label>
      </div>

      <div className="overview-metrics">
        <span><strong>{filteredStudents.length}</strong> taulers visibles</span>
        <span><strong>{averageProgress}%</strong> progrés mitjà</span>
        <span className={overdueTasks ? "metric-warning" : ""}>
          <strong>{overdueTasks}</strong> tasques endarrerides
        </span>
      </div>

      <div className="student-board-list">
        {filteredStudents.map((student) => (
          <article className="student-board-card" key={student.id}>
            <div className="student-board-identity">
              <span>{student.initials}</span>
              <div>
                <strong>{student.name}</strong>
                <small>{student.stage} · {student.group} · {student.tutor}</small>
              </div>
            </div>
            <div className="student-board-progress">
              <span><b style={{ width: `${student.progressPercent}%` }} /></span>
              <small>{student.progressPercent}% de tasques avançades</small>
            </div>
            <dl>
              <div><dt>Última connexió</dt><dd>{student.lastActive}</dd></div>
              <div><dt>En curs</dt><dd>{student.inProgressTasks}</dd></div>
              <div><dt>Endarrerides</dt><dd>{student.overdueTasks}</dd></div>
            </dl>
            <Link href={`/coordinacio/observador?student=${encodeURIComponent(student.id)}`}>
              Veure com a observador
            </Link>
          </article>
        ))}
        {!filteredStudents.length && (
          <p className="empty-filter-result">No hi ha cap tauler que coincideixi amb els filtres.</p>
        )}
      </div>
    </article>
  );
}
