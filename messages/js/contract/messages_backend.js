const MessagesGraphID = "84d09c9b-387b-4430-8e8f-23c4304b59b3";
const ProjectManagerAddress = "1MghLWFJa6KjjEg6KCGMxmbfUp1HFLddnU";

function GetMessagesForThread(encodedUserTx) {
    Wormhole.SetOutputFormat("application/json");
    let userTx;
    try {
        userTx = JSON.parse(atob(encodedUserTx));
    } catch (err) {
        return sendError("Transaction illisible", err.message);
    }
    if (!Singularity.IsValidTransaction(userTx)) {
        return sendError("Transaction invalide");
    }
    const sender = userTx.sender_blockchain_address;
    let payload;
    try {
        payload = JSON.parse(atob(userTx.data));
    } catch (err) {
        return sendError("Payload illisible", err.message);
    }
    if (payload.requestType !== "get-messages") {
        return sendError("Type de requête invalide", payload.requestType);
    }
    const now = Date.now();
    if (Math.abs(now - payload.timestamp) > 5000) {
        return sendError("Timestamp invalide", {
            now,
            received: payload.timestamp,
        });
    }
    const threadID = payload.thread;
    const graph = new GraphElement(
        MessagesGraphID,
        Blackhole.LoadGraph(MessagesGraphID)
    );
    const threadNode = graph.children().find((n) => n.object.id === threadID);
    if (!threadNode) {
        return sendError("Thread introuvable", threadID);
    }
    const authorized = threadNode.object["thread-authorized_users"] || "";
    if (!authorized.includes(sender + ";") && sender != ProjectManagerAddress) {
        return sendError("Accès refusé pour cet utilisateur", sender);
    }
    const messages = threadNode.children().map((msg) => {
        return {
            author: msg.object["msg-author"],
            text: msg.object["msg-content"],
            ts: msg.object["msg-timestamp"],
        };
    });
    return JSON.stringify({ status: "ok", messages: messages });
}
function PostMessage(encodedUserTx) {
    Wormhole.SetOutputFormat("application/json");
    let userTx;
    try {
        userTx = JSON.parse(atob(encodedUserTx));
    } catch (err) {
        return sendError("Transaction illisible", err.message);
    }
    if (!Singularity.IsValidTransaction(userTx)) {
        return sendError("Transaction invalide");
    }
    const sender = userTx.sender_blockchain_address;
    let payload;
    try {
        payload = JSON.parse(atob(userTx.data));
    } catch (err) {
        return sendError("Payload illisible", err.message);
    }
    if (payload.requestType !== "post-message") {
        return sendError("Type de requête invalide", payload.requestType);
    }
    const now = Date.now();
    if (Math.abs(now - payload.timestamp) > 5000) {
        return sendError("Timestamp invalide", {
            now,
            received: payload.timestamp,
        });
    }
    const threadID = payload.thread;
    const content = payload.content;
    if (!threadID || !content) {
        return sendError("Thread ou contenu manquant");
    }
    const graph = new GraphElement(
        MessagesGraphID,
        Blackhole.LoadGraph(MessagesGraphID)
    );
    const threadNode = graph.findByID(threadID);
    if (!threadNode) {
        return sendError("Thread introuvable", threadID);
    }
    const authorized = threadNode.object["thread-authorized_users"] || "";
    if (!authorized.includes(sender + ";") && sender != ProjectManagerAddress) {
        return sendError("Accès refusé", sender);
    }
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "_");
    const nodeName = "msg_" + timestamp;
    const path = threadNode.object.path + "/" + nodeName;
    const nodeID = app.MD5(path);
    Blackhole.UpdateElement(MessagesGraphID, threadID, "children", nodeName);
    Blackhole.UpdateElement(MessagesGraphID, nodeID, "msg-author", sender);
    Blackhole.UpdateElement(MessagesGraphID, nodeID, "msg-content", content);
    Blackhole.UpdateElement(MessagesGraphID, nodeID, "msg-timestamp", Date.now());
    return JSON.stringify({ status: "ok", nodeID, tx: Blackhole.Commit() });
}
function sendError(message, details = null) {
    return JSON.stringify({
        status: "error",
        message: message,
        details: details,
    });
}

function CreateThread(encodedUserTx) {
    Wormhole.SetOutputFormat("application/json");

    let userTx;
    try {
        userTx = JSON.parse(atob(encodedUserTx));
    } catch (err) {
        return sendError("Transaction illisible", err.message);
    }

    if (!Singularity.IsValidTransaction(userTx)) {
        return sendError("Transaction invalide");
    }

    const sender = userTx.sender_blockchain_address;
    if (sender !== ProjectManagerAddress) {
        return sendError("Seul le PM peux ajouter des threads");
    }

    let payload;
    try {
        payload = JSON.parse(atob(userTx.data));
    } catch (err) {
        return sendError("Payload illisible", err.message);
    }

    if (payload.requestType !== "create-thread") {
        return sendError("Type de requête invalide", payload.requestType);
    }

    const now = Date.now();
    if (Math.abs(now - payload.timestamp) > 5000) {
        return sendError("Timestamp invalide", { now, received: payload.timestamp });
    }

    const name = payload.name.trim();
    if (!name || name.length <= 0) {
        return sendError("Nom de thread invalide");
    }

    const root = new GraphElement(MessagesGraphID, Blackhole.LoadGraph(MessagesGraphID))

    const path = root.object.path+"/" + name;
    const nodeID = app.MD5(path);

    Blackhole.UpdateElement(MessagesGraphID, root.object.id, "children", name);

    Blackhole.UpdateElement(MessagesGraphID, nodeID, "type", "thread");
    Blackhole.UpdateElement(MessagesGraphID, nodeID, "thread-name", name);
    Blackhole.UpdateElement(MessagesGraphID, nodeID, "thread-authorized_users", sender + ";");
    Blackhole.UpdateElement(MessagesGraphID, nodeID, "created_at", now);

    return JSON.stringify({
        status: "ok",
        nodeID,
        tx: Blackhole.Commit(),
    });
}

function EditThread(encodedUserTx) {
    Wormhole.SetOutputFormat("application/json");

    let userTx;
    try {
        userTx = JSON.parse(atob(encodedUserTx));
    } catch (err) {
        return sendError("Transaction illisible", err.message);
    }

    if (!Singularity.IsValidTransaction(userTx)) {
        return sendError("Transaction invalide");
    }

    const sender = userTx.sender_blockchain_address;
    if (sender !== ProjectManagerAddress) {
        return sendError("Seul le PM peux ajouter des threads");
    }

    let payload;
    try {
        payload = JSON.parse(atob(userTx.data));
    } catch (err) {
        return sendError("Payload illisible", err.message);
    }

    if (payload.requestType !== "edit-thread") {
        return sendError("Type de requête invalide", payload.requestType);
    }

    const now = Date.now();
    if (Math.abs(now - payload.timestamp) > 5000) {
        return sendError("Timestamp invalide", { now, received: payload.timestamp });
    }

    const threadID = payload.thread;
    const newName = payload.newName.trim();
    const newUsers = payload.authorized.trim();

    if (!threadID || !newName || !newUsers) {
        return sendError("Paramètres manquants");
    }

    const graph = new GraphElement(MessagesGraphID, Blackhole.LoadGraph(MessagesGraphID));
    const thread = graph.findByID(threadID);
    if (!thread) {
        return sendError("Thread introuvable", threadID);
    }

    // Mise à jour des infos
    Blackhole.UpdateElement(MessagesGraphID, threadID, "thread-name", newName);
    Blackhole.UpdateElement(MessagesGraphID, threadID, "thread-authorized_users", newUsers);

    return JSON.stringify({
        status: "ok",
        tx: Blackhole.Commit(),
    });
}

function DeleteThread(encodedUserTx) {
    Wormhole.SetOutputFormat("application/json");

    let userTx;
    try {
        userTx = JSON.parse(atob(encodedUserTx));
    } catch (err) {
        return sendError("Transaction illisible", err.message);
    }

    if (!Singularity.IsValidTransaction(userTx)) {
        return sendError("Transaction invalide");
    }

    const sender = userTx.sender_blockchain_address;
    if (sender !== ProjectManagerAddress) {
        return sendError("Seul le PM peux ajouter des threads");
    }

    let payload;
    try {
        payload = JSON.parse(atob(userTx.data));
    } catch (err) {
        return sendError("Payload illisible", err.message);
    }

    if (payload.requestType !== "delete-thread") {
        return sendError("Type de requête invalide", payload.requestType);
    }

    const now = Date.now();
    if (Math.abs(now - payload.timestamp) > 5000) {
        return sendError("Timestamp invalide", { now, received: payload.timestamp });
    }

    const threadID = payload.thread;
    if (!threadID) {
        return sendError("Thread manquant");
    }

    const graph = new GraphElement(MessagesGraphID, Blackhole.LoadGraph(MessagesGraphID));
    const thread = graph.findByID(threadID);
    if (!thread) {
        return sendError("Thread introuvable", threadID);
    }

    // Suppression du thread lui-même
    Blackhole.DeleteElement(MessagesGraphID, threadID);

    return JSON.stringify({
        status: "ok",
        tx: Blackhole.Commit()
    });
}
