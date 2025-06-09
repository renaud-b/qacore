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
            if (!authorized.includes(userAddress + ";") && !isPM) {
                console.log("user is not authorized")
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
            console.log("adding thread to container: ", channelContainer.id)
            channelContainer.appendChild(chanEntry);
        });
    },
    showMessages: function (messages, users, currentUserAddress) {
        const container = document.getElementById("message-list");
        container.innerHTML = ''
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
            MessageAPI.getMessages(channel.object.id).then((messages) => {
                const container = document.getElementById("message-list");
                container.innerHTML = "";

                UIManager.showMessages(messages, users, MessageAPI.userAddress);

                document.getElementById("config-channel").classList.toggle("hidden", !(UIManager.isGroupOwner));

            });
        });
    },
    getSafeProfilePicture: function (userObject) {
        return userObject["profilePictureURL"] &&
        userObject["profilePictureURL"].trim().length > 0
            ? userObject["profilePictureURL"]
            : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2RkZGRkZCIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjIwIiBmaWxsPSIjOTk5OTk5Ii8+PHJlY3QgeT0iNjAiIHdpZHRoPSI3MCIgaGVpZ2h0PSI0MCIgeD0iMTUiIGZpbGw9IiM5OTk5OTkiIHJ4PSIxNSIvPjwvc3ZnPg==";
    },
    _buildUserMsg: function (msg, user) {
        const msgContainer = document.createElement("div");
        msgContainer.classList.add("flex", "gap-3", "mb-2");
        const userIconContainer = document.createElement("div");
        userIconContainer.classList.add(
            "w-10",
            "h-10",
            "rounded-full",
            "bg-gray-600"
        );
        const userImg = document.createElement("img");
        userImg.classList.add("rounded-full");
        userImg.src = UIManager.getSafeProfilePicture(user.object);
        userIconContainer.appendChild(userImg);
        const msgGroup = document.createElement("div");
        const dateAndUserName = document.createElement("div");
        dateAndUserName.classList.add("text-sm", "text-gray-400");
        dateAndUserName.innerHTML = `${convertAccentsToHtmlCodes(
            user.object.graphName
        )} <span class="text-xs text-gray-500">${formatTimestamp(msg.ts)}</span>`;
        msgGroup.appendChild(dateAndUserName);
        const userMsg = document.createElement("div");
        userMsg.classList.add("text-sm");
        userMsg.innerText = convertHtmlCodesToAccents(FromB64ToUtf8(msg.text));
        msgGroup.appendChild(userMsg);
        msgContainer.appendChild(userIconContainer);
        msgContainer.appendChild(msgGroup);
        return msgContainer;
    },
    _buildSelfMsg: function (msg, user, isTmp = false) {
        const msgContainer = document.createElement("div");
        msgContainer.classList.add("flex", "gap-3", "justify-end", "text-right");
        const msgGroup = document.createElement("div");
        const dateAndUserName = document.createElement("div");
        dateAndUserName.classList.add("text-sm", "text-blue-400");
        dateAndUserName.innerHTML = `moi <span class="text-xs text-gray-500">${formatTimestamp(
            msg.ts
        )}</span>`;
        msgGroup.appendChild(dateAndUserName);
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
        userMsg.innerText = convertHtmlCodesToAccents(FromB64ToUtf8(msg.text));
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
            const profileDescription = document.getElementById("profile-description")

            profileName.textContent = convertHtmlCodesToAccents(user.object.graphName);
            profilePicture.src = user.object["profilePictureURL"];

            profileDescription.textContent = convertHtmlCodesToAccents(user.object["description"])
            profileModal.classList.remove("hidden");
        });
        msgContainer.appendChild(msgGroup);
        msgContainer.appendChild(userIconContainer);
        return msgContainer;
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
