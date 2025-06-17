const NavigationManager = {
    currentGroupNode: null,
    currentUserNodeID: null,
    showChatScreen: function () {
        window.currentView = "chat";
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
    showProfileScreen: function () {
        window.currentView = "profile";
        Wormhole.getUserProfile(userAddress).then((user) => {
            UIManager.showUserProfileScreen(user.object);
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
                let selectedGroupNode = null;
                if (NavigationManager.currentGroupNode) {
                    selectedGroupNode = children.find((child) => {
                        return child.graphID === NavigationManager.currentGroupNode.graphID;
                    });
                }
                if (!selectedGroupNode) {
                    console.log(
                        "Groupe courant non trouvé, sélection du premier groupe."
                    );
                    selectedGroupNode = children[0];
                } else {
                    console.log(
                        "Groupe courant toujours présent, on reste dessus:",
                        selectedGroupNode
                    );
                }
                NavigationManager.currentGroupNode = selectedGroupNode;
                NavigationManager.currentUserNodeID = userNode.id;
                GroupManager.populateGroupViewGroupsList(
                    userNode.id,
                    selectedGroupNode.name
                );
                GroupManager.populateGroupViewThreadsList(selectedGroupNode);
                if (typeof transitionCallback === "function") transitionCallback();
            })
            .catch((err) => {
                console.error("Erreur lors du refresh groupes:", err);
            });
    },
    showGroupViewScreenFromUserProfile: function () {
        window.currentView = "group";
        NavigationManager._refreshGroupViewScreen(() => {
            document.getElementById("screen-profile").classList.add("translate-x-full");
            document.getElementById("screen-group-view").classList.remove("translate-x-full");
        });
    },
    showGroupViewScreenFromBack: function () {
        window.currentView = "group";
        NavigationManager._refreshGroupViewScreen(() => {
            document
                .getElementById("screen-group-view")
                .classList.remove("translate-x-full");
            document.getElementById("screen-chat").classList.add("translate-x-full");
            document
                .getElementById("screen-groups")
                .classList.add("translate-x-full");
        });
    },
    showGroupViewScreen: function (groupNode, userNodeID) {
        window.currentView = "group";
        const selectedGroupName = groupNode.name;
        console.log("show group view: ", selectedGroupName);
        NavigationManager.currentGroupNode = groupNode;
        NavigationManager.currentUserNodeID = userNodeID;
        localStorage.setItem(
            "lastSelectedGroupGraphID",
            groupNode.graphID || groupNode.id
        );
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
        window.currentView = "group";
        NavigationManager._refreshGroupViewScreen(() => {
            document
                .getElementById("screen-public-groups")
                .classList.add("translate-x-full");
            document
                .getElementById("screen-group-view")
                .classList.remove("translate-x-full");
        });
    },
    showContactsScreen: function () {
        window.currentView = "contact";
        Wormhole.getUserProfile(userAddress).then((userProfileGraphRoot) => {
            const contactsListScreen = document.getElementById(
                "contacts-list-screen"
            );
            contactsListScreen.innerHTML =
                "<div class='text-slate-400'>Chargement...</div>";
            if (
                !userProfileGraphRoot.hasNext("dapps") ||
                !userProfileGraphRoot.next("dapps").hasNext("contacts")
            ) {
                contactsListScreen.innerHTML =
                    "<div class='text-slate-400'>Aucun contact.</div>";
                return;
            }
            const contactsNode = userProfileGraphRoot.next("dapps").next("contacts");
            const contactAddresses = (contactsNode.children() || []).map(
                (node) => node.object.name
            );
            contactsListScreen.innerHTML = "";
            contactAddresses.forEach((addr) => {
                const li = document.createElement("div");
                li.className =
                    "bg-gray-700 px-3 py-2 rounded flex items-center justify-between gap-4";
                Wormhole.getUserProfile(addr).then((userProfile) => {
                    const userName = convertHtmlCodesToAccents(
                        userProfile.object.graphName
                    );
                    let userIconURL = "https://placehold.co/64";
                    if (
                        userProfile.object.profilePictureURL &&
                        userProfile.object.profilePictureURL.length > 0
                    ) {
                        userIconURL = userProfile.object.profilePictureURL;
                    }
                    const leftPart = document.createElement("div");
                    leftPart.className = "flex items-center gap-3";
                    const userIcon = document.createElement("img");
                    userIcon.src = userIconURL;
                    userIcon.className =
                        "w-10 h-10 rounded-full object-cover cursor-pointer";
                    userIcon.addEventListener("click", () => {
                        UIManager.showUserProfileModal(userProfile.object);
                    });
                    const userNameElem = document.createElement("div");
                    userNameElem.className =
                        "font-bold text-white truncate cursor-pointer";
                    userNameElem.textContent = userName;
                    userNameElem.addEventListener("click", () => {
                        UIManager.showUserProfileModal(userProfile.object);
                    });
                    leftPart.appendChild(userIcon);
                    leftPart.appendChild(userNameElem);
                    const actionPart = document.createElement("div");
                    actionPart.className = "flex gap-2";
                    const triggerNewChat = () => {
                        const btnChat = document.createElement("button");
                        btnChat.className =
                            "bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm";
                        btnChat.textContent = "💬";
                        btnChat.addEventListener("click", () => {
                            PrivateConversationManager.startPrivateConversationWith(
                                addr,
                                userName
                            );
                        });
                        actionPart.appendChild(btnChat);
                    };
                    const deleteContact = () => {
                        const btnDelete = document.createElement("button");
                        btnDelete.className =
                            "bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm";
                        btnDelete.textContent = "❌";
                        btnDelete.addEventListener("click", () => {
                            alert("TODO: supprimer contact " + addr);
                        });
                        actionPart.appendChild(btnDelete);
                    };
                    li.appendChild(leftPart);
                    li.appendChild(actionPart);
                    contactsListScreen.appendChild(li);
                });
            });
        });
        document
            .getElementById("screen-group-view")
            .classList.add("translate-x-full");
        document
            .getElementById("screen-contacts")
            .classList.remove("translate-x-full");
    },
    showGroupViewScreenFromContacts: function () {
        window.currentView = "group";
        document
            .getElementById("screen-contacts")
            .classList.add("translate-x-full");
        document
            .getElementById("screen-group-view")
            .classList.remove("translate-x-full");
    },
};
