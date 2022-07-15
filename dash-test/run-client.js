const fs = require("fs");
const puppeteer = require("puppeteer-core");
const stats = require("./stats");

const CHROME_PATH = "/opt/google/chrome/chrome";
//const CHROME_PATH ="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// To run bash commands
const exec = require('child_process').exec

const args = process.argv.slice(2);
console.log('Args: ', args);
const clientId = args[0]
const videoUrl = args[1]
const minBuffer = args[2]
const maxBuffer = args[3]
const joinDurationInMs = args[4]
const leaveDurationInMs = args[5]
const clientUserDataDir = args[6]
const networkProfile = args[7]
const abrStrategyInput = args[8]
const device = args[9]

console.log('clientId=' + clientId +
            'videoUrl=' + videoUrl +
            ' minBuffer=' + minBuffer +
            ' maxBuffer=' + maxBuffer +
            ' joinDurationInMs=' + joinDurationInMs +
            ' leaveDurationInMs=' + leaveDurationInMs +
            ' clientUserDataDir=' + clientUserDataDir +
            ' networkProfile=' + networkProfile +
            ' abrStrategyInput=' + abrStrategyInput +
            ' device=' + device)

runBrowserTestPromise(clientId, videoUrl, minBuffer, maxBuffer, joinDurationInMs, leaveDurationInMs, clientUserDataDir, networkProfile, abrStrategyInput, device)
.then( clientResult=> {
  let resultFileName=clientUserDataDir + "/clientResult.json"
  fs.writeFileSync(resultFileName, JSON.stringify(clientResult));
  fs.chmodSync(resultFileName, fs.constants.S_IRUSR | fs.constants.S_IWUSR | fs.constants.S_IROTH)
  clearNetworkConfig()
  process.exit(0)
})

async function runBrowserTestPromise(clientId, videoUrl, minBuffer, maxBuffer, joinDurationInMs, leaveDurationInMs, clientUserDataDir, networkProfile, abrStrategyInput, device) {
  let playBackEnded=false;
  let clientName = "c" + clientId;

  var proxy = await runBashCommand('node proxy.js 8085')
  // wait till port 8080 is alive
  var child = await runBashCommand("bash -c \"while ! nc -z localhost 8085 </dev/null; do sleep 10; done\"")
  await new Promise( (resolve) => {
    child.on('exit', resolve)
  })

  await new Promise(resolve => setTimeout(resolve, joinDurationInMs))
    .then(function(){
      console.log("\nNew client is joining... (" + clientName + ")");
    });

  return new Promise(async (resolve) => {
    // the function is executed automatically when the promise is constructed
    const browser = await puppeteer.launch({
      dumpio: true,
      headless: true,
      executablePath: CHROME_PATH,
      defaultViewport: null,
      devtools: true,
      userDataDir: clientUserDataDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox']  // only if you absolutely trust the content you open in Chrome
    });

    // const page = await browser.newPage();
    // Create a new incognito browser context.
    const context = await browser.createIncognitoBrowserContext();
    // Create a new page in a pristine context.
    const page = await context.newPage();
    //test mode setuser agent to puppeteer
    page.setUserAgent("puppeteer");
    await page.setCacheEnabled(false);
    // disable timeout
    await page.setDefaultNavigationTimeout(0);
    
    // see browser console log
    
    page.on('console', message =>
      console.log(`Client:${clientId} ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`)
    );
    
    
    let url="http://localhost:3000/samples/cmsd-dash/index.html";
    // add paremeters
    url=url+"?videoUrl="+videoUrl+"&minBuffer="+minBuffer+"&maxBuffer="+maxBuffer+"&abrStrategyInput="+abrStrategyInput+"&device="+device;
    console.log("going to url with puppeteer: "+url);

    await page.goto(url);
    const cdpClient = await page.target().createCDPSession();

    console.log("Waiting for player to setup.");
    await page.evaluate(() => {
      return new Promise(resolve => {
        const hasLoaded = player.getBitrateInfoListFor("video").length !== 0;
        if (hasLoaded) {
          console.log('Stream loaded, setup complete.');
          resolve();
        } else {
          console.log('Waiting for stream to load.');
          player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, (e) => {
            console.log('Load complete.')
            resolve();
        });
        }
      });
    });

    //
    // Stabilization feature
    // (removed for cmcd/cmsd projects due to having clients joining at diff times)
    //
    // console.log("Waiting for 10 seconds of uninterrupted max-quality playback before starting.");
    // const stabilized = await awaitStabilization(page);
    // if (!stabilized) {
    //   console.error(
    //     "Timed out after 30 seconds. The player must be stable at the max rendition before emulation begins. Make sure you're on a stable connection of at least 3mbps, and try again."
    //   );
    //   // return;

    //   resolve(null);  // return null result to promise
    //   return;
    // }
    // console.log("Player is stable at the max quality, beginning network emulation");
    // end stabilization

    page.evaluate(() => {
      window.startRecording();
    });

    if (leaveDurationInMs && leaveDurationInMs>joinDurationInMs){
      // schedule close browser
      new Promise(resolve => setTimeout(resolve, leaveDurationInMs))
      .then(function(){
        console.log("Client is leaving!");
        playBackEnded=true;
      });
    }

    if (networkProfile && networkProfile.length > 0 && networkProfile !== "null"){
      runNetworkPattern(networkProfile);
    }

    // clearNetworkConfig();

    await page.exposeFunction('onPlaybackEnded', () => {
      console.log(`Client:${clientId} Playback ended!`);
      playBackEnded=true;
    });
    await page.evaluate(() => {
      player.on('playbackEnded', window.onPlaybackEnded);
    });
    await page.evaluate(() => {
      player.on('gapCausedSeekToPeriodEnd', window.onPlaybackEnded);
    });

    // wait till the playback ends or testIsFinished
    while(!playBackEnded){
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const metrics = await page.evaluate(() => {
      if (window.stopRecording) {
        // Guard against closing the browser window early
        window.stopRecording();
      }
      player.pause();
      return window.abrHistory;
    });
    console.log("Run complete");
    if (!metrics) {
      console.log("No metrics were returned. Stats will not be logged.");
    }
    proxy.kill('SIGINT');

    ////////////////////////////////////
    // original results returned
    ////////////////////////////////////
    // console.log(metrics);

    // for (let i = 0; i < metrics.switchHistory.length; i++) {
    //   console.log('switchHistory: bitrate = ' + metrics.switchHistory[i].quality.bitrate + ', qualityIndex = ' + metrics.switchHistory[i].quality.qualityIndex);
    // }

    // ({ switchHistory, ...result } = metrics);
    // result.averageBitrate = stats.computeAverageBitrate(switchHistory);
    // result.numSwitches = switchHistory.length;

    // console.log(result);

    ////////////////////////////////////
    // may.lim: custom results returned
    ////////////////////////////////////
    // console.log(metrics);
    console.log('Processing client metrics to results files..');

    // metrics-by-download.json
    let resultByDownload = {};
    let numStalls = 0;
    if (metrics.byDownload) {
      resultByDownload = metrics.byDownload;
      for (var key in resultByDownload) {
        if (resultByDownload.hasOwnProperty(key)) { 
            resultByDownload[key].averageBitrate = stats.computeAverageBitrate(resultByDownload[key].switchHistory, resultByDownload[key].downloadTimeRelative);
            resultByDownload[key].numSwitches = resultByDownload[key].switchHistory.length;
            if (resultByDownload[key].numStalls > numStalls)  numStalls = resultByDownload[key].numStalls;
        }
      }
    }

    // metrics-overall.json
    let resultOverall = {};
    if (metrics.overall) {
      resultOverall = metrics.overall;
      resultOverall.averageBitrate = stats.computeAverageBitrate(resultOverall.switchHistory);
      resultOverall.numSwitches = resultOverall.switchHistory.length;
      resultOverall.numStalls = numStalls;
      // calculate averageBitrateVariations
      if (resultOverall.switchHistory.length > 1) {
        let totalBitrateVariations = 0;
        for (var i = 0; i < resultOverall.switchHistory.length - 1; i++) {
          totalBitrateVariations += Math.abs(resultOverall.switchHistory[i+1].quality.bitrate - resultOverall.switchHistory[i].quality.bitrate);
        }
        resultOverall.averageBitrateVariations = totalBitrateVariations / (resultOverall.switchHistory.length - 1);
      } else {
        resultOverall.averageBitrateVariations = 0; 
      }
      // calculate average playback rates
      let pbr = stats.computeAveragePlaybackRate(resultByDownload);
      resultOverall.averagePlaybackRate = pbr.averagePlaybackRate;
      resultOverall.averagePlaybackRateNonOne = pbr.averagePlaybackRateNonOne;

      // calculate ahaggar metrics
      resultOverall.averageSegmentBitrateBytes = stats.computeAverage(resultByDownload, "segmentBitrateBytes");
      resultOverall.averageSegmentBitrateKbps = resultOverall.averageSegmentBitrateBytes * 8 / 1000.0 / 4.0; // segment size: 4s
      resultOverall.averageVmaf = stats.computeAverage(resultByDownload, "vmaf");
      for (var key in resultByDownload) {
        if (resultByDownload.hasOwnProperty(key)) { 
          resultOverall.device = resultByDownload[key].device;
          break;
        }
      }
      resultOverall.abrStrategy = metrics.abrStrategy;

      // delete unwanted data
      delete resultOverall.currentLatency;
      delete resultOverall.currentBufferLength;
    }

    let result = {
      byDownload: resultByDownload,
      overall: resultOverall,
      networkProfile: networkProfile,
      networkPattern: networkProfile,
      abrStrategy: metrics.abrStrategy,
      customPlaybackControl: metrics.customPlaybackControl,
      misc: metrics.misc
    };
    // close the browser
    // page.close();
    // browser.close();

    resolve(result);
  });
}

async function runNetworkPattern(command) {
  runBashCommand('bash ' + command);
}

async function runBashCommand(command) {
  console.log(`Running: '$ ${command}'`);
  var child;
  try {
    child = exec(command);
    child.stdout.on('data', function(data) {
      console.log(`Client:${clientId}`, 'stdout:', data);
    });
    child.stderr.on('data', function(data) {
      console.log(`Client:${clientId}`, 'stderr:', data);
    });
  } catch (err) {
    console.log(`Client:${clientId}`, `Error running command: ${command}`);
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
  // runBashCommand('sudo bash tc-network-profiles/kill.sh');
  runBashCommand('bash tc-network-profiles/kill.sh');   // @TODO does not work, debug why
  
  // Mac OSX
  //runBashCommand('sudo /sbin/pfctl -f /etc/pf.conf');
}

process.on('SIGINT', function() {
  console.log("Caught interrupt signal!");
  clearNetworkConfig();
});
