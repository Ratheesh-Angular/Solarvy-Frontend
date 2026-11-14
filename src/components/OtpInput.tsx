import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

const LENGTH = 6;

type OtpInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
};

function digitsFromValue(value: string): string[] {
  const digits = value.replace(/\D/g, "").slice(0, LENGTH).split("");
  while (digits.length < LENGTH) digits.push("");
  return digits;
}

export default function OtpInput({
  id = "otp",
  value,
  onChange,
  disabled = false,
  hasError = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = digitsFromValue(value);

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const firstEmpty = digits.findIndex((d) => !d);
    const index = firstEmpty === -1 ? 0 : firstEmpty;
    inputsRef.current[index]?.focus();
    // Only on mount / when enabling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, disabled]);

  const emit = (nextDigits: string[]) => {
    onChange(nextDigits.join("").slice(0, LENGTH));
  };

  const focusAt = (index: number) => {
    const clamped = Math.max(0, Math.min(LENGTH - 1, index));
    const el = inputsRef.current[clamped];
    if (!el) return;
    el.focus();
    el.select();
  };

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      emit(next);
      return;
    }

    const next = [...digits];
    const chars = cleaned.split("");
    let cursor = index;
    for (const char of chars) {
      if (cursor >= LENGTH) break;
      next[cursor] = char;
      cursor += 1;
    }
    emit(next);
    focusAt(Math.min(cursor, LENGTH - 1));
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
        emit(next);
        return;
      }
      if (index > 0) {
        next[index - 1] = "";
        emit(next);
        focusAt(index - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(index + 1);
      return;
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    const next = digitsFromValue(pasted);
    emit(next);
    focusAt(Math.min(pasted.length, LENGTH) - 1);
  };

  return (
    <div
      className={`auth-otp-inputs${hasError ? " auth-otp-inputs--error" : ""}`}
      role="group"
      aria-label="One-time verification code"
    >
      {digits.map((digit, index) => (
        <input
          key={`${id}-${index}`}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          id={index === 0 ? id : `${id}-${index + 1}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          className={`auth-otp-digit${digit ? " auth-otp-digit--filled" : ""}`}
          value={digit}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          aria-invalid={hasError || undefined}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
