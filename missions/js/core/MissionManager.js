const MissionContractID = "8f52e7fc-fb2d-47bd-9593-2a28993ddc7d";
const MissionManager = {
    eventManager: null,
    Contract: {
        acceptMission: function (missionID, userAddress) {
            return new Promise((resolve, reject) => {
                if (MissionManager.eventManager == null) {
                    reject();
                    return;
                }
                const encodedMission = btoa(
                    JSON.stringify({
                        requestType: "accept-mission",
                        missionID: missionID,
                    })
                );
                MissionManager.eventManager
                    .sign(userAddress, encodedMission, 0)
                    .then((encodedUserTx) => {
                        Wormhole.executeContract(
                            MissionContractID,
                            "AcceptMission",
                            { encodedUserTx: btoa(JSON.stringify(encodedUserTx)) },
                            "https://utopixia.com"
                        ).then((response) => {
                            resolve(response);
                        });
                    });
            });
        },
    },
};
