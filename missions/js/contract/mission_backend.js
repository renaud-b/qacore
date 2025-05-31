const MissionGraphID = "8b714ab9-3aa7-469e-bd20-ad788369cea6";
const ReportGraphID = "7e23bcec-f608-4124-8abd-e3fafc1ddb02";
const ProjectManagerAddress = "1MghLWFJa6KjjEg6KCGMxmbfUp1HFLddnU";
function EditMission(encodedUserTx) {
    Wormhole.SetOutputFormat("application/json");
    const userTx = JSON.parse(atob(encodedUserTx));
    if (!Singularity.IsValidTransaction(userTx)) {
        return sendError("Transaction invalide", encodedUserTx);
    }
    if (userTx.sender_blockchain_address !== ProjectManagerAddress) {
        return sendError(
            "Édition non autorisée – seul le Project Manager peut modifier une mission"
        );
    }
    const decodedPayload = JSON.parse(atob(userTx.data));
    if (decodedPayload.requestType !== "edit-mission") {
        return sendError("Type de requête invalide", decodedPayload.requestType);
    }
    const missionID = decodedPayload.missionID;
    const updates = decodedPayload.updates;
    const graph = new GraphElement(
        MissionGraphID,
        Blackhole.LoadGraph(MissionGraphID)
    );
    const missionNode = graph.findByID(missionID);
    if (!missionNode) {
        return sendError("Mission non trouvée", missionID);
    }
    Object.entries(updates).forEach(([key, value]) => {
        Blackhole.UpdateElement(MissionGraphID, missionID, key, value);
    });
    return JSON.stringify({
        status: "ok",
        tx: Blackhole.Commit(),
        updated: Object.keys(updates),
    });
}
function CreateMission(encodedUserTx) {
    Wormhole.SetOutputFormat("application/json");
    const userTx = JSON.parse(atob(encodedUserTx));
    if (!Singularity.IsValidTransaction(userTx)) {
        return sendError("Transaction invalide", encodedUserTx);
    }
    if (userTx.sender_blockchain_address !== ProjectManagerAddress) {
        return sendError(
            "Édition non autorisée – seul le Project Manager peut modifier une mission"
        );
    }
    const decodedPayload = JSON.parse(atob(userTx.data));
    if (decodedPayload.requestType !== "create-mission") {
        return sendError("Type de requête invalide", decodedPayload.requestType);
    }
    const updates = decodedPayload.updates;
    const graph = new GraphElement(
        MissionGraphID,
        Blackhole.LoadGraph(MissionGraphID)
    );
    let missionNodeName = "0000";
    for (let i = 0; i <= 9999; ++i) {
        const paddingLength = Math.max(4 - i.toString().length, 0);
        const tmpNodeName = "0".repeat(paddingLength) + i;
        if (!graph.hasNext(tmpNodeName)) {
            missionNodeName = tmpNodeName;
            break;
        }
    }
    const missionPath = graph.object.path + "/" + missionNodeName;
    const missionID = app.MD5(missionPath);
    Blackhole.UpdateElement(
        MissionGraphID,
        graph.object.id,
        "children",
        missionNodeName
    );
    Object.entries(updates).forEach(([key, value]) => {
        Blackhole.UpdateElement(MissionGraphID, missionID, key, value);
    });
    return JSON.stringify({
        status: "ok",
        tx: Blackhole.Commit(),
        updated: Object.keys(updates),
    });
}
function sendError(message, details = null) {
    const errorResponse = { status: "error", message: message, details: details };
    return JSON.stringify(errorResponse);
}
function getMissionsForUser(root, userAddress, expectedStatus) {
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
    const previousMissions = getMissionsForUser(
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
function ValidateMission(encodedUserTx) {
    Wormhole.SetOutputFormat("application/json");
    try {
        const userTx = JSON.parse(atob(encodedUserTx));
        if (!Singularity.IsValidTransaction(userTx)) {
            return sendError("Transaction invalide", encodedUserTx);
        }
        const payload = JSON.parse(atob(userTx.data));
        if (payload.requestType !== "validate-mission") {
            return sendError("Type de requête invalide", payload.requestType);
        }
        const missionID = payload.missionID;
        const reportID = payload.reportID;
        if (!missionID || !reportID) {
            return sendError("Paramètres manquants : missionID ou reportID");
        }
        const missionGraph = new GraphElement(
            MissionGraphID,
            Blackhole.LoadGraph(MissionGraphID)
        );
        const reportGraph = new GraphElement(
            ReportGraphID,
            Blackhole.LoadGraph(ReportGraphID)
        );
        const missionNode = missionGraph.findByID(missionID);
        const reportNode = reportGraph.findByID(reportID);
        if (!missionNode) return sendError("Mission introuvable", missionID);
        if (!reportNode) return sendError("Rapport introuvable", reportID);
        const timestamp = new Date().toISOString();
        Blackhole.UpdateElement(
            MissionGraphID,
            missionID,
            "mission-report_id",
            reportID
        );
        Blackhole.UpdateElement(
            MissionGraphID,
            missionID,
            "mission-report_timestamp",
            timestamp
        );
        Blackhole.UpdateElement(
            MissionGraphID,
            missionID,
            "mission-status",
            "submitted"
        );
        Blackhole.UpdateElement(
            ReportGraphID,
            reportID,
            "report-mission_id",
            missionID
        );
        return JSON.stringify({
            status: "ok",
            tx: Blackhole.Commit(),
            updated: { missionID, reportID, timestamp },
        });
    } catch (err) {
        return sendError("Erreur inattendue", err.message);
    }
}
