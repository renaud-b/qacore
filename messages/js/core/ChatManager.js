const ChatManager = {
    createThread: function () {
        console.log("current group graph id: ", UIManager.currentGroupGraphID);
        MessageAPI.createThread(UIManager.currentGroupGraphID);
    },
    sendMessage: function () {
        const input = document.getElementById("chat-input");
        const content = input.value.trim();
        console.log("current content: ", content);
        const currentThread = localStorage.getItem("selectedThread");
        if (!content) return;
        console.log("currentThread: ", currentThread);
        MessageAPI.postMessage(currentThread, content).then(() => {
            input.value = "";
            const currentUser = MessageAPI.getCurrentUser();
            const msgElement = UIManager._buildSelfMsg(
                {
                    text: FromUtf8ToB64(content),
                    author: MessageAPI.userAddress,
                    ts: Date.now(),
                },
                currentUser,
                true
            );
            const container = document.getElementById("message-list");
            container.appendChild(msgElement);
            container.scrollTop = container.scrollHeight;
        });
    },
};
