const fs = require("fs");
const puppeteer = require("puppeteer-core");
// const normalNetworkPatterns = require("./normal-network-patterns.js");
// const fastNetworkPatterns = require("./fast-network-patterns.js");
// const customNetworkPatterns = require("./custom-network-patterns.js");
// const tcNetworkPatterns = require("./tc-network-patterns.js");
const clientProfile = require(process.env.npm_package_config_client_profile);

const {QoeEvaluator, QoeInfo} = require("../dash.js/samples/cmsd-dash/abr/LoLp_QoEEvaluation.js");

// To run bash commands
const exec = require('child_process').exec

// let patterns = [];
// if (process.env.npm_package_config_ffmpeg_profile === 'PROFILE_FAST') {
//   patterns = fastNetworkPatterns;
// } else {
//   patterns = normalNetworkPatterns
// }

// const configNetworkProfile = process.env.npm_package_config_network_profile;
// // const NETWORK_PROFILE = patterns[configNetworkProfile] || patterns.PROFILE_CASCADE;
// let NETWORK_PROFILE;
// if (patterns[configNetworkProfile]) {
//   NETWORK_PROFILE = patterns[configNetworkProfile]
// // } else if (customNetworkPatterns[configNetworkProfile]) {
// //   NETWORK_PROFILE = customNetworkPatterns[configNetworkProfile]
// // } else if (tcNetworkPatterns[configNetworkProfile]) {
// //   NETWORK_PROFILE = tcNetworkPatterns[configNetworkProfile]
// } else {
//   if (fs.existsSync("tc-network-profiles/" + configNetworkProfile + ".sh")) {
//     NETWORK_PROFILE = "(Server-side network shaping in use. See profile's bash script for details.)"
//   } else {
//     console.log("Error! network_profile not found, exiting with code 1...");
//     process.exit(1);
//   }
// }
// console.log("Network profile: ", configNetworkProfile);
// console.log(NETWORK_PROFILE);
// console.log('\n');

// custom
const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
var input_comments = '';
let clientId = 0;
const batchTestEnabled = (process.env.npm_package_config_batchTest_enabled == 'true'); // convert string to boolean

var runTest = function() {
  // Wait X ms before starting browser
  function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }
  const waitSeconds = 5;
  console.log('Wait ' + waitSeconds + 's before starting browser..');
  sleep(waitSeconds * 1000).then(() => {
    userDataDir = "tmpUserDataDir"
    try {
      fs.rmSync(userDataDir, { recursive: true });
    }
    catch(err){
      if (err.code != 'ENOENT') {
        if (err.code == 'EACCES') { console.log("Please delete manually: " + userDataDir); }
        console.log(err);
        process.exit(1);
      }
    }
    fs.mkdirSync(userDataDir);
    // runBashCommand('sudo rm -rf tmpUserDataDir/');
    // runBashCommand('sudo mkdir tmpUserDataDir');

    if (typeof clientProfile.networkProfile_sharedNetwork !== 'undefined' && clientProfile.networkProfile_sharedNetwork.length > 0) {
      runNetworkPatternOnServer(clientProfile.networkProfile_sharedNetwork);
    }

    run()
      .then((results) => {
        clearNetworkConfig();
        
        if (results) {
          if (!fs.existsSync('./results')){
            fs.mkdirSync('./results');
          }

          let timestamp = Math.floor(Date.now() / 1000);
          let folder = './results/' + timestamp + '_multiple_clients';
          if (process.env.npm_package_config_batchTest_resultFolder)
            folder = './results/' + process.env.npm_package_config_batchTest_resultFolder + '/' + timestamp + '_multiple_clients';
          if (!fs.existsSync(folder)){
            fs.mkdirSync(folder);
          }

          console.log(">> Number of result obj: " + results.length);

          // one result folder for each client
          for (var i = 0; i < results.length; i++) {
            clientFolder = folder + '/client_' + (i+1);
            if (!fs.existsSync(clientFolder)){
              fs.mkdirSync(clientFolder);
            }
            var result = results[i];
            if (!result) continue;  // for null result

            let filenameByDownload = clientFolder + '/metrics-by-download.json';
            let filenameOverall = clientFolder + '/metrics-overall.json';
            let filenameEvaluate = clientFolder + '/evaluate.json';
            let filenameQoePerSegment = clientFolder + '/qoe-by-segment.json';
            let filenameThroughput = clientFolder + '/throughput-measurements.json';
          
            fs.writeFileSync(filenameByDownload, JSON.stringify(result.byDownload));
            fs.writeFileSync(filenameOverall, JSON.stringify(result.overall));

            /////////////////////////////////////
            // evaluate.js
            /////////////////////////////////////
            /* testTime, networkPattern, abrStrategy, comments, etc.
            * + resultsQoe obj
            *  - averageBitrate
            *  - averageBitrateVariations / numSwitches (added both)
            *  - totalRebufferTime
            *  - startupDelay (not used for now as startup is invalid with stabilization feature in the testing)
            *  - averageLatency (not in standard QoE model but avail here first)
            */
            let evaluate = {};
            evaluate.testTime = new Date();
            evaluate.networkProfile = result.networkProfile;
            evaluate.networkPattern = result.networkPattern;
            evaluate.abrStrategy = result.abrStrategy;
            evaluate.customPlaybackControl = result.customPlaybackControl;

            ///////////////////////////////////////////////////////////////////////////////////
            // QoE model
            // References - See QoeEvaluator.js 
            //            - https://xia.cs.cmu.edu/resources/Documents/Yin_sigcomm15.pdf
            ///////////////////////////////////////////////////////////////////////////////////
            let qoeEvaluator = new QoeEvaluator();
            let segmentDurationSec = result.misc.segmentDurationSec;
            let maxBitrateKbps = result.misc.maxBitrateKbps;
            let minBitrateKbps = result.misc.minBitrateKbps;
            qoeEvaluator.setupPerSegmentQoe(segmentDurationSec, maxBitrateKbps, minBitrateKbps);

            // let qoeBySegmentCsv = [];
            // qoeBySegmentCsv.push('segment, qoe_overall, qoe_bitrate, qoe_rebuf, qoe_latency, qoe_bitrateSwitch, qoe_playbackSpeed');
            let qoePerSegment = {};

            let throughputMeasurements = { trueValues: [], measuredValues: [] };
            let numSegments = 0;
            for (var key in result.byDownload) {
              if (result.byDownload.hasOwnProperty(key)) {
                let segmentBitrateKbps = result.byDownload[key].segmentBitrateKbps;
                let segmentRebufferTimeSec = result.byDownload[key].segmentStallDurationMs / 1000.0;
                let latencySec = result.byDownload[key].currentLatency;
                let playbackSpeed = result.byDownload[key].playbackSpeed;
                qoeEvaluator.logSegmentMetrics(segmentBitrateKbps, segmentRebufferTimeSec, latencySec, playbackSpeed);

                // Log qoe result at each segment
                let qoeInfo = qoeEvaluator.getPerSegmentQoe();
                // let tmpArray = [key, qoeInfo.totalQoe, qoeInfo.bitrateWSum, qoeInfo.rebufferWSum, qoeInfo.latencyWSum, qoeInfo.bitrateSwitchWSum, qoeInfo.playbackSpeedWSum];
                // qoeBySegmentCsv.push(tmpArray.toString());
                qoePerSegment[key] = {
                  qoeTotal: qoeInfo.totalQoe,
                  qoeBitrate: qoeInfo.bitrateWSum,
                  qoeRebuffer: qoeInfo.rebufferWSum,
                  qoeLatency: qoeInfo.latencyWSum,
                  qoeBitrateSwitch: qoeInfo.bitrateSwitchWSum,
                  qoePlaybackSpeed: qoeInfo.playbackSpeedWSum
                }

                throughputMeasurements.measuredValues.push({ 
                  throughputKbps: result.byDownload[key].throughputKbps, 
                  timestampMs: result.byDownload[key].throughputTimestampMs 
                });

                numSegments++;
              }
            }

            evaluate.resultsQoe = qoeEvaluator.getPerSegmentQoe(); // returns QoeInfo object
            evaluate.numSegments = numSegments;

            // // finally, allow to optionally input comments
            // if (!batchTestEnabled) {
            //   // // user input
            //   // readline.question('Any comments for this test run: ', data => {
            //     evaluate.comments = input_comments;
            //   //   readline.close();
                
            //     fs.writeFileSync(filenameEvaluate, JSON.stringify(evaluate));
            //     fs.writeFileSync(filenameQoePerSegment, JSON.stringify(qoePerSegment));
            //     fs.writeFileSync(filenameThroughput, JSON.stringify(throughputMeasurements));
      
            //     // // Generate csv file
            //     // let csv = '';
            //     // for (var i = 0; i < qoeBySegmentCsv.length; i++) {
            //     //   csv += qoeBySegmentCsv[i];
            //     //   csv += '\n';
            //     // }
            //     // fs.writeFileSync(filenameQoePerSegment, csv);
      
            //     console.log('[client_' + (i+1) + '] Results files generated:');
            //     console.log('> ' + filenameByDownload);
            //     console.log('> ' + filenameOverall);
            //     console.log('> ' + filenameEvaluate);
            //     console.log('> ' + filenameQoePerSegment);
            //     console.log('> ' + filenameThroughput);
            //     // console.log("Test finished. Press cmd+c to exit.");
            //   // });
            // }
            // else {
            //   // batch script input
            //   if (process.env.npm_package_config_batchTest_comments)
            //     evaluate.comments = process.env.npm_package_config_batchTest_comments;
            //   else
            //     evaluate.comments = "Batch test, no additional comments."

            //   fs.writeFileSync(filenameEvaluate, JSON.stringify(evaluate));
            //   fs.writeFileSync(filenameQoePerSegment, JSON.stringify(qoePerSegment));
            //   fs.writeFileSync(filenameThroughput, JSON.stringify(throughputMeasurements));
      
            //   console.log('[client_' + (i+1) + '] Results files generated:');
            //   console.log('> ' + filenameByDownload);
            //   console.log('> ' + filenameOverall);
            //   console.log('> ' + filenameEvaluate);
            //   console.log('> ' + filenameQoePerSegment);
            //   console.log('> ' + filenameThroughput);
            //   console.log('')

            //   // process.exit(0);
            // }

            evaluate.comments = input_comments;

            fs.writeFileSync(filenameEvaluate, JSON.stringify(evaluate));
            fs.writeFileSync(filenameQoePerSegment, JSON.stringify(qoePerSegment));
            fs.writeFileSync(filenameThroughput, JSON.stringify(throughputMeasurements));
      
            console.log('[client_' + (i+1) + '] Results files generated:');
            console.log('> ' + filenameByDownload);
            console.log('> ' + filenameOverall);
            console.log('> ' + filenameEvaluate);
            console.log('> ' + filenameQoePerSegment);
            console.log('> ' + filenameThroughput);

          } // END for(each-client-result)

          console.log("# Comments for run: " + input_comments);
          console.log("Test finished.");
          process.exit(0);
        }
        else {
          console.log('Unable to generate test results, likely some error occurred.. Please check program output above.')
          console.log("Exiting with code 1...");
          process.exit(1);
        }
      })
      .catch(error => {
        console.log(error);
        process.exit(1);
      });

    async function run() {

      let arrayOfPromises = [];

      console.log("\nScheduling clients..");
      clientProfile.clients.forEach( client => {
        console.log(client);
        // console.log("- duration: " + client.joinDurationInMs + ", numClient: " + client.numClient);
        let videoUrl = encodeURIComponent(client.videoUrl);
        for (var c = 0; c < client.numClient; c++) {
          let escapedNetworkProfile = client.networkProfile.replace(/(\s)/g, '\\$1')
          arrayOfPromises.push(runBrowserTestPromise(escapedNetworkProfile, videoUrl, client.minBuffer, client.maxBuffer, client.joinDurationInMs, client.leaveDurationInMs, client.abrStrategyInput, client.device));
        }
      });
      
      var results = await Promise.all(arrayOfPromises);

      return results;
    }

    async function runBrowserTestPromise(network_profile, videoUrl, minBuffer, maxBuffer, joinDurationInMs, leaveDurationInMs, abrStrategyInput, device) {
      let localClientId = ++clientId;
      let clientName = "c" + localClientId;
      let clientUserDataDir = 'tmpUserDataDir/' + clientName;
      if (!leaveDurationInMs) {
        leaveDurationInMs = -1
      }
      fs.mkdirSync(clientUserDataDir);

      return new Promise(async (resolve) => {
        const containerName = "dash-test-" + clientName
        
        // start dash.js inside docker - select command based on dash.js version
        // var child = await runBashCommand("docker run -d --rm -v `pwd`/..:/app -w /app/dash.js-4.4.0 --name " + containerName +
        // " --cap-add=NET_ADMIN --add-host=host.docker.internal:host-gateway dash-test npm run start")
        var child = await runBashCommand("docker run -d --rm -v `pwd`/..:/app -w /app/dash.js-4.2.1 --name " + containerName +
        " --cap-add=NET_ADMIN --add-host=host.docker.internal:host-gateway dash-test npm run start")
        // var child = await runBashCommand("docker run -d --rm -v `pwd`/..:/app -w /app/dash.js --name " + containerName +
        //               " --cap-add=NET_ADMIN --add-host=host.docker.internal:host-gateway dash-test grunt dev")
        await new Promise( (resolve) => {
          child.on('close', resolve)
        })

        // wait till port 3000 is alive
        child = await runBashCommand("docker exec -t " + containerName + 
                            " bash -c \"while ! nc -z localhost 3000 </dev/null; do sleep 10; done\"")
        await new Promise( (resolve) => {
          child.on('exit', resolve)
        })

        // start test
        child = await runBashCommand("docker exec -w /app/dash-test -t " + containerName + 
                      " node run-client.js "+ localClientId + " " + videoUrl +
                      " " + minBuffer + " " + maxBuffer + " " + joinDurationInMs +
                      " " + leaveDurationInMs + " " + clientUserDataDir + " " + network_profile + " " + abrStrategyInput + " " + device);

        await new Promise( (resolve) => {
          child.on('exit', resolve)
        })

        // stop docker instance
        var child = await runBashCommand("docker stop "+ containerName)
        await new Promise( (resolve) => {
          child.on('close', resolve)
        })
        
        let clientResultFile = clientUserDataDir + "/clientResult.json"
        let clientResult 
        try {
          clientResult = JSON.parse(fs.readFileSync(clientResultFile))
        } catch (error) {
          console.log("Couldn't read result file for " + clientResultFile)
        }
        resolve(clientResult)
      })
    }

    async function awaitStabilization (page) {
      return await page.evaluate(() => {
        console.log('Awaiting stabilization...')
        return new Promise(resolve => {
          const maxQuality = player.getBitrateInfoListFor("video").length - 1;
          let timer = -1;

          const failTimer = setTimeout(() => {
            resolve(false);
          }, 30000)

          if (player.getQualityFor("video") === maxQuality) {
            console.log('Starting stabilization timer...')
            timer = setTimeout(() => {
              clearTimeout(failTimer);
              resolve(true);
            }, 10000);
          }

          player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, e => {
            console.warn("Quality changed requested", e);
            if (e.newQuality !== maxQuality) {
              console.log('Clearing stabilization timer...', e.newQuality, maxQuality)
              clearTimeout(timer);
              timer = -1;
            } else if (timer === -1) {
              console.log('Starting stabilization timer...')
              timer = setTimeout(() => {
                clearTimeout(failTimer);
                resolve(true);
              }, 10000);
            }
          });
        });
      });
    }

    //
    // via Chrome shaping
    //
    // async function runNetworkPattern(client, pattern) {
    //   console.log("Beginning network emulation..");
    //   for await (const profile of pattern) {
    //     console.log(
    //       `Setting network speed to ${profile.speed}kbps for ${profile.duration} seconds`
    //     );
    //     throughputMeasurements.trueValues.push({ 
    //       throughputKbps: profile.speed, 
    //       duration: profile.duration, 
    //       startTimestampMs: Date.now() 
    //     });

    //     setNetworkSpeedInMbps(client, profile.speed);
    //     await new Promise(resolve => setTimeout(resolve, profile.duration * 1000));
    //   }
    // }

    // function setNetworkSpeedInMbps(client, mbps) {
    //   client.send("Network.emulateNetworkConditions", {
    //     offline: false,
    //     latency: 0,
    //     uploadThroughput: (mbps * 1024) / 8,
    //     downloadThroughput: (mbps * 1024) / 8
    //   });
    // }

    async function runNetworkPatternOnServer(command) {
      runBashCommand('sudo bash ' + command);
    }

    async function runBashCommand(command) {
      console.log(`Running: '$ ${command}'`);
      var child;
      try {
        child = exec(command);
        child.stdout.on('data', function(data) {
          console.log('stdout:', data);
        });
        child.stderr.on('data', function(data) {
          console.log('stderr:', data);
        });
      } catch (err) {
        console.log(`Error running command: ${command}`);
        console.error(err);

        clearNetworkConfig();
        // console.log(`Exiting with code 1..`);
        // process.exit(1);
      }
      return child;
    }

    function clearNetworkConfig() {
      console.log("Clearing network shaping config...");

      // Ubuntu
      runBashCommand('sudo bash tc-network-profiles/kill.sh');
      // runBashCommand('bash tc-network-profiles/kill.sh');   // @TODO does not work, debug why
      
      // Mac OSX
      //runBashCommand('sudo /sbin/pfctl -f /etc/pf.conf');
    }

    process.on('SIGINT', function() {
      console.log("Caught interrupt signal!");
      clearNetworkConfig();
    });

  });
}

// allow to optionally input comments
if (!batchTestEnabled) {
  // user input
  readline.question('Any comments for this test run: ', data => {
    input_comments = data;
    readline.close();

    runTest();
  });
} else {
  input_comments = process.env.npm_package_config_batchTest_comments;
  runTest();
}