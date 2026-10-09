# Git Workflow & Commit Standards

## Purpose
Define commit and version control standards for all contributors and AI agents working on DMS-O2.

## Atomic Commits Principle
1. **One Logical Change = One Commit**: Group all files belonging to a single feature, bugfix, refactor, or documentation update into a single cohesive commit.
2. **Never Commit One File at a Time**: Do not split changes across multiple commits per file when they are part of the same logical unit of work (e.g. updating 6 UI components for a design token change, or updating a model alongside its migration and view).
3. **No Broken Intermediate States**: Every commit must leave the repository in a valid, compiling, and test-passing state.

## State & Documentation Synchronization
- When completing a task or milestone, stage and commit the updated state files together:
  - `.dev/state/active-task.md`
  - `.dev/state/progress.md`
  - `.dev/changelog-dev.md`
- Do not split sprint tracking and changelog entries across separate micro-commits.

## Conventional Commit Formatting
All commits must follow the Conventional Commits specification:
- `feat(<scope>)`: A new user or platform feature
- `fix(<scope>)`: A bug fix
- `refactor(<scope>)`: Code refactoring without behavior change
- `docs(<scope>)`: Documentation changes
- `test(<scope>)`: Adding or modifying tests
- `chore(<scope>)`: Maintenance, build tasks, or dependency updates
