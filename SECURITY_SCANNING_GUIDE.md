# Security Scanning Configuration Guide

## Overview

This document explains our security scanning setup and how to maintain it properly.

## Current Security Scanning Stack

Our CI/CD pipeline includes three layers of security scanning:

1. **npm audit** - Dependency vulnerability scanning
2. **Trivy** - Filesystem and container image vulnerability scanning
3. **Gitleaks** - Secret detection and prevention

---

## Gitleaks Configuration

### What is Gitleaks?

Gitleaks scans git repositories for hardcoded secrets, API keys, passwords, and other sensitive information that should never be committed to version control.

### Configuration File: `.gitleaks.toml`

Located at the repository root, this file controls:
- Which files/paths to exclude from scanning
- Which patterns to allow (false positive handling)
- Custom rules and detection patterns

### Current Allowlist Strategy

#### 1. Path Exclusions
Files/directories that are automatically excluded:
- `**/__tests__/**` - Test files
- `**/__mocks__/**` - Mock data
- `**/__fixtures__/**` - Test fixtures
- `**/*.test.ts` - Test files
- `**/*.spec.ts` - Spec files
- `**/*.fixture.ts` - Fixture files
- `.env.example` - Example environment files
- `apps/api-gateway/tests/setup.ts` - Test setup
- `apps/frontend/tests/setup.ts` - Test setup

#### 2. Regex Pattern Allowlist
Patterns that are allowed (won't trigger alerts):
- `test-*-secret*` - Test secrets
- `development-secret-key` - Development fallback secrets
- `example` credentials - Example/placeholder values
- AWS example credentials (AKIAIOSFODNN7EXAMPLE)

#### 3. Stopwords
Common words that reduce false positives:
- example
- test
- development
- fallback
- default
- placeholder

---

## Pipeline Status and Strategy

### Current Status: TEMPORARY Non-Blocking

The Gitleaks check is currently set to `continue-on-error: true` in the workflow.

**Why?**
- Allows deployment to continue while we fine-tune the configuration
- Prevents blocking legitimate deployments due to false positives
- Still runs and reports findings for visibility

**When to remove?**
After 2-3 successful builds with no false positives, remove the `continue-on-error: true` flag to make it blocking again.

### File Location
`.github/workflows/deploy-production.yml` - Line 125

### How to Re-enable Blocking

1. Verify Gitleaks passes for 2-3 builds
2. Remove these lines from the workflow:
   ```yaml
   # TEMPORARY: Non-blocking while we configure allowlist properly
   # TODO: Remove continue-on-error after configuring .gitleaks.toml
   continue-on-error: true
   ```
3. Commit and push changes
4. Monitor the next build to ensure it passes

---

## Handling False Positives

### When Gitleaks Fails

1. **Review the finding** - Is it a real secret or false positive?

2. **If it's a REAL secret:**
   - IMMEDIATELY rotate the secret
   - Remove it from the codebase
   - Add it to GitHub Secrets or environment variables
   - Use environment variables in code: `process.env.SECRET_NAME`
   - Update production deployments with new secret
   - Consider using tools like `git-filter-repo` to remove from history

3. **If it's a FALSE POSITIVE:**

   **Option A: Path Exclusion (Recommended for test files)**
   Add the path to `.gitleaks.toml`:
   ```toml
   paths = [
     '''path/to/file\.ts$''',
   ]
   ```

   **Option B: Regex Allowlist (Recommended for specific patterns)**
   Add a regex pattern to `.gitleaks.toml`:
   ```toml
   [[allowlist.regexes]]
   regex = '''your-pattern-here'''
   description = "Description of why this is safe"
   ```

   **Option C: Stopwords (For common non-secret words)**
   Add to stopwords list in `.gitleaks.toml`:
   ```toml
   [[allowlist.stopwords]]
   stopwords = [
     'yourword',
   ]
   ```

### Testing Gitleaks Locally

Before pushing changes, test Gitleaks locally:

```bash
# Install Gitleaks
brew install gitleaks  # macOS
# or
curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/scripts/install.sh | sh -s -- -b /usr/local/bin

# Run Gitleaks with your config
gitleaks detect --config .gitleaks.toml --verbose

# Scan specific commit
gitleaks detect --config .gitleaks.toml --log-opts="HEAD^..HEAD"

# Generate baseline file (for existing issues you can't fix immediately)
gitleaks detect --config .gitleaks.toml --report-path gitleaks-report.json --baseline-path .gitleaks-baseline.json
```

### Using a Baseline File

If you have existing secrets that can't be immediately fixed:

1. Generate a baseline:
   ```bash
   gitleaks detect --config .gitleaks.toml --report-path .gitleaks-baseline.json
   ```

2. Update workflow to use baseline:
   ```yaml
   - name: Check for secrets with Gitleaks
     uses: gitleaks/gitleaks-action@v2
     with:
       config-path: .gitleaks.toml
       baseline-path: .gitleaks-baseline.json
   ```

3. Add `.gitleaks-baseline.json` to git (but review it first!)

**WARNING:** Baseline files should be temporary. Create tickets to fix the underlying issues.

---

## Best Practices for Secret Management

### DO's

1. **Use environment variables** for all secrets
   ```typescript
   const secret = process.env.SECRET_NAME;
   ```

2. **Store secrets in GitHub Secrets** for CI/CD
   - Settings → Secrets and variables → Actions
   - Use descriptive names: `DATABASE_URL`, `JWT_SECRET`

3. **Use .env files locally** (never commit them!)
   ```bash
   # .gitignore should include:
   .env
   .env.local
   .env.*.local
   ```

4. **Provide .env.example** files
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   JWT_SECRET=your-secret-here
   ```

5. **Rotate secrets regularly**
   - After team member departure
   - After potential exposure
   - On a schedule (quarterly/annually)

6. **Use strong, random secrets**
   ```bash
   # Generate secure random secrets
   openssl rand -base64 32

   # Or using Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

### DON'Ts

1. **Never hardcode secrets** in source code
   ```typescript
   // BAD
   const apiKey = 'sk-1234567890abcdef';

   // GOOD
   const apiKey = process.env.API_KEY;
   ```

2. **Never commit .env files**
   Always in `.gitignore`

3. **Never log secrets**
   ```typescript
   // BAD
   console.log('API Key:', apiKey);

   // GOOD
   console.log('API Key:', apiKey ? '[REDACTED]' : 'not set');
   ```

4. **Never put secrets in URLs** if avoidable
   ```typescript
   // BAD
   const url = `https://api.example.com?api_key=${apiKey}`;

   // GOOD - use headers
   fetch('https://api.example.com', {
     headers: { 'Authorization': `Bearer ${apiKey}` }
   });
   ```

5. **Never share secrets via chat/email**
   - Use password managers (1Password, LastPass)
   - Use secure secret sharing tools
   - Use GitHub Secrets for CI/CD

---

## Development vs Production Secrets

### Development Fallbacks

It's acceptable to have fallback secrets for development:

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
```

**Rules:**
1. Must have `development`, `dev`, `test`, or `example` in the value
2. Must not be used in production (check `NODE_ENV`)
3. Should log a warning when used:
   ```typescript
   if (!process.env.JWT_SECRET) {
     console.warn('Using development secret - DO NOT USE IN PRODUCTION');
   }
   ```

### Production Secrets

Production must ALWAYS use environment variables:

```typescript
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
```

---

## Trivy Configuration

Trivy scans for vulnerabilities in:
- Dependencies (npm packages)
- Docker images
- Filesystem

### Current Configuration

- Severity filter: `CRITICAL,HIGH`
- Exit code: `0` (non-blocking, informational)
- Format: SARIF (uploaded to GitHub Security)

### Viewing Results

GitHub Security Tab → Code scanning alerts

### Making Trivy Blocking

To fail builds on critical vulnerabilities:

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'  # Changed from '0' to '1'
```

---

## npm Audit Configuration

### Current Behavior

Runs with `|| true` to not block builds.

### Making npm Audit Blocking

Remove the `|| true`:

```yaml
- name: Run npm audit
  run: |
    npm audit --audit-level=moderate
```

Or be more selective:

```yaml
- name: Run npm audit
  run: |
    npm audit --audit-level=high  # Only fail on high/critical
```

---

## Monitoring and Maintenance

### Weekly Tasks

1. Review GitHub Security tab for new vulnerabilities
2. Update dependencies with `npm audit fix`
3. Review Gitleaks findings (if any)

### Monthly Tasks

1. Review and update `.gitleaks.toml` configuration
2. Audit baseline files (if using)
3. Review and rotate long-lived secrets

### Quarterly Tasks

1. Full security audit
2. Review all GitHub Secrets
3. Update security scanning tools
4. Review and update this documentation

---

## Incident Response

### If a Secret is Committed

1. **STOP** - Don't panic, but act quickly
2. **Rotate the secret immediately** (before anything else)
3. **Remove from current code** and replace with env var
4. **Remove from git history:**
   ```bash
   # Install git-filter-repo
   pip install git-filter-repo

   # Remove the secret (replace path/to/file)
   git filter-repo --path path/to/file --invert-paths

   # Force push (coordinate with team!)
   git push origin --force --all
   ```
5. **Update production systems** with new secret
6. **Document the incident** for compliance
7. **Review access logs** for potential unauthorized access

### If Secret was Pushed to GitHub

1. Consider the secret **compromised**
2. Rotate immediately
3. GitHub may have detected it - check Security tab
4. If public repo - assume it's been scraped by bots
5. Monitor for unauthorized access

---

## Advanced Configuration

### Custom Gitleaks Rules

Add custom detection rules in `.gitleaks.toml`:

```toml
[[rules]]
id = "custom-api-key"
description = "Custom API Key Pattern"
regex = '''(?i)custom[_-]?api[_-]?key[_-]?[:=]\s*['"]?[a-z0-9]{32}['"]?'''
tags = ["key", "custom"]
```

### Pre-commit Hooks

Prevent secrets from being committed in the first place:

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
EOF

# Install hooks
pre-commit install
```

### Integrating with IDEs

**VS Code Extension:**
- Install "Gitleaks" extension
- Automatically scans on save

**IntelliJ/WebStorm:**
- Settings → Plugins → Search "Gitleaks"
- Configure to run on commit

---

## Troubleshooting

### Gitleaks Action Fails to Start

- Check `.gitleaks.toml` syntax (TOML format)
- Verify `config-path` in workflow matches file location

### Too Many False Positives

- Review and expand path exclusions
- Add regex patterns for known safe patterns
- Consider using stopwords
- Generate and use a baseline file temporarily

### Secrets Detected in Dependencies

- These are in `node_modules/` - usually false positives
- Add to path exclusions:
  ```toml
  paths = [
    '''node_modules/.*'''
  ]
  ```

### Can't Remove Secret from History

- Use `git-filter-repo` (better than `filter-branch`)
- Backup repository first
- Coordinate with team before force-pushing
- Consider creating new repository if history is too messy

---

## Resources

- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP Secrets Management](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [npm Audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)

---

## Questions?

For questions about this configuration, contact the DevOps team or review recent commits to this file.

Last updated: 2025-12-18
