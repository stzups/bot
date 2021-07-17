import {Vec3} from 'vec3'
import {Bot, BotOptions} from 'mineflayer'
import {Block} from 'prismarine-block';
import {Item} from "minecraft-data";

const environment: Environment = require('./bin/environment')
const mineflayer = require('mineflayer')
require('vec3')
const data = require('minecraft-data')('1.16.5')

const botOptions: BotOptions = {
    host: environment.host,
    username: environment.username,
    password: environment.password,
    checkTimeoutInterval: 1000 * 60 * 5,
}

const ops = [
    'Lem0nPickles',
]

console.log('Creating bot with username ' + botOptions.username)

const bot = mineflayer.createBot(botOptions)

bot.on('error', console.log)

bot.on('login', () => {
    console.log('Logged in to ' + botOptions.host)
})
bot.on('spawn', () => {
    console.log('Spawned')
})

bot.on('kicked', (reason: String) => {
    console.log('Kicked: ' + reason)
})

bot.on('entityHurt', () => {
    console.log('entityHurt')
})

bot.on('death', () => {
    console.log('death')
})





bot.on('death', () => {
    bot.chat('ahhhhhh')
})

bot.on('entityHurt', () => {
    bot.chat('ouch')
})

bot.on('spawn', async () => {
    bot.chat('hello')
/*    await bot.waitForTicks(20)
    let pos = bot.entity.position.floor()
    if (!pos.equals(spawn)) {
        throw new Error('bad pos ' + pos)
    }*/

    bot.on('whisper', async (username: string, message: string) => {
        if (ops.includes(username)) {
            try {
                let split: string[] = message.split(' ')
                if (split.length === 0) {
                    bot.whisper(username, 'No arguments specified')
                }
                switch (split[0]) {
                    case 'mine':
                        bot.whisper(username, 'mining')
                        mine(bot, new Vec3(0, 0, 0), new Vec3(0, 0, 0), new Vec3(1, 0, 0))
                        break
                    case 'farm':
                        bot.whisper(username, 'farming')
                        farm(bot, new Vec3(-130, 71, -174), 31, 5)
                        break
                    case 'move':
                        let move = async (direction: string, ticks: number) => {
                            bot.setControlState(direction, true)
                            await bot.waitForTicks(ticks)
                            bot.setControlState(direction, false)
                        }
                        let ticks = 5;
                        if (split.length <= 1) {
                            bot.whisper(username, 'Not enough movement arguments')
                            return;
                        }
                        for (let i = 0; i < split[1].length; i++) {
                            let direction: string;
                            let raw = split[1].charAt(i)
                            switch (raw) {
                                case 'w':
                                    direction = 'forward'
                                    break
                                case 'a':
                                    direction = 'left'
                                    break
                                case 's':
                                    direction = 'back'
                                    break
                                case 'd':
                                    direction = 'right'
                                    break
                                case 'j':
                                    direction = 'jump'
                                    break
                                default:
                                    bot.whisper(username, 'Unknown direction ' + raw)
                                    return
                            }
                            await move(direction, direction !== 'jump' ? ticks : 0)
                        }
                        break
                    case 'look':
                        if (split.length !== 4) {
                            bot.whisper(username, 'Incorrect arguments, try look 0 0 0')
                            return
                        }

                        let coords = parseInts(split, 1, 3)
                        bot.lookAt(bot.entity.position.clone().add(new Vec3(coords[0], coords[1], coords[2])))
                        break
                    default:
                        bot.whisper(username, 'Unknown command ' + message)
                }
            } catch (e) {
                if (e instanceof Error) {
                    bot.whisper(username, 'Error: ' + e.message)
                }
            }
        }
    })
})

function parseInts(strings: string[], offset: number, amount: number): number[] {
    let numbers: number[] = [];

    if (strings.length - 1 < amount) {
        throw new Error('Not enough arguments')
    }

    for (let i = 0; i < strings.length && (amount <= 0 || i < amount); i++) {
        numbers[i] = parseInt(strings[i + 1])
        if (isNaN(numbers[i])) {
            throw new Error(strings[i + 1] + ' is not a number')
        }
    }

    return numbers;
}

async function mine(bot: Bot, input: Vec3, output: Vec3, add: Vec3) {
    let bottom = true;
    let up = new Vec3(0, 1, 0);
    bot.lookAt(bot.entity.position.clone().add(add));
    bot.setControlState('forward', true);
    while (true) {
        let pos = bot.entity.position.clone().add(add);
        await bot.dig(getBlock(bot, pos));
        await bot.dig(getBlock(bot, pos.add(up)));
        bottom = !bottom;
    }
}

function getBlock(bot: Bot, vec3: Vec3): Block {
    let block = bot.blockAt(vec3);
    if (block === null) {
        throw new Error('Block at ' + vec3 + ' not loaded');
    }

    return block;
}

// location of input of seeds
const INPUT = new Vec3(-134, 72, -174)
// maximum amount to withdraw each refill
const INGREDIENT_AMOUNT = 512

async function getAndWithdraw(bot: Bot, location: Vec3, itemType: number, maxAmount: number): Promise<boolean> {
    await moveTo(bot, location, 2, 2)
    // @ts-ignore https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md#botopenchestchestblock-or-minecartchestentity
    let window = await bot.openContainer(getBlock(bot, location))
    let amt = Math.min(maxAmount, fixedWindowCount(window, itemType))
    if (amt === 0) {
        return false
    }
    await window.withdraw(itemType, null, amt)
    await window.close()
    return true
}

// window#count always returns 0
function fixedWindowCount(window: any, itemType: number): number {
    let count = 0;
    for (let item of window.slots) {
        if (item === null) continue

        if (item.type === itemType) {
            count += item.count
        }
    }
    console.log(count)
    return count
}

// Item of seed to plant
const SEED_TYPE: Item = data.itemsByName.wheat_seeds

async function farm(bot: Bot, start: Vec3, length: number, width: number) {
    const FAR = 1
    const CLOSE = .1
    let a = 1;
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < length + 1; j++) {
            await moveTo(bot, start, FAR, CLOSE)
            let pos = start.clone()
                .subtract(new Vec3(-4, 0, 0))
            for (let k = 0; k < 9; k++) {
                if (bot.heldItem === null) {
                    if (bot.inventory.findInventoryItem(SEED_TYPE.id, null, false) === null && !await getAndWithdraw(bot, INPUT, SEED_TYPE.id, INGREDIENT_AMOUNT)) {
                        throw new Error('Can\'t find any ' + SEED_TYPE.displayName + ' in player inventory or input inventory at ' + INPUT)
                    }
                    await bot.waitForTicks(1)
                    if (bot.heldItem === null) { // bot#equip errors when hand is already full
                        // @ts-ignore bot#equip is able to take itemType/id number instead of Item reference
                        await bot.equip(SEED_TYPE.id, 'hand');
                    }
                }
                bot.dig(getBlock(bot, pos))
                bot.placeBlock(getBlock(bot, pos), new Vec3(0, 1, 0))
                    .catch((e) => {
                        if (e instanceof Error) {
                            if (!e.message.startsWith('No block has been placed')) {
                                console.log(e.message)
                            }
                        } else {
                            console.error('Throwing!')
                            throw e
                        }
                    })
                await bot.waitForTicks(1)
                pos.add(new Vec3(-1, 0, 0))
            }
            if (j !== length) {
                start.add(new Vec3(0, 0, a))
            }
        }
        a *= -1
        start.add(new Vec3(9, 0, 0))
    }
}

interface Move {
    target: Vec3,
    far: number,
    close: number,
    resolved: boolean,
    resolve: (value: void | PromiseLike<void>) => void
}
let move: Move | null = null
bot.on('move', async () => {
    if (move !== null) {
        if (!bot.getControlState('forward')) {
            await bot.setControlState('forward', true)
        }
        console.log('+' + move.target)
        await bot.lookAt(move.target)
        console.log('-' + move.target)
        let distance = bot.entity.position.xzDistanceTo(move.target)
        if (!move.resolved) {
            if (distance < move.far) {
                move.resolved = true
                move.resolve()
            }
        } else {
            if (distance < move.close
                || distance > move.far) {
                await bot.setControlState('forward', false)
                move = null
            }
        }
    }
})
function moveTo(bot: Bot, target: Vec3, far: number, close: number): Promise<void> {
    return new Promise(async (resolve, reject) => {
        if (move !== null) {
            move.resolve()
        }
        console.log('t' + target)
        move = {
            target: target.clone().add(new Vec3(0.5, 1.5, 0.5)),
            far: far,
            close: close,
            resolved: false,
            resolve: resolve
        }
        console.log('m' + move.target)
    })
}