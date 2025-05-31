const MissionGraphID = "8b714ab9-3aa7-469e-bd20-ad788369cea6";
const statusColors = {
    available: "green",
    in_progress: "yellow",
    submitted: "blue",
    completed: "gray",
};
let previousStatuses = {};
let activeFilters = new Set();
function createFilterButtons(container) {
    const statuses = Object.keys(statusColors);
    const filterBar = document.createElement("div");
    filterBar.className = "flex gap-2 mb-6 justify-center flex-wrap";
    statuses.forEach((status) => {
        const btn = document.createElement("button");
        btn.textContent = status.replace("_", " ").toUpperCase();
        btn.dataset.status = status;
        btn.className = getFilterButtonClass(status, false);
        btn.addEventListener("click", () => {
            if (activeFilters.has(status)) {
                activeFilters.delete(status);
                btn.className = getFilterButtonClass(status, false);
            } else {
                activeFilters.add(status);
                btn.className = getFilterButtonClass(status, true);
            }
            renderAllMissions();
        });
        filterBar.appendChild(btn);
    });
    container.prepend(filterBar);
}
function validateMission() {
    console.log("start to validate mission");
    const missionID = document.getElementById("view-mission-id").textContent;
    console.log("start to validate mission with id : ", missionID);
    document.getElementById("modal-view-mission").classList.add("hidden");
    const originalHTML = document.getElementById(
        `btn-validate-mission-${missionID}`
    );
    originalHTML.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Validation...`;
    originalHTML.disabled = true;
    const selected = document.querySelector("input[name=selected-report]:checked");
    if (!selected) {
        alert("Veuillez sélectionner un rapport à valider.");
        return;
    }

    const reportID = selected.value;
    const comment = document.getElementById("mission-comment").value.trim();
    MissionManager.Contract.validateWithReport(missionID, reportID, comment)
        .then((response) => {
            console.log("number of tx: ", response.tx);
            const promises = response.tx.map((txID) => {
                return Singularity.waitForTx(txID);
            });
            return Promise.all(promises);
        })
        .then(() => {
            console.log("✅ Transactions confirmées, rechargement...");
            renderAllMissions(MissionManager.userAddress)
        })
        .catch((err) => {
            console.error("❌ Erreur lors de la validation :", err);
            alert("Erreur lors de la validation : " + (err.message || err));
        });
}
function getFilterButtonClass(status, active) {
    const base = "px-4 py-1 rounded-full text-sm font-semibold border";
    const color = statusColors[status];
    if (active) {
        return `${base} bg-${color}-600 text-white border-${color}-700`;
    } else {
        return `${base} bg-white text-${color}-700 border-${color}-300 hover:bg-${color}-100`;
    }
}
let allMissions = [];
function renderAllMissions(userAddress) {
    const container = document.getElementById("mission-list");
    container.innerHTML = "";
    previousStatuses = {};
    allMissions.forEach((mission) => {
        previousStatuses[mission.id] = mission["mission-status"];
        if (
            activeFilters.size === 0 ||
            activeFilters.has(mission["mission-status"])
        ) {
            UIManager.renderMission(mission, container, userAddress);
        }
    });
}
let eventManager = new EventManager((data) => {
    if (!data.address) {
        return;
    }
    MissionManager.userAddress = data.address;
    MissionManager.eventManager = eventManager;
    const container = document.getElementById("filters");
    createFilterButtons(container);
    Blackhole.getGraph(MissionGraphID)
        .then((graph) => {
            allMissions = graph.children().map((m) => m.object);
            renderAllMissions(data.address);
            new BlockchainObserver((tx) => {
                if (
                    tx.data.indexOf("urn:pi:graph:action:" + MissionGraphID + ":") !== -1
                ) {
                    console.log("start to rerender missions");
                    Blackhole.getGraph(MissionGraphID).then((graph) => {
                        const newMissions = graph.children().map((m) => m.object);
                        newMissions.forEach((mission) => {
                            const oldStatus = previousStatuses[mission.id];
                            const newStatus = mission["mission-status"];
                            const assignedTo = mission["mission-assigned_to"];
                            if (oldStatus !== newStatus) {
                                previousStatuses[mission.id] = newStatus;
                                console.log("find resolved mission");
                                if (newStatus === "completed" && assignedTo === data.address) {
                                    console.log("show completion modal");
                                    UIManager.showCompletionModal(
                                        data.address,
                                        mission.name,
                                        parseInt(mission["mission-xp_reward"] || 0)
                                    );
                                }
                            }
                        });
                        allMissions = newMissions;
                        renderAllMissions(data.address);
                    });
                }
            }, 1000);
        })
        .catch((error) => {
            console.error("Error loading graph:", error);
        });
});
