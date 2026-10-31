import { useState } from "react";

type WeightInputProps = {
  "aria-label": string;
  className: string;
  disabled?: boolean;
  onBlur?: () => void;
  onValueChange: (value: number | null) => void;
  placeholder: string;
  value: number | null;
};

export function WeightInput({
  "aria-label": ariaLabel,
  className,
  disabled,
  onBlur,
  onValueChange,
  placeholder,
  value,
}: WeightInputProps) {
  const [draftValue, setDraftValue] = useState(value?.toString() ?? "");
  const [isFocused, setIsFocused] = useState(false);

  return (
    <input
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      inputMode="decimal"
      min={0}
      onFocus={() => {
        setDraftValue(value?.toString() ?? "");
        setIsFocused(true);
      }}
      onBlur={() => {
        if (draftValue !== "") {
          const numericValue = Number(draftValue);
          setDraftValue(
            Number.isFinite(numericValue)
              ? numericValue.toString()
              : (value?.toString() ?? ""),
          );
        }
        setIsFocused(false);
        onBlur?.();
      }}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraftValue(nextValue);
        onValueChange(
          nextValue === ""
            ? null
            : Number.isFinite(Number(nextValue))
              ? Number(nextValue)
              : value,
        );
      }}
      placeholder={placeholder}
      step="any"
      type="number"
      value={isFocused ? draftValue : (value?.toString() ?? "")}
    />
  );
}
