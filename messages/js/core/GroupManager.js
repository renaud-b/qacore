const GroupManager = {
    loadUserGroups: function () {
        MessageAPI.getGroupsForUser()
            .then((userNode) => {
                console.log("UserNode reçu:", userNode);
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
                    console.log("first children: ", children[0]);
                    NavigationManager.showGroupViewScreen(children[0], userNode.id);
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
        console.log("Chargement des groupes publics...");
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
                    const publicGroupsList = document.getElementById("public-groups-list");
                    publicGroupsList.innerHTML = "";
                    const children = graph.children() || [];
                    if (children.length === 0) {
                        publicGroupsList.innerHTML =
                            "<div class='text-center text-slate-400 mt-8'>Aucun groupe public trouvé.</div>";
                        return;
                    }
                    children.forEach((groupNode) => {
                        const groupGraphID = groupNode.object.graphID || groupNode.id;
                        const groupName = groupNode.object["group-name"] || "Groupe sans nom";
                        const li = document.createElement("li");
                        li.className =
                            "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600 flex justify-between items-center";
                        const spanName = document.createElement("span");
                        spanName.textContent = `💬 ${groupName}`;
                        const actionBtn = document.createElement("button");
                        const isJoined = joinedGroupIDs.has(groupGraphID);
                        GroupManager.updateGroupActionButton(
                            actionBtn,
                            isJoined,
                            groupNode.object,
                            userNode
                        );
                        li.appendChild(spanName);
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
                            img.className = `px-2 py-2 rounded-full cursor-pointer ${childName === selectedGroupName
                                ? "bg-gray-700 font-bold"
                                : "hover:bg-gray-600 bg-gray-900"
                            }`;
                            img.src = g.object["group-icon"] ?? "https://placehold.co/64";
                            img.addEventListener("click", () => {
                                NavigationManager.showGroupViewScreen(childNode.object, userNodeID);
                            });
                            groupsList.appendChild(img);
                            resolve();
                        });
                    } else {
                        console.log("creating item for " + childName);
                        const img = document.createElement("img");
                        img.className = `px-2 py-2 rounded-full cursor-pointer ${childName === selectedGroupName
                            ? "bg-gray-700 font-bold"
                            : "hover:bg-gray-600 bg-gray-900"
                        }`;
                        img.src = "/ipfs/QmbqDtwedDzHfsyNybrwSpKtBmH48pnvA1EEREES6WBF7n";
                        img.addEventListener("click", () => {
                            NavigationManager.showGroupViewScreen(childNode.object, userNodeID);
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
        const groupName = groupNode.name;
        if (groupName === "private") {
            document.getElementById("groupview-current-group-name").textContent =
                "🗝️ Messages Privés";
            const headerPrivateBtn = document.getElementById(
                "btn-start-private-conversation"
            );
            headerPrivateBtn.classList.remove("hidden");
            headerPrivateBtn.onclick = openStartConversationModal;
            const convs = groupNode.children || [];
            convs.forEach((convNode) => {
                Blackhole.getGraph(convNode.graphID).then((graph) => {
                    const li = document.createElement("li");
                    li.className =
                        "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600";
                    li.textContent = convertHtmlCodesToAccents(graph.object.graphName);
                    li.addEventListener("click", () => {
                        NavigationManager.showChatScreen()


                        localStorage.removeItem("selectedThread");
                        MessageAPI.privateMsgGraphID = convNode.graphID;
                        loadPrivateConversation(convNode.graphID, graph);
                    });
                    threadsList.appendChild(li);
                });
            });
        } else {
            document
                .getElementById("btn-start-private-conversation")
                .classList.add("hidden");
            Blackhole.getGraph(groupNode.graphID).then((graph) => {
                document.getElementById("groupview-current-group-name").textContent =
                    graph.object.graphName;
                const threads = graph.children() || [];
                console.log("current group owner: ", graph.object["group-owner"]);
                UIManager.isGroupOwner = graph.object["group-owner"] == userAddress;
                console.log("is group owner: ", UIManager.isGroupOwner);
                UIManager.currentGroupGraphID = groupNode.graphID;
                if (UIManager.isGroupOwner) {
                    const createThreadBtn = document.createElement("button");
                    createThreadBtn.className =
                        "block w-full mb-4 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold";
                    createThreadBtn.textContent = "➕ Nouveau thread";
                    createThreadBtn.addEventListener("click", () => {
                        document
                            .getElementById("modal-edit-channels-config")
                            .classList.remove("hidden");
                    });
                    threadsList.appendChild(createThreadBtn);
                }
                threads.forEach((threadNode) => {
                    const li = document.createElement("li");
                    li.className =
                        "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600";
                    li.textContent = `# ${threadNode.object["thread-name"]}`;
                    li.addEventListener("click", () => {
                        MessageAPI.privateMsgGraphID = undefined;
                        NavigationManager.showChatScreen()
                        UIManager.selectChannel(threadNode);
                    });
                    threadsList.appendChild(li);
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
                console.log(
                    "Tentative de quitter:",
                    groupNode["group-name"],
                    groupNode.graphID
                );
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
