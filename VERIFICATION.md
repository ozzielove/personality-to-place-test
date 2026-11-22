# Scoring Verification — November 22, 2026

The checks below were run on the 563-question Personality-to-Place Inventory. You can re-run the automated part at any time with `python3 build/verify.py`. That script reads only the rendered Markdown and re-implements the scoring rules exactly as the Scoring Methodology states them. Final result: **6,434 checks passed, 0 failed.**

## Checks run

**Questions**
- There are 563 questions, numbered 1–563 with no gaps.
- Every question's options are consecutive letters (A–D, or A–E).

**Personality key (Q1–216)**
- Every question has a key row, and every option letter is keyed: no missing or extra letters.
- Multiple-choice items follow a symmetric 2/1/1/2 ladder, and Likert items follow 2/1/0/1/2.
- All poles are valid for the item's dimension.
- Each pole can reach the stated maximum: 96 per dimension, 48 for A/T.
- All 216 items, including the reversed-order ones, were read by hand against the option text. The pole direction matches the wording in every case.

**Place-fit scales (Q217–563)**
- Every key cell exists only for real options, and all values are 0–10.
- Likert rows are 0–4.
- Each scale's question list in the Scale Feed Summary matches the answer key exactly.
- The maximums in the summary were recomputed.
- Every option's point direction was read against its wording.

**Narrative items**
- 29 questions are listed as narrative (not scored).
- They are exactly the questions in 217–563 that have no key row.

**Dealbreakers and priorities**
- DB codes come only from Q546–561.
- Every DB code has a filter rule, and every filter rule can be reached from a question.
- Filters use only real database fields.
- Q562–563 map to the five priority groups.
- Every subculture tag used in the quiz exists in the database.

**Location database (73 entries)**
- Every entry has all 20 ratings in 0–10, plus valid ZIP, type, snow, coast, and air fields.
- Row numbers and ZIP codes agree across Tables A–D.
- No duplicate locations, ZIP codes, or rating vectors.

**ZIP codes**
- All 73 ZIP codes were checked against a public ZIP database (api.zippopotam.us). Each one is in the stated city and state.
  - 97703, Bend, is newer than that dataset. The USPS 2015 notice shows that downtown Bend is in 97703.
  - 32162 is listed under its postal name, Lady Lake. The Villages uses that ZIP.
- 16 neighborhood-level ZIP codes were also confirmed by web search: Bend 97703, Kerrytown 48104, Sam Hughes 85719, Silver Lake 90026, Old Northeast St. Pete 33701, Dundee 68132, Brookside 64113, Bywater 70117, Kaimuki 96816, North Shore Chattanooga 37405, The Highlands 40204, Lyn-Lake 55408, Munjoy Hill 04101, Alamo Heights 78209, Montrose 77006, and Clarendon 22201.
- No ZIP code was wrong.

**Worked examples**
The three worked examples (INFP-T, ESTJ-A, ENTP-A) were recomputed independently from the written rules and the printed database tables. That covered:
- the tallies, percentages, clarity bands, and type
- the item-by-item worked scale
- the dealbreaker survivors and the weights
- every Base Fit, bonus, and Final Fit in each top-five table
- tie-breaks
- the Base Fit arithmetic table
- the top match and both runners-up

## Errors found and fixed

1. **Place-fit maximum rule (the main fix).**
   - The old rule divided by the highest number in each answer-key row. But the key's numbers are positions on the 0–10 scale, and 270 of the 524 multiple-choice rows never reach 10. So middle or low answers were inflated to full marks. For example:
     - Q539 B (MTN 3) scored as MTN 10.
     - Q528 D (FAITH 4) scored as FAITH 10.
     - Q366 D (URB 6) scored as URB 10.
     - Q323 C (MTN 0) had no effect at all.
   - The new rule is: maximum available = 10 for each scored multiple-choice row, and 4 for each scored Likert row. The scale score is therefore the average position of your answers on the 0–10 scale.
   - The Step 3 text, the worked COST example, the Scale Feed Summary (it now shows item types and the corrected maximums), and the worked-scale tables were all updated to match.
2. **Clarity bands had gaps.** Values such as 55.5% or 65.8% fell between bands. For example, 65.8% was printed as "Clear" even though the text said 56–65% is Moderate. The percentage is now rounded to a whole number first (halves round up), and the same rounded number is used for the 56% affinity threshold.
3. **The sample type report was wrong.** It said "P Moderate 66%", but 66% is Clear. It now reads "P Moderate 63%".
4. **Missing statements were added:**
   - the maximum points per dimension (96, or 48 for A/T)
   - the A/T tie-break (T)
   - the 0-point case
   - a note that some option orders are reversed on purpose
   - how to round scale scores for matching (whole numbers, halves rounding up)
5. **Priority rule bug.** The text says that if PRI1 and PRI2 are the same, only the ×2.0 multiplier applies, but the code applied ×3.0. The code was fixed. None of the examples was affected.
6. **Q294 counted "prefer not to say" as Retired.** That gave a RETIRE tag to people who preferred not to answer, which contradicts the rule that "prefer not to say" is never scored. Now "retired" is part of option D, and E is a plain, unscored "Prefer not to say."
7. **Part XV intro** pointed to "Step 4" for dealbreakers. It now points to Step 6.
8. **Part VIII and Part IX intros** claimed every question has a "Prefer not to say" option, which is not true. The wording was corrected, and it now says skipped questions are not scored.
9. **Alamo Heights** is its own city inside San Antonio. Its city is now listed as "Alamo Heights (San Antonio area)".
10. **Worked-example scale derivation.** It now uses the fixed maximums and lets a sample person pick an unscored option when no scored option fits. Rounding is half-up. As a result, Maya's FOREST is now 9.3, used as 9 (it was 10.0), and Daniel's COST is 6.1, used as 6.

## Effect on the worked examples

The top match and both runners-up are unchanged for all three examples:
- **Maya (INFP-T):** SE Portland 97214, then West Asheville 28806, then Capitol Hill Seattle 98102. Maya's scores moved slightly (101.1 / 99.3 / 91.8, previously 100.4 / 99.6 / 91.1) because her FOREST score is now 9.
- **Daniel (ESTJ-A):** Franklin, TN 37064, then Frisco 75034, then Bentonville 72712. Scores are unchanged.
- **Jordan (ENTP-A):** Boulder 80302, then Bend 97703, then Bozeman 59715. Scores are unchanged.

## Not changed (judgment calls, flagged for transparency)

- The 0–10 location ratings and the snow, coast, and air flags are editorial estimates. Under the test's own definition of regular snow ("snow on the ground for weeks most winters"), the current flags are defensible, so they were left alone.
