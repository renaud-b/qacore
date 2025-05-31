function openMissionViewModal(missionID, userAddress) {
    Blackhole.getGraph("8b714ab9-3aa7-469e-bd20-ad788369cea6").then((g) => {
        g.children().forEach((child) => {
            if (child.object.id != missionID) {
                return;
            }
            console.log("missionID: ", missionID, "child id: ", child.object.id);
            const mission = child.object;
            document.getElementById("view-mission-id").textContent = missionID;
            document.getElementById("view-mission-title").textContent =
                convertHtmlCodesToAccents(mission["mission-title"]);
            document.getElementById("view-mission-obj").textContent =
                convertHtmlCodesToAccents(mission["mission-objective"]);
            document.getElementById("view-mission-desc").textContent =
                convertHtmlCodesToAccents(mission["mission-description"]);
            document.getElementById(
                "view-mission-xp"
            ).textContent = `${mission["mission-xp_reward"]} XP`;
            document.getElementById("mission-comment").value = "";
            Wormhole.executeContract(
                "dbcefa4c-54f4-45b5-8e4c-03ca73123beb",
                "GetReportsForUser",
                { userAddress: mission["mission-assigned_to"] }
            ).then((response) => {
                console.log("reports: ", response);
                const tableBody = document.getElementById("view-report-table");
                tableBody.innerHTML = "";
                response.reports.forEach((report) => {
                    const reportName = report.name.split("___")[0];
                    const row = document.createElement("tr");
                    const formattedReport = Object.keys(report)
                        .filter((key) => {
                            return key.indexOf("report-") === 0;
                        })
                        .map((key) => {
                            return key.replace("report-", "") + ": " + report[key];
                        })
                        .join("\n");
                    row.innerHTML = `
                <td class="px-3 py-2 font-medium text-gray-700"><input name="selected-report" value="${report.id}" type="radio"/></td>
                <td class="px-3 py-2 font-medium text-gray-700">${reportName}</td>
                <td class="px-3 py-2 text-gray-600 whitespace-pre-line text-xs font-mono">${formattedReport}</td>
            `;
                    tableBody.appendChild(row);
                });
            });
            document.getElementById("modal-view-mission").classList.remove("hidden");
        });
    });
}
const UIManager = {
    showToast: function (message, type = "error", duration = 4000) {
        const toaster = document.getElementById("toaster");
        const colors = {
            error: { bg: "bg-red-600", text: "text-white" },
            success: { bg: "bg-green-600", text: "text-white" },
            info: { bg: "bg-blue-600", text: "text-white" },
        };
        const toast = document.createElement("div");
        toast.className = `px-4 py-2 rounded shadow ${colors[type].bg} ${colors[type].text} animate-fade-in`;
        toast.textContent = message;
        toaster.appendChild(toast);
        setTimeout(() => {
            toast.classList.add("animate-fade-out");
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, duration);
    },
    renderMission: function (mission, container, userAddress) {
        const statusMap = {
            available: {
                label: "Disponible",
                color: "green",
                button: `<button id="accept-mission" class="px-4 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">Accepter</button>`,
            },
            in_progress: {
                label: "En cours",
                color: "yellow",
                button: function (mission, userAddress) {
                    return `
            <div class="flex gap-2">
                <button class="px-4 py-1 bg-yellow-600 text-white text-sm rounded opacity-50 cursor-not-allowed">Mission en cours</button>
                <button id="btn-validate-mission-${mission.id}" class="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700" onclick='openMissionViewModal("${mission.id}", "${userAddress}")'>Valider</button>
            </div>`;
                },
            },
            submitted: {
                label: "Soumise",
                color: "blue",
                button: `<button class="px-4 py-1 bg-blue-600 text-white text-sm rounded opacity-50 cursor-not-allowed">En attente de validation</button>`,
            },
            completed: {
                label: "Complétée",
                color: "gray",
                button: `<span class="text-sm text-gray-500 italic">✅ Mission validée</span>`,
            },
        };
        const statusInfo =
            statusMap[mission["mission-status"]] || statusMap["available"];
        const buttonHtml =
            typeof statusInfo.button === "function"
                ? statusInfo.button(mission, userAddress)
                : statusInfo.button;
        const html = `
      <div class="bg-white shadow rounded p-4 border-l-4 border-${
            statusInfo.color
        }-500">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-xl font-bold text-gray-800">${mission.name} – ${
            mission["mission-title"]
        }</h2>
            <p class="text-sm text-gray-600 mb-2">${convertAccentsToHtmlCodes(
            mission["mission-description"]
        )}</p>
            <p class="text-xs text-gray-500 italic">Objectif : ${
            mission["mission-objective"]
        }</p>
          </div>
          <span class="text-xs bg-${statusInfo.color}-100 text-${
            statusInfo.color
        }-700 px-2 py-1 rounded-full">${statusInfo.label}</span>
        </div>
        <div class="mt-4 flex justify-between items-center">
          <span class="text-sm text-gray-700">🎁 Récompense : <strong>${
            mission["mission-xp_reward"]
        } XP</strong></span>
          ${buttonHtml}
        </div>
      </div>
    `;
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        const acceptButton = wrapper.querySelector("#accept-mission");
        if (acceptButton) {
            acceptButton.addEventListener("click", () => {
                const previousContent = acceptButton.textContent;
                acceptButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                MissionManager.Contract.acceptMission(mission.id).then((response) => {
                    if (response.status !== "ok") {
                        acceptButton.textContent = previousContent;
                        UIManager.showToast(response.message, "error");
                        return;
                    }
                    Singularity.waitForTx(response.tx[0]).then(() => {
                        acceptButton.textContent = previousContent;
                    });
                });
            });
        }
        container.appendChild(wrapper);
    },
    showCompletionModal: function (userAddress, missionName, gainedXP = 0) {
        UserProfile.getProfile(userAddress).then((profile) => {
            profile.xp += gainedXP;
            const base = 100;
            let levelUp = false;
            while (profile.xp >= base * profile.level) {
                profile.xp -= base * profile.level;
                profile.level++;
                levelUp = true;
            }
            const progress = UIManager.computeXPProgress(profile.xp, profile.level);
            document.getElementById(
                "completion-modal-text"
            ).textContent = `🎉 La mission "${missionName}" a été validée !`;
            document.getElementById(
                "completion-xp-gain"
            ).textContent = `+${gainedXP} XP`;
            document.getElementById(
                "completion-level"
            ).textContent = `Niveau ${profile.level}`;
            const xpBar = document.getElementById("completion-xp-bar");
            xpBar.style.width = `${progress.percentage}%`;
            xpBar.textContent = `${progress.percentage}%`;
            document.getElementById("completion-modal").classList.remove("hidden");
        });
    },
    hideCompletionModal: function () {
        const modal = document.getElementById("completion-modal");
        modal.classList.add("hidden");
    },
    computeXPProgress: function (xp, level) {
        const base = 100;
        const requiredXP = base * level;
        const percentage = Math.min(100, Math.floor((xp / requiredXP) * 100));
        return { requiredXP, percentage };
    },
};
