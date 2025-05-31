const MissionGraphID = "8b714ab9-3aa7-469e-bd20-ad788369cea6"
const eventManager = new EventManager((data) => {
    if (!data.address) {
        return
    }

    Blackhole.getGraph(MissionGraphID).then((graph) => {

        const missions = graph.children().map(n => n.object);
        // Classement par status
        const submitted = missions.filter(m => m["mission-status"] === "submitted");
        const inProgress = missions.filter(m => m["mission-status"] === "in_progress");
        const completed = missions.filter(m => m["mission-status"] === "completed");
        const available = missions.filter(m => m["mission-status"] === "available");

        // Affichage
        AdminUI.renderMissionList("submitted", submitted);
        AdminUI.renderMissionList("in_progress", inProgress);
        AdminUI.renderMissionList("completed", completed);
        AdminUI.renderMissionList("available", available);
    })


    // Toggle modals
    document.getElementById("btn-users").onclick = () => {
        document.getElementById("modal-users").classList.remove("hidden");
    };
    document.getElementById("btn-stats").onclick = () => {
        document.getElementById("modal-stats").classList.remove("hidden");
    };
    document.getElementById("btn-add-mission").onclick = () => {
        document.getElementById("modal-create-mission").classList.remove("hidden");
    };

});

function saveMissionEdit() {
    const id = document.getElementById("edit-mission-id").value;
    const title = convertAccentsToHtmlCodes(document.getElementById("edit-mission-title").value);
    const desc = convertAccentsToHtmlCodes(document.getElementById("edit-mission-desc").value);
    const obj = convertAccentsToHtmlCodes(document.getElementById("edit-mission-obj").value);
    const xp = parseInt(document.getElementById("edit-mission-xp").value || "0");

    const updates = {
        "mission-title": title,
        "mission-description": desc,
        "mission-objective": obj,
        "mission-xp_reward": xp
    };

    const userAddress = eventManager.userAddress; // à stocker lors de l’eventManager init

    // Ciblage du bouton
    const saveBtn = document.querySelector("#modal-edit-mission button.bg-blue-600");
    const originalHTML = saveBtn.innerHTML;


    MissionStore.editMission(id, updates, userAddress, eventManager, () => {
        // Affichage spinner
        saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
        saveBtn.disabled = true;

    })
        .then((res) => {
            AdminUI.refreshMissionById(MissionGraphID, id);
            document.getElementById("modal-edit-mission").classList.add("hidden");


            // Reset bouton
            saveBtn.innerHTML = originalHTML;
            saveBtn.disabled = false;
        })
        .catch((err) => {
            alert("Échec de la modification : " + err);

            // Reset bouton même en cas d’échec
            saveBtn.innerHTML = originalHTML;
            saveBtn.disabled = false;
        });
}

function editMission(id, title, desc, obj, xp) {
    document.getElementById("edit-mission-id").value = id;
    document.getElementById("edit-mission-title").value = convertHtmlCodesToAccents(title);
    document.getElementById("edit-mission-desc").value = convertHtmlCodesToAccents(desc);
    document.getElementById("edit-mission-obj").value = convertHtmlCodesToAccents(obj);
    document.getElementById("edit-mission-xp").value = xp;

    document.getElementById("modal-edit-mission").classList.remove("hidden");
}

function fakeEditMission() {
    editMission('mission_alpha', 'Mission Alpha', 'Tester...', 'Reproduire bug', 50)
}

function openValidationModal(mission) {
    document.getElementById("validate-title").textContent = mission.title;
    document.getElementById("validate-objective").textContent = mission.objective;
    document.getElementById("validate-description").textContent = mission.description;
    document.getElementById("validate-xp").textContent = `${mission.xp} XP`;
    document.getElementById("validate-comment").textContent = mission.comment || "Aucun commentaire";

    // Rapport = tableau dynamique
    const tableBody = document.getElementById("validate-report-table");
    tableBody.innerHTML = "";
    Object.entries(mission.report || {}).forEach(([key, value]) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="px-3 py-2 font-medium text-gray-700">${key}</td>
            <td class="px-3 py-2 text-gray-600">${value}</td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById("modal-validate-mission").classList.remove("hidden");
}

function openFakeValidation() {
    openValidationModal({
        title: "Mission Gamma",
        objective: "Analyser les artefacts",
        description: "Observer si les artefacts sont cumulables ou non après 10 vagues.",
        xp: 100,
        comment: "RAS côté artefacts, mais bug graphique noté sur la vague 9.",
        report: {
            "Vagues tenues": "10",
            "Artifacts": "nano-core, overload-catalyst",
            "Unité principale": "Dronoid",
            "Synergie testée": "vision + cluster",
            "Crash": "non"
        }
    });
}

function createMission() {
    const label = document.getElementById("new-mission-title").value.trim();
    const desc = document.getElementById("new-mission-desc").value.trim();
    const obj = document.getElementById("new-mission-obj").value.trim();
    const xp = parseInt(document.getElementById("new-mission-xp").value.trim() || "0");

    if (!label || !desc || !obj || isNaN(xp)) {
        alert("Tous les champs sont obligatoires !");
        return;
    }

    const updates = {
        "mission-title": convertAccentsToHtmlCodes(label),
        "mission-description": convertAccentsToHtmlCodes(desc),
        "mission-objective": convertAccentsToHtmlCodes(obj),
        "mission-xp_reward": xp,
        "mission-status": "available"
    };

    const submitBtn = document.querySelector("#modal-create-mission button.bg-green-600");
    const originalHTML = submitBtn.innerHTML;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;
    submitBtn.disabled = true;

    const userAddress = eventManager.userAddress;

    MissionStore.createMission(updates, userAddress, eventManager, () => {
        console.log("Mission soumise.");
    })
        .then(() => {
            document.getElementById("modal-create-mission").classList.add("hidden");
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;

            // Rafraîchit la liste
            Blackhole.getGraph(MissionGraphID).then((graph) => {
                const missions = graph.children().map(n => n.object);
                AdminUI.renderMissionList("submitted", missions.filter(m => m["mission-status"] === "submitted"));
                AdminUI.renderMissionList("in_progress", missions.filter(m => m["mission-status"] === "in_progress"));
                AdminUI.renderMissionList("completed", missions.filter(m => m["mission-status"] === "completed"));
                AdminUI.renderMissionList("available", missions.filter(m => m["mission-status"] === "available"));
            });
        })
        .catch((err) => {
            alert("Erreur lors de la création : " + err);
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        });
}