function sendError(message) {
    const errorResponse = {
        status: "error",
        message: message
    };
    return JSON.stringify(errorResponse);
}

function AcceptMission(encodedUserTx) {
    Wormhole.SetOutputFormat("application/json");
    const userTx = JSON.parse(atob(encodedUserTx));
    if(!Singularity.IsValidTransaction(userTx)){
        return sendError("Invalid transaction format");
    }

    return JSON.stringify({status: "ok", message: "Mission accepted successfully"});
}