var tick = 0;
var gameSpeed = 6;
var playerTookTurn = false;

// render - this is the main loop, update everything where the tick is specified
function drawGame() {
    if (ctx == null) { return; }

    var sec = Math.floor(Date.now() / 1000);
    if (sec != currentSecond) {
        currentSecond = sec;
        framesLastSecond = frameCount;
        frameCount = 1;
    } else {
        frameCount++;
    }

    gameSpeed = Math.floor(framesLastSecond / 9);

    for (var y = 0; y < renderH; y++) {
        for (var x = 0; x < renderW; x++) {
            ctx.fillStyle = gameMap[y][x].outlineColor;
            ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
            ctx.fillStyle = gameMap[y][x].displayColor;
            ctx.fillRect(x * tileW + 1, y * tileH + 1, tileW - 2, tileH - 2);
        }
    }

    // update everything on this tick
    if (tick >= gameSpeed) {
        if (playerChar.moveQueue.length && !playerTookTurn) {
            var newCoords = playerChar.moveQueue.shift();
            if (Array.isArray(newCoords)) {
                var coordsToActOn = newCoords[1];
                switch (newCoords[0]) {
                    case LOOT:
                        // looting does not take up an action so do not set playerTookTurn to true
                        openContainer(coordsToActOn);
                        break;
                    case OPEN:
                        gameMap[coordsToActOn.y][coordsToActOn.x].getFirstContentByType("Door").toggleOpen();
                        gameMap[coordsToActOn.y][coordsToActOn.x].updateOverride();
                        playerTookTurn = true;
                        break;
                }
            } else {
                gameMap[playerCoords.y][playerCoords.x].removeContentByType("Player");
                gameMap[newCoords.y][newCoords.x].addContents(playerChar);
                playerCoords = newCoords;
                playerTookTurn = true;
            }
        }
        tick = 0;
    }

    ctx.fillStyle = "#ff0000";
    ctx.fillText("FPS: " + framesLastSecond, 10, 20);

    tick++;
    playerTookTurn = false;

    requestAnimationFrame(drawGame);
}

function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return {
        x: x,
        y: y
    }
}

const canvas = document.querySelector('canvas');
canvas.addEventListener('mousedown', function (e) {
    clickLocation = getCursorPosition(canvas, e);
    squareX = Math.floor(clickLocation.x / tileW);
    squareY = Math.floor(clickLocation.y / tileH);
    if (squareX == selectorCoords.x && squareY == selectorCoords.y) {
        moveToSelector();
    } else {
        if (selectorCoords.x != null && selectorCoords != null) {
            gameMap[selectorCoords.y][selectorCoords.x].removeContentByType("Selector");
        }
        gameMap[squareY][squareX].addContents(new Selector());
        selectorCoords.x = squareX;
        selectorCoords.y = squareY;
        document.getElementById("selected-tile").innerHTML = gameMap[selectorCoords.y][selectorCoords.x].name;
        var contentString = "";
        var lootable = false;
        var hasDoor = false;
        var isDoorOpen = false;
        var isDoorLocked = false;
        var hasCharacter = false;
        for (var i = 0; i < gameMap[selectorCoords.y][selectorCoords.x].contents.length - 1; i++) {
            var typeString = gameMap[selectorCoords.y][selectorCoords.x].contents[i].typeString();
            if (typeString == "Character") hasCharacter = true;
            if (typeString == "Door") {
                hasDoor = true;
                isDoorLocked = gameMap[selectorCoords.y][selectorCoords.x].contents[i].locked;
                isDoorOpen = !gameMap[selectorCoords.y][selectorCoords.x].contents[i].impassable;
            }
            if (gameMap[selectorCoords.y][selectorCoords.x].contents[i].containsLoot) lootable = true;
            contentString += (typeString == "Character" || typeString == "Player" ? gameMap[selectorCoords.y][selectorCoords.x].contents[i].name : typeString) + "<br/>";
        }
        document.getElementById("contents-of-tile").innerHTML = "Contents: <br/>" +
            (contentString.length == 0 ? "Nothing" : contentString);
        document.getElementById("actions-tile").innerHTML = "";
        if (lootable) {
            document.getElementById("actions-tile").innerHTML += getLootButton();
        }
        if (hasDoor) {
            if (isDoorOpen) {
                document.getElementById("actions-tile").innerHTML += getCloseButton();
            } else {
                if (isDoorLocked) {
                    document.getElementById("actions-tile").innerHTML += getDisabledOpenButton();
                } else {
                    document.getElementById("actions-tile").innerHTML += getOpenButton();
                }
            }
        }
        if (gameMap[selectorCoords.y][selectorCoords.x].type < 100) {
            document.getElementById("actions-tile").innerHTML += getMoveButton();
        }
        document.getElementById("actions-tile").innerHTML += getDeselectButton();
    }
});

function getMoveButton() {
    return "<button onclick='moveToSelector()' class='mr-2'><i class='fa fa-hiking'></i><br/>Move</button>";
}

function getLootButton() {
    return "<button onclick='moveAndLootSelector()' class='mr-2'><i class='fa fa-box-open'></i><br/>Loot</button>"
}

function getOpenButton() {
    return "<button onclick='moveAndToggleDoor()' class='mr-2'><i class='fa fa-door-open'></i><br/>Open</button>"
}

function getDisabledOpenButton() {
    return "<button disabled class='mr-2'><i class='fa fa-door-open'></i><br/>Open</button>"
}

function getCloseButton() {
    return "<button onclick='moveAndToggleDoor()' class='mr-2'><i class='fa fa-door-closed'></i><br/>Close</button>"
}

function getDeselectButton() {
    return "<button onclick='removeSelector()' class='mr-2'><i class='fa fa-remove'></i><br/>Cancel</button>";
}

function updateHealthDisplay() {
    document.getElementById("health-head").innerHTML = "Head: "+playerChar.head +"%";
    document.getElementById("health-rarm").innerHTML = "Right arm: "+playerChar.rightarm+"%";
    document.getElementById("health-torso").innerHTML = "Torso: "+playerChar.torso+"%";
    document.getElementById("health-larm").innerHTML = "Left arm: "+playerChar.leftarm+"%";
    document.getElementById("health-rleg").innerHTML = "Right leg: "+playerChar.rightleg+"%";
    document.getElementById("health-lleg").innerHTML = "Left leg: "+playerChar.leftleg+"%";
}

function openContainer() {

}

function moveAndToggleDoor() {
    var closestAdjacentPoint = getAdjacentPointClosestToPlayer(selectorCoords);
    playerChar.moveQueue = getShortestPath(playerCoords, closestAdjacentPoint, PATH);
    playerChar.moveQueue.push([OPEN, { x: selectorCoords.x, y: selectorCoords.y }]);
    removeSelector();
}

function removeSelector() {
    gameMap[selectorCoords.y][selectorCoords.x].removeContentByType("Selector");
    document.getElementById("selected-tile").innerHTML = "No tile selected";
    document.getElementById("contents-of-tile").innerHTML = "";
    document.getElementById("actions-tile").innerHTML = "";
    selectorCoords.x = null;
    selectorCoords.y = null;
}

function moveToSelector() {
    playerChar.moveQueue = getShortestPath(playerCoords, selectorCoords, PATH);
    gameMap[selectorCoords.y][selectorCoords.x].removeContentByType("Selector");
    document.getElementById("selected-tile").innerHTML = "No tile selected";
    document.getElementById("contents-of-tile").innerHTML = "";
    document.getElementById("actions-tile").innerHTML = "";
    selectorCoords.x = null;
    selectorCoords.y = null;
}

function moveAndLootSelector() {
    var closestAdjacentPoint = getAdjacentPointClosestToPlayer(selectorCoords);
    playerChar.moveQueue = getShortestPath(playerCoords, closestAdjacentPoint, PATH);
    playerChar.moveQueue.push([LOOT, { x: selectorCoords.x, y: selectorCoords.y }]);
    removeSelector();
}

function getAdjacentPointClosestToPlayer(point) {
    var adjPoints = [];
    var minPoint = [MAX_DISTANCE, { x: MAX_DISTANCE, y: MAX_DISTANCE }];
    for (var i = 0; i < 4; i++) {
        var toCheck = { x: point.x + ROW_NUM[i], y: point.y + COL_NUM[i] };
        var curDist = getShortestPath(playerCoords, toCheck, DIST);
        if (curDist < minPoint[0]) {
            minPoint = [curDist, toCheck];
        }
    }
    if (minPoint[0] != MAX_DISTANCE) {
        return minPoint[1];
    } else {
        return playerCoords;
    }
}

function getDistance(point1, point2) {
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + (Math.pow(point1.y - point2.y, 2)));
}

const skills = {
    sword: [],
    axe: [],
    spear: [],
    bow: [],
    rifle: [],
    handgun: [],
    shotgun: [],
    fire: [],
    water: [],
    air: [],
    earth: [],
    white: [],
    dark: [],
}

const races = [
    ["Human", [7, 7, 7, 7, 4, 7]],
    ["Lizard", [7, 7, 4, 7, 10, 4]],
    ["Dwarf", [10, 8, 4, 4, 7, 5]],
    ["Elf", [5, 5, 10, 8, 4, 7]],
    ["Orc", [7, 10, 5, 3, 7, 4]],
];

const childStory = [
    ["Orphan", [1, 0, 0, 0, 0, 0]],
    ["Cave-child", [1, 1, 0, -1, 0, 0]],
    ["Child Spy", [0, 0, 2, 1, 0, 0]],
    ["Child Actor", [0, 0, 2, -1, 0, 0]],
    ["Coma Child", [-1, -1, 0, 0, 0, 2]],
    ["Cult Child", [1, 0, 0, 0, 1, 1]],
    ["Child worker", [1, 1, 1, -1, 0, -1]],
    ["Child soldier", [0, 2, 0, -1, 1, -1]],
    ["Reclusive Child", [0, 0, 0, 1, -1, -1]],
    ["Scout", [0, 0, 3, 0, -1, 0]],
    ["Shelter Child", [0, 0, 0, 1, 1, 0]],
    ["Shopkeeper", [0, 0, 1, 0, 1, -1]],
    ["Sickly Child", [-1, -1, 0, 1, 0, 1]],
    ["Sole Survivor", [1, 2, 0, 0, 1, 1]],
    ["Test Subject", [0, 2, 0, 2, 0, -2]],
    ["War Refugee", [1, 0, 1, 0, 0, 1]],
    ["Scribe", [0, 0, 1, 1, 0, 0]],
    ["Student of Magic", [-1, -1, 0, 2, 0, 2]]
];

const adultStory = [
    ["Actor", [0, 1, 3, -2, 0, 2]],
    ["Architect", [1, 0, 0, 3, -2, 1]],
    ["Priest", [-1, 0, 0, 1, 0, 5]],
    ["Assassin", [0, 3, 4, 0, -2, -2]],
    ["Bartender", [3, 2, 0, -3, 2, 0]],
    ["Blacksmith", [2, 2, 0, 0, 0, -2]],
    ["Castaway", [4, 0, 0, 0, 0, -4]],
    ["Con-artist", [0, -2, 5, 1, -1, 0]],
    ["Miner", [2, 3, -1, -3, 1, 0]],
    ["Digger", [3, 2, -1, -5, 3, 0]],
    ["Drifter", [2, 0, 2, 0, 0, -2]],
    ["Escaped Convict", [1, 2, 1, -1, 2, -2]],
    ["Mage", [-1, -3, 0, 6, -2, 4]],
    ["Explosives Expert", [-1, -1, 3, 3, 0, 0]],
    ["Factory Worker", [4, 1, 0, -4, 2, 0]],
    ["Mercenary", [2, 3, 2, -1, 3, -5]],
    ["Soldier", [3, 3, 0, -4, 2, -2]],
    ["Cultist", [2, 0, 0, 2, -3, 3]],
    ["Mafia Boss", [3, 0, 3, 3, -3, -3]],
    ["Paramedic", [-1, 0, 0, 4, 0, 2]],
    ["Janitor", [3, 0, 0, -4, 2, 2]],
    ["Warrior", [2, 2, 2, -5, 2, -5]],
];

class WorldObject {
    priority = 0;
    color = "#101010";
    outline = false;
    containsLoot = false;
    impassable = false;
    constructor(priority, color, outline, lootable, impassable) {
        this.priority = priority;
        this.color = color;
        this.outline = outline;
        this.containsLoot = lootable;
        this.impassable = impassable;
    }

    typeString() {
        return "WorldObject";
    }
}

class Chest extends WorldObject {
    constructor() {
        super(1, "#BBAA10", false, true, true)
    }

    typeString() {
        return "Chest";
    }
}

class Door extends WorldObject {
    locked = false;

    constructor(locked) {
        super(1, "#b38200", false, false, true);
        this.locked = locked;
    }

    typeString() {
        return "Door";
    }

    toggleOpen() {
        if (!this.locked || !this.impassable) {
            this.impassable = !this.impassable;
            this.outline = !this.impassable;
        }
    }
}

class Selector extends WorldObject {
    constructor() {
        super(1000, "#FF0000", true, false, false);
    }
    typeString() {
        return "Selector";
    }
}

class Character extends WorldObject {
    name = "Adarsh Rajaraman";
    gender = 0;
    age = 18;
    mem = 8;
    con = 7; // constitution - HP
    str = 7; // strength - physical damage
    dex = 7; // dexterity - dodge/hit chance
    int = 7; // intelligence - magical damage
    arm = 7; // armor - physical resistance
    wil = 7; // willpower - magical resistance
    
    status = 0;
    head = 100;
    torso = 100;
    leftarm = 100;
    rightarm = 100;
    leftleg = 100;
    rightleg = 100;
    race = 0;
    backstory = [0, 0];
    constructor() {
        super(1000, "#AA00AA", false, false, true);
        this.backstory = [Math.floor(Math.random() * childStory.length), Math.floor(Math.random() * adultStory.length)];
        this.age += Math.floor(Math.random() * 50);
        this.mem -= Math.floor((this.age - 18) / 11);
        this.race = Math.floor(Math.random() * races.length);
        this.con = Math.max(races[this.race][1][0] + childStory[this.backstory[0]][1][0] + adultStory[this.backstory[1]][1][0], 0);
        this.str = Math.max(races[this.race][1][1] + childStory[this.backstory[0]][1][1] + adultStory[this.backstory[1]][1][1], 0);
        this.dex = Math.max(races[this.race][1][2] + childStory[this.backstory[0]][1][2] + adultStory[this.backstory[1]][1][2], 0);
        this.int = Math.max(races[this.race][1][3] + childStory[this.backstory[0]][1][3] + adultStory[this.backstory[1]][1][3], 0);
        this.arm = Math.max(races[this.race][1][4] + childStory[this.backstory[0]][1][4] + adultStory[this.backstory[1]][1][4], 0);
        this.wil = Math.max(races[this.race][1][5] + childStory[this.backstory[0]][1][5] + adultStory[this.backstory[1]][1][5], 0);
        this.gender = Math.floor(Math.random() * 2);
        this.name = generateName(this.gender) + " " + generateName(2);
    }

    typeString() {
        return "Character";
    }
}

class Enemy extends Character {

    typeString(){
        return "Enemy";
    }
}

class Corpse extends Character {
    constructor() {
        super();
        this.containsLoot = true;
    }

    typeString(){
        return "Corpse";
    }
}

class Player extends Character {
    moveQueue = [];
    constructor() {
        super();
    }

    typeString() {
        return "Player";
    }
}

class Tile {
    defaultColor = "#000000";
    displayColor = "#000000";
    outlineColor = "#000000";
    type = 0;
    contents = [];
    name = "Blank Tile";
    constructor(type, contents, color, name) {
        this.type = type;
        this.contents.concat(contents);
        this.defaultColor = color;
        this.updateOverride();
        this.name = name;
    }

    addContents(contents) {
        if (Array.isArray(contents)) {
            this.contents.concat(contents);
        } else {
            this.contents.push(contents);
        }
        this.updateOverride();
    }

    updateOverride() {
        if (this.contents.length == 0) {
            this.displayColor = this.defaultColor;
            this.outlineColor = this.defaultColor;
        } else {
            var currentOutlinePriority = (this.contents[0].outline ? this.contents[0].priority : -1000);
            var currentlyOutlined = false;
            var currentDisplayItem = this.contents[0];
            for (var i = 1; i < this.contents.length; i++) {
                if (this.contents[i].outline && this.contents[i].priority > currentOutlinePriority) {
                    currentOutlinePriority = this.contents[i].priority;
                    currentlyOutlined = true;
                    this.outlineColor = this.contents[i].color;
                } else if (this.contents[i].priority > currentDisplayItem.priority) {
                    currentDisplayItem = this.contents[i];
                }
            }
            if (currentDisplayItem.outline && this.contents.length == 1) {
                this.displayColor = this.defaultColor;
                this.outlineColor = currentDisplayItem.color;
            } else {
                if (currentDisplayItem.outline) {
                    this.displayColor = this.defaultColor;
                } else {
                    this.displayColor = currentDisplayItem.color;
                }
                if (!currentlyOutlined) {
                    this.outlineColor = this.displayColor;
                }
            }
        }
    }

    removeContentByType(toRemove) {
        for (var i = 0; i < this.contents.length; i++) {
            if (this.contents[i].typeString() == toRemove) {
                this.contents.splice(i, 1);
            }
        }
        this.updateOverride();
    }

    includesContentByType(toFind) {
        for (var i = 0; i < this.contents.length; i++) {
            if (this.contents[i].typeString() == toFind) {
                return true;
            }
        }
        return false;
    }

    getFirstContentByType(toFind) {
        for (var i = 0; i < this.contents.length; i++) {
            if (this.contents[i].typeString() == toFind) {
                return this.contents[i];
            }
        }
        return false;
    }
}

function generateName(charGender) {
    var femEV = ["ia", "ie", "a", "y", "ey", "ah", "oe"];
    var femEC = ["l", "th", "n", "r", "ce"];
    var maleEV = ["o", "io"];
    var maleEC = ["ph", "w", "r", "s", "n", "m", "l", "ck"];
    var femSV = ["E", "O", "A", "I"];
    var femSC = ["H", "M", "V", "Ch", "S", "G", "J", "L", "T", "K"];
    var maleSV = ["A", "E", "Ai"];
    var maleSC = ["J", "M", "B", "L", "D", "Ch", "T", "N", "Z"];
    var maleMCV = ["a", "i", "o"];
    var maleMUV = ["e", "oa", "ie", "ae", "ai", "y", "ia", "ay"];
    var femMV = ["a", "e", "i", "o"];
    var maleMCC = ["j", "l", "r", "v", "l", "m", "g", "d", "c", "j"];
    var maleMUC = ["tt", "ck", "ch", "ll", "ndr"];
    var femMCC = ["l", "v", "m", "d", "s", "c", "f", "b", "g"];
    var femMUC = ["z", "x", "ss", "ll", "nn", "sh", "mm"];

    var name;

    var nameLength = Math.floor(Math.random() * 4) + 2;
    var gender = (charGender == 2 ? Math.floor(Math.random() * 2) : charGender);
    var letterType = Math.floor(Math.random() * 2);

    if (gender == 0) {
        if (letterType == 0) {
            name = maleSV[Math.floor(Math.random() * maleSV.length)];

            if (Math.random() < 0.2) {
                letterType = 1;
            } else {
                letterType = 0;
            }

        } else {
            name = maleSC[Math.floor(Math.random() * maleSC.length)];

            if (Math.random() < 0.2) {
                letterType = 3;
            } else {
                letterType = 2;
            }

        }

        for (var i = 0; i < nameLength; i++) {
            if (i == nameLength - 1) {
                if (letterType == 2 || letterType == 3) {
                    name += maleEV[Math.floor(Math.random() * maleEV.length)];
                } else {
                    name += maleEC[Math.floor(Math.random() * maleEC.length)];
                }
            } else {

                if (letterType == 0) {
                    name += maleMCC[Math.floor(Math.random() * maleMCC.length)];

                    if (Math.random() < 0.2) {
                        letterType = 3;
                    } else {
                        letterType = 2;
                    }
                } else if (letterType == 1) {
                    name += maleMUC[Math.floor(Math.random() * maleMUC.length)];

                    if (Math.random() < 0.2) {
                        letterType = 3;
                    } else {
                        letterType = 2;
                    }
                } else if (letterType == 2) {
                    name += maleMCV[Math.floor(Math.random() * maleMCV.length)];

                    if (Math.random() < 0.2) {
                        letterType = 1;
                    } else {
                        letterType = 0;
                    }
                } else if (letterType == 3) {
                    name += maleMUV[Math.floor(Math.random() * maleMUV.length)];

                    if (Math.random() < 0.2) {
                        letterType = 1;
                    } else {
                        letterType = 0;
                    }
                }

            }
        }

    } else {
        if (letterType == 0) {
            name = femSV[Math.floor(Math.random() * femSV.length)];

            if (Math.random() < 0.2) {
                letterType = 1;
            } else {
                letterType = 0;
            }

        } else {
            name = femSC[Math.floor(Math.random() * femSC.length)];
            letterType = 2;
        }
        for (var i = 0; i < nameLength; i++) {
            if (i == nameLength - 1) {
                if (letterType == 2) {
                    name += femEV[Math.floor(Math.random() * femEV.length)];
                } else {
                    name += femEC[Math.floor(Math.random() * femEC.length)];
                }
            } else {
                if (letterType == 0) {
                    name += femMCC[Math.floor(Math.random() * femMCC.length)];
                    letterType = 2;
                } else if (letterType == 1) {
                    name += femMUC[Math.floor(Math.random() * femMUC.length)];
                    letterType = 2;
                } else {
                    name += femMV[Math.floor(Math.random() * femMV.length)];

                    if (Math.random() < 0.2) {
                        letterType = 1;
                    } else {
                        letterType = 0;
                    }
                }
            }
        }
    }
    return name;
}

function pointIsValid(point) {
    var isInbounds = (point.x >= 0 && point.x < renderW && point.y >= 0 && point.y < renderH);
    if (!isInbounds) return isInbounds;
    var containsImpassableObject = false;
    for (var i = 0; i < gameMap[point.y][point.x].contents.length; i++) {
        if (gameMap[point.y][point.x].contents[i].impassable && gameMap[point.y][point.x].contents[i].typeString() !== "Player") {
            containsImpassableObject = true;
        }
    }
    return (isInbounds && gameMap[point.y][point.x].type < 100 && !containsImpassableObject);
}

function pointsAreEqual(point1, point2) {
    return (point1.x == point2.x && point1.y == point2.y);
}

function pointToString(point) {
    return "x: " + point.x + ",y: " + point.y;
}

/**
 * Djikstra's min-path algorithm, can be improved by caching the min-path array but I'll worry about that when performance is bad 
 * (Djikstra's on a 25x25 grid hopefully shouldn't be an issue in 2019)
 */
const MAX_DISTANCE = 123456;
const COL_NUM = [-1, 1, 0, 0];
const ROW_NUM = [0, 0, -1, 1];
function getShortestPath(point1, point2, returnType) {
    var dist = [];
    var visited = [];
    var minPaths = [];
    for (var y = 0; y < renderH; y++) {
        var distCol = [];
        var visCol = [];
        var pathCol = [];
        for (var x = 0; x < renderW; x++) {
            distCol.push(MAX_DISTANCE);
            visCol.push(false);
            pathCol.push([]);
        }
        dist.push(distCol);
        visited.push(visCol);
        minPaths.push(pathCol);
    }

    dist[point1.y][point1.x] = 0;
    visited[point1.y][point1.x] = true;
    var queue = [];
    queue.push(point1);

    while (queue.length) {
        var current = queue.shift();
        if (!pointIsValid(current) && !pointsAreEqual(current, playerCoords)) {
            continue;
        }
        visited[current.y][current.x] = true;
        adjacentNodes = [];
        for (var i = 0; i < 4; i++) {
            adjacentNodes.push({ x: current.x + ROW_NUM[i], y: current.y + COL_NUM[i] });
        }
        for (var i = 0; i < adjacentNodes.length; i++) {
            if (pointIsValid(adjacentNodes[i]) && dist[adjacentNodes[i].y][adjacentNodes[i].x] > dist[current.y][current.x] + 1) {
                dist[adjacentNodes[i].y][adjacentNodes[i].x] = dist[current.y][current.x] + 1;
                toAdd = [...minPaths[current.y][current.x]];
                toAdd.push(adjacentNodes[i]);
                minPaths[adjacentNodes[i].y][adjacentNodes[i].x] = toAdd;
                queue.push(adjacentNodes[i]);
            }
        }
    }
    switch (returnType) {
        case PATH:
            return minPaths[point2.y][point2.x];
        case DIST:
            return dist[point2.y][point2.x];
    }

}

var playerChar = new Player();
document.getElementById("player-name").innerHTML = playerChar.name;
document.getElementById("player-info-race-age").innerHTML = playerChar.age + " year-old " + (playerChar.gender == 0 ? "male " : "female ") + races[playerChar.race][0];
document.getElementById("player-info-backstory").innerHTML = childStory[playerChar.backstory[0]][0] + ", " + adultStory[playerChar.backstory[1]][0];
document.getElementById("player-con").innerHTML = "CON: " + playerChar.con;
document.getElementById("player-str").innerHTML = "STR: " + playerChar.str;
document.getElementById("player-dex").innerHTML = "DEX: " + playerChar.dex;
document.getElementById("player-int").innerHTML = "INT: " + playerChar.int;
document.getElementById("player-arm").innerHTML = "ARM: " + playerChar.arm;
document.getElementById("player-wil").innerHTML = "WIL: " + playerChar.wil;
document.getElementById("player-mem").innerHTML = "MEM: " + playerChar.mem;

// context for game (initialized null)
var ctx = null;

// constant values for directions in generating the map
const N = 1;
const E = 2;
const S = 4;
const W = 8;

// constant values for getShortestDistance
const PATH = 0;
const DIST = 1;

// constant values for actions in Player.moveQueue
const LOOT = 0;
const OPEN = 1;

// constant values for equipment
const HELMET = 0;
const TORSO = 1;
const TWOHAND = 2;
const ONEHAND = 4;
const PANTS = 8;
const RING = 16;

// tile width, height, map width, height, and frame information for display

var canvasSize = 400;
var renderW = 25, renderH = 25;
var tileW = canvasSize / renderW, tileH = canvasSize / renderH;
var currentSecond = 0, frameCount = 0, framesLastSecond = 0;
var selectorCoords = { x: null, y: null };
var playerCoords = { x: null, y: null };
var combatQueue = [];

var gameMap = [];
for (var i = 0; i < renderH; i++) {
    // create new array
    var row = [];
    for (var j = 0; j < renderW; j++) {
        row.push(newGrassTile());
    }
    gameMap.push(row);
}

placeRectangle({ x: 3, y: 5 }, { x: 9, y: 13 }, "newWallTile");
fillRectangle({ x: 4, y: 6 }, { x: 8, y: 12 }, "newStoneTile");

gameMap[9][9] = newStoneTile();
gameMap[9][9].addContents(new Door(false));

gameMap[20][20].addContents(new Chest());

gameMap[12][12].addContents(playerChar);

playerCoords = { x: 12, y: 12 };

updateHealthDisplay();

// start game on load
window.onload = function () {
    ctx = document.getElementById("game").getContext("2d");
    this.requestAnimationFrame(drawGame);
    this.ctx.font = "bold 10pt sans-serfix";
}

function newGrassTile() {
    return new Tile(0, [], "#03A313", "Grass");
}
function newWallTile() {
    return new Tile(100, [], "#505050", "Stone Wall");
}
function newStoneTile() {
    return new Tile(1, [], "#A0A0A0", "Stone Floor");
}

function placeRectangle(corner1, corner2, tileFunction) {
    var lowerX = Math.min(corner1.x, corner2.x);
    var higherX = Math.max(corner1.x, corner2.x);
    for (var i = lowerX; i <= higherX; i++) {
        gameMap[corner1.y][i] = window[tileFunction]();
        gameMap[corner2.y][i] = window[tileFunction]();
    }
    var lowerY = Math.min(corner1.y, corner2.y);
    var higherY = Math.max(corner1.y, corner2.y);
    for (var i = lowerY + 1; i <= higherY - 1; i++) {
        gameMap[i][corner1.x] = window[tileFunction]();
        gameMap[i][corner2.x] = window[tileFunction]()
    }
}

function fillRectangle(corner1, corner2, tileFunction) {
    var lowerX = Math.min(corner1.x, corner2.x);
    var higherX = Math.max(corner1.x, corner2.x);
    var lowerY = Math.min(corner1.y, corner2.y);
    var higherY = Math.max(corner1.y, corner2.y);
    for (var x = lowerX; x <= higherX; x++) {
        for (var y = lowerY; y <= higherY; y++) {
            gameMap[y][x] = window[tileFunction]();
        }
    }
}