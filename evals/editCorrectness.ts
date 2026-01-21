/**
 * Edit Correctness Evaluation
 * Verifies that itinerary edits only affect the intended sections:
 * - When editing Day 2, Day 1 and Day 3 should remain unchanged
 * - When updating an activity, other activities should remain unchanged
 */

interface Activity {
  time_slot: 'Morning' | 'Afternoon' | 'Evening';
  poi_name: string;
  duration_minutes: number;
  notes?: string;
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

function deepEqual(obj1: unknown, obj2: unknown): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

function evaluateEditCorrectness(
  before: Itinerary,
  after: Itinerary,
  editedDayNumber: number
): EvalResult {
  const issues: string[] = [];
  let score = 0;
  let maxScore = 0;

  const unchangedDays: number[] = [];
  const changedDays: number[] = [];

  for (const beforeDay of before.days) {
    maxScore += 1;
    const afterDay = after.days.find((d) => d.day_number === beforeDay.day_number);

    if (!afterDay) {
      issues.push(`Day ${beforeDay.day_number} was removed when only Day ${editedDayNumber} should change`);
      continue;
    }

    const isEqual = deepEqual(beforeDay, afterDay);

    if (beforeDay.day_number === editedDayNumber) {
      // This day should have changed
      if (!isEqual) {
        score += 1;
        changedDays.push(beforeDay.day_number);
      } else {
        issues.push(`Day ${editedDayNumber} should have changed but didn't`);
      }
    } else {
      // This day should NOT have changed
      if (isEqual) {
        score += 1;
        unchangedDays.push(beforeDay.day_number);
      } else {
        issues.push(`Day ${beforeDay.day_number} changed when only Day ${editedDayNumber} should change`);
        changedDays.push(beforeDay.day_number);
      }
    }
  }

  // Check for new days added
  for (const afterDay of after.days) {
    if (!before.days.find((d) => d.day_number === afterDay.day_number)) {
      issues.push(`Day ${afterDay.day_number} was unexpectedly added`);
    }
  }

  return {
    passed: issues.length === 0,
    score: maxScore > 0 ? score / maxScore : 1,
    issues,
    details: {
      editedDay: editedDayNumber,
      unchangedDays,
      changedDays,
    },
  };
}

function evaluateActivityEditCorrectness(
  before: Day,
  after: Day,
  editedActivityName: string
): EvalResult {
  const issues: string[] = [];
  let score = 0;
  let maxScore = 0;

  for (const beforeActivity of before.activities) {
    maxScore += 1;
    const afterActivity = after.activities.find(
      (a) => a.poi_name === beforeActivity.poi_name
    );

    if (!afterActivity && beforeActivity.poi_name !== editedActivityName) {
      issues.push(
        `Activity "${beforeActivity.poi_name}" was removed when only "${editedActivityName}" should change`
      );
      continue;
    }

    if (beforeActivity.poi_name === editedActivityName) {
      // This activity should have changed or been removed
      if (!afterActivity || !deepEqual(beforeActivity, afterActivity)) {
        score += 1;
      } else {
        issues.push(`Activity "${editedActivityName}" should have changed but didn't`);
      }
    } else if (afterActivity) {
      // This activity should NOT have changed
      if (deepEqual(beforeActivity, afterActivity)) {
        score += 1;
      } else {
        issues.push(
          `Activity "${beforeActivity.poi_name}" changed when only "${editedActivityName}" should change`
        );
      }
    }
  }

  return {
    passed: issues.length === 0,
    score: maxScore > 0 ? score / maxScore : 1,
    issues,
    details: {
      editedActivity: editedActivityName,
      beforeCount: before.activities.length,
      afterCount: after.activities.length,
    },
  };
}

// Test cases
const testCases = [
  {
    name: 'Day 2 edit should not affect Day 1 and 3',
    before: {
      destination: 'Jaipur',
      days: [
        {
          day_number: 1,
          activities: [
            { time_slot: 'Morning' as const, poi_name: 'Hawa Mahal', duration_minutes: 90 },
          ],
        },
        {
          day_number: 2,
          activities: [
            { time_slot: 'Morning' as const, poi_name: 'Amber Fort', duration_minutes: 180 },
          ],
        },
        {
          day_number: 3,
          activities: [
            { time_slot: 'Morning' as const, poi_name: 'City Palace', duration_minutes: 120 },
          ],
        },
      ],
    },
    after: {
      destination: 'Jaipur',
      days: [
        {
          day_number: 1,
          activities: [
            { time_slot: 'Morning' as const, poi_name: 'Hawa Mahal', duration_minutes: 90 },
          ],
        },
        {
          day_number: 2,
          activities: [
            { time_slot: 'Morning' as const, poi_name: 'Amber Fort', duration_minutes: 120 }, // Changed duration
            { time_slot: 'Afternoon' as const, poi_name: 'Jal Mahal', duration_minutes: 60 }, // Added
          ],
        },
        {
          day_number: 3,
          activities: [
            { time_slot: 'Morning' as const, poi_name: 'City Palace', duration_minutes: 120 },
          ],
        },
      ],
    },
    editedDay: 2,
    shouldPass: true,
  },
  {
    name: 'Day 2 edit incorrectly affects Day 1',
    before: {
      destination: 'Jaipur',
      days: [
        {
          day_number: 1,
          activities: [
            { time_slot: 'Morning' as const, poi_name: 'Hawa Mahal', duration_minutes: 90 },
          ],
        },
        {
          day_number: 2,
          activities: [
            { time_slot: 'Morning' as const, poi_name: 'Amber Fort', duration_minutes: 180 },
          ],
        },
      ],
    },
    after: {
      destination: 'Jaipur',
      days: [
        {
          day_number: 1,
          activities: [
            { time_slot: 'Morning' as const, poi_name: 'Hawa Mahal', duration_minutes: 60 }, // Changed!
          ],
        },
        {
          day_number: 2,
          activities: [
            { time_slot: 'Morning' as const, poi_name: 'Amber Fort', duration_minutes: 120 },
          ],
        },
      ],
    },
    editedDay: 2,
    shouldPass: false,
  },
];

function runEvals() {
  console.log('=== Edit Correctness Evaluation ===\n');

  let totalPassed = 0;

  testCases.forEach((testCase, index) => {
    const result = evaluateEditCorrectness(
      testCase.before,
      testCase.after,
      testCase.editedDay
    );

    const expectedResult = testCase.shouldPass;
    const actuallyCorrect = result.passed === expectedResult;

    console.log(`Test Case ${index + 1}: "${testCase.name}"`);
    console.log(`  Expected: ${expectedResult ? 'PASS' : 'FAIL'}, Got: ${result.passed ? 'PASS' : 'FAIL'}`);
    console.log(`  Test ${actuallyCorrect ? 'CORRECT ✓' : 'INCORRECT ✗'}`);
    console.log(`  Score: ${(result.score * 100).toFixed(0)}%`);

    if (result.issues.length > 0) {
      console.log('  Issues found:');
      result.issues.forEach((issue) => console.log(`    - ${issue}`));
    }
    console.log();

    if (actuallyCorrect) totalPassed++;
  });

  console.log('=== Summary ===');
  console.log(`Tests Correct: ${totalPassed}/${testCases.length}`);

  if (totalPassed < testCases.length) {
    process.exit(1);
  }
}

runEvals();

export { evaluateEditCorrectness, evaluateActivityEditCorrectness, EvalResult };
