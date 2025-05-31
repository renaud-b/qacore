const ReportGraphID = "7e23bcec-f608-4124-8abd-e3fafc1ddb02";
const ReportStore = {
    getReport: function (reportID) {
        return new Promise((resolve, reject) => {
            Blackhole.getGraph(ReportGraphID).then((g) => {
                const report = g.findByID(reportID)
                if (!report) {
                    reject("Report not found")
                    return
                }
                resolve(report)
            }).catch(reject)
        });
    },
}