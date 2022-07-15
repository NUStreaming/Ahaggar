import os
import json
import sys
sys.path.append('itu-p1203')
from itu_p1203.p1203_standalone import P1203Standalone
import numpy as np

metrics = ["averageBitrate", "numSwitches", "stallDurationMs", "numStalls", "percentOnStalls", "averageBufferLength", "averageLatency", "averagePlaybackRate", "averageSegmentBitrateBytes", "totalSegmentBitrateBytes", "averageSegmentBitrateKbps", "averageVmaf", "qoeLin", "qoeItu_O23_stall", "qoeItu_O35_audiovisual", "qoeItu_O46_overall", "percentHd", "percentUhd"]
miscMetrics = ["device", "abrStrategy"]
summaryResults = {}

if len(sys.argv) > 1:
    folder = sys.argv[1]
else:
    folder = input("Enter test folder ('XXXXX_multiple_clients' folders only): ")

summaryFile = os.path.join(folder, "summary.txt")
if os.path.exists(summaryFile):
    os.remove(summaryFile)	# to replace previously generated file
                     
def printToConsoleAndFile(msg):
    print(msg)
    with open(summaryFile, "a+") as f:
        f.write(msg + "\n")

def computeQoeLin(data):
    # Weights for QoeLin model
    w1 = 0.0771
    w2 = 1.2497
    w3 = 2.8776
    w4 = 0.0494
    w5 = 1.4365

    total_vmaf = total_stall_duration = total_stall_count = total_quality_switches_magnitude = total_quality_switches_count = 0

    for segment_key in data:    # Python 3.7: dict is guaranteed to be iterated in the insertion order of keys
        if "vmaf" in data[segment_key]:
            total_vmaf += data[segment_key]["vmaf"]
            
        if "stallDurationMs" in data[segment_key]:
            total_stall_duration = max(total_stall_duration, data[segment_key]["stallDurationMs"] / 1000.0)

        if "numStalls" in data[segment_key]:
            total_stall_count = max(total_stall_count, data[segment_key]["numStalls"])

        total_quality_switches_magnitude_for_segment = 0
        for idx in range(len(data[segment_key]["switchHistory"])):
            if idx != 0:
                total_quality_switches_magnitude_for_segment += abs(data[segment_key]["switchHistory"][idx]["quality"]["qualityIndex"] - data[segment_key]["switchHistory"][idx-1]["quality"]["qualityIndex"])
        total_quality_switches_magnitude = max(total_quality_switches_magnitude, total_quality_switches_magnitude_for_segment)

        if "numSwitches" in data[segment_key]:
            total_quality_switches_count = max(total_quality_switches_count, data[segment_key]["numSwitches"])

    qoeLin = w1*total_vmaf - w2*total_stall_duration - w3*total_stall_count - w4*total_quality_switches_magnitude - w5*total_quality_switches_count

    printToConsoleAndFile("> [qoeLin] total_vmaf: " + str(total_vmaf) + " (qoeLin: " + str(w1*total_vmaf) + ")")
    printToConsoleAndFile("> [qoeLin] total_stall_duration: " + str(total_stall_duration) + " (qoeLin: -" + str(w2*total_stall_duration) + ")")
    printToConsoleAndFile("> [qoeLin] total_stall_count: " + str(total_stall_count) + " (qoeLin: -" + str(w3*total_stall_count) + ")")
    printToConsoleAndFile("> [qoeLin] total_quality_switches_magnitude: " + str(total_quality_switches_magnitude) + " (qoeLin: -" + str(w4*total_quality_switches_magnitude) + ")")
    printToConsoleAndFile("> [qoeLin] total_quality_switches_count: " + str(total_quality_switches_count) + " (qoeLin: -" + str(w5*total_quality_switches_count) + ")")
    printToConsoleAndFile("qoeLin: " + str(qoeLin))

    return qoeLin


def computeQoeItu(data):
    itu_input = {
        "I11": {
            "segments": [],
            "streamId": 43
        },
        "I13": {
            "segments": [],
            "streamId": 43
        },
        "I23": {
            "stalling": [],
            "streamId": 43
        },
        "IGen": {
            "device": "pc",
            "displaySize": "1920x1080"
        }
    }

    ## Dummy data for testing
    # itu_input["I13"]["segments"] = [
    #         {
    #             "bitrate": 691.72,
    #             "codec": "h264",
    #             "duration": 5.48,
    #             "fps": 25.0,
    #             "resolution": "1920x1080",
    #             "start": 0
    #         },
    #         {
    #             "bitrate": 4158.04,
    #             "codec": "h264",
    #             "duration": 5.0,
    #             "fps": 25.0,
    #             "resolution": "1920x1080",
    #             "start": 5.48
    #         },
    #         {
    #             "bitrate": 7172.66,
    #             "codec": "h264",
    #             "duration": 5.0,
    #             "fps": 25.0,
    #             "resolution": "1920x1080",
    #             "start": 10.48
    #         },
    #         {
    #             "bitrate": 6593.59,
    #             "codec": "h264",
    #             "duration": 4.598,
    #             "fps": 25.0,
    #             "resolution": "1920x1080",
    #             "start": 15.48
    #         }
    #     ]

    ## Dummy data for testing
    # itu_input["I23"]["stalling"] = [[0, 2], [5, 2]]

    for segment_key in data:    # Python 3.7: dict is guaranteed to be iterated in the insertion order of keys
        # print(segment_key)
        if "segmentBitrateBytes" not in data[segment_key] or "duration" not in data[segment_key] or "frameRate" not in data[segment_key] or "height" not in data[segment_key] or "width" not in data[segment_key] or "mediaStartTime" not in data[segment_key]:
            print("[computeQoeItu] Skipping segment due to missing parameter(s): " + segment_key)
        else:
            segmentBitrateBytes = data[segment_key]["segmentBitrateBytes"]
            segmentBitrateKbps = segmentBitrateBytes * 8 / 1000.0 / 4.0; # segment size: 4s
            # print("segmentBitrateBytes: " + str(segmentBitrateBytes))
            # print("segmentBitrateKbps: " + str(segmentBitrateKbps))
            
            duration = data[segment_key]["duration"]
            # print("duration: " + str(duration))
            
            frameRate = data[segment_key]["frameRate"]
            # print("frameRate: " + str(frameRate))
            
            resolution = str(data[segment_key]["width"]) + "x" + str(data[segment_key]["height"])
            # print("resolution: " + str(resolution))
            
            mediaStartTime = data[segment_key]["mediaStartTime"]
            # print("mediaStartTime: " + str(mediaStartTime))

            itu_input["I13"]["segments"].append({
                "bitrate": segmentBitrateKbps,
                "codec": "h264",
                "duration": duration,
                "fps": frameRate,
                "resolution": resolution,
                "start": mediaStartTime
            })
            
    last_segment_data = data[list(data)[-1]]
    for idx in range(len(last_segment_data["stallHistoryVideoTime"])):
        stall_start_video_time = last_segment_data["stallHistoryVideoTime"][idx]["start"]
        stall_duration_real_time = (last_segment_data["stallHistoryRealTime"][idx]["end"] - last_segment_data["stallHistoryRealTime"][idx]["start"]) / 1000.0
        itu_input["I23"]["stalling"].append([stall_start_video_time, stall_duration_real_time])
    
    # print("- stallHistoryVideoTime:")
    # print(last_segment_data["stallHistoryVideoTime"])
    # print("- stallHistoryRealTime:")
    # print(last_segment_data["stallHistoryRealTime"])
    # print("- stallDurationMs:")
    # print(last_segment_data["stallDurationMs"])
    # print("- itu_input['I23']['stalling']:")
    # print(itu_input["I23"]["stalling"])
    # exit()

    print("Computing qoeItu..")
    print('len(itu_input["I13"]["segments"]): ' + str(len(itu_input["I13"]["segments"])))
    print('len(itu_input["I23"]["stalling"]): ' + str(len(itu_input["I23"]["stalling"])))
    
    qoeItu = P1203Standalone(itu_input).calculate_complete()

    return qoeItu


def computeTotalSegmentBitrateBytes(data):
    totalSegmentBitrateBytes = 0
    for segment_key in data:    # Python 3.7: dict is guaranteed to be iterated in the insertion order of keys
        if "segmentBitrateBytes" in data[segment_key]:
            totalSegmentBitrateBytes += data[segment_key]["segmentBitrateBytes"]
    return totalSegmentBitrateBytes


def computePercentSegments(data, segment_type):
    segment_count_of_type = 0
    for segment_key in data:    # Python 3.7: dict is guaranteed to be iterated in the insertion order of keys
        if "height" in data[segment_key]:
            if segment_type == "hd" and (data[segment_key]["height"] == 720 or data[segment_key]["height"] == 1080):
                segment_count_of_type += 1
            elif segment_type == "uhd" and data[segment_key]["height"] == 2160:
                segment_count_of_type += 1
    total_segments = len(list(data))
    print("> [percentSegments][" + segment_type + "] segment_count_of_type: " + str(segment_count_of_type))
    print("> [percentSegments][" + segment_type + "] total_segments: " + str(total_segments))
    return (segment_count_of_type / total_segments) * 100.0

def computePercentOnStalls(data, totalStallDurationSeconds):
    lastSegmentData = data[list(data)[-1]]
    totalMediaDurationSeconds = (lastSegmentData["mediaStartTime"] + lastSegmentData["duration"])
    return (totalStallDurationSeconds / totalMediaDurationSeconds) * 100.0


def addMetricValueToCumulativeResultsWithStats(metric, value):
    printToConsoleAndFile("Adding " + metric + ": " + str(value))
    if metric not in summaryResults:
        summaryResults[metric] = {
            "sum": 0,
            "count": 0,
            "min": None,
            "max": None,
            "values": []
        }
    summaryResults[metric]["sum"] += value
    summaryResults[metric]["count"] += 1
    if summaryResults[metric]["min"] == None or value < summaryResults[metric]["min"]:
        summaryResults[metric]["min"] = value
    if summaryResults[metric]["max"] == None or value > summaryResults[metric]["max"]:
        summaryResults[metric]["max"] = value
    summaryResults[metric]["values"].append(value)


for root, dirs, files in os.walk(folder):
    for name in files:  # for each client in this run
        if "metrics-overall.json" in name:
            _fileMetricsOverall = os.path.join(root, name)
            _fileMetricsByDownload = _fileMetricsOverall.replace("metrics-overall.json", "metrics-by-download.json")

            with open(_fileMetricsOverall) as json_file:
                with open(_fileMetricsByDownload) as json_fileMetricsByDownload:
                    dataMetricsOverall = json.load(json_file)
                    dataMetricsByDownload = json.load(json_fileMetricsByDownload)

                    printToConsoleAndFile("")
                    printToConsoleAndFile("------------------------------------------------------")
                    printToConsoleAndFile(_fileMetricsOverall)
                    printToConsoleAndFile("-------------------------------------------------------")
                    
                    qoeItu = None
                    for metric in metrics:
                        if metric == "qoeLin":
                            # with open(_fileMetricsByDownload) as json_fileMetricsByDownload:
                            # dataMetricsByDownload = json.load(json_fileMetricsByDownload)
                            addMetricValueToCumulativeResultsWithStats(metric, computeQoeLin(dataMetricsByDownload))

                        elif "qoeItu" in metric:
                            if qoeItu is None:
                                qoeItu = computeQoeItu(dataMetricsByDownload)   # compute qoeItu obj first before adding below
                            if metric == "qoeItu_O23_stall":
                                addMetricValueToCumulativeResultsWithStats(metric, qoeItu["O23"])
                            elif metric == "qoeItu_O35_audiovisual":
                                addMetricValueToCumulativeResultsWithStats(metric, qoeItu["O35"])
                            elif metric == "qoeItu_O46_overall":
                                addMetricValueToCumulativeResultsWithStats(metric, qoeItu["O46"])

                        elif metric == "totalSegmentBitrateBytes":
                            addMetricValueToCumulativeResultsWithStats(metric, computeTotalSegmentBitrateBytes(dataMetricsByDownload))

                        elif metric == "percentHd":
                            addMetricValueToCumulativeResultsWithStats(metric, computePercentSegments(dataMetricsByDownload, "hd"))
                        elif metric == "percentUhd":
                            addMetricValueToCumulativeResultsWithStats(metric, computePercentSegments(dataMetricsByDownload, "uhd"))

                        elif metric == "percentOnStalls":
                            addMetricValueToCumulativeResultsWithStats(metric, computePercentOnStalls(dataMetricsByDownload, dataMetricsOverall["stallDurationMs"]/1000.0))

                        else:  # default: extract values of each run directly from metrics-overall.json
                            if metric not in dataMetricsOverall:
                                continue
                            addMetricValueToCumulativeResultsWithStats(metric, dataMetricsOverall[metric])
                    
                    # `misc` metrics for those that do not require computing stats (avg, max, min)
                    
                    for metric in miscMetrics:
                        if metric not in dataMetricsOverall:
                            continue
                        if "misc" not in summaryResults:
                            summaryResults["misc"] = {}
                        if metric not in summaryResults["misc"]:
                            summaryResults["misc"][metric] = ""
                        
                        summaryResults["misc"][metric] += (str(dataMetricsOverall[metric]) + "/")  # miscMetrics: Added to results obj without stats computation
                        printToConsoleAndFile('summaryResults["misc"][' + metric + ']: ' + str(summaryResults["misc"][metric]))

headers=""
spacedLine=""
printToConsoleAndFile("")
printToConsoleAndFile("------------------------------------------------------")
printToConsoleAndFile("SUMMARY")
printToConsoleAndFile("-------------------------------------------------------")
for metric, obj in summaryResults.items():
     if metric == "misc":
        for key, val in obj.items():
            printToConsoleAndFile("[misc] " + key + ": " + val)
            headers+=key
            spacedLine+=str(val) + ", "
     else:
        metric_average = summaryResults[metric]["sum"] / summaryResults[metric]["count"]
        metric_min = summaryResults[metric]["min"]
        metric_max = summaryResults[metric]["max"]
        metric_std = np.std(np.array(summaryResults[metric]["values"]))

        printToConsoleAndFile(metric + ": ")
        printToConsoleAndFile("- average: " + str(metric_average))
        for key, value in obj.items():
            printToConsoleAndFile("- " + key + ": " + str(value))

        # To store to csv
        headers += metric+"_average, " + metric+"_min, " + metric+"_max, " + metric+"_std, "
        spacedLine+=str(metric_average) + ", "
        spacedLine+=str(metric_min) + ", " + str(metric_max) + ", " + str(metric_std) + ", "

# Print comments
comments = None
for root, dirs, files in os.walk(folder):
    for name in files:
        if "evaluate.json" in name and comments == None:
            _file = os.path.join(root, name)
            with open(_file) as json_file:
                data = json.load(json_file)
                comments = data["comments"]
                printToConsoleAndFile("")
                printToConsoleAndFile("# Comments for run: " + comments)
                break

# Print results in csv form
# headers=""
# for metric in metrics:
#     headers+=metric+"_average, "+metric+"_min, "+metric+"_max, "
# for metric in miscMetrics:
#     headers+=metric
printToConsoleAndFile("")
printToConsoleAndFile(headers)
printToConsoleAndFile(spacedLine)