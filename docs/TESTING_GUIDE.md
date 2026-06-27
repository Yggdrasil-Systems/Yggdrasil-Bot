# Testing Guide

## Test Runner

World Tree uses Node's built-in test runner.

## Command

```bash
npm test
```

## Coverage Shape

The suite covers:

- API server and routes
- OAuth/session behavior
- env validation
- command loading and routing
- permission guards
- moderation, settings, and no-prefix services
- music commands and interaction handlers
- interaction registry behavior

## Notes

- some music-related tests emit expected `discord-player` / client warnings from mocks
- the dashboard is currently contract/documentation-only, not a frontend runtime
