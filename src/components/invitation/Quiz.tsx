"use client";

// ============================================================================
// QUIZ - Cuestionario interactivo (envía a /api/quiz sin login).
// ============================================================================
import { useState } from "react";
import type { QuizModule } from "@/lib/types";

export function Quiz({
  module,
  invitationId,
}: {
  module: QuizModule;
  invitationId: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  function setAnswer(qid: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMsg("");
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, datos: answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setStatus("ok");
      setMsg("¡Gracias por responder!");
    } catch (err: any) {
      setStatus("error");
      setMsg(err.message ?? "No pudimos enviar tus respuestas.");
    }
  }

  return (
    <section className="py-14 px-6 max-w-2xl mx-auto">
      <h2 className="section-title text-center">{module.title}</h2>
      <form onSubmit={submit} className="card p-6 mt-6 space-y-6">
        {module.questions.map((q) => (
          <fieldset key={q.id}>
            <legend className="font-serif text-lg text-ink mb-2">{q.question}</legend>
            <div className="space-y-2">
              {q.options.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-3 p-3 rounded-xl border border-ink/10 cursor-pointer hover:bg-gold-50"
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswer(q.id, opt)}
                    required
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-primary w-full"
        >
          {status === "sending" ? "Enviando..." : "Enviar respuestas"}
        </button>
        {msg && (
          <p className={status === "ok" ? "text-gold-500 text-sm" : "text-red-600 text-sm"}>
            {msg}
          </p>
        )}
      </form>
    </section>
  );
}
