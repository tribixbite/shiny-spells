# guide\additional-features\cooldowns.md

```md
# Cooldowns

Spam is something you generally want to avoid, especially if one of your commands require calls to other APIs or takes a bit of time to build/send.

::: tip
This section assumes you followed the [Command Handling](/creating-your-bot/command-handling.md) part.
:::

First, add a cooldown property to your command. This will determine how long the user would have to wait (in seconds) before using the command again.

```js {4}
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		// ...
	},
};
```

In your main file, initialize a [Collection](/additional-info/collections.md) to store cooldowns of commands:

```js
client.cooldowns = new Collection();
```

The key will be the command names, and the values will be Collections associating the user's id (key) to the last time (value) this user used this command. Overall the logical path to get a user's last usage of a command will be `cooldowns > command > user > timestamp`.

In your `InteractionCreate` event, add the following code:

```js {1,3-5,7-10,12-14}
const { cooldowns } = interaction.client;

if (!cooldowns.has(command.data.name)) {
	cooldowns.set(command.data.name, new Collection());
}

const now = Date.now();
const timestamps = cooldowns.get(command.data.name);
const defaultCooldownDuration = 3;
const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;

if (timestamps.has(interaction.user.id)) {
	// ...
}

try {
	// ...
} catch (error) {
	// ...
}
```

You check if the `cooldowns` Collection already has an entry for the command being used. If this is not the case, you can add a new entry, where the value is initialized as an empty Collection. Next, create the following variables:

1. `now`: The current timestamp.
2. `timestamps`: A reference to the Collection of user ids and timestamp key/value pairs for the triggered command.
3. `cooldownAmount`: The specified cooldown for the command, converted to milliseconds for straightforward calculation. If none is specified, this defaults to three seconds.

If the user has already used this command in this session, get the timestamp, calculate the expiration time, and inform the user of the amount of time they need to wait before using this command again. Note the use of the `return` statement here, causing the code below this snippet to execute only if the user has not used this command in this session or the wait has already expired.

Continuing with your current setup, this is the complete `if` statement:

```js {2-7}
if (timestamps.has(interaction.user.id)) {
	const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

	if (now < expirationTime) {
		const expiredTimestamp = Math.round(expirationTime / 1_000);
		return interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, ephemeral: true });
	}
}
```

Since the `timestamps` Collection has the user's id as the key, you can use the `get()` method on it to get the value and sum it up with the `cooldownAmount` variable to get the correct expiration timestamp and further check to see if it's expired or not.

The previous user check serves as a precaution in case the user leaves the guild. You can now use the `setTimeout` method, which will allow you to execute a function after a specified amount of time and remove the timeout.

```js {5-6}
if (timestamps.has(interaction.user.id)) {
	// ...
}

timestamps.set(interaction.user.id, now);
setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
```

This line causes the entry for the user under the specified command to be deleted after the command's cooldown time has expired for them.

## Resulting code

<ResultingCode path="additional-features/cooldowns" />
```

# guide\additional-features\reloading-commands.md

```md
# Reloading Commands

When writing your commands, you may find it tedious to restart your bot every time for testing the smallest changes. With a command handler, you can eliminate this issue and reload your commands while your bot is running.

::: warning
ESM does not support require and clearing import cache. You can use [hot-esm](https://www.npmjs.com/package/hot-esm) to import files without cache. Windows support is experimental per [this issue](https://github.com/vinsonchuong/hot-esm/issues/33).
:::

::: tip
This section assumes you followed the [Command Handling](/creating-your-bot/command-handling.md) part.
:::

::: warning
The reload command ideally should not be used by every user. You should deploy it as a guild command in a private guild.
:::

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Reloads a command.')
		.addStringOption(option =>
			option.setName('command')
				.setDescription('The command to reload.')
				.setRequired(true)),
	async execute(interaction) {
		// ...
	},
};
```

First off, you need to check if the command you want to reload exists. You can do this check similarly to getting a command.

```js {4-9}
module.exports = {
	// ...
	async execute(interaction) {
		const commandName = interaction.options.getString('command', true).toLowerCase();
		const command = interaction.client.commands.get(commandName);

		if (!command) {
			return interaction.reply(`There is no command with name \`${commandName}\`!`);
		}
	},
};
```

To build the correct file path, you will need the file name. You can use `command.data.name` for doing that.

In theory, all there is to do is delete the previous command from `client.commands` and require the file again. In practice, you cannot do this easily as `require()` caches the file. If you were to require it again, you would load the previously cached file without any changes. You first need to delete the file from `require.cache`, and only then should you require and set the command file to `client.commands`:

```js {1,4-6}
delete require.cache[require.resolve(`./${command.data.name}.js`)];

try {
	const newCommand = require(`./${command.data.name}.js`);
	interaction.client.commands.set(newCommand.data.name, newCommand);
	await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
} catch (error) {
	console.error(error);
	await interaction.reply(`There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``);
}
```

The snippet above uses a `try...catch` block to load the command file and add it to `client.commands`. In case of an error, it will log the full error to the console and notify the user about it with the error's message component `error.message`. Note that you never actually delete the command from the commands Collection and instead overwrite it. This behavior prevents you from deleting a command and ending up with no command at all after a failed `require()` call, as each use of the reload command checks that Collection again.

## Resulting code

<ResultingCode path="additional-features/reloading-commands" />

```

# guide\creating-your-bot\command-deployment.md

```md
# Registering slash commands

::: tip
For fully functional slash commands, you need three important pieces of code:

1. The [individual command files](slash-commands), containing their definitions and functionality.
2. The [command handler](command-handling), which dynamically reads the files and executes the commands.
3. The command deployment script, to register your slash commands with Discord so they appear in the interface.

These steps can be done in any order, but **all are required** before the commands are fully functional.

This page details how to complete **Step 3**. Make sure to also complete the other pages linked above!
:::

## Command registration

Slash commands can be registered in two ways; in one specific guild, or for every guild the bot is in. We're going to look at single-guild registration first, as this is a good way to develop and test your commands before a global deployment.

Your application will need the `applications.commands` scope authorized in a guild for any of its slash commands to appear, and to be able to register them in a specific guild without error.

Slash commands only need to be registered once, and updated when the definition (description, options etc) is changed. As there is a daily limit on command creations, it's not necessary nor desirable to connect a whole client to the gateway or do this on every `ready` event. As such, a standalone script using the lighter REST manager is preferred. 

This script is intended to be run separately, only when you need to make changes to your slash command **definitions** - you're free to modify parts such as the execute function as much as you like without redeployment. 

### Guild commands

Create a `deploy-commands.js` file in your project directory. This file will be used to register and update the slash commands for your bot application.

Add two more properties to your `config.json` file, which we'll need in the deployment script:

- `clientId`: Your application's client id ([Discord Developer Portal](https://discord.com/developers/applications) > "General Information" > application id)
- `guildId`: Your development server's id ([Enable developer mode](https://support.discord.com/hc/en-us/articles/206346498) > Right-click the server title > "Copy ID")

```json
{
	"token": "your-token-goes-here",
	"clientId": "your-application-id-goes-here",
	"guildId": "your-server-id-goes-here"
}
```

With these defined, you can use the deployment script below:

<!-- eslint-skip -->

```js
const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory you created earlier
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();
```

Once you fill in these values, run `node deploy-commands.js` in your project directory to register your commands to the guild specified. If you see the success message, check for the commands in the server by typing `/`! If all goes well, you should be able to run them and see your bot's response in Discord!

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction profile="user" :command="true">ping</DiscordInteraction>
		</template>
		Pong!
	</DiscordMessage>
</DiscordMessages>

### Global commands

Global application commands will be available in all the guilds your application has the `applications.commands` scope authorized in, and in direct messages by default.

To deploy global commands, you can use the same script from the [guild commands](#guild-commands) section and simply adjust the route in the script to `.applicationCommands(clientId)`

<!-- eslint-skip -->

```js {2}
await rest.put(
	Routes.applicationCommands(clientId),
	{ body: commands },
);
```

### Where to deploy

::: tip
Guild-based deployment of commands is best suited for development and testing in your own personal server. Once you're satisfied that it's ready, deploy the command globally to publish it to all guilds that your bot is in.

You may wish to have a separate application and token in the Discord Dev Portal for your dev application, to avoid duplication between your guild-based commands and the global deployment.
:::

#### Further reading

You've successfully sent a response to a slash command! However, this is only the most basic of command event and response functionality. Much more is available to enhance the user experience including:

* applying this same dynamic, modular handling approach to events with an [Event handler](/creating-your-bot/event-handling.md).
* utilising the different [Response methods](/slash-commands/response-methods.md) that can be used for slash commands.
* expanding on these examples with additional validated option types in [Advanced command creation](/slash-commands/advanced-creation.md).
* adding formatted [Embeds](/popular-topics/embeds.md) to your responses.
* enhancing the command functionality with [Buttons](/message-components/buttons) and [Select Menus](/message-components/select-menus).
* prompting the user for more information with [Modals](/interactions/modals.md).

#### Resulting code

<ResultingCode path="creating-your-bot/command-deployment" />

```

# guide\creating-your-bot\command-handling.md

```md
# Command handling

Unless your bot project is small, it's not a very good idea to have a single file with a giant `if`/`else if` chain for commands. If you want to implement features into your bot and make your development process a lot less painful, you'll want to implement a command handler. Let's get started on that!

::: tip
For fully functional slash commands, there are three important pieces of code that need to be written. They are:

1. The [individual command files](slash-commands), containing their definitions and functionality.
2. The command handler, which dynamically reads the files and executes the commands.
3. The [command deployment script](command-deployment), to register your slash commands with Discord so they appear in the interface.

These steps can be done in any order, but **all are required** before the commands are fully functional.

This page details how to complete **Step 2**. Make sure to also complete the other pages linked above!
:::

## Loading command files

Now that your command files have been created, your bot needs to load these files on startup. 

In your `index.js` file, make these additions to the base template:

```js {1-3,8}
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
```

We recommend attaching a `.commands` property to your client instance so that you can access your commands in other files. The rest of the examples in this guide will follow this convention. For TypeScript users, we recommend extending the base Client class to add this property, [casting](https://www.typescripttutorial.net/typescript-tutorial/type-casting/), or [augmenting the module type](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation).

::: tip
- The [`fs`](https://nodejs.org/api/fs.html) module is Node's native file system module. `fs` is used to read the `commands` directory and identify our command files.
- The [`path`](https://nodejs.org/api/path.html) module is Node's native path utility module. `path` helps construct paths to access files and directories. One of the advantages of the `path` module is that it automatically detects the operating system and uses the appropriate joiners.
- The <DocsLink section="collection" path="Collection:Class" /> class extends JavaScript's native [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) class, and includes more extensive, useful functionality. `Collection` is used to store and efficiently retrieve commands for execution.
:::

Next, using the modules imported above, dynamically retrieve your command files with a few more additions to the `index.js` file:

```js {3-19}
client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}
```

First, [`path.join()`](https://nodejs.org/api/path.html) helps to construct a path to the `commands` directory. The first [`fs.readdirSync()`](https://nodejs.org/api/fs.html#fs_fs_readdirsync_path_options) method then reads the path to the directory and returns an array of all the folder names it contains, currently `['utility']`. The second `fs.readdirSync()` method reads the path to this directory and returns an array of all the file names they contain, currently `['ping.js', 'server.js', 'user.js']`. To ensure only command files get processed, `Array.filter()` removes any non-JavaScript files from the array.

With the correct files identified, the last step is dynamically set each command into the `client.commands` Collection. For each file being loaded, check that it has at least the `data` and `execute` properties. This helps to prevent errors resulting from loading empty, unfinished, or otherwise incorrect command files while you're still developing.

## Receiving command interactions

You will receive an interaction for every slash command executed. To respond to a command, you need to create a listener for the <DocsLink path="Client:Class#interactionCreate" /> event that will execute code when your application receives an interaction. Place the code below in the `index.js` file you created earlier.

```js
client.on(Events.InteractionCreate, interaction => {
	console.log(interaction);
});
```

Not every interaction is a slash command (e.g. `MessageComponent` interactions). Make sure to only handle slash commands in this function by making use of the <DocsLink path="BaseInteraction:Class#isChatInputCommand" type="method"/> method to exit the handler if another type is encountered. This method also provides typeguarding for TypeScript users, narrowing the type from `BaseInteraction` to <DocsLink path="ChatInputCommandInteraction:Class" />.

```js {2}
client.on(Events.InteractionCreate, interaction => {
	if (!interaction.isChatInputCommand()) return;
	console.log(interaction);
});
```

## Executing commands

When your bot receives a <DocsLink path="Client:Class#interactionCreate" /> event, the interaction object contains all the information you need to dynamically retrieve and execute your commands!

Let's take a look at the `ping` command again. Note the `execute()` function that will reply to the interaction with "Pong!".

```js
module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};
```

First, you need to get the matching command from the `client.commands` Collection based on the `interaction.commandName`. Your <DocsLink path="Client:Class"/> instance is always available via `interaction.client`. If no matching command is found, log an error to the console and ignore the event.

With the right command identified, all that's left to do is call the command's `.execute()` method and pass in the `interaction` variable as its argument. In case something goes wrong, catch and log any error to the console.

```js {1,4-20}
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});
```

#### Next steps

Your command files are now loaded into your bot, and the event listener is prepared and ready to respond. In the next section, we cover the final step: a command deployment script you'll need to register your commands so they appear in the Discord client.

#### Resulting code

<ResultingCode path="creating-your-bot/command-handling" />

```

# guide\creating-your-bot\event-handling.md

```md
# Event handling

Node.js uses an event-driven architecture, making it possible to execute code when a specific event occurs. The discord.js library takes full advantage of this. You can visit the <DocsLink path="Client:Class" /> documentation to see the full list of events.

::: tip
This page assumes you've followed the guide up to this point, and created your `index.js` and individual slash commands according to those pages.
:::

At this point, your `index.js` file has listeners for two events: `ClientReady` and `InteractionCreate`.

:::: code-group
::: code-group-item ClientReady
```js
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
```
:::
::: code-group-item InteractionCreate
```js
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});
```
:::
::::

Currently, the event listeners are in the `index.js` file. <DocsLink path="Client:Class#ready" /> emits once when the `Client` becomes ready for use, and <DocsLink path="Client:Class#interactionCreate" /> emits whenever an interaction is received. Moving the event listener code into individual files is simple, and we'll be taking a similar approach to the [command handler](/creating-your-bot/command-handling.md).

::: warning
You're only going to move these two events from `index.js`. The code for [loading command files](/creating-your-bot/command-handling.html#loading-command-files) will stay here!
:::

## Individual event files

Your project directory should look something like this:

```:no-line-numbers
discord-bot/
├── commands/
├── node_modules/
├── config.json
├── deploy-commands.js
├── index.js
├── package-lock.json
└── package.json
```

Create an `events` folder in the same directory. You can then move the code from your event listeners in `index.js` to separate files: `events/ready.js` and `events/interactionCreate.js`.

:::: code-group
::: code-group-item events/ready.js
```js
const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
	},
};
```
:::
::: code-group-item events/interactionCreate.js
```js
const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	},
};
```
:::
::: code-group-item index.js (after)
```js
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.login(token);
```
:::
::::

The `name` property states which event this file is for, and the `once` property holds a boolean value that specifies if the event should run only once. You don't need to specify this in `interactionCreate.js` as the default behavior will be to run on every event instance. The `execute` function holds your event logic, which will be called by the event handler whenever the event emits.

## Reading event files

Next, let's write the code for dynamically retrieving all the event files in the `events` folder. We'll be taking a similar approach to our [command handler](/creating-your-bot/command-handling.md). Place the new code highlighted below in your `index.js`.

`fs.readdirSync().filter()` returns an array of all the file names in the given directory and filters for only `.js` files, i.e. `['ready.js', 'interactionCreate.js']`.

```js {26-37}
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

client.login(token);
```

You'll notice the code looks very similar to the command loading above it - read the files in the events folder and load each one individually.

The <DocsLink path="Client:Class" /> class in discord.js extends the [`EventEmitter`](https://nodejs.org/api/events.html#events_class_eventemitter) class. Therefore, the `client` object exposes the [`.on()`](https://nodejs.org/api/events.html#events_emitter_on_eventname_listener) and [`.once()`](https://nodejs.org/api/events.html#events_emitter_once_eventname_listener) methods that you can use to register event listeners. These methods take two arguments: the event name and a callback function. These are defined in your separate event files as `name` and `execute`.

The callback function passed takes argument(s) returned by its respective event, collects them in an `args` array using the `...` [rest parameter syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters), then calls `event.execute()` while passing in the `args` array using the `...` [spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax). They are used here because different events in discord.js have different numbers of arguments. The rest parameter collects these variable number of arguments into a single array, and the spread syntax then takes these elements and passes them to the `execute` function.

After this, listening for other events is as easy as creating a new file in the `events` folder. The event handler will automatically retrieve and register it whenever you restart your bot.

::: tip
In most cases, you can access your `client` instance in other files by obtaining it from one of the other discord.js structures, e.g. `interaction.client` in the `interactionCreate` event. You do not need to manually pass it to your events.
:::

## Resulting code

<ResultingCode />

```

# guide\creating-your-bot\main-file.md

```md
# Creating the main file

::: tip
This page assumes you've already prepared the [configuration files](/creating-your-bot/#creating-configuration-files) from the previous page. We're using the `config.json` approach, however feel free to substitute your own!
:::

Open your code editor and create a new file. We suggest that you save the file as `index.js`, but you may name it whatever you wish.

Here's the base code to get you started:

```js
// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);
```

This is how you create a client instance for your Discord bot and log in to Discord. The `GatewayIntentBits.Guilds` intents option is necessary for the discord.js client to work as you expect it to, as it ensures that the caches for guilds, channels, and roles are populated and available for internal use.

::: tip
The term "guild" is used by the Discord API and in discord.js to refer to a Discord server.
:::

Intents also define which events Discord should send to your bot, and you may wish to enable more than just the minimum. You can read more about the other intents on the [Intents topic](/popular-topics/intents).

## Running your application

Open your terminal and run `node index.js` to start the process. If you see "Ready!" after a few seconds, you're good to go! The next step is to start adding [slash commands](/creating-your-bot/slash-commands.md) to develop your bot's functionality.

::: tip
You can open your `package.json` file and edit the `"main": "index.js"` field to point to your main file. You can then run `node .` in your terminal to start the process!

After closing the process with `Ctrl + C`, you can press the up arrow on your keyboard to bring up the latest commands you've run. Pressing up and then enter after closing the process is a quick way to start it up again.
:::

#### Resulting code

<ResultingCode path="creating-your-bot/initial-files" />
```

# guide\creating-your-bot\README.md

```md
# Configuration files

Once you [add your bot to a server](/preparations/adding-your-bot-to-servers.md), the next step is to start coding and get it online! Let's start by creating a config file for your client token and a main file for your bot application.

As explained in the ["What is a token, anyway?"](/preparations/setting-up-a-bot-application.md#what-is-a-token-anyway) section, your token is essentially your bot's password, and you should protect it as best as possible. This can be done through a `config.json` file or by using environment variables.

Open your application in the [Discord Developer Portal](https://discord.com/developers/applications) and go to the "Bot" page to copy your token.

## Using `config.json`

Storing data in a `config.json` file is a common way of keeping your sensitive values safe. Create a `config.json` file in your project directory and paste in your token. You can access your token inside other files by using `require()`.

:::: code-group
::: code-group-item config.json
```json
{
	"token": "your-token-goes-here"
}
```
:::
::: code-group-item Usage
```js
const { token } = require('./config.json');

console.log(token);
```
:::
::::

::: danger
If you're using Git, you should not commit this file and should [ignore it via `.gitignore`](/creating-your-bot/#git-and-gitignore).
:::

## Using environment variables

Environment variables are special values for your environment (e.g., terminal session, Docker container, or environment variable file). You can pass these values into your code's scope so that you can use them.

One way to pass in environment variables is via the command line interface. When starting your app, instead of `node index.js`, use `TOKEN=your-token-goes-here node index.js`. You can repeat this pattern to expose other values as well.

You can access the set values in your code via the `process.env` global variable, accessible in any file. Note that values passed this way will always be strings and that you might need to parse them to a number, if using them to do calculations.

:::: code-group
::: code-group-item Command line
```sh:no-line-numbers
A=123 B=456 DISCORD_TOKEN=your-token-goes-here node index.js
```
:::
::: code-group-item Usage
```js
console.log(process.env.A);
console.log(process.env.B);
console.log(process.env.DISCORD_TOKEN);
```
:::
::::

### Using dotenv

Another common approach is storing these values in a `.env` file. This spares you from always copying your token into the command line. Each line in a `.env` file should hold a `KEY=value` pair.

You can use the [`dotenv` package](https://www.npmjs.com/package/dotenv) for this. Once installed, require and use the package to load your `.env` file and attach the variables to `process.env`:

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm install dotenv
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn add dotenv
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm add dotenv
```
:::
::::

:::: code-group
::: code-group-item .env
```
A=123
B=456
DISCORD_TOKEN=your-token-goes-here
```
:::
::: code-group-item Usage
```js
const dotenv = require('dotenv');

dotenv.config();

console.log(process.env.A);
console.log(process.env.B);
console.log(process.env.DISCORD_TOKEN);
```
:::
::::

::: danger
If you're using Git, you should not commit this file and should [ignore it via `.gitignore`](/creating-your-bot/#git-and-gitignore).
:::

::: details Online editors (Glitch, Heroku, Replit, etc.)
While we generally do not recommend using online editors as hosting solutions, but rather invest in a proper virtual private server, these services do offer ways to keep your credentials safe as well! Please see the respective service's documentation and help articles for more information on how to keep sensitive values safe:

- Glitch: [Storing secrets in .env](https://help.glitch.com/hc/articles/16287550167437)
- Heroku: [Configuration variables](https://devcenter.heroku.com/articles/config-vars)
- Replit: [Secrets and environment variables](https://docs.replit.com/programming-ide/workspace-features/secrets)
:::

## Git and `.gitignore`

Git is a fantastic tool to keep track of your code changes and allows you to upload progress to services like [GitHub](https://github.com/), [GitLab](https://about.gitlab.com/), or [Bitbucket](https://bitbucket.org/product). While this is super useful to share code with other developers, it also bears the risk of uploading your configuration files with sensitive values!

You can specify files that Git should ignore in its versioning systems with a `.gitignore` file. Create a `.gitignore` file in your project directory and add the names of the files and folders you want to ignore:

```
node_modules
.env
config.json
```

::: tip
Aside from keeping credentials safe, `node_modules` should be included here. Since this directory can be restored based on the entries in your `package.json` and `package-lock.json` files by running `npm install`, it does not need to be included in Git.

You can specify quite intricate patterns in `.gitignore` files, check out the [Git documentation on `.gitignore`](https://git-scm.com/docs/gitignore) for more information!
:::
```

# guide\creating-your-bot\slash-commands.md

```md
# Creating slash commands

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction profile="user" :command="true">ping</DiscordInteraction>
		</template>
		Pong!
	</DiscordMessage>
</DiscordMessages>

Discord allows developers to register [slash commands](https://discord.com/developers/docs/interactions/application-commands), which provide users a first-class way of interacting directly with your application. 

Slash commands provide a huge number of benefits over manual message parsing, including:

- Integration with the Discord client interface.
- Automatic command detection and parsing of the associated options/arguments.
- Typed argument inputs for command options, e.g. "String", "User", or "Role".
- Validated or dynamic choices for command options.
- In-channel private responses (ephemeral messages).
- Pop-up form-style inputs for capturing additional information.

...and many more!

## Before you continue

Assuming you've followed the guide so far, your project directory should look something like this:

```:no-line-numbers
discord-bot/
├── node_modules
├── config.json
├── index.js
├── package-lock.json
└── package.json
```

::: tip
For fully functional slash commands, there are three important pieces of code that need to be written. They are:

1. The individual command files, containing their definitions and functionality.
2. The [command handler](command-handling.html), which dynamically reads the files and executes the commands.
3. The [command deployment script](command-deployment.html), to register your slash commands with Discord so they appear in the interface.

These steps can be done in any order, but **all are required** before the commands are fully functional.

On this page, you'll complete Step 1. Make sure to also complete the other pages linked above!
:::

## Individual command files

Create a new folder named `commands` and a subfolder named `utility` inside it, which is where you'll store all of your utility command files. You'll be using the <DocsLink section="builders" path="SlashCommandBuilder:Class"/> class to construct the command definitions.

At a minimum, the definition of a slash command must have a name and a description. Slash command names must be between 1-32 characters and contain no capital letters, spaces, or symbols other than `-` and `_`. Using the builder, a simple `ping` command definition would look like this:

```js
new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Replies with Pong!');
```

A slash command also requires a function to run when the command is used, to respond to the interaction. Using an interaction response method confirms to Discord that your bot successfully received the interaction, and has responded to the user. Discord enforces this to ensure that all slash commands provide a good user experience (UX). Failing to respond will cause Discord to show that the command failed, even if your bot is performing other actions as a result.

The simplest way to acknowledge and respond to an interaction is the `interaction.reply()` method. Other methods of replying are covered on the [Response methods](/slash-commands/response-methods.md) page later in this section.

<!-- eslint-skip -->

```js
async execute(interaction) {
	await interaction.reply('Pong!')
}
```

Put these two together by creating a `ping.js` file in the `commands/utility` folder for your first command. Inside this file, you're going to define and export two items.
- The `data` property, which will provide the command definition shown above for registering to Discord.
- The `execute` method, which will contain the functionality to run from our event handler when the command is used.

These are placed inside `module.exports` so they can be read by other files; namely the command loader and command deployment scripts mentioned earlier.

:::: code-group
::: code-group-item commands/utility/ping.js
```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};
```
:::
::::

::: tip
[`module.exports`](https://nodejs.org/api/modules.html#modules_module_exports) is how you export data in Node.js so that you can [`require()`](https://nodejs.org/api/modules.html#modules_require_id) it in other files.

If you need to access your client instance from inside a command file, you can access it via `interaction.client`. If you need to access external files, packages, etc., you should `require()` them at the top of the file.
:::

That's it for your basic ping command. Below are examples of two more commands we're going to build upon throughout the guide, so create two more files for these before you continue reading.

:::: code-group
::: code-group-item commands/utility/user.js
```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('user')
		.setDescription('Provides information about the user.'),
	async execute(interaction) {
		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
	},
};
```
:::
::: code-group-item commands/utility/server.js
```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Provides information about the server.'),
	async execute(interaction) {
		// interaction.guild is the object representing the Guild in which the command was run
		await interaction.reply(`This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.`);
	},
};
```
:::
::::

#### Next steps

You can implement additional commands by creating new files within a dedicated subfolder in the `commands` folder, but these three are the ones we're going to use for the examples as we go on. For now let's move on to the code you'll need for command handling, to load the files and respond to incoming interactions.

#### Resulting code

<ResultingCode path="creating-your-bot/slash-commands" />
```

# guide\improving-dev-environment\package-json-scripts.md

```md
# Setting up package.json scripts

An easy way to run scripts like a script to start your bot, a script to lint your bot's files, or whatever scripts you use is by storing them in your `package.json` file. After you store these scripts in your `package.json` file, you can run the `start` script to start your bot or the `lint` script to lint your code for errors.

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm run start
npm run lint
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn run start
yarn run lint
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm run start
pnpm run lint
```
:::
::::

## Getting started

::: tip
Before getting started, you'll need to have a `package.json` file. If you don't have a `package.json` file yet, you can run the following command in the console to generate one.

<CodeGroup>
  <CodeGroupItem title="npm">

```sh:no-line-numbers
npm init -y
```

  </CodeGroupItem>
  <CodeGroupItem title="yarn">

```sh:no-line-numbers
yarn init -y
```

  </CodeGroupItem>
  <CodeGroupItem title="pnpm">

```sh:no-line-numbers
pnpm init
```

  </CodeGroupItem>
</CodeGroup>
:::

If you haven't touched your `package.json` file yet (excluding installing dependencies), your `package.json` file should look similar to the following:

```json
{
	"name": "my-bot",
	"version": "1.0.0",
	"description": "A Discord bot!",
	"main": "index.js",
	"scripts": {
		"test": "echo \"Error: no test specified\" && exit 1"
	},
	"keywords": [],
	"author": "",
	"license": "ISC"
}
```

Let's zoom in more. Below `main`, you'll see `scripts`. You can specify your scripts there. In this guide, we'll show how to start and lint your bot using a `package.json` script.

## Adding your first script

::: tip
We'll assume you have finished the [creating your first bot](/creating-your-bot/) section of the guide. If you haven't, ensure to follow it first!
:::

Over at your `package.json` file, add the following line to the `scripts`:

```json
"start": "node ."
```

::: tip
The `node .` script will run the file you have specified at the `main` entry in your `package.json` file. If you don't have it set yet, make sure to select your bot's main file as `main`!
:::

Now, whenever you run the `start` script in your bot's directory, it will run the `node .` command.

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm run start
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn run start
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm run start
```
:::
::::

Let's create another script to lint your code via the command line.

::: tip
If you do not have ESLint installed globally, you can use [npx](https://alligator.io/workflow/npx/) to run the ESLint script for your local directory. For more info on how to set it up, you can read the site [here](https://alligator.io/workflow/npx/).
:::

Add the following line to your scripts:

```json
"lint": "eslint ."
```

Now, whenever you run the `lint` script, ESLint will lint your `index.js` file.

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm run lint
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn run lint
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm run lint
```
:::
::::

Your `package.json` file should now look similar to the following:

```json
{
	"name": "my-bot",
	"version": "1.0.0",
	"description": "A Discord bot!",
	"main": "index.js",
	"scripts": {
		"test": "echo \"Error: no test specified\" && exit 1",
		"start": "node .",
		"lint": "eslint ."
	},
	"keywords": [],
	"author": "",
	"license": "ISC"
}
```

And that's it! You can always add more scripts now, running them with:

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm run <script-name>
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn run <script-name>
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm run <script-name>
```
:::
::::

::: tip
Package scripts allow some more configuration (like pre-, post- and lifecycle scripts) than we can cover in this guide. Check out the official documentation on [docs.npmjs.com](https://docs.npmjs.com/cli/v7/using-npm/scripts) for more information.
:::

```

# guide\improving-dev-environment\pm2.md

```md
# Managing your bot process with PM2

PM2 is a process manager. It manages your applications' states, so you can start, stop, restart, and delete processes. It offers features such as monitoring running processes and setting up a "start with operating system" (be that Windows, Linux, or Mac) so your processes start when you boot your system.

## Installation

You can install PM2 via the following command:

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm install --global pm2
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn global add pm2
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm add --global pm2
```
:::
::::

## Starting your app

After you install PM2, the easiest way you can start your app is by going to the directory your bot is in and then run the following:

```sh:no-line-numbers
pm2 start your-app-name.js
```

### Additional notes

The `pm2 start` script allows for more optional command-line arguments.

- `--name`: This allows you to set the name of your process when listing it up with `pm2 list` or `pm2 monit`:

```sh:no-line-numbers
pm2 start your-app-name.js --name "Some cool name"
```

- `--watch`: This option will automatically restart your process as soon as a file change is detected, which can be useful for development environments:

```bash
pm2 start your-app-name.js --watch
```

::: tip
The `pm2 start` command can take more optional parameters, but only these two are relevant. If you want to see all the parameters available, you can check the documentation of pm2 [here](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/).
:::

Once the process launches with pm2, you can run `pm2 monit` to monitor all console outputs from the processes started by pm2. This accounts for any `console.log()` in your code or outputted errors.

In a similar fashion to how you start the process, running `pm2 stop` will stop the current process without removing it from PM2's interface:

```sh:no-line-numbers
pm2 stop your-app-name.js
```

## Setting up booting with your system

Perhaps one of the more useful features of PM2 is being able to boot up with your Operating System. This feature will ensure that your bot processes will always be started after an (unexpected) reboot (e.g., after a power outage).

The initial steps differ per OS. In this guide, we'll cover those for Windows and Linux/MacOS.

### Initial steps for Windows

::: tip
Run these from an administrative command prompt to avoid getting hit with a bunch of UAC dialogs.
:::

**Install the [pm2-windows-service](https://www.npmjs.com/package/pm2-windows-service) package from npm:**

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm install --global pm2-windows-service
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn global add pm2-windows-service
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm add --global pm2-windows-service
```
:::
::::

**After installation has finished, install the service by running the following command:**

```sh:no-line-numbers
pm2-service-install
```
::: tip
You can use the `-n` parameter to set the service name: `pm2-service-install -n "the-service-name"`
:::

### Initial steps for Linux/MacOS

You'll need a start script, which you can get by running the following command:

```sh:no-line-numbers
# Detects the available init system, generates the config, and enables startup system
pm2 startup
```

Or, if you want to specify your machine manually, select one of the options with the command:

```sh:no-line-numbers
pm2 startup [ubuntu | ubuntu14 | ubuntu12 | centos | centos6 | arch | oracle | amazon | macos | darwin | freesd | systemd | systemv | upstart | launchd | rcd | openrc]
```

The output of running one of the commands listed above will output a command for you to run with all environment variables and options configured.

**Example output for an Ubuntu user:**

```sh:no-line-numbers
[PM2] You have to run this command as root. Execute the following command:
      sudo su -c "env PATH=$PATH:/home/user/.nvm/versions/node/v8.9/bin pm2 startup ubuntu -u user --hp /home/user
```

After running that command, you can continue to the next step.

### Saving the current process list

To save the current process list so it will automatically get started after a restart, run the following command:

```sh:no-line-numbers
pm2 save
```

To disable this, you can run the following command:

```sh:no-line-numbers
pm2 unstartup
```

```

# guide\interactions\context-menus.md

```md
# Context Menus

Context Menus are application commands which appear when right clicking or tapping a user or a message, in the Apps submenu.

::: tip
This page is a follow-up to the [slash commands](/slash-commands/advanced-creation.md) section. Please carefully read those pages first so that you can understand the methods used in this section.
:::

## Registering context menu commands

To create a context menu command, use the <DocsLink section="builders" path="ContextMenuCommandBuilder:Class" /> class. You can then set the type of the context menu (user or message) using the `setType()` method.

```js
const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

const data = new ContextMenuCommandBuilder()
	.setName('User Information')
	.setType(ApplicationCommandType.User);
```

## Receiving context menu command interactions

Context menus commands, just like slash commands, are received via an interaction. You can check if a given interaction is a context menu by invoking the `isContextMenuCommand()` method, or the `isMessageContextMenuCommand()` and `isUserContextMenuCommand()` methods to check for the specific type of context menu interaction:

```js {2}
client.on(Events.InteractionCreate, interaction => {
	if (!interaction.isUserContextMenuCommand()) return;
	console.log(interaction);
});
```

## Extracting data from context menus

For user context menus, you can get the targeted user by accessing the `targetUser` or `targetMember` property from the <DocsLink path="UserContextMenuCommandInteraction:Class" />.

For message context menus, you can get the targeted message by accessing the `targetMessage` property from the <DocsLink path="MessageContextMenuCommandInteraction:Class" />.

```js {4}
client.on(Events.InteractionCreate, interaction => {
	if (!interaction.isUserContextMenuCommand()) return;
	// Get the User's username from context menu
	const { username } = interaction.targetUser;
	console.log(username);
});
```

## Notes

- Context menu commands cannot have subcommands or any options.
- Responding to context menu commands functions the same as slash commands. Refer to our [slash command responses](/slash-commands/response-methods) guide for more information.
- Context menu command permissions also function the same as slash commands. Refer to our [slash command permissions](/slash-commands/permissions) guide for more information.

```

# guide\interactions\modals.md

```md
# Modals

With modals you can create pop-up forms that allow users to provide you with formatted inputs through submissions. We'll cover how to create, show, and receive modal forms using discord.js!

::: tip
This page is a follow-up to the [interactions (slash commands) page](/slash-commands/advanced-creation.md). Please carefully read that section first, so that you can understand the methods used in this section.
:::

## Building and responding with modals

Unlike message components, modals aren't strictly components themselves. They're a callback structure used to respond to interactions.

::: tip
You can have a maximum of five <DocsLink path="ActionRowBuilder:Class" />s per modal builder, and one <DocsLink path="TextInputBuilder:Class" /> within an <DocsLink path="ActionRowBuilder:Class" />. Currently, you can only use <DocsLink path="TextInputBuilder:Class" />s in modal action rows builders.
:::

To create a modal you construct a new <DocsLink path="ModalBuilder:Class" />. You can then use the setters to add the custom id and title.

```js {1,7-13}
const { Events, ModalBuilder } = require('discord.js');

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'ping') {
		const modal = new ModalBuilder()
			.setCustomId('myModal')
			.setTitle('My Modal');

		// TODO: Add components to modal...
	}
});
```
::: tip
The custom id is a developer-defined string of up to 100 characters. Use this field to ensure you can uniquely define all incoming interactions from your modals!
:::

The next step is to add the input fields in which users responding can enter free-text. Adding inputs is similar to adding components to messages.

At the end, we then call <DocsLink path="ChatInputCommandInteraction:Class#showModal" type="method"/> to display the modal to the user.

::: warning
If you're using typescript you'll need to specify the type of components your action row holds. This can be done by specifying the generic parameter in <DocsLink path="ActionRowBuilder:Class" />

```diff
- new ActionRowBuilder()
+ new ActionRowBuilder<ModalActionRowComponentBuilder>()
```
:::

```js {1,12-34}
const { ActionRowBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'ping') {
		// Create the modal
		const modal = new ModalBuilder()
			.setCustomId('myModal')
			.setTitle('My Modal');

		// Add components to modal

		// Create the text input components
		const favoriteColorInput = new TextInputBuilder()
			.setCustomId('favoriteColorInput')
		    // The label is the prompt the user sees for this input
			.setLabel("What's your favorite color?")
		    // Short means only a single line of text
			.setStyle(TextInputStyle.Short);

		const hobbiesInput = new TextInputBuilder()
			.setCustomId('hobbiesInput')
			.setLabel("What's some of your favorite hobbies?")
		    // Paragraph means multiple lines of text.
			.setStyle(TextInputStyle.Paragraph);

		// An action row only holds one text input,
		// so you need one action row per text input.
		const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
		const secondActionRow = new ActionRowBuilder().addComponents(hobbiesInput);

		// Add inputs to the modal
		modal.addComponents(firstActionRow, secondActionRow);

		// Show the modal to the user
		await interaction.showModal(modal);
	}
});
```

Restart your bot and invoke the `/ping` command again. You should see a popup form resembling the image below:

<img width=450 src="./images/modal-example.png">

::: warning
Showing a modal must be the first response to an interaction. You cannot `defer()` or `deferUpdate()` then show a modal later.
:::

### Input styles

Currently there are two different input styles available:
- `Short`, a single-line text entry;
- `Paragraph`, a multi-line text entry similar to the HTML `<textarea>`;

### Input properties

In addition to the `customId`, `label` and `style`, a text input can be customised in a number of ways to apply validation, prompt the user, or set default values via the <DocsLink path="TextInputBuilder:Class" /> methods:

```js
const input = new TextInputBuilder()
	// set the maximum number of characters to allow
	.setMaxLength(1_000)
	// set the minimum number of characters required for submission
	.setMinLength(10)
	// set a placeholder string to prompt the user
	.setPlaceholder('Enter some text!')
	// set a default value to pre-fill the input
	.setValue('Default')
	 // require a value in this input field
	.setRequired(true);
```

## Receiving modal submissions

### Interaction collectors

Modal submissions can be collected within the scope of the interaction that showed it by utilising an <DocsLink path="InteractionCollector:Class"/>, or the <DocsLink path="ChatInputCommandInteraction:Class#awaitModalSubmit" type="method"/> promisified method. These both provide instances of the <DocsLink path="ModalSubmitInteraction:Class"/> class as collected items.

For a detailed guide on receiving message components via collectors, please refer to the [collectors guide](/popular-topics/collectors.md#interaction-collectors).

### The interactionCreate event

To receive a <DocsLink path="ModalSubmitInteraction:Class"/> event, attach an <DocsLink path="Client:Class#interactionCreate"/> event listener to your client and use the <DocsLink path="BaseInteraction:Class#isModalSubmit" type="method"/> type guard to make sure you only receive modals:

```js {1,4}
client.on(Events.InteractionCreate, interaction => {
	if (!interaction.isModalSubmit()) return;
	console.log(interaction);
});
```

## Responding to modal submissions

The <DocsLink path="ModalSubmitInteraction:Class"/> class provides the same methods as the <DocsLink path="ChatInputCommandInteraction:Class"/> class. These methods behave equally:
- `reply()`
- `editReply()`
- `deferReply()`
- `fetchReply()`
- `deleteReply()`
- `followUp()`

If the modal was shown from a <DocsLink path="ButtonInteraction:Class"/> or <DocsLink path="StringSelectMenuInteraction:Class"/>, it will also provide these methods, which behave equally:
- `update()`
- `deferUpdate()`

```js {1,3-5}
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isModalSubmit()) return;
	if (interaction.customId === 'myModal') {
		await interaction.reply({ content: 'Your submission was received successfully!' });
	}
});
```

::: tip
If you're using typescript, you can use the <DocsLink path="ModalSubmitInteraction:Class#isFromMessage" type="method"/> typeguard, to make sure the received interaction was from a `MessageComponentInteraction`.
:::

## Extracting data from modal submissions

You'll most likely need to read the data sent by the user in the modal. You can do this by accessing the <DocsLink path="ModalSubmitInteraction:Class#fields"/>. From there you can call <DocsLink path="ModalSubmitFields:Class#getTextInputValue" type="method"/> with the custom id of the text input to get the value.

```js {5-7}
client.on(Events.InteractionCreate, interaction => {
	if (!interaction.isModalSubmit()) return;

	// Get the data entered by the user
	const favoriteColor = interaction.fields.getTextInputValue('favoriteColorInput');
	const hobbies = interaction.fields.getTextInputValue('hobbiesInput');
	console.log({ favoriteColor, hobbies });
});
```

```

# guide\keyv\README.md

```md
# Storing data with Keyv

[Keyv](https://www.npmjs.com/package/keyv) is a simple key-value store that works with multiple backends. It's fully scalable for [sharding](/sharding/) and supports JSON storage.

## Installation

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm install keyv
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn add keyv
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm add keyv
```
:::
::::

Keyv requires an additional package depending on which persistent backend you would prefer to use. If you want to keep everything in memory, you can skip this part. Otherwise, install one of the below.

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm install @keyv/redis
npm install @keyv/mongo
npm install @keyv/sqlite
npm install @keyv/postgres
npm install @keyv/mysql
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn add @keyv/redis
yarn add @keyv/mongo
yarn add @keyv/sqlite
yarn add @keyv/postgres
yarn add @keyv/mysql
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm add @keyv/redis
pnpm add @keyv/mongo
pnpm add @keyv/sqlite
pnpm add @keyv/postgres
pnpm add @keyv/mysql
```
:::
::::

Create an instance of Keyv once you've installed Keyv and any necessary drivers.

<!-- eslint-skip -->
```js
const Keyv = require('keyv');

// One of the following
const keyv = new Keyv(); // for in-memory storage
const keyv = new Keyv('redis://user:pass@localhost:6379');
const keyv = new Keyv('mongodb://user:pass@localhost:27017/dbname');
const keyv = new Keyv('sqlite://path/to/database.sqlite');
const keyv = new Keyv('postgresql://user:pass@localhost:5432/dbname');
const keyv = new Keyv('mysql://user:pass@localhost:3306/dbname');
```

Make sure to handle connection errors.

```js
keyv.on('error', err => console.error('Keyv connection error:', err));
```

For a more detailed setup, check out the [Keyv readme](https://github.com/jaredwray/keyv/tree/main/packages/keyv).

## Usage

Keyv exposes a familiar [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)-like API. However, it only has `set`, `get`, `delete`, and `clear` methods. Additionally, instead of immediately returning data, these methods return [Promises](/additional-info/async-await.md) that resolve with the data.

```js
(async () => {
	// true
	await keyv.set('foo', 'bar');

	// bar
	await keyv.get('foo');

	// undefined
	await keyv.clear();

	// undefined
	await keyv.get('foo');
})();
```

## Application

Although Keyv can assist in any scenario where you need key-value data, we will focus on setting up a per-guild prefix configuration using Sqlite.

::: tip
This section will still work with any provider supported by Keyv. We recommend PostgreSQL for larger applications.
:::

### Setup

```js
const Keyv = require('keyv');
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { globalPrefix, token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const prefixes = new Keyv('sqlite://path/to.sqlite');
```

### Command handler

This guide uses a very basic command handler with some added complexity to allow for multiple prefixes. Look at the [command handling](/creating-your-bot/command-handling.md) guide for a more robust command handler.

```js
client.on(Events.MessageCreate, async message => {
	if (message.author.bot) return;

	let args;
	// handle messages in a guild
	if (message.guild) {
		let prefix;

		if (message.content.startsWith(globalPrefix)) {
			prefix = globalPrefix;
		} else {
			// check the guild-level prefix
			const guildPrefix = await prefixes.get(message.guild.id);
			if (message.content.startsWith(guildPrefix)) prefix = guildPrefix;
		}

		// if we found a prefix, setup args; otherwise, this isn't a command
		if (!prefix) return;
		args = message.content.slice(prefix.length).trim().split(/\s+/);
	} else {
		// handle DMs
		const slice = message.content.startsWith(globalPrefix) ? globalPrefix.length : 0;
		args = message.content.slice(slice).split(/\s+/);
	}

	// get the first space-delimited argument after the prefix as the command
	const command = args.shift().toLowerCase();
});
```

### Prefix command

Now that you have a command handler, you can make a command to allow people to use your prefix system.

```js {3-11}
client.on(Events.MessageCreate, async message => {
	// ...
	if (command === 'prefix') {
		// if there's at least one argument, set the prefix
		if (args.length) {
			await prefixes.set(message.guild.id, args[0]);
			return message.channel.send(`Successfully set prefix to \`${args[0]}\``);
		}

		return message.channel.send(`Prefix is \`${await prefixes.get(message.guild.id) || globalPrefix}\``);
	}
});
```

You will probably want to set up additional validation, such as required permissions and maximum prefix length.

### Usage

<DiscordMessages>
	<DiscordMessage profile="user">
		.prefix
	</DiscordMessage>
	<DiscordMessage profile="bot">
		Prefix is <DiscordMarkdown>`.`</DiscordMarkdown>
	</DiscordMessage>
	<DiscordMessage profile="user">
		.prefix $
	</DiscordMessage>
	<DiscordMessage profile="bot">
		Successfully set prefix to <DiscordMarkdown>`$`</DiscordMarkdown>
	</DiscordMessage>
	<DiscordMessage profile="user">
		$prefix
	</DiscordMessage>
	<DiscordMessage profile="bot">
		Prefix is <DiscordMarkdown>`$`</DiscordMarkdown>
	</DiscordMessage>
</DiscordMessages>

## Next steps

Various other applications can use Keyv, such as guild settings; create another instance with a different [namespace](https://github.com/jaredwray/keyv/tree/main/packages/keyv#namespaces) for each setting. Additionally, it can be [extended](https://github.com/jaredwray/keyv/tree/main/packages/keyv#third-party-storage-adapters) to work with whatever storage backend you prefer.

Check out the [Keyv repository](https://github.com/jaredwray/keyv/tree/main/packages/keyv) for more information.

## Resulting code

<ResultingCode />

```

# guide\message-components\action-rows.md

```md
# Action rows

With the components API, you can create interactive message components to enhance the functionality of your slash commands. To get started with this, the first component type you'll need to understand is the action row. To send any type of component, it **must** be placed in an action row.

Action rows are a fairly simple form of layout component. A message may contain up to five rows, each of which has a "width" of five units. This can be thought of as a flexible 5x5 grid. A button will consume one unit of width in a row, while a select menu will consume the whole five units of width. At this time, these are the only types of components that can be sent in a message.

:::warning
The "width units" referred to are not fixed - the actual width of each individual button will be dynamic based on its label contents.
:::

## Building action rows

To create an action row, use the <DocsLink section="builders" path="ActionRowBuilder:Class" /> class and the <DocsLink section="builders" path="ActionRowBuilder:Class#addComponents" type="method" /> method to add buttons or a select menu. 

```js
const row = new ActionRowBuilder()
	.addComponents(component);
```

::: warning
If you're using TypeScript, you'll need to specify the type of components your action row holds. This can be done by specifying the component builder you will add to it using a generic parameter in <DocsLink section="builders" path="ActionRowBuilder:Class" />.

```diff
- new ActionRowBuilder()
+ new ActionRowBuilder<ButtonBuilder>()
```
:::

## Sending action rows

Once one or many components are inside your row(s), send them in the `components` property of your <DocsLink path="InteractionReplyOptions:Interface" /> (extends <DocsLink path="BaseMessageOptions:Interface" />).

```js {4}
const row = new ActionRowBuilder()
	.addComponents(component);

await interaction.reply({ components: [row] });
```

To learn how to create the buttons and select menus that will go inside your row, including more detailed examples on how you might use them, continue on to the other pages in this section.

```

# guide\message-components\buttons.md

```md
# Buttons

The first type of interactive component we'll cover creating is a Button. Buttons are available in a variety of styles and can be used to provide permanent interfaces, temporary confirmation workflows, and other forms of additional interaction with your bot.

::: tip
This page is a follow-up to the [slash commands](/slash-commands/advanced-creation) section and [action rows](/message-components/action-rows) page. Please carefully read those pages first so that you can understand the methods used here.
:::

## Building buttons

Buttons are one of the `MessageComponent` classes, which can be sent via messages or interaction responses.

For this example, you're going to expand on the `ban` command that was previously covered on the [parsing options](/slash-commands/parsing-options.md) page with a confirmation workflow.

To create your buttons, use the <DocsLink section="builders" path="ButtonBuilder:Class"/> class, defining at least the `customId`, `style` and `label`.

```js {1,9-17}
const { ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');

module.exports = {
	// data: new SlashCommandBuilder()...
	async execute(interaction) {
		const target = interaction.options.getUser('target');
		const reason = interaction.options.getString('reason') ?? 'No reason provided';

		const confirm = new ButtonBuilder()
			.setCustomId('confirm')
			.setLabel('Confirm Ban')
			.setStyle(ButtonStyle.Danger);

		const cancel = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Secondary);
	},
};
```

::: tip
The custom id is a developer-defined string of up to 100 characters. Use this field to ensure you can uniquely define all incoming interactions from your buttons!
:::

## Sending buttons

To send your buttons, create an action row and add the buttons as components. Then, send the row in the `components` property of <DocsLink path="InteractionReplyOptions:Interface" /> (extends <DocsLink path="BaseMessageOptions:Interface" />).

```js {1,19-20,24}
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');

module.exports = {
	// data: new SlashCommandBuilder()...
	async execute(interaction) {
		const target = interaction.options.getUser('target');
		const reason = interaction.options.getString('reason') ?? 'No reason provided';

		const confirm = new ButtonBuilder()
			.setCustomId('confirm')
			.setLabel('Confirm Ban')
			.setStyle(ButtonStyle.Danger);

		const cancel = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Secondary);

		const row = new ActionRowBuilder()
			.addComponents(cancel, confirm);

		await interaction.reply({
			content: `Are you sure you want to ban ${target} for reason: ${reason}?`,
			components: [row],
		});
	},
};
```

Restart your bot and then send the command to a channel your bot has access to. If all goes well, you should see something like this:

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction profile="user" :command="true">ban</DiscordInteraction>
		</template>
		Are you sure you want to ban <DiscordMention :highlight="true" profile="user" /> for reason: trolling?
		<template #actions>
			<DiscordButtons>
				<DiscordButton type="secondary">Cancel</DiscordButton>
				<DiscordButton type="danger">Confirm Ban</DiscordButton>
			</DiscordButtons>
		</template>
	</DiscordMessage>
</DiscordMessages>

## Button styles

You'll notice in the above example that two different styles of buttons have been used, the grey Secondary style and the red Danger style. These were chosen specifically to support good UI/UX principles. In total, there are five button styles that can be used as appropriate to the action of the button:

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction profile="user" :command="true">buttons</DiscordInteraction>
		</template>
		<template #actions>
			<DiscordButtons>
				<DiscordButton type="primary">Primary</DiscordButton>
				<DiscordButton type="secondary">Secondary</DiscordButton>
				<DiscordButton type="success">Success</DiscordButton>
				<DiscordButton type="danger">Danger</DiscordButton>
				<DiscordButton type="link" url="https://discord.js.org">Link</DiscordButton>
			</DiscordButtons>
		</template>
	</DiscordMessage>
</DiscordMessages>

- `Primary` style buttons are blue. These are suitable for most general purpose actions, where it's the primary or most significant action expected.
- `Secondary` style buttons are grey. Use these for less important actions like the "Cancel" button in the example above.
- `Success` style buttons are green. Similar to the Primary button, these are a good choice for "positive" confirmation actions.
- `Danger` style buttons are red. Where the action being confirmed is "destructive", such a ban or delete, using a red button helps alert the user to the risk of the action.
- `Link` style buttons are also grey, but are tagged with the "external link" symbol. These buttons will open the provided link in the browser without sending an interaction to the bot.

## Link buttons

Link buttons are a little different to the other styles. `Link` buttons _must_ have a `url`, _cannot_ have a `customId` and _do not_ send an interaction event when clicked.

```js {3}
const button = new ButtonBuilder()
	.setLabel('discord.js docs')
	.setURL('https://discord.js.org')
	.setStyle(ButtonStyle.Link);
```

## Disabled buttons

If you want to prevent a button from being used, but not remove it from the message, you can disable it with the <DocsLink section="builders" path="ButtonBuilder:Class#setDisabled" type="method"/> method:

```js {5}
const button = new ButtonBuilder()
	.setCustomId('disabled')
	.setLabel('Click me?')
	.setStyle(ButtonStyle.Primary)
	.setDisabled(true);
```

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction profile="user" :command="true">button</DiscordInteraction>
		</template>
		Are you even able to 
		<template #actions>
			<DiscordButtons>
				<DiscordButton :disabled="true">Click me?</DiscordButton>
			</DiscordButtons>
		</template>
	</DiscordMessage>
</DiscordMessages>

## Emoji buttons

If you want to use a guild emoji within a <DocsLink path="ButtonBuilder:Class"/>, you can use the <DocsLink path="ButtonBuilder:Class#setEmoji" type="method"/> method:

```js {5}
const button = new ButtonBuilder()
	.setCustomId('primary')
	.setLabel('Primary')
	.setStyle(ButtonStyle.Primary)
	.setEmoji('123456789012345678');
```

#### Next steps

That's everything you need to know about building and sending buttons! From here you can learn about the other type of message component, [select menus](/message-components/select-menus), or have your bot start listening to [component interactions](/message-components/interactions) from your buttons. 

```

# guide\message-components\interactions.md

```md
# Component interactions

Every button click or select menu selection on a component sent by your bot fires an `interaction`, triggering the <DocsLink path="Client:Class#interactionCreate" /> event. How you decide to handle this will likely depend on the purpose of the components. Options include:

- Waiting for a single interaction via <DocsLink path="InteractionResponse:Class#awaitMessageComponent" type="method"/>.
- Listening for multiple interactions over a period of time using an <DocsLink path="InteractionCollector:Class" />.
- Creating a permanent component handler in the <DocsLink path="Client:Class#interactionCreate" /> event.

::: tip
This page is a follow-up to the [slash commands](/slash-commands/advanced-creation) section, and assumes you have created either [buttons](/message-components/buttons) or [select menus](/message-components/select-menus) as detailed in this guide. Please carefully read those pages first so that you can understand the methods used here.
:::

## Responding to component interactions

As with all other interactions message components interactions require a response within 3 seconds, else Discord will treat them as failed.

Like slash commands, all types of message component interactions support the `reply()`, `deferReply()`, `editReply()` and `followUp()` methods, with the option for these responses to be ephemeral. These function identically to how they do for slash commands, so refer to the page on [slash command response methods](/slash-commands/response-methods) for information on those.

Component interactions also support two additional methods of response, detailed below and demonstrated in examples later on the page.

### Updates

Responding to a component interaction via the `update()` method acknowledges the interaction by editing the message on which the component was attached. This method should be preferred to calling `editReply()` on the original interaction which sent the components. Like `editReply()`, `update()` cannot be used to change the ephemeral state of a message. 

Once `update()` has been called, future messages can be sent by calling `followUp()` or edits can be made by calling `editReply()` on the component interaction.

### Deferred updates

Responding to a component interaction via the `deferUpdate()` method acknowledges the interaction and resets the message state. This method can be used to suppress the need for further responses, however it's encouraged to provide meaningful feedback to users via an `update()` or ephemeral `reply()` at least.

Once `deferUpdate()` has been called, future messages can be sent by calling `followUp()` or edits can be made by calling `editReply()` on the component interaction.

## Awaiting components

If you followed our [buttons](/message-components/buttons) guide, the confirmation workflow for the `ban` command is a good example of a situation where your bot is expecting to receive a single response, from either the Confirm or Cancel button.

Begin by storing the <DocsLink path="InteractionResponse:Class" /> as a variable, and calling <DocsLink path="InteractionResponse:Class#awaitMessageComponent" type="method" /> on this instance. This method returns a [Promise](/additional-info/async-await.md) that resolves when any interaction passes its filter (if one is provided), or throws if none are received before the timeout. If this happens, remove the components and notify the user.

```js {1,6-11}
const response = await interaction.reply({
	content: `Are you sure you want to ban ${target.username} for reason: ${reason}?`,
	components: [row],
});

const collectorFilter = i => i.user.id === interaction.user.id;

try {
	const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
} catch (e) {
	await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
}
```

:::tip
The filter applied here ensures that only the user who triggered the original interaction can use the buttons.
:::

With the confirmation collected, check which button was clicked and perform the appropriate action.

```js {10-15}
const response = await interaction.reply({
	content: `Are you sure you want to ban ${target.username} for reason: ${reason}?`,
	components: [row],
});

const collectorFilter = i => i.user.id === interaction.user.id;
try {
	const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

	if (confirmation.customId === 'confirm') {
		await interaction.guild.members.ban(target);
		await confirmation.update({ content: `${target.username} has been banned for reason: ${reason}`, components: [] });
	} else if (confirmation.customId === 'cancel') {
		await confirmation.update({ content: 'Action cancelled', components: [] });
	}
} catch (e) {
	await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
}
```

## Component collectors

For situations where you want to collect multiple interactions, the Collector approach is better suited than awaiting singular interactions. Following on from the [select menus](/message-components/select-menus) guide, you're going to extend that example to use an <DocsLink path="InteractionCollector:Class"/> to listen for multiple <DocsLink path="StringSelectMenuInteraction:Class"/>s.

Begin by storing the <DocsLink path="InteractionResponse:Class" /> as a variable, and calling <DocsLink path="InteractionResponse:Class#createMessageComponentCollector" type="method" /> on this instance. This method returns an InteractionCollector that will fire its <DocsLink path="InteractionCollector:Class#collect" /> event whenever an interaction passes its filter (if one is provided).

In the `collect` event, each interaction is a <DocsLink path="StringSelectMenuInteraction:Class" /> thanks to the `componentType: ComponentType.StringSelect` option provided to the collector (and because that was the only type of component in the message). The selected value(s) are available via the <DocsLink path="StringSelectMenuInteraction:Class#values" /> property.

```js
const response = await interaction.reply({
	content: 'Choose your starter!',
	components: [row],
});

const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 3_600_000 });

collector.on('collect', async i => {
	const selection = i.values[0];
	await i.reply(`${i.user} has selected ${selection}!`);
});
```

## The Client#interactionCreate event

Third and finally, you may wish to have a listener setup to respond to permanent button or select menu features of your guild. For this, returning to the <DocsLink path="Client:Class#interactionCreate" /> event is the best approach.

If your event handling has been setup in multiple files as per our [event handling](/creating-your-bot/event-handling) guide, you should already have an `events/interactionCreate.js` file that looks something like this.

```js {6}
const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(`Error executing ${interaction.commandName}`);
			console.error(error);
		}
	},
};
```

The way this was previously set up returns from the `execute` function whenever it encounters an interaction that is not a `ChatInputCommandInteraction`, as shown on the highlighted line above. The first change that needs to be made is to invert this logic, without actually changing the functionality.

```js {6,20}
const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}
		}
	},
};
```

Now that the logic is setup to run code when something *is* a `ChatInputCommandInteraction`, rather than to stop and exit when it isn't, you can add handling for additional interaction types via simple `if...else` logic.

```js {20-24}
const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(error);
			}
		} else if (interaction.isButton()) {
			// respond to the button
		} else if (interaction.isStringSelectMenu()) {
			// respond to the select menu
		}
	},
};
```

```

# guide\message-components\select-menus.md

```md
# Select menus

Select menus are one of the `MessageComponent` classes, which can be sent via messages or interaction responses.

::: tip
This page is a follow-up to the [slash commands](/slash-commands/advanced-creation.md) section and [action rows](/message-components/action-rows.md) page. Please carefully read those pages first so that you can understand the methods used here.
:::

## Building string select menus

The "standard" and most customizable type of select menu is the string select menu. To create a string select menu, use the <DocsLink section="builders" path="StringSelectMenuBuilder:Class"/> and <DocsLink section="builders" path="StringSelectMenuOptionBuilder:Class"/> classes.

If you're a Pokémon fan, you've probably made a selection pretty similar to this example at some point in your life!

```js {1,6-22}
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
	// data: new SlashCommandBuilder()...
	async execute(interaction) {
		const select = new StringSelectMenuBuilder()
			.setCustomId('starter')
			.setPlaceholder('Make a selection!')
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Bulbasaur')
					.setDescription('The dual-type Grass/Poison Seed Pokémon.')
					.setValue('bulbasaur'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Charmander')
					.setDescription('The Fire-type Lizard Pokémon.')
					.setValue('charmander'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Squirtle')
					.setDescription('The Water-type Tiny Turtle Pokémon.')
					.setValue('squirtle'),
			);
	},
};
```

::: tip
The custom id is a developer-defined string of up to 100 characters. Use this field to ensure you can uniquely define all incoming interactions from your select menus!
:::

## Sending select menus

To send your select menu, create an action row and add the buttons as components. Then, send the row in the `components` property of <DocsLink path="InteractionReplyOptions:Interface" /> (extends <DocsLink path="BaseMessageOptions:Interface" />).

```js {1,24-25,29}
const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
	// data: new SlashCommandBuilder()...
	async execute(interaction) {
		const select = new StringSelectMenuBuilder()
			.setCustomId('starter')
			.setPlaceholder('Make a selection!')
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Bulbasaur')
					.setDescription('The dual-type Grass/Poison Seed Pokémon.')
					.setValue('bulbasaur'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Charmander')
					.setDescription('The Fire-type Lizard Pokémon.')
					.setValue('charmander'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Squirtle')
					.setDescription('The Water-type Tiny Turtle Pokémon.')
					.setValue('squirtle'),
			);

		const row = new ActionRowBuilder()
			.addComponents(select);

		await interaction.reply({
			content: 'Choose your starter!',
			components: [row],
		});
	},
};
```

:::tip
Remember that if you have more than one select menu, each one will need its own action row.
:::

<!-- TODO: Update this section with a new image. Or make a component, idk
Restart your bot and then send the command to a channel your bot has access to. If all goes well, you should see something like this:

vue-discord-message doesn't yet have support for select menus
<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction profile="user" :command="true">ping</DiscordInteraction>
		</template>
		Pong!
	</DiscordMessage>
</DiscordMessages>

![select](./images/select.png)
-->

### String select menu options

String select menu options are custom-defined by the user, as shown in the example above. At a minimum, each option must have it's `label` and `value` defined. The label is shown to the user, while the value is included in the interaction sent to the bot.

In addition to these, each option can be enhanced with a `description` or `emoji`, or can be set to be selected by default.

```js {4-9}
const select = new StringSelectMenuBuilder()
	.setCustomId('select')
	.addOptions(
		new StringSelectMenuOptionBuilder()
			.setLabel('Option')
			.setValue('option')
			.setDescription('A selectable option')
			.setEmoji('123456789012345678')
			.setDefault(true),
	);
```

## Auto-populating select menus

Although the String select menu with its user-defined options is the most customizable, there are four other types of select menu that auto-populate with their corresponding Discord entities, much like slash command options. These are:

- <DocsLink section="builders" path="UserSelectMenuBuilder:Class" />
- <DocsLink section="builders" path="RoleSelectMenuBuilder:Class" />
- <DocsLink section="builders" path="MentionableSelectMenuBuilder:Class" />
- <DocsLink section="builders" path="ChannelSelectMenuBuilder:Class" />

The `ChannelSelectMenuBuilder` can be configured to only show specific channel types using <DocsLink section="builders" path="ChannelSelectMenuBuilder:Class#setChannelTypes" type="method"/>.

## Multi-selects

Where slash command options fall behind is in their single-select limitation on User, Role and Channel option types. Select menus can support this use case via <DocsLink section="builders" path="BaseSelectMenuBuilder:Class#setMinValues" type="method"/> and <DocsLink section="builders" path="BaseSelectMenuBuilder:Class#setMaxValues" type="method"/>. When these values are set, users can select multiple items, and the interaction will be sent with all selected values only when the user clicks outside the select menu.

```js {7-8,13-14}
module.exports = {
	// data: new SlashCommandBuilder()...
	async execute(interaction) {
		const userSelect = new UserSelectMenuBuilder()
			.setCustomId('users')
			.setPlaceholder('Select multiple users.')
			.setMinValues(1)
			.setMaxValues(10);

		const row1 = new ActionRowBuilder()
			.addComponents(userSelect);

		await interaction.reply({
			content: 'Select users:',
			components: [row1],
		});
	},
};
```

```

# guide\miscellaneous\cache-customization.md

```md
# Cache customization

Sometimes, you would like to be able to customize discord.js's caching behavior in order to reduce memory usage.
To this end, discord.js provides you with two ways to do so:

1. Limiting the size of caches.
2. Periodically removing old items from caches.

::: danger
Customization of caching behavior is an advanced topic.
It is very easy to introduce errors if your custom cache is not working as expected.
:::

## Limiting caches

When creating a new <DocsLink path="Client:Class"/>, you can limit the size of caches, which are specific to certain managers, using the `makeCache` option. Generally speaking, almost all your customizations can be done via the helper functions from the <DocsLink path="Options:Class"/> class.

Below is the default settings, which will limit message caches.

```js
const { Client, Options } = require('discord.js');

const client = new Client({
	makeCache: Options.cacheWithLimits(Options.DefaultMakeCacheSettings),
});
```

To change the cache behaviors for a type of manager, add it on top of the default settings. For example, you can make caches for reactions limited to 0 items i.e. the client won't cache reactions at all:

```js
const client = new Client({
	makeCache: Options.cacheWithLimits({
		...Options.DefaultMakeCacheSettings,
		ReactionManager: 0,
	}),
});
```

::: danger
As noted in the documentation, customizing `GuildManager`, `ChannelManager`, `GuildChannelManager`, `RoleManager`, or `PermissionOverwriteManager` is unsupported! Functionality will break with any kind of customization.
:::

We can further customize this by passing options to <DocsLink path="LimitedCollection:Class"/>, a special kind of collection that limits the number of items. In the example below, the client is configured so that:

1. Only 200 guild members maximum may be cached per `GuildMemberManager` (essentially, per guild).
2. We never remove a member if it is the client. This is especially important, so that the client can function correctly in guilds.

```js
const client = new Client({
	makeCache: Options.cacheWithLimits({
		...Options.DefaultMakeCacheSettings,
		ReactionManager: 0,
		GuildMemberManager: {
			maxSize: 200,
			keepOverLimit: member => member.id === member.client.user.id,
		},
	}),
});
```

## Sweeping caches

In addition to limiting caches, you can also periodically sweep and remove old items from caches. When creating a new <DocsLink path="Client:Class"/>, you can customize the `sweepers` option.

Below is the default settings, which will occasionally sweep threads.

```js
const { Client, Options } = require('discord.js');

const client = new Client({
	sweepers: Options.DefaultSweeperSettings,
});
```

To change the sweep behavior, you specify the type of cache to sweep (<DocsLink path="SweeperKey:TypeAlias"/>) and the options for sweeping (<DocsLink path="SweepOptions:Interface"/>). If the type of cache has a lifetime associated with it, such as invites, messages, or threads, then you can set the `lifetime` option to sweep items older than specified. Otherwise, you can set the `filter` option for any type of cache, which will select the items to sweep.

```js
const client = new Client({
	sweepers: {
		...Options.DefaultSweeperSettings,
		messages: {
			interval: 3_600, // Every hour.
			lifetime: 1_800, // Remove messages older than 30 minutes.
		},
		users: {
			interval: 3_600, // Every hour.
			filter: () => user => user.bot && user.id !== user.client.user.id, // Remove all bots.
		},
	},
});
```

::: tip
Take a look at the documentation for which types of cache you can sweep.
Also look to see exactly what lifetime means for invites, messages, and threads!
:::

```

# guide\miscellaneous\useful-packages.md

```md
# Useful packages

## Day.js

::: tip
Official documentation: [https://day.js.org/](https://day.js.org/en)
:::

Day.js is a powerful package that parses, validates, manipulates, and displays dates and times in JavaScript.
It allows you to quickly and easily format dates in any way you want or parse strings back into JavaScript Date objects.
There are many plugins for it that allow you to work with durations and more.

For example if you wanted to ask your users to give you a date,  
you can use Day.js to turn it into a Date object you can use in your code:

<!-- eslint-skip -->
```js
const input = await interaction.channel.awaitMessages({ 
	filter: m => m.author.id === interaction.user.id, 
	max: 1,
	time: 10e3,
	errors: ['time'],
});
const date = dayjs(input.first().content).toDate();
```

Using the [duration plugin](https://day.js.org/docs/en/durations/durations), you could tell the user if the date is in the future or the past:

```js
if (date.isValid()) {
	const now = dayjs();
	const duration = date - now;
	const formatted = dayjs.duration(duration, 'ms').format();

	if (duration > 0) {
		interaction.reply(`The date you gave me is ${formatted} into the future.`);
	} else {
		interaction.reply(`The date you gave me is ${formatted} into the past.`);
	}
} else {
	interaction.reply('You didn\'t give me a valid date.');
}
```

## ms

::: tip
Official documentation: [https://github.com/vercel/ms](https://github.com/vercel/ms)
:::

Ms is another tool for working with times in JavaScript. However, ms specializes on durations.
It allows you to convert times in milliseconds into human-readable formats and vice versa.

Example:

<!-- eslint-skip -->
```js
await interaction.reply('Send two messages and I\'ll tell you how far apart you sent them.');
const messages = await interaction.channel.awaitMessages({
	filter: m => m.author.id === interaction.user.id,
	max: 2,
	time: 30e3,
	errors: ['time'],
});

const difference = messages.last().createdTimestamp - messages.first().createdTimestamp;
const formatted = ms(difference);

await interaction.followUp(`You sent the two messages ${formatted} apart.`);
```

## common-tags

::: tip
Official documentation: [https://github.com/zspecza/common-tags](https://github.com/zspecza/common-tags)
:::

Common-tags is a library all about working with template literals.  
So far, you have probably only used them for interpolating variables into your strings, but they can do a whole lot more.
If you got time, you should check out [the MDN's documentation about *tagged literals*.](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates).

Ever got annoyed your multi-line strings had nasty bits of indentation in them,
but you did not want to remove the indentation in your source code?  
common-tags got you covered:

```js
const packageName = 'common-tags';

if (someCondition) {
	const poem = stripIndents`
		I like ${packageName}.
		It makes my strings so pretty,
		you should use it too.
	`;

	console.log(poem);
}
```

This will print your little poem like expected, but it will not have any tabs or other whitespace on the left.

But this is just the start! Another set of useful functions are the list-related functions:
`inlineLists`, `commaLists`, etc.  
With those, you can easily interpolate arrays into your strings without them looking ugly:

```js
const options = ['add', 'delete', 'edit'];

// -> Do you want me to add, delete or edit the channel?
interaction.reply(oneLineCommaListsOr`
	Do you want me to ${options} the channel?
`);
```

Check the the documentation to find more useful functions.

## chalk

::: tip
Official documentation: [https://www.npmjs.com/package/chalk](https://www.npmjs.com/package/chalk)
:::

Chalk is not exactly useful for Discord bots themselves, but it will make your terminal output a lot prettier and organized.
This package lets you color and style your `console.log`s in many different ways; No more simple white on black.

Let's say you want your error messages to be easily visible; Let us give them a nice red color:

```js
console.error(chalk.redBright('FATAL ERROR'), 'Something really bad happened!');
```

![image of code above](./images/chalk-red.png)

You can also chain multiple different multipliers.  
If you wanted to have green text, a grey background, and have it all underlined, that is possible:

```js
console.log(chalk.green.bgBrightBlack.underline('This is so pretty.'));
```

![image of code above](./images/chalk-ugly.png)

## pino

::: tip
Official documentation: [getpino.io](https://getpino.io)
:::

Pino is a Node.js logger with a very low overhead. But why does that even matter, if `console.log()` exists? Well, `console.log()` is quite slow and not very versatile. Whenever you make a call to `console.log()` your program halts and cannot do anything until the logging is finished.

To get started, install the package:

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm install pino@next
npm install -g pino-pretty
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn add pino@next
yarn global add pino-pretty
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm add pino@next
pnpm add --global pino-pretty
```
:::
::::

Pino is highly configurable, so we heavily recommend you take a look at their documentation yourself.

To use the same logger across the project you can put the following code into it's own file, for example `logger.js` and import it when needed:

```js
const pino = require('pino');
const logger = pino();
module.exports = logger;
```

```js
const { Client, Events, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const logger = require('./logger');

client.once(Events.ClientReady, () => logger.info('The bot is online'));
client.on(Events.Debug, info => logger.debug(info));
client.on(Events.Warn, info => logger.warn(info));
client.on(Events.Error, error => logger.error(error));

client.login('your-token-goes-here');
```

Pino logs in a json format, so other programs and services like log aggregators can easily parse and work with the output. This is very useful for production systems, but quite tedious to read during development. This is why you installed `pino-pretty` earlier. Instead of formatting the log output itself the developers recommended that you [pipe](https://en.wikipedia.org/wiki/Pipeline_(Unix)) the log output to other services instead. `pino-pretty` is a formatter you can use for easy-to-read logs during development.

We recommend you set `pino-pretty` up in a package script in your `package.json` file, rather than typing the pipeline out every time. Please read our [guide section on package scripts](/improving-dev-environment/package-json-scripts), if you are not sure what we're talking about here.

```json {10}
{
	"name": "my-bot",
	"version": "1.0.0",
	"description": "A Discord bot!",
	"main": "index.js",
	"scripts": {
		"test": "echo \"Error: no test specified\" && exit 1",
		"start": "node .",
		"lint": "eslint .",
		"dev": "node . | pino-pretty -i pid,hostname -t 'yyyy-mm-dd HH:MM:ss'"
	},
	"keywords": [],
	"author": "",
	"license": "ISC"
}
```

:::warning
If you are using powershell, you have to use a package script for `pino-pretty`. Powershell handles pipelines in a way that prevents logging. The cmd commandline interface is not affected.
:::

In the example above, further arguments are passed to `pino-pretty` to modify the generated output. `-i pid,hostname` hides these two elements from logged lines and `-t yyyy-mm-dd HH:MM:ss` formats the timestamp into an easy to use format. Try out what works for you! The official [pino-pretty documentation](https://github.com/pinojs/pino-pretty) explains all possible arguments.

To start your bot with prettified input you run the `dev` script via your package manager of choice:

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm run dev
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn run dev
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm run dev
```
:::
::::

Pino is very flexible, supports custom log levels, worker threads and many more features. Please check out the [official documentation](https://getpino.io) if you want to up your pino game! Below we show an alternative for a production setup. Using this code, you will be logging the raw json objects into a file, instead of printing to your console: 

```js {2-6}
const pino = require('pino');
const transport = pino.transport({
	target: 'pino/file',
	options: { destination: './log.json' },
});
const logger = pino(transport);
module.exports = logger;
```

## i18next

::: tip
Official documentation: [https://www.i18next.com](https://www.i18next.com)
:::

i18next is an internationalization-framework for JavaScript. It is beneficial to translate your bot's user-facing messages into various languages based on the server it is used in.

Covering an entire use case example for internationalization would be out of this guide's scope and requires some more explanation as to how the system operates. Please refer to the official documentation linked above for an in-depth usage guide.

```

# guide\oauth2\README.md

```md
# Getting started with OAuth2

OAuth2 enables application developers to build applications that utilize authentication and data from the Discord API. Developers can use this to create things such as web dashboards to display user info, fetch linked third-party accounts like Twitch or Steam, access users' guild information without actually being in the guild, and much more. OAuth2 can significantly extend the functionality of your bot if used correctly.

## A quick example

### Setting up a basic web server

Most of the time, websites use OAuth2 to get information about their users from an external service. In this example, we will use [`express`](https://expressjs.com/) to create a web server to use a user's Discord information to greet them. Start by creating three files: `config.json`, `index.js`, and `index.html`.

`config.json` will be used to store the client ID, client secret, and server port.

```json
{
	"clientId": "",
	"clientSecret": "",
	"port": 53134
}
```

`index.js` will be used to start the server and handle requests. When someone visits the index page (`/`), an HTML file will be sent in response.

```js
const express = require('express');
const { port } = require('./config.json');

const app = express();

app.get('/', (request, response) => {
	return response.sendFile('index.html', { root: '.' });
});

app.listen(port, () => console.log(`App listening at http://localhost:${port}`));
```

`index.html` will be used to display the user interface and OAuth data once logged in.

```html
<!DOCTYPE html>
<html>
	<head>
		<title>My Discord OAuth2 App</title>
	</head>
	<body>
		<div id="info">Hoi!</div>
	</body>
</html>
```

After running `npm i express`, you can start your server with `node index.js`. Once started, connect to `http://localhost:53134`, and you should see "Hoi!".

::: tip
Although we're using express, there are many other alternatives to handle a web server, such as: [fastify](https://www.fastify.io/), [koa](https://koajs.com/), and the [native Node.js http module](https://nodejs.org/api/http.html).
:::

### Getting an OAuth2 URL

Now that you have a web server up and running, it's time to get some information from Discord. Open [your Discord applications](https://discord.com/developers/applications/), create or select an application, and head over to the "OAuth2" page.

![OAuth2 application page](./images/oauth2-app-page.png)

Take note of the `client id` and `client secret` fields. Copy these values into your `config.json` file; you'll need them later. For now, add a redirect URL to `http://localhost:53134` like so:

![Adding Redirects](./images/add-redirects.png)

Once you've added your redirect URL, you will want to generate an OAuth2 URL. Lower down on the page, you can conveniently find an OAuth2 URL Generator provided by Discord. Use this to create a URL for yourself with the `identify` scope.

![Generate an OAuth2 URL](./images/generate-url.png)

The `identify` scope will allow your application to get basic user information from Discord. You can find a list of all scopes [here](https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes).

### Implicit grant flow

You have your website, and you have a URL. Now you need to use those two things to get an access token. For basic applications like [SPAs](https://en.wikipedia.org/wiki/Single-page_application), getting an access token directly is enough. You can do so by changing the `response_type` in the URL to `token`. However, this means you will not get a refresh token, which means the user will have to explicitly re-authorize when this access token has expired.

After you change the `response_type`, you can test the URL right away. Visiting it in your browser, you will be directed to a page that looks like this:

![Authorization Page](./images/authorize-app-page.png)

You can see that by clicking `Authorize`, you allow the application to access your username and avatar. Once you click through, it will redirect you to your redirect URL with a [fragment identifier](https://en.wikipedia.org/wiki/Fragment_identifier) appended to it. You now have an access token and can make requests to Discord's API to get information on the user.

Modify `index.html` to add your OAuth2 URL and to take advantage of the access token if it exists. Even though [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) is for working with query strings, it can work here because the structure of the fragment follows that of a query string after removing the leading "#".

```html {4-26}
<div id="info">Hoi!</div>
<a id="login" style="display: none;" href="your-oauth2-URL-here">Identify Yourself</a>
<script>
	window.onload = () => {
		const fragment = new URLSearchParams(window.location.hash.slice(1));
		const [accessToken, tokenType] = [fragment.get('access_token'), fragment.get('token_type')];

		if (!accessToken) {
			return (document.getElementById('login').style.display = 'block');
		}

		fetch('https://discord.com/api/users/@me', {
			headers: {
				authorization: `${tokenType} ${accessToken}`,
			},
		})
			.then(result => result.json())
			.then(response => {
				const { username, discriminator } = response;
				document.getElementById('info').innerText += ` ${username}#${discriminator}`;
			})
			.catch(console.error);
	};
</script>
```

Here you grab the access token and type from the URL if it's there and use it to get info on the user, which is then used to greet them. The response you get from the [`/api/users/@me` endpoint](https://discord.com/developers/docs/resources/user#get-current-user) is a [user object](https://discord.com/developers/docs/resources/user#user-object) and should look something like this:

```json
{
	"id": "123456789012345678",
	"username": "User",
	"discriminator": "0001",
	"avatar": "1cc0a3b14aec3499632225c708451d67",
	...
}
```

In the following sections, we'll go over various details of Discord and OAuth2.

## More details

### The state parameter

OAuth2's protocols provide a `state` parameter, which Discord supports. This parameter helps prevent [CSRF](https://en.wikipedia.org/wiki/Cross-site_request_forgery) attacks and represents your application's state. The state should be generated per user and appended to the OAuth2 URL. For a basic example, you can use a randomly generated string encoded in Base64 as the state parameter.

```js {1-10,15-18}
function generateRandomString() {
	let randomString = '';
	const randomNumber = Math.floor(Math.random() * 10);

	for (let i = 0; i < 20 + randomNumber; i++) {
		randomString += String.fromCharCode(33 + Math.floor(Math.random() * 94));
	}

	return randomString;
}

window.onload = () => {
	// ...
	if (!accessToken) {
		const randomString = generateRandomString();
		localStorage.setItem('oauth-state', randomString);

		document.getElementById('login').href += `&state=${btoa(randomString)}`;
		return (document.getElementById('login').style.display = 'block');
	}
};
```

When you visit a URL with a `state` parameter appended to it and then click `Authorize`, you'll notice that after being redirected, the URL will also have the `state` parameter appended, which you should then check against what was stored. You can modify the script in your `index.html` file to handle this.

```js {2,8-10}
const fragment = new URLSearchParams(window.location.hash.slice(1));
const [accessToken, tokenType, state] = [fragment.get('access_token'), fragment.get('token_type'), fragment.get('state')];

if (!accessToken) {
	// ...
}

if (localStorage.getItem('oauth-state') !== atob(decodeURIComponent(state))) {
	return console.log('You may have been clickjacked!');
}
```

::: tip
Don't forgo security for a tiny bit of convenience!
:::

### Authorization code grant flow

What you did in the quick example was go through the `implicit grant` flow, which passed the access token straight to the user's browser. This flow is great and simple, but you don't get to refresh the token without the user, and it is less secure than going through the `authorization code grant` flow. This flow involves receiving an access code, which your server then exchanges for an access token. Notice that this way, the access token never actually reaches the user throughout the process.

Unlike the [implicit grant flow](/oauth2/#implicit-grant-flow), you need an OAuth2 URL where the `response_type` is `code`. After you change the `response_type`, try visiting the link and authorizing your application. You should notice that instead of a hash, the redirect URL now has a single query parameter appended to it, i.e. `?code=ACCESS_CODE`. Modify your `index.js` file to access the parameter from the URL if it exists. In express, you can use the `request` parameter's `query` property.

```js {2}
app.get('/', (request, response) => {
	console.log(`The access code is: ${request.query.code}`);
	return response.sendFile('index.html', { root: '.' });
});
```

Now you have to exchange this code with Discord for an access token. To do this, you need your `client_id` and `client_secret`. If you've forgotten these, head over to [your applications](https://discord.com/developers/applications) and get them. You can use [`undici`](https://www.npmjs.com/package/undici) to make requests to Discord.

To install undici, run the following command:

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm install undici
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn add undici
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm add undici
```
:::
::::

Require `undici` and make your request.

:::tip
If you are used to the Fetch API and want to use that instead of how `undici` does it, instead of using `undici#request`, use `undici#fetch` with the same parameters as node-fetch.
:::

```js {1,3,5-14,18-19,21-46}
const { request } = require('undici');
const express = require('express');
const { clientId, clientSecret, port } = require('./config.json');

const app = express();

app.get('/', async ({ query }, response) => {
	const { code } = query;

	if (code) {
		try {
			const tokenResponseData = await request('https://discord.com/api/oauth2/token', {
				method: 'POST',
				body: new URLSearchParams({
					client_id: clientId,
					client_secret: clientSecret,
					code,
					grant_type: 'authorization_code',
					redirect_uri: `http://localhost:${port}`,
					scope: 'identify',
				}).toString(),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			const oauthData = await tokenResponseData.body.json();
			console.log(oauthData);
		} catch (error) {
			// NOTE: An unauthorized token will not throw an error
			// tokenResponseData.statusCode will be 401
			console.error(error);
		}
	}

	return response.sendFile('index.html', { root: '.' });
});
```

::: warning
The content-type for the token URL must be `application/x-www-form-urlencoded`, which is why `URLSearchParams` is used.
:::

Now try visiting your OAuth2 URL and authorizing your application. Once you're redirected, you should see an [access token response](https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-access-token-response) in your console.

```json
{
	"access_token": "an access token",
	"token_type": "Bearer",
	"expires_in": 604800,
	"refresh_token": "a refresh token",
	"scope": "identify"
}
```

With an access token and a refresh token, you can once again use the [`/api/users/@me` endpoint](https://discord.com/developers/docs/resources/user#get-current-user) to fetch the [user object](https://discord.com/developers/docs/resources/user#user-object).

<!-- eslint-skip -->

```js {1-5,7}
const userResult = await request('https://discord.com/api/users/@me', {
	headers: {
		authorization: `${oauthData.token_type} ${oauthData.access_token}`,
	},
});

console.log(await userResult.body.json());
```

::: tip
To maintain security, store the access token server-side but associate it with a session ID that you generate for the user.
:::

## Additional reading

[RFC 6759](https://tools.ietf.org/html/rfc6749)  
[Discord Docs for OAuth2](https://discord.com/developers/docs/topics/oauth2)

## Resulting code

<ResultingCode path="oauth/simple-oauth-webserver" />

```

# guide\popular-topics\audit-logs.md

```md
# Working with Audit Logs

## A Quick Background

Audit logs are an excellent moderation tool offered by Discord to know what happened in a server and usually by whom. Making use of audit logs requires the `ViewAuditLog` permission. Audit logs may be fetched on a server, or they may be received via the gateway event `guildAuditLogEntryCreate` which requires the `GuildModeration` intent.

There are quite a few cases where you may use audit logs. This guide will limit itself to the most common use cases. Feel free to consult the [relevant Discord API page](https://discord.com/developers/docs/resources/audit-log) for more information.

Keep in mind that these examples explore a straightforward case and are by no means exhaustive. Their purpose is to teach you how audit logs work, and expansion of these examples is likely needed to suit your specific use case.

## Fetching Audit Logs

Let's start by glancing at the <DocsLink path="Guild:Class#fetchAuditLogs" type="method" /> method and how to work with it. Like many discord.js methods, it returns a [`Promise`](/additional-info/async-await.md) containing the <DocsLink path="GuildAuditLogs:Class" /> object. This object has one property, `entries`, which holds a [`Collection`](/additional-info/collections.md) of <DocsLink path="GuildAuditLogsEntry:Class" /> objects, and consequently, the information you want to retrieve.

Here is the most basic fetch to look at some entries.

```js
const fetchedLogs = await guild.fetchAuditLogs();
const firstEntry = fetchedLogs.entries.first();
```

Simple, right? Now, let's look at utilizing its options:

```js
const { AuditLogEvent } = require('discord.js');

const fetchedLogs = await guild.fetchAuditLogs({
	type: AuditLogEvent.InviteCreate,
	limit: 1,
});

const firstEntry = fetchedLogs.entries.first();
```

This will return the first entry where an invite was created. You used `limit: 1` here to specify only one entry.

## Receiving Audit Logs

Audit logs may be received via the gateway event `guildAuditLogEntryCreate`. This is the best way to receive audit logs if you want to monitor them. As soon as a message is deleted, or an invite or emoji is created, your application will receive an instance of this event. A common use case is to find out _who_ did the action that caused the audit log event to happen.

### Who deleted a message?

One of the most common use cases for audit logs is understanding who deleted a message in a Discord server. If a user deleted another user's message, you can find out who did that as soon as you receive the corresponding audit log event.

```js
const { AuditLogEvent, Events } = require('discord.js');

client.on(Events.GuildAuditLogEntryCreate, async auditLog => {
	// Define your variables.
	// The extra information here will be the channel.
	const { action, extra: channel, executorId, targetId } = auditLog;

	// Check only for deleted messages.
	if (action !== AuditLogEvent.MessageDelete) return;

	// Ensure the executor is cached.
	const executor = await client.users.fetch(executorId);

	// Ensure the author whose message was deleted is cached.
	const target = await client.users.fetch(targetId);

	// Log the output.
	console.log(`A message by ${target.tag} was deleted by ${executor.tag} in ${channel}.`);
});
```

With this, you now have a very simple logger telling you who deleted a message authored by another person.

### Who kicked a user?

This is very similar to the example above.

```js
const { AuditLogEvent, Events } = require('discord.js');

client.on(Events.GuildAuditLogEntryCreate, async auditLog => {
	// Define your variables.
	const { action, executorId, targetId } = auditLog;

	// Check only for kicked users.
	if (action !== AuditLogEvent.MemberKick) return;

	// Ensure the executor is cached.
	const executor = await client.users.fetch(executorId);

	// Ensure the kicked guild member is cached.
	const kickedUser = await client.users.fetch(targetId);

	// Now you can log the output!
	console.log(`${kickedUser.tag} was kicked by ${executor.tag}.`);
});
```

If you want to check who banned a user, it's the same example as above except the `action` should be `AuditLogEvent.MemberBanAdd`. You can check the rest of the types over at the [discord-api-types documentation](https://discord-api-types.dev/api/discord-api-types-v10/enum/AuditLogEvent).

```

# guide\popular-topics\canvas.md

```md
# Image manipulation with @napi-rs/canvas

## Setting up @napi-rs/canvas

@napi-rs/canvas is an image manipulation tool that allows you to modify images with code. We'll explore how to use this module in a slash command to make a profile command.

::: tip
This guide is last tested with `@napi-rs/canvas^0.1.25`, so make sure you have this or a similar version after installation.
:::

::: warning
Be sure that you're familiar with things like [async/await](/additional-info/async-await.md) and [object destructuring](/additional-info/es6-syntax.md#object-destructuring) before continuing, as we'll be making use of features like these.
:::

## Package installation

Run the following command in your terminal:

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm install @napi-rs/canvas
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn add @napi-rs/canvas
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm add @napi-rs/canvas
```
:::
::::

## Getting started

Here is the base code you'll be using to get started:

```js
const { AttachmentBuilder, Client, Events, GatewayIntentBits } = require('discord.js');
const Canvas = require('@napi-rs/canvas');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'profile') {
		// ...
	}
});

client.login('your-token-goes-here');
```

::: warning
Remember to register the slash commands before continuing on with this section of the guide. You can view how to do that [here](/interactions/slash-commands.md#registering-slash-commands).
:::

### Basic image loading

The end goal will be to display the user's avatar and nickname.

After importing the @napi-rs/canvas module and initializing it, you should load the images. With @napi-rs/canvas, you have to specify where the image comes from first, naturally, and then specify how it gets loaded into the actual Canvas using `context`, which you will use to interact with Canvas.

::: tip
`@napi-rs/canvas` works almost identical to HTML5 Canvas. You can read the HTML5 Canvas tutorials on [w3Schools](https://www.w3schools.com/html/html5_canvas.asp) and [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) for more information later!
:::

```js {5-8}
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'profile') {
		// Create a 700x250 pixel canvas and get its context
		// The context will be used to modify the canvas
		const canvas = Canvas.createCanvas(700, 250);
		const context = canvas.getContext('2d');
		// ...
	}
});
```

Now, you need to load the image you want to use into Canvas.

We'll be using [this image](https://github.com/discordjs/guide/blob/main/guide/popular-topics/images/canvas.jpg) as the background in the welcome image, but you can use whatever you want. Be sure to download the file, name it `wallpaper.jpg`, and save it inside the same directory as your main bot file.

```js {5-13}
client.on(Events.InteractionCreate, async interaction => {
	// ...
	const context = canvas.getContext('2d');

	const background = await Canvas.loadImage('./wallpaper.jpg');

	// This uses the canvas dimensions to stretch the image onto the entire canvas
	context.drawImage(background, 0, 0, canvas.width, canvas.height);

	// Use the helpful Attachment class structure to process the file for you
	const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'profile-image.png' });

	interaction.reply({ files: [attachment] });
});
```

![Basic canvas preview](./images/canvas-preview.png)

::: tip
If you get an error such as `Error: ENOENT: no such file or directory`, then the file's provided path was incorrect.
:::

### Manipulating images

Next, let's place a border around the image for the sake of demonstration purposes.

```js {5-9}
client.on(Events.InteractionCreate, async interaction => {
	// ...
	context.drawImage(background, 0, 0, canvas.width, canvas.height);

	// Set the color of the stroke
	context.strokeStyle = '#0099ff';

	// Draw a rectangle with the dimensions of the entire canvas
	context.strokeRect(0, 0, canvas.width, canvas.height);
	// ...
});
```

![Image](./images/canvas-plain.png)

A bit plain, right? Fear not, for you have a bit more to do until you reach completion. Since this guide page's goal is focused more on actual code than design, let's place a basic square-shaped avatar for now on the left side of the image. In the interest of coverage, you will also make it a circle afterward.

```js {7-15}
const { request } = require('undici');

client.on(Events.InteractionCreate, async interaction => {
	// ...
	context.strokeRect(0, 0, canvas.width, canvas.height);

	// Using undici to make HTTP requests for better performance
	const { body } = await request(interaction.user.displayAvatarURL({ extension: 'jpg' }));
	const avatar = await Canvas.loadImage(await body.arrayBuffer());

	// If you don't care about the performance of HTTP requests, you can instead load the avatar using
	// const avatar = await Canvas.loadImage(interaction.user.displayAvatarURL({ extension: 'jpg' }));

	// Draw a shape onto the main canvas
	context.drawImage(avatar, 25, 0, 200, canvas.height);
	// ...
});
```

![Image](./images/canvas-stretched-avatar.png)

It works well, but the avatar image itself seems a bit stretched out. Let's remedy that.

```js {6-7}
client.on(Events.InteractionCreate, async interaction => {
	// ...
	const { body } = await request(interaction.user.displayAvatarURL({ extension: 'jpg' }));
	const avatar = await Canvas.loadImage(await body.arrayBuffer());

	// Move the image downwards vertically and constrain its height to 200, so that it's square
	context.drawImage(avatar, 25, 25, 200, 200);
	// ...
});
```

![Image](./images/canvas-square-avatar.png)

The purpose of this small section is to demonstrate that working with Canvas is essentially a hit-and-miss workflow where you fiddle with properties until they work just right.

Since we covered how to load external images and fix dimensions, let's turn the avatar into a circle to improve the image's overall style.

```js {5-15}
client.on(Events.InteractionCreate, async interaction => {
	// ...
	context.strokeRect(0, 0, canvas.width, canvas.height);

	// Pick up the pen
	context.beginPath();

	// Start the arc to form a circle
	context.arc(125, 125, 100, 0, Math.PI * 2, true);

	// Put the pen down
	context.closePath();

	// Clip off the region you drew on
	context.clip();
	// ...
});
```

![Image](./images/canvas-circle-avatar.png)

::: tip
You can read more about `context.arc()` on [w3schools](https://www.w3schools.com/tags/canvas_arc.asp) or [MDN](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc).
:::

### Adding in text

Now, let's quickly go over adding text to your image. This will help make the purpose of this image apparent since currently, it's just an avatar floating on a starry background that comes out of nowhere.

```js {5-12}
client.on(Events.InteractionCreate, async interaction => {
	// ...
	context.strokeRect(0, 0, canvas.width, canvas.height);

	// Select the font size and type from one of the natively available fonts
	context.font = '60px sans-serif';

	// Select the style that will be used to fill the text in
	context.fillStyle = '#ffffff';

	// Actually fill the text with a solid color
	context.fillText(interaction.member.displayName, canvas.width / 2.5, canvas.height / 1.8);
	// ...
});
```

![Image](./images/canvas-add-name.png)

::: tip
If you get an error like `Fontconfig error: Cannot load default config file`, it means you do not have any fonts installed on your system. On Linux, you can run the following command to fix this: `sudo apt-get install fontconfig`. This might also need to be installed if you see boxes where the text should be. As for Windows, you will need to find a way to install fonts.
:::

You may have noticed or considered that if a member's username is too long, then the output won't be quite nice. This is because the text overflows out of the canvas, and you don't have any measures in place for that. Let's take care of this issue!

```js {1-16,22-25}
// Pass the entire Canvas object because you'll need access to its width and context
const applyText = (canvas, text) => {
	const context = canvas.getContext('2d');

	// Declare a base size of the font
	let fontSize = 70;

	do {
		// Assign the font to the context and decrement it so it can be measured again
		context.font = `${fontSize -= 10}px sans-serif`;
		// Compare pixel width of the text to the canvas minus the approximate avatar size
	} while (context.measureText(text).width > canvas.width - 300);

	// Return the result to use in the actual canvas
	return context.font;
};

client.on(Events.InteractionCreate, async interaction => {
	// ...
	context.strokeRect(0, 0, canvas.width, canvas.height);

	// Assign the decided font to the canvas
	context.font = applyText(canvas, interaction.member.displayName);
	context.fillStyle = '#ffffff';
	context.fillText(interaction.member.displayName, canvas.width / 2.5, canvas.height / 1.8);
	// ...
});
```

Before adjustment:

![Before adjustment](./images/canvas-before-text-wrap.png)

After adjustment:

![After adjustment](./images/canvas-after-text-wrap.png)

Let's move the welcome text inside the image itself instead of adding it outside as a nice finishing touch.

```js {5-8,10-13}
client.on(Events.InteractionCreate, async interaction => {
	// ...
	context.strokeRect(0, 0, canvas.width, canvas.height);

	// Slightly smaller text placed above the member's display name
	context.font = '28px sans-serif';
	context.fillStyle = '#ffffff';
	context.fillText('Profile', canvas.width / 2.5, canvas.height / 3.5);

	// Add an exclamation point here and below
	context.font = applyText(canvas, `${interaction.member.displayName}!`);
	context.fillStyle = '#ffffff';
	context.fillText(`${interaction.member.displayName}!`, canvas.width / 2.5, canvas.height / 1.8);
	// ...
});
```

![Final result](./images/canvas-final-result.png)

And that's it! We have covered the basics of image manipulation, text generation, and loading from a remote source.

## Resulting code

<ResultingCode />

```

# guide\popular-topics\collectors.md

```md
# Collectors

## Message collectors

<p><DocsLink path="Collector:Class">Collectors</DocsLink> are useful to enable your bot to obtain *additional* input after the first command was sent. An example would be initiating a quiz, where the bot will "await" a correct response from somebody.</p>

### Basic message collector

For now, let's take the example that they have provided us:

```js
// `m` is a message object that will be passed through the filter function
const collectorFilter = m => m.content.includes('discord');
const collector = interaction.channel.createMessageCollector({ filter: collectorFilter, time: 15_000 });

collector.on('collect', m => {
	console.log(`Collected ${m.content}`);
});

collector.on('end', collected => {
	console.log(`Collected ${collected.size} items`);
});
```

You can provide a `filter` key to the object parameter of `createMessageCollector()`. The value to this key should be a function that returns a boolean value to indicate if this message should be collected or not. To check for multiple conditions in your filter you can connect them using [logical operators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_Operators#logical_operators).  If you don't provide a filter all messages in the channel the collector was started on will be collected. 

Note that the above example uses [implicit return](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions#function_body) for the filter function and passes it to the options object using the [object property shorthand](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#property_definitions) notation.


If a message passes through the filter, it will trigger the `collect` event for the `collector` you've created. This message is then passed into the event listener as `collected` and the provided function is executed. In the above example, you simply log the message. Once the collector finishes collecting based on the provided end conditions the `end` event emits.

You can control when a collector ends by supplying additional option keys when creating a collector:

* `time`: Amount of time in milliseconds the collector should run for
* `max`:  Number of messages to successfully pass the filter
* `maxProcessed`: Number of messages encountered (no matter the filter result)

The benefit of using an event-based collector over `.awaitMessages()` (its promise-based counterpart) is that you can do something directly after each message is collected, rather than just after the collector ended. You can also stop the collector manually by calling `collector.stop()`.

### Await messages

Using <DocsLink path="TextChannel:Class#awaitMessages" type="method" /> can be easier if you understand Promises, and it allows you to have cleaner code overall. It is essentially identical to <DocsLink path="TextChannel:Class#createMessageCollector" type="method" />, except promisified. However, the drawback of using this method is that you cannot do things before the Promise is resolved or rejected, either by an error or completion. However, it should do for most purposes, such as awaiting the correct response in a quiz. Instead of taking their example, let's set up a basic quiz command using the `.awaitMessages()` feature.

First, you'll need some questions and answers to choose from, so here's a basic set:

```json
[
	{
		"question": "What color is the sky?",
		"answers": ["blue"]
	},
	{
		"question": "How many letters are there in the alphabet?",
		"answers": ["26", "twenty-six", "twenty six", "twentysix"]
	}
]
```

The provided set allows for responder error with an array of answers permitted. Ideally, it would be best to place this in a JSON file, which you can call `quiz.json` for simplicity.

```js
const quiz = require('./quiz.json');
// ...
const item = quiz[Math.floor(Math.random() * quiz.length)];
const collectorFilter = response => {
	return item.answers.some(answer => answer.toLowerCase() === response.content.toLowerCase());
};

interaction.reply({ content: item.question, fetchReply: true })
	.then(() => {
		interaction.channel.awaitMessages({ filter: collectorFilter, max: 1, time: 30_000, errors: ['time'] })
			.then(collected => {
				interaction.followUp(`${collected.first().author} got the correct answer!`);
			})
			.catch(collected => {
				interaction.followUp('Looks like nobody got the answer this time.');
			});
	});
```

::: tip
If you don't understand how `.some()` works, you can read about it in more detail [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some).
:::

In this filter, you iterate through the answers to find what you want. You would like to ignore the case because simple typos can happen, so you convert each answer to its lowercase form and check if it's equal to the response in lowercase form as well. In the options section, you only want to allow one answer to pass through, hence the `max: 1` setting.

The filter looks for messages that match one of the answers in the array of possible answers to pass through the collector. The options (the second parameter) specifies that only a maximum of one message can go through the filter successfully before the Promise successfully resolves. The errors section specifies that time will cause it to error out, which will cause the Promise to reject if one correct answer is not received within the time limit of one minute. As you can see, there is no `collect` event, so you are limited in that regard.

## Reaction collectors

### Basic reaction collector

These work quite similarly to message collectors, except that you apply them on a message rather than a channel. This example uses the <DocsLink path="Message:Class#createReactionCollector" type="method" /> method. The filter will check for the 👍 emoji–in the default skin tone specifically, so be wary of that. It will also check that the person who reacted shares the same id as the author of the original message that the collector was assigned to.

```js
const collectorFilter = (reaction, user) => {
	return reaction.emoji.name === '👍' && user.id === message.author.id;
};

const collector = message.createReactionCollector({ filter: collectorFilter, time: 15_000 });

collector.on('collect', (reaction, user) => {
	console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
});

collector.on('end', collected => {
	console.log(`Collected ${collected.size} items`);
});
```

### Await reactions

<p><DocsLink path="Message:Class#awaitReactions" type="method" /> works almost the same as a reaction collector, except it is Promise-based. The same differences apply as with channel collectors.</p>

```js
const collectorFilter = (reaction, user) => {
	return reaction.emoji.name === '👍' && user.id === message.author.id;
};

message.awaitReactions({ filter: collectorFilter, max: 4, time: 60_000, errors: ['time'] })
	.then(collected => console.log(collected.size))
	.catch(collected => {
		console.log(`After a minute, only ${collected.size} out of 4 reacted.`);
	});
```

## Interaction collectors

The third type of collector allows you to collect interactions; such as when users activate a slash command or click on a button in a message.

### Basic message component collector

Collecting interactions from message components works similarly to reaction collectors. In the following example,  you will check that the interaction came from a button, and that the user clicking the button is the same user that initiated the command.

One important difference to note with interaction collectors is that Discord expects a response to *all* interactions within 3 seconds - even ones that you don't want to collect. For this reason, you may wish to `.deferUpdate()` all interactions in your filter, or not use a filter at all and handle this behavior in the `collect` event.

```js
const { ComponentType } = require('discord.js');

const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15_000 });

collector.on('collect', i => {
	if (i.user.id === interaction.user.id) {
		i.reply(`${i.user.id} clicked on the ${i.customId} button.`);
	} else {
		i.reply({ content: `These buttons aren't for you!`, ephemeral: true });
	}
});

collector.on('end', collected => {
	console.log(`Collected ${collected.size} interactions.`);
});
```

### Await message component

As before, this works similarly to the message component collector, except it is Promise-based.

Unlike other Promise-based collectors, this method will only ever collect one interaction that passes the filter. If no interactions are collected before the time runs out, the Promise will reject. This behavior aligns with Discord's requirement that actions should immediately receive a response. In this example, you will use `.deferUpdate()` on all interactions in the filter.

```js
const { ComponentType } = require('discord.js');

const collectorFilter = i => {
	i.deferUpdate();
	return i.user.id === interaction.user.id;
};

message.awaitMessageComponent({ filter: collectorFilter, componentType: ComponentType.StringSelect, time: 60_000 })
	.then(interaction => interaction.editReply(`You selected ${interaction.values.join(', ')}!`))
	.catch(err => console.log('No interactions were collected.'));
```

### Await modal submit

If you want to wait for the submission of a modal within the context of another command or button execution, you may find the promisified collector <DocsLink path="CommandInteraction:Class#awaitModalSubmit" type="method"/> useful.

As Discord does not inform you if the user dismisses the modal, supplying a maximum `time` to wait for is crucial:

```js
initialInteraction.awaitModalSubmit({ time: 60_000, filter })
	.then(interaction => interaction.editReply('Thank you for your submission!'))
	.catch(err => console.log('No modal submit interaction was collected'));
```

For more information on working with modals, see the [modals section of this guide](/interactions/modals.md).

```

# guide\popular-topics\embeds.md

```md
# Embeds

If you have been around on Discord for a bit, chances are you have seen these special messages, often sent by bots.
They can have a colored border, embedded images, text fields, and other fancy properties.

In the following section, we will explain how to compose an embed, send it, and what you need to be aware of while doing so.

## Embed preview

Here is an example of how an embed may look. We will go over embed construction in the next part of this guide.

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #embeds>
			<DiscordEmbed
				border-color="#0099ff"
				embed-title="Some title"
				url="https://discord.js.org/"
				thumbnail="https://i.imgur.com/AfFp7pu.png"
				image="https://i.imgur.com/AfFp7pu.png"
				footer-icon="https://i.imgur.com/AfFp7pu.png"
				timestamp="01/01/2018"
				author-name="Some name"
				author-icon="https://i.imgur.com/AfFp7pu.png"
				author-url="https://discord.js.org/"
			>
				Some description here
				<template #fields>
					<DiscordEmbedFields>
						<DiscordEmbedField field-title="Regular field title">
							Some value here
						</DiscordEmbedField>
						<DiscordEmbedField field-title="​">
							​
						</DiscordEmbedField>
						<DiscordEmbedField :inline="true" field-title="Inline field title">
							Some value here
						</DiscordEmbedField>
						<DiscordEmbedField :inline="true" field-title="Inline field title">
							Some value here
						</DiscordEmbedField>
						<DiscordEmbedField :inline="true" field-title="Inline field title">
							Some value here
						</DiscordEmbedField>
					</DiscordEmbedFields>
				</template>
				<template #footer>
					<span>Some footer text here</span>
				</template>
			</DiscordEmbed>
		</template>
	</DiscordMessage>
</DiscordMessages>

## Using the embed constructor

discord.js features the <DocsLink path="EmbedBuilder:Class" /> utility class for easy construction and manipulation of embeds.

```js
// at the top of your file
const { EmbedBuilder } = require('discord.js');

// inside a command, event listener, etc.
const exampleEmbed = new EmbedBuilder()
	.setColor(0x0099FF)
	.setTitle('Some title')
	.setURL('https://discord.js.org/')
	.setAuthor({ name: 'Some name', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
	.setDescription('Some description here')
	.setThumbnail('https://i.imgur.com/AfFp7pu.png')
	.addFields(
		{ name: 'Regular field title', value: 'Some value here' },
		{ name: '\u200B', value: '\u200B' },
		{ name: 'Inline field title', value: 'Some value here', inline: true },
		{ name: 'Inline field title', value: 'Some value here', inline: true },
	)
	.addFields({ name: 'Inline field title', value: 'Some value here', inline: true })
	.setImage('https://i.imgur.com/AfFp7pu.png')
	.setTimestamp()
	.setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });

channel.send({ embeds: [exampleEmbed] });
```

::: tip
You don't need to include all the elements showcased above. If you want a simpler embed, leave some out.
:::

The `.setColor()` method accepts a <DocsLink path="ColorResolvable:TypeAlias" />, e.g. an integer, HEX color string, an array of RGB values or specific color strings.

To add a blank field to the embed, you can use `.addFields({ name: '\u200b', value: '\u200b' })`.

The above example chains the manipulating methods to the newly created EmbedBuilder object.
If you want to modify the embed based on conditions, you will need to reference it as the constant `exampleEmbed` (for our example).

<!-- eslint-skip -->

```js
const exampleEmbed = new EmbedBuilder().setTitle('Some title');

if (message.author.bot) {
	exampleEmbed.setColor(0x7289DA);
}
```

## Using an embed object

<!-- eslint-disable camelcase -->

```js
const exampleEmbed = {
	color: 0x0099ff,
	title: 'Some title',
	url: 'https://discord.js.org',
	author: {
		name: 'Some name',
		icon_url: 'https://i.imgur.com/AfFp7pu.png',
		url: 'https://discord.js.org',
	},
	description: 'Some description here',
	thumbnail: {
		url: 'https://i.imgur.com/AfFp7pu.png',
	},
	fields: [
		{
			name: 'Regular field title',
			value: 'Some value here',
		},
		{
			name: '\u200b',
			value: '\u200b',
			inline: false,
		},
		{
			name: 'Inline field title',
			value: 'Some value here',
			inline: true,
		},
		{
			name: 'Inline field title',
			value: 'Some value here',
			inline: true,
		},
		{
			name: 'Inline field title',
			value: 'Some value here',
			inline: true,
		},
	],
	image: {
		url: 'https://i.imgur.com/AfFp7pu.png',
	},
	timestamp: new Date().toISOString(),
	footer: {
		text: 'Some footer text here',
		icon_url: 'https://i.imgur.com/AfFp7pu.png',
	},
};

channel.send({ embeds: [exampleEmbed] });
```

::: tip
You don't need to include all the elements showcased above. If you want a simpler embed, leave some out.
:::

If you want to modify the embed object based on conditions, you will need to reference it directly (as `exampleEmbed` for our example). You can then (re)assign the property values as you would with any other object.

```js
const exampleEmbed = { title: 'Some title' };

if (message.author.bot) {
	exampleEmbed.color = 0x7289da;
}
```

## Attaching images

You can upload images with your embedded message and use them as source for embed fields that support image URLs by constructing a <DocsLink path="AttachmentBuilder:Class" /> from them to send as message option alongside the embed. The attachment parameter takes a BufferResolvable or Stream including the URL to an external image.

You can then reference and use the images inside the embed itself with `attachment://fileName.extension`.

::: tip
If you plan to attach the same image repeatedly, consider hosting it online and providing the URL in the respective embed field instead. This also makes your bot respond faster since it doesn't need to upload the image with every response depending on it.
:::

### Using the EmbedBuilder

```js
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
// ...
const file = new AttachmentBuilder('../assets/discordjs.png');
const exampleEmbed = new EmbedBuilder()
	.setTitle('Some title')
	.setImage('attachment://discordjs.png');

channel.send({ embeds: [exampleEmbed], files: [file] });
```

### Using an embed object

```js
const { AttachmentBuilder } = require('discord.js');
// ...
const file = new AttachmentBuilder('../assets/discordjs.png');

const exampleEmbed = {
	title: 'Some title',
	image: {
		url: 'attachment://discordjs.png',
	},
};

channel.send({ embeds: [exampleEmbed], files: [file] });
```

::: warning
If the images don't display inside the embed but outside of it, double-check your syntax to make sure it's as shown above.
:::

## Resending and editing

We will now explain how to edit embedded message content and resend a received embed.

### Resending a received embed

To forward a received embed you retrieve it from the messages embed array (`message.embeds`) and pass it to the EmbedBuilder, then it can be edited before sending it again.

::: warning
We create a new Embed from `EmbedBuilder` here since embeds are immutable and their values cannot be changed directly.
:::

```js
const receivedEmbed = message.embeds[0];
const exampleEmbed = EmbedBuilder.from(receivedEmbed).setTitle('New title');

channel.send({ embeds: [exampleEmbed] });
```

### Editing the embedded message content

To edit the content of an embed you need to pass a new EmbedBuilder structure or embed object to the messages `.edit()` method.

```js
const exampleEmbed = new EmbedBuilder()
	.setTitle('Some title')
	.setDescription('Description after the edit');

message.edit({ embeds: [exampleEmbed] });
```

If you want to build the new embed data on a previously sent embed template, make sure to read the caveats in the previous section. 

## Notes

- To display fields side-by-side, you need at least two consecutive fields set to `inline`
- The timestamp will automatically adjust the timezone depending on the user's device
- Mentions of any kind in embeds will only render correctly within embed descriptions and field values
- Mentions in embeds will not trigger a notification
- Embeds allow masked links (e.g. `[Guide](https://discordjs.guide/ 'optional hovertext')`), but only in description and field values

## Embed limits

There are a few limits to be aware of while planning your embeds due to the API's limitations. Here is a quick reference you can come back to:

- Embed titles are limited to 256 characters
- Embed descriptions are limited to 4096 characters
- There can be up to 25 fields
- A field's name is limited to 256 characters and its value to 1024 characters
- The footer text is limited to 2048 characters
- The author name is limited to 256 characters
- The sum of all characters from all embed structures in a message must not exceed 6000 characters
- 10 embeds can be sent per message

Source: [Discord API documentation](https://discord.com/developers/docs/resources/channel#embed-object-embed-limits)

```

# guide\popular-topics\errors.md

```md
# Errors

There is no doubt that you have encountered errors while making bots. While errors are instrumental at warning you of what is going wrong, many people are stumped by them and how to track them down and fix them, but don't worry, we have you covered. This section will be all about diagnosing errors, identifying where they are coming from, and fixing them.

## Types of Errors

### API Errors

API Errors or DiscordAPIErrors are thrown by the Discord API when an invalid request carries out. API Errors can be mostly diagnosed using the message that is given. You can further examine errors by inspecting the HTTP method and path used. We will explore tracking these errors down in the next section.

Example: `DiscordAPIError: Cannot send an empty message`

### discord.js errors

discord.js errors are thrown by the library itself. They can usually be easily tracked down using the stack trace and error message.

Example: `The messages must be an Array, Collection, or number.`

### JavaScript errors

JavaScript errors are thrown by node itself or by discord.js. These errors can easily be fixed by looking at the type of error and the stack trace. You can find a full list of types [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) and a list of common JavaScript errors [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors).

Examples:
- `ReferenceError: "x" is not defined`
- `Cannot read properties of null (reading 'something')`

### WebSocket and Network errors

WebSocket and Network errors are common system errors thrown by Node in response to something wrong with the WebSocket connection. Unfortunately, these errors do not have a concrete solution and can be (usually) fixed by getting a better, more stable, and more robust connection. discord.js will automatically try to reconnect to the WebSocket if an error occurs. 

In version 12, WebSocket errors are handled internally, meaning your process should never crash from them. If you want to log these errors, should they happen, you can listen to the `shardError` event as shown below.

```js
client.on(Events.ShardError, error => {
	console.error('A websocket connection encountered an error:', error);
});
```

The commonly thrown codes for these errors are:
- `ECONNRESET` - The connection was forcibly closed by a peer, thrown by the loss of connection to a WebSocket due to timeout or reboot.
- `ETIMEDOUT` - A connect or send request failed because the receiving party did not respond after some time.
- `EPIPE` - The remote side of the stream being written to has been closed.
- `ENOTFOUND` - The domain being accessed is unavailable, usually caused by a lack of internet, can be thrown by the WebSocket and HTTP API.
- `ECONNREFUSED` - The target machine refused the connection; check your ports and firewall.

## How to diagnose API errors

API Errors can be tracked down by adding an event listener for unhandled rejections and looking at the extra info.
This can be done by adding this to your main file.

```js
process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});
```

The next time you get the error it will show info along the bottom of the error which will look something like this for example:

```json
  name: 'DiscordAPIError',
  message: 'Invalid Form Body\nmessage_id: Value "[object Object]" is not snowflake.',
  path: '/api/v10/channels/638200642359525387/messages/[object%20Object]',
  code: 50035,
  method: 'GET'
```

All of this information can help you track down what caused the error and how to fix it. In this section, we will run through what each property means.

### Message

The most important part of the error is the message. It tells you what went wrong, which can help you track down where it originates. 
You can find a full list of messages [here](https://discord.com/developers/docs/topics/opcodes-and-status-codes#json) in the Discord API documentation.

### Path

Another helpful piece of information is the path, which tells you what API endpoint the error occurred on. We cannot possibly cover all endpoints, but they are usually very descriptive.

In the above example, the path tells you that the action was executed in the `/channels/` scope. The number you see next is the channel's id. Next, you can spot the `message/` scope. The number is again the object's id. Combined with the method `GET` you can conclude, that the bot tried to fetch the message with the id `[object Object]` from the channel with the id `638200642359525387`.

As the error message tells you `[object Object]` is not a valid id, so you now know where to look for an error! Find out where you pass an object as an id when trying to fetch a message and fix your code in that location.

### Code

The code is another partial representation of the message, in this case, `Invalid Form Body`. You can find a full list of codes [here](https://discord.com/developers/docs/topics/opcodes-and-status-codes#json-json-error-codes)

The code is also handy if you want only to handle a specific error. Say you're trying to delete a message which may or may not be there, and wanted to ignore unknown message errors. This can be done by checking the code, either manually or using discord.js constants.

```js
message.delete().catch(error => {
	// Only log the error if it is not an Unknown Message error
	if (error.code !== 10_008) {
		console.error('Failed to delete the message:', error);
	}
});
```

Or using Constants:

```js
const { RESTJSONErrorCodes } = require('discord.js');

message.delete().catch(error => {
	if (error.code !== RESTJSONErrorCodes.UnknownMessage) {
		console.error('Failed to delete the message:', error);
	}
});
```

You can find a list of constants [here](https://discord-api-types.dev/api/discord-api-types-rest/common/enum/RESTJSONErrorCodes).

### Method

The final piece of information can tell you a lot about what you tried to do to the path. There are a set of predefined keywords that describe our actions on the path.

```
GET    - Used to retrieve a piece of data
POST   - Used to send a piece of data
PATCH  - Used to modify a piece of data
PUT    - Used to replace a piece of data completely
DELETE - Used to delete a piece of data completely
```

In this particular example, you can see you are trying to access a piece of data, specifically, a message.

## Common discord.js and API errors

### An invalid token was provided.

This is a prevalent error; it originates from a wrong token being passed into `client.login()`. The most common causes of this error are:

- Not importing the config or env file correctly
- Copying the client secret instead of the bot token (the token is alphanumerical and three parts delimited by a period while the client secret is significantly smaller and one part only)
- Not updating the token after resetting it

::: warning
Before the release of version 12, there used to be an issue where the token was not prefixed correctly, which resulted in valid tokens being marked as invalid. If you have verified that all of the above is not the case, make sure you have updated discord.js to the current stable version.
:::

### Request to use token, but token was unavailable to the client.

This error originates from the client attempting to execute an action that requires the token but the token not being available. This is most commonly caused by destroying the client and then trying to perform an action.

This error is also caused by attempting to use a client that has not logged in. Both of the examples below will throw errors.

```js
const { Client, GatewayIntentBits } = require('discord.js');

// Should not be here!
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

module.exports = interaction => {
	const id = interaction.options.getString('id');
	// Should be `interaction.client` instead!
	client.users.fetch(id).then(user => {
		interaction.reply(`Your requested user: ${user.tag}`);
	});
};
```

```js
const { Client, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on(Events.InteractionCreate, someHandlerFunction);

client.login('your-token-goes-here');
// client will not be logged in yet!
client.users.fetch('myId').then(someInitFunction);
```

### EmbedBuilder field values may not be empty.

This error originates from calling `EmbedBuilder#addFields()` with a field object's `name` property as an empty string. If you would like the title to be empty for a reason, you should use a zero width space, which can be input as `\u200b`.

In conjunction with the previous error, this error results from calling `EmbedBuilder#addFields()` with a field object's `value` property as an empty string. You can use a zero-width space if you would like this blank.

### The messages must be an Array, Collection, or number.

This error originates from an invalid call to `bulkDelete()`. Make sure you are inputting a valid Array or Collection of messages or a valid number.

### Members didn't arrive in time.

This error happens when fetching multiple members via `GuildMemberManager#fetch()` and:
- The `GuildMembers` intent is not specified or enabled in the dev dashboard
- The internet connection is somewhat bad
- The amount of members fetched is large (about 50 thousand and upwards)

You can specify the time to wait for with the `time` option in the `.fetch()` call. Another solution could be to move your bot to a faster infrastructure, if available.

### MaxListenersExceededWarning: Possible EventEmitter memory leak detected...

This error is caused by spawning a large number of event listeners, usually for the client. The most common cause of this is nesting your event listeners instead of separating them. The way to fix this error is to make sure you do not nest your listeners; it is **not** to use `emitter.setMaxListeners()` as the error suggests.

You can debug these messages in different ways:
- Through the [CLI](https://nodejs.org/api/cli.html#cli_trace_warnings): `node --trace-warnings index.js`
- Through the [`process#warning` event](https://nodejs.org/api/process.html#process_event_warning): `process.on('warning', console.warn);`

### Cannot send messages to this user.

This error throws when the bot attempts to send a DM message to a user but cannot do so. A variety of reasons causes this:
- The bot and the user do not share a guild (often, people attempt to DM the user after kicking or banning them).
- The bot tries to DM another bot.
- The user has blocked the bot.
- The user has disabled DMs in the privacy settings.

In the case of the last two reasons, the error is not preventable, as the Discord API does not provide a way to check if you can send a user a DM until you attempt to send one. The best way to handle this error is to add a `.catch()` where you try to DM the user and either ignore the rejected Promise or do what you want because of it.

## Common miscellaneous errors

### code ENOENT... syscall spawn git.

This error is commonly thrown by your system due to it not finding `git`. You need to install `git` or update your path if `git` is already installed. Here are the download links for it:
- Ubuntu/Debian: `sudo apt-get install git`
- Windows: [git-scm](https://git-scm.com/download/win)

### code ELIFECYCLE

This error is commonly thrown by your system in response to the process unexpectedly closing. Cleaning the npm cache and deleting node_modules can usually fix it. The instructions for doing that are as such:
- Clean npm cache with `npm cache clean --force`
- delete `node_modules`
- delete `package-lock.json` (make sure you have a `package.json`!)
- run `npm install` to reinstall packages from `package.json`

```

# guide\popular-topics\faq.md

```md
# Frequently asked Questions

## Legend

* `client` is a placeholder for the <DocsLink path="Client:Class" /> object, such as `const client = new Client({ intents: [GatewayIntentBits.Guilds] });`.
* `interaction` is a placeholder for the <DocsLink path="BaseInteraction:Class" /> object, such as `client.on(Events.InteractionCreate, interaction => { ... });`.
* `guild` is a placeholder for the <DocsLink path="Guild:Class" /> object, such as `interaction.guild` or `client.guilds.cache.get('id')`.
* `voiceChannel` is a placeholder for the <DocsLink path="VoiceChannel:Class" /> object, such as `interaction.member.voice.channel`

For a more detailed explanation of the notations commonly used in this guide, the docs, and the support server, see [here](/additional-info/notation.md).

## Administrative

### How do I ban a user?

```js
const user = interaction.options.getUser('target');
guild.members.ban(user);
```

### How do I unban a user?

```js
const user = interaction.options.getUser('target');
guild.members.unban(user);
```

::: tip
Discord validates and resolves user ids for users not on the server in user slash command options. To retrieve and use the full structure from the resulting interaction, you can use the <DocsLink path="CommandInteractionOptionResolver:Class#getUser" type="method"/> method.
:::

### How do I kick a guild member?

```js
const member = interaction.options.getMember('target');
member.kick();
```

### How do I timeout a guild member?

```js
const member = interaction.options.getMember('target');
member.timeout(60_000); // Timeout for one minute
```

::: tip
Timeout durations are measured by the millisecond. The maximum timeout duration you can set is 28 days. To remove a timeout set on a member, pass `null` instead of a timeout duration.
:::

### How do I add a role to a guild member?

```js
const role = interaction.options.getRole('role');
const member = interaction.options.getMember('target');
member.roles.add(role);
```

### How do I check if a guild member has a specific role?

```js
const member = interaction.options.getMember('target');
if (member.roles.cache.some(role => role.name === 'role name')) {
	// ...
}
```

### How do I limit a command to a single user?

```js
if (interaction.user.id === 'id') {
	// ...
}
```

## Bot Configuration and Utility

### How do I set my bot's username?

```js
client.user.setUsername('username');
```

### How do I set my bot's avatar?

```js
client.user.setAvatar('URL or path');
```

### How do I set my playing status?

```js
client.user.setActivity('activity');
```

### How do I set my status to "Watching/Listening to/Competing in ..."?

```js
const { ActivityType } = require('discord.js');

client.user.setActivity('activity', { type: ActivityType.Watching });
client.user.setActivity('activity', { type: ActivityType.Listening });
client.user.setActivity('activity', { type: ActivityType.Competing });
```

::: tip
If you would like to set your activity upon startup, you can use the `ClientOptions` object to set the appropriate `Presence` data.
:::

### How do I make my bot display online/idle/dnd/invisible?

```js
const { PresenceUpdateStatus } = require('discord.js');

client.user.setStatus(PresenceUpdateStatus.Online);
client.user.setStatus(PresenceUpdateStatus.Idle);
client.user.setStatus(PresenceUpdateStatus.DoNotDisturb);
client.user.setStatus(PresenceUpdateStatus.Invisible);
```

### How do I set both status and activity in one go?

```js
const { PresenceUpdateStatus } = require('discord.js');

client.user.setPresence({ activities: [{ name: 'activity' }], status: PresenceUpdateStatus.Idle });
```

## Miscellaneous

### How do I send a message to a specific channel?

```js
const channel = client.channels.cache.get('id');
channel.send('content');
```

### How do I create a post in a forum channel?

::: tip
Currently, the only way to get tag ids is programmatically through <DocsLink path="ForumChannel:Class#availableTags" />.
:::

```js
const channel = client.channels.cache.get('id');
channel.threads.create({ name: 'Post name', message: { content: 'Message content' }, appliedTags: ['tagID', 'anotherTagID'] });
```

### How do I DM a specific user?

<!-- eslint-skip -->

```js
client.users.send('id', 'content');
```

::: tip
If you want to DM the user who sent the interaction, you can use `interaction.user.send()`.
:::

### How do I mention a specific user in a message?

<!-- eslint-skip -->

```js
const user = interaction.options.getUser('target');
await interaction.reply(`Hi, ${user}.`);
await interaction.followUp(`Hi, <@${user.id}>.`);
```

::: tip
Mentions in embeds may resolve correctly in embed titles, descriptions and field values but will never notify the user. Other areas do not support mentions at all.
:::

### How do I control which users and/or roles are mentioned in a message?

Controlling which mentions will send a ping is done via the `allowedMentions` option, which replaces `disableMentions`.

This can be set as a default in `ClientOptions`, and controlled per-message sent by your bot.
```js
new Client({ allowedMentions: { parse: ['users', 'roles'] } });
```

Even more control can be achieved by listing specific `users` or `roles` to be mentioned by ID, e.g.:
```js
channel.send({
	content: '<@123456789012345678> <@987654321098765432> <@&102938475665748392>',
	allowedMentions: { users: ['123456789012345678'], roles: ['102938475665748392'] },
});
```

### How do I prompt the user for additional input?

```js
interaction.reply('Please enter more input.').then(() => {
	const collectorFilter = m => interaction.user.id === m.author.id;

	interaction.channel.awaitMessages({ filter: collectorFilter, time: 60_000, max: 1, errors: ['time'] })
		.then(messages => {
			interaction.followUp(`You've entered: ${messages.first().content}`);
		})
		.catch(() => {
			interaction.followUp('You did not enter any input!');
		});
});
```

::: tip
If you want to learn more about this syntax or other types of collectors, check out [this dedicated guide page for collectors](/popular-topics/collectors.md)!
:::

### How do I block a user from using my bot?

<!-- eslint-disable no-useless-return -->

```js
const blockedUsers = ['id1', 'id2'];
client.on(Events.InteractionCreate, interaction => {
	if (blockedUsers.includes(interaction.user.id)) return;
});
```

::: tip
You do not need to have a constant local variable like `blockedUsers` above. If you have a database system that you use to store IDs of blocked users, you can query the database instead:

<!-- eslint-disable no-useless-return -->

```js
client.on(Events.InteractionCreate, async interaction => {
	const blockedUsers = await database.query('SELECT user_id FROM blocked_users;');
	if (blockedUsers.includes(interaction.user.id)) return;
});
```

Note that this is just a showcase of how you could do such a check.
:::

### How do I react to the message my bot sent?

```js
interaction.channel.send('My message to react to.').then(sentMessage => {
	// Unicode emoji
	sentMessage.react('👍');

	// Custom emoji
	sentMessage.react('123456789012345678');
	sentMessage.react('<emoji:123456789012345678>');
	sentMessage.react('<a:emoji:123456789012345678>');
	sentMessage.react('emoji:123456789012345678');
	sentMessage.react('a:emoji:123456789012345678');
});
```

::: tip
If you want to learn more about reactions, check out [this dedicated guide on reactions](/popular-topics/reactions.md)!
:::

### How do I restart my bot with a command?

```js
process.exit();
```

::: danger
`process.exit()` will only kill your Node process, but when using [PM2](http://pm2.keymetrics.io/), it will restart the process whenever it gets killed. You can read our guide on PM2 [here](/improving-dev-environment/pm2.md).
:::

### What is the difference between a User and a GuildMember?

A User represents a global Discord user, and a GuildMember represents a Discord user on a specific server. That means only GuildMembers can have permissions, roles, and nicknames, for example, because all of these things are server-bound information that could be different on each server that the user is in.

### How do I find all online members of a guild?

```js
// First use guild.members.fetch to make sure all members are cached
guild.members.fetch({ withPresences: true }).then(fetchedMembers => {
	const totalOnline = fetchedMembers.filter(member => member.presence?.status === PresenceUpdateStatus.Online);
	// Now you have a collection with all online member objects in the totalOnline variable
	console.log(`There are currently ${totalOnline.size} members online in this guild!`);
});
```

::: warning
This only works correctly if you have the `GuildPresences` intent enabled for your application and client.
If you want to learn more about intents, check out [this dedicated guide on intents](/popular-topics/intents.md)!
:::

### How do I check which role was added/removed and for which member?

```js
// Start by declaring a guildMemberUpdate listener
// This code should be placed outside of any other listener callbacks to prevent listener nesting
client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
	// If the role(s) are present on the old member object but no longer on the new one (i.e role(s) were removed)
	const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
	if (removedRoles.size > 0) {
		console.log(`The roles ${removedRoles.map(r => r.name)} were removed from ${oldMember.displayName}.`);
	}

	// If the role(s) are present on the new member object but are not on the old one (i.e role(s) were added)
	const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
	if (addedRoles.size > 0) {
		console.log(`The roles ${addedRoles.map(r => r.name)} were added to ${oldMember.displayName}.`);
	}
});
```

### How do I check the bot's ping?

There are two common measurements for bot pings. The first, **websocket heartbeat**, is the average interval of a regularly sent signal indicating the healthy operation of the websocket connection the library receives events over:

```js
interaction.reply(`Websocket heartbeat: ${client.ws.ping}ms.`);
```

::: tip
If you're using [sharding](/sharding/), a specific shard's heartbeat can be found on the WebSocketShard instance, accessible at `client.ws.shards.get(id).ping`.
:::

The second, **Roundtrip Latency**, describes the amount of time a full API roundtrip (from the creation of the command message to the creation of the response message) takes. You then edit the response to the respective value to avoid needing to send yet another message:

```js
const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
interaction.editReply(`Roundtrip latency: ${sent.createdTimestamp - interaction.createdTimestamp}ms`);
```

### Why do some emojis behave weirdly?

If you've tried using [the usual method of retrieving unicode emojis](/popular-topics/reactions.md#unicode-emojis), you may have noticed that some characters don't provide the expected results. Here's a short snippet that'll help with that issue. You can toss this into a file of its own and use it anywhere you need! Alternatively feel free to simply copy-paste the characters from below:

```js
// emojiCharacters.js
module.exports = {
	a: '🇦', b: '🇧', c: '🇨', d: '🇩',
	e: '🇪', f: '🇫', g: '🇬', h: '🇭',
	i: '🇮', j: '🇯', k: '🇰', l: '🇱',
	m: '🇲', n: '🇳', o: '🇴', p: '🇵',
	q: '🇶', r: '🇷', s: '🇸', t: '🇹',
	u: '🇺', v: '🇻', w: '🇼', x: '🇽',
	y: '🇾', z: '🇿', 0: '0️⃣', 1: '1️⃣',
	2: '2️⃣', 3: '3️⃣', 4: '4️⃣', 5: '5️⃣',
	6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣',
	10: '🔟', '#': '#️⃣', '*': '*️⃣',
	'!': '❗', '?': '❓',
};
```

```js
// index.js
const emojiCharacters = require('./emojiCharacters.js');

console.log(emojiCharacters.a); // 🇦
console.log(emojiCharacters[10]); // 🔟
console.log(emojiCharacters['!']); // ❗
```

::: tip
On Windows, you may be able to use the `Win + .` keyboard shortcut to open up an emoji picker that can be used for quick, easy access to all the Unicode emojis available to you. Some of the emojis listed above may not be represented there, though (e.g., the 0-9 emojis).

You can also use the `Control + Command + Space` keyboard shortcut to perform the same behavior on macOS.
:::

```

# guide\popular-topics\formatters.md

```md
# Formatters

discord.js provides the <DocsLink section="formatters" /> package which contains a variety of utilities you can use when writing your Discord bot.

## Basic Markdown

These functions format strings into all the different Markdown styles supported by Discord.

```js
const { blockQuote, bold, italic, quote, spoiler, strikethrough, underline } = require('discord.js');
const string = 'Hello!';

const boldString = bold(string);
const italicString = italic(string);
const strikethroughString = strikethrough(string);
const underlineString = underline(string);
const spoilerString = spoiler(string);
const quoteString = quote(string);
const blockquoteString = blockQuote(string);
```

## Links

There are also two functions to format hyperlinks. `hyperlink()` will format the URL into a masked markdown link, and `hideLinkEmbed()` will wrap the URL in `<>`, preventing it from embedding.

```js
const { hyperlink, hideLinkEmbed } = require('discord.js');
const url = 'https://discord.js.org/';

const link = hyperlink('discord.js', url);
const hiddenEmbed = hideLinkEmbed(url);
```

## Code blocks

You can use `inlineCode()` and `codeBlock()` to turn a string into an inline code block or a regular code block with or without syntax highlighting.

```js
const { inlineCode, codeBlock } = require('discord.js');
const jsString = 'const value = true;';

const inline = inlineCode(jsString);
const codeblock = codeBlock(jsString);
const highlighted = codeBlock('js', jsString);
```

## Timestamps

With `time()`, you can format Unix timestamps and dates into a Discord time string.

```js
const { time, TimestampStyles } = require('discord.js');
const date = new Date();

const timeString = time(date);
const relative = time(date, TimestampStyles.RelativeTime);
```

## Mentions

`userMention()`, `channelMention()`, and `roleMention()` all exist to format Snowflakes into mentions.

```js
const { channelMention, roleMention, userMention } = require('discord.js');
const id = '123456789012345678';

const channel = channelMention(id);
const role = roleMention(id);
const user = userMention(id);
```

```

# guide\popular-topics\intents.md

```md
# Gateway Intents

Gateway Intents were introduced by Discord so bot developers can choose which events their bot receives based on which data it needs to function. Intents are named groups of pre-defined WebSocket events, which the discord.js client will receive. If you omit `DirectMessageTyping`, for example, you will no longer receive typing events from direct messages. If you do not specify intents, discord.js will throw an error.

Rather than blindly enabling all intents, consider what information you actually need. Reducing the number of unnecessary events your bot receives improves performance and reduces bandwidth and memory usage.

## Privileged Intents

Discord defines some intents as "privileged" due to the data's sensitive nature. At the time of writing this article, privileged intents are `GuildPresences`, `MessageContent` and `GuildMembers`. If your bot is not verified and in less than 100 guilds, you can enable privileged gateway intents in the [Discord Developer Portal](https://discord.com/developers/applications) under "Privileged Gateway Intents" in the "Bot" section. If your bot is already verified or is about to [require verification](https://support.discord.com/hc/articles/360040720412), you need to request privileged intents. You can do this in your verification application or by reaching out to Discord's [support team](https://dis.gd/contact), including why you require access to each privileged intent.

Before storming off and doing so, you should stop and carefully think about if you need these events. Discord made them opt-in so users across the platform can enjoy a higher level of [privacy](https://en.wikipedia.org/wiki/Privacy_by_design). Presences can expose quite a bit of personal information, including the games being played and overall online time. You might find that it isn't necessary for your bot to have this level of information about all guild members at all times, considering you still get the command author as GuildMember from the command execution message and can fetch other targets separately.

### Error: Disallowed Intents

Should you receive an error prefixed with `[DisallowedIntents]`, please review your developer dashboard settings for all privileged intents you use. Check on the [Discord API documentation](https://discord.com/developers/docs/topics/gateway#privileged-intents) for up to date information.

## Enabling Intents

To specify which events you want your bot to receive, first think about which events your bot needs to operate. Then select the required intents and add them to your client constructor, as shown below.

You can find the list of all current gateway intents and the events belonging to each on the [Discord API documentation](https://discord.com/developers/docs/topics/gateway#list-of-intents) and the enum values used in discord.js on the [Discord API types documentation](https://discord-api-types.dev/api/discord-api-types-v10/enum/GatewayIntentBits).

- If you need your bot to receive messages (`MESSAGE_CREATE` - `"messageCreate"` in discord.js), you need the `Guilds` and `GuildMessages` intent, plus the `MessageContent` privileged intent to receive the `content`, `attachments`, `embeds` and `components` fields of the message.
- If you want your bot to post welcome messages for new members (`GUILD_MEMBER_ADD` - `"guildMemberAdd"` in discord.js), you need the `GuildMembers` privileged intent, and so on.

```js
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
	],
});
```

::: warning
Note that discord.js relies heavily on caching to provide its functionality - this means an internal reliance on certain events to ensure the caches are populated and up to date.
:::

Some methods that seem unrelated might stop working if certain events do not arrive. For example:
 - The `Guilds` intent populates and maintains the `guilds`, `channels` and `guild.roles` caches, plus thread-related events. \
 If this intent is not enabled, data for interactions and messages will include only the guild and channel id, and will not resolve to the full class.
 - The `GuildMembers` intent keeps cached guild members up to date, including changes to their roles and permissions, nickname etc. \
 Note that you still receive full member data with interactions and messages without this intent enabled.

Please make sure to provide the list of gateway intents and partials you use in your Client constructor when asking for support on our [Discord server](https://discord.gg/djs) or [GitHub repository](https://github.com/discordjs/discord.js).

## The Intents Bitfield

discord.js provides the utility structure <docs-link path="class/IntentsBitField">`IntentsBitField`</docs-link> to simplify the modification of intents bitfields.

You can use the `.add()` and `.remove()` methods to add or remove flags (Intents string literals representing a certain bit) and modify the bitfield. You can provide single flags as well as an array or bitfield. To use a set of intents as a template you can pass it to the constructor. Note that the empty constructor `new IntentsBitField()` creates an empty Intents instance, representing no intents or the bitfield `0`:

```js
const { Client, IntentsBitField } = require('discord.js');

const myIntents = new IntentsBitField();
myIntents.add(IntentsBitField.Flags.GuildPresences, IntentsBitField.Flags.GuildMembers);

const client = new Client({ intents: myIntents });

// other examples:
const otherIntents = new IntentsBitField([IntentsBitField.Flags.Guilds, IntentsBitField.Flags.DirectMessages]);
otherIntents.remove([IntentsBitField.Flags.DirectMessages]);
```

If you want to view the built flags you can utilize the `.toArray()`, `.serialize()` methods. The first returns an array of flags represented in this bitfield, the second an object mapping all possible flag values to a boolean, based on their representation in this bitfield.

## More on Bitfields

Discord Intents and Permissions are stored in a 53-bit integer and calculated using bitwise operations. If you want to dive deeper into what's happening behind the curtains, check the [Wikipedia](https://en.wikipedia.org/wiki/Bit_field) and [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators) articles on the topic.

In discord.js, Permissions and Intents bitfields are represented as either the decimal value of said bit field or its referenced flags. Every position in a permissions bitfield represents one of these flags and its state (either referenced `1` or not referenced `0`).

```

# guide\popular-topics\partials.md

```md
# Partial Structures

Partial Structures were introduced to the library in version 12 and are optionally received whenever there is insufficient data to emit the client event with a fully intact discord.js structure. They are (as the name suggests) incomplete, and you cannot expect them to have any information besides their ID. All other properties and methods on this object should be considered invalid and defunct. Before this feature, discord.js client events would not emit if one of the necessary structures could not be built with sufficient data to guarantee a fully functional structure. If you do not opt into partials, this is still the case.

One example leveraging partials is the handling of reactions on uncached messages, which is explained on [this page](/popular-topics/reactions.md#listening-for-reactions-on-old-messages).

Prior you had to either handle the undocumented `raw` event or fetch the respective messages on startup. The first approach was prone to errors and unexpected internal behavior. The second was not fully fail-proof either, as the messages could still be uncached if cache size was exceeded in busy channels.

## Enabling Partials

As we said earlier, partials do not have all the information necessary to make them fully functional discord.js structures, so it would not be a good idea to enable the functionality by default. Users should know how to handle them before opting into this feature.

You choose which structures you want to emit as partials as client options when instantiating your bot client. Available structures are: `User`, `Channel` (only DM channels can be uncached, server channels will always be available), `GuildMember`, `Message`, `Reaction`, `GuildScheduledEvent` and `ThreadMember`.

```js
const { Client, Partials } = require('discord.js');

const client = new Client({ partials: [Partials.Message, Partials.Channel, Partials.Reaction] });
```

::: warning
Make sure you enable all partials you need for your use case! If you miss one, the event does not get emitted.
:::

::: warning
Partial structures are enabled globally. You cannot make them work for only a specific event or cache, and you very likely need to adapt other parts of your code that are accessing data from the relevant caches. All caches holding the respective structure type might return partials as well!
:::

## Handling Partial data

All structures you can choose to use partials for have a new property, fittingly called `.partial`, indicating if it is a fully functional or partial instance of its class. The value is `true` if partial, `false` if fully functional.

::: warning
Partial data is only ever guaranteed to contain an ID! Do not assume any property or method to work when dealing with a partial structure!
:::

```js
if (message.partial) {
	console.log('The message is partial.');
} else {
	console.log('The message is not partial.');
}
```

## Obtaining the full structure

Along with `.partial` to check if the structure you call it on is partial or not, the library also introduced a `.fetch()` method to retrieve the missing data from the API and complete the structure. The method returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) you need to handle. After the Promise resolves (and with it, the missing data arrived), you can use the structure as you would before.

```js {2-8,10}
if (message.partial) {
	message.fetch()
		.then(fullMessage => {
			console.log(fullMessage.content);
		})
		.catch(error => {
			console.log('Something went wrong when fetching the message: ', error);
		});
} else {
	console.log(message.content);
}
```

::: warning
You cannot fetch deleted data from the API. For message deletions, `messageDelete` will only emit with the ID, which you cannot use to fetch the complete message containing content, author, or other information, as it is already inaccessible by the time you receive the event.
:::

```

# guide\popular-topics\permissions-extended.md

```md
# Permissions (extended)

## Discord's permission system

Discord permissions are stored in a 53-bit integer and calculated using bitwise operations. If you want to dive deeper into what's happening behind the curtains, check the [Wikipedia](https://en.wikipedia.org/wiki/Bit_field) and [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators) articles on the topic.

In discord.js, permission bit fields are represented as either the decimal value of said bit field or its referenced flags.
Every position in a permissions bit field represents one of these flags and its state (either referenced `1` or not referenced `0`).

Before we get into actually assigning permissions, let's quickly go over the method Discord uses to determine a guild member's final permissions:

1. Take all permissions for all roles the guild member has and add them up.
2. Apply all denies for the default role (`@everyone`).
3. Apply all allows for the default role (`@everyone`).
4. Apply all denies for all additional roles the guild member has at once.
5. Apply all allows for all additional roles the guild member has at once.
6. Apply all denies for the specific guild member if they exist.
7. Apply all allows for the specific guild member if they exist.

Due to this system, you cannot deny base permissions. If you grant `SendMessages` to `@everyone` and don't grant it for a muted members role, muted members will still be able to send messages unless you specify channel-based overwrites.

All additional roles allow overwrites are applied after all additional roles denies! If any of a member's roles have an overwrite to allow a permission explicitly, the member can execute the associated actions in this channel regardless of the role hierarchy. 

Placing an overwrite to allow `SendMessages` on a role will result in members with this role not being mutable via role assignment in this channel.

## Elevated permissions

If the guild owner enables the server's two-factor authentication option, everyone executing a specific subset of actions will need to have 2FA enabled on their account. As bots do not have 2FA themselves, you, as the application owner, will need to enable it on your account for your bot to work on those servers.
Check out [Discord's help article](https://support.discord.com/hc/articles/219576828) if you need assistance with this.

The permissions assigned to these actions are called "elevated permissions" and are: 
`KickMembers`, `BanMembers`, `Administrator`, `ManageChannels`, `ManageGuild`, `ManageMessages`, `ManageRoles`, `ManageWebhooks`, `ManageThreads`, and `ManageGuildExpressions`.

## Implicit permissions

Some Discord permissions apply implicitly based on logical use, which can cause unwanted behavior if you are not aware of this fact.

The prime example for implicit permissions is `ViewChannel`. If this flag is missing in the final permissions, you can't do anything on that channel. It makes sense, right? If you can't view the channel, you can't read or send messages in it, set the topic, or change its name.
The library does not handle implicit permissions for you, so understanding how the system works is vital for you as a bot developer.

Let's say you want to send a message to a channel. To prevent unnecessary API calls, you want to make sure your bot's permissions in this channel include `SendMessages` (more on how to achieve this [here](/popular-topics/permissions.md#checking-for-permissions)). The check passes, but you still can't send the message and are greeted with `DiscordAPIError: Missing Access`.

This error means your bot is missing `ViewChannel`, and as such, can't send messages either.

One possible scenario causing this: the channel has permission overwrites for the default role `@everyone` to grant `SendMessages` so everyone who can see the channel can also write in it, but at the same time has an overwrite to deny `ViewChannel` to make it only accessible to a subset of members.

As you only check for `SendMessages`, the bot will try to execute the send, but since `ViewChannel` is missing, the API denies the request.

::: tip
Causes for "Missing Access":
- Text Channels require `ViewChannel` as detailed above.
- Voice Channels require `Connect` in the same way.
- Reacting to a message requires `ReadMessageHistory` in the channel the message was sent.
- When deploying slash commands: Enable the `applications.commands` scope (for more information see the [adding your bot](/preparations/adding-your-bot-to-servers) section).
- Timing out a member requires `ModerateMembers`.
- Editing threads (tags, locking, closing, etc.) requires `SendMessagesInThreads`.
:::

## Limitations and oddities

- Your bot needs `ManageRoles` in its base permissions to change base permissions.
- It needs `ManageRoles` in its final permissions to change permission overwrites.
- It cannot edit permissions for roles that are higher than or equal to its highest role.
- It cannot grant permissions it doesn't have.
- It can manage overwrites for roles or users with higher roles than its own highest role.
- It can manage overwrites for permissions it doesn't have.
- Members with the `Administrator` permission are not affected by overwrites at all.

## Missing permissions

During your development, you will likely run into `DiscordAPIError: Missing Permissions` at some point. One of the following can cause this error:

- Your bot is missing the needed permission to execute this action in its calculated base or final permissions (requirement changes based on the type of action you are trying to perform).
- You provided an invalid permission number while trying to create overwrites. (The calculator on the apps page returns decimal values while the developer documentation lists the flags in hex. Make sure you are not mixing the two and don't use the hex prefix `0x` where not applicable).
- Your bot is currently timed out.
- It is trying to execute an action on a guild member with a role higher than or equal to your bot's highest role.
- It is trying to modify or assign a role higher than or equal to its highest role.
- It is trying to add a managed role to a member.
- It is trying to remove a managed role from a member.
- It is trying to timeout a member with the `Administrator` permission.
- It is trying to execute a forbidden action on the server owner.
- It is trying to execute an action based on another unfulfilled factor (for example, reserved for partnered guilds).
- It is trying to execute an action on a voice channel without the `ViewChannel` permission.
- It is trying to create a channel or channel overwrite including the `ManageRoles` flag but does not have the `Administrator` permission or an explicit `ManageRoles` overwrite on this channel (note that the global permission does not count).

::: warning
Granting the `Administrator` permission does not skip any hierarchical check!
:::

```

# guide\popular-topics\permissions.md

```md
# Permissions

Permissions are Discord's primary feature, enabling users to customize their server's workings to their liking.
Essentially, Permissions and permission overwrites tell Discord who is allowed to do what and where.
Permissions can be very confusing at first, but this guide is here to explain and clarify them, so let's dive in!

## Roles as bot permissions

If you want to keep your bot's permission checks simple, you might find it sufficient to check if the member executing the command has a specific role.

If you have the role ID, you can check if the `.roles` Collection on a GuildMember object includes it, using `.has()`. Should you not know the ID and want to check for something like a "Mod" role, you can use `.some()`.

```js
member.roles.cache.has('role-id-here');
// returns true if the member has the role

member.roles.cache.some(role => role.name === 'Mod');
// returns true if any of the member's roles is exactly named "Mod"
```

If you want to enhance this system slightly, you can include the guild owner by comparing the executing member's ID with `interaction.guild.ownerId`.

To include permission checks like `Administrator` or `ManageGuild`, keep reading as we will cover Discord Permissions and all their intricacies in the following sections.

## Terminology

* Permission: The ability to execute a certain action in Discord
* Overwrite: Rule on a channel to modify the permissions for a member or role
* BitField: Binary representation of Discord permissions 
* Base Permissions: Permissions for roles the member has, set on the guild level
* Final Permissions: Permissions for a member or role, after all overwrites are applied
* Flag: Human readable string in PascalCase (e.g., `KickMembers`) that refers to a position in the permission BitField. You can find a list of all valid flags on the <DocsLink path="PermissionsBitField:Class#Flags"/> page

::: tip
You can provide permission decimals wherever we use flag literals in this guide. If you are interested in a handy permission calculator, you can look at the "Bot" section in the [Discord developer portal](https://discord.com/developers/applications).
:::

## Base permissions

### Setting role permissions

Base permissions are set on roles, not the guild member itself. To change them, you access a Role object (for example via `member.roles.cache.first()` or `guild.roles.cache.random()`) and use the `.setPermissions()` method. This is how you'd change the base permissions for the `@everyone` role, for example:

```js
const { PermissionsBitField } = require('discord.js');

guild.roles.everyone.setPermissions([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]);
```

Any permission not referenced in the flag array or bit field is not granted to the role. 

::: tip
Note that flag names are literal. Although `ViewChannel` grants access to view multiple channels, the permission flag is still called `ViewChannel` in singular form.
:::

### Creating a role with permissions

Alternatively you can provide permissions as a property of <DocsLink path="RoleCreateOptions:Interface" /> during role creation as an array of flag strings or a permission number:

```js
const { PermissionsBitField } = require('discord.js');

guild.roles.create({ name: 'Mod', permissions: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.KickMembers] });
```

### Checking member permissions

To know if one of a member's roles has a permission enabled, you can use the `.has()` method on <DocsLink path="GuildMember:Class#permissions" /> and provide a permission flag, array, or number to check for. You can also specify if you want to allow the `Administrator` permission or the guild owner status to override this check with the following parameters.

```js
const { PermissionsBitField } = require('discord.js');

if (member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
	console.log('This member can kick');
}

if (member.permissions.has([PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers])) {
	console.log('This member can kick and ban');
}

if (member.permissions.has(PermissionsBitField.Flags.KickMembers, false)) {
	console.log('This member can kick without allowing admin to override');
}
```

If you provide multiple permissions to the method, it will only return `true` if all permissions you specified are granted.

::: tip
You can learn more about the `.has()` method [here](#checking-for-permissions).
:::

## Channel overwrites

Permission overwrites control members' abilities for this specific channel or a set of channels if applied to a category with synchronized child channels.

As you have likely already seen in your desktop client, channel overwrites have three states: 

- Explicit allow (`true`, green ✓)
- Explicit deny (`false`, red X) 
- Default (`null`, gray /)

### Adding overwrites

To add a permission overwrite for a role or guild member, you access the channel's <DocsLink path="TextChannel:Class#permissionOverwrites">`PermissionOverwriteManager`</DocsLink> and use the `.create()` method. The first parameter is the target of the overwrite, either a Role or User object (or its respective resolvable), and the second is a <DocsLink path="PermissionOverwriteOptions:TypeAlias" /> object.

Let's add an overwrite to lock everyone out of the channel. The guild ID doubles as the role id for the default role `@everyone` as demonstrated below:

```js
channel.permissionOverwrites.create(channel.guild.roles.everyone, { ViewChannel: false });
```

Any permission flags not specified get neither an explicit allow nor deny overwrite and will use the base permission unless another role has an explicit overwrite set.

You can also provide an array of overwrites during channel creation, as shown below:

```js
const { ChannelType, PermissionsBitField } = require('discord.js');

guild.channels.create({
	name: 'new-channel',
	type: ChannelType.GuildText,
	permissionOverwrites: [
		{
			id: interaction.guild.id,
			deny: [PermissionsBitField.Flags.ViewChannel],
		},
		{
			id: interaction.user.id,
			allow: [PermissionsBitField.Flags.ViewChannel],
		},
	],
});
```

### Editing overwrites

To edit permission overwrites on the channel with a provided set of new overwrites, you can use the `.edit()` method.

```js
// edits overwrites to disallow everyone to view the channel
channel.permissionOverwrites.edit(guild.id, { ViewChannel: false });

// edits overwrites to allow a user to view the channel
channel.permissionOverwrites.edit(user.id, { ViewChannel: true });
```

### Replacing overwrites

To replace all permission overwrites on the channel with a provided set of new overwrites, you can use the `.set()` method. This is extremely handy if you want to copy a channel's full set of overwrites to another one, as this method also allows passing an array or Collection of <DocsLink path="PermissionOverwrites:Class" />.

```js
// copying overwrites from another channel
channel.permissionOverwrites.set(otherChannel.permissionOverwrites.cache);

// replacing overwrites with PermissionOverwriteOptions
channel.permissionOverwrites.set([
	{
		id: guild.id,
		deny: [PermissionsBitField.Flags.ViewChannel],
	},
	{
		id: user.id,
		allow: [PermissionsBitField.Flags.ViewChannel],
	},
]);
```

### Removing overwrites

To remove the overwrite for a specific member or role, you can use the `.delete()` method.

```js
// deleting the channel's overwrite for the user who interacted
channel.permissionOverwrites.delete(interaction.user.id);
```

### Syncing with a category

If the permission overwrites on a channel under a category match with the parent (category), it is considered synchronized. This means that any changes in the categories overwrites will now also change the channels overwrites. Changing the child channels overwrites will not affect the parent. 

To easily synchronize permissions with the parent channel, you can call the `.lockPermissions()` method on the respective child channel.  

```js
if (!channel.parent) {
	return console.log('This channel is not listed under a category');
}

channel.lockPermissions()
	.then(() => console.log('Successfully synchronized permissions with parent channel'))
	.catch(console.error);
```

### Permissions after overwrites

There are two utility methods to easily determine the final permissions for a guild member or role in a specific channel: <DocsLink path="GuildChannel:Class#permissionsFor" type="method" /> and <DocsLink path="GuildMember:Class#permissionsIn" type="method" /> - <DocsLink path="Role:Class#permissionsIn" type="method" />. All return a <DocsLink path="PermissionsBitField:Class" /> object.

To check your bot's permissions in the channel the command was used in, you could use something like this:

```js
// final permissions for a guild member using permissionsFor
const botPermissionsFor = channel.permissionsFor(guild.members.me);

// final permissions for a guild member using permissionsIn
const botPermissionsIn = guild.members.me.permissionsIn(channel);

// final permissions for a role
const rolePermissions = channel.permissionsFor(role);
```

::: warning
The `.permissionsFor()` and `.permissionsIn()` methods return a Permissions object with all permissions set if the member or role has the global `Administrator` permission and does not take overwrites into consideration in this case. Using the second parameter of the `.has()` method as described further down in the guide will not allow you to check without taking `Administrator` into account here!
:::

If you want to know how to work with the returned Permissions objects, keep reading as this will be our next topic.

## The Permissions object

The <DocsLink path="PermissionsBitField:Class" /> object is a discord.js class containing a permissions bit field and a bunch of utility methods to manipulate it easily.
Remember that using these methods will not manipulate permissions, but rather create a new instance representing the changed bit field.

### Displaying permission flags

discord.js provides a `toArray()` method, which can be used to convert a `Permissions` object into an array containing permission flags. This is useful if you want to display/list them and it enables you to use other array manipulation methods. For example:

```js
const memberPermissions = member.permissions.toArray();
const rolePermissions = role.permissions.toArray();
// output: ['SendMessages', 'AddReactions', 'ChangeNickname', ...]
```

::: tip 
The return value of `toArray()` always represents the permission flags present in the Permissions instance that the method was called on. This means that if you call the method on, for example: `PermissionOverwrites#deny`, you will receive an array of all denied permissions in that overwrite.
:::

Additionally, you can serialize the Permissions object's underlying bit field by calling `.serialize()`. This returns an object that maps permission names to a boolean value, indicating whether the relevant "bit" is available in the Permissions instance.

```js
const memberPermissions = member.permissions.serialize();
const rolePermissions = role.permissions.serialize();
/* output: {
SendMessages: true,
AddReactions: true,
BanMembers: false,
...
}
*/
```

### Converting permission numbers

Some methods and properties in discord.js return permission decimals rather than a Permissions object, making it hard to manipulate or read them if you don't want to use bitwise operations.
However, you can pass these decimals to the Permissions constructor to convert them, as shown below.

```js
const { PermissionsBitField } = require('discord.js');

const permissions = new PermissionsBitField(268_550_160n);
```

You can also use this approach for other <DocsLink path="PermissionResolvable:TypeAlias" />s like flag arrays or flags.

```js
const { PermissionsBitField } = require('discord.js');

const flags = [
	PermissionsBitField.Flags.ViewChannel,
	PermissionsBitField.Flags.EmbedLinks,
	PermissionsBitField.Flags.AttachFiles,
	PermissionsBitField.Flags.ReadMessageHistory,
	PermissionsBitField.Flags.ManageRoles,
];

const permissions = new PermissionsBitField(flags);
```

### Checking for permissions

The Permissions object features the `.has()` method, allowing an easy way to check flags in a Permissions bit field.
The `.has()` method takes two parameters: the first being either a permission number, single flag, or an array of permission numbers and flags, the second being a boolean, indicating if you want to allow the `Administrator` permission to override (defaults to `true`).

Let's say you want to know if the decimal bit field representation `268_550_160` has `ManageChannels` referenced:

```js
const { PermissionsBitField } = require('discord.js');

const bitPermissions = new PermissionsBitField(268_550_160n);

console.log(bitPermissions.has(PermissionsBitField.Flags.ManageChannels));
// output: true

console.log(bitPermissions.has([PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.EmbedLinks]));
// output: true

console.log(bitPermissions.has([PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.KickMembers]));
// output: false

const flagsPermissions = new PermissionsBitField([
	PermissionsBitField.Flags.ManageChannels,
	PermissionsBitField.Flags.EmbedLinks,
	PermissionsBitField.Flags.AttachFiles,
	PermissionsBitField.Flags.ReadMessageHistory,
	PermissionsBitField.Flags.ManageRoles,
]);

console.log(flagsPermissions.has(PermissionsBitField.Flags.ManageChannels));
// output: true

console.log(flagsPermissions.has([PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.EmbedLinks]));
// output: true

console.log(flagsPermissions.has([PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.KickMembers]));
// output: false

const adminPermissions = new PermissionsBitField(PermissionsBitField.Flags.Administrator);

console.log(adminPermissions.has(PermissionsBitField.Flags.ManageChannels));
// output: true

console.log(adminPermissions.has(PermissionsBitField.Flags.ManageChannels, true));
// output: true

console.log(adminPermissions.has(PermissionsBitField.Flags.ManageChannels, false));
// output: false
```

### Manipulating permissions

The Permissions object enables you to easily add or remove individual permissions from an existing bit field without worrying about bitwise operations. Both `.add()` and `.remove()` can take a single permission flag or number, an array of permission flags or numbers, or multiple permission flags or numbers as multiple parameters.

```js
const { PermissionsBitField } = require('discord.js');

const permissions = new PermissionsBitField([
	PermissionsBitField.Flags.ViewChannel,
	PermissionsBitField.Flags.EmbedLinks,
	PermissionsBitField.Flags.AttachFiles,
	PermissionsBitField.Flags.ReadMessageHistory,
	PermissionsBitField.Flags.ManageRoles,
]);

console.log(permissions.has(PermissionsBitField.Flags.KickMembers));
// output: false

permissions.add(PermissionsBitField.Flags.KickMembers);
console.log(permissions.has(PermissionsBitField.Flags.KickMembers));
// output: true

permissions.remove(PermissionsBitField.Flags.KickMembers);
console.log(permissions.has(PermissionsBitField.Flags.KickMembers));
// output: false
```

You can utilize these methods to adapt permissions or overwrites without touching the other flags. To achieve this, you can get the existing permissions for a role, manipulating the bit field as described above and passing the changed bit field to `role.setPermissions()`.

## Resulting code

<ResultingCode />

```

# guide\popular-topics\reactions.md

```md
<style scoped>
.emoji-container {
	display: inline-block;
}

.emoji-container .emoji-image {
	width: 1.375rem;
	height: 1.375rem;
	vertical-align: bottom;
}
</style>

# Reactions

## Reacting to messages

One of the first things many people want to know is how to react with emojis, both custom and "regular" (Unicode). There are different routes you need to take for each of those, so let's look at both.

Here's the base code we'll be using:

```js
const { Client, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
});

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, interaction => {
	// ...
});

client.login('your-token-goes-here');
```

### Unicode emojis

To react with a Unicode emoji, you will need the actual Unicode character of the emoji. There are many ways to get a Unicode character of an emoji, but the easiest way would be through Discord itself. If you send a message with a Unicode emoji (such as `:smile:`, for example) and put a `\` before it, it will "escape" the emoji and display the Unicode character instead of the standard emoji image.

<DiscordMessages>
	<DiscordMessage profile="user">
		Unicode emoji:
		<span class="emoji-container">
			<img class="emoji-image" title="smile" alt=":smile:" src="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f604.png" />
		</span>
		<br />
		Escaped version (<DiscordMarkdown>`\:smile:`</DiscordMarkdown>): 😄
	</DiscordMessage>
</DiscordMessages>

To react with an emoji, you need to use the `message.react()` method. Once you have the emoji character, all you need to do is copy & paste it as a string inside the `.react()` method!

```js {6-9}
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'react') {
		const message = await interaction.reply({ content: 'You can react with Unicode emojis!', fetchReply: true });
		message.react('😄');
	}
});
```

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction
				profile="user"
				:command="true"
			>react</DiscordInteraction>
		</template>
		You can react with Unicode emojis!
		<template #reactions>
			<DiscordReactions>
				<DiscordReaction name="smile" alt=":smile:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f604.png" />
			</DiscordReactions>
		</template>
	</DiscordMessage>
</DiscordMessages>

### Custom emojis

For custom emojis, there are multiple ways of reacting. Like Unicode emojis, you can also escape custom emojis. However, when you escape a custom emoji, the result will be different.

<DiscordMessages>
	<DiscordMessage profile="user">
		Custom emoji:
		<span class="emoji-container">
			<img class="emoji-image" title="blobreach" alt=":blobreach:" src="https://imgur.com/3Oar9gP.png" />
		</span>
		<br />
		Escaped version (<DiscordMarkdown>`\:blobreach:`</DiscordMarkdown>): &lt;:blobreach:123456789012345678&gt;
	</DiscordMessage>
</DiscordMessages>

This format is essentially the name of the emoji, followed by its ID. Copy & paste the ID into the `.react()` method as a string.

```js {6-9}
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'react-custom') {
		const message = await interaction.reply({ content: 'You can react with custom emojis!', fetchReply: true });
		message.react('123456789012345678');
	}
});
```

::: tip
You can also pass different formats of the emoji to the `.react()` method.

```js
message.react('<:blobreach:123456789012345678>');
message.react('blobreach:123456789012345678');
message.react('<a:blobreach:123456789012345678>');
message.react('a:blobreach:123456789012345678');
```
:::

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction
				profile="user"
				:command="true"
			>react-custom</DiscordInteraction>
		</template>
		You can react with custom emojis!
		<template #reactions>
			<DiscordReactions>
				<DiscordReaction name="blobreach" image="https://imgur.com/3Oar9gP.png" />
			</DiscordReactions>
		</template>
	</DiscordMessage>
</DiscordMessages>

Great! This route may not always be available to you, though. Sometimes you'll need to react with an emoji programmatically. To do so, you'll need to retrieve the emoji object.

Two of the easiest ways you can retrieve an emoji would be:

* Use `.find()` on a Collection of Emojis.
* Use `.get()` on the `client.emojis.cache` Collection.

::: tip
Two or more emojis can have the same name, and using `.find()` will only return the **first** entry it finds. As such, this can cause unexpected results.
:::

Using `.find()`, your code would look something like this:

<!-- eslint-skip -->

```js {3-4}
if (commandName === 'react-custom') {
	const message = await interaction.reply({ content: 'You can react with custom emojis!', fetchReply: true });
	const reactionEmoji = message.guild.emojis.cache.find(emoji => emoji.name === 'blobreach');
	message.react(reactionEmoji);
}
```

Using `.get()`, your code would look something like this:

<!-- eslint-skip -->

```js {3-4}
if (commandName === 'react-custom') {
	const message = await interaction.reply({ content: 'You can react with custom emojis!', fetchReply: true });
	const reactionEmoji = client.emojis.cache.get('123456789012345678');
	message.react(reactionEmoji);
}
```

Of course, if you already have the emoji ID, you should put that directly inside the `.react()` method. But if you want to do other things with the emoji data later on (e.g., display the name or image URL), it's best to retrieve the full emoji object.

### Reacting in order

If you just put one `message.react()` under another, it won't always react in order as-is. This is because `.react()` is a Promise and an asynchronous operation.

```js {6-12}
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'fruits') {
		interaction.reply('Reacting with fruits!');
		const message = await interaction.fetchReply();
		message.react('🍎');
		message.react('🍊');
		message.react('🍇');
	}
});
```

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction
				profile="user"
				:command="true"
			>fruits</DiscordInteraction>
		</template>
		Reacting with fruits!
		<template #reactions>
			<DiscordReactions>
				<DiscordReaction name="apple" alt=":apple:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34e.png" />
				<DiscordReaction name="tangerine" alt=":tangerine:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34a.png" />
				<DiscordReaction name="grapes" alt=":grapes:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f347.png" />
			</DiscordReactions>
		</template>
	</DiscordMessage>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction
				profile="user"
				:command="true"
			>fruits</DiscordInteraction>
		</template>
		Reacting with fruits!
		<template #reactions>
			<DiscordReactions>
				<DiscordReaction name="apple" alt=":apple:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34e.png" />
				<DiscordReaction name="grapes" alt=":grapes:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f347.png" />
				<DiscordReaction name="tangerine" alt=":tangerine:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34a.png" />
			</DiscordReactions>
		</template>
	</DiscordMessage>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction
				profile="user"
				:command="true"
			>fruits</DiscordInteraction>
		</template>
		Reacting with fruits!
		<template #reactions>
			<DiscordReactions>
				<DiscordReaction name="tangerine" alt=":tangerine:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34a.png" />
				<DiscordReaction name="apple" alt=":apple:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34e.png" />
				<DiscordReaction name="grapes" alt=":grapes:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f347.png" />
			</DiscordReactions>
		</template>
	</DiscordMessage>
</DiscordMessages>

As you can see, if you leave it like that, it won't display as you want. It was able to react correctly on the first try but reacts differently each time after that.

Luckily, there are two easy solutions to this. The first would be to chain `.then()`s in the order you want it to display.

```js {8-11}
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'fruits') {
		const message = await interaction.reply({ content: 'Reacting with fruits!', fetchReply: true });
		message.react('🍎')
			.then(() => message.react('🍊'))
			.then(() => message.react('🍇'))
			.catch(error => console.error('One of the emojis failed to react:', error));
	}
});
```

The other would be to use the `async`/`await` keywords.

```js {9-15}
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'fruits') {
		const message = await interaction.reply({ content: 'Reacting with fruits!', fetchReply: true });

		try {
			await message.react('🍎');
			await message.react('🍊');
			await message.react('🍇');
		} catch (error) {
			console.error('One of the emojis failed to react:', error);
		}
	}
});
```

If you try again with either of the code blocks above, you'll get the result you originally wanted!

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction
				profile="user"
				:command="true"
			>fruits</DiscordInteraction>
		</template>
		Reacting with fruits!
		<template #reactions>
			<DiscordReactions>
				<DiscordReaction name="apple" alt=":apple:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34e.png" />
				<DiscordReaction name="tangerine" alt=":tangerine:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34a.png" />
				<DiscordReaction name="grapes" alt=":grapes:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f347.png" />
			</DiscordReactions>
		</template>
	</DiscordMessage>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction
				profile="user"
				:command="true"
			>fruits</DiscordInteraction>
		</template>
		Reacting with fruits!
		<template #reactions>
			<DiscordReactions>
				<DiscordReaction name="apple" alt=":apple:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34e.png" />
				<DiscordReaction name="tangerine" alt=":tangerine:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34a.png" />
				<DiscordReaction name="grapes" alt=":grapes:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f347.png" />
			</DiscordReactions>
		</template>
	</DiscordMessage>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction
				profile="user"
				:command="true"
			>fruits</DiscordInteraction>
		</template>
		Reacting with fruits!
		<template #reactions>
			<DiscordReactions>
				<DiscordReaction name="apple" alt=":apple:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34e.png" />
				<DiscordReaction name="tangerine" alt=":tangerine:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f34a.png" />
				<DiscordReaction name="grapes" alt=":grapes:" image="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f347.png" />
			</DiscordReactions>
		</template>
	</DiscordMessage>
</DiscordMessages>

::: tip
If you aren't familiar with Promises or `async`/`await`, you can read more about them on [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) or [our guide page on async/await](/additional-info/async-await.md)!
:::

### Handling multiple reactions if the order doesn't matter

However, if you don't mind the order the emojis react in, you can take advantage of `Promise.all()`, like so:

<!-- eslint-skip -->

```js {3-8}
if (commandName === 'fruits') {
	const message = await interaction.reply({ content: 'Reacting with fruits!', fetchReply: true });
	Promise.all([
		message.react('🍎'),
		message.react('🍊'),
		message.react('🍇'),
	])
		.catch(error => console.error('One of the emojis failed to react:', error));
}
```

This small optimization allows you to use `.then()` to handle when all of the Promises have resolved, or `.catch()` when one fails. You can also `await` it since it returns a Promise itself.

## Removing reactions

Now that you know how to add reactions, you might be asking, how do you remove them? In this section, you will learn how to remove all reactions, remove reactions by user, and remove reactions by emoji.

::: warning
All of these methods require `ManageMessages` permissions. Ensure your bot has permissions before attempting to utilize any of these methods, as it will error if it doesn't.
:::

### Removing all reactions

Removing all reactions from a message is the easiest, the API allows you to do this through a single call. It can be done through the `message.reactions.removeAll()` method. 

```js
message.reactions.removeAll()
	.catch(error => console.error('Failed to clear reactions:', error));
```

### Removing reactions by emoji

Removing reactions by emoji is easily done by using <DocsLink path="MessageReaction:Class#remove" type="method" />.

```js
message.reactions.cache.get('123456789012345678').remove()
	.catch(error => console.error('Failed to remove reactions:', error));
```

### Removing reactions by user

::: tip
If you are not familiar with <DocsLink section="collection" path="Collection:Class#filter" type="method" /> and [`Map.has()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/has) take the time to understand what they do and then come back.
:::

Removing reactions by a user is not as straightforward as removing by emoji or removing all reactions. The API does not provide a method for selectively removing the reactions of a user. This means you will have to iterate through reactions that include the user and remove them.

<!-- eslint-skip -->

```js
const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(userId));

try {
	for (const reaction of userReactions.values()) {
		await reaction.users.remove(userId);
	}
} catch (error) {
	console.error('Failed to remove reactions.');
}
```

::: warning
Make sure not to remove reactions by emoji or by user too much; if there are many reactions or users, it can be considered API spam.
:::

## Awaiting reactions

A common use case for reactions in commands is having a user confirm or deny an action or creating a poll system. Luckily, we actually [already have a guide page covering this](/popular-topics/collectors.md)! Check out that page if you want a more in-depth explanation. Otherwise, here's a basic example for reference:

```js
message.react('👍').then(() => message.react('👎'));

const collectorFilter = (reaction, user) => {
	return ['👍', '👎'].includes(reaction.emoji.name) && user.id === interaction.user.id;
};

message.awaitReactions({ filter: collectorFilter, max: 1, time: 60_000, errors: ['time'] })
	.then(collected => {
		const reaction = collected.first();

		if (reaction.emoji.name === '👍') {
			message.reply('You reacted with a thumbs up.');
		} else {
			message.reply('You reacted with a thumbs down.');
		}
	})
	.catch(collected => {
		message.reply('You reacted with neither a thumbs up, nor a thumbs down.');
	});
```

## Listening for reactions on old messages

Messages sent before your bot started are uncached unless you fetch them first. By default, the library does not emit client events if the data received and cached is not sufficient to build fully functional objects.
Since version 12, you can change this behavior by activating partials. For a full explanation of partials see [this page](/popular-topics/partials.md).

Make sure you enable partial structures for `Message`, `Channel`, and `Reaction` when instantiating your client if you want reaction events on uncached messages for both server and direct message channels. If you do not want to support direct message channels, you can exclude `Channel`.

::: tip
If you use [gateway intents](/popular-topics/intents.md) but can't or don't want to use the privileged `GuildPresences` intent, you additionally need the `User` partial.
:::

```js
const { Client, Events, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
	// When a reaction is received, check if the structure is partial
	if (reaction.partial) {
		// If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message:', error);
			// Return as `reaction.message.author` may be undefined/null
			return;
		}
	}

	// Now the message has been cached and is fully available
	console.log(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`);
	// The reaction is now also fully available and the properties will be reflected accurately:
	console.log(`${reaction.count} user(s) have given the same reaction to this message!`);
});
```

::: warning
Partial structures are enabled globally. You cannot only make them work for a specific event or cache, and you very likely need to adapt other parts of your code that are accessing data from the relevant caches. All caches holding the respective structure type might return partials as well! For more info, check out [this page](/popular-topics/partials.md).
:::

## Resulting code

<ResultingCode />

```

# guide\popular-topics\threads.md

```md
# Threads

Threads can be thought of as temporary sub-channels inside an existing channel, to help better organize conversation in a busy channel.

## Thread related gateway events

::: tip
You can use the <DocsLink path="ThreadChannel:Class#isThread" type="method" /> type guard to make sure a channel is a <DocsLink path="ThreadChannel:Class" />!
:::

Threads introduce a number of new gateway events, which are listed below:

- <DocsLink path="Client:Class#threadCreate" />: Emitted whenever a thread is created or when the client user is added to a thread.
- <DocsLink path="Client:Class#threadDelete" />: Emitted whenever a thread is deleted.
- <DocsLink path="Client:Class#threadUpdate" />: Emitted whenever a thread is updated (e.g. name change, archive state change, locked state change).
- <DocsLink path="Client:Class#threadListSync" />: Emitted whenever the client user gains access to a text or news channel that contains threads.
- <DocsLink path="Client:Class#threadMembersUpdate" />: Emitted whenever members are added or removed from a thread. Requires <code>GuildMembers</code> privileged intent.
- <DocsLink path="Client:Class#threadMemberUpdate" />: Emitted whenever the client user's thread member is updated.

## Creating and deleting threads

Threads are created and deleted using the <DocsLink path="GuildTextThreadManager:Class" /> of a text or news channel.
To create a thread you call the <DocsLink path="GuildTextThreadManager:Class#create" type="method" /> method:

<!-- eslint-skip -->

```js
const thread = await channel.threads.create({
	name: 'food-talk',
	autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
	reason: 'Needed a separate thread for food',
});

console.log(`Created thread: ${thread.name}`);
```

To delete a thread, use the <DocsLink path="ThreadChannel:Class#delete" type="method" /> method:

<!-- eslint-skip -->

```js
const thread = channel.threads.cache.find(x => x.name === 'food-talk');
await thread.delete();
```

## Joining and leaving threads

To join your client to a ThreadChannel, use the <DocsLink path="ThreadChannel:Class#join" type="method" /> method:

<!-- eslint-skip -->

```js
const thread = channel.threads.cache.find(x => x.name === 'food-talk');
if (thread.joinable) await thread.join();
```

And to leave one, use <DocsLink path="ThreadChannel:Class#leave" type="method" />;

<!-- eslint-skip -->

```js
const thread = channel.threads.cache.find(x => x.name === 'food-talk');
await thread.leave();
```

## Archiving, unarchiving, and locking threads

A thread can be either active or archived. Changing a thread from archived to active is referred to as unarchiving the thread. Threads that have `locked` set to true can only be unarchived by a member with the `ManageThreads` permission.

Threads are automatically archived after inactivity. "Activity" is defined as sending a message, unarchiving a thread, or changing the auto-archive time.

To archive or unarchive a thread, use the <DocsLink path="ThreadChannel:Class#setArchived" type="method" /> method and pass in a boolean parameter:

<!-- eslint-skip -->

```js
const thread = channel.threads.cache.find(x => x.name === 'food-talk');
await thread.setArchived(true); // archived
await thread.setArchived(false); // unarchived
```


This same principle applies to locking and unlocking a thread via the <DocsLink path="ThreadChannel:Class#setLocked" type="method" /> method:

<!-- eslint-skip -->

```js 
const thread = channel.threads.cache.find(x => x.name === 'food-talk');
await thread.setLocked(true); // locked
await thread.setLocked(false); // unlocked
```

## Public and private threads

Public threads are viewable by everyone who can view the parent channel of the thread. Public threads can be created with the <DocsLink path="GuildTextThreadManager:Class#create" type="method" /> method.

<!-- eslint-skip -->

```js
const thread = await channel.threads.create({
	name: 'food-talk',
	autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
	reason: 'Needed a separate thread for food',
});

console.log(`Created thread: ${thread.name}`);
```

They can also be created from an existing message with the <DocsLink path="Message:Class#startThread" type="method" /> method, but will be "orphaned" if that message is deleted.

<!-- eslint-skip -->

```js
const thread = await message.startThread({
	name: 'food-talk',
	autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
	reason: 'Needed a separate thread for food',
});

console.log(`Created thread: ${thread.name}`);
```

The created thread and the message it originated from will share the same ID. The type of thread created matches the parent channel's type.

Private threads behave similar to Group DMs, but in a Guild. Private threads can only be created on text channels.

To create a private thread, use <DocsLink path="GuildTextThreadManager:Class#create" type="method" /> and pass in `ChannelType.PrivateThread` as the `type`:

<!-- eslint-skip -->

```js {6}
const { ChannelType, ThreadAutoArchiveDuration } = require('discord.js');

const thread = await channel.threads.create({
	name: 'mod-talk',
	autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
	type: ChannelType.PrivateThread,
	reason: 'Needed a separate thread for moderation',
});

console.log(`Created thread: ${thread.name}`);
```

## Adding and removing members

You can add and remove members to and from a thread channel.

To add a member to a thread, use the <DocsLink path="ThreadMemberManager:Class#add" type="method" /> method:

<!-- eslint-skip -->

```js
const thread = channel.threads.cache.find(x => x.name === 'food-talk');
await thread.members.add('140214425276776449');
```

And to remove a member from a thread, use <DocsLink path="ThreadMemberManager:Class#remove" type="method" />:

<!-- eslint-skip -->

```js
const thread = channel.threads.cache.find(x => x.name === 'food-talk');
await thread.members.remove('140214425276776449');
```

## Sending messages to threads with webhooks

It is possible for a webhook built on the parent channel to send messages to the channel's threads. For the purpose of this example, it is assumed a single webhook already exists for that channel. If you wish to learn more about webhooks, see our [webhook guide](/popular-topics/webhooks.md).

```js
const webhooks = await channel.fetchWebhooks();
const webhook = webhooks.first();

await webhook.send({
	content: 'Look ma! I\'m in a thread!',
	threadId: '123456789012345678',
});
```

And that's it! Now you know all there is to know on working with threads using discord.js!

```

# guide\popular-topics\webhooks.md

```md
# Webhooks

Webhooks can send messages to a text channel without having to log in as a bot. They can also fetch, edit, and delete their own messages. There are a variety of methods in discord.js to interact with webhooks. In this section, you will learn how to create, fetch, edit, and use webhooks.

## What is a webhook

Webhooks are a utility used to send messages to text channels without needing a Discord application. Webhooks are useful for allowing something to send messages without requiring a Discord application. You can also directly edit or delete messages you sent through the webhook. There are two structures to make use of this functionality: `Webhook` and `WebhookClient`. `WebhookClient` is an extended version of a `Webhook`, which allows you to send messages through it without needing a bot client.

::: tip
If you would like to read about using webhooks through the API without discord.js, you can read about them [here](https://discord.com/developers/docs/resources/webhook).
:::

## Detecting webhook messages

Bots receive webhook messages in a text channel as usual. You can detect if a webhook sent the message by checking if the `Message.webhookId` is not `null`. In this example, we return if a webhook sent the message.

<!-- eslint-skip -->
```js
if (message.webhookId) return;
```

If you would like to get the webhook object that sent the message, you can use <DocsLink path="Message:Class#fetchWebhook" type="method" />.

## Fetching webhooks

::: tip
Webhook fetching will always make use of collections and Promises. If you do not understand either concept, revise them, and then come back to this section.  You can read about collections [here](/additional-info/collections.md), and Promises [here](/additional-info/async-await.md) and [here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises).
:::

### Fetching all webhooks of a guild

If you would like to get all webhooks of a guild you can use <DocsLink path="Guild:Class#fetchWebhooks" type="method" />. This will return a Promise which will resolve into a Collection of `Webhook`s.

### Fetching webhooks of a channel

Webhooks belonging to a channel can be fetched using <DocsLink path="TextChannel:Class#fetchWebhooks" type="method" />. This will return a Promise which will resolve into a Collection of `Webhook`s. A collection will be returned even if the channel contains a single webhook. If you are certain the channel contains a single webhook, you can use <DocsLink section="collection" path="Collection:Class#first" type="method" /> on the Collection to get the webhook.

### Fetching a single webhook

#### Using client

You can fetch a specific webhook using its `id` with <DocsLink path="Client:Class#fetchWebhook" type="method" />. You can obtain the webhook id by looking at its link, the number after `https://discord.com/api/webhooks/` is the `id`, and the part after that is the `token`.

#### Using the WebhookClient constructor

If you are not using a bot client, you can get a webhook by creating a new instance of `WebhookClient` and passing the `id` and `token` into the constructor. These credentials do not require you to have a bot application, but it also offers limited information instead of fetching it using an authorized client.

```js
const webhookClient = new WebhookClient({ id: 'id', token: 'token' });
```

You can also pass in just a `url`:

```js
const webhookClient = new WebhookClient({ url: 'https://discord.com/api/webhooks/id/token' });
```

## Creating webhooks

### Creating webhooks through server settings

You can create webhooks directly through the Discord client. Go to Server Settings, and you will see an `Integrations` tab.

![Integrations tab](./images/creating-webhooks-1.png)

If you already have created a webhook, the webhooks tab will look like this; you will need to click the `View Webhooks` button.

![Integrations tab](./images/creating-webhooks-2.png)

Once you are there, click on the `Create Webhook` / `New Webhook` button; this will create a webhook. From here, you can edit the channel, the name, and the avatar. Copy the link, the first part is the id, and the second is the token.

![Creating a Webhook](./images/creating-webhooks-3.png)

### Creating webhooks with discord.js

Webhooks can be created with the <DocsLink path="TextChannel:Class#createWebhook" type="method" /> method.

```js
channel.createWebhook({
	name: 'Some-username',
	avatar: 'https://i.imgur.com/AfFp7pu.png',
})
	.then(webhook => console.log(`Created webhook ${webhook}`))
	.catch(console.error);
```

## Editing webhooks

You can edit Webhooks and WebhookClients to change their name, avatar, and channel using <DocsLink path="Webhook:Class#edit" type="method" />.

```js
webhook.edit({
	name: 'Some-username',
	avatar: 'https://i.imgur.com/AfFp7pu.png',
	channel: '222197033908436994',
})
	.then(webhook => console.log(`Edited webhook ${webhook}`))
	.catch(console.error);
```

## Using webhooks

Webhooks can send messages to text channels, as well as fetch, edit, and delete their own. These methods are the same for both `Webhook` and `WebhookClient`.

### Sending messages

Webhooks, like bots, can send up to 10 embeds per message. They can also send attachments and normal content. The <DocsLink path="Webhook:Class#send" type="method" /> method is very similar to the method used for sending a message to a text channel. Webhooks can also choose how the username and avatar will appear when they send the message.

Example using a WebhookClient:

```js
const { EmbedBuilder, WebhookClient } = require('discord.js');
const { webhookId, webhookToken } = require('./config.json');

const webhookClient = new WebhookClient({ id: webhookId, token: webhookToken });

const embed = new EmbedBuilder()
	.setTitle('Some Title')
	.setColor(0x00FFFF);

webhookClient.send({
	content: 'Webhook test',
	username: 'some-username',
	avatarURL: 'https://i.imgur.com/AfFp7pu.png',
	embeds: [embed],
});
```

Try to find a webhook your bot knows the token for. This makes sure your bot can execute the webhook later on.

```js
const { Client, EmbedBuilder, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const embed = new EmbedBuilder()
	.setTitle('Some Title')
	.setColor(0x00FFFF);

client.once(Events.ClientReady, async () => {
	const channel = client.channels.cache.get('123456789012345678');
	try {
		const webhooks = await channel.fetchWebhooks();
		const webhook = webhooks.find(wh => wh.token);

		if (!webhook) {
			return console.log('No webhook was found that I can use!');
		}

		await webhook.send({
			content: 'Webhook test',
			username: 'some-username',
			avatarURL: 'https://i.imgur.com/AfFp7pu.png',
			embeds: [embed],
		});
	} catch (error) {
		console.error('Error trying to send a message: ', error);
	}
});

client.login(token);
```

### Fetching messages

You can use <DocsLink path="Webhook:Class#fetchMessage" type="method" /> to fetch messages previously sent by the Webhook.

<!-- eslint-skip -->

```js
const message = await webhookClient.fetchMessage('123456789012345678');
```

### Editing messages

You can use <DocsLink path="Webhook:Class#editMessage" type="method" /> to edit messages previously sent by the Webhook.

<!-- eslint-skip -->

```js
const message = await webhook.editMessage('123456789012345678', {
	content: 'Edited!',
	embeds: [embed],
});
```

### Deleting messages

You can use <DocsLink path="Webhook:Class#deleteMessage" type="method" /> to delete messages previously sent by the Webhook.

<!-- eslint-skip -->

```js
await webhookClient.deleteMessage('123456789012345678');
```

## Resulting code

<ResultingCode/>

```

# guide\preparations\adding-your-bot-to-servers.md

```md
# Adding your bot to servers

After you [set up a bot application](/preparations/setting-up-a-bot-application.md), you'll notice that it's not in any servers yet. So how does that work?

Before you're able to see your bot in your own (or other) servers, you'll need to add it by creating and using a unique invite link using your bot application's client id.

## Bot invite links

The basic version of one such link looks like this:

```:no-line-numbers
https://discord.com/api/oauth2/authorize?client_id=123456789012345678&permissions=0&scope=bot%20applications.commands
```

The structure of the URL is quite simple:

* `https://discord.com/api/oauth2/authorize` is Discord's standard structure for authorizing an OAuth2 application (such as your bot application) for entry to a Discord server.
* `client_id=...` is to specify _which_ application you want to authorize. You'll need to replace this part with your client's id to create a valid invite link.
* `permissions=...` describes what permissions your bot will have on the server you are adding it to.
* `scope=bot%20applications.commands` specifies that you want to add this application as a Discord bot, with the ability to create slash commands.

::: warning
If you get an error message saying "Bot requires a code grant", head over to your application's settings and disable the "Require OAuth2 Code Grant" option. You shouldn't enable this option unless you know why you need to.
:::

## Creating and using your invite link

To create an invite link, head back to the [My Apps](https://discord.com/developers/applications/me) page under the "Applications" section, click on your bot application, and open the OAuth2 page.

In the sidebar, you'll find the OAuth2 URL generator. Select the `bot` and `applications.commands` options. Once you select the `bot` option, a list of permissions will appear, allowing you to configure the permissions your bot needs.

Grab the link via the "Copy" button and enter it in your browser. You should see something like this (with your bot's username and avatar):

![Bot Authorization page](./images/bot-auth-page.png)

Choose the server you want to add it to and click "Authorize". Do note that you'll need the "Manage Server" permission on a server to add your bot there. This should then present you a nice confirmation message:

![Bot authorized](./images/bot-authorized.png)

Congratulations! You've successfully added your bot to your Discord server. It should show up in your server's member list somewhat like this:

![Bot in server's member list](./images/bot-in-memberlist.png)

```

# guide\preparations\README.md

```md
# Installing Node.js and discord.js

## Installing Node.js

To use discord.js, you'll need to install [Node.js](https://nodejs.org/). discord.js v14 requires Node v16.11.0 or higher.

::: tip
To check if you already have Node installed on your machine \(e.g., if you're using a VPS\), run `node -v` in your terminal. If it outputs `v16.11.0` or higher, then you're good to go! Otherwise, continue reading.
:::

On Windows, it's as simple as installing any other program. Download the latest version from [the Node.js website](https://nodejs.org/), open the downloaded file, and follow the steps from the installer.

On macOS, either:

- Download the latest version from [the Node.js website](https://nodejs.org/), open the package installer, and follow the instructions
- Use a package manager like [Homebrew](https://brew.sh/) with the command `brew install node`

On Linux, you can consult [this page](https://nodejs.org/en/download/package-manager/) to determine how you should install Node.

## Preparing the essentials

To use discord.js, you'll need to install it via npm \(Node's package manager\). npm comes with every Node installation, so you don't have to worry about installing that. However, before you install anything, you should set up a new project folder.

Navigate to a suitable place on your machine and create a new folder named `discord-bot` (or whatever you want). Next you'll need to open your terminal.

### Opening the terminal

::: tip
If you use [Visual Studio Code](https://code.visualstudio.com/), you can press <code>Ctrl + `</code> (backtick) to open its integrated terminal.
:::

On Windows, either:

- `Shift + Right-click` inside your project directory and choose the "Open command window here" option
- Press `Win + R` and run `cmd.exe`, and then `cd` into your project directory

On macOS, either:
- Open Launchpad or Spotlight and search for "Terminal"
- In your "Applications" folder, under "Utilities", open the Terminal app

On Linux, you can quickly open the terminal with `Ctrl + Alt + T`.

With the terminal open, run the `node -v` command to make sure you've successfully installed Node.js. If it outputs `v16.11.0` or higher, great!

### Initiating a project folder

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm init
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn init
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm init
```
:::
::::

This is the next command you'll be running. This command creates a `package.json` file for you, which will keep track of the dependencies your project uses, as well as other info.

This command will ask you a sequence of questions–you should fill them out as you see fit. If you're not sure of something or want to skip it as a whole, leave it blank and press enter.

::: tip
To get started quickly, you can run the following command to have it fill out everything for you.

<CodeGroup>
  <CodeGroupItem title="npm">

```sh:no-line-numbers
npm init -y
```

  </CodeGroupItem>
  <CodeGroupItem title="yarn">

```sh:no-line-numbers
yarn init -y
```

  </CodeGroupItem>
  <CodeGroupItem title="pnpm">

```sh:no-line-numbers
pnpm init
```

  </CodeGroupItem>
</CodeGroup>
:::

Once you're done with that, you're ready to install discord.js!

## Installing discord.js

Now that you've installed Node.js and know how to open your console and run commands, you can finally install discord.js! Run the following command in your terminal:

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm install discord.js
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn add discord.js
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm add discord.js
```
:::
::::

And that's it! With all the necessities installed, you're almost ready to start coding your bot.

## Installing a linter

While you are coding, it's possible to run into numerous syntax errors or code in an inconsistent style. You should [install a linter](/preparations/setting-up-a-linter.md) to ease these troubles. While code editors generally can point out syntax errors, linters coerce your code into a specific style as defined by the configuration. While this is not required, it is advised.

```

# guide\preparations\setting-up-a-bot-application.md

```md
# Setting up a bot application

## Creating your bot

Now that you've installed Node, discord.js, and hopefully a linter, you're almost ready to start coding! The next step you need to take is setting up an actual Discord bot application via Discord's website.

It's effortless to create one. The steps you need to take are as follows:

1. Open the [Discord developer portal](https://discord.com/developers/applications) and log into your account.
2. Click on the "New Application" button.
3. Enter a name and confirm the pop-up window by clicking the "Create" button.

You should see a page like this:

![Successfully created application](./images/create-app.png)

You can edit your application's name, description, and avatar here. Once you've done that, then congratulations—you're now the proud owner of a shiny new Discord bot! You're not entirely done, though.

## Your bot's token

::: danger
This section is critical, so pay close attention. It explains what your bot token is, as well as the security aspects of it.
:::

After creating a bot user, you'll see a section like this:

![Bot application](./images/created-bot.png)

In this panel, you can give your bot a snazzy avatar, set its username, and make it public or private. Your bot's token will be revealed when you press the "Reset Token" button and confirm. When we ask you to paste your bot's token somewhere, this is the value that you need to put in. If you happen to lose your bot's token at some point, you need to come back to this page and reset your bot's token again which will reveal the new token, invalidating all old ones.

### What is a token, anyway?

A token is essentially your bot's password; it's what your bot uses to login to Discord. With that said, **it is vital that you do not ever share this token with anybody, purposely or accidentally**. If someone does manage to get a hold of your bot's token, they can use your bot as if it were theirs—this means they can perform malicious acts with it.

Tokens look like this: `NzkyNzE1NDU0MTk2MDg4ODQy.X-hvzA.Ovy4MCQywSkoMRRclStW4xAYK7I` (don't worry, we immediately reset this token before even posting it here!). If it's any shorter and looks more like this: `kxbsDRU5UfAaiO7ar9GFMHSlmTwYaIYn`, you copied your client secret instead. Make sure to copy the token if you want your bot to work!

### Token leak scenario

Let's imagine that you have a bot on over 1,000 servers, and it took you many, many months of coding and patience to get it on that amount. Your bot's token gets leaked somewhere, and now someone else has it. That person can:

* Spam every server your bot is on;
* DM spam as many users as possible;
* Delete as many channels as possible;
* Kick or ban as many server members as possible;
* Make your bot leave all of the servers it has joined;

All that and much, much more. Sounds pretty terrible, right? So make sure to keep your bot's token as safe as possible!

In the [initial files](/creating-your-bot/) page of the guide, we cover how to safely store your bot's token in a configuration file.

::: danger
If your bot token has been compromised by committing it to a public repository, posting it in discord.js support etc. or otherwise see your bot's token in danger, return to this page and press "Reset Token". This will invalidate all old tokens belonging to your bot. Keep in mind that you will need to update your bot's token where you used it before.
:::

```

# guide\preparations\setting-up-a-linter.md

```md
# Setting up a linter

As a developer, it's a good idea to make your development process as streamlined as possible. Linters check syntax and help you produce consistent code that follows specific style rules that you can define yourself or inherit from existing configurations. Although it's not required, installing a linter will help you immensely.

## Installing a code editor

First, you will need a proper code editor. Using programs such as Notepad and Notepad++ is discouraged, as they're inefficient for projects like these. If you aren't using one of the editors listed below, it's advised to switch.

* [Visual Studio Code](https://code.visualstudio.com/) is a prevalent choice; it is known for being fast and powerful. It supports various languages, has a terminal, built-in IntelliSense support, and autocomplete for both JavaScript and TypeScript. This is the recommended choice.
* [Sublime Text](https://www.sublimetext.com/) is another popular editor that's easy to use and write code with.

## Installing a linter

Install the [ESLint package](https://www.npmjs.com/package/eslint) inside your project directory.

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm install --save-dev eslint
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn add eslint --dev
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm add --save-dev eslint
```
:::
::::


One of the advantages proper code editors have is their ability to integrate linters via editor plugins. Install the appropriate plugin(s) for your editor of choice.

* [ESLint for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
* [ESLint for Sublime Text](https://packagecontrol.io/packages/ESLint)

::: tip
You can view plugins directly inside your editor.

- Visual Studio Code: Press `Ctrl + Shift + X`
- Sublime Text: Press `Ctrl + Shift + P` and search for "Install Package" (available via [Package Control](https://packagecontrol.io/installation))

After that, search for the appropriate plugin and install it.
:::

## Setting up ESLint rules

ESLint may display many warnings and errors about your code when you start using it but don't let this startle you. To get started, create a file in your project directory named `.eslintrc.json` and copy the code below into the file:

```json
{
	"extends": "eslint:recommended",
	"env": {
		"node": true,
		"es6": true
	},
	"parserOptions": {
		"ecmaVersion": 2021
	},
	"rules": {

	}
}
```

This is the basis of how an ESLint file will look. The `rules` object is where you'll define what rules you want to apply to ESLint. For example, if you want to make sure you never miss a semicolon, the `"semi": ["error", "always"]` rule is what you'll want to add inside that object.

You can find a list of all of ESLint's rules on [their website](https://eslint.org/docs/rules). There are indeed many rules, and it may be overwhelming at first, so if you don't want to go through everything on your own yet, you can use these rules:

```json {11-47}
{
	"extends": "eslint:recommended",
	"env": {
		"node": true,
		"es6": true
	},
	"parserOptions": {
		"ecmaVersion": 2021
	},
	"rules": {
		"arrow-spacing": ["warn", { "before": true, "after": true }],
		"brace-style": ["error", "stroustrup", { "allowSingleLine": true }],
		"comma-dangle": ["error", "always-multiline"],
		"comma-spacing": "error",
		"comma-style": "error",
		"curly": ["error", "multi-line", "consistent"],
		"dot-location": ["error", "property"],
		"handle-callback-err": "off",
		"indent": ["error", "tab"],
		"keyword-spacing": "error",
		"max-nested-callbacks": ["error", { "max": 4 }],
		"max-statements-per-line": ["error", { "max": 2 }],
		"no-console": "off",
		"no-empty-function": "error",
		"no-floating-decimal": "error",
		"no-inline-comments": "error",
		"no-lonely-if": "error",
		"no-multi-spaces": "error",
		"no-multiple-empty-lines": ["error", { "max": 2, "maxEOF": 1, "maxBOF": 0 }],
		"no-shadow": ["error", { "allow": ["err", "resolve", "reject"] }],
		"no-trailing-spaces": ["error"],
		"no-var": "error",
		"object-curly-spacing": ["error", "always"],
		"prefer-const": "error",
		"quotes": ["error", "single"],
		"semi": ["error", "always"],
		"space-before-blocks": "error",
		"space-before-function-paren": ["error", {
			"anonymous": "never",
			"named": "never",
			"asyncArrow": "always"
		}],
		"space-in-parens": "error",
		"space-infix-ops": "error",
		"space-unary-ops": "error",
		"spaced-comment": "error",
		"yoda": "error"
	}
}
```

The major points of this setup would be:

* Allowing you to debug with `console.log()`;
* Prefer using `const` over `let` or `var`, as well as disallow `var`;
* Disapproving of variables with the same name in callbacks;
* Requiring single quotes over double quotes;
* Requiring semicolons. While not required in JavaScript, it's considered one of the most common best practices to follow;
* Requiring accessing properties to be on the same line;
* Requiring indenting to be done with tabs;
* Limiting nested callbacks to 4. If you hit this error, it is a good idea to consider refactoring your code.

If your current code style is a bit different, or you don't like a few of these rules, that's perfectly fine! Just head over to the [ESLint docs](https://eslint.org/docs/rules/), find the rule(s) you want to modify, and change them accordingly.

```

# guide\README.md

```md
# Introduction

If you're reading this, it probably means you want to learn how to make a bot with discord.js. Awesome! You've come to the right place.
This guide will teach you things such as:
- How to get a bot [up and running](/preparations/) from scratch;
- How to properly [create](/creating-your-bot/), [organize](/creating-your-bot/command-handling.md), and expand on your commands;
- In-depth explanations and examples regarding popular topics (e.g. [reactions](/popular-topics/reactions.md), [embeds](/popular-topics/embeds.md), [canvas](/popular-topics/canvas.md));
- Working with databases (e.g. [sequelize](/sequelize/) and [keyv](/keyv/));
- Getting started with [sharding](/sharding/);
- And much more.

This guide will also cover subjects like common errors and how to solve them, keeping your code clean, setting up a proper development environment, etc.
Sounds good? Great! Let's get started, then.

## Before you begin...

Alright, making a bot is cool and all, but there are some prerequisites to it. To create a bot with discord.js, you should have a fairly decent grasp of JavaScript itself.
While you _can_ make a bot with very little JavaScript and programming knowledge, trying to do so without understanding the language first will only hinder you. You may get stuck on many uncomplicated issues, struggle with solutions to incredibly easy problems, and all-in-all end up frustrated. Sounds pretty annoying.

If you don't know JavaScript but would like to learn about it, here are a few links to help get you started:

* [Eloquent JavaScript, a free online book](http://eloquentjavascript.net/)
* [JavaScript.info, a modern javascript tutorial](https://javascript.info/)
* [Codecademy's interactive JavaScript course](https://www.codecademy.com/learn/introduction-to-javascript)
* [Nodeschool, for both JavaScript and Node.js lessons](https://nodeschool.io/)
* [MDN's JavaScript guide and full documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
* [Google, your best friend](https://google.com)

Take your pick, learn some JavaScript, and once you feel like you're confident enough to make a bot, come back and get started!

<a href="https://www.netlify.com">
	<img src="https://www.netlify.com/img/global/badges/netlify-color-accent.svg" alt="Deploys by Netlify" />
</a>

```

# guide\requesting-more-content.md

```md
# Requesting more content

Since this guide is made specifically for the discord.js community, we want to be sure to provide the most relevant and up-to-date content. We will, of course, make additions to the current pages and add new ones as we see fit, but fulfilling requests is how we know we're providing content you all want the most.

Requests may be as simple as "add an example to the [frequently asked questions](/popular-topics/faq.html) page", or as elaborate as "add a page regarding [sharding](/sharding/)". We'll do our best to fulfill all requests, as long as they're reasonable.

To make a request, simply head over to [the repo's issue tracker](https://github.com/discordjs/guide/issues) and [create a new issue](https://github.com/discordjs/guide/issues/new)! Title it appropriately, and let us know exactly what you mean inside the issue description. Make sure that you've looked around the site before making a request; what you want to request might already exist!

::: tip
Remember that you can always [fork the repo](https://github.com/discordjs/guide) and [make a pull request](https://github.com/discordjs/guide/pulls) if you want to add anything to the guide yourself!
:::

```

# guide\sharding\extended.md

```md
# Extended changes

::: tip
This page is a follow-up and bases its code on [the previous page](/sharding/additional-information.md), which assumes knowledge of arguments and passing functions.
:::

## Sending messages across shards

Let's start with the basic usage of shards. At some point in bot development, you might have wanted to send a message to another channel, which may or may not necessarily be on the same guild, which means it may or may not be on the same shard. To achieve this, you will need to go back to your friend `.broadcastEval()` and try every shard for the desired channel. Suppose you have the following code in your `interactionCreate` event:

```js {3-11}
client.on(Events.InteractionCreate, interaction => {
	// ...
	if (commandName === 'send') {
		const id = interaction.options.getString('destination');
		const channel = client.channels.cache.get(id);

		if (!channel) return interaction.reply('I could not find such a channel.');

		channel.send('Hello!');
		return interaction.reply(`I have sent a message to channel: \`${id}\`!`);
	}
});
```

This will never work for a channel that lies on another shard. So, let's remedy this.

::: tip
In discord.js v13, <DocsLink path="ShardClientUtil:Class#ids">`Client#shard`</DocsLink> can hold multiple ids. If you use the default sharding manager, the `.ids` array will only have one entry.
:::

```js {4-13}
if (commandName === 'send') {
	const id = interaction.options.getString('destination');
	return client.shard.broadcastEval(async (c, { channelId }) => {
		const channel = c.channels.cache.get(channelId);
		if (channel) {
			await channel.send(`This is a message from shard ${c.shard.ids.join(',')}!`);
			return true;
		}
		return false;
	}, { context: { channelId: id } })
		.then(console.log);
}
```

If all is well, you should notice an output like `[false, true, false, false]`. If it is not clear why `true` and `false` are hanging around, the last expression of the eval statement will be returned. You will want this if you want any feedback from the results. Now that you have observed said results, you can adjust the command to give yourself proper feedback, like so:

```js {4-10}
return client.shard.broadcastEval(c => {
	// ...
})
	.then(sentArray => {
		// Search for a non falsy value before providing feedback
		if (!sentArray.includes(true)) {
			return message.reply('I could not find such a channel.');
		}
		return message.reply(`I have sent a message to channel: \`${id}\`!`);
	});
```

And that's it for this section! You have successfully communicated across all of your shards.

## Using functions continued

If you remember, there was a brief mention of passing functions through `.broadcastEval()`, but no super clear description of exactly how to go about it. Well, fret not, for this section will cover it! Suppose you have the following code in your `interactionCreate` event:

```js {3-8}
client.on(Events.InteractionCreate, interaction => {
	// ...
	if (commandName === 'emoji') {
		const emojiId = interaction.options.getString('emoji');
		const emoji = client.emojis.cache.get(emojiId);

		return interaction.reply(`I have found an emoji ${emoji}!`);
	}
});
```

The aforementioned code will essentially search through `client.emojis.cache` for the provided id, which will be given provided by the `emoji` option. However, with sharding, you might notice it doesn't search through all the client's emojis. As mentioned in an earlier section of this guide, the different shards partition the client and its cache. Emojis derive from guilds meaning each shard will have the emojis from all guilds for that shard. The solution is to use `.broadcastEval()` to search all the shards for the desired emoji.

Let's start with a basic function, which will try to grab an emoji from the current client and return it.

```js
function findEmoji(c, { nameOrId }) {
	return c.emojis.cache.get(nameOrId) || c.emojis.cache.find(e => e.name.toLowerCase() === nameOrId.toLowerCase());
}
```

Next, you need to call the function in your command properly. If you recall from [this section](/sharding/additional-information.md#eval-arguments), it is shown there how to pass a function and arguments correctly.

```js {4-7}
client.on(Events.InteractionCreate, interaction => {
	// ...
	if (commandName === 'emoji') {
		const emojiNameOrId = interaction.options.getString('emoji');

		return client.shard.broadcastEval(findEmoji, { context: { nameOrId: emojiNameOrId } })
			.then(console.log);
	}
});
```

Now, run this code, and you will surely get a result that looks like the following:

<!-- eslint-skip  -->

```js
[
	{ 
		guild: { 
			members: {},
			// ...
			id: '222078108977594368',
			name: 'discord.js Official',
			icon: '6e4b4d1a0c7187f9fd5d4976c50ac96e',
			// ...
			emojis: {} 
		},
		id: '383735055509356544',
		name: 'duckSmug',
		requiresColons: true,
		managed: false,
		animated: false,
		_roles: []
	}
]
```

While this result isn't *necessarily* bad or incorrect, it's simply a raw object that got `JSON.parse()`'d and `JSON.stringify()`'d over, so all of the circular references are gone. More importantly, The object is no longer a true `GuildEmoji` object as provided by discord.js. *This means none of the convenience methods usually provided to you are available.* If this is a problem for you, you will want to handle the item *inside* the `broadcastEval`. Conveniently, the `findEmoji` function will be run, so you should execute your relevant methods there, before the object leaves the context.

```js {2-3,5-6}
function findEmoji(c, { nameOrId }) {
	const emoji = c.emojis.cache.get(nameOrId) || c.emojis.cache.find(e => e.name.toLowerCase() === nameOrId.toLowerCase());
	if (!emoji) return null;
	// If you wanted to delete the emoji with discord.js, this is where you would do it. Otherwise, don't include this code.
	emoji.delete();
	return emoji;
}
```

With all that said and done, usually you'll want to display the result, so here is how you can go about doing that:

```js {2-7}
return client.shard.broadcastEval(findEmoji, { context: { nameOrId: emojiNameOrId } })
	.then(emojiArray => {
		// Locate a non falsy result, which will be the emoji in question
		const foundEmoji = emojiArray.find(emoji => emoji);
		if (!foundEmoji) return message.reply('I could not find such an emoji.');
		return message.reply(`I have found the ${foundEmoji.animated ? `<${foundEmoji.identifier}>` : `<:${foundEmoji.identifier}> emoji!`}!`);
	});
```

And that's all! The emoji should have pretty-printed in a message, as you'd expect.

## Resulting code

<ResultingCode />

```

# guide\sharding\README.md

```md
# Getting started

## When to shard

Before you dive into this section, please note that sharding may not be necessary for you. Sharding is only required at 2,500 guilds—at that point, Discord will not allow your bot to login without sharding. With that in mind, you should consider this when your bot is around 2,000 guilds, which should be enough time to get this working. Contrary to popular belief, sharding itself is very simple. It can be complicated depending on your bot's needs, however. If your bot is in a total of 2,000 or more servers, then please continue with this guide. Otherwise, it may be a good idea to wait until then.

## How does sharding work?

As an application grows large, a developer may find it necessary to split their process to run parallel to maximize efficiency. On a much larger scale of things, the developer might notice their process slow down, amongst other problems.
[Check out the official Discord documentation on the topic.](https://discord.com/developers/docs/topics/gateway#sharding)

::: warning
This guide only explains the basics of sharding using the built-in ShardingManager, which can run shards as separate processes or threads on a single machine. If you need to scale beyond that (e.g., running shards on multiple machines/containers), you can still do it with discord.js by passing appropriate options to the Client constructor. Nevertheless, you will be on your own regarding managing shards and sharing information between them.
:::

::: tip
Apart from ShardingManager, discord.js also supports a sharding mode known as Internal sharding. Internal sharding creates multiple websocket connections from the same process, and does not require major code changes. To enable it, simply pass `shards: 'auto'` as ClientOptions to the Client constructor. However, internal sharding is not ideal for bigger bots due to high memory usage of the single main process and will not be further discussed in this guide.
:::

## Sharding file

First, you'll need to have a file that you'll be launching from now on, rather than your original `index.js` file. It's highly recommended renaming that to `bot.js` and naming this new file to `index.js` instead. Copy & paste the following snippet into your new `index.js` file.

```js
const { ShardingManager } = require('discord.js');

const manager = new ShardingManager('./bot.js', { token: 'your-token-goes-here' });

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));

manager.spawn();
```

The above code utilizes the discord.js sharding manager to spawn the recommended amount of shards for your bot. The recommended amount should be approximately 1,000 guilds per shard. Note that you have to attach the event listener to `shardCreate` before calling `.spawn()` to prevent a race condition possibly preventing shard 0 from logging the successful launch. Even though you provide the token here, you will still need to send it over to the main bot file in `client.login()`, so don't forget to do that.

::: tip
You can find the methods available for the ShardingManager class <DocsLink path="ShardingManager:Class">here</DocsLink>. Though, you may not be making much use of this section, unlike the next feature we will explore, which you may learn about by clicking [this link](/sharding/additional-information.md).
:::

## Getting started

You will most likely have to change some code to get your newly sharded bot to work. If your bot is very basic, then you're in luck! We assume you probably have some form of a `stats` command, by which you can quickly view your bot's statistics, such as its server count. We will use it as an example that needs to adapt to running with shards.

In this code, you likely have the snippet `client.guilds.cache.size`, which counts the number of *cached* guilds attached to that client. Since sharding will launch multiple processes, each process (each shard) will now have its subset collection of guilds it is responsible for. This means that your original code will not function as you might expect.

Here is some sample code for a `stats` command, without sharding taken into consideration:

```js
// bot.js
const { Client, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on(Events.InteractionCreate, interaction => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'stats') {
		return interaction.reply(`Server count: ${client.guilds.cache.size}.`);
	}
});

client.login('your-token-goes-here');
```

Let's say your bot is in a total of 3,600 guilds. Using the recommended shard count, you might end up at four shards, each containing approximately 900 guilds. If a guild is on a specific shard (shard #2, for example) and receives this command, the guild count will be close to 900, which is not the "correct" number of guilds for your bot. Let's take a look at how to fix that.

## FetchClientValues

One of the most common sharding utility methods you'll be using is <DocsLink path="ShardClientUtil:Class#fetchClientValues" type="method" />. This method retrieves a property on the Client object of all shards.

Take the following snippet of code:

```js
client.shard.fetchClientValues('guilds.cache.size').then(console.log);
```

If you run it, you will notice an output like `[898, 901, 900, 901]`. You will be correct in assuming that that's the total number of guilds per shard stored in an array in the Promise. This probably isn't the ideal output for guild count, so let's use [Array.reduce()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce) to provide a better output.

::: tip
It's highly recommended for you to visit [the documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce) to understand how the `reduce()` method works, as you will probably find great use of it in sharding.
:::

In this case, this method iterates through the array and adds each current value to the total amount:

```js
client.shard.fetchClientValues('guilds.cache.size')
	.then(results => {
		console.log(`${results.reduce((acc, guildCount) => acc + guildCount, 0)} total guilds`);
	})
	.catch(console.error);
```

While it's a bit unattractive to have more nesting in your commands, it is necessary when not using `async`/`await`. Now, the code at the top should look something like the below:

```js {4-8}
client.on(Events.InteractionCreate, interaction => {
	// ...
	if (commandName === 'stats') {
		return client.shard.fetchClientValues('guilds.cache.size')
			.then(results => {
				return interaction.reply(`Server count: ${results.reduce((acc, guildCount) => acc + guildCount, 0)}`);
			})
			.catch(console.error);
	}
});
```

## BroadcastEval

Next, check out another handy sharding method known as <DocsLink path="ShardClientUtil:Class#broadcastEval" type="method" />. This method makes all of the shards evaluate a given method, which receives a `client` and a `context` argument. The `client` argument refers to the Client object of the shard evaluating it. You can read about the `context` argument [here](/sharding/additional-information.md#eval-arguments).

```js
client.shard
	.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0))
	.then(console.log);
```

This will run the code given to `broadcastEval` on each shard and return the results to the Promise as an array, once again. You should see something like `[9001, 16658, 13337, 15687]` logged. The code sent to each shard adds up the `memberCount` property of every guild that shard is handling and returns it, so each shard's total guild member count. Of course, if you want to total up the member count of *every* shard, you can do the same thing again on the Promise results.

```js
client.shard
	.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0))
	.then(results => {
		return interaction.reply(`Total member count: ${results.reduce((acc, memberCount) => acc + memberCount, 0)}`);
	})
	.catch(console.error);
```

## Putting them together

You'd likely want to output both pieces of information in the stats command. You can combine these two results with [Promise.all()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all):

```js
const promises = [
	client.shard.fetchClientValues('guilds.cache.size'),
	client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
];

Promise.all(promises)
	.then(results => {
		const totalGuilds = results[0].reduce((acc, guildCount) => acc + guildCount, 0);
		const totalMembers = results[1].reduce((acc, memberCount) => acc + memberCount, 0);
		return interaction.reply(`Server count: ${totalGuilds}\nMember count: ${totalMembers}`);
	})
	.catch(console.error);
```

`Promise.all()` runs every Promise you pass inside an array in parallel and waits for each to finish before returning their results simultaneously. The result is an array that corresponds with the array of Promises you pass–so the first result element will be from the first Promise. With that, your stats command should look something like this:

```js {4-15}
client.on(Events.InteractionCreate, interaction => {
	// ...
	if (commandName === 'stats') {
		const promises = [
			client.shard.fetchClientValues('guilds.cache.size'),
			client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
		];

		return Promise.all(promises)
			.then(results => {
				const totalGuilds = results[0].reduce((acc, guildCount) => acc + guildCount, 0);
				const totalMembers = results[1].reduce((acc, memberCount) => acc + memberCount, 0);
				return interaction.reply(`Server count: ${totalGuilds}\nMember count: ${totalMembers}`);
			})
			.catch(console.error);
	}
});
```

The next section contains additional changes you might want to consider, which you may learn about by clicking [this link](/sharding/additional-information.md).

## Resulting code

<ResultingCode path="sharding/getting-started" />

```

# guide\slash-commands\advanced-creation.md

```md
# Advanced command creation

The examples we've covered so far have all been fairly simple commands, such as `ping`, `server`, and `user` which all have standard static responses. However, there's much more you can do with the full suite of slash command tools!

## Adding options

Application commands can have additional `options`. Think of these options as arguments to a function, and as a way for the user to provide the additional information the command requires. 

::: tip
If you've already added options to your commands and need to know how to receive and parse them, refer to the [Parsing options](/slash-commands/parsing-options.md) page in this section of the guide.
:::

Options require at minimum a name and description. The same restrictions apply to option names as slash command names - 1-32 characters containing no capital letters, spaces, or symbols other than `-` and `_`. You can specify them as shown in the `echo` command below, which prompt the user to enter a String for the `input` option.

```js {6-8}
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('echo')
	.setDescription('Replies with your input!')
	.addStringOption(option =>
		option.setName('input')
			.setDescription('The input to echo back'));
```

## Option types

By specifying the `type` of an `ApplicationCommandOption` using the corresponding method you are able to restrict what the user can provide as input, and for some options, leverage the automatic parsing of options into proper objects by Discord. 

The example above uses `addStringOption`, the simplest form of standard text input with no additional validation. By leveraging additional option types, you could change the behavior of this command in many ways, such as using a Channel option to direct the response to a specific channel:

```js {9-11}
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('echo')
	.setDescription('Replies with your input!')
	.addStringOption(option =>
		option.setName('input')
			.setDescription('The input to echo back'))
	.addChannelOption(option =>
		option.setName('channel')
			.setDescription('The channel to echo into'));
```

Or a Boolean option to give the user control over making the response ephemeral.

```js {9-11}
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('echo')
	.setDescription('Replies with your input!')
	.addStringOption(option =>
		option.setName('input')
			.setDescription('The input to echo back'))
	.addBooleanOption(option =>
		option.setName('ephemeral')
			.setDescription('Whether or not the echo should be ephemeral'));
```

Listed below is a short description of the different types of options that can be added. For more information, refer to the `add_____Option` methods in the <DocsLink section="builders" path="SlashCommandBuilder:Class" /> documentation.

* `String`, `Integer`, `Number` and `Boolean` options all accept primitive values of their associated type.
  * `Integer` only accepts whole numbers.
  * `Number` accepts both whole numbers and decimals.
* `User`, `Channel`, `Role` and `Mentionable` options will show a selection list in the Discord interface for their associated type, or will accept a Snowflake (id) as input.
* `Attachment` options prompt the user to make an upload along with the slash command.
* `Subcommand` and `SubcommandGroup` options allow you to have branching pathways of subsequent options for your commands - more on that later on this page.

::: tip
Refer to the Discord API documentation for detailed explanations on the [`SUB_COMMAND` and `SUB_COMMAND_GROUP` option types](https://discord.com/developers/docs/interactions/application-commands#subcommands-and-subcommand-groups).
:::

## Required options

With option types covered, you can start looking at additional forms of validation to ensure the data your bot receives is both complete and accurate. The simplest addition is making options required, to ensure the command cannot be executed without a required value. This validation can be applied to options of any type.

Review the `echo` example again and use `setRequired(true)` to mark the `input` option as required.

```js {9}
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('echo')
	.setDescription('Replies with your input!')
	.addStringOption(option =>
		option.setName('input')
			.setDescription('The input to echo back')
			.setRequired(true));
```

## Choices

The `String`, `Number`, and `Integer` option types can have `choices`. If you would prefer users select from predetermined values rather than free entry, `choices` can help you enforce this. This is particularly useful when dealing with external datasets, APIs, and similar, where specific input formats are required.

::: warning
If you specify `choices` for an option, they'll be the **only** valid values users can pick!
:::

Specify choices by using the `addChoices()` method from within the option builder, such as <DocsLink section="builders" path="SlashCommandBuilder:Class#addStringOption" type="method" />. Choices require a `name` which is displayed to the user for selection, and a `value` that your bot will receive when that choice is selected, as if the user had typed it into the option manually.

The `gif` command example below allows users to select from predetermined categories of gifs to send:

```js {10-14}
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('gif')
	.setDescription('Sends a random gif!')
	.addStringOption(option =>
		option.setName('category')
			.setDescription('The gif category')
			.setRequired(true)
			.addChoices(
				{ name: 'Funny', value: 'gif_funny' },
				{ name: 'Meme', value: 'gif_meme' },
				{ name: 'Movie', value: 'gif_movie' },
			));
```

If you have too many choices to display (the maximum is 25), you may prefer to provide dynamic choices based on what the user has typed so far. This can be achieved using [autocomplete](/slash-commands/autocomplete.md).

## Further validation

Even without predetermined choices, additional restrictions can still be applied on otherwise free inputs.

* For `String` options, `setMaxLength()` and `setMinLength()` can enforce length limitations.
* For `Integer` and `Number` options, `setMaxValue()` and `setMinValue()` can enforce range limitations on the value.
* For `Channel` options, `addChannelTypes()` can restrict selection to specific channel types, e.g. `ChannelType.GuildText`.

We'll use these to show you how to enhance your `echo` command from earlier with extra validation to ensure it won't (or at least shouldn't) break when used:

```js {9-10, 14-15}
const { SlashCommandBuilder, ChannelType } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('echo')
	.setDescription('Replies with your input!')
	.addStringOption(option =>
		option.setName('input')
			.setDescription('The input to echo back')
			// Ensure the text will fit in an embed description, if the user chooses that option
			.setMaxLength(2_000))
	.addChannelOption(option =>
		option.setName('channel')
			.setDescription('The channel to echo into')
			// Ensure the user can only select a TextChannel for output
			.addChannelTypes(ChannelType.GuildText))
	.addBooleanOption(option =>
		option.setName('embed')
			.setDescription('Whether or not the echo should be embedded'));
```

## Subcommands

Subcommands are available with the `.addSubcommand()` method. This allows you to branch a single command to require different options depending on the subcommand chosen.

With this approach, you can merge the `user` and `server` information commands from the previous section into a single `info` command with two subcommands. Additionally, the `user` subcommand has a `User` type option for targeting other users, while the `server` subcommand has no need for this, and would just show info for the current guild.

```js {6-14}
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('info')
	.setDescription('Get info about a user or a server!')
	.addSubcommand(subcommand =>
		subcommand
			.setName('user')
			.setDescription('Info about a user')
			.addUserOption(option => option.setName('target').setDescription('The user')))
	.addSubcommand(subcommand =>
		subcommand
			.setName('server')
			.setDescription('Info about the server'));
```

## Localizations

The names and descriptions of slash commands can be localized to the user's selected language. You can find the list of accepted locales on the [discord API documentation](https://discord.com/developers/docs/reference#locales).

Setting localizations with `setNameLocalizations()` and `setDescriptionLocalizations()` takes the format of an object, mapping location codes (e.g. `pl` and `de`) to their localized strings.

<!-- eslint-skip -->
```js {5-8,10-12,18-25}
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('dog')
	.setNameLocalizations({
		pl: 'pies',
		de: 'hund',
	})
	.setDescription('Get a cute picture of a dog!')
	.setDescriptionLocalizations({
		pl: 'Słodkie zdjęcie pieska!',
		de: 'Poste ein niedliches Hundebild!',
	})
	.addStringOption(option =>
		option
			.setName('breed')
			.setDescription('Breed of dog')
			.setNameLocalizations({
				pl: 'rasa',
				de: 'rasse',
			})
			.setDescriptionLocalizations({
				pl: 'Rasa psa',
				de: 'Hunderasse',
			}),
	);
```

#### Next steps

For more information on receiving and parsing the different types of options covered on this page, refer to [Parsing options](/slash-commands/parsing-options.md), or for more general information on how you can respond to slash commands, check out [Response methods](/slash-commands/response-methods.md).

```

# guide\slash-commands\autocomplete.md

```md
# Autocomplete

Autocomplete allows you to dynamically provide a selection of values to the user, based on their input, rather than relying on static choices. In this section we will cover how to add autocomplete support to your commands.

::: tip
This page is a follow-up to the [slash commands](/slash-commands/advanced-creation.md) section covering options and option choices. Please carefully read those pages first so that you can understand the methods used in this section.
:::

## Enabling autocomplete

To use autocomplete with your commands, *instead* of listing static choices, the option must be set to use autocompletion using <DocsLink section="builders" path="SlashCommandStringOption:Class#setAutocomplete" type="method" />:

```js {9}
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('guide')
	.setDescription('Search discordjs.guide!')
	.addStringOption(option =>
		option.setName('query')
			.setDescription('Phrase to search for')
			.setAutocomplete(true));
```

## Responding to autocomplete interactions

To handle an <DocsLink path="AutocompleteInteraction:Class"/>, use the <DocsLink path="BaseInteraction:Class#isAutocomplete" type="method"/> type guard to make sure the interaction instance is an autocomplete interaction. You can do this in a separate `interactionCreate` listener:

<!-- eslint-skip -->

```js
client.on(Events.InteractionCreate, interaction => {
	if (!interaction.isAutocomplete()) return;
	// do autocomplete handling
});
```

Or alternatively, by making a small change to your existing [Command handler](/creating-your-bot/command-handling.md) and adding an additional method to your individual command files.

The example below shows how this might be applied to a conceptual version of the `guide` command to determine the closest topic to the search input:

:::: code-group
::: code-group-item index.js
```js {4,13}
client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isChatInputCommand()) {
		// command handling
	} else if (interaction.isAutocomplete()) {
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.autocomplete(interaction);
		} catch (error) {
			console.error(error);
		}
	}
});
```
:::
::: code-group-item commands/guide.js
```js
module.exports = {
	data: new SlashCommandBuilder()
		.setName('guide')
		.setDescription('Search discordjs.guide!')
		.addStringOption(option =>
			option.setName('query')
				.setDescription('Phrase to search for')
				.setAutocomplete(true)),
	async autocomplete(interaction) {
		// handle the autocompletion response (more on how to do that below)
	},
	async execute(interaction) {
		// respond to the complete slash command
	},
};
```
:::
::::

The command handling is almost identical, but notice the change from `execute` to `autocomplete` in the new else-if branch. By adding a separate `autocomplete` function to the `module.exports` of commands that require autocompletion, you can safely separate the logic of providing dynamic choices from the code that needs to respond to the slash command once it is complete.

:::tip
You might have already moved this code to `events/interactionCreate.js` if you followed our [Event handling](/creating-your-bot/event-handling.md) guide too.
:::

### Sending results

The <DocsLink path="AutocompleteInteraction:Class"/> class provides the <DocsLink path="AutocompleteInteraction:Class#respond" type="method"/> method to send a response. Using this, you can submit an array of <DocsLink path="ApplicationCommandOptionChoiceData:Interface" /> objects for the user to choose from. Passing an empty array will show "No options match your search" for the user.

::: warning
Unlike static choices, autocompletion suggestions are *not* enforced, and users may still enter free text.
:::

The <DocsLink path="CommandInteractionOptionResolver:Class#getFocused" type="method"/> method returns the currently focused option's value, which can be used to apply filtering to the choices presented. For example, to only display options starting with the focused value you can use the `Array#filter()` method, then using `Array#map()`, you can transform the array into an array of <DocsLink path="ApplicationCommandOptionChoiceData:Interface" /> objects.

```js {10-15}
module.exports = {
	data: new SlashCommandBuilder()
		.setName('guide')
		.setDescription('Search discordjs.guide!')
		.addStringOption(option =>
			option.setName('query')
				.setDescription('Phrase to search for')
				.setAutocomplete(true)),
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();
		const choices = ['Popular Topics: Threads', 'Sharding: Getting started', 'Library: Voice Connections', 'Interactions: Replying to slash commands', 'Popular Topics: Embed preview'];
		const filtered = choices.filter(choice => choice.startsWith(focusedValue));
		await interaction.respond(
			filtered.map(choice => ({ name: choice, value: choice })),
		);
	},
};
```

### Handling multiple autocomplete options

To distinguish between multiple options, you can pass `true` into <DocsLink path="CommandInteractionOptionResolver:Class#getFocused" type="method"/>, which will now return the full focused object instead of just the value. This is used to get the name of the focused option below, allowing for multiple options to each have their own set of suggestions:

```js {10-19}
module.exports = {
	data: new SlashCommandBuilder()
		.setName('guide')
		.setDescription('Search discordjs.guide!')
		.addStringOption(option =>
			option.setName('query')
				.setDescription('Phrase to search for')
				.setAutocomplete(true))
		.addStringOption(option =>
			option.setName('version')
				.setDescription('Version to search in')
				.setAutocomplete(true)),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);
		let choices;

		if (focusedOption.name === 'query') {
			choices = ['Popular Topics: Threads', 'Sharding: Getting started', 'Library: Voice Connections', 'Interactions: Replying to slash commands', 'Popular Topics: Embed preview'];
		}

		if (focusedOption.name === 'version') {
			choices = ['v9', 'v11', 'v12', 'v13', 'v14'];
		}

		const filtered = choices.filter(choice => choice.startsWith(focusedOption.value));
		await interaction.respond(
			filtered.map(choice => ({ name: choice, value: choice })),
		);
	},
};
```

### Accessing other values

In addition to filtering based on the focused value, you may also wish to change the choices displayed based on the value of other arguments in the command. The following methods work the same in <DocsLink path="AutocompleteInteraction:Class"/>:

```js
const string = interaction.options.getString('input');
const integer = interaction.options.getInteger('int');
const boolean = interaction.options.getBoolean('choice');
const number = interaction.options.getNumber('num');
```

However, the `.getUser()`, `.getMember()`, `.getRole()`, `.getChannel()`, `.getMentionable()` and `.getAttachment()` methods are not available to autocomplete interactions. Discord does not send the respective full objects for these methods until the slash command is completed. For these, you can get the Snowflake value using `interaction.options.get('option').value`:

### Notes

- As with other application command interactions, autocomplete interactions must receive a response within 3 seconds. 
- You cannot defer the response to an autocomplete interaction. If you're dealing with asynchronous suggestions, such as from an API, consider keeping a local cache.
- After the user selects a value and sends the command, it will be received as a regular <DocsLink path="ChatInputCommandInteraction:Class"/> with the chosen value.
- You can only respond with a maximum of 25 choices at a time, though any more than this likely means you should revise your filter to further narrow the selections.

```

# guide\slash-commands\deleting-commands.md

```md
# Deleting commands

::: tip
This page is a follow-up to [command deployment](/creating-your-bot/command-deployment.md). To delete commands, you need to register them in the first place.
:::

You may have decided that you don't need a command anymore and don't want your users to be confused when they encounter a removed command.

## Deleting specific commands

To delete a specific command, you will need its id. Head to **Server Settings -> Integrations -> Bots and Apps** and choose your bot. Then, right click a command and click **Copy ID**.

::: tip
You need to have [Developer Mode](https://support.discord.com/hc/articles/206346498) enabled for this to show up!
:::

![bots-and-apps](./images/bots-and-apps.png)

![commands-copy-id](./images/commands-copy-id.png)

Edit your `deploy-commands.js` as shown below, or put it into its own file to clearly discern it from the deploy workflow:

```js {9-17}
const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

const rest = new REST().setToken(token);

// ...

// for guild-based commands
rest.delete(Routes.applicationGuildCommand(clientId, guildId, 'commandId'))
	.then(() => console.log('Successfully deleted guild command'))
	.catch(console.error);

// for global commands
rest.delete(Routes.applicationCommand(clientId, 'commandId'))
	.then(() => console.log('Successfully deleted application command'))
	.catch(console.error);
```

Where `'commandId'` is the id of the command you want to delete. Run your deploy script and it will delete the command.

## Deleting all commands

To delete all commands in the respective scope (one guild, all global commands) you can pass an empty array when setting commands.

```js {9-18}
const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');

const rest = new REST().setToken(token);

// ...

// for guild-based commands
rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
	.then(() => console.log('Successfully deleted all guild commands.'))
	.catch(console.error);

// for global commands
rest.put(Routes.applicationCommands(clientId), { body: [] })
	.then(() => console.log('Successfully deleted all application commands.'))
	.catch(console.error);
```

Discord's API doesn't currently provide an easy way to delete guild-based commands that occur on multiple guilds from all places at once. Each will need a call of the above endpoint, while specifying the respective guild and command id. Note, that the same command will have a different id, if deployed to a different guild!

```

# guide\slash-commands\parsing-options.md

```md
# Parsing options

## Command options

In this section, we'll cover how to access the values of a command's options. Consider the following `ban` command example with two options:

```js {7-15}
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Select a member and ban them.')
		.addUserOption(option =>
			option
				.setName('target')
				.setDescription('The member to ban')
				.setRequired(true))
		.addStringOption(option =>
			option
				.setName('reason')
				.setDescription('The reason for banning'))
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.setDMPermission(false),
};
```

In the execute method, you can retrieve the value of these two options from the `CommandInteractionOptionResolver` as shown below:

```js {4-8}
module.exports = {
	// data: new SlashCommandBuilder()...
	async execute(interaction) {
		const target = interaction.options.getUser('target');
		const reason = interaction.options.getString('reason') ?? 'No reason provided';

		await interaction.reply(`Banning ${target.username} for reason: ${reason}`);
		await interaction.guild.members.ban(target);
	},
};
```

Since `reason` isn't a required option, the example above uses the `??` [nullish coalescing operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator) to set a default value in case the user does not supply a value for `reason`.

If the target user is still in the guild where the command is being run, you can also use `.getMember('target')` to get their `GuildMember` object.

::: tip
If you want the Snowflake of a structure instead, grab the option via `get()` and access the Snowflake via the `value` property. Note that you should use `const { value: name } = ...` here to [destructure and rename](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment) the value obtained from the <DocsLink path="CommandInteractionOption:Interface" /> structure to avoid identifier name conflicts.
:::

In the same way as the above examples, you can get values of any type using the corresponding `CommandInteractionOptionResolver#get_____()` method. `String`, `Integer`, `Number` and `Boolean` options all provide the respective primitive types, while `User`, `Channel`, `Role`, and `Mentionable` options will provide either the respective discord.js class instance if your application has a bot user in the guild or a raw API structure for commands-only deployments.

### Choices

If you specified preset choices for your String, Integer, or Number option, getting the selected choice is exactly the same as the free-entry options above. Consider the [gif command](/slash-commands/advanced-creation.html#choices) example you looked at earlier:

```js {11-15,17}
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gif')
		.setDescription('Sends a random gif!')
		.addStringOption(option =>
			option.setName('category')
				.setDescription('The gif category')
				.setRequired(true)
				.addChoices(
					{ name: 'Funny', value: 'gif_funny' },
					{ name: 'Meme', value: 'gif_meme' },
					{ name: 'Movie', value: 'gif_movie' },
				)),
	async execute(interaction) {
		const category = interaction.options.getString('category');
		// category must be one of 'gif_funny', 'gif_meme', or 'gif_movie'
	},
};
```

Notice that nothing changes - you still use `getString()` to get the choice value. The only difference is that in this case, you can be sure it's one of only three possible values.

### Subcommands

If you have a command that contains subcommands, the `CommandInteractionOptionResolver#getSubcommand()` will tell you which subcommand was used. You can then get any additional options of the selected subcommand using the same methods as above.

The snippet below uses the same `info` command from the [subcommand creation guide](/slash-commands/advanced-creation.md#subcommands) to demonstrate how you can control the logic flow when replying to different subcommands:

```js {4,12}
module.exports = {
	// data: new SlashCommandBuilder()...
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'user') {
			const user = interaction.options.getUser('target');

			if (user) {
				await interaction.reply(`Username: ${user.username}\nID: ${user.id}`);
			} else {
				await interaction.reply(`Your username: ${interaction.user.username}\nYour ID: ${interaction.user.id}`);
			}
		} else if (interaction.options.getSubcommand() === 'server') {
			await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
		}
	},
};
```

```

# guide\slash-commands\permissions.md

```md
# Slash command permissions

Slash commands have their own permissions system. This system allows you to set the default level of permissions required for a user to execute a command when it is first deployed or your bot is added to a new server.

The slash command permissions for guilds are defaults only and can be altered by guild administrators, allowing them to configure access however best suits their moderation and server roles. Your code should not try to enforce its own permission management, as this can result in a conflict between the server-configured permissions and your bot's code.

::: warning
It is not possible to prevent users with Administrator permissions from using any commands deployed globally or specifically to their guild. Think twice before creating "dev-only" commands such as `eval`.
:::

## Member permissions

You can use <DocsLink section="builders" path="SlashCommandBuilder:Class#setDefaultMemberPermissions" type="method" /> to set the default permissions required for a member to run the command. Setting it to `0` will prohibit anyone in a guild from using the command unless a specific overwrite is configured or the user has the Administrator permission flag.

For this, we'll introduce two common and simple moderation commands: `ban` and `kick`. For a ban command, a sensible default is to ensure that users already have the Discord permission `BanMembers` in order to use it.

```js {11}
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('ban')
	.setDescription('Select a member and ban them.')
	.addUserOption(option =>
		option
			.setName('target')
			.setDescription('The member to ban')
			.setRequired(true))
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);
```

For a kick command however, we can allow members with the `KickMembers` permission to execute the command, so we'll list that flag here.

::: tip
You can require the user to have all of multiple permissions by merging them with the `|` bitwise OR operator (for example `PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers`).
You cannot require any of multiple permissions. Discord evaluates against the combined permission bitfield!

If you want to learn more about the `|` bitwise OR operator you can check the [Wikipedia](https://en.wikipedia.org/wiki/Bitwise_operation#OR) and [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_OR) articles on the topic.
:::

```js {11}
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('kick')
	.setDescription('Select a member and kick them.')
	.addUserOption(option =>
		option
			.setName('target')
			.setDescription('The member to kick')
			.setRequired(true))
	.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);
```

In reality, you'll probably want to have an additional confirmation step before a ban actually executes. Check out the [button components section](/message-components/buttons) of the guide to see how to add confirmation buttons to your command responses, and listen to button clicks.

## DM permission

By default, globally-deployed commands are also available for use in DMs. You can use <DocsLink section="builders" path="SlashCommandBuilder:Class#setDMPermission" type="method" /> to disable this behaviour. Commands deployed to specific guilds are not available in DMs.

It doesn't make much sense for your `ban` command to be available in DMs, so you can add `setDMPermission(false)` to the builder to remove it:

```js {11-12}
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const data = new SlashCommandBuilder()
	.setName('ban')
	.setDescription('Select a member and ban them.')
	.addUserOption(option =>
		option
			.setName('target')
			.setDescription('The member to ban')
			.setRequired(true))
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
	.setDMPermission(false);
```

And that's all you need to know on slash command permissions!

```

# guide\slash-commands\response-methods.md

```md
# Command response methods

There are multiple ways of responding to a slash command; each of these are covered in the following segments. Using an interaction response method confirms to Discord that your bot successfully received the interaction, and has responded to the user. Discord enforces this to ensure that all slash commands provide a good user experience (UX). Failing to respond will cause Discord to show that the command failed, even if your bot is performing other actions as a result.

The most common way of sending a response is by using the `ChatInputCommandInteraction#reply()` method, as you have done in earlier examples. This method acknowledges the interaction and sends a new message in response.

```js {6}
module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};
```

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction profile="user" :command="true">ping</DiscordInteraction>
		</template>
		Pong!
	</DiscordMessage>
</DiscordMessages>

::: warning
Initially an interaction token is only valid for three seconds, so that's the timeframe in which you are able to use the `ChatInputCommandInteraction#reply()` method. Responses that require more time ("Deferred Responses") are explained later in this page.
:::

## Ephemeral responses

You may not always want everyone who has access to the channel to see a slash command's response. Previously, you would have had to DM the user to achieve this, potentially encountering the high rate limits associated with DM messages, or simply being unable to do so, if the user's DMs were disabled. 

Thankfully, Discord provides a way to hide response messages from everyone but the executor of the slash command. This type of message is called an `ephemeral` message and can be set by providing `ephemeral: true` in the `InteractionReplyOptions`, as follows:

```js {5}
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'ping') {
		await interaction.reply({ content: 'Secret Pong!', ephemeral: true });
	}
});
```

Now when you run your command again, you should see something like this:

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction
				profile="user"
				:command="true"
				:ephemeral="true"
			>ping</DiscordInteraction>
		</template>
		Secret Pong!
	</DiscordMessage>
</DiscordMessages>

Ephemeral responses are *only* available for interaction responses; another great reason to use the new and improved slash command user interface.

## Editing responses

After you've sent an initial response, you may want to edit that response for various reasons. This can be achieved with the `ChatInputCommandInteraction#editReply()` method:

::: warning
After the initial response, an interaction token is valid for 15 minutes, so this is the timeframe in which you can edit the response and send follow-up messages. You also **cannot** edit the ephemeral state of a message, so ensure that your first response sets this correctly.
:::

```js {1,8-9}
const wait = require('node:timers/promises').setTimeout;

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'ping') {
		await interaction.reply('Pong!');
		await wait(2_000);
		await interaction.editReply('Pong again!');
	}
});
```

In fact, editing your interaction response is necessary to [calculate the ping](/popular-topics/faq#how-do-i-check-the-bot-s-ping) properly for this command.

## Deferred responses

As previously mentioned, Discord requires an acknowledgement from your bot within three seconds that the interaction was received. Otherwise, Discord considers the interaction to have failed and the token becomes invalid. But what if you have a command that performs a task which takes longer than three seconds before being able to reply?

In this case, you can make use of the `ChatInputCommandInteraction#deferReply()` method, which triggers the `<application> is thinking...` message. This also acts as the initial response, to confirm to Discord that the interaction was received successfully and gives you a 15-minute timeframe to complete your tasks before responding.
<!--- TODO: Thinking... message, once available in components -->

```js {7-9}
const wait = require('node:timers/promises').setTimeout;

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'ping') {
		await interaction.deferReply();
		await wait(4_000);
		await interaction.editReply('Pong!');
	}
});
```

If you have a command that performs longer tasks, be sure to call `deferReply()` as early as possible.

Note that if you want your response to be ephemeral, you must pass an `ephemeral` flag to the `InteractionDeferReplyOptions` here:

<!-- eslint-skip -->

```js
await interaction.deferReply({ ephemeral: true });
```

It is not possible to edit a reply to change its ephemeral state once sent.

::: tip
If you want to make a proper ping command, one is available in our [FAQ](/popular-topics/faq.md#how-do-i-check-the-bot-s-ping).
:::

## Follow-ups

The `reply()` and `deferReply()` methods are both *initial* responses, which tell Discord that your bot successfully received the interaction, but cannot be used to send additional messages. This is where follow-up messages come in. After having initially responded to an interaction, you can use `ChatInputCommandInteraction#followUp()` to send additional messages:

::: warning
After the initial response, an interaction token is valid for 15 minutes, so this is the timeframe in which you can edit the response and send follow-up messages.
:::

```js {6}
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'ping') {
		await interaction.reply('Pong!');
		await interaction.followUp('Pong again!');
	}
});
```

If you run this code you should end up having something that looks like this:

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction profile="user" :command="true">ping</DiscordInteraction>
		</template>
		Pong!
	</DiscordMessage>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction profile="bot">Pong!</DiscordInteraction>
		</template>
		Pong again!
	</DiscordMessage>
</DiscordMessages>

You can also pass an `ephemeral` flag to the `InteractionReplyOptions`:

<!-- eslint-skip -->

```js
await interaction.followUp({ content: 'Pong again!', ephemeral: true });
```

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction profile="user" :command="true">ping</DiscordInteraction>
		</template>
		Pong!
	</DiscordMessage>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction profile="bot" :ephemeral="true">Pong!</DiscordInteraction>
		</template>
		Pong again!
	</DiscordMessage>
</DiscordMessages>

Note that if you use `followUp()` after a `deferReply()`, the first follow-up will edit the `<application> is thinking` message rather than sending a new one.

That's all, now you know everything there is to know on how to reply to slash commands! 

::: tip
Interaction responses can use masked links (e.g. `[text](http://site.com)`) in the message content.
:::

## Fetching and deleting responses

In addition to replying to a slash command, you may also want to delete the initial reply. You can use `ChatInputCommandInteraction#deleteReply()` for this:

<!-- eslint-skip -->

```js {2}
await interaction.reply('Pong!');
await interaction.deleteReply();
```

Lastly, you may require the `Message` object of a reply for various reasons, such as adding reactions. You can use the `ChatInputCommandInteraction#fetchReply()` method to fetch the `Message` instance of an initial response:

<!-- eslint-skip -->

```js
await interaction.reply('Pong!');
const message = await interaction.fetchReply();
console.log(message);
```

## Localized responses

In addition to the ability to provide localized command definitions, you can also localize your responses. To do this, get the locale of the user with `ChatInputCommandInteraction#locale` and respond accordingly:

```js
client.on(Events.InteractionCreate, interaction => {
	const locales = {
		pl: 'Witaj Świecie!',
		de: 'Hallo Welt!',
	};
	interaction.reply(locales[interaction.locale] ?? 'Hello World (default is english)');
});
```


```

# guide\voice\audio-player.md

```md
# Audio Player

Audio players can be used to play audio across voice connections. A single audio player can play the same audio over multiple voice connections.

## Cheat sheet

### Creation

Creating an audio player is simple:

```js
const { createAudioPlayer } = require('@discordjs/voice');

const player = createAudioPlayer();
```

You can also customize the behaviors of an audio player. For example, the default behavior is to pause when there are no active subscribers for an audio player. This behavior can be configured to either pause, stop, or just continue playing through the stream:

```js
const { createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');

const player = createAudioPlayer({
	behaviors: {
		noSubscriber: NoSubscriberBehavior.Pause,
	},
});
```

### Deletion

If you no longer require an audio player, you can `stop()` it and then remove references to it so that it gets garbage collected.

```js
player.stop();
```

### Playing audio

You can create [audio resources](./audio-resources.md) and then play them on an audio player.

```js
const resource = createAudioResource('/home/user/voice/track.mp3');
player.play(resource);

// Play "track.mp3" across two voice connections
connection1.subscribe(player);
connection2.subscribe(player);
```

::: warning
**Audio players can play one audio resource at most.** If you try to play another audio resource while one is already playing on the same player, the existing one is destroyed and replaced with the new one.
:::

### Pausing/unpausing

You can call the `pause()` and `unpause()` methods. While the audio player is paused, no audio will be played. When it is resumed, it will continue where it left off.

```js
player.pause();

// Unpause after 5 seconds
setTimeout(() => player.unpause(), 5_000);
```

## Life cycle

Voice connections have their own life cycle, with five distinct states. You can follow the methods discussed in the [life cycles](/voice/life-cycles.md) section to subscribe to changes to voice connections.

- **Idle** - the initial state of an audio player. The audio player will be in this state when there is no audio resource for it to play.

- **Buffering** - the state an audio player will be in while it is waiting for an audio resource to become playable. The audio player may transition from this state to either the `Playing` state (success) or the `Idle` state (failure).

- **Playing** - the state a voice connection enters when it is actively playing an audio resource. When the audio resource comes to an end, the audio player will transition to the Idle state.

- **AutoPaused** - the state a voice connection will enter when the player has paused itself because there are no active voice connections to play to. This is only possible with the `noSubscriber` behavior set to `Pause`. It will automatically transition back to `Playing` once at least one connection becomes available again.

- **Paused** - the state a voice connection enters when it is paused by the user.

```js
const { AudioPlayerStatus } = require('@discordjs/voice');

player.on(AudioPlayerStatus.Playing, () => {
	console.log('The audio player has started playing!');
});
```

## Handling errors

When an audio player is given an audio resource to play, it will propagate errors from the audio resource for you to handle.

In the error handler, you can choose to either play a new audio resource or stop playback. If you take no action, the audio player will stop itself and revert to the `Idle` state.

Additionally, the error object will also contain a `resource` property that helps you to figure out which audio resource created the error.

Two different examples of how you may handle errors are shown below.

### Taking action within the error handler

In this example, the audio player will only move on to playing the next audio resource if an error has occurred. If playback ends gracefully, nothing will happen. This example avoids a transition into the Idle state.

```js
const { createAudioResource } = require('@discordjs/voice');

const resource = createAudioResource('/home/user/voice/music.mp3', {
	metadata: {
		title: 'A good song!',
	},
});

player.play(resource);

player.on('error', error => {
	console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
	player.play(getNextResource());
});
```

### Taking action within the `Idle` state

In this example, the error event is used only for logging purposes. The audio player will naturally transition into the `Idle` state, and then another resource is played. This has the advantage of working with streams that come to an end gracefully, and those that are interrupted by errors.

```js
const { createAudioResource } = require('@discordjs/voice');

const resource = createAudioResource('/home/user/voice/music.mp3', {
	metadata: {
		title: 'A good song!',
	},
});

player.play(resource);

player.on('error', error => {
	console.error(error);
});

player.on(AudioPlayerStatus.Idle, () => {
	player.play(getNextResource());
});
```

```

# guide\voice\audio-resources.md

```md
# Audio Resources

Audio resources contain audio that can be played by an audio player to voice connections.

## Cheat sheet

### Creation

There are many ways to create an audio resource. Below are some example scenarios:

```js
const { createReadStream } = require('node:fs');
const { join } = require('node:path');
const { createAudioResource, StreamType } = require('@discordjs/voice');

// Basic, default options are:
// Input type is unknown, so will use FFmpeg to convert to Opus under-the-hood
// Inline volume is opt-in to improve performance
let resource = createAudioResource(join(__dirname, 'file.mp3'));

// Will use FFmpeg with volume control enabled
resource = createAudioResource(join(__dirname, 'file.mp3'), { inlineVolume: true });
resource.volume.setVolume(0.5);

// Will play .ogg or .webm Opus files without FFmpeg for better performance
// Remember, inline volume is still disabled
resource = createAudioResource(createReadStream(join(__dirname, 'file.ogg'), {
	inputType: StreamType.OggOpus,
}));

// Will play with FFmpeg due to inline volume being enabled.
resource = createAudioResource(createReadStream(join(__dirname, 'file.webm'), {
	inputType: StreamType.WebmOpus,
	inlineVolume: true,
}));

player.play(resource);
```

### Deletion

The underlying streams of an audio resource are destroyed and flushed once an audio player is done playing their audio. Make sure to remove any references you've created to the resource to prevent memory leaks.

## Handling errors

For most scenarios, you will create an audio resource for immediate use by an audio player. The audio player will propagate errors from the resource for you, so you can attach `error` handlers to the player instead of the resource.

```js
const { createAudioResource, createAudioPlayer } = require('@discordjs/voice');

const player = createAudioPlayer();
// An AudioPlayer will always emit an "error" event with a .resource property
player.on('error', error => {
	console.error('Error:', error.message, 'with track', error.resource.metadata.title);
});

const resource = createAudioResource('/home/user/voice/music.mp3', {
	metadata: {
		title: 'A good song!',
	},
});
player.play(resource);
```

However, you can also attach an error handler specifically to the audio resource if you'd like to. This is **not recommended**, as you are not allowed to change the state of an audio player from the error handlers of an audio resource (on the other hand, you are allowed to do this from the error handle of an audio player, as shown above.)

```js
const { createAudioResource, createAudioPlayer } = require('@discordjs/voice');

const player = createAudioPlayer();

const resource = createAudioResource('/home/user/voice/music.mp3', {
	metadata: {
		title: 'A good song!',
	},
});

// Not recommended - listen to errors from the audio player instead for most usecases!
resource.playStream.on('error', error => {
	console.error('Error:', error.message, 'with track', resource.metadata.title);
});

player.play(resource);
```

## Optimizations

To improve performance, you can consider the following methods. They reduce the computational demand required to play audio, and could help to reduce jitter in the audio stream.

### Not using inline volume

By default, inline volume is disabled for performance reasons. Enabling it will allow you to modify the volume of your stream in realtime. This comes at a performance cost, even if you aren't actually modifying the volume of your stream.

Make sure you consider whether it is worth enabling for your use case.

### Playing Opus streams

If you are repeatedly playing the same resource, you may consider converting it to Ogg opus or WebM opus. Alternatively, if you are fetching an external resource and are able to specify a format that you'd like to stream the resource in, you should consider specifying Ogg opus or WebM opus.

The reason for this is that you can remove FFmpeg from the process of streaming audio. FFmpeg is used to convert unknown inputs into Opus audio which can be streamed to Discord. If your audio is already in the Opus format, this removes one of the most computationally demanding parts of the audio pipeline from the streaming process, which would surely improve performance.

Both of the examples below will skip the FFmpeg component of the pipeline to improve performance.

```js
const { createReadStream } = require('node:fs');
const { createAudioResource, StreamType } = require('@discordjs/voice');

let resource = createAudioResource(createReadStream('my_file.ogg'), {
	inputType: StreamType.OggOpus,
});

resource = createAudioResource(createReadStream('my_file.webm'), {
	inputType: StreamType.WebmOpus,
});
```

:::warning
This optimization is useful if you do not want to use inline volume. Enabling inline volume will disable the optimization.
:::

### Probing to determine stream type

The voice library is also able to determine whether a readable stream is an Ogg/Opus or WebM/Opus stream. This means
that you can still gain the performance benefits that come with playing an Opus stream, even if you aren't sure in
advance what type of audio stream you'll be playing.

This is achieved by probing a small chunk of the beginning of the audio stream to see if it is suitable for demuxing:

```js
const { createReadStream } = require('node:fs');
const { demuxProbe, createAudioResource } = require('@discordjs/voice');

async function probeAndCreateResource(readableStream) {
	const { stream, type } = await demuxProbe(readableStream);
	return createAudioResource(stream, { inputType: type });
}

async function createResources() {
	// Creates an audio resource with inputType = StreamType.Arbitrary
	const mp3Stream = await probeAndCreateResource(createReadStream('file.mp3'));

	// Creates an audio resource with inputType = StreamType.OggOpus
	const oggStream = await probeAndCreateResource(createReadStream('file.ogg'));

	// Creates an audio resource with inputType = StreamType.WebmOpus
	const webmStream = await probeAndCreateResource(createReadStream('file.webm'));
}

createResources();
```

```

# guide\voice\life-cycles.md

```md
# Life cycles

Two of the main components that you'll interact with when using `@discordjs/voice` are:

- **VoiceConnection** – maintains a network connection to a Discord voice server
- **AudioPlayer** – plays audio resources across a voice connection

Both voice connections and audio players are _stateful_, and you can subscribe to changes in their state as they progress through their respective life cycles.

It's important to listen for state change events, as they will likely require you to take some action. For example, a voice connection entering the `Disconnected` state will probably require you to attempt to reconnect it.

Their individual life cycles with descriptions of their states are documented on their respective pages.

Listening to changes in the life cycles of voice connections and audio players can be done in two ways:

## Subscribing to individual events

```js
const { VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');

connection.on(VoiceConnectionStatus.Ready, (oldState, newState) => {
	console.log('Connection is in the Ready state!');
});

player.on(AudioPlayerStatus.Playing, (oldState, newState) => {
	console.log('Audio player is in the Playing state!');
});
```

:::tip
One advantage of listening for transitions to individual states is that it becomes a lot easier to write sequential logic. This is made easy using our [state transition helper](https://github.com/discordjs/discord.js/blob/main/packages/voice/src/util/entersState.ts). An example is shown below.

```js
const { AudioPlayerStatus, entersState } = require('@discordjs/voice');

async function start() {
	player.play(resource);
	try {
		await entersState(player, AudioPlayerStatus.Playing, 5_000);
		// The player has entered the Playing state within 5 seconds
		console.log('Playback has started!');
	} catch (error) {
		// The player has not entered the Playing state and either:
		// 1) The 'error' event has been emitted and should be handled
		// 2) 5 seconds have passed
		console.error(error);
	}
}

void start();
```
:::

## Subscribing to all state transitions

If you would prefer to keep a single event listener for all possible state transitions, then you can also listen to the `stateChange` event:

```js
connection.on('stateChange', (oldState, newState) => {
	console.log(`Connection transitioned from ${oldState.status} to ${newState.status}`);
});

player.on('stateChange', (oldState, newState) => {
	console.log(`Audio player transitioned from ${oldState.status} to ${newState.status}`);
});
```

```

# guide\voice\README.md

```md
# Introduction

"Voice" refers to Discord bots being able to send audio in voice channels. This is supported in discord.js via [@discordjs/voice](https://github.com/discordjs/discord.js/tree/main/packages/voice), a standalone library made by the developers of discord.js. While you can use it with any Node.js Discord API library, this guide will focus on using it with discord.js.

## Installation

### Barebones

To add voice functionality to your discord.js bot, you will need the `@discordjs/voice` package, as well as one of the encryption packages listed below. For example: 

:::: code-group
::: code-group-item npm
```sh:no-line-numbers
npm install @discordjs/voice libsodium-wrappers
```
:::
::: code-group-item yarn
```sh:no-line-numbers
yarn add @discordjs/voice libsodium-wrappers
```
:::
::: code-group-item pnpm
```sh:no-line-numbers
pnpm add @discordjs/voice libsodium-wrappers
```
:::
::::

After this, you'll be able to play Ogg and WebM Opus files without any other dependencies. If you want to play audio from other sources, or want to improve performance, consider installing some of the extra dependencies listed below.

::: warning
This guide assumes you have installed at least one additional dependency – FFmpeg. More information on this can be found in the section below.
:::

### Extra Dependencies

- An Opus encoding library
  - [`@discordjs/opus`](https://github.com/discordjs/opus) (best performance)
  - [`opusscript`](https://github.com/abalabahaha/opusscript/)
- FFmpeg – allows you to play a range of media (e.g. MP3s).
  - [`ffmpeg`](https://ffmpeg.org/) - install and add to your system environment
  - [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static) - to install FFmpeg via npm
- Encryption packages
  - [`sodium`](https://www.npmjs.com/package/sodium) (best performance)
  - [`sodium-native`](https://www.npmjs.com/package/sodium-native)
  - [`libsodium-wrappers`](https://www.npmjs.com/package/libsodium-wrappers)
  - [`tweetnacl`](https://www.npmjs.com/package/tweetnacl)

::: tip
Outside a development environment, it is recommended for you to use `@discordjs/opus` and `sodium` to improve performance and improve the stability of audio playback!

If you're struggling to install these dependencies, make sure you have build tools installed first. On Windows, this is as easy as running the following command!

<CodeGroup>
  <CodeGroupItem title="npm">

```sh:no-line-numbers
npm install --global --production --add-python-to-path windows-build-tools
```

  </CodeGroupItem>
  <CodeGroupItem title="yarn">

```sh:no-line-numbers
yarn global add --production --add-python-to-path windows-build-tools
```

  </CodeGroupItem>
  <CodeGroupItem title="pnpm">

```sh:no-line-numbers
pnpm add --global --production --add-python-to-path windows-build-tools
```

  </CodeGroupItem>
</CodeGroup>
:::

## Debugging Dependencies

The library includes a helper function that helps you to find out which dependencies you've successfully installed. This information is also very helpful if you ever need to submit an issue on the `@discordjs/voice` issue tracker.

```js
const { generateDependencyReport } = require('@discordjs/voice');

console.log(generateDependencyReport());

/*
--------------------------------------------------
Core Dependencies
- @discordjs/voice: 0.3.1
- prism-media: 1.2.9

Opus Libraries
- @discordjs/opus: 0.5.3
- opusscript: not found

Encryption Libraries
- sodium: 3.0.2
- libsodium-wrappers: not found
- tweetnacl: not found

FFmpeg
- version: 4.2.4-1ubuntu0.1
- libopus: yes
--------------------------------------------------
*/
```

- **Core Dependencies**
  - These are dependencies that should definitely be available.
- **Opus Libraries**
  - If you want to play audio from many different file types, or alter volume in real-time, you will need to have one of these.
- **Encryption Libraries**
  - You should have at least one encryption library installed to use `@discordjs/voice`.
- **FFmpeg**
  - If you want to play audio from many different file types, you will need to have FFmpeg installed.
  - If `libopus` is enabled, you will be able to benefit from increased performance if real-time volume alteration is disabled.

```

# guide\voice\voice-connections.md

```md
# Voice Connections

Voice connections represent connections to voice channels in a guild. You can only connect to one voice channel in a guild at a time.

Voice connections will automatically try their best to re-establish their connections when they move across voice channels, or if the voice server region changes.

## Cheat sheet

### Creation

Creating a voice connection is simple:

```js
const { joinVoiceChannel } = require('@discordjs/voice');

const connection = joinVoiceChannel({
	channelId: channel.id,
	guildId: channel.guild.id,
	adapterCreator: channel.guild.voiceAdapterCreator,
});
```

If you try to call `joinVoiceChannel` on another channel in the same guild in which there is already an active voice connection, the existing voice connection switches over to the new channel.

### Access

You can access created connections elsewhere in your code without having to track the connections yourself. It is best practice to not track the voice connections yourself as you may forget to clean them up once they are destroyed, leading to memory leaks.

```js
const { getVoiceConnection } = require('@discordjs/voice');

const connection = getVoiceConnection(myVoiceChannel.guild.id);
```

### Deletion

You can destroy a voice connection when you no longer require it. This will disconnect its connection if it is still active, stop audio playing to it, and will remove it from the internal tracker for voice connections.

It's important that you destroy voice connections when they are no longer required so that your bot leaves the voice channel, and to prevent memory leaks.

```js
connection.destroy();
```

### Playing audio

You can subscribe voice connections to audio players as soon as they're created. Audio players will try to stream audio to all their subscribed voice connections that are in the Ready state. Destroyed voice connections cannot be subscribed to audio players.

```js
// Subscribe the connection to the audio player (will play audio on the voice connection)
const subscription = connection.subscribe(audioPlayer);

// subscription could be undefined if the connection is destroyed!
if (subscription) {
	// Unsubscribe after 5 seconds (stop playing audio on the voice connection)
	setTimeout(() => subscription.unsubscribe(), 5_000);
}
```

::: warning
**Voice connections can be subscribed to one audio player at most.** If you try to subscribe to another audio player while already subscribed to one, the current audio player is unsubscribed and replaced with the new one.

It is also worth noting that the **GuildVoiceStates** [gateway intent](/popular-topics/intents.md#gateway-intents) is required. Without it, the connection will permanently stay in the `signalling` state, and you'll be unable to play audio.
:::

## Life cycle

Voice connections have their own life cycle, with five distinct states. You can follow the methods discussed in the [life cycles](/voice/life-cycles.md) section to subscribe to changes to voice connections.

- **Signalling** - the initial state of a voice connection. The connection will be in this state when it is requesting permission to join a voice channel.

- **Connecting** - the state a voice connection enters once it has permission to join a voice channel and is in the process of establishing a connection to it.

- **Ready** - the state a voice connection enters once it has successfully established a connection to the voice channel. It is ready to play audio in this state.

- **Disconnected** - the state a voice connection enters when the connection to a voice channel has been severed. This can occur even if the connection has not yet been established. You may choose to attempt to reconnect in this state.

- **Destroyed** - the state a voice connection enters when it has been manually been destroyed. This will prevent it from accidentally being reused, and it will be removed from an in-memory tracker of voice connections.

```js
const { VoiceConnectionStatus } = require('@discordjs/voice');

connection.on(VoiceConnectionStatus.Ready, () => {
	console.log('The connection has entered the Ready state - ready to play audio!');
});
```

## Handling disconnects

Disconnects can be quite complex to handle. There are 3 cases for handling disconnects:

1. **Resumable disconnects** - there is no clear reason why the disconnect occurred. In this case, voice connections will automatically try to resume the existing session. The voice connection will enter the `Connecting` state. If this fails, it may enter a `Disconnected` state again.

2. **Reconnectable disconnects** - Discord has closed the connection and given a reason as to why, and that the reason is recoverable. In this case, the voice connection will automatically try to rejoin the voice channel. The voice connection will enter the `Signalling` state. If this fails, it may enter a `Disconnected` state again.

3. **Potentially reconnectable disconnects** - the bot has either been moved to another voice channel, the channel has been deleted, or the bot has been kicked/lost access to the voice channel. The bot will enter the `Disconnected` state.

As shown above, the first two cases are covered automatically by the voice connection itself. The only case you need to think carefully about is the third case.

The third case can be quite problematic to treat as a disconnect, as the bot could simply be moving to another voice channel and so not "truly" disconnected.

An imperfect workaround to this is to see if the bot has entered a `Signalling` / `Connecting` state shortly after entering the `Disconnected` state. If it has, then it means that the bot has moved voice channels. Otherwise, we should treat it as a real disconnect and not reconnect.

```js
const { VoiceConnectionStatus, entersState } = require('@discordjs/voice');

connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
	try {
		await Promise.race([
			entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
			entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
		]);
		// Seems to be reconnecting to a new channel - ignore disconnect
	} catch (error) {
		// Seems to be a real disconnect which SHOULDN'T be recovered from
		connection.destroy();
	}
});
```

```

# guide\whats-new.md

```md
<style scoped>
.emoji-container {
	display: inline-block;
}

.emoji-container .emoji-image {
	width: 1.375rem;
	height: 1.375rem;
	vertical-align: bottom;
}
</style>

# What's new

<DiscordMessages>
	<DiscordMessage profile="bot">
		<template #interactions>
			<DiscordInteraction
				profile="user"
				author="discord.js"
				:command="true"
			>upgrade</DiscordInteraction>
		</template>
		discord.js v14 has released and the guide has been updated!
		<span class="emoji-container">
			<img class="emoji-image" title="tada" alt=":tada:" src="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/1f389.png" />
		</span>
		<br />
		This includes additions and changes made in Discord, such as slash commands and message components.
	</DiscordMessage>
</DiscordMessages>

## Site

- Upgraded to [VuePress v2](https://v2.vuepress.vuejs.org/)
- New theme made to match the [discord.js documentation site](https://discord.js.org/)
- Discord message components upgraded to [@discord-message-components/vue](https://github.com/Danktuary/discord-message-components/blob/main/packages/vue/README.md)
- Many fixes in code blocks, grammar, consistency, etc.

## Pages

All content has been updated to use discord.js v14 syntax. The v13 version of the guide can be found at [https://v13.discordjs.guide/](https://v13.discordjs.guide/).

### New

- [Updating from v13 to v14](/additional-info/changes-in-v14.md): A list of the changes from discord.js v13 to v14
- [Slash commands](/slash-commands/advanced-creation.md): Registering, replying to slash commands and permissions
- [Buttons](/message-components/buttons): Building, sending, and receiving buttons
- [Select menus](/message-components/select-menus): Building, sending, and receiving select menus
- [Threads](/popular-topics/threads.md): Creating and managing threads
- [Formatters](/popular-topics/formatters.md): A collection of formatters to use with your bot

### Updated

- Commando: Replaced with [Sapphire](https://sapphirejs.dev/docs/Guide/getting-started/getting-started-with-sapphire)
- [Voice](/voice/): Rewritten to use the [`@discordjs/voice`](https://github.com/discordjs/discord.js/tree/main/packages/voice) package
- [Command handling](/creating-your-bot/command-handling.md/): Updated to use slash commands
	- Obsolete sections removed
- `client.on('message')` snippets updated to `client.on('interactionCreate')`
	- [Message content will become a new privileged intent on August 31, 2022](https://support-dev.discord.com/hc/articles/4404772028055)

<DiscordMessages>
	<DiscordMessage profile="bot">
		Thank you to all of those that contributed to the development of discord.js and the guide!
		<span class="emoji-container">
			<img class="emoji-image" title="heart" alt=":heart:" src="https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/72x72/2764.png" />
		</span>
	</DiscordMessage>
</DiscordMessages>

```

