const GroupManager = {
    loadUserGroups: function () {
        MessageAPI.getGroupsForUser()
            .then((userNode) => {
                const children = userNode.children || [];
                if (children.length === 0) {
                    document
                        .getElementById("screen-groups")
                        .classList.remove("translate-x-full");
                    document
                        .getElementById("screen-group-view")
                        .classList.add("translate-x-full");
                    document
                        .getElementById("screen-chat")
                        .classList.add("translate-x-full");
                } else {
                    const lastGroupID = localStorage.getItem("lastSelectedGroupGraphID");
                    const selectedGroup = children.find((child) => {
                        return child.graphID === lastGroupID;
                    });
                    if (selectedGroup) {
                        NavigationManager.showGroupViewScreen(selectedGroup, userNode.id);
                    } else {
                        NavigationManager.showGroupViewScreen(children[0], userNode.id);
                    }
                }
            })
            .catch((reason) => {
                if (reason === MessageAPIErrors.USER_NOT_FOUND) {
                    console.warn("Utilisateur pas encore enregistré.");
                } else {
                    console.error("Erreur lors du chargement des groupes:", reason);
                }
            });
    },
    openSearchPublicGroupScreen: function () {
        window.currentView = "public-group";
        MessageAPI.getGroupsForUser()
            .then((userNode) => {
                const joinedGroupIDs = new Set();
                const children = userNode.children || [];
                children.forEach((childNode) => {
                    if (childNode.graphID) {
                        joinedGroupIDs.add(childNode.graphID);
                    }
                });
                return Blackhole.getGraph(GroupGraphID).then((graph) => {
                    const publicGroupsList =
                        document.getElementById("public-groups-list");
                    publicGroupsList.innerHTML = "";
                    const children = graph.children() || [];
                    if (children.length === 0) {
                        publicGroupsList.innerHTML =
                            "<div class='text-center text-slate-400 mt-8'>Aucun groupe public trouvé.</div>";
                        return;
                    }
                    children.forEach((groupNode) => {
                        const groupGraphID = groupNode.object.graphID || groupNode.id;
                        const groupName =
                            groupNode.object["group-name"] || "Groupe sans nom";
                        const groupDesc =
                            groupNode.object["group-description"] || "Aucune description.";
                        const groupIconURL =
                            groupNode.object["group-icon"] || "https://placehold.co/64";
                        const li = document.createElement("li");
                        li.className =
                            "w-full bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600 flex items-center justify-between gap-4";
                        const leftPart = document.createElement("div");
                        leftPart.className =
                            "flex items-center gap-3 flex-1 max-w-[calc(100%-120px)]";
                        const groupIcon = document.createElement("img");
                        groupIcon.src = groupIconURL;
                        Blackhole.getGraph(groupNode.object.graphID).then((g) => {
                            groupIcon.src = g.object["group-icon"];
                        });
                        groupIcon.className = "w-12 h-12 rounded-full object-cover";
                        const textBlock = document.createElement("div");
                        textBlock.className = "flex flex-col";
                        const nameElem = document.createElement("div");
                        nameElem.className = "font-bold text-white";
                        nameElem.textContent = groupName;
                        const descElem = document.createElement("div");
                        descElem.className = "text-sm text-gray-400 break-words pt-4";
                        descElem.textContent = groupDesc;
                        textBlock.appendChild(nameElem);
                        textBlock.appendChild(descElem);
                        leftPart.appendChild(groupIcon);
                        leftPart.appendChild(textBlock);
                        const actionBtn = document.createElement("button");
                        const isJoined = joinedGroupIDs.has(groupGraphID);
                        GroupManager.updateGroupActionButton(
                            actionBtn,
                            isJoined,
                            groupNode.object,
                            userNode
                        );
                        li.appendChild(leftPart);
                        li.appendChild(actionBtn);
                        publicGroupsList.appendChild(li);
                    });
                    document
                        .getElementById("screen-group-view")
                        .classList.add("translate-x-full");
                    document
                        .getElementById("screen-public-groups")
                        .classList.remove("translate-x-full");
                });
            })
            .catch((err) => {
                console.error("Erreur lors du chargement des groupes publics:", err);
            });
    },
    populateGroupViewGroupsList: function (userNodeID, selectedGroupName) {
        Blackhole.getGraph(UsersGraphID).then((graph) => {
            const userNode = graph.findByID(userNodeID);
            if (!userNode) return;
            const groupsList = document.getElementById("groupview-groups-list");
            groupsList.innerHTML = "";
            const children = userNode.children() || [];
            const promises = children.map((childNode) => {
                return new Promise((resolve, reject) => {
                    const childName = childNode.object.name;
                    if (childNode.object.graphID) {
                        Blackhole.getGraph(childNode.object.graphID).then((g) => {
                            const img = document.createElement("img");
                            img.className = `px-2 py-2 rounded-full cursor-pointer ${
                                childName === selectedGroupName
                                    ? "bg-gray-700 font-bold"
                                    : "hover:bg-gray-600 bg-gray-900"
                            }`;
                            img.src = g.object["group-icon"] ?? "https://placehold.co/64";
                            img.addEventListener("click", () => {
                                NavigationManager.showGroupViewScreen(
                                    childNode.object,
                                    userNodeID
                                );
                            });
                            groupsList.appendChild(img);
                            resolve();
                        });
                    } else {
                        const img = document.createElement("img");
                        img.className = `px-2 py-2 rounded-full cursor-pointer ${
                            childName === selectedGroupName
                                ? "bg-gray-700 font-bold"
                                : "hover:bg-gray-600 bg-gray-900"
                        }`;
                        img.src = "/ipfs/QmbqDtwedDzHfsyNybrwSpKtBmH48pnvA1EEREES6WBF7n";
                        img.addEventListener("click", () => {
                            NavigationManager.showGroupViewScreen(
                                childNode.object,
                                userNodeID
                            );
                        });
                        groupsList.appendChild(img);
                        resolve();
                    }
                });
            });
            Promise.all(promises).then(() => {
                const searchBtn = document.createElement("img");
                searchBtn.className =
                    "ml-2 px-2 py-2  rounded-full bg-blue-600 hover:bg-blue-700 cursor-pointer";
                searchBtn.style.width = "54px";
                searchBtn.style.height = "54px";
                searchBtn.src = "/ipfs/QmUREGqrasER6Sg4RsMMSE9Hy1mFskbB8rvpRbhuCnKWMZ";
                searchBtn.addEventListener("click", () => {
                    GroupManager.openSearchPublicGroupScreen();
                });
                groupsList.appendChild(searchBtn);
            });
        });
    },
    populateGroupViewThreadsList: function (groupNode) {
        const threadsList = document.getElementById("groupview-threads-list");
        threadsList.innerHTML = "";
        const headerButtonsContainer = document.getElementById(
            "groupview-header-buttons"
        );
        headerButtonsContainer.innerHTML = "";
        const groupName = groupNode.name;
        if (groupName === "private") {
            document.getElementById("groupview-current-group-name").textContent =
                "Messages Privés";
            const headerPrivateBtn = document.getElementById(
                "btn-start-private-conversation"
            );
            headerPrivateBtn.classList.remove("hidden");
            headerPrivateBtn.onclick =
                PrivateConversationManager.openStartConversationModal;
            const convs = groupNode.children || [];
            convs.forEach((convNode) => {
                if (dAppContext.messages[convNode.graphID]) {
                    const entry = dAppContext.messages[convNode.graphID];
                    const li = createThreadListItemFromCache(entry, convNode.graphID);
                    threadsList.appendChild(li);
                    return;
                }
                dAppContext.loadPrivateThread(convNode.graphID).then((convEntry) => {
                    const messages = convEntry.messages.sort((a, b) => a.ts - b.ts);
                    const li = document.createElement("li");
                    li.className =
                        "w-full bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600 flex flex-col gap-1";
                    const convTitle = document.createElement("div");
                    convTitle.className = "font-bold";
                    convTitle.textContent = convEntry.name;
                    let lastMessage = null;
                    if (messages.length > 0) {
                        lastMessage = messages.reduce((latest, msg) => {
                            return latest.ts > msg.ts ? latest : msg;
                        });
                    }
                    const lastMsgText = document.createElement("div");
                    lastMsgText.className =
                        "text-sm text-gray-400 truncate w-full overflow-hidden";
                    lastMsgText.style.wordBreak = "break-word";
                    lastMsgText.style.whiteSpace = "nowrap";
                    if (lastMessage) {
                        const content = FromB64ToUtf8(lastMessage.text || "");
                        const ts = formatTimestamp(lastMessage.ts);
                        lastMsgText.textContent = `[${ts}] ${content.substring(0, 50)}...`;
                    } else {
                        lastMsgText.textContent = "Aucun message.";
                    }
                    li.appendChild(convTitle);
                    li.appendChild(lastMsgText);
                    li.addEventListener("click", () => {
                        localStorage.removeItem("selectedThread");
                        MessageAPI.privateMsgGraphID = convNode.graphID;
                        const btn = document.getElementById("btn-toggle-notification");
                        btn.classList.remove("hidden");
                        NotificationManager.isNotificationActivated().then(
                            (isActivated) => {
                                console.log("is activated: ", isActivated);
                                if (isActivated) {
                                    btn.classList.remove("text-white");
                                    btn.classList.add("text-blue-400");
                                } else {
                                    btn.classList.add("text-white");
                                    btn.classList.remove("text-blue-400");
                                }
                            }
                        );
                        document.getElementById(
                            "channel-title"
                        ).innerHTML = `<span title="La conversation est chiffrée"><i class="fa-solid fa-lock-keyhole"></i></span> ${convEntry.name}`;
                        const participants = convEntry.graph.object["participants"] || "";
                        document.getElementById("config-channel").classList.add("hidden");
                        UIManager.currentGroupGraphID = convNode.graphID;
                        MessageAPI.loadUsers(participants).then((users) => {
                            UIManager.showMessages(messages, users, dAppContext.userAddress);
                            NavigationManager.showChatScreen();
                        });
                    });
                    threadsList.appendChild(li);
                });
            });
        } else {
            document
                .getElementById("btn-start-private-conversation")
                .classList.add("hidden");
            document
                .getElementById("btn-toggle-notification")
                .classList.add("hidden");
            Blackhole.getGraph(groupNode.graphID).then((graph) => {
                document.getElementById("groupview-current-group-name").textContent =
                    graph.object.graphName;
                const threads = graph.children() || [];
                UIManager.isGroupOwner = graph.object["group-owner"] == userAddress;
                UIManager.currentGroupGraphID = groupNode.graphID;
                if (UIManager.isGroupOwner) {
                    const createThreadBtn = document.createElement("button");
                    createThreadBtn.className =
                        "ml-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm";
                    createThreadBtn.innerHTML = '<i class="fas fa-plus"></i> Thread';
                    createThreadBtn.addEventListener("click", () => {
                        document
                            .getElementById("modal-edit-channels-config")
                            .classList.remove("hidden");
                    });
                    headerButtonsContainer.appendChild(createThreadBtn);
                }
                threads.forEach((threadNode) => {
                    dAppContext
                        .loadGroupThread(groupNode.graphID, threadNode)
                        .then((entry) => {
                            const li = document.createElement("li");
                            li.className =
                                "w-full bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600 flex flex-col gap-1";
                            const threadTitle = document.createElement("div");
                            threadTitle.className = "font-bold text-white truncate";
                            threadTitle.textContent = `# ${entry.name}`;
                            const messages = threadNode.children() || [];
                            const lastMsgText = document.createElement("div");
                            lastMsgText.className =
                                "text-sm text-gray-400 truncate w-full md:max-w-[300px]";
                            if (entry.lastMessage) {
                                const content = FromB64ToUtf8(entry.lastMessage.text || "");
                                const ts = formatTimestamp(entry.lastMessage.ts);
                                lastMsgText.textContent = `[${ts}] ${content.substring(
                                    0,
                                    50
                                )}...`;
                            } else {
                                lastMsgText.textContent = "Aucun message.";
                            }
                            li.appendChild(threadTitle);
                            li.appendChild(lastMsgText);
                            li.addEventListener("click", () => {
                                MessageAPI.privateMsgGraphID = undefined;
                                UIManager.selectChannel(threadNode).then(() => {
                                    NavigationManager.showChatScreen();
                                });
                            });
                            threadsList.appendChild(li);
                        });
                });
            });
        }
    },
    updateGroupActionButton: function (btn, isJoined, groupNode, userNode) {
        if (btn.isConnected) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            btn = newBtn;
        }
        if (isJoined) {
            btn.className =
                "bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm";
            btn.textContent = "Quitter";
            btn.addEventListener("click", () => {
                btn.disabled = true;
                btn.innerHTML = `
                <div class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Traitement...
            `;
                MessageAPI.leaveGroup(groupNode.graphID)
                    .then((res) => {
                        console.log("LeaveGroup OK:", res);
                        return Singularity.waitForTx(res.tx);
                    })
                    .then(() => {
                        console.log("Tx leave confirmée → refresh complet UI");
                        NavigationManager.showGroupViewScreenFromPublicGroups();
                    })
                    .catch((err) => {
                        console.error("Erreur LeaveGroup:", err);
                        btn.disabled = false;
                        btn.textContent = "Erreur";
                        setTimeout(() => {
                            updateGroupActionButton(btn, true, groupNode, userNode);
                        }, 2000);
                    });
            });
        } else {
            btn.className =
                "bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm";
            btn.textContent = "Rejoindre";
            btn.addEventListener("click", () => {
                console.log(
                    "Tentative de rejoindre:",
                    groupNode["group-name"],
                    groupNode.graphID
                );
                btn.disabled = true;
                btn.innerHTML = `
                <div class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Traitement...
            `;
                MessageAPI.joinGroup(groupNode.graphID)
                    .then((res) => {
                        console.log("JoinGroup OK:", res);
                        return Singularity.waitForTx(res.tx);
                    })
                    .then(() => {
                        console.log("Tx join confirmée → refresh complet UI");
                        NavigationManager.showGroupViewScreenFromPublicGroups();
                    })
                    .catch((err) => {
                        console.error("Erreur JoinGroup:", err);
                        btn.disabled = false;
                        btn.textContent = "Erreur";
                        setTimeout(() => {
                            updateGroupActionButton(btn, false, groupNode, userNode);
                        }, 2000);
                    });
            });
        }
    },
};
function createThreadListItemFromCache(entry, convID) {
    const li = document.createElement("li");
    li.className =
        "w-full bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600 flex flex-col gap-1";
    const convTitle = document.createElement("div");
    convTitle.className = "font-bold";
    convTitle.textContent = entry.name;
    const lastMsgText = document.createElement("div");
    lastMsgText.className = "text-sm text-gray-400 truncate w-full";
    const lastMsg = entry.lastMessage;
    if (lastMsg) {
        const content = FromB64ToUtf8(lastMsg.text || "");
        const ts = formatTimestamp(lastMsg.ts);
        lastMsgText.textContent = `[${ts}] ${content.substring(0, 50)}...`;
    } else {
        lastMsgText.textContent = "Aucun message.";
    }
    li.appendChild(convTitle);
    li.appendChild(lastMsgText);
    li.addEventListener("click", () => {
        localStorage.removeItem("selectedThread");
        MessageAPI.privateMsgGraphID = entry.threadID;
        UIManager.currentGroupGraphID = convID;
        NavigationManager.showChatScreen();
        PrivateConversationManager.loadPrivateConversationFromContext(
            entry.threadID
        );
    });
    return li;
}
