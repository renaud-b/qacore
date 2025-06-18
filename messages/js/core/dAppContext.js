const dAppContext = {
    userAddress: null,
    eventManager: null,
    messages: {},
    receiveTx: (data) => {
        return new Promise((resolve, reject) => {
            Object.keys(dAppContext.messages).forEach((threadID) => {
                const entry = dAppContext.messages[threadID];
                if (entry.type == "private") {
                    if (data.includes("urn:pi:graph:action:" + threadID + ":")) {
                        Blackhole.getGraph(threadID).then((graph) => {
                            MessageAPI.privateMsgGraphID = threadID;
                            MessageAPI.getMessages(graph.object.id, threadID)
                                .then((messages) => {
                                    messages = messages.sort((a, b) => a.ts - b.ts);
                                    let lastMessage = null;
                                    if (messages.length > 0) {
                                        lastMessage = messages.reduce((latest, msg) => {
                                            return latest.ts > msg.ts ? latest : msg;
                                        });
                                    }
                                    dAppContext.messages[threadID] = {
                                        type: "private",
                                        threadID: threadID,
                                        name: convertHtmlCodesToAccents(graph.object.graphName),
                                        graph: graph,
                                        messages: messages || [],
                                        lastMessage: lastMessage,
                                        unreadCount: 0,
                                    };
                                    dAppContext.saveMessagesToCache();
                                    resolve(dAppContext.messages[threadID]);
                                })
                                .catch(reject);
                        });
                    }
                } else {
                    if (data.includes("urn:pi:graph:action:" + entry.groupID + ":")) {
                        Blackhole.getGraph(entry.groupID).then((graph) => {
                            const channel = graph.findByID(threadID);
                            const newSum = MD5(JSON.stringify(channel.object));
                            if (newSum == entry.sum) {
                                return;
                            }
                            MessageAPI.getMessages(channel.object.id)
                                .then((messages) => {
                                    messages = messages.sort((a, b) => a.ts - b.ts);
                                    let lastMessage = null;
                                    if (messages.length > 0) {
                                        lastMessage = messages.reduce((latest, msg) => {
                                            return latest.ts > msg.ts ? latest : msg;
                                        });
                                    }
                                    dAppContext.messages[threadID] = {
                                        type: "group",
                                        groupID: entry.groupID,
                                        threadID: threadID,
                                        name: convertHtmlCodesToAccents(
                                            channel.object["thread-name"]
                                        ),
                                        graph: channel,
                                        messages: messages || [],
                                        lastMessage: lastMessage,
                                        sum: newSum,
                                        unreadCount: 0,
                                    };
                                    dAppContext.saveMessagesToCache();
                                    resolve(dAppContext.messages[threadID]);
                                })
                                .catch(reject);
                        });
                    }
                }
            });
        });
    },
    saveMessagesToCache: () => {
        try {
            const raw = JSON.stringify(dAppContext.messages);
            localStorage.setItem("utopixia_cache_dappctx", raw);
        } catch (e) {
            console.warn("Échec de cache messages:", e);
        }
    },
    clearCache: () => {
        try {
            localStorage.removeItem("utopixia_cache_dappctx");
        } catch (e) {
            console.warn("Échec de clear cache messages:", e);
        }
    },
    preloadMessagesFromCache: () => {
        const raw = localStorage.getItem("utopixia_cache_dappctx");
        if (!raw) return;
        try {
            const cached = JSON.parse(raw);
            dAppContext.messages = cached;
            console.log(
                "✅ Préchargé depuis le cache local:",
                Object.keys(cached).length,
                "threads"
            );
        } catch (e) {
            console.warn("Échec parsing cache local:", e);
        }
    },
    loadGroupThread: (groupID, threadNode) => {
        return new Promise((resolve, reject) => {
            const threadID = threadNode.object.id;
            if (dAppContext.messages[threadID]) {
                resolve(dAppContext.messages[threadID]);
                return;
            }
            Blackhole.getGraph(groupID).then((graph) => {
                const channel = graph.findByID(threadID);
                MessageAPI.getMessages(channel.object.id)
                    .then((messages) => {
                        messages = messages.sort((a, b) => a.ts - b.ts);
                        let lastMessage = null;
                        if (messages.length > 0) {
                            lastMessage = messages.reduce((latest, msg) => {
                                return latest.ts > msg.ts ? latest : msg;
                            });
                        }
                        dAppContext.messages[threadID] = {
                            type: "group",
                            groupID: groupID,
                            threadID: threadID,
                            name: convertHtmlCodesToAccents(channel.object["thread-name"]),
                            graph: channel,
                            messages: messages || [],
                            lastMessage: lastMessage,
                            sum: MD5(JSON.stringify(channel.object)),
                            unreadCount: 0,
                        };
                        dAppContext.saveMessagesToCache();
                        resolve(dAppContext.messages[threadID]);
                    })
                    .catch(reject);
            });
        });
    },
    loadPrivateThread: (threadGraphID) => {
        return new Promise((resolve, reject) => {
            if (dAppContext.messages[threadGraphID]) {
                resolve(dAppContext.messages[threadGraphID]);
                return;
            }
            Blackhole.getGraph(threadGraphID).then((graph) => {
                MessageAPI.privateMsgGraphID = threadGraphID;
                MessageAPI.getMessages(graph.object.id, threadGraphID)
                    .then((messages) => {
                        messages = messages.sort((a, b) => a.ts - b.ts);
                        let lastMessage = null;
                        if (messages.length > 0) {
                            lastMessage = messages.reduce((latest, msg) => {
                                return latest.ts > msg.ts ? latest : msg;
                            });
                        }
                        dAppContext.messages[threadGraphID] = {
                            type: "private",
                            threadID: threadGraphID,
                            name: convertHtmlCodesToAccents(graph.object.graphName),
                            graph: graph,
                            messages: messages || [],
                            lastMessage: lastMessage,
                            unreadCount: 0,
                        };
                        dAppContext.saveMessagesToCache();
                        resolve(dAppContext.messages[threadGraphID]);
                    })
                    .catch(reject);
            });
        });
    },
};
