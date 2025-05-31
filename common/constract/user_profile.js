const UserProfileGraphID = "fdd9694c-99a4-4193-a6e6-643506246e5d";
function GetUserProfile(address) {
    const graph = new GraphElement(
        UserProfileGraphID,
        Blackhole.LoadGraph(UserProfileGraphID)
    );
    const profileNode = graph
        .children()
        .find((n) => n.object["profile-address"] === address);
    if (!profileNode) {
        return { status: "error", address: address, message: "Profile not found." };
    }
    return { status: "ok", profile: profileNode.object };
}
function FinishMission(address, xp) {
    const graph = new GraphElement(
        UserProfileGraphID,
        Blackhole.LoadGraph(UserProfileGraphID)
    );
    const profileNode = graph
        .children()
        .find((n) => n.object["profile-address"] === address);
    if (!profileNode) {
        return { status: "error", message: "Profile not found." };
    }
    const base = 100;
    const xpGain = parseInt(xp);
    let xpTotal = parseInt(profileNode.object["profile-xp"]) + xpGain;
    let level = parseInt(profileNode.object["profile-level"]);
    let leveledUp = false;
    while (xpTotal >= base * level) {
        xpTotal -= base * level;
        level++;
        leveledUp = true;
    }
    Blackhole.UpdateElement(
        UserProfileGraphID,
        profileNode.id,
        "profile-xp",
        xpTotal
    );
    Blackhole.UpdateElement(
        UserProfileGraphID,
        profileNode.id,
        "profile-level",
        level
    );
    return {
        status: "ok",
        tx: Blackhole.Commit(),
        newXP: xpTotal,
        newLevel: level,
        leveledUp: leveledUp,
    };
}
