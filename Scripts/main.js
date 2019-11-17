// render
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

    for (var y = 0; y < mapH; y++) {
        for (var x = 0; x < mapW; x++) {
            ctx.fillStyle = gameMap[y][x].displayColor;
            ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
        }
    }

    ctx.fillStyle = "#ff0000";
    ctx.fillText("FPS: " + framesLastSecond, 10, 20);

    requestAnimationFrame(drawGame);
}

function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    console.log("x: " + x + " y: " + y);
    return {
        x: x,
        y: y
    }
}

const canvas = document.querySelector('canvas');
canvas.addEventListener('mousedown', function (e) {
    getCursorPosition(canvas, e);
});

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
    constructor(priority, color){
        this.priority = priority;
        this.color = color;
    }
}

class Character extends WorldObject{
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
        super(1000, "#FF00AA");
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
}

class Player extends Character {
    constructor(){
        super();
    }
}

class Tile {
    defaultColor = "#000000";
    displayColor = "#000000";
    ground = 0;
    contents = [];
    constructor(ground, contents, color) {
        this.ground = ground;
        this.contents.concat(contents);
        this.defaultColor = color;
        this.updateOverride();
    }

    addContents (contents) {
        if(Array.isArray(contents)) {
            this.contents.concat(contents);
        } else {
            this.contents.push(contents);
        }
        this.updateOverride();
    }

    updateOverride () {
        if(this.contents.length == 0){
            this.displayColor = this.defaultColor;
        } else {
            var currentDisplayItem = this.contents[0];
            for(var i = 1; i < this.contents.length; i++){
                if(this.contents[i].priority > currentDisplayItem.priority){
                    currentDisplayItem = this.contents[i];
                }
            }
            this.displayColor = currentDisplayItem.color;
        }
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

var newOne = new Player();
document.getElementById("player-name").innerHTML = newOne.name;
document.getElementById("player-info-race-age").innerHTML = newOne.age + " year-old " + (newOne.gender == 0 ? "male " : "female ") + races[newOne.race][0];
document.getElementById("player-info-backstory").innerHTML = childStory[newOne.backstory[0]][0] + ", " + adultStory[newOne.backstory[1]][0];
document.getElementById("player-con").innerHTML = "CON: " + newOne.con;
document.getElementById("player-str").innerHTML = "STR: " + newOne.str;
document.getElementById("player-dex").innerHTML = "DEX: " + newOne.dex;
document.getElementById("player-int").innerHTML = "INT: " + newOne.int;
document.getElementById("player-arm").innerHTML = "ARM: " + newOne.arm;
document.getElementById("player-wil").innerHTML = "WIL: " + newOne.wil;
document.getElementById("player-mem").innerHTML = "MEM: " + newOne.mem;

// context for game (initialized null)
var ctx = null;

// constant values for directions in generating the map
const N = 1;
const E = 2;
const S = 4;
const W = 8;

// constant values for tile colors
const grassColor = "#03A313";

// tile width, height, map width, height, and frame information for display
var tileW = 16, tileH = 16;
var mapW = 25, mapH = 25;
var currentSecond = 0, frameCount = 0, framesLastSecond = 0;

var gameMap = [];
for(var i = 0; i < 25; i++){
    // create new array
    var row = [];
    for(var j = 0; j < 25; j++){
        row.push(newGrassTile());
    }
    gameMap.push(row);
}

gameMap[12][12].addContents(newOne);

// start game on load
window.onload = function () {
    ctx = document.getElementById("game").getContext("2d");
    this.requestAnimationFrame(drawGame);
    this.ctx.font = "bold 10pt sans-serfix";
}

function newGrassTile() {
    return new Tile(0,[],grassColor);
}
function newWallTile(){
    return new Tile(1,[],"#505050");
}