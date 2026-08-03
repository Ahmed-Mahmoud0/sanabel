---
title: Glossary — Sanabel
companion_to: SPEC.md
---

# Glossary — Sanabel

- **Course** — A collection of Modules created by one Instructor, belonging to one Category, with a Visibility of Public or Unlisted. Always free to any signed-in Learner.
- **Module** — A named grouping of Lessons within a Course, ordered by the Instructor.
- **Lesson** — A single unit of content within a Module, of exactly one Lesson Type. Ordered by the Instructor within its Module.
- **Lesson Type** — One of: Video, Text, PDF, Quiz, Interactive Code Exercise. Determines how a Lesson is authored and consumed. A Lesson has exactly one Lesson Type at a time — Quiz and Interactive Code Exercise are variants of Lesson, not separate entities.
- **Interactive Code Exercise** — A Lesson Type where a Learner writes code (v1: SQL only) against a sample dataset/environment and receives automated pass/fail feedback via the Code Execution Service.
- **Instructor** — A signed-in user who has been granted Instructor status by the Admin and may create Courses. Every Instructor is also a Learner.
- **Learner** — Any signed-in user. Learners enroll in Courses, track Progress, and can hold Discussions and Ratings.
- **Admin** — The elevated role (Ahmed, v1) that can moderate any Comment, Rating, or Course.
- **Enrollment** — The relationship created when a Learner chooses to take a Course; required before Lesson content (beyond the Course detail page) is accessible. Unique per (account, course).
- **Progress** — Per-Learner, per-Course record of which Lessons are complete, plus the Learner's last-viewed position for resuming.
- **Certificate** — A downloadable file issued to a Learner on completing all required Lessons in a Course. Issued once per Enrollment as a persisted write, never recomputed live.
- **Comment** — Learner-authored discussion content attached to a Course or a specific Lesson. Flat/chronological, not threaded.
- **Rating** — A Learner's score (1-5 stars) and optional written Review for a Course they are Enrolled in. Unique per (account, course).
- **Category** — A software/coding topic a Course is tagged under, used for browse and search.
- **Visibility** — Public (discoverable via browse/search) or Unlisted (accessible only via direct link) — set by the Instructor at publish time. Never gated by payment.
- **Content Language** — `en` or `ar`, set by the Instructor at Course creation; drives the "Taught in: Arabic/English" badge and Browse filter. Course content itself is never auto-translated.
