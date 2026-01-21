/**
 * Grounding Evaluation
 * Verifies that POIs and citations in itineraries are valid:
 * - POI IDs exist in the dataset
 * - Sources are properly attributed
 * - No fabricated locations
 */

import fs from 'fs';
import path from 'path';

interface Activity {
  time_slot: 'Morning' | 'Afternoon' | 'Evening';
  poi_name: string;
  poi_id?: string;
  duration_minutes: number;
  source?: string;
}

interface Day {
  day_number: number;
  activities: Activity[];
}

interface Source {
  id: string;
  type: 'osm' | 'wikivoyage' | 'google';
  title: string;
}

interface Itinerary {
  destination: string;
  days: Day[];
  sources: Source[];
}

interface POIData {
  id: string;
  name: string;
  category: string;
}

interface EvalResult {
  passed: boolean;
  score: number;
  issues: string[];
  details: Record<string, unknown>;
}

// Load POI dataset
function loadPOIDataset(): Map<string, POIData> {
  const poiMap = new Map<string, POIData>();

  try {
    const dataPath = path.join(__dirname, '../data/jaipur/pois.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    for (const poi of data.pois) {
      poiMap.set(poi.id, poi);
      // Also index by lowercase name for fuzzy matching
      poiMap.set(poi.name.toLowerCase(), poi);
    }
  } catch (error) {
    console.warn('Could not load POI dataset, using fallback');

    // Fallback POI list
    const fallbackPOIs = [
      { id: 'osm_1', name: 'Hawa Mahal', category: 'attraction' },
      { id: 'osm_2', name: 'Amber Fort', category: 'attraction' },
      { id: 'osm_3', name: 'City Palace', category: 'attraction' },
      { id: 'osm_4', name: 'Jantar Mantar', category: 'attraction' },
      { id: 'osm_5', name: 'Nahargarh Fort', category: 'attraction' },
      { id: 'osm_6', name: 'Albert Hall Museum', category: 'museum' },
      { id: 'osm_7', name: 'Birla Mandir', category: 'temple' },
      { id: 'osm_8', name: 'Galtaji Temple', category: 'temple' },
      { id: 'osm_9', name: 'Johari Bazaar', category: 'market' },
      { id: 'osm_10', name: 'Bapu Bazaar', category: 'market' },
      { id: 'osm_11', name: 'LMB (Laxmi Mishthan Bhandar)', category: 'restaurant' },
      { id: 'osm_12', name: 'Rawat Mishtan Bhandar', category: 'restaurant' },
      { id: 'osm_13', name: 'Chokhi Dhani', category: 'restaurant' },
      { id: 'osm_14', name: 'Jal Mahal', category: 'attraction' },
      { id: 'osm_15', name: 'Sisodia Rani Garden', category: 'park' },
    ];

    for (const poi of fallbackPOIs) {
      poiMap.set(poi.id, poi);
      poiMap.set(poi.name.toLowerCase(), poi);
    }
  }

  return poiMap;
}

const VALID_SOURCES = ['OpenStreetMap', 'Wikivoyage', 'Local Guide', 'osm', 'wikivoyage'];

function evaluateGrounding(itinerary: Itinerary, poiDataset: Map<string, POIData>): EvalResult {
  const issues: string[] = [];
  let groundedActivities = 0;
  let totalActivities = 0;
  let citedSources = 0;
  let totalSources = 0;

  const verifiedPOIs: string[] = [];
  const unverifiedPOIs: string[] = [];

  // Check each activity
  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      totalActivities++;

      // Check if POI exists in dataset
      let isGrounded = false;

      if (activity.poi_id && poiDataset.has(activity.poi_id)) {
        isGrounded = true;
      } else if (poiDataset.has(activity.poi_name.toLowerCase())) {
        isGrounded = true;
      }

      if (isGrounded) {
        groundedActivities++;
        verifiedPOIs.push(activity.poi_name);
      } else {
        unverifiedPOIs.push(activity.poi_name);
        issues.push(
          `Day ${day.day_number}: POI "${activity.poi_name}" not found in dataset`
        );
      }

      // Check source citation
      if (activity.source) {
        totalSources++;
        if (VALID_SOURCES.includes(activity.source)) {
          citedSources++;
        } else {
          issues.push(
            `Day ${day.day_number}: Invalid source "${activity.source}" for ${activity.poi_name}`
          );
        }
      }
    }
  }

  // Check itinerary-level sources
  if (itinerary.sources) {
    for (const source of itinerary.sources) {
      if (!['osm', 'wikivoyage', 'google'].includes(source.type)) {
        issues.push(`Invalid source type: ${source.type}`);
      }
    }
  }

  // Calculate score
  const groundingScore = totalActivities > 0 ? groundedActivities / totalActivities : 1;
  const citationScore = totalSources > 0 ? citedSources / totalSources : 1;
  const overallScore = (groundingScore + citationScore) / 2;

  // Pass if at least 80% are grounded
  const passed = groundingScore >= 0.8;

  return {
    passed,
    score: overallScore,
    issues,
    details: {
      totalActivities,
      groundedActivities,
      groundingRate: `${(groundingScore * 100).toFixed(0)}%`,
      citedSources,
      totalSources,
      citationRate: totalSources > 0 ? `${(citationScore * 100).toFixed(0)}%` : 'N/A',
      verifiedPOIs,
      unverifiedPOIs,
    },
  };
}

// Test cases
const testItineraries: Itinerary[] = [
  // Well-grounded itinerary
  {
    destination: 'Jaipur',
    days: [
      {
        day_number: 1,
        activities: [
          {
            time_slot: 'Morning',
            poi_name: 'Hawa Mahal',
            poi_id: 'osm_1',
            duration_minutes: 90,
            source: 'OpenStreetMap',
          },
          {
            time_slot: 'Afternoon',
            poi_name: 'City Palace',
            poi_id: 'osm_3',
            duration_minutes: 120,
            source: 'Wikivoyage',
          },
          {
            time_slot: 'Evening',
            poi_name: 'Nahargarh Fort',
            poi_id: 'osm_5',
            duration_minutes: 90,
            source: 'OpenStreetMap',
          },
        ],
      },
    ],
    sources: [
      { id: 'osm_1', type: 'osm', title: 'Hawa Mahal' },
      { id: 'osm_3', type: 'osm', title: 'City Palace' },
    ],
  },
  // Poorly grounded itinerary (fabricated locations)
  {
    destination: 'Jaipur',
    days: [
      {
        day_number: 1,
        activities: [
          {
            time_slot: 'Morning',
            poi_name: 'Hawa Mahal',
            poi_id: 'osm_1',
            duration_minutes: 90,
            source: 'OpenStreetMap',
          },
          {
            time_slot: 'Afternoon',
            poi_name: 'Fake Palace of Dreams', // Fabricated
            duration_minutes: 120,
          },
          {
            time_slot: 'Evening',
            poi_name: 'Imaginary Garden', // Fabricated
            duration_minutes: 90,
          },
        ],
      },
    ],
    sources: [],
  },
];

function runEvals() {
  console.log('=== Grounding Evaluation ===\n');

  const poiDataset = loadPOIDataset();
  console.log(`Loaded ${poiDataset.size / 2} POIs in dataset\n`); // Divided by 2 because we index by both ID and name

  let totalPassed = 0;
  const results: EvalResult[] = [];

  testItineraries.forEach((itinerary, index) => {
    const result = evaluateGrounding(itinerary, poiDataset);
    results.push(result);

    console.log(`Test Case ${index + 1}: ${result.passed ? 'PASSED ✓' : 'FAILED ✗'}`);
    console.log(`  Grounding Rate: ${result.details.groundingRate}`);
    console.log(`  Citation Rate: ${result.details.citationRate}`);
    console.log(`  Overall Score: ${(result.score * 100).toFixed(0)}%`);

    if (result.details.verifiedPOIs) {
      console.log(`  Verified POIs: ${(result.details.verifiedPOIs as string[]).join(', ')}`);
    }

    if ((result.details.unverifiedPOIs as string[]).length > 0) {
      console.log(`  Unverified POIs: ${(result.details.unverifiedPOIs as string[]).join(', ')}`);
    }

    if (result.issues.length > 0) {
      console.log('  Issues:');
      result.issues.forEach((issue) => console.log(`    - ${issue}`));
    }
    console.log();

    if (result.passed) totalPassed++;
  });

  console.log('=== Summary ===');
  console.log(`Passed: ${totalPassed}/${testItineraries.length}`);
  console.log(
    `Average Grounding Score: ${(
      results.reduce((sum, r) => sum + r.score, 0) / results.length * 100
    ).toFixed(0)}%`
  );

  // Don't exit with error for this eval - it's testing both good and bad cases
}

runEvals();

export { evaluateGrounding, loadPOIDataset, EvalResult };
