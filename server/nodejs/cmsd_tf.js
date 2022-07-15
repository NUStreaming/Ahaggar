// const e = require('express');
// const tf = require('@tensorflow/tfjs');
const tf = require('@tensorflow/tfjs-node');   // needed to avoid "Only HTTP(s) protocols are supported" err when loading keras model

const MODEL_PATH = 'file://model/model.json';


/* Hidden states */  // moved into `clientModels[clientId]`
// let h1,
// h2;

/* Auxiliary variables needed for gru */
let one = tf.ones([1, 128])
let negativeOne = tf.zeros([1, 128]).add(-1)


/* Sempahores to signal completion of async operations */  // moved into `clientModels[clientId]`
// let retrieveModel = false,
// modelPrediction = 0;
// let model;

/* Schema: 
    clientModels = {  
        <clientId> : { 
            h1 : <hidden_state>, 
            h2 : <hidden_state>, 
            retrieveModel : <bool>, 
            modelPrediction : <int>, 
            model : <tf_model> 
        }, 
        .. 
    } 
*/
var clientModels = {};


function initClientModel(clientId) {
    console.log("\n> Init model for new client: " + clientId);
    clientModels[clientId] = {
        h1: null,
        h2: null,
        retrieveModel: false,
        modelPrediction: 0,
        model: null
    }
    loadModel(clientId);
    resetState(clientId);
}

async function loadModel(clientId) {
    try {
        console.log('Loading tf model: ' + MODEL_PATH + ' @ timestamp: ' + Date.now());
        // model = await tf.loadLayersModel(MODEL_PATH);
        // retrieveModel = true;
        clientModels[clientId].model = await tf.loadLayersModel(MODEL_PATH);
        clientModels[clientId].retrieveModel = true;
        console.log('Retrieved model @ timestamp: ' + Date.now());
    }
    catch(e) {
        console.log('[WARNING] Failed to retrieve model \n' + e);
        // retrieveModel = false;
        clientModels[clientId].retrieveModel = false;
    }
}

function isClientModelLoaded(clientId) {
    if ( clientId in clientModels && clientModels[clientId].retrieveModel ) {
        return true;
    } else {
        return false;
    }
}

function resetState(clientId) {
    if (clientId in clientModels) {
        clientModels[clientId].h1 = tf.zeros([1, 128]).add(0);
        clientModels[clientId].h2 = tf.zeros([1, 128]).add(0);
    }
}


function performInference(clientId, inferenceInput) {
    console.log('Size of clientModels: ' + Object.keys(clientModels).length);

    if ( !(clientId in clientModels) ) {
        initClientModel(clientId);
    }
    if ( !clientModels[clientId].retrieveModel ) {
        console.log("Model not loaded, skipping prediction..")
        // return 0;
        return null;    // let client decide which quality to use on non-prediction
    }
    else {
        /* State array */
        let x0,
        x1,
        x2,
        x3,
        x4,
        x5,
        x6,
        x7;

        /* Current state variable */
        let c0,
        c1,
        c2,
        c3,
        c4,
        c5,
        c6,
        c7;

        c0 = inferenceInput['lastObjectSize']
        c1 = inferenceInput['lastPerceptualQuality']
        c2 = inferenceInput['bufferSize']
        c3 = inferenceInput['throughput']
        c4 = inferenceInput['lastDownloadTime']
        c5 = inferenceInput['objectSizeList']
        c6 = inferenceInput['perceptualQualityList']
        c7 = inferenceInput['percentRemainingObjects']

        // -------------------------------construct state starts--------------------------------
        // x0: [1, 1] matrix, last chunk size in kb/s, normalized by 1680
        x0 = tf.tensor(c0, [1, 1]).div(1680);
        // x1: [1, 1] matrix, last vmaf quality, normalized by 100
        x1 = tf.tensor(c1, [1, 1]).div(100);
        // x2: [1, 1] matrix, buffer size in second, normalized by 10
        x2 = tf.tensor(c2, [1, 1]).div(10);
        // x3: [1, 1] matrix, experienced bandwidth in kB/ms
        x3 = tf.tensor(c3, [1, 1]);
        // x4: [1, 1] matrix, download time in second
        x4 = tf.tensor(c4, [1, 1]);
        // x5: [1, 13] matrix, next video chunk size in kb/s, normalized by 1680
        x5 = tf.tensor(c5, [1, 13]).div(1680);
        // x6: [1, 13] matrix, next video vmaf, normalized by 100
        x6 = tf.tensor(c6, [1, 13]).div(100);
        // x7: [1, 1] matrix, percentage of video chunk remains
        x7 = tf.tensor(c7, [1, 1]);
        const state = tf.concat([x0, x1, x2, x3, x4, x5, x6, x7], 1);
        // -------------------------------construct state x ends----------------------------------

        clientModels[clientId].modelPrediction = updateBitratePrediction(clientId, state);

        return clientModels[clientId].modelPrediction;
        // return (clientModels[clientId].modelPrediction + 1);
    }
}


function updateBitratePrediction(clientId, state) {
    if ( !clientModels[clientId].retrieveModel ) {
        console.log("Model not loaded, skipping prediction..")
        // return 0;
        return null;    // let client decide which quality to use on non-prediction
    }
    else {
        try {
            /* Action probability */
            let prob;

            [prob, clientModels[clientId].h1, clientModels[clientId].h2] = clientModels[clientId].model.predict([state, clientModels[clientId].h1, clientModels[clientId].h2, one, negativeOne]);
            prob = prob.dataSync();
            // console.log(JSON.stringify(prob));

            let suggestedBitrate = indexOfMax(prob);
            return suggestedBitrate;
        }
        catch(e) {
            console.log('Prediction failed \n' + e);
            // return 0;
            return null;    // let client decide which quality to use on non-prediction
        }
    }
}


// here we define some helper functions
// argmax function
function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;
    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }
    return maxIndex;
}


module.exports = { initClientModel, isClientModelLoaded, performInference };
