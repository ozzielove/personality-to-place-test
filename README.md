# The Personality-to-Place Inventory

**A 563-question personality test that does not stop at four letters. It ends with the U.S. neighborhood, city, and ZIP code where you are most likely to thrive, a grade for the fit, and the reasons behind the grade.**

**Take it now:** https://personality-to-place-test.vercel.app

---

## TL;DR

| | |
|---|---|
| **The problem** | Personality tests hand you a label and leave. "Where should I live?" tools ask for a budget and a climate and ignore who you are. Nobody connects the two. |
| **The bet** | If you measure a person on the same 20 scales you rate a place on, "where do I belong" becomes arithmetic you can check, not a vibe. |
| **What ships** | A web app that takes you through the test, saves every answer as you go, and scores the whole thing in under a millisecond. Plus the original printable PDF. |
| **The output** | A four-letter type with clarity, a 20-scale Place Profile, a top match and two runners-up out of 73 real U.S. neighborhoods, each with a letter grade and a line-by-line explanation. |
| **The promise** | Every number on the results page can be traced back to your answers and a published rule. No black box, no account, no data leaves your browser. |

## Who this is for

- **People deciding where to move** who want a shortlist grounded in who they are, not only what they can afford.
- **People who like personality tests** and want the result to lead somewhere concrete.
- **Skeptics.** The scoring method is published in full, the code that implements it is tested against it, and every grade shows its work.

## How to take it

### Start

1. Open the site and press **Start the test**.
2. Read the question, then pick one answer. Click it, or press **A to E** (or **1 to 5**) on a keyboard.
3. The next question appears on its own. To turn that off, open **Parts** and untick "Move on automatically".

Answer as you are on an ordinary week, not as you wish you were. Plan for 90 to 150 minutes in total, in as many sittings as you like.

### Pause and save

There is no save button, because there is nothing to remember to do.

- **Every answer is saved the moment you pick it**, in the browser you are using. The line under each question shows the time of the last save.
- **To pause,** press **Pause**, or just close the tab. Nothing is lost.
- **To resume,** open the site again in the same browser. The home page says where you stopped and offers **Resume the test**. You land on the exact question you left.
- **To skip a question,** press **Skip**. Skipped questions are simply not scored. **Parts** shows what is unanswered and has a **Go to first unanswered** button.
- **To change an answer,** go back with **Back** or the left arrow and pick again. **Clear answer** removes it.
- **To move to another phone or computer,** open **Parts**, press **Download backup**, and on the other device press **Restore from backup** on the home page.

If a browser blocks storage altogether, the app says so in plain words at the top of the page and keeps working; download a backup before closing the tab.

One thing to know: progress lives in that one browser. Clearing the browser's site data erases it, and a private window forgets it when closed. Download a backup if the answers matter to you.

### Finish

On the last question press **Finish** (or **Parts**, then **Finish and score**). You see how many questions are unanswered and can score right away or go back. Press **Score my test** and the results appear instantly. You can also press **Score what I have so far** from the home page at any time; the page marks a partial result clearly.

## How it is scored

Scoring follows the nine-step Scoring Methodology printed in the test document. The app runs the same nine steps in your browser.

| Step | What happens | What it produces |
|---|---|---|
| 1 | Questions 1 to 192 each give 0, 1, or 2 points to one pole of a dimension. | Four letters, each with a percentage and a clarity band |
| 2 | Questions 193 to 216 do the same for Assertive vs. Turbulent. | The identity letter after the hyphen |
| 3 | Questions 217 to 545 place you on 20 scales. | Your Place Profile: 20 scores from 0 to 10 |
| 4 | Career questions vote for sectors. | Your top two career sectors |
| 5 | Subculture questions give points to tags. | Up to five active tags |
| 6 | Questions 546 to 561 are dealbreakers. | A filtered list of places |
| 7 | Each remaining place is compared with you, scale by scale. | Base Fit, out of 100 |
| 8 | Career, tag, and personality bonuses are added. | Up to +6, +6, and +3 |
| 9 | Places are ranked, with tie-breakers. | A top match and two runners-up |

### What each score maps to, and why

| Score | Range | What it maps to | Why it works this way |
|---|---|---|---|
| **Letter** (E or I, S or N, T or F, J or P) | one of two | The pole that earned more than half of the points scored on that dimension. An exact tie goes to I, N, F, or P. | A share of points, not a raw total, so skipping questions does not tilt the result. The tie rule is the conventional one. |
| **Clarity** | 50 to 100% | How lopsided the split was. The percentage is rounded to a whole number first (halves round up), then read against the clarity table below. | Rounding first removes the gaps between bands. A 55.5% used to fall between "Slight" and "Moderate"; now it is 56% and Moderate. |
| **Identity** (A or T) | one of two | Assertive or Turbulent. A tie goes to T. | It colors the write-up only. It is deliberately not used to match places, because it describes how you carry stress, not where you fit. |
| **Place-Fit scale** (20 of them) | 0.0 to 10.0 | The average position of your answers on that scale. Every multiple-choice answer is itself a position from 0 to 10; agreement answers are stretched from 0 to 4 onto 0 to 10. | A middle answer earns middle credit. An earlier version divided by the highest number in each row, which turned mild answers into full marks; that was the main bug fixed in verification. |
| **Strong preference** | yes or no | A scale score of 2 or less, or 8 or more. | Strong preferences matter more, so those scales count 1.5 times in matching. |
| **Career sectors** | top two of ten | The sectors you chose most often. Ties go to the sector chosen in the later question, because later questions are more specific. | Top sector present at a place is worth +4, the second +2. "Remote" gives +3 everywhere, since remote work travels. |
| **Active tags** | up to five | Subcultures with 3 or more points, highest first. | +1.5 for each one a place carries, capped at +6, so a scene you love can tip a close call but cannot outvote the 20 scales. |
| **Dealbreakers** | any of 22 | Hard filters. A place that fails one is removed before any scoring. | A dealbreaker is not a preference. If fewer than three places survive, filters are relaxed one at a time in a published order, and the results page says which. Identity-safety and values filters are relaxed last. |
| **Priorities** | two of five groups | Weight multipliers: first priority ×2, second ×1.5. | You said these matter most, so gaps on them cost more. Picking the same group twice applies only ×2. |
| **Base Fit** | up to 100 | 100 minus 10 times the weighted average gap between you and the place across the 20 scales. | It is the personality-to-environment fit, kept separate from bonuses so you can see it on its own. Cost and nature scales are one-sided: a place that is cheaper than you need, or has mountains you do not care about, costs little or nothing. |
| **Affinity bonus** | 0 to +3 | Small boosts when a place suits a letter of your type (only letters at 56% clarity or more) or your temperament. | Deliberately small. It nudges close calls and never drives the result. |
| **Final Fit** | can exceed 100 | Base Fit + Career + Tags + Affinity. | This is the ranking number. Ties break on higher Base Fit, then fewer strong-preference misses, then civic gap, then cost gap. |

## Reference-based grading: grade first, then why

A score with no reference point is noise. "87.4" means nothing until you know what it is measured against. So every result is delivered in three parts, always in this order:

1. **The grade.** A plain word or letter.
2. **The reference.** The fixed standard that grade is read from. Never a curve, never other people.
3. **The why.** The arithmetic, with your own numbers, that put you there.

### Grade 1: how clear each letter is

Reference: the clarity table in Step 1 of the Scoring Methodology.

| Winning % | Grade | What it means |
|---|---|---|
| 50 to 55% | Slight | Flexible; you use both poles and context decides. |
| 56 to 65% | Moderate | A real but adaptable preference. |
| 66 to 80% | Clear | A consistent, recognizable preference. |
| 81 to 100% | Very Clear | A defining trait; environments that ignore it will feel draining. |

What you see on the page: *"Grade: Clear. Clear is 66 to 80%. A consistent, recognizable preference. Introversion (I) earned 58 of the 80 points scored on this dimension: 100 × 58 ÷ 80 = 72.5%, which rounds to 73%."*

### Grade 2: where you sit on each of the 20 scales

Reference: each scale's own end points (for Urban Density, 0 is remote countryside and 10 is a dense big-city core), plus the method's cut points.

| Score | Grade | Effect |
|---|---|---|
| 0 to 3 | Low | |
| 4 to 6 | Middle | |
| 7 to 10 | High | |
| 2 or less, or 8 or more | adds "strong" | That scale weighs 1.5 times in matching |

What you see: *"Grade: High, strong. Your answers earned 151 of 180 possible points: 10 × 151 ÷ 180 = 8.4, used as 8 in matching."*

### Grade 3: how well a place fits

Reference: the method states that each point of weighted average distance costs 10 points of Base Fit. So Base Fit converts directly into "how far is this place from me, on average, on a 0 to 10 scale". The letters name that distance.

| Base Fit | Grade | What it means |
|---|---|---|
| 90 and up | A, Excellent fit | On average the place is within 1 point of you on every scale. |
| 80 to 89.9 | B, Strong fit | On average 1 to 2 points from you per scale. |
| 70 to 79.9 | C, Fair fit | On average 2 to 3 points from you per scale. |
| 60 to 69.9 | D, Weak fit | On average 3 to 4 points from you per scale. |
| under 60 | F, Poor fit | On average more than 4 points from you per scale. |

Outside reference points, from the three worked examples printed in the document:

| Person | Top match | Base Fit | Final Fit |
|---|---|---|---|
| Maya, INFP-T | Hawthorne / Southeast, Portland, OR 97214 | 90.1 | 101.1 |
| Daniel, ESTJ-A | Downtown Franklin, TN 37064 | 94.3 | 106.3 |
| Jordan, ENTP-A | Downtown / Mapleton Hill, Boulder, CO 80302 | 90.8 | 104.3 |

What you see under **Why this grade** on each match:

- **Where it loses points**, most expensive first, with the numbers: *"Civic Climate: you 9, place 10. Gap 1 × weight 3 costs 0.9."* These lines add up to exactly the points lost. Nothing is hidden in a remainder.
- **Exact matches**, the scales where the place meets you with no loss.
- **Bonuses**, each with the rule that earned it: *"Career +4: your top sector, CREA (Arts, media, design, entertainment), is a career strength here."*

**An honest label on what is ours and what is not.** Grades 1 and 2 come straight from the test document. The letter grades in Grade 3 are a reading aid added by the app: the formula they rest on is the document's, the A to F names are ours. They never change the ranking. And none of this is a validated psychological instrument; see the disclaimer.

## Product decisions and the tradeoffs behind them

| Decision | Why | What it costs |
|---|---|---|
| **Score in the browser, not on a server** | Results in under a millisecond, works offline once loaded, and your answers about faith, politics, and identity never leave your device. | No cross-device sync without a backup file. |
| **Save on every answer, no account** | A 2-hour test dies if a closed tab loses progress, and a sign-up wall before question 1 loses most people. | Progress is tied to one browser. The backup file is the escape hatch. |
| **One question per screen** | 563 questions on one page is a wall. One at a time with auto-advance keeps momentum, and the keyboard keeps it fast. | Reviewing means using the Parts panel. |
| **Let people score early** | Seeing a partial result is motivating, and skipped questions are legitimately unscored by the method. | A partial result is less reliable, so the page says so in plain words. |
| **Explain every grade** | Trust. A recommendation about where to live deserves to be argued, not asserted. | A longer results page. |
| **Generate the web data from the same source files as the PDF** | One source of truth. The web app and the printed test cannot disagree. | Editing a question means re-running one script. |

## How we know the scoring is right

The Python build scripts in this repo are the reference. The web scorer is a separate implementation that must agree with them exactly.

| Check | Result |
|---|---|
| Unit and parity tests | 114 pass. 67 full answer sheets, 250 random profiles, 1,500 synthetic places, and 421 dealbreaker cases, compared with the Python output with **zero rounding tolerance** |
| Worked examples | All three published examples reproduce to the decimal |
| Mutation testing | 532 small changes made to the scoring and grading code, one at a time. The tests caught 525. The other 7 are changes that cannot alter any result, each listed with the reason. Zero unexplained |
| Canaries | 14 pass: the shipped data matches a fresh export, five deliberately planted data faults are all caught, and the live site serves the real questions |
| End to end, in a real browser | 57 Playwright checks pass against the live site: start, answer by mouse and keyboard, skip, pause, reload, resume in a new tab, jump, back up, restore, finish, score, read the grades, recover from damaged or blocked storage, phone layout |
| The printed document | 6,434 checks, 0 failed (see `VERIFICATION.md`) |

Run them yourself:

```bash
cd web
npm install
npm test             # parity, grading, and saved-progress tests
npm run e2e -- https://personality-to-place-test.vercel.app    # Playwright, real browser
npm run mutation     # mutation test of the scoring and grading code (about 2 minutes)
npm run canary       # drift, known answers, planted faults; add a URL to smoke-test a live site
```

## Run it locally

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

Built with Next.js 16, React 19, Tailwind CSS 4, zustand (saved progress), and motion (transitions). Hosted on Vercel as static pages.

After editing a question in `src/` or a rule in `build/scoring.py`:

```bash
cd web
npm run data         # regenerates web/data/test-data.json and the test fixtures from the Python sources
npm test             # the web scorer must still match Python exactly
```

## What is in this repo

| Path | What it is |
|---|---|
| `web/` | The web app: test runner, saved progress, scoring, grading, results |
| `web/lib/scoring.ts` | The nine scoring steps |
| `web/lib/grading.ts` | Reference-based grades and the explanations behind them |
| `web/tests/` | Parity tests, grading tests, mutation driver, canaries |
| `Personality_to_Place_Test.pdf` | The complete printable test, scoring guide, location database, and worked examples (134 pages). Also as `.docx` and `.md` |
| `src/` | Source of truth: question banks with answer keys (`01_EI.txt` to `15_dealbreakers.txt`) and the location database (`locations.py`) |
| `build/` | `parse.py` (reads the sources), `scoring.py` (matching rules), `score_answers.py` (scores an answer sheet), `export_web.py` (feeds the web app), `build.py` and `render.py` (generate the document), `verify.py` (independent checker), `personas.py` (worked examples) |
| `VERIFICATION.md` | What was checked in the document and what was fixed |

To rebuild the printable document (needs Python 3 with `python-docx`, plus LibreOffice for the PDF):

```bash
python3 build/render.py
soffice --headless --convert-to pdf Personality_to_Place_Test.docx
python3 build/verify.py        # should report 0 failed
```

## Known limits

- **Progress is per browser.** There are no accounts and no sync. Use the backup file to move or keep your answers.
- **73 places, not every place.** The database is a curated set of neighborhoods across six regions. Your best fit in real life may not be in it.
- **Ratings are editorial.** The 0 to 10 ratings for each place are informed judgments, not statistics, and places change.
- **One tie-breaker cannot run.** The method's last tie-breaker favors a region you have never lived in. The app does not ask where you have lived, so a remaining tie keeps database order.
- **One rule is our call.** The document does not say how to break a tie for the fifth active tag. The app uses the same rule as careers: the tag chosen in the later question wins.

## What we would build next

1. **Optional sync** with a sign-in, for people who want to move between devices without a file.
2. **A shareable results link** that carries the answers in the link itself, so nothing is stored on a server.
3. **Compare two people**, for couples and families choosing one place together.
4. **More places**, with a public method for proposing and rating a new neighborhood.

## Disclaimer

This inventory is **for fun and self-reflection only**. It is not a clinical, diagnostic, or scientifically validated instrument. It is not the official Myers-Briggs Type Indicator®, and it is not affiliated with The Myers-Briggs Company. Location ratings are approximate editorial judgments, and ZIP codes mark the core of each neighborhood. Visit, research current costs and conditions, and talk to locals before making any real-life decision.
