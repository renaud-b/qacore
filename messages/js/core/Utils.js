const Utils = {
    showGlobalLoading: function (text = "Traitement...") {
        document.getElementById("global-loading-text").textContent = text;
        document.getElementById("global-loading-overlay").classList.remove("hidden");
    },

    hideGlobalLoading: function () {
        document.getElementById("global-loading-overlay").classList.add("hidden");
    },
};
