import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function toDisplay(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Aceita "1.234,56", "1234,5", "1234" e devolve number (ou null se vazio). */
export function parseBRLInput(raw: string): number | null {
  const limpo = raw.replace(/[^\d,.-]/g, "");
  if (!limpo.trim()) return null;
  const normalizado = limpo.replace(/\./g, "").replace(",", ".");
  const n = Number(normalizado);
  return Number.isNaN(n) ? null : n;
}

/**
 * Campo de valor em reais: sem zero preso na frente, aceita vírgula decimal
 * e formata em pt-BR ao sair do campo.
 */
export function CurrencyInput({
  value,
  onChange,
  disabled,
  className,
  placeholder = "0,00",
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  disabled?: boolean | undefined;
  className?: string | undefined;
  placeholder?: string | undefined;
}) {
  const [text, setText] = useState(() => toDisplay(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(toDisplay(value));
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground">
        R$
      </span>
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        className="field pl-8 text-right tabular-nums"
        value={text}
        onFocus={(e) => {
          focused.current = true;
          e.currentTarget.select();
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,]/g, "");
          setText(raw);
          onChange(parseBRLInput(raw));
        }}
        onBlur={() => {
          focused.current = false;
          const n = parseBRLInput(text);
          setText(toDisplay(n));
          onChange(n);
        }}
      />
    </div>
  );
}