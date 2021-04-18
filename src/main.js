/*
    Made by Christian Møllnitz Moll#6916

*/ 

const Discord = require('discord.js');
const client = new Discord.Client();

const util = require('util');
const fs = require('fs')

//Used for check_rights
const owner_access = true
const admin_access = true
const role_access = ['Mods', 'Owner']

const base_lang = 'eng'
const lang_dir = 'languages/'
var lang_dict


const end_strings = ['close', 'cancel', 'terminate', 'end', 'stop']
const status_strings = ['status']

//Static values for conversion of time into ms
const seconds_in_minute = 60
const minutes_in_hour = 60
const hours_in_day = 24

const bot_command_string = '!waterbot'

var drink_water_messages 
var gif_library 

var serv_dict;


client.on('ready', () => {
    gif_library = fs.readFileSync("./data/gifs").toString().split("\n")
    drink_water_messages = fs.readFileSync("./data/eng_messages").toString().split("\n")
    console.log(`Logged in as ${client.user.tag}!`);
    serv_dict = {};
    lang_dict = {};
    read_langs()
});

client.on('message', msg => {
    console.log(msg.content)
    if(!check_rights(msg)){
        console.log("insufficient rights")
        return;
    }   

    if(msg.cleanContent.toLowerCase().startsWith(bot_command_string)) {

        has_valid_setup = serv_dict[msg_to_dict_id(msg)] !== undefined
        clean_split = msg.cleanContent.trim().split(" ")
        content_split = msg.content.trim().split(" ")

        if(status_strings.includes(clean_split[1]))
        {
            msg.channel.send(write_status(msg));
            return;
        }
        
        if(end_strings.includes(clean_split[1])){
            
            msg.channel.send(write_close(msg))
            close_handle(msg);
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

            second = nan_to_zero(second);
            minute = nan_to_zero(minute);
            hour = nan_to_zero(hour);
            
            var group = ""
            if(rolestring !== undefined && rolestring.trim().match(/^<@&\d{1,50}>$/) !== null){
                group = rolestring;
            }

            if(hour+minute+second !== 0)
            {
                var ms_delay = 1000 * second + 1000 * seconds_in_minute * minute + 1000 * seconds_in_minute * minutes_in_hour * hour
                console.log(serv_dict[msg_to_dict_id(msg)])
                if(serv_dict[msg_to_dict_id(msg)] !== undefined)
                {
                    close_handle(msg)
                }
                serv_dict[msg_to_dict_id(msg)] = {
                    handle: setInterval(()=>reminder(msg, group), ms_delay),
                    timestamp: + Math.round(new Date().getTime()/1000),
                    delay: ms_delay / 1000,
                    group: group,
                    lang: lang_dict[base_lang] 
                } 
                msg.channel.send(write_confirm_setup(msg));
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

async function read_langs() {
    var filenames = []
    var filenames_awaiter = await fs.promises.readdir(lang_dir)
    filenames.push(filenames_awaiter) 

    const { length } = filenames
    const strings = await Promise.all(filenames.map(fname => fs.promises.readFile(lang_dir + fname)))

    for (let i = 0; i < length; i++) {
        lang_dict[filenames[i].toString().split('.')[0]] = JSON.parse(strings[i]);
    }
       
}

//TODO: Needs to have translation support.
function write_close(msg){
    var res = ""
    res += "Waterbot has been disabled \n"
    res += "Thank you for using Waterbot \n"
    res += "May your thirst have been quenched"
    return res
}

function write_confirm_setup(msg) {
    var res = "Setup confirmed! \n"
    res += write_status(msg);
    return res;
}

function write_status(msg){
    if(serv_dict[msg_to_dict_id(msg)])
    {
        var seconds = Math.floor(serv_dict[msg_to_dict_id(msg)].timestamp + serv_dict[msg_to_dict_id(msg)].delay - Math.floor(Date.now() / 1000)) 
        var minutes = Math.floor(seconds / seconds_in_minute % minutes_in_hour)
        var hours = Math.floor(seconds / seconds_in_minute / minutes_in_hour)
        seconds %= 60
       
        var res = ""
        res += "Next message in: " + 
        (hours !== 0 ? hours.toString() + (hours > 1 ? langLookup(msg, 'hrs_plur') : langLookup(msg, 'hrs'))  : "") + " " +
        (minutes !== 0 ? minutes.toString() + " " + (minutes > 1 ? langLookup(msg, 'min_plur') : langLookup(msg, 'min')) : "") + " " + 
        (seconds !== 0 ? seconds.toString() + " " + (seconds > 1 ? langLookup(msg, 'sec_plur') : langLookup(msg, 'sec')) : "")
        return res;
    }
    else{
        return "Waterbot has not been set up in this channel\n If you need help setting up Waterbot try !Waterbot"
    }
}

function langLookup(msg, key, def = "Translation Missing"){
    var res = (serv_dict[msg_to_dict_id(msg)].lang.hasOwnProperty(key) ? serv_dict[msg_to_dict_id(msg)].lang[key] : def)
    return res;
}

function msg_to_dict_id(msg){
    return msg.guild.id.toString() + " " + msg.channel.id.toString();
}

function close_handle(msg){
    clearInterval(serv_dict[msg_to_dict_id(msg)].handle)
    delete serv_dict[msg_to_dict_id(msg)];
}

function nan_to_zero(num) {
    if(isNaN(num))
    {
        return 0;
    }
    else{
        return num;
    }
}


function WaterBot(text, group) {
    var res = ""
    if(group != "")
    {
        res += group;
    }
    res += drink_water_messages[Math.floor(Math.random() * drink_water_messages.length)];
    res += " "
    res += gif_library[Math.floor(Math.random() * gif_library.length)]
    return res
}

//Checks for rights.
function check_rights(msg) {
    var access = false;
    if(admin_access){
        access = msg.member.hasPermission("ADMINISTRATOR")
    }
    if(owner_access)(
        access = access || msg.guild.ownerID === msg.author.id
    ) 
    if(role_access !== null){
        role_access.forEach(element => {
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
    msg.channel.send(WaterBot(msg.cleanContent, group));
    //Update time for next reminder
    serv_dict[msg_to_dict_id(msg)].timestamp = Math.floor(Date.now() / 1000)
}


client.login(require("./token.js").token)