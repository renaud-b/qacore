const NotificationManager = {
    currentUserRoot: null,
    isNotificationActivated: () => {
        return new Promise((resolve, reject) => {
            Wormhole.getUserProfile(MessageAPI.userAddress)
                .then((userProfile) => {
                    NotificationManager.currentUserRoot = userProfile;
                    const convID = MessageAPI.privateMsgGraphID;
                    let hasNotifActivated = false;
                    if (userProfile.hasNext("dapps")) {
                        const dapps = userProfile.next("dapps");
                        if (dapps.hasNext("notifier")) {
                            const notificationNodeID = "notif_" + convID;
                            const notifier = dapps.next("notifier");
                            if (notifier.hasNext(notificationNodeID)) {
                                console.log(notifier);
                                hasNotifActivated = true;
                            }
                        }
                    }
                    console.log(userProfile);
                    resolve(hasNotifActivated);
                })
                .catch(() => {
                    resolve(false);
                });
        });
    },
    showModal: function () {
        Wormhole.getUserProfile(MessageAPI.userAddress).then((userProfile) => {
            NotificationManager.currentUserRoot = userProfile;
            const convID = MessageAPI.privateMsgGraphID;
            console.log("show modal for conv : ", convID);
            let hasNotifActivated = false;
            if (userProfile.hasNext("dapps")) {
                const dapps = userProfile.next("dapps");
                if (dapps.hasNext("notifier")) {
                    const notificationNodeID = "notif_" + convID;
                    const notifier = dapps.next("notifier");
                    if (notifier.hasNext(notificationNodeID)) {
                        hasNotifActivated = true;
                    }
                }
            }
            const notifToggle = document.getElementById("notif-toggle");
            if (hasNotifActivated) {
                notifToggle.checked = true;
            } else {
                notifToggle.checked = false;
            }
            document.getElementById("notif-modal-overlay").classList.remove("hidden");
        });
    },
    closeModal: function () {
        document.getElementById("notif-modal-overlay").classList.add("hidden");
    },
    updateNotificationState: function () {
        const graph = NotificationManager.currentUserRoot;
        if (!graph) {
            console.error("no user profile to update");
            return;
        }
        const isChecked = document.getElementById("notif-toggle").checked;
        const convID = MessageAPI.privateMsgGraphID;
        console.log("La case est cochée");
        const actions = NotificationManager._createNewNotificationFilter(
            MessageAPI.userAddress,
            graph,
            convID,
            isChecked
        );
        if (actions.length > 0) {
            console.log("actions: ", actions);
            const groupAction = Blackhole.Actions.makeGroup(
                graph.graphID,
                ...actions
            );
            MessageAPI.eventManager
                .sign(MessageAPI.userAddress, groupAction, 0)
                .then((signedTx) => {
                    const btn = document.getElementById("btn-toggle-notification");
                    if (isChecked) {
                        btn.classList.remove("text-white");
                        btn.classList.add("text-blue-400");
                    } else {
                        btn.classList.add("text-white");
                        btn.classList.remove("text-blue-400");
                    }
                    Singularity.saveSignedTx(signedTx).then((response) => {
                        console.log("response: ", response);
                        const txUUID = response.UUID;
                        Singularity.waitForTx(response.UUID).then(() => {});
                    });
                });
        } else {
            console.log("no actions found");
        }
        NotificationManager.closeModal();
    },
    _createNewNotificationFilter: (userAddress, graph, convID, isChecked) => {
        const actions = [];
        function createNotification(notifierPath, notificationNodeName) {
            const notifierID = MD5(notifierPath);
            actions.push(
                Blackhole.Actions.update(notifierID, "children", notificationNodeName)
            );
            const expectedPath = notifierPath + "/" + notificationNodeName;
            const filterActions = NotificationManager.createFilterActions(
                expectedPath,
                convID,
                userAddress
            );
            for (const lineID in filterActions) {
                actions.push(filterActions[lineID]);
            }
        }
        const notificationNodeName = "notif_" + convID;
        if (!graph.hasNext("dapps")) {
            actions.push(
                Blackhole.Actions.update(graph.object.id, "children", "dapps")
            );
            const expectedDappsPath = graph.object.path + "/dapps";
            actions.push(
                Blackhole.Actions.update(MD5(expectedDappsPath), "children", "notifier")
            );
            if (isChecked) {
                const notifierPath = expectedDappsPath + "/notifier";
                createNotification(notifierPath, notificationNodeName);
            }
        } else {
            const dapps = graph.next("dapps");
            if (!dapps.hasNext("notifier")) {
                actions.push(
                    Blackhole.Actions.update(dapps.object.id, "children", "notifier")
                );
                if (isChecked) {
                    const notifierPath = dapps.object.path + "/notifier";
                    createNotification(notifierPath, notificationNodeName);
                }
            } else {
                const notifier = dapps.next("notifier");
                if (notifier.hasNext(notificationNodeName) && !isChecked) {
                    const targetFilter = notifier.next(notificationNodeName);
                    actions.push(Blackhole.Actions.delete(targetFilter.object.id));
                } else if (!notifier.hasNext(notificationNodeName) && isChecked) {
                    createNotification(notifier.object.path, notificationNodeName);
                }
            }
        }
        return actions;
    },
    createFilterActions: (nodePath, convID, userAddress) => {
        const nodeID = MD5(nodePath);
        const actions = [];
        actions.push(Blackhole.Actions.update(nodeID, "type", "and"));
        actions.push(
            Blackhole.Actions.update(nodeID, "description", "New private message")
        );
        const convPrefixID = MD5(nodePath + "/conv_prefix");
        actions.push(Blackhole.Actions.update(nodeID, "children", "conv_prefix"));
        actions.push(Blackhole.Actions.update(convPrefixID, "type", "hasPrefix"));
        actions.push(Blackhole.Actions.update(convPrefixID, "tx-property", "data"));
        actions.push(
            Blackhole.Actions.update(
                convPrefixID,
                "expected-value",
                "urn:pi:graph:action:" + convID
            )
        );
        const notPath = nodePath + "/not";
        actions.push(Blackhole.Actions.update(nodeID, "children", "not"));
        const notID = MD5(notPath);
        actions.push(Blackhole.Actions.update(notID, "type", "not"));
        actions.push(
            Blackhole.Actions.update(notID, "children", "address_is_not_me")
        );
        const addressIsNotMeID = MD5(notPath + "/address_is_not_me");
        actions.push(Blackhole.Actions.update(addressIsNotMeID, "type", "equals"));
        actions.push(
            Blackhole.Actions.update(
                addressIsNotMeID,
                "tx-property",
                "sender_blockchain_address"
            )
        );
        actions.push(
            Blackhole.Actions.update(addressIsNotMeID, "expected-value", userAddress)
        );
        return actions;
    },
};
