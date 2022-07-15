#!/bin/bash

# IMPT:
# $ sudo apt-get install jq

for value in 5G-Lumous 4G-Lumous 4G-NYU 4G-Belgium
do
echo "Processing network profile: $value .."

# @CONFIGURE
NUMRUNS=2
NETWORKPROFILE=$value
NUMCLIENTS=1
VIDEOCOMMENT="[batchTest] $NETWORKPROFILE $NUMCLIENTS clients"
# END @CONFIGURE


## Update package.json - global
sudo jq -c ".config.network_profile = \"$NETWORKPROFILE\"" package.json > tmp.$$.json && mv tmp.$$.json package.json
sudo jq -c ".config.num_clients = $NUMCLIENTS" package.json > tmp.$$.json && mv tmp.$$.json package.json
sudo jq -c ".config.batchTest_enabled = true" package.json > tmp.$$.json && mv tmp.$$.json package.json

## Just in case
sudo rm -rf tmpUserDataDir

#############
# WITH_CMCD # - abrAhaggar
#############
# Update package.json - run-specific
sudo jq -c '.config.abr_strategy = "abrAhaggar"' package.json > tmp.$$.json && mv tmp.$$.json package.json

for (( c=1; c<=$NUMRUNS; c++ ))
do
    TESTCOMMENT="${VIDEOCOMMENT}. with_cmsd abrAhaggar. run ${c}."
    sudo jq -c ".config.batchTest_comments = \"$TESTCOMMENT\"" package.json > tmp.$$.json && mv tmp.$$.json package.json

    # sudo bash tc-network-profiles/kill.sh
    sudo npm run test-multiple-clients
    sudo rm -rf tmpUserDataDir
done


###########
# NO_CMCD # - abrThroughput
###########
# Update package.json - run-specific
sudo jq -c '.config.abr_strategy = "abrThroughput"' package.json > tmp.$$.json && mv tmp.$$.json package.json

for (( c=1; c<=$NUMRUNS; c++ ))
do
    TESTCOMMENT="${VIDEOCOMMENT}. no_cmsd abrThroughput. run ${c}."
    sudo jq -c ".config.batchTest_comments = \"$TESTCOMMENT\"" package.json > tmp.$$.json && mv tmp.$$.json package.json

    # sudo bash tc-network-profiles/kill.sh
    sudo npm run test-multiple-clients
    sudo rm -rf tmpUserDataDir
done


###########
# NO_CMCD # - abrDynamic
###########
# Update package.json - run-specific
sudo jq -c '.config.abr_strategy = "abrDynamic"' package.json > tmp.$$.json && mv tmp.$$.json package.json

for (( c=1; c<=$NUMRUNS; c++ ))
do
    TESTCOMMENT="${VIDEOCOMMENT}. no_cmsd abrDynamic. run ${c}."
    sudo jq -c ".config.batchTest_comments = \"$TESTCOMMENT\"" package.json > tmp.$$.json && mv tmp.$$.json package.json

    # sudo bash tc-network-profiles/kill.sh
    sudo npm run test-multiple-clients
    sudo rm -rf tmpUserDataDir
done


# ##########
# NO_CMCD # - abrBola
# ##########
# Update package.json - run-specific
sudo jq -c '.config.abr_strategy = "abrBola"' package.json > tmp.$$.json && mv tmp.$$.json package.json

for (( c=1; c<=$NUMRUNS; c++ ))
do
    TESTCOMMENT="${VIDEOCOMMENT}. no_cmsd abrBola. run ${c}."
    sudo jq -c ".config.batchTest_comments = \"$TESTCOMMENT\"" package.json > tmp.$$.json && mv tmp.$$.json package.json

    # sudo bash tc-network-profiles/kill.sh
    sudo npm run test-multiple-clients
    sudo rm -rf tmpUserDataDir
done


###########
# NO_CMCD # - abrFastMPC
###########
# Update package.json - run-specific
sudo jq -c '.config.abr_strategy = "abrFastMPC"' package.json > tmp.$$.json && mv tmp.$$.json package.json

for (( c=1; c<=$NUMRUNS; c++ ))
do
    TESTCOMMENT="${VIDEOCOMMENT}. no_cmsd abrFastMPC. run ${c}."
    sudo jq -c ".config.batchTest_comments = \"$TESTCOMMENT\"" package.json > tmp.$$.json && mv tmp.$$.json package.json

    # sudo bash tc-network-profiles/kill.sh
    sudo npm run test-multiple-clients
    sudo rm -rf tmpUserDataDir
done


###########
# NO_CMCD # - abrPensieve
###########
# Update package.json - run-specific
sudo jq -c '.config.abr_strategy = "abrPensieve"' package.json > tmp.$$.json && mv tmp.$$.json package.json

for (( c=1; c<=$NUMRUNS; c++ ))
do
    TESTCOMMENT="${VIDEOCOMMENT}. with_cmsd abrPensieve. run ${c}."
    sudo jq -c ".config.batchTest_comments = \"$TESTCOMMENT\"" package.json > tmp.$$.json && mv tmp.$$.json package.json

    # sudo bash tc-network-profiles/kill.sh
    sudo npm run test-multiple-clients
    sudo rm -rf tmpUserDataDir
done


sudo rm package.json
sudo cp package.json.backup package.json

sudo bash tc-network-profiles/kill.sh

done  # end for loop of list of network profile values
