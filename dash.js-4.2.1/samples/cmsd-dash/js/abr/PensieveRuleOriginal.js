/** 
 * Developed by Abdelhak Bentaleb, National University of Singapore, bentaleb@comp.nus.edu.sg
 *
 *
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

 var PensieveRule;

 // Rule that selects the lowest possible bitrate
 function PensieveRuleClass() {
     let factory = dashjs.FactoryMaker;
     let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
     let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
     let DashAdapter = factory.getSingletonFactoryByName('DashAdapter');
     let Debug = factory.getSingletonFactoryByName('Debug');
     let context = this.context;
     let instance;
     let model,
         logger;
 
     /* sempahores to signal completion of async operations */
     let retrieveModel = false,
         modelPrediction = 0,
         chunkDownloaded = 0;
 
     /* input array */
     let x0,
         x1,
         x2,
         x3,
         x4,
         x5;
 
     /* state variable */
     let s2,
         s3;
 
     /* instantaneous variable */
     let c0,
         c1,
         c2,
         c3,
         c4,
         c5;
 
     function setup() {
         logger = Debug(context).getInstance().getLogger(instance);
         /* synchronous loading hack */
         loadModel();
         resetState();
         console.log("[PensieveRule] setup()..");
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
 
     async function loadModel(){
         try {
             // loading rdos model from indexedDB (local browser)
             // console.log('loading model from indexeddb://pensieve\n');
             model = await tf.loadModel('indexeddb://pensieve');
             // console.log('model loaded\n');
             retrieveModel = true;
         }
         catch(e) {
             console.log('failed to retrieve model \n' + e);
             retrieveModel = false;
         }
     }
 
     function updateBitratePrediction(state) {
         if (!retrieveModel) {
             console.log("Still loading...");
         }
         try {
             let prob = model.predict(state).dataSync();
             bitrateLevel = indexOfMax(prob);
             console.log(`model predict: ${JSON.stringify(prob)}, bitrate: ${bitrateLevel}`);
             return bitrateLevel;
         }
         catch(e) {
             console.log('prediction failed \n' + e);
             return 0;
         }
     }
 
     function getMaxIndex(rulesContext) {
         console.log("[PensieveRule] getMaxIndex()..")
         const switchRequest = SwitchRequest(context).create();
         const dashMetrics = DashMetrics(context).getInstance();
         const dashAdapter = DashAdapter(context).getInstance();
 
         const mediaInfo = rulesContext.getMediaInfo();
         const mediaType = rulesContext.getMediaType();
         const abrController = rulesContext.getAbrController();
         const bitrates = mediaInfo.bitrateList.map(b => b.bandwidth);
         const streamInfo = rulesContext.getStreamInfo();
         const isDynamic = streamInfo && streamInfo.manifestInfo ? streamInfo.manifestInfo.isDynamic : null;
         const throughputHistory = abrController.getThroughputHistory();
         const throughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);
         const adaptation = dashAdapter.getRealAdaptation(streamInfo, mediaInfo);
         const numChunks = adaptation.Representation[0].SegmentList.SegmentURL.length;
 
         let requests = dashMetrics.getHttpRequests(mediaType),
             lastRequest = null,
             i;
 
         if (requests === undefined || requests.length == 0 || isNaN(throughput)) {
             logger.debug("[CustomRules][" + mediaType + "][PensieveRule] No metrics, bailing.");
             return SwitchRequest(context).create();
         }
 
         // Get last valid request
         i = requests.length - 1;
         while (i >= 0 && lastRequest === null) {
             currentRequest = requests[i];
             if (currentRequest._tfinish && currentRequest.trequest && currentRequest.tresponse && currentRequest.trace && currentRequest.trace.length > 0) {
                 lastRequest = requests[i];
             }
             i--;
         }
         //console.log('Pensive is here');
 
         if (lastRequest === null) {
             logger.debug("[CustomRules][" + mediaType + "][PensieveRule] No valid requests made for this stream yet, bailing.");
             return SwitchRequest(context).create();
         }
 
         // Last request is not a media segment, either downloaded or loaded from cache
         if (lastRequest.type !== 'MediaSegment' || chunkDownloaded === requests.filter(x => x.type === 'MediaSegment' && x._stream === mediaType).length) {
             logger.debug("[CustomRules][" + mediaType + "][PensieveRule] Last request is not a media segment, bailing.");
             return SwitchRequest(context).create();
         }
 
         // -------------------------------collect inputs start--------------------------------
         // c0: last encoded bitrate in kb/s
         c0 = bitrates[modelPrediction];
         // c1: buffer size in second
         c1 = dashMetrics.getCurrentBufferLevel(mediaType, true);
         // c2: experienced bandwidth in kB/ms
         c2 = throughput / 1000.0 / 8.0;   // kb/s -> MB/s
         // c3: download time in second
         c3 = requests[requests.length - 1].interval / 1000.0;
         // c4: bitrate array (MB) of the next chunk    bytes -> MB    look ahead
         c4 = bitrates.map(x => x / 1000 / 1000 / 8);
         // c5: percentage of video chunk remains
         chunkDownloaded = requests.filter(x => x.type === 'MediaSegment' && x._stream === mediaType).length;
         c5 = 1.0 - (chunkDownloaded / (numChunks + 1e-6));
         console.log('last encoded bitrate in kb/s ' + c0);
            console.log('buffer size in second ' + c1);
         console.log('bandwidth in kB/ms ' + c2);
         console.log('download time in second ' + c3);
         console.log('bitrate array (kb/s) ' + JSON.stringify(c4));
         console.log('percent remains Segments ' + c5);
         // -------------------------------construct state starts--------------------------------
         // x0: [1, 1] matrix, last chunk size in kB, normalized by 16800
         x0 = tf.tensor(c0, [1, 1]).div(bitrates[12]);
         // x1: [1, 1] matrix, buffer size in second, normalized by 10
         x1 = tf.tensor(c1, [1, 1]).div(10);
         // x2: [1, 8, 1] matrix, experienced bandwidth in kB/ms
         s2 = updateArray(s2, c2);
         x2 = tf.tensor(s2, [1, 8, 1]).pad([[0, 0], [2, 2], [0, 0]]);
         // x3: [1, 8, 1] matrix, download time in second, normalized by 10
         s3 = updateArray(s3, c3);
         x3 = tf.tensor(s3, [1, 8, 1]).div(10).pad([[0, 0], [2, 2], [0, 0]]);
         // x4: [1, 13, 1] matrix, next video chunk size in MB
         x4 = tf.tensor(c4, [1, 13, 1]).pad([[0, 0], [2, 2], [0, 0]]);
         // x5: [1, 1] matrix, percentage of video chunk remains
         x5 = tf.tensor(c5, [1, 1]);
         const state = [x0, x1, x2, x3, x4, x5];
         // -------------------------------construct state ends----------------------------------
         modelPrediction = updateBitratePrediction(state);
         switchRequest.quality = modelPrediction;
         switchRequest.reason = 'Pensieve';
         switchRequest.priority = SwitchRequest.PRIORITY.STRONG;
         //console.log("Pen Here");
         return switchRequest;
     }
 
     function resetState() {
         s2 = Array.apply(null, new Array(8)).map(Number.prototype.valueOf, 0);
         s3 = Array.apply(null, new Array(8)).map(Number.prototype.valueOf, 0);
     }
 
     instance = {
         getMaxIndex: getMaxIndex
     };
 
     setup();
 
     return instance;
 }
 
 PensieveRuleClass.__dashjs_factory_name = 'PensieveRule';
 PensieveRule = dashjs.FactoryMaker.getClassFactory(PensieveRuleClass);
 