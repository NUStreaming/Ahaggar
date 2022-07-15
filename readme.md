# CMSD-DASH

CMSD-enabled dash.js + Node.js prototype for paper titled: "___TBC___" as submitted to ___TBC___. 


## Setup and Testing

Run the Node.js server:
- Navigate to the `server/nodejs` folder
- Install the dependencies using `npm install`
- Start the server using `npm run start`

Run the dash.js client (not needed for the automated experiment; only needed for manual testing):
- Navigate to the `dash.j-4.2.1/` folder
- Install the dependencies using `npm install`
- Build, watch file changes and launch samples page using `npm run start` (or `grunt dev` for `dash.js/` folder which uses dash.js v3.1.3)
- Test the dash.js application by navigating to `http://⟨MachineIP_ADDRESS⟩:3000/samples/cmsd-dash/index.html` to view the CMSD-enabled player
- Parameter setting in `samples/cmsd-dash/index.html`: 
    - To route the request through the bitrateGuidance endpoint at the server, use: `http://localhost:8082/cmsd-express/bitrateGuidance/media/vod/sports/manifest.mpd` (whereas to simply retrieve the static media files, use: `http://localhost:8082/media/vod/sports/manifest.mpd`)
    - To use the AhaggarRule custom abr, use: `abrStrategyInput="abrAhaggar"` (whereas to use the default abr rules, use: `abrStrategyInput="abrThroughput"`)

Run the automated experiment:
- Navigate to the `dash-test/` folder
- Install the dependencies using `npm install`
- Edit `network_profile` in `dash-test/package.json` to specify the desired bandwidth profile for the test. The list of available bandwidth profiles are given in `dash-test/tc-network-profiles/new_profiles/5s`
- Edit the other params in `dash-test/package.json`, eg. no. of clients (`num_clients`: 1-10), abr strategy to be used in the client (`abr_strategy`: abrAhaggar/abrThroughput/abrDynamic/abrBola)
- Edit the other params in `dash-test/client_profile_join_test_combined.js`, eg. minimum buffer (`minBufferGlobal`), maximum buffer (`maxBufferGlobal`), video location (`url`) and segment duration (`segmentDuration`). The set of video datasets are located in `server/nodejs/public/media/vod/`
- Start a test using `npm run test-multiple-clients`. Note that testing is done in Chrome headless mode by default inside docker containers. Note that dash.js will be run automaticly in each client. So no need to run dash.js manually to run multiple client test. Only the (Node.js) web server needs to be running before starting the test.
- We also provide a batch testing script at `batch_test.sh` (chains multiple cmsd and non-cmsd runs). Edit the parameters in the file accordingly and then run the batch test script with `sudo bash batch_test.sh`
    - Note that the parameter values in `batch_test.sh` will overwrite those in `package.json`, hence there is no need to edit the latter for this batch test run
    - Note that the `jq` tool must be installed to use the batch test script: `sudo apt-get install jq`
    - If the batch test script is terminated prematurely, check that the background processes are killed (eg. docker)
- Once the runs are finished, all docker containers should have been stopped. In case they still remain `docker stop $(docker ps -q --filter ancestor=dash-test)` can be used to stop them
- On completing the test run, results are generated in the `results/<timestamp>_multiple_clients/` folder ordered by the test run’s timestamp
- To generate summary results across all clients in a test run, first navigate to the `results/` folder and then run `python generate_summary.py`


## Other Component Details

There are three main components in this setup and they correspond to the three main sub-folders:

- `/server/nodejs`: Node.js server
- `/dash.js-4.2.1`: dash.js client (v4.2.1)
- `/dash-test`: Automated testing with Puppeteer and scripts

### dash.js Client

- Official dash.js reference player integrated with CMCD support (dash.js v4.2.1) and customized with additional CMSD support as required in the paper
- Refer to `dash.js-4.2.1/samples/cmsd-dash` files and customized `src` files (`src/streaming/net/HTTPLoader.js`, `src/streaming/rules/ThroughputHistory.js`, `src/core/Settings.js`, `src/streaming/models/CmcdModel.js`) for our setup's dash.js client (we added CMSD support, custom ABR rule (AhaggarRule), metrics collection and other supplementary features for our setup)

<!-- ### Automated Testing with Puppeteer and Scripts

- Puppeteer is used for automated headless Chrome-based testing
- Headless mode can also be turned off in `dash-test/run-multiple-clients.js` (search for parameter `headless`) -- **NOT AVAILABLE IN DOCKER MODE** -->


## Troubleshooting Common Issues

### Testing Environment

- If the batch test script is terminated prematurely, checks must be done to ensure that all background processes are cleared:
    - Chrome: `sudo ps aux | grep chrome` and kill if any is present
    - tc: `sudo bash tc-network-profiles/kill.sh`
    - docker: `sudo systemctl restart docker`
- The network shaping script uses `sudo tc <...>`. To avoid/rectify password prompting issues, you may wish to add this to your `visudo` file: `ALL ALL=NOPASSWD: /usr/sbin/tc`
- For docker error `stderr: Got permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock`, run `sudo chmod 666 /var/run/docker.sock` to resolve

### Other Useful Commands

- Verify network shaping: Use `iperf3` tool to test bandwidth. Eg. run `iperf3 -s` on the server and `iperf3 -c <hostname> -R` on the client (hostname: `localhost` or `host.docker.internal` if you are running from docker container) to measure bandwidth from server to client.
- Access docker container: Run `docker ps` to retrieve container_id then `docker -exec -it <container_id> /bin/bash` to access.