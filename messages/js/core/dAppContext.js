const dAppContext = {
    userAddress: null,
    eventManager: null,
    messages: {},
    receiveTx: (data) => {
        return new Promise((resolve, reject) => {
            Object.keys(dAppContext.messages).forEach((threadID) => {
                const entry = dAppContext.messages[threadID]
                if (entry.type == "private") {
                    if (data.includes("urn:pi:graph:action:" + threadID + ":")) {
                        Blackhole.getGraph(threadID).then((graph) => {
                            MessageAPI.privateMsgGraphID = threadID;
                            MessageAPI.getMessages(graph.object.id, threadID).then((messages) => {
                                messages = messages.sort((a, b) => a.ts - b.ts)
                                dAppContext.messages[threadID] = {
                                    ...entry,
                                    messages: messages || [],
                                    lastMessageDate: Date.now(),
                                    unreadCount: 0
                                }
                                resolve(dAppContext.messages[threadID])
                            }).catch(reject);
                        })
                    }
                } else {
                    if (data.includes("urn:pi:graph:action:" + entry.groupID + ":")) {
                        Blackhole.getGraph(entry.groupID).then((graph) => {
                            const channel = graph.findByID(threadID)
                            const newSum = MD5(JSON.stringify(channel.object))
                            if (newSum == entry.sum) {
                                return
                            }
                            MessageAPI.getMessages(channel.object.id)
                                .then((messages) => {
                                    messages = messages.sort((a, b) => a.ts - b.ts)
                                    let lastMessage = null
                                    if (messages.length > 0) {
                                        lastMessage = messages.reduce((latest, msg) => {
                                            return latest.ts >
                                            msg.ts
                                                ? latest
                                                : msg;
                                        });
                                    }

                                    dAppContext.messages[threadID] = {
                                        ...entry,
                                        name: convertHtmlCodesToAccents(
                                            channel.object["thread-name"]
                                        ),
                                        graph: channel,
                                        messages: messages || [],
                                        sum: newSum,
                                        lastMessage: lastMessage
                                    }
                                    resolve(dAppContext.messages[threadID])
                                })
                                .catch(reject);
                        })
                    }
                }
            })
        })
    },
    loadGroupThread: (groupID, threadNode) => {
        return new Promise((resolve, reject) => {
            const threadID = threadNode.object.id
            if (dAppContext.messages[threadID]) {
                resolve(dAppContext.messages[threadID])
                return
            }
            Blackhole.getGraph(groupID).then((graph) => {
                const channel = graph.findByID(threadID)
                MessageAPI.getMessages(channel.object.id)
                    .then((messages) => {
                        messages = messages.sort((a, b) => a.ts - b.ts)
                        let lastMessage = null
                        if (messages.length > 0) {
                            lastMessage = messages.reduce((latest, msg) => {
                                return latest.ts >
                                msg.ts
                                    ? latest
                                    : msg;
                            });
                        }

                        dAppContext.messages[threadID] = {
                            type: "group",
                            groupID: groupID,
                            threadID: threadID,
                            name: convertHtmlCodesToAccents(
                                channel.object["thread-name"]
                            ),
                            graph: channel,
                            messages: messages || [],
                            lastMessage: lastMessage,
                            sum: MD5(JSON.stringify(channel.object)),
                            unreadCount: 0
                        }
                        resolve(dAppContext.messages[threadID])
                    })
                    .catch(reject);
            });

        })
    },
    loadPrivateThread: (threadGraphID) => {
        return new Promise((resolve, reject) => {
            if (dAppContext.messages[threadGraphID]) {
                resolve(dAppContext.messages[threadGraphID])
                return
            }
            Blackhole.getGraph(threadGraphID).then((graph) => {
                MessageAPI.privateMsgGraphID = threadGraphID;
                MessageAPI.getMessages(graph.object.id, threadGraphID).then((messages) => {
                    messages = messages.sort((a, b) => a.ts - b.ts)
                    let lastMessage = null
                    if (messages.length > 0) {
                        lastMessage = messages.reduce((latest, msg) => {
                            return latest.ts >
                            msg.ts
                                ? latest
                                : msg;
                        });
                    }
                    dAppContext.messages[threadGraphID] = {
                        type: "private",
                        threadID: threadGraphID,
                        name: convertHtmlCodesToAccents(
                            graph.object.graphName
                        ),
                        graph: graph,
                        messages: messages || [],
                        lastMessage: lastMessage,
                        unreadCount: 0
                    }
                    resolve(dAppContext.messages[threadGraphID])
                }).catch(reject);
            })
        })
    }
}