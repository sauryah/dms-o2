# Current Goal

## Purpose
Define the current objective for AI sessions.
**Why:** Provide clear direction and success criteria.
**Read by:** AI agents.
**Updated:** When goal changes.

## Current Goal
**Objective:** Implement Location Grid & Physical Schema (Roadmap Phase 2)
**Target Date:** TBD
**Priority:** High

## Goal Description
Migrate free-text `Die.location` to structured table (`rack_id` + `shelf_number`) and prevent tool assignment to non-existent layout spots.

## Success Criteria
1. Location table created with rack_id and shelf_number
2. Die model updated to reference Location table
3. Validation prevents assignment to non-existent locations
4. API endpoints updated to work with new structure
5. Frontend updated to display location information
6. All tests pass
7. Documentation updated

## Current Progress
- ✅ AI Engineering Operating System complete
- ✅ Roadmap Phase 1 (Security) complete
- 🔄 Roadmap Phase 2 (Location Grid) ready to start

## How to Achieve
1. Read affected module documentation
2. Review existing location-related code
3. Design Location model
4. Create database migration
5. Update Die model and views
6. Add validation logic
7. Update API endpoints
8. Update frontend components
9. Write tests
10. Update documentation

## Definition of Done
- Location table created and populated
- Die.location field migrated to Location foreign key
- Validation prevents invalid location assignments
- All existing functionality preserved
- All tests pass
- Documentation updated
