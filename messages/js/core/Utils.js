const Utils = {
    showGlobalLoading: function (text = "Traitement...") {
        document.getElementById("global-loading-text").textContent = text;
        document
            .getElementById("global-loading-overlay")
            .classList.remove("hidden");
    },
    hideGlobalLoading: function () {
        document.getElementById("global-loading-overlay").classList.add("hidden");
    },
    applyIfAdmin: function (userAddress, callback, ifNot = () => { }) {
        if (userAddress === "1N6QSH7vsYHyeeo8L5KWVTK78HDRbkEqzc") {
            callback();
        } else {
            ifNot()
        }
    },
};
