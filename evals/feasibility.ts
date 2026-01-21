/**
 * Feasibility Evaluation
 * Checks that itineraries are realistic and achievable:
 * - Activities per day ≤ 4
 * - Total time per day ≤ 10 hours
 * - Travel times between activities are reasonable
 */

import fs from 'fs';
import path from 'path';

interface Activity {
  time_slot: 'Morning' | 'Afternoon' | 'Evening';
  poi_name: string;
  duration_minutes: number;
  travel_time_to_next?: number;
}

interface Day {
  day_number: number;
  activities: Activity[];
}

interface Itinerary {
  destination: string;
  days: Day[];
}

interface EvalResult {
  passed: boolean;
  score: number;
  issues: string[];
  details: Record<string, unknown>;
}

const MAX_ACTIVITIES_PER_DAY = 4;
const MAX_HOURS_PER_DAY = 10;
const MAX_TRAVEL_TIME_MINUTES = 60;

function evaluateFeasibility(itinerary: Itinerary): EvalResult {
  const issues: string[] = [];
  let totalScore = 0;
  let maxScore = 0;

  const dayDetails: Record<number, unknown> = {};

  for (const day of itinerary.days) {
    maxScore += 3; // 3 checks per day

    const activityCount = day.activities.length;
    const totalMinutes = day.activities.reduce((sum, act) => {
      return sum + act.duration_minutes + (act.travel_time_to_next || 0);
    }, 0);
    const totalHours = totalMinutes / 60;

    // Check 1: Activity count
    if (activityCount <= MAX_ACTIVITIES_PER_DAY) {
      totalScore += 1;
    } else {
      issues.push(
        `Day ${day.day_number}: ${activityCount} activities exceeds max of ${MAX_ACTIVITIES_PER_DAY}`
      );
    }

    // Check 2: Total time
    if (totalHours <= MAX_HOURS_PER_DAY) {
      totalScore += 1;
    } else {
      issues.push(
        `Day ${day.day_number}: ${totalHours.toFixed(1)} hours exceeds max of ${MAX_HOURS_PER_DAY}`
      );
    }

    // Check 3: Travel times
    let travelTimeOk = true;
    for (const activity of day.activities) {
      if (
        activity.travel_time_to_next &&
        activity.travel_time_to_next > MAX_TRAVEL_TIME_MINUTES
      ) {
        issues.push(
          `Day ${day.day_number}: Travel time from ${activity.poi_name} (${activity.travel_time_to_next} min) exceeds max of ${MAX_TRAVEL_TIME_MINUTES}`
        );
        travelTimeOk = false;
      }
    }
    if (travelTimeOk) {
      totalScore += 1;
    }

    dayDetails[day.day_number] = {
      activityCount,
      totalHours: totalHours.toFixed(1),
      passed: activityCount <= MAX_ACTIVITIES_PER_DAY && totalHours <= MAX_HOURS_PER_DAY,
    };
  }

  const score = maxScore > 0 ? totalScore / maxScore : 1;

  return {
    passed: issues.length === 0,
    score,
    issues,
    details: {
      daysEvaluated: itinerary.days.length,
      dayDetails,
      criteria: {
        maxActivitiesPerDay: MAX_ACTIVITIES_PER_DAY,
        maxHoursPerDay: MAX_HOURS_PER_DAY,
        maxTravelTimeMinutes: MAX_TRAVEL_TIME_MINUTES,
      },
    },
  };
}

// Test cases
interface TestCase extends Itinerary {
  shouldPass: boolean;
  name: string;
}

const testItineraries: TestCase[] = [
  // Valid itinerary
  {
    name: 'Valid Itinerary',
    shouldPass: true,
    destination: 'Jaipur',
    days: [
      {
        day_number: 1,
        activities: [
          { time_slot: 'Morning', poi_name: 'Hawa Mahal', duration_minutes: 90, travel_time_to_next: 15 },
          { time_slot: 'Afternoon', poi_name: 'City Palace', duration_minutes: 120, travel_time_to_next: 10 },
          { time_slot: 'Evening', poi_name: 'Nahargarh Fort', duration_minutes: 90 },
        ],
      },
    ],
  },
  // Invalid - too many activities
  {
    name: 'Invalid - Too many activities',
    shouldPass: false,
    destination: 'Jaipur',
    days: [
      {
        day_number: 1,
        activities: [
          { time_slot: 'Morning', poi_name: 'A', duration_minutes: 60 },
          { time_slot: 'Morning', poi_name: 'B', duration_minutes: 60 },
          { time_slot: 'Afternoon', poi_name: 'C', duration_minutes: 60 },
          { time_slot: 'Afternoon', poi_name: 'D', duration_minutes: 60 },
          { time_slot: 'Evening', poi_name: 'E', duration_minutes: 60 },
        ],
      },
    ],
  },
  // Invalid - too long
  {
    name: 'Invalid - Too long duration',
    shouldPass: false,
    destination: 'Jaipur',
    days: [
      {
        day_number: 1,
        activities: [
          { time_slot: 'Morning', poi_name: 'A', duration_minutes: 180, travel_time_to_next: 45 },
          { time_slot: 'Afternoon', poi_name: 'B', duration_minutes: 180, travel_time_to_next: 45 },
          { time_slot: 'Evening', poi_name: 'C', duration_minutes: 180 },
        ],
      },
    ],
  },
];

function runEvals() {
  console.log('=== Feasibility Evaluation ===\n');

  let totalPassed = 0;
  const results: EvalResult[] = [];

  testItineraries.forEach((testCase, index) => {
    const result = evaluateFeasibility(testCase);
    results.push(result);

    const passed = result.passed === testCase.shouldPass;
    if (passed) totalPassed++;

    console.log(`Test Case ${index + 1}: ${testCase.name}`);
    console.log(`  Expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'}, Got: ${result.passed ? 'PASS' : 'FAIL'}`);
    console.log(`  Status: ${passed ? 'CORRECT ✓' : 'INCORRECT ✗'}`);
    console.log(`  Score: ${(result.score * 100).toFixed(0)}%`);

    if (result.issues.length > 0) {
      console.log('  Issues found:');
      result.issues.forEach((issue) => console.log(`    - ${issue}`));
    }
    console.log();
  });

  console.log('=== Summary ===');
  console.log(`Tests Correct: ${totalPassed}/${testItineraries.length}`);
  console.log(
    `Average Feasibility Score: ${(results.reduce((sum, r) => sum + r.score, 0) / results.length * 100).toFixed(0)}%`
  );

  // Exit with error code if any failed
  if (totalPassed < testItineraries.length) {
    process.exit(1);
  }
}

// Run if executed directly
runEvals();

export { evaluateFeasibility, EvalResult };
