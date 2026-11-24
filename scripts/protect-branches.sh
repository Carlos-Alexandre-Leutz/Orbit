#!/usr/bin/env bash
# Protects `main` and `staging`: pull request required (no approvals, the AI merges its own PRs),
# no force-push, no deletion, rules apply to admins, and the CI checks must pass.
# Safe to run many times.
#
#   scripts/protect-branches.sh [owner/repo]           apply the rules
#   scripts/protect-branches.sh --check [owner/repo]   verify the rules, exit 1 if any is missing
set -euo pipefail

MODE=apply
if [[ "${1:-}" == "--check" ]]; then
  MODE=check
  shift
fi
REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
read -ra BRANCHES <<<"${PROTECT_BRANCHES:-main staging}"  # override only to test on a throwaway branch
CHECKS='["commitlint","scripts-tests"]'

apply() {
  gh api -X PUT "repos/${REPO}/branches/$1/protection" --input - >/dev/null <<EOF
{
  "required_status_checks": { "strict": false, "contexts": ${CHECKS} },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
  echo "protected: $1"
}

check() {
  local branch=$1 failed=0 json
  json=$(gh api "repos/${REPO}/branches/${branch}/protection" 2>/dev/null) || { echo "FAIL ${branch}: not protected"; return 1; }
  expect() { # description, jq expression that must be true
    if [[ "$(jq -r "$2" <<<"$json")" == "true" ]]; then echo "ok   ${branch}: $1"; else echo "FAIL ${branch}: $1"; failed=1; fi
  }
  expect "pull request required" '.required_pull_request_reviews != null'
  expect "force-push blocked" '.allow_force_pushes.enabled == false'
  expect "deletion blocked" '.allow_deletions.enabled == false'
  expect "applies to admins" '.enforce_admins.enabled == true'
  expect "check commitlint required" '[.required_status_checks.contexts[]] | index("commitlint") != null'
  expect "check scripts-tests required" '[.required_status_checks.contexts[]] | index("scripts-tests") != null'
  return $failed
}

status=0
for branch in "${BRANCHES[@]}"; do
  if [[ "$MODE" == "apply" ]]; then apply "$branch"; else check "$branch" || status=1; fi
done
exit $status
