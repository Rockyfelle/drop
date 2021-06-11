/*------------ GLOBAL VARIABLES ------------*/
const cellSize = 75;
const cellsHorizontal = 5;
const cellsVertical = 8;
const playGrid = [...Array(cellsHorizontal)].map(x => Array(cellsVertical).fill(0))
const areaPlayGridWidth = cellsHorizontal * cellSize;
const areaPlayGridHeight = cellsVertical * cellSize;
const areaPlayGridColor = "#383838";
const areaPlayGridColor2 = "#484848";
const gameBlockSpeed = 1.5;
const mergeSpeed = 0.15;
const multiplySpeed = 0.1;
const mouse = { x: 0, y: 0 };
const player = { x: 0, y: 0, num: 0 };
const numColor = {
    2: "#B61616",
    4: "#44B616",
    8: "#129263",
    16: "#126592",
    32: "#241292",
    64: "#741292",
    128: "#921233",
    256: "#1A443C",
    512: "#1A2844",
    1024: "#371A44",
    2048: "#441A38",
    4096: "#442D1A"
}
const gameQueue = [];
let secondsPassed;
let oldTimeStamp;
let fps;
let lastCellPos = 0;
let ticks = 0;
let hasClicked = false;
let hasUnClicked = false;
let playMode = "player";
let checkArray = [];
let combineArray = [];
let fallArray = [];
let gameBlockSpeedFall = 1;
let aniPerc = 0;
let playerAlive = true;
let percent = 0;

spawnBlock();



/*------------ CANVAS INIT ------------*/
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const areaX = canvas.width / 2 - areaPlayGridWidth / 2;
const areaY = canvas.height / 2 - areaPlayGridHeight / 2;
window.addEventListener('touchmove', handleTouchMove, false);
window.addEventListener('touchstart', handleTouchMove, false);
window.addEventListener('touchend', handleTouchEnd, false);
window.addEventListener("mousemove", mouseMoveHandler, false);
window.addEventListener("mousedown", mouseClickHandler, false);
window.addEventListener("mouseup", mouseUnClickHandler, false);

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

    //Speed up the falling block
    if (gameQueue.length === 0) {
        if (playerAlive === false) {
            playerAlive = true;
            spawnBlock();
        }

        if (hasUnClicked) {
            gameBlockSpeedFall = 40;
            hasUnClicked = !hasUnClicked;
        }

        //Update player column, unless the user has sped up the block fall (clicked it), or if the column is blocked
        if (mouse.xx > -1 && mouse.xx < cellsHorizontal && gameBlockSpeedFall === 1) {
            if (playGrid[mouse.xx][player.y] === 0 && playGrid[mouse.xx][player.y + 1] === 0) {
                player.x = mouse.xx;
            }
        }

        //Fall the player block
        if (aniPerc > 100) {
            player.y += 1;
            aniPerc -= 100;
        }

        //Has the player block hit something?
        if (playGrid[player.x][player.y + 1] !== 0 || player.y >= cellsVertical) {

            //Has it hit the top level? Game Over
            if (player.y <= 1) {
                playGrid.forEach((array, x) => {
                    array.forEach((cell, y) => {
                        playGrid[x][y] = 0;
                        return;
                    })
                })
            }

            //Process block collision
            gameBlockSpeedFall = 1;
            playerAlive = false;
            playGrid[player.x][player.y] = player.num;
            gameQueue.push({ type: "check", x: player.x, y: player.y });
            lastCellPos = player.x;
        }
    }
    else if (gameQueue[0].type === "check") {
        playerAlive = false;

        //X and Y for current cell
        const x = gameQueue[0].x;
        const y = gameQueue[0].y;

        //Save positions of all cells that the current cell will be multiplied with
        let matches = [];
        [0, 1, 2, 3].forEach((dir) => {
            const otherCell = getCellByDir(x, y, dir);
            if (isBlockSame(x, y, otherCell.x, otherCell.y)) {
                matches.push(getCellByDir(x, y, dir));
            }
        });

        //if any multiplication oppurtunities were found
        if (matches.length > 0) {

            //Queue all the blocks to be merged
            const mergeArray = [];
            const fallArray = []
            matches.forEach((cell) => {

                mergeArray.push({ oldX: cell.x, oldY: cell.y, newX: x, newY: y, num: playGrid[cell.x][cell.y] });
                //If there is a block above the block-to-be-deleted, add it to the falling queue
                /*if (playGrid[cell.x][cell.y - 1] !== 0) fallArray.push({ x: cell.x, y: cell.y - 1, num: playGrid[cell.x][cell.y - 1] })*/
                playGrid[cell.x][cell.y] = 0;

            });
            gameQueuePush({ type: "merge", array: mergeArray });
            gameQueuePush({ type: "multiply", x: x, y: y, to: Math.pow(2, matches.length) * playGrid[x][y] })
            fallArray.forEach((item) => {
                //gameQueuePush({type: "fall", x: item.x, y: item.y, num: item.num});
            });

        }

        gameQueueShift();
    }
    else if (gameQueue[0].type === "merge") {
        playerAlive = false;

        percent += mergeSpeed;
        if (percent > 1) {
            percent = 0;
            gameQueue[0].array.forEach((item) => {

                //If block has merged into another (moved), check if there was a block on top of it, and add to fall array
                if (playGrid[item.oldX][item.oldY - 1] !== 0 && item.newY !== item.oldY - 1) {
                    gameQueuePush({ type: "fall", x: item.oldX, y: item.oldY - 1, num: playGrid[item.oldX][item.oldY - 1] })
                }
            })

            //Merge is done
            gameQueueShift();
        }
    }
    else if (gameQueue[0].type === "multiply") {
        playerAlive = false;
        percent += multiplySpeed;

        if (percent > 1) {
            percent = 0;
            playGrid[gameQueue[0].x][gameQueue[0].y] = gameQueue[0].to;

            //If, as a result of the merger, the block can now fall, add it to the fall array
            if (playGrid[gameQueue[0].x][gameQueue[0].y + 1] === 0) {
                gameQueuePush({ type: "fall", x: gameQueue[0].x, y: gameQueue[0].y, num: playGrid[gameQueue[0].x][gameQueue[0].y] });
            } else {
                //Now that the number on the block is different, check it again for potential new matches
                gameQueuePush({ type: "check", x: gameQueue[0].x, y: gameQueue[0].y })
            }



            //Multiply is done
            gameQueueShift();
        }


    }
    else if (gameQueue[0].type === "fall") {
        const x = gameQueue[0].x;
        const y = gameQueue[0].y;
        if (percent === 0) {
            playerAlive = false;
            playGrid[x][y] = 0;
        }

        percent += mergeSpeed;
        if (percent > 1) {
            percent = 0;
            playGrid[x][y + 1] = gameQueue[0].num;
            //Add new position to be checked
            gameQueuePush({ type: "check", x: x, y: y + 1 })

            //If the fall made another block fall as a consequence, add that block to fall
            if (playGrid[x][y - 1] !== 0) {
                gameQueuePush({ type: "fall", x: x, y: y - 1, num: playGrid[x][y - 1] });
            }

            //Now that the fall is complete, add a check step to see if theres any new mergers to be done in the new position
            gameQueuePush({ type: "check", x: x, y: y + 1 })

            //Fall is done
            gameQueueShift();
        }
    }

    // Perform the drawing operation
    draw();

    // The loop function has reached it's end. Keep requesting new frames
    window.requestAnimationFrame(gameLoop);
}



function spawnBlock() {
    aniPerc = 0;
    const blocksAvailable = [2, 4, 8, 16, 32, 64];
    player.num = blocksAvailable[Math.floor(Math.random() * blocksAvailable.length)];
    player.x = lastCellPos;
    player.y = 0;
}

function changeMode(mode) {
    aniPerc = 0;
    if (mode == "player") {
        playmode = "player";
        spawnBlock();
        playerAlive = true;
    }
    else if (mode == "multiplying") {
        playMode = "multiplying";
    }
    else if (mode == "combine") {
        playMode = "combine";
    }
}

function gameQueueShift() {
    //console.log("Finished " + gameQueue[0].type);
    gameQueue.shift();
    //console.table(gameQueue);
    if (gameQueue.length === 0) {
        //console.log("Starting player");
        spawnBlock();
    } else {
        //console.log("Starting " + gameQueue[0].type);
    }
}

function gameQueuePush(obj) {
    //console.log("Added " + obj.type);
    gameQueue.push(obj);
    //console.table(gameQueue);
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
    context.fillStyle = '#242424';
    context.fillRect(areaX, areaY, areaPlayGridWidth, cellSize);
    for (let i = 0; i < cellsHorizontal; i++) {
        context.fillStyle = '#333333';
        roundedRectangle(context, areaX + 8 + i * cellSize, areaY + 8, cellSize - 16, cellSize - 16, 10);
    }

    if (playerAlive) {
        //Draw player block
        const addFall = (aniPerc / 100) * cellSize;
        drawBlock(context, areaX + player.x * cellSize, areaY + player.y * cellSize + addFall, cellSize, cellSize, player.num);
    }

    //Draw mergers
    if (gameQueue.length > 0 && gameQueue[0].type === "merge") {
        gameQueue[0].array.forEach((item) => {
            const movX = (item.newX * cellSize - item.oldX * cellSize) * percent;
            const movY = (item.newY * cellSize - item.oldY * cellSize) * percent;
            drawBlock(context, areaX + item.oldX * cellSize + movX, areaY + item.oldY * cellSize + movY, cellSize, cellSize, item.num);
        });
    }

    //Draw playgrid
    playGrid.forEach((array, x) => {
        array.forEach((cell, y) => {
            if (cell !== 0) {
                const addNum = (gameQueue.length > 0 && gameQueue[0].type === "multiply" && gameQueue[0].x === x && gameQueue[0].y === y) ? Math.floor(cell * percent) : 0;
                if (addNum != 0) console.log(addNum)
                drawBlock(context, areaX + x * cellSize, areaY + y * cellSize, cellSize, cellSize, cell + addNum);
            }
        });
    });

    //Draw falls
    if (gameQueue.length > 0 && gameQueue[0].type === "fall") {
        item = gameQueue[0];
        const movY = cellSize * percent;
        drawBlock(context, areaX + item.x * cellSize, areaY + item.y * cellSize + movY, cellSize, cellSize, item.num);
    }

    // Draw FPS
    context.font = '25px Arial';
    context.fillStyle = 'white';
    context.textAlign = "left";
    context.fillText("FPS: " + fps, 10, 30);
    context.fillText("X: " + mouse.xx, 10, 60);
    context.fillText("Y: " + mouse.yy, 10, 90);
    context.fillText("Type: " + (gameQueue.length > 0 ? gameQueue[0].type : 'undf'), 10, 120);
}





/*------------ HELP FUNCTIONS ------------*/

function drawBlock(context, x, y, w, h, num) {
    context.fillStyle = numColor[pow2floor(num)];
    roundedRectangle(context, x + 4, y + 4, w - 8, h - 8, 10);
    context.font = 'bold 30px Arial';
    context.fillStyle = 'white';
    context.textAlign = "center";
    context.fillText(num, x + cellSize / 2, 11 + y + cellSize / 2);
}

function isBlockSame(x, y, xx, yy) {
    if (x < 0 || x >= cellsHorizontal || xx < 0 || xx >= cellsHorizontal) return false;
    if (y < 0 || y >= cellsVertical || yy < 0 || yy >= cellsVertical) return false;
    if (playGrid[x][y] === playGrid[xx][yy]) return true;
    return false;
}

function getCellByDir(x, y, dir) {
    if (dir === 0) return { x: x + 1, y: y };
    if (dir === 1) return { x: x, y: y + 1 };
    if (dir === 2) return { x: x - 1, y: y };
    if (dir === 3) return { x: x, y: y - 1 };
}

function handleTouchMove(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
}

function handleTouchEnd(e) {
    hasUnClicked = true;
}

function mouseMoveHandler(e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
}

function mouseClickHandler(e) {
    hasClicked = true;
}

function mouseUnClickHandler(e) {
    hasUnClicked = true;
}

//https://codepen.io/simon-wu/pen/ExgLEXQ
function roundedRectangle(context, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
    context.fill();
}

//https://stackoverflow.com/questions/26965171/fast-nearest-power-of-2-in-javascript
function pow2floor(v) {
    var p = 1;
    while (v >>= 1) {
        p <<= 1;
    }
    return p;
}

/*------------ START THE LOOP ------------*/
window.requestAnimationFrame(gameLoop);