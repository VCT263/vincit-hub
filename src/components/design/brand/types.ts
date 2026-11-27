import type { Step } from "@/lib/design";
export type StepProps = { d: any; set: (patch: any) => void; id: string; go: (s: Step) => void };
