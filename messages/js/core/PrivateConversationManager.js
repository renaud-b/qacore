const PrivateConversationManager = {
    openStartConversationModal: function () {
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
                            PrivateConversationManager.closeStartConversationModal();
                            PrivateConversationManager.startPrivateConversationWith(
                                addr,
                                userName
                            );
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
    },
    closeStartConversationModal: function () {
        document.getElementById("modal-start-conversation").classList.add("hidden");
    },
    startPrivateConversationWith: function (contactAddress, userName) {
        console.log("Démarrage conversation privée avec:", contactAddress);
        Utils.showGlobalLoading("Création de la conversation privée...");
        MessageAPI.createPrivateConversation([userAddress, contactAddress])
            .then((res) => {
                console.log("Conversation privée créée:", res);
                localStorage.removeItem("selectedThread");
                MessageAPI.privateMsgGraphID = res.privateGraphID;
                Blackhole.getGraph(res.privateGraphID).then((graph) => {
                    PrivateConversationManager.loadPrivateConversation(
                        res.privateGraphID,
                        graph
                    );
                    NavigationManager.showChatScreen();
                });
            })
            .catch((err) => {
                console.error("Erreur création conversation privée:", err);
                alert("Erreur lors de la création de la conversation privée.");
            })
            .finally(() => {
                Utils.hideGlobalLoading();
            });
    },
    loadPrivateConversation: function (graphID, graph, showLoader = true) {
        return new Promise((resolve, reject) => {
            if(showLoader){
                Utils.showGlobalLoading("Déchiffrement des messages...");
            }

            console.log("start to load private conversation");
            const convName = convertHtmlCodesToAccents(graph.object.graphName);
            UIManager.currentGroupGraphID = graphID;
            document.getElementById(
                "channel-title"
            ).innerHTML = `<span title="La conversation est chiffrée"><i class="fa-solid fa-lock-keyhole"></i></span> ${convName}`;
            const participants = graph.object["participants"] || "";
            document.getElementById("config-channel").classList.add("hidden");
            MessageAPI.loadUsers(participants)
                .then((users) => {
                    MessageAPI.getMessages(graph.object.id).then((messages) => {
                        if(showLoader){
                            Utils.hideGlobalLoading();
                        }
                        resolve();
                        messages = messages.sort((a, b) => a.ts - b.ts)
                        dAppContext.registerNewPrivateThread(graphID, messages)
                        UIManager.showMessages(
                            messages,
                            users,
                            MessageAPI.userAddress
                        );
                    });
                })
                .catch(reject);
        });
    },
};
