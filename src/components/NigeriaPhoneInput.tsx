type NigeriaPhoneInputProps = {
  id?: string;
  value: string;
  onChange: (localDigits: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoComplete?: string;
  placeholder?: string;
};

/** Nigeria-only phone field: fixed +234 prefix with flag + local digits. */
export default function NigeriaPhoneInput({
  id = "phone",
  value,
  onChange,
  disabled = false,
  hasError = false,
  autoComplete = "tel-national",
  placeholder = "801 234 5678",
}: NigeriaPhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    onChange(digits);
  };

  return (
    <div
      className={`nigeria-phone-input ${hasError ? "nigeria-phone-input--error" : ""}`}
    >
      <div className="nigeria-phone-prefix" aria-hidden="true">
        <span className="nigeria-phone-flag" title="Nigeria">
          <svg
            width="22"
            height="16"
            viewBox="0 0 22 16"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
          >
            <rect width="7.333" height="16" fill="#008751" />
            <rect x="7.333" width="7.334" height="16" fill="#fff" />
            <rect x="14.667" width="7.333" height="16" fill="#008751" />
          </svg>
        </span>
        <span className="nigeria-phone-code">+234</span>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        className="form-control ass-field-control nigeria-phone-digits"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-label="Nigeria phone number"
      />
    </div>
  );
}

/** Build E.164 from local digits (strips leading 0 if present). */
export function toNigeriaE164(localDigits: string): string {
  const digits = localDigits.replace(/\D/g, "");
  const national = digits.startsWith("0") ? digits.slice(1) : digits;
  return `+234${national}`;
}

export function isValidNigeriaLocalPhone(localDigits: string): boolean {
  const digits = localDigits.replace(/\D/g, "");
  const national = digits.startsWith("0") ? digits.slice(1) : digits;
  return /^[789]\d{9}$/.test(national) || /^\d{10}$/.test(national);
}
