#!/bin/bash

#killall -9 Cascade.sh
#killall -9 Spike.sh

# sudo pkill -f Cascade.sh
# sudo pkill -f Spike.sh
# sudo pkill -f Cascadex2.sh
# sudo pkill -f Spikex2.sh
# sudo pkill -f Spikex2_B.sh

for f in tc-network-profiles/**/*.sh
do
    currentScriptName=`basename "$0"`
    if [[ "$f" != *"$currentScriptName"* ]];
    then
        # echo "Running: '$ sudo pkill -f ${f}'"
        # sudo pkill -f ${f}

        ## Only kill process if exist
        if pgrep -f ${f}; then echo "Running: '$ sudo pkill -f ${f}'"; sudo pkill -f ${f}; fi
    fi
done

# sudo pkill tc     ## Causes issues w my ubuntu when ran >1 times; interface del should suffice to clear rules

# sudo tc qdisc delete dev lo root handle 1:0
# sudo tc qdisc delete dev lo root handle 1:0
# sudo tc qdisc delete dev lo root handle 1:0
# sudo tc qdisc delete dev lo root handle 1:0
# sudo tc qdisc delete dev lo root handle 1:0

## Only delete interface if exist
sudo tc qdisc delete dev lo root handle 1:0 2>/dev/null || true
sudo tc qdisc delete dev docker0 root handle 1:0 2>/dev/null || true

echo '---------- Shaping End -----------'
