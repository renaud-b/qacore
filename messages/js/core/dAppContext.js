const dAppContext = {
    userAddress: null,
    eventManager: null,
    messages: {},
    registerNewPublicThread: (groupID, threadID, messages) => {
        if(dAppContext.messages[threadID]){
            console.warn(`Thread ${threadID} already exists, overwriting.`);
        }
        dAppContext.messages[threadID] = {
            type: "public",
            groupID: groupID,
            threadID: threadID,
            messages: messages || [],
            lastMessage: null,
            lastMessageDate: null,
            unreadCount: 0
        }
    },
    loadPrivateThread: (threadID) => {
        return new Promise((resolve, reject) => {
            Blackhole.getGraph(threadID).then((graph) => {
                MessageAPI.getMessages(threadID).then((messages) => {
                    messages = messages.sort((a, b) => a.ts - b.ts)
                    dAppContext.messages[threadID] = {
                        type: "private",
                        threadID: threadID,
                        name: convertHtmlCodesToAccents(
                            graph.object.graphName
                        ),
                        graph: graph,
                        messages: messages || [],
                        lastMessage: null,
                        lastMessageDate: null,
                        unreadCount: 0
                    }
                    resolve(dAppContext.messages[threadID])
                }).catch(reject);
            })
        })
    }
}