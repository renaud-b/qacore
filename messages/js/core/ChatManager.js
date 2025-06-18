const ChatManager = {
    createThread: function () {
        MessageAPI.createThread(UIManager.currentGroupGraphID);
    },
    sendMessage: function () {
        const input = document.getElementById("chat-input");
        const content = input.value.trim();
        const currentThread = localStorage.getItem("selectedThread");
        if (!content) return;
        const replyPreview = document.getElementById("reply-preview");
        const replyToMsgID =
            replyPreview && !replyPreview.classList.contains("hidden")
                ? replyPreview.getAttribute("data-msg-id")
                : null;
        console.log("Message à envoyer :", content);
        console.log("Réponse à :", replyToMsgID);
        MessageAPI.postMessage(currentThread, content, replyToMsgID).then(() => {
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
