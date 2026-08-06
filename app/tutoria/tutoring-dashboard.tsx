"use client";

import { useMemo, useState } from "react";
import type { LearningDashboard } from "@/lib/learning-types";

type DashboardTab = "students" | "subjects" | "ai";

export default function TutoringDashboard({ dashboard }: { dashboard: LearningDashboard }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("students");
  const groupStudents = useMemo(() => dashboard.students, [dashboard.students]);
  const averageProgress = groupStudents.length
    ? Math.round(
        groupStudents.reduce((total, student) => total + student.progressPercent, 0)
          / groupStudents.length,
      )
    : 0;
  const totalOverdue = groupStudents.reduce(
    (total, student) => total + student.overdueTasks,
    0,
  );

  return (
    <>
      <article className="portal-panel full tutor-alert-panel">
        <div>
          <p className="panel-label">TUTORIA IA · SENYALS ANÒNIMS</p>
          <h2>{dashboard.aiUsage.repeatedHelpSignals} possibles necessitats de suport al grup</h2>
          <p>
            Es detecten per repetició i temps d'ús, sense mostrar noms, preguntes,
            respostes ni vincular l'activitat a cap alumne concret.
          </p>
        </div>
        <button onClick={() => setActiveTab("ai")} type="button">
          Veure consum agregat
        </button>
      </article>

      <article className="portal-panel full tutor-dashboard">
        <header className="section-heading-row">
          <div>
            <p className="panel-label">SEGUIMENT DEL GRUP {dashboard.aiUsage.group}</p>
            <h2>Tasques, resultats i ús agregat de la Tutoria IA</h2>
            <p>Una visió conjunta del grup que manté privada cada conversa amb l'assistent.</p>
          </div>
          <div className="dashboard-tabs" role="tablist" aria-label="Vistes de seguiment">
            <button
              aria-selected={activeTab === "students"}
              className={activeTab === "students" ? "active" : ""}
              onClick={() => setActiveTab("students")}
              role="tab"
              type="button"
            >
              Per alumne
            </button>
            <button
              aria-selected={activeTab === "subjects"}
              className={activeTab === "subjects" ? "active" : ""}
              onClick={() => setActiveTab("subjects")}
              role="tab"
              type="button"
            >
              Per matèria
            </button>
            <button
              aria-selected={activeTab === "ai"}
              className={activeTab === "ai" ? "active" : ""}
              onClick={() => setActiveTab("ai")}
              role="tab"
              type="button"
            >
              Consum de Tutoria IA
            </button>
          </div>
        </header>

        {activeTab === "students" && (
          <div className="tutor-student-view" role="tabpanel">
            <div className="overview-metrics">
              <span><strong>{groupStudents.length}</strong> alumnes en seguiment</span>
              <span><strong>{averageProgress}%</strong> progrés mitjà</span>
              <span className="metric-warning"><strong>{totalOverdue}</strong> tasques endarrerides</span>
            </div>
            <div className="table-scroll">
              <table className="portal-table tutor-results-table">
                <thead>
                  <tr>
                    <th>Alumne/a</th>
                    <th>Pendents</th>
                    <th>En curs</th>
                    <th>Lliurades</th>
                    <th>Qualificades</th>
                    <th>Mitjana</th>
                  </tr>
                </thead>
                <tbody>
                  {groupStudents.map((student) => (
                    <tr key={student.id}>
                      <td><strong>{student.name}</strong><small>{student.lastActive}</small></td>
                      <td>{student.pendingTasks}</td>
                      <td>{student.inProgressTasks}</td>
                      <td>{student.deliveredTasks}</td>
                      <td>{student.gradedTasks}</td>
                      <td><strong>{student.averageGrade?.toFixed(1) ?? "—"}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "subjects" && (
          <div className="subject-dashboard" role="tabpanel">
            {dashboard.subjects.map((subject) => (
              <article key={subject.subject}>
                <header><strong>{subject.subject}</strong><span>{subject.activeStudents} actius</span></header>
                <div className="subject-progress">
                  <span><b style={{ width: `${subject.completionPercent}%` }} /></span>
                  <small>{subject.completionPercent}% completat</small>
                </div>
                <dl>
                  <div><dt>Nota mitjana</dt><dd>{subject.averageGrade?.toFixed(1) ?? "—"}</dd></div>
                  <div><dt>Endarrerides</dt><dd>{subject.overdueTasks}</dd></div>
                </dl>
              </article>
            ))}
            {!dashboard.subjects.length && <p className="classroom-local-note">Encara no hi ha tasques sincronitzades.</p>}
          </div>
        )}

        {activeTab === "ai" && (
          <div className="ai-history ai-usage-dashboard" role="tabpanel">
            <div className="ai-privacy-note">
              <strong>Analítica anònima per defecte</strong>
              <span>
                Tutoria només veu totals del grup. No es desen en aquesta vista noms,
                textos de preguntes, respostes ni historials individuals.
              </span>
            </div>

            <div className="ai-usage-metrics">
              <article><span>Preguntes</span><strong>{dashboard.aiUsage.totalQuestions}</strong><small>{dashboard.aiUsage.period}</small></article>
              <article><span>Temps total</span><strong>{dashboard.aiUsage.totalMinutes} min</strong><small>Consum del grup</small></article>
              <article><span>Sessions</span><strong>{dashboard.aiUsage.activeSessions}</strong><small>Sense identificadors personals</small></article>
              <article><span>Franja principal</span><strong>{dashboard.aiUsage.busiestTime}</strong><small>Activitat agregada</small></article>
            </div>

            <section className="ai-subject-usage" aria-label="Consum de la IA per matèria">
              <header>
                <div>
                  <p className="panel-label">MATÈRIES AMB MÉS CONSULTES</p>
                  <h3>Distribució de l'ajuda sol·licitada</h3>
                </div>
                <span>Grup {dashboard.aiUsage.group}</span>
              </header>
              {dashboard.aiUsage.subjects.map((subject) => (
                <article key={subject.subject}>
                  <div>
                    <strong>{subject.subject}</strong>
                    <span>{subject.questions} preguntes · {subject.minutes} min · {subject.activeSessions} sessions</span>
                  </div>
                  <div className="ai-subject-bar" aria-label={`${subject.sharePercent}% del consum`}>
                    <span style={{ width: `${subject.sharePercent}%` }} />
                  </div>
                  <b>{subject.sharePercent}%</b>
                </article>
              ))}
            </section>
          </div>
        )}
      </article>
    </>
  );
}
