const tf = require('@tensorflow/tfjs-node');

const MODEL_PATH = 'file://model_pensieve/model.json';


var clientModels = {};


function initClientModel(clientId) {
    console.log("\n[cmsd_pensieve] > Init model for new client: " + clientId);
    clientModels[clientId] = {
        s2: null,
        s3: null,
        retrieveModel: false,
        modelPrediction: 0,
        model: null
    }
    loadModel(clientId);
    resetState(clientId);
}


async function loadModel(clientId) {
    try {
        console.log('[cmsd_pensieve] Loading tf model: ' + MODEL_PATH + ' @ timestamp: ' + Date.now());
        clientModels[clientId].model = await tf.loadLayersModel(MODEL_PATH);
        clientModels[clientId].retrieveModel = true;
        console.log('[cmsd_pensieve] Retrieved model @ timestamp: ' + Date.now());
    }
    catch(e) {
        console.log('[cmsd_pensieve] Failed to retrieve model \n' + e);
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
        clientModels[clientId].s2 = Array.apply(null, new Array(8)).map(Number.prototype.valueOf, 0);
        clientModels[clientId].s3 = Array.apply(null, new Array(8)).map(Number.prototype.valueOf, 0);
    }
}

function performInference(clientId, inferenceInput) {
    console.log('[cmsd_pensieve] Size of clientModels: ' + Object.keys(clientModels).length);

    if ( !(clientId in clientModels) ) {
        initClientModel(clientId);
    }
    if ( !clientModels[clientId].retrieveModel ) {
        console.log("[cmsd_pensieve] Model not loaded, skipping prediction..")
        return 0;
    }
    else {
        /* input array */
        let x0,
        x1,
        x2,
        x3,
        x4,
        x5;

        /* instantaneous variable */
        let c0, c0b,
        c1,
        c2,
        c3,
        c4,
        c5;

        c0 = inferenceInput['pensieveC0'];
        c0b = inferenceInput['pensieveC0b'];
        c1 = inferenceInput['pensieveC1'];
        c2 = inferenceInput['pensieveC2'];
        c3 = inferenceInput['pensieveC3'];
        c4 = inferenceInput['pensieveC4'];
        c5 = inferenceInput['pensieveC5'];

        // -------------------------------construct state starts--------------------------------
        // x0: [1, 1] matrix, last chunk size in kB, normalized by 16800
        x0 = tf.tensor(c0, [1, 1]).div(c0b);
        // x1: [1, 1] matrix, buffer size in second, normalized by 10
        x1 = tf.tensor(c1, [1, 1]).div(10);
        // x2: [1, 8, 1] matrix, experienced bandwidth in kB/ms
        clientModels[clientId].s2 = updateArray(clientModels[clientId].s2, c2);
        x2 = tf.tensor(clientModels[clientId].s2, [1, 8, 1]).pad([[0, 0], [2, 2], [0, 0]]);
        // x3: [1, 8, 1] matrix, download time in second, normalized by 10
        clientModels[clientId].s3 = updateArray(clientModels[clientId].s3, c3);
        x3 = tf.tensor(clientModels[clientId].s3, [1, 8, 1]).div(10).pad([[0, 0], [2, 2], [0, 0]]);
        // x4: [1, 13, 1] matrix, next video chunk size in MB
        x4 = tf.tensor(c4, [1, 13, 1]).pad([[0, 0], [2, 2], [0, 0]]);
        // x5: [1, 1] matrix, percentage of video chunk remains
        x5 = tf.tensor(c5, [1, 1]);
        const state = [x0, x1, x2, x3, x4, x5];
        // -------------------------------construct state ends----------------------------------

        clientModels[clientId].modelPrediction = updateBitratePrediction(clientId, state);

        return clientModels[clientId].modelPrediction;
    }
}


function updateBitratePrediction(clientId, state) {
    if ( !clientModels[clientId].retrieveModel ) {
        console.log("Model not loaded, skipping prediction..")
        return 0;
    }
    try {
        let prob = clientModels[clientId].model.predict(state).dataSync();
        bitrateLevel = indexOfMax(prob);
        console.log(`[cmsd_pensieve] Model predict: ${JSON.stringify(prob)}`);
        return bitrateLevel;
    }
    catch(e) {
        console.log('prediction failed \n' + e);
        return 0;
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

// np,roll and update the last entry
function updateArray(arr, value) {
    arr.push(arr.shift());
    arr[arr.length-1] = value;
    return arr;
}

module.exports = { initClientModel, isClientModelLoaded, performInference };
