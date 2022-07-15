// const cmsd_tf_single_model = require('./cmsd_tf_single_model');
const cmsd_tf = require('./cmsd_tf');
const cmsd_tf_pensieve = require('./cmsd_tf_pensieve');

const express = require('express');
const cors = require('cors');

var app = express();

function getTimestamp() {
    const dateObject = new Date();
    const date = (`0${dateObject.getDate()}`).slice(-2); // adjust 0 before single digit date
    const month = (`0${dateObject.getMonth() + 1}`).slice(-2);
    const year = dateObject.getFullYear();
    const hours = (`0${dateObject.getHours()}`).slice(-2);
    const minutes = (`0${dateObject.getMinutes()}`).slice(-2);
    const seconds = (`0${dateObject.getSeconds()}`).slice(-2);
    return(`${year}-${month}-${date} ${hours}:${minutes}:${seconds}`);
};


app.get('/*', function (req, res, next) {
    console.log('\n[' + getTimestamp() + '] Received request @ url:');
    console.log(req.url);
    next();
});

app.use(cors({origin: '*'}));
app.use(express.static('public'));

//
// Entry point for /bitrateGuidance route
//
app.get('/cmsd-express/bitrateGuidance/*', function (req, res) {
    console.log('\nRoute triggered: `/cmsd-express/bitrateGuidance/*`');
    // console.log('> url:', req.url);

    if (Object.keys(req.query).length !== 0) {
        
        // Retrieve CMCD query params
        var paramsObj = processQueryArgs(req.query);

        // console.log('> paramsObj:')
        // console.log(paramsObj)

        //
        // Bitrate Guidance logic to compute suggested bitrate value
        //
        var lastObjectSize = parseFloat(paramsObj['com.example-os']);           // Kbps
        var lastPerceptualQuality = parseInt(paramsObj['com.example-qt']);
        var bufferSize = parseFloat(paramsObj['bl']) / 1000.0;                  // ms to seconds    
        var throughput = parseFloat(paramsObj['mtp']) / 1000.0 / 8.0;           // Kbps to KBpms
        var lastDownloadTime = parseFloat(paramsObj['com.example-dt']);         // seconds
        var objectSizeList = JSON.parse(paramsObj['com.example-ls']);           // Kbps
        var perceptualQualityList = JSON.parse(paramsObj['com.example-qtl']);
        var percentRemainingObjects = parseFloat(paramsObj['com.example-rs']);  // 0-1

        var clientId = paramsObj['sid'];
        if ( clientId != null && !cmsd_tf.isClientModelLoaded(clientId) ) {
            cmsd_tf.initClientModel(clientId);
        }

        // // For debugging //
        // console.log(lastObjectSize)
        // console.log(lastPerceptualQuality)
        // console.log(bufferSize)
        // console.log(throughput)
        // console.log(lastDownloadTime)
        // console.log(objectSizeList)
        // console.log(perceptualQualityList)
        // console.log(percentRemainingObjects)

        // if (lastObjectSize != null && lastPerceptualQuality != null && bufferSize != null && !isNaN(bufferSize) && throughput != null && !isNaN(throughput) && lastDownloadTime != null && objectSizeList != null && perceptualQualityList != null && percentRemainingObjects != null) {
        if (lastObjectSize == null || lastPerceptualQuality == null || bufferSize == null || isNaN(bufferSize) || throughput == null || isNaN(throughput) || lastDownloadTime == null || objectSizeList == null || perceptualQualityList == null || percentRemainingObjects == null || clientId == null) {
            console.log('\n> Skipping inference as one or more input values are null or NaN..');
        }
        else {
            var inferenceInput = {
                'lastObjectSize': lastObjectSize,
                'lastPerceptualQuality': lastPerceptualQuality,
                'bufferSize': bufferSize,
                'throughput': throughput,
                'lastDownloadTime': lastDownloadTime,
                'objectSizeList': objectSizeList,
                'perceptualQualityList': perceptualQualityList,
                'percentRemainingObjects': percentRemainingObjects,
            }

            // //
            // // To test inference output (assert equals: brg of 10)
            // //
            // var testInferenceInput = {
            //     'lastObjectSize': 8477.492,
            //     'lastPerceptualQuality': 98,
            //     'bufferSize': 11.541,
            //     'throughput': 9.30802499999,
            //     'lastDownloadTime': 0.402,
            //     'bitrateArrayKbps': [259.938,409.07,628.07,834.998,1168.91,1932.898,2583.254,3304.37,4661.888,6330.874,8710.49,12451.842,17915.436],
            //     'perceptualQualityList': [15,27,42,49,61,76,82,88,92,97,99,99,100],
            //     'percentRemainingObjects': 0.2857143877550875
            // }
            // inferenceInput = testInferenceInput;

            console.log("\n> Performing inference with clientId and input:")
            console.log("clientId: " + clientId);
            console.log(inferenceInput);

            // var suggestedBitrate = cmsd_tf_single_model.performInference(inferenceInput);
            var suggestedBitrate = cmsd_tf.performInference(clientId, inferenceInput);
            console.log('> Done performInference:', suggestedBitrate);

            // Send data to client via CMSD
            res.set('CMSD-Dynamic', 'com.example-brg=' + suggestedBitrate)
            res.set('Access-Control-Expose-Headers', 'CMSD-Dynamic')
        }
    }


    // Return requested resource (mpd/video segment)
    // + CMSD header for bitrate value
    if (req.url.includes('?')) {
        var requestedResourcePath = req.url.substring(req.url.indexOf('/cmsd-express/bitrateGuidance') + 30, req.url.indexOf('?'));
    } else {
        var requestedResourcePath = req.url.substring(req.url.indexOf('/cmsd-express/bitrateGuidance') + 30);
    }
    console.log('> requestedResourcePath: ' + requestedResourcePath)
    res.sendFile(requestedResourcePath, { root: __dirname + '/public/' });

});



//
// Entry point for /pensieve route
//
app.get('/cmsd-express/pensieve/*', function (req, res) {
    console.log('\nRoute triggered: `/cmsd-express/pensieve/*`');
    // console.log('> url:', req.url);

    if (Object.keys(req.query).length !== 0) {
        
        // Retrieve CMCD query params
        var paramsObj = processQueryArgs(req.query);

        var pensieveC0 = parseFloat(paramsObj['com.example-pc0']);      // last encoded bitrate in kb/s
        var pensieveC0b = parseFloat(paramsObj['com.example-pc0b']);      // last encoded bitrate in kb/s
        var pensieveC1 = parseFloat(paramsObj['bl']) / 1000.0;          // buffer size in second
        var pensieveC2 = parseFloat(paramsObj['mtp']) / 1000.0 / 8.0;   // bandwidth in kB/ms
        var pensieveC3 = parseFloat(paramsObj['com.example-pc3']);      // download time in second
        var pensieveC4 = JSON.parse(paramsObj['com.example-pc4']);      // bitrate array (kb/s)
        var pensieveC5 = parseFloat(paramsObj['com.example-pc5']);      // percent remains Segments

        var clientId = paramsObj['sid'];
        if ( clientId != null && !cmsd_tf_pensieve.isClientModelLoaded(clientId) ) {
            cmsd_tf_pensieve.initClientModel(clientId);
        }

        if (pensieveC0 == null || pensieveC1 == null || isNaN(pensieveC1) || pensieveC2 == null || isNaN(pensieveC2) || pensieveC3 == null || pensieveC4 == null || pensieveC5 == null || clientId == null) {
            console.log('\n[/cmsd-express/pensieve/] > Skipping inference as one or more input values are null or NaN..');
        }
        else {
            var inferenceInput = {
                'pensieveC0': pensieveC0,
                'pensieveC0b': pensieveC0b,
                'pensieveC1': pensieveC1,
                'pensieveC2': pensieveC2,
                'pensieveC3': pensieveC3,
                'pensieveC4': pensieveC4,
                'pensieveC5': pensieveC5
            }

            // //
            // // To test inference output (assert equals: brg of 10)
            // //
            // var testInferenceInput = {
            //     'pensieveC0': 18138234,
            //     'pensieveC0b': 18138234,
            //     'pensieveC1': 7.506,
            //     'pensieveC2': 430.081875,
            //     'pensieveC3': 0.017,
            //     'pensieveC4': [0.031405249999999996,0.0500295,0.07534874999999999,0.100848875,0.14104862499999998,0.236341,0.318394,0.406353375,0.585105,0.78881025,1.100391125,1.5686235,2.26727925],
            //     'pensieveC5': 0.42857151020407
            // }
            // inferenceInput = testInferenceInput; // should be `12`

            console.log("\n[/cmsd-express/pensieve/] > Performing inference with clientId and input:")
            console.log("clientId: " + clientId);
            console.log(inferenceInput);

            var suggestedBitrate = cmsd_tf_pensieve.performInference(clientId, inferenceInput);
            console.log('[/cmsd-express/pensieve/] > Done performInference:', suggestedBitrate);

            // Send data to client via CMSD
            res.set('CMSD-Dynamic', 'com.example-pbrg=' + suggestedBitrate)
            res.set('Access-Control-Expose-Headers', 'CMSD-Dynamic')
        }
    }


    // Return requested resource (mpd/video segment)
    // + CMSD header for bitrate value
    if (req.url.includes('?')) {
        var requestedResourcePath = req.url.substring(req.url.indexOf('/cmsd-express/pensieve') + 23, req.url.indexOf('?'));
    } else {
        var requestedResourcePath = req.url.substring(req.url.indexOf('/cmsd-express/pensieve') + 23);
    }
    console.log('[/cmsd-express/pensieve/] > requestedResourcePath: ' + requestedResourcePath)
    res.sendFile(requestedResourcePath, { root: __dirname + '/public/' });

});


//
// Process query args into Javascript object
//
function processQueryArgs(decodedQueryString) {
    console.log('> decodedQueryString:')
    console.log(decodedQueryString)

    // For dash.js-cmcd version differences
    var cmcdKey;
    if ('Common-Media-Client-Data' in decodedQueryString)
        cmcdKey = 'Common-Media-Client-Data';
    else cmcdKey = 'CMCD';

    var paramsArr = decodedQueryString[cmcdKey].split(',');
    var paramsObj = {};
    for (var i = 0; i < paramsArr.length; i++) {
        if (paramsArr[i].includes('=')) {
            var key = paramsArr[i].split('=')[0];
            var value = paramsArr[i].split('=')[1];

            // Process array-type values
            if (key == 'com.example-ls' || key == 'com.example-qtl' || key == 'com.example-pc4') {
                value = value.replaceAll("_", ",");
                value = JSON.parse(value);
            }
        } 
        else {  // e.g. `bs` key does not have a value in CMCD query arg format
            var key = paramsArr[i];
            var value = 'true';
        }
        paramsObj[key] = value;
    }
    
    return paramsObj;
}


//
// To start Express server
//
var server = app.listen(8082, function () {
    // cmsd_tf_single_model.loadModel();
    // cmsd_tf_single_model.resetState();

    var host = server.address().address
    var port = server.address().port
    console.log("`CMSD-DASH-2-nodejs` listening at http://%s:%s", host, port)
})

