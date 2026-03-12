import {
  getRiskZoneData,
  getCourseRiskFlags,
  getAllRiskScores,
  getSemesters,
} from "./actions";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage() {
  const [riskZone, courseFlags, allScores, semesters] = await Promise.all([
    getRiskZoneData(),
    getCourseRiskFlags(),
    getAllRiskScores(),
    getSemesters(),
  ]);

  return (
    <AnalyticsClient
      riskZone={riskZone}
      courseFlags={courseFlags}
      allScores={allScores}
      semesters={semesters}
    />
  );
}
