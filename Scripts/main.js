// constant values for directions in generating the map
const DIR_N = 1;
const DIR_E = 2;
const DIR_S = 4;
const DIR_W = 8;

// constant values for getShortestPath
const PATH = 0;
const DIST = 1;
const ALL_PATHS = 2;
const ALL_DISTS = 4;

// constant values for actions in Player.moveQueue
const ACTION_LOOT = 0;
const ACTION_OPEN = 1;

// constant values for equipment
const ARMOR_UNDEFINED = -1;
const ARMOR_HELMET = 0;
const ARMOR_TORSO = 1;
const ARMOR_TWOHAND = 2;
const ARMOR_ONEHAND = 4;
const ARMOR_PANTS = 8;
const ARMOR_RING = 16;
// not armor types, but used for equipping
const ARMOR_RIGHTHAND = 32;
const ARMOR_LEFTHAND = 64

// constant values for InventoryObject rarities
const RARITY_COMMON = 0;
const RARITY_UNCOMMON = 1;
const RARITY_RARE = 2;
const RARITY_EPIC = 4;
const RARITY_LEGENDARY = 8;
const RARITY_COLORS = {};
RARITY_COLORS[RARITY_COMMON] = "#FFFFFF";
RARITY_COLORS[RARITY_UNCOMMON] = "#28DE3D";
RARITY_COLORS[RARITY_RARE] = "#00D0FF";
RARITY_COLORS[RARITY_EPIC] = "#D400FF";
RARITY_COLORS[RARITY_LEGENDARY] = "#FF5500";

const RARITY_CLASSES = {};
RARITY_CLASSES[RARITY_COMMON] = "rarity-common";
RARITY_CLASSES[RARITY_UNCOMMON] = "rarity-uncommon";
RARITY_CLASSES[RARITY_RARE] = "rarity-rare";
RARITY_CLASSES[RARITY_EPIC] = "rarity-epic";
RARITY_CLASSES[RARITY_LEGENDARY] = "rarity-legendary";

// constant values for toggling the left-most display
const UI_NONE = 0;
const UI_EQUIP = 1;
const UI_ITEM = 2;
const UI_TILE = 4;

// constant values for toggling the bottom-right display
const RUI_NONE = 0;
const RUI_LOOT = 1;

// context for game (initialized null)
var ctx = null;

// tile width, height, map width, height, and frame information for display

var canvasSize = 400;
var renderW = 25, renderH = 25;
var tileW = canvasSize / renderW, tileH = canvasSize / renderH;
var currentSecond = 0, frameCount = 0, framesLastSecond = 0;
var selectorCoords = { x: null, y: null };
var playerCoords = { x: null, y: null };
var combatQueue = [];

// more game info
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

            if (overlay[y][x]) {
                ctx.fillStyle = blendColors(gameMap[y][x].outlineColor, overlay[y][x]);
                ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
                ctx.fillStyle = blendColors(gameMap[y][x].displayColor, overlay[y][x]);
            } else {
                ctx.fillStyle = gameMap[y][x].outlineColor;
                ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
                ctx.fillStyle = gameMap[y][x].displayColor;
            }
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
                    case ACTION_LOOT:
                        // looting does not take up an action so do not set playerTookTurn to true
                        openContainer(coordsToActOn);
                        break;
                    case ACTION_OPEN:
                        gameMap[coordsToActOn.y][coordsToActOn.x].getFirstContentByType("Door").toggleOpen();
                        gameMap[coordsToActOn.y][coordsToActOn.x].updateOverride();
                        playerTookTurn = true;
                        break;
                }
            } else {
                gameMap[playerCoords.y][playerCoords.x].removeContentByType("Player");
                gameMap[newCoords.y][newCoords.x].addContents(playerChar);
                if (pointsAreEqual(newCoords, selectorCoords)) {
                    moveSelector(selectorCoords.x, selectorCoords.y);
                    gameMap[selectorCoords.y][selectorCoords.x].updateOverride();
                }
                if (selectorCoords.x != null && selectorCoords.y != null) {
                    updateSelectorText();
                }
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
        toggleUI(UI_TILE);
        moveSelector(squareX, squareY);
    }
});

/**
 * Update left side selector info, getting options for tile and its contents
 */
function updateSelectorText() {
    if (selectorCoords.x != null && selectorCoords.y != null) {
        document.getElementById("selected-tile").innerHTML = gameMap[selectorCoords.y][selectorCoords.x].name;
        var contentString = "";
        var lootable = false;
        var hasDoor = false;
        var isDoorOpen = false;
        var isDoorLocked = false;
        var isImpassable = false // is impassable handled differently from isDoorLocked in case non-door item is impassable
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
            if (gameMap[selectorCoords.y][selectorCoords.x].contents[i].impassable && typeString != "Player") isImpassable = true;
            contentString += (typeString == "Character" || typeString == "Player" ? gameMap[selectorCoords.y][selectorCoords.x].contents[i].name : typeString) + "<br/>";
        }
        document.getElementById("contents-of-tile").innerHTML = "Contents: <br/>" +
            (contentString.length == 0 ? "Nothing" : contentString);
        document.getElementById("actions-tile").innerHTML = "";
        if (lootable && isImpassable) {
            document.getElementById("actions-tile").innerHTML += getLootButton();
        }
        if (lootable && !isImpassable) {
            document.getElementById("actions-tile").innerHTML += getLootExactButton();
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
}

/**
 * Move selector to specified coordinates (Might want to update to use a {dictionary} coords parameter)
 * @param {int} squareX x coord to move selector to
 * @param {int} squareY y coord to mvoe selector to
 */
function moveSelector(squareX, squareY) {
    if (selectorCoords.x != null && selectorCoords != null) {
        gameMap[selectorCoords.y][selectorCoords.x].removeContentByType("Selector");
    }
    gameMap[squareY][squareX].addContents(new Selector());
    selectorCoords.x = squareX;
    selectorCoords.y = squareY;
    updateSelectorText();
}

function updateHealthDisplay() {
    document.getElementById("health-total").innerHTML = "HP: " + playerChar.hp + "/" + playerChar.maxhp;
    document.getElementById("mana").innerHTML = "MANA: " + playerChar.mana + "/" + playerChar.maxmana;
    document.getElementById("health-head").innerHTML = "Head: " + playerChar.head + "%";
    document.getElementById("health-rarm").innerHTML = "Right arm: " + playerChar.rightarm + "%";
    document.getElementById("health-torso").innerHTML = "Torso: " + playerChar.torso + "%";
    document.getElementById("health-larm").innerHTML = "Left arm: " + playerChar.leftarm + "%";
    document.getElementById("health-rleg").innerHTML = "Right leg: " + playerChar.rightleg + "%";
    document.getElementById("health-lleg").innerHTML = "Left leg: " + playerChar.leftleg + "%";
}

/**
 * Update player inventory display to match player's inventory - should be called any time inventory is changed
 */
function updateInventoryDisplay() {
    var inv = document.getElementById("player-inventory");
    inv.innerHTML = "";
    for (var i = 0; i < playerChar.inventory.length; i++) {
        inv.innerHTML += getObjectButton(playerChar.inventory[i], i);
    }
}

/**
 * Get options for an InventoryObject in player's inventory
 * @param {int} index of item in player's inventory to get options for
 */
function getObjectOptions(index) {
    var item = playerChar.inventory[index];
    document.getElementById("item-name").innerHTML = item.name;
    document.getElementById("item-name").classList = [RARITY_CLASSES[item.rarity]];
    document.getElementById("item-flavor-text").innerHTML = item.flavorText;
    document.getElementById("item-actions").innerHTML = "";
    if (playerChar.inventory[index].isArmor) {
        if (playerChar.inventory[index].armorType == ARMOR_ONEHAND) {
            document.getElementById("item-actions").innerHTML += getEquipOneHandButton(index);
        } else if (playerChar.inventory[index].armorType == ARMOR_TWOHAND) {
            document.getElementById("item-actions").innerHTML += getEquipTwoHandButton(index);
        } else {
            document.getElementById("item-actions").innerHTML += getEquipButton(index);
        }
    }
    document.getElementById("item-actions").innerHTML += getDropButton(index);
    toggleUI(UI_ITEM);
}

/**
 * Get options for an InventoryObject located in a container at specified coordinates
 * @param {int} index of item to get options for
 * @param {dictionary} coords of container to get item from
 */
function getContainerObjectOptions(index, coords) {
    var item = gameMap[coords.y][coords.x].getFirstLootableObject().inventory[index];
    document.getElementById("item-name").innerHTML = item.name;
    document.getElementById("item-name").classList = [RARITY_CLASSES[item.rarity]];
    document.getElementById("item-flavor-text").innerHTML = item.flavorText;
    document.getElementById("item-actions").innerHTML = "";
    if (item.isArmor) {
        if (item.armorType == ARMOR_ONEHAND) {
            document.getElementById("item-actions").innerHTML += getEquipOneHandFCButton(index, coords);
        } else if (item.armorType == ARMOR_TWOHAND) {
            document.getElementById("item-actions").innerHTML += getEquipTwoHandFCButton(index, coords);
        } else {
            document.getElementById("item-actions").innerHTML += getEquipFCButton(index, coords);
        }
    }
    document.getElementById("item-actions").innerHTML += getPickupButton(index, coords);
    toggleUI(UI_ITEM);
}

// could probably consolidate into a single getEquipButton with a function name, hand index, and button text field, 
// but then that would move work up into the code above and I already have this stuff written so it's w/e for now

// --------------------- BUTTON SECTION --------------------------------------------

function getEquipButton(index) {
    return "<button onclick='equipItem(" + index + ", 0)' class='mr-2'><i class='fa fa-mitten'></i><br/>Equip</button>";
}

function getEquipOneHandButton(index) {
    return "<button onclick='equipItem(" + index + ", 2)' class='mr-2'><i class='fa fa-mitten'></i><br/>Equip Left</button>" +
        "<button onclick='equipItem(" + index + ", 1)' class='mr-2'><i class='fa fa-mitten'></i><br/>Equip Right</button>";
}

function getEquipTwoHandButton(index) {
    return "<button onclick='equipItem(" + index + ", 3)' class='mr-2'><i class='fa fa-mitten'></i><br/>Equip</button>";
}

function getEquipFCButton(index, coords) {
    return "<button onclick='equipItemFromContainer(" + index + ", {x: " + coords.x + ", y: " + coords.y + "}, 0)' class='mr-2'><i class='fa fa-mitten'></i><br/>Equip</button>";
}

function getEquipOneHandFCButton(index, coords) {
    return "<button onclick='equipItemFromContainer(" + index + ", {x: " + coords.x + ", y: " + coords.y + "}, 2)' class='mr-2'><i class='fa fa-mitten'></i><br/>Equip Left</button>" +
        "<button onclick='equipItemFromContainer(" + index + ", {x: " + coords.x + ", y: " + coords.y + "}, 1)' class='mr-2'><i class='fa fa-mitten'></i><br/>Equip Right</button>";
}

function getEquipTwoHandFCButton(index, coords) {
    return "<button onclick='equipItemFromContainer(" + index + ", {x: " + coords.x + ", y: " + coords.y + "}, 3)' class='mr-2'><i class='fa fa-mitten'></i><br/>Equip</button>";
}

function getDropButton(index) {
    return "<button onclick='dropItem(" + index + ")' class='mr-2'><i class='fas fa-arrow-down'></i><br/>Drop</button>";
}

function getPickupButton(index, coords) {
    return "<button onclick='pickupItem(" + index + ", {x: " + coords.x + ", y: " + coords.y + "})' class='mr-2'><i class='far fa-hand-paper'></i><br/>Pick up</button>";
}

function getObjectButton(invObject, index) {
    return "<img class='hover-pointer mr-1 mt-1 object-border " + RARITY_CLASSES[invObject.rarity] + "' onclick='getObjectOptions(" + index + ")' src='" + invObject.imageURL + "' />";
}

function getContainerObjectButton(invObject, index, coords) {
    return "<img class='hover-pointer mr-1 mt-1 object-border " + RARITY_CLASSES[invObject.rarity] + "' onclick='getContainerObjectOptions(" + index + ", {x: " + coords.x + ", y: " + coords.y + "})' src='" + invObject.imageURL + "' />";
}

function getMoveButton() {
    return "<button onclick='moveToSelector()' class='mr-2'><i class='fa fa-hiking'></i><br/>Move</button>";
}

function getLootButton() {
    return "<button onclick='moveAndLootImpassableSelector()' class='mr-2'><i class='fa fa-box-open'></i><br/>Loot</button>"
}

function getLootExactButton() {
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

// --------------------- END BUTTON SECTION ---------------------------------

/**
 * Equip item to player's equipment from player's inventory
 * @param {int} index of item in player inventory to equip
 * @param {int} hand hand to equip item in (1 for right, 2 for left, 0 if not hand)
 */
function equipItem(index, hand) {
    if (hand == 0) {
        var type = playerChar.inventory[index].armorType;
        if (playerChar.equipment[type] != null) {
            playerChar.inventory.push(playerChar.equipment[type]);
        }
        playerChar.equipment[type] = playerChar.inventory[index];
    } else {
        if (hand == 1) {
            if (playerChar.equipment[ARMOR_RIGHTHAND] != null) {
                playerChar.inventory.push(playerChar.equipment[ARMOR_RIGHTHAND]);
            }
            playerChar.equipment[ARMOR_RIGHTHAND] = playerChar.inventory[index];
        } else if (hand == 2) {
            if (playerChar.equipment[ARMOR_LEFTHAND] != null) {
                playerChar.inventory.push(playerChar.equipment[ARMOR_LEFTHAND]);
            }
            if (playerChar.equipment[ARMOR_RIGHTHAND] != null && playerChar.equipment[ARMOR_RIGHTHAND].armorType == ARMOR_TWOHAND) {
                playerChar.inventory.push(playerChar.equipment[ARMOR_RIGHTHAND]);
                playerChar.equipment[ARMOR_RIGHTHAND] = null;
            }
            playerChar.equipment[ARMOR_LEFTHAND] = playerChar.inventory[index];
        } else {
            if (playerChar.equipment[ARMOR_LEFTHAND] != null) {
                playerChar.inventory.push(playerChar.equipment[ARMOR_LEFTHAND]);
            }
            if (playerChar.equipment[ARMOR_RIGHTHAND] != null) {
                playerChar.inventory.push(playerChar.equipment[ARMOR_RIGHTHAND]);
            }
            playerChar.equipment[ARMOR_LEFTHAND] = null;
            playerChar.equipment[ARMOR_RIGHTHAND] = playerChar.inventory[index];
        }
    }
    playerChar.inventory.splice(index, 1);
    updateInventoryDisplay();
    updateEquipUI();
    toggleUI(UI_EQUIP);
}

/**
 * Equip item from container to respective equipment slot on player - existing item moved into player's inventory
 * @param {int} index of item in inventory of container to equip
 * @param {dictionary} coords of tile with container to loot
 * @param {int} hand hand to equip item in (1 for right, 2 for left)
 */
function equipItemFromContainer(index, coords, hand) {
    var item = gameMap[coords.y][coords.x].getFirstLootableObject().inventory[index];
    if (hand == 0) {
        var type = item.armorType;
        if (playerChar.equipment[type] != null) {
            playerChar.inventory.push(playerChar.equipment[type]);
        }
        playerChar.equipment[type] = item;
    } else {
        if (hand == 1) {
            if (playerChar.equipment[ARMOR_RIGHTHAND] != null) {
                playerChar.inventory.push(playerChar.equipment[ARMOR_RIGHTHAND]);
            }
            playerChar.equipment[ARMOR_RIGHTHAND] = item;
        } else if (hand == 2) {
            if (playerChar.equipment[ARMOR_LEFTHAND] != null) {
                playerChar.inventory.push(playerChar.equipment[ARMOR_LEFTHAND]);
            }
            if (playerChar.equipment[ARMOR_RIGHTHAND] != null && playerChar.equipment[ARMOR_RIGHTHAND].armorType == ARMOR_TWOHAND) {
                playerChar.inventory.push(playerChar.equipment[ARMOR_RIGHTHAND]);
                playerChar.equipment[ARMOR_RIGHTHAND] = null;
            }
            playerChar.equipment[ARMOR_LEFTHAND] = item;
        } else {
            if (playerChar.equipment[ARMOR_LEFTHAND] != null) {
                playerChar.inventory.push(playerChar.equipment[ARMOR_LEFTHAND]);
            }
            if (playerChar.equipment[ARMOR_RIGHTHAND] != null) {
                playerChar.inventory.push(playerChar.equipment[ARMOR_RIGHTHAND]);
            }
            playerChar.equipment[ARMOR_LEFTHAND] = null;
            playerChar.equipment[ARMOR_RIGHTHAND] = item;
        }
    }
    gameMap[coords.y][coords.x].getFirstLootableObject().inventory.splice(index, 1);
    updateInventoryDisplay();
    updateEquipUI();
    toggleUI(UI_EQUIP);
}

/**
 * Update top-left Equip display (Update item images and rarity borders)
 */
function updateEquipUI() {
    var displayImage = document.getElementById("image-helmet");
    if (playerChar.equipment[ARMOR_HELMET] == null) {
        displayImage.src = "Images/nohelmet.png";
        displayImage.classList = ['object-border', 'rarity-common'];
    } else {
        displayImage.src = playerChar.equipment[ARMOR_HELMET].imageURL;
        displayImage.classList = ['object-border ' + RARITY_CLASSES[playerChar.equipment[ARMOR_HELMET].rarity]];
    }

    displayImage = document.getElementById("image-torso");
    if (playerChar.equipment[ARMOR_TORSO] == null) {
        displayImage.src = "Images/noshirt.png";
        displayImage.classList = ['object-border', 'rarity-common'];
    } else {
        displayImage.src = playerChar.equipment[ARMOR_TORSO].imageURL;
        displayImage.classList = ['object-border ' + RARITY_CLASSES[playerChar.equipment[ARMOR_TORSO].rarity]];
    }

    displayImage = document.getElementById("image-ring");
    if (playerChar.equipment[ARMOR_RING] == null) {
        displayImage.src = "Images/noshirt.png";
        displayImage.classList = ['object-border', 'rarity-common'];
    } else {
        displayImage.src = playerChar.equipment[ARMOR_RING].imageURL;
        displayImage.classList = ['object-border ' + RARITY_CLASSES[playerChar.equipment[ARMOR_RING].rarity]];
    }

    displayImage = document.getElementById("image-pants");
    if (playerChar.equipment[ARMOR_PANTS] == null) {
        displayImage.src = "Images/nopants.png";
        displayImage.classList = ['object-border', 'rarity-common'];
    } else {
        displayImage.src = playerChar.equipment[ARMOR_PANTS].imageURL;
        displayImage.classList = ['object-border ' + RARITY_CLASSES[playerChar.equipment[ARMOR_PANTS].rarity]];
    }

    if (playerChar.equipment[ARMOR_RIGHTHAND] != null && playerChar.equipment[ARMOR_RIGHTHAND].armorType == ARMOR_TWOHAND) {
        displayImage = document.getElementById("image-twohand");
        displayImage.src = playerChar.equipment[ARMOR_RIGHTHAND].imageURL;
        displayImage.classList = ['object-border ' + RARITY_CLASSES[playerChar.equipment[ARMOR_RIGHTHAND].rarity]];

        document.getElementById("armor-twohand").style.display = "block";
        document.getElementById("armor-righthand").style.display = "none";
        document.getElementById("armor-lefthand").style.display = "none";
    } else {
        displayImage = document.getElementById("image-righthand");
        if (playerChar.equipment[ARMOR_RIGHTHAND] == null) {
            displayImage.src = "Images/norighthand.png";
            displayImage.classList = ['object-border', 'rarity-common'];
        } else {
            displayImage.src = playerChar.equipment[ARMOR_RIGHTHAND].imageURL;
            displayImage.classList = ['object-border ' + RARITY_CLASSES[playerChar.equipment[ARMOR_RIGHTHAND].rarity]];
        }

        displayImage = document.getElementById("image-lefthand");
        if (playerChar.equipment[ARMOR_LEFTHAND] == null) {
            displayImage.src = "Images/nolefthand.png";
            displayImage.classList = ['object-border', 'rarity-common'];
        } else {
            displayImage.src = playerChar.equipment[ARMOR_LEFTHAND].imageURL;
            displayImage.classList = ['object-border ' + RARITY_CLASSES[playerChar.equipment[ARMOR_LEFTHAND].rarity]];
        }

        document.getElementById("armor-twohand").style.display = "none";
        document.getElementById("armor-righthand").style.display = "block";
        document.getElementById("armor-lefthand").style.display = "block";
    }
}

/**
 * Throw an object on the ground from the player's inventory
 * @param {int} index index of item in player's inventory to drop
 */
function dropItem(index) {
    if (gameMap[playerCoords.y][playerCoords.x].containsLootableObject()) {
        var lootableObject = gameMap[playerCoords.y][playerCoords.x].getFirstLootableObject();
        switch (lootableObject.typeString()) {
            case "Corpse":
            case "Dropped Items":
            default:
                lootableObject.inventory.push(playerChar.inventory[index]);
                break;
        }
        playerChar.inventory.splice(index, 1);
    } else {
        gameMap[playerCoords.y][playerCoords.x].addContents(new DroppedItems([playerChar.inventory[index]]));
        playerChar.inventory.splice(index, 1);
    }
    updateInventoryDisplay();
    removeSelector();
    toggleUI(UI_TILE);
    openContainer(playerCoords);
    toggleContainerUI(RUI_LOOT);
    gameMap[playerCoords.y][playerCoords.x].updateOverride();
}

/**
 * Add a specified item to player inventory from the specified container
 * @param {int} index index of item in specified container's inventory
 * @param {dictionary} coords of container to take from
 */
function pickupItem(index, coords) {
    var container = gameMap[coords.y][coords.x].getFirstLootableObject();
    playerChar.inventory.push(container.inventory[index]);
    container.inventory.splice(index, 1);
    openContainer(coords);
    updateInventoryDisplay();
    if (container.inventory.length == 0 && container.typeString() == "Dropped Items") {
        gameMap[coords.y][coords.x].removeContentByType("Dropped Items");
        toggleContainerUI(RUI_NONE);
    }
}

/**
 * Open the container inventory in the bottom right display (for the container at the specified coordinates)
 * @param {dictionary} coords contains x (index x) and y (index y) coords to open container UI for
 */
function openContainer(coords) {
    toggleContainerUI(RUI_LOOT);
    var inv = document.getElementById("container-inventory");
    inv.innerHTML = "";
    var container = gameMap[coords.y][coords.x].getFirstLootableObject();
    document.getElementById("container-type").innerHTML = container.typeString();
    for (var i = 0; i < container.inventory.length; i++) {
        inv.innerHTML += getContainerObjectButton(container.inventory[i], i, coords);
    }
}

/**
 * Display the specified UI in the top left display
 * @param {int} toDisplay constant representing the display for the main UI (Options are UI_NONE, UI_TILE, UI_ITEM, UI_EQUIP)
 */
function toggleUI(toDisplay) {
    document.getElementById("tile-info").style.display = "none";
    document.getElementById("equip-info").style.display = "none";
    document.getElementById("item-info").style.display = "none";
    switch (toDisplay) {
        case UI_EQUIP:
            document.getElementById("equip-info").style.display = "block";
            break;
        case UI_ITEM:
            document.getElementById("item-info").style.display = "block";
            break;
        case UI_TILE:
            document.getElementById("tile-info").style.display = "block";
            break;
        default:
            break;
    }
}

/**
 * Display the specified UI in the bottom right display
 * @param {int} toDisplay constant representing display for container UI (Options are RUI_NONE, RUI_LOOT)
 */
function toggleContainerUI(toDisplay) {
    document.getElementById("alternate-inventory").style.display = "none";
    switch (toDisplay) {
        case RUI_LOOT:
            document.getElementById("alternate-inventory").style.display = "block";
            break;
        default:
            break;
    }
}

/**
 * Queue movement and toggling for door, using closest adjacent point
 */
function moveAndToggleDoor() {
    toggleContainerUI(RUI_NONE);
    var closestAdjacentPoint = getAdjacentPointClosestToPlayer(selectorCoords);
    playerChar.moveQueue = getShortestPath(playerCoords, closestAdjacentPoint, PATH, false);
    playerChar.moveQueue.push([ACTION_OPEN, { x: selectorCoords.x, y: selectorCoords.y }]);
    removeSelector();
}

/**
 * Remove selector from map, update tile UI
 */
function removeSelector() {
    if (selectorCoords.x == null || selectorCoords.y == null) {
        return;
    }
    gameMap[selectorCoords.y][selectorCoords.x].removeContentByType("Selector");
    document.getElementById("selected-tile").innerHTML = "No tile selected";
    document.getElementById("contents-of-tile").innerHTML = "";
    document.getElementById("actions-tile").innerHTML = "";
    selectorCoords.x = null;
    selectorCoords.y = null;
}

/**
 * Queue movement to selector's current location, update tile UI
 */
function moveToSelector() {
    toggleContainerUI(RUI_NONE);
    playerChar.moveQueue = getShortestPath(playerCoords, selectorCoords, PATH, false);
    gameMap[selectorCoords.y][selectorCoords.x].removeContentByType("Selector");
    document.getElementById("selected-tile").innerHTML = "No tile selected";
    document.getElementById("contents-of-tile").innerHTML = "";
    document.getElementById("actions-tile").innerHTML = "";
    selectorCoords.x = null;
    selectorCoords.y = null;
}

/**
 * Queue movement and looting for closest adjacent point to selector
 */
function moveAndLootImpassableSelector() {
    toggleContainerUI(RUI_NONE);
    var closestAdjacentPoint = getAdjacentPointClosestToPlayer(selectorCoords);
    playerChar.moveQueue = getShortestPath(playerCoords, closestAdjacentPoint, PATH, false);
    playerChar.moveQueue.push([ACTION_LOOT, { x: selectorCoords.x, y: selectorCoords.y }]);
    removeSelector();
}

/**
 * Queue movement and looting for exact position of container
 */
function moveAndLootSelector() {
    toggleContainerUI(RUI_NONE);
    playerChar.moveQueue = getShortestPath(playerCoords, selectorCoords, PATH, false);
    playerChar.moveQueue.push([ACTION_LOOT, { x: selectorCoords.x, y: selectorCoords.y }]);
    removeSelector();
}

/**
 * Given a point, return the closest adjacent point to the player (Out of [x-1, y],[x+1, y],[x, y-1],[x, y+1], which one is closest to player)
 * @param {dictionary} point with x index representing x coord and y index representing y coord
 */
function getAdjacentPointClosestToPlayer(point) {
    var adjPoints = [];
    var minPoint = [MAX_DISTANCE, { x: MAX_DISTANCE, y: MAX_DISTANCE }];
    for (var i = 0; i < 4; i++) {
        var toCheck = { x: point.x + ROW_NUM[i], y: point.y + COL_NUM[i] };
        var curDist = getShortestPath(playerCoords, toCheck, DIST, false);
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

const skills = {
    sword: [],
    axe: [],
    spear: [],
    bow: [],
    fire: [{ name: "Fireball", range: 10 }],
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

class InventoryObject {
    name = "";
    rarity = RARITY_COMMON;
    isArmor = false;
    flavorText = "";
    imageURL = "none.png"
    bonus = 0;

    constructor(name, rarity, isArmor, flavorText, imageURL, bonus) {
        this.name = name;
        this.rarity = rarity;
        this.isArmor = isArmor;
        this.flavorText = flavorText;
        this.imageURL = imageURL;
        this.bonus = bonus;
    }

    typeString() {
        return "InventoryObject";
    }
}

class Equip extends InventoryObject {
    armorType = ARMOR_UNDEFINED;
    stats = [0, 0, 0, 0, 0, 0];

    // damage and range if this is a weapon
    damage = 0;
    range = 1;

    constructor(name, rarity, armorType, flavorText, imageURL, bonus) {
        super(name, rarity, true, flavorText, imageURL, bonus);
        this.armorType = armorType;
    }

    typeString() {
        return "Equip";
    }
}

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
    inventory = [];

    constructor(inventory) {
        super(1, "#BBAA10", false, true, true)
        this.inventory = inventory;
    }

    typeString() {
        return "Chest";
    }
}

class DroppedItems extends WorldObject {
    inventory = [];
    constructor(inventory) {
        super(1, "#855510", false, true, false);
        this.inventory = inventory;
    }

    typeString() {
        return "Dropped Items";
    }
}

class Door extends WorldObject {

    locked = false;

    constructor(locked) {
        super(100, "#b38200", false, false, true);
        this.locked = locked;
    }

    typeString() {
        return "Door";
    }

    /**
     * Toggle opened status of this door, don't allow if locked.
     */
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

    maxhp = 1;
    hp = 1;
    maxmana = 1;
    mana = 1;

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

    equipment = {};

    inventory = [];

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

        this.maxhp = (this.con * 5) + Math.floor(Math.pow(2, this.con / 4));
        this.hp = this.maxhp;

        this.maxmana = Math.floor(5 + (this.int / 2) + (this.wil / 2) + (this.age / 20));
        this.mana = this.maxmana;

        this.equipment[ARMOR_HELMET] = null;
        this.equipment[ARMOR_TORSO] = null;
        this.equipment[ARMOR_PANTS] = null;
        this.equipment[ARMOR_RING] = null;
        this.equipment[ARMOR_RIGHTHAND] = null;
        this.equipment[ARMOR_LEFTHAND] = null;

        this.gender = Math.floor(Math.random() * 2);
        this.name = generateName(this.gender) + " " + generateName(2);
    }

    typeString() {
        return "Character";
    }
}

class Enemy extends Character {

    typeString() {
        return "Enemy";
    }
}

class Corpse extends Character {
    constructor(name, age, gender, race, inventory) {
        super();
        this.containsLoot = true;
        this.name = name;
        this.age = age;
        this.gender = gender;
        this.race = race;
        this.inventory = inventory;
    }

    typeString() {
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

    /**
     * Add an object/some objects to the contents of this tile
     * @param {mixed} contents either an array of objects, or an object to add to the contents of this tile
     */
    addContents(contents) {
        if (Array.isArray(contents)) {
            this.contents.concat(contents);
        } else {
            this.contents.push(contents);
        }
        this.updateOverride();
    }

    /**
     * Updates the color of this tile for the display depending on its contents
     */
    updateOverride() {
        if (this.contents.length == 0) {
            this.displayColor = this.defaultColor;
            this.outlineColor = this.defaultColor;
        } else {
            var currentOutlinePriority = (this.contents[0].outline ? this.contents[0].priority : -10000);
            var currentlyOutlined = this.contents[0].outline;
            var currentDisplayItem = this.contents[0];
            this.outlineColor = this.contents[0].color;
            for (var i = 1; i < this.contents.length; i++) {
                if (this.contents[i].outline && this.contents[i].priority > currentOutlinePriority) {
                    currentOutlinePriority = this.contents[i].priority;
                    currentlyOutlined = true;
                    this.outlineColor = this.contents[i].color;
                } else if (this.contents[i].priority > currentDisplayItem.priority || currentDisplayItem.outline) {
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

    /**
     * Removes all objects from this tile's contents with the specified typeString
     * @param {string} toRemove typeString of object to remove
     */
    removeContentByType(toRemove) {
        for (var i = this.contents.length - 1; i >= 0; i--) {
            if (this.contents[i].typeString() == toRemove) {
                this.contents.splice(i, 1);
            }
        }
        this.updateOverride();
    }

    /**
     * Check if this tile's contents contains an object with the specified typeString
     * @param {string} toFind typeString of object to find
     */
    containsContentByType(toFind) {
        for (var i = 0; i < this.contents.length; i++) {
            if (this.contents[i].typeString() == toFind) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns the first object with the specified typeString, or false if none
     * @param {string} toFind typeString of object to find
     */
    getFirstContentByType(toFind) {
        for (var i = 0; i < this.contents.length; i++) {
            if (this.contents[i].typeString() == toFind) {
                return this.contents[i];
            }
        }
        return false;
    }

    /**
     * Returns the first object with the lootable property inside this tile's contents, or false if none
     */
    getFirstLootableObject() {
        for (var i = 0; i < this.contents.length; i++) {
            if (this.contents[i].containsLoot) {
                return this.contents[i];
            }
        }
        return false;
    }

    /**
     * Checks if this tile contains an object with the lootable property
     */
    containsLootableObject() {
        for (var i = 0; i < this.contents.length; i++) {
            if (this.contents[i].containsLoot) {
                return true;
            }
        }
        return false;
    }
}

/**
 * Function to generate character names, with some degree of realism (lol)
 * @param {int} charGender representing the gender of the name, 0 for male, 1 for female, 2 for random
 */
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

/**
 * Average the RGB values between two colors and return the resulting color
 * @param {string} color1 to average with color2
 * @param {string} color2 to average with color1
 */
function blendColors(color1, color2) {
    var r1 = parseInt(color1.substr(1, 2), 16);
    var g1 = parseInt(color1.substr(3, 2), 16);
    var b1 = parseInt(color1.substr(5), 16);
    var r2 = parseInt(color2.substr(1, 2), 16);
    var g2 = parseInt(color2.substr(3, 2), 16);
    var b2 = parseInt(color2.substr(5), 16);
    var ravg = Math.floor((r1 + r2) / 2).toString(16);
    if (ravg.length == 1) {
        ravg = "0" + ravg;
    }
    var gavg = Math.floor((g1 + g2) / 2).toString(16);
    if (gavg.length == 1) {
        gavg = "0" + gavg;
    }
    var bavg = Math.floor((b1 + b2) / 2).toString(16);
    if (bavg.length == 1) {
        bavg = "0" + bavg;
    }
    return "#" + ravg + gavg + bavg;
}

/**
 * Check if point is both inbounds and not a wall/impassable tile
 * @param {dictionary} point to check
 */
function pointIsValid(point) {
    var isInbounds = pointIsInbounds(point);
    if (!isInbounds) return isInbounds;
    var containsImpassableObject = false;
    for (var i = 0; i < gameMap[point.y][point.x].contents.length; i++) {
        if (gameMap[point.y][point.x].contents[i].impassable && gameMap[point.y][point.x].contents[i].typeString() !== "Player") {
            containsImpassableObject = true;
        }
    }
    return (isInbounds && gameMap[point.y][point.x].type < 100 && !containsImpassableObject);
}

/**
 * Check if point is in the render area
 * @param {dictionary} point to check
 */
function pointIsInbounds(point) {
    return (point.x >= 0 && point.x < renderW && point.y >= 0 && point.y < renderH);
}

/**
 * Check if two points are equal - needed since two points need to be referencing the same object for them to be considered equal otherwise.
 * @param {dictionary} point1 
 * @param {dictionary} point2 
 */
function pointsAreEqual(point1, point2) {
    return (point1.x == point2.x && point1.y == point2.y);
}

/**
 * Print point in string form - used for debugging
 * @param {dictionary} point to print
 */
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
        case ALL_PATHS:
            return minPaths;
        case ALL_DISTS:
            return dist;
    }
}


/**
 * Get list of points from point1 to point2, crossing all untraversable terrain, essentially a helper method for High/LowLine
 * src: https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
 * @param {dictionary} point1 
 * @param {dictionary} point2 
 */
function line(point1, point2) {
    if (Math.abs(point2.y - point1.y) < Math.abs(point2.x - point1.x)) {
        if (point1.x > point2.x) {
            return lowLine(point2, point1);
        } else {
            return lowLine(point1, point2);
        }
    } else {
        if (point1.y > point2.y) {
            return highLine(point2, point1);
        } else {
            return highLine(point1, point2);
        }
    }
}

/**
 * Get Bresenham Line for points with slope > 0.5
 * @param {dictionary} point1 
 * @param {dictionary} point2 
 */
function highLine(point1, point2) {
    var dx = point2.x - point1.x;
    var dy = point2.y - point1.y;
    xi = 1;
    if (dx < 0) {
        xi = -1;
        dx = -dx;
    }
    var D = (2 * dx) - dy;
    var x = point1.x;

    var result = [];
    for (var y = point1.y; y <= point2.y; y++) {
        result.push({ x: x, y: y });
        if (D > 0) {
            x += xi;
            D -= 2 * dy;
        }
        D += 2 * dx;
    }
    return result;
}

/**
 * Get Bresenham Line for points with slope < 0.5
 * @param {dictionary} point1 
 * @param {dictionary} point2 
 */
function lowLine(point1, point2) {
    var dx = point2.x - point1.x;
    var dy = point2.y - point1.y;
    var yi = 1;
    if (dy < 0) {
        yi = -1;
        dy = -dy;
    }
    var D = (2 * dy) - dx;
    var y = point1.y;

    var result = [];
    for (var x = point1.x; x <= point2.x; x++) {
        result.push({ x: x, y: y });
        if (D > 0) {
            y += yi;
            D -= 2 * dx;
        }
        D += 2 * dy;
    }
    return result;
}

/**
 * Get line from point1 to point2 without crossing traversable terrain using BresenhamLine()
 * @param {dictionary} point1 
 * @param {dictionary} point2 
 */
function raycast(point1, point2) {
    var rayLine = line(point1, point2);
    if (pointsAreEqual(point1, rayLine[0])) {
        rayLine.reverse();
    }
    for (var i = rayLine.length - 1; i >= 0; i--) {
        if (!pointIsValid(rayLine[i])) {
            rayLine.pop();
            return rayLine.splice(i + 1);
        }
    }
    rayLine.pop();
    return rayLine;
}

/**
 * Get outline of a circle centered on a point with a given radius
 * @param {dictionary} center center of the circle
 * @param {int} radius of circle to get points for
 */
function getCircle(center, radius) {
    var result = [];
    var x = radius;
    var y = 0;
    var radiusError = 1 - x;
    while (x >= y) {
        result.push({ x: x + center.x, y: y + center.y });
        result.push({ x: y + center.x, y: x + center.y });
        result.push({ x: -x + center.x, y: y + center.y });
        result.push({ x: -y + center.x, y: x + center.y });
        result.push({ x: x + center.x, y: -y + center.y });
        result.push({ x: y + center.x, y: -x + center.y });
        result.push({ x: -x + center.x, y: -y + center.y });
        result.push({ x: -y + center.x, y: -x + center.y });
        y++;

        if (radiusError < 0) {
            radiusError += 2 * y + 1;
        } else {
            x--;
            radiusError += 2 * (y - x + 1);
        }
    }
    return result;
}

/**
 * Get all spaces in a circular area affected by an aoe ability
 * @param {dictionary} center center of the aoe circle
 * @param {int} radius of aoe
 */
function getCircularExplosion(center, radius) {
    var outline = getCircle(center, radius);
    var result = [];
    for (var i = 0; i < outline.length; i++) {
        result = mergeArrays(result, raycast(center, outline[i]));
    }
    return result;
}

/**
 * Unionize two arrays
 * @param {array} array1 
 * @param {array} array2 
 */
function mergeArrays(x, y) {
    var joinedArray = [...x, ...y];
    return joinedArray.filter((item, index) => joinedArray.indexOf(item) === index);
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

var gameMap = [];
var overlay = [];
for (var i = 0; i < renderH; i++) {
    // create new arrays
    var row = [];
    for (var j = 0; j < renderW; j++) {
        row.push(newGrassTile());
    }
    gameMap.push(row);
}
unsetOverlay();

/**
 * set all overlay values to false, signifying not to modify the colors of any of the tiles
 */
function unsetOverlay() {
    overlay = [];
    for (var i = 0; i < renderH; i++) {
        var row = [];
        for (var j = 0; j < renderW; j++) {
            row.push(false);
        }
        overlay.push(row);
    }
}

placeRectangle({ x: 3, y: 5 }, { x: 9, y: 13 }, "newWallTile");
fillRectangle({ x: 4, y: 6 }, { x: 8, y: 12 }, "newStoneTile");

gameMap[9][9] = newStoneTile();
gameMap[9][9].addContents(new Door(false));

gameMap[20][20].addContents(new Chest([]));
gameMap[20][20].getFirstLootableObject().inventory.push(new InventoryObject("Test Object", RARITY_COMMON, false, "Hello", "Images/none.png", 0));

gameMap[12][12].addContents(playerChar);
fillRectangle({ x: 20, y: 2 }, { x: 23, y: 5 }, "newOceanTile");

playerCoords = { x: 12, y: 12 };

updateHealthDisplay();

// start game on load
window.onload = function () {
    ctx = document.getElementById("game").getContext("2d");
    this.requestAnimationFrame(drawGame);
    this.ctx.font = "bold 10pt sans-serfix";
}

function newGrassTile() {
    return new Tile(0, [], "#6AA323", "Grass");
}
function newWallTile() {
    return new Tile(100, [], "#505050", "Stone Wall");
}
function newStoneTile() {
    return new Tile(1, [], "#A0A0A0", "Stone Floor");
}
function newOceanTile() {
    return new Tile(101, [], "#5050BB", "Ocean")
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

playerChar.inventory.push(new Equip("Sword of the Stinky", RARITY_EPIC, ARMOR_ONEHAND, "The stinkiest sword to ever grace humanity", "Images/none.png", 0));
playerChar.inventory.push(new Equip("Poopy Claymore", RARITY_UNCOMMON, ARMOR_TWOHAND, "Big poop sword", "Images/none.png", 0));
playerChar.inventory.push(new Equip("Ring", RARITY_EPIC, ARMOR_RING, "A ring lol", "Images/none.png", 0));


updateInventoryDisplay();