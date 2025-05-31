const MissionContractID = "8f52e7fc-fb2d-47bd-9593-2a28993ddc7d";
const MissionManager = {
    eventManager: null,
    userAddress: null,
    Contract: {
        acceptMission: function (missionID) {
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
                    .sign(MissionManager.userAddress, encodedMission, 0)
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
        validateWithReport: function (missionID, reportID, comment) {
            return new Promise((resolve, reject) => {
                if (!MissionManager.eventManager) {
                    reject("eventManager manquant");
                    return;
                }
                const payload = {
                    requestType: "validate-mission",
                    missionID,
                    reportID,
                    comment,
                };
                const encodedPayload = btoa(JSON.stringify(payload));
                MissionManager.eventManager
                    .sign(MissionManager.userAddress, encodedPayload, 0)
                    .then((signedTx) => {
                        const encodedUserTx = btoa(JSON.stringify(signedTx));
                        return Wormhole.executeContract(
                            MissionContractID,
                            "ValidateMission",
                            { encodedUserTx },
                            "https://utopixia.com"
                        );
                    })
                    .then((response) => {
                        if (response.status !== "ok") {
                            reject(response);
                        } else {
                            resolve(response);
                        }
                    })
                    .catch((err) => {
                        reject(err);
                    });
            });
        },
    },
};
