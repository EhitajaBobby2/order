require("dotenv").config();
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, REST, Routes, SlashCommandBuilder } = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel],
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Your bot's client ID
const GUILD_ID = process.env.GUILD_ID;   // Your testing server ID

// Register the /order slash command
const commands = [
    new SlashCommandBuilder()
        .setName("order")
        .setDescription("Start a new order")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log("Registering slash commands...");
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("Slash command /order registered.");
    } catch (error) {
        console.error(error);
    }
})();

client.on(Events.ClientReady, () => {
    console.log(`${client.user.tag} is online!`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "order") return;

    const user = interaction.user;

    // Step 1: Item selection with buttons
    const itemsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("decos").setLabel("decos").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ged_accs").setLabel("@ged accs").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("srvr_bst").setLabel("srvr bst").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("other").setLabel("other").setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ content: "What would you like to purchase?", components: [itemsRow], ephemeral: true });

    const filter = i => i.user.id === user.id;

    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 10 * 60 * 1000 }); // 10 min

    let order = {
        item: null,
        payment: null,
        quantity: null
    };

    collector.on("collect", async i => {
        if (!i.isButton()) return;

        // Step 1 selected
        if (!order.item) {
            order.item = i.customId === "ged_accs" ? "@ged accs" : i.customId.replace("_", " ");
            await i.update({ content: `Selected **${order.item}**. Now choose your payment method.`, components: [] });

            // Step 2: Ask for payment via message
            await interaction.followUp({ content: "What payment method will you use? (Paypal or Litecoin)", ephemeral: true });
        }
    });

    const messageFilter = m => m.author.id === user.id;

    const paymentCollector = interaction.channel.createMessageCollector({ filter: messageFilter, time: 10 * 60 * 1000 });
    paymentCollector.on("collect", async m => {
        if (!order.payment) {
            const payment = m.content.toLowerCase();
            if (payment !== "paypal" && payment !== "litecoin") {
                m.reply("Invalid payment method. Please type **Paypal** or **Litecoin**.");
                return;
            }
            order.payment = payment;
            m.reply("Got it! How many would you like to purchase?");
        } else if (!order.quantity) {
            const quantity = parseInt(m.content);
            if (isNaN(quantity) || quantity <= 0) {
                m.reply("Please enter a valid quantity number.");
                return;
            }
            order.quantity = quantity;

            const ownerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
            if (!ownerRole) return m.reply("Could not find a role named **Owner** to ping.");

            m.reply({
                content:
                    `📦 **New Order Received!**\n` +
                    `**Item:** ${order.item}\n` +
                    `**Payment:** ${order.payment}\n` +
                    `**Quantity:** ${order.quantity}\n` +
                    `${ownerRole}`,
                allowedMentions: { roles: [ownerRole.id] }
            });

            paymentCollector.stop();
            collector.stop();
        }
    });

    collector.on("end", collected => {
        if (!order.quantity) {
            interaction.followUp({ content: "Order timed out or incomplete.", ephemeral: true });
        }
    });
});

client.login(TOKEN);
