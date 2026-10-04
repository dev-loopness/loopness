import { ArrowCounterClockwise, CheckCircle, Clock } from "@phosphor-icons/react/dist/ssr";
import type { SubmissionStatus } from "@/lib/store";

const MAP = {
  queued: { label: "In queue", cls: "", Icon: Clock },
  reviewed: { label: "Reviewed", cls: "ok", Icon: CheckCircle },
  needs_revision: { label: "Needs revision", cls: "warn", Icon: ArrowCounterClockwise },
} as const;

export function StatusPill({ status }: { status: SubmissionStatus }) {
  const { label, cls, Icon } = MAP[status];
  return (
    <span className={`pill ${cls}`}>
      <Icon size={12} weight="bold" aria-hidden="true" />
      {label}
    </span>
  );
}
