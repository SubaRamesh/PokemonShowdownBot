var grab = require('./Grabber.js');
var ws = require('./WebSocketClient');
var calc = require('./Calculator');
var Pokemon = require('@smogon/calc').Pokemon;
var Move = require('@smogon/calc').Move;


var currentStatus;
var turnNumber;
var myPokemonList;
var otherPokemonList;
var opposingCurrentPokemon;
var selfCurrentPokemon;

module.exports.makeRandomMove = function () {
    var moveID = Math.floor(Math.random() * 4);
    if (currentStatus.active[0].moves[moveID])
        return '/choose move ' + currentStatus.active[0].moves[moveID].move;
    else {
        console.log('#######RANDOM MOVE FAILED#######');
    }
}

module.exports.makeRandomSwitch = function () {
    var switchID;
    var switchTry;
    var switchString;

    switchID = Math.floor(Math.random() * currentStatus.side.pokemon.length)
    if (currentStatus.side.pokemon[switchID].condition.indexOf("fnt") < 0) {
        switchString = currentStatus.side.pokemon[switchID].details.substring(0, currentStatus.side.pokemon[switchID].details.indexOf(','));
        console.log('TRYING TO SWITCH TO: ' + switchString);
        switchTry = '/choose switch ' + switchString;
        console.log(switchTry);
        return switchTry;
    }
    else {
        console.log('TRYING SWITCH AGAIN, switchID: ' + switchID + " Check string: ");
        switchString = '';
        this.makeRandomSwitch();
    }

}

module.exports.findBestDamageMove = function (currentPokemon) {
    //const currentPokemon = myPokemonList[selfCurrentPokemon];
    var result = calc.CheckAllMoves(currentPokemon, otherPokemonList[opposingCurrentPokemon]);
    grab.checkDisabledMoves();
    console.log('-------TRYING TO USE BOOSTS: atk: ' + currentPokemon.boosts.atk + ' def: ' + currentPokemon.boosts.def + ' spa: ' + currentPokemon.boosts.spa + ' spd:' + currentPokemon.boosts.spd + ' spe: ' + currentPokemon.boosts.spe);
    console.log('-------BEST MOVES FOR TURN: ' + turnNumber + ' ' + currentPokemon.moves[0] + ': ' + result[0] + '  ' + currentPokemon.moves[1] + ': ' + result[1] + '  ' + currentPokemon.moves[2] + ': ' + result[2] + '  ' + currentPokemon.moves[3] + ': ' + result[3] + '  ');
    var mostDamage = -1;
    var moveID = -1;
    for (let i = 0; i < result.length; i++) {
        if (!(grab.activeDisabledMoves.indexOf(currentPokemon.moves[i]) > -1)) {
            if (result[i] == 'Nan')
                result[i] = 0;
            if (result[i] > mostDamage) {
                mostDamage = result[i];
                moveID = i;
            }
        }


    }
    //console.log("#######BEST MOVE: " + currentPokemon.moves[moveID]);
    if (mostDamage < 150 && currentPokemon.name != this.findBestDamageSwitch()) {
        return 'switch ' + this.findBestDamageSwitch();
    } else {
        return 'move ' + currentPokemon.moves[moveID];
    }
    return;
}

module.exports.findBestDamageSwitch = function () {
    var bestMoveID;
    var bestMoveValue = -1;
    var switchID;

    for (let i = 0; i < myPokemonList.length; i++) {
        const result = calc.CheckAllMoves(myPokemonList[i], otherPokemonList[opposingCurrentPokemon]);
        console.log('-------POKEMON: ' + myPokemonList[i].name + ' MOVES: ' + result + ' HP: ' + myPokemonList[i].curHp);
        for (let j = 0; j < result.length; j++) {
            if (result[j] == 'Nan')
                result[j] = 0;
            if (result[j] >= bestMoveValue && myPokemonList[i].curHp != 0) {
                bestMoveValue = result[j];
                bestMoveID = j;
                switchID = i;
            }
        }

    }
    if (myPokemonList[switchID]) {
        console.log("--------BEST OPTION IS: " + myPokemonList[switchID].name + ' Cur HP: ' + myPokemonList[switchID].curHp);
        return myPokemonList[switchID].name;
    }
    return myPokemonList[selfCurrentPokemon];
}

module.exports.getOtherDamage = function (otherPokemon) {
    if (otherPokemon.moves) {
        var result = calc.CheckAllOpponentMoves(otherPokemon, myPokemonList[selfCurrentPokemon]);
        for (let index = 0; index < otherPokemon.moves.length; index++) {
            if (otherPokemon.moves[index]) {
                console.log('######### POSSIBLE MOVES BY OPPONENT: ' + otherPokemonList[opposingCurrentPokemon].name + ' TURN: ' + turnNumber + ' ' + otherPokemon.moves[index].name + ': ' + result[index]);
            }
        }
    }
}

module.exports.UpdateValues = function () {
    currentStatus = grab.currentStatus;
    turnNumber = grab.turnNumber;
    myPokemonList = grab.myPokemonList;
    otherPokemonList = grab.otherPokemonList;
    opposingCurrentPokemon = grab.opposingCurrentPokemon;
    selfCurrentPokemon = grab.selfCurrentPokemon;
}