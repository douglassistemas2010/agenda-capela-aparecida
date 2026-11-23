import React, { Children, Fragment, useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";

function flatten(children) {
  return Children.toArray(children).flatMap((child) =>
    child.type === Fragment ? flatten(child.props.children) : [child],
  );
}

// Todos os campos permanecem montados para preservar os dados entre as etapas.
export default function ResponsiveForm({ children, onSubmit }) {
  const all = flatten(children);
  const action = all.at(-1);
  const fields = all.slice(0, -1);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const form = useRef(null);
  // Não reagrupar ao abrir o teclado: isso desmontaria inputs e perderia dados.
  const [perStep] = useState(() =>
    window.innerWidth <= 700 || window.innerHeight < 650 ? 2 : 3,
  );
  const count = Math.max(1, Math.ceil(fields.length / perStep));
  useEffect(() => {
    setStep((s) => Math.min(s, count - 1));
  }, [count]);
  function submit(event) {
    const inputs = Array.from(
      form.current.querySelectorAll("input,textarea,select"),
    );
    const invalid = inputs.find(
      (input) =>
        !input.checkValidity() &&
        (step === count - 1 ||
          Number(input.closest("[data-form-step]")?.dataset.formStep) === step),
    );
    if (invalid) {
      event.preventDefault();
      setStep(Number(invalid.closest("[data-form-step]").dataset.formStep));
      setError("Confira o preenchimento do campo indicado antes de continuar.");
      invalid.setAttribute("aria-invalid", "true");
      requestAnimationFrame(() => invalid.focus());
      return;
    }
    if (step < count - 1) {
      event.preventDefault();
      setStep(step + 1);
      return;
    }
    onSubmit(event);
  }
  return (
    <form
      ref={form}
      className="step-form"
      noValidate
      onSubmit={submit}
      onChange={(event) => {
        setError("");
        event.target.removeAttribute("aria-invalid");
      }}
    >
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {count > 1 && (
        <div
          className="form-progress"
          aria-label={`Etapa ${step + 1} de ${count}`}
        >
          <span>
            Etapa {step + 1} de {count}
          </span>
          <div>
            {Array.from({ length: count }, (_, i) => (
              <i className={i <= step ? "done" : ""} key={i} />
            ))}
          </div>
        </div>
      )}
      <div className="form-fields">
        {fields.map((field, i) => (
          <div
            key={field.key || i}
            className="form-field"
            data-form-step={Math.floor(i / perStep)}
            hidden={step !== Math.floor(i / perStep)}
          >
            {field}
          </div>
        ))}
      </div>
      <div className="form-step-actions">
        {step > 0 && (
          <button
            type="button"
            className="secondary"
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft size={16} /> Voltar
          </button>
        )}
        {step < count - 1 ? (
          <button type="submit" className="primary">
            Continuar
          </button>
        ) : (
          action
        )}
      </div>
    </form>
  );
}
