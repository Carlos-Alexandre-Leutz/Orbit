#!/usr/bin/env bash
# Creates or updates the labels used by the Orbit backlog. Safe to run many times.
# Usage: scripts/setup-labels.sh [owner/repo]   (defaults to the current repository)
set -euo pipefail

REPO_ARGS=()
if [[ $# -ge 1 ]]; then
  REPO_ARGS=(--repo "$1")
fi

label() {
  gh label create "$1" --color "$2" --description "$3" --force "${REPO_ARGS[@]}" >/dev/null
  echo "label: $1"
}

# Item type
label epic "5319e7" "Epic"
label pbi "0e8a16" "Product backlog item"
label task "1d76db" "Task"

# Priority
label must-have "b60205" "Never cut"
label cuttable "fbca04" "First to cut if the schedule slips"

# Phase
label F1 "bfdadc" "Phase 1: foundation and store"
label F2 "bfdadc" "Phase 2: RAG, ML and evals"
label F3 "bfdadc" "Phase 3: multi-agent and governance"
label F4 "bfdadc" "Phase 4: docs and launch"

# Epics E0 to E12
for n in $(seq 0 12); do
  label "E${n}" "c5def5" "Epic E${n}"
done
