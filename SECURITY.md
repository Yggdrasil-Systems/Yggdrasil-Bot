# Security Policy

## Supported Versions

World Tree currently supports the latest `master` branch and the latest tagged release once releases begin.

## Reporting a Vulnerability

Do not open a public issue for sensitive security findings.

Use one of these channels:

1. Open a private security advisory on GitHub if the repository has advisories enabled.
2. If advisories are not available, open a normal issue only for non-sensitive problems.
3. For anything involving credentials, OAuth flows, cookies, session handling, or moderation bypasses, contact the maintainer privately through the repository owner account before disclosure.

## What To Include

- affected area
- reproduction steps
- impact assessment
- logs or screenshots with secrets removed
- suggested mitigation if known

## Response Expectations

- acknowledgement target: within 7 days
- triage target: within 14 days
- coordinated fix and disclosure once a patch is available

## Scope Highlights

Security-sensitive areas in this repository include:

- Discord OAuth2 + PKCE
- cookie/session encryption and signing
- permission and trust-boundary checks
- no-prefix command privileges
- moderation and automod actions
- music subsystem external-process execution

## Safe Harbor

Good-faith research that avoids privacy violations, service disruption, data destruction, or credential exfiltration is welcome.
