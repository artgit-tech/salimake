# CLAUDE.md - AI Assistant Guide for salimake

## Project Overview

**salimake** is a new project. This file provides guidance for AI assistants working in this repository.

> **Note:** This repository is in its initial state. Update this document as the project takes shape — add build commands, architecture details, testing instructions, and conventions as they are established.

## Repository Status

- **Current state:** Newly initialized, no source code yet
- **Remote:** `artgit-tech/salimake`

## Quick Reference

| Task | Command |
|------|---------|
| Check status | `git status` |
| Run tests | *TBD — update when test framework is chosen* |
| Lint | *TBD — update when linter is configured* |
| Build | *TBD — update when build system is set up* |

## Directory Structure

```
salimake/
├── CLAUDE.md          # This file — AI assistant guide
└── (project files)    # To be added
```

## Development Workflow

### Git Conventions

- Use clear, descriptive commit messages
- Keep commits focused on a single logical change
- Branch names should be descriptive of the work being done

### Code Style

*To be defined when the primary language and tooling are chosen.*

## Guidelines for AI Assistants

1. **Read before modifying** — Always read a file before suggesting changes to it
2. **Minimize changes** — Only make changes that are directly requested or clearly necessary
3. **Avoid over-engineering** — Keep solutions simple; don't add speculative features
4. **Run checks** — Always run tests, linters, and builds after making changes (once configured)
5. **Update this file** — When adding new tooling, dependencies, or conventions, update this CLAUDE.md to keep it current
6. **Security** — Never commit secrets, credentials, or `.env` files
