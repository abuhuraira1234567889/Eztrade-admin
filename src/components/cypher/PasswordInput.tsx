"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className = "", wrapperClassName, ...props }, ref) {
    const { t } = useTranslation("common");
    const [visible, setVisible] = useState(false);

    return (
      <div className={["relative", wrapperClassName].filter(Boolean).join(" ")}>
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={["pr-10", className].filter(Boolean).join(" ")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? t("passwordInput.hide") : t("passwordInput.show")}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    );
  },
);
