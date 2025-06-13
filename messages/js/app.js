const MessagesGraphID = "84d09c9b-387b-4430-8e8f-23c4304b59b3";
const GroupGraphID = "048d5c2d-85b6-4d5a-a994-249f6032ec3a";
const UsersGraphID = "b0586e65-e103-4f36-b644-574254a113d7";
let userAddress = "";
let eventManager;


eventManager = new EventManager((data) => {
    userAddress = data.address;
    MessageAPI.configure(data.address, eventManager);
    MessageAPI.registerUser()
        .catch((reason) => {
            if (reason === MessageAPIErrors.USER_NOT_FOUND) {
                console.warn(
                    "Utilisateur pas trouvé dans PrivateGraph, tentative d'enregistrement."
                );
            } else if (
                reason !== MessageAPIErrors.API_ERROR &&
                reason !== MessageAPIErrors.UNKNOWN_ERROR
            ) {
                console.warn("RegisterUser status: " + reason);
            }
        })
        .finally(() => {
            GroupManager.loadUserGroups();
            new BlockchainObserver((tx) => {
                const currentThread = localStorage.getItem("selectedThread");
                const currentGroupID = UIManager.currentGroupGraphID;
                const isPrivateMsg = !currentThread && MessageAPI.privateMsgGraphID;
                const relevant =
                    tx.data.includes("urn:pi:graph:action:" + currentGroupID + ":") ||
                    (isPrivateMsg &&
                        tx.data.includes(
                            "urn:pi:graph:action:" + MessageAPI.privateMsgGraphID + ":"
                        ));
                if (!relevant) return;
                console.log("🔄 Refresh suite à TX détectée", tx);
                if (isPrivateMsg && MessageAPI.privateMsgGraphID) {
                    Blackhole.getGraph(MessageAPI.privateMsgGraphID)
                        .then((graph) => {
                            const messages = (graph.children() || [])
                                .map((child) => {
                                    return {
                                        author: child.object["msg-author"],
                                        text: child.object["msg-content"],
                                        ts: child.object["msg-timestamp"],
                                    };
                                })
                                .sort((a, b) => a.ts - b.ts);
                            const participants = graph.object["participants"] || "";
                            MessageAPI.loadUsers(participants).then((users) => {
                                console.log(
                                    "🔄 Refresh PRIVATE chat",
                                    messages.length,
                                    "messages"
                                );
                                UIManager.showMessages(messages, users, MessageAPI.userAddress);
                            });
                        })
                        .catch((err) => {
                            console.warn("Erreur refresh private conversation:", err);
                        });
                } else if (currentThread) {
                    console.log("start to refresh current group chat");
                    MessageAPI.getMessages(currentThread)
                        .then((messages) => {
                            Blackhole.getGraph(currentGroupID).then((graph) => {
                                const users = (graph.children() || [])
                                    .map((msg) => msg.object["msg-author"])
                                    .join(";");
                                MessageAPI.loadUsers(users).then((loadedUsers) => {
                                    console.log(
                                        "🔄 Refresh GROUP chat",
                                        messages.length,
                                        "messages"
                                    );
                                    UIManager.showMessages(
                                        messages,
                                        loadedUsers,
                                        MessageAPI.userAddress
                                    );
                                });
                            });
                        })
                        .catch((err) => {
                            console.warn("Erreur lors du rechargement des messages :", err);
                        });
                } else {
                    console.log(
                        "🔄 TX reçue mais aucun thread sélectionné, pas de refresh nécessaire."
                    );
                }
            }, 1000);
        });
});


document
    .getElementById("btn-back-to-group-view")
    .addEventListener("click", NavigationManager.showGroupViewScreenFromPublicGroups);


function openStartConversationModal() {
    console.log("Ouverture de la modal de contacts...");
    const contactsList = document.getElementById("contacts-list");
    contactsList.innerHTML =
        "<div class='text-center text-slate-400'>Chargement...</div>";
    Wormhole.getUserProfile(userAddress)
        .then((userProfileGraphRoot) => {
            if (!userProfileGraphRoot.hasNext("dapps")) {
                contactsList.innerHTML =
                    "<div class='text-center text-slate-400'>Aucun contact trouvé.</div>";
                return;
            }
            const dappsNode = userProfileGraphRoot.next("dapps");
            const contactsNode = dappsNode.next("contacts");
            if (!contactsNode) {
                contactsList.innerHTML =
                    "<div class='text-center text-slate-400'>Aucun contact trouvé.</div>";
                return;
            }
            const contactAddresses = (contactsNode.children() || []).map((node) => {
                return node.object.name;
            });
            if (contactAddresses.length === 0) {
                contactsList.innerHTML =
                    "<div class='text-center text-slate-400'>Aucun contact trouvé.</div>";
                return;
            }
            contactsList.innerHTML = "";
            contactAddresses.forEach((addr) => {
                const li = document.createElement("li");
                li.className =
                    "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600";
                li.textContent = addr;
                contactsList.appendChild(li);
                Wormhole.getUserProfile(addr).then((userProfile) => {
                    const userName = convertHtmlCodesToAccents(
                        userProfile.object.graphName
                    );
                    li.textContent = userName;
                    li.addEventListener("click", () => {
                        console.log("Contact sélectionné:", addr);
                        closeStartConversationModal();
                        startPrivateConversationWith(addr, userName);
                    });
                });
            });
        })
        .catch((err) => {
            console.error("Erreur lors du chargement des contacts:", err);
            contactsList.innerHTML =
                "<div class='text-center text-slate-400'>Erreur lors du chargement.</div>";
        });
    document
        .getElementById("modal-start-conversation")
        .classList.remove("hidden");
}
function closeStartConversationModal() {
    document.getElementById("modal-start-conversation").classList.add("hidden");
}
function startPrivateConversationWith(contactAddress, userName) {
    console.log("Démarrage conversation privée avec:", contactAddress);

    // 👉 On affiche un spinner global
    Utils.showGlobalLoading("Création de la conversation privée...");

    MessageAPI.createPrivateConversation([userAddress, contactAddress])
        .then((res) => {
            console.log("Conversation privée créée:", res);
            localStorage.removeItem("selectedThread");
            MessageAPI.privateMsgGraphID = res.privateGraphID;
            Blackhole.getGraph(res.privateGraphID).then((graph) => {
                loadPrivateConversation(res.privateGraphID, graph);
                NavigationManager.showChatScreen()
            })

        })
        .catch((err) => {
            console.error("Erreur création conversation privée:", err);
            alert("Erreur lors de la création de la conversation privée.");
        })
        .finally(() => {
            // On cache le spinner quoi qu'il arrive
            Utils.hideGlobalLoading();
        });
}
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
document.getElementById("send-btn").addEventListener("click", ChatManager.sendMessage);

document.getElementById("chat-input").addEventListener("keydown", function (e) {
    if (e.code === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        document.getElementById("send-btn").click();
    }
});
document.getElementById("config-channels").addEventListener("click", () => {
    document
        .getElementById("modal-edit-channels-config")
        .classList.remove("hidden");
});
document.getElementById("config-channel").addEventListener("click", () => {
    UIManager.editChannel(
        UIManager.selectedChannel.object.id,
        UIManager.selectedChannel.object["thread-name"],
        UIManager.selectedChannel.object["thread-authorized_users"]
    );
});
document.getElementById("btn-disconnect").addEventListener("click", () => {
    const event = { type: "disconnect" };
    new Promise((resolve, reject) => {
        try {
            eventManager.send(event, resolve);
        } catch (error) {
            reject(error);
        }
    })
        .then(() => {
            console.log("Déconnexion envoyée");
            document.getElementById("modal-profile").classList.add("hidden");
        })
        .catch((err) => {
            console.error("Erreur lors de la déconnexion :", err);
        });
});

document
    .getElementById("btn-back-to-groups")
    .addEventListener("click", NavigationManager.showGroupViewScreenFromBack);


function loadPrivateConversation(graphID, graph) {
    console.log("start to load private conversation");
    const convName = convertHtmlCodesToAccents(graph.object.graphName);
    UIManager.currentGroupGraphID = graphID;
    document.getElementById("channel-title").textContent = `🔒 ${convName}`;
    const messages = (graph.children() || [])
        .map((child) => {
            return {
                author: child.object["msg-author"],
                text: child.object["msg-content"],
                ts: child.object["msg-timestamp"],
            };
        })
        .sort((a, b) => a.ts - b.ts);
    console.log("messages loaded");
    const participants = graph.object["participants"] || "";
    console.log("participants: ", participants);
    MessageAPI.loadUsers(participants).then((users) => {
        console.log("user loaded");
        UIManager.showMessages(messages, users, MessageAPI.userAddress);
    });
}
document
    .getElementById("user-profile-btn")
    .addEventListener("click", function () {
        Wormhole.getUserProfile(userAddress).then((user) => {
            const profileModal = document.getElementById("modal-profile");
            const profileName = document.getElementById("profile-name");
            const profilePicture = document.getElementById("profile-picture");
            const profileDescription = document.getElementById("profile-description");
            document.getElementById("btn-disconnect").classList.remove("hidden");
            profileName.textContent = convertHtmlCodesToAccents(
                user.object.graphName
            );
            profilePicture.src = user.object["profilePictureURL"];
            profileDescription.textContent = convertHtmlCodesToAccents(
                user.object["description"]
            );
            const profileAddress = document.getElementById("profile-address");
            profileAddress.textContent = userAddress;
            const copyBtn = document.getElementById("btn-copy-address");
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(profileAddress.textContent).then(() => {
                    copyBtn.textContent = "✅ Copié !";
                    setTimeout(() => {
                        copyBtn.textContent = "📋 Copier";
                    }, 1500);
                });
            };
            profileModal.classList.remove("hidden");
        });
    });
