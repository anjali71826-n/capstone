# Sample Test Transcripts

This folder contains sample conversation transcripts demonstrating the capabilities of the Voice-First AI Travel Planner.

## Transcripts

### 1. [Basic Trip Planning](01-basic-trip-planning.md)
Demonstrates the full trip planning flow:
- Collecting preferences (destination, duration, interests, pace)
- Generating a complete itinerary
- Providing practical travel tips

### 2. [Voice-Based Editing](02-voice-editing.md)
Demonstrates targeted itinerary modifications:
- "Make Day 2 more relaxed"
- "Swap the evening plan to something indoors"
- "Add a local food place"
- Verifies only intended sections change

### 3. [Explanations and Reasoning](03-explanations-and-reasoning.md)
Demonstrates grounded explanations:
- "Why did you pick this place?"
- "Is this plan doable?"
- "What if it rains?"
- All answers cite sources (Wikivoyage, OSM, weather API)

## Transcript Format

Each transcript includes:
- **Conversation**: The actual dialogue with timestamps
- **Tool Calls**: Which tools were invoked and with what parameters
- **Generated Data**: The resulting itinerary or modifications
- **Evaluation Criteria**: How the conversation meets requirements

## Using These Transcripts

### For Testing
Use these as reference for manual testing:
```bash
# Start the application
npm run dev

# Follow the conversation flow and verify:
# 1. Voice input is recognized
# 2. Tool calls match expected behavior
# 3. UI updates correctly
# 4. Sources are displayed
```

### For Evaluation
These transcripts demonstrate scenarios that pass the evaluation criteria:

| Transcript | Eval Type | Expected Result |
|------------|-----------|-----------------|
| 01-basic-trip-planning | Feasibility | PASS - activities ≤ 4, hours ≤ 10 |
| 02-voice-editing | Edit Correctness | PASS - only targeted sections change |
| 03-explanations | Grounding | PASS - all claims have sources |

### For Demo
These transcripts can be used as a script for the demo video:
1. Start with transcript 1 to show basic planning
2. Use transcript 2 to show editing capabilities
3. Use transcript 3 to show explanations and reasoning
