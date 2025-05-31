const statusColors = {
    available: "green",
    in_progress: "yellow",
    submitted: "blue",
    completed: "gray",
};
const AdminUI = {
    renderMissionList: function (status, missions) {
        const containerMap = {
            submitted: document.querySelector("[data-status=submitted]"),
            in_progress: document.querySelector("[data-status=in_progress]"),
            available: document.querySelector("[data-status=available]"),
            completed: document.querySelector("[data-status=completed]"),
        };
        const container = containerMap[status];
        if (!container) return;
        container.innerHTML = "";
        missions.forEach((mission) => {
            this.renderCard(mission, status, container);
        });
    },
    refreshMissionById: function (missionGraphID, id) {
        Blackhole.getGraph(missionGraphID).then((graph) => {
            const missionNode = graph.children().find((n) => n.object.id === id);
            if (!missionNode) {
                console.warn("Mission introuvable :", id);
                return;
            }
            const mission = missionNode.object;
            const status = mission["mission-status"];
            const containerMap = {
                submitted: document.querySelector("[data-status=submitted]"),
                in_progress: document.querySelector("[data-status=in_progress]"),
                available: document.querySelector("[data-status=available]"),
                completed: document.querySelector("[data-status=completed]"),
            };
            const container = containerMap[status];
            if (!container) {
                console.warn("Conteneur introuvable pour le statut :", status);
                return;
            }
            const allCards = Array.from(container.querySelectorAll("h2"));
            const match = allCards.find((h2) => h2.id === mission.id);
            if (match) {
                match.closest("div.p-4.bg-gray-50").remove();
            }
            AdminUI.renderCard(mission, status, container);
        });
    },
    renderCard: function (mission, status, container) {
        const wrapper = document.createElement("div");
        wrapper.className = "p-4 bg-gray-50 rounded border";
        const buildCard = (mission, status, assignedUser = "?") => {
            const base = `
            <h2 class="font-bold text-lg" id="${mission.id}">${mission.name} - ${mission["mission-title"]}</h2>
            <p class="text-sm text-gray-600">${mission["mission-description"]}</p>
            <p class="text-xs text-gray-500 italic mt-1">🎯 Objectif : ${mission["mission-objective"]}</p>
            <p class="text-xs text-gray-500 italic mt-2">Assignée à : <strong>${assignedUser}</strong></p>
            <div class="flex justify-between items-center mt-2">
                <span class="text-sm text-${statusColors[status]}-600 font-medium">🎁 ${mission["mission-xp_reward"]} XP</span>
        `;
            let actions = "";
            if (status === "submitted") {
                actions += `<button class="px-3 py-1 bg-blue-600 text-white rounded text-sm" onclick='AdminUI.validate(${JSON.stringify(
                    mission
                )})'>Valider mission</button>`;
            } else {
                actions += `<button class="edit-btn px-3 py-1 border border-blue-500 text-blue-600 rounded text-sm" onclick='editMission("${mission.id}", "${mission["mission-title"]}", "${mission["mission-description"]}", "${mission["mission-objective"]}", ${mission["mission-xp_reward"]})'>Modifier</button>`;
            }
            wrapper.innerHTML = base + actions + `</div>`;
            return wrapper;
        };
        const assignedUser = mission["mission-assigned_to"];
        if (assignedUser) {
            Wormhole.getUserProfile(assignedUser)
                .then((profileGraph) => {
                    const card = buildCard(
                        mission,
                        status,
                        profileGraph.object.graphName
                    );
                    container.appendChild(card);
                })
                .catch(() => {
                    const card = buildCard(mission, status);
                    container.appendChild(card);
                });
        } else {
            const card = buildCard(mission, status);
            container.appendChild(card);
        }
    },
    validate: function (mission) {
        openValidationModal(mission);
        window.__missionToValidate = mission;
    },
};
