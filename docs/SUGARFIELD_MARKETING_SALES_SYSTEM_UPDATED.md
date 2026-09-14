---
name: sugarfield-marketing-sales-system
description: >
  Canonical marketing, sales, offer, funnel, launch, conversion, and retention
  operating system for Sugarfield Studio. Read this file whenever Codex builds,
  audits, rewrites, or measures a funnel, landing page, campaign, offer ladder,
  email sequence, upsell, premium bundle, or conversion experiment.
updated: 2026-09-07
status: canonical
---

# Sugarfield Studio — Marketing + Sales System
*Traffic → Trust → Lead → Entry Purchase → System Purchase → Premium Collection → Repeat Buyer*

## 1. Purpose

This file is the commercial operating system for Sugarfield Studio.

It defines how content, landing pages, free products, paid offers, checkout,
upsells, premium products, retention, and analytics work together.

Use it with:

- `_SYSTEM/SUGARFIELD_FUNNEL_PSYCHOLOGY_RESEARCH.md`
- `_SYSTEM/SUGARFIELD_MEMORY.md`
- `_SYSTEM/SUGARFIELD_OPS.md`
- `_SYSTEM/SUGARFIELD_COMPLIANCE.md`
- the current product truth files
- the current live funnel implementation
- current Stripe/Supabase order and entitlement logic

This file does **not** replace product truth, compliance, design, SEO, or
technical purchase verification.

---

# 2. Core Commercial Principle

Sugarfield does not sell random PDFs.

It builds a value ladder in which each offer solves a broader or more valuable
problem than the one before it.

The funnel should feel like:

```text
"This helped me."
        ↓
"This makes my daily play easier."
        ↓
"I want the broader system."
        ↓
"I want the complete player system."
        ↓
"I want the master collection."
```

Not:

```text
"Buy another PDF."
        ↓
"Buy another PDF."
        ↓
"Buy another PDF."
```

---

# 3. Canonical Upgraded Pokopia Funnel

The current commercial ladder is:

| Step | Offer | Current Price | Commercial Job |
|---|---|---:|---|
| 1 | Free Starter | Free | Lead + trust conversion |
| 2 | Daily Reset | $4.99 | First paid transaction |
| 3 | Adventure Companion | $19.99 | Broader player system |
| 4 | Complete Player System | $49 | Major system purchase |
| 5 | Master Collection | $79–$99 | Highest-tier premium collection |

Canonical shorthand:

```text
FREE
  ↓
DAILY RESET — $4.99
  ↓
ADVENTURE COMPANION — $19.99
  ↓
COMPLETE PLAYER SYSTEM — $49
  ↓
MASTER COLLECTION — $79–$99
```

## Critical Update Rule

This ladder replaces the older commercial sequence that used:

```text
$3.99 Event Tracker
$7.99 Adventure Companion
$14.99 Completionist Kit
```

Those older prices and offer positions are **legacy funnel information** and
must not be used as current sales truth.

If legacy routes, product IDs, SKU names, or database references still exist in
the codebase, Codex must inspect the live implementation before changing them.

**Do not infer that the new commercial offer names map 1:1 to old product IDs.**

---

# 4. Pricing Authority

Current approved commercial prices:

```text
Free Starter                 $0
Daily Reset                  $4.99
Adventure Companion          $19.99
Complete Player System       $49
Master Collection            $79–$99
```

The Master Collection has an approved range, not a single locked price in this
file.

Codex must not choose between `$79`, `$89`, `$99`, or another number inside the
approved range without current product/offer truth or explicit human approval.

Do not:

- restore the old $14.99 ceiling
- automatically lower premium prices
- create fake crossed-out prices
- invent savings
- invent "normally $129" anchor prices
- activate discounts without approval

---

# 5. Offer Architecture

## A. Free Starter

### Job
Earn trust and permission by solving one small real problem.

### Must Do
- Give a genuine useful win
- Demonstrate Sugarfield quality
- Be easy to understand
- Be visibly connected to Daily Reset
- Make the paid next step logical

### Must Not Do
- Give away the entire paid system
- Function as unrelated bait
- Withhold the promised free value
- Make fake urgency claims

---

## B. Daily Reset — $4.99

### Job
Create the first paid relationship.

### Buyer Thought
```text
"For $4.99, this makes my regular play easier."
```

### Position Around
- simplicity
- daily organization
- repeated usefulness
- quick payoff
- low purchase risk

This is the **trust transaction**.

It should be extremely clear what the buyer gets and how it helps.

---

## C. Adventure Companion — $19.99

### Job
Move the buyer from one tool to a broader play system.

### Buyer Thought
```text
"I've proven that Sugarfield tools help me.
Now I want a broader companion."
```

### Position Around
- broader coverage
- less fragmented tracking/reference
- repeated use across play sessions
- consolidation
- convenience

### Important Price Psychology

The jump from `$4.99` to `$19.99` is meaningful.

Therefore this page must show a **meaningful jump in outcome**, not merely a
larger page count.

The product must visibly feel more complete.

---

## D. Complete Player System — $49

### Job
Convert a tool buyer into a system buyer.

### Buyer Thought
```text
"I don't want a handful of separate tools.
I want the complete operating system for how I play."
```

### Position Around
- systemization
- breadth
- reduced mental load
- integration
- completing multiple jobs in one coordinated product ecosystem

### Important

At `$49`, feature lists alone are not enough.

The page needs:

- strong product truth
- clear scope
- exact contents
- clear distinction from the $19.99 offer
- strong outcome framing
- strong trust
- clear "who this is for / who should skip it"

---

## E. Master Collection — $79–$99

### Job
Serve the highest-intent buyer who wants the broadest approved Sugarfield
Pokopia collection.

### Buyer Thought
```text
"I want the complete collection, not just the core system."
```

### Position Around
- maximum approved breadth
- collection ownership
- convenience
- reduced fragmentation
- premium completeness

### Premium Requirement

The Master Collection must be materially different from the `$49` Complete
Player System.

It cannot simply be:

```text
Complete Player System + a few extra PDFs
```

unless those additions genuinely create a clear premium collection outcome.

The buyer should be able to answer:

> "Why is this worth $30–$50 more?"

within seconds.

---

# 6. Value-Ladder Rule

Every step must increase at least one of these:

1. Scope
2. Convenience
3. Integration
4. Depth
5. Completeness
6. Time saved
7. Number of related problems solved
8. Collection value

If the next product does not materially increase value, it should not be the
next funnel step.

---

# 7. Buyer Journey

## Stage 1 — Recognition
The player recognizes a real friction point.

## Stage 2 — Useful Value
Give a useful tip, checklist, insight, or free tool.

Preferred voice:

> advice from another player

not:

> advertisement from a guide company

## Stage 3 — First Commitment
Free Starter:
```text
"This is useful."
```

## Stage 4 — First Purchase
Daily Reset:
```text
"I trust this enough to spend $4.99."
```

## Stage 5 — System Expansion
Adventure Companion:
```text
"I want broader coverage."
```

## Stage 6 — System Purchase
Complete Player System:
```text
"I want the full core system."
```

## Stage 7 — Premium Collection
Master Collection:
```text
"I want the broadest approved collection."
```

---

# 8. Content-to-Funnel System

Established studio principle:

```text
80% value
20% promotion
```

Primary organic content formats:

1. player tips
2. mistakes players make
3. things players forget
4. before/after organization
5. tracker/checklist demonstrations
6. product use cases
7. completion tips
8. cozy desk/play-system visuals
9. quick "do this before you play" content
10. product reveal content

---

# 9. Short-Form Video Formula

Current preferred format:

- 10–20 seconds
- normally 5–6 scenes
- advice-first
- one main problem
- one main CTA

```text
SCENE 1 — Hook
SCENE 2 — Recognition
SCENE 3 — Useful insight
SCENE 4 — Result / proof
SCENE 5 — Product bridge
SCENE 6 — CTA
```

---

# 10. Traffic Routing

## Send to Free Starter When
- audience is cold
- content is educational
- trust is not established
- email capture is useful
- the paid offer needs explanation

## Send Directly to Daily Reset When
- content demonstrates the exact product
- intent is strong
- problem is obvious
- adding a free step would create friction

## Send Existing Buyers to Their Next Qualified Offer When
- purchase state is verified
- next product solves the next relevant problem

## Do Not
- send a cold visitor directly to the $79–$99 Master Collection by default
- send a Master Collection buyer back through entry offers
- show the entire catalog on every funnel step

---

# 11. Funnel Page Structure

Every paid page should answer:

```text
1. What have I already solved?
2. What problem is still left?
3. Why is this the next solution?
4. What exactly do I get?
5. Why is this worth this price?
6. What do I do now?
```

Recommended flow:

```text
CONTEXT
↓
NEXT PROBLEM
↓
OUTCOME
↓
REAL PRODUCT PREVIEW
↓
WHAT'S INCLUDED
↓
WHY THIS IS DIFFERENT FROM THE PRIOR OFFER
↓
PRICE
↓
PRIMARY CTA
↓
DECLINE / CONTINUE
↓
FAQ / TRUST
```

---

# 12. Premium Page Requirements

## Complete Player System — $49

Required:
- exact scope
- exact deliverables
- clear before/after state
- real product previews
- clear distinction from Adventure Companion
- outcome-first copy
- strong trust
- simple purchase path
- relevant FAQ

## Master Collection — $79–$99

Required:
- exact collection contents
- visible breadth
- exact differences from the $49 system
- premium collection positioning
- no invented future bonuses
- no fake savings
- clear ideal buyer
- clear "skip this if..." guidance
- real proof where available
- strong fulfillment clarity

---

# 13. Price-Jump Psychology

```text
$0 → $4.99
TRUST DECISION

$4.99 → $19.99
VALUE EXPANSION DECISION

$19.99 → $49
SYSTEM DECISION

$49 → $79–$99
PREMIUM COLLECTION DECISION
```

Do not use the same page formula with only a different product image.

---

# 14. CTA Rules

One primary CTA per page.

```text
GET THE FREE QUICK START
GET THE DAILY RESET — $4.99
ADD THE ADVENTURE COMPANION — $19.99
GET THE COMPLETE PLAYER SYSTEM — $49
GET THE MASTER COLLECTION
```

Show the actual final Master Collection price once locked.

---

# 15. No-Thanks Rule

Every optional upsell should allow a user to continue without friction.

Do not:
- hide decline
- make it tiny
- guilt the user
- repeat the same declined offer
- block previously earned access

---

# 16. Product Truth in Sales Creative

Canonical rule:

```text
VISIBLE PRODUCT PREVIEW = APPROVED CUSTOMER ART
```

Never invent:
- pages
- modules
- bonuses
- formats
- customer files
- compatibility
- product counts
- included products

---

# 17. Stripe / Supabase Sales Rules

Owned-funnel purchase truth remains server verified.

Marketing must not bypass:
- Stripe payment verification
- durable orders
- entitlements
- attribution
- fulfillment
- secure downloads
- source-order logic
- webhook idempotency

Front-end state is not payment truth.

---

# 18. Qualification Rule

The commercial sequence is canonical, but this file does not invent technical
SKU/route mappings.

Codex must read the current implementation to determine:
- route path
- product ID
- SKU
- Stripe Price ID
- entitlement prerequisite
- upgrade/source-order relationship

Do not map legacy P13/P16/P17 identifiers to new offers by assumption.

---

# 19. Email / Nurture Strategy

## Free Only
Help them use the starter and show why Daily Reset is next.

## Daily Reset Buyer
Onboard, reinforce value, introduce Adventure Companion.

## Adventure Companion Buyer
Show the difference between a companion and the Complete Player System.

## Complete Player System Buyer
Explain who the Master Collection is for.

## Master Collection Buyer
Fulfillment, onboarding, support, review request, future relevant products.
No same-funnel upsell.

---

# 20. Pricing Diagnostics

Do not change price first.

Audit:

```text
1. Traffic quality
2. Message match
3. Product-market fit
4. Offer clarity
5. Difference from previous offer
6. Product preview
7. Trust
8. CTA
9. Checkout friction
10. Price
```

At `$49` and `$79–$99`, also audit:
- scope clarity
- integration
- premium differentiation
- proof
- buyer identity match

---

# 21. Funnel Metrics

Track:
- Free → Daily Reset
- Daily Reset → Adventure Companion
- Adventure Companion → Complete Player System
- Complete Player System → Master Collection
- funnel completion rate
- revenue per entrant
- revenue per buyer
- average order value
- premium refund reasons
- premium customer questions

---

# 22. Adjacent-Tier Comparison Rule

At higher tiers, make differences obvious.

| | Adventure Companion | Complete Player System | Master Collection |
|---|---|---|---|
| Job | Broader companion | Core complete system | Broadest approved collection |
| Best for | Players wanting more than Daily Reset | Players wanting the core system | Highest-intent collection buyers |
| Price | $19.99 | $49 | $79–$99 |

Add detailed feature rows only after exact contents are verified.

---

# 23. Ethical Persuasion

Allowed:
- clear recommendations
- real progress
- real deadlines
- real reviews
- transparent comparisons
- relevant upsells
- accurate premium positioning

Not allowed:
- fake scarcity
- fake countdowns
- fake reviews
- prechecked paid upsells
- false savings
- hidden charges
- misleading previews
- guilt-based declines

---

# 24. Codex Commercial Audit Prompt

```text
Wake up.

Read:
_SYSTEM/SUGARFIELD_MARKETING_SALES_SYSTEM.md
_SYSTEM/SUGARFIELD_FUNNEL_PSYCHOLOGY_RESEARCH.md
_SYSTEM/SUGARFIELD_COMPLIANCE.md

Then read the live funnel code, current product truth, current Stripe Price IDs,
current Supabase order/entitlement logic, approved product previews, and
analytics events.

Canonical commercial ladder:
Free Starter
→ Daily Reset $4.99
→ Adventure Companion $19.99
→ Complete Player System $49
→ Master Collection $79-$99

Treat the old $3.99 / $7.99 / $14.99 funnel as legacy commercial information.

Do not infer technical SKU or route mappings from legacy product IDs.

Audit:
1. message match
2. sequencing
3. price presentation
4. value jump between tiers
5. product truth
6. CTA clarity
7. decline path
8. trust
9. checkout friction
10. fulfillment
11. premium differentiation
12. analytics
13. mobile UX

Do not change live prices, SKUs, Stripe configuration, qualification, or
entitlements without explicit approval.
```

---

# 25. Canonical Closing Rule

**Marketing earns attention.  
Free value earns trust.  
Daily Reset earns the first transaction.  
Adventure Companion proves broader value.  
Complete Player System sells the system.  
Master Collection sells the premium collection.  
Product truth and customer trust outrank short-term conversion.**

---

*SUGARFIELD_MARKETING_SALES_SYSTEM.md*  
*Updated September 7, 2026 for the upgraded Sugarfield/Pokopia value ladder.*
