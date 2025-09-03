# Spec-Driven Development for William AI Scribe

## Overview

This directory contains the living specifications that drive the development of William AI Scribe. These specifications serve as the single source of truth for both human developers and AI agents implementing features.

## Directory Structure

```
specs/
├── README.md                  # This file - overview of spec-driven approach
├── specification.md           # Main product specification
├── plan.md                   # Technical implementation plan
├── tasks/                    # Individual task breakdowns
│   ├── completed/           # Finished tasks (archived)
│   ├── in-progress/         # Currently being worked on
│   └── backlog/             # Tasks ready for implementation
├── context/                 # Shared context for AI agents
│   ├── architecture.md     # System design decisions
│   ├── constraints.md      # Technical/business constraints
│   ├── style-guide.md      # Coding standards
│   └── domain-glossary.md  # Business terminology
└── validations/            # Acceptance criteria and tests
    ├── checklists/         # Feature validation checklists
    └── test-scenarios/     # Detailed test cases
```

## How to Use These Specifications

### For AI Agents (Claude, GitHub Copilot, etc.)

1. **Before implementing any feature**:
   - Read the main `specification.md` for product requirements
   - Review `plan.md` for technical approach
   - Check `context/constraints.md` for what to avoid
   - Follow `context/style-guide.md` for code standards

2. **When working on a task**:
   - Find the task in `tasks/backlog/`
   - Move it to `tasks/in-progress/` when starting
   - Follow the acceptance criteria exactly
   - Run validation checklists before marking complete

3. **For code generation**:
   - Use `context/architecture.md` to understand system design
   - Reference `context/domain-glossary.md` for correct terminology
   - Generate tests based on `validations/test-scenarios/`

### For Human Developers

1. **Adding new features**:
   - First update `specification.md` with requirements
   - Create task breakdowns in `tasks/backlog/`
   - Define validation criteria in `validations/`
   - Then implement or delegate to AI

2. **Reviewing AI-generated code**:
   - Check against specifications for accuracy
   - Verify all acceptance criteria are met
   - Ensure constraints are respected
   - Validate with provided checklists

3. **Maintaining specifications**:
   - Keep specifications in sync with code
   - Update when requirements change
   - Archive completed tasks
   - Document lessons learned

## Specification Principles

1. **Completeness**: Every feature must be fully specified before implementation
2. **Testability**: All requirements must have measurable acceptance criteria
3. **Clarity**: Specifications should be unambiguous and precise
4. **Maintainability**: Keep specifications updated as the system evolves
5. **Accessibility**: Written for both humans and AI to understand

## Specification Status

- **Coverage**: ~40% of existing features documented
- **Migration Phase**: Initial setup
- **Priority Focus**: Voice chat system and core AI features
- **Next Steps**: Complete extraction from existing codebase

## Quick Links

- [Main Specification](./specification.md) - Product requirements
- [Technical Plan](./plan.md) - Implementation approach
- [Current Tasks](./tasks/in-progress/) - What's being worked on
- [Validation Checklists](./validations/checklists/) - Quality assurance

## Contributing to Specifications

1. Use clear, precise language
2. Include examples where helpful
3. Define edge cases explicitly
4. Provide acceptance criteria
5. Keep technical jargon minimal
6. Update promptly when code changes

## AI Agent Instructions

When you (as an AI agent) work with these specifications:

```
1. ALWAYS read relevant specs before coding
2. NEVER deviate from specified behavior
3. IMPLEMENT exactly what's specified
4. TEST against provided criteria
5. UPDATE task status appropriately
6. ASK if specifications are unclear
```

## Version Control

- Specifications are version controlled with the code
- Changes to specs should be committed separately
- Use descriptive commit messages for spec changes
- Tag major specification versions

Last Updated: 2025-09-03
Migration Status: In Progress