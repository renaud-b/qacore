const MissionGraphID = "8b714ab9-3aa7-469e-bd20-ad788369cea6";
function sendError(message, details = null) {
    const errorResponse = { status: "error", message: message, details: details };
    return JSON.stringify(errorResponse);
}
function getMisionsForUser(root, userAddress, expectedStatus) {
    return root.children().filter((child) => {
        return (
            child.object["mission-status"] === expectedStatus &&
            child.object["mission-assigned_to"] === userAddress
        );
    });
}
function AcceptMission(encodedUserTx) {
    Wormhole.SetOutputFormat("application/json");
    const userTx = JSON.parse(atob(encodedUserTx));
    if (!Singularity.IsValidTransaction(userTx)) {
        return sendError("Invalid transaction format", encodedUserTx);
    }
    const decodedPayload = JSON.parse(atob(userTx.data));
    if (decodedPayload.requestType !== "accept-mission") {
        return sendError("Invalid request type: ", decodedPayload.requestType);
    }
    const missionID = decodedPayload.missionID;
    const graph = new GraphElement(
        MissionGraphID,
        Blackhole.LoadGraph(MissionGraphID)
    );
    const targetMissionNode = graph.findByID(missionID);
    if (!targetMissionNode) {
        return sendError("Identifiant de mission invalide", missionID);
    }
    if (targetMissionNode.object["mission-status"] !== "available") {
        return sendError(
            "Impossible d'accepter une mission qui n'est pas disponible",
            targetMissionNode.object["mission-status"]
        );
    }
    const previousMissions = getMisionsForUser(
        graph,
        userTx.sender_blockchain_address,
        "in_progress"
    );
    if (previousMissions.length >= 2) {
        return sendError(
            "Vous avez atteint le nombre maximum de missions",
            previousMissions.length
        );
    }
    if (
        !Blackhole.UpdateElement(
            MissionGraphID,
            missionID,
            "mission-assigned_to",
            userTx.sender_blockchain_address
        )
    ) {
        return sendError("Assignement impossible", missionID);
    }
    if (
        !Blackhole.UpdateElement(
            MissionGraphID,
            missionID,
            "mission-status",
            "in_progress"
        )
    ) {
        return sendError("Changement de status impossible", missionID);
    }
    return JSON.stringify({
        status: "ok",
        message: "Mission accepted successfully",
        tx: Blackhole.Commit(),
    });
}
