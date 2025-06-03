const MissionContractID = "8f52e7fc-fb2d-47bd-9593-2a28993ddc7d";
const MissionStore = {
    editMission: function (
        missionID,
        updates,
        userAddress,
        eventManager,
        whenTxHasBeenCommitted = () => {}
    ) {
        return new Promise((resolve, reject) => {
            if (!eventManager) {
                reject("eventManager manquant");
                return;
            }
            const payload = {
                requestType: "edit-mission",
                missionID: missionID,
                updates: updates,
            };
            const encodedPayload = btoa(JSON.stringify(payload));
            eventManager
                .sign(userAddress, encodedPayload, 0)
                .then((signedTx) => {
                    const encodedUserTx = btoa(JSON.stringify(signedTx));
                    return Wormhole.executeContract(
                        MissionContractID,
                        "EditMission",
                        { encodedUserTx: encodedUserTx },
                        "https://utopixia.com"
                    );
                })
                .then((response) => {
                    if (response.status !== "ok") {
                        console.error("Échec édition mission :", response);
                        reject(response.message || "Erreur inconnue");
                        return;
                    }
                    whenTxHasBeenCommitted();
                    Singularity.waitForTx(response.tx[0]).then((e) => {
                        resolve(response);
                    });
                })
                .catch((err) => {
                    console.error("Erreur lors de la signature ou l'envoi :", err);
                    reject(err);
                });
        });
    },
    createMission: function (
        updates,
        userAddress,
        eventManager,
        whenTxHasBeenCommitted = () => {}
    ) {
        return new Promise((resolve, reject) => {
            if (!eventManager) {
                reject("eventManager manquant");
                return;
            }
            const payload = { requestType: "create-mission", updates: updates };
            const encodedPayload = btoa(JSON.stringify(payload));
            eventManager
                .sign(userAddress, encodedPayload, 0)
                .then((signedTx) => {
                    const encodedUserTx = btoa(JSON.stringify(signedTx));
                    return Wormhole.executeContract(
                        MissionContractID,
                        "CreateMission",
                        { encodedUserTx: encodedUserTx },
                        "https://utopixia.com"
                    );
                })
                .then((response) => {
                    if (response.status !== "ok") {
                        console.error("Échec création mission :", response);
                        reject(response.message || "Erreur inconnue");
                        return;
                    }
                    whenTxHasBeenCommitted();
                    Singularity.waitForTx(response.tx[0]).then(() => {
                        resolve(response);
                    });
                })
                .catch((err) => {
                    console.error("Erreur lors de la création :", err);
                    reject(err);
                });
        });
    },
    completeMission: function (eventManager, userAddress, missionID) {
        const payload = {
            requestType: "complete-mission",
            missionID: missionID,
            timestamp: Date.now(),
        };
        const encodedPayload = btoa(JSON.stringify(payload));
        return eventManager
            .sign(userAddress, encodedPayload, 0)
            .then((signedTx) => {
                const encodedUserTx = btoa(JSON.stringify(signedTx));
                return Wormhole.executeContract(
                    MissionContractID,
                    "CompleteMission",
                    { encodedUserTx },
                    "https://utopixia.com"
                );
            });
    },
};
