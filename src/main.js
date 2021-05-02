/*
    Made by Christian Møllnitz Moll#6916
*/ 

const Discord = require('discord.js');
const client = new Discord.Client();

const util = require('util');
const fs = require('fs')
var mysql = require('mysql');
const { token } = require('./token.js');


WaterbotVars = {
    //Used for check_rights
    owner_access: true,
    admin_access: true,
    role_access: ['Mods', 'Owner'],

    //Language parameters
    base_lang: 'eng',
    lang_dir: 'languages/',
    lang_dict: {},

    //Strings for closing and status
    end_strings: ['close', 'cancel', 'terminate', 'end', 'stop'],
    status_strings: ['status'],

    //Static values for conversion of time into ms
    seconds_in_minute: 60,
    minutes_in_hour: 60,
    hours_in_day: 24,

    bot_command_string: '!waterbot',

    drink_water_messages: [],
    gif_library: [],

    //A dictionary containing one element pr. server.
    serv_dict: {},
    con: mysql.createConnection({
        host: "localhost",
        user: "pi",
        database: 'waterbot',
        password: require("./token.js").password
      })
}

function loadServerFromDB(serverDBObject){
    
    var dbmsg = JSON.parse(serverDBObject.msg);
    var dbauthor = JSON.parse(serverDBObject.author)

    client.channels.fetch(dbmsg.channelID).then((channel) => {
        console.log("registered")
        var msg = new Discord.Message(client,  {
            id: dbmsg.id,
            type: dbmsg.type,
            content: dbmsg.content,
            author: dbauthor,
            pinned: dbmsg.pinned,
            tts: dbmsg.tts,
            embeds: dbmsg.embeds,
            attachments: dbmsg.attachments,
            nonce: dbmsg.nonce
        },  channel)

        var tsNow = +Math.round(new Date().getTime() / 1000)
        var currTs = tsNow

        var dto = writeOrGetDTO(msg, currTs, serverDBObject.delay, serverDBObject.group === undefined ? "" : serverDBObject.group)
        registerServerHandle(dto, msg);

    } )

    
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    WaterbotVars.gif_library = fs.readFileSync("./data/gifs").toString().split("\n")
    WaterbotVars.drink_water_messages = fs.readFileSync("./data/eng_messages").toString().split("\n")

    WaterbotVars.serv_dict = {};
    WaterbotVars.lang_dict = {};
    readLangs().then(() => {
        WaterbotVars.con.connect(function(err) {
            if (err) throw err;
            console.log("Connected to DB!");
        });
        WaterbotVars.con.query("SELECT * FROM servers", function (err, result) {
            if (err) throw err;
            Object.keys(result).map(x => loadServerFromDB(result[x]))
        });
    })

});

client.on('message', msg => {
    if(!checkRights(msg)){
        return;
    }   

    if(msg.cleanContent.toLowerCase().startsWith(WaterbotVars.bot_command_string)) {

        has_valid_setup = WaterbotVars.serv_dict[msgToDictID(msg)] !== undefined
        clean_split = msg.cleanContent.trim().split(" ")
        content_split = msg.content.trim().split(" ")

        if(WaterbotVars.status_strings.includes(clean_split[1].toLowerCase()))
        {
            
            msg.channel.send(writeStatus(msg));
            return;
        }
        
        if(WaterbotVars.end_strings.includes(clean_split[1].toLowerCase())){
            
            msg.channel.send(writeClose(msg))
            closeHandle(msg);
            return;
        }

        var candidatestring = clean_split[1]
        var rolestring = content_split[2]

        console.log(candidatestring)

        var regex2 = /^(?:\d{1,2})((?:h|m)|(?:\:\d{1,2})?(?:\:\d{1,2})?)$/;
        
        //Catching an undefined string here, in case the call was just purely the command string, also checks if the format of the candidate string is a timestamp.
        if(candidatestring !== undefined && candidatestring.match(regex2) !== null) {
            var pieces = candidatestring.split(':'), hour, minute, second;

            if(candidatestring.includes('m') || candidatestring.includes('h')){
                var num = parseInt(pieces[0], 10);
                if(candidatestring.includes('h')) {
                    hour = num;
                }
                else{
                    minute = num;
                }
            }
            else {
                hour = parseInt(pieces[0], 10);
                minute = parseInt(pieces[1], 10);
                second = parseInt(pieces[2], 10);
            }

            second = nanToZero(second);
            minute = nanToZero(minute);
            hour = nanToZero(hour);
            
            var group = ""
            if(rolestring !== undefined && rolestring.trim().match(/^<@&\d{1,50}>$/) !== null){
                group = rolestring;
            }

            if(hour+minute+second !== 0)
            {
                //Dumb spam fix
                if(hour === 0 && minute === 0 && second < 5)
                {
                    second = 5;
                }

                var ms_delay = 1000 * second + 1000 * WaterbotVars.seconds_in_minute * minute + 1000 * WaterbotVars.seconds_in_minute * WaterbotVars.minutes_in_hour * hour

                //Close current handle if a new one is requested.
                if(WaterbotVars.serv_dict[msgToDictID(msg)] !== undefined)
                {
                    closeHandle(msg)
                }
                let dto = writeOrGetDTO(msg, +Math.round(new Date().getTime() / 1000), ms_delay, group)
                registerServerHandle(dto, msg) 
                msg.channel.send(writeConfirmSetup(msg));
                writeToDB(dto, msg)
            }
            else{
                help(msg)
            }
        }
        else{
            help(msg)
        }
    }
});

function writeToDB(dto, msg){
    var querystr = ""
    querystr += "INSERT INTO servers (id, msg, author, timestamp, delay, grp, lang) "
    querystr += "VALUES ( "
    querystr += "'" + msg.channel.id +  "', "
    querystr += "'" + JSON.stringify(msg) + "', "
    querystr += "'" + JSON.stringify(msg.author) +  "', " 
    querystr += "'" + "0" +  "', "
    querystr += "'" + dto.delay +  "', "
    querystr += (dto.group == "" ? 'NULL' : "'" + dto.group + "'") +  ", "
    querystr += "'" + dto.lang.lang + "')" 
    querystr += "ON DUPLICATE KEY UPDATE"
    querystr += " msg = '" + JSON.stringify(msg)  +  "', "
    querystr += " author = '" + JSON.stringify(msg.author) +  "', "
    querystr += " timestamp = " + "0"  +  ", "
    querystr += " delay = " + dto.delay  +  ", "
    querystr += " grp = " + (dto.group == "" ? 'NULL' : + dto.group) +  ", "
    querystr += " lang = '" + dto.lang.lang  +  "' "
    querystr += ";"
    
    WaterbotVars.con.query(querystr, function (err, result) {
        if (err) throw err;
        
    }); 
}

function writeOrGetDTO(msg, tstamp, ms_delay, group)
{
    if(WaterbotVars.serv_dict[msgToDictID(msg)] == undefined)
    {
        
        return {
            handle: setInterval(() => reminder(msg, group), ms_delay),
            timestamp: tstamp,
            delay: ms_delay,
            group: group,
            lang: WaterbotVars.lang_dict[WaterbotVars.base_lang]
        }
    }
    return WaterbotVars.serv_dict[msgToDictID(msg)]
}

function registerServerHandle(dto, msg) {
    WaterbotVars.serv_dict[msgToDictID(msg)] = dto
}

async function readLangs() {
    var filenames = []
    var filenames_awaiter = await fs.promises.readdir(WaterbotVars.lang_dir)
    filenames.push(filenames_awaiter) 

    const { length } = filenames
    const strings = await Promise.all(filenames.map(fname => fs.promises.readFile(WaterbotVars.lang_dir + fname)))

    for (let i = 0; i < length; i++) {
        WaterbotVars.lang_dict[filenames[i].toString().split('.')[0]] = JSON.parse(strings[i]);
    }
       
}

//TODO: Needs to have translation support.
function writeClose(msg){
    var res = ""
    res += "WaterBot has been disabled \n"
    res += "Thank you for using WaterBot \n"
    res += "May your thirst have been quenched"
    return res
}

function writeConfirmSetup(msg) {
    var res = "Setup confirmed! \n"
    res += writeStatus(msg);
    return res;
}

function writeStatus(msg){
    if(WaterbotVars.serv_dict[msgToDictID(msg)])
    {
        var seconds = Math.floor(WaterbotVars.serv_dict[msgToDictID(msg)].timestamp + (WaterbotVars.serv_dict[msgToDictID(msg)].delay / 1000) - Math.floor(Date.now() / 1000)) 
        var minutes = Math.floor(seconds / WaterbotVars.seconds_in_minute % WaterbotVars.minutes_in_hour)
        var hours = Math.floor(seconds / WaterbotVars.seconds_in_minute / WaterbotVars.minutes_in_hour)
        seconds %= 60
       
        var res = ""
        res += "Next message in: " + 
        (hours !== 0 ? hours.toString() + " " + (hours > 1 ? langLookup(msg, 'hr_plur') + " " : langLookup(msg, 'hr')) + " " : "")  +
        (minutes !== 0 ? minutes.toString() + " " + (minutes > 1 ? langLookup(msg, 'min_plur') + " " : langLookup(msg, 'min')) + " " : "") + 
        (seconds !== 0 ? seconds.toString() + " " + (seconds > 1 ? langLookup(msg, 'sec_plur') : langLookup(msg, 'sec')) : "")
        return res;
    }
    else{
        return "WaterBot has not been set up in this channel\nIf you need help setting up WaterBot try !WaterBot"
    }
}

function langLookup(msg, key, def = "Translation Missing"){
    var res = (WaterbotVars.serv_dict[msgToDictID(msg)].lang.hasOwnProperty(key) ? WaterbotVars.serv_dict[msgToDictID(msg)].lang[key] : def)
    return res;
}

function msgToDictID(msg){
    return msg.channel.id.toString();
}

function closeHandle(msg){
    clearInterval(WaterbotVars.serv_dict[msgToDictID(msg)].handle)
    delete WaterbotVars.serv_dict[msgToDictID(msg)];
}

function nanToZero(num) {
    if(isNaN(num))
    {
        return 0;
    }
    else{
        return num;
    }
}


function WaterBot(group) {
    var res = ""
    if(group != "")
    {
        res += group;
    }
    res += WaterbotVars.drink_water_messages[Math.floor(Math.random() * WaterbotVars.drink_water_messages.length)];
    res += " "
    res += WaterbotVars.gif_library[Math.floor(Math.random() * WaterbotVars.gif_library.length)]
    return res
}

//Checks for rights.
function checkRights(msg) {
    var access = false;
    if(WaterbotVars.admin_access){
        access = msg.member.hasPermission("ADMINISTRATOR")
    }
    if(WaterbotVars.owner_access)(
        access = access || msg.guild.ownerID === msg.author.id
    ) 
    if(WaterbotVars.role_access !== null){
        WaterbotVars.role_access.forEach(element => {
            access = access || msg.member.roles.cache.some(role => role.name === element)
        });
    }

    return access;
}

function help(msg){
    var exampleEmbed = new Discord.MessageEmbed()
    .setColor('#7502d9')
    .setTitle('Help')
    .setURL('https://discord.com/developers/applications/%27')
    .setAuthor('Water Bot', '', '')
    .setDescription('This is a bot that keeps you hydrated.')
    .setThumbnail('')
    .addField('Usage:', '!WaterBot [TIME INTERVAL] (ROLE) ', true)
    .addField('Time Interval:', 'HH:MM:SS OR XXh OR XXm ', true)
    .addField('Role:', 'Optional: @NameOfRole ', true)
    .addField('Usage Example:', '!WaterBot 10:00:00 @WaterBoys ', true)
    .addField('Usage Example:', '!WaterBot 1h', true)
    .setImage('')
    .setTimestamp()
    .setFooter('Made by Moll!', '');

    msg.channel.send(exampleEmbed)

}

//The reminder function that is designed to repeat forever.
function reminder(msg, group = "") {
    msg.channel.send(WaterBot(group));
    //Update time for next reminder
    WaterbotVars.serv_dict[msgToDictID(msg)].timestamp = Math.floor(Date.now() / 1000)
}


client.login(require("./token.js").token)