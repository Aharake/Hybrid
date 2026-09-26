import React from 'react';
import { NewSessionSheet } from './NewSessionSheet';
import { RunTrackerOverlay } from './RunTrackerOverlay';
import { RunSetupSheet } from './RunSetupSheet';
import { WorkoutSummaryOverlay } from './WorkoutSummaryOverlay';
import { HealthConnectPrompt } from './HealthConnectPrompt';

// The "+" button lives on every tab-bar screen and can start a run or a
// workout from anywhere, so these are mounted once above the whole stack —
// mounting them per screen left some screens (and the run overlay) missing.
export function TrackerOverlays() {
  return (
    <>
      <NewSessionSheet />
      <RunTrackerOverlay />
      <RunSetupSheet />
      <WorkoutSummaryOverlay />
      <HealthConnectPrompt />
    </>
  );
}
