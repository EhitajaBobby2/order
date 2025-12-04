require("dotenv").config();
const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

const commands = [
    new SlashCommandBuilder()
        .setName('order')
        .setDescription('Start an order workflow')
        .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Slash commands registered!');
    } catch (err) {
        console.error(err);
    }
})();

client.once("ready", () => {
    console.log(`${client.user.tag} is online!`);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'order') {
        const timeout = 600000; // 10 minutes

        // Step 1 — Ask for the item
        await interaction.reply({
            content: "What would you like to purchase?\nOptions: **decos, @ged accs, srvr bst, other**",
            ephemeral: true
        });

        const filter = i => i.user.id === interaction.user.id && i.isChatInputCommand() === false;

        const messageCollector = interaction.channel.createMessageCollector({ filter, time: timeout, max: 1 });

        messageCollector.on('collect', async msg => {
            const item = msg.content;

            // Step 2 — Ask for payment with buttons
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('paypal')
                    .setLabel('Paypal')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('litecoin')
                    .setLabel('Litecoin')
                    .setStyle(ButtonStyle.Primary)
            );

            const paymentMessage = await interaction.followUp({ content: "What payment method will you use?", components: [row], ephemeral: true });

            const buttonFilter = i => i.user.id === interaction.user.id;
            try {
                const buttonInteraction = await paymentMessage.awaitMessageComponent({ filter: buttonFilter, time: timeout });
                const payment = buttonInteraction.customId;
                await buttonInteraction.update({ content: `You selected: **${payment}**`, components: [] });

                // Step 3 — Ask for quantity
                const quantityMsg = await interaction.followUp({ content: "How many would you like to purchase?", ephemeral: true });
                const quantityCollector = interaction.channel.createMessageCollector({ filter, time: timeout, max: 1 });

                quantityCollector.on('collect', async qtyMsg => {
                    const quantity = qtyMsg.content;

                    // Step 4 — Ping the owner role
                    const ownerRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === "owner");
                    if (!ownerRole) return interaction.followUp({ content: "Could not find a role named **Owner** to ping.", ephemeral: true });

                    await interaction.followUp({
                        content: `📦 **New Order Received!**\n**Item:** ${item}\n**Payment:** ${payment}\n**Quantity:** ${quantity}\n${ownerRole}`
                    });
                });

                quantityCollector.on('end', collected => {
                    if (collected.size === 0) {
                        interaction.followUp({ content: "Order cancelled: no quantity provided.", ephemeral: true });
                    }
                });

            } catch (err) {
                return interaction.followUp({ content: "Order cancelled: no payment method selected in time.", ephemeral: true });
            }
        });

        messageCollector.on('end', collected => {
            if (collected.size === 0) {
                interaction.followUp({ content: "Order cancelled: no item selected.", ephemeral: true });
            }
        });
    }
});

client.login(process.env.TOKEN);
