function average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}
const StatsUI = {
    showStats: function () {
        const container = document.getElementById("stats-content");
        container.innerHTML = "<p>Chargement des statistiques...</p>";
        Blackhole.getGraph("7e23bcec-f608-4124-8abd-e3fafc1ddb02").then((graph) => {
            const reports = graph.children().map((n) => n.object);
            if (reports.length === 0) {
                container.innerHTML = "<p>Aucun rapport disponible.</p>";
                return;
            }
            let count = reports.length;
            let waveCounts = reports.map((r) => parseInt(r["report-waves"] || 0));
            let avgWaves = (waveCounts.reduce((a, b) => a + b, 0) / count).toFixed(1);
            const avgDurationInMs = average(
                reports.map((r) => parseInt(r["report-duration"] || 0))
            ).toFixed(1);
            console.log("avgDurationInMs: ", avgDurationInMs);
            const averageDuration = (avgDurationInMs / 60000).toFixed(1);
            container.innerHTML = `
                <p><strong>Rapports analysés :</strong> ${count}</p>
                <p><strong>Vagues moyennes tenues :</strong> ${avgWaves}</p>
                <p><strong>Durée moyenne :</strong> ${averageDuration} min</p>
            `;
            StatsUI.renderChart(reports);
        });
    },
    showUserStats: function () {
        const container = document.getElementById("users-stats");
        container.innerHTML = "<p>Chargement en cours...</p>";
        Blackhole.getGraph("7e23bcec-f608-4124-8abd-e3fafc1ddb02").then((graph) => {
            const reports = graph.children().map((n) => n.object);
            if (reports.length === 0) {
                container.innerHTML = "<p>Aucun rapport trouvé.</p>";
                return;
            }
            const grouped = {};
            reports.forEach((r) => {
                const user = r["author-id"] || "Inconnu";
                if (!grouped[user]) grouped[user] = [];
                grouped[user].push(r);
            });
            container.innerHTML = "";
            for (let user in grouped) {
                const list = grouped[user];
                const count = list.length;
                const avgWaves = average(
                    list.map((r) => parseInt(r["report-waves"] || 0))
                ).toFixed(1);
                const avgScore = average(
                    list.map((r) => parseFloat(r["report-score"] || 0))
                ).toFixed(1);
                const avgDurationInMs = average(
                    list.map((r) => parseInt(r["report-duration"] || 0))
                ).toFixed(1);
                const avgDuration = (avgDurationInMs / 60000).toFixed(1);
                const totalArtifacts = list
                    .map((r) => parseInt(r["artifact-count"] || 0))
                    .reduce((a, b) => a + b, 0);
                const card = document.createElement("div");
                card.className = "border p-4 rounded bg-gray-100";
                card.innerHTML = `
                <h3 class="font-bold">${user}</h3>
                <p><strong>Rapports :</strong> ${count}</p>
                <p><strong>Vagues moyennes :</strong> ${avgWaves}</p>
                <p><strong>Score moyen :</strong> ${avgScore}</p>
                <p><strong>Durée moyenne :</strong> ${avgDuration} min</p>
                <p><strong>Artefacts collectés :</strong> ${totalArtifacts}</p>
            `;
                container.appendChild(card);
            }
        });
    },
    renderChart: function (reports) {
        const canvas = document.getElementById("chart-canvas");
        canvas.classList.remove("hidden");
        const labels = reports.map((r) => r.name.split("___")[0]);
        const waves = reports.map((r) => parseInt(r["report-waves"] || 0));
        const scores = reports.map((r) => parseFloat(r["report-score"] || 0));
        new Chart(canvas, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    { label: "Vagues", data: waves, borderWidth: 2, tension: 0.2 },
                ],
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true, max: 20 } },
            },
        });
    },
};
