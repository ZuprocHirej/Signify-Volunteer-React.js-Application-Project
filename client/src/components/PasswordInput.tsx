import { useState } from "react";

type PasswordInputProps = {
  id: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
};

function PasswordInput({ id, autoComplete, value, onChange }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        id={id}
        type={isVisible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        className="password-visibility-toggle"
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((visible) => !visible)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isVisible ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c5 0 8.5 4 9.8 6a11.7 11.7 0 0 1-4 4.2" />
              <path d="M6.2 6.2C4.3 7.4 3 9.2 2.2 10.5 3.5 12.5 7 16 12 16c.7 0 1.4-.1 2-.2" />
            </>
          ) : (
            <>
              <path d="M2.2 10.5C3.5 8.5 7 5 12 5s8.5 3.5 9.8 5.5C20.5 12.5 17 16 12 16s-8.5-3.5-9.8-5.5Z" />
              <circle cx="12" cy="10.5" r="2.5" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

export default PasswordInput;