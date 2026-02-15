/**
 * Mason PR Review Assistant
 * Sends a PR diff to Claude Sonnet and posts a structured code review as a PR comment.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const {
  ANTHROPIC_API_KEY,
  GH_TOKEN,
  PR_NUMBER,
  PR_TITLE,
  PR_AUTHOR,
  REPO,
  DIFF_PATH,
} = process.env;

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is not set');
  process.exit(1);
}

if (!PR_NUMBER || !REPO || !DIFF_PATH) {
  console.error('❌ Missing required environment variables: PR_NUMBER, REPO, DIFF_PATH');
  process.exit(1);
}

// Read the diff
let diff;
try {
  diff = readFileSync(DIFF_PATH, 'utf8');
} catch (err) {
  console.error(`❌ Could not read diff from ${DIFF_PATH}:`, err.message);
  process.exit(1);
}

if (!diff.trim()) {
  console.log('ℹ️  Empty diff — skipping review.');
  process.exit(0);
}

// Truncate diff if too large (Claude has context limits)
const MAX_DIFF_CHARS = 80000;
let truncated = false;
if (diff.length > MAX_DIFF_CHARS) {
  diff = diff.slice(0, MAX_DIFF_CHARS);
  truncated = true;
  console.warn(`⚠️  Diff truncated to ${MAX_DIFF_CHARS} characters`);
}

const systemPrompt = `You are Mason, an expert AI code reviewer for the OpenClaw agent team. 
Your reviews are clear, constructive, and actionable. You focus on correctness, security, 
maintainability, and best practices. Be concise but thorough. You appreciate good work 
when you see it and are direct about problems when they exist.`;

const userPrompt = `Please review the following pull request:

**PR Title:** ${PR_TITLE || '(no title)'}
**Author:** ${PR_AUTHOR || 'unknown'}
**Repo:** ${REPO}
${truncated ? '\n> ⚠️ _Note: Diff was truncated due to size — review covers the first 80k characters._\n' : ''}

---

\`\`\`diff
${diff}
\`\`\`

---

Provide a structured review in this exact format:

## 🤖 Mason's Code Review

### 📋 Summary of Changes
[Brief description of what this PR does — 2-4 sentences]

### ✅ What Looks Good
[Positive aspects, good patterns, well-written code]

### ⚠️ Potential Issues or Bugs
[Any logic errors, edge cases, security concerns, or performance problems. If none, say "None identified."]

### 💡 Suggestions for Improvement
[Style, naming, architecture, test coverage, or other improvements. If none, say "None — looks great!"]

### 🎯 Overall Assessment
**[APPROVE / NEEDS CHANGES / MINOR COMMENTS]**

[One sentence verdict and reason]

---
*Review by Mason AI · Powered by Claude Sonnet*`;

async function runReview() {
  console.log(`🔍 Reviewing PR #${PR_NUMBER} on ${REPO}...`);

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  let reviewText;
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    });
    reviewText = message.content[0].text;
  } catch (err) {
    console.error('❌ Anthropic API error:', err.message);
    process.exit(1);
  }

  console.log('✅ Review generated. Posting comment...');

  // Post the comment to the PR using gh CLI
  try {
    // Write review to temp file to avoid shell escaping issues
    const { writeFileSync } = await import('fs');
    const tmpPath = '/tmp/review-comment.md';
    writeFileSync(tmpPath, reviewText, 'utf8');

    execSync(
      `gh pr comment ${PR_NUMBER} --repo ${REPO} --body-file ${tmpPath}`,
      { env: { ...process.env, GH_TOKEN }, stdio: 'inherit' }
    );
    console.log(`✅ Review posted to PR #${PR_NUMBER}`);
  } catch (err) {
    console.error('❌ Failed to post comment:', err.message);
    process.exit(1);
  }
}

runReview();
