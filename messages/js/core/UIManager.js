function formatTimestamp(ts) {
    const parsedTs = parseInt(ts);
    if (isNaN(parsedTs)) {
        return "";
    }
    const date = new Date(parsedTs);
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("fr-FR", { month: "short" });
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${hours}:${minutes}`;
}
let editChannelState = { id: null, name: "", users: [] };
const UIManager = {
    selectedChannel: undefined,
    editChannel: function (id, name, authorizedString) {
        editChannelState.id = id;
        editChannelState.name = name;
        editChannelState.users = authorizedString
            ? authorizedString.split(";").filter(Boolean)
            : [];
        document.getElementById("edit-chan-name").value = name;
        UIManager.refreshUserListUI();
        document.getElementById("modal-edit-chan").classList.remove("hidden");
    },
    showBadgeModal: function (badge) {
        const modal = document.getElementById("modal-badge-details");
        document.getElementById("badge-title").textContent =
            badge.information.name || badge.name;
        document.getElementById("badge-description").textContent =
            badge.information.description || "";
        document.getElementById("badge-modal-image").src =
            badge.information.image || "https://placehold.co/64";
        const lvl = badge.level || 1;
        const max = badge.information.maxLevel || 1;
        const levelElem = document.getElementById("badge-level");
        levelElem.textContent = max > 1 ? `Niveau ${lvl} / ${max}` : "";
        modal.classList.remove("hidden");
    },
    showUserProfileScreen: function (userObject) {
        const screen = document.getElementById("screen-profile");
        const nameInput = document.getElementById("profile-input-name");
        const descInput = document.getElementById("profile-input-description");
        const addrElem = document.getElementById("screen-profile-address");
        const pic = document.getElementById("screen-profile-picture");
        const copyBtn = document.getElementById("copy-profile-address-btn");
        const badgeContainer = document.getElementById("profile-badges");
        const tokenElem = document.getElementById("token-balance");
        const stakedElem = document.getElementById("staked-token-balance");
        nameInput.value = convertHtmlCodesToAccents(userObject.graphName || "");
        descInput.value = convertHtmlCodesToAccents(userObject.description || "");
        addrElem.textContent = MessageAPI.userAddress;
        pic.src = UIManager.getSafeProfilePicture(userObject);
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(addrElem.textContent).then(() => {
                copyBtn.textContent = "✅";
                setTimeout(() => {
                    copyBtn.textContent = "📋";
                }, 1500);
            });
        };
        badgeContainer.innerHTML = "Chargement...";
        tokenElem.textContent = "0";
        stakedElem.textContent = "";
        Wormhole.getUserBadges(MessageAPI.userAddress).then((badges) => {
            badgeContainer.innerHTML = "";
            if (badges.length === 0) {
                badgeContainer.innerHTML =
                    "<span class='text-slate-500 text-sm'>Aucun badge</span>";
                return;
            }
            badges.forEach((badge) => {
                const badgeElem = document.createElement("div");
                badgeElem.className = "relative group cursor-pointer";
                badgeElem.innerHTML = `
              <img src="${badge.information.image}" alt="${
                    badge.information.name
                }" class="w-24 h-24 rounded-full border border-gray-700 hover:ring hover:ring-blue-400" />
              ${
                    badge.information.maxLevel > 1
                        ? `<span class="absolute bottom-0 right-0 bg-blue-600 text-white text-[10px] px-1 py-[1px] rounded-full">${badge.level}/${badge.information.maxLevel}</span>`
                        : ""
                }
          `;
                badgeElem.addEventListener("click", () => {
                    UIManager.showBadgeModal(badge);
                });
                badgeContainer.appendChild(badgeElem);
            });
        });
        Wormhole.getUserCoins(MessageAPI.userAddress).then((response) => {
            tokenElem.textContent = response.coins ?? 0;
            if (response.staked && response.staked > 0) {
                stakedElem.innerHTML =
                    '(<i class="fas fa-lock"></i> ' + response.staked + ")";
            }
        });
        document
            .getElementById("screen-group-view")
            .classList.add("translate-x-full");
        screen.classList.remove("translate-x-full");
        initUserProfileFormState();
        UIManager.initUserProfilePictureUpload();
    },
    initUserProfilePictureUpload: function () {
        const pic = document.getElementById("screen-profile-picture");
        const input = document.getElementById("profile-picture-file");
        pic.addEventListener("click", () => {
            input.click();
        });
        input.addEventListener("change", function (event) {
            const file = event.target.files[0];
            if (!file) {
                console.log("Aucun fichier sélectionné.");
                return;
            }
            Utils.showGlobalLoading("Téléversement en cours...");
            sendFile(file)
                .then((response) => {
                    console.log("Upload terminé:", response);
                    const fileCID = response.fileData.cid;
                    const filePath = "/ipfs/" + fileCID;
                    return addUserProfilePicture(filePath).then(() => {
                        pic.src = filePath;
                        Utils.hideGlobalLoading();
                    });
                })
                .catch((err) => {
                    Utils.hideGlobalLoading();
                    alert("Erreur lors de l'upload : " + err.message || err);
                    console.error(err);
                });
        });
    },
    refreshUserListUI: function () {
        const list = document.getElementById("edit-chan-user-list");
        list.innerHTML = "";
        editChannelState.users.forEach((userAddr) => {
            const li = document.createElement("li");
            li.className =
                "flex justify-between items-center bg-gray-700 px-3 py-1 rounded";
            li.innerHTML = `
      <span class="truncate">${userAddr}</span>
      <button onclick="UIManager.removeUserFromChannel('${userAddr}')" class="text-red-400 hover:text-red-600">✖</button>
    `;
            Wormhole.getUserProfile(userAddr).then((userProfile) => {
                li.innerHTML = `
        <span class="truncate">${userProfile.object.graphName} <span class="text-slate-400 text-xs">${userAddr}</span></span>
        <button onclick="UIManager.removeUserFromChannel('${userAddr}')" class="text-red-400 hover:text-red-600">✖</button>
      `;
            });
            list.appendChild(li);
        });
    },
    saveChannelEdition: function () {
        const id = editChannelState.id;
        const name = document.getElementById("edit-chan-name").value.trim();
        const authorized = editChannelState.users.join(";") + ";";
        if (!name || !id) return;
        console.log("name: ", name);
        console.log("authorized: ", authorized);
        document.getElementById("modal-edit-chan").classList.add("hidden");
    },
    addUserToChannel: function () {
        const input = document.getElementById("edit-chan-user-input");
        const addr = input.value.trim();
        if (addr && !editChannelState.users.includes(addr)) {
            editChannelState.users.push(addr);
            UIManager.refreshUserListUI();
            input.value = "";
        }
    },
    removeUserFromChannel: function (addr) {
        editChannelState.users = editChannelState.users.filter((u) => u !== addr);
        UIManager.refreshUserListUI();
    },
    showChannels: function (channels, userAddress, isPM = false) {
        const channelContainer = document.getElementById("channel-list");
        channelContainer.innerHTML = "";
        channels.forEach((elem) => {
            const authorized = elem.object["thread-authorized_users"] || "";
            if (
                !authorized.includes(userAddress + ";") &&
                !isPM &&
                authorized.length > 0
            ) {
                console.log("user is not authorized");
                return;
            }
            const chanEntry = document.createElement("li");
            chanEntry.id = elem.object.id;
            chanEntry.classList.add(
                "bg-gray-700",
                "px-3",
                "py-2",
                "rounded",
                "cursor-pointer",
                "hover:bg-gray-600",
                "chanLoader"
            );
            chanEntry.textContent = `# ${elem.object["thread-name"]}`;
            chanEntry.addEventListener("click", () => {
                UIManager.selectChannel(elem);
            });
            console.log("adding thread to container: ", channelContainer.id);
            channelContainer.appendChild(chanEntry);
        });
    },
    users: {},
    showMessages: function (messages, users, currentUserAddress) {
        UIManager.users = users;
        const container = document.getElementById("message-list");
        container.innerHTML = "";
        console.log("messages: ", messages);
        messages.forEach((msg) => {
            const targetUser = users[msg.author];
            if (!targetUser) {
                console.warn("user not found");
                return;
            }
            const messageView = UIManager.buildMessageView(
                msg,
                targetUser,
                currentUserAddress
            );
            container.appendChild(messageView);
        });
        container.scrollTop = container.scrollHeight;
    },
    buildMessageView: function (msg, user, currentUserAddress) {
        if (currentUserAddress === msg.author) {
            return UIManager._buildSelfMsg(msg, user);
        } else {
            return UIManager._buildUserMsg(msg, user);
        }
    },
    selectChannel: function (channel) {
        return new Promise((resolve, reject) => {
            UIManager.selectedChannel = channel;
            localStorage.setItem("selectedThread", channel.object.id);
            document.querySelectorAll("#channel-list li").forEach((li) => {
                li.classList.remove("bg-gray-600", "font-bold", "text-white");
            });
            const selected = document.querySelector(
                `#channel-list li[id='${channel.object.id}']`
            );
            if (selected) {
                selected.classList.add("bg-gray-600", "font-bold", "text-white");
            }
            document.getElementById(
                "channel-title"
            ).textContent = `# ${channel.object["thread-name"]}`;
            const users = (channel.children() || [])
                .map((msg) => {
                    return msg.object["msg-author"];
                })
                .join(";");
            MessageAPI.loadUsers(
                users + ";" + channel.object["thread-authorized_users"] ?? ""
            ).then((users) => {
                MessageAPI.getMessages(channel.object.id)
                    .then((messages) => {
                        const container = document.getElementById("message-list");
                        container.innerHTML = "";
                        UIManager.showMessages(messages, users, MessageAPI.userAddress);
                        document
                            .getElementById("config-channel")
                            .classList.toggle("hidden", !UIManager.isGroupOwner);
                        UIManager.clearReplyPreview();
                        resolve();
                    })
                    .catch(reject);
            });
        });
    },
    getSafeProfilePicture: function (userObject) {
        return userObject["profilePictureURL"] &&
        userObject["profilePictureURL"].trim().length > 0
            ? userObject["profilePictureURL"]
            : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2RkZGRkZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjIwIiBmaWxsPSIjOTk5OTk5Ii8+PHJlY3QgeT0iNjAiIHdpZHRoPSI3MCIgaGVpZ2h0PSI0MCIgeD0iMTUiIGZpbGw9IiM5OTk5OTkiIHJ4PSIxNSIvPjwvc3ZnPg==";
    },
    showUserProfileModal: function (profileOrNode, showDisconnect = false) {
        let userObject;
        if (profileOrNode.object) {
            userObject = profileOrNode.object;
        } else {
            userObject = profileOrNode;
        }
        const profileModal = document.getElementById("modal-profile");
        const profileName = document.getElementById("profile-name");
        const profilePicture = document.getElementById("profile-picture");
        const profileDescription = document.getElementById("profile-description");
        const profileAddress = document.getElementById("profile-address");
        const copyBtn = document.getElementById("btn-copy-address");
        profileName.textContent = convertHtmlCodesToAccents(userObject.graphName);
        profilePicture.src =
            userObject.profilePictureURL || "https://placehold.co/64";
        profileDescription.textContent = convertHtmlCodesToAccents(
            userObject.description
        );
        profileAddress.textContent = userObject["user-address"] || userAddress;
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(profileAddress.textContent).then(() => {
                copyBtn.textContent = "✅ Copié !";
                setTimeout(() => {
                    copyBtn.textContent = "📋 Copier";
                }, 1500);
            });
        };
        if (showDisconnect) {
            document.getElementById("btn-disconnect").classList.remove("hidden");
        } else {
            document.getElementById("btn-disconnect").classList.add("hidden");
        }
        profileModal.classList.remove("hidden");
    },
    _buildUserMsg: function (msg, user) {
        const msgContainer = document.createElement("div");
        msgContainer.classList.add("flex", "gap-3", "mb-2", "items-center");
        msgContainer.dataset.ts = msg.ts;
        let holdTimeout;
        msgContainer.addEventListener("touchstart", (e) => {
            document.body.classList.add("no-select");
            holdTimeout = setTimeout(() => {
                UIManager.showMessageActions(msg, msgContainer);
            }, 500);
        });
        msgContainer.addEventListener("touchend", () => {
            clearTimeout(holdTimeout);
            document.body.classList.remove("no-select");
        });
        msgContainer.addEventListener("touchmove", () => {
            clearTimeout(holdTimeout);
            document.body.classList.remove("no-select");
        });
        msgContainer.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            UIManager.showMessageActions(msg, msgContainer);
        });
        const userIconContainer = document.createElement("div");
        userIconContainer.classList.add(
            "w-10",
            "h-10",
            "rounded-full",
            "bg-gray-600",
            "flex-shrink-0",
            "cursor-pointer"
        );
        const userImg = document.createElement("img");
        userImg.classList.add("rounded-full");
        userImg.src = UIManager.getSafeProfilePicture(user.object);
        userIconContainer.appendChild(userImg);
        userIconContainer.addEventListener("click", () => {
            UIManager.showUserProfileModal(user);
        });
        const msgGroup = document.createElement("div");
        const dateAndUserName = document.createElement("div");
        dateAndUserName.classList.add("text-sm", "text-gray-400");
        dateAndUserName.innerHTML = `${convertAccentsToHtmlCodes(
            user.object.graphName
        )} <span class="text-xs text-gray-500">${formatTimestamp(msg.ts)}</span>`;
        msgGroup.appendChild(dateAndUserName);
        if (msg["respond-to"]) {
            const quotedContainer = UIManager.buildQuotedReply(msg["respond-to"]);
            msgGroup.appendChild(quotedContainer);
        }

        const userMsg = document.createElement("div");
        userMsg.classList.add("text-sm");
        const content = convertHtmlCodesToAccents(FromB64ToUtf8(msg.text));
        userMsg.innerHTML = marked.parse(content);
        msgGroup.appendChild(userMsg);
        msgContainer.appendChild(userIconContainer);
        msgContainer.appendChild(msgGroup);
        return msgContainer;
    },
    _buildSelfMsg: function (msg, user, isTmp = false) {
        const msgContainer = document.createElement("div");
        msgContainer.classList.add("flex", "gap-3", "justify-end", "text-right");
        msgContainer.dataset.ts = msg.ts;
        let holdTimeout;
        msgContainer.addEventListener("touchstart", (e) => {
            document.body.classList.add("no-select");
            holdTimeout = setTimeout(() => {
                UIManager.showMessageActions(msg, msgContainer);
            }, 500);
        });
        msgContainer.addEventListener("touchend", () => {
            clearTimeout(holdTimeout);
            document.body.classList.remove("no-select");
        });
        msgContainer.addEventListener("touchmove", () => {
            clearTimeout(holdTimeout);
            document.body.classList.remove("no-select");
        });
        msgContainer.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            UIManager.showMessageActions(msg, msgContainer);
        });
        const msgGroup = document.createElement("div");
        const dateAndUserName = document.createElement("div");
        dateAndUserName.classList.add("text-sm", "text-blue-400");
        dateAndUserName.innerHTML = `moi <span class="text-xs text-gray-500">${formatTimestamp(
            msg.ts
        )}</span>`;
        msgGroup.appendChild(dateAndUserName);
        if (msg["respond-to"]) {
            const quotedContainer = UIManager.buildQuotedReply(msg["respond-to"]);
            msgGroup.appendChild(quotedContainer);
        }
        const userMsg = document.createElement("div");
        userMsg.classList.add(
            "text-sm",
            "text-white",
            "px-3",
            "py-2",
            "rounded-lg",
            "inline-block",
            "max-w-xs"
        );
        if (isTmp) {
            userMsg.classList.add("bg-blue-900");
        } else {
            userMsg.classList.add("bg-blue-700");
        }
        const content = convertHtmlCodesToAccents(FromB64ToUtf8(msg.text));
        userMsg.innerHTML = marked.parse(content);
        msgGroup.appendChild(userMsg);
        const userIconContainer = document.createElement("div");
        userIconContainer.classList.add(
            "w-10",
            "h-10",
            "rounded-full",
            "bg-blue-600"
        );
        const userImg = document.createElement("img");
        userImg.classList.add("rounded-full");
        userImg.src = UIManager.getSafeProfilePicture(user.object);
        userIconContainer.appendChild(userImg);
        userIconContainer.addEventListener("click", () => {
            const profileModal = document.getElementById("modal-profile");
            const profileName = document.getElementById("profile-name");
            const profilePicture = document.getElementById("profile-picture");
            const profileDescription = document.getElementById("profile-description");
            document.getElementById("btn-disconnect").classList.remove("hidden");
            profileName.textContent = convertHtmlCodesToAccents(
                user.object.graphName
            );
            profilePicture.src = user.object["profilePictureURL"];
            profileDescription.textContent = convertHtmlCodesToAccents(
                user.object["description"]
            );
            const profileAddress = document.getElementById("profile-address");
            profileAddress.textContent =
                user.object["user-address"] || MessageAPI.userAddress;
            const copyBtn = document.getElementById("btn-copy-address");
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(profileAddress.textContent).then(() => {
                    copyBtn.textContent = "✅ Copié !";
                    setTimeout(() => {
                        copyBtn.textContent = "📋 Copier";
                    }, 1500);
                });
            };
            profileModal.classList.remove("hidden");
        });
        msgContainer.appendChild(msgGroup);
        msgContainer.appendChild(userIconContainer);
        return msgContainer;
    },
    buildQuotedReply: function (replyToMsg) {
        const container = document.createElement("div");
        container.className =
            "mb-1 px-3 py-2 rounded bg-gray-800 border-l-4 border-blue-500 text-sm text-slate-300 cursor-pointer";
        let previewText = convertHtmlCodesToAccents(FromB64ToUtf8(replyToMsg.text));
        let author = replyToMsg.author;
        const authorUser =  UIManager.users[replyToMsg.author]
        if (authorUser) {
            author = convertHtmlCodesToAccents(authorUser.object.graphName)
        }
        container.innerHTML = `<strong>${author}</strong> — ${previewText}`;
        container.addEventListener("click", () => {
            const target = [...document.querySelectorAll("#message-list > div")].find(
                (el) => el.dataset.ts === replyToMsg.ts
            );
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "center" });
                target.classList.add("ring", "ring-blue-500", "rounded");
                setTimeout(
                    () => target.classList.remove("ring", "ring-blue-500", "rounded"),
                    2000
                );
            } else {
                console.warn(
                    "Réponse à un message introuvable (non encore chargé ?)",
                    replyToMsg.ts
                );
            }
        });
        return container;
    },
    clearReplyPreview: function () {
        const preview = document.getElementById("reply-preview");
        preview.classList.add("hidden");
        preview.setAttribute("data-msg-id", "");
    },
    showMessageActions: function (msg, msgElem) {
        const existing = document.getElementById("message-action-bar");
        if (existing) existing.remove();
        const actionBar = document.createElement("div");
        actionBar.id = "message-action-bar";
        actionBar.className =
            "flex gap-2 p-1 rounded bg-gray-800 border border-gray-600 z-50";
        actionBar.style.position = "absolute";
        const emojis = ["👍", "😂", "❤️", "😮", "✅"];
        emojis.forEach((emoji) => {
            const btn = document.createElement("button");
            btn.className = "text-xl hover:scale-110 transition-transform";
            btn.textContent = emoji;
            btn.onclick = () => {
                alert(
                    `(🔧TODO) Réaction "${emoji}" envoyée sur le message : ${msg.ts}`
                );
                actionBar.remove();
            };
            actionBar.appendChild(btn);
        });
        const replyBtn = document.createElement("button");
        replyBtn.className = "text-sm text-blue-400 hover:underline ml-2";
        replyBtn.innerHTML = '<i class="fa-solid fa-reply"></i>';
        replyBtn.onclick = () => {
            const preview = document.getElementById("reply-preview");
            const contentElem = document.getElementById("reply-preview-content");
            const content = FromB64ToUtf8(msg.text);
            contentElem.textContent =
                content.slice(0, 100) + (content.length > 100 ? "…" : "");
            preview.setAttribute("data-msg-id", msg.id);
            preview.classList.remove("hidden");
            document.getElementById("chat-input").focus();
            const allMessages = document.querySelectorAll("#message-list > div");
            allMessages.forEach((div) => {
                if (div.dataset && div.dataset.ts == msg.ts) {
                    div.scrollIntoView({ behavior: "smooth", block: "center" });
                    div.classList.add("ring", "ring-blue-500");
                    setTimeout(() => div.classList.remove("ring", "ring-blue-500"), 2000);
                }
            });
            actionBar.remove();
        };
        actionBar.appendChild(replyBtn);
        const copyBtn = document.createElement("button");
        copyBtn.className = "text-sm text-blue-400 hover:underline ml-2 mr-2";
        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(FromB64ToUtf8(msg.text));
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
                actionBar.remove();
            }, 2000);
        };
        actionBar.appendChild(copyBtn);
        const rect = msgElem.getBoundingClientRect();
        const containerRect = document
            .getElementById("message-list")
            .getBoundingClientRect();
        const top = rect.bottom - containerRect.top + window.scrollY;
        const left = rect.left - containerRect.left + window.scrollX;
        actionBar.style.top = `${top - 50}px`;
        actionBar.style.left = `${left}px`;
        document.getElementById("message-list").appendChild(actionBar);
    },
    confirmDeleteThread: function () {
        const threadID = editChannelState.id;
        const threadName = document.getElementById("edit-chan-name").value.trim();
        const btn = document.getElementById("delete-thread-btn");
        const spinner = btn.querySelector(".spinner");
        const label = btn.querySelector("span");
        if (!threadID || !threadName) return;
        const ok = confirm(
            `⚠️ Voulez-vous vraiment supprimer le channel « ${threadName} » ? Cette action est irréversible.`
        );
        if (!ok) return;
        btn.disabled = true;
        spinner.classList.remove("hidden");
        label.textContent = "Suppression...";
        MessageAPI.deleteThread(threadID)
            .then(() => {
                document.getElementById("modal-edit-chan").classList.add("hidden");
                Blackhole.getGraph(MessagesGraphID).then((graph) => {
                    if (localStorage.getItem("selectedThread") === threadID) {
                        document.getElementById("channel-title").textContent = "";
                        document.getElementById("message-list").innerHTML = "";
                        localStorage.removeItem("selectedThread");
                    }
                    const channelsNode = graph.children();
                    UIManager.showChannels(
                        channelsNode,
                        MessageAPI.userAddress,
                        MessageAPI.isPM
                    );
                    if (channelsNode.length > 0) {
                        UIManager.selectChannel(channelsNode[0]);
                    }
                });
            })
            .catch((err) => {
                alert("⛔ Échec de suppression : " + err);
            })
            .finally(() => {
                btn.disabled = false;
                spinner.classList.add("hidden");
                label.textContent = "Supprimer le channel";
            });
    },
    saveChannelEdition: function () {
        const btn = document.getElementById("save-channel-btn");
        const spinner = btn.querySelector(".spinner");
        const label = btn.querySelector("span");
        btn.disabled = true;
        spinner.classList.remove("hidden");
        label.textContent = "Enregistrement...";
        const id = editChannelState.id;
        const name = document.getElementById("edit-chan-name").value.trim();
        const authorized = editChannelState.users.join(";") + ";";
        if (!id || !name || !authorized) {
            alert("Nom ou utilisateurs manquants.");
            resetSaveButton();
            return;
        }
        MessageAPI.editThread(id, name, authorized)
            .then(() => {
                document.getElementById("modal-edit-chan").classList.add("hidden");
                Blackhole.getGraph(MessagesGraphID).then((graph) => {
                    const channelsNode = graph.children();
                    UIManager.showChannels(
                        channelsNode,
                        MessageAPI.userAddress,
                        MessageAPI.isPM
                    );
                });
            })
            .catch((err) => {
                alert("⛔ Erreur : " + err);
            })
            .finally(() => {
                resetSaveButton();
            });
        function resetSaveButton() {
            btn.disabled = false;
            spinner.classList.add("hidden");
            label.textContent = "Enregistrer";
        }
    },
};
function sendFile(file) {
    return new Promise((resolve, reject) => {
        const mimeType = file.type;
        function generateSHA256(file) {
            return new Promise((resolve, reject) => {
                file
                    .arrayBuffer()
                    .then((arrayBuffer) => {
                        return crypto.subtle.digest("SHA-256", arrayBuffer);
                    })
                    .then((hashBuffer) => {
                        const hashArray = Array.from(new Uint8Array(hashBuffer));
                        const hash = hashArray
                            .map((b) => b.toString(16).padStart(2, "0"))
                            .join("");
                        resolve(hash);
                    })
                    .catch((error) => {
                        console.error("Erreur lors de la génération du SHA-256 :", error);
                        reject(error);
                    });
            });
        }
        generateSHA256(file).then((hash) => {
            const payload = {
                hash: hash,
                fileName: "user/Documents/Pictures/" + file.name,
                keyID: null,
            };
            const b64Payload = btoa(JSON.stringify(payload));
            eventManager
                .signWithoutGas(MessageAPI.userAddress, b64Payload, 0)
                .then((signedTx) => {
                    const tx = {
                        UUID: signedTx.UUID,
                        sender_public_key: signedTx.sender_public_key,
                        signature: signedTx.signature,
                        sender_blockchain_address: signedTx.sender_blockchain_address,
                        recipient_blockchain_address: signedTx.recipient_blockchain_address,
                        value: signedTx.value,
                        data: signedTx.data,
                    };
                    const formData = new FormData();
                    formData.append("userTransaction", btoa(JSON.stringify(tx)));
                    formData.append("file", file);
                    formData.append("mimeType", mimeType);
                    fetch("/ipfs/upload", { method: "POST", body: formData })
                        .then((response) => response.json())
                        .then((data) => {
                            resolve(data);
                        })
                        .catch((error) => {
                            reject(error);
                        });
                });
        });
    });
}
function addUserProfilePicture(profilePictureURL) {
    return new Promise((resolve, reject) => {
        Wormhole.getUserProfile(MessageAPI.userAddress).then((userProfileRoot) => {
            const action = Blackhole.Actions.makeUpdate(
                userProfileRoot.graphID,
                userProfileRoot.object.id,
                "profilePictureURL",
                profilePictureURL
            );
            eventManager
                .sign(MessageAPI.userAddress, action, 0)
                .then((signedTx) => {
                    Singularity.saveSignedTx(signedTx)
                        .then((tx) => {
                            Singularity.waitForTx(tx.UUID).then(resolve).catch(reject);
                        })
                        .catch(reject);
                })
                .catch(reject);
        });
    });
}
