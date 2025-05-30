function getUserProfile() {
    const profile = JSON.parse(localStorage.getItem("qa_user_profile") || '{"level":1,"xp":0}');
    return profile;
}

function saveUserProfile(profile) {
    localStorage.setItem("qa_user_profile", JSON.stringify(profile));
}

function computeXPProgress(profile) {
    const base = 100;
    const requiredXP = base * profile.level;
    const percentage = Math.min(100, Math.floor((profile.xp / requiredXP) * 100));
    return { requiredXP, percentage };
}