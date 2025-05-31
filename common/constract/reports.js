const ReportGraphID = "7e23bcec-f608-4124-8abd-e3fafc1ddb02";
function GetReportsForUser(userAddress) {
    Wormhole.SetOutputFormat("application/json");
    const graph = new GraphElement(
        ReportGraphID,
        Blackhole.LoadGraph(ReportGraphID)
    );
    const reports = graph
        .children()
        .filter((child) => {
            return child.object["report-owner"] == userAddress;
        })
        .map((child) => {
            return child.object;
        });
    return JSON.stringify({ status: "ok", reports: reports });
}
function SubmitReport(encodedUserTx) {
    Wormhole.SetOutputFormat("application/json");
    try {
        const userTx = JSON.parse(atob(encodedUserTx));
        if (!Singularity.IsValidTransaction(userTx)) {
            return sendError("Transaction invalide", encodedUserTx);
        }
        const payload = JSON.parse(atob(userTx.data));
        if (payload.requestType !== "submit-report") {
            return sendError("Type de requête non supporté", payload.requestType);
        }
        if (!payload.report) {
            return sendError("Champ 'report' manquant");
        }
        let reportData = {};
        try {
            reportData = JSON.parse(atob(payload.report));
        } catch (err) {
            return sendError(
                "Report invalide : impossible de parser le JSON",
                err.message
            );
        }
        const graph = new GraphElement(
            ReportGraphID,
            Blackhole.LoadGraph(ReportGraphID)
        );
        const parentID = graph.object.id;
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/T/, "_");
        const nodeName = timestamp + "___" + userTx.sender_blockchain_address;
        if (graph.hasNext(nodeName)) {
            return sendError("Un rapport avec ce timestamp existe déjà", nodeName);
        }
        const path = graph.object.path + "/" + nodeName;
        const nodeID = app.MD5(path);
        Blackhole.UpdateElement(ReportGraphID, parentID, "children", nodeName);
        Object.entries(reportData).forEach(([key, value]) => {
            Blackhole.UpdateElement(ReportGraphID, nodeID, key, value);
        });
        Blackhole.UpdateElement(
            ReportGraphID,
            nodeID,
            "report-owner",
            userTx.sender_blockchain_address
        );
        return JSON.stringify({
            status: "ok",
            tx: Blackhole.Commit(),
            nodeID: nodeID,
            nodeName: nodeName,
        });
    } catch (err) {
        return sendError("Erreur inattendue", err.message);
    }
}
function sendError(message, details = null) {
    return JSON.stringify({ status: "error", message, details });
}
