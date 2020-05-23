var baseDir = 'https://raw.githubusercontent.com/shalzuth/wotv-ffbe-dump/master/';
var GameData = {};
var data = ['Unit', 'PlayerLvTbl', 'UnitLvTbl', 'Job', 'GuildStatueInfo', 'GuildStatueExperienceTBL', 'UnitAbilityBoard', 'Skill', 'Buff', 'NBeastLvTbl', 'NetherBeastAbilityBoard', 'VisionCard', 'VisionCardLvTbl', 'Artifact', 'ArtifactLvTbl'];
//var data = ['Unit', 'Item', 'Quests', 'QuestDrop', 'PlayerLvTbl', 'Events', 'Multi'];
data.forEach(d => { $.getJSON(baseDir + 'data/' + d + '.json', function (res) { GameData[d] = res; }); });
//var translation = ['UnitName', 'ItemName', 'ArtifactName', 'QuestTitle', 'ShopTableTitle'];
//translation.forEach(d => { $.getJSON(baseDir + 'en/' + d + '.json', function (res) { GameData[d] = res; }); });
var inited = false;
$(document).ajaxStop(function () {
    if (inited) return;
    inited = true;
    test();
});

function test(){
    var d = "eyJkYXRhSWQiOiJVTl9MV19QX1dISVMiLCJzdGFyIjoxLCJsYiI6MCwibGV2ZWwiOjEsImpvYnMiOlsxLDEsMV0sIm5vZGVzIjp7IjIiOjEsIjUiOjF9LCJtYXN0ZXJTa2lsbCI6LTEsImFjdGl2YXRlZFN1cHBvcnQiOlsiMCIsIjAiXSwiZXNwZXIiOm51bGwsImNhcmQiOm51bGwsImVxdWlwbWVudHMiOltudWxsLG51bGwsbnVsbF19";
    // console.log(atob(d));
    // showBattleRecord(580367444, 146311);
}
var guildJsonBase = 'https://bhtcookie.blob.core.windows.net/bhtguild/';
var GuildRankings = {}; $.getJSON(guildJsonBase + 'guildrankings.json', function (res) {
    GuildRankings = res;
    $('#guildRankings').show();
    $('#guildRecords').hide();
    $('#battleRecord').hide();
    $('#guildRankingTable').children('tbody').html('');
    for(var i = 0; i < GuildRankings['body']['rankings'].length; i++){
        var guild = GuildRankings['body']['rankings'][i];
        $('#guildRankingTable').children('tbody').append(
            '<tr><th>' + guild['rank'] + '</th><td>' + 
            '<button class="btn btn-primary nav-link btn-block active" onclick="showGuildRecord(\'' + guild['id'] + '\')">' + guild['name'] + '</button>' + 
            '</td><td>' + guild['league_trophy'] + '</td><td>' + guild['win_count'] + '</td><td>' + guild['lose_count'] + '</td></tr>');
    }
});
var dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
function showGuildRecord(id){
    $('#guildRankings').hide();
    $('#guildRecords').show();
    $('#battleRecord').hide();
    $('#guildRecordsTable').children('tbody').html('');
    var guild = GuildRankings['body']['rankings'].find(g=>g['id']==id);
    $('#guildInfo').html('<h2>' + guild['name'] + ' (Rank ' + guild['rank'] + ')</h2>');
    $.getJSON(guildJsonBase + 'guild/' + id + '.json', function (res) {
        for(var i = 0; i < res['body']['records'].length; i++){
            var record = res['body']['records'][i];
            $('#guildRecordsTable').children('tbody').append(
                '<tr><th>' + '<button class="btn btn-primary nav-link btn-block active" onclick="showBattleRecord(\'' + id + '\', \'' + record['id'] + '\')">' + (record['status'] == 1 ? '✔' : '❌') + '</button>' + '</th><td>' + new Date(record['event_date'] * 1000).toLocaleDateString("en-US", dateOptions) + '</td><td>' +                 
                '<button class="btn btn-primary nav-link btn-block active" onclick="showGuildRecord(\'' + record['guild_id'] + '\')">' + record['name'] + '</button>' + 
                '</td><td>' + record['ally_star'] + ' - ' + record['enemy_star'] + '</td></tr>');
        }
    });
}
function showBattleRecord(guildId, battleId){
    $('#guildRankings').hide();
    $('#guildRecords').hide();
    $('#battleRecord').show();
    $('#ally').html('');
    $('#enemy').html('');
    $.getJSON(guildJsonBase + 'guild/' + guildId + '/' + battleId + '.json', function (res) {
        $('#battleInfo').html('<h2>' + res['body']['guildbattle']['ally']['guild']['name'] + ' (' + res['body']['guildbattle']['ally']['result']['star'] + ') vs ' +
                              res['body']['guildbattle']['enemy']['guild']['name'] + ' (' + res['body']['guildbattle']['enemy']['result']['star'] + ')</h2>');
        addPlayers(res, 'ally');
        addPlayers(res, 'enemy');
    });
}
function xpToLvl(exp, type){
    var xpItems = {};
    if (type.includes('GSI_')){
        var statue = GameData['GuildStatueInfo']['items'].find(q => q['iname'] === type)['exptbl_id'];
        xpItems = GameData['GuildStatueExperienceTBL']['items'].find(q => q['iname'] == statue)['items'].map(x=>x['exp']);
    }
    else if (type.includes('UN_LW')){
        var awake1 = type.includes('_AW1') ? 'awake2' : 'awake1';
        var baseEsper = type.replace('_AW1', '');
        var rawEsper = GameData['Unit']['items'].find(q => q['iname'] === baseEsper);
        xpItems = GameData['NBeastLvTbl']['items'].find(q => q['iname'] == rawEsper['nb_lv_tbl'])[awake1].map(x=>x['exp']);
    }
    else xpItems = GameData[type]['items'];
    var lvl = 0;
    var totalXp = exp;
    for (var i = 0; i < xpItems.length; i++) {
        var xp = xpItems[i];
        totalXp -= xp;
        if (totalXp < 0) break;
        lvl++;
    }
    return lvl;
}

function addBuffToStats(buff, lvl, maxLvl, unitStats, bonusStats){
    var statMap = {};
    statMap[1] = 'hp';
    statMap[0x15] = 'atk';
    statMap[0x17] = 'mag';
    for(var i = 1; i < 10; i++){
        if (buff['type' + i] == null) break;
        if (statMap[buff['type' + i]] == null) continue;
        var scale = (parseInt(buff['val' + i + '1']) - parseInt(buff['val' + i])) / (maxLvl - 1);
        var val = parseInt(buff['val' + i]) + scale * (lvl - 1);
        if (buff['calc' + i] == 1) bonusStats[statMap[buff['type' + i]]] += val;
        if (buff['calc' + i] == 2) bonusStats[statMap[buff['type' + i]]] += unitStats[statMap[buff['type' + i]]] * (val / 100);
        //console.log(buff['iname' ] + ' : ' + maxLvl + " : " + lvl + " : " + val);
    }
}
//Math.floor = function(a){return Math.ceil(a);};
//Math.floor = function(a){return a;};
function roundStats(bonusStats){
    for(var i = 0; i < stats.length; i++)
        bonusStats[stats[i]] = Math.floor(bonusStats[stats[i]]);
}

var builderStats = {
    "hp": "HP",
    "mp": "TP",
    "ap": "AP",
    "atk": "ATK",
    "def": "DEF",
    "mnd": "SPR",
    "mag": "MAG",
    "dex": "DEX",
    "spd": "AGI",
    "luk": "LUCK",
    "iniap": "INITIAL_AP",

    "hit" : "ACCURACY",
    "crt" : "CRITIC_RATE",
    "crta": "CRITIC_AVOID",
    "avd" : "EVADE",

    "efi": "FIRE_RES",
    "eic": "ICE_RES",
    "eea": "EARTH_RES",
    "ewi": "WIND_RES",
    "eth": "LIGHTNING_RES",
    "ewa": "WATER_RES",
    "esh": "LIGHT_RES",
    "eda": "DARK_RES",

    "asl": "SLASH_RES",
    "api": "PIERCE_RES",
    "abl": "STRIKE_RES",
    "ash": "MISSILE_RES",
    "ama": "MAGIC_RES",

    "cpo": "POISON_RES",
    "cbl": "BLIND_RES",
    "csl": "SLEEP_RES",
    "cmu": "SILENCE_RES",
    "cpa": "PARALYZE_RES",
    "ccf": "CONFUSION_RES",
    "cpe": "PETRIFY_RES",
    "cfr": "TOAD_RES",
    "cch": "CHARM_RES",
    "csw": "SLOW_RES",
    "cst": "STOP_RES",
    "cdm": "IMMOBILIZE_RES",
    "cda": "DISABLE_RES",
    "cbe": "BERSERK_RES",
    "cdo": "DOOM_RES",

    "mov": "MOVE",
    "jmp": "JUMP",
    "lv": "MAX_LV"
}
var stats = ['hp', 'atk', 'mag'];
var first = 3;
function addPlayers(res, team){
    var mults = { 'hp' : 1, 'atk' : 1, 'mag' : 1};
    for(var i = 0; i < res['body']['guildbattle'][team]['guild']['statues'].length; i++){
        var statue = res['body']['guildbattle'][team]['guild']['statues'][i];
        var statueLevel = xpToLvl(statue['experience'], statue['id']);
        if (statue['id'] === 'GSI_SNAKE') mults['hp'] *= (statueLevel / 100);
        if (statue['id'] === 'GSI_LION') mults['atk'] *= (statueLevel / 100);
        if (statue['id'] === 'GSI_GIRAFFE') mults['mag'] *= (statueLevel / 100);
    }
    for(var i = 0; i < res['body']['guildbattle'][team]['players'].length; i++){
        var player = res['body']['guildbattle'][team]['players'][i];
        var playerCard = '';
        var totalAtk = 0;
        var totalMag = 0;
        
        for (var j = 0; j < player['parties'][0]['units'].length; j++){
            var unit = player['parties'][0]['units'][j];
            //console.log(player['name'] + ' : ' + unit['iname']);
            var rawUnit = GameData['Unit']['items'].find(q => q['iname'] === unit['iname']);
            var unitSrc = 'https://github.com/shalzuth/wotv-ffbe-dump/raw/master/img/units/' + rawUnit['charaId'] + '.png';
            var unitLvl = xpToLvl(parseInt(unit['exp']), 'UnitLvTbl');
            var baseStats = {};
            var guildStats = {};
            var boardStats = {};
            var passiveStats = {};
            var esperStats = {};
            var esperBoardStats = {};
            var visionCardStats = {};
            var visionCardSelfBuffStats = {};
            var visionCardParty = {};
            var equipmentBonus = {};
            for (var s = 0; s < stats.length; s++){
                guildStats[stats[s]] = 0;
                boardStats[stats[s]] = 0;
                passiveStats[stats[s]] = 0;
                esperStats[stats[s]] = 0;
                esperBoardStats[stats[s]] = 0;
                visionCardStats[stats[s]] = 0;
                visionCardSelfBuffStats[stats[s]] = 0;
                visionCardParty[stats[s]] = 0;
                equipmentBonus[stats[s]] = 0;
            }
            
            var jobVal = [1, 1, 1];
            for (var m = 0; m < unit['jobs'].length; m++){
                var job = GameData['Job']['items'].find(q => q['iname'] === unit['jobs'][m]['job_iname']);
                var ratio = (unit['jobs'][m]['job_iname'] == rawUnit['jobsets'][0]) ? 100 : 200;
                for (var k = 0; k < stats.length; k++){     
                    jobVal[k] += ((parseInt(job['ranks'][parseInt(unit['jobs'][m]['lv']) - 1][stats[k]]) / ratio) / 100);
                }
            }
            for (var k = 0; k < stats.length; k++){     
                var scale = (parseInt(rawUnit['status'][1][stats[k]]) - parseInt(rawUnit['status'][0][stats[k]])) / (99 - 1);
                var baseVal = parseInt(rawUnit['status'][0][stats[k]]) + scale * (unitLvl - 1);
                baseStats[stats[k]] = baseVal * jobVal[k];
            }
            roundStats(baseStats);
            // console.log('baseStats');
            // console.log(baseStats);
            
            for (var s = 0; s < stats.length; s++)
                guildStats[stats[s]] = mults[stats[s]] * baseStats[stats[s]];
            roundStats(guildStats);
            // console.log('guildStats');
            // console.log(guildStats);
            
            var abilityBoardPanel = GameData['UnitAbilityBoard']['items'].find(q => q['iname'] === unit['iname'])['panels'];
            for (var k = 0; k < unit['abilityboards'].length; k++){                
                var panel = abilityBoardPanel.find(e=>e['panel_id'] == unit['abilityboards'][k]);
                if (panel['value'].includes('BUFF_')){
                    var buff = GameData['Buff']['items'].find(q => q['iname'] === panel['value']);
                    addBuffToStats(buff, 1, 2, baseStats, boardStats);
                }
            }
            roundStats(boardStats);
            // console.log('boardStats');
            // console.log(boardStats);            
            
            var passives = [unit['abilities'].find(a=>a['id'] == unit['abilset']['sup1']),
                            unit['abilities'].find(a=>a['id'] == unit['abilset']['sup2']),
                            unit['abilities'].find(a=>a['ability_iname'] == rawUnit['mstskl'])];
            for (var p = 0; p < passives.length; p++){
                var supAbil = passives[p];
                if (supAbil == null) continue;
                var supSkillBuffs = GameData['Skill']['items'].find(q => q['iname'] == supAbil['ability_iname'])['s_buffs'];
                if (supSkillBuffs == null) supSkillBuffs = GameData['Skill']['items'].find(q => q['iname'] == supAbil['ability_iname'])['t_buffs'];
                for(var k = 0; k < supSkillBuffs.length; k++){
                    var buff = GameData['Buff']['items'].find(q => q['iname'] === supSkillBuffs[k]);
                    addBuffToStats(buff, supAbil['lv'], 20, baseStats, passiveStats);
                }
            }
            roundStats(passiveStats);
            // console.log('passiveStats');
            // console.log(passiveStats);
            var esper = player['parties'][0]['netherbeasts'][j];
            if (esper['iname']){
                var esperResonanceStat = player['parties'][0]['synchros'].find(s=>s['iname1'] === esper['iname'] && s['iname2'] === unit['iname']);
                var esperResonance = esperResonanceStat == null ? 1 : (Math.floor(esperResonanceStat['val']/100 + 1));
                var esperResonanceMultiplier = esperResonance / 10;
                var esperMaxLevel = esper['awake'] == 1 ? 50 : 80;
                var esperIname = esper['iname'] + (esper['awake'] == 2 ? '_AW1' : '');
                var esperLvl = xpToLvl(parseInt(esper['exp']), esperIname);
                var rawEsper = GameData['Unit']['items'].find(q => q['iname'] === esperIname);
                for (var k = 0; k < stats.length; k++){
                    var scale = (parseInt(rawEsper['status'][1][stats[k]]) - parseInt(rawEsper['status'][0][stats[k]])) / (esperMaxLevel - 1);
                    var baseVal = parseInt(rawEsper['status'][0][stats[k]]) + scale * (esperLvl - 1);
                    esperStats[stats[k]] = Math.ceil(baseVal * esperResonanceMultiplier);
                }
                roundStats(esperStats);
                // console.log('esperStats');
                // console.log(esperStats);
                
                var esperBoardPanel = GameData['NetherBeastAbilityBoard']['items'].find(q => q['iname'] === esper['iname'])['panels'];
                if (esperBoardPanel){
                    for (var k = 0; k < esper['abilityboards'].length; k++){
                        var panel = esperBoardPanel.find(e=>e['panel_id'] == esper['abilityboards'][k]);
                        if (panel['value'].includes('BUFF_')){
                            var buff = GameData['Buff']['items'].find(q => q['iname'] === panel['value']);
                            addBuffToStats(buff, 1, 2, baseStats, esperBoardStats);
                        }
                    }
                }
                roundStats(esperBoardStats);
                // console.log('esperBoardStats');
                // console.log(esperBoardStats);
            }
            
            var visionCard = player['parties'][0]['visioncards'][j];
            if (visionCard['iname']){
                var visionCardLvl = xpToLvl(parseInt(visionCard['exp']), 'VisionCardLvTbl');
                var rawVisionCard = GameData['VisionCard']['items'].find(q => q['iname'] === visionCard['iname']);
                // todo - pull from Grow.json
                var visionCardMaxLvl = rawVisionCard['rare'] == 4 ? 99 : rawVisionCard['rare'] == 3 ? 70 : rawVisionCard['rare'] == 2 ? 60 : rawVisionCard['rare'] == 1 ? 40 : 30;
                for (var k = 0; k < stats.length; k++){     
                    var scale = (parseInt(rawVisionCard['status'][1][stats[k]]) - parseInt(rawVisionCard['status'][0][stats[k]])) / (visionCardMaxLvl - 1);
                    var baseVal = parseInt(rawVisionCard['status'][0][stats[k]]) + scale * (visionCardLvl - 1);
                    visionCardStats[stats[k]] = Math.floor(baseVal);
                }
                // console.log('visionCardStats');
                // console.log(visionCardStats);
                 
                var visionCardSelfBuff = [rawVisionCard["self_buff"]];
                if (visionCard['awake'] > 0) visionCardSelfBuff.push(rawVisionCard["add_self_buff_awake"]);
                if (visionCardLvl == visionCardMaxLvl) visionCardSelfBuff.push(rawVisionCard["add_self_buff_lvmax"]);
                for (var p = 0; p < visionCardSelfBuff.length; p++){
                    var supAbil = visionCardSelfBuff[p];
                    if (supAbil == null) continue;
                    var lvlToUse = supAbil.includes('PAW') ? visionCard['awake'] : visionCardLvl;
                    var maxLvlToUse = supAbil.includes('PAW') ? 4 : visionCardMaxLvl;
                    var supSkillBuffs = GameData['Skill']['items'].find(q => q['iname'] == supAbil)['s_buffs'];
                    if (supSkillBuffs == null) supSkillBuffs = GameData['Skill']['items'].find(q => q['iname'] == supAbil)['t_buffs'];
                    for(var k = 0; k < supSkillBuffs.length; k++){
                        var buff = GameData['Buff']['items'].find(q => q['iname'] === supSkillBuffs[k]);
                        addBuffToStats(buff, lvlToUse, maxLvlToUse, baseStats, visionCardSelfBuffStats);
                    }
                }
                roundStats(visionCardSelfBuffStats);
                // console.log('visionCardSelfBuffStats');
                // console.log(visionCardSelfBuffStats);            
            }
            for (var v = 0; v < player['parties'][0]['visioncards'].length; v++){
                var groupVisionCard = player['parties'][0]['visioncards'][v];
                if (!groupVisionCard['iname']) continue;
                var rawVisionCard = GameData['VisionCard']['items'].find(q => q['iname'] === groupVisionCard['iname']);
                var groupVisionCardLvl = xpToLvl(parseInt(groupVisionCard['exp']), 'VisionCardLvTbl');
                var visionCardMaxLvl = rawVisionCard['rare'] == 4 ? 99 : rawVisionCard['rare'] == 3 ? 70 : rawVisionCard['rare'] == 2 ? 60 : 30;
                var visionCardPartyBuff = [rawVisionCard["card_skill"]];
                if (groupVisionCard['awake'] > 0) visionCardPartyBuff.push(rawVisionCard["add_card_skill_buff_awake"]);
                if (groupVisionCardLvl == visionCardMaxLvl) visionCardPartyBuff.push(rawVisionCard["add_card_skill_buff_lvmax"]);
                for (var p = 0; p < visionCardPartyBuff.length; p++){
                    var supAbil = visionCardPartyBuff[p];
                    if (supAbil == null) continue;
                    var lvlToUse = supAbil.includes('GSAW') ? groupVisionCard['awake'] : groupVisionCardLvl;
                    var maxLvlToUse = supAbil.includes('GSAW') ? 4 : visionCardMaxLvl;
                    var supSkillBuffs = GameData['Skill']['items'].find(q => q['iname'] == supAbil)['s_buffs'];
                    if (supSkillBuffs == null) supSkillBuffs = GameData['Skill']['items'].find(q => q['iname'] == supAbil)['t_buffs'];
                    for(var k = 0; k < supSkillBuffs.length; k++){
                        var buff = GameData['Buff']['items'].find(q => q['iname'] === supSkillBuffs[k]);
                        addBuffToStats(buff, lvlToUse, maxLvlToUse, baseStats, visionCardParty);
                    }
                }
            }
            roundStats(visionCardParty);
            // console.log('visionCardParty');
            // console.log(visionCardParty);
            
            var artifacts = [];
            if (unit['artset']['equip1']) artifacts.push(unit['artset']['equip1']);
            if (unit['artset']['equip2']) artifacts.push(unit['artset']['equip2']);
            if (unit['artset']['trust']) artifacts.push(unit['artset']['trust']);
            for (var k = 0; k < artifacts.length; k++){
                var artifact = player['parties'][0]['artifacts'].find(a=>a['id'] == artifacts[k]);
                var rawArtifact = GameData['Artifact']['items'].find(q => q['iname'] === artifact['iname']);
                for (var s = 0; s < stats.length; s++){
                    if (equipmentBonus[stats[s]] == null) equipmentBonus[stats[s]] = 0;
                    var statValue = 0;                    
                    if (!rawArtifact['status'][1][stats[s]]) statValue = 0;
                    else if (artifact['grow'] === 'ARTIFACT_50'){
                        // var awakes = GameData['ArtifactAwake']['items'].find(q => q['iname'] === artifact['iname'])['awakes'];
                        // var maxLvl = awakes[awakes.length - 1]['lv'];
                        var scale = (parseInt(rawArtifact['status'][1][stats[s]]) - parseInt(rawArtifact['status'][0][stats[s]])) / (30 - 1);
                        var artifactLvl = xpToLvl(artifact['exp'], 'ArtifactLvTbl');
                        statValue = parseInt(rawArtifact['status'][0][stats[s]]) + scale * (artifactLvl - 1);
                    }
                    else if (artifact['grow'] === 'ARTIFACT_TRUST'){
                        statValue = rawArtifact['status'][0][stats[s]];
                    }
                    else statValue = (artifact[stats[s]] ?? 0) + rawArtifact['status'][0][stats[s]];
                    if (equipmentBonus[stats[s]] < statValue) equipmentBonus[stats[s]] = statValue;
                }
            }
            roundStats(equipmentBonus);
            // console.log('equipmentBonus');
            // console.log(equipmentBonus);
            
            var unitStats = {};
            for (var s = 0; s < stats.length; s++){
                unitStats[stats[s]] = baseStats[stats[s]];
                unitStats[stats[s]] += guildStats[stats[s]];
                unitStats[stats[s]] += boardStats[stats[s]];
                unitStats[stats[s]] += passiveStats[stats[s]];
                unitStats[stats[s]] += esperStats[stats[s]];
                unitStats[stats[s]] += esperBoardStats[stats[s]];
                unitStats[stats[s]] += visionCardStats[stats[s]];
                unitStats[stats[s]] += visionCardSelfBuffStats[stats[s]];
                unitStats[stats[s]] += visionCardParty[stats[s]];
                unitStats[stats[s]] += equipmentBonus[stats[s]];
            }
            /*for (var s = 1; s <= 2; s++){
                var supAbil = unit['abilities'].find(a=>a['id'] == unit['abilset']['sup' + s]);
                var supSkillBuffs = GameData['Skill']['items'].find(q => q['iname'] === supAbil['ability_iname'])['s_buffs'];
                for(var k = 0; k < supSkillBuffs.length; k++){
                    var buff = GameData['Buff']['items'].find(q => q['iname'] === supSkillBuffs[k]);
                    addBuffToStats(buff, supAbil['lv'], unitStats);
                }
            }*/
            // console.log('unitStats');
            // console.log(unitStats);
            totalAtk += unitStats['atk'];
            totalMag += unitStats['mag'];
            
            
            var jobLvls = [1, 1, 1];
            for (var m = 0; m < unit['jobs'].length; m++){
                if (unit['jobs'][m]['job_iname'] == rawUnit['jobsets'][0]) jobLvls[0] = unit['jobs'][m]['lv'];
                if (unit['jobs'][m]['job_iname'] == rawUnit['jobsets'][1]) jobLvls[1] = unit['jobs'][m]['lv'];
                if (unit['jobs'][m]['job_iname'] == rawUnit['jobsets'][2]) jobLvls[2] = unit['jobs'][m]['lv'];
            }
            var boardNodes = {};
            var support = ["0", "0"];
            var abil1 = unit['abilities'].find(a=>a['id'] == unit['abilset']['sup1'])['ability_iname'];
            var abil2 = unit['abilities'].find(a=>a['id'] == unit['abilset']['sup2'])['ability_iname'];
            for (var k = 0; k < unit['abilityboards'].length; k++){     
                var panel = abilityBoardPanel.find(e=>e['panel_id'] == unit['abilityboards'][k]);
                var ability = unit['abilities'].find(a=>a['ability_iname'] == panel['value']);
                boardNodes[unit['abilityboards'][k]] = ability ? ability['lv'] : 1;
                if (panel['value'] == abil1) support[0] = panel['panel_id'].toString();
                if (panel['value'] == abil2) support[1] = panel['panel_id'].toString();
            }
            var equipments = [];
            for (var k = 0; k < artifacts.length; k++){
                var artifact = player['parties'][0]['artifacts'].find(a=>a['id'] == artifacts[k]);
                var rawArtifact = GameData['Artifact']['items'].find(q => q['iname'] === artifact['iname']);
                var buildStat = {};
                for (var s = 0; s < Object.keys(builderStats).length; s++){
                    var statValue = 0;                    
                    if (!rawArtifact['status'][1][Object.keys(builderStats)[s]]) continue;
                    else if (artifact['grow'] === 'ARTIFACT_50'){
                        // var awakes = GameData['ArtifactAwake']['items'].find(q => q['iname'] === artifact['iname'])['awakes'];
                        // var maxLvl = awakes[awakes.length - 1]['lv'];
                        var scale = (parseInt(rawArtifact['status'][1][Object.keys(builderStats)[s]]) - parseInt(rawArtifact['status'][0][Object.keys(builderStats)[s]])) / (30 - 1);
                        var artifactLvl = xpToLvl(artifact['exp'], 'ArtifactLvTbl');
                        statValue = parseInt(rawArtifact['status'][0][Object.keys(builderStats)[s]]) + scale * (artifactLvl - 1);
                    }
                    else if (artifact['grow'] === 'ARTIFACT_TRUST') statValue = rawArtifact['status'][0][Object.keys(builderStats)[s]];
                    else statValue = (artifact[Object.keys(builderStats)[s]] ?? 0) + rawArtifact['status'][0][Object.keys(builderStats)[s]];
                    buildStat[builderStats[Object.keys(builderStats)[s]]] = statValue;
                }
                var artifactName = artifact['iname'];
                var plus = 0;
                var plusRegex = artifact['iname'].match('(.*[0-9]{3})(_)([1-5])');
                if (plusRegex) {
                    artifactName = plusRegex[1];
                    plus = plusRegex[3];
                }                
                equipments.push({
                    dataId : artifactName,
                    upgrade : plus.toString(),
                    grow : artifact['grow'],
                    level : xpToLvl(artifact['exp'], 'ArtifactLvTbl'),
                    skill : {},
                    stats : buildStat
                });
            }
            var wotvBuilder = {
                "dataId": unit['iname'],
                "star": unit['awake'],
                "lb": unit['rank'],
                "level": unitLvl,
                "jobs": jobLvls,
                "nodes": boardNodes,
                "masterSkill": unit['abilities'].find(a=>a['ability_iname'] == rawUnit['mstskl'])['lv'] ? 0 : -1,
                "activatedSupport": support,
                "esper": {
                    "dataId": esper['iname'],
                    "star": esper['awake'],
                    "level": esperLvl.toString(),
                    "nodes": esper['abilityboards'].reduce(function(map, obj){map[obj] = 1; return map;}, {}),
                    "resonance": esperResonance.toString()
                },
                "card": {
                    "dataId": visionCard['iname'],
                    "star": visionCard['awake'],
                    "level": visionCardLvl.toString()
                },
                "equipments":  equipments
            };
            var buildUrl = 'https://wotv-calc.com/builder/unit/' + btoa(JSON.stringify(wotvBuilder));
            // console.log(JSON.stringify(wotvBuilder));
            //playerCard += '<div style="width: 75px; height: 75px; overflow: hidden;float:left;"><img src=\'' + unitSrc + '\' width=100 height=100 alt="' + unitStats['atk'] + '" href="' + buildUrl + '"></img></div>';
            playerCard += '<div style="width: 75px; height: 75px; overflow: hidden;float:left;"><a href="' + buildUrl + '" target="_blank"><img src=\'' + unitSrc + '\' width=100 height=100"></img></a></div>';
        }
        playerCard += '<div style="float:left;">' + totalAtk.toFixed(0) + ' ATK<br>' + totalMag.toFixed(0) + ' MAG</div>';
        var rank = xpToLvl(parseInt(player['experience']), 'PlayerLvTbl');
        $('#' + team).append('<li style="margin: 10px 0;"><button class="btn btn-primary nav-link btn-block active">' + player['name'] + ' (Rank ' + rank + ')<br>' + playerCard + '</button></li>');
    }
}