const MissionContractID = "0x1234567890abcdef1234567890abcdef12345678"; // Example contract ID
const MissionManager = {
    eventManager: null,
    Contract: {
        acceptMission: function(missionID, userAddress) {
            return new Promise((resolve, reject) => {
                if(MissionManager.eventManager == null){
                    MissionManager.eventManager.signWithoutGas(userAddress, encodedMission).then((encodedUserTx) => {
                        Wormhole.executeContract(MissionContractID, "AcceptMission", {encodedUserTx: encodedUserTx}).then((response) => {
                            console.log("response", response);
                        })
                    })
                }
            })
        }
    }
}