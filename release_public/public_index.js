const fs = require('fs');
const Discord = require('discord.js');
const { prefix, userIDs, consoleChannel, dmChannel } = require('./resources/config.json');

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync(`./release_public/commands`).filter(file => file.endsWith(`.js`));
const eventFiles = fs.readdirSync('./release_public/events').filter(file => file.endsWith('.js'));

// Indexes all the available commands from the ./commands filepath & stores in the commands array
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

// Event Handling 
for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	} else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}

// Command handling
client.on('message', message => {

    // logs any DM that is sent to Wall-E that isn't a command
    if (message.channel.type === 'dm' && !message.content.startsWith(prefix) && message.author.id != userIDs.walle) {
        return message.client.channels.cache.get(dmChannel).send(`${message.author.username} just sent a DM: ${message}`);
    }

    // if a message does not contain the prefix for the bot OR is from another bot, ignore the message
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    // if the message is a command, remove the prefix & split messaage by spaces & store in args. shifts all index values down and stores zeroth in commandName
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // check all command names & aliases for commandName & stop if message isn't a command
    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if (!command) return;

    // Run user checks to ensure that the command author meets the criteria to pass the command
    if (command.developerOnly && message.author.id != userIDs.rohan) {
        return message.channel.send(`This is a developer only command.`)
    }

    // Check for tagegd user
    if (command.needsTaggedUser && !message.mentions.users.size) {
        return message.channel.send(`You need to tag someone in order to use this command!`)
    }

    // check for channel type
    if (command.guildOnly && message.channel.type === 'dm') {
        return message.channel.send(`You need to be in a server to use this command!`);
    }

    // check to make sure the message has arguments if the command requires it
    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;

        if (command.usage) {
            reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
        }

        return message.channel.send(reply);
    }

    try {
        command.execute(message, args);
        console.log(`Running ${command.name}, requested by ${message.author}`)
        client.channels.cache.get(consoleChannel).send(`**Wall-E - Command Run**\n\`\`\`\nUser: ${message.author.username}\nGuild: ${message.member.guild.name}\nChannel: ${message.channel.name}\n\nCommand: ${command.name}\nMessage Content: ${message}\n\`\`\``);

    } catch (error) {
        console.error(error);
        message.channel.send(`There was an error trying to execute that command.\n\`\`\`${error}\`\`\``);
        client.channels.cache.get(consoleChannel).send(`There was an error trying to execute \`${command.name}\`, requested by \`${message.author.username}\`\n\`\`\`${error}\`\`\``);
    }

}); 

// login to Discord with bot token
client.login(process.env.TOKEN_PUBLIC_RELEASE);