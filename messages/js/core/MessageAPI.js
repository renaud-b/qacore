const MessageAPIErrors = {
    TX_INVALID: "TX_INVALID",
    USER_NOT_FOUND: "USER_NOT_FOUND",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
    API_ERROR: "API_ERROR",
};
const MessageAPI = {
    scriptID: "a3d7bd5d-8eb0-4c7c-93bb-f0b3eabe56bb",
    userAddress: null,
    eventManager: null,
    createPrivateConversation: function (participants) {
        return new Promise((resolve, reject) => {
            if (
                !MessageAPI.scriptID ||
                !MessageAPI.userAddress ||
                !MessageAPI.eventManager
            ) {
                reject(MessageAPIErrors.TX_INVALID);
                return;
            }
            const payload = {
                requestType: "create-private-conversation",
                participants: participants,
                timestamp: Date.now(),
            };
            const encodedPayload = btoa(JSON.stringify(payload));
            MessageAPI.eventManager
                .sign(MessageAPI.userAddress, encodedPayload, 0)
                .then((signedTx) => {
                    const encodedUserTx = btoa(JSON.stringify(signedTx));
                    return Wormhole.executeContract(
                        MessageAPI.scriptID,
                        "CreatePrivateConversation",
                        { encodedUserTx },
                        "https://utopixia.com"
                    );
                })
                .then((response) => {
                    if (response.status === "ok") {
                        console.log(
                            "CreatePrivateConversation: conversation créée, attente du commit de la tx : ",
                            response.tx
                        );
                        Singularity.waitForTx(response.tx)
                            .then(() => {
                                console.log("CreatePrivateConversation: conversation prête.");
                                resolve(response);
                            })
                            .catch((err) => {
                                console.error(
                                    "Erreur lors de waitForTx CreatePrivateConversation:",
                                    err
                                );
                                reject(MessageAPIErrors.UNKNOWN_ERROR);
                            });
                    } else {
                        console.error("Erreur CreatePrivateConversation:", response);
                        reject(MessageAPIErrors.API_ERROR);
                    }
                })
                .catch((err) => {
                    console.error("Erreur MessageAPI.createPrivateConversation:", err);
                    reject(MessageAPIErrors.UNKNOWN_ERROR);
                });
        });
    },
    registerUser: function () {
        return new Promise((resolve, reject) => {
            if (
                !MessageAPI.scriptID ||
                !MessageAPI.userAddress ||
                !MessageAPI.eventManager
            ) {
                reject(MessageAPIErrors.TX_INVALID);
                return;
            }
            const payload = { requestType: "register-user", timestamp: Date.now() };
            const encodedPayload = btoa(JSON.stringify(payload));
            MessageAPI.eventManager
                .sign(MessageAPI.userAddress, encodedPayload, 0)
                .then((signedTx) => {
                    const encodedUserTx = btoa(JSON.stringify(signedTx));
                    return Wormhole.executeContract(
                        MessageAPI.scriptID,
                        "RegisterUser",
                        { encodedUserTx },
                        "https://utopixia.com"
                    );
                })
                .then((response) => {
                    if (response.status === "ok") {
                        console.log(
                            "RegisterUser: création de private en cours, attente du commit..."
                        );
                        Singularity.waitForTx(response.tx)
                            .then(() => {
                                console.log("RegisterUser: private prêt.");
                                resolve(response);
                            })
                            .catch((err) => {
                                console.error("Erreur lors de waitForTx RegisterUser:", err);
                                reject(MessageAPIErrors.UNKNOWN_ERROR);
                            });
                    } else if (response.status === "user_already_exists") {
                        resolve(response);
                    } else if (response.status === "no_private_found") {
                        console.log(
                            "RegisterUser: création de private en cours, attente du commit..."
                        );
                        Singularity.waitForTx(response.tx)
                            .then(() => {
                                console.log("RegisterUser: private prêt.");
                                resolve(response);
                            })
                            .catch((err) => {
                                console.error("Erreur lors de waitForTx RegisterUser:", err);
                                reject(MessageAPIErrors.UNKNOWN_ERROR);
                            });
                    } else {
                        reject(MessageAPIErrors.API_ERROR);
                    }
                })
                .catch((err) => {
                    console.error("Erreur MessageAPI.registerUser:", err);
                    reject(MessageAPIErrors.UNKNOWN_ERROR);
                });
        });
    },
    joinGroup: function (groupGraphID) {
        return new Promise((resolve, reject) => {
            if (
                !MessageAPI.scriptID ||
                !MessageAPI.userAddress ||
                !MessageAPI.eventManager
            ) {
                reject("Configuration incomplète");
                return;
            }
            const payload = {
                requestType: "join-group",
                groupGraphID: groupGraphID,
                timestamp: Date.now(),
            };
            const encodedPayload = btoa(JSON.stringify(payload));
            MessageAPI.eventManager
                .sign(MessageAPI.userAddress, encodedPayload, 0)
                .then((signedTx) => {
                    const encodedUserTx = btoa(JSON.stringify(signedTx));
                    return Wormhole.executeContract(
                        MessageAPI.scriptID,
                        "JoinGroup",
                        { encodedUserTx },
                        "https://utopixia.com"
                    );
                })
                .then((response) => {
                    if (
                        response.status !== "ok" &&
                        response.status !== "already_joined"
                    ) {
                        reject(response.message || "Erreur inconnue");
                    } else {
                        resolve(response);
                    }
                })
                .catch((err) => {
                    console.error("Erreur MessageAPI.joinGroup:", err);
                    reject(err);
                });
        });
    },
    leaveGroup: function (groupGraphID) {
        return new Promise((resolve, reject) => {
            if (
                !MessageAPI.scriptID ||
                !MessageAPI.userAddress ||
                !MessageAPI.eventManager
            ) {
                reject("Configuration incomplète");
                return;
            }
            const payload = {
                requestType: "leave-group",
                groupGraphID: groupGraphID,
                timestamp: Date.now(),
            };
            const encodedPayload = btoa(JSON.stringify(payload));
            MessageAPI.eventManager
                .sign(MessageAPI.userAddress, encodedPayload, 0)
                .then((signedTx) => {
                    const encodedUserTx = btoa(JSON.stringify(signedTx));
                    return Wormhole.executeContract(
                        MessageAPI.scriptID,
                        "LeaveGroup",
                        { encodedUserTx },
                        "https://utopixia.com"
                    );
                })
                .then((response) => {
                    if (response.status !== "ok" && response.status !== "not_joined") {
                        reject(response.message || "Erreur inconnue");
                    } else {
                        resolve(response);
                    }
                })
                .catch((err) => {
                    console.error("Erreur MessageAPI.leaveGroup:", err);
                    reject(err);
                });
        });
    },
    getGroupsForUser: function () {
        return new Promise((resolve, reject) => {
            if (
                !MessageAPI.scriptID ||
                !MessageAPI.userAddress ||
                !MessageAPI.eventManager
            ) {
                reject(MessageAPIErrors.TX_INVALID);
                return;
            }
            const payload = {
                requestType: "get-groups-for-user",
                timestamp: Date.now(),
            };
            const encodedPayload = btoa(JSON.stringify(payload));
            MessageAPI.eventManager
                .sign(MessageAPI.userAddress, encodedPayload, 0)
                .then((signedTx) => {
                    const encodedUserTx = btoa(JSON.stringify(signedTx));
                    return Wormhole.executeContract(
                        MessageAPI.scriptID,
                        "GetGroupsForUser",
                        { encodedUserTx }
                    );
                })
                .then((response) => {
                    if (response.status !== "ok") {
                        if (response.message === "user_not_found") {
                            reject(MessageAPIErrors.USER_NOT_FOUND);
                        } else {
                            reject(MessageAPIErrors.API_ERROR);
                        }
                    } else {
                        resolve(response.userNode);
                    }
                })
                .catch((err) => {
                    console.error("Erreur MessageAPI.getGroupsForUser:", err);
                    reject(MessageAPIErrors.UNKNOWN_ERROR);
                });
        });
    },
    getMessages: function (
        threadID,
        groupGraphID = UIManager.currentGroupGraphID
    ) {
        return new Promise((resolve, reject) => {
            if (
                !MessageAPI.scriptID ||
                !MessageAPI.userAddress ||
                !MessageAPI.eventManager
            ) {
                reject("Configuration incomplète");
                return;
            }
            const payload = {
                requestType: "get-messages",
                thread: threadID,
                groupGraphID: groupGraphID,
                timestamp: Date.now(),
            };
            const encodedPayload = btoa(JSON.stringify(payload));
            MessageAPI.eventManager
                .sign(MessageAPI.userAddress, encodedPayload, 0)
                .then((signedTx) => {
                    const encodedUserTx = btoa(JSON.stringify(signedTx));
                    return Wormhole.executeContract(
                        MessageAPI.scriptID,
                        "GetMessagesForThread",
                        { encodedUserTx },
                        "https://utopixia.com"
                    );
                })
                .then((response) => {
                    if (response.status !== "ok") {
                        reject(response.message || "Erreur inconnue");
                    } else {
                        if (response.messages.length == 0) {
                            resolve([]);
                        } else {
                            const users = (response.messages || [])
                                .map((msg) => {
                                    return msg.author;
                                })
                                .join(";");
                            MessageAPI.loadUsers(users).then((e) => {
                                resolve(response.messages || []);
                            });
                        }
                    }
                })
                .catch((err) => {
                    console.error("Erreur MessageAPI.getMessages:", err);
                    reject(err);
                });
        });
    },
    postMessage: function (threadID, content, respondTo = null) {
        return new Promise((resolve, reject) => {
            if (
                !MessageAPI.scriptID ||
                !MessageAPI.userAddress ||
                !MessageAPI.eventManager
            ) {
                reject("Configuration incomplète");
                return;
            }
            const payload = {
                requestType: "post-message",
                thread: threadID,
                groupGraphID: UIManager.currentGroupGraphID,
                content: FromUtf8ToB64(content),
                timestamp: Date.now(),
            };
            if (respondTo !== null) {
                payload["respond-to"] = respondTo;
            }
            const encodedPayload = btoa(JSON.stringify(payload));
            MessageAPI.eventManager
                .sign(MessageAPI.userAddress, encodedPayload, 0)
                .then((signedTx) => {
                    const encodedUserTx = btoa(JSON.stringify(signedTx));
                    return Wormhole.executeContract(
                        MessageAPI.scriptID,
                        "PostMessage",
                        { encodedUserTx: encodedUserTx },
                        "https://utopixia.com"
                    );
                })
                .then((response) => {
                    UIManager.clearReplyPreview();
                    if (response.status !== "ok") {
                        reject(response.message || "Erreur inconnue");
                    } else {
                        resolve(response);
                    }
                })
                .catch((err) => {
                    console.error("Erreur MessageAPI.postMessage:", err);
                    reject(err);
                });
        });
    },
    users: {},
    getCurrentUser: function () {
        const selectedUser = Object.keys(MessageAPI.users)
            .filter((userAddr) => {
                return userAddr === MessageAPI.userAddress;
            })
            .map((userAddr) => {
                return MessageAPI.users[userAddr];
            });
        if (!selectedUser || selectedUser.length == 0) {
            return null;
        }
        return selectedUser[0];
    },
    createThread: function (groupGraphID) {
        const input = document.getElementById("new-channel-name");
        const rawName = input.value.trim().replace(/^#/, "");
        if (!rawName) return;
        const payload = {
            requestType: "create-thread",
            name: rawName,
            groupGraphID: groupGraphID,
            timestamp: Date.now(),
        };
        const encodedPayload = btoa(JSON.stringify(payload));
        MessageAPI.eventManager
            .sign(MessageAPI.userAddress, encodedPayload, 0)
            .then((signedTx) => {
                const encodedUserTx = btoa(JSON.stringify(signedTx));
                Wormhole.executeContract(
                    "a3d7bd5d-8eb0-4c7c-93bb-f0b3eabe56bb",
                    "CreateThread",
                    { encodedUserTx: encodedUserTx },
                    "https://utopixia.com"
                ).then((res) => {
                    if (res.status === "ok") {
                        const btn = document.getElementById("create-thread-btn");
                        const spinner = btn.querySelector(".spinner");
                        const label = btn.querySelector("span");
                        btn.disabled = true;
                        spinner.classList.remove("hidden");
                        label.textContent = "Ajout...";
                        function resetSaveButton() {
                            btn.disabled = false;
                            spinner.classList.add("hidden");
                            label.textContent = "Ajouter";
                        }
                        input.value = "";
                        Singularity.waitForTx(res.tx[0]).then((e) => {
                            Blackhole.getGraph(MessagesGraphID)
                                .then((graph) => {
                                    document
                                        .getElementById("modal-edit-channels-config")
                                        .classList.add("hidden");
                                    const channelsNode = graph.children();
                                    UIManager.showChannels(
                                        channelsNode,
                                        MessageAPI.userAddress,
                                        MessageAPI.isPM
                                    );
                                })
                                .finally(() => {
                                    resetSaveButton();
                                });
                        });
                    } else {
                        alert("⛔ Erreur : " + (res.message || "Inconnue"));
                    }
                });
            });
    },
    deleteThread: function (threadID) {
        return new Promise((resolve, reject) => {
            if (
                !MessageAPI.scriptID ||
                !MessageAPI.userAddress ||
                !MessageAPI.eventManager
            ) {
                reject("Configuration incomplète");
                return;
            }
            const payload = {
                requestType: "delete-thread",
                thread: threadID,
                groupGraphID: UIManager.currentGroupGraphID,
                timestamp: Date.now(),
            };
            const encodedPayload = btoa(JSON.stringify(payload));
            MessageAPI.eventManager
                .sign(MessageAPI.userAddress, encodedPayload, 0)
                .then((signedTx) => {
                    const encodedUserTx = btoa(JSON.stringify(signedTx));
                    return Wormhole.executeContract(
                        MessageAPI.scriptID,
                        "DeleteThread",
                        { encodedUserTx },
                        "https://utopixia.com"
                    );
                })
                .then((response) => {
                    if (response.status === "ok") {
                        Singularity.waitForTx(response.tx[0]).then(resolve).catch(reject);
                    } else {
                        reject(response.message || "Erreur inconnue");
                    }
                })
                .catch((err) => {
                    console.error("Erreur MessageAPI.deleteThread:", err);
                    reject(err);
                });
        });
    },
    loadUsers: function (rawUserList) {
        return new Promise((resolve, reject) => {
            if (!rawUserList) {
                resolve({});
                return;
            }
            const users = rawUserList.split(";");
            users.push(MessageAPI.userAddress);
            const promises = users
                .filter((userID) => {
                    return (userID && userID.length > 0) || users[userID];
                })
                .map((userID) => {
                    return new Promise((resolve, reject) => {
                        Wormhole.getUserProfile(userID)
                            .then((userProfile) => {
                                resolve({ userProfile: userProfile, userAddress: userID });
                            })
                            .catch(() => {
                                console.log("error while retrieving user profile");
                            });
                    });
                });
            Promise.all(promises)
                .then((responses) => {
                    responses.forEach((data) => {
                        data.userProfile.address = data.userAddress;
                        MessageAPI.users[data.userAddress] = data.userProfile;
                    });
                    resolve(MessageAPI.users);
                })
                .catch(reject)
                .catch(reject);
        });
    },
    editThread: function (threadID, newName, newAuthorizedString) {
        return new Promise((resolve, reject) => {
            if (
                !MessageAPI.scriptID ||
                !MessageAPI.userAddress ||
                !MessageAPI.eventManager
            ) {
                reject("Configuration incomplète");
                return;
            }
            const payload = {
                requestType: "edit-thread",
                thread: threadID,
                newName: newName,
                groupGraphID: UIManager.currentGroupGraphID,
                authorized: newAuthorizedString,
                timestamp: Date.now(),
            };
            const encodedPayload = btoa(JSON.stringify(payload));
            MessageAPI.eventManager
                .sign(MessageAPI.userAddress, encodedPayload, 0)
                .then((signedTx) => {
                    const encodedUserTx = btoa(JSON.stringify(signedTx));
                    return Wormhole.executeContract(
                        MessageAPI.scriptID,
                        "EditThread",
                        { encodedUserTx },
                        "https://utopixia.com"
                    );
                })
                .then((response) => {
                    if (response.status === "ok") {
                        Singularity.waitForTx(response.tx[0]).then(resolve).catch(reject);
                    } else {
                        reject(response.message || "Erreur inconnue");
                    }
                })
                .catch((err) => {
                    console.error("Erreur MessageAPI.editThread:", err);
                    reject(err);
                });
        });
    },
    configure: function (userAddress, eventManager) {
        MessageAPI.userAddress = userAddress;
        MessageAPI.eventManager = eventManager;
    },
};
