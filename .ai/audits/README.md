# DMS-O2 Engineering Audit System

This directory houses the infrastructure, templates, and logs for the recurring engineering and security audits of the DMS-O2 platform.

---

## Purpose of Audits
Engineering audits are designed to proactively evaluate the DMS-O2 codebase before shipping changes. The goal is to detect:
1. **Security Vulnerabilities**: Authentication weaknesses, authorization bypasses, injection vectors, or session leaks.
2. **Performance Leaks**: Uncontrolled memory growth, thread/timer allocations in Go, database N+1 queries, or slow SQL executes.
3. **Operational/DevOps Gaps**: Inconsistencies in Docker files, volume/cache persistence anomalies, or broken recovery scripts.
4. **Architectural Technical Debt**: Circular dependencies, tight coupling, and data synchronization issues.

---

## When Audits Should Be Run
Audits must be executed at the following milestones:
- **Pre-Push (Mandatory)**: Before pushing local commits to remote git branches.
- **Pre-Release**: Prior to merging feature branches into the main production branch.
- **Scheduled Weekly**: An automated check or routine review to evaluate accumulative technical debt.
- **Post-Refactor**: After major structural shifts or dependency upgrades.

---

## Audit Severity Levels
Findings in reports are categorized under four severity tiers:
- **Critical**: Security exploits, privilege escalations, complete data leakage channels, or fatal deployment blockers. Require immediate mitigation.
- **High**: Major performance bottlenecks (e.g., memory/timer leaks), broken scripting (e.g., recovery fails), or transactional race conditions.
- **Medium**: Configuration errors, missing DB validation/validators, policy violations (such as running Docker processes as root), or lack of persistence in critical caches.
- **Low**: Aesthetic/display mismatches, stale in-memory instance states, minor schema discrepancies, or code duplication.

---

## Audit Workflow
Before pushing changes or executing a release, perform the following steps:

1. **Locate Current Audit**: Locate the existing report in `.ai/audits/latest.md`.
2. **Archive the Old Report**: 
   - Move the current `latest.md` into the `.ai/audits/archive/` directory.
   - Rename it using the format: `YYYY-MM-DD-<type>.md` (e.g., `2026-07-22-pre-push.md`, `2026-07-22-security.md`).
   - **Crucial Rule**: Never overwrite existing archives. If multiple audits happen on the same day, append an incremental counter (e.g., `YYYY-MM-DD-pre-push-2.md`).
3. **Execute the Audit**: Analyze the codebase, containers, and configurations.
4. **Create the New Report**: Copy the template structure from the README/latest files, fill in the findings, and save it as `.ai/audits/latest.md`.
5. **Commit**: Include the archived audit and the new `latest.md` in the pre-push commit.

---

## Archive Naming Convention
Archives must be named using standard suffixes matching their primary driver:
- `YYYY-MM-DD-pre-push.md` (Standard pre-push audits)
- `YYYY-MM-DD-security.md` (Focused security reviews)
- `YYYY-MM-DD-performance.md` (Focused load/stress/profiling reports)
- `YYYY-MM-DD-refactor.md` (Post-architectural overhauls)

---

## Report Template

All reports saved in `latest.md` and `archive/` must follow the format below:

```markdown
# Executive Summary

# Overall Score (/100)

# Critical Issues

# High Issues

# Medium Issues

# Low Issues

# Architecture

# Security

# Backend

# Frontend

# Go Services

# Database

# DevOps

# Performance

# Testing

# Documentation

# Technical Debt

# Production Readiness

# Prioritized Action Plan
```

For every issue identified in the sections above, you must specify:
- **Severity**: [Critical / High / Medium / Low]
- **Description**: Detailed description of the findings.
- **Files affected**: Links to the exact file paths.
- **Recommended fix**: Clear description of the resolution.
- **Risk if ignored**: Consequence of leaving it unresolved.
```
