#!/bin/bash

echo "Enter the network name (e.g. sepolia, mainnet):"
read NETWORK

npm run compile
npm run scout:deploy:erc20 $NETWORK || exit 1
echo "ERC20 deployment completed. Press enter to continue, any other key to exit."
read -n 1 key
if [[ $key != "" ]]; then
    exit 1
fi

npm run scout:deploy:buildernft $NETWORK || exit 1
echo "Builder NFT deployment completed. Press enter to continue, any other key to exit."
read -n 1 key
if [[ $key != "" ]]; then
    exit 1
fi

npm run scout:deploy:vesting $NETWORK || exit 1
echo "Vesting deployment completed. Press enter to continue, any other key to exit."
read -n 1 key
if [[ $key != "" ]]; then
    exit 1
fi

npm run scout:deploy:easresolver $NETWORK || exit 1
echo "EAS Resolver deployment completed. Press enter to continue, any other key to exit."
read -n 1 key
if [[ $key != "" ]]; then
    exit 1
fi

npm run scout:deploy:protocol $NETWORK || exit 1
echo "Protocol deployment completed."
