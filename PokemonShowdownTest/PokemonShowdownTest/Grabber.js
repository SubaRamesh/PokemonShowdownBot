var ws = require('./WebSocketClient.js');
var Pokemon = require('@smogon/calc').Pokemon;
var Move = require('@smogon/calc').Move;
var calc = require('./Calculator.js');
var det = require('./Determine.js');


const STATES = {
    ACTIVE: {
        MOVE: 'active - move',
        SWITCH: 'active - switch'
    },
    FORCED_SWITCH: 'forced - switch',
    IDLE: 'idle'
};

const gen = 8;

let STATE = STATES.IDLE;

module.exports.currentStatus;
module.exports.turnNumber = 0;
module.exports.myPokemonList = [];
var isInstantiated_MyTeam = false;
module.exports.otherPokemonList = [];
var numKnownPokemon = -1;
module.exports.opposingCurrentPokemon = -1;
module.exports.selfCurrentPokemon = 0;
module.exports.activeDisabledMoves = [];

module.exports.read_status = function (Status) {//currently taking random action
    this.currentStatus = Status;
    if (Status == null || Status.wait)
        return;

    else if (Status.active) {
        if (!isInstantiated_MyTeam) {
            this.InstantiateTeam(this.currentStatus);
        }
        console.log('-----------CURRENT STATUS IS ACTIVE');
        STATE = STATES.ACTIVE;
        this.turnNumber++;
        ws.turnNumber = this.turnNumber;
    }
    else if (Status.forceSwitch) {
        console.log('-----------CURRENT STATUS IS FORCED SWITCH');
        STATE = STATES.FORCED_SWITCH;
    }

    this.take_action();

}


module.exports.take_action = async function () {
    await sleep(1000);
    det.UpdateValues();
    if (STATE == STATES.ACTIVE) {
        await sleep(1000)
        sendMove(det.findBestDamageMove(this.myPokemonList[this.selfCurrentPokemon]));
        //        ws.send_message(makeRandomMove());
        det.getOtherDamage(this.otherPokemonList[this.opposingCurrentPokemon]);

        return;
    }
    if (STATE == STATES.FORCED_SWITCH) {
        await sleep(1000);
        sendSwitch(det.findBestDamageSwitch());
        this.activeDisabledMoves = [];
        //ws.send_message(det.makeRandomSwitch());
    }
    //PrintMoves(this.otherPokemonList[this.opposingCurrentPokemon]);
}

module.exports.InstantiateTeam = async function (State) {
    var thisPokemon;
    var thisPokemonName;
    var thisPokemonLevel;
    var thisPokemonAbility;
    var thisPokemonItem;
    var thisPokemonMoves;
    if (State.active) {
        for (let index = 0; index < State.side.pokemon.length; index++) {
            thisPokemonName = State.side.pokemon[index].details.split(',')[0];
            thisPokemonLevel = State.side.pokemon[index].details.split(',')[1].substring(1);
            thisPokemonAbility = State.side.pokemon[index].ability;
            thisPokemonItem = State.side.pokemon[index].item;
            thisPokemonMoves = State.side.pokemon[index].moves;
            thisPokemon = new Pokemon(gen, thisPokemonName, {
                level: parseInt(thisPokemonLevel),
                ability: thisPokemonAbility,
                item: thisPokemonItem,
                moves: [thisPokemonMoves[0], thisPokemonMoves[1], thisPokemonMoves[2], thisPokemonMoves[3]],
                originalCurHP: parseInt(State.side.pokemon[index].condition.split('/')[0]),
                boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
            });
            this.myPokemonList[index] = thisPokemon;
            this.UpdateMyPokemonHP(thisPokemon.name, thisPokemon.originalCurHP);
            console.log("-------Added: " + this.myPokemonList[index].name + ' curHP: ' + this.myPokemonList[index].originalCurHP);
        }
        isInstantiated_MyTeam = true;

    } else {
        console.log("-------Could not Instantiate :(/n--Trying again");
        this.InstantiateTeam(this.currentStatus);
    }
}

module.exports.GetActiveSelf = function (State) {
    if (!State)
        return;
    if (State.active) {
        for (let i = 0; i < this.myPokemonList.length; i++) {
            if (this.myPokemonList[i].name + "" == State.side.pokemon[0].details.split(',')[0])
                this.selfCurrentPokemon = i;
        }
        if (this.selfCurrentPokemon > -1 && this.myPokemonList[this.selfCurrentPokemon])
            console.log("-------CURRENT ACTIVE POKEMON: " + this.myPokemonList[this.selfCurrentPokemon].name);
    }

}

module.exports.GetActiveOpposing = function (msg_parts) {
    var detail_parts = msg_parts[3].split(', ');
    var hpValue = msg_parts[4];
    var alreadyKnow = false;
    for (let index = 0; index <= numKnownPokemon; index++) {
        if (this.otherPokemonList[index].name == detail_parts[0]) {
            alreadyKnow = true;
            this.opposingCurrentPokemon = index;
        }
    }
    if (!alreadyKnow) {
        numKnownPokemon++;
        this.otherPokemonList[numKnownPokemon] = new Pokemon(8, detail_parts[0], {
            level: parseInt(detail_parts[1].substring(1)),
            moves: [],
            originalCurHP: parseInt(hpValue)
        });
        this.opposingCurrentPokemon = numKnownPokemon;
    }
    console.log("-------CURRENT OPPOSING POKEMON IS: " + this.otherPokemonList[this.opposingCurrentPokemon].name + " INDEX: " + this.opposingCurrentPokemon);
}

module.exports.GetActiveOpposingMove = function (msg_parts) {
    var moveName = msg_parts[3];
    pokemon = this.otherPokemonList[this.opposingCurrentPokemon];
    var newMove = true;
    if (pokemon.moves.length > 0) {
        for (let index = 0; index < pokemon.moves.length; index++) {
            if (moveName == pokemon.moves[index].name) {
                newMove = false;
            }
        }
    }
    if (newMove) {
        for (let index = 0; index < 4; index++) {
            if (pokemon.moves[index] == null) {
                pokemon.moves[index] = new Move(8, moveName);
                console.log("-------ADDED NEW MOVE FOR: " + pokemon.name + ' AS MOVE#: ' + index + ', MOVE: ' + pokemon.moves[index].name);
                return;
            }
        }
    }

}

module.exports.UpdateMyPokemonHP = function (name, hpValue) {
    for (let i = 0; i < this.myPokemonList.length; i++) {
        ///console.log("AAAAAAA ATTEMPTING TO UPDATE HP TO: " + hpValue);
        if (this.myPokemonList[i].name.indexOf(name) > -1) {
            this.myPokemonList[i].curHp = hpValue;
            console.log("AAAAAAA UPDATED HP VALUE: "+ this.myPokemonList[i].curHp + '/' + this.myPokemonList[i].originalCurHP);
        }
    }

}

module.exports.ClearVariables = function () {
    this.turnNumber = 0;
    this.myPokemonList = [];
    this.otherPokemonList = [];
    isInstantiated_MyTeam = false;
    numKnownPokemon = -1;
    this.opposingCurrentPokemon = -1;
    this.selfCurrentPokemon = 0;
}

function sendMove(msg) {
    ws.send_message('/choose ' + msg);
}

function sendSwitch(msg) {
    ws.send_message('/choose switch ' + msg);
}

function PrintMoves(pokemon) {
    pokemon.moves.forEach(element => {
        console.log('AAAAAAA MOVE FOR ' + pokemon.name + ': ' + element.name);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.checkDisabledMoves = function () {
    if (this.currentStatus.active) {
        for (let i = 0; i < this.currentStatus.active[0].moves.length; i++) {
            var curMove = this.currentStatus.active[0].moves[i];
            if (curMove.disabled) {
                console.log('-------ADDING DISABLED MOVE: ' + curMove.move);
                this.activeDisabledMoves.push(curMove.move);
            } else if (!curMove.disabled && this.activeDisabledMoves.indexOf(curMove.move) > -1) {
                console.log('-------REMOVING DISABLED MOVE: ' + curMove.move);
                this.activeDisabledMoves.pop(this.activeDisabledMoves.indexOf(curMove.move));
            }
        }

    }
}
module.exports.updateStatBoost = function (pokemon, stat, amount) {
    for (let i = 0; i < this.myPokemonList.length; i++) {
        if (this.myPokemonList[i].name.indexOf(pokemon.name) > -1) {
            if (stat = 'atk') {
                this.myPokemonList[i].boosts.atk = parseInt(amount);
                console.log('-------BOOSTED ' + pokemon.name + ' STAT: ' + stat + ' IS: ' + this.myPokemonList[i].boosts.atk);
                return;
            } else if (stat = 'def') {
                this.myPokemonList[i].boosts.def = parseInt(amount);
                console.log('-------BOOSTED ' + pokemon.name + ' STAT: ' + stat + ' IS: ' + this.myPokemonList[i].boosts.def);
                return;
            } else if (stat = 'spa') {
                this.myPokemonList[i].boosts.spa = parseInt(amount);
                console.log('-------BOOSTED ' + pokemon.name + ' STAT: ' + stat + ' IS: ' + this.myPokemonList[i].boosts.spa);
                return;
            } else if (stat = 'spd') {
                this.myPokemonList[i].boosts.spd = parseInt(amount);
                console.log('-------BOOSTED ' + pokemon.name + ' STAT: ' + stat + ' IS: ' + this.myPokemonList[i].boosts.spd);
                return;
            } else if (stat = 'spe') {
                this.myPokemonList[i].boosts.spe = parseInt(amount);
                console.log('-------BOOSTED ' + pokemon.name + ' STAT: ' + stat + ' IS: ' + this.myPokemonList[i].boosts.spe);
                return;
            }
        }
    }

}
