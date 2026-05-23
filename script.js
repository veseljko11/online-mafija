// Glavne promenljive igre
let myName = ""; 
let gameState = {
    phase: "LOBBY", 
    players: []
};

const botNames = ["Marko🤖", "Ana🤖", "Nikola🤖", "Jelena🤖", "Stefan🤖", "Milica🤖"];
const botMessages = [
    "Meni je onaj sumnjiv, ćuti od početka.",
    "Nisam ja mafija, ja sam običan građanin!",
    "Glasajmo za njega, on se čudno ponaša.",
    "Ljudi moramo brzo da nađemo mafiju pre nego što nas sve pobiju!"
];

// Pokretanje igre nakon unosa imena
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
    
    initPlayers();
    document.getElementById("start-btn").style.display = "block";
    updateUI();
    addChatMessage("Sistem", `${myName}, dobrodošao! Ti i 6 botova ste u igri. Klikni na dugme ispod da podeliš uloge i pokreneš raspravu.`, "system");
}

// Kreiranje igrača i botova i dodela uloga (Uvek ima 2 mafije)
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
}

function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;
    
    addChatMessage(myName, text, "user");
    input.value = "";

    // Ako je faza rasprave, botovi reaguju na tvoju poruku
    if (gameState.phase === "DAN - RASPRAVA" && Math.random() < 0.6) {
        setTimeout(botChatAction, 1000);
    }
}

function addChatMessage(sender, text, type) {
    const chatBox = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.style.marginBottom = "8px";
    div.style.padding = "5px";
    div.style.borderRadius = "4px";
    
    if (type === "user") div.style.backgroundColor = "#e1ffc7";
    else if (type === "system") div.style.backgroundColor = "#ffe699";
    else div.style.backgroundColor = "#eaeaea";

    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function updateUI() {
    const list = document.getElementById("players-list");
    list.innerHTML = "";
    
    document.getElementById("status-box").innerText = `Faza: ${gameState.phase}`;
    
    gameState.players.forEach(p => {
        const card = document.createElement("div");
        card.style.border = "1px solid #ccc";
        card.style.padding = "10px";
        card.style.borderRadius = "5px";
        card.style.width = "140px";
        card.style.textAlign = "center";
        card.style.background = p.alive ? "#fff" : "#f1d2d2";
        
        let roleDisplay = "Skriveno";
        if (p.name === myName) roleDisplay = p.role;
        
        const myRealRole = gameState.players.find(pl => pl.name === myName)?.role || 'Građanin';
        if (myRealRole === 'Mafija' && p.role === 'Mafija') {
            roleDisplay = "Mafija 🔴";
            card.style.borderColor = "red";
        }

        card.innerHTML = `
            <strong>${p.name}</strong><br>
            <small>Uloga: ${p.alive ? roleDisplay : p.role + " 💀"}</small><br>
            <small>Glasova: ${p.votes}</small><br>
            ${gameState.phase === 'DAN - GLASANJE' && p.alive && p.name !== myName ? `<button onclick="voteFor('${p.name}')" style="margin-top:5px; cursor:pointer;">Glasaj</button>` : ''}
        `;
        list.appendChild(card);
    });
}

function voteFor(targetName) {
    if (gameState.phase !== "DAN - GLASANJE") return;

    let target = gameState.players.find(p => p.name === targetName);
    if (target) target.votes++;
    
    addChatMessage("Sistem", `Glasao si za ${targetName}`, "system");
    
    // Nakon tvog glasa, odmah glasaju i preživeli botovi
    gameState.players.forEach(p => {
        if (p.isBot && p.alive) {
            let botTarget = getRandomAlivePlayer();
            if (botTarget) botTarget.votes++;
        }
    });

    updateUI();
    setTimeout(checkVotesResult, 2000);
}

function startGame() {
    document.getElementById("start-btn").style.display = "none";
    startDayDiscussion();
}

function startDayDiscussion() {
    gameState.phase = "DAN - RASPRAVA";
    gameState.players.forEach(p => p.votes = 0);
    updateUI();

    addChatMessage("Sistem", "Dan je počeo. Razgovarajte u četu i pokušajte da otkrijete ko je mafija! Glasanje počinje za 10 sekundi.", "system");

    // Botovi počinju da pišu u čet
    setTimeout(botChatAction, 2000);
    setTimeout(botChatAction, 5000);
    
    // Prelazak na glasanje nakon 10 sekundi
    setTimeout(() => {
        gameState.phase = "DAN - GLASANJE";
        addChatMessage("Sistem", "Vreme za raspravu je isteklo! Klikni na dugme 'Glasaj' na kartici sumnjivog igrača.", "system");
        updateUI();
    }, 1000);
}

function checkVotesResult() {
    let maxVotes = -1;
    let victim = null;
    let tie = false;

    gameState.players.forEach(p => {
        if (p.alive && p.votes > maxVotes) {
            maxVotes = p.votes;
            victim = p;
            tie = false;
        } else if (p.alive && p.votes === maxVotes) {
            tie = true;
        }
    });

    if (victim && maxVotes > 0 && !tie) {
        victim.alive = false;
        addChatMessage("Sistem", `Izglasan je ${victim.name}! Njegova uloga je bila: ${victim.role}.`, "system");
    } else {
        addChatMessage("Sistem", "Glasanje je nerešeno ili niko nije glasao. Niko ne napušta igru.", "system");
    }

    updateUI();
    if (checkGameOver()) return;

    setTimeout(startNight, 4000);
}

function startNight() {
    gameState.phase = "NOĆ";
    updateUI();
    addChatMessage("Sistem", "Noć je pala. Svi građani spavaju... Mafija bira žrtvu.", "system");

    setTimeout(() => {
        // Mafija (bilo bot ili ti) ubija jednog nasumičnog preživelog građanina
        let citizens = gameState.players.filter(p => p.role === 'Građanin' && p.alive);
        if (citizens.length > 0) {
            let victim = citizens[Math.floor(Math.random() * citizens.length)];
            victim.alive = false;
            addChatMessage("Sistem", `Jutro je svanulo. Mafija je tokom noći likvidirala igrača: ${victim.name}.`, "system");
        }

        updateUI();
        if (checkGameOver()) return;

        setTimeout(startDayDiscussion, 4000);
    }, 4000);
}

function botChatAction() {
    let livingBots = gameState.players.filter(p => p.isBot && p.alive);
    if (livingBots.length === 0) return;
    let randomBot = livingBots[Math.floor(Math.random() * livingBots.length)];
    let randomMsg = botMessages[Math.floor(Math.random() * botMessages.length)];
    
    addChatMessage(randomBot.name, randomMsg, "other");
}

function getRandomAlivePlayer() {
    let alivePlayers = gameState.players.filter(p => p.alive);
    if (alivePlayers.length === 0) return null;
    return alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
}

function checkGameOver() {
    let mafiaCount = gameState.players.filter(p => p.role === 'Mafija' && p.alive).length;
    let citizenCount = gameState.players.filter(p => p.role === 'Građanin' && p.alive).length;

    if (mafiaCount === 0) {
        gameState.phase = "KRAJ - GRAĐANI SU POBEDILI! 🎉";
        updateUI();
        return true;
    }
    if (mafiaCount >= citizenCount) {
        gameState.phase = "KRAJ - MAFIJA JE POBEDILA! 🔴";
        updateUI();
        return true;
    }
    return false;
}

// Povezivanje komandi sa HTML elementima
document.getElementById("join-btn").addEventListener("click", joinGame);
document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("chat-input").addEventListener("keypress", function(e) {
    if (e.key === 'Enter') sendMessage();
});
window.voteFor = voteFor;
