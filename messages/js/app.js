const MessagesGraphID = "84d09c9b-387b-4430-8e8f-23c4304b59b3";
let userAddress = "";
let eventManager;

eventManager = new EventManager((data) => {
    userAddress = data.address;
    MessageAPI.configure(data.address, eventManager);

    UserProfile.isProjectManager(userAddress).then((isPM) => {
        if (isPM) {
            const btn = document.querySelectorAll(".admin-btn")
            btn.forEach((b) => {
                b.classList.remove("hidden");
            })
        }

        MessageAPI.isPM = isPM
        Blackhole.getGraph(MessagesGraphID).then((graph) => {
            const channelsNode = graph.children();
            UIManager.showChannels(channelsNode, userAddress, isPM);
            let selectedThreadID = localStorage.getItem("selectedThread")
            let selectedThread = channelsNode[0]

            if (selectedThreadID) {
                const selectedThreads = channelsNode.filter((n) => {
                    return n.object.id === selectedThreadID
                })
                if (selectedThreads && selectedThreads.length > 0) {
                    selectedThread = selectedThreads[0]
                }
            } else {
                localStorage.setItem("selectedThread", selectedThread.object.id);
            }

            UIManager.selectChannel(selectedThread);

            MessageAPI.loadUsers(selectedThread.object["thread-authorized_users"]).then(
                (users) => {
                    MessageAPI.getMessages(selectedThread.object.id).then((messages) => {
                        UIManager.showMessages(messages, users, data.address);
                        new BlockchainObserver((tx) => {
                            const currentThread = localStorage.getItem("selectedThread");
                            if (!currentThread) return;
                            const relevant = tx.data.includes(
                                "urn:pi:graph:action:" + MessagesGraphID + ":"
                            );
                            if (!relevant) return;
                            MessageAPI.getMessages(currentThread)
                                .then((messages) => {
                                    const container = document.getElementById("message-list");
                                    container.innerHTML = "";
                                    UIManager.showMessages(
                                        messages,
                                        MessageAPI.users,
                                        MessageAPI.userAddress
                                    );
                                })
                                .catch((err) => {
                                    console.warn("Erreur lors du rechargement des messages :", err);
                                });
                        }, 1000);
                    });
                }
            );
        });

    })


});
function addChannel() {
    const nameInput = document.getElementById("new-channel-name");
    const name = nameInput.value.trim();
    if (!name) return;
    const li = document.createElement("li");
    li.textContent = name.startsWith("#") ? name : "#" + name;
    li.className =
        "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600";
    document.getElementById("channel-list").appendChild(li);
    nameInput.value = "";
}

function toggleSidebar(forceOpen = null) {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    const isOpen = !sidebar.classList.contains("-translate-x-full");
    if (forceOpen === true || (!isOpen && forceOpen === null)) {
        sidebar.classList.remove("-translate-x-full");
        backdrop.classList.remove("hidden");
    } else {
        sidebar.classList.add("-translate-x-full");
        backdrop.classList.add("hidden");
    }
}

document.getElementById("toggle-sidebar").addEventListener("click", () => {
    toggleSidebar();
});

document.querySelector("button.bg-blue-600").addEventListener("click", () => {
    const input = document.getElementById("chat-input");
    const content = input.value.trim();
    console.log("current content: ", content)
    const currentThread = localStorage.getItem("selectedThread");
    if (!content || !currentThread) return;
    MessageAPI.postMessage(currentThread, content).then(() => {
        input.value = "";
        const currentUser = MessageAPI.getCurrentUser();
        const msgElement = UIManager._buildSelfMsg(
            { text: FromUtf8ToB64(content), author: MessageAPI.userAddress, ts: Date.now() },
            currentUser,
            true
        );
        const container = document.getElementById("message-list");
        container.appendChild(msgElement);
        container.scrollTop = container.scrollHeight;
    });
});

document.getElementById("chat-input").addEventListener("keydown", function (e) {
    if (e.code === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        document.querySelector("button.bg-blue-600").click();
    }
});

document.getElementById("config-channels").addEventListener("click", () => {
    document.getElementById("modal-edit-channels-config").classList.remove("hidden");
});

document.getElementById("config-channel").addEventListener("click", () => {
    UIManager.editChannel(UIManager.selectedChannel.object.id, UIManager.selectedChannel.object['thread-name'], UIManager.selectedChannel.object['thread-authorized_users'])
});