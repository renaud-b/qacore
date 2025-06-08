const GroupGraphID = "048d5c2d-85b6-4d5a-a994-249f6032ec3a"
const UsersGraphID = "b0586e65-e103-4f36-b644-574254a113d7"
const MessagesGraphID = "84d09c9b-387b-4430-8e8f-23c4304b59b3";

const ProjectManagerAddress = "1MYmUX2E4s3uog5443j7bFLR3Enx63bHgU";



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
    return safeErrorWrapper(() => {
        const userTx = parseEncodedUserTx(encodedUserTx);
        const payload = parsePayload(userTx);

        checkRequestType(payload, "post-message");
        checkTxTimestamp(payload);

        const sender = userTx.sender_blockchain_address;

        checkRequiredParam(payload, "thread");
        checkRequiredParam(payload, "content");

        const threadID = payload.thread;
        const content = payload.content;

        const graph = new GraphElement(
            MessagesGraphID,
            Blackhole.LoadGraph(MessagesGraphID)
        );

        const threadNode = graph.findByID(threadID);
        if (!threadNode) {
            throw {
                message: "Thread introuvable",
                details: threadID,
            };
        }

        checkUserAuthorized(sender, threadNode.object["thread-authorized_users"] || "");

        const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "_");
        const nodeName = "msg_" + timestamp;
        const path = threadNode.object.path + "/" + nodeName;
        const nodeID = app.MD5(path);

        Blackhole.UpdateElement(MessagesGraphID, threadID, "children", nodeName);
        Blackhole.UpdateElement(MessagesGraphID, nodeID, "msg-author", sender);
        Blackhole.UpdateElement(MessagesGraphID, nodeID, "msg-content", content);
        Blackhole.UpdateElement(MessagesGraphID, nodeID, "msg-timestamp", Date.now());

        return JSON.stringify({
            status: "ok",
            nodeID: nodeID,
            tx: Blackhole.Commit(),
        });
    });
}

function CreateThread(encodedUserTx) {
    return safeErrorWrapper(() => {
        const userTx = parseEncodedUserTx(encodedUserTx);
        const payload = parsePayload(userTx);

        checkRequestType(payload, "create-thread");
        checkTxTimestamp(payload);

        const sender = userTx.sender_blockchain_address;
        checkSenderIsPM(sender);

        checkRequiredParam(payload, "name");

        const name = payload.name.trim();
        if (name.length <= 0) {
            throw {
                message: "Nom de thread invalide",
            };
        }

        const root = new GraphElement(
            MessagesGraphID,
            Blackhole.LoadGraph(MessagesGraphID)
        );

        const path = root.object.path + "/" + name;
        const nodeID = app.MD5(path);

        Blackhole.UpdateElement(MessagesGraphID, root.object.id, "children", name);
        Blackhole.UpdateElement(MessagesGraphID, nodeID, "type", "thread");
        Blackhole.UpdateElement(MessagesGraphID, nodeID, "thread-name", name);
        Blackhole.UpdateElement(
            MessagesGraphID,
            nodeID,
            "thread-authorized_users",
            sender + ";"
        );
        Blackhole.UpdateElement(MessagesGraphID, nodeID, "created_at", Date.now());

        return JSON.stringify({
            status: "ok",
            nodeID: nodeID,
            tx: Blackhole.Commit(),
        });
    });
}


function EditThread(encodedUserTx) {
    return safeErrorWrapper(() => {
        const userTx = parseEncodedUserTx(encodedUserTx);
        const payload = parsePayload(userTx);

        checkRequestType(payload, "edit-thread");
        checkTxTimestamp(payload);

        const sender = userTx.sender_blockchain_address;
        checkSenderIsPM(sender);

        // Vérification des params requis
        checkRequiredParam(payload, "thread");
        checkRequiredParam(payload, "newName");
        checkRequiredParam(payload, "authorized");

        const threadID = payload.thread;
        const newName = payload.newName.trim();
        const newUsers = payload.authorized.trim();

        const graph = new GraphElement(
            MessagesGraphID,
            Blackhole.LoadGraph(MessagesGraphID)
        );

        const thread = graph.findByID(threadID);
        if (!thread) {
            throw {
                message: "Thread introuvable",
                details: threadID,
            };
        }

        Blackhole.UpdateElement(MessagesGraphID, threadID, "thread-name", newName);
        Blackhole.UpdateElement(
            MessagesGraphID,
            threadID,
            "thread-authorized_users",
            newUsers
        );

        return JSON.stringify({
            status: "ok",
            tx: Blackhole.Commit(),
        });
    });
}


function DeleteThread(encodedUserTx) {
    return safeErrorWrapper(() => {
        const userTx = parseEncodedUserTx(encodedUserTx);
        const payload = parsePayload(userTx);

        checkRequestType(payload, "delete-thread");
        checkTxTimestamp(payload);

        const sender = userTx.sender_blockchain_address;
        checkSenderIsPM(sender); // petite fonction util que je te propose ci-dessous

        const threadID = payload.thread;
        if (!threadID) {
            throw {
                message: "Thread manquant",
            };
        }

        const graph = new GraphElement(
            MessagesGraphID,
            Blackhole.LoadGraph(MessagesGraphID)
        );

        const thread = graph.findByID(threadID);
        if (!thread) {
            throw {
                message: "Thread introuvable",
                details: threadID,
            };
        }

        Blackhole.DeleteElement(MessagesGraphID, threadID);

        return JSON.stringify({
            status: "ok",
            tx: Blackhole.Commit(),
        });
    });
}


function RegisterUser(encodedUserTx) {
    return safeErrorWrapper(() => {
        // Parsing de base
        const userTx = parseEncodedUserTx(encodedUserTx);
        const payload = parsePayload(userTx);

        // Vérifs communes
        checkRequestType(payload, "register-user");
        checkTxTimestamp(payload);

        const sender = userTx.sender_blockchain_address;
        const now = Date.now();

        const root = new GraphElement(
            PrivateGraphID,
            Blackhole.LoadGraph(PrivateGraphID)
        );

        // Check si user node existe
        if (root.hasNext(sender)) {
            const userNode = root.next(sender);

            // Check si "private" existe
            if (!userNode.hasNext("private")) {
                const privateNodeID = createPrivateNodeForUser(userNode, now);

                return {
                    status: "no_private_found",
                    userNodeID: userNode.id,
                    privateNodeID: privateNodeID,
                    tx: Blackhole.Commit()
                };
            } else {
                return {
                    status: "user_already_exists",
                    userNodeID: userNode.id,
                    privateNodeID: userNode.next("private").id
                };
            }
        }

        // Sinon, création complète du user node + private
        const userNodeID = createUserNode(root, sender, now);
        const privateNodeID = createPrivateNodeForUserID(userNodeID, sender, now);

        return {
            status: "ok",
            userNodeID: userNodeID,
            privateNodeID: privateNodeID,
            tx: Blackhole.Commit()
        };
    });
}

function GetGroupsForUser(encodedUserTx) {
    return safeErrorWrapper(() => {
        // Parsing de base
        const userTx = parseEncodedUserTx(encodedUserTx);
        const payload = parsePayload(userTx);

        // Vérifs communes
        checkRequestType(payload, "get-groups-for-user");
        checkTxTimestamp(payload);

        const sender = userTx.sender_blockchain_address;

        // Chargement du graphe Private
        const root = new GraphElement(
            PrivateGraphID,
            Blackhole.LoadGraph(PrivateGraphID)
        );

        // On vérifie que le noeud utilisateur existe
        if (!root.hasNext(sender)) {
            throw {
                message: "user_not_found",
                details: sender
            };
        }

        // On récupère le noeud utilisateur
        const userNode = root.next(sender);

        // On retourne l'objet brut du noeud utilisateur
        return {
            status: "ok",
            userNode: userNode.object
        };
    });
}


function checkSenderIsPM(sender) {
    if (sender !== ProjectManagerAddress) {
        throw {
            message: "Seul le PM peut effectuer cette opération",
        };
    }
}

function checkTxTimestamp(payload, toleranceMs = 5000) {
    const now = Date.now();
    if (Math.abs(now - payload.timestamp) > toleranceMs) {
        throw {
            message: "Timestamp invalide",
            details: { now, received: payload.timestamp },
        };
    }
}

function checkRequestType(payload, expectedType) {
    if (payload.requestType !== expectedType) {
        throw {
            message: "Type de requête invalide",
            details: { expected: expectedType, received: payload.requestType },
        };
    }
}

function parseEncodedUserTx(encodedUserTx) {
    let userTx;
    try {
        userTx = JSON.parse(atob(encodedUserTx));
    } catch (err) {
        throw {
            message: "Transaction illisible",
            details: err.message,
        };
    }

    if (!Singularity.IsValidTransaction(userTx)) {
        throw {
            message: "Transaction invalide",
        };
    }

    return userTx;
}

function parsePayload(userTx) {
    let payload;
    try {
        payload = JSON.parse(atob(userTx.data));
    } catch (err) {
        throw {
            message: "Payload illisible",
            details: err.message,
        };
    }

    return payload;
}

function safeErrorWrapper(func) {
    try {
        Wormhole.SetOutputFormat("application/json");
        return func();
    } catch (err) {
        return sendError(err.message || "Erreur inconnue", err.details || null);
    }
}

function createPrivateNodeForUser(userNode, now) {
    const privatePath = userNode.object.path + "/private";
    const privateNodeID = app.MD5(privatePath);

    Blackhole.UpdateElement(PrivateGraphID, userNode.id, "children", "private");
    Blackhole.UpdateElement(PrivateGraphID, privateNodeID, "type", "private-conversations-root");
    Blackhole.UpdateElement(PrivateGraphID, privateNodeID, "created_at", now);

    return privateNodeID;
}

function createUserNode(root, sender, now) {
    const userPath = root.object.path + "/" + sender;
    const userNodeID = app.MD5(userPath);

    Blackhole.UpdateElement(PrivateGraphID, root.object.id, "children", sender);
    Blackhole.UpdateElement(PrivateGraphID, userNodeID, "type", "user-private-root");
    Blackhole.UpdateElement(PrivateGraphID, userNodeID, "user-address", sender);
    Blackhole.UpdateElement(PrivateGraphID, userNodeID, "created_at", now);

    return userNodeID;
}

function createPrivateNodeForUserID(userNodeID, sender, now) {
    const privatePath = PrivateGraphID + "/" + sender + "/private";
    const privateNodeID = app.MD5(privatePath);

    Blackhole.UpdateElement(PrivateGraphID, userNodeID, "children", "private");
    Blackhole.UpdateElement(PrivateGraphID, privateNodeID, "type", "private-conversations-root");
    Blackhole.UpdateElement(PrivateGraphID, privateNodeID, "created_at", now);

    return privateNodeID;
}


function checkRequiredParam(payload, paramName) {
    if (!payload[paramName] || payload[paramName].toString().trim().length === 0) {
        throw {
            message: "Paramètre manquant ou vide",
            details: paramName,
        };
    }
}


function sendError(message, details = null) {
    return JSON.stringify({
        status: "error",
        message: message,
        details: details,
    });
}
function checkUserAuthorized(sender, authorizedString) {
    if (!authorizedString.includes(sender + ";") && sender !== ProjectManagerAddress) {
        throw {
            message: "Accès refusé",
            details: sender,
        };
    }
}