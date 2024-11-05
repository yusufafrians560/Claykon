const axios = require('axios');
const fs = require('fs');
const path = require('path');
const figlet = require('figlet');

// Kode warna ANSI untuk konsol
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    fg: {
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        cyan: "\x1b[36m",
    }
};

// Fungsi untuk menampilkan header ASCII
const showHeader = () => {
    figlet('Clayton by BOTERDROP', (err, data) => {
        if (err) {
            console.log(colors.fg.red + "Error generating ASCII art" + colors.reset);
            return;
        }
        console.log(colors.fg.cyan + colors.bright + data + colors.reset);
        console.log(colors.fg.red + colors.dim + "\n Kalo banned nyalahin author, kalo jp kicep. pler luh\n" + colors.reset);
    });
};

// Fungsi untuk membaca isi file hash.txt
const readHashFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                const lines = data.split('\n').map(line => line.trim()).filter(line => line);
                resolve(lines);
            }
        });
    });
};

// Fungsi untuk random nilai di antara min dan max
const getRandomValue = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Fungsi untuk memulai ST Game dengan kenaikan skor bertahap jika ada error 500 atau 429
const startSTGameWithIncrement = async (initData, gameTypeUrl, maxScore = 50, scoreIncrement = 10) => {
    let currentScore = scoreIncrement;
    let success = false;
    let response;

    while (!success && currentScore <= maxScore) {
        try {
            response = await axios.post(gameTypeUrl, { score: currentScore }, {
                headers: {
                    'Init-Data': initData,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*'
                }
            });
            console.log(colors.fg.green + `✔ ST Game started successfully with score: ${currentScore}` + colors.reset);
            success = true;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 500) {
                    console.log(colors.fg.yellow + `⚠ Retrying ST game start with increased score: ${currentScore}` + colors.reset);
                    currentScore += scoreIncrement;
                } else if (error.response.status === 429) {
                    console.log(colors.fg.yellow + "⚠ Too many requests. Retrying ST Game start..." + colors.reset);
                } else {
                    console.log(colors.fg.red + `✖ Failed to start ST Game: ${error}` + colors.reset);
                    break;
                }
            }
        }
    }

    return success ? response.data : null;
};

// Fungsi untuk memulai game dengan logika retry jika terjadi error 429
const startGameWithRetry = async (initData, gameTypeUrl) => {
    let success = false;
    let response;

    while (!success) {
        try {
            response = await axios.post(gameTypeUrl, {}, {
                headers: {
                    'Init-Data': initData,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*'
                }
            });
            console.log(colors.fg.green + `✔ Game started successfully: ${response.data}` + colors.reset);
            success = true;
        } catch (error) {
            if (error.response && error.response.status === 429) {
                console.log(colors.fg.yellow + "⚠ Too many requests. Retrying game start..." + colors.reset);
            } else {
                console.log(colors.fg.red + `✖ Failed to start game: ${error}` + colors.reset);
                break;
            }
        }
    }

    return success ? response.data : null;
};

// Fungsi untuk mengakhiri game dengan request 300 kali
const endGameMultipleRequests = async (initData, finalScore, endGameUrl) => {
    const requests = [];
    let successCount = 0;

    for (let i = 0; i < 300; i++) {
        requests.push(
            axios.post(endGameUrl, {
                score: finalScore,
                multiplier: 1
            }, {
                headers: {
                    'Init-Data': initData,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*'
                }
            }).then(response => {
                if (response.status === 200) {
                    successCount++;
                }
            }).catch(error => {
                // Tidak menampilkan error untuk request ini
            })
        );
    }

    await Promise.all(requests);
    console.log(colors.fg.green + `✔ Game ended: ${successCount} successful requests out of 300.` + colors.reset);
};

// Fungsi untuk menjalankan permainan penuh dari awal hingga akhir
const playGame = async (initData, gameType) => {
    let gameTypeUrl, endGameUrl;

    if (gameType === 'general') {
        gameTypeUrl = 'https://tonclayton.fun/api/game/start';
        endGameUrl = 'https://tonclayton.fun/api/game/over';
    } else if (gameType === 'stack') {
        gameTypeUrl = 'https://tonclayton.fun/api/stack/st-game';
        endGameUrl = 'https://tonclayton.fun/api/stack/en-game';
    } else if (gameType === 'clay') {
        gameTypeUrl = 'https://tonclayton.fun/api/clay/start-game';
        endGameUrl = 'https://tonclayton.fun/api/clay/end-game';
    }

    console.log(colors.fg.blue + `▶ Playing ${gameType} game...` + colors.reset);

    if (gameType === 'stack') {
        const gameSession = await startSTGameWithIncrement(initData, gameTypeUrl);
        if (gameSession) {
            await endGameMultipleRequests(initData, 50, endGameUrl);
        }
    } else {
        const gameSession = await startGameWithRetry(initData, gameTypeUrl);
        if (gameSession) {
            const finalScore = gameType === 'clay' ? getRandomValue(50, 150) : 100;
            await endGameMultipleRequests(initData, finalScore, endGameUrl);
        }
    }
};

// Fungsi untuk mengirim 300 request bersamaan untuk klaim daily login
const sendMultipleDailyLoginRequests = async (initData) => {
    const requests = [];
    let successCount = 0;

    for (let i = 0; i < 300; i++) {
        requests.push(
            axios.post('https://tonclayton.fun/api/user/daily-claim', null, {
                headers: {
                    'Init-Data': initData,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*'
                }
            }).then(response => {
                if (response.status === 200) {
                    successCount++;
                }
            }).catch(error => {
                // Tidak log error di sini sesuai instruksi
            })
        );
    }

    await Promise.all(requests);

    console.log(colors.fg.green + `✔ Total successful daily login requests: ${successCount} out of 300.` + colors.reset);
};

// Fungsi untuk claim daily reward
const claimDailyReward = async (initData) => {
    try {
        const authResponse = await axios.post('https://tonclayton.fun/api/user/authorization', null, {
            headers: {
                'Init-Data': initData,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*'
            }
        });

        const { data: userData } = authResponse;
        console.log(colors.fg.cyan + 'ℹ User Info:' + colors.reset, userData);

        if (userData.dailyReward.can_claim_today) {
            console.log(colors.fg.blue + '▶ Claiming daily reward...' + colors.reset);
            await sendMultipleDailyLoginRequests(initData);
        } else {
            console.log(colors.fg.yellow + '⚠ Daily reward has already been claimed for today.' + colors.reset);
        }
    } catch (error) {
        // Tidak log error di sini sesuai instruksi
    }
};

// Fungsi untuk mengirim 300 request bersamaan untuk claim task reward
const sendMultipleClaimRequests = async (initData, taskId) => {
    const requests = [];
    let successCount = 0;

    for (let i = 0; i < 300; i++) {
        requests.push(
            axios.post('https://tonclayton.fun/api/tasks/claim', {
                task_id: taskId
            }, {
                headers: {
                    'Init-Data': initData,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*'
                }
            }).then(response => {
                if (response.status === 200) {
                    successCount++;
                }
            }).catch(error => {
                // Tidak log error di sini sesuai instruksi
            })
        );
    }

    await Promise.all(requests);

    console.log(colors.fg.green + `✔ Total successful requests: ${successCount} out of 300 for task_id: ${taskId}.` + colors.reset);
};

// Fungsi untuk menjalankan semua tugas (daily, partner, default, super)
const clearTasks = async (initData, taskTypeUrl) => {
    try {
        const taskListResponse = await axios.get(taskTypeUrl, {
            headers: {
                'Init-Data': initData,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*'
            }
        });

        const tasks = taskListResponse.data;

        for (let task of tasks) {
            if (!task.is_completed && !task.is_claimed) {
                console.log(colors.fg.blue + `▶ Completing task: ${task.task.title}` + colors.reset);

                const completeTaskResponse = await axios.post('https://tonclayton.fun/api/tasks/complete', {
                    task_id: task.task.id
                }, {
                    headers: {
                        'Init-Data': initData,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, text/plain, */*'
                    }
                });

                console.log(colors.fg.green + '✔ Task completed:' + colors.reset, completeTaskResponse.data);
                await sendMultipleClaimRequests(initData, task.task.id);
            } else {
                console.log(colors.fg.yellow + `⚠ Task "${task.task.title}" already completed or claimed.` + colors.reset);
            }
        }
    } catch (error) {
        // Tidak log error di sini sesuai instruksi
    }
};

// Fungsi utama untuk menjalankan proses klaim, task, dan game
const startProcess = async () => {
    showHeader();

    const hashFilePath = path.join(__dirname, 'hash.txt');
    const accounts = await readHashFile(hashFilePath);

    for (let i = 0; i < 10; i++) { // Loop selama 10 kali
        for (let account of accounts) {
            console.log(colors.fg.cyan + `ℹ Processing account with Init-Data: ${account}` + colors.reset);

            await playGame(account, 'general'); 
            await playGame(account, 'stack');   
            await playGame(account, 'clay');    

            await claimDailyReward(account);

            console.log(colors.fg.cyan + 'ℹ Clearing daily tasks...' + colors.reset);
            await clearTasks(account, 'https://tonclayton.fun/api/tasks/daily-tasks');

            console.log(colors.fg.cyan + 'ℹ Clearing partner tasks...' + colors.reset);
            await clearTasks(account, 'https://tonclayton.fun/api/tasks/partner-tasks');

            console.log(colors.fg.cyan + 'ℹ Clearing default tasks...' + colors.reset);
            await clearTasks(account, 'https://tonclayton.fun/api/tasks/default-tasks');

            console.log(colors.fg.cyan + 'ℹ Clearing super tasks...' + colors.reset);
            await clearTasks(account, 'https://tonclayton.fun/api/tasks/super-tasks');
        }
        console.log(colors.fg.yellow + "\n⏳ [INFO] Semua akun telah diproses. Menunggu 24 jam sebelum mengulangi proses...\n" + colors.reset);
        await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000)); // Delay 24 jam
    }
};

// Mulai proses klaim, clear task, dan main game
startProcess();
