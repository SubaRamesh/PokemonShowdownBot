var WebSocket = require("ws");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var grab = require("./Grabber.js");
var det = require("./Determine.js");

const USERNAME = ;//set Username
const PASSWORD = ;//set Password, I know it's not secure rn

const ws = new WebSocket("ws://sim.smogon.com:8000/showdown/websocket");
const url = 'http://play.pokemonshowdown.com/~~showdown/action.php';

module.exports.inMatch = false;
var RoomID;
var battleType = 'gen8randombattle';
var roomHeader = '';
var currentStatus;
var challengeList;
var playerID = 'p';
var opponentID = 'p';
var inMatch = false;
module.exports.turnNumber = 0;
var winCount = 0;
var lossCount = 0;

ws.addEventListener("open", () => {
    console.log("connected!");

});

ws.addEventListener("message", msg => {

    var samelineMsg = msg.data.split(/\r?\n/);
    console.log('');
    for (let index = 0; index < samelineMsg.length; index++) {
        console.log(samelineMsg[index]);

        var msg_parts = samelineMsg[index].split('|');

        if (msg_parts[0].charAt(0) == '>' && this.turnNumber <= 1) {
            setRoomID(msg_parts);
            roomHeader = "battle-" + battleType + "-" + RoomID + '|';
        }

        switch (msg_parts[1]) {
            case 'challstr': {//login
                login(msg_parts, USERNAME, PASSWORD);
                break;
            }
            case 'updatechallenges': {
                console.log('#######WE BACK HERE');
                var parsedChallenges = JSON.parse("" + msg_parts[2]);
                console.log(parsedChallenges.challengesFrom);
                if (parsedChallenges.challengesFrom && !inMatch) {
                    challengeList = Object.keys(parsedChallenges.challengesFrom);
                    if (challengeList[0]) {
                        battleType = parsedChallenges.challengesFrom[challengeList[0]];
                        console.log("-------ACCEPTING CHALLENGE FROM: " + challengeList[0]);
                        ws.send('|/accept ' + challengeList[0])
                        inMatch = true;
                        this.turnNumber = 0;
                    } else if (!inMatch) {
                        console.log("-------CURRENTLY IN MATCH IS: " + inMatch + " TRYING TO START MATCH");
                        start_match();
                        inMatch = true;
                    }
                    break;

                }
            }

            case 'updatesearch': {
                if(!inMatch){
                    inMatch = true;
                    start_match();
                }

                break;
            }
            case 'init': { //beginning of battle
                break;
            }
            case 'request': {
                if (msg_parts[2] == null || msg_parts[2] == "") {
                    console.log("-------NO MESSAGE TO PARSE")
                    return;
                }
                currentStatus = JSON.parse("" + msg_parts[2]);
                if (this.turnNumber < 1) {

                    //console.log("-------ATTEMPTING TO INSTANTIATE TEAM...");
                    if (currentStatus) {
                        grab.InstantiateTeam(currentStatus);
                        console.log("TIMER ON");
                        this.send_message('/timer on', 'no');
                    }
                }
                grab.read_status(currentStatus);
                grab.GetActiveSelf(currentStatus);
                det.UpdateValues();
                console.log('-------TURN NUMBER: ' + this.turnNumber);

                break;
            }
            case 'player': {
                if (this.turnNumber <= 2) {
                    if (msg_parts[3] == USERNAME) {
                        playerID = '' + msg_parts[2];
                    } else {
                        opponentID = '' + msg_parts[2];
                    }
                    console.log("YOU ARE PLAYER: " + playerID);
                    console.log("OPPONENT IS PLAYER: " + opponentID);
                }

            }
            case 'start': {
                break;
            }
            case 'switch': {
                if (msg_parts[2].substring(0, 2) == opponentID) {
                    //console.log("------ATTEMPTING TO GET OTHER POKEMON: ");
                    grab.GetActiveOpposing(msg_parts);
                }
                break;
            }
            case 'move': {
                if (msg_parts[2].substring(0, 2) == opponentID) {
                    //console.log("------ATTEMPTING TO GET OTHER POKEMON'S MOVE: ")
                    grab.GetActiveOpposingMove(msg_parts);
                }
                break;
            }
            case '-damage': {

                if (msg_parts[2].substring(0, 2) == playerID) {
                    grab.UpdateMyPokemonHP(msg_parts[2].substring(5), parseInt(msg_parts[3].split('/')[0]));
                }
                if (msg_parts[2].substring(0, 2) == opponentID) {

                }
                break;
            }
            case 'faint': {
                if (msg_parts[2].substring(0, 2) == playerID) {
                    var correctName = correctMyPokemonName(msg_parts[2].substring(5));
                    grab.UpdateMyPokemonHP(correctName, 0);
                    console.log('-------FAINTED: ' + msg_parts[2].substring(5));
                }
                break;
            }

            case '-status': {
                break;
            }
            case '-item': {
                break;
            }
            case 'turn': {
                break;
            }
            case 'upkeep' && msg_parts[2] != null: {
                break;
            }
            case '-boost': {
                if (msg_parts[2].substring(0, 2) == playerID) {
                    grab.updateStatBoost(grab.myPokemonList[grab.selfCurrentPokemon], msg_parts[3], msg_parts[4]);
                }
                if (msg_parts[2].substring(0, 2) == opponentID) {
                    grab.updateStatBoost(grab.otherPokemonList[grab.opposingCurrentPokemon], msg_parts[3], msg_parts[4]);
                }

                break;
            }
            case '-unboost': {
                if (msg_parts[2].substring(0, 2) == playerID) {
                    grab.updateStatBoost(grab.myPokemonList[grab.selfCurrentPokemon], msg_parts[3], '-'+ msg_parts[4]);
                }
                if (msg_parts[2].substring(0, 2) == opponentID) {
                    grab.updateStatBoost(grab.otherPokemonList[grab.opposingCurrentPokemon], msg_parts[3], '-' +msg_parts[4]);
                }
                break;
            }
            case 'win': {
                if(msg_parts[2].indexOf(USERNAME) > -1){
                    winCount++;
                }else{
                    lossCount++;
                }
                console.log('-------#######-------WINS: ' +winCount + ' LOSSES: ' +lossCount);
                if (inMatch) {
                    console.log("##########GOING TO ATTEMPT TO LEAVE CURRENTLY INMATCH: " + inMatch);
                    this.send_message('/leave battle-' + battleType + '-' + RoomID, 'no');
                    inMatch = false;
                    console.log("-------ATTEMPTING TO LEAVING MATCH" + " MATCH IS: " + inMatch);
                    //console.log('-------SENDING: ' + '|/leave battle-' + battleType + '-' + RoomID);
                    RoomID = -1;
                }

            }
            case 'deinit': {
                if(!inMatch){
                    console.log("-------CURRENTLY IN MATCH IS: " + inMatch + " TRYING TO START MATCH");
                    //grab.ClearVariables();
                    start_match();
                }
            }
            case 'error': {
                if (!msg_parts[2])
                    break;
                if (currentStatus && msg_parts[2].indexOf("doesn't have a move matching") > -1) {
                    grab.InstantiateTeam();
                    grab.take_action();
                }

                //if(currentStatus && msg_parts[2].indexOf("You can't switch to a fainted Pokémon") > -1){
                //    grab.UpdatePokemonHP();
                //}

                break;

            }
        }
    }

})

module.exports.send_message = function (message, needsRQID) {
    needsRQID = needsRQID || 'yes';
    var formattedMsg = roomHeader;
    if (needsRQID == 'yes') {
        formattedMsg += message + '|' + currentStatus.rqid;
    } else {
        formattedMsg += message;
    }
    formattedMsg = formattedMsg.replace(/(\r\n|\n|\r)/gm, "");
    console.log('-------SENDING: ' + formattedMsg);
    ws.send(formattedMsg);
}

function start_match() {
    inMatch = true;
    this.turnNumber = 0;
    grab.ClearVariables();
    ws.send('|/utm null');
    ws.send('|/search ' + battleType);
    ws.send('/timer on');

}

function setRoomID(msg_parts) {

    var battleIDIndex = ("battle-" + battleType).length
    RoomID = msg_parts[0].substring(battleIDIndex + 2);
    console.log("ROOM_ID:" + RoomID);

}



function login(msg_parts, username, password) {
    console.log("received challstr");
    var id = msg_parts[2];
    var str = msg_parts[3];
    var assertion;
    var params;

    var http = new XMLHttpRequest();
    if (password == null) {
        params = "?act=getassertion&userid=" + username + "&challengekeyid=" + id + "&challenge=" + str;
        http.open('GET', url, true);
    } else {
        params = "act=login&name=" + username + "&pass=" + password + "&challengekeyid=" + id + "&challenge=" + str;
        http.open('POST', url, true);
    }

    http.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    //http.setRequestHeader('Content-Length' , params.length);
    http.onreadystatechange = function () {
        if (http.readyState == 4) {
            console.log("State: " + http.readyState + " Status: " + http.status + " Response: " + http.responseText);
            var assID = http.responseText.search("assertion");
            assertion = http.responseText.substring(assID + 12, http.responseText.length - 2)
            console.log("sent login info and sending assertion: " + assertion);
            ws.send('|/trn ' + username + ',0,' + assertion);
        }
    }

    http.send(params);

}

function correctMyPokemonName(namePart) {
    var correctName;
    for (let index = 0; index < grab.myPokemonList.length; index++) {
        if (grab.myPokemonList[index].name.indexOf(namePart) > -1) {
            correctName = grab.myPokemonList[index].name;
            console.log('-------CORRECTING NAME: ' + namePart + ' TO: ' + correctName);
        }
    }
}


