/*------------ GLOBAL VARIABLES ------------*/
const cellSize = 75;
const cellsHorizontal = 7;
const cellsVertical = 10;
const playGrid = [...Array(cellsHorizontal)].map(x => Array(cellsVertical).fill(0))
const areaPlayGridWidth = cellsHorizontal * cellSize;
const areaPlayGridHeight = cellsVertical * cellSize;
const areaPlayGridColor = "#383838";
const areaPlayGridColor2 = "#484848";
const gameBlockSpeed = 0.2;
const combineSpeed = 0.7;
const mouse = { x: 0, y: 0 };
const player = { x: 0, y: 0, num: 0 };
const numColor = {
    2: "purple",
    4: "green",
    8: "blue",
    16: "orange",
    32: "red",
    64: "aqua",
    128: "pink"
}
let secondsPassed;
let oldTimeStamp;
let fps;
let lastCellPos = 0;
let ticks = 0;
let hasClicked = false;
let playMode = "player";
let checkArray = [];
let combineArray = [];
let fallArray = [];
let gameBlockSpeedFall = 1;
let aniPerc = 0;
let playerAlive = true;

spawnBlock();


/*------------ CANVAS INIT ------------*/
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const areaX = canvas.width / 2 - areaPlayGridWidth / 2;
const areaY = canvas.height / 2 - areaPlayGridHeight / 2;
window.addEventListener("mousemove", mouseMoveHandler, false);
window.addEventListener("mousedown", mouseClickHandler, false);

// resize the canvas to fill browser window dynamically
//window.addEventListener('resize', resizeCanvas, false);


/*------------ GAME LOOP ------------*/
function gameLoop(timeStamp) {

    //New tick
    ticks++;
    aniPerc += gameBlockSpeed * gameBlockSpeedFall;

    // Calculate the number of seconds passed since the last frame
    secondsPassed = (timeStamp - oldTimeStamp) / 1000;
    oldTimeStamp = timeStamp;
    fps = Math.round(1 / secondsPassed);

    //Update mos pos
    mouse.xx = Math.floor((mouse.x - areaX) / cellSize);
    mouse.yy = Math.floor((mouse.y - areaY) / cellSize);

    //If player is currently positioning a block
    if (playMode === "player") {

        if (hasClicked) {
            gameBlockSpeedFall = 60;
            hasClicked = !hasClicked;
        }

        //Update player column
        if (mouse.xx > -1 && mouse.xx < cellsHorizontal) {
            player.x = mouse.xx;
        }

        //Fall the player block
        if (aniPerc > 100) {
            player.y += 1;
            aniPerc -= 100;
        }

        //Has the block hit another block / ground?
        if (playGrid[player.x][player.y + 1] !== 0 || player.y >= cellsVertical) {

            //Process block collision
            gameBlockSpeedFall = 1;
            console.log("Collision!")
            playGrid[player.x][player.y] = player.num;
            checkArray.push({ x: player.x, y: player.y })
            changeMode("multiplying");
            console.log("CheckArray:");
            console.table(checkArray);
            lastCellPos = player.x;
            playerAlive = false;
            //spawnBlock();


        }
    }
    else if (playMode === "multiplying") {
        //Check for possible multiplications by going through the cells in checkArray
        if (checkArray.length > 0) {
            //x and y for current cell
            const x = checkArray[checkArray.length - 1].x;
            const y = checkArray[checkArray.length - 1].y;

            //Save positions of all cell that current cell will be multiplied will
            let matches = [];
            [0, 1, 2, 3].forEach((dir) => {
                const otherCell = getCellByDir(x, y, dir);
                if (isBlockSame(x, y, otherCell.x, otherCell.y)) {
                    //Add neighbour cell as a match since its the same number
                    matches.push(getCellByDir(x, y, dir));
                }
            });

            //if any multiplication oppurtunities were found
            if (matches.length > 0) {console.log("Multiplication found", matches)

                //Multiply the current cell the appropriate amount
                playGrid[x][y] = Math.pow(2, matches.length) * playGrid[x][y];
                matches.forEach((cell) => {

                    //Erase neighbour cell and add it to combineArray, and add the cell above it to fallArray if there is one
                    if (playGrid[cell.x][cell.y - 1] !== 0) {
                        //fallArray.push();
                    }
                    combineArray.push({ oldX: cell.x, oldY: cell.y, newX: x, newY: y, num: playGrid[cell.x][cell.y] });
                    playGrid[cell.x][cell.y] = 0;

                });

                changeMode("combine");

            } else {console.log("No multiplication found");
                //No multiplication oppurtunities found
                //Mark cell as checked
                if (checkArray.length === 1) checkArray = []; else checkArray = checkArray.pop();
                changeMode("player");
            }

            //Drop block down one level if possible
            /*if (playGrid[x][y + 1] === 0) {
                playGrid[x][y + 1] = playGrid[x][y];
                //We now also need to check the cell above us ad infinitum as that might fall as a result
            }*/


        } else {
            console.log("OHNOOOOOO!")
            playMode = "player"
        }
    }
    else if (playMode = "combine") {
        aniPerc += combineSpeed;console.log(aniPerc);
        if (aniPerc > 100) {
            aniPerc = 0;
            if (-1 > 0) {
                changeMode("fall");
            }
            else if (checkArray.length > 0) {
                changeMode("multiplying");
            } else {
                changeMode("player");
            }
        }
    }
/*
    else if (playMode = "fall") {
        aniPerc += combineSpeed;
        if (aniPerc > 100) {
            aniPerc = 0;
            if (fallArraylength > 0) {
                changeMode("fall");
            }
            else if (checkArray.length > 0) {
                changeMode("multiplying");
            } else {
                changeMode("player");
            }
        }
    }*/




    // Perform the drawing operation
    draw();

    // The loop function has reached it's end. Keep requesting new frames
    window.requestAnimationFrame(gameLoop);
}


function spawnBlock() {
    aniPerc = 0;
    const blocksAvailable = [2, 4, 8, 16, 32, 64, 128];
    player.num = blocksAvailable[Math.floor(Math.random() * blocksAvailable.length)];
    player.x = lastCellPos;
    player.y = 0;
}

function changeMode(mode) {
    aniPerc = 0;
    if (mode == "player") {
        playmode = "player";
        console.log("player");
        spawnBlock();
        playerAlive = true;
    }
    else if (mode == "multiplying") {
        playMode = "multiplying";
        console.log("multiplying");
    }
    else if (mode == "combine") {
        playMode = "combine";
        console.log("combining");
    }
}

/*------------ DRAW LOOP ------------*/
function draw() {



    //Draw playarea background
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = areaPlayGridColor;
    context.fillRect(canvas.width / 2 - areaPlayGridWidth / 2, canvas.height / 2 - areaPlayGridHeight / 2, areaPlayGridWidth, areaPlayGridHeight);
    for (let i = 0; i < Math.floor(cellsHorizontal); i += 2) {
        context.fillStyle = areaPlayGridColor2;
        context.fillRect(canvas.width / 2 - areaPlayGridWidth / 2 + cellSize * i, canvas.height / 2 - areaPlayGridHeight / 2, cellSize, areaPlayGridHeight);
    }

    if (playerAlive) {
        //Draw player block
        //const addFall = ((ticks % (gameBlockSpeed / gameBlockSpeedFall)) / (gameBlockSpeed / gameBlockSpeedFall)) * cellSize;
        const addFall = (aniPerc / 100) * cellSize;
        context.fillStyle = numColor[player.num];
        context.fillRect(areaX + player.x * cellSize, areaY + player.y * cellSize + addFall, cellSize, cellSize);
        context.font = '25px Arial';
        context.fillStyle = 'black';
        context.fillText(player.num, areaX + player.x * cellSize + cellSize / 2, areaY + player.y * cellSize + cellSize / 2 + addFall);
    }

    //Draw playgrid
    playGrid.forEach((array, x) => {
        array.forEach((cell, y) => {
            if (cell !== 0) {

                //Draw current cell
                context.fillStyle = numColor[cell];
                context.fillRect(areaX + x * cellSize, areaY + y * cellSize, cellSize, cellSize);
                context.font = '25px Arial';
                context.fillStyle = 'black';
                context.fillText(cell, areaX + x * cellSize + cellSize / 2, areaY + y * cellSize + cellSize / 2);

            }
        });
    });

    //Draw combines
    combineArray.forEach((item) => {
        const movX = (item.newX * cellSize - item.oldX * cellSize) * aniPerc;
        const movY = (item.newY * cellSize - item.oldY * cellSize) * aniPerc;
        context.fillStyle = numColor[item.num];
        context.fillRect(areaX + item.x * cellSize + movX, areaY + item.y * cellSize + movY, cellSize, cellSize);
    });

    // Draw FPS
    context.font = '25px Arial';
    context.fillStyle = 'white';
    context.fillText("FPS: " + fps, 10, 30);
    context.fillText("X: " + mouse.xx, 10, 60);
    context.fillText("Y: " + mouse.yy, 10, 90);
}


function isBlockSame(x, y, xx, yy) {
    if (x < 0 || x > cellsHorizontal || xx < 0 || xx > cellsHorizontal) return false;
    if (y < 0 || y > cellsVertical || yy < 0 || yy > cellsVertical) return false;
    if (playGrid[x][y] === playGrid[xx][yy]) return true;
    return false;
}

function getCellByDir(x, y, dir) {
    if (dir === 0) return { x: x + 1, y: y };
    if (dir === 1) return { x: x, y: y + 1 };
    if (dir === 2) return { x: x - 1, y: y };
    if (dir === 3) return { x: x, y: y - 1 };
}


/*------------ HELP FUNCTIONS ------------*/
function mouseMoveHandler(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
}

function mouseClickHandler(e) {
    hasClicked = true;
}


/*------------ START THE LOOP ------------*/
window.requestAnimationFrame(gameLoop);