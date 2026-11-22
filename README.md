# The Personality-to-Place Inventory

A 563-question, MBTI-style personality test that ends with a recommendation for the U.S. city, state, ZIP code, and neighborhood where your personality fits best.

## What it is

- **Parts I–IV (Q1–192):** the four classic preference dimensions: Extraversion/Introversion, Sensing/Intuition, Thinking/Feeling, and Judging/Perceiving. Each has 48 questions, with sub-dimensions and situational edge cases.
- **Part V (Q193–216):** an optional Assertive/Turbulent identity scale.
- **Parts VI–XIV (Q217–545):** career and leadership, likes and sensory preferences, current life stage, values and civic and spiritual outlook, stress and conflict, social energy, intellectual curiosity, physical environment, and community subcultures.
- **Part XV (Q546–563):** dealbreakers, must-haves, and your top two priorities.

Scoring turns your answers into a four-letter type and a 20-scale Place Profile. Your dealbreakers filter a database of 73 real U.S. neighborhoods and communities. The rest are ranked with a weighted-distance formula plus small career, subculture, and personality bonuses. You get a top match and two runners-up, each with a short justification.

## How to take it

1. Open `Personality_to_Place_Test.pdf` (or `.docx` / `.md`) and answer every question you can, one letter each. Write your answers as number-letter pairs, such as 1-B, 2-D. It takes about 90–150 minutes and can be split across sittings.
2. Answer as you are on an ordinary week, not as you wish you were. You may skip any question; skipped questions are not scored.

## How to score it

Everything is in the **Scoring Methodology** section of the document:

1. Use the answer key to total each MBTI pole. Your type and clarity come from the percentages (Steps 1–2).
2. Score the 20 place-fit scales. Each one is the average position of your answers on a 0–10 scale (Step 3).
3. Tally your career sectors and subculture tags (Steps 4–5).
4. Apply your dealbreakers as filters (Step 6), then compute Base Fit, bonuses, and Final Fit for each surviving location (Steps 7–9).
5. Fill in the Results Template. Three fully worked examples show every step.

A spreadsheet makes it faster, but pencil and calculator work too.

## Files

| Path | What it is |
|---|---|
| `Personality_to_Place_Test.pdf` | The complete test, scoring guide, location database, and worked examples (134 pages) |
| `Personality_to_Place_Test.docx` | Same, as an editable Word document |
| `Personality_to_Place_Test.md` | Same, as Markdown |
| `src/` | Source files: question banks with answer keys (`01_EI.txt` … `15_dealbreakers.txt`) and the location database (`locations.py`) |
| `build/` | Build and check scripts: `parse.py` (reads the sources), `scoring.py` (matching rules), `personas.py` (worked-example profiles), `build.py` + `render.py` (generate the Markdown and Word files), `verify.py` (independent checker of the finished document) |
| `VERIFICATION.md` | What was checked and what was fixed |

## Rebuilding

Requires Python 3 with `python-docx`, plus LibreOffice for the PDF.

```bash
python3 build/render.py                                    # writes the .md and .docx
soffice --headless --convert-to pdf Personality_to_Place_Test.docx
python3 build/verify.py                                    # should report 0 failed
```

## Disclaimer

This inventory is **for fun and self-reflection only**. It is not a clinical, diagnostic, or scientifically validated instrument. It is not the official Myers-Briggs Type Indicator®, and it is not affiliated with The Myers-Briggs Company. Location ratings are approximate editorial judgments, and ZIP codes mark the core of each neighborhood. Visit, research current costs and conditions, and talk to locals before making any real-life decision.
