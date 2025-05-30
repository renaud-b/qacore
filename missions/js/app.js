const MissionGraphID = "8b714ab9-3aa7-469e-bd20-ad788369cea6";
const statusColors = {
    available: "green",
    in_progress: "yellow",
    submitted: "blue",
    completed: "gray",
};
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
    allMissions.forEach((mission) => {
        if (
            activeFilters.size === 0 ||
            activeFilters.has(mission["mission-status"])
        ) {
            UIManager.renderMission(mission, container, userAddress);
        }
    });
}
let eventManager = new EventManager((data) => {
    console.log("user address: ", data.address);
    MissionManager.eventManager = eventManager;
    const container = document.getElementById("filters");
    createFilterButtons(container);
    Blackhole.getGraph(MissionGraphID, "https://utopixia.com")
        .then((graph) => {
            allMissions = graph.children().map((m) => m.object);
            renderAllMissions(data.address);
            new BlockchainObserver((tx) => {
                if (
                    tx.data.indexOf("urn:pi:graph:action:" + MissionGraphID + ":") !== -1
                ) {
                    console.log("start to rerender missions");
                    Blackhole.getGraph(MissionGraphID, "https://utopixia.com").then(
                        (graph) => {
                            allMissions = graph.children().map((m) => m.object);
                            renderAllMissions(data.address);
                        }
                    );
                }
            }, 1000);
        })
        .catch((error) => {
            console.error("Error loading graph:", error);
        });
});
