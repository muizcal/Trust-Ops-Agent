#!/bin/bash

echo " Deploying Trust Ops Agent to Sui Mainnet"

# Switch to mainnet
sui client switch --env mainnet

# Build
sui move build

# Publish
sui client publish --gas-budget 500000000

echo " Deployment complete!"
echo "Save the Package ID and Registry ID from above"