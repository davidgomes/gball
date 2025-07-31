#!/bin/bash

# Script to set up git hooks for the project

echo "Setting up git hooks..."

# Configure git to use the .githooks directory
git config core.hooksPath .githooks

echo "✅ Git hooks have been configured!"
echo ""
echo "The following hooks are now active:"
echo "- pre-commit: Automatically builds frontend before committing on main branch"
echo ""
echo "To disable hooks, run: git config --unset core.hooksPath"