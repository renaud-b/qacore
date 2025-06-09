const MessagesGraphID = "84d09c9b-387b-4430-8e8f-23c4304b59b3";
const GroupGraphID = "048d5c2d-85b6-4d5a-a994-249f6032ec3a"
const UsersGraphID = "b0586e65-e103-4f36-b644-574254a113d7"

let userAddress = "";
let eventManager;
console.log("start to load app");
eventManager = new EventManager((data) => {
    userAddress = data.address;
    MessageAPI.configure(data.address, eventManager);

    // 1️⃣ Enregistrer user (au cas où)
    MessageAPI.registerUser()
        .catch((reason) => {
            if (reason === MessageAPIErrors.USER_NOT_FOUND) {
                console.warn("Utilisateur pas trouvé dans PrivateGraph, tentative d'enregistrement.");
                // Ici on pourrait forcer un registerUser(), mais notre implémentation le fait déjà
                // donc on ignore USER_NOT_FOUND ici
            } else if (reason !== MessageAPIErrors.API_ERROR && reason !== MessageAPIErrors.UNKNOWN_ERROR) {
                console.warn("RegisterUser status: " + reason);
            }
            // On continue de toute façon vers getGroupsForUser()
        })
        .finally(() => {
            // 2️⃣ Charger la liste des groupes
            loadUserGroups();
        });
});

document.getElementById("btn-back-to-group-view").addEventListener("click", () => {
    document.getElementById("screen-public-groups").classList.add("translate-x-full");
    document.getElementById("screen-group-view").classList.remove("translate-x-full");
});


// Fonction pour charger et afficher les groupes
function loadUserGroups() {
    MessageAPI.getGroupsForUser()
        .then((userNode) => {
            console.log("UserNode reçu:", userNode);

            const children = userNode.children || [];

            if (children.length === 0) {
                // Cas tout nouveau compte → on affiche screen-groups avec CTA
                document.getElementById("screen-groups").classList.remove("translate-x-full");
                document.getElementById("screen-group-view").classList.add("translate-x-full");
                document.getElementById("screen-chat").classList.add("translate-x-full");

                const groupsList = document.getElementById("groups-list");
                groupsList.innerHTML = "";

                const btn = document.createElement("button");
                btn.className = "block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-center mt-6";
                btn.textContent = "➕ Commencer une discussion";
                btn.addEventListener("click", openStartConversationModal);
                groupsList.appendChild(btn);
            } else {
                console.log("first children: ", children[0])
                // Cas normal → on passe directement sur screen-group-view
                showGroupViewScreen(children[0], userNode.id);
            }
        })
        .catch((reason) => {
            if (reason === MessageAPIErrors.USER_NOT_FOUND) {
                console.warn("Utilisateur pas encore enregistré.");
            } else {
                console.error("Erreur lors du chargement des groupes:", reason);
            }
        });
}

function openSearchPublicGroupScreen() {
    console.log("Chargement des groupes publics...");

    // On commence par charger les groupes du user pour savoir lesquels il a déjà
    MessageAPI.getGroupsForUser()
        .then((userNode) => {
            const joinedGroupIDs = new Set();

            const children = userNode.children || [];
            children.forEach((childNode) => {
                if (childNode.graphID) {
                    joinedGroupIDs.add(childNode.graphID);
                }
            });

            // Ensuite on charge les groupes publics
            return Blackhole.getGraph(GroupGraphID)
                .then((graph) => {
                    const publicGroupsList = document.getElementById("public-groups-list");
                    publicGroupsList.innerHTML = "";

                    const children = graph.children() || [];

                    if (children.length === 0) {
                        publicGroupsList.innerHTML = "<div class='text-center text-slate-400 mt-8'>Aucun groupe public trouvé.</div>";
                        return;
                    }

                    children.forEach((groupNode) => {
                        const groupGraphID = groupNode.object.graphID || groupNode.id;
                        const groupName = groupNode.object["group-name"] || "Groupe sans nom";

                        const li = document.createElement("li");
                        li.className = "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600 flex justify-between items-center";

                        const spanName = document.createElement("span");
                        spanName.textContent = `💬 ${groupName}`;

                        const actionBtn = document.createElement("button");

                        // Le user est-il déjà membre ?
                        const isJoined = joinedGroupIDs.has(groupGraphID);

                        updateGroupActionButton(actionBtn, isJoined, groupNode.object, userNode);

                        li.appendChild(spanName);
                        li.appendChild(actionBtn);

                        publicGroupsList.appendChild(li);
                    });

                    // On bascule vers l'écran public groups
                    document.getElementById("screen-group-view").classList.add("translate-x-full");
                    document.getElementById("screen-public-groups").classList.remove("translate-x-full");
                });
        })
        .catch((err) => {
            console.error("Erreur lors du chargement des groupes publics:", err);
        });
}

function bindJoin(btn, groupNode, userNode) {
    const groupGraphID = groupNode.graphID || groupNode.id;
    const groupName = groupNode["group-name"] || "Groupe sans nom";

    btn.className = "bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm";
    btn.textContent = "Rejoindre";

    btn.addEventListener("click", () => {
        console.log("Tentative de rejoindre:", groupName, groupGraphID);

        btn.disabled = true;
        btn.innerHTML = `
            <div class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Traitement...
        `;

        MessageAPI.joinGroup(groupGraphID)
            .then((res) => {
                console.log("JoinGroup OK:", res);
                return Singularity.waitForTx(res.tx);
            })
            .then(() => {
                console.log("Tx join confirmée → refresh complet UI");

                // Mettre bouton en Join
                btn.disabled = false;
                btn.className = "bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm";
                btn.textContent = "Quitter";

                showGroupViewScreen(groupNode, userNode.id)

            })
            .catch((err) => {
                console.error("Erreur JoinGroup:", err);
                btn.disabled = false;
                btn.className = "bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm";
                btn.textContent = "Erreur";
                setTimeout(() => {
                    btn.disabled = false;
                    btn.className = "bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm";
                    btn.textContent = "Rejoindre";
                }, 2000);
            });
    }, { once: true });
}

function bindLeave(btn, groupNode, userNode) {
    const groupGraphID = groupNode.graphID || groupNode.id;
    const groupName = groupNode["group-name"] || "Groupe sans nom";
    btn.className = "bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm";
    btn.textContent = "Quitter";

    btn.addEventListener("click", () => {
        console.log("Tentative de quitter:", groupName, groupGraphID);

        btn.disabled = true;
        btn.innerHTML = `
            <div class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Traitement...
        `;

        MessageAPI.leaveGroup(groupGraphID)
            .then((res) => {
                console.log("LeaveGroup OK:", res);
                return Singularity.waitForTx(res.tx);
            })
            .then(() => {
                console.log("Tx leave confirmée → refresh complet UI");

                // Bouton Leave
                btn.className = "bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm";
                btn.textContent = "Rejoindre";
                btn.disabled = false;

                showGroupViewScreen(groupNode, userNode.id)
            })
            .catch((err) => {
                console.error("Erreur LeaveGroup:", err);
                btn.disabled = false;
                btn.className = "bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm";
                btn.textContent = "Erreur";
                setTimeout(() => {
                    btn.disabled = false;
                    btn.className = "bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm";
                    btn.textContent = "Quitter";
                }, 2000);
            });
    }, { once: true });
}



function updateGroupActionButton(btn, isJoined, groupNode, userNode) {
    // Si le bouton est dans le DOM → safe replace
    if (btn.isConnected) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        btn = newBtn;
    }
    // Sinon (pas encore dans le DOM) → on ne clone pas, on configure directement

    if (isJoined) {
        btn.className = "bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm";
        btn.textContent = "Quitter";

        btn.addEventListener("click", () => {
            console.log("Tentative de quitter:", groupNode["group-name"], groupNode.graphID);

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


                    refreshGroupsAndShow(null, true); // on force le retour sur GroupView
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
        btn.className = "bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-sm";
        btn.textContent = "Rejoindre";

        btn.addEventListener("click", () => {
            console.log("Tentative de rejoindre:", groupNode["group-name"], groupNode.graphID);

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

                    refreshGroupsAndShow(groupNode.graphID, true); // on force le retour sur GroupView
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
}

function refreshGroupsAndShow(groupGraphIDToSelect = null, forceShowGroupView = false) {
    MessageAPI.getGroupsForUser()
        .then((userNode) => {
            console.log("Refresh groups après join/leave");

            const children = userNode.children || [];

            // Comportement conditionnel :
            if (forceShowGroupView) {
                document.getElementById("screen-group-view").classList.remove("translate-x-full");
                document.getElementById("screen-public-groups").classList.add("translate-x-full");
                document.getElementById("screen-chat").classList.add("translate-x-full");
            } else {
                document.getElementById("screen-groups").classList.remove("translate-x-full");
                document.getElementById("screen-group-view").classList.add("translate-x-full");
                document.getElementById("screen-chat").classList.add("translate-x-full");
            }

            const groupsList = document.getElementById("groups-list");
            groupsList.innerHTML = "";

            if (children.length === 0) {
                const btn = document.createElement("button");
                btn.className = "block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-center mt-6";
                btn.textContent = "➕ Commencer une discussion";
                btn.addEventListener("click", openStartConversationModal);
                groupsList.appendChild(btn);
                return;
            }

            children.forEach((childNode) => {
                const li = document.createElement("li");
                li.className = "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600";
                li.textContent = childNode.name === "private" ? "🗝️ Messages Privés" : "💬 " + childNode.name;

                li.addEventListener("click", () => {
                    showGroupViewScreen(childNode, userNode.id);
                });

                groupsList.appendChild(li);

                if (groupGraphIDToSelect && childNode.graphID === groupGraphIDToSelect) {
                    // Simule un clic
                    li.click();
                }
            });
        })
        .catch((reason) => {
            console.error("Erreur refreshGroupsAndShow:", reason);
        });
}




function openStartConversationModal() {
    console.log("Ouverture de la modal de contacts...");
    const contactsList = document.getElementById("contacts-list");
    contactsList.innerHTML = "<div class='text-center text-slate-400'>Chargement...</div>";

    Wormhole.getUserProfile(userAddress)
        .then((userProfileGraphRoot) => {
            const contactsNode = userProfileGraphRoot.next("contacts");
            if (!contactsNode) {
                contactsList.innerHTML = "<div class='text-center text-slate-400'>Aucun contact trouvé.</div>";
                return;
            }

            const contactAddresses = contactsNode.children() || [];
            if (contactAddresses.length === 0) {
                contactsList.innerHTML = "<div class='text-center text-slate-400'>Aucun contact trouvé.</div>";
                return;
            }

            contactsList.innerHTML = ""; // Clear loading

            contactAddresses.forEach((addr) => {
                const li = document.createElement("li");
                li.className = "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600";
                li.textContent = addr;

                li.addEventListener("click", () => {
                    console.log("Contact sélectionné:", addr);
                    closeStartConversationModal();

                    // Ici : on pourra trigger la création/init de la conversation privée → A FAIRE
                    startPrivateConversationWith(addr);
                });

                contactsList.appendChild(li);
            });
        })
        .catch((err) => {
            console.error("Erreur lors du chargement des contacts:", err);
            contactsList.innerHTML = "<div class='text-center text-slate-400'>Erreur lors du chargement.</div>";
        });

    document.getElementById("modal-start-conversation").classList.remove("hidden");
}

function closeStartConversationModal() {
    document.getElementById("modal-start-conversation").classList.add("hidden");
}

function startPrivateConversationWith(contactAddress) {
    console.log("TODO: démarrer conversation privée avec:", contactAddress);

    // TODO :
    // - vérifier si un noeud conversation existe déjà sous le "private"
    // - sinon le créer (via SC / contract)
    // - charger ce thread dans screen-chat

    // Pour l’instant, on se contente d’afficher dans le chat:
    showChatScreen();
    document.getElementById("channel-title").textContent = `🔒 Privé avec ${contactAddress}`;
    const container = document.getElementById("message-list");
    container.innerHTML = "<div class='text-center text-slate-400 mt-8'>Conversation privée (à implémenter)</div>";
}



function loadGroupThreads(groupName, userNodeID) {
    document.getElementById("channel-title").textContent = `# ${groupName}`;

    const container = document.getElementById("message-list");
    container.innerHTML = "";

    if (groupName === "private") {
        // Cas spécial : on charge les conversations privées du user

        Blackhole.getGraph(UsersGraphID)
            .then((graph) => {
                const userNode = graph.findByID(userNodeID);
                if (!userNode || !userNode.hasNext("private")) {
                    const info = document.createElement("div");
                    info.className = "text-center text-slate-400 mt-8";
                    info.textContent = "Aucune conversation privée disponible.";
                    container.appendChild(info);
                    return;
                }

                const privateNode = userNode.next("private");
                const privateChildren = privateNode.children() || [];

                if (privateChildren.length === 0) {
                    const info = document.createElement("div");
                    info.className = "text-center text-slate-400 mt-8";
                    info.textContent = "Aucune conversation privée disponible.";
                    container.appendChild(info);
                    return;
                }

                // Liste des conversations privées
                const list = document.createElement("ul");
                list.className = "p-4 space-y-2";

                privateChildren.forEach((convName) => {
                    const li = document.createElement("li");
                    li.className = "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600";
                    li.textContent = `🔒 ${convName}`;
                    li.dataset.convName = convName;

                    li.addEventListener("click", () => {
                        console.log("Conversation privée sélectionnée:", convName);
                        // Ici → charger la conversation privée correspondante
                        loadPrivateConversation(privateNode, convName);
                    });

                    list.appendChild(li);
                });

                container.appendChild(list);
            })
            .catch((err) => {
                console.error("Erreur lors du chargement des conversations privées:", err);
                const errorDiv = document.createElement("div");
                errorDiv.className = "text-center text-slate-400 mt-8";
                errorDiv.textContent = "Erreur lors du chargement.";
                container.appendChild(errorDiv);
            });
    } else {
        // Cas général : chargement d’un groupe normal
        // TODO → charger les threads liés au GroupGraphID pour ce groupe

        const info = document.createElement("div");
        info.className = "text-center text-slate-400 mt-8";
        info.textContent = `Chargement du groupe "${groupName}" (à implémenter).`;
        container.appendChild(info);
    }
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

document.querySelector("button.bg-blue-600").addEventListener("click", () => {
    const input = document.getElementById("chat-input");
    const content = input.value.trim();
    console.log("current content: ", content);
    const currentThread = localStorage.getItem("selectedThread");
    if (!content || !currentThread) return;
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
});
document.getElementById("chat-input").addEventListener("keydown", function (e) {
    if (e.code === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        document.querySelector("button.bg-blue-600").click();
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

function showGroupsScreen() {
    document.getElementById("screen-groups").classList.remove("translate-x-full");
    document.getElementById("screen-chat").classList.add("translate-x-full");
}

function showChatScreen() {
    document.getElementById("screen-groups").classList.add("translate-x-full");
    document.getElementById("screen-chat").classList.remove("translate-x-full");
}

// Exemple : brancher le bouton "← Groupes"
document.getElementById("btn-back-to-groups").addEventListener("click", showGroupsScreen);


function showGroupViewScreen(groupNode, userNodeID) {
    const selectedGroupName = groupNode.name;
    console.log("show group view: ", selectedGroupName)
    // MAJ du header
    if (groupNode.graphID === undefined) {
        document.getElementById("groupview-current-group-name").textContent = selectedGroupName;
    }


    // Met à jour la liste des groupes colonne gauche
    populateGroupViewGroupsList(userNodeID, selectedGroupName);

    // Met à jour la liste des threads du groupe sélectionné
    populateGroupViewThreadsList(groupNode);

    // Bascule vers l'écran
    document.getElementById("screen-groups").classList.add("translate-x-full");
    document.getElementById("screen-group-view").classList.remove("translate-x-full");
    document.getElementById("screen-chat").classList.add("translate-x-full");
}


function populateGroupViewGroupsList(userNodeID, selectedGroupName) {
    Blackhole.getGraph(UsersGraphID)
        .then((graph) => {
            const userNode = graph.findByID(userNodeID);
            if (!userNode) return;

            const groupsList = document.getElementById("groupview-groups-list");
            groupsList.innerHTML = "";

            const children = userNode.children() || [];
            children.forEach((childNode) => {
                const childName = childNode.object.name;
                const li = document.createElement("li");
                li.className = `px-3 py-2 rounded cursor-pointer ${childName === selectedGroupName ? 'bg-gray-700 font-bold' : 'hover:bg-gray-600 bg-gray-800'}`;
                li.textContent = childName === "private" ? "🗝️ Messages Privés" : "💬 " + childName;
                li.addEventListener("click", () => {
                    showGroupViewScreen(childNode.object, userNodeID);
                });
                groupsList.appendChild(li);
                if (childNode.object.graphID !== undefined) {
                    Blackhole.getGraph(childNode.object.graphID).then((g) => {
                        li.textContent = convertAccentsToHtmlCodes(g.object.graphName || "Nouveau groupe")
                    })

                }
            });

            // ➕ Ajout du bouton "Chercher un groupe"
            const searchBtn = document.createElement("button");
            searchBtn.className = "block w-full mt-4 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold";
            searchBtn.textContent = "🔍 Chercher un groupe";
            searchBtn.addEventListener("click", () => {
                openSearchPublicGroupScreen();
            });
            groupsList.appendChild(searchBtn);
        });
}


function populateGroupViewThreadsList(groupNode) {
    const threadsList = document.getElementById("groupview-threads-list");
    threadsList.innerHTML = "";


    const groupName = groupNode.name

    if (groupName === "private") {
        // Charger les conv privées
        Blackhole.getGraph(UsersGraphID)
            .then((graph) => {
                const userNode = graph.findByID(userAddress);
                if (!userNode || !userNode.hasNext("private")) return;

                const privateNode = userNode.next("private");
                const convs = privateNode.children() || [];

                const btnLi = document.createElement("li");
                btnLi.className = "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600";

                console.log("add new conversation window")
                // ➕ Ajouter bouton "Nouvelle conversation"
                const newConvBtn = document.createElement("button");
                newConvBtn.className = "block w-full mb-4 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold";
                newConvBtn.textContent = "➕ Nouvelle conversation privée";
                newConvBtn.addEventListener("click", () => {
                    openStartConversationModal();
                });
                btnLi.appendChild(newConvBtn);
                threadsList.appendChild(btnLi);



                convs.forEach((convName) => {
                    const li = document.createElement("li");
                    li.className = "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600";
                    li.textContent = `🔒 ${convName}`;
                    li.addEventListener("click", () => {
                        showChatScreen();
                        loadPrivateConversation(privateNode, convName);
                    });
                    threadsList.appendChild(li);
                });
            });
    } else {
        Blackhole.getGraph(groupNode.graphID).then((graph) => {
            document.getElementById("groupview-current-group-name").textContent = graph.object.graphName;
            const threads = graph.children() || [];

            console.log("current group owner: ", graph.object["group-owner"])
            UIManager.isGroupOwner = graph.object["group-owner"] == userAddress
            console.log("is group owner: ", UIManager.isGroupOwner)
            UIManager.currentGroupGraphID = groupNode.graphID;

            if (UIManager.isGroupOwner) {
                const createThreadBtn = document.createElement("button");
                createThreadBtn.className = "block w-full mb-4 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold";
                createThreadBtn.textContent = "➕ Nouveau thread";
                createThreadBtn.addEventListener("click", () => {
                    document.getElementById("modal-edit-channels-config").classList.remove("hidden");
                });
                threadsList.appendChild(createThreadBtn);
            }

            threads.forEach((threadNode) => {
                const li = document.createElement("li");
                li.className = "bg-gray-700 px-3 py-2 rounded cursor-pointer hover:bg-gray-600";
                li.textContent = `# ${threadNode.object["thread-name"]}`;

                li.addEventListener("click", () => {
                    showChatScreen();
                    // Charger ce thread dans le chat
                    UIManager.selectChannel(threadNode);
                });

                threadsList.appendChild(li);
            });
        });
    }
}


function createThread() {
    console.log("current group graph id: ", UIManager.currentGroupGraphID)
    MessageAPI.createThread(UIManager.currentGroupGraphID)
}