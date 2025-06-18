const MessagesGraphID = "84d09c9b-387b-4430-8e8f-23c4304b59b3";
const GroupGraphID = "048d5c2d-85b6-4d5a-a994-249f6032ec3a";
const UsersGraphID = "b0586e65-e103-4f36-b644-574254a113d7";
const PikaUserAddress = "1N6QSH7vsYHyeeo8L5KWVTK78HDRbkEqzc";
let userAddress = "";
dAppContext.eventManager = new EventManager((data) => {
    userAddress = data.address;
    dAppContext.userAddress = userAddress;
    if (userAddress === PikaUserAddress) {
        document.getElementById("btn-open-status").classList.remove("hidden");
    } else {
        document.getElementById("btn-open-status").classList.add("hidden");
    }
    MessageAPI.configure(data.address, dAppContext.eventManager);
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
                dAppContext.receiveTx(tx.data).then((reloadedElement) => {
                    if (!reloadedElement) {
                        return;
                    }
                    const currentThread = localStorage.getItem("selectedThread");
                    const currentGroupID = UIManager.currentGroupGraphID;
                    const isPrivateMsg =
                        !currentThread && MessageAPI.privateMsgGraphID !== undefined;
                    if (
                        reloadedElement.type == "private" &&
                        isPrivateMsg &&
                        MessageAPI.privateMsgGraphID == reloadedElement.threadID
                    ) {
                        const users = (reloadedElement.graph.children() || [])
                            .map((msg) => msg.object["msg-author"])
                            .join(";");
                        MessageAPI.loadUsers(users).then((loadedUsers) => {
                            UIManager.showMessages(
                                reloadedElement.messages,
                                loadedUsers,
                                dAppContext.userAddress
                            );
                        });
                    } else if (
                        reloadedElement.type === "group" &&
                        !isPrivateMsg &&
                        currentThread == reloadedElement.threadID &&
                        currentGroupID == reloadedElement.groupID
                    ) {
                        MessageAPI.getMessages(reloadedElement.threadID)
                            .then((messages) => {
                                const graph = reloadedElement.graph;
                                const users = (graph.children() || [])
                                    .map((msg) => msg.object["msg-author"])
                                    .join(";");
                                MessageAPI.loadUsers(users).then((loadedUsers) => {
                                    UIManager.showMessages(
                                        messages,
                                        loadedUsers,
                                        dAppContext.userAddress
                                    );
                                });
                            })
                            .catch((err) => {
                                console.warn("Erreur lors du rechargement des messages :", err);
                            });
                    }
                });
            }, 1000);
        });
});
document
    .getElementById("btn-back-to-group-view")
    .addEventListener(
        "click",
        NavigationManager.showGroupViewScreenFromPublicGroups
    );
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
document
    .getElementById("send-btn")
    .addEventListener("click", ChatManager.sendMessage);
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
            dAppContext.eventManager.send(event, resolve);
        } catch (error) {
            reject(error);
        }
    })
        .then(() => {
            document.getElementById("modal-profile").classList.add("hidden");
        })
        .catch((err) => {
            console.error("Erreur lors de la déconnexion :", err);
        });
});
document
    .getElementById("btn-back-to-groups")
    .addEventListener("click", NavigationManager.showGroupViewScreenFromBack);
document
    .getElementById("user-profile-btn")
    .addEventListener("click", function () {
        NavigationManager.showProfileScreen();
    });
document.getElementById("btn-open-contacts").addEventListener("click", () => {
    NavigationManager.showContactsScreen();
});
document
    .getElementById("btn-back-to-group-view-from-contacts")
    .addEventListener("click", () => {
        NavigationManager.showGroupViewScreenFromContacts();
    });
document.getElementById("btn-add-contact").addEventListener("click", () => {
    document.getElementById("add-contact-address").value = "";
    document.getElementById("modal-add-contact").classList.remove("hidden");
});
const confirmContactBtn = document.getElementById("btn-confirm-add-contact");
confirmContactBtn.addEventListener("click", () => {
    const address = document.getElementById("add-contact-address").value.trim();
    if (!address) {
        alert("Veuillez saisir une adresse.");
        return;
    }
    Wormhole.getUserProfile(userAddress).then((userProfileGraphRoot) => {
        if (!userProfileGraphRoot.hasNext("dapps")) {
            alert("Impossible d'ajouter un contact (pas de noeud dapps)");
            return;
        }
        const dappsNode = userProfileGraphRoot.next("dapps");
        const btnPreviousValue = confirmContactBtn.innerText;
        confirmContactBtn.innerHTML =
            '<i class="fas fa-spin fa-spinner"></i> ' + btnPreviousValue;
        confirmContactBtn.disable = true;
        const actions = [];
        if (!dappsNode.hasNext("contacts")) {
            actions.push(
                Blackhole.Actions.update(dappsNode.object.id, "children", "contacts")
            );
        }
        const expectedChildrenPath = dappsNode.object.path + "/contacts";
        const expectedChildrenID = MD5(expectedChildrenPath);
        actions.push(
            Blackhole.Actions.update(expectedChildrenID, "children", address)
        );
        const groupAction = Blackhole.Actions.makeGroup(
            userProfileGraphRoot.graphID,
            ...actions
        );
        dAppContext.eventManager
            .sign(userAddress, groupAction, 0)
            .then((signedTx) => {
                Singularity.saveSignedTx(signedTx).then((response) => {
                    Singularity.waitForTx(response.UUID).then(() => {
                        const btnPreviousValue = confirmContactBtn.innerText;
                        confirmContactBtn.innerHTML = btnPreviousValue;
                        confirmContactBtn.disable = false;
                        setTimeout(() => {
                            document
                                .getElementById("modal-add-contact")
                                .classList.add("hidden");
                            NavigationManager.showContactsScreen();
                        }, 1000);
                    });
                });
            });
    });
});
window.addEventListener("message", (event) => {
    const data = event.data;
    if (typeof data === "string") {
        try {
            data = JSON.parse(data);
        } catch (_) {
            return;
        }
    }
    if (data.type === "back") {
        if (window.currentView === "contact") {
            NavigationManager.showGroupViewScreenFromContacts();
        } else if (window.currentView === "public-group") {
            NavigationManager.showGroupViewScreenFromPublicGroups();
        } else if (window.currentView === "chat") {
            NavigationManager.showGroupViewScreenFromBack();
        } else if (window.currentView === "profile") {
            NavigationManager.showGroupViewScreenFromUserProfile();
        }
    }
});
document.getElementById("btn-open-status").addEventListener("click", () => {
    Utils.showGlobalLoading("Chargement des demandes...");
    const list = document.getElementById("incoming-requests-list");
    list.innerHTML = "";
    const payload = { requestType: "get-contacts", timestamp: Date.now() };
    const encodedPayload = btoa(JSON.stringify(payload));
    dAppContext.eventManager
        .sign(userAddress, encodedPayload, 0)
        .then((signedTx) => {
            const encodedUserTx = btoa(JSON.stringify(signedTx));
            return Wormhole.executeContract(
                "7ba26b5c-ff5d-4f43-a1c5-c3e77cb8b3be",
                "GetContacts",
                { encodedUserTx },
                "https://utopixia.com"
            );
        })
        .then((response) => {
            if (response.status === "ok") {
                console.log("response: ");
                response.contacts.forEach((object) => {
                    const item = document.createElement("li");
                    item.className =
                        "bg-gray-700 px-3 py-2 rounded flex justify-between items-center";
                    const from = object["email"] || "inconnu";
                    const ts = object["date"];
                    item.innerHTML = `<span>${from} <span class="text-gray-400 text-sm">(${ts})</span></span>`;
                    list.appendChild(item);
                });
                document
                    .getElementById("modal-incoming-requests")
                    .classList.remove("hidden");
            } else {
                console.error("Erreur GetContacts:", response);
                reject(MessageAPIErrors.API_ERROR);
            }
        })
        .catch((err) => {
            console.error("Erreur GetContacts:", err);
            reject(MessageAPIErrors.UNKNOWN_ERROR);
        })
        .finally(() => {
            Utils.hideGlobalLoading();
        });
});
const profileUpdateBtn = document.getElementById("update-user-profile-btn");
const profileInputName = document.getElementById("profile-input-name");
const profileInputDescription = document.getElementById(
    "profile-input-description"
);
const initialValues = { name: null, description: null };
function initUserProfileFormState() {
    initialValues.name = profileInputName.value.trim();
    initialValues.description = profileInputDescription.value.trim();
    updateProfileButtonState();
}
function updateProfileButtonState() {
    const currentName = profileInputName.value.trim();
    const currentDesc = profileInputDescription.value.trim();
    const hasChanged =
        currentName !== initialValues.name ||
        currentDesc !== initialValues.description;
    profileUpdateBtn.disabled = !hasChanged;
    profileUpdateBtn.classList.toggle("invisible", !hasChanged);
}
profileInputName.addEventListener("input", updateProfileButtonState);
profileInputDescription.addEventListener("input", updateProfileButtonState);
profileUpdateBtn.addEventListener("click", () => {
    const currentName = profileInputName.value.trim();
    const currentDesc = profileInputDescription.value.trim();
    Wormhole.getUserProfile(userAddress).then((userProfileGraph) => {
        const actions = [];
        if (currentName !== initialValues.name) {
            actions.push(
                Blackhole.Actions.update(
                    userProfileGraph.object.id,
                    "graphName",
                    convertAccentsToHtmlCodes(currentName)
                )
            );
        }
        if (currentDesc !== initialValues.description) {
            actions.push(
                Blackhole.Actions.update(
                    userProfileGraph.object.id,
                    "description",
                    convertAccentsToHtmlCodes(currentDesc)
                )
            );
        }
        const groupAction = Blackhole.Actions.makeGroup(
            userProfileGraph.graphID,
            ...actions
        );
        dAppContext.eventManager
            .sign(userAddress, groupAction, 0)
            .then((signedTx) => {
                const previousText = profileUpdateBtn.innerText;
                profileUpdateBtn.innerHTML =
                    '<i class="fas fa-spin fa-spinner"></i> Enregistrement';
                profileUpdateBtn.ariaDisabled = true;
                Singularity.saveSignedTx(signedTx).then((tx) => {
                    Singularity.waitForTx(tx.UUID).then(() => {
                        initialValues.description = currentDesc;
                        initialValues.name = currentName;
                        profileUpdateBtn.innerHTML =
                            '<i class="fas fa-check"></i> Enregistré';
                        setTimeout(() => {
                            profileUpdateBtn.innerText = previousText;
                            profileUpdateBtn.disabled = false;
                            profileUpdateBtn.classList.add("invisible");
                        }, 2000);
                    });
                });
            });
    });
});

document.addEventListener("click", (e) => {
    const bar = document.getElementById("message-action-bar");
    if (bar && !bar.contains(e.target)) {
        bar.remove();
    }
});

document.getElementById("cancel-reply-btn").addEventListener("click", () => {
    const preview = document.getElementById("reply-preview");
    preview.classList.add("hidden");
    preview.setAttribute("data-msg-id", "");
});

document.getElementById("reply-preview").addEventListener("click", () => {
    const targetTs = document.getElementById("reply-preview").getAttribute("data-msg-id");
    if (!targetTs) return;

    const target = [...document.querySelectorAll("#message-list > div")]
        .find(el => el.dataset.ts === targetTs);

    if (target) {
        // Scroll doux
        target.scrollIntoView({ behavior: "smooth", block: "center" });

        // Highlight temporaire
        target.classList.add("ring", "ring-blue-500", "transition");
        setTimeout(() => {
            target.classList.remove("ring", "ring-blue-500");
        }, 2000);
    } else {
        console.warn("Message cible non trouvé pour ts =", targetTs);
    }
});