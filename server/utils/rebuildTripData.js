const { execFile } = require("child_process");
const path = require("path");

function runNodeScript(scriptPath) {
    return new Promise((resolve, reject) => {
        execFile("node", [scriptPath], { cwd: path.dirname(scriptPath) }, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ 스크립트 실행 실패: ${scriptPath}`);
                console.error(stderr || error.message);
                return reject(error);
            }

            if (stdout) {
                console.log(stdout);
            }
            if (stderr) {
                console.warn(stderr);
            }

            resolve();
        });
    });
}

async function rebuildTripData() {
    const serverRoot = path.join(__dirname, "..");
    const scriptsDir = path.join(serverRoot, "scripts");

    // 네 현재 구조 기준
    const convertScript = path.join(scriptsDir, "convertInseanqToUTS.js");
    const mergeScript = path.join(scriptsDir, "mergeUTSTrips.js");

    console.log("🔄 관리자 저장 후 UTS 재생성 시작");

    await runNodeScript(convertScript);
    await runNodeScript(mergeScript);

    console.log("✅ 관리자 저장 후 UTS 재생성 완료");
}

module.exports = rebuildTripData;