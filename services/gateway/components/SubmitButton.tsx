"use client";

import { useFormStatus } from "react-dom";

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** Libellé pendant le pending (sinon affiche "Envoi…") */
  pendingLabel?: string;
  /** Icône Phosphor du bouton au repos */
  icon?: string;
  /** Classes utilitaires (généralement btn btn--accent btn--sm) */
  className?: string;
  /** Contenu du bouton au repos (texte + icône) */
  children: React.ReactNode;
}

/**
 * Bouton de soumission qui affiche un spinner pendant l'envoi d'un Server
 * Action. Utilise useFormStatus() — doit donc être enfant d'un <form>.
 * Bloque aussi le double-click en passant disabled pendant pending.
 */
export function SubmitButton({
  pendingLabel,
  icon,
  className = "btn btn--accent btn--sm",
  children,
  disabled,
  ...rest
}: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={className}
      {...rest}
    >
      {pending ? (
        <>
          <i
            className="ph ph-circle-notch"
            style={{ animation: "submit-spin 1s linear infinite" }}
            aria-hidden="true"
          ></i>
          {pendingLabel ?? "Envoi…"}
        </>
      ) : (
        <>
          {icon ? <i className={`ph ${icon}`} aria-hidden="true"></i> : null}
          {children}
        </>
      )}
      <style jsx>{`
        @keyframes submit-spin {
          from { transform: rotate(0); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
