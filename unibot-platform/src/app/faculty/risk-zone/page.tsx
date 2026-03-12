import { getFacultyRiskScores } from "./actions";
import { RiskZoneClient } from "./risk-zone-client";

export default async function FacultyRiskZonePage() {
  const riskScores = await getFacultyRiskScores();

  return <RiskZoneClient riskScores={riskScores} />;
}
