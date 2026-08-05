"use client";

import { useMemo, useState } from "react";
import {
  AI_TUTOR_HISTORY,
  STUDENT_INSIGHTS,
  SUBJECT_INSIGHTS,
} from "@/lib/demo-insights";

type DashboardTab = "students" | "subjects" | "ai";

export default function TutoringDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("students");
  const groupStudents = useMemo(
    () => STUDENT_INSIGHTS.filter((student) => student.group === "3r B"),
    [],
  );
  const blockedExchanges = useMemo(() => {
    const alerts = AI_TUTOR_HISTORY.filter((exchange) =>
      exchange.blocked && groupStudents.some((student) => student.id === exchange.studentId)
    );

    return Array.from(
      new Map(alerts.map((exchange) => [`${exchange.studentId}:${exchange.task}`, exchange])).values(),
    );
  }, [groupStudents]);
  const averageProgress = Math.round(
    groupStudents.reduce((total, student) => total + student.progressPercent, 0)
      / groupStudents.length,
  );
  const totalOverdue = groupStudents.reduce(
    (total, student) => total + student.overdueTasks,
    0,
  );

  return (
    <>
      <article className="portal-panel full tutor-alert-panel">
        <div>
          <p className="panel-label">ALERTES DE SEGUIMENT</p>
          <h2>{blockedExchanges.length} possibles bloquejos detectats</h2>
        </div>
        <div className="tutor-alert-list">
          {blockedExchanges.map((exchange) => (
            <article key={exchange.id}>
              <span aria-hidden="true">!</span>
              <p>
                <strong>{exchange.studentName}</strong>
                {" "}ha sol·licitat ajuda {exchange.attemptsOnTask} vegades a{" "}
                <b>{exchange.task}</b> i sembla bloquejat/ada.
              </p>
              <button onClick={() => setActiveTab("ai")} type="button">Revisar historial</button>
            </article>
          ))}
        </div>
      </article>

      <article className="portal-panel full tutor-dashboard">
        <header className="section-heading-row">
          <div>
            <p className="panel-label">SEGUIMENT DEL GRUP 3r B</p>
            <h2>Tasques, resultats i Tutoria IA</h2>
            <p>Una visió conjunta per detectar necessitats sense obrir cada tauler.</p>
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
              Historial de Tutoria IA
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
                    <th>Seguiment</th>
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
                      <td><strong>{student.averageGrade.toFixed(1)}</strong></td>
                      <td>
                        <span className={student.blocked ? "status-pill offline" : "status-pill"}>
                          {student.blocked ? "Revisar bloqueig" : "Seguiment normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "subjects" && (
          <div className="subject-dashboard" role="tabpanel">
            {SUBJECT_INSIGHTS.map((subject) => (
              <article key={subject.subject}>
                <header><strong>{subject.subject}</strong><span>{subject.activeStudents} actius</span></header>
                <div className="subject-progress">
                  <span><b style={{ width: `${subject.completionPercent}%` }} /></span>
                  <small>{subject.completionPercent}% completat</small>
                </div>
                <dl>
                  <div><dt>Nota mitjana</dt><dd>{subject.averageGrade.toFixed(1)}</dd></div>
                  <div><dt>Endarrerides</dt><dd>{subject.overdueTasks}</dd></div>
                </dl>
              </article>
            ))}
            <p className="classroom-local-note">
              Les dades de Classroom són de demostració local. La sincronització real
              s'activarà després de l'autorització OAuth del centre.
            </p>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="ai-history" role="tabpanel">
            <div className="ai-privacy-note">
              <strong>Accés tutorial justificat</strong>
              <span>
                Aquest historial només és visible per tutoria i coordinació autoritzada.
                Cal informar l'alumnat i definir la política de conservació del centre.
              </span>
            </div>
            {AI_TUTOR_HISTORY.map((exchange) => (
              <article className={exchange.blocked ? "ai-exchange blocked" : "ai-exchange"} key={exchange.id}>
                <header>
                  <div>
                    <strong>{exchange.studentName}</strong>
                    <span>{exchange.subject} · {exchange.task}</span>
                  </div>
                  <time>{exchange.createdAt}</time>
                </header>
                <div className="ai-turn student-turn">
                  <span>Alumne/a</span>
                  <p>{exchange.prompt}</p>
                </div>
                <div className="ai-turn assistant-turn">
                  <span>Tutor IA socràtic</span>
                  <p>{exchange.response}</p>
                </div>
                <footer>
                  <span>{exchange.attemptsOnTask} intents en aquesta tasca</span>
                  {exchange.blocked && <strong>Possible bloqueig</strong>}
                </footer>
              </article>
            ))}
          </div>
        )}
      </article>
    </>
  );
}
