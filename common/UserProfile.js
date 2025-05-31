const UserProfileContractID = "31b3ad10-6d3f-4a8e-acd8-fdfd41ef72bc";
class Profile {
    constructor(userProfileNode) {
        this.xp = userProfileNode["profile-xp"];
        this.level = userProfileNode["profile-level"];
    }
}
const UserProfile = {
    getProfile: function (address) {
        return new Promise((resolve, reject) => {
            Wormhole.executeContract(UserProfileContractID, "GetUserProfile", {
                address: address,
            })
                .then((response) => {
                    console.log("response: ", response);
                    if (response.status !== "ok") {
                        console.error("unable to get user profile", response);
                        reject(response);
                        return;
                    }
                    resolve(new Profile(response.profile));
                })
                .catch(reject);
        });
    },
    finishMission: function (address, xp) {
        return new Promise((resolve, reject) => {
            Wormhole.executeContract(UserProfileContractID, "GetUserProfile", {
                address: address,
            })
                .then((res) => res.json())
                .then(resolve)
                .catch(reject);
        });
    },
};
