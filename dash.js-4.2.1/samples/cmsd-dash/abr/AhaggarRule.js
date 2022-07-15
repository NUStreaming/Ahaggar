/**
 * Developed by Abdelhak Bentaleb, National University of Singapore, bentaleb@comp.nus.edu.sg
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

 var AhaggarRule;

 // Rule that selects the lowest possible bitrate
 function AhaggarRuleClass() {
     let factory = dashjs.FactoryMaker;
     let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
     let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
     let DashAdapter = factory.getSingletonFactoryByName('DashAdapter');
     let Settings = factory.getSingletonFactoryByName('Settings');
     let Debug = factory.getSingletonFactoryByName('Debug');
     let context = this.context;
     let instance,
         logger;
 
     /* sempahores to signal completion of async operations */
     let retrieveModel = false,
         modelPrediction = 0,
         chunkDownloaded = 0;
     // action probability
     let prob;
 
     /* hidden states */
    //  let h1,
    //      h2;
 
     /* auxiliary variables needed for gru */
    //  let one = tf.ones([1, 128])
    //  let negativeOne = tf.zeros([1, 128]).add(-1)
     
     /* state array */
    //  let x0,
    //      x1,
    //      x2,
    //      x3,
    //      x4,
    //      x5,
    //      x6,
    //      x7;
 
     /* current state variable */
     let c0,
         c1,
         c2,
         c3,
         c4,
         c5,
         c6,
         c7;
 
     function setup() {
         logger = Debug(context).getInstance().getLogger(instance);
         /* synchronous loading hack */
        //  loadModel();
        //  resetState();
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
 
    //  async function loadModel(){
    //      try {
    //          // loading Ahaggar model from indexedDB (local browser)
    //          // console.log('loading model from indexeddb://Ahaggar\n');
    //          model = await tf.loadModel('indexeddb://Ahaggar');
    //          // console.log('model loaded\n');
    //          retrieveModel = true;
    //      }
    //      catch(e) {
    //          console.log('failed to retrieve model \n' + e);
    //          retrieveModel = false;
    //      }
    //  }
 
    //  function updateBitratePrediction(state) {
    //      if (!retrieveModel) {
    //          console.log("Still loading...")
    //      }
    //      try {
    //          [prob, h1, h2] = model.predict([state, h1, h2, one, negativeOne]);
    //          prob = prob.dataSync();
    //          // console.log(JSON.stringify(prob));
    //          bitrateLevel = indexOfMax(prob);
    //          return bitrateLevel;
    //      }
    //      catch(e) {
    //          console.log('prediction failed \n' + e);
    //          return 0;
    //      }
    //  }
 
    function getMaxIndex(rulesContext) {
        console.log("[AhaggarRule] getMaxIndex().."); 
        const switchRequest = SwitchRequest(context).create();
        const dashMetrics = DashMetrics(context).getInstance();
        const dashAdapter = DashAdapter(context).getInstance();
        const settings = Settings(context).getInstance();
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const representationCount = mediaInfo.representationCount;
        const abrController = rulesContext.getAbrController();
        const streamInfo = rulesContext.getStreamInfo();
        const isDynamic = streamInfo && streamInfo.manifestInfo ? streamInfo.manifestInfo.isDynamic : null;
        const throughputHistory = abrController.getThroughputHistory();
        const throughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);
        const adaptation = dashAdapter.getRealAdaptation(streamInfo, mediaInfo);
        const numChunks = adaptation.Representation[0].SegmentList.SegmentURL.length;
        const representationInfo = rulesContext.getRepresentationInfo();
        const fragmentDuration = representationInfo.fragmentDuration;
        const bitrateList = abrController.getBitrateList(mediaInfo);

        let requests = dashMetrics.getHttpRequests(mediaType),
            lastRequest = null,
            // device = 'hdtv', // 'phone', 'hdtv', or 'uhdtv'
            device = settings.get().streaming.cmcd.ahaggar_device,
            i;
 
        if (requests === undefined || requests.length == 0 || isNaN(throughput)) {
            logger.debug("[CustomRules][" + mediaType + "][AhaggarRule] No metrics, bailing.");
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

        if (lastRequest === null) {
            logger.debug("[CustomRules][" + mediaType + "][RodsRule] No valid requests made for this stream yet, bailing.");
            return SwitchRequest(context).create();
        }
 
        // Last request is not a media segment, either downloaded or loaded from cache
        if (lastRequest.type !== 'MediaSegment' || chunkDownloaded === requests.filter(x => x.type === 'MediaSegment' && x._stream === mediaType).length) {
            logger.debug("[CustomRules][" + mediaType + "][AhaggarRule] Last request is not a media segment, bailing.");
            return SwitchRequest(context).create();
        }

        // ------------------------------- Collect inputs for Ahaggar --------------------------------
        // c0: last chunk size in kb/s (bytes to kb/s)
        chunkDownloaded = requests.filter(x => x.type === 'MediaSegment' && x._stream === mediaType).length;
	    console.log('Segments Downloaded: ' + chunkDownloaded);
        c0 = adaptation.Representation[modelPrediction].SegmentList.SegmentURL[chunkDownloaded - 1].bitrate / 1000.0 * 8.0 / fragmentDuration;
        
        // c1: perceptual quality
        c1 = adaptation.Representation[modelPrediction].SegmentList.SegmentURL[chunkDownloaded - 1][device];
        
        // Server to obtain via default CMCD params: `bl` and `mtp`
        // // c2: buffer size in second
        // c2 = dashMetrics.getCurrentBufferLevel(mediaType, true);
        // // c3: bandwidth kB/ms
        // c3 = throughput / 1000.0 / 8.0;   // kb/s -> MB/s
        
        // c4: download time in second
        c4 = requests[requests.length - 1].interval / 1000.0;
        
        // c5: bitrate array (kb/s) of the next chunk    bytes -> bits -> kb -> kb/s    look ahead
        const repIndices = Array.from(Array(representationCount).keys())
        c5 = repIndices.map(x => adaptation.Representation[x].SegmentList.SegmentURL[Math.min(chunkDownloaded, numChunks - 1)].bitrate * 8.0 / 1000.0 / fragmentDuration);
        
        // c6: perceptual array of the next chunk    look ahead
        c6 = repIndices.map(x => adaptation.Representation[x].SegmentList.SegmentURL[Math.min(chunkDownloaded, numChunks - 1)][device]);
        
        // c7: percentage of video chunk remains
        c7 = 1.0 - (chunkDownloaded / (numChunks + 1e-6));

        // console.log('last chunk size in kb/s ' + c0);
        // console.log('last perceptual quality ' + c1);
        // // console.log('buffer size in second ' + c2);
        // // console.log('bandwidth in kB/ms ' + c3);
        // console.log('download time in second ' + c4);
        // console.log('bitrate array (kb/s) ' + c5);
        // console.log('perceptual quality array ' + c6);
        // console.log('percent remains ' + c7);

        // Store values in dash.js settings object for CmcdModel.js to retrieve
        settings.get().streaming.cmcd.ahaggar_os = c0;
        settings.get().streaming.cmcd.ahaggar_qt = c1;
        settings.get().streaming.cmcd.ahaggar_dt = c4;
        settings.get().streaming.cmcd.ahaggar_ls = c5;
        settings.get().streaming.cmcd.ahaggar_qtl = c6;
        settings.get().streaming.cmcd.ahaggar_rs = c7;


        // -------------- Retrieve last bitrate guidance value from Ahaggar --------------
        // Value was set in `index.html` using the CMSD response in the last fragment (segment) downloaded
        modelPrediction = settings.get().streaming.cmcd.ahaggar_brg;
        currentBuffer = dashMetrics.getCurrentBufferLevel(mediaType, true);

        if (modelPrediction == null || isNaN(modelPrediction)) {
            console.log('> modelPrediction (' + modelPrediction + ') is invalid, defaulting to lowest quality..')
            modelPrediction = 0;        // lowest quality
        }
        // else if (currentBuffer < 4) {   // Secondary rule based on buffer safety
        //     console.log('> buffer (' + currentBuffer + ') too low, defaulting to lowest quality..')
        //     modelPrediction = 0;        // lowest quality
        // }

        switchRequest.quality = modelPrediction;
        console.log('> Selected Bitrate for Next Segment [idx,value]: ' + modelPrediction + ' , '+ JSON.stringify(bitrateList[modelPrediction].bitrate));
        
        switchRequest.reason = 'Ahaggar';
        switchRequest.priority = SwitchRequest.PRIORITY.STRONG;
        return switchRequest;
     }
 
    //  function resetState() {
    //      h1 = tf.zeros([1, 128]).add(0);
    //      h2 = tf.zeros([1, 128]).add(0);
    //  }
 
     instance = {
         getMaxIndex: getMaxIndex
     };
 
     setup();
 
     return instance;
 }
 
 AhaggarRuleClass.__dashjs_factory_name = 'AhaggarRule';
 AhaggarRule = dashjs.FactoryMaker.getClassFactory(AhaggarRuleClass);
 