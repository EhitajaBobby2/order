require("dotenv").config();
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    Events, 
    REST, 
    Routes, 
    SlashCommandBuilder 
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

const CLIENT_ID = process.env.CLIENT_ID; // Add your bot's client ID here or as an env variable
const GUILD_ID = process.env.GUILD_ID;   // Add your test server's guild ID here

client.once("ready", async () => {
    console.log(`${client.user.tag} is online!`);

    // Register slash command
    const commands = [
        new SlashCommandBuilder()
            .setName("order")
            .setDescription("Place a new order")
            .toJSON()
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log("Slash command /order registered.");
    } catch (err) {
        console.error(err);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "order") {
        const rowItems = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('decos').setLabel('decos').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('ged').setLabel('@ged accs').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('srvr').setLabel('srvr bst').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('other').setLabel('other').setStyle(ButtonStyle.Primary),
        );

        await interaction.reply({ content: "What would you like to purchase?", components: [rowItems], ephemeral: true });

        const filter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 600000 }); // 10 minutes

        let order = { item: null, payment: null, quantity: null };

        collector.on('collect', async i => {
            if (['decos', 'ged', 'srvr', 'other'].includes(i.customId)) {
                order.item = i.customId === 'ged' ? '@ged accs' : i.customId === 'srvr' ? 'srvr bst' : i.customId;

                // Ask payment method
                const rowPayment = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('paypal').setLabel('Paypal').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('litecoin').setLabel('Litecoin').setStyle(ButtonStyle.Success)
                );

                await i.update({ content: `Selected **${order.item}**. Now choose your payment method:`, components: [rowPayment] });
            } else if (['paypal', 'litecoin'].includes(i.customId)) {
                order.payment = i.customId.charAt(0).toUpperCase() + i.customId.slice(1);

                await i.update({ content: `Payment method **${order.payment}** selected. How many would you like to purchase?`, components: [] });

                // Await quantity as a message
                const messageFilter = m => m.author.id === interaction.user.id;
                const quantityCollected = await interaction.channel.awaitMessages({ filter: messageFilter, max: 1, time: 600000 });
                const quantity = quantityCollected.first()?.content;

                if (!quantity || isNaN(quantity)) {
                    return interaction.followUp({ content: "Invalid quantity. Order cancelled.", ephemeral: true });
                }

                order.quantity = quantity;

                // Ping owner role
                const ownerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
                const ping = ownerRole ? `<@&${ownerRole.id}>` : "Owner role not found";

                await interaction.followUp({
                    content: `📦 **New Order Received!**\n**Item:** ${order.item}\n**Payment:** ${order.payment}\n**Quantity:** ${order.quantity}\n${ping}`
                });

                collector.stop();
            }
        });

        collector.on('end', collected => {
            if (!order.item || !order.payment || !order.quantity) {
                interaction.followUp({ content: "Order timed out.", ephemeral: true });
            }
        });
    }
});

client.login(process.env.TOKEN);
