#!/bin/bash
set -e

current=$(head -1 version)
major=$(echo "$current" | cut -d. -f1)
minor=$(echo "$current" | cut -d. -f2)
patch=$(echo "$current" | cut -d. -f3)

if [[ "$1" == "--minor" ]]; then
    minor=$(( minor + 1 ))
    patch=0
else
    patch=$(( patch + 1 ))
fi

new="${major}.${minor}.${patch}"

echo "$new" > version
git add version
git commit -m "chore: bump version to ${new}"
git push origin master
git tag "v${new}"
git push origin "v${new}"
gh release create "v${new}" --generate-notes
