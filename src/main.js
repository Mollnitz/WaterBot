/*
    Made by Christian Møllnitz Moll#6916

*/ 

const Discord = require('discord.js');
const client = new Discord.Client();

//Used for check_rights
const owner_access = true
const admin_access = true
const role_access = ['Mods', 'Owner']

const end_strings = ['close', 'cancel', 'terminate', 'end']
const status_strings = ['status']

//Static values for conversion of time into ms
const seconds_in_minute = 60
const minutes_in_hour = 60
const hours_in_day = 24

const bot_command_string = '!waterbot'

const drink_water_messages = ['Drink Water!', 'Remember To Stay Hydrated!', 'Time For Water!']
const gif_library = ['https://tenor.com/view/pikachu-drink-water-thirsty-pokemon-gif-16367809','https://tenor.com/view/pet-water-drinking-licking-glass-gif-3528535','https://tenor.com/view/cat-reminder-water-hydrate-gif-9442188',
'https://tenor.com/view/hydration-thirst-thirsty-slut-gif-10121585','https://tenor.com/view/scotts-scottsmy-crap-happy-smile-gif-17391087','https://tenor.com/view/thirsty-drinking-from-faucet-drinking-water-drink-cat-gif-14154055',
'https://tenor.com/view/yourname-drink-water-thirsty-gif-7520109','https://tenor.com/view/racoon-remember-too-drink-water-gif-18427566','https://tenor.com/view/thirsty-water-fall-gif-16327653','https://tenor.com/view/water-drink-your-gif-18026558']

var serv_dict;

//Used to contain the scheduled water reminder.
var handle;

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

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    serv_dict = {};
});

client.on('message', msg => {
    console.log(msg.content)
    if(!check_rights(msg)){
        console.log("insufficient rights")
        return;
    }   

    if(msg.cleanContent.toLowerCase().startsWith(bot_command_string)) {

        clean_split = msg.cleanContent.trim().split(" ")
        content_split = msg.content.trim().split(" ")

        if(end_strings.includes(clean_split[1])){
            console.log("closed handle")
            close_handle(msg);
            return;
        }

        if(status_strings.includes(clean_split[1]))
        {
            console.log("status")
            post_status(msg);
        }

        var candidatestring = msg.cleanContent.substring(bot_command_string.length).trim().split(" ")[0]
        var rolestring = msg.content.substring(bot_command_string.length).trim().split(" ")[1]

        var regex2 = /^(?:\d{1,2})((?:h|m)|(?:\:\d{1,2})?(?:\:\d{1,2})?)$/;
        var matchregex = candidatestring.match(regex2);
        
        if(matchregex !== null) {
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
                serv_dict[msg_to_dict_id(msg)] = {
                    handle: setInterval(()=>reminder(msg, group), ms_delay),
                    timestamp: + Math.round(new Date().getTime()/1000),
                    delay: ms_delay / 1000,
                    group: group
                } 
                
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

function post_status(msg){
    if(serv_dict[msg_to_dict_id(msg)])
    {
        console.log("status is real")
        var time = serv_dict[msg_to_dict_id(msg)].timestamp + serv_dict[msg_to_dict_id(msg)].delay - Math.floor(Date.now() / 1000)

        var res = ""
        res += "Next message in: " + time.toString() + " seconds"
    }
    else{
        msg.channel.send("Status not available!")
    }
}

function msg_to_dict_id(msg){
    return msg.guild.id.toString() + " " + msg.channel.id.toString();
}

function close_handle(msg)){
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

function reminder(msg, group = "") {
    msg.channel.send(WaterBot(msg.cleanContent, group));
    serv_dict[msg_to_dict_id(msg)].timestamp = Math.floor(Date.now() / 1000)
}


client.login(require("./token.js").token)