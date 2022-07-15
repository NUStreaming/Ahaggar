// joining and leaving client lists shoulb be defined here
// joinDurationInMs is the time passed when the playback is started
// leaveDurationInMs is the dration after joining

// ****************************************
// @CONFIG - Select video urls and min/max buffer values below.
//         - Option to customize by client further below.
// ****************************************

/*
 * Retrieve some params from `package.json` config file
 */
const networkProfile = process.env.npm_package_config_network_profile;
const numClients = process.env.npm_package_config_num_clients;
const abrStrategyInput = process.env.npm_package_config_abr_strategy;
console.log("Network profile: ", networkProfile);
console.log("Number of clients: ", numClients);
console.log("Abr strategy: ", abrStrategyInput);

/*
 * Set video url here
 * (uniform Abr across all clients; for mix of Abrs see `client_profile_join_test_combined_mixedAbr.js`)
 */
let url = "";
if (process.env.npm_package_config_abr_strategy == 'abrAhaggar') {
    url = "http://localhost:8085/cmsd-express/bitrateGuidance/media/vod/bbb/bbb.mpd"; // with cmsd + ahaggar
}
else if (process.env.npm_package_config_abr_strategy == 'abrPensieve') {
    url = "http://localhost:8085/cmsd-express/pensieve/media/vod/bbb/bbb.mpd"; // with cmsd + pensieve
} else {
    url = "http://localhost:8085/media/vod/bbb/bbb.mpd"; // no cmsd
}
console.log("Video url: ", url);

/*
 * Set buffer min/max here
 */
const segmentDuration = 4;
const minBufferGlobal = segmentDuration;
const maxBufferGlobal = segmentDuration * 5;
console.log("Min buffer: ", minBufferGlobal);
console.log("Max buffer: ", maxBufferGlobal);
console.log("\n");

/*
 * Set device list here 
 * (OPTIONAL: only if device differs across clients; else set global value in index.html)
 * (For scenario 3 (Ahaggar mixed devices), 4 (mixedAbr), 5 (sharedNetwork))
 */
// const deviceList = ["uhdtv", "uhdtv", "hdtv", "hdtv", "phone", "phone"]

/*
 * Set network traces here
 */
let networkProfileList = []
let networkProfile_1c = ""

if (networkProfile == "5G-Lumous") {
    networkProfileList = [
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/5G-Lumous/client1_driving.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/5G-Lumous/client2_walking.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/5G-Lumous/client3_driving.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/5G-Lumous/client4_walking.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/5G-Lumous/client5_driving.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/5G-Lumous/client6_walking.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/5G-Lumous/client7_driving.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/5G-Lumous/client8_walking.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/5G-Lumous/client9_driving.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/5G-Lumous/client10_walking.log"
    ]
    networkProfile_1c = "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/1-client/5G-Lumous/driving.txt"
}

else if (networkProfile == "4G-Lumous") {
    networkProfileList = [
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Lumous/client1_driving.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Lumous/client2_walking.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Lumous/client3_driving.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Lumous/client4_walking.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Lumous/client5_driving.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Lumous/client6_walking.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Lumous/client7_driving.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Lumous/client8_walking.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Lumous/client9_driving.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Lumous/client10_walking.log"
    ]
    networkProfile_1c = "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/1-client/4G-Lumous/driving.txt"
}

else if (networkProfile == "4G-NYU") {
    networkProfileList = [
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-NYU/client1_bus.csv",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-NYU/client2_car.csv",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-NYU/client3_ferry.csv",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-NYU/client4_train.csv",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-NYU/client5_car.csv",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-NYU/client6_train.csv",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-NYU/client7_bus.csv",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-NYU/client8_car.csv",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-NYU/client9_ferry.csv",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-NYU/client10_bus.csv"
    ]
    networkProfile_1c = "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/1-client/4G-NYU/car.csv"
}

else if (networkProfile == "4G-Belgium") {
    networkProfileList = [
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Belguim/client1_bus.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Belguim/client2_car.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Belguim/client3_bicycle.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Belguim/client4_bus.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Belguim/client5_car.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Belguim/client6_train.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Belguim/client7_walking.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Belguim/client8_tram.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Belguim/client9_foot.log",
        "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/10-clients/4G-Belguim/client10_train.log"
    ]
    networkProfile_1c = "tc-network-profiles/new_profiles/tc_policy.sh tc-network-profiles/new_profiles/5s/NetworkDataset/1-client/4G-Belguim/bus.csv"
}


/*
 * Generate clients
 */
let clients = [];
for (let i = 0; i < numClients; i++) {
    let clientNetworkProfile = networkProfileList[i]
    if (numClients == 1) { clientNetworkProfile = networkProfile_1c; }

    let clientData = {
        joinDurationInMs: 0,
        numClient: 1,
        videoUrl: url,
        minBuffer: minBufferGlobal,
        maxBuffer: maxBufferGlobal,
        networkProfile: clientNetworkProfile,
        abrStrategyInput: abrStrategyInput
    };

    if (typeof deviceList !== 'undefined') {
        clientData['device'] = deviceList[i];
    }

    clients.push(clientData);
}


module.exports = { clients };
