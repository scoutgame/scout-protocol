#!/bin/bash

echo "Enter the network name (e.g. opsepolia, optimism, sepolia, basesepolia, base):"
read NETWORK

# Validate network name against supported chains
case $NETWORK in
  "opsepolia"|"optimism"|"sepolia"|"basesepolia"|"base")
    echo "Using network: $NETWORK"
    ;;
  *)
    echo "Error: Invalid network name. Supported networks are:"
    echo "- opsepolia"
    echo "- optimism"
    echo "- sepolia" 
    echo "- basesepolia"
    echo "- base"
    exit 1
    ;;
esac



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

echo -e "Copy over the contract addresses to scripts/deploy/prepareScoutGameLaunchSafeTransaction.ts"
echo -e "Once done, run this command to deploy the safe transaction:"
echo -e "\033[1;34mnpm run scout:launch:season01\033[0m"
