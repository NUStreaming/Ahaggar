const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');   // needed to avoid "Only HTTP(s) protocols are supported" err when loading keras model

const MODEL_PATH = 'file://model/model.json';

/* sempahores to signal completion of async operations */
let retrieveModel = false,
modelPrediction = 0;
// chunkDownloaded = 0;
// action probability
let prob;

/* hidden states */
let h1,
h2;

/* auxiliary variables needed for gru */
let one = tf.ones([1, 128])
let negativeOne = tf.zeros([1, 128]).add(-1)

/* state array */
let x0,
x1,
x2,
x3,
x4,
x5,
x6,
x7;

/* current state variable */
let c0,
c1,
c2,
c3,
c4,
c5,
c6,
c7;

let model;


// async function loadModel() {
//     try {
//         model = await tf.node.loadSavedModel(MODEL_PATH);
//         retrieveModel = true;
//     }
//     catch(e) {
//         console.log('Failed to retrieve model \n' + e);
//         retrieveModel = false;
//     }
// }

async function loadModel() {
    try {
        console.log(MODEL_PATH)
        model = await tf.loadLayersModel(MODEL_PATH);
        console.log('Retrieved model!');
        retrieveModel = true;
    }
    catch(e) {
        console.log('Failed to retrieve model \n' + e);
        retrieveModel = false;
    }
}



function resetState() {
    h1 = tf.zeros([1, 128]).add(0);
    h2 = tf.zeros([1, 128]).add(0);
}



function performInference(inferenceInput) {
    if (!retrieveModel) {
        console.log("Model not loaded, skipping prediction..")
        return 0;
    }
    else {
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
        modelPrediction = updateBitratePrediction(state);

        return modelPrediction;
    }
}


function updateBitratePrediction(state) {
    if (!retrieveModel) {
        console.log("Model not loaded, skipping prediction..")
        return 0;
    }
    else {
        try {
            [prob, h1, h2] = model.predict([state, h1, h2, one, negativeOne]);
            prob = prob.dataSync();
            // console.log(JSON.stringify(prob));
            bitrateLevel = indexOfMax(prob);
            return bitrateLevel;
        }
        catch(e) {
            console.log('prediction failed \n' + e);
            return 0;
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


module.exports = { loadModel, resetState, performInference };