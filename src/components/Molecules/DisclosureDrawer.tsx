import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "../Atoms/Button";

type DisclosureDrawerProps = {
  children: ReactNode;
  contentClassName: string;
  contentId: string;
  isOpen: boolean;
  onToggle: () => void;
  trigger: (isOpen: boolean) => ReactNode;
  variant: ButtonVariant;
};

export function DisclosureDrawer({
  children,
  contentClassName,
  contentId,
  isOpen,
  onToggle,
  trigger,
  variant,
}: DisclosureDrawerProps) {
  return (
    <div>
      <Button
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={onToggle}
        selected={isOpen}
        type="button"
        variant={variant}
      >
        {trigger(isOpen)}{" "}
        <span aria-hidden="true" className="shrink-0">
          {isOpen ? "−" : "+"}
        </span>
      </Button>
      <div className={contentClassName} hidden={!isOpen} id={contentId}>
        {isOpen ? children : null}
      </div>
    </div>
  );
}
