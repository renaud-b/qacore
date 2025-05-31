const UserProfileGraphID = "fdd9694c-99a4-4193-a6e6-643506246e5d";
const ProjectManagerAddress = "1MghLWFJa6KjjEg6KCGMxmbfUp1HFLddnU";

function sendError(message, details = null) {
    const errorResponse = { status: "error", message: message, details: details };
    return JSON.stringify(errorResponse);
}

function GetUserProfile(address) {
    const graph = new GraphElement(
        UserProfileGraphID,
        Blackhole.LoadGraph(UserProfileGraphID)
    );
    const profileNode = graph
        .children()
        .find((n) => n.object["profile-address"] === address);
    if (!profileNode) {
        return { status: "error", address: address, message: "Profile not found." };
    }
    return { status: "ok", profile: profileNode.object };
}
function ProvideXP(encodedUserTx, address, xp) {

    let userTx;
    try {
        userTx = JSON.parse(atob(encodedUserTx));
    } catch (err) {
        return sendError("Transaction illisible", err.message);
    }

    if (!Singularity.IsValidTransaction(userTx)) {
        return sendError("Transaction invalide", encodedUserTx);
    }

    if (userTx.sender_blockchain_address !== ProjectManagerAddress) {
        return sendError("Seul le Project Manager peut compléter une mission");
    }

    let payload;
    try {
        payload = JSON.parse(atob(userTx.data));
    } catch (err) {
        return sendError("Payload illisible", err.message);
    }

    if (payload.requestType !== "complete-mission") {
        return sendError("Type de requête invalide", payload.requestType);
    }

    const now = Date.now();
    if (Math.abs(now - payload.timestamp) > 5000) {
        return sendError("Timestamp trop ancien ou trop futur", {
            now,
            received: payload.timestamp,
        });
    }


    const graph = new GraphElement(
        UserProfileGraphID,
        Blackhole.LoadGraph(UserProfileGraphID)
    );
    const profileNode = graph
        .children()
        .find((n) => n.object["profile-address"] === address);
    if (!profileNode) {
        return { status: "error", message: "Profile not found." };
    }
    const base = 100;
    const xpGain = parseInt(xp);
    let xpTotal = parseInt(profileNode.object["profile-xp"]) + xpGain;
    let level = parseInt(profileNode.object["profile-level"]);
    let leveledUp = false;
    while (xpTotal >= base * level) {
        xpTotal -= base * level;
        level++;
        leveledUp = true;
    }
    Blackhole.UpdateElement(
        UserProfileGraphID,
        profileNode.object.id,
        "profile-xp",
        xpTotal
    );
    Blackhole.UpdateElement(
        UserProfileGraphID,
        profileNode.object.id,
        "profile-level",
        level
    );
    return {
        status: "ok",
        tx: Blackhole.Commit(),
        newXP: xpTotal,
        newLevel: level,
        leveledUp: leveledUp,
    };
}
