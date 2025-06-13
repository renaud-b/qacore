const NavigationManager = {
    currentGroupNode: null,
    currentUserNodeID: null,
    showChatScreen: function () {
        document.getElementById("screen-groups").classList.add("translate-x-full");
        document.getElementById("screen-chat").classList.remove("translate-x-full");
        Blackhole.getGraph(UIManager.currentGroupGraphID).then((graph) => {
            const channelsNode = graph.children();
            const isOwner = graph.object["group-owner"];
            UIManager.showChannels(
                channelsNode,
                MessageAPI.userAddress,
                MessageAPI.isPM || isOwner == MessageAPI.userAddress
            );
        });
    },

    _refreshGroupViewScreen: function (transitionCallback) {
        MessageAPI.getGroupsForUser()
            .then((userNode) => {
                const children = userNode.children || [];
                if (children.length === 0) {
                    console.log("Aucun groupe trouvé → fallback écran groupes");
                    GroupManager.loadUserGroups();
                    if (typeof transitionCallback === "function") transitionCallback();
                    return;
                }

                // Cherche si le groupe courant existe encore
                let selectedGroupNode = null;
                if (NavigationManager.currentGroupNode) {
                    selectedGroupNode = children.find((child) => {
                        return (
                            child.graphID === NavigationManager.currentGroupNode.graphID
                        );
                    });
                }

                // Si le groupe n'existe plus, on prend le premier
                if (!selectedGroupNode) {
                    console.log("Groupe courant non trouvé, sélection du premier groupe.");
                    selectedGroupNode = children[0];
                } else {
                    console.log(
                        "Groupe courant toujours présent, on reste dessus:",
                        selectedGroupNode
                    );
                }

                // Met à jour l'état courant
                NavigationManager.currentGroupNode = selectedGroupNode;
                NavigationManager.currentUserNodeID = userNode.id;

                // Rafraîchit les groupes et les threads
                GroupManager.populateGroupViewGroupsList(
                    userNode.id,
                    selectedGroupNode.name
                );
                GroupManager.populateGroupViewThreadsList(selectedGroupNode);

                // Transitions écran
                if (typeof transitionCallback === "function") transitionCallback();
            })
            .catch((err) => {
                console.error("Erreur lors du refresh groupes:", err);
            });
    },


    showGroupViewScreenFromBack: function () {
        NavigationManager._refreshGroupViewScreen(() => {
            document
                .getElementById("screen-group-view")
                .classList.remove("translate-x-full");
            document
                .getElementById("screen-chat")
                .classList.add("translate-x-full");
            document
                .getElementById("screen-groups")
                .classList.add("translate-x-full");
        });
    },

    showGroupViewScreen: function (groupNode, userNodeID) {
        const selectedGroupName = groupNode.name;
        console.log("show group view: ", selectedGroupName);

        NavigationManager.currentGroupNode = groupNode;
        NavigationManager.currentUserNodeID = userNodeID;

        if (groupNode.graphID === undefined) {
            document.getElementById("groupview-current-group-name").textContent =
                selectedGroupName;
        }
        GroupManager.populateGroupViewGroupsList(userNodeID, selectedGroupName);
        GroupManager.populateGroupViewThreadsList(groupNode);
        document.getElementById("screen-groups").classList.add("translate-x-full");
        document
            .getElementById("screen-group-view")
            .classList.remove("translate-x-full");
        document.getElementById("screen-chat").classList.add("translate-x-full");
    },

    showGroupViewScreenFromPublicGroups: function () {
        NavigationManager._refreshGroupViewScreen(() => {
            document
                .getElementById("screen-public-groups")
                .classList.add("translate-x-full");
            document
                .getElementById("screen-group-view")
                .classList.remove("translate-x-full");
        });
    },


};