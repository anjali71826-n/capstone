# Sample Transcript: Voice-Based Editing

**Scenario**: User has an existing itinerary and makes voice edits to modify specific parts.

---

## Starting State

User already has a 3-day Jaipur itinerary from the previous conversation.

## Conversation

**[00:00] User**: Make Day 2 more relaxed.

*[Tool Call: update_itinerary - action: "update_activity", day_number: 2, poi_name: "Amber Fort", duration_minutes: 120]*
*[Tool Call: update_itinerary - action: "remove_activity", day_number: 2, poi_name: "Jal Mahal"]*

**[00:05] Assistant**: Done. I've shortened Amber Fort to 2 hours and removed the Jal Mahal stop. Day 2 now has just two activities - Amber Fort in the morning and Chokhi Dhani in the evening. That gives you time to rest in the afternoon.

**[00:12] User**: Swap the Day 1 evening plan to something indoors.

*[Tool Call: poi_search - destination: "Jaipur", category: "restaurant"]*
*[Tool Call: update_itinerary - action: "update_activity", day_number: 1, time_slot: "Evening", poi_name: "Peacock Rooftop Restaurant", notes: "Rooftop dining with AC section available"]*

**[00:18] Assistant**: Done. I've replaced Johari Bazaar with Peacock Rooftop Restaurant - it has an air-conditioned section and great views of Hawa Mahal. Day 1 is unchanged except for the evening.

**[00:25] User**: Add a famous local food place to Day 3.

*[Tool Call: poi_search - destination: "Jaipur", category: "restaurant", interests: ["local", "famous"]]*
*[Tool Call: update_itinerary - action: "add_activity", day_number: 3, time_slot: "Morning", poi_name: "Rawat Mishtan Bhandar", duration_minutes: 45, notes: "Best pyaaz kachori in Jaipur - breakfast spot"]*

**[00:32] Assistant**: Added Rawat Mishtan Bhandar to Day 3 morning - it's famous for the best pyaaz kachori in Jaipur. Perfect breakfast before heading to Birla Mandir.

**[00:38] User**: Reduce travel time on Day 1.

*[Tool Call: calculate_travel_time - destination: "Jaipur", from_poi: "Hawa Mahal", to_poi: "City Palace"]*

**[00:42] Assistant**: Good news - Day 1 already has minimal travel. Hawa Mahal, City Palace, and LMB are all within walking distance in the Pink City area - about 5-10 minutes between each. No changes needed.

---

## Edit Verification

### Before Edits (Day 2):
```json
{
  "day_number": 2,
  "activities": [
    {"time_slot": "Morning", "poi_name": "Amber Fort", "duration_minutes": 180},
    {"time_slot": "Afternoon", "poi_name": "Jal Mahal", "duration_minutes": 45},
    {"time_slot": "Evening", "poi_name": "Chokhi Dhani", "duration_minutes": 180}
  ]
}
```

### After Edits (Day 2):
```json
{
  "day_number": 2,
  "activities": [
    {"time_slot": "Morning", "poi_name": "Amber Fort", "duration_minutes": 120},
    {"time_slot": "Evening", "poi_name": "Chokhi Dhani", "duration_minutes": 180}
  ]
}
```

### Verification: Day 1 and Day 3 Unchanged?

| Day | Before Edit | After Edit | Changed? |
|-----|-------------|------------|----------|
| Day 1 | 4 activities | 4 activities (evening swapped) | Only evening changed |
| Day 2 | 3 activities | 2 activities | Expected changes |
| Day 3 | 3 activities | 4 activities (breakfast added) | Only morning added |

## Tool Calls Summary

| Edit Request | Tool Used | Action | Scope |
|--------------|-----------|--------|-------|
| "Make Day 2 more relaxed" | update_itinerary | update + remove | Day 2 only |
| "Swap Day 1 evening to indoors" | update_itinerary | update | Day 1 evening only |
| "Add local food to Day 3" | update_itinerary | add_activity | Day 3 morning only |
| "Reduce travel time Day 1" | calculate_travel_time | query only | No changes |

## Edit Correctness Evaluation

Running `npm run eval:edit` would verify:

```
Test: Day 2 edit should not affect Day 1 and 3
  - Day 1: UNCHANGED (except intended evening swap) ✓
  - Day 2: CHANGED as expected ✓
  - Day 3: UNCHANGED (except intended addition) ✓
  
Result: PASS
```

## Key Behaviors Demonstrated

1. **Targeted edits**: Only the specified day/slot was modified
2. **Context awareness**: "More relaxed" interpreted as fewer activities + shorter durations
3. **Smart suggestions**: Indoor alternative included AC option
4. **No unnecessary changes**: Travel time query didn't modify anything when not needed
5. **Additive changes**: New activity slotted into appropriate time without disrupting others
