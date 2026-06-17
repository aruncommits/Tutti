# DagChef — Recipe Content & Licensing Strategy

**Document 8 of 9** · Where the recipes legally come from, and how the library gets built
*Feeds the Golden Library of Doc 1 §4 and Track C of Doc 3*
*Status: Draft v1 · Owner: Arun*

> Not legal advice. This document summarizes the landscape and proposes a strategy; engage an IP attorney before launch.

---

## 0. The problem in one line

DagChef is only as good as its library, and you **cannot legally build that library by scraping other people's recipe content**. This document explains what's actually protectable, and lays out a sourcing strategy that is both legal and operationally realistic.

---

## 1. What copyright does and doesn't protect (the useful nuance)

US copyright law draws a sharp line, and it happens to fall in a place that helps us:

- **A list of ingredients is NOT copyrightable.** The US Copyright Office is explicit: a mere listing of ingredients or contents is not protected. The functional facts of a recipe — these items, these amounts — are free to use.
- **A "simple set of directions" is NOT copyrightable.** Purely factual, functional steps are uncopyrightable. Courts have treated bare recipes as functional and unprotected.
- **Creative expression around the recipe IS protected.** The headnote story ("my grandmother in Chettinad…"), literary descriptions, photographs, videos, unique selection/arrangement in a cookbook, and distinctive formatting all carry copyright.

**Implication for DagChef (important):** the *functional skeleton* we actually need — ingredients, amounts, the sequence of physical actions — sits largely on the uncopyrightable side of the line. What we must NOT copy is the **expressive layer**: the prose, the photos, the personal narrative, the verbatim instruction wording.

### 1.1 Why this does NOT mean "scrape freely"
Several real risks remain even though bare recipes are weakly protected:
- **Verbatim copying of instruction prose** crosses into protected expression. Our LLM must *re-express* steps into atomic task nodes, not lift sentences.
- **Database/compilation rights & Terms of Service.** Mass-scraping a site like NYT Cooking violates its ToS and may trigger contract/CFAA-type claims regardless of copyright. ToS breach is a separate exposure from copyright.
- **Trademark & attribution / passing off.** Can't imply endorsement.
- **Reputational/relationship cost** with the very publishers we may later want as B2B partners (Doc 9).

So: legally we *can* extract the functional facts, but the safe, durable, partner-friendly path is **licensed and original content**, not scraping.

---

## 2. The sourcing strategy (tiered, lowest-risk first)

### Tier 1 — Originally authored / commissioned content (launch foundation)
Commission or write a focused set of recipes ourselves (or with hired recipe developers, work-for-hire so we own them). For a single launch vertical this is a few hundred recipes — entirely feasible.
- **Pros:** we own it outright; clean for the human-verified DAG pipeline; no third-party risk; we control quality and the active/passive tagging that makes interleaving work.
- **Cons:** upfront cost and time.
- **This is the recommended launch path.** It pairs perfectly with the curated Golden Library model (Doc 1 §4) — we were going to human-review every recipe anyway, so authoring them is a small delta.

### Tier 2 — Public-domain & open-licensed sources (cheap breadth)
Old cookbooks (pre-1929 US public domain), government/extension-service recipes, and **Creative-Commons-licensed** recipe collections. Modernize and re-express them.
- **Pros:** free, legal, expands breadth fast.
- **Cons:** dated, needs heavy editing/testing; must honor CC attribution/share-alike terms.

### Tier 3 — Licensed content & publisher partnerships (scale + B2B flywheel)
License recipe catalogs from publishers/bloggers, or — better — partner so they *want* DagChef's "cook mode" powering their content (this is the B2B thesis of Doc 9).
- **Pros:** scale, credibility, doubles as business development.
- **Cons:** deal-making, royalties, slower.

### Tier 4 — User-generated, auto-parsed (post-MVP, clearly fenced)
The "paste your own recipe" path (Doc 5 §7). The *user* supplies content for their *own* use; we provide the parsing tool. Labeled "unverified," never published into the shared trusted library, never our liability as publisher.

---

## 3. Recommended path for v1

1. **Pick one coherent vertical** — recommend **vegetarian South Indian** (matches the examples; sidesteps raw-meat food-safety liability per Doc 6 §5; deeply parallelizable cuisine).
2. **Author/commission ~100–200 originals** in that vertical, owned work-for-hire.
3. **Run them through the pipeline** (Doc 5): LLM drafts the DAG → deterministic validation → human review → freeze into the Golden Library.
4. **Seed enough density** that any two dishes combine into a sensible interleaved meal (the multi-dish demo, Doc 3 Phase 3).
5. **Defer Tiers 3–4** until the product is proven and the partnership conversations (Doc 9) are live.

This makes content a **controlled, owned asset** from day one — not a legal liability and not a dependency on anyone's goodwill.

---

## 4. Content operations (how the library is maintained)

| Function | Owner | Notes |
|---|---|---|
| Recipe authoring/commissioning | Content lead + freelance developers | Work-for-hire contracts; we own IP |
| DAG parsing | LLM pipeline (Doc 5) | Drafts only |
| Validation | Deterministic (Doc 2 §3) | Automated gate |
| Human review & freeze | Trained reviewer | The quality guarantor; few min/recipe |
| Food-safety sign-off | Domain expert | Gate before any higher-risk recipe (Doc 6 §5) |
| Versioning | Library store | Recipes are versioned; fixes don't break live sessions |
| Synonym / substitution tables | Content lead | Curated, not LLM (Doc 6 §2, §4) |

**Cost driver:** the human-review minutes per recipe, which the LLM accuracy (Doc 5 §6) directly determines. Better parsing → cheaper content ops → faster library growth. This is the single metric that links the AI track to unit economics.

---

## 5. IP we CAN build and defend

While individual recipes are weakly protectable, DagChef's defensible IP is elsewhere — which is the whole point of the Doc 1 architecture:
- **The compiled DAG dataset** — our human-verified active/passive/dependency annotations are an original work of authorship (selection, arrangement, expression) and a valuable proprietary database.
- **The engine & algorithms** — trade secret + potentially patentable scheduling methods (the hands-as-resource interleaving formulation, Doc 2 §4.2).
- **The brand.**
The moat is the *engine plus the annotated graph corpus*, not the recipes themselves. That is exactly why the original concept's instinct to license the *engine* (Doc 1 §7) is sound.

---

## 6. Guardrails (turn into policy before launch)
- **Never** ship verbatim third-party instruction prose; the LLM must re-express into atomic nodes.
- **Never** mass-scrape a site whose ToS forbids it.
- **Never** publish auto-parsed user content into the shared library.
- **Always** keep work-for-hire / license paperwork for every authored or licensed recipe.
- **Always** attribute and honor terms for CC/public-domain sources.
- **Engage an IP attorney** to review the authoring contracts, the parsing/re-expression process, and the user-paste feature before public launch.

---

## Sources
- [Are Recipes and Cookbooks Protected by Copyright — Copyright Alliance](https://copyrightalliance.org/are-recipes-cookbooks-protected-by-copyright/)
- [US Copyright Office, Circular 33 — Works Not Protected by Copyright](https://www.copyright.gov/circs/circ33.pdf)
- [Secret Ingredients: How to Protect Recipes — New York City Bar Association](https://www.nycbar.org/reports/secret-ingredients-how-to-protect-recipes/)
- [RecIPes: Intellectual Property and Recipes in the Age of Social Media — Vermont Law Review](https://lawreview.vermontlaw.edu/recipes-intellectual-property-and-recipes-in-the-age-of-social-media/)
- [Navigating copyright and your recipes: What's protected — Bootstrapped Ventures](https://bootstrapped.ventures/recipe-copyright/)

*End of Document 8. Next: Document 9 — Business & Go-to-Market.*
