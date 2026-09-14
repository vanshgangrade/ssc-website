"use client";

import type { Question } from "@/lib/inductions/questions";

type Value = string | string[];

export default function QuestionField({
  question,
  value,
  error,
  onChange,
}: {
  question: Question;
  value: Value | undefined;
  error?: string;
  onChange: (value: Value) => void;
}) {
  const text = typeof value === "string" ? value : "";
  const picked = Array.isArray(value) ? value : [];
  const fieldId = `q-${question.id}`;

  return (
    <div className="ind-field" data-error={error ? "true" : undefined}>
      <label className="ind-label" htmlFor={fieldId}>
        {question.prompt}
        {question.required ? <span className="ind-req"> *</span> : <span className="ind-opt"> (optional)</span>}
      </label>
      {question.hint && <p className="ind-hint">{question.hint}</p>}

      {question.type === "short" && (
        <input
          id={fieldId}
          className="ind-input"
          type="text"
          value={text}
          maxLength={question.maxLength}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
      )}

      {question.type === "long" && (
        <>
          <textarea
            id={fieldId}
            className="ind-textarea"
            rows={5}
            value={text}
            maxLength={question.maxLength}
            onChange={(e) => onChange(e.target.value)}
          />
          {question.maxLength && (
            <p className="ind-count">
              {text.length} / {question.maxLength}
            </p>
          )}
        </>
      )}

      {question.type === "choice" && (
        <div className="ind-options" role="radiogroup" aria-labelledby={fieldId}>
          {question.options?.map((opt) => (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={text === opt}
              className="ind-option"
              data-selected={text === opt}
              onClick={() => onChange(opt)}
            >
              <span className="ind-tick" aria-hidden="true" />
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === "multi" && (
        <div className="ind-options">
          {question.options?.map((opt) => {
            const on = picked.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                role="checkbox"
                aria-checked={on}
                className="ind-option"
                data-selected={on}
                onClick={() => onChange(on ? picked.filter((p) => p !== opt) : [...picked, opt])}
              >
                <span className="ind-tick ind-tick-box" aria-hidden="true" />
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="ind-error">{error}</p>}
    </div>
  );
}
