#!/bin/bash

# Create abi directory
mkdir -p abi

# Export ABIs
forge inspect TokenDistributor abi > abi/TokenDistributor.json
forge inspect MockFailingToken abi > abi/MockFailingToken.json

# Format JSON files
for f in abi/*.json; do
    cat "$f" | jq '.' > "$f.tmp" && mv "$f.tmp" "$f"
done 