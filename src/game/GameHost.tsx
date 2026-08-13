import ChoiceGame from "./mechanics/ChoiceGame";
import BuildGame from "./mechanics/BuildGame";
import { SKILL_MECHANIC, type SkillId, type TrialRecord } from "../types/telemetry";

/**
 * Pemilih mekanik: merender ChoiceGame atau BuildGame sesuai mekanik skill.
 * build & recall → susun berurutan (BuildGame); selain itu → pilih ubin (ChoiceGame).
 */
export default function GameHost({
  skillId,
  accent,
  onComplete,
  onBack,
}: {
  skillId: SkillId;
  accent?: string;
  onComplete: (trials: TrialRecord[]) => void;
  onBack?: () => void;
}): JSX.Element {
  const mech = SKILL_MECHANIC[skillId];
  const isBuild = mech === "build" || mech === "recall";
  return isBuild ? (
    <BuildGame skillId={skillId} accent={accent} onComplete={onComplete} onBack={onBack} />
  ) : (
    <ChoiceGame skillId={skillId} accent={accent} onComplete={onComplete} onBack={onBack} />
  );
}
