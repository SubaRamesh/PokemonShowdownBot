var smogon = require('@smogon/calc');
var Pokemon = require('@smogon/calc').Pokemon;
var Move = require('@smogon/calc').Move;

const gen = 8; // alternatively: const gen = 5;

var Gengar = new Pokemon(gen, 'Gengar', { //TEST POKEMON
    item: 'Choice Specs',
    nature: 'Timid',
    evs: { spa: 252 },
    boosts: { spa: 1 },
    moves:['Mach Punch', 'Shadow Ball', poo]
});

var Chansey = new Pokemon(gen, 'Chansey', {
    item: 'Eviolite',
    nature: 'Calm',
    evs: { hp: 252, spd: 252 },
    moves: ['Ember']
});

var poo = new Move(gen, 'Flame Wheel');


function AverageDamage(damageArray) {
    var avg;
    var sum = 0;
    for (let i = 0; i < damageArray.length; i++) {
        sum += damageArray[i];
    }
    return avg = sum / damageArray.length;
}

module.exports.CheckAllMoves = function(self,opponent){
    var resultList = [];
    for(let i = 0; i < self.moves.length; i++){
        var move = new Move(gen, self.moves[i]);
        const result = smogon.calculate(gen, self, opponent, move);
        resultList[i] = AverageDamage(result.damage);
    }
    return resultList;
}

module.exports.CheckAllOpponentMoves = function(self,opponent){
    var resultList = [];
    for(let i = 0; i < self.moves.length; i++){
        var move = new Move(gen, self.moves[i].name);
        const result = smogon.calculate(gen, self, opponent, move);
        resultList[i] = AverageDamage(result.damage);
    }
    return resultList;
}

/*
function CheckAllMoves(self, opponent){
    for(let i = 0; i < self.moves.length; i++){
        if(self.moves[i]){
            const result = smogon.calculate(gen, self, opponent, new Move({gen: gen, name: self.moves[i]}));
            return AverageDamage(result.damage);
        }else{
            console.log("-------THERE IS NO MOVE INDEX: " + i);
            return;
        }
    }
}
*/
