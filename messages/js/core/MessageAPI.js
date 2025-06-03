const MessageAPI = {
    scriptID: "a3d7bd5d-8eb0-4c7c-93bb-f0b3eabe56bb",
    userAddress: null,
    eventManager: null,
    getMessages: function (threadID) {
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
                        { encodedUserTx }
                    );
                })
                .then((response) => {
                    if (response.status !== "ok") {
                        reject(response.message || "Erreur inconnue");
                    } else {
                        resolve(response.messages || []);
                    }
                })
                .catch((err) => {
                    console.error("Erreur MessageAPI.getMessages:", err);
                    reject(err);
                });
        });
    },
    postMessage: function (threadID, content) {
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
                content: FromUtf8ToB64(content),
                timestamp: Date.now(),
            };
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
    createThread: function () {
        const input = document.getElementById("new-channel-name");
        const rawName = input.value.trim().replace(/^#/, "");
        if (!rawName) return;

        const payload = {
            requestType: "create-thread",
            name: rawName,
            timestamp: Date.now()
        };

        const encodedPayload = btoa(JSON.stringify(payload));

        MessageAPI.eventManager.sign(MessageAPI.userAddress, encodedPayload, 0).then((signedTx) => {
            const encodedUserTx = btoa(JSON.stringify(signedTx));

            Wormhole.executeContract("a3d7bd5d-8eb0-4c7c-93bb-f0b3eabe56bb", "CreateThread", { encodedUserTx: encodedUserTx }, "https://utopixia.com").then((res) => {
                if (res.status === "ok") {
                    const btn = document.getElementById("create-thread-btn")
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
                        Blackhole.getGraph(MessagesGraphID).then(graph => {
                            document.getElementById('modal-edit-channels-config').classList.add('hidden')

                            const channelsNode = graph.children();
                            UIManager.showChannels(channelsNode, MessageAPI.userAddress, MessageAPI.isPM);

                        }).finally(() => {
                            resetSaveButton();
                        });
                    })
                } else {
                    alert("⛔ Erreur : " + (res.message || "Inconnue"));
                }
            });
        });
    },
    deleteThread: function (threadID) {
        return new Promise((resolve, reject) => {
            if (!MessageAPI.scriptID || !MessageAPI.userAddress || !MessageAPI.eventManager) {
                reject("Configuration incomplète");
                return;
            }

            const payload = {
                requestType: "delete-thread",
                thread: threadID,
                timestamp: Date.now()
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
                        Singularity.waitForTx(response.tx[0]).then(resolve).catch(reject)
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
                resolve({})
                return
            }
            const users = rawUserList.split(";");
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
                            .catch(reject);
                    });
                });
            Promise.all(promises)
                .then((responses) => {
                    responses.forEach((data) => {
                        MessageAPI.users[data.userAddress] = data.userProfile;
                    });
                    resolve(MessageAPI.users);
                })
                .catch(reject);
        });
    },
    editThread: function (threadID, newName, newAuthorizedString) {
        return new Promise((resolve, reject) => {
            if (!MessageAPI.scriptID || !MessageAPI.userAddress || !MessageAPI.eventManager) {
                reject("Configuration incomplète");
                return;
            }

            const payload = {
                requestType: "edit-thread",
                thread: threadID,
                newName: newName,
                authorized: newAuthorizedString,
                timestamp: Date.now()
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
                        Singularity.waitForTx(response.tx[0]).then(resolve).catch(reject)
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
