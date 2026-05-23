// Kreiranje ili čitanje sobe preko URL parametara
const urlParams = new URLSearchParams(window.location.search);
let roomID = urlParams.get('room');
if (!roomID) {
    roomID = Math.random().toString(36).substring(2, 9);
    window.history.pushState({}, '', `?room=${roomID}`);
}
document.getElementById('room-link').innerText = "🔗 Link za drugare: " + window.location.href;

function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    alert("Link je kopiran! Pošalji ga prijateljima.");
}

// P2P Mreža preko Bugout-a
const b = new Bugout(`mafia-room-${roomID}`);
let myName = ""; 
let isHost = false; // Prva osoba koja napravi sobu postaje domaćin

let gameState = {
    phase: "LOBBY", 
    players: []
};

const botNames = ["Marko🤖", "Ana🤖", "Nikola🤖", "Jelena🤖", "Stefan🤖", "Milica🤖"];
const botMessages = [
    "Meni je onaj sumnjiv, ćuti od početka.",
    "Nisam ja mafija, ja sam običan građanin!",
    "Glasajmo za crvenog, on se čudno ponaša.",
    "Ljudi moramo brzo da nađemo mafiju pre nego što nas sve pobiju."
];

// Određivanje domaćina sobe na osnovu mreže
b.on("seen", function(address) {
    // Ako nema nikoga pre nas, mi smo domaćini i kontrolišemo igru
    if (Object.keys(b.connections).length === 0) {
        isHost = true;
    }
});

function joinGame() {
    const input = document.getElementById("username-input");
    const name = input.value.trim();
    
    if (name === "") {
        alert("Molimo te unesi ispravno ime!");
        return;
    }
    
    myName = name; 
    document.getElementById("lobby-screen").style.display = "none";
    document.getElementById("main-game").style.display = "flex";
    
    if (isHost) {
        initPlayers();
    } else {
        // Ako nismo domaćin, tražimo podatke od domaćina
        b.send({ type: "request_sync", sender: myName });
    }
    updateUI();
    addChatMessage("Sistem", `${myName} se priključio sobi!`, "system");
}

function initPlayers() {
    gameState.players = [{ name: myName, role: 'Građanin', isBot: false, alive: true, votes: 0 }];
    botNames.forEach(name => {
        gameState.players.push({ name: name, role: 'Građanin', isBot: true, alive: true, votes: 0 });
    });
    
    let assigned = 0;
    while(assigned < 2) {
        let index = Math.floor(Math.random() * gameState.players.length);
        if(gameState.players[index].role !== 'Mafija') {
            gameState.players[index].role = 'Mafija';
            assigned++;
        }
    }
    broadcastState();
}

// Slanje trenutnog stanja svim igračima u mreži
function broadcastState() {
    if (isHost) {
        b.send({ type: "sync_state", state: gameState });
    }
}

// Primanje mrežnih komandi i sinhronizacija ekrana
b.on("message", function(address, data) {
    if (data.type === "chat") {
        addChatMessage(data.sender, data.text, "other");
    } 
    else if (data.type === "request_sync" && isHost) {
        broadcastState(); // Domaćin šalje podatke novom igraču
    } 
    else if (data.type === "sync_state") {
        gameState = data.state; // Preuzimanje zvaničnog stanja od domaćina
        updateUI();
    }
    else if (data.type === "player_vote" && isHost) {
        // Domaćin prima glasove od pravih igrača
        let target = gameState.players.find(p => p.name === data.target);
        if (target) target.votes++;
        updateUI();
        broadcastState();
    }
});

function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;
    
    b.send({ type: "chat", sender: myName, text: text });
    addChatMessage(myName, text, "user");
    input.value = "";

    if (gameState.phase === "DAY_DISCUSSION" && Math.random() < 0.4 && isHost) {
        setTimeout(botChatAction, 1500);
    }
}

function handleKeyPress(e) { 
    if (e.key === 'Enter') sendMessage(); 
}

function addChatMessage(sender, text, type) {
    const chatBox = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.className = `msg ${type}`;
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function updateUI() {
    const list = document.getElementById("players-list");
    list.innerHTML = "";
    
    document.getElementById("status-box").innerText = `Faza: ${gameState.phase.replace("_", " ")}`;
    
    // Sakrij dugme za početak ako nisi domaćin
    if (!isHost) {
        document.getElementById("start-btn").style.display = "none";
    }

    gameState.players.forEach(p => {
        const card = document.createElement("div");
        card.className = `player-card ${p.alive ? 'alive' : 'dead'}`;
        
        let roleDisplay = "Skriveno";
        if (p.name === myName) roleDisplay = p.role;
        
        const myRealRole = gameState.players.find(pl => pl.name === myName)?.role || 'Građanin';
        if (myRealRole === 'Mafija' && p.role === 'Mafija') {
            card.classList.add('mafia');
            roleDisplay = "Mafija 🔴";
        }

        card.innerHTML = `
            <strong>${p.name}</strong><br>
            <small>Uloga: ${p.alive ? roleDisplay : p.role}</small><br>
            <small>Glasova: ${p.votes}</small>
            <button class="vote-btn ${gameState.phase === 'DAY_VOTING' && p.alive && p.name !== myName ? 'show' : ''}" onclick="voteFor('${p.name}')">Glasaj</button>
        `;
        list.appendChild(card);
    });
}

function voteFor(targetName) {
    if (gameState.phase !== "DAY_VOTING") return;

    if (isHost) {
        let target = gameState.players.find(p => p.name === targetName);
        if (target) target.votes++;
        broadcastState();
    } else {
        // Ako si gost, šalješ svoj glas domaćinu na obradu
        b.send({ type: "player_vote", target: targetName });
    }
    
    addChatMessage("Sistem", `Glasali ste za ${targetName}`, "system");
    gameState.phase = "WAITING_BOTS"; 
    updateUI();
}

function startGame() {
    if (!isHost) return;
    document.getElementById("start-btn").style.display = "none";
    gameState.phase = "DAY_DISCUSSION";
    broadcastState();
    startDayDiscussion();
}

function startDayDiscussion() {
    if (!isHost) return;
    gameState.phase = "DAY_DISCUSSION";
    gameState.players.forEach(p => p.votes = 0);
    updateUI();
    broadcastState();

    setTimeout(() => botChatAction(), 2000);
    setTimeout(() => startDayVoting(), 15000);
}

function startDayVoting() {
    if (!isHost) return;
    gameState.phase = "DAY_VOTING";
    updateUI();
    broadcastState();

    // Botovi glasaju nakon 8 sekundi da pravi igrači imaju vremena
    setTimeout(() => {
        gameState.players.forEach(p => {
            if (p.isBot && p.alive) {
                let target = getRandomAlivePlayer();
                if (target) target.votes++;
            }
        });
        checkVotesResult();
    }, 8000);
}

function checkVotesResult() {
    if (!isHost) return;
    let maxVotes = -1;
    let victim = null;
    gameState.players.forEach(p => {
        if (p.votes > maxVotes) { maxVotes = p.votes; victim = p; }
    });

    if (victim && maxVotes > 0) {
        victim.alive = false;
    }

    if (checkGameOver()) return;
    broadcastState();
    setTimeout(() => startNight(), 4000);
}

function startNight() {
    if (!isHost) return;
    gameState.phase = "NIGHT";
    updateUI();
    broadcastState();

    setTimeout(() => {
        let target = getRandomAlivePlayer();
        if (target) {
            target.alive = false;
        }

        if (checkGameOver()) return;
        broadcastState();
        setTimeout(() => startDayDiscussion(), 4000);
    }, 5000);
}

function botChatAction() {
    if (!isHost) return;
    let livingBots = gameState.players.filter(p => p.isBot && p.alive);
    if (livingBots.length === 0) return;
    let randomBot = livingBots[Math.floor(Math.random() * livingBots.length)];
    let randomMsg = botMessages[Math.floor(Math.random() * botMessages.length)];
    
    // Domaćin šalje čet poruku bota u mrežu
    b.send({ type: "chat", sender: randomBot.name, text: randomMsg });
    addChatMessage(randomBot.name, randomMsg, "other");
}

function getRandomAlivePlayer() {
    let alivePlayers = gameState.players.filter(p => p.alive);
    return alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
}

function checkGameOver() {
    let mafiaCount = gameState.players.filter(p => p.role === 'Mafija' && p.alive).length;
    let citizenCount = gameState.players.filter(p => p.role === 'Građanin' && p.alive).length;

    if (mafiaCount === 0) {
        gameState.phase = "GRAĐANI_POBEDILI";
        broadcastState();
        updateUI();
        return true;
    }
    if (mafiaCount >= citizenCount) {
        gameState.phase = "MAFIJA_POBEDILA";
        broadcastState();
        updateUI();
        return true;
    }
    return false;
}
