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
                button: `<button class="px-4 py-1 bg-yellow-600 text-white text-sm rounded opacity-50 cursor-not-allowed">Mission en cours</button>`,
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
        const status =
            statusMap[mission["mission-status"]] || statusMap["available"];
        const html = `
      <div class="bg-white shadow rounded p-4 border-l-4 border-${
            status.color
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
          <span class="text-xs bg-${status.color}-100 text-${
            status.color
        }-700 px-2 py-1 rounded-full">${status.label}</span>
        </div>
        <div class="mt-4 flex justify-between items-center">
          <span class="text-sm text-gray-700">🎁 Récompense : <strong>${
            mission["mission-xp_reward"]
        } XP</strong></span>
          ${status.button}
        </div>
      </div>
    `;
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        const acceptButton = wrapper.querySelector("#accept-mission");
        if (acceptButton) {
            console.log("accept button found for mission:", mission.id);
            acceptButton.addEventListener("click", () => {
                console.log("accepting mission:", mission.id, "for user:", userAddress);
                const previousContent = acceptButton.textContent;
                acceptButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                MissionManager.Contract.acceptMission(mission.id, userAddress).then(
                    (response) => {
                        if (response.status !== "ok") {
                            acceptButton.textContent = previousContent;
                            UIManager.showToast(response.message, "error");
                            return;
                        }
                        Singularity.waitForTx(response.tx[0]).then(() => {
                            acceptButton.textContent = previousContent;
                        });
                    }
                );
            });
        }
        container.appendChild(wrapper);
    },
};
